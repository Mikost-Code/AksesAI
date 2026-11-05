import { z } from "zod";

import {
  ADMIN_REASON_MIN,
  APP_ROLES,
  CATEGORY_DESCRIPTION_MAX,
  CATEGORY_NAME_MAX,
  CATEGORY_NAME_MIN,
  REPORT_REASONS,
  REVIEW_REASON_MAX,
  REVIEW_REASON_MIN,
} from "@/lib/constants/labels";

/**
 * Skema validasi untuk input Server Action staf & admin (PHASE 7).
 *
 * Server Action dapat dipanggil langsung oleh klien mana pun yang login, jadi
 * bentuk input (UUID, enum, panjang string) WAJIB divalidasi di sini — bukan
 * hanya mengandalkan TypeScript. RPC `security definer` tetap menjadi penjaga
 * otorisasi terakhir di database.
 */

const uuid = z.uuid({ error: "ID tidak valid." });

export const staffRoleSchema = z.enum(["reviewer", "moderator", "admin"], {
  error: "Role tidak dikenal.",
});

/** Reviewer: klaim / verifikasi / tolak sebuah program. */
export const programIdSchema = z.object({ programId: uuid });

export const reviewReasonSchema = z.object({
  programId: uuid,
  reason: z
    .string()
    .trim()
    .min(REVIEW_REASON_MIN, `Alasan minimal ${REVIEW_REASON_MIN} karakter.`)
    .max(REVIEW_REASON_MAX, `Alasan maksimal ${REVIEW_REASON_MAX} karakter.`),
});

export const markExpiredSchema = z.object({
  programId: uuid,
  reason: z.string().trim().max(REVIEW_REASON_MAX).optional(),
});

/** Moderator: selesaikan laporan. */
export const moderationActionSchema = z.enum([
  "dismiss",
  "reopen_for_review",
  "archive_program",
  "resolve",
  "ban_contributor",
]);

export const resolveReportSchema = z.object({
  reportId: uuid,
  action: moderationActionSchema,
  note: z.string().trim().max(REVIEW_REASON_MAX, "Catatan terlalu panjang.").default(""),
});

export const reportIdSchema = z.object({ reportId: uuid });

/** Admin: kelola role. */
export const grantRoleSchema = z.object({ userId: uuid, role: staffRoleSchema });
export const revokeRoleSchema = z.object({ userId: uuid, role: staffRoleSchema });

/** Admin: blokir / buka blokir. */
export const setBannedSchema = z.object({
  userId: uuid,
  banned: z.boolean(),
  reason: z
    .string()
    .trim()
    .min(ADMIN_REASON_MIN, `Alasan minimal ${ADMIN_REASON_MIN} karakter.`)
    .max(500, "Alasan maksimal 500 karakter."),
});

/** Admin: buat / ubah kategori. */
export const categorySlugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const categoryInputSchema = z.object({
  id: uuid.nullable(),
  name: z
    .string()
    .trim()
    .min(CATEGORY_NAME_MIN, `Nama minimal ${CATEGORY_NAME_MIN} karakter.`)
    .max(CATEGORY_NAME_MAX, `Nama maksimal ${CATEGORY_NAME_MAX} karakter.`),
  slug: z
    .string()
    .trim()
    .min(1, "Slug wajib diisi.")
    .max(CATEGORY_NAME_MAX, "Slug terlalu panjang.")
    .regex(categorySlugRegex, "Slug hanya huruf kecil, angka, dan tanda hubung."),
  description: z.string().trim().max(CATEGORY_DESCRIPTION_MAX).default(""),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
});

/** Pagination & pencarian dashboard/staf (bounded agar query offset tidak liar). */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(500).catch(1),
});

export const adminUserSearchSchema = paginationSchema.extend({
  search: z.string().trim().max(100).catch(""),
  /** Filter pengguna ber-role tertentu; "semua" = tanpa filter. */
  peran: z
    .enum(["semua", "member", "reviewer", "moderator", "admin", "super_admin"])
    .catch("semua"),
  /** "diblokir" = hanya pengguna terblokir. */
  blokir: z.enum(["semua", "diblokir"]).catch("semua"),
});

export type StaffRoleInput = z.infer<typeof staffRoleSchema>;
export type CategoryInputValidated = z.infer<typeof categoryInputSchema>;

/** Semua role aplikasi, untuk referensi konsisten. */
export const ALL_APP_ROLES = APP_ROLES;
export const ALL_REPORT_REASONS = REPORT_REASONS;
