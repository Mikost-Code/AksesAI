# Kebijakan Keamanan

Keamanan AksesAI penting bagi kami — platform ini menampung kontribusi publik dan data pengguna. Terima kasih sudah membantu menjaganya.

---

## Melaporkan Kerentanan

**Jangan buka issue publik.** Gunakan kanal privat:

➡️ **[GitHub Security Advisory](https://github.com/zann06/AksesAI/security/advisories/new)**

Sertakan bila memungkinkan:

- Deskripsi kerentanan dan dampaknya
- Langkah reproduksi (poin-poin, bukan video panjang)
- Versi/browser/lingkungan
- Bukti konsep (PoC) minimal, tanpa menyentuh data pengguna lain
- Saran perbaikan bila Anda punya

### Yang kami minta

- **Jangan** mengakses, mengubah, atau menghapus data milik orang lain. Cukup buktikan aksesnya.
- **Jangan** melakukan uji beban (DoS), spam, atau pengujian yang mengganggu layanan produksi.
- **Jangan** mempublikasikan detail kerentanan sebelum kami memperbaikinya.
- Beri kami kesempatan wajar untuk memperbaiki sebelum pengungkapan publik.

### Ekspektasi waktu

| Tahap | Target |
|---|---|
| Konfirmasi penerimaan | 3 hari kerja |
| Penilaian awal & rencana perbaikan | 10 hari kerja |
| Perbaikan untuk isu kritis | secepatnya, sesuai tingkat keparahan |

Ini proyek komunitas yang dikelola sukarela — kami berusaha sebaik mungkin, dan akan memberi kabar bila ada keterlambatan.

---

## Cakupan

**Termasuk:**

- Kebocoran atau pelemahan kebijakan RLS (Row Level Security)
- Eskalasi hak akses (mis. anggota memperoleh role staf, meninjau kiriman sendiri)
- Bypass autentikasi atau sesi
- Injeksi SQL/XSS/SSRF
- Kebocoran rahasia (`service_role`, `CRON_SECRET`, `IP_HASH_SALT`)
- Kebocoran data pribadi pengguna
- Akses tidak sah ke endpoint cron atau admin

**Tidak termasuk:**

- Laporan otomatis dari pemindai tanpa bukti dampak nyata
- Masalah pada dependensi yang sudah diperbaiki upstream (laporkan ke upstream, atau sebutkan versi perbaikannya)
- Praktik terbaik yang belum diterapkan (mis. header tambahan) tanpa dampak keamanan jelas
- Spam atau penyalahgunaan formulir laporan biasa (buka issue biasa)
- Rekayasa sosial terhadap kontributor atau pengelola

---

## Prinsip Keamanan Proyek

Agar laporan Anda sesuai desain sistem:

- **RLS aktif di semua tabel.** Perubahan status data hanya lewat RPC `security definer`.
- **Pengguna tidak dapat mengubah role miliknya sendiri.** Login GitHub hanya memberi `member`.
- **Reviewer tidak dapat meninjau kiriman sendiri** — ditegakkan di database, bukan hanya di UI.
- **Rate limit fail-closed di produksi**: tanpa backend rate limit, permintaan ditolak.
- **IP pelapor tidak disimpan mentah** — hanya hash bergaram, dengan salt terpisah per tujuan.
- **`service_role` hanya di server.** CI memeriksa bundle klien agar kunci ini tidak bocor.
- **Skema database dipublikasikan** — tidak ada rahasia di `supabase/`. Bila Anda menemukan rahasia di sana, itu kerentanan serius; laporkan segera.

---

## Untuk Kontributor

- Jangan pernah commit `.env.local`, `supabase/.temp/`, atau `supabase/backups/`.
- CI menjalankan `scripts/secret-scan.mjs`; PR dengan secret akan gagal.
- Jangan melemahkan tes keamanan atau kebijakan RLS untuk membuat CI hijau.

---

## Pengungkapan Publik

Setelah perbaikan dirilis, kami akan mendokumentasikan isu secara publik (mis. di catatan rilis) dan memberi kredit kepada pelapor bila diinginkan. Kami tidak menjalankan program bounty berbayar, tetapi kami sangat menghargai setiap laporan.

---

© 2026 AksesAI. Dibuat oleh organisasi MIKOS.
