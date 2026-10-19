import type { Json } from "@/lib/supabase/database.types";

export type VehicleSnapshot = {
  slug: string;
  make: string;
  model: string;
  trim: string | null;
  year: number;
  mileage_km: number | null;
  price_amount: number | null;
  price_currency: string | null;
  country_code: string | null;
  city: string | null;
  is_demo: boolean;
};

export function parseSnapshot(value: Json | null | undefined): VehicleSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, Json>;
  if (typeof v.slug !== "string" || typeof v.model !== "string") return null;
  return {
    slug: v.slug,
    make: typeof v.make === "string" ? v.make : "",
    model: v.model,
    trim: typeof v.trim === "string" ? v.trim : null,
    year: Number(v.year),
    mileage_km: v.mileage_km == null ? null : Number(v.mileage_km),
    price_amount: v.price_amount == null ? null : Number(v.price_amount),
    price_currency: typeof v.price_currency === "string" ? v.price_currency : null,
    country_code: typeof v.country_code === "string" ? v.country_code : null,
    city: typeof v.city === "string" ? v.city : null,
    is_demo: v.is_demo === true,
  };
}

export function snapshotTitle(s: VehicleSnapshot | null): string {
  return s ? `${s.make} ${s.model} ${s.year}`.trim() : "";
}
