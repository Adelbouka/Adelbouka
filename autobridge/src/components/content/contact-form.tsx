"use client";
import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { sendContactAction } from "@/lib/actions/contact";
import { initialState } from "@/lib/actions/state";
import { Field, describedBy } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { FormError } from "@/components/forms/form-error";
import { useFormErrors } from "@/components/forms/use-form-errors";

export function ContactForm({ defaults }: { defaults: { name: string; email: string } }) {
  const t = useTranslations("pages");
  const locale = useLocale();
  const [state, action] = useActionState(sendContactAction, initialState);
  const { fieldError, formError } = useFormErrors(state);
  if (state.ok) return <Alert tone="success" title={t("contactSentTitle")}>{t("contactSentText")}</Alert>;
  const v = (k: string, d = "") => state.values?.[k] ?? d;
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <div className="hidden" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <FormError message={formError} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="name" label={t("contactName")} required error={fieldError("name")}>
          <Input id="name" name="name" defaultValue={v("name", defaults.name)} autoComplete="name" {...describedBy("name", fieldError("name"))} />
        </Field>
        <Field id="email" label={t("contactEmail")} required error={fieldError("email")}>
          <Input id="email" name="email" type="email" dir="ltr" defaultValue={v("email", defaults.email)} autoComplete="email" {...describedBy("email", fieldError("email"))} />
        </Field>
        <Field id="phone" label={t("contactPhone")} error={fieldError("phone")}>
          <Input id="phone" name="phone" type="tel" dir="ltr" defaultValue={v("phone")} autoComplete="tel" {...describedBy("phone", fieldError("phone"))} />
        </Field>
        <Field id="subject" label={t("contactSubject")} required error={fieldError("subject")}>
          <Input id="subject" name="subject" defaultValue={v("subject")} maxLength={160} {...describedBy("subject", fieldError("subject"))} />
        </Field>
      </div>
      <Field id="message" label={t("contactMessage")} required error={fieldError("message")}>
        <Textarea id="message" name="message" rows={6} maxLength={4000} defaultValue={v("message")} {...describedBy("message", fieldError("message"))} />
      </Field>
      <SubmitButton>{t("contactSend")}</SubmitButton>
    </form>
  );
}
