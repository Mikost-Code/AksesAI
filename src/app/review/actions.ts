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

import { revalidateDirectory } from "@/lib/cache-tags";
import { getCurrentUser, hasAnyRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { REVIEW_REASON_MIN } from "@/lib/constants/labels";
import {
  markExpiredSchema,
  programIdSchema,
  promoEndSchema,
  reviewReasonSchema,
} from "@/lib/validation/staff";

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
  // Pesan RPC kendali masa berlaku sudah ditulis dalam bahasa pengguna.
  if (/tanggal berakhir tidak boleh/i.test(message)) {
    return "Tanggal berakhir tidak boleh sebelum tanggal mulai.";
  }
  if (/masa berlaku hanya dapat diubah/i.test(message)) {
    return "Masa berlaku hanya dapat diubah untuk program yang sudah dikirim.";
  }
  if (/berwenang mengubah masa berlaku/i.test(message)) {
    return "Anda tidak berwenang mengubah masa berlaku program.";
  }
  console.error("[review] RPC error:", message);
  return "Terjadi kesalahan saat memproses tinjauan. Silakan coba lagi.";
}

function revalidateReview(id: string) {
  revalidatePath("/review");
  revalidatePath(`/review/${id}`);
  revalidatePath("/admin/program");
  revalidatePath("/dashboard/kontribusi");
  revalidatePath("/info");
  // `revalidatePath` tidak menyentuh entri `unstable_cache`; tag wajib juga
  // dibuang agar direktori & profil kontributor langsung mencerminkan status
  // baru (lihat catatan di lib/cache-tags.ts).
  revalidateDirectory();
}

/** Reviewer mengambil item antrean (klaim 30 menit). */
export async function claimProgram(programId: string): Promise<ReviewActionResult> {
  const auth = await requireReviewer();
  if (!auth.ok) return auth;

  const parsed = programIdSchema.safeParse({ programId });
  if (!parsed.success) return { ok: false, message: "ID kontribusi tidak valid." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("claim_program", { p_program_id: parsed.data.programId });
  if (error) return { ok: false, message: mapReviewError(error.message) };

  revalidateReview(parsed.data.programId);
  return { ok: true, message: "Item diambil. Anda punya 30 menit untuk meninjau." };
}

/** Memverifikasi program (pending → verified). */
export async function verifyProgram(programId: string): Promise<ReviewActionResult> {
  const auth = await requireReviewer();
  if (!auth.ok) return auth;

  const parsed = programIdSchema.safeParse({ programId });
  if (!parsed.success) return { ok: false, message: "ID kontribusi tidak valid." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("verify_program", { p_program_id: parsed.data.programId });
  if (error) return { ok: false, message: mapReviewError(error.message) };

  revalidateReview(parsed.data.programId);
  return { ok: true, message: "Kontribusi diverifikasi dan tampil publik." };
}

/** Meminta revisi (pending → needs_changes), wajib alasan ≥ 20 karakter. */
export async function requestChanges(
  programId: string,
  reason: string,
): Promise<ReviewActionResult> {
  const auth = await requireReviewer();
  if (!auth.ok) return auth;

  const parsed = reviewReasonSchema.safeParse({ programId, reason });
  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ??
        `Alasan minimal ${REVIEW_REASON_MIN} karakter agar kontributor tahu apa yang harus diperbaiki.`,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("request_changes", {
    p_program_id: parsed.data.programId,
    p_reason: parsed.data.reason,
  });
  if (error) return { ok: false, message: mapReviewError(error.message) };

  revalidateReview(parsed.data.programId);
  return { ok: true, message: "Permintaan revisi dikirim ke kontributor." };
}

/** Menolak kontribusi (pending → rejected), wajib alasan. */
export async function rejectProgram(
  programId: string,
  reason: string,
): Promise<ReviewActionResult> {
  const auth = await requireReviewer();
  if (!auth.ok) return auth;

  const parsed = reviewReasonSchema.safeParse({ programId, reason });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? `Alasan minimal ${REVIEW_REASON_MIN} karakter.`,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("reject_program", {
    p_program_id: parsed.data.programId,
    p_reason: parsed.data.reason,
  });
  if (error) return { ok: false, message: mapReviewError(error.message) };

  revalidateReview(parsed.data.programId);
  return { ok: true, message: "Kontribusi ditolak." };
}

/** Menandai program kedaluwarsa (verified → expired). */
export async function markExpired(
  programId: string,
  reason?: string,
): Promise<ReviewActionResult> {
  const auth = await requireReviewer();
  if (!auth.ok) return auth;

  const parsed = markExpiredSchema.safeParse({ programId, reason });
  if (!parsed.success) return { ok: false, message: "ID kontribusi tidak valid." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("mark_expired", {
    p_program_id: parsed.data.programId,
    p_reason: parsed.data.reason?.trim() || null,
  });
  if (error) return { ok: false, message: mapReviewError(error.message) };

  revalidateReview(parsed.data.programId);
  revalidatePath("/info");
  revalidateDirectory();
  return { ok: true, message: "Program ditandai kedaluwarsa." };
}

/**
 * Mengoreksi tanggal berakhir program (verified/expired/pending).
 * String kosong menghapus batas waktu — program kembali tanpa kedaluwarsa
 * otomatis. Otorisasi & validasi tanggal ditegakkan ulang di RPC.
 */
export async function setPromoEnd(
  programId: string,
  promoEnd: string,
): Promise<ReviewActionResult> {
  const auth = await requireReviewer();
  if (!auth.ok) return auth;

  const parsed = promoEndSchema.safeParse({ programId, promoEnd });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Tanggal berakhir tidak valid.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("reviewer_set_promo_end", {
    p_program_id: parsed.data.programId,
    p_promo_end: parsed.data.promoEnd || null,
  });
  if (error) return { ok: false, message: mapReviewError(error.message) };

  revalidateReview(parsed.data.programId);
  return {
    ok: true,
    message: parsed.data.promoEnd
      ? "Tanggal berakhir diperbarui."
      : "Batas waktu dihapus; program tidak akan kedaluwarsa otomatis.",
  };
}
