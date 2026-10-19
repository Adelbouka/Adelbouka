import { z } from "zod";
import { countryCode, email, optionalText, optionalUrl, phone, requiredText } from "./common";

export const businessProfileSchema = z.object({
  businessName: requiredText(160, 2),
  legalForm: optionalText(80),
  registrationNumber: optionalText(80),
  countryCode,
  city: requiredText(80),
  address: optionalText(300),
  contactName: requiredText(120, 2),
  contactEmail: email,
  contactPhone: phone,
  website: optionalUrl,
  description: optionalText(2000),
  servicesOffered: optionalText(1000),
});

export const partnerExtraSchema = z.object({
  categories: z.array(z.string().regex(/^[a-z_]+$/)).min(1, { error: "at_least_one_item" }).max(10),
  operatingCountries: z.array(z.string().regex(/^[A-Z]{2}$/)).max(40),
});

export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;
