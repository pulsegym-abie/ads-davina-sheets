# Deploy — Ads Performance (versi Sheets/Excel) · Davina

Dashboard performa iklan **Meta + Google** yang membaca file **Excel (.xlsx)** dan
**CSV** hasil ekspor (bukan API live) — cocok untuk mockup ke klien. Ada animasi
"fetching from Meta/Google API" biar terlihat seperti tarik data real-time.

- **Repo:** https://github.com/abietechno/ads-davina-versi-sheets.git
- **Domain:** https://ads-performance.pulsepowerhub.id
- **Server:** aaPanel + **Apache** + PHP 8.2/8.3 + MySQL
- **Login demo:** `admin@admin` / `password`
- **Login Google (SSO):** aktif — klien tinggal klik "Login with Google" (perlu setup OAuth, lihat bagian 6)

---

## 1. Hasil akhir / fitur

- **2 sumber:** tab **Meta** (baca `.xlsx`) & **Google** (baca `.csv`), toggle di kanan atas.
- **Per periode (bulan):** dropdown periode; data diambil dari folder `back/storage/app/ads/<YYYY-MM>/`.
- **Custom date-range:** muncul otomatis kalau file-nya format **harian** (ada kolom `Day`).
  Meta sudah didukung; Google **juga sudah** didukung — tinggal unggah ekspor Google
  yang di-segment per hari (lihat bagian 8).
- **KPI:** Spend, Impressions, Clicks, CTR, CPC, CPM, + Reach (Meta) / Conversions (Google).
- **Grafik:** donut spend per campaign/ad set + tabel per campaign.
- **Animasi fetching:** overlay "menyinkronkan data" (logo Meta/Google, radar, langkah
  OAuth→fetch→hitung) tiap ganti source/periode. Murni efek demo (~2,6 dtk).
- **Menu Settings disembunyikan** (route masih ada, tapi tidak tampil di menu).

## 2. Arsitektur di server (single-domain)

Satu domain saja. **Document root = `back/public`** (cara standar aaPanel untuk Laravel):

```
https://ads-performance.pulsepowerhub.id/            → SPA Vue (back/public/index.html)
https://ads-performance.pulsepowerhub.id/assets/…    → aset SPA (sudah di-build & ikut di repo)
https://ads-performance.pulsepowerhub.id/api/…       → Laravel API
https://ads-performance.pulsepowerhub.id/api/auth/google/callback → OAuth Google
```

SPA sudah **di-build dan disalin ke `back/public`** + `.htaccess` sudah diatur untuk:
- melayani file nyata (aset) apa adanya,
- `/api`, `/sanctum`, `/up` → Laravel (`index.php`),
- sisanya → `index.html` (Vue Router history-mode: `/login`, `/settings`, `/auth/callback`).

**Artinya: tidak perlu Node/npm di server.** Cukup `git pull` + langkah Laravel di bawah.

## 3. Buat site di aaPanel

1. **Website → Add site**
   - Domain: `ads-performance.pulsepowerhub.id`
   - PHP version: **8.2 atau 8.3**
   - (boleh sekalian buat MySQL database di sini — catat nama DB, user, password)
2. Setelah site jadi, **hapus** file bawaan di root site (`index.html` default aaPanel), nanti diganti hasil clone.

## 4. Ambil kode dari Git

Di **Terminal aaPanel** (atau SSH), sebagai contoh path `/www/wwwroot/ads-davina-versi-sheets`:

```bash
cd /www/wwwroot
rm -rf ads-davina-versi-sheets
git clone https://github.com/abietechno/ads-davina-versi-sheets.git
cd ads-davina-versi-sheets/back
```

> Kalau sudah pernah clone, cukup: `cd .../back && git pull`.

## 5. Setup Laravel (backend)

```bash
# dari folder .../ads-davina-versi-sheets/back

# 1) Dependencies (butuh composer + ekstensi PHP: zip, xml, mbstring, gd, curl, fileinfo)
composer install --no-dev --optimize-autoloader

# 2) .env
cp .env.example .env
# lalu EDIT .env → isi DB_DATABASE / DB_USERNAME / DB_PASSWORD dari aaPanel,
# dan (nanti) GOOGLE_LOGIN_CLIENT_ID / SECRET (bagian 6).
# APP_URL & FRONTEND_URL & redirect URI sudah diisi domain produksi.

php artisan key:generate

# 3) Database: migrasi + seed admin (admin@admin / password)
php artisan migrate --force
php artisan db:seed --force

# 4) Symlink storage (untuk logo perusahaan yg diupload lewat Settings)
php artisan storage:link

# 5) Cache konfigurasi (produksi)
php artisan optimize
```

> **Penting (baca Excel):** pastikan ekstensi PHP **`zip`**, **`xml`**, **`mbstring`**,
> **`gd`** aktif di aaPanel (Software Store → PHP → Setting → Install extensions).
> File `.xlsx` = arsip zip; tanpa `php-zip` parser Meta akan error.

## 6. Aktifkan Login Google (SSO)

Supaya klien bisa login pakai akun Google:

1. Buka **Google Cloud Console → APIs & Services → Credentials**.
2. **Create Credentials → OAuth client ID → Web application**.
   - **Authorized JavaScript origins:** `https://ads-performance.pulsepowerhub.id`
   - **Authorized redirect URIs:** `https://ads-performance.pulsepowerhub.id/api/auth/google/callback`
3. Salin **Client ID** & **Client secret** ke `.env`:
   ```
   GOOGLE_LOGIN_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
   GOOGLE_LOGIN_CLIENT_SECRET=xxxxxxxx
   GOOGLE_LOGIN_REDIRECT_URI=https://ads-performance.pulsepowerhub.id/api/auth/google/callback
   ```
4. Terapkan: `php artisan config:cache`
5. (Di OAuth consent screen, tambahkan email klien sebagai **Test user** kalau app
   masih "Testing", atau **Publish** app-nya biar semua akun Google bisa login.)

> Catatan: siapa pun yang login via Google akan **otomatis dibuatkan akun** di sistem
> (tanpa allow-list). Untuk demo klien ini oke. Kalau mau dibatasi, kabari nanti.

## 7. Set run directory, permission, & SSL

1. **aaPanel → site → Site directory / 运行目录 (run directory): set ke `/back/public`.**
   (Site root = folder hasil clone; run directory `/back/public` = docroot Laravel.)
2. Permission (jalankan sebagai user web `www`):
   ```bash
   cd /www/wwwroot/ads-davina-versi-sheets/back
   chown -R www:www .
   chmod -R 775 storage bootstrap/cache
   ```
3. **SSL:** aaPanel → site → SSL → Let's Encrypt → terbitkan untuk
   `ads-performance.pulsepowerhub.id`, aktifkan **Force HTTPS**.
4. Pastikan **mod_rewrite** aktif (Apache aaPanel default aktif) dan `AllowOverride All`
   agar `.htaccess` di `back/public` terbaca (biasanya sudah default di aaPanel).

Selesai → buka `https://ads-performance.pulsepowerhub.id`, login `admin@admin` / `password`.

## 8. Menambah / mengganti data laporan

Data = file di `back/storage/app/ads/<YYYY-MM>/` (satu folder per bulan):

- **Meta:** taruh file `.xlsx` (sheet **"Raw Data Report"**). Format bulanan atau harian
  (ada kolom **Day**) sama-sama didukung.
- **Google:** taruh file `.csv` ekspor **"Campaign performance"**.
  - Untuk mengaktifkan **custom date-range di Google**, ekspor dengan **segment "Day"**
    (satu baris per campaign per hari, ada kolom `Day`). Filter tanggal akan otomatis
    muncul di tab Google.

Upload via **aaPanel File Manager** ke folder bulan yang sesuai (buat folder baru mis.
`2026-08` kalau perlu). Tidak perlu restart apa pun — dibaca langsung tiap request.

> File contoh sudah ikut di repo (`2026-01` … `2026-07`), jadi begitu deploy langsung ada isinya.

## 9. Kalau tampilan front diubah (butuh rebuild)

SPA hasil build **sudah ikut di repo** (`back/public/index.html` + `back/public/assets`).
Kalau nanti kode di `front/` diubah, rebuild lalu salin ulang:

```bash
cd front
npm install
npm run build           # pakai front/.env.production (VITE_API_URL = domain/api)
cp -r dist/* ../back/public/
# lalu commit back/public + push, dan git pull di server
```

## 10. Catatan keamanan (untuk diketahui)

Endpoint laporan `GET /api/ads/report` & `/api/ads/report/periods` saat ini **publik**
(tanpa login) — memang disiapkan begitu untuk kemudahan demo. Data yang tampil hanya
angka agregat dari file yang kamu unggah. Kalau nanti perlu dikunci ke login, tinggal
bungkus route-nya dengan `auth:sanctum` (kabari saja).

---

### Ringkas — deploy cepat

```bash
cd /www/wwwroot && git clone https://github.com/abietechno/ads-davina-versi-sheets.git
cd ads-davina-versi-sheets/back
composer install --no-dev --optimize-autoloader
cp .env.example .env         # isi DB + Google OAuth
php artisan key:generate
php artisan migrate --force && php artisan db:seed --force
php artisan storage:link && php artisan optimize
chown -R www:www . && chmod -R 775 storage bootstrap/cache
# aaPanel: run directory = /back/public, terbitkan SSL, Force HTTPS
```
Login: **admin@admin / password** · atau **Login with Google**.
