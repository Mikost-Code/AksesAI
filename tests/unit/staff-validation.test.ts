import { describe, expect, it } from "vitest";

import {
  adminUserSearchSchema,
  categoryInputSchema,
  grantRoleSchema,
  markExpiredSchema,
  paginationSchema,
  resolveReportSchema,
  reviewReasonSchema,
  setBannedSchema,
} from "@/lib/validation/staff";

/**
 * Tes skema validasi aksi staf & admin (PHASE 7).
 *
 * Server Action dapat dipanggil langsung oleh klien, jadi bentuk input harus
 * ditolak sebelum menyentuh DB/RPC.
 */

const UUID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
const BAD_UUID = "not-a-uuid";

describe("paginationSchema", () => {
  it("menerima halaman valid", () => {
    expect(paginationSchema.parse({ page: "3" }).page).toBe(3);
    expect(paginationSchema.parse({ page: 1 }).page).toBe(1);
  });
  it("menjepit halaman di luar batas ke 1 (catch)", () => {
    expect(paginationSchema.parse({ page: "999999" }).page).toBe(1);
    expect(paginationSchema.parse({ page: "-5" }).page).toBe(1);
    expect(paginationSchema.parse({ page: "abc" }).page).toBe(1);
    expect(paginationSchema.parse({}).page).toBe(1);
  });
  it("menolak non-integer", () => {
    expect(paginationSchema.parse({ page: "2.5" }).page).toBe(1);
  });
});

describe("adminUserSearchSchema", () => {
  it("menerima pencarian wajar", () => {
    expect(adminUserSearchSchema.parse({ search: "budi", page: "2" })).toEqual({
      search: "budi",
      page: 2,
    });
  });
  it("memotong pencarian kosong & trailing", () => {
    expect(adminUserSearchSchema.parse({ search: "  budi  " }).search).toBe("budi");
  });
  it("membatasi panjang pencarian (catch → kosong)", () => {
    const long = "x".repeat(500);
    expect(adminUserSearchSchema.parse({ search: long }).search).toBe("");
  });
});

describe("reviewReasonSchema", () => {
  it("menerima UUID + alasan cukup panjang", () => {
    const parsed = reviewReasonSchema.parse({
      programId: UUID,
      reason: "Sumber tidak dapat dibuka dan judul tidak sesuai.",
    });
    expect(parsed.programId).toBe(UUID);
  });
  it("menolak alasan terlalu pendek", () => {
    const r = reviewReasonSchema.safeParse({ programId: UUID, reason: "pendek" });
    expect(r.success).toBe(false);
  });
  it("menolak UUID tidak valid", () => {
    const r = reviewReasonSchema.safeParse({
      programId: BAD_UUID,
      reason: "Alasan yang cukup panjang untuk lolos batas minimal.",
    });
    expect(r.success).toBe(false);
  });
});

describe("markExpiredSchema", () => {
  it("alasan opsional", () => {
    expect(markExpiredSchema.safeParse({ programId: UUID }).success).toBe(true);
  });
  it("menolak UUID tidak valid", () => {
    expect(markExpiredSchema.safeParse({ programId: "x" }).success).toBe(false);
  });
});

describe("resolveReportSchema", () => {
  it("menerima aksi valid dengan catatan", () => {
    const r = resolveReportSchema.safeParse({
      reportId: UUID,
      action: "archive_program",
      note: "Informasi terbukti palsu setelah pengecekan.",
    });
    expect(r.success).toBe(true);
  });
  it("menolak aksi tidak dikenal", () => {
    const r = resolveReportSchema.safeParse({
      reportId: UUID,
      action: "hapus_semua",
      note: "x",
    });
    expect(r.success).toBe(false);
  });
  it("menolak reportId bukan UUID", () => {
    const r = resolveReportSchema.safeParse({ reportId: BAD_UUID, action: "dismiss" });
    expect(r.success).toBe(false);
  });
  it("note default kosong bila tidak diberikan", () => {
    const r = resolveReportSchema.parse({ reportId: UUID, action: "dismiss" });
    expect(r.note).toBe("");
  });
});

describe("grantRoleSchema", () => {
  it("menerima role staf valid", () => {
    expect(grantRoleSchema.safeParse({ userId: UUID, role: "reviewer" }).success).toBe(true);
    expect(grantRoleSchema.safeParse({ userId: UUID, role: "admin" }).success).toBe(true);
  });
  it("menolak role member / tidak dikenal", () => {
    expect(grantRoleSchema.safeParse({ userId: UUID, role: "member" }).success).toBe(false);
    expect(grantRoleSchema.safeParse({ userId: UUID, role: "root" }).success).toBe(false);
  });
  it("menolak userId bukan UUID", () => {
    expect(grantRoleSchema.safeParse({ userId: "123", role: "admin" }).success).toBe(false);
  });
});

describe("setBannedSchema", () => {
  it("menerima alasan ≥ 10 karakter", () => {
    const r = setBannedSchema.safeParse({
      userId: UUID,
      banned: true,
      reason: "Kontribusi palsu berulang.",
    });
    expect(r.success).toBe(true);
  });
  it("menolak alasan < 10 karakter", () => {
    const r = setBannedSchema.safeParse({ userId: UUID, banned: true, reason: "pendek" });
    expect(r.success).toBe(false);
  });
  it("menolak alasan terlalu panjang", () => {
    const r = setBannedSchema.safeParse({
      userId: UUID,
      banned: true,
      reason: "a".repeat(600),
    });
    expect(r.success).toBe(false);
  });
  it("menerima banned=false (buka blokir)", () => {
    const r = setBannedSchema.safeParse({
      userId: UUID,
      banned: false,
      reason: "Banding diterima.",
    });
    expect(r.success).toBe(true);
  });
});

describe("categoryInputSchema", () => {
  const base = {
    id: null,
    name: "Bantuan Pendidikan",
    slug: "bantuan-pendidikan",
    description: "Beasiswa dan bantuan sekolah.",
    isActive: true,
    sortOrder: 1,
  };

  it("menerima kategori baru valid", () => {
    expect(categoryInputSchema.safeParse(base).success).toBe(true);
  });
  it("menerima id UUID untuk update", () => {
    expect(categoryInputSchema.safeParse({ ...base, id: UUID }).success).toBe(true);
  });
  it("menolak slug tidak valid", () => {
    expect(categoryInputSchema.safeParse({ ...base, slug: "Bantuan Pendidikan!" }).success).toBe(
      false,
    );
    expect(categoryInputSchema.safeParse({ ...base, slug: "-awal" }).success).toBe(false);
  });
  it("menolak nama terlalu pendek", () => {
    expect(categoryInputSchema.safeParse({ ...base, name: "A" }).success).toBe(false);
  });
  it("menolak sortOrder non-integer / negatif", () => {
    expect(categoryInputSchema.safeParse({ ...base, sortOrder: -1 }).success).toBe(false);
    expect(categoryInputSchema.safeParse({ ...base, sortOrder: 1.5 }).success).toBe(false);
  });
  it("menolak id bukan UUID", () => {
    expect(categoryInputSchema.safeParse({ ...base, id: "abc" }).success).toBe(false);
  });
  it("description opsional → default kosong", () => {
    const { description: _omit, ...without } = base;
    const parsed = categoryInputSchema.parse(without);
    expect(parsed.description).toBe("");
  });
});
