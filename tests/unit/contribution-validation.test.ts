import { describe, expect, it } from "vitest";

import { contributionFormSchema } from "@/lib/validation/contribution";

const CATEGORY = "4d5e6f70-1234-4abc-8def-0123456789ab";

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    title: "Beasiswa Pendidikan untuk Siswa SMA Tahun 2026",
    description:
      "Program beasiswa ini ditujukan bagi siswa SMA berprestasi dengan keterbatasan ekonomi. Informasi lengkap mengikuti sumber resmi penyelenggara.",
    categoryId: CATEGORY,
    regionScope: "nasional",
    province: "",
    city: "",
    organizer: "Dinas Pendidikan Contoh",
    requirements: "",
    publishedAt: "",
    startDate: "",
    endDate: "",
    contributorNote: "",
    sources: [
      {
        url: "https://contoh.go.id/pengumuman-beasiswa",
        title: "Pengumuman resmi",
        type: "situs_resmi",
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
  // disembunyikan / date kosong. Sebelumnya skema menolak null sehingga
  // menyimpan draf cakupan nasional gagal. Ditemukan lewat E2E PHASE 8.
  it("menerima null untuk province, city, dan tanggal (regresi E2E)", () => {
    const result = contributionFormSchema.safeParse(
      validInput({
        province: null,
        city: null,
        publishedAt: null,
        startDate: null,
        endDate: null,
        requirements: null,
        contributorNote: null,
      }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.province).toBeNull();
      expect(result.data.city).toBeNull();
      expect(result.data.publishedAt).toBeNull();
    }
  });

  it("menerima undefined untuk field opsional (klien lama)", () => {
    const result = contributionFormSchema.safeParse(
      validInput({
        province: undefined,
        city: undefined,
        publishedAt: undefined,
        startDate: undefined,
        endDate: undefined,
      }),
    );
    expect(result.success).toBe(true);
  });

  it("menolak judul terlalu pendek", () => {
    const result = contributionFormSchema.safeParse(validInput({ title: "Bansos" }));
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

  it("membersihkan spasi berlebih pada judul", () => {
    const result = contributionFormSchema.safeParse(
      validInput({ title: "  Beasiswa   Pendidikan  untuk   Siswa SMA  " }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Beasiswa Pendidikan untuk Siswa SMA");
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
          { url: "https://contoh.go.id/a", type: "situs_resmi", isPrimary: true },
          { url: "https://www.contoh.go.id/a/", type: "lainnya", isPrimary: false },
        ],
      }),
    );
    expect(result.success).toBe(false);
  });

  it("menjadikan sumber pertama utama bila tidak ditandai", () => {
    const result = contributionFormSchema.safeParse(
      validInput({
        sources: [
          { url: "https://contoh.go.id/a", type: "situs_resmi", isPrimary: false },
          { url: "https://contoh.go.id/b", type: "lainnya", isPrimary: false },
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
            url: "https://www.contoh.go.id/berita/?utm_source=x",
            type: "situs_resmi",
            isPrimary: true,
          },
        ],
      }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sources[0]!.normalized).toBe("https://contoh.go.id/berita");
    }
  });
});

describe("contributionFormSchema — wilayah & tanggal", () => {
  it("mewajibkan provinsi untuk cakupan provinsi", () => {
    const result = contributionFormSchema.safeParse(
      validInput({ regionScope: "provinsi", province: "" }),
    );
    expect(result.success).toBe(false);
  });

  it("menerima provinsi valid", () => {
    const result = contributionFormSchema.safeParse(
      validInput({ regionScope: "provinsi", province: "Jawa Barat" }),
    );
    expect(result.success).toBe(true);
  });

  it("mewajibkan kota untuk cakupan kabupaten/kota", () => {
    const result = contributionFormSchema.safeParse(
      validInput({ regionScope: "kabupaten_kota", province: "Jawa Barat", city: "" }),
    );
    expect(result.success).toBe(false);
  });

  it("menghapus provinsi untuk cakupan nasional", () => {
    const result = contributionFormSchema.safeParse(
      validInput({ regionScope: "nasional", province: "Jawa Barat" }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.province).toBeNull();
    }
  });

  it("menolak tanggal berakhir sebelum tanggal mulai", () => {
    const result = contributionFormSchema.safeParse(
      validInput({ startDate: "2026-06-01", endDate: "2026-05-01" }),
    );
    expect(result.success).toBe(false);
  });

  it("menolak tanggal berakhir di masa lalu", () => {
    const result = contributionFormSchema.safeParse(
      validInput({ endDate: "2020-01-01" }),
    );
    expect(result.success).toBe(false);
  });

  it("menolak format tanggal tidak valid", () => {
    const result = contributionFormSchema.safeParse(
      validInput({ endDate: "01-06-2026" }),
    );
    expect(result.success).toBe(false);
  });

  it("menerima tanggal ISO valid di masa depan", () => {
    const future = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    const result = contributionFormSchema.safeParse(validInput({ endDate: future }));
    expect(result.success).toBe(true);
  });
});
