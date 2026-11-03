/**
 * Normalisasi & sanitasi teks masukan pengguna.
 * Bukan pengganti validasi Zod — hanya membersihkan spasi/karakter kontrol.
 * Output selalu dirender sebagai teks oleh React (tanpa dangerouslySetInnerHTML).
 */

/** Menghapus karakter kontrol (kecuali newline & tab), menormalkan spasi. */
export function sanitizeText(input: string): string {
  return input
    .normalize("NFC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Sanitasi satu baris (untuk judul, nama, kota). */
export function sanitizeSingleLine(input: string): string {
  return sanitizeText(input).replace(/\n/g, " ");
}

/** Membuang karakter berbahaya dari URL sebelum disimpan. */
export function stripUnsafeUrlChars(url: string): string {
  return url.replace(/[\u0000-\u001F\u007F\s]/g, "");
}
