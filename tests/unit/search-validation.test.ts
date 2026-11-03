import { describe, expect, it } from "vitest";

import { directorySearchSchema, parseDirectorySearch } from "@/lib/validation/search";

describe("directorySearchSchema", () => {
  it("memberi default status verified & halaman 1", () => {
    const result = directorySearchSchema.parse({});
    expect(result.status).toBe("verified");
    expect(result.halaman).toBe(1);
    expect(result.urut).toBe("terbaru");
  });

  it("mengkoersi halaman menjadi angka", () => {
    const result = directorySearchSchema.parse({ halaman: "3" });
    expect(result.halaman).toBe(3);
  });

  it("menolak halaman < 1", () => {
    expect(directorySearchSchema.safeParse({ halaman: "0" }).success).toBe(false);
  });

  it("menerima provinsi valid", () => {
    expect(
      directorySearchSchema.safeParse({ provinsi: "Jawa Barat" }).success,
    ).toBe(true);
  });

  it("menolak provinsi tidak valid", () => {
    expect(
      directorySearchSchema.safeParse({ provinsi: "Narnia" }).success,
    ).toBe(false);
  });

  it("menolak q lebih dari 100 karakter", () => {
    expect(directorySearchSchema.safeParse({ q: "a".repeat(101) }).success).toBe(false);
  });
});

describe("parseDirectorySearch", () => {
  it("mengambil nilai pertama dari array", () => {
    const result = parseDirectorySearch({ q: ["bantuan", "lain"] });
    expect(result.q).toBe("bantuan");
  });

  it("fallback aman saat nilai tidak valid", () => {
    const result = parseDirectorySearch({ status: "invalid-status" });
    expect(result.status).toBe("verified");
  });
});
