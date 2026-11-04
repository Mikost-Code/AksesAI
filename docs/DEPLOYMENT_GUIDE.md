# Deployment Guide — AksesAI

Hosting: **Vercel** (aplikasi) + **Supabase** (database/auth). Repo: GitHub.

## 1. Environment

| Lingkungan | Aplikasi | Supabase | Tujuan |
|---|---|---|---|
| Local | `localhost:3000` | Supabase CLI / proyek dev | Pengembangan |
| Preview | Vercel Preview (per PR) | Proyek **staging** | Review PR & uji |
| Production | Domain produksi | Proyek **prod** | Pengguna |

Jangan pernah berbagi database antara preview dan production.

## 2. Setup Supabase (per lingkungan)

1. Buat proyek; catat Project URL, anon key, service_role key (rahasia).
2. Authentication → Providers → **GitHub**: isi Client ID/Secret dari GitHub OAuth App (satu OAuth App per lingkungan).
3. Authentication → URL Configuration: *Site URL* = domain lingkungan; *Redirect URLs* = `<domain>/auth/callback` (+ pola preview Vercel untuk staging).
4. Jalankan migrasi: `supabase link --project-ref <ref>` → `supabase db push`.
5. Jalankan seed kategori & `site_settings` awal.
6. Buat Admin pertama (SQL di README) setelah login GitHub pertama.
7. Aktifkan: backup harian (plan berbayar) atau jadwalkan `pg_dump` manual berkala bila memakai tier gratis; nonaktifkan signup provider selain GitHub.

## 3. Setup Vercel

1. Import repo GitHub → framework Next.js (terdeteksi otomatis; `pnpm-lock.yaml` terdeteksi sebagai pnpm).
2. Environment Variables (Production, Preview, Development sesuai kebutuhan) — lihat `.env.example`. Tandai rahasia sebagai *Sensitive*.

   > ⚠️ **Blocker untuk repo privat:** Vercel berbayar memakai *integration* GitHub App; akun **Hobby (gratis) hanya bisa meng-import repo publik**. Untuk repo privat tanpa upgrade, deploy lewat Vercel CLI (`vercel --prod`) dari mesin lokal — build berjalan lokal/build-server, bukan dari GitHub.

   | Variabel | Sumber | Sensitive |
   |---|---|---|
   | `NEXT_PUBLIC_SITE_URL` | domain produksi, mis. `https://aksesai.vercel.app` | tidak |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | tidak |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | idem | tidak |
   | `SUPABASE_SERVICE_ROLE_KEY` | idem (Reveal) | **ya** |
   | `CRON_SECRET` | generate acak ≥ 32 karakter (**beda** dari nilai lokal) | **ya** |
   | `IP_HASH_SALT` | generate acak ≥ 16 karakter (**beda** dari nilai lokal) | **ya** |
   | `UPSTASH_REDIS_REST_URL` / `_TOKEN` | opsional; tanpa ini rate limit jatuh ke Postgres | **ya** |
   | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | opsional; tanpa ini laporan anonim hanya dibatasi rate limit IP | sebagian |

   Generate nilai acak:
   ```bash
   node -e "console.log(require('crypto').randomBytes(36).toString('base64url'))"
   ```

   **Penting — tambahkan domain produksi ke Supabase:** Authentication → URL Configuration →
   *Site URL* = domain produksi, *Redirect URLs* = `https://<domain>/auth/callback`.
   Tanpa ini login GitHub di produksi akan gagal. Untuk OAuth callback GitHub sendiri
   tetap `https://<project-ref>.supabase.co/auth/v1/callback` (tidak berubah per domain).

3. Domain: tambahkan domain, aktifkan HTTPS (otomatis).
4. **Vercel Cron** (`vercel.json`):

```json
{
  "crons": [
    { "path": "/api/cron/expire", "schedule": "0 1 * * *" },
    { "path": "/api/cron/cleanup", "schedule": "30 2 * * *" }
  ]
}
```
Jadwal di `vercel.json` memakai **UTC**: `0 1 * * *` = 08:00 WIB, `30 2 * * *` = 09:30 WIB. Endpoint memeriksa `Authorization: Bearer $CRON_SECRET` (dibandingkan konstanta-waktu) dan mengembalikan 503 bila `CRON_SECRET`/service role tidak diisi. Pada plan Hobby, cron hanya boleh berjalan sekali sehari per job — sesuaikan jadwal bila perlu.

5. Branch produksi: `main`. Proteksi: wajib PR + CI hijau + review.
6. **Jangan sertakan direktif `form-action` di CSP.** Chromium menerapkannya pada header `Location` dari respons POST; alur login memakai `POST /auth/sign-in` yang merespons 303 ke Supabase, sehingga direktif itu memblokir redirect OAuth dan tombol login tampak mati. Lihat komentar di `next.config.ts`.


## 4. Upstash & Turnstile

- Upstash Redis: buat database (region terdekat, mis. Singapore), salin REST URL/token.
- Cloudflare Turnstile: buat widget untuk domain; isi site key & secret key.

## 5. CI/CD (GitHub Actions)

Pipeline minimal pada setiap PR:

```text
install → lint → typecheck → unit test → build → (opsional) e2e pada preview
```
Tambahkan: `pnpm audit --audit-level=high`, gitleaks, dan tes RLS terhadap Supabase lokal.

Rilis: merge ke `main` → Vercel deploy production otomatis → jalankan smoke test.
Migrasi database: dijalankan **sebelum** deploy kode yang membutuhkannya (migrasi harus *backward compatible*: tambah kolom dulu, hapus belakangan).

## 6. Checklist Pra-Rilis

- [ ] Semua FR MVP selesai; acceptance criteria PRD terpenuhi
- [ ] Checklist Security Review (SECURITY.md §13) lulus
- [ ] Responsif diuji di 360px, 768px, 1280px; keyboard-only; Lighthouse A11y ≥ 90
- [ ] Teks `/tentang`, `/panduan`, `/kebijakan-privasi` final (tanpa placeholder `[ISI]`)
- [ ] Minimal 2 Admin & 2 Reviewer terdaftar
- [ ] Redirect URL OAuth produksi benar; login berfungsi end-to-end
- [ ] Env var produksi terisi; tidak ada nilai dev
- [ ] `robots.txt`, sitemap, metadata Open Graph benar
- [ ] Backup & rencana pemulihan teruji
- [ ] Tidak ada API key/secret di repo; situs berjalan tanpa AI provider

## 7. Smoke Test Produksi

1. Beranda & `/info` termuat; pencarian & filter bekerja.
2. Detail entri menampilkan sumber, kontributor, disclaimer.
3. Login GitHub berhasil; profil dibuat.
4. Buat Draft → kirim → muncul di antrean reviewer.
5. Reviewer: minta revisi → revisi → verify; muncul publik.
6. Kirim laporan (anonim & login) → muncul di moderator.
7. Admin: ubah role (akun uji), lihat audit log.
8. Panggil cron tanpa secret → 401; dengan secret → 200.
9. Cek header keamanan (`curl -I`) & tidak ada error konsol.

## 8. Operasional

| Aspek | Praktik |
|---|---|
| Monitoring | Vercel Analytics/Logs, Supabase Reports; alert saat error rate naik |
| Backup | Harian; uji restore tiap kuartal |
| Rotasi rahasia | Tiap 6 bulan atau saat ada anggota keluar |
| Pembaruan dependensi | Dependabot mingguan; uji di preview |
| Insiden | Rotasi kunci → arsipkan konten bermasalah → catat post-mortem tanpa menyalahkan individu |
| Rollback | Vercel "Instant Rollback"; migrasi bersifat forward-only, siapkan migrasi koreksi |

## 9. Batas Tier Gratis & Rencana Cadangan

Kuota/harga Vercel, Supabase, Upstash, Turnstile dapat berubah; **periksa halaman resmi sebelum rilis**. Hal yang perlu dipantau: proyek Supabase gratis dapat dijeda saat tidak aktif (aktifkan monitoring/ping atau upgrade), batas koneksi database, batas bandwidth, dan batas permintaan Redis. Rencana: upgrade plan atau migrasi (self-host Postgres + Auth) bila pertumbuhan melebihi kuota.
