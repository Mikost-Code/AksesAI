# BantuWarga

Platform informasi bantuan sosial berbasis kontribusi komunitas. Setiap informasi memiliki sumber yang dapat diperiksa, kontributor yang transparan, dan diverifikasi manual oleh manusia.

> BantuWarga **bukan** lembaga pemerintah, **bukan** penyalur bansos, dan **bukan** penentu kelayakan penerima bantuan. Status *Verified* berarti informasi telah diperiksa reviewer terhadap sumber yang tersedia, bukan jaminan pemerintah atau jaminan bantuan masih tersedia.

## Fitur

- Direktori bansos dengan pencarian, filter (kategori, wilayah, status, tanggal), dan pagination
- Detail informasi lengkap dengan tautan sumber & riwayat pembaruan
- Kontribusi via login GitHub, dashboard status kontribusi
- Profil kontributor publik
- Verifikasi manual oleh reviewer, sistem laporan, moderasi, dan audit log
- **Tanpa** AI/chatbot di dalam website

## Tech Stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Supabase (PostgreSQL, Auth GitHub OAuth, RLS) · Vercel

## Prasyarat

- Node.js 20 LTS atau lebih baru
- pnpm 9+ (atau npm)
- Akun Supabase dan GitHub
- Supabase CLI (`npm i -g supabase`) untuk migrasi lokal

## Memulai

```bash
git clone https://github.com/<org>/BantuWarga.git
cd BantuWarga
pnpm install
cp .env.example .env.local   # isi nilainya, jangan di-commit
supabase start               # opsional: Supabase lokal
supabase db reset            # menjalankan migrasi + seed
pnpm dev                     # http://localhost:3000
```

### Setup GitHub OAuth (Supabase)

1. GitHub → Settings → Developer settings → OAuth Apps → **New OAuth App**.
2. Homepage URL: `http://localhost:3000` (dev). Callback URL: `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Salin Client ID & Secret ke Supabase → Authentication → Providers → GitHub.
4. Tambahkan `http://localhost:3000/auth/callback` dan URL produksi ke *Redirect URLs*.

### Membuat Admin pertama

Setelah login GitHub pertama kali, jalankan sekali di SQL Editor Supabase (menggunakan akun Anda):

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from public.profiles where github_username = '<username-anda>';
```

Selanjutnya role dikelola lewat `/admin/roles`.

## Skrip

| Perintah | Fungsi |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm build` / `pnpm start` | Build & jalankan produksi |
| `pnpm lint` / `pnpm typecheck` | Lint & type check |
| `pnpm test` | Unit test |
| `pnpm test:e2e` | E2E (Playwright) |
| `pnpm test:rls` | Tes kebijakan RLS |

## Struktur Repo

```text
BantuWarga/
├── README.md  PRD.md  CONTRIBUTING.md  LICENSE  .env.example
├── docs/      # dokumentasi proyek (lihat tabel)
├── supabase/  # migrations, seed, tests
└── src/       # aplikasi Next.js
```

| Dokumen | Isi |
|---|---|
| [PRD.md](PRD.md) | Kebutuhan produk final |
| [docs/PROJECT_HANDOVER.md](docs/PROJECT_HANDOVER.md) | Ringkasan serah terima |
| [docs/SYSTEM_ARCHITECTURE.md](docs/SYSTEM_ARCHITECTURE.md) | Arsitektur & alur |
| [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) | Skema, RLS, fungsi |
| [docs/SECURITY.md](docs/SECURITY.md) | Keamanan & privasi |
| [docs/MODERATION_GUIDE.md](docs/MODERATION_GUIDE.md) | Panduan reviewer/moderator |
| [docs/UI_UX_GUIDELINE.md](docs/UI_UX_GUIDELINE.md) | Desain & UX |
| [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) | Deploy & operasional |
| [docs/AI_DEVELOPMENT_SETUP.md](docs/AI_DEVELOPMENT_SETUP.md) | Workflow AI untuk developer |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Panduan kontribusi kode |

## Lisensi

Lihat [LICENSE](LICENSE).
