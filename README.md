# AksesAI

Direktori info **gratis & murah seputar AI** berbasis kontribusi komunitas: API/token gratis dari provider, free tier, harga per token, model open-weight, tool gratis, dan hosting gratis. Setiap info memiliki sumber yang dapat diperiksa, kontributor yang transparan, dan diverifikasi manual oleh manusia.

> **AksesAI bukan afiliasi provider AI mana pun, tidak menjual token, dan tidak menjamin kuota gratis/harga masih tersedia.** Status _Verified_ berarti info telah diperiksa reviewer terhadap dokumentasi atau halaman resmi provider pada saat peninjauan — kuota, harga, dan promo dapat berubah sewaktu-waktu.

---

## Daftar Isi

- [Fitur](#fitur)
- [Tech Stack](#tech-stack)
- [Prasyarat](#prasyarat)
- [Memulai (Local Development)](#memulai-local-development)
- [Environment Variables](#environment-variables)
- [Setup Database](#setup-database)
- [Setup GitHub OAuth](#setup-github-oauth)
- [Membuat Admin Pertama](#membuat-admin-pertama)
- [Testing](#testing)
- [Build & Menjalankan Produksi](#build--menjalankan-produksi)
- [Deploy ke Vercel](#deploy-ke-vercel)
- [Struktur Repo](#struktur-repo)
- [Privasi & Data yang Tidak Dikumpulkan](#privasi--data-yang-tidak-dikumpulkan)
- [Kontribusi](#kontribusi)
- [Lisensi](#lisensi)

---

## Fitur

**Publik**
- Direktori info AI dengan pencarian teks penuh, filter (kategori, jenis akses, ketersediaan gratis, status), dan pagination
- Halaman detail info: deskripsi, syarat akses, provider, free tier, harga per token, masa berlaku promo, dan **daftar sumber yang dapat diklik**
- Riwayat perubahan informasi (audit trail yang dapat dilihat publik)
- Profil kontributor publik (transparansi siapa yang menyumbang informasi)
- Formulir laporan publik untuk informasi yang mencurigakan/palsu (dengan atau tanpa login)

**Kontributor** (login GitHub)
- Dashboard kontribusi: draf, menunggu tinjauan, perlu revisi, terbit, ditolak
- Formulir kontribusi bertahap dengan validasi real-time dan pemindaian data pribadi
- Notifikasi alasan penolakan/permintaan revisi dari reviewer

**Reviewer**
- Antrean tinjauan dengan sistem klaim (30 menit) agar tidak ada tinjauan ganda
- Aksi: verifikasi & terbitkan, minta revisi (wajib alasan), tolak (wajib alasan), tandai kedaluwarsa
- **Tidak dapat meninjau kontribusi sendiri** (ditegakkan di database)

**Moderator**
- Manajemen laporan komunitas (dismiss, reopen, arsipkan program, blokir kontributor)
- Semua aksi tercatat di audit log yang immutable

**Admin**
- Ringkasan statistik platform
- Manajemen pengguna: pencarian, blokir/buka blokir (wajib alasan), pemberian/pencabutan role
- Manajemen kategori: buat, ubah, aktifkan/nonaktifkan

**Keamanan & kepatuhan**
- RLS (Row Level Security) aktif di **semua** tabel
- Perubahan status **hanya** lewat RPC server-side (`security definer`), tidak bisa dari klien
- Pengguna tidak dapat mengubah role miliknya sendiri
- Login GitHub hanya memberi role `member`; role lain hanya diberikan admin
- Audit log immutable (tidak dapat diubah/dihapus)
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
| Rate limiting | Upstash Redis (opsional) → fallback PostgreSQL |
| Anti-bot | Cloudflare Turnstile (opsional) |
| Testing | Vitest (unit, RLS, integrasi) + Playwright (E2E) |
| Deploy | Vercel + Vercel Cron |
| CI | GitHub Actions |
| Package manager | pnpm |

---

## Prasyarat

- **Node.js** `>=20.19.0 <26` (lihat `engines` di `package.json`)
- **pnpm** 10+ (`npm i -g pnpm`)
- **Docker** (untuk Supabase lokal) — [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Supabase CLI** (`npm i -g supabase`)
- Akun **GitHub** (untuk membuat OAuth App)

---

## Memulai (Local Development)

```bash
# 1. Clone
git clone https://github.com/<owner>/AksesAI.git
cd AksesAI

# 2. Install dependensi
pnpm install

# 3. Salin template environment lalu isi nilainya (JANGAN commit .env.local)
cp .env.example .env.local

# 4. Jalankan Supabase lokal (Docker harus menyala)
supabase start

# 5. Terapkan migrasi + seed data
supabase db reset

# 6. Jalankan dev server
pnpm dev
```

Buka <http://localhost:3000>.

Setelah `supabase start`, CLI mencetak **API URL** (`http://127.0.0.1:54321`) dan **anon key**. Salin keduanya ke `.env.local` sebagai `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Salin juga **service_role key** ke `SUPABASE_SERVICE_ROLE_KEY` (server-only, jangan pernah diekspos ke browser).

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
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Rate limiting terdistribusi. Bila kosong → fallback PostgreSQL |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Anti-bot laporan anonim. Bila kosong → hanya rate limit IP |

> **Penting:** Jangan pernah memberi prefix `NEXT_PUBLIC_` pada nilai rahasia — apa pun dengan prefix itu **ikut ter-bundel ke JavaScript klien**. Repo ini menyertakan `scripts/check-client-bundle.mjs` yang gagal bila `service_role` bocor ke bundle klien.

### Membuat nilai rahasia

```bash
# CRON_SECRET (contoh)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# IP_HASH_SALT (contoh)
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

---

## Setup Database

### Supabase lokal

```bash
supabase start      # menyalakan stack lokal (Postgres, Auth, Storage, Studio)
supabase db reset   # menjalankan semua migrasi di supabase/migrations + seed
supabase status     # menampilkan URL dan key lokal
```

Studio tersedia di <http://127.0.0.1:54323>.

### Migrasi ke proyek Supabase remote

```bash
supabase link --project-ref <project-ref>
supabase db push
```

### Regenerasi tipe TypeScript

Setelah mengubah skema, buat ulang tipe database:

```bash
pnpm gen:types
```

Ini menulis `src/types/database.ts` dari skema lokal.

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

Login GitHub hanya memberi role `member`. Role `admin` **tidak pernah** dibuat otomatis dari data publik.

Setelah akun Anda login pertama kali (sehingga baris `profiles` ada), jalankan **sekali** di SQL Editor Supabase:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from public.profiles where github_username = '<username-github-anda>'
on conflict do nothing;
```

Setelah itu, kelola role pengguna lain lewat halaman **`/admin/pengguna`** (bukan lewat SQL manual).

> **Alternatif lebih aman untuk produksi:** jalankan pernyataan di atas dengan `service_role` dari lingkungan tepercaya (mis. CLI lokal), jangan di SQL Editor yang dibagikan.

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
6. Terapkan migrasi ke Supabase produksi: `supabase db push`.
7. Jalankan smoke test produksi: `node scripts/smoke-prod.mjs` (memerlukan `.env.local` menunjuk ke produksi).

---

## Struktur Repo

```text
AksesAI/
├── README.md  LICENSE  .env.example
├── e2e/                   # uji end-to-end Playwright
├── scripts/               # smoke test HTTP, secret scan, bundle check
├── supabase/
│   ├── migrations/        # skema, RLS, RPC, trigger (berurutan)
│   ├── seed.sql           # data awal (kategori)
│   └── config.toml        # konfigurasi Supabase lokal
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

## Kontribusi

Kami menerima kontribusi kode dan pelaporan bug melalui issue & pull request di repo ini. Konvensi ringkas:

- Branch: `feat/<topik>`, `fix/<topik>`, `chore/<topik>`
- Commit mengikuti [Conventional Commits](https://www.conventionalcommits.org/id/v1.0.0/)
- Sebelum membuka PR: `pnpm typecheck && pnpm lint && pnpm test` harus lulus

Untuk melaporkan **kerentanan keamanan**, gunakan [GitHub Security Advisory](https://github.com/zann06/AksesAI/security/advisories/new) — jangan buka issue publik.

---

## Lisensi

Dirilis di bawah [MIT License](LICENSE).
