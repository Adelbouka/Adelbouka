import { ArrowLeft, BadgeCheck, Calculator, FileSearch, FileText, Handshake, MessageSquareQuote, ScrollText, ShieldCheck, Ship } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { countryName } from "@/lib/format";
import { parseFilters } from "@/lib/marketplace-filters";
import { searchMarketplace } from "@/lib/queries/marketplace";
import { getCostConfig } from "@/lib/queries/costs";
import { getAllMakes, getFaqs, getMarketplaceFacets } from "@/lib/queries/home";
import { getPublicSettings } from "@/lib/queries/settings";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { VehicleImage } from "@/components/vehicles/vehicle-image";
import { HeroSearch } from "@/components/home/hero-search";
import { CostCalculator } from "@/components/cost/cost-calculator";

function Arrow() {
  return <ArrowLeft className="size-4 ltr:rotate-180" aria-hidden="true" />;
}

const HERO_IMAGE = "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=70";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = await resolveLocale(params);
  const supabase = await createClient();
  const [t, featured, facets, makes, faqs, costConfig, viewer, settings] = await Promise.all([
    getTranslations("home"),
    searchMarketplace(supabase, parseFilters({}), 6),
    getMarketplaceFacets(),
    getAllMakes(),
    getFaqs(),
    getCostConfig(),
    getViewer(),
    getPublicSettings(),
  ]);
  const heroTitle = (settings[`homepage.hero_title_${locale}`] as string | undefined) ?? t("heroTitle");
  const heroSubtitle = (settings[`homepage.hero_subtitle_${locale}`] as string | undefined) ?? t("heroSubtitle");

  const steps = [
    { icon: FileSearch, title: t("step1Title"), text: t("step1Text") },
    { icon: Calculator, title: t("step2Title"), text: t("step2Text") },
    { icon: MessageSquareQuote, title: t("step3Title"), text: t("step3Text") },
    { icon: ScrollText, title: t("step4Title"), text: t("step4Text") },
    { icon: Ship, title: t("step5Title"), text: t("step5Text") },
  ];
  const verification = [t("verify1"), t("verify2"), t("verify3"), t("verify4")];

  return (
    <>
      {/* Hero */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:py-14">
          <div>
            <p className="text-sm font-medium text-primary">{t("eyebrow")}</p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-[2.6rem]">{heroTitle}</h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">{heroSubtitle}</p>
            <div className="mt-7"><HeroSearch makes={makes} /></div>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <Link href="/vehicles" className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">{t("browseAll")}<Arrow /></Link>
              <Link href="/estimate" className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">{t("estimateCta")}<Arrow /></Link>
            </div>
          </div>
          <div className="relative hidden aspect-[4/3] overflow-hidden rounded-2xl bg-surface-muted sm:block lg:aspect-[5/4]">
            <VehicleImage src={HERO_IMAGE} alt={t("heroImageAlt")} sizes="(min-width: 1024px) 560px, 100vw" preload />
            <div className="absolute inset-x-4 bottom-4 rounded-xl bg-surface/95 p-4 text-sm shadow-lg backdrop-blur">
              <p className="font-medium">{t("heroCardTitle")}</p>
              <p className="mt-1 text-muted-foreground">{t("heroCardText")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured vehicles */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6" aria-labelledby="featured-title">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="featured-title" className="text-2xl font-semibold tracking-tight">{t("featuredTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("featuredSubtitle")}</p>
          </div>
          <Link href="/vehicles" className={buttonClasses("secondary")}>{t("viewAll")}</Link>
        </div>
        {featured.vehicles.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.vehicles.map((v, i) => <VehicleCard key={v.id} vehicle={v} preload={i < 3} />)}
          </div>
        ) : (
          <EmptyState title={t("noListingsTitle")} description={t("noListingsText")} />
        )}
      </section>

      {/* Brands & countries */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{t("brandsTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("brandsSubtitle")}</p>
            {facets.makes.length ? (
              <ul className="mt-5 flex flex-wrap gap-2">
                {facets.makes.map((m) => (
                  <li key={m.slug}>
                    <Link href={{ pathname: "/vehicles", query: { make: m.slug } }} className="inline-flex items-center gap-2 rounded-full border border-border-strong px-3.5 py-1.5 text-sm hover:border-primary hover:text-primary">
                      {m.name}<span className="text-xs text-muted-foreground ltr-nums">{m.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-5 text-sm text-muted-foreground">{t("noListingsTitle")}</p>}
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{t("countriesTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("countriesSubtitle")}</p>
            {facets.countries.length ? (
              <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {facets.countries.map((c) => (
                  <li key={c.code}>
                    <Link href={{ pathname: "/vehicles", query: { country: c.code } }} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm hover:border-primary">
                      <span>{countryName(c.code, locale)}</span>
                      <span className="text-xs text-muted-foreground">{t("offersCount", { count: c.count })}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-5 text-sm text-muted-foreground">{t("noListingsTitle")}</p>}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-14 sm:px-6" aria-labelledby="how-title">
        <h2 id="how-title" className="text-2xl font-semibold tracking-tight">{t("howTitle")}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("howSubtitle")}</p>
        <ol className="mt-8 grid gap-4 md:grid-cols-5">
          {steps.map((s, i) => (
            <li key={i} className="rounded-xl border border-border bg-surface p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary"><s.icon className="size-4.5" aria-hidden="true" /></span>
                <span className="text-xs font-medium text-muted-foreground ltr-nums">0{i + 1}</span>
              </div>
              <h3 className="mt-4 font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-xs text-muted-foreground">{t("howDisclaimer")}</p>
      </section>

      {/* Cost estimator */}
      <section className="border-y border-border bg-surface-muted/50" aria-labelledby="estimate-title">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <h2 id="estimate-title" className="text-2xl font-semibold tracking-tight">{t("estimateTitle")}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("estimateSubtitle")}</p>
          <div className="mt-8">
            <CostCalculator
              rules={costConfig.rules}
              rates={costConfig.rates}
              currencies={costConfig.currencies}
              ruleSet={costConfig.ruleSet}
              signedIn={Boolean(viewer)}
            />
          </div>
        </div>
      </section>

      {/* Verification */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <span className="flex size-10 items-center justify-center rounded-lg bg-success-soft text-success"><ShieldCheck className="size-5" aria-hidden="true" /></span>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight">{t("verifyTitle")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("verifyText")}</p>
          </div>
          <ul className="space-y-3">
            {verification.map((v, i) => (
              <li key={i} className="flex gap-3 rounded-xl border border-border bg-surface p-4 text-sm">
                <BadgeCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                <span className="leading-relaxed">{v}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      {faqs.length ? (
        <section className="border-t border-border bg-surface" aria-labelledby="faq-title">
          <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
            <h2 id="faq-title" className="text-2xl font-semibold tracking-tight">{t("faqTitle")}</h2>
            <div className="mt-6 divide-y divide-border rounded-xl border border-border">
              {faqs.map((f) => (
                <details key={f.id} className="group px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                    {locale === "fr" ? f.question_fr : f.question_ar}
                    <span className="text-muted-foreground transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{locale === "fr" ? f.answer_fr : f.answer_ar}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Partner CTA */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid items-center gap-6 rounded-2xl bg-primary px-6 py-10 text-primary-foreground sm:px-10 md:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <div className="flex items-center gap-2 text-sm text-white/80"><Handshake className="size-4" aria-hidden="true" />{t("partnerEyebrow")}</div>
            <h2 className="mt-2 text-2xl font-semibold">{t("partnerTitle")}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80">{t("partnerText")}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/partners" className={buttonClasses("secondary", "lg", "border-transparent")}>
              <FileText className="size-4" aria-hidden="true" />{t("partnerCta")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
