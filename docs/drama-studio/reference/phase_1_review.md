# 🔎 مراجعة Phase 1 من المراجع المعماري المستقل

**المراجعة على:** وثيقة Phase 1 المقدَّمة أعلاه
**المرجعية:** drama\_studio\_complete\_reference.md + Phase 0 + Phase 0.1
**التاريخ:** 2026-08-26
**الحكم المختصر:** Phase 1 **مقبولة بشكل عام كأساس** لكنها **غير جاهزة للانتقال إلى Phase 2**. تحتوي 12 فجوة حاسمة وعدة نواقص متوسطة يجب سدّها.

---

## 1. ما أصابته Phase 1 (تُعتمد كما هي)

| #نقطة قوةلماذا مقبولة |                                                                                                       |                                            |
| --------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| ✅ 1                   | فصل `contentFormat / episodeMode / adaptationMode / promptFormat` كأربعة مفاهيم منفصلة                | يحل خلطاً حرجاً كشفَه Phase 0.1 D3         |
| ✅ 2                   | Draft Project لا خصم كريدت عند الإنشاء                                                                | مطابق §5.2 و§5.3                           |
| ✅ 3                   | 9 حالات مشروع مع Guards صريحة                                                                         | يستكمل ثغرة Phase 0.1 §2.2                 |
| ✅ 4                   | 8 كيانات في الـhierarchy مع Season اختياري                                                            | تصحيح رقمي مطابق Phase 0.1 §3              |
| ✅ 5                   | Beat "ككيان منطقي مستقل في العقود" — التأجيل للتنفيذ الفيزيائي فقط                                    | مطابق قرار Phase 0.1 §9                    |
| ✅ 6                   | Drama Job **يرتبط بـ**`Generation`، لا يكرر Ledger/Idempotency/Admin                                  | مطابق قاعدة منع التكرار Phase 0.1 §7       |
| ✅ 7                   | لا افتراض Inngest أو Queue                                                                            | يحترم قاعدة "لا يفترض Job system غير مثبت" |
| ✅ 8                   | Board مشترك project-aware، لا Route رابع                                                              | مطابق Phase 0.1 §11                        |
| ✅ 9                   | Capability Adapter يقرأ من `VIDEO_MODEL_REGISTRY / getModelById / getGoogleVideoConstraints` الحقيقية | تصحيح مطابق Phase 0.1 §6                   |
| ✅ 10                  | Storyboard 3 أوضاع + Override hierarchy بأولوية `Shot > Scene > Episode > Project`                    | إضافة جيدة لم يذكرها المرجع صراحة          |
| ✅ 11                  | Adaptation Mode ≠ Prompt Format (§10 من الوثيقة)                                                      | تنفيذ D3                                   |
| ✅ 12                  | لا Route رابع خاص بـ Drama                                                                            | يمنع تضخم Routes                           |

---

## 2. الفجوات الحاسمة (Blocking قبل Phase 2)

### 🔴 G1. لم تُثبَّت قرارات D1 وD2 قبل الانتقال

Phase 0.1 اشترطت 3 قرارات قبل Phase 1: **D1 Board، D2 Feature flag/Preview banner، D3 فصل Adaptation**.

- **D3** ✅ ثُبِّت في §1
- **D1** ⚠️ Phase 1 **اقترحت** حلاً (§9 "الخيار المقترح") لكن **لم تُثبِت اعتماد صاحب المشروع** له. الاقتراح جيد، لكنه يحتاج ختماً صريحاً قبل Phase 2
- **D2** ❌ لم تُذكَر إطلاقاً. هل `/drama-studio` مخفية بـ feature flag أم بانر Preview أثناء البناء؟

**الأثر:** بدء Phase 2 قبل حسم D1 يعني احتمال هدم عمل Prisma لاحقاً.

### 🔴 G2. 9 قدرات المستخدم في الدردشة (المرجع §7.2) غائبة

عقد Agent في §10 يذكر سلوكيات عامة (persistence، proposals، سؤال واحد) لكن **لا يعدّد** القدرات التسع الملزمة:

1. تعديل فكرة/مشهد/حوار
2. تحليل مشكلة سردية
3. طلب بدائل متعددة (variants داخل Proposal)
4. تعديل شخصية/موقع/عنصر
5. تقسيم مشهد إلى لقطات (يستدعي ShotPlanner)
6. تقليل/زيادة زمن مع أثر معروض
7. مراجعة الاستمرارية
8. طلب Storyboard للمشهد/اللقطات
9. توليد/إعادة توليد بعد Quote

**بدون هذه القدرات كـ Tool contract محدد، الوكيل يبقى Chatbot عاماً.**

### 🔴 G3. Context Packet لا يحمل 14 عنصراً (المرجع §8.2)

Scheduler §12.6 يذكر 5 عناصر فقط للـContext Packet. المرجع §8.2 يفرض 14 عنصراً:

- ملخص المشروع
- موقع اللقطة في timeline سردي + timeline عرض
- هدف المشهد
- هدف اللقطة
- ما حدث قبلها
- ما يجب أن يحدث بعدها
- الشخصيات المشاركة + حالتها + مظهرها الحالي
- الموقع + الوقت + الطقس + الإضاءة
- العناصر + حالتها + مالكها + مكانها
- `continuityIn` و `continuityOut`
- الحوار + الصوت + التوقيت
- الكاميرا + اللون + المؤثرات
- مراجع الأدوات التسع (Style/Character/Element/Location/Sketch/Storyboard المختارة)
- المحظورات (لا تغيير ملابس/اتجاه/هوية)

**قاعدة §8.2 الحاسمة المفقودة:** "لا يُرسل تاريخ المشروع كله إلى الموديل" — Retrieval-based، ليس full dump. لم تُذكر في §11 من Phase 1.

### 🔴 G4. Continuity in/out (المرجع §16.2) غائب من العقد

`ContinuitySnapshot` في §11 يحوي `scope + visual + temporal + audio` — لكن **لا يوجد** `continuityIn` و`continuityOut` على مستوى Shot/GenerationBlock.

المرجع §16.2 صريح: "لا يعتمد النظام وحدة تالية إذا تعارض `continuityIn` معها". هذا **contract محوري** يجب أن يظهر في:

- `ShotPlan`
- `GenerationBlock`
- ContinuityEngine validator

### 🔴 G5. 7 مسارات صوت (المرجع §17.1) غير مذكورة كلها

Timeline في §15 يذكر: `video / dialogue / ambience-music / effects / continuity markers` — **5 مسارات**.

المرجع §17.1 يفرض 7:

1. Dialogue
2. Voice Over ← مفقود
3. Character Voice ID/Reference ← مفقود
4. Ambient
5. Sound Effects
6. Music (مُدمج مع Ambience في التصميم — خلط)
7. Captions/Subtitles ← مفقود

**"continuity markers" ليست مسار صوت** — تخصّ Continuity، لا Audio.

### 🔴 G6. 6 عناصر قبل التوليد (المرجع §18.3) — عنصر مفقود

§15 Generation Controls يذكر: `model / duration / aspect ratio / refs / takes count / quote` — 6 عناصر ظاهرة، لكن العنصر السادس في المرجع هو **"سقف الكريدت المتبقي للمشروع"** وليس Quote. Quote هو عنصر منفصل.

**المرجع §18.3 يفرض 6:**

1. الموديل والمزود الفعليان
2. المدة/الدقة/النسبة
3. الأصول المرجعية
4. عدد Takes
5. الكلفة الحالية (Quote)
6. **سقف الكريدت المتبقي للمشروع** ← مفقود صراحة

### 🔴 G7. Continuity 7 فئات (المرجع §16.1) مُختصرة إلى 3

`ContinuitySnapshot` في §11 يذكر `visual + temporal + audio`. المرجع §16.1 يفرض 7 فئات مع حقول فرعية مفصّلة:

1. **شخصية:** الوجه/العمر/الشعر/الملابس/الإصابة/المشاعر/وضع الجسم/اتجاه النظر/موقعها في الكادر
2. **مكان:** الوقت/الطقس/الضوء/مخطط المكان/الأبواب والمخارج/الاتجاه
3. **عناصر:** المالك/الحالة/المكان/الضرر/اليد التي تحمل العنصر
4. **فعل:** نقطة بداية الحركة ونهايتها
5. **كاميرا:** محور 180° / Screen direction / حجم اللقطة / العدسة / الحركة
6. **صوت:** المتحدث/بصمة الصوت/توقيت الجملة/الضوضاء المحيطة
7. **تقنية:** النسبة/الدقة/FPS/اللون/الصوت

هذه ليست تفصيلاً ثانوياً — هي الفارق بين Continuity حقيقية وأخرى شكلية.

### 🔴 G8. §21.2 و §21.3 لم تُصمَّم

Phase 0.1 §2.17-2.18 وثّقت أن Drama Job يحتاج:

- **11 حقلاً محدداً** لكل Job (§21.2)
- **5 قواعد فشل** (§21.3)

Phase 1 §8 اكتفت بـ "orchestration يرتبط بـ`Generation`". هذا **قرار معماري صحيح لكنه ليس عقداً**. يجب:

- تعداد 11 حقل صراحةً
- توضيح أيها يُقرأ من Generation وأيها Drama-specific
- تصميم Retry-per-block flow
- تصميم Re-apply confirmation بعد انقطاع الاتصال
- تحديد آلية sanitize رسائل المزوّد (§21.3-5)

### 🔴 G9. §18.4 التجميع (7 خطوات) — مذكور بجملة واحدة فقط

§15 يقول "Preview Render وFinal Render". المرجع §18.4 يفرض 7 خطوات مميزة:

1. توحيد الدقة/FPS/Codec/النسبة/اللون
2. قص Takes المعتمدة وترتيبها
3. تنفيذ القطعات والانتقالات المعتمدة
4. مزج الصوت والموسيقى والمؤثرات
5. إنشاء Captions عند الاختيار
6. Render Preview منخفض الكلفة
7. Final Render وتصدير النسخة النهائية

**كل واحدة تحتاج contract مستقل**، خصوصاً 1 (normalization contract) و 4 (audio mixing schema).

### 🔴 G10. Approved Decisions و Version Memory بلا عقد

§7 يذكر Approved Decisions و Version Memory ضمن طبقات الذاكرة، لكن **لا يعرض شكل السجل**:

**Approved Decision يحتاج:**

- `decisionId`
- `type` (settings / character / scene / …)
- `payload` قبل وبعد
- `decidedBy` (userId)
- `decidedAt`
- `scope` (project / episode / scene / …)
- `revertedAt?` + `revertReason?`

**Version Memory يحتاج:**

- `versionId`
- `entityRef` (ما الذي يُنسخ)
- `parentVersionId`
- `state` (draft / approved / archived / rejected)
- `activeFromVersionId?` / `activeUntilVersionId?`

بدون هذين العقدين، §7.3-6 "تعديل معلومة قديمة يسأل عن نطاق التغيير" لا يمكن تنفيذه.

### 🔴 G11. Prompt Format 3 صيغ + Switch impact غير مصمّم

§1 و §10 تذكران `promptFormat` كمفهوم، لكن **لا تعدّد الصيغ الثلاث** (§18.2):

- `Natural Description`
- `Professional Storyboard`
- `Faithful to Script`

**ولا تصمّم Switch impact:** المرجع §18.2 يفرض عند تغيير الصيغة عرض 3 خيارات (Later / Current unit rebuild / Range or All rebuild) مع أثر وتكلفة.

### 🔴 G12. Empty States غير مصمَّمة

المرجع §6.2-d و §11.1 يفرضان Empty States صادقة. §1 و §11 من Phase 1 لا يعرضان تصميم أي Empty State (لا Outline، ولا Characters، ولا Timeline، ولا Board قبل الإنشاء).

**بدون هذا الـcontract، الـUI سيقع في نفس فخ Prototype الحالي.**

---

## 3. الفجوات المهمة (Should Fix قبل Phase 2)

### 🟠 M1. §7.4 محظورات المحادثة غير مُقنَّنَة

عقد Agent §10 يذكر بعض المحظورات لكن لا يذكر:

- "لا رسائل نظام غير مفيدة (تغيير لغة، فتح قائمة)"
- "لا تكرار نفس الرد"
- "لا نسخ أوامر المرجع"
- "لا تقرير طويل مكان المحادثة"
- "لا ادعاء توليد أو حفظ لم يحدث"

### 🟠 M2. §9.3 الجذب الافتتاحي الاختياري

لم يُذكَر. **يجب** تسجيله صراحة كـ "اقتراح اختياري، ليس قاعدة" لمنع تحوّله لاحقاً إلى Hook إلزامي.

### 🟠 M3. §10.3 Creative Positioning + §10.4 اعتماد الإعدادات

Genre / Background / Tone-Trope + Custom — غير مذكورة في مخطط Settings.

Confirmation flow لاعتماد الإعدادات (Summary → Snapshot version → Planning job → Decision log → Scope diff on later change) غير مصمّم.

### 🟠 M4. §11.2 Project Overview كامل غير مصمّم

Wireframe يذكر "Outline & Script" فقط. Project Overview يحتاج:

- `logline`
- `dramaticQuestion?` (اختياري حسب §11.2)
- عدد الحلقات (computed)
- `targetDurationSec` + `plannedDurationSec` (منفصلان)
- عدد شخصيات/مواقع/عناصر
- بطاقات الحلقات بـ 8 حقول (رقم/عنوان/ملخص/مدة مستهدفة/مدة مخططة/عدد مشاهد+لقطات+وحدات/حالة سيناريو/حالة إنتاج)

### 🟠 M5. §13 الأدوات التسع — Scope وPin غير مذكوران

§13 من Phase 1 يذكر 8 أدوات فقط (Storyboard منفصلة في §14). **لكن المرجع §13 يعتبر Storyboard الأداة التاسعة** ضمن نفس الـrail.

كما أن **Scope و Pin mechanism** المرجعيان في §13 (Scope: مشروع/حلقة/مشهد/مجموعة لقطات/اللقطة الحالية) لم يظهرا في العقد.

### 🟠 M6. §14.3 وظائف Storyboard الثمانية

§14 يذكر الأوضاع الثلاثة + Override، لكن لا يعدّد الوظائف الثمانية:

1. توليد لوحة من Shot Plan
2. رفع لوحة / Sketch
3. Import from Project Board
4. ربط لوحة بلقطة أو Generation Block
5. تحديد First/Last Frame عند دعم الموديل
6. Approve/Reject/Regenerate لوحة
7. مقارنة مع الفيديو الناتج
8. عدم إظهار "المشروع ناقص" عند No Storyboard

### 🟠 M7. §15.3 Hybrid Strategy غير مؤكَّد كنمط تشغيلي

Scheduler §12.5 يذكر cut/chaining/extension بشكل منفصل. المرجع §15.3 يقول Hybrid هو **الأسلوب التشغيلي الصحيح**، لا اختيار واحد للحلقة كاملة. يجب تسجيل هذا كقاعدة، لا كخيار.

### 🟠 M8. §16.3 القاعدة "إعادة الوحدة الفاشلة فقط"

§8 يذكر مبدأ عام. المرجع §16.3 يفرض بنداً محدداً: "لا تعاد الحلقة كاملة بسبب خطأ لقطة واحدة". هذا Guard على مستوى Job orchestration، ليس مجرد سياسة.

### 🟠 M9. §17.2 توقيت الحوار قبل تثبيت مدة اللقطة

مبدأ حرج للفيديو الطويل: **زمن الحوار يُقاس قبل تحديد** **`durationSec`** **للـShot**. تصميم Scheduler §12.1 يقول "يحسب مدة الحوار" — جيد، لكن **لا يُنَص** على أن هذا الحساب مدخل إلزامي لـ `ShotPlan.durationSec`.

### 🟠 M10. §22.1 Quote 8 مكونات

§16 يذكر minimum/expected/safeMaximum. لكن المرجع §22.1 يشترط تضمين:

- الفيديو
- عدد Takes
- الصور
- Storyboard (إن اختير)
- الصوت
- Lip sync
- Upscale
- إعادة المحاولات / Render حسب سياسة المنصة

**كل مكوّن يحتاج bracket في Quote.**

### 🟠 M11. Function 15 (§24) — Live state broadcasting غير محسوم

Phase 0.1 §2.21 وضع هذا كسؤال مفتوح: SSE أم WebSocket أم Inngest events؟ Phase 1 لا تحسمه. **ينبغي على الأقل تسجيل التأجيل كـ ADR-Pending**.

### 🟠 M12. i18n Strategy (§25) — لم تُختَر بعد

المرجع §25 يفرض: "لا قاموس منفصل عشوائي داخل الصفحة إذا كان نظام الترجمة المركزي موجوداً". الصفحة الحالية مليئة بـ `isAr ? "…" : "…"` ternaries داخل TSX.

Phase 1 §17-25 تقول "i18n وتوزيع غير معكوس" — لكن **لا تقرّر:**

- هل نستخدم نظام i18n موجود (يجب اكتشافه)؟
- أم Drama Studio يبني قاموساً مركزياً جديداً؟
- كيف نتعامل مع النصوص المضمّنة الحالية؟

### 🟠 M13. Idempotency key strategy لكل Drama endpoint

§8 يقول "لا يكرر Idempotency". لكن **لا يوضح** كيف تُشتَق مفاتيح Idempotency لعمليات Drama:

- Quote request: `hash(projectId + blockId + modelId + settings)` ؟
- Generate: `hash(blockId + take-index)` ؟
- Approval: `hash(proposalId)` ؟

هذا **contract مفقود**.

---

## 4. الفجوات الطفيفة (Nice to Have — يمكن تأجيلها إلى Phase 2)

- **N1** — Season creation gate: متى يُنشأ Season، ومتى يُتجاوَز؟
- **N2** — Draft abandonment: كيف تُحذَف مشاريع Draft المهجورة؟
- **N3** — Board integration API contract: كيف تستهلك Drama الـBoard المشترك؟ (يعتمد على D1)
- **N4** — Long-form export formats/codecs (§29-4 في المرجع، مؤجل إلى Phase 6)
- **N5** — Retention policy لـ Rejected Takes (§29-7 في المرجع، مؤجل إلى Phase 5)
- **N6** — Mobile wireframe (§29-5 في المرجع، معلَّق بحق)
- **N7** — Delegation policy for low-risk edits (§29-6 في المرجع، مؤجل إلى Phase 2 حسب Phase 0.1 D9)

---

## 5. ملاحظات على العقود المقدَّمة

### 5.1 JSON Schemas §11

الـ 8 schemas مبدأ جيد لكنها **تعريفية وليست JSON Schema** (بدون `$schema`, `type`, `properties`, `required`). قبل Phase 2 يجب رفعها إلى JSON Schema فعلي قابل للـ validation.

**نواقص محددة:**

- `ScenePlan` لا يحمل `dramaticGoal` كمُلزم مقابل §16.1 (يحتاج `sceneMemory.outcome`)
- `ShotPlan` يفتقر `continuityIn / continuityOut / referenceIds[]`
- `GenerationBlock.contextPacket` مذكور كـ `object` بلا schema فرعي — يجب توسعته لـ 14 عنصر §8.2
- `ContinuitySnapshot` يفتقر 7 فئات §16.1
- `Quote` يفتقر 8 مكوّنات §22.1 وحقل `perComponentBreakdown`
- `ProposalImpact` يفتقر `alternatives[]` (§7.2-3 يطلب بدائل)
- **مفقود schema:** `AdaptationModeSnapshot`, `SettingsSnapshot`, `ApprovedDecision`, `MemoryDocumentVersion`, `TakeVersion`, `AudioTrack`, `SubtitleTrack`

### 5.2 Capability Adapter Matrix §13

جدول ممتاز، لكن يجب إضافة:

- **Prompt character limits** — `lib/video-model-registry.ts` يحمل `max_prompt_characters` — يجب استخدامه لمنع رفض المزوّد
- **Region availability** مصنَّف "unknown" — يجب explicit fallback rule (منع الاختيار أم إظهار مع تحذير؟)
- **Provider queue limits** — كيف يتصرف UI عند تجاوز الحد؟

### 5.3 State Machine §3

الـ 9 transitions مصممة، لكن **مفقودة:**

- Guard على "لا Job نشط قابل للتراجع" — كيف يُثبت هذا (query على DB أم في-memory)؟
- Transition من `Completed` إلى `Review` (تعديل بعد الاعتماد) — مسموح أم ممنوع؟
- Terminal state `Archived` أو `Deleted`؟

### 5.4 Traceability §17

الجدول مضغوط بحدّ الرمز. لكل قسم من §0-§31 السطر الواحد لا يكفي لإثبات التغطية. يُنصح بتفصيل ما لم يُصمَّم مقابل ما صُمِّم.

---

## 6. اختبار الفرضيات مقابل المستودع

### 6.1 §5 "CinemaProject مرشح إعادة الاستخدام"

**ملاحظة تحفظية:** `CinemaProject` يحمل `conceptPrompt/negativePrompt/modelRoute/aspectRatio/defaultDuration` — حقول Cinema-specific. توسعته لـ Drama يعني:

- إما إضافة حقول Drama-only nullable (تضخم)
- أو Discriminator column `kind: "cinema" | "drama"` (تعقيد queries)
- أو **جدول Drama منفصل مع FK إلى مفاهيم مشتركة** (توصية Reviewer)

Phase 2 يجب أن يقارن بمكتوب.

### 6.2 §8 "Generation كمصدر الحقيقة للكريدت"

**تحفّظ:** `Generation` لا يحمل حقل `quotedCredits` منفصلاً عن `cost`. الفارق مهم للـLedger:

- `quoted` = ما أعلنه Quote
- `charged` = الفعلي المخصوم
- `refunded` = المرتجع عند فشل

بدون فصل، §22 Quote linkage لن يكون قابلاً للـ audit.

### 6.3 §9 "Board مشترك"

جيد. لكن **لم يفحص** Phase 1 نمط `components/canvas/canvas-context.tsx` الذي يوفر `CanvasContext + useCanvasActions + CanvasNode`. **قبل بناء Board جديد**، Phase 2 يجب أن يقرأ هذه الـ primitives ويقرر:

- إعادة استخدام مباشرة
- أم wrapper
- أم refactor للأصلي

### 6.4 §13 Capability Adapter

جيد لكن **لم يفحص** `lib/routing/` الذي ذكره Phase 0.1 §2.19 (routing مركزي موجود). يجب على Phase 2 مطابقة adapter المقترح مع الـ routing الموجود لتجنب تكرار Capability translation.

---

## 7. القرارات المعلَّقة قبل الانتقال إلى Phase 2

قبل ختم Phase 1، أحتاج:

1. **اعتماد صريح لـ D1** (Board strategy: shared reuse كما اقترح §9)
2. **اعتماد صريح لـ D2** (feature flag أم Preview banner)
3. **سدّ فجوات G1-G12** (على الأقل توثيق قرار تأجيلها إلى Phase 2 كـ ADR-Pending إن لم تُسدّ الآن)
4. **حسم M11** (SSE/WS/Inngest events)
5. **حسم M12** (i18n strategy)
6. **حسم M13** (Idempotency key formulas)
7. **رفع JSON Schemas في §11** إلى JSON Schema فعلي (يمكن كملف spec، لا يخرق قاعدة "لا كود")
8. **توسعة Traceability §17** لتشمل ما صُمِّم فعلاً مقابل ما لم يُصمَّم

---

## 8. الحكم النهائي

**هل Phase 1 مكتملة؟** ❌ لا.

**هل ما فيها صحيح؟** ✅ نعم في معظمه — لا انحرافات معمارية كبيرة عن المرجع، والقرارات المتخذة (Adaptation ≠ Prompt، Beat domain-first، Job ↔ Generation، Board مشترك) صائبة.

**هل يمكن الانتقال إلى Phase 2؟** ❌ **لا، ليس الآن.**

**المطلوب لإكمال Phase 1:**

- سدّ **12 فجوة حاسمة** (G1-G12) — إما بتصميم فعلي أو ADR-Pending موثَّق
- سدّ **13 فجوة مهمة** (M1-M13) — على الأقل قرار مكتوب لكل واحدة
- اعتماد صريح لـ D1 + D2

**تقدير حجم العمل المتبقي لإكمال Phase 1:** جولة توسعة واحدة بحجم ثلثَي وثيقة Phase 1 الحالية، دون كود. بعد ذلك يمكن فتح Phase 2 (Prisma design + migrations).

**توقفت. لا أنتقل إلى Phase 2. لا أقترح تنفيذاً. أنتظر:**

1. توسعة Phase 1 بسدّ G1-G12 + M1-M13
2. أو قرار صريح بتصنيف الفجوات كـ ADR-Pending وإدراجها في خطة Phase 2 بشكل رسمي
3. اعتماد D1 + D2 نصياً

لاكن لا ارة منسدلة الموديلات التي ستنفذ والنسب و الكوالتي والوقت من ناحية الانتاج الفديو و الصورة  والصوت

# 🔴 فجوة إضافية G13 — Selectors الإنتاج (فيديو / صورة / صوت) غير مصمَّمة

**ملاحظتك صحيحة تماماً، وهي فجوة حرجة فاتتني في المراجعة السابقة. أضيفها الآن:**

---

## G13. لا يوجد تصميم Dropdowns للـ Selectors في غرفة الإنتاج

Phase 1 §15 يكتفي بذكر أسماء عامة (`model / duration / aspect ratio / refs / takes count`) **دون تصميم Selector واحد**. وهذا يخفي فجوة أكبر: **الوثيقة صمّمت الإنتاج للفيديو فقط**، وأهملت:

- **الصور** (Storyboard frames، Character refs، Location plates، Sketches)
- **الصوت** (Voice Over، Dialogue TTS، Music، SFX، Ambience)

### 13.1 المفقود لكل نوع إنتاج

| نوعModelAspect RatioQuality/ResolutionDurationحالة في Phase 1 |               |               |                    |               |                        |
| ------------------------------------------------------------- | ------------- | ------------- | ------------------ | ------------- | ---------------------- |
| **فيديو**                                                     | ❌ لا selector | ❌ لا selector | ❌ لا selector      | ❌ لا selector | مذكور بالاسم فقط       |
| **صورة**                                                      | ❌             | ❌             | ❌                  | لا يلزم       | **غير مصمَّم إطلاقاً** |
| **صوت**                                                       | ❌             | لا يلزم       | ❌ (bitrate/sample) | ❌             | **غير مصمَّم إطلاقاً** |

### 13.2 ما يحتاج تصميماً في Phase 1 قبل Phase 2

**لكل نوع من الثلاثة (فيديو/صورة/صوت):**

1. **Model Selector**
   - المصدر: Registry مركزي (نُثبِت الـexports الحقيقية لكل نوع)
   - العرض: قائمة مفلترة بـ `enabled=true` + منسّقة حسب `family`
   - Placeholder + Empty state عند عدم توفر موديل
   - Provider badge (Google / BytePlus / KIE …)
   - Cost badge لحظي من Registry
   - Capability badges (T2V / I2V / has\_sound / has\_end\_frame …)
2. **Aspect Ratio Selector**
   - يُقرأ من `capabilities.aspect_ratios` للموديل المختار
   - **يختفي** عندما `aspect_ratios: []` (auto/N/A)
   - يعرض previews visual للنسب (9:16 / 16:9 / 1:1 / 4:5 …)
3. **Quality / Resolution Selector**
   - **فيديو:** يُقرأ من `capabilities.resolutions` أو `capabilities.sizes` حسب `quality_param`
   - **صورة:** dimensions selector (512/1024/2048/native)
   - **صوت:** bitrate / sample rate (128/192/256 kbps، 44.1/48 kHz)
   - يختفي إذا `undefined` في Registry
4. **Duration Selector**
   - **فيديو:** يُقرأ من `capabilities.durations` (قائمة صريحة) أو `maxDuration` (range)
   - **صوت:** target seconds مع حد أعلى للموديل
   - **صورة:** لا يلزم
5. **Take Count Selector**
   - عام: 1-4 (يقرأ الحد الأعلى من سياسة المشروع أو Registry)
6. **Reference Slots**
   - يُقرأ من `max_reference_images / max_reference_videos / max_reference_audios`
   - يمنع الرفع بعد بلوغ الحد

### 13.3 عقد إضافي مطلوب

```
ProductionSelectorContract {
  mediaKind: "video" | "image" | "audio"
  modelId: string        // من Registry
  aspectRatio?: string   // مقيَّد بـ capabilities.aspect_ratios
  resolution?: string    // مقيَّد بـ capabilities.resolutions|sizes
  durationSec?: number   // مقيَّد بـ capabilities.durations|maxDuration
  takeCount: number      // مقيَّد بحد المشروع
  references: {
    images: AssetRef[]   // ≤ max_reference_images
    videos: AssetRef[]   // ≤ max_reference_videos
    audios: AssetRef[]   // ≤ max_reference_audios
  }
  // كل حقل يحمل مصدره الفعلي من Registry، ولا يُكتب حرفياً في UI
}
```

### 13.4 قاعدة Registry-Driven UI (ملزمة)

**لا يظهر خيار واحد في Dropdown لم يأتِ من:**

- **فيديو:** `getAllModels()` / `VIDEO_MODEL_REGISTRY` — `lib/video-models.ts` + `lib/video-model-registry.ts`
- **صورة:** `lib/image-models.ts` / `lib/google-image-model-specs.ts` — يحتاج فحص Phase 2 لاعتماد المصدر الرسمي
- **صوت:** `lib/voice-registry.ts` / `lib/voice-catalog.ts` — يحتاج فحص Phase 2 لاعتماد المصدر الرسمي

**Cross-check:** المرجع §20 يقول: "الـUI والـScheduler والتسعير يقرؤون هذا السجل نفسه. عند غياب Capability، يختفي الخيار أو يظهر غير متاح مع سبب." — Phase 1 لم يصمّم هذا السلوك للـSelectors.

### 13.5 Empty / Unavailable States

كل Selector يحتاج 3 حالات:

1. **متاح:** قائمة عادية
2. **غير متاح للموديل الحالي:** يختفي أو Disabled مع Tooltip يشرح
3. **قيد التحميل / خطأ:** Skeleton + fallback واضح

Phase 1 لم يذكر أياً من الحالات الثلاث لأي Selector.

### 13.6 التزامن Model → باقي Selectors

**قاعدة معمارية مفقودة:** عند تغيير الموديل، **يجب** إعادة حساب:

- Aspect ratios المتاحة → إعادة اختيار الافتراضي إن لم يكن موجوداً
- Resolutions المتاحة → نفسه
- Durations المتاحة → نفسه
- Reference slots → إعادة تقييم الرفع الحالي (رفض ما يتجاوز الحد الجديد)
- **Quote** → إعادة حساب فوري

هذا **state coordination contract** غائب من Phase 1 §11 و §15.

---

## أثر G13 على المخرجات

**بدون سدّ هذه الفجوة قبل Phase 2:**

1. Phase 2 (Prisma) قد يتجاهل حقول Reference type-specific → migration ثانية
2. Phase 3 (Workbench) سيبني Selectors مرتجلة → تكرار نمط Prototype الحالي `page.tsx:476,490-497`
3. Phase 4 (Scheduler) لن يجد مصدراً موحداً لقيود القدرات
4. Phase 5 (Production) سيعيد اكتشاف نفس القيود على مستوى UI و API — divergence حتمي
5. **Image + Audio ستُبنى لاحقاً كإضافة، لا كجزء من العقد الأصلي** → معمارية غير متسقة

---

## توصية مُحدَّثة

**Phase 1 يحتاج جولة توسعة تُغطي:**

- ✅ G1-G12 السابقة
- ✅ **G13 الجديدة** (Production Selectors × 3 media kinds)
- ✅ M1-M13 السابقة

**نقاط عمل محددة لـ G13 قبل الانتقال:**

1. اعتماد مصدر Registry واحد لكل نوع (فيديو ← موجود، صورة/صوت ← فحص Phase 2 للمصدر الفعلي)
2. تصميم `ProductionSelectorContract` unified يخدم الأنواع الثلاثة
3. تصميم Model change → cascade rules
4. تصميم Empty/Unavailable/Loading states
5. تصميم Reference slot limits UI
6. تصميم Cost badge لحظي مربوط بالـQuote engine

**شكراً على الالتفات لهذه الفجوة — كانت ستكشف نفسها كديون معمارية في Phase 3 أو Phase 5.**

**لا أنتقل. أنتظر توسعة Phase 1 لسد G1-G13 + M1-M13 قبل فتح Phase 2.**