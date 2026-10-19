import { z } from "zod";
import { CONTACT_METHODS, FUEL_TYPES, TRANSMISSIONS } from "@/lib/domain/enums";
import { optionalEmail, optionalNumber, optionalText, phone, requiredText } from "./common";

const enumOrEmpty = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess((v) => (v === "" || v == null ? undefined : v), z.enum(values, { error: "invalid_choice" }).optional());

export const purchaseRequestSchema = z
  .object({
    requestType: z.enum(["listed_vehicle", "custom_search"], { error: "invalid_choice" }),
    vehicleId: z.preprocess((v) => (v === "" ? undefined : v), z.uuid({ error: "invalid_input" }).optional()),
    desiredMakeId: optionalNumber(1, 32767),
    desiredModel: optionalText(80),
    yearMin: optionalNumber(1950, 2100),
    yearMax: optionalNumber(1950, 2100),
    maxMileageKm: optionalNumber(0, 2_000_000),
    desiredFuel: enumOrEmpty(FUEL_TYPES),
    desiredTransmission: enumOrEmpty(TRANSMISSIONS),
    preferences: optionalText(2000),
    budgetAmount: optionalNumber(1, 10_000_000_000, false),
    budgetCurrency: z.string().regex(/^[A-Z]{3}$/, { error: "invalid_choice" }),
    pathwayCode: z.string({ error: "required" }).regex(/^[a-z_]{2,40}$/, { error: "required" }),
    contactName: requiredText(120, 2),
    contactPhone: phone,
    contactEmail: optionalEmail,
    wilaya: requiredText(64, 2),
    preferredContact: z.enum(CONTACT_METHODS, { error: "invalid_choice" }),
    message: optionalText(2000),
    costEstimateId: z.preprocess((v) => (v === "" ? undefined : v), z.uuid().optional()),
    acknowledge: z.literal(true, { error: "must_accept" }),
    asDraft: z.boolean().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.requestType === "listed_vehicle" && !v.vehicleId) ctx.addIssue({ code: "custom", path: ["vehicleId"], message: "required" });
    if (v.requestType === "custom_search" && !v.desiredMakeId) ctx.addIssue({ code: "custom", path: ["desiredMakeId"], message: "vehicle_or_search" });
    if (v.yearMin && v.yearMax && v.yearMin > v.yearMax) ctx.addIssue({ code: "custom", path: ["yearMax"], message: "year_range" });
  });

export type PurchaseRequestInput = z.input<typeof purchaseRequestSchema>;
