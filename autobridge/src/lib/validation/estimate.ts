import { z } from "zod";

const money = z.number().finite().min(0).max(1_000_000_000);
const currency = z.string().regex(/^[A-Z]{3}$/);

export const saveEstimateSchema = z.object({
  vehicleId: z.uuid().nullable(),
  price: money.refine((v) => v > 0),
  currency,
  manualRate: z.number().finite().positive().max(1_000_000).nullable(),
  overrides: z.record(
    z.string().regex(/^[a-z_]{1,40}$/),
    z.object({ amount: money, currency, confirmed: z.boolean() }),
  ).refine((o) => Object.keys(o).length <= 30),
  extraLines: z.array(z.object({ label: z.string().trim().min(1).max(80), amount: money, currency, confirmed: z.boolean() })).max(5),
});

export type SaveEstimateInput = z.infer<typeof saveEstimateSchema>;
