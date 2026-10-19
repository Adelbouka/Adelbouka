import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney } from "@/lib/format";
import { parseSnapshot, snapshotTitle } from "@/lib/domain/snapshot";
import { Alert } from "@/components/ui/alert";
import { EmptyState, PageHeader, Table } from "@/components/ui/misc";
import { RequestStatusBadge } from "@/components/requests/status";

export default async function SupplierRequests({ params }: PageProps<"/[locale]/supplier/requests">) {
  const locale = await resolveLocale(params);
  const viewer = await requireViewer(locale, "/supplier/requests");
  if (!viewer.supplier) redirect({ href: "/supplier/apply", locale });
  const supabase = await createClient();
  const [t, { data }] = await Promise.all([
    getTranslations("supplier"),
    supabase.from("supplier_purchase_requests").select("id, reference, status, request_type, vehicle_snapshot, desired_model, budget_amount, budget_currency, wilaya, created_at").order("created_at", { ascending: false }),
  ]);
  return (
    <div>
      <PageHeader title={t("navRequests")} description={t("requestsSubtitle")} />
      <Alert tone="info" className="mb-4">{t("requestsPrivacy")}</Alert>
      {data?.length ? (
        <Table>
          <thead><tr><th>{t("reference")}</th><th>{t("vehicle")}</th><th>{t("budget")}</th><th>{t("wilaya")}</th><th>{t("status")}</th><th>{t("received")}</th></tr></thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.id}>
                <td><Link href={`/supplier/requests/${r.id}`} className="font-medium text-primary hover:underline ltr-nums">{r.reference}</Link></td>
                <td>{snapshotTitle(parseSnapshot(r.vehicle_snapshot)) || r.desired_model || "—"}</td>
                <td className="ltr-nums">{r.budget_amount ? formatMoney(r.budget_amount, r.budget_currency ?? "DZD", locale) : "—"}</td>
                <td>{r.wilaya}</td>
                <td>{r.status ? <RequestStatusBadge status={r.status} /> : null}</td>
                <td className="text-muted-foreground">{formatDate(r.created_at, locale, "medium")}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : <EmptyState title={t("noRequests")} description={t("noRequestsText")} />}
    </div>
  );
}
