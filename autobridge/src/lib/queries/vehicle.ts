import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { MARKETPLACE_CARD_COLUMNS } from "./marketplace";

export const getPublicVehicle = cache(async (slug: string) => {
  if (!/^[a-z0-9-]{3,160}$/.test(slug)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("marketplace_vehicles").select("*").eq("slug", slug).maybeSingle();
  return data;
});

export async function getVehicleDetailsExtras(vehicleId: string, supplierId: string, makeId: number, bodyType: string | null) {
  const supabase = await createClient();
  const [images, supplier, verifications, similar] = await Promise.all([
    supabase.from("vehicle_images").select("storage_path, external_url, alt_text, position").eq("vehicle_id", vehicleId).order("position"),
    supabase.from("public_suppliers").select("*").eq("id", supplierId).maybeSingle(),
    supabase.from("public_business_verifications").select("id, check_type, method, verified_at, expires_at").eq("supplier_id", supplierId).order("verified_at", { ascending: false }),
    supabase.from("marketplace_vehicles").select(MARKETPLACE_CARD_COLUMNS)
      .neq("id", vehicleId).eq("availability", "available")
      .or(`make_id.eq.${makeId}${bodyType ? `,body_type.eq.${bodyType}` : ""}`)
      .order("published_at", { ascending: false }).limit(3),
  ]);
  return {
    images: images.data ?? [],
    supplier: supplier.data,
    verifications: verifications.data ?? [],
    similar: similar.data ?? [],
  };
}
