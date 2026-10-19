import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow } from "./helpers";

test("Arabic is the default language and renders right-to-left", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/ar$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("اعثر على سيارتك");
  // In RTL the logo sits at the right edge of the header.
  const logo = await page.getByRole("link", { name: /AutoBridge DZ/ }).first().boundingBox();
  const width = page.viewportSize()!.width;
  expect(logo!.x + logo!.width).toBeGreaterThan(width / 2);
});

test("French renders left-to-right", async ({ page }) => {
  await page.goto("/fr");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Trouvez votre véhicule");
  const logo = await page.getByRole("link", { name: /AutoBridge DZ/ }).first().boundingBox();
  expect(logo!.x).toBeLessThan(page.viewportSize()!.width / 2);
});

test("the language switcher keeps the current page and filters", async ({ page }) => {
  await page.goto("/ar/vehicles?make=renault");
  await page.getByRole("link", { name: "Français" }).first().click();
  await expect(page).toHaveURL(/\/fr\/vehicles\?make=renault/);
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await page.getByRole("link", { name: "العربية" }).first().click();
  await expect(page).toHaveURL(/\/ar\/vehicles\?make=renault/);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});

test("numbers and prices use Latin digits in both languages", async ({ page }) => {
  await page.goto("/ar/vehicles");
  const price = await page.locator("article").first().locator(".text-lg").textContent();
  expect(price).toMatch(/[0-9]/);
  expect(price).not.toMatch(/[٠-٩]/);
});

for (const locale of ["ar", "fr"]) {
  test.describe(`${locale} mobile layout`, () => {
    test.use({ viewport: { width: 375, height: 800 } });
    for (const path of ["", "/vehicles", "/estimate", "/partners", "/contact", "/auth/sign-up", "/legal/terms"]) {
      test(`no horizontal overflow on /${locale}${path}`, async ({ page }) => {
        await page.goto(`/${locale}${path}`);
        await expectNoHorizontalOverflow(page);
      });
    }
    test(`no horizontal overflow on a vehicle page (${locale})`, async ({ page }) => {
      await page.goto(`/${locale}/vehicles`);
      await page.locator("article h3 a").first().click();
      await expect(page).toHaveURL(/\/vehicles\/.+/);
      await expectNoHorizontalOverflow(page);
    });
  });
}
