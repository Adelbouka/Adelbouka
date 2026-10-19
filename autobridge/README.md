# AutoBridge DZ

Bilingual (Arabic / French) web platform that connects car buyers in Algeria with verified
vehicle suppliers and independent service partners abroad. AutoBridge DZ is a **digital
intermediary**: it does not buy, own, ship or clear vehicles, and it does not collect vehicle
payments.

- Next.js 16 (App Router, TypeScript, React 19), Tailwind CSS 4, next-intl
- Supabase: PostgreSQL with Row Level Security, Auth, Storage
- Zod + React Hook Form, Vitest, Playwright

> The repository root also contains unrelated static sites (Dawri, Sanad). They are untouched;
> everything for AutoBridge DZ lives in this `autobridge/` directory.

---

## Contents

1. [What is built](#what-is-built)
2. [Routes](#routes)
3. [Local setup](#local-setup)
4. [Environment variables](#environment-variables)
5. [Database, migrations and demo data](#database-migrations-and-demo-data)
6. [Creating the first administrator](#creating-the-first-administrator)
7. [Authentication and e-mail](#authentication-and-e-mail)
8. [Tests](#tests)
9. [Deployment](#deployment)
10. [Feature status](#feature-status)
11. [Known limitations](#known-limitations)

Further reading: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) (data model, security model,
workflows) and [`docs/DATA_RETENTION.md`](docs/DATA_RETENTION.md) (personal data, deletion).

---

## What is built

**Public site**: homepage (search, featured listings, brands and countries computed from real
listings, process explanation, embedded cost estimator, verification explanation, FAQ, partner
call to action), marketplace with 15 filters, sorting, pagination and loading/empty/error states,
vehicle detail pages, public supplier profiles, standalone cost calculator, partner registration
page, contact form, versioned legal pages, sitemap and robots.

**Customers**: sign-up with e-mail confirmation, sign-in, password recovery, profile and language
preference, favorites, saved cost estimates, purchase requests (listed vehicle or custom search)
with an acquisition pathway, request tracking with a timestamped history and recorded milestones,
quotation review and acceptance, in-app notifications, and data access/correction/deletion requests.

**Suppliers**: application, profile, private verification documents, listing creation and editing
with photo upload, submit-for-review, availability confirmation, forwarded requests (without
customer contact details), quotations with typed fee lines, quotation history.

**Partners** (inspection, logistics, export agents, customs professionals…): application with
service categories and operating countries, documents, assigned service requests, service quotes,
progress updates.

**Administration** (role-based): overview counters from real records, request workspace
(assignment, supplier routing, status changes, legal review, quotation vetting, staff quotations,
partner service requests, milestones, internal notes), listing moderation and disclosed paid
promotion, supplier/partner review with recorded verification checks and document expiry,
listing reports, versioned cost rules, documented exchange rates, currencies, acquisition pathway
switches, site settings, FAQ, versioned legal documents, service categories, makes, user roles,
personal-data requests, contact messages, and an immutable audit log.

**Cost estimator**: itemised, transparent estimate. Each line is *confirmed* (written quotation),
*estimate* (assumption or user amount) or *unknown*. It shows completeness and confidence, the
rate source and date, the rule-set version, and explicit warnings. It never invents a customs
rate: taxes and customs stay "official assessment required" until an administrator records a
verified rule. Saved estimates are recomputed on the server.

---

## Routes

All pages are locale-prefixed (`/ar/...` is the default and right-to-left; `/fr/...` is left-to-right).

| Route | Purpose | Access |
|---|---|---|
| `/` → `/ar` | Homepage | Public |
| `/vehicles` | Marketplace with filters | Public |
| `/vehicles/[slug]` | Vehicle details, estimator, request button | Public |
| `/suppliers/[id]` | Public supplier profile and recorded checks | Public |
| `/estimate` | Cost calculator | Public |
| `/partners` | Supplier/partner registration information | Public |
| `/contact` | Contact form | Public |
| `/legal/terms` · `/legal/privacy` · `/legal/disclosure` | Versioned legal documents | Public |
| `/auth/sign-in` · `/auth/sign-up` · `/auth/forgot-password` · `/auth/reset-password` · `/auth/check-email` | Authentication | Public |
| `/auth/confirm` (no locale) | Verifies e-mail links (confirmation, recovery) | Public |
| `/requests/new` | Purchase request form | Signed in |
| `/account`, `/account/requests[/id]`, `/account/favorites`, `/account/estimates`, `/account/notifications`, `/account/profile`, `/account/privacy` | Customer area | Signed in |
| `/supplier`, `/supplier/apply`, `/supplier/profile`, `/supplier/documents`, `/supplier/vehicles[/new|/id]`, `/supplier/requests[/id]`, `/supplier/quotations` | Supplier portal | Signed in; listing and quotation actions need an approved supplier |
| `/partner`, `/partner/apply`, `/partner/profile`, `/partner/documents`, `/partner/services[/id]` | Partner portal | Signed in; service work needs an approved partner |
| `/admin`, `/admin/requests[/id]`, `/admin/vehicles[/id]`, `/admin/suppliers[/id]`, `/admin/partners[/id]`, `/admin/reports`, `/admin/costs`, `/admin/audit` | Administration | Staff or admin |
| `/admin/pathways`, `/admin/content`, `/admin/users` | Global configuration | Admin only |
| `POST /api/notifications/dispatch` | Sends queued notification e-mails | `Authorization: Bearer $CRON_SECRET` |
| `/sitemap.xml`, `/robots.txt` | SEO (private areas disallowed; demo listings excluded) | Public |

---

## Local setup

Prerequisites: Node.js 20.9+ (22 recommended), pnpm 10, Docker (for the local Supabase stack).

```bash
cd autobridge
pnpm install
pnpm db:start            # supabase start: Postgres, Auth, Storage, Mailpit
cp .env.example .env.local
# Fill .env.local with the values printed by `pnpm exec supabase status`
#   NEXT_PUBLIC_SUPABASE_URL              = API_URL
#   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  = ANON_KEY (or PUBLISHABLE_KEY)
#   SUPABASE_SERVICE_ROLE_KEY             = SERVICE_ROLE_KEY
#   CRON_SECRET                           = any long random string
#   EMAIL_PROVIDER=console                # development only
pnpm db:reset            # applies supabase/migrations/*
pnpm seed:demo           # optional fictional demo data (see below)
pnpm dev                 # http://localhost:3000
```

E-mails sent by Supabase Auth locally (confirmation, password recovery) are captured by Mailpit at
<http://127.0.0.1:54324>. Supabase Studio is at <http://127.0.0.1:54323>.

> If `supabase start` cannot pull images from `public.ecr.aws` on your network, pull them from
> Docker Hub instead: `SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io pnpm db:start`.

Useful commands:

| Command | What it does |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js development server / production build / production server |
| `pnpm lint` / `pnpm typecheck` | ESLint / TypeScript |
| `pnpm test` | Unit tests (no database needed) |
| `pnpm test:db` | Database security and search tests (local Supabase required) |
| `pnpm test:e2e` | Playwright tests against `pnpm start` (local Supabase + demo data required) |
| `pnpm db:reset` / `pnpm db:types` / `pnpm db:lint` | Re-apply migrations / regenerate TypeScript types / lint SQL functions |
| `pnpm seed:demo` / `pnpm seed:reset` | Create / remove fictional demo data |
| `pnpm admin:grant <email> [admin\|staff] [--revoke]` | Grant or revoke a privileged role |

---

## Environment variables

See [`.env.example`](.env.example). Summary:

| Variable | Where | Required | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | yes | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | browser + server | yes | Publishable/anon key. `NEXT_PUBLIC_SUPABASE_ANON_KEY` is also accepted |
| `NEXT_PUBLIC_SITE_URL` | server | yes | Canonical URL, used for metadata, sitemap and e-mail links |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | for e-mail dispatch and scripts | Never prefix with `NEXT_PUBLIC_`. User-facing code never uses it |
| `CRON_SECRET` | server only | for e-mail dispatch | Bearer secret of `/api/notifications/dispatch` |
| `EMAIL_PROVIDER` | server only | no | `disabled` (default), `console` (dev only: logs a redacted summary), `resend` |
| `EMAIL_FROM` | server only | with `resend` | e.g. `AutoBridge DZ <no-reply@your-domain>` |
| `RESEND_API_KEY` | server only | with `resend` | |

---

## Database, migrations and demo data

Migrations live in `supabase/migrations` and are applied in order:

1. `foundation`: profiles, roles, audit log, notifications, internal notes, reference/content tables, contact and data requests
2. `suppliers_partners`: business profiles, verification documents and records, public projections, approval RPCs
3. `vehicles`: listings, images, favorites, reports, the public `marketplace_vehicles` view, moderation RPCs
4. `requests_quotations`: purchase requests, status history and transition rules, milestones, quotations, partner service requests
5. `costs_storage_privacy`: exchange rates, versioned cost rules, saved estimates, storage buckets and policies, PII scrubbing, admin helpers
6. `reference_data`: currencies, makes, service categories, acquisition pathways (all requiring legal review), settings, FAQ, legal-document templates, rule set v1 (all costs "on quotation")
7. `marketplace_price_dzd`: indicative DZD price for filtering, from documented rates only

The reference data contains **no** invented tax rate, price or contact detail.

### Demo data

`pnpm seed:demo` creates **fictional** data for local development only. It refuses to run against
a non-local project unless `--allow-remote` is passed.

- Accounts `admin|staff|customer|supplier1-3|partner1-2|applicant.demo@example.com`, password `DemoPass2026`
- 3 suppliers and 2 partners named "Démo — … (fictif)", flagged `is_demo`. They have **no**
  verification records, so they are never presented as verified.
- 15 listings (13 published, 1 pending review, 1 draft) with illustrative Unsplash photos that are
  labelled as not showing the actual vehicle. Demo pages carry a banner and are `noindex`.
- Illustrative exchange rates and a demo cost rule set, both labelled "DÉMO … ni officielle ni de marché".

`pnpm seed:reset` removes demo rows only (matched by `is_demo` and the demo e-mail domain) and
reactivates the most recent non-demo cost rule set. To start completely fresh locally:
`pnpm db:reset` (drops everything, including non-demo data).

---

## Creating the first administrator

No default administrator or password exists in any environment.

1. Sign up on the site with the future administrator's e-mail and confirm the address.
2. From a trusted machine with the production `SUPABASE_SERVICE_ROLE_KEY`:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co \
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
   pnpm admin:grant admin@your-company.dz admin
   ```

   The script refuses unconfirmed accounts and records an audit entry. Alternatively, run
   `insert into public.user_roles (user_id, role) select id, 'admin' from public.profiles where email = '…';`
   in the Supabase SQL editor.
3. Further staff and administrators are managed from `/admin/users`. The last administrator can never be removed.

---

## Authentication and e-mail

**Supabase Auth** handles accounts and sends its own e-mails. In the Supabase dashboard:

- *Authentication → URL Configuration*: set **Site URL** to `NEXT_PUBLIC_SITE_URL` and add
  `https://<your-domain>/**` to the redirect allow-list.
- *Authentication → Providers → Email*: enable **Confirm email**. Set the minimum password length
  to 8 with letters and digits (matches `supabase/config.toml`).
- *Authentication → Emails → SMTP Settings*: configure a real SMTP provider. The built-in sender is
  rate-limited and not meant for production.
- *Authentication → Emails → Templates*: paste `supabase/templates/confirmation.html` (Confirm signup)
  and `supabase/templates/recovery.html` (Reset password). Both are bilingual and link to
  `{{ .SiteURL }}/auth/confirm?token_hash=…`, which verifies the token on the server.

Locally, `supabase/config.toml` already applies all of the above (Mailpit receives the messages).

**Notification e-mails** (status changes, quotations, approvals…) are produced by the database as
in-app notifications. `POST /api/notifications/dispatch` e-mails pending notifications to users who
opted in, in their preferred language, then stamps them. Schedule it every few minutes, e.g. with
Vercel Cron or any scheduler:

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<your-domain>/api/notifications/dispatch
```

Set `EMAIL_PROVIDER=resend`, `RESEND_API_KEY` and `EMAIL_FROM` (verified sender domain) to send.
Without credentials the dispatcher skips sending and in-app notifications still work.
WhatsApp is **not** integrated. The "WhatsApp" contact preference is a manual follow-up by staff.

---

## Tests

| Suite | Count | Covers |
|---|---|---|
| `pnpm test` (Vitest) | 59 | Cost calculator (currencies, pivots, missing rates/inputs, confidence), transition rules (and an automatic check that the TypeScript mirror equals the SQL table), validation schemas, filter parsing, open-redirect protection, Arabic/French catalogue parity |
| `pnpm test:db` (Vitest, real Supabase) | 31 | Unpublished listings hidden from the public; cross-customer isolation; suppliers cannot edit others' listings or self-publish; only admins approve suppliers; status transitions enforced in the database; legal review gate; full quotation workflow; fee-line integrity; disabled pathways; storage access (private documents, foreign folders, file types); admin-only configuration; immutable rule versions; marketplace search, filters, sorting and pagination |
| `pnpm test:e2e` (Playwright) | 48 | Arabic RTL / French LTR, language switcher, Latin digits, no horizontal overflow on mobile (both languages), filters/sorting/empty states, detail page disclosures, form validation messages, sign-up with e-mail confirmation and password recovery through Mailpit, access control, the cross-role workflow (customer → staff → supplier → staff → customer → legal review), listing creation with photo upload and moderation, document upload, partner application and approval, every portal page in both languages |

Running the e2e suite: `pnpm db:reset && pnpm seed:demo && pnpm build`, then `pnpm test:e2e`
(starts `pnpm start` automatically if nothing is listening on port 3000).

---

## Deployment

1. **Supabase project**: create a project (EU region recommended), then from this directory
   `pnpm exec supabase link --project-ref <ref>` and `pnpm exec supabase db push` to apply the
   migrations. Do **not** run the demo seed in production. Configure Auth as described above.
2. **Next.js hosting**: Vercel or any Node.js 20+ host. Set the environment variables above, the root
   directory to `autobridge`, and build with `pnpm build`, start with `pnpm start`.
3. **Scheduler**: call `/api/notifications/dispatch` periodically with the `CRON_SECRET` bearer token.
   Optionally call it, or use pg_cron, for `admin_archive_expired_listings()` (also available as a button in `/admin`).
4. **First administrator**: see above. Then fill `/admin/content` (real contact details), `/admin/costs`
   (documented exchange rates and verified cost rules), `/admin/pathways` (after legal review) and
   publish reviewed legal documents.
5. Backups: enable Supabase point-in-time recovery. Storage bucket `verification-docs` is private.

---

## Feature status

**Working end to end (tested locally against Supabase)**: everything listed under
[What is built](#what-is-built), including authentication with e-mail confirmation and password
recovery (through local SMTP), storage uploads, notifications in-app, and the full request →
quotation → acceptance → legal review → progress lifecycle.

**Requires external credentials or configuration**:

- Production SMTP for Supabase Auth e-mails (confirmation and recovery do not reach real inboxes without it).
- `RESEND_API_KEY` + verified sender for notification e-mails (`EMAIL_PROVIDER=resend`).
- A scheduler for `/api/notifications/dispatch`.
- Real contact details, exchange rates and cost rules entered by an administrator.

**Requires legal review before commercial launch**:

- Terms of use, privacy policy (Law 18-07 on personal data) and intermediary disclosure: the
  published versions are clearly marked templates.
- The descriptions and enablement of each acquisition pathway (individual used-vehicle import,
  new vehicle, change of residence). No eligibility rule (vehicle age, engine type, frequency) is
  encoded; eligibility is assessed case by case through the mandatory legal-review step.
- Any customs, tax or fee rule before it is marked "verified" in `/admin/costs`.
- The business model elements (commissions, subscriptions, paid promotions) before activation.

**Intentionally not implemented**: online payments, collection of vehicle funds or transfers,
WhatsApp API, scraping of third-party marketplaces, automatic supplier approval, synchronized
external inventory. The listing model is ready for a future authorized supplier feed (listings
carry a supplier, review status and freshness), but no feed exists.

---

## Known limitations

- Demo photos come from `images.unsplash.com`. If that host is unreachable, a neutral placeholder is shown.
- The DZD price filter and sort use the latest documented rate. Listings in a currency without a
  documented rate are excluded from price filtering (by design: no invented conversion).
- Keyword search uses a trigram-indexed substring match (make, model, trim, body, fuel, city, colour).
  It is not full-text ranked.
- Account deletion is a request handled by an administrator (`/admin/users`), not self-service,
  so that retained transaction records can be anonymized first (see `docs/DATA_RETENTION.md`).
- Rate limits are enforced in the database (contact form, purchase requests, listing reports) and by
  Supabase Auth for authentication endpoints. There is no IP-level rate limiting at the edge;
  add it at the hosting layer (e.g. Vercel firewall) for production.
- Supplier subscriptions and paid promotions are modelled (promotion window, "Sponsored" label) but no
  payment provider is connected. Promotions are set manually by an administrator.
- After a failed submission, the small inline admin forms (reason fields) do not keep their typed
  text. The main forms (requests, listings, profiles, applications, sign-up) do.
