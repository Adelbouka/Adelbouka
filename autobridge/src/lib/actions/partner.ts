"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { SERVICE_REQUEST_STATUSES } from "@/lib/domain/enums";
import { currencyCode, optionalText, requiredNumber, uuid } from "@/lib/validation/common";
import { formValues, fromDbError, fromZodError, type ActionState } from "./state";

const quoteSchema = z.object({
  serviceRequestId: uuid,
  amount: requiredNumber(1, 1_000_000_000, false),
  currency: currencyCode,
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "invalid_date" })
    .refine((d) => d >= new Date().toISOString().slice(0, 10), { error: "past_date" }),
  notes: optionalText(2000),
});

export async function submitServiceQuoteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formValues(formData);
  const parsed = quoteSchema.safeParse(values);
  if (!parsed.success) return fromZodError(parsed.error, values);
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_service_quote", {
    p_service_request_id: parsed.data.serviceRequestId,
    p_amount: parsed.data.amount,
    p_currency: parsed.data.currency,
    p_valid_until: parsed.data.validUntil,
    p_notes: parsed.data.notes ?? "",
  });
  if (error) return fromDbError(error);
  revalidatePath("/[locale]/partner", "layout");
  return { ok: true };
}

const statusSchema = z.object({ serviceRequestId: uuid, status: z.enum(SERVICE_REQUEST_STATUSES), note: optionalText(1000) });

/** Partner (or staff) updates a service request; the database enforces allowed moves. */
export async function updateServiceStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = statusSchema.safeParse(formValues(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_service_request_status", {
    p_service_request_id: parsed.data.serviceRequestId,
    p_status: parsed.data.status,
    p_note: parsed.data.note ?? undefined,
  });
  if (error) return fromDbError(error);
  revalidatePath("/[locale]/partner", "layout");
  revalidatePath("/[locale]/admin", "layout");
  return { ok: true };
}
