import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type PublicSettings = Record<string, unknown>;

/** Public site settings (contact details, homepage overrides). Null values are omitted. */
export const getPublicSettings = cache(async (): Promise<PublicSettings> => {
  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("key, value").eq("is_public", true);
  const out: PublicSettings = {};
  for (const row of data ?? []) {
    if (row.value !== null && row.value !== "") out[row.key] = row.value;
  }
  return out;
});
