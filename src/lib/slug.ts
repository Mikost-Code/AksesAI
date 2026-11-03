/**
 * Slug dasar dari judul (huruf kecil, alfanumerik, tanda hubung).
 * Mirror dari fungsi SQL `public.slugify` — dipakai untuk membuat slug di server
 * sebelum disimpan (sufiks acak ditambahkan oleh pemanggil).
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
