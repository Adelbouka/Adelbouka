import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { getViewer } from "@/lib/auth";
import { getCostConfig } from "@/lib/queries/costs";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { CostCalculator } from "@/components/cost/cost-calculator";

export async function generateMetadata({ params }: PageProps<"/[locale]/estimate">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "estimate" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: { canonical: `/${locale}/estimate`, languages: { ar: "/ar/estimate", fr: "/fr/estimate" } },
  };
}

export default async function EstimatePage({ params }: PageProps<"/[locale]/estimate">) {
  await resolveLocale(params);
  const [t, config, viewer] = await Promise.all([getTranslations("estimate"), getCostConfig(), getViewer()]);
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <CostCalculator rules={config.rules} rates={config.rates} currencies={config.currencies} ruleSet={config.ruleSet} signedIn={Boolean(viewer)} />
      <Card className="mt-8 p-5">
        <h2 className="text-base font-semibold">{t("methodTitle")}</h2>
        <ul className="mt-3 list-disc space-y-2 ps-5 text-sm leading-relaxed text-muted-foreground">
          <li>{t("method1")}</li>
          <li>{t("method2")}</li>
          <li>{t("method3")}</li>
          <li>{t("method4")}</li>
        </ul>
      </Card>
    </div>
  );
}
