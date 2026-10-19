export function intlLocale(locale: string): string {
  return locale === "ar" ? "ar-DZ" : "fr-DZ";
}

export function formatMoney(
  amount: number | string | null | undefined,
  currency: string,
  locale: string,
): string {
  if (amount == null || amount === "") return "—";
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "DZD" ? 0 : 2,
    minimumFractionDigits: currency === "DZD" ? 0 : undefined,
  }).format(value);
}

export function formatNumber(value: number | null | undefined, locale: string, digits = 0): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: digits }).format(value);
}

export function formatDate(
  value: string | Date | null | undefined,
  locale: string,
  style: "short" | "medium" | "long" = "long",
): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: style, timeZone: "Africa/Algiers" }).format(date);
}

export function formatDateTime(value: string | Date | null | undefined, locale: string): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(intlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Algiers",
  }).format(date);
}

/** Formats a first-registration date (month precision is what matters to buyers). */
export function formatMonthYear(value: string | null | undefined, locale: string): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(intlLocale(locale), {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

const displayNames = new Map<string, Intl.DisplayNames>();
export function countryName(code: string | null | undefined, locale: string): string {
  if (!code) return "—";
  let dn = displayNames.get(locale);
  if (!dn) {
    dn = new Intl.DisplayNames([locale], { type: "region" });
    displayNames.set(locale, dn);
  }
  try {
    return dn.of(code) ?? code;
  } catch {
    return code;
  }
}

/** Picks the localized column of a bilingual record. */
export function pick<T extends Record<string, unknown>>(row: T, base: string, locale: string): string {
  const value = row[`${base}_${locale === "fr" ? "fr" : "ar"}`];
  return typeof value === "string" ? value : "";
}
