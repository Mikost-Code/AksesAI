# PRD — BantuWarga

**Versi:** 1.0 (Final untuk MVP)
**Bahasa produk:** Bahasa Indonesia
**Status:** Siap dikembangkan

---

## 1. Ringkasan

BantuWarga adalah platform informasi bantuan sosial (bansos) berbasis kontribusi komunitas. Masyarakat dapat mencari informasi bansos, dan pengguna terdaftar dapat menyumbangkan informasi yang mereka temukan. Setiap kontribusi diperiksa manual oleh reviewer sebelum berstatus **Verified**.

**BantuWarga bukan lembaga pemerintah, bukan penyalur bansos, dan bukan penentu kelayakan penerima bantuan.**

## 2. Masalah & Peluang

| Masalah | Dampak |
|---|---|
| Informasi bansos tersebar di banyak situs, akun media sosial, dan pengumuman lokal | Masyarakat sulit menemukan program yang relevan |
| Banyak hoaks dan penipuan mengatasnamakan bansos | Risiko kerugian bagi masyarakat |
| Informasi cepat kedaluwarsa tanpa penanda | Warga membuang waktu pada program yang sudah tutup |
| Tidak ada jejak siapa yang membagikan informasi | Sulit menilai kredibilitas |

**Peluang:** satu direktori dengan sumber yang bisa diperiksa, kontributor yang transparan, verifikasi oleh manusia, dan penanda kedaluwarsa yang jelas.

## 3. Tujuan & Non-Tujuan

### Tujuan (MVP)
1. Pengunjung dapat mencari, memfilter, dan membuka informasi bansos terverifikasi.
2. Pengguna dapat berkontribusi lewat login GitHub dengan sumber yang dapat diperiksa.
3. Reviewer dapat memeriksa, meminta revisi, menyetujui, atau menolak dengan alasan.
4. Pengunjung dapat melaporkan informasi bermasalah dan moderator dapat menanganinya.
5. Seluruh perubahan penting tercatat (audit log + riwayat kontribusi).
6. Tidak ada data sensitif penerima bantuan yang dikumpulkan.

### Non-Tujuan (di luar MVP, tidak boleh dibangun tanpa evaluasi)
- Chatbot / AI Assistant / AI verifikasi / AI penentu kelayakan di dalam website.
- Pendaftaran atau penyaluran bansos.
- Pengecekan status penerima (cek NIK, KK, dsb.).
- Notifikasi push/email massal, aplikasi mobile native, komentar publik, voting/like.
- Pembayaran atau donasi.

## 4. Persona & Role

| Role | Deskripsi | Cara memperoleh |
|---|---|---|
| Visitor | Pengunjung tanpa login | Default |
| Member/Contributor | Login via GitHub | Otomatis saat pertama login |
| Reviewer | Memeriksa kontribusi | Diberikan Admin |
| Moderator | Menangani laporan & penyalahgunaan | Diberikan Admin |
| Admin | Mengelola user, role, kategori, konfigurasi | Seed awal oleh pemilik proyek, lalu oleh Admin lain |

**Aturan role:**
- Login GitHub **hanya** memberi role Member. Role lain hanya lewat `/admin/roles`.
- Satu user dapat memiliki lebih dari satu role (mis. Reviewer + Moderator).
- Reviewer **tidak boleh** memverifikasi kontribusi miliknya sendiri.
- Admin tidak dapat mencabut role Admin terakhir (minimal 1 Admin aktif).

### Matriks hak akses

| Aksi | Visitor | Member | Reviewer | Moderator | Admin |
|---|:-:|:-:|:-:|:-:|:-:|
| Lihat bansos Verified/Expired | ✅ | ✅ | ✅ | ✅ | ✅ |
| Lihat profil kontributor | ✅ | ✅ | ✅ | ✅ | ✅ |
| Kirim laporan | ✅* | ✅ | ✅ | ✅ | ✅ |
| Buat/edit kontribusi sendiri (Draft/Needs Changes) | ❌ | ✅ | ✅ | ✅ | ✅ |
| Antrean review & aksi review | ❌ | ❌ | ✅ | ❌ | ✅ |
| Antrean laporan & aksi moderasi | ❌ | ❌ | ❌ | ✅ | ✅ |
| Kelola user, role, kategori, setting | ❌ | ❌ | ❌ | ❌ | ✅ |
| Lihat audit log | ❌ | ❌ | ❌ | ❌ | ✅ |

\* Laporan anonim dibatasi rate limit dan verifikasi anti-bot.

## 5. Aturan Bisnis Kunci

### 5.1 Status kontribusi

`Draft` → `Pending` → (`Needs Changes` ↔ `Pending`) → `Verified` | `Rejected`
`Verified` → `Expired` | `Archived` · `Expired` → `Archived` · `Rejected` → `Archived`

| Status | Publik? | Keterangan |
|---|---|---|
| Draft | Tidak | Hanya terlihat pemilik |
| Pending | Tidak | Menunggu reviewer |
| Needs Changes | Tidak | Reviewer meminta revisi, wajib ada alasan |
| Verified | **Ya** | Diperiksa reviewer berdasarkan sumber |
| Rejected | Tidak | Wajib ada alasan; pemilik dapat melihat alasan |
| Expired | Ya (label "Kedaluwarsa") | Otomatis saat `end_date` lewat, atau ditandai reviewer |
| Archived | Tidak (URL menampilkan 404 / halaman arsip) | Disembunyikan dari direktori |

### 5.2 Edit kontribusi
- Pemilik boleh mengedit saat **Draft** dan **Needs Changes**. Setiap edit tercatat di `contribution_history`.
- Saat **Pending**, pemilik tidak bisa mengedit (hindari perubahan saat diperiksa); boleh menarik kembali ke Draft.
- Pemilik **tidak dapat** mengedit langsung kontribusi **Verified**. Perbaikan diajukan lewat laporan "Informasi tidak akurat"; reviewer yang memperbarui, dan perubahan dicatat dengan `previous_data` dan `new_data`.

### 5.3 Verifikasi
- Verified berarti: reviewer sudah memeriksa informasi terhadap sumber yang tersedia. **Bukan** jaminan pemerintah dan **bukan** jaminan bantuan masih tersedia. Disclaimer ini wajib tampil di halaman detail dan `/tentang`.
- Reviewer wajib mengisi alasan untuk **Needs Changes** dan **Rejected**.
- Setiap program minimal 1 sumber; sumber utama (`is_primary`) dianjurkan berupa situs/akun resmi penyelenggara.
- Kolom yang tidak tersedia di sumber (persyaratan, jadwal) **dibiarkan kosong**, tidak boleh dikarang. UI menampilkan "Tidak tercantum pada sumber".

### 5.4 Deteksi duplikasi
- Sumber dengan `source_url` ternormalisasi yang sama pada program non-Archived/non-Rejected → ditolak oleh validasi dengan pesan "Informasi dengan sumber ini sudah ada" + tautan ke entri yang ada.
- Judul yang mirip (trigram ≥ 0.6) pada wilayah yang sama → peringatan (tidak memblokir); reviewer memutuskan.

### 5.5 Kedaluwarsa
- Job terjadwal harian menandai program Verified dengan `end_date < hari ini` menjadi **Expired**.
- Halaman beranda menampilkan "Segera kedaluwarsa" = Verified dengan `end_date` dalam 14 hari ke depan.

### 5.6 Profil publik kontributor
- Tampil: avatar, username, link GitHub, bio (jika ada), tanggal bergabung, total kontribusi (non-Draft), total Verified, daftar kontribusi **yang publik** (Verified/Expired) beserta statusnya.
- Kontribusi Pending/Rejected/Draft hanya terlihat pemilik di `/dashboard/kontribusi`.
- Tidak menampilkan email atau data sensitif.

### 5.7 Akun
- Pengguna yang diblokir (`is_banned`) tidak dapat membuat kontribusi/laporan; kontribusi Verified yang sudah ada tetap tampil kecuali dimoderasi.
- Penghapusan akun: kontribusi Verified tetap ada dengan atribusi ke profil yang di-anonimkan ("Kontributor dihapus"). Dicatat di kebijakan privasi.

## 6. Kebutuhan Fungsional

ID dipakai sebagai referensi tiket dan test.

### A. Homepage (FR-HOME)
- FR-HOME-1 Hero + penjelasan singkat + disclaimer ringkas.
- FR-HOME-2 Search bar yang mengarah ke `/bansos?q=`.
- FR-HOME-3 Daftar kategori (aktif) dengan jumlah program Verified.
- FR-HOME-4 Seksi: Terbaru, Terverifikasi, Segera Kedaluwarsa (maks. 6 kartu per seksi).
- FR-HOME-5 Statistik komunitas: total program Verified, total kontributor, total kontribusi.
- FR-HOME-6 CTA "Bagikan Informasi" (→ login jika belum login).
- FR-HOME-7 Seksi "Cara Kerja" 3–4 langkah.

### B. Direktori (FR-DIR)
- FR-DIR-1 Daftar kartu program Verified & Expired (Expired diberi label, default disembunyikan lewat filter status).
- FR-DIR-2 Pencarian judul + deskripsi (full-text, toleran typo lewat trigram).
- FR-DIR-3 Filter: kategori, wilayah (provinsi, kota/kabupaten), status (Verified/Expired), rentang tanggal publikasi.
- FR-DIR-4 Sorting: Terbaru (default), Relevansi (aktif saat ada kata kunci).
- FR-DIR-5 Pagination 12 item/halaman; state di query string agar dapat dibagikan.
- FR-DIR-6 Empty state yang jelas + ajakan berkontribusi.

### C. Detail (FR-DET)
- FR-DET-1 Menampilkan semua field di bagian 5.3 + sumber (dapat diklik, `rel="noopener noreferrer nofollow"`, buka tab baru).
- FR-DET-2 Banner disclaimer Verified.
- FR-DET-3 Kartu kontributor + reviewer (username publik).
- FR-DET-4 Riwayat pembaruan (tanggal, aksi; tanpa data internal).
- FR-DET-5 Tombol "Laporkan informasi".
- FR-DET-6 Metadata SEO + Open Graph.

### D. Kontribusi (FR-CON)
- FR-CON-1 Form: judul, deskripsi, kategori, wilayah, penyelenggara, persyaratan (opsional), jadwal buka/tutup (opsional), tanggal publikasi/ditemukan, 1–5 sumber (URL, judul sumber, tipe), catatan tambahan untuk reviewer.
- FR-CON-2 Validasi klien + **server** (Zod). Judul 10–150 karakter; deskripsi 50–3000 karakter; URL `https`/`http` valid, tidak mengarah ke alamat privat/localhost.
- FR-CON-3 Simpan sebagai Draft; "Kirim untuk ditinjau" → Pending (wajib lolos validasi penuh).
- FR-CON-4 Dashboard daftar kontribusi dengan status, alasan revisi/penolakan, dan riwayat.
- FR-CON-5 Batas anti-spam: maks. 10 pengiriman Pending/hari per user; user baru (<7 hari & 0 Verified) maks. 3 Pending bersamaan.
- FR-CON-6 Peringatan deteksi duplikasi (5.4).
- FR-CON-7 Larangan konten sensitif: peringatan di form + pemindaian pola NIK (16 digit) dan nomor rekening pada kolom teks; jika terdeteksi, pengiriman ditolak dengan pesan edukatif.

### E. Profil Kontributor (FR-PRO)
- FR-PRO-1 `/kontributor/[username]` sesuai 5.6. FR-PRO-2 404 untuk username tidak dikenal/banned-hidden.

### F. Review (FR-REV)
- FR-REV-1 Antrean Pending (FIFO, filter kategori/wilayah, indikator "menunggu X hari").
- FR-REV-2 Halaman review menampilkan data kontribusi, sumber, peringatan duplikasi, dan checklist (lihat MODERATION_GUIDE).
- FR-REV-3 Aksi: Setujui (Verified), Minta Revisi, Tolak, Tandai Kedaluwarsa. Alasan wajib untuk Revisi/Tolak (min. 20 karakter).
- FR-REV-4 Reviewer dapat melakukan koreksi minor pada konten (tercatat di riwayat).
- FR-REV-5 Tidak boleh review kontribusi sendiri (dicek server + RLS).
- FR-REV-6 "Claim" item untuk mencegah dua reviewer mengerjakan item yang sama (kedaluwarsa otomatis 30 menit).

### G. Laporan & Moderasi (FR-REP, FR-MOD)
- FR-REP-1 Alasan: Tidak akurat, Kedaluwarsa, Link tidak tersedia, Duplikat, Dugaan penipuan, Spam/penyalahgunaan.
- FR-REP-2 Deskripsi 10–1000 karakter; anonim diperbolehkan dengan rate limit (5/jam/IP, 1 laporan/program/IP/24 jam).
- FR-MOD-1 Antrean laporan dengan prioritas **Dugaan penipuan** di atas.
- FR-MOD-2 Aksi: Dismiss, Teruskan ke reviewer (set program kembali ke Pending), Sembunyikan program (Archived), Peringatkan/blokir kontributor, Selesaikan dengan catatan.
- FR-MOD-3 Semua aksi tercatat di `moderation_logs`.

### H. Admin (FR-ADM)
- FR-ADM-1 Kelola user (cari, lihat role, blokir/aktifkan).
- FR-ADM-2 Beri/cabut role (tercatat; Admin terakhir dilindungi).
- FR-ADM-3 CRUD kategori (nonaktifkan, bukan hapus, jika sudah dipakai).
- FR-ADM-4 Audit log (filter aktor, aksi, rentang tanggal; hanya baca; ekspor CSV opsional).
- FR-ADM-5 Settings: teks disclaimer, ambang rate limit, ambang hari "segera kedaluwarsa".

### I. Halaman Statis (FR-STA)
`/tentang`, `/panduan` (cara mencari, cara berkontribusi, kriteria sumber, cara melapor, waspada penipuan), `/kebijakan-privasi`.

## 7. Kebutuhan Non-Fungsional

| Area | Target |
|---|---|
| Performa | LCP < 2,5 dtk (4G) halaman publik; TTFB < 600 ms; halaman publik memakai ISR/cache |
| Keamanan | Lihat SECURITY.md; RLS wajib semua tabel |
| Aksesibilitas | WCAG 2.1 AA: kontras, fokus keyboard, label form, alt text |
| Responsif | 360px s.d. desktop; mobile-first |
| Ketersediaan | Mengikuti SLA Vercel/Supabase; situs publik tetap berfungsi tanpa AI provider |
| Observabilitas | Log error server, audit log aksi penting |
| SEO | Sitemap, robots, metadata dinamis, URL slug yang stabil |
| i18n | Bahasa Indonesia saja (teks di satu tempat agar mudah diekstrak nanti) |
| Privasi | Tanpa pelacak pihak ketiga yang invasif; analitik tanpa cookie jika dipakai |

## 8. Metrik Keberhasilan (90 hari pertama)

- ≥ 100 program Verified; ≥ 30 kontributor aktif.
- Median waktu review (Pending → keputusan) ≤ 48 jam.
- Rasio laporan terselesaikan ≤ 72 jam ≥ 90%.
- Rasio program Verified yang dilaporkan "tidak akurat" < 5%.
- 0 insiden kebocoran data/secret.

## 9. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Penipuan berkedok bansos lolos | Wajib sumber; pemeriksaan domain; kategori laporan "Dugaan penipuan" prioritas |
| Kekurangan reviewer | Mulai dengan tim inti; batasi pengiriman harian; antrean terlihat umur |
| Spam kontribusi | Rate limit, batas Pending bersamaan, pemblokiran |
| Informasi cepat usang | Auto-Expire + laporan + disclaimer |
| Penyalahgunaan role | Role hanya dari admin, audit log, RLS |
| Ketergantungan tier gratis | Dokumentasikan limit, rencana migrasi di DEPLOYMENT_GUIDE |

## 10. Keputusan Teknis yang Sudah Ditetapkan

| Topik | Keputusan |
|---|---|
| Rendering | Next.js App Router; halaman publik SSR/ISR; mutasi via Server Actions + Route Handlers |
| Validasi | Zod di server (sumber kebenaran) |
| Pencarian | PostgreSQL full-text (`simple`) + `pg_trgm` |
| Rate limit | Upstash Ratelimit (Redis); fallback tabel Postgres bila tidak tersedia |
| Anti-bot laporan anonim | Cloudflare Turnstile |
| Job terjadwal | Vercel Cron → endpoint terproteksi `CRON_SECRET` (auto-expire, bersihkan claim) |
| Transisi status | Dijalankan lewat fungsi RPC Postgres `security definer` agar atomik + tercatat |
| ID & slug | UUID; slug = slugify(judul) + 6 karakter acak, tidak berubah setelah Verified |

## 11. Acceptance Criteria MVP

Mengikuti bagian 13 handover, dengan tambahan: (1) semua FR berstatus selesai atau dicoret dengan alasan tertulis, (2) tes RLS lulus untuk setiap role, (3) tidak ada temuan keamanan severity tinggi terbuka, (4) Lighthouse Accessibility ≥ 90 di halaman publik utama.

## 12. Glosarium

- **Bansos**: bantuan sosial. **Kontribusi**: entri informasi yang dikirim pengguna. **Verified**: sudah diperiksa manual terhadap sumber. **Reviewer/Moderator/Admin**: lihat bagian 4.
