import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlertTriangle, BadgeCheck, Globe } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { createClient } from "@/lib/supabase/server";
import { countryName, formatDate } from "@/lib/format";
import { MARKETPLACE_CARD_COLUMNS } from "@/lib/queries/marketplace";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { VehicleCard } from "@/components/vehicles/vehicle-card";

const UUID = /^[0-9a-f-]{36}$/i;

async function load(id: string) {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data: supplier } = await supabase.from("public_suppliers").select("*").eq("id", id).maybeSingle();
  if (!supplier) return null;
  const [verifications, vehicles] = await Promise.all([
    supabase.from("public_business_verifications").select("id, check_type, method, verified_at, expires_at").eq("supplier_id", id).order("verified_at", { ascending: false }),
    supabase.from("marketplace_vehicles").select(MARKETPLACE_CARD_COLUMNS).eq("supplier_id", id).order("published_at", { ascending: false }).limit(24),
  ]);
  return { supplier, verifications: verifications.data ?? [], vehicles: vehicles.data ?? [] };
}

export async function generateMetadata({ params }: PageProps<"/[locale]/suppliers/[id]">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const { id } = await params;
  const data = await load(id);
  if (!data) return { robots: { index: false } };
  return {
    title: data.supplier.business_name ?? undefined,
    alternates: { canonical: `/${locale}/suppliers/${id}` },
    robots: data.supplier.is_demo ? { index: false, follow: false } : undefined,
  };
}

export default async function SupplierPublicPage({ params }: PageProps<"/[locale]/suppliers/[id]">) {
  const locale = await resolveLocale(params);
  const { id } = await params;
  const data = await load(id);
  if (!data) notFound();
  const [t, te, tc] = await Promise.all([getTranslations("vehicles"), getTranslations("enums"), getTranslations("common")]);
  const s = data.supplier;
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {s.is_demo ? <Alert tone="warning" className="mb-5">{tc("demoData")}</Alert> : null}
      <PageHeader
        eyebrow={t("supplierTitle")}
        title={<span className="flex flex-wrap items-center gap-2">{s.business_name}{s.is_demo ? <Badge tone="warning">{tc("demo")}</Badge> : null}</span>}
        description={`${s.city}, ${countryName(s.country_code, locale)} · ${t("memberSince", { date: formatDate(s.member_since, locale, "medium") })}`}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {s.description ? <Card className="p-5"><p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{s.description}</p></Card> : null}
          {s.services_offered ? (
            <Card className="p-5">
              <h2 className="text-sm font-semibold">{t("services")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{s.services_offered}</p>
            </Card>
          ) : null}
          <section>
            <h2 className="mb-4 text-lg font-semibold">{t("supplierListings")}</h2>
            {data.vehicles.length ? (
              <div className="grid gap-5 sm:grid-cols-2">{data.vehicles.map((v) => <VehicleCard key={v.id} vehicle={v} />)}</div>
            ) : <EmptyState title={t("emptyTitle")} />}
          </section>
        </div>
        <aside className="space-y-4">
          <Card className="p-5">
            <h2 className="text-sm font-semibold">{t("verificationsTitle")}</h2>
            {s.is_demo ? (
              <p className="mt-2 text-sm text-warning">{t("demoSupplierNoVerification")}</p>
            ) : data.verifications.length ? (
              <ul className="mt-3 space-y-3">
                {data.verifications.map((c) => (
                  <li key={c.id} className="flex gap-2 text-sm">
                    <BadgeCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                    <div>
                      <div className="font-medium">{c.check_type ? te(`verificationCheck.${c.check_type}`) : ""}</div>
                      <div className="text-xs text-muted-foreground">{c.method}</div>
                      <div className="text-xs text-muted-foreground">
                        {t("verifiedOn", { date: formatDate(c.verified_at, locale, "medium") })}
                        {c.expires_at ? ` · ${t("validUntil", { date: formatDate(c.expires_at, locale, "medium") })}` : ""}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 flex gap-2 text-sm text-muted-foreground"><AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{t("noVerifications")}</p>
            )}
          </Card>
          {s.website && !s.is_demo ? (
            <Card className="p-5">
              <a href={s.website} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-2 text-sm text-primary hover:underline">
                <Globe className="size-4" aria-hidden="true" />{t("website")}
              </a>
            </Card>
          ) : null}
          <p className="text-xs text-muted-foreground">{t("contactViaPlatform")}</p>
        </aside>
      </div>
    </div>
  );
}
