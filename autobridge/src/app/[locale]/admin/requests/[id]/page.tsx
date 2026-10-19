import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney } from "@/lib/format";
import { nextStatuses } from "@/lib/domain/request-status";
import { MILESTONE_KINDS } from "@/lib/domain/enums";
import { parseSnapshot } from "@/lib/domain/snapshot";
import { transitionRequestAction } from "@/lib/actions/requests";
import { withdrawQuotationAction } from "@/lib/actions/supplier";
import {
  assignRequestAction, createServiceRequestAction, decideServiceQuoteAction, legalReviewAction,
  recordMilestoneAction, rejectQuotationAction, sendQuotationAction, setRequestSupplierAction,
} from "@/lib/actions/admin";
import { activeCurrencies } from "@/lib/queries/business";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DefinitionList, PageHeader } from "@/components/ui/misc";
import { Input, Select, Textarea } from "@/components/ui/input";
import { ActionForm } from "@/components/forms/action-form";
import { RequestStatusBadge, RequestTimeline } from "@/components/requests/status";
import { RequestSummary } from "@/components/requests/request-summary";
import { QuotationView, type QuotationWithItems } from "@/components/requests/quotation-view";
import { QuotationForm } from "@/components/supplier/quotation-form";
import { NotesPanel } from "@/components/admin/notes-panel";

export default async function AdminRequestPage({ params }: PageProps<"/[locale]/admin/requests/[id]">) {
  const locale = await resolveLocale(params);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  await requireStaff(locale);
  const supabase = await createClient();
  const { data: r } = await supabase
    .from("purchase_requests")
    .select("*, vehicle_makes!purchase_requests_desired_make_id_fkey(name), acquisition_pathways(name_ar, name_fr, requires_legal_review), supplier_profiles(id, business_name, status), cost_estimates(total_amount, total_currency, completeness)")
    .eq("id", id)
    .maybeSingle();
  if (!r) notFound();

  const [t, te, tr, tc, history, milestones, quotations, services, staff, suppliers, partners, categories, currencies] = await Promise.all([
    getTranslations("admin"), getTranslations("enums"), getTranslations("requests"), getTranslations("common"),
    supabase.from("request_status_history").select("id, from_status, to_status, actor_role, note, created_at").eq("request_id", id).order("created_at"),
    supabase.from("request_milestones").select("id, kind, occurred_on, note, created_at").eq("request_id", id).order("occurred_on"),
    supabase.from("quotations").select("id, reference, status, currency, total_amount, valid_until, terms, message_to_customer, submitted_at, sent_at, rejection_reason, decline_reason, supplier_id, quotation_items(id, position, kind, description, amount, payee, is_estimate)").eq("request_id", id).order("submitted_at", { ascending: false }),
    supabase.from("service_requests").select("id, reference, status, category_code, description, partner_profiles(business_name), service_quotes(id, amount, currency, valid_until, notes, status)").eq("purchase_request_id", id).order("created_at"),
    supabase.from("user_roles").select("user_id, role, profiles!user_roles_user_id_fkey(full_name, email)"),
    supabase.from("supplier_profiles").select("id, business_name").eq("status", "approved").order("business_name"),
    supabase.from("partner_profiles").select("id, business_name, partner_service_categories(category_code)").eq("status", "approved").order("business_name"),
    supabase.from("service_categories").select("code, name_ar, name_fr").eq("is_active", true).order("position"),
    activeCurrencies(),
  ]);

  const staffMoves = nextStatuses(r.status, "staff");
  const staffMembers = [...new Map((staff.data ?? []).map((s) => [s.user_id, s])).values()];
  const snapshot = parseSnapshot(r.vehicle_snapshot);
  const canQuote = ["under_review", "supplier_contacted", "quotation_received", "awaiting_customer_decision"].includes(r.status);
  const canMilestone = ["accepted", "in_progress", "completed"].includes(r.status);
  const legalEditable = !["in_progress", "completed", "cancelled", "rejected"].includes(r.status);
  const catName = (code: string) => {
    const c = categories.data?.find((x) => x.code === code);
    return c ? (locale === "fr" ? c.name_fr : c.name_ar) : code;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<Link href="/admin/requests" className="hover:text-foreground">← {t("navRequests")}</Link>}
        title={<span className="flex flex-wrap items-center gap-3"><span className="ltr-nums">{r.reference}</span><RequestStatusBadge status={r.status} /></span>}
        description={`${te(`requestType.${r.request_type as "listed_vehicle" | "custom_search"}`)} · ${formatDate(r.created_at, locale)}`}
      />
      {r.legal_review_status === "blocked" ? <Alert tone="danger">{t("legalBlocked")}</Alert> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title={t("customerContact")} description={t("customerContactHint")} />
            <CardBody>
              <DefinitionList items={[
                { label: tr("contactName"), value: r.contact_name },
                { label: tr("contactPhone"), value: <a href={`tel:${r.contact_phone}`} className="text-primary ltr-nums">{r.contact_phone}</a> },
                { label: tr("contactEmail"), value: r.contact_email ? <a href={`mailto:${r.contact_email}`} className="text-primary">{r.contact_email}</a> : "—" },
                { label: tr("preferredContact"), value: te(`contactMethod.${r.preferred_contact}`) },
              ]} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={tr("requestDetails")} />
            <CardBody>
              <RequestSummary r={{
                ...r, vehicle: snapshot, desired_make: r.vehicle_makes?.name ?? null,
                pathway_name: r.acquisition_pathways ? (locale === "fr" ? r.acquisition_pathways.name_fr : r.acquisition_pathways.name_ar) : null,
              }} />
              {r.cost_estimates ? (
                <p className="mt-4 rounded-lg bg-surface-muted p-3 text-sm">
                  {tr("attachedEstimate", { total: formatMoney(r.cost_estimates.total_amount, r.cost_estimates.total_currency, locale), completeness: r.cost_estimates.completeness })}
                </p>
              ) : null}
              <p className="mt-3 text-sm">{t("supplier")}: {r.supplier_profiles ? <Link href={`/admin/suppliers/${r.supplier_profiles.id}`} className="text-primary hover:underline">{r.supplier_profiles.business_name}</Link> : t("noSupplier")}</p>
            </CardBody>
          </Card>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold">{tr("quotations")}</h2>
            {quotations.data?.length ? quotations.data.map((q) => (
              <QuotationView key={q.id} quotation={q as unknown as QuotationWithItems} actions={
                q.status === "submitted" ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <ActionForm action={sendQuotationAction} hidden={{ quotationId: q.id }} submitLabel={t("sendToCustomer")}>
                      <label className="block text-xs text-muted-foreground" htmlFor={`msg-${q.id}`}>{t("messageToCustomer")}</label>
                      <Textarea id={`msg-${q.id}`} name="message" rows={2} maxLength={2000} />
                    </ActionForm>
                    <ActionForm action={rejectQuotationAction} hidden={{ quotationId: q.id }} submitLabel={t("rejectQuotation")} variant="secondary">
                      <label className="block text-xs text-muted-foreground" htmlFor={`rej-${q.id}`}>{t("reasonRequired")}</label>
                      <Textarea id={`rej-${q.id}`} name="reason" rows={2} maxLength={1000} required />
                    </ActionForm>
                  </div>
                ) : q.status === "sent" ? (
                  <ActionForm action={withdrawQuotationAction} hidden={{ quotationId: q.id }} submitLabel={t("withdrawQuotation")} variant="ghost" size="sm" inline confirmMessage={t("confirmAction")} />
                ) : undefined
              } />
            )) : <p className="text-sm text-muted-foreground">{tr("noQuotations")}</p>}
            {canQuote ? (
              <details className="rounded-xl border border-border bg-surface">
                <summary className="cursor-pointer px-4 py-3 text-sm font-medium">{t("staffQuotation")}</summary>
                <div className="border-t border-border p-4">
                  <QuotationForm requestId={r.id} currencies={currencies} defaultCurrency={snapshot?.price_currency ?? "EUR"} />
                </div>
              </details>
            ) : null}
          </section>

          <Card>
            <CardHeader title={t("serviceRequests")} description={t("serviceRequestsHint")} />
            <CardBody className="space-y-4">
              {services.data?.map((s) => (
                <div key={s.id} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium ltr-nums">{s.reference}</span>
                    <Badge tone="info">{te(`serviceStatus.${s.status}`)}</Badge>
                  </div>
                  <p className="text-muted-foreground">{s.partner_profiles?.business_name} · {catName(s.category_code)}</p>
                  <p className="mt-1">{s.description}</p>
                  {s.service_quotes.map((sq) => (
                    <div key={sq.id} className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded bg-surface-muted p-2">
                      <span className="ltr-nums">{formatMoney(sq.amount, sq.currency, locale)} · {formatDate(sq.valid_until, locale, "medium")}{sq.notes ? ` · ${sq.notes}` : ""}</span>
                      {sq.status === "submitted" ? (
                        <span className="flex gap-1">
                          <ActionForm action={decideServiceQuoteAction} hidden={{ quoteId: sq.id, decision: "accept" }} submitLabel={t("accept")} size="sm" inline />
                          <ActionForm action={decideServiceQuoteAction} hidden={{ quoteId: sq.id, decision: "decline" }} submitLabel={t("decline")} variant="ghost" size="sm" inline />
                        </span>
                      ) : <Badge>{te(`serviceQuoteStatus.${sq.status as "submitted" | "accepted" | "declined" | "withdrawn"}`)}</Badge>}
                    </div>
                  ))}
                </div>
              ))}
              {partners.data?.length ? (
                <details>
                  <summary className="cursor-pointer text-sm font-medium text-primary">{t("newServiceRequest")}</summary>
                  <div className="mt-3">
                    <ActionForm action={createServiceRequestAction} hidden={{ purchaseRequestId: r.id }} submitLabel={t("createServiceRequest")}>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Select name="partnerId" aria-label={t("partner")} required>
                          {partners.data.map((p) => <option key={p.id} value={p.id}>{p.business_name} ({p.partner_service_categories.map((c) => catName(c.category_code)).join(", ")})</option>)}
                        </Select>
                        <Select name="categoryCode" aria-label={t("category")} required>
                          {(categories.data ?? []).map((c) => <option key={c.code} value={c.code}>{catName(c.code)}</option>)}
                        </Select>
                      </div>
                      <Textarea name="description" rows={3} maxLength={3000} aria-label={t("serviceDescription")} placeholder={t("serviceDescriptionPlaceholder")} required />
                    </ActionForm>
                  </div>
                </details>
              ) : <p className="text-sm text-muted-foreground">{t("noApprovedPartners")}</p>}
            </CardBody>
          </Card>

          {canMilestone ? (
            <Card>
              <CardHeader title={t("recordMilestone")} description={t("recordMilestoneHint")} />
              <CardBody>
                <ActionForm action={recordMilestoneAction} hidden={{ requestId: r.id }} submitLabel={t("recordMilestone")}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Select name="kind" aria-label={t("milestone")}>{MILESTONE_KINDS.map((k) => <option key={k} value={k}>{te(`milestone.${k}`)}</option>)}</Select>
                    <Input name="occurredOn" type="date" dir="ltr" aria-label={t("occurredOn")} defaultValue={new Date().toISOString().slice(0, 10)} required />
                  </div>
                  <Input name="evidence" aria-label={t("evidence")} placeholder={t("evidence")} maxLength={300} />
                  <Textarea name="note" rows={2} maxLength={1000} aria-label={tc("notes")} placeholder={t("milestoneNotePlaceholder")} />
                </ActionForm>
              </CardBody>
            </Card>
          ) : null}

          <NotesPanel entityType="purchase_request" entityId={r.id} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title={t("changeStatus")} />
            <CardBody className="space-y-3">
              {staffMoves.length ? staffMoves.map((to) => (
                <ActionForm key={to} action={transitionRequestAction} hidden={{ requestId: r.id, to }} submitLabel={te(`requestAction.${to}`)}
                  variant={to === "rejected" || to === "cancelled" ? "danger" : to === "completed" || to === "in_progress" ? "primary" : "secondary"} size="sm"
                  confirmMessage={to === "rejected" || to === "cancelled" ? t("confirmAction") : undefined}>
                  <Input name="note" aria-label={t("note")} placeholder={to === "rejected" ? t("reasonRequired") : t("noteOptional")} maxLength={2000} />
                </ActionForm>
              )) : <p className="text-sm text-muted-foreground">{t("noTransitions")}</p>}
              {r.status === "accepted" && !["approved", "not_required"].includes(r.legal_review_status) ? <p className="text-xs text-warning">{t("legalRequiredBeforeProgress")}</p> : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={tr("legalReview")} />
            <CardBody className="space-y-3">
              <Badge tone={r.legal_review_status === "approved" || r.legal_review_status === "not_required" ? "success" : r.legal_review_status === "blocked" ? "danger" : "warning"}>{te(`legalReview.${r.legal_review_status}`)}</Badge>
              {r.legal_reviewed_at ? <p className="text-xs text-muted-foreground">{formatDate(r.legal_reviewed_at, locale)}</p> : null}
              {legalEditable ? (
                <ActionForm action={legalReviewAction} hidden={{ requestId: r.id }} submitLabel={t("recordDecision")} size="sm">
                  <Select name="decision" aria-label={t("decision")} defaultValue="approved">
                    <option value="approved">{te("legalReview.approved")}</option>
                    <option value="blocked">{te("legalReview.blocked")}</option>
                    <option value="pending">{te("legalReview.pending")}</option>
                  </Select>
                  <Textarea name="note" rows={3} maxLength={2000} aria-label={t("legalNote")} placeholder={t("legalNotePlaceholder")} required />
                </ActionForm>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t("assignment")} />
            <CardBody className="space-y-4">
              <ActionForm action={assignRequestAction} hidden={{ requestId: r.id }} submitLabel={t("assign")} variant="secondary" size="sm">
                <Select name="staffId" aria-label={t("assignee")} defaultValue={r.assigned_to ?? ""}>
                  <option value="">{t("unassigned")}</option>
                  {staffMembers.map((s) => <option key={s.user_id} value={s.user_id}>{s.profiles?.full_name ?? s.profiles?.email}</option>)}
                </Select>
              </ActionForm>
              {r.request_type === "custom_search" && ["submitted", "under_review"].includes(r.status) ? (
                <ActionForm action={setRequestSupplierAction} hidden={{ requestId: r.id }} submitLabel={t("setSupplier")} variant="secondary" size="sm">
                  <Select name="supplierId" aria-label={t("supplier")} defaultValue={r.supplier_id ?? ""}>
                    <option value="">{t("noSupplier")}</option>
                    {(suppliers.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.business_name}</option>)}
                  </Select>
                </ActionForm>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={tr("history")} />
            <CardBody><RequestTimeline history={history.data ?? []} milestones={milestones.data ?? []} /></CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
