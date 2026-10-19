"use server";
import { createClient } from "@/lib/supabase/server";
import { calculateEstimate } from "@/lib/domain/cost-calculator";
import { getCostConfig } from "@/lib/queries/costs";
import { saveEstimateSchema, type SaveEstimateInput } from "@/lib/validation/estimate";
import { fromDbError, type ActionState } from "./state";

/** Saves an estimate snapshot. The result is recomputed on the server from the active rules. */
export async function saveEstimateAction(input: SaveEstimateInput): Promise<ActionState> {
  const parsed = saveEstimateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "forbidden" };

  const config = await getCostConfig();
  const knownCurrencies = new Set(config.currencies.map((c) => c.code));
  const v = parsed.data;
  if (!knownCurrencies.has(v.currency)) return { ok: false, error: "invalid_currency" };

  const estimate = calculateEstimate({
    vehiclePrice: { amount: v.price, currency: v.currency },
    targetCurrency: "DZD",
    rates: config.rates,
    manualRate: v.manualRate,
    rules: config.rules,
    overrides: Object.fromEntries(Object.entries(v.overrides).filter(([, o]) => knownCurrencies.has(o.currency))),
    extraLines: v.extraLines.filter((e) => knownCurrencies.has(e.currency)),
  });

  const { data, error } = await supabase
    .from("cost_estimates")
    .insert({
      user_id: user.id,
      vehicle_id: v.vehicleId,
      rule_set_id: config.ruleSet?.id ?? null,
      inputs: v,
      result: estimate,
      total_amount: estimate.total,
      total_currency: "DZD",
      completeness: estimate.completeness,
    })
    .select("id")
    .single();
  if (error || !data) return fromDbError(error);
  return { ok: true, data: { id: data.id } };
}
