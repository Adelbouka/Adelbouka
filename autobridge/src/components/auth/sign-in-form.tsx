"use client";
import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { signInAction } from "@/lib/actions/auth";
import { initialState } from "@/lib/actions/state";
import { Field, describedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/forms/form-error";
import { useFormErrors } from "@/components/forms/use-form-errors";

export function SignInForm({ next }: { next?: string }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [state, action] = useActionState(signInAction, initialState);
  const { fieldError, formError } = useFormErrors(state);
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="locale" value={locale} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <FormError message={formError} />
      <Field id="email" label={t("email")} error={fieldError("email")} required>
        <Input id="email" name="email" type="email" autoComplete="email" dir="ltr" required
          defaultValue={state.values?.email} {...describedBy("email", fieldError("email"))} />
      </Field>
      <Field id="password" label={t("password")} error={fieldError("password")} required>
        <Input id="password" name="password" type="password" autoComplete="current-password" dir="ltr" required
          {...describedBy("password", fieldError("password"))} />
      </Field>
      <div className="text-end text-sm">
        <Link href="/auth/forgot-password" className="text-primary hover:underline">{t("forgotPassword")}</Link>
      </div>
      <SubmitButton className="w-full" pendingLabel={t("signingIn")}>{t("signIn")}</SubmitButton>
    </form>
  );
}
