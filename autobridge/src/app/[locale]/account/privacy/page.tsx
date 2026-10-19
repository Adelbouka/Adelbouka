import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { createDataRequestAction } from "@/lib/actions/account";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { Select, Textarea } from "@/components/ui/input";
import { ActionForm } from "@/components/forms/action-form";

export default async function PrivacyPage({ params }: PageProps<"/[locale]/account/privacy">) {
  const locale = await resolveLocale(params);
  const viewer = await requireViewer(locale, "/account/privacy");
  const supabase = await createClient();
  const [t, te, { data }] = await Promise.all([
    getTranslations("account"), getTranslations("enums"),
    supabase.from("data_requests").select("id, kind, status, created_at, handled_at").eq("user_id", viewer.id).order("created_at", { ascending: false }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title={t("navPrivacy")} description={t("privacySubtitle")} />
      <Card>
        <CardHeader title={t("dataRequestTitle")} description={t("dataRequestHint")} />
        <CardBody>
          <ActionForm action={createDataRequestAction} submitLabel={t("sendDataRequest")} successMessage={t("dataRequestSent")}>
            <div>
              <label htmlFor="kind" className="mb-1 block text-sm font-medium">{t("dataRequestKind")}</label>
              <Select id="kind" name="kind" defaultValue="access">
                {(["access", "correction", "deletion"] as const).map((k) => <option key={k} value={k}>{te(`dataRequestKind.${k}`)}</option>)}
              </Select>
            </div>
            <div>
              <label htmlFor="details" className="mb-1 block text-sm font-medium">{t("dataRequestDetails")}</label>
              <Textarea id="details" name="details" rows={3} maxLength={2000} />
            </div>
            <p className="text-xs text-muted-foreground">{t("deletionExplain")}</p>
          </ActionForm>
        </CardBody>
      </Card>
      {data?.length ? (
        <Card>
          <CardHeader title={t("myDataRequests")} />
          <ul className="divide-y divide-border">
            {data.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                <span>{te(`dataRequestKind.${d.kind as "access" | "correction" | "deletion"}`)} · <span className="text-muted-foreground">{formatDate(d.created_at, locale, "medium")}</span></span>
                <Badge tone={d.status === "completed" ? "success" : d.status === "rejected" ? "danger" : "info"}>{te(`dataRequestStatus.${d.status as "open" | "in_progress" | "completed" | "rejected"}`)}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      <p className="text-sm text-muted-foreground">
        <Link href="/legal/privacy" className="text-primary hover:underline">{t("readPrivacy")}</Link>
      </p>
    </div>
  );
}
