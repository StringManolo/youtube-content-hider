// ==UserScript==
// @name         YouTube Content Hider & Debugger
// @namespace    http://tampermonkey.net/
// @version      4.7
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
        scanInterval: 5000,
        autoScrollLogs: false
    };

    // === STATE MANAGEMENT ===
    const state = {
        hideShorts: config.hideShortsByDefault,
        hidePosts: config.hidePostsByDefault,
        controlsVisible: false,
        logsVisible: false,
        isMobile: window.location.hostname === 'm.youtube.com',
        elementCount: { shorts: 0, posts: 0, total: 0 },
        isHighlighting: false,
        userScrolledLogs: false
    };

    // === SELECTORS === (expanded to catch more elements)
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
            // Additional selectors for better coverage
            '[aria-label="Shorts"]',
            'ytd-rich-shelf-renderer:has(ytd-rich-shelf-renderer[is-shorts])',
            'ytd-item-section-renderer:has(a[href*="/shorts/"])',
            'ytd-grid-renderer:has(a[href*="/shorts/"])',
            'ytm-reel-shelf-renderer',
            'ytm-item-section-renderer:has(a[href*="/shorts/"])',
            // Mobile specific
            'ytm-rich-section-renderer:has(a[href*="/shorts/"])',
            // Catch-all for shorts sections
            'ytd-section-list-renderer:has(ytd-reel-shelf-renderer)',
            'ytd-section-list-renderer:has(ytd-rich-shelf-renderer[is-shorts])'
        ],
        posts: [
            'ytd-backstage-post-renderer',
            'ytd-post-renderer',
            'ytd-rich-item-renderer:has(ytd-backstage-post-renderer)',
            'ytm-backstage-post-renderer',
            'ytm-post-renderer',
            // Additional selectors
            'ytd-item-section-renderer:has(ytd-backstage-post-renderer)',
            'ytd-comments-header-renderer:has(ytd-backstage-post-renderer)',
            // Community posts
            'ytd-engagement-panel-section-list-renderer:has(ytd-backstage-post-renderer)'
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
                box-shadow: 0 8px 20px rgba(0,0,0,0.5);
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
                font-weight: bold;
            }
            
            .debug-btn.inactive {
                background: #ff4444;
                font-weight: bold;
            }
            
            .debug-btn.highlight {
                background: #ff4444;
            }
            
            .debug-btn.highlight.active {
                background: #ff8800;
                color: white;
                font-weight: bold;
            }
            
            .debug-btn.highlight:hover {
                background: #ff6666;
            }
            
            .debug-btn.toggle {
                background: #ffaa00;
            }
            
            .debug-btn.toggle.active {
                background: #ffcc44;
                color: #000;
                font-weight: bold;
            }
            
            .debug-btn.toggle:hover {
                background: #ffcc44;
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
            
            /* Hidden elements with 3 dots */
            .ytd-menu-renderer.ytd-reel-shelf-renderer {
                display: none !important;
            }
            
            /* Debug highlight style - VERY VISIBLE */
            .yt-debug-highlight {
                background-color: rgba(255, 0, 0, 0.5) !important;
                border: 4px solid #ff0000 !important;
                box-shadow: 0 0 0 6px rgba(255, 0, 0, 0.8) !important;
                position: relative !important;
                z-index: 9999 !important;
                outline: 3px dashed #ff0000 !important;
                outline-offset: 3px !important;
                animation: pulse-highlight 1s infinite !important;
            }
            
            @keyframes pulse-highlight {
                0% { box-shadow: 0 0 0 6px rgba(255, 0, 0, 0.8); }
                50% { box-shadow: 0 0 0 10px rgba(255, 0, 0, 0.4); }
                100% { box-shadow: 0 0 0 6px rgba(255, 0, 0, 0.8); }
            }
            
            .yt-debug-highlight::before {
                content: "DEBUG HIGHLIGHT";
                position: absolute;
                top: -30px;
                left: 0;
                background: #ff0000;
                color: white;
                padding: 4px 10px;
                font-size: 12px;
                font-weight: bold;
                z-index: 10000;
                white-space: nowrap;
                border-radius: 4px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            }
            
            /* Special style for remaining 3 dots */
            .yt-debug-highlight-dots {
                background-color: rgba(255, 100, 100, 0.7) !important;
                border: 3px solid #ff5555 !important;
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
    let logContainerElement = null;

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
        
        if (!logContainerElement) {
            logContainerElement = logsContainer.querySelector('.log-container');
            if (logContainerElement) {
                logContainerElement.addEventListener('scroll', () => {
                    const isAtBottom = logContainerElement.scrollHeight - 
                                      logContainerElement.scrollTop <= 
                                      logContainerElement.clientHeight + 10;
                    state.userScrolledLogs = !isAtBottom;
                });
            }
        }
        
        if (logContainerElement) {
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
            logContainerElement.innerHTML = html;
            
            if (config.autoScrollLogs && !state.userScrolledLogs) {
                logContainerElement.scrollTop = logContainerElement.scrollHeight;
            }
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
            
            // Update highlight button with proper class
            const highlightBtn = controlsContainer.querySelector('#highlight-elements');
            if (highlightBtn) {
                highlightBtn.textContent = state.isHighlighting ? 'Hide Highlights' : 'Show Highlights';
                highlightBtn.className = state.isHighlighting ? 'debug-btn highlight active' : 'debug-btn highlight';
            }
            
            // Update logs button with proper class
            const logsBtn = controlsContainer.querySelector('#toggle-logs');
            if (logsBtn) {
                logsBtn.textContent = state.logsVisible ? 'Hide Logs' : 'Show Logs';
                logsBtn.className = state.logsVisible ? 'debug-btn toggle active' : 'debug-btn toggle';
            }
            
            // Update shorts button
            const shortsBtn = controlsContainer.querySelector('#toggle-shorts');
            if (shortsBtn) {
                shortsBtn.textContent = state.hideShorts ? 'Show Shorts' : 'Hide Shorts';
                shortsBtn.className = state.hideShorts ? 'debug-btn inactive' : 'debug-btn active';
            }
            
            // Update posts button
            const postsBtn = controlsContainer.querySelector('#toggle-posts');
            if (postsBtn) {
                postsBtn.textContent = state.hidePosts ? 'Show Posts' : 'Hide Posts';
                postsBtn.className = state.hidePosts ? 'debug-btn inactive' : 'debug-btn active';
            }
        }
    }

    // === DRAG AND DROP SYSTEM ===
    function makeDraggable(element, isFloatingButton = false) {
        let isDragging = false;
        let hasDragged = false;
        let startX, startY, initialLeft, initialTop;
        let dragTimeout;
        
        const MOVE_THRESHOLD = state.isMobile ? 15 : 10;
        const MOVE_MULTIPLIER = 1.3;
        
        element.addEventListener('mousedown', startDrag);
        element.addEventListener('touchstart', startDragTouch, { passive: false });
        
        function startDrag(e) {
            if (isFloatingButton) {
                e.preventDefault();
            }
            
            isDragging = false;
            hasDragged = false;
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = element.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;
            
            document.addEventListener('mousemove', onDrag);
            document.addEventListener('mouseup', stopDrag);
            
            dragTimeout = setTimeout(() => {
                if (!hasDragged) {
                    isDragging = true;
                    if (isFloatingButton) {
                        element.classList.add('dragging');
                    }
                }
            }, 300);
        }
        
        function startDragTouch(e) {
            if (e.touches.length !== 1) return;
            e.preventDefault();
            
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
            document.addEventListener('touchcancel', stopDragTouch);
            
            dragTimeout = setTimeout(() => {
                if (!hasDragged) {
                    isDragging = true;
                    if (isFloatingButton) {
                        element.classList.add('dragging');
                    }
                }
            }, 300);
        }
        
        function onDrag(e) {
            if (!isDragging && !hasDragged) {
                const dx = Math.abs(e.clientX - startX);
                const dy = Math.abs(e.clientY - startY);
                
                if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
                    isDragging = true;
                    hasDragged = true;
                    clearTimeout(dragTimeout);
                    if (isFloatingButton) {
                        element.classList.add('dragging');
                    }
                }
            }
            
            if (!isDragging) return;
            
            e.preventDefault();
            
            const dx = (e.clientX - startX) * MOVE_MULTIPLIER;
            const dy = (e.clientY - startY) * MOVE_MULTIPLIER;
            
            let newLeft = initialLeft + dx;
            let newTop = initialTop + dy;
            
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const elementWidth = element.offsetWidth;
            const elementHeight = element.offsetHeight;
            
            newLeft = Math.max(0, Math.min(newLeft, viewportWidth - elementWidth));
            newTop = Math.max(0, Math.min(newTop, viewportHeight - elementHeight));
            
            element.style.left = newLeft + 'px';
            element.style.top = newTop + 'px';
            element.style.right = 'auto';
            element.style.bottom = 'auto';
        }
        
        function onDragTouch(e) {
            if (e.touches.length !== 1) return;
            
            if (!isDragging && !hasDragged) {
                const touch = e.touches[0];
                const dx = Math.abs(touch.clientX - startX);
                const dy = Math.abs(touch.clientY - startY);
                
                if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
                    e.preventDefault();
                    isDragging = true;
                    hasDragged = true;
                    clearTimeout(dragTimeout);
                    if (isFloatingButton) {
                        element.classList.add('dragging');
                    }
                }
            }
            
            if (!isDragging) return;
            
            e.preventDefault();
            const touch = e.touches[0];
            
            const dx = (touch.clientX - startX) * MOVE_MULTIPLIER;
            const dy = (touch.clientY - startY) * MOVE_MULTIPLIER;
            
            let newLeft = initialLeft + dx;
            let newTop = initialTop + dy;
            
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const elementWidth = element.offsetWidth;
            const elementHeight = element.offsetHeight;
            
            newLeft = Math.max(0, Math.min(newLeft, viewportWidth - elementWidth));
            newTop = Math.max(0, Math.min(newTop, viewportHeight - elementHeight));
            
            element.style.left = newLeft + 'px';
            element.style.top = newTop + 'px';
            element.style.right = 'auto';
            element.style.bottom = 'auto';
        }
        
        function stopDrag(e) {
            document.removeEventListener('mousemove', onDrag);
            document.removeEventListener('mouseup', stopDrag);
            clearTimeout(dragTimeout);
            
            if (isFloatingButton) {
                element.classList.remove('dragging');
            }
            
            if (!hasDragged && !isDragging) {
                setTimeout(() => {
                    if (!isDragging && !hasDragged) {
                        if (isFloatingButton) {
                            toggleControls();
                        }
                    }
                }, 50);
            }
            
            isDragging = false;
            hasDragged = false;
        }
        
        function stopDragTouch(e) {
            document.removeEventListener('touchmove', onDragTouch);
            document.removeEventListener('touchend', stopDragTouch);
            document.removeEventListener('touchcancel', stopDragTouch);
            clearTimeout(dragTimeout);
            
            if (isFloatingButton) {
                element.classList.remove('dragging');
            }
            
            if (!hasDragged && !isDragging) {
                setTimeout(() => {
                    if (!isDragging && !hasDragged) {
                        if (isFloatingButton) {
                            toggleControls();
                        }
                    }
                }, 50);
            }
            
            isDragging = false;
            hasDragged = false;
        }
        
        if (isFloatingButton) {
            element.addEventListener('click', function(e) {
                if (!hasDragged && !isDragging) {
                    e.stopPropagation();
                    toggleControls();
                }
            }, true);
        }
    }

    // === UI CREATION ===
    function createFloatingButton() {
        floatingButton = document.createElement('button');
        floatingButton.className = 'debug-floating-btn';
        floatingButton.innerHTML = '🔧 Debug';
        floatingButton.title = 'Show/Hide Debug Controls';
        document.body.appendChild(floatingButton);
        
        makeDraggable(floatingButton, true);
        
        return floatingButton;
    }

    function createControls() {
        controlsContainer = document.createElement('div');
        controlsContainer.className = 'debug-controls hidden';
        controlsContainer.innerHTML = `
            <div class="controls-header">
                <h3>Debug Controls</h3>
            </div>
            <div class="btn-group">
                <div class="btn-row">
                    <button class="debug-btn ${state.hideShorts ? 'inactive' : 'active'}" id="toggle-shorts">
                        ${state.hideShorts ? 'Show Shorts' : 'Hide Shorts'}
                    </button>
                    <button class="debug-btn ${state.hidePosts ? 'inactive' : 'active'}" id="toggle-posts">
                        ${state.hidePosts ? 'Show Posts' : 'Hide Posts'}
                    </button>
                </div>
                <div class="btn-row">
                    <button class="debug-btn highlight" id="highlight-elements">Show Highlights</button>
                    <button class="debug-btn toggle" id="toggle-logs">${state.logsVisible ? 'Hide Logs' : 'Show Logs'}</button>
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
        
        makeDraggable(controlsContainer.querySelector('.controls-header'), false);
        
        // Add event listeners
        controlsContainer.querySelector('#toggle-shorts').addEventListener('click', toggleShorts);
        controlsContainer.querySelector('#toggle-posts').addEventListener('click', togglePosts);
        controlsContainer.querySelector('#highlight-elements').addEventListener('click', toggleHighlightElements);
        controlsContainer.querySelector('#toggle-logs').addEventListener('click', toggleLogs);
        
        return controlsContainer;
    }

    function createLogs() {
        logsContainer = document.createElement('div');
        logsContainer.className = 'debug-logs hidden';
        logsContainer.innerHTML = `
            <div class="logs-header">
                <h3>Debug Logs <span class="counter">0</span></h3>
            </div>
            <div class="log-container"></div>
        `;
        document.body.appendChild(logsContainer);
        
        makeDraggable(logsContainer.querySelector('.logs-header'), false);
        
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
                // Force update counters when controls are shown
                updateCounter();
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
                state.userScrolledLogs = false;
                updateLogs();
            } else {
                logsContainer.classList.add('hidden');
            }
        }
        updateCounter(); // Update button colors
    }

    function toggleShorts() {
        state.hideShorts = !state.hideShorts;
        addLog(`${state.hideShorts ? 'Hiding' : 'Showing'} Shorts`, 'warning');
        processElements(true); // Force immediate processing
    }

    function togglePosts() {
        state.hidePosts = !state.hidePosts;
        addLog(`${state.hidePosts ? 'Hiding' : 'Showing'} Posts`, 'warning');
        processElements(true); // Force immediate processing
    }

    // === HIGHLIGHT SYSTEM - FIXED ===
    function toggleHighlightElements() {
        if (state.isHighlighting) {
            removeAllHighlights();
            state.isHighlighting = false;
            addLog('Highlights removed', 'info');
        } else {
            highlightAllElements();
            state.isHighlighting = true;
            addLog('Highlights enabled - showing elements', 'warning');
        }
        updateCounter();
    }

    function highlightAllElements() {
        // Clear any existing highlights first
        const existingHighlights = document.querySelectorAll('.yt-debug-highlight');
        existingHighlights.forEach(el => el.classList.remove('yt-debug-highlight'));
        
        let totalHighlights = 0;
        
        // Highlight Shorts elements using selectors
        selectors.shorts.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    if (element && element.offsetParent !== null) {
                        element.classList.add('yt-debug-highlight');
                        totalHighlights++;
                    }
                });
            } catch (e) {
                // Ignore invalid selectors
            }
        });
        
        // Highlight Posts elements using selectors
        selectors.posts.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    if (element && element.offsetParent !== null) {
                        element.classList.add('yt-debug-highlight');
                        totalHighlights++;
                    }
                });
            } catch (e) {
                // Ignore invalid selectors
            }
        });
        
        // Also highlight hidden elements that might not match current selectors
        const hiddenShorts = document.querySelectorAll('.yt-hidden-shorts');
        const hiddenPosts = document.querySelectorAll('.yt-hidden-posts');
        
        hiddenShorts.forEach(el => {
            if (el && el.offsetParent !== null && !el.classList.contains('yt-debug-highlight')) {
                el.classList.add('yt-debug-highlight');
                totalHighlights++;
            }
        });
        
        hiddenPosts.forEach(el => {
            if (el && el.offsetParent !== null && !el.classList.contains('yt-debug-highlight')) {
                el.classList.add('yt-debug-highlight');
                totalHighlights++;
            }
        });
        
        // Special handling for remaining 3 dots menu
        const remainingMenus = document.querySelectorAll('ytd-menu-renderer.ytd-reel-shelf-renderer, ytd-menu-renderer[class*="shorts"]');
        remainingMenus.forEach(el => {
            if (el && el.offsetParent !== null) {
                el.classList.add('yt-debug-highlight');
                el.classList.add('yt-debug-highlight-dots');
                totalHighlights++;
            }
        });
        
        addLog(`Highlighted ${totalHighlights} elements`, 'success');
    }

    function removeAllHighlights() {
        const highlighted = document.querySelectorAll('.yt-debug-highlight');
        highlighted.forEach(element => {
            element.classList.remove('yt-debug-highlight');
            element.classList.remove('yt-debug-highlight-dots');
        });
    }

    // === ELEMENT PROCESSING ===
    function processElements(forceLog = false) {
        let foundShorts = 0;
        let foundPosts = 0;
        
        // Process Shorts
        selectors.shorts.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    elements.forEach(element => {
                        if (element && element.offsetParent !== null) {
                            foundShorts++;
                            if (state.hideShorts) {
                                element.classList.add('yt-hidden-shorts');
                                // Hide the 3 dots menu as well
                                const menu = element.querySelector('ytd-menu-renderer');
                                if (menu) menu.style.display = 'none';
                            } else {
                                element.classList.remove('yt-hidden-shorts');
                                // Restore the 3 dots menu
                                const menu = element.querySelector('ytd-menu-renderer');
                                if (menu) menu.style.display = '';
                            }
                            // Update highlight if highlighting is active
                            if (state.isHighlighting) {
                                element.classList.add('yt-debug-highlight');
                            } else {
                                element.classList.remove('yt-debug-highlight');
                            }
                        }
                    });
                }
            } catch (e) {
                // Ignore invalid selectors
            }
        });
        
        // Special handling for remaining Shorts elements (like shelf headers)
        if (state.hideShorts) {
            const shortsHeaders = document.querySelectorAll('h2, h3, yt-formatted-string');
            shortsHeaders.forEach(header => {
                const text = (header.textContent || '').toLowerCase();
                if (text.includes('shorts')) {
                    const parent = header.closest('ytd-rich-shelf-renderer, ytd-reel-shelf-renderer, ytd-item-section-renderer');
                    if (parent) {
                        foundShorts++;
                        parent.classList.add('yt-hidden-shorts');
                        if (state.isHighlighting) {
                            parent.classList.add('yt-debug-highlight');
                        }
                    }
                }
            });
        }
        
        // Process Posts
        selectors.posts.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    elements.forEach(element => {
                        if (element && element.offsetParent !== null) {
                            foundPosts++;
                            if (state.hidePosts) {
                                element.classList.add('yt-hidden-posts');
                            } else {
                                element.classList.remove('yt-hidden-posts');
                            }
                            // Update highlight if highlighting is active
                            if (state.isHighlighting) {
                                element.classList.add('yt-debug-highlight');
                            } else {
                                element.classList.remove('yt-debug-highlight');
                            }
                        }
                    });
                }
            } catch (e) {
                // Ignore invalid selectors
            }
        });
        
        // Also process elements that are already hidden but need to be shown
        if (!state.hideShorts) {
            const hiddenShorts = document.querySelectorAll('.yt-hidden-shorts');
            hiddenShorts.forEach(el => {
                el.classList.remove('yt-hidden-shorts');
                if (!state.isHighlighting) {
                    el.classList.remove('yt-debug-highlight');
                }
            });
        }
        
        if (!state.hidePosts) {
            const hiddenPosts = document.querySelectorAll('.yt-hidden-posts');
            hiddenPosts.forEach(el => {
                el.classList.remove('yt-hidden-posts');
                if (!state.isHighlighting) {
                    el.classList.remove('yt-debug-highlight');
                }
            });
        }
        
        // Update counters
        state.elementCount.shorts = foundShorts;
        state.elementCount.posts = foundPosts;
        state.elementCount.total = foundShorts + foundPosts;
        
        // Update UI
        updateCounter();
        
        // Only log if forced or it's the first few scans
        if (forceLog || debugLog.length < 3 || Math.random() < 0.1) {
            addLog(`Found: ${foundShorts} Shorts, ${foundPosts} Posts`, 'success');
        }
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
                setTimeout(() => processElements(), 1000);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        addLog('Auto-scan enabled', 'success');
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
            
            // Initial setup
            setTimeout(() => {
                addLog('YouTube Content Hider v4.7 initialized', 'success');
                addLog(`Platform: ${state.isMobile ? 'Mobile' : 'Desktop'}`, 'info');
                addLog(`Default: Shorts ${config.hideShortsByDefault ? 'hidden' : 'visible'}, Posts ${config.hidePostsByDefault ? 'hidden' : 'visible'}`, 'info');
                addLog('Debug button: bottom-left corner', 'info');
                
                // Initial scan
                processElements(true);
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
        setInterval(() => processElements(), config.scanInterval);
        
        // Detect page changes
        let lastUrl = location.href;
        setInterval(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                addLog(`Navigated to: ${location.pathname}`, 'info');
                setTimeout(() => processElements(true), 2000);
            }
        }, 1000);
        
        // Handle window resize
        window.addEventListener('resize', function() {
            if (floatingButton) {
                const rect = floatingButton.getBoundingClientRect();
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                
                if (rect.right > viewportWidth || rect.bottom > viewportHeight) {
                    floatingButton.style.left = Math.max(0, Math.min(rect.left, viewportWidth - rect.width)) + 'px';
                    floatingButton.style.top = Math.max(0, Math.min(rect.top, viewportHeight - rect.height)) + 'px';
                }
            }
        });
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
