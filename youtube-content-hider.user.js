// ==UserScript==
// @name         YouTube Content Hider & Debugger
// @namespace    http://tampermonkey.net/
// @version      4.1
// @description  Hide/Show YouTube Shorts and Posts with debug capabilities
// @author       StringManolo
// @match        https://www.youtube.com/*
// @match        https://m.youtube.com/*
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // === CONFIGURATION ===
    const config = {
        hideShortsByDefault: true,
        hidePostsByDefault: true,
        showDebugButton: true,
        autoHideDelay: 2000,
        scanInterval: 5000
    };

    // === STATE MANAGEMENT ===
    const state = {
        hideShorts: config.hideShortsByDefault,
        hidePosts: config.hidePostsByDefault,
        controlsVisible: false,
        logsVisible: false,
        isMobile: window.location.hostname === 'm.youtube.com',
        elementCount: { shorts: 0, posts: 0, total: 0 }
    };

    // === SELECTORS ===
    const selectors = {
        shorts: [
            'ytd-reel-shelf-renderer',
            'ytd-rich-shelf-renderer[is-shorts]',
            'ytd-rich-section-renderer[is-shorts]',
            'ytd-mini-guide-entry-renderer[aria-label*="Shorts"]',
            'ytd-guide-entry-renderer[title*="Shorts"]',
            'a[href*="/shorts/"]',
            'ytd-video-renderer:has(a[href*="/shorts/"])',
            'ytd-rich-item-renderer:has(a[href*="/shorts/"])',
            'ytd-rich-shelf-renderer:has(#title-text:contains("Shorts"))',
            'ytm-reel-shelf-renderer',
            'ytm-item-section-renderer:has(a[href*="/shorts/"])'
        ],
        posts: [
            'ytd-backstage-post-renderer',
            'ytd-post-renderer',
            'ytd-rich-item-renderer:has(ytd-backstage-post-renderer)',
            'ytm-backstage-post-renderer',
            'ytm-post-renderer'
        ]
    };

    // === STYLE INJECTION ===
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Debug floating button */
            .debug-floating-btn {
                position: fixed;
                bottom: 20px;
                left: 20px;
                background: #4444ff;
                color: white;
                border: none;
                padding: 10px 15px;
                border-radius: 20px;
                cursor: pointer;
                font-size: 13px;
                font-weight: bold;
                z-index: 999999;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 8px;
                user-select: none;
                touch-action: none;
            }
            
            .debug-floating-btn:hover {
                background: #6666ff;
                transform: scale(1.05);
                box-shadow: 0 6px 16px rgba(0,0,0,0.4);
            }
            
            .debug-floating-btn.active {
                background: #ff4444;
            }
            
            .debug-floating-btn.dragging {
                opacity: 0.8;
                transform: scale(1.1);
            }
            
            /* Controls panel */
            .debug-controls {
                position: fixed;
                top: 20px;
                left: 20px;
                background: rgba(0, 0, 0, 0.95);
                color: white;
                padding: 15px;
                border-radius: 8px;
                border-left: 5px solid #4444ff;
                font-family: Arial, sans-serif;
                font-size: 12px;
                z-index: 999998;
                display: flex;
                flex-direction: column;
                gap: 10px;
                min-width: 250px;
                max-width: 300px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                backdrop-filter: blur(10px);
                transition: all 0.3s ease;
                user-select: none;
                touch-action: none;
            }
            
            .debug-controls.hidden {
                display: none;
            }
            
            .controls-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 5px;
                cursor: move;
            }
            
            .debug-controls h3 {
                margin: 0;
                color: #4444ff;
                font-size: 14px;
            }
            
            .btn-group {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .btn-row {
                display: flex;
                gap: 5px;
            }
            
            .debug-btn {
                background: #4444ff;
                color: white;
                border: none;
                padding: 8px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s;
                flex: 1;
                white-space: nowrap;
                text-align: center;
                user-select: none;
                touch-action: manipulation;
            }
            
            .debug-btn:hover {
                background: #6666ff;
            }
            
            .debug-btn.active {
                background: #44ff44;
                color: #000;
            }
            
            .debug-btn.inactive {
                background: #ff4444;
            }
            
            .debug-btn.toggle {
                background: #ffaa00;
            }
            
            .debug-btn.toggle:hover {
                background: #ffcc44;
            }
            
            .debug-btn.close {
                background: transparent;
                color: #aaa;
                padding: 2px 8px;
                font-size: 18px;
                line-height: 1;
            }
            
            .debug-btn.close:hover {
                color: white;
                background: rgba(255,255,255,0.1);
            }
            
            .debug-stats {
                display: flex;
                justify-content: space-between;
                margin-top: 5px;
                font-size: 11px;
            }
            
            .stat-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                flex: 1;
            }
            
            .stat-value {
                font-weight: bold;
                font-size: 14px;
            }
            
            .stat-label {
                font-size: 10px;
                opacity: 0.8;
            }
            
            /* Logs panel */
            .debug-logs {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.95);
                color: white;
                padding: 15px;
                border-radius: 8px;
                border-left: 5px solid #ff4444;
                font-family: Arial, sans-serif;
                font-size: 12px;
                max-width: 400px;
                max-height: 300px;
                width: 350px;
                height: 250px;
                overflow-y: auto;
                z-index: 999997;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                backdrop-filter: blur(10px);
                transition: all 0.3s ease;
                display: flex;
                flex-direction: column;
                user-select: none;
                touch-action: none;
            }
            
            .debug-logs.hidden {
                display: none;
            }
            
            .logs-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
                cursor: move;
            }
            
            .debug-logs h3 {
                margin: 0;
                color: #ff4444;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .debug-logs .counter {
                background: #ff4444;
                color: white;
                padding: 2px 6px;
                border-radius: 10px;
                font-size: 11px;
            }
            
            .log-container {
                flex: 1;
                overflow-y: auto;
                padding-right: 5px;
            }
            
            .log-container::-webkit-scrollbar {
                width: 6px;
            }
            
            .log-container::-webkit-scrollbar-track {
                background: rgba(255,255,255,0.1);
                border-radius: 3px;
            }
            
            .log-container::-webkit-scrollbar-thumb {
                background: #ff4444;
                border-radius: 3px;
            }
            
            .log-entry {
                margin: 5px 0;
                padding: 5px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
                font-size: 11px;
                line-height: 1.3;
            }
            
            .log-time {
                color: #888;
                font-size: 9px;
                margin-right: 5px;
            }
            
            .log-message {
                color: #fff;
            }
            
            .log-error {
                color: #ff6666 !important;
            }
            
            .log-success {
                color: #44ff44 !important;
            }
            
            .log-warning {
                color: #ffaa44 !important;
            }
            
            .log-info {
                color: #aaaaff !important;
            }
            
            /* Hidden elements style */
            .yt-hidden-shorts,
            .yt-hidden-posts {
                display: none !important;
            }
            
            /* Debug highlight style */
            .yt-debug-highlight {
                background-color: rgba(255, 0, 0, 0.3) !important;
                border: 3px solid red !important;
                position: relative !important;
            }
            
            .yt-debug-highlight::before {
                content: "HIDDEN - DEBUG";
                position: absolute;
                top: -20px;
                left: 0;
                background: red;
                color: white;
                padding: 2px 6px;
                font-size: 9px;
                font-weight: bold;
                z-index: 10000;
                white-space: nowrap;
                border-radius: 3px;
            }
        `;
        document.head.appendChild(style);
    }

    // === LOGGING SYSTEM ===
    const debugLog = [];
    const MAX_LOG_ENTRIES = 100;
    let logsContainer = null;
    let controlsContainer = null;
    let floatingButton = null;

    function addLog(message, type = 'info') {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        debugLog.push({
            time: timeStr,
            message: message,
            type: type
        });
        
        if (debugLog.length > MAX_LOG_ENTRIES) {
            debugLog.shift();
        }
        
        updateLogs();
        console.log(`[YT Debugger ${timeStr}] ${message}`);
    }

    function updateLogs() {
        if (!logsContainer || !state.logsVisible) return;
        
        const logContainer = logsContainer.querySelector('.log-container');
        if (logContainer) {
            let html = '';
            const startIndex = Math.max(0, debugLog.length - 20);
            for (let i = startIndex; i < debugLog.length; i++) {
                const log = debugLog[i];
                html += `
                    <div class="log-entry">
                        <span class="log-time">[${log.time}]</span>
                        <span class="log-message log-${log.type}">${log.message}</span>
                    </div>
                `;
            }
            logContainer.innerHTML = html;
            logContainer.scrollTop = logContainer.scrollHeight;
        }
        
        updateCounter();
    }

    function updateCounter() {
        if (logsContainer && state.logsVisible) {
            const counter = logsContainer.querySelector('.counter');
            if (counter) {
                counter.textContent = state.elementCount.total;
            }
        }
        if (controlsContainer && state.controlsVisible) {
            controlsContainer.querySelector('#stat-shorts').textContent = state.elementCount.shorts;
            controlsContainer.querySelector('#stat-posts').textContent = state.elementCount.posts;
            controlsContainer.querySelector('#stat-total').textContent = state.elementCount.total;
        }
    }

    // === DRAG AND DROP SYSTEM ===
    function makeDraggable(element, isFloatingButton = false) {
        let isDragging = false;
        let hasDragged = false;
        let startX, startY, initialLeft, initialTop;
        let dragTimeout;
        
        // For better mobile performance, use passive listeners
        const passiveOptions = { passive: true };
        
        element.addEventListener('mousedown', startDrag);
        element.addEventListener('touchstart', startDragTouch, passiveOptions);
        
        function startDrag(e) {
            if (isFloatingButton && e.target !== element && !e.target.classList.contains('debug-floating-btn')) {
                return;
            }
            
            e.preventDefault();
            isDragging = false;
            hasDragged = false;
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = element.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;
            
            document.addEventListener('mousemove', onDrag);
            document.addEventListener('mouseup', stopDrag);
            
            // Set a timeout to distinguish between click and drag
            dragTimeout = setTimeout(() => {
                if (!hasDragged) {
                    isDragging = true;
                    if (isFloatingButton) {
                        element.classList.add('dragging');
                    }
                }
            }, 100);
        }
        
        function startDragTouch(e) {
            if (e.touches.length !== 1) return;
            if (isFloatingButton && e.target !== element && !e.target.classList.contains('debug-floating-btn')) {
                return;
            }
            
            const touch = e.touches[0];
            isDragging = false;
            hasDragged = false;
            startX = touch.clientX;
            startY = touch.clientY;
            
            const rect = element.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;
            
            document.addEventListener('touchmove', onDragTouch, { passive: false });
            document.addEventListener('touchend', stopDragTouch);
            
            dragTimeout = setTimeout(() => {
                if (!hasDragged) {
                    isDragging = true;
                    if (isFloatingButton) {
                        element.classList.add('dragging');
                    }
                }
            }, 150);
        }
        
        function onDrag(e) {
            if (!isDragging) {
                const dx = Math.abs(e.clientX - startX);
                const dy = Math.abs(e.clientY - startY);
                
                // Start dragging only if moved more than 5 pixels
                if (dx > 5 || dy > 5) {
                    isDragging = true;
                    hasDragged = true;
                    clearTimeout(dragTimeout);
                    if (isFloatingButton) {
                        element.classList.add('dragging');
                    }
                } else {
                    return;
                }
            }
            
            e.preventDefault();
            
            // Calculate movement with acceleration for better feel
            const dx = (e.clientX - startX) * 1.5;
            const dy = (e.clientY - startY) * 1.5;
            
            const newLeft = initialLeft + dx;
            const newTop = initialTop + dy;
            
            // Apply movement
            element.style.left = newLeft + 'px';
            element.style.top = newTop + 'px';
            element.style.right = 'auto';
            element.style.bottom = 'auto';
        }
        
        function onDragTouch(e) {
            if (e.touches.length !== 1) return;
            
            if (!isDragging) {
                const touch = e.touches[0];
                const dx = Math.abs(touch.clientX - startX);
                const dy = Math.abs(touch.clientY - startY);
                
                // Start dragging only if moved more than 8 pixels (mobile needs more tolerance)
                if (dx > 8 || dy > 8) {
                    e.preventDefault();
                    isDragging = true;
                    hasDragged = true;
                    clearTimeout(dragTimeout);
                    if (isFloatingButton) {
                        element.classList.add('dragging');
                    }
                } else {
                    return;
                }
            }
            
            e.preventDefault();
            const touch = e.touches[0];
            
            // Calculate movement with acceleration for mobile
            const dx = (touch.clientX - startX) * 1.8; // Increased multiplier for mobile
            const dy = (touch.clientY - startY) * 1.8;
            
            const newLeft = initialLeft + dx;
            const newTop = initialTop + dy;
            
            // Apply movement
            element.style.left = newLeft + 'px';
            element.style.top = newTop + 'px';
            element.style.right = 'auto';
            element.style.bottom = 'auto';
        }
        
        function stopDrag() {
            document.removeEventListener('mousemove', onDrag);
            document.removeEventListener('mouseup', stopDrag);
            clearTimeout(dragTimeout);
            
            if (isFloatingButton) {
                element.classList.remove('dragging');
            }
            
            if (isDragging) {
                // Was a drag operation
                isDragging = false;
                hasDragged = false;
            } else if (!hasDragged) {
                // Was a click operation
                clearTimeout(dragTimeout);
                if (isFloatingButton) {
                    toggleControls();
                }
            }
        }
        
        function stopDragTouch(e) {
            document.removeEventListener('touchmove', onDragTouch);
            document.removeEventListener('touchend', stopDragTouch);
            clearTimeout(dragTimeout);
            
            if (isFloatingButton) {
                element.classList.remove('dragging');
            }
            
            if (isDragging) {
                // Was a drag operation
                isDragging = false;
                hasDragged = false;
            } else if (!hasDragged) {
                // Was a tap operation
                clearTimeout(dragTimeout);
                if (isFloatingButton) {
                    toggleControls();
                }
            }
        }
    }

    // === UI CREATION ===
    function createFloatingButton() {
        floatingButton = document.createElement('button');
        floatingButton.className = 'debug-floating-btn';
        floatingButton.innerHTML = '🔧 Debug';
        floatingButton.title = 'Show/Hide Debug Controls';
        document.body.appendChild(floatingButton);
        
        // Make draggable with special handling for floating button
        makeDraggable(floatingButton, true);
        
        return floatingButton;
    }

    function createControls() {
        controlsContainer = document.createElement('div');
        controlsContainer.className = 'debug-controls hidden';
        controlsContainer.innerHTML = `
            <div class="controls-header">
                <h3>Debug Controls</h3>
                <button class="debug-btn close" id="close-controls">×</button>
            </div>
            <div class="btn-group">
                <div class="btn-row">
                    <button class="debug-btn" id="scan-now">Scan Now</button>
                    <button class="debug-btn" id="toggle-logs">${state.logsVisible ? 'Hide Logs' : 'Show Logs'}</button>
                </div>
                <div class="btn-row">
                    <button class="debug-btn ${state.hideShorts ? 'inactive' : 'active'}" id="toggle-shorts">
                        ${state.hideShorts ? 'Show Shorts' : 'Hide Shorts'}
                    </button>
                    <button class="debug-btn ${state.hidePosts ? 'inactive' : 'active'}" id="toggle-posts">
                        ${state.hidePosts ? 'Show Posts' : 'Hide Posts'}
                    </button>
                </div>
                <div class="btn-row">
                    <button class="debug-btn" id="highlight-elements">Highlight Elements</button>
                    <button class="debug-btn" id="clear-highlights">Clear Highlights</button>
                </div>
            </div>
            <div class="debug-stats">
                <div class="stat-item">
                    <span class="stat-value" id="stat-shorts">0</span>
                    <span class="stat-label">Shorts</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value" id="stat-posts">0</span>
                    <span class="stat-label">Posts</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value" id="stat-total">0</span>
                    <span class="stat-label">Total</span>
                </div>
            </div>
        `;
        document.body.appendChild(controlsContainer);
        
        // Make draggable
        makeDraggable(controlsContainer.querySelector('.controls-header'), false);
        
        // Add event listeners
        controlsContainer.querySelector('#close-controls').addEventListener('click', toggleControls);
        controlsContainer.querySelector('#scan-now').addEventListener('click', scanAndHideElements);
        controlsContainer.querySelector('#toggle-logs').addEventListener('click', toggleLogs);
        controlsContainer.querySelector('#toggle-shorts').addEventListener('click', toggleShorts);
        controlsContainer.querySelector('#toggle-posts').addEventListener('click', togglePosts);
        controlsContainer.querySelector('#highlight-elements').addEventListener('click', highlightElements);
        controlsContainer.querySelector('#clear-highlights').addEventListener('click', clearHighlights);
        
        return controlsContainer;
    }

    function createLogs() {
        logsContainer = document.createElement('div');
        logsContainer.className = 'debug-logs hidden';
        logsContainer.innerHTML = `
            <div class="logs-header">
                <h3>Debug Logs <span class="counter">0</span></h3>
                <button class="debug-btn close" id="close-logs">×</button>
            </div>
            <div class="log-container"></div>
        `;
        document.body.appendChild(logsContainer);
        
        // Make draggable
        makeDraggable(logsContainer.querySelector('.logs-header'), false);
        
        logsContainer.querySelector('#close-logs').addEventListener('click', toggleLogs);
        
        return logsContainer;
    }

    // === UI CONTROL FUNCTIONS ===
    function toggleControls() {
        state.controlsVisible = !state.controlsVisible;
        if (controlsContainer) {
            if (state.controlsVisible) {
                controlsContainer.classList.remove('hidden');
                floatingButton.classList.add('active');
                floatingButton.innerHTML = '🔧 Debug (ON)';
            } else {
                controlsContainer.classList.add('hidden');
                floatingButton.classList.remove('active');
                floatingButton.innerHTML = '🔧 Debug';
            }
        }
    }

    function toggleLogs() {
        state.logsVisible = !state.logsVisible;
        if (logsContainer) {
            if (state.logsVisible) {
                logsContainer.classList.remove('hidden');
                updateLogs();
            } else {
                logsContainer.classList.add('hidden');
            }
        }
        if (controlsContainer) {
            const toggleBtn = controlsContainer.querySelector('#toggle-logs');
            if (toggleBtn) {
                toggleBtn.textContent = state.logsVisible ? 'Hide Logs' : 'Show Logs';
            }
        }
    }

    function toggleShorts() {
        state.hideShorts = !state.hideShorts;
        const toggleBtn = controlsContainer.querySelector('#toggle-shorts');
        if (toggleBtn) {
            toggleBtn.textContent = state.hideShorts ? 'Show Shorts' : 'Hide Shorts';
            toggleBtn.className = state.hideShorts ? 'debug-btn inactive' : 'debug-btn active';
        }
        addLog(`${state.hideShorts ? 'Hiding' : 'Showing'} Shorts`, 'warning');
        scanAndHideElements();
    }

    function togglePosts() {
        state.hidePosts = !state.hidePosts;
        const toggleBtn = controlsContainer.querySelector('#toggle-posts');
        if (toggleBtn) {
            toggleBtn.textContent = state.hidePosts ? 'Show Posts' : 'Hide Posts';
            toggleBtn.className = state.hidePosts ? 'debug-btn inactive' : 'debug-btn active';
        }
        addLog(`${state.hidePosts ? 'Hiding' : 'Showing'} Posts`, 'warning');
        scanAndHideElements();
    }

    // === ELEMENT PROCESSING ===
    function scanAndHideElements() {
        addLog('Scanning page for elements...', 'info');
        
        // Reset counters
        state.elementCount = { shorts: 0, posts: 0, total: 0 };
        
        // Process Shorts
        selectors.shorts.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    elements.forEach(element => {
                        state.elementCount.shorts++;
                        if (state.hideShorts) {
                            element.classList.add('yt-hidden-shorts');
                            element.classList.remove('yt-debug-highlight');
                        } else {
                            element.classList.remove('yt-hidden-shorts');
                        }
                    });
                }
            } catch (e) {
                // Ignore invalid selectors
            }
        });
        
        // Process Posts
        selectors.posts.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    elements.forEach(element => {
                        state.elementCount.posts++;
                        if (state.hidePosts) {
                            element.classList.add('yt-hidden-posts');
                            element.classList.remove('yt-debug-highlight');
                        } else {
                            element.classList.remove('yt-hidden-posts');
                        }
                    });
                }
            } catch (e) {
                // Ignore invalid selectors
            }
        });
        
        state.elementCount.total = state.elementCount.shorts + state.elementCount.posts;
        
        // Update UI
        updateCounter();
        
        addLog(`Found: ${state.elementCount.shorts} Shorts, ${state.elementCount.posts} Posts`, 'success');
        addLog(`${state.hideShorts ? 'Hidden' : 'Visible'}: Shorts, ${state.hidePosts ? 'Hidden' : 'Visible'}: Posts`, 'info');
    }

    function highlightElements() {
        addLog('Highlighting all hidden elements...', 'warning');
        
        // Highlight hidden Shorts
        if (state.hideShorts) {
            selectors.shorts.forEach(selector => {
                try {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(element => {
                        element.classList.add('yt-debug-highlight');
                    });
                } catch (e) {
                    // Ignore invalid selectors
                }
            });
        }
        
        // Highlight hidden Posts
        if (state.hidePosts) {
            selectors.posts.forEach(selector => {
                try {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(element => {
                        element.classList.add('yt-debug-highlight');
                    });
                } catch (e) {
                    // Ignore invalid selectors
                }
            });
        }
        
        addLog('Elements highlighted in red', 'success');
    }

    function clearHighlights() {
        const highlighted = document.querySelectorAll('.yt-debug-highlight');
        highlighted.forEach(element => {
            element.classList.remove('yt-debug-highlight');
        });
        addLog(`Cleared highlights from ${highlighted.length} elements`, 'info');
    }

    // === OBSERVER AND INITIALIZATION ===
    function setupObserver() {
        const observer = new MutationObserver((mutations) => {
            let newContent = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    newContent = true;
                }
            });
            
            if (newContent) {
                setTimeout(scanAndHideElements, 1000);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        addLog('MutationObserver activated', 'success');
        return observer;
    }

    function init() {
        // Inject styles
        injectStyles();
        
        // Create UI elements
        setTimeout(() => {
            createFloatingButton();
            createControls();
            createLogs();
            
            // Initial scan
            setTimeout(() => {
                addLog('YouTube Content Hider initialized', 'success');
                addLog(`Platform: ${state.isMobile ? 'Mobile' : 'Desktop'}`, 'info');
                addLog(`Default: ${config.hideShortsByDefault ? 'Hide Shorts' : 'Show Shorts'}, ${config.hidePostsByDefault ? 'Hide Posts' : 'Show Posts'}`, 'info');
                
                scanAndHideElements();
                setupObserver();
                
                // Auto-hide after delay
                setTimeout(() => {
                    if (config.hideShortsByDefault) {
                        addLog('Shorts hidden by default', 'info');
                    }
                    if (config.hidePostsByDefault) {
                        addLog('Posts hidden by default', 'info');
                    }
                }, config.autoHideDelay);
                
            }, 2000);
            
        }, 1000);
        
        // Periodic scan
        setInterval(scanAndHideElements, config.scanInterval);
        
        // Detect page changes (SPA)
        let lastUrl = location.href;
        setInterval(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                addLog(`Page changed: ${location.pathname}`, 'info');
                setTimeout(scanAndHideElements, 2000);
            }
        }, 1000);
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
