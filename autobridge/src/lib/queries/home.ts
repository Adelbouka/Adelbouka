import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Real counts of currently published listings by make and by country (no invented figures). */
export async function getMarketplaceFacets() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("marketplace_vehicles")
    .select("make_slug, make_name, country_code")
    .in("availability", ["available", "reserved"])
    .limit(5000);
  const makes = new Map<string, { slug: string; name: string; count: number }>();
  const countries = new Map<string, number>();
  for (const row of data ?? []) {
    if (row.make_slug && row.make_name) {
      const m = makes.get(row.make_slug) ?? { slug: row.make_slug, name: row.make_name, count: 0 };
      m.count += 1;
      makes.set(row.make_slug, m);
    }
    if (row.country_code) countries.set(row.country_code, (countries.get(row.country_code) ?? 0) + 1);
  }
  return {
    makes: [...makes.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    countries: [...countries.entries()].map(([code, count]) => ({ code, count })).sort((a, b) => b.count - a.count),
  };
}

export async function getAllMakes() {
  const supabase = await createClient();
  const { data } = await supabase.from("vehicle_makes").select("id, name, slug").eq("is_active", true).order("name");
  return data ?? [];
}

export async function getFaqs() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("faqs")
    .select("id, question_ar, question_fr, answer_ar, answer_fr")
    .eq("is_published", true)
    .order("position");
  return data ?? [];
}
