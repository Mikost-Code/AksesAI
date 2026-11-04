"use server";

/**
 * Server Actions untuk admin (PHASE 6).
 *
 * Kontrak keamanan (docs/SECURITY.md):
 *  - Autentikasi + role `admin` diperiksa DI DALAM aksi, bukan hanya layout.
 *  - Semua perubahan role/blokir/kategori lewat RPC `security definer`
 *    (`grant_role`, `revoke_role`, `set_user_banned`, `upsert_category`)
 *    yang mencatat audit log dan menegakkan aturan (mis. admin terakhir
 *    tidak dapat dicabut, moderator tidak dapat memblokir admin).
 *  - Admin tidak dapat mengubah role/blokir dirinya sendiri lewat UI untuk
 *    mencegah admin tak sengaja mengunci diri (pemeriksaan tambahan di sini;
 *    RPC tetap menjadi penjaga utama).
 */

import { revalidatePath } from "next/cache";

import { getCurrentUser, hasRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ADMIN_REASON_MIN, type AppRole } from "@/lib/constants/labels";
import {
  categoryInputSchema,
  grantRoleSchema,
  revokeRoleSchema,
  setBannedSchema,
  type CategoryInputValidated,
} from "@/lib/validation/staff";

export type AdminResult = { ok: true; message: string } | { ok: false; message: string };

async function requireAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; message: string }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sesi berakhir. Silakan masuk ulang." };
  if (user.isBanned) {
    return { ok: false, message: "Akun Anda dibatasi sehingga tidak dapat melakukan aksi admin." };
  }
  if (!hasRole(user, "admin")) {
    return { ok: false, message: "Anda tidak memiliki akses administrator." };
  }
  return { ok: true, userId: user.id };
}

function mapAdminError(message: string): string {
  if (/admin terakhir/i.test(message)) {
    return "Tidak dapat mencabut admin terakhir — aplikasi akan tanpa administrator.";
  }
  if (/role member/i.test(message)) {
    return "Role member tidak dapat dicabut (semua pengguna selalu member).";
  }
  if (/role tidak ditemukan/i.test(message)) {
    return "Pengguna ini tidak memiliki role tersebut.";
  }
  if (/alasan wajib|minimal 10 karakter/i.test(message)) {
    return `Alasan wajib diisi minimal ${ADMIN_REASON_MIN} karakter.`;
  }
  if (/hanya admin yang dapat mengubah status admin/i.test(message)) {
    return "Hanya admin yang dapat mengubah status admin.";
  }
  if (/tidak ditemukan/i.test(message)) {
    return "Data tidak ditemukan. Muat ulang halaman.";
  }
  if (/duplicate key|sudah ada|unique/i.test(message)) {
    return "Slug kategori sudah dipakai. Gunakan slug lain.";
  }
  console.error("[admin] RPC error:", message);
  return "Terjadi kesalahan saat memproses aksi admin. Silakan coba lagi.";
}

function revalidateAdmin() {
  revalidatePath("/admin");
  revalidatePath("/admin/pengguna");
  revalidatePath("/admin/kategori");
  // Role/blokir memengaruhi akses area staf & tampilan publik (nama kontributor).
  revalidatePath("/review");
  revalidatePath("/moderation/reports");
  revalidatePath("/info");
}

// ---------------------------------------------------------------------------
// Role
// ---------------------------------------------------------------------------

/** Memberikan role staf (reviewer/moderator/admin) kepada pengguna. */
export async function grantUserRole(
  userId: string,
  role: Exclude<AppRole, "member">,
): Promise<AdminResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const parsed = grantRoleSchema.safeParse({ userId, role });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Input tidak valid." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("grant_role", {
    p_user_id: parsed.data.userId,
    p_role: parsed.data.role,
  });
  if (error) return { ok: false, message: mapAdminError(error.message) };

  revalidateAdmin();
  return { ok: true, message: `Role ${parsed.data.role} diberikan.` };
}

/** Mencabut role staf dari pengguna. Admin terakhir dilindungi oleh RPC. */
export async function revokeUserRole(
  userId: string,
  role: Exclude<AppRole, "member">,
): Promise<AdminResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  if (userId === auth.userId && role === "admin") {
    return {
      ok: false,
      message:
        "Anda tidak dapat mencabut role admin milik sendiri lewat UI. Minta admin lain melakukannya.",
    };
  }

  const parsed = revokeRoleSchema.safeParse({ userId, role });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Input tidak valid." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("revoke_role", {
    p_user_id: parsed.data.userId,
    p_role: parsed.data.role,
  });
  if (error) return { ok: false, message: mapAdminError(error.message) };

  revalidateAdmin();
  return { ok: true, message: `Role ${parsed.data.role} dicabut.` };
}

// ---------------------------------------------------------------------------
// Blokir
// ---------------------------------------------------------------------------

/** Memblokir / membuka blokir pengguna. Alasan wajib (audit log). */
export async function setUserBanned(
  userId: string,
  banned: boolean,
  reason: string,
): Promise<AdminResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  if (userId === auth.userId) {
    return { ok: false, message: "Anda tidak dapat memblokir akun sendiri." };
  }

  const parsed = setBannedSchema.safeParse({ userId, banned, reason });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? `Alasan minimal ${ADMIN_REASON_MIN} karakter.`,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("set_user_banned", {
    p_user_id: parsed.data.userId,
    p_banned: parsed.data.banned,
    p_reason: parsed.data.reason,
  });
  if (error) return { ok: false, message: mapAdminError(error.message) };

  revalidateAdmin();
  return {
    ok: true,
    message: parsed.data.banned ? "Pengguna diblokir." : "Blokir pengguna dibuka.",
  };
}

// ---------------------------------------------------------------------------
// Kategori
// ---------------------------------------------------------------------------

export type CategoryInput = {
  id: string | null;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
};

/**
 * Membuat atau memperbarui kategori lewat RPC `upsert_category`.
 * Bentuk input divalidasi Zod (`categoryInputSchema`); RPC menangani
 * otorisasi, audit log, dan konflik slug di database.
 */
export async function saveCategory(input: CategoryInput): Promise<AdminResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Input tidak valid." };
  }
  const data: CategoryInputValidated = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("upsert_category", {
    p_id: data.id,
    p_name: data.name,
    p_slug: data.slug,
    p_description: data.description || null,
    p_is_active: data.isActive,
    p_sort_order: data.sortOrder,
  });
  if (error) return { ok: false, message: mapAdminError(error.message) };

  revalidatePath("/admin/kategori");
  revalidatePath("/admin");
  revalidatePath("/info");
  revalidatePath("/kategori/[slug]", "layout");
  return {
    ok: true,
    message: data.id ? "Kategori diperbarui." : "Kategori dibuat.",
  };
}
