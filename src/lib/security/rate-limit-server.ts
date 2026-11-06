import "server-only";

import {
  rateLimitUpstash,
  type RateLimitResult,
  type RateLimitRule,
} from "@/lib/security/rate-limit";
import { serverEnv } from "@/lib/env-server";
import { createServiceRoleClient, hasServiceRoleEnv } from "@/lib/supabase/admin";

/**
 * Rate limit dengan fallback berlapis.
 *
 * Urutan:
 *  1. Upstash Redis (sliding window) — bila dikonfigurasi.
 *  2. RPC Postgres `check_rate_limit` lewat service_role — bila service_role ada.
 *  3. Tidak ada backend → FAIL-CLOSED di production.
 *
 * Mengapa gagal-tertutup di production: rate limit adalah satu-satunya lapisan
 * yang menahan penyalahgunaan (spam laporan, submission massal). Bila kita
 * "fail-open" ketika tidak ada backend, lingkungan production yang salah
 * konfigurasi justru membuka pintu bagi banjir permintaan, dan kegagalan itu
 * tidak terlihat (situs tetap normal). Lebih baik permintaan gagal dengan
 * pesan "coba lagi" dan operator melihat alert di log. Di development /
 * test diizinkan agar tidak menghambat pekerjaan lokal.
 *
 * Catatan: RPC `check_rate_limit` memakai tabel fallback (lihat migrasi 0002).
 */
export async function checkRateLimitWithFallback(
  bucketPrefix: string,
  identifier: string,
  rule: RateLimitRule,
): Promise<RateLimitResult> {
  const upstash = await rateLimitUpstash(rule, `${bucketPrefix}:${identifier}`);
  if (upstash) return upstash;

  if (hasServiceRoleEnv()) {
    try {
      const admin = createServiceRoleClient();
      const { data, error } = await admin.rpc("check_rate_limit", {
        p_bucket: `${bucketPrefix}:${identifier}`,
        p_limit: rule.limit,
        p_window_seconds: rule.windowSeconds,
      });
      if (!error && typeof data === "boolean") {
        return {
          success: data,
          remaining: data ? 1 : 0,
          retryAfterSeconds: data ? 0 : rule.windowSeconds,
          backend: "postgres",
        };
      }
      if (error) {
        console.error("[ratelimit] fallback Postgres gagal:", error.message);
      }
    } catch (error) {
      console.error(
        "[ratelimit] fallback Postgres exception:",
        error instanceof Error ? error.message : "unknown",
      );
    }
  }

  const hasUpstash = Boolean(serverEnv().UPSTASH_REDIS_REST_URL);
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    // Tidak ada backend yang dapat memutuskan → tolak, jangan buka pintu.
    console.error("[ratelimit] TIDAK ADA backend rate limit di production — permintaan DITOLAK.", {
      bucket: bucketPrefix,
      upstash: hasUpstash,
      postgres: hasServiceRoleEnv(),
    });
    return {
      success: false,
      remaining: 0,
      retryAfterSeconds: 60,
      backend: "disabled",
    };
  }

  console.warn("[ratelimit] tidak ada backend rate limit (non-production); permintaan diizinkan.", {
    bucket: bucketPrefix,
  });
  return { success: true, remaining: 1, retryAfterSeconds: 0, backend: "disabled" };
}
