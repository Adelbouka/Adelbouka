import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getPublicVehicle } from "@/lib/queries/vehicle";
import { getAllMakes } from "@/lib/queries/home";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/misc";
import { RequestForm } from "@/components/requests/request-form";

export const metadata: Metadata = { robots: { index: false } };

export default async function NewRequestPage({ params, searchParams }: PageProps<"/[locale]/requests/new">) {
  const locale = await resolveLocale(params);
  const sp = await searchParams;
  const slug = typeof sp.vehicle === "string" ? sp.vehicle : null;
  const estimateParam = typeof sp.estimate === "string" && /^[0-9a-f-]{36}$/i.test(sp.estimate) ? sp.estimate : null;
  const viewer = await requireViewer(locale, `/requests/new${slug ? `?vehicle=${encodeURIComponent(slug)}` : ""}`);
  const supabase = await createClient();
  const [t, vehicle, makes, pathways, currencies, profile, estimate] = await Promise.all([
    getTranslations("requests"),
    slug ? getPublicVehicle(slug) : Promise.resolve(null),
    getAllMakes(),
    supabase.from("acquisition_pathways").select("code, name_ar, name_fr, description_ar, description_fr, is_enabled, disabled_message_ar, disabled_message_fr").order("position"),
    supabase.from("currencies").select("code").eq("is_active", true).order("code"),
    supabase.from("profiles").select("full_name, phone, wilaya").eq("id", viewer.id).maybeSingle(),
    estimateParam ? supabase.from("cost_estimates").select("id").eq("id", estimateParam).eq("user_id", viewer.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const vehicleUnavailable = slug && (!vehicle || !["available", "reserved"].includes(vehicle.availability ?? ""));
  const enabled = (pathways.data ?? []).filter((p) => p.is_enabled);
  const disabled = (pathways.data ?? []).filter((p) => !p.is_enabled);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <PageHeader title={t("newTitle")} description={t("newSubtitle")} />
      {vehicleUnavailable ? <Alert tone="warning" className="mb-6">{t("vehicleUnavailable")}</Alert> : null}
      {disabled.length ? (
        <Alert tone="info" className="mb-6" title={t("disabledPathways")}>
          <ul className="list-disc ps-4">
            {disabled.map((p) => (
              <li key={p.code}>{locale === "fr" ? p.name_fr : p.name_ar}{(locale === "fr" ? p.disabled_message_fr : p.disabled_message_ar) ? ` — ${locale === "fr" ? p.disabled_message_fr : p.disabled_message_ar}` : ""}</li>
            ))}
          </ul>
        </Alert>
      ) : null}
      <RequestForm
        vehicle={vehicle && !vehicleUnavailable && vehicle.id ? { id: vehicle.id, title: `${vehicle.make_name} ${vehicle.model} ${vehicle.manufacture_year}` } : null}
        pathways={enabled.map((p) => ({ code: p.code, name: locale === "fr" ? p.name_fr : p.name_ar, description: locale === "fr" ? p.description_fr : p.description_ar }))}
        makes={makes.map((m) => ({ id: m.id, name: m.name }))}
        currencies={(currencies.data ?? []).map((c) => c.code)}
        defaults={{
          contactName: profile.data?.full_name ?? "",
          contactPhone: profile.data?.phone ?? "",
          contactEmail: viewer.email ?? "",
          wilaya: profile.data?.wilaya ?? "",
        }}
        estimateId={estimate.data?.id ?? null}
      />
    </div>
  );
}
