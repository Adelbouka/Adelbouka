import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMyPartner } from "@/lib/queries/business";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { PageHeader, Stat } from "@/components/ui/misc";
import { BusinessStatusPanel } from "@/components/business/status-panel";

export default async function PartnerHome({ params, searchParams }: PageProps<"/[locale]/partner">) {
  const locale = await resolveLocale(params);
  const viewer = await requireViewer(locale, "/partner");
  const p = await getMyPartner(viewer.id);
  if (!p) redirect({ href: "/partner/apply", locale });
  const { applied } = await searchParams;
  const supabase = await createClient();
  const [t, te, services] = await Promise.all([
    getTranslations("partner"), getTranslations("enums"),
    supabase.from("service_requests").select("status").eq("partner_id", p!.id),
  ]);
  const s = services.data ?? [];
  return (
    <div className="space-y-6">
      <PageHeader title={p!.business_name} description={t("overviewSubtitle")}
        actions={<Badge tone={p!.status === "approved" ? "success" : p!.status === "pending" ? "info" : "danger"}>{te(`businessStatus.${p!.status}`)}</Badge>} />
      {applied ? <Alert tone="success" title={t("appliedTitle")}>{t("appliedText")}</Alert> : null}
      <BusinessStatusPanel kind="partner" status={p!.status} reason={p!.status_reason} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label={t("statNew")} value={s.filter((x) => x.status === "requested").length} />
        <Stat label={t("statActive")} value={s.filter((x) => ["quoted", "accepted", "in_progress"].includes(x.status)).length} />
        <Stat label={t("statCompleted")} value={s.filter((x) => x.status === "completed").length} />
      </div>
      {p!.status === "approved" ? <Link href="/partner/services" className={buttonClasses("primary")}>{t("navServices")}</Link> : null}
    </div>
  );
}
