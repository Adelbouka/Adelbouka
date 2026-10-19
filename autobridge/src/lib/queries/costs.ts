import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { CostRule, ExchangeRate } from "@/lib/domain/cost-calculator";

export type CostConfig = {
  ruleSet: { id: string; version: number; title: string; isDemo: boolean; activatedAt: string | null } | null;
  rules: CostRule[];
  rates: ExchangeRate[];
  currencies: { code: string; nameAr: string; nameFr: string }[];
};

/** Active (versioned) cost rules, latest documented exchange rates and currencies. */
export const getCostConfig = cache(async (): Promise<CostConfig> => {
  const supabase = await createClient();
  const [setRes, ratesRes, currRes] = await Promise.all([
    supabase.from("cost_rule_sets").select("id, version, title, is_demo, activated_at").eq("status", "active").maybeSingle(),
    supabase.from("latest_exchange_rates").select("base_currency, quote_currency, rate, source, effective_date, is_demo"),
    supabase.from("currencies").select("code, name_ar, name_fr").eq("is_active", true).order("code"),
  ]);
  const set = setRes.data;
  let rules: CostRule[] = [];
  if (set) {
    const { data } = await supabase
      .from("cost_estimate_rules")
      .select("code, kind, label_ar, label_fr, method, amount, currency, percent, is_verified, source, source_date, pathway_code, position")
      .eq("rule_set_id", set.id)
      .is("pathway_code", null)
      .order("position");
    rules = (data ?? []).map((r) => ({
      code: r.code,
      kind: r.kind,
      labelAr: r.label_ar,
      labelFr: r.label_fr,
      method: r.method as CostRule["method"],
      amount: r.amount == null ? null : Number(r.amount),
      currency: r.currency,
      percent: r.percent == null ? null : Number(r.percent),
      isVerified: r.is_verified,
      source: r.source,
      sourceDate: r.source_date,
    }));
  }
  return {
    ruleSet: set
      ? { id: set.id, version: set.version, title: set.title, isDemo: set.is_demo, activatedAt: set.activated_at }
      : null,
    rules,
    rates: (ratesRes.data ?? [])
      .filter((r) => r.base_currency && r.quote_currency && r.rate)
      .map((r) => ({
        base: r.base_currency!, quote: r.quote_currency!, rate: Number(r.rate), source: r.source ?? "",
        effectiveDate: r.effective_date ?? "", isDemo: Boolean(r.is_demo),
      })),
    currencies: (currRes.data ?? []).map((c) => ({ code: c.code, nameAr: c.name_ar, nameFr: c.name_fr })),
  };
});
