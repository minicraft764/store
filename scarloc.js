(function () {
  let isPaused = false;
  let lastFetchedIp = null;

  // Window state
  let isMinimized = false;
  let isClosing = false;
  let isAnimating = false;
  let savedHeight = "310px";

  // Cleanup existing instances
  const existingWin = document.getElementById("scarloc-window");
  if (existingWin) existingWin.remove();
  const existingStyle = document.getElementById("scarloc-style");
  if (existingStyle) existingStyle.remove();

  // --- 1. Inject Styles ---
  const style = document.createElement("style");
  style.id = "scarloc-style";
  style.textContent = `
    @keyframes scarloc-slide-down {
      0% {
        clip-path: inset(0 0 100% 0);
      }
      100% {
        clip-path: inset(0 0 0% 0);
      }
    }

    #scarloc-window {
      position: fixed;
      top: 60px;
      left: 60px;
      width: 330px;
      height: 310px;
      min-width: 260px;
      min-height: 220px;
      background: rgba(24, 24, 37, 0.95);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      color: #cdd6f4;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 13px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 14px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);
      z-index: 999999;
      display: flex;
      flex-direction: column;
      resize: both;
      overflow: hidden;
      box-sizing: border-box;
      transform-origin: center center;

      /* Smooth transitions for size and placement.
         min-height must transition too, otherwise it snaps the window
         to 220px the instant the minimized class is removed. */
      transition: height 0.5s cubic-bezier(0.16, 1, 0.3, 1),
                  min-height 0.5s cubic-bezier(0.16, 1, 0.3, 1),
                  width 0.5s cubic-bezier(0.16, 1, 0.3, 1),
                  border-radius 0.5s cubic-bezier(0.16, 1, 0.3, 1),
                  opacity 0.5s ease,
                  transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    }

    #scarloc-window.resizing {
      transition: none !important;
    }

    #scarloc-header {
      background: rgba(17, 17, 27, 0.85);
      padding: 10px 14px;
      cursor: move;
      user-select: none;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      font-weight: 700;
      letter-spacing: 0.5px;
      flex-shrink: 0;
      height: 42px;
      box-sizing: border-box;
      z-index: 2;
    }

    .scarloc-title {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #f38ba8;
      font-size: 13px;
      font-weight: 800;
      white-space: nowrap;
    }

    .scarloc-controls {
      display: flex;
      gap: 6px;
    }

    .scarloc-btn {
      background: rgba(255, 255, 255, 0.08);
      color: #cdd6f4;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      width: 24px;
      height: 24px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    .scarloc-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      color: #fff;
    }

    .scarloc-btn.active {
      background: #f38ba8;
      color: #11111b;
      border-color: #f38ba8;
    }

    #scarloc-toolbar {
      display: flex;
      gap: 8px;
      padding: 8px 12px;
      background: rgba(17, 17, 27, 0.5);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      flex-shrink: 0;
      transition: opacity 0.3s ease 0.15s;
    }

    #scarloc-toolbar button {
      flex: 1;
      padding: 6px 10px;
      background: rgba(255, 255, 255, 0.08);
      color: #cdd6f4;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 6px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 700;
      transition: background 0.2s ease;
    }

    #scarloc-toolbar button:hover {
      background: rgba(255, 255, 255, 0.18);
    }

    #scarloc-toolbar button.active {
      background: #f38ba8;
      color: #11111b;
      border-color: #f38ba8;
    }

    #scarloc-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: opacity 0.3s ease 0.15s;
    }

    #scarloc-content {
      padding: 12px;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      overflow: hidden;
      box-sizing: border-box;
      font-weight: 700;
    }

    #scarloc-content.has-data {
      justify-content: space-evenly;
      align-items: stretch;
      text-align: left;
    }

    .scarloc-status-msg {
      font-weight: 800;
      font-size: 13px;
      color: #89b4fa;
      letter-spacing: 0.3px;
    }

    .scarloc-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 7px 10px;
      border-radius: 8px;
      font-size: 12px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(30, 30, 46, 0.7);
      margin-bottom: 4px;
    }

    .scarloc-box:last-child {
      margin-bottom: 0;
    }

    .scarloc-label {
      font-weight: 800;
      letter-spacing: 0.3px;
      flex-shrink: 0;
      margin-right: 8px;
    }

    .scarloc-value {
      font-weight: 800;
      text-align: right;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #ffffff;
    }

    .box-ip { background: rgba(137, 180, 250, 0.15); border-color: rgba(137, 180, 250, 0.35); }
    .box-ip .scarloc-label { color: #89b4fa; }

    .box-country { background: rgba(166, 227, 161, 0.15); border-color: rgba(166, 227, 161, 0.35); }
    .box-country .scarloc-label { color: #a6e3a1; }

    .box-state { background: rgba(249, 226, 175, 0.15); border-color: rgba(249, 226, 175, 0.35); }
    .box-state .scarloc-label { color: #f9e2af; }

    .box-city { background: rgba(203, 166, 247, 0.15); border-color: rgba(203, 166, 247, 0.35); }
    .box-city .scarloc-label { color: #cba6f7; }

    .box-district { background: rgba(148, 226, 213, 0.15); border-color: rgba(148, 226, 213, 0.35); }
    .box-district .scarloc-label { color: #94e2d5; }

    .box-coords { background: rgba(243, 139, 168, 0.15); border-color: rgba(243, 139, 168, 0.35); }
    .box-coords .scarloc-label { color: #f38ba8; }

    /* Minimized State */
    #scarloc-window.minimized {
      height: 42px !important;
      min-height: 42px !important;
      resize: none !important;
    }

    #scarloc-window.minimized #scarloc-body,
    #scarloc-window.minimized #scarloc-toolbar {
      opacity: 0 !important;
      pointer-events: none !important;
      transition: opacity 0.15s ease 0s;
    }

    /* Unminimizing transition helper */
    #scarloc-window.unminimizing #scarloc-body,
    #scarloc-window.unminimizing #scarloc-toolbar {
      animation: scarloc-slide-down 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    /* Circle Text Overlay for Closing */
    #scarloc-bye-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 20px;
      font-weight: 900;
      color: #f38ba8;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
      z-index: 10;
    }

    #scarloc-window.closing-step1 {
      width: 140px !important;
      height: 140px !important;
      min-width: 0 !important;
      min-height: 0 !important;
      border-radius: 50% !important;
      resize: none !important;
      background: rgba(17, 17, 27, 0.95);
    }

    #scarloc-window.closing-step1 #scarloc-header,
    #scarloc-window.closing-step1 #scarloc-body,
    #scarloc-window.closing-step1 #scarloc-toolbar {
      opacity: 0 !important;
      pointer-events: none !important;
    }

    #scarloc-window.closing-step1 #scarloc-bye-overlay {
      opacity: 1 !important;
    }

    #scarloc-window.closing-step2 {
      transform: scale(0) rotate(180deg) !important;
      opacity: 0 !important;
    }
  `;
  document.head.appendChild(style);

  // --- 2. Build GUI ---
  const win = document.createElement("div");
  win.id = "scarloc-window";
  win.innerHTML = `
    <div id="scarloc-bye-overlay">bye! 👋</div>
    <div id="scarloc-header">
      <div class="scarloc-title" id="scarloc-title-text">
        <span>ScarLoc</span>
      </div>
      <div class="scarloc-controls">
        <button class="scarloc-btn" id="scarloc-btn-min" title="Minimize">—</button>
        <button class="scarloc-btn" id="scarloc-btn-close" title="Close">✕</button>
      </div>
    </div>
    <div id="scarloc-toolbar">
      <button id="scarloc-btn-pause">Pause API</button>
      <button id="scarloc-btn-reload">Reload Data</button>
    </div>
    <div id="scarloc-body">
      <div id="scarloc-content">
        <span class="scarloc-status-msg">Waiting for WebRTC traffic...</span>
      </div>
    </div>
  `;
  document.body.appendChild(win);

  const contentEl = win.querySelector("#scarloc-content");
  const pauseBtn = win.querySelector("#scarloc-btn-pause");
  const reloadBtn = win.querySelector("#scarloc-btn-reload");
  const minBtn = win.querySelector("#scarloc-btn-min");
  const closeBtn = win.querySelector("#scarloc-btn-close");

  // Disable transitions while the user manually resizes, but ignore
  // size changes caused by our own minimize/unminimize animation.
  const resizeObserver = new ResizeObserver(() => {
    if (isMinimized || isClosing || isAnimating) return;
    win.classList.add("resizing");
    clearTimeout(win._resizeTimer);
    win._resizeTimer = setTimeout(() => win.classList.remove("resizing"), 100);
  });
  resizeObserver.observe(win);

  // --- 3. Dragging Logic ---
  let isDragging = false, offsetStartX = 0, offsetStartY = 0;
  const header = win.querySelector("#scarloc-header");

  header.addEventListener("mousedown", (e) => {
    if (e.target.classList.contains("scarloc-btn")) return;
    isDragging = true;
    win.classList.add("resizing");
    offsetStartX = e.clientX - win.offsetLeft;
    offsetStartY = e.clientY - win.offsetTop;
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    win.style.left = `${e.clientX - offsetStartX}px`;
    win.style.top = `${e.clientY - offsetStartY}px`;
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      win.classList.remove("resizing");
    }
  });

  // --- 4. Controls Actions ---
  minBtn.addEventListener("click", () => {
    if (isClosing || isAnimating) return;

    isAnimating = true;
    win.classList.remove("resizing");

    if (!isMinimized) {
      savedHeight = win.style.height && win.style.height !== "42px" ? win.style.height : "310px";
      win.style.height = win.offsetHeight + "px"; // pin current height so it animates from here
      win.classList.add("minimized");
      minBtn.textContent = "□";
      isMinimized = true;
    } else {
      win.classList.add("unminimizing");
      win.classList.remove("minimized");
      win.style.height = savedHeight;
      minBtn.textContent = "—";
      isMinimized = false;
    }

    setTimeout(() => {
      win.classList.remove("unminimizing");
      isAnimating = false;
    }, 500);
  });

  closeBtn.addEventListener("click", () => {
    if (isClosing) return;
    isClosing = true;

    const rect = win.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    win.style.left = `${centerX - 70}px`;
    win.style.top = `${centerY - 70}px`;

    win.classList.add("closing-step1");

    setTimeout(() => {
      win.classList.add("closing-step2");
    }, 600);

    setTimeout(() => {
      win.remove();
    }, 1400);
  });

  pauseBtn.addEventListener("click", () => {
    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? "Resume API" : "Pause API";
    pauseBtn.classList.toggle("active", isPaused);
  });

  reloadBtn.addEventListener("click", () => {
    if (lastFetchedIp) {
      getLocation(lastFetchedIp, true);
    } else {
      contentEl.classList.remove("has-data");
      contentEl.innerHTML = `<span class="scarloc-status-msg" style="color: #f38ba8;">No IP captured yet to reload.</span>`;
    }
  });

  // --- 5. Data Fetcher & Colored Boxes (public APIs, no key / no account) ---
  const esc = (v) =>
    String(v == null || v === "" ? "N/A" : v).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));

  // Each provider is tried in order; if one fails or is rate limited, the next is used.
  const providers = [
    {
      name: "ipwho.is",
      url: (ip) => `https://ipwho.is/${ip}`,
      parse: (j) => {
        if (j.success === false) throw new Error(j.message || "ipwho.is error");
        return {
          country: j.country, state: j.region, city: j.city,
          isp: j.connection && (j.connection.isp || j.connection.org),
          lat: j.latitude, lon: j.longitude
        };
      }
    },
    {
      name: "freeipapi.com",
      url: (ip) => `https://freeipapi.com/api/json/${ip}`,
      parse: (j) => {
        if (!j || !j.countryName) throw new Error("freeipapi.com returned no data");
        return {
          country: j.countryName, state: j.regionName, city: j.cityName,
          isp: null, lat: j.latitude, lon: j.longitude
        };
      }
    },
    {
      name: "ipapi.co",
      url: (ip) => `https://ipapi.co/${ip}/json/`,
      parse: (j) => {
        if (j.error) throw new Error(j.reason || "ipapi.co error");
        return {
          country: j.country_name, state: j.region, city: j.city,
          isp: j.org, lat: j.latitude, lon: j.longitude
        };
      }
    }
  ];

  const getLocation = async (ip, force = false) => {
    lastFetchedIp = ip;
    if (isPaused && !force) {
      contentEl.classList.remove("has-data");
      contentEl.innerHTML = `<span class="scarloc-status-msg" style="color: #a6adc8;">API paused. Detected IP: ${esc(ip)}</span>`;
      return;
    }

    contentEl.classList.remove("has-data");
    contentEl.innerHTML = `<span class="scarloc-status-msg">Fetching IP data for ${esc(ip)}...</span>`;

    let data = null, source = "", lastErr = null;
    for (const p of providers) {
      try {
        const response = await fetch(p.url(ip));
        if (!response.ok) throw new Error(`${p.name} HTTP ${response.status}`);
        data = p.parse(await response.json());
        source = p.name;
        break;
      } catch (err) {
        lastErr = err;
      }
    }

    if (!data) {
      contentEl.classList.remove("has-data");
      contentEl.innerHTML = `<span class="scarloc-status-msg" style="color: #f38ba8;">Failed to fetch data.<br>${esc(lastErr && lastErr.message)}</span>`;
      return;
    }

    contentEl.classList.add("has-data");
    contentEl.innerHTML = `
      <div class="scarloc-box box-ip"><span class="scarloc-label">IP</span><span class="scarloc-value">${esc(ip)}</span></div>
      <div class="scarloc-box box-country"><span class="scarloc-label">Country</span><span class="scarloc-value">${esc(data.country)}</span></div>
      <div class="scarloc-box box-state"><span class="scarloc-label">State</span><span class="scarloc-value">${esc(data.state)}</span></div>
      <div class="scarloc-box box-city"><span class="scarloc-label">City</span><span class="scarloc-value">${esc(data.city)}</span></div>
      <div class="scarloc-box box-district"><span class="scarloc-label">ISP</span><span class="scarloc-value" title="${esc(source)}">${esc(data.isp)}</span></div>
      <div class="scarloc-box box-coords"><span class="scarloc-label">Lat / Long</span><span class="scarloc-value">(${esc(data.lat)}, ${esc(data.lon)})</span></div>
    `;
  };

  // --- 6. WebRTC Capture ---
  window.oRTCPeerConnection = window.oRTCPeerConnection || window.RTCPeerConnection;

  window.RTCPeerConnection = function (...args) {
    const pc = new window.oRTCPeerConnection(...args);
    pc.oaddIceCandidate = pc.addIceCandidate;

    pc.addIceCandidate = function (iceCandidate, ...rest) {
      if (iceCandidate && iceCandidate.candidate) {
        const fields = iceCandidate.candidate.split(" ");
        const ip = fields[4];
        if (fields[7] === "srflx") {
          getLocation(ip);
        }
      }
      return pc.oaddIceCandidate(iceCandidate, ...rest);
    };
    return pc;
  };
})();
