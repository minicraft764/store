(async function makeInstallablePWA() {
  // 1. Find the best available icon from the website's DOM
  function getBestIcon() {
    const selectors = [
      'link[rel="apple-touch-icon"]',
      'link[rel="icon"][sizes]',
      'link[rel="icon"]',
      'link[rel="shortcut icon"]'
    ];
    
    let iconUrl = '';
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && el.href) {
        iconUrl = el.href;
        break;
      }
    }
    
    // Fallback to standard favicon if no link tags exist
    return iconUrl || `${window.location.origin}/favicon.ico`;
  }

  const appIcon = getBestIcon();
  const appTitle = document.title || 'Web App';

  // 2. Create dynamic Web App Manifest
  const manifest = {
    name: appTitle,
    short_name: appTitle.slice(0, 12),
    start_url: window.location.href,
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      {
        src: appIcon,
        sizes: '192x192 512x512',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ]
  };

  // Inject Manifest Blob into document head
  const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
  const manifestUrl = URL.createObjectURL(manifestBlob);
  let manifestLink = document.querySelector('link[rel="manifest"]');
  
  if (!manifestLink) {
    manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    document.head.appendChild(manifestLink);
  }
  manifestLink.href = manifestUrl;

  // 3. Create dummy inline Service Worker
  const swCode = `
    self.addEventListener('install', (e) => self.skipWaiting());
    self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
    self.addEventListener('fetch', (e) => {
      e.respondWith(fetch(e.request).catch(() => new Response('Offline')));
    });
  `;

  const swBlob = new Blob([swCode], { type: 'application/javascript' });
  const swUrl = URL.createObjectURL(swBlob);

  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register(swUrl);
      console.log('Temporary Service Worker registered successfully.');
    } catch (err) {
      console.warn('Service Worker registration failed (cross-origin restrictions may apply):', err);
    }
  }

  // 4. Listen for install prompt or provide manual instructions
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    triggerInstall();
  });

  async function triggerInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      deferredPrompt = null;
    } else {
      alert(`PWA assets generated for "${appTitle}"!\n\nIf the browser prompt didn't show automatically, click your browser's menu (⋮ or ≡) and select "Install ${appTitle}" or "Add to Home screen".`);
    }
  }

  // Fallback trigger if beforeinstallprompt fired before script loaded
  setTimeout(triggerInstall, 1000);
})();