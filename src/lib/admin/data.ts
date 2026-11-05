import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole, ProgramStatus, ReportReason, ReportStatus } from "@/lib/constants/labels";

/**
 * Data layer admin (PHASE 6).
 *
 * Semua query memakai sesi pengguna sehingga RLS tetap berlaku; halaman
 * `/admin*` dijaga oleh layout yang memeriksa role `admin` server-side.
 * Data di sini bersifat agregat/administratif — TIDAK memuat data pribadi
 * penerima bantuan (tidak pernah dikumpulkan).
 */

// ---------------------------------------------------------------------------
// Ringkasan (stats)
// ---------------------------------------------------------------------------

export type AdminStats = {
  totalPrograms: number;
  byStatus: Record<ProgramStatus, number>;
  totalUsers: number;
  bannedUsers: number;
  roleCounts: Record<AppRole, number>;
  openReports: number;
  pendingReview: number;
  totalCategories: number;
  lastCronRun: string | null;
};

const ALL_STATUSES: ProgramStatus[] = [
  "draft",
  "pending",
  "needs_changes",
  "verified",
  "rejected",
  "expired",
  "archived",
];

const ALL_ROLES: AppRole[] = ["member", "reviewer", "moderator", "admin", "super_admin"];

/**
 * Statistik ringkas untuk halaman `/admin`.
 *
 * Dihitung dari query agregat ringan (count head=true), bukan menarik
 * seluruh baris. Bila satu query gagal, angka yang bersangkutan menjadi 0
 * dan error dicatat ke log agar tidak menyesatkan.
 */
export async function getAdminStats(): Promise<AdminStats> {
  const supabase = await createSupabaseServerClient();

  const countPrograms = supabase
    .from("assistance_programs")
    .select("id", { count: "exact", head: true });

  const statusCounts = ALL_STATUSES.map((status) =>
    supabase
      .from("assistance_programs")
      .select("id", { count: "exact", head: true })
      .eq("status", status)
      .then(({ count, error }) => {
        if (error) console.error(`[admin-stats] status ${status}:`, error.message);
        return { status, count: count ?? 0 };
      }),
  );

  const [
    totalPrograms,
    totalUsers,
    bannedUsers,
    openReports,
    pendingReview,
    totalCategories,
    ...statusResults
  ] = await Promise.all([
    countPrograms.then(({ count, error }) => {
      if (error) console.error("[admin-stats] programs:", error.message);
      return count ?? 0;
    }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .then(({ count, error }) => {
        if (error) console.error("[admin-stats] users:", error.message);
        return count ?? 0;
      }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_banned", true)
      .then(({ count, error }) => {
        if (error) console.error("[admin-stats] banned:", error.message);
        return count ?? 0;
      }),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "in_review"] as ReportStatus[])
      .then(({ count, error }) => {
        if (error) console.error("[admin-stats] reports:", error.message);
        return count ?? 0;
      }),
    supabase
      .from("assistance_programs")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .then(({ count, error }) => {
        if (error) console.error("[admin-stats] pending:", error.message);
        return count ?? 0;
      }),
    supabase
      .from("categories")
      .select("id", { count: "exact", head: true })
      .then(({ count, error }) => {
        if (error) console.error("[admin-stats] categories:", error.message);
        return count ?? 0;
      }),
    ...statusCounts,
  ]);

  const byStatus = Object.fromEntries(ALL_STATUSES.map((s) => [s, 0])) as Record<
    ProgramStatus,
    number
  >;
  for (const { status, count } of statusResults) {
    byStatus[status] = count;
  }

  // Role dihitung dari tabel user_roles (member implisit, jadi hitung eksplisit).
  const roleCounts = Object.fromEntries(ALL_ROLES.map((r) => [r, 0])) as Record<
    AppRole,
    number
  >;
  const { data: roleRows, error: roleError } = await supabase
    .from("user_roles")
    .select("role");
  if (roleError) {
    console.error("[admin-stats] roles:", roleError.message);
  } else {
    for (const row of (roleRows ?? []) as Array<{ role: AppRole }>) {
      if (roleCounts[row.role] !== undefined) roleCounts[row.role] += 1;
    }
  }
  // member = semua pengguna (setiap pengguna selalu member).
  roleCounts.member = totalUsers;

  // Jejak cron terakhir dari audit log sistem (jika ada).
  const { data: cronLog } = await supabase
    .from("moderation_logs")
    .select("created_at")
    .like("action", "cron.%")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    totalPrograms,
    byStatus,
    totalUsers,
    bannedUsers,
    roleCounts,
    openReports,
    pendingReview,
    totalCategories,
    lastCronRun: (cronLog as { created_at: string } | null)?.created_at ?? null,
  };
}

// ---------------------------------------------------------------------------
// Pengguna & role
// ---------------------------------------------------------------------------

export type AdminUser = {
  id: string;
  username: string;
  avatarUrl: string | null;
  isBanned: boolean;
  roles: AppRole[];
  createdAt: string;
};

type RawAdminUser = {
  id: string;
  github_username: string;
  github_avatar: string | null;
  is_banned: boolean;
  created_at: string;
  user_roles: Array<{ role: AppRole }> | { role: AppRole }[] | null;
};

function normalizeRoleRows(
  raw: RawAdminUser["user_roles"],
): AppRole[] {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set<AppRole>(ALL_ROLES);
  return raw
    .map((r) => (typeof r === "object" && r !== null ? r.role : null))
    .filter((r): r is AppRole => typeof r === "string" && allowed.has(r as AppRole));
}

/**
 * Daftar pengguna untuk `/admin/pengguna` dengan pencarian username.
 * Dibatasi 50 baris per halaman; halaman disediakan lewat parameter.
 */
export async function listUsers(options: {
  search?: string;
  page?: number;
}): Promise<{ items: AdminUser[]; total: number; pageSize: number }> {
  const supabase = await createSupabaseServerClient();
  const pageSize = 50;
  const page = Math.min(500, Math.max(1, Math.trunc(options.page ?? 1)));
  const from = (page - 1) * pageSize;

  let query = supabase
    .from("profiles")
    .select(
      "id, github_username, github_avatar, is_banned, created_at, user_roles!user_id(role)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  const search = options.search?.trim();
  if (search) {
    // Escape karakter khusus PostgREST agar tidak menjadi wildcard liar.
    query = query.ilike("github_username", `%${search.replace(/[%_\\]/g, "\\$&")}%`);
  }

  const { data, error, count } = await query;
  if (error) {
    console.error("[admin-users] Query gagal:", error.message);
    return { items: [], total: 0, pageSize };
  }

  return {
    items: ((data ?? []) as unknown as RawAdminUser[]).map((row) => ({
      id: row.id,
      username: row.github_username,
      avatarUrl: row.github_avatar,
      isBanned: row.is_banned,
      roles: normalizeRoleRows(row.user_roles),
      createdAt: row.created_at,
    })),
    total: count ?? 0,
    pageSize,
  };
}

// ---------------------------------------------------------------------------
// Kategori
// ---------------------------------------------------------------------------

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  programCount: number;
};

/**
 * Semua kategori beserta jumlah program (untuk `/admin/kategori`).
 *
 * Jumlah program dihitung terpisah (satu query ringan) alih-alih lewat embed
 * bersarang, agar tidak menarik seluruh baris program untuk setiap kategori.
 */
export async function listCategoriesForAdmin(): Promise<AdminCategory[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, description, is_active, sort_order")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[admin-categories] Query gagal:", error.message);
    return [];
  }

  const rows = (data ?? []) as Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    is_active: boolean;
    sort_order: number;
  }>;

  // Hitung program per kategori dari data minimal (id + category_id).
  const { data: programRows, error: countError } = await supabase
    .from("assistance_programs")
    .select("category_id");
  const counts = new Map<string, number>();
  if (countError) {
    console.error("[admin-categories] Hitung program gagal:", countError.message);
  } else {
    for (const row of (programRows ?? []) as Array<{ category_id: string | null }>) {
      if (row.category_id) counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
    }
  }

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    programCount: counts.get(row.id) ?? 0,
  }));
}

export type { ReportReason };
