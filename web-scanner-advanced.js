(async () => {
  "use strict";

  // ================================================================
  // WEB EXPOSURE AUDITOR — DEEP CRAWL EDITION
  // UI VERSION — PASSIVE, SAME-ORIGIN ONLY
  // ================================================================
  //
  // What's new vs. the single-page version:
  //  - Multi-page same-origin crawl (BFS) with configurable depth/page cap
  //  - CSS file inspection (url()/@import extraction)
  //  - A few more public-discovery files checked (security.txt, humans.txt)
  //  - A couple more secret-pattern signatures
  //  - "Pages Crawled" tab + stat
  //
  // Still strictly passive: only fetches same-origin URLs it discovers
  // organically (links, scripts, stylesheets, sitemap). It never guesses
  // or brute-forces hidden paths (no .env/.git/backup-file wordlists) —
  // that's a different category of tool and isn't what this does.
  // ================================================================

  document.getElementById("__web_auditor_ui__")?.remove();

  const data = {
    endpoints: new Set(),
    paths: new Set(),
    scripts: [],
    resources: [],
    domains: new Set(),
    secrets: [],
    sourcemaps: [],
    forms: [],
    pages: [],       // crawled pages
    robots: null,
    sitemap: null,
    securityTxt: null,
    humansTxt: null
  };

  const visitedPages = new Set();
  const visitedScripts = new Set();
  const visitedStyles = new Set();

  const normalize = (value, base) => {
    try {
      return new URL(value, base || location.href).href;
    } catch {
      return null;
    }
  };

  const sameOrigin = (url) => {
    try {
      return new URL(url).origin === location.origin;
    } catch {
      return false;
    }
  };

  const addEndpoint = (value, base) => {
    const url = normalize(value, base);
    if (!url) return;

    if (/^https?:\/\//i.test(url)) {
      data.endpoints.add(url);

      try {
        const host = new URL(url).hostname;
        if (host !== location.hostname) {
          data.domains.add(host);
        }
      } catch {}
    }
  };

  const addPath = (value) => {
    if (!value) return;

    const path = value.replace(/^["'`]/, "").replace(/["'`]$/, "").trim();

    if (path.startsWith("/") || path.startsWith("./") || path.startsWith("../")) {
      data.paths.add(path);
    }
  };

  const escapeHTML = (value) => {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // ================================================================
  // UI
  // ================================================================

  const root = document.createElement("div");
  root.id = "__web_auditor_ui__";

  root.innerHTML = `
    <style>
      #__web_auditor_ui__ { all: initial; position: fixed; inset: 0; z-index: 2147483647;
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #e5e7eb; }
      #__web_auditor_ui__ *, #__web_auditor_ui__ *::before, #__web_auditor_ui__ *::after { box-sizing: border-box; }
      .wa-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.55); backdrop-filter: blur(4px); }
      .wa-panel { position: absolute; top: 4vh; left: 50%; transform: translateX(-50%);
        width: min(1100px, 94vw); height: 92vh; background: #101318; border: 1px solid #2b313a;
        border-radius: 14px; box-shadow: 0 25px 80px rgba(0,0,0,0.55); display: flex; flex-direction: column; overflow: hidden; }
      .wa-header { padding: 18px 20px; border-bottom: 1px solid #292e36; display: flex; align-items: center;
        justify-content: space-between; background: #151920; }
      .wa-title { font-size: 19px; font-weight: 700; }
      .wa-subtitle { margin-top: 4px; font-size: 12px; color: #8b929d; max-width: 700px; overflow: hidden;
        text-overflow: ellipsis; white-space: nowrap; }
      .wa-close { border: 0; background: #252b33; color: #d1d5db; width: 38px; height: 38px; border-radius: 8px;
        cursor: pointer; font-size: 20px; }
      .wa-close:hover { background: #343b45; }
      .wa-stats { display: grid; grid-template-columns: repeat(7, 1fr); border-bottom: 1px solid #292e36; }
      .wa-stat { padding: 12px; text-align: center; border-right: 1px solid #292e36; }
      .wa-number { font-size: 20px; font-weight: 700; }
      .wa-label { margin-top: 3px; font-size: 10px; color: #858c97; text-transform: uppercase; letter-spacing: 0.05em; }
      .wa-crawlbar { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-bottom: 1px solid #292e36;
        background: #12161c; flex-wrap: wrap; }
      .wa-crawlbar label { font-size: 11px; color: #9299a4; display: flex; align-items: center; gap: 6px; }
      .wa-crawlbar input[type=number] { width: 56px; background: #171b21; color: #e5e7eb; border: 1px solid #303641;
        border-radius: 6px; padding: 5px 7px; font-size: 12px; }
      .wa-crawl-status { font-size: 11px; color: #7d8592; margin-left: auto; }
      .wa-tabs { display: flex; gap: 4px; padding: 9px; border-bottom: 1px solid #292e36; background: #12161c; overflow-x: auto; }
      .wa-tab { flex: 0 0 auto; border: 1px solid transparent; background: transparent; color: #9299a4; padding: 8px 12px;
        border-radius: 7px; cursor: pointer; font-size: 12px; }
      .wa-tab:hover { background: #1b2027; color: #e5e7eb; }
      .wa-tab.active { background: #252b33; color: #fff; border-color: #343b45; }
      .wa-body { flex: 1; min-height: 0; overflow: auto; padding: 15px; }
      .wa-toolbar { display: flex; gap: 8px; margin-bottom: 12px; }
      .wa-search { flex: 1; min-width: 0; background: #171b21; color: #e5e7eb; border: 1px solid #303641;
        border-radius: 7px; padding: 10px 12px; font-size: 13px; outline: none; }
      .wa-search:focus { border-color: #687386; }
      .wa-button { border: 1px solid #303641; background: #1d232b; color: #dbe0e7; border-radius: 7px;
        padding: 9px 13px; cursor: pointer; }
      .wa-button:hover { background: #282f38; }
      .wa-button:disabled { opacity: 0.5; cursor: default; }
      .wa-list { display: flex; flex-direction: column; gap: 7px; }
      .wa-item { background: #171b21; border: 1px solid #292f38; border-radius: 8px; padding: 11px 13px; word-break: break-word; }
      .wa-item-title { font-size: 12px; font-weight: 600; color: #f0f2f5; }
      .wa-item-meta { margin-top: 5px; color: #858d99; font-size: 11px; line-height: 1.5; }
      .wa-code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #cbd5e1;
        font-size: 11px; white-space: pre-wrap; word-break: break-all; }
      .wa-warning { border-color: #66552a; background: #211d13; }
      .wa-warning .wa-item-title { color: #f4d06f; }
      .wa-empty { padding: 40px 20px; text-align: center; color: #777f8a; font-size: 13px; }
      .wa-progress { height: 3px; background: #252b33; }
      .wa-progress-bar { height: 100%; width: 0; background: #9ca3af; transition: width 0.2s; }
      @media (max-width: 750px) {
        .wa-panel { top: 1vh; height: 98vh; width: 98vw; }
        .wa-stats { grid-template-columns: repeat(4, 1fr); }
        .wa-subtitle { max-width: 55vw; }
      }
    </style>

    <div class="wa-overlay"></div>

    <section class="wa-panel" role="dialog" aria-label="Web Exposure Auditor">
      <header class="wa-header">
        <div>
          <div class="wa-title">Web Exposure Auditor</div>
          <div class="wa-subtitle"></div>
        </div>
        <button class="wa-close" type="button" aria-label="Close">×</button>
      </header>

      <div class="wa-progress"><div class="wa-progress-bar"></div></div>

      <div class="wa-stats">
        <div class="wa-stat"><div class="wa-number" data-stat="endpoints">0</div><div class="wa-label">Endpoints</div></div>
        <div class="wa-stat"><div class="wa-number" data-stat="paths">0</div><div class="wa-label">Paths</div></div>
        <div class="wa-stat"><div class="wa-number" data-stat="scripts">0</div><div class="wa-label">Scripts</div></div>
        <div class="wa-stat"><div class="wa-number" data-stat="resources">0</div><div class="wa-label">Resources</div></div>
        <div class="wa-stat"><div class="wa-number" data-stat="secrets">0</div><div class="wa-label">Secrets</div></div>
        <div class="wa-stat"><div class="wa-number" data-stat="maps">0</div><div class="wa-label">Source Maps</div></div>
        <div class="wa-stat"><div class="wa-number" data-stat="pages">0</div><div class="wa-label">Pages Crawled</div></div>
      </div>

      <div class="wa-crawlbar">
        <label>Crawl depth <input type="number" data-cfg="depth" min="0" max="4" value="1"></label>
        <label>Max pages <input type="number" data-cfg="maxpages" min="1" max="100" value="20"></label>
        <button class="wa-button" data-action="crawl" type="button">Crawl same-origin links</button>
        <span class="wa-crawl-status" data-crawl-status>Single page analyzed. Crawl for a site-wide picture.</span>
      </div>

      <nav class="wa-tabs">
        <button class="wa-tab active" data-tab="endpoints" type="button">APIs / Endpoints</button>
        <button class="wa-tab" data-tab="paths" type="button">Paths</button>
        <button class="wa-tab" data-tab="scripts" type="button">JavaScript</button>
        <button class="wa-tab" data-tab="resources" type="button">Resources</button>
        <button class="wa-tab" data-tab="secrets" type="button">Possible Secrets</button>
        <button class="wa-tab" data-tab="maps" type="button">Source Maps</button>
        <button class="wa-tab" data-tab="domains" type="button">Domains</button>
        <button class="wa-tab" data-tab="forms" type="button">Forms</button>
        <button class="wa-tab" data-tab="pages" type="button">Pages Crawled</button>
        <button class="wa-tab" data-tab="public" type="button">Public Files</button>
      </nav>

      <main class="wa-body">
        <div class="wa-toolbar">
          <input class="wa-search" type="search" placeholder="Filter results..." autocomplete="off">
          <button class="wa-button" data-action="export" type="button">Export JSON</button>
        </div>
        <div class="wa-list" data-results></div>
      </main>
    </section>
  `;

  document.documentElement.appendChild(root);

  const $ = (selector) => root.querySelector(selector);

  const progress = $(".wa-progress-bar");
  const resultBox = $("[data-results]");
  const search = $(".wa-search");
  const crawlStatus = $("[data-crawl-status]");
  const crawlBtn = $('[data-action="crawl"]');

  $(".wa-subtitle").textContent = location.origin;

  let currentTab = "endpoints";

  // ================================================================
  // DATA HELPERS
  // ================================================================

  function arrayFor(tab) {
    if (tab === "endpoints") return [...data.endpoints];
    if (tab === "paths") return [...data.paths];
    if (tab === "scripts") return data.scripts;
    if (tab === "resources") return data.resources;
    if (tab === "secrets") return data.secrets;
    if (tab === "maps") return data.sourcemaps;
    if (tab === "domains") return [...data.domains];
    if (tab === "forms") return data.forms;
    if (tab === "pages") return data.pages;
    return [];
  }

  // ================================================================
  // RENDER PUBLIC FILES
  // ================================================================

  function renderPublic() {
    const parts = [];

    const publicFiles = [
      ["robots.txt", data.robots],
      ["sitemap.xml", data.sitemap],
      [".well-known/security.txt", data.securityTxt],
      ["humans.txt", data.humansTxt]
    ];

    for (const [label, file] of publicFiles) {
      if (!file) continue;
      parts.push(`
        <article class="wa-item">
          <div class="wa-item-title">${escapeHTML(label)}</div>
          <div class="wa-item-meta">${escapeHTML(file.url)}</div>
          <div class="wa-code">${escapeHTML(file.content.slice(0, 12000))}</div>
        </article>
      `);
    }

    resultBox.innerHTML = parts.length
      ? parts.join("")
      : `<div class="wa-empty">No publicly readable discovery files detected.</div>`;
  }

  // ================================================================
  // RENDER RESULTS
  // ================================================================

  function render() {
    if (currentTab === "public") {
      renderPublic();
      return;
    }

    let items = arrayFor(currentTab);
    const filter = search.value.trim().toLowerCase();

    if (filter) {
      items = items.filter((item) => JSON.stringify(item).toLowerCase().includes(filter));
    }

    if (!items.length) {
      resultBox.innerHTML = `<div class="wa-empty">No results found.</div>`;
      return;
    }

    resultBox.innerHTML = items.map((item) => {
      if (typeof item === "string") {
        return `<article class="wa-item"><div class="wa-item-title wa-code">${escapeHTML(item)}</div></article>`;
      }

      if (currentTab === "secrets") {
        return `
          <article class="wa-item wa-warning">
            <div class="wa-item-title">${escapeHTML(item.type)}</div>
            <div class="wa-item-meta">
              Source: ${escapeHTML(item.source)}<br>
              Redacted match: <span class="wa-code">${escapeHTML(item.preview)}</span>
            </div>
          </article>
        `;
      }

      if (currentTab === "scripts") {
        return `
          <article class="wa-item">
            <div class="wa-item-title wa-code">${escapeHTML(item.url)}</div>
            <div class="wa-item-meta">
              ${item.sameOrigin ? "Same origin" : "External resource"} · ${escapeHTML(item.type || "")}
            </div>
          </article>
        `;
      }

      if (currentTab === "resources") {
        return `
          <article class="wa-item">
            <div class="wa-item-title wa-code">${escapeHTML(item.url)}</div>
            <div class="wa-item-meta">
              ${item.initiator ? "Initiator: " + escapeHTML(item.initiator) : ""}
              ${item.duration !== undefined ? " · " + item.duration + " ms" : ""}
            </div>
          </article>
        `;
      }

      if (currentTab === "forms") {
        return `
          <article class="wa-item">
            <div class="wa-item-title">
              ${escapeHTML(item.method)} → <span class="wa-code">${escapeHTML(item.action)}</span>
            </div>
            <div class="wa-item-meta">
              Fields: ${item.fields.length}<br>
              ${item.fields.map((f) => escapeHTML(`${f.name || "(unnamed)"} [${f.type}]`)).join(" · ")}
            </div>
          </article>
        `;
      }

      if (currentTab === "maps") {
        return `
          <article class="wa-item">
            <div class="wa-item-title">Source map detected</div>
            <div class="wa-item-meta">
              Source: <span class="wa-code">${escapeHTML(item.source)}</span><br>
              Map: <span class="wa-code">${escapeHTML(item.map)}</span>
            </div>
          </article>
        `;
      }

      if (currentTab === "pages") {
        return `
          <article class="wa-item">
            <div class="wa-item-title wa-code">${escapeHTML(item.url)}</div>
            <div class="wa-item-meta">
              Depth: ${item.depth} · Status: ${item.status ?? "?"} · Links found: ${item.linkCount ?? 0}
            </div>
          </article>
        `;
      }

      return `<article class="wa-item"><div class="wa-item-title wa-code">${escapeHTML(JSON.stringify(item))}</div></article>`;
    }).join("");
  }

  // ================================================================
  // STATISTICS
  // ================================================================

  function updateStats() {
    $("[data-stat=endpoints]").textContent = data.endpoints.size;
    $("[data-stat=paths]").textContent = data.paths.size;
    $("[data-stat=scripts]").textContent = data.scripts.length;
    $("[data-stat=resources]").textContent = data.resources.length;
    $("[data-stat=secrets]").textContent = data.secrets.length;
    $("[data-stat=maps]").textContent = data.sourcemaps.length;
    $("[data-stat=pages]").textContent = data.pages.length;
  }

  // ================================================================
  // SECRET / URL PATTERNS (shared by JS + CSS + JSON inspection)
  // ================================================================

  const SECRET_PATTERNS = [
    { name: "AWS Access Key", regex: /\bAKIA[0-9A-Z]{16}\b/g },
    { name: "Google API Key", regex: /\bAIza[0-9A-Za-z_-]{30,}\b/g },
    { name: "GitHub Token", regex: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g },
    { name: "Slack Token", regex: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/g },
    { name: "Stripe Key", regex: /\b(?:sk|pk|rk)_(?:live|test)_[0-9A-Za-z]{16,}\b/g },
    { name: "Twilio API Key", regex: /\bSK[0-9a-fA-F]{32}\b/g },
    { name: "SendGrid API Key", regex: /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/g },
    { name: "Firebase Web API Key", regex: /\bAIzaSy[0-9A-Za-z_-]{33}\b/g },
    { name: "Private Key Material", regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
    { name: "JWT-like Token", regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g },
    { name: "Generic Bearer Token", regex: /\bBearer\s+[A-Za-z0-9_\-.]{20,}\b/g },
    {
      name: "Generic Secret Assignment",
      regex: /\b(?:api[_-]?key|secret[_-]?key|client[_-]?secret|access[_-]?token|private[_-]?key)\s*[:=]\s*["'`][^"'`]{8,}["'`]/gi
    }
  ];

  function scanForSecrets(text, source) {
    SECRET_PATTERNS.forEach((pattern) => {
      const matches = text.match(pattern.regex) || [];
      matches.forEach((match) => {
        const preview = match.length > 12 ? match.slice(0, 6) + "…" + match.slice(-4) : "[redacted]";
        data.secrets.push({ type: pattern.name, source, preview });
      });
    });
  }

  // ================================================================
  // JAVASCRIPT / JSON INSPECTION
  // ================================================================

  function inspectJavaScript(text, source) {
    const urls = text.match(/https?:\/\/[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]+/g) || [];
    urls.forEach((u) => addEndpoint(u));

    const apiPaths = text.match(
      /["'`](\/(?:api|graphql|rest|auth|oauth|admin|internal|private|debug|config|users?|account|upload|download|search|webhook|callback|v\d+)[^"'`]*)["'`]/gi
    ) || [];
    apiPaths.forEach((match) => addPath(match.slice(1, -1)));

    const paths = text.match(/["'`](\/[A-Za-z0-9_./:@?&=%${}-]{2,200})["'`]/g) || [];
    paths.forEach((raw) => {
      const path = raw.slice(1, -1);
      if (/\/(api|graphql|rest|auth|oauth|admin|internal|private|debug|config|users?|account|upload|download|search|webhook|callback|v\d+)/i.test(path)) {
        addPath(path);
      }
    });

    scanForSecrets(text, source);

    const maps = text.match(/[#@]\s*sourceMappingURL=([^\s]+)/g) || [];
    maps.forEach((match) => {
      const value = match.replace(/^.*sourceMappingURL=/, "").trim();
      const mapURL = normalize(value, source);
      if (mapURL) data.sourcemaps.push({ source, map: mapURL });
    });
  }

  // ================================================================
  // CSS INSPECTION (new)
  // ================================================================

  function inspectCSS(text, source) {
    const urlRefs = text.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g) || [];
    urlRefs.forEach((raw) => {
      const value = raw.replace(/^url\(\s*['"]?/, "").replace(/['"]?\s*\)$/, "");
      if (/^https?:\/\//i.test(value)) {
        addEndpoint(value, source);
      } else {
        addPath(normalize(value, source)?.replace(location.origin, "") || value);
      }
    });

    const imports = text.match(/@import\s+(?:url\()?['"]([^'")]+)['"]\)?/g) || [];
    imports.forEach((raw) => {
      const value = raw.match(/['"]([^'")]+)['"]/)[1];
      addEndpoint(value, source);
    });

    scanForSecrets(text, source); // occasionally CSS-in-JS bundles leak values here
  }

  async function inspectStyle(url) {
    if (visitedStyles.has(url)) return;
    visitedStyles.add(url);

    try {
      const response = await fetch(url, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) return;
      const text = await response.text();
      data.resources.push({ url, status: response.status, type: response.headers.get("content-type") || "text/css" });
      inspectCSS(text, url);
    } catch {}
  }

  // ================================================================
  // INSPECT SAME-ORIGIN SCRIPT
  // ================================================================

  async function inspectScript(url) {
    if (visitedScripts.has(url)) return;
    visitedScripts.add(url);

    try {
      const response = await fetch(url, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) return;
      const text = await response.text();
      data.resources.push({ url, status: response.status, type: response.headers.get("content-type") || "" });
      inspectJavaScript(text, url);
    } catch {}
  }

  // ================================================================
  // PUBLIC FILES
  // ================================================================

  async function inspectPublicFile(path) {
    try {
      const url = new URL(path, location.origin).href;
      const response = await fetch(url, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) return null;
      return { url, status: response.status, content: await response.text() };
    } catch {
      return null;
    }
  }

  // ================================================================
  // SINGLE-PAGE ANALYSIS (scripts, stylesheets, forms, timing, html)
  // ================================================================

  function extractLinksFromHTML(html, baseURL) {
    const hrefs = html.match(/href=["']([^"'#][^"']*)["']/gi) || [];
    const links = new Set();

    hrefs.forEach((raw) => {
      const value = raw.replace(/^href=["']/i, "").replace(/["']$/, "");
      const url = normalize(value, baseURL);
      if (url && sameOrigin(url) && /^https?:/i.test(url)) {
        // strip fragment for dedupe
        try {
          const u = new URL(url);
          u.hash = "";
          links.add(u.href);
        } catch {}
      }
    });

    return [...links];
  }

  async function analyzeDocument(doc, docURL, htmlText) {
    const html = htmlText ?? doc.documentElement.outerHTML;

    const htmlURLs = html.match(/https?:\/\/[^\s"'<>\\]+/gi) || [];
    htmlURLs.forEach((u) => addEndpoint(u, docURL));

    const htmlPaths = html.match(/["'`]((?:\/|\.?\.?\/)[^"'`<>\s]{1,300})["'`]/g) || [];
    htmlPaths.forEach((raw) => addPath(raw.slice(1, -1)));

    scanForSecrets(html, docURL);

    // scripts
    for (const script of [...doc.scripts]) {
      if (script.src) {
        const url = normalize(script.src, docURL);
        if (!url) continue;

        if (!data.scripts.some((s) => s.url === url)) {
          data.scripts.push({ url, sameOrigin: sameOrigin(url), type: script.type || "text/javascript" });
        }
        addEndpoint(url, docURL);
      } else if (script.textContent.trim()) {
        inspectJavaScript(script.textContent, docURL + " (inline script)");
      }
    }

    // stylesheets referenced via <link>
    for (const link of [...doc.querySelectorAll('link[rel="stylesheet"][href]')]) {
      const url = normalize(link.getAttribute("href"), docURL);
      if (url && sameOrigin(url)) {
        await inspectStyle(url);
      } else if (url) {
        data.resources.push({ url, initiator: "stylesheet" });
      }
    }

    // forms
    for (const form of [...doc.forms]) {
      const action = normalize(form.getAttribute("action") || docURL, docURL);
      data.forms.push({
        method: (form.method || "GET").toUpperCase(),
        action,
        fields: [...form.elements].map((field) => ({
          name: field.name || null,
          type: field.type || field.tagName.toLowerCase(),
          autocomplete: field.autocomplete || null
        }))
      });
      addEndpoint(action, docURL);
    }

    return extractLinksFromHTML(html, docURL);
  }

  // Initial page (the live DOM, so we get post-render state too)
  const initialLinks = await analyzeDocument(document, location.href);

  updateStats();
  render();

  // Fetch and inspect same-origin scripts discovered on the initial page
  const sameOriginScripts = data.scripts.filter((s) => s.sameOrigin);
  for (let i = 0; i < sameOriginScripts.length; i++) {
    await inspectScript(sameOriginScripts[i].url);
    progress.style.width = `${Math.round(((i + 1) / Math.max(1, sameOriginScripts.length)) * 100)}%`;
    updateStats();
    render();
  }

  // Resource timing entries (perf API) for the initial page
  for (const entry of performance.getEntriesByType("resource")) {
    const url = normalize(entry.name);
    if (!url) continue;

    data.resources.push({ url, initiator: entry.initiatorType, duration: Math.round(entry.duration) });

    try {
      const path = new URL(url).pathname;
      if (/\/(api|graphql|rest|auth|oauth|v\d+)\b/i.test(path)) addEndpoint(url);
    } catch {}
  }

  // Public discovery files (all conventionally public, not guessed/hidden paths)
  data.robots = await inspectPublicFile("/robots.txt");
  data.sitemap = await inspectPublicFile("/sitemap.xml");
  data.securityTxt = await inspectPublicFile("/.well-known/security.txt");
  data.humansTxt = await inspectPublicFile("/humans.txt");

  if (data.robots?.content) {
    data.robots.content.split(/\r?\n/).forEach((line) => {
      const match = line.match(/^\s*(?:Disallow|Allow)\s*:\s*(\S+)/i);
      if (match) addPath(match[1]);
    });
  }

  // Pull extra URLs out of sitemap.xml as crawl seeds
  let sitemapSeeds = [];
  if (data.sitemap?.content) {
    const locs = data.sitemap.content.match(/<loc>([^<]+)<\/loc>/g) || [];
    sitemapSeeds = locs
      .map((tag) => tag.replace(/<\/?loc>/g, "").trim())
      .filter((u) => sameOrigin(u));
    sitemapSeeds.forEach((u) => addEndpoint(u));
  }

  data.pages.push({ url: location.href, depth: 0, status: 200, linkCount: initialLinks.length });

  visitedPages.add(new URL(location.href).href.split("#")[0]);

  updateStats();
  render();

  // ================================================================
  // DEEPER SEARCH: SAME-ORIGIN BFS CRAWL
  // ================================================================

  let crawling = false;

  async function crawlSite(maxDepth, maxPages) {
    if (crawling) return;
    crawling = true;
    crawlBtn.disabled = true;

    let queue = initialLinks
      .concat(sitemapSeeds)
      .filter((u) => !visitedPages.has(u))
      .map((u) => ({ url: u, depth: 1 }));

    // dedupe queue itself
    const seenInQueue = new Set(queue.map((q) => q.url));

    let processed = 0;

    while (queue.length && data.pages.length < maxPages) {
      const { url, depth } = queue.shift();

      if (visitedPages.has(url) || depth > maxDepth) continue;
      visitedPages.add(url);

      crawlStatus.textContent = `Crawling (${data.pages.length + 1}/${maxPages}): ${url}`;

      try {
        const response = await fetch(url, { credentials: "same-origin", cache: "no-store" });
        const contentType = response.headers.get("content-type") || "";
        const status = response.status;

        if (!response.ok || !contentType.includes("html")) {
          data.pages.push({ url, depth, status, linkCount: 0 });
        } else {
          const text = await response.text();
          const parsedDoc = new DOMParser().parseFromString(text, "text/html");
          const links = await analyzeDocument(parsedDoc, url, text);

          data.pages.push({ url, depth, status, linkCount: links.length });

          if (depth < maxDepth) {
            links.forEach((link) => {
              if (!visitedPages.has(link) && !seenInQueue.has(link)) {
                queue.push({ url: link, depth: depth + 1 });
                seenInQueue.add(link);
              }
            });
          }
        }
      } catch {
        data.pages.push({ url, depth, status: "error", linkCount: 0 });
      }

      processed++;
      progress.style.width = `${Math.round((data.pages.length / maxPages) * 100)}%`;
      updateStats();
      render();

      // small delay to avoid hammering the server
      await new Promise((r) => setTimeout(r, 150));
    }

    // Inspect any newly discovered same-origin scripts/styles from the crawl
    const newScripts = data.scripts.filter((s) => s.sameOrigin && !visitedScripts.has(s.url));
    for (const s of newScripts) {
      await inspectScript(s.url);
      updateStats();
      render();
    }

    crawlStatus.textContent = `Crawl complete: ${data.pages.length} page(s) visited.`;
    crawlBtn.disabled = false;
    crawling = false;
  }

  // ================================================================
  // EVENT WIRING
  // ================================================================

  root.querySelectorAll(".wa-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      root.querySelectorAll(".wa-tab").forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");
      currentTab = tab.dataset.tab;
      search.value = "";
      render();
    });
  });

  search.addEventListener("input", render);

  crawlBtn.addEventListener("click", () => {
    const depth = Math.max(0, Math.min(4, parseInt($('[data-cfg="depth"]').value, 10) || 1));
    const maxPages = Math.max(1, Math.min(100, parseInt($('[data-cfg="maxpages"]').value, 10) || 20));
    crawlSite(depth, maxPages);
  });

  $("[data-action=export]").addEventListener("click", () => {
    const output = {
      target: location.href,
      timestamp: new Date().toISOString(),
      endpoints: [...data.endpoints],
      paths: [...data.paths],
      scripts: data.scripts,
      resources: data.resources,
      domains: [...data.domains],
      secrets: data.secrets,
      sourcemaps: data.sourcemaps,
      forms: data.forms,
      pages: data.pages,
      robots: data.robots,
      sitemap: data.sitemap,
      securityTxt: data.securityTxt,
      humansTxt: data.humansTxt
    };

    const blob = new Blob([JSON.stringify(output, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `web-audit-${location.hostname}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  $(".wa-close").addEventListener("click", () => root.remove());
  $(".wa-overlay").addEventListener("click", () => root.remove());

  updateStats();
  render();
})();