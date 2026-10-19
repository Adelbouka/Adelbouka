import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader, Table } from "@/components/ui/misc";

export default async function PartnerServices({ params }: PageProps<"/[locale]/partner/services">) {
  const locale = await resolveLocale(params);
  const viewer = await requireViewer(locale, "/partner/services");
  if (!viewer.partner) redirect({ href: "/partner/apply", locale });
  const supabase = await createClient();
  const [t, te, { data }] = await Promise.all([
    getTranslations("partner"), getTranslations("enums"),
    supabase.from("service_requests").select("id, reference, status, category_code, created_at, service_categories(name_ar, name_fr)").order("created_at", { ascending: false }),
  ]);
  return (
    <div>
      <PageHeader title={t("navServices")} description={t("servicesSubtitle")} />
      {viewer.partner!.status !== "approved" ? <Alert tone="info" className="mb-4">{t("notApproved")}</Alert> : null}
      {data?.length ? (
        <Table>
          <thead><tr><th>{t("reference")}</th><th>{t("category")}</th><th>{t("status")}</th><th>{t("received")}</th></tr></thead>
          <tbody>
            {data.map((s) => (
              <tr key={s.id}>
                <td><Link href={`/partner/services/${s.id}`} className="font-medium text-primary hover:underline ltr-nums">{s.reference}</Link></td>
                <td>{s.service_categories ? (locale === "fr" ? s.service_categories.name_fr : s.service_categories.name_ar) : s.category_code}</td>
                <td><Badge tone={s.status === "completed" ? "success" : s.status === "cancelled" ? "danger" : "info"}>{te(`serviceStatus.${s.status}`)}</Badge></td>
                <td className="text-muted-foreground">{formatDate(s.created_at, locale, "medium")}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : <EmptyState title={t("noServices")} description={t("noServicesText")} />}
    </div>
  );
}
