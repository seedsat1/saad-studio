# Gate D — Contextual Reference Engine Design Contract

**النسخة:** 1.0  
**التاريخ:** 2026-08-27  
**الحالة:** DRAFT — للمراجعة والاعتماد قبل أي تنفيذ  
**البوابة السابقة:** Gate C.2 (Hi-Fi SVGs) + Phase 1.1 Spike Report  
**المنفِّذ المقترح:** Codex في worktree منفصل بعد اعتماد المالك  
**النطاق:** Contextual Reference Engine للأدوات الإبداعية التسع في Drama Studio

---

## 1. الهدف (Executive Summary)

استبدال منهج **Static Catalog** (37 preset عشوائي غير مرتبط بالمشروع) بمنهج **Contextual Generator** الذي يقرأ سياق المشروع/الحلقة/المشهد ويولِّد **3–6 اتجاهات بصرية مخصَّصة** لكل أداة، مُشتقَّة من محتوى المشروع الفعلي.

هذه البوابة تُعرِّف **العقد المعماري فقط**. لا كود. لا API implementation. لا DB migration. فقط:
- Data contracts (Types)
- Behavioral contracts (What each tool does)
- Gate sequence (P0-C separation)
- Success criteria للتنفيذ اللاحق

---

## 2. المنهج المرفوض (Rejected Anti-Patterns)

### 2.1 Static Catalog Picker
مرفوض لأنه:
- **يقدِّم أنماطاً غير ذات صلة** بالمشروع (مثال: Cyberpunk Noir لمسلسل صحراوي تاريخي)
- **يفرض عبء الاختيار** على المستخدم للفلترة الذهنية
- **لا يستفيد من سياق المشروع** الذي أُدخل بالفعل
- **يخالف السينمائي الحقيقي** الذي يطوِّر النمط البصري من السيناريو، لا من قائمة جاهزة

**الأمثلة المرفوضة:**
- `HOOK_STYLES` (Hook Studio config — 15 preset)
- `CINEMATIC_STYLES` (12 preset في constants.ts)
- `reference-presets.ts` (37 preset — أسوأ ما وصلنا إليه)
- أي `unsplash` أو `data:base64` أو `blob:` كصورة مرجعية

### 2.2 Hybrid (Catalog + Generator)
مرفوض أيضاً لأنه يعيد تقديم نفس الأنماط العشوائية كـ "fallback"، فيُبقي anti-pattern حياً.

### 2.3 Fake Generation Claims
مرفوض عرض "AI Director" بلا LLM فعلي، أو ادعاء توليد بينما النتيجة catalog picking.

---

## 3. المنهج المعتمَد (Approved Architecture)

Reference Engine = **مولِّد سياقي** بثلاث مراحل مفصولة:

```
┌─────────────────────────────────────────────────────────┐
│  المرحلة 1 — Analyze (بلا Provider، بلا Credit)         │
│  يقرأ Context → يُنتج Style Specification (نص)          │
├─────────────────────────────────────────────────────────┤
│  المرحلة 2 — Quote (بلا Credit deduction)               │
│  يعرض تكلفة تقديرية لتوليد الصورة                       │
├─────────────────────────────────────────────────────────┤
│  المرحلة 3 — Generate (P0-C gated)                       │
│  يستدعي provider → يحفظ في Storage الدائم               │
└─────────────────────────────────────────────────────────┘
```

**قبل حسم P0-C:** المرحلتان 1 و 2 فقط متاحتان. المرحلة 3 مُغلَقَة بـ Feature Flag، والواجهة تعرض **حالة صادقة** ("توليد الصور غير متاح — تم إنشاء Spec نصي فقط").

---

## 4. مصادر السياق (Context Inputs)

يجب أن يستقبل Reference Engine الـ 10 مصادر التالية من project state:

| # | مصدر | نوع | من أين |
|---:|---|---|---|
| 1 | Project title & concept | `string` | Composer + `DramaProject.name` + `content.settings` |
| 2 | Project settings | `object` | `content.settings` (contentFormat, adaptationMode, storyboardMode, aspectRatio) |
| 3 | Outline & Script | `string` | `content.outline` + `content.script` |
| 4 | Active Episode & Scene | `{episodeId?, sceneId?}` | Runtime (URL params أو state) |
| 5 | Era / Period | `string` | مستنبطة من settings أو منصوصة في outline |
| 6 | Setting / Geography | `string` | من outline/script بواسطة LLM extraction |
| 7 | Mood / Tone | `string` | من adaptationMode + outline sentiment |
| 8 | Existing Characters & Elements | `Array` | `content.characters` + `content.elements` |
| 9 | Pinned References | `Array` | `content.pinnedReferences` (المُتوارَثة من المشروع) |
| 10 | Continuity Directives | `Array` | `content.agentMessages` (توجيهات المستخدم) |

**تعريف واضح:** إن كان أي من هذه فارغاً، Reference Engine يعمل بما هو متاح، ويطلب من المستخدم تعبئة الأساسي (Concept على الأقل).

---

## 5. عقد المُخرَج (Direction Proposal Contract)

كل اقتراح بصري يُنتَج بهذا الـ shape:

```typescript
interface DirectionProposal {
  id: string;                    // uuid
  toolId: DramaCreativeTool;     // style | character | element | ...

  // Naming — يجب أن يكون مخصَّصاً للمشروع، لا اسم Preset ثابت
  nameAr: string;                // مثال: "بريق الفجر على السواحل"
  nameEn: string;                // e.g., "Dawn Glow on the Coast"

  // Rationale — سبب صريح لماذا يناسب هذا المشروع
  rationaleAr: string;
  rationaleEn: string;

  // Reference Image
  referenceImage: {
    storageUrl: string | null;   // permanent URL من R2/B2. NEVER Base64.
    sourceScene?: string;        // "Episode 2, Scene 5" إن وُلِّدَت من مشهد محدد
    generatedAt?: string;        // ISO timestamp
    model?: string;              // اسم النموذج المُستخدَم
    status: "spec_only" | "generated" | "generation_failed";
  };

  // Prompt Engineering
  prompt: {
    seed: string;                // النص الذي أنتج/سينتج الصورة
    negativePrompt?: string;
    keywords: {
      era: string[];             // ["1960s", "post-war"]
      mood: string[];            // ["nostalgic", "sunlit"]
      setting: string[];         // ["arabian_coastal", "fishing_village"]
      palette: string[];         // ["amber", "turquoise", "sepia"]
      lighting: string[];        // ["golden_hour", "natural"]
      lensLanguage: string[];    // ["16mm_grain", "wide_shot"]
    };
  };

  aspectRatio: "16:9" | "9:16" | "1:1" | "21:9";

  // Provenance — لتتبُّع أصل كل اقتراح
  provenance: {
    projectId: string;
    sceneId?: string;
    contextSnapshotHash: string; // hash of the context used
    createdBy: "system" | "user_refined";
    version: number;
  };

  // Lifecycle
  status: "draft" | "confirmed" | "pinned" | "archived";
}
```

**قيود صارمة:**
- ❌ **NO Base64** في `storageUrl`
- ❌ **NO** blob: أو data: URIs في أي حقل يُحفَظ
- ❌ **NO** أسماء generic مثل "Cyberpunk Noir" — الاسم يجب أن يكون مُشتقاً من المشروع
- ✅ Storage URLs فقط (permanent R2/B2)
- ✅ Provenance مُلزَم لكل اقتراح

---

## 6. عقد الأدوات التسع (9-Tools Contextual Contract)

كل أداة تشترك في `Context Input` لكن تُنتج مخرجاً مختلفاً:

### 6.1 Style
- **Focus:** الهوية البصرية العامة للمشروع
- **Uses:** era + mood + setting + palette
- **Output:** 3-6 style directions مع reference image لكل واحد
- **Example:** لمشروع "مسلسل صحراوي 1960s" → "غبار العصر" أو "أفول الرمال"، لا "Cyberpunk Noir"

### 6.2 Character
- **Focus:** المظهر والملابس والحالة لشخصية موجودة في `content.characters`
- **Uses:** character notes + era + setting
- **Output:** لكل شخصية 2-4 face/wardrobe references مقترحة
- **Example:** "طارق (المحقق)" → مقترحات ملابس تناسب era المشروع، لا generic "detective"

### 6.3 Element (Props/Vehicles)
- **Focus:** الأدوات والمركبات المذكورة في السيناريو
- **Uses:** script scan + era
- **Output:** لكل prop مذكور، 2-3 references
- **Example:** "سيارة الجيب في المشهد 5" → references لسيارات era-appropriate، لا صور random

### 6.4 Location
- **Focus:** البيئات المُحدَّدة في outline/script
- **Uses:** script scan + setting geography
- **Output:** لكل موقع في السيناريو، 2-4 references بصرية
- **Example:** "المقهى البحري" → references لمقاهي ساحلية period-authentic

### 6.5 Color
- **Focus:** Palette مستمدة من mood + lighting
- **Uses:** mood + era + selected style direction
- **Output:** 3-5 palettes، كل واحدة 5 hex colors + توضيح لكل لون
- **Example:** لمشروع مبهج → warm palette؛ لمشروع نوار → cool palette

### 6.6 Effects
- **Focus:** VFX/atmospheric effects المطلوبة فعلاً في المشهد
- **Uses:** script scan للأحداث ذات الأثر البصري
- **Output:** قائمة بمؤثرات محتاجة (rain, fog, fire, magic) + reference لكل
- **Example:** إن ذكر السيناريو "عاصفة رعدية" → rain/lightning refs. لا يعرض "explosion" إن لم يُذكَر.

### 6.7 Camera
- **Focus:** لغة العدسة والحركة المناسبة للنوع
- **Uses:** genre + mood + storyboardMode
- **Output:** 3-5 camera language proposals (lens, movement, framing)
- **Example:** thriller → wide anamorphic + slow zoom؛ romantic → shallow depth + soft focus

### 6.8 Sketch
- **Focus:** تخطيط أولي (blocking) للمشهد النشط
- **Uses:** scene description + character positions + camera direction
- **Output:** 2-3 rough sketches تقترح blocking
- **Example:** مشهد حوار → shot-reverse-shot sketches

### 6.9 Storyboard
- **Focus:** تقسيم المشهد إلى لقطات مفتاحية
- **Uses:** scene beats + selected camera language
- **Output:** 4-8 keyframes للمشهد الكامل
- **Example:** "مشهد المطاردة" → keyframes: setup / trigger / chase / obstacle / climax / resolution

---

## 7. نموذج التوريث (Inheritance Model)

```
Project.style      ─┐
                    │
     ↓ inherits    ↓
Episode.style    ────
                    │
     ↓ inherits    ↓
Scene.style       ──
                    │
     ↓ can override (with warning)
```

**قواعد التوريث:**
1. اختيار على مستوى **Project** يصبح default لكل الحلقات والمشاهد
2. **Episode** يمكنه override لكن يظهر تنبيه استمرارية "قد يخالف نمط المشروع"
3. **Scene** يمكنه override أشد لكن يظهر تنبيه أقوى
4. Override يُخزَّن في مستوى المُتغيِّر (Scene.styleOverride) دون تعديل Project.style
5. UI يعرض breadcrumb: "Style: Amber Coast [Project] → Amber Coast [Ep 2] → Neon Souq [Scene 5 override]"

**قيود:**
- Override محدود بـ Scene فقط (لا Sub-scene override)
- Continuity Inspector يعرض warning لكل override

---

## 8. تسلسل بوابة P0-C (Credit Gate Sequence)

**قبل حسم P0-C** (الحالة الحالية):

```
[Analyze]  ✅ متاح — بلا Provider، بلا Credit
    ↓
[Quote]    ✅ متاح — يعرض التكلفة التقديرية
    ↓
[Generate] 🔒 مُغلَق بـ Feature Flag `DRAMA_GEN_ENABLED=false`
    ↓
[Store]    🔒 غير متاح لأن لا شيء يُولَّد
```

**واجهة المستخدم في هذه الحالة:**
- تعرض Style Spec كامل (نص + keywords + prompt seed)
- تعرض تنبيه صريح: "توليد الصور مؤجَّل حتى اعتماد بوابة الكريديت (P0-C). يمكنك نسخ الـ Prompt لاستخدامه في أداة توليد خارجية مؤقتاً."
- **لا Fallback لـ Placeholder عشوائي**
- **لا Fake image من Catalog**
- زر "توليد الصورة" **مُعطَّل مع toolip يوضِّح السبب**

**بعد حسم P0-C:**

```
[Analyze]  ✅
    ↓
[Quote]    ✅ + Show credit balance + estimated cost
    ↓
[Confirm]  ⏸️ User must confirm charge
    ↓
[Reserve]  💰 Reserve credits via CreditLedger
    ↓
[Generate] ✅ Call provider
    ↓
[Store]    ✅ Save to R2/B2 with proper storageUrl
    ↓
[Commit]   💰 Commit credit deduction on success
    ↓
[Refund]   💰 Refund on failure (via P0-C idempotency)
```

**كل خطوة توليد يجب أن تكون idempotent** (P0-C requirement).

---

## 9. عقد الـ API (API Contract)

الروتات المطلوبة (تنفيذ لاحق):

### 9.1 Analyze
```
POST /api/drama-studio/reference/analyze
Request Body:
  {
    projectId: string,
    toolId: DramaCreativeTool,
    sceneContext?: { episodeId, sceneId }
  }
Response:
  {
    proposals: DirectionProposal[]  // status: "spec_only"
    contextUsed: {  // for transparency
      hasOutline: boolean,
      hasCharacters: boolean,
      ...
    }
  }
Cost: 0 credits (no provider call)
Auth: Clerk userId + project ownership check
```

### 9.2 Quote
```
POST /api/drama-studio/reference/quote
Request Body:
  {
    projectId: string,
    proposalIds: string[]  // which proposals to generate
  }
Response:
  {
    quotes: [{
      proposalId: string,
      estimatedCredits: number,
      provider: string,
      model: string,
      aspectRatio: string
    }],
    totalEstimated: number,
    currentBalance: number
  }
Cost: 0 credits (quote only, no generation)
```

### 9.3 Generate (P0-C gated)
```
POST /api/drama-studio/reference/generate
Request Body:
  {
    projectId: string,
    proposalIds: string[],
    idempotencyKey: string  // P0-C requirement
  }
Response:
  {
    generated: [{
      proposalId: string,
      storageUrl: string,
      chargedCredits: number,
      ledgerEntryId: string
    }],
    failed: [{
      proposalId: string,
      reason: string,
      refunded: boolean
    }]
  }
Feature Flag: DRAMA_GEN_ENABLED must be true
Auth: Clerk userId + credit sufficiency check
Idempotency: enforced via P0-C ApiIdempotency table
```

### 9.4 Pin/Unpin
```
POST /api/drama-studio/projects/[projectId]/pin
Request Body:
  {
    proposalId: string,
    scope: "project" | "episode" | "scene",
    scopeId?: string  // required if scope != "project"
  }
Response:
  {
    pinnedReference: DramaPinnedReference,
    updatedContent: DramaProjectContent
  }
Cost: 0 credits
Persistence: content.pinnedReferences updated + autosave
```

---

## 10. تعديلات نموذج البيانات (Data Model Additions)

**لا مطلوب أي DB migration جديدة في Gate D.** التخزين يعتمد على البنى الموجودة:

- `DramaProject.content.pinnedReferences[]` — للـ pinned proposals
- `DramaProject.content.styleSpecs[]` — **حقل جديد مُقتَرح** لحفظ التحليلات (spec_only) دون توليد

**اقتراح لـ types.ts (لا كود، مجرد contract):**

```typescript
interface DramaProjectContent {
  // ... existing fields ...

  // NEW: analyzed but not yet generated proposals
  styleSpecs?: DirectionProposal[];

  // NEW: inheritance overrides
  overrides?: {
    episode?: { [episodeId: string]: { toolId: DirectionProposal["id"] } };
    scene?:   { [sceneId: string]:   { toolId: DirectionProposal["id"] } };
  };
}
```

**Storage للـ generated images:**
- استخدام `lib/storage/runtime.ts` (R2/B2)
- Path convention: `drama-studio/{projectId}/references/{toolId}/{proposalId}.png`
- Never sign a URL with expiry — always public read for pinned references
- Cleanup policy: عند أرشفة المشروع، الصور تبقى؛ عند delete، تُحذف مع audit log

---

## 11. الحالات الصادقة (Honest Empty States)

يجب على UI أن يعرض حالة صادقة في كل موقف:

| Situation | Honest Message | لا تفعل |
|---|---|---|
| Composer فارغ | "اكتب فكرة المشروع أولاً لتحليل السياق" | عرض generic catalog |
| Analysis فشل | "تعذَّر تحليل السياق — تأكد من اكتمال الفكرة" | Fallback catalog |
| Generation مُعطَّل (P0-C) | "توليد الصور مؤجَّل حتى اعتماد Credit Gate — عرض Spec نصي فقط" | Fake image |
| Credit غير كافٍ | "الرصيد لا يكفي — يحتاج X credits، لديك Y" | تجاوز صامت |
| Provider فشل | "Provider فشل — لم يُخصم رصيد" | خصم مع فشل |
| Pinned reference URL معطوب | "الصورة غير متاحة — يمكن إعادة التوليد" | broken image icon |

**قاعدة ذهبية:** كل حالة سلبية يجب أن تكون **صريحة، توضِّح السبب، وتعرض الخطوة التالية**.

---

## 12. أنماط الفشل (Failure Modes)

| Failure | Behavior |
|---|---|
| LLM analyzer timeout | يعرض proposals جزئية بناءً على context الأساسي |
| Provider gen timeout | Idempotency key يحمي من double-charge |
| Provider gen failed after credit reserve | Refund تلقائي via CreditLedger |
| Storage upload failed | Retry 3x مع exponential backoff، ثم refund + notify |
| DB save failed after storage | Storage cleanup لملف orphan |
| Autosave conflict (متعدد جلسات) | Last-write-wins مع warning للمستخدم |
| Pinned URL 404 | UI يعرض "غير متاح" + زر "إعادة التوليد" |
| Cross-user access attempt | 403 + audit log entry |

---

## 13. معايير النجاح (Success Criteria)

### 13.1 Architectural
- ✅ صفر Base64 في أي endpoint
- ✅ صفر hardcoded catalog fallback في runtime
- ✅ صفر ادعاءات "AI" بلا LLM حقيقي
- ✅ كل صورة مُولَّدة تحمل provenance كامل
- ✅ كل استدعاء generation يمر بـ Analyze → Quote → Confirm
- ✅ كل توليد يستخدم P0-C idempotency

### 13.2 User Experience
- ✅ لا يعرض المستخدم نمطاً غير مرتبط بمشروعه
- ✅ empty state honest وليس padding
- ✅ inheritance chain مرئي وقابل للتتبع
- ✅ scene override يعرض warning للاستمرارية

### 13.3 Technical
- ✅ 0 TypeScript errors في drama-studio/
- ✅ ≥ 15 tests للـ context reading + proposal generation + P0-C gate
- ✅ tests للـ inheritance override
- ✅ tests للـ failure modes (refund, retry, idempotency)
- ✅ tests للـ empty states

### 13.4 Cost Safety
- ✅ Feature flag `DRAMA_GEN_ENABLED` يمنع أي provider call قبل P0-C
- ✅ كل quote يعرض current balance
- ✅ لا شحن بلا confirm صريح من المستخدم
- ✅ refund تلقائي على أي فشل بعد reserve

---

## 14. خارج نطاق Gate D (Out of Scope)

هذه البوابة **لا تشمل**:

- ❌ **Actual LLM prompt engineering** — يُفصَّل في Gate E أو أثناء التنفيذ
- ❌ **Fine-tuned models** — الاعتماد على providers جاهزة (Recraft/Flux/Nano-Banana)
- ❌ **Voice/audio references** — Style/Character/Location فقط في هذا الـ scope
- ❌ **Timeline integration** — Storyboard يُصدَّر إلى Timeline في P1-E منفصل
- ❌ **Multiplayer collaboration** — Single-user فقط
- ❌ **Version history للـ proposals** — قد يُضاف في P1-F
- ❌ **Export to external tools** — Copy prompt فقط، لا direct export
- ❌ **Character voice cloning** — منفصل تماماً

---

## 15. قائمة التحقق للتنفيذ (Verification Checklist for Codex)

عند تنفيذ Codex، يجب أن يجتاز كل من الآتي:

### 15.1 Code Quality
- [ ] TypeScript strict، 0 errors في drama-studio/
- [ ] No `any` أو `@ts-ignore`
- [ ] No hardcoded arrays > 5 items في drama-studio/
- [ ] No import من `hook-studio-config`
- [ ] No `readAsDataURL` أو Base64 encoding
- [ ] No fetch call with JSON body containing binary data

### 15.2 Behavioral
- [ ] Analyze يعمل بدون Provider call (mock LLM في dev)
- [ ] Quote يعرض current balance
- [ ] Generate مُغلَق بـ Feature Flag قبل P0-C
- [ ] Honest empty states في كل حالة سلبية
- [ ] Pin/Unpin يحفظ في content.pinnedReferences
- [ ] Refresh يستعيد pinned references

### 15.3 Testing
- [ ] Vitest suite ≥ 15 tests
- [ ] Test لكل من الـ 9 tools
- [ ] Test للـ inheritance override
- [ ] Test للـ empty context
- [ ] Test للـ cross-user denial
- [ ] Test للـ P0-C gate enforcement
- [ ] Test للـ refund on generate failure

### 15.4 Integration
- [ ] لا تأثير على P0-C branch
- [ ] لا تعديل PROJECT_CONTEXT.md في main
- [ ] العمل في worktree منفصل (drama-slice-1 مثلاً)
- [ ] Commit granular، ليس mega-commit

---

## 16. الأمثلة التوضيحية (Reference Examples)

**Placeholder:** الصور التوضيحية الثلاثة لأمثلة Contextual outputs معلَّقة بسبب استنفاد credits على Recraft V4.1. عند توفر credits، ستُولَّد:

- **Example 1:** لمشروع "مسلسل صحراوي 1960s" — الاسم المخصَّص: "غبار العصر"
- **Example 2:** لمشروع "محقق سعودي في رياض مستقبلية ممطرة" — الاسم المخصَّص: "نيون السوق المبتل"
- **Example 3:** لمشروع "ملحمة عربية القرن 8" — الاسم المخصَّص: "رياح الرمال البرونزية"

**كل مثال يُظهِر:**
- ✅ اسم مخصَّص للمشروع (لا "Cyberpunk Noir" جاهز)
- ✅ Reference image مُشتقَّة من المشهد
- ✅ Prompt seed مبني على era + setting + mood
- ✅ Keywords مطابقة للسياق

---

## 17. Approval Workflow

**قبل أي كود:**
1. المالك يقرأ هذا العقد كاملاً
2. يعتمد صراحةً (نعم/لا لكل قسم رئيسي)
3. أي تعديلات تُدمَج في نسخة 1.1
4. Codex يُستدعى في worktree منفصل بـ `git worktree add`
5. Codex ينفذ بحسب هذا العقد، لا يخترع

**بعد التنفيذ:**
6. Claude يراجع (audit مستقل)
7. جلسة Codex مستقلة تنفذ تدقيقاً نهائياً
8. المالك يُقرِّر merge أم rework

---

## 18. الأسئلة المفتوحة (Open Questions للمالك)

- **Q-D1:** أي LLM للـ Analyze? (Gemini 2.5 Pro مقترَح لطول context، أو Claude Sonnet للجودة)
- **Q-D2:** أي image gen model افتراضي؟ (Recraft V4.1 مُختبَر، Nano-Banana أرخص، Flux Pro أدق)
- **Q-D3:** حد أقصى لعدد proposals per Analyze call؟ (اقتراح: 6 كحد أعلى)
- **Q-D4:** حد أقصى لطول Composer context قبل truncation؟ (اقتراح: 8K tokens)
- **Q-D5:** هل نسمح بـ override تفصيلي (per-shot) أم Scene فقط؟ (اقتراح: Scene فقط لتبسيط V1)
- **Q-D6:** Continuity Inspector — تحذيرات only أم يمنع override قوياً؟ (اقتراح: warn، لا يمنع)
- **Q-D7:** Refresh policy — إعادة analyze تلقائياً عند تغيير Composer؟ (اقتراح: manual "Re-analyze" button)
- **Q-D8:** Sharing proposals بين مشاريع نفس المستخدم؟ (اقتراح: خارج نطاق V1)

---

## 19. Sign-off

**هذا العقد جاهز للمراجعة.**

**التوقيع المطلوب:**
- [ ] المالك يعتمد الأقسام 1-13
- [ ] المالك يجيب على الأسئلة المفتوحة 18
- [ ] المالك يُقرِّر مسار التنفيذ (Codex في drama-slice-1؟ توقيت؟)
- [ ] Claude يبدأ التنفيذ فقط بعد اعتماد صريح

**بعد الاعتماد:**
- Version → 1.1 (final)
- ينتقل إلى Codex في worktree جديد
- لا Antigravity على TSX في هذا الـ slice

---

**نهاية Gate D — Contextual Reference Engine Design Contract v1.0**
