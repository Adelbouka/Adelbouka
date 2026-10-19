import { describe, expect, it } from "vitest";
import { vehicleSchema } from "./vehicle";
import { purchaseRequestSchema } from "./request";
import { signUpSchema } from "./auth";
import { quotationSchema } from "./quotation";
import { isoDateInDays } from "@/lib/dates";

// First issue per field, as displayed by the forms.
const codes = (r: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  Object.fromEntries([...(r.error?.issues ?? [])].reverse().map((i) => [i.path.join("."), i.message]));

const vehicle = {
  makeId: "3", model: "Golf", bodyType: "hatchback", manufactureYear: "2022", mileageKm: "10000", fuelType: "petrol",
  transmission: "manual", condition: "used", countryCode: "DE", city: "Köln", priceAmount: "21000", priceCurrency: "EUR", availability: "available",
};

describe("vehicle schema", () => {
  it("accepts a valid listing and coerces numbers", () => {
    const r = vehicleSchema.safeParse(vehicle);
    expect(r.success).toBe(true);
    expect(r.data?.manufactureYear).toBe(2022);
  });
  it("rejects an invalid VIN", () => {
    expect(codes(vehicleSchema.safeParse({ ...vehicle, vin: "WVWZZZ1KZ6W00000O" })).vin).toBe("invalid_vin");
    expect(vehicleSchema.safeParse({ ...vehicle, vin: "wvwzzzcdzpw123456" }).data?.vin).toBe("WVWZZZCDZPW123456");
  });
  it("keeps first registration distinct from and consistent with the manufacturing year", () => {
    expect(codes(vehicleSchema.safeParse({ ...vehicle, firstRegistrationDate: "2019-05-01" })).firstRegistrationDate).toBe("registration_before_year");
    expect(codes(vehicleSchema.safeParse({ ...vehicle, firstRegistrationDate: isoDateInDays(30) })).firstRegistrationDate).toBe("future_date");
    expect(vehicleSchema.safeParse({ ...vehicle, firstRegistrationDate: "2021-12-15" }).success).toBe(true);
  });
  it("rejects an engine capacity for electric vehicles", () => {
    expect(codes(vehicleSchema.safeParse({ ...vehicle, fuelType: "electric", engineCc: "1500" })).engineCc).toBe("electric_no_engine");
  });
  it("requires mandatory fields", () => {
    const c = codes(vehicleSchema.safeParse({ ...vehicle, model: " ", priceAmount: "" }));
    expect(c.model).toBe("required");
    expect(c.priceAmount).toBe("required");
  });
});

const request = {
  requestType: "custom_search", desiredMakeId: "4", budgetCurrency: "DZD", pathwayCode: "individual_used_vehicle",
  contactName: "Amine B.", contactPhone: "0550 12 34 56", wilaya: "Oran", preferredContact: "phone", acknowledge: true,
};

describe("purchase request schema", () => {
  it("accepts a valid custom request", () => {
    expect(purchaseRequestSchema.safeParse(request).success).toBe(true);
  });
  it("requires a make for custom searches and a vehicle for listed requests", () => {
    expect(codes(purchaseRequestSchema.safeParse({ ...request, desiredMakeId: "" })).desiredMakeId).toBe("vehicle_or_search");
    expect(codes(purchaseRequestSchema.safeParse({ ...request, requestType: "listed_vehicle" })).vehicleId).toBe("required");
  });
  it("validates year ranges, phone numbers and acknowledgement", () => {
    // Cross-field rules run once individual fields are valid (zod refinement semantics).
    expect(codes(purchaseRequestSchema.safeParse({ ...request, yearMin: "2023", yearMax: "2020" })).yearMax).toBe("year_range");
    const c = codes(purchaseRequestSchema.safeParse({ ...request, contactPhone: "abc", acknowledge: false }));
    expect(c.contactPhone).toBe("invalid_phone");
    expect(c.acknowledge).toBe("must_accept");
  });
  it("rejects an invalid optional e-mail but accepts an empty one", () => {
    expect(codes(purchaseRequestSchema.safeParse({ ...request, contactEmail: "nope" })).contactEmail).toBe("invalid_email");
    expect(purchaseRequestSchema.safeParse({ ...request, contactEmail: "" }).success).toBe(true);
  });
});

describe("sign-up schema", () => {
  const base = { fullName: "Lina K", email: "lina@example.com", password: "abcd1234", confirmPassword: "abcd1234", acceptTerms: "on", locale: "fr" };
  it("accepts valid input", () => expect(signUpSchema.safeParse(base).success).toBe(true));
  it("rejects weak or mismatched passwords and missing consent", () => {
    expect(codes(signUpSchema.safeParse({ ...base, password: "short1", confirmPassword: "short1" })).password).toBe("password_too_short");
    expect(codes(signUpSchema.safeParse({ ...base, password: "abcdefgh", confirmPassword: "abcdefgh" })).password).toBe("password_letters_digits");
    expect(codes(signUpSchema.safeParse({ ...base, confirmPassword: "different1" })).confirmPassword).toBe("passwords_mismatch");
    expect(codes(signUpSchema.safeParse({ ...base, acceptTerms: undefined })).acceptTerms).toBe("must_accept");
  });
});

describe("quotation schema", () => {
  const q = {
    requestId: "8293e003-9bc1-4ab0-b092-3c9068fc7047", currency: "EUR", validUntil: isoDateInDays(10),
    items: [{ kind: "vehicle_price", description: "Prix du véhicule", amount: "20000", payee: "supplier", isEstimate: false }],
  };
  it("accepts a coherent quotation", () => expect(quotationSchema.safeParse(q).success).toBe(true));
  it("never lets a platform fee be presented as a customs charge", () => {
    const r = quotationSchema.safeParse({ ...q, items: [{ kind: "taxes_and_customs", description: "Commission", amount: "100", payee: "platform", isEstimate: true }] });
    expect(codes(r)["items.0.payee"]).toBe("payee_mismatch");
  });
  it("rejects expired validity dates and empty quotations", () => {
    expect(codes(quotationSchema.safeParse({ ...q, validUntil: "2020-01-01" })).validUntil).toBe("past_date");
    expect(codes(quotationSchema.safeParse({ ...q, items: [] })).items).toBe("at_least_one_item");
  });
});

describe("required text fields", () => {
  it("report 'required' when empty and 'too_short' when too short", async () => {
    const { requiredText } = await import("./common");
    const schema = requiredText(50, 3);
    expect(schema.safeParse("   ").error?.issues[0].message).toBe("required");
    expect(schema.safeParse("ab").error?.issues[0].message).toBe("too_short");
    expect(schema.safeParse("abc").success).toBe(true);
  });
});
