import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { countryName, formatDate, formatMoney, formatMonthYear, formatNumber } from "@/lib/format";
import { vehicleImageUrl } from "@/lib/images";
import { reviewVehicleAction, setPromotionAction } from "@/lib/actions/admin";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DefinitionList, PageHeader } from "@/components/ui/misc";
import { Input, Textarea } from "@/components/ui/input";
import { ActionForm } from "@/components/forms/action-form";
import { VehicleImage } from "@/components/vehicles/vehicle-image";
import { NotesPanel } from "@/components/admin/notes-panel";

export default async function AdminVehicle({ params }: PageProps<"/[locale]/admin/vehicles/[id]">) {
  const locale = await resolveLocale(params);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const viewer = await requireStaff(locale);
  const supabase = await createClient();
  const { data: v } = await supabase.from("vehicles").select("*, vehicle_makes(name), supplier_profiles(id, business_name, status, is_demo)").eq("id", id).maybeSingle();
  if (!v) notFound();
  const [t, te, tv, tc, images, reports] = await Promise.all([
    getTranslations("admin"), getTranslations("enums"), getTranslations("vehicles"), getTranslations("common"),
    supabase.from("vehicle_images").select("id, storage_path, external_url").eq("vehicle_id", id).order("position"),
    supabase.from("listing_reports").select("id, reason, details, status, created_at").eq("vehicle_id", id).order("created_at", { ascending: false }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<Link href="/admin/vehicles" className="hover:text-foreground">← {t("navVehicles")}</Link>}
        title={`${v.vehicle_makes?.name} ${v.model} ${v.manufacture_year}`}
        actions={<Badge tone={v.status === "published" ? "success" : v.status === "pending_review" ? "info" : "neutral"}>{te(`listingStatus.${v.status}`)}</Badge>}
      />
      {v.supplier_profiles?.status !== "approved" ? <Alert tone="warning">{t("supplierNotApproved")}</Alert> : null}
      {v.is_demo ? <Alert tone="warning">{tc("demoData")}</Alert> : null}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title={t("photos")} />
            <CardBody>
              {images.data?.length ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {images.data.map((i) => <div key={i.id} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-surface-muted"><VehicleImage src={vehicleImageUrl(i.external_url ?? i.storage_path)} alt="" sizes="200px" /></div>)}
                </div>
              ) : <p className="text-sm text-muted-foreground">{t("noPhotos")}</p>}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={tv("specs")} />
            <CardBody>
              <DefinitionList items={[
                { label: t("supplier"), value: v.supplier_profiles ? <Link href={`/admin/suppliers/${v.supplier_profiles.id}`} className="text-primary hover:underline">{v.supplier_profiles.business_name}</Link> : "—" },
                { label: tv("manufactureYear"), value: v.manufacture_year },
                { label: tv("firstRegistration"), value: v.first_registration_date ? formatMonthYear(v.first_registration_date, locale) : tv("firstRegistrationNone") },
                { label: tv("mileage"), value: `${formatNumber(v.mileage_km, locale)} km` },
                { label: tv("fuel"), value: te(`fuel.${v.fuel_type}`) },
                { label: tv("transmission"), value: te(`transmission.${v.transmission}`) },
                { label: tv("engine"), value: v.engine_cc ? `${v.engine_cc} cm³` : "—" },
                { label: tv("condition"), value: te(`condition.${v.condition}`) },
                { label: tv("vin"), value: <span className="font-mono ltr-nums">{v.vin ?? "—"}</span> },
                { label: tv("location"), value: `${v.city}, ${countryName(v.country_code, locale)}` },
                { label: tv("askingPrice"), value: formatMoney(v.price_amount, v.price_currency, locale) },
                { label: tv("availability"), value: te(`availability.${v.availability}`) },
                { label: tv("listedOn"), value: formatDate(v.published_at, locale) },
                { label: t("expires"), value: formatDate(v.expires_at, locale) },
                { label: tv("availabilityConfirmed"), value: formatDate(v.last_confirmed_at, locale) },
              ]} />
              {v.description ? <p className="mt-4 text-sm whitespace-pre-line text-muted-foreground">{v.description}</p> : null}
            </CardBody>
          </Card>
          {reports.data?.length ? (
            <Card>
              <CardHeader title={t("navReports")} actions={<Link href="/admin/reports" className="text-sm text-primary hover:underline">{t("viewAll")}</Link>} />
              <ul className="divide-y divide-border text-sm">
                {reports.data.map((r) => (
                  <li key={r.id} className="px-5 py-3"><span className="font-medium">{te(`reportReason.${r.reason as "other"}`)}</span> · {te(`reportStatus.${r.status as "open"}`)}<p className="text-muted-foreground">{r.details}</p></li>
                ))}
              </ul>
            </Card>
          ) : null}
          <NotesPanel entityType="vehicle" entityId={v.id} />
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title={t("moderation")} />
            <CardBody className="space-y-4">
              {v.status === "pending_review" ? <ActionForm action={reviewVehicleAction} hidden={{ vehicleId: v.id, decision: "approve" }} submitLabel={t("approvePublish")} /> : null}
              {v.status === "pending_review" || v.status === "published" ? (
                <ActionForm action={reviewVehicleAction} hidden={{ vehicleId: v.id, decision: "reject" }} submitLabel={t("rejectListing")} variant="danger">
                  <Textarea name="reason" rows={3} maxLength={1000} aria-label={t("reasonRequired")} placeholder={t("reasonVisibleToSupplier")} required />
                </ActionForm>
              ) : null}
              {v.status !== "archived" ? <ActionForm action={reviewVehicleAction} hidden={{ vehicleId: v.id, decision: "archive" }} submitLabel={t("archive")} variant="secondary" confirmMessage={t("confirmAction")} /> : null}
              {v.review_reason ? <p className="text-xs text-muted-foreground">{t("lastReason")}: {v.review_reason}</p> : null}
            </CardBody>
          </Card>
          {viewer.isAdmin && v.status === "published" ? (
            <Card>
              <CardHeader title={t("promotion")} description={t("promotionHint")} />
              <CardBody>
                {v.promoted_until && new Date(v.promoted_until) > new Date() ? <p className="mb-3 text-sm">{t("promotedUntil", { date: formatDate(v.promoted_until, locale) })}</p> : null}
                <ActionForm action={setPromotionAction} hidden={{ vehicleId: v.id }} submitLabel={tc("save")} variant="secondary" size="sm">
                  <Input type="date" name="until" dir="ltr" aria-label={t("promotion")} defaultValue={v.promoted_until?.slice(0, 10) ?? ""} />
                  <p className="text-xs text-muted-foreground">{t("promotionClear")}</p>
                </ActionForm>
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
