# Instruksi untuk Hermes: merapikan Apps Script dan Sheet

## Konteks
Situs `Mitologian/biogains` (GitHub Pages) punya form WhatsApp. Saat dikirim, data ditulis diam-diam ke Google Sheet lewat satu Apps Script web app. Nama tab tujuan diganti dari `Leads` menjadi **`Contacts`** (hanya satu pemilik, jadi tanpa nama orang).

File yang dipakai: `apps-script.gs` di branch `main`. Jangan memakai kode dari branch `claude/multiuser-biogains`. Itu versi multi-user yang sedang di-pause.

## Langkah di Apps Script
1. Buka project Apps Script yang terikat ke Sheet yang dipakai situs (Extensions > Apps Script). Jangan buat project baru.
2. Cek versi kode yang ada sekarang:
   - Kalau berisi `doGet`, `createChapter`, `createInvites`, atau `CLIENT_ID`, itu versi multi-user. Boleh diganti dengan `apps-script.gs` dari `main`.
   - Kalau hanya berisi `doPost` dengan `SHEET_NAME`, itu versi lama.
   - Simpan salinan kode lama dulu di tempat lain sebagai cadangan.
3. Ganti seluruh isi dengan `apps-script.gs` dari `main`.
4. Deploy ulang di deployment yang sama: Deploy > Manage deployments > Edit (ikon pensil) > Version: **New version** > Deploy. Pastikan Execute as: **Me** dan Who has access: **Anyone**. Jangan buat deployment baru karena URL `/exec` akan berubah dan situs berhenti menulis ke Sheet.
5. Kalau URL `/exec` ternyata harus berubah, kabari Dedy. URL itu tertulis di `index.html` (variabel `SHEET_URL`).

## Langkah di Sheet
1. Lihat semua tab yang ada, lalu catat. Jangan hapus tab yang berisi data tanpa persetujuan Dedy.
2. Tab data isian harus bernama persis **`Contacts`** dengan header baris 1:
   `Timestamp | Name | BNI Chapter | Business Classification | Lang | Source | Page`
   - Kalau masih bernama `Leads` atau `Contacts Dedy`, ganti nama jadi `Contacts`. Script juga bisa mengganti nama sendiri saat ada isian masuk, tapi lebih baik dilakukan manual sekarang.
   - Kalau ada dua tab (misalnya `Leads` dan `Contacts`), jangan digabung diam-diam. Tanyakan dulu ke Dedy.
3. Bersihkan baris tes: baris dengan Name berawalan `TEST`/`TES`, atau Source berisi `claude_test`/`tes`. Hapus hanya baris tes. Isian asli tetap.
4. Tab sisa dari percobaan sebelumnya (`Profiles`, `Invites`, `Chapters`, `Contacts <Nama>`): kalau kosong atau hanya berisi header, tanyakan ke Dedy sebelum menghapus.
5. Rapikan tampilan (aman dilakukan): bekukan baris 1, format kolom Timestamp sebagai tanggal dan jam, lebarkan kolom.
6. Cek apakah ada rumus, Looker/Data Studio, atau script lain yang menyebut tab `Leads` dengan nama. Perbarui kalau ada. Rumus di dalam Sheet ikut otomatis saat tab diganti nama, tapi referensi dari luar tidak.

## Pengecekan setelah semuanya selesai
Lakukan setelah PR di-merge dan GitHub Pages selesai deploy (1 sampai 2 menit).
1. Buka situs live, kirim satu isian dengan Name `TES Hermes`, lalu cek bahwa satu baris baru muncul di tab `Contacts` dan tidak ada tab baru yang tiba-tiba terbentuk.
2. Hapus baris `TES Hermes` setelah dicek.
3. Kalau baris tidak muncul, cek Executions di Apps Script untuk error, dan cek bahwa deployment "Anyone" sudah benar.

## Yang tidak boleh diubah tanpa tanya
- Urutan dan nama kolom header di atas.
- Pengaturan deployment web app (Execute as Me, akses Anyone).
- Isi data isian yang asli.
