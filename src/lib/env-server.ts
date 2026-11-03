import "server-only";

import { z } from "zod";

/**
 * Validasi environment SERVER (rahasia) — PHASE 7.
 *
 * Dipisahkan dari `src/lib/env.ts` dan diberi `server-only` agar skema ini
 * (beserta nama variabel seperti SUPABASE_SERVICE_ROLE_KEY) TIDAK pernah ikut
 * ter-bundel ke JavaScript klien. Sebelumnya keduanya berada di satu modul
 * sehingga klien yang mengimpor `clientEnv` ikut membawa skema server.
 *
 * Dipanggil lazy di kode server sehingga `next build` tetap berhasil saat env
 * rahasia belum diisi (mis. CI tanpa Supabase).
 */

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  UPSTASH_REDIS_REST_URL: z.url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(32).optional(),
  IP_HASH_SALT: z.string().min(16).optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cachedServerEnv: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;
  const parsed = serverSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || undefined,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || undefined,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || undefined,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY || undefined,
    CRON_SECRET: process.env.CRON_SECRET || undefined,
    IP_HASH_SALT: process.env.IP_HASH_SALT || undefined,
  });
  if (!parsed.success) {
    throw new Error(
      `Environment server tidak valid: ${parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }
  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

export function requireServerEnv<K extends keyof ServerEnv>(
  key: K,
): NonNullable<ServerEnv[K]> {
  const value = serverEnv()[key];
  if (!value) {
    throw new Error(`Environment server wajib diisi: ${key}`);
  }
  return value as NonNullable<ServerEnv[K]>;
}
