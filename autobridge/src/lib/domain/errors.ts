/**
 * Maps database/Auth errors to translation keys under `errors.*`.
 * Raw database messages are never shown to users.
 */
const KNOWN = [
  "forbidden", "not_found", "invalid_transition", "reason_required", "legal_review_required",
  "supplier_required", "no_sent_quotation", "pathway_disabled", "vehicle_not_available",
  "rate_limited", "protected_fields", "request_locked", "quotation_expired", "invalid_items",
  "invalid_valid_until", "invalid_currency", "supplier_not_approved", "partner_not_approved",
  "partner_category_mismatch", "too_many_images", "listing_archived", "rule_set_locked",
  "cannot_remove_last_admin", "duplicate_open_request", "invalid_cost_estimate",
  "invalid_manufacture_year", "invalid_first_registration_date", "assignee_not_staff",
  "supplier_fixed_by_listing", "invalid_amount", "invalid_storage_path",
] as const;

export type ErrorKey =
  | (typeof KNOWN)[number]
  | "unexpected"
  | "duplicate"
  | "invalid_input"
  | "invalid_credentials"
  | "email_not_confirmed"
  | "weak_password"
  | "same_password"
  | "link_invalid"
  | "upload_failed"
  | "file_too_large"
  | "file_type";

export function errorKey(error: { message?: string; code?: string } | null | undefined): ErrorKey {
  if (!error) return "unexpected";
  const message = error.message ?? "";
  const hit = KNOWN.find((k) => message === k || message.includes(k));
  if (hit) return hit;
  if (error.code === "23505") return "duplicate";
  if (error.code === "23514" || error.code === "22P02" || error.code === "23502") return "invalid_input";
  if (error.code === "42501") return "forbidden";
  return "unexpected";
}
