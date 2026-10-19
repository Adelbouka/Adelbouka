import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { activeCurrencies } from "@/lib/queries/business";
import { formatDate, formatMoney } from "@/lib/format";
import { isoDateInDays } from "@/lib/dates";
import { submitServiceQuoteAction, updateServiceStatusAction } from "@/lib/actions/partner";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { Input, Select, Textarea } from "@/components/ui/input";
import { ActionForm } from "@/components/forms/action-form";

export default async function PartnerServicePage({ params }: PageProps<"/[locale]/partner/services/[id]">) {
  const locale = await resolveLocale(params);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  await requireViewer(locale, `/partner/services/${id}`);
  const supabase = await createClient();
  const { data: s } = await supabase.from("service_requests").select("*, service_categories(name_ar, name_fr)").eq("id", id).maybeSingle();
  if (!s) notFound();
  const [t, te, tc, quotes, currencies] = await Promise.all([
    getTranslations("partner"), getTranslations("enums"), getTranslations("common"),
    supabase.from("service_quotes").select("id, amount, currency, valid_until, notes, status, created_at").eq("service_request_id", id).order("created_at", { ascending: false }),
    activeCurrencies(),
  ]);
  const canQuote = s.status === "requested" || s.status === "quoted";
  const nextStatus = s.status === "accepted" ? "in_progress" : s.status === "in_progress" ? "completed" : null;
  const inTwoWeeks = isoDateInDays(14);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<Link href="/partner/services" className="hover:text-foreground">← {t("navServices")}</Link>}
        title={<span className="flex flex-wrap items-center gap-3"><span className="ltr-nums">{s.reference}</span><Badge tone="info">{te(`serviceStatus.${s.status}`)}</Badge></span>}
        description={`${s.service_categories ? (locale === "fr" ? s.service_categories.name_fr : s.service_categories.name_ar) : ""} · ${formatDate(s.created_at, locale)}`}
      />
      <Card>
        <CardHeader title={t("serviceDetails")} />
        <CardBody><p className="text-sm whitespace-pre-line">{s.description}</p>
          {s.status_note ? <p className="mt-3 text-sm text-muted-foreground">{tc("notes")}: {s.status_note}</p> : null}</CardBody>
      </Card>
      {quotes.data?.length ? (
        <Card>
          <CardHeader title={t("myQuotes")} />
          <ul className="divide-y divide-border">
            {quotes.data.map((q) => (
              <li key={q.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                <span className="font-medium ltr-nums">{formatMoney(q.amount, q.currency, locale)}</span>
                <span className="text-muted-foreground">{t("validUntil", { date: formatDate(q.valid_until, locale, "medium") })}</span>
                <Badge tone={q.status === "accepted" ? "success" : q.status === "declined" ? "danger" : "info"}>{te(`serviceQuoteStatus.${q.status as "submitted" | "accepted" | "declined" | "withdrawn"}`)}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      {canQuote ? (
        <Card>
          <CardHeader title={t("submitQuote")} description={t("submitQuoteHint")} />
          <CardBody>
            <ActionForm action={submitServiceQuoteAction} hidden={{ serviceRequestId: s.id }} submitLabel={t("submitQuote")} successMessage={t("quoteSent")}>
              <div className="grid gap-3 sm:grid-cols-3">
                <div><label htmlFor="amount" className="mb-1 block text-sm font-medium">{tc("amount")}</label><Input id="amount" name="amount" inputMode="decimal" dir="ltr" required /></div>
                <div><label htmlFor="currency" className="mb-1 block text-sm font-medium">{tc("currency")}</label>
                  <Select id="currency" name="currency" defaultValue="EUR">{currencies.map((c) => <option key={c} value={c}>{c}</option>)}</Select></div>
                <div><label htmlFor="validUntil" className="mb-1 block text-sm font-medium">{t("validUntilLabel")}</label><Input id="validUntil" name="validUntil" type="date" dir="ltr" defaultValue={inTwoWeeks} /></div>
              </div>
              <div><label htmlFor="notes" className="mb-1 block text-sm font-medium">{tc("notes")}</label><Textarea id="notes" name="notes" rows={3} maxLength={2000} /></div>
            </ActionForm>
          </CardBody>
        </Card>
      ) : null}
      {nextStatus ? (
        <Card>
          <CardHeader title={t("updateStatus")} />
          <CardBody>
            <ActionForm action={updateServiceStatusAction} hidden={{ serviceRequestId: s.id, status: nextStatus }} submitLabel={t(nextStatus === "in_progress" ? "markInProgress" : "markCompleted")}>
              <label htmlFor="note" className="block text-sm font-medium">{tc("notes")}</label>
              <Textarea id="note" name="note" rows={2} maxLength={1000} />
            </ActionForm>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
