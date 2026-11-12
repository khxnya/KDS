/* Revision 8 database/RLS regression checks using the existing local PostgreSQL fixture. */
const assert=require('assert'),fs=require('fs'),path=require('path');
const {database}=require('./team-db.cjs');
const root=path.resolve(__dirname,'..');
const accounts={
 owner:{id:'10000000-0000-4000-8000-000000000001',email:'owner@studio.invalid',app_metadata:{role:'admin'}},
 client:{id:'10000000-0000-4000-8000-000000000002',email:'client@studio.invalid',app_metadata:{}},
 other:{id:'10000000-0000-4000-8000-000000000003',email:'other@studio.invalid',app_metadata:{}},
 developer:{id:'10000000-0000-4000-8000-000000000004',email:'developer@studio.invalid',app_metadata:{}},
 developer2:{id:'10000000-0000-4000-8000-000000000005',email:'developer2@studio.invalid',app_metadata:{}}
};
const records=[
 {id:'project-client',kind:'projects',owner_email:accounts.client.email,data:{name:'Client project'}},
 {id:'project-other',kind:'projects',owner_email:accounts.other.email,data:{name:'Other project'}}
];
const actor=(account,aal='aal1')=>({account,aal});
async function run(){const data=await database(accounts,records);try{
 await data.db.exec(fs.readFileSync(path.join(root,'collaboration.sql'),'utf8'));
 await data.db.exec(fs.readFileSync(path.join(root,'production-v8.sql'),'utf8'));
 await data.db.exec(fs.readFileSync(path.join(root,'production-v8.sql'),'utf8'));
 const owner=actor(accounts.owner,'aal2'),client=actor(accounts.client),other=actor(accounts.other);
 await data.as(owner,"select kds_register_developer($1,'Sipho','website')",[accounts.developer.email]);accounts.developer.app_metadata.role='developer';
 const job=(await data.as(owner,"select kds_assign_job('project-client',$1,'Client build','Private brief',null) id",[accounts.developer.id])).rows[0].id;
 const dev=actor(accounts.developer);
 await data.as(client,"select kds_save_my_profile('Lerato','Mokoena','','Acme','','{}','','{\"messages\":true}'::jsonb)");
 assert.equal((await data.as(client,'select first_name from kds_profiles')).rows[0].first_name,'Lerato');
 assert.equal((await data.as(other,'select * from kds_profiles')).rows.length,0);
 const message=(await data.as(client,"select kds_send_project_message('project-client','Hello team') id")).rows[0].id;
 assert.equal((await data.as(dev,"select count(*)::int n from kds_project_messages where project_id='project-client'")).rows[0].n,1);
 assert.equal((await data.as(other,'select count(*)::int n from kds_project_messages')).rows[0].n,0);
 assert.equal((await data.as(dev,'select count(*)::int n from kds_notifications where event_key=$1',['message:'+message])).rows[0].n,1);
 assert.equal((await data.as(client,'select count(*)::int n from kds_message_receipts where read_at is null')).rows[0].n,0);
 assert.equal((await data.as(dev,"select count(*)::int n from kds_message_receipts where message_id=$1 and read_at is null",[message])).rows[0].n,1);
 await data.as(dev,"select kds_mark_project_messages_read('project-client')");
 assert.equal((await data.as(dev,'select count(*)::int n from kds_message_receipts where read_at is null')).rows[0].n,0);
 await assert.rejects(()=>data.as(other,"select kds_send_project_message('project-client','intrusion')"),e=>e.code==='42501');
 assert.equal((await data.as(actor(accounts.owner),'select count(*)::int n from kds_notifications')).rows[0].n,0);
 assert.ok((await data.as(owner,'select count(*)::int n from kds_audit_events')).rows[0].n>=2);
 await assert.rejects(()=>data.as(client,"select kds_owner_create_agreement('project-client','Agreement',null)"),e=>e.code==='42501');
 const agreement=(await data.as(owner,"select kds_owner_create_agreement('project-client','Agreement',null) id")).rows[0].id;
 const fingerprint='a'.repeat(64);
 for(let attempt=1;attempt<=5;attempt++)assert.equal((await data.db.query('select kds_check_contact_rate($1) allowed',[fingerprint])).rows[0].allowed,true);
 assert.equal((await data.db.query('select kds_check_contact_rate($1) allowed',[fingerprint])).rows[0].allowed,false);
 const contact=(await data.db.query("select kds_record_contact_submission('web3forms:test-request-0001','visitor@example.invalid','Visitor','website','A website enquiry','{}'::jsonb) id")).rows[0].id;
 assert.ok(contact);
 assert.equal((await data.as(owner,"select count(*)::int n from kds_notifications where event_key='contact:web3forms:test-request-0001'")).rows[0].n,1);
 assert.ok(agreement);assert.ok(job);
 console.log('PASS v8 SQL repeatability, profile isolation, project chat receipts, notification RLS, contact rate limits/events and MFA owner actions');
 }finally{await data.close();}}
if(require.main===module)run().catch(e=>{console.error(e);process.exit(1)});module.exports={run};
