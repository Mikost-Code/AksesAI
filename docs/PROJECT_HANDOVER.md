# Project Handover — BantuWarga

Dokumen serah terima ringkas untuk tim pengembang. Detail kebutuhan ada di [PRD.md](../PRD.md); dokumen ini adalah peta jalan dan checklist.

## 1. Ringkasan Proyek

| | |
|---|---|
| Nama | BantuWarga |
| Kategori | Platform informasi bansos berbasis kontribusi komunitas |
| Bahasa | Bahasa Indonesia |
| Stack | Next.js, TypeScript, Tailwind, shadcn/ui, Supabase (Postgres + Auth GitHub), Vercel |
| Pengguna | Masyarakat umum, kontributor, reviewer, moderator, admin |

## 2. Prinsip Produk (tidak dapat ditawar)

1. Tidak ada AI Assistant/chatbot di website.
2. Tidak ada AI untuk verifikasi otomatis atau penentuan kelayakan.
3. Semua informasi berasal dari kontribusi dan sumber yang dapat diperiksa.
4. Verifikasi dilakukan manusia (reviewer).
5. Identitas kontributor transparan lewat profil publik.
6. Pengguna dapat melaporkan informasi salah/kedaluwarsa.
7. Tidak mengumpulkan data sensitif penerima bantuan.
8. BantuWarga bukan pemerintah/penyalur/penentu kelayakan.

## 3. Rute Aplikasi

| Area | Rute |
|---|---|
| Publik | `/`, `/bansos`, `/bansos/[slug]`, `/kategori/[slug]`, `/kontributor/[username]`, `/tentang`, `/panduan`, `/kebijakan-privasi` |
| Auth | `/login`, `/auth/callback` |
| Member | `/dashboard`, `/dashboard/kontribusi`, `/dashboard/kontribusi/buat`, `/dashboard/kontribusi/[id]/edit`, `/dashboard/laporan` |
| Reviewer | `/review`, `/review/[id]` |
| Moderator | `/moderation`, `/moderation/reports` |
| Admin | `/admin`, `/admin/users`, `/admin/roles`, `/admin/categories`, `/admin/audit-logs`, `/admin/settings` |

Proteksi rute: `middleware.ts` memeriksa sesi + role; pemeriksaan ulang wajib di server action/route handler dan RLS (defense in depth).

## 4. Roadmap Fase

### Phase 1 — Foundation
- [ ] Repository, branch protection, CI (lint, typecheck, test)
- [ ] Next.js + TypeScript, Tailwind, shadcn/ui
- [ ] Proyek Supabase (dev & prod terpisah)
- [ ] GitHub OAuth + trigger pembuatan profil
- [ ] Migrasi skema + RLS + seed kategori

### Phase 2 — Public Platform
- [ ] Homepage (FR-HOME)
- [ ] Direktori + search/filter (FR-DIR)
- [ ] Detail (FR-DET)
- [ ] Profil kontributor (FR-PRO)
- [ ] `/tentang`, `/panduan`, `/kebijakan-privasi` + disclaimer

### Phase 3 — Contribution
- [ ] Form kontribusi + validasi (FR-CON)
- [ ] Dashboard member, riwayat, status
- [ ] Validasi sumber, deteksi duplikasi, pemindai data sensitif

### Phase 4 — Moderation
- [ ] Dashboard reviewer, claim, aksi review (FR-REV)
- [ ] Sistem laporan + dashboard moderator (FR-REP, FR-MOD)
- [ ] Admin: user, role, kategori, audit log (FR-ADM)
- [ ] Cron auto-expire

### Phase 5 — Production Readiness
- [ ] Security review & tes RLS semua role
- [ ] Responsif & aksesibilitas
- [ ] Error handling, halaman 404/500
- [ ] Optimasi performa & SEO
- [ ] Deployment & smoke test produksi

## 5. Konvensi Penting

- Transisi status hanya lewat RPC (lihat DATABASE_SCHEMA).
- Role hanya dikelola admin; GitHub login ≠ role khusus.
- Dokumen proyek harus konsisten; jika ada konflik, urutan prioritas: **PRD.md → SECURITY.md → dokumen lain**.

## 6. Hal yang Perlu Diputuskan Pemilik Proyek Sebelum Rilis

| Item | Catatan |
|---|---|
| Nama & kontak resmi (email) untuk halaman tentang/kebijakan privasi | Placeholder `[ISI]` di konten |
| Domain produksi | Diperlukan untuk OAuth redirect & SEO |
| Tim reviewer awal (min. 2 orang) | Agar aturan "tidak review milik sendiri" tetap workable |
| Lisensi | Default MIT; ganti bila perlu |
| Konten kebijakan privasi final | Ditinjau pihak yang kompeten secara hukum |

## 7. Definition of Done MVP

Lihat PRD bagian 11 dan checklist acceptance criteria di handover awal: pencarian & detail berfungsi, login GitHub, kontribusi bersumber, bukan otomatis Verified, review manual, profil publik, riwayat tercatat, pelaporan, hak akses role benar, tidak ada data sensitif, responsif, tidak ada secret di repo, **situs berjalan tanpa AI provider**.
