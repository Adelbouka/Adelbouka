import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { activeCurrencies } from "@/lib/queries/business";
import { parseSnapshot } from "@/lib/domain/snapshot";
import { withdrawQuotationAction } from "@/lib/actions/supplier";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { ActionForm } from "@/components/forms/action-form";
import { RequestStatusBadge } from "@/components/requests/status";
import { RequestSummary } from "@/components/requests/request-summary";
import { QuotationView, type QuotationWithItems } from "@/components/requests/quotation-view";
import { QuotationForm } from "@/components/supplier/quotation-form";

export default async function SupplierRequestPage({ params }: PageProps<"/[locale]/supplier/requests/[id]">) {
  const locale = await resolveLocale(params);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const viewer = await requireViewer(locale, `/supplier/requests/${id}`);
  const supabase = await createClient();
  const { data: r } = await supabase.from("supplier_purchase_requests").select("*").eq("id", id).maybeSingle();
  if (!r || !r.id || !r.status) notFound();
  const [t, currencies, quotes, make, pathway] = await Promise.all([
    getTranslations("supplier"), activeCurrencies(),
    supabase.from("quotations").select("id, reference, status, currency, total_amount, valid_until, terms, message_to_customer, submitted_at, sent_at, rejection_reason, decline_reason, quotation_items(id, position, kind, description, amount, payee, is_estimate)").eq("request_id", id).eq("supplier_id", viewer.supplier?.id ?? "").order("submitted_at", { ascending: false }),
    r.desired_make_id ? supabase.from("vehicle_makes").select("name").eq("id", r.desired_make_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("acquisition_pathways").select("name_ar, name_fr").eq("code", r.pathway_code ?? "").maybeSingle(),
  ]);
  const snapshot = parseSnapshot(r.vehicle_snapshot);
  const canQuote = ["supplier_contacted", "quotation_received", "awaiting_customer_decision"].includes(r.status);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<Link href="/supplier/requests" className="hover:text-foreground">← {t("navRequests")}</Link>}
        title={<span className="flex flex-wrap items-center gap-3"><span className="ltr-nums">{r.reference}</span><RequestStatusBadge status={r.status} /></span>}
      />
      <Card>
        <CardHeader title={t("requestDetails")} description={t("requestsPrivacy")} />
        <CardBody>
          <RequestSummary r={{
            request_type: r.request_type ?? "custom_search", vehicle: snapshot, desired_make: make.data?.name ?? null,
            desired_model: r.desired_model, year_min: r.year_min, year_max: r.year_max, max_mileage_km: r.max_mileage_km,
            desired_fuel: r.desired_fuel, desired_transmission: r.desired_transmission, preferences: r.preferences,
            budget_amount: r.budget_amount, budget_currency: r.budget_currency ?? "DZD",
            pathway_name: pathway.data ? (locale === "fr" ? pathway.data.name_fr : pathway.data.name_ar) : null,
            wilaya: r.wilaya ?? "", message: r.message,
          }} />
        </CardBody>
      </Card>
      {quotes.data?.length ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">{t("myQuotations")}</h2>
          {quotes.data.map((q) => (
            <QuotationView key={q.id} quotation={q as unknown as QuotationWithItems} actions={q.status === "submitted" || q.status === "sent" ? (
              <ActionForm action={withdrawQuotationAction} hidden={{ quotationId: q.id }} submitLabel={t("withdraw")} variant="ghost" size="sm" inline confirmMessage={t("withdrawConfirm")} />
            ) : undefined} />
          ))}
        </section>
      ) : null}
      {canQuote ? (
        <Card>
          <CardHeader title={t("newQuotation")} description={t("newQuotationHint")} />
          <CardBody>
            <QuotationForm requestId={r.id} currencies={currencies} defaultCurrency={snapshot?.price_currency ?? "EUR"}
              allowedKinds={["vehicle_price", "domestic_transport", "international_shipping", "insurance", "inspection", "documentation_admin", "taxes_and_customs", "other"]} />
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
