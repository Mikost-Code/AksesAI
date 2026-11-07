import { z } from "zod";

import {
  ACCESS_TYPES,
  CONTRIBUTION_LIMITS,
  SOURCE_TYPES,
} from "@/lib/constants/labels";
import { checkSourceUrl } from "@/lib/security/ssrf-guard";
import { sanitizeSingleLine, sanitizeText } from "@/lib/security/sanitize";

/**
 * Skema kontribusi entri AI (PRD FR-CON-1..7) — AksesAI.
 *
 * Aturan:
 * - Semua teks disanitasi (karakter kontrol dibuang, spasi dinormalkan).
 * - URL sumber divalidasi anti-SSRF (hanya http/https ke host publik).
 * - Provider wajib (siapa yang memberi akses gratis/murah).
 * - Harga & rate limit wajib angka non-negatif; kosong = tidak diketahui.
 * - Promo: tanggal selesai tidak boleh sebelum mulai, dan tidak boleh di masa
 *   lalu (info yang sudah lewat tidak relevan untuk direktori aktif).
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
    .nullish()
    .transform((v) => (v ? sanitizeText(v) : ""))
    .transform((v) => (v.length === 0 ? null : v))
    .pipe(z.string().max(max, `${label} maksimal ${max} karakter.`).nullable());

/** Tanggal ISO `YYYY-MM-DD` yang valid secara kalender; string kosong / null → null. */
const isoDate = z
  .string()
  .nullish()
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

/** Angka opsional dari input form: string kosong / null → null. */
const optionalNumber = (
  max: number,
  label: string,
  { integer = false }: { integer?: boolean } = {},
) =>
  z.preprocess(
    (v) => {
      if (v === null || v === undefined) return null;
      const raw = typeof v === "number" ? String(v) : String(v).trim();
      if (raw === "") return null;
      // Terima koma desimal (kebiasaan lokal Indonesia).
      return raw.replace(",", ".");
    },
    z
      .string()
      .regex(/^\d+(\.\d+)?$/, `${label} harus berupa angka (contoh: 0.15).`)
      .transform((v) => Number(v))
      .refine((n) => Number.isFinite(n), `${label} tidak valid.`)
      .refine((n) => n >= 0, `${label} tidak boleh negatif.`)
      .refine((n) => n <= max, `${label} maksimal ${max}.`)
      .refine((n) => !integer || Number.isInteger(n), `${label} harus bilangan bulat.`)
      .nullable(),
  );

/** Checkbox HTML mengirim "on"/"true"/"1"; string lain → false. */
const checkbox = z
  .union([z.boolean(), z.string(), z.null(), z.undefined()])
  .transform((v) => v === true || v === "true" || v === "on" || v === "1")
  .pipe(z.boolean());

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
      "Judul minimal 10 karakter — sebutkan provider dan kuota/benefit yang ditawarkan.",
    ),
    description: multiLine(L.descriptionMin, L.descriptionMax, "Deskripsi"),
    categoryId: z.uuid("Pilih kategori yang valid."),
    accessType: z.enum(ACCESS_TYPES, "Pilih jenis akses yang valid."),
    provider: singleLine(2, L.providerMax, "Provider", "Nama provider minimal 2 karakter."),
    freeTier: optionalMultiLine(L.freeTierMax, "Kuota gratis"),
    freeTierAvailable: checkbox,
    requiresCard: checkbox,
    priceInputPerMtok: optionalNumber(1_000_000, "Harga input per 1 juta token"),
    priceOutputPerMtok: optionalNumber(1_000_000, "Harga output per 1 juta token"),
    rateLimitRpm: optionalNumber(1_000_000, "Rate limit (RPM)", { integer: true }),
    contextWindow: optionalNumber(100_000_000, "Ukuran konteks", { integer: true }),
    requirements: optionalMultiLine(L.requirementsMax, "Persyaratan"),
    integrationNotes: optionalMultiLine(
      L.integrationNotesMax,
      "Catatan integrasi",
    ),
    promoStart: isoDate,
    promoEnd: isoDate,
    contributorNote: optionalMultiLine(L.noteMax, "Catatan untuk reviewer"),
    sources: z
      .array(sourceSchema)
      .min(L.sourcesMin, "Sertakan minimal satu sumber yang dapat dibuka.")
      .max(L.sourcesMax, `Maksimal ${L.sourcesMax} sumber.`),
  })
  .superRefine((value, ctx) => {
    // Jika tidak ada free tier, kuota gratis sebaiknya kosong agar tidak
    // menyesatkan. Kita hanya memberi peringatan bila diisi.
    if (!value.freeTierAvailable && value.freeTier) {
      ctx.addIssue({
        code: "custom",
        path: ["freeTier"],
        message:
          "Kosongkan kuota gratis jika entri ini tidak punya free tier, atau centang \u201cAda free tier\u201d.",
      });
    }

    // Urutan tanggal promo
    if (value.promoStart && value.promoEnd && value.promoEnd < value.promoStart) {
      ctx.addIssue({
        code: "custom",
        path: ["promoEnd"],
        message: "Tanggal berakhir tidak boleh sebelum tanggal mulai promo.",
      });
    }

    // Promo yang sudah lewat tidak relevan untuk direktori aktif.
    if (value.promoEnd) {
      const today = new Date().toISOString().slice(0, 10);
      if (value.promoEnd < today) {
        ctx.addIssue({
          code: "custom",
          path: ["promoEnd"],
          message:
            "Tanggal promo sudah lewat. Jika promo sudah berakhir, jangan kirim sebagai info aktif.",
        });
      }
    }

    // Rate limit / konteks harus bilangan bulat positif bila diisi (0 ditolak).
    if (value.rateLimitRpm !== null && value.rateLimitRpm <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["rateLimitRpm"],
        message: "Rate limit harus lebih dari 0 bila diisi.",
      });
    }
    if (value.contextWindow !== null && value.contextWindow <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["contextWindow"],
        message: "Ukuran konteks harus lebih dari 0 bila diisi.",
      });
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
      // Tanpa free tier → kuota gratis tidak masuk akal untuk disimpan.
      freeTier: value.freeTierAvailable ? value.freeTier : null,
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
    { name: "provider", value: value.provider },
    { name: "freeTier", value: value.freeTier },
    { name: "requirements", value: value.requirements },
    { name: "integrationNotes", value: value.integrationNotes },
    { name: "contributorNote", value: value.contributorNote },
    ...value.sources.map((s, i) => ({
      name: `sources[${i}].title`,
      value: s.title,
    })),
  ];
}
