import type { FeeKind } from "./enums";

/**
 * Transparent, itemised cost estimate.
 *
 * This is NOT a customs assessment. It never invents a rate: a line without a
 * documented value or a user-provided amount is reported as unknown, and the
 * estimate's completeness and confidence drop accordingly.
 */

export type ExchangeRate = {
  base: string;
  quote: string;
  /** 1 unit of `base` = `rate` units of `quote`. */
  rate: number;
  source: string;
  effectiveDate: string;
  isDemo: boolean;
};

export type RuleMethod = "fixed" | "percent_of_price" | "quote_required";

export type CostRule = {
  code: string;
  kind: FeeKind;
  labelAr: string;
  labelFr: string;
  method: RuleMethod;
  amount: number | null;
  currency: string | null;
  percent: number | null;
  isVerified: boolean;
  source: string;
  sourceDate: string | null;
};

/** A user-provided value for a line (e.g. a shipping quote they received). */
export type LineOverride = {
  amount: number;
  currency: string;
  /** True when the amount comes from a confirmed written quotation. */
  confirmed: boolean;
};

export type CalculatorInput = {
  vehiclePrice: { amount: number; currency: string } | null;
  targetCurrency: string;
  rates: ExchangeRate[];
  /** Optional user-supplied conversion rate (1 vehicle currency = manualRate target currency). */
  manualRate?: number | null;
  rules: CostRule[];
  overrides?: Record<string, LineOverride | undefined>;
  /** Extra lines the user adds explicitly ("other identified costs"). */
  extraLines?: Array<{ label: string; amount: number; currency: string; confirmed: boolean }>;
  calculatedAt?: Date;
};

export type LineStatus = "confirmed" | "estimate" | "unknown";
export type LineOrigin = "rule" | "user" | "none";

export type CostLine = {
  code: string;
  kind: FeeKind;
  labelAr: string;
  labelFr: string;
  status: LineStatus;
  origin: LineOrigin;
  originalAmount: number | null;
  originalCurrency: string | null;
  convertedAmount: number | null;
  /** True when a rule value has not been verified against a documented source. */
  unverified: boolean;
  source: string | null;
  sourceDate: string | null;
};

export type RateUsed = {
  from: string;
  to: string;
  rate: number;
  manual: boolean;
  isDemo: boolean;
  sources: string[];
  effectiveDates: string[];
};

export type EstimateWarning =
  | "missing_vehicle_price"
  | "missing_rate"
  | "demo_rate"
  | "manual_rate"
  | "unverified_assumptions"
  | "customs_not_assessed"
  | "unknown_lines";

export type CostEstimate = {
  currency: string;
  calculatedAt: string;
  vehicle: {
    originalAmount: number | null;
    originalCurrency: string | null;
    convertedAmount: number | null;
    rate: RateUsed | null;
  };
  lines: CostLine[];
  total: number;
  knownCount: number;
  unknownCount: number;
  completeness: number;
  confidence: "low" | "medium" | "high";
  warnings: EstimateWarning[];
  missing: string[];
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

type RatePath = { rate: number; legs: ExchangeRate[] };

function directOrInverse(rates: ExchangeRate[], from: string, to: string): RatePath | null {
  const direct = rates.find((r) => r.base === from && r.quote === to && r.rate > 0);
  if (direct) return { rate: direct.rate, legs: [direct] };
  const inverse = rates.find((r) => r.base === to && r.quote === from && r.rate > 0);
  if (inverse) return { rate: 1 / inverse.rate, legs: [inverse] };
  return null;
}

/** Finds a conversion from -> to using a direct, inverse or single-pivot rate. */
export function findRate(rates: ExchangeRate[], from: string, to: string): RatePath | null {
  if (from === to) return { rate: 1, legs: [] };
  const simple = directOrInverse(rates, from, to);
  if (simple) return simple;
  const pivots = new Set(rates.flatMap((r) => [r.base, r.quote]));
  for (const pivot of pivots) {
    if (pivot === from || pivot === to) continue;
    const a = directOrInverse(rates, from, pivot);
    const b = a && directOrInverse(rates, pivot, to);
    if (a && b) return { rate: a.rate * b.rate, legs: [...a.legs, ...b.legs] };
  }
  return null;
}

function convert(
  amount: number,
  from: string,
  to: string,
  rates: ExchangeRate[],
): { value: number; path: RatePath } | null {
  const path = findRate(rates, from, to);
  return path ? { value: round2(amount * path.rate), path } : null;
}

export function calculateEstimate(input: CalculatorInput): CostEstimate {
  const target = input.targetCurrency;
  const warnings = new Set<EstimateWarning>();
  const missing: string[] = [];
  const usedDemoRates = new Set<boolean>();

  // Vehicle price ------------------------------------------------------------
  let vehicleConverted: number | null = null;
  let rateUsed: RateUsed | null = null;
  const vp = input.vehiclePrice;
  if (!vp || !(vp.amount > 0)) {
    warnings.add("missing_vehicle_price");
    missing.push("vehicle_price");
  } else if (vp.currency === target) {
    vehicleConverted = round2(vp.amount);
  } else if (input.manualRate && input.manualRate > 0) {
    vehicleConverted = round2(vp.amount * input.manualRate);
    rateUsed = {
      from: vp.currency, to: target, rate: input.manualRate, manual: true, isDemo: false,
      sources: [], effectiveDates: [],
    };
    warnings.add("manual_rate");
  } else {
    const c = convert(vp.amount, vp.currency, target, input.rates);
    if (c) {
      vehicleConverted = c.value;
      const isDemo = c.path.legs.some((l) => l.isDemo);
      rateUsed = {
        from: vp.currency, to: target, rate: c.path.rate, manual: false, isDemo,
        sources: c.path.legs.map((l) => l.source),
        effectiveDates: c.path.legs.map((l) => l.effectiveDate),
      };
      usedDemoRates.add(isDemo);
    } else {
      warnings.add("missing_rate");
      missing.push("exchange_rate");
    }
  }

  // Additional cost lines ------------------------------------------------------
  const lines: CostLine[] = input.rules.map((rule) => {
    const override = input.overrides?.[rule.code];
    const base = {
      code: rule.code, kind: rule.kind, labelAr: rule.labelAr, labelFr: rule.labelFr,
    };
    if (override && override.amount >= 0 && override.currency) {
      const c = convert(override.amount, override.currency, target, input.rates);
      if (c) usedDemoRates.add(c.path.legs.some((l) => l.isDemo));
      return {
        ...base,
        status: c ? (override.confirmed ? "confirmed" : "estimate") : "unknown",
        origin: "user",
        originalAmount: round2(override.amount),
        originalCurrency: override.currency,
        convertedAmount: c ? c.value : null,
        unverified: false,
        source: null,
        sourceDate: null,
      } satisfies CostLine;
    }
    if (rule.method === "fixed" && rule.amount != null && rule.currency) {
      const c = convert(rule.amount, rule.currency, target, input.rates);
      if (c) usedDemoRates.add(c.path.legs.some((l) => l.isDemo));
      return {
        ...base,
        status: c ? "estimate" : "unknown",
        origin: "rule",
        originalAmount: rule.amount,
        originalCurrency: rule.currency,
        convertedAmount: c ? c.value : null,
        unverified: !rule.isVerified,
        source: rule.source,
        sourceDate: rule.sourceDate,
      } satisfies CostLine;
    }
    if (rule.method === "percent_of_price" && rule.percent != null && vehicleConverted != null) {
      return {
        ...base,
        status: "estimate",
        origin: "rule",
        originalAmount: null,
        originalCurrency: null,
        convertedAmount: round2((vehicleConverted * rule.percent) / 100),
        unverified: !rule.isVerified,
        source: rule.source,
        sourceDate: rule.sourceDate,
      } satisfies CostLine;
    }
    return {
      ...base,
      status: "unknown",
      origin: "none",
      originalAmount: null,
      originalCurrency: null,
      convertedAmount: null,
      unverified: false,
      source: rule.source,
      sourceDate: rule.sourceDate,
    } satisfies CostLine;
  });

  (input.extraLines ?? []).forEach((extra, i) => {
    if (!(extra.amount >= 0) || !extra.label.trim()) return;
    const c = convert(extra.amount, extra.currency, target, input.rates);
    if (c) usedDemoRates.add(c.path.legs.some((l) => l.isDemo));
    lines.push({
      code: `extra_${i + 1}`,
      kind: "other",
      labelAr: extra.label.trim(),
      labelFr: extra.label.trim(),
      status: c ? (extra.confirmed ? "confirmed" : "estimate") : "unknown",
      origin: "user",
      originalAmount: round2(extra.amount),
      originalCurrency: extra.currency,
      convertedAmount: c ? c.value : null,
      unverified: false,
      source: null,
      sourceDate: null,
    });
  });

  for (const line of lines) {
    if (line.status === "unknown") missing.push(line.code);
    if (line.unverified) warnings.add("unverified_assumptions");
  }
  if (lines.some((l) => l.status === "unknown")) warnings.add("unknown_lines");
  const customs = lines.find((l) => l.kind === "taxes_and_customs");
  if (!customs || customs.status !== "confirmed") warnings.add("customs_not_assessed");
  if (usedDemoRates.has(true)) warnings.add("demo_rate");

  // Totals -------------------------------------------------------------------
  const knownLines = lines.filter((l) => l.convertedAmount != null);
  const total = round2((vehicleConverted ?? 0) + knownLines.reduce((s, l) => s + (l.convertedAmount ?? 0), 0));
  const slots = lines.length + 1;
  const known = knownLines.length + (vehicleConverted != null ? 1 : 0);
  const completeness = Math.round((known / slots) * 100);

  let confidence: CostEstimate["confidence"] = "low";
  if (completeness === 100 && !warnings.has("demo_rate") && !warnings.has("unverified_assumptions")) {
    confidence = "high";
  } else if (completeness >= 60 && !warnings.has("missing_rate") && !warnings.has("missing_vehicle_price")) {
    confidence = "medium";
  }
  // Without an official customs assessment the estimate can never be "high".
  if (confidence === "high" && warnings.has("customs_not_assessed")) confidence = "medium";

  return {
    currency: target,
    calculatedAt: (input.calculatedAt ?? new Date()).toISOString(),
    vehicle: {
      originalAmount: vp ? round2(vp.amount) : null,
      originalCurrency: vp?.currency ?? null,
      convertedAmount: vehicleConverted,
      rate: rateUsed,
    },
    lines,
    total,
    knownCount: known,
    unknownCount: slots - known,
    completeness,
    confidence,
    warnings: [...warnings],
    missing,
  };
}
