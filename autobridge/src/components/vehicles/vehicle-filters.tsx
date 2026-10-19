import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { countryName } from "@/lib/format";
import { AVAILABILITIES, CONDITIONS, FUEL_TYPES, SOURCE_COUNTRIES, TRANSMISSIONS } from "@/lib/domain/enums";
import { SORTS, type MarketplaceFilters } from "@/lib/marketplace-filters";
import { Checkbox, Input, Select } from "@/components/ui/input";
import { buttonClasses } from "@/components/ui/button";

export async function VehicleFilters({ filters, makes }: {
  filters: MarketplaceFilters; makes: { slug: string; name: string }[];
}) {
  const [t, te, locale] = await Promise.all([getTranslations("vehicles"), getTranslations("enums"), getLocale()]);
  const year = new Date().getFullYear();
  const years = Array.from({ length: 30 }, (_, i) => year + 1 - i);
  const num = (v: number | undefined) => (v === undefined ? "" : String(v));
  const field = "space-y-1.5";
  const lbl = "block text-xs font-medium text-muted-foreground";

  return (
    <form action={`/${locale}/vehicles`} method="get" className="space-y-4" aria-label={t("filters")}>
      <div className={field}>
        <label htmlFor="f-q" className={lbl}>{t("keyword")}</label>
        <Input id="f-q" name="q" type="search" defaultValue={filters.q ?? ""} placeholder={t("keywordPlaceholder")} maxLength={80} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className={field}>
          <label htmlFor="f-make" className={lbl}>{t("make")}</label>
          <Select id="f-make" name="make" defaultValue={filters.make ?? ""}>
            <option value="">{t("anyMake")}</option>
            {makes.map((m) => <option key={m.slug} value={m.slug}>{m.name}</option>)}
          </Select>
        </div>
        <div className={field}>
          <label htmlFor="f-model" className={lbl}>{t("model")}</label>
          <Input id="f-model" name="model" defaultValue={filters.model ?? ""} maxLength={60} />
        </div>
        <div className={field}>
          <label htmlFor="f-ymin" className={lbl}>{t("yearFrom")}</label>
          <Select id="f-ymin" name="yearMin" defaultValue={num(filters.yearMin)}>
            <option value="">{t("any")}</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </Select>
        </div>
        <div className={field}>
          <label htmlFor="f-ymax" className={lbl}>{t("yearTo")}</label>
          <Select id="f-ymax" name="yearMax" defaultValue={num(filters.yearMax)}>
            <option value="">{t("any")}</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </Select>
        </div>
      </div>
      <div className={field}>
        <label htmlFor="f-reg" className={lbl}>{t("registeredFrom")}</label>
        <Select id="f-reg" name="regYearMin" defaultValue={num(filters.regYearMin)}>
          <option value="">{t("any")}</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </Select>
      </div>
      <div>
        <div className="grid grid-cols-2 gap-3">
          <div className={field}>
            <label htmlFor="f-pmin" className={lbl}>{t("priceMin")}</label>
            <Input id="f-pmin" name="priceMin" inputMode="numeric" dir="ltr" defaultValue={num(filters.priceMin)} />
          </div>
          <div className={field}>
            <label htmlFor="f-pmax" className={lbl}>{t("priceMax")}</label>
            <Input id="f-pmax" name="priceMax" inputMode="numeric" dir="ltr" defaultValue={num(filters.priceMax)} />
          </div>
        </div>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{t("priceFilterHint")}</p>
      </div>
      <div className={field}>
        <label htmlFor="f-country" className={lbl}>{t("country")}</label>
        <Select id="f-country" name="country" defaultValue={filters.country ?? ""}>
          <option value="">{t("anyCountry")}</option>
          {SOURCE_COUNTRIES.map((c) => <option key={c} value={c}>{countryName(c, locale)}</option>)}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className={field}>
          <label htmlFor="f-fuel" className={lbl}>{t("fuel")}</label>
          <Select id="f-fuel" name="fuel" defaultValue={filters.fuel ?? ""}>
            <option value="">{t("any")}</option>
            {FUEL_TYPES.map((f) => <option key={f} value={f}>{te(`fuel.${f}`)}</option>)}
          </Select>
        </div>
        <div className={field}>
          <label htmlFor="f-trans" className={lbl}>{t("transmission")}</label>
          <Select id="f-trans" name="transmission" defaultValue={filters.transmission ?? ""}>
            <option value="">{t("any")}</option>
            {TRANSMISSIONS.map((x) => <option key={x} value={x}>{te(`transmission.${x}`)}</option>)}
          </Select>
        </div>
        <div className={field}>
          <label htmlFor="f-km" className={lbl}>{t("mileageMax")}</label>
          <Select id="f-km" name="mileageMax" defaultValue={num(filters.mileageMax)}>
            <option value="">{t("any")}</option>
            {[10000, 30000, 50000, 75000, 100000, 150000].map((k) => <option key={k} value={k}>{new Intl.NumberFormat(locale === "ar" ? "ar-DZ" : "fr-DZ").format(k)} km</option>)}
          </Select>
        </div>
        <div className={field}>
          <label htmlFor="f-cond" className={lbl}>{t("condition")}</label>
          <Select id="f-cond" name="condition" defaultValue={filters.condition ?? ""}>
            <option value="">{t("any")}</option>
            {CONDITIONS.map((c) => <option key={c} value={c}>{te(`condition.${c}`)}</option>)}
          </Select>
        </div>
        <div className={field}>
          <label htmlFor="f-emin" className={lbl}>{t("engineMin")}</label>
          <Input id="f-emin" name="engineMin" inputMode="numeric" dir="ltr" defaultValue={num(filters.engineMin)} />
        </div>
        <div className={field}>
          <label htmlFor="f-emax" className={lbl}>{t("engineMax")}</label>
          <Input id="f-emax" name="engineMax" inputMode="numeric" dir="ltr" defaultValue={num(filters.engineMax)} />
        </div>
      </div>
      <div className={field}>
        <label htmlFor="f-avail" className={lbl}>{t("availability")}</label>
        <Select id="f-avail" name="availability" defaultValue={filters.availability}>
          {AVAILABILITIES.map((a) => <option key={a} value={a}>{te(`availability.${a}`)}</option>)}
          <option value="any">{t("availabilityAny")}</option>
        </Select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox name="verified" value="1" defaultChecked={filters.verified} />
        {t("verifiedOnly")}
      </label>
      <div className={field}>
        <label htmlFor="f-sort" className={lbl}>{t("sortBy")}</label>
        <Select id="f-sort" name="sort" defaultValue={filters.sort}>
          {SORTS.map((s) => <option key={s} value={s}>{te(`sort.${s}`)}</option>)}
        </Select>
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" className={buttonClasses("primary", "md", "flex-1")}>{t("applyFilters")}</button>
        <Link href="/vehicles" className={buttonClasses("secondary", "md")}>{t("clearFilters")}</Link>
      </div>
    </form>
  );
}
