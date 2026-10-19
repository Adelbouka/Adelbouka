"use client";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { changePasswordAction, updateProfileAction } from "@/lib/actions/account";
import { initialState } from "@/lib/actions/state";
import { Field, describedBy } from "@/components/ui/field";
import { Checkbox, Input, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { FormError } from "@/components/forms/form-error";
import { useFormErrors } from "@/components/forms/use-form-errors";

export function ProfileForm({ profile }: {
  profile: { full_name: string | null; phone: string | null; wilaya: string | null; preferred_locale: "ar" | "fr"; notify_email: boolean; email: string | null };
}) {
  const t = useTranslations("account");
  const tc = useTranslations("common");
  const [state, action] = useActionState(updateProfileAction, initialState);
  const { fieldError, formError } = useFormErrors(state);
  return (
    <form key={state.values ? JSON.stringify(state.values) : "initial"} action={action} className="space-y-4">
      <FormError message={formError} />
      {state.ok ? <Alert tone="success">{tc("saved")}</Alert> : null}
      <Field id="email" label={t("email")} hint={t("emailHint")}>
        <Input id="email" value={profile.email ?? ""} disabled dir="ltr" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="fullName" label={t("fullName")} error={fieldError("fullName")}>
          <Input id="fullName" name="fullName" defaultValue={state.values?.fullName ?? profile.full_name ?? ""} autoComplete="name" />
        </Field>
        <Field id="phone" label={t("phone")} error={fieldError("phone")}>
          <Input id="phone" name="phone" type="tel" dir="ltr" defaultValue={state.values?.phone ?? profile.phone ?? ""} autoComplete="tel" {...describedBy("phone", fieldError("phone"))} />
        </Field>
        <Field id="wilaya" label={t("wilaya")} error={fieldError("wilaya")}>
          <Input id="wilaya" name="wilaya" defaultValue={state.values?.wilaya ?? profile.wilaya ?? ""} />
        </Field>
        <Field id="preferredLocale" label={t("language")}>
          <Select id="preferredLocale" name="preferredLocale" defaultValue={state.values?.preferredLocale ?? profile.preferred_locale}>
            <option value="ar">العربية</option>
            <option value="fr">Français</option>
          </Select>
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox name="notifyEmail" defaultChecked={state.values ? state.values.notifyEmail === "on" : profile.notify_email} />
        {t("notifyEmail")}
      </label>
      <p className="text-xs text-muted-foreground">{t("notifyInAppAlways")}</p>
      <SubmitButton>{tc("save")}</SubmitButton>
    </form>
  );
}

export function ChangePasswordForm() {
  const t = useTranslations("auth");
  const ta = useTranslations("account");
  const [state, action] = useActionState(changePasswordAction, initialState);
  const { fieldError, formError } = useFormErrors(state);
  return (
    <form action={action} className="space-y-4">
      <FormError message={formError} />
      {state.ok ? <Alert tone="success">{ta("passwordUpdated")}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="password" label={t("newPassword")} hint={t("passwordHint")} error={fieldError("password")}>
          <Input id="password" name="password" type="password" autoComplete="new-password" dir="ltr" {...describedBy("password", fieldError("password"))} />
        </Field>
        <Field id="confirmPassword" label={t("confirmPassword")} error={fieldError("confirmPassword")}>
          <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" dir="ltr" {...describedBy("confirmPassword", fieldError("confirmPassword"))} />
        </Field>
      </div>
      <SubmitButton variant="secondary">{t("savePassword")}</SubmitButton>
    </form>
  );
}
