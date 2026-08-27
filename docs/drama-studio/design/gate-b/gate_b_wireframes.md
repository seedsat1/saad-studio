# Gate B v2 — Complete Wireframes & UX Specification

**Document Version:** 2.2 (Admin Registry Contract & Input Combination Rules Precision — HB1–HB4)  
**Role:** Lead Product Designer & UX Architect  
**Platform:** Saad Studio (AI Microdrama & Long-form Film Production Platform)  
**Status:** Gate B v2 Complete & Submitted for Owner Review | Gate C Strictly Blocked  
**Visual Direction:** `Cinematic Director Workspace` (Dark Navy Tokens `--ss-bg`, `--ss-card`, Interactive Action `--ss-cyan`, AI Agent `--ss-violet`, Semantic Warnings & Continuity `--ss-amber`)  

---

## 1. سجل قرارات المالك النهائية (Owner Final Decision Log)

تم اعتماد كافة القرارات المعمارية والتصميمية التالية وتثبيتها كقواعد حاكمة لا يجوز تعديلها:

| المعرّف | القرار المعتمد | التفاصيل والآلية التشغيلية المعتمدة |
| :--- | :--- | :--- |
| **Q1: Project System** | **موقع نظام المشاريع** | • امتداد `Project Launcher Extension` داخل صفحة Drama Studio الرئيسية (`SCR-01`).<br>• قسم `Recent Projects` داخل امتداد الـ Hero مع بطاقات المشاريع الحقيقية.<br>• نافذة `All Projects` كـ Overlay كامل (`MDL-07`) داخل Drama Studio (حظر إنشاء Route مستقل باسم `/drama-studio/projects`).<br>• مبدل المشاريع `Project Switcher` (`PNL-07`) ثابت داخل Header الـ Workbench وغرفة الإنتاج (حظر وضعه في TopNavbar العام للمنصة لمنع الازدحام).<br>• خارج Drama Studio يرجع المستخدم إلى `/drama-studio` ثم يفتح مشروعه.<br>• مساحة `Project Board` المشتركة (`SCR-04`) تفتح دائماً مرتبطة بسياق `projectId`. |
| **Q2: Saving Policy** | **آلية الحفظ والنسخ** | • اعتماد `Autosave + Version Snapshots` مع حالات: Saving, Saved, Save Failed, Offline, Reconnecting, Conflict Detected.<br>• إنشاء `Version Snapshot` تلقائياً عند اعتماد أي قرار مشهدي أو إعداد رئيسي.<br>• استعادة الحالة الدقيقة للمشروع عند إعادة فتحه (التبويب، المشهد، مؤشر التايم لاين، الأدوات المثبتة، الذاكرة).<br>• حل التعارض المتزامن عبر `MDL-09 Multi-Session Conflict Resolver`.<br>• الفصل التام بين `Rename` (تعديل اسم المشروع الحالي فقط دون تغيير `projectId`) و `Save a Copy As` (`MDL-08`: إنشاء مشروع مستقل بـ `projectId` جديد وسجل تكلفة نظيف دون نقل مصاريف أو تاريخ المشروع الأصلي). |
| **Q3: Poster Strategy**| **تدرج بوستر المشروع** | • التسلسل: `Fallback → Auto Suggest → User Override`.<br>• 1. يبدأ بـ Placeholder أصلي من هوية سعد ستوديو عند الإنشاء (`Source: Placeholder`).<br>• 2. اقتراح أول Keyframe أو أول Take معتمدة تلقائياً كبوستر (`Source: Auto`).<br>• 3. يتاح للمستخدم لاحقاً: رفع بوستر (`Uploaded`)، اختيار Keyframe، اختيار كادر من Take معتمدة (`Selected Frame`)، أو استعادة المقترح تلقائياً. |
| **Q4: Hybrid Engine**  | **المحرك الهجين لتوليد الفيديو (Reference + Start/End)** | • اعتماد **النظام الهجين**: `Reference-first` لحفظ الهوية + `Start/End Frames` للترابط الزمني.<br>• 7 مدخلات تشغيلية: Character Ref, Location Ref, Element Ref, Style Ref, Start Frame, End Frame, Previous Take.<br>• استراتيجية اللقطة: المراجع للشخصيات المتكررة، Start Frame لاستكمال الحركة من آخر Take معتمد، End Frame للوصول إلى تكوين محدد، و Reference Packet للقطات متعددة الأصول.<br>• مسار التوليد متعدد المراحل (`Multi-Step Fallback`): إذا لم يسمح الموديل بدمج المراجع مع Start/End في نفس الطلب، يتم توليد Keyframe مضبوط بالمراجع أولاً عبر موديل صور، ثم تمريره إلى موديل Start/End.<br>• تسجيل `inputCombinationRules` في سجل الأدمن بدقة بدلاً من boolean مبسط.<br>• اختيار الموديل لكل Generation Block مع تثبيته داخل المشهد لتقليل الانحراف. |
| **E1–E6: Lifecycle**   | **إدارة دورة حياة المشروع**| • دعم حالة الأرشفة `Archived State` والحذف المرن `Soft Delete` القابل للاستعادة.<br>• مدة الاستعادة ديناميكية تأتي من سياسة الأدمن المركزية (حظر تثبيت 30 يوماً أو أي مدة افتراضية).<br>• `Save a Copy As` تغطي وظيفة Duplicate Project.<br>• دعم البحث والفلترة والفرز بجميع حالات البطاقة `CMP-01` ومؤشرات المهام الجارية في الخلفية `Background Jobs`. |
| **Credit System**      | **نظام الكريدت والتسعير**| • اعتماد نظام `Credit Quote & Cost Inspector` بالكامل.<br>• تفصيل تكلفة ديناميكي (`Dynamic Itemized Cost Breakdown`) يعرض فقط البنود المنطبقة على العملية الحالية (فيديو، صور، ستوريبورد، صوت، مزامنة شفاه، ترقية دقة، رندر تجميع ومعاينة ورندر نهائي) دون فرض عدد بنود جامد.<br>• دورة الكريدت: `Quote → Confirm & Reserve (MDL-03) → Generate → Reconcile → Charge (MDL-11)`.<br>• الاسترداد التلقائي الفوري (`Auto-Reversal / Refund`) عند الفشل أو الإلغاء.<br>• جميع الأسعار والموديلات والقدرات تأتي حصرياً من السجلات المركزية (`Admin Model Registry`, `Pricing Constitution`, `Provider Routing`, `Credit Ledger`) مع حظر تثبيت أي سعر أو موديل يدوياً. |

---

## 2. الثوابت البصرية ونظام الـ Tokens الرسمي (Design Tokens Authority)

المصدر الرسمي والوحيد لكافة القيم البصرية هو `globals.css` ونظام Tokens سعد ستوديو المثبت في المستودع. يتم التعامل مع الألوان برمجياً وتوثيقياً عبر أسماء الـ Tokens فقط دون كتابة أرقام Hex يدوية:

* **`--ss-bg`**: لون الخلفية الرئيسي الداكن لمساحة العمل وسياق الإنتاج السينمائي.
* **`--ss-card`**: لون أسطح البطاقات والحاويات والقوائم المنسدلة.
* **`--ss-cyan`**: لون التفاعل الأساسي، الأزرار الإجرائية، والتركيز النشط.
* **`--ss-violet`**: لون وكيل الإخراج، توليد الذكاء الاصطناعي، وطبقات الذاكرة.
* **`--ss-amber`**: لون دلالي مخصص حصرياً للتحذيرات التشغيلية والاستمرارية وتعارض الحفظ.

---

## 3. معمارية المعلومات المحدثة (Updated Information Architecture)

```mermaid
graph TD
    A[SCR-01: Hero & Project Launcher /drama-studio] -->|New Project Action| M1[MDL-06: New Project Modal]
    A -->|View All Projects Action| M2[MDL-07: All Projects Overlay]
    A -->|Open Recent Project| B[STA-01: Preparing State Overlay]
    M1 -->|Create Project & Assign projectId| B
    
    B -->|Project Initialized| C[SCR-02: Drama Workbench /drama-studio/projectId]
    
    subgraph "Drama Workbench (/drama-studio/[projectId])"
        H1[Workbench Header: PNL-07 Project Switcher | Autosave Status | Cap Monitor | Board Link]
        
        C1[Left Column 40-42%: PNL-01 Director Agent Panel]
        C2[Right Column 58-60%: Management Workspace]
        
        C1 --> C1a[Chat Stream & History]
        C1 --> C1b[MDL-01: Proposal Decision Cards Before/After]
        C1 --> C1c[PNL-02: 9-Layer Memory Drawer]
        
        C2 --> T1[SCR-02A: Settings Tab]
        C2 --> T2[SCR-02B: Outline & Script Tab]
        C2 --> T3[SCR-02C: Characters Tab]
        C2 --> T4[SCR-02D: Locations & Environments Tab]
        C2 --> T5[SCR-02E: Elements & Props Tab]
    end
    
    C -->|Project Switcher Action| P1[PNL-07: Switch Project Dropdown / Background Jobs]
    C -->|Save Menu Action| M3[MDL-08: Save a Copy As Modal]
    C -->|Concurrent Edit Detected| M4[MDL-09: Save Conflict Resolver]
    C -->|Archive/Delete Action| M5[MDL-10: Archive & Retention Modal]
    
    C -->|Open Project Canvas| D[SCR-04: Shared Project Board Canvas]
    C -->|Enter Production Room| E[SCR-03: Video Production Studio]
    
    subgraph "Video Production Studio (/drama-studio/[projectId]/episodes/[episodeId]/production)"
        H2[Production Header: PNL-07 Switcher | Scope Breadcrumbs | Balance & Cap]
        
        R[PNL-03: Creative Tools Rail 9 Tools]
        
        E1[Main Stage: Script/Prompt Editor & Preview Canvas]
        E2[PNL-04: Continuity Inspector Flyout with Pin]
        E3[PNL-05A/B: Storyboard Strip & Full Workspace]
        E4[MDL-03 & PNL-08: Credit Quote & Cost Inspector]
        E5[PNL-06A/B: Hierarchical Timeline LTR & 7 Audio Tracks]
        E6[SUB-01: Assembly, Preview & Final Export Stage]
    end
    
    E4 -->|Confirm & Reserve| G1[Generation Job Stream: Hybrid Reference + Start/End]
    G1 -->|Success| R1[MDL-11: Completion Receipt Modal]
    G1 -->|Failure| R2[Auto-Refund Reversal State & Retry Unit]
    
    E6 -->|Master Render Approved| F[Final Master Deliverable]
```

---

## 4. المحرك الهجين لتوليد الفيديو وضبط الاستمرارية (Hybrid Reference & Start/End Engine)

### أ) منظومة المدخلات السبعة (The 7-Input Taxonomy)
لا يعتمد استوديو الدراما على Text-to-Video بمفرده ولا على Start/End بمفرده؛ بل يعتمد منظومة هجينة تدمج تثبيت الهوية مع التحكم الزمني:

```text
┌────────────────────────────────────────┬──────────────────────────────────────────────────────────────────────────┐
│ المدخل (Input Artifact)                │ الوظيفة السينمائية والتشغيلية في Drama Studio                             │
├────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
│ 1. Character/Subject Reference         │ تثبيت ملامح الوجه، الهوية، تسريحة الشعر، والملابس عبر كافة اللقطات.       │
│ 2. Location Reference                  │ تثبيت تصميم الموقع، البيئة المعمارية، وتوزيع الإضاءة العامة والطقس.       │
│ 3. Element Reference                   │ تثبيت شكل وحالة الأدوات، الأسلحة، المركبات، والعناصر المحورية المتكررة.   │
│ 4. Style Reference                     │ تثبيت النمط البصري، عدسة التصوير، والتدرج اللوني العام للمشروع.          │
│ 5. Start Frame                         │ تحديد الكادر والحالة التي تبدأ منها اللقطة (آخر كادر من الـ Take السابق).│
│ 6. End Frame                           │ تحديد الوضع أو التكوين الهدف الذي يجب أن تنتهي إليه حركة اللقطة.         │
│ 7. Previous Take / Video Reference     │ استمرار الحركة الفيزيائية من فيديو سابق عند دعم الموديل لـ Video Extension│
└────────────────────────────────────────┴──────────────────────────────────────────────────────────────────────────┘
```

### ب) مصفوفة استراتيجية اللقطات (Shot Strategy Matrix)
1. **لقطة فيها شخصية رئيسية متكررة**: تتطلب `Character Reference` + يُفضل استخدام `Start Frame` من آخر لقطة معتمدة.
2. **لقطة تستكمل حركة سابقة**: نستخدم آخر إطار من الـ Take المعتمد كـ `Start Frame`.
3. **لقطة يجب أن تصل إلى تكوين محدد**: نستخدم `Start Frame + End Frame`.
4. **لقطة فيها شخصية وموقع وأداة**: يتم تجميع وإرسال حزمة مراجع محددة (`Reference Packet`) تحتوي فقط على المراجع التي تحتاجها اللقطة دون حشو.
5. **لقطة انتقالية أو منظر عام بلا شخصيات ثابتة**: يمكن استخدام `Text-to-Video` أو `Start Frame` فقط.
6. **عند تفعيل الستوريبورد الاختياري**: تتحول الـ Keyframes المعتمدة إلى `Start/End Frames`، دون إلغاء مراجع الشخصيات والمواقع.

### ج) قواعد تركيب المدخلات ومسار التوليد متعدد المراحل (Input Combination & Fallback Pipeline)
* **الحالة المثالية (إذا سمح الموديل بالجمع في API واحد)**:
  $$\text{Request} = \text{Reference Packet} + \text{Start Frame (Last Take)} + \text{End Frame (Target Keyframe)} + \text{Prompt} + \text{Camera}$$
* **حالة عدم دعم الجمع المباشر في واجهة المزود (Provider Constraint)**:
  1. يقوم النظام أولاً بتوليد `Keyframe` مضبوط بالمراجع (`Reference-Conditioned Image`) عبر موديل صور رسمي (مثل Seedream أو Nano Banana أو GPT Image).
  2. يتم تمرير هذا الـ Keyframe المعتمد كـ `Start Frame` إلى موديل الفيديو المتخصص في تحريك الإطارات.
  3. بذلك نحافظ على ثبات الهوية دون أن نخسر دقة التحكم الزمني.

### د) سجل النماذج المركزي وعقد مواءمة القدرات (Admin Model Registry & Capability Normalization Layer)

> **تثبيت طبيعة العقد المعماري (HB1):**  
> هذا العقد هو **Drama-facing Normalization Layer** خاص بـ Drama Studio، وليس تمثيلاً حرفياً للحقول الموجودة حالياً في `lib/video-model-registry.ts`. في Phase 2 يجب بناء **Capability Adapter** يقرأ حقول الـ Registry الفعلية بصيغة `snake_case` ويحوّلها إلى عقد موحّد يستهلكه Drama Studio. لا يجوز اعتبار أي حقل مقترح متاحاً في Runtime قبل إثبات مصدره أو تنفيذ الـ Adapter واعتماده.

#### 1. تصنيف حقول سجل النماذج (Model Registry Field Categories — HB2):

##### `[EXISTS — Registry field]` (الحقول الفعلية الحالية في `lib/video-model-registry.ts`):
* `requires_image`: (Boolean) هل يتطلب الموديل صورة مدخلة إلزامية للعمل.
* `optional_image`: (Boolean) هل يقبل الموديل صورة مدخلة اختيارية.
* `requires_video`: (Boolean) هل يتطلب الموديل فيديو مدخل إلزامي للعمل.
* `optional_video`: (Boolean) هل يقبل الموديل فيديو مدخل اختياري.
* `has_end_frame`: (Boolean) هل يدعم الموديل استقبال إطار نهاية (End Frame).
* `aspect_ratios`: (Array<String>) نسب العرض المدعومة فعلياً في الموديل (مثل "16:9", "9:16", "1:1").
* `durations`: (Array<Integer>) المدد الزمنية المدعومة بالثواني (مثل [5, 10]).
* `resolutions`: (Array<String>) درجات الدقة المدعومة (مثل "720p", "1080p").
* `max_reference_images`: (Integer) أقصى عدد مسموح به لصور المراجع (0 إذا لم يكن مدعوماً).
* `max_reference_videos`: (Integer) أقصى عدد مسموح به لمقاطع الفيديو المرجعية.
* `max_prompt_characters`: (Integer) الحد الأقصى لطول نص البرومبت بالأحرف.
* `has_sound`: (Boolean) هل يولد الموديل مسار صوتي مدمج مع الفيديو.

##### `[NORMALIZED/DERIVED — Adapter output]` (حقول Drama الموحّدة الناتجة عن الـ Adapter):
* `supportsTextToVideo`: مشتق من `!requires_image && !requires_video`.
* `supportsImageToVideo`: مشتق من `requires_image || optional_image || max_reference_images > 0`.
* `supportsFirstFrame`: مشتق من `requires_image || optional_image`.
* `supportsLastFrame`: مشتق من `has_end_frame`.
* `supportsVideoReference`: مشتق من `requires_video || optional_video || max_reference_videos > 0`.
* `maxReferenceImages`: منقول ومطابق لـ `max_reference_images`.
* `maxReferenceVideos`: منقول ومطابق لـ `max_reference_videos`.
* `supportedDurations`: منقول ومطابق لـ `durations`.
* `supportedResolutions`: منقول ومطابق لـ `resolutions`.
* `supportedAspectRatios`: منقول ومطابق لـ `aspect_ratios`.
* `supportsNativeAudio`: منقول ومطابق لـ `has_sound`.
* `maxPromptCharacters`: منقول ومطابق لـ `max_prompt_characters`.

##### `[PHASE 2 ADD — Requires registry extension or verified provider metadata]` (إضافات Phase 2 تتطلب توسيع السجل أو بيانات مزود موثقة):
* `supportsFirstLastFrameTogether`: هل يمكن إرسال Start Frame و End Frame معاً في نفس الطلب.
* `supportsSubjectReference`: دعم تثبيت هوية الكائن/الشخصية عبر أوزان المراجع.
* `supportsCharacterReference`: دعم مخصص لتثبيت وجه وملابس الشخصية.
* `supportsMultiReference`: دعم استقبال مراجع متعددة مستقلة (شخصية + موقع + أداة).
* `supportsStyleReference`: دعم نقل وتثبيت النمط البصري فقط.
* `supportsVideoExtension`: دعم تمديد مقطع سابق من نهايته الزمنية.
* `inputCombinationRules`: مصفوفة القواعد المركبة التي تحدد توافق المدخلات المشتركة.
* `recommendedUseCases`: التوصيات الإخراجية المثلى للموديل (Dialogue, Action, Establishing, VFX).

##### `[INFRASTRUCTURE — Requires runtime/admin verification]` (حقول البنية التحتية تتطلب تحقق الأدمن والتوجيه):
* `active`: حالة تفعيل الموديل في لوحة التحكم المركزية.
* `routable`: جاهزية مسار المزود وتوفر مفاتيح الربط.
* `providerHealth`: الحالة الصحية للمزود (`Healthy`, `Degraded`, `Down`).
* `pricingPolicyId`: معرّف سياسة التسعير الحاكمة من `Pricing Constitution`.
* `providerRoute`: مسار المزود التقني الفعلي (مثل Direct API أو Gateway Canonical Route).

---

#### 2. عقد قواعد تركيب المدخلات الصارم (Strict Input Combination Rules Contract — HB3):

تم إلغاء واستبدال أي تمثيل مرن مثل `Record<string, any>` بالعقد الصارم والقابل للتحقق البرمجي التالي:

```typescript
type DramaInputKind =
  | "prompt"
  | "characterReference"
  | "subjectReference"
  | "locationReference"
  | "elementReference"
  | "styleReference"
  | "startFrame"
  | "endFrame"
  | "videoReference"
  | "previousTake";

interface DramaInputCombinationRule {
  id: string;
  mode: "allow" | "deny" | "require";
  inputs: DramaInputKind[];
  maxCounts?: {
    referenceImages?: number;
    referenceVideos?: number;
    startFrames?: number;
    endFrames?: number;
  };
  allowedDurations?: number[];
  allowedResolutions?: string[];
  requiresInputs?: DramaInputKind[];
  conflictsWith?: DramaInputKind[];
  fallbackStrategy:
    | "direct"
    | "generate-keyframe-then-video"
    | "use-approved-last-frame"
    | "switch-model"
    | "reject";
  source:
    | "provider-documentation"
    | "provider-runtime"
    | "admin-override";
  verifiedAt?: string;
  notes?: string;
}
```

##### الحالات التشغيلية التي يديرها هذا العقد:
1. **المراجع مسموحة وحدها**: `mode: "allow", inputs: ["prompt", "characterReference", "locationReference"]`.
2. **Start + End مسموحان معاً**: `mode: "allow", inputs: ["prompt", "startFrame", "endFrame"]`.
3. **تعارض المراجع مع Start/End في نفس الطلب**: `mode: "deny", inputs: ["characterReference", "startFrame"], fallbackStrategy: "generate-keyframe-then-video"`.
4. **اشتراط Start Frame لاستخدام End Frame**: `mode: "require", inputs: ["endFrame"], requiresInputs: ["startFrame"]`.
5. **اشتراط Previous Take لـ Video Extension**: `mode: "require", inputs: ["videoReference"], requiresInputs: ["previousTake"]`.
6. **قيود الدقة/المدة مع مدخلات معينة**: تحديد `allowedDurations` أو `allowedResolutions` الحصرية لتركيبة معينة من المدخلات.

---

#### 3. قاعدة حظر استنتاج القدرات من اسم الموديل (Strict Non-Heuristic Policy — HB4):

> **قاعدة ملزمة وحاكمة:**  
> لا يجوز لـ Drama Studio استنتاج قدرات Seedance أو Kling أو MiniMax H3 أو Gemini Omni أو Wan أو أي موديل آخر من اسم العائلة أو الإصدار. كل Provider Route أو Model Variant يمتلك Capability Record مستقلاً، وتُعرض القدرات والأسعار والحالة من Admin Registry و Routing و Pricing فقط.  
> الموديلات الظاهرة في الأدمن تبقى مرشحة ديناميكياً، لكن لا تُنسب إليها قدرات Reference أو Start/End أو Video Extension من دون دليل Registry أو Provider Runtime موثّق.

---

### هـ) محرك اختيار النماذج والتسعير المتسلسل (Model Selection & Pricing Pipeline)

يتبع النظام الترتيب المتسلسل الصارم التالي في كل عملية توليد:

```text
1. Shot Requirements (تحليل متطلبات اللقطة: شخصيات، حركة، موقع، بداية/نهاية)
   │
   ▼
2. Required Capability Set (تحديد حزمة القدرات الإلزامية)
   │
   ▼
3. Registry Adapter (قراءة السجل الفعلي وتحويله عبر الـ Adapter)
   │
   ▼
4. Active/Routable Model Filtering (فلترة النماذج النشطة والمفعلة والجاهزة)
   │
   ▼
5. Input Combination Validation (التحقق من قواعد تركيب المدخلات عبر inputCombinationRules)
   │
   ▼
6. Provider Health Check (فحص الحالة التشغيلية للمزود واستبعاد المنقطع)
   │
   ▼
7. Dynamic Quote (طلب تسعير ديناميكي حي من Pricing Constitution)
   │
   ▼
8. Recommended Model + Alternatives (عرض الموديل الموصى به والبدائل المتاحة)
   │
   ▼
9. User Confirmation (موافقة المستخدم وحجز الرصيد في MDL-03)
   │
   ▼
10. Credit Reservation (حجز الرصيد الفعلي في Ledger)
    │
    ▼
11. Generation Execution (تنفيذ التوليد عبر المسار المباشر أو Multi-Step Fallback)
    │
    ▼
12. Continuity QC (فحص الاستمرارية للأبعاد السبعة)
    │
    ▼
13. Take Approval (اعتماد اللقطة وحفظ الإطار الأخير للقطة التالية)
    │
    ▼
14. Cost Reconciliation (التسوية المالية النهائية وإصدار إيصال MDL-11)
```

* **مرونة تثبيت الموديل داخل المشهد (Scene Model Pinning Policy):** تثبيت الموديل داخل لقطات المشهد الواحد هو تفضيل لتقليل الانحراف اللوني والبصري، وليس قيداً مطلقاً. يمكن للنظام أو المستخدم تغيير الموديل داخل المشهد عند عدم دعم القدرات للقطة معينة أو حدوث عطل في المزود أو تجاوز التكلفة، مع تشغيل فحص الاستمرارية `Continuity QC` وإعادة احتساب الـ Quote تلقائياً قبل التوليد.
* **دور موديلات الصور (Nano Banana, GPT Image, Seedream):** لا تُنشئ الحلقات مباشرة؛ بل تُنشئ وتُعدل الأصول الرسمية، بورتريهات الشخصيات، البيئات، الأدوات، الستوريبورد، وإطارات الـ Start/End Keyframes.

---

## 5. الحصر المعماري للرسومات المعتمدة (Canonical Wireframe Inventory — 34 Wireframes)

جميع الملفات الـ 34 التالية منشأة فعلياً ومحفوظة بصيغة SVG قياسية داخل المجلد:  
📁 `docs/drama-studio/design/gate-b/wireframes/`

| المعرّف المعماري | اسم ملف الـ SVG المعتمد | الوصف المعماري والشاشة المغطاة |
| :--- | :--- | :--- |
| **`SCR-01`** | `SCR-01_hero_launcher.svg` | صفحة البداية المقفولة مع امتداد مشغل المشاريع (New, Open, Recent, All, Featured Showcase) |
| **`SCR-02`** | `SCR-02_workbench_shell.svg` | هيكل مساحة العمل الإدارية بالتوزيع المكاني الثابت (42% لوحة الوكيل / 58% مساحة العمل) |
| **`SCR-02A`**| `SCR-02A_workbench_settings.svg` | التبويب 1 الإعدادات، التموضع الإبداعي، أنماط المعالجة، وشبكة الستايلات البصرية الـ 16 |
| **`SCR-02B`**| `SCR-02B_workbench_outline.svg` | التبويب 2 المخطط المشهدي، بطاقة الحلقة بحقولها الـ 8، المدد الخمس، وهرمية المشاهد و Beats |
| **`SCR-02C`**| `SCR-02C_workbench_characters.svg` | التبويب 3 الشخصيات، بطاقات الأصول، بصمات الصوت المرجعية، وضبط الاستمرارية |
| **`SCR-02D`**| `SCR-02D_workbench_locations.svg` | التبويب 4 المواقع والبيئات، الإضاءة المرجعية، الطقس، والتوزيع المكاني |
| **`SCR-02E`**| `SCR-02E_workbench_elements.svg` | التبويب 5 الأدوات والعناصر، المركبات، الأسلحة، وتتبع ملكية الأداة وحالتها |
| **`SCR-03`** | `SCR-03_production_studio.svg` | غرفة الإنتاج السينمائي الرئيسية (المحرر، المشغل، شريط Takes، والتايم لاين) |
| **`SCR-04`** | `SCR-04_shared_project_board.svg` | اللوحة المشتركة بالمنصة مرتبطة بسياق `projectId` وعقد المشاهد والأصول |
| **`STA-01`** | `STA-01_preparing_state.svg` | الحالة الانتقالية المؤقتة لمعالجة الفكرة وتحميل مسودة العمل للمشروع |
| **`SUB-01`** | `SUB-01_assembly_export_stage.svg` | مرحلة التجميع الداخلي السبع (Normalize ──► Trim ──► Cuts ──► Mix ──► Captions ──► Render) |
| **`PNL-01`** | `PNL-01_agent_panel_conversation.svg` | لوحة محادثة مخرج سعد ستوديو الحية مع حقل الإدخال المثبت وحالة الاتصال |
| **`PNL-02`** | `PNL-02_memory_drawer_9layers.svg` | درج ذاكرة المشروع المكون من 9 طبقات سيادية مرتبطة بـ `projectId` |
| **`PNL-03`** | `PNL-03_creative_tools_rail.svg` | سكة الأدوات الإبداعية التسع مع خيارات Scope و Pin و Inheritance و Override |
| **`PNL-04`** | `PNL-04_continuity_inspector.svg` | مفتش الاستمرارية للأبعاد السبعة (Flyout Drawer مع إمكانية التثبيت Pin) |
| **`PNL-05A`**| `PNL-05A_storyboard_keyframes_strip.svg`| شريط الستوريبورد المدمج القابل للطي فوق التايم لاين (Keyframes Only Mode) |
| **`PNL-05B`**| `PNL-05B_storyboard_full_workspace.svg` | مساحة الستوريبورد الموسعة داخل غرفة الإنتاج (Full Storyboard Mode) |
| **`PNL-06A`**| `PNL-06A_timeline_hierarchy.svg` | التايم لاين الهرمي LTR (Episodes ──► Scenes ──► Beats ──► Shots ──► Blocks ──► Takes) |
| **`PNL-06B`**| `PNL-06B_timeline_audio_tracks.svg` | المسارات الصوتية السبعة المخصصة LTR (Dialogue, VO, Voice ID, Ambient, SFX, Music, Captions) |
| **`PNL-07`** | `PNL-07_project_switcher_header.svg` | مبدل المشاريع في الهيدر مع مؤشرات المهام الجارية في الخلفية وحالة الحفظ |
| **`PNL-08`** | `PNL-08_credit_cost_inspector.svg` | مفتش الكريدت والتكلفة ومراقبة سقف المشروع وسجل المعاملات المالية |
| **`MDL-01`** | `MDL-01_proposal_diff_card.svg` | بطاقة اقتراح التعديل المشهدي (Before / After / Scope / Cost / Continuity Diff) |
| **`MDL-02`** | `MDL-02_prompt_format_switch.svg` | نافذة تغيير صيغة البرومبت (Natural, Storyboard, Script) وتحديد نطاق التوليد |
| **`MDL-03`** | `MDL-03_credit_quote_confirm.svg` | نافذة تأكيد الـ Quote وحجز الرصيد وتفصيل التكلفة الديناميكي قبل التوليد |
| **`MDL-04`** | `MDL-04_invalid_selector_resolver.svg` | نافذة حل تعارض النماذج والأبعاد والمدد غير المدعومة من الموديل المختار |
| **`MDL-05`** | `MDL-05_take_version_comparison.svg` | نافذة مقارنة المحاولات والنسخ جنباً إلى جنب واعتماد النسخة النشطة |
| **`MDL-06`** | `MDL-06_new_project_modal.svg` | نافذة إنشاء مشروع جديد والتحقق من الاسم ونوع العمل واللغة والنسبة وتعيين `projectId` |
| **`MDL-07`** | `MDL-07_all_projects_overlay.svg` | أوفرلاي تصفح وبحث وفلترة كافة المشاريع مع الحالات والأرشفة وسلة المحذوفات |
| **`MDL-08`** | `MDL-08_save_copy_as_modal.svg` | نافذة حفظ نسخة مستقلة بـ `projectId` جديد وسجل تكلفة نظيف |
| **`MDL-09`** | `MDL-09_conflict_resolver_modal.svg` | نافذة حل تعارض الحفظ المتزامن بين الجلسات والأجهزة المختلفة |
| **`MDL-10`** | `MDL-10_archive_delete_modal.svg` | نافذة تأكيد الأرشفة والحذف المرن والاستعادة وفق سياسة المنصة المركزية |
| **`MDL-11`** | `MDL-11_completion_receipt_modal.svg` | إيصال اكتمال العملية والتسوية المالية والاسترداد التلقائي وسجل التدقيق |
| **`CMP-01`** | `CMP-01_project_card_states.svg` | الحالات الـ 8 لبطاقة المشروع (Draft, Planning, Production, Review, Completed, Autosaving, Conflict, Archived) |
| **`SYS-01`** | `SYS-01_responsive_comparison.svg` | مقارنة استجابة الشاشات على قياسات Desktop: `1280px` و `1440px` و `1920px` |

---

## 6. التدفقات الإجرائية العشرة (The 10 Wireflows)

### 🔄 Flow 1: إنشاء مشروع جديد (New Project Creation)
`Hero (SCR-01) ──► New Project (MDL-06) ──► Preparing State (STA-01) ──► Workbench (SCR-02) ──► Autosave Saved`

### 🔄 Flow 2: إغلاق وفتح مشروع سابق واستعادة حالته الدقيقة (Restore Exact State)
`Exit Platform ──► Recent Projects (SCR-01) / All Projects (MDL-07) ──► Select Project ──► Restore Exact State (Tabs, Playhead, Pinned Tools, Memory)`

### 🔄 Flow 3: تبديل المشاريع في الهيدر مع مهام جارية في الخلفية (Project Switcher & BG Jobs)
`Project A (SCR-03) ──► Project Switcher (PNL-07) ──► Select Project B (Shows BG Job Running) ──► Switch Context Seamlessly`

### 🔄 Flow 4: حفظ نسخة كـمشروع مستقل (Save a Copy As)
`Project Menu ──► Save a Copy As (MDL-08) ──► Enter New Title ──► System Provisions New projectId & Fresh Ledger`

### 🔄 Flow 5: تدرج وتعيين بوستر المشروع (Poster Evolution)
`New Project (Source: Placeholder) ──► First Approved Take/Frame (Source: Auto) ──► User Override (Source: Uploaded / Selected Frame)`

### 🔄 Flow 6: توليد مدفوع ناجح والتسوية المالية (Successful Paid Generation with Hybrid Engine)
`Configure Shot (SCR-03) ──► Assemble Ref Packet + Start Frame ──► Credit Quote (MDL-03) ──► Confirm & Reserve ──► Generate Take ──► Reconcile ──► Charge ──► Receipt (MDL-11)`

### 🔄 Flow 7: فشل التوليد والاسترداد التلقائي (Failed Generation & Auto-Refund)
`Reserve Credits ──► Job Fails (Provider Timeout) ──► Auto-Reversal (+Credits Refunded) ──► Retry Unit Only (MDL-11 State)`

### 🔄 Flow 8: الـ Quote القديمة وإعادة التسعير التلقائي (Stale Quote & Requote)
`Quote Ready ──► User Changes Duration/Model ──► Quote Stale ──► Requote Engine Queries Central Registry ──► Confirm Updated Quote`

### 🔄 Flow 9: رصيد غير كافٍ وسقف المشروع (Insufficient Credits & Cap Block)
`Calculate Quote ──► Balance / Cap Insufficient ──► Confirm Button Disabled ──► Add Credits / Adjust Generation Scope`

### 🔄 Flow 10: تعارض الحفظ المتزامن بين جهازين (Multi-Session Conflict Resolution)
`Local Autosave Buffer Active ──► Cloud Version Incremented from Another Session ──► Conflict Modal (MDL-09) ──► Load Cloud / Keep Local / Save Copy`

---

## 7. مصفوفة التغطية الشاملة (Coverage Matrix — 34/34 100% Coverage)

| المتطلب المعماري | العنصر / الشاشة | ملف الـ SVG المقابل | الحالة المغطاة | التدفق | حالة القبول |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Hero Project Launcher** | `SCR-01` | `SCR-01_hero_launcher.svg` | Active, Recent, No Projects | Flow 1, 2 | **PASS ✓** |
| **Workbench Shell Layout**| `SCR-02` | `SCR-02_workbench_shell.svg` | 42% Agent / 58% Workspace | Flow 1, 2 | **PASS ✓** |
| **Settings & Positioning** | `SCR-02A` | `SCR-02A_workbench_settings.svg` | Positioning, 16 Styles, Modes | Flow 1 | **PASS ✓** |
| **Outline & 5 Durations** | `SCR-02B` | `SCR-02B_workbench_outline.svg` | 8 Ep Fields, 5 Durations | Flow 1, 2 | **PASS ✓** |
| **Characters Cast & Voice** | `SCR-02C` | `SCR-02C_workbench_characters.svg` | Voice Ref, Cast Profile, Seed | Flow 1 | **PASS ✓** |
| **Locations & Light Model**| `SCR-02D` | `SCR-02D_workbench_locations.svg` | Lighting, Weather, Spatial | Flow 1 | **PASS ✓** |
| **Elements & Props Track** | `SCR-02E` | `SCR-02E_workbench_elements.svg` | Ownership, Prop State, Asset | Flow 1 | **PASS ✓** |
| **Production Main Stage** | `SCR-03` | `SCR-03_production_studio.svg` | Editor, Player, Takes Strip | Flow 6, 7, 8 | **PASS ✓** |
| **Shared Project Board** | `SCR-04` | `SCR-04_shared_project_board.svg` | Canvas linked by projectId | Flow 1, 3 | **PASS ✓** |
| **Preparing Transition** | `STA-01` | `STA-01_preparing_state.svg` | Ingest, Calibrate, Cancel | Flow 1 | **PASS ✓** |
| **7-Step Assembly Stage** | `SUB-01` | `SUB-01_assembly_export_stage.svg` | Normalize, Trim, Mix, Render | Flow 6 | **PASS ✓** |
| **Agent Chat Panel** | `PNL-01` | `PNL-01_agent_panel_conversation.svg`| Connected, Typing, Composer | Flow 1 | **PASS ✓** |
| **9-Layer Memory Drawer** | `PNL-02` | `PNL-02_memory_drawer_9layers.svg` | 9 Layers, Sovereignty | Flow 1, 2 | **PASS ✓** |
| **9 Creative Tools Rail** | `PNL-03` | `PNL-03_creative_tools_rail.svg` | Scope, Pin, Inherit, Override | Flow 6 | **PASS ✓** |
| **Continuity Inspector (7)**| `PNL-04` | `PNL-04_continuity_inspector.svg` | Flyout, Pinned, 7 Tracks | Flow 6, 7 | **PASS ✓** |
| **Storyboard Keyframes** | `PNL-05A` | `PNL-05A_storyboard_keyframes_strip.svg`| Keyframes Strip over Timeline | Flow 5, 6 | **PASS ✓** |
| **Storyboard Workspace** | `PNL-05B` | `PNL-05B_storyboard_full_workspace.svg`| Full Grid Workspace inside Prod | Flow 5, 6 | **PASS ✓** |
| **Timeline Hierarchy** | `PNL-06A` | `PNL-06A_timeline_hierarchy.svg` | Hierarchy LTR (Scene/Beat/Shot)| Flow 6, 7 | **PASS ✓** |
| **7 Dedicated Audio Lanes** | `PNL-06B` | `PNL-06B_timeline_audio_tracks.svg` | Dialogue, VO, Voice, SFX, Music | Flow 6, 7 | **PASS ✓** |
| **Project Switcher & Jobs** | `PNL-07` | `PNL-07_project_switcher_header.svg`| Switch, Search, BG Jobs Alert | Flow 3 | **PASS ✓** |
| **Credit Cost Inspector** | `PNL-08` | `PNL-08_credit_cost_inspector.svg` | Live Cap, Ledger Sync | Flow 6, 8, 9 | **PASS ✓** |
| **Proposal Diff Card** | `MDL-01` | `MDL-01_proposal_diff_card.svg` | Before/After/Scope/Cost Diff | Flow 1 | **PASS ✓** |
| **Prompt Format Switch** | `MDL-02` | `MDL-02_prompt_format_switch.svg` | 3 Formats, Rebuild Scope | Flow 6 | **PASS ✓** |
| **Pre-gen Quote Confirm** | `MDL-03` | `MDL-03_credit_quote_confirm.svg` | Dynamic Breakdown, Reserve | Flow 6, 8, 9 | **PASS ✓** |
| **Invalid Selector Resolver**| `MDL-04` | `MDL-04_invalid_selector_resolver.svg`| Cascade Fallback Alternatives | Flow 8 | **PASS ✓** |
| **Take Comparison Modal** | `MDL-05` | `MDL-05_take_version_comparison.svg` | Side-by-Side Video Compare | Flow 6 | **PASS ✓** |
| **New Project Modal** | `MDL-06` | `MDL-06_new_project_modal.svg` | Name Validated, Structure, Lang| Flow 1 | **PASS ✓** |
| **All Projects Overlay** | `MDL-07` | `MDL-07_all_projects_overlay.svg` | Grid/List, Filters, Search | Flow 2 | **PASS ✓** |
| **Save Copy As Modal** | `MDL-08` | `MDL-08_save_copy_as_modal.svg` | New ProjectId, Fresh Ledger | Flow 4 | **PASS ✓** |
| **Save Conflict Resolver** | `MDL-09` | `MDL-09_conflict_resolver_modal.svg`| Local vs Cloud 3 Pathways | Flow 10 | **PASS ✓** |
| **Archive & Delete Modal** | `MDL-10` | `MDL-10_archive_delete_modal.svg` | Dynamic Policy Retention | Flow 4 | **PASS ✓** |
| **Completion Receipt** | `MDL-11` | `MDL-11_completion_receipt_modal.svg`| Charged, Refund State, Audit | Flow 6, 7 | **PASS ✓** |
| **Project Card States (8)** | `CMP-01` | `CMP-01_project_card_states.svg` | 8 Operational & Edge States | Flow 1-10 | **PASS ✓** |
| **Responsive Breakpoints** | `SYS-01` | `SYS-01_responsive_comparison.svg` | 1280px, 1440px, 1920px (Desktop)| Flow 1-10 | **PASS ✓** |

---

## 8. مصفوفة الحالات ومصفوفة الفراغ (State & Empty State Matrices)

### أ) مصفوفة حالات النظام والبيانات (State Matrix)
```text
┌──────────────────────┬────────────────────────────────────────────────────────┬──────────────────────────────────────────┬────────────────────────┐
│ State Identifier     │ Visual UI Manifestation & User Presentation            │ Available Primary / Secondary Action     │ Financial & Audit Hook │
├──────────────────────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────┼────────────────────────┤
│ Draft Project        │ "Project in draft state. Brief not approved yet."      │ [ Edit Brief ] [ Approve Snapshot ]      │ Spent: 0 Cr            │
│ Planning Active      │ "Script & Beat breakdown in progress."                 │ [ Split Scene ] [ Review Pacing ]        │ Spent: 0 Cr            │
│ In Production        │ "Takes generation active on Shot 03 (Block 1.3)."      │ [ View Progress ] [ Cancel Take Job ]    │ Reserved: 12 Cr        │
│ Quote Stale          │ "Parameter changed. Live Quote invalidated."           │ [ Re-calculate Live Quote (Requote) ]    │ Auto-invalidated       │
│ Insufficient Credits │ "User balance (15 Cr) below operation quote (50 Cr)."  │ [ 💳 Add Credits ] [ Adjust Scope ]      │ Action Blocked         │
│ Job Failed & Refund  │ "Provider Timeout on Block 1.4. Full refund credited." │ [ 🔁 Retry Block Only ] [ Switch Model ] │ Auto-Reversed (+12 Cr) │
│ Concurrent Conflict  │ "Modified from another device 2m ago."                 │ [ Load Server v1.4 ] [ Keep Local ]      │ Audit Logged           │
│ Archived Project     │ "Project archived. Read-only access."                  │ [ Restore Project ] [ View Master ]      │ Read-Only              │
└──────────────────────┴────────────────────────────────────────────────────────┴──────────────────────────────────────────┴────────────────────────┘
```

### ب) مصفوفة حالات الفراغ (Empty State Matrix)
```text
┌──────────────────────────────┬────────────────────────────────────────────────────────┬──────────────────────────────────────────┐
│ Screen / Component           │ Empty State Message & Visual Guidance                  │ Direct Primary Call-to-Action            │
├──────────────────────────────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────┤
│ Hero Recent Projects (No Proj)│ "لم تقم بإنشاء أي مشروع بعد في استوديو الدراما."       │ [ + إنشاء أول مشروع لك الآن ]            │
│ All Projects Filter (Empty)  │ "لا توجد مشاريع تطابق معايير البحث والفلترة المحددة."   │ [ مسح الفلاتر ]  [ إنشاء مشروع جديد ]     │
│ Settings (Unconfigured)      │ "لم يتم ضبط إعدادات المشروع بعد. اختر النمط والأبعاد..."│ [ اعتماد إعدادات المشروع ]               │
│ Outline (No Scenes)          │ "المخطط الدرامي فارغ. اكتب فكرة أو اطلب من المخرج..."  │ [ 🎬 اطلب من المخرج بناء المخطط ]        │
│ Cast (No Characters)         │ "لم تتم إضافة شخصيات رئيسية للمشروع حتى الآن."         │ [ + إضافة شخصية جديدة ]  [ استيراد ]      │
│ Locations (No Environments)  │ "لا توجد مواقع تصوير مسجلة للمشهد الحالي."              │ [ + إضافة موقع وتحديد الإضاءة ]          │
│ Elements (No Props)          │ "لا توجد أدوات أو عناصر مميزة مرتبطة بالشخصيات."        │ [ + إضافة أداة / مركبة / سلاح ]          │
│ Storyboard (No Storyboard)   │ "وضع الستوريبورد معطل لتسريع الإنتاج وتوفير الكريدت."   │ [ تفعيل إطارات Keyframes اختيارياً ]     │
│ Takes (Before Generation)    │ "لم يتم توليد أي لقطة (Take) بعد لهذا المقطع."           │ [ 🎬 احسب التكلفة وابدأ التوليد ]        │
│ Timeline (Before Planning)   │ "التايم لاين بانتظار اعتماد المخطط وتقسيم المشاهد."     │ [ تقسيم المشهد إلى Beats و Shots ]       │
└──────────────────────────────┴────────────────────────────────────────────────────────┴──────────────────────────────────────────┘
```

---

## 9. الأمور غير المحسومة تقنياً والمحفوظة للمالك (`[غير محسوم]`)

1. **مدة استعادة المشاريع المحذوفة (`Soft-Delete Retention Period`)**: تترك لسياسة الإدارة المركزية في المنصة ولا يُثبت رقم 30 يوماً داخل التصميم.
2. **محرك مزامنة الجلسات المتزامنة (`Multi-Session Sync Engine`)**: هل يعتمد WebSocket أم SSE أم Polling؛ تم تصميم واجهة التعارض (`MDL-09`) كعقد UX مستقل عن بروتوكول النقل.
3. **تنسيقات التصدير النهائية ومحددات الكودك (`Export Codecs & Containers`)**: ستُقرأ ديناميكياً من محرك الرندر المركزي في لوحة الإدارة عند تنفيذ Phase 6.

---

## 10. قائمة التحقق لاعتماد Gate B v2 (Final Master Acceptance Checklist)

- [x] **المحرك الهجين (Reference + Start/End)**: تم توثيق منظومة المدخلات السبعة ومصفوفة استراتيجية اللقطات ومسار التوليد متعدد المراحل وسجل الأدمن بدقة كاملة.
- [x] **تطابق الـ Inventory والرسومات (34/34)**: تم إنشاء 34 ملف SVG فعلياً داخل `wireframes/` مطابقة للـ Canonical Inventory بنسبة 100%.
- [x] **إزالة تعارض الأرقام**: تم اعتماد التسمية الدلالية المعمارية (`SCR-xx`, `STA-xx`, `SUB-xx`, `PNL-xx`, `MDL-xx`, `CMP-xx`, `SYS-xx`) بدون أي تكرار.
- [x] **تصحيح الـ Tokens**: تم حذف جميع قيم Hex من الوثيقة النصية واستخدام أسماء الـ Tokens الرسمية فقط (`--ss-bg`, `--ss-card`, `--ss-cyan`, `--ss-violet`, `--ss-amber`).
- [x] **نظام المشاريع الكامل**: تم توثيق ورسم `Project Launcher`، `New Project Modal`، `All Projects Overlay`، `Project Switcher`، `Save Copy As`، `Conflict Resolver`، وتدرج البوستر.
- [x] **نظام الكريدت والتسعير**: تم توثيق ورسم `Credit Quote & Cost Inspector`، تفصيل التكلفة الديناميكي، دورة الكريدت، وإيصال اكتمال العملية مع الاسترداد التلقائي.
- [x] **التدفقات الـ 10**: تم توثيق التدفقات الإجرائية العشرة كاملة وربطها بالملفات المعتمدة.
- [x] **حظر التعديل البرمجي**: لم يتم تعديل أي ملف كود تطبيقي (React, TSX, CSS, API, Prisma, Navigation).
- [x] **حظر Gate C**: لم يبدأ Gate C (High-Fidelity) نهائياً والعمل متوقف تماماً بانتظار المراجعة والاعتماد الصريح.
