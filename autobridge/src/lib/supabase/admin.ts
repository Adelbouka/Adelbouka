import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Service-role client. Bypasses RLS — use ONLY in trusted server jobs that cannot run
 * under a user's identity (e.g. the notification e-mail dispatcher). Never import it
 * from code that handles user input directly, and never expose the key to the browser.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  return createClient<Database>(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
