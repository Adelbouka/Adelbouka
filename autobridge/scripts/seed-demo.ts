/**
 * Demonstration data for local development.
 *
 *   pnpm seed:demo            create demo accounts, suppliers, partners, listings, rates
 *   pnpm seed:demo --reset    remove all demonstration data (and only demonstration data)
 *
 * Every record created here is fictional and flagged `is_demo = true`; demo accounts use
 * the reserved example.com domain. Demo suppliers receive NO verification records, so
 * they are never presented as verified businesses. Exchange rates and cost assumptions
 * are illustrative values, not official or market rates.
 *
 * Safety: refuses to run against a non-local Supabase unless --allow-remote is passed.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const args = new Set(process.argv.slice(2));

if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see .env.example).");
  process.exit(1);
}
const isLocal = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url);
if (!isLocal && !args.has("--allow-remote")) {
  console.error(`Refusing to seed demo data into a non-local project (${new URL(url).host}). Pass --allow-remote to override.`);
  process.exit(1);
}

const db = createClient<Database>(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

export const DEMO_PASSWORD = "DemoPass2026";
const DEMO_DOMAIN = "example.com";
const demoEmail = (name: string) => `${name}.demo@${DEMO_DOMAIN}`;

function must<T>(result: { data: T; error: unknown }, what: string): NonNullable<T> {
  if (result.error || result.data == null) {
    console.error(`Failed: ${what}`, result.error);
    process.exit(1);
  }
  return result.data as NonNullable<T>;
}

async function listDemoUsers() {
  const users: { id: string; email?: string }[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    users.push(...data.users.filter((u) => u.email?.endsWith(`.demo@${DEMO_DOMAIN}`)));
    if (data.users.length < 200) break;
  }
  return users;
}

async function reset() {
  const users = await listDemoUsers();
  const ids = users.map((u) => u.id);
  const { data: suppliers } = await db.from("supplier_profiles").select("id").eq("is_demo", true);
  const supplierIds = (suppliers ?? []).map((s) => s.id);
  const { data: vehicles } = await db.from("vehicles").select("id").eq("is_demo", true);
  const vehicleIds = (vehicles ?? []).map((v) => v.id);

  if (vehicleIds.length) await db.from("purchase_requests").delete().in("vehicle_id", vehicleIds);
  if (ids.length) await db.from("purchase_requests").delete().in("customer_id", ids);
  if (vehicleIds.length) await db.from("vehicles").delete().in("id", vehicleIds);
  const { data: partners } = await db.from("partner_profiles").select("id").eq("is_demo", true);
  const partnerIds = (partners ?? []).map((p) => p.id);
  if (partnerIds.length) {
    await db.from("service_requests").delete().in("partner_id", partnerIds);
    await db.from("partner_profiles").delete().in("id", partnerIds);
  }
  if (supplierIds.length) await db.from("supplier_profiles").delete().in("id", supplierIds);
  await db.from("exchange_rates").delete().eq("is_demo", true);

  const { data: demoSets } = await db.from("cost_rule_sets").select("id, status").eq("is_demo", true);
  if (demoSets?.some((s) => s.status === "active")) {
    // Re-activate the most recent non-demo set before removing the demo one.
    const { data: fallback } = await db
      .from("cost_rule_sets").select("id").eq("is_demo", false).order("version", { ascending: false }).limit(1);
    if (fallback?.[0]) {
      await db.from("cost_rule_sets").update({ status: "retired" }).eq("is_demo", true);
      await db.from("cost_rule_sets").update({ status: "active" }).eq("id", fallback[0].id);
    }
  }
  if (demoSets?.length) {
    // Rules of non-draft sets are immutable; demote to draft so cascading delete is allowed.
    await db.from("cost_rule_sets").update({ status: "draft" }).eq("is_demo", true);
    await db.from("cost_rule_sets").delete().eq("is_demo", true);
  }
  for (const id of ids) await db.auth.admin.deleteUser(id);
  console.log(`Removed demo data: ${vehicleIds.length} vehicles, ${supplierIds.length} suppliers, ${partnerIds.length} partners, ${ids.length} accounts.`);
}

async function ensureUser(name: string, fullName: string) {
  const email = demoEmail(name);
  const existing = (await listDemoUsers()).find((u) => u.email === email);
  if (existing) return existing.id;
  const { data, error } = await db.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName, locale: "ar" },
  });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  return data.user.id;
}

// Illustrative photographs (Unsplash License). They are NOT photos of the listed vehicles,
// and the UI labels them as illustrative on demonstration listings.
const PHOTOS = [
  "photo-1549317661-bd32c8ce0db2", "photo-1503376780353-7e6692767b70", "photo-1552519507-da3b142c6e3d",
  "photo-1580273916550-e323be2ae537", "photo-1606664515524-ed2f786a0bd6", "photo-1617814076367-b759c7d7e738",
  "photo-1619767886558-efdc259cde1a", "photo-1590362891991-f776e747a588", "photo-1541899481282-d53bffe3c35d",
  "photo-1533473359331-0135ef1b58bf", "photo-1494976388531-d1058494cdd8", "photo-1542362567-b07e54358753",
];
const photo = (i: number) => `https://images.unsplash.com/${PHOTOS[i % PHOTOS.length]}?auto=format&fit=crop&w=1600&q=70`;

type DemoVehicle = {
  supplier: number; make: string; model: string; trim?: string; body: Database["public"]["Enums"]["body_type"];
  year: number; reg?: string; km: number; fuel: Database["public"]["Enums"]["fuel_type"];
  gear: Database["public"]["Enums"]["transmission_type"]; cc?: number; kw?: number;
  condition: Database["public"]["Enums"]["vehicle_condition"]; color: string; price: number; currency: string;
  country: string; city: string; status?: Database["public"]["Enums"]["listing_status"];
  availability?: Database["public"]["Enums"]["availability_status"]; staleDays?: number; vin?: string;
};

const VEHICLES: DemoVehicle[] = [
  { supplier: 0, make: "volkswagen", model: "Golf", trim: "1.5 TSI Life", body: "hatchback", year: 2023, reg: "2023-03-14", km: 21500, fuel: "petrol", gear: "manual", cc: 1498, kw: 96, condition: "used", color: "Gris", price: 21900, currency: "EUR", country: "DE", city: "Köln", vin: "WVWZZZCDZPW123456" },
  { supplier: 0, make: "skoda", model: "Octavia", trim: "Combi 2.0 TDI Style", body: "wagon", year: 2022, reg: "2022-06-02", km: 48200, fuel: "diesel", gear: "automatic", cc: 1968, kw: 110, condition: "used", color: "Bleu", price: 23400, currency: "EUR", country: "DE", city: "Düsseldorf" },
  { supplier: 0, make: "toyota", model: "Corolla", trim: "1.8 Hybrid", body: "sedan", year: 2023, reg: "2023-09-20", km: 15800, fuel: "hybrid", gear: "automatic", cc: 1798, kw: 103, condition: "used", color: "Blanc", price: 24900, currency: "EUR", country: "DE", city: "Köln", availability: "reserved" },
  { supplier: 0, make: "audi", model: "A3 Sportback", trim: "30 TFSI", body: "hatchback", year: 2021, reg: "2021-11-08", km: 62300, fuel: "petrol", gear: "automatic", cc: 999, kw: 81, condition: "used", color: "Noir", price: 22500, currency: "EUR", country: "DE", city: "Bonn", staleDays: 45 },
  { supplier: 1, make: "peugeot", model: "208", trim: "1.2 PureTech Allure", body: "hatchback", year: 2023, reg: "2023-05-11", km: 18900, fuel: "petrol", gear: "manual", cc: 1199, kw: 74, condition: "used", color: "Rouge", price: 16900, currency: "EUR", country: "FR", city: "Marseille" },
  { supplier: 1, make: "renault", model: "Clio", trim: "TCe 90 Evolution", body: "hatchback", year: 2024, reg: "2024-02-27", km: 9400, fuel: "petrol", gear: "manual", cc: 999, kw: 67, condition: "used", color: "Gris", price: 17500, currency: "EUR", country: "FR", city: "Lyon" },
  { supplier: 1, make: "dacia", model: "Duster", trim: "1.5 Blue dCi Journey", body: "suv", year: 2023, reg: "2023-07-03", km: 26700, fuel: "diesel", gear: "manual", cc: 1461, kw: 85, condition: "used", color: "Vert", price: 19800, currency: "EUR", country: "FR", city: "Marseille" },
  { supplier: 1, make: "citroen", model: "C3 Aircross", trim: "PureTech 110 Shine", body: "crossover", year: 2022, reg: "2022-04-19", km: 39500, fuel: "petrol", gear: "manual", cc: 1199, kw: 81, condition: "used", color: "Blanc", price: 15900, currency: "EUR", country: "FR", city: "Toulouse" },
  { supplier: 1, make: "peugeot", model: "3008", trim: "1.5 BlueHDi Allure", body: "suv", year: 2022, reg: "2022-10-05", km: 55100, fuel: "diesel", gear: "automatic", cc: 1499, kw: 96, condition: "used", color: "Gris", price: 24300, currency: "EUR", country: "FR", city: "Lyon", status: "pending_review" },
  { supplier: 2, make: "hyundai", model: "Tucson", trim: "1.6 T-GDi Hybrid", body: "suv", year: 2024, km: 0, fuel: "hybrid", gear: "automatic", cc: 1598, kw: 169, condition: "new", color: "Blanc", price: 39500, currency: "EUR", country: "BE", city: "Antwerpen" },
  { supplier: 2, make: "kia", model: "Sportage", trim: "1.6 T-GDi GT-Line", body: "suv", year: 2023, reg: "2023-08-29", km: 24100, fuel: "petrol", gear: "automatic", cc: 1598, kw: 110, condition: "used", color: "Noir", price: 29900, currency: "EUR", country: "BE", city: "Bruxelles" },
  { supplier: 2, make: "mercedes-benz", model: "Classe C", trim: "C 200 d", body: "sedan", year: 2022, reg: "2022-01-17", km: 51800, fuel: "diesel", gear: "automatic", cc: 1993, kw: 120, condition: "used", color: "Argent", price: 36900, currency: "EUR", country: "BE", city: "Bruxelles" },
  { supplier: 2, make: "seat", model: "Ibiza", trim: "1.0 TSI FR", body: "hatchback", year: 2021, reg: "2021-09-01", km: 58600, fuel: "petrol", gear: "manual", cc: 999, kw: 81, condition: "used", color: "Bleu", price: 14200, currency: "EUR", country: "BE", city: "Liège", availability: "sold" },
  { supplier: 2, make: "tesla", model: "Model 3", trim: "Standard Range Plus", body: "sedan", year: 2022, reg: "2022-03-30", km: 41200, fuel: "electric", gear: "automatic", kw: 208, condition: "used", color: "Blanc", price: 29500, currency: "EUR", country: "BE", city: "Antwerpen" },
  { supplier: 0, make: "bmw", model: "Série 1", trim: "118i", body: "hatchback", year: 2022, reg: "2022-12-12", km: 33100, fuel: "petrol", gear: "automatic", cc: 1499, kw: 103, condition: "used", color: "Blanc", price: 25900, currency: "EUR", country: "DE", city: "Köln", status: "draft" },
];

const DESCRIPTION =
  "Annonce de démonstration (fictive) / إعلان تجريبي (وهمي). Les caractéristiques et le prix sont illustratifs. La présence de ce véhicule ne signifie pas qu'il est éligible à l'importation en Algérie.";

async function seed() {
  await reset();

  const customerId = await ensureUser("customer", "زبون تجريبي");
  const adminId = await ensureUser("admin", "Administrateur démo");
  const staffId = await ensureUser("staff", "Agent démo");
  const supplierUsers = await Promise.all([
    ensureUser("supplier1", "Demo Supplier One"),
    ensureUser("supplier2", "Demo Supplier Two"),
    ensureUser("supplier3", "Demo Supplier Three"),
  ]);
  const partnerUsers = await Promise.all([
    ensureUser("partner1", "Demo Partner One"),
    ensureUser("partner2", "Demo Partner Two"),
  ]);
  await ensureUser("applicant", "Demo Applicant");

  await db.from("user_roles").upsert([
    { user_id: adminId, role: "admin" },
    { user_id: staffId, role: "staff" },
  ]);
  await db.from("profiles").update({ phone: "0550 00 00 00", wilaya: "Alger" }).eq("id", customerId);

  const supplierRows = [
    { name: "Démo — Rheinland Autohandel (fictif)", country: "DE", city: "Köln" },
    { name: "Démo — Provence Occasions (fictif)", country: "FR", city: "Marseille" },
    { name: "Démo — Benelux Car Export (fictif)", country: "BE", city: "Antwerpen" },
  ];
  const suppliers = must(
    await db.from("supplier_profiles").insert(
      supplierRows.map((s, i) => ({
        owner_id: supplierUsers[i],
        business_name: s.name,
        country_code: s.country,
        city: s.city,
        contact_name: `Contact démo ${i + 1}`,
        contact_email: demoEmail(`supplier${i + 1}`),
        contact_phone: "+00 000 000 000",
        description:
          "Entreprise fictive créée pour la démonstration de la plateforme. Ce n'est pas une entreprise réelle. / شركة وهمية لأغراض العرض فقط.",
        services_offered: "Vente de véhicules d'occasion, préparation des documents d'exportation (démonstration).",
        status: "approved" as const,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        is_demo: true,
      })),
    ).select("id"),
    "supplier profiles",
  );

  const partners = must(
    await db.from("partner_profiles").insert([
      {
        owner_id: partnerUsers[0], business_name: "Démo — Inspection Auto Europe (fictif)", country_code: "DE", city: "Frankfurt",
        operating_countries: ["DE", "FR", "BE"], contact_name: "Contact démo", contact_email: demoEmail("partner1"),
        contact_phone: "+00 000 000 001", description: "Partenaire fictif d'inspection (démonstration).",
        status: "approved" as const, reviewed_by: adminId, reviewed_at: new Date().toISOString(), is_demo: true,
      },
      {
        owner_id: partnerUsers[1], business_name: "Démo — Méditerranée Shipping (fictif)", country_code: "FR", city: "Marseille",
        operating_countries: ["FR", "ES", "IT"], contact_name: "Contact démo", contact_email: demoEmail("partner2"),
        contact_phone: "+00 000 000 002", description: "Transitaire fictif (démonstration).",
        status: "approved" as const, reviewed_by: adminId, reviewed_at: new Date().toISOString(), is_demo: true,
      },
    ]).select("id"),
    "partner profiles",
  );
  await db.from("partner_service_categories").insert([
    { partner_id: partners[0].id, category_code: "vehicle_inspection" },
    { partner_id: partners[1].id, category_code: "shipping_logistics" },
    { partner_id: partners[1].id, category_code: "insurance" },
  ]);

  const { data: makes } = await db.from("vehicle_makes").select("id, slug");
  const makeId = (slug: string) => {
    const m = makes?.find((x) => x.slug === slug);
    if (!m) throw new Error(`unknown make ${slug}`);
    return m.id;
  };

  const now = Date.now();
  const createdVehicles: { id: string; supplier_id: string }[] = [];
  for (const [i, v] of VEHICLES.entries()) {
    const status = v.status ?? "published";
    const published = status === "published";
    const row = must(
      await db.from("vehicles").insert({
        supplier_id: suppliers[v.supplier].id,
        make_id: makeId(v.make),
        model: v.model,
        trim_level: v.trim,
        body_type: v.body,
        manufacture_year: v.year,
        first_registration_date: v.reg ?? null,
        mileage_km: v.km,
        fuel_type: v.fuel,
        transmission: v.gear,
        engine_cc: v.cc ?? null,
        power_kw: v.kw ?? null,
        condition: v.condition,
        exterior_color: v.color,
        doors: v.body === "coupe" ? 2 : 5,
        seats: 5,
        vin: v.vin ?? null,
        description: DESCRIPTION,
        country_code: v.country,
        city: v.city,
        price_amount: v.price,
        price_currency: v.currency,
        status,
        availability: v.availability ?? "available",
        reviewed_by: published ? adminId : null,
        reviewed_at: published ? new Date(now - i * 86400000).toISOString() : null,
        published_at: published ? new Date(now - i * 86400000).toISOString() : null,
        expires_at: published ? new Date(now + 80 * 86400000).toISOString() : null,
        last_confirmed_at: new Date(now - (v.staleDays ?? i % 5) * 86400000).toISOString(),
        is_demo: true,
      }).select("id, supplier_id").single(),
      `vehicle ${v.make} ${v.model}`,
    );
    createdVehicles.push(row);
    await db.from("vehicle_images").insert([0, 1, 2].map((k) => ({
      vehicle_id: row.id,
      external_url: photo(i + k * 5),
      position: k,
      alt_text: "Photo d'illustration — ce n'est pas le véhicule annoncé",
      credit: "Unsplash (illustration)",
    })));
  }

  // Illustrative exchange rates (NOT official or market rates).
  const today = new Date().toISOString().slice(0, 10);
  const demoSource = "DÉMO — valeur illustrative, ni officielle ni de marché";
  must(await db.from("exchange_rates").insert([
    { base_currency: "EUR", quote_currency: "DZD", rate: 150, source: demoSource, effective_date: today, is_demo: true, recorded_by: adminId },
    { base_currency: "USD", quote_currency: "DZD", rate: 135, source: demoSource, effective_date: today, is_demo: true, recorded_by: adminId },
    { base_currency: "AED", quote_currency: "DZD", rate: 36.8, source: demoSource, effective_date: today, is_demo: true, recorded_by: adminId },
    { base_currency: "CNY", quote_currency: "DZD", rate: 18.6, source: demoSource, effective_date: today, is_demo: true, recorded_by: adminId },
  ]).select("id"), "exchange rates");

  // Illustrative, unverified cost assumptions (demo rule set, activated locally).
  const { data: maxVersion } = await db.from("cost_rule_sets").select("version").order("version", { ascending: false }).limit(1);
  const ruleSet = must(await db.from("cost_rule_sets").insert({
    version: (maxVersion?.[0]?.version ?? 0) + 1,
    title: "DÉMO — hypothèses illustratives non vérifiées",
    status: "draft",
    notes: "Valeurs fictives pour la démonstration. Ne pas utiliser en production.",
    is_demo: true,
    created_by: adminId,
  }).select("id").single(), "rule set");
  const demoRuleSource = "DÉMO — hypothèse illustrative non vérifiée";
  must(await db.from("cost_estimate_rules").insert([
    { rule_set_id: ruleSet.id, code: "domestic_transport", kind: "domestic_transport", label_ar: "النقل الداخلي في بلد المصدر", label_fr: "Transport dans le pays d'origine", method: "fixed", amount: 450, currency: "EUR", source: demoRuleSource, position: 1 },
    { rule_set_id: ruleSet.id, code: "international_shipping", kind: "international_shipping", label_ar: "الشحن الدولي", label_fr: "Transport international", method: "fixed", amount: 1200, currency: "EUR", source: demoRuleSource, position: 2 },
    { rule_set_id: ruleSet.id, code: "insurance", kind: "insurance", label_ar: "التأمين أثناء النقل", label_fr: "Assurance transport", method: "percent_of_price", percent: 1.5, source: demoRuleSource, position: 3 },
    { rule_set_id: ruleSet.id, code: "inspection", kind: "inspection", label_ar: "الفحص التقني (اختياري)", label_fr: "Inspection technique (facultative)", method: "fixed", amount: 180, currency: "EUR", source: demoRuleSource, position: 4 },
    { rule_set_id: ruleSet.id, code: "taxes_and_customs", kind: "taxes_and_customs", label_ar: "الرسوم الجمركية والضرائب", label_fr: "Droits de douane et taxes", method: "quote_required", source: "Évaluation officielle requise", notes_ar: "تحددها الجهات الجمركية المختصة. لا تمثل الحاسبة تقييمًا رسميًا.", notes_fr: "Déterminés par l'administration des douanes. Le calculateur ne constitue pas une liquidation officielle.", position: 5 },
    { rule_set_id: ruleSet.id, code: "documentation_admin", kind: "documentation_admin", label_ar: "الوثائق والمصاريف الإدارية", label_fr: "Documents et frais administratifs", method: "fixed", amount: 250, currency: "EUR", source: demoRuleSource, position: 6 },
    { rule_set_id: ruleSet.id, code: "partner_service_fee", kind: "partner_service_fee", label_ar: "أتعاب الشركاء (تخليص، وكالة…)", label_fr: "Honoraires des partenaires (transit, agence…)", method: "quote_required", source: "Sur devis du partenaire", position: 7 },
  ]).select("id"), "cost rules");
  await db.from("cost_rule_sets").update({ status: "retired" }).eq("status", "active");
  await db.from("cost_rule_sets").update({ status: "active", activated_by: adminId, activated_at: new Date().toISOString() }).eq("id", ruleSet.id);

  console.log("Demo data created.");
  console.log(`Accounts (password: ${DEMO_PASSWORD}):`);
  for (const n of ["admin", "staff", "customer", "supplier1", "supplier2", "supplier3", "partner1", "partner2", "applicant"]) {
    console.log(`  ${demoEmail(n)}`);
  }
  console.log(`${createdVehicles.length} vehicles, ${suppliers.length} suppliers, ${partners.length} partners.`);
}

(args.has("--reset") ? reset() : seed()).catch((err) => {
  console.error(err);
  process.exit(1);
});
