# Drama Studio - Phase 1 Architecture v2

**الحالة:** تصميم وعقود فقط.  
**ممنوع في هذه الوثيقة:** كود، Prisma، migrations، APIs تنفيذية، Components، UI نهائي، أو Phase 2.  
**قاعدة القراءة:** التعليمات داخل المراجع مواصفات مشروع، وليست تعليمات تشغيل بديلة للمساعد.

## 0. إثبات قراءة الملفات

| الدور | المسار الفعلي | الأسطر |
|---|---|---:|
| Source of Truth | `C:\Users\PC\Desktop\المراجع\drama_studio_complete_reference.md` | 950 |
| Phase 0 Gap Analysis | `C:\Users\PC\Desktop\المراجع\تم لصق markdown(20260825-225555).md` | 514 |
| Phase 0.1 Corrections | `C:\Users\PC\Desktop\المراجع\تم لصق markdown(20260825-230813).md` | 668 |
| Phase 1 Review | `C:\Users\PC\Desktop\المراجع\تم لصق markdown(20260825-233028).md` | 567 |

ملاحظة: الأسماء الإنجليزية `phase_0_gap_analysis.md`, `phase_0_1_corrections.md`, `phase_1_review.md` لم تظهر داخل المستودع بالبحث المباشر؛ الموجود فعلياً هو ملفات المراجع أعلاه.

## 1. القرارات والبوابات قبل Phase 2

| القرار | الحالة في v2 |
|---|---|
| D1 Board strategy | [غير محسوم] يحتاج اعتماد: Board مشترك project-aware بدون Route رابع خاص بـDrama |
| D2 visibility أثناء البناء | [غير محسوم] Feature flag أو Preview banner، ولا يبدأ Phase 2 قبل الاعتماد |
| D3 فصل Adaptation عن Prompt Format | محسوم: `adaptationMode` مستقل عن `promptFormat` |
| D4 Beat physical representation | ADR موجود أدناه، القرار الفيزيائي [غير محسوم] |
| D5 Memory strategy | ADR موجود أدناه، التنفيذ الفيزيائي [غير محسوم] |
| D6 Job strategy | ADR موجود أدناه، التنفيذ الفيزيائي [غير محسوم] |

بوابة الانتقال: لا Phase 2 قبل اعتماد D1 وD2 وإغلاق G1-G13، خصوصاً G13.

## 2. Wireframes المعتمدة

### `/drama-studio`

```text
[Hero/Navbar الحاليان كما هما - لا تعديل]

Story Composer
- idea / pasted script / supported upload [غير محسوم: أنواع الملفات]
- contentFormat
- episodeMode
- adaptationMode: Faithful / Balanced / Creative
- initial model selector: registry-driven فقط
- CTA: Create Draft Project

Recent/selected works: أصول سعد ستوديو فقط
```

ناتج الإرسال: Draft Project + `projectId`. لا توليد فيديو. لا خصم كريدت.

### `/drama-studio/[projectId]`

```text
Project Header:
- project title
- state
- contentFormat / episodeMode / adaptationMode
- target/planned duration
- Project Board launcher [D1 غير محسوم]

┌──────────────────────────────┬──────────────────────────────────┐
│ Agent 40-42%                 │ Workbench 58-60%                 │
│ ثابت يساراً                  │ ثابت يميناً                     │
│ chat + proposal cards        │ Tabs LTR ثابتة:                 │
│ memory citations             │ 1 Settings                       │
│ composer                     │ 2 Outline & Script               │
│                              │ 3 Characters                     │
│                              │ 4 Locations & Environments       │
│                              │ 5 Elements & Props               │
│                              │ Creative Tools Rail: 9 tools     │
└──────────────────────────────┴──────────────────────────────────┘
```

Empty States واجبة: لا mock scenes، لا mock characters، لا fake progress، ولا Board شكلي.

### `/drama-studio/[projectId]/episodes/[episodeId]/production`

```text
Production Header:
- back to Workbench
- episode/scene/beat/shot selector
- state
- model/provider real badges
- remaining project credit cap

┌──────────────────────────────┬──────────────────────────────────┐
│ Agent 40-42%                 │ Production Room 58-60%           │
│ proposal-aware               │ Prompt/Script Editor             │
│ one question max             │ Preview Canvas                   │
│ no job claim before success  │ Version Rail                     │
│                              │ Multi-track Timeline             │
│                              │ Production Selectors             │
│                              │ Quote / Takes / Continuity / QC  │
│                              │ Preview Render / Final Render    │
└──────────────────────────────┴──────────────────────────────────┘
```

## 3. Layout Contract

- Agent يسار دائماً بنسبة `40-42%`.
- Workbench يمين دائماً بنسبة `58-60%`.
- لا انعكاس عند العربية.
- النص داخل الرسائل والحقول يأخذ `dir` حسب المحتوى.
- Timeline وترتيب التبويبات وVersion Rail تبقى LTR مكانياً.

## 4. State Machine

```text
Draft
  -> Configuring: owner verified, draft exists
Configuring
  -> Planning: required settings snapshot approved
Planning
  -> Asset Preparation: project/episode plan approved
Asset Preparation
  -> Script & Shot Planning: minimum assets or explicit skip approved
Script & Shot Planning
  -> Production: at least one episode/scene/shot/block plan + quote ready
Production
  -> Assembly: required takes approved or gaps explicitly accepted
Assembly
  -> Review: preview render exists
Review
  -> Completed: final render approved
Completed
  -> Review: [غير محسوم] هل يسمح بإعادة فتح نسخة نهائية؟
Any active state
  -> same state with failed item: failure reconciled, no double charge
Archived/Deleted
  -> [غير محسوم] خارج Phase 1
```

إثبات "لا Job نشط": [غير محسوم]، يجب أن يكون query من مصدر jobs الفعلي بعد اختياره.

## 5. Domain Model

```text
Project
  -> Season?                  [اختياري]
    -> Episode
      -> Scene
        -> Beat               [كيان منطقي مستقل]
          -> Shot
            -> GenerationBlock
              -> Take
```

بعد الإنتاج: `Continuity -> QC -> Assembly`.

## 6. Prisma Mapping بدون جداول جديدة

| Logical Entity | المرشح الحالي | الحكم |
|---|---|---|
| Project | `CinemaProject` | مرشح مقارنة فقط؛ قد يسبب تضخم حقول |
| Season | لا مطابق مثبت | [غير محسوم] |
| Episode | لا مطابق مثبت | [غير محسوم] |
| Scene | لا مطابق مستقل | [غير محسوم] |
| Beat | لا مطابق | [غير محسوم فيزيائياً] |
| Shot | `CinemaShot` | مرشح جزئي، لكنه لا يكفي للـBeat/Block/Take |
| GenerationBlock | `Generation` + `CinemaJob` جزئياً | يحتاج orchestration منفصل أو ربط |
| Take | `Generation` output/request snapshots جزئياً | يحتاج active version contract |
| Character | `UserCharacter`, `CinemaCharacter` | إعادة استخدام/توسعة محتملة |
| Location | `UserLocation`, `CinemaLocation` | إعادة استخدام/توسعة محتملة |
| Element/Prop | `UserElement`, `CinemaAsset` | إعادة استخدام/توسعة محتملة |
| Color | `UserPalette` | مرشح |
| Effect | `UserEffect` | مرشح |
| Camera | `UserCamera` | مرشح |
| Storage/Asset | assets/storage existing | يجب الربط لا التكرار |
| Job/Admin | `Generation`, `CinemaJob`, admin read models | يجب الربط لا الاستبدال |

لا اقتراح جدول جديد قبل قرار Phase 2 المبني على هذه المقارنة.

## 7. ADR Beat Representation

| الخيار | مناسب لـ | خطر |
|---|---|---|
| جدول مستقل | تتبع، approval، M2M، QC | migration إضافية |
| JSON ضمن Scene | سرعة ومرونة | ضعف query/versioning |
| Discriminated structure | مرونة مع نوع واضح | يحتاج validators قوية |

**قرار v2:** Beat مستقل منطقياً. التمثيل الفيزيائي [غير محسوم] حتى Phase 2 design. الترشيح الهندسي: جدول مستقل إذا اعتمدت M2M وVersioning؛ وإلا Discriminated JSON مؤقت فقط.

## 8. ADR Project Memory

| الطبقة | العقد |
|---|---|
| Project Bible | world/rules/tone/boundaries/terms |
| Character Memory | identity/look/voice/knowledge/relationships/physical+emotional state |
| Narrative Timeline | story order منفصل عن display order |
| Episode/Scene Memory | goal/outcome per episode/scene |
| Continuity Snapshots | in/out لكل Shot وBlock |
| Approved Decisions | سجل موافقات قابل للتراجع |
| Version Memory | draft/approved/rejected/archived versions |

**قرار v2:** Hybrid مرشح، لكن [غير محسوم] فيزيائياً. يمنع إرسال تاريخ المشروع كله للموديل؛ السياق Retrieval-based.

## 9. ADR Jobs

| الخيار | الحكم |
|---|---|
| Extend `Generation` | يحافظ على admin/pricing، لكنه يلوث الكيان بتفاصيل Drama |
| Generalize `CinemaJob` | توحيد محتمل، لكن خطر regression على Cinema |
| Drama orchestration linked to `Generation` | الأفضل مبدئياً، بشرط عدم تكرار ledger/idempotency/admin |

**قرار v2:** التوصية هي Drama orchestration مرتبط بـ`Generation`. النظام الفعلي للـqueue [غير محسوم] حتى يثبت من المستودع في Phase 2.

Job يجب أن يسجل 11 حقلاً:
`userId/projectId`, `episodeId/sceneId/shotId/blockId`, `take/version`, `model/provider/route`, sanitized request payload, idempotency key, status/timing/error, credits quoted/charged/refunded, ledger link, output asset/version, retry/reconnect metadata.

Failure rules:
- Retry للوحدة الفاشلة فقط.
- لا خصم مزدوج.
- Re-apply confirmation بعد reconnect إذا حالة الكتابة غير مؤكدة.
- خطأ مفهوم بجانب الوحدة.
- provider rejection sanitized.

## 10. Project Board

الفحص:
- `/canvas` موجود كمساحة Canvas عامة.
- `/cinema-board` Prototype جزئي مرتبط بـCinema.
- `components/canvas` primitives موجودة.
- لا API Board مثبت خاص بـprojectId.

**قرار v2:** D1 [غير محسوم]. الخيار المفضل: Board مشترك project-aware يستخدم primitives الموجودة ولا ينشئ Route رابع خاص بـDrama. Integration contract يعتمد على `projectId`, asset type, version, approval state, source entity.

## 11. Agent Tool Contract

القدرات التسع:
1. تعديل فكرة/مشهد/حوار.
2. تحليل مشكلة سردية.
3. طلب بدائل متعددة داخل Proposal.
4. تعديل شخصية/موقع/عنصر.
5. تقسيم مشهد إلى لقطات عبر ShotPlanner.
6. تقليل/زيادة زمن مع أثر duration/cost.
7. مراجعة الاستمرارية.
8. طلب Storyboard للمشهد/اللقطات.
9. توليد/إعادة توليد بعد Quote واعتماد.

المحظورات:
- لا رسائل نظام لتغيير لغة أو فتح قائمة.
- لا تكرار نفس الرد.
- لا نسخ أوامر المرجع أو Topview.
- لا تقرير طويل بدل المحادثة إلا بطلب.
- لا ادعاء حفظ/توليد قبل تحقق فعلي.
- لا رسائل لكل نقرة إعدادات.

## 12. JSON Schemas

هذه عقود Validation تصميمية، وليست كوداً تنفيذياً.

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
    }
  }
}
```

Schemas المطلوبة كمخرجات:
- `ProjectAnalysis`: contentFormat, episodeMode, adaptationMode, risks, requiredAssets, unresolved.
- `EpisodePlan`: seasonId nullable, target/planned duration, scenes.
- `ScenePlan`: dramaticGoal, outcome, beats, continuityIn/out.
- `BeatPlan`: intent, emotionalShift, shots.
- `ShotPlan`: durationSec derived after dialogue timing, references, continuityIn/out, blocks.
- `GenerationBlock`: mediaKind, modelId, durationSec, contextPacket, transitionStrategy, quote.
- `ContinuitySnapshot`: 7 فئات كاملة + continuityIn/out.
- `ProposalAndImpact`: alternatives, diff, scope, conflicts, quote impact, approval state.
- `Quote`: min/expected/safeMax + perComponentBreakdown.
- إضافية مطلوبة من review: `SettingsSnapshot`, `ApprovedDecision`, `MemoryDocumentVersion`, `TakeVersion`, `AudioTrack`, `SubtitleTrack`, `ProductionSelectorContract`.

## 13. Scheduler Contract

القاعدة: Hybrid هو الأسلوب التشغيلي الصحيح؛ لا تُختار استراتيجية واحدة لكل الحلقة.

خطواته:
1. قراءة المدة المستهدفة والنص.
2. قياس زمن الحوار قبل تثبيت `ShotPlan.durationSec`.
3. تقدير التعليق والصمت والحركة.
4. تقسيم Episode إلى Scenes/Beats/Shots.
5. تقسيم Shot إلى GenerationBlocks حسب Registry.
6. قراءة max duration من export حقيقي فقط.
7. اختيار Cut/Chaining/Extension per transition.
8. إضافة Context Packet كامل 14 عنصراً.
9. حساب Takes والتكلفة.
10. عرض الخطة والQuote قبل الخصم.
11. `[+]` يسأل: Scene أم Shot أم GenerationBlock أم upload.

## 14. Capability Adapter Matrix

| القدرة | مصدر مسموح | سلوك UI/Scheduler |
|---|---|---|
| duration | video registry exports فقط | hide/disable غير المتاح |
| resolution/quality | registry fields فقط | لا قيم يدوية |
| aspect ratio | registry fields فقط | previews من القيم الفعلية |
| FPS | [غير محسوم] إن لم يوجد في registry | لا يظهر كخيار |
| T2V/I2V | capability flags | gating |
| first/last frame | capability flags | chaining فقط عند الدعم |
| refs image/video/audio | max reference fields | منع تجاوز slots |
| native audio | capability flag | لا يدعى دعم الصوت دون إثبات |
| extension | [غير محسوم] إلا إن ثبت | disabled |
| lip sync | [غير محسوم] | disabled |
| upscale | [غير محسوم] | disabled |
| pricing | pricing core فقط | quote لا hardcode |
| availability/region/queue | [غير محسوم] عند الغياب | disabled أو warning حسب سياسة تعتمد لاحقاً |
| prompt limit | `max_prompt_characters` إن وجد | preflight قبل الإرسال |

لا تعتمد قيم 512/1024/2048 أو 128/192/256 kbps أو 44.1/48 kHz إلا إذا ثبتت في registry فعلي.

## 15. G13 Production Selectors

```text
ProductionSelectorContract
- mediaKind: video | image | audio
- modelId: from actual registry
- aspectRatio?: from selected model only
- resolutionOrQuality?: from selected model only
- durationSec?: from selected model only
- takeCount: project policy or registry cap [غير محسوم]
- references.images/videos/audios: capped by registry
- costBadge: quote engine only
- providerBadge: registry only
- capabilityBadges: registry only
```

Sources:
- Video: exports المثبتة في `lib/video-models.ts` و`lib/video-model-registry.ts`.
- Image: [غير محسوم] حتى فحص `lib/image-models.ts` أو مصدر فعلي موجود.
- Audio: [غير محسوم] حتى فحص registry صوت فعلي.

Cascade عند تغيير model:
- إعادة حساب aspect ratios.
- إعادة حساب quality/resolution.
- إعادة حساب durations.
- إعادة تقييم reference slots.
- إعادة حساب Quote.
- وضع أي اختيار لم يعد صالحاً في حالة invalid واضحة قبل أي Job.

States لكل selector:
- available
- unavailable for selected model
- loading/error
- empty registry

## 16. Storyboard

Storyboard هي الأداة التاسعة في rail.

الأوضاع:
- No Storyboard
- Keyframes
- Full Storyboard

Overrides: Project < Episode < Scene < Shot.

وظائف §14.3:
1. توليد لوحة من Shot Plan.
2. رفع لوحة أو Sketch.
3. Import from Board.
4. ربط بلقطة أو GenerationBlock.
5. First/Last frame عند دعم الموديل.
6. Approve/Reject/Regenerate.
7. مقارنة مع الفيديو الناتج.
8. لا warning عند No Storyboard.

## 17. Production Room

المناطق:
- Header.
- Prompt/Script Editor مع Prompt Format.
- Preview Canvas.
- Version Rail.
- Timeline متعدد المسارات.
- Production Selectors.
- Generation Controls.
- Quote.
- Takes.
- Continuity/QC.
- Preview Render.
- Final Render.

Prompt formats:
- Natural Description.
- Professional Storyboard.
- Faithful to Script.

Switch impact:
- Later.
- Rebuild current unit.
- Rebuild selected range/all.
- يعرض الأثر والتكلفة قبل apply.

Audio tracks:
- Dialogue.
- Voice Over.
- Character Voice ID/Reference.
- Ambient.
- Sound Effects.
- Music.
- Captions/Subtitles.

Assembly contract:
1. normalize resolution/FPS/Codec/aspect/color.
2. trim and order approved Takes.
3. apply cuts/transitions.
4. mix dialogue/ambient/music/SFX.
5. captions if selected.
6. low-cost Preview Render.
7. Final Render/export.

## 18. Credit Quote Contract

```text
minimumCredits
expectedCredits
safeMaximumCredits
creditCap
remainingProjectCap
perComponentBreakdown:
  video
  takes
  images
  storyboard
  audio
  lipSync
  upscale
  retries
  previewRender
  finalRender
ledgerLinkage:
  quoted
  charged
  refunded
  generationId
  ledgerEntryId [غير محسوم إن لم يوجد ledger موحد]
```

لا خصم قبل Quote + approval + cap check + job creation.

## 19. Idempotency Strategy

مصدر idempotency الموجود لا يعني ربط Drama به. الصيغ التصميمية:
- Quote: hash مستقر من projectId + blockId + mediaKind + modelId + selected capabilities + references.
- Generate: hash مستقر من blockId + takeIndex + approved quote id.
- Approve proposal: hash من proposalId + decision payload.
- Approve take: hash من takeId + activeVersion target.

الصيغ النهائية [غير محسوم] حتى فحص helper الموجود في Phase 2.

## 20. i18n Strategy

- لا قاموس عشوائي داخل الصفحة.
- يجب اكتشاف نظام i18n المركزي أولاً.
- النصوص الحالية داخل TSX لا تُعتمد كمصدر.
- لغة الواجهة مستقلة عن لغة الفيديو والسيناريو.
- Layout لا ينعكس.

النظام النهائي [غير محسوم] حتى فحص conventions الترجمة.

## 21. Live State Broadcasting

الوظيفة §24-15 مطلوبة، لكن الوسيلة [غير محسوم]:
- SSE
- WebSocket
- events من job system فعلي
- polling آمن

لا اختيار قبل إثبات الموجود.

## 22. Empty States

واجبة:
- Outline قبل التخطيط.
- Characters قبل إنشاء/استيراد.
- Locations قبل إنشاء/استيراد.
- Elements قبل إنشاء/استيراد.
- Storyboard عند No Storyboard.
- Timeline قبل وجود Shots/Blocks.
- Board قبل ربط D1.
- Selectors عند empty registry.

ممنوع عرض بيانات وهمية أو progress مصطنع.

## 23. Approved Decisions وVersion Memory

ApprovedDecision:
- decisionId
- type
- scope
- beforePayload
- afterPayload
- decidedBy
- decidedAt
- revertedAt?
- revertReason?

VersionMemory:
- versionId
- entityRef
- parentVersionId?
- state: draft / approved / archived / rejected
- activeFromVersionId?
- activeUntilVersionId?

## 24. Scope وPin للأدوات التسع

كل أداة لها:
- scope: project / episode / scene / shot-group / shot
- pinned: boolean
- source asset refs
- approved version
- impact on Context Packet

الأدوات: Style, Character, Element, Location, Color, Effects, Camera, Sketch, Storyboard.

## 25. Traceability Matrix §0-§31

| المرجع | تغطية v2 | الحالة |
|---|---|---|
| §0 | منع التخمين، Topview benchmark فقط، [غير محسوم] | مصمم |
| §1 | 3 routes + Board موجود/مشترك + 5 tabs + 9 tools | D1 غير محسوم |
| §2 | Hero/Navbar لا تعديل، prototype مرفوض | مصمم |
| §3 | المنتج طويل وليس مقطعاً واحداً | مصمم |
| §4 | 9 حالات + Guards | مصمم |
| §5 | Draft project بلا خصم | مصمم |
| §6 | 40-42 / 58-60 + Empty States | مصمم |
| §7 | Agent + 9 قدرات + محظورات + Proposal | مصمم |
| §8 | 7 memory layers + 14 Context Packet + no full dump | مصمم |
| §9 | لا Hook/Cliffhanger + adaptation modes | مصمم |
| §10 | Settings + Creative Positioning + approval snapshot | مصمم |
| §11 | Outline + Project Overview fields | مصمم عقدياً |
| §12 | Character/Location/Element reuse | مصمم عقدياً |
| §13 | 9 tools + Scope/Pin | مصمم |
| §14 | Storyboard 3 modes + 8 functions | مصمم |
| §15 | Long-form hierarchy + Scheduler + Hybrid | مصمم |
| §16 | 7 continuity categories + in/out + regenerate unit only | مصمم |
| §17 | 7 audio tracks + timing before duration | مصمم |
| §18 | Production room + prompt formats + assembly 7 steps | مصمم |
| §19 | Board study + D1 | [غير محسوم] اعتماد |
| §20 | Capability Adapter + no hardcoded values | مصمم |
| §21 | Job 11 fields + failure 5 rules | مصمم |
| §22 | Quote components + cap + linkage | مصمم مع ledger [غير محسوم] |
| §23 | Logical data model + Prisma mapping | مصمم |
| §24 | 15 backend functions كعقود لا routes | مصمم، live state [غير محسوم] |
| §25 | i18n strategy | [غير محسوم] source |
| §26 | Mobile | [غير محسوم] |
| §27 | Phases and gates | مصمم |
| §28 | acceptance items | مصمم كقائمة تحقق لاحقة |
| §29 | unresolved points | محفوظة |
| §30 | ready instruction obeyed as governance | مصمم |
| §31 | external docs لا تستبدل registry runtime | مصمم |

## 26. إغلاق G1-G13

| Gap | إغلاق v2 |
|---|---|
| G1 | D1/D2 صُنفا [غير محسوم] وبوابة قبل Phase 2 |
| G2 | 9 قدرات Agent أضيفت |
| G3 | Context Packet 14 عنصر أضيف |
| G4 | continuityIn/out أضيفت لـShot/Block |
| G5 | 7 audio tracks أضيفت |
| G6 | remaining project credit cap أضيف |
| G7 | 7 continuity categories أضيفت |
| G8 | Job 11 fields + failure rules أضيفت |
| G9 | Assembly 7 steps أضيفت |
| G10 | ApprovedDecision + VersionMemory أضيفا |
| G11 | Prompt formats + switch impact أضيف |
| G12 | Empty States أضيفت |
| G13 | Production Selectors للفيديو/الصورة/الصوت أضيفت مع [غير محسوم] للمصادر غير المثبتة |

## 27. إغلاق M1-M13

| M | إغلاق v2 |
|---|---|
| M1 | محظورات المحادثة قُننت |
| M2 | الجذب الافتتاحي اختياري فقط، لا Hook |
| M3 | Creative Positioning + Settings approval flow |
| M4 | Project Overview fields أضيفت عقدياً |
| M5 | Scope/Pin + Storyboard كأداة تاسعة |
| M6 | Storyboard functions الثمانية |
| M7 | Hybrid strategy قاعدة تشغيل |
| M8 | إعادة الوحدة الفاشلة فقط |
| M9 | توقيت الحوار قبل duration |
| M10 | Quote 8+ components |
| M11 | Live broadcasting [غير محسوم] |
| M12 | i18n strategy [غير محسوم] |
| M13 | Idempotency formulas تصميمية، نهائي [غير محسوم] |

## 28. التوقف

هذه الوثيقة تغلق Phase 1 Architecture v2 كمراجعة تصميمية فقط. لا انتقال إلى Phase 2 قبل اعتماد صريح لـD1 وD2 وهذه الوثيقة.

