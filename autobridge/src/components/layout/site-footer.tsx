import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getPublicSettings } from "@/lib/queries/settings";
import { Logo } from "./logo";

export async function SiteFooter({ locale }: { locale: string }) {
  const [t, settings] = await Promise.all([getTranslations("footer"), getPublicSettings()]);
  const contact = [
    settings["contact.email"] ? { label: t("email"), value: String(settings["contact.email"]), href: `mailto:${settings["contact.email"]}` } : null,
    settings["contact.phone"] ? { label: t("phone"), value: String(settings["contact.phone"]), href: `tel:${String(settings["contact.phone"]).replace(/\s/g, "")}` } : null,
    settings["contact.address"] ? { label: t("address"), value: String(settings["contact.address"]) } : null,
    settings["contact.hours"] ? { label: t("hours"), value: String(settings["contact.hours"]) } : null,
  ].filter(Boolean) as { label: string; value: string; href?: string }[];

  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">{t("about")}</p>
          <p className="mt-3 max-w-md text-xs leading-relaxed text-muted-foreground">{t("disclaimer")}</p>
        </div>
        <div>
          <h2 className="text-sm font-semibold">{t("platform")}</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link className="hover:text-foreground" href="/vehicles">{t("vehicles")}</Link></li>
            <li><Link className="hover:text-foreground" href="/estimate">{t("estimate")}</Link></li>
            <li><Link className="hover:text-foreground" href="/partners">{t("partners")}</Link></li>
            <li><Link className="hover:text-foreground" href="/contact">{t("contact")}</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold">{t("legal")}</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link className="hover:text-foreground" href="/legal/terms">{t("terms")}</Link></li>
            <li><Link className="hover:text-foreground" href="/legal/privacy">{t("privacy")}</Link></li>
            <li><Link className="hover:text-foreground" href="/legal/disclosure">{t("disclosure")}</Link></li>
          </ul>
          {contact.length ? (
            <ul className="mt-5 space-y-1 text-sm text-muted-foreground">
              {contact.map((c) => (
                <li key={c.label}>
                  <span className="text-foreground">{c.label}: </span>
                  {c.href ? <a className="ltr-nums hover:text-foreground" href={c.href}>{c.value}</a> : c.value}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-muted-foreground sm:px-6">
          © <span className="ltr-nums">{new Date().getFullYear()}</span> AutoBridge DZ · {t("rights")} · <span lang={locale === "ar" ? "fr" : "ar"}>{locale === "ar" ? "Disponible en français" : "متوفر بالعربية"}</span>
        </p>
      </div>
    </footer>
  );
}
