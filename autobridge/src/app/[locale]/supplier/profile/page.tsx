import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { requireViewer } from "@/lib/auth";
import { countryOptions, getMySupplier } from "@/lib/queries/business";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { BusinessProfileForm } from "@/components/business/business-profile-form";

export default async function SupplierProfile({ params }: PageProps<"/[locale]/supplier/profile">) {
  const locale = await resolveLocale(params);
  const viewer = await requireViewer(locale, "/supplier/profile");
  const s = await getMySupplier(viewer.id);
  if (!s) redirect({ href: "/supplier/apply", locale });
  const t = await getTranslations("supplier");
  return (
    <div>
      <PageHeader title={t("navProfile")} description={t("profileSubtitle")} />
      {s!.status === "suspended" ? <Alert tone="danger" className="mb-4">{t("statusSuspendedTitle")}</Alert> : (
        <Card className="p-5"><BusinessProfileForm kind="supplier" isNew={false} countries={countryOptions(locale)} defaults={s!} /></Card>
      )}
    </div>
  );
}
