## Ringkasan

<!-- Jelaskan APA yang berubah dan KENAPA. Tautkan issue terkait bila ada. -->

Closes #

## Jenis perubahan

- [ ] Perbaikan bug (`fix`)
- [ ] Fitur baru (`feat`)
- [ ] Perbaikan/perubahan data katalog (`audit`)
- [ ] Dokumentasi (`docs`)
- [ ] Refactor / internal (`chore`, `refactor`)
- [ ] Perubahan skema database (`supabase/migrations/`)

## Perubahan yang dilakukan

<!-- Poin-poin singkat. Fokus pada perilaku yang berubah. -->

-
-

## Bagaimana diuji

<!-- Perintah yang dijalankan dan hasilnya. Untuk perubahan UI, sertakan screenshot. -->

```bash
pnpm typecheck && pnpm lint && pnpm test
```

## Checklist kontributor

- [ ] Saya sudah membaca [CONTRIBUTING.md](../CONTRIBUTING.md)
- [ ] Branch saya bercabang dari `main` terbaru dan berisi **satu tujuan** saja
- [ ] `pnpm typecheck && pnpm lint && pnpm test` lulus di lokal
- [ ] Bila menyentuh skema/RPC: `pnpm test:rls` lulus dan saya menambah/menyesuaikan tes di `tests/rls/`
- [ ] Bila mengubah entri katalog: setiap entri punya **minimal satu sumber resmi**
- [ ] Tidak ada tanggal berakhir promo yang saya karang (hanya yang diumumkan provider)
- [ ] Tidak menampilkan/mengisi angka `0` sebagai informasi
- [ ] Tidak ada rahasia, token, atau data pribadi di diff (termasuk `.env.local`, `supabase/.temp/`, `supabase/backups/`)
- [ ] Tidak melemahkan aturan keamanan (RLS, role DB, "tidak bisa meninjau kiriman sendiri")
- [ ] Tidak menonaktifkan atau men-skrip tes agar lulus
- [ ] Teks UI & komentar dalam Bahasa Indonesia

## Catatan untuk reviewer

<!-- Hal yang perlu perhatian khusus, keputusan desain, atau hal yang belum pasti. -->

---

© 2026 AksesAI. Dibuat oleh organisasi MIKOS.
