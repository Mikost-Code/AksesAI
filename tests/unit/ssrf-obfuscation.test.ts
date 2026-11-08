import { describe, expect, it } from "vitest";

import { checkSourceUrl } from "@/lib/security/ssrf-guard";

/**
 * Regresi SSRF: `new URL()` menormalkan IPv4 bentuk alternatif (desimal, hex,
 * oktal, `127.1`) menjadi dotted-quad sebelum guard melihatnya, sehingga
 * pemeriksaan rentang IP tetap tepat. Tes ini mengunci sifat itu — bila
 * normalisasi berubah, guard tidak boleh diam-diam melewatkan loopback.
 */

describe("checkSourceUrl menolak alamat internal", () => {
  const blocked = [
    "http://127.0.0.1/",
    "http://127.1/",
    "http://0x7f000001/",
    "http://2130706433/",
    "http://017700000001/",
    "http://169.254.169.254/latest/meta-data/",
    "http://metadata.google.internal/",
    "http://localhost/",
    "http://LOCALHOST/",
    "http://localhost.:8080/",
    "http://[::1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://10.0.0.5/",
    "http://192.168.1.1/",
    "http://172.16.4.4/",
    "http://100.64.0.1/",
    "http://0.0.0.0/",
    "http://intranet/",
    "http://user:pass@contoh.go.id/",
    "file:///etc/passwd",
    "javascript:alert(1)",
    "ftp://contoh.go.id/",
  ];

  it.each(blocked)("%s ditolak", (url) => {
    expect(checkSourceUrl(url).ok).toBe(false);
  });

  it("domain publik yang sah tetap diterima", () => {
    expect(checkSourceUrl("https://contoh.go.id/pengumuman").ok).toBe(true);
    expect(checkSourceUrl("https://platform.openai.com/docs/pricing").ok).toBe(true);
  });
});
