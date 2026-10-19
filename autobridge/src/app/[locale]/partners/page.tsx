import type { Metadata } from "next";
import { Building2, ClipboardCheck, FileLock2, Handshake, ShieldCheck, Ship } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { getViewer } from "@/lib/auth";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";

export async function generateMetadata({ params }: PageProps<"/[locale]/partners">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "pages" });
  return { title: t("partnersTitle"), description: t("partnersSubtitle"), alternates: { canonical: `/${locale}/partners` } };
}

export default async function PartnersPage({ params }: PageProps<"/[locale]/partners">) {
  await resolveLocale(params);
  const [t, viewer] = await Promise.all([getTranslations("pages"), getViewer()]);
  const supplierHref = viewer ? (viewer.supplier ? "/supplier" : "/supplier/apply") : "/auth/sign-up";
  const partnerHref = viewer ? (viewer.partner ? "/partner" : "/partner/apply") : "/auth/sign-up";
  const steps = [
    { icon: ClipboardCheck, title: t("joinStep1"), text: t("joinStep1Text") },
    { icon: FileLock2, title: t("joinStep2"), text: t("joinStep2Text") },
    { icon: ShieldCheck, title: t("joinStep3"), text: t("joinStep3Text") },
  ];
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader title={t("partnersTitle")} description={t("partnersSubtitle")} />
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="flex flex-col p-6">
          <Building2 className="size-6 text-primary" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold">{t("suppliersCardTitle")}</h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{t("suppliersCardText")}</p>
          <Link href={supplierHref} className={buttonClasses("primary", "md", "mt-5 self-start")}>{viewer ? t("applySupplier") : t("createAccountFirst")}</Link>
        </Card>
        <Card className="flex flex-col p-6">
          <div className="flex gap-2 text-primary"><Handshake className="size-6" aria-hidden="true" /><Ship className="size-6" aria-hidden="true" /></div>
          <h2 className="mt-3 text-lg font-semibold">{t("partnersCardTitle")}</h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{t("partnersCardText")}</p>
          <Link href={partnerHref} className={buttonClasses("secondary", "md", "mt-5 self-start")}>{viewer ? t("applyPartner") : t("createAccountFirst")}</Link>
        </Card>
      </div>
      <h2 className="mt-12 text-xl font-semibold">{t("joinProcess")}</h2>
      <ol className="mt-5 grid gap-4 md:grid-cols-3">
        {steps.map((s, i) => (
          <li key={i} className="rounded-xl border border-border bg-surface p-5">
            <s.icon className="size-5 text-primary" aria-hidden="true" />
            <h3 className="mt-3 font-semibold">{s.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
          </li>
        ))}
      </ol>
      <p className="mt-8 text-xs text-muted-foreground">{t("partnersFees")}</p>
    </div>
  );
}
