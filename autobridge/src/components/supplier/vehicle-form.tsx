"use client";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { saveVehicleAction } from "@/lib/actions/supplier";
import { vehicleSchema, type VehicleInput } from "@/lib/validation/vehicle";
import { AVAILABILITIES, BODY_TYPES, CONDITIONS, FUEL_TYPES, TRANSMISSIONS } from "@/lib/domain/enums";
import { Field, describedBy } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

export function VehicleForm({ vehicleId, defaults, makes, countries, currencies, status }: {
  vehicleId: string | null;
  defaults: Partial<VehicleInput>;
  makes: { id: number; name: string }[];
  countries: { code: string; name: string }[];
  currencies: string[];
  status: string | null;
}) {
  const t = useTranslations("supplier");
  const tv = useTranslations("validation");
  const te = useTranslations("enums");
  const terr = useTranslations("errors");
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const form = useForm<VehicleInput>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: { bodyType: "other", condition: "used", availability: "available", priceCurrency: "EUR", transmission: "manual", fuelType: "petrol", ...defaults },
  });
  const { register, handleSubmit, formState: { errors } } = form;
  const fuel = useWatch({ control: form.control, name: "fuelType" });
  const err = (name: keyof VehicleInput) => {
    const m = errors[name]?.message;
    if (!m) return undefined;
    const key = m as Parameters<typeof tv>[0];
    return tv.has(key) ? tv(key) : tv("invalid");
  };
  const canSubmitForReview = !status || status === "draft" || status === "rejected";

  const save = (submitForReview: boolean) =>
    handleSubmit((values) => {
      setServerError(null);
      setSaved(false);
      startTransition(async () => {
        const res = await saveVehicleAction({ ...values, submitForReview }, vehicleId);
        if (!res.ok) {
          for (const [k, v] of Object.entries(res.fieldErrors ?? {})) if (v?.[0]) form.setError(k as keyof VehicleInput, { message: v[0] });
          setServerError(terr.has(res.error ?? "unexpected") ? terr(res.error ?? "unexpected") : terr("unexpected"));
          return;
        }
        setSaved(true);
        if (!vehicleId && res.data?.id) router.push(`/supplier/vehicles/${res.data.id}?created=1`);
        else router.refresh();
      });
    });

  const num = (id: keyof VehicleInput, label: string, required = false, hint?: string) => (
    <Field id={id} label={label} required={required} hint={hint} error={err(id)}>
      <Input id={id} inputMode="numeric" dir="ltr" {...register(id)} {...describedBy(id, err(id), hint)} />
    </Field>
  );

  return (
    <form onSubmit={save(false)} className="space-y-6" noValidate>
      {serverError ? <Alert tone="danger">{serverError}</Alert> : null}
      {saved ? <Alert tone="success">{tc("saved")}</Alert> : null}
      {status === "published" ? <Alert tone="info">{t("editPublishedNotice")}</Alert> : null}
      <Card className="space-y-4 p-5">
        <h2 className="font-semibold">{t("vehicleIdentity")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field id="makeId" label={t("make")} required error={err("makeId")}>
            <Select id="makeId" {...register("makeId")} {...describedBy("makeId", err("makeId"))}>
              <option value="">—</option>
              {makes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </Field>
          <Field id="model" label={t("model")} required error={err("model")}>
            <Input id="model" maxLength={80} {...register("model")} {...describedBy("model", err("model"))} />
          </Field>
          <Field id="trimLevel" label={t("trim")} error={err("trimLevel")}>
            <Input id="trimLevel" maxLength={80} {...register("trimLevel")} />
          </Field>
          <Field id="bodyType" label={t("body")} required error={err("bodyType")}>
            <Select id="bodyType" {...register("bodyType")}>{BODY_TYPES.map((b) => <option key={b} value={b}>{te(`body.${b}`)}</option>)}</Select>
          </Field>
          <Field id="condition" label={t("condition")} required error={err("condition")}>
            <Select id="condition" {...register("condition")}>{CONDITIONS.map((c) => <option key={c} value={c}>{te(`condition.${c}`)}</option>)}</Select>
          </Field>
          <Field id="exteriorColor" label={t("color")} error={err("exteriorColor")}>
            <Input id="exteriorColor" maxLength={40} {...register("exteriorColor")} />
          </Field>
          {num("manufactureYear", t("manufactureYear"), true, t("manufactureYearHint"))}
          <Field id="firstRegistrationDate" label={t("firstRegistration")} hint={t("firstRegistrationHint")} error={err("firstRegistrationDate")}>
            <Input id="firstRegistrationDate" type="date" dir="ltr" {...register("firstRegistrationDate")} {...describedBy("firstRegistrationDate", err("firstRegistrationDate"), t("firstRegistrationHint"))} />
          </Field>
          <Field id="vin" label={t("vin")} hint={t("vinHint")} error={err("vin")}>
            <Input id="vin" dir="ltr" maxLength={17} className="font-mono uppercase" {...register("vin")} {...describedBy("vin", err("vin"), t("vinHint"))} />
          </Field>
        </div>
      </Card>
      <Card className="space-y-4 p-5">
        <h2 className="font-semibold">{t("technical")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {num("mileageKm", t("mileage"), true)}
          <Field id="fuelType" label={t("fuel")} required error={err("fuelType")}>
            <Select id="fuelType" {...register("fuelType")}>{FUEL_TYPES.map((f) => <option key={f} value={f}>{te(`fuel.${f}`)}</option>)}</Select>
          </Field>
          <Field id="transmission" label={t("transmission")} required error={err("transmission")}>
            <Select id="transmission" {...register("transmission")}>{TRANSMISSIONS.map((x) => <option key={x} value={x}>{te(`transmission.${x}`)}</option>)}</Select>
          </Field>
          {fuel !== "electric" ? num("engineCc", t("engine")) : null}
          {num("powerKw", t("power"))}
          {num("doors", t("doors"))}
          {num("seats", t("seats"))}
        </div>
      </Card>
      <Card className="space-y-4 p-5">
        <h2 className="font-semibold">{t("offer")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field id="countryCode" label={t("country")} required error={err("countryCode")}>
            <Select id="countryCode" {...register("countryCode")}>
              <option value="">—</option>
              {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </Select>
          </Field>
          <Field id="city" label={t("city")} required error={err("city")}>
            <Input id="city" maxLength={80} {...register("city")} {...describedBy("city", err("city"))} />
          </Field>
          <Field id="availability" label={t("availability")} required error={err("availability")}>
            <Select id="availability" {...register("availability")}>{AVAILABILITIES.map((a) => <option key={a} value={a}>{te(`availability.${a}`)}</option>)}</Select>
          </Field>
          <Field id="priceAmount" label={t("askingPrice")} required error={err("priceAmount")}>
            <Input id="priceAmount" inputMode="decimal" dir="ltr" {...register("priceAmount")} {...describedBy("priceAmount", err("priceAmount"))} />
          </Field>
          <Field id="priceCurrency" label={tc("currency")} required error={err("priceCurrency")}>
            <Select id="priceCurrency" {...register("priceCurrency")}>{currencies.map((c) => <option key={c} value={c}>{c}</option>)}</Select>
          </Field>
        </div>
        <Field id="description" label={t("vehicleDescription")} hint={t("vehicleDescriptionHint")} error={err("description")}>
          <Textarea id="description" rows={6} maxLength={5000} {...register("description")} />
        </Field>
      </Card>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="secondary" size="lg" disabled={pending}>{pending ? tc("loading") : t("saveDraft")}</Button>
        {canSubmitForReview ? (
          <Button type="button" size="lg" disabled={pending} onClick={() => save(true)()}>{t("saveAndSubmit")}</Button>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">{t("reviewProcess")}</p>
    </form>
  );
}
