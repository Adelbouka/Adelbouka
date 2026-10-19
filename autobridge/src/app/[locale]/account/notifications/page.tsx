import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { markAllNotificationsReadAction } from "@/lib/actions/account";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { notificationText } from "@/components/notifications/notification-text";
import { cn } from "@/lib/utils";

export default async function NotificationsPage({ params }: PageProps<"/[locale]/account/notifications">) {
  const locale = await resolveLocale(params);
  const viewer = await requireViewer(locale, "/account/notifications");
  const supabase = await createClient();
  const t = await getTranslations("account");
  const { data } = await supabase.from("notifications").select("id, type, params, link, read_at, created_at").eq("user_id", viewer.id).order("created_at", { ascending: false }).limit(100);
  const items = await Promise.all((data ?? []).map(async (n) => ({ ...n, text: await notificationText(n.type, n.params) })));
  const hasUnread = items.some((n) => !n.read_at);
  return (
    <div>
      <PageHeader title={t("navNotifications")} description={t("notificationsSubtitle")}
        actions={hasUnread ? (
          <form action={async () => { "use server"; await markAllNotificationsReadAction(); }}>
            <Button type="submit" variant="secondary">{t("markAllRead")}</Button>
          </form>
        ) : undefined} />
      {items.length ? (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {items.map((n) => (
            <li key={n.id} className={cn("flex items-start gap-3 px-5 py-4", !n.read_at && "bg-primary-soft/40")}>
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-accent")} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm", !n.read_at && "font-medium")}>
                  {n.link ? <Link href={n.link} className="hover:underline">{n.text}</Link> : n.text}
                  {!n.read_at ? <span className="sr-only"> ({t("unread")})</span> : null}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(n.created_at, locale)}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : <EmptyState title={t("noNotifications")} />}
    </div>
  );
}
