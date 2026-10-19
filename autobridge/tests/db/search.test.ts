import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { searchMarketplace } from "../../src/lib/queries/marketplace";
import { parseFilters } from "../../src/lib/marketplace-filters";
import { anon, approvedSupplier, cleanup, grantRole, makeId, makeUser, RUN, service, type TestUser } from "./helpers";

// Each test vehicle carries a unique model tag so results are isolated from other data.
const TAG = `Srch${RUN}`;
let ids: Record<string, string> = {};

async function addVehicle(supplier: TestUser, supplierId: string, staff: TestUser, key: string, over: Record<string, unknown>) {
  const { data, error } = await supplier.client.from("vehicles").insert({
    supplier_id: supplierId, make_id: await makeId(String(over.make ?? "volkswagen")), model: `${TAG} ${key}`,
    manufacture_year: 2021, mileage_km: 40000, fuel_type: "petrol", transmission: "manual", condition: "used",
    country_code: "DE", city: "Berlin", price_amount: 20000, price_currency: "EUR", body_type: "hatchback",
    status: "pending_review", ...Object.fromEntries(Object.entries(over).filter(([k]) => k !== "make")),
  }).select("id").single();
  if (error || !data) throw error;
  await staff.client.rpc("admin_review_vehicle", { p_vehicle_id: data.id, p_decision: "approve" });
  ids[key] = data.id;
}

beforeAll(async () => {
  const [supplier, staff] = await Promise.all([makeUser("searchsup"), makeUser("searchstaff")]);
  await grantRole(staff, "staff");
  const sid = await approvedSupplier(supplier, "Search Supplier");
  ids = {};
  await addVehicle(supplier, sid, staff, "golf", { make: "volkswagen", manufacture_year: 2023, mileage_km: 15000, price_amount: 24000, fuel_type: "hybrid", transmission: "automatic", engine_cc: 1400, first_registration_date: "2023-04-01" });
  await addVehicle(supplier, sid, staff, "clio", { make: "renault", manufacture_year: 2019, mileage_km: 90000, price_amount: 9000, country_code: "FR", city: "Lyon", engine_cc: 999 });
  await addVehicle(supplier, sid, staff, "tucson", { make: "hyundai", manufacture_year: 2024, mileage_km: 0, price_amount: 39000, fuel_type: "diesel", condition: "new", country_code: "BE", city: "Antwerpen", engine_cc: 1998 });
  await addVehicle(supplier, sid, staff, "sold", { make: "volkswagen", manufacture_year: 2020, price_amount: 15000, availability: "sold" });
  // A draft that must never appear.
  await supplier.client.from("vehicles").insert({
    supplier_id: sid, make_id: await makeId("volkswagen"), model: `${TAG} draft`, manufacture_year: 2022, mileage_km: 1,
    fuel_type: "petrol", transmission: "manual", condition: "used", country_code: "DE", city: "Berlin", price_amount: 1, price_currency: "EUR",
  });
  // A documented rate so DZD price filters can work for this test.
  await service.from("exchange_rates").insert({ base_currency: "EUR", quote_currency: "DZD", rate: 150, source: `test ${RUN}`, effective_date: "2000-01-01", is_demo: true });
});

afterAll(async () => {
  await service.from("exchange_rates").delete().eq("source", `test ${RUN}`);
  await cleanup();
});

const run = async (params: Record<string, string>) => {
  const { vehicles, total, error } = await searchMarketplace(anon(), parseFilters({ q: TAG, ...params }), 50);
  expect(error).toBeNull();
  return { models: vehicles.map((v) => v.model!.replace(`${TAG} `, "")).sort(), total, vehicles };
};

describe("marketplace search and filters", () => {
  it("returns only published, available listings by default", async () => {
    expect((await run({})).models).toEqual(["clio", "golf", "tucson"]);
  });
  it("includes sold listings when availability is 'any'", async () => {
    expect((await run({ availability: "any" })).models).toEqual(["clio", "golf", "sold", "tucson"]);
    expect((await run({ availability: "sold" })).models).toEqual(["sold"]);
  });
  it("filters by make, country, fuel, transmission and condition", async () => {
    expect((await run({ make: "volkswagen" })).models).toEqual(["golf"]);
    expect((await run({ country: "FR" })).models).toEqual(["clio"]);
    expect((await run({ fuel: "diesel" })).models).toEqual(["tucson"]);
    expect((await run({ transmission: "automatic" })).models).toEqual(["golf"]);
    expect((await run({ condition: "new" })).models).toEqual(["tucson"]);
  });
  it("filters by year, first registration, mileage and engine capacity", async () => {
    expect((await run({ yearMin: "2023" })).models).toEqual(["golf", "tucson"]);
    expect((await run({ yearMax: "2020" })).models).toEqual(["clio"]);
    expect((await run({ regYearMin: "2023" })).models).toEqual(["golf"]);
    expect((await run({ mileageMax: "50000" })).models).toEqual(["golf", "tucson"]);
    expect((await run({ engineMin: "1000", engineMax: "1500" })).models).toEqual(["golf"]);
  });
  it("filters and sorts by indicative DZD price", async () => {
    // Uses the newest effective rate available (the demo seed or this test's rate).
    const { vehicles } = await run({ sort: "price_asc" });
    expect(vehicles.map((v) => v.model!.replace(`${TAG} `, ""))).toEqual(["clio", "golf", "tucson"]);
    const rate = Number(vehicles[0].price_dzd) / 9000;
    expect((await run({ priceMax: String(Math.round(25000 * rate)) })).models).toEqual(["clio", "golf"]);
    expect((await run({ priceMin: String(Math.round(30000 * rate)) })).models).toEqual(["tucson"]);
  });
  it("sorts by year and mileage", async () => {
    const byYear = await searchMarketplace(anon(), parseFilters({ q: TAG, sort: "year_desc" }), 50);
    expect(byYear.vehicles.map((v) => v.manufacture_year)).toEqual([2024, 2023, 2019]);
    const byKm = await searchMarketplace(anon(), parseFilters({ q: TAG, sort: "mileage_asc" }), 50);
    expect(byKm.vehicles.map((v) => v.mileage_km)).toEqual([0, 15000, 90000]);
  });
  it("matches keywords against make, model and city, and paginates", async () => {
    expect((await run({ q: `${TAG} lyon` })).total).toBe(0); // all words must appear contiguously
    expect((await searchMarketplace(anon(), parseFilters({ q: "antwerpen" }), 50)).vehicles.map((v) => v.id)).toContain(ids.tucson);
    const page1 = await searchMarketplace(anon(), parseFilters({ q: TAG }), 2);
    const page2 = await searchMarketplace(anon(), parseFilters({ q: TAG, page: "2" }), 2);
    expect(page1.total).toBe(3);
    expect(page1.vehicles).toHaveLength(2);
    expect(page2.vehicles).toHaveLength(1);
    expect(new Set([...page1.vehicles, ...page2.vehicles].map((v) => v.id)).size).toBe(3);
  });
  it("treats special characters in keywords literally", async () => {
    expect((await searchMarketplace(anon(), parseFilters({ q: "%" }), 50)).total).toBe(0);
  });
});
