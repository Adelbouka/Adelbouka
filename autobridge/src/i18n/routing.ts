import { defineRouting } from "next-intl/routing";

export const locales = ["ar", "fr"] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "ar",
  localePrefix: "always",
});

export function localeDirection(locale: string): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}
