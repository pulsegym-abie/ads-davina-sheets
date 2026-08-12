# Deploy — Ads Performance (versi Sheets/Excel) · Davina

Dashboard performa iklan **Meta + Google** yang membaca file **Excel (.xlsx)** dan
**CSV** hasil ekspor. Untuk mockup ke klien — ada animasi "fetching from Meta/Google
API" biar terlihat seperti tarik data real-time.

- **Repo:** https://github.com/pulsegym-abie/ads-davina-sheets.git
- **Frontend:** **Vercel** → https://ad.pulsepowerhub.id (domain custom)
- **Auth:** **Supabase** (Login **Google SSO** saja)
- **Backend/Server:** **TIDAK ADA.** Data Excel di-convert jadi JSON saat build; app-nya statis.

---

## 1. Cara kerja (penting)

Aplikasi ini **tidak punya server backend saat runtime**. Alurnya:

```
File Excel/CSV (di repo: back/storage/app/ads/<YYYY-MM>/)
        │  ← saat build di Vercel (script Node + SheetJS)
        ▼
JSON statis (front/public/ads-data/*.json)
        │  ← di-fetch langsung oleh SPA
        ▼
Vercel (Vue SPA)  ──auth──►  Supabase (Login Google)
```

- **Parsing Excel/CSV** dilakukan **saat build** (`front/scripts/generate-ads-data.mjs`),
  bukan saat user membuka halaman. Hasilnya JSON statis yang ringan.
- **Filter tanggal & agregasi** (totals, donut, tabel) dihitung **di browser**
  (`front/src/lib/adsReport.js`) — sama persis dengan logika parser Laravel lama.
- **Login** pakai **Supabase Auth** (tombol "Login with Google"). Tidak ada database
  aplikasi, tidak ada PHP, tidak ada MySQL.

> JSON hasil generate **ikut di-commit** (`front/public/ads-data/`) sebagai cadangan,
> jadi build tetap jalan walau host tidak menyertakan folder `back/`.

## 2. Fitur

- Tab **Meta** (`.xlsx`) & **Google** (`.csv`), toggle di kanan atas.
- Dropdown **periode** (per bulan). **Custom date-range** muncul otomatis untuk file
  format **harian** (ada kolom `Day`) — Meta & Google sama-sama didukung.
- KPI: Spend, Impressions, Clicks, CTR, CPC, CPM, + Reach (Meta) / Conversions (Google).
- Donut spend per campaign/ad set + tabel per campaign.
- Animasi "fetching from Meta/Google API" tiap ganti source/periode (efek demo).
- Login **Google SSO** saja (lewat Supabase).

## 3. Setup Supabase (Auth Google) — sekali saja

1. Buat project di https://supabase.com → catat **Project URL** & **anon public key**
   (Settings → API).
2. **Authentication → Providers → Google → Enable.** Butuh OAuth dari Google:
   - Di **Google Cloud Console → Credentials → Create OAuth client ID → Web app**.
   - **Authorized redirect URI:** `https://<project-ref>.supabase.co/auth/v1/callback`
     (URL callback-nya Supabase, ADA di halaman provider Google di Supabase — copy dari situ).
   - Salin **Client ID** & **Client secret** Google → tempel ke provider Google di Supabase → Save.
3. **Authentication → URL Configuration:**
   - **Site URL:** `https://ad.pulsepowerhub.id`
   - **Redirect URLs (Add):** `https://ad.pulsepowerhub.id/**` dan (untuk dev) `http://localhost:5173/**`
4. (Opsional, batasi akses klien) undang email tertentu, atau biarkan siapa pun dengan
   akun Google bisa masuk (default). Untuk mockup, default biasanya cukup.

## 4. Deploy frontend ke Vercel

Vercel sudah tersinkron dengan GitHub, jadi:

1. **Import project** dari repo `pulsegym-abie/ads-davina-sheets`.
2. **Root Directory: `front`** (WAJIB — ini monorepo; frontend ada di folder `front`).
   Framework preset otomatis **Vite**. Build command `npm run build`, output `dist`
   (default, tidak perlu diubah).
3. **Environment Variables** (Project → Settings → Environment Variables):
   ```
   VITE_SUPABASE_URL       = https://<project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY  = <anon public key dari Supabase>
   ```
   > Jangan taruh nilai ini di file `.env` yang di-commit — cukup di Vercel.
4. **Deploy.** Setiap `git push` ke `main` → Vercel auto-build & deploy.

`vercel.json` (SPA history-mode routing) sudah ada, jadi refresh di `/` atau
`/auth/callback` tidak akan 404.

## 5. Custom domain https://ad.pulsepowerhub.id

1. Vercel → Project → **Settings → Domains → Add** `ad.pulsepowerhub.id`.
2. Ikuti instruksi DNS Vercel di panel domain `pulsepowerhub.id`:
   - Biasanya tambah **CNAME** `ad` → `cname.vercel-dns.com` (atau A record sesuai yang Vercel tampilkan).
3. Tunggu verifikasi + SSL otomatis dari Vercel.
4. Pastikan domain ini juga terdaftar di **Supabase → URL Configuration** (langkah 3.3),
   kalau tidak, login Google akan ditolak redirect-nya.

## 6. Menambah / mengganti data laporan

Data = file di `back/storage/app/ads/<YYYY-MM>/`:

- **Meta:** `.xlsx` (sheet **"Raw Data Report"**), format bulanan atau harian (kolom `Day`).
- **Google:** `.csv` ekspor **"Campaign performance"**. Untuk custom date-range di Google,
  ekspor dengan **segment "Day"**.

Langkah update:
```bash
# taruh file baru di back/storage/app/ads/2026-08/ (buat folder baru bila perlu)
cd front
npm run generate:data      # regenerate JSON dari Excel/CSV
git add -A && git commit -m "data: tambah laporan Agustus 2026" && git push
# Vercel auto-rebuild → data baru live
```
> `npm run build` juga otomatis menjalankan generate (`prebuild`), jadi Vercel selalu
> memakai data terbaru dari repo.

## 7. Jalankan lokal (opsional)

```bash
cd front
npm install
# buat front/.env.local:
#   VITE_SUPABASE_URL=...
#   VITE_SUPABASE_ANON_KEY=...
npm run generate:data      # sekali, untuk membuat public/ads-data (kalau belum ada)
npm run dev                # http://localhost:5173
```

## 8. Catatan

- Folder **`back/` (Laravel) TIDAK dipakai lagi saat runtime** — dibiarkan hanya sebagai
  tempat file sumber Excel/CSV (`back/storage/app/ads`) yang dibaca saat build. Tidak
  perlu server PHP / aaPanel / MySQL sama sekali.
- Semua perhitungan (filter tanggal, totals, reach) identik dengan versi Laravel;
  reach untuk rentang custom ditandai perkiraan (audiens antar-hari bisa overlap).
- Kalau nanti mau data bisa diganti tanpa rebuild (upload dari UI), itu butuh pindah
  ke Supabase Storage + Edge Function — kabari saja.
