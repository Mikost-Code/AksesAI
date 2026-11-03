import { z } from "zod";

import { PAGE_SIZE, PROGRAM_STATUSES, PROVINCES, REPORT_REASONS, SOURCE_TYPES } from "@/lib/constants/labels";

/** Skema & tipe untuk pencarian direktori (query string). */
export const directorySearchSchema = z.object({
  q: z.string().trim().max(100).optional(),
  kategori: z.string().trim().max(80).optional(),
  provinsi: z.enum(PROVINCES).optional(),
  kota: z.string().trim().max(80).optional(),
  status: z.enum(["verified", "expired", "semua"]).default("verified"),
  urut: z.enum(["terbaru", "relevansi"]).default("terbaru"),
  halaman: z.coerce.number().int().min(1).max(500).default(1),
});

export type DirectorySearch = z.infer<typeof directorySearchSchema>;

export function parseDirectorySearch(params: Record<string, string | string[] | undefined>): DirectorySearch {
  const single = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const raw = {
    q: single(params.q) || undefined,
    kategori: single(params.kategori) || undefined,
    provinsi: single(params.provinsi) || undefined,
    kota: single(params.kota) || undefined,
    status: single(params.status) || undefined,
    urut: single(params.urut) || undefined,
    halaman: single(params.halaman) || undefined,
  };
  const parsed = directorySearchSchema.safeParse(raw);
  if (!parsed.success) {
    // Fallback aman: abaikan filter yang tidak valid.
    return directorySearchSchema.parse({});
  }
  return parsed.data;
}

export const programStatusLiteral = z.enum(PROGRAM_STATUSES);
export const sourceTypeLiteral = z.enum(SOURCE_TYPES);
export const reportReasonLiteral = z.enum(REPORT_REASONS);

export { PAGE_SIZE };
