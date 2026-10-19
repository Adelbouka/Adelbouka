import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { requireViewer } from "@/lib/auth";
import { countryOptions, serviceCategoryOptions } from "@/lib/queries/business";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { BusinessProfileForm } from "@/components/business/business-profile-form";

export default async function PartnerApply({ params }: PageProps<"/[locale]/partner/apply">) {
  const locale = await resolveLocale(params);
  const viewer = await requireViewer(locale, "/partner/apply");
  if (viewer.partner) redirect({ href: "/partner", locale });
  const [t, categories] = await Promise.all([getTranslations("partner"), serviceCategoryOptions(locale)]);
  return (
    <div>
      <PageHeader title={t("applyTitle")} description={t("applySubtitle")} />
      <Card className="p-5">
        <BusinessProfileForm kind="partner" isNew countries={countryOptions(locale)} categories={categories}
          defaults={{ contact_email: viewer.email ?? "", contact_name: viewer.fullName ?? "" }} />
      </Card>
    </div>
  );
}
