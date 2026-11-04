import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { serverEnv } from "@/lib/env-server";

/**
 * Rate limiting (docs/SECURITY.md §7).
 *
 * Prioritas: Upstash Redis (sliding window). Bila kredensial tidak tersedia,
 * fallback ke tabel Postgres `rate_limit_buckets` lewat RPC
 * `check_rate_limit` (lihat DATABASE_SCHEMA) agar situs tidak gagal.
 */

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  /** Detik sampai boleh mencoba lagi (0 jika tidak dibatasi). */
  retryAfterSeconds: number;
  /** Sumber keputusan, untuk logging. */
  backend: "upstash" | "postgres" | "disabled";
};

export type RateLimitRule = {
  /** Nama bucket, mis. "reports:ip". */
  name: string;
  /** Maksimal permintaan pada window. */
  limit: number;
  /** Window dalam detik. */
  windowSeconds: number;
};

export const RATE_LIMITS = {
  reportsPerIp: { limit: 5, windowSeconds: 3600 },
  reportPerProgramPerIp: { limit: 1, windowSeconds: 86400 },
  submissionsPerUserPerDay: { limit: 10, windowSeconds: 86400 },
  searchPerIp: { limit: 60, windowSeconds: 60 },
  loginCallback: { limit: 10, windowSeconds: 60 },
  staffActions: { limit: 60, windowSeconds: 60 },
  contributionsDraft: { limit: 30, windowSeconds: 60 },
} as const satisfies Record<string, { limit: number; windowSeconds: number }>;

type UpstashCache = {
  limiters: Map<string, Ratelimit>;
  redis: Redis;
};

let upstash: UpstashCache | null | undefined;

function getUpstash(): UpstashCache | null {
  if (upstash !== undefined) return upstash;
  const env = serverEnv();
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    upstash = null;
    return null;
  }
  upstash = {
    redis: new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    }),
    limiters: new Map(),
  };
  return upstash;
}

function getLimiter(rule: RateLimitRule): Ratelimit | null {
  const cache = getUpstash();
  if (!cache) return null;
  const key = `${rule.name}:${rule.limit}:${rule.windowSeconds}`;
  const existing = cache.limiters.get(key);
  if (existing) return existing;
  const limiter = new Ratelimit({
    redis: cache.redis,
    limiter: Ratelimit.slidingWindow(rule.limit, `${rule.windowSeconds} s`),
    prefix: `aksesai:rl:${rule.name}`,
    analytics: false,
  });
  cache.limiters.set(key, limiter);
  return limiter;
}

/** Rate limit berbasis Upstash; mengembalikan null bila tidak dikonfigurasi. */
export async function rateLimitUpstash(
  rule: RateLimitRule,
  identifier: string,
): Promise<RateLimitResult | null> {
  const limiter = getLimiter(rule);
  if (!limiter) return null;
  try {
    const result = await limiter.limit(identifier);
    const resetInMs = Math.max(0, result.reset - Date.now());
    return {
      success: result.success,
      remaining: result.remaining,
      retryAfterSeconds: result.success ? 0 : Math.ceil(resetInMs / 1000),
      backend: "upstash",
    };
  } catch (error) {
    // Jangan gagalkan permintaan hanya karena Redis bermasalah; log & fallback.
    console.error("[ratelimit] Upstash gagal, fallback ke Postgres", {
      rule: rule.name,
      error: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

export function isUpstashConfigured(): boolean {
  return getUpstash() !== null;
}

/** Menggabungkan hasil Upstash/fallback menjadi objek hasil akhir. */
export function toRateLimitResult(
  result: RateLimitResult | null,
  fallback: RateLimitResult,
): RateLimitResult {
  return result ?? fallback;
}
