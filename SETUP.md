# Setup multi-user Bio GAINS

Alur untuk anggota: kode undangan > daftar dengan Google > isi data di Studio (boleh dicicil, simpan draf) > Publish > halaman pribadi di `domain/nama` > data masuk Dashboard chapter.
Pengunjung yang mengisi form di halaman seseorang menulis ke tab Contacts milik orang itu.

Halaman utama (`/` tanpa slug) tetap memakai `data.js` milik Dedy seperti sebelumnya.

## Komponen
| File | Fungsi |
|---|---|
| `apps-script.gs` | Backend (Google Apps Script) yang terikat ke Google Sheet |
| `config.js` | URL web app Apps Script dan Google Client ID |
| `template.js` | Profil kosong untuk akun baru |
| `studio.html` | Login Google, daftar dengan kode undangan, isi profil, unggah foto, pratinjau, publish |
| `dashboard.html` | Daftar anggota chapter yang sama (wajib login) |
| `404.html` | Mengubah alamat `/nama` menjadi `/?u=nama` di GitHub Pages |
| `editor.html`, `data.js` | Cara lama (tetap dipakai untuk halaman utama Dedy) |

## 1. Domain
1. Beli domain, lalu arahkan ke GitHub Pages (4 record A ke IP GitHub Pages untuk domain utama, atau CNAME ke `<user>.github.io` untuk subdomain). Ikuti panduan resmi GitHub Pages "Managing a custom domain".
2. Ubah isi file `CNAME` menjadi domain baru, aktifkan Enforce HTTPS di Settings > Pages.
3. Profil dibuka di `https://domainanda/nama`.
   Catatan: GitHub Pages menyajikan `404.html` untuk alamat `/nama` dengan status 404. Halaman tetap tampil normal untuk manusia, tapi bot pratinjau link (WhatsApp, dll) bisa gagal menampilkan kartu pratinjau. Kalau itu penting, pindah hosting ke Cloudflare Pages atau Netlify dan ganti `404.html` dengan aturan rewrite `/* /index.html 200`.

## 2. Google OAuth Client ID
1. Google Cloud Console: buat project, lalu APIs & Services > OAuth consent screen: tipe External, scope dasar saja (`openid`, `email`, `profile`). Ubah status ke **In production** supaya semua akun Google bisa masuk.
2. Credentials > Create credentials > OAuth client ID > Web application. Authorized JavaScript origins: `https://domainanda` (tambah `http://localhost:8000` untuk tes lokal).
3. Salin Client ID ke `config.js` (`clientId`) dan `apps-script.gs` (`var CLIENT_ID`).

## 3. Apps Script
1. Di Google Sheet: Extensions > Apps Script. Ganti isi dengan `apps-script.gs`.
2. Jalankan `setup` sekali dan setujui izinnya (Sheets, Drive, koneksi eksternal). Tab `Profiles`, `Invites`, `Chapters` dibuat otomatis. Tab lama yang kekurangan kolom ditambah kolomnya otomatis.
3. Deploy > Manage deployments > Edit > Version: **New version** > Deploy. URL `/exec` tetap sama.

## 4. Chapter dan undangan
Jalankan dari editor Apps Script (isi nilai di dalam fungsi lalu Run, atau buat fungsi pembungkus):
```
createChapter('grow', 'BNI GROW · Jakarta Barat')
createInvites(5, 'Batch 1', 'grow')
```
- Kode (`BG-XXXXXX`) muncul di tab `Invites`. Satu kode untuk satu orang, dan terikat ke satu chapter.
- Chapter anggota ditentukan oleh kode undangan dan tidak bisa diubah oleh anggota. Nama chapter di profil selalu mengikuti tab `Chapters`.
- Kirim kode beserta link `https://domainanda/studio.html`.

## 5. Moderasi (tab `Profiles`)
- `public`: otomatis TRUE saat pertama kali publish (`AUTO_APPROVE = true`). Ubah ke FALSE untuk menyembunyikan dari Dashboard chapter tanpa mematikan halamannya. Publish ulang tidak mengubahnya kembali.
- `status` = `blocked`: menonaktifkan halaman, login, simpan, dan dashboard untuk orang itu.
- `chapter_id`: pindahkan anggota ke chapter lain dengan mengubah nilai ini.

## 6. Contacts
- Setiap akun baru otomatis punya tab `Contacts <NamaDepan>`. Isian form WhatsApp di halaman profil mereka masuk ke tab itu.
- Halaman utama Dedy (tanpa slug) menulis ke tab `LEGACY_SHEET` (default `Leads`). Ganti nama tab dan nilai konstanta itu kalau mau.

## Draf vs publish
- **Simpan draf** hanya menyimpan di Sheet. Halaman publik tidak berubah.
- **Pratinjau** membuka draf di tab baru tanpa menyentuh server dan tanpa mencatat kontak.
- **Publish** menyimpan dan menerbitkan: versi publik lama diganti, data Dashboard chapter ikut diperbarui. Halaman publik di-cache sampai 5 menit di server, tapi cache dihapus saat publish.

## Batasan yang perlu diketahui
- Satu akun Google untuk satu profil dan satu chapter.
- Profil disimpan sebagai JSON di sel (maksimal 45.000 karakter untuk draf, dan sebanyak itu lagi untuk versi publish). Foto disimpan di Google Drive Anda (folder `BioGAINS Photos`).
- Foto Drive ditampilkan lewat `drive.google.com/thumbnail`. Kalau traffic besar, Google bisa membatasi.
- Apps Script punya kuota harian dan respons 1 sampai 2 detik.
- Teks profil dibersihkan: hanya `<em>`, `<mark>`, `<b>` yang lolos, dan URL gambar harus dari Drive atau folder `img/`.
- `REGISTRATION = 'open'` membuat akun tanpa chapter, sehingga tidak muncul di dashboard mana pun. Untuk pendaftaran umum perlu pilihan chapter dan CAPTCHA, belum dibuat.
