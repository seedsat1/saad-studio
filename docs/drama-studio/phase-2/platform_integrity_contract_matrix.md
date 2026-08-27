# Phase 2.0 - Platform Integrity Remediation

## Gate P0-A - Evidence and Contract Extraction

Status: P0-A only. This document extracts evidence and proposes decisions before any Prisma, migration, API, jobs, agent memory, Drama Studio backend, Drama Studio UI, Gate C.2, SVG, or live database change.

## Executive Verdict

[BLOCKED FOR MIGRATION] Do not start Gate P0-B implementation, Prisma edits, or migration work yet. The platform integrity contracts are not fully aligned:

- `ApiIdempotency` is code-referenced but absent from Prisma, searched SQL migrations, and live DB. Current helper can silently return `kind: "none"`, so idempotent protection is not structurally guaranteed.
- `CreditLedgerEntry` is code-referenced and exists in `full_schema_init.sql`, but it is absent from Prisma and absent from live DB. It is currently best-effort and optional, so financial audit linkage is not guaranteed.
- `AdminTransaction` exists in Prisma, SQL, and live DB, but Prisma has operator/decision fields that live DB does not have. Existing admin routes currently do not persist those fields during approval/rejection, while the list route attempts to expose them.
- `Generation`, `ProviderUsageRecord`, and `GenerationRequestSnapshot` are reusable platform contracts for generation history and provider economics, but they do not replace ledger or idempotency.

Recommended next step after review: Gate P0-B ADR only. P0-C code/migration work remains blocked until ownership of `ApiIdempotency` and `CreditLedgerEntry`, retry semantics, ledger linkage, and AdminTransaction drift are explicitly approved.

## Execution Snapshot

Branch before dedicated branch creation: `main`.

Dedicated branch: `codex/phase-2-platform-integrity-p0a`.

Initial git status before branch creation:

```text
 M .gitignore
 M adobe/saadstudio-cep/client/src/pages/ai-copilot.ts
 M adobe/saadstudio-cep/jsx/index.jsx
 D app/favicon.ico
 M app/layout.tsx
 M components/TopNavbar.tsx
 M components/admin/AdminSidebar.tsx
 M components/sidebar.tsx
 M docs/saad-studio-premiere-reference-ar.md
 M lib/navigation.ts
 M package-lock.json
 M package.json
 M prisma/schema.prisma
 m seedsat1/saad-studio
?? app/(dash)/(routes)/drama-studio/
?? app/admin/voice-agent/
?? app/api/voice-agent/
?? components/voice-agent/
?? docs/drama-studio/
?? lib/voice-agent/
?? prisma/migrations/manual/2026-08-25-voice-agent.sql
?? scratchpad/
?? scripts/generate-voice-samples.ts
?? scripts/test-sara-general.ts
?? scripts/test-voice-agent-google.ts
?? test/voice-agent-core.test.ts
```

Current branch during extraction: `codex/phase-2-platform-integrity-p0a`.

DB target used as evidence source: live metadata captured in `docs/drama-studio/phase-2/phase_2_db_verification.md`; database `neondb`, schema `public`, PostgreSQL `17.11`, with `transaction_read_only = on`. No live DB writes were performed in P0-A.

Path correction: requested `docs/drama-studio/phase-1/phase_1_architecture_v3.md` was not found at that path; actual repository path is `docs/drama-studio/phase_1_architecture_v3.md`.

## Evidence Sources

- Canonical/reference docs: `docs/drama-studio/reference/reference_manifest.md`, `docs/drama-studio/reference/drama_studio_complete_reference.md`, `docs/drama-studio/reference/phase_0_gap_analysis.md`, `docs/drama-studio/reference/phase_0_1_corrections.md`, `docs/drama-studio/reference/phase_1_review.md`.
- Phase 2 docs: `docs/drama-studio/phase-2/phase_2_entry_verification.md`, `docs/drama-studio/phase-2/phase_2_db_verification.md`.
- Phase 1 architecture: `docs/drama-studio/phase_1_architecture_v3.md`.
- Design docs: `docs/drama-studio/design/gate-b/gate_b_wireframes.md`, `docs/drama-studio/design/gate-c/*`.
- Platform code: `lib/idempotency.ts`, `lib/credit-ledger.ts`, `lib/admin/history-read-model.ts`.
- Admin routes: `app/api/admin/generations/[id]/route.ts`, `app/api/admin/transactions/route.ts`, `app/api/admin/transactions/[id]/route.ts`, `app/api/admin/users/[userId]/route.ts`.
- Schema/SQL: `prisma/schema.prisma`, `prisma/full_schema_init.sql`, searched `prisma/**/*.sql`.

## Contract Matrix

| Table / contract | Fields code expects | Fields SQL has | Fields Live DB has | Constraints / indexes | Consumers | Diff type | Proposed decision | Evidence |
|---|---|---|---|---|---|---|---|---|
| `ApiIdempotency` | `userId`, `route`, `key`, `requestHash`, nullable `generationId`, nullable `responseStatus`, nullable `responseJson`; compound accessor `userId_route_key`; header `idempotency-key` capped at 200 chars; states `none`, `created`, `in_progress`, `replay` | Not found in searched SQL | Not found in live DB | Code requires unique compound key by `userId + route + key`; no proven TTL, expiry, status column, or failure column | `app/api/3d/route.ts`, `app/api/music/route.ts`, `app/api/video/route.ts`, `app/api/generate/audio/route.ts` | [MISSING] code contract without physical table | Gate P0-B must decide physical ownership. If approved, create platform-owned Prisma model and migration matching proven fields only. Retry/failure expiration is [غير محسوم] and must be decided before implementation. | `lib/idempotency.ts:5-6`, `:31-50`, `:73-78`, `:122-145`; consumers from `rg` at `app/api/3d/route.ts:11`, `app/api/music/route.ts:10`, `app/api/video/route.ts:19`, `app/api/generate/audio/route.ts:8`; DB evidence `phase_2_db_verification.md:39`, `:59`, `:74`, `:118-124`, `:247`, `:287` |
| `CreditLedgerEntry` | `userId`, nullable `generationId`, `delta`, `reason`; read model expects `id`, `userId`, nullable `generationId`, `delta`, `reason`, `createdAt`; generation detail expects `id`, `delta`, `reason`, `createdAt`; code writes best-effort only when `tx.creditLedgerEntry?.create` exists | `id`, `userId`, nullable `generationId`, `delta`, `reason`, `createdAt` | Not found in live DB | SQL indexes: `userId`, `createdAt`, `generationId`; FK `userId -> User` cascade; FK `generationId -> Generation` set null. No proven unique idempotency linkage, no reservation/settlement relation, no operation id | `lib/credit-ledger.ts`, `lib/admin/history-read-model.ts`, `app/api/admin/generations/[id]/route.ts`, `app/api/admin/users/[userId]/route.ts`, `app/api/admin/transactions/[id]/route.ts` | [MIGRATION ONLY] + [LIVE MISSING] + [PRISMA MISSING] | Gate P0-B must decide whether this becomes the platform ledger table. If approved, Prisma/migration should match the proven `delta/reason` contract first. Reservation, settlement, reversal origin, idempotency linkage, job linkage, and admin audit metadata are [غير محسوم] because current code does not persist them. | `lib/credit-ledger.ts:93-109`, `:117`, `:732-736`, `:839-842`, `:890-893`, `:1077-1081`; `lib/admin/history-read-model.ts:134-140`, `:268-282`, `:433-438`, `:519`, `:541`; `app/api/admin/generations/[id]/route.ts:121-132`; `app/api/admin/users/[userId]/route.ts:35-45`, `:274-276`; `app/api/admin/transactions/[id]/route.ts:91-101`, `:189-215`; SQL `prisma/full_schema_init.sql:53-63`; DB evidence `phase_2_db_verification.md:14`, `:38`, `:58`, `:99-107`, `:246`, `:286` |
| `AdminTransaction` | Prisma model expects `id`, `userId`, `plan`, `amount`, `credits`, `paymentStatus`, nullable `operatorUserId`, nullable `operatorEmail`, nullable `decisionAt`, nullable `decisionReason`, `createdAt`; admin list exposes operator/decision fields by unsafe cast; status route resolves operator but does not write these fields in the proven update paths | `id`, `userId`, `plan`, `amount`, `credits`, `paymentStatus`, `createdAt` | `id`, `userId`, `plan`, `amount`, `credits`, `paymentStatus`, `createdAt` | Prisma and SQL indexes: `userId`, `paymentStatus`; live: primary key, FK `userId -> User` cascade, indexes `AdminTransaction_userId_idx`, `AdminTransaction_paymentStatus_idx` | `app/api/admin/transactions/route.ts`, `app/api/admin/transactions/[id]/route.ts`, admin UI `app/admin/transactions/page.tsx`, storage lifecycle reference | [SCHEMA DRIFT] Prisma wider than SQL/live | Gate P0-B must decide whether operator/decision fields are real audit requirements. If yes, add nullable columns by safe migration with no guessed backfill. If no, keep or deprecate through ADR before Prisma changes. Current evidence says they are displayed but not reliably persisted. | `prisma/schema.prisma:170-185`; SQL `prisma/full_schema_init.sql:81-91`; route reads `app/api/admin/transactions/route.ts:55-84`; operator resolution `app/api/admin/transactions/[id]/route.ts:22-35`; writes only `paymentStatus` at `app/api/admin/transactions/[id]/route.ts:140-143`, `:314-317`; DB evidence `phase_2_db_verification.md:12`, `:40`, `:60`, `:141-156`, `:248`, `:290` |
| `Generation` | Generation lifecycle expects `id`, `userId`, `prompt`, media/output URLs, `assetType`, `modelUsed`, `cost`, status/type, provider fields, duration/resolution/aspect/quality, favorite/poster fields, relations to provider usage and request snapshot | Created in SQL with base fields; additional SQL alters output/status/type/poster/favorite across migration files | Exists live with generation and provider tracking columns | Prisma indexes: `userId`, `createdAt`, `isFavorite`, `posterStatus`; live includes generation row counts and provider tracking columns | `lib/credit-ledger.ts`, admin history/detail routes, generation APIs | [REUSE] but [NOT LEDGER] and [NOT IDEMPOTENCY] | Reuse for actual generation records and Drama execution linkage later. Do not use it to replace ledger or idempotency. Drama hierarchy linkage remains a future adapter/ADR, not P0-A implementation. | `prisma/schema.prisma:77-115`; `lib/credit-ledger.ts:650-736`, `:927-1045`; `phase_2_db_verification.md:10`, `:61`, `:164-182`; `phase_2_entry_verification.md:119` |
| `ProviderUsageRecord` | Provider economics expects `userId`, nullable `generationId`, provider/model/request id, provider cost/tokens/credits/source, duration/resolution/quality/aspect/status/raw payload, timestamps | No searched SQL creation hit | Exists live with all expected fields from Prisma | Prisma indexes: `userId`, `generationId`, `providerRequestId`, `createdAt`; live has matching named indexes and FK relations | `lib/credit-ledger.ts`, `lib/admin/history-read-model.ts`, `app/api/admin/generations/[id]/route.ts` | [LIVE + PRISMA] but [SQL HISTORY GAP] | Reuse for provider economics. Do not duplicate in Drama job/ledger. Migration history gap should be documented, but it is not a blocker for P0-A because live and Prisma align. | `prisma/schema.prisma:118-144`; `lib/credit-ledger.ts:711-730`, `:791-810`, `:927-1045`, `:1351-1462`; `lib/admin/history-read-model.ts:367-370`, `:449-451`, `:516`; DB evidence `phase_2_db_verification.md:42`, `:62`, `:186-201`, `:250`, `:264`; `phase_2_entry_verification.md:120` |
| `GenerationRequestSnapshot` | Request snapshot expects unique `generationId`, `userId`, provider/model/generationType/duration/resolution/aspect/quality/mode/inputType, `userCreditsCharged`, `estimatedProviderCostUsd`, `requestPayload`, `createdAt` | No searched SQL creation hit | Exists live with expected fields | Prisma: unique `generationId`, index `generationId`, FK cascade to `Generation`; live has unique generation index and generation FK | `lib/credit-ledger.ts`, `lib/admin/history-read-model.ts`, `app/api/admin/generations/[id]/route.ts` | [LIVE + PRISMA] but [SQL HISTORY GAP] | Reuse for request metadata. Not sufficient for Drama memory, quote lifecycle, block/take linkage, or idempotency/ledger linkage. | `prisma/schema.prisma:146-165`; `lib/credit-ledger.ts:500-634`, `:730`, `:810`; `lib/admin/history-read-model.ts:370-382`; DB evidence `phase_2_db_verification.md:43`, `:63`, `:250`, `:266`; `phase_2_entry_verification.md:121` |
| `CinemaJob` | Existing job shape expects `projectId`, `shotId`, `userId`, `status`, nullable `taskId`, `modelRoute`, `creditsCost`, nullable `error`, nullable `resultUrl`, `payload`, timestamps | Exists in `cinema_manual_init.sql` and `full_schema_init.sql` | Exists live with zero rows | Prisma indexes: `projectId+createdAt`, `shotId+createdAt`, `userId+createdAt`; FK to `CinemaProject` | Cinema prototype/project systems; Phase docs cite it as partial job evidence | [REUSE CANDIDATE] but [NOT PROVEN PRODUCTION USAGE] | Keep as evidence for future Drama job ADR. Do not generalize or mutate it in P0-A. Do not duplicate ledger, idempotency, or admin history. | `prisma/schema.prisma:438-455`; SQL `prisma/cinema_manual_init.sql:80`, `prisma/full_schema_init.sql:222`; DB evidence `phase_2_db_verification.md:10`, `:68`, `:84`, `:256`, `:268`, `:295`; `phase_2_entry_verification.md:298` |

## Lifecycle Extraction

### Idempotency lifecycle

- Key extraction: reads `idempotency-key`, trims it, returns null when absent/blank, truncates above 200 characters.
- Begin: if no key or no client, returns `kind: "none"`.
- Existing record: mismatched `requestHash` throws conflict; completed record returns `replay`; incomplete record returns `in_progress`.
- Create: writes `userId`, `route`, `key`, `requestHash`.
- Race: catches `P2002`, re-reads by `userId_route_key`.
- Attach generation: updates `generationId`.
- Complete: updates `generationId`, `responseStatus`, `responseJson`.
- Failure/retry: [غير محسوم]. Code can complete failures as responses in consumers, but no dedicated failure state, retry window, expiry, or cleanup contract is physically proven.

### Credit lifecycle

- Generation charge: `spendCredits` creates `Generation`, `ProviderUsageRecord`, `GenerationRequestSnapshot`, then attempts ledger `delta = -credits`, `reason = generation_charge`.
- Free generation: creates generation/provider/snapshot with zero charged credits, no ledger entry.
- Refunds: `refundCreditsWithReason`, `refundGenerationCharge`, and `rollbackGenerationCharge` increment user credits and attempt positive ledger entries with refund reasons.
- Subscription/topup/admin grants: allocate or increment credits and attempt positive ledger entries with grant/admin reasons.
- Reservation/settlement/reversal origin: [غير محسوم]. Current proven code uses direct charge/refund deltas, not a formal reserved -> charged -> settled lifecycle.
- Idempotency linkage: [غير محسوم]. Current ledger writes do not persist `idempotencyKey`, `route`, `operationId`, or original ledger entry id.

### Admin lifecycle

- AdminTransaction approval/rejection uses compare-and-swap on `paymentStatus = PENDING`.
- Operator identity is resolved in code, but proven update paths do not persist `operatorUserId`, `operatorEmail`, `decisionAt`, or `decisionReason`.
- Admin list route exposes these fields by casting transaction rows to `any`, so it tolerates absence but does not prove persistence.
- Generation history/detail routes read ledger by raw SQL and fall back silently to empty ledger arrays if the table is absent.

## Unresolved Source-of-Truth Items

- `ApiIdempotency` physical source of truth: [غير محسوم].
- `CreditLedgerEntry` physical source of truth: [غير محسوم].
- Whether `CreditLedgerEntry` must remain best-effort or become required platform finance infrastructure: [غير محسوم].
- Whether ledger must include reservation, settlement, reversal origin, idempotency linkage, `jobId`, and `projectId`: [غير محسوم]; desired by platform audit goals but not currently persisted by the inspected contract.
- Whether `AdminTransaction` operator/decision fields are required audit fields or stale Prisma/UI intent: [غير محسوم].
- Whether failure records in idempotency should allow retry by expiry, explicit failed state, or replacement policy: [غير محسوم].
- Shadow/Staging DB availability for future migration dry run: [غير محسوم].

## Proposed Gate P0-B Decisions

1. Decide `ApiIdempotency` ownership and exact schema from the proven helper contract.
2. Decide `CreditLedgerEntry` ownership and whether it becomes a required Prisma model.
3. Decide whether ledger extensions for idempotency/job/project/original-entry linkage are approved now or deferred.
4. Decide AdminTransaction operator/decision compatibility strategy: add nullable live columns, keep as future intent, or deprecate via ADR.
5. Decide how admin history should behave when financial observability tables are absent: fail loud for admin, degrade with explicit warning, or block financial operations.
6. Decide retry/expiration semantics before any unique constraint or migration is written.

## FLUX 3 Deferred Item

FLUX 3 is explicitly deferred from Platform Integrity Remediation. It must later pass through `Knowledge Hub -> Extraction -> Admin Review -> Model Registry -> Routing/Pricing -> Drama Adapter`. No model name, duration, resolution, audio capability, Arabic capability, or price is hardcoded here.

## Confirmations

- No Prisma schema was edited.
- No migration was created.
- No API, job, agent memory, Drama Studio backend, Drama Studio UI, Hero, Workbench, Gate C.2, design file, or SVG was modified.
- No live DB write was performed.
- `full_schema_init.sql` was not executed.
- Existing user/worktree changes were not reverted or cleaned.
- Gate P0-A stops here pending review.
