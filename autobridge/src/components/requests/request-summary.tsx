import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatMoney, formatNumber } from "@/lib/format";
import type { FuelType, Transmission } from "@/lib/domain/enums";
import { snapshotTitle, type VehicleSnapshot } from "@/lib/domain/snapshot";
import { DefinitionList } from "@/components/ui/misc";

export type RequestSummaryData = {
  request_type: string;
  vehicle?: VehicleSnapshot | null;
  desired_make?: string | null;
  desired_model: string | null;
  year_min: number | null;
  year_max: number | null;
  max_mileage_km: number | null;
  desired_fuel: FuelType | null;
  desired_transmission: Transmission | null;
  preferences: string | null;
  budget_amount: number | null;
  budget_currency: string;
  pathway_name: string | null;
  wilaya: string;
  message: string | null;
};

export async function RequestSummary({ r }: { r: RequestSummaryData }) {
  const [t, te, locale] = await Promise.all([getTranslations("requests"), getTranslations("enums"), getLocale()]);
  const items = [
    r.vehicle
      ? { label: t("vehicle"), value: <Link href={`/vehicles/${r.vehicle.slug}`} className="text-primary hover:underline">{snapshotTitle(r.vehicle)}</Link>, hint: r.vehicle.price_amount != null && r.vehicle.price_currency ? t("priceAtRequest", { price: formatMoney(r.vehicle.price_amount, r.vehicle.price_currency, locale) }) : undefined }
      : { label: t("searchCriteria"), value: [r.desired_make, r.desired_model].filter(Boolean).join(" ") || "—" },
    ...(r.vehicle ? [] : [
      { label: t("years"), value: <span className="ltr-nums">{r.year_min ?? "…"} – {r.year_max ?? "…"}</span> },
      { label: t("maxMileage"), value: r.max_mileage_km != null ? `${formatNumber(r.max_mileage_km, locale)} km` : "—" },
      { label: t("fuel"), value: r.desired_fuel ? te(`fuel.${r.desired_fuel}`) : t("noPreference") },
      { label: t("transmission"), value: r.desired_transmission ? te(`transmission.${r.desired_transmission}`) : t("noPreference") },
    ]),
    { label: t("budget"), value: r.budget_amount != null ? <span className="ltr-nums">{formatMoney(r.budget_amount, r.budget_currency, locale)}</span> : "—" },
    { label: t("pathway"), value: r.pathway_name ?? "—" },
    { label: t("wilaya"), value: r.wilaya },
  ];
  return (
    <div className="space-y-3">
      <DefinitionList items={items} />
      {r.preferences ? <p className="text-sm"><span className="font-medium">{t("preferences")}: </span><span className="text-muted-foreground">{r.preferences}</span></p> : null}
      {r.message ? <p className="text-sm"><span className="font-medium">{t("message")}: </span><span className="text-muted-foreground">{r.message}</span></p> : null}
    </div>
  );
}
