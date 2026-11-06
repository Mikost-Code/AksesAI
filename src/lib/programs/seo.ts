import "server-only";

import { unstable_cache } from "next/cache";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseAnonClient } from "@/lib/supabase/server";
import { TAG_PROGRAMS_PUBLIC } from "@/lib/cache-tags";

/**
 * Data pendukung SEO: sitemap, gambar Open Graph, dan bukti sosial.
 * Semua query memakai client anon (RLS berlaku) dan hanya menyentuh
 * entri berstatus verified/expired.
 *
 * Tag cache memakai konstanta `TAG_PROGRAMS_PUBLIC` yang sama dengan direktori.
 * Sebelumnya modul ini memakai string `"programs-public"` (tanda hubung)
 * sedangkan direktori memakai `"programs:public"` (titik dua) — aksi yang
 * merevalidasi satu tag tidak pernah menyegarkan satunya, sehingga sitemap &
 * kartu OG terus menyajikan data lama. Satu konstanta menghilangkan kelas bug
 * ini sepenuhnya.
 */

export type PublicProgramPath = {
  slug: string;
  updatedAt: string | null;
};

export const listPublicProgramPaths = unstable_cache(
  async (): Promise<PublicProgramPath[]> => {
    if (!isSupabaseConfigured()) return [];

    const supabase = createSupabaseAnonClient();
    const { data, error } = await supabase
      .from("assistance_programs")
      .select("slug, updated_at")
      .in("status", ["verified", "expired"])
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(5000);

    if (error) {
      console.error("[seo] Daftar slug gagal:", error.message);
      return [];
    }
    return ((data ?? []) as Array<{ slug: string; updated_at: string | null }>).map(
      (row) => ({ slug: row.slug, updatedAt: row.updated_at }),
    );
  },
  ["seo-program-paths"],
  { revalidate: 300, tags: [TAG_PROGRAMS_PUBLIC] },
);

export type ProgramOgData = {
  title: string;
  provider: string | null;
  status: string;
};

export const getProgramForOg = unstable_cache(
  async (slug: string): Promise<ProgramOgData | null> => {
    if (!isSupabaseConfigured()) return null;

    const supabase = createSupabaseAnonClient();
    const { data, error } = await supabase
      .from("assistance_programs")
      .select("title, provider, status")
      .eq("slug", slug)
      .in("status", ["verified", "expired"])
      .maybeSingle();

    if (error || !data) return null;
    return data as ProgramOgData;
  },
  ["seo-program-og"],
  { revalidate: 300, tags: [TAG_PROGRAMS_PUBLIC] },
);

export type TopContributor = {
  username: string;
  avatarUrl: string | null;
  contributionCount: number;
};

/**
 * Kontributor paling aktif berdasarkan entri publik (verified/expired).
 * Mengembalikan array kosong bila DB tidak dikonfigurasi / kosong.
 */
export const getTopContributors = unstable_cache(
  async (limit = 3): Promise<TopContributor[]> => {
    if (!isSupabaseConfigured()) return [];

    const supabase = createSupabaseAnonClient();
    // profiles punya DUA FK ke assistance_programs (contributor & reviewer),
    // jadi nama relasi wajib eksplisit agar PostgREST tidak ambigu.
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "github_username, github_avatar, assistance_programs!assistance_programs_contributor_id_fkey!inner(count)",
      )
      .eq("assistance_programs.status", "verified")
      .limit(200);

    if (error) {
      console.error("[seo] Top kontributor gagal:", error.message);
      return [];
    }

    return (
      ((data ?? []) as Array<{
        github_username: string;
        github_avatar: string | null;
        assistance_programs: Array<{ count: number }>;
      }>)
        .map((row) => ({
          username: row.github_username,
          avatarUrl: row.github_avatar,
          contributionCount: row.assistance_programs[0]?.count ?? 0,
        }))
        .filter((row) => row.contributionCount > 0)
        .sort((a, b) => b.contributionCount - a.contributionCount)
        .slice(0, limit)
    );
  },
  ["seo-top-contributors"],
  { revalidate: 300, tags: [TAG_PROGRAMS_PUBLIC] },
);
