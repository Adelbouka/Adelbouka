import { Bell } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getViewer } from "@/lib/auth";
import { buttonClasses } from "@/components/ui/button";
import { Logo } from "./logo";
import { LanguageSwitcher } from "./language-switcher";
import { MobileNav } from "./mobile-nav";
import { signOutAction } from "@/lib/actions/auth";

export async function SiteHeader({ locale }: { locale: string }) {
  const [t, viewer] = await Promise.all([getTranslations("nav"), getViewer()]);

  const mainLinks = [
    { href: "/vehicles", label: t("vehicles") },
    { href: "/estimate", label: t("estimate") },
    { href: "/#how-it-works", label: t("howItWorks") },
    { href: "/partners", label: t("partners") },
  ];
  const portalLinks = viewer
    ? [
        { href: "/account", label: t("account") },
        ...(viewer.supplier ? [{ href: "/supplier", label: t("supplierPortal") }] : []),
        ...(viewer.partner ? [{ href: "/partner", label: t("partnerPortal") }] : []),
        ...(viewer.isStaff ? [{ href: "/admin", label: t("admin") }] : []),
      ]
    : [];

  const signOut = (
    <form action={signOutAction}>
      <input type="hidden" name="locale" value={locale} />
      <button type="submit" className={buttonClasses("ghost", "sm")}>{t("signOut")}</button>
    </form>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
      <div className="relative mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="shrink-0 rounded-md" aria-label={t("home")}>
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label={t("main")}>
          {mainLinks.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-surface-muted hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-2">
          <LanguageSwitcher className="hidden sm:inline-flex" />
          {viewer ? (
            <>
              <Link
                href="/account/notifications"
                className="relative inline-flex size-9 items-center justify-center rounded-lg hover:bg-surface-muted"
                aria-label={t("notificationsCount", { count: viewer.unreadNotifications })}
              >
                <Bell className="size-5" aria-hidden="true" />
                {viewer.unreadNotifications > 0 ? (
                  <span className="absolute -end-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white ltr-nums">
                    {viewer.unreadNotifications > 9 ? "9+" : viewer.unreadNotifications}
                  </span>
                ) : null}
              </Link>
              <div className="hidden items-center gap-1 lg:flex">
                {portalLinks.map((l) => (
                  <Link key={l.href} href={l.href} className={buttonClasses("ghost", "sm")}>{l.label}</Link>
                ))}
                {signOut}
              </div>
            </>
          ) : (
            <div className="hidden items-center gap-2 lg:flex">
              <Link href="/auth/sign-in" className={buttonClasses("ghost", "sm")}>{t("signIn")}</Link>
              <Link href="/auth/sign-up" className={buttonClasses("primary", "sm")}>{t("signUp")}</Link>
            </div>
          )}
          <MobileNav>
            <nav className="flex flex-col gap-1 pt-3" aria-label={t("main")}>
              {[...mainLinks, ...portalLinks].map((l) => (
                <Link key={l.href} href={l.href} className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-surface-muted">
                  {l.label}
                </Link>
              ))}
              <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                <LanguageSwitcher />
                {viewer ? signOut : (
                  <>
                    <Link href="/auth/sign-in" className={buttonClasses("secondary", "sm")}>{t("signIn")}</Link>
                    <Link href="/auth/sign-up" className={buttonClasses("primary", "sm")}>{t("signUp")}</Link>
                  </>
                )}
              </div>
            </nav>
          </MobileNav>
        </div>
      </div>
    </header>
  );
}
