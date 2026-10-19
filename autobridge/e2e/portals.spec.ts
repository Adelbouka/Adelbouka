import { expect, test } from "@playwright/test";
import { demo, signIn } from "./helpers";

test.describe.configure({ mode: "serial" });

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF");
const model = `E2E-${Date.now().toString(36)}`;

test("a supplier creates a listing with photos and submits it for review", async ({ page }) => {
  await signIn(page, demo("supplier1"));
  await page.goto("/fr/supplier/vehicles/new");
  await page.getByRole("button", { name: "Enregistrer le brouillon" }).click();
  await expect(page.getByText("Ce champ est obligatoire.").first()).toBeVisible();

  await page.selectOption("#makeId", { label: "Kia" });
  await page.fill("#model", model);
  await page.fill("#manufactureYear", "2022");
  await page.fill("#firstRegistrationDate", "2019-01-01");
  await page.fill("#mileageKm", "42000");
  await page.fill("#priceAmount", "18900");
  await page.fill("#vin", "INVALIDVIN");
  await page.getByRole("button", { name: "Enregistrer le brouillon" }).click();
  await expect(page.getByText(/ne peut pas précéder l'année de fabrication/)).toBeVisible();
  await expect(page.getByText(/17 caractères/).first()).toBeVisible();
  await page.fill("#firstRegistrationDate", "2022-03-01");
  await page.fill("#vin", "KNAPN81ABN7123456");
  await page.getByRole("button", { name: "Enregistrer le brouillon" }).click();
  await expect(page).toHaveURL(/supplier\/vehicles\/[0-9a-f-]{36}\?created=1/);

  await page.setInputFiles("input[type=file]", [{ name: "front.png", mimeType: "image/png", buffer: PNG }]);
  await page.getByRole("button", { name: "Ajouter les photos" }).click();
  await expect(page.getByText("Couverture")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ajouter les photos" })).toBeEnabled();
  // Unsupported file types are refused before upload.
  await page.setInputFiles("input[type=file]", [{ name: "doc.pdf", mimeType: "application/pdf", buffer: PDF }]);
  await page.getByRole("button", { name: "Ajouter les photos" }).click();
  await expect(page.getByText("Type de fichier non autorisé.")).toBeVisible();

  await page.getByRole("button", { name: "Enregistrer et soumettre à l'examen" }).click();
  await expect(page.getByText("En cours d'examen").first()).toBeVisible();
});

test("staff approves the listing and it becomes public", async ({ page }) => {
  await signIn(page, demo("staff"));
  await page.goto("/fr/admin/vehicles");
  await page.getByRole("link", { name: new RegExp(model) }).click();
  await page.getByRole("button", { name: "Approuver et publier" }).click();
  await expect(page.getByText("Publiée").first()).toBeVisible();
  await page.goto(`/fr/vehicles?q=${encodeURIComponent(model.toLowerCase())}`);
  await expect(page.locator("article")).toHaveCount(1);
  await page.locator("article h3 a").click();
  await expect(page.getByText(/•+23456/)).toBeVisible();
});

test("a supplier uploads a private verification document", async ({ page }) => {
  await signIn(page, demo("supplier1"));
  await page.goto("/fr/supplier/documents");
  await page.setInputFiles("#doc-file", [{ name: "registre.pdf", mimeType: "application/pdf", buffer: PDF }]);
  await page.getByRole("button", { name: "Envoyer le document" }).click();
  await expect(page.getByText("Document enregistré.")).toBeVisible();
  await expect(page.getByText("registre.pdf")).toBeVisible();
});

test("an applicant applies as a partner and an administrator approves", async ({ page, browser }) => {
  await signIn(page, demo("applicant"));
  await page.goto("/fr/partner/apply");
  await page.fill("#businessName", "Inspection Test SARL");
  await page.selectOption("#countryCode", "FR");
  await page.fill("#city", "Lyon");
  await page.fill("#contactPhone", "+33 4 00 00 00 00");
  await page.getByRole("button", { name: "Envoyer ma demande" }).click();
  await expect(page.getByText("Ajoutez au moins une ligne.")).toBeVisible();
  // The user's input survives the failed submission.
  await expect(page.locator("#countryCode")).toHaveValue("FR");
  await expect(page.locator("#city")).toHaveValue("Lyon");
  await page.getByLabel("Inspection de véhicules").check();
  await page.getByRole("button", { name: "Envoyer ma demande" }).click();
  await expect(page).toHaveURL(/\/fr\/partner\?applied=1/);
  await expect(page.getByText("En attente d'examen").first()).toBeVisible();

  const admin = await browser.newPage();
  await signIn(admin, demo("admin"));
  await admin.goto("/fr/admin/partners");
  await admin.getByRole("link", { name: "Inspection Test SARL" }).click();
  await admin.getByRole("button", { name: "Approuver" }).click();
  await expect(admin.getByText("Approuvé").first()).toBeVisible();
  await admin.close();

  await page.reload();
  await expect(page.getByText("Approuvé").first()).toBeVisible();
});
