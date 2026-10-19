"use server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { email, localeSchema, requiredText } from "@/lib/validation/common";
import { formValues, fromDbError, fromZodError, type ActionState } from "./state";

const contactSchema = z.object({
  name: requiredText(120, 2),
  email,
  phone: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().regex(/^\+?[0-9\s().-]{6,32}$/, { error: "invalid_phone" }).optional()),
  subject: requiredText(160, 2),
  message: requiredText(4000, 10),
  locale: localeSchema,
  // Honeypot: real users never fill this hidden field.
  website: z.string().max(0).optional().catch("spam"),
});

export async function sendContactAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formValues(formData);
  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) return fromZodError(parsed.error, values);
  if (parsed.data.website) return { ok: true };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("contact_messages").insert({
    name: parsed.data.name, email: parsed.data.email, phone: parsed.data.phone ?? null,
    subject: parsed.data.subject, message: parsed.data.message, locale: parsed.data.locale, user_id: user?.id ?? null,
  });
  if (error) return fromDbError(error);
  return { ok: true };
}
