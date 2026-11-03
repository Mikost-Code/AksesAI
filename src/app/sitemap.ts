import type { MetadataRoute } from "next";

import { clientEnv } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = clientEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const now = new Date();
  const routes: Array<{ path: string; priority: number }> = [
    { path: "", priority: 1 },
    { path: "/bansos", priority: 0.9 },
    { path: "/panduan", priority: 0.6 },
    { path: "/tentang", priority: 0.5 },
    { path: "/kebijakan-privasi", priority: 0.3 },
  ];
  return routes.map((route) => ({
    url: `${site}${route.path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: route.priority,
  }));
}
