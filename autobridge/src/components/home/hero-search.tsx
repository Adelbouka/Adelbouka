import { Search } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { countryName } from "@/lib/format";
import { SOURCE_COUNTRIES } from "@/lib/domain/enums";
import { Select } from "@/components/ui/input";
import { buttonClasses } from "@/components/ui/button";

/** Plain GET form: works without JavaScript and produces shareable marketplace URLs. */
export async function HeroSearch({ makes }: { makes: { slug: string; name: string }[] }) {
  const [t, locale] = await Promise.all([getTranslations("home"), getLocale()]);
  const budgets = [2_000_000, 3_000_000, 4_000_000, 5_000_000, 7_000_000, 10_000_000];
  return (
    <form action={`/${locale}/vehicles`} method="get" role="search" aria-label={t("searchLabel")}
      className="grid gap-3 rounded-xl border border-border bg-surface p-3 shadow-[0_10px_30px_rgba(16,24,40,0.08)] sm:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
      <div>
        <label htmlFor="hero-make" className="sr-only">{t("make")}</label>
        <Select id="hero-make" name="make" defaultValue="">
          <option value="">{t("anyMake")}</option>
          {makes.map((m) => <option key={m.slug} value={m.slug}>{m.name}</option>)}
        </Select>
      </div>
      <div>
        <label htmlFor="hero-budget" className="sr-only">{t("budget")}</label>
        <Select id="hero-budget" name="priceMax" defaultValue="">
          <option value="">{t("anyBudget")}</option>
          {budgets.map((b) => (
            <option key={b} value={b}>{t("budgetUpTo", { amount: new Intl.NumberFormat(locale === "ar" ? "ar-DZ" : "fr-DZ").format(b) })}</option>
          ))}
        </Select>
      </div>
      <div>
        <label htmlFor="hero-country" className="sr-only">{t("country")}</label>
        <Select id="hero-country" name="country" defaultValue="">
          <option value="">{t("anyCountry")}</option>
          {SOURCE_COUNTRIES.map((c) => <option key={c} value={c}>{countryName(c, locale)}</option>)}
        </Select>
      </div>
      <button type="submit" className={buttonClasses("primary", "md", "h-10")}>
        <Search className="size-4" aria-hidden="true" />{t("searchButton")}
      </button>
    </form>
  );
}
