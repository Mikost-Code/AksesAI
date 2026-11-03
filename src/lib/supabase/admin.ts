import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { isSupabaseConfigured, requireServerEnv, requireSupabasePublicEnv } from "@/lib/env";

/**
 * SERVICE_ROLE client — melewati RLS. HANYA untuk operasi server yang memang
 * tidak dapat dilakukan sebagai pengguna: laporan anonim, cron, dan tugas
 * sistem lain yang terdokumentasi.
 *
 * Aturan:
 * - Jangan pernah mengembalikan data mentah ke klien tanpa otorisasi eksplisit.
 * - Bagian yang memakainya wajib komentar `// SERVICE_ROLE: alasan`.
 * - Variabel hanya ada di server; dilarang memakai prefix NEXT_PUBLIC_.
 */
export function createServiceRoleClient(): SupabaseClient {
  const { url } = requireSupabasePublicEnv();
  const serviceKey = requireServerEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function hasServiceRoleEnv(): boolean {
  return isSupabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
