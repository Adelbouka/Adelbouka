import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { requireViewer } from "@/lib/auth";
import { countryOptions } from "@/lib/queries/business";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { BusinessProfileForm } from "@/components/business/business-profile-form";

export default async function SupplierApply({ params }: PageProps<"/[locale]/supplier/apply">) {
  const locale = await resolveLocale(params);
  const viewer = await requireViewer(locale, "/supplier/apply");
  if (viewer.supplier) redirect({ href: "/supplier", locale });
  const t = await getTranslations("supplier");
  return (
    <div>
      <PageHeader title={t("applyTitle")} description={t("applySubtitle")} />
      <Card className="p-5">
        <BusinessProfileForm kind="supplier" isNew countries={countryOptions(locale)} defaults={{ contact_email: viewer.email ?? "", contact_name: viewer.fullName ?? "" }} />
      </Card>
    </div>
  );
}
