(function () {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function logoMarkup(label) {
    return `<svg viewBox="0 0 100 100" role="img" aria-label="${label}"><g transform="rotate(-8 50 50)"><path d="M30 22V78 M30 50L56 26 M38 50L56 74" stroke="#78a8ed" stroke-width="10" stroke-linecap="round" fill="none"/><path d="M56 26a25 25 0 0 1 0 48" fill="none" stroke="#efbf58" stroke-width="10" stroke-linecap="round"/></g></svg>`;
  }

  function enhanceDeveloperLogin() {
    if (document.body.dataset.portal !== 'developer') return;
    const auth = $('#auth');
    const card = auth && $('.au-card', auth);
    if (!auth || !card || $('.developer-login-story', auth)) return;

    const story = document.createElement('section');
    story.className = 'login-story developer-login-story';
    story.setAttribute('aria-label', 'Developer workspace introduction');
    story.innerHTML = `<div class="developer-story-logo">${logoMarkup('Khanya Digital')}</div>
      <span class="portal-eyebrow">KHANYA DIGITAL / DEVELOPER WORKSPACE</span>
      <h1>Make the work<br>clear as it moves.</h1>
      <p>Review your assigned projects, share useful checkpoints and keep each client conversation connected to the work.</p>
      <div class="developer-story-line" aria-hidden="true"></div>`;
    auth.insertBefore(story, card);

    const subtitle = $('.au-card .sub', auth);
    if (subtitle) subtitle.textContent = 'Sign in with the work account assigned by the studio.';
    const note = $('.onboarding-note', auth);
    if (note) note.textContent = 'Developer access is provided by the studio owner.';
  }

  const identityCopy = {
    '0': {
      tag: 'STUDIO IDENTITY / KITE',
      title: 'A clear frame for connected work.',
      body: 'Kite holds the K and D inside a steady diamond. It reflects the structure a business needs across its website, visual content and the places people meet it online.',
      detail: 'The framed form feels composed and grounded. Choose Kite to see the more structured direction.'
    },
    '1': {
      tag: 'STUDIO IDENTITY / TILT',
      title: 'A mark with forward movement.',
      body: 'Tilt opens the frame and moves the interlock forward. It reflects a studio that connects clear digital foundations with expressive 3D and visual storytelling.',
      detail: 'The open form feels lighter and more dynamic. Choose Tilt to see the more expressive direction.'
    }
  };

  function setIdentity(name, focus) {
    const preview = $('.identity-preview');
    if (!preview || !identityCopy[name]) return;
    const art = $$('#identity-0, #identity-1', preview);
    const buttons = $$('[data-identity]', preview);
    const next = $('#identity-' + name, preview);
    const article = preview.closest('.work-direction');
    const copy = article && preview.nextElementSibling;
    const selected = identityCopy[name];

    preview.dataset.identity = name === '0' ? 'kite' : 'tilt';
    preview.setAttribute('aria-label', `${name === '0' ? 'Kite' : 'Tilt'} interlock design`);
    art.forEach((item) => {
      item.hidden = item !== next;
      item.classList.toggle('v8-identity-active', item === next);
    });
    buttons.forEach((button) => {
      const active = button.dataset.identity === name;
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('is-active', active);
      if (active && focus) button.focus({ preventScroll: true });
    });

    if (copy) {
      copy.setAttribute('aria-live', 'polite');
      copy.setAttribute('aria-atomic', 'true');
      const tag = $('.tag', copy);
      const title = $('h2', copy);
      const body = $('h2 + p', copy);
      const detail = $('details p', copy);
      copy.classList.remove('v8-copy-change');
      if (tag) tag.textContent = selected.tag;
      if (title) title.textContent = selected.title;
      if (body) body.textContent = selected.body;
      if (detail) detail.textContent = selected.detail;
      (window.requestAnimationFrame || ((callback) => setTimeout(callback, 0)))(() => copy.classList.add('v8-copy-change'));
    }
  }

  function enhanceIdentity() {
    const preview = $('.identity-preview');
    if (!preview || preview.dataset.v8Ready) return;
    preview.dataset.v8Ready = 'true';
    const buttons = $$('[data-identity]', preview);
    buttons.forEach((button, index) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        setIdentity(button.dataset.identity, false);
      }, true);
      button.addEventListener('keydown', (event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const step = event.key === 'ArrowLeft' ? -1 : 1;
        let target = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + step + buttons.length) % buttons.length;
        setIdentity(buttons[target].dataset.identity, true);
      });
    });
    setIdentity('0', false);
  }

  function enhanceStudioAccess() {
    const dialog = $('.access-dialog');
    if (!dialog || dialog.dataset.v8Ready) return;
    dialog.dataset.v8Ready = 'true';
    dialog.classList.add('v8-access-dialog');
    dialog.innerHTML = `<div class="v8-access-shell">
      <div class="v8-access-visual" aria-hidden="true">
        <div class="v8-access-mark">${logoMarkup('')}</div>
        <span>KHANYA DIGITAL</span>
        <i></i><i></i><i></i>
      </div>
      <div class="v8-access-content">
        <div class="v8-access-head">
          <div><span class="ey">STUDIO ACCESS</span><h2 id="accessTitle">Choose your workspace.</h2><p>Sign in to the workspace assigned to your role.</p></div>
          <button type="button" class="access-close" aria-label="Close studio access">Close</button>
        </div>
        <div class="v8-access-grid">
          <a class="v8-access-card" href="developer.html"><span class="v8-access-icon" aria-hidden="true">D</span><span><b>Developer workspace</b><small>Assigned projects, progress and client conversations.</small></span><em aria-hidden="true">→</em></a>
          <a class="v8-access-card" href="admin.html"><span class="v8-access-icon owner" aria-hidden="true">K</span><span><b>Owner console</b><small>Studio projects, people and operations.</small></span><em aria-hidden="true">→</em></a>
        </div>
      </div>
    </div>`;
    $('.access-close', dialog).onclick = () => window.KDS?.modalClose(dialog);
  }

  function enhanceRay() {
    const fab = $('#cw-fab');
    const panel = $('#cw');
    if (!fab || !panel) return;
    fab.setAttribute('aria-label', 'Open RAY studio guide');
    fab.setAttribute('aria-controls', 'cw');
    fab.setAttribute('aria-haspopup', 'dialog');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'RAY studio guide');
    panel.setAttribute('aria-hidden', String(!panel.classList.contains('on')));
    fab.setAttribute('aria-expanded', String(panel.classList.contains('on')));
    const title = $('.cw-h b', panel);
    const status = $('.cw-h span', panel);
    const avatar = $('.cw-h .av', panel);
    const close = $('.cw-x', panel);
    const messages = $('.cw-msgs', panel);
    const questions = $('.cw-q', panel);
    if (title) title.textContent = 'RAY';
    if (status) status.textContent = 'Khanya Digital studio guide';
    if (avatar) avatar.textContent = 'R';
    if (close) {
      close.setAttribute('aria-label', 'Close RAY');
      close.setAttribute('title', 'Close RAY');
    }
    if (messages) {
      messages.setAttribute('role', 'log');
      messages.setAttribute('aria-live', 'polite');
      messages.setAttribute('aria-relevant', 'additions');
    }
    if (questions) questions.setAttribute('aria-label', 'Questions for RAY');

    /* Preserve the useful conversation tree while presenting its guide as RAY. */
    if (typeof window.cwSay === 'function' && !window.cwSay.v8Ray) {
      const originalSay = window.cwSay;
      const raySay = function (who, text) {
        const message = typeof text === 'string' && text.includes('I am the studio desk')
          ? 'Hello. I am RAY, the Khanya Digital studio guide. I can help with services, timing and how to start an enquiry. Anything I cannot answer can be sent to the studio.'
          : text;
        return originalSay.call(this, who, message);
      };
      raySay.v8Ray = true;
      window.cwSay = raySay;
    }

    let wasOpen = panel.classList.contains('on');
    const observer = new MutationObserver(() => {
      const open = panel.classList.contains('on');
      fab.setAttribute('aria-expanded', String(open));
      panel.setAttribute('aria-hidden', String(!open));
      if (open && !wasOpen) {
        window.setTimeout(() => (close || panel).focus({ preventScroll: true }), 0);
      } else if (!open && wasOpen && (panel.contains(document.activeElement) || document.activeElement === document.body)) {
        fab.focus({ preventScroll: true });
      }
      wasOpen = open;
    });
    observer.observe(panel, { attributes: true, attributeFilter: ['class'] });
  }

  function ready() {
    enhanceDeveloperLogin();
    enhanceIdentity();
    enhanceStudioAccess();
    enhanceRay();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();
