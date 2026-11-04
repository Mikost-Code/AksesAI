import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { safeInternalPath } from "@/lib/security/safe-redirect";

/**
 * Proxy (sebelumnya `middleware.ts` pada Next.js < 16).
 *
 * Lapisan pertama keamanan rute: menyegarkan sesi Supabase + redirect rute
 * terproteksi. BUKAN satu-satunya pemeriksaan — server action/route handler
 * wajib memanggil `requireRole`, dan RLS/RPC menjadi pertahanan terakhir.
 */

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/review",
  "/moderation",
  "/admin",
] as const;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  if (!isConfigured) {
    // Env belum diisi (mis. build/preview tanpa Supabase): area pengguna
    // dialihkan ke /login dengan alasan jelas. Halaman publik tetap jalan.
    if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = `?next=${encodeURIComponent(pathname)}&reason=unconfigured`;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // WAJIB: getUser() memvalidasi token ke Supabase dan menyegarkan cookie sesi.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  // Pengguna yang sudah login tidak perlu melihat /login.
  if (pathname === "/login" && user) {
    const safeNext = safeInternalPath(request.nextUrl.searchParams.get("next"));
    // Ditargetkan terhadap origin yang sudah divalidasi agar query & hash
    // ikut terbawa tanpa parsing manual (yang rawan `undefined`).
    const target = new URL(safeNext, request.nextUrl.origin);
    const url = request.nextUrl.clone();
    url.pathname = target.pathname;
    url.search = target.search;
    url.hash = target.hash;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
