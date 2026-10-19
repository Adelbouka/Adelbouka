import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { requireViewer } from "@/lib/auth";
import { PortalShell } from "@/components/layout/portal-shell";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PartnerLayout({ children, params }: LayoutProps<"/[locale]/partner">) {
  const locale = await resolveLocale(params);
  const viewer = await requireViewer(locale, "/partner");
  const t = await getTranslations("partner");
  const nav = viewer.partner
    ? [
        { href: "/partner", label: t("navOverview") },
        { href: "/partner/services", label: t("navServices") },
        { href: "/partner/profile", label: t("navProfile") },
        { href: "/partner/documents", label: t("navDocuments") },
      ]
    : [{ href: "/partner/apply", label: t("navApply") }];
  return <PortalShell title={t("title")} nav={nav}>{children}</PortalShell>;
}
