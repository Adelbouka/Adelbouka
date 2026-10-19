import { describe, expect, it } from "vitest";
import { calculateEstimate, findRate, type CostRule, type ExchangeRate } from "./cost-calculator";

const rates: ExchangeRate[] = [
  { base: "EUR", quote: "DZD", rate: 150, source: "Test source A", effectiveDate: "2026-10-01", isDemo: false },
  { base: "USD", quote: "EUR", rate: 0.9, source: "Test source B", effectiveDate: "2026-10-01", isDemo: false },
];

const rule = (over: Partial<CostRule>): CostRule => ({
  code: "x", kind: "other", labelAr: "x", labelFr: "x", method: "quote_required", amount: null, currency: null,
  percent: null, isVerified: false, source: "s", sourceDate: null, ...over,
});

const customs = rule({ code: "taxes_and_customs", kind: "taxes_and_customs", method: "quote_required" });

describe("findRate", () => {
  it("returns 1 for identical currencies", () => {
    expect(findRate(rates, "DZD", "DZD")?.rate).toBe(1);
  });
  it("uses a direct rate", () => {
    expect(findRate(rates, "EUR", "DZD")?.rate).toBe(150);
  });
  it("inverts a rate when only the reverse pair exists", () => {
    expect(findRate(rates, "DZD", "EUR")?.rate).toBeCloseTo(1 / 150, 10);
  });
  it("converts through a pivot currency", () => {
    const path = findRate(rates, "USD", "DZD");
    expect(path?.rate).toBeCloseTo(135, 8);
    expect(path?.legs).toHaveLength(2);
  });
  it("returns null when no documented path exists", () => {
    expect(findRate(rates, "CNY", "DZD")).toBeNull();
  });
});

describe("calculateEstimate", () => {
  it("converts the vehicle price and records the rate source", () => {
    const e = calculateEstimate({ vehiclePrice: { amount: 20000, currency: "EUR" }, targetCurrency: "DZD", rates, rules: [] });
    expect(e.vehicle.convertedAmount).toBe(3_000_000);
    expect(e.vehicle.rate?.sources).toEqual(["Test source A"]);
    expect(e.total).toBe(3_000_000);
  });

  it("handles several currencies across lines", () => {
    const e = calculateEstimate({
      vehiclePrice: { amount: 10000, currency: "USD" },
      targetCurrency: "DZD",
      rates,
      rules: [
        rule({ code: "ship", kind: "international_shipping", method: "fixed", amount: 1000, currency: "EUR", isVerified: true, sourceDate: "2026-01-01" }),
        rule({ code: "docs", kind: "documentation_admin", method: "fixed", amount: 50000, currency: "DZD", isVerified: true, sourceDate: "2026-01-01" }),
      ],
    });
    expect(e.vehicle.convertedAmount).toBe(1_350_000);
    expect(e.lines.find((l) => l.code === "ship")?.convertedAmount).toBe(150_000);
    expect(e.lines.find((l) => l.code === "docs")?.convertedAmount).toBe(50_000);
    expect(e.total).toBe(1_550_000);
  });

  it("flags a missing exchange rate instead of inventing one", () => {
    const e = calculateEstimate({ vehiclePrice: { amount: 100000, currency: "CNY" }, targetCurrency: "DZD", rates, rules: [] });
    expect(e.vehicle.convertedAmount).toBeNull();
    expect(e.warnings).toContain("missing_rate");
    expect(e.missing).toContain("exchange_rate");
    expect(e.confidence).toBe("low");
  });

  it("uses a manual rate when provided and says so", () => {
    const e = calculateEstimate({ vehiclePrice: { amount: 1000, currency: "CNY" }, targetCurrency: "DZD", rates, manualRate: 19, rules: [] });
    expect(e.vehicle.convertedAmount).toBe(19000);
    expect(e.warnings).toContain("manual_rate");
  });

  it("flags a missing vehicle price", () => {
    const e = calculateEstimate({ vehiclePrice: null, targetCurrency: "DZD", rates, rules: [] });
    expect(e.warnings).toContain("missing_vehicle_price");
    expect(e.completeness).toBe(0);
  });

  it("keeps quote-required lines unknown and excludes them from the total", () => {
    const e = calculateEstimate({ vehiclePrice: { amount: 10000, currency: "EUR" }, targetCurrency: "DZD", rates, rules: [customs] });
    const line = e.lines[0];
    expect(line.status).toBe("unknown");
    expect(line.convertedAmount).toBeNull();
    expect(e.total).toBe(1_500_000);
    expect(e.completeness).toBe(50);
    expect(e.warnings).toEqual(expect.arrayContaining(["unknown_lines", "customs_not_assessed"]));
    expect(e.missing).toContain("taxes_and_customs");
  });

  it("computes percent rules on the converted price", () => {
    const e = calculateEstimate({
      vehiclePrice: { amount: 10000, currency: "EUR" }, targetCurrency: "DZD", rates,
      rules: [rule({ code: "ins", kind: "insurance", method: "percent_of_price", percent: 2 })],
    });
    expect(e.lines[0].convertedAmount).toBe(30000);
    expect(e.lines[0].unverified).toBe(true);
    expect(e.warnings).toContain("unverified_assumptions");
  });

  it("separates confirmed quotations from estimates", () => {
    const e = calculateEstimate({
      vehiclePrice: { amount: 10000, currency: "EUR" }, targetCurrency: "DZD", rates,
      rules: [rule({ code: "ship", kind: "international_shipping" }), rule({ code: "ins", kind: "insurance" })],
      overrides: {
        ship: { amount: 900, currency: "EUR", confirmed: true },
        ins: { amount: 20000, currency: "DZD", confirmed: false },
      },
    });
    expect(e.lines.find((l) => l.code === "ship")?.status).toBe("confirmed");
    expect(e.lines.find((l) => l.code === "ins")?.status).toBe("estimate");
    expect(e.total).toBe(1_500_000 + 135_000 + 20_000);
  });

  it("never reports high confidence without a confirmed customs assessment", () => {
    const e = calculateEstimate({
      vehiclePrice: { amount: 10000, currency: "EUR" }, targetCurrency: "DZD", rates, rules: [customs],
      overrides: { taxes_and_customs: { amount: 500000, currency: "DZD", confirmed: false } },
    });
    expect(e.completeness).toBe(100);
    expect(e.confidence).toBe("medium");
    const confirmed = calculateEstimate({
      vehiclePrice: { amount: 10000, currency: "EUR" }, targetCurrency: "DZD", rates, rules: [customs],
      overrides: { taxes_and_customs: { amount: 500000, currency: "DZD", confirmed: true } },
    });
    expect(confirmed.confidence).toBe("high");
  });

  it("warns when a demonstration rate is used", () => {
    const e = calculateEstimate({
      vehiclePrice: { amount: 100, currency: "EUR" }, targetCurrency: "DZD",
      rates: [{ ...rates[0], isDemo: true }], rules: [],
    });
    expect(e.warnings).toContain("demo_rate");
    expect(e.confidence).not.toBe("high");
  });

  it("includes explicitly identified extra costs", () => {
    const e = calculateEstimate({
      vehiclePrice: { amount: 1000, currency: "EUR" }, targetCurrency: "DZD", rates, rules: [],
      extraLines: [{ label: "Plaques", amount: 5000, currency: "DZD", confirmed: true }, { label: "", amount: 9, currency: "DZD", confirmed: false }],
    });
    expect(e.lines).toHaveLength(1);
    expect(e.total).toBe(155_000);
  });

  it("rounds amounts to two decimals", () => {
    const e = calculateEstimate({ vehiclePrice: { amount: 0.333, currency: "EUR" }, targetCurrency: "DZD", rates: [{ ...rates[0], rate: 3 }], rules: [] });
    expect(e.vehicle.convertedAmount).toBe(1);
  });
});
