import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonClasses } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("common");
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <p className="text-sm font-medium text-primary ltr-nums">404</p>
      <h1 className="mt-2 text-2xl font-semibold">{t("notFoundTitle")}</h1>
      <p className="mt-2 text-muted-foreground">{t("notFoundText")}</p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className={buttonClasses("primary")}>{t("backHome")}</Link>
        <Link href="/vehicles" className={buttonClasses("secondary")}>{t("browseVehicles")}</Link>
      </div>
    </div>
  );
}
