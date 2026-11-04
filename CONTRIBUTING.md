# Panduan Kontribusi Kode — AksesAI

Terima kasih sudah membantu membangun AksesAI. Dokumen ini untuk **kontribusi kode dan dokumentasi**. Untuk kontribusi informasi bansos, lihat halaman `/panduan` di aplikasi.

## Prinsip

1. Ikuti [PRD.md](PRD.md). Fitur di luar ruang lingkup harus dievaluasi dampaknya terhadap MVP lewat issue terlebih dahulu.
2. **Dilarang** menambahkan chatbot, AI Assistant, AI verifikasi, atau integrasi AI runtime ke website.
3. **Dilarang** mengumpulkan data sensitif (NIK, KK, foto KTP, rekening, data penerima bantuan).
4. Keamanan dan RLS bukan opsional: setiap tabel baru wajib punya kebijakan RLS dan tes.

## Alur Kerja Git

- Branch utama: `main` (terproteksi, tanpa push langsung). Branch kerja dari `main`:
  - `feat/<ringkas>`, `fix/<ringkas>`, `docs/<ringkas>`, `chore/<ringkas>`
- Commit mengikuti **Conventional Commits**: `feat(review): tambah claim antrean`
- Satu PR = satu tujuan. Usahakan < 400 baris perubahan.
- PR wajib: deskripsi, referensi FR-ID dari PRD, screenshot untuk perubahan UI, hasil tes, dan minimal **1 approval**. PR yang mengubah migrasi/RLS/auth wajib **2 approval**.
- Gunakan *squash merge*.

## Setup Lokal

Lihat [README.md](README.md). Jangan commit `.env.local`.

## Standar Kode

- TypeScript `strict`; hindari `any`.
- Validasi semua input server dengan Zod; jangan percaya validasi klien.
- Komponen UI memakai shadcn/ui + Tailwind; ikuti [UI_UX_GUIDELINE](docs/UI_UX_GUIDELINE.md).
- Query database lewat client Supabase dengan RLS aktif. `service_role` hanya di kode server yang memang membutuhkannya dan ditandai komentar `// SERVICE_ROLE: alasan`.
- Perubahan status program **hanya** lewat fungsi RPC yang didefinisikan di [DATABASE_SCHEMA](docs/DATABASE_SCHEMA.md).
- Penamaan: file `kebab-case`, komponen `PascalCase`, tabel/kolom `snake_case`.
- Teks UI dalam Bahasa Indonesia, nada netral dan sopan.

## Database

- Semua perubahan skema melalui file migrasi di `supabase/migrations/` (format `YYYYMMDDHHMMSS_deskripsi.sql`). Jangan ubah skema manual di produksi.
- Migrasi harus idempotent bila memungkinkan dan menyertakan RLS + indeks.
- Perbarui `docs/DATABASE_SCHEMA.md` pada PR yang sama.

## Pengujian

| Jenis | Alat | Kapan wajib |
|---|---|---|
| Unit | Vitest (jsdom) | Logika validasi, util, transisi status |
| RLS & integrasi | Vitest terhadap Supabase lokal (`pnpm test:rls`, kebutuhan Docker) | Setiap tabel/kebijakan baru, per role |
| E2E | Playwright | Alur kritis: cari, login, kontribusi, review, laporan |
| A11y | axe + Lighthouse (manual) | Halaman baru |

Checklist sebelum PR: `pnpm lint && pnpm typecheck && pnpm test`. Bila mengubah
migrasi/RLS, jalankan juga `pnpm test:rls`. Bila mengubah alur pengguna, jalankan
`pnpm test:e2e`.

## Keamanan Rahasia

- Setiap anggota memakai API key / kredensial **miliknya sendiri**.
- Jangan commit secret. Aktifkan *secret scanning* & *push protection* di GitHub.
- Jika secret bocor: **revoke segera**, buat ulang, lalu laporkan ke maintainer.
- Kerentanan keamanan: jangan buka issue publik; ikuti [SECURITY.md](docs/SECURITY.md) bagian pelaporan.

## Penggunaan Alat AI (developer)

Boleh memakai OpenCode + 9Router ([AI_DEVELOPMENT_SETUP](docs/AI_DEVELOPMENT_SETUP.md)). Kode hasil AI tetap tanggung jawab penulis PR: baca, pahami, dan uji sebelum diajukan. Jangan menempelkan data pengguna atau secret ke prompt.

## Definition of Done

- [ ] Memenuhi FR terkait & acceptance criteria
- [ ] Tes relevan lulus, RLS diuji
- [ ] Responsif & aksesibel
- [ ] Tidak ada secret/log sensitif
- [ ] Dokumentasi diperbarui
- [ ] Di-review dan disetujui
