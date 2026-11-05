import "server-only";

/**
 * Helper autentikasi & otorisasi server-side.
 *
 * Prinsip (docs/SECURITY.md §2–§3):
 * - Role SELALU dibaca dari database, bukan dari token/klaim klien.
 * - `requireRole` dipakai di layout & server action/route handler.
 * - RLS + RPC tetap menjadi lapisan pertahanan terakhir.
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/constants/labels";

export type CurrentUser = {
  id: string;
  githubUsername: string;
  avatarUrl: string | null;
  githubUrl: string | null;
  isBanned: boolean;
  roles: AppRole[];
};

function normalizeRoles(raw: unknown): AppRole[] {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set<AppRole>(["member", "reviewer", "moderator", "admin", "super_admin"]);
  return raw
    .map((r) => (typeof r === "object" && r !== null && "role" in r ? (r as { role: unknown }).role : r))
    .filter((r): r is AppRole => typeof r === "string" && allowed.has(r as AppRole));
}

/**
 * Ambil user saat ini beserta profil & role dari database.
 * Mengembalikan null bila belum login / profil belum ada.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    // `user_roles` punya dua FK ke `profiles` (user_id, assigned_by) sehingga
    // nama relasi harus eksplisit agar PostgREST tidak ambigu.
    .select("id, github_username, github_avatar, github_url, is_banned, user_roles!user_id(role)")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[auth] Gagal membaca profil pengguna:", profileError.message);
    return null;
  }
  if (!profile) return null;

  return {
    id: profile.id,
    githubUsername: profile.github_username,
    avatarUrl: profile.github_avatar,
    githubUrl: profile.github_url,
    isBanned: profile.is_banned,
    roles: normalizeRoles(profile.user_roles),
  };
}

/**
 * Pemeriksaan role dengan implikasi pemilik: `super_admin` mewarisi semua
 * role lain — setara (lebih tinggi dari) admin. Cermin dari helper
 * `has_role`/`has_any_role` di database (migrasi 0009) agar UI dan DB
 * selalu sepaham.
 */
export function hasRole(user: CurrentUser | null, role: AppRole): boolean {
  if (!user) return false;
  if (user.roles.includes("super_admin")) return true;
  return user.roles.includes(role);
}

export function hasAnyRole(user: CurrentUser | null, roles: AppRole[]): boolean {
  if (!user) return false;
  if (user.roles.includes("super_admin")) return true;
  return roles.some((r) => user.roles.includes(r));
}

/** Khusus pemilik (`super_admin`), TANPA implikasi — untuk gate yang eksklusif. */
export function isSuperAdmin(user: CurrentUser | null): boolean {
  return Boolean(user?.roles.includes("super_admin"));
}

export type AccessResult =
  | { ok: true; user: CurrentUser }
  | { ok: false; reason: "unauthenticated" | "forbidden" | "banned" };

/**
 * Memastikan user login, tidak diblokir, dan memiliki salah satu role.
 * Untuk dipakai di server action/route handler & layout area staf.
 */
export async function requireRole(roles: AppRole[]): Promise<AccessResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  if (user.isBanned) return { ok: false, reason: "banned" };
  if (roles.length > 0 && !hasAnyRole(user, roles)) {
    return { ok: false, reason: "forbidden" };
  }
  return { ok: true, user };
}

