const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM, VirtualConsole } = require('jsdom');

const source = fs.readFileSync(path.join(__dirname, '..', 'v8-workspace.js'), 'utf8');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function makeApi(calls, accountRole = 'admin') {
  return {
    identity: () => ({ id: accountRole + '-1', role: accountRole, metadata: { first_name: accountRole === 'developer' ? 'Sipho' : accountRole === 'client' ? 'Lerato' : 'Khanya', surname: 'Ngema' } }),
    async updateProfile(data) { calls.push({ type: 'updateProfile', data }); return { id: 'owner-1', user_metadata: data }; },
    subscribe(table, filter, callback) {
      calls.push({ type: 'subscribe', table, filter });
      return () => calls.push({ type: 'unsubscribe', table });
    },
    async request(pathname, options = {}) {
      const body = options.body ? JSON.parse(options.body) : null;
      calls.push({ type: 'request', pathname, body });
      if (pathname.startsWith('/rest/v1/kds_profiles?')) return [{ first_name: accountRole === 'developer' ? 'Sipho' : accountRole === 'client' ? 'Lerato' : 'Khanya', surname: 'Ngema', phone: '', business_name: 'Example business', project_contact: 'Lerato Ngema', skills: ['Web development'], availability: 'Weekdays', preferences: { notification_categories: ['messages', 'projects', 'assignments', 'agreements'], display_density: 'comfortable' } }];
      if (pathname.startsWith('/rest/v1/kds_notifications?')) return [
        { id: 'n-1', kind: 'Project message', body: 'A new reply is ready.', link: 'admin.html#community', created_at: '2026-11-11T10:00:00Z', read_at: null },
        { id: 'n-2', kind: 'Assignment', body: 'A job was assigned.', link: null, created_at: '2026-11-10T10:00:00Z', read_at: '2026-11-10T11:00:00Z' }
      ];
      if (pathname.endsWith('/rpc/kds_list_project_conversations')) return [{
        project_id: 'project-1', project_label: 'Website refresh', participant_names: 'Client, Developer',
        latest_body: 'First checkpoint shared.', latest_at: '2026-11-11T10:00:00Z', unread_count: 1
      }];
      if (pathname.endsWith('/rpc/kds_list_project_messages')) return [{
        id: 'm-1', project_id: 'project-1', sender_id: 'developer-1', sender_name: 'Sipho', sender_role: 'developer',
        body: '<script>unsafe</script> remains plain text', created_at: '2026-11-11T10:00:00Z', is_own: false
      }];
      if (pathname.endsWith('/rpc/kds_save_my_profile')) return [{ first_name: body.p_first_name, surname: body.p_surname, phone: body.p_phone, skills: body.p_skills, availability: body.p_availability, preferences: body.p_preferences }];
      return [];
    }
  };
}

async function adminFixture() {
  const errors = [], calls = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error.message));
  const dom = new JSDOM(`<!doctype html><html><body>
    <div id="lock"></div><div id="app"><main id="portal-main"><div class="topbar"><div class="tb-r">
      <button class="kds-notice-trigger">Notifications</button></div></div><section id="v-settings"></section></main>
      <nav id="nav"><a data-v="overview">Overview</a><a data-v="community">Old Community</a><a data-v="settings">Settings</a></nav>
      <section id="v-community">Old chat</section>
    </div><div id="kdsNotifications">Old notification dialog</div><div class="a-av">K</div>
  </body></html>`, { url: 'https://studio.invalid/admin.html', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole });
  const { window } = dom;
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  window.scrollTo = () => {};
  window.toast = message => calls.push({ type: 'toast', message });
  window.KDS = {
    teamApi: makeApi(calls),
    modalOpen(dialog) { dialog.open = true; },
    modalClose(dialog) { dialog.open = false; }
  };
  window.eval(source);
  window.dispatchEvent(new window.Event('kds:ready'));
  await delay(40);
  return { dom, window, document: window.document, calls, errors };
}

async function roleSettingsFixture(accountRole) {
  const calls = [];
  const content = accountRole === 'developer'
    ? `<body data-portal="developer"><div id="auth"></div><div id="dash"><header class="topbar"><div class="tb-r"></div></header><main class="dev-shell"><div class="dev-header"><h1>Welcome, colleague.</h1></div><section id="developerJobDetail"></section></main></div></body>`
    : `<body><div id="auth"></div><div id="dash"><header class="topbar"><div class="tb-r"></div></header><main id="portal-main"><h1 id="greet">Hello.</h1><div class="pane-card"><h3>Your account</h3><p class="hint">Account details</p><div class="fld"><input id="profileFirstName"></div><div class="fld"><input id="profileSurname"></div><div class="fld"><input id="accPhone"></div><div class="fld"><label>Password</label><input id="accPass" type="password"></div><button onclick="saveAccount()">Save changes</button></div></main></div></body>`;
  const dom = new JSDOM(`<!doctype html><html>${content}</html>`, { url: `https://studio.invalid/${accountRole}.html`, runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  window.scrollTo = () => {};
  window.HTMLElement.prototype.scrollIntoView = function () {};
  window.KDS = { teamApi: makeApi(calls, accountRole), modalOpen(dialog) { dialog.open = true; }, modalClose(dialog) { dialog.open = false; } };
  window.eval(source);
  window.dispatchEvent(new window.Event('kds:ready'));
  await delay(40);
  return { dom, window, document: window.document, calls };
}

async function run() {
  const fixture = await adminFixture();
  const { dom, window, document, calls, errors } = fixture;
  assert.deepEqual(errors, []);
  assert.equal(document.querySelectorAll('.kds-notice-trigger').length, 0, 'revision 7 trigger is removed');
  assert.equal(document.querySelectorAll('#kdsNotifications').length, 0, 'revision 7 dialog is removed');
  assert.equal(document.querySelectorAll('#nav [data-v="community"]').length, 1, 'one Community Chat route remains');
  assert.match(document.getElementById('v-community').textContent, /Community Chat/);
  assert.ok(document.getElementById('kdsBellV8'), 'notification bell is installed');
  assert.equal(document.querySelector('.kds8-bell-count').textContent, '1');
  assert.equal(document.querySelector('.a-av').getAttribute('aria-label'), 'Khanya Ngema profile');
  const settings = document.querySelector('#kdsProfileSettingsV8 form');
  assert.ok(settings, 'persisted owner profile settings are mounted');
  settings.elements.first_name.value = 'Khanya';
  settings.elements.surname.value = 'Ngema';
  settings.elements.display_density.value = 'compact';
  settings.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await delay(30);
  assert.ok(calls.some(call => call.pathname?.endsWith('/rpc/kds_save_my_profile') && call.body.p_preferences.display_density === 'compact'));
  assert.ok(document.body.classList.contains('kds8-compact'));

  document.getElementById('kdsBellV8').click();
  await delay(30);
  const quick = document.getElementById('kdsQuickNotifications');
  assert.equal(quick.hidden, false);
  assert.equal(document.getElementById('kdsBellV8').getAttribute('aria-expanded'), 'true');
  assert.equal(quick.querySelectorAll('.kds8-notification').length, 2);

  const community = document.querySelector('#nav [data-v="community"]');
  community.click();
  await delay(30);
  document.querySelector('.kds8-conversation').click();
  await delay(30);
  assert.match(document.querySelector('.kds8-message p').textContent, /<script>unsafe<\/script>/);
  assert.equal(document.querySelectorAll('.kds8-message script').length, 0, 'message body is rendered as text');
  assert.ok(calls.some(call => call.type === 'subscribe' && call.table === 'kds_notifications'));
  assert.ok(calls.some(call => call.type === 'subscribe' && call.table === 'kds_project_messages'));

  window.dispatchEvent(new window.Event('pagehide'));
  assert.ok(calls.some(call => call.type === 'unsubscribe'));
  dom.window.close();
  const developer = await roleSettingsFixture('developer');
  assert.ok(developer.document.querySelector('[name="skills"]'));
  assert.ok(developer.document.querySelector('[name="availability"]'));
  assert.equal(developer.document.querySelector('[name="business_name"]'), null);
  assert.ok(developer.document.getElementById('kdsSettingsShortcut'));
  assert.equal(developer.document.querySelector('.dev-header h1').textContent, 'Hello, Sipho.');
  developer.window.dispatchEvent(new developer.window.Event('pagehide'));
  developer.dom.window.close();

  const client = await roleSettingsFixture('client');
  assert.ok(client.document.querySelector('[name="business_name"]'));
  assert.ok(client.document.querySelector('[name="project_contact"]'));
  assert.equal(client.document.querySelector('[name="skills"]'), null);
  assert.equal(client.document.getElementById('profileFirstName').closest('.fld').hidden, true);
  assert.equal(client.document.getElementById('greet').textContent, 'Hello, Lerato.');
  client.window.dispatchEvent(new client.window.Event('pagehide'));
  client.dom.window.close();
  console.log('PASS revision 8 bell, Community Chat, safe messages, realtime cleanup and role-specific persisted settings');
}

if (require.main === module) run().catch(error => { console.error(error); process.exit(1); });
