-- Khanya Digital production foundation, revision 8.
-- Run after database.sql, team.sql and collaboration.sql.
-- Additive and repeatable: no application records, accounts, projects or files are deleted.
begin;

do $$ begin
  if to_regclass('public.kds_records') is null
     or to_regclass('public.kds_jobs') is null
     or to_regclass('public.kds_project_messages') is null
     or to_regclass('public.kds_notifications') is null then
    raise exception 'Run database.sql, team.sql and collaboration.sql before production-v8.sql';
  end if;
end $$;

create table if not exists public.kds_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '' check (char_length(first_name) <= 80),
  surname text not null default '' check (char_length(surname) <= 100),
  phone text not null default '' check (char_length(phone) <= 40),
  business_name text not null default '' check (char_length(business_name) <= 160),
  project_contact text not null default '' check (char_length(project_contact) <= 160),
  skills text[] not null default '{}',
  availability text not null default '' check (char_length(availability) <= 160),
  avatar_path text,
  preferences jsonb not null default '{}'::jsonb check (jsonb_typeof(preferences)='object' and octet_length(preferences::text)<=10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(skills) <= 20),
  check (avatar_path is null or avatar_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,180}$')
);

alter table public.kds_project_messages add column if not exists sender_role text;
alter table public.kds_project_messages add column if not exists client_nonce uuid;
alter table public.kds_project_messages add column if not exists edited_at timestamptz;
alter table public.kds_notifications add column if not exists event_key text;
alter table public.kds_notifications add column if not exists project_id text;
alter table public.kds_notifications add column if not exists actor_id uuid;
alter table public.kds_notifications add column if not exists payload jsonb not null default '{}'::jsonb;

create unique index if not exists kds_project_messages_sender_nonce
  on public.kds_project_messages(sender_id,client_nonce) where client_nonce is not null;
create unique index if not exists kds_notifications_recipient_event
  on public.kds_notifications(recipient_id,event_key) where event_key is not null;
create index if not exists kds_notifications_unread
  on public.kds_notifications(recipient_id,created_at desc) where read_at is null;

create table if not exists public.kds_message_receipts (
  message_id uuid not null references public.kds_project_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  primary key(message_id,user_id)
);
create index if not exists kds_message_receipts_unread on public.kds_message_receipts(user_id,created_at desc) where read_at is null;

create table if not exists public.kds_profile_uploads (
  object_path text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','image/avif')),
  byte_size bigint not null check (byte_size between 1 and 5242880),
  state text not null default 'pending' check (state in ('pending','ready')),
  created_at timestamptz not null default now(),
  check (object_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,180}$')
);

create table if not exists public.kds_contact_submissions (
  id uuid primary key default gen_random_uuid(),
  provider_request_id text not null unique check (char_length(provider_request_id) between 8 and 200),
  email text not null check (char_length(email) between 3 and 320),
  name text not null default '' check (char_length(name) <= 180),
  service text not null default 'general' check (char_length(service) <= 80),
  summary text not null default '' check (char_length(summary) <= 5000),
  delivery_state text not null default 'accepted' check (delivery_state in ('accepted','delivered','failed')),
  submitted_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object' and octet_length(metadata::text)<=10000)
);

-- Stores only a salted SHA-256 fingerprint supplied by the trusted contact
-- function. It is deliberately separate from enquiry content and unavailable
-- through the browser API.
create table if not exists public.kds_contact_rate_limits (
  fingerprint text primary key check (fingerprint ~ '^[0-9a-f]{64}$'),
  window_started timestamptz not null default now(),
  attempts integer not null default 1 check (attempts between 1 and 6),
  updated_at timestamptz not null default now()
);

create table if not exists public.kds_agreements (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.kds_records(id) on delete restrict,
  client_user_id uuid references auth.users(id) on delete restrict,
  provider_reference text unique,
  title text not null check (char_length(title) between 1 and 180),
  status text not null default 'draft' check (status in ('draft','sent','completed','void')),
  completed_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status='completed' and completed_at is not null) or status<>'completed')
);
create index if not exists kds_agreements_project on public.kds_agreements(project_id,created_at desc);

create table if not exists public.kds_audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text not null default 'system',
  action text not null check (char_length(action) between 2 and 120),
  target_type text not null check (char_length(target_type) between 2 and 80),
  target_id text not null check (char_length(target_id) between 1 and 200),
  project_id text,
  detail jsonb not null default '{}'::jsonb check (jsonb_typeof(detail)='object' and octet_length(detail::text)<=10000),
  created_at timestamptz not null default now()
);
create index if not exists kds_audit_events_created on public.kds_audit_events(created_at desc);
create index if not exists kds_audit_events_project on public.kds_audit_events(project_id,created_at desc) where project_id is not null;

create or replace function public.kds_project_participant_ids(p_project text) returns setof uuid
language sql stable security definer set search_path='' as $$
  select u.id from auth.users u
   where exists(select 1 from public.kds_records r where r.id=p_project and r.kind='projects' and lower(r.owner_email)=lower(u.email))
  union
  select j.assignee_id from public.kds_jobs j join public.kds_team t on t.user_id=j.assignee_id and t.active
    where j.project_id=p_project and not j.archived
  union
  select u.id from auth.users u where u.raw_app_meta_data->>'role'='admin';
$$;

create or replace function public.kds_display_name() returns text
language sql stable security definer set search_path='' as $$
  select coalesce(
    nullif(trim(concat_ws(' ',nullif(p.first_name,''),nullif(p.surname,''))),''),
    nullif(t.display_name,''),
    nullif(trim(auth.jwt()->'user_metadata'->>'name'),''),
    nullif(trim(auth.jwt()->'user_metadata'->>'first_name'),''),
    split_part(coalesce(auth.jwt()->>'email','Member'),'@',1),
    'Member')
  from (select 1) seed
  left join public.kds_profiles p on p.user_id=auth.uid()
  left join public.kds_team t on t.user_id=auth.uid();
$$;

create or replace function public.kds_write_audit(
  p_action text,p_target_type text,p_target_id text,p_project_id text default null,p_detail jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path='' as $$
begin
  if char_length(p_action) not between 2 and 120 or char_length(p_target_type) not between 2 and 80
     or char_length(p_target_id) not between 1 and 200 or jsonb_typeof(coalesce(p_detail,'{}'::jsonb))<>'object'
     or octet_length(coalesce(p_detail,'{}'::jsonb)::text)>10000 then
    raise exception 'Invalid audit event' using errcode='22023';
  end if;
  insert into public.kds_audit_events(actor_id,actor_role,action,target_type,target_id,project_id,detail)
  values(auth.uid(),coalesce(auth.jwt()->'app_metadata'->>'role',auth.jwt()->>'role','system'),p_action,p_target_type,p_target_id,p_project_id,coalesce(p_detail,'{}'::jsonb));
end $$;

create or replace function public.kds_emit_notification(
  p_recipient uuid,p_event_key text,p_kind text,p_body text,p_link text,
  p_project_id text default null,p_actor uuid default null,p_payload jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path='' as $$
begin
  if p_recipient is null or char_length(p_event_key) not between 3 and 240
    or char_length(p_kind) not between 1 and 80 or char_length(p_body) not between 1 and 500
    or p_link !~ '^([a-zA-Z0-9_./#?=&-]+)$' or jsonb_typeof(coalesce(p_payload,'{}'::jsonb))<>'object' then
    raise exception 'Invalid notification event' using errcode='22023';
  end if;
  insert into public.kds_notifications(recipient_id,event_key,kind,body,link,project_id,actor_id,payload)
  values(p_recipient,p_event_key,p_kind,p_body,p_link,p_project_id,p_actor,coalesce(p_payload,'{}'::jsonb))
  on conflict(recipient_id,event_key) where event_key is not null do nothing;
end $$;

create or replace function public.kds_save_my_profile(
  p_first_name text,p_surname text,p_phone text default '',p_business_name text default '',
  p_project_contact text default '',p_skills text[] default '{}',p_availability text default '',
  p_preferences jsonb default '{}'::jsonb
) returns public.kds_profiles language plpgsql security definer set search_path='' as $$
declare result public.kds_profiles; clean_skills text[]; caller_role text;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  caller_role:=coalesce(auth.jwt()->'app_metadata'->>'role','client');
  clean_skills:=array(select distinct trim(x) from unnest(coalesce(p_skills,'{}')) x where char_length(trim(x)) between 1 and 80 limit 20);
  if char_length(trim(coalesce(p_first_name,'')))>80 or char_length(trim(coalesce(p_surname,'')))>100
    or char_length(trim(coalesce(p_phone,'')))>40 or char_length(trim(coalesce(p_business_name,'')))>160
    or char_length(trim(coalesce(p_project_contact,'')))>160 or char_length(trim(coalesce(p_availability,'')))>160
    or jsonb_typeof(coalesce(p_preferences,'{}'::jsonb))<>'object' or octet_length(coalesce(p_preferences,'{}'::jsonb)::text)>10000 then
    raise exception 'Check the profile fields' using errcode='22023';
  end if;
  if caller_role<>'developer' then clean_skills:='{}'; p_availability:=''; end if;
  if caller_role<>'client' then p_business_name:=''; p_project_contact:=''; end if;
  insert into public.kds_profiles(user_id,first_name,surname,phone,business_name,project_contact,skills,availability,preferences,updated_at)
  values(auth.uid(),trim(coalesce(p_first_name,'')),trim(coalesce(p_surname,'')),trim(coalesce(p_phone,'')),trim(coalesce(p_business_name,'')),trim(coalesce(p_project_contact,'')),clean_skills,trim(coalesce(p_availability,'')),coalesce(p_preferences,'{}'::jsonb),now())
  on conflict(user_id) do update set first_name=excluded.first_name,surname=excluded.surname,phone=excluded.phone,
    business_name=excluded.business_name,project_contact=excluded.project_contact,skills=excluded.skills,
    availability=excluded.availability,preferences=excluded.preferences,updated_at=now()
  returning * into result;
  perform public.kds_write_audit('profile.updated','profile',auth.uid()::text,null,'{}'::jsonb);
  return result;
end $$;

create or replace function public.kds_prepare_profile_avatar(p_mime text,p_size bigint) returns text
language plpgsql security definer set search_path='' as $$
declare result text; extension text;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if p_mime not in ('image/jpeg','image/png','image/webp','image/avif') or p_size not between 1 and 5242880 then
    raise exception 'Choose a JPEG, PNG, WebP or AVIF image up to 5 MB' using errcode='22023';
  end if;
  extension:=case p_mime when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'image/webp' then 'webp' else 'avif' end;
  result:=auth.uid()::text||'/'||gen_random_uuid()::text||'.'||extension;
  insert into public.kds_profile_uploads(object_path,user_id,mime_type,byte_size) values(result,auth.uid(),p_mime,p_size);
  return result;
end $$;

create or replace function public.kds_complete_profile_avatar(p_path text) returns void
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.kds_profile_uploads where object_path=p_path and user_id=auth.uid() and state='pending') then
    raise exception 'Prepared profile image not found' using errcode='42501';
  end if;
  if not exists(select 1 from storage.objects where bucket_id='kds-profile-images' and name=p_path) then
    raise exception 'Profile image upload has not completed';
  end if;
  update public.kds_profile_uploads set state='ready' where object_path=p_path and user_id=auth.uid();
  insert into public.kds_profiles(user_id,avatar_path,updated_at) values(auth.uid(),p_path,now())
  on conflict(user_id) do update set avatar_path=excluded.avatar_path,updated_at=now();
  perform public.kds_write_audit('profile.avatar.updated','profile',auth.uid()::text,null,'{}'::jsonb);
end $$;

create or replace function public.kds_send_project_message(
  p_project_id text,p_body text,p_client_nonce uuid
) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; nonce uuid:=coalesce(p_client_nonce,gen_random_uuid()); sender_role text;
begin
  if not public.kds_project_access(p_project_id) then raise exception 'Project access required' using errcode='42501'; end if;
  if char_length(trim(coalesce(p_body,''))) not between 1 and 5000 then raise exception 'Enter a message between 1 and 5000 characters' using errcode='22023'; end if;
  sender_role:=coalesce(auth.jwt()->'app_metadata'->>'role','client');
  insert into public.kds_project_messages(project_id,sender_id,sender_name,sender_role,body,client_nonce)
  values(p_project_id,auth.uid(),public.kds_display_name(),sender_role,trim(p_body),nonce)
  on conflict(sender_id,client_nonce) where client_nonce is not null do update set client_nonce=excluded.client_nonce
  returning id into result;
  return result;
end $$;

-- Preserve the revision 7 two-argument API while routing it through the idempotent implementation.
create or replace function public.kds_send_project_message(p_project_id text,p_body text) returns uuid
language sql security definer set search_path='' as $$
  select public.kds_send_project_message(p_project_id,p_body,null::uuid);
$$;

create or replace function public.kds_after_project_message() returns trigger
language plpgsql security definer set search_path='' as $$
declare recipient uuid;
begin
  for recipient in select public.kds_project_participant_ids(new.project_id) loop
    insert into public.kds_message_receipts(message_id,user_id,read_at)
    values(new.id,recipient,case when recipient=new.sender_id then now() else null end)
    on conflict do nothing;
    if recipient<>new.sender_id then
      perform public.kds_emit_notification(recipient,'message:'||new.id::text,'Project message',
        new.sender_name||' posted in a project conversation.',
        case when exists(select 1 from auth.users u where u.id=recipient and u.raw_app_meta_data->>'role'='admin') then 'admin.html#community'
             when exists(select 1 from auth.users u where u.id=recipient and u.raw_app_meta_data->>'role'='developer') then 'developer.html#messages'
             else 'client.html#messages' end,
        new.project_id,new.sender_id,jsonb_build_object('message_id',new.id));
    end if;
  end loop;
  perform public.kds_write_audit('message.sent','project_message',new.id::text,new.project_id,jsonb_build_object('sender_role',coalesce(new.sender_role,'client')));
  return new;
end $$;
drop trigger if exists kds_project_message_events on public.kds_project_messages;
create trigger kds_project_message_events after insert on public.kds_project_messages for each row execute function public.kds_after_project_message();

create or replace function public.kds_mark_messages_read(p_project_id text) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not public.kds_project_access(p_project_id) then raise exception 'Project access required' using errcode='42501'; end if;
  update public.kds_message_receipts r set read_at=coalesce(r.read_at,now())
  from public.kds_project_messages m where m.id=r.message_id and r.user_id=auth.uid() and m.project_id=p_project_id;
end $$;

create or replace function public.kds_mark_project_messages_read(p_project_id text) returns void
language sql security definer set search_path='' as $$
  select public.kds_mark_messages_read(p_project_id);
$$;

create or replace function public.kds_list_project_messages(p_project_id text)
returns table(id uuid,project_id text,sender_name text,sender_role text,body text,created_at timestamptz,is_own boolean,is_unread boolean)
language plpgsql stable security definer set search_path='' as $$
begin
  if not public.kds_project_access(p_project_id) then raise exception 'Project access required' using errcode='42501'; end if;
  return query select m.id,m.project_id,m.sender_name,coalesce(m.sender_role,'client'),m.body,m.created_at,
    m.sender_id=auth.uid(),coalesce(r.read_at is null,false)
  from public.kds_project_messages m
  left join public.kds_message_receipts r on r.message_id=m.id and r.user_id=auth.uid()
  where m.project_id=p_project_id order by m.created_at,m.id;
end $$;

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
  where p.kind='projects' and public.kds_project_access(p.id) and latest.created_at is not null
  order by latest.created_at desc,p.id;
$$;

create or replace function public.kds_mark_notifications_read(p_ids uuid[] default null) returns void
language sql security definer set search_path='' as $$
 update public.kds_notifications set read_at=coalesce(read_at,now())
 where recipient_id=auth.uid() and (p_ids is null or id=any(p_ids));
$$;

create or replace function public.kds_notify_contact_submission() returns trigger
language plpgsql security definer set search_path='' as $$
declare recipient uuid;
begin
  for recipient in select u.id from auth.users u where u.raw_app_meta_data->>'role'='admin' loop
    perform public.kds_emit_notification(recipient,'contact:'||new.provider_request_id,'New enquiry',
      coalesce(nullif(new.name,''),'A visitor')||' submitted a contact enquiry.','admin.html#leads',null,null,jsonb_build_object('submission_id',new.id));
  end loop;
  return new;
end $$;
drop trigger if exists kds_contact_submission_events on public.kds_contact_submissions;
create trigger kds_contact_submission_events after insert on public.kds_contact_submissions for each row execute function public.kds_notify_contact_submission();

create or replace function public.kds_notify_agreement_completion() returns trigger
language plpgsql security definer set search_path='' as $$
declare recipient uuid;
begin
  if new.status='completed' and old.status is distinct from 'completed' then
    for recipient in select public.kds_project_participant_ids(new.project_id) loop
      perform public.kds_emit_notification(recipient,'agreement:'||new.id::text||':completed','Agreement completed',
        'An agreement for this project has been completed.',
        case when exists(select 1 from auth.users u where u.id=recipient and u.raw_app_meta_data->>'role'='admin') then 'admin.html#projects'
             when exists(select 1 from auth.users u where u.id=recipient and u.raw_app_meta_data->>'role'='developer') then 'developer.html#projects'
             else 'client.html#projects' end,
        new.project_id,null,jsonb_build_object('agreement_id',new.id));
    end loop;
    perform public.kds_write_audit('agreement.completed','agreement',new.id::text,new.project_id,'{}'::jsonb);
  end if;
  return new;
end $$;
drop trigger if exists kds_agreement_events on public.kds_agreements;
create trigger kds_agreement_events after update on public.kds_agreements for each row execute function public.kds_notify_agreement_completion();

create or replace function public.kds_after_job_assignment() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if tg_op='INSERT' or new.assignee_id is distinct from old.assignee_id then
    perform public.kds_emit_notification(new.assignee_id,'job:'||new.id::text||':assigned:'||new.assignee_id::text,
      'Project assignment','A project assignment is ready in your workspace.','developer.html#job/'||new.id::text,new.project_id,new.created_by,jsonb_build_object('job_id',new.id));
  end if;
  return new;
end $$;
drop trigger if exists kds_job_assignment_events on public.kds_jobs;
create trigger kds_job_assignment_events after insert or update of assignee_id on public.kds_jobs for each row execute function public.kds_after_job_assignment();

create or replace function public.kds_after_job_update() returns trigger
language plpgsql security definer set search_path='' as $$
declare recipient uuid;
begin
  if new.visibility='client' then
    for recipient in select public.kds_project_participant_ids(new.project_id) loop
      if recipient<>new.author_id then
        perform public.kds_emit_notification(recipient,'job-update:'||new.id::text,'Project update',
          'A project checkpoint has been shared.','client.html#projects',new.project_id,new.author_id,jsonb_build_object('update_id',new.id));
      end if;
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists kds_job_update_events on public.kds_job_updates;
create trigger kds_job_update_events after insert on public.kds_job_updates for each row execute function public.kds_after_job_update();

create or replace function public.kds_owner_create_agreement(p_project_id text,p_title text,p_client_user_id uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
  if not public.kds_is_owner() then raise exception 'Verified owner access required' using errcode='42501'; end if;
  if not exists(select 1 from public.kds_records where id=p_project_id and kind='projects') or char_length(trim(coalesce(p_title,''))) not between 1 and 180 then
    raise exception 'Check the agreement project and title' using errcode='22023';
  end if;
  insert into public.kds_agreements(project_id,client_user_id,title,created_by) values(p_project_id,p_client_user_id,trim(p_title),auth.uid()) returning id into result;
  perform public.kds_write_audit('agreement.created','agreement',result::text,p_project_id,'{}'::jsonb);
  return result;
end $$;

-- These event recorders are called only by a trusted Supabase Edge Function/service role
-- after the external provider confirms durable acceptance or signing completion.
create or replace function public.kds_record_contact_submission(
  p_provider_request_id text,p_email text,p_name text,p_service text,p_summary text,p_metadata jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
  insert into public.kds_contact_submissions(provider_request_id,email,name,service,summary,metadata)
  values(trim(p_provider_request_id),lower(trim(p_email)),trim(coalesce(p_name,'')),trim(coalesce(p_service,'general')),trim(coalesce(p_summary,'')),coalesce(p_metadata,'{}'::jsonb))
  on conflict(provider_request_id) do update set provider_request_id=excluded.provider_request_id
  returning id into result;
  return result;
end $$;

-- Atomic fixed-window limiter for the public enquiry Edge Function. Only the
-- service role receives EXECUTE below, so visitors cannot reset their count.
create or replace function public.kds_check_contact_rate(p_fingerprint text) returns boolean
language plpgsql security definer set search_path='' as $$
declare current_attempts integer;
begin
  p_fingerprint:=lower(trim(coalesce(p_fingerprint,'')));
  if p_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid contact rate fingerprint' using errcode='22023';
  end if;
  insert into public.kds_contact_rate_limits(fingerprint,window_started,attempts,updated_at)
  values(p_fingerprint,now(),1,now())
  on conflict(fingerprint) do update set
    window_started=case
      when public.kds_contact_rate_limits.window_started <= now()-interval '30 minutes' then now()
      else public.kds_contact_rate_limits.window_started
    end,
    attempts=case
      when public.kds_contact_rate_limits.window_started <= now()-interval '30 minutes' then 1
      else least(public.kds_contact_rate_limits.attempts+1,6)
    end,
    updated_at=now()
  returning attempts into current_attempts;
  return current_attempts<=5;
end $$;

create or replace function public.kds_record_agreement_completion(
  p_agreement_id uuid,p_provider_reference text,p_completed_at timestamptz
) returns void language plpgsql security definer set search_path='' as $$
begin
  update public.kds_agreements set status='completed',provider_reference=trim(p_provider_reference),completed_at=p_completed_at,updated_at=now()
  where id=p_agreement_id and status in ('draft','sent');
  if not found then raise exception 'Agreement not found or already closed'; end if;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('kds-profile-images','kds-profile-images',false,5242880,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict(id) do update set public=false,file_size_limit=least(coalesce(storage.buckets.file_size_limit,5242880),5242880),allowed_mime_types=excluded.allowed_mime_types;

alter table public.kds_profiles enable row level security;
alter table public.kds_project_messages enable row level security;
alter table public.kds_message_receipts enable row level security;
alter table public.kds_profile_uploads enable row level security;
alter table public.kds_notifications enable row level security;
alter table public.kds_contact_submissions enable row level security;
alter table public.kds_contact_rate_limits enable row level security;
alter table public.kds_agreements enable row level security;
alter table public.kds_audit_events enable row level security;

revoke all on public.kds_profiles,public.kds_project_messages,public.kds_message_receipts,public.kds_profile_uploads,public.kds_notifications,
  public.kds_contact_submissions,public.kds_contact_rate_limits,public.kds_agreements,public.kds_audit_events from public,anon,authenticated;
grant select on public.kds_profiles to authenticated;
grant select on public.kds_project_messages,public.kds_message_receipts,public.kds_notifications,public.kds_agreements to authenticated;
grant select on public.kds_contact_submissions,public.kds_audit_events to authenticated;

drop policy if exists kds_profiles_read on public.kds_profiles;
create policy kds_profiles_read on public.kds_profiles for select to authenticated using(user_id=auth.uid() or public.kds_is_owner());
drop policy if exists kds_project_messages_select on public.kds_project_messages;
create policy kds_project_messages_select on public.kds_project_messages for select to authenticated using(public.kds_project_access(project_id));
drop policy if exists kds_message_receipts_read on public.kds_message_receipts;
create policy kds_message_receipts_read on public.kds_message_receipts for select to authenticated using(user_id=auth.uid());
drop policy if exists kds_profile_uploads_read on public.kds_profile_uploads;
create policy kds_profile_uploads_read on public.kds_profile_uploads for select to authenticated using(user_id=auth.uid() or public.kds_is_owner());
drop policy if exists kds_notifications_select on public.kds_notifications;
create policy kds_notifications_select on public.kds_notifications for select to authenticated using(
  recipient_id=auth.uid() and (coalesce(auth.jwt()->'app_metadata'->>'role','client')<>'admin' or coalesce(auth.jwt()->>'aal','')='aal2'));
drop policy if exists kds_contact_submissions_owner on public.kds_contact_submissions;
create policy kds_contact_submissions_owner on public.kds_contact_submissions for select to authenticated using(public.kds_is_owner());
drop policy if exists kds_agreements_read on public.kds_agreements;
create policy kds_agreements_read on public.kds_agreements for select to authenticated using(public.kds_project_access(project_id));
drop policy if exists kds_audit_events_owner on public.kds_audit_events;
create policy kds_audit_events_owner on public.kds_audit_events for select to authenticated using(public.kds_is_owner());

-- Refuse an unrelated broad Storage policy that could bypass this bucket's intended privacy.
-- Bucket-scoped policies for other application buckets remain untouched.
do $$ begin
  if exists(
    select 1 from pg_policies where schemaname='storage' and tablename='objects'
      and policyname not in ('kds_job_files_read','kds_job_files_insert','kds_job_files_delete',
        'kds_profile_images_read','kds_profile_images_insert','kds_profile_images_update','kds_profile_images_delete')
      and ((cmd in ('SELECT','DELETE','UPDATE','ALL') and coalesce(qual,'') !~ 'bucket_id')
        or (cmd in ('INSERT','UPDATE','ALL') and coalesce(with_check,'') !~ 'bucket_id'))
  ) then
    raise exception 'A broad Storage policy was found. Scope it to its intended bucket before applying production-v8.sql; no data was changed.';
  end if;
end $$;

drop policy if exists kds_profile_images_read on storage.objects;
create policy kds_profile_images_read on storage.objects for select to authenticated using(
  bucket_id='kds-profile-images' and (split_part(name,'/',1)=auth.uid()::text or public.kds_is_owner()));
drop policy if exists kds_profile_images_insert on storage.objects;
create policy kds_profile_images_insert on storage.objects for insert to authenticated with check(
  bucket_id='kds-profile-images' and exists(select 1 from public.kds_profile_uploads u where u.object_path=name and u.user_id=auth.uid() and u.state='pending'));
drop policy if exists kds_profile_images_update on storage.objects;
create policy kds_profile_images_update on storage.objects for update to authenticated using(
  bucket_id='kds-profile-images' and split_part(name,'/',1)=auth.uid()::text)
  with check(bucket_id='kds-profile-images' and split_part(name,'/',1)=auth.uid()::text);
drop policy if exists kds_profile_images_delete on storage.objects;
create policy kds_profile_images_delete on storage.objects for delete to authenticated using(
  bucket_id='kds-profile-images' and split_part(name,'/',1)=auth.uid()::text);

-- Remove default PUBLIC execution. Helper/trigger functions remain inaccessible directly.
do $$ declare f record; begin
  for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname like 'kds_%' loop
    execute 'revoke all on function '||f.signature||' from public,anon';
  end loop;
end $$;
grant execute on function public.kds_save_my_profile(text,text,text,text,text,text[],text,jsonb) to authenticated;
grant execute on function public.kds_prepare_profile_avatar(text,bigint) to authenticated;
grant execute on function public.kds_complete_profile_avatar(text) to authenticated;
grant execute on function public.kds_send_project_message(text,text,uuid) to authenticated;
grant execute on function public.kds_send_project_message(text,text) to authenticated;
grant execute on function public.kds_mark_messages_read(text) to authenticated;
grant execute on function public.kds_mark_project_messages_read(text) to authenticated;
grant execute on function public.kds_list_project_messages(text) to authenticated;
grant execute on function public.kds_list_project_conversations() to authenticated;
grant execute on function public.kds_mark_notifications_read(uuid[]) to authenticated;
grant execute on function public.kds_owner_create_agreement(text,text,uuid) to authenticated;
-- Used by RLS predicates on messages and agreements. The function returns only
-- a boolean and keeps the underlying membership lookups security-definer.
grant execute on function public.kds_project_access(text) to authenticated;
do $$ begin
  if exists(select 1 from pg_roles where rolname='service_role') then
    execute 'grant execute on function public.kds_record_contact_submission(text,text,text,text,text,jsonb) to service_role';
    execute 'grant execute on function public.kds_check_contact_rate(text) to service_role';
    execute 'grant execute on function public.kds_record_agreement_completion(uuid,text,timestamptz) to service_role';
  end if;
end $$;

-- Realtime is enabled only when the managed Supabase publication exists and the table is not already present.
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='kds_notifications') then
      alter publication supabase_realtime add table public.kds_notifications;
    end if;
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='kds_project_messages') then
      alter publication supabase_realtime add table public.kds_project_messages;
    end if;
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='kds_message_receipts') then
      alter publication supabase_realtime add table public.kds_message_receipts;
    end if;
  end if;
end $$;

commit;

-- Read-only verification. Expected: RLS true on every listed table; profile bucket public=false.
select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('kds_profiles','kds_project_messages','kds_message_receipts','kds_notifications','kds_contact_submissions','kds_contact_rate_limits','kds_agreements','kds_audit_events') order by c.relname;
select id,public,file_size_limit from storage.buckets where id='kds-profile-images';
