/**
 * Perbandingan string tahan-timing (constant time).
 *
 * Dipakai untuk memverifikasi `CRON_SECRET` pada route handler cron.
 * Mengembalikan false bila panjang berbeda; perbandingan isi selalu
 * O(n) tanpa keluar lebih awal agar waktu eksekusi tidak membocorkan
 * berapa banyak karakter awal yang cocok.
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
