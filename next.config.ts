import type { NextConfig } from "next";

/**
 * Security headers (docs/SECURITY.md §8).
 *
 * CSP memakai `'unsafe-inline'` untuk script karena Next.js App Router
 * meng-inline bootstrap script; nonce per-request membutuhkan middleware CSP
 * yang memaksa semua halaman dinamis (bertentangan dengan ISR halaman publik).
 * Compensating controls: tidak ada `dangerouslySetInnerHTML` untuk konten
 * pengguna dan `script-src` dibatasi ke 'self' + domain Turnstile.
 */
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "img-src 'self' https://avatars.githubusercontent.com data: blob:",
      "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-src https://challenges.cloudflare.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      // Tidak ada direktif `form-action` secara sengaja.
      // Chromium menerapkannya pada URL di header `Location` dari respons POST,
      // bukan hanya tujuan form. Alur login memakai POST /auth/sign-in yang
      // merespons 303 ke Supabase → dengan `form-action 'self'` redirect itu
      // diblokir dan tombol "Lanjutkan dengan GitHub" tampak mati (bug nyata
      // yang terdeteksi lewat uji Playwright). Semua redirect OAuth tetap
      // berasal dari server (allowlist `next` + `redirectTo`), sehingga
      // CSRF login tidak bergantung pada direktif ini.
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        pathname: "/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
