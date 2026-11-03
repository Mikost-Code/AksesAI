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
 *  3. Fail-open terkendali (izinkan, tandai backend "disabled") — agar gangguan
 *     infrastruktur tidak mematikan seluruh situs. Dinasionalkan di log.
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

  // Tanpa Upstash maupun service_role: jangan blokir pengguna sah.
  const hasAnyBackend = Boolean(serverEnv().UPSTASH_REDIS_REST_URL);
  if (!hasAnyBackend && !hasServiceRoleEnv()) {
    console.warn("[ratelimit] tidak ada backend rate limit; permintaan diizinkan.", {
      bucket: bucketPrefix,
    });
  }
  return { success: true, remaining: 1, retryAfterSeconds: 0, backend: "disabled" };
}
