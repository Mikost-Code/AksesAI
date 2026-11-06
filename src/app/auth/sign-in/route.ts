import { NextResponse, type NextRequest } from "next/server";

import { checkRateLimitWithFallback } from "@/lib/security/rate-limit-server";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/ip-hash";
import { safeInternalPath } from "@/lib/security/safe-redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clientEnv, isSupabaseConfigured } from "@/lib/env";

/**
 * Mulai login OAuth GitHub.
 * POST (bukan GET) agar tidak dapat dipicu via gambar/prefetch.
 * Rate limit per IP untuk mencegah penyalahgunaan callback.
 *
 * `next` divalidasi lewat `safeInternalPath` — lihat catatan di modul tersebut
 * mengapa daftar bypass yang ditolak begitu spesifik.
 */

export async function POST(request: NextRequest) {
  const siteUrl = clientEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(
      new URL("/login?reason=unconfigured", siteUrl),
      303,
    );
  }

  const ip = getClientIp(request.headers);
  const limited = await checkRateLimitWithFallback(
    "login-callback",
    ip,
    { name: "login-callback", ...RATE_LIMITS.loginCallback },
  );
  if (!limited.success) {
    return NextResponse.redirect(new URL("/login?error=auth_failed", siteUrl), 303);
  }

  const formData = await request.formData();
  const next = safeInternalPath(formData.get("next"));

  const supabase = await createSupabaseServerClient();
  const redirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo,
      scopes: "read:user",
    },
  });

  if (error || !data.url) {
    console.error("[auth] Gagal memulai OAuth:", error?.message ?? "no-url");
    return NextResponse.redirect(new URL("/login?error=auth_failed", siteUrl), 303);
  }

  return NextResponse.redirect(data.url, 303);
}
