import "server-only";

import { unstable_cache } from "next/cache";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseAnonClient } from "@/lib/supabase/server";

export type CategoryRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
};

async function fetchCategories(): Promise<CategoryRecord[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createSupabaseAnonClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, description, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[categories] Query gagal:", error.message);
    return [];
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    sortOrder: row.sort_order,
  }));
}

export async function getCategories(): Promise<CategoryRecord[]> {
  const cached = unstable_cache(fetchCategories, ["categories:active"], {
    revalidate: 600,
    tags: ["categories"],
  });
  return cached();
}
