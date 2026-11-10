/* ══════════════════════════════════════════════════════════════════
   KINETIC — the studio's shared motion engine.
   One observer, one rAF loop, one pointer listener. Nothing per-element.
   ══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var K = (window.Kinetic = {});

  /* ── 1 · reveal on scroll ─────────────────────────────────────── */
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  K.scan = function (root) {
    (root || document).querySelectorAll('.k,[data-rev],[data-stag],.beam,[data-count]')
      .forEach(function (el) { if (!el.classList.contains('in')) io.observe(el); });
  };

  /* ── 2 · number counters ──────────────────────────────────────── */
  var cio = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      cio.unobserve(e.target);
      count(e.target);
    });
  }, { threshold: 0.5 });

  function count(el) {
    var to = parseFloat(el.dataset.count) || 0, dec = (el.dataset.dec | 0),
        pre = el.dataset.pre || '', suf = el.dataset.suf || '', t0 = 0, dur = 1500;
    if (RM) { el.textContent = pre + to.toFixed(dec) + suf; return; }
    function frame(t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 4), v = to * e;
      el.textContent = pre + (dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US')) + suf;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  K.counters = function (root) {
    (root || document).querySelectorAll('[data-count]').forEach(function (el) { cio.observe(el); });
  };

  /* ── 3 · split a heading into per-word kinetic lines ──────────── */
  K.split = function (el) {
    if (el.dataset.split) return;
    el.dataset.split = '1';
    var html = el.innerHTML.split(/<br\s*\/?>/i).map(function (line) {
      return '<span class="k"><span>' + line + '</span></span>';
    }).join('');
    el.innerHTML = html;
    el.querySelectorAll('.k').forEach(function (m, i) {
      m.querySelector('span').style.transitionDelay = (i * 0.09) + 's';
      io.observe(m);
    });
  };

  /* ── 4 · magnetic pull on buttons + tilt on cards (one listener) ─ */
  var mags = [], tilts = [], px = 0, py = 0, raf = 0;
  K.magnet = function (root) {
    (root || document).querySelectorAll('[data-mag]').forEach(function (el) {
      if (mags.indexOf(el) < 0) mags.push(el);
    });
    (root || document).querySelectorAll('.tilt').forEach(function (el) {
      if (tilts.indexOf(el) < 0) tilts.push(el);
    });
  };

  if (!RM && !matchMedia('(pointer: coarse)').matches) {
    addEventListener('pointermove', function (e) {
      px = e.clientX; py = e.clientY;
      if (!raf) raf = requestAnimationFrame(pointerLoop);
    }, { passive: true });
  }

  function pointerLoop() {
    raf = 0;
    mags.forEach(function (el) {
      var r = el.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy), reach = Math.max(r.width, 120);
      if (d < reach) {
        var f = (1 - d / reach) * 0.34;
        el.style.transform = 'translate(' + dx * f + 'px,' + dy * f + 'px)';
      } else if (el.style.transform) { el.style.transform = ''; }
    });
    tilts.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (px < r.left || px > r.right || py < r.top || py > r.bottom) {
        if (el.dataset.t) { el.style.transform = ''; el.dataset.t = ''; }
        return;
      }
      var rx = ((py - r.top) / r.height - 0.5) * -7;
      var ry = ((px - r.left) / r.width - 0.5) * 9;
      el.style.transform = 'perspective(900px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateZ(6px)';
      el.dataset.t = '1';
      el.style.setProperty('--mx', ((px - r.left) / r.width * 100) + '%');
      el.style.setProperty('--my', ((py - r.top) / r.height * 100) + '%');
    });
  }

  /* ── 5 · the light field — canvas grid that brightens near cursor ─ */
  K.lightField = function (canvas) {
    if (!canvas || RM) return;
    var ctx = canvas.getContext('2d'), dots = [], w = 0, h = 0, mx = -999, my = -999, t = 0;
    var host = canvas.parentElement;

    function build() {
      var dpr = Math.min(devicePixelRatio || 1, 2);
      w = host.offsetWidth; h = host.offsetHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots = [];
      var gap = w < 700 ? 46 : 38;
      for (var x = gap / 2; x < w; x += gap)
        for (var y = gap / 2; y < h; y += gap)
          dots.push({ x: x, y: y, p: Math.random() * 6.283, s: 0.4 + Math.random() * 0.6 });
    }

    function draw() {
      t += 0.012;
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        var dist = Math.hypot(d.x - mx, d.y - my);
        var near = Math.max(0, 1 - dist / 220);
        var breathe = 0.5 + 0.5 * Math.sin(t * d.s + d.p);
        var a = 0.06 + breathe * 0.05 + near * near * 0.75;
        var r = 1 + near * 2.1;
        ctx.beginPath();
        ctx.arc(d.x, d.y, r, 0, 6.283);
        if (near > 0.12) {
          ctx.fillStyle = 'rgba(255,182,56,' + (a * (0.35 + near)) + ')';
          ctx.shadowBlur = 12 * near; ctx.shadowColor = 'rgba(255,182,56,.7)';
        } else {
          ctx.fillStyle = 'rgba(125,180,255,' + a + ')';
          ctx.shadowBlur = 0;
        }
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      requestAnimationFrame(draw);
    }

    addEventListener('resize', build, { passive: true });
    addEventListener('load', build);
    if (window.ResizeObserver) new ResizeObserver(build).observe(host);
    host.addEventListener('pointermove', function (e) {
      var r = host.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top;
    }, { passive: true });
    host.addEventListener('pointerleave', function () { mx = my = -999; });
    build(); draw();
  };

  /* ── 6 · scroll progress + parallax drift (single scroll handler) ─ */
  var sTicking = false;
  function onScroll() {
    if (sTicking) return; sTicking = true;
    requestAnimationFrame(function () {
      sTicking = false;
      var y = scrollY;
      var max = document.documentElement.scrollHeight - innerHeight;
      var p = max > 0 ? y / max : 0;
      var bar = document.getElementById('scrollBar');
      if (bar) bar.style.transform = 'scaleX(' + p + ')';
      var pct = document.getElementById('scrollPct');
      if (pct) pct.textContent = String(Math.round(p * 100)).padStart(2, '0');
      var nav = document.getElementById('nav');
      if (nav) nav.classList.toggle('solid', y > 24);
      if (!RM) {
        document.querySelectorAll('[data-par]').forEach(function (el) {
          var r = el.getBoundingClientRect();
          if (r.bottom < -200 || r.top > innerHeight + 200) return;
          var mid = r.top + r.height / 2 - innerHeight / 2;
          el.style.transform = 'translate3d(0,' + (mid * (parseFloat(el.dataset.par) || 0.06) * -1) + 'px,0)';
        });
      }
    });
  }
  addEventListener('scroll', onScroll, { passive: true });

  /* ── 7 · boot ─────────────────────────────────────────────────── */
  K.boot = function (root) {
    K.scan(root); K.counters(root); K.magnet(root);
    (root || document).querySelectorAll('[data-splitline]').forEach(K.split);
    onScroll();
  };
  K.reduced = RM;

  if (document.readyState === 'loading')

document.addEventListener('DOMContentLoaded', function () { K.boot(); });
  else K.boot();
})();

window.KDS={config:Object.assign({supabaseUrl:'',supabaseAnonKey:'',enquiryEndpoint:''},window.KDS_CONFIG||{}),demo:false};
/* Shared scroll and modal ownership prevents nested dialogs leaving the page locked. */
KDS.lockReasons=new Set();KDS.lockScroll=function(reason){if(!KDS.lockReasons.size)KDS.previousOverflow=document.body.style.overflow;KDS.lockReasons.add(reason);document.body.style.overflow='hidden';};
KDS.unlockScroll=function(reason){KDS.lockReasons.delete(reason);if(!KDS.lockReasons.size)document.body.style.overflow=KDS.previousOverflow||'';};
KDS.modalOpen=function(dialog){if(dialog.open){dialog.querySelector('button,input,a[href]')?.focus();return;}dialog._returnFocus=document.activeElement;KDS.lockScroll(dialog);dialog.showModal();requestAnimationFrame(()=>{if(dialog.open)dialog.classList.add('modal-visible');});if(!dialog._modalManaged){dialog._modalManaged=true;dialog.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const controls=[...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),a[href],select:not([disabled])')].filter(el=>!el.hidden);if(!controls.length)return;const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});dialog.addEventListener('cancel',e=>{if(e.defaultPrevented)return;e.preventDefault();KDS.modalClose(dialog);});dialog.addEventListener('close',()=>{dialog.classList.remove('modal-visible');KDS.unlockScroll(dialog);if(dialog._returnFocus?.isConnected&&!dialog._returnFocus.closest('[hidden],.gone'))dialog._returnFocus.focus();else{const fallback=document.querySelector('.site-legal a[href="#cookies"]');if(fallback)fallback.focus();}});}};
KDS.modalClose=function(dialog){dialog.classList.remove('modal-visible');return new Promise(resolve=>setTimeout(()=>{if(dialog.open)dialog.close();resolve();},matchMedia('(prefers-reduced-motion: reduce)').matches?0:150));};
document.addEventListener('DOMContentLoaded',function(){KDS.start().catch(function(){document.documentElement.classList.remove('js');document.documentElement.dataset.authState='error';const message=document.getElementById('appLoadingText');if(message)message.textContent='The workspace could not initialise. Reload to try again.';});});
/* Shared platform integration. Configuration contains PUBLIC keys only. */
KDS.start = async function () {
  'use strict';
  KDS.runtimeStarted=true;
  const $ = id => document.getElementById(id);
  const isDeveloper=document.body.dataset.portal==='developer';
  const isAdmin=!!$('lock'),isClient=!isDeveloper&&!!$('auth'),portal=isAdmin||isClient||isDeveloper;
  const cfg = KDS.config;
  const sessionKey=isAdmin?'kds_owner_session':isDeveloper?'kds_developer_session':'kds_client_session';
  const initialRoute=location.hash.slice(1);
  function authState(state,message){if(!portal)return;document.documentElement.dataset.authState=state;const label=$('appLoadingText');if(label&&message)label.textContent=message;}
  // Sessions from the former shared key are intentionally not imported across roles.
  try{sessionStorage.removeItem('kds_session');}catch(_){}

  let configured=/^https:\/\//.test(cfg.supabaseUrl)&&!!cfg.supabaseAnonKey;try{const role=JSON.parse(atob((String(cfg.supabaseAnonKey).split('.')[1]||'').replace(/-/g,'+').replace(/_/g,'/')))?.role;if(role==='service_role')configured=false;}catch(_){}if(String(cfg.supabaseAnonKey).startsWith('sb_secret_'))configured=false;
  const notice = document.createElement('div'); notice.className = 'mode-banner';
  notice.textContent='';
  // Status is shown inline, rather than as a persistent connected-workspace strip.
  const notify = message => { if(typeof window.toast === 'function') window.toast(message); else notice.textContent=message; };
  document.querySelectorAll('input,textarea').forEach(el => {if(!el.maxLength || el.maxLength<0)el.maxLength=el.tagName==='TEXTAREA'?5000:254;});
  document.querySelectorAll('label').forEach((label,i)=>{if(label.querySelector('input'))return;const input=label.parentElement.querySelector('input,textarea,select');if(input){if(!input.id)input.id='field-'+i;label.htmlFor=input.id;}});
  document.querySelectorAll('a:not([href])').forEach(el=>{el.tabIndex=0;el.setAttribute('role','button');el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();el.click();}});});
  if($('toast')){$('toast').setAttribute('role','status');$('toast').setAttribute('aria-live','polite');}
  document.querySelectorAll('.lk-err,#auErr').forEach(el=>el.setAttribute('role','alert'));
  document.querySelectorAll('.lk-hint,.au-hint').forEach(el=>{el.textContent=isAdmin?'Use your studio-owner account and authenticator.':'Login to an existing account, or choose Get started to create a workspace.';});
  const policyKeys=['privacy','terms','cookies','storage'];
  const showPolicy=name=>window.StudioPrivacy?.showNotice(name==='cookies'?'storage':name);
  if(!portal){
    const pages=['home','services','work','studio','contact'];
    let historyNavigation=false;
    const baseGo=window.go;
    window.go=function(name,keep){if(policyKeys.includes(name)){if(name==='cookies')window.StudioPrivacy?.manage();else showPolicy(name);return;}if(!pages.includes(name))name='home';if(!historyNavigation&&location.hash!=='#'+name)history.pushState(null,'','#'+name);baseGo(name,keep);const page=$('page-'+name);if(page){page.tabIndex=-1;page.focus({preventScroll:true});}window.dispatchEvent(new CustomEvent('kds:route',{detail:{name}}));};
    addEventListener('popstate',()=>{historyNavigation=true;window.go(location.hash.slice(1)||'home');historyNavigation=false;});
    addEventListener('hashchange',()=>{const name=location.hash.slice(1);if(pages.includes(name)){historyNavigation=true;window.go(name);historyNavigation=false;}});
    window.menu=function(force){const panel=$('panel'),burger=$('burger');const open=force===undefined?!panel.classList.contains('on'):force;panel.classList.toggle('on',open);$('scrim').classList.toggle('on',open);burger.classList.toggle('x',open);burger.setAttribute('aria-expanded',String(open));burger.setAttribute('aria-label',open?'Close navigation':'Open navigation');panel.inert=!open;document.body.classList.toggle('menu-open',open);if(open){KDS.lockScroll('menu');panel.querySelector('a')?.focus();}else{KDS.unlockScroll('menu');if(panel.contains(document.activeElement))burger.focus();}};
    $('panel').inert=true;
    addEventListener('keydown',event=>{if(!$('panel').classList.contains('on'))return;if(event.key==='Escape'){window.menu(false);$('burger').focus();}if(event.key==='Tab'){const focusable=[$('burger'),...$('panel').querySelectorAll('a[href],a[role=button],button:not([disabled])')];const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
    window.soon=function(what){window.go('contact');const form=$('kf');form.elements.service.value='other';if(!form.elements.message.value)form.elements.message.value='Enquiry about a developing capability: '+what+'. ';form.elements.message.focus();};
    if(window.CW){CW.script['Can I see your work?']='Our Work page presents independent concepts and design explorations. Each is clearly labelled. Open Work to explore the studio’s direction.';CW.script['What does a site cost?']='We agree scope and pricing in a written proposal after discussing your needs. Share your goals and budget through the contact form.';CW.script['Talk to a human']='Email hello@khanyadigital.co.za or use the contact form. Studio hours: Monday to Friday, 08:00–18:00 SAST.';CW.script['I want to start a project']='Tell us about your project through the contact form. Opening it now.';}
const form=$('kf');
    if(form){
      const consent=document.createElement('div');consent.innerHTML='<p style="font-size:13px;margin:16px 0">Your details are used to respond to this enquiry. <a href="#privacy">Read the privacy notice</a>. Please do not include sensitive information.</p><label style="display:block;margin:12px 0"><input type="checkbox" name="consent" required> I agree to the processing of this enquiry.</label><label style="display:block;margin:12px 0"><input type="checkbox" name="marketing_opt_in"> Send me occasional studio updates (optional).</label><p role="alert" id="submitError" style="color:#972d20;margin:16px 0"></p>';
      form.insertBefore(consent,$('kfBtn'));
      let pending=false, last=0, lastPayload='', idempotency='';
      window.submitForm=async function(e){e.preventDefault();if(pending||!form.reportValidity())return false;if(form.elements.botcheck.checked)return false;
        const error=$('submitError');error.textContent='';if(Date.now()-last<10000){error.textContent='Please wait a moment before trying again.';return false;}
        if(!cfg.enquiryEndpoint){error.textContent='Online submissions are not configured yet. Please email hello@khanyadigital.co.za. Your enquiry has not been sent.';return false;}
        const data=Object.fromEntries(new FormData(form));data.consent=true;data.marketing_opt_in=form.elements.marketing_opt_in.checked;data.consent_version='2026-11-notice-v1';data.source='studio-site';delete data.botcheck;
        const payload=JSON.stringify(data);if(payload!==lastPayload){idempotency=crypto.randomUUID();lastPayload=payload;}pending=true;last=Date.now();const btn=$('kfBtn');btn.disabled=true;btn.textContent='Sending…';
        try{const response=await fetch(cfg.enquiryEndpoint,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':idempotency},body:payload,signal:AbortSignal.timeout(20000)});const result=await response.json();if(!response.ok||result.success!==true)throw Error('Submission not accepted');form.hidden=true;form.style.display='none';$('kfOk').classList.add('on');$('kfOkMsg').textContent='Your enquiry was accepted by the service. Email delivery has not been independently confirmed.';$('kfOk').setAttribute('role','status');}
        catch(_){error.textContent='We could not confirm acceptance. Your text is still here. Try again or email hello@khanyadigital.co.za.';}
        finally{pending=false;btn.disabled=false;btn.textContent='Send enquiry ↗';}return false;};
    }
    document.documentElement.dataset.authState='public';return;
  }
  if(isClient){const signupPane=$('p-up');if(signupPane){const disclosure=document.createElement('div');disclosure.innerHTML='<p style="font-size:12px;margin:12px 0">Account details are used for workspace access. Read the <a href="#privacy" id="signupPrivacy">privacy notice</a>.</p><label style="display:block;margin:12px 0"><input type="checkbox" id="suConsent"> I agree to account data processing.</label><label style="display:block;margin:12px 0"><input type="checkbox" id="suMarketing"> Send occasional studio updates (optional).</label>';signupPane.insertBefore(disclosure,signupPane.querySelector('button'));$('signupPrivacy').onclick=e=>{e.preventDefault();showPolicy('privacy');};}let selected='';const original=window.renderProject;window.renderProject=function(me){const all=window.load(K.projects,[]);if(!selected&&session?.user?.id){try{selected=sessionStorage.getItem('kds_client_project_'+session.user.id)||'';}catch(_){}}const mine=all.filter(p=>(p.email||'').toLowerCase()===me.email);if(!mine.some(p=>p.id===selected))selected=mine[0]?.id||'';let selector=$('projectPicker');if(!selector){selector=document.createElement('select');selector.id='projectPicker';selector.setAttribute('aria-label','Choose your project');selector.style.cssText='padding:12px;margin:12px 0;max-width:100%';$('projArea').before(selector);}selector.replaceChildren(...mine.map(p=>{const option=document.createElement('option');option.value=p.id;option.textContent=p.name;option.selected=p.id===selected;return option;}));selector.hidden=mine.length<2;selector.onchange=()=>{selected=selector.value;if(session?.user?.id){try{sessionStorage.setItem('kds_client_project_'+session.user.id,selected);}catch(_){}}window.renderProject(me);};const baseLoad=window.load;window.load=(key,fallback)=>key===K.projects?all.filter(p=>p.id===selected):baseLoad(key,fallback);try{original(me);}finally{window.load=baseLoad;}};}
  // Remote mode: data stays in memory; never import local demo records.
  let session=null, memory={}, writes=null, loading=false;
  const keys = isDeveloper?{}:isAdmin ? { [K.projects]:'projects',[K.leads]:'leads',[K.msgs]:'messages',[K.clients]:'profiles'} : {[K.projects]:'projects',[K.msgs]:'messages',[K.clients]:'profiles'};
  Object.keys(keys).forEach(k=>memory[k]=[]);
  window.load=(key,fallback)=>key===K.session?(session?.user?.email?{email:session.user.email,name:session.user.user_metadata?.name||'Client'}:fallback): key===K.auth?{email:session?.user?.email||''}:structuredClone(memory[key]??fallback);
  window.save=(key,value)=>{if(!writes)throw Error('No active write operation');if(!keys[key])throw Error('This setting is not available in remote mode');writes[key]=structuredClone(value);};
  const authError=(message,kind='error')=>{const target=$(isAdmin?'lkErr':'auErr');target.textContent=message;target.classList.toggle('on',!!message);target.dataset.kind=kind;target.setAttribute('role',kind==='error'?'alert':'status');};
  async function request(path,options={},auth=true){if(!configured)throw Error('Workspace connection has not been configured.');if(auth&&!session?.access_token)throw Error('Please sign in to continue.');const response=await fetch(cfg.supabaseUrl.replace(/\/$/,'')+path,{...options,headers:{apikey:cfg.supabaseAnonKey,...(auth&&session?{Authorization:'Bearer '+session.access_token}:{}),'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(20000)});let data=null;const text=await response.text();if(text){try{data=JSON.parse(text);}catch(_){throw Error('Unexpected server response');}}if(!response.ok){const code=data?.error_code||data?.code||data?.error||'';const messages={invalid_credentials:'Email or password was not accepted.',email_not_confirmed:'Sign-in could not be completed. Check your credentials or use account recovery.',mfa_verification_failed:'The authenticator code was not accepted.',mfa_totp_enroll_not_enabled:'Enable TOTP enrollment in Supabase Authentication settings.',mfa_totp_verify_not_enabled:'Enable TOTP verification in Supabase Authentication settings.',over_request_rate_limit:'Too many attempts. Wait a moment before retrying.',over_email_send_rate_limit:'Too many email requests. Wait before trying again.',PGRST205:'The kds_records table is missing or its API schema cache has not refreshed.', '42P01':'The required workspace table is missing.', '42501':'You do not have access to this action.', '23503':'This record has linked jobs. Keep it until those links are reviewed.',PGRST202:'The team functions are not installed yet. Run the team feature setup described in the guide.'};const rpcMessages=['Create or invite and confirm this colleague account in Supabase Authentication first','Owner accounts cannot be converted to developer accounts','Choose an existing project','Choose an active colleague','Check the job title and brief','Check the update fields','This job is closed for updates','This job is closed for uploads','This job is closed for sharing','Upload has not completed','Unsupported file type','Use a valid HTTPS link, label and visibility'];const rpcMessage=path.startsWith('/rest/v1/rpc/kds_')&&code==='P0001'&&rpcMessages.includes(data?.message)?data.message:null;const error=Error(rpcMessage||messages[code]||'The service could not complete this request. Check access and try again.');error.code=code;error.status=response.status;throw error;}return data;}
  const remember=()=>{try{sessionStorage.setItem(sessionKey,JSON.stringify(session));}catch(_){throw Error('Session storage is unavailable.');}};
  function claims(){try{return JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));}catch(_){return {};}}
  function mfaCode(enrollment, errorText='') {
    return new Promise(resolve=>{
      const modal=document.createElement('dialog');modal.className='legal-dialog';modal.setAttribute('aria-labelledby','mfaTitle');
      modal.innerHTML='<form><h2 id="mfaTitle"></h2><p class="mfa-instructions"></p><div class="mfa-setup"></div><label for="mfaCode">Six-digit authenticator code</label><input id="mfaCode" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" minlength="6" maxlength="6" required style="display:block;width:100%;padding:12px;margin:12px 0;color:#102037;background:#fff;border:1px solid #8998a7;border-radius:6px"><p role="alert" class="mfa-error" style="color:#972d20"></p><div style="display:flex;gap:12px"><button type="submit">Verify and continue</button><button type="button" class="mfa-cancel">Cancel</button></div></form>';
      modal.querySelector('h2').textContent=enrollment?'Set up admin two-factor authentication':'Verify your admin sign-in';
      modal.querySelector('.mfa-instructions').textContent=enrollment?'In Google Authenticator, Microsoft Authenticator or another authenticator, scan this QR code or enter the setup key. Then enter its current six-digit code below.':'Enter the current six-digit code from your authenticator app.';
      modal.querySelector('.mfa-error').textContent=errorText;
      if(enrollment){
        const setup=modal.querySelector('.mfa-setup');
        if(enrollment.qr_code){const image=document.createElement('img');image.alt='Scan to add your Khanya admin account to your authenticator';image.src=enrollment.qr_code.startsWith('data:image/')?enrollment.qr_code:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(enrollment.qr_code);image.style.cssText='width:220px;height:220px;max-width:100%;background:white;margin:16px 0';setup.append(image);}
        const label=document.createElement('p');label.textContent='Manual setup key (keep private):';const code=document.createElement('code');code.textContent=enrollment.secret;code.style.cssText='display:block;overflow-wrap:anywhere;background:#e4e9ef;padding:12px;color:#102037';setup.append(label,code);
      }
      let finished=false;function finish(code){if(finished)return;finished=true;KDS.modalClose(modal).then(()=>{modal.remove();resolve(code);});}
      modal.querySelector('form').onsubmit=e=>{e.preventDefault();const input=modal.querySelector('input');if(input.reportValidity())finish(input.value);};
      modal.querySelector('.mfa-cancel').onclick=()=>finish(null);modal.addEventListener('cancel',e=>{e.preventDefault();finish(null);});
      document.body.append(modal);KDS.modalOpen(modal);modal.querySelector('input').focus();
    });
  }
  async function validateSession(){
    const user=await request('/auth/v1/user');if(!user?.id||!user.email)throw Error('The authentication response was not valid.');const tokenSubject=claims().sub;if(tokenSubject&&tokenSubject!==user.id)throw Error('The authentication response did not match this account.');session.user=user;
    if(isAdmin){
      if(user.app_metadata?.role!=='admin')throw Error('This account does not have studio access. Assign the admin role using the trusted Supabase setup instructions.');
      if(claims().aal!=='aal2'){
        // GoTrue exposes enrolled factors on the authenticated user response.
        const factors=Array.isArray(user.factors)?user.factors:[];
        let factor=factors.find(f=>f.factor_type==='totp'&&f.status==='verified'),enrollment=null,created=false;
        try{
          if(!factor){
            // Remove abandoned, unverified TOTP setup attempts only.
            for(const pending of factors.filter(f=>f.factor_type==='totp'&&f.status==='unverified'))await request('/auth/v1/factors/'+encodeURIComponent(pending.id),{method:'DELETE'});
            const result=await request('/auth/v1/factors',{method:'POST',body:JSON.stringify({factor_type:'totp',friendly_name:'Khanya Studio Admin '+Date.now()})});
            if(!result?.id||!result.totp?.secret)throw Error('The service did not return a valid MFA setup. Check that TOTP enrollment is enabled in Supabase.');
            factor=result;enrollment=result.totp;created=true;
          }
          let lastError='';
          for(let attempt=0;attempt<3;attempt++){
            const code=await mfaCode(enrollment,lastError);if(code===null)throw Error('Admin sign-in cancelled. Two-factor verification is required.');
            const challenge=await request('/auth/v1/factors/'+encodeURIComponent(factor.id)+'/challenge',{method:'POST',body:JSON.stringify({})});
            let verified;
            try{verified=await request('/auth/v1/factors/'+encodeURIComponent(factor.id)+'/verify',{method:'POST',body:JSON.stringify({challenge_id:challenge.id,code})});}
            catch(e){if(e.code!=='mfa_verification_failed')throw e;lastError='That code was not accepted. Check the current code and your authenticator’s time settings.';continue;}
            session={...session,...verified};if(claims().aal!=='aal2')throw Error('MFA verification did not complete.');created=false;break;
          }
          if(claims().aal!=='aal2')throw Error('Two-factor verification failed. Sign in again to retry.');
        }finally{
          if(created&&factor?.id){try{await request('/auth/v1/factors/'+encodeURIComponent(factor.id),{method:'DELETE'});}catch(_) {}}
        }
      }
    }
    if(isDeveloper&&user.app_metadata?.role!=='developer'){const error=Error('This account does not have a developer workspace. Ask the studio owner to add your work account.');error.code='developer_route';throw error;}if(isClient&&user.app_metadata?.role==='developer'){const error=Error('This account uses developer.html. Open the developer portal to continue.');error.code='developer_route';throw error;}if(isClient&&user.app_metadata?.role==='admin'){const error=Error('This account uses the studio owner console. Open admin.html to continue.');error.code='owner_route';throw error;}remember();
  }
  function safeRecord(row){const d=row.data;if(!d||typeof d!=='object'||Array.isArray(d)||!/^[a-zA-Z0-9_-]{1,100}$/.test(row.id))throw Error('Invalid workspace record');const result={...d,id:row.id};if(row.kind==='projects'){result.stage=Math.max(0,Math.min(4,Math.floor(Number(d.stage)||0)));result.email=row.owner_email;result.files=Array.isArray(d.files)?d.files:[];result.timeline=Array.isArray(d.timeline)?d.timeline:[];}if(row.kind==='messages'||row.kind==='profiles')result.email=row.owner_email;return result;}
  async function refresh(){if(isDeveloper){window.openDeveloper?.({email:session.user.email,name:session.user.user_metadata?.name||'Developer'});return;}if(loading)return;loading=true;try{let rows=[],offset=0;while(true){const batch=await request('/rest/v1/kds_records?select=id,kind,owner_email,data&order=created_at.desc,id.asc&limit=500&offset='+offset);rows.push(...batch);if(batch.length<500)break;offset+=500;}const next={};Object.keys(keys).forEach(key=>next[key]=rows.filter(row=>row.kind===keys[key]).map(safeRecord));if(isAdmin){next[K.projects].forEach(p=>{const note=rows.find(r=>r.kind==='private_notes'&&r.id==='note_'+p.id);p.notes=note?.data?.notes||'';});}memory=next;render();}finally{loading=false;}}
  function render(){if(isDeveloper){window.openDeveloper?.({email:session.user.email,name:session.user.user_metadata?.name||'Developer'});return;}if(isAdmin)window.renderAll();else{const me=window.load(K.session,{});window.openDash(me);$('accPhone').value=session.user.user_metadata?.phone||'';}}
  async function requireAccess(owner=false){
    if(!session?.access_token)throw Error('Please sign in to continue.');
    const user=await request('/auth/v1/user');if(user.id!==session.user?.id)throw Error('Please sign in again.');
    if(owner&&(user.app_metadata?.role!=='admin'||claims().aal!=='aal2'))throw Error('This action requires verified owner access.');
    if(!owner&&isDeveloper&&user.app_metadata?.role!=='developer')throw Error('Developer access is required.');if(!owner&&isClient&&['admin','developer'].includes(user.app_metadata?.role))throw Error('Use the studio owner console for this account.');
    session.user=user;
  }
  async function enter(){await validateSession();await refresh();if(isAdmin)window.open_();authState('ready');window.dispatchEvent(new CustomEvent('kds:ready',{detail:{role:isAdmin?'owner':isDeveloper?'developer':'client',route:initialRoute}}));}
  async function signIn(email,password){session=null;memory={};sessionStorage.removeItem(sessionKey);const data=await request('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})},false);session=data;const user=await request('/auth/v1/user');if(String(user.email||'').toLowerCase()!==email.toLowerCase())throw Error('Sign-in could not be completed for this account.');await enter();}
  let signing=false;
  async function login(){if(signing)return;const email=$(isAdmin?'lkEmail':'liEmail').value.trim().toLowerCase(),password=$(isAdmin?'lkPass':'liPass').value;if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!password)return authError('Enter your email and password.');signing=true;authError('Signing in…','loading');const button=document.querySelector(isAdmin?'#lock button[onclick*=unlock]':'#p-in button[onclick*=login]');if(button){button.disabled=true;button.setAttribute('aria-busy','true');}try{await signIn(email,password);authError('');$(isAdmin?'lkPass':'liPass').value='';}catch(e){session=null;sessionStorage.removeItem(sessionKey);authState('login');authError(e.message);if(isAdmin){$('app').classList.remove('on');$('lock').classList.remove('gone');}else{$('dash').classList.remove('on');$('auth').classList.remove('gone');}}finally{signing=false;if(button){button.disabled=false;button.removeAttribute('aria-busy');}}}
  window.unlock=login;window.login=login;window.devLogin=()=>location.href='admin.html';
  async function logout(){const active=session;session=null;sessionStorage.removeItem(sessionKey);if(active?.user?.id)sessionStorage.removeItem('kds_client_project_'+active.user.id);memory={};if(isAdmin){$('app').classList.remove('on');$('lock').classList.remove('gone');}else{$('dash').classList.remove('on');$('auth').classList.remove('gone');}authState('login');try{if(active?.access_token)await fetch(cfg.supabaseUrl.replace(/\/$/,'')+'/auth/v1/logout',{method:'POST',headers:{apikey:cfg.supabaseAnonKey,Authorization:'Bearer '+active.access_token},signal:AbortSignal.timeout(15000)});}catch(_){}location.replace(location.pathname);}
  window.logout=logout;window.lockUp=logout;
  if(isClient){
    let onboardingPending=false;
    async function onboardingTask(selector,task){if(onboardingPending)return;onboardingPending=true;const button=document.querySelector(selector);if(button){button.disabled=true;button.setAttribute('aria-busy','true');}try{await task();}catch(e){authError(e.message);}finally{onboardingPending=false;if(button){button.disabled=false;button.removeAttribute('aria-busy');}}}
    window.signup=()=>onboardingTask('#p-up button[onclick*=signup]',async()=>{const name=$('suName').value.trim(),email=$('suEmail').value.trim().toLowerCase(),password=$('suPass').value;if(!$('suConsent').checked)throw Error('Please review and agree to account data processing.');if(!name||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<12)throw Error('Enter your name, a valid email and a password of at least 12 characters.');authError('Creating your workspace account…','loading');await request('/auth/v1/signup',{method:'POST',body:JSON.stringify({email,password,data:{name,phone:$('suPhone').value.trim(),consent_at:new Date().toISOString(),consent_version:'2026-11-notice-v1',marketing_opt_in:$('suMarketing').checked}})},false);$('suPass').value='';authError('Check your email for the next step. You can return to Login once your account is confirmed.','success');});
    window.forgot=()=>onboardingTask('#p-fp button',async()=>{const email=$('fpEmail').value.trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Enter a valid email address.');authError('Requesting an account recovery email…','loading');await request('/auth/v1/recover?redirect_to='+encodeURIComponent(location.origin+location.pathname),{method:'POST',body:JSON.stringify({email})},false);authError('If this account can receive recovery email, the next step will be sent.','success');});
    window.saveAccount=async()=>{try{await requireAccess();const password=$('accPass').value;if(password&&password.length<12)throw Error('Use at least 12 characters.');const user=await request('/auth/v1/user',{method:'PUT',body:JSON.stringify({...(password?{password}:{}),data:{phone:$('accPhone').value.trim()}})});session.user=user;remember();$('accPass').value='';notify('Account updated.');}catch(e){notify(e.message);}};
    // Send only after backend confirmation; no optimistic success.
    async function send(kind){if(writes)return;const text=$(kind==='msg'?'msgTa':'conTa').value.trim();if(!text||text.length>5000)return notify('Enter a message of 1–5000 characters.');const row={id:crypto.randomUUID(),kind:'messages',owner_email:session.user.email,data:{text,kind,cat:kind==='concern'?$('conCat').value:'',at:new Date().toISOString(),reply:'',status:'Received'}};writes={};try{await requireAccess();await request('/rest/v1/kds_records',{method:'POST',body:JSON.stringify(row)});$(kind==='msg'?'msgTa':'conTa').value='';await refresh();notify('Message saved to the studio inbox.');}catch(e){notify(e.message);}finally{writes=null;}}
    window.sendMsg=()=>send('msg');window.sendConcern=()=>send('concern');
    window.rate=async n=>{try{await requireAccess();await request('/auth/v1/user',{method:'PUT',body:JSON.stringify({data:{rating:n}})});window.paintStars(n);notify('Feedback saved.');}catch(e){notify(e.message);}};
  }
  if(isAdmin){
    window.auth=()=>({email:session?.user?.email||''});
    const actions=['addProject','delProject','noteProject','setStage','addLead','setStatus','delLead','leadToProject','reply'];
    actions.forEach(name=>{const original=window[name];if(!original)return;window[name]=async function(...args){if(writes)return notify('Please wait for the current change.');const old=structuredClone(memory);writes={};const oldToast=window.toast;let message='Changes saved.';window.toast=text=>{message=text;};try{await requireAccess(true);original(...args);const changes=writes;
        for(const key of Object.keys(changes)){const before=old[key]||[],after=changes[key];if(!Array.isArray(after))throw Error('Invalid record collection');const removed=before.filter(x=>!after.some(y=>y.id===x.id));const updated=after.filter(x=>JSON.stringify(x)!==JSON.stringify(before.find(y=>y.id===x.id)));
          for(const row of updated){if(!/^[\w-]{1,100}$/.test(row.id))throw Error('Invalid record ID');await request('/rest/v1/kds_records?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates'},body:JSON.stringify({id:row.id,kind:keys[key],owner_email:row.email||session.user.email,data:keys[key]==='projects'?Object.fromEntries(Object.entries(row).filter(([k])=>k!=='notes')):row})});}
          if(keys[key]==='projects'){for(const row of updated)await request('/rest/v1/kds_records?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates'},body:JSON.stringify({id:'note_'+row.id,kind:'private_notes',owner_email:session.user.email,data:{notes:row.notes||''}})});for(const row of removed)await request('/rest/v1/kds_records?id=eq.'+encodeURIComponent('note_'+row.id),{method:'DELETE'});}
          for(const row of removed)await request('/rest/v1/kds_records?id=eq.'+encodeURIComponent(row.id),{method:'DELETE'});
        }await refresh();oldToast(message);
      }catch(e){memory=old;try{await refresh();}catch(_){}render();oldToast(e.message+' Refresh before retrying.');}finally{window.toast=oldToast;writes=null;}};});
    window.saveAccess=async()=>{try{await requireAccess(true);const password=$('setPass').value;if(password&&password.length<12)throw Error('Use at least 12 characters.');await request('/auth/v1/user',{method:'PUT',body:JSON.stringify({email:$('setEmail').value,...(password?{password}:{})})});$('setPass').value='';notify('Update accepted. Email changes may require confirmation.');}catch(e){notify(e.message);}};
    window.backup=async()=>{try{await requireAccess(true);}catch(e){notify(e.message);return;}const blob=new Blob([JSON.stringify({format:'kds-records-v1',exported_at:new Date().toISOString(),records:memory},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='kds-workspace-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
    window.restore=()=>notify('Restore production records through the reviewed database backup process in README.');window.reseed=()=>notify('Sample data is available only in explicit localhost demo mode.');
  }
  let restoring=false;
  async function restore(){
    if(restoring)return;restoring=true;authState('restoring','Restoring your workspace…');
    try{
      const fragment=new URLSearchParams(location.hash.slice(1));
      if(fragment.get('type')==='recovery'&&fragment.get('access_token')){
        sessionStorage.removeItem(sessionKey);session={access_token:fragment.get('access_token'),refresh_token:fragment.get('refresh_token')};history.replaceState(null,'',location.pathname+'#recovery');
        session.user=await request('/auth/v1/user');const back=$('recoveryPanel')?.querySelector('a');if(back)back.href=session.user.app_metadata?.role==='developer'?'developer.html':session.user.app_metadata?.role==='admin'?'admin.html':'client.html';authState('recovery');const form=$('recoveryForm');if(!form)throw Error('Open the password recovery link on client.html.');
        form.onsubmit=async event=>{event.preventDefault();const password=$('recoveryPassword').value,confirm=$('recoveryConfirm').value;if(password.length<12||password!==confirm){$('recoveryStatus').textContent='Use at least 12 characters and enter the same password twice.';return;}const submit=form.querySelector('button[type=submit]');submit.disabled=true;try{await request('/auth/v1/user',{method:'PUT',body:JSON.stringify({password})});$('recoveryStatus').textContent='Password updated. Return to Login to continue.';try{await request('/auth/v1/logout',{method:'POST'});}catch(_){}session=null;form.reset();}catch(e){$('recoveryStatus').textContent=e.message;}finally{submit.disabled=false;}};return;
      }
      let saved=null;try{saved=JSON.parse(sessionStorage.getItem(sessionKey)||'null');}catch(_){sessionStorage.removeItem(sessionKey);}
      if(!saved?.refresh_token){authState('login');return;}
      session=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:saved.refresh_token})},false);await enter();
    }catch(e){const invalid=e.status===400||e.status===401||e.status===403||['owner_route','developer_route'].includes(e.code)||/studio access|owner access|verification|MFA|cancelled/i.test(e.message);if(invalid){session=null;sessionStorage.removeItem(sessionKey);authState('login');authError(e.message);}else{authState('error','Could not restore the workspace. Check your connection and retry.');}}finally{restoring=false;}
  }
  KDS.teamApi={
    request,check:()=>requireAccess(isAdmin),
    identity:()=>session?.user?{id:session.user.id,email:session.user.email,role:session.user.app_metadata?.role||'client'}:null,
    upload:async(path,file)=>{await requireAccess(isAdmin);const response=await fetch(cfg.supabaseUrl.replace(/\/$/,'')+'/storage/v1/object/kds-job-files/'+path.split('/').map(encodeURIComponent).join('/'),{method:'POST',headers:{apikey:cfg.supabaseAnonKey,Authorization:'Bearer '+session.access_token,'Content-Type':file.type||'application/octet-stream','x-upsert':'false'},body:file,signal:AbortSignal.timeout(120000)});if(!response.ok)throw Error('The upload could not be completed. Your file has not been shared.');},
    removePendingObject:async(path)=>{await request('/storage/v1/object/kds-job-files',{method:'DELETE',body:JSON.stringify({prefixes:[path]})});},
    sign:async(path)=>{const result=await request('/storage/v1/object/sign/kds-job-files/'+path.split('/').map(encodeURIComponent).join('/'),{method:'POST',body:JSON.stringify({expiresIn:300})});const value=result.signedURL||result.signedUrl;if(!value)throw Error('A file link could not be created.');return value.startsWith('https://')?value:cfg.supabaseUrl.replace(/\/$/,'')+'/storage/v1'+value;}
  };
  KDS.retrySession=restore;
  const refreshTimer=setInterval(async()=>{if(!session?.refresh_token||writes||document.hidden||restoring)return;try{session=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:session.refresh_token})},false);await validateSession();await refresh();}catch(e){if(e.status===400||e.status===401||e.status===403){session=null;sessionStorage.removeItem(sessionKey);if(isAdmin){$('app').classList.remove('on');$('lock').classList.remove('gone');}else{$('dash').classList.remove('on');$('auth').classList.remove('gone');}authState('login');authError('Your session expired. Please sign in again.');}else notify('Connection interrupted. Your workspace has not been refreshed.');}},5*60*1000);
  addEventListener('pagehide',()=>clearInterval(refreshTimer),{once:true});
  if(!configured){authState('login');authError('Workspace setup is required. Configure the project URL and public key in config.js.');return;}
  await restore();
};
