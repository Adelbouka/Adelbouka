import { expect, test } from "@playwright/test";
import { demo, signIn } from "./helpers";

/** Every portal page renders for its role without server or client errors. */
const ROLE_PAGES: Record<string, string[]> = {
  customer: ["/account", "/account/requests", "/account/favorites", "/account/estimates", "/account/notifications", "/account/profile", "/account/privacy", "/requests/new", "/estimate"],
  supplier1: ["/supplier", "/supplier/vehicles", "/supplier/vehicles/new", "/supplier/requests", "/supplier/quotations", "/supplier/profile", "/supplier/documents"],
  partner1: ["/partner", "/partner/services", "/partner/profile", "/partner/documents"],
  applicant: ["/supplier/apply", "/partner/apply"],
  admin: ["/admin", "/admin/requests", "/admin/vehicles", "/admin/vehicles?status=all", "/admin/suppliers?status=all", "/admin/partners?status=all", "/admin/reports", "/admin/costs", "/admin/pathways", "/admin/content", "/admin/users", "/admin/audit"],
};

for (const [role, paths] of Object.entries(ROLE_PAGES)) {
  for (const locale of ["fr", "ar"]) {
    test(`${role} pages render (${locale})`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await signIn(page, demo(role), undefined, locale);
      for (const path of paths) {
        const res = await page.goto(`/${locale}${path}`);
        expect(res?.status(), path).toBeLessThan(400);
        await expect(page.locator("h1").first(), path).toBeVisible();
        await expect(page.getByText(/Une erreur est survenue|حدث خطأ/), path).toHaveCount(0);
      }
      // Detail pages reachable from the lists.
      if (role === "admin") {
        for (const list of ["/admin/vehicles?status=all", "/admin/suppliers?status=all", "/admin/partners?status=all"]) {
          await page.goto(`/${locale}${list}`);
          await page.locator("table tbody a").first().click();
          await expect(page.locator("h1").first()).toBeVisible();
          await expect(page.getByText(/Une erreur est survenue|حدث خطأ/)).toHaveCount(0);
        }
      }
      if (role === "supplier1") {
        await page.goto(`/${locale}/supplier/vehicles`);
        await page.locator("table tbody a").first().click();
        await expect(page.locator("h1").first()).toBeVisible();
      }
      expect(errors).toEqual([]);
    });
  }
}
