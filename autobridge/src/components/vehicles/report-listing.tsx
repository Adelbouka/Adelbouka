"use client";
import { useActionState } from "react";
import { Flag } from "lucide-react";
import { useTranslations } from "next-intl";
import { reportListingAction } from "@/lib/actions/listing-interactions";
import { initialState } from "@/lib/actions/state";
import { REPORT_REASONS } from "@/lib/domain/enums";
import { Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { FormError } from "@/components/forms/form-error";
import { useFormErrors } from "@/components/forms/use-form-errors";

export function ReportListing({ vehicleId }: { vehicleId: string }) {
  const t = useTranslations("vehicles");
  const te = useTranslations("enums");
  const [state, action] = useActionState(reportListingAction, initialState);
  const { formError } = useFormErrors(state);
  return (
    <details className="rounded-xl border border-border bg-surface">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm text-muted-foreground hover:text-foreground">
        <Flag className="size-4" aria-hidden="true" />{t("report")}
      </summary>
      <div className="border-t border-border p-4">
        {state.ok ? (
          <Alert tone="success">{t("reportThanks")}</Alert>
        ) : (
          <form action={action} className="space-y-3">
            <input type="hidden" name="vehicleId" value={vehicleId} />
            <FormError message={formError} />
            <div>
              <label htmlFor="report-reason" className="mb-1 block text-sm font-medium">{t("reportReason")}</label>
              <Select id="report-reason" name="reason" required defaultValue="incorrect_information">
                {REPORT_REASONS.map((r) => <option key={r} value={r}>{te(`reportReason.${r}`)}</option>)}
              </Select>
            </div>
            <div>
              <label htmlFor="report-details" className="mb-1 block text-sm font-medium">{t("reportDetails")}</label>
              <Textarea id="report-details" name="details" rows={3} maxLength={2000} />
            </div>
            <SubmitButton variant="secondary" size="sm">{t("reportSubmit")}</SubmitButton>
          </form>
        )}
      </div>
    </details>
  );
}
