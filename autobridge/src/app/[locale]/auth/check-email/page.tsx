import { MailCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { AuthCard } from "@/components/auth/auth-card";

export default async function CheckEmailPage({ params, searchParams }: PageProps<"/[locale]/auth/check-email">) {
  await resolveLocale(params);
  const { reason } = await searchParams;
  const t = await getTranslations("auth");
  return (
    <AuthCard title={t("checkEmailTitle")}>
      <div className="flex flex-col items-center text-center">
        <MailCheck className="size-10 text-primary" aria-hidden="true" />
        <p className="mt-4 text-sm text-muted-foreground">
          {reason === "recovery" ? t("checkEmailRecovery") : t("checkEmailSignup")}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{t("checkEmailSpam")}</p>
        <Link href="/auth/sign-in" className="mt-6 text-sm font-medium text-primary hover:underline">{t("backToSignIn")}</Link>
      </div>
    </AuthCard>
  );
}
