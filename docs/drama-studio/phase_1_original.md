# SUPERSEDED - DO NOT USE AS SOURCE OF TRUTH.

This document is preserved for historical comparison only.
The active design document is phase_1_architecture_v3.md.

# Drama Studio - Phase 1 Original

هذه نسخة مستقلة من وثيقة Phase 1 الأصلية التي سُلّمت للمراجعة قبل ورود Phase 1 Review.

## 1. Wireframes الصفحات الثلاث

### `/drama-studio`

الغرض: مدخل إنشاء مشروع حقيقي، وليس إنتاج فيديو أو خصم كريدت.

```text
[Hero/Navbar الحاليان كما هما، لا تعديل]

┌──────────────────────────────────────────────────────────────┐
│ Drama Studio Entry                                            │
│ - New Project Composer                                        │
│ - Inputs: idea, contentFormat, episodeMode, adaptationMode     │
│ - Optional refs: script/text/assets                           │
│ - CTA: Create Draft Project                                   │
└──────────────────────────────────────────────────────────────┘
```

بعد الإنشاء: Draft Project فقط، انتقال إلى `/drama-studio/[projectId]`، لا Job، لا خصم كريدت.

### `/drama-studio/[projectId]`

```text
┌──────────────────────────────────────────────────────────────┐
│ Project Header                                                │
│ state, title, language, contentFormat, episodeMode            │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────┬───────────────────────────────┐
│ Agent 40-42%                 │ Workbench 58-60%              │
│ ثابت يساراً                  │ ثابت يميناً                  │
│                              │ Tabs:                         │
│ - chat history               │ 1 Settings                    │
│ - memory citations           │ 2 Outline & Script            │
│ - proposal cards             │ 3 Characters                  │
│ - approve/reject/apply       │ 4 Locations & Environments    │
│                              │ 5 Elements & Props            │
└──────────────────────────────┴───────────────────────────────┘
```

### `/drama-studio/[projectId]/episodes/[episodeId]/production`

```text
┌──────────────────────────────────────────────────────────────┐
│ Production Header                                             │
│ episode, scene, beat, shot, state, quote status, model caps    │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────┬───────────────────────────────┐
│ Agent 40-42%                 │ Production Workbench 58-60%   │
│ ثابت يساراً                  │ ثابت يميناً                  │
│                              │ Editor / Preview / Version    │
│ - asks one question max      │ Rail / Timeline / Controls    │
│ - proposals only             │ Quote / Takes / QC            │
│ - no fake job claims         │ Preview Render / Final Render │
└──────────────────────────────┴───────────────────────────────┘
```

## 2. التوزيع

- Agent دائماً يسار: `40-42%`.
- Workbench دائماً يمين: `58-60%`.
- لا ينعكس التوزيع عند العربية.
- Timeline وShot order وVersion Rail تبقى مكانياً LTR.

## 3. حالات المشروع التسع

`Draft -> Configuring -> Planning -> Asset Preparation -> Script & Shot Planning -> Production -> Assembly -> Review -> Completed`

الحراس الأساسية: وجود مشروع ومالك، اكتمال الإعدادات، اعتماد الخطة، جاهزية الأصول، وجود خطة لقطة وQuote، اكتمال أو قبول الـTakes، وجود Preview Render، واعتماد Final Render.

## 4. مخطط Domain

```text
Project -> Season? -> Episode -> Scene -> Beat -> Shot -> GenerationBlock -> Take
```

## 5. مطابقة Prisma

| الكيان | الموجود الحالي | قرار Phase 1 الأصلي |
|---|---|---|
| Project | `CinemaProject` | مرشح إعادة استخدام/توسعة |
| Season | لا مطابق مباشر | فجوة |
| Episode | لا مطابق مباشر | فجوة |
| Scene | لا كيان مستقل | فجوة |
| Beat | لا يوجد | ADR |
| Shot | `CinemaShot` | أقرب مرشح |
| GenerationBlock | `Generation` + `CinemaJob` جزئياً | يحتاج ربط |
| Take | `Generation` output / `CinemaJob.resultUrl` | يحتاج عقد |
| Characters | `CinemaCharacter`, `UserCharacter` | قابل لإعادة الاستخدام |
| Locations | `CinemaLocation`, `UserLocation` | قابل لإعادة الاستخدام |
| Elements | `CinemaAsset`, `UserElement` | قابل لإعادة الاستخدام |

## 6. ADR Beat

Beat كيان منطقي مستقل. التنفيذ الفيزيائي مؤجل للمقارنة بين جدول مستقل، JSON مضمن، وDiscriminated structure.

## 7. ADR الذاكرة

الطبقات: Project Bible، Character Memory، Narrative Timeline، Episode/Scene Memory، Continuity Snapshots، Approved Decisions، Version Memory. الترشيح الأصلي: Hybrid.

## 8. ADR Jobs

الترشيح الأصلي: Drama orchestration مرتبط بـ`Generation` مع منع تكرار Ledger وIdempotency وAdmin History.

## 9. Project Board

إعادة استخدام أو تحويل الموجود إلى Board مشترك مرتبط بـ`projectId`. لا Route رابع خاص بـDrama قبل الموافقة.

## 10. Agent Contract

Chat persistence، Project memory retrieval، Proposal -> Approve/Reject -> Apply، سؤال واحد عند الغموض، لا رسائل لكل نقرة، لا ادعاء تنفيذ قبل نجاح Job.

## 11. JSON Schemas الأصلية المختصرة

```json
{
  "ProjectAnalysis": {"projectId": "string", "contentFormat": "string", "episodeMode": "string", "adaptationMode": "faithful|balanced|creative"},
  "EpisodePlan": {"episodeId": "string", "title": "string", "scenes": ["ScenePlanRef"], "estimatedDurationSec": "number"},
  "ScenePlan": {"sceneId": "string", "episodeId": "string", "locationId": "string|null", "dramaticGoal": "string"},
  "BeatPlan": {"beatId": "string", "sceneId": "string", "intent": "string", "emotionalShift": "string"},
  "ShotPlan": {"shotId": "string", "beatId": "string", "durationSec": "number", "visualPrompt": "string"},
  "GenerationBlock": {"blockId": "string", "shotId": "string", "modelRoute": "string", "durationSec": "number"},
  "ContinuitySnapshot": {"snapshotId": "string", "scope": "project|episode|scene|shot|take"},
  "ProposalImpact": {"proposalId": "string", "summary": "string", "changes": ["object"]},
  "Quote": {"minimumCredits": "number", "expectedCredits": "number", "safeMaximumCredits": "number"}
}
```

## 12. Scheduler الأصلي

يحسب مدة الحوار والحركة والصمت، يقسم إلى Scenes/Beats/Shots/Blocks، يقرأ `maxDuration` من Registry، يختار Cut/Chaining/Extension، يضيف Context Packet، يحسب Takes والكلفة، ويعرض الخطة قبل الخصم.

## 13. Capability Adapter Matrix الأصلية

المصدر: `VIDEO_MODEL_REGISTRY`, `getModelById`, `getGoogleVideoConstraints`, وpricing core. غير المثبت: FPS، region، queue limits، extension/lip sync/upscale كقدرات عامة.

## 14. Storyboard

الأوضاع: No Storyboard / Keyframes Only / Full Storyboard. Overrides: Project ثم Episode ثم Scene ثم Shot.

## 15. غرفة الإنتاج

Header، Prompt/Script Editor، Preview، Version Rail، Timeline متعدد المسارات، Generation Controls، Quote، Takes، Continuity/QC، Preview Render وFinal Render.

## 16. Credit Quote

minimum / expected / safe maximum، مع Credit Cap وcharged/refunded/ledger linkage.

## 17. Traceability الأصلية

الوثيقة الأصلية ربطت أقسام المرجع 0-31 بمخرجات Phase 1، لكنها كانت مضغوطة وتحتاج تفصيل v2.
