import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlertTriangle, BadgeCheck, Building2, ChevronLeft, Clock, MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { SITE_URL } from "@/lib/env";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { countryName, formatDate, formatMoney, formatMonthYear, formatNumber } from "@/lib/format";
import { vehicleImageUrl } from "@/lib/images";
import { getCostConfig } from "@/lib/queries/costs";
import { getPublicVehicle, getVehicleDetailsExtras } from "@/lib/queries/vehicle";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DefinitionList } from "@/components/ui/misc";
import { VehicleGallery } from "@/components/vehicles/vehicle-gallery";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { FavoriteButton } from "@/components/vehicles/favorite-button";
import { ReportListing } from "@/components/vehicles/report-listing";
import { CostCalculator } from "@/components/cost/cost-calculator";

export async function generateMetadata({ params }: PageProps<"/[locale]/vehicles/[slug]">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const v = await getPublicVehicle(slug);
  if (!v) return { robots: { index: false } };
  const t = await getTranslations({ locale, namespace: "vehicles" });
  const title = `${v.make_name} ${v.model} ${v.manufacture_year} — ${countryName(v.country_code, locale)}`;
  const description = `${title}. ${formatNumber(v.mileage_km, locale)} km. ${t("askingPrice")}: ${formatMoney(v.price_amount, v.price_currency ?? "EUR", locale)}.`;
  const image = vehicleImageUrl(v.cover_image);
  const isDemo = v.is_demo || v.supplier_is_demo;
  return {
    title,
    description,
    alternates: { canonical: `/${locale}/vehicles/${v.slug}`, languages: { ar: `/ar/vehicles/${v.slug}`, fr: `/fr/vehicles/${v.slug}` } },
    openGraph: { title, description, images: image && !isDemo ? [{ url: image }] : undefined },
    // Demonstration listings must never be indexed as real offers.
    robots: isDemo ? { index: false, follow: false } : undefined,
  };
}

export default async function VehiclePage({ params }: PageProps<"/[locale]/vehicles/[slug]">) {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const v = await getPublicVehicle(slug);
  if (!v || !v.id || !v.supplier_id || v.make_id == null) notFound();

  const [t, te, tc, extras, costConfig, viewer] = await Promise.all([
    getTranslations("vehicles"), getTranslations("enums"), getTranslations("common"),
    getVehicleDetailsExtras(v.id, v.supplier_id, v.make_id, v.body_type), getCostConfig(), getViewer(),
  ]);
  let isFavorite = false;
  if (viewer) {
    const supabase = await createClient();
    const { data } = await supabase.from("favorites").select("vehicle_id").eq("user_id", viewer.id).eq("vehicle_id", v.id).maybeSingle();
    isFavorite = Boolean(data);
  }

  const isDemo = Boolean(v.is_demo || v.supplier_is_demo);
  const title = `${v.make_name} ${v.model}`;
  const images = extras.images.map((img) => ({ url: vehicleImageUrl(img.external_url ?? img.storage_path), alt: img.alt_text ?? title }));
  const dzdRate = costConfig.rates.find((r) => r.base === v.price_currency && r.quote === "DZD");
  const canRequest = v.availability === "available" || v.availability === "reserved";

  const specs = [
    { label: t("make"), value: v.make_name },
    { label: t("model"), value: [v.model, v.trim_level].filter(Boolean).join(" · ") },
    { label: t("manufactureYear"), value: <span className="ltr-nums">{v.manufacture_year}</span> },
    { label: t("firstRegistration"), value: v.first_registration_date ? formatMonthYear(v.first_registration_date, locale) : t("firstRegistrationNone"), hint: t("firstRegistrationHint") },
    { label: t("mileage"), value: <span className="ltr-nums">{formatNumber(v.mileage_km, locale)} km</span> },
    { label: t("fuel"), value: v.fuel_type ? te(`fuel.${v.fuel_type}`) : "—" },
    { label: t("transmission"), value: v.transmission ? te(`transmission.${v.transmission}`) : "—" },
    { label: t("engine"), value: v.engine_cc ? <span className="ltr-nums">{formatNumber(v.engine_cc, locale)} cm³</span> : "—" },
    { label: t("power"), value: v.power_kw ? <span className="ltr-nums">{v.power_kw} kW ({Math.round(v.power_kw * 1.36)} ch)</span> : "—" },
    { label: t("body"), value: v.body_type ? te(`body.${v.body_type}`) : "—" },
    { label: t("condition"), value: v.condition ? te(`condition.${v.condition}`) : "—" },
    { label: t("color"), value: v.exterior_color ?? "—" },
    { label: t("doorsSeats"), value: <span className="ltr-nums">{v.doors ?? "—"} / {v.seats ?? "—"}</span> },
    { label: t("location"), value: `${v.city}, ${countryName(v.country_code, locale)}` },
    ...(v.vin_masked ? [{ label: t("vin"), value: <span className="font-mono ltr-nums">{v.vin_masked}</span>, hint: t("vinHint") }] : []),
    { label: t("listedOn"), value: formatDate(v.published_at, locale) },
    { label: t("updatedOn"), value: formatDate(v.updated_at, locale) },
    { label: t("availabilityConfirmed"), value: formatDate(v.last_confirmed_at, locale) },
  ];

  // Structured data only for real (non-demo) listings, with values exactly as published.
  const jsonLd = isDemo ? null : {
    "@context": "https://schema.org",
    "@type": "Car",
    name: `${title} ${v.manufacture_year}`,
    brand: { "@type": "Brand", name: v.make_name },
    model: v.model,
    vehicleModelDate: String(v.manufacture_year),
    ...(v.first_registration_date ? { dateVehicleFirstRegistered: v.first_registration_date } : {}),
    mileageFromOdometer: { "@type": "QuantitativeValue", value: v.mileage_km, unitCode: "KMT" },
    fuelType: v.fuel_type,
    vehicleTransmission: v.transmission,
    itemCondition: v.condition === "new" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
    url: `${SITE_URL}/${locale}/vehicles/${v.slug}`,
    ...(images[0]?.url ? { image: images.map((i) => i.url).filter(Boolean) } : {}),
    offers: {
      "@type": "Offer",
      price: Number(v.price_amount),
      priceCurrency: v.price_currency,
      availability: v.availability === "available" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: v.supplier_name },
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {jsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} /> : null}
      <nav aria-label="breadcrumb" className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/vehicles" className="hover:text-foreground">{t("breadcrumb")}</Link>
        <ChevronLeft className="size-4 ltr:rotate-180" aria-hidden="true" />
        <span className="truncate text-foreground" aria-current="page">{title}</span>
      </nav>

      {isDemo ? <Alert tone="warning" className="mb-5">{tc("demoListingNotice")}</Alert> : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-8">
          <VehicleGallery images={images.length ? images : [{ url: null, alt: title }]} title={title} illustrative={isDemo} />

          <div>
            <div className="flex flex-wrap items-center gap-2">
              {v.is_sponsored ? <Badge tone="accent">{tc("sponsored")}</Badge> : null}
              {isDemo ? <Badge tone="warning">{tc("demo")}</Badge> : null}
              {v.availability ? <Badge tone={v.availability === "available" ? "success" : "neutral"}>{te(`availability.${v.availability}`)}</Badge> : null}
              {v.condition ? <Badge tone="primary">{te(`condition.${v.condition}`)}</Badge> : null}
              {v.is_stale ? <Badge tone="warning" icon={<Clock className="size-3" aria-hidden="true" />}>{t("availabilityUnconfirmed")}</Badge> : null}
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              {title} <span className="text-muted-foreground ltr-nums">{v.manufacture_year}</span>
            </h1>
            {v.trim_level ? <p className="mt-1 text-muted-foreground">{v.trim_level}</p> : null}
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="size-4" aria-hidden="true" />{v.city}, {countryName(v.country_code, locale)}</p>
          </div>

          <Alert tone="warning" title={t("eligibilityTitle")}>{t("eligibilityText")}</Alert>

          <section aria-labelledby="specs-title">
            <h2 id="specs-title" className="mb-2 text-lg font-semibold">{t("specs")}</h2>
            <DefinitionList items={specs} />
          </section>

          {v.description ? (
            <section aria-labelledby="desc-title">
              <h2 id="desc-title" className="mb-2 text-lg font-semibold">{t("description")}</h2>
              <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{v.description}</p>
            </section>
          ) : null}

          <section aria-labelledby="estimate-title">
            <h2 id="estimate-title" className="text-lg font-semibold">{t("estimateTitle")}</h2>
            <p className="mb-4 mt-1 text-sm text-muted-foreground">{t("estimateSubtitle")}</p>
            <CostCalculator
              rules={costConfig.rules}
              rates={costConfig.rates}
              currencies={costConfig.currencies}
              ruleSet={costConfig.ruleSet}
              vehicle={{ id: v.id, slug: v.slug!, price: Number(v.price_amount), currency: v.price_currency ?? "EUR" }}
              signedIn={Boolean(viewer)}
            />
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:h-fit">
          <Card className="p-5">
            <p className="text-sm text-muted-foreground">{t("askingPrice")}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight ltr-nums">{formatMoney(v.price_amount, v.price_currency ?? "EUR", locale)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("askingPriceHint")}</p>
            {v.price_dzd != null && v.price_currency !== "DZD" && dzdRate ? (
              <p className="mt-3 rounded-lg bg-surface-muted p-2.5 text-xs text-muted-foreground">
                {t("approxDzdLong", { amount: formatMoney(v.price_dzd, "DZD", locale), date: formatDate(dzdRate.effectiveDate, locale, "medium"), source: dzdRate.source })}
              </p>
            ) : null}
            <div className="mt-4 space-y-2">
              {canRequest ? (
                <Link href={{ pathname: "/requests/new", query: { vehicle: v.slug! } }} className={buttonClasses("primary", "lg", "w-full")}>
                  {t("requestQuotation")}
                </Link>
              ) : (
                <Alert tone="info">{t("unavailableForRequest")}</Alert>
              )}
              <FavoriteButton vehicleId={v.id} slug={v.slug!} initial={isFavorite} signedIn={Boolean(viewer)} />
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary"><Building2 className="size-5" aria-hidden="true" /></span>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{t("supplier")}</p>
                <p className="font-semibold">{v.supplier_name}</p>
                {extras.supplier ? (
                  <p className="text-xs text-muted-foreground">
                    {extras.supplier.city}, {countryName(extras.supplier.country_code, locale)} · {t("memberSince", { date: formatDate(extras.supplier.member_since, locale, "medium") })}
                  </p>
                ) : null}
              </div>
            </div>
            <h3 className="mt-4 text-sm font-semibold">{t("verificationsTitle")}</h3>
            {isDemo ? (
              <p className="mt-1 text-sm text-warning">{t("demoSupplierNoVerification")}</p>
            ) : extras.verifications.length ? (
              <ul className="mt-2 space-y-2">
                {extras.verifications.map((check) => (
                  <li key={check.id} className="flex gap-2 text-sm">
                    <BadgeCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                    <span>
                      {check.check_type ? te(`verificationCheck.${check.check_type}`) : ""}{" "}
                      <span className="text-muted-foreground">
                        {t("verifiedOn", { date: formatDate(check.verified_at, locale, "medium") })}
                        {check.expires_at ? ` · ${t("validUntil", { date: formatDate(check.expires_at, locale, "medium") })}` : ""}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 flex gap-2 text-sm text-muted-foreground"><AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{t("noVerifications")}</p>
            )}
            <Link href={`/suppliers/${v.supplier_id}`} className="mt-4 inline-block text-sm font-medium text-primary hover:underline">{t("supplierProfile")}</Link>
            <p className="mt-3 text-xs text-muted-foreground">{t("contactViaPlatform")}</p>
          </Card>

          {viewer ? <ReportListing vehicleId={v.id} /> : (
            <p className="px-1 text-xs text-muted-foreground">
              <Link href={{ pathname: "/auth/sign-in", query: { next: `/${locale}/vehicles/${v.slug}` } }} className="text-primary hover:underline">{t("reportSignIn")}</Link>
            </p>
          )}
        </aside>
      </div>

      {extras.similar.length ? (
        <section className="mt-14" aria-labelledby="similar-title">
          <h2 id="similar-title" className="mb-5 text-xl font-semibold">{t("similar")}</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {extras.similar.map((s) => <VehicleCard key={s.id} vehicle={s} />)}
          </div>
        </section>
      ) : null}
    </div>
  );
}
