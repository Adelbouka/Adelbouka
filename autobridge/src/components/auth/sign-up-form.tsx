"use client";
import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { signUpAction } from "@/lib/actions/auth";
import { initialState } from "@/lib/actions/state";
import { Field, describedBy } from "@/components/ui/field";
import { Checkbox, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/forms/form-error";
import { useFormErrors } from "@/components/forms/use-form-errors";

export function SignUpForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [state, action] = useActionState(signUpAction, initialState);
  const { fieldError, formError } = useFormErrors(state);
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <FormError message={formError} />
      <Field id="fullName" label={t("fullName")} error={fieldError("fullName")} required>
        <Input id="fullName" name="fullName" autoComplete="name" required defaultValue={state.values?.fullName}
          {...describedBy("fullName", fieldError("fullName"))} />
      </Field>
      <Field id="email" label={t("email")} error={fieldError("email")} required>
        <Input id="email" name="email" type="email" autoComplete="email" dir="ltr" required defaultValue={state.values?.email}
          {...describedBy("email", fieldError("email"))} />
      </Field>
      <Field id="password" label={t("password")} hint={t("passwordHint")} error={fieldError("password")} required>
        <Input id="password" name="password" type="password" autoComplete="new-password" dir="ltr" required minLength={8}
          {...describedBy("password", fieldError("password"), t("passwordHint"))} />
      </Field>
      <Field id="confirmPassword" label={t("confirmPassword")} error={fieldError("confirmPassword")} required>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" dir="ltr" required
          {...describedBy("confirmPassword", fieldError("confirmPassword"))} />
      </Field>
      <div>
        <label className="flex items-start gap-2 text-sm">
          <Checkbox name="acceptTerms" className="mt-1" aria-invalid={fieldError("acceptTerms") ? true : undefined} />
          <span>
            {t.rich("acceptTerms", {
              terms: (chunks) => <Link href="/legal/terms" className="text-primary underline" target="_blank">{chunks}</Link>,
              privacy: (chunks) => <Link href="/legal/privacy" className="text-primary underline" target="_blank">{chunks}</Link>,
            })}
          </span>
        </label>
        {fieldError("acceptTerms") ? <p role="alert" className="mt-1 text-xs font-medium text-danger">{fieldError("acceptTerms")}</p> : null}
      </div>
      <SubmitButton className="w-full" pendingLabel={t("creatingAccount")}>{t("createAccount")}</SubmitButton>
    </form>
  );
}
