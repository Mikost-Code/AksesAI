/**
 * Aturan tampilan badge angka pada menu akun.
 *
 * Alasan dipisah ke modul murni: sebelumnya logika ini menempel di dalam JSX
 * sehingga tidak mungkin diuji. Akibatnya aturan produk "angka 0 tidak pernah
 * ditampilkan sebagai informasi" hanya dijaga oleh ingatan.
 *
 * Aturan:
 *  - `undefined` / `null` / `0` / negatif  → tidak ditampilkan (null)
 *  - 1..99                                → angka apa adanya
 *  - > 99                                 → "99+"
 *  - bukan bilangan bulat / NaN           → tidak ditampilkan
 */
export function formatBadgeCount(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value)) return null;
  const n = Math.trunc(value);
  if (n <= 0) return null;
  return n > 99 ? "99+" : String(n);
}

/** Apakah badge perlu dirender sama sekali? */
export function hasBadge(value: number | null | undefined): boolean {
  return formatBadgeCount(value) !== null;
}
