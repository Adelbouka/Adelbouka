<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project notes (AutoBridge DZ)

- Stack: Next.js 16 App Router (`cacheComponents` off), next-intl (`messages/{ar,fr}/<namespace>.json`), Supabase (RLS is the authority), Zod, React Hook Form.
- Every user-facing query runs under the user's session (`src/lib/supabase/server.ts`). Do not use the service-role client (`src/lib/supabase/admin.ts`) for user requests.
- State changes go through SECURITY DEFINER RPCs in `supabase/migrations`. If you change request transitions, update both `private.request_transition_allowed` and `src/lib/domain/request-status.ts` (a unit test compares them).
- Add translation keys to both `messages/ar` and `messages/fr` (a unit test checks parity; TypeScript checks keys against French).
- Checks: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:db` (local Supabase), `pnpm test:e2e` (after `pnpm db:reset && pnpm seed:demo && pnpm build`).
