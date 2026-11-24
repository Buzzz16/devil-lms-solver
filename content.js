// ========================================================
// LMS AUTO SOLVER - CONTENT SCRIPT & IN-PAGE ANIMATION ENGINE
// Telkom University Moodle REMUI Compatible
// ========================================================

// ========================================================
// 1. TIMER & OPERATION ABORT CONTROLLER
// ========================================================
window.__activeOperationTimers = window.__activeOperationTimers || [];
window.__currentActiveNextBtn = window.__currentActiveNextBtn || null;

function registerTimer(fn, delay) {
    let id = setTimeout(() => {
        window.__activeOperationTimers = window.__activeOperationTimers.filter(t => t !== id);
        fn();
    }, delay);
    window.__activeOperationTimers.push(id);
    return id;
}

function clearAllOperationTimers() {
    window.__activeOperationTimers.forEach(id => clearTimeout(id));
    window.__activeOperationTimers = [];
}

// Helper: Deteksi tombol Next page (kompatibel Moodle EN & ID, hindari Finish/Selesai)
function findNextPageButton() {
    let candidates = Array.from(document.querySelectorAll('input[name="next"], button[name="next"], .mod_quiz-next-nav'));
    for (let btn of candidates) {
        let label = ((btn.value || '') + ' ' + (btn.innerText || '')).trim().toLowerCase();
        if (label.includes('finish') || label.includes('selesai') || label.includes('kirim') || label.includes('submit')) {
            continue;
        }
        return btn;
    }
    return null;
}

// Master Abort / Batalkan Operasi Function
function abortCurrentOperation() {
    // 1. Hentikan semua timer aktif (soal & next page)
    clearAllOperationTimers();

    // 2. Bersihkan flags di storage agar tidak lanjut setelah reload/pindah halaman
    chrome.storage.local.set({ isAutoScraping: false, isAutoFilling: false });
    chrome.storage.local.remove(['savedAnswers', 'isAutoScraping', 'isAutoFilling', 'scrapedQuestions', 'scrapedQuestionsData', 'consumedEntryIndexes', 'injectAuditLog']);

    // 3. Bersihkan efek visual pada tombol Next jika sedang countdown
    if (window.__currentActiveNextBtn) {
        window.__currentActiveNextBtn.classList.remove('lms-solver-btn-next-active', 'lms-solver-btn-pressed');
        window.__currentActiveNextBtn = null;
    }
    document.querySelectorAll('.lms-solver-btn-next-active, .lms-solver-btn-pressed').forEach(btn => {
        btn.classList.remove('lms-solver-btn-next-active', 'lms-solver-btn-pressed');
    });
    document.querySelectorAll('.lms-solver-next-countdown').forEach(el => el.remove());

    // 4. Update HUD di halaman LMS bahwa proses dibatalkan
    showLmsHud("OPERASI DIBATALKAN", "Proses telah dihentikan oleh pengguna.", 0, "BATAL");
    removeLmsHud(3500);

    return { success: true, message: "Operasi berhasil dibatalkan" };
}


// ========================================================
// 2. IN-PAGE NEO-BRUTALIST STYLES & VISUAL FX
// ========================================================
function ensureInjectedStyles() {
    if (document.getElementById('lms-solver-injected-styles')) return;

    const style = document.createElement('style');
    style.id = 'lms-solver-injected-styles';
    style.textContent = `
        /* --- IN-PAGE LMS AUTO-SOLVER ANIMATIONS --- */
        @keyframes lmsSolverPulse {
            0%, 100% { transform: scale(1); box-shadow: 4px 4px 0px #000; }
            50% { transform: scale(1.02); box-shadow: 6px 6px 0px #000; }
        }

        @keyframes lmsSolverRipple {
            0% { transform: scale(0.2); opacity: 0.9; }
            100% { transform: scale(3.5); opacity: 0; }
        }

        @keyframes lmsSolverBadgePop {
            0% { transform: scale(0.4) translateY(8px); opacity: 0; }
            70% { transform: scale(1.15) translateY(-2px); opacity: 1; }
            100% { transform: scale(1) translateY(0); opacity: 1; }
        }

        @keyframes lmsSolverScanner {
            0% { border-color: #000; box-shadow: 2px 2px 0px #000; }
            50% { border-color: #22C55E; box-shadow: 0 0 16px rgba(34, 197, 94, 0.6), 4px 4px 0px #000; }
            100% { border-color: #000; box-shadow: 2px 2px 0px #000; }
        }

        @keyframes lmsSolverCountdownPulse {
            0%, 100% { transform: translateX(-50%) scale(1); }
            50% { transform: translateX(-50%) scale(1.08); }
        }

        /* Highlighted Option when Auto-Selected */
        .lms-solver-highlight-selected {
            background-color: #DCFCE7 !important; /* Soft Lime/Emerald */
            border: 2.5px solid #000000 !important;
            border-radius: 8px !important;
            box-shadow: 4px 4px 0px #000000 !important;
            transform: translate(-2px, -2px) scale(1.01) !important;
            transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
            position: relative !important;
            z-index: 5 !important;
        }

        /* Auto-Filled Badge Tag */
        .lms-solver-auto-badge {
            display: inline-flex !important;
            align-items: center !important;
            gap: 4px !important;
            background: #22C55E !important;
            color: #000000 !important;
            font-size: 10px !important;
            font-weight: 900 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            padding: 3px 8px !important;
            border: 1.5px solid #000000 !important;
            border-radius: 6px !important;
            box-shadow: 2px 2px 0px #000000 !important;
            margin-left: 8px !important;
            animation: lmsSolverBadgePop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards !important;
            vertical-align: middle !important;
            z-index: 10 !important;
        }

        /* Review Needed (Score < 75%) Option Highlight */
        .lms-solver-highlight-review {
            background-color: #FEF3C7 !important; /* Soft Amber */
            border: 2.5px solid #000000 !important;
            border-radius: 8px !important;
            box-shadow: 4px 4px 0px #000000 !important;
            transform: translate(-2px, -2px) scale(1.01) !important;
            transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
            position: relative !important;
            z-index: 5 !important;
        }

        /* Review Badge Tag */
        .lms-solver-review-badge {
            display: inline-flex !important;
            align-items: center !important;
            gap: 4px !important;
            background: #FFDE59 !important;
            color: #000000 !important;
            font-size: 10px !important;
            font-weight: 900 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            padding: 3px 8px !important;
            border: 1.5px solid #000000 !important;
            border-radius: 6px !important;
            box-shadow: 2px 2px 0px #000000 !important;
            margin-left: 8px !important;
            animation: lmsSolverBadgePop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards !important;
            vertical-align: middle !important;
            z-index: 10 !important;
        }

        /* Click Ripple Shockwave on LMS Page */
        .lms-solver-click-ripple {
            position: absolute !important;
            width: 32px !important;
            height: 32px !important;
            border-radius: 50% !important;
            background: rgba(34, 197, 94, 0.45) !important;
            border: 2px solid #000000 !important;
            pointer-events: none !important;
            z-index: 999999 !important;
            transform-origin: center center !important;
            animation: lmsSolverRipple 0.5s ease-out forwards !important;
        }

        /* Next Button Highlight */
        .lms-solver-btn-next-active {
            background-color: #FFDE59 !important;
            color: #000000 !important;
            border: 3px solid #000000 !important;
            border-radius: 10px !important;
            box-shadow: 6px 6px 0px #000000, 0 0 20px rgba(255, 222, 89, 0.85) !important;
            transform: translate(-3px, -3px) scale(1.05) !important;
            transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
            cursor: pointer !important;
            position: relative !important;
            font-weight: 900 !important;
            outline: none !important;
        }

        .lms-solver-btn-pressed {
            transform: translate(3px, 3px) scale(0.96) !important;
            box-shadow: 1px 1px 0px #000000 !important;
            transition: all 0.08s ease !important;
        }

        /* Next Button Floating Tag Countdown */
        .lms-solver-next-countdown {
            position: absolute !important;
            bottom: calc(100% + 10px) !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            background: #000000 !important;
            color: #FFDE59 !important;
            font-size: 11px !important;
            font-weight: 900 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            padding: 5px 12px !important;
            border: 2px solid #FFDE59 !important;
            border-radius: 20px !important;
            box-shadow: 3px 3px 0px rgba(0,0,0,0.4) !important;
            white-space: nowrap !important;
            pointer-events: none !important;
            animation: lmsSolverBadgePop 0.25s ease-out forwards, lmsSolverCountdownPulse 1s infinite alternate !important;
            z-index: 999999 !important;
        }

        /* Floating HUD Widget on LMS Webpage */
        #lms-solver-hud {
            position: fixed !important;
            top: 20px !important;
            right: 20px !important;
            width: 310px !important;
            background: #FAF7F2 !important;
            border: 2.5px solid #000000 !important;
            border-radius: 14px !important;
            box-shadow: 5px 5px 0px #000000 !important;
            padding: 12px 14px !important;
            z-index: 9999999 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            color: #111111 !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 6px !important;
            animation: lmsSolverBadgePop 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards !important;
            pointer-events: auto !important;
            user-select: none !important;
        }

        #lms-solver-hud .hud-header {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            font-size: 11px !important;
            font-weight: 900 !important;
            border-bottom: 2px solid #000000 !important;
            padding-bottom: 6px !important;
            letter-spacing: -0.2px !important;
        }

        #lms-solver-hud .hud-actions {
            display: flex !important;
            align-items: center !important;
            gap: 5px !important;
        }

        #lms-solver-hud .hud-badge {
            background: #FFDE59 !important;
            color: #000000 !important;
            border: 1.5px solid #000000 !important;
            padding: 2px 7px !important;
            border-radius: 6px !important;
            font-size: 9.5px !important;
            font-weight: 900 !important;
            box-shadow: 1px 1px 0px #000 !important;
        }

        #lms-solver-hud .hud-badge.batal {
            background: #FF4757 !important;
            color: #FFFFFF !important;
        }

        #lms-solver-hud .hud-cancel-btn {
            background: #FF4757 !important;
            color: #FFFFFF !important;
            border: 1.5px solid #000000 !important;
            border-radius: 6px !important;
            font-size: 9px !important;
            font-weight: 900 !important;
            padding: 2px 7px !important;
            cursor: pointer !important;
            box-shadow: 1.5px 1.5px 0px #000000 !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 4px !important;
            transition: all 0.1s ease !important;
        }

        #lms-solver-hud .hud-cancel-btn:hover {
            transform: translate(-1px, -1px) !important;
            box-shadow: 2.5px 2.5px 0px #000 !important;
        }

        #lms-solver-hud .hud-cancel-btn:active {
            transform: translate(1px, 1px) !important;
            box-shadow: 0px 0px 0px #000 !important;
        }

        #lms-solver-hud .hud-message {
            font-size: 11.5px !important;
            font-weight: 700 !important;
            line-height: 1.4 !important;
            color: #111827 !important;
        }

        #lms-solver-hud .hud-progress-bar {
            width: 100% !important;
            height: 7px !important;
            background: #E5E7EB !important;
            border: 1.5px solid #000000 !important;
            border-radius: 4px !important;
            overflow: hidden !important;
            margin-top: 2px !important;
        }

        #lms-solver-hud .hud-progress-fill {
            height: 100% !important;
            background: #22C55E !important;
            width: 0% !important;
            transition: width 0.3s ease !important;
        }

        /* --- IN-PAGE OVERLAY MODAL & POPUP STYLES (v2.8) --- */
        #lms-solver-modal-overlay {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: rgba(17, 24, 39, 0.65) !important;
            backdrop-filter: blur(4px) !important;
            z-index: 99999999 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 16px !important;
            box-sizing: border-box !important;
            animation: lmsSolverFadeIn 0.2s ease-out forwards !important;
        }

        @keyframes lmsSolverFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes lmsSolverModalPop {
            0% { transform: scale(0.88) translateY(12px); opacity: 0; }
            70% { transform: scale(1.02) translateY(-2px); opacity: 1; }
            100% { transform: scale(1) translateY(0); opacity: 1; }
        }

        .lms-neo-modal {
            background: #FAF7F2 !important;
            border: 2.5px solid #000000 !important;
            border-radius: 16px !important;
            box-shadow: 6px 6px 0px #000000 !important;
            width: 100% !important;
            max-width: 520px !important;
            max-height: 88vh !important;
            display: flex !important;
            flex-direction: column !important;
            box-sizing: border-box !important;
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            color: #111827 !important;
            overflow: hidden !important;
            animation: lmsSolverModalPop 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards !important;
            position: relative !important;
        }

        .lms-modal-header {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            padding: 12px 16px !important;
            border-bottom: 2.5px solid #000000 !important;
            background: #FFFFFF !important;
        }

        .lms-modal-title {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            font-size: 13.5px !important;
            font-weight: 900 !important;
            letter-spacing: -0.3px !important;
            color: #111827 !important;
        }

        .lms-modal-header-right {
            display: flex !important;
            align-items: center !important;
            gap: 6px !important;
        }

        .lms-modal-badge {
            padding: 2px 8px !important;
            border: 1.5px solid #000000 !important;
            border-radius: 12px !important;
            font-size: 10px !important;
            font-weight: 900 !important;
            box-shadow: 1.5px 1.5px 0px #000000 !important;
        }
        .lms-modal-badge.yellow { background: #FFDE59 !important; color: #000000 !important; }
        .lms-modal-badge.pink { background: #FF6B8B !important; color: #FFFFFF !important; }
        .lms-modal-badge.green { background: #4ADE80 !important; color: #000000 !important; }

        .lms-modal-close-btn {
            width: 28px !important;
            height: 28px !important;
            border: 2px solid #000000 !important;
            border-radius: 8px !important;
            background: #FFFFFF !important;
            color: #000000 !important;
            font-size: 13px !important;
            font-weight: 900 !important;
            cursor: pointer !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            box-shadow: 2px 2px 0px #000000 !important;
            transition: all 0.1s ease !important;
        }
        .lms-modal-close-btn:hover {
            background: #FF4757 !important;
            color: #FFFFFF !important;
            transform: translate(-1px, -1px) !important;
            box-shadow: 3px 3px 0px #000000 !important;
        }
        .lms-modal-close-btn:active {
            transform: translate(1px, 1px) !important;
            box-shadow: 0px 0px 0px #000000 !important;
        }

        .lms-modal-body {
            padding: 16px !important;
            overflow-y: auto !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 12px !important;
            box-sizing: border-box !important;
        }

        .lms-modal-alert {
            padding: 10px 12px !important;
            border: 2px solid #000000 !important;
            border-radius: 10px !important;
            display: flex !important;
            align-items: flex-start !important;
            gap: 10px !important;
            font-size: 11.5px !important;
            line-height: 1.45 !important;
            box-shadow: 2.5px 2.5px 0px #000000 !important;
        }
        .lms-modal-alert.warning {
            background: #FFF0A8 !important;
            color: #854D0E !important;
        }
        .lms-modal-alert.success {
            background: #DCFCE7 !important;
            color: #166534 !important;
        }

        .lms-modal-actions-container {
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
        }

        .lms-btn-row {
            display: flex !important;
            gap: 8px !important;
        }
        .lms-btn-row > * {
            flex: 1 !important;
        }

        .lms-neo-btn {
            border: 2.5px solid #000000 !important;
            border-radius: 10px !important;
            padding: 10px 14px !important;
            font-size: 12px !important;
            font-weight: 800 !important;
            font-family: inherit !important;
            cursor: pointer !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 8px !important;
            box-shadow: 3.5px 3.5px 0px #000000 !important;
            transition: all 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
            text-decoration: none !important;
            user-select: none !important;
            box-sizing: border-box !important;
        }
        .lms-neo-btn:hover {
            transform: translate(-1.5px, -1.5px) !important;
            box-shadow: 5px 5px 0px #000000 !important;
        }
        .lms-neo-btn:active {
            transform: translate(2px, 2px) !important;
            box-shadow: 1px 1px 0px #000000 !important;
        }
        .lms-neo-btn.primary-green { background: #4ADE80 !important; color: #000000 !important; }
        .lms-neo-btn.primary-yellow { background: #FFDE59 !important; color: #000000 !important; }
        .lms-neo-btn.secondary-purple { background: #C7D2FE !important; color: #1E1B4B !important; }
        .lms-neo-btn.secondary-green { background: #BBF7D0 !important; color: #064E3B !important; }
        .lms-neo-btn.secondary-yellow { background: #FEF08A !important; color: #713F12 !important; }
        .lms-neo-btn.secondary-white { background: #FFFFFF !important; color: #111827 !important; }

        .lms-preview-box {
            background: #FFFFFF !important;
            border: 2px solid #000000 !important;
            border-radius: 8px !important;
            padding: 8px 10px !important;
            box-shadow: 2px 2px 0px #000000 !important;
        }
        .lms-preview-header {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            font-size: 10px !important;
            font-weight: 800 !important;
            color: #4B5563 !important;
            margin-bottom: 4px !important;
        }
        .lms-preview-content {
            font-family: 'JetBrains Mono', Consolas, Monaco, monospace !important;
            font-size: 10.5px !important;
            color: #374151 !important;
            max-height: 70px !important;
            overflow-y: auto !important;
            margin: 0 !important;
            white-space: pre-wrap !important;
            word-break: break-word !important;
        }

        .lms-modal-footer {
            padding: 10px 16px !important;
            border-top: 2px solid #000000 !important;
            background: #FAF7F2 !important;
            display: flex !important;
            gap: 8px !important;
            justify-content: flex-end !important;
        }

        /* Modal 2 (Paste Answer) Elements */
        .lms-modal-desc {
            font-size: 12px !important;
            font-weight: 600 !important;
            color: #374151 !important;
            line-height: 1.45 !important;
            margin: 0 !important;
        }
        .lms-textarea-toolbar {
            display: flex !important;
            gap: 6px !important;
            margin-bottom: 4px !important;
        }
        .lms-mini-btn {
            padding: 4px 9px !important;
            background: #FFFFFF !important;
            border: 1.5px solid #000000 !important;
            border-radius: 6px !important;
            font-size: 10.5px !important;
            font-weight: 800 !important;
            cursor: pointer !important;
            box-shadow: 1.5px 1.5px 0px #000000 !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 4px !important;
            transition: all 0.1s ease !important;
        }
        .lms-mini-btn:hover {
            background: #FFDE59 !important;
            transform: translate(-1px, -1px) !important;
        }
        .lms-neo-textarea {
            width: 100% !important;
            height: 155px !important;
            border: 2.5px solid #000000 !important;
            border-radius: 10px !important;
            background: #FFFFFF !important;
            padding: 10px 12px !important;
            font-family: 'JetBrains Mono', Consolas, Monaco, monospace !important;
            font-size: 11.5px !important;
            line-height: 1.5 !important;
            color: #111827 !important;
            box-shadow: 3.5px 3.5px 0px #000000 !important;
            box-sizing: border-box !important;
            outline: none !important;
            resize: vertical !important;
        }
        .lms-neo-textarea:focus {
            border-color: #000000 !important;
            box-shadow: 4px 4px 0px #000000, 0 0 0 3px rgba(74, 222, 128, 0.45) !important;
        }
        .lms-modal-tip {
            font-size: 10.5px !important;
            color: #6B7280 !important;
            line-height: 1.35 !important;
        }
        .lms-cheatsheet-box {
            background: #FFFBEB !important;
            border: 1.5px solid #000000 !important;
            border-radius: 8px !important;
            padding: 8px 10px !important;
            font-size: 11px !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 4px !important;
        }
        .lms-cheatsheet-item code {
            background: #FFFFFF !important;
            border: 1px solid #000000 !important;
            border-radius: 4px !important;
            padding: 1px 4px !important;
            font-family: 'JetBrains Mono', monospace !important;
            font-size: 10px !important;
        }

        /* Floating Quick Launcher Pill */
        #lms-solver-floating-pill {
            position: fixed !important;
            bottom: 24px !important;
            right: 24px !important;
            background: #FFDE59 !important;
            border: 2.5px solid #000000 !important;
            border-radius: 30px !important;
            padding: 7px 14px !important;
            display: flex !important;
            align-items: center !important;
            gap: 7px !important;
            box-shadow: 4px 4px 0px #000000 !important;
            cursor: pointer !important;
            z-index: 9999998 !important;
            font-family: 'Plus Jakarta Sans', sans-serif !important;
            font-size: 12px !important;
            font-weight: 900 !important;
            color: #000000 !important;
            user-select: none !important;
            transition: all 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
        }
        #lms-solver-floating-pill:hover {
            transform: translate(-2px, -2px) scale(1.03) !important;
            box-shadow: 6px 6px 0px #000000 !important;
        }
        #lms-solver-floating-pill:active {
            transform: translate(2px, 2px) !important;
            box-shadow: 1px 1px 0px #000000 !important;
        }
        .lms-pill-badge {
            background: #000000 !important;
            color: #FFDE59 !important;
            font-size: 9px !important;
            font-weight: 900 !important;
            padding: 2px 6px !important;
            border-radius: 10px !important;
            letter-spacing: 0.3px !important;
        }
        #lms-solver-floating-menu {
            position: fixed !important;
            bottom: 68px !important;
            right: 24px !important;
            background: #FAF7F2 !important;
            border: 2.5px solid #000000 !important;
            border-radius: 14px !important;
            box-shadow: 5px 5px 0px #000000 !important;
            padding: 8px !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 5px !important;
            z-index: 9999998 !important;
            min-width: 210px !important;
            animation: lmsSolverModalPop 0.2s ease-out forwards !important;
        }
        .lms-floating-menu-item {
            background: #FFFFFF !important;
            border: 1.5px solid #000000 !important;
            border-radius: 8px !important;
            padding: 8px 10px !important;
            font-size: 11.5px !important;
            font-weight: 800 !important;
            font-family: inherit !important;
            cursor: pointer !important;
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            color: #111827 !important;
            box-shadow: 1.5px 1.5px 0px #000000 !important;
            transition: all 0.1s ease !important;
        }
        .lms-floating-menu-item:hover {
            background: #FFDE59 !important;
            transform: translate(-1px, -1px) !important;
            box-shadow: 2.5px 2.5px 0px #000000 !important;
        }

        /* In-Page Toast Notification */
        #lms-inpage-toast {
            position: fixed !important;
            bottom: 80px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            background: #111827 !important;
            color: #FFFFFF !important;
            border: 2px solid #000000 !important;
            border-radius: 10px !important;
            padding: 8px 16px !important;
            font-family: 'Plus Jakarta Sans', sans-serif !important;
            font-size: 12px !important;
            font-weight: 800 !important;
            box-shadow: 4px 4px 0px #000000 !important;
            z-index: 999999999 !important;
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            pointer-events: none !important;
            animation: lmsSolverModalPop 0.2s ease-out forwards !important;
        }
    `;
    document.head.appendChild(style);
}

// In-Page HUD Controller dengan tombol Batal langsung di layar LMS
function showLmsHud(title, message, progressPercent = null, badgeText = "AUTO-RUN") {
    ensureInjectedStyles();
    let hud = document.getElementById('lms-solver-hud');
    if (!hud) {
        hud = document.createElement('div');
        hud.id = 'lms-solver-hud';
        hud.innerHTML = `
            <div class="hud-header">
                <span id="lms-hud-title" style="display:flex;align-items:center;gap:6px;">
                    <img src="${chrome.runtime.getURL('asset/devil-svgrepo-com.svg')}" style="width:16px;height:16px;vertical-align:middle;flex-shrink:0;" alt="icon">
                    <span id="lms-hud-title-text">LMS QUIZ SOLVER</span>
                </span>
                <div class="hud-actions">
                    <span class="hud-badge" id="lms-hud-status">ACTIVE</span>
                    <button class="hud-cancel-btn" id="lms-hud-abort" title="Hentikan Proses Kuis">Batal</button>
                </div>
            </div>
            <div class="hud-message" id="lms-hud-msg">Memulai...</div>
            <div class="hud-progress-bar">
                <div class="hud-progress-fill" id="lms-hud-fill"></div>
            </div>
        `;
        document.body.appendChild(hud);

        // Pasang event listener langsung ke tombol batal pada HUD
        let abortBtn = hud.querySelector('#lms-hud-abort');
        if (abortBtn) {
            abortBtn.onclick = (e) => {
                e.stopPropagation();
                abortCurrentOperation();
            };
        }
    }

    if (title) {
        let titleEl = document.getElementById('lms-hud-title-text') || document.getElementById('lms-hud-title');
        if (titleEl) titleEl.innerText = title;
    }
    if (message) document.getElementById('lms-hud-msg').innerText = message;
    
    let badge = document.getElementById('lms-hud-status');
    if (badge && badgeText) {
        badge.innerText = badgeText;
        if (badgeText === "BATAL" || badgeText === "DIBATALKAN") {
            badge.className = "hud-badge batal";
        } else {
            badge.className = "hud-badge";
        }
    }

    if (progressPercent !== null) {
        document.getElementById('lms-hud-fill').style.width = `${Math.min(100, Math.max(0, progressPercent))}%`;
    }
}

function removeLmsHud(delay = 2000) {
    registerTimer(() => {
        let hud = document.getElementById('lms-solver-hud');
        if (hud) {
            hud.style.opacity = '0';
            hud.style.transform = 'translateY(-20px)';
            hud.style.transition = 'all 0.4s ease';
            setTimeout(() => hud.remove(), 400);
        }
    }, delay);
}

// In-Page Click Visual FX (Ripples + Particles)
function triggerClickFx(element, color = '#22C55E') {
    if (!element) return;
    let rect = element.getBoundingClientRect();
    let centerX = rect.left + rect.width / 2 + window.scrollX;
    let centerY = rect.top + rect.height / 2 + window.scrollY;

    // 1. Ripple Ring
    let ripple = document.createElement('div');
    ripple.className = 'lms-solver-click-ripple';
    ripple.style.left = `${centerX - 16}px`;
    ripple.style.top = `${centerY - 16}px`;
    ripple.style.backgroundColor = color;
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 550);

    // 2. Geometric Particle Sparkles on LMS page
    const colors = ['#FFDE59', '#FF6B8B', '#4ADE80', '#818CF8', '#000000'];
    for (let i = 0; i < 8; i++) {
        let p = document.createElement('div');
        p.style.position = 'absolute';
        p.style.width = '7px';
        p.style.height = '7px';
        p.style.border = '1.5px solid #000000';
        p.style.backgroundColor = colors[i % colors.length];
        p.style.borderRadius = i % 2 === 0 ? '50%' : '2px';
        p.style.left = `${centerX}px`;
        p.style.top = `${centerY}px`;
        p.style.zIndex = '999999';
        p.style.pointerEvents = 'none';
        p.style.transition = 'all 0.45s cubic-bezier(0.25, 1, 0.5, 1)';
        document.body.appendChild(p);

        let angle = (i / 8) * Math.PI * 2;
        let dist = 30 + Math.random() * 20;
        let destX = Math.cos(angle) * dist;
        let destY = Math.sin(angle) * dist;

        requestAnimationFrame(() => {
            p.style.transform = `translate(${destX}px, ${destY}px) scale(0)`;
            p.style.opacity = '0';
        });

        setTimeout(() => p.remove(), 500);
    }
}


// ========================================================
// 2B. IN-PAGE OVERLAY MODALS & QUICK CONTROLLERS (v2.8)
// ========================================================
function escapeHtml(text) {
    if (!text) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showInPageToast(message, type = "success") {
    let oldToast = document.getElementById('lms-inpage-toast');
    if (oldToast) oldToast.remove();

    const toast = document.createElement('div');
    toast.id = 'lms-inpage-toast';
    toast.style.background = type === "success" ? "#111827" : (type === "warning" ? "#854D0E" : "#DC2626");
    toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
        if (toast.parentElement) toast.remove();
    }, 2800);
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadDataUrl(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function getImageFormatFromDataUrl(dataUrl) {
    const match = (dataUrl || '').match(/^data:image\/([^;]+);base64,/i);
    if (!match) return 'PNG';
    const raw = match[1].toLowerCase();
    if (raw === 'jpeg' || raw === 'jpg') return 'JPEG';
    if (raw === 'png') return 'PNG';
    return raw.toUpperCase();
}

async function ensureCompatibleImageDataUrl(dataUrl) {
    if (!dataUrl || !dataUrl.startsWith('data:image/')) return null;
    const fmt = getImageFormatFromDataUrl(dataUrl);
    if (fmt === 'PNG' || fmt === 'JPEG') {
        return { dataUrl, format: fmt };
    }
    return await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            try {
                const c = document.createElement('canvas');
                c.width = img.naturalWidth || 450;
                c.height = img.naturalHeight || 260;
                const cctx = c.getContext('2d');
                cctx.drawImage(img, 0, 0);
                resolve({ dataUrl: c.toDataURL('image/png'), format: 'PNG' });
            } catch (e) {
                resolve({ dataUrl, format: 'PNG' });
            }
        };
        img.onerror = () => resolve(null);
        img.src = dataUrl;
    });
}

function base64ToUint8Array(dataUrl) {
    const base64 = dataUrl.replace(/^data:image\/[^;]+;base64,/, '');
    const binaryStr = atob(base64);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
}

async function generatePdfDocument(structuredData) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        showInPageToast("Pustaka PDF belum termuat!", "error");
        return false;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 14;
    const contentWidth = pageWidth - (margin * 2);
    let y = margin;

    function checkPageBreak(neededHeight) {
        if (y + neededHeight > pageHeight - margin) {
            doc.addPage();
            y = margin;
            return true;
        }
        return false;
    }

    // Title Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(17, 24, 39);
    doc.text("LMS QUIZ - SOAL & PROMPT AI", margin, y);
    y += 6.5;

    // Rules / Prompt instructions
    const promptHeader = structuredData.promptHeader || "Tolong jawab kuis ini. Berikan jawaban akhirnya saja tanpa penjelasan.\nFormat: 1. a. Jawaban (sertakan huruf opsi a/b/c/d jika ada)";
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(75, 85, 99);
    const ruleLines = doc.splitTextToSize(promptHeader.trim(), contentWidth);
    ruleLines.forEach(line => {
        checkPageBreak(4.5);
        doc.text(line, margin, y);
        y += 4.2;
    });
    y += 3;

    // Separator line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // Questions
    const questions = structuredData.questions || [];
    for (const q of questions) {
        checkPageBreak(18);

        // Nomor Soal
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(0, 0, 0);
        const qHeader = q.isMatch ? `Soal ${q.num} (Tipe Menjodohkan / Sub-soal):` : (q.isShortAnswer ? `Soal ${q.num} (Tipe Isian Singkat):` : `Soal ${q.num}:`);
        doc.text(qHeader, margin, y);
        y += 5;

        // Teks Soal
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(17, 24, 39);
        const qLines = doc.splitTextToSize(q.text || "", contentWidth);
        qLines.forEach(line => {
            checkPageBreak(4.8);
            doc.text(line, margin, y);
            y += 4.5;
        });
        y += 2;

        // Gambar Soal
        if (q.images && q.images.length > 0) {
            for (const img of q.images) {
                if (img.base64) {
                    const compat = await ensureCompatibleImageDataUrl(img.base64);
                    const maxImgW = contentWidth;
                    const maxImgH = 80;
                    let imgW = maxImgW;
                    let imgH = maxImgH;

                    if (img.width && img.height) {
                        const ratio = img.width / img.height;
                        imgW = Math.min(maxImgW, img.width * 0.264583);
                        imgH = imgW / ratio;
                        if (imgH > maxImgH) {
                            imgH = maxImgH;
                            imgW = imgH * ratio;
                        }
                    }

                    checkPageBreak(imgH + 6);
                    try {
                        if (!compat) throw new Error("Format gambar tidak didukung");
                        const imgX = margin + (contentWidth - imgW) / 2;
                        doc.addImage(compat.dataUrl, compat.format, imgX, y, imgW, imgH);
                        y += imgH + 4;
                    } catch (err) {
                        doc.setFontSize(8.5);
                        doc.setTextColor(220, 38, 38);
                        doc.text(`[Gambar Soal ${q.num} tidak dapat ditampilkan di PDF: ${img.alt || 'Error'}]`, margin, y);
                        y += 5;
                        doc.setTextColor(17, 24, 39);
                    }
                } else {
                    doc.setFontSize(8.5);
                    doc.setTextColor(220, 38, 38);
                    doc.text(`[Gambar Soal ${q.num} gagal dimuat dari LMS: ${img.alt || ''}]`, margin, y);
                    y += 5;
                    doc.setTextColor(17, 24, 39);
                }
            }
        }

        // Opsi Jawaban
        if (q.options && q.options.length > 0) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(55, 65, 81);
            q.options.forEach((opt) => {
                const optLines = doc.splitTextToSize(`- ${opt}`, contentWidth - 4);
                optLines.forEach((line, lIdx) => {
                    checkPageBreak(4.5);
                    doc.text(lIdx === 0 ? line : `   ${line}`, margin + 2, y);
                    y += 4.2;
                });
            });
        }

        y += 4;
        checkPageBreak(6);
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.25);
        doc.line(margin, y, pageWidth - margin, y);
        y += 5;
    }

    // Page numbers
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text(`Halaman ${p} dari ${totalPages}  |  LMS QUIZ Solver`, margin, pageHeight - 8);
    }

    doc.save('Soal_Kuis_LMS.pdf');
    return true;
}

async function generateDocxDocument(structuredData) {
    if (!window.docx) {
        showInPageToast("Pustaka DOCX belum termuat!", "error");
        return false;
    }

    const { Document, Paragraph, TextRun, ImageRun, Packer, AlignmentType, BorderStyle } = window.docx;
    const docChildren = [];

    // Header Judul Dokumen
    docChildren.push(
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: 180 },
            children: [
                new TextRun({
                    text: "LMS QUIZ - SOAL & PROMPT AI",
                    bold: true,
                    size: 32,
                    font: "Calibri",
                    color: "111827"
                })
            ]
        })
    );

    // Aturan & Petunjuk Jawaban untuk AI
    const promptHeader = structuredData.promptHeader || "Tolong jawab kuis ini. Berikan jawaban akhirnya saja tanpa penjelasan.\nFormat: 1. a. Jawaban (sertakan huruf opsi a/b/c/d jika ada)";
    promptHeader.split('\n').forEach(line => {
        if (line.trim()) {
            docChildren.push(
                new Paragraph({
                    spacing: { after: 60 },
                    children: [
                        new TextRun({
                            text: line,
                            italics: true,
                            size: 20,
                            font: "Calibri",
                            color: "4B5563"
                        })
                    ]
                })
            );
        }
    });

    // Garis Pembatas Header
    docChildren.push(
        new Paragraph({
            border: {
                bottom: {
                    color: "CCCCCC",
                    space: 6,
                    style: BorderStyle.SINGLE,
                    size: 6
                }
            },
            spacing: { after: 200 }
        })
    );

    const questions = structuredData.questions || [];
    for (const q of questions) {
        const qTitle = q.isMatch ? `Soal ${q.num} (Tipe Menjodohkan / Sub-soal):` : (q.isShortAnswer ? `Soal ${q.num} (Tipe Isian Singkat):` : `Soal ${q.num}:`);
        docChildren.push(
            new Paragraph({
                spacing: { before: 160, after: 80 },
                children: [
                    new TextRun({
                        text: qTitle,
                        bold: true,
                        size: 24,
                        font: "Calibri",
                        color: "111827"
                    })
                ]
            })
        );

        if (q.text) {
            q.text.split('\n').forEach(line => {
                if (line.trim()) {
                    docChildren.push(
                        new Paragraph({
                            spacing: { after: 80 },
                            children: [
                                new TextRun({
                                    text: line,
                                    size: 22,
                                    font: "Calibri",
                                    color: "1F2937"
                                })
                            ]
                        })
                    );
                }
            });
        }

        if (q.images && q.images.length > 0) {
            for (const img of q.images) {
                if (img.base64) {
                    try {
                        const compat = await ensureCompatibleImageDataUrl(img.base64);
                        if (!compat) throw new Error("Format gambar tidak didukung");
                        const imgBytes = base64ToUint8Array(compat.dataUrl);

                        let w = img.width || 450;
                        let h = img.height || 260;
                        const maxWidth = 480;
                        const maxHeight = 320;

                        if (w > maxWidth) {
                            h = Math.round(h * (maxWidth / w));
                            w = maxWidth;
                        }
                        if (h > maxHeight) {
                            h = Math.round(h * (maxHeight / h));
                            h = maxHeight;
                        }

                        docChildren.push(
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                spacing: { before: 100, after: 140 },
                                children: [
                                    new ImageRun({
                                        data: imgBytes,
                                        transformation: {
                                            width: Math.max(50, Math.round(w)),
                                            height: Math.max(30, Math.round(h))
                                        }
                                    })
                                ]
                            })
                        );
                    } catch (imgErr) {
                        docChildren.push(
                            new Paragraph({
                                spacing: { after: 80 },
                                children: [
                                    new TextRun({
                                        text: `[Gagal memproses gambar: ${img.alt || 'Error'}]`,
                                        italics: true,
                                        color: "DC2626",
                                        size: 20
                                    })
                                ]
                            })
                        );
                    }
                } else {
                    docChildren.push(
                        new Paragraph({
                            spacing: { after: 80 },
                            children: [
                                new TextRun({
                                    text: `[Gambar Soal ${q.num} gagal dimuat dari LMS: ${img.alt || ''}]`,
                                    italics: true,
                                    color: "DC2626",
                                    size: 20
                                })
                            ]
                        })
                    );
                }
            }
        }

        if (q.options && q.options.length > 0) {
            q.options.forEach(opt => {
                docChildren.push(
                    new Paragraph({
                        spacing: { after: 50 },
                        indent: { left: 360 },
                        children: [
                            new TextRun({
                                text: `- ${opt}`,
                                size: 21,
                                font: "Calibri",
                                color: "374151"
                            })
                        ]
                    })
                );
            });
        }

        docChildren.push(
            new Paragraph({
                border: {
                    bottom: {
                        color: "E5E7EB",
                        space: 4,
                        style: BorderStyle.SINGLE,
                        size: 4
                    }
                },
                spacing: { after: 160 }
            })
        );
    }

    const doc = new Document({
        sections: [
            {
                properties: {
                    page: {
                        margin: {
                            top: 1440,
                            right: 1440,
                            bottom: 1440,
                            left: 1440
                        }
                    }
                },
                children: docChildren
            }
        ]
    });

    const docxBlob = await Packer.toBlob(doc);
    downloadBlob(docxBlob, 'Soal_Kuis_LMS.docx');
    return true;
}

async function downloadQuizImages(structuredData) {
    const questions = structuredData.questions || [];
    const allImages = [];
    questions.forEach(q => {
        if (q.images && q.images.length > 0) {
            q.images.forEach(img => {
                if (img.base64) allImages.push(img);
            });
        }
    });

    if (allImages.length === 0) {
        showInPageToast("Tidak ada gambar pada soal untuk diunduh!", "warning");
        return;
    }

    if (!window.JSZip) {
        allImages.forEach((img, idx) => {
            setTimeout(() => {
                downloadDataUrl(img.base64, img.name || `Soal_Gambar_${idx + 1}.png`);
            }, idx * 250);
        });
        showInPageToast(`${allImages.length} gambar diunduh.`);
        return;
    }

    const zip = new window.JSZip();
    const usedNames = new Set();
    allImages.forEach((img, idx) => {
        let fileName = img.name || `Gambar_Soal_${idx + 1}.png`;
        let count = 1;
        while (usedNames.has(fileName)) {
            fileName = fileName.replace(/(\.png|\.jpg|\.jpeg)?$/i, `_${count}$1`);
            count++;
        }
        usedNames.add(fileName);
        const base64Data = img.base64.replace(/^data:image\/[^;]+;base64,/, '');
        zip.file(fileName, base64Data, { base64: true });
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(zipBlob, 'Koleksi_Gambar_Soal_LMS.zip');
    showInPageToast(`${allImages.length} gambar berhasil diunduh (.ZIP)!`);
}

async function copyToClipboard(text) {
    if (!text) return false;
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch (e) {
        console.warn("LMS Solver: navigator.clipboard.writeText failed:", e);
    }
    try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        ta.style.top = "-9999px";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const success = document.execCommand("copy");
        document.body.removeChild(ta);
        return success;
    } catch (err) {
        console.error("LMS Solver: execCommand copy fallback failed:", err);
        return false;
    }
}

async function readFromClipboard() {
    try {
        if (navigator.clipboard && navigator.clipboard.readText) {
            return await navigator.clipboard.readText();
        }
    } catch (e) {
        console.warn("LMS Solver: readText failed or permission denied:", e);
    }
    return null;
}

function closeInPageModals() {
    const overlay = document.getElementById('lms-solver-modal-overlay');
    if (overlay) overlay.remove();
}

// ========================================================
// IN-PAGE MODAL 1: SALIN / EKSPOR HASIL SCRAPING SOAL
// ========================================================
function showInPageScrapeResultModal(finalResult, structuredData) {
    ensureInjectedStyles();
    closeInPageModals();

    const hasImages = structuredData && structuredData.hasImages && structuredData.totalImages > 0;
    const totalImages = structuredData ? (structuredData.totalImages || 0) : 0;
    const qCount = (structuredData && structuredData.questions) ? structuredData.questions.length : 0;

    const overlay = document.createElement('div');
    overlay.id = 'lms-solver-modal-overlay';

    let devilIcon = '';
    try {
        devilIcon = chrome.runtime.getURL('asset/devil-svgrepo-com.svg');
    } catch (e) {}

    overlay.innerHTML = `
        <div class="lms-neo-modal" id="lms-modal-scrape-result">
            <div class="lms-modal-header">
                <div class="lms-modal-title">
                    ${devilIcon ? `<img src="${devilIcon}" style="width:18px;height:18px;vertical-align:middle;" alt="icon">` : '📋'}
                    <span>HASIL SCRAPING KUIS</span>
                </div>
                <div class="lms-modal-header-right">
                    <span class="lms-modal-badge yellow">${qCount} SOAL</span>
                    ${hasImages ? `<span class="lms-modal-badge pink">${totalImages} GAMBAR</span>` : ''}
                    <button class="lms-modal-close-btn" id="lms-close-scrape-modal" title="Tutup">✕</button>
                </div>
            </div>

            <div class="lms-modal-body">
                ${hasImages ? `
                    <div class="lms-modal-alert warning">
                        <span style="font-size:18px;">⚠️</span>
                        <div>
                            <strong>Terdeteksi ${totalImages} Soal Bergambar!</strong><br>
                            Sangat disarankan mengunduh dalam format <b>.DOCX</b> atau <b>.PDF</b> agar AI dapat menganalisis gambar dengan akurat.
                        </div>
                    </div>

                    <div class="lms-modal-actions-container">
                        <button class="lms-neo-btn primary-yellow" id="lms-btn-modal-docx">
                            <span>📄 Unduh File Word (.DOCX) — Rekomendasi Gambar</span>
                        </button>
                        <div class="lms-btn-row">
                            <button class="lms-neo-btn secondary-purple" id="lms-btn-modal-pdf">
                                <span>📑 Unduh PDF</span>
                            </button>
                            <button class="lms-neo-btn secondary-green" id="lms-btn-modal-copy">
                                <span>📋 Salin Teks Prompt</span>
                            </button>
                        </div>
                        <button class="lms-neo-btn secondary-white" id="lms-btn-modal-zip" style="margin-top:2px;">
                            <span>📦 Unduh Semua Gambar Soal (.ZIP)</span>
                        </button>
                    </div>
                ` : `
                    <div class="lms-modal-alert success">
                        <span style="font-size:18px;">✅</span>
                        <div>
                            <strong>${qCount} Soal Berhasil Discrape (Hanya Teks)!</strong><br>
                            Format prompt AI sudah dibuat otomatis. Anda bisa langsung salin teks dan tempel ke ChatGPT/Gemini/Claude.
                        </div>
                    </div>

                    <div class="lms-modal-actions-container">
                        <button class="lms-neo-btn primary-green" id="lms-btn-modal-copy">
                            <span>📋 Salin Teks Prompt AI (Default)</span>
                        </button>
                        <div class="lms-btn-row">
                            <button class="lms-neo-btn secondary-purple" id="lms-btn-modal-pdf">
                                <span>📑 Unduh PDF</span>
                            </button>
                            <button class="lms-neo-btn secondary-yellow" id="lms-btn-modal-docx">
                                <span>📄 Unduh DOCX</span>
                            </button>
                        </div>
                    </div>
                `}

                <div class="lms-preview-box">
                    <div class="lms-preview-header">
                        <span>Cuplikan Prompt &amp; Soal:</span>
                        <span>${finalResult.length} Karakter</span>
                    </div>
                    <pre class="lms-preview-content">${escapeHtml(finalResult.slice(0, 340))}...</pre>
                </div>
            </div>

            <div class="lms-modal-footer">
                <button class="lms-neo-btn secondary-white" id="lms-btn-to-paste-modal" style="width:100%;">
                    <span>⏩ Lanjut ke Paste Jawaban AI &rarr;</span>
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Event listener: Copy Text
    const btnCopy = overlay.querySelector('#lms-btn-modal-copy');
    if (btnCopy) {
        btnCopy.onclick = async () => {
            const ok = await copyToClipboard(finalResult);
            if (ok) {
                btnCopy.style.background = '#22C55E';
                btnCopy.innerHTML = '<span>✅ Berhasil Disalin ke Clipboard!</span>';
                showInPageToast("Teks kuis tersalin! Menuju input jawaban AI...");
            }
            setTimeout(() => {
                closeInPageModals();
                showInPagePasteModal();
            }, 450);
        };
    }

    // Event listener: Download DOCX
    const btnDocx = overlay.querySelector('#lms-btn-modal-docx');
    if (btnDocx) {
        btnDocx.onclick = async () => {
            btnDocx.disabled = true;
            btnDocx.innerHTML = '<span>⏳ Menyiapkan File DOCX...</span>';
            try {
                await generateDocxDocument(structuredData);
                showInPageToast("File DOCX berhasil diunduh!");
            } catch (e) {
                console.error("Gagal buat DOCX:", e);
                showInPageToast("Gagal membuat DOCX!", "error");
            }
            setTimeout(() => {
                closeInPageModals();
                showInPagePasteModal();
            }, 600);
        };
    }

    // Event listener: Download PDF
    const btnPdf = overlay.querySelector('#lms-btn-modal-pdf');
    if (btnPdf) {
        btnPdf.onclick = async () => {
            btnPdf.disabled = true;
            btnPdf.innerHTML = '<span>⏳ Menyiapkan File PDF...</span>';
            try {
                await generatePdfDocument(structuredData);
                showInPageToast("File PDF berhasil diunduh!");
            } catch (e) {
                console.error("Gagal buat PDF:", e);
                showInPageToast("Gagal membuat PDF!", "error");
            }
            setTimeout(() => {
                closeInPageModals();
                showInPagePasteModal();
            }, 600);
        };
    }

    // Event listener: Download ZIP
    const btnZip = overlay.querySelector('#lms-btn-modal-zip');
    if (btnZip) {
        btnZip.onclick = async () => {
            await downloadQuizImages(structuredData);
            setTimeout(() => {
                closeInPageModals();
                showInPagePasteModal();
            }, 600);
        };
    }

    // Event listener: Lanjut ke Paste Modal
    const btnToPaste = overlay.querySelector('#lms-btn-to-paste-modal');
    if (btnToPaste) {
        btnToPaste.onclick = () => {
            closeInPageModals();
            showInPagePasteModal();
        };
    }

    // Event listener: Tutup Modal
    const btnClose = overlay.querySelector('#lms-close-scrape-modal');
    if (btnClose) {
        btnClose.onclick = () => {
            closeInPageModals();
        };
    }
}

// ========================================================
// IN-PAGE MODAL 2: PASTE / INPUT JAWABAN AI UNTUK DIINJECT
// ========================================================
function showInPagePasteModal() {
    ensureInjectedStyles();
    closeInPageModals();

    chrome.storage.local.get(['savedAnswers'], (data) => {
        const draftAnswers = data.savedAnswers || "";
        const overlay = document.createElement('div');
        overlay.id = 'lms-solver-modal-overlay';

        overlay.innerHTML = `
            <div class="lms-neo-modal" id="lms-modal-paste-answer" style="max-width:540px;">
                <div class="lms-modal-header">
                    <div class="lms-modal-title">
                        <span style="font-size:18px;">🤖</span>
                        <span>INPUT JAWABAN AI</span>
                    </div>
                    <div class="lms-modal-header-right">
                        <span class="lms-modal-badge green">AUTO-FILL READY</span>
                        <button class="lms-modal-close-btn" id="lms-close-paste-modal" title="Tutup">✕</button>
                    </div>
                </div>

                <div class="lms-modal-body">
                    <p class="lms-modal-desc">
                        Tempel (Paste) jawaban dari <b>ChatGPT / Claude / Gemini</b> ke kolom di bawah ini, lalu klik <b>Mulai Inject Jawaban</b>.
                    </p>

                    <div class="lms-textarea-toolbar">
                        <button class="lms-mini-btn" id="lms-btn-paste-clipboard" title="Tempel otomatis dari clipboard">
                            <span>📋 Tempel dari Clipboard</span>
                        </button>
                        <button class="lms-mini-btn" id="lms-btn-toggle-cheatsheet" title="Lihat contoh format">
                            <span>❓ Contoh Format</span>
                        </button>
                    </div>

                    <div id="lms-cheatsheet-box" class="lms-cheatsheet-box" style="display:none;">
                        <div class="lms-cheatsheet-item"><b>Pilihan Ganda:</b> <code>1. a. Teks Jawaban</code> atau <code>1. a</code></div>
                        <div class="lms-cheatsheet-item"><b>True / False:</b> <code>2. True</code> atau <code>2. False</code></div>
                        <div class="lms-cheatsheet-item"><b>Checkbox (Pilih Lebih Dari 1):</b> <code>3. a. Opsi 1 | c. Opsi 3</code></div>
                        <div class="lms-cheatsheet-item"><b>Menjodohkan / Sub-soal:</b> <code>4. a. Sub A: Jawaban 1 | b. Sub B: Jawaban 2</code></div>
                        <div class="lms-cheatsheet-item"><b>Isian Singkat:</b> <code>5. Jawaban Isian</code></div>
                    </div>

                    <textarea id="lms-paste-textarea" class="lms-neo-textarea" placeholder="Tempel jawaban AI di sini...&#10;&#10;Contoh:&#10;1. a. Event-based coordination&#10;2. c. Shared data space&#10;3. True&#10;4. a. Opsi 1 | c. Opsi 3&#10;5. a. Sub-soal A: Opsi 1 | b. Sub-soal B: Opsi 2&#10;6. SDD">${escapeHtml(draftAnswers)}</textarea>

                    <div class="lms-modal-tip">
                        💡 <i>Tips: Nomor soal harus sesuai urutan kuis. Ekstensi akan mengisi kuis dan berpindah halaman otomatis!</i>
                    </div>
                </div>

                <div class="lms-modal-footer">
                    <button class="lms-neo-btn secondary-white" id="lms-btn-cancel-paste">Tutup</button>
                    <button class="lms-neo-btn primary-green" id="lms-btn-start-inject" style="flex:2;">
                        <span>⚡ MULAI INJECT JAWABAN</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const textarea = overlay.querySelector('#lms-paste-textarea');
        textarea.focus();

        // Toggle Cheatsheet
        const btnToggleCheat = overlay.querySelector('#lms-btn-toggle-cheatsheet');
        const cheatBox = overlay.querySelector('#lms-cheatsheet-box');
        if (btnToggleCheat && cheatBox) {
            btnToggleCheat.onclick = () => {
                cheatBox.style.display = cheatBox.style.display === 'none' ? 'flex' : 'none';
            };
        }

        // Paste from clipboard button
        const btnPasteClip = overlay.querySelector('#lms-btn-paste-clipboard');
        if (btnPasteClip) {
            btnPasteClip.onclick = async () => {
                const clipText = await readFromClipboard();
                if (clipText) {
                    textarea.value = clipText;
                    showInPageToast("Jawaban berhasil ditempel dari clipboard!");
                } else {
                    showInPageToast("Gunakan Ctrl+V untuk menempelkan jawaban.", "warning");
                    textarea.focus();
                }
            };
        }

        // Close button
        const btnClose = overlay.querySelector('#lms-close-paste-modal');
        const btnCancel = overlay.querySelector('#lms-btn-cancel-paste');
        const handleClose = () => {
            const val = textarea.value.trim();
            if (val) {
                chrome.storage.local.set({ savedAnswers: val });
            }
            closeInPageModals();
        };
        if (btnClose) btnClose.onclick = handleClose;
        if (btnCancel) btnCancel.onclick = handleClose;

        // Start Inject Button
        const btnInject = overlay.querySelector('#lms-btn-start-inject');
        if (btnInject) {
            btnInject.onclick = () => {
                const text = textarea.value.trim();
                if (!text) {
                    showInPageToast("Silakan tempel jawaban AI terlebih dahulu!", "warning");
                    textarea.focus();
                    return;
                }

                btnInject.disabled = true;
                btnInject.innerHTML = '<span>⚡ Memulai Pengisian Kuis...</span>';

                let firstQ = document.querySelector('.que .qno')?.innerText.trim();

                chrome.storage.local.set({ savedAnswers: text, isAutoFilling: true }, () => {
                    chrome.storage.local.remove(['consumedEntryIndexes', 'injectAuditLog']);
                    closeInPageModals();

                    // If user is currently on a page with question number > 1 (e.g. page 5 after scraping), navigate to page 1
                    if (firstQ && parseInt(firstQ) > 1 && window.location.href.includes('attempt.php')) {
                        let q1Btn = document.querySelector('.qnbutton[href*="page=0"], a.qnbutton:first-of-type, #mod_quiz_navblock a.qnbutton');
                        if (q1Btn && q1Btn.href) {
                            showLmsHud("AUTO-FILL INJECTOR", "Kembali ke Halaman 1 untuk mulai mengisi dari Soal No. 1...", 10);
                            window.location.href = q1Btn.href;
                            return;
                        } else if (window.location.search.includes('page=')) {
                            showLmsHud("AUTO-FILL INJECTOR", "Kembali ke Halaman 1 untuk mulai mengisi dari Soal No. 1...", 10);
                            window.location.search = window.location.search.replace(/page=\d+/, 'page=0');
                            return;
                        }
                    }

                    showLmsHud("AUTO-FILL INJECTOR", "Mempersiapkan pengisian jawaban kuis...", 15);
                    autoFillAndNext();
                });
            };
        }
    });
}

// ========================================================
// FLOATING QUICK LAUNCHER PILL (POJOK KANAN BAWAH)
// ========================================================
function ensureFloatingPill() {
    if (!window.location.href.includes('/mod/quiz/')) return;
    ensureInjectedStyles();

    let pill = document.getElementById('lms-solver-floating-pill');
    if (!pill) {
        pill = document.createElement('div');
        pill.id = 'lms-solver-floating-pill';
        let devilIcon = '';
        try {
            devilIcon = chrome.runtime.getURL('asset/devil-svgrepo-com.svg');
        } catch (e) {}

        pill.innerHTML = `
            ${devilIcon ? `<img src="${devilIcon}" style="width:16px;height:16px;vertical-align:middle;" alt="LMS">` : '😈'}
            <span>LMS Solver</span>
            <span class="lms-pill-badge" id="lms-pill-badge">MENU</span>
        `;
        document.body.appendChild(pill);

        pill.onclick = (e) => {
            e.stopPropagation();
            toggleFloatingMenu();
        };

        document.addEventListener('click', (e) => {
            const menu = document.getElementById('lms-solver-floating-menu');
            if (menu && !menu.contains(e.target) && e.target !== pill && !pill.contains(e.target)) {
                menu.remove();
            }
        });
    }

    chrome.storage.local.get(['scrapeResult'], (data) => {
        updateFloatingPillStatus(!!data.scrapeResult);
    });
}

function updateFloatingPillStatus(hasScrape) {
    const badge = document.getElementById('lms-pill-badge');
    if (badge) {
        if (hasScrape) {
            badge.innerText = '📋 HASIL SIAP';
            badge.style.background = '#4ADE80';
            badge.style.color = '#000000';
        } else {
            badge.innerText = 'MENU';
            badge.style.background = '#000000';
            badge.style.color = '#FFDE59';
        }
    }
}

function toggleFloatingMenu() {
    let existingMenu = document.getElementById('lms-solver-floating-menu');
    if (existingMenu) {
        existingMenu.remove();
        return;
    }

    ensureInjectedStyles();
    chrome.storage.local.get(['scrapeResult', 'scrapeStructuredData', 'savedAnswers'], (data) => {
        const menu = document.createElement('div');
        menu.id = 'lms-solver-floating-menu';

        let html = '';
        if (data.scrapeResult) {
            html += `<button class="lms-floating-menu-item" id="lms-fmenu-scrape-result">
                <span>📋 Buka Hasil Scrape Soal</span>
            </button>`;
        }

        html += `<button class="lms-floating-menu-item" id="lms-fmenu-paste-answer">
            <span>🤖 Input Jawaban AI (Paste)</span>
        </button>`;

        if (window.location.href.includes('attempt.php')) {
            html += `<button class="lms-floating-menu-item" id="lms-fmenu-start-scrape">
                <span>🚀 Mulai Auto-Scrape Kuis</span>
            </button>`;

            if (data.savedAnswers) {
                html += `<button class="lms-floating-menu-item" id="lms-fmenu-start-inject">
                    <span>⚡ Jalankan Auto-Fill Jawaban</span>
                </button>`;
            }
        }

        menu.innerHTML = html;
        document.body.appendChild(menu);

        const btnScrapeRes = menu.querySelector('#lms-fmenu-scrape-result');
        if (btnScrapeRes) {
            btnScrapeRes.onclick = () => {
                menu.remove();
                showInPageScrapeResultModal(data.scrapeResult, data.scrapeStructuredData);
            };
        }

        const btnPaste = menu.querySelector('#lms-fmenu-paste-answer');
        if (btnPaste) {
            btnPaste.onclick = () => {
                menu.remove();
                showInPagePasteModal();
            };
        }

        const btnStartScrape = menu.querySelector('#lms-fmenu-start-scrape');
        if (btnStartScrape) {
            btnStartScrape.onclick = () => {
                menu.remove();
                chrome.storage.local.set({ isAutoScraping: true, scrapedQuestions: "", scrapedQuestionsData: [] }, () => {
                    performScrapeStep();
                });
            };
        }

        const btnStartInject = menu.querySelector('#lms-fmenu-start-inject');
        if (btnStartInject) {
            btnStartInject.onclick = () => {
                menu.remove();
                autoFillAndNext();
            };
        }
    });
}


// ========================================================
// 3. LISTENER PERINTAH DARI POPUP
// ========================================================
if (!window.__LMS_SOLVER_LISTENER_REGISTERED__) {
    window.__LMS_SOLVER_LISTENER_REGISTERED__ = true;
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "get_page_info") {
        let pageType = "unknown";
        if (window.location.href.includes("review.php")) {
            pageType = "review";
        } else if (window.location.href.includes("attempt.php")) {
            pageType = "attempt";
        } else if (window.location.href.includes("/mod/quiz/")) {
            pageType = "quiz_home";
        }
        let totalQuestions = document.querySelectorAll('.que').length;
        sendResponse({
            pageType: pageType,
            url: window.location.href,
            totalQuestions: totalQuestions,
            isBusy: (window.__activeOperationTimers || []).length > 0
        });
        return true;
    }

    if (request.action === "start_auto_scrape") {
        chrome.storage.local.set({ isAutoScraping: true, scrapedQuestions: "", scrapedQuestionsData: [] }, () => {
            performScrapeStep();
            sendResponse({ success: true, status: "started" });
        });
        return true;
    } else if (request.action === "inject") {
        chrome.storage.local.remove('consumedEntryIndexes', () => {
            autoFillAndNext();
        });
        sendResponse({ success: true, status: "injecting" });
        return true;
    } else if (request.action === "cancel_operation") {
        let result = abortCurrentOperation();
        sendResponse(result);
        return true;
    } else if (request.action === "scrape_quiz_review") {
        try {
            let result = scrapeQuizReview();
            if (result.success) {
                chrome.storage.local.set({ lastReviewResult: result });
            }
            sendResponse(result);
        } catch (err) {
            console.error("Error scraping quiz review:", err);
            sendResponse({ success: false, message: err.message || "Gagal menscrape review kuis." });
        }
        return true;
    } else if (request.action === "open_inpage_scrape_modal") {
        chrome.storage.local.get(['scrapeResult', 'scrapeStructuredData'], (data) => {
            if (data.scrapeResult) {
                showInPageScrapeResultModal(data.scrapeResult, data.scrapeStructuredData);
                sendResponse({ success: true });
            } else {
                showInPageToast("Belum ada hasil scrape kuis!", "warning");
                sendResponse({ success: false, message: "No scrape data" });
            }
        });
        return true;
    } else if (request.action === "open_inpage_paste_modal") {
        showInPagePasteModal();
        sendResponse({ success: true });
        return true;
    }
    return true;
    });
}


// Auto-Resume saat pindah halaman (Attempt Mode) tanpa menimpa window.onload Moodle
if (!window.__LMS_SOLVER_INIT_REGISTERED__) {
    window.__LMS_SOLVER_INIT_REGISTERED__ = true;
    const runAutoResumeCheck = () => {
        chrome.storage.local.get(['isAutoScraping', 'isAutoFilling', 'savedAnswers'], (data) => {
            if (data.isAutoScraping && window.location.href.includes('attempt.php')) {
                registerTimer(() => {
                    performScrapeStep();
                }, 900);
            } else if (data.isAutoFilling && data.savedAnswers && window.location.href.includes('attempt.php')) {
                registerTimer(() => {
                    autoFillAndNext();
                }, 750);
            }
        });
    };

    if (document.readyState === 'complete') {
        runAutoResumeCheck();
        ensureFloatingPill();
    } else {
        window.addEventListener('load', () => {
            runAutoResumeCheck();
            ensureFloatingPill();
        }, { once: true });
    }
}


// ========================================================
// 4. FUNGSI: SIKLUS AUTO-SCRAPE MULTI-PAGE (DAPAT DIBATALKAN)
// ========================================================
async function resolveAndFetchQuizImage(imgEl, qNum, prefix = "Soal") {
    if (!imgEl || !imgEl.src) return null;

    const src = imgEl.src;
    // Abaikan gambar icon/theme Moodle yang bukan bagian dari materi soal
    if (src.includes('/pix/') || src.includes('/theme/') || imgEl.classList.contains('icon') || src.startsWith('data:image/svg+xml')) {
        return null;
    }

    const rawName = imgEl.alt || imgEl.getAttribute('title') || `img_${Date.now()}.png`;
    let safeName = `${prefix}_${qNum}_${rawName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    if (!safeName.toLowerCase().endsWith('.png') && !safeName.toLowerCase().endsWith('.jpg') && !safeName.toLowerCase().endsWith('.jpeg')) {
        safeName += '.png';
    }

    let width = imgEl.naturalWidth || imgEl.width || 450;
    let height = imgEl.naturalHeight || imgEl.height || 260;
    let base64 = null;

    // 1. Ekstraksi visual via Canvas (apabila gambar sudah selesai di-render di DOM)
    try {
        if (imgEl.complete && imgEl.naturalWidth > 0) {
            const canvas = document.createElement('canvas');
            canvas.width = imgEl.naturalWidth;
            canvas.height = imgEl.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(imgEl, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            if (dataUrl && dataUrl.length > 100) {
                base64 = dataUrl;
                width = imgEl.naturalWidth;
                height = imgEl.naturalHeight;
            }
        }
    } catch (e) {
        // Tainted canvas jika cross-origin, lanjut ke fetch
    }

    // 2. Fetch langsung menggunakan sesi login browser aktif (cookies LMS)
    if (!base64) {
        try {
            const resp = await fetch(src, { credentials: 'include' });
            if (resp.ok) {
                const blob = await resp.blob();
                base64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = () => resolve(null);
                    reader.readAsDataURL(blob);
                });

                // Dapatkan dimensi alami gambar jika belum diketahui
                if (base64 && (width <= 0 || height <= 0)) {
                    await new Promise((resolve) => {
                        const tempImg = new Image();
                        tempImg.onload = () => {
                            width = tempImg.naturalWidth || 450;
                            height = tempImg.naturalHeight || 260;
                            resolve();
                        };
                        tempImg.onerror = () => resolve();
                        tempImg.src = base64;
                    });
                }
            }
        } catch (err) {
            console.log("LMS Auto-Solver: Gagal fetch gambar:", src, err);
        }
    }

    return {
        src: src,
        alt: rawName,
        name: safeName,
        base64: base64,
        width: width,
        height: height
    };
}

async function performScrapeStep() {
    ensureInjectedStyles();
    showLmsHud("AUTO-SCRAPER AKTIF", "Membaca soal pada halaman saat ini...", 30);

    chrome.storage.local.get(['scrapedQuestions', 'scrapedQuestionsData'], async (data) => {
        let currentText = data.scrapedQuestions || "";
        let currentData = data.scrapedQuestionsData || [];

        // Efek visual scanner pada pertanyaan di halaman
        let questions = document.querySelectorAll('.que');
        questions.forEach((q, idx) => {
            registerTimer(() => {
                q.style.animation = "lmsSolverScanner 0.8s ease";
                setTimeout(() => { q.style.animation = ""; }, 800);
            }, idx * 150);
        });

        // 1. Baca dan catat soal di halaman saat ini (termasuk gambar jika ada)
        let pageResult = await scrapeCurrentPage();
        let existingNums = new Set(currentData.map(item => String(item.num)));
        let newItems = pageResult.questionItems.filter(item => !existingNums.has(String(item.num)));
        if (newItems.length > 0) {
            currentText += pageResult.textChunk;
            currentData = currentData.concat(newItems);
        }

        // 2. Simpan data sementara ke memori
        chrome.storage.local.set({
            scrapedQuestions: currentText,
            scrapedQuestionsData: currentData
        }, () => {
            if (chrome.runtime.lastError) {
                console.error("LMS Auto-Solver storage error:", chrome.runtime.lastError.message);
            }
            let nextBtn = findNextPageButton();

            if (nextBtn) {
                showLmsHud("AUTO-SCRAPER AKTIF", `Halaman tercatat (${currentData.length} soal)! Menuju halaman berikutnya...`, 70);
                animateNextButtonClick(nextBtn, () => {
                    nextBtn.click();
                });
            } else {
                let finalPromptHeader = "Tolong jawab kuis ini. Berikan jawaban akhirnya saja tanpa penjelasan.\n\n" +
                    "ATURAN FORMAT JAWABAN:\n\n" +
                    "1. Soal Biasa (Pilihan Ganda / True-False): Tulis dengan format `Nomor. HurufOpsi. TeksJawaban` atau `Nomor. HurufOpsi`\n" +
                    "(Sertakan huruf opsi a/b/c/d/e agar akurasi 100%. Contoh: '1. a. Event-based coordination' atau '2. c. Shared data space' atau '3. True').\n" +
                    "2. Soal Pilih Lebih Dari Satu (Checkbox): Pisahkan tiap jawaban benar dengan tanda pipa (`|`). Contoh: `4. a. Opsi 1 | c. Opsi 3`\n" +
                    "3. Soal Menjodohkan / Beranak: Tuliskan setiap pasangan sub-soal dalam satu baris dengan nomor soal utamanya, pisahkan masing-masing sub-soal dengan tanda pipa (`|`).\n" +
                    "Format: `Nomor. a. Sub-soal A: Opsi Jawaban | b. Sub-soal B: Opsi Jawaban | dst...`\n" +
                    "4. Soal Isian Singkat: Tulis langsung `Nomor. Jawaban` (contoh: `5. SDD`).\n\n" +
                    "PENTING: Jangan membuat nomor urut baru untuk sub-soal! Nomor soal kuis berikutnya harus tetap melanjutkan urutan nomor aslinya (misal: setelah Soal 2 beranak, lanjut ke Soal 3).\n\n";

                let finalResult = finalPromptHeader + currentText;
                let hasAnyImages = currentData.some(q => q.images && q.images.some(img => img.base64));
                let totalImages = currentData.reduce((acc, q) => acc + (q.images ? q.images.filter(img => img.base64).length : 0), 0);

                let structuredData = {
                    hasImages: hasAnyImages,
                    totalImages: totalImages,
                    questions: currentData,
                    promptHeader: finalPromptHeader
                };

                chrome.storage.local.set({
                    isAutoScraping: false,
                    scrapeResult: finalResult,
                    scrapeStructuredData: structuredData
                }, () => {
                    chrome.storage.local.remove(['scrapedQuestions', 'scrapedQuestionsData']);
                    if (hasAnyImages) {
                        showLmsHud("SCRAPE SELESAI!", `Berhasil! ${currentData.length} soal (${totalImages} gambar). Menampilkan hasil...`, 100, "SELESAI");
                    } else {
                        showLmsHud("SCRAPE SELESAI!", `Seluruh ${currentData.length} soal berhasil discrape! Menampilkan hasil...`, 100, "SELESAI");
                    }
                    removeLmsHud(2500);

                    // TAMPILKAN POPUP HASIL SCRAPING LANGSUNG DI LAYAR WEB!
                    showInPageScrapeResultModal(finalResult, structuredData);
                    updateFloatingPillStatus(true);
                });
            }
        });
    });
}

async function scrapeCurrentPage() {
    let output = "";
    let questionItems = [];
    let questions = document.querySelectorAll('.que');

    for (let q of questions) {
        let qNum = q.querySelector('.qno')?.innerText.trim() || "?";
        
        let qTextElem = q.querySelector('.qtext');
        let qText = "";
        let images = [];

        if (qTextElem) {
            // Ambil semua gambar di area soal (qtext)
            let imgElements = qTextElem.querySelectorAll('img');
            for (let idx = 0; idx < imgElements.length; idx++) {
                let imgData = await resolveAndFetchQuizImage(imgElements[idx], qNum, "Soal");
                if (imgData) {
                    images.push(imgData);
                }
            }

            let clone = qTextElem.cloneNode(true);
            clone.querySelectorAll('.accesshide, .sr-only').forEach(el => el.remove());
            qText = clone.innerText.trim();
        }

        // Cek juga jika ada gambar di dalam opsi jawaban
        let ansImgElements = q.querySelectorAll('.answer img');
        for (let idx = 0; idx < ansImgElements.length; idx++) {
            let imgData = await resolveAndFetchQuizImage(ansImgElements[idx], qNum, "Opsi");
            if (imgData) {
                images.push(imgData);
            }
        }

        // Deteksi Tipe Soal: Soal Beranak / Menjodohkan (Matching Question)
        let matchRows = Array.from(q.querySelectorAll('table.answer tbody tr, table.answer tr, .ablock table tr'))
            .filter(r => r.querySelector('td.text') !== null);
        let hasSelect = q.querySelector('select') !== null;
        let isMatchQuestion = q.classList.contains('match') || (hasSelect && matchRows.length > 0);

        // Deteksi Tipe Soal: Isian Singkat (Short Answer / Text Input / Numerical)
        let textInput = q.querySelector('.answer input[type="text"], .answer input[type="number"], .answer input:not([type]), .ablock input[type="text"], input[type="text"].form-control, .answer textarea, input[type="text"]');
        let isShortAnswer = q.classList.contains('shortanswer') || q.classList.contains('numerical') || (textInput !== null && !isMatchQuestion && !q.querySelector('input[type="radio"], input[type="checkbox"]'));

        let optionsList = [];

        if (isMatchQuestion && matchRows.length > 0) {
            let qHeader = `Soal ${qNum} (Tipe Menjodohkan / Sub-soal):\n${qText}`;
            if (images.length > 0) {
                qHeader += `\n[Gambar Terlampir: ${images.map(i => i.alt).join(', ')}]`;
            }
            output += `${qHeader}\n\nSub-soal (pasangkan masing-masing dengan pilihan dropdown):\n`;
            let uniqueOptions = new Set();

            matchRows.forEach((row, idx) => {
                let subText = row.querySelector('td.text')?.innerText.trim() || `Sub-soal ${idx + 1}`;
                let letter = getLetterLabel(idx);
                let subLine = `${letter}. ${subText}`;
                output += `${subLine}\n`;
                optionsList.push(subLine);

                let select = row.querySelector('select');
                if (select) {
                    Array.from(select.options).forEach(opt => {
                        let optText = opt.text.trim();
                        if (optText && opt.value !== "0" && !optText.toLowerCase().startsWith('choose')) {
                            uniqueOptions.add(optText);
                        }
                    });
                }
            });

            if (uniqueOptions.size > 0) {
                output += `\nPilihan Dropdown:\n`;
                uniqueOptions.forEach(opt => {
                    output += `- ${opt}\n`;
                    optionsList.push(`Dropdown: ${opt}`);
                });
            }
            output += "\n";
        } else if (isShortAnswer && textInput) {
            // Tipe Soal Isian Singkat (Short Answer)
            let qHeader = `Soal ${qNum} (Tipe Isian Singkat / Short Answer):\n${qText}`;
            if (images.length > 0) {
                qHeader += `\n[Gambar Terlampir: ${images.map(i => i.alt).join(', ')}]`;
            }
            output += `${qHeader}\nJawaban: [Isian Singkat / Ketik Langsung]\n\n`;
            optionsList.push("[Isian Singkat / Short Answer]");
        } else {
            // Tipe Soal Normal (Pilihan Ganda / Checkbox / True-False)
            let isMultiCheckbox = q.querySelectorAll('.answer input[type="checkbox"]').length > 0;
            let qHeader = isMultiCheckbox
                ? `Soal ${qNum} (Tipe Pilih Lebih Dari Satu / Checkbox): ${qText}`
                : `Soal ${qNum}: ${qText}`;
            if (images.length > 0) {
                qHeader += `\n[Gambar Terlampir: ${images.map(i => i.alt).join(', ')}]`;
            }
            output += `${qHeader}\nOpsi:\n`;

            let optNodes = Array.from(q.querySelectorAll('.answer .r0, .answer .r1'));
            if (optNodes.length === 0) {
                optNodes = Array.from(q.querySelectorAll('.answer > div, .answer fieldset > div'));
            }

            let seenOpts = new Set();
            optNodes.forEach((optNode, idx) => {
                let extracted = extractOptionData(optNode);
                let optText = extracted.cleanedText || extracted.rawText;
                if (!optText) return;
                let dedupKey = `${extracted.letter}|${optText.toLowerCase()}`;
                if (seenOpts.has(dedupKey)) return;
                seenOpts.add(dedupKey);

                let displayLetter = extracted.letter ? extracted.letter.toLowerCase() : getLetterLabel(idx);
                let formattedOpt = `${displayLetter}. ${optText}`;
                output += `${formattedOpt}\n`;
                optionsList.push(formattedOpt);
            });
            output += "\n";
        }

        questionItems.push({
            num: qNum,
            text: qText,
            images: images,
            options: optionsList,
            isMatch: isMatchQuestion,
            isShortAnswer: isShortAnswer
        });
    }

    return {
        textChunk: output,
        questionItems: questionItems
    };
}


// ========================================================
// 5. HELPER PENGOLAHAN STRING & PARSER JAWABAN
// ========================================================
// 5. HELPER PENGOLAHAN STRING & PARSER JAWABAN (EXACT & CASE-SENSITIVE)
// ========================================================
// Hapus format Markdown dari output AI (**bold**, __italic__, `code`, heading ###)
function stripMarkdownFormatting(str) {
    if (!str) return "";
    return str
        .replace(/\u00A0/g, ' ')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/^\s*[-*•]\s+/, '')
        .trim();
}

function cleanCompareStr(str) {
    if (!str) return "";
    return stripMarkdownFormatting(str)
        .replace(/["'“”‘’]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

// Normalisasi teks dengan menjaga HURUF BESAR/KECIL (CASE-SENSITIVE) dan bersih dari prefix nomor/huruf
function normalizeExactStr(str) {
    if (!str) return "";
    return str
        .replace(/\u00A0/g, ' ')                // Ganti non-breaking space
        .replace(/^[a-zA-Z0-9]+[.)]\s*/, '')   // Hapus awalan opsi misal "A. ", "a) ", "1. ", "10. "
        .replace(/\s+/g, ' ')                   // Satukan spasi berlebih
        .replace(/\.+$/, '')                   // Hapus titik di akhir jika ada
        .trim();                               // Pertahankan CASE asli (JANGAN toLowerCase)
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Helper untuk format abjad sub-soal (0 -> 'a', 1 -> 'b', 2 -> 'c', ...)
function getLetterLabel(idx) {
    if (idx < 26) {
        return String.fromCharCode(97 + idx);
    }
    let label = "";
    while (idx >= 0) {
        label = String.fromCharCode(97 + (idx % 26)) + label;
        idx = Math.floor(idx / 26) - 1;
    }
    return label;
}

// Helper untuk memecah sub-bagian soal beranak yang dipisahkan pipa (|)
function parsePipeSubPart(part) {
    let p = part.trim();
    let letter = "";
    // Cocokkan pola awalan abjad seperti "a. ", "a) ", "(a) ", "[a] "
    let lMatch = p.match(/^\[?\(?([a-zA-Z0-9]+)\)?[.)\]]\s*(.*)$/);
    let rest = p;
    if (lMatch) {
        letter = lMatch[1].toLowerCase();
        rest = lMatch[2].trim();
    }

    // Pemisah pasangan: ":", "->", "=>", "=", "—", "–"
    let sepMatch = rest.match(/^(.+?)\s*(?::|->|=>|=|—|–)\s*(.+)$/);
    let rawSubName = "";
    let rawTarget = rest;
    if (sepMatch && sepMatch[1].length < 120) {
        rawSubName = sepMatch[1].trim();
        rawTarget = sepMatch[2].trim();
    }

    return {
        original: p,
        letter: letter,
        rawSubName: rawSubName,
        subName: cleanCompareStr(rawSubName),
        rawTarget: rawTarget,
        target: cleanCompareStr(rawTarget),
        consumed: false
    };
}

// Ekstraksi data lengkap tiap node opsi (radio/checkbox)
function extractOptionData(optNode) {
    let radioBtn = optNode.querySelector('input[type="radio"], input[type="checkbox"]');
    
    let letterElem = optNode.querySelector('.answernumber');
    let letterText = "";
    if (letterElem) {
        letterText = letterElem.innerText.replace(/[.\s)]/g, '').trim().toUpperCase();
    }

    let labelDiv = optNode.querySelector('div[data-region="answer-label"] .flex-fill')
        || optNode.querySelector('.flex-fill')
        || optNode.querySelector('label')
        || optNode;

    let rawText = "";
    if (labelDiv) {
        let clone = labelDiv.cloneNode(true);
        // Hapus icon tanpa menghapus tag format styling teks seperti <i>, <em>, <b>
        clone.querySelectorAll('.answernumber, .icon, i.icon, i.fa, i[class*="fa"], .accesshide, .sr-only, .lms-solver-auto-badge, .lms-solver-review-badge').forEach(el => el.remove());
        rawText = clone.innerText.trim();
    } else {
        rawText = optNode.innerText.trim();
    }

    let cleanedText = normalizeExactStr(rawText);

    if (!letterText) {
        let letterMatch = rawText.match(/^([a-zA-Z0-9])[.)]\s*/);
        if (letterMatch) {
            letterText = letterMatch[1].toUpperCase();
        }
    }

    return {
        node: optNode,
        radioBtn: radioBtn,
        letter: letterText,
        rawText: rawText,
        cleanedText: cleanedText
    };
}

// Algoritma Jarak Levenshtein untuk mengukur selisih typo/variasi string
function levenshteinDistance(s1, s2) {
    const m = s1.length, n = s2.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
        }
    }
    return dp[m][n];
}

// Menghitung kemiripan teks tingkat lanjut (Exact Match, Substring Containment, Word-Jaccard, dan Levenshtein)
function computeRefinedSimilarity(rawStr1, rawStr2) {
    if (!rawStr1 || !rawStr2) return 0;
    const s1 = cleanCompareStr(rawStr1);
    const s2 = cleanCompareStr(rawStr2);
    if (s1 === s2) return 1.0;

    // Sinonim True/False (EN <-> ID)
    const trueSet = new Set(['true', 'benar', 'ya', 'yes', 't', 'b']);
    const falseSet = new Set(['false', 'salah', 'tidak', 'no', 'f', 's']);
    if ((trueSet.has(s1) && trueSet.has(s2)) || (falseSet.has(s1) && falseSet.has(s2))) {
        return 1.0;
    }

    // Substring containment boost (misal: "Shared data space (misalnya tuple space)" mengandung "Shared data space")
    if (s1.length >= 4 && s2.length >= 4) {
        if (s1.includes(s2)) {
            return Math.max(0.78, Math.min(0.96, (s2.length / s1.length) * 1.15));
        }
        if (s2.includes(s1)) {
            return Math.max(0.78, Math.min(0.96, (s1.length / s2.length) * 1.15));
        }
    }

    const maxLen = Math.max(s1.length, s2.length);
    const levSim = maxLen === 0 ? 1 : 1 - (levenshteinDistance(s1, s2) / maxLen);

    // Word-level Jaccard similarity
    const w1 = s1.split(/[\s,.-]+/).filter(Boolean);
    const w2 = s2.split(/[\s,.-]+/).filter(Boolean);
    const set2 = new Set(w2);
    const intersection = w1.filter(x => set2.has(x)).length;
    const union = new Set([...w1, ...w2]).size;
    const jaccard = union === 0 ? 0 : intersection / union;

    if (w1.length > 1 && w2.length > 1) {
        // Frasa multi-kata: utamakan kecocokan token agar tidak tertipu kesamaan kata generik di akhir
        return (jaccard * 0.7) + (levSim * 0.3);
    }

    return Math.max(levSim, jaccard);
}

// Parser target baris jawaban untuk membedakan huruf opsi (a/b/c/d/e) dan teks jawaban
function parseEntryTarget(contentStr) {
    let clean = stripMarkdownFormatting(contentStr || "").replace(/^[-*•\s]+/, '').trim();
    let letter = null;
    let text = clean;

    // Pola format: "a. ...", "a) ...", "(a) ...", "[a] ..."
    let lm = clean.match(/^\[?\(?([a-zA-Z0-9])\)?[.)\]]\s*(.*)$/);
    if (lm) {
        letter = lm[1].toUpperCase();
        text = lm[2].trim();
    } else {
        // Pola jika baris hanya berisi huruf/angka opsi saja (misal "A", "a.", "(c)")
        let singleMatch = clean.match(/^\[?\(?([a-zA-Z0-9])\)?[.)\]]?$/);
        if (singleMatch) {
            letter = singleMatch[1].toUpperCase();
            text = "";
        }
    }

    return {
        targetLetter: letter,
        targetText: text,
        raw: contentStr
    };
}

// Menghitung bobot skor kecocokan: Huruf Opsi (50%) + Teks Jawaban (50%)
function calculateOptionMatchScore(parsedTarget, opt) {
    const hasLetter = Boolean(parsedTarget.targetLetter);
    const hasText = Boolean(parsedTarget.targetText && parsedTarget.targetText.trim().length > 0);

    let letterScore = 0;
    let textScore = 0;
    let finalScore = 0;

    if (hasLetter && hasText) {
        letterScore = (opt.letter && opt.letter === parsedTarget.targetLetter) ? 1.0 : 0.0;
        textScore = computeRefinedSimilarity(parsedTarget.targetText, opt.cleanedText);
        finalScore = (letterScore * 0.50) + (textScore * 0.50);
    } else if (hasLetter && !hasText) {
        letterScore = (opt.letter && opt.letter === parsedTarget.targetLetter) ? 1.0 : 0.0;
        finalScore = letterScore;
    } else if (hasText) {
        textScore = computeRefinedSimilarity(parsedTarget.targetText, opt.cleanedText);
        finalScore = textScore;
    }

    const scorePercent = Math.round(finalScore * 100);
    let status = "FAILED";
    if (scorePercent >= 75) {
        status = "VALID";
    } else if (scorePercent >= 45) {
        status = "NEEDS_REVIEW";
    }

    return {
        scorePercent,
        status,
        letterScore,
        textScore
    };
}

// Pencocokan opsi cerdas dengan scoring 50/50 dan validasi status
function findBestNormalOption(optionList, targetRaw) {
    if (!optionList || optionList.length === 0 || !targetRaw) return null;

    let parsedTarget = parseEntryTarget(targetRaw);

    // Hitung skor untuk setiap opsi di dalam optionList
    let scored = optionList.map(opt => {
        let scoreData = calculateOptionMatchScore(parsedTarget, opt);
        return {
            ...opt,
            matchScore: scoreData.scorePercent,
            status: scoreData.status,
            scoreData: scoreData,
            parsedTarget: parsedTarget
        };
    });

    // Urutkan dari skor tertinggi ke terendah
    scored.sort((a, b) => b.matchScore - a.matchScore);
    let best = scored[0];

    // Jika skor tertinggi kurang dari 45%, tandai FAILED
    if (!best || best.matchScore < 45) {
        return {
            node: null,
            radioBtn: null,
            letter: "-",
            rawText: "",
            cleanedText: "",
            matchScore: best ? best.matchScore : 0,
            status: "FAILED",
            parsedTarget: parsedTarget
        };
    }

    return best;
}

function parseAnswersToMap(answersText) {
    let lines = (answersText || "").split('\n').map(l => l.trim()).filter(Boolean);
    let questionMap = {};
    let currentQNum = null;

    lines.forEach(line => {
        // e.g. "1. ..." atau "Soal 1: ..." atau "Question 1. ..."
        let qMatch = line.match(/^(?:soal\s*|question\s*)?(\d+)[.):\s]\s*(.*)/i);
        if (qMatch) {
            currentQNum = qMatch[1];
            let content = qMatch[2].trim();
            if (!questionMap[currentQNum]) {
                questionMap[currentQNum] = { fullText: "", lines: [], pairs: [], flatItems: [], rawItems: [] };
            }
            if (content) {
                questionMap[currentQNum].lines.push(content);
                questionMap[currentQNum].fullText += " " + content;
                addPairOrItem(content, questionMap[currentQNum]);
            }
        } else if (currentQNum) {
            // Baris lanjutan untuk nomor soal yang sama
            questionMap[currentQNum].lines.push(line);
            questionMap[currentQNum].fullText += " " + line;
            addPairOrItem(line, questionMap[currentQNum]);
        }
    });

    return questionMap;
}

function addPairOrItem(line, qObj) {
    let clean = line.replace(/^(?:soal\s*|question\s*)?\d+[.):\s]\s*|^[-*•\s]+/, '').trim();
    // Cek apakah ada pemisah pasangan, misal ":", "->", "=>", "=", atau "—"
    let pair = clean.match(/^(.+?)\s*(?::|->|=>|=|—|–)\s*(.+)$/);
    if (pair && pair[1].length < 120) {
        qObj.pairs.push({
            subName: cleanCompareStr(pair[1]),
            rawTarget: pair[2].trim(),
            target: cleanCompareStr(pair[2])
        });
    }
    qObj.rawItems = qObj.rawItems || [];
    qObj.rawItems.push(clean);
    qObj.flatItems.push(cleanCompareStr(clean));
}

function findOptionForSubQuestion(select, subText, qData, rowIndex) {
    if (!select || !select.options) return null;
    let validOptions = Array.from(select.options).filter(o => o.value !== "0" && !cleanCompareStr(o.text).startsWith('choose'));
    if (validOptions.length === 0) return null;

    let cleanSub = cleanCompareStr(subText);

    // 1. Cek dari pairs berdasarkan kecocokan nama sub-soal
    if (qData && qData.pairs && qData.pairs.length > 0) {
        for (let pair of qData.pairs) {
            if (pair.subName && (cleanSub.includes(pair.subName) || pair.subName.includes(cleanSub))) {
                let targetExact = normalizeExactStr(pair.rawTarget || pair.target);
                
                // Prioritas 1: Exact Match (Case-Sensitive)
                let matchExact = validOptions.find(o => normalizeExactStr(o.text) === targetExact);
                if (matchExact) return matchExact;

                // Prioritas 2: Exact Match dengan normalisasi tanda kutip
                let targetQuotes = targetExact.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
                let matchQuotes = validOptions.find(o => normalizeExactStr(o.text).replace(/[“”]/g, '"').replace(/[‘’]/g, "'") === targetQuotes);
                if (matchQuotes) return matchQuotes;

                // Prioritas 3: Exact Match Case-Insensitive (jika tepat 1 opsi)
                let ciList = validOptions.filter(o => normalizeExactStr(o.text).toLowerCase() === targetExact.toLowerCase());
                if (ciList.length === 1) return ciList[0];
            }
        }
    }

    // 2. Cek secara sekuensial berdasarkan rowIndex pada rawItems
    if (qData && qData.rawItems && qData.rawItems[rowIndex]) {
        let seqTargetExact = normalizeExactStr(qData.rawItems[rowIndex]);
        let matchExact = validOptions.find(o => normalizeExactStr(o.text) === seqTargetExact);
        if (matchExact) return matchExact;

        let ciList = validOptions.filter(o => normalizeExactStr(o.text).toLowerCase() === seqTargetExact.toLowerCase());
        if (ciList.length === 1) return ciList[0];
    }

    // 3. Cek apakah ada opsi yang teksnya persis muncul sebagai kata utuh dalam fullText soal ini
    if (qData && qData.fullText) {
        let exactCandidates = validOptions.filter(o => {
            let optExact = normalizeExactStr(o.text);
            let regex = new RegExp(`(?:^|[\\s,;:])${escapeRegExp(optExact)}(?:$|[\\s,;:.])`);
            return regex.test(qData.fullText);
        });
        if (exactCandidates.length === 1) {
            return exactCandidates[0];
        }
    }

    return null;
}


// ========================================================
// 6. FUNGSI: INJECTOR AUTO-FILL (SMART MATCHING UNTUK SOAL NORMAL & BERANAK)
// ========================================================
function parseRawAnswerEntries(answersText) {
    let lines = (answersText || "").split('\n').map(l => l.trim()).filter(Boolean);
    let parsedEntries = [];

    lines.forEach((rawLine, index) => {
        let line = stripMarkdownFormatting(rawLine);
        if (!line) return;
        let qNum = null;
        let content = line;
        
        let qMatch = line.match(/^(?:soal\s*|question\s*|no\.?\s*)?(\d+)[.):\s]\s*(.*)/i);
        if (qMatch) {
            qNum = qMatch[1];
            content = qMatch[2].trim();
        }

        let cleanContent = (content || line).replace(/^[-*•\s]+/, '').trim();

        // 1. ALUR UTAMA (PRIMARY FLOW): Pemisah pipa '|' untuk soal beranak dalam 1 baris
        let hasPipes = cleanContent.includes('|');
        let pipeItems = [];
        if (hasPipes) {
            let rawParts = cleanContent.split('|').map(p => p.trim()).filter(Boolean);
            pipeItems = rawParts.map(parsePipeSubPart);
        }

        // 2. ALUR CADANGAN (FALLBACK FLOW): Pasangan sub-soal tunggal per baris
        let pairMatch = cleanContent.match(/^(.+?)\s*(?::|->|=>|=|—|–)\s*(.+)$/);
        let pair = null;
        if (pairMatch && pairMatch[1].length < 120) {
            pair = {
                subName: cleanCompareStr(pairMatch[1]),
                rawSubName: pairMatch[1].trim(),
                target: cleanCompareStr(pairMatch[2]),
                rawTarget: pairMatch[2].trim()
            };
        }

        parsedEntries.push({
            index: index,
            originalLine: line,
            qNum: qNum,
            content: content,
            cleanContent: cleanContent,
            hasPipes: hasPipes,
            pipeItems: pipeItems,
            pair: pair,
            consumed: false
        });
    });

    return parsedEntries;
}

function autoFillAndNext() {
    ensureInjectedStyles();
    showLmsHud("AUTO-FILL INJECTOR", "Mempersiapkan pengisian jawaban kuis...", 15);

    chrome.storage.local.get(['savedAnswers', 'consumedEntryIndexes', 'injectAuditLog'], (data) => {
        if (!data.savedAnswers) return;

        let answersText = data.savedAnswers;
        let parsedEntries = parseRawAnswerEntries(answersText);
        let currentAuditLog = Array.isArray(data.injectAuditLog) ? data.injectAuditLog : [];
        
        // Pulihkan entri yang sudah terpakai dari halaman sebelumnya jika ada
        if (Array.isArray(data.consumedEntryIndexes)) {
            data.consumedEntryIndexes.forEach(idx => {
                if (parsedEntries[idx]) parsedEntries[idx].consumed = true;
            });
        }

        let questions = Array.from(document.querySelectorAll('.que'));
        let totalQuestions = questions.length;
        let currentDelay = 300;

        questions.forEach((q, qIndex) => {
            let qNum = q.querySelector('.qno')?.innerText.trim() || (qIndex + 1).toString();
            let percent = Math.round(((qIndex + 1) / totalQuestions) * 85);

            // Deteksi Tipe Soal:
            let matchRows = Array.from(q.querySelectorAll('table.answer tbody tr, table.answer tr, .ablock table tr'))
                .filter(r => r.querySelector('select') !== null);
            let isMatchQuestion = q.classList.contains('match') || matchRows.length > 0;

            // Deteksi Tipe Soal: Isian Singkat (Short Answer / Text Input / Numerical)
            let textInput = q.querySelector('.answer input[type="text"], .answer input[type="number"], .answer input:not([type]), .ablock input[type="text"], input[type="text"].form-control, .answer textarea, input[type="text"]');
            let isShortAnswer = q.classList.contains('shortanswer') || q.classList.contains('numerical') || (textInput !== null && !isMatchQuestion && !q.querySelector('input[type="radio"], input[type="checkbox"]'));

            if (isMatchQuestion && matchRows.length > 0) {
                // ========================================================
                // KONDISI TIPE BARU (SOAL BERANAK / MATCHING QUESTION)
                // ========================================================
                registerTimer(() => {
                    q.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    showLmsHud("AUTO-FILL INJECTOR", `Mengerjakan Soal Beranak No. ${qNum}...`, percent);
                }, currentDelay);

                currentDelay += 350;

                // Loop setiap sub-soal dengan dropdown "Choose"
                matchRows.forEach((row, rIdx) => {
                    let select = row.querySelector('select');
                    let subTextEl = row.querySelector('td.text');
                    let subText = subTextEl ? subTextEl.innerText.trim() : `Sub-soal ${rIdx + 1}`;

                    // Step A: Klik tombol / dropdown "Choose" pada sub-soal
                    registerTimer(() => {
                        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        showLmsHud("AUTO-FILL INJECTOR", `Membuka dropdown "${subText}"...`, percent);
                        if (select) {
                            select.focus();
                            select.click();
                            triggerClickFx(select, '#FFDE59');
                        }
                    }, currentDelay);

                    currentDelay += 350;

                    // Step B: Cari dan klik opsi jawaban di dalam dropdown sesuai data jawaban user
                    registerTimer(() => {
                        let cleanSub = cleanCompareStr(subText);
                        let expectedLetter = getLetterLabel(rIdx);
                        let targetExact = "";

                        // ========================================================
                        // 1. ALUR UTAMA (PRIMARY FLOW): Membaca output dengan tanda pipa '|'
                        // ========================================================
                        let pipeEntry = parsedEntries.find(e => !e.consumed && e.hasPipes && e.qNum === qNum)
                                     || parsedEntries.find(e => !e.consumed && e.hasPipes);

                        if (pipeEntry && pipeEntry.pipeItems && pipeEntry.pipeItems.length > 0) {
                            // Prioritas A: Cocokkan nama sub-soal
                            let matchedPipeItem = pipeEntry.pipeItems.find(item => !item.consumed && item.subName && (cleanSub.includes(item.subName) || item.subName.includes(cleanSub)));
                            // Prioritas B: Cocokkan abjad (a, b, c, ...)
                            if (!matchedPipeItem) {
                                matchedPipeItem = pipeEntry.pipeItems.find(item => !item.consumed && item.letter && item.letter === expectedLetter);
                            }
                            // Prioritas C: Cocokkan urutan baris rIdx
                            if (!matchedPipeItem && pipeEntry.pipeItems[rIdx] && !pipeEntry.pipeItems[rIdx].consumed) {
                                matchedPipeItem = pipeEntry.pipeItems[rIdx];
                            }
                            // Prioritas D: Ambil item unconsumed pertama
                            if (!matchedPipeItem) {
                                matchedPipeItem = pipeEntry.pipeItems.find(item => !item.consumed);
                            }

                            if (matchedPipeItem) {
                                matchedPipeItem.consumed = true;
                                targetExact = normalizeExactStr(matchedPipeItem.rawTarget);
                                if (pipeEntry.pipeItems.every(it => it.consumed)) {
                                    pipeEntry.consumed = true;
                                }
                            }
                        }

                        // ========================================================
                        // 2. ALUR CADANGAN (FALLBACK FLOW): Sistem inject sebelumnya
                        // ========================================================
                        if (!targetExact) {
                            // 1. Cari entry yang belum terkonsumsi yang memiliki nama sub-soal ini
                            let matchedEntry = parsedEntries.find(e => !e.consumed && e.pair && (cleanSub.includes(e.pair.subName) || e.pair.subName.includes(cleanSub)));
                            
                            // 2. Jika tidak ada pair yang cocok berdasarkan nama, cari unconsumed entry dengan qNum === qNum
                            if (!matchedEntry) {
                                matchedEntry = parsedEntries.find(e => !e.consumed && e.qNum === qNum);
                            }

                            // 3. Fallback jika masih belum ada, ambil unconsumed entry pertama yang memiliki pair
                            if (!matchedEntry) {
                                matchedEntry = parsedEntries.find(e => !e.consumed && e.pair);
                            }

                            if (matchedEntry) {
                                matchedEntry.consumed = true;
                                targetExact = normalizeExactStr(matchedEntry.pair ? matchedEntry.pair.rawTarget : matchedEntry.content);
                            }
                        }

                        let validOptions = select ? Array.from(select.options).filter(o => o.value !== "0" && !cleanCompareStr(o.text).startsWith('choose') && !cleanCompareStr(o.text).startsWith('pilih')) : [];
                        let matchedOption = null;
                        let matchConfidence = 100;
                        let matchStatus = "VALID";

                        if (targetExact && validOptions.length > 0) {
                            // Exact Match (Case-Sensitive)
                            matchedOption = validOptions.find(o => normalizeExactStr(o.text) === targetExact);
                            if (!matchedOption) {
                                let targetQuotes = targetExact.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
                                matchedOption = validOptions.find(o => normalizeExactStr(o.text).replace(/[“”]/g, '"').replace(/[‘’]/g, "'") === targetQuotes);
                            }
                            if (!matchedOption) {
                                let ciList = validOptions.filter(o => normalizeExactStr(o.text).toLowerCase() === targetExact.toLowerCase());
                                if (ciList.length === 1) matchedOption = ciList[0];
                            }
                            // Fuzzy fallback jika AI sedikit berbeda tanda baca/kata
                            if (!matchedOption) {
                                let bestSim = 0;
                                let bestOpt = null;
                                validOptions.forEach(o => {
                                    let sim = computeRefinedSimilarity(targetExact, normalizeExactStr(o.text));
                                    if (sim > bestSim) {
                                        bestSim = sim;
                                        bestOpt = o;
                                    }
                                });
                                matchConfidence = Math.round(bestSim * 100);
                                if (bestOpt && bestSim >= 0.75) {
                                    matchedOption = bestOpt;
                                    matchStatus = "VALID";
                                } else if (bestOpt && bestSim >= 0.50) {
                                    matchedOption = bestOpt;
                                    matchStatus = "NEEDS_REVIEW";
                                } else {
                                    matchStatus = "FAILED";
                                }
                            }
                        } else {
                            matchStatus = "FAILED";
                            matchConfidence = 0;
                        }

                        let subAuditKey = `${qNum} (${expectedLetter})`;
                        currentAuditLog = currentAuditLog.filter(item => item.qNum !== subAuditKey);

                        if (select && matchedOption) {
                            select.value = matchedOption.value;
                            matchedOption.selected = true;
                            select.dispatchEvent(new Event('change', { bubbles: true }));
                            select.dispatchEvent(new Event('input', { bubbles: true }));

                            row.classList.remove('lms-solver-highlight-selected', 'lms-solver-highlight-review');
                            row.classList.add(matchStatus === "NEEDS_REVIEW" ? 'lms-solver-highlight-review' : 'lms-solver-highlight-selected');
                            triggerClickFx(select, matchStatus === "NEEDS_REVIEW" ? '#FFDE59' : '#22C55E');

                            row.querySelectorAll('.lms-solver-auto-badge, .lms-solver-review-badge').forEach(b => b.remove());
                            let badge = document.createElement('span');
                            badge.className = matchStatus === "NEEDS_REVIEW" ? 'lms-solver-review-badge' : 'lms-solver-auto-badge';
                            badge.innerText = matchStatus === "NEEDS_REVIEW" ? `CEK ULANG (${matchConfidence}%)` : 'AUTO-FILLED';
                            let targetContainer = row.querySelector('td.control') || row;
                            targetContainer.appendChild(badge);

                            if (matchStatus === "NEEDS_REVIEW") {
                                currentAuditLog.push({
                                    qNum: subAuditKey,
                                    status: "NEEDS_REVIEW",
                                    score: matchConfidence,
                                    selectedLetter: expectedLetter.toUpperCase(),
                                    selectedText: matchedOption.text.trim(),
                                    targetInput: targetExact,
                                    reason: `Kecocokan dropdown ${matchConfidence}% (< 75%) untuk sub-soal "${subText.slice(0, 50)}".`
                                });
                                chrome.storage.local.set({ injectAuditLog: currentAuditLog });
                            }

                            showLmsHud("AUTO-FILL INJECTOR", `Sub-soal "${subText}" -> "${matchedOption.text.trim()}" terisi!`, percent);
                        } else {
                            currentAuditLog.push({
                                qNum: subAuditKey,
                                status: "FAILED",
                                score: matchConfidence,
                                selectedLetter: "-",
                                selectedText: "-",
                                targetInput: targetExact || "(Tidak ada target)",
                                reason: `Dropdown sub-soal "${subText.slice(0, 50)}" tidak menemukan opsi yang cocok.`
                            });
                            chrome.storage.local.set({ injectAuditLog: currentAuditLog });
                            console.log(`[LMS Auto-Solver] Sub-soal "${subText}" tidak menemukan opsi yang cocok.`);
                        }
                    }, currentDelay);

                    // Step C: Diulang untuk sub-soal berikutnya
                    currentDelay += 400;
                });

                // Pastikan jika soal beranak ini menggunakan pipeEntry, entri ditandai consumed setelah semua baris selesai
                registerTimer(() => {
                    let pipeEntry = parsedEntries.find(e => !e.consumed && e.hasPipes && e.qNum === qNum);
                    if (pipeEntry) pipeEntry.consumed = true;
                }, currentDelay);

            } else if (isShortAnswer && textInput) {
                // ========================================================
                // KONDISI TIPE BARU (SOAL ISIAN SINGKAT / SHORT ANSWER)
                // ========================================================
                registerTimer(() => {
                    q.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    showLmsHud("AUTO-FILL INJECTOR", `Mengerjakan Soal Isian No. ${qNum}...`, percent);

                    // 1. Cari entry yang belum terkonsumsi untuk nomor soal ini
                    let matchedEntry = parsedEntries.find(e => !e.consumed && e.qNum === qNum);

                    // Fallback jika tidak ada pencocokan nomor soal yang persis
                    if (!matchedEntry) {
                        matchedEntry = parsedEntries.find(e => !e.consumed && !e.hasPipes && !e.pair);
                    }
                    if (!matchedEntry) {
                        matchedEntry = parsedEntries.find(e => !e.consumed);
                    }

                    // Bersihkan audit log lama untuk soal ini
                    currentAuditLog = currentAuditLog.filter(item => item.qNum !== qNum);

                    if (matchedEntry) {
                        matchedEntry.consumed = true;

                        // Bersihkan teks jawaban (hilangkan prefix "1. ", "Soal 1: ", "Jawaban: ", dll)
                        let answerVal = matchedEntry.content || matchedEntry.cleanContent || matchedEntry.originalLine || "";
                        answerVal = answerVal
                            .replace(/^(?:soal\s*|question\s*)?\d+[.):\s]\s*/i, '')
                            .replace(/^(?:jawaban|answer)\s*[:=]\s*/i, '')
                            .trim();

                        // 1. Fokus & Klik pada kolom input putih
                        textInput.focus();
                        textInput.click();
                        triggerClickFx(textInput, '#FFDE59');

                        // 2. Isi nilai ke input
                        textInput.value = answerVal;

                        // 3. Dispatch event agar Moodle mendeteksi perubahan input dan auto-save
                        textInput.dispatchEvent(new Event('input', { bubbles: true }));
                        textInput.dispatchEvent(new Event('change', { bubbles: true }));
                        textInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));

                        // 4. Efek visual & Neo-brutalist styling
                        textInput.classList.remove('lms-solver-highlight-review');
                        textInput.classList.add('lms-solver-highlight-selected');
                        triggerClickFx(textInput, '#22C55E');

                        // 5. Tambahkan badge AUTO-FILLED
                        let oldBadges = q.querySelectorAll('.lms-solver-auto-badge, .lms-solver-review-badge');
                        oldBadges.forEach(b => b.remove());

                        let badge = document.createElement('span');
                        badge.className = 'lms-solver-auto-badge';
                        badge.innerText = 'AUTO-FILLED';
                        let container = textInput.parentElement || q;
                        container.appendChild(badge);

                        currentAuditLog.push({
                            qNum: qNum,
                            status: "VALID",
                            score: 100,
                            selectedLetter: "-",
                            selectedText: answerVal,
                            targetInput: answerVal,
                            reason: "Soal isian berhasil diisi dan disinkronisasi."
                        });

                        showLmsHud("AUTO-FILL INJECTOR", `Soal No. ${qNum} -> "${answerVal}" Terisi!`, percent);
                    } else {
                        currentAuditLog.push({
                            qNum: qNum,
                            status: "FAILED",
                            score: 0,
                            selectedLetter: "-",
                            selectedText: "-",
                            targetInput: "(Tidak ada input jawaban)",
                            reason: "Tidak ditemukan jawaban untuk soal isian nomor ini."
                        });

                        showLmsHud("AUTO-FILL INJECTOR", `Soal No. ${qNum}: Jawaban tidak ditemukan!`, percent);
                    }

                    chrome.storage.local.set({ injectAuditLog: currentAuditLog });
                }, currentDelay);

                currentDelay += 750;

            } else {
                // ========================================================
                // KONDISI NORMAL (SOAL PILIHAN GANDA / TRUE FALSE)
                // Menggunakan SMART MATCH: Skoring Huruf (50%) + Teks (50%) & Threshold
                // ========================================================
                let optionNodes = Array.from(q.querySelectorAll('.answer .r0, .answer .r1, .answer > div'));

                registerTimer(() => {
                    q.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    showLmsHud("AUTO-FILL INJECTOR", `Mengerjakan Soal No. ${qNum}...`, percent);

                    let optionList = optionNodes.map(optNode => extractOptionData(optNode)).filter(o => o.radioBtn !== null);
                    let isCheckboxQuestion = optionList.length > 0 && optionList.every(o => o.radioBtn && o.radioBtn.type === 'checkbox');

                    // DUKUNGAN KHUSUS: Soal Pilihan Ganda Multi-Jawaban (Checkbox)
                    if (isCheckboxQuestion) {
                        let cbEntry = parsedEntries.find(e => !e.consumed && e.qNum === qNum)
                                   || parsedEntries.find(e => !e.consumed);
                        currentAuditLog = currentAuditLog.filter(item => item.qNum !== qNum);

                        if (cbEntry) {
                            cbEntry.consumed = true;
                            let rawVal = stripMarkdownFormatting(cbEntry.content || cbEntry.cleanContent || "");
                            let parts = rawVal.includes('|')
                                ? rawVal.split('|').map(s => s.trim()).filter(Boolean)
                                : (rawVal.includes(';')
                                    ? rawVal.split(';').map(s => s.trim()).filter(Boolean)
                                    : (/^[a-zA-Z](?:\s*,\s*[a-zA-Z])+$/.test(rawVal)
                                        ? rawVal.split(',').map(s => s.trim()).filter(Boolean)
                                        : [rawVal]));

                            let selectedCount = 0;
                            let minScore = 100;
                            let pickedTexts = [];

                            parts.forEach(partStr => {
                                let m = findBestNormalOption(optionList, partStr);
                                if (m && m.status !== "FAILED" && m.node && m.radioBtn) {
                                    selectedCount++;
                                    minScore = Math.min(minScore, m.matchScore);
                                    pickedTexts.push(m.cleanedText || m.letter);
                                    let opt = m.node;
                                    opt.classList.remove('lms-solver-highlight-review', 'lms-solver-highlight-selected');
                                    opt.classList.add(m.status === "NEEDS_REVIEW" ? 'lms-solver-highlight-review' : 'lms-solver-highlight-selected');
                                    opt.querySelectorAll('.lms-solver-auto-badge, .lms-solver-review-badge').forEach(b => b.remove());
                                    let badge = document.createElement('span');
                                    badge.className = m.status === "NEEDS_REVIEW" ? 'lms-solver-review-badge' : 'lms-solver-auto-badge';
                                    badge.innerText = m.status === "NEEDS_REVIEW" ? `CEK ULANG (${m.matchScore}%)` : 'AUTO-FILLED';
                                    (opt.querySelector('div[data-region="answer-label"]') || opt).appendChild(badge);
                                    triggerClickFx(m.radioBtn, m.status === "NEEDS_REVIEW" ? '#FFDE59' : '#22C55E');
                                    if (!m.radioBtn.checked) m.radioBtn.click();
                                }
                            });

                            if (selectedCount === 0) {
                                currentAuditLog.push({
                                    qNum: qNum,
                                    status: "FAILED",
                                    score: 0,
                                    selectedLetter: "-",
                                    selectedText: "-",
                                    targetInput: rawVal,
                                    reason: "Tidak ada opsi checkbox yang cocok."
                                });
                            } else if (minScore < 75 || selectedCount < parts.length) {
                                currentAuditLog.push({
                                    qNum: qNum,
                                    status: "NEEDS_REVIEW",
                                    score: minScore,
                                    selectedLetter: "-",
                                    selectedText: pickedTexts.join(' | '),
                                    targetInput: rawVal,
                                    reason: `${selectedCount}/${parts.length} opsi checkbox cocok (skor min ${minScore}%).`
                                });
                            }
                            showLmsHud("AUTO-FILL INJECTOR", `Soal Checkbox No. ${qNum}: ${selectedCount} opsi dipilih!`, percent);
                        } else {
                            currentAuditLog.push({
                                qNum: qNum,
                                status: "FAILED",
                                score: 0,
                                selectedLetter: "-",
                                selectedText: "-",
                                targetInput: "(Tidak ada input)",
                                reason: "Tidak ditemukan jawaban untuk soal checkbox ini."
                            });
                        }
                        chrome.storage.local.set({ injectAuditLog: currentAuditLog });
                        return;
                    }

                    let bestMatch = null;
                    let matchedEntry = null;

                    // Cara 1: Cek unconsumed entry yang memiliki nomor soal sama persis (entry.qNum === qNum)
                    let candidateEntry = parsedEntries.find(e => !e.consumed && e.qNum === qNum);
                    if (candidateEntry) {
                        let match = findBestNormalOption(optionList, candidateEntry.content);
                        if (match && match.status !== "FAILED") {
                            bestMatch = match;
                            matchedEntry = candidateEntry;
                            candidateEntry.consumed = true;
                        }
                    }

                    // Cara 2: Jika Cara 1 tidak cocok atau FAILED (misal penomoran bergeser akibat soal beranak),
                    // cari di SELURUH unconsumed entries yang cocok
                    if (!bestMatch) {
                        let topCandidate = null;
                        let topEntry = null;
                        for (let entry of parsedEntries) {
                            if (entry.consumed) continue;
                            let match = findBestNormalOption(optionList, entry.content);
                            if (match && match.status === "VALID") {
                                bestMatch = match;
                                matchedEntry = entry;
                                entry.consumed = true;
                                break;
                            } else if (match && match.status === "NEEDS_REVIEW") {
                                if (!topCandidate || match.matchScore > topCandidate.matchScore) {
                                    topCandidate = match;
                                    topEntry = entry;
                                }
                            }
                        }
                        if (!bestMatch && topCandidate) {
                            bestMatch = topCandidate;
                            matchedEntry = topEntry;
                            topEntry.consumed = true;
                        }
                    }

                    // Pastikan tidak ada data ganda untuk qNum ini di audit log
                    currentAuditLog = currentAuditLog.filter(item => item.qNum !== qNum);

                    if (bestMatch && bestMatch.status === "VALID" && bestMatch.node) {
                        let opt = bestMatch.node;
                        let radioBtn = bestMatch.radioBtn;

                        // Bersihkan kelas highlight & badge review sebelumnya jika ada
                        opt.classList.remove('lms-solver-highlight-review');
                        opt.classList.add('lms-solver-highlight-selected');

                        let oldBadges = opt.querySelectorAll('.lms-solver-auto-badge, .lms-solver-review-badge');
                        oldBadges.forEach(b => b.remove());

                        let badge = document.createElement('span');
                        badge.className = 'lms-solver-auto-badge';
                        badge.innerText = 'AUTO-FILLED';
                        let labelContainer = opt.querySelector('div[data-region="answer-label"]') || opt;
                        labelContainer.appendChild(badge);

                        triggerClickFx(radioBtn || opt, '#22C55E');
                        if (radioBtn && !radioBtn.checked) {
                            radioBtn.click();
                        }

                        showLmsHud("AUTO-FILL INJECTOR", `Soal No. ${qNum} -> "${bestMatch.cleanedText}" Terpilih! (${bestMatch.matchScore}%)`, percent);
                    } else if (bestMatch && bestMatch.status === "NEEDS_REVIEW" && bestMatch.node) {
                        let opt = bestMatch.node;
                        let radioBtn = bestMatch.radioBtn;

                        // Highlight kuning/amber untuk peninjauan
                        opt.classList.remove('lms-solver-highlight-selected');
                        opt.classList.add('lms-solver-highlight-review');

                        let oldBadges = opt.querySelectorAll('.lms-solver-auto-badge, .lms-solver-review-badge');
                        oldBadges.forEach(b => b.remove());

                        let badge = document.createElement('span');
                        badge.className = 'lms-solver-review-badge';
                        badge.innerText = `CEK ULANG (${bestMatch.matchScore}%)`;
                        let labelContainer = opt.querySelector('div[data-region="answer-label"]') || opt;
                        labelContainer.appendChild(badge);

                        triggerClickFx(radioBtn || opt, '#FFDE59');
                        if (radioBtn && !radioBtn.checked) {
                            radioBtn.click();
                        }

                        currentAuditLog.push({
                            qNum: qNum,
                            status: "NEEDS_REVIEW",
                            score: bestMatch.matchScore,
                            selectedLetter: bestMatch.letter || "-",
                            selectedText: bestMatch.cleanedText || "",
                            targetInput: matchedEntry ? matchedEntry.content : (candidateEntry ? candidateEntry.content : ""),
                            reason: `Skor kecocokan ${bestMatch.matchScore}% (< 75%). Opsi terbaik dipilih.`
                        });

                        showLmsHud("AUTO-FILL INJECTOR", `Soal No. ${qNum} -> Perlu Cek Ulang (${bestMatch.matchScore}%)!`, percent);
                    } else {
                        // Status FAILED (< 45% atau tidak ada opsi)
                        currentAuditLog.push({
                            qNum: qNum,
                            status: "FAILED",
                            score: bestMatch ? bestMatch.matchScore : 0,
                            selectedLetter: "-",
                            selectedText: "-",
                            targetInput: candidateEntry ? candidateEntry.content : "(Tidak ada input cocok)",
                            reason: "Tidak ada opsi yang cukup cocok (< 45%). Opsi dilewati."
                        });

                        console.log(`[LMS Auto-Solver] Soal ${qNum} tidak menemukan opsi yang cocok (< 45%).`);
                        showLmsHud("AUTO-FILL INJECTOR", `Soal No. ${qNum}: Dilewati (Tidak Cocok)!`, percent);
                    }

                    // Simpan akumulasi audit log ke local storage
                    chrome.storage.local.set({ injectAuditLog: currentAuditLog });
                }, currentDelay);

                currentDelay += 750;
            }
        });

        // 4. NAVIGASI: Setelah semua sub-soal/soal pada halaman tersebut selesai dijawab
        registerTimer(() => {
            // Simpan indeks entry yang sudah terkonsumsi untuk halaman berikutnya
            let consumedIndexes = parsedEntries.filter(e => e.consumed).map(e => e.index);
            chrome.storage.local.set({ 
                consumedEntryIndexes: consumedIndexes,
                injectAuditLog: currentAuditLog
            });

            let nextBtn = findNextPageButton();
            if (nextBtn) {
                showLmsHud("AUTO-FILL INJECTOR", "Semua soal terisi! Menuju halaman berikutnya...", 92);
                
                animateNextButtonClick(nextBtn, () => {
                    nextBtn.click();
                });
            } else {
                chrome.storage.local.set({ isAutoFilling: false });
                chrome.storage.local.remove(['savedAnswers', 'consumedEntryIndexes', 'isAutoFilling']);
                let issues = currentAuditLog.filter(it => it.status === "NEEDS_REVIEW" || it.status === "FAILED");
                if (issues.length > 0) {
                    showLmsHud("AUTO-FILL SELESAI!", `Selesai! Catatan: Ada ${issues.length} soal butuh cek ulang. Buka ekstensi!`, 100, "SELESAI");
                } else {
                    showLmsHud("AUTO-FILL SELESAI!", "Semua halaman selesai diisi 100%! Silakan klik 'Finish attempt'.", 100, "SELESAI");
                }
                removeLmsHud(4000);
            }
        }, currentDelay + 600);
    });
}

// Fungsi Khusus: Animasi Klik pada Tombol "Next page" di LMS (Dengan Timer Terdaftar)
function animateNextButtonClick(nextBtn, onComplete) {
    if (!nextBtn) {
        if (onComplete) onComplete();
        return;
    }

    window.__currentActiveNextBtn = nextBtn;

    // 1. Scroll tombol Next page ke tengah layar
    nextBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // 2. Tambahkan class highlight bercahaya pada tombol
    nextBtn.classList.add('lms-solver-btn-next-active');

    // 3. Tambahkan tag melayang di atas tombol: "PINDAH HALAMAN..."
    let countdownBadge = document.createElement('div');
    countdownBadge.className = 'lms-solver-next-countdown';
    countdownBadge.innerText = 'PINDAH HALAMAN...';
    
    if (nextBtn.parentElement) {
        nextBtn.parentElement.style.position = 'relative';
        nextBtn.parentElement.appendChild(countdownBadge);
    }

    // 4. Efek partikel dan ripple pada tombol Next
    triggerClickFx(nextBtn, '#FFDE59');

    // 5. Animasi tactile press down sebelum click
    registerTimer(() => {
        nextBtn.classList.add('lms-solver-btn-pressed');
        triggerClickFx(nextBtn, '#FFDE59');
        
        registerTimer(() => {
            window.__currentActiveNextBtn = null;
            if (onComplete) onComplete();
        }, 300);
    }, 1000);
}


// ========================================================
// 7. FUNGSI: SCRAPER HASIL KUIS / REVIEW
// ========================================================
function scrapeQuizReview() {
    ensureInjectedStyles();
    showLmsHud("REVIEW SCRAPER", "Mengekstrak nilai & kunci jawaban kuis...", 50);

    // 1. Ekstrak data ringkasan review kuis (Summary Table)
    let summary = {
        status: "",
        started: "",
        completed: "",
        duration: "",
        marks: "",
        grade: ""
    };

    let summaryTable = document.querySelector('table.quizreviewsummary');
    if (summaryTable) {
        let rows = summaryTable.querySelectorAll('tr');
        rows.forEach(tr => {
            let th = tr.querySelector('th')?.innerText.trim().toLowerCase() || "";
            let td = tr.querySelector('td')?.innerText.trim() || "";

            if (th.includes('status')) summary.status = td;
            else if (th.includes('started') || th.includes('mulai')) summary.started = td;
            else if (th.includes('completed') || th.includes('selesai')) summary.completed = td;
            else if (th.includes('duration') || th.includes('waktu') || th.includes('durasi')) summary.duration = td;
            else if (th.includes('marks') || th.includes('tanda') || th.includes('poin')) summary.marks = td;
            else if (th.includes('grade') || th.includes('nilai')) summary.grade = td;
        });
    }

    // 2. Ekstrak seluruh pertanyaan kuis
    let questionElements = document.querySelectorAll('.que');
    if (!questionElements || questionElements.length === 0) {
        removeLmsHud(500);
        return {
            success: false,
            message: "Tidak ditemukan soal kuis di halaman ini. Pastikan Anda membuka halaman Review Kuis (review.php) di LMS Telkom University."
        };
    }

    let questionsData = [];
    let quickAnswerKeyList = [];
    let correctCount = 0;
    let incorrectCount = 0;

    questionElements.forEach((q, idx) => {
        let qNum = q.querySelector('.qno')?.innerText.trim() 
            || q.querySelector('h3.no')?.innerText.replace(/Question|Soal/i, '').trim() 
            || (idx + 1).toString();

        let qTextElem = q.querySelector('.qtext');
        let qText = "";
        if (qTextElem) {
            let clone = qTextElem.cloneNode(true);
            clone.querySelectorAll('.accesshide, .sr-only').forEach(el => el.remove());
            qText = clone.innerText.trim();
        }

        let state = q.querySelector('.state')?.innerText.trim() || "";
        let grade = q.querySelector('.grade')?.innerText.trim() || "";
        let stateLower = state.toLowerCase();
        let isExplicitIncorrect = q.classList.contains('incorrect')
            || q.classList.contains('partiallycorrect')
            || q.classList.contains('notanswered')
            || stateLower.includes('incorrect')
            || stateLower.includes('salah')
            || stateLower.includes('partially')
            || stateLower.includes('sebagian')
            || stateLower.includes('not answered')
            || stateLower.includes('belum');
        let isQuestionCorrect = !isExplicitIncorrect && (
            q.classList.contains('correct')
            || stateLower === 'correct'
            || stateLower === 'benar'
            || (/\bcorrect\b/.test(stateLower) && !stateLower.includes('incorrect'))
            || stateLower.includes('benar')
        );

        // Deteksi apakah ini soal matching pada review
        let matchRows = Array.from(q.querySelectorAll('table.answer tbody tr, table.answer tr, .ablock table tr'))
            .filter(r => r.querySelector('td.text') !== null);
        let isMatchQuestion = q.classList.contains('match') || matchRows.length > 0;

        // Deteksi tipe isian singkat (short answer) pada review
        let textInput = q.querySelector('.answer input[type="text"], .answer input[type="number"], .answer input:not([type]), .ablock input[type="text"], input[type="text"].form-control, .answer textarea, input[type="text"]');
        let isShortAnswer = q.classList.contains('shortanswer') || q.classList.contains('numerical') || (textInput !== null && !isMatchQuestion && !q.querySelector('input[type="radio"], input[type="checkbox"]'));

        let options = [];
        let correctAnswerText = "";
        let correctOptionLetter = "";
        let studentSelectedAnswer = "";
        let studentSelectedLetter = "";

        if (isMatchQuestion && matchRows.length > 0) {
            let matchPairs = [];
            matchRows.forEach((row, rIdx) => {
                let subName = row.querySelector('td.text')?.innerText.trim() || "";
                let chosenSelect = row.querySelector('select');
                let chosenText = "";
                if (chosenSelect) {
                    chosenText = chosenSelect.options[chosenSelect.selectedIndex]?.text.trim() || "";
                } else {
                    chosenText = row.querySelector('td.control')?.innerText.trim() || "";
                }
                matchPairs.push(`${getLetterLabel(rIdx)}. ${subName}: ${chosenText}`);
            });
            studentSelectedAnswer = matchPairs.join(' | ');

            let rightAnswerNode = q.querySelector('.rightanswer, .outcome .feedback, .specificfeedback');
            if (rightAnswerNode) {
                correctAnswerText = rightAnswerNode.innerText
                    .replace(/^(the correct answer is:?|jawaban yang benar adalah:?|correct answer:?)\s*/i, '')
                    .trim();
            } else if (isQuestionCorrect) {
                correctAnswerText = studentSelectedAnswer;
            }
        } else if (isShortAnswer && textInput) {
            let studentVal = textInput.value || textInput.getAttribute('value') || "";
            studentSelectedAnswer = studentVal;

            let rightAnswerNode = q.querySelector('.rightanswer, .outcome .feedback, .specificfeedback');
            if (rightAnswerNode) {
                correctAnswerText = rightAnswerNode.innerText
                    .replace(/^(the correct answer is:?|jawaban yang benar adalah:?|correct answer:?)\s*/i, '')
                    .trim();
            } else if (isQuestionCorrect) {
                correctAnswerText = studentSelectedAnswer;
            }

            if (isQuestionCorrect) {
                textInput.classList.add('lms-solver-highlight-selected');
                let existingBadge = q.querySelector('.lms-solver-auto-badge');
                if (!existingBadge) {
                    let badge = document.createElement('span');
                    badge.className = 'lms-solver-auto-badge';
                    badge.innerText = 'KUNCI BENAR';
                    let container = textInput.parentElement || q;
                    container.appendChild(badge);
                }
            }
        } else {
            let optNodes = q.querySelectorAll('.answer .r0, .answer .r1');
            if (optNodes.length === 0) {
                optNodes = q.querySelectorAll('.answer > div, .answer fieldset > div');
            }

            optNodes.forEach(optNode => {
                let letterText = optNode.querySelector('.answernumber')?.innerText.replace(/[.\s]/g, '').trim() || "";

                let labelDiv = optNode.querySelector('div[data-region="answer-label"] .flex-fill')
                    || optNode.querySelector('.flex-fill')
                    || optNode.querySelector('label')
                    || optNode;

                let optCleanText = "";
                if (labelDiv) {
                    let clone = labelDiv.cloneNode(true);
                    // Hapus icon tanpa menghapus tag format styling teks seperti <i>, <em>, <b>
                    clone.querySelectorAll('.answernumber, .icon, i.icon, i.fa, i[class*="fa"], .accesshide, .sr-only, .lms-solver-auto-badge, .lms-solver-review-badge').forEach(el => el.remove());
                    optCleanText = clone.innerText.trim();
                }

                let radio = optNode.querySelector('input[type="radio"], input[type="checkbox"]');
                let isSelected = radio ? radio.checked : false;
                if (isSelected) {
                    studentSelectedAnswer = optCleanText;
                    studentSelectedLetter = letterText;
                }

                let isOptCorrect = false;
                let checkIcon = optNode.querySelector('.fa-circle-check, .fa-check, [title="Correct"], [aria-label="Correct"], .text-success');
                
                if (optNode.classList.contains('correct') || checkIcon !== null) {
                    isOptCorrect = true;
                } else if (isQuestionCorrect && isSelected) {
                    isOptCorrect = true;
                }

                let isOptIncorrect = optNode.classList.contains('incorrect') || optNode.querySelector('.fa-times, .fa-circle-xmark, [title="Incorrect"], [aria-label="Incorrect"], .text-danger') !== null;

                options.push({
                    letter: letterText,
                    text: optCleanText,
                    isSelected: isSelected,
                    isCorrect: isOptCorrect,
                    isIncorrect: isOptIncorrect
                });

                if (isOptCorrect && !correctAnswerText) {
                    correctAnswerText = optCleanText;
                    correctOptionLetter = letterText;

                    optNode.classList.add('lms-solver-highlight-selected');
                    let existingBadge = optNode.querySelector('.lms-solver-auto-badge');
                    if (!existingBadge) {
                        let badge = document.createElement('span');
                        badge.className = 'lms-solver-auto-badge';
                        badge.innerText = 'KUNCI BENAR';
                        let labelContainer = optNode.querySelector('div[data-region="answer-label"]') || optNode;
                        labelContainer.appendChild(badge);
                    }
                }
            });

            let rightAnswerNode = q.querySelector('.rightanswer, .outcome .feedback, .specificfeedback');
            if (!correctAnswerText && rightAnswerNode) {
                let rawRightText = rightAnswerNode.innerText.trim();
                let cleanedRight = rawRightText
                    .replace(/^(the correct answer is:?|jawaban yang benar adalah:?|correct answer:?)\s*/i, '')
                    .trim();

                if (cleanedRight) {
                    correctAnswerText = cleanedRight;

                    options.forEach(opt => {
                        if (opt.text && (cleanedRight.toLowerCase().includes(opt.text.toLowerCase()) || opt.text.toLowerCase().includes(cleanedRight.toLowerCase()))) {
                            opt.isCorrect = true;
                            if (!correctOptionLetter) correctOptionLetter = opt.letter;
                        }
                    });
                }
            }

            if (!correctAnswerText && isQuestionCorrect && studentSelectedAnswer) {
                correctAnswerText = studentSelectedAnswer;
                correctOptionLetter = studentSelectedLetter;
            }
        }

        if (isQuestionCorrect) {
            correctCount++;
        } else {
            incorrectCount++;
        }

        questionsData.push({
            number: qNum,
            text: qText,
            state: state,
            grade: grade,
            isCorrect: isQuestionCorrect,
            options: options,
            correctAnswer: correctAnswerText,
            correctLetter: correctOptionLetter,
            studentAnswer: studentSelectedAnswer,
            studentLetter: studentSelectedLetter
        });

        let answerForQuick = correctAnswerText || studentSelectedAnswer || "(Tidak terdeteksi)";
        let letterPrefix = (correctOptionLetter && !isMatchQuestion && !isShortAnswer)
            ? `${correctOptionLetter.toLowerCase()}. `
            : "";
        quickAnswerKeyList.push(`${qNum}. ${letterPrefix}${answerForQuick}`);
    });

    let quickAnswerKey = quickAnswerKeyList.join('\n');

    // 3. Bangun Laporan Lengkap
    let fullReport = "";
    fullReport += "========================================================\n";
    fullReport += "         LMS QUIZ REVIEW - HASIL & KUNCI JAWABAN        \n";
    fullReport += "========================================================\n";
    if (summary.grade)     fullReport += `Nilai Akhir : ${summary.grade}\n`;
    if (summary.marks)     fullReport += `Total Poin  : ${summary.marks}\n`;
    if (summary.status)    fullReport += `Status      : ${summary.status}\n`;
    if (summary.duration)  fullReport += `Waktu Kerja : ${summary.duration}\n`;
    if (summary.completed) fullReport += `Selesai     : ${summary.completed}\n`;
    fullReport += `Statistik   : ${questionsData.length} Soal (${correctCount} Benar, ${incorrectCount} Salah)\n`;
    fullReport += "========================================================\n\n";

    questionsData.forEach(q => {
        fullReport += `--------------------------------------------------------\n`;
        fullReport += `[SOAL NO. ${q.number}] ${q.state ? `(${q.state} - ${q.grade})` : ""}\n`;
        fullReport += `Pertanyaan :\n${q.text}\n\n`;
        if (q.options && q.options.length > 0) {
            fullReport += `Pilihan Jawaban :\n`;
            q.options.forEach(opt => {
                let statusMark = "   ";
                if (opt.isCorrect) statusMark = "[KUNCI BENAR] ";
                else if (opt.isSelected) statusMark = "[DIPILIH]     ";
                
                let optLabel = opt.letter ? `${opt.letter}. ` : "- ";
                fullReport += `  ${statusMark}${optLabel}${opt.text}\n`;
            });
            fullReport += `\n`;
        }
        fullReport += `>>> Kunci Jawaban : ${q.correctAnswer ? `${q.correctLetter ? q.correctLetter + '. ' : ''}${q.correctAnswer}` : '(Belum terdeteksi)'}\n`;
        if (q.studentAnswer && q.studentAnswer !== q.correctAnswer) {
            fullReport += `>>> Jawaban Anda  : ${q.studentLetter ? q.studentLetter + '. ' : ''}${q.studentAnswer} (Salah)\n`;
        }
        fullReport += `\n`;
    });

    showLmsHud("REVIEW SUKSES!", `Berhasil ekstrak ${questionsData.length} soal! Nilai: ${summary.grade || '100'}`, 100, "SELESAI");
    removeLmsHud(3500);

    return {
        success: true,
        summary: summary,
        totalQuestions: questionsData.length,
        correctCount: correctCount,
        incorrectCount: incorrectCount,
        questions: questionsData,
        quickAnswerKey: quickAnswerKey,
        fullReport: fullReport
    };
}