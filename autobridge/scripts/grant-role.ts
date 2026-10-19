/**
 * Grants (or revokes) a privileged role to an existing, e-mail-confirmed account.
 * This is how the FIRST administrator is created; afterwards administrators manage
 * roles from /admin/users.
 *
 *   pnpm admin:grant person@company.com            # grant "admin"
 *   pnpm admin:grant person@company.com staff      # grant "staff"
 *   pnpm admin:grant person@company.com admin --revoke
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment
 * (or .env.local). Run it only from a trusted machine; never expose the service key.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";

config({ path: ".env.local" });

const [email, roleArg = "admin", ...flags] = process.argv.slice(2);
const role = roleArg as "admin" | "staff";
const revoke = flags.includes("--revoke");

async function main() {
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !["admin", "staff"].includes(role)) {
    console.error("Usage: pnpm admin:grant <email> [admin|staff] [--revoke]");
    process.exit(1);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
    process.exit(1);
  }
  const db = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: profile } = await db.from("profiles").select("id, email").ilike("email", email).maybeSingle();
  if (!profile) {
    console.error(`No account found for ${email}. The person must sign up and confirm their e-mail first.`);
    process.exit(1);
  }
  const { data: auth } = await db.auth.admin.getUserById(profile.id);
  if (!auth.user?.email_confirmed_at) {
    console.error("This account has not confirmed its e-mail address yet. Refusing to grant a role.");
    process.exit(1);
  }

  if (revoke) {
    const { error } = await db.from("user_roles").delete().eq("user_id", profile.id).eq("role", role);
    if (error) throw error;
  } else {
    const { error } = await db.from("user_roles").upsert({ user_id: profile.id, role }, { onConflict: "user_id,role", ignoreDuplicates: true });
    if (error) throw error;
  }
  await db.from("audit_logs").insert({
    actor_id: null,
    action: revoke ? "role.revoked" : "role.granted",
    entity_type: "user",
    entity_id: profile.id,
    details: { role, via: "cli" },
  });
  console.log(`${revoke ? "Revoked" : "Granted"} role "${role}" ${revoke ? "from" : "to"} ${profile.email}.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
