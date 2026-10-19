import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { ChangePasswordForm, ProfileForm } from "@/components/account/profile-forms";

export default async function ProfilePage({ params }: PageProps<"/[locale]/account/profile">) {
  const locale = await resolveLocale(params);
  const viewer = await requireViewer(locale, "/account/profile");
  const supabase = await createClient();
  const [t, { data: profile }] = await Promise.all([
    getTranslations("account"),
    supabase.from("profiles").select("full_name, phone, wilaya, preferred_locale, notify_email, email").eq("id", viewer.id).single(),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title={t("navProfile")} description={t("profileSubtitle")} />
      <Card><CardHeader title={t("personalInfo")} /><CardBody>{profile ? <ProfileForm profile={profile} /> : null}</CardBody></Card>
      <Card><CardHeader title={t("changePassword")} /><CardBody><ChangePasswordForm /></CardBody></Card>
    </div>
  );
}
