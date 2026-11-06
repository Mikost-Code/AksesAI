/**
 * Pemeriksaan origin untuk permintaan yang mengubah data (CSRF).
 *
 * Browser mengirim `Origin` pada setiap POST; `SameSite=Lax` pada cookie sesi
 * sudah menahan CSRF, ini lapisan kedua. Modul ini menyatukan logika yang
 * sebelumnya disalin di `/api/reports` dan `/api/source-clicks` — dua salinan
 * berarti satu perbaikan mudah lupa diterapkan di keduanya.
 *
 * Perilaku tanpa header `Origin`: TOLAK di production, izinkan di luar
 * production agar `curl`/skrip lokal/seed tetap mudah dipakai. Ini keputusan
 * sadar — klien non-browser tidak membawa cookie sesi pengguna, sehingga
 * jalur yang dilindungi tetap aman, sementara developer tidak terhambat.
 */

/** Minimal bentuk request yang dibutuhkan (kompatibel dengan NextRequest). */
type OriginRequest = {
  headers: { get(name: string): string | null };
};

export function isSameOrigin(request: OriginRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    return process.env.NODE_ENV !== "production";
  }
  try {
    // `URL.host` sudah memuat port bila ada, sama seperti header `host` —
    // perbandingan host:port ini menolak port lain walau domainnya sama.
    return new URL(origin).host === request.headers.get("host");
  } catch {
    // `Origin: null` (sandbox iframe) atau nilai rusak.
    return false;
  }
}
