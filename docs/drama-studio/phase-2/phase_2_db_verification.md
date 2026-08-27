# Phase 2 DB Verification

Date: 2026-08-26
Scope: read-only DB verification after repository-local reference anchoring.

## 1. Executive Verdict.

[BLOCKING] Phase 2 implementation remains blocked. Live DB verification confirms that `CreditLedgerEntry`, `ApiIdempotency`, and exact table `Asset` are not present in the live `public` schema. `CreditLedgerEntry` exists in migration history only, while `ApiIdempotency` was not found in Prisma schema, migration history, or live DB.

[EXISTS] The live DB does contain `AdminTransaction`, `Generation`, `ProviderUsageRecord`, `GenerationRequestSnapshot`, `CinemaProject`, `CinemaShot`, `CinemaAsset`, and `CinemaJob`.

[SCHEMA DRIFT] `AdminTransaction` is wider in Prisma than live DB: Prisma includes operator/decision fields at `prisma/schema.prisma:170`, but live DB has only `id`, `userId`, `plan`, `amount`, `credits`, `paymentStatus`, `createdAt`.

[MIGRATION ONLY] `CreditLedgerEntry` appears in `prisma/full_schema_init.sql:53-63`, and code reads/writes it via raw/optional paths, but live DB search found no `public."CreditLedgerEntry"` table.

## 2. Verification Environment.

- Repository root: `E:\موقع ثاني\next14 ai saas\next14-ai-saas-main\next14-ai-saas-main`.
- Prisma datasource: PostgreSQL, `url = env("DATABASE_URL")`, `directUrl = env("DIRECT_URL")` at `prisma/schema.prisma:11-16`.
- Live DB metadata query: Prisma raw metadata query inside `BEGIN READ ONLY`.
- Live DB result: connected to database name `neondb`, schema `public`, PostgreSQL server `17.11 (df1f1a3)`.
- Sensitive data policy: no connection string, password, token, or secret value is printed in this report.

## 3. Safety and Read-Only Confirmation.

[EXISTS] The successful DB inspection returned `transaction_read_only = on` from `current_setting('transaction_read_only')`.

No `INSERT`, `UPDATE`, `DELETE`, `CREATE`, `ALTER`, `DROP`, migration command, `prisma db push`, `prisma migrate dev`, or Prisma Studio command was run.

The first sandboxed attempt failed with a reachability error to the configured Neon host. The successful retry used the same read-only metadata query with escalation for network access only.

## 4. Prisma Schema Snapshot.

Prisma models found:

| Entity | Prisma status | Evidence |
|---|---|---|
| `CreditLedgerEntry` | [MISSING] | `rg` found no `model CreditLedgerEntry` in `prisma/schema.prisma`; code references are raw/optional |
| `ApiIdempotency` | [MISSING] | `rg` found no `model ApiIdempotency` in `prisma/schema.prisma`; `lib/idempotency.ts:5-6` casts optional `prismadb.apiIdempotency` |
| `AdminTransaction` | [EXISTS] | `prisma/schema.prisma:170` |
| `Generation` | [EXISTS] | `prisma/schema.prisma:77` |
| `ProviderUsageRecord` | [EXISTS] | `prisma/schema.prisma:118` |
| `GenerationRequestSnapshot` | [EXISTS] | `prisma/schema.prisma:146` |
| `Asset` | [MISSING] | no `model Asset` found |
| `CinemaProject` | [EXISTS] | `prisma/schema.prisma:339` |
| `CinemaShot` | [EXISTS] | `prisma/schema.prisma:362` |
| `CinemaAsset` | [EXISTS] alternative asset table | `prisma/schema.prisma:423` |
| `CinemaJob` | [EXISTS] | `prisma/schema.prisma:438` |
| `TimelineProject` | [EXISTS] reusable JSON project table | `prisma/schema.prisma:644` |
| `ReapJob` | [EXISTS] separate job family | `prisma/schema.prisma:850` |

## 5. Migration History Snapshot.

Migration/search evidence:

| Entity | Migration status | Evidence |
|---|---|---|
| `CreditLedgerEntry` | [MIGRATION ONLY] | `prisma/full_schema_init.sql:53-63` creates table and indexes |
| `ApiIdempotency` | [MISSING] | no migration hit from `rg -n --glob '*.sql' "ApiIdempotency"` |
| `AdminTransaction` | [EXISTS] | `prisma/full_schema_init.sql:81-91` |
| `Generation` | [EXISTS] | `prisma/full_schema_init.sql:39-51`; additional columns in `prisma/add_generation_columns.sql:5-7` and poster fields in `prisma/migrations/manual/2026-08-02-generation-video-posters.sql:4-10` |
| `ProviderUsageRecord` | [PRISMA ONLY] from searched SQL history | no searched SQL hit creating `ProviderUsageRecord`, despite live table and Prisma model |
| `GenerationRequestSnapshot` | [PRISMA ONLY] from searched SQL history | no searched SQL hit creating `GenerationRequestSnapshot`, despite live table and Prisma model |
| `Asset` | [MISSING] | no exact table creation hit |
| `CinemaProject` | [EXISTS] | `prisma/cinema_manual_init.sql:1`; `prisma/full_schema_init.sql:142` |
| `CinemaShot` | [EXISTS] | `prisma/cinema_manual_init.sql:16`; `prisma/full_schema_init.sql:158` |
| `CinemaAsset` | [EXISTS] | `prisma/cinema_manual_init.sql:68`; `prisma/full_schema_init.sql:210` |
| `CinemaJob` | [EXISTS] | `prisma/cinema_manual_init.sql:80`; `prisma/full_schema_init.sql:222` |

## 6. Live Database Snapshot.

Live exact table search found these requested names in `public`: `AdminTransaction`, `CinemaJob`, `CinemaProject`, `CinemaShot`, `Generation`, `GenerationRequestSnapshot`, `ProviderUsageRecord`.

Live exact table search did not find: `CreditLedgerEntry`, `ApiIdempotency`, `Asset`.

Alternative table search found: `CinemaAsset`, `ReapJob`, `TimelineProject`, `TransitionJob`, `TransitionProject`, `VariationJob`, `VariationProject`.

Live row-count metadata, aggregate only:

| Table | Rows |
|---|---:|
| `AdminTransaction` | 16 |
| `CinemaAsset` | 0 |
| `CinemaJob` | 0 |
| `CinemaProject` | 8 |
| `CinemaShot` | 27 |
| `Generation` | 1157 |
| `GenerationRequestSnapshot` | 536 |
| `ProviderUsageRecord` | 723 |
| `ReapJob` | 0 |
| `TimelineProject` | 0 |
| `TransitionJob` | 44 |
| `TransitionProject` | 40 |
| `VariationJob` | 2 |
| `VariationProject` | 2 |

No live views, triggers, enums, or RLS policies were returned for the inspected tables. RLS is disabled and not forced for every inspected live table.

## 7. CreditLedgerEntry Verification.

[BLOCKING -- CREDIT LEDGER TABLE NOT FOUND]

Prisma: no `model CreditLedgerEntry` exists in `prisma/schema.prisma`.

Migration: `prisma/full_schema_init.sql:53-63` creates `CreditLedgerEntry` with `id`, `userId`, optional `generationId`, `type`, `amount`, `balanceAfter`, `createdAt`, and indexes on `userId`, `createdAt`, `generationId`.

Live DB: exact table search did not find `public."CreditLedgerEntry"`.

Code evidence:

- `lib/credit-ledger.ts:107` defines `tryCreateCreditLedgerEntry`.
- `lib/credit-ledger.ts:732`, `:839`, `:890`, and `:1077` attempt ledger entries during spend/refund/rollback flows.
- `lib/admin/history-read-model.ts:433-438` reads `FROM "CreditLedgerEntry"` in history.
- `app/api/admin/generations/[id]/route.ts:125` reads `FROM "CreditLedgerEntry"`.

Required Drama support cannot be verified because the table is absent live. Existing migration shape, even if applied later, does not prove support for reservation, quote reference, idempotency reference, provider actual cost, balance-before, or reversal semantics. No Prisma change is proposed in this round.

## 8. ApiIdempotency Verification.

[BLOCKING -- IDEMPOTENCY TABLE NOT FOUND]

Prisma: no `model ApiIdempotency` exists in `prisma/schema.prisma`.

Migration: no searched SQL migration creates `ApiIdempotency`.

Live DB: exact and alternative metadata search did not find an idempotency table.

Code evidence:

- `lib/idempotency.ts:5-6` casts optional `prismadb.apiIdempotency`.
- `lib/idempotency.ts:16-24` reads an `idempotency-key` header.
- `lib/idempotency.ts:26-29` hashes the request body.
- `lib/idempotency.ts:38-58` expects unique scope `{ userId, route, key }`, compares `requestHash`, and replays `responseStatus`/`responseJson`.
- `lib/idempotency.ts:70-78` attempts create.
- `lib/idempotency.ts:119-145` attaches a generation and stores completion response.

Quote, credit reservation, generation submission, retry, refund/reversal, final assembly, and export idempotency cannot be considered infrastructure-ready until the live table exists and its unique constraints/TTL/conflict semantics are verified. No replacement is created in this round.

## 9. AdminTransaction and Ledger Alternatives.

`AdminTransaction` exists in Prisma, migration history, and live DB, but it is not a generation credit ledger.

Live columns: `id`, `userId`, `plan`, `amount`, `credits`, `paymentStatus`, `createdAt`.

Live constraints:

- Primary key: `AdminTransaction_pkey`.
- Foreign key: `userId` references `User(id)` with cascade delete.

Live indexes:

- `AdminTransaction_pkey`.
- `AdminTransaction_userId_idx`.
- `AdminTransaction_paymentStatus_idx`.

[SCHEMA DRIFT] Prisma has additional fields `operatorUserId`, `operatorEmail`, `decisionAt`, `decisionReason` at `prisma/schema.prisma:178-181`; live DB did not return those columns.

[REUSE] `AdminTransaction` can remain payment/manual transfer evidence. It must not be stretched into Drama generation reservation/debit/refund/reversal ledger.

## 10. Generation Lifecycle Verification.

`Generation` is [ALIGNED] across Prisma, migration history, and live DB at the core lifecycle level, with additive migration history for output/status/poster fields.

Live columns include: `id`, `userId`, `prompt`, `mediaUrl`, `assetType`, `modelUsed`, `cost`, `isFlagged`, `createdAt`, `outputUrl`, `status`, `type`, `duration`, `providerCostUsd`, `providerCredits`, `providerTokens`, `resolution`, `aspectRatio`, `providerCostSource`, `providerModel`, `providerName`, `providerRequestId`, `quality`, `posterUrl`, `posterStatus`, `posterGeneratedAt`, `posterError`, `isFavorite`.

Live constraints:

- Primary key: `Generation_pkey`.
- Foreign key: `userId` references `User(id)` with cascade delete.

Live indexes:

- `Generation_userId_idx`, `Generation_createdAt_idx`, `Generation_isFavorite_idx`, `Generation_posterStatus_idx`, and primary key.

Code evidence for lifecycle helpers:

- `lib/credit-ledger.ts:638` defines `spendCredits`.
- `lib/credit-ledger.ts:855` defines `refundGenerationCharge`.
- `lib/credit-ledger.ts:899` defines `setGenerationMediaUrl`.
- `lib/credit-ledger.ts:1048` defines `rollbackGenerationCharge`.

[ADAPTER REQUIRED] Drama can reuse `Generation` for actual model execution records, but the live table has no project/episode/scene/beat/shot/generation-block/take columns. Drama hierarchy linkage must not be assumed.

## 11. Provider Usage Verification.

`ProviderUsageRecord` is [DATABASE + PRISMA] and [PRISMA ONLY] relative to searched SQL migration history.

Live columns include: `id`, `userId`, optional `generationId`, `providerName`, `providerModel`, `providerRequestId`, `providerCostUsd`, `providerTokens`, `providerCredits`, `providerCostSource`, `duration`, `resolution`, `quality`, `aspectRatio`, `status`, `rawPayloadSafe`, `createdAt`, `updatedAt`.

Live constraints:

- Primary key: `ProviderUsageRecord_pkey`.
- `generationId` references `Generation(id)` with `ON DELETE SET NULL`.
- `userId` references `User(id)` with cascade delete.

Live indexes:

- `ProviderUsageRecord_userId_idx`.
- `ProviderUsageRecord_generationId_idx`.
- `ProviderUsageRecord_providerRequestId_idx`.
- `ProviderUsageRecord_createdAt_idx`.

Code evidence:

- `lib/credit-ledger.ts:1351` updates provider usage by generation.
- `lib/credit-ledger.ts:1426` updates provider usage by request id.
- `lib/provider-cost-capture.ts:147-167` describes idempotent provider usage capture without double-counting.

[REUSE] This is reusable for Drama provider economics and execution telemetry, through a Drama adapter that links blocks/takes to `Generation`.

## 12. Asset and Storage Verification.

Exact requested `Asset` table: [MISSING] in Prisma, migration history, and live DB.

Alternative live asset table: `CinemaAsset` [ALIGNED].

`CinemaAsset` live columns: `id`, `projectId`, optional `shotId`, `type`, `url`, optional `thumbnailUrl`, `metadata`, `createdAt`.

`CinemaAsset` constraints: primary key and `projectId` foreign key to `CinemaProject(id)` with cascade delete. No live FK was returned for `shotId`.

Storage code evidence:

- Storage runtime config has `activeWriteProvider`, `mediaDeliveryMode`, and `legacyReadEnabled` at `lib/storage/runtime.ts:16-19`.
- Default active writer is Backblaze and delivery mode is proxy at `lib/storage/runtime.ts:73-76`.
- Provider registry defines Backblaze, R2, and Supabase providers at `lib/storage/provider-registry.ts:26-28`.
- R2 provider is read-only legacy in `lib/storage/r2.ts:16`, `:61`, and `:93`.
- `/api/media` has direct fallback comments for Backblaze, R2, and Supabase at `app/api/media/[...path]/route.ts:145`, `:164`, and `:183`.
- Storage lifecycle audits Generation outputs and Generation snapshots at `lib/storage/storage-lifecycle.ts:55-100`.

[ADAPTER REQUIRED] Drama asset lineage can reuse Storage Runtime and `CinemaAsset` concepts, but no generic `Asset` table exists and no live `shotId` FK enforces shot ownership in `CinemaAsset`.

## 13. User Isolation and RLS Verification.

Live DB RLS metadata returned `rls_enabled=false` and `rls_forced=false` for every inspected table: `AdminTransaction`, `CinemaAsset`, `CinemaJob`, `CinemaProject`, `CinemaShot`, `Generation`, `GenerationRequestSnapshot`, `ProviderUsageRecord`, `ReapJob`, `TimelineProject`, `TransitionJob`, `TransitionProject`, `VariationJob`, `VariationProject`.

No policies were returned from `pg_policies` for inspected tables.

User isolation is therefore application-level in the inspected repository, not DB-level RLS. Evidence includes user foreign keys in `Generation`, `ProviderUsageRecord`, `AdminTransaction`, `CinemaProject`, `CinemaJob`, `TimelineProject`, transition/variation tables, and route-level user checks in existing APIs.

[BLOCKING] Drama must not assume DB-enforced tenant isolation. Any Phase 2 implementation must prove user scoping in service/API logic before writes.

## 14. Prisma/Migration/Database Alignment Matrix.

| Entity | Prisma | Migration history | Live DB | Alignment |
|---|---|---|---|---|
| `CreditLedgerEntry` | no model | `prisma/full_schema_init.sql:53-63` | not found | [MIGRATION ONLY] / [BLOCKING] |
| `ApiIdempotency` | no model | not found | not found | [MISSING] / [BLOCKING] |
| `AdminTransaction` | model exists | exists | exists with fewer columns | [SCHEMA DRIFT] |
| `Generation` | model exists | exists | exists | [ALIGNED] |
| `ProviderUsageRecord` | model exists | no searched creation hit | exists | [SCHEMA DRIFT] relative to migration history |
| `GenerationRequestSnapshot` | model exists | no searched creation hit | exists | [SCHEMA DRIFT] relative to migration history |
| `Asset` | no model | not found | not found | [MISSING] |
| `CinemaAsset` | model exists | exists | exists | [ALIGNED] alternative |
| `CinemaProject` | model exists | exists | exists | [ALIGNED] |
| `CinemaShot` | model exists | exists | exists | [ALIGNED] |
| `CinemaJob` | model exists | exists | exists | [ALIGNED] |
| `TimelineProject` | model exists | not in searched SQL output | exists | [DATABASE + PRISMA] / migration provenance unresolved |
| `ReapJob` | model exists | not in searched SQL output | exists | [DATABASE + PRISMA] / migration provenance unresolved |

## 15. Reusable Infrastructure.

[REUSE] `Generation` is the central generation execution record, but Drama needs adapter linkage to blocks/takes.

[REUSE] `ProviderUsageRecord` can carry provider economics, request id, actual/estimated cost source, duration, resolution, quality, aspect ratio, and status.

[REUSE] `GenerationRequestSnapshot` can preserve request payload metadata per generation, but current one-to-one generation shape is not enough for full Drama project memory.

[REUSE] `CinemaProject`, `CinemaShot`, `CinemaAsset`, and `CinemaJob` are real live tables suitable as legacy/prototype evidence for project, shot, asset, and job concepts.

[REUSE] Storage Runtime and `/api/media` can remain the asset delivery foundation.

## 16. Adapter Requirements.

[ADAPTER REQUIRED] Drama job submission must link `Project -> Episode -> Scene -> Beat -> Shot -> GenerationBlock -> Take` to existing `Generation` without creating duplicate finance/provider ledgers.

[ADAPTER REQUIRED] Credit lifecycle must wait for a real ledger/idempotency decision because the required live tables are absent.

[ADAPTER REQUIRED] Asset lineage must choose whether to extend/reuse `CinemaAsset`, attach metadata to `Generation`, or use another approved store after ADR.

[ADAPTER REQUIRED] Admin history must gracefully handle absent `CreditLedgerEntry`, because current read models query it by raw SQL.

[ADAPTER REQUIRED] User isolation must be explicit at service/API level because DB RLS is disabled.

## 17. Blocking Findings.

- [BLOCKING -- CREDIT LEDGER TABLE NOT FOUND] `CreditLedgerEntry` does not exist in live DB.
- [BLOCKING -- IDEMPOTENCY TABLE NOT FOUND] `ApiIdempotency` does not exist in live DB or migration history.
- [BLOCKING] Exact `Asset` table is missing; only `CinemaAsset` exists as an alternative.
- [BLOCKING] DB RLS is disabled for inspected tables, so Drama cannot rely on database tenant isolation.
- [BLOCKING] `AdminTransaction` Prisma/live schema drift must be understood before relying on operator/decision fields.
- [BLOCKING] Drama hierarchy has no live physical representation beyond `CinemaProject -> CinemaShot`; Episode/Scene/Beat/GenerationBlock/Take are not DB-proven.

## 18. Non-Blocking Findings.

- [NON-BLOCKING] `CinemaJob` exists live but has zero rows, so reuse is structurally possible but production behavior is not proven by live usage.
- [NON-BLOCKING] `CinemaAsset` exists live but has zero rows and no live `shotId` FK; lineage needs adapter/ADR.
- [NON-BLOCKING] `TimelineProject.stateJson` exists live and may support board/project JSON experiments, but migration provenance was not established in searched SQL output.
- [NON-BLOCKING] No live triggers/views/enums were found for inspected Drama-relevant tables.

## 19. Impact on the Ten ADRs.

1. Beat physical representation ADR: still required; DB only proves `CinemaShot`, not Beat.
2. Drama project/entity physical mapping ADR: now must include live absence of Episode/Scene/Beat/GenerationBlock/Take.
3. Project memory and retrieval ADR: must choose storage without assuming RLS or dedicated memory tables.
4. Drama job and Generation linkage ADR: must link to `Generation`/`ProviderUsageRecord` and decide whether `CinemaJob` is reused.
5. QuoteSnapshot/staleness/credit cap ADR: blocked by absent live ledger/idempotency tables.
6. Board persistence and Canvas reuse ADR: can consider `TimelineProject.stateJson`, but DB provenance is incomplete.
7. Feature flag and preview banner ADR: unaffected by DB verification; still no implementation this round.
8. Audio timeline and voice-character continuity ADR: no DB support proven in inspected tables.
9. Asset lineage and Take versioning ADR: must account for missing exact `Asset` table and zero-row `CinemaAsset`.
10. Admin observability mapping ADR: must handle absent `CreditLedgerEntry` and Prisma/live drift in `AdminTransaction`.

## 20. FLUX 3 Deferred Registry Requirement.

FLUX 3 Video Family remains a mandatory Phase 2 Model Registry integration candidate.
No FLUX 3 definitions currently exist in lib/ or app/api/.
Implementation is deferred until Registry and Pricing ADRs are approved.

Deferred family paths:

- Text-to-Video.
- Text-to-Video Draft.
- Image-to-Video.
- Image-to-Video Draft.
- Start/End-to-Video.
- Start/End-to-Video Draft.
- Video Extend.
- Video Extend Draft.
- Upscale if proven.

Pinned later requirements from owner instruction:

- Duration 5-20 seconds.
- 720p/1080p for final routes.
- Optional synchronized audio.
- Reference image support in Image-to-Video.
- Start/End Frames in the dedicated route.
- Video Extension in the dedicated route.
- Arabic support remains separate and must not be activated without evidence or runtime validation.

## 21. Recommended Next Step.

Do not start Phase 2 implementation yet.

Recommended next step is a dedicated Owner Decisions session for the six owner decisions, followed by the ten ADRs. The first ADR should address finance/idempotency because live DB verification found both required infrastructure tables absent or unapplied.

## 22. Explicit Stop Statement.

This round completed only repository reference anchoring and read-only DB verification documentation. No Owner Decisions session, ADR writing, Prisma change, migration, API change, UI change, Model Registry change, Pricing change, Admin change, Storage runtime change, or FLUX 3 implementation was started.
