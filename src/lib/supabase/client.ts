"use client";

import { createBrowserClient } from "@supabase/ssr";

import { requireSupabasePublicEnv } from "@/lib/env";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Supabase client browser (anon key + sesi cookie). RLS berlaku.
 * Dipakai untuk operasi auth (sign in/out) dan realtime bila diperlukan.
 *
 * `cookieOptions` disamakan dengan server client agar konsisten: token sesi
 * tidak dapat dibaca JavaScript (`httpOnly`) dan hanya terkirim via HTTPS
 * di produksi (`secure`).
 */
export function createSupabaseBrowserClient() {
  if (browserClient) return browserClient;
  const { url, anonKey } = requireSupabasePublicEnv();
  browserClient = createBrowserClient(url, anonKey, {
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
  });
  return browserClient;
}
