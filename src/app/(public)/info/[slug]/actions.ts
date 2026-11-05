"use server";

/**
 * Server Action feedback "berguna" per entri direktori.
 *
 * Kontrak keamanan:
 *  - Identitas pemilih = sha256(salt:identitas) dihitung di server (IP untuk
 *    anonim, id pengguna untuk yang login). IP mentah tidak pernah disimpan.
 *  - Satu suara per identitas per entri (upsert di DB, unique constraint).
 *  - Rate limit per identitas (Upstash → fallback Postgres → fail-open).
 *  - Validasi + agregat lewat RPC `security definer` (migrasi 0011); tabel
 *    `program_feedback` tidak punya policy klien.
 */

import { headers } from "next/headers";

import { getCurrentUser } from "@/lib/auth/session";
import { z } from "zod";
import { checkRateLimitWithFallback } from "@/lib/security/rate-limit-server";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { getClientIp, hashIpAddress } from "@/lib/security/ip-hash";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const feedbackSchema = z.object({
  programId: z.uuid({ error: "ID entri tidak valid." }),
  helpful: z.boolean(),
});

export type FeedbackResult =
  | { ok: true; helpful: number; notHelpful: number }
  | { ok: false; message: string };

export async function submitProgramFeedback(
  programId: string,
  helpful: boolean,
): Promise<FeedbackResult> {
  const parsed = feedbackSchema.safeParse({ programId, helpful });
  if (!parsed.success) {
    return { ok: false, message: "Permintaan tidak valid." };
  }

  // Identitas pemilih: akun bila login, hash IP bila anonim.
  const user = await getCurrentUser();
  const identity = user ? `user:${user.id}` : `ip:${getClientIp(await headers())}`;
  const voterHash = hashIpAddress(identity);

  const rule = { name: "feedback", ...RATE_LIMITS.feedbackPerVoter };
  const limit = await checkRateLimitWithFallback("feedback", voterHash, rule);
  if (!limit.success) {
    return {
      ok: false,
      message: `Terlalu sering. Coba lagi dalam ${Math.ceil(limit.retryAfterSeconds / 60)} menit.`,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("record_program_feedback", {
    p_program_id: parsed.data.programId,
    p_voter_hash: voterHash,
    p_is_helpful: parsed.data.helpful,
  });

  if (error) {
    console.error("[feedback] RPC gagal:", error.message);
    return { ok: false, message: "Gagal menyimpan umpan balik. Coba lagi." };
  }

  const counts = (data ?? {}) as { helpful?: number; notHelpful?: number };
  return {
    ok: true,
    helpful: counts.helpful ?? 0,
    notHelpful: counts.notHelpful ?? 0,
  };
}
