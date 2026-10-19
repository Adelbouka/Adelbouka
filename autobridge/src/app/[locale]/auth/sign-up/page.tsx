import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { Link, redirect } from "@/i18n/navigation";
import { getViewer } from "@/lib/auth";
import { AuthCard } from "@/components/auth/auth-card";
import { SignUpForm } from "@/components/auth/sign-up-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/auth/sign-up">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("signUpTitle") };
}

export default async function SignUpPage({ params }: PageProps<"/[locale]/auth/sign-up">) {
  const locale = await resolveLocale(params);
  if (await getViewer()) redirect({ href: "/account", locale });
  const t = await getTranslations("auth");
  return (
    <AuthCard
      title={t("signUpTitle")}
      description={t("signUpSubtitle")}
      footer={<>{t("haveAccount")} <Link href="/auth/sign-in" className="font-medium text-primary hover:underline">{t("signIn")}</Link></>}
    >
      <SignUpForm />
    </AuthCard>
  );
}
