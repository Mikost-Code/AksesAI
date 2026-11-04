import { describe, expect, it } from "vitest";

import { directorySearchSchema, parseDirectorySearch } from "@/lib/validation/search";

describe("directorySearchSchema", () => {
  it("memberi default status verified & halaman 1", () => {
    const result = directorySearchSchema.parse({});
    expect(result.status).toBe("verified");
    expect(result.halaman).toBe(1);
    expect(result.urut).toBe("terbaru");
    expect(result.akses).toBe("semua");
    expect(result.gratis).toBe("semua");
  });

  it("mengkoersi halaman menjadi angka", () => {
    const result = directorySearchSchema.parse({ halaman: "3" });
    expect(result.halaman).toBe(3);
  });

  it("menolak halaman < 1", () => {
    expect(directorySearchSchema.safeParse({ halaman: "0" }).success).toBe(false);
  });

  it("menerima jenis akses valid", () => {
    expect(directorySearchSchema.safeParse({ akses: "api" }).success).toBe(true);
    expect(directorySearchSchema.safeParse({ akses: "hosting" }).success).toBe(true);
  });

  it("menolak jenis akses tidak dikenal", () => {
    expect(directorySearchSchema.safeParse({ akses: "bansos" }).success).toBe(false);
  });

  it("menerima filter ketersediaan gratis valid", () => {
    expect(directorySearchSchema.safeParse({ gratis: "tanpa_kartu" }).success).toBe(true);
    expect(directorySearchSchema.safeParse({ gratis: "berbayar" }).success).toBe(true);
  });

  it("menolak filter ketersediaan tidak dikenal", () => {
    expect(directorySearchSchema.safeParse({ gratis: "mungkin" }).success).toBe(false);
  });

  it("menolak q lebih dari 100 karakter", () => {
    expect(directorySearchSchema.safeParse({ q: "a".repeat(101) }).success).toBe(false);
  });
});

describe("parseDirectorySearch", () => {
  it("mengambil nilai pertama dari array", () => {
    const result = parseDirectorySearch({ q: ["token gratis", "lain"] });
    expect(result.q).toBe("token gratis");
  });

  it("fallback aman saat nilai tidak valid", () => {
    const result = parseDirectorySearch({ status: "invalid-status" });
    expect(result.status).toBe("verified");
  });

  it("tidak membuang filter lain saat satu filter tidak valid", () => {
    const result = parseDirectorySearch({ akses: "api", gratis: "ngawur" });
    expect(result.akses).toBe("api");
    expect(result.gratis).toBe("semua");
  });
});
