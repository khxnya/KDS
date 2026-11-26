-- Run once after production-v8.sql. Contact history and future leads use the same ID.
begin;
alter table public.kds_records add column if not exists assignee_id uuid references public.kds_team(user_id);
create or replace function public.kds_import_contact(c public.kds_contact_submissions)
returns void language sql security definer set search_path='' as $$
 insert into public.kds_records(id,kind,owner_email,data,created_at)
 values(c.id::text,'leads',c.email, jsonb_build_object('name',c.name,'email',c.email,
 'company',c.metadata->>'business','service',c.service,'phone',c.metadata->>'phone',
 'budget',c.metadata->>'budget','timeline',c.metadata->>'timeline','contact_method',c.metadata->>'contact_method',
 'message',c.summary,'status','new','created_at',c.submitted_at),c.submitted_at)
 on conflict(id) do nothing
$$;
revoke all on function public.kds_import_contact(public.kds_contact_submissions) from public,anon,authenticated;
create or replace function public.kds_contact_to_lead() returns trigger
language plpgsql security definer set search_path='' as $$
begin perform public.kds_import_contact(new); return new; end $$;
drop trigger if exists contact_to_lead on public.kds_contact_submissions;
create trigger contact_to_lead after insert on public.kds_contact_submissions
for each row execute function public.kds_contact_to_lead();
select public.kds_import_contact(c) from public.kds_contact_submissions c where delivery_state in ('accepted','delivered');
create or replace function public.kds_assign_lead(p_lead text,p_member uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.kds_is_owner() then raise exception 'Owner access required' using errcode='42501'; end if;
 if p_member is not null and not exists(select 1 from public.kds_team where user_id=p_member and active)
 then raise exception 'Choose an active team member'; end if;
 update public.kds_records set assignee_id=p_member where id=p_lead and kind='leads';
 if not found then raise exception 'Lead unavailable'; end if;
 perform public.kds_write_audit('lead.assigned','lead',p_lead,null,jsonb_build_object('assignee_id',p_member));
end $$;
revoke all on function public.kds_assign_lead(text,uuid) from public,anon;
grant execute on function public.kds_assign_lead(text,uuid) to authenticated;
-- Limit bursts for each authenticated sender across all their project conversations.
create index if not exists kds_messages_sender_created on public.kds_project_messages(sender_id,created_at);
create or replace function public.kds_limit_messages() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(new.sender_id::text,0));
 if (select count(*) from public.kds_project_messages where sender_id=new.sender_id
     and created_at>now()-interval '1 minute')>=30 then
   raise exception 'Please wait a minute before sending another message.';
 end if;
 return new;
end $$;
drop trigger if exists limit_messages on public.kds_project_messages;
create trigger limit_messages before insert on public.kds_project_messages for each row execute function public.kds_limit_messages();
-- Include assigned projects before their first message.
create or replace function public.kds_list_project_conversations()
returns table(project_id text,project_label text,latest_body text,latest_at timestamptz,unread_count bigint,participant_names text[])
language sql stable security definer set search_path='' as $$
  select p.id,
    coalesce(nullif(p.data->>'name',''),nullif(p.data->>'project_label',''),'Studio project'),
    latest.body,latest.created_at,
    (select count(*) from public.kds_message_receipts r join public.kds_project_messages m on m.id=r.message_id
      where r.user_id=auth.uid() and r.read_at is null and m.project_id=p.id),
    coalesce((select array_agg(name order by name) from (select distinct m.sender_name name from public.kds_project_messages m where m.project_id=p.id) names),'{}'::text[])
  from public.kds_records p
  left join lateral (select m.body,m.created_at from public.kds_project_messages m where m.project_id=p.id order by m.created_at desc,m.id desc limit 1) latest on true
  where p.kind='projects' and public.kds_project_access(p.id)
  order by latest.created_at desc nulls last,p.id;
$$;
commit;
