(function(){
  'use strict';

  const $=id=>document.getElementById(id);
  const api=()=>window.KDS?.teamApi;
  const identity=()=>api()?.identity?.()||null;
  const role=()=>identity()?.role||'client';
  const portal=()=>document.body.dataset.portal==='developer'?'developer':$('lock')?'admin':$('auth')?'client':'public';
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt=value=>{try{return new Intl.DateTimeFormat('en-ZA',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}catch(_){return '';}};
  const timers=new Set(),subscriptions=new Set();

  function el(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=String(text);return node;}
  function button(label,className,action){const node=el('button',className,label);node.type='button';if(action)node.addEventListener('click',action);return node;}
  function announce(message){if(typeof window.toast==='function')window.toast(message);}
  function errorText(error){const message=String(error?.message||'The request could not be completed.');return message.length>220?message.slice(0,217)+'…':message;}
  async function request(path,options){if(!api())throw Error('Sign in to continue.');return api().request(path,options);}
  async function rpc(name,body={}){return request('/rest/v1/rpc/'+name,{method:'POST',body:JSON.stringify(body)});}
  function unwrap(value){return Array.isArray(value)&&value.length===1?value[0]:value;}
  function safeLink(raw){if(!raw||raw==='#')return null;try{const url=new URL(raw,location.href);if(url.origin!==location.origin)return null;if(!/\.(?:html)?$/i.test(url.pathname)&&url.pathname!==location.pathname)return null;return url;}catch(_){return null;}}
  function bellSvg(){return '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>';}

  /* Notifications */
  const profileState={profile:null,error:''};
  const notificationState={rows:[],loading:false,error:'',open:false};
  function notificationCategory(item){const kind=String(item?.kind||'').toLowerCase();if(/message|chat|conversation/.test(kind))return'messages';if(/assign|job|developer/.test(kind))return'assignments';if(/agreement|approval|sign/.test(kind))return'agreements';return'projects';}
  function visibleNotifications(){const categories=profileState.profile?.preferences?.notification_categories;return Array.isArray(categories)?notificationState.rows.filter(item=>categories.includes(notificationCategory(item))):notificationState.rows;}
  function removeRevisionSevenNotifications(){
    document.querySelectorAll('.kds-notice-trigger,#kdsNotifications').forEach(node=>node.remove());
  }
  function notificationHost(){return document.querySelector('.topbar .tb-r')||document.querySelector('#app .topbar .tb-r');}
  function installBell(){
    const host=notificationHost();if(!host||$('kdsBellV8'))return;
    removeRevisionSevenNotifications();
    const trigger=button('', 'kds8-bell');trigger.id='kdsBellV8';trigger.setAttribute('aria-label','Notifications');trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');trigger.innerHTML=bellSvg();
    const count=el('span','kds8-bell-count','0');count.setAttribute('aria-label','0 unread notifications');trigger.append(count);
    trigger.addEventListener('click',()=>notificationState.open?closeQuick(true):openQuick());
    host.prepend(trigger);createQuick();createFull();
  }
  function createQuick(){
    if($('kdsQuickNotifications'))return;
    const panel=el('section','kds8-island');panel.id='kdsQuickNotifications';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','false');panel.setAttribute('aria-labelledby','kdsQuickTitle');
    const head=el('div','kds8-island-head');const title=el('div');title.append(el('span','kds8-kicker','NOTIFICATIONS'),el('h2','', 'Recent activity'));title.querySelector('h2').id='kdsQuickTitle';
    const actions=el('div','kds8-island-actions');actions.append(button('View all','kds8-text-button',()=>openFull()),button('Close','kds8-icon-button',()=>closeQuick(true)));head.append(title,actions);
    const list=el('div','kds8-island-list');list.setAttribute('aria-live','polite');panel.append(head,list);document.body.append(panel);
  }
  function createFull(){
    if($('kdsNotificationCentre'))return;
    const dialog=el('dialog','kds8-notification-centre');dialog.id='kdsNotificationCentre';dialog.setAttribute('aria-labelledby','kdsCentreTitle');
    const head=el('header','kds8-centre-head');const copy=el('div');copy.append(el('span','kds8-kicker','WORKSPACE ACTIVITY'),el('h2','', 'Notification centre'));copy.querySelector('h2').id='kdsCentreTitle';
    const actions=el('div','kds8-centre-actions');actions.append(button('Mark all read','kds8-text-button',markAll),button('Close','kds8-icon-button',()=>KDS.modalClose(dialog)));head.append(copy,actions);
    const body=el('div','kds8-centre-body');body.setAttribute('aria-live','polite');dialog.append(head,body);document.body.append(dialog);
  }
  async function fetchNotifications(){
    notificationState.loading=true;notificationState.error='';renderNotifications();
    try{notificationState.rows=await request('/rest/v1/kds_notifications?select=id,kind,body,link,created_at,read_at&order=created_at.desc&limit=100')||[];}
    catch(error){notificationState.error=errorText(error);}finally{notificationState.loading=false;renderNotifications();}
  }
  function notificationRow(item,compact=false){
    const row=el('article','kds8-notification'+(item.read_at?'':' is-unread'));row.dataset.id=item.id;
    const dot=el('span','kds8-unread-dot');dot.setAttribute('aria-label',item.read_at?'Read':'Unread');
    const copy=el('div','kds8-notification-copy');copy.append(el('b','',item.kind||'Workspace update'),el('p','',item.body||'An update is available.'));
    const time=el('time','',fmt(item.created_at));if(item.created_at)time.dateTime=item.created_at;copy.append(time);row.append(dot,copy);
    const actions=el('div','kds8-notification-actions');
    const target=safeLink(item.link);if(target)actions.append(button('Open','kds8-row-action',async()=>{if(!item.read_at)await markOne(item.id);location.assign(target.href);}));
    if(!item.read_at)actions.append(button(compact?'Read':'Mark read','kds8-row-action',()=>markOne(item.id)));
    row.append(actions);return row;
  }
  function renderList(host,compact){
    host.replaceChildren();
    if(notificationState.loading){host.append(stateCard('Loading notifications…','loading'));return;}
    if(notificationState.error){const card=stateCard(notificationState.error,'error');card.append(button('Try again','kds8-row-action',fetchNotifications));host.append(card);return;}
    const visible=visibleNotifications(),rows=compact?visible.slice(0,4):visible;
    if(!rows.length){host.append(stateCard(notificationState.rows.length?'No notifications match your current preferences. You can change them in workspace settings.':'You are up to date. New project activity will appear here.','empty'));return;}
    rows.forEach(item=>host.append(notificationRow(item,compact)));
  }
  function stateCard(text,kind){const node=el('div','kds8-state is-'+kind);node.append(el('span','kds8-state-mark',kind==='loading'?'':'✓'),el('p','',text));return node;}
  function renderNotifications(){
    const unread=visibleNotifications().filter(row=>!row.read_at).length,count=document.querySelector('#kdsBellV8 .kds8-bell-count');
    if(count){count.textContent=unread>99?'99+':String(unread);count.classList.toggle('is-visible',unread>0);count.setAttribute('aria-label',unread+' unread notification'+(unread===1?'':'s'));}
    const bell=$('kdsBellV8');if(bell)bell.classList.toggle('has-unread',unread>0);
    const quick=$('kdsQuickNotifications')?.querySelector('.kds8-island-list');if(quick)renderList(quick,true);
    const full=$('kdsNotificationCentre')?.querySelector('.kds8-centre-body');if(full)renderList(full,false);
  }
  function placeQuick(){const trigger=$('kdsBellV8'),panel=$('kdsQuickNotifications');if(!trigger||!panel)return;const rect=trigger.getBoundingClientRect(),gap=10;panel.style.setProperty('--bell-x',Math.round(rect.left+rect.width/2)+'px');panel.style.top=Math.min(innerHeight-panel.offsetHeight-gap,rect.bottom+gap)+'px';panel.style.right=Math.max(10,innerWidth-rect.right)+'px';}
  async function openQuick(){
    const panel=$('kdsQuickNotifications'),bell=$('kdsBellV8');if(!panel||!bell)return;notificationState.open=true;bell.setAttribute('aria-expanded','true');bell.classList.add('is-active');panel.hidden=false;placeQuick();requestAnimationFrame(()=>panel.classList.add('is-open'));await fetchNotifications();panel.querySelector('button')?.focus({preventScroll:true});
  }
  function closeQuick(returnFocus=false){const panel=$('kdsQuickNotifications'),bell=$('kdsBellV8');if(!panel||panel.hidden)return;notificationState.open=false;bell?.setAttribute('aria-expanded','false');bell?.classList.remove('is-active');panel.classList.remove('is-open');setTimeout(()=>{if(!notificationState.open)panel.hidden=true;},reduced()?0:220);if(returnFocus)bell?.focus({preventScroll:true});}
  async function openFull(){closeQuick(false);await fetchNotifications();const dialog=$('kdsNotificationCentre');if(dialog)KDS.modalOpen(dialog);}
  async function markOne(id){try{await rpc('kds_mark_notifications_read',{p_ids:[id]});const item=notificationState.rows.find(row=>row.id===id);if(item)item.read_at=new Date().toISOString();renderNotifications();}catch(error){announce(errorText(error));}}
  async function markAll(){try{await rpc('kds_mark_notifications_read',{p_ids:null});notificationState.rows.forEach(row=>row.read_at=row.read_at||new Date().toISOString());renderNotifications();}catch(error){announce(errorText(error));}}

  /* Persisted role settings */
  function profileFallback(){const metadata=identity()?.metadata||{};return{first_name:String(metadata.first_name||metadata.name||'').trim().split(/\s+/)[0]||'',surname:String(metadata.surname||'').trim(),phone:String(metadata.phone||''),business_name:'',project_contact:'',skills:[],availability:'',preferences:{}};}
  async function loadProfile(){profileState.error='';try{const rows=await request('/rest/v1/kds_profiles?select=first_name,surname,phone,business_name,project_contact,skills,availability,preferences&user_id=eq.'+encodeURIComponent(identity().id)+'&limit=1');profileState.profile=Array.isArray(rows)&&rows[0]?rows[0]:profileFallback();}catch(error){profileState.profile=profileFallback();profileState.error=/kds_profiles|schema cache|PGRST/i.test(errorText(error))?'Apply production-v8.sql to enable saved workspace settings.':errorText(error);}applyDisplayPreference();}
  function applyDisplayPreference(){const density=profileState.profile?.preferences?.display_density==='compact'?'compact':'comfortable';document.body.classList.toggle('kds8-compact',density==='compact');}
  function field(labelText,name,type='text',autocomplete=''){const wrap=el('label','kds8-setting-field');wrap.append(el('span','',labelText));const input=el('input');input.name=name;input.type=type;if(autocomplete)input.autocomplete=autocomplete;wrap.append(input);return wrap;}
  function checkbox(labelText,value){const wrap=el('label','kds8-setting-check');const input=el('input');input.type='checkbox';input.name='notification_category';input.value=value;wrap.append(input,el('span','',labelText));return wrap;}
  function settingsTarget(){if(portal()==='admin')return $('v-settings');if(portal()==='developer')return document.querySelector('.dev-shell');return $('profileFirstName')?.closest('.pane-card')||$('portal-main');}
  function installSettingsShortcut(section){if(portal()!=='developer'||$('kdsSettingsShortcut'))return;const host=notificationHost(),control=button('Settings','tbtn');control.id='kdsSettingsShortcut';control.addEventListener('click',()=>{section.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'start'});section.querySelector('input')?.focus({preventScroll:true});});host?.append(control);}
  function mountProfileSettings(){if($('kdsProfileSettingsV8'))return;document.querySelectorAll('#kdsProfileExtra').forEach(node=>node.remove());const target=settingsTarget();if(!target)return;const section=el('section','kds8-profile-settings');section.id='kdsProfileSettingsV8';section.tabIndex=-1;const heading=el('div','kds8-settings-head');heading.append(el('span','kds8-kicker','ACCOUNT & WORKSPACE'),el('h3','',portal()==='admin'?'Owner profile':'Profile and preferences'),el('p','',portal()==='developer'?'Keep your details, skills and availability current.':'Update the details used in your workspace.'));
    const form=el('form','kds8-settings-form');const grid=el('div','kds8-settings-grid');const first=field('First name','first_name','text','given-name'),surname=field('Surname','surname','text','family-name'),phone=field('Phone','phone','tel','tel');first.querySelector('input').required=true;surname.querySelector('input').required=true;grid.append(first,surname,phone);
    if(portal()==='client')grid.append(field('Business name','business_name','text','organization'),field('Project contact','project_contact','text','name'));
    if(portal()==='developer')grid.append(field('Skills, separated by commas','skills','text'),field('Availability','availability','text'));
    const preferences=el('fieldset','kds8-settings-preferences');preferences.append(el('legend','','In-app notifications'));const choices=el('div','kds8-setting-checks');choices.append(checkbox('Project messages','messages'),checkbox('Project updates','projects'));if(portal()!=='client')choices.append(checkbox('Assignments','assignments'));choices.append(checkbox('Agreements and approvals','agreements'));preferences.append(choices,el('p','kds8-setting-note','These choices control which persisted events appear in this workspace. Account and security notices remain available through the authentication provider.'));
    const density=el('label','kds8-setting-field');density.append(el('span','','Display density'));const select=el('select');select.name='display_density';for(const [value,label] of [['comfortable','Comfortable'],['compact','Compact']]){const option=el('option','',label);option.value=value;select.append(option);}density.append(select);
    const footer=el('div','kds8-settings-actions'),status=el('p','kds8-settings-status');status.setAttribute('role','status');const submit=button('Save profile and preferences','btn blu');submit.type='submit';footer.append(submit,status);form.append(grid,preferences,density,footer);section.append(heading,form);
    const current=profileState.profile||profileFallback();for(const name of ['first_name','surname','phone','business_name','project_contact','availability']){const input=form.elements[name];if(input)input.value=current[name]||'';}if(form.elements.skills)form.elements.skills.value=Array.isArray(current.skills)?current.skills.join(', '):'';select.value=current.preferences?.display_density==='compact'?'compact':'comfortable';const selected=Array.isArray(current.preferences?.notification_categories)?current.preferences.notification_categories:['messages','projects','assignments','agreements'];form.querySelectorAll('[name="notification_category"]').forEach(input=>input.checked=selected.includes(input.value));
    if(portal()==='client'){const anchor=$('profileFirstName');target.insertBefore(section,anchor?.closest('.fld')||target.firstChild);if($('accPhone'))$('accPhone').value=current.phone||'';for(const id of ['profileFirstName','profileSurname','accPhone'])$(id)?.closest('.fld')?.setAttribute('hidden','');const security=[...target.querySelectorAll('button')].find(node=>/save changes/i.test(node.textContent));if(security){security.textContent='Update password';const password=$('accPass')?.closest('.fld');if(password)password.querySelector('label').textContent='Change password (at least 12 characters)';}}else target.append(section);installSettingsShortcut(section);
    if(profileState.error){status.textContent=profileState.error;status.dataset.kind='error';}
    form.addEventListener('submit',async event=>{event.preventDefault();if(!form.reportValidity())return;submit.disabled=true;submit.setAttribute('aria-busy','true');status.textContent='Saving…';status.dataset.kind='';const categories=[...form.querySelectorAll('[name="notification_category"]:checked')].map(input=>input.value);const previous=profileState.profile?.preferences||{};const payload={p_first_name:form.elements.first_name.value.trim(),p_surname:form.elements.surname.value.trim(),p_phone:form.elements.phone.value.trim(),p_business_name:form.elements.business_name?.value.trim()||'',p_project_contact:form.elements.project_contact?.value.trim()||'',p_skills:form.elements.skills?.value.split(',').map(value=>value.trim()).filter(Boolean)||[],p_availability:form.elements.availability?.value.trim()||'',p_preferences:{...previous,notification_categories:categories,display_density:select.value}};try{const saved=unwrap(await rpc('kds_save_my_profile',payload));profileState.profile=saved||{...profileFallback(),first_name:payload.p_first_name,surname:payload.p_surname,phone:payload.p_phone,business_name:payload.p_business_name,project_contact:payload.p_project_contact,skills:payload.p_skills,availability:payload.p_availability,preferences:payload.p_preferences};profileState.profile.preferences=payload.p_preferences;const metadata=identity()?.metadata||{};await api().updateProfile({...metadata,first_name:payload.p_first_name,surname:payload.p_surname,name:[payload.p_first_name,payload.p_surname].filter(Boolean).join(' '),phone:payload.p_phone});if($('accPhone'))$('accPhone').value=payload.p_phone;applyDisplayPreference();removeDuplicateGreetings();renderNotifications();status.textContent='Profile and preferences saved.';status.dataset.kind='success';profileState.error='';}catch(error){status.textContent=errorText(error);status.dataset.kind='error';}finally{submit.disabled=false;submit.removeAttribute('aria-busy');}});
  }

  /* Project conversations */
  const chatState={conversations:[],selected:'',messages:[],loading:false,error:'',poll:null,subscription:null};
  async function listConversations(){
    try{const rows=await rpc('kds_list_project_conversations');if(Array.isArray(rows))return rows;}
    catch(error){if(!['PGRST202','42883'].includes(error?.code)&&!/function|schema cache/i.test(error?.message||''))throw error;}
    const rows=await request('/rest/v1/kds_project_messages?select=project_id,body,sender_name,created_at&order=created_at.desc&limit=500')||[],groups=new Map();
    rows.forEach(row=>{if(!groups.has(row.project_id))groups.set(row.project_id,{project_id:row.project_id,project_label:row.project_id,latest_body:row.body,latest_at:row.created_at,unread_count:0,participant_names:row.sender_name});});return [...groups.values()];
  }
  async function listMessages(projectId){
    try{const rows=await rpc('kds_list_project_messages',{p_project_id:projectId});if(Array.isArray(rows))return rows;}
    catch(error){if(!['PGRST202','42883'].includes(error?.code)&&!/function|schema cache/i.test(error?.message||''))throw error;}
    return await request('/rest/v1/kds_project_messages?select=id,project_id,sender_id,sender_name,body,created_at,read_at&project_id=eq.'+encodeURIComponent(projectId)+'&order=created_at.asc')||[];
  }
  async function markConversation(projectId){try{await rpc('kds_mark_project_messages_read',{p_project_id:projectId});}catch(_){}
  }
  function removeRevisionSevenChat(){document.querySelectorAll('#kdsProjectMessages,#v-community').forEach(node=>node.remove());document.querySelectorAll('#nav a[data-v="community"]').forEach(node=>node.remove());}
  function installAdminCommunity(){
    if(portal()!=='admin'||$('v-community'))return;removeRevisionSevenChat();
    const nav=$('nav'),link=document.createElement('a');link.dataset.v='community';link.href='#community';link.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3z"/></svg>Community Chat<span class="cnt" id="kdsChatCount">0</span>';
    const settings=nav?.querySelector('[data-v="settings"]');nav?.insertBefore(link,settings||null);
    const view=el('section','view kds8-community');view.id='v-community';view.innerHTML='<div class="v-head"><div><span class="portal-eyebrow">PROJECT CONVERSATIONS</span><h2>Community Chat</h2><p>Conversations between clients and their assigned developers, with studio oversight.</p></div></div><div class="kds8-chat-shell"><aside class="kds8-conversations" aria-label="Project conversations"><div class="kds8-chat-search"><label for="kdsConversationSearch">Find a conversation</label><input id="kdsConversationSearch" type="search" autocomplete="off" placeholder="Project or participant"></div><div class="kds8-conversation-list" role="list"></div></aside><section class="kds8-thread-panel"><div class="kds8-thread-empty"><b>Choose a project conversation.</b><span>Messages and participants will appear here.</span></div></section></div>';
    $('portal-main')?.append(view);$('kdsConversationSearch').addEventListener('input',renderConversationList);link.addEventListener('click',()=>{setTimeout(loadCommunity,0);});
  }
  function conversationButton(item){
    const btn=button('','kds8-conversation',()=>selectConversation(item.project_id));btn.setAttribute('role','listitem');btn.dataset.projectId=item.project_id;btn.classList.toggle('is-selected',item.project_id===chatState.selected);
    const top=el('span','kds8-conversation-top');top.append(el('b','',item.project_label||'Project conversation'),el('time','',fmt(item.latest_at)));const bottom=el('span','kds8-conversation-bottom');bottom.append(el('span','',item.latest_body||'No messages yet.'));
    if(Number(item.unread_count)>0)bottom.append(el('i','kds8-chat-badge',item.unread_count));btn.append(top,bottom);return btn;
  }
  function renderConversationList(){
    const host=document.querySelector('.kds8-conversation-list');if(!host)return;host.replaceChildren();const query=($('kdsConversationSearch')?.value||'').trim().toLowerCase();const rows=chatState.conversations.filter(row=>(String(row.project_label||'')+' '+String(row.participant_names||'')).toLowerCase().includes(query));
    if(chatState.loading){host.append(stateCard('Loading conversations…','loading'));return;}if(chatState.error){host.append(stateCard(chatState.error,'error'));return;}if(!rows.length){host.append(stateCard(query?'No conversations match your search.':'No project conversations yet.','empty'));return;}rows.forEach(item=>host.append(conversationButton(item)));
    const total=chatState.conversations.reduce((sum,row)=>sum+Number(row.unread_count||0),0),count=$('kdsChatCount');if(count){count.textContent=String(total);count.hidden=!total;}
  }
  async function loadCommunity(){chatState.loading=true;chatState.error='';renderConversationList();try{chatState.conversations=await listConversations();if(chatState.selected&&!chatState.conversations.some(row=>row.project_id===chatState.selected))chatState.selected='';renderConversationList();if(chatState.selected)await selectConversation(chatState.selected,false);}catch(error){chatState.error=errorText(error);renderConversationList();}finally{chatState.loading=false;renderConversationList();}}
  async function selectConversation(projectId,focus=true){chatState.selected=projectId;renderConversationList();const info=chatState.conversations.find(row=>row.project_id===projectId)||{project_id:projectId,project_label:projectId};await renderThread(document.querySelector('.kds8-thread-panel'),info,focus);}
  async function renderThread(host,conversation,focus=true){
    if(!host)return;host.replaceChildren(stateCard('Loading messages…','loading'));try{chatState.messages=await listMessages(conversation.project_id);host.replaceChildren();
      const header=el('header','kds8-thread-head');const title=el('div');title.append(el('span','kds8-kicker',portal()==='admin'?'COMMUNITY CHAT':'PROJECT MESSAGES'),el('h3','',conversation.project_label||'Project conversation'));const meta=el('p','',conversation.participant_names?'Participants: '+conversation.participant_names:'The studio owner can review this project conversation.');title.append(meta);header.append(title);host.append(header);
      const timeline=el('div','kds8-message-list');timeline.setAttribute('role','log');timeline.setAttribute('aria-live','polite');if(!chatState.messages.length)timeline.append(stateCard('No messages yet. Start the project conversation when you are ready.','empty'));else chatState.messages.forEach(message=>timeline.append(messageCard(message)));host.append(timeline,composer(conversation.project_id,()=>renderThread(host,conversation,false)));timeline.scrollTop=timeline.scrollHeight;markConversation(conversation.project_id);if(focus)header.querySelector('h3').tabIndex=-1,header.querySelector('h3').focus({preventScroll:true});
    }catch(error){host.replaceChildren(stateCard('Messages could not load. '+errorText(error),'error'));host.append(button('Try again','kds8-row-action',()=>renderThread(host,conversation)));}}
  function messageCard(message){const mine=message.is_own===true||message.sender_id===identity()?.id,row=el('article','kds8-message'+(mine?' is-own':''));const head=el('div','kds8-message-head');const sender=[message.sender_name||'Workspace member',message.sender_role].filter(Boolean).join(' · ');head.append(el('b','',sender),el('time','',fmt(message.created_at)));const body=el('p','',message.body||'');row.append(head,body);return row;}
  function composer(projectId,afterSend){
    const form=el('form','kds8-composer');const label=el('label','','New message');label.htmlFor='kdsMessage_'+projectId;const area=el('textarea');area.id='kdsMessage_'+projectId;area.name='message';area.maxLength=5000;area.required=true;area.placeholder='Write a project message…';const footer=el('div','kds8-composer-foot');const status=el('p','kds8-send-status');status.setAttribute('role','status');const submit=button('Send message','btn blu');submit.type='submit';footer.append(status,submit);form.append(label,area,footer);
    area.addEventListener('input',()=>{if(form.dataset.failed){delete form.dataset.failed;submit.textContent='Send message';status.textContent='';}});
    form.addEventListener('submit',async event=>{event.preventDefault();const body=area.value.trim();if(!body)return;submit.disabled=true;submit.setAttribute('aria-busy','true');status.textContent='Sending…';try{await rpc('kds_send_project_message',{p_project_id:projectId,p_body:body});area.value='';delete form.dataset.failed;status.textContent='Message sent.';submit.textContent='Send message';await afterSend();fetchNotifications().catch(()=>{});}catch(error){form.dataset.failed='true';status.textContent=errorText(error)+' Your message is still here.';submit.textContent='Retry send';}finally{submit.disabled=false;submit.removeAttribute('aria-busy');}});return form;
  }
  async function mountProjectThread(projectId,label,target){
    if(!projectId)return;document.querySelectorAll('#kdsProjectMessages,.kds8-project-chat').forEach(node=>node.remove());const card=el('section','pane-card kds8-project-chat');card.dataset.projectId=projectId;(target||document.querySelector('.dev-shell')||$('portal-main'))?.append(card);await renderThread(card,{project_id:projectId,project_label:label||'Project conversation'},false);
  }
  function installRoleChat(){
    window.KDSProjectMessages={mount:(projectId,label)=>mountProjectThread(projectId,label,$('developerJobDetail')||document.querySelector('.dev-shell'))};
    if(portal()==='client'){const picker=$('projectPicker'),id=picker?.value||picker?.options?.[0]?.value;if(id)mountProjectThread(id,picker?.selectedOptions?.[0]?.textContent||'Project conversation',document.querySelector('#portal-main'));picker?.addEventListener('change',()=>mountProjectThread(picker.value,picker.selectedOptions[0]?.textContent,document.querySelector('#portal-main')));}
  }
  function subscribeOrPoll(){
    const refresh=()=>{if(document.hidden)return;fetchNotifications();if(portal()==='admin'&&$('v-community')?.classList.contains('on'))loadCommunity();else if(chatState.selected)selectConversation(chatState.selected,false);};
    if(typeof api()?.subscribe==='function'){
      for(const table of ['kds_notifications','kds_project_messages']){try{const stop=api().subscribe(table,{},refresh);if(typeof stop==='function')subscriptions.add(stop);}catch(_){}}
    }
    const timer=setInterval(refresh,20000);timers.add(timer);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  }

  function removeDuplicateGreetings(){
    const me=identity(),metadata=me?.metadata||{},first=String(profileState.profile?.first_name||metadata.first_name||metadata.name||'').trim().split(/\s+/)[0];
    if(portal()==='developer'){
      const head=document.querySelector('.dev-header h1');if(head&&!head.dataset.greetingFixed){head.replaceChildren(document.createTextNode(first?'Hello, ': 'Hello.'));if(first)head.append(el('span','',first+'.'));head.dataset.greetingFixed='true';}
      const secondary=$('developerWelcomeTitle');if(secondary&&secondary.textContent!=='Your assigned work')secondary.textContent='Your assigned work';
    }
    if(portal()==='client'&&$('greet')&&!$('greet').dataset.greetingFixed){$('greet').replaceChildren(document.createTextNode(first?'Hello, ':'Hello.'));if(first)$('greet').append(el('em','',first+'.'));$('greet').dataset.greetingFixed='true';}
  }
  function observeGreetings(){removeDuplicateGreetings();if(portal()!=='developer')return;const observer=new MutationObserver(removeDuplicateGreetings);observer.observe(document.querySelector('.dev-shell')||document.body,{childList:true,subtree:true});setTimeout(()=>observer.disconnect(),10000);}
  function ownerAvatar(){
    if(portal()!=='admin')return;const avatar=document.querySelector('.a-av');if(!avatar)return;avatar.textContent='KD';avatar.setAttribute('aria-label','Khanya Ngema profile');const raw=identity()?.metadata?.avatar_url;try{const url=new URL(raw);if(url.protocol==='https:'){const image=new Image();image.alt='Khanya Ngema';image.src=url.href;avatar.replaceChildren(image);}}catch(_){}
  }
  async function ready(){
    if(portal()==='public'||!api()?.identity?.())return;removeRevisionSevenNotifications();removeRevisionSevenChat();await loadProfile();installBell();installAdminCommunity();installRoleChat();mountProfileSettings();observeGreetings();ownerAvatar();await fetchNotifications();if(portal()==='admin')await loadCommunity();subscribeOrPoll();
  }
  document.addEventListener('pointerdown',event=>{const panel=$('kdsQuickNotifications'),bell=$('kdsBellV8');if(notificationState.open&&panel&&!panel.contains(event.target)&&!bell?.contains(event.target))closeQuick(false);});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&notificationState.open){event.preventDefault();closeQuick(true);}});
  addEventListener('resize',()=>{if(notificationState.open)placeQuick();},{passive:true});
  addEventListener('pagehide',()=>{timers.forEach(clearInterval);subscriptions.forEach(stop=>{try{stop();}catch(_){}});},{once:true});
  addEventListener('kds:ready',ready);
  if(document.documentElement.dataset.authState==='ready')ready();
})();
