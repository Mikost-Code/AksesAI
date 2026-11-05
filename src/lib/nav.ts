/**
 * Menentukan item navigasi aktif terhadap pathname saat ini.
 *
 * Masalah yang dijawab: bila satu item adalah induk dari item lain
 * (mis. `/admin` dan `/admin/pengguna`, atau `/dashboard/kontribusi` dan
 * `/dashboard/kontribusi/baru`), pencocokan prefix membuat KEDUANYA aktif
 * sekaligus — sidebar terlihat "dobel menyala". Solusinya: kumpulkan semua
 * href yang cocok, lalu pilih yang paling spesifik (prefix terpanjang).
 *
 * `exact` menonaktifkan pencocokan prefix — dipakai untuk halaman ringkasan
 * seperti `/dashboard` agar tidak ikut menyala di seluruh sub-halaman.
 */
export function resolveActiveHref(
  pathname: string,
  items: ReadonlyArray<{ href: string; exact?: boolean }>,
): string | undefined {
  return items
    .filter((item) =>
      item.exact
        ? pathname === item.href
        : pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .map((item) => item.href)
    .sort((a, b) => b.length - a.length)[0];
}
