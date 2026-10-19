import type { Metadata } from "next";
import { Suspense } from "react";
import { SlidersHorizontal } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { createClient } from "@/lib/supabase/server";
import { activeFilterCount, filtersToSearch, parseFilters } from "@/lib/marketplace-filters";
import { searchMarketplace } from "@/lib/queries/marketplace";
import { getAllMakes } from "@/lib/queries/home";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { VehicleFilters } from "@/components/vehicles/vehicle-filters";
import { SortSelect } from "@/components/vehicles/sort-select";

export async function generateMetadata({ params, searchParams }: PageProps<"/[locale]/vehicles">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "vehicles" });
  const filters = parseFilters(await searchParams);
  // Filtered and paginated variants canonicalize to the main listing page and are not indexed.
  const isFiltered = activeFilterCount(filters) > 0 || (filters.page ?? 1) > 1 || filters.sort !== "newest";
  return {
    title: t("title"),
    description: t("metaDescription"),
    alternates: { canonical: `/${locale}/vehicles`, languages: { ar: "/ar/vehicles", fr: "/fr/vehicles" } },
    robots: isFiltered ? { index: false, follow: true } : undefined,
  };
}

export default async function VehiclesPage({ params, searchParams }: PageProps<"/[locale]/vehicles">) {
  await resolveLocale(params);
  const filters = parseFilters(await searchParams);
  const supabase = await createClient();
  const [t, tc, result, makes] = await Promise.all([
    getTranslations("vehicles"), getTranslations("common"), searchMarketplace(supabase, filters), getAllMakes(),
  ]);
  const count = activeFilterCount(filters);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside>
          <details className="group rounded-xl border border-border bg-surface lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium">
              <span className="flex items-center gap-2"><SlidersHorizontal className="size-4" aria-hidden="true" />{t("showFilters")}{count ? ` (${count})` : ""}</span>
              <span aria-hidden="true" className="transition-transform group-open:rotate-180">⌄</span>
            </summary>
            <div className="border-t border-border p-4"><VehicleFilters filters={filters} makes={makes} /></div>
          </details>
          <div className="hidden rounded-xl border border-border bg-surface p-4 lg:sticky lg:top-20 lg:block">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold"><SlidersHorizontal className="size-4" aria-hidden="true" />{t("filters")}</h2>
            <VehicleFilters filters={filters} makes={makes} />
          </div>
        </aside>

        <section aria-labelledby="results-heading" className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="results-heading" className="text-sm font-medium text-muted-foreground" aria-live="polite">
              {t("resultsCount", { count: result.total })}
            </h2>
            <div className="flex items-center gap-3">
              {count ? <Link href="/vehicles" className="text-sm text-primary hover:underline">{t("clearFilters")}</Link> : null}
              <Suspense><SortSelect value={filters.sort} /></Suspense>
            </div>
          </div>

          {result.error ? (
            <Alert tone="danger" title={tc("errorTitle")}>{t("loadError")}</Alert>
          ) : result.vehicles.length ? (
            <>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {result.vehicles.map((v, i) => <VehicleCard key={v.id} vehicle={v} preload={i < 2} />)}
              </div>
              <Pagination
                page={result.page}
                pageSize={result.pageSize}
                total={result.total}
                hrefFor={(p) => `/vehicles${filtersToSearch({ ...filters, page: p })}`}
              />
            </>
          ) : (
            <EmptyState
              title={t("emptyTitle")}
              description={t("emptyText")}
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  {count ? <Link href="/vehicles" className={buttonClasses("secondary")}>{t("clearFilters")}</Link> : null}
                  <Link href="/requests/new" className={buttonClasses("primary")}>{t("customRequest")}</Link>
                </div>
              }
            />
          )}
        </section>
      </div>
    </div>
  );
}
