import { describe, expect, it } from "vitest";

import { contributionFormSchema } from "@/lib/validation/contribution";

const CATEGORY = "4d5e6f70-1234-4abc-8def-0123456789ab";

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    title: "Groq API — free tier 30 request per menit untuk Llama 3.3",
    description:
      "Groq menyediakan endpoint inference gratis dengan batas 30 request per menit. Informasi lengkap mengikuti halaman dokumentasi resmi provider.",
    categoryId: CATEGORY,
    accessType: "api",
    provider: "Groq",
    freeTier: "30 request/menit, 1.000 request/hari",
    freeTierAvailable: true,
    requiresCard: false,
    priceInputPerMtok: "",
    priceOutputPerMtok: "",
    rateLimitRpm: "30",
    contextWindow: "128000",
    requirements: "",
    promoStart: "",
    promoEnd: "",
    contributorNote: "",
    sources: [
      {
        url: "https://console.groq.com/docs/rate-limits",
        title: "Dokumentasi rate limit",
        type: "dokumentasi_resmi",
        isPrimary: true,
      },
    ],
    ...overrides,
  };
}

describe("contributionFormSchema — validasi dasar", () => {
  it("menerima input valid", () => {
    const result = contributionFormSchema.safeParse(validInput());
    expect(result.success).toBe(true);
  });

  // Regresi: klien mengirim `null` (bukan "") untuk field opsional yang
  // disembunyikan / tanggal kosong.
  it("menerima null untuk field opsional & tanggal (regresi E2E)", () => {
    const result = contributionFormSchema.safeParse(
      validInput({
        freeTier: null,
        priceInputPerMtok: null,
        priceOutputPerMtok: null,
        rateLimitRpm: null,
        contextWindow: null,
        promoStart: null,
        promoEnd: null,
        requirements: null,
        contributorNote: null,
      }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priceInputPerMtok).toBeNull();
      expect(result.data.rateLimitRpm).toBeNull();
      expect(result.data.promoEnd).toBeNull();
    }
  });

  it("menerima undefined untuk field opsional (klien lama)", () => {
    const result = contributionFormSchema.safeParse(
      validInput({
        freeTier: undefined,
        priceInputPerMtok: undefined,
        priceOutputPerMtok: undefined,
        rateLimitRpm: undefined,
        contextWindow: undefined,
        promoStart: undefined,
        promoEnd: undefined,
      }),
    );
    expect(result.success).toBe(true);
  });

  it("menolak judul terlalu pendek", () => {
    const result = contributionFormSchema.safeParse(validInput({ title: "Gratis" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "title")).toBe(true);
    }
  });

  it("menolak judul lebih dari 150 karakter", () => {
    const result = contributionFormSchema.safeParse(
      validInput({ title: "a".repeat(151) }),
    );
    expect(result.success).toBe(false);
  });

  it("menolak deskripsi kurang dari 50 karakter", () => {
    const result = contributionFormSchema.safeParse(
      validInput({ description: "Terlalu pendek." }),
    );
    expect(result.success).toBe(false);
  });

  it("menolak categoryId bukan UUID", () => {
    const result = contributionFormSchema.safeParse(
      validInput({ categoryId: "bukan-uuid" }),
    );
    expect(result.success).toBe(false);
  });

  it("menolak provider kosong", () => {
    const result = contributionFormSchema.safeParse(validInput({ provider: " " }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "provider")).toBe(true);
    }
  });

  it("menolak jenis akses tidak dikenal", () => {
    const result = contributionFormSchema.safeParse(
      validInput({ accessType: "bansos" }),
    );
    expect(result.success).toBe(false);
  });

  it("membersihkan spasi berlebih pada judul", () => {
    const result = contributionFormSchema.safeParse(
      validInput({ title: "  Groq   API  free   tier  untuk   Llama  " }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Groq API free tier untuk Llama");
    }
  });
});

describe("contributionFormSchema — sumber & keamanan URL", () => {
  it("menolak tanpa sumber", () => {
    const result = contributionFormSchema.safeParse(validInput({ sources: [] }));
    expect(result.success).toBe(false);
  });

  it("menolak URL localhost", () => {
    const result = contributionFormSchema.safeParse(
      validInput({
        sources: [{ url: "http://localhost/admin", type: "lainnya", isPrimary: true }],
      }),
    );
    expect(result.success).toBe(false);
  });

  it("menolak URL protokol javascript", () => {
    const result = contributionFormSchema.safeParse(
      validInput({
        sources: [{ url: "javascript:alert(1)", type: "lainnya", isPrimary: true }],
      }),
    );
    expect(result.success).toBe(false);
  });

  it("menolak URL ke IP privat", () => {
    const result = contributionFormSchema.safeParse(
      validInput({
        sources: [{ url: "http://192.168.1.1/x", type: "lainnya", isPrimary: true }],
      }),
    );
    expect(result.success).toBe(false);
  });

  it("menolak sumber duplikat dalam satu kiriman", () => {
    const result = contributionFormSchema.safeParse(
      validInput({
        sources: [
          { url: "https://provider.com/a", type: "dokumentasi_resmi", isPrimary: true },
          { url: "https://www.provider.com/a/", type: "lainnya", isPrimary: false },
        ],
      }),
    );
    expect(result.success).toBe(false);
  });

  it("menjadikan sumber pertama utama bila tidak ditandai", () => {
    const result = contributionFormSchema.safeParse(
      validInput({
        sources: [
          { url: "https://provider.com/a", type: "dokumentasi_resmi", isPrimary: false },
          { url: "https://provider.com/b", type: "halaman_harga", isPrimary: false },
        ],
      }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sources[0]!.isPrimary).toBe(true);
      expect(result.data.sources[1]!.isPrimary).toBe(false);
    }
  });

  it("menyimpan bentuk URL ternormalisasi", () => {
    const result = contributionFormSchema.safeParse(
      validInput({
        sources: [
          {
            url: "https://www.provider.com/pricing/?utm_source=x",
            type: "halaman_harga",
            isPrimary: true,
          },
        ],
      }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sources[0]!.normalized).toBe("https://provider.com/pricing");
    }
  });
});

describe("contributionFormSchema — kuota gratis & harga", () => {
  it("mengosongkan kuota gratis bila tidak ada free tier", () => {
    const result = contributionFormSchema.safeParse(
      validInput({ freeTierAvailable: false, freeTier: "5 USD kredit" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "freeTier")).toBe(true);
    }
  });

  it("menerima tanpa free tier dan tanpa kuota", () => {
    const result = contributionFormSchema.safeParse(
      validInput({ freeTierAvailable: false, freeTier: "" }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.freeTier).toBeNull();
      expect(result.data.freeTierAvailable).toBe(false);
    }
  });

  it("mengubah harga string menjadi angka", () => {
    const result = contributionFormSchema.safeParse(
      validInput({ priceInputPerMtok: "0.15", priceOutputPerMtok: "0.60" }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priceInputPerMtok).toBeCloseTo(0.15);
      expect(result.data.priceOutputPerMtok).toBeCloseTo(0.6);
    }
  });

  it("menerima koma desimal (input lokal Indonesia)", () => {
    const result = contributionFormSchema.safeParse(
      validInput({ priceInputPerMtok: "0,25" }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priceInputPerMtok).toBeCloseTo(0.25);
    }
  });

  it("menolak harga negatif", () => {
    const result = contributionFormSchema.safeParse(
      validInput({ priceInputPerMtok: "-1" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path[0] === "priceInputPerMtok"),
      ).toBe(true);
    }
  });

  it("menolak harga bukan angka (tidak diam-diam dikosongkan)", () => {
    const result = contributionFormSchema.safeParse(
      validInput({ priceInputPerMtok: "murah" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path[0] === "priceInputPerMtok"),
      ).toBe(true);
    }
  });

  it("menolak rate limit nol saat diisi", () => {
    const result = contributionFormSchema.safeParse(
      validInput({ rateLimitRpm: "0" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "rateLimitRpm")).toBe(true);
    }
  });

  it("menolak ukuran konteks bukan bilangan bulat", () => {
    const result = contributionFormSchema.safeParse(
      validInput({ contextWindow: "128000.5" }),
    );
    expect(result.success).toBe(false);
  });

  it("menerima checkbox string 'on' sebagai boolean true", () => {
    const result = contributionFormSchema.safeParse(
      validInput({ requiresCard: "on" }),
    );
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.requiresCard).toBe(true);
  });
});

describe("contributionFormSchema — masa berlaku promo", () => {
  it("menolak tanggal promo berakhir sebelum mulai", () => {
    const result = contributionFormSchema.safeParse(
      validInput({ promoStart: "2026-06-01", promoEnd: "2026-05-01" }),
    );
    expect(result.success).toBe(false);
  });

  it("menolak tanggal promo berakhir di masa lalu", () => {
    const result = contributionFormSchema.safeParse(
      validInput({ promoEnd: "2020-01-01" }),
    );
    expect(result.success).toBe(false);
  });

  it("menolak format tanggal tidak valid", () => {
    const result = contributionFormSchema.safeParse(
      validInput({ promoEnd: "01-06-2026" }),
    );
    expect(result.success).toBe(false);
  });

  it("menerima tanggal ISO valid di masa depan", () => {
    const future = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    const result = contributionFormSchema.safeParse(validInput({ promoEnd: future }));
    expect(result.success).toBe(true);
  });
});
