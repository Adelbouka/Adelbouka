import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { countryName, formatDate, formatDateTime } from "@/lib/format";
import { VERIFICATION_CHECKS, VERIFICATION_RESULTS, type BusinessStatus, type DocumentType } from "@/lib/domain/enums";
import { recordVerificationAction, setBusinessStatusAction } from "@/lib/actions/admin";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DefinitionList } from "@/components/ui/misc";
import { Input, Select, Textarea } from "@/components/ui/input";
import { ActionForm } from "@/components/forms/action-form";
import { DocumentLink } from "./document-link";
import { NotesPanel } from "./notes-panel";

type Business = {
  id: string; business_name: string; legal_form: string | null; registration_number: string | null; country_code: string; city: string;
  contact_name: string; contact_email: string; contact_phone: string; website: string | null; description: string | null;
  status: BusinessStatus; status_reason: string | null; reviewed_at: string | null; created_at: string; is_demo: boolean;
  address?: string | null; services_offered?: string | null; operating_countries?: string[];
};

export async function BusinessReview({ kind, business, isAdmin, extra }: {
  kind: "supplier" | "partner"; business: Business; isAdmin: boolean; extra?: React.ReactNode;
}) {
  const [t, te, tc, ts, locale] = await Promise.all([getTranslations("admin"), getTranslations("enums"), getTranslations("common"), getTranslations("supplier"), getLocale()]);
  const supabase = await createClient();
  const col = kind === "supplier" ? "supplier_id" : "partner_id";
  const [docs, checks] = await Promise.all([
    supabase.from("verification_documents").select("id, doc_type, file_name, expires_on, created_at").eq(col, business.id).order("created_at", { ascending: false }),
    supabase.from("supplier_verification_records").select("id, check_type, result, method, notes, verified_at, expires_at, profiles!supplier_verification_records_verified_by_fkey(full_name, email)").eq(col, business.id).order("verified_at", { ascending: false }),
  ]);
  const b = business;
  const moves: BusinessStatus[] =
    b.status === "pending" ? ["approved", "rejected"] : b.status === "approved" ? ["suspended"] : b.status === "suspended" ? ["approved", "rejected"] : [];
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        {b.is_demo ? <Alert tone="warning">{tc("demoData")}</Alert> : null}
        <Card>
          <CardHeader title={t("businessInfo")} />
          <CardBody>
            <DefinitionList items={[
              { label: ts("legalForm"), value: b.legal_form ?? "—" },
              { label: ts("registrationNumber"), value: b.registration_number ?? "—" },
              { label: ts("country"), value: `${b.city}, ${countryName(b.country_code, locale)}` },
              ...(b.address !== undefined ? [{ label: ts("address"), value: b.address ?? "—" }] : []),
              { label: ts("contactName"), value: b.contact_name },
              { label: ts("contactEmail"), value: <a className="text-primary" href={`mailto:${b.contact_email}`}>{b.contact_email}</a> },
              { label: ts("contactPhone"), value: <span className="ltr-nums">{b.contact_phone}</span> },
              { label: ts("website"), value: b.website ? <a className="text-primary" href={b.website} target="_blank" rel="noopener noreferrer nofollow">{b.website}</a> : "—" },
              ...(b.operating_countries ? [{ label: ts("operatingCountries"), value: b.operating_countries.map((c) => countryName(c, locale)).join(", ") || "—" }] : []),
              { label: t("applied"), value: formatDate(b.created_at, locale) },
            ]} />
            {b.description ? <p className="mt-4 text-sm whitespace-pre-line text-muted-foreground">{b.description}</p> : null}
            {b.services_offered ? <p className="mt-2 text-sm text-muted-foreground">{b.services_offered}</p> : null}
          </CardBody>
        </Card>
        {extra}
        <Card>
          <CardHeader title={t("documents")} description={t("documentsHint")} />
          <CardBody>
            {docs.data?.length ? (
              <ul className="divide-y divide-border text-sm">
                {docs.data.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>{te(`documentType.${d.doc_type as DocumentType}`)} <span className="text-muted-foreground">· {d.file_name}</span>
                      {d.expires_on ? <Badge tone={d.expires_on < today ? "danger" : "neutral"} className="ms-2">{ts("expires", { date: formatDate(d.expires_on, locale, "medium") })}</Badge> : null}</span>
                    <DocumentLink id={d.id} label={tc("view")} />
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">{ts("noDocuments")}</p>}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={t("verificationRecords")} description={t("verificationRecordsHint")} />
          <CardBody className="space-y-4">
            {checks.data?.length ? (
              <ul className="space-y-2 text-sm">
                {checks.data.map((c) => (
                  <li key={c.id} className="rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{te(`verificationCheck.${c.check_type}`)}</span>
                      <Badge tone={c.result === "passed" ? "success" : c.result === "failed" ? "danger" : "warning"}>{te(`verificationResult.${c.result}`)}</Badge>
                    </div>
                    <p className="text-muted-foreground">{c.method}</p>
                    {c.notes ? <p className="text-muted-foreground">{c.notes}</p> : null}
                    <p className="text-xs text-muted-foreground">{c.profiles?.full_name ?? c.profiles?.email} · {formatDateTime(c.verified_at, locale)}{c.expires_at ? ` · ${ts("expires", { date: formatDate(c.expires_at, locale, "medium") })}` : ""}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">{t("noChecks")}</p>}
            <details>
              <summary className="cursor-pointer text-sm font-medium text-primary">{t("recordCheck")}</summary>
              <div className="mt-3">
                <ActionForm action={recordVerificationAction} hidden={{ kind, id: b.id }} submitLabel={t("recordCheck")}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Select name="checkType" aria-label={t("checkType")}>{VERIFICATION_CHECKS.map((c) => <option key={c} value={c}>{te(`verificationCheck.${c}`)}</option>)}</Select>
                    <Select name="result" aria-label={t("result")}>{VERIFICATION_RESULTS.map((r) => <option key={r} value={r}>{te(`verificationResult.${r}`)}</option>)}</Select>
                  </div>
                  <Input name="method" aria-label={t("method")} placeholder={t("methodPlaceholder")} maxLength={300} required />
                  <Textarea name="notes" rows={2} maxLength={2000} aria-label={t("internalNotes")} placeholder={t("checkNotesPlaceholder")} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Select name="evidenceDocumentId" aria-label={t("evidenceDocument")} defaultValue="">
                      <option value="">{t("noEvidenceDocument")}</option>
                      {(docs.data ?? []).map((d) => <option key={d.id} value={d.id}>{te(`documentType.${d.doc_type as DocumentType}`)} — {d.file_name}</option>)}
                    </Select>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground" htmlFor="expiresAt">{t("checkExpires")}</label>
                      <Input id="expiresAt" name="expiresAt" type="date" dir="ltr" />
                    </div>
                  </div>
                </ActionForm>
              </div>
            </details>
          </CardBody>
        </Card>
        <NotesPanel entityType={kind} entityId={b.id} />
      </div>
      <div className="space-y-6">
        <Card>
          <CardHeader title={t("applicationStatus")} />
          <CardBody className="space-y-4">
            <Badge tone={b.status === "approved" ? "success" : b.status === "pending" ? "info" : "danger"}>{te(`businessStatus.${b.status}`)}</Badge>
            {b.status_reason ? <p className="text-sm text-muted-foreground">{b.status_reason}</p> : null}
            {b.reviewed_at ? <p className="text-xs text-muted-foreground">{formatDateTime(b.reviewed_at, locale)}</p> : null}
            {isAdmin ? moves.map((to) => (
              <ActionForm key={to} action={setBusinessStatusAction} hidden={{ kind, id: b.id, status: to }}
                submitLabel={t(`setStatus.${to}` as Parameters<typeof t>[0])} variant={to === "approved" ? "primary" : "danger"} size="sm"
                confirmMessage={to === "approved" ? undefined : t("confirmAction")}>
                {to !== "approved" ? <Textarea name="reason" rows={2} maxLength={1000} aria-label={t("reasonRequired")} placeholder={t("reasonVisibleToApplicant")} required /> : (
                  <p className="text-xs text-muted-foreground">{t("approveHint")}</p>
                )}
              </ActionForm>
            )) : <p className="text-xs text-muted-foreground">{t("adminOnlyApproval")}</p>}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
