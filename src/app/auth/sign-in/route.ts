import { NextResponse, type NextRequest } from "next/server";

import { rateLimitUpstash, RATE_LIMITS } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/ip-hash";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clientEnv, isSupabaseConfigured } from "@/lib/env";

/**
 * Mulai login OAuth GitHub.
 * POST (bukan GET) agar tidak dapat dipicu via gambar/prefetch.
 * Rate limit per IP untuk mencegah penyalahgunaan callback.
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
  const limited = await rateLimitUpstash(
    { name: "login-callback", ...RATE_LIMITS.loginCallback },
    ip,
  );
  if (limited && !limited.success) {
    return NextResponse.redirect(new URL("/login?error=auth_failed", siteUrl), 303);
  }

  const formData = await request.formData();
  const nextRaw = formData.get("next");
  const next =
    typeof nextRaw === "string" && nextRaw.startsWith("/") && !nextRaw.startsWith("//")
      ? nextRaw
      : "/dashboard";

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
