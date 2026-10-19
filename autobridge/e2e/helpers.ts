import { expect, type Page } from "@playwright/test";

export const DEMO_PASSWORD = "DemoPass2026";
export const demo = (name: string) => `${name}.demo@example.com`;
const MAILPIT = "http://127.0.0.1:54324";

export async function signIn(page: Page, email: string, password = DEMO_PASSWORD, locale = "fr") {
  await page.goto(`/${locale}/auth/sign-in`);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.locator("form button[type=submit]").click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/account`));
}

export async function signOut(page: Page) {
  await page.locator("header form button[type=submit]").first().click();
  await expect(page).toHaveURL(/\/(ar|fr)$/);
}

/** Waits for an e-mail in the local Mailpit inbox and returns the first link to /auth/confirm. */
export async function confirmationLink(to: string, subjectPart: string): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    const body = (await res.json()) as { messages: { ID: string; Subject: string }[] };
    const msg = body.messages.find((m) => m.Subject.includes(subjectPart));
    if (msg) {
      const full = (await (await fetch(`${MAILPIT}/api/v1/message/${msg.ID}`)).json()) as { HTML: string };
      const match = full.HTML.match(/href="([^"]*\/auth\/confirm[^"]*)"/);
      if (!match) throw new Error("no confirmation link in e-mail");
      return match[1].replace(/&amp;/g, "&");
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`no e-mail for ${to}`);
}

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}
