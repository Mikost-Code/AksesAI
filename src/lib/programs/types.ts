import type { ProgramStatus } from "@/lib/constants/labels";

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
  region: string | null;
  province: string | null;
  city: string | null;
  organizer: string;
  status: ProgramStatus;
  end_date: string | null;
  published_at: string | null;
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
