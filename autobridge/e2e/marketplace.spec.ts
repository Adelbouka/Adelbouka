import { expect, test } from "@playwright/test";

test("filters narrow the marketplace and can be cleared", async ({ page }) => {
  await page.goto("/fr/vehicles");
  const all = await page.locator("article").count();
  expect(all).toBeGreaterThan(3);
  const filters = page.locator("aside .lg\\:block form");
  await filters.locator("#f-make").selectOption("renault");
  await filters.getByRole("button", { name: "Appliquer" }).click();
  await expect(page).toHaveURL(/make=renault/);
  const titles = await page.locator("article h3").allTextContents();
  expect(titles.length).toBeGreaterThan(0);
  for (const t of titles) expect(t).toContain("Renault");
  await page.getByRole("link", { name: "Effacer les filtres" }).first().click();
  await expect(page).toHaveURL(/\/fr\/vehicles$/);
  await expect(page.locator("article")).toHaveCount(all);
});

test("an impossible combination shows the empty state", async ({ page }) => {
  await page.goto("/fr/vehicles?make=tesla&fuel=diesel");
  await expect(page.getByText("Aucun véhicule ne correspond à vos critères")).toBeVisible();
  await expect(page.getByRole("link", { name: "Demande personnalisée" })).toBeVisible();
});

test("sorting by price orders the results", async ({ page }) => {
  await page.goto("/fr/vehicles?sort=price_asc");
  const prices = await page.locator("article .text-lg").allTextContents();
  const values = prices.map((p) => Number(p.replace(/[^\d,]/g, "").replace(",", ".")));
  expect(values).toEqual([...values].sort((a, b) => a - b));
});

test("vehicle details distinguish manufacturing year, registration and eligibility", async ({ page }) => {
  await page.goto("/fr/vehicles?make=volkswagen");
  await page.locator("article h3 a").first().click();
  await expect(page.getByText("Année de fabrication", { exact: true })).toBeVisible();
  await expect(page.getByText("Première immatriculation", { exact: true })).toBeVisible();
  await expect(page.getByText("Éligibilité à l'importation non garantie")).toBeVisible();
  // Demonstration data is always labelled.
  await expect(page.getByText(/Annonce de démonstration fictive/)).toBeVisible();
  // Demo suppliers are never presented as verified.
  await expect(page.getByText("Fournisseur de démonstration fictif : aucun contrôle réel.")).toBeVisible();
  // The cost estimator is pre-filled and recalculates.
  const total = page.getByTestId("estimate-total");
  const before = await total.textContent();
  await page.fill("#calc-price", "30000");
  await expect(total).not.toHaveText(before!);
  await expect(page.getByText(/ne sont pas inclus de façon fiable/)).toBeVisible();
});

test("unpublished listings are not reachable", async ({ page }) => {
  // The demo seed creates a pending Peugeot 3008 and a draft BMW.
  await page.goto("/fr/vehicles?q=3008");
  await expect(page.locator("article")).toHaveCount(0);
  const res = await page.goto("/fr/vehicles/bmw-serie-1-2022-999999");
  expect(res?.status()).toBe(404);
});
