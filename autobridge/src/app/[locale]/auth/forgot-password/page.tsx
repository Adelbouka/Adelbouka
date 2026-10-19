import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/password-forms";

export async function generateMetadata({ params }: PageProps<"/[locale]/auth/forgot-password">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("forgotTitle") };
}

export default async function ForgotPasswordPage({ params }: PageProps<"/[locale]/auth/forgot-password">) {
  await resolveLocale(params);
  const t = await getTranslations("auth");
  return (
    <AuthCard title={t("forgotTitle")} description={t("forgotSubtitle")}
      footer={<Link href="/auth/sign-in" className="font-medium text-primary hover:underline">{t("backToSignIn")}</Link>}>
      <ForgotPasswordForm />
    </AuthCard>
  );
}
