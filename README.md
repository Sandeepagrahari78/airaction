# AirAction

A private, working demonstration application for coordinated air-pollution response in India: **report → triage → approve → assign → act → verify → reopen**.

This release has durable data, server-enforced workflow rules and file storage. It is a product demonstrator, not a government-authorised enforcement system or evidence of an environmental improvement.

## Working features

- Dashboard derived from saved records, with overdue actions and verification queues.
- Incident registration, source hypothesis, location, priority and optional coordinates.
- Search, filters, related-case hints and eight draft source-specific response playbooks.
- Approval, team assignment, deadlines and field-operation stages.
- Field notes and private JPEG, PNG and PDF attachments with checksums.
- Review, rejection, rework and reopening; rework requires fresh evidence.
- Persistent audit history and complete structured JSON exports.
- CSV monitoring imports with validation, provenance, timestamps, units, averaging periods and duplicate suppression.
- Separate sample and imported observation views; charts display concentrations, not calculated AQI.
- Operational outcome metrics without claims of avoided deaths or air-quality improvement.
- Responsive navigation and forms, keyboard-operable Radix controls and reduced-motion handling.

## Demonstrate the workflow

1. Select **Coordinator** under **Demo role**. Register and open an incident.
2. Triage it, record an approval reason, approve the response and assign a team with a future deadline.
3. Select **Field team**, start work and save a field record, optionally with an attachment.
4. Enter a completion summary and request verification.
5. Select **Verifier**, inspect the evidence and record a finding. Verify and close, or return for rework.
6. Reopen a closed case to demonstrate recurrence. A fresh record is required before resubmission.
7. Open **Audit trail** and export the workspace to inspect its history.

All workflow roles are simulated by the same signed-in user for testing. They are NOT independent authenticated staff identities. Eight sample cases and synthetic readings are inserted once per user's private workspace. User-created cases and imported observations are labelled separately. No live government feed is connected.

## Architecture

| Layer | Implementation |
| --- | --- |
| Interface | React 19, TypeScript, Tailwind, Radix/shadcn primitives |
| Application | Vinext App Router APIs on a Cloudflare Worker |
| Records | Cloudflare D1 / SQLite; Drizzle migrations |
| Evidence files | R2, downloaded only through ownership-checked APIs |
| Identity | Sites authenticated-user headers; per-user workspace scope |
| Workflow | Central rules, validation, optimistic versions, transactional state/audit writes |

The blueprint's suggested React/Python/PostgreSQL stack was adapted to the hosting platform. This release needs no Python or separate database server. PostGIS and organisation models can be introduced for shared jurisdictional spatial queries.

## Source layout

- `components/airaction.tsx`: operational views, forms and charts.
- `app/globals.css`: theme and responsive layouts.
- `lib/domain.ts`: types, source categories, playbooks and transition rules.
- `lib/server.ts`: identity, request limits, validation, data access and transitions.
- `lib/seed.ts`: explicitly synthetic records.
- `app/api/*`: workspace, incident, evidence, observation and export endpoints.
- `db/schema.ts` and `drizzle/`: schema and migrations.
- `tests/domain.test.mjs`: state-machine checks.
- `tests/api.test.mjs`: integration checks using a local Worker runtime, D1 and R2.

## Run in VS Code

Use Node.js **22.13 or later** and pnpm **11.25.0**. Open the source folder. Preserve `pnpm-lock.yaml`.

Install dependencies:

```sh
npx --yes pnpm@11.25.0 install --frozen-lockfile
```

Build once to generate local database configuration:

```sh
npm run build
```

Apply the initial migration to the LOCAL database:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_real_polaris.sql
```

Start development:

```sh
npm run dev
```

Use the URL printed in the terminal. A clean checkout uses the portable profile on port 5173. Local development has a development-only identity fallback; production requires the hosting platform's authenticated-user header. Do not expose a development server publicly.

The initial migration is a **one-time** setup step. Generate and inspect NEW migrations for later schema changes; do not replay initial SQL or rewrite applied migrations. No external API key is needed for this demonstration. D1 and R2 logical bindings are in `.openai/hosting.json`; the hosting platform manages production resources.

## Verification

```sh
node node_modules/typescript/bin/tsc --noEmit
node --test tests/domain.test.mjs
node tests/api.test.mjs
npm run build
```

Checks performed:

- TypeScript compile check.
- Four domain tests: lifecycle, invalid transitions, role separation and overdue calculation.
- 33 API checks: identity, cross-origin writes, roles, validation, duplicate creation, workspace isolation, invalid transitions, stale updates, evidence requirements, R2 upload/download, review/reopening, concurrent writes, observation validation, deduplication and audit export.
- Worker-compatible application build.

Browser visual and interactive QA was unavailable in the build environment. Responsive styles and accessible controls are implemented, but desktop, mobile, keyboard and enlarged-text acceptance still need browser review. The optional WebMCP registry-navigation tool is feature-detected; it could not be validated in a supported browser and is not needed to use the app.

## API contracts

Writes require same-origin access, authenticated identity, `x-airaction-request: 1` and a valid `x-demo-role`. The latter selects a DEMONSTRATION persona, not a production staff role.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/workspace` | Load workspace; initialize samples once |
| POST | `/api/cases` | Register a case with a caller-generated UUID |
| PATCH | `/api/cases/:id` | Apply a transition with the current version |
| POST | `/api/evidence` | Multipart note and optional attachment |
| GET | `/api/evidence/:id` | Download an owned attachment |
| POST | `/api/observations` | Validate/import up to 200 records |
| GET | `/api/export` | Export complete structured workspace |

Errors: 400 invalid input; 401 missing identity; 403 wrong role/origin or invalid transition; 404 inaccessible record; 409 stale version; 413 oversized request; 503 unavailable storage. Forms preserve input after save failures. The UI loads the latest 500 events and 1,000 observations; exports include all structured records.

CSV columns: `station,pollutant,value,unit,observed_at,provider,averaging`. Pollutants: PM2.5, PM10, NO2, O3, SO2. Unit: `µg/m³`. Timestamps: ISO 8601 UTC. Imports remain unverified. No AQI conversion or source-percentage inference is performed.

## Before a government pilot

1. Add approved municipal/SPCB memberships, jurisdiction scope and distinct authenticated executor/verifier accounts. Disable persona switching in operational workspaces.
2. Obtain authorised feed agreements; implement provider-specific quality/correction handling and missing-data rules.
3. Approve local playbooks, service capacity and escalations. Add field offline sync, reassignment and reservations where required.
4. Define evidence retention/consent, malware scanning, metadata handling, backup/restore tests and access reviews. The audit is append-only through the app, not tamper-proof against database administrators.
5. Add telemetry, rate limits, pagination, load tests and support. No 5,000-user capacity claim has been tested here.
6. Agree an independent evaluation protocol with baseline/comparison areas and weather adjustment. Closures alone cannot establish ambient impact.

Next milestone: one municipality, two operational source categories, real staff membership and a measured pilot.
