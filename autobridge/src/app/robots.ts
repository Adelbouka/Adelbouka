import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const privateAreas = ["account", "supplier", "partner", "admin", "requests", "auth"].flatMap((p) => [`/ar/${p}`, `/fr/${p}`]);
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: [...privateAreas, "/api/", "/auth/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
