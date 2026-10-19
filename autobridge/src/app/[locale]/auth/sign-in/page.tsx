import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { Link, redirect } from "@/i18n/navigation";
import { getViewer } from "@/lib/auth";
import { safeNextPath } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { AuthCard } from "@/components/auth/auth-card";
import { SignInForm } from "@/components/auth/sign-in-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/auth/sign-in">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("signInTitle") };
}

export default async function SignInPage({ params, searchParams }: PageProps<"/[locale]/auth/sign-in">) {
  const locale = await resolveLocale(params);
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? safeNextPath(sp.next, "") : "";
  if (await getViewer()) redirect({ href: "/account", locale });
  const t = await getTranslations("auth");
  return (
    <AuthCard
      title={t("signInTitle")}
      description={t("signInSubtitle")}
      footer={<>{t("noAccount")} <Link href="/auth/sign-up" className="font-medium text-primary hover:underline">{t("createAccount")}</Link></>}
    >
      {sp.error === "link_invalid" ? <Alert tone="warning" className="mb-4">{t("linkInvalid")}</Alert> : null}
      <SignInForm next={next || undefined} />
    </AuthCard>
  );
}
