import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDateTime } from "@/lib/format";
import { escapeLike } from "@/lib/utils";
import { markContactHandledAction, setRoleAction, updateDataRequestAction } from "@/lib/actions/admin";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader, Table } from "@/components/ui/misc";
import { ActionForm } from "@/components/forms/action-form";

export default async function AdminUsers({ params, searchParams }: PageProps<"/[locale]/admin/users">) {
  const locale = await resolveLocale(params);
  await requireAdmin(locale);
  const { q } = await searchParams;
  const search = typeof q === "string" ? q.trim().slice(0, 80) : "";
  const supabase = await createClient();
  let users = supabase.from("profiles").select("id, email, full_name, created_at, user_roles!user_roles_user_id_fkey(role)").order("created_at", { ascending: false }).limit(50);
  if (search) users = users.ilike("email", `%${escapeLike(search)}%`);
  const [t, te, list, dataReqs, messages] = await Promise.all([
    getTranslations("admin"), getTranslations("enums"), users,
    supabase.from("data_requests").select("id, kind, details, status, created_at, profiles!data_requests_user_id_fkey(email)").in("status", ["open", "in_progress"]).order("created_at"),
    supabase.from("contact_messages").select("id, name, email, phone, subject, message, created_at").eq("status", "new").order("created_at", { ascending: false }).limit(50),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title={t("navUsers")} description={t("usersSubtitle")} />
      <Card>
        <CardHeader title={t("dataRequests")} description={t("dataRequestsHint")} />
        <CardBody>
          {dataReqs.data?.length ? (
            <ul className="divide-y divide-border text-sm">
              {dataReqs.data.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span><span className="font-medium">{te(`dataRequestKind.${d.kind as "access"}`)}</span> · {d.profiles?.email ?? "—"} · <span className="text-muted-foreground">{formatDate(d.created_at, locale, "medium")}</span>{d.details ? <span className="block text-muted-foreground">{d.details}</span> : null}</span>
                  <span className="flex gap-1">
                    {(["in_progress", "completed", "rejected"] as const).filter((s) => s !== d.status).map((s) => (
                      <ActionForm key={s} action={updateDataRequestAction} hidden={{ id: d.id, status: s }} submitLabel={te(`dataRequestStatus.${s}`)} variant="secondary" size="sm" inline />
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">{t("noResults")}</p>}
        </CardBody>
      </Card>
      <Card>
        <CardHeader title={t("contactMessages")} />
        <CardBody>
          {messages.data?.length ? (
            <ul className="space-y-3 text-sm">
              {messages.data.map((m) => (
                <li key={m.id} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{m.subject}</span>
                    <ActionForm action={markContactHandledAction} hidden={{ id: m.id }} submitLabel={t("markHandled")} variant="ghost" size="sm" inline />
                  </div>
                  <p className="text-xs text-muted-foreground">{m.name} · <a className="text-primary" href={`mailto:${m.email}`}>{m.email}</a>{m.phone ? ` · ${m.phone}` : ""} · {formatDateTime(m.created_at, locale)}</p>
                  <p className="mt-1 whitespace-pre-line">{m.message}</p>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">{t("noResults")}</p>}
        </CardBody>
      </Card>
      <Card>
        <CardHeader title={t("usersAndRoles")} description={t("rolesHint")} />
        <CardBody className="space-y-4">
          <form method="get" className="flex gap-2">
            <Input name="q" defaultValue={search} placeholder={t("searchEmail")} aria-label={t("searchEmail")} className="w-72" dir="ltr" />
            <button type="submit" className={buttonClasses("secondary")}>{t("search")}</button>
          </form>
          <Table>
            <thead><tr><th>{t("user")}</th><th>{t("roles")}</th><th>{t("created")}</th><th>{t("actions")}</th></tr></thead>
            <tbody>
              {(list.data ?? []).map((u) => {
                const roles = u.user_roles.map((r) => r.role);
                return (
                  <tr key={u.id}>
                    <td>{u.full_name ?? "—"}<div className="text-xs text-muted-foreground">{u.email}</div></td>
                    <td className="space-x-1">{roles.length ? roles.map((r) => <Badge key={r} tone="primary">{te(`role.${r}`)}</Badge>) : <span className="text-xs text-muted-foreground">{t("customer")}</span>}</td>
                    <td className="text-muted-foreground">{formatDate(u.created_at, locale, "medium")}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {(["staff", "admin"] as const).map((role) => (
                          <ActionForm key={role} action={setRoleAction} hidden={{ userId: u.id, role, grant: roles.includes(role) ? "0" : "1" }}
                            submitLabel={roles.includes(role) ? t("revokeRole", { role: te(`role.${role}`) }) : t("grantRole", { role: te(`role.${role}`) })}
                            variant="ghost" size="sm" inline confirmMessage={t("confirmAction")} />
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}
