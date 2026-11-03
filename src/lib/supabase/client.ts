"use client";

import { createBrowserClient } from "@supabase/ssr";

import { requireSupabasePublicEnv } from "@/lib/env";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Supabase client browser (anon key + sesi cookie). RLS berlaku.
 * Dipakai untuk operasi auth (sign in/out) dan realtime bila diperlukan.
 */
export function createSupabaseBrowserClient() {
  if (browserClient) return browserClient;
  const { url, anonKey } = requireSupabasePublicEnv();
  browserClient = createBrowserClient(url, anonKey);
  return browserClient;
}
