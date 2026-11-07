import type { MetadataRoute } from "next";

import { clientEnv } from "@/lib/env";
import { listPublicProgramPaths } from "@/lib/programs/seo";

/**
 * Sitemap: rute statis + seluruh entri publik (verified/expired).
 * Query DB dibungkus cache 5 menit; bila DB tidak siap, sitemap tetap
 * terbit dengan rute statis saja (tidak pernah gagal permintaan crawler).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = clientEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const now = new Date();

  const staticRoutes: Array<{ path: string; priority: number; freq: "weekly" | "monthly" }> = [
    { path: "", priority: 1, freq: "weekly" },
    { path: "/info", priority: 0.9, freq: "weekly" },
    { path: "/panduan", priority: 0.6, freq: "monthly" },
    { path: "/tentang", priority: 0.5, freq: "monthly" },
    { path: "/ketentuan-penggunaan", priority: 0.3, freq: "monthly" },
    { path: "/kebijakan-privasi", priority: 0.3, freq: "monthly" },
  ];

  const entries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${site}${route.path}`,
    lastModified: now,
    changeFrequency: route.freq,
    priority: route.priority,
  }));

  const paths = await listPublicProgramPaths();
  for (const { slug, updatedAt } of paths) {
    entries.push({
      url: `${site}/info/${encodeURIComponent(slug)}`,
      lastModified: updatedAt ? new Date(updatedAt) : now,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  return entries;
}
