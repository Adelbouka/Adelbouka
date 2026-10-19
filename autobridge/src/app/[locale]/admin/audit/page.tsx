import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { PageHeader, Table } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";

const PAGE = 50;

export default async function AdminAudit({ params, searchParams }: PageProps<"/[locale]/admin/audit">) {
  const locale = await resolveLocale(params);
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const supabase = await createClient();
  const [t, { data, count }] = await Promise.all([
    getTranslations("admin"),
    supabase.from("audit_logs").select("id, action, entity_type, entity_id, details, created_at, profiles(full_name, email)", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1),
  ]);
  return (
    <div>
      <PageHeader title={t("navAudit")} description={t("auditSubtitle")} />
      <Table>
        <thead><tr><th>{t("date")}</th><th>{t("actor")}</th><th>{t("action")}</th><th>{t("entity")}</th><th>{t("details")}</th></tr></thead>
        <tbody>
          {(data ?? []).map((a) => (
            <tr key={a.id} className="align-top">
              <td className="whitespace-nowrap text-muted-foreground">{formatDateTime(a.created_at, locale)}</td>
              <td>{a.profiles?.full_name ?? a.profiles?.email ?? t("system")}</td>
              <td className="font-mono text-xs">{a.action}</td>
              <td className="text-xs">{a.entity_type}<div className="font-mono text-muted-foreground">{a.entity_id?.slice(0, 8)}</div></td>
              <td className="max-w-xs truncate font-mono text-xs text-muted-foreground" dir="ltr">{JSON.stringify(a.details)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Pagination page={page} pageSize={PAGE} total={count ?? 0} hrefFor={(p) => `/admin/audit?page=${p}`} />
    </div>
  );
}
