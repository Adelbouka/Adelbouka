import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney } from "@/lib/format";
import { EmptyState, PageHeader, Table } from "@/components/ui/misc";
import { QuotationStatusBadge } from "@/components/requests/status";

export default async function SupplierQuotations({ params }: PageProps<"/[locale]/supplier/quotations">) {
  const locale = await resolveLocale(params);
  const viewer = await requireViewer(locale, "/supplier/quotations");
  if (!viewer.supplier) redirect({ href: "/supplier/apply", locale });
  const supabase = await createClient();
  const [t, { data }] = await Promise.all([
    getTranslations("supplier"),
    supabase.from("quotations").select("id, reference, request_id, status, currency, total_amount, valid_until, submitted_at, rejection_reason").eq("supplier_id", viewer.supplier!.id).order("submitted_at", { ascending: false }),
  ]);
  return (
    <div>
      <PageHeader title={t("navQuotations")} description={t("quotationsSubtitle")} />
      {data?.length ? (
        <Table>
          <thead><tr><th>{t("reference")}</th><th>{t("total")}</th><th>{t("validUntil")}</th><th>{t("status")}</th><th>{t("submittedOn")}</th></tr></thead>
          <tbody>
            {data.map((q) => (
              <tr key={q.id}>
                <td><Link href={`/supplier/requests/${q.request_id}`} className="font-medium text-primary hover:underline ltr-nums">{q.reference}</Link>
                  {q.rejection_reason ? <p className="text-xs text-muted-foreground">{q.rejection_reason}</p> : null}</td>
                <td className="ltr-nums">{formatMoney(q.total_amount, q.currency, locale)}</td>
                <td>{formatDate(q.valid_until, locale, "medium")}</td>
                <td><QuotationStatusBadge status={q.status} validUntil={q.valid_until} /></td>
                <td className="text-muted-foreground">{formatDate(q.submitted_at, locale, "medium")}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : <EmptyState title={t("noQuotations")} />}
    </div>
  );
}
