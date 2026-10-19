import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MARKETPLACE_CARD_COLUMNS } from "@/lib/queries/marketplace";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { VehicleCard } from "@/components/vehicles/vehicle-card";

export default async function FavoritesPage({ params }: PageProps<"/[locale]/account/favorites">) {
  const locale = await resolveLocale(params);
  const viewer = await requireViewer(locale, "/account/favorites");
  const supabase = await createClient();
  const t = await getTranslations("account");
  const { data: favs } = await supabase.from("favorites").select("vehicle_id, created_at").eq("user_id", viewer.id).order("created_at", { ascending: false });
  const ids = (favs ?? []).map((f) => f.vehicle_id);
  const { data: vehicles } = ids.length
    ? await supabase.from("marketplace_vehicles").select(MARKETPLACE_CARD_COLUMNS).in("id", ids)
    : { data: [] };
  const ordered = ids.map((id) => vehicles?.find((v) => v.id === id)).filter((v) => v != null);
  const withdrawn = ids.length - ordered.length;
  return (
    <div>
      <PageHeader title={t("navFavorites")} description={t("favoritesSubtitle")} />
      {withdrawn > 0 ? <p className="mb-4 text-sm text-muted-foreground">{t("favoritesWithdrawn", { count: withdrawn })}</p> : null}
      {ordered.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{ordered.map((v) => <VehicleCard key={v.id} vehicle={v} />)}</div>
      ) : <EmptyState title={t("noFavorites")} action={<Link href="/vehicles" className={buttonClasses("secondary")}>{t("browse")}</Link>} />}
    </div>
  );
}
