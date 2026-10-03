# Brief: Bio GAINS multi-user

## Proyek
Situs statis (GitHub Pages) plus backend Google Apps Script yang terikat ke satu Google Sheet. Dedy punya "Bio GAINS" (profil digital ala BNI). Sekarang dibuat multi-user: tiap anggota punya halaman sendiri di `domain/nama`, dan anggota satu chapter bisa saling melihat di dashboard.

## Kode
Repo `Mitologian/biogains`, branch `claude/multiuser-biogains`. Detail lengkap ada di `SETUP.md`. File yang relevan untuk sisi Apps Script: `apps-script.gs` (backend lengkap) dan `config.js`.

## Alur pengguna
Admin memberi kode undangan (terikat ke satu chapter) > anggota masuk dengan Google di `studio.html` > isi profil, **Simpan draf**, **Pratinjau**, lalu **Publish** > halaman publik di `/nama` > profil muncul di `dashboard.html` (hanya anggota chapter yang sama). Pengunjung yang mengisi form WhatsApp di halaman seseorang tertulis ke tab `Contacts <NamaDepan>` milik orang itu.

## Struktur Sheet
Dibuat dan dimigrasi otomatis oleh script.
- `Profiles`: satu baris per anggota. Kolom `data` adalah draf, `published` adalah versi publik (JSON). `public` otomatis TRUE saat publish pertama. `status=blocked` menonaktifkan akun.
- `Invites`: `code`, `chapter_id`, `note`, `used_by`, `used_at`.
- `Chapters`: `id`, `name`.
- `Contacts <Nama>`: satu tab per anggota.
- `Leads`: tab lama untuk halaman utama Dedy. Jangan dihapus, formatnya tetap didukung.

## Yang dikerjakan di Apps Script atau Sheet
1. Buka project Apps Script yang terikat ke Sheet yang sudah ada, bukan project baru. Deployment web app yang sekarang (URL berakhiran `.../exec`, tercatat di `config.js`) dipakai terus.
2. Ganti seluruh kode dengan isi `apps-script.gs` dari branch.
3. Isi `var CLIENT_ID` dengan Google OAuth Web Client ID (dibuat Dedy, lihat bagian "Perlu Dedy"). Nilainya harus sama dengan `clientId` di `config.js`.
4. Jalankan `setup()` sekali dan setujui izinnya (Sheets, Drive, UrlFetch). Pastikan tab `Profiles`, `Invites`, `Chapters` terbentuk.
5. Deploy ulang di deployment yang sama: Deploy > Manage deployments > Edit > Version: **New version**. Pengaturan: Execute as Me, Who has access **Anyone**. Jangan buat deployment baru karena URL akan berubah.
6. Jalankan `createChapter('grow', 'BNI GROW · Jakarta Barat')`. Konfirmasi nama chapter yang benar ke Dedy.
7. Jalankan `createInvites(5, 'Batch 1', 'grow')`. Kode `BG-XXXXXX` muncul di tab `Invites`. Serahkan ke Dedy.

## Pengecekan setelah deploy
- `GET <url>/exec?action=profile&u=tidakada` harus mengembalikan `{"ok":false,"error":"not_found"}`.
- Kirim POST body teks JSON `{"name":"TES","chapter":"X","classification":"Y","lang":"id","source":"tes","page":"p"}` tanpa `action` (format lama). Harus tertulis satu baris di tab `Leads`. Hapus baris tesnya setelah dicek.
- Login Google tidak bisa diuji dari sisi script. Tokennya hanya didapat dari browser lewat `studio.html`.

## Perlu Dedy (di luar akses Apps Script)
- Membuat OAuth Client ID. Consent screen harus **In production**, dan origin yang diizinkan adalah domain baru.
- Membeli domain, mengarahkan DNS ke GitHub Pages, mengganti isi `CNAME`.
- Merge PR dan menguji login asli dari akun Google.
- Membagikan kode undangan.

## Jangan diubah tanpa tanya
- Nama kolom dan nama tab di atas. Script mencari berdasarkan nama.
- Isi kolom `data` dan `published` secara manual. Itu JSON besar yang diproses script.
- Arti kolom `public` dan `status`: `public=FALSE` menyembunyikan dari dashboard, `status=blocked` mematikan akun.
