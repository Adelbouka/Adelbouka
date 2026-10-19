import type { z } from "zod";
import { errorKey, type ErrorKey } from "@/lib/domain/errors";

export type ActionState = {
  ok: boolean;
  /** Translation key under `errors.*`. */
  error?: ErrorKey;
  /** Field errors: values are translation keys under `validation.*`. */
  fieldErrors?: Record<string, string[] | undefined>;
  /** Optional translation key under `messages.*` for a success notice. */
  message?: string;
  /** Echoed values so a form can be re-filled after a validation error. */
  values?: Record<string, string>;
  /** Arbitrary result payload (e.g. created id). */
  data?: Record<string, string | number | null>;
};

export const initialState: ActionState = { ok: false };

export function fromZodError(error: z.ZodError, values?: Record<string, string>): ActionState {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { ok: false, error: "invalid_input", fieldErrors, values };
}

export function fromDbError(error: { message?: string; code?: string } | null): ActionState {
  if (error && process.env.NODE_ENV !== "production") {
    console.warn("[action] database error:", error.code, error.message);
  }
  return { ok: false, error: errorKey(error) };
}

export function formValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string" && !k.startsWith("$ACTION")) out[k] = v;
  }
  return out;
}
