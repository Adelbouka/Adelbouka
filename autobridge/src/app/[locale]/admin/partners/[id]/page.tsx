import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { updateServiceStatusAction } from "@/lib/actions/partner";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { ActionForm } from "@/components/forms/action-form";
import { BusinessReview } from "@/components/admin/business-review";

export default async function AdminPartner({ params }: PageProps<"/[locale]/admin/partners/[id]">) {
  const locale = await resolveLocale(params);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const viewer = await requireStaff(locale);
  const supabase = await createClient();
  const { data: p } = await supabase.from("partner_profiles").select("*, partner_service_categories(category_code, service_categories(name_ar, name_fr))").eq("id", id).maybeSingle();
  if (!p) notFound();
  const [t, te, services] = await Promise.all([
    getTranslations("admin"), getTranslations("enums"),
    supabase.from("service_requests").select("id, reference, status, purchase_request_id, created_at").eq("partner_id", id).order("created_at", { ascending: false }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={<Link href="/admin/partners" className="hover:text-foreground">← {t("navPartners")}</Link>} title={p.business_name} />
      <BusinessReview kind="partner" business={p} isAdmin={viewer.isAdmin} extra={
        <Card>
          <CardHeader title={t("serviceRequests")} description={p.partner_service_categories.map((c) => locale === "fr" ? c.service_categories?.name_fr : c.service_categories?.name_ar).join(" · ")} />
          <CardBody>
            {services.data?.length ? (
              <ul className="divide-y divide-border text-sm">
                {services.data.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>
                      {s.purchase_request_id ? <Link href={`/admin/requests/${s.purchase_request_id}`} className="font-medium text-primary hover:underline ltr-nums">{s.reference}</Link> : <span className="ltr-nums">{s.reference}</span>}
                      <span className="text-muted-foreground"> · {formatDate(s.created_at, locale, "medium")}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <Badge tone="info">{te(`serviceStatus.${s.status}`)}</Badge>
                      {!["completed", "cancelled"].includes(s.status) ? (
                        <ActionForm action={updateServiceStatusAction} hidden={{ serviceRequestId: s.id, status: "cancelled" }} submitLabel={t("cancelService")} variant="ghost" size="sm" inline confirmMessage={t("confirmAction")} />
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">{t("noResults")}</p>}
          </CardBody>
        </Card>
      } />
    </div>
  );
}
