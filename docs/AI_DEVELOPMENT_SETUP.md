# AI Development Setup — OpenCode + 9Router

> **Khusus developer.** AI **bukan** bagian dari runtime AksesAI. Website tidak memanggil AI provider mana pun.

## Tujuan

Membantu tim membangun, menguji, memperbaiki, dan mendokumentasikan proyek dengan biaya minimal memakai coding agent dan provider gratis/free tier.

## Alur

```text
Developer → OpenCode → 9Router → AI Provider → Hasil coding
```

## 1. Mengambil API Key (milik pribadi)

| Provider | Tempat klaim |
|---|---|
| Google AI Studio | https://aistudio.google.com/apikey |
| Groq | https://console.groq.com/keys |
| NVIDIA NIM | https://build.nvidia.com/ |
| Cerebras | https://cloud.cerebras.ai/ |
| OpenRouter | https://openrouter.ai/keys |

Ketersediaan model gratis, kuota, rate limit, dan persyaratan akun **dapat berubah sewaktu-waktu**. Periksa ketentuan provider sebelum memakai, dan jangan memasukkan data pribadi pengguna ke prompt.

## 2. Instalasi 9Router

```bash
npm install -g 9router
9router
```

Buka dashboard yang ditampilkan, lalu:

1. Tambahkan provider.
2. Pilih metode autentikasi (API key atau OAuth).
3. Masukkan API key pribadi / selesaikan OAuth.
4. Pastikan provider terhubung.
5. Periksa daftar model.
6. Aktifkan model yang ingin dipakai.

Endpoint lokal 9Router:

```text
http://localhost:20128/v1
```

## 3. Integrasi OpenCode

Untuk OpenCode 2.x, contoh konfigurasi plugin:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "@vheins/opencode-9router@latest"
  ]
}
```

Simpan pada file konfigurasi OpenCode yang sesuai, restart OpenCode, lalu jalankan:

```text
/models
```

dan pilih model dari provider 9Router yang sudah terhubung.

Catatan:
- OpenCode 1.x memakai kunci `plugin`, 2.x memakai `plugins`. **Verifikasi ke dokumentasi plugin dan OpenCode versi yang Anda pakai**, karena format dapat berubah.
- Tidak semua provider/model otomatis kompatibel.
- Jika model tidak muncul: cek dashboard 9Router (provider aktif?), cek endpoint `http://localhost:20128/v1`, cek konfigurasi plugin, restart OpenCode.
- Hindari `@latest` untuk pekerjaan yang butuh reprodusibilitas; pin versi bila perlu.

Referensi:
- 9Router: https://docs.9router.com/
- OpenCode Providers: https://opencode.ai/docs/providers/
- Plugin: https://github.com/vheins/opencode-9router

## 4. Alternatif tanpa 9Router

- Hubungkan provider langsung lewat `/connect` di OpenCode.
- Pakai OpenRouter langsung.
- Pakai Ollama untuk model lokal bila perangkat memadai.

## 5. Aturan Keamanan API Key

1. Setiap anggota memakai API key **miliknya sendiri**.
2. Jangan taruh API key di source code.
3. Jangan unggah ke GitHub.
4. Gunakan `.env.local` hanya jika aplikasi memang membutuhkannya (aplikasi AksesAI tidak membutuhkan key AI).
5. Pastikan `.env*` berisi rahasia ada di `.gitignore`.
6. Jangan jadikan key developer sebagai key publik website.
7. Jika key terlanjur terpublikasi: **revoke segera**, buat ulang, periksa riwayat penggunaan.

## 6. Praktik Baik Memakai Agent

- Beri konteks: tunjuk ke `PRD.md`, `docs/DATABASE_SCHEMA.md`, `docs/SECURITY.md`.
- Minta perubahan kecil dan terarah (satu FR per sesi).
- Tinjau setiap diff; jalankan lint/typecheck/test sebelum commit.
- Jangan biarkan agent mengubah migrasi/RLS tanpa review manusia.
- Jangan tempel data pengguna, token, atau isi `.env.local` ke prompt.
- Jangan menambahkan dependensi AI ke `package.json` aplikasi.

## 7. Contoh Prompt Pembuka Sesi

```text
Baca PRD.md, docs/SECURITY.md, dan docs/DATABASE_SCHEMA.md.
Kerjakan FR-CON-2 (validasi server form kontribusi) dengan Zod.
Aturan: jangan tambah fitur AI runtime, jangan simpan data sensitif,
semua mutasi lewat server action, tulis unit test Vitest.
```
