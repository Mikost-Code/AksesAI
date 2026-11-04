import "server-only";

import { unstable_cache } from "next/cache";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseAnonClient } from "@/lib/supabase/server";
import { displayHost } from "@/lib/security/ssrf-guard";
import type { AccessType, ProgramStatus, SourceType } from "@/lib/constants/labels";

export type ProgramSource = {
  id: string;
  url: string;
  domain: string;
  title: string | null;
  type: SourceType;
  isPrimary: boolean;
};

export type ProgramHistoryEntry = {
  action: string;
  createdAt: string;
};

export type ProgramDetail = {
  id: string;
  slug: string;
  title: string;
  description: string;
  categoryName: string;
  categorySlug: string;
  accessType: AccessType;
  provider: string;
  freeTier: string | null;
  freeTierAvailable: boolean;
  requiresCard: boolean;
  priceInputPerMtok: number | null;
  priceOutputPerMtok: number | null;
  rateLimitRpm: number | null;
  contextWindow: number | null;
  requirements: string | null;
  promoStart: string | null;
  promoEnd: string | null;
  status: ProgramStatus;
  verifiedAt: string | null;
  contributor: { username: string; avatar: string | null; url: string | null; bio: string | null };
  reviewerUsername: string | null;
  sources: ProgramSource[];
  history: ProgramHistoryEntry[];
};

type RawDetail = {
  id: string;
  slug: string;
  title: string;
  description: string;
  access_type: AccessType;
  provider: string | null;
  free_tier: string | null;
  free_tier_available: boolean;
  requires_card: boolean;
  price_input_per_mtok: number | null;
  price_output_per_mtok: number | null;
  rate_limit_rpm: number | null;
  context_window: number | null;
  requirements: string | null;
  promo_start: string | null;
  promo_end: string | null;
  status: ProgramStatus;
  verified_at: string | null;
  categories: { name: string; slug: string } | { name: string; slug: string }[] | null;
  contributor: { github_username: string; github_avatar: string | null; github_url: string | null; bio: string | null } | { github_username: string; github_avatar: string | null; github_url: string | null; bio: string | null }[] | null;
  reviewer: { github_username: string } | { github_username: string }[] | null;
  sources: Array<{ id: string; source_url: string; source_title: string | null; source_type: SourceType; is_primary: boolean }> | null;
  contribution_history: Array<{ action: string; created_at: string; previous_data: unknown }> | null;
};

function pickOne<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

const ALLOWED_HISTORY_ACTIONS = new Set([
  "create",
  "edit",
  "submit",
  "withdraw",
  "request_changes",
  "verify",
  "reject",
  "expire",
  "archive",
  "reviewer_edit",
  "reopen",
]);

async function fetchProgramDetail(slug: string): Promise<ProgramDetail | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createSupabaseAnonClient();

  // slug divalidasi oleh caller (regex) sebelum sampai ke sini.
  const { data, error } = await supabase
    .from("assistance_programs")
    .select(
      `id, slug, title, description, access_type, provider, free_tier,
       free_tier_available, requires_card, price_input_per_mtok, price_output_per_mtok,
       rate_limit_rpm, context_window, requirements, promo_start, promo_end,
       status, verified_at,
       categories(name, slug),
       contributor:profiles!assistance_programs_contributor_id_fkey(github_username, github_avatar, github_url, bio),
       reviewer:profiles!assistance_programs_reviewer_id_fkey(github_username),
       sources(id, source_url, source_title, source_type, is_primary),
       contribution_history(action, created_at)`,
    )
    .eq("slug", slug)
    .in("status", ["verified", "expired"])
    .maybeSingle<RawDetail>();

  if (error) {
    console.error("[program-detail] Query gagal:", error.message);
    return null;
  }
  if (!data) return null;

  const category = pickOne(data.categories);
  const contributor = pickOne(data.contributor);
  const reviewer = pickOne(data.reviewer);

  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    description: data.description,
    categoryName: category?.name ?? "Lainnya",
    categorySlug: category?.slug ?? "lainnya",
    accessType: data.access_type,
    provider: data.provider?.trim() ? data.provider : "Tidak diketahui",
    freeTier: data.free_tier,
    freeTierAvailable: data.free_tier_available,
    requiresCard: data.requires_card,
    priceInputPerMtok: data.price_input_per_mtok,
    priceOutputPerMtok: data.price_output_per_mtok,
    rateLimitRpm: data.rate_limit_rpm,
    contextWindow: data.context_window,
    requirements: data.requirements,
    promoStart: data.promo_start,
    promoEnd: data.promo_end,
    status: data.status,
    verifiedAt: data.verified_at,
    contributor: {
      username: contributor?.github_username ?? "kontributor-dihapus",
      avatar: contributor?.github_avatar ?? null,
      url: contributor?.github_url ?? null,
      bio: contributor?.bio ?? null,
    },
    reviewerUsername: reviewer?.github_username ?? null,
    sources: (data.sources ?? []).map((s) => ({
      id: s.id,
      url: s.source_url,
      domain: displayHost(s.source_url),
      title: s.source_title,
      type: s.source_type,
      isPrimary: s.is_primary,
    })),
    // Riwayat publik: hanya tanggal + aksi (tanpa data internal/diff).
    history: (data.contribution_history ?? [])
      .filter((h) => ALLOWED_HISTORY_ACTIONS.has(h.action))
      .map((h) => ({ action: h.action, createdAt: h.created_at }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

export async function getProgramDetail(slug: string): Promise<ProgramDetail | null> {
  const cached = unstable_cache(
    () => fetchProgramDetail(slug),
    ["program-detail", slug],
    { revalidate: 300, tags: ["programs:public", `program:${slug}`] },
  );
  return cached();
}

export async function getPublicProgramSlugs(): Promise<
  Array<{ slug: string; status: ProgramStatus }>
> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createSupabaseAnonClient();
  const { data } = await supabase
    .from("assistance_programs")
    .select("slug, status")
    .in("status", ["verified", "expired"])
    .limit(500);
  return (data ?? []) as Array<{ slug: string; status: ProgramStatus }>;
}
