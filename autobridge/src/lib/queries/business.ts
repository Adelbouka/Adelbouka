import "server-only";
import { createClient } from "@/lib/supabase/server";
import { countryName } from "@/lib/format";
import { SOURCE_COUNTRIES } from "@/lib/domain/enums";

export async function getMySupplier(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("supplier_profiles").select("*").eq("owner_id", userId).maybeSingle();
  return data;
}

export async function getMyPartner(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("partner_profiles").select("*, partner_service_categories(category_code)").eq("owner_id", userId).maybeSingle();
  return data;
}

export function countryOptions(locale: string) {
  return SOURCE_COUNTRIES.map((code) => ({ code, name: countryName(code, locale) }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}

export async function serviceCategoryOptions(locale: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("service_categories").select("code, name_ar, name_fr").eq("is_active", true).order("position");
  return (data ?? []).map((c) => ({ code: c.code, name: locale === "fr" ? c.name_fr : c.name_ar }));
}

export async function activeCurrencies() {
  const supabase = await createClient();
  const { data } = await supabase.from("currencies").select("code").eq("is_active", true).order("code");
  return (data ?? []).map((c) => c.code);
}
