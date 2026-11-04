import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ACCESS_TYPE_LABEL,
  type AccessType,
  type ProgramStatus,
  type ReviewAction,
} from "@/lib/constants/labels";
import type { ContributionInput } from "@/lib/validation/contribution";

/**
 * Data layer pribadi kontributor (AksesAI).
 *
 * Berbeda dengan `lib/programs/*` (anon + cache untuk publik), modul ini
 * membaca data milik pengguna yang sedang login. RLS memfilter baris;
 * tetapi setiap query tetap menyaring `contributor_id` secara eksplisit
 * sebagai pertahanan berlapis.
 */

export type OwnProgramSummary = {
  id: string;
  slug: string;
  title: string;
  status: ProgramStatus;
  categoryName: string;
  accessTypeLabel: string;
  provider: string;
  promoEnd: string | null;
  updatedAt: string;
  reviewNote: string | null;
  sourceCount: number;
};

type RawOwnRow = {
  id: string;
  slug: string;
  title: string;
  status: ProgramStatus;
  access_type: AccessType;
  provider: string | null;
  promo_end: string | null;
  updated_at: string;
  review_note: string | null;
  categories: { name: string } | { name: string }[] | null;
  sources: Array<{ id: string }> | null;
};

function pickOne<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function listOwnPrograms(
  contributorId: string,
): Promise<OwnProgramSummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("assistance_programs")
    .select(
      "id, slug, title, status, access_type, provider, promo_end, updated_at, review_note, categories(name), sources(id)",
    )
    .eq("contributor_id", contributorId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[own-programs] Query gagal:", error.message);
    return [];
  }

  return ((data ?? []) as unknown as RawOwnRow[]).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    categoryName: pickOne(row.categories)?.name ?? "Lainnya",
    accessTypeLabel: ACCESS_TYPE_LABEL[row.access_type] ?? "Lainnya",
    provider: row.provider?.trim() ? row.provider : "—",
    promoEnd: row.promo_end,
    updatedAt: row.updated_at,
    // Catatan reviewer hanya bermakna saat perlu revisi/ditolak.
    reviewNote:
      row.status === "needs_changes" || row.status === "rejected"
        ? row.review_note
        : null,
    sourceCount: (row.sources ?? []).length,
  }));
}

export type EditableProgram = {
  id: string;
  slug: string;
  status: ProgramStatus;
  contributorId: string;
  title: string;
  description: string;
  categoryId: string;
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
  contributorNote: string | null;
  sources: Array<{
    url: string;
    title: string | null;
    type: ContributionInput["sources"][number]["type"];
    isPrimary: boolean;
  }>;
};

type RawEditable = {
  id: string;
  slug: string;
  status: ProgramStatus;
  contributor_id: string;
  title: string;
  description: string;
  category_id: string;
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
  contributor_note: string | null;
  sources: Array<{
    source_url: string;
    source_title: string | null;
    source_type: ContributionInput["sources"][number]["type"];
    is_primary: boolean;
  }> | null;
};

/**
 * Mengambil entri milik pengguna untuk diedit.
 * Mengembalikan null bila tidak ada / bukan miliknya (RLS juga menyaring).
 */
export async function getEditableProgram(
  id: string,
  contributorId: string,
): Promise<EditableProgram | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("assistance_programs")
    .select(
      `id, slug, status, contributor_id, title, description, category_id,
       access_type, provider, free_tier, free_tier_available, requires_card,
       price_input_per_mtok, price_output_per_mtok, rate_limit_rpm, context_window,
       requirements, promo_start, promo_end, contributor_note,
       sources(source_url, source_title, source_type, is_primary)`,
    )
    .eq("id", id)
    .eq("contributor_id", contributorId)
    .maybeSingle<RawEditable>();

  if (error) {
    console.error("[own-program] Query gagal:", error.message);
    return null;
  }
  if (!data) return null;

  // Urutkan: sumber utama lebih dulu, lalu sesuai urutan masukan awal.
  const sources = [...(data.sources ?? [])].sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary),
  );

  return {
    id: data.id,
    slug: data.slug,
    status: data.status,
    contributorId: data.contributor_id,
    title: data.title,
    description: data.description,
    categoryId: data.category_id,
    accessType: data.access_type,
    provider: data.provider ?? "",
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
    sources: sources.map((s) => ({
      url: s.source_url,
      title: s.source_title,
      type: s.source_type,
      isPrimary: s.is_primary,
    })),
  };
}

/** Status yang boleh diedit kontributor. */
export const EDITABLE_STATUSES: ReadonlyArray<ProgramStatus> = [
  "draft",
  "needs_changes",
];

/**
 * Mendeteksi kemungkinan duplikat: entri lain (bukan milik pengguna) dengan
 * judul serupa atau sumber yang sama, berstatus publik.
 * PRD FR-CON-6 — peringatan lembut, tidak memblokir.
 */
export async function findDuplicateCandidates(
  title: string,
  sourceNormalized: string[],
): Promise<Array<{ slug: string; title: string; reason: "judul" | "sumber" }>> {
  const supabase = await createSupabaseServerClient();
  const results: Array<{ slug: string; title: string; reason: "judul" | "sumber" }> = [];
  const seen = new Set<string>();

  if (sourceNormalized.length > 0) {
    const { data } = await supabase
      .from("sources")
      .select("source_url_normalized, assistance_programs!inner(slug, title, status)")
      .in("source_url_normalized", sourceNormalized.slice(0, 5))
      .in("assistance_programs.status", ["verified", "pending", "expired"]);
    for (const row of (data ?? []) as Array<{
      assistance_programs:
        | { slug: string; title: string }
        | Array<{ slug: string; title: string }>;
    }>) {
      const program = pickOne(row.assistance_programs);
      if (program && !seen.has(program.slug)) {
        seen.add(program.slug);
        results.push({ ...program, reason: "sumber" });
      }
    }
  }

  // Pencarian judul (trigram) — ambil potongan kata kunci yang berarti.
  const keyword = title.split(/\s+/).slice(0, 4).join(" ").slice(0, 60);
  if (keyword.length >= 8) {
    const { data } = await supabase
      .from("assistance_programs")
      .select("slug, title")
      .in("status", ["verified", "pending", "expired"])
      .ilike("title", `%${keyword.replace(/[%_,()]/g, " ")}%`)
      .limit(5);
    for (const row of (data ?? []) as Array<{ slug: string; title: string }>) {
      if (!seen.has(row.slug)) {
        seen.add(row.slug);
        results.push({ ...row, reason: "judul" });
      }
    }
  }

  return results.slice(0, 5);
}

/** Mapping aksi review → label untuk riwayat di dasbor kontributor. */
export const CONTRIBUTOR_HISTORY_LABEL: Record<ReviewAction | "submit" | "withdraw" | "edit", string> =
  {
    submit: "Dikirim untuk ditinjau",
    withdraw: "Ditarik ke draf",
    edit: "Diperbarui",
    verify: "Diverifikasi",
    request_changes: "Diminta revisi",
    reject: "Ditolak",
    mark_expired: "Ditandai kedaluwarsa",
  };
