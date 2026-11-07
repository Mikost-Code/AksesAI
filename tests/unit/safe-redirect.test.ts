import { describe, expect, it } from "vitest";

import {
  DEFAULT_AFTER_LOGIN,
  resolveAuthOrigin,
  safeInternalPath,
} from "@/lib/security/safe-redirect";

describe("safeInternalPath", () => {
  it("meloloskan path internal biasa", () => {
    expect(safeInternalPath("/dashboard")).toBe("/dashboard");
    expect(safeInternalPath("/admin/pengguna")).toBe("/admin/pengguna");
  });

  it("mempertahankan query dan hash", () => {
    expect(safeInternalPath("/info?q=gemini")).toBe("/info?q=gemini");
    expect(safeInternalPath("/info#hasil")).toBe("/info#hasil");
  });

  it("memakai fallback untuk nilai kosong / bukan string", () => {
    expect(safeInternalPath(null)).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeInternalPath(undefined)).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeInternalPath("")).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeInternalPath("   ")).toBe(DEFAULT_AFTER_LOGIN);
  });

  // Inti pertahanan open redirect: semua varian berikut wajib jatuh ke fallback.
  it.each([
    ["protokol absolut", "https://evil.example"],
    ["http absolut", "http://evil.example/path"],
    ["skema-relative", "//evil.example"],
    ["skema-relative bertriple slash", "///evil.example"],
    ["backslash", "/\\evil.example"],
    ["backslash ganda", "\\\\evil.example"],
    ["backslash ter-encode", "/%5Cevil.example"],
    ["slash ter-encode", "/%2F%2Fevil.example"],
    ["tab di awal", "\t/\\evil.example"],
    ["newline", "/dashboard\nLocation: https://evil.example"],
    ["NUL", "/dash\u0000board"],
    ["javascript URI", "javascript:alert(1)"],
    ["data URI", "data:text/html,<script>alert(1)</script>"],
    ["tanpa slash awal", "dashboard"],
    ["titik-dot traversal ke protokol", "/../..//evil.example"],
  ])("menolak %s", (_label, value) => {
    const result = safeInternalPath(value);
    expect(result).toBe(DEFAULT_AFTER_LOGIN);
  });

  it("tidak pernah mengembalikan string yang mengandung backslash", () => {
    const inputs = ["/a\\b", "\\\\host", "/%5C%5Chost"];
    for (const input of inputs) {
      expect(safeInternalPath(input)).not.toContain("\\");
    }
  });

  it("hasil selalu diawali satu slash (tidak bisa jadi host)", () => {
    const inputs = ["/dashboard", "//evil", "/\\evil", "https://evil", "", "/a?b=c"];
    for (const input of inputs) {
      const out = safeInternalPath(input);
      expect(out.startsWith("/")).toBe(true);
      expect(out.startsWith("//")).toBe(false);
    }
  });
});

describe("resolveAuthOrigin", () => {
  // Kasus nyata yang memicu fungsi ini: `NEXT_PUBLIC_SITE_URL` menunjuk
  // localhost:3000, sementara server uji berjalan di port 3117. Callback
  // mengirim pengguna ke port yang tidak menjalankan apa pun sehingga login
  // tampak gagal padahal sesinya sudah terbentuk.
  it("memakai origin request saat host sama walau port berbeda", () => {
    expect(
      resolveAuthOrigin(
        new URL("http://localhost:3117/auth/callback"),
        "http://localhost:3000",
      ),
    ).toBe("http://localhost:3117");
  });

  it("menerima subdomain sebagai satu situs (domain pratinjau)", () => {
    expect(
      resolveAuthOrigin(
        new URL("https://aksesai-id-git-fitur.vercel.app/auth/callback"),
        "https://vercel.app",
      ),
    ).toBe("https://aksesai-id-git-fitur.vercel.app");
  });

  it("menolak Host palsu dan kembali ke SITE_URL", () => {
    // Header Host dipalsukan ke domain penyerang: jangan pernah dipakai.
    expect(
      resolveAuthOrigin(
        new URL("https://evil.example/auth/callback"),
        "https://aksesai-id.vercel.app",
      ),
    ).toBe("https://aksesai-id.vercel.app");
  });

  it("tidak tertipu domain yang hanya berakhiran sama", () => {
    expect(
      resolveAuthOrigin(
        new URL("https://evil-aksesai-id.vercel.app/auth/callback"),
        "https://aksesai-id.vercel.app",
      ),
    ).toBe("https://aksesai-id.vercel.app");
  });

  it("jatuh ke origin request bila SITE_URL tidak valid", () => {
    expect(
      resolveAuthOrigin(new URL("http://localhost:3117/auth/callback"), "bukan-url"),
    ).toBe("http://localhost:3117");
  });
});
