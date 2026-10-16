/*
 * PWA Maker GUI v2 — paste into the console / bookmarklet / userscript.
 *
 *  - Jelly windows: drag the title bar, corners follow with spring physics (like Linux "wobbly windows")
 *  - Smooth pop-in on open, smooth shrink-out on close
 *  - Create App      -> builds manifest.json, injects it, asks the browser to install
 *  - Install App     -> triggers the browser install prompt
 *  - View JSON       -> opens a separate read-only window with Copy
 *  - Inject to App   -> adds an always-on-top floating button (bottom-right by default) that opens your link
 *  - Launching the script again closes the previous instance.
 */

/* ------------------------------------------------------------------------
 * Floating badge installer. Self-contained on purpose: it is also serialised
 * (toString) to produce a standalone snippet you can paste anywhere.
 * ---------------------------------------------------------------------- */
function badgeInstaller(cfg) {
  var doc = document, ID = '__pwa_badge__';
  var prev = doc.getElementById(ID);
  if (prev) prev.remove();

  var safeColor = function (c, d) { return /^#[0-9a-f]{3,8}$/i.test(c || '') ? c : d; };
  var bg = safeColor(cfg.bg, '#6c7bff'), fg = safeColor(cfg.fg, '#ffffff');
  var size = Math.max(32, Math.min(120, +cfg.size || 52));
  var op = Math.max(0.2, Math.min(1, +cfg.opacity || 0.9));
  var parts = String(cfg.corner || 'bottom-right').split('-');
  var v = parts[0] === 'top' ? 'top' : 'bottom';
  var hz = parts[1] === 'left' ? 'left' : 'right';
  var ox = +cfg.ox || 0, oy = +cfg.oy || 0;
  var shape = cfg.shape || 'circle';
  var radius = shape === 'circle' ? '50%' : shape === 'pill' ? size + 'px' : Math.round(size * 0.28) + 'px';
  var showLabel = shape === 'pill' && !!cfg.label;

  var host = doc.createElement('div');
  host.id = ID;
  host.style.cssText = 'position:fixed;inset:auto;margin:0;padding:0;border:0;background:transparent;' +
    'overflow:visible;width:0;height:0;z-index:2147483647;';
  host.style[v] = 'calc(' + oy + 'px + env(safe-area-inset-' + v + ', 0px))';
  host.style[hz] = 'calc(' + ox + 'px + env(safe-area-inset-' + hz + ', 0px))';

  var root = host.attachShadow({ mode: 'open' });
  var style = doc.createElement('style');
  style.textContent =
    '*{box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
    '.wrap{position:absolute;' + v + ':0;' + hz + ':0}' +
    'button{all:unset;box-sizing:border-box;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;' +
    'height:' + size + 'px;' + (showLabel ? 'padding:0 ' + Math.round(size * 0.42) + 'px;' : 'width:' + size + 'px;') +
    'border-radius:' + radius + ';background:' + bg + ';color:' + fg + ';opacity:' + op + ';' +
    'font-size:' + Math.round(size * 0.28) + 'px;font-weight:700;white-space:nowrap;' +
    (cfg.shadow === false ? '' : 'box-shadow:0 6px 20px rgba(0,0,0,.35);') +
    'transform-origin:' + hz + ' ' + v + ';' +
    'transition:transform .28s cubic-bezier(.34,1.56,.64,1),opacity .2s,filter .2s;' +
    'animation:pop .5s cubic-bezier(.34,1.56,.64,1) backwards}' +
    'button:hover{transform:scale(1.08);filter:brightness(1.1);opacity:1}' +
    'button:active{transform:scale(.94)}' +
    'button:focus-visible{outline:2px solid ' + fg + ';outline-offset:2px}' +
    '.out button{animation:none;transform:scale(.3);opacity:0;transition:transform .24s ease,opacity .2s ease}' +
    'img{width:' + Math.round(size * 0.58) + 'px;height:' + Math.round(size * 0.58) + 'px;object-fit:contain;border-radius:' +
    Math.round(size * 0.12) + 'px;pointer-events:none}' +
    '.glyph{font-size:' + Math.round(size * 0.5) + 'px;line-height:1;pointer-events:none}' +
    '@keyframes pop{from{transform:scale(.3);opacity:0}to{transform:scale(1);opacity:' + op + '}}';
  root.appendChild(style);

  var wrap = doc.createElement('div');
  wrap.className = 'wrap';
  var btn = doc.createElement('button');
  btn.type = 'button';
  var tip = cfg.tip || cfg.label || cfg.url || 'Open';
  btn.title = tip;
  btn.setAttribute('aria-label', tip);

  var icon = String(cfg.icon || '').trim();
  if (icon && /^(https?:|data:image\/|blob:|\/|\.\/)/i.test(icon)) {
    var img = doc.createElement('img');
    img.alt = '';
    img.src = icon;
    btn.appendChild(img);
  } else if (icon || !showLabel) {
    var g = doc.createElement('span');
    g.className = 'glyph';
    g.textContent = icon || '\u2197';
    btn.appendChild(g);
  }
  if (showLabel) {
    var l = doc.createElement('span');
    l.textContent = cfg.label;
    btn.appendChild(l);
  }

  btn.addEventListener('click', function () {
    var u;
    try { u = new URL(cfg.url, location.href); } catch (e) { return; }
    if (!/^(https?:|mailto:|tel:)$/.test(u.protocol)) return;
    if (cfg.newTab) window.open(u.href, '_blank', 'noopener,noreferrer');
    else location.assign(u.href);
  });

  wrap.appendChild(btn);
  root.appendChild(wrap);
  doc.documentElement.appendChild(host);

  // top layer: stays above dialogs / fullscreen-ish overlays where supported
  try {
    if (host.showPopover) { host.setAttribute('popover', 'manual'); host.showPopover(); }
  } catch (e) { /* fall back to z-index */ }

  window.__pwaBadgeRemove = function () {
    wrap.classList.add('out');
    setTimeout(function () { host.remove(); }, 260);
  };
}

/* ------------------------------------------------------------------------
 * PWA Maker
 * ---------------------------------------------------------------------- */
(function pwaMakerGUI() {
  'use strict';

  // ---- close any previous instance ----------------------------------------
  if (typeof window.__pwaMakerDestroy === 'function') {
    try { window.__pwaMakerDestroy(); } catch (e) { /* ignore */ }
  }

  const doc = document;
  const abs = (u, base) => { try { return new URL(u, base || location.href).href; } catch (e) { return ''; } };
  const metaContent = (sel) => (doc.querySelector(sel) || {}).content || '';
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const opt = (v, cur, label) => `<option value="${v}"${v === cur ? ' selected' : ''}>${label || v}</option>`;
  const clamp = (n, lo, hi) => Math.min(Math.max(n, lo), hi);
  const lerp = (a, b, t) => a + (b - a) * t;

  // ---- detect defaults from the page ---------------------------------------
  function detectIcon() {
    const links = [...doc.querySelectorAll(
      'link[rel~="icon"], link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"], link[rel="shortcut icon"]'
    )].filter((l) => l.href);
    let best = null, bestSize = -1;
    for (const l of links) {
      const sizes = [...(l.sizes || [])].map((s) => parseInt(s, 10)).filter(Boolean);
      const size = sizes.length ? Math.max(...sizes) : (l.rel.includes('apple-touch') ? 180 : 16);
      if (size > bestSize) { best = l; bestSize = size; }
    }
    return best ? best.href : location.origin + '/favicon.ico';
  }

  const pageName = metaContent('meta[property="og:site_name"]') || doc.title || location.hostname || 'Web App';
  const defaults = {
    name: pageName,
    short_name: pageName.slice(0, 12),
    description: metaContent('meta[name="description"]') || metaContent('meta[property="og:description"]'),
    start_url: location.href,
    scope: location.origin + '/',
    id: location.origin + '/',
    lang: doc.documentElement.lang || navigator.language || 'en',
    dir: 'auto',
    display: 'standalone',
    orientation: 'any',
    theme_color: /^#[0-9a-f]{6}$/i.test(metaContent('meta[name="theme-color"]')) ? metaContent('meta[name="theme-color"]') : '#000000',
    background_color: '#ffffff',
    categories: '',
    icon: detectIcon()
  };

  // ---- host + shadow DOM ----------------------------------------------------
  const host = doc.createElement('div');
  host.setAttribute('data-pwa-maker', '');
  host.style.cssText = 'position:fixed;inset:auto;top:0;left:0;width:0;height:0;margin:0;padding:0;border:0;' +
    'background:transparent;overflow:visible;z-index:2147483647;';
  const root = host.attachShadow({ mode: 'open' });

  root.innerHTML = `
  <style>
    :host { all: initial; }
    * { box-sizing: border-box; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
    .win { position: absolute; left: 0; top: 0; transform-origin: 0 0; will-change: transform, opacity;
      opacity: 0; transition: opacity .24s ease; backface-visibility: hidden;
      width: 380px; max-width: calc(100vw - 16px); max-height: 88vh; display: flex; flex-direction: column;
      background: #15171c; color: #e8eaf0; border: 1px solid #2b2f3a; border-radius: 14px;
      box-shadow: 0 18px 50px rgba(0,0,0,.5); overflow: hidden; font-size: 13px; }
    .win.in { opacity: 1; }
    .win.out { opacity: 0; transition-duration: .2s; pointer-events: none; }
    .win.drag { box-shadow: 0 30px 80px rgba(0,0,0,.6); }
    .head { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; cursor: grab; flex: none;
      background: linear-gradient(135deg,#2a2f45,#1c1f2b); user-select: none; -webkit-user-select: none; touch-action: none; }
    .win.drag .head { cursor: grabbing; }
    .title { font-weight: 700; font-size: 14px; letter-spacing: .2px; }
    .x { all: unset; cursor: pointer; width: 26px; height: 26px; border-radius: 8px; display: grid; place-items: center;
      font-size: 16px; color: #aab; transition: background .15s, color .15s; }
    .x:hover { background: #e5484d; color: #fff; }
    .body { padding: 12px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; min-height: 0; }
    .body::-webkit-scrollbar { width: 8px; } .body::-webkit-scrollbar-thumb { background: #333847; border-radius: 8px; }
    label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: #9aa0b4; text-transform: uppercase; letter-spacing: .4px; }
    label.chk { flex-direction: row; align-items: center; gap: 8px; text-transform: none; letter-spacing: 0; font-size: 13px; color: #e8eaf0; }
    input, select, textarea { background: #0e1015; color: #e8eaf0; border: 1px solid #2b2f3a; border-radius: 8px;
      padding: 7px 9px; font-size: 13px; outline: none; text-transform: none; letter-spacing: 0; width: 100%; }
    input[type=checkbox] { width: auto; }
    input[type=range] { padding: 0; accent-color: #6c7bff; }
    input:focus, select:focus, textarea:focus { border-color: #6c7bff; }
    input[type=color] { padding: 2px; height: 34px; cursor: pointer; }
    textarea { min-height: 70px; resize: vertical; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; }
    .row { display: flex; gap: 8px; } .row > * { flex: 1; min-width: 0; }
    .icon-row { display: flex; gap: 10px; align-items: flex-end; }
    .preview { width: 56px; height: 56px; flex: none; border-radius: 12px; border: 1px solid #2b2f3a; background: #0e1015 center/contain no-repeat;
      display: grid; place-items: center; font-size: 28px; }
    .sec { font-size: 11px; color: #6c7bff; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; margin-top: 4px; }
    .sc { display: flex; gap: 6px; margin-bottom: 6px; } .sc input { flex: 1; }
    .sc button { flex: none; width: 30px; }
    button.b { all: unset; box-sizing: border-box; cursor: pointer; text-align: center; padding: 8px 10px; border-radius: 9px;
      background: #262a37; color: #e8eaf0; font-size: 12.5px; font-weight: 600; transition: filter .15s, transform .12s; }
    button.b:hover { filter: brightness(1.2); } button.b:active { transform: scale(.96); }
    button.primary { background: linear-gradient(135deg,#6c7bff,#8b5cf6); color: #fff; }
    button.green { background: linear-gradient(135deg,#1fa971,#13c27a); color: #fff; }
    .foot { padding: 10px 12px; border-top: 1px solid #2b2f3a; display: flex; flex-direction: column; gap: 8px; background: #12141a; flex: none; }
    .status { font-size: 12px; line-height: 1.4; color: #9aa0b4; white-space: pre-wrap; min-height: 16px; }
    .status.ok { color: #4ade80; } .status.warn { color: #fbbf24; } .status.err { color: #f87171; }
    .note { font-size: 11.5px; color: #8a90a6; line-height: 1.4; }
    pre.code { margin: 0; flex: 1; overflow: auto; background: #0e1015; border: 1px solid #2b2f3a; border-radius: 8px; padding: 10px;
      font-size: 12px; line-height: 1.5; color: #c4cbe4; white-space: pre-wrap; word-break: break-all; user-select: text; -webkit-user-select: text;
      font-family: ui-monospace, Menlo, Consolas, monospace; cursor: text; min-height: 120px; max-height: 55vh; }
  </style>`;

  // block site hotkeys while typing in the windows
  ['keydown', 'keyup', 'keypress'].forEach((t) => host.addEventListener(t, (e) => e.stopPropagation()));

  /* ======================================================================
   * Jelly window engine
   * Each window = 4 corner springs -> projective transform (matrix3d).
   * Corners near the grab point are stiff, far corners are loose, so the
   * window stretches and wobbles like Compiz "wobbly windows".
   * ==================================================================== */
  const wins = new Set();
  let zTop = 10, rafId = 0, lastT = 0;

  function targets(w) {
    const tw = w.w * w.s, th = w.h * w.s;
    const l = w.x + (w.w - tw) / 2, t = w.y + (w.h - th) / 2;
    return [[l, t], [l + tw, t], [l + tw, t + th], [l, t + th]];
  }

  function setGrab(w, gx, gy) {
    const pts = [[0, 0], [w.w, 0], [w.w, w.h], [0, w.h]];
    const diag = Math.hypot(w.w, w.h) * 0.85;
    pts.forEach((p, i) => {
      const t = clamp(Math.hypot(p[0] - gx, p[1] - gy) / diag, 0, 1);
      w.k[i] = lerp(1700, 260, t);   // stiffness
      w.z[i] = lerp(0.82, 0.30, t);  // damping ratio (low = wobblier)
    });
  }

  function snapCorners(w) {
    const tg = targets(w);
    w.c.forEach((c, i) => { c.x = tg[i][0]; c.y = tg[i][1]; c.vx = 0; c.vy = 0; });
  }

  function idleTransform(w) {
    w.el.style.transform = `translate3d(${Math.round(w.c[0].x)}px,${Math.round(w.c[0].y)}px,0)`;
  }

  function applyMatrix(w) {
    const c = w.c, W = w.w || 1, H = w.h || 1;
    const x0 = c[0].x, y0 = c[0].y, x1 = c[1].x, y1 = c[1].y, x2 = c[2].x, y2 = c[2].y, x3 = c[3].x, y3 = c[3].y;
    const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
    const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
    let a, b, d, e, g, h;
    if (Math.abs(dx3) < 1e-6 && Math.abs(dy3) < 1e-6) {
      a = x1 - x0; b = x3 - x0; d = y1 - y0; e = y3 - y0; g = 0; h = 0;
    } else {
      const det = dx1 * dy2 - dx2 * dy1;
      if (!det) { idleTransform(w); return; }
      g = (dx3 * dy2 - dx2 * dy3) / det;
      h = (dx1 * dy3 - dx3 * dy1) / det;
      a = x1 - x0 + g * x1; b = x3 - x0 + h * x3;
      d = y1 - y0 + g * y1; e = y3 - y0 + h * y3;
    }
    const m = [a / W, d / W, 0, g / W, b / H, e / H, 0, h / H, 0, 0, 1, 0, x0, y0, 0, 1];
    if (m.some((n) => !isFinite(n))) { idleTransform(w); return; }
    w.el.style.transform = 'matrix3d(' + m.join(',') + ')';
  }

  function step(now) {
    rafId = 0;
    const dt = Math.min(0.033, (now - lastT) / 1000 || 0.016);
    lastT = now;
    let active = false;
    for (const w of wins) {
      if (w.idle) continue;
      const tg = targets(w);
      const sub = Math.max(1, Math.ceil(dt / 0.006));
      const hStep = dt / sub;
      for (let n = 0; n < sub; n++) {
        for (let i = 0; i < 4; i++) {
          const c = w.c[i], k = w.k[i], damp = 2 * w.z[i] * Math.sqrt(k);
          c.vx += (k * (tg[i][0] - c.x) - damp * c.vx) * hStep;
          c.vy += (k * (tg[i][1] - c.y) - damp * c.vy) * hStep;
          c.x += c.vx * hStep;
          c.y += c.vy * hStep;
        }
      }
      let err = 0;
      for (let i = 0; i < 4; i++) {
        const c = w.c[i];
        err = Math.max(err, Math.abs(tg[i][0] - c.x), Math.abs(tg[i][1] - c.y), Math.abs(c.vx) * 0.05, Math.abs(c.vy) * 0.05);
      }
      if (!w.dragging && err < 0.08) {
        snapCorners(w);
        w.idle = true;
        if (!w.closing) idleTransform(w); // crisp text when resting
        else applyMatrix(w);
      } else {
        applyMatrix(w);
        active = true;
      }
    }
    if (active) rafId = requestAnimationFrame(step);
  }

  function wake(w) {
    w.idle = false;
    if (!rafId) { lastT = performance.now(); rafId = requestAnimationFrame(step); }
  }

  function front(w) { w.el.style.zIndex = String(++zTop); }

  function createWindow(o) {
    const el = doc.createElement('div');
    el.className = 'win';
    el.innerHTML =
      `<div class="head"><span class="title">${esc(o.title)}</span><button class="x" data-act="close" title="Close">✕</button></div>` +
      `<div class="body">${o.body || ''}</div>` + (o.foot ? `<div class="foot">${o.foot}</div>` : '');
    if (o.width) el.style.width = o.width + 'px';
    el.style.zIndex = String(++zTop);
    root.appendChild(el);

    const w = {
      el, x: o.x, y: o.y, w: el.offsetWidth, h: el.offsetHeight, s: 1,
      c: [0, 1, 2, 3].map(() => ({ x: 0, y: 0, vx: 0, vy: 0 })),
      k: [900, 900, 900, 900], z: [0.5, 0.5, 0.5, 0.5],
      dragging: false, idle: true, closing: false,
      q: (key) => el.querySelector(`[data-k="${key}"]`)
    };
    el._win = w;
    wins.add(w);

    // pop-in start: slightly small and low, then springs to place
    setGrab(w, w.w / 2, 18);
    w.s = 0.86; w.y += 14; snapCorners(w);
    w.s = 1; w.y -= 14;
    applyMatrix(w);
    el.classList.add('in'); // layout was read above, so the opacity transition runs
    wake(w);

    // keep sizes fresh when content changes (e.g. status text grows)
    if ('ResizeObserver' in window) {
      w.ro = new ResizeObserver(() => {
        w.w = el.offsetWidth; w.h = el.offsetHeight;
        if (w.idle && !w.closing) { snapCorners(w); idleTransform(w); }
      });
      w.ro.observe(el);
    }

    // dragging
    const head = el.querySelector('.head');
    el.addEventListener('pointerdown', () => front(w), true);
    head.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button') || e.button > 0 || w.closing) return;
      e.preventDefault();
      head.setPointerCapture(e.pointerId);
      w.dragging = true;
      el.classList.add('drag');
      const ox = e.clientX - w.x, oy = e.clientY - w.y;
      setGrab(w, ox, oy);
      wake(w);

      const move = (ev) => {
        w.x = clamp(ev.clientX - ox, 100 - w.w, window.innerWidth - 100);
        w.y = clamp(ev.clientY - oy, 0, window.innerHeight - 44);
        if (w.idle) wake(w);
      };
      const up = (ev) => {
        w.dragging = false;
        el.classList.remove('drag');
        try { head.releasePointerCapture(ev.pointerId); } catch (err) { /* ignore */ }
        head.removeEventListener('pointermove', move);
        head.removeEventListener('pointerup', up);
        head.removeEventListener('pointercancel', up);
        wake(w);
      };
      head.addEventListener('pointermove', move);
      head.addEventListener('pointerup', up);
      head.addEventListener('pointercancel', up);
    });

    return w;
  }

  function closeWin(w) {
    if (!w || w.closing) return;
    w.closing = true;
    w.dragging = false;
    setGrab(w, w.w / 2, 18);
    w.s = 0.84;
    w.y += 10;
    w.el.classList.remove('in');
    w.el.classList.add('out');
    wake(w);
    setTimeout(() => {
      if (w.ro) w.ro.disconnect();
      w.el.remove();
      wins.delete(w);
    }, 240);
  }

  /* ======================================================================
   * Main window
   * ==================================================================== */
  const MAIN_BODY = `
      <div class="sec">Identity</div>
      <label>Name <input data-k="name" value="${esc(defaults.name)}"></label>
      <label>Short name <input data-k="short_name" value="${esc(defaults.short_name)}"></label>
      <label>Description <textarea data-k="description" style="min-height:48px;font-family:inherit;font-size:13px">${esc(defaults.description)}</textarea></label>
      <div class="row">
        <label>Language <input data-k="lang" value="${esc(defaults.lang)}"></label>
        <label>Direction <select data-k="dir">${opt('auto', defaults.dir)}${opt('ltr', defaults.dir)}${opt('rtl', defaults.dir)}</select></label>
      </div>
      <label>Categories (comma separated) <input data-k="categories" placeholder="productivity, utilities" value="${esc(defaults.categories)}"></label>

      <div class="sec">Behaviour</div>
      <label>Start URL <input data-k="start_url" value="${esc(defaults.start_url)}"></label>
      <label>Scope <input data-k="scope" value="${esc(defaults.scope)}"></label>
      <label>App ID <input data-k="id" value="${esc(defaults.id)}"></label>
      <div class="row">
        <label>Display <select data-k="display">
          ${opt('standalone', defaults.display)}${opt('fullscreen', defaults.display)}${opt('minimal-ui', defaults.display)}${opt('browser', defaults.display)}
        </select></label>
        <label>Orientation <select data-k="orientation">
          ${['any', 'natural', 'portrait', 'portrait-primary', 'portrait-secondary', 'landscape', 'landscape-primary', 'landscape-secondary'].map((o) => opt(o, defaults.orientation)).join('')}
        </select></label>
      </div>

      <div class="sec">Colors</div>
      <div class="row">
        <label>Theme <input type="color" data-k="theme_color" value="${esc(defaults.theme_color)}"></label>
        <label>Background <input type="color" data-k="background_color" value="${esc(defaults.background_color)}"></label>
      </div>

      <div class="sec">Icon</div>
      <div class="icon-row">
        <div class="preview" data-k="preview"></div>
        <label style="flex:1">Icon URL <input data-k="icon" value="${esc(defaults.icon)}"></label>
      </div>
      <div class="row">
        <button class="b" data-act="upload">Upload image…</button>
        <label style="justify-content:flex-end">Purpose <select data-k="purpose">${opt('any', 'any')}${opt('maskable', 'any')}</select></label>
      </div>
      <input type="file" accept="image/*" data-k="file" style="display:none">

      <div class="sec">Shortcuts (long-press menu)</div>
      <div data-k="shortcuts"></div>
      <button class="b" data-act="addsc">+ Add shortcut</button>

      <div class="sec">Extra manifest JSON (merged last)</div>
      <textarea data-k="extra" placeholder='{"display_override":["window-controls-overlay","standalone"],"prefer_related_applications":false}'></textarea>`;

  const MAIN_FOOT = `
      <div class="status" data-k="status">Edit anything you like, then press Create App.</div>
      <div class="row">
        <button class="b" data-act="json">View JSON</button>
        <button class="b" data-act="inject">Inject to App</button>
      </div>
      <div class="row">
        <button class="b primary" data-act="create">Create App</button>
        <button class="b green" data-act="install">Install App</button>
      </div>`;

  doc.documentElement.appendChild(host);
  try { if (host.showPopover) { host.setAttribute('popover', 'manual'); host.showPopover(); } } catch (e) { /* z-index fallback */ }

  const main = createWindow({
    title: '📲 PWA Maker', width: 380, body: MAIN_BODY, foot: MAIN_FOOT,
    x: Math.max(8, window.innerWidth - 380 - 16), y: 16
  });
  const mq = main.q;

  function setStatus(msg, kind, w) {
    const s = (w || main).q(w && w !== main ? 'istatus' : 'status');
    if (!s) return;
    s.textContent = msg;
    s.className = 'status' + (kind ? ' ' + kind : '');
  }

  // ---- icon preview / upload ------------------------------------------------
  let uploadedIcon = null;
  const currentIconSrc = () => uploadedIcon || mq('icon').value.trim();
  function refreshPreview() {
    const src = currentIconSrc();
    mq('preview').style.backgroundImage = src ? `url("${src.replace(/"/g, '%22')}")` : 'none';
  }
  mq('icon').addEventListener('input', () => { uploadedIcon = null; refreshPreview(); });
  refreshPreview();
  mq('file').addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { uploadedIcon = r.result; mq('icon').value = `(uploaded) ${f.name}`; refreshPreview(); };
    r.readAsDataURL(f);
  });

  // ---- shortcuts editor -------------------------------------------------------
  function addShortcut(name, url) {
    const row = doc.createElement('div');
    row.className = 'sc';
    row.innerHTML = `<input placeholder="Name" value="${esc(name || '')}"><input placeholder="URL (relative ok)" value="${esc(url || '')}"><button class="b" title="Remove">✕</button>`;
    row.querySelector('button').addEventListener('click', () => row.remove());
    mq('shortcuts').appendChild(row);
  }

  // ---- icon generation ----------------------------------------------------------
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      if (!/^(data|blob):/.test(src)) img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image failed to load'));
      img.src = src;
    });
  }

  async function makeIcons(src, purpose, bg) {
    try {
      const img = await loadImage(src);
      return [192, 512].map((s) => {
        const c = doc.createElement('canvas');
        c.width = c.height = s;
        const x = c.getContext('2d');
        const pad = purpose === 'maskable' ? s * 0.12 : 0;
        if (purpose === 'maskable') { x.fillStyle = bg; x.fillRect(0, 0, s, s); }
        const iw = img.naturalWidth || s, ih = img.naturalHeight || s;
        const r = Math.min((s - 2 * pad) / iw, (s - 2 * pad) / ih);
        const w = iw * r, h = ih * r;
        x.drawImage(img, (s - w) / 2, (s - h) / 2, w, h);
        return { src: c.toDataURL('image/png'), sizes: s + 'x' + s, type: 'image/png', purpose };
      });
    } catch (err) {
      return null; // CORS-tainted or failed to load
    }
  }

  // ---- manifest builder ------------------------------------------------------------
  async function buildManifest() {
    const v = (k) => mq(k).value.trim();
    const m = {
      name: v('name') || defaults.name,
      short_name: v('short_name') || (v('name') || defaults.name).slice(0, 12),
      start_url: abs(v('start_url')) || location.href,
      scope: abs(v('scope')) || location.origin + '/',
      id: abs(v('id')) || location.origin + '/',
      display: v('display'),
      orientation: v('orientation'),
      theme_color: v('theme_color'),
      background_color: v('background_color'),
      lang: v('lang') || 'en',
      dir: v('dir')
    };
    if (v('description')) m.description = v('description');
    const cats = v('categories').split(',').map((s) => s.trim()).filter(Boolean);
    if (cats.length) m.categories = cats;

    const warnings = [];
    if (new URL(m.start_url).origin !== location.origin) warnings.push('Start URL is on a different origin; browsers will reject the manifest.');

    const src = currentIconSrc();
    if (src) {
      const generated = await makeIcons(src, v('purpose'), m.background_color);
      if (generated) {
        m.icons = generated;
      } else {
        m.icons = [{ src: abs(src), sizes: '192x192 512x512', purpose: v('purpose') }];
        warnings.push('Could not resize the icon (blocked by CORS). Using the raw URL — upload the image instead for best results.');
      }
    }

    const shortcuts = [...mq('shortcuts').children].map((row) => {
      const [n, u] = row.querySelectorAll('input');
      return { name: n.value.trim(), url: abs(u.value.trim()) };
    }).filter((s) => s.name && s.url);
    if (shortcuts.length) m.shortcuts = shortcuts;

    const extra = v('extra');
    if (extra) {
      try { Object.assign(m, JSON.parse(extra)); }
      catch (e) { throw new Error('Extra JSON is invalid: ' + e.message); }
    }
    return { manifest: m, warnings };
  }

  // ---- inject manifest + helpers --------------------------------------------------------
  function injectManifest(manifest) {
    if (window.__pwaMakerManifestUrl) { try { URL.revokeObjectURL(window.__pwaMakerManifestUrl); } catch (e) { /* ignore */ } }
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/manifest+json' });
    const url = URL.createObjectURL(blob);
    window.__pwaMakerManifestUrl = url;

    doc.querySelectorAll('link[rel="manifest"]').forEach((l) => l.remove());
    const link = doc.createElement('link');
    link.rel = 'manifest';
    link.href = url;
    doc.head.appendChild(link);

    const setMeta = (name, content) => {
      let m = doc.querySelector(`meta[name="${name}"]`);
      if (!m) { m = doc.createElement('meta'); m.name = name; doc.head.appendChild(m); }
      m.content = content;
    };
    setMeta('theme-color', manifest.theme_color);
    setMeta('mobile-web-app-capable', 'yes');
    setMeta('apple-mobile-web-app-capable', 'yes');
    setMeta('apple-mobile-web-app-title', manifest.short_name);
    if (manifest.icons && manifest.icons[0]) {
      let a = doc.querySelector('link[rel="apple-touch-icon"][data-pwa-maker]');
      if (!a) { a = doc.createElement('link'); a.rel = 'apple-touch-icon'; a.setAttribute('data-pwa-maker', '1'); doc.head.appendChild(a); }
      a.href = manifest.icons[manifest.icons.length - 1].src;
    }
  }

  async function trySW() {
    if (!('serviceWorker' in navigator)) return 'Service workers not supported in this browser.';
    const code = "self.addEventListener('install',e=>self.skipWaiting());" +
      "self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));" +
      "self.addEventListener('fetch',e=>{});";
    const url = URL.createObjectURL(new Blob([code], { type: 'application/javascript' }));
    try {
      await navigator.serviceWorker.register(url);
      return 'Service worker registered.';
    } catch (err) {
      return 'Service worker skipped (browsers only allow a real same-origin sw.js file).';
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
  }

  // ---- install prompt ---------------------------------------------------------------------
  let deferredPrompt = null;
  const onBIP = (e) => {
    e.preventDefault();
    deferredPrompt = e;
    setStatus('Browser says this app is installable. Press Install App.', 'ok');
  };
  const onInstalled = () => { deferredPrompt = null; setStatus('App installed ✔', 'ok'); };
  window.addEventListener('beforeinstallprompt', onBIP);
  window.addEventListener('appinstalled', onInstalled);

  async function install() {
    if (!doc.querySelector('link[rel="manifest"]')) {
      setStatus('Press Create App first so a manifest exists.', 'warn');
      return;
    }
    if (deferredPrompt) {
      const p = deferredPrompt;
      deferredPrompt = null;
      try {
        await p.prompt();
        const { outcome } = await p.userChoice;
        setStatus(outcome === 'accepted' ? 'Installing…' : 'Install dismissed. Press Install App to try again.', outcome === 'accepted' ? 'ok' : 'warn');
      } catch (err) {
        setStatus('Prompt failed: ' + err.message, 'err');
      }
      return;
    }
    setStatus(
      'The browser has not offered an install prompt for this page.\n' +
      'Use the browser menu: ⋮ / ≡ → "Install app" / "Add to Home screen" (Safari: Share → Add to Home Screen).\n' +
      'Chrome sometimes only offers it after the page has loaded with the manifest, so a reload plus the menu option may be needed.',
      'warn'
    );
  }

  /* ======================================================================
   * JSON window (read-only)
   * ==================================================================== */
  let jsonWin = null;
  const alive = (w) => w && wins.has(w) && !w.closing;

  async function openJson() {
    let manifest;
    try { manifest = (await buildManifest()).manifest; }
    catch (err) { setStatus(err.message, 'err'); return; }

    const full = JSON.stringify(manifest, null, 2);
    const shown = JSON.parse(JSON.stringify(manifest));
    (shown.icons || []).forEach((i) => { if (String(i.src).startsWith('data:')) i.src = i.src.slice(0, 48) + '…(generated icon data)'; });
    const text = JSON.stringify(shown, null, 2);

    if (alive(jsonWin)) {
      jsonWin.full = full;
      jsonWin.q('code').textContent = text;
      front(jsonWin);
      return;
    }
    const x = main.x - 440 >= 8 ? main.x - 440 : clamp(main.x + 40, 8, Math.max(8, window.innerWidth - 200));
    jsonWin = createWindow({
      title: '{ } manifest.json', width: 420, x, y: main.y + 40,
      body: `<div class="note">Read-only view. Generated icon data is shortened here; <b>Copy</b> copies the complete JSON.</div><pre class="code" data-k="code"></pre>`,
      foot: `<div class="status" data-k="jstatus"></div><div class="row"><button class="b primary" data-act="jcopy">Copy JSON</button><button class="b" data-act="close">Close</button></div>`
    });
    jsonWin.full = full;
    jsonWin.q('code').textContent = text;
  }

  /* ======================================================================
   * Inject-to-App window (floating badge)
   * ==================================================================== */
  let injWin = null, injIcon = null;
  const INJ_BODY = `
      <div class="note">Adds a floating button on top of this page. Pressing it takes the visitor to your link.</div>
      <label>Link (where the button goes) <input data-k="url" placeholder="https://example.com"></label>
      <label>Label text (pill shape only) <input data-k="label" placeholder="Open"></label>
      <div class="icon-row">
        <div class="preview" data-k="ipreview"></div>
        <label style="flex:1">Icon: image URL, emoji or text <input data-k="iicon" placeholder="🚀  or  https://…/icon.png"></label>
      </div>
      <button class="b" data-act="iupload">Upload icon…</button>
      <input type="file" accept="image/*" data-k="ifile" style="display:none">
      <div class="row">
        <label>Corner <select data-k="corner">${opt('bottom-right', 'bottom-right')}${opt('bottom-left', 'bottom-right')}${opt('top-right', 'bottom-right')}${opt('top-left', 'bottom-right')}</select></label>
        <label>Shape <select data-k="shape">${opt('circle', 'circle')}${opt('pill', 'circle')}${opt('rounded', 'circle', 'rounded square')}</select></label>
      </div>
      <div class="row">
        <label>Offset X (px) <input type="number" data-k="ox" value="16"></label>
        <label>Offset Y (px) <input type="number" data-k="oy" value="16"></label>
      </div>
      <div class="row">
        <label>Size (px) <input type="number" min="32" max="120" data-k="size" value="52"></label>
        <label>Opacity <input type="range" min="0.3" max="1" step="0.05" data-k="opacity" value="0.9"></label>
      </div>
      <div class="row">
        <label>Background <input type="color" data-k="bg" value="#6c7bff"></label>
        <label>Icon / text color <input type="color" data-k="fg" value="#ffffff"></label>
      </div>
      <label>Tooltip <input data-k="tip" placeholder="Shown on hover"></label>
      <label class="chk"><input type="checkbox" data-k="newtab"> Open link in a new tab</label>
      <label class="chk"><input type="checkbox" data-k="shadow" checked> Drop shadow</label>`;
  const INJ_FOOT = `
      <div class="status" data-k="istatus"></div>
      <div class="row"><button class="b" data-act="irem">Remove</button><button class="b" data-act="icopy">Copy snippet</button></div>
      <button class="b primary" data-act="iinject">Inject to App</button>`;

  function checkUrl(u) {
    try {
      const x = new URL(u, location.href);
      return /^(https?:|mailto:|tel:)$/.test(x.protocol) ? x.href : '';
    } catch (e) { return ''; }
  }

  function openInject() {
    if (alive(injWin)) { front(injWin); return; }
    const x = main.x - 360 >= 8 ? main.x - 360 : clamp(main.x + 60, 8, Math.max(8, window.innerWidth - 200));
    injWin = createWindow({ title: '🚀 Inject to App', width: 340, x, y: main.y + 60, body: INJ_BODY, foot: INJ_FOOT });
    injIcon = null;
    const iq = injWin.q;

    const refresh = () => {
      const pv = iq('ipreview');
      const val = injIcon || iq('iicon').value.trim();
      pv.textContent = '';
      pv.style.backgroundImage = 'none';
      if (!val) return;
      if (/^(https?:|data:image\/|blob:|\/|\.\/)/i.test(val)) pv.style.backgroundImage = `url("${val.replace(/"/g, '%22')}")`;
      else pv.textContent = val.slice(0, 4);
    };
    iq('iicon').addEventListener('input', () => { injIcon = null; refresh(); });
    iq('ifile').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => { injIcon = r.result; iq('iicon').value = `(uploaded) ${f.name}`; refresh(); };
      r.readAsDataURL(f);
    });
  }

  function collectBadgeCfg(w) {
    const v = (k) => w.q(k).value.trim();
    return {
      url: checkUrl(v('url')),
      rawUrl: v('url'),
      label: v('label'),
      icon: injIcon || v('iicon'),
      corner: v('corner'), shape: v('shape'),
      ox: +v('ox') || 0, oy: +v('oy') || 0,
      size: +v('size') || 52,
      opacity: +v('opacity') || 0.9,
      bg: v('bg'), fg: v('fg'), tip: v('tip'),
      newTab: w.q('newtab').checked,
      shadow: w.q('shadow').checked
    };
  }

  /* ======================================================================
   * Actions
   * ==================================================================== */
  let busy = false;
  const actions = {
    close: (w) => { if (w === main) destroy(); else closeWin(w); },
    upload: () => mq('file').click(),
    addsc: () => addShortcut('', ''),
    inject: () => openInject(),
    json: () => openJson(),
    install: () => install(),

    async create() {
      if (busy) return;
      busy = true;
      setStatus('Building manifest…');
      try {
        const { manifest, warnings } = await buildManifest();
        injectManifest(manifest);
        const swMsg = await trySW();
        let msg = `Manifest created for "${manifest.name}" ✔\n${swMsg}`;
        if (warnings.length) msg += '\n⚠ ' + warnings.join('\n⚠ ');
        setStatus(msg, warnings.length ? 'warn' : 'ok');
        setTimeout(() => install(), 700);
      } catch (err) {
        setStatus(err.message, 'err');
      } finally {
        busy = false;
      }
    },

    async jcopy(w) {
      try {
        await navigator.clipboard.writeText(w.full || '');
        setStatus('Copied the full JSON to the clipboard.', 'ok', w) ;
        const s = w.q('jstatus'); s.textContent = 'Copied the full JSON ✔'; s.className = 'status ok';
      } catch (err) {
        const s = w.q('jstatus'); s.textContent = 'Copy failed — select the text and press Ctrl+C.'; s.className = 'status err';
      }
    },

    iupload: (w) => w.q('ifile').click(),

    iinject(w) {
      const cfg = collectBadgeCfg(w);
      const s = w.q('istatus');
      if (!cfg.rawUrl) { s.textContent = 'Enter a link first.'; s.className = 'status err'; return; }
      if (!cfg.url) { s.textContent = 'Link must start with http(s)://, mailto: or tel:.'; s.className = 'status err'; return; }
      try {
        badgeInstaller(cfg);
        s.textContent = 'Button injected ✔ (it stays until the page reloads)';
        s.className = 'status ok';
      } catch (err) {
        s.textContent = 'Inject failed: ' + err.message; s.className = 'status err';
      }
    },

    irem(w) {
      const s = w.q('istatus');
      if (typeof window.__pwaBadgeRemove === 'function' && doc.getElementById('__pwa_badge__')) {
        window.__pwaBadgeRemove();
        s.textContent = 'Button removed.'; s.className = 'status';
      } else { s.textContent = 'No button on the page.'; s.className = 'status warn'; }
    },

    async icopy(w) {
      const cfg = collectBadgeCfg(w);
      const s = w.q('istatus');
      if (!cfg.url) { s.textContent = 'Enter a valid link first.'; s.className = 'status err'; return; }
      const snippet = '(' + badgeInstaller.toString() + ')(' + JSON.stringify(cfg) + ');';
      try {
        await navigator.clipboard.writeText(snippet);
        s.textContent = 'Standalone snippet copied. Paste it in a userscript to keep the button after reloads.'; s.className = 'status ok';
      } catch (err) { s.textContent = 'Copy failed: ' + err.message; s.className = 'status err'; }
    }
  };

  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const el = b.closest('.win');
    const fn = actions[b.dataset.act];
    if (fn) fn(el && el._win);
  });

  // keep windows reachable when the viewport shrinks
  const onResize = () => {
    wins.forEach((w) => {
      if (w.closing) return;
      w.x = clamp(w.x, 100 - w.w, window.innerWidth - 100);
      w.y = clamp(w.y, 0, window.innerHeight - 44);
      wake(w);
    });
  };
  window.addEventListener('resize', onResize);

  // ---- teardown ------------------------------------------------------------------------------
  let destroyed = false;
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    window.removeEventListener('beforeinstallprompt', onBIP);
    window.removeEventListener('appinstalled', onInstalled);
    window.removeEventListener('resize', onResize);
    if (window.__pwaMakerDestroy === destroy) delete window.__pwaMakerDestroy;
    [...wins].forEach(closeWin);
    setTimeout(() => { if (rafId) cancelAnimationFrame(rafId); host.remove(); }, 300);
  }
  window.__pwaMakerDestroy = destroy;
})();
