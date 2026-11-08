/**
 * Serialisasi JSON-LD (structured data) untuk disisipkan ke dalam `<script>`.
 *
 * Kenapa tidak memakai `JSON.stringify` langsung:
 * - HTML parser menutup `<script>` pada kemunculan pertama `</script`
 *   (case-insensitive, spasi/`>` setelahnya boleh). `JSON.stringify` TIDAK
 *   meng-escape `<`, sehingga teks kiriman pengguna — misalnya judul entri
 *   berisi `</script><img src=x onerror=...>` — dapat menutup tag lebih awal
 *   dan mengeksekusi markup di luar konteks data. Ini stored XSS yang lolos
 *   semua sanitasi teks biasa (`sanitizeText` memang hanya membuang karakter
 *   kontrol, bukan `<`).
 * - Selain `</script`, urutan `<!--` juga berbahaya: di dalam `<script>`
 *   parser masuk ke mode escaped dan `</script>` di dalamnya tidak lagi
 *   menutup tag, sehingga sisa dokumen bisa "tertelan".
 *
 * Perbaikan: escape semua `<` menjadi `\u003c` (escape sequence JSON yang
 * sah). Panjang & isi data tidak berubah, `JSON.parse` menghasilkan objek yang
 * identik, dan tidak ada lagi `<` mentah di dalam tag.
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    // `>` dan `&` tidak wajib, tetapi menutup sisa celah di konteks lain
    // (mis. bila hasilnya dipakai di atribut atau dokumen non-HTML).
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
