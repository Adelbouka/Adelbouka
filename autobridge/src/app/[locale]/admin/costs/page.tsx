import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatNumber } from "@/lib/format";
import {
  activateRuleSetAction, addExchangeRateAction, addRuleAction, cloneRuleSetAction, deleteRuleAction,
  deleteRuleSetAction, upsertCurrencyAction,
} from "@/lib/actions/admin";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Checkbox, Input, Select } from "@/components/ui/input";
import { PageHeader, Table } from "@/components/ui/misc";
import { ActionForm } from "@/components/forms/action-form";

const RULE_KINDS = ["domestic_transport", "international_shipping", "insurance", "inspection", "taxes_and_customs", "documentation_admin", "platform_service_fee", "partner_service_fee", "other"] as const;

export default async function AdminCosts({ params }: PageProps<"/[locale]/admin/costs">) {
  const locale = await resolveLocale(params);
  const viewer = await requireStaff(locale);
  const supabase = await createClient();
  const [t, te, tc, currencies, latest, history, sets] = await Promise.all([
    getTranslations("admin"), getTranslations("enums"), getTranslations("common"),
    supabase.from("currencies").select("*").order("code"),
    supabase.from("latest_exchange_rates").select("*"),
    supabase.from("exchange_rates").select("id, base_currency, quote_currency, rate, source, effective_date, is_demo, created_at").order("created_at", { ascending: false }).limit(20),
    supabase.from("cost_rule_sets").select("id, version, title, status, is_demo, activated_at, created_at, cost_estimate_rules(id, code, kind, label_ar, label_fr, method, amount, currency, percent, is_verified, source, source_date, position)").order("version", { ascending: false }),
  ]);
  const admin = viewer.isAdmin;
  const active = sets.data?.find((s) => s.status === "active");
  return (
    <div className="space-y-6">
      <PageHeader title={t("navCosts")} description={t("costsSubtitle")} />
      <Alert tone="warning">{t("costsWarning")}</Alert>
      {!admin ? <Alert tone="info">{t("readOnlyAdmin")}</Alert> : null}

      <Card>
        <CardHeader title={t("ruleSets")} description={t("ruleSetsHint")} />
        <CardBody className="space-y-6">
          {(sets.data ?? []).map((s) => (
            <div key={s.id} className="rounded-xl border border-border">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
                <div>
                  <p className="font-medium">v{s.version} — {s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.activated_at ? t("activatedOn", { date: formatDate(s.activated_at, locale) }) : formatDate(s.created_at, locale)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {s.is_demo ? <Badge tone="warning">{tc("demo")}</Badge> : null}
                  <Badge tone={s.status === "active" ? "success" : s.status === "draft" ? "info" : "neutral"}>{te(`ruleSetStatus.${s.status as "draft" | "active" | "retired"}`)}</Badge>
                  {admin && s.status === "draft" ? (
                    <>
                      <ActionForm action={activateRuleSetAction} hidden={{ ruleSetId: s.id }} submitLabel={t("activate")} size="sm" inline confirmMessage={t("activateConfirm")} />
                      <ActionForm action={deleteRuleSetAction} hidden={{ ruleSetId: s.id }} submitLabel={tc("delete")} variant="ghost" size="sm" inline />
                    </>
                  ) : null}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-surface-muted/60 text-xs text-muted-foreground"><tr>
                    <th className="px-4 py-2 text-start">{t("rule")}</th><th className="px-4 py-2 text-start">{t("method")}</th><th className="px-4 py-2 text-start">{t("value")}</th><th className="px-4 py-2 text-start">{t("source")}</th><th className="px-4 py-2" />
                  </tr></thead>
                  <tbody>
                    {[...s.cost_estimate_rules].sort((a, b) => a.position - b.position).map((r) => (
                      <tr key={r.id} className="border-t border-border">
                        <td className="px-4 py-2">{locale === "fr" ? r.label_fr : r.label_ar}<div className="font-mono text-xs text-muted-foreground">{r.code}</div></td>
                        <td className="px-4 py-2">{te(`ruleMethod.${r.method as "fixed"}`)}</td>
                        <td className="px-4 py-2 ltr-nums">{r.method === "fixed" ? `${formatNumber(Number(r.amount), locale, 2)} ${r.currency}` : r.method === "percent_of_price" ? `${r.percent}%` : "—"}</td>
                        <td className="px-4 py-2 text-xs">
                          {r.is_verified ? <Badge tone="success">{t("verified")}</Badge> : <Badge tone="warning">{t("unverified")}</Badge>}
                          <div className="mt-1 text-muted-foreground">{r.source}{r.source_date ? ` · ${formatDate(r.source_date, locale, "medium")}` : ""}</div>
                        </td>
                        <td className="px-4 py-2 text-end">{admin && s.status === "draft" ? <ActionForm action={deleteRuleAction} hidden={{ ruleId: r.id }} submitLabel={tc("delete")} variant="ghost" size="sm" inline /> : null}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {admin && s.status === "draft" ? (
                <details className="border-t border-border px-4 py-3">
                  <summary className="cursor-pointer text-sm font-medium text-primary">{t("addRule")}</summary>
                  <div className="mt-3">
                    <ActionForm action={addRuleAction} hidden={{ ruleSetId: s.id }} submitLabel={t("addRule")} size="sm">
                      <div className="grid gap-2 sm:grid-cols-3">
                        <Input name="code" placeholder="code_snake_case" aria-label="code" dir="ltr" required />
                        <Select name="kind" aria-label={t("kind")}>{RULE_KINDS.map((k) => <option key={k} value={k}>{te(`feeKind.${k}`)}</option>)}</Select>
                        <Select name="method" aria-label={t("method")}>{(["quote_required", "fixed", "percent_of_price"] as const).map((m) => <option key={m} value={m}>{te(`ruleMethod.${m}`)}</option>)}</Select>
                        <Input name="labelAr" placeholder={t("labelAr")} aria-label={t("labelAr")} dir="rtl" required />
                        <Input name="labelFr" placeholder={t("labelFr")} aria-label={t("labelFr")} dir="ltr" required />
                        <Input name="position" placeholder={t("position")} aria-label={t("position")} inputMode="numeric" dir="ltr" />
                        <Input name="amount" placeholder={t("amountFixed")} aria-label={t("amountFixed")} inputMode="decimal" dir="ltr" />
                        <Select name="currency" aria-label={tc("currency")} defaultValue=""><option value="">—</option>{(currencies.data ?? []).map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}</Select>
                        <Input name="percent" placeholder={t("percent")} aria-label={t("percent")} inputMode="decimal" dir="ltr" />
                        <Input name="source" placeholder={t("sourceRequired")} aria-label={t("source")} required className="sm:col-span-2" />
                        <Input name="sourceDate" type="date" aria-label={t("sourceDate")} dir="ltr" />
                        <Input name="sourceUrl" placeholder="https://…" aria-label={t("sourceUrl")} dir="ltr" className="sm:col-span-2" />
                        <label className="flex items-center gap-2 text-sm"><Checkbox name="isVerified" />{t("verifiedSource")}</label>
                      </div>
                    </ActionForm>
                  </div>
                </details>
              ) : null}
            </div>
          ))}
          {admin ? (
            <ActionForm action={cloneRuleSetAction} hidden={{ sourceId: active?.id ?? "" }} submitLabel={t("newVersion")} variant="secondary" inline>
              <Input name="title" aria-label={t("versionTitle")} placeholder={t("versionTitle")} className="w-72" required />
            </ActionForm>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("exchangeRates")} description={t("exchangeRatesHint")} />
        <CardBody className="space-y-4">
          <Table>
            <thead><tr><th>{t("pair")}</th><th>{t("rate")}</th><th>{t("source")}</th><th>{t("effectiveDate")}</th></tr></thead>
            <tbody>
              {(latest.data ?? []).map((r) => (
                <tr key={r.id}>
                  <td className="ltr-nums">1 {r.base_currency} → {r.quote_currency}</td>
                  <td className="ltr-nums">{formatNumber(Number(r.rate), "fr", 6)}</td>
                  <td>{r.source}{r.is_demo ? <Badge tone="warning" className="ms-2">{tc("demo")}</Badge> : null}</td>
                  <td>{formatDate(r.effective_date, locale, "medium")}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          {admin ? (
            <details>
              <summary className="cursor-pointer text-sm font-medium text-primary">{t("addRate")}</summary>
              <div className="mt-3">
                <ActionForm action={addExchangeRateAction} submitLabel={t("addRate")} size="sm">
                  <div className="grid gap-2 sm:grid-cols-4">
                    <Select name="base" aria-label={t("base")} defaultValue="EUR">{(currencies.data ?? []).map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}</Select>
                    <Select name="quote" aria-label={t("quote")} defaultValue="DZD">{(currencies.data ?? []).map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}</Select>
                    <Input name="rate" placeholder={t("rate")} aria-label={t("rate")} inputMode="decimal" dir="ltr" required />
                    <Input name="effectiveDate" type="date" aria-label={t("effectiveDate")} dir="ltr" defaultValue={new Date().toISOString().slice(0, 10)} required />
                    <Input name="source" placeholder={t("rateSourcePlaceholder")} aria-label={t("source")} required className="sm:col-span-2" />
                    <Input name="sourceUrl" placeholder="https://…" aria-label={t("sourceUrl")} dir="ltr" className="sm:col-span-2" />
                  </div>
                  <Input name="notes" placeholder={tc("notes")} aria-label={tc("notes")} />
                </ActionForm>
              </div>
            </details>
          ) : null}
          <details>
            <summary className="cursor-pointer text-sm text-muted-foreground">{t("rateHistory")}</summary>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {(history.data ?? []).map((h) => <li key={h.id} className="ltr-nums">{h.effective_date} · 1 {h.base_currency} = {h.rate} {h.quote_currency} · {h.source}</li>)}
            </ul>
          </details>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("currencies")} />
        <CardBody className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(currencies.data ?? []).map((c) => <Badge key={c.code} tone={c.is_active ? "success" : "neutral"}>{c.code} · {locale === "fr" ? c.name_fr : c.name_ar}</Badge>)}
          </div>
          {admin ? (
            <details>
              <summary className="cursor-pointer text-sm font-medium text-primary">{t("addCurrency")}</summary>
              <div className="mt-3">
                <ActionForm action={upsertCurrencyAction} submitLabel={tc("save")} size="sm">
                  <div className="grid gap-2 sm:grid-cols-4">
                    <Input name="code" placeholder="EUR" aria-label="code" dir="ltr" maxLength={3} required />
                    <Input name="nameAr" placeholder={t("labelAr")} aria-label={t("labelAr")} dir="rtl" required />
                    <Input name="nameFr" placeholder={t("labelFr")} aria-label={t("labelFr")} required />
                    <Input name="symbol" placeholder="€" aria-label={t("symbol")} required />
                  </div>
                  <label className="flex items-center gap-2 text-sm"><Checkbox name="isActive" defaultChecked />{t("active")}</label>
                </ActionForm>
              </div>
            </details>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
