import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProgramStatus } from "@/lib/constants/labels";

/**
 * Data layer halaman "Program & masa berlaku" di area admin.
 *
 * Hanya membaca status publik (`verified`/`expired`). Draf, antrean, dan
 * kontribusi yang ditolak tetap ditangani di halaman masing-masing; halaman ini
 * fokus pada entri yang sudah tayang dan punya konsekuensi ke direktori.
 *
 * Query memakai sesi admin (RLS `programs_staff_read` mengizinkan staf membaca
 * semua status), tetapi filter status tetap ditulis eksplisit sebagai
 * pertahanan berlapis.
 */

export const MANAGED_PAGE_SIZE = 20;

export type ManagedFilter = "verified" | "expired" | "semua";

export type ManagedProgram = {
  id: string;
  slug: string;
  title: string;
  provider: string | null;
  status: ProgramStatus;
  promoStart: string | null;
  promoEnd: string | null;
  updatedAt: string;
  contributorName: string;
  categoryName: string;
};

type RawManagedProgram = {
  id: string;
  slug: string;
  title: string;
  provider: string | null;
  status: ProgramStatus;
  promo_start: string | null;
  promo_end: string | null;
  updated_at: string;
  categories: { name: string } | { name: string }[] | null;
  profiles: { github_username: string } | { github_username: string }[] | null;
};

function first<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export async function listManagedPrograms(options: {
  filter: ManagedFilter;
  search: string;
  page: number;
}): Promise<{
  items: ManagedProgram[];
  total: number;
  pageSize: number;
}> {
  const supabase = await createSupabaseServerClient();
  const from = (options.page - 1) * MANAGED_PAGE_SIZE;
  const to = from + MANAGED_PAGE_SIZE - 1;

  let query = supabase
    .from("assistance_programs")
    .select(
      `id, slug, title, provider, status, promo_start, promo_end, updated_at,
       categories(name), profiles!contributor_id(github_username)`,
      { count: "exact" },
    )
    .in(
      "status",
      options.filter === "semua" ? ["verified", "expired"] : [options.filter],
    );

  if (options.search) {
    // `ilike` aman dari injeksi karena nilainya diparameterkan PostgREST;
    // karakter wildcard (`%`, `_`) sengaja dibiarkan agar pencarian fleksibel.
    query = query.ilike("title", `%${options.search}%`);
  }

  const { data, error, count } = await query
    // Yang paling dekat berakhir tampil lebih dulu; entri tanpa batas waktu
    // diletakkan di belakang agar tidak mendesak yang butuh perhatian.
    .order("promo_end", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[manage-programs] Query gagal:", error.message);
    return { items: [], total: 0, pageSize: MANAGED_PAGE_SIZE };
  }

  const items = ((data ?? []) as RawManagedProgram[]).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    provider: row.provider,
    status: row.status,
    promoStart: row.promo_start,
    promoEnd: row.promo_end,
    updatedAt: row.updated_at,
    contributorName: first(row.profiles)?.github_username ?? "—",
    categoryName: first(row.categories)?.name ?? "—",
  }));

  return { items, total: count ?? 0, pageSize: MANAGED_PAGE_SIZE };
}

/** Ringkasan singkat untuk kepala halaman. */
export async function getManagedStats(): Promise<{
  verified: number;
  expired: number;
  expiringSoon: number;
}> {
  const supabase = await createSupabaseServerClient();

  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const soon = new Date(today);
  soon.setUTCDate(soon.getUTCDate() + 7);
  const soonIso = soon.toISOString().slice(0, 10);

  const [verified, expired, expiringSoon] = await Promise.all([
    supabase
      .from("assistance_programs")
      .select("id", { count: "exact", head: true })
      .eq("status", "verified"),
    supabase
      .from("assistance_programs")
      .select("id", { count: "exact", head: true })
      .eq("status", "expired"),
    supabase
      .from("assistance_programs")
      .select("id", { count: "exact", head: true })
      .eq("status", "verified")
      .gte("promo_end", todayIso)
      .lte("promo_end", soonIso),
  ]);

  for (const [label, result] of [
    ["verified", verified],
    ["expired", expired],
    ["expiringSoon", expiringSoon],
  ] as const) {
    if (result.error) {
      console.error(`[manage-programs] stat ${label}:`, result.error.message);
    }
  }

  return {
    verified: verified.count ?? 0,
    expired: expired.count ?? 0,
    expiringSoon: expiringSoon.count ?? 0,
  };
}
