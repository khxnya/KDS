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
