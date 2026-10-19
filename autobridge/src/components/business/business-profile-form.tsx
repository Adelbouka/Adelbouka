"use client";
import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { saveBusinessProfileAction } from "@/lib/actions/business";
import { initialState } from "@/lib/actions/state";
import { Field, describedBy } from "@/components/ui/field";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { FormError } from "@/components/forms/form-error";
import { useFormErrors } from "@/components/forms/use-form-errors";

export type BusinessDefaults = {
  business_name?: string; legal_form?: string | null; registration_number?: string | null; country_code?: string;
  city?: string; address?: string | null; contact_name?: string; contact_email?: string; contact_phone?: string;
  website?: string | null; description?: string | null; services_offered?: string | null;
  operating_countries?: string[]; categories?: string[];
};

export function BusinessProfileForm({ kind, defaults, countries, categories, isNew }: {
  kind: "supplier" | "partner";
  defaults: BusinessDefaults;
  countries: { code: string; name: string }[];
  categories?: { code: string; name: string }[];
  isNew: boolean;
}) {
  const t = useTranslations("supplier");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [state, action] = useActionState(saveBusinessProfileAction, initialState);
  const { fieldError, formError } = useFormErrors(state);
  const val = (k: string, d?: string | null) => state.values?.[k] ?? d ?? "";
  const listVal = (k: string, d?: string[]) => (state.values ? (state.values[k] ?? "").split(",").filter(Boolean) : d ?? []);
  // React resets uncontrolled fields after an action; remounting from the echoed values
  // keeps the user's input (including selects and checkboxes) after a validation error.
  const formKey = state.values ? JSON.stringify(state.values) : "initial";
  const f = (id: string, label: string, opts: { required?: boolean; hint?: string; type?: string; dir?: "ltr"; def?: string | null; max?: number } = {}) => (
    <Field id={id} label={label} required={opts.required} hint={opts.hint} error={fieldError(id)}>
      <Input id={id} name={id} type={opts.type ?? "text"} dir={opts.dir} defaultValue={val(id, opts.def)} maxLength={opts.max}
        {...describedBy(id, fieldError(id), opts.hint)} />
    </Field>
  );
  return (
    <form key={formKey} action={action} className="space-y-5" noValidate>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="locale" value={locale} />
      <FormError message={formError} />
      {state.ok ? <Alert tone="success">{tc("saved")}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {f("businessName", t("businessName"), { required: true, def: defaults.business_name, max: 160 })}
        {f("legalForm", t("legalForm"), { def: defaults.legal_form, max: 80 })}
        {f("registrationNumber", t("registrationNumber"), { hint: t("privateField"), def: defaults.registration_number, max: 80 })}
        <Field id="countryCode" label={t("country")} required error={fieldError("countryCode")}>
          <Select id="countryCode" name="countryCode" defaultValue={val("countryCode", defaults.country_code)}>
            <option value="">—</option>
            {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </Select>
        </Field>
        {f("city", t("city"), { required: true, def: defaults.city, max: 80 })}
        {kind === "supplier" ? f("address", t("address"), { hint: t("privateField"), def: defaults.address, max: 300 }) : null}
        {f("contactName", t("contactName"), { required: true, hint: t("privateField"), def: defaults.contact_name, max: 120 })}
        {f("contactEmail", t("contactEmail"), { required: true, type: "email", dir: "ltr", hint: t("privateField"), def: defaults.contact_email })}
        {f("contactPhone", t("contactPhone"), { required: true, type: "tel", dir: "ltr", hint: t("privateField"), def: defaults.contact_phone })}
        {f("website", t("website"), { type: "url", dir: "ltr", def: defaults.website, hint: "https://…" })}
      </div>
      <Field id="description" label={t("description")} hint={t("publicField")} error={fieldError("description")}>
        <Textarea id="description" name="description" rows={4} maxLength={2000} defaultValue={val("description", defaults.description)} />
      </Field>
      {kind === "supplier" ? (
        <Field id="servicesOffered" label={t("servicesOffered")} hint={t("publicField")} error={fieldError("servicesOffered")}>
          <Textarea id="servicesOffered" name="servicesOffered" rows={2} maxLength={1000} defaultValue={val("servicesOffered", defaults.services_offered)} />
        </Field>
      ) : (
        <>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">{t("serviceCategories")} <span className="text-danger">*</span></legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(categories ?? []).map((c) => (
                <label key={c.code} className="flex items-center gap-2 text-sm">
                  <Checkbox name="categories" value={c.code} defaultChecked={listVal("categories", defaults.categories).includes(c.code)} />{c.name}
                </label>
              ))}
            </div>
            {fieldError("categories") ? <p role="alert" className="mt-1 text-xs text-danger">{fieldError("categories")}</p> : null}
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">{t("operatingCountries")}</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {countries.map((c) => (
                <label key={c.code} className="flex items-center gap-2 text-sm">
                  <Checkbox name="operatingCountries" value={c.code} defaultChecked={listVal("operatingCountries", defaults.operating_countries).includes(c.code)} />{c.name}
                </label>
              ))}
            </div>
          </fieldset>
        </>
      )}
      <p className="text-xs text-muted-foreground">{t("reviewNotice")}</p>
      <SubmitButton>{isNew ? t("submitApplication") : tc("save")}</SubmitButton>
    </form>
  );
}
