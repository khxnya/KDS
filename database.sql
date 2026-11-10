-- Apply in a backed-up staging project first. No records are deleted.
-- Stops instead of silently retaining an unknown permissive policy.
begin;
create table if not exists public.kds_records (
 id text primary key check (id ~ '^[A-Za-z0-9_-]{1,100}$'),
 kind text not null check (kind in ('projects','leads','messages','profiles','private_notes')),
 owner_email text not null,
 data jsonb not null check (jsonb_typeof(data)='object') check (octet_length(data::text)<=100000),
 created_at timestamptz not null default now()
);
create index if not exists kds_records_owner on public.kds_records(owner_email,kind);
do $$ begin
 if exists(select 1 from pg_policies where schemaname='public' and tablename='kds_records'
   and policyname not in ('studio_admin','client_read','client_message')) then
   raise exception 'Unrecognised kds_records policy found. Review it before applying this migration.';
 end if;
end $$;
alter table public.kds_records enable row level security;
revoke all on public.kds_records from public,anon;
grant select,insert,update,delete on public.kds_records to authenticated;
drop policy if exists studio_admin on public.kds_records;
drop policy if exists client_read on public.kds_records;
drop policy if exists client_message on public.kds_records;
create policy studio_admin on public.kds_records for all to authenticated
 using(auth.uid() is not null and auth.jwt()->'app_metadata'->>'role'='admin' and auth.jwt()->>'aal'='aal2')
 with check(auth.uid() is not null and auth.jwt()->'app_metadata'->>'role'='admin' and auth.jwt()->>'aal'='aal2');
create policy client_read on public.kds_records for select to authenticated
 using(auth.uid() is not null and coalesce(auth.jwt()->'app_metadata'->>'role','client')='client'
 and kind in ('projects','messages','profiles')
 and lower(owner_email)=lower(auth.jwt()->>'email'));
create policy client_message on public.kds_records for insert to authenticated
 with check(auth.uid() is not null and coalesce(auth.jwt()->'app_metadata'->>'role','client')='client'
 and kind='messages' and lower(owner_email)=lower(auth.jwt()->>'email')
 and data->>'kind' in ('msg','concern') and data->>'status'='Received'
 and data->>'reply'='' and length(data->>'text') between 1 and 5000
 and coalesce(data->>'cat','') in ('','Delay','Quality','Automation','Billing','Other')
 and (data - array['text','kind','cat','at','reply','status'])='{}'::jsonb);
commit;
-- Inspect after applying. Confirm RLS is true and only the three expected policies remain.
select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relname='kds_records';
select policyname,cmd,roles,qual,with_check from pg_policies
 where schemaname='public' and tablename='kds_records';
