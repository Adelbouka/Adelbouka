"use client";
import { useTranslations } from "next-intl";
import type { ActionState } from "@/lib/actions/state";

/** Translates action field errors and the top-level error of an ActionState. */
export function useFormErrors(state: ActionState) {
  const tv = useTranslations("validation");
  const te = useTranslations("errors");
  const fieldError = (name: string): string | undefined => {
    const code = state.fieldErrors?.[name]?.[0] as Parameters<typeof tv>[0] | undefined;
    if (!code) return undefined;
    return tv.has(code) ? tv(code) : tv("invalid");
  };
  const formError = !state.ok && state.error ? (te.has(state.error) ? te(state.error) : te("unexpected")) : undefined;
  return { fieldError, formError };
}
