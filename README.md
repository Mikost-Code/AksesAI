# AksesAI

[![CI](https://github.com/zann06/AksesAI/actions/workflows/ci.yml/badge.svg)](https://github.com/zann06/AksesAI/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e)](https://supabase.com)
[![RLS](https://img.shields.io/badge/RLS-aktif-brightgreen)](supabase/migrations)

**Direktori info gratis & murah seputar AI, dari komunitas, dengan sumber yang bisa diperiksa.**

API/token gratis, free tier, harga per token, model open-weight, tool gratis, dan hosting gratis — setiap entri wajib punya minimal satu sumber resmi dan diverifikasi manual oleh manusia sebelum terbit.

<p>
  <a href="#-mulai-cepat"><b>Mulai cepat</b></a> ·
  <a href="#-fitur"><b>Fitur</b></a> ·
  <a href="CONTRIBUTING.md"><b>Kontribusi</b></a> ·
  <a href="#-kebijakan-entri-katalog"><b>Aturan katalog</b></a> ·
  <a href="SECURITY.md"><b>Keamanan</b></a>
</p>

> **AksesAI bukan afiliasi provider AI mana pun**, tidak menjual token, dan tidak menjamin kuota gratis atau harga masih tersedia. Status _Terverifikasi_ berarti info telah diperiksa reviewer terhadap dokumentasi resmi provider **pada saat peninjauan** — kuota, harga, dan promo dapat berubah sewaktu-waktu.

> **Repo kanonis: [`zann06/AksesAI`](https://github.com/zann06/AksesAI).** Ada salinan (fork) di [`Mikost-Code/AksesAI`](https://github.com/Mikost-Code/AksesAI) yang dikelola organisasi MIKOS. Salinan itu **bukan** tempat berkontribusi — semua issue, pull request, dan rilis mengarah ke repo kanonis.

---

## 🚀 Mulai Cepat

```bash
git clone https://github.com/zann06/AksesAI.git
cd AksesAI

pnpm install
cp .env.example .env.local          # lalu isi nilainya — jangan pernah commit file ini

npx supabase@2.120.0 start          # Docker harus menyala
npx supabase@2.120.0 db reset       # terapkan semua migrasi + seed

pnpm dev                            # buka http://localhost:3000
```

Setelah `supabase start`, salin dari output-nya ke `.env.local`:

| Variabel | Diambil dari |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **API URL** — `http://127.0.0.1:54321` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **anon key** |
| `SUPABASE_SERVICE_ROLE_KEY` | **service_role key** — server-only, jangan pernah ke browser |

Studio: <http://127.0.0.1:54323> · Penampung email lokal (Mailpit): <http://127.0.0.1:54324>

> **Versi CLI di-pin.** Selalu pakai `npx supabase@2.120.0 …` agar sama dengan CI. Lihat [Catatan versi CLI](#catatan-versi-cli).

---

## ✨ Fitur

<table>
<tr><th width="140">Peran</th><th>Kemampuan</th></tr>
<tr>
<td><b>Publik</b></td>
<td>

- Pencarian full-text berperingkat (`ts_rank` atas `search_tsv`), filter kategori/jenis akses/ketersediaan/status, dan pagination
- Halaman detail: deskripsi, syarat, provider, free tier, harga per token, masa promo, dan daftar sumber yang dapat diklik
- Riwayat perubahan info dan **riwayat perubahan harga** per entri
- Penghitung klik per sumber sebagai sinyal kualitas
- Profil kontributor publik dengan jenjang (baru → aktif → terpercaya → pakar)
- Formulir laporan publik untuk info mencurigakan, dengan atau tanpa login

</td>
</tr>
<tr>
<td><b>Kontributor</b><br><sup>login GitHub</sup></td>
<td>

- Dashboard: draf, menunggu tinjauan, perlu revisi, terbit, ditolak
- Formulir bertahap dengan validasi real-time dan pemindaian data pribadi
- Pusat notifikasi in-app (lonceng di navbar + `/dashboard/notifikasi`)
- Pengingat promo: simpan entri, terima notifikasi sebelum promo berakhir

</td>
</tr>
<tr>
<td><b>Reviewer</b></td>
<td>

- Antrean tinjauan dengan sistem klaim 30 menit agar tidak ada tinjauan ganda
- Verifikasi & terbitkan, minta revisi, tolak, tandai kedaluwarsa
- **Tidak dapat meninjau kiriman sendiri** — ditegakkan di database
- Re-verifikasi berkala 90 hari agar info tidak menua diam-diam

</td>
</tr>
<tr>
<td><b>Moderator</b></td>
<td>

- Kelola laporan komunitas: dismiss, reopen, arsipkan program, blokir kontributor
- Semua aksi masuk audit log yang immutable

</td>
</tr>
<tr>
<td><b>Admin</b><br><sup>+ Super Admin</sup></td>
<td>

- Statistik platform dan manajemen pengguna (cari, blokir/buka blokir dengan alasan wajib)
- Riwayat moderasi per pengguna agar keputusan dapat diaudit dalam konteks akun
- Manajemen kategori dan kendali masa berlaku program (`/admin/program`)
- **Khusus Super Admin (pemilik):** beri/cabut role dan blokir admin

</td>
</tr>
</table>

---

## 🔐 Keamanan

| Lapisan | Penerapan |
|---|---|
| **Row Level Security** | Aktif di **semua** tabel. Tabel internal (`rate_limit_buckets`, `program_feedback`) punya **0 policy** — default-deny, hanya lewat RPC |
| **Perubahan status** | Hanya lewat RPC `security definer` berserver; tidak bisa dari klien |
| **Pencegahan eskalasi** | Pengguna tidak dapat mengubah role sendiri; `super_admin` hanya diatur lewat konsol DB dan tidak bisa dicabut/diblokir lewat aplikasi |
| **Role source of truth** | Dibaca dari **database**, bukan klaim JWT. Login GitHub hanya memberi `member` |
| **Hardening fungsi DB** | Seluruh 42 fungsi `security definer` memakai `set search_path` (anti hijacking) |
| **Audit log** | Immutable — tidak dapat diubah atau dihapus |
| **Rate limit** | Upstash Redis → fallback PostgreSQL → **fail-closed di produksi** |
| **Anti-spoofing IP** | Header proxy tepercaya diutamakan; `X-Forwarded-For` dibaca dari entri **terakhir** |
| **Privasi IP** | IP **tidak disimpan mentah**, hanya hash bergaram — terpisah per tujuan fitur |
| **XSS** | JSON-LD di-escape (`<` → `\u003c`) sehingga teks kiriman pengguna tidak bisa menutup tag `<script>` |

Tanpa AI/chatbot di dalam aplikasi — tidak memerlukan API key AI apa pun.

Laporkan kerentanan **secara privat** lewat [GitHub Security Advisory](https://github.com/zann06/AksesAI/security/advisories/new), jangan buka issue publik. Lihat [SECURITY.md](SECURITY.md).

---

## 🧱 Tech Stack

| Lapisan | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router) |
| Bahasa | TypeScript (strict) |
| UI | Tailwind CSS v4 + komponen shadcn/ui (ditulis tangan; Radix Select) |
| Database & Auth | Supabase (PostgreSQL, GitHub OAuth, RLS) |
| Validasi | Zod |
| Rate limiting | Upstash Redis → PostgreSQL → fail-closed |
| Anti-bot | Cloudflare Turnstile (wajib di produksi untuk laporan anonim) |
| Testing | Vitest (unit, RLS, integrasi) + Playwright (E2E) |
| Deploy & CI | Vercel + Vercel Cron · GitHub Actions |
| Package manager | pnpm |

**Prasyarat:** Node.js `>=20.19.0 <26` · pnpm 10+ · Docker (Supabase lokal) · Supabase CLI `2.120.0` · akun GitHub (untuk OAuth App)

---

## Konfigurasi Environment

Lihat `.env.example` untuk daftar lengkap beserta komentar.

### Wajib

| Variabel | Publik? | Keterangan |
|---|:---:|---|
| `NEXT_PUBLIC_SITE_URL` | ✅ | URL kanonik situs (SEO, sitemap, redirect OAuth) |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL proyek Supabase — dilindungi RLS |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Anon key — dilindungi RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ | **Rahasia.** Server saja: laporan anonim & cron |
| `CRON_SECRET` | ❌ | **Rahasia.** String acak ≥ 32 karakter |
| `IP_HASH_SALT` | ❌ | **Rahasia.** Salt hash IP pelapor |

### Opsional

| Variabel | Bila kosong |
|---|---|
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Fallback ke PostgreSQL. **Di produksi tanpa keduanya → fail-closed** |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | **Di produksi `TURNSTILE_SECRET_KEY` wajib** — tanpanya laporan ditolak |
| `NEXT_PUBLIC_CF_BEACON_TOKEN` | Analytics Cloudflare tidak dimuat sama sekali |

> [!IMPORTANT]
> Jangan pernah memberi prefix `NEXT_PUBLIC_` pada nilai rahasia — apa pun dengan prefix itu **ikut ter-bundel ke JavaScript klien**. `scripts/check-client-bundle.mjs` menggagalkan build bila `service_role` bocor ke bundle klien.

```bash
# Membuat nilai rahasia
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # CRON_SECRET
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"   # IP_HASH_SALT
```

---

## 🗄️ Database & Migrasi

**Skema database dipublikasikan di repo ini.** Folder `supabase/` berisi `config.toml`, seluruh migrasi (`supabase/migrations/`), dan `seed.sql`. Ini disengaja:

- tes RLS, integrasi, dan E2E berjalan otomatis di setiap pull request;
- siapa pun dapat mengaudit kebijakan RLS yang melindungi data;
- tidak ada skema tersembunyi yang membuat lokal berbeda dari produksi.

Tidak ada rahasia di folder ini: `config.toml` membaca kredensial OAuth lewat `env(...)`, dan `seed.sql` hanya berisi kategori serta pengaturan situs — tanpa akun admin maupun data pengguna.

### Transparansi isi migrasi

Seluruh migrasi di-commit apa adanya, termasuk yang mencerminkan proses pengembangan. Berikut penjelasan bagian yang mungkin terlihat janggal saat dibaca:

| Migrasi | Isi | Catatan |
|---|---|---|
| `...0004`, `...0010` | Tidak lagi membuat `super_admin` otomatis | Kepemilikan platform sengaja dibuat **manual** (lihat [Membuat Admin Pertama](#membuat-admin-pertama)); menghapus baris lama tidak mencabut super_admin yang sudah ada |
| `...0022`, `...0027`, `...0028`, `...0030` | `bersihkan_*` — menghapus **data uji** sendiri | Menonaktifkan trigger append-only **hanya di dalam transaksi** lalu menyalakannya kembali; tidak menyentuh data pengguna asli |
| `...0009`, `...0012` | Penambahan role & hardening | Perubahan otorisasi yang disengaja |

Migrasi bersifat **append-only**: file lama tidak diubah setelah diterapkan ke database. Karena itu "sampah" pengembangan tetap terlihat — itu harga dari riwayat yang dapat diaudit penuh.

**Tidak ikut di-commit** (lihat `.gitignore`): `supabase/.temp` (info proyek ter-link & connection URL), `supabase/.branches`, `supabase/.env`, `supabase/snippets/`, dan `supabase/backups/` (berisi **data produksi**).

```bash
npx supabase@2.120.0 start      # stack lokal: Postgres, Auth, Storage, Studio
npx supabase@2.120.0 db reset   # jalankan semua migrasi + seed
npx supabase@2.120.0 status     # tampilkan URL dan key lokal
```

### Migrasi ke proyek remote

```bash
npx supabase@2.120.0 login
npx supabase@2.120.0 link --project-ref <project-ref>
npx supabase@2.120.0 db push
```

### Menambah migrasi baru

1. Buat file di `supabase/migrations/` bernama `YYYYMMDDHHMMSS_deskripsi.sql`.
2. Tulis SQL **idempoten** bila memungkinkan (`if not exists`, `create or replace`) — migrasi dijalankan ulang di CI.
3. Jangan pernah menaruh kredensial, JWT, atau data pribadi di migrasi maupun `seed.sql`.
4. Regenerasi tipe: `pnpm gen:types` (menulis `src/types/database.ts`).
5. Buka PR — CI menerapkan migrasi Anda ke database bersih dan menjalankan seluruh tes RLS.

### Catatan versi CLI

`config.toml` memakai section `[local_smtp]` (nama baru sejak CLI 2.108.0). CLI 2.x menerima nama ini; CLI 3.x **menolak** nama lama `[inbucket]`. Karena itu CI mem-pin `supabase@2.120.0` — jangan naikkan versi tanpa menyesuaikan konfigurasi.

---

## 🔑 Setup GitHub OAuth

1. GitHub → **Settings** → **Developer settings** → **OAuth Apps** → **New OAuth App**.
2. Isi:

   | Kolom | Nilai |
   |---|---|
   | Application name | `AksesAI` |
   | Homepage URL | `http://localhost:3000` (dev) atau domain produksi |
   | Authorization callback URL | `https://<project-ref>.supabase.co/auth/v1/callback` |

3. Salin **Client ID** dan **Client Secret**.
4. Supabase Dashboard → **Authentication** → **Providers** → **GitHub** → aktifkan → tempel keduanya.
5. **Authentication** → **URL Configuration** → tambahkan ke **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `https://<domain-produksi>/auth/callback`

> Callback URL mengarah ke **Supabase**, bukan langsung ke aplikasi. Supabase yang meneruskan ke `/auth/callback` milik aplikasi.

---

## Membuat Admin Pertama

Login GitHub hanya memberi role `member`. Role staf **tidak pernah** dibuat otomatis dari data publik.

**`super_admin`** adalah pemilik platform: mewarisi semua akses admin plus kewenangan eksklusif mengatur role dan memblokir admin. Role ini hanya diatur lewat konsol database, dan akunnya tidak dapat dicabut/diblokir lewat aplikasi — akses pemulihan pemilik selalu tersedia.

Setelah akun pemilik login sekali (sehingga baris `profiles` ada), jalankan **sekali**:

```sql
insert into public.user_roles (user_id, role, assigned_by)
select id, 'super_admin', id from public.profiles where github_username = '<username-pemilik>'
on conflict do nothing;
```

> [!TIP]
> Untuk produksi, jalankan pernyataan di atas dengan `service_role` dari lingkungan tepercaya (mis. CLI lokal), **bukan** di SQL Editor yang dibagikan.

Staf lain (reviewer/moderator/admin) dikelola lewat `/admin/pengguna` sebagai pemilik — bukan SQL manual.

| Aksi | Anggota | Reviewer | Moderator | Admin | Super Admin |
|---|:---:|:---:|:---:|:---:|:---:|
| Review kontribusi | — | ✅ | — | ✅ | ✅ |
| Moderasi laporan | — | — | ✅ | ✅ | ✅ |
| Kelola kategori | — | — | — | ✅ | ✅ |
| Beri/cabut role | — | — | — | — | ✅ |
| Blokir admin | — | — | — | — | ✅ |

---

## 🧪 Testing

```bash
pnpm test                               # unit (validasi Zod, slug, sanitasi, SSRF, sensitive-scan)
pnpm test:rls                           # RLS + integrasi (Supabase lokal harus menyala)
pnpm exec playwright install chromium   # sekali saja
pnpm test:e2e                           # E2E Playwright
```

**Catatan E2E:** login memakai GitHub OAuth yang tidak dapat diotomasi lokal. Uji E2E membuat pengguna sungguhan lewat `service_role` di sisi server, lalu menanamkan cookie sesi `@supabase/ssr` ke konteks browser. Lihat `e2e/helpers.ts`.

**Apa yang dijalankan CI** — setiap push ke `main` dan setiap pull request:

| Job | Isi |
|---|---|
| **Lint, typecheck, unit test, build** | `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm audit --audit-level=high`, pemindaian secret, `pnpm build`, cek `service_role` tidak bocor ke bundle klien |
| **RLS, integration & E2E** | Menyalakan Supabase lokal di runner, menerapkan **seluruh migrasi + seed** ke database bersih, lalu `pnpm test:rls` dan `pnpm test:e2e` |

Artinya: PR yang mengubah kebijakan RLS atau RPC diuji terhadap database sungguhan sebelum merge — bukan dilewati.

```bash
E2E_BASE_URL=http://localhost:3000 pnpm test:e2e   # targetkan server yang sudah berjalan
```

### Pemeriksaan keamanan

```bash
pnpm audit                            # audit dependensi
pnpm secret:scan                      # pindai pola secret yang terlacak git
node scripts/check-client-bundle.mjs  # pastikan service_role tidak bocor (setelah build)
```

### Skrip smoke manual (HTTP)

```bash
node scripts/smoke-dashboard.mjs        # baca dashboard
node scripts/smoke-mutation.mjs         # mutasi kontribusi
node scripts/smoke-staff.mjs            # alur reviewer/moderator
node scripts/smoke-admin.mjs            # baca halaman admin
node scripts/smoke-admin-mutation.mjs   # mutasi admin
```

Semua skrip memerlukan `.env.local` terisi dan server berjalan.

---

## 📦 Build & Deploy

```bash
pnpm build
pnpm start        # http://localhost:3000
```

Sebelum deploy:

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm secret:scan
node scripts/build-probe.mjs && node scripts/check-client-bundle.mjs
```

### Deploy ke Vercel

1. Import repo ke Vercel.
2. Tambahkan **semua** [environment variable](#konfigurasi-environment) untuk Production (dan Preview bila ingin preview berfungsi).
3. Set `NEXT_PUBLIC_SITE_URL` ke domain produksi.
4. Setelah domain aktif, perbarui **Homepage URL** & **Redirect URLs** di OAuth App GitHub dan di Supabase Auth.
5. Vercel Cron (`vercel.json`) sudah dikonfigurasi:

   | Endpoint | Jadwal | Fungsi |
   |---|---|---|
   | `GET /api/cron/expire` | `0 1 * * *` | Tandai program kedaluwarsa |
   | `GET /api/cron/cleanup` | `30 2 * * *` | Bersihkan data sementara |

   Keduanya diamankan `Authorization: Bearer <CRON_SECRET>`, yang dikirim Vercel Cron otomatis bila `CRON_SECRET` diset.

6. Terapkan migrasi ke Supabase produksi: `npx supabase@2.120.0 db push`.
7. Smoke test produksi: `node scripts/smoke-prod.mjs` (`.env.local` harus menunjuk ke produksi).

### Analytics (opsional)

Tidak ada analytics bawaan. Untuk statistik ramah privasi (tanpa cookie, tanpa pelacakan lintas situs), aktifkan [Cloudflare Web Analytics](https://developers.cloudflare.com/web-analytics/): salin **beacon token**, set `NEXT_PUBLIC_CF_BEACON_TOKEN` di Vercel, lalu redeploy.

### Backup database

Migrasi tersimpan di repo, tetapi **data** tidak. Jadwalkan backup berkala dari lingkungan tepercaya:

```bash
pnpm db:backup            # skema + data
pnpm db:backup --schema   # skema saja
```

Hasilnya ditulis ke `supabase/backups/*.sql` dan **diabaikan git** — file itu berisi data produksi. Simpan salinan kedua ke penyimpanan lain: itu satu-satunya cadangan di luar cluster.

---

## 🗂️ Struktur Repo

```text
AksesAI/
├── .github/workflows/ci.yml   # lint, typecheck, unit, build, RLS, integrasi, E2E
├── docs/                      # catatan audit katalog
├── e2e/                       # uji end-to-end Playwright
├── scripts/                   # smoke test HTTP, secret scan, bundle check, seed katalog
├── supabase/                  # config.toml, migrations/, seed.sql (dipublikasikan)
├── src/
│   ├── app/
│   │   ├── (public)/          # beranda, direktori, detail, halaman statis
│   │   ├── (auth)/            # login
│   │   ├── auth/              # callback OAuth
│   │   ├── dashboard/         # area kontributor
│   │   ├── review/            # area reviewer
│   │   ├── moderation/        # area moderator
│   │   ├── admin/             # area admin
│   │   └── api/               # route handler (reports, cron, export)
│   ├── components/            # komponen UI & fitur
│   ├── lib/                   # auth, supabase client, validasi, keamanan, data layer
│   └── types/                 # tipe database hasil generate
└── tests/
    ├── unit/                  # Vitest (jsdom)
    ├── rls/                   # kebijakan RLS terhadap Supabase lokal
    └── integration/           # RPC & alur lintas lapisan
```

---

## 🤝 Kontribusi

Kami menerima kontribusi kode, perbaikan data katalog, dan laporan bug. Panduan lengkap ada di [CONTRIBUTING.md](CONTRIBUTING.md); ringkasnya:

- **Branch:** `feat/<topik>`, `fix/<topik>`, `chore/<topik>`, `docs/<topik>`
- **Commit:** [Conventional Commits](https://www.conventionalcommits.org/id/v1.0.0/)
- **Sebelum PR:** `pnpm typecheck && pnpm lint && pnpm test` harus lulus
- **Semua perubahan lewat pull request** — `main` dilindungi dan CI wajib hijau
- Satu PR untuk satu tujuan; perubahan besar sebaiknya didiskusikan lewat issue dulu

Proyek ini memakai [Contributor Covenant](CODE_OF_CONDUCT.md). Dengan berpartisipasi, Anda diharapkan mematuhinya.

> [!NOTE]
> Kalau Anda sedang membuka [`Mikost-Code/AksesAI`](https://github.com/Mikost-Code/AksesAI), itu **salinan (fork)**. Kirim pull request ke **[`zann06/AksesAI`](https://github.com/zann06/AksesAI/pulls)** — repo kanonis tempat semua perubahan di-merge.

---

## 📋 Kebijakan Entri Katalog

Aturan yang tidak boleh dilanggar saat menambah atau memperbarui entri:

1. **Wajib ada minimal satu sumber resmi.** Sumber resmi = dokumentasi provider, halaman harga/kuota resmi, pengumuman di kanal resmi (blog/X/status page), atau dokumen hukumnya. Blog agregator, tautan afiliasi, dan video pihak ketiga **bukan** sumber resmi.
2. **Jangan menyatakan tanggal berakhir yang belum diumumkan.** Bila provider tidak menyebut tanggal, biarkan kosong dan tulis ketidakpastiannya secara jujur (mis. "belum ada tanggal resmi"). Jangan menebak.
3. **Angka `0` bukan informasi.** Jangan menampilkan atau mengisi `0` sebagai data; kosongkan bila nilainya memang tidak ada.
4. **Kuota & harga mudah berubah.** Sertakan waktu pengecekan; reviewer akan memverifikasi ulang terhadap sumber saat peninjauan.
5. **Satu entri = satu program.** Jangan menggabungkan beberapa penawaran berbeda dalam satu entri.

Pelanggaran aturan di atas akan ditolak reviewer. Ragu? Tanya lewat issue.

---

## 🕵️ Privasi & Data yang Tidak Dikumpulkan

AksesAI **secara sengaja tidak mengumpulkan**:

| ❌ Tidak dikumpulkan | ❌ Tidak dikumpulkan |
|---|---|
| NIK (Nomor Induk Kependudukan) | Nomor rekening / kartu |
| Nomor Kartu Keluarga (KK) | Identitas penerima bantuan atau daftar penerima |
| Foto KTP atau dokumen identitas apa pun | — |

Formulir kontribusi dan laporan punya **pemindaian otomatis** yang menolak kiriman mengandung pola NIK/KK/nomor rekening. IP pelapor **tidak disimpan mentah** — hanya hash bergaram untuk rate limiting.

**Yang disimpan:** informasi program dari sumber publik, judul & URL sumber, dan identitas **kontributor** (username GitHub publik) untuk transparansi.

Rincian lengkap: halaman `/kebijakan-privasi`.

---

## 📄 Lisensi

Dirilis di bawah [MIT License](LICENSE).

---

<div align="center">

© 2026 AksesAI. Dibuat oleh organisasi **[MIKOS](https://github.com/Mikost-Code)**.

</div>
