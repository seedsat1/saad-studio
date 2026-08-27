# Gate C.2 — Complete High-Fidelity Design & UX Specification

**Document Version:** 2.0 (Complete 34/34 Canonical High-Fidelity Coverage)  
**Role:** Lead Product Designer & UX Architect  
**Platform:** Saad Studio (AI Microdrama & Long-form Film Production Platform)  
**Visual Direction:** `Cinematic Director Workspace`  
**Status:** Gate C.2 Complete & Verified (34/34 Coverage) | Codex Handoff Ready | Code Implementation Strictly Blocked  

---

## 1. الثوابت البصرية ونظام الـ Tokens الحاكم (Design Tokens Authority)

تلتزم شاشات ومكونات High-Fidelity بنظام Tokens سعد ستوديو الرسمي الموجود في `app/globals.css`، مع تصنيف الألوان الدلالية بدقة:

### أ) الـ Tokens الأساسية المعتمدة رسمياً في `globals.css`:
* **`--ss-bg`**: لون الخلفية الأساسي لمساحة العمل السينمائية الداكنة.
* **`--ss-card`**: لون أسطح البطاقات والحاويات والقوائم المنسدلة.
* **`--ss-card-hover`**: لون السطح عند التحويم والتفاعل الأولي.
* **`--ss-border`**: لون الحدود والفواصل الهيكلية.
* **`--ss-cyan`**: لون الإجراءات الأساسية (Primary Actions)، الأزرار الفعالة، والتبويبات النشطة.
* **`--ss-violet`**: لون وكيل الإخراج (Director AI Agent)، توليد الذكاء الاصطناعي، وطبقات الذاكرة الـ 9.
* **`--ss-amber`**: لون دلالي مخصص حصرياً للتحذيرات التشغيلية، ومشاكل الاستمرارية، وتعارض الحفظ المتزامن، وتحديث الـ Quotes القديمة.
* **`--ss-text`**: لون النصوص الأساسية.
* **`--ss-muted`**: لون النصوص الثانوية والملاحظات الوصفية.

### ب) الـ Tokens المقترحة للمرحلة القادمة:
* `[PROPOSED TOKEN — PHASE 2 APPROVAL REQUIRED]`: **`--ss-green`** لحالات الاعتماد واكتمال الاسترداد المالي المكتمل.
* `[PROPOSED TOKEN — PHASE 2 APPROVAL REQUIRED]`: **`--ss-red`** للأخطاء المانعة وانقطاع المزود الحرج.

---

## 2. الهيكل المكاني وثنائية اللغة (Desktop-First Spatial Grid & Language Duality)

```text
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ TopNavbar (Platform Master Header - Unchanged)                                                           [💳 1,250 Cr] │
├────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Drama Header: [🎬 Shadows of Riyadh ▾] [✓ Autosave: Saved] [Snapshot #14]                [🎨 Shared Board] [🎬 Production ➔]│
├──────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Left Column (40–42% Fixed): Director Agent Panel     │ Right Column (58–60% Fixed): Management Workspace & Tabs        │
│ • Chat Header & Connection Status                   │ • 5 Management Tabs:                                            │
│ • Stream of Conversational Messages                  │   1. Settings (Visual Style Grid 16, Treatment Modes)           │
│ • Proposal Diff Card (MDL-01: Before/After/Scope)    │   2. Outline & Script (8 Episode Fields, 5 Durations, Beats)    │
│ • 9-Layer Project Memory Drawer                      │   3. Characters (Cast Profiles, Voice ID, Seed Locks)           │
│ • Pinned Bottom Composer (Fixed Input + Actions)     │   4. Locations (Lighting Models, Weather, Spatial Layout)       │
│                                                      │   5. Elements (Props, Vehicles, Weapons, Ownership Track)       │
└──────────────────────────────────────────────────────┴─────────────────────────────────────────────────────────────────┘
```

### قواعد ثنائية اللغة وعدم انقلاب الأعمدة:
1. **ثبات الأعمدة (40–42% يساراً / 58–60% يميناً):** الوكيل دائماً في الجهة اليسرى ومساحة العمل دائماً في الجهة اليمنى في كل من الواجهتين العربية والإنجليزية.
2. **اتجاه النصوص الداخلية:**
   - **الواجهة العربية:** النص العربي يتبع محاذاة RTL داخل مكوناته وبطاقاته، دون أي انعكاس للهيكل المكاني العام للأعمدة.
   - **الواجهة الإنجليزية:** النص الإنجليزي يتبع محاذاة LTR داخل مكوناته.
3. **التايم لاين والتسلسل الزمني:** يظل التايم لاين وتتابع المشاهد واللقطات دائماً من اليسار إلى اليمين (LTR) في اللغتين لكونه يمثل تسلسلاً زمنياً فيزيائياً.
4. **التجاوب (Responsive Breakpoints):**
   - **`1440px` (الأساس المعتمد):** عرض كامل، توزيع مثالي للأعمدة والمسارات الصوتية.
   - **`1280px`:** انكماش مرن للهوامش الداخلية وتبسيط مؤشرات التايم لاين مع بقاء العمودين ظاهرين.
   - **`1920px`:** توسيع منطقة المعاينة الفيديو ومساحة الستوريبورد دون تجاوز الحد الأقصى لعرض النصوص لمنع تشتت القراءة.

---

## 3. مساحات المنتج الأربع (The 4 Core Spaces)

1. **`SCR-01: Drama Studio Entry & Project Launcher` (`/drama-studio`)**:
   - قسم الـ Hero المقفول والمعتمد.
   - امتداد `Project Launcher Extension` لإطلاق المشاريع الجديدة (`MDL-06`)، واستعراض المشاريع الحديثة (`Recent Projects`)، وفتح أوفرلاي كافة المشاريع (`MDL-07`).
2. **`SCR-02: Drama Workbench` (`/drama-studio/[projectId]`)**:
   - مساحة العمل الإدارية والإخراجية الرئيسية لإدارة القصة والشخصيات والأصول بالتنسيق مع مخرج الذكاء الاصطناعي.
3. **`SCR-03: Video Production Studio` (`/drama-studio/[projectId]/episodes/[episodeId]/production`)**:
   - غرفة الإنتاج السينمائي المتخصصة في إعداد حزم المراجع، توليد اللقطات، مراجعة الـ Takes، وإدارة التايم لاين الهرمي والمسارات الصوتية السبعة.
4. **`SCR-04: Shared Project Board` (`/cinema-board?projectId=...`)**:
   - مساحة اللوحة البيضاء الحرة المشتركة على مستوى المنصة مرتبطة بسياق `projectId`.

---

## 4. تبويبات الإدارة الخمسة (The 5 Management Tabs in Workbench)

1. **`SCR-02A: Settings Tab`**:
   - التموضع الإبداعي ونمط المعالجة السردية الثلاثي (`Faithful`, `Balanced`, `Creative`).
   - شبكة الستايلات البصرية الـ 16 (Cyberpunk Noir, Desert Realism, Historical Epic, Anime Cinematic, إلخ).
2. **`SCR-02B: Outline & Script Tab`**:
   - بطاقة الحلقة وحقولها الـ 8 (Title, Logline, Synopsis, Pacing, Key Conflict, Cliffhanger, Tone, Target Duration).
   - مفاهيم المدد الخمسة الثابتة (`Target Duration`, `Planned Duration`, `Generated Duration`, `Approved Duration`, `Final Duration`).
3. **`SCR-02C: Characters Tab`**:
   - بطاقات كادر الشخصيات (Cast Profiles)، وصف الملامح، الملابس، بصمة الصوت المرجعية (Voice ID)، وقفل الـ Seed للاستمرارية.
4. **`SCR-02D: Locations Tab`**:
   - بيئات التصوير، المخطط المكاني، نمط الإضاءة السينمائية (Key/Fill/Rim)، والطقس والزمن.
5. **`SCR-02E: Elements Tab`**:
   - الأدوات المحورية (Props)، المركبات، والأسلحة، وتتبع ملكيتها وحالتها الفيزيائية عبر المشاهد.

---

## 5. سكة الأدوات الإبداعية التسع وأوضاع الستوريبورد (Creative Tools & Storyboard Modes)

* **الأدوات التسع (`PNL-03`):** `Style` • `Character` • `Element` • `Location` • `Color` • `Effects` • `Camera` • `Sketch` • `Storyboard`.
* **نطاق وقواعد الأدوات:** دعم Scope (`Project`, `Season`, `Episode`, `Scene`, `Shot`), و Pinning, و Inheritance, و Override.
* **أوضاع الستوريبورد الثلاثة:**
  1. `No Storyboard`: وضع سريع يسمح بالانتقال المباشر إلى الإنتاج لتوفير التكلفة.
  2. `Keyframes Only`: توليد إطارات مفتاحية للقطات الرئيسية فقط (`PNL-05A`).
  3. `Full Storyboard`: مساحة شبكية كاملة للقطات والتسلسلات المشهدية (`PNL-05B`).

---

## 6. المحرك الهجين وسجل النماذج المركزي (Hybrid Generation & Model Registry Contract)

* **المنظومة الهجينة المعتمدة:**
  `Reference-First (Character, Location, Element, Style)` + `Start Frame (Last Approved Take)` + `End Frame (Target Keyframe)` + `Previous Take (Video Extension)`.
* **مسار الـ Multi-Step Fallback:** عند قيود المزود وعدم دعم الجمع في طلب واحد، يتم توليد Keyframe مضبوط بالمراجع أولاً عبر موديل صور رسمي، ثم تمريره كـ Start Frame لموديل الفيديو.
* **عقد مواءمة السجل (Registry Normalization Layer):**
  - **`[EXISTS]`**: `requires_image`, `optional_image`, `requires_video`, `optional_video`, `has_end_frame`, `aspect_ratios`, `durations`, `resolutions`, `max_reference_images`, `max_reference_videos`, `max_prompt_characters`, `has_sound`.
  - **`[NORMALIZED/DERIVED]`**: اشتقاق القدرات الأربع الصارم:
    - `supportsTextToVideo = !requires_image && !requires_video`
    - `supportsImageToVideo = requires_image || optional_image || max_reference_images > 0`
    - `supportsFirstFrame = requires_image || optional_image`
    - `supportsVideoReference = requires_video || optional_video || max_reference_videos > 0`
  - **قواعد التركيب الصارمة (`DramaInputCombinationRule[]`)**: حظر `Record<string, any>` واعتماد قواعد صلبة قابلة للتحقق.
  - **حظر الاستنتاج الاسمي:** حظر استنتاج أي قدرة من اسم الموديل والاعتماد حصرياً على سجل الأدمن.

---

## 7. نظام الكريدت والتسعير الديناميكي (Dynamic Credit Quote & Reconciliation)

* **تفصيل التكلفة الديناميكي (Dynamic Itemized Breakdown):** يعرض فقط البنود المنطبقة على اللقطة الحالية دون فرض عدد بنود جامد.
* **دورة حياة الكريدت:**
  $$\text{Dynamic Quote} \longrightarrow \text{Confirm \& Reserve (MDL-03)} \longrightarrow \text{Generate} \longrightarrow \text{Reconcile} \longrightarrow \text{Charge / Auto-Refund (MDL-11)}$$
* **إعادة التسعير الفورية (Requote Engine):** تتغير الـ Quote وتصبح `Stale` تلقائياً عند تعديل أي مدخلات، مما يستلزم إعادة حساب ديناميكية حية قبل الحجز.
* **الاسترداد التلقائي (Auto-Reversal):** عند فشل المهمة أو انقطاع المزود، يتم استرداد الرصيد المحجوز فورياً إلى محفظة المستخدم مع تسجيل المعاملة في الـ Ledger.

---

## 8. التجميع والمونتاج الداخلي (Assembly Stage & Audio Tracks)

* **مرحلة التجميع السبع (7-Step Assembly Stage — `SUB-01`):**
  `Normalize` ──► `Trim` ──► `Cuts` ──► `Mix` ──► `Captions` ──► `Preview` ──► `Master Render`.
* **المسارات الصوتية السبعة المخصصة LTR (`PNL-06B`):**
  `A1: Dialogue` • `A2: Voice Over` • `A3: Voice ID Reference` • `A4: Ambient` • `A5: SFX` • `A6: Music Score` • `A7: Captions & Subtitles`.
