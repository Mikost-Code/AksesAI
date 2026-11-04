# Implementation Progress — AksesAI

> Dokumen hidup. Diperbarui setiap akhir fase sesuai MASTER EXECUTION PROMPT.
> Legenda: `[ ]` belum dikerjakan · `[x]` selesai **dan teruji** · `[!]` terhambat / butuh konfigurasi atau keputusan manual · `[~]` dikerjakan sebagian (kode ada, verifikasi belum lengkap)

**Terakhir diperbarui:** PHASE 9 selesai (finalisasi dokumentasi).
**Status keseluruhan:** 🟢 Kode & dokumentasi siap rilis publik: seluruh alur berjalan
end-to-end, ter-harden, dan teruji berlapis (107 unit, 39 RLS/integrasi, 36 E2E).
Dokumentasi diverifikasi terhadap kode aktual (README ditulis ulang, error dokumentasi
`/admin/roles`, view yang tidak ada, dan `middleware.ts` dikoreksi).
**Sisa:** PHASE 10 (rilis repo GitHub publik) & PHASE 11 (deploy Vercel) — keduanya
**tertahan** menunggu tautan repo, kredensial, dan izin pemilik proyek (lihat B1–B7).

### Bukti verifikasi PHASE 1–3 (dijalankan nyata, bukan klaim)

| Perintah | Hasil |
|---|---|
| `pnpm install` | Sukses, `pnpm-lock.yaml` dibuat |
| `pnpm typecheck` | 0 error (TypeScript 5.9.3, `strict` + `noUncheckedIndexedAccess`) |
| `pnpm lint` | 0 error, 0 warning (ESLint 9.39.5 + eslint-config-next 16.4.4) |
| `pnpm build` | Sukses; 15 route terdaftar, `BUILD_ID` terbentuk |
| `pnpm test` | **45 tes lulus** (5 file, Vitest 5.1.0) |
| `pnpm test:rls` | **12 tes lulus** terhadap Supabase lokal (Postgres 17) |
| `supabase db reset` | 8 migrasi + seed diterapkan bersih |
| `node scripts/secret-scan.mjs` | Tidak ada pola secret pada 108 file terlacak |
| Smoke test dev server | `/` `/info` `/login` `/panduan` `/sitemap.xml` → 200; `/admin` → 307 ke `/login`; entri contoh tampil di direktori & halaman detail |

---

## Ringkasan Kondisi Saat Ini (PHASE 0)

| Area | Kondisi |
|---|---|
| Dokumentasi | Lengkap (README, PRD, CONTRIBUTING, LICENSE, 8 dokumen di `docs/`) |
| Kode aplikasi | **Belum ada.** `src/` kosong, tidak ada `package.json` |
| Database/migrasi | **Belum ada.** `supabase/` tidak ada |
| Repositori Git | **Belum diinisialisasi** (`git status` → not a git repository) |
| CI/CD | **Belum ada** `.github/workflows` |
| Konfigurasi tooling | **Belum ada** (tsconfig, next.config, eslint, postcss, components.json, .gitignore) |
| `.env.example` | Ada; berisi daftar variabel yang dibutuhkan |
| `pnpm-lock.yaml` | Belum ada (dibuat saat `pnpm install` di Fase 1) |

Dokumen yang **belum** tersedia dan wajib dibuat:
- `docs/IMPLEMENTATION_PROGRESS.md` (dokumen ini — dibuat pada Fase 0)
- `README.md` perlu screenshot, tabel env, bagian testing & deployment yang lebih rinci (saat ini masih ringkas)
- `docs/DATABASE_SCHEMA.md` perlu diselaraskan dengan migrasi aktual setelah implementasi
- `docs/SECURITY.md` masih berisi placeholder `[ISI email keamanan]`
- Konten `/tentang`, `/panduan`, `/kebijakan-privasi` sudah ditulis lengkap (tanpa placeholder)

---

## PHASE 0 — Audit Repository & Dokumentasi

### 0.1 Inventaris file

- [x] Membaca seluruh dokumentasi (9 file markdown + LICENSE + .env.example)
- [x] Memastikan `src/` kosong (0 entri) — belum ada implementasi
- [x] Memeriksa status Git — **belum ada repositori Git**
- [x] Memeriksa tooling lokal: Node v25.2.1, pnpm 10.28.2, git 2.50.1
- [x] Menulis `docs/IMPLEMENTATION_PROGRESS.md`

### 0.2 Temuan konflik & kekurangan dokumentasi

| # | Temuan | Dampak | Rekomendasi | Status |
|---|---|---|---|---|
| C1 | `DATABASE_SCHEMA.md` §3.1 mendefinisikan trigger `handle_new_user` yang menyisipkan ke `user_roles` **sebelum** `user_roles` didefinisikan pada §3.2 — urutan DDL error jika dieksekusi apa adanya | Migrasi gagal | Migrasi dibuat berurutan: enum → tabel → fungsi → trigger | `[!]` akan diselesaikan di Fase 3 |
| C2 | `handle_new_user` memakai metadata `user_name`; jika kosong membuat `'user-'||left(id,8)` yang **tidak menjamin unique** → insert `profiles` gagal (`github_username` unique) | Login gagal untuk akun tanpa username GitHub | Tambahkan loop/`on conflict` + fallback deterministik; handle perubahan username saat login ulang | `[!]` |
| C3 | Kolom `region` adalah *generated column* legacy domain bansos (memakai `coalesce(city || ', ', '') || coalesce(province,'Nasional')`) — tidak dipakai UI domain AI | Kolom legacy tidak konsisten bila diisi | Biarkan kosong/abaikan; UI memakai `access_type` | `[x]` tidak relevan lagi (domain AI tidak memakai wilayah) |
| C4 | Policy `profiles_update_own` memakai subquery ke `profiles` dari dalam policy `profiles` → berpotensi **infinite recursion** saat RLS aktif | Semua SELECT profil gagal (error 42P17) | Ganti dengan fungsi `security definer` (`is_banned(auth.uid())`) atau kolom terpisah yang tidak bisa diubah | `[!]` KRITIS |
| C5 | Policy `programs_owner_update` `with check (status in ('draft','needs_changes'))` **memblokir** `withdraw` (pending→draft) secara aman, tapi juga memungkinkan pemilik mengubah `status` antar draft↔needs_changes secara langsung (dalam RLS); perpindahan status wajib lewat RPC | Bypass aturan transisi status | Tambahkan trigger `forbid_status_change_from_client` (cek `current_user`) atau pindahkan semua tulis ke RPC | `[!]` |
| C6 | `sources_owner_write` memakai `for all` → pemilik bisa **DELETE** sumber saat draft/needs_changes; saat program dipindah ke pending, reviewer butuh kemampuan melihat (ada) tetapi tidak disebut cara reviewer mengoreksi sumber | Kebutuhan fungsional tidak jelas | Tetapkan: reviewer koreksi sumber lewat RPC `reviewer_edit_program` yang menyentuh `sources` — perlu policy/RPC eksplisit | `[!]` |
| C7 | `reports_insert_auth` memungkinkan user login insert dengan `reporter_id = auth.uid()`, tetapi laporan anonim memakai `service_role`. Tidak ada policy/tabel untuk *rate limit fallback Postgres* yang disebut PRD §10 | Rate limit bisa gagal jika Upstash tidak dikonfigurasi | Buat tabel `rate_limit_buckets` + fungsi `check_rate_limit` (security definer) sebagai fallback | `[!]` |
| C8 | PRD FR-REV-6 *claim* 30 menit & PRD §10 menyebut "bersihkan claim" via cron; tidak ada mekanisme pelepasan claim saat reviewer logout / claim kedaluwarsa selain cron | Item bisa "nyangkut" 30 menit | RPC `claim_program` otomatis menimpa claim kedaluwarsa; cron membersihkan | `[!]` |
| C9 | `resolve_report(id, action, note)` — action `ban` pada tabel `reports` merujuk ke `set_user_banned`; tidak ada FK antara report & program yang bisa di-archive | Implementasi harus multitahap | RPC `resolve_report` memanggil helper internal (`archive_program_internal`, `set_user_banned_internal`) | `[!]` |
| C10 | `view public_programs` tidak memuat `reviewer_username`, padahal FR-DET-3 memerlukan kartu reviewer | Field hilang | Tambahkan join `profiles` untuk reviewer | `[!]` |
| C11 | Tabel `sources` tidak punya policy tulis untuk reviewer; FR-REV-4 (koreksi minor) mencakup sumber | Review macet | Implementasikan RPC `reviewer_update_source` | `[!]` |
| C12 | `site_settings` policy `using(true)` → terbaca publik; tidak ada kunci rahasia di sana (OK), tetapi `max_pending_per_day` dibaca klien bila digunakan → perlu dibaca server-side saja | Info minor | Baca setting di server; jangan ekspos ke klien kecuali `disclaimer_text` | `[!]` |
| C13 | README menyebut `pnpm test:rls`; mekanisme tes RLS (pgTAP vs skrip SQL) belum dipilih | Ambigu | **Keputusan yang diambil:** skrip Node (`scripts/test-rls.ts`) memakai `supabase` lokal + `psql`/`postgrest` atau SQL langsung; dijalankan di CI bila Supabase CLI tersedia | `[!]` |
| C14 | `README.md` menyebut "Lihat [LICENSE](LICENSE)" tanpa dekripsi; LICENSE MIT sudah ada | OK | Tidak ada aksi | `[x]` |
| C15 | SECURITY.md masih berisi `[ISI email keamanan]` | Wajib diisi pemilik | `[!]` butuh input pemilik proyek | `[!]` |
| C16 | UI_UX §6.5 menyebut "simpan draf otomatis (debounce)" — server action + client debounce rawan spam request; tidak ada rate limit untuk autosave | Beban server | Autosave hanya ke localStorage sampai tombol simpan; autosave server opsional | `[!]` |
| C17 | PRD §2 Next.js versi tidak ditentukan; dokumentasi menyebut App Router. Versi terbaru saat audit: Next 16.x, React 19.x | Pilihan versi | Pin versi stabil Next 16 + React 19 (dikonfirmasi saat Fase 1, dikunci di lockfile) | `[!]` |
| C18 | `.env.example` mencantumkan `SUPABASE_SERVICE_ROLE_KEY` (konsisten dengan aturan server-only), namun tidak ada penanda environment (`APP_ENV`) untuk membedakan local/staging/production | Tidak krusial | Tambahkan bila perlu di Fase 1 | `[ ]` |
| C19 | Tidak ada dokumentasi bagaimana *Preview deployment* mengarah ke staging Supabase; hanya disebut "jangan berbagi DB" | Risiko konfig | Dokumentasikan di DEPLOYMENT_GUIDE saat rilis | `[!]` |

### 0.3 Risiko arsitektur & keamanan (terurut prioritas)

1. **KRITIS — RLS recursion pada `profiles`** (C4): akan mematahkan seluruh pembacaan profil. Harus diperbaiki di migrasi pertama.
2. **TINGGI — Bypass transisi status via RLS `UPDATE`** (C5): pemilik bisa mengubah `status` secara langsung. Mitigasi: trigger penjaga + semua status via RPC `security definer`.
3. **TINGGI — Privilege escalation melalui trigger** (C2): `handle_new_user` harus `security definer` dengan `search_path` terkunci; tidak boleh mempercayai `raw_user_meta_data` untuk role.
4. **TINGGI — Service role di klien**: aturan keras — `lib/supabase/admin.ts` diberi `import "server-only"`; CI memindai `.next/static` untuk string `service_role`.
5. **TINGGI — SSRF & link mati**: sistem hanya menerima URL sebagai *tautan keluar* (tidak di-fetch di server pada MVP). Jika fetch ditambahkan nanti, wajib `ssrf-guard`.
6. **SEDANG — Rate limit keterbatasan Upstash**: sediakan fallback Postgres (C7) supaya situs tidak gagal jika tidak ada kredensial.
7. **SEDANG — Laporan anonim**: hash IP wajib (salt dari env), Turnstile wajib bila dikonfigurasi; tanpa Turnstile, rate-limit wajib tetap aktif. Tidak boleh menampilkan IP mentah.
8. **SEDANG — Data sensitif di teks bebas**: pemindai NIK/KK/rekening berbasis regex hanya *lapis tambahan*; UI harus mendidik, reviewer memeriksa manual (sesuai §6 prompt).
9. **SEDANG — Cache ISR + data privat**: halaman publik pakai `unstable_cache`/`revalidate` pada query; jangan pernah cache hasil query ber-scope pengguna.
10. **RENDAH — SEO/slug stabil**: slug tidak berubah setelah Verified; perlu kolom `slug` immutable + validasi regex.
11. **RENDAH — Ketergantungan tier gratis**: Supabase free bisa dijeda; dokumentasikan keep-alive.

### 0.4 Kebutuhan konfigurasi eksternal (blocker untuk phase lanjut, bukan untuk kode)

| Kebutuhan | Untuk apa | Blocker untuk |
|---|---|---|
| Proyek Supabase (dev/staging/prod) + URL & anon key | DB & Auth | Fase 3 verifikasi runtime, migrasi remote |
| GitHub OAuth App (Client ID/Secret) | Login | Fase 3 login e2e |
| `SUPABASE_SERVICE_ROLE_KEY` | Laporan anonim & cron | Fase 5 |
| Upstash Redis (opsional, ada fallback) | Rate limit | Fase 7 hardening |
| Cloudflare Turnstile (opsional, ada fallback) | Anti-bot laporan | Fase 5/7 |
| Domain produksi | OAuth redirect, SEO | Fase 11 |
| Email/kontak resmi & konfirmasi kebijakan privasi | Halaman statis | Fase 9 (konten sudah lengkap; email khusus masih menunggu pemilik) |
| Repositori GitHub (`<GITHUB_USERNAME>/AksesAI`) & izin push | Publikasi | Fase 10 |
| Akun Vercel | Deploy | Fase 11 |
| Keputusan lisensi (MIT default sudah ada) | — | Tidak ada |

---

## PHASE 1 — Setup Project & Konfigurasi Dasar

- [x] Inisialisasi Git (`main`), `.gitignore`, `.gitattributes`
- [x] `package.json` + pnpm + `pnpm-lock.yaml`
- [x] `tsconfig.json` strict, path alias `@/*`
- [x] `next.config.ts` (security headers, images allowlist)
- [x] `postcss.config.mjs`, Tailwind v4 + design tokens UI/UX
- [x] `eslint.config.mjs`, `components.json` (shadcn/ui)
- [x] Struktur folder sesuai `SYSTEM_ARCHITECTURE.md` §3
- [x] Script: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:e2e`, `test:rls`, `secret:scan`, `gen:types`
- [x] `lib/env.ts` (validasi env dengan Zod, server & client terpisah)
- [x] Buat `.env.example` final (selaras `lib/env.ts`)

> Catatan: primitif UI ditulis manual (tanpa dependensi Radix) agar jejak dependensi
> kecil. `components.json` tetap ada untuk kompatibilitas shadcn CLI.

## PHASE 2 — UI Foundation & Halaman Publik

- [x] Layout: Navbar, Footer, skip-link, container
- [x] Komponen dasar yang dipakai saja (button, input, textarea, card, badge, alert, separator, skeleton, field)
- [x] Komponen domain: `ProgramCard`, `StatusBadge`, `SourceList`, `DirectoryFilters`, `Pagination`, `EmptyState`
- [x] Homepage (FR-HOME-1..7)
- [x] Direktori `/info` + query string (FR-DIR-1..6)
- [x] Detail `/info/[slug]` (FR-DET-1..6) + `generateMetadata`
- [x] `/kategori/[slug]`
- [x] `/kontributor/[username]` (FR-PRO)
- [x] `/tentang`, `/panduan`, `/kebijakan-privasi`
- [x] `not-found.tsx`, `error.tsx`, sitemap, robots
- [~] `loading.tsx` per-route — belum ditambahkan (Suspense skeleton sudah ada di direktori)
- [x] Responsif 360/768/1280 & a11y dasar (skip-link, label, `aria-*`, dialog `<dialog>`)

> Catatan Next 16: `middleware.ts` diganti `src/proxy.ts` (konvensi baru).

## PHASE 3 — Database, Auth, Authorization

- [x] Migrasi `supabase/migrations/*` mengikuti skema (dengan perbaikan C1–C12)
- [x] Seed kategori + `site_settings`
- [x] RPC transisi status (submit/withdraw/claim/verify/reject/request_changes/reviewer_edit/mark_expired/archive/reopen/resolve_report/grant_role/revoke_role/set_user_banned/expire_due_programs/cleanup_expired_data)
- [x] Trigger append-only `moderation_logs` & `contribution_history`
- [x] RLS semua tabel (default-deny)
- [x] Tabel fallback rate limit (`rate_limit_buckets` + `check_rate_limit`)
- [x] Client Supabase browser/server/admin + `src/proxy.ts`
- [x] GitHub OAuth login → callback → session → logout (`/login`, `/auth/sign-in`, `/auth/callback`)
- [x] `getCurrentUser`, `requireRole`, guard layout per area (via `proxy.ts` + `requireRole`)
- [x] TypeScript types database (dibuat dari skema live via `supabase gen types`)
- [x] Bootstrap admin terdokumentasi (SQL manual, bukan otomatis) — lihat README
- [x] Tes RLS: visitor/member A/member B/reviewer/moderator/admin

> [!] View publik `security_invoker`: tabel `assistance_programs` sudah cukup
> dilindungi RLS; view tidak dibuat agar tidak menambah permukaan serangan.

## PHASE 4 — Contribution Workflow

- [x] Form kontribusi multi-bagian + Zod client & server (FR-CON-1..7)
- [x] Sumber 1–5 (URL, judul, tipe, primary) — tepat satu primary, otomatis bila tidak ditandai
- [x] Deteksi duplikasi `source_url_normalized` + peringatan judul (di halaman edit)
- [x] Pemindai data sensitif (NIK/KK/rekening) — menolak simpan bila terdeteksi
- [x] Draft / submit / withdraw (via RPC `submit_program` / `withdraw_program`)
- [x] `/dashboard`, `/dashboard/kontribusi`, edit, status + catatan reviewer
- [~] Riwayat kontribusi: tabel `contribution_history` terisi & teruji di DB;
      tampilan timeline di dasbor belum dibuat (status + catatan reviewer sudah tampil)
- [ ] `/dashboard/laporan` (laporan milik user) — **belum**; daftar laporan pengguna
      akan dikerjakan bersama PHASE 5
- [x] Laporan publik (FR-REP-1..2) via route handler `/api/reports` + rate limit
      + pemindaian data sensitif + Turnstile opsional (dari PHASE 2)

### Bukti verifikasi PHASE 4 (dijalankan nyata)

| Perintah / uji | Hasil |
|---|---|
| `pnpm typecheck` | 0 error |
| `pnpm lint` | 0 error, 0 warning |
| `pnpm test` | **66 tes lulus** (6 file) — 21 di antaranya skema kontribusi |
| `pnpm test:rls` | **21 tes lulus** (4 file): 12 RLS + 4 integrasi alur + 5 regresi profil |
| `next build` | Sukses; 16 route termasuk `/dashboard`, `/dashboard/kontribusi`, `/[id]`, `/baru` |
| `scripts/smoke-dashboard.mjs` | **9/9 PASS** terhadap dev server nyata: dasbor 200, empty state, form termuat, tanpa sesi → redirect, id asing → 404 |
| `scripts/smoke-mutation.mjs` | **8/8 PASS**: draf tersimpan, tampil di daftar, halaman edit memuat data, pengguna lain → 404 |

> **Dua bug produksi ditemukan & diperbaiki selama PHASE 4:**
> 1. `getCurrentUser()` memakai embed PostgREST `user_roles(role)` yang **ambigu**
>    (`user_roles` punya dua FK ke `profiles`: `user_id` dan `assigned_by`). Query
>    gagal sehingga fungsi mengembalikan `null` untuk **semua** pengguna → seluruh
>    area login tidak dapat diakses. Diperbaiki dengan `user_roles!user_id(role)`,
>    plus tes regresi `tests/integration/profile-query.test.ts`.
> 2. Skema Zod: `isoDate` menolak string kosong (form mengirim `""`) dan
>    `organizer` memakai `organizerMax` sebagai batas minimal **dan** maksimal.
>    Keduanya diperbaiki; tes unit menangkapnya.
> 3. `package.json` `test:rls` menunjuk `vitest.rls.config.ts` padahal berkasnya
>    `.mts` — skrip gagal jalan. Diperbaiki.

> Catatan kejujuran: smoke test memakai cookie sesi Supabase yang dirangkai seperti
> `@supabase/ssr` (prefix `base64-` + base64url JSON). Jalur yang diuji sama dengan
> browser; bedanya alur OAuth GitHub diganti login email/password khusus lokal.

## PHASE 5 — Reviewer & Moderation

- [x] `/review` antrean FIFO + filter klaim (semua/belum diklaim/diklaim saya) + umur tunggu
- [x] `/review/[id]` panel review + checklist + aksi (klaim, verifikasi, revisi, tolak)
- [x] Claim/release 30 menit (RPC `claim_program`; kedaluwarsa otomatis via cron)
- [x] `/moderation/reports` antrean prioritas (alasan + terlama) + filter status/alasan
- [x] Aksi moderasi (dismiss/resolve/reopen/archive/ban) + catatan wajib (RPC `resolve_report`)
- [x] `/dashboard/laporan` (laporan milik pengguna)
- [x] Cron `/api/cron/expire` + `/api/cron/cleanup` (CRON_SECRET, perbandingan konstanta-waktu)

### Bukti verifikasi PHASE 5 (dijalankan nyata)

| Perintah / uji | Hasil |
|---|---|
| `pnpm typecheck` | 0 error |
| `pnpm lint` | 0 error, 0 warning |
| `pnpm test` | **66 tes lulus** (6 file) |
| `pnpm test:rls` | **29 tes lulus** (5 file): +8 tes alur reviewer terhadap DB nyata |
| `next build` | Sukses; 24 route termasuk `/review`, `/review/[id]`, `/moderation/reports`, `/dashboard/laporan`, `/api/cron/{expire,cleanup}` |
| `scripts/smoke-staff.mjs` | **10/10 PASS**: reviewer lihat antrean & panel; member → redirect; moderator lihat laporan; reviewer ≠ moderator (terpisah); cron tanpa/salah secret → 401 |
| Cron dengan secret valid | `expire` → `{"ok":true,"expired":0}`; `cleanup` → `{"ok":true,...}` (jalur service_role terverifikasi) |

> Catatan: satu lint error nyata ditemukan & diperbaiki — `Date.now()` dipanggil saat
> render di `/review/[id]` (melanggar aturan purity React). Perhitungan status klaim
> dipindahkan ke data layer. Tes reviewer juga mengungkap aturan produk yang benar:
> kontributor baru dibatasi 3 kiriman dalam peninjauan; tes memakai kontributor baru
> per kiriman agar deterministik.

## PHASE 6 — Admin Dashboard

- [x] `/admin` statistik (program per status, antrean review, laporan terbuka, pengguna, role, kategori, cron terakhir)
- [x] `/admin/pengguna` — cari username, blokir/buka blokir (alasan wajib), kelola role
      (gabungan "users + roles" dari rencana awal)
- [x] Grant/revoke role via RPC `grant_role`/`revoke_role` — admin terakhir dilindungi DB
- [x] `/admin/kategori` — buat/ubah kategori + aktif/nonaktif via RPC `upsert_category`
- [ ] `/admin/audit-logs` (filter, read-only) — **belum**; audit log sudah terisi & teruji
      di DB, tetapi halaman penampil khusus belum dibuat
- [ ] `/admin/settings` (disclaimer, ambang rate limit, hari kedaluwarsa) — **belum**;
      RPC `update_site_setting` sudah ada & teruji di DB, UI belum

### Bukti verifikasi PHASE 6 (dijalankan nyata)

| Perintah / uji | Hasil |
|---|---|
| `pnpm typecheck` | 0 error |
| `pnpm lint` | 0 error, 0 warning |
| `pnpm test` | **66 tes lulus** (6 file) |
| `pnpm test:rls` | **39 tes lulus** (6 file): +10 tes RPC admin terhadap DB nyata |
| `next build` | Sukses; 27 route termasuk `/admin`, `/admin/pengguna`, `/admin/kategori` |
| `scripts/smoke-admin.mjs` | **10/10 PASS**: admin buka ketiga halaman (konten terverifikasi); member & reviewer → redirect; tanpa sesi → `/login` |
| `scripts/smoke-admin-mutation.mjs` | **15/15 PASS**: grant/revoke role, blokir/buka blokir (alasan <10 ditolak), buat/ubah kategori, member ditolak 42501 di lapisan RPC, aksi tercatat di audit log |
| Smoke PHASE 4–5 dijalankan ulang | Tanpa regresi (dashboard, staff, mutation: 0 gagal) |

> Catatan kejujuran: dua butir rencana PHASE 6 (`/admin/audit-logs`, `/admin/settings`)
> **belum** dibuat UI-nya. Fondasi database-nya (tabel `moderation_logs` immutable dan RPC
> `update_site_setting`) sudah ada dan teruji; halaman penampil dapat ditambahkan tanpa
> perubahan skema. Statistik admin dihitung dari query agregat `count` (bukan menarik
> seluruh baris program). Tombol cabut role admin milik sendiri dinonaktifkan di UI sebagai
> lapisan tambahan; RPC tetap penjaga utama.

## PHASE 7 — Security Hardening

- [x] CSP + security headers tanpa pelanggaran (CSP, HSTS, nosniff, DENY, Referrer-Policy,
      Permissions-Policy; `X-Powered-By` dimatikan — terverifikasi di response header)
- [x] Validasi Zod seluruh input — tambah skema untuk SEMUA Server Action staf/admin
      (`src/lib/validation/staff.ts`): UUID, enum role/aksi, batas panjang alasan/catatan
- [x] Sanitasi & normalisasi teks (sudah ada dari PHASE 2; dikonfirmasi tak ada
      `dangerouslySetInnerHTML` di `src/`)
- [x] Rate limit (Upstash + fallback Postgres) — sudah ada; jalur laporan terverifikasi
- [x] CSRF: origin check route handler (kini menolak request tanpa `Origin` pada
      production), Server Actions dilindungi Next (SameSite=Lax + origin check bawaan)
- [x] Verifikasi tidak ada `service_role` di bundle klien — **menemukan & memperbaiki
      kebocoran nyata**: skema env server ikut terbundel ke klien; sekarang dipisah ke
      `src/lib/env-server.ts` (`server-only`) + skrip `scripts/check-client-bundle.mjs`
- [x] Audit dependencies `pnpm audit` — 0 kerentanan (2 moderate dev-only diperbaiki via
      `pnpm.overrides` minimatch ≥ 11.0.1)
- [x] Secret scan sebelum publikasi (`scripts/secret-scan.mjs` — 0 temuan)
- [x] Error handling tanpa stack trace (`error.tsx` + `global-error.tsx` baru; hanya
      `digest` yang dicatat, tidak pernah pesan internal)

### Bukti verifikasi PHASE 7 (dijalankan nyata)

| Perintah / uji | Hasil |
|---|---|
| `pnpm typecheck` / `pnpm lint` | 0 error, 0 warning |
| `pnpm test` | **95 tes lulus** (7 file) — +29 tes skema validasi staf/admin |
| `pnpm test:rls` | **39 tes lulus** (6 file) |
| `pnpm audit` (prod & dev) | **0 kerentanan** setelah override minimatch |
| `node scripts/check-client-bundle.mjs` | **Bersih** — 28 chunk diperiksa, tak ada `service_role` key/literal |
| Security header (dev server nyata) | CSP, HSTS, nosniff, DENY, Referrer, Permissions terkirim; `X-Powered-By` absen |
| `next build` | Sukses |
| 5 smoke suite (dashboard/mutation/staff/admin/admin-mutation) | Semua 0 kegagalan |

> **Kebocoran yang ditemukan & diperbaiki:** `src/lib/env.ts` mencampur skema env publik
> dan server. Komponen klien (`SignOutButton`) mengimpor `clientEnv` dari modul itu,
> sehingga nama variabel `SUPABASE_SERVICE_ROLE_KEY` (bukan nilainya) ikut ter-bundel ke
> JavaScript klien. Nilai rahasia tidak pernah bocor (tidak berawalan `NEXT_PUBLIC_`),
> tetapi strukturnya salah. Skema server dipindah ke modul `server-only` terpisah.
> Skrip `check-client-bundle.mjs` mencegah regresi dan siap dipakai di CI.

> Batasan yang diakui: CSP masih memakai `'unsafe-inline'` untuk script (bootstrap Next);
> nonce per-request akan memaksa semua halaman dinamis. Kompensasi: tidak ada
> `dangerouslySetInnerHTML` dan `script-src` dibatasi `'self'` + domain Turnstile.
> Turnstile tetap opsional (rate limit berjalan tanpa itu); bila secret tidak diset di
> production, sebuah peringatan dicatat ke log agar operator menyadarinya.

## PHASE 8 — Testing & Bug Fixing

- [x] Unit: validasi Zod (kontribusi, laporan, pencarian, staf/admin), util slug/normalizeUrl,
      sensitive-scan, SSRF guard, sanitasi — **107 tes**
- [x] Integration: server action kontribusi & review + RPC admin (Supabase lokal) —
      **39 tes** di `tests/rls` + `tests/integration`
- [x] Authorization: member ≠ admin, role tidak bisa diubah sendiri
      (RLS `access-control.test.ts` + RPC `admin-rpc.test.ts` + E2E redirect per role)
- [x] RLS: seluruh skenario wajib dari brief — tercakup di `tests/rls` (lihat PHASE 4)
- [x] E2E Playwright: alur publik, kontribusi, review, moderasi, admin, responsif —
      **36 tes lulus** dalam satu kali jalan penuh
- [x] Build test (`next build` sukses, 27 rute) & responsive test (320/375/768px tanpa
      scroll horizontal)

### Bukti verifikasi PHASE 8 (dijalankan nyata)

| Perintah / uji | Hasil |
|---|---|
| `pnpm typecheck` / `pnpm lint` | 0 error, 0 warning |
| `pnpm test` | **107 tes lulus** (8 file) — +10 tes `slugify`, +2 tes regresi null |
| `pnpm test:rls` | **39 tes lulus** (6 file) |
| `pnpm exec playwright test` | **36 tes lulus** (publik 10, kontributor 4, reviewer 5, admin 3, responsif 14) |
| `next build` | Sukses — 27 rute |
| `node scripts/check-client-bundle.mjs` | Bersih (28 chunk, tak ada `service_role`) |

**Cakupan E2E (semua terhadap server & database sungguhan):**
- `e2e/public.spec.ts` — beranda, direktori, pencarian, halaman statis, login, 404,
  header keamanan, skip-link, redirect rute terproteksi tanpa sesi.
- `e2e/contributor.spec.ts` — dasbor, daftar kontribusi, **menyimpan draf lewat form nyata**
  lalu memverifikasi draf muncul di daftar, halaman laporan.
- `e2e/reviewer.spec.ts` — antrean review, **klaim item nyata**, self-review diblokir,
  member tidak bisa membuka `/review`, reviewer tidak bisa membuka `/moderation`.
- `e2e/admin.spec.ts` — ringkasan/pengguna/kategori, **pemberian role lewat UI**,
  member tidak bisa membuka `/admin`.
- `e2e/responsive.spec.ts` — 4 halaman × 3 viewport tanpa overflow horizontal.

> **Bug nyata yang ditemukan & diperbaiki lewat E2E:** `contributionFormSchema`
> menolak `null`. Klien mengirim `province: null`, `city: null`, dan tanggal `null`
> untuk cakupan nasional / field kosong, sehingga **menyimpan draf apa pun gagal**
> dengan pesan "Invalid input: expected string, received null". `.optional()` diganti
> `.nullish()` pada `optionalMultiLine`, `isoDate`, `province`, dan `city`. Dua tes
> regresi unit ditambahkan. Bug ini tidak terdeteksi oleh tes unit sebelumnya karena
> tes lama memakai string kosong `""`, bukan `null` seperti yang dikirim browser.

> **Catatan metodologi E2E:** login memakai GitHub OAuth yang tidak dapat diotomasi
> secara lokal. Uji membuat pengguna sungguhan lewat service_role (server-side saja)
> lalu menanamkan cookie sesi `@supabase/ssr` (`sb-<ref>-auth-token`, prefix `base64-`,
> dipecah per 3180 karakter) ke konteks browser Playwright. `authenticate()`
> memverifikasi `/dashboard` tidak ter-redirect, sehingga kegagalan sesi tidak
> menghasilkan uji yang menyesatkan.

> **Batasan yang diakui:** uji E2E tidak mencakup login GitHub sungguhan maupun
> callback OAuth (perlu aplikasi GitHub nyata — lihat B2). Antrean review lokal berisi
> puluhan item sisa uji sebelumnya; uji reviewer membuka panel lewat URL itemnya
> sendiri agar tidak bergantung pada urutan halaman.

## PHASE 9 — Documentation Finalization

- [x] `README.md` final — ditulis ulang lengkap: ringkasan, daftar fitur per peran, tech
      stack, prasyarat, langkah memulai, tabel environment variable (wajib vs opsional),
      setup database, setup GitHub OAuth, bootstrap admin pertama (URL benar:
      `/admin/pengguna`, bukan `/admin/roles`), testing (unit/RLS/E2E/smoke), build &
      produksi, deploy Vercel + Vercel Cron, struktur repo, bagian privasi & data yang
      tidak dikumpulkan, tabel dokumentasi, kontribusi, lisensi
- [x] `vercel.json` ditambahkan (jadwal cron `/api/cron/expire` & `/api/cron/cleanup`)
      agar klaim README tentang Vercel Cron benar-benar ada di repo
- [x] `docs/DATABASE_SCHEMA.md` sesuai migrasi (7 migrasi; RLS, RPC, trigger penjaga)
- [x] `docs/SYSTEM_ARCHITECTURE.md` sesuai struktur aktual
- [x] `docs/SECURITY.md` diperbarui: checklist "Phase 5" yang masih `[ ]` diganti
      checklist **terverifikasi** `[x]` dengan rujukan bukti; bagian pelaporan
      kerentanan tidak lagi memuat placeholder `[ISI email keamanan]` — diganti kanal
      GitHub yang benar-benar aktif + catatan terbuka bahwa email khusus belum ada
- [x] Halaman statis (`/tentang`, `/panduan`, `/kebijakan-privasi`) berisi konten
      lengkap; teks "dokumen ini sedang dalam peninjauan" pada kebijakan privasi
      diganti pernyataan berlaku yang faktual
- [x] `docs/IMPLEMENTATION_PROGRESS.md` final
- [x] `CONTRIBUTING.md` sinkron

### Bukti verifikasi PHASE 9

| Pemeriksaan | Hasil |
|---|---|
| Placeholder `[ISI]` di `src/` | **0 temuan** (hanya tersisa 1 rujukan historis di `SECURITY.md` yang menjelaskan status terbuka) |
| Klaim route di README (`/admin/pengguna`) | Diverifikasi — `/admin/roles` **tidak ada**, README versi lama salah |
| `vercel.json` | Dibuat dan valid terhadap skema Vercel |
| Klaim `dangerouslySetInnerHTML` | Diverifikasi tidak ada penggunaan di `src/` (hanya komentar di `sanitize.ts`) |
| `supabase/seed.sql` & skrip smoke di README | Diverifikasi ada |
| `scripts/check-client-bundle.mjs` & `secret-scan.mjs` | Diverifikasi ada; disebut di README |

> **Koreksi dokumentasi nyata yang ditemukan:** README versi lama menyuruh pengguna
> mengelola role lewat `/admin/roles`, tetapi rute itu tidak pernah ada — manajemen
> role berada di `/admin/pengguna`. README lama juga tidak mendokumentasikan
> `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `IP_HASH_SALT`, maupun langkah setup
> database, sehingga pengguna baru tidak akan bisa menjalankan proyek. Keduanya
> diperbaiki.
>
> `docs/DATABASE_SCHEMA.md` §7 mendokumentasikan sebuah **view `public_programs` yang
> tidak pernah dibuat** (migrasi berisi **nol** view). Bagian itu diganti penjelasan
> akurat mengapa view sengaja tidak dipakai dan bagaimana RLS
> `status in ('verified','expired')` menutup kebutuhan yang sama. Tabel
> `rate_limit_buckets` yang ada di migrasi tetapi tidak terdokumentasi kini ditambahkan
> sebagai §3.10.
>
> `docs/SYSTEM_ARCHITECTURE.md` masih menyebut `middleware.ts`; Next 16 mengganti
> namanya menjadi `src/proxy.ts` (fungsi diekspor `proxy`). Jalur file, nama helper
> (`hasAnyRole`/`getCurrentUser`, bukan `requireRole`), dan daftar direktori `lib/`
> dikoreksi sesuai kode aktual.
>
> `CONTRIBUTING.md` menyebut "pgTAP / skrip SQL" untuk tes RLS; implementasi nyata
> memakai Vitest terhadap Supabase lokal (`pnpm test:rls`). Diperbaiki.

### Pemindaian akhir dokumentasi

| Pemeriksaan | Hasil |
|---|---|
| `grep '\[ISI\]'` di `src/` | 0 temuan |
| Placeholder email keamanan | Dihapus; diganti kanal GitHub aktif + catatan terbuka |
| View yang didokumentasikan vs nyata | Dikoreksi (0 view nyata) |
| Tabel migrasi vs dokumentasi | 10 tabel, kini semua terdokumentasi (termasuk `rate_limit_buckets`) |
| Nama file proxy | `middleware.ts` → `src/proxy.ts` dikoreksi |
| Rute admin di README | `/admin/roles` → `/admin/pengguna` dikoreksi |

## PHASE 10 — GitHub Public Release

- [ ] Inisialisasi repo & remote (butuh keputusan pemilik: `<GITHUB_USERNAME>` + tautan repo)
- [x] GitHub Actions CI — `.github/workflows/ci.yml` dengan dua job:
      (1) `quality`: install → lint → typecheck → unit test → `pnpm audit` → secret scan →
      build → cek bundle klien bebas `service_role`; (2) `rls-and-e2e`: menyalakan
      Supabase lokal di runner, `db reset`, menjalankan `pnpm test:rls` + Playwright
      E2E, dan mengunggah laporan Playwright saat gagal
- [x] Secret scan tersedia & bersih (`node scripts/secret-scan.mjs`)
- [x] Cek tidak ada `.env.local`, credential, dump DB — `.env.local` gitignored,
      `.env.example` hanya berisi nama variabel kosong
- [ ] Push branch `feat/*` → PR → `main` — **belum**, menunggu tautan repo & izin
- [ ] Repo public — **belum**, menunggu pemilik

> **Status jujur:** seluruh pekerjaan yang mungkin tanpa kredensial sudah selesai.
> Workflow CI ditulis dan struktur YAML-nya divalidasi, tetapi **belum pernah
> dijalankan di GitHub Actions** (tidak ada remote). Klaim "CI hijau" tidak dibuat
> sampai pipeline benar-benar berjalan setelah repo dipublikasikan.

## PHASE 11 — Production Deployment

- [ ] Proyek Supabase staging + prod + migrasi + seed + RLS — butuh kredensial (B1/B3)
- [ ] GitHub OAuth App per environment — butuh pemilik (B2)
- [ ] Env Vercel (preview → staging; production → prod) — butuh akun Vercel (B7)
- [x] Konfigurasi Vercel Cron — `vercel.json` dengan dua jadwal (`/api/cron/expire`,
      `/api/cron/cleanup`); endpoint sudah menolak request tanpa `CRON_SECRET`
- [ ] Smoke test produksi (9 langkah DEPLOYMENT_GUIDE §7) — butuh domain live
- [ ] Verifikasi header keamanan & tidak ada error konsol di produksi — butuh domain live

> **Status jujur:** PHASE 11 **belum dikerjakan sama sekali**. Tidak ada deploy yang
> terjadi dan tidak ada URL produksi. Yang ada hanyalah kesiapan konfigurasi.

---

## Blocker yang Membutuhkan Keputusan/Credential Pemilik Proyek

| # | Blocker | Fase terdampak | Keterangan |
|---|---|---|---|
| B1 | URL & anon key Supabase (dev) | 3, 4, 5, 6, 8 | Tanpa ini runtime tidak dapat diverifikasi terhadap DB nyata |
| B2 | GitHub OAuth Client ID/Secret | 3, 8 | Login end-to-end tidak bisa diuji |
| B3 | `SUPABASE_SERVICE_ROLE_KEY` | 5, 7 | Laporan anonim, cron |
| B4 | Email keamanan & kontak resmi | 9 | Placeholder di SECURITY.md & halaman statis |
| B5 | Domain produksi | 11 | OAuth redirect, SEO |
| B6 | Izinkan push/remote GitHub (`<GITHUB_USERNAME>`) | 10, 11 | Prompt melarang push tanpa persetujuan |
| B7 | Setuju `.env.local` diisi lokal (bukan dibagikan) | 3 | Tidak ada secret di repo |

---

## Catatan Kejujuran

- PHASE 0–8 sudah diimplementasikan dan diuji terhadap Supabase lokal. Setiap centang
  `[x]` disertai bukti perintah/uji nyata di bagian "Bukti verifikasi" fase terkait.
- PHASE 10–11 (rilis GitHub publik & deploy Vercel) **tidak dapat diselesaikan** tanpa
  credential `B1–B7` dan tautan repo dari pemilik. Kode dan dokumentasi disiapkan penuh,
  tetapi klaim "production ready" tidak akan diberikan sampai deploy nyata dijalankan
  dan diverifikasi.
- Yang **belum** diverifikasi karena keterbatasan lingkungan: login GitHub OAuth
  sungguhan (B2), deploy ke Vercel (B5/B6), dan Supabase production (B1/B3). Uji E2E
  memakai sesi yang dibuat manual untuk menutupi keterbatasan ini, dan hal itu
  dinyatakan terbuka di bagian PHASE 8.
