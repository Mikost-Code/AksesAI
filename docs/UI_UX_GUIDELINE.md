# UI/UX Guideline — AksesAI

**Identitas visual:** Clean · Modern · Professional · Community-driven.
Referensi visual yang pernah diberikan hanyalah inspirasi struktur direktori komunitas; **jangan menyalin desain**.

## 1. Prinsip

1. **Kejelasan sebelum hiasan.** Orang mencari informasi penting; kurangi gesekan.
2. **Kepercayaan terlihat:** sumber, status, kontributor, dan disclaimer selalu terlihat.
3. **Whitespace lega**, hierarki tipografi jelas.
4. **Mobile-first** (banyak pengguna di ponsel & koneksi terbatas).
5. **Inklusif:** bahasa sederhana, kontras baik, dapat dipakai dengan keyboard & pembaca layar.

## 2. Palet Warna

Warna utama putih dominan; aksen teal/emerald. Definisikan sebagai CSS variables (shadcn tokens).

| Token | Nilai | Pemakaian |
|---|---|---|
| `--background` | `#FFFFFF` | Latar utama |
| `--surface` | `#F8FAFB` (off-white) | Latar seksi bergantian |
| `--foreground` | `#0F1B2D` (navy/charcoal) | Teks utama |
| `--muted-foreground` | `#5B6676` | Teks sekunder |
| `--border` | `#E4E8EC` (light gray) | Border tipis |
| `--primary` | `#0F766E` (teal 700) | Tombol utama, link, aksen |
| `--primary-hover` | `#115E59` | Hover |
| `--primary-soft` | `#E6F6F3` | Latar badge/aksen lembut |
| `--accent` | `#059669` (emerald 600) | Indikator positif/Verified |
| `--warning` | `#B45309` + soft `#FEF3C7` | Pending/Segera kedaluwarsa |
| `--danger` | `#B91C1C` + soft `#FEE2E2` | Ditolak/Penipuan |

Kontras teks minimal **4.5:1** (3:1 untuk teks besar/komponen UI). Periksa kombinasi sebelum dipakai. Jangan mengandalkan warna saja: sertakan ikon/teks.

## 3. Tipografi

- Font: **Inter** (atau Plus Jakarta Sans untuk judul) via `next/font`, fallback `system-ui`.
- Skala: H1 36/40 (mobile 28/34), H2 28/34, H3 20/28, body 16/26, kecil 14/20. Berat 400/500/600.
- Panjang baris ideal 60–75 karakter pada teks panjang.

## 4. Layout, Spasi, Bentuk

- Container maks. 1200px, padding horizontal 16 (mobile) / 24 / 32.
- Grid kartu: 1 kolom (≤640), 2 (≥768), 3 (≥1024).
- Skala spasi 4px (4, 8, 12, 16, 24, 32, 48, 64). Jarak antar seksi 64–96px desktop.
- **Radius konsisten:** 8px (input/tombol), 12px (kartu), 9999px (badge/pill).
- Card sederhana: latar putih, border 1px `--border`, shadow lembut `0 1px 2px rgba(16,24,40,.06)`; hover naik ke `0 4px 12px rgba(16,24,40,.08)`.
- Ikon: **lucide-react**, stroke 1.5–2, ukuran 16/20/24.

## 5. Hindari

Dark theme sebagai default · gradient berlebihan · glassmorphism berlebihan · animasi mengganggu · tampilan seperti dashboard admin di halaman publik · elemen 3D tanpa fungsi · pop-up yang menghalangi konten.

Motion: hanya transisi halus 150–200ms (hover, fokus, buka dialog); hormati `prefers-reduced-motion`.

## 6. Komponen Kunci

### 6.1 ProgramCard
Kategori (pill) · Judul (maks. 2 baris) · Ringkasan 2–3 baris · Provider · Jenis akses · Masa promo berakhir (jika ada) · **StatusBadge** · avatar+username kontributor. Seluruh kartu dapat diklik (satu target fokus).

### 6.2 StatusBadge
| Status | Label UI | Gaya |
|---|---|---|
| verified | Terverifikasi | emerald soft + ikon centang |
| pending | Menunggu Peninjauan | amber soft |
| needs_changes | Perlu Revisi | amber soft + ikon edit |
| rejected | Ditolak | red soft |
| expired | Kedaluwarsa | gray + ikon jam |
| draft | Draf | gray outline |
| archived | Diarsipkan | gray outline |

### 6.3 Disclaimer Verified
Teks tetap (dapat diubah admin): "Terverifikasi berarti entri telah diperiksa reviewer terhadap dokumentasi atau halaman resmi provider pada saat peninjauan. Kuota gratis, harga, dan promo dapat berubah sewaktu-waktu tanpa pemberitahuan. Selalu periksa halaman resmi provider sebelum mendaftar."

### 6.4 SourceList
Setiap sumber: ikon tipe, judul, **domain**, tombol "Buka sumber" (tab baru). Sumber utama diberi label "Sumber utama".

### 6.5 Form Kontribusi
Satu kolom, label di atas input, teks bantu di bawah, penghitung karakter, error inline spesifik, simpan draf otomatis (debounce) + tombol eksplisit. Peringatan data sensitif di bagian atas. Stepper opsional: Info → Jenis Akses & Promo → Sumber → Tinjau.

### 6.6 Filter Direktori
Desktop: bar filter horizontal/sidebar. Mobile: tombol "Filter" membuka sheet; chip filter aktif dapat dihapus satu per satu; tombol "Reset".

### 6.7 Halaman Review/Moderasi
Tampilan fungsional (tabel padat, panel samping checklist) — hanya untuk area staf, bukan publik.

## 7. Halaman & Konten Utama

### Beranda (urutan seksi)
1. Hero (judul, 1 kalimat penjelasan, search bar, 3 chip kategori populer)
2. Kategori (grid ikon)
3. Informasi terbaru
4. Terverifikasi
5. Segera kedaluwarsa
6. Statistik komunitas
7. Cara kerja (4 langkah: Temukan → Periksa sumber → Bagikan → Diverifikasi manusia)
8. CTA berkontribusi
9. Footer: tentang, panduan, privasi, tautan GitHub proyek, disclaimer singkat

### Detail
Breadcrumb → Judul + StatusBadge → meta (provider, jenis akses, kategori, masa promo) → disclaimer → deskripsi → free tier & harga per token ("Tidak tercantum pada sumber" bila kosong) → syarat akses → sumber → kontributor/reviewer → riwayat pembaruan → tombol **Laporkan** (sticky di mobile bagian bawah bersifat opsional).

## 8. Microcopy (Bahasa Indonesia)

- Nada: ramah, netral, sederhana. Hindari jargon & kata "pasti/dijamin".
- Empty state: "Belum ada informasi yang cocok. Coba ubah kata kunci atau filter, atau bagikan informasi yang Anda temukan."
- Error: jelaskan masalah + langkah berikutnya, tanpa menyalahkan.
- Konfirmasi aksi destruktif (arsip, blokir, tolak) dengan dialog dan alasan wajib.

## 9. Aksesibilitas (WCAG 2.1 AA)

- Semua kontrol dapat dijangkau keyboard; indikator fokus terlihat (ring 2px `--primary`).
- Semantik HTML (`header/nav/main/footer`, heading berurutan), skip-link "Lewati ke konten".
- Label form eksplisit; error terhubung via `aria-describedby`; status dinamis memakai `aria-live`.
- Alt text bermakna untuk avatar (nama pengguna) & dekoratif `alt=""`.
- Target sentuh ≥ 44×44px. Teks dapat diperbesar 200% tanpa kehilangan fungsi.
- Uji dengan axe, Lighthouse, dan pembaca layar (NVDA/VoiceOver) pada alur utama.

## 9a. Performa UX

Skeleton untuk daftar, gambar `next/image` dengan ukuran tetap (hindari CLS), font `display: swap`, hindari pustaka berat; target LCP < 2,5 dtk.

## 10. Checklist Desain per Halaman

- [ ] Sesuai palet & radius
- [ ] Responsif 360px–1280px
- [ ] Kontras & fokus lulus
- [ ] Empty/loading/error state ada
- [ ] Disclaimer & sumber terlihat (jika relevan)
- [ ] Tidak ada elemen terlarang (bagian 5)
