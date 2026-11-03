import { describe, expect, it } from "vitest";

import { reportInputSchema } from "@/lib/validation/report";

const validId = "4d5e6f70-1234-4abc-8def-0123456789ab";

describe("reportInputSchema", () => {
  it("menerima laporan valid", () => {
    const result = reportInputSchema.safeParse({
      programId: validId,
      reason: "tidak_akurat",
      description: "Tautan sumber sudah tidak dapat dibuka sejak minggu lalu.",
    });
    expect(result.success).toBe(true);
  });

  it("menolak programId bukan UUID", () => {
    const result = reportInputSchema.safeParse({
      programId: "abc",
      reason: "spam",
      description: "Deskripsi yang cukup panjang untuk lolos validasi minimal.",
    });
    expect(result.success).toBe(false);
  });

  it("menolak alasan tidak dikenal", () => {
    const result = reportInputSchema.safeParse({
      programId: validId,
      reason: "apapun",
      description: "Deskripsi yang cukup panjang untuk lolos validasi minimal.",
    });
    expect(result.success).toBe(false);
  });

  it("menolak deskripsi terlalu pendek", () => {
    const result = reportInputSchema.safeParse({
      programId: validId,
      reason: "spam",
      description: "pendek",
    });
    expect(result.success).toBe(false);
  });

  it("menolak deskripsi terlalu panjang", () => {
    const result = reportInputSchema.safeParse({
      programId: validId,
      reason: "spam",
      description: "a".repeat(1001),
    });
    expect(result.success).toBe(false);
  });

  it("membersihkan karakter kontrol", () => {
    const result = reportInputSchema.safeParse({
      programId: validId,
      reason: "spam",
      description: "Deskripsi\u0000 yang cukup panjang untuk lolos validasi.",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).not.toContain("\u0000");
    }
  });
});
