"use client";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { createPurchaseRequestAction } from "@/lib/actions/requests";
import { purchaseRequestSchema, type PurchaseRequestInput } from "@/lib/validation/request";
import { CONTACT_METHODS, FUEL_TYPES, TRANSMISSIONS } from "@/lib/domain/enums";
import { Field, describedBy } from "@/components/ui/field";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type Pathway = { code: string; name: string; description: string };

export function RequestForm({ vehicle, pathways, makes, currencies, defaults, estimateId }: {
  vehicle: { id: string; title: string } | null;
  pathways: Pathway[];
  makes: { id: number; name: string }[];
  currencies: string[];
  defaults: { contactName: string; contactPhone: string; contactEmail: string; wilaya: string };
  estimateId: string | null;
}) {
  const t = useTranslations("requests");
  const tv = useTranslations("validation");
  const te = useTranslations("enums");
  const terr = useTranslations("errors");
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<PurchaseRequestInput>({
    resolver: zodResolver(purchaseRequestSchema),
    defaultValues: {
      requestType: vehicle ? "listed_vehicle" : "custom_search",
      vehicleId: vehicle?.id ?? "",
      budgetCurrency: "DZD",
      pathwayCode: "",
      preferredContact: "phone",
      costEstimateId: estimateId ?? "",
      ...defaults,
    },
  });
  const { register, handleSubmit, formState: { errors } } = form;
  const pathwayCode = useWatch({ control: form.control, name: "pathwayCode" });
  const err = (name: keyof PurchaseRequestInput) => {
    const m = errors[name]?.message;
    if (!m) return undefined;
    const key = m as Parameters<typeof tv>[0];
    return tv.has(key) ? tv(key) : tv("invalid");
  };

  const submit = (asDraft: boolean) =>
    handleSubmit((values) => {
      setServerError(null);
      startTransition(async () => {
        const res = await createPurchaseRequestAction({ ...values, asDraft }, locale);
        if (res && !res.ok) {
          if (res.fieldErrors) {
            for (const [k, v] of Object.entries(res.fieldErrors)) {
              if (v?.[0]) form.setError(k as keyof PurchaseRequestInput, { message: v[0] });
            }
          }
          setServerError(terr.has(res.error ?? "unexpected") ? terr(res.error ?? "unexpected") : terr("unexpected"));
        }
      });
    });

  const selectedPathway = pathways.find((p) => p.code === pathwayCode);

  return (
    <form onSubmit={submit(false)} className="space-y-6" noValidate>
      {serverError ? <Alert tone="danger">{serverError}</Alert> : null}

      <Card className="space-y-4 p-5">
        <h2 className="font-semibold">{t("vehicleSection")}</h2>
        {vehicle ? (
          <div className="rounded-lg bg-surface-muted p-3 text-sm">
            <span className="text-muted-foreground">{t("selectedVehicle")}: </span>
            <span className="font-medium">{vehicle.title}</span>
            <input type="hidden" {...register("requestType")} />
            <input type="hidden" {...register("vehicleId")} />
          </div>
        ) : (
          <>
            <input type="hidden" {...register("requestType")} value="custom_search" />
            <p className="text-sm text-muted-foreground">{t("customIntro")}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="desiredMakeId" label={t("make")} error={err("desiredMakeId")} required>
                <Select id="desiredMakeId" {...register("desiredMakeId")} {...describedBy("desiredMakeId", err("desiredMakeId"))}>
                  <option value="">—</option>
                  {makes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </Select>
              </Field>
              <Field id="desiredModel" label={t("model")} error={err("desiredModel")}>
                <Input id="desiredModel" {...register("desiredModel")} maxLength={80} />
              </Field>
              <Field id="yearMin" label={t("yearMin")} error={err("yearMin")}>
                <Input id="yearMin" inputMode="numeric" dir="ltr" {...register("yearMin")} />
              </Field>
              <Field id="yearMax" label={t("yearMax")} error={err("yearMax")}>
                <Input id="yearMax" inputMode="numeric" dir="ltr" {...register("yearMax")} {...describedBy("yearMax", err("yearMax"))} />
              </Field>
              <Field id="maxMileageKm" label={t("maxMileage")} error={err("maxMileageKm")}>
                <Input id="maxMileageKm" inputMode="numeric" dir="ltr" {...register("maxMileageKm")} />
              </Field>
              <Field id="desiredFuel" label={t("fuel")} error={err("desiredFuel")}>
                <Select id="desiredFuel" {...register("desiredFuel")}>
                  <option value="">{t("noPreference")}</option>
                  {FUEL_TYPES.map((f) => <option key={f} value={f}>{te(`fuel.${f}`)}</option>)}
                </Select>
              </Field>
              <Field id="desiredTransmission" label={t("transmission")} error={err("desiredTransmission")}>
                <Select id="desiredTransmission" {...register("desiredTransmission")}>
                  <option value="">{t("noPreference")}</option>
                  {TRANSMISSIONS.map((x) => <option key={x} value={x}>{te(`transmission.${x}`)}</option>)}
                </Select>
              </Field>
            </div>
          </>
        )}
        <Field id="preferences" label={t("preferences")} hint={t("preferencesHint")} error={err("preferences")}>
          <Textarea id="preferences" rows={3} maxLength={2000} {...register("preferences")} />
        </Field>
        <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
          <Field id="budgetAmount" label={t("budget")} error={err("budgetAmount")}>
            <Input id="budgetAmount" inputMode="decimal" dir="ltr" {...register("budgetAmount")} />
          </Field>
          <Field id="budgetCurrency" label={t("currency")} error={err("budgetCurrency")}>
            <Select id="budgetCurrency" {...register("budgetCurrency")}>
              {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
        </div>
        {estimateId ? <p className="text-xs text-success">{t("estimateAttached")}</p> : null}
        <input type="hidden" {...register("costEstimateId")} />
      </Card>

      <Card className="space-y-4 p-5">
        <div>
          <h2 className="font-semibold">{t("pathwaySection")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("pathwayIntro")}</p>
        </div>
        {pathways.length ? (
          <fieldset aria-describedby={err("pathwayCode") ? "pathway-error" : undefined}>
            <legend className="sr-only">{t("pathwaySection")}</legend>
            <div className="grid gap-3">
              {pathways.map((p) => (
                <label key={p.code} className={cn("flex cursor-pointer gap-3 rounded-lg border p-3 text-sm transition-colors", pathwayCode === p.code ? "border-primary bg-primary-soft" : "border-border hover:border-border-strong")}>
                  <input type="radio" value={p.code} className="mt-1 accent-[var(--primary)]" {...register("pathwayCode")} />
                  <span>
                    <span className="block font-medium">{p.name}</span>
                    <span className="mt-0.5 block text-muted-foreground">{p.description}</span>
                  </span>
                </label>
              ))}
            </div>
            {err("pathwayCode") ? <p id="pathway-error" role="alert" className="mt-2 text-xs font-medium text-danger">{err("pathwayCode")}</p> : null}
          </fieldset>
        ) : <Alert tone="warning">{t("noPathways")}</Alert>}
        {selectedPathway ? <Alert tone="info">{t("legalReviewNotice")}</Alert> : null}
      </Card>

      <Card className="space-y-4 p-5">
        <div>
          <h2 className="font-semibold">{t("contactSection")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("contactIntro")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="contactName" label={t("contactName")} error={err("contactName")} required>
            <Input id="contactName" autoComplete="name" {...register("contactName")} {...describedBy("contactName", err("contactName"))} />
          </Field>
          <Field id="contactPhone" label={t("contactPhone")} error={err("contactPhone")} required>
            <Input id="contactPhone" type="tel" autoComplete="tel" dir="ltr" {...register("contactPhone")} {...describedBy("contactPhone", err("contactPhone"))} />
          </Field>
          <Field id="contactEmail" label={t("contactEmail")} error={err("contactEmail")}>
            <Input id="contactEmail" type="email" autoComplete="email" dir="ltr" {...register("contactEmail")} {...describedBy("contactEmail", err("contactEmail"))} />
          </Field>
          <Field id="wilaya" label={t("wilaya")} error={err("wilaya")} required>
            <Input id="wilaya" autoComplete="address-level1" {...register("wilaya")} {...describedBy("wilaya", err("wilaya"))} />
          </Field>
          <Field id="preferredContact" label={t("preferredContact")} error={err("preferredContact")}>
            <Select id="preferredContact" {...register("preferredContact")}>
              {CONTACT_METHODS.map((c) => <option key={c} value={c}>{te(`contactMethod.${c}`)}</option>)}
            </Select>
          </Field>
        </div>
        <Field id="message" label={t("message")} hint={t("messageHint")} error={err("message")}>
          <Textarea id="message" rows={4} maxLength={2000} {...register("message")} />
        </Field>
      </Card>

      <Card className="space-y-4 p-5">
        <label className="flex items-start gap-3 text-sm">
          <Checkbox className="mt-1" {...register("acknowledge")} aria-invalid={err("acknowledge") ? true : undefined} />
          <span className="leading-relaxed">{t("acknowledge")}</span>
        </label>
        {err("acknowledge") ? <p role="alert" className="text-xs font-medium text-danger">{err("acknowledge")}</p> : null}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="lg" disabled={pending}>{pending ? t("submitting") : t("submit")}</Button>
          <Button type="button" variant="secondary" size="lg" disabled={pending} onClick={() => submit(true)()}>{t("saveDraft")}</Button>
        </div>
      </Card>
    </form>
  );
}
