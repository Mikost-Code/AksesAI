import { stripUnsafeUrlChars } from "./sanitize";

/**
 * Keamanan URL sumber (docs/SECURITY.md §5).
 *
 * Aplikasi MVP tidak melakukan fetch ke URL sumber dari server. Fungsi ini
 * tetap menolak alamat privat/localhost agar tautan yang ditampilkan tidak
 * mengarah ke jaringan internal dan aman bila kelak ada pengecekan link.
 */

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/** Host yang selalu ditolak (localhost, metadata cloud, dsb). */
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "ip6-loopback",
  "metadata",
  "metadata.google.internal",
  "metadata.google.com",
]);

function ipv4ToNumber(ip: string): number {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    return -1;
  }
  return (
    ((parts[0]! << 24) >>> 0) +
    (parts[1]! << 16) +
    (parts[2]! << 8) +
    parts[3]!
  );
}

function isPrivateIpv4(ip: string): boolean {
  const n = ipv4ToNumber(ip);
  if (n < 0) return true;
  const ranges: Array<[string, number]> = [
    ["0.0.0.0", 8],
    ["10.0.0.0", 8],
    ["100.64.0.0", 10],
    ["127.0.0.0", 8],
    ["169.254.0.0", 16],
    ["172.16.0.0", 12],
    ["192.0.0.0", 24],
    ["192.168.0.0", 16],
    ["198.18.0.0", 15],
    ["224.0.0.0", 4],
    ["240.0.0.0", 4],
  ];
  return ranges.some(([base, bits]) => {
    const baseNum = ipv4ToNumber(base);
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (n & mask) === (baseNum & mask);
  });
}

function isPrivateIpv6(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (h === "::" || h === "::1") return true;
  if (h.startsWith("fc") || h.startsWith("fd")) return true; // unique local
  if (h.startsWith("fe80")) return true; // link-local
  if (h.startsWith("::ffff:")) {
    const mapped = h.slice("::ffff:".length);
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(mapped)) return isPrivateIpv4(mapped);
  }
  return false;
}

export type UrlCheckResult =
  | { ok: true; url: string; normalized: string; hostname: string }
  | { ok: false; reason: string };

/**
 * Memvalidasi URL sumber: protokol http/https, host publik, tanpa kredensial.
 * Mengembalikan juga bentuk ternormalisasi untuk deteksi duplikasi.
 */
export function checkSourceUrl(raw: string): UrlCheckResult {
  const cleaned = stripUnsafeUrlChars(raw);

  let parsed: URL;
  try {
    parsed = new URL(cleaned);
  } catch {
    return { ok: false, reason: "Tautan tidak valid. Contoh: https://contoh.go.id/pengumuman" };
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return { ok: false, reason: "Tautan harus diawali http:// atau https://" };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, reason: "Tautan tidak boleh memuat nama pengguna atau kata sandi." };
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith(".localhost")) {
    return { ok: false, reason: "Tautan ke alamat lokal tidak diizinkan." };
  }
  if (hostname.includes(":")) {
    if (isPrivateIpv6(hostname)) {
      return { ok: false, reason: "Tautan ke alamat jaringan privat tidak diizinkan." };
    }
  } else if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    if (isPrivateIpv4(hostname)) {
      return { ok: false, reason: "Tautan ke alamat jaringan privat tidak diizinkan." };
    }
  }
  // Host tanpa titik (mis. "intranet") tidak dapat dipublikasikan.
  if (!hostname.includes(".")) {
    return { ok: false, reason: "Tautan harus menggunakan domain publik." };
  }

  return {
    ok: true,
    url: parsed.toString(),
    normalized: normalizeSourceUrl(parsed),
    hostname,
  };
}

/**
 * Normalisasi URL untuk deteksi duplikasi:
 * lowercase host, hapus fragment, hapus parameter pelacakan, hapus trailing slash.
 */
export function normalizeSourceUrl(url: URL | string): string {
  const parsed = typeof url === "string" ? new URL(url) : new URL(url.toString());
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const path = parsed.pathname.replace(/\/+$/, "");
  const params = new URLSearchParams(parsed.search);
  const trackingPrefixes = ["utm_", "fbclid", "gclid", "igshid", "ref", "ref_src"];
  for (const key of Array.from(params.keys())) {
    const lower = key.toLowerCase();
    if (trackingPrefixes.some((p) => lower === p || lower.startsWith(p))) {
      params.delete(key);
    }
  }
  params.sort();
  const query = params.toString();
  const port =
    parsed.port && !((parsed.protocol === "https:" && parsed.port === "443") || (parsed.protocol === "http:" && parsed.port === "80"))
      ? `:${parsed.port}`
      : "";
  return `${parsed.protocol}//${host}${port}${path}${query ? `?${query}` : ""}`;
}

/** Domain untuk ditampilkan di UI (tanpa www). */
export function displayHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
