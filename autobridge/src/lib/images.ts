import { SUPABASE_URL } from "@/lib/env";

/** Resolves a vehicle image reference (storage path or external URL) to a URL. */
export function vehicleImageUrl(ref: string | null | undefined): string | null {
  if (!ref) return null;
  if (/^https:\/\//.test(ref)) return ref;
  return `${SUPABASE_URL}/storage/v1/object/public/vehicle-images/${ref.split("/").map(encodeURIComponent).join("/")}`;
}
