"use client";
import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { forgotPasswordAction, resetPasswordAction } from "@/lib/actions/auth";
import { initialState } from "@/lib/actions/state";
import { Field, describedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/forms/form-error";
import { useFormErrors } from "@/components/forms/use-form-errors";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [state, action] = useActionState(forgotPasswordAction, initialState);
  const { fieldError, formError } = useFormErrors(state);
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <FormError message={formError} />
      <Field id="email" label={t("email")} error={fieldError("email")} required>
        <Input id="email" name="email" type="email" autoComplete="email" dir="ltr" required defaultValue={state.values?.email}
          {...describedBy("email", fieldError("email"))} />
      </Field>
      <SubmitButton className="w-full">{t("sendResetLink")}</SubmitButton>
    </form>
  );
}

export function ResetPasswordForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [state, action] = useActionState(resetPasswordAction, initialState);
  const { fieldError, formError } = useFormErrors(state);
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <FormError message={formError} />
      <Field id="password" label={t("newPassword")} hint={t("passwordHint")} error={fieldError("password")} required>
        <Input id="password" name="password" type="password" autoComplete="new-password" dir="ltr" required
          {...describedBy("password", fieldError("password"), t("passwordHint"))} />
      </Field>
      <Field id="confirmPassword" label={t("confirmPassword")} error={fieldError("confirmPassword")} required>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" dir="ltr" required
          {...describedBy("confirmPassword", fieldError("confirmPassword"))} />
      </Field>
      <SubmitButton className="w-full">{t("savePassword")}</SubmitButton>
    </form>
  );
}
