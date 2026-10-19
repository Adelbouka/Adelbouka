import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney } from "@/lib/format";
import { deleteEstimateAction } from "@/lib/actions/account";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState, PageHeader, Table } from "@/components/ui/misc";
import { ActionForm } from "@/components/forms/action-form";

export default async function EstimatesPage({ params }: PageProps<"/[locale]/account/estimates">) {
  const locale = await resolveLocale(params);
  const viewer = await requireViewer(locale, "/account/estimates");
  const supabase = await createClient();
  const [t, tc, { data }] = await Promise.all([
    getTranslations("account"), getTranslations("common"),
    supabase.from("cost_estimates").select("id, total_amount, total_currency, completeness, created_at, inputs, cost_rule_sets(version)").eq("user_id", viewer.id).order("created_at", { ascending: false }),
  ]);
  return (
    <div>
      <PageHeader title={t("navEstimates")} description={t("estimatesSubtitle")} actions={<Link href="/estimate" className={buttonClasses("secondary")}>{t("newEstimate")}</Link>} />
      {data?.length ? (
        <Table>
          <thead><tr><th>{tc("date")}</th><th>{t("vehiclePrice")}</th><th>{t("estimatedTotal")}</th><th>{t("completeness")}</th><th>{tc("actions")}</th></tr></thead>
          <tbody>
            {data.map((e) => {
              const inputs = e.inputs as { price?: number; currency?: string };
              return (
                <tr key={e.id}>
                  <td>{formatDate(e.created_at, locale, "medium")}</td>
                  <td className="ltr-nums">{inputs.price ? formatMoney(inputs.price, inputs.currency ?? "EUR", locale) : "—"}</td>
                  <td className="font-medium ltr-nums">{formatMoney(e.total_amount, e.total_currency, locale)}</td>
                  <td className="ltr-nums">{e.completeness}%{e.cost_rule_sets ? <span className="text-xs text-muted-foreground"> · v{e.cost_rule_sets.version}</span> : null}</td>
                  <td>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={{ pathname: "/requests/new", query: { estimate: e.id } }} className={buttonClasses("secondary", "sm")}>{t("useInRequest")}</Link>
                      <ActionForm action={deleteEstimateAction} hidden={{ id: e.id }} submitLabel={tc("delete")} variant="ghost" size="sm" inline />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      ) : <EmptyState title={t("noEstimates")} action={<Link href="/estimate" className={buttonClasses("secondary")}>{t("newEstimate")}</Link>} />}
    </div>
  );
}
