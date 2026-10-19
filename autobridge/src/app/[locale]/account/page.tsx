import { ArrowLeft, Building2, Handshake } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader, Stat } from "@/components/ui/misc";
import { RequestStatusBadge } from "@/components/requests/status";
import { notificationText } from "@/components/notifications/notification-text";

export default async function AccountOverview({ params, searchParams }: PageProps<"/[locale]/account">) {
  const locale = await resolveLocale(params);
  const viewer = await requireViewer(locale, "/account");
  const { notice } = await searchParams;
  const supabase = await createClient();
  const [t, requests, openCount, favorites, notifications] = await Promise.all([
    getTranslations("account"),
    supabase.from("purchase_requests").select("id, reference, status, created_at, request_type").eq("customer_id", viewer.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("purchase_requests").select("id", { count: "exact", head: true }).eq("customer_id", viewer.id).not("status", "in", "(completed,cancelled,rejected)"),
    supabase.from("favorites").select("vehicle_id", { count: "exact", head: true }).eq("user_id", viewer.id),
    supabase.from("notifications").select("id, type, params, link, created_at, read_at").eq("user_id", viewer.id).order("created_at", { ascending: false }).limit(5),
  ]);
  const notes = await Promise.all((notifications.data ?? []).map(async (n) => ({ ...n, text: await notificationText(n.type, n.params) })));

  return (
    <div className="space-y-6">
      <PageHeader title={t("welcome", { name: viewer.fullName ?? viewer.email ?? "" })} description={t("overviewSubtitle")}
        actions={<Link href="/requests/new" className={buttonClasses("primary")}>{t("newRequest")}</Link>} />
      {notice === "password_updated" ? <Alert tone="success">{t("passwordUpdated")}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label={t("openRequests")} value={openCount.count ?? 0} />
        <Stat label={t("savedVehicles")} value={favorites.count ?? 0} />
        <Stat label={t("unreadNotifications")} value={viewer.unreadNotifications} />
      </div>
      <Card>
        <CardHeader title={t("recentRequests")} actions={<Link href="/account/requests" className="text-sm text-primary hover:underline">{t("viewAll")}</Link>} />
        {requests.data?.length ? (
          <ul className="divide-y divide-border">
            {requests.data.map((r) => (
              <li key={r.id}>
                <Link href={`/account/requests/${r.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-muted/50">
                  <span className="font-medium ltr-nums">{r.reference}</span>
                  <RequestStatusBadge status={r.status} />
                </Link>
              </li>
            ))}
          </ul>
        ) : <div className="p-5"><EmptyState title={t("noRequests")} description={t("noRequestsText")} action={<Link href="/vehicles" className={buttonClasses("secondary")}>{t("browse")}</Link>} /></div>}
      </Card>
      {notes.length ? (
        <Card>
          <CardHeader title={t("latestNotifications")} actions={<Link href="/account/notifications" className="text-sm text-primary hover:underline">{t("viewAll")}</Link>} />
          <ul className="divide-y divide-border">
            {notes.map((n) => (
              <li key={n.id} className="px-5 py-3 text-sm">
                <p className={n.read_at ? "text-muted-foreground" : "font-medium"}>{n.text}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(n.created_at, locale)}</p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      {!viewer.supplier || !viewer.partner ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {!viewer.supplier ? (
            <Link href="/supplier/apply" className="group flex items-start gap-3 rounded-xl border border-border bg-surface p-4 hover:border-primary">
              <Building2 className="mt-0.5 size-5 text-primary" aria-hidden="true" />
              <span><span className="flex items-center gap-1 font-medium">{t("becomeSupplier")}<ArrowLeft className="size-4 ltr:rotate-180" aria-hidden="true" /></span><span className="text-sm text-muted-foreground">{t("becomeSupplierText")}</span></span>
            </Link>
          ) : null}
          {!viewer.partner ? (
            <Link href="/partner/apply" className="group flex items-start gap-3 rounded-xl border border-border bg-surface p-4 hover:border-primary">
              <Handshake className="mt-0.5 size-5 text-primary" aria-hidden="true" />
              <span><span className="flex items-center gap-1 font-medium">{t("becomePartner")}<ArrowLeft className="size-4 ltr:rotate-180" aria-hidden="true" /></span><span className="text-sm text-muted-foreground">{t("becomePartnerText")}</span></span>
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
