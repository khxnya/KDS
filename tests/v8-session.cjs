const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync(path.join(__dirname, '..', 'v8-session.js'), 'utf8');

assert.match(source, /kds_owner_session.*kds_client_session.*kds_developer_session/s);
assert.match(source, /\/auth\/v1\/logout/);
assert.match(source, /addEventListener\('pageshow', revalidateHistory\)/);
assert.match(source, /event\.persisted/);
assert.match(source, /minimumLoaderMs.*1000.*1250/);
assert.match(source, /kds_prepare_profile_avatar/);
assert.match(source, /kds_complete_profile_avatar/);
assert.match(source, /timeZone: 'Africa\/Johannesburg'/);
assert.match(source, /document\.addEventListener\('visibilitychange'/);
assert.doesNotMatch(source, /const text = \(link\.textContent/);

(async () => {
  const dom = new JSDOM(`<!doctype html><html data-auth-state="login"><head></head><body>
    <div class="app-loader"><p id="appLoadingText"></p></div>
    <div id="auth"><input id="liEmail" value="client@example.com"><input id="liPass" value="valid-password"></div>
    <div id="dash"></div><div id="auErr"></div>
  </body></html>`, {
    url: 'https://studio.example/client.html',
    runScripts: 'outside-only',
    pretendToBeVisual: true
  });
  const { window } = dom;
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  window.KDS = { teamApi: { request: async () => ({}), check: async () => ({}) } };
  let loginCalls = 0;
  window.login = () => { loginCalls += 1; };
  window.eval(source);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(window.login.v8LoaderWrapped, true, 'client login is wrapped after the portal runtime defines it');
  window.login();
  assert.equal(loginCalls, 1);
  assert.equal(window.document.documentElement.dataset.authState, 'restoring');
  assert.equal(window.document.getElementById('appLoadingText').textContent, 'Opening your workspace…');
  dom.window.close();

  console.log('v8 session checks passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
