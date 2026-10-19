"use client";
import { useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, CircleHelp, Plus, Trash2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { calculateEstimate, type CostRule, type ExchangeRate, type LineOverride } from "@/lib/domain/cost-calculator";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { saveEstimateAction } from "@/lib/actions/estimates";
import { Button, buttonClasses } from "@/components/ui/button";
import { Checkbox, Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";

type Props = {
  rules: CostRule[];
  rates: ExchangeRate[];
  currencies: { code: string }[];
  ruleSet: { version: number; title: string; isDemo: boolean } | null;
  vehicle?: { id: string; slug: string; price: number; currency: string } | null;
  signedIn: boolean;
  compact?: boolean;
};

type ExtraLine = { label: string; amount: string; currency: string; confirmed: boolean };

export function CostCalculator({ rules, rates, currencies, ruleSet, vehicle, signedIn, compact }: Props) {
  const t = useTranslations("estimate");
  const te = useTranslations("errors");
  const locale = useLocale();
  const [price, setPrice] = useState(vehicle ? String(vehicle.price) : "");
  const [currency, setCurrency] = useState(vehicle?.currency ?? "EUR");
  const [manualRate, setManualRate] = useState("");
  const [overrides, setOverrides] = useState<Record<string, { amount: string; currency: string; confirmed: boolean }>>({});
  const [extras, setExtras] = useState<ExtraLine[]>([]);
  const [saved, setSaved] = useState<{ id: string } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const parsedOverrides = useMemo(() => {
    const out: Record<string, LineOverride> = {};
    for (const [code, o] of Object.entries(overrides)) {
      const amount = Number(o.amount.replace(",", "."));
      if (o.amount.trim() !== "" && Number.isFinite(amount) && amount >= 0) out[code] = { amount, currency: o.currency, confirmed: o.confirmed };
    }
    return out;
  }, [overrides]);

  const inputs = useMemo(() => ({
    vehiclePrice: Number(price) > 0 ? { amount: Number(price), currency } : null,
    targetCurrency: "DZD",
    rates,
    manualRate: Number(manualRate) > 0 ? Number(manualRate) : null,
    rules,
    overrides: parsedOverrides,
    extraLines: extras
      .map((e) => ({ label: e.label, amount: Number(e.amount.replace(",", ".")), currency: e.currency, confirmed: e.confirmed }))
      .filter((e) => e.label.trim() && Number.isFinite(e.amount) && e.amount >= 0),
  }), [price, currency, rates, manualRate, rules, parsedOverrides, extras]);

  const estimate = useMemo(() => calculateEstimate(inputs), [inputs]);
  const label = (l: { labelAr: string; labelFr: string }) => (locale === "fr" ? l.labelFr : l.labelAr);
  const rateForDisplay = estimate.vehicle.rate;

  const setOverride = (code: string, patch: Partial<{ amount: string; currency: string; confirmed: boolean }>) => {
    setSaved(null);
    setOverrides((prev) => {
      const current = prev[code] ?? { amount: "", currency: "EUR", confirmed: false };
      return { ...prev, [code]: { ...current, ...patch } };
    });
  };

  const save = () => {
    setSaveError(null);
    startTransition(async () => {
      const res = await saveEstimateAction({
        vehicleId: vehicle?.id ?? null,
        price: Number(price) || 0,
        currency,
        manualRate: Number(manualRate) > 0 ? Number(manualRate) : null,
        overrides: parsedOverrides,
        extraLines: inputs.extraLines,
      });
      if (res.ok && res.data?.id) setSaved({ id: String(res.data.id) });
      else setSaveError(te.has(res.error ?? "unexpected") ? te(res.error ?? "unexpected") : te("unexpected"));
    });
  };

  const currencyOptions = currencies.map((c) => <option key={c.code} value={c.code}>{c.code}</option>);
  const confidenceTone = estimate.confidence === "high" ? "success" : estimate.confidence === "medium" ? "warning" : "danger";

  return (
    <div className={cn("grid gap-6", !compact && "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]")}>
      {/* Inputs */}
      <div className="space-y-5">
        <fieldset className="rounded-xl border border-border bg-surface p-4">
          <legend className="px-1 text-sm font-semibold">{t("vehiclePrice")}</legend>
          <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
            <div>
              <label htmlFor="calc-price" className="mb-1 block text-xs text-muted-foreground">{t("purchasePrice")}</label>
              <Input id="calc-price" inputMode="decimal" dir="ltr" value={price} placeholder="0"
                onChange={(e) => { setSaved(null); setPrice(e.target.value.replace(/[^\d.]/g, "")); }} />
            </div>
            <div>
              <label htmlFor="calc-currency" className="mb-1 block text-xs text-muted-foreground">{t("purchaseCurrency")}</label>
              <Select id="calc-currency" value={currency} onChange={(e) => { setSaved(null); setCurrency(e.target.value); }}>{currencyOptions}</Select>
            </div>
          </div>
          {currency !== "DZD" ? (
            <div className="mt-3">
              <label htmlFor="calc-rate" className="mb-1 block text-xs text-muted-foreground">{t("conversionRate", { from: currency })}</label>
              <Input id="calc-rate" inputMode="decimal" dir="ltr" value={manualRate}
                placeholder={rateForDisplay && !rateForDisplay.manual ? formatNumber(rateForDisplay.rate, "fr", 4) : t("enterRate")}
                onChange={(e) => { setSaved(null); setManualRate(e.target.value.replace(/[^\d.]/g, "")); }} />
              <p className="mt-1 text-xs text-muted-foreground">
                {rateForDisplay && !rateForDisplay.manual
                  ? t("rateSource", { sources: rateForDisplay.sources.join(" · "), date: rateForDisplay.effectiveDates.map((d) => formatDate(d, locale, "medium")).join(" · ") })
                  : manualRate ? t("rateManual") : t("rateMissing")}
              </p>
            </div>
          ) : null}
        </fieldset>

        <fieldset className="rounded-xl border border-border bg-surface p-4">
          <legend className="px-1 text-sm font-semibold">{t("additionalCosts")}</legend>
          <p className="mb-3 text-xs text-muted-foreground">{t("additionalCostsHint")}</p>
          <ul className="space-y-3">
            {rules.map((rule) => {
              const o = overrides[rule.code];
              const placeholder =
                rule.method === "fixed" && rule.amount != null ? `${rule.amount} ${rule.currency}` :
                rule.method === "percent_of_price" && rule.percent != null ? `${rule.percent}%` : t("unknownValue");
              return (
                <li key={rule.code} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label htmlFor={`calc-${rule.code}`} className="text-sm font-medium">{label(rule)}</label>
                    {rule.method !== "quote_required" && !rule.isVerified ? <Badge tone="warning">{t("unverifiedAssumption")}</Badge> : null}
                  </div>
                  <div className="mt-2 grid grid-cols-[minmax(0,1fr)_6.5rem] gap-2">
                    <Input id={`calc-${rule.code}`} inputMode="decimal" dir="ltr" placeholder={placeholder}
                      value={o?.amount ?? ""} onChange={(e) => setOverride(rule.code, { amount: e.target.value.replace(/[^\d.]/g, "") })} />
                    <Select aria-label={t("purchaseCurrency")} value={o?.currency ?? "EUR"} onChange={(e) => setOverride(rule.code, { currency: e.target.value })}>{currencyOptions}</Select>
                  </div>
                  <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Checkbox checked={o?.confirmed ?? false} onChange={(e) => setOverride(rule.code, { confirmed: e.target.checked })} />
                    {t("confirmedQuote")}
                  </label>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 space-y-3">
            {extras.map((extra, i) => (
              <div key={i} className="rounded-lg border border-dashed border-border-strong p-3">
                <div className="flex gap-2">
                  <Input aria-label={t("extraLabel")} placeholder={t("extraLabel")} value={extra.label}
                    onChange={(e) => setExtras((p) => p.map((x, j) => (j === i ? { ...x, label: e.target.value.slice(0, 80) } : x)))} />
                  <Button variant="ghost" size="sm" className="h-10" aria-label={t("removeLine")} onClick={() => setExtras((p) => p.filter((_, j) => j !== i))}>
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
                <div className="mt-2 grid grid-cols-[minmax(0,1fr)_6.5rem] gap-2">
                  <Input aria-label={t("amount")} inputMode="decimal" dir="ltr" value={extra.amount}
                    onChange={(e) => setExtras((p) => p.map((x, j) => (j === i ? { ...x, amount: e.target.value.replace(/[^\d.]/g, "") } : x)))} />
                  <Select aria-label={t("purchaseCurrency")} value={extra.currency}
                    onChange={(e) => setExtras((p) => p.map((x, j) => (j === i ? { ...x, currency: e.target.value } : x)))}>{currencyOptions}</Select>
                </div>
                <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox checked={extra.confirmed}
                    onChange={(e) => setExtras((p) => p.map((x, j) => (j === i ? { ...x, confirmed: e.target.checked } : x)))} />
                  {t("confirmedQuote")}
                </label>
              </div>
            ))}
            {extras.length < 5 ? (
              <Button variant="secondary" size="sm" onClick={() => setExtras((p) => [...p, { label: "", amount: "", currency: "DZD", confirmed: false }])}>
                <Plus className="size-4" aria-hidden="true" />{t("addLine")}
              </Button>
            ) : null}
          </div>
        </fieldset>
      </div>

      {/* Result */}
      <section aria-live="polite" aria-label={t("result")} className="h-fit rounded-xl border border-border bg-surface lg:sticky lg:top-20">
        <div className="border-b border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">{t("estimatedTotal")}</h3>
            <Badge tone={confidenceTone}>{t(`confidence.${estimate.confidence}`)}</Badge>
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight ltr-nums" data-testid="estimate-total">{formatMoney(estimate.total, "DZD", locale)}</p>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t("completeness")}</span>
              <span className="ltr-nums">{estimate.completeness}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={estimate.completeness} aria-label={t("completeness")}>
              <div className={cn("h-full rounded-full", estimate.completeness === 100 ? "bg-success" : estimate.completeness >= 60 ? "bg-warning" : "bg-danger")} style={{ width: `${estimate.completeness}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t("knownOfTotal", { known: estimate.knownCount, total: estimate.knownCount + estimate.unknownCount })}</p>
          </div>
        </div>

        <table className="w-full text-sm">
          <caption className="sr-only">{t("breakdown")}</caption>
          <tbody className="[&_td]:px-4 [&_td]:py-2 [&_tr]:border-b [&_tr]:border-border">
            <tr>
              <td>
                <div className="font-medium">{t("vehiclePrice")}</div>
                {estimate.vehicle.originalAmount != null ? (
                  <div className="text-xs text-muted-foreground ltr-nums">{formatMoney(estimate.vehicle.originalAmount, estimate.vehicle.originalCurrency ?? "EUR", locale)}</div>
                ) : null}
              </td>
              <td className="text-end ltr-nums">{estimate.vehicle.convertedAmount != null ? formatMoney(estimate.vehicle.convertedAmount, "DZD", locale) : <UnknownMark label={t("unknown")} />}</td>
            </tr>
            {estimate.lines.map((line) => (
              <tr key={line.code}>
                <td>
                  <div className="flex items-center gap-1.5">
                    <StatusIcon status={line.status} labels={{ confirmed: t("lineConfirmed"), estimate: t("lineEstimate"), unknown: t("unknown") }} />
                    <span>{label(line)}</span>
                  </div>
                  {line.originalAmount != null && line.originalCurrency && line.originalCurrency !== "DZD" ? (
                    <div className="ps-5 text-xs text-muted-foreground ltr-nums">{formatMoney(line.originalAmount, line.originalCurrency, locale)}</div>
                  ) : null}
                  {line.unverified ? <div className="ps-5 text-xs text-warning">{t("unverifiedAssumption")}</div> : null}
                </td>
                <td className="text-end ltr-nums">{line.convertedAmount != null ? formatMoney(line.convertedAmount, "DZD", locale) : <UnknownMark label={t("unknown")} />}</td>
              </tr>
            ))}
            <tr className="bg-surface-muted/60 font-semibold">
              <td>{t("estimatedTotal")}</td>
              <td className="text-end ltr-nums">{formatMoney(estimate.total, "DZD", locale)}</td>
            </tr>
          </tbody>
        </table>

        <div className="space-y-2 p-4">
          {estimate.warnings.includes("customs_not_assessed") ? <Alert tone="warning">{t("warnings.customs_not_assessed")}</Alert> : null}
          {estimate.warnings.filter((w) => w !== "customs_not_assessed").map((w) => (
            <p key={w} className="flex gap-2 text-xs text-muted-foreground"><AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden="true" />{t(`warnings.${w}`)}</p>
          ))}
          <p className="text-xs text-muted-foreground">
            {t("calculatedOn", { date: formatDate(estimate.calculatedAt, locale, "long") })}
            {ruleSet ? ` · ${t("rulesVersion", { version: ruleSet.version })}` : ""}
            {ruleSet?.isDemo ? ` · ${t("demoRules")}` : ""}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">{t("disclaimer")}</p>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border p-4">
          {signedIn ? (
            saved ? (
              <Link href={{ pathname: "/requests/new", query: { ...(vehicle ? { vehicle: vehicle.slug } : {}), estimate: saved.id } }} className={buttonClasses("primary")}>
                {t("requestWithEstimate")}
              </Link>
            ) : (
              <Button onClick={save} disabled={pending || !(Number(price) > 0)}>{pending ? t("saving") : t("saveEstimate")}</Button>
            )
          ) : (
            <Link href={{ pathname: "/auth/sign-in", query: { next: `/${locale}${vehicle ? `/vehicles/${vehicle.slug}` : "/estimate"}` } }} className={buttonClasses("secondary")}>
              {t("signInToSave")}
            </Link>
          )}
          <Link href={{ pathname: "/requests/new", query: vehicle ? { vehicle: vehicle.slug } : {} }} className={buttonClasses(saved ? "secondary" : "ghost")}>
            {t("requestQuotation")}
          </Link>
          {saveError ? <p role="alert" className="w-full text-sm text-danger">{saveError}</p> : null}
          {saved ? <p className="w-full text-sm text-success">{t("savedNotice")}</p> : null}
        </div>
      </section>
    </div>
  );
}

function UnknownMark({ label }: { label: string }) {
  return <span className="text-xs font-medium text-muted-foreground">{label}</span>;
}

function StatusIcon({ status, labels }: { status: "confirmed" | "estimate" | "unknown"; labels: Record<string, string> }) {
  if (status === "confirmed") return <CheckCircle2 className="size-3.5 shrink-0 text-success" aria-label={labels.confirmed} />;
  if (status === "estimate") return <AlertTriangle className="size-3.5 shrink-0 text-warning" aria-label={labels.estimate} />;
  return <CircleHelp className="size-3.5 shrink-0 text-muted-foreground" aria-label={labels.unknown} />;
}
