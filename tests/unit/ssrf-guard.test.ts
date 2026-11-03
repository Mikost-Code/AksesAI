import { describe, expect, it } from "vitest";

import { checkSourceUrl, displayHost, normalizeSourceUrl } from "@/lib/security/ssrf-guard";

describe("checkSourceUrl", () => {
  it("menerima URL https publik", () => {
    const result = checkSourceUrl("https://www.kemensos.go.id/pengumuman");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.hostname).toBe("www.kemensos.go.id");
      expect(result.normalized).toContain("kemensos.go.id");
    }
  });

  it("menerima http", () => {
    expect(checkSourceUrl("http://contoh.go.id").ok).toBe(true);
  });

  it("menolak protokol javascript", () => {
    expect(checkSourceUrl("javascript:alert(1)").ok).toBe(false);
  });

  it("menolak protokol data", () => {
    expect(checkSourceUrl("data:text/html,hi").ok).toBe(false);
  });

  it("menolak localhost", () => {
    expect(checkSourceUrl("http://localhost/admin").ok).toBe(false);
  });

  it("menolak IP loopback & private", () => {
    expect(checkSourceUrl("http://127.0.0.1/x").ok).toBe(false);
    expect(checkSourceUrl("http://10.0.0.5/x").ok).toBe(false);
    expect(checkSourceUrl("http://192.168.1.1/x").ok).toBe(false);
    expect(checkSourceUrl("http://169.254.169.254/latest/meta-data").ok).toBe(false);
    expect(checkSourceUrl("http://[::1]/x").ok).toBe(false);
  });

  it("menolak host tanpa titik", () => {
    expect(checkSourceUrl("http://intranet/x").ok).toBe(false);
  });

  it("menolak URL dengan kredensial", () => {
    expect(checkSourceUrl("https://user:pass@contoh.go.id").ok).toBe(false);
  });

  it("menerima IP publik", () => {
    expect(checkSourceUrl("http://8.8.8.8/x").ok).toBe(true);
  });
});

describe("normalizeSourceUrl", () => {
  it("menghapus www, fragment, dan tracking params", () => {
    const normalized = normalizeSourceUrl(
      "https://www.Contoh.go.id/berita/?utm_source=x&b=2&a=1#bagian",
    );
    expect(normalized).toBe("https://contoh.go.id/berita?a=1&b=2");
  });

  it("menghapus trailing slash", () => {
    expect(normalizeSourceUrl("https://contoh.go.id/berita/")).toBe(
      "https://contoh.go.id/berita",
    );
  });

  it("dua URL berbeda pelacakan menghasilkan normalisasi sama", () => {
    const a = normalizeSourceUrl("https://contoh.go.id/x?utm_source=a");
    const b = normalizeSourceUrl("https://contoh.go.id/x?fbclid=b");
    expect(a).toBe(b);
  });
});

describe("displayHost", () => {
  it("menghapus www", () => {
    expect(displayHost("https://www.kemensos.go.id/x")).toBe("kemensos.go.id");
  });

  it("mengembalikan input jika URL tidak valid", () => {
    expect(displayHost("bukan url")).toBe("bukan url");
  });
});
