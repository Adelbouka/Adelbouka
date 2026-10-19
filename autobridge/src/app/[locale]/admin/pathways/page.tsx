import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { updatePathwayAction } from "@/lib/actions/admin";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Checkbox, Input, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/misc";
import { ActionForm } from "@/components/forms/action-form";

export default async function AdminPathways({ params }: PageProps<"/[locale]/admin/pathways">) {
  const locale = await resolveLocale(params);
  await requireAdmin(locale);
  const supabase = await createClient();
  const [t, tc, { data }] = await Promise.all([
    getTranslations("admin"), getTranslations("common"),
    supabase.from("acquisition_pathways").select("*").order("position"),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title={t("navPathways")} description={t("pathwaysSubtitle")} />
      <Alert tone="warning">{t("pathwaysWarning")}</Alert>
      {(data ?? []).map((p) => (
        <Card key={p.code}>
          <CardHeader title={locale === "fr" ? p.name_fr : p.name_ar}
            description={p.last_reviewed_at ? t("lastLegalReview", { date: formatDate(p.last_reviewed_at, locale) }) : t("neverReviewed")}
            actions={<Badge tone={p.is_enabled ? "success" : "danger"}>{p.is_enabled ? t("enabled") : t("disabled")}</Badge>} />
          <CardBody>
            <ActionForm action={updatePathwayAction} hidden={{ code: p.code }} submitLabel={tc("save")}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input name="nameAr" defaultValue={p.name_ar} aria-label={t("labelAr")} dir="rtl" required />
                <Input name="nameFr" defaultValue={p.name_fr} aria-label={t("labelFr")} required />
                <Textarea name="descriptionAr" defaultValue={p.description_ar} rows={3} aria-label={t("descriptionAr")} dir="rtl" />
                <Textarea name="descriptionFr" defaultValue={p.description_fr} rows={3} aria-label={t("descriptionFr")} />
                <Input name="disabledMessageAr" defaultValue={p.disabled_message_ar ?? ""} placeholder={t("disabledMessageAr")} aria-label={t("disabledMessageAr")} dir="rtl" />
                <Input name="disabledMessageFr" defaultValue={p.disabled_message_fr ?? ""} placeholder={t("disabledMessageFr")} aria-label={t("disabledMessageFr")} />
              </div>
              <Input name="legalReference" defaultValue={p.legal_reference ?? ""} placeholder={t("legalReference")} aria-label={t("legalReference")} />
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2"><Checkbox name="isEnabled" defaultChecked={p.is_enabled} />{t("enabled")}</label>
                <label className="flex items-center gap-2"><Checkbox name="requiresLegalReview" defaultChecked={p.requires_legal_review} />{t("requiresLegalReview")}</label>
                <label className="flex items-center gap-2"><Checkbox name="markReviewed" />{t("markReviewedToday")}</label>
              </div>
            </ActionForm>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
