# 😈 LMS QUIZ SOLVER (v2.8)
### *Solusi Kuis Sat-Set, Otomatis, & Cerdas untuk LMS Telkom University*

**LMS QUIZ Solver** adalah ekstensi browser Google Chrome (Manifest V3) yang dirancang untuk mengotomatisasi seluruh alur pengerjaan kuis di portal Learning Management System (LMS Moodle) Telkom University (`https://lms.telkomuniversity.ac.id/mod/quiz/*`). 

Ekstensi ini menghubungkan kuis LMS dengan kecerdasan buatan (AI) seperti **ChatGPT, Claude, atau Gemini** secara *seamless* tanpa perlu copy-paste manual satu per satu nomor soal. Dilengkapi dengan antarmuka modern bertema **Neo-Brutalism "Tuckii"**, pop-up *in-page overlay* langsung di layar web, generator dokumen otomatis (.DOCX & .PDF), serta sistem *fuzzy matching* canggih untuk pengisian jawaban dengan akurasi tinggi.

---

## 📑 DAFTAR ISI

1. [Fitur-Fitur Utama (Apa Saja yang Bisa Dilakukan Ekstensi Ini?)](#-fitur-fitur-utama)
2. [Panduan Instalasi Ekstensi](#-panduan-instalasi-ekstensi)
3. [Panduan Penggunaan Runut (Langkah Demi Langkah)](#-panduan-penggunaan-runut-langkah-demi-langkah)
4. [Cheatsheet Format Jawaban AI (Penting!)](#-cheatsheet-format-jawaban-ai)
5. [Tips & Trik Agar Akurasi 100%](#-tips--trik-agar-akurasi-100)
6. [Troubleshooting & Pemecahan Masalah](#-troubleshooting--pemecahan-masalah)
7. [Struktur Berkas & Teknologi](#-struktur-berkas--teknologi)

---

## 🚀 FITUR-FITUR UTAMA

Berikut adalah kemampuan lengkap yang dimiliki oleh **LMS QUIZ Solver v2.8**:

### 1. 🔍 Auto-Scraper Multi-Halaman Otomatis
- Menjelajahi dan membaca seluruh nomor soal kuis dari halaman pertama sampai halaman terakhir secara mandiri tanpa campur tangan pengguna.
- Mendeteksi tombol navigasi halaman (*Next page*) otomatis, melakukan simulasi klik, dan membaca soal di setiap halaman berikutnya.
- Menghasilkan format prompt AI siap pakai yang sudah dilengkapi instruksi format jawaban standar.

### 2. 🖼️ Ekstraksi Cerdas Soal Bergambar (Image Extractor)
- Mendeteksi gambar yang terdapat pada teks pertanyaan maupun di dalam opsi pilihan jawaban.
- Mengunduh gambar langsung menggunakan sesi login (*session cookies*) aktif pengguna atau merendernya via Canvas.
- Mendukung konversi format gambar otomatis (WebP/GIF/BMP ke PNG) agar kompatibel dengan AI.

### 3. 🖥️ Pop-Up In-Page Overlay Langsung di Layar Web (v2.8)
- Begitu proses scraping selesai, pop-up hasil scrape muncul **langsung di tengah layar website kuis**, bukan di jendela kecil ekstensi! Pengguna tidak perlu repot mengklik ikon ekstensi di toolbar browser lagi.
- **Opsi Ekspor Cerdas & Dinamis**:
  - **Kuis Teks Biasa**: Tombol default utama adalah **Salin Teks Prompt AI** (1-klik langsung tersalin ke clipboard), dilengkapi opsi unduh **.PDF** dan **.DOCX**.
  - **Kuis Bergambar**: Menampilkan *alert banner* peringatan jumlah gambar terdeteksi, dengan tombol utama yang direkomendasikan adalah **Unduh File Word (.DOCX)** dan **Unduh .PDF** agar gambar dapat langsung diunggah dan dianalisis oleh AI multimodal (seperti GPT-4o, Claude 3.5 Sonnet, atau Gemini 1.5 Pro).
  - Tersedia opsi unduh kumpulan gambar asli kuis dalam arsip **.ZIP**.

### 4. 🤖 Pop-Up In-Page Input Jawaban AI (Auto-Transition) (v2.8)
- Setelah pengguna menyalin teks atau mengunduh file (.DOCX / .PDF), pop-up hasil scrape akan tertutup dan **seketika memunculkan pop-up kedua: "INPUT JAWABAN AI"** di layar web.
- Pengguna cukup menempelkan (*paste*) output jawaban dari AI ke area teks yang tersedia.
- Tombol **"Tempel dari Clipboard"** memungkinkan penempelan jawaban instan hanya dengan 1 klik.
- Tombol **"⚡ MULAI INJECT JAWABAN"** langsung memulai pengisian kuis otomatis.

### 5. 💾 Penyimpanan Hasil Scrape yang Persisten (Tidak Mudah Hilang)
- Hasil scraping soal **TIDAK AKAN HILANG** setelah pengguna menyalin teks atau mengunduh dokumen.
- Hasil scrape tetap tersimpan aman di penyimpanan lokal browser (*chrome.storage.local*).
- Jika sewaktu-waktu pengguna membuka jendela popup ekstensi, hasil scrape soal tersebut masih ada dan dapat diakses kembali kapan saja.

### 6. ⚡ Auto-Fill Injector dengan Algoritma Cerdas (*Fuzzy Matching*)
- Menganalisis teks jawaban AI dan mencocokkannya ke elemen kuis di halaman menggunakan algoritma jarak Levenshtein dan *Sørensen-Dice Coefficient*.
- Mengatasi perbedaan spasi, huruf besar-kecil, tanda baca, maupun variasi penulisan teks jawaban.
- Mendukung seluruh jenis soal Moodle:
  - **Pilihan Ganda (Single Choice)**: Memilih radio button dengan tepat.
  - **Benar / Salah (True / False)**: Mendukung deteksi bahasa Indonesia (*Benar/Salah*) maupun Inggris (*True/False*).
  - **Pilihan Ganda Lebih Dari Satu (Checkbox)**: Memilih beberapa opsi sekaligus menggunakan pemisah tanda pipa (`|`).
  - **Soal Menjodohkan / Beranak (Matching Question)**: Mencocokkan dropdown *Choose* sub-soal satu per satu secara presisi.
  - **Isian Singkat (Short Answer / Numerical)**: Mengetik jawaban langsung ke dalam input teks kuis.
- **Auto-Navigate ke Halaman 1**: Jika scraping selesai di halaman akhir, saat tombol Inject ditekan, ekstensi otomatis mengarahkan kembali ke Halaman 1 agar seluruh soal terisi dari nomor 1!
- Berpindah halaman kuis (*Next page*) secara otomatis saat pengisian satu halaman selesai, hingga seluruh halaman kuis tuntas.

### 7. 🎯 In-Page HUD, Click Ripples, & Highlight Visual
- Menampilkan widget status melayang (*Floating HUD*) di pojok kanan atas layar dengan bilah kemajuan (*progress bar*) dan tombol **Batal** seketika.
- Pilihan jawaban yang berhasil diisi otomatis diberi sorotan hijau (*emerald highlight*) dan tag badge **AUTO-FILLED**.
- Soal dengan tingkat kecocokan di bawah 75% diberi sorotan kuning (*amber highlight*) dan tag badge **CEK ULANG** agar pengguna dapat memeriksa kembali sebelum submit.

### 8. 📍 Floating Quick Launcher Pill
- Tombol kapsul melayang (*pill*) bergaya Neo-Brutalism di pojok kanan bawah layar kuis.
- Memberikan akses cepat menu kapan saja: membuka hasil scrape, membuka form paste jawaban AI, atau memulai auto-scrape ulang.

### 9. 📊 Scraper Review Kuis & Pembuat Kunci Jawaban Instan
- Dapat digunakan pada halaman review kuis yang sudah selesai dikerjakan (`review.php`).
- Mengekstrak nilai akhir, total poin, status pengerjaan, dan durasi.
- Mengidentifikasi jawaban benar vs salah secara otomatis.
- Menghasilkan **Kunci Jawaban Ringkas** dan tombol **"Kirim ke Injector"** untuk langsung memindahkan kunci jawaban ke form injector kuis berikutnya!

---

## 🛠️ PANDUAN INSTALASI EKSTENSI

Ekstensi ini dapat dipasang pada browser berbasis Chromium seperti **Google Chrome, Microsoft Edge, Brave Browser, dan Opera**.

### Langkah-langkah:
1. Unduh atau pastikan folder ekstensi ini berada di komputer Anda:
   ```
   LMS-Auto-Solver-v2.7/  (atau nama folder proyek Anda)
   ├── asset/
   ├── lib/
   ├── content.js
   ├── popup.html
   ├── popup.js
   ├── manifest.json
   └── README.md
   ```
2. Buka browser (misalnya Google Chrome).
3. Buka halaman pengaturan ekstensi dengan mengetikkan:
   - **Chrome**: `chrome://extensions/`
   - **Edge**: `edge://extensions/`
   - **Brave**: `brave://extensions/`
4. Di pojok kanan atas, aktifkan toggle **Mode Pengembang** (*Developer Mode*).
5. Klik tombol **Muat yang belum dibongkar** (*Load Unpacked*) di pojok kiri atas.
6. Arahkan dan pilih folder ekstensi ini (folder yang memuat berkas `manifest.json`).
7. Ekstensi **LMS QUIZ Solver** akan muncul di daftar ekstensi aktif.
8. Klik ikon puzzle di toolbar browser dan klik ikon pin 📌 di sebelah **LMS QUIZ Solver** agar mudah diakses.

---

## 📖 PANDUAN PENGGUNAAN RUNUT (WORKFLOW LENGKAP)

Ikuti langkah-langkah berikut untuk menggunakan ekstensi dari awal hingga akhir kuis:

### 1. Tahap 1: Membuka Kuis di LMS
- Buka browser dan login ke akun LMS Telkom University: `https://lms.telkomuniversity.ac.id/`.
- Masuk ke mata kuliah dan klik kuis yang ingin dikerjakan.
- Klik **"Attempt quiz now"** atau **"Continue the last attempt"** hingga URL browser berada di halaman `attempt.php`.

### 2. Tahap 2: Menjalankan Auto-Scrape Soal
- Anda memiliki 2 cara mudah untuk memulai scraping:
  - **Cara A (Toolbar)**: Klik ikon ekstensi **LMS QUIZ Solver** di toolbar browser, lalu pada Card 1 klik tombol hijau **"1. Mulai Auto-Scrape"**. Jendela ekstensi akan tertutup otomatis.
  - **Cara B (Langsung di Layar)**: Klik kapsul melayang `[ 😈 LMS Solver ]` di pojok kanan bawah halaman web kuis, lalu pilih **"🚀 Mulai Auto-Scrape Kuis"**.
- Ekstensi akan mulai membaca soal di halaman saat ini. Jika kuis terdiri dari beberapa halaman, ekstensi akan otomatis menekan tombol *Next page* sampai semua halaman selesai discrape.

### 3. Tahap 3: Memilih Opsi Hasil Scrape di Pop-up Layar Web
Setelah scraping halaman terakhir selesai, **pop-up modal bergaya Neo-Brutalism akan langsung muncul di tengah layar website Anda!**
- **Jika Kuis Hanya Berisi Teks (Tanpa Gambar)**:
  - Klik tombol hijau besar: **"📋 Salin Teks Prompt AI (Default)"**. Seluruh teks soal beserta instruksi format jawaban akan langsung tersalin ke clipboard Anda.
  - Tersedia juga opsi unduh file **.PDF** atau **.DOCX** jika Anda lebih suka mengunggah dokumen ke AI.
- **Jika Kuis Berisi Soal Bergambar**:
  - Akan muncul banner kuning: *⚠️ Terdeteksi X Soal Bergambar!*
  - Klik tombol kuning besar: **"📄 Unduh File Word (.DOCX) — Rekomendasi Gambar"**. File Word rapi berisi teks soal beserta seluruh gambar akan terunduh ke komputer Anda.
  - Anda juga bisa memilih **"📑 Unduh PDF"** atau **"📦 Unduh Koleksi Gambar (.ZIP)"**.

### 4. Tahap 4: Memberikan Prompt dan Soal ke AI
- Buka tab baru dan akses AI pilihan Anda:
  - **ChatGPT** (`https://chatgpt.com/` - disarankan GPT-4o)
  - **Claude** (`https://claude.ai/` - disarankan Sonnet 3.5)
  - **Google Gemini** (`https://gemini.google.com/` - disarankan Gemini 1.5 Pro)
- **Jika memakai teks**: Cukup tekan `Ctrl + V` di kolom chat AI dan tekan Enter. Prompt sudah otomatis dilengkapi panduan instruksi agar AI menjawab dengan format yang presisi.
- **Jika memakai file (.DOCX / .PDF)**: Unggah (*attach*) file `.docx` atau `.pdf` yang tadi diunduh, lalu kirim ke AI.
- Salin seluruh teks jawaban yang diberikan oleh AI.

### 5. Tahap 5: Menempelkan Jawaban di Pop-Up In-Page
- Kembali ke tab kuis LMS Anda.
- Segera setelah Anda menekan tombol salin atau unduh pada Tahap 3, pop-up pertama otomatis tertutup dan digantikan oleh pop-up kedua: **"🤖 INPUT JAWABAN AI"** di layar web!
- *(Jika pop-up tertutup, Anda bisa membukanya kembali kapan saja lewat pill `[ LMS Solver ]` di pojok kanan bawah atau lewat jendela ekstensi).*
- Klik tombol **"📋 Tempel dari Clipboard"** atau tekan `Ctrl + V` langsung di textarea.
- Pastikan nomor soal yang tertera sesuai dengan urutan soal kuis.

### 6. Tahap 6: Eksekusi Auto-Fill Kuis
- Klik tombol hijau: **"⚡ MULAI INJECT JAWABAN"**.
- Pop-up akan otomatis tertutup dan bilah HUD aktif di pojok kanan atas.
- **Sistem Otomatis Menavigasi**: Jika tadi scraping berhenti di halaman terakhir, ekstensi secara otomatis mengarahkan halaman kembali ke **Halaman 1** terlebih dahulu!
- Ekstensi akan mengisi soal demi soal secara otomatis:
  - Radio button opsi jawaban terklik.
  - Dropdown soal beranak terpilih.
  - Checkbox tercentang.
  - Input isian terisi.
- Setiap nomor yang selesai diisi akan diberi sorotan warna hijau.
- Setelah satu halaman selesai diisi, ekstensi otomatis menekan tombol *Next page* dan melanjutkan pengisian di halaman berikutnya hingga halaman terakhir!

### 7. Tahap 7: Review & Selesaikan Kuis
- Setelah semua halaman selesai, periksa kembali soal yang diberi tanda kuning (tag **CEK ULANG** jika ada).
- Klik tombol **"Finish attempt..."** dan **"Submit all and finish"** pada halaman kuis Moodle.

### 8. Tahap 8: Scraping Review Kuis (Membuat Bank Soal / Kunci Jawaban)
- Setelah kuis disubmit dan Anda berada di halaman review (`review.php`):
- Buka ekstensi **LMS QUIZ Solver** di toolbar browser.
- Gulir ke **Card 3: SCRAPE HASIL KUIS (REVIEW)**.
- Klik tombol ungu **"Scrape Kunci Jawaban"**.
- Ekstensi akan mengekstrak seluruh soal, mendeteksi jawaban mana yang benar dan mana yang salah, serta menghasilkan:
  - **Quick Answer Key**: Kunci jawaban ringkas yang bisa disalin.
  - **Full Review Report**: Laporan lengkap nilai, statistik, dan pembahasan.
  - **Tombol "Kirim ke Injector"**: Memindahkan kunci jawaban langsung ke form injector untuk pengerjaan attempt berikutnya!

---

## 📝 CHEATSHEET FORMAT JAWABAN AI

Agar sistem *Auto-Fill Injector* dapat mengenali dan mengisi jawaban dengan akurasi 100%, pastikan AI menghasilkan jawaban sesuai salah satu format di bawah ini:

| Tipe Soal | Contoh Format Jawaban AI | Keterangan |
| :--- | :--- | :--- |
| **Pilihan Ganda Biasa** | `1. a. Event-based coordination`<br>atau `1. a`<br>atau `1. Event-based coordination` | Disarankan menyertakan huruf opsi (`a/b/c/d`) agar akurasi maksimal. |
| **Benar / Salah (True/False)** | `2. True`<br>atau `2. False`<br>atau `2. Benar` | Mendukung penulisan bahasa Indonesia maupun Inggris. |
| **Checkbox (Pilih Banyak)** | `3. a. Opsi Pertama \| c. Opsi Ketiga` | Pisahkan setiap opsi yang benar menggunakan tanda pipa (`\|`). |
| **Menjodohkan / Soal Beranak** | `4. a. Sub Soal 1: Jawaban A \| b. Sub Soal 2: Jawaban B` | Tulis dalam 1 baris di bawah nomor soal induk, pisahkan sub-soal dengan tanda pipa (`\|`). |
| **Isian Singkat / Angka** | `5. SDD`<br>atau `6. 42` | Langsung tuliskan teks atau nilai numerik setelah nomor soal. |

> **PENTING UNTUK SOAL BERANAK / MENJODOHKAN:**  
> Jangan membuat nomor baru untuk sub-soal! Sub-soal harus tetap berada di bawah nomor soal induknya (misalnya setelah Soal No. 4 beranak, nomor berikutnya harus melanjutkan ke Soal No. 5).

---

## 💡 TIPS & TRIK AGAR AKURASI 100%

1. **Gunakan Model AI Multimodal Terbaik untuk Soal Bergambar:**
   - Untuk soal bergambar, gunakan **ChatGPT Plus (GPT-4o)** atau **Claude 3.5 Sonnet**.
   - Unggah berkas **.DOCX** yang dihasilkan ekstensi. Format OpenXML kami mempertahankan tata letak gambar dan teks asli soal secara proporsional.
2. **Perhatikan Badge "CEK ULANG":**
   - Jika ada opsi jawaban yang diberi highlight kuning dan badge kuning bertuliskan **CEK ULANG**, periksa nomor tersebut secara manual. Hal ini terjadi jika kemiripan teks jawaban di bawah 75%.
3. **Penyimpanan Draft Jawaban:**
   - Kolom isian jawaban AI otomatis menyimpan draft ketikan Anda di memori. Jika halaman ter-refresh secara tidak sengaja, teks jawaban tidak akan hilang.
4. **Tombol Batal Darurat:**
   - Pada HUD pojok kanan atas layar kuis terdapat tombol merah **Batal**. Anda dapat menghentikan seluruh proses otomatisasi kapan saja dengan sekali klik.

---

## ❓ TROUBLESHOOTING & PEMECAHAN MASALAH

### 1. Ekstensi menampilkan pesan "Buka halaman attempt.php dahulu!"
- **Solusi**: Ekstensi hanya dapat melakukan scraping soal pada halaman pengerjaan kuis aktif (`attempt.php`). Pastikan Anda sudah mengklik tombol *Attempt quiz now* di LMS.

### 2. Gambar soal tidak muncul pada file PDF atau DOCX
- **Solusi**: Pastikan koneksi internet stabil saat proses scraping berlangsung. Ekstensi mengunduh gambar langsung menggunakan sesi cookies LMS Anda. Jika koneksi lambat, ekstensi memiliki mekanisme fallback kanvas otomatis. Anda juga dapat mengklik tombol unduh arsip gambar `.ZIP`.

### 3. Pop-up di layar web tidak muncul setelah scraping selesai
- **Solusi**: Pastikan halaman kuis LMS diizinkan menjalankan JavaScript. Anda juga dapat membuka hasil scrape kapan saja dengan mengklik tombol kapsul melayang `[ 😈 LMS Solver ]` di pojok kanan bawah layar atau membuka jendela popup ekstensi di toolbar browser.

### 4. Hasil scrape hilang setelah menekan tombol salin?
- **Keterangan**: Pada versi 2.8 ini, hasil scrape **tidak dihapus** saat Anda menyalin teks atau mengunduh berkas. Data tetap tersimpan di memori browser dan dapat diakses kembali lewat ekstensi. Jika Anda benar-benar ingin membersihkan memori, gunakan tombol **"Selesai & Bersihkan Hasil"**.

---

## 📁 STRUKTUR BERKAS & TEKNOLOGI

Proyek ini dibangun murni menggunakan teknologi web modern native tanpa ketergantungan build tool yang rumit:

```
LMS-Auto-Solver-v2.7/
├── manifest.json              # Konfigurasi ekstensi Chrome Manifest V3 (v2.8)
├── content.js                 # Content script: Scraper, In-Page Modals, Auto-Fill, DOM Engine
├── popup.html                 # UI Jendela ekstensi popup (Neo-Brutalism Tuckii style)
├── popup.js                   # Controller popup, event handling, confetti visual fx
├── README.md                  # Dokumentasi lengkap proyek
├── asset/                     # Ikon ekstensi & aset visual SVG
│   ├── devil-svgrepo-com.svg
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── lib/                       # Pustaka pihak ketiga (tersemat lokal)
    ├── docx.umd.js            # Generator dokumen OpenXML Word (.DOCX) native
    ├── jspdf.umd.min.js       # Generator dokumen PDF (.PDF) client-side
    └── jszip.min.js           # Pengompres arsip gambar (.ZIP) client-side
```

- **Manifest Version**: 3
- **CSS Styling**: Neo-Brutalism "Tuckii" Palette (`#FFDE59`, `#4ADE80`, `#818CF8`, `#FF6B8B`, border 2.5px solid black, hard drop-shadows).
- **Matching Algorithm**: Levenshtein Distance & Sørensen-Dice Coefficient Tokenizer.
- **Image Extraction**: Native DOM Image Sampling, Canvas 2D Context, & Fetch API with Session Credentials.

---

<div align="center">
  <b>Dibuat dengan ❤️ untuk Membantu Mahasiswa Telkom University</b><br>
  <i>Gunakan ekstensi ini dengan bijak sebagai sarana belajar dan efisiensi waktu!</i>
</div>
