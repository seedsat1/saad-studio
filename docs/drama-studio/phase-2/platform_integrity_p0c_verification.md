# Phase 2.0 / P0-C — Platform Integrity Implementation Verification

Date: 2026-08-26  
Branch: `codex/phase-2-platform-integrity-p0a`  
Scope: Platform financial integrity only. No Drama Studio backend, UI, Prisma drama schema, provider pricing, model registry, merge, or deployment work was performed.

## Executive Verdict

**Conditionally ready for owner review, not yet production-ready.**

P0-C implementation now adds the missing platform-owned Prisma contracts and local code guards for idempotency and mandatory ledger writes. The confirmed paid idempotency routes were tightened, and automated tests plus TypeScript pass locally.

The remaining blocker before production activation is a real migration dry run on a non-production PostgreSQL database. All local `.env*` files point to the same Neon host/database (`neondb`), and Docker is installed but the daemon is not running, so I did not apply or dry-run the migration against any database.

## Files Modified

P0-C scoped files:

- `prisma/schema.prisma`
- `prisma/migrations/manual/2026-08-26-platform-financial-integrity-p0c.sql`
- `lib/idempotency.ts`
- `lib/credit-ledger.ts`
- `lib/credit-reconciler.ts`
- `app/api/3d/route.ts`
- `app/api/music/route.ts`
- `app/api/video/route.ts`
- `app/api/generate/audio/route.ts`
- `app/api/admin/transactions/[id]/route.ts`
- `app/api/admin/transactions/route.ts`
- `app/api/admin/users/[userId]/route.ts`
- `test/credit-ledger.test.ts`
- `test/platform-financial-integrity-p0c.test.ts`

Related TypeScript-only compatibility fix encountered during verification:

- `lib/storage/supabase.ts`

## Prisma Models And Final Fields

### `ApiIdempotency`

Added as a platform-owned Prisma model with:

- Identity and isolation: `id`, `userId`, `route`, `operationType`, `key`, `requestHash`
- State: `status`
- Linked generation: `generationId`
- Replay snapshot: `responseStatus`, `responseJson`
- Error classification: `errorCode`, `errorMessage`
- Lease/retry: `attemptCount`, `processingLeaseExpiresAt`, `lastHeartbeatAt`, `providerDispatchedAt`
- Lifecycle: `completedAt`, `failedAt`, `expiresAt`, `createdAt`, `updatedAt`
- Unique guard: `@@unique([userId, route, operationType, key])`
- Indexes: user/time, status, lease expiry, final expiry, generation linkage

Supported statuses in code:

- `new`
- `processing`
- `completed`
- `failed_retryable`
- `failed_terminal`
- `review_required`
- `expired`

### `CreditLedgerEntry`

Added as a mandatory financial ledger model with:

- Identity and owner: `id`, `userId`
- Optional linkage: `generationId`, `projectId`, `jobId`, `idempotencyKey`, `providerUsageRecordId`, `quoteSnapshotId`
- Reversal linkage: `originalEntryId`, self relation `CreditLedgerReversal`
- Financial effect: `delta`, `reason`, `operationType`, `status`, `metadata`, `createdAt`
- Operation types in code: `reserve`, `charge`, `reconcile`, `refund`, `reversal`, `admin_adjustment`
- Indexes for user/time and every optional linkage field

### `AdminTransaction`

Prisma already had the four drift fields; P0-C adds them to the migration as nullable fields:

- `operatorUserId`
- `operatorEmail`
- `decisionAt`
- `decisionReason`

Reads now select these fields directly instead of using `(t as any)`.

## Migration

Created:

- `prisma/migrations/manual/2026-08-26-platform-financial-integrity-p0c.sql`

Properties:

- Non-destructive.
- Uses `CREATE TABLE IF NOT EXISTS` for `ApiIdempotency` and `CreditLedgerEntry`.
- Uses `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for `AdminTransaction` drift fields.
- Uses `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for old `CreditLedgerEntry` compatibility because `prisma/full_schema_init.sql` already contains an older ledger shape.
- Adds indexes and optional foreign-key guards without deleting, renaming, or backfilling data.
- No migration was applied to Production.
- No backfill was performed.

## Implementation Summary

### Idempotency

- Removed optional no-op behavior when idempotency infrastructure is absent for protected paid calls.
- Missing `Idempotency-Key` now fails closed with `428`.
- Missing Prisma client/table now fails closed with `503`.
- Payload hash mismatch now fails with `409`.
- Existing completed requests replay stored response snapshots.
- Existing in-progress requests return `202`.
- Existing provider-dispatched or uncertain requests block duplicate dispatch and require review.
- Preserved `P2002` race handling.
- Centralized owner constants:
  - Processing lease: 5 minutes.
  - Heartbeat: 60 seconds.
  - Final retention: 7 days.
  - Retry backoff: 2s, 4s, 8s.
  - Max automatic attempts: 3.
- Added bounded cleanup helper that only deletes expired final idempotency records and never deletes ledger/admin/financial records.

### Credit Ledger

- `tryCreateCreditLedgerEntry()` is now mandatory despite its legacy name.
- If the Prisma ledger client is absent, it throws `CreditLedgerUnavailableError`.
- Financial mutations now fail closed if ledger writing fails.
- `spendCredits()` creates provider usage, request snapshot, and ledger entry inside the same DB transaction before provider dispatch.
- Refund/rollback paths write `refund` ledger entries.
- Subscription/topup/admin credit adjustments write `admin_adjustment` ledger entries in the same transaction as the balance mutation.
- Credit reconciler no longer swallows ledger write failures.

### Admin Transaction Drift

- Approval/rejection writes nullable operator and decision fields.
- `/api/admin/transactions` reads those fields directly.
- Old records remain compatible because fields are nullable and no backfill is attempted.

### Protected Routes Converted First

| Route | Idempotency | Mandatory ledger through `spendCredits` | Silent financial/idempotency catch removed | Status |
|---|---:|---:|---:|---|
| `app/api/3d/route.ts` | Yes | Yes | Yes | Protected |
| `app/api/music/route.ts` | Yes | Yes | Yes | Protected |
| `app/api/video/route.ts` | Yes | Yes | Yes | Protected |
| `app/api/generate/audio/route.ts` | Yes | Yes | Yes | Protected |
| `app/api/admin/transactions/[id]/route.ts` | N/A | Yes | Yes | Protected |
| `app/api/admin/users/[userId]/route.ts` | N/A | Yes | Yes | Protected |

## Remaining Routes Not Broad-Rewritten In P0-C

These routes still call `spendCredits()` and receive the stricter central ledger behavior, but were not fully refactored for route-local idempotency or every provider-state branch in P0-C:

- `app/api/generate/image/route.ts`
- `app/api/image/generate/route.ts`
- `app/api/conversation/route.ts`
- `app/api/code/route.ts`
- `app/api/cinema/generate/route.ts`
- `app/api/transitions/generate/route.ts`
- `app/api/transitions/stitch/route.ts`
- `app/api/runninghub/*`
- `app/api/panel/generate/*`
- `app/api/panel/transitions/generate`
- `app/api/panel/transcribe`
- `app/api/agent-studio/run/route.ts`
- `app/api/assist/route.ts`
- `app/api/prompt-extractor/route.ts`
- `app/api/scene-studio/create-task/route.ts`
- `app/api/characters/[id]/generate/route.ts`
- `app/api/variations/generate/route.ts`
- `app/api/variations/regenerate/route.ts`

## Test Environment

- Prisma validation: local schema validation only.
- Prisma Client: regenerated locally with `npx.cmd prisma generate`.
- Automated tests: Vitest local unit/regression suites.
- Database migration dry-run:
  - Shadow/Staging Neon: not available/proven. All inspected `.env*` database URLs point to the same Neon host/database (`neondb`), including files named test.
  - Local Docker PostgreSQL: Docker CLI exists, but daemon is not running.
  - Result: no DB migration dry-run was executed to avoid violating the Production-write/dry-run ban.

## Test Results

| Required check | Result |
|---|---|
| Same-key concurrent behavior / P2002 | Covered by `test/platform-financial-integrity-p0c.test.ts` |
| Replay after `completed` | Covered by idempotency replay/update tests |
| Replay while `processing` | Covered by P2002/in-progress test |
| Lease constants | Covered: 5 minutes / 60s heartbeat |
| Final retention | Covered: 7 days constant and cleanup filter |
| Ledger failure | Covered: `CreditLedgerUnavailableError` |
| Refund ledger | Covered by `test/credit-ledger.test.ts` |
| Insufficient credits | Existing regression suites pass |
| Admin old nullable fields | Implemented nullable schema/read compatibility |
| Cleanup excludes active records | Covered by cleanup status filter test |
| Prisma validate | PASS |
| TypeScript check | PASS |
| Migration dry run on non-production DB | Not run: no safe DB target available |
| Regression tests for paid current routes | PASS for available local suites |

Commands run:

- `npx.cmd prisma validate` — PASS
- `npx.cmd prisma generate` — PASS
- `npx.cmd vitest run test/credit-ledger.test.ts test/platform-financial-integrity-p0c.test.ts test/admin-transactions-safety.test.ts test/financial-hardening-safety.test.ts` — PASS, 38 tests
- `npx.cmd vitest run test/credit-ledger.test.ts test/platform-financial-integrity-p0c.test.ts test/admin-transactions-safety.test.ts test/financial-hardening-safety.test.ts test/pricing-core.test.ts test/provider-cost-audit.test.ts test/provider-cost-attribution-remediation.test.ts test/provider-cost-capture-and-reconciliation.test.ts test/assets-route.test.ts test/video-media-picker-assets.test.ts test/dispatch-video-orchestration.test.ts test/task-orchestrator.test.ts test/inline-orchestrator.test.ts` — PASS, 127 tests
- `npx.cmd tsc --noEmit --pretty false` — PASS
- `npx.cmd prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script` — PASS as schema SQL generation only, not a database dry-run

## Evidence Production Was Not Modified

- No `prisma migrate deploy`, `prisma db push`, SQL execution against Neon, or Vercel deploy command was run.
- Database URL inspection was sanitized to host/database/branch only and showed all `.env*` database URLs point to the same Neon host/database, so they were not used for migration or dry-run.
- Docker daemon was unavailable, so no local DB writes were performed either.
- The only generated side effect outside source edits was local Prisma Client generation in `node_modules/@prisma/client`.

## Evidence No Backfill Was Performed

- No data migration, `UPDATE` backfill, historical ledger inference, or production write command was run.
- The P0-C migration adds schema objects/columns only.
- `operationType` and `status` defaults exist only to keep pre-existing old local ledger rows structurally valid if the older table shape exists; no historical record inference is performed.

## State Machine Implemented / Enforced

Implemented locally:

1. `claim`: `beginIdempotency()` creates or resolves the idempotency record.
2. `reserve/persist`: `spendCredits()` atomically decrements credits, creates `Generation`, `ProviderUsageRecord`, `GenerationRequestSnapshot`, and `CreditLedgerEntry`.
3. `dispatch`: provider call occurs after financial prerequisites.
4. `record provider result`: protected routes keep provider result handling and task marker updates.
5. `reconcile/complete`: `completeIdempotency()` stores replay snapshot and final/failed status.
6. `refund/review`: refund helpers write mandatory refund ledger entries; idempotency can mark uncertain provider state as `review_required`.

Partially remaining:

- A full reusable orchestrator around provider dispatch/reconciliation is still future work for the broader paid route set.
- Automatic retry execution is not enabled; only constants and classification are centralized.

## Risks

- Migration still needs a true non-production PostgreSQL dry-run before production review.
- The old `prisma/full_schema_init.sql` contains a minimal historical `CreditLedgerEntry`; P0-C migration handles this via `ALTER TABLE`, but the init script itself remains historically broad and should be normalized separately only if the owner approves touching bootstrap SQL.
- Route-local idempotency is now strict for the four protected routes. Clients that do not send `Idempotency-Key` will receive `428`.
- Remaining paid routes inherit mandatory ledger failure behavior through `spendCredits()` but still need gradual route-level idempotency adoption.

## Rollback Plan

Before production migration:

- Revert source changes on this branch.
- Do not apply the P0-C SQL migration.

After a future approved non-production/production migration:

- Code rollback can restore old behavior, but this is not recommended because financial mutations would again risk missing mandatory ledger writes.
- Schema rollback should be additive-only: leave `ApiIdempotency`, new `CreditLedgerEntry` columns, and nullable `AdminTransaction` fields in place unless the owner explicitly approves destructive cleanup after archival review.

## Current Git Status Short

Scoped P0-C files:

```text
 M app/api/3d/route.ts
 M app/api/admin/transactions/[id]/route.ts
 M app/api/admin/transactions/route.ts
 M app/api/admin/users/[userId]/route.ts
 M app/api/generate/audio/route.ts
 M app/api/music/route.ts
 M app/api/video/route.ts
 M lib/credit-ledger.ts
 M lib/credit-reconciler.ts
 M lib/idempotency.ts
 M lib/storage/supabase.ts
 M prisma/schema.prisma
 M test/credit-ledger.test.ts
?? prisma/migrations/manual/2026-08-26-platform-financial-integrity-p0c.sql
?? test/platform-financial-integrity-p0c.test.ts
```

The worktree also contains many unrelated pre-existing changes and untracked Drama/Voice Agent files that were not introduced by P0-C.

## Current Diff Stat

Scoped P0-C files before this report:

```text
 app/api/3d/route.ts                      |  19 +-
 app/api/admin/transactions/[id]/route.ts |  32 ++--
 app/api/admin/transactions/route.ts      |  14 +-
 app/api/admin/users/[userId]/route.ts    |  22 +--
 app/api/generate/audio/route.ts          |  19 +-
 app/api/music/route.ts                   |  41 ++--
 app/api/video/route.ts                   |  74 +++----
 lib/credit-ledger.ts                     | 158 ++++++++++-----
 lib/credit-reconciler.ts                 |  27 ++-
 lib/idempotency.ts                       | 320 ++++++++++++++++++++++++++++---
 lib/storage/supabase.ts                  |   2 +-
 prisma/schema.prisma                     | 301 +++++++++++++++++++++++++++++
 test/credit-ledger.test.ts               |   9 +-
 13 files changed, 836 insertions(+), 202 deletions(-)
```
