import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ACCESS_TYPE_LABEL,
  type AccessType,
  type ProgramStatus,
  type ReportReason,
  type ReportStatus,
} from "@/lib/constants/labels";

/**
 * Data layer untuk reviewer & moderator.
 *
 * Semua query berjalan dengan sesi pengguna sehingga RLS menegakkan batas
 * akses. Pemeriksaan role tetap dilakukan di layout/aksi sebagai lapisan
 * tambahan (jangan bergantung pada UI saja).
 */

const QUEUE_PAGE_SIZE = 20;

export type ReviewQueueItem = {
  id: string;
  slug: string;
  title: string;
  provider: string;
  accessTypeLabel: string;
  categoryName: string;
  contributorId: string;
  contributorName: string;
  sourceCount: number;
  submittedAt: string;
  waitingMinutes: number;
  claimedByMe: boolean;
  claimedByName: string | null;
  claimedExpiresInMinutes: number | null;
};

type RawQueueRow = {
  id: string;
  slug: string;
  title: string;
  provider: string | null;
  access_type: AccessType;
  created_at: string;
  contributor_id: string;
  claimed_by: string | null;
  claimed_at: string | null;
  categories: { name: string } | { name: string }[] | null;
  sources: Array<{ id: string }> | null;
  profiles: { github_username: string } | { github_username: string }[] | null;
};

function pickOne<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Antrean program berstatus `pending` (FR-REV-1).
 * Urutan FIFO berdasarkan waktu masuk antrean (`submitted_at`, fallback `created_at`).
 */
export async function listReviewQueue(options: {
  categorySlug?: string;
  claimed?: "semua" | "saya" | "bebas" | "orang_lain";
  reviewerId: string;
  page?: number;
}): Promise<{ items: ReviewQueueItem[]; total: number }> {
  const supabase = await createSupabaseServerClient();
  const page = Math.min(500, Math.max(1, Math.trunc(options.page ?? 1)));
  const from = (page - 1) * QUEUE_PAGE_SIZE;

  let query = supabase
    .from("assistance_programs")
    .select(
      `id, slug, title, provider, access_type, created_at, contributor_id, claimed_by, claimed_at,
       categories(name), sources(id), profiles!contributor_id(github_username)`,
      { count: "exact" },
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .range(from, from + QUEUE_PAGE_SIZE - 1);

  if (options.claimed === "saya") {
    query = query.eq("claimed_by", options.reviewerId);
  } else if (options.claimed === "bebas") {
    query = query.is("claimed_by", null);
  }

  const { data, error, count } = await query;
  if (error) {
    console.error("[review-queue] Query gagal:", error.message);
    return { items: [], total: 0 };
  }

  // Nama reviewer yang sedang mengklaim, dikumpulkan sekali.
  const claimerIds = Array.from(
    new Set(
      ((data ?? []) as unknown as RawQueueRow[])
        .map((r) => r.claimed_by)
        .filter((v): v is string => Boolean(v)),
    ),
  );
  const claimerNames = new Map<string, string>();
  if (claimerIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, github_username")
      .in("id", claimerIds);
    for (const p of (profiles ?? []) as Array<{ id: string; github_username: string }>) {
      claimerNames.set(p.id, p.github_username);
    }
  }

  const now = Date.now();
  const items = ((data ?? []) as unknown as RawQueueRow[]).map((row) => {
    const claimedAt = row.claimed_at ? new Date(row.claimed_at).getTime() : null;
    const expiresAt = claimedAt ? claimedAt + 30 * 60_000 : null;
    const claimedActive = expiresAt !== null && expiresAt > now;
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      provider: row.provider?.trim() ? row.provider : "—",
      accessTypeLabel: ACCESS_TYPE_LABEL[row.access_type] ?? "Lainnya",
      categoryName: pickOne(row.categories)?.name ?? "Lainnya",
      contributorId: row.contributor_id,
      contributorName: pickOne(row.profiles)?.github_username ?? "(tidak diketahui)",
      sourceCount: (row.sources ?? []).length,
      submittedAt: row.created_at,
      waitingMinutes: Math.max(0, Math.round((now - new Date(row.created_at).getTime()) / 60_000)),
      claimedByMe: claimedActive && row.claimed_by === options.reviewerId,
      claimedByName:
        claimedActive && row.claimed_by && row.claimed_by !== options.reviewerId
          ? (claimerNames.get(row.claimed_by) ?? "reviewer lain")
          : null,
      claimedExpiresInMinutes:
        claimedActive && expiresAt !== null
          ? Math.max(0, Math.round((expiresAt - now) / 60_000))
          : null,
    };
  });

  return { items, total: count ?? items.length };
}

export type ReviewDetail = {
  id: string;
  slug: string;
  title: string;
  description: string;
  provider: string;
  accessType: AccessType;
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
  contributorNote: string | null;
  status: ProgramStatus;
  reviewNote: string | null;
  contributorId: string;
  contributorName: string;
  categoryName: string;
  createdAt: string;
  claimedBy: string | null;
  claimedAt: string | null;
  /** Klaim masih aktif (di bawah 30 menit) — dihitung sekali di sini agar
   *  komponen tetap murni (tidak memanggil Date.now saat render). */
  claimActive: boolean;
  sources: Array<{
    url: string;
    title: string | null;
    type: string;
    isPrimary: boolean;
  }>;
  claimWindowMs: number;
  history: Array<{ action: string; createdAt: string; actorName: string | null }>;
};

type RawDetail = {
  id: string;
  slug: string;
  title: string;
  description: string;
  provider: string | null;
  access_type: AccessType;
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
  contributor_note: string | null;
  status: ProgramStatus;
  review_note: string | null;
  contributor_id: string;
  created_at: string;
  claimed_by: string | null;
  claimed_at: string | null;
  categories: { name: string } | { name: string }[] | null;
  profiles: { github_username: string } | { github_username: string }[] | null;
  sources: Array<{
    source_url: string;
    source_title: string | null;
    source_type: string;
    is_primary: boolean;
  }> | null;
};

/** Detail program untuk panel review. Null bila tidak ada / tidak berhak. */
export async function getReviewDetail(id: string): Promise<ReviewDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("assistance_programs")
    .select(
      `id, slug, title, description, provider, access_type, free_tier, free_tier_available,
       requires_card, price_input_per_mtok, price_output_per_mtok, rate_limit_rpm,
       context_window, requirements, promo_start, promo_end, contributor_note, status,
       review_note, contributor_id, created_at, claimed_by, claimed_at,
       categories(name), profiles!contributor_id(github_username),
       sources(source_url, source_title, source_type, is_primary)`,
    )
    .eq("id", id)
    .maybeSingle<RawDetail>();

  if (error) {
    console.error("[review-detail] Query gagal:", error.message);
    return null;
  }
  if (!data) return null;

  const { data: history } = await supabase
    .from("contribution_history")
    .select("action, created_at, profiles!contributor_id(github_username)")
    .eq("program_id", id)
    .order("created_at", { ascending: true })
    .limit(50);

  const sources = [...(data.sources ?? [])].sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary),
  );

  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    description: data.description,
    provider: data.provider?.trim() ? data.provider : "—",
    accessType: data.access_type,
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
    contributorNote: data.contributor_note,
    status: data.status,
    reviewNote: data.review_note,
    contributorId: data.contributor_id,
    contributorName: pickOne(data.profiles)?.github_username ?? "(tidak diketahui)",
    categoryName: pickOne(data.categories)?.name ?? "Lainnya",
    createdAt: data.created_at,
    claimedBy: data.claimed_by,
    claimedAt: data.claimed_at,
    claimActive:
      data.claimed_by !== null &&
      data.claimed_at !== null &&
      Date.now() - new Date(data.claimed_at).getTime() < 30 * 60_000,
    sources: sources.map((s) => ({
      url: s.source_url,
      title: s.source_title,
      type: s.source_type,
      isPrimary: s.is_primary,
    })),
    claimWindowMs: 30 * 60_000,
    history: ((history ?? []) as Array<{
      action: string;
      created_at: string;
      profiles: { github_username: string } | { github_username: string }[] | null;
    }>).map((h) => ({
      action: h.action,
      createdAt: h.created_at,
      actorName: pickOne(h.profiles)?.github_username ?? null,
    })),
  };
}

export type ModerationReport = {
  id: string;
  status: ReportStatus;
  reason: ReportReason;
  description: string;
  createdAt: string;
  reporterName: string | null;
  programId: string;
  programTitle: string;
  programSlug: string;
  programStatus: ProgramStatus;
  priority: number;
};

type RawReport = {
  id: string;
  status: ReportStatus;
  reason: ReportReason;
  description: string;
  created_at: string;
  program_id: string;
  profiles: { github_username: string } | { github_username: string }[] | null;
  assistance_programs:
    | { title: string; slug: string; status: ProgramStatus }
    | Array<{ title: string; slug: string; status: ProgramStatus }>;
};

/** Antrean laporan moderasi, diurutkan prioritas lalu terlama (FR-MOD-1). */
export async function listReports(options: {
  status?: ReportStatus | "semua";
  reason?: ReportReason | "semua";
  priority: Record<ReportReason, number>;
}): Promise<ModerationReport[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("reports")
    .select(
      `id, status, reason, description, created_at, program_id,
       profiles!reporter_id(github_username),
       assistance_programs!program_id(title, slug, status)`,
    )
    .order("created_at", { ascending: true })
    .limit(100);

  if (options.status && options.status !== "semua") {
    query = query.eq("status", options.status);
  }
  if (options.reason && options.reason !== "semua") {
    query = query.eq("reason", options.reason);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[reports] Query gagal:", error.message);
    return [];
  }

  return ((data ?? []) as unknown as RawReport[])
    .map((row) => {
      const program = pickOne(row.assistance_programs);
      return {
        id: row.id,
        status: row.status,
        reason: row.reason,
        description: row.description,
        createdAt: row.created_at,
        reporterName: pickOne(row.profiles)?.github_username ?? null,
        programId: row.program_id,
        programTitle: program?.title ?? "(program dihapus)",
        programSlug: program?.slug ?? "",
        programStatus: program?.status ?? "archived",
        priority: options.priority[row.reason] ?? 0,
      };
    })
    .sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
}

/** Laporan milik pengguna (untuk `/dashboard/laporan`). */
export async function listOwnReports(
  userId: string,
): Promise<
  Array<{
    id: string;
    reason: ReportReason;
    status: ReportStatus;
    createdAt: string;
    programTitle: string;
    programSlug: string;
  }>
> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("reports")
    .select(
      "id, reason, status, created_at, assistance_programs!program_id(title, slug)",
    )
    .eq("reporter_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[own-reports] Query gagal:", error.message);
    return [];
  }

  return ((data ?? []) as unknown as Array<{
    id: string;
    reason: ReportReason;
    status: ReportStatus;
    created_at: string;
    assistance_programs:
      | { title: string; slug: string }
      | Array<{ title: string; slug: string }>
      | null;
  }>).map((row) => {
    const program = pickOne(row.assistance_programs);
    return {
      id: row.id,
      reason: row.reason,
      status: row.status,
      createdAt: row.created_at,
      programTitle: program?.title ?? "(program dihapus)",
      programSlug: program?.slug ?? "",
    };
  });
}

export { QUEUE_PAGE_SIZE };
