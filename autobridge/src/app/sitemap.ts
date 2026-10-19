import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

export const revalidate = 3600;

/** Public pages and real (non-demonstration) published listings only. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const statics = ["", "/vehicles", "/estimate", "/partners", "/contact", "/legal/terms", "/legal/privacy", "/legal/disclosure"];
  const entries: MetadataRoute.Sitemap = statics.map((p) => ({
    url: `${SITE_URL}/ar${p}`,
    alternates: { languages: { ar: `${SITE_URL}/ar${p}`, fr: `${SITE_URL}/fr${p}` } },
  }));
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return entries;
  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { data } = await supabase.from("marketplace_vehicles").select("slug, updated_at")
    .eq("is_demo", false).eq("supplier_is_demo", false).limit(5000);
  for (const v of data ?? []) {
    if (!v.slug) continue;
    entries.push({
      url: `${SITE_URL}/ar/vehicles/${v.slug}`,
      lastModified: v.updated_at ?? undefined,
      alternates: { languages: { ar: `${SITE_URL}/ar/vehicles/${v.slug}`, fr: `${SITE_URL}/fr/vehicles/${v.slug}` } },
    });
  }
  return entries;
}
