import "server-only";

import { unstable_cache } from "next/cache";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseAnonClient } from "@/lib/supabase/server";
import { ACCESS_TYPE_LABEL, PAGE_SIZE } from "@/lib/constants/labels";
import type { ProgramCardData } from "@/components/program-card";
import type { DirectorySearch } from "@/lib/validation/search";
import { pickOne, type RawProgramRow } from "./types";

/**
 * Query publik untuk direktori AksesAI.
 * Hanya mengambil entri berstatus verified/expired (RLS *dan* filter eksplisit).
 * Hasil di-cache 300 detik, di-invalidasi via tag saat status berubah.
 */

export const PUBLIC_PROGRAM_SELECT = `id, slug, title, description, access_type, provider, free_tier,
  free_tier_available, requires_card, price_input_per_mtok, price_output_per_mtok,
  rate_limit_rpm, context_window, status, promo_end, verified_at,
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
    accessType: row.access_type,
    accessTypeLabel: ACCESS_TYPE_LABEL[row.access_type] ?? "Lainnya",
    provider: row.provider?.trim() ? row.provider : "—",
    freeTier: row.free_tier,
    freeTierAvailable: row.free_tier_available,
    requiresCard: row.requires_card,
    priceInput: row.price_input_per_mtok,
    priceOutput: row.price_output_per_mtok,
    status: row.status,
    promoEnd: row.promo_end,
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
        `title.ilike.%${term}%,description.ilike.%${term}%,provider.ilike.%${term}%,free_tier.ilike.%${term}%`,
      );
    }
  }
  if (search.kategori) {
    // Filter kategori lewat slug: gunakan inner join tersaring.
    query = query.eq("categories.slug", search.kategori);
  }
  if (search.akses && search.akses !== "semua") {
    query = query.eq("access_type", search.akses);
  }
  if (search.gratis === "gratis") {
    query = query.eq("free_tier_available", true);
  } else if (search.gratis === "tanpa_kartu") {
    query = query.eq("free_tier_available", true).eq("requires_card", false);
  } else if (search.gratis === "berbayar") {
    query = query.eq("free_tier_available", false);
  }

  const useRelevance = search.urut === "relevansi" && Boolean(search.q);
  query = useRelevance
    ? query.order("verified_at", { ascending: false, nullsFirst: false })
    : query.order("verified_at", { ascending: false, nullsFirst: false });

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
