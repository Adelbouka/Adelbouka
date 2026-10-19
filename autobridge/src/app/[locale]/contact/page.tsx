import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { getViewer } from "@/lib/auth";
import { getPublicSettings } from "@/lib/queries/settings";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { ContactForm } from "@/components/content/contact-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "pages" });
  return { title: t("contactTitle"), alternates: { canonical: `/${locale}/contact` } };
}

export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  await resolveLocale(params);
  const [t, tf, viewer, settings] = await Promise.all([getTranslations("pages"), getTranslations("footer"), getViewer(), getPublicSettings()]);
  const details = [
    ["email", settings["contact.email"]], ["phone", settings["contact.phone"]], ["address", settings["contact.address"]], ["hours", settings["contact.hours"]],
  ].filter(([, v]) => v) as [("email" | "phone" | "address" | "hours"), string][];
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <PageHeader title={t("contactTitle")} description={t("contactSubtitle")} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="p-5"><ContactForm defaults={{ name: viewer?.fullName ?? "", email: viewer?.email ?? "" }} /></Card>
        <aside className="space-y-3 text-sm">
          {details.length ? details.map(([k, v]) => (
            <p key={k}><span className="font-medium">{tf(k)}: </span><span className="text-muted-foreground ltr-nums">{String(v)}</span></p>
          )) : <p className="text-muted-foreground">{t("contactFormOnly")}</p>}
          <p className="text-xs text-muted-foreground">{t("contactPrivacy")}</p>
        </aside>
      </div>
    </div>
  );
}
