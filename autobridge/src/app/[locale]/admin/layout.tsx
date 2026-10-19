import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { requireStaff } from "@/lib/auth";
import { PortalShell } from "@/components/layout/portal-shell";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children, params }: LayoutProps<"/[locale]/admin">) {
  const locale = await resolveLocale(params);
  const viewer = await requireStaff(locale);
  const t = await getTranslations("admin");
  const nav = [
    { href: "/admin", label: t("navOverview") },
    { href: "/admin/requests", label: t("navRequests") },
    { href: "/admin/vehicles", label: t("navVehicles") },
    { href: "/admin/suppliers", label: t("navSuppliers") },
    { href: "/admin/partners", label: t("navPartners") },
    { href: "/admin/reports", label: t("navReports") },
    { href: "/admin/costs", label: t("navCosts") },
    ...(viewer.isAdmin
      ? [
          { href: "/admin/pathways", label: t("navPathways") },
          { href: "/admin/content", label: t("navContent") },
          { href: "/admin/users", label: t("navUsers") },
        ]
      : []),
    { href: "/admin/audit", label: t("navAudit") },
  ];
  return <PortalShell title={t("title")} nav={nav}>{children}</PortalShell>;
}
