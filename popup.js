// ========================================================
// LMS AUTO SOLVER - POPUP CONTROLLER & NEO-BRUTALISM ENGINE
// Tuckii Style Interactive UI
// ========================================================

// Safe fallback for testing/preview outside extension context
if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
    window.chrome = {
        storage: {
            local: {
                get: (keys, cb) => {
                    let res = {};
                    if (Array.isArray(keys)) {
                        keys.forEach(k => { res[k] = localStorage.getItem(k); });
                    } else if (typeof keys === 'object') {
                        Object.keys(keys).forEach(k => { res[k] = localStorage.getItem(k); });
                    }
                    setTimeout(() => cb(res), 10);
                },
                set: (items, cb) => {
                    Object.keys(items).forEach(k => { localStorage.setItem(k, typeof items[k] === 'object' ? JSON.stringify(items[k]) : items[k]); });
                    if (cb) setTimeout(cb, 10);
                },
                remove: (keys, cb) => {
                    (Array.isArray(keys) ? keys : [keys]).forEach(k => localStorage.removeItem(k));
                    if (cb) setTimeout(cb, 10);
                }
            },
            onChanged: {
                addListener: () => {}
            }
        },
        tabs: {
            query: async () => [{
                id: 1,
                url: 'https://lms.telkomuniversity.ac.id/mod/quiz/review.php?attempt=525440&cmid=61623'
            }],
            sendMessage: async (tabId, msg) => {
                console.log("[Demo Mode] Message sent:", msg);
                if (msg.action === "scrape_quiz_review") {
                    return {
                        success: true,
                        totalQuestions: 30,
                        correctCount: 30,
                        incorrectCount: 0,
                        summary: { grade: "100.00", marks: "30.00/30.00", status: "Finished", duration: "3 mins 5 secs" },
                        quickAnswerKey: "1. Memusatkan distribusi session key tanpa mengharuskan setiap pasangan pengguna berbagi kunci jangka panjang.\n2. Keamanan sistem bergantung pada kerahasiaan desain, bukan terutama pada perlindungan kunci.\n3. Message authentication, untuk membantu memverifikasi sumber dan integritas pesan.",
                        fullReport: "=== LMS QUIZ REVIEW ===\nNilai: 100.00/100.00\nTotal: 30 Soal",
                        questions: [
                            { number: "1", text: "Sebuah perusahaan menggunakan Key Distribution Center (KDC)...", isCorrect: true, correctAnswer: "Memusatkan distribusi session key..." }
                        ]
                    };
                }
                return { success: true };
            }
        },
        scripting: {
            executeScript: async () => {}
        }
    };
}

let currentReviewData = null;

// Helper: Auto-close popup setelah aksi button selesai
function closePopupDelayed(delayMs = 250) {
    setTimeout(() => {
        try {
            window.close();
        } catch (e) {
            console.log("Window close not supported in this environment");
        }
    }, delayMs);
}

// ========================================================
// 1. NEO-BRUTALISM PARTICLE CONFETTI ENGINE (Canvas based)
// ========================================================
const canvas = document.getElementById('particleCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;
let particles = [];

function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const TUCKII_COLORS = ['#FFDE59', '#FF6B8B', '#4ADE80', '#818CF8', '#A3E635', '#000000', '#FFFFFF'];
const SHAPES = ['square', 'circle', 'triangle', 'cross'];

class NeoParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        let angle = Math.random() * Math.PI * 2;
        let speed = Math.random() * 6 + 2.5;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed - 1.5;
        this.gravity = 0.22;
        this.color = TUCKII_COLORS[Math.floor(Math.random() * TUCKII_COLORS.length)];
        this.shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        this.size = Math.random() * 7 + 4;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.25;
        this.alpha = 1;
        this.decay = Math.random() * 0.025 + 0.02;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.rotation += this.rotSpeed;
        this.alpha -= this.decay;
    }

    draw(ctx) {
        if (this.alpha <= 0) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;

        let s = this.size;
        if (this.shape === 'square') {
            ctx.fillRect(-s / 2, -s / 2, s, s);
            ctx.strokeRect(-s / 2, -s / 2, s, s);
        } else if (this.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else if (this.shape === 'triangle') {
            ctx.beginPath();
            ctx.moveTo(0, -s / 2);
            ctx.lineTo(s / 2, s / 2);
            ctx.lineTo(-s / 2, s / 2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (this.shape === 'cross') {
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(-s / 2, 0); ctx.lineTo(s / 2, 0);
            ctx.moveTo(0, -s / 2); ctx.lineTo(0, s / 2);
            ctx.stroke();
        }
        ctx.restore();
    }
}

let particleAnimId = null;

function spawnParticles(x, y, count = 16) {
    if (!ctx) return;
    for (let i = 0; i < count; i++) {
        particles.push(new NeoParticle(x, y));
    }
    if (!particleAnimId) {
        particleAnimId = requestAnimationFrame(renderParticles);
    }
}

function renderParticles() {
    if (!ctx) {
        particleAnimId = null;
        return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.update();
        p.draw(ctx);
        if (p.alpha <= 0) {
            particles.splice(i, 1);
        }
    }
    if (particles.length > 0) {
        particleAnimId = requestAnimationFrame(renderParticles);
    } else {
        particleAnimId = null;
    }
}

// Global Button Click Animator (Bouncy Pop & Geometric Particle Burst)
document.addEventListener('click', (e) => {
    let btn = e.target.closest('button, .quick-chip, .neo-icon-btn, .status-action-btn');
    if (btn) {
        btn.classList.remove('btn-pop');
        void btn.offsetWidth;
        btn.classList.add('btn-pop');

        let rect = btn.getBoundingClientRect();
        let clickX = e.clientX || (rect.left + rect.width / 2);
        let clickY = e.clientY || (rect.top + rect.height / 2);
        spawnParticles(clickX, clickY, 14);

        let ripple = document.createElement('span');
        ripple.classList.add('ripple-wave');
        let size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${clickX - rect.left - size / 2}px`;
        ripple.style.top = `${clickY - rect.top - size / 2}px`;
        btn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    }
});


// ========================================================
// 2. TOAST NOTIFICATION SYSTEM
// ========================================================
let toastTimeout = null;
function showToast(text, duration = 2400) {
    let toast = document.getElementById('toastBanner');
    let toastText = document.getElementById('toastText');

    if (!toast) return;
    if (toastText) toastText.innerText = text;

    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}


// ========================================================
// 3. LIVE CLOCK (Tuckii Status Bar)
// ========================================================
function updateLiveTime() {
    let now = new Date();
    let hours = String(now.getHours()).padStart(2, '0');
    let minutes = String(now.getMinutes()).padStart(2, '0');
    let el = document.getElementById('liveTime');
    if (el) el.innerText = `${hours}:${minutes}`;
}
setInterval(updateLiveTime, 1000);
updateLiveTime();


// ========================================================
// 4. TAB DETECTION & RESILIENT MESSAGING
// ========================================================
async function getActiveTab() {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
}

async function sendTabMessage(message) {
    let tab = await getActiveTab();
    if (!tab || !tab.id) {
        throw new Error("Tidak menemukan tab aktif.");
    }

    try {
        let response = await chrome.tabs.sendMessage(tab.id, message);
        return response;
    } catch (err) {
        console.log("Tab belum terhubung, mencoba re-injeksi script content.js:", err?.message || err);
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });
            // Beri jeda kecil agar script selesai menginisialisasi listener
            await new Promise(r => setTimeout(r, 150));
            return await chrome.tabs.sendMessage(tab.id, message);
        } catch (injectionErr) {
            console.log("Gagal auto-inject script:", injectionErr?.message || injectionErr);
            throw new Error("Koneksi ke halaman terputus karena ekstensi baru saja di-reload. Silakan REFRESH halaman kuis (tekan F5) lalu coba lagi.");
        }
    }
}

async function checkCurrentTabStatus() {
    let dot = document.getElementById('statusDot');
    let label = document.getElementById('statusLabel');

    try {
        let tab = await getActiveTab();
        if (!tab || !tab.url) {
            label.innerText = "Tab tidak terdeteksi";
            dot.className = "status-dot yellow";
            return;
        }

        let url = tab.url;
        if (url.includes('lms.telkomuniversity.ac.id/mod/quiz/review.php')) {
            dot.className = "status-dot pink";
            label.innerText = "Mode Review Kuis (review.php)";
            highlightCard('cardReview');
        } else if (url.includes('lms.telkomuniversity.ac.id/mod/quiz/attempt.php')) {
            dot.className = "status-dot green";
            label.innerText = "Mode Pengerjaan (attempt.php)";
            highlightCard('cardAttempt');
        } else if (url.includes('lms.telkomuniversity.ac.id')) {
            dot.className = "status-dot yellow";
            label.innerText = "LMS Telkom Terdeteksi";
        } else {
            dot.className = "status-dot";
            label.innerText = "Bukan LMS Telkom";
        }
    } catch (e) {
        dot.className = "status-dot yellow";
        label.innerText = "LMS Solver Siap";
    }
}

function highlightCard(cardId) {
    let card = document.getElementById(cardId);
    if (card) {
        let body = card.querySelector('.folder-card-body');
        if (body) {
            body.style.boxShadow = "6px 6px 0px #000";
            body.style.borderColor = "#000";
        }
    }
}


// ========================================================
// 5. FITUR BATALKAN OPERASI (EMERGENCY ABORT)
// ========================================================
async function triggerCancelOperation() {
    showToast("Menghentikan operasi...");

    try {
        await sendTabMessage({ action: "cancel_operation" });
    } catch (err) {
        console.log("Direct tab message failed, clearing storage flags directly:", err);
    }

    await chrome.storage.local.set({ isAutoScraping: false, isAutoFilling: false });
    await chrome.storage.local.remove(['savedAnswers', 'isAutoScraping', 'isAutoFilling', 'scrapedQuestions', 'scrapedQuestionsData', 'consumedEntryIndexes', 'injectAuditLog']);
    checkInjectAuditLog();

    let cancelBtn = document.getElementById('btnCancelOp');
    if (cancelBtn) cancelBtn.style.display = 'none';

    let statusDot = document.getElementById('statusDot');
    let statusLabel = document.getElementById('statusLabel');
    if (statusDot) statusDot.className = "status-dot yellow";
    if (statusLabel) statusLabel.innerText = "Operasi Berhasil Dibatalkan";

    showToast("Operasi kuis dibatalkan!");
    closePopupDelayed(250);
}

document.getElementById('btnCancelOp').addEventListener('click', triggerCancelOperation);
document.getElementById('btnEmergencyStop').addEventListener('click', triggerCancelOperation);


// ========================================================
// 6. BUTTON 1: AUTO-SCRAPE ATTEMPT (CARD 1)
// ========================================================
document.getElementById('btnScrape').addEventListener('click', async () => {
    try {
        let tab = await getActiveTab();
        if (!tab.url || !tab.url.includes('attempt.php')) {
            showToast("Buka halaman attempt.php untuk scrape!");
            return;
        }

        showToast("Auto-Scrape dimulai!");
        document.getElementById('btnCancelOp').style.display = 'flex';
        await sendTabMessage({ action: "start_auto_scrape" });

        // Auto close popup sesuai instruksi user
        closePopupDelayed(250);
    } catch (err) {
        showToast("Buka halaman kuis LMS Telkom University dahulu!");
    }
});

// Helper unduh file Blob
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 20000);
}

// Helper unduh file Base64 Data URL
function downloadDataUrl(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Helper: Deteksi format gambar & konversi ke PNG via Canvas jika format non-PNG/JPEG (misal WebP)
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
    // Konversi WebP/GIF/BMP ke PNG agar kompatibel dengan jsPDF dan docx
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

// Generator Dokumen PDF (Multimodal Vision Friendly untuk AI)
async function generatePdfDocument(structuredData) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        showToast("Pustaka PDF belum dimuat!");
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

// Helper konversi Base64 Data URL menjadi Uint8Array untuk docx ImageRun
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

// Generator Dokumen Word .DOCX Modern menggunakan library OpenXML native (docx by dolanmiu)
async function generateDocxDocument(structuredData) {
    if (!window.docx) {
        showToast("Pustaka docx belum dimuat!");
        return false;
    }

    const { Document, Paragraph, TextRun, ImageRun, Packer, AlignmentType, BorderStyle } = window.docx;

    const docChildren = [];

    // 1. Header Judul Dokumen
    docChildren.push(
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: 180 },
            children: [
                new TextRun({
                    text: "LMS QUIZ - SOAL & PROMPT AI",
                    bold: true,
                    size: 32, // 16pt
                    font: "Calibri",
                    color: "111827"
                })
            ]
        })
    );

    // 2. Aturan & Petunjuk Jawaban untuk AI
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
                            size: 20, // 10pt
                            font: "Calibri",
                            color: "4B5563"
                        })
                    ]
                })
            );
        }
    });

    // 3. Garis Pembatas Header
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

    // 4. Bangun Node Soal, Gambar (ImageRun), dan Opsi Jawaban
    const questions = structuredData.questions || [];

    for (const q of questions) {
        // Judul Nomor Soal
        const qTitle = q.isMatch ? `Soal ${q.num} (Tipe Menjodohkan / Sub-soal):` : (q.isShortAnswer ? `Soal ${q.num} (Tipe Isian Singkat):` : `Soal ${q.num}:`);
        docChildren.push(
            new Paragraph({
                spacing: { before: 160, after: 80 },
                children: [
                    new TextRun({
                        text: qTitle,
                        bold: true,
                        size: 24, // 12pt
                        font: "Calibri",
                        color: "111827"
                    })
                ]
            })
        );

        // Teks Soal
        if (q.text) {
            q.text.split('\n').forEach(line => {
                if (line.trim()) {
                    docChildren.push(
                        new Paragraph({
                            spacing: { after: 80 },
                            children: [
                                new TextRun({
                                    text: line,
                                    size: 22, // 11pt
                                    font: "Calibri",
                                    color: "1F2937"
                                })
                            ]
                        })
                    );
                }
            });
        }

        // Resolusi Gambar Soal ke Node ImageRun dengan Dimensi Proporsional
        if (q.images && q.images.length > 0) {
            for (const img of q.images) {
                if (img.base64) {
                    try {
                        const compat = await ensureCompatibleImageDataUrl(img.base64);
                        if (!compat) throw new Error("Format gambar tidak didukung");
                        const imgBytes = base64ToUint8Array(compat.dataUrl);

                        // Batasi lebar maksimal 480pt agar rapi di margin kertas A4
                        let w = img.width || 450;
                        let h = img.height || 260;
                        const maxWidth = 480;
                        const maxHeight = 320;

                        if (w > maxWidth) {
                            h = Math.round(h * (maxWidth / w));
                            w = maxWidth;
                        }
                        if (h > maxHeight) {
                            w = Math.round(w * (maxHeight / h));
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
                        console.error("Gagal menyematkan ImageRun:", imgErr);
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

        // Opsi Pilihan Jawaban
        if (q.options && q.options.length > 0) {
            q.options.forEach(opt => {
                docChildren.push(
                    new Paragraph({
                        spacing: { after: 50 },
                        indent: { left: 360 }, // Indentasi 0.25 inci
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

        // Garis Pembatas Halus Antar Soal
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

    // 5. Instansiasi Document OpenXML
    const doc = new Document({
        sections: [
            {
                properties: {
                    page: {
                        margin: {
                            top: 1440,    // 1 inci (1440 dxa)
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

    // 6. Tunggu seluruh kompresi dan assembly OpenXML selesai sempurna sebelum download
    const docxBlob = await Packer.toBlob(doc);
    downloadBlob(docxBlob, 'Soal_Kuis_LMS.docx');
    return true;
}

// Unduh Kumpulan Gambar Soal (PNG satuan atau ZIP koleksi)
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
        showToast("Tidak ada file gambar yang berhasil diambil!");
        return;
    }

    if (allImages.length === 1) {
        const img = allImages[0];
        downloadDataUrl(img.base64, img.name || 'Soal_Gambar.png');
        showToast("Gambar soal berhasil diunduh (.PNG)!");
        return;
    }

    if (!window.JSZip) {
        showToast("Pustaka ZIP belum dimuat!");
        return;
    }

    const zip = new window.JSZip();
    const usedNames = new Set();
    allImages.forEach((img, idx) => {
        const cleanBase64 = img.base64.replace(/^data:image\/[^;]+;base64,/, '');
        let filename = img.name || `Soal_Gambar_${idx + 1}.png`;
        if (usedNames.has(filename.toLowerCase())) {
            const dotIdx = filename.lastIndexOf('.');
            const base = dotIdx > 0 ? filename.slice(0, dotIdx) : filename;
            const ext = dotIdx > 0 ? filename.slice(dotIdx) : '.png';
            let counter = 2;
            while (usedNames.has(`${base}_${counter}${ext}`.toLowerCase())) counter++;
            filename = `${base}_${counter}${ext}`;
        }
        usedNames.add(filename.toLowerCase());
        zip.file(filename, cleanBase64, { base64: true });
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(zipBlob, 'Koleksi_Gambar_Soal_LMS.zip');
    showToast(`${allImages.length} gambar berhasil diunduh (.ZIP)!`);
}

// Mengecek apakah ada hasil scrape attempt yang siap di-download / di-copy
function checkPendingScrapeResult() {
    chrome.storage.local.get(['scrapeResult', 'scrapeStructuredData'], (data) => {
        const btnCopy = document.getElementById('btnCopyResult');
        const containerImages = document.getElementById('scrapeWithImagesContainer');

        if (!data.scrapeResult) {
            if (btnCopy) btnCopy.style.display = 'none';
            if (containerImages) containerImages.style.display = 'none';
            return;
        }

        const structured = data.scrapeStructuredData;
        const hasImages = structured && structured.hasImages && structured.totalImages > 0;

        if (containerImages) {
            containerImages.style.display = 'flex';
            if (btnCopy) btnCopy.style.display = 'none';

            const alertBox = document.getElementById('scrapeImageAlert');
            const alertText = document.getElementById('scrapeImageAlertText');
            const btnImg = document.getElementById('btnDownloadImages');
            const btnCopyText = document.getElementById('btnCopyTextOnly');

            if (hasImages) {
                if (alertBox) {
                    alertBox.style.backgroundColor = 'var(--color-pink-light)';
                    alertBox.style.borderColor = '#000000';
                }
                if (alertText) {
                    alertText.innerText = `Terdeteksi ${structured.totalImages} Gambar pada Soal`;
                }
                if (btnImg) {
                    btnImg.style.display = 'flex';
                    const imgBtnText = document.getElementById('btnDownloadImagesText');
                    if (imgBtnText) {
                        imgBtnText.innerText = structured.totalImages > 1
                            ? `Unduh Semua Gambar (${structured.totalImages} File .ZIP)`
                            : `Unduh Gambar Soal (.PNG)`;
                    }
                }
                if (btnCopyText) {
                    btnCopyText.className = 'neo-btn btn-white';
                    btnCopyText.style.marginTop = '8px';
                    const label = btnCopyText.querySelector('span');
                    if (label) label.innerText = 'Salin Teks Saja';
                }
            } else {
                if (alertBox) {
                    alertBox.style.backgroundColor = 'var(--color-green-light)';
                    alertBox.style.borderColor = '#000000';
                }
                if (alertText) {
                    const qLen = structured && structured.questions ? structured.questions.length : '';
                    alertText.innerText = `Kuis Siap (Hanya Teks ${qLen ? `- ${qLen} Soal` : ''})`;
                }
                if (btnImg) {
                    btnImg.style.display = 'none';
                }
                if (btnCopyText) {
                    btnCopyText.className = 'neo-btn btn-green';
                    btnCopyText.style.marginTop = '8px';
                    const label = btnCopyText.querySelector('span');
                    if (label) label.innerText = 'Salin Teks Soal (Default)';
                }
            }

            // Tombol Kiri: Unduh PDF
            const btnPdf = document.getElementById('btnDownloadPdf');
            if (btnPdf) {
                btnPdf.onclick = async () => {
                    btnPdf.disabled = true;
                    try {
                        const ok = await generatePdfDocument(structured);
                        if (ok) showToast("File PDF soal berhasil diunduh!");
                    } catch (err) {
                        console.error("Gagal membuat PDF:", err);
                        showToast("Gagal membuat file PDF!");
                    } finally {
                        btnPdf.disabled = false;
                    }
                };
            }

            // Tombol Kanan: Unduh DOCX
            const btnDocx = document.getElementById('btnDownloadDocx');
            if (btnDocx) {
                btnDocx.onclick = async () => {
                    btnDocx.disabled = true;
                    try {
                        const ok = await generateDocxDocument(structured);
                        if (ok) showToast("File DOCX soal berhasil diunduh!");
                    } catch (err) {
                        console.error("Gagal membuat DOCX:", err);
                        showToast("Gagal membuat file DOCX!");
                    } finally {
                        btnDocx.disabled = false;
                    }
                };
            }

            // Tombol Unduh File Gambar
            if (btnImg) {
                btnImg.onclick = async () => {
                    await downloadQuizImages(structured);
                };
            }

            // Tombol Salin Teks Saja (TIDAK MENGHAPUS DATA DARI STORAGE)
            if (btnCopyText) {
                btnCopyText.onclick = () => {
                    navigator.clipboard.writeText(data.scrapeResult).then(() => {
                        showToast("Teks prompt disalin ke clipboard!");
                        triggerBurst(window.innerWidth / 2, window.innerHeight / 2);
                    });
                };
            }

            // Tombol Selesai / Bersihkan Hasil
            const btnClear = document.getElementById('btnClearScrapeResult');
            if (btnClear) {
                btnClear.onclick = () => {
                    chrome.storage.local.remove(['scrapeResult', 'scrapeStructuredData'], () => {
                        containerImages.style.display = 'none';
                        showToast("Hasil scrape dibersihkan!");
                    });
                };
            }
        } else if (btnCopy) {
            btnCopy.style.display = 'flex';
            btnCopy.onclick = () => {
                navigator.clipboard.writeText(data.scrapeResult).then(() => {
                    showToast("Semua soal kuis disalin!");
                    triggerBurst(window.innerWidth / 2, window.innerHeight / 2);
                });
            };
        }
    });
}


// ========================================================
// 7. BUTTON 2: AUTO-FILL INJECTOR (CARD 2)
// ========================================================
document.getElementById('btnInject').addEventListener('click', async () => {
    let inputText = document.getElementById('answerInput').value;
    if (!inputText.trim()) {
        showToast("Paste jawaban terlebih dahulu!");
        document.getElementById('answerInput').focus();
        return;
    }

    try {
        let tab = await getActiveTab();
        if (!tab || !tab.url || !tab.url.includes('attempt.php')) {
            showToast("Buka halaman attempt.php untuk Auto-Fill!");
            return;
        }

        await chrome.storage.local.set({ savedAnswers: inputText, isAutoFilling: true });
        await chrome.storage.local.remove(['consumedEntryIndexes', 'injectAuditLog']);
        checkInjectAuditLog();
        showToast("Memulai Auto-Fill ke LMS...");
        document.getElementById('btnCancelOp').style.display = 'flex';
        await sendTabMessage({ action: "inject" });

        // Auto close popup sesuai instruksi user
        closePopupDelayed(250);
    } catch (err) {
        await chrome.storage.local.set({ isAutoFilling: false });
        showToast(err?.message || "Gagal inject! Buka halaman attempt kuis LMS.");
    }
});

// Auto-simpan draft jawaban saat mengetik (tanpa mengaktifkan isAutoFilling)
let draftSaveTimer = null;
document.getElementById('answerInput').addEventListener('input', (e) => {
    clearTimeout(draftSaveTimer);
    const val = e.target.value;
    draftSaveTimer = setTimeout(() => {
        if (val.trim()) {
            chrome.storage.local.set({ savedAnswers: val });
        } else {
            chrome.storage.local.remove(['savedAnswers']);
        }
    }, 350);
});

// Quick Action Chips: Paste Clipboard & Clear
document.getElementById('btnPasteClipboard').addEventListener('click', async () => {
    try {
        let text = await navigator.clipboard.readText();
        if (text) {
            document.getElementById('answerInput').value = text;
            chrome.storage.local.set({ savedAnswers: text });
            showToast("Berhasil ditempel dari Clipboard!");
        } else {
            showToast("Clipboard kosong!");
        }
    } catch (err) {
        showToast("Izin clipboard diperlukan, gunakan Ctrl+V.");
    }
});

document.getElementById('btnClearInput').addEventListener('click', () => {
    document.getElementById('answerInput').value = "";
    chrome.storage.local.remove(['savedAnswers', 'isAutoFilling']);
    showToast("Input dibersihkan!");
});


// ========================================================
// 8. BUTTON 3: SCRAPE HASIL KUIS / QUIZ REVIEW (CARD 3)
// ========================================================
document.getElementById('btnScrapeReview').addEventListener('click', async () => {
    showToast("Menganalisis hasil review kuis...");

    try {
        let tab = await getActiveTab();
        if (!tab.url || !tab.url.includes('review.php')) {
            showToast("Fitur ini khusus untuk halaman review.php!");
            return;
        }

        let response = await sendTabMessage({ action: "scrape_quiz_review" });
        if (response && response.success) {
            currentReviewData = response;
            displayReviewResult(response);
            showToast(`Berhasil scrape ${response.totalQuestions} soal!`);
        } else {
            showToast(response?.message || "Tidak menemukan data review kuis.");
        }
    } catch (err) {
        showToast(err?.message || "Buka halaman review kuis di LMS Telkom University!");
    }
});

function displayReviewResult(data) {
    let container = document.getElementById('reviewResultContainer');
    if (!container) return;

    container.style.display = 'block';

    let gradeText = data.summary?.grade || (data.correctCount ? `${data.correctCount}/${data.totalQuestions}` : "100.00");
    let gradeMatch = gradeText.match(/([\d.,]+)/);
    document.getElementById('statGrade').innerText = gradeMatch ? gradeMatch[1] : gradeText;
    document.getElementById('statTotal').innerText = data.totalQuestions || 0;
    document.getElementById('statCorrect').innerText = data.correctCount || 0;

    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Sub-Action: Copy Kunci Singkat
document.getElementById('btnCopyQuickKey').addEventListener('click', () => {
    if (!currentReviewData || !currentReviewData.quickAnswerKey) {
        showToast("Belum ada data review kuis!");
        return;
    }
    navigator.clipboard.writeText(currentReviewData.quickAnswerKey).then(() => {
        showToast("Kunci jawaban disalin!");
        closePopupDelayed(250);
    });
});

// Sub-Action: Langsung masukkan kunci ke Textarea Injector (Card 2)
document.getElementById('btnSendToInjector').addEventListener('click', () => {
    if (!currentReviewData || !currentReviewData.quickAnswerKey) {
        showToast("Belum ada data review kuis!");
        return;
    }

    let textarea = document.getElementById('answerInput');
    textarea.value = currentReviewData.quickAnswerKey;
    chrome.storage.local.set({ savedAnswers: currentReviewData.quickAnswerKey });
    showToast("Kunci dimasukkan ke Auto-Fill!");

    let cardInject = document.getElementById('cardInject');
    if (cardInject) {
        cardInject.scrollIntoView({ behavior: 'smooth' });
        let body = cardInject.querySelector('.folder-card-body');
        if (body) {
            body.style.transform = "scale(1.02)";
            setTimeout(() => { body.style.transform = "scale(1)"; }, 300);
        }
    }
});

// Sub-Action: Copy Laporan Lengkap
document.getElementById('btnCopyFullReport').addEventListener('click', () => {
    if (!currentReviewData || !currentReviewData.fullReport) {
        showToast("Belum ada data review kuis!");
        return;
    }
    navigator.clipboard.writeText(currentReviewData.fullReport).then(() => {
        showToast("Laporan lengkap disalin!");
        closePopupDelayed(250);
    });
});

// Sub-Action: Preview Detail Soal (Modal)
document.getElementById('btnPreviewQuestions').addEventListener('click', () => {
    if (!currentReviewData || !currentReviewData.questions) {
        showToast("Belum ada data review kuis!");
        return;
    }
    openPreviewModal(currentReviewData);
});

function openPreviewModal(data) {
    let modal = document.getElementById('modalPreview');
    let modalBody = document.getElementById('modalBody');
    let modalTitle = document.getElementById('modalTitle');

    modalTitle.innerText = `Review (${data.totalQuestions} Soal - Nilai: ${data.summary?.grade || '100'})`;
    modalBody.innerHTML = '';

    data.questions.forEach(q => {
        let card = document.createElement('div');
        card.className = 'preview-question-card';

        let statusBadge = q.isCorrect 
            ? `<span style="background:var(--color-green); padding:2px 6px; border:1px solid #000; border-radius:4px; font-weight:800;">Benar</span>`
            : `<span style="background:var(--color-pink); padding:2px 6px; border:1px solid #000; border-radius:4px; font-weight:800;">Salah</span>`;

        card.innerHTML = `
            <div class="preview-q-header">
                <span>Soal No. ${escapeHtml(String(q.number))}</span>
                ${statusBadge}
            </div>
            <div class="preview-q-text">${escapeHtml(q.text)}</div>
            <div class="preview-q-key">
                <b>Kunci:</b> ${escapeHtml(q.correctAnswer || q.studentAnswer || "(Tidak terdeteksi)")}
            </div>
        `;
        modalBody.appendChild(card);
    });

    modal.classList.add('open');
}

function escapeHtml(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

document.getElementById('btnCloseModal').addEventListener('click', () => {
    document.getElementById('modalPreview').classList.remove('open');
});

document.getElementById('btnModalCopyAll').addEventListener('click', () => {
    if (currentReviewData && currentReviewData.quickAnswerKey) {
        navigator.clipboard.writeText(currentReviewData.quickAnswerKey).then(() => {
            showToast("Semua kunci jawaban disalin!");
            closePopupDelayed(250);
        });
    }
});

document.getElementById('btnDownloadTxt').addEventListener('click', () => {
    if (!currentReviewData || !currentReviewData.fullReport) return;
    let blob = new Blob([currentReviewData.fullReport], { type: 'text/plain;charset=utf-8' });
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = `LMS_Kunci_Kuis_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("File .TXT diunduh!");
    closePopupDelayed(250);
});


// ========================================================
// 9. INFO MODAL & REFRESH BUTTONS
// ========================================================
document.getElementById('btnSettings').addEventListener('click', () => {
    document.getElementById('modalInfo').classList.add('open');
});

document.getElementById('btnCloseInfo').addEventListener('click', () => {
    document.getElementById('modalInfo').classList.remove('open');
});

document.getElementById('btnUnderstand').addEventListener('click', () => {
    document.getElementById('modalInfo').classList.remove('open');
});

document.getElementById('btnRefreshTab').addEventListener('click', () => {
    checkCurrentTabStatus();
    checkPendingScrapeResult();
    checkInjectAuditLog();
    showToast("Status diperbarui!");
});

document.getElementById('btnQuickAction').addEventListener('click', async () => {
    await checkCurrentTabStatus();
    try {
        let tab = await getActiveTab();
        if (!tab || !tab.url || !tab.url.includes('lms.telkomuniversity.ac.id/mod/quiz/')) {
            showToast("Buka halaman kuis LMS Telkom terlebih dahulu!");
            return;
        }
        let info = await sendTabMessage({ action: "get_page_info" });
        if (info) {
            showToast(`Terhubung! ${info.totalQuestions || 0} soal terdeteksi.`);
        } else {
            showToast("Koneksi LMS Normal & Aktif!");
        }
    } catch (err) {
        showToast("Belum terhubung ke halaman kuis (Coba F5).");
    }
});

document.getElementById('btnHistory').addEventListener('click', () => {
    chrome.storage.local.get(['lastReviewResult'], (data) => {
        if (data.lastReviewResult) {
            currentReviewData = data.lastReviewResult;
            displayReviewResult(currentReviewData);
            openPreviewModal(currentReviewData);
            showToast("Riwayat review kuis dibuka!");
        } else {
            showToast("Belum ada riwayat review tersimpan.");
        }
    });
});


// ========================================================
// 10. AUDIT & REVIEW INJECT MODAL CONTROLLER
// ========================================================
function checkInjectAuditLog() {
    chrome.storage.local.get(['injectAuditLog'], (data) => {
        let auditLog = Array.isArray(data.injectAuditLog) ? data.injectAuditLog : [];
        let alertBtn = document.getElementById('btnAuditAlert');
        let countBadge = document.getElementById('auditAlertCount');

        let issues = auditLog.filter(item => item.status === "NEEDS_REVIEW" || item.status === "FAILED");
        if (issues.length > 0) {
            if (alertBtn) alertBtn.style.display = 'flex';
            if (countBadge) countBadge.innerText = issues.length;
        } else {
            if (alertBtn) alertBtn.style.display = 'none';
        }
    });
}

function openAuditModal() {
    chrome.storage.local.get(['injectAuditLog'], (data) => {
        let auditLog = Array.isArray(data.injectAuditLog) ? data.injectAuditLog : [];
        let issues = auditLog.filter(item => item.status === "NEEDS_REVIEW" || item.status === "FAILED");
        let modalBody = document.getElementById('modalAuditBody');

        if (issues.length === 0) {
            modalBody.innerHTML = `
                <div style="text-align: center; padding: 25px 10px;">
                    <div style="font-weight: 900; font-size: 13px; color: #16A34A; margin-bottom: 4px;">SEMUA TERISI DENGAN VALID (100%)</div>
                    <div style="font-size: 11px; color: #6B7280;">Tidak ada nomor soal yang meragukan atau gagal diisi.</div>
                </div>
            `;
        } else {
            let html = '';
            issues.forEach(item => {
                let isReview = item.status === "NEEDS_REVIEW";
                let statusClass = isReview ? "review" : "failed";
                let statusText = isReview ? `CEK ULANG (${item.score}%)` : "GAGAL / KOSONG";

                const safeQNum = escapeHtml(String(item.qNum ?? '-'));
                const safeTarget = escapeHtml(String(item.targetInput || '-'));
                const safeLetter = escapeHtml(String(item.selectedLetter || '-'));
                const safeSelected = escapeHtml(String(item.selectedText || '-'));
                const safeReason = escapeHtml(String(item.reason || ''));

                html += `
                    <div class="audit-item-card">
                        <div class="audit-item-header">
                            <span class="audit-qnum-tag">Soal No. ${safeQNum}</span>
                            <span class="audit-status-tag ${statusClass}">${statusText}</span>
                        </div>
                        <div class="audit-detail-row">
                            <span class="audit-label">Input Target:</span> "${safeTarget}"
                        </div>
                        <div class="audit-detail-row">
                            <span class="audit-label">Opsi Terpilih:</span> ${safeLetter !== '-' ? `<b>[${safeLetter}]</b> ` : ''}${safeSelected}
                        </div>
                        <div class="audit-detail-row" style="color: #6B7280; font-size: 10px; margin-top: 4px;">
                            ${safeReason}
                        </div>
                    </div>
                `;
            });
            modalBody.innerHTML = html;
        }

        document.getElementById('modalAuditReview').classList.add('open');
    });
}

document.getElementById('btnAuditAlert')?.addEventListener('click', () => {
    openAuditModal();
});

document.getElementById('btnCloseAuditModal')?.addEventListener('click', () => {
    document.getElementById('modalAuditReview').classList.remove('open');
});

document.getElementById('btnCopyAuditNumbers')?.addEventListener('click', () => {
    chrome.storage.local.get(['injectAuditLog'], (data) => {
        let auditLog = Array.isArray(data.injectAuditLog) ? data.injectAuditLog : [];
        let issues = auditLog.filter(item => item.status === "NEEDS_REVIEW" || item.status === "FAILED");
        if (issues.length > 0) {
            let numbersList = issues.map(it => it.qNum).join(', ');
            navigator.clipboard.writeText(numbersList).then(() => {
                showToast(`Nomor disalin: ${numbersList}`);
            });
        } else {
            showToast("Tidak ada nomor soal yang bermasalah.");
        }
    });
});

document.getElementById('btnClearAuditLog')?.addEventListener('click', async () => {
    await chrome.storage.local.remove('injectAuditLog');
    checkInjectAuditLog();
    document.getElementById('modalAuditReview').classList.remove('open');
    showToast("Log review dibersihkan!");
});

if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local') return;
        if (changes.injectAuditLog) {
            checkInjectAuditLog();
        }
        if (changes.scrapeResult || changes.scrapeStructuredData) {
            checkPendingScrapeResult();
        }
        if (changes.isAutoScraping || changes.isAutoFilling) {
            chrome.storage.local.get(['isAutoScraping', 'isAutoFilling'], (d) => {
                let cancelBtn = document.getElementById('btnCancelOp');
                if (cancelBtn) {
                    cancelBtn.style.display = (d.isAutoScraping || d.isAutoFilling) ? 'flex' : 'none';
                }
            });
        }
    });
}

// Tutup modal saat klik backdrop atau tekan tombol Escape
document.querySelectorAll('.neo-modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
            backdrop.classList.remove('open');
        }
    });
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.neo-modal-backdrop.open').forEach(m => m.classList.remove('open'));
    }
});


// ========================================================
// 11. INISIALISASI SAAT POPUP DIBUKA
// ========================================================
window.addEventListener('DOMContentLoaded', () => {
    checkCurrentTabStatus();
    checkPendingScrapeResult();
    checkInjectAuditLog();

    chrome.storage.local.get(['savedAnswers', 'lastReviewResult', 'isAutoScraping', 'isAutoFilling'], (data) => {
        if (data.savedAnswers) {
            document.getElementById('answerInput').value = data.savedAnswers;
        }
        if (data.lastReviewResult) {
            currentReviewData = data.lastReviewResult;
            displayReviewResult(currentReviewData);
        }

        let cancelBtn = document.getElementById('btnCancelOp');
        if (data.isAutoScraping || data.isAutoFilling) {
            if (cancelBtn) cancelBtn.style.display = 'flex';
        } else {
            if (cancelBtn) cancelBtn.style.display = 'none';
        }
    });
});