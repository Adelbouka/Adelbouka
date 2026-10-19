import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney } from "@/lib/format";
import { nextStatuses } from "@/lib/domain/request-status";
import { parseSnapshot } from "@/lib/domain/snapshot";
import { respondToQuotationAction, transitionRequestAction } from "@/lib/actions/requests";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { Textarea } from "@/components/ui/input";
import { ActionForm } from "@/components/forms/action-form";
import { RequestStatusBadge, RequestTimeline, quotationDisplayStatus } from "@/components/requests/status";
import { QuotationView, type QuotationWithItems } from "@/components/requests/quotation-view";
import { RequestSummary } from "@/components/requests/request-summary";

export default async function MyRequestPage({ params, searchParams }: PageProps<"/[locale]/account/requests/[id]">) {
  const locale = await resolveLocale(params);
  const { id } = await params;
  const { created } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const viewer = await requireViewer(locale, `/account/requests/${id}`);
  const supabase = await createClient();
  const { data: r } = await supabase
    .from("purchase_requests")
    .select("*, vehicle_makes!purchase_requests_desired_make_id_fkey(name), acquisition_pathways(name_ar, name_fr), cost_estimates(total_amount, total_currency, completeness, created_at)")
    .eq("id", id)
    .eq("customer_id", viewer.id)
    .maybeSingle();
  if (!r) notFound();

  const [t, te, history, milestones, quotations] = await Promise.all([
    getTranslations("requests"), getTranslations("enums"),
    supabase.from("request_status_history").select("id, from_status, to_status, actor_role, note, created_at").eq("request_id", id).order("created_at"),
    supabase.from("request_milestones").select("id, kind, occurred_on, note, created_at").eq("request_id", id).order("occurred_on"),
    supabase.from("quotations").select("id, reference, status, currency, total_amount, valid_until, terms, message_to_customer, submitted_at, sent_at, decline_reason, quotation_items(id, position, kind, description, amount, payee, is_estimate)").eq("request_id", id).order("sent_at", { ascending: false }),
  ]);
  const customerMoves = nextStatuses(r.status, "customer");
  const canSubmit = customerMoves.includes("submitted");
  const canCancel = customerMoves.includes("cancelled");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<Link href="/account/requests" className="hover:text-foreground">{t("backToRequests")}</Link>}
        title={<span className="flex flex-wrap items-center gap-3"><span className="ltr-nums">{r.reference}</span><RequestStatusBadge status={r.status} /></span>}
        description={t("createdOn", { date: formatDate(r.created_at, locale) })}
      />
      {created ? <Alert tone="success" title={r.status === "draft" ? t("draftSaved") : t("createdTitle")}>{r.status === "draft" ? t("draftSavedText") : t("createdText", { reference: r.reference })}</Alert> : null}
      {r.status === "awaiting_customer_decision" ? <Alert tone="warning">{t("awaitingDecision")}</Alert> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title={t("quotations")} description={t("quotationsHint")} />
            <CardBody className="space-y-4">
              {quotations.data?.length ? quotations.data.map((q) => {
                const display = quotationDisplayStatus(q.status, q.valid_until);
                const canRespond = display === "sent" && r.status === "awaiting_customer_decision";
                return (
                  <QuotationView key={q.id} quotation={q as unknown as QuotationWithItems} actions={canRespond ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <ActionForm action={respondToQuotationAction} hidden={{ quotationId: q.id, decision: "accept" }} submitLabel={t("acceptQuotation")}
                        confirmMessage={t("acceptConfirm")}>
                        <p className="text-xs text-muted-foreground">{t("acceptHint")}</p>
                      </ActionForm>
                      <ActionForm action={respondToQuotationAction} hidden={{ quotationId: q.id, decision: "decline" }} submitLabel={t("declineQuotation")} variant="secondary">
                        <label htmlFor={`reason-${q.id}`} className="block text-xs text-muted-foreground">{t("declineReason")}</label>
                        <Textarea id={`reason-${q.id}`} name="reason" rows={2} maxLength={1000} />
                      </ActionForm>
                    </div>
                  ) : undefined} />
                );
              }) : <p className="text-sm text-muted-foreground">{t("noQuotations")}</p>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t("requestDetails")} />
            <CardBody>
              <RequestSummary r={{
                ...r,
                vehicle: parseSnapshot(r.vehicle_snapshot),
                desired_make: r.vehicle_makes?.name ?? null,
                pathway_name: r.acquisition_pathways ? (locale === "fr" ? r.acquisition_pathways.name_fr : r.acquisition_pathways.name_ar) : null,
              }} />
              {r.cost_estimates ? (
                <p className="mt-4 rounded-lg bg-surface-muted p-3 text-sm">
                  {t("attachedEstimate", { total: formatMoney(r.cost_estimates.total_amount, r.cost_estimates.total_currency, locale), completeness: r.cost_estimates.completeness })}
                </p>
              ) : null}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title={t("legalReview")} />
            <CardBody className="space-y-2 text-sm">
              <Badge tone={r.legal_review_status === "approved" || r.legal_review_status === "not_required" ? "success" : r.legal_review_status === "blocked" ? "danger" : "warning"}>
                {te(`legalReview.${r.legal_review_status}`)}
              </Badge>
              <p className="text-muted-foreground">{t("legalReviewExplain")}</p>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t("history")} />
            <CardBody><RequestTimeline history={history.data ?? []} milestones={milestones.data ?? []} /></CardBody>
          </Card>
          {canSubmit || canCancel ? (
            <Card>
              <CardHeader title={t("actions")} />
              <CardBody className="space-y-4">
                {canSubmit ? <ActionForm action={transitionRequestAction} hidden={{ requestId: r.id, to: "submitted" }} submitLabel={te("requestAction.submitted")} /> : null}
                {canCancel ? (
                  <ActionForm action={transitionRequestAction} hidden={{ requestId: r.id, to: "cancelled" }} submitLabel={te("requestAction.cancelled")} variant="danger" confirmMessage={t("cancelConfirm")}>
                    <label htmlFor="cancel-note" className="block text-xs text-muted-foreground">{t("cancelReason")}</label>
                    <Textarea id="cancel-note" name="note" rows={2} maxLength={2000} />
                  </ActionForm>
                ) : null}
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
