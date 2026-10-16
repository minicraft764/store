(function() {
    // 1. BACKUP ORIGINAL GAME FUNCTIONS
    if (!window._originalGameOver) {
        window._originalGameOver = Runner.prototype.gameOver;
    }
    const originalSpeed = 6; // Default starting speed

    // 2. CREATE UI CONTAINER
    const ui = document.createElement('div');
    ui.id = 'dino-hack-menu';
    ui.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        width: 250px;
        background: #1e1e24;
        color: #ffffff;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        z-index: 999999;
        user-select: none;
        overflow: hidden;
        border: 1px solid #2d2d35;
        transition: height 0.3s cubic-bezier(0.25, 1, 0.5, 1);
    `;

    // 3. CREATE TITLE BAR (DRAGGABLE)
    const titleBar = document.createElement('div');
    titleBar.style.cssText = `
        padding: 12px;
        background: #141417;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: move;
        border-bottom: 1px solid #2d2d35;
    `;
    
    const titleText = document.createElement('span');
    titleText.innerText = 'DinoHack Pro';
    titleText.style.fontWeight = 'bold';
    titleText.style.fontSize = '14px';
    titleText.style.color = '#528bff';
    titleBar.appendChild(titleText);

    const windowControls = document.createElement('div');
    windowControls.style.display = 'flex';
    windowControls.style.gap = '8px';

    const minBtn = document.createElement('button');
    minBtn.innerText = '−';
    minBtn.style.cssText = 'background:none; border:none; color:#8a8a93; cursor:pointer; font-size:16px; padding:0 4px;';
    
    const closeBtn = document.createElement('button');
    closeBtn.innerText = '✕';
    closeBtn.style.cssText = 'background:none; border:none; color:#8a8a93; cursor:pointer; font-size:12px; padding:0 4px;';

    windowControls.appendChild(minBtn);
    windowControls.appendChild(closeBtn);
    titleBar.appendChild(windowControls);
    ui.appendChild(titleBar);

    // 4. CREATE MENU CONTENT BODY
    const content = document.createElement('div');
    content.id = 'menu-content';
    content.style.padding = '15px';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.gap = '15px';

    // God Mode Row
    const godModeRow = document.createElement('div');
    godModeRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center;';
    
    const godLabel = document.createElement('span');
    godLabel.innerText = 'God Mode';
    godLabel.style.fontSize = '13px';
    
    const godToggle = document.createElement('input');
    godToggle.type = 'checkbox';
    godToggle.style.cssText = 'cursor:pointer; width:16px; height:16px; accent-color:#528bff;';
    
    godModeRow.appendChild(godLabel);
    godModeRow.appendChild(godToggle);
    content.appendChild(godModeRow);

    // Speed Input Row
    const speedRow = document.createElement('div');
    speedRow.style.cssText = 'display:flex; flex-direction:column; gap:5px;';
    
    const speedLabel = document.createElement('span');
    speedLabel.innerText = 'Game Speed';
    speedLabel.style.fontSize = '12px';
    speedLabel.style.color = '#8a8a93';
    
    const speedInput = document.createElement('input');
    speedInput.type = 'number';
    speedInput.value = Runner.instance_ ? Runner.instance_.currentSpeed : originalSpeed;
    speedInput.style.cssText = 'background:#141417; border:1px solid #2d2d35; color:#fff; padding:6px; border-radius:4px; font-size:13px; outline:none;';
    
    speedRow.appendChild(speedLabel);
    speedRow.appendChild(speedInput);
    content.appendChild(speedRow);

    // Default Button
    const defaultBtn = document.createElement('button');
    defaultBtn.innerText = 'Reset to Default';
    defaultBtn.style.cssText = 'background:#2d2d35; border:none; color:#fff; padding:8px; border-radius:4px; cursor:pointer; font-weight:500; font-size:12px; transition: 0.2s;';
    defaultBtn.onmouseover = () => defaultBtn.style.background = '#3e3e48';
    defaultBtn.onmouseout = () => defaultBtn.style.background = '#2d2d35';
    content.appendChild(defaultBtn);

    ui.appendChild(content);
    document.body.appendChild(ui);

    // 5. FUNCTIONALITY & INTERACTION LOGIC
    
    // Smooth Roll Up (Minimize) Animation
    let isMinimized = false;
    const fullHeight = '190px'; // Precalculated height for smooth snap
    ui.style.height = fullHeight;

    minBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isMinimized) {
            ui.style.height = '43px'; // Fits just the title bar
            content.style.opacity = '0';
            content.style.transition = 'opacity 0.15s ease';
            setTimeout(() => content.style.display = 'none', 150);
        } else {
            content.style.display = 'flex';
            setTimeout(() => {
                ui.style.height = fullHeight;
                content.style.opacity = '1';
            }, 10);
        }
        isMinimized = !isMinimized;
    });

    // Close Button
    closeBtn.addEventListener('click', () => {
        ui.remove();
    });

    // God Mode Toggle Action
    godToggle.addEventListener('change', () => {
        if (godToggle.checked) {
            Runner.prototype.gameOver = function() {};
        } else {
            Runner.prototype.gameOver = window._originalGameOver;
        }
    });

    // Speed Input Action
    speedInput.addEventListener('input', () => {
        const val = parseFloat(speedInput.value);
        if (Runner.instance_ && !isNaN(val)) {
            Runner.instance_.setSpeed(val);
        }
    });

    // Reset Defaults Action
    defaultBtn.addEventListener('click', () => {
        godToggle.checked = false;
        Runner.prototype.gameOver = window._originalGameOver;
        
        speedInput.value = originalSpeed;
        if (Runner.instance_) {
            Runner.instance_.setSpeed(originalSpeed);
        }
    });

    // 6. DRAG AND DROP MECHANICS
    let isDragging = false;
    let offsetX, offsetY;

    titleBar.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - ui.getBoundingClientRect().left;
        offsetY = e.clientY - ui.getBoundingClientRect().top;
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        ui.style.left = (e.clientX - offsetX) + 'px';
        ui.style.top = (e.clientY - offsetY) + 'px';
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
})();
