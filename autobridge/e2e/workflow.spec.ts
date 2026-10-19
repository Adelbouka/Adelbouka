import { expect, test } from "@playwright/test";
import { demo, signIn } from "./helpers";

test.describe.configure({ mode: "serial" });

let requestUrl = "";
let reference = "";

test("customer submits a purchase request for a listed vehicle", async ({ page }) => {
  await signIn(page, demo("customer"));
  await page.goto("/fr/vehicles?make=dacia");
  await page.locator("article h3 a").first().click();
  await page.getByRole("link", { name: "Demander un devis" }).first().click();
  await expect(page).toHaveURL(/requests\/new\?vehicle=/);
  await page.getByRole("button", { name: "Envoyer la demande" }).click();
  await expect(page.getByText("Ce champ est obligatoire.").first()).toBeVisible();
  await page.check("input[name=pathwayCode][value=individual_used_vehicle]");
  await page.check("input[name=acknowledge]");
  await page.getByRole("button", { name: "Envoyer la demande" }).click();
  await expect(page).toHaveURL(/account\/requests\/.+created=1/);
  reference = (await page.locator("h1 .ltr-nums").textContent())!.trim();
  requestUrl = page.url().replace(/\?.*$/, "");
  expect(reference).toMatch(/^AB-\d{4}-\d{6}$/);
});

test("staff reviews the request and forwards it to the supplier", async ({ page }) => {
  await signIn(page, demo("staff"));
  await page.goto("/fr/admin/requests");
  await page.getByRole("link", { name: reference }).click();
  await expect(page.getByText("Coordonnées du client")).toBeVisible();
  await page.getByRole("button", { name: "Prendre en charge" }).click();
  await expect(page.getByRole("button", { name: "Transmettre au fournisseur" })).toBeVisible();
  await page.getByRole("button", { name: "Transmettre au fournisseur" }).click();
  await expect(page.locator("h1")).toContainText("Fournisseur contacté");
});

test("the supplier sees the request without customer contact details and sends a quotation", async ({ page }) => {
  await signIn(page, demo("supplier2"));
  await page.goto("/fr/supplier/requests");
  await page.getByRole("link", { name: reference }).click();
  await expect(page.getByText("Customer", { exact: false })).toHaveCount(0);
  await expect(page.getByText("0550 00 00 00")).toHaveCount(0);
  await page.getByLabel("Description").first().fill("Prix du véhicule");
  await page.getByLabel("Montant").first().fill("19500");
  await page.getByRole("button", { name: "Ajouter une ligne" }).click();
  const row = page.locator("form .grid.gap-2.rounded-lg").nth(1);
  await row.getByLabel("Nature").selectOption("taxes_and_customs");
  await row.getByLabel("Description").fill("Droits et taxes estimés");
  await row.getByLabel("Montant").fill("4000");
  await expect(row.getByLabel("Bénéficiaire")).toHaveValue("public_authority");
  await page.getByRole("button", { name: "Soumettre le devis" }).click();
  await expect(page.getByText("Devis soumis.")).toBeVisible();
});

test("staff verifies and sends the quotation, the customer accepts it", async ({ page, browser }) => {
  await signIn(page, demo("staff"));
  await page.goto("/fr/admin/requests");
  await page.getByRole("link", { name: reference }).click();
  await page.getByRole("button", { name: "Vérifier et envoyer au client" }).click();
  await expect(page.locator("h1")).toContainText("En attente de votre décision");

  const customer = await browser.newPage();
  await signIn(customer, demo("customer"));
  await customer.goto(requestUrl);
  await expect(customer.getByText("Un devis vous attend")).toBeVisible();
  await expect(customer.getByText("Droits et taxes (estimation)")).toBeVisible();
  customer.once("dialog", (d) => d.accept());
  await customer.getByRole("button", { name: "Accepter ce devis" }).click();
  await expect(customer.locator("h1")).toContainText("Devis accepté");
  await expect(customer.getByText("Prix du véhicule").first()).toBeVisible();
  await customer.close();

  // Starting work requires the legal review first.
  await page.reload();
  await page.getByRole("button", { name: "Démarrer le traitement" }).click();
  await expect(page.getByText("L'examen juridique doit être approuvé avant de passer à cette étape.")).toBeVisible();
  await page.getByPlaceholder("Base de l'analyse").fill("Parcours vérifié pour ce dossier (test).");
  await page.getByRole("button", { name: "Enregistrer la décision" }).click();
  await expect(page.getByText("Approuvé").first()).toBeVisible();
  await page.getByRole("button", { name: "Démarrer le traitement" }).click();
  await expect(page.locator("h1")).toContainText("En cours");
});
