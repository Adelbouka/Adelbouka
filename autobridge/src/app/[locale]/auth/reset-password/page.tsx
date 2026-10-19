import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { getViewer } from "@/lib/auth";
import { Alert } from "@/components/ui/alert";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/password-forms";

export async function generateMetadata({ params }: PageProps<"/[locale]/auth/reset-password">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("resetTitle") };
}

export default async function ResetPasswordPage({ params }: PageProps<"/[locale]/auth/reset-password">) {
  await resolveLocale(params);
  const t = await getTranslations("auth");
  const viewer = await getViewer();
  return (
    <AuthCard title={t("resetTitle")} description={t("resetSubtitle")}>
      {viewer ? (
        <ResetPasswordForm />
      ) : (
        <div className="space-y-4">
          <Alert tone="warning">{t("linkInvalid")}</Alert>
          <Link href="/auth/forgot-password" className="text-sm font-medium text-primary hover:underline">{t("requestNewLink")}</Link>
        </div>
      )}
    </AuthCard>
  );
}
