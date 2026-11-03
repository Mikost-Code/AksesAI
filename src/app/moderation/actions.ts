"use server";

/**
 * Server Actions untuk moderator (PHASE 5).
 *
 * Sama seperti aksi reviewer: autentikasi + role diperiksa di dalam aksi,
 * dan semua perubahan status laporan/program lewat RPC `security definer`
 * (`resolve_report`, `mark_report_in_review`) sehingga audit log tercatat
 * dan aturan "catatan wajib" ditegakkan di database.
 */

import { revalidatePath } from "next/cache";

import { getCurrentUser, hasAnyRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { reportIdSchema, resolveReportSchema } from "@/lib/validation/staff";

export type ModerationResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export type ModerationAction =
  | "dismiss"
  | "reopen_for_review"
  | "archive_program"
  | "resolve"
  | "ban_contributor";

async function requireModerator(): Promise<
  { ok: true; userId: string } | { ok: false; message: string }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sesi berakhir. Silakan masuk ulang." };
  if (user.isBanned) {
    return { ok: false, message: "Akun Anda dibatasi sehingga tidak dapat memoderasi." };
  }
  if (!hasAnyRole(user, ["moderator", "admin"])) {
    return { ok: false, message: "Anda tidak memiliki akses moderator." };
  }
  return { ok: true, userId: user.id };
}

/** Menyelesaikan laporan dengan aksi tertentu (RPC resolve_report). */
export async function resolveReport(
  reportId: string,
  action: ModerationAction,
  note: string,
): Promise<ModerationResult> {
  const auth = await requireModerator();
  if (!auth.ok) return auth;

  const parsed = resolveReportSchema.safeParse({ reportId, action, note });
  if (!parsed.success) {
    const needsNote =
      action === "reopen_for_review" ||
      action === "archive_program" ||
      action === "ban_contributor";
    return {
      ok: false,
      message: parsed.error.issues[0]?.message
        ? parsed.error.issues[0].message
        : needsNote
          ? "Catatan minimal 10 karakter untuk aksi ini."
          : "Input tidak valid.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("resolve_report", {
    p_report_id: parsed.data.reportId,
    p_action: parsed.data.action,
    p_note: parsed.data.note || null,
  });
  if (error) {
    if (/sudah diselesaikan/i.test(error.message)) {
      return { ok: false, message: "Laporan ini sudah diselesaikan." };
    }
    console.error("[moderation] RPC resolve_report gagal:", error.message);
    return { ok: false, message: "Gagal memproses laporan. Silakan coba lagi." };
  }

  revalidatePath("/moderation/reports");
  revalidatePath("/bansos");
  revalidatePath("/dashboard/kontribusi");
  return { ok: true, message: "Laporan diselesaikan." };
}

/** Menandai laporan sedang ditangani. */
export async function markReportInReview(reportId: string): Promise<ModerationResult> {
  const auth = await requireModerator();
  if (!auth.ok) return auth;

  const parsed = reportIdSchema.safeParse({ reportId });
  if (!parsed.success) return { ok: false, message: "ID laporan tidak valid." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("mark_report_in_review", {
    p_report_id: parsed.data.reportId,
  });
  if (error) {
    console.error("[moderation] RPC mark_report_in_review gagal:", error.message);
    return { ok: false, message: "Gagal menandai laporan. Mungkin sudah diproses." };
  }

  revalidatePath("/moderation/reports");
  return { ok: true, message: "Laporan ditandai sedang ditangani." };
}
