// ==UserScript==
// @name         YouTube Player Tools
// @namespace    local.ypt
// @version      1.5.0
// @description  نافذة أدوات يوتيوب: إعادة تشغيل، صورة مصغّرة، إخفاء التعليقات، فلاتر المحتوى، تغذية أنمي بالبحث المباشر (محفوظة محليًا)، حظر قنوات، إلغاء اشتراك جماعي، والمزيد
// @match        *://*/*
// @noframes
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function youtubePlayerTools() {
  'use strict';

  if (typeof window.__yptTeardown === 'function') window.__yptTeardown();
  if (window.top !== window.self) return;

  const IS_YOUTUBE = /(^|\.)youtube\.com$/.test(location.hostname);
  if (!IS_YOUTUBE) { runWrongSiteGui(); return; }

  function runWrongSiteGui() {
    const STYLE_ID = 'ypt-wrongsite-style';
    const WRAP_ID = 'ypt-wrongsite';
    document.getElementById(STYLE_ID)?.remove();
    document.getElementById(WRAP_ID)?.remove();

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${WRAP_ID}{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;font-family:Roboto,"Noto Naskh Arabic",Arial,sans-serif;}
      #${WRAP_ID} .ypt-ws-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(2px);}
      #${WRAP_ID} .ypt-ws-card{position:relative;width:min(320px,86vw);background:rgba(24,24,24,.97);color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:28px 22px 22px;box-shadow:0 16px 48px rgba(0,0,0,.5);text-align:center;animation:yptWsIn .22s cubic-bezier(.2,.8,.2,1);}
      @keyframes yptWsIn{from{opacity:0;transform:scale(.94) translateY(8px);}to{opacity:1;transform:scale(1) translateY(0);}}
      #${WRAP_ID} .ypt-ws-close{position:absolute;top:8px;right:10px;border:0;background:transparent;color:rgba(255,255,255,.55);font-size:18px;line-height:1;cursor:pointer;padding:4px;}
      #${WRAP_ID} .ypt-ws-close:hover{color:#fff;}
      #${WRAP_ID} .ypt-ws-x{width:56px;height:56px;margin:0 auto 14px;border-radius:50%;background:rgba(229,57,53,.15);border:2px solid #e53935;color:#e53935;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;}
      #${WRAP_ID} .ypt-ws-msg{font-size:14px;line-height:1.5;margin-bottom:18px;}
      #${WRAP_ID} .ypt-ws-msg small{display:block;margin-top:4px;color:rgba(255,255,255,.6);font-size:12px;}
      #${WRAP_ID} .ypt-ws-go{border:0;border-radius:999px;padding:10px 26px;font-size:13px;font-weight:700;cursor:pointer;background:#e53935;color:#fff;transition:background .16s ease;}
      #${WRAP_ID} .ypt-ws-go:hover{background:#ff5347;}
    `;
    document.documentElement.appendChild(style);

    const wrap = document.createElement('div');
    wrap.id = WRAP_ID;
    wrap.innerHTML = `
      <div class="ypt-ws-backdrop"></div>
      <div class="ypt-ws-card">
        <button type="button" class="ypt-ws-close" aria-label="Close">×</button>
        <div class="ypt-ws-x">✕</div>
        <div class="ypt-ws-msg">
          Sorry, you're on the wrong site. You should be at YouTube.
          <small>عذرًا، أنت في الموقع الخطأ. يجب أن تكون في يوتيوب.</small>
        </div>
        <button type="button" class="ypt-ws-go">YouTube</button>
      </div>
    `;
    document.documentElement.appendChild(wrap);

    wrap.querySelector('.ypt-ws-go').addEventListener('click', () => { location.href = 'https://youtube.com'; });
    wrap.querySelector('.ypt-ws-close').addEventListener('click', () => wrap.remove());
    wrap.querySelector('.ypt-ws-backdrop').addEventListener('click', () => wrap.remove());

    window.__yptTeardown = () => {
      document.getElementById(WRAP_ID)?.remove();
      document.getElementById(STYLE_ID)?.remove();
    };
  }

  const STORAGE_KEY = 'ypt-settings-v1';
  const CINEMA_FIX_KEY = 'ypt-cinema-fix-v2';

  const BTN_ID = 'ypt-player-btn';
  const FLOAT_ID = 'ypt-float-btn';
  const MENU_ID = 'ypt-menu';
  const STYLE_ID = 'ypt-styles';
  const FLOAT_POS_KEY = 'ypt-float-pos-v1';
  const UNSUB_FLAG_KEY = 'ypt-open-unsub-v1';
  const SUBS_PATH = '/feed/channels';

  const FLAG_CLASSES = [
    'ypt-cinema', 'ypt-hide-comments', 'ypt-hide-related', 'ypt-hide-endcards', 'ypt-hide-chat',
    'ypt-hide-shorts', 'ypt-smooth', 'ypt-hide-masthead', 'ypt-hide-desc', 'ypt-hide-actions',
    'ypt-hide-merch', 'ypt-hide-playlist', 'ypt-hide-info', 'ypt-focus', 'ypt-mirror',
    'ypt-blur-thumbs', 'ypt-boost'
  ];

  document.documentElement.classList.remove('ypt-cinema');
  document.getElementById(STYLE_ID)?.remove();
  document.getElementById(MENU_ID)?.remove();

  const defaults = {
    lang: 'ar',
    autoReplay: false,
    hideComments: false, hideRelated: false, hideEndCards: false, hideChat: false,
    hideShorts: false, hideMasthead: false, hideDesc: false, hideActions: false,
    hideMerch: false, hidePlaylist: false, hideInfo: false,
    focusMode: false, mirror: false, blurThumbs: false, boost: false,
    smoothUi: true, cinema: false,
    filterAnime: false, filterCustomOn: false, filterKeywords: '',
    blockedChannels: []
  };

  const state = loadSettings();

  const runtime = {
    replayTimer: null, lastTime: -1, stallCounter: 0,
    menuOpen: false, forceLoadBusy: false, closing: false,
    audioCtx: null, gain: null, mediaSource: null,
    view: 'main',
    unsubChannels: [], unsubSelected: new Set(),
    floatDragging: false,
    filterDebTimer: null,
    animeFeedToken: 0, animeFeedFetching: false, animeFeedData: null
  };

  function loadSettings() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; } catch { saved = {}; }
    const next = { ...defaults, ...saved };
    if (!Array.isArray(next.blockedChannels)) next.blockedChannels = [];
    if (typeof next.filterKeywords !== 'string') next.filterKeywords = '';
    if (!localStorage.getItem(CINEMA_FIX_KEY)) {
      next.cinema = false;
      try {
        localStorage.setItem(CINEMA_FIX_KEY, '1');
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch { /* ignore */ }
    }
    return next;
  }

  function saveSettings() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }

  function t(en, ar) { return state.lang === 'ar' ? ar : en; }

  function videoId() {
    const u = new URL(location.href);
    if (u.searchParams.get('v')) return u.searchParams.get('v');
    const short = location.pathname.match(/\/shorts\/([^/?]+)/);
    if (short) return short[1];
    const live = location.pathname.match(/\/live\/([^/?]+)/);
    if (live) return live[1];
    return document.querySelector('ytd-watch-flexy')?.getAttribute('video-id') || '';
  }

  function videoEl() {
    const player = document.querySelector('#movie_player, .html5-video-player');
    return player?.querySelector('video') || document.querySelector('video.html5-main-video') || document.querySelector('video');
  }

  function playerRoot() { return document.querySelector('#movie_player, .html5-video-player'); }

  function injectStyles() {
    document.getElementById(STYLE_ID)?.remove();
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${BTN_ID}{display:inline-flex;align-items:center;justify-content:center;}
      #${BTN_ID} svg{pointer-events:none;}
      #${BTN_ID}.ypt-active svg path{fill:#3ea6ff;}

      #${MENU_ID}{position:absolute;right:12px;left:auto;bottom:58px;width:280px;z-index:80;color:#fff;
        font-family:"YouTube Noto","Roboto","Noto Naskh Arabic",Arial,sans-serif;transform-origin:bottom right;
        background:rgba(28,28,28,.96);border:1px solid rgba(255,255,255,.12);border-radius:12px;
        box-shadow:0 8px 28px rgba(0,0,0,.55);backdrop-filter:blur(16px);overflow:hidden;
        animation:yptIn .2s cubic-bezier(.2,.8,.2,1);}
      #${MENU_ID}.ypt-out{animation:yptOut .16s ease-in forwards;}
      @keyframes yptIn{from{opacity:0;transform:translateY(10px) scale(.96);}to{opacity:1;transform:translateY(0) scale(1);}}
      @keyframes yptOut{to{opacity:0;transform:translateY(8px) scale(.97);}}

      .ypt-head{display:flex;align-items:center;gap:10px;padding:10px 12px 8px;border-bottom:1px solid rgba(255,255,255,.08);}
      .ypt-title{flex:1;font-size:13px;font-weight:600;min-width:0;}
      .ypt-lang{display:flex;flex:0 0 auto;background:rgba(255,255,255,.08);border-radius:999px;padding:2px;}
      .ypt-lang button{border:0;background:transparent;color:rgba(255,255,255,.7);font:700 11px/1 "Roboto",Arial,sans-serif;padding:5px 9px;border-radius:999px;cursor:pointer;transition:background .18s ease,color .18s ease;}
      .ypt-lang button.on{background:#fff;color:#0f0f0f;}

      /* Shorter menu: this is the "too tall" fix — capped height + tighter row padding */
      .ypt-list{padding:4px 0 6px;max-height:min(46vh,300px);overflow:auto;}
      .ypt-section{padding:8px 14px 3px;font-size:11px;color:rgba(255,255,255,.45);font-weight:600;}
      .ypt-item{width:100%;display:flex;align-items:center;gap:12px;border:0;background:transparent;color:#fff;padding:7px 14px;cursor:pointer;font-size:13px;text-align:inherit;transition:background .16s ease;}
      .ypt-item:hover{background:rgba(255,255,255,.08);}
      .ypt-item:active{background:rgba(255,255,255,.12);}
      .ypt-ico{width:20px;height:20px;flex:0 0 20px;display:grid;place-items:center;opacity:.92;}
      .ypt-ico svg{width:18px;height:18px;}
      .ypt-label{flex:1;line-height:1.2;}
      .ypt-sub{display:block;font-size:10.5px;color:rgba(255,255,255,.5);margin-top:1px;}

      .ypt-switch{width:32px;height:17px;border-radius:99px;background:#606060;position:relative;flex:0 0 32px;transition:background .2s ease;}
      .ypt-switch::after{content:"";position:absolute;top:2px;left:2px;width:13px;height:13px;border-radius:50%;background:#fff;transition:transform .2s cubic-bezier(.2,.8,.2,1);}
      .ypt-item.on .ypt-switch{background:#3ea6ff;}
      .ypt-item.on .ypt-switch::after{transform:translateX(15px);}

      .ypt-speeds{display:flex;flex-wrap:wrap;gap:6px;padding:4px 14px 8px;}
      .ypt-chip{border:0;border-radius:999px;padding:5px 10px;cursor:pointer;background:rgba(255,255,255,.08);color:#fff;font-size:12px;font-weight:600;transition:background .16s ease;}
      .ypt-chip:hover{background:rgba(255,255,255,.16);}

      html.ypt-hide-comments #comments, html.ypt-hide-comments ytd-comments, html.ypt-hide-comments #comment-teaser{display:none !important;}
      html.ypt-hide-related #related, html.ypt-hide-related ytd-watch-next-secondary-results-renderer{display:none !important;}
      html.ypt-hide-endcards .ytp-ce-element, html.ypt-hide-endcards .ytp-cards-teaser, html.ypt-hide-endcards .ytp-endscreen-content, html.ypt-hide-endcards .ytp-fullscreen-grid-sticker, html.ypt-hide-endcards .ytp-suggested-action{display:none !important;}
      html.ypt-hide-chat #chat, html.ypt-hide-chat #chat-container, html.ypt-hide-chat ytd-live-chat-frame{display:none !important;}
      html.ypt-hide-shorts ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts]), html.ypt-hide-shorts ytd-reel-shelf-renderer, html.ypt-hide-shorts ytm-shorts-lockup-view-model{display:none !important;}
      html.ypt-hide-masthead #masthead-container{transform:translateY(-100%);pointer-events:none;}
      html.ypt-hide-masthead #masthead-container, html.ypt-hide-masthead ytd-app{transition:transform .4s cubic-bezier(.2,.8,.2,1);}
      html.ypt-hide-desc #description, html.ypt-hide-desc ytd-text-inline-expander, html.ypt-hide-desc #bottom-row{display:none !important;}
      html.ypt-hide-actions #actions, html.ypt-hide-actions #top-level-buttons-computed, html.ypt-hide-actions ytd-menu-renderer.ytd-watch-metadata{display:none !important;}
      html.ypt-hide-merch ytd-merch-shelf-renderer, html.ypt-hide-merch ytd-ticket-shelf-renderer, html.ypt-hide-merch #offer-module, html.ypt-hide-merch ytd-video-masthead-ad-v3-renderer{display:none !important;}
      html.ypt-hide-playlist #playlist, html.ypt-hide-playlist ytd-playlist-panel-renderer{display:none !important;}
      html.ypt-hide-info #owner, html.ypt-hide-info ytd-video-owner-renderer{display:none !important;}
      html.ypt-focus #below, html.ypt-focus #secondary, html.ypt-focus #comments, html.ypt-focus #chat, html.ypt-focus #related{display:none !important;}
      html.ypt-mirror video.html5-main-video{transform:scaleX(-1);}
      html.ypt-blur-thumbs ytd-thumbnail img, html.ypt-blur-thumbs yt-image img{filter:blur(14px);transition:filter .28s ease;}
      html.ypt-blur-thumbs ytd-thumbnail:hover img, html.ypt-blur-thumbs yt-image:hover img{filter:none;}
      html.ypt-smooth, html.ypt-smooth body{scroll-behavior:smooth;}
      html.ypt-smooth ytd-watch-flexy, html.ypt-smooth #page-manager, html.ypt-smooth #columns, html.ypt-smooth #primary, html.ypt-smooth #secondary, html.ypt-smooth #below{transition:padding .28s ease,margin .28s ease,width .28s ease,opacity .22s ease;}
      html.ypt-smooth ytd-thumbnail, html.ypt-smooth ytd-rich-item-renderer, html.ypt-smooth ytd-video-renderer{transition:transform .22s cubic-bezier(.2,.8,.2,1),opacity .22s ease;}
      html.ypt-cinema ytd-player, html.ypt-cinema #movie_player{position:relative;z-index:4;box-shadow:0 0 0 100vmax rgba(0,0,0,.72);}

      .ypt-toast{position:fixed;bottom:88px;left:50%;transform:translateX(-50%);background:rgba(28,28,28,.95);color:#fff;padding:10px 16px;border-radius:8px;font:13px/1.3 "YouTube Noto",Roboto,Arial,sans-serif;z-index:2147483647;pointer-events:none;animation:yptIn .16s ease;}

      #${FLOAT_ID}{position:fixed;width:50px;height:50px;border-radius:50%;background:rgba(24,24,24,.92);border:1px solid rgba(255,255,255,.16);box-shadow:0 6px 20px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;cursor:grab;touch-action:none;z-index:2147483000;transition:box-shadow .15s ease,transform .1s ease;}
      #${FLOAT_ID} svg{width:24px;height:24px;pointer-events:none;}
      #${FLOAT_ID}:hover{box-shadow:0 8px 26px rgba(0,0,0,.6);}
      #${FLOAT_ID}.ypt-dragging{cursor:grabbing;transition:none;transform:scale(.96);}
      #${MENU_ID}.ypt-menu-floating{position:fixed;right:auto;left:auto;bottom:auto;z-index:2147483001;transform-origin:top left;}

      .ypt-filtered-out{display:none !important;}
      .ypt-anime-pending{opacity:.5;filter:grayscale(.4);}

      .ypt-backrow{display:flex;align-items:center;gap:8px;cursor:pointer;border:0;background:transparent;color:rgba(255,255,255,.75);font-size:12px;padding:2px 4px;margin-right:4px;}
      .ypt-backrow:hover{color:#fff;}
      .ypt-empty{padding:18px 14px;font-size:12px;color:rgba(255,255,255,.5);text-align:center;}

      .ypt-blk-row, .ypt-unsub-row{display:flex;align-items:center;gap:10px;padding:8px 14px;font-size:13px;}
      .ypt-unsub-row{cursor:pointer;}
      .ypt-unsub-row:hover{background:rgba(255,255,255,.06);}
      .ypt-blk-name, .ypt-unsub-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .ypt-blk-remove{border:0;background:rgba(255,255,255,.08);color:#fff;border-radius:999px;width:22px;height:22px;cursor:pointer;font-size:13px;line-height:1;flex:0 0 auto;}
      .ypt-blk-remove:hover{background:rgba(229,57,53,.6);}
      .ypt-unsub-check{width:16px;height:16px;flex:0 0 auto;border-radius:4px;border:1.5px solid rgba(255,255,255,.4);display:flex;align-items:center;justify-content:center;font-size:11px;}
      .ypt-unsub-row.on .ypt-unsub-check{background:#3ea6ff;border-color:#3ea6ff;}

      .ypt-footer-row{display:flex;gap:8px;padding:10px 14px;border-top:1px solid rgba(255,255,255,.08);}
      .ypt-footer-btn{flex:1;border:0;border-radius:8px;padding:9px 10px;font-size:12px;font-weight:600;cursor:pointer;background:rgba(255,255,255,.08);color:#fff;}
      .ypt-footer-btn.ypt-primary{background:#3ea6ff;color:#06233b;}
      .ypt-footer-btn.ypt-danger{background:#e53935;color:#fff;}
      .ypt-footer-btn:hover{filter:brightness(1.1);}
    `;
    document.documentElement.appendChild(style);
  }

  function toast(msg) {
    document.querySelectorAll('.ypt-toast').forEach((n) => n.remove());
    const el = document.createElement('div');
    el.className = 'ypt-toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1800);
  }

  function applyPageFlags() {
    const root = document.documentElement;
    root.classList.toggle('ypt-hide-comments', state.hideComments);
    root.classList.toggle('ypt-hide-related', state.hideRelated);
    root.classList.toggle('ypt-hide-endcards', state.hideEndCards);
    root.classList.toggle('ypt-hide-chat', state.hideChat);
    root.classList.toggle('ypt-hide-shorts', state.hideShorts);
    root.classList.toggle('ypt-hide-masthead', state.hideMasthead);
    root.classList.toggle('ypt-hide-desc', state.hideDesc);
    root.classList.toggle('ypt-hide-actions', state.hideActions);
    root.classList.toggle('ypt-hide-merch', state.hideMerch);
    root.classList.toggle('ypt-hide-playlist', state.hidePlaylist);
    root.classList.toggle('ypt-hide-info', state.hideInfo);
    root.classList.toggle('ypt-focus', state.focusMode);
    root.classList.toggle('ypt-mirror', state.mirror);
    root.classList.toggle('ypt-blur-thumbs', state.blurThumbs);
    root.classList.toggle('ypt-smooth', state.smoothUi);
    root.classList.toggle('ypt-cinema', state.cinema);

    syncReplay();
    syncBoost();
    syncButton();
    scheduleFilterRun();
  }

  /*
   * ============================================================
   * ANIME HOME FEED
   * ============================================================
   * Instead of hiding non-matching items in the existing home
   * feed, this fetches YouTube's own search-results page for a
   * query (default "anime", or the first custom keyword if set),
   * pulls the embedded ytInitialData JSON out of the HTML the
   * same way the page itself would, and reuses those results to
   * overwrite the video/short slots already rendered on the
   * home page: videos go into the normal video slots, shorts go
   * into the shorts slots.
   *
   * Results are cached in localStorage per query, so re-opening
   * the tab (or re-running the script) shows the same feed
   * instantly from cache, while a background refresh keeps it
   * from going stale.
   *
   * Limitation: turning this off does not restore the original
   * titles/thumbnails, since they were overwritten in place —
   * a reload or navigating away and back brings the real feed
   * back.
   */

  const ANIME_FEED_CACHE_PREFIX = 'ypt-anime-feed-cache-v1:';
  const ANIME_FEED_TTL_MS = 30 * 60 * 1000;
  const ANIME_FEED_DEFAULT_QUERY = 'anime';

  function animeFeedQuery() {
    if (state.filterCustomOn && state.filterKeywords) {
      const first = state.filterKeywords.split(',')[0].trim();
      if (first) return first;
    }
    return ANIME_FEED_DEFAULT_QUERY;
  }

  function animeFeedCacheKey(query) {
    return `${ANIME_FEED_CACHE_PREFIX}${query.toLowerCase()}`;
  }

  function loadAnimeFeedCache(query) {
    try {
      const raw = localStorage.getItem(animeFeedCacheKey(query));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.videos) || !Array.isArray(parsed.shorts)) return null;
      return parsed;
    } catch { return null; }
  }

  function saveAnimeFeedCache(query, data) {
    try {
      localStorage.setItem(animeFeedCacheKey(query), JSON.stringify({
        time: Date.now(),
        videos: data.videos.slice(0, 60),
        shorts: data.shorts.slice(0, 40)
      }));
    } catch { /* ignore */ }
  }

  // Generic "find the balanced {...} object starting at this brace" scanner,
  // reused for both the search page's ytInitialData and, if you extend this
  // later, any other inline JSON blob YouTube embeds in its HTML.
  function extractBalancedJson(text, startIndex) {
    if (!text || startIndex < 0 || startIndex >= text.length || text[startIndex] !== '{') return null;
    let depth = 0, inString = false, escaped = false;
    for (let i = startIndex; i < text.length; i++) {
      const ch = text[i];
      if (inString) {
        if (escaped) { escaped = false; continue; }
        if (ch === '\\') { escaped = true; continue; }
        if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') { inString = true; continue; }
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) return text.slice(startIndex, i + 1);
      }
    }
    return null;
  }

  function extractYtInitialData(html) {
    const markers = ['var ytInitialData = ', 'window["ytInitialData"] = ', 'ytInitialData = '];
    for (const marker of markers) {
      const start = html.indexOf(marker);
      if (start === -1) continue;
      const jsonStart = html.indexOf('{', start + marker.length);
      if (jsonStart === -1) continue;
      const jsonStr = extractBalancedJson(html, jsonStart);
      if (!jsonStr) continue;
      try { return JSON.parse(jsonStr); } catch { /* try next marker */ }
    }
    return null;
  }

  function parseSearchResults(data) {
    const videos = [];
    const shorts = [];
    const sections = data?.contents?.twoColumnSearchResultsRenderer
      ?.primaryContents?.sectionListRenderer?.contents || [];

    for (const section of sections) {
      const items = section?.itemSectionRenderer?.contents || [];
      for (const item of items) {
        if (item.videoRenderer) {
          const v = item.videoRenderer;
          if (!v.videoId) continue;
          videos.push({
            id: v.videoId,
            title: v.title?.runs?.map((r) => r.text).join('') || v.title?.simpleText || '',
            thumb: v.thumbnail?.thumbnails?.slice(-1)[0]?.url || '',
            channel: v.ownerText?.runs?.[0]?.text || v.longBylineText?.runs?.[0]?.text || '',
            duration: v.lengthText?.simpleText || '',
            views: v.shortViewCountText?.simpleText || v.viewCountText?.simpleText || ''
          });
        } else if (item.reelShelfRenderer) {
          const reelItems = item.reelShelfRenderer.items || [];
          for (const reel of reelItems) {
            const src = reel.reelItemRenderer || reel.shortsLockupViewModel;
            if (!src) continue;
            const id = src.videoId
              || src.onTap?.innertubeCommand?.reelWatchEndpoint?.videoId
              || '';
            if (!id) continue;
            const thumb = src.thumbnail?.thumbnails?.slice(-1)[0]?.url
              || src.thumbnail?.sources?.slice(-1)[0]?.url
              || '';
            const title = src.headline?.simpleText
              || src.overlayMetadata?.primaryText?.content
              || '';
            shorts.push({ id, title, thumb });
          }
        }
      }
    }
    return { videos, shorts };
  }

  async function scrapeAnimeSearchResults(query) {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const response = await fetch(url, { method: 'GET', credentials: 'same-origin' });
    if (!response.ok) throw new Error(`http-${response.status}`);
    const html = await response.text();
    const data = extractYtInitialData(html);
    if (!data) throw new Error('no-data');
    return parseSearchResults(data);
  }

  function isHomeFeedPage() { return location.pathname === '/'; }

  function collectHomeVideoSlots() {
    return Array.from(document.querySelectorAll('ytd-rich-item-renderer'))
      .filter((el) => !el.querySelector('ytm-shorts-lockup-view-model, ytd-reel-shelf-renderer, ytd-reel-item-renderer'));
  }

  function collectHomeShortsSlots() {
    return Array.from(document.querySelectorAll('ytm-shorts-lockup-view-model, ytd-reel-item-renderer'));
  }

  function applyVideoToSlot(slot, video) {
    try {
      const titleEl = slot.querySelector('#video-title');
      const thumbImg = slot.querySelector('ytd-thumbnail img, a#thumbnail img, img');
      const channelEl = slot.querySelector('#channel-name #text, ytd-channel-name #text, #text.ytd-channel-name');
      const metaEl = slot.querySelector('#metadata-line, #metadata');

      if (titleEl && video.title) { titleEl.textContent = video.title; titleEl.setAttribute('title', video.title); }
      if (thumbImg && video.thumb) { thumbImg.src = video.thumb; thumbImg.removeAttribute('data-thumb'); }
      if (channelEl && video.channel) channelEl.textContent = video.channel;
      if (metaEl && video.views) metaEl.textContent = video.views;

      slot.querySelectorAll('a[href*="/watch"]').forEach((a) => a.setAttribute('href', `/watch?v=${video.id}`));
      slot.dataset.yptAnimeVideoId = video.id;
      slot.classList.remove('ypt-anime-pending', 'ypt-filtered-out');
    } catch { /* structural mismatch — skip this slot */ }
  }

  function applyShortToSlot(slot, short) {
    try {
      const link = slot.querySelector('a[href*="/shorts/"]') || slot.closest('a[href*="/shorts/"]');
      const img = slot.querySelector('img');
      const titleEl = slot.querySelector('.shortsLockupViewModelHostMetadataTitle, #video-title, h3, span');

      if (link) link.setAttribute('href', `/shorts/${short.id}`);
      if (img && short.thumb) img.src = short.thumb;
      if (titleEl && short.title) titleEl.textContent = short.title;

      slot.dataset.yptAnimeShortId = short.id;
      slot.classList.remove('ypt-anime-pending', 'ypt-filtered-out');
    } catch { /* structural mismatch — skip this slot */ }
  }

  function renderAnimeFeed(data) {
    if (!isHomeFeedPage()) return;
    const videoSlots = collectHomeVideoSlots();
    const shortsSlots = collectHomeShortsSlots();

    videoSlots.forEach((slot, i) => {
      const video = data.videos[i];
      if (video) applyVideoToSlot(slot, video);
      else slot.classList.add('ypt-filtered-out');
    });

    shortsSlots.forEach((slot, i) => {
      const short = data.shorts[i];
      if (short) applyShortToSlot(slot, short);
      else slot.classList.add('ypt-filtered-out');
    });
  }

  function markSlotsPending() {
    if (!isHomeFeedPage()) return;
    collectHomeVideoSlots().concat(collectHomeShortsSlots()).forEach((slot) => {
      if (!slot.dataset.yptAnimeVideoId && !slot.dataset.yptAnimeShortId) {
        slot.classList.add('ypt-anime-pending');
      }
    });
  }

  async function applyAnimeFeed(force = false) {
    if (!state.filterAnime || !isHomeFeedPage()) return;

    const query = animeFeedQuery();
    const cached = loadAnimeFeedCache(query);

    if (cached) {
      runtime.animeFeedData = cached;
      renderAnimeFeed(cached);
    } else {
      markSlotsPending();
    }

    const isFresh = cached && (Date.now() - cached.time) < ANIME_FEED_TTL_MS;
    if (isFresh && !force) return;
    if (runtime.animeFeedFetching) return;

    runtime.animeFeedFetching = true;
    const token = ++runtime.animeFeedToken;

    try {
      const fresh = await scrapeAnimeSearchResults(query);
      if (token !== runtime.animeFeedToken || !state.filterAnime) return;

      if (fresh.videos.length || fresh.shorts.length) {
        saveAnimeFeedCache(query, fresh);
        runtime.animeFeedData = fresh;
        renderAnimeFeed(fresh);
      } else if (!cached) {
        toast(t('No anime results found', 'لم يتم العثور على نتائج أنمي'));
      }
    } catch (error) {
      console.warn('[YPT] anime feed fetch failed', error);
      if (!cached) toast(t('Could not load anime feed', 'تعذّر تحميل تغذية الأنمي'));
    } finally {
      runtime.animeFeedFetching = false;
    }
  }

  // ------------------------------------------------------------
  // Channel blocking / custom keyword filter (unrelated to the
  // anime feed above — this still just hides items in place).
  // ------------------------------------------------------------

  function currentChannelName() {
    return channelName()
      || document.querySelector('#channel-name #text, ytd-channel-name #text, #inner-header-container ytd-channel-name yt-formatted-string, ytd-c4-tabbed-header-renderer #text')?.textContent?.trim()
      || '';
  }

  function isChannelBlocked(name) {
    if (!name) return false;
    const lower = name.toLowerCase();
    return (state.blockedChannels || []).some((b) => {
      const block = String(b).toLowerCase();
      return lower === block || lower.includes(block);
    });
  }

  function activeFilterKeywordSets() {
    const sets = [];
    if (state.filterCustomOn && state.filterKeywords) {
      sets.push(state.filterKeywords.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
    }
    return sets;
  }

  function collectGridItems() {
    return document.querySelectorAll([
      'ytd-rich-item-renderer', 'ytd-video-renderer', 'ytd-grid-video-renderer',
      'ytd-compact-video-renderer', 'ytd-playlist-video-renderer'
    ].join(','));
  }

  function itemText(el) {
    const title = el.querySelector('#video-title, yt-formatted-string#video-title')?.textContent || '';
    const channel = el.querySelector('#channel-name, ytd-channel-name, #text.ytd-channel-name')?.textContent || '';
    return { title: title.trim(), channel: channel.trim() };
  }

  function textMatchesKeywordSets(title, channel, keywordSets) {
    const haystack = `${title} ${channel}`.toLowerCase();
    return keywordSets.some((set) => set.some((keyword) => {
      const k = String(keyword).trim().toLowerCase();
      return k && haystack.includes(k);
    }));
  }

  function applyStandardFilters() {
    const keywordSets = activeFilterKeywordSets();
    const customFilterOn = state.filterCustomOn && state.filterKeywords;

    collectGridItems().forEach((el) => {
      const { title, channel } = itemText(el);
      let hide = isChannelBlocked(channel);
      if (!hide && customFilterOn) {
        if (!textMatchesKeywordSets(title, channel, keywordSets)) hide = true;
      }
      el.classList.toggle('ypt-filtered-out', hide);
    });
  }

  function applyContentFilters() {
    const hasCustom = !!(state.filterCustomOn && state.filterKeywords);
    const hasBlocked = !!(state.blockedChannels && state.blockedChannels.length);

    if (hasCustom || hasBlocked) {
      applyStandardFilters();
    } else {
      collectGridItems().forEach((el) => el.classList.remove('ypt-filtered-out'));
    }

    if (state.filterAnime) {
      applyAnimeFeed();
    } else if (runtime.animeFeedData) {
      collectHomeVideoSlots().concat(collectHomeShortsSlots()).forEach((slot) => {
        slot.classList.remove('ypt-filtered-out', 'ypt-anime-pending');
      });
    }
  }

  function scheduleFilterRun() {
    clearTimeout(runtime.filterDebTimer);
    runtime.filterDebTimer = setTimeout(applyContentFilters, 280);
  }

  function syncReplay() { state.autoReplay ? startReplay() : stopReplay(); }

  function startReplay() {
    stopReplay(false);
    runtime.replayTimer = setInterval(() => {
      const video = videoEl();
      if (!video || !video.duration) return;
      const isNearEnd = video.duration - video.currentTime <= 0.5;
      const isEnded = video.ended;
      if (!video.paused && video.currentTime === runtime.lastTime) runtime.stallCounter += 0.5;
      else runtime.stallCounter = 0;
      runtime.lastTime = video.currentTime;
      if (isEnded || isNearEnd || runtime.stallCounter >= 3.5) {
        video.currentTime = 0;
        video.play().catch(() => {});
        runtime.stallCounter = 0;
      }
    }, 500);
  }

  function stopReplay(reset = true) {
    if (runtime.replayTimer) { clearInterval(runtime.replayTimer); runtime.replayTimer = null; }
    if (reset) { runtime.stallCounter = 0; runtime.lastTime = -1; }
  }

  function syncBoost() {
    const video = videoEl();
    if (!video) return;
    if (!state.boost) { if (runtime.gain) runtime.gain.gain.value = 1; return; }
    try {
      if (!runtime.audioCtx) runtime.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (!runtime.mediaSource) {
        runtime.mediaSource = runtime.audioCtx.createMediaElementSource(video);
        runtime.gain = runtime.audioCtx.createGain();
        runtime.mediaSource.connect(runtime.gain);
        runtime.gain.connect(runtime.audioCtx.destination);
      }
      runtime.gain.gain.value = 2.2;
      runtime.audioCtx.resume?.();
    } catch {
      toast(t('Audio boost unavailable for this video', 'تعزيز الصوت غير متاح لهذا الفيديو'));
      state.boost = false;
      saveSettings();
    }
  }

  function setToggle(key, value) {
    state[key] = value;
    saveSettings();
    applyPageFlags();
  }

  async function downloadThumbnail() {
    const id = videoId();
    if (!id) return toast(t('No video on this page', 'لا يوجد فيديو في هذه الصفحة'));
    const urls = [
      `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
      `https://i.ytimg.com/vi/${id}/sddefault.jpg`,
      `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
    ];
    for (const url of urls) {
      try {
        const res = await fetch(url, { mode: 'cors' });
        if (!res.ok) continue;
        const blob = await res.blob();
        if (blob.size < 2000) continue;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `youtube-${id}-thumb.jpg`;
        a.click();
        URL.revokeObjectURL(a.href);
        toast(t('Thumbnail downloaded', 'تم تنزيل الصورة المصغّرة'));
        return;
      } catch { /* try next */ }
    }
    window.open(urls[0], '_blank');
    toast(t('Opened thumbnail in a new tab', 'فُتحت الصورة المصغّرة في تبويب جديد'));
  }

  async function copyText(text, ok) {
    try { await navigator.clipboard.writeText(text); toast(ok); }
    catch { prompt(t('Copy:', 'انسخ:'), text); }
  }

  function screenshotFrame() {
    const video = videoEl();
    if (!video || !video.videoWidth) return toast(t('Video not ready', 'الفيديو غير جاهز'));
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return toast(t('Could not capture frame', 'تعذّر التقاط الإطار'));
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `youtube-${videoId() || 'frame'}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast(t('Frame saved', 'تم حفظ الإطار'));
    }, 'image/png');
  }

  function eagerLoadImages(root = document) {
    root.querySelectorAll('img').forEach((img) => {
      img.loading = 'eager';
      img.decoding = 'async';
      if (img.dataset.thumb) img.src = img.dataset.thumb;
      const lazy = img.getAttribute('data-src') || img.getAttribute('data-thumb');
      if (lazy && (!img.src || img.src.startsWith('data:'))) img.src = lazy;
    });
  }

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  async function forceLoad() {
    if (runtime.forceLoadBusy) return;
    runtime.forceLoadBusy = true;
    toast(t('Force-loading page content…', 'جارٍ تحميل المحتوى المخفي…'));
    const startY = window.scrollY;
    eagerLoadImages();
    for (let i = 0; i < 18; i++) {
      window.scrollBy({ top: Math.round(window.innerHeight * 0.9), behavior: 'smooth' });
      eagerLoadImages();
      document.querySelectorAll('#expand, tp-yt-paper-button#more, ytd-text-inline-expander #expand').forEach((btn) => {
        if (btn.offsetParent) btn.click();
      });
      await sleep(220);
    }
    window.scrollTo({ top: startY, behavior: 'smooth' });
    runtime.forceLoadBusy = false;
    toast(t('Finished force-loading', 'اكتمل التحميل القسري'));
    scheduleFilterRun();
  }

  function needVideo() {
    const video = videoEl();
    if (!video) toast(t('No video', 'لا يوجد فيديو'));
    return video;
  }

  function setSpeed(rate) {
    const video = needVideo();
    if (!video) return;
    video.playbackRate = rate;
    toast(t(`Speed ${rate}x`, `السرعة ${rate}×`));
  }

  function clickPlayer(sel) { document.querySelector(sel)?.click(); }

  function pageTitle() {
    return document.querySelector('h1.ytd-watch-metadata yt-formatted-string, #title h1 yt-formatted-string, h1 yt-formatted-string')?.textContent?.trim()
      || document.title;
  }

  function channelName() {
    return document.querySelector('#owner #channel-name a, ytd-video-owner-renderer a')?.textContent?.trim() || '';
  }

  function iconWrap(path) { return `<svg viewBox="0 0 24 24" fill="currentColor">${path}</svg>`; }

  const icons = {
    replay: () => iconWrap('<path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>'),
    loop: () => iconWrap('<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>'),
    image: () => iconWrap('<path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>'),
    camera: () => iconWrap('<path d="M4 4h4l2-2h4l2 2h4v16H4V4zm8 3a5 5 0 100 10 5 5 0 000-10zm0 2a3 3 0 110 6 3 3 0 010-6z"/>'),
    link: () => iconWrap('<path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>'),
    clock: () => iconWrap('<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.5 11H11V7h1.5v4.25l3.5 2.1-.75 1.23L12.5 13z"/>'),
    comments: () => iconWrap('<path d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z"/>'),
    sidebar: () => iconWrap('<path d="M3 3h18v18H3V3zm2 2v14h10V5H5zm12 0v14h4V5h-4z"/>'),
    cards: () => iconWrap('<path d="M3 5h18v4H3V5zm0 6h8v8H3v-8zm10 0h8v8h-8v-8z"/>'),
    chat: () => iconWrap('<path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>'),
    shorts: () => iconWrap('<path d="M10 8v8l6-4-6-4z"/>'),
    motion: () => iconWrap('<path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/>'),
    moon: () => iconWrap('<path d="M12.34 2.02C6.59 1.82 2 6.42 2 12c0 5.52 4.48 10 10 10 3.71 0 6.93-2.02 8.66-5.02-7.51-.25-12.09-8.43-8.32-14.96z"/>'),
    bolt: () => iconWrap('<path d="M11 21h-1l1-7H7.5L13 2h1l-1 7h3.5L11 21z"/>'),
    skip: () => iconWrap('<path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z"/>'),
    back: () => iconWrap('<path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/>'),
    header: () => iconWrap('<path d="M3 3h18v4H3V3zm0 6h18v12H3V9z"/>'),
    text: () => iconWrap('<path d="M3 5h18v2H3V5zm0 6h12v2H3v-2zm0 6h18v2H3v-2z"/>'),
    like: () => iconWrap('<path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>'),
    shop: () => iconWrap('<path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0020.01 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>'),
    list: () => iconWrap('<path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>'),
    user: () => iconWrap('<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>'),
    focus: () => iconWrap('<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>'),
    flip: () => iconWrap('<path d="M15 21h2v-2h-2v2zm4-12h2V7h-2v2zM3 5v14c0 1.1.9 2 2 2h4v-2H5V5h4V3H5c-1.1 0-2 .9-2 2zm16-2v2h2c0-1.1-.9-2-2-2zm-8 20h2V1h-2v22zm8-6h2v-2h-2v2zM15 5h2V3h-2v2zm4 8h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2z"/>'),
    blur: () => iconWrap('<path d="M6 13c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 .45 1 1 1zm0 4c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 1 1 1 1zm0-8c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 1 1 1 1zm-3 .5c.28 0 .5-.22.5-.5s-.22-.5-.5-.5-.5.22-.5.5-.22.5-.5.5zM6 21c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 1 1 1 1zm-3-3.5c.28 0 .5-.22.5-.5s-.22-.5-.5-.5-.5.22-.5.5-.5.5-.5zM18 13c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 1 1 1 1z"/>'),
    pip: () => iconWrap('<path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 1.98 2 1.98h18c1.1 0 2-.88 2-1.98V5c0-1.1-.9-2-2-2zm0 16.01H3V4.98h18v14.03z"/>'),
    theater: () => iconWrap('<path d="M19 6H5c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 10H5V8h14v8z"/>'),
    mute: () => iconWrap('<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>'),
    volume: () => iconWrap('<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>'),
    reset: () => iconWrap('<path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>')
  };

  function items() {
    return [
      { type: 'section', en: 'Playback', ar: 'التشغيل' },
      { type: 'toggle', key: 'autoReplay', en: 'Auto replay', ar: 'إعادة تشغيل تلقائي', subEn: 'Restart when the video ends or stalls', subAr: 'يبدأ من جديد عند النهاية أو التوقف' },
      { type: 'action', en: 'Loop this video', ar: 'تكرار هذا الفيديو', run() { const v = needVideo(); if (!v) return; v.loop = !v.loop; toast(v.loop ? t('Loop on', 'التكرار يعمل') : t('Loop off', 'التكرار متوقف')); } },
      { type: 'action', en: 'Restart from start', ar: 'ابدأ من البداية', run() { const v = needVideo(); if (!v) return; v.currentTime = 0; v.play().catch(() => {}); } },
      { type: 'action', en: 'Back 10 seconds', ar: 'رجوع 10 ثوانٍ', run() { const v = needVideo(); if (v) v.currentTime = Math.max(0, v.currentTime - 10); } },
      { type: 'action', en: 'Forward 10 seconds', ar: 'تقديم 10 ثوانٍ', run() { const v = needVideo(); if (v) v.currentTime = Math.min(v.duration || 1e9, v.currentTime + 10); } },
      { type: 'action', en: 'Jump to last 10 seconds', ar: 'انتقل لآخر 10 ثوانٍ', run() { const v = needVideo(); if (v && v.duration) v.currentTime = Math.max(0, v.duration - 10); } },
      { type: 'action', en: 'Mute / unmute', ar: 'كتم / إلغاء الكتم', run() { const v = needVideo(); if (!v) return; v.muted = !v.muted; toast(v.muted ? t('Muted', 'مكتوم') : t('Unmuted', 'الصوت يعمل')); } },
      { type: 'toggle', key: 'boost', en: 'Audio boost', ar: 'تعزيز الصوت', subEn: 'Louder playback (2.2x)', subAr: 'رفع الصوت أكثر (٢٫٢×)' },
      { type: 'speeds' },

      { type: 'section', en: 'Save & copy', ar: 'حفظ ونسخ' },
      { type: 'action', en: 'Download thumbnail', ar: 'تنزيل الصورة المصغّرة', subEn: 'Highest quality still', subAr: 'أعلى جودة متاحة', run: downloadThumbnail },
      { type: 'action', en: 'Save current frame', ar: 'حفظ الإطار الحالي', run: screenshotFrame },
      { type: 'action', en: 'Copy video URL', ar: 'نسخ رابط الفيديو', run() { const id = videoId(); if (!id) return toast(t('No video', 'لا يوجد فيديو')); copyText(`https://www.youtube.com/watch?v=${id}`, t('URL copied', 'تم نسخ الرابط')); } },
      { type: 'action', en: 'Copy timestamped URL', ar: 'نسخ رابط مع التوقيت', run() { const id = videoId(); const v = videoEl(); if (!id || !v) return toast(t('No video', 'لا يوجد فيديو')); copyText(`https://www.youtube.com/watch?v=${id}&t=${Math.floor(v.currentTime)}s`, t('Timestamp copied', 'تم نسخ التوقيت')); } },
      { type: 'action', en: 'Copy title', ar: 'نسخ العنوان', run() { copyText(pageTitle(), t('Title copied', 'تم نسخ العنوان')); } },
      { type: 'action', en: 'Copy channel name', ar: 'نسخ اسم القناة', run() { const n = channelName(); if (!n) return toast(t('No channel found', 'لم يُعثر على القناة')); copyText(n, t('Channel copied', 'تم نسخ اسم القناة')); } },
      { type: 'action', en: 'Copy video ID', ar: 'نسخ معرّف الفيديو', run() { const id = videoId(); if (!id) return toast(t('No video', 'لا يوجد فيديو')); copyText(id, t('ID copied', 'تم نسخ المعرّف')); } },

      { type: 'section', en: 'Hide parts of the page', ar: 'إخفاء أجزاء الصفحة' },
      { type: 'toggle', key: 'hideComments', en: 'Hide comments', ar: 'إخفاء التعليقات' },
      { type: 'toggle', key: 'hideRelated', en: 'Hide related videos', ar: 'إخفاء الفيديوهات المقترحة' },
      { type: 'toggle', key: 'hideEndCards', en: 'Hide end cards', ar: 'إخفاء بطاقات النهاية' },
      { type: 'toggle', key: 'hideChat', en: 'Hide live chat', ar: 'إخفاء الدردشة المباشرة' },
      { type: 'toggle', key: 'hideShorts', en: 'Hide Shorts shelves', ar: 'إخفاء أرفف الشورتس' },
      { type: 'toggle', key: 'hideMasthead', en: 'Hide top bar', ar: 'إخفاء الشريط العلوي' },
      { type: 'toggle', key: 'hideDesc', en: 'Hide description', ar: 'إخفاء الوصف' },
      { type: 'toggle', key: 'hideActions', en: 'Hide like/share row', ar: 'إخفاء صف الإعجاب والمشاركة' },
      { type: 'toggle', key: 'hideMerch', en: 'Hide merch / offers', ar: 'إخفاء المتجر والعروض' },
      { type: 'toggle', key: 'hidePlaylist', en: 'Hide playlist panel', ar: 'إخفاء قائمة التشغيل' },
      { type: 'toggle', key: 'hideInfo', en: 'Hide channel row', ar: 'إخفاء صف القناة' },
      { type: 'toggle', key: 'focusMode', en: 'Focus mode', ar: 'وضع التركيز', subEn: 'Player only', subAr: 'المشغّل فقط' },

      { type: 'section', en: 'Look & load', ar: 'المظهر والتحميل' },
      { type: 'toggle', key: 'smoothUi', en: 'Smooth UI', ar: 'واجهة سلسة', subEn: 'Transitions instead of jumps', subAr: 'انتقالات بدل القفز المفاجئ' },
      { type: 'toggle', key: 'cinema', en: 'Cinema dim', ar: 'تعتيم سينمائي', subEn: 'Darken around the player', subAr: 'تعتيم حول المشغّل دون حجب النقر' },
      { type: 'toggle', key: 'mirror', en: 'Mirror video', ar: 'عكس الفيديو' },
      { type: 'toggle', key: 'blurThumbs', en: 'Blur thumbnails', ar: 'تمويه الصور المصغّرة', subEn: 'Unblur on hover', subAr: 'يظهر عند المرور بالفأرة' },
      { type: 'action', en: 'Force-load lazy content', ar: 'تحميل المحتوى الكسول', subEn: 'Eager images and continuations', subAr: 'صور فورية وتحميل المزيد', run: forceLoad },
      { type: 'action', en: 'Expand description', ar: 'توسيع الوصف', run() { document.querySelector('#expand, ytd-text-inline-expander #expand')?.click(); } },
      { type: 'action', en: 'Scroll to comments', ar: 'الانتقال إلى التعليقات', run() { document.querySelector('#comments')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } },
      { type: 'action', en: 'Scroll to player', ar: 'الانتقال إلى المشغّل', run() { playerRoot()?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } },

      { type: 'section', en: 'Player buttons', ar: 'أزرار المشغّل' },
      { type: 'action', en: 'Theater mode', ar: 'وضع المسرح', run() { clickPlayer('.ytp-size-button'); } },
      { type: 'action', en: 'Picture in picture', ar: 'صورة داخل صورة', run() { needVideo()?.requestPictureInPicture?.().catch(() => toast(t('PiP failed', 'تعذّرت صورة داخل صورة'))); } },
      { type: 'action', en: 'Toggle captions', ar: 'تشغيل/إيقاف الترجمة', run() { clickPlayer('.ytp-subtitles-button'); } },
      { type: 'action', en: 'Toggle autoplay', ar: 'تشغيل/إيقاف التشغيل التلقائي', run() { clickPlayer('.ytp-autonav-toggle-button, .ytp-autonav-toggle'); } },

      { type: 'section', en: 'Content filter', ar: 'فلتر المحتوى' },
      {
        type: 'toggle', key: 'filterAnime', en: 'Anime home feed', ar: 'تغذية الأنمي الرئيسية',
        subEn: 'Replaces your home page videos/shorts with anime search results (cached)',
        subAr: 'استبدال فيديوهات وشورتس صفحتك الرئيسية بنتائج بحث الأنمي (محفوظة)'
      },
      {
        type: 'action', en: 'Refresh anime feed', ar: 'تحديث تغذية الأنمي',
        subEn: 'Fetch new results now instead of the cache', subAr: 'جلب نتائج جديدة الآن بدل المخزّنة',
        run() {
          if (!isHomeFeedPage()) return toast(t('Go to the YouTube home page first', 'اذهب إلى الصفحة الرئيسية أولاً'));
          if (!state.filterAnime) return toast(t('Turn on "Anime home feed" first', 'فعّل "تغذية الأنمي الرئيسية" أولاً'));
          toast(t('Refreshing…', 'يجري التحديث…'));
          applyAnimeFeed(true);
        }
      },
      {
        type: 'action', en: 'Custom filter keywords', ar: 'كلمات فلتر مخصصة',
        subEn: state.filterCustomOn && state.filterKeywords ? state.filterKeywords : 'Only show videos matching these words (first word also feeds the anime search)',
        subAr: state.filterCustomOn && state.filterKeywords ? state.filterKeywords : 'إظهار الفيديوهات المطابقة لهذه الكلمات فقط (الكلمة الأولى تُستخدم أيضًا في بحث الأنمي)',
        run() {
          const current = state.filterKeywords || '';
          const input = prompt(t('Comma-separated keywords (empty to clear):', 'كلمات مفصولة بفواصل (اتركها فارغة للمسح):'), current);
          if (input === null) return;
          const cleaned = input.trim();
          state.filterKeywords = cleaned;
          state.filterCustomOn = cleaned.length > 0;
          saveSettings();
          applyContentFilters();
          fillWindow();
          toast(state.filterCustomOn ? t('Custom filter on', 'الفلتر المخصص يعمل') : t('Custom filter cleared', 'تم مسح الفلتر المخصص'));
        }
      },

      { type: 'section', en: 'Channels', ar: 'القنوات' },
      {
        type: 'action', en: 'Block this channel', ar: 'حظر هذه القناة',
        subEn: 'Hide its videos everywhere', subAr: 'إخفاء فيديوهاتها في كل مكان',
        run() {
          const name = currentChannelName();
          if (!name) return toast(t('No channel found here', 'لم يُعثر على قناة هنا'));
          if (state.blockedChannels.some((b) => b.toLowerCase() === name.toLowerCase())) return toast(t('Already blocked', 'محظورة مسبقًا'));
          state.blockedChannels.push(name);
          saveSettings();
          applyContentFilters();
          toast(t(`Blocked "${name}"`, `تم حظر "${name}"`));
        }
      },
      {
        type: 'action', en: 'Manage blocked channels', ar: 'إدارة القنوات المحظورة',
        subEn: `${state.blockedChannels.length} blocked`, subAr: `${state.blockedChannels.length} محظورة`,
        run() { runtime.view = 'blocklist'; fillWindow(); }
      },
      {
        type: 'action', en: 'Bulk unsubscribe', ar: 'إلغاء اشتراك جماعي',
        subEn: 'Select channels to unsubscribe from at once', subAr: 'اختر قنوات لإلغاء الاشتراك منها دفعة واحدة',
        run() { startBulkUnsub(); }
      },

      { type: 'section', en: 'Reset', ar: 'إعادة ضبط' },
      {
        type: 'action', en: 'Reset all tools', ar: 'إعادة ضبط كل الأدوات',
        subEn: 'Clear saved settings', subAr: 'مسح الإعدادات المحفوظة',
        run() {
          const lang = state.lang;
          Object.assign(state, defaults, { lang });
          saveSettings();
          runtime.animeFeedToken++;
          runtime.animeFeedData = null;
          applyPageFlags();
          fillWindow();
          toast(t('Tools reset', 'تمت إعادة الضبط'));
        }
      }
    ];
  }

  function fillWindow() {
    const menu = document.getElementById(MENU_ID);
    if (!menu) return;

    menu.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
    if (!menu.classList.contains('ypt-menu-floating')) { menu.style.right = '12px'; menu.style.left = 'auto'; }

    menu.querySelector('[data-lang="ar"]').classList.toggle('on', state.lang === 'ar');
    menu.querySelector('[data-lang="en"]').classList.toggle('on', state.lang === 'en');

    const titleEl = menu.querySelector('.ypt-title');
    const titles = {
      main: t('Player tools', 'أدوات المشغّل'),
      blocklist: t('Blocked channels', 'القنوات المحظورة'),
      unsub: t('Bulk unsubscribe', 'إلغاء اشتراك جماعي')
    };
    titleEl.textContent = titles[runtime.view] || titles.main;

    let backBtn = menu.querySelector('.ypt-backrow');
    if (runtime.view !== 'main') {
      if (!backBtn) {
        backBtn = document.createElement('button');
        backBtn.type = 'button';
        backBtn.className = 'ypt-backrow';
        backBtn.textContent = '‹ ' + t('Back', 'رجوع');
        backBtn.addEventListener('click', (e) => { e.stopPropagation(); runtime.view = 'main'; fillWindow(); });
        menu.querySelector('.ypt-head').prepend(backBtn);
      }
    } else if (backBtn) {
      backBtn.remove();
    }

    if (runtime.view === 'blocklist') return fillBlocklistList(menu);
    if (runtime.view === 'unsub') return fillUnsubList(menu);
    return fillMainList(menu);
  }

  function fillMainList(menu) {
    const list = menu.querySelector('.ypt-list');
    list.innerHTML = '';

    const iconCycle = [
      icons.replay, icons.loop, icons.skip, icons.back, icons.clock, icons.mute, icons.volume,
      icons.image, icons.camera, icons.link, icons.clock, icons.text, icons.user, icons.link,
      icons.comments, icons.sidebar, icons.cards, icons.chat, icons.shorts, icons.header, icons.text,
      icons.like, icons.shop, icons.list, icons.user, icons.focus, icons.motion, icons.moon,
      icons.flip, icons.blur, icons.bolt, icons.text, icons.chat, icons.theater, icons.pip, icons.cards,
      icons.loop, icons.list, icons.reset, icons.reset, icons.user, icons.list, icons.user, icons.reset
    ];
    let iconI = 0;

    items().forEach((item) => {
      if (item.type === 'section') {
        const h = document.createElement('div');
        h.className = 'ypt-section';
        h.textContent = t(item.en, item.ar);
        list.appendChild(h);
        return;
      }

      if (item.type === 'speeds') {
        const row = document.createElement('div');
        row.className = 'ypt-speeds';
        [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].forEach((rate) => {
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'ypt-chip';
          chip.textContent = `${rate}×`;
          chip.addEventListener('click', (e) => { e.stopPropagation(); setSpeed(rate); });
          row.appendChild(chip);
        });
        list.appendChild(row);
        return;
      }

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ypt-item';
      if (item.type === 'toggle' && state[item.key]) btn.classList.add('on');

      const ico = (iconCycle[iconI++] || icons.bolt)();
      btn.innerHTML = `
        <span class="ypt-ico">${ico}</span>
        <span class="ypt-label">
          ${t(item.en, item.ar)}
          ${item.subEn ? `<span class="ypt-sub">${t(item.subEn, item.subAr)}</span>` : ''}
        </span>
        ${item.type === 'toggle' ? '<span class="ypt-switch"></span>' : ''}
      `;

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (item.type === 'toggle') {
          setToggle(item.key, !state[item.key]);
          btn.classList.toggle('on', state[item.key]);
        } else {
          item.run();
        }
      });

      list.appendChild(btn);
    });
  }

  function fillBlocklistList(menu) {
    const list = menu.querySelector('.ypt-list');
    list.innerHTML = '';

    if (!state.blockedChannels.length) {
      const empty = document.createElement('div');
      empty.className = 'ypt-empty';
      empty.textContent = t('No blocked channels yet', 'لا توجد قنوات محظورة بعد');
      list.appendChild(empty);
      return;
    }

    state.blockedChannels.forEach((name) => {
      const row = document.createElement('div');
      row.className = 'ypt-blk-row';
      row.innerHTML = `<span class="ypt-blk-name">${name}</span><button type="button" class="ypt-blk-remove">×</button>`;
      row.querySelector('.ypt-blk-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        state.blockedChannels = state.blockedChannels.filter((b) => b !== name);
        saveSettings();
        applyContentFilters();
        fillWindow();
        toast(t('Unblocked', 'تم إلغاء الحظر'));
      });
      list.appendChild(row);
    });
  }

  function fillUnsubList(menu) {
    const list = menu.querySelector('.ypt-list');
    list.innerHTML = '';
    menu.querySelector('.ypt-footer-row')?.remove();

    if (!runtime.unsubChannels.length) {
      const empty = document.createElement('div');
      empty.className = 'ypt-empty';
      empty.textContent = t('No subscriptions found on this page', 'لم يُعثر على اشتراكات في هذه الصفحة');
      list.appendChild(empty);
      return;
    }

    runtime.unsubChannels.forEach((c, i) => {
      const row = document.createElement('div');
      row.className = 'ypt-unsub-row';
      if (runtime.unsubSelected.has(i)) row.classList.add('on');
      row.innerHTML = `<span class="ypt-unsub-check">✓</span><span class="ypt-unsub-name">${c.name}</span>`;
      row.addEventListener('click', (e) => {
        e.stopPropagation();
        if (runtime.unsubSelected.has(i)) runtime.unsubSelected.delete(i);
        else runtime.unsubSelected.add(i);
        row.classList.toggle('on');
      });
      list.appendChild(row);
    });

    const footer = document.createElement('div');
    footer.className = 'ypt-footer-row';
    footer.innerHTML = `
      <button type="button" class="ypt-footer-btn" data-act="all">${t('Select all', 'تحديد الكل')}</button>
      <button type="button" class="ypt-footer-btn ypt-danger" data-act="go">${t('Unsubscribe', 'إلغاء الاشتراك')}</button>
    `;
    footer.querySelector('[data-act="all"]').addEventListener('click', (e) => {
      e.stopPropagation();
      if (runtime.unsubSelected.size === runtime.unsubChannels.length) runtime.unsubSelected.clear();
      else runtime.unsubChannels.forEach((_, i) => runtime.unsubSelected.add(i));
      fillWindow();
    });
    footer.querySelector('[data-act="go"]').addEventListener('click', (e) => { e.stopPropagation(); unsubscribeSelected(); });
    menu.appendChild(footer);
  }

  function closeMenu() {
    const menu = document.getElementById(MENU_ID);
    if (!menu || runtime.closing) return;
    runtime.closing = true;
    runtime.menuOpen = false;
    menu.classList.add('ypt-out');
    document.removeEventListener('click', onDocClick, true);
    document.removeEventListener('keydown', onKey);
    setTimeout(() => { menu.remove(); runtime.closing = false; }, 160);
  }

  function onDocClick(e) {
    const menu = document.getElementById(MENU_ID);
    const btn = document.getElementById(BTN_ID) || document.getElementById(FLOAT_ID);
    if (menu && !menu.contains(e.target) && e.target !== btn && !btn?.contains(e.target)) closeMenu();
  }

  function onKey(e) { if (e.key === 'Escape') closeMenu(); }

  function positionFloatingMenu(menu, floatBtn) {
    const rect = floatBtn.getBoundingClientRect();
    const width = 280;
    const approxHeight = Math.min(window.innerHeight * 0.55, 400);

    let left = rect.left;
    if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
    if (left < 8) left = 8;

    let top = rect.top - 8 - approxHeight;
    if (top < 8) top = rect.bottom + 8;
    if (top + approxHeight > window.innerHeight - 8) top = Math.max(8, window.innerHeight - approxHeight - 8);

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }

  function renderMenu() {
    const floatBtn = document.getElementById(FLOAT_ID);
    const player = playerRoot();
    const anchorFloat = !!floatBtn;
    const container = anchorFloat ? document.body : player;
    if (!container) return;

    document.getElementById(MENU_ID)?.remove();
    runtime.closing = false;

    const menu = document.createElement('div');
    menu.id = MENU_ID;
    menu.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
    if (anchorFloat) menu.classList.add('ypt-menu-floating');

    menu.innerHTML = `
      <div class="ypt-head">
        <div class="ypt-title"></div>
        <div class="ypt-lang">
          <button type="button" data-lang="ar">ع</button>
          <button type="button" data-lang="en">EN</button>
        </div>
      </div>
      <div class="ypt-list"></div>
    `;

    menu.querySelectorAll('.ypt-lang button').forEach((b) => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        state.lang = b.getAttribute('data-lang');
        saveSettings();
        fillWindow();
        syncButton();
      });
    });

    container.appendChild(menu);
    if (anchorFloat) positionFloatingMenu(menu, floatBtn);

    fillWindow();
    runtime.menuOpen = true;

    setTimeout(() => document.addEventListener('click', onDocClick, true), 0);
    document.addEventListener('keydown', onKey);
  }

  function toggleMenu(e) {
    e?.preventDefault();
    e?.stopPropagation();
    if (document.getElementById(MENU_ID) && !runtime.closing) { closeMenu(); return; }
    runtime.view = 'main';
    renderMenu();
  }

  function syncButton() {
    const btn = document.getElementById(BTN_ID) || document.getElementById(FLOAT_ID);
    if (!btn) return;
    btn.classList.toggle('ypt-active', state.autoReplay);
    const label = t('Player tools', 'أدوات المشغّل');
    btn.setAttribute('aria-label', label);
    btn.setAttribute('data-tooltip-title', state.autoReplay ? t('Player tools · Auto replay on', 'أدوات المشغّل · إعادة التشغيل تعمل') : label);
  }

  function makeButton() {
    const btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.className = 'ytp-button';
    btn.type = 'button';
    btn.setAttribute('data-priority', '6');
    btn.innerHTML = `
      <svg height="24" width="24" viewBox="0 0 24 24" fill="white">
        <path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96a7.2 7.2 0 00-1.63-.94l-.36-2.54A.48.48 0 0014 2h-4a.48.48 0 00-.48.41l-.36 2.54c-.59.24-1.13.56-1.63.94l-2.39-.96a.49.49 0 00-.59.22L2.63 8.87a.49.49 0 00.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.75 14.52a.49.49 0 00-.12.61l1.92 3.32c.12.22.39.3.59.22l2.39-.96c.5.38 1.04.7 1.63.94l.36 2.54c.05.24.25.41.48.41h4c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.63-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 00-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1112 8.4a3.6 3.6 0 010 7.2z"/>
      </svg>
    `;
    btn.addEventListener('click', toggleMenu);
    return btn;
  }

  function isWatchLikePage() {
    const p = location.pathname;
    return p === '/watch' || p.startsWith('/shorts/') || p.startsWith('/live/');
  }

  function activePlayerRoot() {
    if (!isWatchLikePage()) return null;
    const p = playerRoot();
    if (!p) return null;
    const rect = p.getBoundingClientRect();
    if (rect.width < 120 || rect.height < 80) return null;
    return p;
  }

  function mountButton() {
    const player = activePlayerRoot();
    const host = player ? (player.querySelector('.ytp-right-controls-left') || player.querySelector('.ytp-right-controls')) : null;

    if (!host) { document.getElementById(BTN_ID)?.remove(); return false; }

    let btn = document.getElementById(BTN_ID);
    if (btn && host.contains(btn)) { syncButton(); return true; }

    btn?.remove();
    btn = makeButton();

    const settings = host.querySelector('.ytp-settings-button');
    if (settings) settings.insertAdjacentElement('beforebegin', btn);
    else host.appendChild(btn);

    syncButton();
    return true;
  }

  function scrapeSubscribedChannels() {
    const rows = Array.from(document.querySelectorAll('ytd-channel-renderer'));
    return rows.map((row) => {
      const nameEl = row.querySelector('#channel-title #text, #text.ytd-channel-name, yt-formatted-string#text');
      const name = nameEl?.textContent?.trim();
      const subBtn = row.querySelector('ytd-subscribe-button-renderer button, #subscribe-button button, tp-yt-paper-button#subscribe-button');
      return name && subBtn ? { name, subBtn } : null;
    }).filter(Boolean);
  }

  function startBulkUnsub() {
    if (!location.pathname.startsWith(SUBS_PATH)) {
      try { sessionStorage.setItem(UNSUB_FLAG_KEY, '1'); } catch { /* ignore */ }
      toast(t('Opening your subscriptions…', 'جارٍ فتح اشتراكاتك…'));
      location.href = `https://www.youtube.com${SUBS_PATH}`;
      return;
    }

    runtime.unsubChannels = scrapeSubscribedChannels();
    runtime.unsubSelected = new Set();
    runtime.view = 'unsub';
    fillWindow();

    if (!runtime.unsubChannels.length) {
      toast(t('No channels found — try scrolling down first', 'لم يُعثر على قنوات — جرّب التمرير للأسفل أولاً'));
    }
  }

  function maybeAutoOpenUnsub() {
    if (!location.pathname.startsWith(SUBS_PATH)) return;
    let flagged = false;
    try { flagged = !!sessionStorage.getItem(UNSUB_FLAG_KEY); } catch { /* ignore */ }
    if (!flagged) return;
    try { sessionStorage.removeItem(UNSUB_FLAG_KEY); } catch { /* ignore */ }

    setTimeout(() => {
      runtime.unsubChannels = scrapeSubscribedChannels();
      runtime.unsubSelected = new Set();
      runtime.view = 'unsub';
      if (!document.getElementById(MENU_ID)) renderMenu();
      else fillWindow();
    }, 900);
  }

  async function unsubscribeSelected() {
    const targets = runtime.unsubChannels.filter((c, i) => runtime.unsubSelected.has(i));
    if (!targets.length) return toast(t('No channels selected', 'لم تُحدد أي قناة'));

    toast(t(`Unsubscribing from ${targets.length}…`, `إلغاء الاشتراك من ${targets.length}…`));

    for (const c of targets) {
      try {
        c.subBtn.click();
        await sleep(450);
        const confirmBtn = Array.from(document.querySelectorAll('tp-yt-paper-dialog button, yt-confirm-dialog-renderer button, ytd-popup-container button'))
          .find((b) => /unsubscribe/i.test(b.textContent || ''));
        if (confirmBtn) { confirmBtn.click(); await sleep(450); }
      } catch { /* skip this one, keep going */ }
      await sleep(350);
    }

    toast(t('Done — refresh the page to confirm', 'تم — حدّث الصفحة للتأكيد'));
    runtime.view = 'main';
    runtime.unsubSelected = new Set();
    fillWindow();
  }

  function loadFloatPos() {
    try {
      const saved = JSON.parse(localStorage.getItem(FLOAT_POS_KEY) || 'null');
      if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') return saved;
    } catch { /* ignore */ }
    return { x: window.innerWidth - 76, y: window.innerHeight - 140 };
  }

  function saveFloatPos(pos) {
    try { localStorage.setItem(FLOAT_POS_KEY, JSON.stringify(pos)); } catch { /* ignore */ }
  }

  function clampFloatPos(pos) {
    const size = 50;
    return {
      x: Math.min(Math.max(8, pos.x), window.innerWidth - size - 8),
      y: Math.min(Math.max(8, pos.y), window.innerHeight - size - 8)
    };
  }

  function applyFloatPos(btn, pos) { btn.style.left = `${pos.x}px`; btn.style.top = `${pos.y}px`; }

  function makeDraggable(btn) {
    let start = null, origin = null, moved = false;

    const onMove = (e) => {
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
      applyFloatPos(btn, clampFloatPos({ x: origin.x + dx, y: origin.y + dy }));
    };

    const onUp = (e) => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      btn.classList.remove('ypt-dragging');
      runtime.floatDragging = false;

      if (moved) {
        const rect = btn.getBoundingClientRect();
        saveFloatPos({ x: rect.left, y: rect.top });
      } else {
        toggleMenu(e);
      }
      start = null;
    };

    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      start = { x: e.clientX, y: e.clientY };
      const rect = btn.getBoundingClientRect();
      origin = { x: rect.left, y: rect.top };
      moved = false;
      runtime.floatDragging = true;
      btn.classList.add('ypt-dragging');
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    });
  }

  function mountFloatingButton() {
    let btn = document.getElementById(FLOAT_ID);
    if (btn) { syncButton(); return; }

    btn = makeButton();
    btn.removeEventListener('click', toggleMenu);
    btn.id = FLOAT_ID;
    btn.className = '';
    btn.removeAttribute('data-priority');
    applyFloatPos(btn, clampFloatPos(loadFloatPos()));
    document.body.appendChild(btn);
    makeDraggable(btn);
    syncButton();
  }

  function removeFloatingButton() {
    document.getElementById(FLOAT_ID)?.remove();
    if (!runtime.closing && document.getElementById(MENU_ID)?.classList.contains('ypt-menu-floating')) closeMenu();
  }

  function refreshEntryPoint() {
    const inPlayer = mountButton();
    if (inPlayer) removeFloatingButton();
    else mountFloatingButton();
  }

  function boot() {
    injectStyles();
    applyPageFlags();
    refreshEntryPoint();
    maybeAutoOpenUnsub();
  }

  function onNavigate() {
    closeMenu();
    runtime.lastTime = -1;
    runtime.stallCounter = 0;
    runtime.mediaSource = null;
    runtime.gain = null;
    runtime.animeFeedToken++;
    runtime.animeFeedData = null;
    setTimeout(boot, 250);
  }

  function onPageData() { setTimeout(boot, 200); }

  function onResize() {
    const btn = document.getElementById(FLOAT_ID);
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const pos = clampFloatPos({ x: rect.left, y: rect.top });
    applyFloatPos(btn, pos);
    saveFloatPos(pos);
  }

  document.addEventListener('yt-navigate-finish', onNavigate);
  window.addEventListener('yt-page-data-updated', onPageData);
  window.addEventListener('resize', onResize);

  const obs = new MutationObserver(() => { refreshEntryPoint(); scheduleFilterRun(); });
  obs.observe(document.documentElement, { childList: true, subtree: true });

  window.__yptTeardown = () => {
    stopReplay();
    runtime.animeFeedToken++;
    document.getElementById(MENU_ID)?.remove();
    document.getElementById(FLOAT_ID)?.remove();
    document.getElementById(BTN_ID)?.remove();
    obs.disconnect();
    clearTimeout(runtime.filterDebTimer);
    document.removeEventListener('yt-navigate-finish', onNavigate);
    window.removeEventListener('yt-page-data-updated', onPageData);
    window.removeEventListener('resize', onResize);
    document.documentElement.classList.remove(...FLAG_CLASSES);
  };

  boot();
  console.log('[YPT] YouTube Player Tools loaded');
})();
