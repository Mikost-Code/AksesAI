import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { isSupabaseConfigured, requireSupabasePublicEnv } from "@/lib/env";

export function hasSupabaseAuthEnv(): boolean {
  return isSupabaseConfigured();
}

/**
 * Opsi cookie sesi.
 *
 * `@supabase/ssr` menulis cookie berisi token sesi. Default pustaka tidak
 * menandai `httpOnly`/`secure`, sehingga skrip (XSS) dapat membacanya dan
 * cookie ikut terkirim lewat HTTP biasa. Karena aplikasi ini hanya diakses
 * via HTTPS di produksi, kedua flag itu aman disetel eksplisit.
 *
 * Catatan: alur PKCE memerlukan `code_verifier` yang ditulis server dan
 * dibaca server pada callback, jadi `httpOnly` tidak memutus alur OAuth.
 */
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

/**
 * Supabase client untuk Server Components / Server Actions / Route Handlers.
 * Membaca sesi dari cookie (dikelola @supabase/ssr). RLS berlaku.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  const { url, anonKey } = requireSupabasePublicEnv();

  return createServerClient(url, anonKey, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
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
