import { z } from "zod";

/** Validation error messages are translation keys under `validation.*`. */
export const requiredText = (max: number, min = 1) => {
  const base = z.string({ error: "required" }).trim().min(1, { error: "required" });
  return (min > 1 ? base.min(min, { error: "too_short" }) : base).max(max, { error: "too_long" });
};

export const optionalText = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" ? (v.trim() === "" ? undefined : v.trim()) : v ?? undefined),
    z.string().max(max, { error: "too_long" }).optional(),
  );

export const email = z.string({ error: "required" }).trim().toLowerCase().pipe(z.email({ error: "invalid_email" }).max(254, { error: "too_long" }));

export const optionalEmail = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  email.optional(),
);

export const phone = z
  .string({ error: "required" })
  .trim()
  .regex(/^\+?[0-9\s().-]{6,32}$/, { error: "invalid_phone" });

export const optionalUrl = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().trim().regex(/^https?:\/\/[^\s]+$/i, { error: "invalid_url" }).max(300, { error: "too_long" }).optional(),
);

export const optionalNumber = (min: number, max: number, int = true) =>
  z.preprocess(
    (v) => (v === "" || v == null ? undefined : typeof v === "string" ? Number(v.replace(",", ".")) : v),
    (int ? z.number({ error: "invalid_number" }).int({ error: "invalid_number" }) : z.number({ error: "invalid_number" }))
      .min(min, { error: "too_small" })
      .max(max, { error: "too_large" })
      .optional(),
  );

export const requiredNumber = (min: number, max: number, int = true) =>
  z.preprocess(
    (v) => (v === "" || v == null ? undefined : typeof v === "string" ? Number(v.replace(",", ".")) : v),
    (int ? z.number({ error: "required" }).int({ error: "invalid_number" }) : z.number({ error: "required" }))
      .min(min, { error: "too_small" })
      .max(max, { error: "too_large" }),
  );

export const countryCode = z.string({ error: "required" }).regex(/^[A-Z]{2}$/, { error: "invalid_choice" });
export const currencyCode = z.string({ error: "required" }).regex(/^[A-Z]{3}$/, { error: "invalid_choice" });
export const uuid = z.uuid({ error: "invalid_input" });
export const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());
export const localeSchema = z.enum(["ar", "fr"]).catch("ar");
