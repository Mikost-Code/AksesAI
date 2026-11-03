import { z } from "zod";

/**
 * Validasi environment variable.
 *
 * - `clientEnv`: hanya variabel `NEXT_PUBLIC_*` (aman dipublikasikan).
 * - `serverEnv`: rahasia; dipanggil lazy di kode server sehingga `next build`
 *   tidak gagal saat env rahasia belum diisi (mis. CI tanpa Supabase).
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1).optional(),
});

export type ClientEnv = z.infer<typeof publicSchema>;

let cachedClientEnv: ClientEnv | null = null;

export function clientEnv(): ClientEnv {
  if (cachedClientEnv) return cachedClientEnv;
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || undefined,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || undefined,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY:
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined,
  });
  if (!parsed.success) {
    throw new Error(
      `Environment publik tidak valid: ${parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }
  cachedClientEnv = parsed.data;
  return cachedClientEnv;
}

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
    SUPABASE_SERVICE_ROLE_KEY:
      process.env.SUPABASE_SERVICE_ROLE_KEY || undefined,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || undefined,
    UPSTASH_REDIS_REST_TOKEN:
      process.env.UPSTASH_REDIS_REST_TOKEN || undefined,
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

/** Apakah Supabase sudah dikonfigurasi (dipakai untuk empty state jujur). */
export function isSupabaseConfigured(): boolean {
  const env = clientEnv();
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** URL & anon key Supabase; melempar error jika belum dikonfigurasi. */
export function requireSupabasePublicEnv(): { url: string; anonKey: string } {
  const env = clientEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error(
      "Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di .env.local",
    );
  }
  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
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
