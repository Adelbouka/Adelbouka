import { z } from "zod";
import { checkbox, email, localeSchema, requiredText } from "./common";

export const password = z
  .string({ error: "required" })
  .min(8, { error: "password_too_short" })
  .max(72, { error: "too_long" })
  .regex(/[A-Za-z]/, { error: "password_letters_digits" })
  .regex(/[0-9]/, { error: "password_letters_digits" });

export const signInSchema = z.object({
  email,
  password: z.string({ error: "required" }).min(1, { error: "required" }),
  next: z.string().optional(),
  locale: localeSchema,
});

export const signUpSchema = z
  .object({
    fullName: requiredText(120, 2),
    email,
    password,
    confirmPassword: z.string({ error: "required" }),
    acceptTerms: checkbox.refine((v) => v, { error: "must_accept" }),
    locale: localeSchema,
  })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], error: "passwords_mismatch" });

export const forgotPasswordSchema = z.object({ email, locale: localeSchema });

export const resetPasswordSchema = z
  .object({ password, confirmPassword: z.string({ error: "required" }), locale: localeSchema })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], error: "passwords_mismatch" });
