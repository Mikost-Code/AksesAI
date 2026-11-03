import { z } from "zod";

import {
  CONTRIBUTION_LIMITS,
  PROVINCES,
  REGION_SCOPES,
  SOURCE_TYPES,
} from "@/lib/constants/labels";
import { checkSourceUrl } from "@/lib/security/ssrf-guard";
import { sanitizeSingleLine, sanitizeText } from "@/lib/security/sanitize";

/**
 * Skema kontribusi (PRD FR-CON-1..7).
 *
 * Aturan:
 * - Semua teks disanitasi (karakter kontrol dibuang, spasi dinormalkan).
 * - URL sumber divalidasi anti-SSRF (hanya http/https ke host publik).
 * - Persyaratan wilayah dijaga: provinsi wajib untuk scope provinsi, dan
 *   provinsi+kota wajib untuk kabupaten/kota.
 * - Slug TIDAK diterima dari klien (dibuat server).
 */

const L = CONTRIBUTION_LIMITS;

const singleLine = (min: number, max: number, label: string, minMsg?: string) =>
  z
    .string()
    .transform(sanitizeSingleLine)
    .pipe(
      z
        .string()
        .min(min, minMsg ?? `${label} minimal ${min} karakter.`)
        .max(max, `${label} maksimal ${max} karakter.`),
    );

const multiLine = (min: number, max: number, label: string) =>
  z
    .string()
    .transform(sanitizeText)
    .pipe(
      z
        .string()
        .min(min, `${label} minimal ${min} karakter.`)
        .max(max, `${label} maksimal ${max} karakter.`),
    );

const optionalMultiLine = (max: number, label: string) =>
  z
    .string()
    .optional()
    .transform((v) => (v ? sanitizeText(v) : ""))
    .transform((v) => (v.length === 0 ? null : v))
    .pipe(z.string().max(max, `${label} maksimal ${max} karakter.`).nullable());

/** Tanggal ISO `YYYY-MM-DD` yang valid secara kalender; string kosong → null. */
const isoDate = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : null))
  .pipe(
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD.")
      .refine((value) => {
        const date = new Date(`${value}T00:00:00Z`);
        return (
          !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
        );
      }, "Tanggal tidak valid.")
      .nullable(),
  );

const sourceSchema = z
  .object({
    url: z
      .string()
      .transform((v) => v.trim())
      .superRefine((value, ctx) => {
        if (!value) {
          ctx.addIssue({ code: "custom", message: "Tautan sumber wajib diisi." });
          return;
        }
        const result = checkSourceUrl(value);
        if (!result.ok) {
          ctx.addIssue({ code: "custom", message: result.reason });
        }
      }),
    title: z
      .string()
      .optional()
      .transform((v) => (v ? sanitizeSingleLine(v) : ""))
      .pipe(
        z
          .string()
          .max(L.sourceTitleMax, `Judul sumber maksimal ${L.sourceTitleMax} karakter.`),
      ),
    type: z.enum(SOURCE_TYPES),
    isPrimary: z.boolean().default(false),
  })
  .transform((value) => {
    const check = checkSourceUrl(value.url);
    return {
      url: value.url,
      // Dijamin valid karena superRefine di atas sudah gagal lebih dulu bila tidak.
      normalized: check.ok ? check.normalized : value.url,
      title: value.title.length > 0 ? value.title : null,
      type: value.type,
      isPrimary: value.isPrimary,
    };
  });

export const contributionFormSchema = z
  .object({
    title: singleLine(
      L.titleMin,
      L.titleMax,
      "Judul",
      "Judul minimal 10 karakter — jelaskan programnya, hindari clickbait.",
    ),
    description: multiLine(L.descriptionMin, L.descriptionMax, "Deskripsi"),
    categoryId: z.uuid("Pilih kategori yang valid."),
    regionScope: z.enum(REGION_SCOPES),
    province: z
      .string()
      .optional()
      .transform((v) => (v ? sanitizeSingleLine(v) : ""))
      .transform((v) => (v.length === 0 ? null : v))
      .pipe(z.enum(PROVINCES).nullable())
      .catch(null),
    city: z
      .string()
      .optional()
      .transform((v) => (v ? sanitizeSingleLine(v) : ""))
      .transform((v) => (v.length === 0 ? null : v))
      .pipe(z.string().max(80, "Nama kota maksimal 80 karakter.").nullable()),
    organizer: singleLine(3, L.organizerMax, "Penyelenggara"),
    requirements: optionalMultiLine(L.requirementsMax, "Persyaratan"),
    publishedAt: isoDate,
    startDate: isoDate,
    endDate: isoDate,
    contributorNote: optionalMultiLine(L.noteMax, "Catatan untuk reviewer"),
    sources: z
      .array(sourceSchema)
      .min(L.sourcesMin, "Sertakan minimal satu sumber yang dapat dibuka.")
      .max(L.sourcesMax, `Maksimal ${L.sourcesMax} sumber.`),
  })
  .superRefine((value, ctx) => {
    // Wilayah
    if (value.regionScope === "provinsi" && !value.province) {
      ctx.addIssue({
        code: "custom",
        path: ["province"],
        message: "Pilih provinsi untuk cakupan provinsi.",
      });
    }
    if (value.regionScope === "kabupaten_kota") {
      if (!value.province) {
        ctx.addIssue({
          code: "custom",
          path: ["province"],
          message: "Pilih provinsi.",
        });
      }
      if (!value.city) {
        ctx.addIssue({
          code: "custom",
          path: ["city"],
          message: "Isi nama kabupaten/kota.",
        });
      }
    }

    // Urutan tanggal
    if (value.startDate && value.endDate && value.endDate < value.startDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "Tanggal berakhir tidak boleh sebelum tanggal mulai.",
      });
    }

    // Tanggal berakhir tidak boleh di masa lalu (informasi harus relevan).
    if (value.endDate) {
      const today = new Date().toISOString().slice(0, 10);
      if (value.endDate < today) {
        ctx.addIssue({
          code: "custom",
          path: ["endDate"],
          message:
            "Tanggal berakhir sudah lewat. Jika program sudah tutup, jangan kirim sebagai informasi aktif.",
        });
      }
    }

    // Duplikasi sumber dalam satu kiriman
    const normalized = value.sources.map((s) => s.normalized);
    if (new Set(normalized).size !== normalized.length) {
      ctx.addIssue({
        code: "custom",
        path: ["sources"],
        message: "Ada tautan sumber yang sama lebih dari sekali.",
      });
    }

    // Tepat satu sumber utama (bila ada) — pilih otomatis bila tidak ditandai.
    const primaries = value.sources.filter((s) => s.isPrimary).length;
    if (primaries > 1) {
      ctx.addIssue({
        code: "custom",
        path: ["sources"],
        message: "Tandai satu sumber utama saja.",
      });
    }
  })
  .transform((value) => {
    // Jika tidak ada yang ditandai utama, jadikan sumber pertama sebagai utama.
    const hasPrimary = value.sources.some((s) => s.isPrimary);
    return {
      ...value,
      sources: value.sources.map((s, index) => ({
        ...s,
        isPrimary: hasPrimary ? s.isPrimary : index === 0,
      })),
      province: value.regionScope === "nasional" ? null : value.province,
      city: value.regionScope === "kabupaten_kota" ? value.city : null,
    };
  });

export type ContributionInput = z.output<typeof contributionFormSchema>;
export type ContributionRawInput = z.input<typeof contributionFormSchema>;

/** Field teks yang dipindai untuk data pribadi (PRD FR-CON-7). */
export function contributionScanFields(
  value: Omit<ContributionInput, "sources"> & {
    sources: Array<{ url: string; title: string | null }>;
  },
): Array<{ name: string; value: string | null }> {
  return [
    { name: "title", value: value.title },
    { name: "description", value: value.description },
    { name: "organizer", value: value.organizer },
    { name: "requirements", value: value.requirements },
    { name: "city", value: value.city },
    { name: "contributorNote", value: value.contributorNote },
    ...value.sources.map((s, i) => ({
      name: `sources[${i}].title`,
      value: s.title,
    })),
  ];
}
