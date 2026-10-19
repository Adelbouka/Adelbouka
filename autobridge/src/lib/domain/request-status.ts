import type { RequestStatus } from "./enums";

export type TransitionActor = "customer" | "staff" | "system";

/**
 * Mirror of private.request_transition_allowed() in the database, which is the
 * authority. This copy only decides which actions the UI offers; a unit test keeps
 * the two in sync and an integration test checks the database rejects the rest.
 */
export const REQUEST_TRANSITIONS: ReadonlyArray<readonly [TransitionActor, RequestStatus, RequestStatus]> = [
  ["customer", "draft", "submitted"],
  ["customer", "draft", "cancelled"],
  ["customer", "submitted", "cancelled"],
  ["customer", "under_review", "cancelled"],
  ["customer", "supplier_contacted", "cancelled"],
  ["customer", "quotation_received", "cancelled"],
  ["customer", "awaiting_customer_decision", "cancelled"],
  ["staff", "submitted", "under_review"],
  ["staff", "submitted", "rejected"],
  ["staff", "submitted", "cancelled"],
  ["staff", "under_review", "supplier_contacted"],
  ["staff", "under_review", "rejected"],
  ["staff", "under_review", "cancelled"],
  ["staff", "supplier_contacted", "under_review"],
  ["staff", "supplier_contacted", "rejected"],
  ["staff", "supplier_contacted", "cancelled"],
  ["staff", "quotation_received", "under_review"],
  ["staff", "quotation_received", "awaiting_customer_decision"],
  ["staff", "quotation_received", "cancelled"],
  ["staff", "awaiting_customer_decision", "under_review"],
  ["staff", "awaiting_customer_decision", "cancelled"],
  ["staff", "accepted", "in_progress"],
  ["staff", "accepted", "cancelled"],
  ["staff", "in_progress", "completed"],
  ["staff", "in_progress", "cancelled"],
  ["system", "under_review", "quotation_received"],
  ["system", "supplier_contacted", "quotation_received"],
  ["system", "under_review", "awaiting_customer_decision"],
  ["system", "supplier_contacted", "awaiting_customer_decision"],
  ["system", "quotation_received", "awaiting_customer_decision"],
  ["system", "awaiting_customer_decision", "accepted"],
  ["system", "awaiting_customer_decision", "under_review"],
];

export const TERMINAL_STATUSES: readonly RequestStatus[] = ["completed", "cancelled", "rejected"];

export function canTransition(from: RequestStatus, to: RequestStatus, actor: TransitionActor): boolean {
  return REQUEST_TRANSITIONS.some(([a, f, t]) => a === actor && f === from && t === to);
}

export function nextStatuses(from: RequestStatus, actor: TransitionActor): RequestStatus[] {
  return REQUEST_TRANSITIONS.filter(([a, f]) => a === actor && f === from).map(([, , t]) => t);
}

export function isTerminal(status: RequestStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/** The nominal happy path, used to draw progress for customers. */
export const REQUEST_PROGRESS: readonly RequestStatus[] = [
  "submitted", "under_review", "supplier_contacted", "quotation_received",
  "awaiting_customer_decision", "accepted", "in_progress", "completed",
];

export type Tone = "neutral" | "info" | "warning" | "success" | "danger";

export function requestStatusTone(status: RequestStatus): Tone {
  switch (status) {
    case "completed":
    case "accepted":
      return "success";
    case "cancelled":
    case "rejected":
      return "danger";
    case "awaiting_customer_decision":
    case "quotation_received":
      return "warning";
    case "draft":
      return "neutral";
    default:
      return "info";
  }
}
