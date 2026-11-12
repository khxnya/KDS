(function () {
  'use strict';

  const root = document.documentElement;
  const portal = document.body.dataset.portal === 'developer'
    ? 'developer'
    : document.getElementById('lock')
      ? 'owner'
      : document.getElementById('auth') && document.getElementById('dash')
        ? 'client'
        : 'public';
  if (portal === 'public') return;

  const loadedAt = performance.now();
  let loaderVisibleAt = loadedAt;
  const minimumLoaderMs = matchMedia('(prefers-reduced-motion: reduce)').matches ? 1000 : 1250;
  const sessionKeys = ['kds_owner_session', 'kds_client_session', 'kds_developer_session', 'kds_session'];
  const activityEvents = ['pointerdown', 'keydown', 'touchstart'];
  let authenticatedAt = 0;
  let lastActivity = Date.now();
  let warningTimer = 0;
  let logoutTimer = 0;
  let exitPending = false;
  let warningDialog = null;

  const style = document.createElement('style');
  style.textContent = `
    .v8-session-checking #app,.v8-session-checking #dash{visibility:hidden!important}
    .app-loader{opacity:1;transition:opacity .22s ease,visibility .22s ease}
    html.v8-loader-exiting .app-loader{display:grid}
    html.v8-loader-exiting.v8-loader-fade .app-loader{opacity:0;visibility:hidden;pointer-events:none}
    .v8-exit-busy{opacity:.72;pointer-events:none}
    .v8-inactivity{width:min(430px,calc(100% - 28px));border:0;border-radius:14px;padding:0;background:#fff;color:#173552;box-shadow:0 28px 90px #07172955}
    .v8-inactivity::backdrop{background:#071525a8;backdrop-filter:blur(5px)}
    .v8-inactivity>div{padding:26px}.v8-inactivity h2{font:600 24px/1.2 var(--dis,system-ui);margin:0 0 10px}.v8-inactivity p{color:#52677f;line-height:1.65;margin:0 0 20px}
    .v8-inactivity-actions{display:flex;gap:9px;flex-wrap:wrap}.v8-inactivity button{min-height:44px;border:0;border-radius:7px;padding:10px 15px;font:600 13px var(--ui,system-ui);background:#173552;color:#fff}.v8-inactivity button+button{background:#e9eef4;color:#173552}
    .v8-owner-avatar{position:relative;display:grid;place-items:center;width:42px;height:42px;min-width:42px;padding:0;border:1px solid #3b526d;border-radius:50%;overflow:hidden;background:#294363;color:#fff;font:700 12px var(--ui,system-ui);cursor:pointer}
    .v8-owner-avatar img{width:100%;height:100%;object-fit:cover}.v8-owner-avatar:focus-visible{outline:3px solid #78a9ea;outline-offset:3px}.v8-owner-avatar[aria-busy=true]::after{content:'';position:absolute;inset:9px;border:2px solid #fff;border-right-color:transparent;border-radius:50%;animation:v8-spin .7s linear infinite}
    @keyframes v8-spin{to{transform:rotate(360deg)}}
    @media(prefers-reduced-motion:reduce){.v8-owner-avatar[aria-busy=true]::after{animation:none;border-right-color:#fff}.app-loader{transition:none}}
  `;
  document.head.append(style);

  function toast(message) {
    if (typeof window.toast === 'function') window.toast(message);
    else {
      const target = document.getElementById('developerStatus') || document.getElementById('lkErr') || document.getElementById('auErr');
      if (target) target.textContent = message;
    }
  }

  function clearLocalSession() {
    for (const key of sessionKeys) sessionStorage.removeItem(key);
    for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = sessionStorage.key(index);
      if (key && key.startsWith('kds_client_project_')) sessionStorage.removeItem(key);
    }
  }

  function setProtectedInert(value) {
    for (const element of [document.getElementById('app'), document.getElementById('dash')]) {
      if (!element) continue;
      element.inert = value;
      element.setAttribute('aria-hidden', String(value));
    }
  }

  async function revokeCurrentSession() {
    try {
      const logout = window.KDS?.teamApi?.request?.('/auth/v1/logout', { method: 'POST', body: '{}' });
      if (logout) {
        await Promise.race([
          logout,
          new Promise(resolve => setTimeout(resolve, 3500))
        ]);
      }
    } catch (_) {
      // Local tokens are still cleared. A network failure cannot guarantee remote revocation.
    }
  }

  async function exitWorkspace(destination, trigger) {
    if (exitPending) return;
    exitPending = true;
    trigger?.classList.add('v8-exit-busy');
    trigger?.setAttribute('aria-busy', 'true');
    setProtectedInert(true);
    clearTimeout(warningTimer);
    clearTimeout(logoutTimer);
    clearLocalSession();
    await revokeCurrentSession();
    location.replace(destination);
  }

  function isPublicExit(link) {
    if (!link?.href) return false;
    try {
      const destination = new URL(link.getAttribute('href'), location.href);
      return destination.origin === location.origin && /(?:^|\/)index\.html$/.test(destination.pathname);
    } catch (_) {
      return false;
    }
  }

  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!isPublicExit(link)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const destination = new URL(link.getAttribute('href'), location.href).href;
    exitWorkspace(destination, link);
  }, true);

  async function finishLoader() {
    root.dataset.authState = 'ready';
    root.classList.add('v8-loader-exiting');
    await new Promise(resolve => requestAnimationFrame(() => {
      root.classList.add('v8-loader-fade');
      setTimeout(resolve, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 240);
    }));
    root.classList.remove('v8-loader-exiting', 'v8-loader-fade');
  }

  function loaderHold() {
    if (portal !== 'client') return Promise.resolve();
    const remaining = Math.max(0, minimumLoaderMs - (performance.now() - loaderVisibleAt));
    root.dataset.authState = 'restoring';
    const label = document.getElementById('appLoadingText');
    if (label) label.textContent = 'Opening your workspace…';
    return new Promise(resolve => setTimeout(resolve, remaining)).then(() => {
      if (root.dataset.authState === 'restoring') return finishLoader();
    });
  }

  function wrapClientLogin() {
    if (portal !== 'client') return;
    const original = window.login;
    if (typeof original !== 'function' || original.v8LoaderWrapped) return;
    const wrapped = function (...args) {
      const email = document.getElementById('liEmail')?.value.trim() || '';
      const password = document.getElementById('liPass')?.value || '';
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && password) {
        loaderVisibleAt = performance.now();
        root.dataset.authState = 'restoring';
        const label = document.getElementById('appLoadingText');
        if (label) label.textContent = 'Opening your workspace…';
      }
      return original.apply(this, args);
    };
    wrapped.v8LoaderWrapped = true;
    window.login = wrapped;
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => queueMicrotask(wrapClientLogin), { once: true });
  } else {
    queueMicrotask(wrapClientLogin);
  }

  function inactivityDialog() {
    if (warningDialog) return warningDialog;
    warningDialog = document.createElement('dialog');
    warningDialog.className = 'v8-inactivity';
    warningDialog.setAttribute('aria-labelledby', 'v8InactivityTitle');
    warningDialog.innerHTML = '<div><h2 id="v8InactivityTitle">Still working?</h2><p>Your workspace will sign out after a period without activity. Stay signed in to continue, or leave the workspace now.</p><div class="v8-inactivity-actions"><button type="button" data-stay>Stay signed in</button><button type="button" data-exit>Sign out</button></div></div>';
    warningDialog.querySelector('[data-stay]').onclick = async () => {
      const button = warningDialog.querySelector('[data-stay]');
      button.disabled = true;
      try {
        await window.KDS.teamApi.check();
        warningDialog.close();
        noteActivity(true);
      } catch (_) {
        warningDialog.close();
        exitWorkspace(location.pathname);
      } finally {
        button.disabled = false;
      }
    };
    warningDialog.querySelector('[data-exit]').onclick = () => exitWorkspace(location.pathname);
    warningDialog.addEventListener('cancel', event => {
      event.preventDefault();
      warningDialog.querySelector('[data-stay]').focus();
    });
    document.body.append(warningDialog);
    return warningDialog;
  }

  function scheduleInactivity() {
    clearTimeout(warningTimer);
    clearTimeout(logoutTimer);
    const idleFor = Date.now() - lastActivity;
    const warningAfter = Math.max(0, 25 * 60 * 1000 - idleFor);
    const logoutAfter = Math.max(0, 30 * 60 * 1000 - idleFor);
    warningTimer = setTimeout(() => {
      const dialog = inactivityDialog();
      if (!dialog.open) dialog.showModal();
      dialog.querySelector('[data-stay]').focus();
    }, warningAfter);
    logoutTimer = setTimeout(() => exitWorkspace(location.pathname), logoutAfter);
  }

  let lastRecordedActivity = 0;
  function noteActivity(force) {
    const now = Date.now();
    if (!force && now - lastRecordedActivity < 1000) return;
    lastRecordedActivity = now;
    lastActivity = now;
    if (authenticatedAt) scheduleInactivity();
  }
  for (const type of activityEvents) addEventListener(type, () => noteActivity(false), { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !authenticatedAt) return;
    const idleFor = Date.now() - lastActivity;
    if (idleFor >= 30 * 60 * 1000) {
      exitWorkspace(location.pathname);
    } else if (idleFor >= 25 * 60 * 1000) {
      scheduleInactivity();
      const dialog = inactivityDialog();
      if (!dialog.open) dialog.showModal();
      dialog.querySelector('[data-stay]').focus();
    } else {
      noteActivity(true);
    }
  });

  function twelveHourClock() {
    if (portal !== 'owner') return;
    const clock = document.getElementById('clock');
    if (!clock) return;
    const update = () => {
      clock.textContent = new Intl.DateTimeFormat('en-ZA', {
        hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
        timeZone: 'Africa/Johannesburg'
      }).format(new Date());
      clock.dateTime = new Date().toISOString();
      clock.setAttribute('aria-label', 'South Africa time ' + clock.textContent);
    };
    update();
    const timer = setInterval(update, 1000);
    addEventListener('pagehide', () => clearInterval(timer), { once: true });
  }

  function encodePath(path) {
    return path.split('/').map(encodeURIComponent).join('/');
  }

  async function signedAvatar(path) {
    const result = await window.KDS.teamApi.request('/storage/v1/object/sign/kds-profile-images/' + encodePath(path), {
      method: 'POST', body: JSON.stringify({ expiresIn: 3600 })
    });
    const value = result?.signedURL || result?.signedUrl;
    if (!value) throw Error('The profile image could not be opened.');
    return value.startsWith('https://') ? value : String(window.KDS.config.supabaseUrl).replace(/\/$/, '') + '/storage/v1' + value;
  }

  function setAvatar(button, url) {
    button.replaceChildren();
    if (!url) {
      button.textContent = 'KD';
      return;
    }
    const image = document.createElement('img');
    image.src = url;
    image.alt = '';
    image.referrerPolicy = 'no-referrer';
    button.append(image);
  }

  async function loadAvatar(button) {
    try {
      const me = window.KDS.teamApi.identity();
      const rows = await window.KDS.teamApi.request('/rest/v1/kds_profiles?select=avatar_path&user_id=eq.' + encodeURIComponent(me.id) + '&limit=1');
      const path = rows?.[0]?.avatar_path;
      if (path) setAvatar(button, await signedAvatar(path));
    } catch (_) {
      setAvatar(button, '');
    }
  }

  function ownerAvatar() {
    if (portal !== 'owner') return;
    const user = document.querySelector('.a-user');
    const old = user?.querySelector('.a-av');
    if (!user || !old) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'v8-owner-avatar';
    button.setAttribute('aria-label', 'Change owner profile image');
    button.textContent = 'KD';
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.hidden = true;
    old.replaceWith(button);
    user.append(input);
    button.onclick = () => input.click();
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size < 1 || file.size > 3 * 1024 * 1024) {
        toast('Choose a JPG, PNG or WebP image up to 3 MB.');
        input.value = '';
        return;
      }
      button.setAttribute('aria-busy', 'true');
      try {
        await window.KDS.teamApi.check();
        const prepared = await window.KDS.teamApi.request('/rest/v1/rpc/kds_prepare_profile_avatar', {
          method: 'POST', body: JSON.stringify({ p_mime: file.type, p_size: file.size })
        });
        const path = Array.isArray(prepared) ? prepared[0]?.object_path || prepared[0] : prepared?.object_path || prepared;
        if (typeof path !== 'string' || !path.includes('/')) throw Error('The service did not prepare a profile-image upload.');
        await window.KDS.teamApi.request('/storage/v1/object/kds-profile-images/' + encodePath(path), {
          method: 'POST',
          headers: { 'Content-Type': file.type, 'x-upsert': 'false' },
          body: file
        });
        await window.KDS.teamApi.request('/rest/v1/rpc/kds_complete_profile_avatar', {
          method: 'POST', body: JSON.stringify({ p_path: path })
        });
        setAvatar(button, await signedAvatar(path));
        toast('Profile image updated.');
      } catch (error) {
        toast(error?.message || 'The profile image was not changed.');
      } finally {
        button.removeAttribute('aria-busy');
        input.value = '';
      }
    };
    loadAvatar(button);
  }

  async function revalidateHistory(event) {
    if (!event.persisted || !authenticatedAt) return;
    document.body.classList.add('v8-session-checking');
    setProtectedInert(true);
    root.dataset.authState = 'restoring';
    try {
      const expectedKey = portal === 'owner' ? 'kds_owner_session' : portal === 'developer' ? 'kds_developer_session' : 'kds_client_session';
      if (!sessionStorage.getItem(expectedKey)) throw Error('Local session ended.');
      await window.KDS.teamApi.check();
      root.dataset.authState = 'ready';
      document.body.classList.remove('v8-session-checking');
      setProtectedInert(false);
      noteActivity(true);
    } catch (_) {
      clearLocalSession();
      location.replace(location.pathname);
    }
  }
  addEventListener('pageshow', revalidateHistory);

  function protectSensitiveOwnerActions() {
    if (portal !== 'owner') return;
    const wrap = name => {
      const original = window[name];
      if (typeof original !== 'function' || original.v8FreshnessWrapped) return;
      const guarded = function (...args) {
        if (Date.now() - authenticatedAt > 15 * 60 * 1000) {
          toast('Please sign in again before changing owner access settings.');
          setTimeout(() => exitWorkspace(location.pathname), 500);
          return;
        }
        return original.apply(this, args);
      };
      guarded.v8FreshnessWrapped = true;
      window[name] = guarded;
    };
    wrap('saveAccess');
    window.KDSRecentOwner = {
      isFresh: () => Date.now() - authenticatedAt <= 15 * 60 * 1000,
      require: () => {
        if (Date.now() - authenticatedAt <= 15 * 60 * 1000) return true;
        toast('Please sign in again before continuing.');
        setTimeout(() => exitWorkspace(location.pathname), 500);
        return false;
      }
    };
  }

  addEventListener('kds:ready', async () => {
    authenticatedAt = Date.now();
    lastActivity = authenticatedAt;
    await loaderHold();
    twelveHourClock();
    ownerAvatar();
    protectSensitiveOwnerActions();
    scheduleInactivity();
  });

  addEventListener('pagehide', () => {
    clearTimeout(warningTimer);
    clearTimeout(logoutTimer);
  }, { once: true });
})();
