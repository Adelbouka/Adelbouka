import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { requireViewer } from "@/lib/auth";
import { PortalShell } from "@/components/layout/portal-shell";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AccountLayout({ children, params }: LayoutProps<"/[locale]/account">) {
  const locale = await resolveLocale(params);
  const viewer = await requireViewer(locale, "/account");
  const t = await getTranslations("account");
  return (
    <PortalShell
      title={t("title")}
      nav={[
        { href: "/account", label: t("navOverview") },
        { href: "/account/requests", label: t("navRequests") },
        { href: "/account/favorites", label: t("navFavorites") },
        { href: "/account/estimates", label: t("navEstimates") },
        { href: "/account/notifications", label: t("navNotifications"), badge: viewer.unreadNotifications },
        { href: "/account/profile", label: t("navProfile") },
        { href: "/account/privacy", label: t("navPrivacy") },
      ]}
    >
      {children}
    </PortalShell>
  );
}
