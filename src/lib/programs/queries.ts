import "server-only";

import { unstable_cache } from "next/cache";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseAnonClient } from "@/lib/supabase/server";
import { ACCESS_TYPE_LABEL, PAGE_SIZE } from "@/lib/constants/labels";
import type { ProgramCardData } from "@/components/program-card";
import type { DirectorySearch } from "@/lib/validation/search";
import { TAG_PROGRAMS_PUBLIC } from "@/lib/cache-tags";
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

/**
 * Batas jumlah id yang dikembalikan `search_programs` ke aplikasi.
 * Selaras dengan `limit` maksimum di RPC (500). Paginasi tetap terjadi di
 * klien aplikasi, bukan di RPC, karena RPC hanya memeringkat.
 */
const SEARCH_CANDIDATE_LIMIT = 500;

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

/**
 * Mencari id program terurut relevansi lewat RPC `search_programs`.
 *
 * RPC ini `security invoker` sehingga RLS tetap berlaku; ia hanya memeringkat
 * (ts_rank atas `search_tsv`), bukan mengambil baris lengkap. Baris lengkap
 * diambil terpisah dengan `in("id", ids)` agar `PUBLIC_PROGRAM_SELECT` (yang
 * memuat embed relasi) tetap dipakai dan tidak diduplikasi di SQL.
 *
 * Mengembalikan `null` bila RPC gagal → pemanggil jatuh ke filter ilike
 * supaya pencarian tidak pernah "kosong" hanya karena satu RPC bermasalah.
 */
async function searchProgramIds(
  supabase: ReturnType<typeof createSupabaseAnonClient>,
  term: string,
): Promise<string[] | null> {
  const { data, error } = await supabase.rpc("search_programs", {
    p_query: term,
    p_limit: SEARCH_CANDIDATE_LIMIT,
  });
  if (error) {
    console.error("[directory] RPC search_programs gagal, fallback ilike:", error.message);
    return null;
  }
  return ((data ?? []) as Array<{ id: string }>).map((row) => row.id);
}

async function fetchDirectory(search: DirectorySearch): Promise<DirectoryResult> {
  if (!isSupabaseConfigured()) {
    return { items: [], total: 0, page: 1, pageCount: 0, configured: false };
  }

  const supabase = createSupabaseAnonClient();
  const statuses: string[] =
    search.status === "semua" ? ["verified", "expired"] : [search.status];

  // Kata kunci pencarian diproses lebih dulu: RPC memberi peringkat relevansi
  // (ts_rank) sehingga urutan "relevansi" benar-benar berarti relevansi.
  const term = search.q?.replace(/[%_,()]/g, " ").trim() ?? "";
  let rankedIds: string[] | null = null;
  if (term) {
    rankedIds = await searchProgramIds(supabase, term);
    if (rankedIds !== null && rankedIds.length === 0) {
      // Tidak ada yang cocok — hindari query lanjutan yang pasti kosong.
      return { items: [], total: 0, page: search.halaman, pageCount: 0, configured: true };
    }
  }

  let query = supabase
    .from("assistance_programs")
    .select(PUBLIC_PROGRAM_SELECT, { count: "exact" })
    .in("status", statuses);

  if (term) {
    if (rankedIds) {
      query = query.in("id", rankedIds);
    } else {
      // Fallback bila RPC tidak tersedia (mis. migrasi belum dijalankan).
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

  // Urutan di DB selalu verifikasi terbaru; peringkat relevansi diterapkan
  // setelah baris diambil karena `in()` tidak mempertahankan urutan id.
  query = query.order("verified_at", { ascending: false, nullsFirst: false });

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

  let rows = (data ?? []) as unknown as RawProgramRow[];
  if (term && rankedIds && search.urut === "relevansi") {
    const rankIndex = new Map(rankedIds.map((id, index) => [id, index]));
    rows = [...rows].sort(
      (a, b) => (rankIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rankIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER),
    );
  }

  const total = count ?? 0;
  return {
    items: rows.map(toProgramCard),
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
    tags: [TAG_PROGRAMS_PUBLIC],
  });
  return cached();
}
