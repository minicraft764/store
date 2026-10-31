(() => {
  // Remove any existing notification first
  const existing = document.getElementById('custom-inject-toast');
  if (existing) existing.remove();

  // Create main container
  const toast = document.createElement('div');
  toast.id = 'custom-inject-toast';

  // Glowing Left Icon Badge
  const iconWrap = document.createElement('div');
  iconWrap.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#08080A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  `;

  // Text container
  const textWrap = document.createElement('div');
  const titleText = document.createElement('div');
  titleText.textContent = 'Code Injected';
  const subText = document.createElement('div');
  subText.textContent = 'Scar Executor • Active';

  textWrap.appendChild(titleText);
  textWrap.appendChild(subText);

  // Close button
  const closeBtn = document.createElement('div');
  closeBtn.innerHTML = '&times;';

  // Bottom draining progress bar
  const progressTrack = document.createElement('div');
  const progressBar = document.createElement('div');
  progressTrack.appendChild(progressBar);

  // Main Toast Styling (Glassmorphic Dark + Neon Accent)
  Object.assign(toast.style, {
    position: 'fixed',
    top: '24px',
    right: '24px',
    transform: 'translateX(calc(100% + 40px)) scale(0.95)',
    opacity: '0',
    background: 'linear-gradient(135deg, rgba(16, 16, 24, 0.96) 0%, rgba(11, 11, 16, 0.98) 100%)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    color: '#F4F4F8',
    padding: '14px 20px 17px 16px',
    borderRadius: '12px',
    border: '1px solid rgba(46, 239, 152, 0.32)',
    boxShadow: '0 14px 35px rgba(0, 0, 0, 0.55), 0 0 20px rgba(46, 239, 152, 0.12)',
    fontFamily: '"Inter", "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
    zIndex: '2147483647',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    minWidth: '240px',
    direction: 'ltr',
    textAlign: 'left',
    boxSizing: 'border-box',
    overflow: 'hidden',
    userSelect: 'none',
    transition: 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.45s ease'
  });

  // Icon Badge Styling
  Object.assign(iconWrap.style, {
    width: '32px',
    height: '32px',
    minWidth: '32px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #2EEF98 0%, #10B981 100%)',
    boxShadow: '0 0 14px rgba(46, 239, 152, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  });

  // Text Styling
  Object.assign(textWrap.style, {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: '1',
    paddingRight: '8px'
  });

  Object.assign(titleText.style, {
    fontSize: '14.5px',
    fontWeight: '700',
    letterSpacing: '0.3px',
    color: '#FFFFFF',
    lineHeight: '1.2'
  });

  Object.assign(subText.style, {
    fontSize: '11.5px',
    fontWeight: '600',
    letterSpacing: '0.4px',
    color: '#2EEF98',
    opacity: '0.9'
  });

  // Close Button Styling
  Object.assign(closeBtn.style, {
    cursor: 'pointer',
    fontSize: '20px',
    lineHeight: '1',
    color: '#6E6E82',
    padding: '2px 4px',
    borderRadius: '4px',
    transition: 'color 0.2s ease, background 0.2s ease'
  });

  // Progress Track & Bar Styling
  Object.assign(progressTrack.style, {
    position: 'absolute',
    bottom: '0',
    left: '0',
    width: '100%',
    height: '3px',
    backgroundColor: 'rgba(255, 255, 255, 0.06)'
  });

  Object.assign(progressBar.style, {
    height: '100%',
    width: '100%',
    background: 'linear-gradient(90deg, #10B981 0%, #2EEF98 100%)',
    boxShadow: '0 0 10px #2EEF98',
    transition: 'width 2s linear'
  });

  // Assemble DOM
  toast.appendChild(iconWrap);
  toast.appendChild(textWrap);
  toast.appendChild(closeBtn);
  toast.appendChild(progressTrack);
  (document.body || document.documentElement).appendChild(toast);

  // Slide in smoothly from the right
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(0) scale(1)';
      toast.style.opacity = '1';
      progressBar.style.width = '0%';
    });
  });

  // Smooth Exit after 2 seconds
  let isClosing = false;
  const dismissToast = () => {
    if (isClosing) return;
    isClosing = true;
    toast.style.transform = 'translateX(calc(100% + 40px)) scale(0.95)';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 550);
  };

  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.color = '#FFFFFF';
  });
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.color = '#6E6E82';
  });
  closeBtn.addEventListener('click', dismissToast);

  setTimeout(dismissToast, 2000);
})();
