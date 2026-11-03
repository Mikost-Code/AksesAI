import "server-only";

import { createHash } from "node:crypto";

import { requireServerEnv } from "@/lib/env-server";

/**
 * Hash IP pelapor: sha256(ip + IP_HASH_SALT).
 * IP mentah tidak pernah disimpan (docs/SECURITY.md §1).
 * Retensi hash: 90 hari (cron pembersihan).
 */
export function hashIpAddress(ip: string): string {
  const salt = requireServerEnv("IP_HASH_SALT");
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/**
 * Mengambil IP klien dari header proxy.
 * Vercel menempatkan IP di `x-forwarded-for` (entri pertama) atau `x-real-ip`.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "0.0.0.0";
}
