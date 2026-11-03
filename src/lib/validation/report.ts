import { z } from "zod";

import {
  REPORT_DESCRIPTION_MAX,
  REPORT_DESCRIPTION_MIN,
  REPORT_REASONS,
} from "@/lib/constants/labels";
import { sanitizeText } from "@/lib/security/sanitize";

const uuid = z.uuid();

export const reportInputSchema = z.object({
  programId: uuid,
  reason: z.enum(REPORT_REASONS),
  description: z
    .string()
    .transform(sanitizeText)
    .pipe(
      z
        .string()
        .min(REPORT_DESCRIPTION_MIN, `Minimal ${REPORT_DESCRIPTION_MIN} karakter.`)
        .max(REPORT_DESCRIPTION_MAX, `Maksimal ${REPORT_DESCRIPTION_MAX} karakter.`),
    ),
  turnstileToken: z.string().max(4096).optional(),
});

export type ReportInput = z.infer<typeof reportInputSchema>;
