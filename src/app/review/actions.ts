"use server";

/**
 * Server Actions untuk reviewer (PHASE 5).
 *
 * Kontrak keamanan:
 *  - Autentikasi + pemeriksaan role DI DALAM aksi (bukan hanya UI).
 *  - Transisi status HANYA lewat RPC `security definer` (bukan UPDATE langsung),
 *    sehingga trigger penjaga dan aturan "tidak boleh meninjau sendiri" berlaku.
 *  - Setiap aksi mengembalikan `ReviewActionResult`; tidak mengekspos baris DB.
 */

import { revalidatePath } from "next/cache";

import { getCurrentUser, hasAnyRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { REVIEW_REASON_MAX, REVIEW_REASON_MIN } from "@/lib/constants/labels";

export type ReviewActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

async function requireReviewer(): Promise<
  { ok: true; userId: string } | { ok: false; message: string }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sesi berakhir. Silakan masuk ulang." };
  if (user.isBanned) {
    return { ok: false, message: "Akun Anda dibatasi sehingga tidak dapat meninjau." };
  }
  if (!hasAnyRole(user, ["reviewer", "admin"])) {
    return { ok: false, message: "Anda tidak memiliki akses reviewer." };
  }
  return { ok: true, userId: user.id };
}

function mapReviewError(message: string): string {
  if (/milik sendiri|sendiri/i.test(message)) {
    return "Anda tidak dapat meninjau kontribusi sendiri.";
  }
  if (/reviewer lain|sedang ditinjau/i.test(message)) {
    return "Item ini sedang ditinjau reviewer lain. Coba lagi setelah klaim kedaluwarsa.";
  }
  if (/minimal 20 karakter|alasan/i.test(message)) {
    return `Alasan minimal ${REVIEW_REASON_MIN} karakter.`;
  }
  if (/tidak ditemukan/i.test(message)) {
    return "Kontribusi tidak ditemukan.";
  }
  if (/hanya item pending|status/i.test(message)) {
    return "Status kontribusi sudah berubah. Muat ulang halaman.";
  }
  console.error("[review] RPC error:", message);
  return "Terjadi kesalahan saat memproses tinjauan. Silakan coba lagi.";
}

function revalidateReview(id: string) {
  revalidatePath("/review");
  revalidatePath(`/review/${id}`);
  revalidatePath("/dashboard/kontribusi");
  revalidatePath("/bansos");
}

/** Reviewer mengambil item antrean (klaim 30 menit). */
export async function claimProgram(programId: string): Promise<ReviewActionResult> {
  const auth = await requireReviewer();
  if (!auth.ok) return auth;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("claim_program", { p_program_id: programId });
  if (error) return { ok: false, message: mapReviewError(error.message) };

  revalidateReview(programId);
  return { ok: true, message: "Item diambil. Anda punya 30 menit untuk meninjau." };
}

/** Memverifikasi program (pending → verified). */
export async function verifyProgram(programId: string): Promise<ReviewActionResult> {
  const auth = await requireReviewer();
  if (!auth.ok) return auth;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("verify_program", { p_program_id: programId });
  if (error) return { ok: false, message: mapReviewError(error.message) };

  revalidateReview(programId);
  return { ok: true, message: "Kontribusi diverifikasi dan tampil publik." };
}

/** Meminta revisi (pending → needs_changes), wajib alasan ≥ 20 karakter. */
export async function requestChanges(
  programId: string,
  reason: string,
): Promise<ReviewActionResult> {
  const auth = await requireReviewer();
  if (!auth.ok) return auth;

  const trimmed = typeof reason === "string" ? reason.trim() : "";
  if (trimmed.length < REVIEW_REASON_MIN) {
    return {
      ok: false,
      message: `Alasan minimal ${REVIEW_REASON_MIN} karakter agar kontributor tahu apa yang harus diperbaiki.`,
    };
  }
  if (trimmed.length > REVIEW_REASON_MAX) {
    return { ok: false, message: `Alasan maksimal ${REVIEW_REASON_MAX} karakter.` };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("request_changes", {
    p_program_id: programId,
    p_reason: trimmed,
  });
  if (error) return { ok: false, message: mapReviewError(error.message) };

  revalidateReview(programId);
  return { ok: true, message: "Permintaan revisi dikirim ke kontributor." };
}

/** Menolak kontribusi (pending → rejected), wajib alasan. */
export async function rejectProgram(
  programId: string,
  reason: string,
): Promise<ReviewActionResult> {
  const auth = await requireReviewer();
  if (!auth.ok) return auth;

  const trimmed = typeof reason === "string" ? reason.trim() : "";
  if (trimmed.length < REVIEW_REASON_MIN) {
    return { ok: false, message: `Alasan minimal ${REVIEW_REASON_MIN} karakter.` };
  }
  if (trimmed.length > REVIEW_REASON_MAX) {
    return { ok: false, message: `Alasan maksimal ${REVIEW_REASON_MAX} karakter.` };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("reject_program", {
    p_program_id: programId,
    p_reason: trimmed,
  });
  if (error) return { ok: false, message: mapReviewError(error.message) };

  revalidateReview(programId);
  return { ok: true, message: "Kontribusi ditolak." };
}

/** Menandai program kedaluwarsa (verified → expired). */
export async function markExpired(
  programId: string,
  reason?: string,
): Promise<ReviewActionResult> {
  const auth = await requireReviewer();
  if (!auth.ok) return auth;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("mark_expired", {
    p_program_id: programId,
    p_reason: reason?.trim() || null,
  });
  if (error) return { ok: false, message: mapReviewError(error.message) };

  revalidateReview(programId);
  revalidatePath("/bansos");
  return { ok: true, message: "Program ditandai kedaluwarsa." };
}
