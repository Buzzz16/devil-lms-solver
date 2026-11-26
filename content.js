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
    if (!document.getElementById('lms-solver-google-fonts') && document.head) {
        const fontPre1 = document.createElement('link');
        fontPre1.rel = 'preconnect';
        fontPre1.href = 'https://fonts.googleapis.com';
        const fontPre2 = document.createElement('link');
        fontPre2.rel = 'preconnect';
        fontPre2.href = 'https://fonts.gstatic.com';
        fontPre2.crossOrigin = 'anonymous';
        const fontLink = document.createElement('link');
        fontLink.id = 'lms-solver-google-fonts';
        fontLink.rel = 'stylesheet';
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800;900&family=JetBrains+Mono:wght@600;700&display=swap';
        document.head.appendChild(fontPre1);
        document.head.appendChild(fontPre2);
        document.head.appendChild(fontLink);
    }

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

        /* --- IN-PAGE TUCKII NEO-BRUTALISM OVERLAY & POPUP SYSTEM --- */
        #lms-solver-hud,
        #lms-solver-hud *,
        #lms-solver-modal-overlay,
        #lms-solver-modal-overlay *,
        #lms-solver-floating-pill,
        #lms-solver-floating-pill *,
        #lms-solver-floating-menu,
        #lms-solver-floating-menu *,
        #lms-inpage-toast,
        #lms-inpage-toast * {
            box-sizing: border-box !important;
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        }

        #lms-solver-modal-overlay .lms-mono,
        #lms-solver-modal-overlay .lms-neo-textarea,
        #lms-solver-modal-overlay .lms-preview-content,
        #lms-solver-modal-overlay .lms-report-pre,
        #lms-solver-modal-overlay code {
            font-family: 'JetBrains Mono', Consolas, Monaco, monospace !important;
        }

        .lms-neo-svg {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            flex-shrink: 0 !important;
            vertical-align: middle !important;
        }

        #lms-solver-modal-overlay {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: rgba(0, 0, 0, 0.62) !important;
            backdrop-filter: blur(4px) !important;
            z-index: 99999999 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 16px !important;
            animation: lmsSolverFadeIn 0.18s ease-out forwards !important;
        }

        @keyframes lmsSolverFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes lmsSolverModalPop {
            0% { transform: scale(0.92) translateY(10px); opacity: 0; }
            75% { transform: scale(1.015) translateY(-2px); opacity: 1; }
            100% { transform: scale(1) translateY(0); opacity: 1; }
        }

        /* Custom Neo-Brutalist Scrollbar inside Modal */
        .lms-modal-body::-webkit-scrollbar,
        .lms-preview-content::-webkit-scrollbar,
        .lms-report-pre::-webkit-scrollbar,
        .lms-detail-scroll::-webkit-scrollbar {
            width: 7px !important;
        }
        .lms-modal-body::-webkit-scrollbar-track,
        .lms-preview-content::-webkit-scrollbar-track,
        .lms-report-pre::-webkit-scrollbar-track,
        .lms-detail-scroll::-webkit-scrollbar-track {
            background: #FAF7F2 !important;
            border-left: 2px solid #000000 !important;
        }
        .lms-modal-body::-webkit-scrollbar-thumb,
        .lms-preview-content::-webkit-scrollbar-thumb,
        .lms-report-pre::-webkit-scrollbar-thumb,
        .lms-detail-scroll::-webkit-scrollbar-thumb {
            background: #FFDE59 !important;
            border: 2px solid #000000 !important;
            border-radius: 4px !important;
        }

        .lms-neo-modal {
            background: #FAF7F2 !important;
            border: 2.5px solid #000000 !important;
            border-radius: 14px !important;
            box-shadow: 6px 6px 0px #000000 !important;
            width: 100% !important;
            max-width: 440px !important;
            max-height: 88vh !important;
            display: flex !important;
            flex-direction: column !important;
            color: #111827 !important;
            overflow: hidden !important;
            animation: lmsSolverModalPop 0.24s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards !important;
            position: relative !important;
        }

        /* Top Hero Bar (matches popup.html) */
        .lms-modal-topbar {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            padding: 12px 14px 10px 14px !important;
            background: #FAF7F2 !important;
            border-bottom: 2.5px solid #000000 !important;
        }

        .lms-hero-brand {
            display: flex !important;
            align-items: center !important;
            gap: 10px !important;
        }

        .lms-hero-logo-box {
            width: 38px !important;
            height: 38px !important;
            background: #FFDE59 !important;
            border: 2.5px solid #000000 !important;
            border-radius: 10px !important;
            box-shadow: 2.5px 2.5px 0px #000000 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            flex-shrink: 0 !important;
        }

        .lms-hero-title-wrap {
            display: flex !important;
            flex-direction: column !important;
            gap: 2px !important;
        }

        .lms-hero-title {
            font-size: 17px !important;
            font-weight: 900 !important;
            line-height: 1.05 !important;
            letter-spacing: -0.5px !important;
            color: #000000 !important;
            margin: 0 !important;
        }

        .lms-hero-sub {
            display: inline-flex !important;
            align-items: center !important;
            gap: 5px !important;
            font-size: 10px !important;
            font-weight: 800 !important;
            color: #374151 !important;
        }

        .lms-status-dot {
            width: 8px !important;
            height: 8px !important;
            border-radius: 50% !important;
            border: 1.5px solid #000000 !important;
            background: #4ADE80 !important;
            display: inline-block !important;
        }
        .lms-status-dot.pink { background: #FF6B8B !important; }
        .lms-status-dot.yellow { background: #FFDE59 !important; }

        .lms-icon-btn {
            width: 34px !important;
            height: 34px !important;
            background: #FFFFFF !important;
            border: 2.5px solid #000000 !important;
            border-radius: 10px !important;
            box-shadow: 2.5px 2.5px 0px #000000 !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            cursor: pointer !important;
            color: #000000 !important;
            padding: 0 !important;
            transition: all 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
        }
        .lms-icon-btn:hover {
            background: #FF4757 !important;
            color: #FFFFFF !important;
            transform: translate(-1.5px, -1.5px) !important;
            box-shadow: 4px 4px 0px #000000 !important;
        }
        .lms-icon-btn:active {
            transform: translate(2px, 2px) !important;
            box-shadow: 1px 1px 0px #000000 !important;
        }

        /* 3-Feature Mode Switcher Bar (Tuckii Tabs) */
        .lms-mode-nav {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 6px !important;
            padding: 8px 14px !important;
            background: #FFFFFF !important;
            border-bottom: 2.5px solid #000000 !important;
        }

        .lms-mode-tab {
            padding: 6px 6px !important;
            border: 2px solid #000000 !important;
            border-radius: 8px !important;
            background: #FAF7F2 !important;
            color: #111827 !important;
            font-size: 10px !important;
            font-weight: 900 !important;
            letter-spacing: 0.2px !important;
            cursor: pointer !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 5px !important;
            box-shadow: 2px 2px 0px #000000 !important;
            transition: all 0.12s ease !important;
            white-space: nowrap !important;
        }
        .lms-mode-tab:hover {
            transform: translate(-1px, -1px) !important;
            box-shadow: 3px 3px 0px #000000 !important;
        }
        .lms-mode-tab.active-attempt { background: #4ADE80 !important; color: #000000 !important; }
        .lms-mode-tab.active-inject { background: #818CF8 !important; color: #000000 !important; }
        .lms-mode-tab.active-review { background: #FF6B8B !important; color: #000000 !important; }

        .lms-modal-body {
            padding: 22px 14px 14px 14px !important;
            overflow-y: auto !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 12px !important;
        }

        /* Tuckii Folder Card (1:1 match with popup.html) */
        .lms-folder-card {
            position: relative !important;
            margin-top: 6px !important;
        }

        .lms-folder-tab {
            position: absolute !important;
            top: -15px !important;
            left: 10px !important;
            height: 18px !important;
            padding: 0 10px !important;
            border: 2.5px solid #000000 !important;
            border-bottom: none !important;
            border-radius: 7px 7px 0 0 !important;
            font-size: 9px !important;
            font-weight: 900 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.5px !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 4px !important;
            z-index: 1 !important;
            color: #000000 !important;
        }
        .lms-folder-card.card-attempt .lms-folder-tab { background: #4ADE80 !important; }
        .lms-folder-card.card-inject .lms-folder-tab { background: #818CF8 !important; }
        .lms-folder-card.card-review .lms-folder-tab { background: #FF6B8B !important; }

        .lms-folder-card-body {
            position: relative !important;
            background: #FFFFFF !important;
            border: 2.5px solid #000000 !important;
            border-radius: 12px !important;
            box-shadow: 4px 4px 0px #000000 !important;
            padding: 13px !important;
            z-index: 2 !important;
        }

        .lms-card-header-row {
            display: flex !important;
            justify-content: space-between !important;
            align-items: flex-start !important;
            margin-bottom: 8px !important;
        }

        .lms-card-icon-box {
            width: 38px !important;
            height: 38px !important;
            border: 2.5px solid #000000 !important;
            border-radius: 9px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            box-shadow: 2.5px 2.5px 0px #000000 !important;
            color: #000000 !important;
        }
        .card-attempt .lms-card-icon-box { background: #4ADE80 !important; }
        .card-inject .lms-card-icon-box { background: #818CF8 !important; }
        .card-review .lms-card-icon-box { background: #FF6B8B !important; }

        .lms-card-meta-pill {
            display: inline-flex !important;
            align-items: center !important;
            gap: 5px !important;
            font-size: 10.5px !important;
            font-weight: 800 !important;
            color: #374151 !important;
        }

        .lms-badge-pill {
            background: #FFDE59 !important;
            color: #000000 !important;
            border: 1.5px solid #000000 !important;
            padding: 1.5px 6px !important;
            border-radius: 5px !important;
            font-size: 9px !important;
            font-weight: 900 !important;
            letter-spacing: 0.4px !important;
            box-shadow: 1.5px 1.5px 0px #000000 !important;
        }
        .lms-badge-pill.pink { background: #FF6B8B !important; }
        .lms-badge-pill.green { background: #4ADE80 !important; }

        .lms-card-title {
            font-size: 15px !important;
            font-weight: 900 !important;
            letter-spacing: -0.3px !important;
            margin: 0 0 3px 0 !important;
            color: #000000 !important;
        }

        .lms-card-desc {
            font-size: 11px !important;
            font-weight: 600 !important;
            color: #4B5563 !important;
            line-height: 1.4 !important;
            margin: 0 0 10px 0 !important;
        }

        /* Scrape Status Alert (matches .scrape-image-alert in popup.html) */
        .lms-scrape-alert {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            background: #FFF0A8 !important;
            border: 2px solid #000000 !important;
            border-radius: 8px !important;
            padding: 8px 10px !important;
            margin-bottom: 10px !important;
            font-size: 11px !important;
            font-weight: 800 !important;
            line-height: 1.35 !important;
            box-shadow: 2px 2px 0px #000000 !important;
            color: #000000 !important;
        }
        .lms-scrape-alert.green {
            background: #BBF7D0 !important;
        }
        .lms-scrape-alert.pink {
            background: #FECDD3 !important;
        }

        /* Neo-Brutalist Buttons (matches .neo-btn in popup.html) */
        .lms-neo-btn {
            width: 100% !important;
            padding: 10px 12px !important;
            border: 2.5px solid #000000 !important;
            border-radius: 9px !important;
            box-shadow: 4px 4px 0px #000000 !important;
            font-size: 12px !important;
            font-weight: 900 !important;
            letter-spacing: -0.2px !important;
            cursor: pointer !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 7px !important;
            transition: all 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
            text-decoration: none !important;
            user-select: none !important;
            color: #000000 !important;
            background: #FFFFFF !important;
        }
        .lms-neo-btn:hover:not(:disabled) {
            transform: translate(-1.5px, -1.5px) !important;
            box-shadow: 5px 5px 0px #000000 !important;
        }
        .lms-neo-btn:active:not(:disabled) {
            transform: translate(2px, 2px) !important;
            box-shadow: 1px 1px 0px #000000 !important;
        }
        .lms-neo-btn:disabled {
            opacity: 0.65 !important;
            cursor: not-allowed !important;
        }
        .lms-neo-btn.btn-green { background: #4ADE80 !important; color: #000000 !important; }
        .lms-neo-btn.btn-yellow { background: #FFDE59 !important; color: #000000 !important; }
        .lms-neo-btn.btn-purple { background: #818CF8 !important; color: #000000 !important; }
        .lms-neo-btn.btn-pink { background: #FF6B8B !important; color: #000000 !important; }
        .lms-neo-btn.btn-white { background: #FFFFFF !important; color: #000000 !important; }

        .lms-btn-group-row {
            display: flex !important;
            gap: 8px !important;
            width: 100% !important;
            margin-top: 8px !important;
        }
        .lms-btn-group-row .lms-neo-btn {
            flex: 1 !important;
            padding: 9px 8px !important;
            font-size: 11.5px !important;
        }

        /* Quick Chips & Textarea (matches Card 2 in popup.html) */
        .lms-textarea-quick-bar {
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 6px !important;
            margin-bottom: 8px !important;
        }

        .lms-quick-chip {
            padding: 4px 9px !important;
            border: 1.5px solid #000000 !important;
            border-radius: 6px !important;
            background: #FFFFFF !important;
            font-size: 10px !important;
            font-weight: 800 !important;
            cursor: pointer !important;
            box-shadow: 1.5px 1.5px 0px #000000 !important;
            transition: all 0.1s ease !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 4px !important;
            color: #000000 !important;
        }
        .lms-quick-chip:hover {
            transform: translate(-1px, -1px) !important;
            box-shadow: 2.5px 2.5px 0px #000000 !important;
            background: #FFF0A8 !important;
        }
        .lms-quick-chip:active {
            transform: translate(1px, 1px) !important;
            box-shadow: 0px 0px 0px #000000 !important;
        }

        .lms-neo-textarea {
            width: 100% !important;
            height: 135px !important;
            background: #FFFDF9 !important;
            border: 2.5px solid #000000 !important;
            border-radius: 9px !important;
            box-shadow: 2.5px 2.5px 0px #000000 !important;
            padding: 9px 10px !important;
            font-size: 11px !important;
            font-weight: 600 !important;
            line-height: 1.45 !important;
            resize: vertical !important;
            outline: none !important;
            color: #111827 !important;
            margin-bottom: 8px !important;
        }
        .lms-neo-textarea:focus {
            box-shadow: 4px 4px 0px #000000 !important;
            background: #FFFFFF !important;
        }

        .lms-cheatsheet-box {
            background: #FFFBEB !important;
            border: 1.5px solid #000000 !important;
            border-radius: 8px !important;
            padding: 8px 10px !important;
            font-size: 10.5px !important;
            font-weight: 600 !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 6px !important;
            margin-bottom: 8px !important;
            box-shadow: 1.5px 1.5px 0px #000000 !important;
        }
        .lms-cheatsheet-item {
            display: flex !important;
            flex-wrap: wrap !important;
            align-items: center !important;
            gap: 4px 6px !important;
            line-height: 1.4 !important;
            color: #111827 !important;
        }
        .lms-cheatsheet-item code {
            background: #FFFFFF !important;
            color: #111827 !important;
            border: 1px solid #000000 !important;
            border-radius: 5px !important;
            padding: 2px 6px !important;
            font-size: 10px !important;
            font-weight: 700 !important;
            display: inline-block !important;
            max-width: 100% !important;
            white-space: normal !important;
            word-break: break-word !important;
            overflow-wrap: anywhere !important;
        }

        /* Preview Snippet & Report Pre Box */
        .lms-preview-box {
            background: #FFFDF9 !important;
            border: 2px solid #000000 !important;
            border-radius: 8px !important;
            padding: 8px 10px !important;
            margin-top: 10px !important;
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
            font-size: 10px !important;
            font-weight: 600 !important;
            color: #374151 !important;
            max-height: 64px !important;
            overflow-y: auto !important;
            margin: 0 !important;
            white-space: pre-wrap !important;
            word-break: break-word !important;
        }

        /* Review Results Box (matches #reviewResultContainer in popup.html) */
        .lms-review-box {
            margin-top: 10px !important;
            background: #FFFBEB !important;
            border: 2.5px solid #000000 !important;
            border-radius: 10px !important;
            padding: 10px !important;
            box-shadow: 2.5px 2.5px 0px #000000 !important;
        }

        .lms-stats-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 6px !important;
            margin-bottom: 10px !important;
        }

        .lms-stat-item {
            background: #FFFFFF !important;
            border: 1.5px solid #000000 !important;
            border-radius: 7px !important;
            padding: 6px 4px !important;
            text-align: center !important;
            box-shadow: 1.5px 1.5px 0px #000000 !important;
        }
        .lms-stat-item.grade-stat { background: #FFDE59 !important; }

        .lms-stat-label {
            font-size: 8.5px !important;
            font-weight: 800 !important;
            color: #6B7280 !important;
            text-transform: uppercase !important;
        }

        .lms-stat-value {
            font-size: 13px !important;
            font-weight: 900 !important;
            color: #000000 !important;
        }

        .lms-action-row-mini {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 6px !important;
            margin-bottom: 6px !important;
        }

        .lms-btn-mini {
            padding: 7px 6px !important;
            font-size: 10.5px !important;
            font-weight: 800 !important;
            border: 1.5px solid #000000 !important;
            border-radius: 7px !important;
            box-shadow: 1.5px 1.5px 0px #000000 !important;
            cursor: pointer !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 5px !important;
            transition: all 0.1s ease !important;
            color: #000000 !important;
            background: #FFFFFF !important;
        }
        .lms-btn-mini:hover:not(:disabled) {
            transform: translate(-1px, -1px) !important;
            box-shadow: 2.5px 2.5px 0px #000000 !important;
        }
        .lms-btn-mini:active:not(:disabled) {
            transform: translate(1px, 1px) !important;
            box-shadow: 0.5px 0.5px 0px #000000 !important;
        }
        .lms-btn-mini.btn-yellow { background: #FFDE59 !important; }
        .lms-btn-mini.btn-green { background: #4ADE80 !important; }
        .lms-btn-mini.btn-purple { background: #818CF8 !important; }
        .lms-btn-mini.btn-pink { background: #FF6B8B !important; }
        .lms-btn-mini.btn-white { background: #FFFFFF !important; }

        .lms-report-pre {
            background: #FFFFFF !important;
            border: 2px solid #000000 !important;
            border-radius: 8px !important;
            padding: 10px !important;
            font-size: 10px !important;
            font-weight: 600 !important;
            color: #111827 !important;
            max-height: 210px !important;
            overflow-y: auto !important;
            white-space: pre-wrap !important;
            word-break: break-word !important;
            margin: 8px 0 !important;
            line-height: 1.45 !important;
            box-shadow: 2px 2px 0px #000000 !important;
        }

        .lms-detail-scroll {
            max-height: 210px !important;
            overflow-y: auto !important;
            margin-top: 8px !important;
            padding-right: 2px !important;
        }

        .lms-q-card {
            background: #FFFFFF !important;
            border: 1.5px solid #000000 !important;
            border-radius: 8px !important;
            padding: 8px !important;
            margin-bottom: 7px !important;
            box-shadow: 1.5px 1.5px 0px #000000 !important;
        }
        .lms-q-card-head {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            font-weight: 800 !important;
            font-size: 10.5px !important;
            margin-bottom: 4px !important;
        }
        .lms-q-card-text {
            font-size: 10.5px !important;
            font-weight: 600 !important;
            color: #1F2937 !important;
            margin-bottom: 6px !important;
            line-height: 1.35 !important;
        }
        .lms-q-card-key {
            background: #BBF7D0 !important;
            border: 1px solid #000000 !important;
            border-radius: 5px !important;
            padding: 4px 7px !important;
            font-size: 10px !important;
            font-weight: 800 !important;
            color: #065F46 !important;
        }

        .lms-modal-footer {
            padding: 10px 14px !important;
            border-top: 2.5px solid #000000 !important;
            background: #FFFFFF !important;
            display: flex !important;
            gap: 8px !important;
            justify-content: space-between !important;
            align-items: center !important;
        }

        /* Floating Quick Launcher Pill (Tuckii Neo-Brutalist) */
        #lms-solver-floating-pill {
            position: fixed !important;
            bottom: 22px !important;
            right: 22px !important;
            background: #FFDE59 !important;
            border: 2.5px solid #000000 !important;
            border-radius: 12px !important;
            padding: 6px 10px 6px 7px !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 8px !important;
            box-shadow: 4px 4px 0px #000000 !important;
            cursor: pointer !important;
            z-index: 9999998 !important;
            font-size: 12px !important;
            font-weight: 900 !important;
            letter-spacing: -0.2px !important;
            color: #000000 !important;
            user-select: none !important;
            transition: all 0.14s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
        }
        #lms-solver-floating-pill:hover {
            transform: translate(-1.5px, -1.5px) !important;
            box-shadow: 5.5px 5.5px 0px #000000 !important;
        }
        #lms-solver-floating-pill:active {
            transform: translate(2px, 2px) !important;
            box-shadow: 1px 1px 0px #000000 !important;
        }
        .lms-pill-logo {
            width: 24px !important;
            height: 24px !important;
            background: #FFFFFF !important;
            border: 1.8px solid #000000 !important;
            border-radius: 7px !important;
            box-shadow: 1.5px 1.5px 0px #000000 !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
        }
        .lms-pill-badge {
            background: #000000 !important;
            color: #FFDE59 !important;
            border: 1.5px solid #000000 !important;
            font-size: 9.5px !important;
            font-weight: 900 !important;
            padding: 2px 7px !important;
            border-radius: 7px !important;
            letter-spacing: 0.3px !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 4px !important;
        }
        .lms-pill-badge.ready {
            background: #4ADE80 !important;
            color: #000000 !important;
        }

        #lms-solver-floating-menu {
            position: fixed !important;
            bottom: 68px !important;
            right: 22px !important;
            background: #FAF7F2 !important;
            border: 2.5px solid #000000 !important;
            border-radius: 12px !important;
            box-shadow: 5px 5px 0px #000000 !important;
            padding: 10px !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 6px !important;
            z-index: 9999998 !important;
            width: 248px !important;
            animation: lmsSolverModalPop 0.2s ease-out forwards !important;
        }
        .lms-fmenu-heading {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            font-size: 11px !important;
            font-weight: 900 !important;
            color: #000000 !important;
            padding: 0 2px 4px 2px !important;
            border-bottom: 2px solid #000000 !important;
            margin-bottom: 2px !important;
        }
        .lms-fmenu-badge {
            font-size: 8.5px !important;
            font-weight: 900 !important;
            background: #000000 !important;
            color: #FFFFFF !important;
            padding: 2px 6px !important;
            border-radius: 5px !important;
        }
        .lms-floating-menu-item {
            background: #FFFFFF !important;
            border: 2px solid #000000 !important;
            border-radius: 9px !important;
            padding: 7px 9px !important;
            font-size: 11.5px !important;
            font-weight: 800 !important;
            cursor: pointer !important;
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            color: #000000 !important;
            box-shadow: 2.5px 2.5px 0px #000000 !important;
            transition: all 0.1s ease !important;
            text-align: left !important;
            width: 100% !important;
        }
        .lms-floating-menu-item:hover {
            background: #FFF0A8 !important;
            transform: translate(-1.5px, -1.5px) !important;
            box-shadow: 3.5px 3.5px 0px #000000 !important;
        }
        .lms-floating-menu-item:active {
            transform: translate(1.5px, 1.5px) !important;
            box-shadow: 1px 1px 0px #000000 !important;
        }
        .lms-fmenu-icon {
            width: 24px !important;
            height: 24px !important;
            border: 1.5px solid #000000 !important;
            border-radius: 6px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            flex-shrink: 0 !important;
            color: #000000 !important;
        }
        .lms-fmenu-icon.green { background: #4ADE80 !important; }
        .lms-fmenu-icon.yellow { background: #FFDE59 !important; }
        .lms-fmenu-icon.purple { background: #818CF8 !important; }
        .lms-fmenu-icon.pink { background: #FF6B8B !important; }

        /* In-Page Toast Banner (matches #toastBanner in popup.html) */
        #lms-inpage-toast {
            position: fixed !important;
            top: 18px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            background: #000000 !important;
            color: #FFFFFF !important;
            border: 2px solid #FFDE59 !important;
            border-radius: 20px !important;
            padding: 8px 15px !important;
            font-size: 11.5px !important;
            font-weight: 800 !important;
            box-shadow: 4px 4px 0px rgba(0, 0, 0, 0.45) !important;
            z-index: 999999999 !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 7px !important;
            pointer-events: none !important;
            animation: lmsSolverFadeIn 0.2s ease-out forwards !important;
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
// 2B. IN-PAGE OVERLAY MODALS & QUICK CONTROLLERS (Tuckii UI)
// ========================================================
const LMS_ICONS = {
    bolt: (s = 14) => `<svg class="lms-neo-svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    cpu: (s = 14) => `<svg class="lms-neo-svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>`,
    award: (s = 14) => `<svg class="lms-neo-svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>`,
    fileDown: (s = 18) => `<svg class="lms-neo-svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/></svg>`,
    target: (s = 18) => `<svg class="lms-neo-svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
    fileText: (s = 15) => `<svg class="lms-neo-svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    fileWord: (s = 15) => `<svg class="lms-neo-svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 13l2 4 2-4"/><line x1="15" y1="13" x2="15" y2="17"/></svg>`,
    image: (s = 15) => `<svg class="lms-neo-svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
    play: (s = 15) => `<svg class="lms-neo-svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
    copy: (s = 14) => `<svg class="lms-neo-svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    clipboard: (s = 13) => `<svg class="lms-neo-svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>`,
    trash: (s = 13) => `<svg class="lms-neo-svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
    checkCircle: (s = 15) => `<svg class="lms-neo-svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    check: (s = 14) => `<svg class="lms-neo-svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    alertTriangle: (s = 15) => `<svg class="lms-neo-svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    eye: (s = 13) => `<svg class="lms-neo-svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    arrowUpRight: (s = 13) => `<svg class="lms-neo-svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>`,
    arrowRight: (s = 15) => `<svg class="lms-neo-svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
    download: (s = 14) => `<svg class="lms-neo-svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    info: (s = 13) => `<svg class="lms-neo-svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    close: (s = 15) => `<svg class="lms-neo-svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    layers: (s = 12) => `<svg class="lms-neo-svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
    clock: (s = 14) => `<svg class="lms-neo-svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`
};

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
    ensureInjectedStyles();
    let oldToast = document.getElementById('lms-inpage-toast');
    if (oldToast) oldToast.remove();

    const toast = document.createElement('div');
    toast.id = 'lms-inpage-toast';
    toast.style.borderColor = type === "success" ? "#FFDE59" : (type === "warning" ? "#FFDE59" : "#FF4757");
    const iconSvg = type === "success" ? LMS_ICONS.check(14) : LMS_ICONS.alertTriangle(14);
    toast.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`;
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
    const promptHeader = structuredData.promptHeader || "Tolong jawab kuis ini. Berikan jawaban akhirnya saja tanpa penjelasan.\nFormat: Jika opsi ada huruf (a/b/c/d), tulis `1. a. Jawaban`. Jika tanpa huruf opsi (misal True/False), tulis langsung `1. False`.";
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
    const promptHeader = structuredData.promptHeader || "Tolong jawab kuis ini. Berikan jawaban akhirnya saja tanpa penjelasan.\nFormat: Jika opsi ada huruf (a/b/c/d), tulis `1. a. Jawaban`. Jika tanpa huruf opsi (misal True/False), tulis langsung `1. False`.";
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

// Generator PDF & DOCX khusus untuk Laporan Hasil Review Kuis
async function generateReviewPdfDocument(reviewData) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        showInPageToast("Pustaka PDF belum termuat!", "error");
        return false;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
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

    // Header Judul
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13.5);
    doc.setTextColor(17, 24, 39);
    doc.text("LAPORAN HASIL & KUNCI JAWABAN KUIS LMS", margin, y);
    y += 6.5;

    // Box Ringkasan Nilai
    const sum = reviewData.summary || {};
    const metaLines = [];
    if (sum.grade) metaLines.push(`Nilai Akhir: ${sum.grade}`);
    if (sum.marks) metaLines.push(`Total Poin: ${sum.marks}`);
    if (sum.status) metaLines.push(`Status: ${sum.status}`);
    if (sum.duration) metaLines.push(`Durasi: ${sum.duration}`);
    if (sum.completed) metaLines.push(`Selesai: ${sum.completed}`);
    metaLines.push(`Statistik: ${reviewData.totalQuestions || 0} Soal (${reviewData.correctCount || 0} Benar, ${reviewData.incorrectCount || 0} Salah)`);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(55, 65, 81);
    metaLines.forEach(line => {
        checkPageBreak(4.5);
        doc.text(line, margin, y);
        y += 4.3;
    });
    y += 2;

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    const questions = reviewData.questions || [];
    for (const q of questions) {
        checkPageBreak(20);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        if (q.isCorrect) doc.setTextColor(22, 101, 52);
        else doc.setTextColor(185, 28, 28);
        const statusTag = q.isCorrect ? "[BENAR]" : "[SALAH]";
        doc.text(`Soal No. ${q.number} ${statusTag} ${q.grade ? `(${q.grade})` : ""}`, margin, y);
        y += 5;

        // Teks Pertanyaan
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(17, 24, 39);
        const qLines = doc.splitTextToSize(q.text || "", contentWidth);
        qLines.forEach(line => {
            checkPageBreak(4.6);
            doc.text(line, margin, y);
            y += 4.4;
        });
        y += 2;

        // Gambar Soal jika ada
        if (q.images && q.images.length > 0) {
            for (const img of q.images) {
                if (img.base64) {
                    const compat = await ensureCompatibleImageDataUrl(img.base64);
                    if (compat) {
                        const maxImgW = contentWidth;
                        const maxImgH = 75;
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
                        checkPageBreak(imgH + 5);
                        try {
                            const imgX = margin + (contentWidth - imgW) / 2;
                            doc.addImage(compat.dataUrl, compat.format, imgX, y, imgW, imgH);
                            y += imgH + 4;
                        } catch (e) {}
                    }
                }
            }
        }

        // Opsi atau Pasangan Menjodohkan
        if (q.isMatch && q.matchDetails && q.matchDetails.length > 0) {
            doc.setFontSize(9);
            q.matchDetails.forEach(m => {
                const tag = m.isRowCorrect ? "[BENAR]" : "[SALAH]";
                const rowStr = m.isRowCorrect
                    ? `${tag} ${m.letter}. ${m.sub} -> ${m.correct}`
                    : `${tag} ${m.letter}. ${m.sub} -> ${m.chosen || '(Kosong)'} (Kunci: ${m.correct})`;
                doc.setTextColor(m.isRowCorrect ? 22 : 185, m.isRowCorrect ? 101 : 28, m.isRowCorrect ? 52 : 28);
                const rLines = doc.splitTextToSize(rowStr, contentWidth - 4);
                rLines.forEach(rl => {
                    checkPageBreak(4.4);
                    doc.text(rl, margin + 2, y);
                    y += 4.2;
                });
            });
            y += 1.5;
        } else if (q.options && q.options.length > 0) {
            doc.setFontSize(9);
            q.options.forEach(opt => {
                let prefix = "   ";
                if (opt.isCorrect && opt.isSelected) {
                    prefix = "[BENAR - DIPILIH] ";
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(22, 101, 52);
                } else if (opt.isCorrect) {
                    prefix = "[KUNCI BENAR] ";
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(22, 101, 52);
                } else if (opt.isSelected) {
                    prefix = "[SALAH - DIPILIH] ";
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(185, 28, 28);
                } else {
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(75, 85, 99);
                }
                const optLabel = opt.letter ? `${opt.letter}. ` : "- ";
                const optLines = doc.splitTextToSize(`${prefix}${optLabel}${opt.text}`, contentWidth - 4);
                optLines.forEach(ol => {
                    checkPageBreak(4.3);
                    doc.text(ol, margin + 2, y);
                    y += 4.1;
                });
            });
            y += 1.5;
        }

        // Kunci Jawaban Baris Ringkas
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.2);
        doc.setTextColor(6, 95, 70);
        const keyStr = `Kunci Jawaban: ${q.reportKey || q.correctAnswer || '(Belum terdeteksi)'}`;
        const keyLines = doc.splitTextToSize(keyStr, contentWidth);
        keyLines.forEach(kl => {
            checkPageBreak(4.5);
            doc.text(kl, margin, y);
            y += 4.3;
        });

        if (!q.isCorrect && q.studentAnswer) {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(185, 28, 28);
            const stuStr = `Jawaban Anda: ${q.studentLetter ? q.studentLetter + '. ' : ''}${q.studentAnswer}`;
            const stuLines = doc.splitTextToSize(stuStr, contentWidth);
            stuLines.forEach(sl => {
                checkPageBreak(4.5);
                doc.text(sl, margin, y);
                y += 4.3;
            });
        }

        y += 3;
        checkPageBreak(5);
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.25);
        doc.line(margin, y, pageWidth - margin, y);
        y += 5;
    }

    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text(`Halaman ${p} dari ${totalPages}  |  Laporan LMS QUIZ Solver`, margin, pageHeight - 8);
    }

    doc.save('Laporan_Hasil_Kuis_LMS.pdf');
    return true;
}

async function generateReviewDocxDocument(reviewData) {
    if (!window.docx) {
        showInPageToast("Pustaka DOCX belum termuat!", "error");
        return false;
    }

    const { Document, Paragraph, TextRun, ImageRun, Packer, AlignmentType, BorderStyle } = window.docx;
    const children = [];

    children.push(
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 80, after: 160 },
            children: [
                new TextRun({
                    text: "LAPORAN HASIL & KUNCI JAWABAN KUIS LMS",
                    bold: true,
                    size: 30,
                    font: "Calibri",
                    color: "111827"
                })
            ]
        })
    );

    const sum = reviewData.summary || {};
    const metaItems = [];
    if (sum.grade) metaItems.push(`Nilai Akhir: ${sum.grade}`);
    if (sum.marks) metaItems.push(`Total Poin: ${sum.marks}`);
    if (sum.status) metaItems.push(`Status: ${sum.status}`);
    if (sum.duration) metaItems.push(`Waktu Kerja: ${sum.duration}`);
    if (sum.completed) metaItems.push(`Selesai: ${sum.completed}`);
    metaItems.push(`Statistik: ${reviewData.totalQuestions || 0} Soal (${reviewData.correctCount || 0} Benar, ${reviewData.incorrectCount || 0} Salah)`);

    metaItems.forEach(m => {
        children.push(
            new Paragraph({
                spacing: { after: 50 },
                children: [new TextRun({ text: m, size: 20, font: "Calibri", color: "374151", bold: m.startsWith("Nilai") || m.startsWith("Statistik") })]
            })
        );
    });

    children.push(
        new Paragraph({
            border: { bottom: { color: "000000", space: 6, style: BorderStyle.SINGLE, size: 8 } },
            spacing: { after: 200 }
        })
    );

    const questions = reviewData.questions || [];
    for (const q of questions) {
        children.push(
            new Paragraph({
                spacing: { before: 140, after: 70 },
                children: [
                    new TextRun({
                        text: `Soal No. ${q.number} ${q.isCorrect ? "[BENAR]" : "[SALAH]"} ${q.grade ? `(${q.grade})` : ""}`,
                        bold: true,
                        size: 23,
                        font: "Calibri",
                        color: q.isCorrect ? "166534" : "B91C1C"
                    })
                ]
            })
        );

        if (q.text) {
            q.text.split('\n').forEach(line => {
                if (line.trim()) {
                    children.push(
                        new Paragraph({
                            spacing: { after: 70 },
                            children: [new TextRun({ text: line, size: 21, font: "Calibri", color: "111827" })]
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
                        if (compat) {
                            const imgBytes = base64ToUint8Array(compat.dataUrl);
                            let w = img.width || 420;
                            let h = img.height || 240;
                            if (w > 460) { h = Math.round(h * (460 / w)); w = 460; }
                            if (h > 300) { w = Math.round(w * (300 / h)); h = 300; }
                            children.push(
                                new Paragraph({
                                    alignment: AlignmentType.CENTER,
                                    spacing: { before: 80, after: 120 },
                                    children: [new ImageRun({ data: imgBytes, transformation: { width: Math.max(50, w), height: Math.max(30, h) } })]
                                })
                            );
                        }
                    } catch (e) {}
                }
            }
        }

        if (q.isMatch && q.matchDetails && q.matchDetails.length > 0) {
            q.matchDetails.forEach(m => {
                const rowText = m.isRowCorrect
                    ? `[BENAR] ${m.letter}. ${m.sub} -> ${m.correct}`
                    : `[SALAH] ${m.letter}. ${m.sub} -> ${m.chosen || '(Kosong)'} (Kunci: ${m.correct})`;
                children.push(
                    new Paragraph({
                        spacing: { after: 45 },
                        indent: { left: 320 },
                        children: [new TextRun({ text: rowText, size: 20, font: "Calibri", bold: m.isRowCorrect, color: m.isRowCorrect ? "166534" : "B91C1C" })]
                    })
                );
            });
        } else if (q.options && q.options.length > 0) {
            q.options.forEach(opt => {
                let tag = "";
                let color = "374151";
                let isBold = false;
                if (opt.isCorrect && opt.isSelected) { tag = "[BENAR - DIPILIH] "; color = "166534"; isBold = true; }
                else if (opt.isCorrect) { tag = "[KUNCI BENAR] "; color = "166534"; isBold = true; }
                else if (opt.isSelected) { tag = "[SALAH - DIPILIH] "; color = "B91C1C"; }
                const optLabel = opt.letter ? `${opt.letter}. ` : "- ";
                children.push(
                    new Paragraph({
                        spacing: { after: 45 },
                        indent: { left: 320 },
                        children: [new TextRun({ text: `${tag}${optLabel}${opt.text}`, size: 20, font: "Calibri", bold: isBold, color: color })]
                    })
                );
            });
        }

        children.push(
            new Paragraph({
                spacing: { before: 60, after: 60 },
                children: [
                    new TextRun({
                        text: `Kunci Jawaban: ${q.reportKey || q.correctAnswer || '(Belum terdeteksi)'}`,
                        bold: true,
                        size: 21,
                        font: "Calibri",
                        color: "065F46"
                    })
                ]
            })
        );

        if (!q.isCorrect && q.studentAnswer) {
            children.push(
                new Paragraph({
                    spacing: { after: 60 },
                    children: [
                        new TextRun({
                            text: `Jawaban Anda: ${q.studentLetter ? q.studentLetter + '. ' : ''}${q.studentAnswer} (Salah)`,
                            size: 20,
                            font: "Calibri",
                            color: "B91C1C"
                        })
                    ]
                })
            );
        }

        children.push(
            new Paragraph({
                border: { bottom: { color: "E5E7EB", space: 4, style: BorderStyle.SINGLE, size: 4 } },
                spacing: { after: 140 }
            })
        );
    }

    const doc = new Document({
        sections: [{ properties: { page: { margin: { top: 1200, right: 1200, bottom: 1200, left: 1200 } } }, children }]
    });

    const blob = await Packer.toBlob(doc);
    downloadBlob(blob, 'Laporan_Hasil_Kuis_LMS.docx');
    return true;
}

// Helper Header + Mode Switcher Bar (Tuckii Popup Shell)
function buildInPageModalShell(activeMode, bodyHtml, footerHtml = "") {
    let devilIcon = '';
    try {
        devilIcon = chrome.runtime.getURL('asset/devil-svgrepo-com.svg');
    } catch (e) {}

    const isReviewPage = window.location.href.includes('review.php');
    const isAttemptPage = window.location.href.includes('attempt.php');
    const dotClass = isReviewPage ? 'pink' : (isAttemptPage ? '' : 'yellow');
    const pageLabel = isReviewPage ? 'Mode Review Kuis Aktif' : (isAttemptPage ? 'Mode Attempt Kuis Aktif' : 'Halaman Kuis LMS');

    return `
        <div class="lms-neo-modal">
            <div class="lms-modal-topbar">
                <div class="lms-hero-brand">
                    <div class="lms-hero-logo-box">
                        ${devilIcon ? `<img src="${devilIcon}" style="width:24px;height:24px;display:block;" alt="Logo">` : LMS_ICONS.bolt(20)}
                    </div>
                    <div class="lms-hero-title-wrap">
                        <h3 class="lms-hero-title">LMS QUIZ Solver.</h3>
                        <div class="lms-hero-sub">
                            <span class="lms-status-dot ${dotClass}"></span>
                            <span>${pageLabel}</span>
                        </div>
                    </div>
                </div>
                <button class="lms-icon-btn" id="lms-modal-close-x" title="Tutup Popup">
                    ${LMS_ICONS.close(16)}
                </button>
            </div>

            <div class="lms-mode-nav">
                <button class="lms-mode-tab ${activeMode === 'attempt' ? 'active-attempt' : ''}" id="lms-nav-attempt">
                    ${LMS_ICONS.bolt(12)}
                    <span>01. Scrape</span>
                </button>
                <button class="lms-mode-tab ${activeMode === 'inject' ? 'active-inject' : ''}" id="lms-nav-inject">
                    ${LMS_ICONS.cpu(12)}
                    <span>02. Injector</span>
                </button>
                <button class="lms-mode-tab ${activeMode === 'review' ? 'active-review' : ''}" id="lms-nav-review">
                    ${LMS_ICONS.award(12)}
                    <span>03. Review</span>
                </button>
            </div>

            <div class="lms-modal-body">
                ${bodyHtml}
            </div>

            ${footerHtml ? `<div class="lms-modal-footer">${footerHtml}</div>` : ''}
        </div>
    `;
}

function attachModalNavHandlers(overlay) {
    const closeBtn = overlay.querySelector('#lms-modal-close-x');
    if (closeBtn) closeBtn.onclick = () => closeInPageModals();

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeInPageModals();
    });

    const navAttempt = overlay.querySelector('#lms-nav-attempt');
    if (navAttempt) {
        navAttempt.onclick = () => {
            chrome.storage.local.get(['scrapeResult', 'scrapeStructuredData'], (d) => {
                showInPageScrapeResultModal(d.scrapeResult || "", d.scrapeStructuredData || null);
            });
        };
    }

    const navInject = overlay.querySelector('#lms-nav-inject');
    if (navInject) {
        navInject.onclick = () => showInPagePasteModal();
    }

    const navReview = overlay.querySelector('#lms-nav-review');
    if (navReview) {
        navReview.onclick = () => showInPageReviewModal();
    }
}

// ========================================================
// IN-PAGE MODAL 1: 01. ATTEMPT - AUTO-SCRAPE & EKSPOR SOAL
// ========================================================
function showInPageScrapeResultModal(finalResult, structuredData) {
    ensureInjectedStyles();
    closeInPageModals();

    const hasResult = Boolean(finalResult && finalResult.trim().length > 0);
    const hasImages = Boolean(structuredData && structuredData.hasImages && structuredData.totalImages > 0);
    const totalImages = structuredData ? (structuredData.totalImages || 0) : 0;
    const qCount = (structuredData && structuredData.questions) ? structuredData.questions.length : 0;

    let cardContent = '';
    if (!hasResult) {
        cardContent = `
            <button class="lms-neo-btn btn-green" id="lms-btn-run-scrape-now">
                ${LMS_ICONS.play(15)}
                <span>1. Mulai Auto-Scrape Sekarang</span>
            </button>
        `;
    } else if (hasImages) {
        cardContent = `
            <div class="lms-scrape-alert pink">
                ${LMS_ICONS.image(16)}
                <span>Terdeteksi ${totalImages} Gambar pada Soal — Unduh .DOCX atau .PDF agar gambar terbaca AI.</span>
            </div>

            <div class="lms-btn-group-row" style="margin-top:0 !important;">
                <button class="lms-neo-btn btn-yellow" id="lms-btn-modal-pdf">
                    ${LMS_ICONS.fileText(15)}
                    <span>Unduh .PDF</span>
                </button>
                <button class="lms-neo-btn btn-purple" id="lms-btn-modal-docx">
                    ${LMS_ICONS.fileWord(15)}
                    <span>Unduh .DOCX</span>
                </button>
            </div>

            <button class="lms-neo-btn btn-white" id="lms-btn-modal-zip" style="margin-top:8px;">
                ${LMS_ICONS.image(15)}
                <span>Unduh Semua Gambar (${totalImages} File .ZIP)</span>
            </button>

            <button class="lms-neo-btn btn-white" id="lms-btn-modal-copy" style="margin-top:8px;">
                ${LMS_ICONS.copy(14)}
                <span>Salin Teks Saja</span>
            </button>

            <div class="lms-preview-box">
                <div class="lms-preview-header">
                    <span>Cuplikan Prompt &amp; Soal</span>
                    <span>${finalResult.length} Karakter</span>
                </div>
                <pre class="lms-preview-content">${escapeHtml(finalResult.slice(0, 320))}...</pre>
            </div>
        `;
    } else {
        cardContent = `
            <div class="lms-scrape-alert green">
                ${LMS_ICONS.checkCircle(16)}
                <span>Kuis Siap (${qCount} Soal Hanya Teks) — Prompt AI sudah diformat otomatis.</span>
            </div>

            <button class="lms-neo-btn btn-green" id="lms-btn-modal-copy">
                ${LMS_ICONS.copy(15)}
                <span>Salin Teks Soal (Default)</span>
            </button>

            <div class="lms-btn-group-row">
                <button class="lms-neo-btn btn-yellow" id="lms-btn-modal-pdf">
                    ${LMS_ICONS.fileText(15)}
                    <span>Unduh .PDF</span>
                </button>
                <button class="lms-neo-btn btn-purple" id="lms-btn-modal-docx">
                    ${LMS_ICONS.fileWord(15)}
                    <span>Unduh .DOCX</span>
                </button>
            </div>

            <div class="lms-preview-box">
                <div class="lms-preview-header">
                    <span>Cuplikan Prompt &amp; Soal</span>
                    <span>${finalResult.length} Karakter</span>
                </div>
                <pre class="lms-preview-content">${escapeHtml(finalResult.slice(0, 320))}...</pre>
            </div>
        `;
    }

    const bodyHtml = `
        <div class="lms-folder-card card-attempt">
            <div class="lms-folder-tab">
                ${LMS_ICONS.bolt(11)}
                <span>01. ATTEMPT</span>
            </div>
            <div class="lms-folder-card-body">
                <div class="lms-card-header-row">
                    <div class="lms-card-icon-box">
                        ${LMS_ICONS.fileDown(20)}
                    </div>
                    <div class="lms-card-meta-pill">
                        <span>Multi-Page</span>
                        ${hasResult ? `<span class="lms-badge-pill">${qCount} SOAL</span>` : ''}
                    </div>
                </div>
                <h3 class="lms-card-title">Auto-Scrape Soal</h3>
                <p class="lms-card-desc">Salin teks prompt atau unduh dokumen soal kuis. Hasil tetap tersimpan di ekstensi.</p>
                ${cardContent}
            </div>
        </div>
    `;

    const footerHtml = hasResult ? `
        <button class="lms-neo-btn btn-purple" id="lms-btn-to-paste-modal">
            <span>Lanjut ke Auto-Fill Jawaban</span>
            ${LMS_ICONS.arrowRight(15)}
        </button>
    ` : '';

    const overlay = document.createElement('div');
    overlay.id = 'lms-solver-modal-overlay';
    overlay.innerHTML = buildInPageModalShell('attempt', bodyHtml, footerHtml);
    document.body.appendChild(overlay);
    attachModalNavHandlers(overlay);

    const btnRunScrape = overlay.querySelector('#lms-btn-run-scrape-now');
    if (btnRunScrape) {
        btnRunScrape.onclick = () => {
            if (!window.location.href.includes('attempt.php')) {
                showInPageToast("Buka halaman attempt.php terlebih dahulu untuk scrape soal!", "warning");
                return;
            }
            closeInPageModals();
            chrome.storage.local.set({ isAutoScraping: true, scrapedQuestions: "", scrapedQuestionsData: [] }, () => {
                performScrapeStep();
            });
        };
    }

    const btnCopy = overlay.querySelector('#lms-btn-modal-copy');
    if (btnCopy) {
        btnCopy.onclick = async () => {
            const ok = await copyToClipboard(finalResult);
            if (ok) {
                btnCopy.className = 'lms-neo-btn btn-green';
                btnCopy.innerHTML = `${LMS_ICONS.check(15)}<span>Berhasil Disalin ke Clipboard!</span>`;
                showInPageToast("Teks soal tersalin! Membuka form Auto-Fill...");
            }
            setTimeout(() => {
                closeInPageModals();
                showInPagePasteModal();
            }, 380);
        };
    }

    const btnDocx = overlay.querySelector('#lms-btn-modal-docx');
    if (btnDocx) {
        btnDocx.onclick = async () => {
            btnDocx.disabled = true;
            btnDocx.innerHTML = `${LMS_ICONS.clock(14)}<span>Menyiapkan .DOCX...</span>`;
            try {
                await generateDocxDocument(structuredData);
                showInPageToast("File DOCX berhasil diunduh!");
            } catch (e) {
                console.error("Gagal buat DOCX:", e);
                showInPageToast("Gagal membuat file DOCX!", "error");
            }
            setTimeout(() => {
                closeInPageModals();
                showInPagePasteModal();
            }, 500);
        };
    }

    const btnPdf = overlay.querySelector('#lms-btn-modal-pdf');
    if (btnPdf) {
        btnPdf.onclick = async () => {
            btnPdf.disabled = true;
            btnPdf.innerHTML = `${LMS_ICONS.clock(14)}<span>Menyiapkan .PDF...</span>`;
            try {
                await generatePdfDocument(structuredData);
                showInPageToast("File PDF berhasil diunduh!");
            } catch (e) {
                console.error("Gagal buat PDF:", e);
                showInPageToast("Gagal membuat file PDF!", "error");
            }
            setTimeout(() => {
                closeInPageModals();
                showInPagePasteModal();
            }, 500);
        };
    }

    const btnZip = overlay.querySelector('#lms-btn-modal-zip');
    if (btnZip) {
        btnZip.onclick = async () => {
            await downloadQuizImages(structuredData);
            setTimeout(() => {
                closeInPageModals();
                showInPagePasteModal();
            }, 500);
        };
    }

    const btnToPaste = overlay.querySelector('#lms-btn-to-paste-modal');
    if (btnToPaste) {
        btnToPaste.onclick = () => {
            closeInPageModals();
            showInPagePasteModal();
        };
    }
}

// ========================================================
// IN-PAGE MODAL 2: 02. INJECTOR - PASTE & AUTO-FILL JAWABAN
// ========================================================
function showInPagePasteModal() {
    ensureInjectedStyles();
    closeInPageModals();

    chrome.storage.local.get(['savedAnswers'], (data) => {
        const draftAnswers = data.savedAnswers || "";

        const bodyHtml = `
            <div class="lms-folder-card card-inject">
                <div class="lms-folder-tab">
                    ${LMS_ICONS.cpu(11)}
                    <span>02. INJECTOR</span>
                </div>
                <div class="lms-folder-card-body">
                    <div class="lms-card-header-row">
                        <div class="lms-card-icon-box">
                            ${LMS_ICONS.target(20)}
                        </div>
                        <div class="lms-card-meta-pill">
                            <span>Format: 1. a. Jawaban</span>
                            <span class="lms-badge-pill green">READY</span>
                        </div>
                    </div>
                    <h3 class="lms-card-title">Auto-Fill Jawaban</h3>
                    <p class="lms-card-desc">Paste jawaban dari AI. Ekstensi otomatis memilih opsi radio / checkbox / dropdown / isian &amp; lanjut halaman.</p>

                    <textarea id="lms-paste-textarea" class="lms-neo-textarea" placeholder="# Paste jawaban AI di sini...&#10;Contoh Berhuruf: 1. a. Event-based coordination&#10;Contoh Tanpa Huruf: 2. False&#10;Contoh Checkbox: 3. a. Opsi 1 | c. Opsi 3&#10;Contoh Beranak: 4. a. Sub A: Opsi 1 | b. Sub B: Opsi 2&#10;Contoh Isian: 5. SDD">${escapeHtml(draftAnswers)}</textarea>

                    <div class="lms-textarea-quick-bar">
                        <button class="lms-quick-chip" id="lms-btn-paste-clipboard">
                            ${LMS_ICONS.clipboard(12)}
                            <span>Paste Clipboard</span>
                        </button>
                        <button class="lms-quick-chip" id="lms-btn-toggle-cheatsheet">
                            ${LMS_ICONS.info(12)}
                            <span>Contoh Format</span>
                        </button>
                        <button class="lms-quick-chip" id="lms-btn-clear-paste">
                            ${LMS_ICONS.trash(12)}
                            <span>Bersihkan</span>
                        </button>
                    </div>

                    <div id="lms-cheatsheet-box" class="lms-cheatsheet-box" style="display:none;">
                        <div class="lms-cheatsheet-item"><b>Ada Huruf Opsi:</b> <code>1. a. Teks Jawaban</code></div>
                        <div class="lms-cheatsheet-item"><b>Tanpa Huruf (True/False):</b> <code>2. False</code></div>
                        <div class="lms-cheatsheet-item"><b>Checkbox (Pilih Banyak):</b> <code>3. a. Opsi 1 | c. Opsi 3</code></div>
                        <div class="lms-cheatsheet-item"><b>Menjodohkan / Sub-soal:</b> <code>4. a. Sub A: Opsi 1 | b. Sub B: Opsi 2</code></div>
                        <div class="lms-cheatsheet-item"><b>Isian Singkat:</b> <code>5. SDD</code></div>
                    </div>

                    <button class="lms-neo-btn btn-purple" id="lms-btn-start-inject">
                        ${LMS_ICONS.bolt(15)}
                        <span>2. Isi Jawaban (Inject) &amp; Next</span>
                    </button>
                </div>
            </div>
        `;

        const overlay = document.createElement('div');
        overlay.id = 'lms-solver-modal-overlay';
        overlay.innerHTML = buildInPageModalShell('inject', bodyHtml);
        document.body.appendChild(overlay);
        attachModalNavHandlers(overlay);

        const textarea = overlay.querySelector('#lms-paste-textarea');
        textarea.focus();

        textarea.addEventListener('input', () => {
            const val = textarea.value;
            if (val.trim()) chrome.storage.local.set({ savedAnswers: val });
            else chrome.storage.local.remove(['savedAnswers']);
        });

        const btnToggleCheat = overlay.querySelector('#lms-btn-toggle-cheatsheet');
        const cheatBox = overlay.querySelector('#lms-cheatsheet-box');
        if (btnToggleCheat && cheatBox) {
            btnToggleCheat.onclick = () => {
                cheatBox.style.display = cheatBox.style.display === 'none' ? 'flex' : 'none';
            };
        }

        const btnPasteClip = overlay.querySelector('#lms-btn-paste-clipboard');
        if (btnPasteClip) {
            btnPasteClip.onclick = async () => {
                const clipText = await readFromClipboard();
                if (clipText) {
                    textarea.value = clipText;
                    chrome.storage.local.set({ savedAnswers: clipText });
                    showInPageToast("Berhasil ditempel dari Clipboard!");
                } else {
                    showInPageToast("Gunakan Ctrl+V pada kolom teks.", "warning");
                    textarea.focus();
                }
            };
        }

        const btnClear = overlay.querySelector('#lms-btn-clear-paste');
        if (btnClear) {
            btnClear.onclick = () => {
                textarea.value = "";
                chrome.storage.local.remove(['savedAnswers', 'isAutoFilling']);
                showInPageToast("Input dibersihkan!");
                textarea.focus();
            };
        }

        const btnInject = overlay.querySelector('#lms-btn-start-inject');
        if (btnInject) {
            btnInject.onclick = () => {
                const text = textarea.value.trim();
                if (!text) {
                    showInPageToast("Paste jawaban AI terlebih dahulu!", "warning");
                    textarea.focus();
                    return;
                }
                if (!window.location.href.includes('attempt.php')) {
                    chrome.storage.local.set({ savedAnswers: text });
                    showInPageToast("Jawaban disimpan! Buka halaman attempt.php untuk mulai mengisi.", "warning");
                    return;
                }

                btnInject.disabled = true;
                btnInject.innerHTML = `${LMS_ICONS.bolt(15)}<span>Memulai Pengisian Kuis...</span>`;

                let firstQ = document.querySelector('.que .qno')?.innerText.trim();

                chrome.storage.local.set({ savedAnswers: text, isAutoFilling: true }, () => {
                    chrome.storage.local.remove(['consumedEntryIndexes', 'injectAuditLog']);
                    closeInPageModals();

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
// IN-PAGE MODAL 3: 03. REVIEW - SCRAPE HASIL & LAPORAN KUIS
// ========================================================
function showInPageReviewModal(initialReviewData = null, autoOpenReport = false) {
    ensureInjectedStyles();
    closeInPageModals();

    const renderWithData = (reviewData) => {
        const hasReview = Boolean(reviewData && reviewData.questions && reviewData.questions.length > 0);
        let gradeDisplay = "100";
        if (hasReview) {
            let gradeRaw = reviewData.summary?.grade || `${reviewData.correctCount}/${reviewData.totalQuestions}`;
            let gm = String(gradeRaw).match(/([\d.,]+)/);
            gradeDisplay = gm ? gm[1] : gradeRaw;
        }

        const reviewResultHtml = hasReview ? `
            <div class="lms-review-box" id="lms-inpage-review-box">
                <div class="lms-stats-grid">
                    <div class="lms-stat-item grade-stat">
                        <div class="lms-stat-label">Nilai</div>
                        <div class="lms-stat-value">${escapeHtml(String(gradeDisplay))}</div>
                    </div>
                    <div class="lms-stat-item">
                        <div class="lms-stat-label">Total Soal</div>
                        <div class="lms-stat-value">${reviewData.totalQuestions || 0}</div>
                    </div>
                    <div class="lms-stat-item">
                        <div class="lms-stat-label">Benar</div>
                        <div class="lms-stat-value">${reviewData.correctCount || 0}</div>
                    </div>
                </div>

                <div class="lms-action-row-mini">
                    <button class="lms-btn-mini btn-yellow" id="lms-rev-copy-quick" title="Salin kunci singkat siap inject">
                        ${LMS_ICONS.copy(13)}
                        <span>Kunci Singkat</span>
                    </button>
                    <button class="lms-btn-mini btn-green" id="lms-rev-to-injector" title="Masukkan kunci ke Auto-Fill Injector">
                        ${LMS_ICONS.arrowUpRight(13)}
                        <span>Ke Injector</span>
                    </button>
                </div>

                <div class="lms-action-row-mini" style="margin-bottom:0 !important;">
                    <button class="lms-btn-mini btn-purple" id="lms-rev-open-report" title="Lihat & Unduh Laporan Lengkap">
                        ${LMS_ICONS.fileText(13)}
                        <span>Laporan</span>
                    </button>
                    <button class="lms-btn-mini btn-white" id="lms-rev-open-detail" title="Lihat rincian tiap soal & kunci">
                        ${LMS_ICONS.eye(13)}
                        <span>Detail Soal</span>
                    </button>
                </div>

                <!-- Panel Laporan Lengkap (Salin / PDF / DOCX / TXT) -->
                <div id="lms-rev-report-panel" style="display:${autoOpenReport ? 'block' : 'none'}; margin-top:10px; border-top:2px solid #000; padding-top:8px;">
                    <div class="lms-preview-header">
                        <span>LAPORAN HASIL &amp; KUNCI LENGKAP</span>
                        <span>${reviewData.totalQuestions} Soal</span>
                    </div>
                    <pre class="lms-report-pre">${escapeHtml(reviewData.fullReport || "")}</pre>
                    <div class="lms-action-row-mini">
                        <button class="lms-btn-mini btn-green" id="lms-rev-report-copy">
                            ${LMS_ICONS.copy(12)}
                            <span>Salin Laporan</span>
                        </button>
                        <button class="lms-btn-mini btn-yellow" id="lms-rev-report-pdf">
                            ${LMS_ICONS.fileText(12)}
                            <span>Unduh .PDF</span>
                        </button>
                    </div>
                    <div class="lms-action-row-mini" style="margin-bottom:0 !important;">
                        <button class="lms-btn-mini btn-purple" id="lms-rev-report-docx">
                            ${LMS_ICONS.fileWord(12)}
                            <span>Unduh .DOCX</span>
                        </button>
                        <button class="lms-btn-mini btn-white" id="lms-rev-report-txt">
                            ${LMS_ICONS.download(12)}
                            <span>Unduh .TXT</span>
                        </button>
                    </div>
                </div>

                <!-- Panel Detail Soal -->
                <div id="lms-rev-detail-panel" class="lms-detail-scroll" style="display:none; border-top:2px solid #000; padding-top:8px;">
                    ${(reviewData.questions || []).map(q => `
                        <div class="lms-q-card">
                            <div class="lms-q-card-head">
                                <span>Soal No. ${escapeHtml(String(q.number))}</span>
                                <span class="lms-badge-pill ${q.isCorrect ? 'green' : 'pink'}">${q.isCorrect ? 'BENAR' : 'SALAH'}</span>
                            </div>
                            <div class="lms-q-card-text">${escapeHtml(q.text || '')}</div>
                            <div class="lms-q-card-key">Kunci: ${escapeHtml(q.reportKey || q.correctAnswer || q.studentAnswer || '(Tidak terdeteksi)')}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : '';

        const bodyHtml = `
            <div class="lms-folder-card card-review">
                <div class="lms-folder-tab">
                    ${LMS_ICONS.award(11)}
                    <span>03. REVIEW</span>
                </div>
                <div class="lms-folder-card-body">
                    <div class="lms-card-header-row">
                        <div class="lms-card-icon-box">
                            ${LMS_ICONS.fileText(20)}
                        </div>
                        <div class="lms-card-meta-pill">
                            <span>Kunci Kuis</span>
                            <span class="lms-badge-pill pink">REVIEW</span>
                        </div>
                    </div>
                    <h3 class="lms-card-title">Scrape Hasil Kuis</h3>
                    <p class="lms-card-desc">Ekstrak kunci jawaban benar, laporan lengkap, nilai, dan statistik dari halaman review kuis LMS.</p>

                    <button class="lms-neo-btn btn-pink" id="lms-btn-scrape-review-now">
                        ${LMS_ICONS.checkCircle(16)}
                        <span>3. Scrape Hasil &amp; Kunci Kuis</span>
                    </button>

                    ${reviewResultHtml}
                </div>
            </div>
        `;

        const overlay = document.createElement('div');
        overlay.id = 'lms-solver-modal-overlay';
        overlay.innerHTML = buildInPageModalShell('review', bodyHtml);
        document.body.appendChild(overlay);
        attachModalNavHandlers(overlay);

        const btnScrapeNow = overlay.querySelector('#lms-btn-scrape-review-now');
        if (btnScrapeNow) {
            btnScrapeNow.onclick = async () => {
                if (!window.location.href.includes('review.php')) {
                    showInPageToast("Buka halaman review.php setelah submit kuis untuk scrape hasil jawaban!", "warning");
                    return;
                }
                btnScrapeNow.disabled = true;
                btnScrapeNow.innerHTML = `${LMS_ICONS.clock(15)}<span>Mengekstrak Kunci Jawaban...</span>`;
                try {
                    const res = await scrapeQuizReview();
                    if (res && res.success) {
                        chrome.storage.local.set({ lastReviewResult: res }, () => {
                            showInPageToast(`Berhasil scrape ${res.totalQuestions} soal & kunci jawaban!`);
                            showInPageReviewModal(res);
                        });
                    } else {
                        btnScrapeNow.disabled = false;
                        btnScrapeNow.innerHTML = `${LMS_ICONS.checkCircle(16)}<span>3. Scrape Hasil &amp; Kunci Kuis</span>`;
                        showInPageToast(res?.message || "Gagal menscrape hasil kuis!", "warning");
                    }
                } catch (err) {
                    btnScrapeNow.disabled = false;
                    showInPageToast("Terjadi kesalahan saat membaca halaman review!", "error");
                }
            };
        }

        if (hasReview) {
            const reportPanel = overlay.querySelector('#lms-rev-report-panel');
            const detailPanel = overlay.querySelector('#lms-rev-detail-panel');

            const btnQuick = overlay.querySelector('#lms-rev-copy-quick');
            if (btnQuick) {
                btnQuick.onclick = async () => {
                    const ok = await copyToClipboard(reviewData.quickAnswerKey);
                    if (ok) showInPageToast("Kunci singkat disalin ke clipboard!");
                };
            }

            const btnToInj = overlay.querySelector('#lms-rev-to-injector');
            if (btnToInj) {
                btnToInj.onclick = () => {
                    chrome.storage.local.set({ savedAnswers: reviewData.quickAnswerKey }, () => {
                        showInPageToast("Kunci jawaban dimasukkan ke Auto-Fill Injector!");
                        showInPagePasteModal();
                    });
                };
            }

            const btnOpenReport = overlay.querySelector('#lms-rev-open-report');
            if (btnOpenReport && reportPanel) {
                btnOpenReport.onclick = () => {
                    const nextShow = reportPanel.style.display === 'none';
                    reportPanel.style.display = nextShow ? 'block' : 'none';
                    if (nextShow && detailPanel) detailPanel.style.display = 'none';
                };
            }

            const btnOpenDetail = overlay.querySelector('#lms-rev-open-detail');
            if (btnOpenDetail && detailPanel) {
                btnOpenDetail.onclick = () => {
                    const nextShow = detailPanel.style.display === 'none';
                    detailPanel.style.display = nextShow ? 'block' : 'none';
                    if (nextShow && reportPanel) reportPanel.style.display = 'none';
                };
            }

            const btnRepCopy = overlay.querySelector('#lms-rev-report-copy');
            if (btnRepCopy) {
                btnRepCopy.onclick = async () => {
                    const ok = await copyToClipboard(reviewData.fullReport);
                    if (ok) showInPageToast("Laporan lengkap berhasil disalin!");
                };
            }

            const btnRepPdf = overlay.querySelector('#lms-rev-report-pdf');
            if (btnRepPdf) {
                btnRepPdf.onclick = async () => {
                    btnRepPdf.disabled = true;
                    try {
                        const ok = await generateReviewPdfDocument(reviewData);
                        if (ok) showInPageToast("Laporan .PDF berhasil diunduh!");
                    } finally {
                        btnRepPdf.disabled = false;
                    }
                };
            }

            const btnRepDocx = overlay.querySelector('#lms-rev-report-docx');
            if (btnRepDocx) {
                btnRepDocx.onclick = async () => {
                    btnRepDocx.disabled = true;
                    try {
                        const ok = await generateReviewDocxDocument(reviewData);
                        if (ok) showInPageToast("Laporan .DOCX berhasil diunduh!");
                    } finally {
                        btnRepDocx.disabled = false;
                    }
                };
            }

            const btnRepTxt = overlay.querySelector('#lms-rev-report-txt');
            if (btnRepTxt) {
                btnRepTxt.onclick = () => {
                    const blob = new Blob([reviewData.fullReport || ""], { type: 'text/plain;charset=utf-8' });
                    downloadBlob(blob, `Laporan_Hasil_Kuis_LMS_${new Date().toISOString().slice(0, 10)}.txt`);
                    showInPageToast("Laporan .TXT berhasil diunduh!");
                };
            }
        }
    };

    if (initialReviewData) {
        renderWithData(initialReviewData);
    } else {
        chrome.storage.local.get(['lastReviewResult'], (d) => {
            renderWithData(d.lastReviewResult || null);
        });
    }
}

// ========================================================
// FLOATING QUICK LAUNCHER PILL (POJOK KANAN BAWAH - TUCKII UI)
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
            <span class="lms-pill-logo">
                ${devilIcon ? `<img src="${devilIcon}" style="width:16px;height:16px;display:block;" alt="LMS">` : LMS_ICONS.bolt(14)}
            </span>
            <span>LMS Solver</span>
            <span class="lms-pill-badge" id="lms-pill-badge">${LMS_ICONS.layers(11)}<span>MENU</span></span>
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
            badge.className = 'lms-pill-badge ready';
            badge.innerHTML = `${LMS_ICONS.check(11)}<span>HASIL SIAP</span>`;
        } else {
            badge.className = 'lms-pill-badge';
            badge.innerHTML = `${LMS_ICONS.layers(11)}<span>MENU</span>`;
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
    chrome.storage.local.get(['scrapeResult', 'scrapeStructuredData', 'savedAnswers', 'lastReviewResult'], (data) => {
        const menu = document.createElement('div');
        menu.id = 'lms-solver-floating-menu';
        const isAttempt = window.location.href.includes('attempt.php');
        const isReview = window.location.href.includes('review.php');

        let html = `
            <div class="lms-fmenu-heading">
                <span>Koleksi Fitur</span>
                <span class="lms-fmenu-badge">3 FITUR</span>
            </div>
        `;

        if (isAttempt) {
            html += `
                <button class="lms-floating-menu-item" id="lms-fmenu-start-scrape">
                    <span class="lms-fmenu-icon green">${LMS_ICONS.play(13)}</span>
                    <span>1. Mulai Auto-Scrape Soal</span>
                </button>
            `;
        }

        if (data.scrapeResult) {
            html += `
                <button class="lms-floating-menu-item" id="lms-fmenu-scrape-result">
                    <span class="lms-fmenu-icon yellow">${LMS_ICONS.fileDown(13)}</span>
                    <span>Hasil Scrape Soal</span>
                </button>
            `;
        }

        html += `
            <button class="lms-floating-menu-item" id="lms-fmenu-paste-answer">
                <span class="lms-fmenu-icon purple">${LMS_ICONS.cpu(13)}</span>
                <span>2. Auto-Fill / Paste Jawaban</span>
            </button>
        `;

        html += `
            <button class="lms-floating-menu-item" id="lms-fmenu-scrape-review">
                <span class="lms-fmenu-icon pink">${LMS_ICONS.award(13)}</span>
                <span>3. Scrape Hasil Jawaban</span>
            </button>
        `;

        menu.innerHTML = html;
        document.body.appendChild(menu);

        const btnStartScrape = menu.querySelector('#lms-fmenu-start-scrape');
        if (btnStartScrape) {
            btnStartScrape.onclick = () => {
                menu.remove();
                chrome.storage.local.set({ isAutoScraping: true, scrapedQuestions: "", scrapedQuestionsData: [] }, () => {
                    performScrapeStep();
                });
            };
        }

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

        const btnScrapeReview = menu.querySelector('#lms-fmenu-scrape-review');
        if (btnScrapeReview) {
            btnScrapeReview.onclick = async () => {
                menu.remove();
                if (isReview) {
                    const res = await scrapeQuizReview();
                    if (res && res.success) {
                        chrome.storage.local.set({ lastReviewResult: res }, () => {
                            showInPageToast(`Berhasil scrape ${res.totalQuestions} soal & kunci jawaban!`);
                            showInPageReviewModal(res);
                        });
                    } else {
                        showInPageReviewModal();
                    }
                } else {
                    showInPageReviewModal(data.lastReviewResult || null);
                }
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
        (async () => {
            try {
                let result = await scrapeQuizReview();
                if (result && result.success) {
                    chrome.storage.local.set({ lastReviewResult: result });
                }
                sendResponse(result);
            } catch (err) {
                console.error("Error scraping quiz review:", err);
                sendResponse({ success: false, message: err.message || "Gagal menscrape review kuis." });
            }
        })();
        return true;
    } else if (request.action === "open_inpage_review_modal") {
        showInPageReviewModal();
        sendResponse({ success: true });
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
                let normalQuestions = currentData.filter(q => !q.isMatch && !q.isShortAnswer);
                let anyWithLetters = normalQuestions.some(q => q.hasOptionLetters);
                let anyWithoutLetters = normalQuestions.some(q => q.hasOptionLetters === false);

                let normalRuleText = "";
                if (anyWithLetters && !anyWithoutLetters) {
                    normalRuleText =
                        "1. Soal Pilihan Ganda (memiliki huruf opsi a/b/c/d/e): Tulis dengan format `Nomor. HurufOpsi. TeksJawaban` atau `Nomor. HurufOpsi`\n" +
                        "(Sertakan huruf opsi a/b/c/d/e sesuai soal agar akurasi 100%. Contoh: `1. a. Event-based coordination` atau `2. c. Shared data space`).\n";
                } else if (!anyWithLetters && anyWithoutLetters) {
                    normalRuleText =
                        "1. Soal Pilihan Ganda / True-False (tanpa huruf opsi a/b/c/d): Tulis LANGSUNG teks jawabannya TANPA menambahkan huruf a/b/c/d sendiri!\n" +
                        "Format: `Nomor. TeksJawaban` (Contoh: `1. False` atau `2. True` atau `3. Event-based coordination`).\n";
                } else {
                    normalRuleText =
                        "1. Soal Biasa (Pilihan Ganda / True-False):\n" +
                        "   - Jika opsi di soal ADA huruf opsi (a/b/c/d/e): Tulis dengan format `Nomor. HurufOpsi. TeksJawaban` (Contoh: `1. a. Event-based coordination`).\n" +
                        "   - Jika opsi di soal TIDAK ADA huruf opsi (hanya teks langsung seperti True/False): Tulis LANGSUNG teks jawabannya TANPA menambahkan huruf a/b/c/d sendiri! Format: `Nomor. TeksJawaban` (Contoh: `8. False` atau `9. True`).\n";
                }

                let finalPromptHeader = "Tolong jawab kuis ini. Berikan jawaban akhirnya saja tanpa penjelasan.\n\n" +
                    "ATURAN FORMAT JAWABAN:\n\n" +
                    normalRuleText +
                    "2. Soal Pilih Lebih Dari Satu (Checkbox): Pisahkan tiap jawaban benar dengan tanda pipa (`|`). Sertakan huruf opsi hanya jika di soal terdapat huruf opsi (Contoh: `4. a. Opsi 1 | c. Opsi 3` atau `4. Opsi 1 | Opsi 3`).\n" +
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
        let hasOptionLetters = false;

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
            optNodes.forEach((optNode) => {
                let extracted = extractOptionData(optNode);
                let optText = extracted.cleanedText || extracted.rawText;
                if (!optText) return;
                let dedupKey = `${extracted.letter}|${optText.toLowerCase()}`;
                if (seenOpts.has(dedupKey)) return;
                seenOpts.add(dedupKey);

                if (extracted.letter) {
                    hasOptionLetters = true;
                    let displayLetter = extracted.letter.toLowerCase();
                    let formattedOpt = `${displayLetter}. ${optText}`;
                    output += `${formattedOpt}\n`;
                    optionsList.push(formattedOpt);
                } else {
                    output += `- ${optText}\n`;
                    optionsList.push(optText);
                }
            });
            output += "\n";
        }

        questionItems.push({
            num: qNum,
            text: qText,
            images: images,
            options: optionsList,
            isMatch: isMatchQuestion,
            isShortAnswer: isShortAnswer,
            hasOptionLetters: hasOptionLetters
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
        let letterMatch = rawText.match(/^([a-zA-Z])[.)]\s+/);
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
// Jika opsi di soal LMS tidak memiliki huruf opsi (misal True/False), skor dinilai 100% dari kecocokan teks.
function calculateOptionMatchScore(parsedTarget, opt) {
    const hasLetter = Boolean(parsedTarget.targetLetter);
    const hasText = Boolean(parsedTarget.targetText && parsedTarget.targetText.trim().length > 0);
    const optHasLetter = Boolean(opt.letter && opt.letter.trim().length > 0);

    let letterScore = 0;
    let textScore = 0;
    let finalScore = 0;

    if (hasLetter && hasText) {
        textScore = computeRefinedSimilarity(parsedTarget.targetText, opt.cleanedText);
        if (optHasLetter) {
            letterScore = (opt.letter === parsedTarget.targetLetter) ? 1.0 : 0.0;
            finalScore = (letterScore * 0.50) + (textScore * 0.50);
        } else {
            finalScore = textScore;
        }
    } else if (hasLetter && !hasText) {
        letterScore = (optHasLetter && opt.letter === parsedTarget.targetLetter) ? 1.0 : 0.0;
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
function stripRightAnswerPrefix(text) {
    if (!text) return "";
    return text
        .replace(/\u00A0/g, ' ')
        .replace(/^(?:the\s+correct\s+answers?\s+(?:is|are)|jawaban\s+yang\s+benar\s+adalah|correct\s+answers?)\s*:?\s*/i, '')
        .trim();
}

function cleanSingleRightAnswer(text) {
    let cleaned = stripRightAnswerPrefix(text);
    // Hapus tanda petik & titik pembungkus khas Moodle True/False: 'True'. -> True
    let quotedMatch = cleaned.match(/^['"‘’“”](.+?)['"‘’“”]\.?$/);
    if (quotedMatch) {
        cleaned = quotedMatch[1].trim();
    }
    return cleaned;
}

function extractRightAnswerItems(rightAnswerNode) {
    if (!rightAnswerNode) return [];
    let blockNodes = Array.from(rightAnswerNode.querySelectorAll('p, li'));
    if (blockNodes.length > 0) {
        return blockNodes
            .map(el => el.innerText.replace(/\u00A0/g, ' ').replace(/,\s*$/, '').trim())
            .filter(Boolean);
    }
    let stripped = stripRightAnswerPrefix(rightAnswerNode.innerText || "");
    if (!stripped) return [];
    let lines = stripped.split(/\r?\n/).map(s => s.replace(/,\s*$/, '').trim()).filter(Boolean);
    if (lines.length > 1) return lines;
    return [stripped];
}

async function scrapeQuizReview() {
    ensureInjectedStyles();
    showLmsHud("REVIEW SCRAPER", "Mengekstrak nilai, gambar & kunci jawaban kuis...", 50);

    function markCorrectOptionDom(optNode) {
        if (!optNode) return;
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
    let questionElements = Array.from(document.querySelectorAll('.que'));
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

    for (let idx = 0; idx < questionElements.length; idx++) {
        let q = questionElements[idx];
        let qNum = q.querySelector('.qno')?.innerText.trim() 
            || q.querySelector('h3.no')?.innerText.replace(/Question|Soal/i, '').trim() 
            || (idx + 1).toString();

        let qTextElem = q.querySelector('.qtext');
        let qText = "";
        let images = [];
        if (qTextElem) {
            let imgElements = qTextElem.querySelectorAll('img');
            for (let mIdx = 0; mIdx < imgElements.length; mIdx++) {
                let imgData = await resolveAndFetchQuizImage(imgElements[mIdx], qNum, "ReviewSoal");
                if (imgData) images.push(imgData);
            }
            let clone = qTextElem.cloneNode(true);
            clone.querySelectorAll('.accesshide, .sr-only').forEach(el => el.remove());
            qText = clone.innerText.trim();
        }

        let ansImgElements = q.querySelectorAll('.answer img');
        for (let aIdx = 0; aIdx < ansImgElements.length; aIdx++) {
            let imgData = await resolveAndFetchQuizImage(ansImgElements[aIdx], qNum, "ReviewOpsi");
            if (imgData) images.push(imgData);
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

        let matchRows = Array.from(q.querySelectorAll('table.answer tbody tr, table.answer tr, .ablock table tr'))
            .filter(r => r.querySelector('td.text') !== null);
        let isMatchQuestion = q.classList.contains('match') || matchRows.length > 0;

        let textInput = q.querySelector('.answer input[type="text"], .answer input[type="number"], .answer input:not([type]), .ablock input[type="text"], input[type="text"].form-control, .answer textarea, input[type="text"]');
        let isShortAnswer = q.classList.contains('shortanswer') || q.classList.contains('numerical') || (textInput !== null && !isMatchQuestion && !q.querySelector('input[type="radio"], input[type="checkbox"]'));

        let options = [];
        let matchDetails = [];
        let correctAnswerText = "";
        let reportKey = "";
        let correctOptionLetter = "";
        let studentSelectedAnswer = "";
        let studentSelectedLetter = "";
        let isCheckboxQuestion = false;

        if (isMatchQuestion && matchRows.length > 0) {
            let matchPairs = [];
            let rowInfos = [];
            matchRows.forEach((row, rIdx) => {
                let subName = row.querySelector('td.text')?.innerText.trim() || "";
                let chosenSelect = row.querySelector('select');
                let chosenText = "";
                if (chosenSelect) {
                    let selOpt = chosenSelect.options[chosenSelect.selectedIndex];
                    chosenText = (selOpt && selOpt.value !== "0") ? selOpt.text.trim() : "";
                } else {
                    chosenText = row.querySelector('td.control')?.innerText.trim() || "";
                }
                let ctrlCell = row.querySelector('td.control');
                let isRowCorrect = Boolean(
                    (ctrlCell && ctrlCell.classList.contains('correct'))
                    || row.querySelector('.fa-circle-check, .fa-check, [title="Correct"], [aria-label="Correct"]')
                    || (isQuestionCorrect && chosenText)
                );
                rowInfos.push({ subName, chosenText, isRowCorrect, row });
                matchPairs.push(`${getLetterLabel(rIdx)}. ${subName}: ${chosenText || '-'}`);
            });
            studentSelectedAnswer = matchPairs.join(' | ');

            let parsedPairs = [];
            let rightAnswerNode = q.querySelector('.rightanswer, .outcome .feedback, .specificfeedback');
            if (rightAnswerNode) {
                let rawItems = extractRightAnswerItems(rightAnswerNode);
                if (rawItems.length === 1 && (rawItems[0].match(/→|->|=>/g) || []).length > 1) {
                    rawItems = rawItems[0].split(/,\s*(?=[^,]+?(?:→|->|=>))/).map(s => s.replace(/,\s*$/, '').trim()).filter(Boolean);
                }

                rawItems.forEach(item => {
                    let cleanItem = stripRightAnswerPrefix(item);
                    let arrowMatch = cleanItem.match(/^(.+?)\s*(?:→|->|=>)\s*(.+)$/);
                    if (arrowMatch) {
                        parsedPairs.push({
                            sub: arrowMatch[1].trim(),
                            ans: arrowMatch[2].replace(/,\s*$/, '').trim()
                        });
                    }
                });
            }

            if (parsedPairs.length > 0) {
                let usedIdx = new Set();
                rowInfos.forEach((rInfo, rIdx) => {
                    let foundIdx = parsedPairs.findIndex((p, pIdx) => !usedIdx.has(pIdx) && cleanCompareStr(p.sub) === cleanCompareStr(rInfo.subName));
                    let corrAns = foundIdx !== -1 ? parsedPairs[foundIdx].ans : (rInfo.isRowCorrect ? rInfo.chosenText : "");
                    if (foundIdx !== -1) usedIdx.add(foundIdx);
                    matchDetails.push({
                        letter: getLetterLabel(rIdx),
                        sub: rInfo.subName,
                        chosen: rInfo.chosenText,
                        correct: corrAns,
                        isRowCorrect: rInfo.isRowCorrect || (corrAns && cleanCompareStr(rInfo.chosenText) === cleanCompareStr(corrAns))
                    });
                });
                parsedPairs.forEach((p, pIdx) => {
                    if (!usedIdx.has(pIdx)) {
                        matchDetails.push({
                            letter: getLetterLabel(matchDetails.length),
                            sub: p.sub,
                            chosen: "",
                            correct: p.ans,
                            isRowCorrect: false
                        });
                    }
                });

                correctAnswerText = matchDetails
                    .map(m => `${m.letter}. ${m.sub}: ${m.correct}`)
                    .join(' | ');
                reportKey = correctAnswerText;
            } else {
                rowInfos.forEach((rInfo, rIdx) => {
                    matchDetails.push({
                        letter: getLetterLabel(rIdx),
                        sub: rInfo.subName,
                        chosen: rInfo.chosenText,
                        correct: rInfo.isRowCorrect ? rInfo.chosenText : "",
                        isRowCorrect: rInfo.isRowCorrect
                    });
                });
                if (isQuestionCorrect) {
                    correctAnswerText = studentSelectedAnswer;
                    reportKey = studentSelectedAnswer;
                }
            }
        } else if (isShortAnswer && textInput) {
            let studentVal = textInput.value || textInput.getAttribute('value') || "";
            studentSelectedAnswer = studentVal;

            let rightAnswerNode = q.querySelector('.rightanswer, .outcome .feedback, .specificfeedback');
            if (rightAnswerNode) {
                correctAnswerText = cleanSingleRightAnswer(rightAnswerNode.innerText);
            } else if (isQuestionCorrect) {
                correctAnswerText = studentSelectedAnswer;
            }
            reportKey = correctAnswerText;

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
            let optNodes = Array.from(q.querySelectorAll('.answer .r0, .answer .r1'));
            if (optNodes.length === 0) {
                optNodes = Array.from(q.querySelectorAll('.answer > div, .answer fieldset > div'));
            }

            isCheckboxQuestion = optNodes.some(n => n.querySelector('input[type="checkbox"]') !== null);
            let studentSelectedItems = [];

            optNodes.forEach(optNode => {
                let letterText = optNode.querySelector('.answernumber')?.innerText.replace(/[.\s)]/g, '').trim() || "";

                let labelDiv = optNode.querySelector('div[data-region="answer-label"] .flex-fill')
                    || optNode.querySelector('.flex-fill')
                    || optNode.querySelector('label')
                    || optNode;

                let optCleanText = "";
                if (labelDiv) {
                    let clone = labelDiv.cloneNode(true);
                    clone.querySelectorAll('.answernumber, .icon, i.icon, i.fa, i[class*="fa"], .accesshide, .sr-only, .lms-solver-auto-badge, .lms-solver-review-badge').forEach(el => el.remove());
                    optCleanText = clone.innerText.replace(/\u00A0/g, ' ').trim();
                }

                let radio = optNode.querySelector('input[type="radio"], input[type="checkbox"]');
                let isSelected = radio ? radio.checked : false;
                if (isSelected && optCleanText) {
                    studentSelectedItems.push({ letter: letterText, text: optCleanText });
                }

                let isOptCorrect = false;
                let checkIcon = optNode.querySelector('.fa-circle-check, .fa-check, [title="Correct"], [aria-label="Correct"], .text-success');
                
                if (optNode.classList.contains('correct') || checkIcon !== null) {
                    isOptCorrect = true;
                } else if (isQuestionCorrect && isSelected) {
                    isOptCorrect = true;
                }

                let isOptIncorrect = optNode.classList.contains('incorrect') || optNode.querySelector('.fa-times, .fa-circle-xmark, [title="Incorrect"], [aria-label="Incorrect"], .text-danger') !== null;

                let optObj = {
                    node: optNode,
                    letter: letterText,
                    text: optCleanText,
                    isSelected: isSelected,
                    isCorrect: isOptCorrect,
                    isIncorrect: isOptIncorrect
                };
                options.push(optObj);

                if (isOptCorrect) {
                    markCorrectOptionDom(optNode);
                }
            });

            if (studentSelectedItems.length > 0) {
                studentSelectedAnswer = studentSelectedItems
                    .map(it => it.letter && studentSelectedItems.length > 1 ? `${it.letter}. ${it.text}` : it.text)
                    .join(' | ');
                studentSelectedLetter = studentSelectedItems.length === 1 ? studentSelectedItems[0].letter : "";
            }

            let rightAnswerNode = q.querySelector('.rightanswer, .outcome .feedback, .specificfeedback');
            let rightItems = [];
            if (rightAnswerNode) {
                if (isCheckboxQuestion) {
                    rightItems = extractRightAnswerItems(rightAnswerNode).map(s => cleanSingleRightAnswer(s)).filter(Boolean);
                    rightItems.forEach(rText => {
                        let rCmp = cleanCompareStr(rText);
                        let matchedOpt = options.find(opt => opt.text && cleanCompareStr(opt.text) === rCmp);
                        if (!matchedOpt) {
                            let bestOpt = null;
                            let bestSim = 0;
                            options.forEach(opt => {
                                if (!opt.text) return;
                                let sim = computeRefinedSimilarity(rText, opt.text);
                                if (sim > bestSim) {
                                    bestSim = sim;
                                    bestOpt = opt;
                                }
                            });
                            if (bestOpt && bestSim >= 0.85) matchedOpt = bestOpt;
                        }
                        if (matchedOpt) {
                            matchedOpt.isCorrect = true;
                            markCorrectOptionDom(matchedOpt.node);
                        }
                    });
                } else {
                    let hasDomCorrect = options.some(o => o.isCorrect);
                    if (!hasDomCorrect) {
                        let cleanedRight = cleanSingleRightAnswer(rightAnswerNode.innerText);
                        if (cleanedRight) {
                            let rCmp = cleanCompareStr(cleanedRight);
                            let matchedOpt = options.find(opt => opt.text && cleanCompareStr(opt.text) === rCmp);
                            if (!matchedOpt) {
                                let bestOpt = null;
                                let bestSim = 0;
                                options.forEach(opt => {
                                    if (!opt.text) return;
                                    let sim = computeRefinedSimilarity(cleanedRight, opt.text);
                                    if (sim > bestSim) {
                                        bestSim = sim;
                                        bestOpt = opt;
                                    }
                                });
                                if (bestOpt && bestSim >= 0.80) matchedOpt = bestOpt;
                            }

                            if (matchedOpt) {
                                matchedOpt.isCorrect = true;
                                markCorrectOptionDom(matchedOpt.node);
                            } else {
                                correctAnswerText = cleanedRight;
                            }
                        }
                    }
                }
            }

            let correctOpts = options.filter(o => o.isCorrect && o.text);
            if (correctOpts.length > 0) {
                if (isCheckboxQuestion || correctOpts.length > 1) {
                    correctAnswerText = correctOpts.map(o => o.text).join(' | ');
                    reportKey = correctOpts.map(o => o.letter ? `${o.letter}. ${o.text}` : o.text).join(' | ');
                    correctOptionLetter = "";
                } else {
                    correctAnswerText = correctOpts[0].text;
                    correctOptionLetter = correctOpts[0].letter || "";
                    reportKey = correctOptionLetter ? `${correctOptionLetter}. ${correctAnswerText}` : correctAnswerText;
                }
            } else if (!correctAnswerText && rightItems.length > 0) {
                correctAnswerText = rightItems.join(' | ');
                reportKey = correctAnswerText;
            } else if (!correctAnswerText && isQuestionCorrect && studentSelectedAnswer) {
                correctAnswerText = studentSelectedAnswer;
                correctOptionLetter = studentSelectedLetter;
                reportKey = correctOptionLetter ? `${correctOptionLetter}. ${correctAnswerText}` : correctAnswerText;
            } else {
                reportKey = correctOptionLetter ? `${correctOptionLetter}. ${correctAnswerText}` : correctAnswerText;
            }
        }

        if (isQuestionCorrect) {
            correctCount++;
        } else {
            incorrectCount++;
        }

        let serializableOptions = options.map(({ node, ...rest }) => rest);

        questionsData.push({
            number: qNum,
            text: qText,
            images: images,
            state: state,
            grade: grade,
            isCorrect: isQuestionCorrect,
            isMatch: isMatchQuestion,
            isCheckbox: isCheckboxQuestion,
            matchDetails: matchDetails,
            options: serializableOptions,
            correctAnswer: correctAnswerText,
            reportKey: reportKey,
            correctLetter: correctOptionLetter,
            studentAnswer: studentSelectedAnswer,
            studentLetter: studentSelectedLetter
        });

        let answerForQuick = correctAnswerText || studentSelectedAnswer || "(Tidak terdeteksi)";
        quickAnswerKeyList.push(`${qNum}. ${answerForQuick}`);
    }

    let quickAnswerKey = quickAnswerKeyList.join('\n');

    // 3. Bangun Laporan Lengkap yang Rapi & Terstruktur
    let fullReport = "";
    fullReport += "========================================================\n";
    fullReport += "         LMS QUIZ REVIEW - LAPORAN & KUNCI JAWABAN      \n";
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
        let statusTag = q.isCorrect ? "[BENAR]" : "[SALAH]";
        fullReport += `[SOAL NO. ${q.number}] ${statusTag} ${q.grade ? `(${q.grade})` : ""}\n`;
        fullReport += `Pertanyaan :\n${q.text}\n\n`;

        if (q.isMatch && q.matchDetails && q.matchDetails.length > 0) {
            fullReport += `Pasangan Sub-Soal :\n`;
            q.matchDetails.forEach(m => {
                if (m.isRowCorrect) {
                    fullReport += `  [BENAR]           ${m.letter}. ${m.sub} -> ${m.correct}\n`;
                } else {
                    fullReport += `  [SALAH]           ${m.letter}. ${m.sub} -> ${m.chosen || '(Kosong)'}  (Kunci: ${m.correct})\n`;
                }
            });
            fullReport += `\n`;
        } else if (q.options && q.options.length > 0) {
            fullReport += `Pilihan Jawaban :\n`;
            q.options.forEach(opt => {
                let statusMark = "                  ";
                if (opt.isCorrect && opt.isSelected) statusMark = "[BENAR - DIPILIH] ";
                else if (opt.isCorrect) statusMark = "[KUNCI BENAR]     ";
                else if (opt.isSelected) statusMark = "[SALAH - DIPILIH] ";

                let optLabel = opt.letter ? `${opt.letter}. ` : "- ";
                fullReport += `  ${statusMark}${optLabel}${opt.text}\n`;
            });
            fullReport += `\n`;
        }

        let displayKey = q.reportKey || (q.correctAnswer ? `${q.correctLetter ? q.correctLetter + '. ' : ''}${q.correctAnswer}` : '(Belum terdeteksi)');
        fullReport += `>>> Kunci Jawaban : ${displayKey}\n`;
        if (!q.isCorrect && q.studentAnswer) {
            fullReport += `>>> Jawaban Anda  : ${q.studentLetter ? q.studentLetter + '. ' : ''}${q.studentAnswer} (Salah)\n`;
        }
        fullReport += `\n`;
    });

    fullReport += "========================================================\n";
    fullReport += "         RINGKASAN KUNCI CEPAT (SIAP AUTO-FILL)         \n";
    fullReport += "========================================================\n";
    fullReport += quickAnswerKey + "\n";

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