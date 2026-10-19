import type { Locale } from "./routing";

export const NAMESPACES = [
  "meta", "common", "nav", "footer", "auth", "validation", "errors", "enums",
  "home", "vehicles", "estimate", "requests", "account", "supplier", "partner", "admin", "pages",
] as const;

export async function loadMessages(locale: Locale) {
  const entries = await Promise.all(
    NAMESPACES.map(async (ns) => [ns, (await import(`../../messages/${locale}/${ns}.json`)).default] as const),
  );
  return Object.fromEntries(entries);
}
