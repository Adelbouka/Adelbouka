"use client";
import { useActionState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { ActionState } from "@/lib/actions/state";
import { initialState } from "@/lib/actions/state";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FormError } from "./form-error";
import { useFormErrors } from "./use-form-errors";

/**
 * Small wrapper for server actions with (prevState, formData) signature.
 * Hidden inputs carry identifiers; authorization is enforced by the action and the database.
 */
export function ActionForm({
  action, hidden, children, submitLabel, variant = "primary", size = "md", className, successMessage, confirmMessage, inline,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  hidden?: Record<string, string>;
  children?: ReactNode;
  submitLabel: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  successMessage?: string;
  confirmMessage?: string;
  inline?: boolean;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const { fieldError, formError } = useFormErrors(state);
  const tc = useTranslations("common");
  return (
    <form
      action={formAction}
      className={cn(inline ? "flex flex-wrap items-end gap-2" : "space-y-3", className)}
      onSubmit={(e) => {
        if (confirmMessage && !window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {Object.entries(hidden ?? {}).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {!inline ? <FormError message={formError} /> : null}
      {children}
      {Object.keys(state.fieldErrors ?? {}).length && !inline ? (
        <ul className="text-xs text-danger">
          {Object.keys(state.fieldErrors ?? {}).map((k) => fieldError(k) ? <li key={k}>{fieldError(k)}</li> : null)}
        </ul>
      ) : null}
      <SubmitButton variant={variant} size={size}>{submitLabel}</SubmitButton>
      {inline && formError ? <p role="alert" className="w-full text-xs text-danger">{formError}</p> : null}
      {state.ok && successMessage ? <p role="status" className="w-full text-sm text-success">{successMessage ?? tc("saved")}</p> : null}
    </form>
  );
}
