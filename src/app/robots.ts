import type { MetadataRoute } from "next";

import { clientEnv } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const site = clientEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/review", "/moderation", "/admin", "/api", "/auth"],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
  };
}
