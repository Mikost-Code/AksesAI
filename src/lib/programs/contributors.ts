import "server-only";

import { unstable_cache } from "next/cache";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseAnonClient } from "@/lib/supabase/server";
import type { ProgramStatus } from "@/lib/constants/labels";
import type { ProgramCardData } from "@/components/program-card";
import { toProgramCard, PUBLIC_PROGRAM_SELECT } from "./queries";
import type { RawProgramRow } from "./types";

export type ContributorProfile = {
  username: string;
  avatar: string | null;
  url: string | null;
  bio: string | null;
  joinedAt: string;
  totalContributions: number;
  totalVerified: number;
  programs: ProgramCardData[];
};

/**
 * Profil kontributor publik (PRD §5.6, FR-PRO).
 * Hanya menampilkan data publik: username, avatar, bio, statistik, dan
 * kontribusi verified/expired. Email & data sensitif tidak pernah diambil.
 */
async function fetchContributor(username: string): Promise<ContributorProfile | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createSupabaseAnonClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, github_username, github_avatar, github_url, bio, is_deleted, created_at")
    .eq("github_username", username)
    .maybeSingle();

  if (error) {
    console.error("[contributor] Query profil gagal:", error.message);
    return null;
  }
  if (!profile || profile.is_deleted) return null;

  const { data: countRows } = await supabase
    .from("assistance_programs")
    .select("status")
    .eq("contributor_id", profile.id)
    .in("status", ["verified", "expired", "pending", "needs_changes", "rejected"]);

  const statuses = (countRows ?? []).map((r) => r.status as ProgramStatus);
  const totalContributions = statuses.length;
  const totalVerified = statuses.filter((s) => s === "verified" || s === "expired").length;

  const { data: programs } = await supabase
    .from("assistance_programs")
    .select(PUBLIC_PROGRAM_SELECT)
    .eq("contributor_id", profile.id)
    .in("status", ["verified", "expired"])
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(50);

  return {
    username: profile.github_username,
    avatar: profile.github_avatar,
    url: profile.github_url,
    bio: profile.bio,
    joinedAt: profile.created_at,
    totalContributions,
    totalVerified,
    programs: ((programs ?? []) as unknown as RawProgramRow[]).map(toProgramCard),
  };
}

export async function getContributor(username: string): Promise<ContributorProfile | null> {
  const cached = unstable_cache(
    () => fetchContributor(username),
    ["contributor", username],
    { revalidate: 300, tags: ["profiles"] },
  );
  return cached();
}
