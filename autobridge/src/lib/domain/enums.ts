import type { Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];

export type FuelType = Enums["fuel_type"];
export type Transmission = Enums["transmission_type"];
export type BodyType = Enums["body_type"];
export type VehicleCondition = Enums["vehicle_condition"];
export type ListingStatus = Enums["listing_status"];
export type Availability = Enums["availability_status"];
export type RequestStatus = Enums["request_status"];
export type LegalReviewStatus = Enums["legal_review_status"];
export type QuotationStatus = Enums["quotation_status"];
export type FeeKind = Enums["fee_kind"];
export type FeeParty = Enums["fee_party"];
export type BusinessStatus = Enums["business_status"];
export type VerificationCheck = Enums["verification_check"];
export type VerificationResult = Enums["verification_result"];
export type MilestoneKind = Enums["milestone_kind"];
export type ServiceRequestStatus = Enums["service_request_status"];
export type ContactMethod = Enums["contact_method"];
export type AppRole = Enums["app_role"];

export const FUEL_TYPES = ["petrol", "diesel", "hybrid", "plug_in_hybrid", "electric", "lpg", "other"] as const satisfies readonly FuelType[];
export const TRANSMISSIONS = ["manual", "automatic"] as const satisfies readonly Transmission[];
export const BODY_TYPES = [
  "sedan", "hatchback", "suv", "crossover", "pickup", "van", "coupe", "wagon", "convertible", "minivan", "other",
] as const satisfies readonly BodyType[];
export const CONDITIONS = ["new", "used"] as const satisfies readonly VehicleCondition[];
export const LISTING_STATUSES = ["draft", "pending_review", "published", "rejected", "archived"] as const satisfies readonly ListingStatus[];
export const AVAILABILITIES = ["available", "reserved", "sold", "unavailable"] as const satisfies readonly Availability[];
export const REQUEST_STATUSES = [
  "draft", "submitted", "under_review", "supplier_contacted", "quotation_received",
  "awaiting_customer_decision", "accepted", "in_progress", "completed", "cancelled", "rejected",
] as const satisfies readonly RequestStatus[];
export const QUOTATION_STATUSES = ["submitted", "sent", "accepted", "declined", "withdrawn", "rejected"] as const satisfies readonly QuotationStatus[];
export const FEE_KINDS = [
  "vehicle_price", "domestic_transport", "international_shipping", "insurance", "inspection",
  "taxes_and_customs", "documentation_admin", "platform_service_fee", "partner_service_fee", "other",
] as const satisfies readonly FeeKind[];
export const FEE_PARTIES = ["supplier", "platform", "partner", "public_authority", "other"] as const satisfies readonly FeeParty[];
export const BUSINESS_STATUSES = ["pending", "approved", "rejected", "suspended"] as const satisfies readonly BusinessStatus[];
export const VERIFICATION_CHECKS = [
  "business_registration", "tax_registration", "representative_identity", "business_address",
  "phone_contact", "email_contact", "site_visit", "trade_references", "other",
] as const satisfies readonly VerificationCheck[];
export const VERIFICATION_RESULTS = ["passed", "failed", "inconclusive"] as const satisfies readonly VerificationResult[];
export const MILESTONE_KINDS = [
  "supplier_confirmed_availability", "vehicle_inspected", "vehicle_purchased", "export_documents_ready",
  "shipped", "arrived_at_port", "customs_cleared", "delivered_to_customer", "other",
] as const satisfies readonly MilestoneKind[];
export const SERVICE_REQUEST_STATUSES = ["requested", "quoted", "accepted", "in_progress", "completed", "cancelled"] as const satisfies readonly ServiceRequestStatus[];
export const CONTACT_METHODS = ["phone", "email", "whatsapp"] as const satisfies readonly ContactMethod[];
export const DOCUMENT_TYPES = [
  "business_registration", "tax_registration", "representative_id", "proof_of_address",
  "insurance_certificate", "professional_license", "other",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];
export const REPORT_REASONS = [
  "incorrect_information", "suspected_fraud", "no_longer_available", "duplicate", "inappropriate", "other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/** Countries suppliers commonly operate from. Names are localised with Intl.DisplayNames. */
export const SOURCE_COUNTRIES = [
  "FR", "DE", "BE", "ES", "IT", "NL", "PT", "LU", "CH", "GB", "SE", "PL", "AT",
  "TR", "AE", "SA", "QA", "CN", "KR", "JP", "US", "CA",
] as const;

/** Rule payees allowed for each fee kind; mirrors the CHECK constraints on quotation_items. */
export const ALLOWED_PAYEES: Record<FeeKind, readonly FeeParty[]> = {
  vehicle_price: ["supplier"],
  domestic_transport: ["supplier", "partner", "other"],
  international_shipping: ["supplier", "partner", "other"],
  insurance: ["supplier", "partner", "other"],
  inspection: ["supplier", "partner", "other"],
  taxes_and_customs: ["public_authority"],
  documentation_admin: ["supplier", "platform", "partner", "other"],
  platform_service_fee: ["platform"],
  partner_service_fee: ["partner"],
  other: ["supplier", "partner", "other"],
};

export function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (values as readonly string[]).includes(value);
}
