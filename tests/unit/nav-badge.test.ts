import { describe, expect, it } from "vitest";

import { formatBadgeCount, hasBadge } from "@/lib/nav-badge";

/**
 * Aturan produk: "Angka 0 tidak pernah ditampilkan sebagai informasi."
 * Tes ini mengunci aturan tersebut agar tidak diam-diam dilanggar saat
 * markup menu akun diubah di masa depan.
 */
describe("formatBadgeCount", () => {
  it("nol TIDAK pernah ditampilkan", () => {
    expect(formatBadgeCount(0)).toBeNull();
    expect(hasBadge(0)).toBe(false);
  });

  it("nilai kosong tidak ditampilkan", () => {
    expect(formatBadgeCount(undefined)).toBeNull();
    expect(formatBadgeCount(null)).toBeNull();
    expect(hasBadge(undefined)).toBe(false);
    expect(hasBadge(null)).toBe(false);
  });

  it("angka positif kecil ditampilkan apa adanya", () => {
    expect(formatBadgeCount(1)).toBe("1");
    expect(formatBadgeCount(7)).toBe("7");
    expect(formatBadgeCount(99)).toBe("99");
    expect(hasBadge(1)).toBe(true);
  });

  it("di atas 99 diringkas menjadi 99+", () => {
    expect(formatBadgeCount(100)).toBe("99+");
    expect(formatBadgeCount(1234)).toBe("99+");
    expect(formatBadgeCount(Number.MAX_SAFE_INTEGER)).toBe("99+");
  });

  it("nilai negatif tidak ditampilkan", () => {
    expect(formatBadgeCount(-1)).toBeNull();
    expect(formatBadgeCount(-999)).toBeNull();
  });

  it("NaN dan Infinity tidak ditampilkan", () => {
    expect(formatBadgeCount(Number.NaN)).toBeNull();
    expect(formatBadgeCount(Number.POSITIVE_INFINITY)).toBeNull();
    expect(formatBadgeCount(Number.NEGATIVE_INFINITY)).toBeNull();
  });

  it("pecahan dipotong ke bawah, bukan dibulatkan", () => {
    // 0.9 bukan "1" — jumlah notifikasi tidak boleh terlihat lebih besar
    // dari kenyataan.
    expect(formatBadgeCount(0.9)).toBeNull();
    expect(formatBadgeCount(2.7)).toBe("2");
  });

  it("konsisten: hasBadge sejalan dengan formatBadgeCount", () => {
    for (const v of [undefined, null, 0, -2, 1, 50, 99, 100, 9999, Number.NaN]) {
      expect(hasBadge(v)).toBe(formatBadgeCount(v) !== null);
    }
  });
});
