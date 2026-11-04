import { NextResponse, type NextRequest } from "next/server";

import { clientEnv, isSupabaseConfigured } from "@/lib/env";
import { safeInternalPath } from "@/lib/security/safe-redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Callback OAuth GitHub.
 *
 * Supabase sudah menukar `code` menjadi sesi saat route ini dipanggil
 * (cookie `sb-*-auth-token` diset oleh @supabase/ssr saat
 * `exchangeCodeForSession`). Di sini kita:
 * - mendukung PKCE `code_verifier` (Supabase mengirim `?code=`),
 * - membatasi nilai `next` agar hanya path internal (anti open redirect),
 * - memverifikasi sesi terbuat,
 * - mengembalikan pengguna ke tujuan semula.
 */
export async function GET(request: NextRequest) {
  const siteUrl = clientEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const url = new URL(request.url);

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/login?reason=unconfigured", siteUrl));
  }

  const errorParam = url.searchParams.get("error");
  if (errorParam) {
    return NextResponse.redirect(new URL("/login?error=auth_failed", siteUrl));
  }

  const code = url.searchParams.get("code");
  const next = safeInternalPath(url.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=auth_failed", siteUrl));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth] exchangeCodeForSession gagal:", error.message);
    return NextResponse.redirect(new URL("/login?error=auth_failed", siteUrl));
  }

  return NextResponse.redirect(new URL(next, siteUrl));
}
