-- Khanya Digital collaboration migration (run after database.sql and team.sql).
-- Creates real project messages and notifications with RLS. No sample records are inserted.
begin;

create table if not exists public.kds_project_messages (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.kds_records(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete restrict,
  sender_name text not null check (char_length(sender_name) between 1 and 120),
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists kds_project_messages_project_created on public.kds_project_messages(project_id,created_at);

create table if not exists public.kds_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (char_length(kind) between 1 and 80),
  body text not null check (char_length(body) between 1 and 500),
  link text not null default '#' check (link ~ '^([a-zA-Z0-9_./#?=&-]+)$'),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists kds_notifications_recipient_created on public.kds_notifications(recipient_id,created_at desc);

create or replace function public.kds_project_access(p_project text) returns boolean
language sql stable security definer set search_path='' as $$
  select public.kds_is_owner()
    or public.kds_client_project(p_project)
    or (public.kds_is_developer() and exists (
      select 1 from public.kds_jobs j where j.project_id=p_project and j.assignee_id=auth.uid() and not j.archived
    ));
$$;

create or replace function public.kds_display_name() returns text
language sql stable security definer set search_path='' as $$
 select coalesce(nullif(trim(auth.jwt()->'user_metadata'->>'first_name'),'') ||
        case when nullif(trim(auth.jwt()->'user_metadata'->>'surname'),'') is null then '' else ' '||trim(auth.jwt()->'user_metadata'->>'surname') end,
        nullif(trim(auth.jwt()->'user_metadata'->>'name'),''),
        split_part(coalesce(auth.jwt()->>'email','Member'),'@',1));
$$;

create or replace function public.kds_send_project_message(p_project_id text,p_body text) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid; project_owner text; recipient auth.users; sender_role text;
begin
 if not public.kds_project_access(p_project_id) then raise exception 'Project access required' using errcode='42501'; end if;
 if char_length(trim(coalesce(p_body,''))) not between 1 and 5000 then raise exception 'Enter a message between 1 and 5000 characters' using errcode='22023'; end if;
 select owner_email into project_owner from public.kds_records where id=p_project_id and kind='projects';
 if project_owner is null then raise exception 'Project not found' using errcode='P0001'; end if;
 insert into public.kds_project_messages(project_id,sender_id,sender_name,body)
 values(p_project_id,auth.uid(),public.kds_display_name(),trim(p_body)) returning id into result;
 sender_role:=coalesce(auth.jwt()->'app_metadata'->>'role','client');
 -- Owner is notified for every message from a participant.
 for recipient in select id from auth.users where raw_app_meta_data->>'role'='admin' and id<>auth.uid() loop
   insert into public.kds_notifications(recipient_id,kind,body,link)
   values(recipient.id,'Project message',public.kds_display_name()||' posted in a project conversation.','admin.html#community');
 end loop;
 -- Client receives developer messages; assigned developers receive client messages.
 if sender_role='developer' then
   for recipient in select id from auth.users where lower(email)=lower(project_owner) and id<>auth.uid() loop
     insert into public.kds_notifications(recipient_id,kind,body,link) values(recipient.id,'Project message','A developer posted a project update.','client.html');
   end loop;
 elsif sender_role='client' then
   for recipient in select distinct u.id from public.kds_jobs j join auth.users u on u.id=j.assignee_id where j.project_id=p_project_id and not j.archived and u.id<>auth.uid() loop
     insert into public.kds_notifications(recipient_id,kind,body,link) values(recipient.id,'Project message','A client posted in an assigned project.','developer.html');
   end loop;
 end if;
 return result;
end $$;

create or replace function public.kds_mark_notifications_read(p_ids uuid[] default null) returns void
language sql security definer set search_path='' as $$
 update public.kds_notifications set read_at=coalesce(read_at,now())
 where recipient_id=auth.uid() and (p_ids is null or id=any(p_ids));
$$;

alter table public.kds_project_messages enable row level security;
alter table public.kds_notifications enable row level security;
revoke all on public.kds_project_messages,public.kds_notifications from public,anon;
grant select on public.kds_project_messages,public.kds_notifications to authenticated;
grant execute on function public.kds_send_project_message(text,text),public.kds_mark_notifications_read(uuid[]) to authenticated;
drop policy if exists kds_project_messages_select on public.kds_project_messages;
create policy kds_project_messages_select on public.kds_project_messages for select to authenticated using(public.kds_project_access(project_id));
drop policy if exists kds_notifications_select on public.kds_notifications;
create policy kds_notifications_select on public.kds_notifications for select to authenticated using(recipient_id=auth.uid());
commit;
