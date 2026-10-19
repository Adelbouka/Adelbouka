"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { REPORT_REASONS } from "@/lib/domain/enums";
import { optionalText, uuid } from "@/lib/validation/common";
import { formValues, fromDbError, fromZodError, type ActionState } from "./state";

export async function toggleFavoriteAction(vehicleId: string, save: boolean): Promise<ActionState> {
  const id = uuid.safeParse(vehicleId);
  if (!id.success) return { ok: false, error: "invalid_input" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "forbidden" };
  const { error } = save
    ? await supabase.from("favorites").upsert({ user_id: user.id, vehicle_id: id.data }, { ignoreDuplicates: true })
    : await supabase.from("favorites").delete().eq("user_id", user.id).eq("vehicle_id", id.data);
  if (error) return fromDbError(error);
  revalidatePath("/[locale]/account/favorites", "page");
  return { ok: true };
}

const reportSchema = z.object({
  vehicleId: uuid,
  reason: z.enum(REPORT_REASONS, { error: "invalid_choice" }),
  details: optionalText(2000),
});

export async function reportListingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = reportSchema.safeParse(formValues(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "forbidden" };
  const { error } = await supabase.from("listing_reports").insert({
    vehicle_id: parsed.data.vehicleId,
    reporter_id: user.id,
    reason: parsed.data.reason,
    details: parsed.data.details ?? null,
  });
  if (error) return fromDbError(error);
  return { ok: true, message: "reported" };
}
