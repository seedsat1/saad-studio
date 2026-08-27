# Drama Studio Phase 1.1 Repository Spike Report

Date: 2026-08-26

## 1. Authorization

Authorized scope: Phase 1.1 Repository Spike after approval of:

- `docs/drama-studio/phase_1_architecture_v3.md`
- `docs/drama-studio/phase_1_1_repository_spike_plan.md`

Allowed output for this spike: this report only.

## 2. Read-Only Confirmation

No TypeScript, TSX, Prisma, migration, API, UI, navigation, pricing, registry, admin, storage, package, or database command was modified or executed.

The only created file in this spike is:

- `docs/drama-studio/phase_1_1_spike_report.md`

`PROJECT_CONTEXT.md` was read because workspace instructions require reading memory before work, but it was not modified because the user explicitly forbade memory/doc updates outside this report.

## 3. Worktree Snapshot Before Inspection

`git status --short` before spike inspection showed pre-existing changes:

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

`git diff --stat` before spike inspection showed 14 modified/deleted tracked paths and 1537 insertions / 265 deletions. These changes pre-existed this report.

## 4. Methodology

The spike used read-only repository inspection with `rg`, `git status --short`, `git diff --stat`, and PowerShell line counting. No dependency install, database command, server command, formatter, migration, or codemod was run.

Classification terms:

- PROVEN: directly supported by repository path, line, and symbol.
- PARTIAL: supported by existing infrastructure, but not sufficient for Drama as specified.
- MISSING: no matching implementation found in inspected paths.
- CONTRADICTED: current implementation conflicts with approved Phase 1 architecture.
- UNRESOLVED: requires a later ADR or repository decision.
- OWNER DECISION REQUIRED: product/architecture owner must choose before implementation.

## 5. Files Read

Phase 1.1 and Phase 1.1.1 used read-only inspection of repository files and approved Drama documents. Exact file and line counts from the earlier spike have been removed from this report because the working tree is active and counts can become stale between inspections. Evidence below therefore relies on concrete repository paths and line references from the inspected working-tree content, not copied counts.

Primary inspected areas:

- Governance and project memory: `AGENTS.md`, `PROJECT_CONTEXT.md`, `saad-agent/SAAD_AGENT_CONTEXT.md`, `docs/saad-studio-premiere-reference-ar.md`.
- Approved Drama sources: `docs/drama-studio/phase_1_architecture_v3.md`, `docs/drama-studio/phase_1_1_repository_spike_plan.md`.
- Drama prototype route: `app/(dash)/(routes)/drama-studio/page.tsx`.
- Domain and persistence: `prisma/schema.prisma`, `app/api/cinema/*`, `app/api/timeline/*`.
- Registry and pricing: `lib/model-definition-registry.ts`, `lib/video-model-registry.ts`, `lib/image-models.ts`, `lib/dynamic-model-loader.ts`, `lib/pricing.ts`, `app/api/pricing/quote/route.ts`, `app/api/admin/models/route.ts`, `app/api/models/route.ts`, `app/api/model-definitions/route.ts`.
- Credits, ledger, and idempotency: `lib/credit-ledger.ts`, `lib/idempotency.ts`, `lib/admin/history-read-model.ts`.
- Storage and assets: `lib/storage/*`, `lib/r2-storage.ts`, `lib/supabase-storage.ts`, `lib/media/public-url-resolver.ts`, `app/api/assets/*`, `app/api/media/*`, `app/api/studio/upload-url/route.ts`, `app/api/panel/upload-url/route.ts`.
- Admin and audit: `app/admin/history/page.tsx`, `app/admin/jobs/page.tsx`, `app/api/admin/history/route.ts`, `app/api/admin/jobs/route.ts`, `app/api/admin/generations/[id]/route.ts`, `lib/admin/jobs-read-model.ts`, `lib/admin/history-read-model.ts`.
- Board/canvas: `app/(dash)/(routes)/canvas/page.tsx`, `app/(dash)/(routes)/cinema-board/page.tsx`, `components/canvas/*`.
- i18n and navigation evidence: `lib/use-language.ts`, `components/TopNavbar.tsx`, `lib/navigation.ts`.
- Inngest evidence: `lib/inngest/client.ts`, `lib/inngest/functions/hello-world.ts`, `app/api/inngest/route.ts`.

## 6. Executive Summary

Phase 1.1 confirms that the repository already has useful foundations: `Generation`, `ProviderUsageRecord`, `GenerationRequestSnapshot`, `CinemaProject`/`CinemaShot`/`CinemaJob`, central model definitions, video/image/audio model registries, storage runtime, admin history/jobs read models, product feature registry, language hook, and reusable Canvas UI primitives.

The current Drama Studio page is not a reliable implementation base for Phase 2. It is a local-state prototype with hardcoded project data, hardcoded model choices, demo labels, settings clicks that write chat messages, and no `/drama-studio/[projectId]` or production route.

Recommended Phase 2 posture:

- Reuse existing platform primitives where proven.
- Do not create new Ledger, Idempotency, Admin History, Pricing, Storage, or Registry subsystems.
- Do not reuse current Drama page as backend truth.
- Treat Beat storage, project memory physical model, Drama job shape, quote staleness, Board persistence, and feature gate mechanism as required ADRs before implementation.

## 7. Axes Table

| Axis | Status | Evidence | Decision Impact |
|---|---|---|---|
| 1. Current Drama route | CONTRADICTED | `app/(dash)/(routes)/drama-studio/page.tsx:429` demo label, `:82-98` hardcoded brief, `:272` hardcoded model, `:288-291` hardcoded generation controls | Replace with contract-driven routes |
| 2. Required Drama routes | MISSING | Only `/drama-studio/page.tsx` found; no inspected `[projectId]` or production route | Phase 2 route creation required |
| 3. Navigation/Hero | PROVEN existing but off-limits | `lib/navigation.ts:48`, `components/TopNavbar.tsx:197` | Keep unchanged until explicit approval |
| 4. Prisma reusable models | PARTIAL | `Generation` `schema.prisma:77`, `CinemaProject:339`, `CinemaShot:362`, `CinemaJob:438`, `TimelineProject:644` | Extend/reuse through ADR; no premature tables |
| 5. Beat physical model | UNRESOLVED | No `Beat` model in `schema.prisma`; JSON-capable `TimelineProject.stateJson` at `:649`, `CinemaJob.payload` at `:449` | ADR required |
| 6. Project memory | MISSING/PARTIAL | Voice Agent has `planJson/timelineJson/transcriptJson` at `schema.prisma:941-944`; no Drama memory models | ADR required |
| 7. Jobs | PARTIAL | `CinemaJob` `schema.prisma:438`, Generation task marker in `lib/credit-ledger.ts:995`, jobs read model `lib/admin/jobs-read-model.ts:26-49` | Prefer Drama job linked to Generation; ADR required |
| 8. Credits/Ledger | PARTIAL | `spendCredits` `lib/credit-ledger.ts:638`, refunds `:855`, admin history raw `CreditLedgerEntry` query `lib/admin/history-read-model.ts:436-439`; no Prisma model found | Reuse ledger linkage; no duplicate ledger |
| 9. Idempotency | PARTIAL | `lib/idempotency.ts:15`, `:29`, `:112`, `:128`; no Prisma model found in `schema.prisma` | Reuse infrastructure only if DB object verified in migrations/DB |
| 10. Quote | PARTIAL | `/api/pricing/quote` `app/api/pricing/quote/route.ts:20`, `:54`; `GenerationCostQuote` `lib/pricing.ts:417` | Add Drama quote contract; staleness unresolved |
| 11. Model registry | PROVEN | `VIDEO_MODEL_REGISTRY` capability fields `lib/video-model-registry.ts:658-841`; central definitions `lib/model-definition-registry.ts:73`, `:564`, `:638`, `:789` | Selectors must use exports only |
| 12. Storage/assets | PROVEN/PARTIAL | runtime config `lib/storage/runtime.ts:12-23`, provider registry `lib/storage/provider-registry.ts:6-17`, asset API media grouping `app/api/assets/route.ts:141-212` | Reuse storage runtime and Generation assets |
| 13. Admin | PROVEN/PARTIAL | control links `lib/admin/control-center.ts` inspected; jobs read model `lib/admin/jobs-read-model.ts:544-548`, history read model `lib/admin/history-read-model.ts:268-278` | Extend existing views by feature metadata |
| 14. Board/Canvas | PARTIAL | Canvas localStorage `app/(dash)/(routes)/canvas/page.tsx:1184`, `:1917-1936`, `:2788-2793`; components reusable `components/canvas/canvas-context.tsx:6-20` | Refactor to project-aware shared Board |
| 15. i18n/layout | PARTIAL | `useLanguage` forces `dir=ltr` `lib/use-language.ts:12-19`, Drama inline `isAr` at `page.tsx:71-72`, content `dir` at `:446`, chat messages on settings `:365-373` | Keep spatial layout stable; replace chat side effects |
| 16. Long video scheduler | MISSING | No Drama scheduler found; model duration data exists in registries | Build scheduler after ADRs |

## 8. Detailed Evidence

### 8.1 Current Drama Studio Page

Status: CONTRADICTED.

Evidence:

- Local demo state and hardcoded content are present: `app/(dash)/(routes)/drama-studio/page.tsx:82-98`.
- Chat state is local React state: `app/(dash)/(routes)/drama-studio/page.tsx:105`.
- Settings updates append messages: `app/(dash)/(routes)/drama-studio/page.tsx:365-373`, contradicting the approved rule "no messages for every settings click".
- Hardcoded selected model exists: `app/(dash)/(routes)/drama-studio/page.tsx:272`.
- Hardcoded generation controls exist: `app/(dash)/(routes)/drama-studio/page.tsx:288-291`.
- Page exposes demo wording: `app/(dash)/(routes)/drama-studio/page.tsx:429`.

Conclusion: do not evolve this page directly as source of truth. It can inform visual intent only after removal/replacement of prototype assumptions.

### 8.2 Required Route Shape

Status: MISSING.

The repo inspection found the single current Drama route `app/(dash)/(routes)/drama-studio/page.tsx`. No proven files for:

- `/drama-studio/[projectId]`
- `/drama-studio/[projectId]/episodes/[episodeId]/production`

Phase 2 must create the two missing route surfaces only after architecture gates are closed. No fourth Drama route is authorized.

### 8.3 Domain-to-Prisma Reuse Map

| Logical Entity | Current Prisma Match | Status | Evidence | Recommendation |
|---|---|---|---|---|
| Project | `CinemaProject` partial; `TimelineProject` JSON alternative | PARTIAL | `schema.prisma:339`, `:644-649` | Prefer dedicated Drama projection only after reuse ADR; do not force Cinema semantics |
| Season | none | MISSING | no `Season` model found | Optional logical layer; physical representation [غير محسوم] |
| Episode | none | MISSING | no `Episode` model found | Required logical entity; physical representation [غير محسوم] |
| Scene | `CinemaShot` is not scene; `TimelineProject.stateJson` can store JSON | PARTIAL | `schema.prisma:362`, `:649` | Do not map Scene to `CinemaShot` directly |
| Beat | none | MISSING | no `Beat` model found | ADR required |
| Shot | `CinemaShot` partial | PARTIAL | `schema.prisma:362`, API create at `app/api/cinema/shot/route.ts:21` | Reuse concepts, not necessarily table |
| GenerationBlock | `GenerationRequestSnapshot`, `CinemaJob.payload` partial | PARTIAL | `schema.prisma:146`, `:449` | Link block to Generation/Job; physical model [غير محسوم] |
| Take | `Generation` output partial | PARTIAL | `schema.prisma:77-115` | Recommended: Take references Generation, do not replace Generation |
| Asset | `CinemaAsset`, `Generation.mediaUrl/outputUrl`, asset API | PARTIAL | `schema.prisma:423`, `app/api/assets/route.ts:141-212` | Reuse storage/media URL normalization |
| Approved Decision | `AdminTransaction.decision*` unrelated; Voice Agent approvals unrelated | MISSING/PARTIAL | `schema.prisma:180-181`, `:1048` | New Drama decision contract likely needed |
| Version Memory | `TimelineProject.stateJson` partial; no append-only version model | PARTIAL | `schema.prisma:644-649` | ADR required |

### 8.4 Beat ADR Inputs

Status: OWNER DECISION REQUIRED.

Options remain:

- Independent table: best queryability, approvals, QC, and versioning; requires migration.
- Embedded JSON: fastest reuse via `TimelineProject.stateJson` or project payload; weaker integrity and querying.
- Discriminated structure: good contract boundary for mixed physical storage; still needs schema/versioning discipline.

Repository reality:

- JSON storage is proven in `TimelineProject.stateJson` at `schema.prisma:649`.
- Cinema job payload JSON is proven at `schema.prisma:449`.
- No `Beat` model is proven in `schema.prisma`.

Recommendation: use discriminated logical contract now, with a Phase 2 ADR choosing independent Beat table unless implementation constraints require JSON.

### 8.5 Project Memory ADR Inputs

Status: OWNER DECISION REQUIRED.

Approved logical layers remain:

1. Project Bible
2. Character Memory
3. Location Memory
4. Element Memory
5. Narrative Timeline
6. Episode / Scene Memory
7. Continuity Snapshots
8. Approved Decisions
9. Version Memory

Repository reality:

- User libraries exist for Character, Element, Location, Effect, Camera, Palette: `schema.prisma:661`, `:679`, `:697`, `:715`, `:733`, `:751`.
- Voice Agent has task memory-like JSON fields: `schema.prisma:941-944`, but it is a separate feature and not proof for Drama.
- No Drama-specific Project Bible, memory retrieval, approved decision, or version memory physical model exists.
- Approved Decisions and Version Memory are independent logical layers; merging them is not authorized.
- Style Memory is not an approved replacement for Narrative Timeline.

Recommendation: do not reuse Voice Agent tables. Define Drama memory as scoped, versioned, retrieval-friendly records linked to `projectId`, with exact physical mapping resolved in ADR. Recommended ADR: Evaluate Style Memory as an optional Layer 10.

### 8.6 Jobs Strategy

Status: PARTIAL / OWNER DECISION REQUIRED.

Proven:

- `CinemaJob` exists with `status`, `taskId`, `creditsCost`, `payload`, and project relation: `schema.prisma:438-457`.
- Cinema generation creates `CinemaJob`: `app/api/cinema/generate/route.ts:142`.
- Cinema polling updates job and creates `CinemaAsset`: `app/api/cinema/job/[id]/route.ts:85-104`.
- `Generation` is the central historical output row: `schema.prisma:77-115`.
- Admin jobs unify sources and infer refund state: `lib/admin/jobs-read-model.ts:26-49`, `:544-548`.

Recommendation D6: create a Drama job contract linked to `Generation` rather than duplicating ledger/history/idempotency. Do not generalize `CinemaJob` blindly because its semantics are shot/project-specific.

### 8.7 Credits, Ledger, Idempotency

Status: PARTIAL.

Proven:

- `spendCredits` creates/charges generation: `lib/credit-ledger.ts:638`.
- Generation refunds exist: `lib/credit-ledger.ts:855` and rollback at `:1048`.
- Generation task marker exists: `lib/credit-ledger.ts:995`.
- Admin history summarizes `CreditLedgerEntry`: `lib/admin/history-read-model.ts:268-278`.
- Admin history loads ledger rows by raw SQL: `lib/admin/history-read-model.ts:436-439`.
- `CreditLedgerEntry` was not found as a Prisma model in `prisma/schema.prisma`.
- Idempotency helper exists: `lib/idempotency.ts:15`, `:29`, `:112`, `:128`, but `ApiIdempotency` was not found as a Prisma model in `schema.prisma`.

Recommendation:

- No duplicate Drama ledger.
- No duplicate Drama idempotency subsystem.
- Phase 2 must first verify actual DB/migration availability for `CreditLedgerEntry` and `ApiIdempotency`.
- Drama quote/generate/apply operations must link to existing ledger and idempotency where proven.

### 8.8 Quote Staleness

Status: UNRESOLVED.

Proven:

- Generic quote API exists at `app/api/pricing/quote/route.ts:20`.
- It computes base/user costs through `getGenerationCost` and provider estimate: `app/api/pricing/quote/route.ts:54`.
- `GenerationCostQuote` exists in `lib/pricing.ts:417`.
- Audio has its own quote helper: `app/api/generate/audio/route.ts:349-447`.

Not proven:

- minimum / expected / safe maximum quote shape.
- quote TTL or staleness hash.
- Drama credit cap.
- pre-generation approved quote snapshot.

Recommendation: Phase 2 requires ADR for QuoteSnapshot with input hash, model registry version, pricing source, minimum/expected/safe maximum, credit cap, expiration/staleness, and ledger linkage.

### 8.9 Registry and Capability Matrix

Status: PROVEN/PARTIAL.

Proven:

- Video registry capability fields include durations, resolutions, aspect ratios, first/last frame, reference media counts, audio support, prompt caps: `lib/video-model-registry.ts:658-841`.
- Central model definition exposes capabilities and parameters: `lib/model-definition-registry.ts:73-100`.
- Video definition maps capabilities from registry: `lib/model-definition-registry.ts:564-630`.
- Audio/music and TTS model definitions exist: `lib/model-definition-registry.ts:638-679`, `:789-830`.
- Image models have aspect ratios and quality options: `lib/image-models.ts:15-57`, `:151-544`.
- Dynamic image/video models load from `PlatformConfig`: `lib/dynamic-model-loader.ts:209-243`.
- Admin and public model APIs expose central definitions: `app/api/admin/models/route.ts:51`, `app/api/model-definitions/route.ts:23`.

Not proven:

- A single exported Capability Adapter Matrix for Drama.
- FPS as first-class model capability across all modalities.
- region and queue limits in central model definitions.

Recommendation: build Drama selectors from `CentralModelDefinition` plus modality-specific registry exports. Mark FPS/region/queue limits `[غير محسوم]` unless a real export exists.

### 8.10 Storage and Asset Versioning

Status: PROVEN/PARTIAL.

Proven:

- Storage runtime config exists: `lib/storage/runtime.ts:12-23`.
- Runtime key exists: `lib/storage/runtime.ts:70`.
- Media object resolution exists: `lib/storage/runtime.ts:115-169`.
- Provider registry exists: `lib/storage/provider-registry.ts:6-17`.
- Asset API classifies image/video/audio assets: `app/api/assets/route.ts:141-212`.
- Upload/persist flows exist in asset routes and Generation helpers.

Not proven:

- Drama-specific asset versioning.
- Take asset lineage.
- Continuity snapshot asset linkage.

Recommendation: use existing storage runtime and asset normalization; add only Drama lineage metadata after ADR.

### 8.11 Admin Integration

Status: PARTIAL.

Proven:

- Admin analytics reads generation/history/jobs/usage: `app/admin/analytics/page.tsx:212`.
- Admin jobs read model contains `generationId`, `featureId`, refund state: `lib/admin/jobs-read-model.ts:26-49`.
- Admin history read model includes ledger state and generation details: `lib/admin/history-read-model.ts:12-81`, `:268-278`.
- Feature registry admin exists: `app/admin/features/page.tsx:43-73`.

Recommendation: do not create a separate Drama admin panel initially. Extend existing admin read models with Drama `featureId`, project/job metadata, and Generation linkage after the job ADR.

### 8.12 Project Board and Canvas

Status: PARTIAL / OWNER DECISION REQUIRED.

Proven:

- `/canvas` uses React Flow and reusable components: `app/(dash)/(routes)/canvas/page.tsx:5-38`.
- Canvas workspace is localStorage-based: `app/(dash)/(routes)/canvas/page.tsx:1184`, `:1917-1936`, `:2788-2793`.
- Canvas context/actions are reusable: `components/canvas/canvas-context.tsx:6-20`.
- Canvas node types and configs are reusable: `components/canvas/canvas-types.ts:1-129`.
- `cinema-board` persists some Cinema data through Cinema APIs: `app/(dash)/(routes)/cinema-board/page.tsx:310-386`, but has hardcoded sample state at `:263-279`.

Recommendation D4/D5: refactor Canvas primitives into a shared project-aware Board embedded in `/drama-studio/[projectId]`. Do not create a fourth route. Do not use `/canvas` as persistence model without DB-backed `projectId` linkage.

### 8.13 i18n and Layout Stability

Status: PARTIAL.

Proven:

- `useLanguage` stores `saad_language` and dispatches change events: `lib/use-language.ts:8`, `:35-44`.
- `useLanguage` forces document direction to LTR even for Arabic: `lib/use-language.ts:12-19`, `:39-40`.
- TopNavbar uses the language hook: `components/TopNavbar.tsx:9`, `:121`.
- Drama page uses inline `isAr` text and local `dir` on content fields: `app/(dash)/(routes)/drama-studio/page.tsx:71-72`, `:446`, `:800`.
- Drama setting changes append chat messages: `app/(dash)/(routes)/drama-studio/page.tsx:365-373`.

Recommendation: keep Agent left / Workbench right independent of language. Use central copy/dictionary for Drama, keep document layout LTR, and allow RTL only inside text content/editors.

### 8.14 Storyboard

Status: MISSING/PARTIAL.

Proven:

- Existing storyboard routes exist under RunningHub, including `storyboard-production`: `app/api/runninghub/storyboard-production/route.ts` inspected by search.
- No Drama optional storyboard contract with `No Storyboard / Keyframes / Full Storyboard` is proven.

Recommendation: implement storyboard as optional project/episode/scene/shot setting after quote and asset ADRs. Do not make it mandatory.

### 8.15 Long Video Scheduler

Status: MISSING.

Proven inputs:

- Model duration capabilities are exported by video registry: `lib/video-model-registry.ts:658-841`.
- Central model definitions expose duration/resolution/aspect parameters: `lib/model-definition-registry.ts:602-604`.

Missing:

- Scheduler for 5+ minute episodes.
- Dialogue/action/silence duration calculator.
- Block splitting across Episode -> Scene -> Beat -> Shot -> GenerationBlock -> Take.
- Cut/Chaining/Extension selector.
- Context Packet creation per Block.
- pre-charge plan display.

Recommendation: Phase 2 cannot generate long video until scheduler contract, quote contract, and model capability adapter are implemented.

### 8.16 Audio Tracks

Status: PARTIAL.

Proven:

- TTS/music/lipsync definitions exist in `lib/model-definition-registry.ts:263-455`, `:638-830`.
- Voice catalog exists: `lib/voice-catalog.ts:1`, `:17`.
- Voice registry file-backed helper exists: `lib/voice-registry.ts:4-25`.
- Captions route exists: `app/api/panel/generate/captions/route.ts:29-55`.
- Music route exists: `app/api/panel/generate/music/route.ts:26-230`.
- TTS route exists: `app/api/panel/generate/tts/route.ts:19-168`.
- Final export mixes video/audio clips: `app/api/studio/export/route.ts:111-251`.

Not proven:

- Seven-track Drama production timeline contract.
- Audio continuity snapshots.
- voice memory tied to character memory.

Recommendation: treat audio as separate tracks in production design, but source capabilities from existing audio routes/central definitions only.

## 9. Contradictions

| Item | Contradiction | Evidence |
|---|---|---|
| Current Drama page vs approved architecture | Prototype says demo/local UI, not persistent project architecture | `app/(dash)/(routes)/drama-studio/page.tsx:429`, `:82-98` |
| Chat contract | Settings clicks create chat messages | `app/(dash)/(routes)/drama-studio/page.tsx:365-373` |
| Registry-driven selectors | Current Drama has hardcoded model and options | `app/(dash)/(routes)/drama-studio/page.tsx:272`, `:288-291` |
| Board decision | Current Canvas persists via localStorage, not projectId | `app/(dash)/(routes)/canvas/page.tsx:1184`, `:1917-1936`, `:2788-2793` |
| Route contract | Required project/production Drama routes are missing | no matching files found in inspected route tree |

## 10. Recommendations

### D4/D5 Board Recommendation

Adopt a shared, project-aware Board embedded under `/drama-studio/[projectId]`. Reuse `components/canvas/*` primitives and selected Canvas workflow logic. Do not create a standalone fourth Drama Board route.

### D6 Job Recommendation

Use `Generation` as the authoritative output/cost/history row. Add a Drama job layer only as orchestration metadata linked to `Generation`, avoiding duplicate ledger, duplicate admin history, or duplicate idempotency.

### Ledger Recommendation

Reuse existing `spendCredits`, refund helpers, and admin ledger linkage. Before Phase 2 writes, verify whether `CreditLedgerEntry` and `ApiIdempotency` are real DB tables managed outside `schema.prisma`; they are referenced but not modeled in the current Prisma schema.

### Registry Recommendations

Use only:

- `lib/model-definition-registry.ts`
- `lib/video-model-registry.ts`
- `lib/image-models.ts`
- `lib/dynamic-model-loader.ts`
- `lib/google-image-model-specs.ts`
- existing audio/music/TTS/lipsync definitions in `lib/model-definition-registry.ts`

Mark FPS, region, and queue limits `[غير محسوم]` until exported by real registry data.

### i18n Recommendation

Keep spatial layout fixed LTR for Agent/Workbench. Store language as content preference. Use RTL only for Arabic text entry/rendering areas. Replace inline Drama ternaries with a local/central translation contract.

## 11. ADR Queue Required Before Phase 2

1. Beat physical representation ADR.
2. Drama project/entity physical mapping ADR.
3. Project memory and retrieval ADR.
4. Drama job and Generation linkage ADR.
5. QuoteSnapshot/staleness/credit cap ADR.
6. Board persistence and Canvas reuse ADR.
7. Feature flag and preview banner mechanism ADR.
8. Audio timeline and voice-character continuity ADR.
9. Asset lineage and Take versioning ADR.
10. Admin observability mapping ADR.

## 12. Unresolved Items

- [غير محسوم] Whether Drama uses new tables, extended Cinema tables, or hybrid JSON/relational storage.
- [غير محسوم] Quote expiration/staleness method.
- [غير محسوم] Credit reservation support; direct charge/refund is proven, reservation is not.
- [غير محسوم] Real DB source for `CreditLedgerEntry` and `ApiIdempotency`.
- [غير محسوم] FPS, region, and queue limits in the model adapter matrix.
- [غير محسوم] Whether `TimelineProject.stateJson` can be safely reused for Board persistence.
- [غير محسوم] Voice reference storage and character voice continuity mapping.
- [غير محسوم] Final assembly route suitability for multi-track Drama output.

## 13. Owner Decisions Required

1. Choose Beat physical representation.
2. Choose Drama project persistence strategy.
3. Approve the shared project-aware Board approach.
4. Approve quote staleness and credit cap policy.
5. Approve whether feature flag is backed by Product Feature Registry, middleware/config, or another existing gate.
6. Approve whether Drama jobs appear as existing Admin Jobs rows with feature metadata or need extra admin drill-down.

## 14. Phase 1.1.1 Spike Corrections

### 14.1 S2 i18n Audit

Files inspected: `lib/use-language.ts`, `components/TopNavbar.tsx`, `app/(dash)/(routes)/drama-studio/page.tsx`.

Exports found: `useLanguage` is exported at `lib/use-language.ts:3`. No Drama-specific i18n export was proven.

Reusable components: `TopNavbar` already consumes `useLanguage` at `components/TopNavbar.tsx:9` and `:121`.

Missing pieces: central Drama dictionary, fallback policy, persisted chat/project language field, and testable child-component translation propagation.

| Check | Finding | Status | Evidence |
|---|---|---|---|
| Central language source | Language is stored in browser `localStorage`; no server-backed Drama language source proven | PARTIAL | `lib/use-language.ts:8`, `:24`, `:35` |
| Dictionaries | TopNavbar has its own translation mapping; Drama prototype uses inline ternaries | PARTIAL/CONTRADICTED | `components/TopNavbar.tsx:103-104`, `app/(dash)/(routes)/drama-studio/page.tsx:82-98` |
| Language-change event | Event exists and child components can subscribe | PROVEN | `lib/use-language.ts:28-30`, `:44` |
| `useLanguage` + TopNavbar | Navbar hook integration is proven | PROVEN | `components/TopNavbar.tsx:9`, `:121` |
| `dir` / text alignment | Global document direction is forced LTR; Drama applies RTL/LTR only on content blocks | PARTIAL | `lib/use-language.ts:12-19`, `:39-40`; Drama `:446`, `:626-627`, `:800`, `:857`, `:868` |
| Agent/Workbench stability | Current prototype has fixed grid left/right and does not flip by language | PROVEN for prototype, contract still required | `app/(dash)/(routes)/drama-studio/page.tsx:689`, `:759-763`, `:883-884` |
| Settings clicks | Current prototype appends chat messages on setting changes, which violates the approved Agent contract | CONTRADICTED | `app/(dash)/(routes)/drama-studio/page.tsx:365-373` |
| Fallback missing translation | No explicit Drama fallback policy found | UNRESOLVED | no proven Drama dictionary/fallback source |
| Hydration/persistence | Client-only `localStorage` access is guarded by effects, but no project-level language persistence is proven | PARTIAL | `lib/use-language.ts:24-44` |

Recommendation: Agent must remain left at 40-42%, Workbench right at 58-60%, in Arabic and English. Column order must not flip. Only text language, writing direction inside editors/content, and alignment may change. Timeline remains LTR. Inline Prototype text is not a trusted translation source.

Decision required: choose whether Drama copy uses an existing central translation utility if one is approved later, or a scoped Drama dictionary module. Phase 2 impact: UI implementation cannot treat the current inline ternaries as architecture.

Unresolved items: central fallback behavior, persisted project language field, and tests for nested child component copy updates.

### 14.2 S3 Storage URLs and Assets Audit

Files inspected: `lib/storage/runtime.ts`, `lib/storage/index.ts`, `lib/storage/provider-registry.ts`, `lib/r2-storage.ts`, `lib/supabase-storage.ts`, `lib/media/public-url-resolver.ts`, `app/api/assets/route.ts`, `app/api/assets/persist/route.ts`, `app/api/assets/thumbnail/route.ts`, `app/api/media/[...path]/route.ts`, `app/api/media/upload/route.ts`, `app/api/studio/upload-url/route.ts`, `app/api/panel/upload-url/route.ts`.

Exports found: `objectKeyFor`, `resolveMediaObject`, `readStorageRuntimeConfig`, `getActiveStorageProvider`, `getStorageReadProviders`, `uploadBuffer`, `uploadFromUrl`, `createSignedUploadUrl`, `deleteObject`, `readObject`, `headObject`, `resolvePublicUrl`, `normalizeMediaUrl` in `lib/storage/runtime.ts:89`, `:115`, `:186`, `:251`, `:256`, `:315`, `:348`, `:377`, `:392`, `:397`, `:427`, `:454`, `:481`.

Reusable components: storage runtime/provider registry, media proxy route, asset API, upload URL routes, thumbnail fallback route.

| Check | Finding | Status | Evidence |
|---|---|---|---|
| 1 storage keys vs public URLs | Runtime can resolve owned storage from `storage_url`, `storage_key`, and bare filenames | PROVEN | `lib/storage/runtime.ts:149`, `:161`, `:166-167` |
| 2 absolute URL construction in prod | `resolvePublicUrl`/media proxy exist; panel upload wraps `publicUrl` to absolute panel URL | PARTIAL | `lib/storage/runtime.ts:454-476`; `app/api/panel/upload-url/route.ts:113-115` |
| 3 providers and active provider | Runtime config has active write provider; default is Backblaze; registry includes legacy read-only providers | PROVEN | `lib/storage/runtime.ts:16`, `:73`; `lib/storage/provider-registry.ts:61`, `:82`, `:97`, `:121` |
| 4 fallback order | Read chain starts with active provider, then legacy providers if enabled | PROVEN | `lib/storage/runtime.ts:262-267`, `:540-550` |
| 5 signed URLs | Signed upload URLs exist in active storage runtime and R2/Supabase helpers | PROVEN | `lib/storage/runtime.ts:377-388`; `lib/r2-storage.ts:66-71`; `lib/storage/backblaze.ts:158-172`; `lib/storage/supabase.ts:105-115` |
| 6 expiry | Backblaze defaults to 300 seconds; Supabase defaults to 3600 seconds; R2 route-specific expiry is not fully proven through central runtime | PARTIAL/UNRESOLVED | `lib/storage/backblaze.ts:171-172`; `lib/storage/supabase.ts:115`; `lib/r2-storage.ts:66-71` |
| 7 access permissions | Upload routes authenticate users; media proxy read permission by project/user is not proven | PARTIAL | `app/api/assets/route.ts:295-297`, `:562-564`, `:625-627`; `app/api/media/[...path]/route.ts:97-115` |
| 8 user/project asset isolation | Upload/delete paths use `userId/`; Drama `projectId` asset isolation is not proven | PARTIAL | `app/api/studio/upload-url/route.ts:84-95`, `:167-168`; `app/api/panel/upload-url/route.ts:101-115`, `:151`; `app/api/assets/route.ts:581` |
| 9 retention/deletion | Deletion attempts storage cleanup before DB delete; lifecycle cleanup helper exists | PARTIAL | `app/api/assets/route.ts:585-616`; `lib/storage/storage-lifecycle.ts:43`, `:166`, `:217`, `:257` |
| 10 Admin History representation | Admin history includes output URL and ledger/provider usage, but Drama lineage is missing | PARTIAL | `lib/admin/history-read-model.ts:184-216`, `:268-278` |
| 11 expired link/load failure | Thumbnail fallback and media proxy not-found handling exist; explicit expired-signed-link UX not proven | PARTIAL/UNRESOLVED | `app/api/assets/thumbnail/route.ts:24-32`, `:58-70`; `app/api/media/[...path]/route.ts:89`, `:212` |
| 12 upload/import/save failure | Persist route can keep original URL when storage is not configured; upload routes return errors; Drama retry policy missing | PARTIAL | `app/api/assets/persist/route.ts:48-56`, `:111-135`; `app/api/media/upload/route.ts:65-68`, `:123-159` |

Options: reuse central storage runtime only; add Drama lineage metadata linked to `Generation` and project hierarchy; leave signed URL expiry values as registry/provider-derived only.

Recommendation: Drama must persist storage keys plus resolvable public/proxy URLs through central storage helpers, not raw third-party URLs alone. Project/episode/scene/shot/block/take lineage must be metadata linked to existing Generation/assets, not a parallel storage subsystem.

Decision required: project-level asset isolation strategy and retention/deletion policy for rejected Takes, Storyboard assets, assembly previews, and final exports.

Phase 2 impact: storage write/read APIs are reusable, but Drama cannot claim secure project asset lineage until project-aware metadata and admin visibility are designed.

Unresolved items: exact signed URL TTL contract across all providers, project-level read authorization for media proxy, retention windows, and expired link UX.

### 14.3 S7 Inngest and Jobs Audit

Files inspected: `lib/inngest/client.ts`, `lib/inngest/functions/hello-world.ts`, `app/api/inngest/route.ts`, `lib/admin/jobs-read-model.ts`, `schema.prisma`, `lib/credit-ledger.ts`.

Exports found: Inngest client at `lib/inngest/client.ts:3`, a single `helloWorld` function at `lib/inngest/functions/hello-world.ts:3`, and Next handler exports at `app/api/inngest/route.ts:5`.

| Question | Finding | Status | Evidence |
|---|---|---|---|
| Is Inngest actual generation runner? | No generation function/event was proven; only hello-world test function is served | MISSING for generation | `app/api/inngest/route.ts:5-7`; `lib/inngest/functions/hello-world.ts:5-6` |
| Event names/job functions | Only `test/hello.world` was found | PROVEN test only | `lib/inngest/functions/hello-world.ts:6` |
| Retry/concurrency/cancellation/failure handling | Not proven in inspected Inngest files | UNRESOLVED | no matching `retry/concurrency/cancel/failure` usage in Inngest files |
| Relation to `Generation` | No direct relation proven | MISSING | Inngest search found no generation job function |
| Reusable for Drama | Technically possible but not approved; requires ADR and job semantics | OWNER DECISION REQUIRED | current Inngest scope is test-only |

Recommendation: do not assume Inngest as Drama job runner. Current proven job foundations are `Generation`, `CinemaJob`, credit task markers, and admin jobs read model. Drama job design remains D6: Drama job linked to `Generation`, no duplicate Ledger, no duplicate Idempotency, no duplicate Admin History.

### 14.4 S10 Admin, Models, Audit, and `/admin/models` Linkage

Files inspected: `app/admin/history/page.tsx`, `app/admin/jobs/page.tsx`, `app/api/admin/history/route.ts`, `app/api/admin/jobs/route.ts`, `app/api/admin/generations/[id]/route.ts`, `lib/admin/history-read-model.ts`, `lib/admin/jobs-read-model.ts`, `app/api/admin/models/route.ts`, `app/api/models/route.ts`, `app/api/model-definitions/route.ts`, `lib/model-definition-registry.ts`, `lib/dynamic-model-loader.ts`, `lib/product/feature-registry.ts`, `lib/provider-registry.ts`, `lib/routing/admin-routing-data.ts`.

Exports found: `buildCentralModelDefinitions` and `getCentralModelDefinitions` in `lib/model-definition-registry.ts:838`, `:863`; dynamic model loaders in `lib/dynamic-model-loader.ts:212`, `:240`; product registry export in `lib/product/feature-registry.ts:483`.

Reusable components: admin jobs/history read models, Generation detail API, central model definitions, dynamic model loader, provider registry, product feature registry.

| Admin Requirement | Finding | Status | Evidence |
|---|---|---|---|
| 1 Generation Monitor | Generation detail API and history page are proven | PROVEN/PARTIAL | `app/api/admin/generations/[id]/route.ts:30`, `app/admin/history/page.tsx:283`, `:1057` |
| 2 Jobs/Workers | Unified jobs page/read model exists | PROVEN/PARTIAL | `app/admin/jobs/page.tsx:28-52`; `lib/admin/jobs-read-model.ts:26-49` |
| 3 Generation History | History API/page exist | PROVEN | `app/api/admin/history/route.ts:8`, `app/admin/history/page.tsx:260-266` |
| 4 Idempotency | Helper exists but Prisma model is not proven | PARTIAL/UNRESOLVED | `lib/idempotency.ts:5-6`, `:29`, `:112`, `:128` |
| 5 Credit spending | Spend and charge ledger helper exists | PARTIAL | `lib/credit-ledger.ts:638`, `:732` |
| 6 Refund lifecycle | Refund and rollback helpers exist | PARTIAL | `lib/credit-ledger.ts:815`, `:855`, `:890`, `:1048` |
| 7 Provider usage | Provider usage records and admin display exist | PROVEN/PARTIAL | `schema.prisma:118`; `app/admin/jobs/page.tsx:913-925`; `app/api/admin/generations/[id]/route.ts:46`, `:180-187` |
| 8 Storage assets | Asset URL/media fields appear in admin and asset APIs | PARTIAL | `lib/admin/history-read-model.ts:184-216`; `app/api/assets/route.ts:464`, `:484` |
| 9 Prompt/request snapshots | Generation request snapshot model and admin inclusion exist | PROVEN/PARTIAL | `schema.prisma:146-165`; `app/api/admin/generations/[id]/route.ts:56-58` |
| 10 Model/pricing snapshots | Central definitions expose pricing/routing refs; per-generation snapshot design still missing | PARTIAL | `lib/model-definition-registry.ts:80-82`, `:523-524`, `:583-584`, `:649-650` |
| 11 Project/user isolation | User isolation exists for Generation/Cinema; Drama hierarchy missing | PARTIAL | `schema.prisma:79-80`, `:110`, `:341`, `:359`; `app/api/cinema/generate/route.ts:48` |
| 12 Failure/retry/cancel | Job statuses and diagnostics exist, but Drama retry/cancel missing | PARTIAL | `app/admin/jobs/page.tsx:28`; `lib/admin/jobs-read-model.ts:331-343`, `:544-548` |
| 13 Asset previews in admin | Lightbox/media preview exists in history UI | PARTIAL | `app/admin/history/page.tsx:1372-1422` |
| 14 Drama drill-down | Generation drill-down exists; Drama Project/Episode/Scene/Shot/GenerationBlock/Take drill-down is missing | MISSING/PARTIAL | `app/api/admin/generations/[id]/route.ts:143-190`; no Drama models proven |

`/admin/models` linkage: Drama must not scrape `/admin/models`, duplicate models, hardcode ids/prices/durations, or maintain a parallel model list. `/admin/models` itself reads dynamic image/video models and normalizes them with central model definitions at `app/api/admin/models/route.ts:32-39`, then returns `sourceOfTruth: "dynamic model PlatformConfig normalized by Central Model Definition"` at `:51`. Public/user APIs also expose central model definitions through `app/api/models/route.ts:19-21`, `:48`, `:58` and `app/api/model-definitions/route.ts:16`, `:23`.

Drama contract: consume a safe filtered DTO backed by the same central Backend Registry/Service/API source used by `/admin/models`. Required fields: active/routable/executable/pricing-linked status, modality, provider route, capabilities, pricing linkage, routing/fallback linkage, feature linkage, user-visible vs admin-only status, and model/pricing/provider snapshot per generation.

Options: extend existing admin read models with Drama metadata; create a thin Drama admin drill-down that reads existing Generation/Admin sources; or defer drill-down until Drama domain persistence is approved.

Recommendation: no parallel Drama admin. Reuse existing Admin Jobs, Admin History, Generation detail, central model definitions, Product Feature Registry, Provider Registry, and PricingConstitution linkage.

Decision required: exact Drama metadata shape added to existing admin rows and whether Admin UI receives only a detail drawer extension or a filtered feature view.

Phase 2 impact: every generation, approved edit, asset, storyboard, assembly, and export needs monitorable central states with Generation ID, job status, model/provider, quote/cost, credits spent/refunded, asset lineage, retry/failure, user/project, and audit event.

Unresolved items: exact admin DTO for Drama hierarchy, per-generation model/pricing/provider snapshot storage, retry/cancel contract, and DB verification for ledger/idempotency tables.

### 14.5 PricingConstitution, PlatformConfig, Ledger, Idempotency, and Migrations

Files inspected: `prisma/schema.prisma`, `lib/pricing.ts`, `lib/credit-ledger.ts`, `lib/idempotency.ts`, `lib/dynamic-model-loader.ts`, `app/api/admin/pricing-constitution/route.ts`, `prisma/migrations/manual/2026-05-21-sync-pricing-constitution.sql`, `lib/admin/history-read-model.ts`.

| Concept | Finding | Status | Evidence |
|---|---|---|---|
| PricingConstitution | Prisma model exists and admin route reads/writes it; manual migration syncs pricing floor | PROVEN | `schema.prisma:613`; `app/api/admin/pricing-constitution/route.ts:2-3`, `:29`, `:96`; `prisma/migrations/manual/2026-05-21-sync-pricing-constitution.sql:1-7`, `:72-79` |
| Role in Quote Engine | Existing quote uses `getGenerationCost`; Drama quote must route through existing pricing functions and constitution, not hardcoded values | PARTIAL | `app/api/pricing/quote/route.ts:20`, `:54`; `lib/pricing.ts:417` |
| PlatformConfig | Prisma model exists and dynamic model loaders use it for model lists | PROVEN | `schema.prisma:632`; `lib/dynamic-model-loader.ts:209-243`, `:265-284` |
| Feature flag source/part | Product Feature Registry exists; Drama feature flag entry is not proven | PARTIAL | `lib/product/feature-registry.ts:46-66`, `:483`; no proven Drama feature id |
| CreditLedgerEntry | Code writes/reads it, but no Prisma model was found | PARTIAL/UNRESOLVED | `lib/credit-ledger.ts:107`, `:732`, `:890`; `lib/admin/history-read-model.ts:433-439` |
| ApiIdempotency | Code casts `prismadb.apiIdempotency`, but no Prisma model was found | PARTIAL/UNRESOLVED | `lib/idempotency.ts:5-6`, `:29`, `:70`, `:112`, `:128` |
| Manual migrations | PricingConstitution manual migration is proven; manual migrations for `CreditLedgerEntry`/`ApiIdempotency` were not proven in inspected search | PARTIAL | `prisma/migrations/manual/2026-05-21-sync-pricing-constitution.sql:1-7`; no matching manual migration found for the two names |

Mandatory blocker: `CreditLedgerEntry` and `ApiIdempotency` are used in code but not proven as Prisma models. This blocks final Drama Prisma design before the next permitted DB/migration verification. Actual database presence is not asserted here because DB verification is separate and forbidden in this phase.

### 14.6 Approved Decisions and Remaining Decisions

D1 Project Board is owner-approved: use a shared `projectId`-aware Project Board; it is a shared workspace, not a fourth Drama route; no fourth Drama page; it opens with project/episode/scene/shot/assets context.

D2 Visibility is owner-approved: use Feature Flag + Preview Banner; do not present Drama as complete before Backend/Audit/QA. Feature Flag mechanism may use Product Feature Registry/PlatformConfig only if proven and approved; current Drama feature entry is not proven.

Remaining unresolved decisions:

| Decision | Options | Evidence | Risk | Technical Recommendation | Owner Decision vs ADR |
|---|---|---|---|---|---|
| Beat representation | independent table / embedded JSON / discriminated structure | no `Beat` model; JSON fields proven | wrong storage blocks scheduler/QC | discriminated contract now, ADR before Prisma | Technical ADR + owner approval |
| Drama persistence | new tables / extend Cinema / hybrid | `CinemaProject`, `CinemaShot`, `TimelineProject` partial | forced reuse may corrupt Cinema semantics | project-specific Drama model after reuse comparison | Technical ADR |
| Memory storage | normalized layers / JSON snapshots / hybrid | no Drama memory model | retrieval/version drift | versioned scoped memory records linked to `projectId` | Technical ADR |
| Quote policy | direct estimate / quote snapshot / reservation | quote exists, reservation unproven | over/under charge | minimum/expected/safe maximum snapshot before debit | Owner policy + technical ADR |
| Job runner | Generation-linked Drama job / generalized CinemaJob / Inngest | Inngest test-only; CinemaJob partial | admin/ledger duplication | Drama job linked to Generation | Technical ADR |
| Feature flag | Product Feature Registry / PlatformConfig / route config | registry/config exist; Drama flag missing | public incomplete feature | use existing source after proof | Owner decision |

## 15. S1-S10 Traceability Matrix

| Spike Item | Requirement | Phase 1.1.1 Finding | Status | Evidence / Phase 2 Impact |
|---|---|---|---|---|
| S1 | Current Drama route reality | Prototype only, local-state, hardcoded, not backend truth | CONTRADICTED | `app/(dash)/(routes)/drama-studio/page.tsx:82-98`, `:105`, `:272`, `:288-291`, `:429`; rebuild contract-first |
| S2 | Arabic/English and fixed layout | `useLanguage` exists; current prototype has left/right grid; translation source is incomplete | PARTIAL | section 14.1; implement stable Agent/Workbench layout and real copy source |
| S3 | Storage URLs/assets | Storage runtime and providers exist; Drama lineage/project isolation unresolved | PARTIAL | section 14.2; add Drama metadata only after ADR |
| S4 | Domain/Prisma mapping | Existing `Generation`, Cinema, Timeline models are partial matches only | PARTIAL/MISSING | section 8.3; no new table before reuse ADR |
| S5 | Beat representation | No Beat model; JSON-capable tables exist | OWNER DECISION REQUIRED | section 8.4; ADR before Prisma |
| S6 | Project memory | Approved nine memory layers corrected; physical model missing | OWNER DECISION REQUIRED | section 8.5 and 14.5; ADR before implementation |
| S7 | Jobs/Inngest/generation | Inngest is test-only; Generation/CinemaJob/admin jobs are partial foundations | PARTIAL/MISSING | section 14.3; no Inngest assumption |
| S8 | Credits/Quote/Pricing | Credit charge/refund and quote helpers exist; Drama quote snapshot/cap missing | PARTIAL | sections 8.7, 8.8, 14.5 |
| S9 | Project Board | Canvas primitives reusable; `/canvas` localStorage and `cinema-board` sample state are not sufficient | PARTIAL/CONTRADICTED | section 8.12; D1 approved shared project-aware Board |
| S10 | Admin/audit/models | Admin jobs/history/model APIs exist; Drama hierarchy drill-down missing | PARTIAL/MISSING | section 14.4; extend central admin, no parallel admin |

## 16. Design Handoff Brief for Antigravity — Technical Constraints Only

This is not a visual design brief. It contains implementation constraints only. It does not authorize wireframes, colors, typography, routing changes, migrations, APIs, UI components, or Phase 2 implementation.

### 16.1 Scope

- Scope is exactly three Drama pages:
  1. `/drama-studio`
  2. `/drama-studio/[projectId]`
  3. `/drama-studio/[projectId]/episodes/[episodeId]/production`
- Project Board is shared and `projectId`-aware; it is not a fourth Drama page.
- Hero and Navbar are locked and must not be redesigned or modified in this phase.
- The current Workbench Prototype is rejected as source of truth because it contains hardcoded demo data and local-state behavior.

### 16.2 Structure

- Agent column stays left at 40-42%.
- Workbench column stays right at 58-60%.
- This layout is fixed for Arabic and English; language must not flip the columns.
- The five Workbench tabs are fixed in this order:
  1. Settings
  2. Outline & Script
  3. Characters
  4. Locations
  5. Elements
- Required tools: Style, Character, Element, Location, Color, Effects, Camera, Sketch, Storyboard.
- Storyboard states: No Storyboard / Keyframes / Full Storyboard.

### 16.3 Long Production Structure

- Production hierarchy is: Project -> Season -> Episode -> Scene -> Beat -> Shot -> Generation Block -> Take.
- A model with a short maximum duration produces a Generation Block or Take, not the whole film.
- Long output is assembled only after Continuity -> QC -> Assembly.
- No duration, resolution, aspect ratio, FPS, audio, quality, or price value may be hardcoded unless exported from a real registry/service.

### 16.4 UI States

Required UI states:

Empty, Loading, Preparing, Agent thinking, Draft, Proposed change, Awaiting approval, Approved, Quote loading, Quote stale, Insufficient credits, Queued, Generating, Retryable failure, Permanent failure, Review, Continuity warning, Completed, Assembling, Exporting, Permission denied, Feature unavailable.

### 16.5 Data Limits

- No hidden demo data may be presented as real project state.
- No hardcoded prices, model ids, durations, resolutions, aspect ratios, qualities, FPS, audio values, or provider names in Drama-specific UI/contracts.
- Lists must come from central registries/services and filtered DTOs.
- Quote is shown before debit.
- Model, pricing, and provider snapshot must be captured at execution.
- Agent changes become Proposal -> Approve/Reject -> Apply before changing project state.
- Settings clicks must not create chat spam.
- Agent memory is tied to `projectId`.

### 16.6 Project Overview Episode Card Fields

Each episode card must reserve data fields for:

1. Episode id / number
2. Title
3. Status
4. Planned duration
5. Approved scenes count
6. Generation progress
7. Quote / credit state
8. Last updated / owner-visible audit state

### 16.7 Admin and Audit Visibility

Every generation, approved edit, asset, storyboard, assembly, and export needs monitorable central states. Do not hide:

- job status
- model/provider
- quote/cost
- credits spent/refunded
- Generation ID
- asset lineage
- retry/failure
- user/project
- audit event

### 16.8 Reusable Elements

Only components/tokens proven in the repository may be reused. This brief makes no visual choices.

Proven reusable candidates:

- Canvas primitives: `components/canvas/canvas-context.tsx:6-20`, `components/canvas/canvas-types.ts:1-129`, `components/canvas/CanvasNode.tsx`, `components/canvas/NodeSettingsPanel.tsx`.
- Board route behavior to analyze/refactor, not copy wholesale: `app/(dash)/(routes)/canvas/page.tsx:1184`, `:1917-1936`, `:2788-2793`.
- Cinema board ideas to analyze, not copy as persistence truth: `app/(dash)/(routes)/cinema-board/page.tsx:263-279`, `:310-386`.
- Language hook: `lib/use-language.ts:3-44`.
- Central model definitions: `lib/model-definition-registry.ts:73-100`, `:838`, `:863`.
- Storage runtime: `lib/storage/runtime.ts:12-23`, `:186`, `:251`, `:256`, `:377`, `:454`.
- Admin read models: `lib/admin/jobs-read-model.ts:26-49`, `lib/admin/history-read-model.ts:12-81`.

### 16.9 Unresolved for Designer

- Mobile layout is not approved.
- Any UI constraint depending on unproven backend capability must be marked `[غير محسوم]`.
- Antigravity must not change backend contracts, entity names, state names, hierarchy names, or registry source names.
- Antigravity must not add a fourth Drama route.
- Antigravity must not use the prototype's hardcoded models, durations, sample episode data, or inline translation text as product truth.

## 17. Phase 2 Gate Verdict

Phase 2 remains BLOCKED.

Reason: Phase 1.1.1 closed the immediate spike-report gaps and recorded D1/D2, but Drama still lacks approved physical persistence, Beat representation, project memory storage, Generation-linked Drama job contract, quote snapshot/staleness policy, model capability adapter DTO, project-aware asset lineage, and admin hierarchy drill-down. Required ADRs and owner decisions in sections 11-14 must be approved before code, Prisma, API, UI, migrations, route work, or DB verification begins.

## 18. Commands Used

Read-only commands used:

- `git status --short`
- `git diff --stat`
- `Test-Path`
- PowerShell `Get-Content | Measure-Object -Line`
- `rg -n ...` over approved repository paths
- `git diff -- docs/drama-studio/phase_1_1_spike_report.md`

No write command was used except editing this Markdown report.
