import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { archiveExpiredAction } from "@/lib/actions/admin";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader, Stat } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";

type Overview = Record<string, number>;

export default async function AdminOverview({ params }: PageProps<"/[locale]/admin">) {
  const locale = await resolveLocale(params);
  const supabase = await createClient();
  const [t, overview, audit] = await Promise.all([
    getTranslations("admin"),
    supabase.rpc("admin_overview"),
    supabase.from("audit_logs").select("id, action, entity_type, entity_id, created_at, profiles(full_name, email)").order("created_at", { ascending: false }).limit(12),
  ]);
  const o = (overview.data ?? {}) as Overview;
  const stats: { key: string; href: string }[] = [
    { key: "vehicles_total", href: "/admin/vehicles?status=all" },
    { key: "vehicles_available", href: "/admin/vehicles?status=published" },
    { key: "vehicles_pending", href: "/admin/vehicles" },
    { key: "suppliers_pending", href: "/admin/suppliers" },
    { key: "partners_pending", href: "/admin/partners" },
    { key: "requests_new", href: "/admin/requests?status=submitted" },
    { key: "requests_open", href: "/admin/requests" },
    { key: "quotations_open", href: "/admin/requests?status=quotation_received" },
    { key: "requests_completed", href: "/admin/requests?status=completed" },
    { key: "reports_open", href: "/admin/reports" },
    { key: "documents_expiring", href: "/admin/suppliers" },
    { key: "data_requests_open", href: "/admin/users" },
    { key: "contact_messages_new", href: "/admin/users" },
  ];
  return (
    <div className="space-y-6">
      <PageHeader title={t("overviewTitle")} description={t("overviewSubtitle")}
        actions={<form action={async () => { "use server"; await archiveExpiredAction(); }}><Button type="submit" variant="secondary" size="sm">{t("archiveExpired")}</Button></form>} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.key} href={s.href} className="block rounded-xl transition-shadow hover:shadow-md">
            <Stat label={t(`stats.${s.key}` as Parameters<typeof t>[0])} value={o[s.key] ?? 0} />
          </Link>
        ))}
      </div>
      <Card>
        <CardHeader title={t("recentActivity")} actions={<Link href="/admin/audit" className="text-sm text-primary hover:underline">{t("viewAll")}</Link>} />
        <ul className="divide-y divide-border text-sm">
          {(audit.data ?? []).map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5">
              <span><span className="font-mono text-xs">{a.action}</span> <span className="text-muted-foreground">· {a.entity_type}</span></span>
              <span className="text-xs text-muted-foreground">{a.profiles?.full_name ?? a.profiles?.email ?? t("system")} · {formatDateTime(a.created_at, locale)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
