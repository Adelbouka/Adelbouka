import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { activeCurrencies, countryOptions } from "@/lib/queries/business";
import { getAllMakes } from "@/lib/queries/home";
import { vehicleImageUrl } from "@/lib/images";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { VehicleForm } from "@/components/supplier/vehicle-form";
import { VehicleImagesManager } from "@/components/supplier/vehicle-images-manager";

export default async function EditVehiclePage({ params, searchParams }: PageProps<"/[locale]/supplier/vehicles/[id]">) {
  const locale = await resolveLocale(params);
  const { id } = await params;
  const { created } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const viewer = await requireViewer(locale, `/supplier/vehicles/${id}`);
  const supabase = await createClient();
  // RLS returns the row only to its owner (or staff).
  const { data: v } = await supabase.from("vehicles").select("*").eq("id", id).maybeSingle();
  if (!v || v.supplier_id !== viewer.supplier?.id) notFound();
  const [t, te, makes, currencies, images] = await Promise.all([
    getTranslations("supplier"), getTranslations("enums"), getAllMakes(), activeCurrencies(),
    supabase.from("vehicle_images").select("id, storage_path, external_url, position").eq("vehicle_id", id).order("position"),
  ]);
  const editable = v.status !== "archived" && viewer.supplier?.status === "approved";
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<Link href="/supplier/vehicles" className="hover:text-foreground">← {t("navVehicles")}</Link>}
        title={`${v.model} ${v.manufacture_year}`}
        actions={<Badge tone={v.status === "published" ? "success" : v.status === "rejected" ? "danger" : "info"}>{te(`listingStatus.${v.status}`)}</Badge>}
      />
      {created ? <Alert tone="success">{t("listingCreated")}</Alert> : null}
      {v.status === "rejected" && v.review_reason ? <Alert tone="danger" title={t("rejectedReason")}>{v.review_reason}</Alert> : null}
      {v.status === "published" ? <p className="text-sm"><Link href={`/vehicles/${v.slug}`} className="text-primary hover:underline">{t("viewPublic")}</Link></p> : null}
      <Card>
        <CardHeader title={t("photos")} description={t("photosHint")} />
        <CardBody>
          {editable ? (
            <VehicleImagesManager vehicleId={v.id} userId={viewer.id}
              images={(images.data ?? []).map((i) => ({ id: i.id, url: vehicleImageUrl(i.external_url ?? i.storage_path), position: i.position }))} />
          ) : <p className="text-sm text-muted-foreground">{t("notEditable")}</p>}
        </CardBody>
      </Card>
      {editable ? (
        <VehicleForm vehicleId={v.id} status={v.status} makes={makes.map((m) => ({ id: m.id, name: m.name }))} countries={countryOptions(locale)} currencies={currencies}
          defaults={{
            makeId: v.make_id, model: v.model, trimLevel: v.trim_level ?? "", bodyType: v.body_type, manufactureYear: v.manufacture_year,
            firstRegistrationDate: v.first_registration_date ?? "", mileageKm: v.mileage_km, fuelType: v.fuel_type, transmission: v.transmission,
            engineCc: v.engine_cc ?? undefined, powerKw: v.power_kw ?? undefined, condition: v.condition, exteriorColor: v.exterior_color ?? "",
            doors: v.doors ?? undefined, seats: v.seats ?? undefined, vin: v.vin ?? "", description: v.description ?? "",
            countryCode: v.country_code, city: v.city, priceAmount: Number(v.price_amount), priceCurrency: v.price_currency, availability: v.availability,
          }} />
      ) : null}
    </div>
  );
}
