const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'v8-public.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'v8-public.css'), 'utf8');

function dom(markup) {
  const instance = new JSDOM(markup, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'https://example.test/index.html'
  });
  instance.window.KDS = { modalClose() {} };
  instance.window.eval(source);
  instance.window.document.dispatchEvent(new instance.window.Event('DOMContentLoaded'));
  return instance;
}

(async () => {
  let spoken = '';
  const publicDom = dom(`<!doctype html><body class="public">
    <article class="work-direction">
      <div class="identity-preview">
        <svg id="identity-0"></svg><svg id="identity-1" hidden></svg>
        <div class="identity-switch"><button data-identity="0">Kite</button><button data-identity="1">Tilt</button></div>
      </div>
      <div><span class="tag"></span><h2></h2><p></p><details><p></p></details></div>
    </article>
    <dialog class="access-dialog"><div class="access-grid"><a href="client.html">Client</a></div></dialog>
    <button id="cw-fab"></button><div id="cw"><div class="cw-h"><span class="av"></span><div><b></b><span></span></div><button class="cw-x">x</button></div><div class="cw-msgs"></div><div class="cw-q"></div></div>
  </body>`);
  publicDom.window.cwSay = (_who, text) => { spoken = text; };
  /* Re-run once to wrap the late fixture function, as the production function exists first. */
  publicDom.window.eval(source);
  publicDom.window.document.dispatchEvent(new publicDom.window.Event('DOMContentLoaded'));

  const doc = publicDom.window.document;
  assert.equal(doc.querySelector('#identity-0').hidden, false, 'Kite starts visible');
  assert.equal(doc.querySelector('#identity-1').hidden, true, 'Tilt starts hidden');
  assert.match(doc.querySelector('.work-direction h2').textContent, /clear frame/i);
  doc.querySelector('[data-identity="1"]').click();
  assert.equal(doc.querySelector('#identity-0').hidden, true, 'Kite hides after Tilt selection');
  assert.equal(doc.querySelector('#identity-1').hidden, false, 'Tilt becomes visible');
  assert.equal(doc.querySelector('.identity-preview').dataset.identity, 'tilt');
  assert.match(doc.querySelector('.work-direction h2').textContent, /forward movement/i);
  assert.equal(doc.querySelector('[data-identity="1"]').getAttribute('aria-pressed'), 'true');

  assert.equal(doc.querySelectorAll('.v8-access-card').length, 2, 'Studio Access contains developer and owner cards');
  assert.equal(doc.querySelector('.v8-access-card[href="client.html"]'), null, 'Studio Access has no client option');
  assert.equal(doc.querySelector('.v8-access-visual').textContent.includes('\u25a1'), false, 'Access visual has no empty placeholder square');

  assert.equal(doc.querySelector('.cw-h b').textContent, 'RAY');
  assert.equal(doc.querySelector('.cw-x').getAttribute('aria-label'), 'Close RAY');
  assert.equal(doc.querySelector('.cw-msgs').getAttribute('role'), 'log');
  publicDom.window.cwSay('a', 'Hello. I am the studio desk and can help.');
  assert.match(spoken, /I am RAY/);
  doc.querySelector('#cw').classList.add('on');
  await new Promise((resolve) => publicDom.window.setTimeout(resolve, 5));
  assert.equal(doc.querySelector('#cw-fab').getAttribute('aria-expanded'), 'true');
  assert.equal(doc.querySelector('#cw').getAttribute('aria-hidden'), 'false');

  const developerDom = dom(`<!doctype html><body data-portal="developer"><div id="auth"><div class="au-card"><p class="sub"></p><p class="onboarding-note"></p></div></div></body>`);
  const developer = developerDom.window.document;
  assert.ok(developer.querySelector('.developer-login-story'), 'Developer login introduction renders');
  assert.match(developer.querySelector('.developer-login-story h1').textContent, /Make the work/);
  assert.match(developer.querySelector('.au-card .sub').textContent, /work account assigned/);

  assert.match(styles, /body\.public #cw\{background:#f7f9fc/, 'RAY has the revision 8 visual treatment');
  assert.match(styles, /@media\(max-width:600px\).*body\.public #cw/s, 'RAY has a constrained mobile layout');
  console.log('v8 public UI tests passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
