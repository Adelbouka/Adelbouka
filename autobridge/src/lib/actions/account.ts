"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkbox, optionalText } from "@/lib/validation/common";
import { password } from "@/lib/validation/auth";
import { formValues, fromDbError, fromZodError, type ActionState } from "./state";

const profileSchema = z.object({
  fullName: optionalText(120),
  phone: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().trim().regex(/^\+?[0-9\s().-]{6,32}$/, { error: "invalid_phone" }).optional(),
  ),
  wilaya: optionalText(64),
  preferredLocale: z.enum(["ar", "fr"], { error: "invalid_choice" }),
  notifyEmail: checkbox,
});

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formValues(formData);
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) return fromZodError(parsed.error, values);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "forbidden" };
  const { error } = await supabase.from("profiles").update({
    full_name: parsed.data.fullName ?? null,
    phone: parsed.data.phone ?? null,
    wilaya: parsed.data.wilaya ?? null,
    preferred_locale: parsed.data.preferredLocale,
    notify_email: parsed.data.notifyEmail,
  }).eq("id", user.id);
  if (error) return fromDbError(error);
  // Keep the locale used by authentication e-mails in sync.
  await supabase.auth.updateUser({ data: { locale: parsed.data.preferredLocale, full_name: parsed.data.fullName ?? null } });
  revalidatePath("/[locale]/account", "layout");
  return { ok: true };
}

const changePasswordSchema = z
  .object({ password, confirmPassword: z.string({ error: "required" }) })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], error: "passwords_mismatch" });

export async function changePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = changePasswordSchema.safeParse(formValues(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: error.code === "same_password" ? "same_password" : error.code === "weak_password" ? "weak_password" : "unexpected" };
  return { ok: true };
}

export async function markAllNotificationsReadAction(): Promise<ActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "forbidden" };
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  if (error) return fromDbError(error);
  revalidatePath("/[locale]", "layout");
  return { ok: true };
}

const dataRequestSchema = z.object({
  kind: z.enum(["access", "correction", "deletion"], { error: "invalid_choice" }),
  details: optionalText(2000),
});

export async function createDataRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = dataRequestSchema.safeParse(formValues(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "forbidden" };
  const { error } = await supabase.from("data_requests").insert({ user_id: user.id, kind: parsed.data.kind, details: parsed.data.details ?? null });
  if (error) return fromDbError(error);
  revalidatePath("/[locale]/account/privacy", "page");
  return { ok: true };
}

export async function deleteEstimateAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { ok: false, error: "invalid_input" };
  const supabase = await createClient();
  const { error } = await supabase.from("cost_estimates").delete().eq("id", id.data);
  if (error) return fromDbError(error);
  revalidatePath("/[locale]/account/estimates", "page");
  return { ok: true };
}
