# Drama Studio — Phase 2 Entry Verification

Date: 2026-08-26  
Scope: Phase 2 Entry Verification only.  
Output: this Markdown report only.  
No Prisma, API, UI, routing, migration, backend, job, registry, pricing, storage, design, or `PROJECT_CONTEXT.md` implementation change is authorized by this report.

## 1. Executive Verdict

Phase 2 implementation is still blocked.

[EXISTS] The repository has reusable central systems for Generation history, provider usage, request snapshots, PricingConstitution, PlatformConfig-backed dynamic model loading, central model definitions, storage runtime, admin jobs/history, feature registry, provider registry, and i18n hook evidence.

[ADAPTER REQUIRED] Drama Studio needs adapters/contracts over these systems instead of parallel subsystems: model capability adapter, quote snapshot adapter, Generation-linked job adapter, project-aware storage lineage, admin/audit metadata, project memory retrieval, and long-form production scheduler.

[BLOCKING] The following must be closed before code implementation:

- Beat physical representation.
- Drama project/entity physical mapping.
- Project memory persistence and retrieval.
- Drama job linkage to `Generation`.
- QuoteSnapshot/staleness/Credit Cap policy.
- Project-aware Board persistence.
- Feature Flag + Preview Banner source.
- Asset lineage and retention policy.
- Admin drill-down mapping for Project -> Episode -> Scene -> Shot -> Generation Block -> Take.
- Actual DB/migration verification for `CreditLedgerEntry` and `ApiIdempotency`, because code references them but `prisma/schema.prisma` does not define them.

## 2. Git Snapshot

Command run before work: `git status --short`.

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

Command run before work: `git diff --stat`.

```text
 .gitignore                                         |    6 +
 .../saadstudio-cep/client/src/pages/ai-copilot.ts  | 1046 +++++++++++++++-----
 adobe/saadstudio-cep/jsx/index.jsx                 |   44 +
 app/favicon.ico                                    |  Bin 7742 -> 0 bytes
 app/layout.tsx                                     |    3 +-
 components/TopNavbar.tsx                           |    3 +
 components/admin/AdminSidebar.tsx                  |    7 +
 components/sidebar.tsx                             |    2 +-
 docs/saad-studio-premiere-reference-ar.md          |   20 +
 lib/navigation.ts                                  |    1 +
 package-lock.json                                  |  436 ++++++++
 package.json                                       |    3 +
 prisma/schema.prisma                               |  231 +++++
 seedsat1/saad-studio                               |    0
 14 files changed, 1537 insertions(+), 265 deletions(-)
```

Notes:

- These changes existed before this verification report.
- I did not clean, revert, delete, or replace user changes.
- Git printed warnings about `C:\Users\PC/.config/git/ignore` permission access; this did not block the snapshot.

## 3. Source-of-Truth Map

Authority order for this report:

1. [EXISTS] Working-tree repository reality and schema/code evidence.
2. [EXISTS] Approved architecture docs.
3. [EXISTS] Gate C.2 visual design docs and SVG inventory.
4. [EXISTS] Gate B flow/wireframe docs.
5. [NON-BLOCKING] Current prototype route is not source of truth except locked Hero context.

| Source | Repo path / evidence | Status | Use |
|---|---|---|---|
| Full Drama reference | `docs/drama-studio/reference/drama_studio_complete_reference.md`; copied from `C:\Users\PC\Desktop\المراجع\drama_studio_complete_reference.md`; SHA-256 match recorded in `docs/drama-studio/reference/reference_manifest.md` | [EXISTS] | Source remains authoritative by owner instruction and now has a repo-local immutable reference copy |
| Phase 0 Gap Analysis / RTM | `docs/drama-studio/reference/phase_0_gap_analysis.md`; copied from `C:\Users\PC\Desktop\المراجع\تم لصق markdown(20260825-225555).md`; SHA-256 match recorded in `docs/drama-studio/reference/reference_manifest.md`; standalone Phase 0 RTM was not found | [EXISTS] for Gap Analysis; [UNRESOLVED] as standalone RTM | Repository reality and Phase 0 evidence |
| Phase 0.1 Corrections | `docs/drama-studio/reference/phase_0_1_corrections.md`; copied from `C:\Users\PC\Desktop\المراجع\تم لصق markdown(20260825-230813).md`; SHA-256 match recorded in `docs/drama-studio/reference/reference_manifest.md` | [EXISTS] | Binding Phase 0 correction source |
| Phase 1 Architecture v3 | `docs/drama-studio/phase_1_architecture_v3.md:1`, D1/D2 at `:34-62`, route contract at `:86-91`, state/domain/scheduler/contracts through `:1052-1057` | [EXISTS] | Architectural contract |
| Phase 1.1 Spike Report | `docs/drama-studio/phase_1_1_spike_report.md:1`, ADR queue at `:445-456`, owner decisions at `:469-476`, handoff at `:643-744` | [EXISTS] | Repository spike evidence |
| Gate A Design Audit | `docs/drama-studio/design/design_audit.md` found by `rg --files` | [EXISTS] | Design audit reference |
| Gate B v2 + wireframes | `docs/drama-studio/design/gate-b/gate_b_wireframes.md`; 34 canonical Gate B wireframe SVGs listed under `docs/drama-studio/design/gate-b/wireframes/` | [EXISTS] | Flow/case behavior reference |
| Hybrid/HB docs | No separate `hybrid` / `HB1-HB6` / `HB2-a` files found by `rg --files`; hybrid default is documented in Phase 1 v3 at `docs/drama-studio/phase_1_architecture_v3.md:686` | [UNRESOLVED] as standalone docs | Use Phase 1 v3 hybrid contract until actual docs are located |
| Gate C.2 docs | `docs/drama-studio/design/gate-c/inventory.md:1-17` lists 7 docs; `coverage_matrix.md:1-14` says 34/34 covered | [EXISTS] | Visual source of truth |
| Gate C.2 Hi-Fi SVGs | `docs/drama-studio/design/gate-c/inventory.md:20-65` lists 34 canonical SVGs | [EXISTS] | Visual implementation reference only after approval |
| Current Drama prototype | `app/(dash)/(routes)/drama-studio/page.tsx:82-98`, `:105`, `:272`, `:365-373`, `:429` | [NON-BLOCKING]/[CONTRADICTED] | Not source of truth except locked Hero context |

## 4. DB Verification

This section is read-only repository verification. No DB command, migration, Prisma generate, or schema edit was run.

| Required entity/system | Exists actually | Evidence | Current fields/relations | Reuse | Gap | Decision required | Blocks implementation? |
|---|---|---|---|---|---|---|---|
| User wallet/credits | `User` has credit fields | `prisma/schema.prisma:43-67` | `creditBalance`, `monthlyCredits`, `creditsExpireAt`, `creditAdvanceBalance`, advance dates, relations to generations/transactions/provider usage | [REUSE] | No project-level Drama Credit Cap field proven | Credit Cap storage policy | Yes for paid generation |
| Generation | `Generation` model exists | `prisma/schema.prisma:77-115` | `userId`, `prompt`, media/output URLs, `assetType`, `modelUsed`, `cost`, provider cost fields, duration/resolution/aspect/quality, provider usage and request snapshot relations | [REUSE] | No Drama project/episode/scene/shot/block/take foreign keys | Generation metadata/link adapter | Yes for Jobs/Admin |
| ProviderUsageRecord | model exists | `prisma/schema.prisma:118-144` | `userId`, nullable `generationId`, provider/model/request/cost/tokens/duration/resolution/quality/aspect/status/rawPayloadSafe | [REUSE] | Drama hierarchy not represented | Drama request/provider snapshot mapping | Yes for audit |
| GenerationRequestSnapshot | model exists | `prisma/schema.prisma:146-165` | unique `generationId`, `userId`, provider/model/generationType/duration/resolution/aspect/quality/mode/inputType/userCreditsCharged/estimatedProviderCostUsd/requestPayload | [REUSE] | No quote id, block id, take id, continuity packet version | Snapshot extension/adapter | Yes |
| AdminTransaction | model exists | `prisma/schema.prisma:170-187` | `userId`, `plan`, `amount`, `credits`, `paymentStatus`, operator fields, decision fields | [REUSE] for billing/admin decisions only | Not a Drama creative decision table | Do not use for creative approvals unless ADR approves relation | No for draft, yes for billing linkage |
| CreditLedgerEntry | Code reads/writes name, Prisma model not found | `lib/credit-ledger.ts:107`, `:732`, `:890`; raw SQL read `lib/admin/history-read-model.ts:433-439`; no `model CreditLedgerEntry` found in `prisma/schema.prisma` search | Raw/cast usage only | [REUSE] only after DB verification | Actual DB table/migration not proven in this phase | DB verification gate | Yes for final finance design |
| ApiIdempotency | Helper casts `prismadb.apiIdempotency`, Prisma model not found | `lib/idempotency.ts:5-6`, `:29`, `:70`, `:112`, `:128`; no `model ApiIdempotency` found in `prisma/schema.prisma` search | helper-level begin/attach/complete behavior | [REUSE] only after DB verification | Actual DB table/migration/unique constraints not proven | DB verification gate | Yes for write APIs/jobs |
| Reservation | No central credit reservation model proven | `lib/credit-ledger.ts:638` charges; refunds at `:815`, `:855`, rollback at `:1048`; Gate C asks reserve visually at `docs/drama-studio/design/gate-c/gate_c_high_fidelity_spec.md:126` | charge/refund/reversal helpers, not reservation table | [ADAPTER REQUIRED] | reserve/reconcile semantics are not proven | Owner policy + ADR | Yes for Quote/Generate |
| Actual cost vs reserved | Actual provider cost update exists; reservation not proven | `lib/credit-ledger.ts:1308-1344`, `:1351-1462`; `lib/pricing.ts:906-917` | provider cost estimate/update via ProviderUsageRecord | [REUSE] | no reserved credits vs actual credits lifecycle | QuoteSnapshot/ledger ADR | Yes |

## 5. Registry Audit

| System | Official source in repo | Contract found | Reuse / Adapter |
|---|---|---|---|
| Video Registry | `lib/video-model-registry.ts:422`, capability type at `:38-81`, route fields at `:115-121` | `api_route`, optional `text_api_route`, `image_api_route`, `reference_api_route`, durations, resolutions, aspect ratios, refs, sound, end frame | [REUSE] via Drama capability adapter |
| Image Registry | `lib/dynamic-model-loader.ts:2`, image fallback at `:227-232`; central definition image mapping at `lib/model-definition-registry.ts:520-525` | dynamic image models from `PlatformConfig`, curated fallback from `IMAGE_MODELS` | [REUSE] through central definitions |
| Audio/TTS Registry | public model API filters audio at `app/api/models/route.ts:33-58`; central audio/TTS definition builders at `lib/model-definition-registry.ts:638-679`, `:789-830` | active audio list and central definitions | [REUSE] with Drama audio-track adapter |
| Central Model Definitions | `lib/model-definition-registry.ts:73-100`, `:838`, `:863-865` | status, modality, pricingRef, routingRef, capabilities, parameters, limits/defaults | [REUSE] as Drama selector source |
| Dynamic Models | `lib/dynamic-model-loader.ts:209-243`, `:265-284` | `dynamic_image_models`, `dynamic_video_models` stored in `PlatformConfig` | [REUSE] no hardcoded Drama lists |
| Admin Models | `app/api/admin/models/route.ts:32-39`, `:51`, `:102-103`, `:250-264` | admin reads/writes dynamic models and returns central source-of-truth string | [REUSE] do not scrape HTML |
| Public Models | `app/api/models/route.ts:19-21`, `:48`, `:58`; `app/api/model-definitions/route.ts:16`, `:23` | authenticated model definitions for UI consumers | [REUSE] filtered DTO required for Drama |
| Provider Registry | `lib/provider-registry.ts:5-17`, active checks at `:169-180` | provider modality/status/enabled/routing/fallback | [REUSE] |
| Provider Routes/Health | `lib/routing/admin-routing-data.ts:35-36`, `:115-124`, `:155-165` | effective routing and provider eligibility | [ADAPTER REQUIRED] Drama must expose routable/executable state |

Drama selector rule: no model id, duration, resolution, aspect ratio, FPS, audio support, price, provider, region, or queue limit is valid unless it comes from these exports/services. FPS, region, and queue limits remain [UNRESOLVED] where not exported.

## 6. Pricing/Credit Lifecycle Audit

| Lifecycle step | Current source | Status | Evidence | Drama need |
|---|---|---|---|---|
| Pricing Constitution | `PricingConstitution` model and manual sync | [EXISTS]/[REUSE] | `prisma/schema.prisma:613-629`; `prisma/migrations/manual/2026-05-21-sync-pricing-constitution.sql:1-7`, `:72-79` | consume existing pricing core |
| Platform pricing models | pricing file reads constitution then fallback | [EXISTS] | `lib/pricing.ts:4-15`, `:89-115` | no Drama hardcoding |
| Quote | generic quote APIs exist | [EXISTS]/[ADAPTER REQUIRED] | `app/api/pricing/quote/route.ts:28`, `:55-83`; `app/api/video/quote/route.ts:68-74` | minimum/expected/safe maximum + stale quote |
| Charge | `spendCredits` | [EXISTS]/[REUSE] | `lib/credit-ledger.ts:638`, usage at `app/api/video/route.ts:2659`, `:2974`, `:3154`, `:3302` | quote approval before calling charge |
| Provider usage | provider usage created/updated | [EXISTS]/[REUSE] | `lib/credit-ledger.ts:711`, `:927-1045`, `:1351-1462` | include Drama hierarchy metadata |
| Refund/Reversal | refund and rollback helpers | [EXISTS]/[REUSE] | `lib/credit-ledger.ts:815`, `:855`, `:890`, `:1048`, video refunds `app/api/video/route.ts:3508`, `:3605`, `:3631` | failed unit only, no double charge |
| Reserve | not proven as persistent central finance object | [UNRESOLVED]/[BLOCKING] | charge/refund proven; no reservation model found in schema search | owner policy: reserve vs charge-first |
| Requote | visual/spec contract exists; backend TTL/hash not proven | [ADAPTER REQUIRED] | Gate C component states at `docs/drama-studio/design/gate-c/gate_c_component_states.md:22-27`; Phase 1 quote contract at `docs/drama-studio/phase_1_architecture_v3.md:731-752` | QuoteSnapshot |
| Project Cap | visual/spec contract exists; schema storage not proven | [PHASE 2 ADD] | Phase 1 v3 mentions remaining project cap at `docs/drama-studio/phase_1_architecture_v3.md:492`, `:731-752` | persistence decision |

## 7. Admin/Audit Integration Map

Drama must extend central observability, not create a parallel admin.

| Operation/system | Existing admin source | Evidence | Drama mapping |
|---|---|---|---|
| Admin Model Registry | `/api/admin/models` with dynamic models + central definitions | `app/api/admin/models/route.ts:32-39`, `:51` | [REUSE] consume filtered DTO; no HTML scrape |
| Model Routing | admin routing data | `lib/routing/admin-routing-data.ts:115-124`, `:155-165` | [ADAPTER REQUIRED] show provider route and routable state |
| Provider Fleet | provider registry | `lib/provider-registry.ts:5-17`, `:169-180` | [REUSE] |
| Generation Monitor | admin generation detail | `app/api/admin/generations/[id]/route.ts:30`, provider usage include `:46`, snapshot `:56-58`, fields `:143-190` | [ADAPTER REQUIRED] add Drama hierarchy metadata |
| Job Queues & Workers | admin jobs read model/page | `lib/admin/jobs-read-model.ts:26-49`, statuses UI `app/admin/jobs/page.tsx:28-52` | [ADAPTER REQUIRED] Drama job must appear centrally |
| History/Audit | admin history route/read model | `app/api/admin/history/route.ts:8`, `lib/admin/history-read-model.ts:12-81`, ledger summary `:268-278` | [REUSE] with Drama fields |
| Transactions & Billing | AdminTransaction | `prisma/schema.prisma:170-187` | [REUSE] for billing only |
| Pricing Constitution | admin pricing route/model | `schema.prisma:613`; `app/api/admin/pricing-constitution/route.ts:29`, `:96` | [REUSE] |
| Provider Costs | provider cost estimates and usage | `lib/pricing.ts:906-917`; `lib/credit-ledger.ts:1308-1344` | [REUSE] |
| Storage Matrix | storage runtime/provider registry | `lib/storage/runtime.ts:12-23`, `:186`, `:251`; `lib/storage/provider-registry.ts:16-17`, `:121` | [REUSE] |
| Feature Registry | product registry | `lib/product/feature-registry.ts:46-66`, `:483` | [ADAPTER REQUIRED] Drama feature entry/flag not proven |
| Knowledge Hub | knowledge store/model proposals | `lib/admin/knowledge-hub.ts:7-8`, `:23-27`, `:116-133`, `:415-520`, `:523-649`; admin models reads pending changes `app/api/admin/models/route.ts:45-47` | [REUSE] for imported docs, not runtime truth until published |

Minimum generation payload for Drama audit remains required but physical storage is [UNRESOLVED]: `userId`, `projectId`, `episodeId`, `sceneId`, `shotId`, `generationBlockId`, optional `takeId`, `modelId`, `providerRoute`, `quoteId`, `idempotencyKey`, `reservedCredits`, `actualCredits`, ledger/transaction reference, status, retry metadata, output assets, error/refund information, timestamps.

## 8. Storage/Asset Audit

| Storage requirement | Existing source | Status | Evidence | Drama adapter need |
|---|---|---|---|---|
| Runtime policy | central storage runtime | [EXISTS]/[REUSE] | `lib/storage/runtime.ts:12-23`, `:70`, `:186-233` | read current policy only |
| Active provider | default active write provider is configured by runtime | [EXISTS] | `lib/storage/runtime.ts:73`, validation/fallback `:213-247` | no Drama provider bypass |
| Read fallback | active provider then legacy providers | [EXISTS] | `lib/storage/runtime.ts:256-267`, `:540-550` | reuse |
| Object keys/public URLs | object resolution and public URL resolver exist | [EXISTS] | `lib/storage/runtime.ts:89`, `:115-169`, `:454-481` | store lineage and versions |
| Signed upload URLs | runtime + provider helpers | [EXISTS]/[PARTIAL] | `lib/storage/runtime.ts:377-388`, `lib/storage/backblaze.ts:158-172`, `lib/storage/supabase.ts:105-115`, `lib/r2-storage.ts:66-71` | TTL policy [UNRESOLVED] |
| `/api/assets` | authenticated asset read/delete/create | [EXISTS] | `app/api/assets/route.ts:295-307`, `:560-616`, `:623-665` | projectId filter for Drama assets |
| Media proxy | HEAD/GET media route | [EXISTS]/[PARTIAL] | `app/api/media/[...path]/route.ts:53-89`, `:97-145`, `:212` | project-aware authorization [UNRESOLVED] |
| Upload routes | user path isolation | [EXISTS]/[PARTIAL] | `app/api/studio/upload-url/route.ts:61-95`, `:150-180`; `app/api/panel/upload-url/route.ts:72-115`, `:126-160` | project asset isolation missing |
| Retention/delete | storage cleanup helper and asset delete flow | [EXISTS]/[ADAPTER REQUIRED] | `app/api/assets/route.ts:585-616`; `lib/storage/storage-lifecycle.ts:43`, `:166`, `:217`, `:257` | rejected Take/storyboard retention policy |

## 9. Project System Audit

| Project requirement | Current evidence | Status | Gap |
|---|---|---|---|
| Create/open project | Cinema and Timeline project models exist | [REUSE]/[ADAPTER REQUIRED] | `CinemaProject` is cinema-specific at `schema.prisma:339-359`; `TimelineProject.stateJson` at `:644-653` is generic JSON |
| Rename | project names exist in candidate models | [ADAPTER REQUIRED] | no Drama rename route proven |
| Recent Projects / All Projects Overlay | Gate C has modal/headers | [PHASE 2 ADD] | `inventory.md:48-57`; no Drama backend route |
| Autosave / states | Gate B/C specify states | [PHASE 2 ADD] | no Drama persistence service |
| Saving/Saved/Failed/Offline/Conflict | conflict modal exists in design | [PHASE 2 ADD] | `inventory.md:56` and `gate_c_component_states.md:33-39`; no backend conflict resolver |
| Version Snapshots | Phase 1 v3 contract exists | [PHASE 2 ADD] | `docs/drama-studio/phase_1_architecture_v3.md:331-377`; no physical model |
| Save a Copy As | Gate C modal exists | [PHASE 2 ADD] | `inventory.md:55` |
| Archive/Soft Delete/Restore | Gate C modal exists | [PHASE 2 ADD] | `inventory.md:56-57`; no Drama model flags |
| Poster Evolution | no Drama evidence | [UNRESOLVED] | requires asset lineage policy |
| Multi-session conflict resolution | design modal exists | [PHASE 2 ADD] | no route/storage semantics proven |

## 10. Agent Memory Audit

Approved memory layers:

1. Project Bible.
2. Character Memory.
3. Location Memory.
4. Element Memory.
5. Narrative Timeline.
6. Episode / Scene Memory.
7. Continuity Snapshots.
8. Approved Decisions.
9. Version Memory.

| Memory item | Current evidence | Status | Required action |
|---|---|---|---|
| User libraries | Character/Element/Location/Effect/Camera/Palette exist | [REUSE] | `schema.prisma:661`, `:679`, `:697`, `:715`, `:733`, `:751`; bind to Drama project memory carefully |
| Drama memory persistence | no Drama-specific memory model | [PHASE 2 ADD]/[BLOCKING] | ADR required |
| Agent conversation context | current prototype uses local React state | [CONTRADICTED] | `app/(dash)/(routes)/drama-studio/page.tsx:105`; replace with persistent chat tied to `projectId` |
| Settings click behavior | prototype appends messages for clicks | [CONTRADICTED] | `app/(dash)/(routes)/drama-studio/page.tsx:365-373`; must not spam chat |
| Voice Agent JSON memory | separate feature only | [NON-BLOCKING] | `schema.prisma:941-944`; not proof for Drama |
| Approved Takes/generation history | Generation exists, Take relation missing | [ADAPTER REQUIRED] | `schema.prisma:77-115`; add Drama hierarchy link after ADR |

The agent must use Proposal -> Approve/Reject -> Apply, ask one question only when ambiguity blocks progress, retrieve memory by `projectId`, and never claim generation success before the actual job succeeds.

## 11. Long-Form Production Audit

Required next implementation must support:

```text
Project -> Season -> Episode -> Scene -> Beat -> Shot -> Generation Block -> Take -> Approved Take -> Assembly -> Final Export
```

| Contract | Current evidence | Status | Required for Phase 2 |
|---|---|---|---|
| Duration fields | Phase 1 v3 defines target/planned/generated/approved/final duration | [EXISTS] contract | `docs/drama-studio/phase_1_architecture_v3.md:105-123`; physical storage [UNRESOLVED] |
| Dialogue timing before shot duration | scheduler contract exists | [EXISTS] contract | `docs/drama-studio/phase_1_architecture_v3.md:686-704`; implementation missing |
| Generation Block segmentation | logical contract exists | [EXISTS] contract | no scheduler implementation found |
| Max duration from registry | video registry exports durations | [REUSE] | `lib/video-model-registry.ts:52-55`, examples `:783-799`, `:823-841`; never treat model max as episode duration |
| Cut/Chaining/Extension | hybrid default documented | [EXISTS] contract | `docs/drama-studio/phase_1_architecture_v3.md:686` |
| Reference Packet | Context Packet schema exists | [EXISTS] contract | `docs/drama-studio/phase_1_architecture_v3.md:505-532` |
| Start/End Frames | capability flags exist | [REUSE] | `lib/video-model-registry.ts:38`, `:468`, `:663`, `:791` |
| Previous Approved Take | no physical Take model | [PHASE 2 ADD] | blocked by domain ADR |
| Continuity In/Out | contract exists | [EXISTS] contract | `docs/drama-studio/phase_1_architecture_v3.md:533-573` |
| Retry failed unit only | contract exists; existing jobs have partial retry/fail states | [ADAPTER REQUIRED] | `docs/drama-studio/phase_1_architecture_v3.md:570-573`; `lib/admin/jobs-read-model.ts:331-343` |
| Assembly order | contract exists | [EXISTS] contract | `docs/drama-studio/phase_1_architecture_v3.md:770-785` |
| Seven audio tracks | contract exists; audio routes/models exist | [ADAPTER REQUIRED] | `docs/drama-studio/phase_1_architecture_v3.md:719-729`; `app/api/generate/audio/route.ts:1306`, `:1331-1337` |
| Storyboard optional | Gate/Phase contract exists | [EXISTS] contract | `docs/drama-studio/phase_1_architecture_v3.md:580-594`; Gate C inventory `:42-44` |

## 12. FLUX 3 and Video Model Family Audit

FLUX 3 rule: treat as a central registry candidate only. No Drama UI constant is allowed.

Scoped search result: no `FLUX 3`, `Flux 3`, `flux-3`, `flux3`, `FLUX.3`, or `flux.3` match was found in `docs/drama-studio`, `lib`, or `app/api`.

| Family | Registry evidence | Routes/capabilities | Arabic support classification |
|---|---|---|---|
| FLUX 3 Video | no repo evidence found | [UNRESOLVED] | Arabic Prompt Understanding / Dialogue / Synchronized Audio / Lip Sync / Captions all `[غير محسوم — يحتاج Runtime Validation]` |
| FLUX/Flux image | dynamic loader recognizes Flux image families | `lib/dynamic-model-loader.ts:344-348`, `:488-504`; provider tariff mentions image Flux at `lib/provider-tariff-registry.ts:489-497` | not video proof |
| Seedance | video registry rows exist | Seedance 2.5/2.0 rows at `lib/video-model-registry.ts:823-957`; route dispatch at `app/api/video/route.ts:2236-2253` | Arabic capabilities `[غير محسوم — يحتاج Runtime Validation]` unless separately validated |
| Kling | video registry rows exist | `lib/video-model-registry.ts:464-528`; payload validation at `app/api/video/route.ts:2096-2152`; route dispatch at `:2256-2307` | Arabic capabilities `[غير محسوم — يحتاج Runtime Validation]` |
| MiniMax H3 | registry row exists | `lib/video-model-registry.ts:431-445`; tariff handling `lib/provider-tariff-registry.ts:371-379` | Arabic capabilities `[غير محسوم — يحتاج Runtime Validation]` |
| Gemini Omni | registry row exists | `lib/video-model-registry.ts:754-764`; route handling `app/api/video/route.ts:1942-1973`, `:2527-2531` | Arabic capabilities `[غير محسوم — يحتاج Runtime Validation]` |
| Wan | registry rows and dynamic route split exist | `lib/video-model-registry.ts:783-802`; dynamic resolver `lib/dynamic-model-loader.ts:586-595`; server route split `app/api/video/route.ts:2379-2392` | Arabic capabilities `[غير محسوم — يحتاج Runtime Validation]` |
| Sora/Veo/Grok/Hailuo | registry rows exist | Sora `lib/video-model-registry.ts:608-638`; Veo `:658-746`; Grok `:980-1035`; Hailuo `:566-587` | Arabic capabilities `[غير محسوم — يحتاج Runtime Validation]` |

Normalization fields Drama can derive when present: `modelId`, `displayName`, modality, route refs, `duration` options, resolution/quality options, aspect ratios, reference slot limits, first/last frame support, native audio flag, extension/edit route hints, active status, pricingRef, routingRef. It must not infer unsupported capabilities from family names.

## 13. Six Owner Decisions

Extracted from `docs/drama-studio/phase_1_1_spike_report.md:469-476`.

| ID | Question | Why needed | Evidence | Realistic options | Impact | Recommendation | Blocks | Owner decision |
|---|---|---|---|---|---|---|---|---|
| OD1 | Choose Beat physical representation | scheduler/QC/approval need stable Beat identity | no `Beat` model; JSON fields `schema.prisma:649`, `:449` | independent table / embedded JSON / discriminated structure | Schema/API/Admin/Long-form | independent Beat if relational ADR approved; otherwise discriminated contract | Prisma, API, Jobs | Pending |
| OD2 | Choose Drama project persistence strategy | avoid corrupting Cinema semantics | `CinemaProject` `schema.prisma:339-359`; `TimelineProject` `:644-653` | new Drama tables / extend Cinema / hybrid | Schema/API/UI/Admin | dedicated Drama persistence after reuse ADR | Prisma, API, UI | Pending |
| OD3 | Approve shared project-aware Board approach | D1 is approved, implementation choice still needs component path | Canvas localStorage `app/(dash)/(routes)/canvas/page.tsx:1184`, `:1917-1936`; D1 `phase_1_architecture_v3.md:34-50` | reuse primitives / wrapper / refactor cinema-board | UI/storage/API | shared Board using primitives with DB-backed projectId | UI, API | Approved product direction; physical path pending |
| OD4 | Approve quote staleness and Credit Cap policy | prevents stale/deceptive charges | quote APIs `app/api/pricing/quote/route.ts:55-83`; no reservation table | TTL/hash snapshot / direct requote / reservation model | Credits/API/Admin | QuoteSnapshot with input hash and cap check before debit | API, Jobs, Credits | Pending |
| OD5 | Approve feature flag source | D2 approved but source not proven for Drama | Product Feature Registry fields `lib/product/feature-registry.ts:46-66`; no Drama id proven | Product Feature Registry / PlatformConfig / route config | UI/release/admin | reuse existing registry/config after proof | UI route exposure | Pending |
| OD6 | Approve Admin Jobs visibility shape | no parallel Drama admin allowed | Admin jobs/history `lib/admin/jobs-read-model.ts:26-49`; history `lib/admin/history-read-model.ts:12-81` | existing rows + metadata / detail drawer / filtered view | Admin/Audit/Jobs | extend central rows with Drama metadata | Jobs/Admin | Pending |

## 14. Ten ADR Queue

Extracted from `docs/drama-studio/phase_1_1_spike_report.md:445-456`.

| ADR | Problem | Current state | Alternatives | Recommended option | Schema | API | Admin/Audit | Credits | Storage | Long-form | Risk | Rollback | Decision state |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ADR1 Beat physical representation | Beat identity/versioning | no Beat model | table / JSON / discriminated | table if approved, discriminated contract first | high | high | high | medium | low | high | over/under modeling | keep logical contract, defer migration | Owner Decision Required |
| ADR2 Drama project/entity mapping | entity persistence | Cinema/Timeline partial | new / extend / hybrid | dedicated Drama model after reuse comparison | high | high | high | medium | medium | high | Cinema coupling | keep prototype read-only | Owner Decision Required |
| ADR3 Project memory retrieval | durable memory | no Drama memory | normalized / JSON / hybrid | scoped versioned retrieval records | high | high | medium | low | medium | high | prompt bloat | fall back to read-only no-memory draft | Owner Decision Required |
| ADR4 Drama job + Generation linkage | orchestration audit | Generation/CinemaJob partial; Inngest test-only | Generation-linked / CinemaJob generalized / Inngest | Generation-linked Drama job metadata | high | high | high | high | medium | high | duplicate ledger/admin | disable generation, keep planning | Owner Decision Required |
| ADR5 QuoteSnapshot/staleness/cap | financial safety | quote exists, reserve missing | direct / TTL / hash snapshot | hash snapshot + cap before debit | medium | high | high | high | low | high | wrong charge | expire quotes, require requote | Owner Decision Required |
| ADR6 Board persistence and Canvas reuse | project-aware board | Canvas localStorage | primitive reuse / wrapper / refactor | shared DB-backed board using primitives | medium | high | medium | low | medium | medium | fake board | disable board entry | Owner Decision Required |
| ADR7 Feature flag + Preview Banner | release safety | D2 approved, source not proven | feature registry / PlatformConfig / route config | existing registry/config after proof | low | medium | high | low | low | low | public incomplete feature | hide route, keep preview banner | Owner Decision Required |
| ADR8 Audio timeline and voice continuity | seven tracks | audio routes exist; Drama track model missing | separate tracks / JSON / external assembly | track contract linked to characters/Takes | medium | high | medium | medium | high | high | sync drift | video-only planning disabled for final | Proposed |
| ADR9 Asset lineage and Take versioning | traceability | storage exists; lineage missing | Generation metadata / asset table / hybrid | Generation-linked asset lineage per Take | high | high | high | medium | high | high | orphaned assets | mark assets unapproved, no delete | Owner Decision Required |
| ADR10 Admin observability mapping | central monitor | admin exists; Drama drill-down missing | metadata extension / filtered view / new page | existing admin rows plus detail metadata | medium | medium | high | high | medium | high | hidden failures/costs | keep generation blocked | Owner Decision Required |

## 15. Blocking Gaps

- [BLOCKING] Repo-local full reference/Phase 0/0.1 review files are not proven by `rg --files`; use approved Phase 1 citations until located.
- [BLOCKING] `CreditLedgerEntry` and `ApiIdempotency` are code-referenced but not Prisma models in inspected schema.
- [BLOCKING] Credit reservation is not proven as an existing persistence object.
- [BLOCKING] Drama hierarchy has no physical model.
- [BLOCKING] No Drama scheduler implementation exists.
- [BLOCKING] No Drama project memory persistence exists.
- [BLOCKING] No Drama feature flag entry/source is proven.
- [BLOCKING] No project-aware Drama asset lineage/audit mapping exists.
- [BLOCKING] FLUX 3 Video is not found in repo registry/Knowledge evidence.

## 16. Non-Blocking Gaps

- [NON-BLOCKING] Current Drama prototype is useful only as visual/prototype context and must not drive backend truth.
- [NON-BLOCKING] `--ss-green` and `--ss-red` exist in Gate C SVGs at paths such as `docs/drama-studio/design/gate-c/components/CMP-01_project_card_states.svg:18-21`; Gate C high-fidelity spec still marks them proposed at `docs/drama-studio/design/gate-c/gate_c_high_fidelity_spec.md:27-28`, so production token addition remains an approval matter.
- [NON-BLOCKING] Gate C.2 has complete inventory and coverage docs: `inventory.md:1-17`, `coverage_matrix.md:1-14`.
- [NON-BLOCKING] Existing audio/image/video model registries are reusable with a Drama adapter.

## 17. Recommended Phase 2 Implementation Order

1. Close OD1, OD2, OD4, OD5, OD6 and ADR1-ADR10 without code.
2. Run the next approved DB-only verification for `CreditLedgerEntry`, `ApiIdempotency`, reservation alternatives, unique constraints, and actual migrations.
3. Define Drama capability adapter DTO from central model definitions and registries.
4. Define QuoteSnapshot, stale quote, Credit Cap, and ledger linkage contract.
5. Define Generation-linked Drama job metadata and central admin mapping.
6. Define Drama domain persistence for Project -> Season -> Episode -> Scene -> Beat -> Shot -> Generation Block -> Take.
7. Define project memory persistence/retrieval and proposal/version contracts.
8. Define storage asset lineage, retention, and project-level authorization.
9. Define shared project-aware Board persistence.
10. Only after explicit approval, start implementation in a new worktree/branch with one writer.

## 18. Explicit Stop Statement

Phase 2 implementation has not started. This report does not authorize Prisma, migrations, APIs, UI, Jobs, registry edits, pricing edits, storage edits, design edits, Hero edits, Navbar edits, or `PROJECT_CONTEXT.md` edits. Stop here and wait for explicit owner approval.
