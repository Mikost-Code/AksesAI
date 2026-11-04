import type { AccessType, ProgramStatus } from "@/lib/constants/labels";

/** Bentuk baris mentah dari PostgREST (embed relasi bisa objek atau array). */
export type RawProfileEmbed = {
  github_username: string;
  github_avatar: string | null;
};

export type RawProgramRow = {
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
  status: ProgramStatus;
  promo_end: string | null;
  verified_at: string | null;
  categories: { name: string; slug?: string } | Array<{ name: string; slug?: string }> | null;
  /** Embed profil kontributor; nama alias dapat berbeda per query. */
  profiles?: RawProfileEmbed | RawProfileEmbed[] | null;
  contributor?: RawProfileEmbed | RawProfileEmbed[] | null;
};

export function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}
