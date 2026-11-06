import { describe, expect, it } from "vitest";

import {
  contributionsToNextLevel,
  resolveContributorBadge,
} from "@/lib/programs/contributor-badge";

describe("resolveContributorBadge", () => {
  it("memberi jenjang 'baru' untuk kontribusi terverifikasi nol", () => {
    const badge = resolveContributorBadge(0);
    expect(badge.key).toBe("baru");
    expect(badge.threshold).toBe(0);
    expect(badge.nextThreshold).toBe(3);
  });

  it("memberi jenjang 'kontributor' mulai 3", () => {
    expect(resolveContributorBadge(3).key).toBe("kontributor");
    expect(resolveContributorBadge(9).key).toBe("kontributor");
  });

  it("memberi jenjang 'terpercaya' mulai 10", () => {
    expect(resolveContributorBadge(10).key).toBe("terpercaya");
    expect(resolveContributorBadge(24).key).toBe("terpercaya");
  });

  it("memberi jenjang 'pakar' mulai 25 dan tanpa ambang berikutnya", () => {
    const badge = resolveContributorBadge(25);
    expect(badge.key).toBe("pakar");
    expect(badge.nextThreshold).toBeNull();
  });

  it("tetap 'pakar' untuk angka sangat besar", () => {
    expect(resolveContributorBadge(100_000).key).toBe("pakar");
  });

  it("memperlakukan angka negatif sebagai pengguna baru", () => {
    expect(resolveContributorBadge(-5).key).toBe("baru");
  });

  it("memperlakukan NaN sebagai pengguna baru", () => {
    expect(resolveContributorBadge(Number.NaN).key).toBe("baru");
  });

  it("membulatkan ke bawah angka desimal", () => {
    // 2,9 kontribusi tetap belum mencapai ambang 3.
    expect(resolveContributorBadge(2.9).key).toBe("baru");
  });

  it("label selalu terisi", () => {
    for (const n of [0, 1, 3, 10, 25, 500]) {
      expect(resolveContributorBadge(n).label.length).toBeGreaterThan(0);
    }
  });
});

describe("contributionsToNextLevel", () => {
  it("menghitung sisa ke jenjang berikutnya", () => {
    expect(contributionsToNextLevel(0)).toBe(3);
    expect(contributionsToNextLevel(2)).toBe(1);
    expect(contributionsToNextLevel(3)).toBe(7);
    expect(contributionsToNextLevel(9)).toBe(1);
    expect(contributionsToNextLevel(24)).toBe(1);
  });

  it("mengembalikan null untuk jenjang tertinggi", () => {
    expect(contributionsToNextLevel(25)).toBeNull();
    expect(contributionsToNextLevel(99)).toBeNull();
  });

  it("tidak pernah negatif", () => {
    for (let n = 0; n <= 40; n += 1) {
      const remaining = contributionsToNextLevel(n);
      expect(remaining === null || remaining >= 0).toBe(true);
    }
  });
});
