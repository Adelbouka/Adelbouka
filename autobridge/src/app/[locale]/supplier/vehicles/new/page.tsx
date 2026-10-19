import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { requireViewer } from "@/lib/auth";
import { activeCurrencies, countryOptions, getMySupplier } from "@/lib/queries/business";
import { getAllMakes } from "@/lib/queries/home";
import { PageHeader } from "@/components/ui/misc";
import { VehicleForm } from "@/components/supplier/vehicle-form";

export default async function NewVehiclePage({ params }: PageProps<"/[locale]/supplier/vehicles/new">) {
  const locale = await resolveLocale(params);
  const viewer = await requireViewer(locale, "/supplier/vehicles/new");
  const s = await getMySupplier(viewer.id);
  if (!s || s.status !== "approved") redirect({ href: "/supplier", locale });
  const [t, makes, currencies] = await Promise.all([getTranslations("supplier"), getAllMakes(), activeCurrencies()]);
  return (
    <div>
      <PageHeader title={t("newListing")} description={t("newListingSubtitle")} />
      <VehicleForm vehicleId={null} status={null} defaults={{ countryCode: s!.country_code, city: s!.city }}
        makes={makes.map((m) => ({ id: m.id, name: m.name }))} countries={countryOptions(locale)} currencies={currencies} />
    </div>
  );
}
