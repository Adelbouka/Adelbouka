import { expect, test } from "@playwright/test";
import { confirmationLink, signIn } from "./helpers";

const stamp = Date.now().toString(36);

test("sign-up validates input in the user's language", async ({ page }) => {
  await page.goto("/fr/auth/sign-up");
  await page.fill("#email", "not-an-email");
  await page.fill("#password", "short");
  await page.fill("#confirmPassword", "other");
  await page.getByRole("button", { name: "Créer un compte" }).click();
  await expect(page.getByText("Adresse e-mail invalide.")).toBeVisible();
  await expect(page.getByText("Le mot de passe doit contenir au moins 8 caractères.")).toBeVisible();
  await expect(page.getByText("Vous devez accepter pour continuer.")).toBeVisible();

  await page.goto("/ar/auth/sign-up");
  await page.getByRole("button", { name: "إنشاء حساب" }).last().click();
  await expect(page.getByText("هذا الحقل إلزامي.").first()).toBeVisible();
});

test("sign-up, e-mail confirmation, sign-out and password recovery", async ({ page }) => {
  const email = `e2e-${stamp}@example.com`;
  await page.goto("/fr/auth/sign-up");
  await page.fill("#fullName", "Test E2E");
  await page.fill("#email", email);
  await page.fill("#password", "Initial123");
  await page.fill("#confirmPassword", "Initial123");
  await page.check("input[name=acceptTerms]");
  await page.getByRole("button", { name: "Créer un compte" }).click();
  await expect(page).toHaveURL(/\/fr\/auth\/check-email/);

  // Cannot sign in before confirming.
  await page.goto("/fr/auth/sign-in");
  await page.fill("#email", email);
  await page.fill("#password", "Initial123");
  await page.locator("form button[type=submit]").click();
  await expect(page.getByText(/confirmer votre adresse e-mail/)).toBeVisible();

  await page.goto(await confirmationLink(email, "Confirmation"));
  await expect(page).toHaveURL(/\/fr\/account/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Test E2E");
  await page.locator("header form button[type=submit]").first().click();
  await expect(page).toHaveURL(/\/fr$/);

  // Password recovery.
  await page.goto("/fr/auth/forgot-password");
  await page.fill("#email", email);
  await page.getByRole("button", { name: "Envoyer le lien" }).click();
  await expect(page).toHaveURL(/check-email\?reason=recovery/);
  await page.goto(await confirmationLink(email, "Réinitialisation"));
  await expect(page).toHaveURL(/\/fr\/auth\/reset-password/);
  await page.fill("#password", "Changed456");
  await page.fill("#confirmPassword", "Changed456");
  await page.getByRole("button", { name: "Enregistrer le mot de passe" }).click();
  await expect(page).toHaveURL(/\/fr\/account\?notice=password_updated/);
  await page.locator("header form button[type=submit]").first().click();

  await signIn(page, email, "Changed456");
});

test("wrong credentials are rejected without revealing which part is wrong", async ({ page }) => {
  await page.goto("/fr/auth/sign-in");
  await page.fill("#email", "customer.demo@example.com");
  await page.fill("#password", "WrongPass1");
  await page.locator("form button[type=submit]").click();
  await expect(page.getByText("E-mail ou mot de passe incorrect.")).toBeVisible();
});

test("private areas redirect to sign-in and are not indexed", async ({ page }) => {
  const res = await page.goto("/fr/admin");
  await expect(page).toHaveURL(/\/fr\/auth\/sign-in\?next=%2Ffr%2Fadmin/);
  expect(res?.status()).toBe(200);
  const robots = await (await page.request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /fr/admin");
});

test("customers cannot open the admin area", async ({ page }) => {
  await signIn(page, "customer.demo@example.com");
  const res = await page.goto("/fr/admin");
  expect(res?.status()).toBe(404);
});
