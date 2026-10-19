import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { REQUEST_STATUSES, isOneOf } from "@/lib/domain/enums";
import { parseSnapshot, snapshotTitle } from "@/lib/domain/snapshot";
import { escapeLike } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState, PageHeader, Table } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";
import { RequestStatusBadge } from "@/components/requests/status";

const PAGE = 25;

export default async function AdminRequests({ params, searchParams }: PageProps<"/[locale]/admin/requests">) {
  const locale = await resolveLocale(params);
  const viewer = await requireStaff(locale);
  const sp = await searchParams;
  const status = isOneOf(REQUEST_STATUSES, sp.status) ? sp.status : null;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 40) : "";
  const mine = sp.mine === "1";
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  let query = supabase.from("purchase_requests")
    .select("id, reference, status, request_type, vehicle_snapshot, desired_model, contact_name, wilaya, legal_review_status, assigned_to, created_at, profiles!purchase_requests_assigned_to_fkey(full_name, email)", { count: "exact" });
  if (status) query = query.eq("status", status);
  else query = query.not("status", "in", "(draft,completed,cancelled,rejected)");
  if (q) query = query.or(`reference.ilike.%${escapeLike(q).replace(/[,()]/g, "")}%,contact_name.ilike.%${escapeLike(q).replace(/[,()]/g, "")}%`);
  if (mine) query = query.eq("assigned_to", viewer.id);
  const { data, count } = await query.order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  const [t, te] = await Promise.all([getTranslations("admin"), getTranslations("enums")]);
  const qs = (p: number) => `/admin/requests?${new URLSearchParams({ ...(status ? { status } : {}), ...(q ? { q } : {}), ...(mine ? { mine: "1" } : {}), page: String(p) })}`;
  return (
    <div>
      <PageHeader title={t("navRequests")} description={t("requestsSubtitle")} />
      <form method="get" className="mb-4 flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="status" className="mb-1 block text-xs text-muted-foreground">{t("status")}</label>
          <Select id="status" name="status" defaultValue={status ?? ""} className="w-56">
            <option value="">{t("openStatuses")}</option>
            {REQUEST_STATUSES.map((s) => <option key={s} value={s}>{te(`requestStatus.${s}`)}</option>)}
          </Select>
        </div>
        <div>
          <label htmlFor="q" className="mb-1 block text-xs text-muted-foreground">{t("search")}</label>
          <Input id="q" name="q" defaultValue={q} placeholder={t("searchRequests")} className="w-56" />
        </div>
        <label className="flex h-10 items-center gap-2 text-sm"><input type="checkbox" name="mine" value="1" defaultChecked={mine} />{t("assignedToMe")}</label>
        <button type="submit" className={buttonClasses("secondary")}>{t("filter")}</button>
      </form>
      {data?.length ? (
        <>
          <Table>
            <thead><tr><th>{t("reference")}</th><th>{t("vehicle")}</th><th>{t("customer")}</th><th>{t("status")}</th><th>{t("legal")}</th><th>{t("assignee")}</th><th>{t("created")}</th></tr></thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id}>
                  <td><Link href={`/admin/requests/${r.id}`} className="font-medium text-primary hover:underline ltr-nums">{r.reference}</Link></td>
                  <td>{snapshotTitle(parseSnapshot(r.vehicle_snapshot)) || r.desired_model || te(`requestType.${r.request_type as "custom_search" | "listed_vehicle"}`)}</td>
                  <td>{r.contact_name}<div className="text-xs text-muted-foreground">{r.wilaya}</div></td>
                  <td><RequestStatusBadge status={r.status} /></td>
                  <td><Badge tone={r.legal_review_status === "approved" || r.legal_review_status === "not_required" ? "success" : r.legal_review_status === "blocked" ? "danger" : "warning"}>{te(`legalReview.${r.legal_review_status}`)}</Badge></td>
                  <td className="text-muted-foreground">{r.profiles?.full_name ?? r.profiles?.email ?? "—"}</td>
                  <td className="text-muted-foreground">{formatDate(r.created_at, locale, "medium")}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={page} pageSize={PAGE} total={count ?? 0} hrefFor={qs} />
        </>
      ) : <EmptyState title={t("noResults")} />}
    </div>
  );
}
