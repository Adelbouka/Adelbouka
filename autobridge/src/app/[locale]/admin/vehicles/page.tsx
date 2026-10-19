import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney } from "@/lib/format";
import { LISTING_STATUSES, isOneOf } from "@/lib/domain/enums";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState, PageHeader, Table } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";

const PAGE = 30;

export default async function AdminVehicles({ params, searchParams }: PageProps<"/[locale]/admin/vehicles">) {
  const locale = await resolveLocale(params);
  const sp = await searchParams;
  const status = sp.status === "all" ? "all" : isOneOf(LISTING_STATUSES, sp.status) ? sp.status : "pending_review";
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  let q = supabase.from("vehicles").select("id, model, manufacture_year, price_amount, price_currency, status, availability, is_demo, updated_at, vehicle_makes(name), supplier_profiles(business_name)", { count: "exact" });
  if (status !== "all") q = q.eq("status", status);
  const { data, count } = await q.order("updated_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  const [t, te, tc] = await Promise.all([getTranslations("admin"), getTranslations("enums"), getTranslations("common")]);
  return (
    <div>
      <PageHeader title={t("navVehicles")} description={t("vehiclesSubtitle")} />
      <form method="get" className="mb-4 flex items-end gap-2">
        <div>
          <label htmlFor="status" className="mb-1 block text-xs text-muted-foreground">{t("status")}</label>
          <Select id="status" name="status" defaultValue={status} className="w-56">
            {LISTING_STATUSES.map((s) => <option key={s} value={s}>{te(`listingStatus.${s}`)}</option>)}
            <option value="all">{tc("all")}</option>
          </Select>
        </div>
        <button type="submit" className={buttonClasses("secondary")}>{t("filter")}</button>
      </form>
      {data?.length ? (
        <>
          <Table>
            <thead><tr><th>{t("vehicle")}</th><th>{t("supplier")}</th><th>{t("price")}</th><th>{t("status")}</th><th>{t("updated")}</th></tr></thead>
            <tbody>
              {data.map((v) => (
                <tr key={v.id}>
                  <td><Link href={`/admin/vehicles/${v.id}`} className="font-medium text-primary hover:underline">{v.vehicle_makes?.name} {v.model} <span className="ltr-nums">{v.manufacture_year}</span></Link>{v.is_demo ? <Badge tone="warning" className="ms-2">{tc("demo")}</Badge> : null}</td>
                  <td>{v.supplier_profiles?.business_name}</td>
                  <td className="ltr-nums">{formatMoney(v.price_amount, v.price_currency, locale)}</td>
                  <td><Badge tone={v.status === "published" ? "success" : v.status === "pending_review" ? "info" : v.status === "rejected" ? "danger" : "neutral"}>{te(`listingStatus.${v.status}`)}</Badge> <span className="text-xs text-muted-foreground">{te(`availability.${v.availability}`)}</span></td>
                  <td className="text-muted-foreground">{formatDate(v.updated_at, locale, "medium")}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={page} pageSize={PAGE} total={count ?? 0} hrefFor={(p) => `/admin/vehicles?status=${status}&page=${p}`} />
        </>
      ) : <EmptyState title={t("noResults")} />}
    </div>
  );
}
