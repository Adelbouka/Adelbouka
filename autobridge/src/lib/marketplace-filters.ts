import { z } from "zod";
import { AVAILABILITIES, CONDITIONS, FUEL_TYPES, TRANSMISSIONS } from "@/lib/domain/enums";

export const SORTS = ["newest", "price_asc", "price_desc", "year_desc", "year_asc", "mileage_asc"] as const;
export type Sort = (typeof SORTS)[number];
export const PAGE_SIZE = 12;

const optInt = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().int().min(min).max(max).optional(),
  ).catch(undefined);
const optText = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim().slice(0, max) : undefined),
    z.string().optional(),
  );
const optEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.enum(values).optional().catch(undefined);

export const filtersSchema = z.object({
  q: optText(80),
  make: z.preprocess(
    (v) => (typeof v === "string" && /^[a-z0-9-]{1,40}$/.test(v) ? v : undefined),
    z.string().optional(),
  ),
  model: optText(60),
  yearMin: optInt(1950, 2100),
  yearMax: optInt(1950, 2100),
  regYearMin: optInt(1950, 2100),
  priceMin: optInt(0, 10_000_000_000),
  priceMax: optInt(0, 10_000_000_000),
  country: z.preprocess(
    (v) => (typeof v === "string" && /^[A-Z]{2}$/.test(v) ? v : undefined),
    z.string().optional(),
  ),
  fuel: optEnum(FUEL_TYPES),
  transmission: optEnum(TRANSMISSIONS),
  mileageMax: optInt(0, 2_000_000),
  engineMin: optInt(0, 10_000),
  engineMax: optInt(0, 10_000),
  condition: optEnum(CONDITIONS),
  verified: z.preprocess((v) => v === "1" || v === "true", z.boolean()).catch(false),
  availability: z.enum([...AVAILABILITIES, "any"] as const).catch("available"),
  sort: z.enum(SORTS).catch("newest"),
  page: optInt(1, 1000),
});

export type MarketplaceFilters = z.infer<typeof filtersSchema>;

export function parseFilters(params: Record<string, string | string[] | undefined>): MarketplaceFilters {
  const flat: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(params)) flat[k] = Array.isArray(v) ? v[0] : v;
  return filtersSchema.parse(flat);
}

/** Serializes filters back to a query string, omitting defaults. */
export function filtersToSearch(filters: Partial<MarketplaceFilters>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "" || value === false) continue;
    if (key === "availability" && value === "available") continue;
    if (key === "sort" && value === "newest") continue;
    if (key === "page" && value === 1) continue;
    params.set(key, value === true ? "1" : String(value));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

export function activeFilterCount(f: MarketplaceFilters): number {
  const keys: (keyof MarketplaceFilters)[] = [
    "q", "make", "model", "yearMin", "yearMax", "regYearMin", "priceMin", "priceMax", "country", "fuel",
    "transmission", "mileageMax", "engineMin", "engineMax", "condition",
  ];
  return keys.filter((k) => f[k] !== undefined).length + (f.verified ? 1 : 0) + (f.availability !== "available" ? 1 : 0);
}
