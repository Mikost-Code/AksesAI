/**
 * Validasi path tujuan setelah login (anti open redirect).
 *
 * Semua nilai yang dipakai untuk `redirectTo` OAuth maupun `NextResponse.redirect`
 * HARUS lewat fungsi ini. Tujuannya menutup varian bypass berikut:
 *
 *   `https://evil.com`      → protokol absolut
 *   `//evil.com`            → skema-relative
 *   `/\evil.com`            → backslash dinormalkan browser menjadi `//`
 *   `/%5Cevil.com`          → backslash ter-encode
 *   `/‮evil.com`            → karakter kontrol / bidi
 *   `  /dashboard`          → whitespace penggeser parsing
 *
 * Nilai yang tidak lolos selalu jatuh ke `DEFAULT_AFTER_LOGIN`.
 */

export const DEFAULT_AFTER_LOGIN = "/dashboard";

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;

export function safeInternalPath(
  raw: FormDataEntryValue | string | null | undefined,
): string {
  if (typeof raw !== "string") return DEFAULT_AFTER_LOGIN;

  const value = raw.trim();
  if (!value) return DEFAULT_AFTER_LOGIN;

  // Wajib path absolut-relatif: diawali tepat satu slash.
  if (!value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_AFTER_LOGIN;
  }

  // Backslash: WHATWG URL memperlakukan `\` seperti `/` pada skema khusus,
  // sehingga `/\evil.com` berubah menjadi `//evil.com`.
  if (value.includes("\\")) return DEFAULT_AFTER_LOGIN;

  // Karakter kontrol (newline, tab, NUL) membuka celah URL/header splitting.
  if (CONTROL_CHARS.test(value)) return DEFAULT_AFTER_LOGIN;

  // Verifikasi akhir: setelah diparse terhadap origin dummy, host tidak boleh
  // berubah. Ini menangkap varian ter-encode (`%2F%2Fevil.com`).
  try {
    const probe = "http://internal.invalid";
    const resolved = new URL(value, probe);
    if (resolved.origin !== probe) return DEFAULT_AFTER_LOGIN;

    let decoded: string;
    try {
      decoded = decodeURIComponent(resolved.pathname);
    } catch {
      // Percent-encoding rusak → tolak, jangan tebak.
      return DEFAULT_AFTER_LOGIN;
    }
    if (decoded.includes("\\") || decoded.startsWith("//")) {
      return DEFAULT_AFTER_LOGIN;
    }

    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return DEFAULT_AFTER_LOGIN;
  }
}
