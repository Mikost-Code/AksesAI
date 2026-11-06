import { z } from "zod";

import {
  ACCESS_TYPES,
  FREE_TIER_FILTER_OPTIONS,
  PAGE_SIZE,
  PROGRAM_STATUSES,
  REPORT_REASONS,
  SOURCE_TYPES,
} from "@/lib/constants/labels";

const FREE_TIER_VALUES = FREE_TIER_FILTER_OPTIONS.map((o) => o.value) as [
  string,
  ...string[],
];

/** Skema & tipe untuk pencarian direktori (query string). */
export const directorySearchSchema = z.object({
  q: z.string().trim().max(100).optional(),
  kategori: z.string().trim().max(80).optional(),
  akses: z.enum(["semua", ...ACCESS_TYPES]).default("semua"),
  gratis: z.enum(FREE_TIER_VALUES).default("semua"),
  status: z.enum(["verified", "expired", "semua"]).default("verified"),
  urut: z.enum(["terbaru", "relevansi"]).default("terbaru"),
  halaman: z.coerce.number().int().min(1).max(500).default(1),
});

export type DirectorySearch = z.infer<typeof directorySearchSchema>;

export function parseDirectorySearch(
  params: Record<string, string | string[] | undefined>,
): DirectorySearch {
  const single = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const raw = {
    q: single(params.q) || undefined,
    kategori: single(params.kategori) || undefined,
    akses: single(params.akses) || undefined,
    gratis: single(params.gratis) || undefined,
    status: single(params.status) || undefined,
    urut: single(params.urut) || undefined,
    halaman: single(params.halaman) || undefined,
  };
  // Validasi per-field agar satu filter tidak valid tidak membuang filter lain.
  const fallback = directorySearchSchema.parse({});
  const parsed = directorySearchSchema.safeParse(raw);
  if (parsed.success) return parsed.data;

  // Hanya buang field yang memang tidak valid; `undefined` membuat Zod memakai
  // default-nya, bukan mengosongkan filter yang sebenarnya baik. Logika ini
  // ditulis per-field (tanpa spread `raw`) agar field baru tidak lolos validasi.
  const result = { ...fallback };
  const retry = {
    q: raw.q,
    kategori: raw.kategori,
    akses: raw.akses && ["semua", ...ACCESS_TYPES].includes(raw.akses as never)
      ? raw.akses
      : undefined,
    gratis: raw.gratis && FREE_TIER_VALUES.includes(raw.gratis) ? raw.gratis : undefined,
    status:
      raw.status && ["verified", "expired", "semua"].includes(raw.status)
        ? raw.status
        : undefined,
    urut:
      raw.urut && ["terbaru", "relevansi"].includes(raw.urut) ? raw.urut : undefined,
    halaman:
      raw.halaman !== undefined && Number.isFinite(Number(raw.halaman))
        ? raw.halaman
        : undefined,
  };
  const second = directorySearchSchema.safeParse(retry);
  return second.success ? second.data : result;
}

export const programStatusLiteral = z.enum(PROGRAM_STATUSES);
export const sourceTypeLiteral = z.enum(SOURCE_TYPES);
export const reportReasonLiteral = z.enum(REPORT_REASONS);

export { PAGE_SIZE };
