import { Clock, Fuel, Gauge, MapPin, ShieldCheck, Settings2 } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { countryName, formatMoney, formatNumber } from "@/lib/format";
import { vehicleImageUrl } from "@/lib/images";
import type { MarketplaceCard } from "@/lib/queries/marketplace";
import { Badge } from "@/components/ui/badge";
import { VehicleImage } from "./vehicle-image";

export async function VehicleCard({ vehicle, preload }: { vehicle: MarketplaceCard; preload?: boolean }) {
  const [t, te, tc, locale] = await Promise.all([
    getTranslations("vehicles"), getTranslations("enums"), getTranslations("common"), getLocale(),
  ]);
  const title = `${vehicle.make_name} ${vehicle.model}`;
  const isDemo = vehicle.is_demo || vehicle.supplier_is_demo;
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-shadow hover:shadow-[0_8px_24px_rgba(16,24,40,0.08)]">
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-muted">
        <VehicleImage
          src={vehicleImageUrl(vehicle.cover_image)}
          alt={isDemo ? tc("illustrativePhoto") : title}
          sizes="(min-width: 1280px) 400px, (min-width: 640px) 50vw, 100vw"
          preload={preload}
          className="transition-transform duration-300 group-hover:scale-[1.02]"
        />
        <div className="absolute inset-x-3 top-3 flex flex-wrap gap-1.5">
          {vehicle.is_sponsored ? <Badge tone="accent" className="bg-surface/95">{tc("sponsored")}</Badge> : null}
          {isDemo ? <Badge tone="warning" className="bg-surface/95">{tc("demo")}</Badge> : null}
          {vehicle.availability && vehicle.availability !== "available" ? (
            <Badge tone="neutral" className="bg-surface/95">{te(`availability.${vehicle.availability}`)}</Badge>
          ) : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold">
              <Link href={`/vehicles/${vehicle.slug}`} className="after:absolute after:inset-0 focus:outline-none">
                {title}
              </Link>
            </h3>
            <p className="truncate text-sm text-muted-foreground">{vehicle.trim_level ?? " "}</p>
          </div>
          <span className="shrink-0 rounded-md bg-surface-muted px-2 py-0.5 text-sm font-medium ltr-nums">{vehicle.manufacture_year}</span>
        </div>
        <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[13px] text-muted-foreground">
          <li className="flex items-center gap-1.5"><Gauge className="size-3.5" aria-hidden="true" /><span className="ltr-nums">{formatNumber(vehicle.mileage_km, locale)} km</span></li>
          <li className="flex items-center gap-1.5"><Fuel className="size-3.5" aria-hidden="true" />{vehicle.fuel_type ? te(`fuel.${vehicle.fuel_type}`) : "—"}</li>
          <li className="flex items-center gap-1.5"><Settings2 className="size-3.5" aria-hidden="true" />{vehicle.transmission ? te(`transmission.${vehicle.transmission}`) : "—"}</li>
          <li className="flex items-center gap-1.5 truncate"><MapPin className="size-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{countryName(vehicle.country_code, locale)}</span></li>
        </ul>
        <div className="mt-4 flex items-end justify-between gap-3 border-t border-border pt-3">
          <div>
            <div className="text-lg font-semibold ltr-nums">{formatMoney(vehicle.price_amount, vehicle.price_currency ?? "EUR", locale)}</div>
            <div className="text-xs text-muted-foreground">
              {vehicle.price_dzd != null && vehicle.price_currency !== "DZD"
                ? t("approxDzd", { amount: formatMoney(vehicle.price_dzd, "DZD", locale) })
                : t("supplierPrice")}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {vehicle.supplier_has_verified_checks && !isDemo ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-success"><ShieldCheck className="size-3.5" aria-hidden="true" />{t("supplierChecked")}</span>
            ) : null}
            {vehicle.is_stale ? (
              <span className="inline-flex items-center gap-1 text-xs text-warning"><Clock className="size-3.5" aria-hidden="true" />{t("availabilityUnconfirmed")}</span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
