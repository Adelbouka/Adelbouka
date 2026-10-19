import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing, type Locale } from "./routing";

/** Reads and validates the [locale] route param and enables static rendering hints. */
export async function resolveLocale(params: Promise<{ locale: string }>): Promise<Locale> {
  const { locale } = await params;
  const value = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
  setRequestLocale(value);
  return value;
}
