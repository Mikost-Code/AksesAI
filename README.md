# AksesAI

[![CI](https://github.com/zann06/AksesAI/actions/workflows/ci.yml/badge.svg)](https://github.com/zann06/AksesAI/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> 📦 **Repo ini sedang dipindahkan ke organisasi [MIKOS](https://github.com/Mikost-Code).** Selama proses berlangsung, repo kanonis masih di `zann06/AksesAI` — semua tautan di dokumen ini menunjuk ke sana agar tidak ada tautan rusak. Setelah salinan organisasi aktif, ganti `zann06` → `Mikost-Code` pada `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `.github/ISSUE_TEMPLATE/config.yml`, dan badge CI.

Direktori info **gratis & murah seputar AI** berbasis kontribusi komunitas: API/token gratis dari provider, free tier, harga per token, model open-weight, tool gratis, dan hosting gratis. Setiap info memiliki sumber yang dapat diperiksa, kontributor yang transparan, dan diverifikasi manual oleh manusia.

> **AksesAI bukan afiliasi provider AI mana pun, tidak menjual token, dan tidak menjamin kuota gratis/harga masih tersedia.** Status _Verified_ berarti info telah diperiksa reviewer terhadap dokumentasi atau halaman resmi provider pada saat peninjauan — kuota, harga, dan promo dapat berubah sewaktu-waktu.

Proyek ini **terbuka untuk kontribusi**. Setiap entri katalog **wajib** memiliki minimal satu sumber resmi, dan semua perubahan masuk lewat pull request yang harus lulus CI.

---

## Daftar Isi

- [Fitur](#fitur)
- [Tech Stack](#tech-stack)
- [Prasyarat](#prasyarat)
- [Memulai (Local Development)](#memulai-local-development)
- [Environment Variables](#environment-variables)
- [Database & Migrasi](#database--migrasi)
- [Setup GitHub OAuth](#setup-github-oauth)
- [Membuat Admin Pertama](#membuat-admin-pertama)
- [Testing](#testing)
- [Build & Menjalankan Produksi](#build--menjalankan-produksi)
- [Deploy ke Vercel](#deploy-ke-vercel)
- [Struktur Repo](#struktur-repo)
- [Kontribusi](#kontribusi)
- [Kebijakan Entri Katalog](#kebijakan-entri-katalog)
- [Privasi & Data yang Tidak Dikumpulkan](#privasi--data-yang-tidak-dikumpulkan)
- [Keamanan](#keamanan)
- [Lisensi](#lisensi)

---

## Fitur

**Publik**
- Direktori info AI dengan **pencarian full-text berperingkat** (`ts_rank` atas `search_tsv`), filter (kategori, jenis akses, ketersediaan gratis, status), dan pagination
- Halaman detail info: deskripsi, syarat akses, provider, free tier, harga per token, masa berlaku promo, dan **daftar sumber yang dapat diklik**
- Riwayat perubahan informasi (audit trail yang dapat dilihat publik)
- **Riwayat perubahan harga** per entri (snapshot otomatis saat harga/kuota berubah)
- **Penghitung klik per sumber** ("N pengunjung membuka tautan ini") sebagai sinyal kualitas
- Profil kontributor publik dengan **jenjang kontributor** (baru → aktif → terpercaya → pakar, berdasarkan kontribusi terverifikasi)
- Formulir laporan publik untuk informasi yang mencurigakan/palsu (dengan atau tanpa login)

**Kontributor** (login GitHub)
- Dashboard kontribusi: draf, menunggu tinjauan, perlu revisi, terbit, ditolak
- Formulir kontribusi bertahap dengan validasi real-time dan pemindaian data pribadi
- **Pusat notifikasi in-app** (lonceng di navbar + `/dashboard/notifikasi`): diverifikasi, perlu revisi, ditolak, dan pengingat promo
- **Pengingat promo** — simpan entri ("Ingatkan saya") dan terima notifikasi beberapa hari sebelum promo berakhir (dikirim oleh salah satu cron harian)

**Reviewer**
- Antrean tinjauan dengan sistem klaim (30 menit) agar tidak ada tinjauan ganda
- Aksi: verifikasi & terbitkan, minta revisi (wajib alasan), tolak (wajib alasan), tandai kedaluwarsa
- **Tidak dapat meninjau kontribusi sendiri** (ditegakkan di database)
- **Re-verifikasi berkala 90 hari** — antrean entri yang perlu dicek ulang agar info tidak menua diam-diam

**Moderator**
- Manajemen laporan komunitas (dismiss, reopen, arsipkan program, blokir kontributor)
- Semua aksi tercatat di audit log yang immutable

**Admin**
- Ringkasan statistik platform
- Manajemen pengguna: pencarian, blokir/buka blokir (wajib alasan), pemberian/pencabutan role
- **Riwayat moderasi per pengguna** (siapa memblokir/memberi role dan alasannya) agar keputusan dapat diaudit dalam konteks akun
- Manajemen kategori: buat, ubah, aktifkan/nonaktifkan
- **Kendali masa berlaku program** (`/admin/program`) — staf dapat menetapkan/mengakhiri promo secara manual

**Keamanan & kepatuhan**
- RLS (Row Level Security) aktif di **semua** tabel
- Perubahan status **hanya** lewat RPC server-side (`security definer`), tidak bisa dari klien
- Pengguna tidak dapat mengubah role miliknya sendiri
- Login GitHub hanya memberi role `member`; role lain hanya diberikan admin
- Audit log immutable (tidak dapat diubah/dihapus)
- **Rate limit fail-closed di produksi** (tanpa backend → tolak, bukan loloskan)
- **Anti-spoofing IP**: header proxy tepercaya diutamakan; `X-Forwarded-For` dibaca dari entri **terakhir**
- **Hash IP terpisah per tujuan** sehingga hash lintas fitur tidak dapat dikorelasikan
- **Tanpa AI/chatbot di dalam aplikasi** — tidak memerlukan API key AI apa pun

---

## Tech Stack

| Lapisan | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router) |
| Bahasa | TypeScript (strict) |
| UI | Tailwind CSS v4, komponen shadcn/ui (ditulis tangan; Radix Select untuk dropdown) |
| Database & Auth | Supabase (PostgreSQL, GitHub OAuth, RLS) |
| Validasi | Zod |
| Rate limiting | Upstash Redis (disarankan) → fallback PostgreSQL → fail-closed di produksi |
| Anti-bot | Cloudflare Turnstile (wajib di produksi untuk laporan anonim) |
| Testing | Vitest (unit, RLS, integrasi) + Playwright (E2E) |
| Deploy | Vercel + Vercel Cron |
| CI | GitHub Actions |
| Package manager | pnpm |

---

## Prasyarat

- **Node.js** `>=20.19.0 <26` (lihat `engines` di `package.json`)
- **pnpm** 10+ (`npm i -g pnpm`)
- **Docker** (untuk Supabase lokal) — [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Supabase CLI** 2.x — versi yang dipakai proyek ini: `2.120.0`
- Akun **GitHub** (untuk membuat OAuth App)

> **Versi Supabase CLI di-pin.** Gunakan `npx supabase@2.120.0 …` (atau `npm i -D supabase@2.120.0`) agar sama dengan CI. Supabase CLI 3.x belum didukung oleh konfigurasi di repo ini — lihat [Database & Migrasi](#database--migrasi).

---

## Memulai (Local Development)

```bash
# 1. Clone
git clone https://github.com/zann06/AksesAI.git
cd AksesAI

# 2. Install dependensi
pnpm install

# 3. Salin template environment lalu isi nilainya (JANGAN commit .env.local)
cp .env.example .env.local

# 4. Jalankan Supabase lokal (Docker harus menyala)
npx supabase@2.120.0 start

# 5. Terapkan migrasi + seed data
npx supabase@2.120.0 db reset

# 6. Jalankan dev server
pnpm dev
```

Buka <http://localhost:3000>.

Setelah `supabase start`, CLI mencetak **API URL** (`http://127.0.0.1:54321`) dan **anon key**. Salin keduanya ke `.env.local` sebagai `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Salin juga **service_role key** ke `SUPABASE_SERVICE_ROLE_KEY` (server-only, jangan pernah diekspos ke browser).

> Butuh data contoh yang lebih lengkap? `node scripts/seed-content.mjs` mengisi katalog dari sumber tunggal `scripts/seed-content.mjs` (dipakai juga untuk audit katalog).

---

## Environment Variables

Lihat `.env.example` untuk daftar lengkap dengan komentar.

### Wajib

| Variabel | Publik? | Keterangan |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | ✅ | URL kanonik situs (SEO, sitemap, redirect OAuth) |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL proyek Supabase — dilindungi RLS |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Anon key Supabase — dilindungi RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ **RAHASIA** | Hanya server: laporan anonim & cron job |
| `CRON_SECRET` | ❌ **RAHASIA** | String acak ≥ 32 karakter; mengautentikasi endpoint cron |
| `IP_HASH_SALT` | ❌ **RAHASIA** | Salt untuk hash IP pelapor (IP mentah tidak disimpan) |

### Opsional

| Variabel | Keterangan |
|---|---|
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Rate limiting terdistribusi. Bila kosong → fallback PostgreSQL; bila keduanya kosong di produksi → **fail-closed** |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Anti-bot laporan anonim. Di produksi `TURNSTILE_SECRET_KEY` **wajib** — tanpanya laporan ditolak |
| `NEXT_PUBLIC_CF_BEACON_TOKEN` | Cloudflare Web Analytics (tanpa cookie). Bila kosong → analytics tidak dimuat |

> **Penting:** Jangan pernah memberi prefix `NEXT_PUBLIC_` pada nilai rahasia — apa pun dengan prefix itu **ikut ter-bundel ke JavaScript klien**. Repo ini menyertakan `scripts/check-client-bundle.mjs` yang gagal bila `service_role` bocor ke bundle klien.

### Membuat nilai rahasia

```bash
# CRON_SECRET (contoh)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# IP_HASH_SALT (contoh)
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

---

## Database & Migrasi

**Skema database dipublikasikan di repo ini.** Folder `supabase/` berisi `config.toml`, seluruh migrasi (`supabase/migrations/`), dan `seed.sql`. Ini disengaja:

- tes RLS, integrasi, dan E2E dapat berjalan otomatis di setiap pull request;
- siapa pun dapat mengaudit kebijakan RLS yang melindungi data tanpa meminta akses;
- tidak ada skema tersembunyi yang membuat "berjalan di lokal" berbeda dari "berjalan di produksi".

Yang **tidak** ikut di-commit (lihat `.gitignore`): `supabase/.temp` (berisi info proyek ter-link & connection URL), `supabase/.branches`, `supabase/.env`, `supabase/snippets/`, dan `supabase/backups/` (berisi **data produksi**).

Tidak ada rahasia yang tersimpan di folder ini: `config.toml` membaca kredensial OAuth lewat `env(GITHUB_OAUTH_CLIENT_ID)` / `env(GITHUB_OAUTH_CLIENT_SECRET)`, dan `seed.sql` hanya berisi kategori serta pengaturan situs — tanpa akun admin maupun data pengguna.

### Supabase lokal

```bash
npx supabase@2.120.0 start      # menyalakan stack lokal (Postgres, Auth, Storage, Studio)
npx supabase@2.120.0 db reset   # menjalankan semua migrasi + seed
npx supabase@2.120.0 status     # menampilkan URL dan key lokal
```

Studio tersedia di <http://127.0.0.1:54323>. Penampung email lokal (Mailpit) ada di <http://127.0.0.1:54324>.

> **Catatan versi CLI:** `config.toml` memakai section `[local_smtp]` (nama baru sejak Supabase CLI 2.108.0). CLI 2.x menerima nama ini; CLI 3.x **menolak** nama lama `[inbucket]`. Karena itu CI mem-pin `supabase@2.120.0` — jangan naikkan versi tanpa menyesuaikan konfigurasi.

### Migrasi ke proyek Supabase remote

```bash
npx supabase@2.120.0 login
npx supabase@2.120.0 link --project-ref <project-ref>
npx supabase@2.120.0 db push
```

### Menambah migrasi baru

1. Buat file baru di `supabase/migrations/` dengan nama berurutan `YYYYMMDDHHMMSS_deskripsi.sql`.
2. Tulis SQL yang **idempoten** bila memungkinkan (`if not exists`, `create or replace`), karena migrasi dijalankan ulang di CI.
3. Jangan pernah menaruh kredensial, JWT, atau data pribadi di file migrasi atau `seed.sql`.
4. Regenerasi tipe TypeScript: `pnpm gen:types` (menulis `src/types/database.ts`).
5. Buka PR — CI akan menerapkan migrasi Anda ke database bersih dan menjalankan seluruh tes RLS.

### Regenerasi tipe TypeScript

```bash
pnpm gen:types
```

---

## Setup GitHub OAuth

1. Buka GitHub → **Settings** → **Developer settings** → **OAuth Apps** → **New OAuth App**.
2. Isi:
   - **Application name**: `AksesAI`
   - **Homepage URL**: `http://localhost:3000` (dev) atau domain produksi
   - **Authorization callback URL**: `https://<project-ref>.supabase.co/auth/v1/callback`
3. Salin **Client ID** dan **Client Secret**.
4. Buka Supabase Dashboard → **Authentication** → **Providers** → **GitHub** → aktifkan → tempel Client ID & Secret.
5. Buka **Authentication** → **URL Configuration** → tambahkan ke **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `https://<domain-produksi>/auth/callback`

> Callback URL mengarah ke **Supabase**, bukan langsung ke aplikasi. Supabase yang meneruskan ke `/auth/callback` milik aplikasi.

---

## Membuat Admin Pertama

Login GitHub hanya memberi role `member`. Role staf **tidak pernah** dibuat otomatis dari data publik.

### Role `super_admin` (pemilik)

`super_admin` adalah pemilik platform: mewarisi semua akses admin plus kewenangan eksklusif mengatur role & memblokir admin. Role ini hanya dapat diatur lewat konsol database (bukan lewat aplikasi), dan akunnya tidak dapat dicabut/diblokir lewat aplikasi — pemulihan akses pemilik selalu tersedia.

Setelah akun pemilik login pertama kali (sehingga baris `profiles` ada), jalankan **sekali**:

```sql
insert into public.user_roles (user_id, role, assigned_by)
select id, 'super_admin', id from public.profiles where github_username = '<username-pemilik>'
on conflict do nothing;
```

### Role staf lain (reviewer/moderator/admin)

Kelola lewat halaman **`/admin/pengguna`** sebagai pemilik (bukan lewat SQL manual).

| Aksi | Anggota | Reviewer | Moderator | Admin | Super Admin |
|---|---|---|---|---|---|
| Review kontribusi | — | ✅ | — | ✅ | ✅ |
| Moderasi laporan | — | — | ✅ | ✅ | ✅ |
| Kelola kategori | — | — | — | ✅ | ✅ |
| Beri/cabut role | — | — | — | — | ✅ |
| Blokir admin | — | — | — | — | ✅ |

> **Alternatif lebih aman untuk produksi:** jalankan pernyataan SQL di atas dengan `service_role` dari lingkungan tepercaya (mis. CLI lokal), jangan di SQL Editor yang dibagikan.

---

## Testing

```bash
# Unit test (validasi Zod, slug, sanitasi, SSRF guard, sensitive-scan)
pnpm test

# Tes RLS + integrasi (membutuhkan Supabase lokal menyala)
pnpm test:rls

# E2E Playwright (membutuhkan Supabase lokal + .env.local terisi)
pnpm exec playwright install chromium   # sekali saja
pnpm test:e2e
```

**Catatan E2E:** login memakai GitHub OAuth yang tidak dapat diotomasi secara lokal. Uji E2E membuat pengguna sungguhan lewat `service_role` di sisi server, lalu menanamkan cookie sesi `@supabase/ssr` ke konteks browser Playwright. Lihat `e2e/helpers.ts`.

**Apa yang dijalankan CI:** setiap push ke `main` dan setiap pull request menjalankan dua job:

1. **Lint, typecheck, unit test, build** — `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm audit --audit-level=high`, pemindaian secret, `pnpm build`, dan pemeriksaan agar `service_role` tidak bocor ke bundle klien.
2. **RLS, integration & E2E (Supabase lokal)** — menyalakan Supabase lokal di runner, menerapkan **seluruh migrasi + seed** ke database bersih, lalu menjalankan `pnpm test:rls` dan `pnpm test:e2e`.

Artinya: PR yang mengubah kebijakan RLS atau RPC akan diuji terhadap database sungguhan sebelum di-merge — bukan dilewati.

Untuk menargetkan server yang sudah berjalan:

```bash
E2E_BASE_URL=http://localhost:3000 pnpm test:e2e
```

### Skrip smoke manual (HTTP)

```bash
node scripts/smoke-dashboard.mjs     # baca dashboard
node scripts/smoke-mutation.mjs      # mutasi kontribusi
node scripts/smoke-staff.mjs         # alur reviewer/moderator
node scripts/smoke-admin.mjs         # baca halaman admin
node scripts/smoke-admin-mutation.mjs# mutasi admin
```

Semua skrip memerlukan `.env.local` terisi dan server berjalan.

### Pemeriksaan keamanan

```bash
pnpm audit                    # audit dependensi
node scripts/secret-scan.mjs  # pindai pola secret yang terlacak git
node scripts/check-client-bundle.mjs  # pastikan service_role tidak bocor ke bundle klien (setelah build)
```

---

## Build & Menjalankan Produksi

```bash
pnpm build
pnpm start        # menjalankan hasil build di http://localhost:3000
```

Sebelum deploy, pastikan:

```bash
pnpm typecheck && pnpm lint && pnpm test
node scripts/secret-scan.mjs
node scripts/build-probe.mjs && node scripts/check-client-bundle.mjs
```

---

## Deploy ke Vercel

1. Import repo ke Vercel.
2. Tambahkan **semua** environment variable dari [tabel di atas](#environment-variables) untuk environment Production (dan Preview bila ingin preview berfungsi).
3. Set `NEXT_PUBLIC_SITE_URL` ke domain produksi.
4. Setelah domain aktif, perbarui **Homepage URL** & **Redirect URLs** di OAuth App GitHub dan di Supabase Auth.
5. Konfigurasi **Vercel Cron** (`vercel.json`) untuk endpoint:
   - `GET /api/cron/expire` — menandai program kedaluwarsa
   - `GET /api/cron/cleanup` — membersihkan data sementara

   Keduanya diamankan dengan header `Authorization: Bearer <CRON_SECRET>`. Vercel Cron mengirim header ini otomatis bila `CRON_SECRET` diset di environment.
6. Terapkan migrasi ke Supabase produksi: `npx supabase@2.120.0 db push`.
7. Jalankan smoke test produksi: `node scripts/smoke-prod.mjs` (memerlukan `.env.local` menunjuk ke produksi).

### Analytics (opsional)

AksesAI tidak menyematkan analytics secara bawaan. Untuk statistik ramah privasi
(tanpa cookie, tidak melacak lintas situs), aktifkan [Cloudflare Web Analytics](https://developers.cloudflare.com/web-analytics/):

1. Salin **beacon token** dari Cloudflare Dashboard.
2. Set `NEXT_PUBLIC_CF_BEACON_TOKEN` di Vercel, lalu redeploy.

Bila variabel kosong, skrip analytics tidak dimuat sama sekali.

### Backup database

Migrasi tersimpan di repo, tetapi **data** tidak. Jadwalkan backup berkala dari lingkungan tepercaya:

```bash
pnpm db:backup          # skema + data (butuh `supabase login` & `supabase link`)
pnpm db:backup --schema # skema saja
```

Hasilnya ditulis ke `supabase/backups/*.sql` dan **diabaikan git** — file itu berisi data produksi, jangan pernah di-commit. Simpan salinan kedua ke penyimpanan lain: file itu satu-satunya cadangan di luar cluster.

---

## Struktur Repo

```text
AksesAI/
├── README.md  LICENSE  .env.example
├── .github/workflows/ci.yml   # lint, typecheck, unit, build, RLS, integrasi, E2E
├── e2e/                   # uji end-to-end Playwright
├── scripts/               # smoke test HTTP, secret scan, bundle check, seed katalog
├── supabase/              # config.toml, migrations/, seed.sql (dipublikasikan)
├── src/
│   ├── app/               # rute App Router
│   │   ├── (public)/      # beranda, direktori, detail, halaman statis
│   │   ├── (auth)/        # login
│   │   ├── auth/          # callback OAuth
│   │   ├── dashboard/     # area kontributor
│   │   ├── review/        # area reviewer
│   │   ├── moderation/    # area moderator
│   │   ├── admin/         # area admin
│   │   └── api/           # route handler (reports, cron)
│   ├── components/        # komponen UI & fitur
│   ├── lib/               # auth, supabase client, validasi, keamanan, data layer
│   └── types/             # tipe database hasil generate
└── tests/
    ├── unit/              # Vitest (jsdom)
    ├── rls/               # tes kebijakan RLS terhadap Supabase lokal
    └── integration/       # tes RPC & alur lintas lapisan
```

---

## Kontribusi

Kami menerima kontribusi kode, perbaikan data katalog, dan pelaporan bug melalui issue & pull request. Baca [CONTRIBUTING.md](CONTRIBUTING.md) untuk panduan lengkap; ringkasnya:

- Branch: `feat/<topik>`, `fix/<topik>`, `chore/<topik>`, `docs/<topik>`
- Commit mengikuti [Conventional Commits](https://www.conventionalcommits.org/id/v1.0.0/)
- Sebelum membuka PR: `pnpm typecheck && pnpm lint && pnpm test` harus lulus
- Semua perubahan masuk lewat **pull request**; `main` dilindungi dan CI wajib hijau
- Satu PR untuk satu tujuan — perubahan besar sebaiknya didiskusikan lewat issue terlebih dahulu

### Butuh perilaku komunitas

Proyek ini memakai [Contributor Covenant](CODE_OF_CONDUCT.md). Dengan berpartisipasi, Anda diharapkan mematuhinya.

---

## Kebijakan Entri Katalog

Aturan yang tidak boleh dilanggar saat menambah atau memperbarui entri:

1. **Wajib ada minimal satu sumber resmi.** Sumber resmi = dokumentasi provider, halaman harga/kuota resmi, pengumuman di kanal resmi (blog/X/status page provider), atau dokumen hukumnya. Blog agregator, tautan afiliasi, dan video pihak ketiga bukan sumber resmi.
2. **Jangan menyatakan tanggal berakhir yang belum diumumkan.** Bila provider tidak menyebut tanggal, biarkan kosong dan tulis ketidakpastiannya secara jujur (mis. "belum ada tanggal resmi"). Jangan menebak.
3. **Angka `0` bukan informasi.** Jangan menampilkan atau mengisi angka `0` sebagai data; kosongkan bila memang tidak ada nilainya.
4. **Kuota & harga mudah berubah.** Sertakan waktu pengecekan; reviewer akan memverifikasi ulang terhadap sumber pada saat peninjauan.
5. **Satu entri = satu program.** Jangan menggabungkan beberapa penawaran berbeda dalam satu entri.

Pelanggaran aturan di atas akan ditolak reviewer. Jangan ragu bertanya lewat issue bila ragu.

---

## Privasi & Data yang Tidak Dikumpulkan

AksesAI **secara sengaja tidak mengumpulkan**:

- ❌ NIK (Nomor Induk Kependudukan)
- ❌ Nomor Kartu Keluarga (KK)
- ❌ Foto KTP atau dokumen identitas apa pun
- ❌ Nomor rekening / kartu
- ❌ Identitas penerima bantuan atau daftar penerima

Formulir kontribusi dan laporan memiliki **pemindaian otomatis** yang menolak kiriman yang mengandung pola NIK/KK/nomor rekening. IP pelapor **tidak disimpan mentah** — hanya hash bergaram untuk rate limiting.

Data yang disimpan: informasi program dari sumber publik, judul & URL sumber, dan identitas **kontributor** (username GitHub publik) untuk transparansi.

Lihat halaman `/kebijakan-privasi` untuk rincian.

---

## Keamanan

Laporkan kerentanan **secara privat** lewat [GitHub Security Advisory](https://github.com/zann06/AksesAI/security/advisories/new) — jangan buka issue publik. Detail cakupan dan ekspektasi waktu respons ada di [SECURITY.md](SECURITY.md).

Untuk kontributor: repo ini menyertakan pemindaian secret otomatis di CI (`scripts/secret-scan.mjs`). Jangan pernah commit `.env.local`, `supabase/.temp/`, atau `supabase/backups/`.

---

## Lisensi

Dirilis di bawah [MIT License](LICENSE).

---

© 2026 AksesAI. Dibuat oleh organisasi MIKOS.
