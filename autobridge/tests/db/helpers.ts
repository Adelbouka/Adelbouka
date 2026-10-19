import { config } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/database.types";

config({ path: ".env.local" });

export const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!URL || !ANON || !SERVICE) throw new Error("Database tests need .env.local with local Supabase keys");
if (!/127\.0\.0\.1|localhost/.test(URL)) throw new Error("Database tests only run against a local Supabase instance");

export type Client = SupabaseClient<Database>;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };

export const service: Client = createClient<Database>(URL, SERVICE, opts);
export const anon = (): Client => createClient<Database>(URL, ANON, opts);

export const RUN = Math.random().toString(36).slice(2, 8);
const created: string[] = [];

export type TestUser = { id: string; email: string; client: Client };

export async function makeUser(label: string): Promise<TestUser> {
  const email = `t-${RUN}-${label}@example.com`;
  const password = "TestPass123";
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: label, locale: "fr" } });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  created.push(data.user.id);
  const client = anon();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { id: data.user.id, email, client };
}

export async function grantRole(user: TestUser, role: "admin" | "staff") {
  const { error } = await service.from("user_roles").insert({ user_id: user.id, role });
  if (error) throw error;
}

export async function approvedSupplier(user: TestUser, name: string) {
  const { data, error } = await service.from("supplier_profiles").insert({
    owner_id: user.id, business_name: `${name} ${RUN}`, country_code: "DE", city: "Berlin",
    contact_name: "Contact", contact_email: user.email, contact_phone: "+49 30 000000", status: "approved",
  }).select("id").single();
  if (error || !data) throw error;
  return data.id;
}

export async function makeId(slug = "volkswagen") {
  const { data } = await service.from("vehicle_makes").select("id").eq("slug", slug).single();
  return data!.id;
}

export function vehicleRow(supplierId: string, makeId: number, over: Partial<Database["public"]["Tables"]["vehicles"]["Insert"]> = {}) {
  return {
    supplier_id: supplierId, make_id: makeId, model: `Model${RUN}`, manufacture_year: 2022, mileage_km: 30000,
    fuel_type: "petrol" as const, transmission: "manual" as const, condition: "used" as const, country_code: "DE", city: "Berlin",
    price_amount: 20000, price_currency: "EUR", body_type: "hatchback" as const, ...over,
  };
}

/** Creates a listing as the supplier and publishes it as staff. */
export async function publishedVehicle(supplier: TestUser, supplierId: string, staff: TestUser, over: Parameters<typeof vehicleRow>[2] = {}) {
  const { data, error } = await supplier.client.from("vehicles").insert({ ...vehicleRow(supplierId, await makeId(), over), status: "pending_review" }).select("id, slug").single();
  if (error || !data) throw error;
  const { error: e2 } = await staff.client.rpc("admin_review_vehicle", { p_vehicle_id: data.id, p_decision: "approve" });
  if (e2) throw e2;
  return data;
}

export async function cleanup() {
  if (!created.length) return;
  const { data: sups } = await service.from("supplier_profiles").select("id").in("owner_id", created);
  const supIds = (sups ?? []).map((s) => s.id);
  await service.from("purchase_requests").delete().in("customer_id", created);
  if (supIds.length) {
    const { data: vs } = await service.from("vehicles").select("id").in("supplier_id", supIds);
    const vIds = (vs ?? []).map((v) => v.id);
    if (vIds.length) await service.from("purchase_requests").delete().in("vehicle_id", vIds);
    await service.from("vehicles").delete().in("supplier_id", supIds);
  }
  await service.from("supplier_verification_records").delete().in("supplier_id", supIds.length ? supIds : ["00000000-0000-0000-0000-000000000000"]);
  await service.from("verification_documents").delete().in("uploaded_by", created);
  await service.from("supplier_profiles").delete().in("owner_id", created);
  const { data: parts } = await service.from("partner_profiles").select("id").in("owner_id", created);
  if (parts?.length) {
    await service.from("service_requests").delete().in("partner_id", parts.map((p) => p.id));
    await service.from("partner_profiles").delete().in("owner_id", created);
  }
  for (const folder of created) {
    for (const bucket of ["verification-docs", "vehicle-images"]) {
      const { data: files } = await service.storage.from(bucket).list(folder, { limit: 100 });
      if (files?.length) await service.storage.from(bucket).remove(files.map((f) => `${folder}/${f.name}`));
    }
  }
  for (const id of created) await service.auth.admin.deleteUser(id);
}
