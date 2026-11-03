"use server";

/**
 * Server Actions alur kontribusi (PRD FR-CON-1..7).
 *
 * Setiap aksi:
 *  1. mengautentikasi (bukan sekadar render-gating — ini entry point publik),
 *  2. memvalidasi input dengan Zod (server-side),
 *  3. memindai data sensitif (NIK/KK/rekening) dan menolak bila ditemukan,
 *  4. memeriksa kepemilikan baris dari sesi (bukan dari klien),
 *  5. memakai RLS + RPC untuk transisi status.
 *
 * Nilai kembalian selalu berbentuk `ActionResult` — tidak mengekspos baris DB.
 */

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import {
  contributionFormSchema,
  contributionScanFields,
} from "@/lib/validation/contribution";
import {
  scanSensitiveFields,
  sensitiveScanUserMessage,
} from "@/lib/security/sensitive-scan";
import { checkRateLimitWithFallback } from "@/lib/security/rate-limit-server";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";

export type ActionResult =
  | { ok: true; message?: string; programId?: string; slug?: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

function uuidSuffix(): string {
  // 6 karakter hex acak — cukup untuk menghindari tabrakan slug.
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function buildSlug(title: string): string {
  const base = slugify(title).slice(0, 80) || "program";
  return `${base}-${uuidSuffix()}`;
}

function fieldErrorsFrom(
  issues: Array<{ path: (string | number | symbol)[]; message: string }>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "_form";
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

/**
 * Menyimpan (create/update) program sebagai DRAFT.
 * Draft tidak terlihat publik. Submit dilakukan lewat aksi terpisah.
 */
export async function saveDraft(
  programId: string | null,
  rawInput: unknown,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, message: "Sesi berakhir. Silakan masuk ulang." };
  }
  if (user.isBanned) {
    return {
      ok: false,
      message: "Akun Anda sedang dibatasi sehingga tidak dapat menyimpan kontribusi.",
    };
  }

  const parsed = contributionFormSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Periksa kembali isian yang ditandai.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }
  const input = parsed.data;

  // Pemindaian data pribadi (sebelum menyentuh database).
  const findings = scanSensitiveFields(contributionScanFields(input));
  if (findings.length > 0) {
    return { ok: false, message: sensitiveScanUserMessage(findings) };
  }

  const rate = await checkRateLimitWithFallback("drafts", user.id, {
    name: "contributions-draft",
    ...RATE_LIMITS.contributionsDraft,
  });
  if (!rate.success) {
    return {
      ok: false,
      message: "Terlalu banyak penyimpanan dalam waktu singkat. Tunggu sebentar.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const programRow = {
    title: input.title,
    description: input.description,
    category_id: input.categoryId,
    region_scope: input.regionScope,
    province: input.province,
    city: input.city,
    organizer: input.organizer,
    requirements: input.requirements,
    published_at: input.publishedAt,
    start_date: input.startDate,
    end_date: input.endDate,
    contributor_note: input.contributorNote,
  };

  let savedId: string;
  let slug: string;

  if (programId) {
    const effectiveId: string = programId;
    const existing = await supabase
      .from("assistance_programs")
      .select("id, status, contributor_id, slug")
      .eq("id", effectiveId)
      .eq("contributor_id", user.id)
      .maybeSingle();

    if (existing.error || !existing.data) {
      return { ok: false, message: "Kontribusi tidak ditemukan atau bukan milik Anda." };
    }
    if (!["draft", "needs_changes"].includes(existing.data.status)) {
      return {
        ok: false,
        message: "Kontribusi yang sudah dikirim tidak dapat diubah. Tarik dulu ke draf.",
      };
    }
    slug = existing.data.slug;

    const { error } = await supabase
      .from("assistance_programs")
      .update(programRow)
      .eq("id", effectiveId)
      .eq("contributor_id", user.id);
    if (error) {
      console.error("[saveDraft] update gagal:", error.message);
      return { ok: false, message: "Gagal menyimpan perubahan. Silakan coba lagi." };
    }

    // Ganti seluruh sumber (paling sederhana & konsisten).
    const del = await supabase.from("sources").delete().eq("program_id", effectiveId);
    if (del.error) {
      console.error("[saveDraft] hapus sumber gagal:", del.error.message);
      return { ok: false, message: "Gagal memperbarui sumber. Silakan coba lagi." };
    }
    savedId = effectiveId;
  } else {
    slug = buildSlug(input.title);
    const { data, error } = await supabase
      .from("assistance_programs")
      .insert({ ...programRow, slug, status: "draft", contributor_id: user.id })
      .select("id")
      .single();
    if (error || !data) {
      console.error("[saveDraft] insert gagal:", error?.message);
      return { ok: false, message: "Gagal menyimpan draf. Silakan coba lagi." };
    }
    savedId = data.id;
  }

  const { error: sourceError } = await supabase.from("sources").insert(
    input.sources.map((s) => ({
      program_id: savedId,
      source_url: s.url,
      source_url_normalized: s.normalized,
      source_title: s.title,
      source_type: s.type,
      is_primary: s.isPrimary,
    })),
  );
  if (sourceError) {
    console.error("[saveDraft] insert sumber gagal:", sourceError.message);
    return {
      ok: false,
      message:
        "Gagal menyimpan sumber. Pastikan tidak ada tautan yang sama pada informasi lain.",
    };
  }

  revalidatePath("/dashboard/kontribusi");
  return {
    ok: true,
    message: "Draf tersimpan.",
    programId: savedId,
    slug,
  };
}

/**
 * Menyimpan lalu langsung mengirim untuk ditinjau.
 * Menggunakan RPC `submit_program` sehingga aturan status/kuota dipusatkan di DB.
 */
export async function saveAndSubmit(
  programId: string | null,
  rawInput: unknown,
): Promise<ActionResult> {
  const saved = await saveDraft(programId, rawInput);
  if (!saved.ok) return saved;
  return submitProgram(saved.programId!);
}

/** Mengirim draf/perlu-revisi ke antrean reviewer (RPC submit_program). */
export async function submitProgram(programId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sesi berakhir. Silakan masuk ulang." };
  if (!programId) return { ok: false, message: "Kontribusi tidak ditemukan." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("submit_program", { p_program_id: programId });
  if (error) {
    return { ok: false, message: mapRpcError(error.message) };
  }

  revalidatePath("/dashboard/kontribusi");
  revalidatePath(`/dashboard/kontribusi/${programId}`);
  return { ok: true, message: "Kontribusi dikirim untuk ditinjau reviewer." };
}

/** Menarik kontribusi pending kembali ke draf (RPC withdraw_program). */
export async function withdrawProgram(programId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sesi berakhir. Silakan masuk ulang." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("withdraw_program", { p_program_id: programId });
  if (error) {
    return { ok: false, message: mapRpcError(error.message) };
  }

  revalidatePath("/dashboard/kontribusi");
  revalidatePath(`/dashboard/kontribusi/${programId}`);
  return { ok: true, message: "Kontribusi ditarik kembali ke draf." };
}

/**
 * Menerjemahkan pesan RPC menjadi kalimat untuk pengguna.
 * Pesan dari DB sudah berbahasa Indonesia; hindari bocornya detail internal.
 */
function mapRpcError(message: string): string {
  if (/batas pengiriman harian/i.test(message)) {
    return "Batas pengiriman harian tercapai. Coba lagi besok.";
  }
  if (/kontributor baru/i.test(message)) {
    return "Kontributor baru dibatasi 3 kontribusi dalam peninjauan. Tunggu keputusan reviewer.";
  }
  if (/sumber/i.test(message)) {
    return "Tambahkan minimal satu sumber sebelum mengirim.";
  }
  if (/dibatasi/i.test(message)) {
    return "Akun Anda sedang dibatasi sehingga tidak dapat mengirim.";
  }
  if (/milik sendiri/i.test(message)) {
    return "Anda hanya dapat mengirim kontribusi milik sendiri.";
  }
  if (/ditemukan/i.test(message)) {
    return "Kontribusi tidak ditemukan.";
  }
  console.error("[contribution] RPC error:", message);
  return "Terjadi kesalahan saat memproses kontribusi. Silakan coba lagi.";
}


