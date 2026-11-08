# Panduan Kontribusi AksesAI

Terima kasih sudah ingin berkontribusi! Proyek ini hidup dari komunitas: perbaikan data katalog, kode, dokumentasi, dan laporan bug semuanya berharga.

Dokumen ini menjelaskan cara berkontribusi agar PR Anda cepat di-review dan di-merge.

---

## Daftar Isi

- [Kode Etik](#kode-etik)
- [Cara Berkontribusi](#cara-berkontribusi)
- [Menyiapkan Lingkungan](#menyiapkan-lingkungan)
- [Alur Pull Request](#alur-pull-request)
- [Konvensi Commit & Branch](#konvensi-commit--branch)
- [Standar Kode](#standar-kode)
- [Menambah atau Memperbaiki Entri Katalog](#menambah-atau-memperbaiki-entri-katalog)
- [Mengubah Skema Database](#mengubah-skema-database)
- [Melaporkan Bug](#melaporkan-bug)
- [Melaporkan Kerentanan Keamanan](#melaporkan-kerentanan-keamanan)

---

## Kode Etik

Proyek ini memakai [Contributor Covenant](CODE_OF_CONDUCT.md). Dengan berpartisipasi, Anda diharapkan mematuhinya. Perilaku yang tidak pantas dapat dilaporkan ke pengelola organisasi MIKOS.

---

## Cara Berkontribusi

| Ingin… | Lakukan |
|---|---|
| Memperbaiki kesalahan data katalog | Buka issue **Koreksi data katalog** atau langsung PR ke `scripts/seed-content.mjs` |
| Menambah sumber resmi untuk entri | Issue **Saran sumber** atau PR |
| Mengusulkan entri baru | Issue **Usulan entri baru** (isi sumber resminya) |
| Memperbaiki bug | Issue **Bug report**, lalu PR bila Anda bisa |
| Menambah fitur | Buka issue diskusi dulu — fitur besar sebaiknya disepakati sebelum dikerjakan |
| Memperbaiki dokumentasi | Langsung PR, tidak perlu issue |

**Sebelum mulai menulis kode untuk perubahan besar, buka issue dulu.** Ini menghindari pekerjaan yang terbuang bila arahnya perlu disesuaikan.

---

## Menyiapkan Lingkungan

Prasyarat: Node.js `>=20.19.0 <26`, pnpm 10+, Docker, dan Supabase CLI 2.x.

```bash
# 1. Fork repo di GitHub, lalu clone fork Anda
git clone https://github.com/<username-anda>/AksesAI.git
cd AksesAI

# 2. Tambahkan upstream agar mudah sinkron
git remote add upstream https://github.com/zann06/AksesAI.git

# 3. Install dependensi
pnpm install

# 4. Siapkan environment
cp .env.example .env.local   # lalu isi nilainya

# 5. Nyalakan Supabase lokal + terapkan migrasi & seed (Docker harus menyala)
npx supabase@2.120.0 start
npx supabase@2.120.0 db reset

# 6. Jalankan dev server
pnpm dev
```

Buka <http://localhost:3000>. Detail lengkap ada di [README](README.md#memulai-local-development).

> **Penting:** `.env.local` berisi rahasia. Jangan pernah commit. CI akan gagal bila ada secret yang terlacak.

---

## Alur Pull Request

1. **Sinkronkan** branch Anda dengan upstream:
   ```bash
   git fetch upstream
   git checkout -b fix/perbaikan-singkat upstream/main
   ```
2. **Kerjakan satu hal saja** per PR. PR yang mencampur refactor besar dengan perbaikan bug sulit di-review.
3. **Jalankan pemeriksaan lokal** sebelum push:
   ```bash
   pnpm typecheck && pnpm lint && pnpm test
   # bila menyentuh skema/RPC:
   pnpm test:rls
   ```
4. **Push ke fork Anda** dan buka PR ke `zann06/AksesAI:main`.
5. **Isi template PR** dengan jujur — terutama bagian "apa yang berubah" dan "bagaimana diuji".
6. **Tunggu CI hijau.** `main` dilindungi: PR tidak bisa di-merge sebelum CI lulus dan ada review dari pengelola.

### Yang membuat PR cepat di-merge

- Judul jelas dan mencerminkan isi.
- Deskripsi menjelaskan **kenapa**, bukan cuma **apa**.
- Ada bukti pengujian (screenshot untuk perubahan UI, output tes untuk logika).
- Tidak ada perubahan tak terkait (mis. format ulang file yang tidak Anda sentuh).
- Tidak ada rahasia, data pribadi, atau file besar yang tidak perlu.

### Yang akan diminta revisi

- Menambah atau mengubah entri katalog tanpa **sumber resmi**.
- Menyatakan tanggal berakhir promo yang belum diumumkan provider.
- Menampilkan angka `0` sebagai informasi.
- Melemahkan aturan keamanan (mis. melonggarkan RLS, menghapus aturan "tidak bisa meninjau kiriman sendiri", mengubah role DB).
- Menonaktifkan atau men-skrip tes agar lulus.

---

## Konvensi Commit & Branch

**Branch:** `feat/<topik>`, `fix/<topik>`, `chore/<topik>`, `docs/<topik>`, `audit/<topik>`.

**Commit** mengikuti [Conventional Commits](https://www.conventionalcommits.org/id/v1.0.0/):

```
feat(kontribusi): catatan integrasi opsional pada formulir
fix(nav): jalan kembali ke direktori publik di menu akun
docs(readme): jelaskan skema database yang kini dipublikasikan
```

Tipe yang dipakai: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `build`, `audit`, `perf`, `ci`.

Tulis pesan commit dan komentar kode dalam **Bahasa Indonesia** — konsisten dengan kode yang sudah ada.

---

## Standar Kode

- **TypeScript strict.** Tidak ada `any` baru tanpa alasan kuat; gunakan tipe yang sempit.
- **Teks UI & komentar dalam Bahasa Indonesia.**
- **Server-first.** Perubahan status data hanya lewat RPC `security definer`; jangan menambah jalur tulis langsung dari klien.
- **Jangan mengekspos `service_role`.** Hanya di kode server. Ada pemeriksaan bundle di CI.
- **Validasi dengan Zod** di batas sistem (input formulir, API route).
- Komponen UI mengikuti gaya `src/components/` yang sudah ada (Tailwind v4 + pola shadcn/ui).
- Jalankan `pnpm lint` — ESLint sudah mengatur urutan import dan aturan lainnya.

---

## Menambah atau Memperbaiki Entri Katalog

Sumber tunggal katalog adalah [`scripts/seed-content.mjs`](scripts/seed-content.mjs). Untuk memperbaiki atau menambah entri, ubah file itu.

### Aturan wajib

1. **Minimal satu sumber resmi per entri.** Sumber resmi adalah dokumentasi provider, halaman harga/kuota resmi, pengumuman di kanal resmi provider, atau dokumen hukumnya. Blog agregator, tautan afiliasi, dan konten pihak ketiga **bukan** sumber resmi.
2. **Jangan menyatakan tanggal berakhir yang belum diumumkan.** Bila provider tidak menyebut tanggal, biarkan `promoEnd` kosong dan tulis ketidakpastiannya secara jujur. **Jangan menebak.**
3. **Angka `0` bukan informasi.** Kosongkan field bila nilainya tidak ada, jangan isi `0`.
4. **Satu entri = satu program.** Jangan menggabungkan beberapa penawaran dalam satu entri.
5. Sertakan waktu pengecekan agar reviewer tahu kapan info itu terakhir diverifikasi.

### Format sumber

Setiap sumber punya `label`, `url`, dan opsional `type` (mis. `docs`, `pricing`, `announcement`). Contoh:

```js
sources: [
  {
    label: "Dokumentasi resmi provider",
    url: "https://provider.example/docs",
    type: "docs",
  },
  {
    label: "Pengumuman kuota di kanal resmi",
    url: "https://x.com/provider/status/...",
    type: "announcement",
  },
],
```

Setelah mengubah data, jalankan `node scripts/verify-catalog-audit.mjs` bila tersedia, lalu buka PR. Reviewer akan memeriksa setiap sumber terhadap halaman aslinya sebelum menerbitkan.

> Entri dengan sumber yang tidak bisa dibuka atau tidak mendukung klaimnya akan diminta revisi.

---

## Mengubah Skema Database

Skema dipublikasikan di `supabase/` dan **seluruh migrasi diterapkan ulang dari nol di CI**.

1. Buat file migrasi baru dengan nama berurutan: `supabase/migrations/YYYYMMDDHHMMSS_deskripsi_singkat.sql`.
2. Tulis SQL **idempoten** bila memungkinkan (`create table if not exists`, `create or replace function`), karena `supabase db reset` menjalankannya ulang di database bersih.
3. **Jangan** mengubah migrasi yang sudah ada dan sudah dijalankan di produksi — buat migrasi baru.
4. Jangan menaruh kredensial, JWT, connection string, atau data pribadi di migrasi maupun `seed.sql`.
5. Bila tabel/kebijakan baru: **wajib** menambahkan kebijakan RLS dan tesnya di `tests/rls/`.
6. Regenerasi tipe: `pnpm gen:types`.
7. Jalankan `pnpm test:rls` secara lokal sebelum membuka PR.

### Aturan yang tidak boleh dilanggar

- **Jangan mengubah role database.**
- **Jangan melonggarkan aturan "tidak bisa meninjau kiriman sendiri".**
- Setiap tabel baru harus punya RLS aktif dan kebijakan yang jelas.

---

## Melaporkan Bug

Gunakan template **Bug report** saat membuka issue. Sertakan:

- Langkah reproduksi yang spesifik
- Yang diharapkan vs yang terjadi
- Browser/OS/Node versi bila relevan
- Screenshot atau pesan error (sensor data pribadi)
- Apakah muncul di produksi, lokal, atau keduanya

Jangan sertakan token, cookie, atau data pribadi dalam laporan.

---

## Melaporkan Kerentanan Keamanan

**Jangan** buka issue publik untuk kerentanan keamanan. Gunakan [GitHub Security Advisory](https://github.com/zann06/AksesAI/security/advisories/new). Detail lengkap ada di [SECURITY.md](SECURITY.md).

---

Terima kasih sudah berkontribusi. 🎉
