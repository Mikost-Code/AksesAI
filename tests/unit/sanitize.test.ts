import { describe, expect, it } from "vitest";

import { sanitizeSingleLine, sanitizeText, stripUnsafeUrlChars } from "@/lib/security/sanitize";

describe("sanitizeText", () => {
  it("menghapus karakter kontrol", () => {
    expect(sanitizeText("halo\u0000\u0007 dunia")).toBe("halo dunia");
  });

  it("menormalkan spasi berlebih", () => {
    expect(sanitizeText("a    b\t\tc")).toBe("a b c");
  });

  it("mempertahankan newline tunggal & menggabung newline berlebih", () => {
    expect(sanitizeText("baris1\n\n\n\nbaris2")).toBe("baris1\n\nbaris2");
  });

  it("men-trim whitespace di awal/akhir", () => {
    expect(sanitizeText("   isi   ")).toBe("isi");
  });

  it("menangani CRLF menjadi LF", () => {
    expect(sanitizeText("a\r\nb")).toBe("a\nb");
  });

  it("tidak menjalankan HTML (output tetap teks)", () => {
    expect(sanitizeText("<script>alert(1)</script>")).toBe("<script>alert(1)</script>");
  });
});

describe("sanitizeSingleLine", () => {
  it("mengubah newline menjadi spasi", () => {
    expect(sanitizeSingleLine("a\nb")).toBe("a b");
  });
});

describe("stripUnsafeUrlChars", () => {
  it("menghapus whitespace & karakter kontrol dari URL", () => {
    expect(stripUnsafeUrlChars("https://contoh.go.id/  a\tb")).toBe("https://contoh.go.id/ab");
  });
});
