import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { requireViewer } from "@/lib/auth";
import { PortalShell } from "@/components/layout/portal-shell";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function SupplierLayout({ children, params }: LayoutProps<"/[locale]/supplier">) {
  const locale = await resolveLocale(params);
  const viewer = await requireViewer(locale, "/supplier");
  const t = await getTranslations("supplier");
  const nav = viewer.supplier
    ? [
        { href: "/supplier", label: t("navOverview") },
        { href: "/supplier/vehicles", label: t("navVehicles") },
        { href: "/supplier/requests", label: t("navRequests") },
        { href: "/supplier/quotations", label: t("navQuotations") },
        { href: "/supplier/profile", label: t("navProfile") },
        { href: "/supplier/documents", label: t("navDocuments") },
      ]
    : [{ href: "/supplier/apply", label: t("navApply") }];
  return <PortalShell title={t("title")} nav={nav}>{children}</PortalShell>;
}
