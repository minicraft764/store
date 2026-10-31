(function showInjectedNotification() {
    // 1. Inject CSS styles into the page if they don't already exist
    if (!document.getElementById('spiky-notif-styles')) {
        const style = document.createElement('style');
        style.id = 'spiky-notif-styles';
        style.innerHTML = `
            #spikyNotif {
                position: fixed;
                top: -120px;
                left: 50%;
                transform: translateX(-50%);
                width: 320px;
                background: #120202;
                border: 2px solid #ff1a1a;
                color: #ff4d4d;
                padding: 16px 20px;
                box-shadow: 0 0 20px rgba(255, 0, 0, 0.5), inset 0 0 12px rgba(255, 0, 0, 0.25);
                border-radius: 6px;
                
                /* Smooth slide transition from the top center */
                transition: top 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                z-index: 999999;
                font-family: monospace;
            }
            #spikyNotif.show {
                top: 25px;
            }
            #spikyNotif .notification-content {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            #spikyNotif .notification-header {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            #spikyNotif .cs-svg-icon {
                width: 22px;
                height: 22px;
                fill: #ff1a1a;
                filter: drop-shadow(0 0 6px #ff1a1a);
                flex-shrink: 0;
            }
            #spikyNotif .notification-title {
                font-size: 14px;
                font-weight: bold;
                letter-spacing: 1.5px;
                text-transform: uppercase;
                text-shadow: 0 0 6px rgba(255, 0, 0, 0.9);
            }
            #spikyNotif .drain-track {
                width: 100%;
                height: 4px;
                background: #330000;
                overflow: hidden;
                border-radius: 2px;
            }
            #spikyNotif .drain-bar {
                width: 100%;
                height: 100%;
                background: #ff1a1a;
                box-shadow: 0 0 8px #ff1a1a;
                transform-origin: left;
                transform: scaleX(1);
            }
        `;
        document.head.appendChild(style);
    }

    // 2. Kill / remove any older notification immediately so they never stack
    const existing = document.getElementById('spikyNotif');
    if (existing) {
        existing.remove();
    }

    // 3. Create the new notification HTML structure
    const notif = document.createElement('div');
    notif.id = 'spikyNotif';
    notif.innerHTML = `
        <div class="notification-content">
            <div class="notification-header">
                <svg class="cs-svg-icon" viewBox="0 0 24 24">
                    <path d="M20 18H4V6H20M20 4H4C2.89 4 2 4.89 2 6V18C2 19.11 2.89 20 4 20H10V22H14V20H20C21.11 20 22 19.11 22 18V6C22 4.89 21.11 4 20 4M6 10H8V12H6V10M10 10H16V12H10V10M6 14H11V16H6V14Z"/>
                </svg>
                <span class="notification-title">Injected Successfully</span>
            </div>
            <div class="drain-track">
                <div id="drainBar" class="drain-bar"></div>
            </div>
        </div>
    `;
    document.body.appendChild(notif);

    const drainBar = notif.querySelector('#drainBar');

    // 4. Slide down smoothly from the top center
    requestAnimationFrame(() => {
        notif.classList.add('show');
    });

    // 5. Start the 2-second drain bar countdown
    setTimeout(() => {
        drainBar.style.transition = 'transform 2s linear';
        drainBar.style.transform = 'scaleX(0)';
    }, 150);

    // 6. Slide back up and remove element after exactly 2 seconds
    setTimeout(() => {
        notif.classList.remove('show');
        setTimeout(() => {
            if (notif.parentNode) {
                notif.remove();
            }
        }, 400);
    }, 2150); // 150ms delay + 2000ms drain
})();
