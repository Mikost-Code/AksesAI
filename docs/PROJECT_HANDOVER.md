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
| Auth | `/login`, `/auth/sign-in` (POST), `/auth/callback` |
| Member | `/dashboard`, `/dashboard/kontribusi`, `/dashboard/kontribusi/baru`, `/dashboard/kontribusi/[id]`, `/dashboard/laporan` |
| Reviewer | `/review`, `/review/[id]` |
| Moderator | `/moderation/reports` |
| Admin | `/admin`, `/admin/pengguna`, `/admin/kategori` |
| API | `/api/reports`, `/api/cron/expire`, `/api/cron/cleanup` |

Proteksi rute: `src/proxy.ts` (pengganti `middleware.ts` di Next 16) memeriksa sesi untuk
redirect awal; **pemeriksaan otorisasi sesungguhnya** dilakukan di layout & server action
(`hasAnyRole`) dan ditegakkan ulang oleh RLS/RPC di database (defense in depth).

> Catatan: `/admin/roles`, `/admin/users`, `/admin/categories`, `/admin/audit-logs`, dan
> `/admin/settings` **tidak** diimplementasikan. Manajemen role & blokir berada di
> `/admin/pengguna`; kategori di `/admin/kategori`. Audit log dapat dibaca lewat query
> database (tidak ada UI khusus).

## 4. Roadmap Fase — Status Implementasi

Dirinci dengan bukti uji di [`IMPLEMENTATION_PROGRESS.md`](IMPLEMENTATION_PROGRESS.md).

### Phase 1 — Foundation ✅
- [x] Repo, Next.js + TypeScript strict, Tailwind, komponen UI (tanpa Radix)
- [x] Supabase lokal (Docker) + 7 migrasi (skema, RLS, RPC, trigger)
- [x] GitHub OAuth + trigger pembuatan profil (role hanya `member`)
- [x] Skema + RLS + seed kategori
- [x] CI workflow ditulis (`.github/workflows/ci.yml`) — belum dijalankan di GitHub

### Phase 2 — Public Platform ✅
- [x] Beranda, direktori + pencarian/filter, halaman detail + sumber
- [x] Profil kontributor publik
- [x] `/tentang`, `/panduan`, `/kebijakan-privasi` + disclaimer

### Phase 3 — Contribution ✅
- [x] Form kontribusi + validasi Zod + pemindai data sensitif
- [x] Dashboard member, riwayat, status
- [x] Validasi sumber (SSRF guard) & deteksi duplikasi

### Phase 4 — Moderation ✅
- [x] Antrean reviewer, klaim 30 menit, aksi review (verifikasi/revisi/tolak/kedaluwarsa)
- [x] Laporan publik + dashboard moderator
- [x] Admin: pengguna (blokir + role), kategori
- [x] Cron auto-expire & cleanup (`vercel.json`)

### Phase 5 — Production Readiness ✅ (kode) / ⏳ (deploy)
- [x] Security hardening: validasi Zod menyeluruh, CSP & header, audit 0 kerentanan,
      bundle klien bebas `service_role`, error tanpa stack trace
- [x] Tes berlapis: 107 unit, 39 RLS/integrasi, 36 E2E (termasuk responsif)
- [x] Error handling, halaman 404/500
- [x] SEO (metadata, sitemap, robots)
- [ ] **Deploy & smoke test produksi** — belum, butuh kredensial pemilik

## 5. Konvensi Penting

- Transisi status hanya lewat RPC (lihat DATABASE_SCHEMA).
- Role hanya dikelola admin; GitHub login ≠ role khusus.
- Dokumen proyek harus konsisten; jika ada konflik, urutan prioritas: **PRD.md → SECURITY.md → dokumen lain**.

## 6. Hal yang Perlu Diputuskan Pemilik Proyek Sebelum Rilis

| Item | Catatan |
|---|---|
| Nama & kontak resmi (email) untuk halaman tentang/kebijakan privasi | Konten sudah lengkap; email khusus belum ada (kanal GitHub dipakai) |
| Domain produksi | Diperlukan untuk OAuth redirect & SEO |
| Tim reviewer awal (min. 2 orang) | Agar aturan "tidak review milik sendiri" tetap workable |
| Lisensi | Default MIT; ganti bila perlu |
| Konten kebijakan privasi final | Ditinjau pihak yang kompeten secara hukum |

## 7. Definition of Done MVP

Lihat PRD bagian 11 dan checklist acceptance criteria di handover awal: pencarian & detail berfungsi, login GitHub, kontribusi bersumber, bukan otomatis Verified, review manual, profil publik, riwayat tercatat, pelaporan, hak akses role benar, tidak ada data sensitif, responsif, tidak ada secret di repo, **situs berjalan tanpa AI provider**.
