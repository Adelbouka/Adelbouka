import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { escapeLike } from "@/lib/utils";
import { PAGE_SIZE, type MarketplaceFilters } from "@/lib/marketplace-filters";

export const MARKETPLACE_CARD_COLUMNS =
  "id, slug, make_name, make_slug, model, trim_level, manufacture_year, first_registration_date, mileage_km, fuel_type, transmission, engine_cc, condition, country_code, city, price_amount, price_currency, price_dzd, availability, is_sponsored, is_stale, is_demo, supplier_name, supplier_is_demo, supplier_has_verified_checks, cover_image, published_at";

/**
 * Builds the marketplace query against the public view. Works with any Supabase client
 * (anonymous or signed in) because the view only exposes publishable listings.
 */
export async function searchMarketplace(
  supabase: SupabaseClient<Database>,
  filters: MarketplaceFilters,
  pageSize = PAGE_SIZE,
) {
  const page = filters.page ?? 1;
  let query = supabase.from("marketplace_vehicles").select(MARKETPLACE_CARD_COLUMNS, { count: "exact" });

  if (filters.q) query = query.ilike("search_text", `%${escapeLike(filters.q.toLowerCase())}%`);
  if (filters.make) query = query.eq("make_slug", filters.make);
  if (filters.model) query = query.ilike("model", `%${escapeLike(filters.model)}%`);
  if (filters.yearMin) query = query.gte("manufacture_year", filters.yearMin);
  if (filters.yearMax) query = query.lte("manufacture_year", filters.yearMax);
  if (filters.regYearMin) query = query.gte("first_registration_date", `${filters.regYearMin}-01-01`);
  if (filters.priceMin !== undefined) query = query.gte("price_dzd", filters.priceMin);
  if (filters.priceMax !== undefined) query = query.lte("price_dzd", filters.priceMax);
  if (filters.country) query = query.eq("country_code", filters.country);
  if (filters.fuel) query = query.eq("fuel_type", filters.fuel);
  if (filters.transmission) query = query.eq("transmission", filters.transmission);
  if (filters.mileageMax !== undefined) query = query.lte("mileage_km", filters.mileageMax);
  if (filters.engineMin !== undefined) query = query.gte("engine_cc", filters.engineMin);
  if (filters.engineMax !== undefined) query = query.lte("engine_cc", filters.engineMax);
  if (filters.condition) query = query.eq("condition", filters.condition);
  if (filters.verified) query = query.eq("supplier_has_verified_checks", true);
  if (filters.availability !== "any") query = query.eq("availability", filters.availability);

  switch (filters.sort) {
    case "price_asc":
      query = query.order("price_dzd", { ascending: true, nullsFirst: false });
      break;
    case "price_desc":
      query = query.order("price_dzd", { ascending: false, nullsFirst: false });
      break;
    case "year_desc":
      query = query.order("manufacture_year", { ascending: false });
      break;
    case "year_asc":
      query = query.order("manufacture_year", { ascending: true });
      break;
    case "mileage_asc":
      query = query.order("mileage_km", { ascending: true });
      break;
    default:
      // Paid promotions come first in the default order and are always labelled.
      query = query.order("is_sponsored", { ascending: false }).order("published_at", { ascending: false });
  }
  query = query.order("id", { ascending: true }).range((page - 1) * pageSize, page * pageSize - 1);

  const { data, count, error } = await query;
  return { vehicles: data ?? [], total: count ?? 0, page, pageSize, error };
}

export type MarketplaceCard = Awaited<ReturnType<typeof searchMarketplace>>["vehicles"][number];
