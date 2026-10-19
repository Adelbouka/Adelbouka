import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { parseSnapshot, snapshotTitle } from "@/lib/domain/snapshot";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState, PageHeader, Table } from "@/components/ui/misc";
import { RequestStatusBadge } from "@/components/requests/status";

export default async function MyRequestsPage({ params }: PageProps<"/[locale]/account/requests">) {
  const locale = await resolveLocale(params);
  const viewer = await requireViewer(locale, "/account/requests");
  const supabase = await createClient();
  const [t, te, { data }] = await Promise.all([
    getTranslations("account"), getTranslations("enums"),
    supabase.from("purchase_requests")
      .select("id, reference, status, request_type, created_at, updated_at, vehicle_snapshot, vehicle_makes!purchase_requests_desired_make_id_fkey(name), desired_model")
      .eq("customer_id", viewer.id).order("created_at", { ascending: false }),
  ]);
  return (
    <div>
      <PageHeader title={t("navRequests")} description={t("requestsSubtitle")}
        actions={<Link href="/requests/new" className={buttonClasses("primary")}>{t("newRequest")}</Link>} />
      {data?.length ? (
        <Table>
          <thead><tr><th>{t("reference")}</th><th>{t("vehicle")}</th><th>{t("type")}</th><th>{t("status")}</th><th>{t("updated")}</th></tr></thead>
          <tbody>
            {data.map((r) => {
              const vehicle = snapshotTitle(parseSnapshot(r.vehicle_snapshot)) || [r.vehicle_makes?.name, r.desired_model].filter(Boolean).join(" ");
              return (
                <tr key={r.id}>
                  <td><Link href={`/account/requests/${r.id}`} className="font-medium text-primary hover:underline ltr-nums">{r.reference}</Link></td>
                  <td>{vehicle || "—"}</td>
                  <td className="text-muted-foreground">{te(`requestType.${r.request_type as "listed_vehicle" | "custom_search"}`)}</td>
                  <td><RequestStatusBadge status={r.status} /></td>
                  <td className="text-muted-foreground">{formatDate(r.updated_at, locale, "medium")}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      ) : <EmptyState title={t("noRequests")} description={t("noRequestsText")} action={<Link href="/vehicles" className={buttonClasses("secondary")}>{t("browse")}</Link>} />}
    </div>
  );
}
