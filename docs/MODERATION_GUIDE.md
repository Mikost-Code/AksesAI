# Moderation Guide — AksesAI

Panduan untuk Reviewer, Moderator, dan Admin. Tujuan: informasi akurat, bersumber, dan tidak merugikan masyarakat.

## 1. Prinsip

1. **Manusia yang memutuskan.** Tidak ada verifikasi otomatis.
2. **Sumber di atas segalanya.** Tidak ada sumber yang memadai → tidak Verified.
3. **Jangan mengarang.** Persyaratan/jadwal yang tidak ada di sumber dibiarkan kosong.
4. **Alasan tertulis** untuk setiap revisi/penolakan: jelas, sopan, dapat ditindaklanjuti.
5. **Hindari konflik kepentingan.** Tidak mereview kontribusi sendiri atau milik pihak yang Anda kenal dekat bila bisa dihindari.
6. **Keselamatan pengguna lebih penting dari kecepatan.** Ragu → minta revisi atau eskalasi.

## 2. Alur Reviewer

1. Buka `/review`, pilih item tertua (FIFO) → **Claim** (berlaku 30 menit).
2. Periksa dengan checklist di bawah.
3. Ambil keputusan:
   - **Setujui (Verified)** — semua kriteria terpenuhi.
   - **Minta Revisi** — ada kekurangan yang dapat diperbaiki; tulis alasan spesifik.
   - **Tolak** — tidak layak diperbaiki (penipuan, tanpa sumber, di luar lingkup); tulis alasan.
4. Target SLA: keputusan ≤ 48 jam sejak Pending.

### Checklist Verifikasi

**Sumber**
- [ ] Minimal satu sumber dapat dibuka dan relevan dengan klaim.
- [ ] Sumber utama berasal dari dokumentasi/halaman resmi provider atau media tepercaya.
- [ ] Domain tidak mencurigakan (typosquatting, domain gratisan acak, pemendek URL tanpa tujuan jelas).
- [ ] Tidak meminta pembayaran/biaya pendaftaran, data pribadi sensitif lewat tautan tak jelas, atau OTP.
- [ ] Informasi tidak berasal semata-mata dari pesan berantai/tangkapan layar tanpa sumber primer.

**Isi**
- [ ] Judul mewakili isi; tidak sensasional/clickbait.
- [ ] Deskripsi sesuai sumber; tidak ada klaim yang tidak tercantum.
- [ ] Kategori & jenis akses sesuai.
- [ ] Provider sesuai sumber.
- [ ] Free tier, harga per token, dan syarat akses sesuai sumber atau dikosongkan.
- [ ] Masa promo masuk akal; bila sudah lewat → arahkan ke Expired, bukan Verified.

**Kepatuhan**
- [ ] Tidak ada API key, token akses, kredensial akun, NIK, KK, rekening, atau foto KTP.
- [ ] Bukan duplikat (periksa peringatan duplikasi & cari manual).
- [ ] Bukan promosi/iklan/spam.

### Tanda Bahaya Penipuan (tolak & eskalasi ke moderator)
Meminta uang muka/"biaya admin"; menjanjikan pasti lolos; mengatasnamakan instansi tetapi domain tidak resmi; mengarahkan ke WhatsApp pribadi; meminta data login/OTP; tekanan waktu berlebihan.

### Template Alasan

| Situasi | Contoh |
|---|---|
| Sumber lemah | "Sumber saat ini berupa unggahan media sosial tanpa tautan ke pengumuman resmi. Mohon tambahkan tautan dokumentasi/halaman resmi provider." |
| Tidak sesuai sumber | "Klaim 'kuota 1 juta token per hari' tidak tercantum pada sumber. Hapus atau tambahkan sumber yang memuatnya." |
| Link mati | "Tautan sumber tidak dapat dibuka (404). Mohon perbarui tautan atau sertakan arsip/sumber lain." |
| Data sensitif | "Terdapat data pribadi pada deskripsi. Hapus dan ajukan kembali." |
| Duplikat | "Informasi ini sudah ada: [tautan]. Jika ada pembaruan, ajukan lewat laporan pada entri tersebut." |
| Tolak penipuan | "Informasi ini menunjukkan indikasi penipuan (meminta biaya pendaftaran lewat kontak pribadi) sehingga tidak dapat diterbitkan." |

## 3. Alur Moderator

Buka `/moderation/reports`. **Urutan prioritas:** Dugaan penipuan → Tidak akurat → Link mati/Kedaluwarsa → Duplikat → Spam.

| Jenis laporan | Tindakan umum |
|---|---|
| Dugaan penipuan | Segera **Archive** (sembunyikan) sementara → investigasi → pulihkan via review ulang atau tetap Archived + tindak kontributor |
| Tidak akurat | **Reopen for review** (kembali Pending) atau minta reviewer koreksi; catat sumber pembanding |
| Kedaluwarsa | Konfirmasi tanggal pada sumber → **Mark Expired** |
| Link mati | Periksa ulang; cari sumber pengganti; bila tidak ada, Expired/Archived |
| Duplikat | Pertahankan entri terbaik, Archive yang lain, catat tautannya |
| Spam/penyalahgunaan | Archive konten; **peringatkan** → **blokir** pada pelanggaran berulang |

Setiap laporan diselesaikan dengan **catatan resolusi**. Target SLA: ≤ 72 jam (penipuan ≤ 24 jam).

### Tangga Penindakan Kontributor
1. Peringatan (catat di log) → 2. Pembatasan sementara (batas kiriman) → 3. Blokir (`is_banned`) dengan alasan tertulis. Pelanggaran berat (penipuan sengaja, penyebaran data pribadi) boleh langsung blokir.

## 4. Tugas Admin

- Memberi/mencabut role dengan prinsip *least privilege*; verifikasi identitas GitHub calon reviewer/moderator.
- Memastikan minimal 2 Admin aktif & minimal 2 Reviewer agar tidak ada kemacetan.
- Mengelola kategori (nonaktifkan, bukan hapus, bila sudah dipakai).
- Meninjau audit log berkala (mingguan): lonjakan penolakan, aksi tak biasa, perubahan role.
- Menangani banding blokir.

## 5. Kedaluwarsa

- Cron harian menandai `end_date` terlewat menjadi Expired.
- Program tanpa `end_date` tetap Verified sampai dilaporkan/ditinjau; reviewer dianjurkan meninjau program Verified > 6 bulan tanpa pembaruan (filter di `/review`, opsional).

## 6. Banding

Kontributor dapat mengajukan banding atas penolakan/blokir melalui `[ISI kontak]` atau dengan membuat kontribusi ulang yang memperbaiki alasan. Banding ditinjau oleh reviewer/admin **berbeda** dari pengambil keputusan awal.

## 7. Etika & Komunikasi

Netral, sopan, fokus pada informasi bukan orangnya. Jangan membagikan data pelapor. Jangan mengomentari kelayakan seseorang menerima bantuan. Jangan menyatakan "pasti dapat" atau "dijamin" pada konten apa pun.
