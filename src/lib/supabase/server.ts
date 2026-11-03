import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { isSupabaseConfigured, requireSupabasePublicEnv } from "@/lib/env";

export function hasSupabaseAuthEnv(): boolean {
  return isSupabaseConfigured();
}

/**
 * Supabase client untuk Server Components / Server Actions / Route Handlers.
 * Membaca sesi dari cookie (dikelola @supabase/ssr). RLS berlaku.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  const { url, anonKey } = requireSupabasePublicEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Dipanggil dari Server Component: cookie hanya dapat diubah pada
          // middleware / route handler / server action.
        }
      },
    },
  });
}

/**
 * Client anon tanpa sesi — untuk halaman publik yang di-cache (ISR).
 * Hanya boleh membaca data publik (RLS + status verified/expired).
 */
export function createSupabaseAnonClient(): SupabaseClient {
  const { url, anonKey } = requireSupabasePublicEnv();
  return createServerClient(url, anonKey, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}
