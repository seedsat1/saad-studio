# Drama Studio - Phase 1 Architecture v3

**Status:** Phase 1 Conditionally Accepted.  
**Phase 2:** Blocked.  
**Blocking reason:** D1 and D2 are now recorded as owner-approved product decisions, but Phase 2 remains blocked until this v3 is reviewed and Phase 1.1 Repository Spike is completed as read-only evidence.

This is a design and contract document only. It does not authorize code, Prisma, APIs, UI, routes, migrations, or production component changes.

## Architectural Changelog

| Change | Correction |
|---|---|
| F1 | Project memory is now fixed at nine persistent layers, including `Episode / Scene Memory` as a separate layer |
| F2 | Board is explicitly a `Workspace Surface`, not a `Domain Scope` |
| F3 | State transitions now include Actor, authorization, audit, quote, credit reservation, failure/cancel/retry behavior |
| F4 | Version Memory is immutable; approved versions are never edited in place |
| F5 | Unresolved items are centralized with reason, evidence needed, phase, and decision owner |
| F6 | Invalid Selector Cascade is specified for media kind, provider, model, mode, duration, resolution, ratio, audio, extension, upscale, and lip sync |

## 0. Source Order and Read Proof

| Order | Source | Actual path | Lines |
|---:|---|---|---:|
| 1 | Source of Truth | `C:\Users\PC\Desktop\المراجع\drama_studio_complete_reference.md` | 950 |
| 2 | Phase 0 Gap Analysis | `C:\Users\PC\Desktop\المراجع\تم لصق markdown(20260825-225555).md` | 514 |
| 3 | Phase 0.1 Corrections | `C:\Users\PC\Desktop\المراجع\تم لصق markdown(20260825-230813).md` | 668 |
| 4 | Phase 1 Architecture v2 | `E:\موقع ثاني\next14 ai saas\next14-ai-saas-main\next14-ai-saas-main\docs\drama-studio\phase_1_architecture_v2.md` | 636 |
| 5 | Phase 1 Review | `C:\Users\PC\Desktop\المراجع\تم لصق markdown(20260825-233028).md` | 567 |

Files named `phase_0_gap_analysis.md`, `phase_0_1_corrections.md`, and `phase_1_review.md` were not found in the repository by direct file search. The actual attached files above are the sources used.

## 1. Fixed Product Decisions

### D1 - Project Board

| Field | Value |
|---|---|
| decisionId | `D1-project-board-shared-project-aware` |
| decisionType | Product architecture |
| approvedValue | Shared Project Board linked by `projectId`; no fourth Drama Studio route |
| approvedBy | Project owner |
| approvedAt | 2026-08-26, from user approval text |
| reason | Drama Studio has three routes; Board is existing/shared platform space, not a Drama-specific page |
| affectedScope | Workbench, asset reuse, production references, Board integration |
| implementationStatus | Not implemented |
| verificationStatus | Pending Phase 1.1 read-only repository spike |

Allowed options for Phase 1.1 investigation: direct reuse of Canvas primitives, wrapper around existing canvas, or refactor of `cinema-board` into a shared project-aware board. Product decision remains fixed: no fake Board and no fourth Drama route.

Board is not part of the dramatic hierarchy and must not appear as a content `scope`. If an action starts from the Board, contracts must record `workspaceSurface: board`, the real dramatic target such as Scene or Shot, and the related node or asset reference separately.

### D2 - Visibility During Build

| Field | Value |
|---|---|
| decisionId | `D2-feature-flag-plus-preview-banner` |
| decisionType | Release safety |
| approvedValue | Feature Flag plus Preview Banner |
| approvedBy | Project owner |
| approvedAt | 2026-08-26, from user approval text |
| reason | Public access must be blocked during construction; approved users still need an honest preview signal |
| affectedScope | Drama entry route, Workbench route, Production route, allowed-user experience |
| implementationStatus | Not implemented |
| verificationStatus | Pending Phase 2 or later implementation tests |

Preview Banner is not a substitute for Feature Flag.

### D3 - Adaptation and Prompt Separation

`adaptationMode` is a project/story setting. `promptFormat` is a production prompt rendering setting. They are separate and must never be merged.

## 2. Non-Negotiable Constraints

- Do not modify the approved Hero without explicit permission.
- Do not modify Navbar or navigation in this phase.
- Agent stays left at 40-42%.
- Workbench stays right at 58-60%.
- Columns do not flip for Arabic.
- Text direction may change inside text content only.
- Management tabs are exactly: Settings, Outline & Script, Characters, Locations & Environments, Elements & Props.
- Creative tools are exactly: Style, Character, Element, Location, Color, Effects, Camera, Sketch, Storyboard.
- Storyboard is optional.
- No Hook Chain.
- No mandatory Hook or Cliffhanger.
- No Topview story, names, prompts, commands, images, branding, or code.
- No demo data represented as real.
- No success message before actual persistence or job success.
- No credit charge on Draft creation.
- No generation before Quote and explicit approval.
- No hardcoded model capabilities, prices, routes, durations, ratios, resolutions, FPS, audio values, or quality values.
- No full episode regeneration because one block failed.
- No accepting a Take when its `continuityIn` conflicts with the prior approved state unless an intentional cut or time jump is approved.
- No full project history dump to the model; use retrieval-based Context Packet.
- No fourth Drama Studio route.
- No fake Project Board.

## 3. Routes and Workspaces

Drama Studio consists of exactly three Drama routes:

1. `/drama-studio`
2. `/drama-studio/[projectId]`
3. `/drama-studio/[projectId]/episodes/[episodeId]/production`

Project Board is a reused/shared platform space linked by `projectId`; its final implementation path is pending Phase 1.1.

## 4. Wireframes

### `/drama-studio`

```text
[Approved Hero and existing outer navigation remain unchanged]

Story Composer
- Idea / pasted text / supported upload [unresolved: supported file types]
- contentFormat selector
- episodeMode selector
- adaptationMode selector: Faithful / Balanced / Creative
- initial model selector, registry-driven only
- Start button: Create Draft Project

After submit
- validate input
- create real Draft Project
- return projectId
- navigate to Workbench
- no video generation
- no credit charge
```

### `/drama-studio/[projectId]`

```text
Project Header
- title
- project state
- contentFormat / episodeMode / adaptationMode
- targetDurationSec / plannedDurationSec
- Credit Cap / Estimated Credit Range
- Open Project Board
- Enter Production, disabled until guards pass

┌──────────────────────────────┬────────────────────────────────────┐
│ Agent 40-42%                 │ Workbench 58-60%                   │
│ fixed left                   │ fixed right                        │
│ chat persistence             │ Tabs, spatial LTR:                 │
│ memory citations             │ 1 Settings                         │
│ proposal cards               │ 2 Outline & Script                 │
│ one-question ambiguity rule  │ 3 Characters                       │
│ composer fixed bottom        │ 4 Locations & Environments         │
│                              │ 5 Elements & Props                 │
│                              │ Creative Tools Rail, 9 tools       │
└──────────────────────────────┴────────────────────────────────────┘
```

Empty states are part of the contract: no fake scenes, no fake characters, no fake progress, and no fake Board.

### `/drama-studio/[projectId]/episodes/[episodeId]/production`

```text
Production Header
- back to Workbench
- episode / scene / beat / shot selectors
- state
- model and provider badges from registry
- remaining project Credit Cap
- Preview Render / Final Render readiness

┌──────────────────────────────┬────────────────────────────────────┐
│ Agent 40-42%                 │ Production Room 58-60%             │
│ proposal-aware               │ Prompt/Script Editor               │
│ one question max             │ Preview Canvas                     │
│ no false job claims          │ Version Rail                       │
│ quote-before-generate        │ Multi-track Timeline               │
│                              │ Production Selectors               │
│                              │ Generation Controls                │
│                              │ Quote / Takes / Continuity / QC    │
└──────────────────────────────┴────────────────────────────────────┘
```

## 5. State Machine

| State | Meaning | Allowed transition | Guard |
|---|---|---|---|
| Draft | Idea saved, settings not approved | Configuring | owner verified, draft exists |
| Configuring | Agent and settings are active | Planning | approved Settings Snapshot |
| Planning | plan is being created | Asset Preparation | project or episode plan approved |
| Asset Preparation | characters, locations, props, refs | Script & Shot Planning | required assets ready or explicit skip approved |
| Script & Shot Planning | script, beats, shots, blocks | Production | at least one episode/scene/shot/block plan and Quote ready |
| Production | Takes generated/reviewed | Assembly | required Takes approved or gaps accepted |
| Assembly | preview/final composition | Review | Preview Render exists |
| Review | full episode review | Completed | Final Render approved |
| Completed | final deliverable | Review | [غير محسوم] reopen policy |

Failure transition: any active state can keep the same project state while marking the failed unit only. The active-job query source is [غير محسوم] until Phase 1.1 proves the actual job system.

### 5.1 Actor, Authorization, Audit, and Finance Guards

Logical actors:

- `Project Owner`
- `Authorized Editor`
- `Agent`
- `System / Job Runner`
- `Admin Support`

Rules:

- Agent may analyze, draft, and create Proposal records.
- Agent may not approve creative decisions for the user.
- Project Owner or Authorized Editor may approve, reject, request changes, or revert.
- System / Job Runner manages Queue, Generating, Retry, Completed, Failed, and Cancelled states.
- Admin Support may assist recovery, restart, refund, or authorized restore with full audit; Admin Support does not approve creative decisions.
- Paid generation cannot start before Quote, user approval, and financial verification.

| From | To | Allowed actor | Transition conditions | Audit event | User approval | Quote required | Credit reservation | Failure/cancel/retry behavior |
|---|---|---|---|---|---|---|---|---|
| Draft | Configuring | Project Owner, Authorized Editor, Agent with user input | draft project exists and ownership verified | `project.configuring.started` | no | no | no | invalid owner keeps Draft |
| Configuring | Planning | Project Owner, Authorized Editor | Settings Summary approved and Settings Snapshot created | `settings.snapshot.approved` | yes | no | no | rejected settings remain draft |
| Planning | Asset Preparation | System / Job Runner | planning job completes and plan is approved by user | `plan.approved` | yes | no | no | failed planning keeps Planning with retry option |
| Asset Preparation | Script & Shot Planning | Project Owner, Authorized Editor | required assets ready or explicit skip approved | `assets.prep.approved` | yes | maybe, for generated assets only | only for approved asset generation | failed asset job marks asset only |
| Script & Shot Planning | Production | Project Owner, Authorized Editor | script, beats, shots, blocks, continuity preflight, and Quote are ready | `production.ready.approved` | yes | yes | yes, if platform supports reservation; otherwise [غير محسوم] | stale Quote blocks transition |
| Production | Assembly | Project Owner, Authorized Editor, System / Job Runner | required Takes approved or gaps accepted | `production.takes.accepted` | yes for accepting gaps | maybe | no new reservation | failed Block can retry only that Block |
| Assembly | Review | System / Job Runner | Preview Render completed | `assembly.preview.completed` | no | yes for render if paid | yes if paid render | render failure keeps Assembly |
| Review | Completed | Project Owner, Authorized Editor | Final Render approved | `final.approved` | yes | maybe for final render | according to Quote | rejection returns to Assembly/Production scope only |
| Completed | Review | Project Owner, Authorized Editor | [غير محسوم] reopen policy approved | `project.reopened` | yes | maybe | maybe | creates new version; does not mutate final |
| Any active | same state with failed unit | System / Job Runner, Admin Support | provider failure, cancellation, timeout, or retry exhaustion | `unit.failed` / `unit.cancelled` / `unit.retry.requested` | retry paid work needs approval unless covered by approved Quote | maybe | no double charge | retry failed unit only |

## 6. Domain Model

```text
Project
  -> Season?               optional
    -> Episode
      -> Scene
        -> Beat            logical first-class entity
          -> Shot
            -> Generation Block
              -> Take
                -> Asset Version

After generation:
Continuity -> QC -> Assembly
```

Durations are separated:

| Field | Meaning |
|---|---|
| targetDurationSec | what the user wants |
| plannedDurationSec | sum of the current plan |
| generatedDurationSec | sum of generated units |
| approvedDurationSec | sum of approved Takes |
| finalDurationSec | duration of final assembled output |

No fixed duration number is allowed inside a component.

## 7. Current Prisma Mapping

This is reuse analysis only. It does not propose migrations.

| Logical entity | Current candidate | Reuse / gap |
|---|---|---|
| Project | `CinemaProject` | candidate only; may cause nullable field growth |
| Season | none proven | [غير محسوم] |
| Episode | none proven | [غير محسوم] |
| Scene | no independent match | [غير محسوم] |
| Beat | none | physical mapping [غير محسوم] |
| Shot | `CinemaShot` | partial; lacks Episode/Scene/Beat/Block/Take hierarchy |
| Generation Block | `Generation`, `CinemaJob` partial | needs orchestration mapping |
| Take | `Generation` output/snapshots partial | needs active version relation |
| Asset Version | asset/storage/generation outputs partial | [غير محسوم] |
| Character | `UserCharacter`, `CinemaCharacter` | reuse/extend candidate |
| Location | `UserLocation`, `CinemaLocation` | reuse/extend candidate |
| Element | `UserElement`, `CinemaAsset` | reuse/extend candidate |
| Color | `UserPalette` | candidate |
| Effect | `UserEffect` | candidate |
| Camera | `UserCamera` | candidate |
| Job | `Generation`, `CinemaJob`, admin read models | link, do not duplicate |
| Credits | pricing/credit systems | link, do not invent ledger |

## 8. ADR - Beat Representation

| Option | Strength | Risk |
|---|---|---|
| Independent table | queryable, versionable, approval-aware, good for QC | requires migration and M2M decisions |
| JSON inside Scene | flexible, fewer tables | weak identity, weak per-beat approvals |
| Discriminated structure | explicit logical types with flexible payloads | validator complexity |

Decision: Beat is logical first-class. Physical representation remains [غير محسوم] until Phase 1.1 and Phase 2 design. Preferred direction if relational integrity is approved: independent Beat record with versioned payload fields.

## 9. ADR - Project Memory

Decision: Project memory has nine persistent layers linked to `projectId`. This is a settled Phase 1 architecture decision, not [غير محسوم].

| Layer | Required content |
|---|---|
| Project Bible | world laws, core characters, style, language, prohibitions, and project-wide reference |
| Character Memory | each character identity, look, relationships, voice, and development |
| Location Memory | location specs, lighting, spatial layout, and state over time |
| Element Memory | props, clothes, vehicles, weapons, and recurring objects |
| Narrative Timeline | story-world event order, causality, and dramatic time |
| Episode / Scene Memory | what happened, was approved, and changed inside each episode and scene |
| Continuity Snapshots | continuity state before and after shots and generation blocks |
| Approved Decisions | user-approved decisions, scope, and reasons |
| Version Memory | history of versions, edits, approvals, rejections, and restores |

Physical storage remains [غير محسوم], but the nine-layer memory architecture is fixed. Retrieval-based selection is mandatory; full project history must not be sent to the model. `Episode / Scene Memory` must not be silently merged into `Narrative Timeline`: timeline answers "when and why events happen"; episode/scene memory answers "what was approved and changed in this episode or scene."

## 10. Approved Decisions and Version Memory Contract

ApprovedDecision:

| Field | Meaning |
|---|---|
| decisionId | stable id |
| decisionType | settings, character, scene, continuity, quote, take, board |
| scope | project, season, episode, scene, beat, shot, block, take |
| beforePayload | previous approved value |
| afterPayload | new approved value |
| decidedBy | user id |
| decidedAt | timestamp |
| reason | user/system-visible reason |
| revertedAt | nullable |
| revertReason | nullable |

VersionMemory:

| Field | Meaning |
|---|---|
| versionId | stable id |
| entityRef | target entity |
| parentVersionId | nullable |
| state | draft, approved, archived, rejected |
| activeFromVersionId | nullable |
| activeUntilVersionId | nullable |
| createdBy | actor |
| createdAt | timestamp |

### 10.1 Immutable Version Cycle

Version Memory is append-only:

1. Create Proposal.
2. Create a new Draft Version linked to `parentVersionId`.
3. Show diff, scope, impact, continuity effect, duration effect, and cost effect.
4. On approval, the chosen version becomes Approved/Active.
5. On rejection, the version remains stored as Rejected.
6. On Revert, create a new version pointing to the restored version.
7. Approved versions are never edited in place.
8. Decision and version history is never deleted to simplify current state.

Logical version memory must include: `projectId`, domain scope, target entity, `parentVersionId`, actor, reason, date, state, diff or hash, related decision, continuity impact, duration impact, and cost impact. These are Phase 1 contracts, not Prisma schema.

### 10.2 Domain Scope Contract

Valid dramatic scopes:

- Project
- Season
- Episode
- Scene
- Beat
- Shot
- Generation Block
- Take

Invalid as dramatic scope:

- Board

Board-related actions use:

```text
workspaceSurface: board
targetScope: Scene | Shot | Generation Block | Take | Project | ...
targetEntityRef: EntityRef
boardNodeRef?: EntityRef
assetRef?: EntityRef
```

This applies to AgentRequest, CreativeProposal, ApprovedDecision, VersionMemory, and any future contract carrying `scope`.

## 11. Creative Positioning and Settings Approval Contract

### Fields

| Group | Fields |
|---|---|
| Creative Positioning | Genre, Background, Tone/Trope, Custom option for each group |
| Project Format | contentFormat, episodeMode |
| Adaptation | adaptationMode: Faithful, Balanced, Creative |
| Prompt Rendering | promptFormat: Natural Description, Professional Storyboard, Faithful to Script |
| Storyboard | storyboardMode: No Storyboard, Keyframes, Full Storyboard |
| Visual Style | style profile, visual references, negative style constraints |
| Production Basics | language, aspect ratio, target duration, age/safety rating |

All selector values must come from approved platform data or be user-provided Custom values. Model-dependent values such as ratio, duration, quality, FPS, and sound support must be registry-driven.

### Approval Flow

```text
Edit settings
  -> local draft settings
  -> Settings Summary
  -> explicit user approval
  -> Settings Snapshot
  -> ApprovedDecision
  -> Planning Job starts
```

No generation and no credit charge happen from editing settings.

### Changing Approved Settings

When an approved setting changes, the proposal must show:

- previous setting
- new setting
- affected scope
- scenes or shots needing replanning
- continuity impact
- duration impact
- expected financial impact

The change is not applied until the user approves. Required workflow: Proposal -> Approve -> Apply.

## 12. Project Overview and Episode Card Contract

### Project Overview

| Field | Meaning |
|---|---|
| projectId | project id |
| title | editable project title |
| logline | compact description |
| dramaticQuestion | optional; not Hook and not mandatory |
| contentFormat | separate from episode/adaptation |
| episodeMode | single/series/other approved mode |
| adaptationMode | Faithful/Balanced/Creative |
| targetDurationSec | desired duration |
| plannedDurationSec | current plan duration |
| seasonCount | if seasons exist |
| episodeCount | computed |
| characterCount | computed |
| locationEnvironmentCount | computed |
| elementPropCount | computed |
| planningStatus | current planning state |
| continuityStatus | current continuity status |
| productionStatus | current production state |
| latestApprovedVersion | version ref |
| updatedAt | last update |
| creditCap | project cap |
| estimatedCreditRange | min/expected/safe max |

### Episode Card

| Field | Meaning |
|---|---|
| episodeId | episode id |
| episodeNumber | display order |
| title | episode title |
| summary | episode summary |
| targetDurationSec | requested duration |
| plannedDurationSec | planned duration |
| sceneCount | computed |
| beatCount | computed |
| shotCount | computed |
| generationBlockCount | computed |
| scriptStatus | draft/approved/etc |
| shotPlanningStatus | not started/in progress/approved |
| continuityStatus | pass/warning/fail/not checked |
| storyboardStatus | No Storyboard/Keyframes/Full Storyboard; optional |
| productionStatus | planned/ready/generating/review/etc |
| generatedUnitCount | computed |
| approvedTakeCount | computed |
| rejectedTakeCount | computed |
| failedUnitCount | computed |
| expectedCredits | quote estimate |
| actualCredits | charged minus refunded |
| activeVersion | version ref |

Actions:
- View/Edit Script
- Open Shot Plan
- Enter Video Production
- Review Continuity
- Open Project Board

## 13. Agent Contracts

The agent is not a generic chatbot. Each capability is a contract:

| Capability | Input | Scope | Proposal | Impact | Approval | Tool invocation | Memory write | Failure | User result |
|---|---|---|---|---|---|---|---|---|---|
| Edit idea/scene/dialogue | user text + target | project/episode/scene/shot | required for approved content | script, duration, continuity | yes | planning/edit tool [design only] | Version + Decision | ambiguous scope | diff + apply option |
| Analyze narrative issue | issue text | chosen scope | optional | story quality | no unless changes | analysis tool | optional note | insufficient context | analysis and suggestions |
| Variants in Proposal | requested count [policy-bound] | selected entity | required | content/cost/time | yes | variant planner | proposal only until approved | invalid constraints | alternatives list |
| Edit character/location/element | entity ref + change | entity and dependent shots | required | continuity/assets | yes | asset memory tool | entity memory + decision | conflicts | scoped diff |
| Split scene to Beats/Shots | scene ref | scene | required | duration, production count | yes | ShotPlanner | Scene/Beat/Shot plan | missing scene goal | structured plan |
| Increase/decrease time | duration request | project/episode/scene/shot | required | duration/cost/continuity | yes | DurationScheduler | plan version | model cap conflict | impact table |
| Review continuity | target range | shot/block/range | optional | QC | no unless fixes | ContinuityEngine | snapshot/check result | missing prior state | flags and fixes |
| Optional Storyboard | scope + mode | project/episode/scene/shot | required if generating assets | image cost/refs | yes | storyboard planner/generator | storyboard memory | unsupported model | storyboard plan/quote |
| Quote then generate/regenerate | block/take request | block/take | quote required | credits/job/take | yes | generation job tool | job/take/version | provider failure | job state and take result |

Agent rules:
- one question only when ambiguity blocks progress
- no chat messages for every settings click
- no false save/generation claims
- proposals become truth only after approval
- rejected proposals remain historical, not active truth

## 14. Context Packet Contract

Every Generation Block receives a retrieved, scoped Context Packet with all required elements:

1. project summary
2. narrative timeline position
3. display timeline position
4. scene goal
5. shot goal
6. what happened before
7. what must happen after
8. participating characters with current state and look
9. location with time, weather, lighting, layout
10. elements with state, owner, place
11. `continuityIn`
12. `continuityOut`
13. dialogue, audio, timing
14. camera, color, effects
15. selected references from Style/Character/Element/Location/Sketch/Storyboard
16. prohibitions such as no clothing, direction, or identity drift

The packet must be minimized by retrieval. It must not include full chat history or full project history.

## 15. Continuity Contract

### Seven Categories

| Category | Required tracking |
|---|---|
| Character | face, age, hair, clothes, injury, emotion, body pose, gaze direction, frame position |
| Location | time, weather, light, layout, doors/exits, direction |
| Elements | owner, state, place, damage, holding hand |
| Action | motion start point and end point |
| Camera | 180-degree axis, screen direction, shot size, lens, movement |
| Audio | speaker, voice fingerprint/reference, line timing, ambient noise |
| Technical | aspect ratio, resolution, FPS, color, audio format/support |

### In/Out Rule

`ShotPlan` and `GenerationBlock` must carry `continuityIn` and `continuityOut`. A next unit cannot be accepted when its `continuityIn` conflicts with the previous approved `continuityOut`, unless an intentional cut, jump, or continuity override is approved.

### Review

- automatic check plus human review
- visible flag on the failing unit
- regenerate the failed unit only
- never regenerate the whole episode because one block failed

## 16. Creative Tools Rail

Every tool has `scope`, `pinned`, selected references, approved version, and Context Packet impact.

| Tool | Scope impact |
|---|---|
| Style | visual profile and negative style |
| Character | identity, look, voice, state |
| Element | prop identity, ownership, state |
| Location | environment, layout, time, light |
| Color | palette and grade constraints |
| Effects | practical/VFX timing |
| Camera | shot size, lens, angle, movement, screen direction |
| Sketch | composition/blocking/annotation reference |
| Storyboard | optional visual frames linked to shot/block |

## 17. Storyboard Contract

Modes:
- No Storyboard
- Keyframes
- Full Storyboard

Override order: Project < Episode < Scene < Shot.

Functions:
1. generate board from Shot Plan
2. upload board or Sketch
3. import from Project Board
4. bind to Shot or Generation Block
5. set First/Last frame only when supported
6. approve/reject/regenerate frame
7. compare with resulting video
8. do not warn that the project is incomplete when mode is No Storyboard

## 18. Production Selectors

All selectors are registry-driven. Any unsupported or unknown value must never be replaced by a handwritten fallback. No hand-written options are allowed.

### Unified ProductionSelectorContract

| Field | Rule |
|---|---|
| mediaKind | video, image, audio |
| modelId | actual registry only |
| provider | actual registry only |
| capabilityBadges | actual registry only |
| aspectRatio | only when supported |
| resolutionOrQuality | only when supported |
| fps | only when supported |
| durationSec | only when supported |
| takeCount | policy/registry driven; otherwise [غير محسوم] |
| references | capped by registry slots |
| nativeAudio | only when supported |
| firstLastFrame | only when supported |
| extension | only when supported |
| lipSync | only when supported |
| upscale | only when supported |
| availability | actual registry/routing only |
| region | [غير محسوم] if absent |
| queueLimits | [غير محسوم] if absent |
| liveQuote | pricing function only |
| remainingProjectCreditCap | project cap minus committed/charged amounts |

### Media Kinds

| Media kind | Required selectors | Registry status |
|---|---|---|
| Video | model, provider, ratio, quality/resolution, FPS if supported, duration, takes, refs, audio/first-last/extension/upscale/lip sync if supported | video exports proven in Phase 0.1 |
| Image | model, provider, ratio if supported, quality/resolution if supported, refs, takes, quote | [غير محسوم] source pending Phase 1.1 |
| Audio | model, provider, duration if supported, quality if supported, voice/audio refs, quote | [غير محسوم] source pending Phase 1.1 |

Forbidden unless registry-proven: fixed image dimensions, fixed audio bitrates, fixed sample rates, fixed durations, fixed FPS, fixed ratios, fixed prices, invented model names.

### Cascade on Model Change

When model changes:
1. recompute aspect ratios
2. recompute quality/resolution
3. recompute FPS support
4. recompute durations
5. recompute reference slots
6. mark now-invalid references/options
7. recompute live Quote
8. block generation until invalid selections are resolved

Selector states:
- loading
- empty registry
- available
- unavailable with reason
- invalid after model change
- quote stale

### 18.1 Invalid Selector Cascade

Changing any parent selector may invalidate dependent choices:

- Media Kind
- Provider
- Model
- Mode
- Duration
- Resolution
- Aspect Ratio
- Audio capability
- Extension
- Upscale
- Lip Sync

If a dependent value becomes unsupported:

1. The system must not silently change it.
2. The old value remains visible and is marked `invalid`.
3. The UI contract must expose the incompatibility reason from Registry or routing evidence.
4. Supported alternatives from Registry are shown.
5. Quote and generation are disabled until the user resolves the invalid value.
6. Quote is recalculated after correction.
7. Non-conflicting user choices are preserved.
8. If a model change invalidates duration, resolution, or a capability, an explicit new user choice is required.

Visual presentation is deferred to UX; behavior is fixed in Phase 1.

## 19. Scheduler Contract

Hybrid planning is the operational default: each transition may use Cut, Chaining, or Extension according to capability and continuity, not one global strategy.

Steps:
1. read target duration and script
2. estimate dialogue duration before fixing `ShotPlan.durationSec`
3. estimate voice-over, silence, reaction, and movement
4. split Episode into Scenes
5. split Scene into Beats
6. split Beats into Shots
7. split Shots into Generation Blocks according to model capability
8. read max duration from actual registry only
9. choose Cut/Chaining/Extension per transition
10. attach full Context Packet
11. compute takes and cost
12. show plan and Quote before charging

The `[+]` timeline action must ask whether the user is adding Scene, Shot, Generation Block, or uploaded media.

## 20. Prompt Format Contract

Prompt formats:
- Natural Description
- Professional Storyboard
- Faithful to Script

Changing prompt format does not silently rewrite content. The user sees:
- apply later
- rebuild current unit
- rebuild selected range/all
- cost, duration, and continuity impact

This is separate from `adaptationMode`.

## 21. Audio and Timeline Contract

Audio tracks:
1. Dialogue
2. Voice Over
3. Character Voice ID/Reference
4. Ambient
5. Sound Effects
6. Music
7. Captions/Subtitles

Timing rule: dialogue timing is measured before shot duration is fixed. Changing dialogue must show impact on synchronization, duration, and quote.

## 22. Quote and Credit Contract

Quote has:
- minimumCredits
- expectedCredits
- safeMaximumCredits
- Credit Cap
- Remaining Project Credit Cap
- perComponentBreakdown

Breakdown components:
- video
- takes
- images
- storyboard when selected
- audio
- lip sync
- upscale
- retries
- preview render
- final render

Ledger linkage:
- quoted
- charged
- refunded
- generationId
- ledger/transaction link [غير محسوم until Phase 1.1 proves actual ledger model]

No charge before Quote, approval, cap check, and actual job creation.

## 23. Job Contract

Every job-level record or orchestration view must preserve:

1. userId and projectId
2. episodeId, sceneId, shotId, generationBlockId where applicable
3. take/version
4. model/provider/route
5. sanitized request payload
6. idempotency key
7. status, timing, error
8. credits quoted/charged/refunded
9. ledger or transaction linkage
10. output asset/version
11. retry/reconnect metadata

Failure rules:
- retry failed unit only
- no double charge on retry or reconnect
- confirm before re-apply if write state is uncertain
- show understandable error on the affected unit
- store provider rejection reason only after sanitization

Queue/job system choice remains [غير محسوم] until Phase 1.1 proves the actual system.

## 24. Assembly Pipeline

1. normalize resolution, FPS, codec, aspect ratio, color
2. trim and order approved Takes
3. apply approved cuts and transitions
4. mix dialogue, voice-over, ambient, music, and sound effects
5. create captions/subtitles when selected
6. create low-cost Preview Render
7. create Final Render and export final version

Export formats/codecs are [غير محسوم] until later phase.

## 25. Backend Function Contracts

These are functional contracts, not route names:

1. create/open/save project
2. upload and extract text/assets
3. read/update settings with versioning
4. send agent message and retrieve project memory
5. create proposal and approve/reject
6. plan episodes/scenes/beats/shots/blocks
7. CRUD or reuse for characters, locations, elements, and tools
8. optional Storyboard generation
9. Quote
10. create/follow/cancel/regenerate job
11. approve Take and set active version
12. continuity and QC check
13. Preview and Final Render
14. export script/assets/final work
15. live state and reconnect

Live state mechanism is [غير محسوم]: SSE, WebSocket, polling, or existing event system.

## 26. Idempotency Strategy

Existing idempotency infrastructure does not mean Drama is wired to it.

Design formulas, final helper pending Phase 1.1:

| Operation | Key material |
|---|---|
| Quote | projectId + blockId + mediaKind + modelId + selected capabilities + reference versions |
| Generate | blockId + takeIndex + approvedQuoteId |
| Regenerate | blockId + previousTakeId + approvedQuoteId |
| Approve proposal | proposalId + decision payload |
| Approve take | takeId + target active version |

Final implementation formula is [غير محسوم].

## 27. i18n Contract

- use actual central i18n if present
- no random page-local dictionary if central system exists
- UI language is separate from video/script language
- layout stays fixed
- text fields and message bodies may use content direction
- technical names may stay in English

Actual i18n source is [غير محسوم] until Phase 1.1.

## 28. Project Board Contract

Board must support:
- `projectId`
- asset type
- asset version
- approval state
- source entity
- import into Character, Location, Element, Sketch, Storyboard, Production
- sync without duplicate conflicting records

Actual component choice is [غير محسوم] until Phase 1.1.

## 29. Empty States

Required:
- project created but settings not approved
- Outline before planning
- Characters empty
- Locations empty
- Elements empty
- Storyboard set to No Storyboard
- Timeline before shots
- Board not yet linked
- registry empty
- selector unavailable for selected model
- quote unavailable
- job failed

No fake data, no fake progress, no generic unexplained error.

## 30. JSON Schema Contracts

These schemas define shape, not implementation.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$defs": {
    "EntityRef": {
      "type": "object",
      "required": ["kind", "id"],
      "properties": {
        "kind": {"type": "string"},
        "id": {"type": "string"},
        "versionId": {"type": ["string", "null"]}
      }
    },
    "ContinuityState": {
      "type": "object",
      "required": ["character", "location", "elements", "action", "camera", "audio", "technical"],
      "properties": {
        "character": {"type": "object"},
        "location": {"type": "object"},
        "elements": {"type": "object"},
        "action": {"type": "object"},
        "camera": {"type": "object"},
        "audio": {"type": "object"},
        "technical": {"type": "object"}
      }
    },
    "ContextPacket": {
      "type": "object",
      "required": ["projectSummary", "narrativePosition", "displayPosition", "sceneGoal", "shotGoal", "before", "after", "characters", "location", "elements", "continuityIn", "continuityOut", "dialogueAudioTiming", "cameraColorEffects", "references", "prohibitions"],
      "properties": {
        "projectSummary": {"type": "string"},
        "narrativePosition": {"type": "object"},
        "displayPosition": {"type": "object"},
        "sceneGoal": {"type": "string"},
        "shotGoal": {"type": "string"},
        "before": {"type": "string"},
        "after": {"type": "string"},
        "characters": {"type": "array", "items": {"$ref": "#/$defs/EntityRef"}},
        "location": {"$ref": "#/$defs/EntityRef"},
        "elements": {"type": "array", "items": {"$ref": "#/$defs/EntityRef"}},
        "continuityIn": {"$ref": "#/$defs/ContinuityState"},
        "continuityOut": {"$ref": "#/$defs/ContinuityState"},
        "dialogueAudioTiming": {"type": "object"},
        "cameraColorEffects": {"type": "object"},
        "references": {"type": "object"},
        "prohibitions": {"type": "array", "items": {"type": "string"}}
      }
    }
  }
}
```

Required schema documents for Phase 2 design: `ProjectAnalysis`, `SettingsSnapshot`, `EpisodePlan`, `ScenePlan`, `BeatPlan`, `ShotPlan`, `GenerationBlock`, `ContinuitySnapshot`, `ProposalAndImpact`, `Quote`, `ApprovedDecision`, `MemoryDocumentVersion`, `TakeVersion`, `AudioTrack`, `SubtitleTrack`, `ProductionSelectorContract`.

## 31. Capability Adapter Matrix

| Capability | Source rule | If missing |
|---|---|---|
| duration | actual registry export | unavailable |
| resolution/quality | actual registry export | unavailable |
| aspect ratio | actual registry export | unavailable |
| FPS | actual registry export | [غير محسوم] / hidden |
| T2V/I2V | capability flags | disabled |
| first/last frame | capability flags | disabled |
| image/video/audio refs | max reference fields | slot blocked |
| native audio | capability flag | disabled |
| extension | capability flag/proven route | disabled |
| lip sync | capability flag/proven route | disabled |
| upscale | capability flag/proven route | disabled |
| pricing | pricing function | quote unavailable |
| availability | registry/routing | unavailable |
| region | registry/routing | [غير محسوم] |
| queue limits | actual job/provider config | [غير محسوم] |
| prompt limit | actual max prompt field if present | preflight blocked |

## 32. G1-G13 Closure Table

| Gap | v3 closure |
|---|---|
| G1 | D1 and D2 recorded as owner-approved decision records |
| G2 | nine Agent capabilities defined as contracts |
| G3 | full Context Packet added |
| G4 | continuityIn/continuityOut required on Shot and Block |
| G5 | seven audio tracks added |
| G6 | remaining project Credit Cap added before generation |
| G7 | seven continuity categories expanded |
| G8 | job fields and failure rules added |
| G9 | assembly seven-step pipeline added |
| G10 | ApprovedDecision and VersionMemory contracts added |
| G11 | prompt formats and switch impact added |
| G12 | Empty States added |
| G13 | Production Selectors for video/image/audio added, registry-driven only |

## 33. M1-M13 Closure Table

| Item | v3 closure |
|---|---|
| M1 | conversation prohibitions codified |
| M2 | opening improvement optional only, no Hook requirement |
| M3 | Creative Positioning and Settings Approval Contract fully added |
| M4 | Project Overview and Episode Card Contract fully added |
| M5 | Scope/Pin and Storyboard as ninth tool added |
| M6 | eight Storyboard functions added |
| M7 | Hybrid strategy made operational rule |
| M8 | regenerate failed unit only added |
| M9 | dialogue timing before duration made mandatory |
| M10 | Quote breakdown components added |
| M11 | live state mechanism marked [غير محسوم] |
| M12 | i18n source marked [غير محسوم] |
| M13 | idempotency formulas proposed, final helper [غير محسوم] |

## 34. Traceability Matrix

| Reference section | v3 location | Status |
|---|---|---|
| §0 | Sections 0, 2, 31 | covered |
| §1 | Sections 3, 4, 16, 28 | D1 implementation pending |
| §2 | Sections 2, 4, 29 | covered |
| §3 | Sections 6, 19 | covered |
| §4 | Section 5 | covered |
| §5 | Section 4 | covered |
| §6 | Sections 4, 29 | covered |
| §7 | Sections 13, 14 | covered |
| §8 | Sections 9, 14 | covered |
| §9 | Sections 1, 2, 20 | covered |
| §10 | Section 11 | covered |
| §11 | Section 12 | covered |
| §12 | Sections 7, 16, 28 | covered |
| §13 | Section 16 | covered |
| §14 | Section 17 | covered |
| §15 | Sections 6, 19 | covered |
| §16 | Section 15 | covered |
| §17 | Section 21 | covered |
| §18 | Sections 4, 18, 20, 24 | covered |
| §19 | Section 28 | D1 implementation pending |
| §20 | Sections 18, 31 | covered, image/audio registries unresolved |
| §21 | Section 23 | covered, job system unresolved |
| §22 | Section 22 | covered, ledger link unresolved |
| §23 | Sections 6, 7, 8, 9 | covered, physical mapping pending |
| §24 | Section 25 | covered, routes not invented |
| §25 | Section 27 | i18n source unresolved |
| §26 | Section 35 | mobile unresolved |
| §27 | Sections 1, 36 | covered |
| §28 | Sections 32, 33, 36 | covered as gates |
| §29 | Section 35 | unresolved list preserved |
| §30 | Sections 0, 2 | covered |
| §31 | Section 31 | covered; registry runtime remains source |

## 35. Remaining [غير محسوم]

| Item | Why unresolved | Evidence required | Resolve by | Decision type |
|---|---|---|---|---|
| Actual Project Board component choice | D1 fixes product decision but not physical component | `/canvas`, `cinema-board`, `components/canvas` evidence | Phase 1.1 | repository evidence, then owner if tradeoff |
| Actual image model registry | source not proven | real files/exports for image models and pricing | Phase 1.1 | repository evidence |
| Actual audio/voice registry | source not proven | real voice/audio registry exports | Phase 1.1 | repository evidence |
| Actual i18n source | central translation mechanism not proven here | language hooks, dictionaries, TopNavbar switch behavior | Phase 1.1 | repository evidence |
| Ledger linkage model for generated media | quoted/charged/refunded audit shape not proven | finance/admin/generation transaction files | Phase 1.1 | repository evidence, possible owner decision |
| Job orchestration system | Inngest or alternative not proven for Drama | job/task/provider callback files | Phase 1.1 | repository evidence |
| Live state mechanism | SSE/WebSocket/polling/events not chosen | existing live update patterns | Phase 1.1 | repository evidence, possible owner decision |
| Beat physical mapping | logical Beat fixed, storage shape not chosen | Prisma relation/JSON conventions | Phase 1.1 then Phase 2 | ADR/owner approval |
| Memory physical mapping | nine layers fixed, storage shape not chosen | Prisma memory/version/document patterns | Phase 1.1 then Phase 2 | ADR/owner approval |
| Completed reopen policy | product behavior not approved | owner policy for editing final works | Before Phase 5/6 | Owner Decision Required |
| Archive/delete policy | product retention not approved | retention/legal/storage requirements | Before Phase 5/6 | Owner Decision Required |
| Mobile wireframe | reference is desktop-first | separate UX wireframe | Before mobile implementation | Owner Decision Required |
| Export formats/codecs | final render targets not approved | product/export requirements and render pipeline evidence | Before Phase 6 | Owner Decision Required |
| Rejected Take retention | storage/cost policy not approved | owner retention requirement and storage cost evidence | Before Phase 5 | Owner Decision Required |
| Low-risk auto-apply delegation | agent authority policy not approved | owner approval policy | Before Phase 2 agent persistence | Owner Decision Required |

## 36. Phase Gates

Phase 1 remains conditionally accepted. Phase 2 is blocked until:

1. this v3 is reviewed and approved,
2. D1/D2 are acknowledged as recorded,
3. Phase 1.1 Repository Spike is executed read-only,
4. unresolved physical mappings are converted into approved Phase 2 decisions.

Stop here. No Phase 2.
