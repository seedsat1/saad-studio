# Gate P0-B - Platform Integrity Decisions & ADRs

Status: P0-B documentation only. P0-A is approved. No Prisma, migration, API, UI, Drama Studio backend, Gate C.2, SVG, model registry, pricing registry, or live DB change is performed by this document.

Branch: `codex/phase-2-platform-integrity-p0a`

## Executive Verdict

[ADR READY FOR REVIEW] The six owner decisions are accepted as architecture direction and translated below into executable P0-C contracts. P0-C must not start until these ADRs are approved.

[IMPLEMENTATION BLOCKED UNTIL P0-C APPROVAL] The next implementation must be platform-wide, not Drama-specific:

- `ApiIdempotency` becomes required infrastructure for paid/provider-dispatching operations.
- `CreditLedgerEntry` becomes mandatory audit infrastructure, not best-effort.
- `AdminTransaction` keeps the four audit fields and reconciles live DB safely with nullable columns.
- Paid operations must fail closed when idempotency, credit debit, ledger, or required financial infrastructure is unavailable.
- Admin read surfaces may degrade only with explicit incomplete-audit status.
- Retry, processing lease, and retention values remain `[OWNER APPROVAL REQUIRED]` until grounded by existing model/job timeouts and safe DB evidence.

## Evidence Matrix

| Evidence area | Finding | Source |
|---|---|---|
| P0-A approval | P0-A accepted without conditions in the owner message. | `C:\Users\PC\.codex\attachments\e90ae809-a000-4906-9b64-d88fcdc921e9\pasted-text.txt` |
| P0-A contract matrix | `ApiIdempotency` missing, `CreditLedgerEntry` missing live/Prisma, `AdminTransaction` drift. | `docs/drama-studio/phase-2/platform_integrity_contract_matrix.md` |
| Live DB target | Live verification used `neondb.public`, PostgreSQL `17.11`, read-only transaction. | `docs/drama-studio/phase-2/phase_2_db_verification.md:26` |
| Idempotency helper | Optional client returns `kind: "none"` when model/table is unavailable; uses `userId_route_key`, `requestHash`, `generationId`, `responseStatus`, `responseJson`. | `lib/idempotency.ts:5-6`, `:31-50`, `:73-78`, `:122-145` |
| Idempotency consumers | Used by `3d`, `music`, `video`, and `generate/audio` paid/provider routes. | `app/api/3d/route.ts:11`, `app/api/music/route.ts:10`, `app/api/video/route.ts:19`, `app/api/generate/audio/route.ts:8` |
| Credit debit | `spendCredits` uses atomic guarded decrement inside a DB transaction before creating generation/provider/snapshot/ledger. | `lib/credit-ledger.ts:638-739` |
| Ledger current behavior | Ledger create is optional and swallowed; writes `userId`, `generationId`, `delta`, `reason`. | `lib/credit-ledger.ts:107-120` |
| Ledger reads | Admin history/detail read ledger by raw SQL and return incomplete values when absent. | `lib/admin/history-read-model.ts:268-282`, `:433-438`; `app/api/admin/generations/[id]/route.ts:121-132` |
| SQL ledger | `full_schema_init.sql` has `CreditLedgerEntry` with `delta/reason`, but it is not a Prisma model or live table. | `prisma/full_schema_init.sql:53-63`; `phase_2_db_verification.md:14`, `:246`, `:286` |
| AdminTransaction drift | Prisma has four audit fields absent from SQL/live DB. | `prisma/schema.prisma:170-185`; `prisma/full_schema_init.sql:81-91`; `phase_2_db_verification.md:141-156` |
| Admin CAS | Transaction approval/rejection uses `updateMany` where `paymentStatus = PENDING`. | `app/api/admin/transactions/[id]/route.ts:140-143`, `:314-317` |
| Provider dispatch boundary | Current routes debit/create generation before external provider fetch; failure paths attempt refund/rollback. | `app/api/video/route.ts:2659-2694`; `app/api/3d/route.ts:191-206`; `app/api/generate/image/route.ts:751-801` |
| Other paid operations | Many routes call `spendCredits` without current idempotency coverage. | `rg spendCredits` evidence includes `app/api/generate/image/route.ts`, `app/api/conversation/route.ts`, `app/api/code/route.ts`, `app/api/cinema/generate/route.ts`, `app/api/transitions/*`, `app/api/panel/*`, `app/api/runninghub/*` |
| ProviderUsage/Snapshot | Existing records help audit provider cost and request payload, but do not carry enough ledger/idempotency/reversal linkage. | `prisma/schema.prisma:118-165`; `lib/credit-ledger.ts:500-634`, `:711-730`, `:1351-1462` |

## Atomicity Analysis

The current system already protects the balance decrement itself with `updateMany({ creditBalance: { gte: credits } })`, so negative-balance lost updates are mitigated for `spendCredits`. The larger atomicity gap is cross-system:

1. Idempotency claim must occur before credit mutation.
2. Balance check, reservation/debit, generation/job row creation, and ledger row creation must be in one database transaction.
3. Provider dispatch cannot be inside the DB transaction.
4. A durable "dispatch pending/processing" state must exist before provider call.
5. Provider success must reconcile task id, provider usage, generation status, and idempotency result.
6. Provider failure must record failure, refund/reversal, and idempotency retry behavior without hiding partial failures.

P0-C should use a Reservation + Dispatch + Reconciliation boundary unless the implementation proves a simpler pattern can satisfy all invariants without provider calls inside transactions.

## Concurrency Analysis

- `spendCredits` is safe against concurrent overspend of the same user balance because it uses an atomic guarded decrement.
- It is not safe against duplicate request replay by itself; two distinct route executions can each call `spendCredits` and create two generations if idempotency is unavailable or optional.
- Current `ApiIdempotency` helper is designed for concurrency through a unique compound key and `P2002` handling, but the table does not exist.
- AdminTransaction approval/rejection uses compare-and-swap and has one-winner semantics for `paymentStatus`.
- Manual credit adjustment has negative-balance floor protection, but ledger is optional today.

## Failure and Recovery Analysis

- Provider dispatch can fail after debit/generation creation; current routes attempt rollback/refund, often with `.catch(() => {})`.
- Ledger creation can fail silently, creating an audit gap.
- ProviderUsage updates can fail and log only, leaving incomplete provider economics.
- Admin history can catch raw ledger query failure and show incomplete audit without a strong completeness signal.
- Idempotency completion can fail after provider dispatch, allowing repeated clients to miss replay state.
- Historical operations without ledger cannot be backfilled safely from `ProviderUsageRecord` alone because it lacks original ledger operation type, original balance transition, idempotency key, and reversal origin.

## Atomicity and Failure Boundaries

Required paid-operation order for P0-C:

1. Authenticate user and verify route authorization.
2. Require or create an idempotency claim scoped by user, route, and operation type.
3. Build quote from central registry/pricing only; no Drama hardcode.
4. Check balance and project cap when a project scope exists.
5. Create a financial reservation or debit record according to the approved ledger contract.
6. Create `Generation` and/or job placeholder plus required request snapshot.
7. Commit local DB transaction.
8. Dispatch the provider request once.
9. Record provider task/request id and provider usage.
10. Reconcile expected and actual cost.
11. Append matching ledger entries for charge/settlement/refund/reversal.
12. Close idempotency with a completed, failed, or review-required result.

Single DB transaction boundary: steps 2 through 7 should commit local invariants together where possible. External boundary: provider dispatch in step 8 cannot be inside the database transaction. Recovery boundary: steps 9 through 12 must be resumable from stored state, because network or provider failures can occur after local commit.

Alternatives:

| Boundary option | Decision | Reason |
|---|---|---|
| Put provider call inside DB transaction | Rejected | External calls can hang, fail, or return after transaction timeout; locks would be unsafe. |
| Debit first, dispatch, then best-effort ledger | Rejected | Current gap permits debit without audit proof. |
| Reservation + Dispatch + Reconciliation state machine | Recommended for P0-C | Separates durable local claim from external provider uncertainty. |
| Outbox event for provider dispatch | Consider in P0-C | Stronger recovery if existing job infrastructure supports it; do not assume a job system before proof. |

## Retry and Expiration State Machine

Required logical states:

```text
new request
  -> processing
  -> completed
  -> failed_retryable
  -> failed_terminal
  -> review_required
  -> expired
```

Transitions and guards:

| From | To | Guard |
|---|---|---|
| none | processing | unique idempotency claim succeeds and financial prerequisites are available |
| processing | completed | provider result and local reconciliation both succeed |
| processing | failed_retryable | temporary provider/network failure classified safely and no duplicate dispatch is pending |
| processing | failed_terminal | validation/provider policy failure requires a new request |
| processing | review_required | provider state unknown, refund/reversal uncertain, or ledger/idempotency close fails |
| processing | expired | processing lease expires and recovery proves no active provider operation should continue |
| failed_retryable | processing | retry policy allows reuse or renewal of lease without duplicate debit |
| completed | completed | repeated same key replays stored result |
| failed_terminal | failed_terminal | repeated same key returns terminal failure or requires a new key/request |

Final numeric TTL, lease, cooldown, and retention values remain `[OWNER APPROVAL REQUIRED]`.

## Admin Audit Contract

Later admin surfaces must be able to join or display:

- `userId`
- optional `projectId`, `episodeId`, `sceneId`, `shotId`, `generationBlockId`, `takeId` when the feature supplies them
- `generationId`
- optional `jobId`
- idempotency key/scope/state
- model, provider, and route
- quote snapshot reference when approved
- reserved amount
- actual provider cost
- charged, refunded, reversed, or pending-reconciliation ledger state
- retry attempts and current lease/recovery state
- error code/message safe for operators
- timestamps for claim, dispatch, completion/failure, refund/reversal
- admin operator fields for manual intervention

No new admin page is approved in P0-B. Existing Generation Monitor, Job Queues & Workers, Transactions & Billing, Generation History, Provider Usage, and Audit details should consume this contract after P0-C implementation.

## Migration Preconditions

Before any P0-C migration is written or run:

- Confirm the target is Shadow/Staging/local, not Production.
- Re-run read-only metadata checks for `ApiIdempotency`, `CreditLedgerEntry`, `AdminTransaction`, `Generation`, `ProviderUsageRecord`, and `GenerationRequestSnapshot`.
- Confirm no existing table with different casing/schema already owns either missing contract.
- Confirm Prisma schema drift in the current branch after preserving user changes.
- Decide final names for lifecycle/status/linkage fields.
- Decide final nullable relation versus scalar-id strategy.
- Decide lease/retention policy source, or mark values as owner-configured without defaults.
- Confirm no destructive table/column/data operation is needed.

## Decision Table

| Item | Decision |
|---|---|
| P0-A Contract Matrix | Approved |
| `ApiIdempotency` ownership | Platform-wide, mandatory |
| `CreditLedgerEntry` ownership | Platform-wide, mandatory |
| Paid operation missing idempotency/ledger | Fail closed |
| Admin read missing secondary audit source | Explicit degraded mode |
| AdminTransaction audit fields | Keep and add nullable later |
| Drama backend implementation | Not started |
| FLUX 3/model additions | Deferred through registry path |
| Processing lease duration | `[OWNER APPROVAL REQUIRED]` |
| Idempotency retention duration | `[OWNER APPROVAL REQUIRED]` |
| Retry cooldown/window | `[OWNER APPROVAL REQUIRED]` |
| Cleanup cadence | `[OWNER APPROVAL REQUIRED]` |
| Final column names for new lifecycle/link fields | `[OWNER APPROVAL REQUIRED]` during P0-C design review |

## Proposed P0-C Execution Order

1. Reconfirm branch and dirty worktree; isolate only approved files.
2. Re-run read-only DB metadata against Shadow/Staging target.
3. Finalize field names from ADR approval.
4. Add Prisma models/fields non-destructively.
5. Create independent migration files only; never run `full_schema_init.sql`.
6. Implement required idempotency access layer with fail-closed behavior.
7. Implement mandatory ledger writes and remove silent financial fallbacks from write paths.
8. Reconcile AdminTransaction route writes and remove schema-hiding casts only after DB compatibility.
9. Add targeted tests for duplicate idempotency, concurrency, debit, refund/reversal, degraded admin reads, and legacy admin rows.
10. Run Prisma format/validate/generate, TypeScript check, targeted tests, and Shadow/Staging migration dry run.
11. Produce P0-D verification report before any Production plan.

---

# ADR-01 - ApiIdempotency Platform Ownership and Lifecycle

## Status

Accepted for P0-B review; implementation pending P0-C approval.

## Context

Paid and provider-dispatching operations need duplicate-request protection across retries, user refreshes, network failures, and concurrent submits.

## Evidence

- `lib/idempotency.ts` uses optional `prismadb.apiIdempotency`, so absence disables protection.
- Current consumers include `app/api/3d/route.ts`, `app/api/music/route.ts`, `app/api/video/route.ts`, and `app/api/generate/audio/route.ts`.
- P0-A/live DB verification found no Prisma model, no searched SQL migration, and no live table.

## Existing Behavior

The helper hashes the request body, scopes a key by user and route, creates an in-progress row, attaches `generationId`, and stores final response status/body. If the Prisma model is absent, it returns `kind: "none"`.

## Problem

Optional idempotency allows duplicate generations, duplicate provider calls, and duplicate credit mutations.

## Owner Decision

`ApiIdempotency` is platform-wide, mandatory, and required for every operation that may debit credits, create a generation/job, or call a provider.

## Alternatives Considered

| Alternative | Decision | Reason |
|---|---|---|
| Keep optional helper | Rejected | Fails closed requirement and permits duplicate paid work. |
| Use only client-side disable buttons | Rejected | Does not protect retries, concurrency, or network replay. |
| Route-local in-memory cache | Rejected | Not durable, not multi-instance safe. |
| Platform DB table | Accepted | Matches existing helper shape and can enforce uniqueness. |

## Recommended Physical Implementation

Add a Prisma model and independent migration in P0-C. Do not reuse `Generation` as the idempotency store. Do not write Drama-specific fields.

## Data Contract

Proven fields:

- `id`
- `userId`
- `route`
- `key`
- `requestHash`
- `generationId` nullable
- `responseStatus` nullable
- `responseJson` nullable JSON
- `createdAt`
- `updatedAt`

Required semantic additions for P0-C, subject to naming approval:

- explicit lifecycle status: processing/completed/failed/expired or equivalent.
- processing lease timestamp.
- optional error metadata safe for admin/debugging.

Numerical lease/retention values are `[OWNER APPROVAL REQUIRED]`.

## Constraints and Indexes

- Unique compound key on `userId`, `route`, `key`.
- Index on `createdAt`.
- Index on status/lease field if P0-C implements recovery scanning.
- Optional relation or nullable string link to `Generation`; final FK choice depends on migration risk review.

## Transaction Boundaries

Claim idempotency before credit mutation. Credit/generation/ledger creation happens after a successful claim in one DB transaction. Provider dispatch happens after transaction commit. Completion updates idempotency after provider dispatch outcome is known.

## Failure Behavior

- Missing idempotency layer for a paid operation: fail closed before debit/provider call.
- Duplicate in-progress request: return processing/in-progress result without new debit.
- Duplicate completed request: replay saved response.
- Failed request: allow retry according to explicit failed/lease policy, not by deleting successful records.

## Backward Compatibility

Existing clients without an idempotency key need a compatibility decision in P0-C. For paid write APIs, recommended behavior is to require a key and return a clear retryable client error when absent, unless a route-specific ADR exception is approved.

## Migration Strategy

Create a new independent migration only. Do not run `full_schema_init.sql`. No production application in P0-C. Shadow/Staging dry run required.

## Rollback Strategy

Rollback by disabling required-idempotency enforcement before dropping or ignoring the new table. Do not delete successful idempotency records in production without a retention plan.

## Admin and Audit Impact

Admin drill-down should show route, user, generation/job link, status, created/completed timestamps, and replay/conflict/failure state.

## Security Considerations

Scope by authenticated `userId` and route. Do not expose another user's idempotency result. Store sanitized response JSON only. Avoid secrets/provider tokens in `responseJson`.

## Tests Required

- First request executes exactly once.
- Sequential retry replays response.
- Concurrent same-key requests produce one generation/debit/provider call.
- Same key with different body returns conflict.
- Missing idempotency infra fails closed for paid operation.
- Failed/leased request retry behavior follows approved policy.

## Unresolved Numerical Values

- Processing lease duration: `[OWNER APPROVAL REQUIRED]`.
- Successful response retention: `[OWNER APPROVAL REQUIRED]`.
- Failed response retention/retry window: `[OWNER APPROVAL REQUIRED]`.

## Acceptance Criteria

No paid/provider operation can bypass idempotency silently, and duplicate keys cannot create duplicate debit/generation/provider calls.

## P0-C Files Expected to Change

`prisma/schema.prisma`, new manual migration SQL, `lib/idempotency.ts`, paid route integrations, idempotency tests.

---

# ADR-02 - CreditLedgerEntry as Mandatory Financial Audit

## Status

Accepted for P0-B review; implementation pending P0-C approval.

## Context

Credit balance mutations must be auditable independently of the mutable `User.creditBalance`.

## Evidence

- `spendCredits` decrements balance and attempts ledger inside a DB transaction.
- `tryCreateCreditLedgerEntry` catches all failures.
- `CreditLedgerEntry` exists in `full_schema_init.sql` but not Prisma/live DB.
- Admin history reads ledger and falls back silently.

## Existing Behavior

The financial operation can succeed even if ledger creation is skipped or fails.

## Problem

The platform can reach "credits changed without immutable proof," breaking audit, refund verification, and admin trust.

## Owner Decision

`CreditLedgerEntry` is platform-wide mandatory financial audit infrastructure.

## Alternatives Considered

| Alternative | Decision | Reason |
|---|---|---|
| Keep ledger best-effort | Rejected | Allows debit without audit row. |
| Use `AdminTransaction` as ledger | Rejected | Payment/manual-transfer evidence is not generation debit/refund ledger. |
| Rebuild from `ProviderUsageRecord` | Rejected as authoritative | Provider usage lacks balance transition, operation type, idempotency, and reversal origin. |
| Create required Prisma ledger model | Accepted | Matches platform audit requirement and existing SQL/code intent. |

## Recommended Physical Implementation

Add Prisma model/migration for `CreditLedgerEntry` in P0-C after confirming the live absence remains true in target Staging/Shadow. Make ledger write required for new financial mutations.

## Data Contract

Proven baseline:

- `id`
- `userId`
- `generationId` nullable
- `delta`
- `reason`
- `createdAt`

Required semantics:

- debit/charge as negative delta.
- grant/refund/reversal as positive delta.
- immutable append-only rows.
- no guessed historical backfill.

## Constraints and Indexes

- Primary key.
- FK `userId -> User`.
- Nullable FK or string link to `Generation`.
- Indexes on `userId`, `generationId`, `createdAt`.
- Additional uniqueness for operation/idempotency is deferred to ADR-03 because current code does not prove existing column names.

## Transaction Boundaries

For new paid operations, balance mutation, generation/job creation, request snapshot, provider usage placeholder, and ledger entry must be committed or rolled back together. Provider dispatch remains outside the transaction.

## Failure Behavior

If ledger create fails, the paid operation fails before provider dispatch. Existing silent catch must be removed in P0-C for required financial paths.

## Backward Compatibility

Historical rows without ledger remain readable but explicitly marked incomplete. No guessed backfill. A separate reconciliation report may identify candidates from `Generation.cost`, `GenerationRequestSnapshot.userCreditsCharged`, and `ProviderUsageRecord`, but cannot mark them authoritative without owner approval.

## Migration Strategy

Independent non-destructive create-table migration. Do not execute `full_schema_init.sql`. Do not backfill in the same migration.

## Rollback Strategy

If migration must be rolled back before production writes, drop only the newly created table in non-production. After production writes, rollback is logical: disable new enforcement with a controlled feature/config switch and preserve rows.

## Admin and Audit Impact

Generation History and Generation detail should show explicit ledger completeness. Manual financial actions must not succeed if ledger is unavailable.

## Security Considerations

Ledger rows must be user-scoped in reads. Reasons must avoid secrets and excessive personal data.

## Tests Required

- Debit creates exactly one ledger row.
- Refund creates a positive ledger row.
- Ledger failure prevents paid operation.
- Historical missing ledger shows explicit degraded audit.
- Manual credit adjustment writes required ledger.

## Unresolved Numerical Values

None for baseline ledger. Any retention policy is `[OWNER APPROVAL REQUIRED]`; financial ledger should default to durable retention unless legal/product policy says otherwise.

## Acceptance Criteria

No new credit debit/grant/refund can be committed without an auditable ledger row.

## P0-C Files Expected to Change

`prisma/schema.prisma`, new manual migration SQL, `lib/credit-ledger.ts`, admin read model, admin generation detail route, admin users/transactions routes, ledger tests.

---

# ADR-03 - Required Ledger Extensions and Audit Linkage

## Status

Accepted for P0-B review; implementation pending P0-C approval.

## Context

Drama Studio later needs `projectId`, `episodeId`, `sceneId`, `shotId`, `generationBlockId`, `takeId`, credit caps, quote/requote, reserved/actual/refunded credits, and admin drill-down. The ledger must support this without becoming Drama-only.

## Evidence

- Current ledger only proves `userId`, `generationId`, `delta`, `reason`.
- `Generation` and `ProviderUsageRecord` can represent execution and provider economics.
- `CinemaJob` has `projectId`, `shotId`, `taskId`, and `creditsCost`, but zero live rows and is not proven as the platform job source.

## Existing Behavior

Ledger writes do not store idempotency key, route, job id, project id, original operation id, status, reserve/settle distinction, or decision metadata.

## Problem

Without linkage, admin cannot reliably trace a credit event through request -> idempotency -> generation/job -> provider -> refund/reversal -> project/take.

## Owner Decision

Prepare ledger for platform-wide extensibility with nullable links for user, generation, project, job, idempotency, original entry, type/status, and audit metadata, without inventing Drama tables now.

## Alternatives Considered

| Alternative | Decision | Reason |
|---|---|---|
| Keep only `delta/reason` | Rejected for future | Too weak for admin drill-down and duplicate prevention. |
| Add FKs to all future Drama entities now | Rejected | Drama physical ownership is not approved in P0-B. |
| Store optional scalar identifiers for unresolved domains | Accepted selectively | Allows future linkage without unsafe FK dependency. |
| Require relation only to existing `Generation`/`ApiIdempotency` | Accepted where safe | Existing/proposed platform tables can own strong links. |

## Recommended Physical Implementation

In P0-C, implement the proven ledger baseline first. Add only owner-approved nullable linkage fields whose consumers are updated in the same phase. Use scalar nullable identifiers where target ownership is not finalized.

## Data Contract

Baseline fields from ADR-02 plus proposed nullable extensions:

- `operationType` or equivalent distinct from human `reason`.
- `status` for reserved/charged/settled/refunded/reversed/pending_reconciliation or approved equivalent.
- `idempotencyId` or `idempotencyKey` + route.
- `jobId` nullable scalar until job ownership is finalized.
- `projectId` nullable scalar until project ownership is finalized.
- `originalEntryId` nullable self-link for refund/reversal.
- `metadata` sanitized JSON only if specific consumers need it.

Final names are `[OWNER APPROVAL REQUIRED]` before migration.

## Constraints and Indexes

- Index `userId, createdAt`.
- Index `generationId`.
- Index `idempotencyId` or compound `idempotencyKey, route`.
- Index `jobId` and `projectId` only if added.
- Unique operation constraint is required for debit idempotency, but exact columns are `[OWNER APPROVAL REQUIRED]`.

## Transaction Boundaries

The ledger row should be created in the same DB transaction as the balance mutation and generation/job placeholder. Settlement/refund rows should be new append-only rows linked to the original entry.

## Failure Behavior

Refund/reversal failure creates or leaves a pending reconciliation state; it must not be marked complete. No automatic repeat without idempotency.

## Backward Compatibility

All new linkage fields nullable. Existing or historical operations without linkage are shown as incomplete, not rewritten.

## Migration Strategy

Prefer a single create-table migration for the final approved ledger shape if the table is absent. If table exists in a non-production target, use additive nullable columns only.

## Rollback Strategy

No destructive rollback after ledger rows exist. Disable writers/read new fields while preserving rows.

## Admin and Audit Impact

Admin surfaces should be able to show `userId`, `generationId`, optional `projectId`, optional `jobId`, idempotency route/key, operation type/status, delta, reason, provider/model through linked generation/provider usage, and original reversal linkage.

## Security Considerations

Do not store raw prompts or provider payloads in ledger metadata. Link to snapshots instead.

## Tests Required

- Duplicate debit prevented by operation/idempotency uniqueness.
- Refund links to original charge.
- Project/job identifiers are searchable when present.
- Missing optional identifiers do not break legacy records.

## Unresolved Numerical Values

None. Field names and exact operation statuses are `[OWNER APPROVAL REQUIRED]`.

## Acceptance Criteria

Ledger can support current platform features and future Drama drill-down without adding Drama-only tables in P0-B/P0-C.

## P0-C Files Expected to Change

Ledger schema/migration, `lib/credit-ledger.ts`, idempotency integration, generation task orchestration, admin history/detail read models, targeted tests.

---

# ADR-04 - AdminTransaction Schema Drift Reconciliation

## Status

Accepted for P0-B review; implementation pending P0-C approval.

## Context

Manual transfer is the primary active payment workflow. Audit fields exist in Prisma but not live DB.

## Evidence

- Prisma fields: `operatorUserId`, `operatorEmail`, `decisionAt`, `decisionReason`.
- SQL/live DB currently have only `id`, `userId`, `plan`, `amount`, `credits`, `paymentStatus`, `createdAt`.
- The route resolves operator identity but current update paths only write `paymentStatus`.
- The admin list route exposes audit fields through `(t as any)`.

## Existing Behavior

Approval/rejection is atomic by `paymentStatus`, but operator/decision data is not reliably persisted.

## Problem

Prisma/live drift can break writes once the fields are selected/written directly, and current audit display can imply data exists when it does not.

## Owner Decision

Keep the four fields and add them later to live DB safely as nullable columns. Do not remove them from Prisma.

## Alternatives Considered

| Alternative | Decision | Reason |
|---|---|---|
| Delete fields from Prisma | Rejected | Owner wants audit fields retained. |
| Backfill historical operator data | Rejected | Would be guessed. |
| Add nullable columns | Accepted | Preserves old records and aligns Prisma/live. |
| Keep `as any` forever | Rejected | Hides drift and weakens type safety. |

## Recommended Physical Implementation

P0-C adds nullable columns by independent migration, then writes server-resolved operator fields when approving or rejecting transactions.

## Data Contract

- `operatorUserId`: nullable, server-authenticated admin identifier.
- `operatorEmail`: nullable, server-resolved email when available.
- `decisionAt`: nullable timestamp set when status leaves `PENDING`.
- `decisionReason`: nullable human reason from approved request body, length/PII policy to be defined.

## Constraints and Indexes

No new required indexes initially. Consider index on `decisionAt` only if admin filtering needs it later. No guessed FK to admin user until auth/user ownership is verified.

## Transaction Boundaries

Approval/rejection `paymentStatus` and audit fields must be written in the same compare-and-swap update.

## Failure Behavior

If audit columns are unavailable during P0-C after enforcement, manual financial status transitions should fail before mutating credits/subscription state.

## Backward Compatibility

Fields are nullable. Existing rows remain valid and display as legacy/operator unknown.

## Migration Strategy

Add four nullable columns. No backfill. No data deletion.

## Rollback Strategy

Before production writes, columns can be dropped in non-production. After production writes, preserve columns and disable UI/API usage if rollback is needed.

## Admin and Audit Impact

Transactions & Billing should display real operator/decision metadata when available and legacy/incomplete status when null.

## Security Considerations

Use server-side `auth()`/`currentUser()` only; ignore client-supplied operator fields. Avoid storing unnecessary personal data beyond operational email/id.

## Tests Required

- Approval writes server-resolved audit fields.
- Rejection writes server-resolved audit fields and reason.
- Client-supplied spoofed operator fields are ignored.
- Legacy null audit rows remain readable.
- CAS still allows exactly one winner.

## Unresolved Numerical Values

Maximum `decisionReason` length and retention policy: `[OWNER APPROVAL REQUIRED]`.

## Acceptance Criteria

Prisma and live DB are compatible, old records survive, and no admin transition writes fields that do not exist.

## P0-C Files Expected to Change

`prisma/schema.prisma` only if needed after comparison, new migration SQL, `app/api/admin/transactions/[id]/route.ts`, `app/api/admin/transactions/route.ts`, admin transaction tests.

---

# ADR-05 - Platform Financial Failure and Degraded-Mode Policy

## Status

Accepted for P0-B review; implementation pending P0-C approval.

## Context

The platform must distinguish paid write operations from admin read operations.

## Evidence

- Current ledger/idempotency helpers can degrade silently.
- Admin history raw ledger reads catch failure and continue.
- ProviderUsage updates catch and log failures.
- Generation routes often refund/rollback in catch blocks but swallow refund failures.

## Existing Behavior

Paid paths can continue when optional infrastructure is absent, while admin reads may imply incomplete data is complete.

## Problem

Silent fallback is dangerous for money, provider calls, and admin audit.

## Owner Decision

Paid operations fail closed. Admin reads use explicit degraded mode only for secondary sources.

## Alternatives Considered

| Alternative | Decision | Reason |
|---|---|---|
| Universal fail closed including all admin reads | Rejected | Would reduce observability during incidents. |
| Universal best-effort fallback | Rejected | Unsafe for financial mutations. |
| Fail closed for writes, explicit degraded reads | Accepted | Preserves safety and operational visibility. |

## Recommended Physical Implementation

P0-C introduces explicit infrastructure checks for paid write paths and explicit audit completeness flags for admin read models.

## Data Contract

Paid error response should include a safe retryable error code and no provider dispatch. Admin read response should include audit completeness/degraded status and missing source names.

## Constraints and Indexes

No schema-specific indexes. Enforcement belongs in service/API boundaries and admin read contracts.

## Transaction Boundaries

If idempotency, debit, generation placeholder, or ledger cannot commit, no provider dispatch occurs.

## Failure Behavior

- Missing idempotency: fail closed.
- Missing ledger: fail closed for financial writes.
- Refund/reversal failure: leave pending reconciliation, do not mark complete.
- Admin secondary read missing: explicit degraded mode plus telemetry/logging.

## Backward Compatibility

Existing historical gaps remain visible as incomplete. Current admin pages may require a later UI/API contract update, but not in P0-B.

## Migration Strategy

No migration by this ADR alone. It depends on ADR-01, ADR-02, and ADR-04 physical changes.

## Rollback Strategy

Keep a controlled way to disable new enforcement only if it would block all production generation due to deployment issue; such rollback must preserve ledger/idempotency records and be owner-approved.

## Admin and Audit Impact

Generation Monitor, Job Queues & Workers, Transactions & Billing, Generation History, Provider Usage, and Audit details should expose financial completeness, not hide missing ledger/idempotency.

## Security Considerations

Errors must not reveal secrets, provider credentials, raw payloads, or other users' state.

## Tests Required

- Paid route does not dispatch provider when idempotency unavailable.
- Paid route does not dispatch provider when ledger unavailable.
- Admin read returns degraded marker when ledger read fails.
- Refund failure leaves pending/incomplete status.

## Unresolved Numerical Values

Telemetry sampling/alert thresholds: `[OWNER APPROVAL REQUIRED]`.

## Acceptance Criteria

No silent fallback can cause or hide a financial mutation; admin reads never claim complete audit when sources are missing.

## P0-C Files Expected to Change

`lib/idempotency.ts`, `lib/credit-ledger.ts`, admin history read model, generation/admin detail APIs, paid route guards, tests.

---

# ADR-06 - Retry, Expiration, Lease and Recovery Policy

## Status

Accepted for P0-B review; implementation pending P0-C approval.

## Context

Provider calls can run longer than the original HTTP request and may fail after local DB commit. Idempotency records must avoid both duplicate execution and permanent stuck keys.

## Evidence

- Current idempotency stores final response but no explicit status, lease, expiry, or cleanup.
- Current task orchestration debits/creates generation, dispatches provider, records task marker, and refunds on submit failure.
- `ProviderUsageRecord` and `GenerationRequestSnapshot` provide timestamps and request metadata that can inform future timeout recommendations, but P0-B does not safely compute final values.

## Existing Behavior

In-progress idempotency is represented by absence of `responseStatus/responseJson`; stuck processing has no explicit lease/recovery contract.

## Problem

A crash after claim or provider dispatch can leave retries ambiguous: retrying might duplicate provider calls or remain blocked forever.

## Owner Decision

Use explicit states, processing lease/recovery, durable completed records, and configurable retention. Do not choose final TTL/timeout numbers by guess.

## Alternatives Considered

| Alternative | Decision | Reason |
|---|---|---|
| Never expire idempotency records | Partial | Good for completed records, bad for stuck processing. |
| Delete idempotency after success | Rejected | Breaks replay guarantee. |
| Fixed hardcoded TTL | Rejected | Violates no-guessing and model/job variability. |
| Configurable lease/retention | Accepted | Allows evidence-based tuning. |

## Recommended Physical Implementation

Add lifecycle fields to `ApiIdempotency` in P0-C only after naming approval. Recovery should inspect processing records whose lease expired and reconcile with linked generation/job/provider status before permitting retry.

## Data Contract

Potential semantic fields:

- `status`
- `processingLeaseExpiresAt`
- `completedAt`
- `failedAt`
- `expiresAt`
- `lastErrorCode`
- `lastErrorMessage`

Final names and which fields are persisted are `[OWNER APPROVAL REQUIRED]`.

## Constraints and Indexes

- Unique `userId, route, key`.
- Index status/lease for recovery.
- Index expiration only if cleanup job is implemented.

## Transaction Boundaries

Claim and lease set in DB before financial mutation. Provider dispatch records provider request id into Generation/ProviderUsage when available. Completion/recovery updates idempotency after reconciling linked generation/job state.

## Failure Behavior

- Completed request: replay.
- Processing request with valid lease: return in-progress.
- Processing request with expired lease: recovery check before retry.
- Failed request: retry allowed only according to approved status and failure class.
- Unknown linked provider state: do not double dispatch; require reconciliation.

## Backward Compatibility

Existing records do not exist today. If records are introduced before full enforcement, missing lifecycle fields must be handled by migration defaults.

## Migration Strategy

Create table with approved lifecycle fields. Config values stored centrally through existing platform configuration only if owner approves exact keys in P0-C.

## Rollback Strategy

Disable recovery worker/cleanup first. Preserve idempotency records. Do not delete completed records as rollback.

## Admin and Audit Impact

Admin should see stuck processing, expired lease, failed retryable, completed replay, and linked generation/job state.

## Security Considerations

Error fields must be sanitized. Response replay must be user/route/key scoped.

## Tests Required

- Valid lease blocks duplicate dispatch.
- Expired lease triggers recovery rather than blind second dispatch.
- Completed response persists and replays.
- Failed retry policy allows/blocks according to approved rules.
- Cleanup does not remove records required for audit too early.

## Unresolved Numerical Values

- Processing lease duration: `[OWNER APPROVAL REQUIRED]`.
- Failure retry cooldown/window: `[OWNER APPROVAL REQUIRED]`.
- Completed idempotency retention: `[OWNER APPROVAL REQUIRED]`.
- Expired record cleanup interval: `[OWNER APPROVAL REQUIRED]`.

## Acceptance Criteria

Retries cannot create duplicate financial/provider effects, and stuck processing records have a safe recovery path.

## P0-C Files Expected to Change

Idempotency schema/migration, `lib/idempotency.ts`, route integrations, optional recovery job/service, tests.

---

## P0-C Expected File Impact

- `prisma/schema.prisma`
- New independent manual migration SQL under `prisma/migrations/manual/`
- `lib/idempotency.ts`
- `lib/credit-ledger.ts`
- `lib/generation/task-orchestrator.ts`
- `lib/admin/history-read-model.ts`
- `app/api/admin/generations/[id]/route.ts`
- `app/api/admin/transactions/route.ts`
- `app/api/admin/transactions/[id]/route.ts`
- `app/api/admin/users/[userId]/route.ts`
- Paid/provider routes that currently use or should use idempotency, including at minimum `app/api/3d/route.ts`, `app/api/music/route.ts`, `app/api/video/route.ts`, `app/api/generate/audio/route.ts`
- Additional paid routes discovered by `rg spendCredits`, subject to staged rollout.
- Targeted tests for idempotency, ledger, admin transaction audit, failure/recovery, and no double debit.

## Proposed Migrations - Descriptive Only

1. Create `ApiIdempotency` table/model with approved fields and unique `userId + route + key`.
2. Create `CreditLedgerEntry` table/model or reconcile existing non-production table if present; include approved baseline and linkage fields.
3. Add nullable `operatorUserId`, `operatorEmail`, `decisionAt`, `decisionReason` to `AdminTransaction`.

No migration is created in P0-B. No SQL is applied.

## Tests Required in P0-C

- Prisma format/validate/generate.
- TypeScript check.
- Duplicate idempotency sequential retry.
- Duplicate idempotency concurrent retry.
- Missing idempotency infrastructure fail-closed.
- One debit only for repeated paid request.
- Ledger required on debit/grant/refund.
- Ledger failure blocks paid write.
- Refund/reversal links to original charge.
- AdminTransaction approval/rejection writes nullable audit fields.
- Legacy AdminTransaction rows with null audit fields read correctly.
- Admin history degraded mode when ledger is missing/unavailable.
- Shadow/Staging migration dry run and post-migration schema inspection.

## Remaining Risks

- Shadow/Staging availability is still `[OWNER APPROVAL REQUIRED]`.
- Current production has historical operations without ledger proof.
- Many `spendCredits` consumers outside the four idempotency routes may need phased enforcement.
- Provider dispatch can still have unknown state after network timeout unless recovery links provider request ids consistently.
- `ProviderUsageRecord` cannot be treated as authoritative ledger.
- Final TTL/lease/retention numbers are not approved.

## Unresolved Numerical Values

| Value | Status | Evidence needed |
|---|---|---|
| Processing lease duration | `[OWNER APPROVAL REQUIRED]` | Max model/job duration, route timeout, observed generation/provider timestamps. |
| Completed idempotency retention | `[OWNER APPROVAL REQUIRED]` | Product retry window, audit retention policy, storage cost. |
| Failed retry cooldown/window | `[OWNER APPROVAL REQUIRED]` | Provider failure classes and route retry behavior. |
| Cleanup cadence | `[OWNER APPROVAL REQUIRED]` | Operational job system and retention choice. |
| `decisionReason` max length | `[OWNER APPROVAL REQUIRED]` | Admin UX/privacy requirement. |

## Admin Dashboard Impact

- Generation Monitor: show ledger completeness, idempotency state, refund/reversal status, linked provider/generation details.
- Job Queues & Workers: show dispatch state, stuck lease/recovery candidates, provider request linkage where available.
- Transactions & Billing: show real operator/decision fields and legacy-null state.
- Generation History: no silent full-audit claim when ledger is missing.
- Provider Usage: remains source for provider economics, not financial ledger.
- Audit Details: should link user, generation, optional project/job, route/key, operation type/status, delta, reason, provider, model, error, timestamps.

No new dashboard page is created in P0-B.

## Future Drama Studio Impact

These decisions support future Drama Studio without starting its backend:

- optional `projectId`, `episodeId`, `sceneId`, `shotId`, `generationBlockId`, `takeId` linkage can be added through approved scalar or relation fields later.
- project credit caps and quote/requote can rely on mandatory ledger/idempotency primitives.
- reserved/actual/refunded credits require explicit ledger statuses and settlement rows.
- admin drill-down can connect Drama hierarchy to Generation/ProviderUsage/Ledger once Drama persistence is approved.

No Drama Studio table, API, job, memory store, or UI is created in P0-B.

## Deferred Scope - FLUX 3

FLUX 3 remains deferred. It is not part of Platform Integrity Remediation. It must later pass through:

`Knowledge Hub -> Extraction -> Admin Review -> Model Registry -> Routing/Pricing -> Drama Adapter`

No duration, resolution, audio, Arabic capability, or price is assumed. Arabic capability must be verified separately for prompt understanding, dialogue, synchronized audio, lip sync, and captions.

## Git Status

Status at P0-B start included pre-existing user/worktree changes plus untracked `docs/drama-studio/`. P0-B intentionally adds only:

- `docs/drama-studio/phase-2/adr_platform_financial_integrity.md`

## Confirmations

- P0-A is accepted.
- Six ADRs are documented.
- No Prisma schema was edited.
- No migration was created.
- No API or UI was edited.
- No Drama Studio backend was started.
- No Gate C.2 design file or SVG was touched.
- No Model Registry or pricing change was made.
- No live DB write was performed.
- `full_schema_init.sql` was not executed.
- Existing user/worktree changes were preserved.
- P0-B stops here pending review and explicit approval before P0-C.
