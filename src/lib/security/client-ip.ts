/**
 * Parser IP klien dari header proxy — modul murni.
 *
 * Dipisahkan dari `ip-hash.ts` (yang memuat `server-only` + salt rahasia)
 * supaya perilaku anti-spoofing dapat diuji unit. Fungsi di sini TIDAK
 * menyentuh rahasia apa pun.
 */

/** Header yang ditulis proxy tepercaya, urut prioritas. */
export const TRUSTED_IP_HEADERS = [
  "cf-connecting-ip",
  "x-vercel-forwarded-for",
  "true-client-ip",
] as const;

/** Membuang port (`1.2.3.4:5678`) dan kurung IPv6 agar hash stabil. */
export function normalizeIp(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("[")) {
    const end = trimmed.indexOf("]");
    return end > 0 ? trimmed.slice(1, end) : trimmed;
  }
  // IPv4 dengan port — nilai dari header siap-pakai proxy.
  const ipv4WithPort = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/.exec(trimmed);
  return ipv4WithPort ? ipv4WithPort[1]! : trimmed;
}

/**
 * Mengambil IP klien dari header proxy.
 *
 * PENTING — mengapa bukan entri PERTAMA `x-forwarded-for`:
 * `X-Forwarded-For` bersifat APPEND-ONLY: proxy menambahkan IP pengirim di
 * kanan. Entri paling KIRI berasal dari klien dan sepenuhnya dapat dipalsukan
 * (`X-Forwarded-For: 1.2.3.4`) sehingga penyerang dapat mengganti identitasnya
 * pada setiap permintaan untuk menghindari rate limit. Entri paling KANAN
 * adalah yang ditambahkan proxy terdekat dan itulah satu-satunya nilai yang
 * layak dipercaya.
 *
 * Prioritas: header yang ditulis proxy infrastruktur (tidak dapat dipalsukan
 * klien) → entri terakhir `x-forwarded-for` → `x-real-ip` → placeholder.
 */
export function parseClientIp(headers: Headers): string {
  for (const name of TRUSTED_IP_HEADERS) {
    const value = headers.get(name)?.split(",")[0]?.trim();
    if (value) return normalizeIp(value);
  }

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    // Entri terakhir = hasil tambahan proxy tepercaya (lihat catatan di atas).
    const parts = forwarded.split(",");
    const last = parts[parts.length - 1]?.trim();
    if (last) return normalizeIp(last);
  }

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return normalizeIp(realIp);
  return "0.0.0.0";
}
