import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { requireViewer } from "@/lib/auth";
import { countryOptions, getMyPartner, serviceCategoryOptions } from "@/lib/queries/business";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { BusinessProfileForm } from "@/components/business/business-profile-form";

export default async function PartnerProfile({ params }: PageProps<"/[locale]/partner/profile">) {
  const locale = await resolveLocale(params);
  const viewer = await requireViewer(locale, "/partner/profile");
  const p = await getMyPartner(viewer.id);
  if (!p) redirect({ href: "/partner/apply", locale });
  const [t, ts, categories] = await Promise.all([getTranslations("partner"), getTranslations("supplier"), serviceCategoryOptions(locale)]);
  return (
    <div>
      <PageHeader title={t("navProfile")} description={ts("profileSubtitle")} />
      {p!.status === "suspended" ? <Alert tone="danger">{ts("statusSuspendedTitle")}</Alert> : (
        <Card className="p-5">
          <BusinessProfileForm kind="partner" isNew={false} countries={countryOptions(locale)} categories={categories}
            defaults={{ ...p!, categories: p!.partner_service_categories.map((c) => c.category_code) }} />
        </Card>
      )}
    </div>
  );
}
