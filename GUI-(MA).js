(async function() {
    // ------------------------------------------------------------------------
    // ONLY RUN IN THE TOP FRAME
    // ------------------------------------------------------------------------
    if (window.top !== window.self) {
        return;
    }

    // ------------------------------------------------------------------------
    // RE-INJECTION PROTECTION
    // ------------------------------------------------------------------------
    if (window.__SYSTEM_INJECTOR_RUNNING === true) {
        return;
    }
    window.__SYSTEM_INJECTOR_RUNNING = true;

    // Load settings from background script
    let appSettings = { ytApi: "", geminiApi: "" };
    try { const raw = localStorage.getItem("scary-appSettings"); if (raw) { const parsed = JSON.parse(raw); appSettings.ytApi = parsed.ytApi || ""; appSettings.geminiApi = parsed.geminiApi || ""; } } catch (e) { console.warn("Failed to load settings", e); }


    // ========================================================================
    // NOTIFICATION
    // ========================================================================
    const FALLBACK_ICON = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='12' fill='%233b82f6'/%3E%3Cpath d='M12 6v7M12 16.5h.01' stroke='white' stroke-width='2' stroke-linecap='round' fill='none'/%3E%3C/svg%3E";

    const ICONS = {
        default: "https://yt3.ggpht.com/bY3FRM-mlj7-7R0wuNYHoVl6RRsT_QfhVlV4u0G3Lqo_OE4ePRvPt_WV7eYLTxhDRuu_zxjmdg=s600-c-k-c0x00ffffff-no-rj-rp-mo",
        moon: "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'/%3E%3C/svg%3E",
        sun: "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='5'/%3E%3Cpath d='M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42'/%3E%3C/svg%3E",
        opacity: "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cline x1='4' y1='21' x2='4' y2='14'/%3E%3Cline x1='4' y1='10' x2='4' y2='3'/%3E%3Cline x1='12' y1='21' x2='12' y2='12'/%3E%3Cline x1='12' y1='8' x2='12' y2='3'/%3E%3Cline x1='20' y1='21' x2='20' y2='16'/%3E%3Cline x1='20' y1='12' x2='20' y2='3'/%3E%3Cline x1='1' y1='14' x2='7' y2='14'/%3E%3Cline x1='9' y1='8' x2='15' y2='8'/%3E%3Cline x1='17' y1='16' x2='23' y2='16'/%3E%3C/svg%3E",
        download: "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/%3E%3Cpolyline points='7 10 12 15 17 10'/%3E%3Cline x1='12' y1='15' x2='12' y2='3'/%3E%3C/svg%3E",
        error: "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'/%3E%3Cline x1='12' y1='9' x2='12' y2='13'/%3E%3Cline x1='12' y1='17' x2='12.01' y2='17'/%3E%3C/svg%3E",
        replay: "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='1 4 1 10 7 10'/%3E%3Cpath d='M3.51 15a9 9 0 1 0 2.13-9.36L1 10'/%3E%3C/svg%3E",
        tools: "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z'/%3E%3C/svg%3E"
    };

    // How long the notification is visible (5 seconds)
    const NOTIF_DURATION = 5000;
    // SLOWED DOWN: The exit slide animation now takes 2 full seconds
    const NOTIF_EXIT_DURATION = 2000;

    function showNotification(options = {}) {
        const title = options.title || "System Injector";
        const message = options.message || "Script injected successfully!";
        const iconUrl = options.iconUrl || ICONS.default;
        const duration = Number(options.duration) || NOTIF_DURATION;

        let wrapper = document.getElementById("scary-notifications-wrapper");
        if (!wrapper) {
            wrapper = document.createElement("div");
            wrapper.id = "scary-notifications-wrapper";
            wrapper.dir = "ltr";
            wrapper.style.cssText = "position: fixed; bottom: 24px; right: 24px; z-index: 2147483647; display: flex; flex-direction: column; gap: 10px; pointer-events: none;";
            (document.body || document.documentElement).appendChild(wrapper);

            const style = document.createElement("style");
            style.id = "injected-notification-styles";
            style.textContent = `
                @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
                @keyframes notifSlideIn {
                    0% { transform: translateX(120%) scale(0.8); opacity: 0; }
                    60% { transform: translateX(-6%) scale(1.02); opacity: 1; }
                    100% { transform: translateX(0) scale(1); opacity: 1; }
                }
                @keyframes notifSlideOut {
                    0% { transform: translateX(0) scale(1); opacity: 1; max-height: 120px; margin-top: 0; }
                    60% { transform: translateX(130%) scale(0.9); opacity: 0; max-height: 120px; margin-top: 0; }
                    100% { transform: translateX(130%) scale(0.9); opacity: 0; max-height: 0; margin-top: -10px; }
                }
                @keyframes notifProgress {
                    from { width: 100%; }
                    to { width: 0%; }
                }
                @keyframes notifIconPop {
                    0% { transform: scale(0) rotate(-90deg); opacity: 0; }
                    60% { transform: scale(1.25) rotate(8deg); opacity: 1; }
                    100% { transform: scale(1) rotate(0deg); opacity: 1; }
                }
                @keyframes notifGlowPulse {
                    0%, 100% { box-shadow: 0 10px 25px -5px rgba(0,0,0,0.6), 0 0 0px rgba(59,130,246,0); }
                    50% { box-shadow: 0 10px 25px -5px rgba(0,0,0,0.6), 0 0 18px rgba(59,130,246,0.45); }
                }
                .scary-notification-item {
                    background: #0f172a; border: 1px solid #334155; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.6);
                    border-radius: 12px; width: 320px; overflow: hidden; pointer-events: auto;
                    font-family: system-ui, -apple-system, sans-serif;
                    /* SLOWED DOWN ENTRY & GLOW */
                    animation: notifSlideIn 2s cubic-bezier(0.16, 1, 0.3, 1) forwards, notifGlowPulse 4s ease-in-out 2s 2;
                }
                .inj-notif-content { display: flex; align-items: center; padding: 14px 16px; gap: 12px; }
                .inj-notif-icon { 
                    width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 2px solid #3b82f6; flex-shrink: 0; background: #1e293b; 
                    /* SLOWED DOWN ICON POP */
                    animation: notifIconPop 1.5s cubic-bezier(0.16, 1, 0.3, 1) 0.5s backwards; 
                }
                .inj-notif-text { flex: 1; min-width: 0; }
                .inj-notif-title { color: #f8fafc; font-size: 14px; font-weight: 600; margin: 0 0 2px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: left; }
                .inj-notif-subtitle { color: #94a3b8; font-size: 12px; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: left; }
                .inj-notif-close { background: transparent; border: none; color: #64748b; font-size: 18px; line-height: 1; cursor: pointer; padding: 4px; transition: transform 0.2s ease, color 0.2s ease; }
                .inj-notif-close:hover { color: #f8fafc; transform: rotate(90deg); }
                .inj-notif-progress { height: 3px; background: linear-gradient(90deg, #3b82f6, #38bdf8); width: 100%; }
            `;
            (document.head || document.documentElement).appendChild(style);
        }

        const container = document.createElement("div");
        container.className = "scary-notification-item";

        container.innerHTML = `
            <div class="inj-notif-content">
                <img src="${iconUrl}" class="inj-notif-icon" alt="Notification" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${FALLBACK_ICON}';">
                <div class="inj-notif-text">
                    <p class="inj-notif-title">${title}</p>
                    <p class="inj-notif-subtitle">${message}</p>
                </div>
                <button class="inj-notif-close" aria-label="Close">&times;</button>
            </div>
            <div class="inj-notif-progress" style="animation: notifProgress ${duration}ms linear forwards;"></div>
        `;

        wrapper.appendChild(container);

        let timer = null;
        let dismissed = false;

        function dismiss() {
            if (dismissed) return;
            dismissed = true;
            if (timer) clearTimeout(timer);
            // SLOWED DOWN EXIT
            container.style.animation = `notifSlideOut ${NOTIF_EXIT_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`;
            setTimeout(() => {
                if (container.parentNode) container.remove();
                if (wrapper.children.length === 0) wrapper.remove();
            }, NOTIF_EXIT_DURATION);
        }

        container.querySelector('.inj-notif-close').onclick = dismiss;
        timer = setTimeout(dismiss, duration);
    }


    // ========================================================================
    // CRC-32 & ZIP HELPERS (Condensed for brevity)
    // ========================================================================
    const CRC_TABLE = (() => { const table = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) { if (c & 1) { c = 0xEDB88320 ^ (c >>> 1); } else { c >>>= 1; } } table[n] = c >>> 0; } return table; })();
    function crc32(bytes) { let crc = 0xFFFFFFFF; for (let i = 0; i < bytes.length; i++) { crc = CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8); } return (crc ^ 0xFFFFFFFF) >>> 0; }
    function u16(value) { const b = new Uint8Array(2); b[0] = value & 0xFF; b[1] = (value >>> 8) & 0xFF; return b; }
    function u32(value) { const b = new Uint8Array(4); b[0] = value & 0xFF; b[1] = (value >>> 8) & 0xFF; b[2] = (value >>> 16) & 0xFF; b[3] = (value >>> 24) & 0xFF; return b; }
    function concatBytes(parts) { let total = 0; for (const part of parts) { total += part.length; } const output = new Uint8Array(total); let offset = 0; for (const part of parts) { output.set(part, offset); offset += part.length; } return output; }

    async function createZip(files) {
        if (!Array.isArray(files) || files.length === 0) throw new Error("No files to put into ZIP.");
        const encoder = new TextEncoder();
        const localParts = []; const centralParts = []; let localOffset = 0;
        for (const file of files) {
            if (!file || !file.name || !file.blob) continue;
            const filename = String(file.name).replace(/\\/g, "/").replace(/^\/+/, "");
            const filenameBytes = encoder.encode(filename);
            const data = new Uint8Array(await file.blob.arrayBuffer());
            const crc = crc32(data);
            const localHeader = concatBytes([ u32(0x04034B50), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(filenameBytes.length), u16(0), filenameBytes ]);
            localParts.push(localHeader); localParts.push(data);
            const centralHeader = concatBytes([ u32(0x02014B50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(filenameBytes.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(localOffset), filenameBytes ]);
            centralParts.push(centralHeader);
            localOffset += localHeader.length + data.length;
        }
        if (centralParts.length === 0) throw new Error("No valid files were added to ZIP.");
        const localDirectory = concatBytes(localParts);
        const centralDirectory = concatBytes(centralParts);
        const endOfCentralDirectory = concatBytes([ u32(0x06054B50), u16(0), u16(0), u16(files.length), u16(files.length), u32(centralDirectory.length), u32(localDirectory.length), u16(0) ]);
        const finalZip = concatBytes([ localDirectory, centralDirectory, endOfCentralDirectory ]);
        return new Blob([finalZip], { type: "application/zip" });
    }

    function extensionFromMime(mime) {
        const type = String(mime || "").toLowerCase().split(";")[0].trim();
        const map = { "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp", "image/bmp": "bmp", "image/svg+xml": "svg", "image/avif": "avif", "image/tiff": "tiff", "image/x-icon": "ico" };
        return map[type] || "bin";
    }

    function makeImageFilename(blob, number) { return `image_${number}.${extensionFromMime(blob.type)}`; }


    // ========================================================================
    // IMAGE SRC RESOLUTION
    // ========================================================================
    const PLACEHOLDER_PATTERNS = [
        /^data:image\/gif;base64,R0lGOD/i, /^data:image\/png;base64,iVBORw0KGgo{0,1}AAAANSUhEUgAAAAEAAAAB/i, /blank\.(gif|png)$/i, /placeholder/i, /spacer\.(gif|png)$/i
    ];
    function looksLikePlaceholder(url) {
        if (!url) return true;
        return PLACEHOLDER_PATTERNS.some(pattern => pattern.test(url));
    }
    function resolveImageSrc(img) {
        if (!img) return "";
        const dataAttrCandidates = [ "data-src", "data-lazy-src", "data-original", "data-actualsrc", "data-srcset", "data-hi-res-src", "data-defer-src" ];
        const direct = [img.currentSrc, img.src].find(v => v && !looksLikePlaceholder(v));
        if (direct) return direct;
        for (const attr of dataAttrCandidates) {
            const val = img.getAttribute && img.getAttribute(attr);
            if (val && !looksLikePlaceholder(val)) {
                const first = val.split(",")[0].trim().split(" ")[0];
                if (first) return first;
            }
        }
        const srcset = img.getAttribute && (img.getAttribute("srcset") || img.getAttribute("data-srcset"));
        if (srcset) {
            const parts = srcset.split(",").map(s => s.trim().split(" ")[0]).filter(Boolean);
            if (parts.length) return parts[parts.length - 1];
        }
        return img.currentSrc || img.src || "";
    }

    function forceLoadLazyImages() {
        let count = 0;
        document.querySelectorAll("img").forEach(img => {
            if (document.getElementById("scary-window-root") && document.getElementById("scary-window-root").contains(img)) return;
            const real = resolveImageSrc(img);
            if (real && img.src !== real) {
                img.src = real;
                count++;
            }
            try { img.loading = "eager"; } catch (e) {}
            try { img.decoding = "sync"; } catch (e) {}
        });
        window.dispatchEvent(new Event("scroll"));
        window.dispatchEvent(new Event("resize"));
        return count;
    }


    // ========================================================================
    // DIRECT DOWNLOAD
    // ========================================================================
    async function directDownload(url) {
        try {
            const response = await fetch(url, { credentials: "omit" });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob = await response.blob();
            if (!blob.size) throw new Error("Downloaded file is empty.");

            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = makeImageFilename(blob, Date.now());
            a.style.display = "none";
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => { URL.revokeObjectURL(blobUrl); }, 5000);
        } catch (err) {
            window.open(url, "_blank");
        }
    }


    // ========================================================================
    // MOD MANAGER
    // ========================================================================

    async function showModManager() {

        const oldWindow = document.getElementById("scary-window-root");
        if (oldWindow) { oldWindow.remove(); }
        const oldStyle = document.getElementById("scary-mod-window-styles");
        if (oldStyle) { oldStyle.remove(); }

        const style = document.createElement("style");
        style.id = "scary-mod-window-styles";

        style.textContent = `

            /* SLOWED DOWN: 1s -> 3s */
            @keyframes windowMorphOpen {
                0% {
                    width: 14px; height: 14px; border-radius: 50%;
                    opacity: 0; transform: translate(-50%, -50%) scale(0.2);
                }
                8% {
                    width: 14px; height: 14px; border-radius: 50%;
                    opacity: 1; transform: translate(-50%, -50%) scale(1);
                }
                18% {
                    width: 14px; height: 380px; border-radius: 8px;
                    transform: translate(-50%, -50%);
                }
                40% {
                    width: 900px; height: 380px; border-radius: 12px;
                    opacity: 1; transform: translate(-50%, -50%);
                }
                100% {
                    width: 900px; height: 380px; border-radius: 12px;
                    opacity: 1; transform: translate(-50%, -50%);
                }
            }

            /* SLOWED DOWN: 0.85s -> 2s */
            @keyframes windowMorphClose {
                0% {
                    border-radius: 12px; opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
                35% {
                    width: 14px; border-radius: 8px; opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
                65% {
                    width: 14px; height: 14px; border-radius: 50%; opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
                100% {
                    width: 14px; height: 14px; border-radius: 50%; opacity: 0;
                    transform: translate(-50%, -50%) scale(0.2);
                }
            }

            #scary-window-root {
                position: fixed; top: 50%; left: 50%;
                transform: translate(-50%, -50%); transform-origin: center center;
                width: 450px; height: 380px; z-index: 2147483647;
                background: rgba(9,13,22,0.65); backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                border: 1px solid rgba(255,255,255,0.08);
                box-shadow: 0 25px 50px -12px rgba(0,0,0,0.85);
                color: #f8fafc; font-family: Inter, system-ui, sans-serif;
                overflow: hidden; display: flex; flex-direction: column;
                border-radius: 12px;
                animation: windowMorphOpen 3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                /* SLOWED DOWN Transitions: 0.85s -> 2s */
                transition:
                    left 2s cubic-bezier(0.22, 1, 0.36, 1),
                    top 2s cubic-bezier(0.22, 1, 0.36, 1),
                    width 2s cubic-bezier(0.22, 1, 0.36, 1),
                    height 2s cubic-bezier(0.22, 1, 0.36, 1),
                    background 1s ease;
            }

            #scary-window-root.scary-no-transition {
                transition: none !important;
            }

            #scary-window-root.closing {
                animation: windowMorphClose 2s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
                pointer-events: none;
            }

            /* SLOWED DOWN: 0.85s -> 2s */
            @keyframes windowMorphCloseMin {
                0% { height: 42px; opacity: 1; transform: translate(-50%, -50%); }
                50% { width: 14px; height: 14px; opacity: 1; border-radius: 50%; transform: translate(-50%, -50%); }
                100% { width: 0px; height: 0px; opacity: 0; transform: translate(-50%, -50%); }
            }

            #scary-window-root.closing-minimized {
                animation: windowMorphCloseMin 2s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
                pointer-events: none;
            }

            #scary-window-root.rolled-up {
                height: 42px !important;
            }

            #scary-window-root.scary-shatter-active {
                background: transparent !important;
                box-shadow: none !important;
                border-color: transparent !important;
            }

            /* SLOWED DOWN FLASH & SHAKE: 0.5s -> 2s */
            @keyframes tntFlash {
                0% { filter: brightness(1) saturate(1); }
                15% { filter: brightness(3.2) saturate(0.2); }
                40% { filter: brightness(1.5) saturate(0.6); }
                100% { filter: brightness(1) saturate(1); }
            }
            @keyframes tntShake {
                0%, 100% { transform: translate(-50%, -50%); }
                20% { transform: translate(calc(-50% + 10px), calc(-50% - 7px)); }
                40% { transform: translate(calc(-50% - 12px), calc(-50% + 5px)); }
                60% { transform: translate(calc(-50% + 7px), calc(-50% + 9px)); }
                80% { transform: translate(calc(-50% - 6px), calc(-50% - 5px)); }
            }
            #scary-window-root.scary-tnt-flash { animation: tntFlash 2s ease-out; }
            #scary-window-root.scary-tnt-shake { animation: tntShake 2s ease-in-out; }

            .scary-tb { height: 42px; background: rgba(15,23,42,0.85); border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: space-between; padding: 0 14px; cursor: move; user-select: none; flex-shrink: 0; width: 100%; box-sizing: border-box; }
            .scary-tb-title { font-family: monospace; font-size: 9px; color: #38bdf8; letter-spacing: 0.5px; }
            .scary-tb-controls { display: flex; gap: 6px; }
            .scary-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); color: #94a3b8; width: 26px; height: 26px; border-radius: 6px; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; }
            .scary-btn:hover { background: rgba(255,255,255,0.15); color: #fff; transform: scale(1.1); }
            .scary-btn:active { transform: scale(0.92); }
            .scary-btn-close:hover { background: #dc2626; border-color: #ef4444; color: #fff; }

            .scary-body { padding: 16px; flex-shrink: 0; height: 338px; box-sizing: border-box; display: flex; flex-direction: column; gap: 14px; }
            #scary-window-root.rolled-up .scary-body { opacity: 0; transform: translateY(-10px); pointer-events: none; }
            .scary-welcome-text { font-family: monospace; font-size: 10px; color: #4ade80; line-height: 1.8; min-height: 22px; padding-bottom: 6px; }
            .scary-ui-content { opacity: 0; transform: translateY(10px); transition: opacity 0.4s ease, transform 0.4s ease; display: flex; flex-direction: column; gap: 12px; flex: 1; overflow: hidden; }
            .scary-ui-content.visible { opacity: 1; transform: translateY(0); }

            .scary-mods-bar { display: flex; gap: 10px; }
            .scary-toggle-btn { flex: 1; padding: 10px; font-size: 11px; font-weight: 600; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); background: rgba(15,23,42,0.6); color: #64748b; cursor: pointer; transition: all 0.25s ease; position: relative; overflow: hidden; }
            .scary-toggle-btn:active { transform: scale(0.96); }
            @keyframes togglePulse { 0%, 100% { box-shadow: 0 0 14px rgba(56,189,248,0.3); } 50% { box-shadow: 0 0 22px rgba(56,189,248,0.65); } }
            .scary-toggle-btn.active { background: #0284c7; color: #fff; border-color: #38bdf8; animation: togglePulse 1.8s ease-in-out infinite; }

            @keyframes rippleAnim { from { transform: scale(0); opacity: 0.5; } to { transform: scale(2.5); opacity: 0; } }
            .scary-ripple { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.6); width: 20px; height: 20px; pointer-events: none; transform: scale(0); animation: rippleAnim 0.6s ease-out forwards; }

            .scary-img-grid { flex: 1; background: rgba(3,7,18,0.6); border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); padding: 8px; display: grid; grid-template-columns: repeat(auto-fill, minmax(65px,1fr)); gap: 8px; overflow-y: auto; max-height: 140px; }
            @keyframes imgItemIn { 0% { opacity: 0; transform: scale(0.6) rotate(-6deg); } 60% { opacity: 1; transform: scale(1.05) rotate(1deg); } 100% { opacity: 1; transform: scale(1) rotate(0deg); } }
            .scary-img-item { position: relative; width: 100%; height: 65px; border-radius: 6px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); cursor: pointer; animation: imgItemIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) backwards; transition: transform 0.2s ease, border-color 0.2s ease; }
            .scary-img-item:hover { transform: scale(1.06); border-color: #3b82f6; }
            .scary-img-item img { width: 100%; height: 100%; object-fit: cover; }
            .scary-img-item::after { content: "×"; position: absolute; top: 2px; right: 2px; color: #fff; background: rgba(220,38,38,0.85); width: 16px; height: 16px; border-radius: 50%; font-size: 11px; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.15s; }
            .scary-img-item:hover::after { opacity: 1; }

            .scary-dl-all-btn { padding: 10px; background: #16a34a; border: 1px solid #22c55e; color: #fff; font-weight: 600; font-size: 11px; border-radius: 8px; cursor: pointer; transition: background 0.2s ease, transform 0.15s ease; }
            .scary-dl-all-btn:hover { background: #15803d; transform: translateY(-1px); }
            .scary-dl-all-btn:active { transform: translateY(0) scale(0.97); }
            .scary-dl-all-btn:disabled { background: #334155; border-color: #475569; color: #94a3b8; cursor: not-allowed; transform: none; }

            @keyframes ytResultIn { 0% { opacity: 0; transform: translateX(14px); } 100% { opacity: 1; transform: translateX(0); } }
            .scary-yt-result { display: flex; gap: 10px; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 8px; cursor: pointer; transition: 0.2s; border: 1px solid transparent; animation: ytResultIn 0.3s ease backwards; }
            .scary-yt-result:hover { background: rgba(0,0,0,0.4); transform: scale(1.02); border-color: #3b82f6; }
            .scary-light-theme .scary-yt-result { background: rgba(0,0,0,0.05); }
            .scary-light-theme .scary-yt-result:hover { background: rgba(0,0,0,0.1); }
            .scary-yt-thumb { width: 120px; height: 68px; object-fit: cover; border-radius: 6px; }
            .scary-yt-info { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
            .scary-yt-title { font-size: 13px; font-weight: bold; margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; color: inherit; }
            .scary-yt-channel { font-size: 11px; color: #94a3b8; display: flex; align-items: center; gap: 6px; margin-top: auto; }
            .scary-light-theme .scary-yt-channel { color: #64748b; }
            .scary-yt-avatar { width: 16px; height: 16px; border-radius: 50%; }

            .scary-line { position: absolute; top: 50%; left: 50%; width: 250px; height: 4px; background: linear-gradient(90deg, transparent, #3b82f6, #fff); box-shadow: 0 0 15px #3b82f6, 0 0 30px #3b82f6; border-radius: 10px; opacity: 0; }
            
            /* SLOWED DOWN SPIN LINES: 1.6s -> 4s */
            .scary-line-1 { animation: spinLine1 4s linear forwards; }
            .scary-line-2 { animation: spinLine2 4s linear forwards; }
            @keyframes spinLine1 {
                0% { opacity: 0; transform: translate(-50%, -50%) rotate(0deg) translateX(50px); }
                20% { opacity: 1; transform: translate(-50%, -50%) rotate(220deg) translateX(300px); }
                100% { opacity: 1; transform: translate(-50%, -50%) rotate(760deg) translateX(300px); }
            }
            @keyframes spinLine2 {
                0% { opacity: 0; transform: translate(-50%, -50%) rotate(180deg) translateX(50px); }
                20% { opacity: 1; transform: translate(-50%, -50%) rotate(400deg) translateX(300px); }
                100% { opacity: 1; transform: translate(-50%, -50%) rotate(940deg) translateX(300px); }
            }

            /* SLOWED DOWN SPARKLES: 1.4s -> 3s */
            @keyframes sparkleFloat {
                0% { opacity: 0; transform: translate(0,0) scale(0.4); }
                20% { opacity: 1; }
                100% { opacity: 0; transform: translate(var(--sx), var(--sy)) scale(1.1); }
            }
            .scary-sparkle { position: absolute; top: 50%; left: 50%; width: 6px; height: 6px; background: #38bdf8; border-radius: 50%; box-shadow: 0 0 8px #38bdf8, 0 0 14px #3b82f6; animation: sparkleFloat 3s ease-out forwards; pointer-events: none; }

            @keyframes tntParticleFly {
                0% { opacity: 1; transform: translate(-50%, -50%) scale(1) rotate(0deg); }
                100% { opacity: 0; transform: translate(calc(-50% + var(--px)), calc(-50% + var(--py))) scale(0.3) rotate(180deg); }
            }
            .scary-tnt-particle { position: fixed; width: 9px; height: 9px; z-index: 2147483647; pointer-events: none; animation-name: tntParticleFly; animation-timing-function: cubic-bezier(0.2, 0.6, 0.4, 1); animation-fill-mode: forwards; }

            /* SLOWED DOWN SHATTER: 1.1s -> 3s */
            @keyframes shatterFly {
                0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
                100% { transform: translate(var(--sfx), var(--sfy)) rotate(var(--sfr)); opacity: 0; }
            }
            .scary-shatter-piece { position: fixed; background: rgba(15,23,42,0.92); border: 1px solid rgba(255,255,255,0.06); z-index: 2147483646; pointer-events: none; animation-name: shatterFly; animation-duration: 3s; animation-timing-function: cubic-bezier(0.33, 1, 0.68, 1); animation-fill-mode: forwards; }

            /* SLOWED DOWN RUNNERS: 2.1s -> 5s */
            @keyframes letterFallRun {
                0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
                45% { transform: translate(calc(var(--dir) * 12px), var(--fallDist)) rotate(calc(var(--dir) * 12deg)); opacity: 1; }
                100% { transform: translate(var(--runDist), var(--fallDist)) rotate(calc(var(--dir) * -16deg)); opacity: 0; }
            }
            /* SLOWED DOWN LEG WIGGLE: 0.22s -> 0.5s */
            @keyframes legWiggle {
                0% { transform: rotate(-32deg); }
                50% { transform: rotate(32deg); }
                100% { transform: rotate(-32deg); }
            }
            .scary-run-letter { position: fixed; display: flex; flex-direction: column; align-items: center; font-family: 'Press Start 2P', monospace; font-size: 38px; color: #f8fafc; z-index: 2147483647; pointer-events: none; text-shadow: 0 4px 10px rgba(0,0,0,0.6); animation-name: letterFallRun; animation-duration: 5s; animation-timing-function: cubic-bezier(0.55, 0.06, 0.68, 0.19); animation-fill-mode: forwards; }
            .scary-run-letter-char { line-height: 1; }
            .scary-run-leg { width: 6px; height: 15px; background: #f8fafc; margin-top: 3px; border-radius: 2px; transform-origin: top center; animation: legWiggle 0.5s steps(2) infinite; }
            .scary-run-leg-r { animation-delay: 0.25s; }

            /* SLOWED DOWN WELCOME: 0.9s -> 3s */
            .scary-big-welcome { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-family: 'Press Start 2P', monospace; font-size: 52px; color: #f8fafc; text-shadow: 0px 4px 15px rgba(0,0,0,0.8); white-space: nowrap; opacity: 0; pointer-events: none; z-index: 10; animation: bigWelcomeAnim 3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            @keyframes bigWelcomeAnim {
                0% { opacity: 0; transform: translate(-50%,-50%) scale(0.4) rotate(-6deg); letter-spacing: 20px; }
                60% { opacity: 1; transform: translate(-50%,-50%) scale(1.06) rotate(1deg); letter-spacing: 2px; text-shadow: 0 0 30px rgba(56,189,248,0.8); }
                100% { opacity: 1; transform: translate(-50%,-50%) scale(1) rotate(0deg); text-shadow: 0px 4px 15px rgba(0,0,0,0.8); }
            }

            .scary-tabs { display: flex; background: #0f172a; border-bottom: 1px solid #1e293b; overflow-x: auto; }
            .scary-tab-btn { flex: 1; background: transparent; border: none; color: #64748b; padding: 10px 8px; font-family: inherit; font-size: 11.5px; font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; white-space: nowrap; }
            .scary-tab-btn:hover { color: #cbd5e1; background: rgba(59,130,246,0.06); }
            .scary-tab-btn.active { color: #f8fafc; border-bottom: 2px solid #3b82f6; background: rgba(59,130,246,0.1); }
            @keyframes tabContentIn { 0% { opacity: 0; transform: translateY(6px); } 100% { opacity: 1; transform: translateY(0); } }
            .scary-tab-content { display: none; flex-direction: column; flex: 1; overflow: hidden; }
            .scary-tab-content.active { display: flex; animation: tabContentIn 0.28s cubic-bezier(0.16, 1, 0.3, 1); }

            .scary-video-ui { padding: 16px; display: flex; flex-direction: column; gap: 12px; height: 100%; overflow-y: auto; box-sizing: border-box; }
            .scary-input { background: #0f172a; border: 1px solid #334155; color: white; padding: 10px; border-radius: 6px; font-family: inherit; font-size: 13px; width: 100%; box-sizing: border-box; transition: border-color 0.2s ease, box-shadow 0.2s ease; }
            .scary-input:focus { outline: none; border-color: #38bdf8; box-shadow: 0 0 0 3px rgba(56,189,248,0.15); }
            .scary-row { display: flex; gap: 10px; }
            .scary-row select { flex: 1; }
            .scary-dl-vid-btn { background: #2563eb; color: white; border: none; padding: 12px; border-radius: 6px; font-weight: 600; cursor: pointer; transition: 0.2s; margin-top: auto; }
            .scary-dl-vid-btn:hover { background: #1d4ed8; transform: translateY(-1px); }
            .scary-dl-vid-btn:active { transform: translateY(0) scale(0.97); }
            .scary-dl-thumb-btn { background: #475569; color: white; border: none; padding: 12px; border-radius: 6px; font-weight: 600; cursor: pointer; transition: 0.2s; }
            .scary-dl-thumb-btn:hover { background: #334155; transform: translateY(-1px); }
            .scary-dl-thumb-btn:active { transform: translateY(0) scale(0.97); }

            /* AUTO REPLAY TAB */
            @keyframes replaySpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes replayDotPulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.5); opacity: 0.55; } }
            .scary-replay-card { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; text-align: center; }
            .scary-replay-icon { width: 70px; height: 70px; border-radius: 50%; border: 2px solid #334155; display: flex; align-items: center; justify-content: center; transition: border-color 0.3s ease, box-shadow 0.3s ease; }
            .scary-replay-icon svg { width: 32px; height: 32px; stroke: #64748b; transition: stroke 0.3s ease; }
            .scary-replay-icon.on { border-color: #22c55e; box-shadow: 0 0 20px rgba(34,197,94,0.35); animation: replaySpin 3.5s linear infinite; }
            .scary-replay-icon.on svg { stroke: #4ade80; }
            .scary-replay-status { font-size: 12px; font-weight: 600; letter-spacing: 0.5px; color: #64748b; display: flex; align-items: center; gap: 8px; }
            .scary-replay-dot { width: 8px; height: 8px; border-radius: 50%; background: #475569; }
            .scary-replay-dot.on { background: #22c55e; animation: replayDotPulse 1.2s ease-in-out infinite; }
            .scary-replay-toggle { padding: 12px 26px; border-radius: 24px; border: none; background: #cc0000; color: #fff; font-weight: 700; font-size: 13px; letter-spacing: 0.5px; cursor: pointer; transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); box-shadow: 0 4px 14px rgba(0,0,0,0.3); }
            .scary-replay-toggle:hover { transform: translateY(-2px) scale(1.03); }
            .scary-replay-toggle:active { transform: translateY(0) scale(0.96); }
            .scary-replay-toggle.on { background: #16a34a; box-shadow: 0 4px 18px rgba(34,197,94,0.45); }
            .scary-replay-hint { font-size: 11px; color: #64748b; max-width: 260px; line-height: 1.5; }

            /* TOOLS TAB */
            .scary-tool-btn { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 11px 14px; background: rgba(15,23,42,0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; color: #e2e8f0; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; text-align: left; }
            .scary-tool-btn:hover { background: rgba(59,130,246,0.12); border-color: #3b82f6; transform: translateX(2px); }
            .scary-tool-btn:active { transform: translateX(2px) scale(0.98); }
            .scary-tool-btn small { display: block; font-weight: 400; color: #64748b; margin-top: 2px; }
            .scary-tool-btn.on { border-color: #22c55e; background: rgba(34,197,94,0.12); }

            /* LIGHT THEME OVERRIDES */
            #scary-window-root.scary-light-theme { background: rgba(255, 255, 255, 0.85) !important; color: #0f172a !important; border: 1px solid rgba(0,0,0,0.2) !important; }
            #scary-window-root.scary-light-theme .scary-tb { background: rgba(241, 245, 249, 0.95); border-bottom: 1px solid #cbd5e1; }
            #scary-window-root.scary-light-theme .scary-tb-title { color: #0f172a; }
            #scary-window-root.scary-light-theme .scary-tabs { background: rgba(241, 245, 249, 0.95); border-bottom: 1px solid #cbd5e1; }
            #scary-window-root.scary-light-theme .scary-tab-btn { color: #475569; }
            #scary-window-root.scary-light-theme .scary-tab-btn.active { color: #0f172a; border-bottom: 2px solid #2563eb; background: rgba(37, 99, 235, 0.1); }
            #scary-window-root.scary-light-theme .scary-input { background: #ffffff; color: #0f172a; border: 1px solid #cbd5e1; }
            #scary-window-root.scary-light-theme .scary-btn, #scary-window-root.scary-light-theme .scary-typewriter { color: #0f172a !important; }
            #scary-window-root.scary-light-theme .scary-toggle-btn { background: #e2e8f0; color: #0f172a; border-color: #cbd5e1; }
            #scary-window-root.scary-light-theme .scary-toggle-btn.active { background: #2563eb; color: #ffffff; border-color: #1d4ed8; }
            #scary-window-root.scary-light-theme .scary-dl-thumb-btn { background: #cbd5e1; color: #0f172a; }
            #scary-window-root.scary-light-theme .scary-replay-hint { color: #475569; }
            #scary-window-root.scary-light-theme .scary-tool-btn { background: rgba(0,0,0,0.04); color: #0f172a; }
            #scary-window-root.scary-light-theme .scary-tool-btn small { color: #64748b; }
        `;

        document.head.appendChild(style);

        // --------------------------------------------------------------------
        // WINDOW DOM
        // --------------------------------------------------------------------
        const win = document.createElement("div");
        win.id = "scary-window-root";
        win.dir = "ltr";

        win.innerHTML = `
            <div id="scary-spin-container" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 5;">
                <div id="scary-line-1" class="scary-line scary-line-1"></div>
                <div id="scary-line-2" class="scary-line scary-line-2"></div>
            </div>

            <div id="scary-big-welcome" class="scary-big-welcome">WELCOME</div>

            <div id="scary-main-ui" style="opacity: 0; transition: opacity 0.5s; display: flex; flex-direction: column; height: 100%;">
                <div class="scary-tb" id="scary-drag-handle">
                    <span class="scary-tb-title">MOD MANAGER v3.0</span>
                    <div class="scary-tb-controls">
                        <button class="scary-btn" id="scary-btn-min" title="Roll Up / Down">-</button>
                        <button class="scary-btn scary-btn-close" id="scary-btn-close" title="Close">×</button>
                    </div>
                </div>

                <div class="scary-tabs">
                    <button class="scary-tab-btn active" id="tab-btn-images">Images</button>
                    <button class="scary-tab-btn" id="tab-btn-video">Thumbnail</button>
                    <button class="scary-tab-btn" id="tab-btn-replay">Auto Replay</button>
                    <button class="scary-tab-btn" id="tab-btn-tools">Tools</button>
                    <button class="scary-tab-btn" id="tab-btn-search">Search</button>
                    <button class="scary-tab-btn" id="tab-btn-ai">AI</button>
                    <button class="scary-tab-btn" id="tab-btn-settings">Settings</button>
                </div>

                <div class="scary-body" style="flex: 1; overflow: hidden; display: flex; flex-direction: column;">
                    <div id="tab-images" class="scary-tab-content active">
                        <div class="scary-welcome-text" id="scary-typewriter"></div>
                        <div class="scary-ui-content" id="scary-ui-panel">
                            <div class="scary-mods-bar">
                                <button class="scary-toggle-btn" id="scary-toggle-dl">Instant Download</button>
                                <button class="scary-toggle-btn" id="scary-toggle-select">Multi-Select</button>
                            </div>
                            <div class="scary-mods-bar" id="scary-multi-actions" style="display:none; margin-top: 10px;">
                                <button class="scary-toggle-btn" id="scary-btn-select-all" style="background:#1e293b; border-color:#334155;">Select All</button>
                                <button class="scary-toggle-btn" id="scary-btn-clear-all" style="background:#1e293b; border-color:#334155;">Clear All</button>
                            </div>
                            <div class="scary-img-grid" id="scary-grid"></div>
                            <button class="scary-dl-all-btn" id="scary-dl-all">Download Zip (0)</button>
                        </div>
                    </div>

                    <div id="tab-video" class="scary-tab-content">
                        <div class="scary-video-ui">
                            <input type="text" class="scary-input" id="scary-video-url" placeholder="YouTube Video URL..." />
                            <button class="scary-dl-thumb-btn" id="scary-dl-thumb">Download Thumbnail</button>
                        </div>
                    </div>

                    <div id="tab-replay" class="scary-tab-content">
                        <div class="scary-replay-card">
                            <div class="scary-replay-icon" id="scary-replay-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                            </div>
                            <div class="scary-replay-status">
                                <span class="scary-replay-dot" id="scary-replay-dot"></span>
                                <span id="scary-replay-status-text">AUTO REPLAY OFF</span>
                            </div>
                            <button class="scary-replay-toggle" id="scary-replay-toggle">Enable</button>
                            <div class="scary-replay-hint">Keeps the current video looping — restarts it automatically when it ends or gets stuck.</div>
                        </div>
                    </div>

                    <div id="tab-tools" class="scary-tab-content">
                        <div class="scary-video-ui">
                            <button class="scary-tool-btn" id="scary-tool-forceload">
                                <span>Force Load Lazy Images<small>Fixes images that refuse to load on stubborn pages</small></span>
                            </button>
                            <button class="scary-tool-btn" id="scary-tool-copy-images">
                                <span>Copy All Image URLs<small>Grabs every real image link on the page</small></span>
                            </button>
                            <button class="scary-tool-btn" id="scary-tool-copy-links">
                                <span>Copy All Page Links<small>Grabs every link on the page</small></span>
                            </button>
                            <button class="scary-tool-btn" id="scary-tool-darkmode">
                                <span>Toggle Site Dark Filter<small>Quick invert-based dark mode for any site</small></span>
                            </button>
                            <button class="scary-tool-btn" id="scary-tool-scrolltop">
                                <span>Scroll To Top / Bottom<small>Click again to jump to the bottom</small></span>
                            </button>
                        </div>
                    </div>

                    <div id="tab-search" class="scary-tab-content">
                        <div class="scary-video-ui">
                            <div class="scary-row" style="margin-bottom: 10px;">
                                <input type="text" class="scary-input" id="scary-search-query" placeholder="Search YouTube..." style="flex: 1;" />
                                <button class="scary-dl-vid-btn" id="scary-btn-do-search" style="width: auto; padding: 0 15px; margin-top: 0;">Search</button>
                            </div>
                            <div id="scary-search-results" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding-right: 5px;"></div>
                        </div>
                    </div>

                    <div id="tab-settings" class="scary-tab-content" style="overflow-y: auto;">
                        <div class="scary-video-ui">
                            <label style="color: inherit; font-size: 12px; font-weight: bold;">YouTube API Key</label>
                            <input type="password" class="scary-input" id="scary-setting-yt-api" placeholder="AI Search enhancement..." value="${appSettings.ytApi}" style="margin-bottom: 10px;" />

                            <label style="color: inherit; font-size: 12px; font-weight: bold;">Gemini API Key</label>
                            <input type="password" class="scary-input" id="scary-setting-gemini-api" placeholder="Agent abilities..." value="${appSettings.geminiApi}" style="margin-bottom: 10px;" />

                            <button class="scary-dl-vid-btn" id="scary-btn-save-keys" style="margin-bottom: 15px;">Save API Keys</button>

                            <label style="color: inherit; font-size: 12px; font-weight: bold;">Background Opacity</label>
                            <input type="range" min="0" max="100" value="65" id="scary-setting-opacity" style="width: 100%; margin-bottom: 10px;" />

                            <label style="color: inherit; font-size: 12px; font-weight: bold;">Theme</label>
                            <select class="scary-input" id="scary-setting-theme">
                                <option value="dark">Dark Mode</option>
                                <option value="light">Light Mode</option>
                            </select>

                            <label style="color: inherit; font-size: 12px; font-weight: bold; margin-top: 15px; display: flex; align-items: center; gap: 8px;">
                                <input type="checkbox" id="scary-setting-resize" /> Enable Window Resizing
                            </label>
                        </div>
                    </div>

                    <div id="tab-ai" class="scary-tab-content">
                        <div class="scary-video-ui" style="flex: 1; display: flex; flex-direction: column;">
                            <div id="scary-ai-chat" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px; font-size: 13px; color: inherit; padding-right: 5px;">
                                <div style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px;">Hello! I am your AI agent. Ask me anything, or try commands like "close this injection", "search for me [term]", or "turn replay on/off".</div>
                            </div>
                            <div class="scary-row">
                                <input type="text" class="scary-input" id="scary-ai-input" placeholder="Ask AI..." style="flex: 1;" />
                                <button class="scary-dl-vid-btn" id="scary-btn-ai-send" style="width: auto; padding: 0 15px; margin-top: 0;">Send</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        (document.body || document.documentElement).appendChild(win);


        // ====================================================================
        // KEEP-ALIVE
        // ====================================================================
        let manuallyClosing = false;
        const keepAliveIntervalId = setInterval(() => {
            if (manuallyClosing) return;
            if (!document.body.contains(win)) {
                document.body.appendChild(win);
            }
        }, 4000);


        // ====================================================================
        // SLOWED DOWN TNT INTRO SEQUENCE
        // ====================================================================
        const mainUi = document.getElementById("scary-main-ui");
        const bigWelcome = document.getElementById("scary-big-welcome");
        const spinContainer = document.getElementById("scary-spin-container");
        const typewriter = document.getElementById("scary-typewriter");
        const panel = document.getElementById("scary-ui-panel");

        const username = "scary_boy963";
        const readyText = `System Ready, ${username}...`;

        // Sparkles loop
        const sparkleInterval = setInterval(() => {
            if (!spinContainer || !spinContainer.isConnected) return;
            const sparkle = document.createElement("div");
            sparkle.className = "scary-sparkle";
            const angle = Math.random() * Math.PI * 2;
            const dist = 100 + Math.random() * 160;
            sparkle.style.setProperty("--sx", `${Math.cos(angle) * dist}px`);
            sparkle.style.setProperty("--sy", `${Math.sin(angle) * dist}px`);
            spinContainer.appendChild(sparkle);
            setTimeout(() => sparkle.remove(), 3000);
        }, 300);

        function spawnTntParticles() {
            const rect = win.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const colors = ["#e8811a", "#ce5b1f", "#4a4a4a", "#2b2b2b", "#f2f2f2"];
            for (let i = 0; i < 36; i++) {
                const p = document.createElement("div");
                p.className = "scary-tnt-particle";
                const angle = Math.random() * Math.PI * 2;
                const dist = 90 + Math.random() * 280;
                p.style.left = `${cx}px`; p.style.top = `${cy}px`;
                p.style.background = colors[Math.floor(Math.random() * colors.length)];
                p.style.setProperty("--px", `${Math.cos(angle) * dist}px`);
                p.style.setProperty("--py", `${Math.sin(angle) * dist}px`);
                p.style.animationDuration = `${2000 + Math.random() * 1000}ms`;
                p.style.animationDelay = `${Math.random() * 200}ms`;
                document.body.appendChild(p);
                setTimeout(() => p.remove(), 3500);
            }
        }

        function shatterWindow(durationMs) {
            const rect = win.getBoundingClientRect();
            const cols = 5, rows = 3;
            const cellW = rect.width / cols, cellH = rect.height / rows;
            const container = document.createElement("div");
            container.id = "scary-shatter-container";
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const piece = document.createElement("div");
                    piece.className = "scary-shatter-piece";
                    piece.style.left = `${rect.left + c * cellW}px`;
                    piece.style.top = `${rect.top + r * cellH}px`;
                    piece.style.width = `${cellW + 1}px`;
                    piece.style.height = `${cellH + 1}px`;
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 140 + Math.random() * 260;
                    piece.style.setProperty("--sfx", `${Math.cos(angle) * dist}px`);
                    piece.style.setProperty("--sfy", `${Math.sin(angle) * dist + 220}px`);
                    piece.style.setProperty("--sfr", `${Math.random() * 360 - 180}deg`);
                    piece.style.animationDelay = `${Math.random() * 200}ms`;
                    container.appendChild(piece);
                }
            }
            document.body.appendChild(container);
            win.classList.add("scary-shatter-active");
            setTimeout(() => {
                container.remove();
                win.classList.remove("scary-shatter-active");
            }, durationMs);
        }

        function explodeWelcomeIntoRunners() {
            const rect = bigWelcome.getBoundingClientRect();
            const word = bigWelcome.textContent || "WELCOME";
            const letterWidth = rect.width / word.length;
            bigWelcome.style.visibility = "hidden";
            const groundY = window.innerHeight - 40;
            [...word].forEach((ch, i) => {
                if (ch === " ") return;
                const startX = rect.left + i * letterWidth;
                const startY = rect.top;
                const dir = i % 2 === 0 ? -1 : 1;
                const runDist = dir * (window.innerWidth + 260);
                const fallDist = Math.max(groundY - startY, 20);
                const el = document.createElement("div");
                el.className = "scary-run-letter";
                el.style.left = `${startX}px`; el.style.top = `${startY}px`;
                el.style.setProperty("--dir", dir);
                el.style.setProperty("--fallDist", `${fallDist}px`);
                el.style.setProperty("--runDist", `${runDist}px`);
                el.style.animationDelay = `${i * 150}ms`;
                el.innerHTML = `<span class="scary-run-letter-char">${ch}</span><span class="scary-run-leg scary-run-leg-l"></span><span class="scary-run-leg scary-run-leg-r"></span>`;
                document.body.appendChild(el);
                setTimeout(() => el.remove(), i * 150 + 5500);
            });
        }

        function showHelloWord() {
            bigWelcome.textContent = "HELLO!";
            bigWelcome.style.fontSize = "40px";
            bigWelcome.style.visibility = "visible";
            bigWelcome.style.animation = "none";
            bigWelcome.style.opacity = "0";
            bigWelcome.style.transform = "translate(-50%, -50%) scale(0.8)";
            bigWelcome.style.transition = "opacity 1.5s ease, transform 1.5s cubic-bezier(0.16,1,0.3,1)";
            requestAnimationFrame(() => {
                bigWelcome.style.opacity = "1";
                bigWelcome.style.transform = "translate(-50%, -50%) scale(1)";
            });
            setTimeout(() => {
                bigWelcome.style.transition = "opacity 2s ease";
                bigWelcome.style.opacity = "0";
            }, 2500);
            setTimeout(() => { bigWelcome.style.display = "none"; }, 5000);
        }

        function finalizeWindow() {
            const rect = win.getBoundingClientRect();
            win.style.animation = "none";
            win.style.transform = "none";
            win.style.right = "auto"; win.style.bottom = "auto";
            win.style.left = `${rect.left}px`; win.style.top = `${rect.top}px`;
            win.style.width = `${rect.width}px`; win.style.height = `${rect.height}px`;
            win.dataset.positionLocked = "true";

            void win.offsetWidth; 

            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const newW = 450, newH = 380;
            win.style.left = `${centerX - newW / 2}px`;
            win.style.top = `${centerY - newH / 2}px`;
            win.style.width = `${newW}px`;
            win.style.height = `${newH}px`;

            mainUi.style.opacity = "1";

            let index = 0;
            const interval = setInterval(() => {
                if (index < readyText.length) {
                    typewriter.textContent += readyText.charAt(index);
                    index++;
                } else {
                    clearInterval(interval);
                    panel.classList.add("visible");
                }
            }, 50);
        }

        function flyOutSpinLines() {
            const l1 = document.getElementById("scary-line-1");
            const l2 = document.getElementById("scary-line-2");
            if (l1 && l2) {
                l1.style.animation = "none"; l2.style.animation = "none";
                l1.style.transition = "transform 3s cubic-bezier(0.4, 0, 0.2, 1), opacity 3s";
                l2.style.transition = "transform 3s cubic-bezier(0.4, 0, 0.2, 1), opacity 3s";
                const angle1 = Math.random() * Math.PI * 2, angle2 = Math.random() * Math.PI * 2;
                l1.style.transform = `translate(-50%, -50%) translate(${Math.cos(angle1) * 1400}px, ${Math.sin(angle1) * 1400}px) rotate(${angle1}rad)`;
                l2.style.transform = `translate(-50%, -50%) translate(${Math.cos(angle2) * 1400}px, ${Math.sin(angle2) * 1400}px) rotate(${angle2}rad)`;
                l1.style.opacity = "0"; l2.style.opacity = "0";
            }
            clearInterval(sparkleInterval);
            setTimeout(() => { if (spinContainer) spinContainer.remove(); }, 3000);
        }

        // Expanded timeline constants (Slowed Down)
        const T_POP_HOLD = 4000;
        const T_SHATTER = 3000;
        const T_HELLO_GAP = 1000;
        const T_HELLO_LIFE = 5000;

        const introTimers = [];
        introTimers.push(setTimeout(() => {
            win.classList.add("scary-tnt-flash", "scary-tnt-shake");
            spawnTntParticles();
            flyOutSpinLines();
            explodeWelcomeIntoRunners();

            introTimers.push(setTimeout(() => {
                win.classList.remove("scary-tnt-flash", "scary-tnt-shake");
            }, 2000));

            introTimers.push(setTimeout(() => shatterWindow(T_SHATTER), 100));

            introTimers.push(setTimeout(() => {
                showHelloWord();
                introTimers.push(setTimeout(() => {
                    finalizeWindow();
                }, T_HELLO_LIFE));
            }, T_SHATTER + T_HELLO_GAP));

        }, T_POP_HOLD));


        // ====================================================================
        // BUTTON RIPPLE EFFECT
        // ====================================================================
        function attachRipple(el) {
            el.addEventListener("click", (event) => {
                const rect = el.getBoundingClientRect();
                const ripple = document.createElement("span");
                ripple.className = "scary-ripple";
                ripple.style.left = `${event.clientX - rect.left - 10}px`;
                ripple.style.top = `${event.clientY - rect.top - 10}px`;
                el.appendChild(ripple);
                setTimeout(() => ripple.remove(), 650);
            });
        }
        win.querySelectorAll(".scary-toggle-btn, .scary-dl-all-btn, .scary-dl-thumb-btn, .scary-dl-vid-btn, .scary-replay-toggle, .scary-tool-btn").forEach(attachRipple);

        // ====================================================================
        // DRAGGING
        // ====================================================================
        const dragHandle = document.getElementById("scary-drag-handle");
        let dragging = false, offsetX = 0, offsetY = 0;

        function lockPosition() {
            if (win.dataset.positionLocked === "true") return;
            const rect = win.getBoundingClientRect();
            win.style.animation = "none"; win.style.transform = "none";
            win.style.left = `${rect.left}px`; win.style.top = `${rect.top}px`;
            win.style.right = "auto"; win.style.bottom = "auto";
            win.dataset.positionLocked = "true";
        }

        dragHandle.addEventListener("mousedown", event => {
            if (event.target.closest(".scary-btn")) return;
            lockPosition();
            win.classList.add("scary-no-transition");
            dragging = true;
            const rect = win.getBoundingClientRect();
            offsetX = event.clientX - rect.left; offsetY = event.clientY - rect.top;
            event.preventDefault();
        });
        document.addEventListener("mousemove", event => {
            if (!dragging) return;
            win.style.left = `${event.clientX - offsetX}px`; win.style.top = `${event.clientY - offsetY}px`;
        });
        document.addEventListener("mouseup", () => {
            if (dragging) win.classList.remove("scary-no-transition");
            dragging = false;
        });

        // ====================================================================
        // STATE
        // ====================================================================
        let rolledUp = false, closing = false, instantDownload = false, multiSelect = false;
        const selectedImages = new Set();

        // ====================================================================
        // TABS LOGIC
        // ====================================================================
        const tabBtnImages = document.getElementById("tab-btn-images");
        const tabBtnVideo = document.getElementById("tab-btn-video");
        const tabBtnReplay = document.getElementById("tab-btn-replay");
        const tabBtnTools = document.getElementById("tab-btn-tools");
        const tabBtnSearch = document.getElementById("tab-btn-search");
        const tabBtnAi = document.getElementById("tab-btn-ai");
        const tabBtnSettings = document.getElementById("tab-btn-settings");

        const tabContentImages = document.getElementById("tab-images");
        const tabContentVideo = document.getElementById("tab-video");
        const tabContentReplay = document.getElementById("tab-replay");
        const tabContentTools = document.getElementById("tab-tools");
        const tabContentSearch = document.getElementById("tab-search");
        const tabContentAi = document.getElementById("tab-ai");
        const tabContentSettings = document.getElementById("tab-settings");

        const allTabBtns = [tabBtnImages, tabBtnVideo, tabBtnReplay, tabBtnTools, tabBtnSearch, tabBtnAi, tabBtnSettings];
        const allTabContents = [tabContentImages, tabContentVideo, tabContentReplay, tabContentTools, tabContentSearch, tabContentAi, tabContentSettings];

        function switchTab(activeBtn, activeContent) {
            allTabBtns.forEach(b => b.classList.remove("active"));
            allTabContents.forEach(c => c.classList.remove("active"));
            activeBtn.classList.add("active");
            activeContent.classList.add("active");
        }

        tabBtnImages.onclick = () => switchTab(tabBtnImages, tabContentImages);
        tabBtnReplay.onclick = () => switchTab(tabBtnReplay, tabContentReplay);
        tabBtnTools.onclick = () => switchTab(tabBtnTools, tabContentTools);
        tabBtnSearch.onclick = () => switchTab(tabBtnSearch, tabContentSearch);
        tabBtnAi.onclick = () => switchTab(tabBtnAi, tabContentAi);
        tabBtnSettings.onclick = () => switchTab(tabBtnSettings, tabContentSettings);

        tabBtnVideo.onclick = () => {
            switchTab(tabBtnVideo, tabContentVideo);
            if (window.location.hostname.includes("youtube.com") && window.location.pathname.startsWith("/watch")) {
                document.getElementById("scary-video-url").value = window.location.href;
            } else if (window.location.hostname.includes("youtube.com") && window.location.pathname.startsWith("/shorts")) {
                document.getElementById("scary-video-url").value = window.location.href;
            }
        };

        // SETTINGS LOGIC
        const ytApiInput = document.getElementById("scary-setting-yt-api");
        const geminiApiInput = document.getElementById("scary-setting-gemini-api");
        const saveKeysBtn = document.getElementById("scary-btn-save-keys");

        saveKeysBtn.onclick = () => {
            appSettings.ytApi = ytApiInput.value.trim();
            appSettings.geminiApi = geminiApiInput.value.trim();
            localStorage.setItem("scary-appSettings", JSON.stringify(appSettings)); showNotification({
                    title: "Settings Saved",
                    message: "API Keys have been saved locally.",
                    iconUrl: ICONS.default
                });
        };

        const opacitySlider = document.getElementById("scary-setting-opacity");
        const themeSelect = document.getElementById("scary-setting-theme");

        opacitySlider.oninput = (e) => {
            const val = e.target.value / 100;
            const isLight = win.classList.contains("scary-light-theme");
            if (isLight) {
                win.style.setProperty("background", `rgba(255, 255, 255, ${val})`, "important");
            } else {
                win.style.background = `rgba(9, 13, 22, ${val})`;
            }
        };

        opacitySlider.onchange = (e) => {
            showNotification({ title: "Opacity Changed", message: `Window opacity set to ${e.target.value}%`, iconUrl: ICONS.opacity });
        };

        themeSelect.onchange = (e) => {
            if (e.target.value === "light") {
                win.classList.add("scary-light-theme");
                showNotification({ title: "Theme Changed", message: "Light Mode activated", iconUrl: ICONS.sun });
            } else {
                win.classList.remove("scary-light-theme");
                win.style.background = "";
                showNotification({ title: "Theme Changed", message: "Dark Mode activated", iconUrl: ICONS.moon });
            }
            opacitySlider.dispatchEvent(new Event("input"));
        };

        const resizeSetting = document.getElementById("scary-setting-resize");
        resizeSetting.onchange = (e) => {
            if (e.target.checked) {
                win.style.resize = "both"; win.style.overflow = "hidden";
                showNotification({ title: "Resizing Enabled", message: "Drag the bottom right corner of the window.", iconUrl: ICONS.default });
            } else {
                win.style.resize = "none";
            }
        };

        // TOOLS TAB LOGIC
        document.getElementById("scary-tool-forceload").onclick = () => {
            const count = forceLoadLazyImages();
            showNotification({ title: "Lazy Images", message: count > 0 ? `Forced ${count} image(s) to load.` : "No stuck lazy images found.", iconUrl: ICONS.tools });
        };
        document.getElementById("scary-tool-copy-images").onclick = async () => {
            try {
                const urls = [...document.querySelectorAll("img")].filter(img => !win.contains(img)).map(resolveImageSrc).filter(Boolean);
                const unique = [...new Set(urls)];
                await navigator.clipboard.writeText(unique.join("\n"));
                showNotification({ title: "Copied", message: `${unique.length} image URL(s) copied.`, iconUrl: ICONS.download });
            } catch (err) { showNotification({ title: "Copy Failed", message: err.message, iconUrl: ICONS.error }); }
        };
        document.getElementById("scary-tool-copy-links").onclick = async () => {
            try {
                const links = [...document.querySelectorAll("a[href]")].filter(a => !win.contains(a)).map(a => a.href);
                const unique = [...new Set(links)];
                await navigator.clipboard.writeText(unique.join("\n"));
                showNotification({ title: "Copied", message: `${unique.length} link(s) copied.`, iconUrl: ICONS.download });
            } catch (err) { showNotification({ title: "Copy Failed", message: err.message, iconUrl: ICONS.error }); }
        };

        let darkFilterOn = false;
        const darkModeBtn = document.getElementById("scary-tool-darkmode");
        darkModeBtn.onclick = () => {
            darkFilterOn = !darkFilterOn;
            document.documentElement.style.filter = darkFilterOn ? "invert(1) hue-rotate(180deg)" : "";
            document.documentElement.style.backgroundColor = darkFilterOn ? "#111" : "";
            win.style.filter = darkFilterOn ? "invert(1) hue-rotate(180deg)" : "";
            darkModeBtn.classList.toggle("on", darkFilterOn);
        };
        document.getElementById("scary-tool-scrolltop").onclick = () => {
            const atTop = window.scrollY < 50;
            window.scrollTo({ top: atTop ? document.body.scrollHeight : 0, behavior: "smooth" });
        };

        // AUTO REPLAY LOGIC
        let replayEnabled = false, replayInterval = null, replayLastTime = -1, replayStallCounter = 0, replayVideoRef = null;
        const replayToggleBtn = document.getElementById("scary-replay-toggle"), replayIcon = document.getElementById("scary-replay-icon"), replayDot = document.getElementById("scary-replay-dot"), replayStatusText = document.getElementById("scary-replay-status-text");

        function onReplayVideoEnded() { if (!replayEnabled || !replayVideoRef) return; replayVideoRef.currentTime = 0; replayVideoRef.play().catch(() => {}); }
        function startReplayMonitoring() {
            stopReplayMonitoring();
            replayInterval = setInterval(() => {
                const video = document.querySelector("video");
                if (!video) return;
                if (video !== replayVideoRef) {
                    if (replayVideoRef) replayVideoRef.removeEventListener("ended", onReplayVideoEnded);
                    replayVideoRef = video; replayVideoRef.addEventListener("ended", onReplayVideoEnded);
                }
                const isNearEnd = video.duration && (video.duration - video.currentTime <= 0.4);
                if (!video.paused && video.currentTime === replayLastTime) { replayStallCounter += 1; } else { replayStallCounter = 0; }
                replayLastTime = video.currentTime;
                if (isNearEnd || replayStallCounter >= 4) { video.currentTime = 0; video.play().catch(() => {}); replayStallCounter = 0; }
            }, 1000);
        }
        function stopReplayMonitoring() {
            if (replayInterval) { clearInterval(replayInterval); replayInterval = null; }
            if (replayVideoRef) { replayVideoRef.removeEventListener("ended", onReplayVideoEnded); replayVideoRef = null; }
            replayStallCounter = 0;
        }
        function setReplayUI(enabled) {
            replayToggleBtn.textContent = enabled ? "Disable" : "Enable";
            replayToggleBtn.classList.toggle("on", enabled); replayIcon.classList.toggle("on", enabled);
            replayDot.classList.toggle("on", enabled); replayStatusText.textContent = enabled ? "AUTO REPLAY ON" : "AUTO REPLAY OFF";
        }
        replayToggleBtn.onclick = () => {
            if (closing) return; replayEnabled = !replayEnabled; setReplayUI(replayEnabled);
            if (replayEnabled) { startReplayMonitoring(); showNotification({ title: "Auto Replay Enabled", message: "The current video will now loop automatically.", iconUrl: ICONS.replay }); }
            else { stopReplayMonitoring(); showNotification({ title: "Auto Replay Disabled", message: "Video will play normally again.", iconUrl: ICONS.replay }); }
        };

        // SEARCH LOGIC
        const searchBtn = document.getElementById("scary-btn-do-search"), searchInput = document.getElementById("scary-search-query"), searchResults = document.getElementById("scary-search-results");
        function showVideoDataPane(videoId, title, thumb, channel, avatar, duration, views, desc) {
            let pane = document.getElementById("scary-video-data-pane");
            if (pane) pane.remove();
            pane = document.createElement("div"); pane.id = "scary-video-data-pane";
            pane.style.cssText = "position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15,23,42,0.95); backdrop-filter: blur(10px); z-index: 1000; display: flex; flex-direction: column; padding: 20px; box-sizing: border-box; overflow-y: auto; transition: opacity 0.3s; opacity: 0;";
            pane.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="margin: 0; font-size: 16px; color: #f8fafc; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80%;">Video Details</h3>
                    <button id="scary-close-pane" style="background: transparent; border: none; color: #ef4444; font-size: 20px; cursor: pointer;">&times;</button>
                </div>
                <div id="scary-pane-player" style="width: 100%; aspect-ratio: 16/9; background: #000; border-radius: 8px; margin-bottom: 15px; position: relative; overflow: hidden; cursor: pointer; flex-shrink: 0;">
                    <img src="${thumb}" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.8;" />
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 50px; height: 50px; background: rgba(220, 38, 38, 0.9); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <div style="width: 0; height: 0; border-top: 10px solid transparent; border-bottom: 10px solid transparent; border-left: 15px solid white; margin-left: 5px;"></div>
                    </div>
                </div>
                <div style="font-size: 14px; font-weight: bold; color: #f8fafc; margin-bottom: 10px;">${title.replace(/"/g, '&quot;')}</div>
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    ${avatar ? `<img src="${avatar}" style="width: 24px; height: 24px; border-radius: 50%;" />` : ''}
                    <span style="font-size: 13px; color: #cbd5e1;">${channel}</span>
                </div>
                <div style="display: flex; gap: 15px; font-size: 12px; color: #94a3b8; margin-bottom: 15px;">
                    <span>⏳ ${duration}</span><span>👁️ ${views}</span>
                </div>
                <div style="font-size: 12px; color: #cbd5e1; line-height: 1.5; white-space: pre-wrap; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 6px;">${desc.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            `;
            win.appendChild(pane);
            requestAnimationFrame(() => pane.style.opacity = "1");
            pane.querySelector("#scary-close-pane").onclick = () => { pane.style.opacity = "0"; setTimeout(() => pane.remove(), 300); };
            pane.querySelector("#scary-pane-player").onclick = function() {
                this.innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
                this.onclick = null; this.style.cursor = "default";
            };
        }

        searchBtn.onclick = async () => {
            const query = searchInput.value.trim(); if (!query) return;
            searchResults.innerHTML = "<div style='text-align:center; padding: 20px;'>Searching...</div>";
            searchBtn.disabled = true;
            try {
                const res = await fetch("https://www.youtube.com/results?search_query=" + encodeURIComponent(query));
                const text = await res.text();
                const match = text.match(/var ytInitialData = (\{.*?\});<\/script>/);
                if (!match) throw new Error("Could not parse YouTube results.");
                const data = JSON.parse(match[1]);
                let contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
                if (!contents) throw new Error("No contents found.");
                const items = contents.find(c => c.itemSectionRenderer)?.itemSectionRenderer?.contents || [];
                searchResults.innerHTML = ""; let count = 0;
                for (const item of items) {
                    const video = item.videoRenderer; if (!video) continue;
                    const videoId = video.videoId, title = video.title?.runs?.[0]?.text || "No Title", thumb = video.thumbnail?.thumbnails?.[0]?.url || "";
                    const channel = video.ownerText?.runs?.[0]?.text || "Unknown", avatar = video.channelThumbnailSupportedRenderers?.channelThumbnailWithLinkRenderer?.thumbnail?.thumbnails?.[0]?.url || "";
                    const duration = video.lengthText?.simpleText || "N/A", views = video.viewCountText?.simpleText || "N/A", desc = video.detailedMetadataSnippets?.[0]?.snippetText?.runs?.map(r=>r.text).join("") || "No description provided.";
                    const el = document.createElement("div"); el.className = "scary-yt-result"; el.style.animationDelay = `${count * 45}ms`;
                    el.innerHTML = `<div class="scary-yt-thumb-wrapper" style="position:relative; width:120px; height:68px; flex-shrink:0;"><img src="${thumb}" class="scary-yt-thumb" style="width:100%; height:100%;" /><span style="position:absolute; bottom:4px; right:4px; background:rgba(0,0,0,0.8); color:white; font-size:10px; padding:2px 4px; border-radius:4px;">${duration}</span></div><div class="scary-yt-info"><div class="scary-yt-title" title="${title.replace(/"/g, '&quot;')}">${title}</div><div class="scary-yt-channel">${avatar ? `<img src="${avatar}" class="scary-yt-avatar" />` : ''}<span>${channel}</span></div></div>`;
                    el.onclick = (e) => { if (e.ctrlKey) showVideoDataPane(videoId, title, thumb, channel, avatar, duration, views, desc); else { document.getElementById("scary-video-url").value = `https://www.youtube.com/watch?v=${videoId}`; tabBtnVideo.click(); } };
                    searchResults.appendChild(el); count++; if (count >= 15) break;
                }
                if (count === 0) searchResults.innerHTML = "<div style='text-align:center; padding: 20px;'>No videos found.</div>";
            } catch (err) { searchResults.innerHTML = `<div style='text-align:center; padding: 20px; color: #ef4444;'>Error: ${err.message}</div>`; } finally { searchBtn.disabled = false; }
        };
        searchInput.onkeydown = (e) => { if (e.key === "Enter") searchBtn.click(); };

        // AI LOGIC
        const aiInput = document.getElementById("scary-ai-input"), aiSendBtn = document.getElementById("scary-btn-ai-send"), aiChat = document.getElementById("scary-ai-chat");
        function addAiMessage(text, isUser = false) {
            const div = document.createElement("div");
            div.style.cssText = (isUser ? "background: rgba(59, 130, 246, 0.3); padding: 10px; border-radius: 8px; align-self: flex-end; max-width: 85%;" : "background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px; align-self: flex-start; max-width: 85%; white-space: pre-wrap;") + `animation: ${isUser ? "aiMsgInRight" : "aiMsgInLeft"} 0.3s cubic-bezier(0.16, 1, 0.3, 1) backwards;`;
            div.textContent = text; aiChat.appendChild(div); aiChat.scrollTop = aiChat.scrollHeight;
        }
        if (!document.getElementById("scary-ai-msg-styles")) {
            const aiStyle = document.createElement("style"); aiStyle.id = "scary-ai-msg-styles";
            aiStyle.textContent = `@keyframes aiMsgInLeft { from { opacity: 0; transform: translateX(-14px); } to { opacity: 1; transform: translateX(0); } } @keyframes aiMsgInRight { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: translateX(0); } }`;
            document.head.appendChild(aiStyle);
        }

        aiSendBtn.onclick = async () => {
            const query = aiInput.value.trim(); if (!query) return; aiInput.value = ""; addAiMessage(query, true);
            const command = query.toLowerCase();
            if (command.includes("close this injection") || command.includes("close the ui")) { addAiMessage("Closing UI as requested..."); setTimeout(() => document.getElementById("scary-btn-close").click(), 1000); return; }
            if (command.includes("search for me")) { const term = query.replace(/search for me\s*/i, ""); addAiMessage(`Opening a search for: ${term}`); window.open(`https://www.google.com/search?q=${encodeURIComponent(term)}`, "_blank"); return; }
            if (command.includes("recommendations")) { addAiMessage("Here are some useful tools instead of YouTube:\n1. Vimeo\n2. Dailymotion\n3. Twitch\n\nShortcuts in this UI:\n- Ctrl+Click a Search result for detailed view\n- Download directly from Search\n- Enable Auto Replay from the Auto Replay tab\n- Check the Tools tab for lazy-image and link helpers"); return; }
            if (command.includes("replay") && (command.includes("on") || command.includes("enable") || command.includes("start"))) { if (!replayEnabled) replayToggleBtn.click(); addAiMessage("Auto Replay is now ON."); return; }
            if (command.includes("replay") && (command.includes("off") || command.includes("disable") || command.includes("stop"))) { if (replayEnabled) replayToggleBtn.click(); addAiMessage("Auto Replay is now OFF."); return; }
            if (command.includes("load") && command.includes("image")) { const count = forceLoadLazyImages(); addAiMessage(count > 0 ? `Forced ${count} lazy image(s) to load.` : "No stuck lazy images found."); return; }

            if (!appSettings.geminiApi) { addAiMessage("Please add your Gemini API key in the Settings tab to use dynamic AI chat! (I can still do basic commands like 'close this injection', 'search for me [term]', 'turn replay on/off', 'load images', etc.)"); return; }
            addAiMessage("Thinking..."); const loadingDiv = aiChat.lastChild;
            try {
                const systemContext = `You are a helpful AI agent inside a browser extension. The user is currently on this website: ${window.location.hostname}${window.location.pathname}. If they ask for info about the current site, use this URL to infer what site they are on and provide details. Be concise.`;
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${appSettings.geminiApi}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [ { role: "user", parts: [{ text: systemContext + "\n\nUser Query: " + query }] } ] }) });
                const data = await res.json(); if (data.error) throw new Error(data.error.message);
                loadingDiv.textContent = data.candidates[0].content.parts[0].text;
            } catch (err) { loadingDiv.textContent = `Error: ${err.message}`; }
        };
        aiInput.onkeydown = (e) => { if (e.key === "Enter") aiSendBtn.click(); };

        // BUTTONS
        const minButton = document.getElementById("scary-btn-min");
        const closeButton = document.getElementById("scary-btn-close");
        const downloadButton = document.getElementById("scary-toggle-dl");
        const selectButton = document.getElementById("scary-toggle-select");
        const multiActions = document.getElementById("scary-multi-actions");
        const selectAllBtn = document.getElementById("scary-btn-select-all");
        const clearAllBtn = document.getElementById("scary-btn-clear-all");
        const grid = document.getElementById("scary-grid");
        const zipButton = document.getElementById("scary-dl-all");

        // THUMBNAIL DOWNLOADER
        const dlThumbBtn = document.getElementById("scary-dl-thumb");
        dlThumbBtn.onclick = async () => {
            if (closing) return;
            const urlInput = document.getElementById("scary-video-url").value;
            try {
                let videoId = "";
                if (urlInput.includes("v=")) videoId = new URLSearchParams(new URL(urlInput).search).get("v");
                else if (urlInput.includes("youtu.be/") || urlInput.includes("youtube.com/shorts/")) videoId = urlInput.split(/youtu\.be\/|shorts\//)[1]?.split(/[?&]/)[0];
                if (!videoId) throw new Error("Invalid YouTube URL");
                const thumbUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
                directDownload(thumbUrl);
                showNotification({ title: "Thumbnail Download", message: "High-Res thumbnail downloading...", iconUrl: ICONS.download });
            } catch (err) { showNotification({ title: "Error", message: "Could not extract video ID: " + err.message, iconUrl: ICONS.error }); }
        };

        // MINIMIZE
        minButton.onclick = () => {
            if (closing) return; lockPosition();
            requestAnimationFrame(() => {
                rolledUp = !rolledUp; win.classList.toggle("rolled-up", rolledUp);
                minButton.textContent = rolledUp ? "+" : "-";
            });
        };

        // DOWNLOAD MODES
        downloadButton.onclick = () => {
            if (closing) return; instantDownload = !instantDownload;
            downloadButton.classList.toggle("active", instantDownload);
            if (instantDownload && multiSelect) { multiSelect = false; selectButton.classList.remove("active"); multiActions.style.display = "none"; }
        };

        selectButton.onclick = () => {
            if (closing) return; multiSelect = !multiSelect;
            selectButton.classList.toggle("active", multiSelect);
            multiActions.style.display = multiSelect ? "flex" : "none";
            if (multiSelect && instantDownload) { instantDownload = false; downloadButton.classList.remove("active"); }
        };

        selectAllBtn.onclick = () => {
            if (closing || !multiSelect) return;
            document.querySelectorAll('img').forEach(img => {
                if (win.contains(img)) return;
                const src = resolveImageSrc(img);
                if (src) selectedImages.add(src);
            });
            renderGrid();
        };
        clearAllBtn.onclick = () => { if (closing) return; selectedImages.clear(); renderGrid(); };

        // GRID
        function renderGrid() {
            grid.innerHTML = ""; let idx = 0;
            for (const src of selectedImages) {
                const item = document.createElement("div"); item.className = "scary-img-item";
                item.style.animationDelay = `${idx * 30}ms`; idx++;
                const img = document.createElement("img"); img.src = src; img.alt = "Selected image";
                item.appendChild(img);
                item.onclick = event => { event.stopPropagation(); selectedImages.delete(src); renderGrid(); };
                grid.appendChild(item);
            }
            zipButton.textContent = `Download Zip (${selectedImages.size})`;
        }

        // ZIP DOWNLOAD
        zipButton.onclick = async () => {
            if (closing) return;
            if (selectedImages.size === 0) { showNotification({ title: "No Images Selected", message: "Select at least one image first.", iconUrl: ICONS.error }); return; }
            zipButton.disabled = true; const total = selectedImages.size;
            try {
                showNotification({ title: "Starting Download", message: `Fetching ${total} image(s)...`, iconUrl: ICONS.download });
                const files = []; let number = 0;
                for (const src of selectedImages) {
                    number++; zipButton.textContent = `Downloading ${number}/${total}...`;
                    try {
                        const response = await fetch(src, { credentials: "include" });
                        if (!response.ok) throw new Error(`HTTP ${response.status}`);
                        const blob = await response.blob();
                        if (!blob.size) throw new Error("Empty image.");
                        files.push({ name: `scary_images/${makeImageFilename(blob, number)}`, blob: blob });
                    } catch (error) { console.error("[System Injector] Image download failed:", src, error); }
                }
                if (files.length === 0) throw new Error("None of the selected images could be downloaded.");
                zipButton.textContent = "Building ZIP...";
                const zipBlob = await createZip(files);
                if (!zipBlob || zipBlob.size < 22) throw new Error("Generated ZIP is invalid or empty.");
                const zipUrl = URL.createObjectURL(zipBlob);
                const anchor = document.createElement("a"); anchor.href = zipUrl; anchor.download = `scary_images_${Date.now()}.zip`; anchor.style.display = "none";
                document.body.appendChild(anchor); anchor.click(); anchor.remove();
                setTimeout(() => { URL.revokeObjectURL(zipUrl); }, 10000);
                zipButton.textContent = `Downloaded ${files.length} image(s)`;
                showNotification({ title: "ZIP Downloaded", message: `Successfully bundled ${files.length} image(s).`, iconUrl: ICONS.download });
            } catch (error) { showNotification({ title: "ZIP Creation Failed", message: error.message, iconUrl: ICONS.error }); }
            finally { setTimeout(() => { zipButton.disabled = false; renderGrid(); }, 1500); }
        };

        // IMAGE CLICK HANDLER
        function imageClickHandler(event) {
            if (!instantDownload && !multiSelect) return;
            if (closing) return;
            const target = event.target;
            if (!target || target.tagName !== "IMG" || win.contains(target)) return;
            const src = resolveImageSrc(target);
            if (!src) return;
            event.preventDefault(); event.stopPropagation();
            if (instantDownload) directDownload(src);
            else if (multiSelect) { selectedImages.add(src); renderGrid(); }
        }
        document.addEventListener("click", imageClickHandler, true);

        // DISABLE MODS
        function disableMods() {
            document.removeEventListener("click", imageClickHandler, true);
            instantDownload = false; multiSelect = false;
            downloadButton.classList.remove("active"); selectButton.classList.remove("active");
            multiActions.style.display = "none";
            stopReplayMonitoring();
            clearInterval(keepAliveIntervalId);
            clearInterval(sparkleInterval);
            introTimers.forEach(id => clearTimeout(id));
            document.querySelectorAll(".scary-run-letter, .scary-tnt-particle").forEach(el => el.remove());
            const leftoverShatter = document.getElementById("scary-shatter-container");
            if (leftoverShatter) leftoverShatter.remove();
            if (darkFilterOn) {
                document.documentElement.style.filter = ""; document.documentElement.style.backgroundColor = ""; darkFilterOn = false;
            }
        }

        // CLOSE
        closeButton.onclick = () => {
            if (closing) return;
            closing = true; manuallyClosing = true;
            window.__SYSTEM_INJECTOR_RUNNING = false;
            disableMods(); lockPosition();
            win.classList.remove("scary-no-transition");
            win.style.width = ""; win.style.height = "";
            const currentRect = win.getBoundingClientRect();
            win.style.left = `${currentRect.left + currentRect.width / 2}px`;
            win.style.top = `${currentRect.top + currentRect.height / 2}px`;
            win.style.transform = "translate(-50%, -50%)";
            void win.offsetWidth;
            if (rolledUp) win.classList.add("closing-minimized"); else win.classList.add("closing");
            // Match SLOWED DOWN exit time
            setTimeout(() => {
                if (win.parentNode) win.remove();
                if (style.parentNode) style.remove();
            }, 2000); 
        };
    }

    // ========================================================================
    // START INJECTED UI
    // ========================================================================
    showNotification({
        title: "System Injector",
        message: "Script injected successfully!",
        duration: NOTIF_DURATION
    });

    // Wait until notification disappears before booting UI
    setTimeout(() => {
        if (document.body || document.documentElement) {
            showModManager();
        }
    }, NOTIF_DURATION + NOTIF_EXIT_DURATION + 200); // 5000 + 2000 + 200 = 7200ms
})();
