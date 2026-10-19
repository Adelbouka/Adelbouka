import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { addMakeAction, deleteFaqAction, publishLegalDocumentAction, saveFaqAction, saveServiceCategoryAction, saveSettingsAction } from "@/lib/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/misc";
import { ActionForm } from "@/components/forms/action-form";

export default async function AdminContent({ params }: PageProps<"/[locale]/admin/content">) {
  const locale = await resolveLocale(params);
  await requireAdmin(locale);
  const supabase = await createClient();
  const [t, tc, settings, faqs, docs, categories, makes] = await Promise.all([
    getTranslations("admin"), getTranslations("common"),
    supabase.from("site_settings").select("key, value"),
    supabase.from("faqs").select("*").order("position"),
    supabase.from("legal_documents").select("id, slug, locale, version, title, body, published_at").order("version", { ascending: false }),
    supabase.from("service_categories").select("*").order("position"),
    supabase.from("vehicle_makes").select("name").order("name"),
  ]);
  const setting = (k: string) => {
    const v = settings.data?.find((s) => s.key === k)?.value;
    return v == null ? "" : String(v);
  };
  const latestDoc = (slug: string, loc: string) => docs.data?.find((d) => d.slug === slug && d.locale === loc);
  const textKeys = ["contact.email", "contact.phone", "contact.address", "contact.hours", "homepage.hero_title_ar", "homepage.hero_title_fr", "homepage.hero_subtitle_ar", "homepage.hero_subtitle_fr", "listing.validity_days", "listing.stale_after_days"];
  return (
    <div className="space-y-6">
      <PageHeader title={t("navContent")} description={t("contentSubtitle")} />
      <Card>
        <CardHeader title={t("settings")} description={t("settingsHint")} />
        <CardBody>
          <ActionForm action={saveSettingsAction} submitLabel={tc("save")} successMessage={tc("saved")}>
            <div className="grid gap-3 sm:grid-cols-2">
              {textKeys.map((k) => (
                <div key={k}>
                  <label htmlFor={k} className="mb-1 block font-mono text-xs text-muted-foreground">{k}</label>
                  <Input id={k} name={k} defaultValue={setting(k)} dir={k.endsWith("_ar") ? "rtl" : k.startsWith("contact.email") || k.startsWith("contact.phone") || k.startsWith("listing") ? "ltr" : undefined} />
                </div>
              ))}
              <div>
                <label htmlFor="notifications.email_enabled" className="mb-1 block font-mono text-xs text-muted-foreground">notifications.email_enabled</label>
                <Select id="notifications.email_enabled" name="notifications.email_enabled" defaultValue={setting("notifications.email_enabled") || "true"}>
                  <option value="true">{tc("yes")}</option><option value="false">{tc("no")}</option>
                </Select>
              </div>
            </div>
          </ActionForm>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("faq")} />
        <CardBody className="space-y-4">
          {(faqs.data ?? []).map((f) => (
            <details key={f.id} className="rounded-lg border border-border p-3">
              <summary className="cursor-pointer text-sm font-medium">{locale === "fr" ? f.question_fr : f.question_ar} {f.is_published ? null : <Badge>{t("hidden")}</Badge>}</summary>
              <div className="mt-3 space-y-2">
                <FaqFields f={f} t={t} saveLabel={tc("save")} />
                <ActionForm action={deleteFaqAction} hidden={{ id: f.id }} submitLabel={tc("delete")} variant="ghost" size="sm" inline confirmMessage={t("confirmAction")} />
              </div>
            </details>
          ))}
          <details className="rounded-lg border border-dashed border-border-strong p-3">
            <summary className="cursor-pointer text-sm font-medium text-primary">{t("addFaq")}</summary>
            <div className="mt-3"><FaqFields t={t} saveLabel={t("addFaq")} /></div>
          </details>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("legalDocuments")} description={t("legalDocumentsHint")} />
        <CardBody className="space-y-4">
          {(["terms", "privacy", "disclosure"] as const).flatMap((slug) => (["ar", "fr"] as const).map((loc) => {
            const d = latestDoc(slug, loc);
            return (
              <details key={`${slug}-${loc}`} className="rounded-lg border border-border p-3">
                <summary className="cursor-pointer text-sm font-medium">{slug} · {loc} {d ? <span className="text-xs text-muted-foreground">v{d.version} · {formatDate(d.published_at, locale, "medium")}</span> : null}</summary>
                <div className="mt-3">
                  <ActionForm action={publishLegalDocumentAction} hidden={{ slug, locale: loc }} submitLabel={t("publishNewVersion")}>
                    <Input name="title" defaultValue={d?.title ?? ""} aria-label={t("docTitle")} dir={loc === "ar" ? "rtl" : "ltr"} required />
                    <Textarea name="body" defaultValue={d?.body ?? ""} rows={12} aria-label={t("body")} dir={loc === "ar" ? "rtl" : "ltr"} className="font-mono text-xs" required />
                    <p className="text-xs text-muted-foreground">{t("markdownHint")}</p>
                  </ActionForm>
                </div>
              </details>
            );
          }))}
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("serviceCategories")} />
          <CardBody className="space-y-3">
            <ul className="space-y-1 text-sm">
              {(categories.data ?? []).map((c) => <li key={c.code}><span className="font-mono text-xs">{c.code}</span> · {locale === "fr" ? c.name_fr : c.name_ar} {c.is_active ? null : <Badge>{t("hidden")}</Badge>}</li>)}
            </ul>
            <ActionForm action={saveServiceCategoryAction} submitLabel={tc("save")} variant="secondary" size="sm">
              <div className="grid gap-2 sm:grid-cols-3">
                <Input name="code" placeholder="code" aria-label="code" dir="ltr" required />
                <Input name="nameAr" placeholder={t("labelAr")} aria-label={t("labelAr")} dir="rtl" required />
                <Input name="nameFr" placeholder={t("labelFr")} aria-label={t("labelFr")} required />
              </div>
              <label className="flex items-center gap-2 text-sm"><Checkbox name="isActive" defaultChecked />{t("active")}</label>
            </ActionForm>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={t("makes")} />
          <CardBody className="space-y-3">
            <p className="text-sm text-muted-foreground">{(makes.data ?? []).map((m) => m.name).join(" · ")}</p>
            <ActionForm action={addMakeAction} submitLabel={t("addMake")} variant="secondary" size="sm" inline>
              <Input name="name" aria-label={t("addMake")} className="w-56" required />
            </ActionForm>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function FaqFields({ f, t, saveLabel }: {
  f?: { id: string; question_ar: string; question_fr: string; answer_ar: string; answer_fr: string; position: number; is_published: boolean };
  t: (key: "questionAr" | "questionFr" | "answerAr" | "answerFr" | "position" | "published") => string;
  saveLabel: string;
}) {
  return (
    <ActionForm action={saveFaqAction} hidden={f ? { id: f.id } : undefined} submitLabel={saveLabel} size="sm">
      <div className="grid gap-2 sm:grid-cols-2">
        <Input name="questionAr" defaultValue={f?.question_ar} placeholder={t("questionAr")} aria-label={t("questionAr")} dir="rtl" required />
        <Input name="questionFr" defaultValue={f?.question_fr} placeholder={t("questionFr")} aria-label={t("questionFr")} required />
        <Textarea name="answerAr" defaultValue={f?.answer_ar} rows={3} placeholder={t("answerAr")} aria-label={t("answerAr")} dir="rtl" required />
        <Textarea name="answerFr" defaultValue={f?.answer_fr} rows={3} placeholder={t("answerFr")} aria-label={t("answerFr")} required />
      </div>
      <div className="flex items-center gap-4">
        <Input name="position" defaultValue={f?.position ?? 0} aria-label={t("position")} className="w-24" dir="ltr" />
        <label className="flex items-center gap-2 text-sm"><Checkbox name="isPublished" defaultChecked={f?.is_published ?? true} />{t("published")}</label>
      </div>
    </ActionForm>
  );
}
