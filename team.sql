-- Team feature only. Review in staging/back up first. No existing records are deleted.
-- Adds private jobs, append-only progress updates, asset metadata and a private bucket.
begin;
create table if not exists public.kds_team (
 user_id uuid primary key references auth.users(id),
 email text not null, display_name text not null check(length(display_name) between 1 and 100),
 discipline text not null check(discipline in ('website','3d','app','automation')),
 active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.kds_jobs (
 id uuid primary key default gen_random_uuid(),
 project_id text not null references public.kds_records(id) on delete restrict,
 project_label text not null, assignee_id uuid not null references public.kds_team(user_id),
 title text not null check(length(title) between 1 and 160),
 brief text not null default '' check(length(brief)<=10000),
 status text not null default 'assigned' check(status in ('assigned','working','review','blocked','completed')),
 due_on date, archived boolean not null default false,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists kds_jobs_assignee on public.kds_jobs(assignee_id,archived);
create index if not exists kds_jobs_project on public.kds_jobs(project_id);
create table if not exists public.kds_job_updates (
 id uuid primary key default gen_random_uuid(),job_id uuid not null references public.kds_jobs(id) on delete cascade,
 project_id text not null,author_id uuid not null references auth.users(id),author_name text not null,
 checkpoint text not null default '' check(length(checkpoint)<=160),
 summary text not null check(length(summary) between 1 and 5000),
 visibility text not null default 'internal' check(visibility in ('internal','client')),
 created_at timestamptz not null default now()
);
create index if not exists kds_job_updates_project on public.kds_job_updates(project_id,created_at);
create table if not exists public.kds_job_assets (
 id uuid primary key default gen_random_uuid(),job_id uuid not null references public.kds_jobs(id) on delete cascade,
 project_id text not null,author_id uuid not null references auth.users(id),author_name text not null,
 asset_type text not null check(asset_type in ('file','link')), label text not null check(length(label) between 1 and 180),
 object_path text unique,url text,mime_type text,byte_size bigint,
 visibility text not null default 'internal' check(visibility in ('internal','client')),
 state text not null default 'pending' check(state in ('pending','ready')),
 created_at timestamptz not null default now(),
 check((asset_type='file' and object_path is not null and url is null) or (asset_type='link' and object_path is null and url ~ '^https://')),
 check(byte_size is null or byte_size between 1 and 52428800)
);
create index if not exists kds_job_assets_project on public.kds_job_assets(project_id,created_at);

create or replace function public.kds_is_owner() returns boolean language sql stable security definer set search_path=''
as $$ select auth.uid() is not null and coalesce(auth.jwt()->'app_metadata'->>'role','')='admin' and coalesce(auth.jwt()->>'aal','')='aal2' $$;
create or replace function public.kds_is_developer() returns boolean language sql stable security definer set search_path=''
as $$ select auth.uid() is not null and coalesce(auth.jwt()->'app_metadata'->>'role','')='developer' and exists(select 1 from public.kds_team where user_id=auth.uid() and active) $$;
create or replace function public.kds_can_access_job(job uuid) returns boolean language sql stable security definer set search_path=''
as $$ select public.kds_is_owner() or (public.kds_is_developer() and exists(select 1 from public.kds_jobs where id=job and assignee_id=auth.uid())) $$;
create or replace function public.kds_client_project(project text) returns boolean language sql stable security definer set search_path=''
as $$ select auth.uid() is not null and coalesce(auth.jwt()->'app_metadata'->>'role','client')='client' and exists(select 1 from public.kds_records where id=project and kind='projects' and lower(owner_email)=lower(auth.jwt()->>'email')) $$;

-- Refuse unknown policies on these new feature tables instead of leaving permissive access.
do $$begin
 if exists(select 1 from pg_policies where schemaname='public' and tablename in ('kds_team','kds_jobs','kds_job_updates','kds_job_assets') and (tablename,policyname) not in (('kds_team','team_read'),('kds_jobs','jobs_read'),('kds_job_updates','updates_read'),('kds_job_assets','assets_read'))) then
 raise exception 'Unexpected Team policy found. Review it before applying this feature; no policies or data were removed.';
 end if;
end $$;
alter table public.kds_team enable row level security;
alter table public.kds_jobs enable row level security;
alter table public.kds_job_updates enable row level security;
alter table public.kds_job_assets enable row level security;
revoke all on public.kds_team,public.kds_jobs,public.kds_job_updates,public.kds_job_assets from public,anon,authenticated;
grant select on public.kds_team,public.kds_jobs,public.kds_job_updates,public.kds_job_assets to authenticated;
drop policy if exists team_read on public.kds_team;
create policy team_read on public.kds_team for select to authenticated using(public.kds_is_owner() or (user_id=auth.uid() and public.kds_is_developer()));
drop policy if exists jobs_read on public.kds_jobs;
create policy jobs_read on public.kds_jobs for select to authenticated using(public.kds_can_access_job(id));
drop policy if exists updates_read on public.kds_job_updates;
create policy updates_read on public.kds_job_updates for select to authenticated using(public.kds_can_access_job(job_id) or (visibility='client' and public.kds_client_project(project_id)));
drop policy if exists assets_read on public.kds_job_assets;
create policy assets_read on public.kds_job_assets for select to authenticated using(public.kds_can_access_job(job_id) or (state='ready' and visibility='client' and public.kds_client_project(project_id)));
-- Narrow the existing client policies so a developer is not treated as a client.
alter policy client_read on public.kds_records using(auth.uid() is not null and coalesce(auth.jwt()->'app_metadata'->>'role','client')='client' and kind in ('projects','messages','profiles') and lower(owner_email)=lower(auth.jwt()->>'email'));
alter policy client_message on public.kds_records with check(auth.uid() is not null and coalesce(auth.jwt()->'app_metadata'->>'role','client')='client' and kind='messages' and lower(owner_email)=lower(auth.jwt()->>'email') and data->>'kind' in ('msg','concern') and data->>'status'='Received' and data->>'reply'='' and length(data->>'text') between 1 and 5000 and coalesce(data->>'cat','') in ('','Delay','Quality','Automation','Billing','Other') and (data-array['text','kind','cat','at','reply','status'])='{}'::jsonb);

create or replace function public.kds_register_developer(p_email text,p_name text,p_discipline text) returns uuid language plpgsql security definer set search_path='' as $$
declare u auth.users;begin
 if not public.kds_is_owner() then raise exception 'Owner access required' using errcode='42501';end if;
 if length(trim(p_name)) not between 1 and 100 or p_discipline not in ('website','3d','app','automation') then raise exception 'Check name and discipline';end if;
 select * into u from auth.users where lower(email)=lower(trim(p_email));
 if not found or u.email_confirmed_at is null then raise exception 'Create or invite and confirm this colleague account in Supabase Authentication first';end if;
 if u.raw_app_meta_data->>'role'='admin' then raise exception 'Owner accounts cannot be converted to developer accounts';end if;
 update auth.users set raw_app_meta_data=coalesce(raw_app_meta_data,'{}'::jsonb)||'{"role":"developer"}'::jsonb where id=u.id;
 insert into public.kds_team(user_id,email,display_name,discipline) values(u.id,u.email,trim(p_name),p_discipline)
 on conflict(user_id) do update set display_name=excluded.display_name,discipline=excluded.discipline,active=true;
 return u.id;end $$;
create or replace function public.kds_assign_job(p_project text,p_assignee uuid,p_title text,p_brief text,p_due date default null) returns uuid language plpgsql security definer set search_path='' as $$
declare project public.kds_records; job uuid;begin
 if not public.kds_is_owner() then raise exception 'Owner access required' using errcode='42501';end if;
 select * into project from public.kds_records where id=p_project and kind='projects';if not found then raise exception 'Choose an existing project';end if;
 if not exists(select 1 from public.kds_team where user_id=p_assignee and active) then raise exception 'Choose an active colleague';end if;
 if length(trim(p_title)) not between 1 and 160 or length(coalesce(p_brief,''))>10000 then raise exception 'Check the job title and brief';end if;
 insert into public.kds_jobs(project_id,project_label,assignee_id,title,brief,due_on,created_by) values(p_project,coalesce(project.data->>'name','Studio project'),p_assignee,trim(p_title),coalesce(p_brief,''),p_due,auth.uid()) returning id into job;
 return job;end $$;
create or replace function public.kds_post_job_update(p_job uuid,p_status text,p_checkpoint text,p_summary text,p_visibility text default 'internal') returns uuid language plpgsql security definer set search_path='' as $$
declare job public.kds_jobs; who text;result uuid;begin
 select * into job from public.kds_jobs where id=p_job for update;
 if not found or not public.kds_can_access_job(p_job) then raise exception 'Job access required' using errcode='42501';end if;
 if job.archived or job.status='completed' then raise exception 'This job is closed for updates';end if;
 if p_status not in ('working','review','blocked') or p_visibility not in ('internal','client') or length(trim(p_summary)) not between 1 and 5000 or length(coalesce(p_checkpoint,''))>160 then raise exception 'Check the update fields';end if;
 select display_name into who from public.kds_team where user_id=auth.uid();
 insert into public.kds_job_updates(job_id,project_id,author_id,author_name,checkpoint,summary,visibility) values(p_job,job.project_id,auth.uid(),coalesce(who,'Studio owner'),coalesce(p_checkpoint,''),trim(p_summary),p_visibility) returning id into result;
 update public.kds_jobs set status=p_status,updated_at=now() where id=p_job;
 return result;end $$;
create or replace function public.kds_review_job(p_job uuid,p_decision text,p_note text default '') returns void language plpgsql security definer set search_path='' as $$
declare job public.kds_jobs;begin
 if not public.kds_is_owner() then raise exception 'Owner access required' using errcode='42501';end if;
 select * into job from public.kds_jobs where id=p_job for update;if not found then raise exception 'Job not found';end if;
 if p_decision not in ('completed','working','archived') or length(coalesce(p_note,''))>5000 then raise exception 'Check review fields';end if;
 update public.kds_jobs set status=case when p_decision='archived' then status else p_decision end,archived=(p_decision='archived'),updated_at=now() where id=p_job;
 insert into public.kds_job_updates(job_id,project_id,author_id,author_name,checkpoint,summary,visibility) values(p_job,job.project_id,auth.uid(),'Studio owner','Owner review',case when trim(coalesce(p_note,''))='' then 'Owner review: '||p_decision else p_note end,'internal');
 end $$;
create or replace function public.kds_reassign_job(p_job uuid,p_assignee uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.kds_is_owner() then raise exception 'Owner access required' using errcode='42501';end if;
 if not exists(select 1 from public.kds_team where user_id=p_assignee and active) then raise exception 'Choose an active colleague';end if;
 update public.kds_jobs set assignee_id=p_assignee,updated_at=now() where id=p_job and not archived;
 if not found then raise exception 'Active job not found';end if;
 end $$;
create or replace function public.kds_prepare_job_asset(p_job uuid,p_label text,p_mime text,p_size bigint,p_visibility text default 'internal') returns public.kds_job_assets language plpgsql security definer set search_path='' as $$
declare job public.kds_jobs;asset public.kds_job_assets;asset_id uuid:=gen_random_uuid();who text;filename text;begin
 select * into job from public.kds_jobs where id=p_job;
 if not found or not public.kds_can_access_job(p_job) then raise exception 'Job access required' using errcode='42501';end if;
 if job.archived or job.status='completed' then raise exception 'This job is closed for uploads';end if;
 if length(trim(p_label)) not between 1 and 180 or p_size not between 1 and 52428800 or p_visibility not in ('internal','client') then raise exception 'Check file size, name and visibility';end if;
 if p_mime not in ('image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','application/pdf','application/zip','model/gltf-binary','model/gltf+json','application/octet-stream') then raise exception 'Unsupported file type';end if;
 filename=regexp_replace(p_label,'[^a-zA-Z0-9._-]','_','g');select display_name into who from public.kds_team where user_id=auth.uid();
 insert into public.kds_job_assets(id,job_id,project_id,author_id,author_name,asset_type,label,object_path,mime_type,byte_size,visibility) values(asset_id,p_job,job.project_id,auth.uid(),coalesce(who,'Studio owner'),'file',p_label,p_job::text||'/'||asset_id::text||'/'||filename,p_mime,p_size,p_visibility) returning * into asset;
 return asset;end $$;
create or replace function public.kds_complete_job_asset(p_asset uuid) returns void language plpgsql security definer set search_path='' as $$
declare a public.kds_job_assets;begin
 select * into a from public.kds_job_assets where id=p_asset for update;
 if not found or not public.kds_can_access_job(a.job_id) or (a.author_id<>auth.uid() and not public.kds_is_owner()) then raise exception 'Asset access required' using errcode='42501';end if;
 if not exists(select 1 from storage.objects where bucket_id='kds-job-files' and name=a.object_path) then raise exception 'Upload has not completed';end if;
 update public.kds_job_assets set state='ready' where id=p_asset;
 update public.kds_jobs set updated_at=now() where id=a.job_id;
 end $$;
create or replace function public.kds_add_job_link(p_job uuid,p_label text,p_url text,p_visibility text default 'internal') returns uuid language plpgsql security definer set search_path='' as $$
declare job public.kds_jobs;who text;result uuid;begin
 select * into job from public.kds_jobs where id=p_job;
 if not found or not public.kds_can_access_job(p_job) then raise exception 'Job access required' using errcode='42501';end if;
 if job.archived or job.status='completed' then raise exception 'This job is closed for sharing';end if;
 if p_url !~ '^https://' or length(p_url)>2048 or length(trim(p_label)) not between 1 and 180 or p_visibility not in ('internal','client') then raise exception 'Use a valid HTTPS link, label and visibility';end if;
 select display_name into who from public.kds_team where user_id=auth.uid();
 insert into public.kds_job_assets(job_id,project_id,author_id,author_name,asset_type,label,url,visibility,state) values(p_job,job.project_id,auth.uid(),coalesce(who,'Studio owner'),'link',trim(p_label),p_url,p_visibility,'ready') returning id into result;
 update public.kds_jobs set updated_at=now() where id=p_job;
 return result;end $$;
create or replace function public.kds_discard_pending_asset(p_asset uuid) returns void language plpgsql security definer set search_path='' as $$
begin delete from public.kds_job_assets where id=p_asset and state='pending' and public.kds_can_access_job(job_id) and (author_id=auth.uid() or public.kds_is_owner()) and not exists(select 1 from storage.objects where bucket_id='kds-job-files' and name=object_path);end $$;

-- New private storage only; stop if existing policies need a bucket-scope review.
do $$begin
 if exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname not in ('kds_job_files_read','kds_job_files_insert','kds_job_files_delete')) then
  raise exception 'Existing Storage policies found. Review their bucket scope before enabling kds-job-files; no policies or data were removed.';
 end if;
end $$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('kds-job-files','kds-job-files',false,52428800,array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','application/pdf','application/zip','model/gltf-binary','model/gltf+json','application/octet-stream']) on conflict(id) do nothing;
do $$begin if exists(select 1 from storage.buckets where id='kds-job-files' and public) then raise exception 'kds-job-files must be private';end if;end $$;
drop policy if exists kds_job_files_read on storage.objects;
create policy kds_job_files_read on storage.objects for select to authenticated using(bucket_id='kds-job-files' and exists(select 1 from public.kds_job_assets a where a.object_path=name and (public.kds_can_access_job(a.job_id) or (a.state='ready' and a.visibility='client' and public.kds_client_project(a.project_id)))));
drop policy if exists kds_job_files_insert on storage.objects;
create policy kds_job_files_insert on storage.objects for insert to authenticated with check(bucket_id='kds-job-files' and exists(select 1 from public.kds_job_assets a join public.kds_jobs j on j.id=a.job_id where a.object_path=name and a.author_id=auth.uid() and a.state='pending' and public.kds_can_access_job(a.job_id) and not j.archived and j.status<>'completed'));
drop policy if exists kds_job_files_delete on storage.objects;
create policy kds_job_files_delete on storage.objects for delete to authenticated using(bucket_id='kds-job-files' and exists(select 1 from public.kds_job_assets a where a.object_path=name and a.state='pending' and (a.author_id=auth.uid() or public.kds_is_owner()) and public.kds_can_access_job(a.job_id)));
-- Remove default PUBLIC function execution; only signed-in actors can call these guarded APIs.
do $$declare f record;begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('kds_is_owner','kds_is_developer','kds_can_access_job','kds_client_project','kds_register_developer','kds_assign_job','kds_post_job_update','kds_review_job','kds_reassign_job','kds_prepare_job_asset','kds_complete_job_asset','kds_add_job_link','kds_discard_pending_asset') loop
 execute 'revoke all on function '||f.signature||' from public,anon';
 execute 'grant execute on function '||f.signature||' to authenticated';
 end loop;end $$;
commit;
-- Read-only checks after application:
select tablename,policyname,cmd from pg_policies where schemaname='public' and tablename in ('kds_team','kds_jobs','kds_job_updates','kds_job_assets');
select id,public,file_size_limit from storage.buckets where id='kds-job-files';
