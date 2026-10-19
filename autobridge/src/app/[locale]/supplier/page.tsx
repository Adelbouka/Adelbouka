import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { requireViewer } from "@/lib/auth";
import { msDaysAgo } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { getMySupplier } from "@/lib/queries/business";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { PageHeader, Stat } from "@/components/ui/misc";
import { BusinessStatusPanel } from "@/components/business/status-panel";

export default async function SupplierHome({ params, searchParams }: PageProps<"/[locale]/supplier">) {
  const locale = await resolveLocale(params);
  const viewer = await requireViewer(locale, "/supplier");
  const supplier = await getMySupplier(viewer.id);
  if (!supplier) redirect({ href: "/supplier/apply", locale });
  const s = supplier!;
  const { applied } = await searchParams;
  const supabase = await createClient();
  const [t, te, vehicles, requests, quotes, docs] = await Promise.all([
    getTranslations("supplier"), getTranslations("enums"),
    supabase.from("vehicles").select("status, availability, last_confirmed_at").eq("supplier_id", s.id),
    supabase.from("supplier_purchase_requests").select("id, status"),
    supabase.from("quotations").select("status").eq("supplier_id", s.id),
    supabase.from("verification_documents").select("id", { count: "exact", head: true }).eq("supplier_id", s.id),
  ]);
  const v = vehicles.data ?? [];
  const staleCutoff = msDaysAgo(30);
  const stale = v.filter((x) => x.status === "published" && new Date(x.last_confirmed_at).getTime() < staleCutoff).length;
  const q = quotes.data ?? [];
  return (
    <div className="space-y-6">
      <PageHeader title={s.business_name} description={t("overviewSubtitle")}
        actions={<Badge tone={s.status === "approved" ? "success" : s.status === "pending" ? "info" : "danger"}>{te(`businessStatus.${s.status}`)}</Badge>} />
      {applied ? <Alert tone="success" title={t("appliedTitle")}>{t("appliedText")}</Alert> : null}
      <BusinessStatusPanel kind="supplier" status={s.status} reason={s.status_reason} />
      {s.status === "pending" && !docs.count ? (
        <Alert tone="info">{t("uploadDocsHint")} <Link href="/supplier/documents" className="font-medium underline">{t("navDocuments")}</Link></Alert>
      ) : null}
      {stale ? <Alert tone="warning">{t("staleListings", { count: stale })} <Link href="/supplier/vehicles" className="font-medium underline">{t("navVehicles")}</Link></Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t("statPublished")} value={v.filter((x) => x.status === "published").length} />
        <Stat label={t("statPending")} value={v.filter((x) => x.status === "pending_review").length} />
        <Stat label={t("statRequests")} value={(requests.data ?? []).filter((r) => !["completed", "cancelled", "rejected"].includes(r.status ?? "")).length} />
        <Stat label={t("statOpenQuotes")} value={q.filter((x) => x.status === "submitted" || x.status === "sent").length}
          hint={t("statAccepted", { count: q.filter((x) => x.status === "accepted").length })} />
      </div>
      {s.status === "approved" ? (
        <div className="flex flex-wrap gap-3">
          <Link href="/supplier/vehicles/new" className={buttonClasses("primary")}>{t("newListing")}</Link>
          <Link href="/supplier/requests" className={buttonClasses("secondary")}>{t("navRequests")}</Link>
        </div>
      ) : null}
    </div>
  );
}
