import { z } from "zod";
import { ALLOWED_PAYEES, FEE_KINDS, FEE_PARTIES } from "@/lib/domain/enums";
import { currencyCode, requiredNumber, requiredText } from "./common";

export const quotationItemSchema = z
  .object({
    kind: z.enum(FEE_KINDS, { error: "invalid_choice" }),
    description: requiredText(300, 2),
    amount: requiredNumber(0, 1_000_000_000, false),
    payee: z.enum(FEE_PARTIES, { error: "invalid_choice" }),
    isEstimate: z.boolean(),
  })
  .superRefine((item, ctx) => {
    if (!ALLOWED_PAYEES[item.kind].includes(item.payee)) ctx.addIssue({ code: "custom", path: ["payee"], message: "payee_mismatch" });
  });

export const quotationSchema = z.object({
  requestId: z.uuid(),
  currency: currencyCode,
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "invalid_date" })
    .refine((d) => d >= new Date().toISOString().slice(0, 10), { error: "past_date" }),
  terms: z.preprocess((v) => (v === "" ? undefined : v), z.string().max(3000, { error: "too_long" }).optional()),
  items: z.array(quotationItemSchema).min(1, { error: "at_least_one_item" }).max(30),
});

export type QuotationInput = z.input<typeof quotationSchema>;

/** Taxes and customs lines are always estimates (never an official assessment). */
export function normalizeItems(items: z.infer<typeof quotationItemSchema>[]) {
  return items.map((i) => ({
    kind: i.kind,
    description: i.description,
    amount: i.amount,
    payee: i.payee,
    is_estimate: i.kind === "taxes_and_customs" ? true : i.isEstimate,
  }));
}
