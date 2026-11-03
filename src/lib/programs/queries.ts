import "server-only";

import { unstable_cache } from "next/cache";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseAnonClient } from "@/lib/supabase/server";
import { PAGE_SIZE } from "@/lib/constants/labels";
import type { ProgramCardData } from "@/components/program-card";
import type { DirectorySearch } from "@/lib/validation/search";
import { pickOne, type RawProgramRow } from "./types";

/**
 * Query publik untuk direktori.
 * Hanya mengambil program berstatus verified/expired (RLS *dan* filter eksplisit).
 * Hasil di-cache 300 detik, di-invalidasi via tag saat status berubah.
 */

export const PUBLIC_PROGRAM_SELECT = `id, slug, title, description, region, province, city, organizer, status, end_date, published_at, verified_at,
  categories(name, slug),
  contributor:profiles!assistance_programs_contributor_id_fkey(github_username, github_avatar)`;

export function programSummary(description: string, max = 180): string {
  const clean = description.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).trimEnd()}…`;
}

export function toProgramCard(row: RawProgramRow): ProgramCardData {
  const category = pickOne(row.categories);
  const profile = pickOne(row.contributor) ?? pickOne(row.profiles);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: programSummary(row.description),
    categoryName: category?.name ?? "Lainnya",
    regionLabel: row.region?.trim() ? row.region : "Nasional",
    organizer: row.organizer,
    status: row.status,
    endDate: row.end_date,
    contributorUsername: profile?.github_username ?? "kontributor-dihapus",
    contributorAvatar: profile?.github_avatar ?? null,
  };
}

export type DirectoryResult = {
  items: ProgramCardData[];
  total: number;
  page: number;
  pageCount: number;
  configured: boolean;
};

async function fetchDirectory(search: DirectorySearch): Promise<DirectoryResult> {
  if (!isSupabaseConfigured()) {
    return { items: [], total: 0, page: 1, pageCount: 0, configured: false };
  }

  const supabase = createSupabaseAnonClient();
  const statuses: string[] =
    search.status === "semua" ? ["verified", "expired"] : [search.status];

  let query = supabase
    .from("assistance_programs")
    .select(PUBLIC_PROGRAM_SELECT, { count: "exact" })
    .in("status", statuses);

  if (search.q) {
    // PostgREST ilike: escape karakter wildcard agar tidak menjadi pola liar.
    const term = search.q.replace(/[%_,()]/g, " ").trim();
    if (term) {
      query = query.or(
        `title.ilike.%${term}%,description.ilike.%${term}%,organizer.ilike.%${term}%`,
      );
    }
  }
  if (search.kategori) {
    // Filter kategori lewat slug: gunakan inner join tersaring.
    query = query.eq("categories.slug", search.kategori);
  }
  if (search.provinsi) {
    query = query.eq("province", search.provinsi);
  }
  if (search.kota) {
    query = query.ilike("city", `%${search.kota.replace(/[%_,()]/g, " ")}%`);
  }

  const useRelevance = search.urut === "relevansi" && Boolean(search.q);
  query = useRelevance
    ? query.order("verified_at", { ascending: false, nullsFirst: false })
    : query.order("published_at", { ascending: false, nullsFirst: false });

  const from = (search.halaman - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, count, error } = await query.range(from, to);

  if (error) {
    console.error("[directory] Query gagal:", error.message);
    return {
      items: [],
      total: 0,
      page: search.halaman,
      pageCount: 0,
      configured: true,
    };
  }

  const total = count ?? 0;
  return {
    items: ((data ?? []) as unknown as RawProgramRow[]).map(toProgramCard),
    total,
    page: search.halaman,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    configured: true,
  };
}

export async function getDirectory(search: DirectorySearch): Promise<DirectoryResult> {
  const cacheKey = JSON.stringify(search);
  const cached = unstable_cache(() => fetchDirectory(search), ["directory", cacheKey], {
    revalidate: 300,
    tags: ["programs:public"],
  });
  return cached();
}
