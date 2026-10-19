"use client";
import { useState, useTransition } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { submitQuotationAction } from "@/lib/actions/supplier";
import { quotationSchema, type QuotationInput } from "@/lib/validation/quotation";
import { ALLOWED_PAYEES, FEE_KINDS, type FeeKind } from "@/lib/domain/enums";
import { formatMoney } from "@/lib/format";
import { isoDateInDays } from "@/lib/dates";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

export function QuotationForm({ requestId, currencies, defaultCurrency, allowedKinds }: {
  requestId: string; currencies: string[]; defaultCurrency: string; allowedKinds?: FeeKind[];
}) {
  const t = useTranslations("supplier");
  const tv = useTranslations("validation");
  const te = useTranslations("enums");
  const terr = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();
  const kinds = allowedKinds ?? [...FEE_KINDS];
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const inTwoWeeks = isoDateInDays(14);
  const form = useForm<QuotationInput>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      requestId, currency: defaultCurrency, validUntil: inTwoWeeks, terms: "",
      items: [{ kind: "vehicle_price", description: "", amount: "" as unknown as number, payee: "supplier", isEstimate: false }],
    },
  });
  const { register, handleSubmit, control, setValue, formState: { errors } } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const items = useWatch({ control, name: "items" });
  const currency = useWatch({ control, name: "currency" });
  const total = (items ?? []).reduce((s, i) => s + (Number(String(i?.amount ?? "").replace(",", ".")) || 0), 0);
  const msg = (m?: string) => (m ? (tv.has(m as Parameters<typeof tv>[0]) ? tv(m as Parameters<typeof tv>[0]) : tv("invalid")) : undefined);

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const res = await submitQuotationAction(values);
      if (!res.ok) return setServerError(terr.has(res.error ?? "unexpected") ? terr(res.error ?? "unexpected") : terr("unexpected"));
      setDone(true);
      form.reset();
      router.refresh();
    });
  });

  if (done) return <Alert tone="success">{t("quotationSubmitted")}</Alert>;

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {serverError ? <Alert tone="danger">{serverError}</Alert> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="q-currency" className="mb-1 block text-sm font-medium">{t("quotationCurrency")}</label>
          <Select id="q-currency" {...register("currency")}>{currencies.map((c) => <option key={c} value={c}>{c}</option>)}</Select>
        </div>
        <div>
          <label htmlFor="q-valid" className="mb-1 block text-sm font-medium">{t("validUntil")}</label>
          <Input id="q-valid" type="date" dir="ltr" {...register("validUntil")} aria-invalid={errors.validUntil ? true : undefined} />
          {errors.validUntil ? <p role="alert" className="mt-1 text-xs text-danger">{msg(errors.validUntil.message)}</p> : null}
        </div>
      </div>
      <div className="space-y-3">
        <p className="text-sm font-medium">{t("quotationLines")}</p>
        {fields.map((field, i) => {
          const kind = (items?.[i]?.kind ?? "other") as FeeKind;
          const payees = ALLOWED_PAYEES[kind];
          const e = errors.items?.[i];
          return (
            <div key={field.id} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[10rem_minmax(0,1fr)_8rem_9rem_auto]">
              <Select aria-label={t("feeKind")} {...register(`items.${i}.kind`, {
                onChange: (ev) => {
                  const allowed = ALLOWED_PAYEES[ev.target.value as FeeKind];
                  setValue(`items.${i}.payee`, allowed[0]);
                  if (ev.target.value === "taxes_and_customs") setValue(`items.${i}.isEstimate`, true);
                },
              })}>
                {kinds.map((k) => <option key={k} value={k}>{te(`feeKind.${k}`)}</option>)}
              </Select>
              <div>
                <Input aria-label={t("lineDescription")} placeholder={t("lineDescription")} maxLength={300} {...register(`items.${i}.description`)} aria-invalid={e?.description ? true : undefined} />
                {e?.description ? <p className="mt-1 text-xs text-danger">{msg(e.description.message)}</p> : null}
              </div>
              <div>
                <Input aria-label={t("lineAmount")} inputMode="decimal" dir="ltr" placeholder="0" {...register(`items.${i}.amount`)} aria-invalid={e?.amount ? true : undefined} />
                {e?.amount ? <p className="mt-1 text-xs text-danger">{msg(e.amount.message)}</p> : null}
              </div>
              <div>
                <Select aria-label={t("linePayee")} {...register(`items.${i}.payee`)}>
                  {payees.map((p) => <option key={p} value={p}>{te(`feeParty.${p}`)}</option>)}
                </Select>
                {e?.payee ? <p className="mt-1 text-xs text-danger">{msg(e.payee.message)}</p> : null}
              </div>
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Checkbox {...register(`items.${i}.isEstimate`)} disabled={kind === "taxes_and_customs"} />{t("isEstimate")}
                </label>
                {fields.length > 1 ? (
                  <Button variant="ghost" size="sm" aria-label={t("removeLine")} onClick={() => remove(i)}><Trash2 className="size-4" aria-hidden="true" /></Button>
                ) : null}
              </div>
            </div>
          );
        })}
        {errors.items?.message ? <p role="alert" className="text-xs text-danger">{msg(errors.items.message)}</p> : null}
        {fields.length < 30 ? (
          <Button variant="secondary" size="sm" onClick={() => append({ kind: "international_shipping", description: "", amount: "" as unknown as number, payee: "supplier", isEstimate: false })}>
            <Plus className="size-4" aria-hidden="true" />{t("addLine")}
          </Button>
        ) : null}
      </div>
      <p className="text-sm">{t("quotationTotal")}: <span className="font-semibold ltr-nums">{formatMoney(total, currency || "EUR", locale)}</span></p>
      <div>
        <label htmlFor="q-terms" className="mb-1 block text-sm font-medium">{t("terms")}</label>
        <Textarea id="q-terms" rows={3} maxLength={3000} {...register("terms")} />
      </div>
      <Alert tone="info">{t("quotationRules")}</Alert>
      <Button type="submit" disabled={pending}>{pending ? t("submitting") : t("submitQuotation")}</Button>
    </form>
  );
}
