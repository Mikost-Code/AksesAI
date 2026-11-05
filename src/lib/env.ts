import { z } from "zod";

/**
 * Validasi environment PUBLIK (aman untuk klien).
 *
 * Hanya berisi variabel `NEXT_PUBLIC_*`. Skema server/rahasia ada di
 * `src/lib/env-server.ts` (diberi `server-only`) agar tidak pernah ter-bundel
 * ke JavaScript klien.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_CF_BEACON_TOKEN: z.string().min(1).optional(),
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
    NEXT_PUBLIC_CF_BEACON_TOKEN:
      process.env.NEXT_PUBLIC_CF_BEACON_TOKEN || undefined,
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
