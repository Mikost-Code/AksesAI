# Security & Privacy — BantuWarga

## 1. Data yang DILARANG Dikumpulkan/Disimpan

NIK · Nomor KK · Foto KTP · Nomor rekening · Data pribadi penerima bantuan · Daftar identitas penerima bantuan · informasi sensitif lain yang tidak dibutuhkan platform.

**Penerapan teknis:**
- Form kontribusi & laporan menampilkan peringatan: "Jangan menulis data pribadi (NIK, KK, rekening, KTP)".
- `lib/security/sensitive-scan.ts` menolak teks yang cocok pola 16 digit NIK, 16 digit KK, dan urutan 10–16 digit yang terdeteksi sebagai nomor rekening/kartu (dengan toleransi spasi/tanda hubung). Pesan penolakan bersifat edukatif dan tidak mengulang nilai yang terdeteksi.
- Tidak ada fitur unggah dokumen pribadi. Jika Storage dipakai kelak, hanya gambar/tangkapan layar sumber publik, dengan batas di bagian 6.
- Data pengguna yang disimpan: id akun, username/avatar/URL/bio GitHub, role, kontribusi. **Email tidak disalin ke `profiles` dan tidak ditampilkan.**
- IP pelapor hanya disimpan sebagai hash bergaram (`reporter_ip_hash`).

## 2. Autentikasi & Manajemen Role

- GitHub OAuth via Supabase Auth; sesi dalam cookie httpOnly, secure, SameSite=Lax.
- Login GitHub hanya memberi `member`. Role lain hanya lewat RPC `grant_role` oleh Admin; tercatat di `moderation_logs`.
- Admin pertama dibuat lewat SQL manual oleh pemilik proyek (README). Wajib minimal 2 Admin untuk redundansi saat produksi; Admin terakhir tidak dapat dicabut.
- Anjurkan Admin/Reviewer/Moderator mengaktifkan 2FA di GitHub; dokumentasikan di panduan internal.
- Role selalu dibaca dari database di server, bukan dari token/klaim klien.

## 3. Otorisasi

Tiga lapis: `middleware.ts` → `requireRole()` di server action/route handler → **RLS + RPC**. Lihat DATABASE_SCHEMA bagian 5–6. Aturan khusus: reviewer tidak dapat memverifikasi/menolak kontribusinya sendiri; Verified tidak dapat diedit pemilik.

## 4. Validasi & Sanitasi Input

- Zod di server untuk semua input (form, query string, parameter route).
- Teks pengguna dirender sebagai teks (React meng-escape secara default). **Jangan** memakai `dangerouslySetInnerHTML` untuk konten pengguna. Jika perlu Markdown, gunakan renderer dengan sanitizer ketat (allowlist, tanpa HTML mentah).
- Normalisasi spasi/Unicode; batasi panjang tiap field; tolak karakter kontrol.
- **SQL injection:** gunakan client Supabase/parameterized query; fungsi SQL dinamis dilarang kecuali memakai `format(%I/%L)`.
- Slug dibuat server-side dari input terkurung; parameter `[slug]`/`[username]` divalidasi regex.

## 5. Keamanan URL Sumber

- Hanya `http`/`https`. Tolak `javascript:`, `data:`, `file:`, dsb.
- Tolak host `localhost`, IP privat/loopback/link-local (SSRF) bila server pernah melakukan fetch (mis. pengecekan link). Pengecekan link, jika diimplementasikan, wajib memakai ssrf-guard, timeout pendek, batas ukuran respons, dan tanpa mengikuti redirect ke alamat privat.
- Tautan keluar: `target="_blank" rel="noopener noreferrer nofollow ugc"`.
- Tampilkan domain sumber di UI agar pengguna dapat menilai kewajaran; reviewer memeriksa tiruan domain (typosquatting) dan pemendek URL.

## 6. Upload File (jika diaktifkan)

Default MVP: **tidak ada upload.** Jika diaktifkan: allowlist `image/png|jpeg|webp`, maks. 2 MB, verifikasi magic bytes, nama file diacak, bucket privat dengan RLS, tanpa eksekusi, hapus EXIF.

## 7. Rate Limiting & Anti-Penyalahgunaan

| Endpoint/aksi | Batas (default, dapat diatur di settings) |
|---|---|
| Login | Mengikuti limit Supabase Auth + 10/menit/IP di callback |
| Submit kontribusi | 10/hari/user; user baru maks. 3 Pending bersamaan |
| Laporan | 5/jam/IP-hash; 1 laporan/program/IP-hash/24 jam; Turnstile untuk anonim |
| Aksi admin/moderator | 60/menit/user |
| Pencarian | 60/menit/IP |
| Cron | Hanya dengan header `Authorization: Bearer $CRON_SECRET` |

Implementasi: Upstash Ratelimit (sliding window). Respons 429 dengan pesan ramah.

## 8. Security Headers (next.config / middleware)

```text
Content-Security-Policy: default-src 'self'; img-src 'self' https://avatars.githubusercontent.com data:;
  script-src 'self' 'nonce-<nonce>' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com;
  connect-src 'self' https://*.supabase.co; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```
Sesuaikan CSP setelah implementasi dan uji tanpa pelanggaran. Server Actions Next.js dilindungi pemeriksaan origin bawaan; pertahankan.

## 9. Rahasia & Konfigurasi

- Rahasia hanya di environment variables Vercel/`.env.local`; `.env*` (kecuali `.env.example`) di `.gitignore`.
- `SUPABASE_SERVICE_ROLE_KEY` hanya di server; modul `lib/supabase/admin.ts` ditandai `import "server-only"`.
- Aktifkan GitHub **secret scanning + push protection**; tambahkan pre-commit hook (gitleaks) bila memungkinkan.
- Pisahkan proyek Supabase dev dan prod; rotasi kunci jika ada anggota keluar.
- Dependensi: `pnpm audit` di CI, Dependabot aktif, pin versi lockfile.

## 10. Audit & Logging

- `moderation_logs` dan `contribution_history` bersifat append-only (trigger + tanpa policy tulis klien).
- Catat: verifikasi, penolakan, permintaan revisi, perubahan role, blokir, arsip, perubahan kategori & setting, aksi cron.
- Jangan mencatat secret, token, atau konten sensitif ke log aplikasi.

## 11. Privasi Pengguna

- Profil publik menampilkan hanya data GitHub publik + statistik kontribusi.
- Halaman `/kebijakan-privasi` wajib menjelaskan: data yang disimpan, tujuan, pihak ketiga (Supabase, Vercel, GitHub, Upstash, Cloudflare Turnstile), retensi, dan cara menghubungi untuk penghapusan.
- Penghapusan akun: profil dianonimkan (`is_deleted`, username diganti `kontributor-dihapus-xxxx`, avatar/bio dihapus); kontribusi Verified tetap ada demi integritas informasi.
- Retensi: hash IP laporan dihapus setelah 90 hari (cron); log audit disimpan minimal 1 tahun.
- Teks kebijakan final sebaiknya ditinjau pihak yang kompeten secara hukum (UU PDP).

## 12. Pelaporan Kerentanan

Kanal pelaporan resmi saat ini adalah **halaman issue privat/repositori GitHub resmi proyek** (lihat `README.md`). Pelapor **tidak** membuka issue publik berisi detail teknis; gunakan fitur *private vulnerability reporting* GitHub bila tersedia.

Tim merespons < 3 hari kerja dan memperbaiki sesuai tingkat keparahan. Jangan menguji pada data pengguna lain, jangan mengakses data yang bukan milik Anda, dan jangan melakukan uji beban/DDoS.

> **Belum final (menunggu pemilik proyek):** alamat email keamanan khusus. Setelah tersedia, ganti paragraf di atas dengan alamat tersebut dan perbarui `SECURITY.md` serta `/kebijakan-privasi`. Sampai itu diisi, jangan mengarang alamat email — kanal GitHub di atas adalah jalur yang benar-benar aktif.

## 13. Checklist Security Review

Status di bawah ini **diverifikasi nyata** (bukan rencana) — lihat
`docs/IMPLEMENTATION_PROGRESS.md` PHASE 4, 5 & 7 untuk perintahnya.

- [x] RLS aktif di semua tabel; tes per role lulus (`pnpm test:rls` — 39 tes)
- [x] Tidak ada policy tulis untuk `user_roles`, `moderation_logs`, `contribution_history`
      (ditambah trigger penjaga yang menolak perubahan kolom status/istimewa secara langsung)
- [x] Tidak ada `service_role` di bundle klien (`scripts/check-client-bundle.mjs` — 28 chunk bersih)
- [x] Reviewer tidak bisa verifikasi milik sendiri; eskalasi role tidak mungkin
      (RLS + RPC + uji E2E self-review)
- [x] Rate limit berlapis (Upstash → Postgres fallback); Turnstile opsional dengan
      peringatan log bila tidak diset di production
- [x] CSP & header lain terpasang; tidak ada `X-Powered-By` (diverifikasi lewat response
      header dan uji E2E)
- [x] XSS: tidak ada `dangerouslySetInnerHTML` di `src/`; React meng-escape semua teks
- [x] Pemindai data sensitif menolak contoh NIK/KK/rekening (`tests/unit/sensitive-scan.test.ts`)
- [x] Tidak ada secret di riwayat git (`scripts/secret-scan.mjs` — 0 temuan)
- [x] `pnpm audit` tanpa temuan (0 kerentanan, termasuk dev)
- [x] Halaman error tidak membocorkan detail teknis (`error.tsx`, `global-error.tsx`)
- [x] Cron endpoint menolak tanpa `CRON_SECRET` (perbandingan konstanta-waktu)

> Sisa yang **tidak dapat** diverifikasi di lingkungan lokal: uji beban/DDoS,
> pemindaian header pada domain produksi, dan uji OAuth GitHub sungguhan. Semua
> membutuhkan deploy nyata (lihat `docs/DEPLOYMENT_GUIDE.md`).
