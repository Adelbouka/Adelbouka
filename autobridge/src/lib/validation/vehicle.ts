import { z } from "zod";
import { AVAILABILITIES, BODY_TYPES, CONDITIONS, FUEL_TYPES, TRANSMISSIONS } from "@/lib/domain/enums";
import { countryCode, currencyCode, optionalNumber, optionalText, requiredNumber, requiredText } from "./common";

const currentYear = () => new Date().getFullYear();

export const vehicleSchema = z
  .object({
    makeId: requiredNumber(1, 32767),
    model: requiredText(80),
    trimLevel: optionalText(80),
    bodyType: z.enum(BODY_TYPES, { error: "invalid_choice" }),
    manufactureYear: requiredNumber(1950, 2100),
    firstRegistrationDate: z.preprocess(
      (v) => (v === "" || v == null ? undefined : v),
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "invalid_date" }).optional(),
    ),
    mileageKm: requiredNumber(0, 2_000_000),
    fuelType: z.enum(FUEL_TYPES, { error: "invalid_choice" }),
    transmission: z.enum(TRANSMISSIONS, { error: "invalid_choice" }),
    engineCc: optionalNumber(50, 10000),
    powerKw: optionalNumber(1, 2000),
    condition: z.enum(CONDITIONS, { error: "invalid_choice" }),
    exteriorColor: optionalText(40),
    doors: optionalNumber(1, 6),
    seats: optionalNumber(1, 9),
    vin: z.preprocess(
      (v) => (typeof v === "string" ? (v.trim() === "" ? undefined : v.trim().toUpperCase()) : v),
      z.string().regex(/^[A-HJ-NPR-Z0-9]{17}$/, { error: "invalid_vin" }).optional(),
    ),
    description: optionalText(5000),
    countryCode,
    city: requiredText(80),
    priceAmount: requiredNumber(1, 1_000_000_000, false),
    priceCurrency: currencyCode,
    availability: z.enum(AVAILABILITIES, { error: "invalid_choice" }),
    submitForReview: z.boolean().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.manufactureYear > currentYear() + 1) ctx.addIssue({ code: "custom", path: ["manufactureYear"], message: "too_large" });
    if (v.firstRegistrationDate) {
      const d = new Date(`${v.firstRegistrationDate}T00:00:00Z`);
      if (Number.isNaN(d.getTime())) ctx.addIssue({ code: "custom", path: ["firstRegistrationDate"], message: "invalid_date" });
      else if (d.getTime() > Date.now()) ctx.addIssue({ code: "custom", path: ["firstRegistrationDate"], message: "future_date" });
      else if (d.getUTCFullYear() < v.manufactureYear - 1) ctx.addIssue({ code: "custom", path: ["firstRegistrationDate"], message: "registration_before_year" });
    }
    if (v.fuelType === "electric" && v.engineCc) ctx.addIssue({ code: "custom", path: ["engineCc"], message: "electric_no_engine" });
  });

export type VehicleInput = z.input<typeof vehicleSchema>;
