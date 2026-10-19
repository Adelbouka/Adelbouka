import { getLocale, getTranslations } from "next-intl/server";
import type { FeeKind, FeeParty, QuotationStatus } from "@/lib/domain/enums";
import { formatDate, formatMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { QuotationStatusBadge } from "./status";

export type QuotationWithItems = {
  id: string;
  reference: string;
  status: QuotationStatus;
  currency: string;
  total_amount: number;
  valid_until: string;
  terms: string | null;
  message_to_customer: string | null;
  submitted_at: string;
  sent_at: string | null;
  rejection_reason?: string | null;
  decline_reason?: string | null;
  quotation_items: { id: string; position: number; kind: FeeKind; description: string; amount: number; payee: FeeParty; is_estimate: boolean }[];
};

export async function QuotationView({ quotation, actions }: { quotation: QuotationWithItems; actions?: React.ReactNode }) {
  const [t, te, locale] = await Promise.all([getTranslations("requests"), getTranslations("enums"), getLocale()]);
  const items = [...quotation.quotation_items].sort((a, b) => a.position - b.position);
  const hasEstimates = items.some((i) => i.is_estimate);
  return (
    <article className="rounded-xl border border-border bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <p className="font-semibold ltr-nums">{quotation.reference}</p>
          <p className="text-xs text-muted-foreground">
            {t("validUntil", { date: formatDate(quotation.valid_until, locale) })}
            {quotation.sent_at ? ` · ${t("sentOn", { date: formatDate(quotation.sent_at, locale) })}` : ""}
          </p>
        </div>
        <QuotationStatusBadge status={quotation.status} validUntil={quotation.valid_until} />
      </header>
      {quotation.message_to_customer ? <p className="border-b border-border px-4 py-3 text-sm">{quotation.message_to_customer}</p> : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-surface-muted/60 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-start font-medium">{t("item")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("payee")}</th>
              <th className="px-4 py-2 text-end font-medium">{t("amount")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-border">
                <td className="px-4 py-2.5">
                  <div className="font-medium">{te(`feeKind.${item.kind}`)}</div>
                  <div className="text-xs text-muted-foreground">{item.description}</div>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{te(`feeParty.${item.payee}`)}</td>
                <td className="px-4 py-2.5 text-end ltr-nums">
                  {formatMoney(item.amount, quotation.currency, locale)}
                  {item.is_estimate ? <div><Badge tone="warning">{t("estimateLine")}</Badge></div> : null}
                </td>
              </tr>
            ))}
            <tr className="border-t border-border bg-surface-muted/60 font-semibold">
              <td className="px-4 py-2.5" colSpan={2}>{t("quotationTotal")}</td>
              <td className="px-4 py-2.5 text-end ltr-nums">{formatMoney(quotation.total_amount, quotation.currency, locale)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="space-y-2 px-4 py-3 text-xs text-muted-foreground">
        {quotation.terms ? <p><span className="font-medium text-foreground">{t("terms")}: </span>{quotation.terms}</p> : null}
        {quotation.rejection_reason ? <p><span className="font-medium text-foreground">{t("staffReason")}: </span>{quotation.rejection_reason}</p> : null}
        {quotation.decline_reason ? <p><span className="font-medium text-foreground">{t("declineReasonLabel")}: </span>{quotation.decline_reason === "another_quotation_accepted" ? t("anotherAccepted") : quotation.decline_reason}</p> : null}
        {hasEstimates ? <p>{t("estimatesNotice")}</p> : null}
        <p>{t("notGuaranteed")}</p>
      </div>
      {actions ? <footer className="border-t border-border px-4 py-3">{actions}</footer> : null}
    </article>
  );
}
