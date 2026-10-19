"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { AVAILABILITIES } from "@/lib/domain/enums";
import { vehicleSchema, type VehicleInput } from "@/lib/validation/vehicle";
import { normalizeItems, quotationSchema, type QuotationInput } from "@/lib/validation/quotation";
import { optionalText, uuid } from "@/lib/validation/common";
import { formValues, fromDbError, fromZodError, type ActionState } from "./state";

/** Creates or updates one of the caller's listings. RLS restricts writes to approved owners. */
export async function saveVehicleAction(input: VehicleInput, vehicleId: string | null): Promise<ActionState> {
  const parsed = vehicleSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  if (vehicleId && !uuid.safeParse(vehicleId).success) return { ok: false, error: "invalid_input" };
  const v = parsed.data;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "forbidden" };
  const { data: supplier } = await supabase.from("supplier_profiles").select("id, status").eq("owner_id", user.id).maybeSingle();
  if (!supplier || supplier.status !== "approved") return { ok: false, error: "supplier_not_approved" };

  const row = {
    make_id: v.makeId,
    model: v.model,
    trim_level: v.trimLevel ?? null,
    body_type: v.bodyType,
    manufacture_year: v.manufactureYear,
    first_registration_date: v.firstRegistrationDate ?? null,
    mileage_km: v.mileageKm,
    fuel_type: v.fuelType,
    transmission: v.transmission,
    engine_cc: v.fuelType === "electric" ? null : (v.engineCc ?? null),
    power_kw: v.powerKw ?? null,
    condition: v.condition,
    exterior_color: v.exteriorColor ?? null,
    doors: v.doors ?? null,
    seats: v.seats ?? null,
    vin: v.vin ?? null,
    description: v.description ?? null,
    country_code: v.countryCode,
    city: v.city,
    price_amount: v.priceAmount,
    price_currency: v.priceCurrency,
    availability: v.availability,
  };

  if (vehicleId) {
    const { data: current } = await supabase.from("vehicles").select("status").eq("id", vehicleId).maybeSingle();
    if (!current) return { ok: false, error: "not_found" };
    const nextStatus = v.submitForReview && ["draft", "rejected"].includes(current.status) ? "pending_review" : undefined;
    const { error } = await supabase.from("vehicles").update({ ...row, ...(nextStatus ? { status: nextStatus } : {}) }).eq("id", vehicleId);
    if (error) return fromDbError(error);
    revalidatePath("/[locale]/supplier/vehicles", "layout");
    return { ok: true, data: { id: vehicleId } };
  }
  const { data, error } = await supabase
    .from("vehicles")
    .insert({ ...row, supplier_id: supplier.id, status: v.submitForReview ? "pending_review" : "draft" })
    .select("id")
    .single();
  if (error || !data) return fromDbError(error);
  revalidatePath("/[locale]/supplier/vehicles", "layout");
  return { ok: true, data: { id: data.id } };
}

const listingActionSchema = z.object({
  vehicleId: uuid,
  op: z.enum(["submit", "withdraw", "archive", "confirm", "availability", "delete"]),
  availability: z.enum(AVAILABILITIES).optional(),
});

export async function listingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = listingActionSchema.safeParse(formValues(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const { vehicleId, op, availability } = parsed.data;
  const supabase = await createClient();
  let error;
  switch (op) {
    case "submit":
      ({ error } = await supabase.from("vehicles").update({ status: "pending_review" }).eq("id", vehicleId));
      break;
    case "withdraw":
      ({ error } = await supabase.from("vehicles").update({ status: "draft" }).eq("id", vehicleId));
      break;
    case "archive":
      ({ error } = await supabase.from("vehicles").update({ status: "archived" }).eq("id", vehicleId));
      break;
    case "confirm":
      ({ error } = await supabase.from("vehicles").update({ last_confirmed_at: new Date().toISOString() }).eq("id", vehicleId));
      break;
    case "availability":
      if (!availability) return { ok: false, error: "invalid_input" };
      ({ error } = await supabase.from("vehicles").update({ availability, last_confirmed_at: new Date().toISOString() }).eq("id", vehicleId));
      break;
    case "delete":
      ({ error } = await supabase.from("vehicles").delete().eq("id", vehicleId));
      break;
  }
  if (error) return fromDbError(error);
  revalidatePath("/[locale]/supplier/vehicles", "layout");
  revalidatePath("/[locale]/vehicles", "layout");
  return { ok: true };
}

const imageSchema = z.object({
  vehicleId: uuid,
  storagePath: z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$/),
});

/** Registers a photo uploaded by the browser into {uid}/{vehicleId}/... of the public bucket. */
export async function registerVehicleImageAction(input: z.input<typeof imageSchema>): Promise<ActionState> {
  const parsed = imageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !parsed.data.storagePath.startsWith(`${user.id}/${parsed.data.vehicleId}/`)) return { ok: false, error: "forbidden" };
  const { count } = await supabase.from("vehicle_images").select("id", { count: "exact", head: true }).eq("vehicle_id", parsed.data.vehicleId);
  const { error } = await supabase.from("vehicle_images").insert({
    vehicle_id: parsed.data.vehicleId,
    storage_path: parsed.data.storagePath,
    position: count ?? 0,
  });
  if (error) {
    await supabase.storage.from("vehicle-images").remove([parsed.data.storagePath]);
    return fromDbError(error);
  }
  revalidatePath("/[locale]/supplier/vehicles/[id]", "page");
  return { ok: true };
}

const imageOpSchema = z.object({ imageId: uuid, op: z.enum(["delete", "cover"]) });

export async function vehicleImageOpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = imageOpSchema.safeParse(formValues(formData));
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const supabase = await createClient();
  const { data: img } = await supabase.from("vehicle_images").select("id, vehicle_id, storage_path").eq("id", parsed.data.imageId).maybeSingle();
  if (!img) return { ok: false, error: "not_found" };
  if (parsed.data.op === "delete") {
    const { error } = await supabase.from("vehicle_images").delete().eq("id", img.id);
    if (error) return fromDbError(error);
    if (img.storage_path) await supabase.storage.from("vehicle-images").remove([img.storage_path]);
  } else {
    const { data: all } = await supabase.from("vehicle_images").select("id").eq("vehicle_id", img.vehicle_id).order("position");
    const ordered = [img.id, ...(all ?? []).map((a) => a.id).filter((id) => id !== img.id)];
    for (const [position, id] of ordered.entries()) {
      const { error } = await supabase.from("vehicle_images").update({ position }).eq("id", id);
      if (error) return fromDbError(error);
    }
  }
  revalidatePath("/[locale]/supplier/vehicles/[id]", "page");
  return { ok: true };
}

/** Supplier or staff submits a quotation; the database checks the actor and the request state. */
export async function submitQuotationAction(input: QuotationInput): Promise<ActionState> {
  const parsed = quotationSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_quotation", {
    p_request_id: v.requestId,
    p_currency: v.currency,
    p_valid_until: v.validUntil,
    p_terms: v.terms ?? "",
    p_items: normalizeItems(v.items),
  });
  if (error) return fromDbError(error);
  revalidatePath("/[locale]/supplier", "layout");
  revalidatePath("/[locale]/admin/requests/[id]", "page");
  return { ok: true, data: { id: data as string } };
}

const withdrawSchema = z.object({ quotationId: uuid, reason: optionalText(1000) });

export async function withdrawQuotationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = withdrawSchema.safeParse(formValues(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.rpc("withdraw_quotation", { p_quotation_id: parsed.data.quotationId, p_reason: parsed.data.reason ?? undefined });
  if (error) return fromDbError(error);
  revalidatePath("/[locale]/supplier", "layout");
  revalidatePath("/[locale]/admin/requests/[id]", "page");
  return { ok: true };
}
