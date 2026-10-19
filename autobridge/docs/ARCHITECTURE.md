# Architecture

## Overview

```
Browser ──► Next.js (App Router, proxy.ts) ──► Supabase (PostgREST / Auth / Storage)
              │  server components & actions          │
              │  run with the USER's session          ├─ PostgreSQL + RLS (authority)
              │                                        ├─ SECURITY DEFINER RPCs (state changes)
              └─ /api/notifications/dispatch ──────────┴─ service role (e-mail queue only)
```

- **All user requests run under the user's own Supabase session.** The service-role key is only
  used by the notification e-mail dispatcher and by CLI scripts (seed, grant-role, tests).
- **The database is the authority.** Next.js pages hide controls a user cannot use, but every
  permission is re-checked in PostgreSQL. A crafted request against the API gains nothing.
- `src/proxy.ts` (Next 16's replacement for middleware) handles locale routing (next-intl),
  refreshes the Supabase session, redirects signed-out visitors away from private areas, and marks
  them `noindex`/`no-store`.

## Security model (database)

| Mechanism | Used for |
|---|---|
| Row Level Security on every table | Who can read/insert/update/delete which rows |
| Guard triggers (`private.*_guard`) | Columns clients may never set (status, moderation, `is_demo`, owner, review fields). They apply only when `current_user` is `anon`/`authenticated`, so trusted definer functions can still update |
| `SECURITY DEFINER` RPCs | Every state change: approvals, moderation, status transitions, quotations, legal review, roles, rule-set activation. Each validates the actor and the current state, then writes history, an audit-log entry and notifications |
| Security-barrier views | Public projections that expose only safe columns: `marketplace_vehicles` (no VIN, only a masked form; no supplier contacts), `public_suppliers`, `public_partners`, `public_business_verifications` (passed, unexpired checks; no notes), `supplier_purchase_requests` (no customer contact data), `latest_exchange_rates` |
| `private` schema | Helper functions (`is_staff()`, `my_supplier_id()`, …), not exposed by the API |
| CHECK constraints | Money ≥ 0, enum-like values, VIN format, and fee-line coherence (a platform fee can never be a customs line; customs lines are always estimates) |

Roles: `user_roles` holds only privileged roles (`staff`, `admin`). A customer is any authenticated
user. Supplier and partner capabilities come from an **approved** business profile owned by the
user, and only an administrator can approve one.

Storage: `vehicle-images` is public-read by unguessable URL. Uploads are only allowed into
`{uid}/{vehicle_id}/` for the uploader's own listing, and listing the bucket is restricted.
`verification-docs` is private: owner and staff only, served through 60-second signed URLs.

## Data model (main tables)

- `profiles` (1:1 with `auth.users`), `user_roles`
- `supplier_profiles`, `partner_profiles`, `partner_service_categories`, `verification_documents`,
  `supplier_verification_records` (check type, result, method, evidence, verifier, date, expiry)
- `vehicles` holds the vehicle facts *and* its listing lifecycle in one row (one supplier listing of
  one physical vehicle): `status` (draft → pending_review → published / rejected → archived),
  `availability`, `published_at`, `expires_at`, `last_confirmed_at`, `promoted_until`, `is_demo`.
  Splitting it into separate vehicle and listing tables would add joins and two-table writes
  without a current use case. A future feed can still add a `source` column.
- `vehicle_images`, `favorites`, `listing_reports`
- `acquisition_pathways` (configurable, can be disabled; all require legal review by default)
- `purchase_requests` (+ `vehicle_snapshot` taken at creation), `request_status_history`,
  `request_milestones` (dated, recorded events only)
- `quotations` + `quotation_items` (`fee_kind`, `payee`, `is_estimate`), `service_requests` + `service_quotes`
- `currencies`, `exchange_rates` (append-only, source + effective date), `cost_rule_sets` (versioned,
  one active, non-draft sets immutable), `cost_estimate_rules`, `cost_estimates` (snapshots)
- `notifications`, `audit_logs` (append-only), `admin_notes` (staff-only)
- `site_settings`, `faqs`, `legal_documents` (versioned), `contact_messages`, `data_requests`

Money uses `numeric(14,2)` with the original currency. Converted values are computed, never stored
as the only value.

## Purchase request lifecycle

```
draft → submitted → under_review → supplier_contacted → quotation_received
      → awaiting_customer_decision → accepted → in_progress → completed
(cancelled / rejected from open states)
```

- The allowed transitions live in `private.request_transition_allowed()` and are mirrored in
  `src/lib/domain/request-status.ts`. A unit test fails if the two diverge.
- Customers can only submit drafts and cancel open requests. Staff move requests forward. The
  quotation RPCs perform the automatic moves (`quotation_received`, `awaiting_customer_decision`,
  `accepted`).
- `accepted → in_progress` requires the legal review to be `approved` (or `not_required`).
- Supplier quotations are invisible to the customer until staff verify and *send* them.
- Accepting a quotation declines the others. Declining the last one returns the request to review.
- Purchased / shipped / customs-cleared / delivered are only ever shown as **recorded milestones**
  with a date and an optional evidence reference.

## Cost estimation

`src/lib/domain/cost-calculator.ts` is a pure function used by the client (live recalculation)
and the server (saved snapshots). Inputs are the vehicle price, documented rates (direct, inverse
or one pivot), an optional manual rate, the active rule set's rules (`fixed`,
`percent_of_price`, `quote_required`), user overrides flagged as confirmed or not, and extra lines.
Outputs are itemised lines with status, total, completeness, confidence and warnings. Confidence is
never "high" without a confirmed customs amount.

## Internationalisation

- next-intl with `localePrefix: "always"`. Arabic is the default and right-to-left; French is left-to-right.
- Messages are split by namespace in `messages/{ar,fr}/*.json`. TypeScript checks every key against
  the French catalogue, and a unit test checks that both languages define the same keys and placeholders.
- Layout uses logical properties (`ms-`, `ps-`, `start-`, `text-start`) and `rtl:`/`ltr:` variants.
  Numbers, prices and references are isolated LTR (`.ltr-nums`). Formatting uses `ar-DZ`/`fr-DZ`
  (Latin digits, DZD).
- Notifications are stored as `type + params` and rendered in the reader's language (in-app and e-mail).

## Code layout

```
src/app/[locale]/…        pages (public, auth, account, supplier, partner, admin)
src/app/auth/confirm      e-mail link verification (route handler)
src/app/api/…             notification e-mail dispatcher
src/components/…          UI primitives and feature components
src/lib/actions/…         server actions (validated with Zod, executed under the user's session)
src/lib/domain/…          pure domain logic (enums, transitions, cost calculator, errors)
src/lib/queries/…         read helpers
src/lib/validation/…      Zod schemas shared by client and server
supabase/migrations       schema, RLS, RPCs, reference data
scripts/                  seed-demo, grant-role
tests/db, e2e/            database and browser tests
```
