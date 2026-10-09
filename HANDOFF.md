# Serah-terima: Bio GAINS multi-user bergaya one-pager untuk member BNI

Dokumen ini untuk sesi kerja baru yang tidak membawa ingatan dari sesi sebelumnya. Baca seluruhnya sebelum menulis kode.

## 1. Tujuan

Membuat platform di mana **setiap member BNI punya halaman Bio GAINS pribadi** di `domain/nama`, dengan:
- tampilan **satu halaman yang di-scroll** (gaya `hi-dedydahlan`), bukan 6 tab seperti Bio GAINS Dedy;
- **input yang jauh lebih sederhana** untuk member (wizard mobile, bukan editor puluhan kolom);
- tombol WhatsApp yang mencatat data pengunjung ke tab `Contacts` milik member itu;
- **dashboard chapter** yang hanya menampilkan anggota chapter yang sama.

Pemilik proyek: Dedy Dahlan (Mitologi Inspira, anggota BNI GROW Jakarta Barat). Pengguna akhir: member BNI lain, hampir semuanya membuka dari HP lewat WhatsApp.

## 2. Yang sudah ada (jangan dibangun ulang)

### Repo `Mitologian/biogains` (publik)
- Branch `main`: Bio GAINS **pribadi Dedy** (satu orang). Sudah live. Berisi form WhatsApp yang mencatat ke Google Sheet, menu Bagikan/Simpan, kerangka app yang bisa dipasang (manifest, ikon, service worker), dan petunjuk "Save to read later". **Jangan diubah** untuk proyek ini.
- Branch `claude/multiuser-biogains`: **mesin multi-user, sudah ditulis dan diuji, belum pernah dipasang di produksi**. Baca `SETUP.md` dan `BRIEF.md` di branch ini. Isinya:
  - `apps-script.gs`: backend (Google Apps Script terikat ke Google Sheet). Aksi: `me`, `register`, `save` (draf), `publish`, `upload`, `chapter`, `contact`; GET `profile`. Verifikasi login lewat ID token Google (`tokeninfo`). Tab: `Profiles`, `Invites`, `Chapters`, `Contacts <Nama>`. Kolom yang kurang di sheet lama ditambah otomatis.
  - `studio.html`: login Google, daftar dengan kode undangan, editor, unggah foto (diperkecil di browser lalu disimpan di Google Drive), pratinjau, simpan draf, publish, draf otomatis di browser, tahan sesi habis.
  - `index.html`: merender profil dari `?u=slug` atau `/slug`, sanitasi teks (hanya `<em>`, `<mark>`, `<b>`) dan URL gambar.
  - `dashboard.html`: daftar anggota chapter yang sama (wajib login).
  - `404.html`: meneruskan `/slug` ke `/?u=slug` di GitHub Pages.
  - `template.js`: profil kosong. `config.js`: URL web app dan Google Client ID (masih kosong).
- Aturan penting yang sudah diterapkan: chapter anggota ditentukan **kode undangan** (tidak bisa diubah anggota), halaman publik hanya menampilkan versi yang sudah **dipublish**, data lead masuk ke tab `Contacts <NamaDepan>` pemilik halaman.

### Repo `Mitologian/hi-dedydahlan` (privat)
Kartu nama digital satu halaman untuk non-BNI. Dipakai sebagai **acuan bentuk dan gaya**: scroll satu halaman, tema gelap dengan aksen oranye, toggle ID/EN, tombol cepat (WhatsApp, Simpan, Bagikan, Aplikasi), simpan kontak lewat vCard, bagikan, pasang app, form WhatsApp dengan pilihan konteks, pencatat lead ke sheet. Dihosting di **Cloudflare Pages** (`hi.dedydahlan.com`). Repo ini punya `CLAUDE.md` dan `README.md` sendiri, baca untuk aturannya. Jangan mengubah repo itu.

## 3. Keputusan yang sudah diambil

1. Repo **baru dan terpisah** untuk platform ini (bukan di `biogains` dan bukan di `hi-dedydahlan`). Nama repo ditentukan pemilik.
2. Domain **netral**, bukan subdomain `dedydahlan.com`, karena member tidak boleh terlihat sebagai "milik Dedy". Alamat profil berbentuk `domain/nama`.
3. Awal **hanya dengan undangan** (kode terikat ke satu chapter). Mulai dari BNI GROW, nantinya chapter lain. Pendaftaran terbuka belum.
4. Login **Google**, tanpa password.
5. Alur anggota: kode undangan, masuk dengan Google, isi data (boleh dicicil, simpan draf), pratinjau, **publish**, halaman pribadi di `/nama`, data masuk dashboard chapter. Mengubah data: masuk lagi, ubah, publish, versi lama otomatis tergantikan.
6. Orang yang mengisi form di halaman seseorang: data masuk ke tab `Contacts` milik orang itu, di Sheet milik Dedy untuk sementara.
7. Dashboard chapter: hanya anggota chapter yang sama, hanya yang sudah publish, wajib login.
8. Halaman utama Dedy (`biogains.dedydahlan.com`) dan kartu `hi.dedydahlan.com` **tidak diubah**.

## 4. Konsep yang diusulkan (belum disetujui sebagai final)

### Tampilan one-pager
Urutan scroll: hero (foto, nama, klasifikasi bisnis, chapter, status), GAINS, bisnis, Contact Sphere ("siapa yang ingin saya temui"), klien, "Cara merujuk saya" (Bread/Cheese/Meat), lalu tombol WhatsApp, simpan kontak (vCard), bagikan, dan pasang app. **Bagian yang tidak diisi otomatis tersembunyi**, jadi profil setengah jadi tidak tampak kosong. Pertimbangkan membuang progres "Kenali saya" dari Bio GAINS lama karena tidak cocok untuk satu halaman.

### Input yang disederhanakan (inti perubahan)
Editor lama punya puluhan kolom dengan format `::` dan dua bahasa per baris. Ganti dengan **wizard mobile**:
- satu topik per layar, langkah pendek, draf tersimpan otomatis, bisa dilanjutkan nanti;
- wajib hanya: nama, foto, klasifikasi (pilih dari daftar), nama bisnis, "apa yang saya lakukan" (1 sampai 2 kalimat), nomor WhatsApp. Sisanya opsional;
- GAINS jadi 5 isian satu baris dengan contoh; Contact Sphere jadi "tulis 3 profesi yang ingin Anda temui"; Bread/Cheese/Meat disusun dari beberapa pertanyaan ringan (aplikasi menyusun kalimatnya);
- **satu bahasa per profil** (member memilih), tidak perlu mengisi dua kali;
- foto dari kamera atau galeri, dipotong otomatis;
- indikator "profil Anda 60% lengkap" dan petunjuk apa yang kurang.

### Arsitektur
- Awalnya tetap statis plus Google Apps Script dan Sheet (mesin multi-user di atas), supaya cepat. Renderer membaca JSON profil dan merender bagian-bagian one-pager.
- Hosting di **Cloudflare Pages**: `/nama` bersih lewat aturan rewrite (tanpa trik 404), dan memungkinkan **pratinjau link WhatsApp per member** (nama dan foto masing-masing) lewat Worker. Ini penting karena link BNI banyak dibagikan di grup WhatsApp.

## 5. Hal yang masih perlu diputuskan pemilik
- Nama repo, pemilik repo, dan nama domain platform.
- Gaya visual: gelap-oranye seperti `hi-dedydahlan`, atau merah BNI, atau tema per member.
- Bagian BNI mana yang wajib. Apakah nomor WhatsApp wajib.
- Siapa mengerjakan sisi Apps Script dan Sheet. Ada agen bernama **Hermes** (punya akses Apps Script, dipakai untuk menempel kode, deploy, dan merapikan Sheet) dan **Lapis** (agen di mesin kantor, dipakai untuk penerbitan di Cloudflare dan Apps Script). Pembagian tugas di proyek ini belum ditetapkan.
- Pembuatan Google OAuth Client ID (Google Cloud Console, consent screen "In production", origin domain baru). Harus dilakukan pemilik.

## 6. Risiko dan catatan
- **Kepemilikan data lead:** semua kontak masuk ke Sheet Dedy, jadi Dedy bisa melihat lead semua member. Perlu catatan privasi di form. Untuk jangka panjang pertimbangkan penyimpanan per chapter.
- **Merek BNI:** nama platform dan logo sebaiknya netral. Pemilik yang memeriksa aspek mereknya. Ini bukan nasihat hukum.
- **Apps Script:** ada kuota harian dan respons 1 sampai 2 detik. Cukup untuk puluhan sampai ratusan member. Untuk banyak chapter, pindah ke database sungguhan (Supabase atau Firebase).
- **Foto di Drive:** ditampilkan lewat `drive.google.com/thumbnail`, bisa dibatasi Google kalau traffic besar.
- **Login Google:** member tanpa akun Google belum terlayani. Token berlaku sekitar 1 jam, sudah ditangani agar isian tidak hilang.
- **Dua Apps Script, satu Sheet:** kartu `hi-dedydahlan` dan Bio GAINS memakai URL Apps Script berbeda, dan `kartu.gs` punya `doPost` sendiri. Hati-hati agar dua `doPost` tidak saling menimpa kalau ditempel di project yang sama.
- Sebelum men-deploy kode Apps Script baru di deployment yang sudah dipakai situs live, pastikan versi barunya masih menerima format lama. Deploy sebagai **New version** di deployment yang sama, jangan membuat deployment baru (URL akan berubah).

## 7. Urutan pengerjaan yang diusulkan
1. Model data, wizard input, dan renderer one-pager, diuji dengan sekitar 5 member satu chapter.
2. Dashboard chapter, simpan kontak (vCard), QR, dan bagikan.
3. Pratinjau link per member (Cloudflare Worker).
4. Dibuka untuk chapter lain.

## 8. Cara kerja dan preferensi pemilik
- Bahasa Indonesia, jawaban ringkas dan langsung, tidak bertele-tele. **Tanpa tanda pisah panjang (em dash)** di teks.
- Tanyakan bila ada yang tidak jelas. Jangan membuat repo, PR, atau merge tanpa diminta. Jangan mengubah repo lain.
- Sebelum menulis program untuk tampilan baru, buat **contoh visual** (HTML bergerak) untuk dipilih pemilik dulu.
- Selalu uji sebelum menyatakan selesai, dan jujur tentang apa yang belum bisa diuji (misalnya login Google asli dan Apps Script asli).
- Cara uji yang dipakai dan berhasil: Playwright (Chromium sudah terpasang di `/opt/pw-browsers`) dengan API palsu, plus Google Sheet palsu di Node untuk menguji logika Apps Script.
- Tidak ada rahasia di repo (kunci API, token, sandi).
