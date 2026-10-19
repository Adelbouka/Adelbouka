import { ChevronLeft, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonClasses } from "./button";

export async function Pagination({ page, pageSize, total, hrefFor }: {
  page: number; pageSize: number; total: number; hrefFor: (page: number) => string;
}) {
  const t = await getTranslations("common");
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const prev = page > 1 ? page - 1 : null;
  const next = page < pages ? page + 1 : null;
  return (
    <nav className="mt-8 flex items-center justify-between gap-4" aria-label={t("pagination")}>
      {prev ? (
        <Link href={hrefFor(prev)} className={buttonClasses("secondary", "md")} rel="prev">
          <ChevronRight className="size-4 ltr:rotate-180" aria-hidden="true" />
          {t("previous")}
        </Link>
      ) : <span />}
      <span className="text-sm text-muted-foreground">{t("pageOf", { page, pages })}</span>
      {next ? (
        <Link href={hrefFor(next)} className={buttonClasses("secondary", "md")} rel="next">
          {t("next")}
          <ChevronLeft className="size-4 ltr:rotate-180" aria-hidden="true" />
        </Link>
      ) : <span />}
    </nav>
  );
}
