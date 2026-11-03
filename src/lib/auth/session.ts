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
  const allowed = new Set<AppRole>(["member", "reviewer", "moderator", "admin"]);
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, github_username, github_avatar, github_url, is_banned, user_roles(role)")
    .eq("id", user.id)
    .maybeSingle();

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

export function hasRole(user: CurrentUser | null, role: AppRole): boolean {
  return Boolean(user?.roles.includes(role));
}

export function hasAnyRole(user: CurrentUser | null, roles: AppRole[]): boolean {
  if (!user) return false;
  return roles.some((r) => user.roles.includes(r));
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

