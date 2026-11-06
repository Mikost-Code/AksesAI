import "server-only";

import { createHash } from "node:crypto";

import { requireServerEnv } from "@/lib/env-server";
import { parseClientIp } from "@/lib/security/client-ip";

/**
 * Hash IP pelapor: sha256(salt + purpose + ip).
 * IP mentah tidak pernah disimpan (docs/SECURITY.md §1).
 * Retensi hash: 90 hari (cron pembersihan).
 *
 * `purpose` memisahkan ruang hash per konteks (laporan, umpan balik, rate
 * limit anonim). Tanpa pemisahan, hash yang sama dapat muncul di dua tabel
 * dan memungkinkan korelasi silang — dengan pemisahan per-tujuan,
 * penyimpanan yang sama tidak dapat dihubungkan antar fitur.
 */
export function hashIpAddress(ip: string, purpose: string = "default"): string {
  const salt = requireServerEnv("IP_HASH_SALT");
  return createHash("sha256").update(`${salt}:${purpose}:${ip}`).digest("hex");
}

/**
 * Mengambil IP klien dari header proxy.
 *
 * Logika parsing (dan alasan keamanannya — terutama mengapa entri TERAKHIR
 * `x-forwarded-for` dipakai, bukan yang pertama) tinggal di
 * `lib/security/client-ip.ts` agar dapat diuji unit tanpa memuat modul ini.
 */
export function getClientIp(headers: Headers): string {
  return parseClientIp(headers);
}
