# System Architecture — BantuWarga

## 1. Gambaran Umum

```text
Browser ──HTTPS──> Vercel (Next.js App Router)
                     ├─ Server Components / ISR   → Supabase (anon key + sesi pengguna, RLS)
                     ├─ Server Actions / Route Handlers
                     │     ├─ Zod validation, rate limit (Upstash), Turnstile
                     │     └─ Supabase RPC (security definer) / service_role bila wajib
                     └─ Vercel Cron → /api/cron/* (CRON_SECRET)
Supabase: Postgres (RLS) · Auth (GitHub OAuth) · Storage (opsional)
```

Tidak ada komponen AI pada runtime.

## 2. Prinsip

1. **Defense in depth:** `proxy.ts` → layout/server action → RLS/RPC. Tidak boleh bergantung pada satu lapis.
2. **Server sebagai sumber kebenaran:** validasi klien hanya UX.
3. **Least privilege:** klien memakai anon key + sesi; `service_role` hanya server, dipakai minimal.
4. **Mutasi status terpusat** di RPC agar atomik dan selalu tercatat.
5. **Publik cepat:** halaman publik di-cache (ISR) dan di-revalidate saat status berubah.

## 3. Struktur Direktori `src/`

```text
src/
├── app/
│   ├── (public)/            # /, /bansos, /bansos/[slug], /kategori/[slug], /kontributor/[username], /tentang, /panduan, /kebijakan-privasi
│   ├── (auth)/login, auth/callback/route.ts
│   ├── dashboard/           # member
│   ├── review/              # reviewer
│   ├── moderation/          # moderator
│   ├── admin/               # admin
│   ├── api/
│   │   ├── reports/route.ts         # laporan anonim (Turnstile + rate limit)
│   │   └── cron/expire/route.ts     # auto-expire (CRON_SECRET)
│   ├── sitemap.ts  robots.ts  not-found.tsx  error.tsx
├── components/ui/           # shadcn/ui
├── components/              # komponen domain (ProgramCard, StatusBadge, SourceList, ...)
├── lib/
│   ├── supabase/            # server.ts, client.ts, admin.ts (service_role, server-only)
│   ├── auth/                # getSession, requireRole
│   ├── validation/          # skema Zod
│   ├── security/            # sanitize, sensitive-scan, ssrf-guard, rate-limit, timing-safe
│   ├── programs/            # query, review, detail (data layer halaman publik)
│   ├── admin/               # data layer area admin
│   └── constants/           # label status, teks UI (Bahasa Indonesia)
│   ├── env.ts               # env publik (NEXT_PUBLIC_*)
│   ├── env-server.ts        # env rahasia (server-only)
│   ├── slug.ts  utils.ts
├── proxy.ts                 # pengganti middleware.ts di Next 16
└── types/
```

## 4. Autentikasi & Otorisasi

- Supabase Auth, provider GitHub. Callback `/auth/callback` menukar kode → sesi (cookie httpOnly via `@supabase/ssr`).
- Trigger `handle_new_user` membuat `profiles` + role `member` (username unik dijamin
  trigger, role lain tidak pernah dibuat otomatis).
- `hasAnyRole`/`hasRole`/`getCurrentUser` (`src/lib/auth/session.ts`) dipakai di layout &
  server action; role dibaca dari `user_roles` di server (bukan dari klaim klien).
- **`src/proxy.ts`** (Next 16 mengganti nama `middleware.ts` → `proxy.ts`, fungsi
  diekspor sebagai `proxy`): redirect ke `/login?next=` untuk rute terproteksi; **bukan**
  satu-satunya pemeriksaan — layout & RPC tetap memeriksa peran.
- Akun `is_banned`: ditolak pada RPC/policy.

## 5. Alur Utama

### 5.1 Kontribusi → Verifikasi
```text
Member isi form → simpan Draft (RLS: owner)
 → submit_program (RPC: validasi, duplikasi, rate limit) → Pending
Reviewer: claim_program → periksa sumber
   ├─ request_changes(reason) → Needs Changes → Member revisi → submit lagi
   ├─ reject_program(reason)  → Rejected
   └─ verify_program          → Verified → revalidate cache + tampil publik
Cron harian: expire_due_programs → Expired
```

### 5.2 Laporan
```text
Pengunjung → form laporan → POST /api/reports
  (Turnstile → rate limit IP-hash → validasi Zod → insert)
→ /moderation/reports (prioritas: dugaan_penipuan)
→ resolve_report: dismiss | reopen_for_review | archive_program | ban | resolve
→ semua aksi → moderation_logs
```

## 6. Caching & Performa

- `/`, `/bansos`, `/bansos/[slug]`: ISR (`revalidate` 300 dtk) + `revalidatePath/Tag` pada verify/expire/archive.
- Halaman dashboard/review/moderation/admin: dinamis, tanpa cache publik.
- Pagination offset (12/halaman); untuk skala besar pertimbangkan keyset.
- Gambar: `next/image`, avatar GitHub di-allowlist di `next.config`.
- Indeks sesuai DATABASE_SCHEMA; pantau query lambat.

## 7. Error Handling

- Server action mengembalikan objek hasil terstruktur `{ ok, error: { code, message } }`; pesan ramah pengguna dalam Bahasa Indonesia, detail teknis hanya di log.
- `error.tsx` dan `not-found.tsx` per segmen penting; jangan bocorkan stack trace.
- Log error server (Vercel logs); pertimbangkan Sentry (tanpa PII).

## 8. Konfigurasi Next.js yang Wajib

- Security headers (lihat SECURITY.md): CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, frame-ancestors.
- `images.remotePatterns` hanya `avatars.githubusercontent.com`.
- Variabel `NEXT_PUBLIC_*` hanya untuk nilai yang memang publik.

## 9. Observabilitas

| Apa | Dimana |
|---|---|
| Error aplikasi | Vercel logs / Sentry |
| Aksi sensitif | `moderation_logs` |
| Perubahan konten | `contribution_history` |
| Cron | Log Vercel + entri sistem di `moderation_logs` |

## 10. Keputusan Terbuka yang Sudah Dikunci

Lihat PRD bagian 10. Perubahan terhadap keputusan tersebut harus melalui PR yang memperbarui PRD dan dokumen ini.
