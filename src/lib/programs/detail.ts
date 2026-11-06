import "server-only";

import { unstable_cache } from "next/cache";

import { isSupabaseConfigured } from "@/lib/env";
import {
  createSupabaseAnonClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { displayHost } from "@/lib/security/ssrf-guard";
import { programTag, TAG_PROGRAMS_PUBLIC } from "@/lib/cache-tags";
import type { AccessType, ProgramStatus, SourceType } from "@/lib/constants/labels";

export type ProgramSource = {
  id: string;
  url: string;
  domain: string;
  title: string | null;
  type: SourceType;
  isPrimary: boolean;
  /** Berapa kali pengunjung mengikuti tautan ini (sinyal kualitas). */
  clickCount: number;
};

export type ProgramHistoryEntry = {
  action: string;
  createdAt: string;
};

/**
 * Satu titik riwayat harga/free tier.
 *
 * `source` menjelaskan pemicu pencatatan (trigger DB, migrasi 0013):
 * `create` saat entri dibuat, `update` saat kontributor/reviewer mengubah
 * harga, `verify` saat entri diverifikasi ulang.
 */
export type PriceHistoryEntry = {
  priceInputPerMtok: number | null;
  priceOutputPerMtok: number | null;
  freeTier: string | null;
  freeTierAvailable: boolean;
  source: "create" | "update" | "verify" | string;
  recordedAt: string;
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
  /** Riwayat harga (maks. 10 titik terbaru). Kosong bila belum ada harga. */
  priceHistory: PriceHistoryEntry[];
  /** Apakah pengunjung yang login sudah memasang pengingat promo. */
  watching: boolean;
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
  sources: RawSourceRow[] | null;
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

async function fetchProgramDetail(
  slug: string,
  _viewerId: string | null,
): Promise<ProgramDetail | null> {
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
       sources(${SOURCE_COLUMNS_BASE}),
       contribution_history(action, created_at)`,
    )
    .eq("slug", slug)
    .in("status", ["verified", "expired"])
    .maybeSingle<Omit<RawDetail, "sources"> & { sources: RawSourceRow[] | null }>();

  if (error) {
    console.error("[program-detail] Query gagal:", error.message);
    return null;
  }
  if (!data) return null;

  const category = pickOne(data.categories);
  const contributor = pickOne(data.contributor);
  const reviewer = pickOne(data.reviewer);

  // Riwayat harga diambil terpisah: embed PostgREST pada tabel pihak-pertama
  // tidak diperlukan di jalur utama dan bisa menggagalkan seluruh query bila
  // migrasi 0013 belum dijalankan. Kegagalan di sini bersifat non-fatal.
  const priceHistory = await fetchPriceHistory(supabase, data.id);
  // Statistik klik juga opsional (kolomnya bagian dari migrasi 0013).
  const clickCounts = await fetchSourceClicks(supabase, data.id);

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
      clickCount: clickCounts.get(s.id) ?? 0,
    })),
    // Riwayat publik: hanya tanggal + aksi (tanpa data internal/diff).
    history: (data.contribution_history ?? [])
      .filter((h) => ALLOWED_HISTORY_ACTIONS.has(h.action))
      .map((h) => ({ action: h.action, createdAt: h.created_at }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    priceHistory,
    // Pengunjung anonim tidak punya daftar pengingat; status dilapisi di
    // `getProgramDetail` agar cache tetap netral terhadap pengguna.
    watching: false,
  };
}

/** Batas titik riwayat harga yang ditampilkan (sisanya tetap tersimpan). */
const PRICE_HISTORY_LIMIT = 10;

/**
 * Kolom `sources` untuk query utama.
 *
 * `sources.click_count` baru ada sejak migrasi 0013. Database yang belum
 * dimigrasikan akan menggagalkan SELURUH query detail (dan halaman jadi 404)
 * bila kolom itu diminta. Karena itu kolom tersebut dipisah: kegagalannya
 * ditangani `fetchSourceClicks` dan hanya menghilangkan statistik klik.
 */
const SOURCE_COLUMNS_BASE = "id, source_url, source_title, source_type, is_primary";

type RawSourceRow = {
  id: string;
  source_url: string;
  source_title: string | null;
  source_type: SourceType;
  is_primary: boolean;
};

/**
 * Ambil jumlah klik per sumber. Mengembalikan map kosong bila kolom belum ada
 * atau tidak dapat dibaca (anon tanpa grant) — statistik bersifat tambahan.
 */
async function fetchSourceClicks(
  supabase: ReturnType<typeof createSupabaseAnonClient>,
  programId: string,
): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from("sources")
    .select("id, click_count")
    .eq("program_id", programId);

  if (error) return new Map();
  return new Map(
    ((data ?? []) as Array<{ id: string; click_count: number | string | null }>).map(
      (row) => [row.id, Number(row.click_count ?? 0)],
    ),
  );
}

type RawPriceRow = {
  price_input_per_mtok: number | string | null;
  price_output_per_mtok: number | string | null;
  free_tier: string | null;
  free_tier_available: boolean;
  source: string;
  recorded_at: string;
};

async function fetchPriceHistory(
  supabase: ReturnType<typeof createSupabaseAnonClient>,
  programId: string,
): Promise<PriceHistoryEntry[]> {
  const { data, error } = await supabase
    .from("program_price_history")
    .select(
      "price_input_per_mtok, price_output_per_mtok, free_tier, free_tier_available, source, recorded_at",
    )
    .eq("program_id", programId)
    .order("recorded_at", { ascending: false })
    .limit(PRICE_HISTORY_LIMIT);

  if (error) {
    // Tabel belum ada / RLS menolak: tampilkan tanpa riwayat, jangan gagalkan
    // halaman detail.
    return [];
  }

  return ((data ?? []) as RawPriceRow[]).map((row) => ({
    // numeric Postgres dikirim sebagai string oleh PostgREST.
    priceInputPerMtok: toNumber(row.price_input_per_mtok),
    priceOutputPerMtok: toNumber(row.price_output_per_mtok),
    freeTier: row.free_tier,
    freeTierAvailable: row.free_tier_available,
    source: row.source,
    recordedAt: row.recorded_at,
  }));
}

function toNumber(value: number | string | null): number | null {
  if (value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function getProgramDetail(
  slug: string,
  viewerId: string | null = null,
): Promise<ProgramDetail | null> {
  // `viewerId` sengaja TIDAK ikut dalam cache karena status "diingatkan"
  // bersifat per pengguna: cache berisi hasil untuk pengunjung anonim, lalu
  // status watchlist dilapisi segar per request. Pola ini mencegah kebocoran
  // status pengguna A ke pengguna B — kelas bug yang mudah terjadi bila ID
  // pengguna dimasukkan sebagai argumen cache publik.
  const cached = unstable_cache(
    () => fetchProgramDetail(slug, null),
    ["program-detail", slug],
    { revalidate: 300, tags: [TAG_PROGRAMS_PUBLIC, programTag(slug)] },
  );
  const detail = await cached();
  if (!detail || !viewerId) return detail;

  const supabase = await createSupabaseServerClient();
  const watching = await fetchWatching(supabase, detail.id, viewerId);
  return { ...detail, watching };
}

/** Status pengingat pengguna untuk satu entri (query ringan, tanpa cache). */
async function fetchWatching(
  supabase: ReturnType<typeof createSupabaseAnonClient>,
  programId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("program_watchlist")
    .select("id")
    .eq("program_id", programId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    // Tabel belum ada (migrasi 0013) — anggap belum diingatkan.
    return false;
  }
  return Boolean(data);
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
