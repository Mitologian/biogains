# Setup multi-user Bio GAINS

Halaman utama (`index.html` tanpa `?u=`) tetap memakai `data.js` milik Dedy seperti sebelumnya.
Profil orang lain dimuat dari Google Sheet lewat `index.html?u=<slug>`.

## Komponen
| File | Fungsi |
|---|---|
| `apps-script.gs` | Backend (Google Apps Script) yang terikat ke Google Sheet |
| `config.js` | URL web app Apps Script dan Google Client ID |
| `template.js` | Profil kosong untuk akun baru |
| `studio.html` | Login Google, daftar dengan kode undangan, isi profil, unggah foto |
| `directory.html` | Daftar profil yang sudah disetujui |
| `editor.html`, `data.js` | Cara lama (tetap dipakai untuk halaman utama Dedy) |

## 1. Google OAuth Client ID
1. Buka Google Cloud Console, buat project (atau pakai yang ada).
2. APIs & Services > OAuth consent screen: tipe External, isi nama aplikasi dan email. Scope dasar saja (`openid`, `email`, `profile`). Ubah status ke **In production** supaya semua akun Google bisa masuk (kalau tetap Testing, hanya test user yang bisa).
3. Credentials > Create credentials > OAuth client ID > Web application.
   - Authorized JavaScript origins: `https://biogains.dedydahlan.com` (tambah `http://localhost:8000` kalau mau tes lokal).
4. Salin Client ID ke dua tempat:
   - `config.js` (`clientId`)
   - `apps-script.gs` (`var CLIENT_ID`)

## 2. Apps Script
1. Di Google Sheet Anda: Extensions > Apps Script. Ganti isi dengan `apps-script.gs`.
2. Jalankan fungsi `setup` sekali dan setujui izinnya (Sheets, Drive, koneksi eksternal). Tab `Profiles` dan `Invites` dibuat otomatis.
3. Deploy > Manage deployments > Edit (ikon pensil) > Version: **New version** > Deploy. URL `/exec` tetap sama.
4. Kalau URL berubah, perbarui `api` di `config.js`.

## 3. Mengundang teman
1. Di editor Apps Script jalankan `createInvites(5, 'Batch BNI Grow')`. Kode (`BG-XXXXXX`) muncul di tab `Invites`.
2. Kirim satu kode per orang beserta link `https://biogains.dedydahlan.com/studio.html`.
3. Mereka masuk dengan Google, memasukkan kode, memilih nama link (slug) dan nama, lalu mengisi profil. Halaman mereka: `https://biogains.dedydahlan.com/?u=<slug>`.
4. Untuk membuka pendaftaran umum nanti, ubah `REGISTRATION = 'open'` dan deploy ulang. Sebelum itu sebaiknya tambah CAPTCHA.

## 4. Direktori dan moderasi (di tab `Profiles`)
- `public` = TRUE (atau centang) untuk menampilkan di `directory.html`.
- `status` = `blocked` untuk menonaktifkan profil dan login-nya. Isi kosong atau `active` berarti normal.

## 5. Contacts
- Setiap akun baru otomatis punya tab `Contacts <NamaDepan>`. Isian form WhatsApp di halaman profil mereka masuk ke tab itu.
- Halaman utama Dedy (tanpa `?u=`) tetap menulis ke tab `LEGACY_SHEET` (default `Leads`). Ganti nama tab dan nilai konstanta itu kalau mau, mis. `Contacts Dedy`.

## Batasan yang perlu diketahui
- Data profil disimpan sebagai JSON di satu sel (maksimal 45.000 karakter). Foto disimpan di Google Drive Anda (folder `BioGAINS Photos`), bukan di sel.
- Foto Drive ditampilkan lewat `drive.google.com/thumbnail`. Kalau traffic besar, Google bisa membatasi. Untuk skala besar, pindah ke penyimpanan gambar khusus.
- Apps Script punya kuota harian dan respons 1 sampai 2 detik. Profil di-cache 5 menit di server.
- Teks profil dibersihkan: hanya `<em>`, `<mark>`, `<b>` yang lolos, URL gambar harus dari Drive atau folder `img/`.
