begin;
-- Correct only the studio owner's profile. Role grants and credentials are untouched.
insert into public.kds_profiles(user_id,first_name,surname)
select id,'Khanya','Ngema' from auth.users
where raw_app_meta_data->>'role'='admin' and
 (lower(email)='khanyangema5@gmail.com' or exists(select 1 from public.kds_profiles p where p.user_id=auth.users.id and lower(trim(p.first_name||' '||p.surname))='ray ro'))
on conflict(user_id) do update set first_name='Khanya',surname='Ngema',updated_at=now();

create or replace function public.kds_notify_new_record() returns trigger
language plpgsql security definer set search_path='' as $$
declare recipient uuid;
begin
 if new.kind='leads' then
   -- The contact trigger already emits one notification for website submissions.
   if exists(select 1 from public.kds_contact_submissions where id::text=new.id) then return new; end if;
   for recipient in select id from auth.users where raw_app_meta_data->>'role'='admin' loop
     perform public.kds_emit_notification(recipient,'lead:'||new.id,'New lead','A lead has been added.','admin.html#leads',null,auth.uid(),jsonb_build_object('submission_id',new.id));
   end loop;
 elsif new.kind='projects' then
   for recipient in select id from auth.users where lower(email)=lower(new.owner_email) and coalesce(raw_app_meta_data->>'role','client')='client' loop
     perform public.kds_emit_notification(recipient,'project:'||new.id,'New project','A project is ready in your workspace.','client.html#overview',new.id,auth.uid(),jsonb_build_object('record_id',new.id));
   end loop;
 end if;
 return new;
end $$;
drop trigger if exists kds_new_record_activity on public.kds_records;
create trigger kds_new_record_activity after insert on public.kds_records for each row execute function public.kds_notify_new_record();
commit;
