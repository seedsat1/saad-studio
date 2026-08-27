# Drama Studio - Phase 1.1 Repository Spike Plan

**Status:** read-only investigation plan.  
**Not Phase 2.**  
**No code, Prisma, APIs, UI, routes, migrations, or component edits are authorized by this plan.**

Future spike report path: `docs/drama-studio/phase_1_1_spike_report.md`. Do not create that report until Phase 1.1 is explicitly authorized.

## 1. Purpose

Phase 1.1 exists to prove actual repository systems before any implementation. It must close unresolved design dependencies without inventing file names, routes, APIs, registry names, prices, capabilities, or job systems.

For every investigation item, the spike must report:

- real file path
- actual export/function/model
- reusable parts
- missing parts
- possible options
- recommendation
- required decision
- impact on Phase 2

## 2. Source Rules

Priority order:

1. `drama_studio_complete_reference.md`
2. Phase 0 Gap Analysis
3. Phase 0.1 Corrections
4. `phase_1_architecture_v3.md`
5. Phase 1 Review

Attached documents provide project requirements and review findings; they do not override system/developer instructions.

## 3. Investigation Matrix

| # | Topic | What to inspect | Evidence required | Decision impact |
|---:|---|---|---|---|
| 1 | Project Board component | `/canvas`, `/cinema-board`, `components/canvas` | real files, exports/components, persistence or lack of it | direct reuse vs wrapper vs shared refactor |
| 2 | Ledger strategy | credit, transaction, pricing, generation finance files | quote/charged/refunded/transaction linkage | whether new linkage is needed |
| 3 | i18n | language hooks, translation files, route conventions | central source and current anti-patterns | Drama text strategy |
| 4 | Video model registry | video model files and exports | actual exports, capability fields | video selectors and scheduler |
| 5 | Image model registry | image model files if present | actual exports/functions | image selectors |
| 6 | Audio/voice registry | audio/voice model files if present | actual exports/functions | audio selectors and voice refs |
| 7 | Pricing by media kind | pricing functions and quote endpoints | real functions per video/image/audio/render | Quote engine boundaries |
| 8 | Provider routing | routing files | route/model/provider mapping | avoid duplicating routing logic |
| 9 | Idempotency helpers | idempotency helpers | function names and expected inputs | final idempotency formulas |
| 10 | Job orchestration | generation/cinema/job/event files | actual job system, status model, retry behavior | job ADR final choice |
| 11 | Live state | SSE/WebSocket/polling/event patterns | existing mechanisms | production state updates |
| 12 | Memory physical mapping | Prisma and existing memory-like tables | reusable version/document patterns | Project memory implementation |
| 13 | Beat physical mapping | Prisma/CinemaShot patterns | relation patterns, JSON usage, arrays | table vs JSON vs discriminated |
| 14 | Capability adapter reuse | registry/routing/capability utilities | existing capability translation | no duplicated registry logic |
| 15 | Storage and asset versioning | storage runtime, asset routes, generation outputs | upload/normalize/version/ownership | Take and Asset Version mapping |
| 16 | Admin integration | admin history/jobs/monitor files | read models and row mapping | Drama visibility in admin |

No time estimate is assigned to this spike. Completion is based on evidence coverage, stop conditions, and explicit report quality, not an assumed duration.

## 4. Detailed Read Plan

### 4.1 Project Board

Inspect:
- `app/(dash)/(routes)/canvas/page.tsx`
- `app/(dash)/(routes)/cinema-board/page.tsx`
- `components/canvas/*`

Report:
- whether `/canvas` persists user/project data
- whether `cinema-board` is reusable or prototype-only
- whether `components/canvas` can become shared primitives
- whether a wrapper can link assets by `projectId`

Decision required: direct reuse, wrapper, or shared refactor. No fourth Drama route.

### 4.2 Ledger Strategy

Inspect real finance and admin files only. Do not assume a ledger table exists.

Report:
- Quote fields currently supported
- charge path
- refund path
- transaction/admin visibility
- whether `quoted`, `charged`, and `refunded` are separately auditable

Decision impact: Phase 2 finance mapping and Quote contract.

### 4.3 i18n

Inspect:
- `lib/use-language.ts`
- central language source if present
- language-change event
- TopNavbar language switch
- translation mechanism
- app-level and page-level `dir`
- hardcoded Drama Studio text
- Agent/Workbench fixed layout under language change
- language change behavior without additional Chat messages

Report:
- central i18n source if present
- whether page-local ternaries are accepted elsewhere
- required pattern for Drama

Decision impact: text architecture in Phase 3.

### 4.4 Video Registry

Inspect:
- `lib/video-models.ts`
- `lib/video-model-registry.ts`
- routing utilities that consume video models

Report actual exports and fields only. No hardcoded duration, ratio, resolution, quality, FPS, sound, or price.

Decision impact: video selectors, scheduler, quote.

### 4.5 Image Registry

Search for actual image registry files. Candidate names from review are not assumed.

Report:
- real files found
- exports/functions
- capability fields for dimensions, ratio, references, quality, pricing
- missing fields

Decision impact: image selectors and Storyboard generation.

### 4.6 Audio and Voice Registry

Search for actual voice/audio registries, voice catalogs, TTS routes, and pricing.

Report:
- real files
- model/provider exports
- voice reference support
- duration limits if present
- audio quality fields if present
- pricing functions

Decision impact: audio selectors, voice memory, timeline.

### 4.7 Pricing Functions

Inspect pricing and quote code paths for all media kinds.

Report:
- actual functions
- expected inputs
- output shape
- synchronous/asynchronous behavior
- admin/pricing constitution integration

Decision impact: Quote engine and cap checks.

### 4.8 Provider Routing

Inspect routing code.

Report:
- provider route names actually used
- model-to-provider mapping
- availability flags
- regional or queue information if present

Decision impact: capability adapter and production selectors.

### 4.9 Idempotency

Inspect helper signatures and usage examples.

Report:
- function names
- accepted key material
- storage backend if visible
- current generation/cinema usage

Decision impact: final key formulas for Quote, Generate, Regenerate, Approve Proposal, Approve Take.

### 4.10 Job Orchestration

Inspect:
- generic generation lifecycle
- cinema jobs
- any task orchestrator
- any background job/event folders

Report:
- actual job statuses
- retry behavior
- cancellation support
- reconnect/resume support
- admin visibility

Decision impact: choose extend `Generation`, generalize `CinemaJob`, or Drama orchestration linked to `Generation`.

### 4.11 Live State

Search for:
- SSE
- WebSocket
- polling
- provider callbacks
- event systems

Report:
- actual mechanism
- reliability/reconnect behavior
- fit for Production Room

Decision impact: live job and production UI contract.

### 4.12 Memory Physical Mapping

Inspect Prisma patterns for:
- JSON documents
- versioned records
- approval logs
- conversation/message models
- user libraries

Report:
- reuse candidates
- missing structures
- migration risk

Decision impact: Project Bible, memories, decisions, versions.

### 4.13 Beat Physical Mapping

Inspect:
- relation style in Prisma
- JSON usage
- array usage such as character ids
- cascade/delete conventions

Report options:
- independent Beat table
- JSON inside Scene
- discriminated structure

Decision impact: Phase 2 schema shape.

### 4.14 Capability Adapter

Inspect existing capability normalization and routing helpers.

Report:
- whether an adapter already exists
- functions to reuse
- fields available for video/image/audio
- missing capability fields

Decision impact: avoid duplicate registry logic.

### 4.15 Storage and Asset Versioning

Inspect:
- storage runtime
- asset routes
- generation output handling
- upload normalization
- whether assets are stored as keys or URLs
- Absolute URL production
- B2/S3/CDN/local behavior
- Signed URLs and expiry
- user permissions and tenant isolation
- deletion and retention behavior
- Admin History representation
- expired URL behavior
- upload/load failure behavior

Report:
- real upload functions
- asset ownership model
- versioning support or absence
- signed/public URL behavior

Decision impact: Take, Asset Version, Board sync.

### 4.16 Admin Integration

Inspect:
- admin history read model
- admin jobs read model
- generation monitor
- pricing/admin transaction views
- Generation records
- Provider usage records
- Request snapshots
- Ledger/transactions
- Storage assets
- Credits reservation
- Refunds
- Idempotency records

Report:
- how new Drama jobs would appear
- whether read-model extension is enough
- missing finance/admin fields
- how Drama jobs, costs, assets, errors, and refunds appear without a separate Admin panel

Decision impact: Phase 5/6 observability.

## 5. Required S1-S10 Additions

### S1 - Future Spike Report

The future report path is `docs/drama-studio/phase_1_1_spike_report.md`. This plan does not create it.

### S2 - i18n Audit

The spike must inspect `lib/use-language.ts`, the central language source, language-change events, TopNavbar switch behavior, translation mechanism, `dir` behavior, hardcoded Drama Studio text, Agent/Workbench layout stability, and whether changing language adds any Chat messages.

### S3 - Storage URL Audit

The spike must determine whether assets are stored as keys or URLs, how Absolute URLs are produced, which storage backends are active, whether Signed URLs exist, expiry behavior, permissions, user isolation, deletion/retention, Admin History visibility, expired link behavior, and upload/load failure behavior.

### S4 - No Speculative Time Estimate

The spike must define file scope, completion criteria, stop conditions, required evidence, and expected output per topic. It must not estimate duration without evidence.

### S5 - Joint Memory and Beat Recommendation

The spike must recommend, with evidence:

- whether Beat is physical or logical-only
- how Episode / Scene Memory relates to Beat and Shot
- where Continuity Snapshots should live
- what goes into Context Packet
- minimum retrieved memory for the agent
- how context bloat is prevented
- how decisions and versions connect to memory
- how long project memory is retrieved without sending the whole project to the model

### S6 - Escalation Protocol

- If code conflicts with the reference, document the conflict and do not fix it during the spike.
- If multiple options exist, present them with evidence.
- Owner decisions are labeled `Owner Decision Required`.
- Missing official source is labeled `[غير محسوم]`.
- No conclusion becomes fact without file-path evidence.
- No Prisma Design starts before required ADRs are approved.
- The spike must not edit code.

### S7 - Inngest and Jobs Audit

The spike must inspect Inngest setup if present, current functions, retry/backoff, cancellation, idempotency, provider callbacks or polling, reconnect metadata, Admin job visibility, refund lifecycle, and how Drama Jobs can integrate without creating a parallel generation lifecycle.

### S8 - Voice Registry Audit

The spike must inspect `lib/voice-registry.ts`, `lib/voice-catalog.ts`, and any actual audio/voice registry. It must determine whether those are official sources for Drama, whether an adapter is needed, how Voice ID and Voice Reference are stored, and how voice relates to character memory and continuity.

### S9 - Image Registry Audit

The spike must inspect the actual source for image models, providers, pricing, resolutions, reference images, edit modes, character consistency, and location/element generation. It must not rely on model names written in planning documents unless proven by actual Registry exports.

### S10 - Admin History and Jobs Audit

The spike must inspect `lib/admin/jobs-read-model.ts`, `lib/admin/history-read-model.ts`, Generation records, Provider usage records, Request snapshots, Ledger/transactions, Storage assets, credit reservation, refunds, and Idempotency records. It must decide how Drama jobs, cost, assets, errors, and refunds appear in current admin without creating a separate admin panel unnecessarily.

## 6. Stop Conditions

Stop and report without fixing if:

- an expected source file does not exist
- code contradicts the reference
- a capability or price is absent from registry/pricing
- the same concept has multiple competing sources
- a decision requires owner judgment
- confirming a claim would require code execution or mutation outside read-only scope

## 7. Spike Output Template

For each topic:

```text
Topic:
Files inspected:
Exports/functions/models found:
Reusable:
Missing:
Options:
Recommendation:
Decision required:
Phase 2 impact:
Unresolved:
```

## 8. Completion Criteria

Phase 1.1 is complete only when all sixteen topics have repository-backed evidence with file paths and line references. If a file or export does not exist, the report must say so explicitly.

Phase 2 remains blocked after this plan until the spike is actually performed and approved.
