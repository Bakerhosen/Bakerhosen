# Roundtable

A mobile-first Next.js App Router + TypeScript MVP with Supabase Postgres. No accounts, Maps API, or place fetching. This is local-only; nothing has been deployed.

## Run locally

Requires Node.js 20.9+ (Node 24 recommended) and npm.

1. Create a Supabase project at https://supabase.com/dashboard. Wait for the database to finish provisioning.
2. Open **SQL Editor → New query**, paste the entire `supabase/migrations/001_roundtable.sql` file, and run it once against a new project. This creates the three tables, constraints, and RLS protections.
3. In **Connect → Transaction pooler**, select the Postgres connection URI. Copy it into `.env.local` as `DATABASE_URL`. Use the database password, URL-encoded if it contains special characters. The project reference is part of the pooler username. The connection must have the trusted `postgres` role; never use this URI in a browser.
4. From this directory:

   ```sh
   cp .env.example .env.local
   # Edit .env.local and replace the placeholder URI.
   npm ci
   npm run dev
   ```

5. Visit http://localhost:3000. Create a plan and save the private organizer link. Share the separately labeled **group link**. Organizer authorization is in the URL fragment, which is not sent as a page URL or Referer; the app passes it in a dedicated server request header. Do not share the private link.

No `NEXT_PUBLIC_*` variables, anon key, or service-role API key are needed. The connection uses TLS and disables prepared statements for Supabase transaction pooling. `.env*` is ignored except `.env.example`.

## Checks

```sh
npm run lint
npm run typecheck
npm run test:validation # Node 22.6+ for native TypeScript stripping
npm run build
npm start
```

Production cookies require HTTPS (localhost is treated as secure by modern browsers). Use `npm run dev` for ordinary local HTTP testing.

### Automated API flow

With the configured app running, use a **disposable Supabase project**:

```sh
npm run test:flow
# Or: TEST_BASE_URL=http://localhost:3000 npm run test:flow
```

This uses two independent cookie jars and checks creation, suggestions, changing a vote without increasing totals, missing/incorrect organizer authorization, cross-plan option rejection, confirmation visibility, closed votes/suggestions, and concurrent confirmation/write requests. It creates three plans and prints their IDs; no cleanup occurs automatically. It is an HTTP integration test, not a browser test.

### Two-browser acceptance test

1. Open a normal browser window; create “Friday Night”. Verify two distinct links and copy feedback. Keep the organizer link private.
2. Open the group link in an incognito window or another browser profile. Add two future Vienna place/time options, optionally with an HTTPS Google Maps URL. Test invalid inputs as well.
3. Enter a nickname, vote, then vote for the other option. Total votes must remain one; refresh and verify the selected vote persists. Normal and incognito must have separate participant cookies.
4. In the group window verify that confirmation controls are absent. The automated API test additionally verifies that directly calling confirmation without the secret returns 403.
5. In the organizer window choose either option and press **Confirm plan** in the confirmation prompt. Both windows must show the same final place, Vienna date/time, and Maps link within five seconds (or refresh).
6. Verify adding/voting controls disappear; the API test verifies late writes return 409. Test native sharing on a supported mobile device; copy and selectable URL remain available as fallback.

To verify direct table protection, use the Supabase Data API with the public anon key (never the database credential): GET `/rest/v1/plans?select=*` and POST to each table must fail with permission denied. Repeat with an ordinary authenticated user token. No table policies grant either role access.

## Data and access design

- `plans`: 128-bit random group IDs, title, SHA-256 hash of an independent 256-bit organizer secret, confirmed option, creation time. The raw organizer secret is returned once at creation. Group payloads contain neither the secret nor its hash.
- `options`: place, timestamp, optional validated HTTPS Google Maps URL. Input and display use Europe/Vienna including DST. Nonexistent or ambiguous clock-change times are rejected.
- `votes`: nickname, server-issued anonymous UUID, option, plan. A `(plan_id, participant_id)` primary key enforces one vote per browser per plan; an upsert changes that vote. Clearing cookies or using another browser creates a new identity; this is not an anti-abuse identity system.
- Compound foreign keys ensure both voted and confirmed options belong to the plan.
- Every option/vote/confirmation write acquires the same plan row lock inside a transaction, checks closure, and then writes. Concurrent operations serialize: a write either completes before confirmation or is rejected after it. Confirmation cannot be changed.
- Organizer checks happen on the server with a constant-time hash comparison. Reads explicitly construct public payloads; GET uses a consistent database snapshot. Polling every five seconds keeps open clients current.
- Database code is marked `server-only`. RLS is enabled and `anon`/`authenticated` privileges are revoked. Server endpoints enforce same-origin mutation requests. No third-party scripts or external fonts are loaded.

## Verification status in this build

No Supabase credentials were supplied. Lint, type checking, the production build, and input/Maps validation tests passed. The migration and `tests/schema.sql` also passed against disposable PostgreSQL 17, verifying vote uniqueness/upserts, cross-plan foreign keys, and denied anonymous/authenticated table access. This is local Postgres evidence, not a live Supabase test. To rerun schema checks against a disposable configured database: `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/schema.sql`. Database connectivity, migration execution against Supabase, the live API flow (including races and RLS), two-browser UI behavior, and device native sharing require the configuration and tests above. The managed environment has no available browser-control runtime, so browser QA was not run. No in-memory fallback hides missing configuration: the interface reports that Supabase needs connecting.

Accounts, recommendations, bookings, payments, and notifications are intentionally outside this MVP.
