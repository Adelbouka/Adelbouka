import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { resolveReportAction } from "@/lib/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { ActionForm } from "@/components/forms/action-form";

export default async function AdminReports({ params }: PageProps<"/[locale]/admin/reports">) {
  const locale = await resolveLocale(params);
  const supabase = await createClient();
  const [t, te, { data }] = await Promise.all([
    getTranslations("admin"), getTranslations("enums"),
    supabase.from("listing_reports").select("id, reason, details, status, resolution_note, created_at, vehicle_id, vehicles(model, manufacture_year, vehicle_makes(name))").order("status").order("created_at", { ascending: false }).limit(200),
  ]);
  return (
    <div>
      <PageHeader title={t("navReports")} description={t("reportsSubtitle")} />
      {data?.length ? (
        <ul className="space-y-3">
          {data.map((r) => (
            <li key={r.id} className="rounded-xl border border-border bg-surface p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/admin/vehicles/${r.vehicle_id}`} className="font-medium text-primary hover:underline">{r.vehicles?.vehicle_makes?.name} {r.vehicles?.model} {r.vehicles?.manufacture_year}</Link>
                <Badge tone={r.status === "open" ? "warning" : r.status === "reviewing" ? "info" : "neutral"}>{te(`reportStatus.${r.status as "open"}`)}</Badge>
              </div>
              <p className="mt-1"><span className="font-medium">{te(`reportReason.${r.reason as "other"}`)}</span> · <span className="text-muted-foreground">{formatDateTime(r.created_at, locale)}</span></p>
              {r.details ? <p className="mt-1 text-muted-foreground">{r.details}</p> : null}
              {r.resolution_note ? <p className="mt-1 text-xs">{t("resolution")}: {r.resolution_note}</p> : null}
              {r.status === "open" || r.status === "reviewing" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["reviewing", "resolved", "dismissed"] as const).filter((s) => s !== r.status).map((s) => (
                    <ActionForm key={s} action={resolveReportAction} hidden={{ reportId: r.id, status: s }} submitLabel={te(`reportStatus.${s}`)} variant="secondary" size="sm" inline>
                      {s !== "reviewing" ? <Input name="note" aria-label={t("resolution")} placeholder={t("resolution")} className="h-8 w-48" maxLength={2000} /> : null}
                    </ActionForm>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : <EmptyState title={t("noReports")} />}
    </div>
  );
}
