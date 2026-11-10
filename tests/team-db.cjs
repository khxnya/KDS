/* Real SQL/RLS in embedded PostgreSQL; Auth JWT and Storage schemas are local fixtures. */
const {PGlite}=require('@electric-sql/pglite');const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
async function database(accounts,records){const db=new PGlite();await db.exec(`
create role anon nologin;create role authenticated nologin;
create schema auth;create schema storage;
create table auth.users(id uuid primary key,email text unique,email_confirmed_at timestamptz,raw_app_meta_data jsonb);
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
grant usage on schema public,auth,storage to anon,authenticated;
grant execute on all functions in schema auth to anon,authenticated;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,unique(bucket_id,name));
alter table storage.objects enable row level security;
grant select,insert,delete on storage.objects to authenticated;
`);for(const a of Object.values(accounts))await db.query('insert into auth.users values($1,$2,now(),$3)',[a.id,a.email,a.app_metadata]);
await db.exec(fs.readFileSync(path.join(root,'database.sql'),'utf8'));await db.exec(fs.readFileSync(path.join(root,'team.sql'),'utf8'));await db.exec(fs.readFileSync(path.join(root,'team.sql'),'utf8'));
for(const r of records)await db.query('insert into kds_records(id,kind,owner_email,data) values($1,$2,$3,$4)',[r.id,r.kind,r.owner_email,r.data]);
async function as(actor,sql,args=[]){return db.transaction(async tx=>{await tx.exec('set local role '+(actor?'authenticated':'anon'));await tx.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify(actor?{sub:actor.account.id,email:actor.account.email,app_metadata:actor.account.app_metadata,aal:actor.aal}:{} )]);return tx.query(sql,args);});}
return {db,as,close:()=>db.close()};}
module.exports={database};
