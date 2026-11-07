import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole, ProgramStatus, ReportReason, ReportStatus } from "@/lib/constants/labels";
import { VERIFICATION_STALE_DAYS } from "@/lib/utils";

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
  /** Jumlah entri baru per minggu, 8 minggu terakhir (urut lama → baru). */
  weeklyContributions: number[];
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

  // Tren 8 minggu: entri baru per minggu (semua status, dari created_at).
  const WEEKS = 8;
  const weekStart = new Date();
  weekStart.setUTCHours(0, 0, 0, 0);
  weekStart.setUTCDate(weekStart.getUTCDate() - (WEEKS * 7 - 1));
  const { data: recentPrograms, error: trendError } = await supabase
    .from("assistance_programs")
    .select("created_at")
    .gte("created_at", weekStart.toISOString());
  const weeklyContributions = Array.from({ length: WEEKS }, () => 0);
  if (trendError) {
    console.error("[admin-stats] tren mingguan:", trendError.message);
  } else {
    for (const row of (recentPrograms ?? []) as Array<{ created_at: string }>) {
      const created = new Date(row.created_at).getTime();
      const weeksAgo = Math.floor((Date.now() - created) / (7 * 24 * 3600 * 1000));
      const index = WEEKS - 1 - Math.min(WEEKS - 1, Math.max(0, weeksAgo));
      weeklyContributions[index] = (weeklyContributions[index] ?? 0) + 1;
    }
  }

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
    weeklyContributions,
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
  /** Filter pengguna yang memiliki role tertentu ("semua" = tanpa filter). */
  role?: string;
  /** Filter status blokir; undefined = tanpa filter. */
  banned?: boolean;
}): Promise<{
  items: AdminUser[];
  total: number;
  pageSize: number;
  contributions: Record<string, number>;
}> {
  const supabase = await createSupabaseServerClient();
  const pageSize = 50;
  const page = Math.min(500, Math.max(1, Math.trunc(options.page ?? 1)));
  const from = (page - 1) * pageSize;

  // Filter role memakai inner join tersaring; tanpa filter, embed biasa.
  const roleFilter = options.role && options.role !== "semua" ? options.role : undefined;
  const rolesEmbed = roleFilter
    ? "user_roles!inner(role)"
    : "user_roles!user_id(role)";

  let query = supabase
    .from("profiles")
    .select(
      `id, github_username, github_avatar, is_banned, created_at, ${rolesEmbed}`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (roleFilter) {
    query = query.eq("user_roles.role", roleFilter);
  }
  if (options.banned === true) {
    query = query.eq("is_banned", true);
  }

  const search = options.search?.trim();
  if (search) {
    // Escape karakter khusus PostgREST agar tidak menjadi wildcard liar.
    query = query.ilike("github_username", `%${search.replace(/[%_\\]/g, "\\$&")}%`);
  }

  const { data, error, count } = await query;
  if (error) {
    console.error("[admin-users] Query gagal:", error.message);
    return { items: [], total: 0, pageSize, contributions: {} };
  }

  const items = ((data ?? []) as unknown as RawAdminUser[]).map((row) => ({
    id: row.id,
    username: row.github_username,
    avatarUrl: row.github_avatar,
    isBanned: row.is_banned,
    roles: normalizeRoleRows(row.user_roles),
    createdAt: row.created_at,
  }));

  // Jumlah kontribusi per pengguna (semua status kecuali draf) — satu query
  // ringan untuk seluruh halaman, bukan per baris.
  const contributions: Record<string, number> = {};
  if (items.length > 0) {
    const { data: programRows, error: countError } = await supabase
      .from("assistance_programs")
      .select("contributor_id")
      .in(
        "contributor_id",
        items.map((item) => item.id),
      )
      .neq("status", "draft");
    if (countError) {
      console.error("[admin-users] Hitung kontribusi gagal:", countError.message);
    } else {
      for (const row of (programRows ?? []) as Array<{ contributor_id: string }>) {
        contributions[row.contributor_id] =
          (contributions[row.contributor_id] ?? 0) + 1;
      }
    }
  }

  return { items, total: count ?? 0, pageSize, contributions };
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export type AuditLogEntry = {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  actorUsername: string | null;
};

/** Kategori filter audit log — prefix kolom `action`. */
export const AUDIT_CATEGORIES = [
  "role",
  "user",
  "program",
  "report",
  "category",
  "setting",
  "cron",
] as const;
export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

type RawAuditRow = {
  id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  profiles: Array<{ github_username: string }> | null;
};

/**
 * Audit log (append-only) untuk `/admin/audit`. RLS hanya mengizinkan admin;
 * fungsi ini tetap dipanggil dari sesi admin sehingga kebijakan berlaku.
 */
export async function listAuditLogs(options: {
  page?: number;
  category?: string;
}): Promise<{ items: AuditLogEntry[]; total: number; pageSize: number }> {
  const supabase = await createSupabaseServerClient();
  const pageSize = 50;
  const page = Math.min(500, Math.max(1, Math.trunc(options.page ?? 1)));
  const from = (page - 1) * pageSize;

  let query = supabase
    .from("moderation_logs")
    .select(
      "id, action, target_type, target_id, reason, metadata, created_at, profiles!moderation_logs_actor_id_fkey(github_username)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  const category =
    options.category && AUDIT_CATEGORIES.includes(options.category as AuditCategory)
      ? options.category
      : undefined;
  if (category) {
    query = query.like("action", `${category}.%`);
  }

  const { data, error, count } = await query;
  if (error) {
    console.error("[admin-audit] Query gagal:", error.message);
    return { items: [], total: 0, pageSize };
  }

  return {
    items: ((data ?? []) as unknown as RawAuditRow[]).map((row) => ({
      id: row.id,
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      reason: row.reason,
      metadata: row.metadata ?? {},
      createdAt: row.created_at,
      actorUsername: row.profiles?.[0]?.github_username ?? null,
    })),
    total: count ?? 0,
    pageSize,
  };
}

// ---------------------------------------------------------------------------
// Riwayat moderasi per pengguna (halaman /admin/pengguna)
// ---------------------------------------------------------------------------

export type UserModerationEntry = {
  id: string;
  action: string;
  reason: string | null;
  createdAt: string;
  actorUsername: string | null;
};

/**
 * Riwayat moderasi untuk satu pengguna: role diberikan/dicabut, blokir dibuka,
 * dsb.
 *
 * Mengapa tidak memakai `listAuditLogs` lalu memfilter di memori: audit log
 * berisi ribuan baris dan admin membuka halaman ini per pengguna. Query di
 * sini menyaring langsung di DB (`target_type='user' and target_id=userId`)
 * sehingga hanya membaca belasan baris paling relevan. RLS tetap berlaku
 * karena memakai sesi admin — bila `target_id` berisi program, baris tidak
 * ikut terbaca di sini.
 *
 * `action` difilter ke prefix `user.`/`role.` karena hanya itu yang menargetkan
 * akun; baris sistem lain (mis. `cron.*) yang kebetulan menyentuh id pengguna
 * tidak relevan untuk penjelasan "mengapa akun ini dibatasi".
 */
export async function listUserModerationHistory(
  userId: string,
  limit = 20,
): Promise<UserModerationEntry[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("moderation_logs")
    .select(
      "id, action, reason, created_at, profiles!moderation_logs_actor_id_fkey(github_username)",
    )
    .eq("target_type", "user")
    .eq("target_id", userId)
    .or("action.like.user.%,action.like.role.%")
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(1, limit), 50));

  if (error) {
    console.error("[admin-users] Riwayat moderasi gagal:", error.message);
    return [];
  }

  return (
    (data ?? []) as unknown as Array<{
      id: string;
      action: string;
      reason: string | null;
      created_at: string;
      profiles: Array<{ github_username: string }> | null;
    }>
  ).map((row) => ({
    id: row.id,
    action: row.action,
    reason: row.reason,
    createdAt: row.created_at,
    actorUsername: row.profiles?.[0]?.github_username ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Badge jumlah antrean staf (sidebar dasbor)
// ---------------------------------------------------------------------------

export type StaffBadgeCounts = {
  pendingReview: number;
  openReports: number;
  /** Entri verified yang verifikasinya basi (> 90 hari). */
  staleRecheck: number;
};

/**
 * Jumlah antrean untuk badge navigasi. `withReports`=false (reviewer) —
 * kebijakan RLS laporan hanya untuk moderator/admin, jadi tidak dihitung.
 */
export async function getStaffBadgeCounts(
  withReports: boolean,
): Promise<StaffBadgeCounts> {
  const supabase = await createSupabaseServerClient();
  const staleCutoff = new Date(
    Date.now() - VERIFICATION_STALE_DAYS * 86_400_000,
  ).toISOString();

  const [pending, reports, stale] = await Promise.all([
    supabase
      .from("assistance_programs")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .then(({ count, error }) => {
        if (error) console.error("[staff-badge] pending:", error.message);
        return count ?? 0;
      }),
    withReports
      ? supabase
          .from("reports")
          .select("id", { count: "exact", head: true })
          .in("status", ["open", "in_review"])
          .then(({ count, error }) => {
            if (error) console.error("[staff-badge] reports:", error.message);
            return count ?? 0;
          })
      : Promise.resolve(0),
    supabase
      .from("assistance_programs")
      .select("id", { count: "exact", head: true })
      .eq("status", "verified")
      .lt("verified_at", staleCutoff)
      .then(({ count, error }) => {
        if (error) console.error("[staff-badge] stale:", error.message);
        return count ?? 0;
      }),
  ]);

  return { pendingReview: pending, openReports: reports, staleRecheck: stale };
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
