"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { REQUEST_STATUSES } from "@/lib/domain/enums";
import { purchaseRequestSchema, type PurchaseRequestInput } from "@/lib/validation/request";
import { localeSchema, optionalText, uuid } from "@/lib/validation/common";
import { formValues, fromDbError, fromZodError, type ActionState } from "./state";

export async function createPurchaseRequestAction(input: PurchaseRequestInput, locale: string): Promise<ActionState> {
  const parsed = purchaseRequestSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const v = parsed.data;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "forbidden" };

  const isListed = v.requestType === "listed_vehicle";
  const { data, error } = await supabase
    .from("purchase_requests")
    .insert({
      customer_id: user.id,
      request_type: v.requestType,
      vehicle_id: isListed ? v.vehicleId! : null,
      desired_make_id: isListed ? null : (v.desiredMakeId ?? null),
      desired_model: isListed ? null : (v.desiredModel ?? null),
      year_min: isListed ? null : (v.yearMin ?? null),
      year_max: isListed ? null : (v.yearMax ?? null),
      max_mileage_km: isListed ? null : (v.maxMileageKm ?? null),
      desired_fuel: isListed ? null : (v.desiredFuel ?? null),
      desired_transmission: isListed ? null : (v.desiredTransmission ?? null),
      preferences: v.preferences ?? null,
      budget_amount: v.budgetAmount ?? null,
      budget_currency: v.budgetCurrency,
      pathway_code: v.pathwayCode,
      contact_name: v.contactName,
      contact_phone: v.contactPhone,
      contact_email: v.contactEmail ?? null,
      wilaya: v.wilaya,
      preferred_contact: v.preferredContact,
      message: v.message ?? null,
      cost_estimate_id: v.costEstimateId ?? null,
      status: v.asDraft ? "draft" : "submitted",
    })
    .select("id")
    .single();
  if (error || !data) return fromDbError(error);
  revalidatePath("/[locale]/account", "layout");
  redirect(`/${localeSchema.parse(locale)}/account/requests/${data.id}?created=1`);
}

const transitionSchema = z.object({
  requestId: uuid,
  to: z.enum(REQUEST_STATUSES),
  note: optionalText(2000),
});

/** Customer- or staff-initiated status change; the database validates actor and transition. */
export async function transitionRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = transitionSchema.safeParse(formValues(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.rpc("transition_purchase_request", {
    p_request_id: parsed.data.requestId,
    p_to: parsed.data.to,
    p_note: parsed.data.note ?? undefined,
  });
  if (error) return fromDbError(error);
  revalidatePath("/[locale]/account/requests/[id]", "page");
  revalidatePath("/[locale]/admin/requests/[id]", "page");
  return { ok: true };
}

const respondSchema = z.object({
  quotationId: uuid,
  decision: z.enum(["accept", "decline"]),
  reason: optionalText(1000),
});

export async function respondToQuotationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = respondSchema.safeParse(formValues(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_to_quotation", {
    p_quotation_id: parsed.data.quotationId,
    p_accept: parsed.data.decision === "accept",
    p_reason: parsed.data.reason ?? undefined,
  });
  if (error) return fromDbError(error);
  revalidatePath("/[locale]/account/requests/[id]", "page");
  return { ok: true };
}
