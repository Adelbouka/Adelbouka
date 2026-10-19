"use client";
import { Suspense } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Languages } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

function Switcher({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("common");
  const pathname = usePathname();
  const search = useSearchParams();
  const target = locale === "ar" ? "fr" : "ar";
  const query = Object.fromEntries(search.entries());
  return (
    <Link
      href={{ pathname, query }}
      locale={target}
      hrefLang={target}
      lang={target}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border-strong px-3 text-sm font-medium hover:bg-surface-muted",
        className,
      )}
      title={t("switchLanguage")}
    >
      <Languages className="size-4" aria-hidden="true" />
      {target === "fr" ? "Français" : "العربية"}
    </Link>
  );
}

export function LanguageSwitcher({ className }: { className?: string }) {
  return (
    <Suspense fallback={<span className="inline-block h-9 w-24" />}>
      <Switcher className={className} />
    </Suspense>
  );
}
