"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/env";
import { safeNextPath } from "@/lib/utils";
import { forgotPasswordSchema, resetPasswordSchema, signInSchema, signUpSchema } from "@/lib/validation/auth";
import { formValues, fromZodError, type ActionState } from "./state";

type AuthErrorLike = { code?: string; message?: string; status?: number } | null;

function authError(error: AuthErrorLike): ActionState["error"] {
  const code = error?.code ?? "";
  if (code === "invalid_credentials") return "invalid_credentials";
  if (code === "email_not_confirmed") return "email_not_confirmed";
  if (code === "weak_password") return "weak_password";
  if (code === "same_password") return "same_password";
  if (code.startsWith("over_") || error?.status === 429) return "rate_limited";
  return "unexpected";
}

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formValues(formData);
  const parsed = signInSchema.safeParse(values);
  if (!parsed.success) return fromZodError(parsed.error, { email: values.email ?? "" });
  const { email, password, next, locale } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: authError(error), values: { email } };

  redirect(safeNextPath(next, `/${locale}/account`));
}

export async function signUpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formValues(formData);
  const parsed = signUpSchema.safeParse(values);
  if (!parsed.success) {
    return fromZodError(parsed.error, { email: values.email ?? "", fullName: values.fullName ?? "" });
  }
  const { email, password, fullName, locale } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, locale },
      emailRedirectTo: `${SITE_URL}/auth/confirm?next=/${locale}/account`,
    },
  });
  if (error) return { ok: false, error: authError(error), values: { email, fullName } };
  // The same screen is shown whether or not the address already has an account
  // (prevents account enumeration).
  redirect(`/${locale}/auth/check-email?reason=signup`);
}

export async function forgotPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formValues(formData);
  const parsed = forgotPasswordSchema.safeParse(values);
  if (!parsed.success) return fromZodError(parsed.error, { email: values.email ?? "" });
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${SITE_URL}/auth/confirm?next=/${parsed.data.locale}/auth/reset-password`,
  });
  if (error && authError(error) === "rate_limited") return { ok: false, error: "rate_limited" };
  // Always report success to avoid revealing whether an account exists.
  redirect(`/${parsed.data.locale}/auth/check-email?reason=recovery`);
}

export async function resetPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse(formValues(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "link_invalid" };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: authError(error) };
  redirect(`/${parsed.data.locale}/account?notice=password_updated`);
}

export async function signOutAction(formData: FormData) {
  const locale = formData.get("locale") === "fr" ? "fr" : "ar";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${locale}`);
}
