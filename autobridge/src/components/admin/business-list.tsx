import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { countryName, formatDate } from "@/lib/format";
import { isoDateInDays } from "@/lib/dates";
import { BUSINESS_STATUSES, isOneOf } from "@/lib/domain/enums";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState, PageHeader, Table } from "@/components/ui/misc";

export async function BusinessList({ kind, statusParam }: { kind: "supplier" | "partner"; statusParam: unknown }) {
  const t = await getTranslations("admin");
  const te = await getTranslations("enums");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const status = statusParam === "all" ? "all" : isOneOf(BUSINESS_STATUSES, statusParam) ? statusParam : "pending";
  const supabase = await createClient();
  const table = kind === "supplier" ? "supplier_profiles" : "partner_profiles";
  let q = supabase.from(table).select("id, business_name, country_code, city, status, is_demo, created_at");
  if (status !== "all") q = q.eq("status", status);
  const { data } = await q.order("created_at", { ascending: false }).limit(200);
  const { data: expiring } = await supabase.from("verification_documents").select("id, supplier_id, partner_id, expires_on")
    .not("expires_on", "is", null).lte("expires_on", isoDateInDays(30));
  const expiringIds = new Set((expiring ?? []).map((d) => (kind === "supplier" ? d.supplier_id : d.partner_id)).filter(Boolean));
  return (
    <div>
      <PageHeader title={kind === "supplier" ? t("navSuppliers") : t("navPartners")} description={t("businessSubtitle")} />
      <form method="get" className="mb-4 flex items-end gap-2">
        <div>
          <label htmlFor="status" className="mb-1 block text-xs text-muted-foreground">{t("status")}</label>
          <Select id="status" name="status" defaultValue={status} className="w-56">
            {BUSINESS_STATUSES.map((s) => <option key={s} value={s}>{te(`businessStatus.${s}`)}</option>)}
            <option value="all">{tc("all")}</option>
          </Select>
        </div>
        <button type="submit" className={buttonClasses("secondary")}>{t("filter")}</button>
      </form>
      {data?.length ? (
        <Table>
          <thead><tr><th>{t("business")}</th><th>{t("location")}</th><th>{t("status")}</th><th>{t("applied")}</th></tr></thead>
          <tbody>
            {data.map((b) => (
              <tr key={b.id}>
                <td>
                  <Link href={`/admin/${kind}s/${b.id}`} className="font-medium text-primary hover:underline">{b.business_name}</Link>
                  {b.is_demo ? <Badge tone="warning" className="ms-2">{tc("demo")}</Badge> : null}
                  {expiringIds.has(b.id) ? <Badge tone="warning" className="ms-2">{t("docsExpiring")}</Badge> : null}
                </td>
                <td>{b.city}, {countryName(b.country_code, locale)}</td>
                <td><Badge tone={b.status === "approved" ? "success" : b.status === "pending" ? "info" : "danger"}>{te(`businessStatus.${b.status}`)}</Badge></td>
                <td className="text-muted-foreground">{formatDate(b.created_at, locale, "medium")}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : <EmptyState title={t("noResults")} />}
    </div>
  );
}
