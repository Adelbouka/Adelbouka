import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { requireViewer } from "@/lib/auth";
import { msDaysAgo } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { getMySupplier } from "@/lib/queries/business";
import { formatDate, formatMoney } from "@/lib/format";
import { listingAction } from "@/lib/actions/supplier";
import type { ListingStatus } from "@/lib/domain/enums";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState, PageHeader, Table } from "@/components/ui/misc";
import { ActionForm } from "@/components/forms/action-form";

const statusTone = (s: ListingStatus) => (s === "published" ? "success" : s === "pending_review" ? "info" : s === "rejected" ? "danger" : "neutral");

export default async function SupplierVehicles({ params }: PageProps<"/[locale]/supplier/vehicles">) {
  const locale = await resolveLocale(params);
  const viewer = await requireViewer(locale, "/supplier/vehicles");
  const s = await getMySupplier(viewer.id);
  if (!s) redirect({ href: "/supplier/apply", locale });
  const supabase = await createClient();
  const [t, te, { data }] = await Promise.all([
    getTranslations("supplier"), getTranslations("enums"),
    supabase.from("vehicles").select("id, slug, model, manufacture_year, price_amount, price_currency, status, availability, review_reason, last_confirmed_at, expires_at, vehicle_makes(name)").eq("supplier_id", s!.id).order("updated_at", { ascending: false }),
  ]);
  const approved = s!.status === "approved";
  const staleCutoff = msDaysAgo(30);
  return (
    <div>
      <PageHeader title={t("navVehicles")} description={t("vehiclesSubtitle")}
        actions={approved ? <Link href="/supplier/vehicles/new" className={buttonClasses("primary")}>{t("newListing")}</Link> : undefined} />
      {!approved ? <Alert tone="info" className="mb-4">{t("notApprovedListings")}</Alert> : null}
      {data?.length ? (
        <Table>
          <thead><tr><th>{t("vehicle")}</th><th>{t("askingPrice")}</th><th>{t("listingStatus")}</th><th>{t("availability")}</th><th>{t("lastConfirmed")}</th><th>{t("actionsCol")}</th></tr></thead>
          <tbody>
            {data.map((v) => {
              const stale = v.status === "published" && new Date(v.last_confirmed_at).getTime() < staleCutoff;
              return (
                <tr key={v.id} className="align-top">
                  <td>
                    <Link href={`/supplier/vehicles/${v.id}`} className="font-medium text-primary hover:underline">{v.vehicle_makes?.name} {v.model} <span className="ltr-nums">{v.manufacture_year}</span></Link>
                    {v.status === "rejected" && v.review_reason ? <p className="mt-1 max-w-xs text-xs text-danger">{v.review_reason}</p> : null}
                  </td>
                  <td className="ltr-nums">{formatMoney(v.price_amount, v.price_currency, locale)}</td>
                  <td><Badge tone={statusTone(v.status)}>{te(`listingStatus.${v.status}`)}</Badge></td>
                  <td>{te(`availability.${v.availability}`)}</td>
                  <td>
                    <span className={stale ? "text-warning" : "text-muted-foreground"}>{formatDate(v.last_confirmed_at, locale, "medium")}</span>
                    {v.expires_at ? <div className="text-xs text-muted-foreground">{t("expires", { date: formatDate(v.expires_at, locale, "medium") })}</div> : null}
                  </td>
                  <td>
                    {approved && v.status !== "archived" ? (
                      <div className="flex flex-wrap gap-1">
                        {v.status === "published" ? <ActionForm action={listingAction} hidden={{ vehicleId: v.id, op: "confirm" }} submitLabel={t("confirmAvailability")} variant="secondary" size="sm" inline /> : null}
                        {v.status === "draft" || v.status === "rejected" ? <ActionForm action={listingAction} hidden={{ vehicleId: v.id, op: "submit" }} submitLabel={t("submitForReview")} variant="secondary" size="sm" inline /> : null}
                        {v.status === "published" && v.availability === "available" ? <ActionForm action={listingAction} hidden={{ vehicleId: v.id, op: "availability", availability: "sold" }} submitLabel={t("markSold")} variant="ghost" size="sm" inline /> : null}
                        <ActionForm action={listingAction} hidden={{ vehicleId: v.id, op: "archive" }} submitLabel={t("archive")} variant="ghost" size="sm" inline confirmMessage={t("archiveConfirm")} />
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      ) : <EmptyState title={t("noListings")} action={approved ? <Link href="/supplier/vehicles/new" className={buttonClasses("primary")}>{t("newListing")}</Link> : undefined} />}
    </div>
  );
}
