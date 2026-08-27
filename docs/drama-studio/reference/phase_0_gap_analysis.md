سأبدأ Phase 0 كمراجع معماري مستقل. سأفحص المستودع بأوامر قراءة فقط، بدون أي تعديل.

صفحة Drama Studio ملف واحد ضخم (84KB). سأفحص هيكلها ومناطق حرجة أخرى بالتوازي.

الصفحة 1524 سطر بملف واحد بها بيانات ثابتة (Threads of Silence) واستجابات دردشة setTimeout مزيفة. سأتابع فحص بقية النطاق.

اكتشافات حرجة: التعديلات في `prisma/schema.prisma` كلها Voice Agent (231 سطراً)، **لا يوجد أي نموذج Drama Studio في قاعدة البيانات**. لكن يوجد `CinemaProject / CinemaShot / CinemaCharacter / CinemaLocation / CinemaAsset / CinemaJob` كأساس مشابه. سأتابع الفحص.

اكتملت مرحلة الفحص. سأقدّم تقرير Phase 0 الآن.

---

# 📋 تقرير Phase 0 — المراجعة المعمارية المستقلة لـ Drama Studio

**التاريخ:** 2026-08-26

**النطاق:** فحص القراءة الكامل — بدون أي تعديل

**المرجع:** [drama\_studio\_complete\_reference.md](https://claude.ai/epitaxy/local_3c84fcbd-585a-4b0c-8528-9e3a7c2d65c3) (951 سطر / 31 قسماً)

**المحقق:** المراجع المعماري المستقل

**الحالة:** لا تعديلات — تقرير فقط

---

## 1. حالة المستودع الفعلية (لقطة `git status`)

**الفرع:** `main`

**التغييرات غير المثبتة (سُجّلت فقط، لم تُعدَّل):**

| نوع ملف ملاحظة  |                                                                                                                                      |                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| Modified        | [.gitignore](https://claude.ai/epitaxy/.gitignore)                                                                                   | تعديل قائم                      |
| Modified        | [adobe/saadstudio-cep/client/src/pages/ai-copilot.ts](https://claude.ai/epitaxy/adobe/saadstudio-cep/client/src/pages/ai-copilot.ts) | تعديل CEP خارج نطاق Drama       |
| Modified        | [adobe/saadstudio-cep/jsx/index.jsx](https://claude.ai/epitaxy/adobe/saadstudio-cep/jsx/index.jsx)                                   | تعديل CEP خارج نطاق Drama       |
| Modified        | [app/(dash)/(routes)/video/page.tsx](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/video/page.tsx)                               | تعديل قائم                      |
| Deleted         | [app/favicon.ico](https://claude.ai/epitaxy/app/favicon.ico)                                                                         | حذف قائم                        |
| Modified        | [app/layout.tsx](https://claude.ai/epitaxy/app/layout.tsx)                                                                           | تعديل قائم                      |
| Modified        | [components/TopNavbar.tsx](https://claude.ai/epitaxy/components/TopNavbar.tsx)                                                       | يحمل عنصر Drama Studio بالعربية |
| Modified        | [components/admin/AdminSidebar.tsx](https://claude.ai/epitaxy/components/admin/AdminSidebar.tsx)                                     | تعديل قائم                      |
| Modified        | [components/sidebar.tsx](https://claude.ai/epitaxy/components/sidebar.tsx)                                                           | تعديل قائم                      |
| Modified        | [docs/saad-studio-premiere-reference-ar.md](https://claude.ai/epitaxy/docs/saad-studio-premiere-reference-ar.md)                     | تعديل قائم                      |
| Modified        | [lib/navigation.ts](https://claude.ai/epitaxy/lib/navigation.ts)                                                                     | يحمل رابط Drama Studio          |
| Modified        | [package.json / package-lock.json](https://claude.ai/epitaxy/package.json)                                                           | تعديل قائم                      |
| Modified        | [prisma/schema.prisma](https://claude.ai/epitaxy/prisma/schema.prisma)                                                               | **+231 سطر — كلها Voice Agent** |
| Untracked       | `app/(dash)/(routes)/drama-studio/`                                                                                                  | ملف واحد `page.tsx` (1524 سطر)  |
| Untracked       | `app/admin/voice-agent/`, `app/api/voice-agent/`, `components/voice-agent/`, `lib/voice-agent/`                                      | Voice Agent كامل غير مثبت       |
| Untracked       | `prisma/migrations/manual/2026-08-25-voice-agent.sql`                                                                                | Migration يدوي                  |
| Untracked       | `scripts/*voice*`, `test/voice-agent-core.test.ts`, `scratchpad/`                                                                    | ملفات دعم Voice Agent           |

**تحذير هام:** ملاحظة `LF will be replaced by CRLF` على `prisma/schema.prisma` — هذا لا يُغيَّر الآن.

> ⚠️ التعديلات الحالية تُسجَّل فقط. **لم أَتَراجَع عن شيء ولم أفترض من أنشأها.**

---

## 2. ما تم فحصه فعلياً (Evidence-Base)

- [app/(dash)/(routes)/drama-studio/page.tsx](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/drama-studio/page.tsx) — 1524 سطر، ملف وحيد
- [prisma/schema.prisma](https://claude.ai/epitaxy/prisma/schema.prisma) — 1123 سطر، 53 نموذجاً
- [lib/navigation.ts](https://claude.ai/epitaxy/lib/navigation.ts) و [components/TopNavbar.tsx](https://claude.ai/epitaxy/components/TopNavbar.tsx) — قوائم التنقل
- [lib/use-language.ts](https://claude.ai/epitaxy/lib/use-language.ts) — نظام اللغة (يفرض LTR دائماً)
- [lib/video-models.ts](https://claude.ai/epitaxy/lib/video-models.ts) و [lib/video-model-registry.ts](https://claude.ai/epitaxy/lib/video-model-registry.ts) — سجل النماذج
- [lib/credit-ledger.ts](https://claude.ai/epitaxy/lib/credit-ledger.ts) و [lib/idempotency.ts](https://claude.ai/epitaxy/lib/idempotency.ts) — الكريدت وIdempotency
- [lib/admin/history-read-model.ts](https://claude.ai/epitaxy/lib/admin/history-read-model.ts) — سجل التاريخ
- [lib/storage/](https://claude.ai/epitaxy/lib/storage/) — R2/Backblaze/Supabase
- `app/api/cinema/` — 9 مسارات (project, shot, character, location, generate, job, regenerate, render, samples)
- `app/admin/` — 30 قسماً بما فيها history/jobs/generation-lab/transactions/pricing
- [app/(dash)/(routes)/cinema-board/page.tsx](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/cinema-board/page.tsx) — 792 سطر Prototype بـ `useState` وبيانات ثابتة

---

## 3. الاكتشافات الحرجة (قبل المصفوفة)

### 3.1 لا يوجد أي نموذج Drama Studio في قاعدة البيانات

فحصت 53 نموذجاً في [prisma/schema.prisma](https://claude.ai/epitaxy/prisma/schema.prisma). لا يوجد ولا نموذج واحد لـ Drama Studio. التعديلات المضافة (231 سطراً) كلها لـ Voice Agent.

**الموجود ويمكن استلهامه:** `CinemaProject / CinemaShot / CinemaCharacter / CinemaLocation / CinemaAsset / CinemaJob` — Cinema Studio له نموذج مطابق تقريباً لبنية Drama Studio على مستوى المشروع/اللقطة/الأصل/الوظيفة، ويصلح كأساس معماري (لا نسخ حرفي).

### 3.2 صفحة Drama الحالية Prototype بالكامل

[app/(dash)/(routes)/drama-studio/page.tsx](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/drama-studio/page.tsx):

- **`useState`** **فقط** — لا Persistence ولا `projectId` ولا API واحد
- **بيانات ثابتة:** «Series: Threads of Silence»، د. سارة، المحقق طارق، 5 مشاهد مسبقة الإعداد
- **دردشة مزيفة:** [page.tsx:143-157](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/drama-studio/page.tsx#L143) — `setTimeout(900ms)` يرد برد ثابت
- **Progress مزيف:** [page.tsx:248-269](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/drama-studio/page.tsx#L248) — قفزات 25→65→95→100 بـ `setTimeout`
- **قائمة موديل مكتوبة في UI:** [page.tsx:476,490-497](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/drama-studio/page.tsx#L476) — «Seedance 2.5 (30s)»، «Seedance 2.0 (15s)» — **مخالف صريح للمرجع (§20)**
- **بطاقة "Phase 1A Demo":** [page.tsx:429](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/drama-studio/page.tsx#L429) — إقرار داخلي بأنها Demo
- **رسائل عربية مضمّنة في المصدر:** غالبيتها بالعربية داخل الكود مباشرة، ليس عبر نظام i18n المركزي

### 3.3 التبويبات: 5 إدارة + 2 انتقال (متوافق تقريباً مع المرجع §1.2)

[page.tsx:704-750](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/drama-studio/page.tsx#L704):

```
settings → outline → characters → environments → props   ← 5 tabs
+ production (button)   + board (button)

```

مطابق لروح المرجع، لكن **أسماء تنحرف قليلاً:**

- المرجع: `Locations & Environments` — التطبيق: `environments`
- المرجع: `Elements & Props` — التطبيق: `props`

### 3.4 نظام اللغة يفرض LTR دائماً (متوافق مع المرجع §6.1)

[lib/use-language.ts:12,20,42](https://claude.ai/epitaxy/lib/use-language.ts#L12): كل استدعاءات `setAttribute("dir", ...)` تمرر `"ltr"` مع تعليق `// Enforce LTR layout always!`. **متوافق مع قرار المرجع** بعدم انعكاس Agent يسار / Workbench يمين في العربية.

### 3.5 لا يوجد Route ديناميكي `[projectId]` ولا `[episodeId]`

المرجع يتطلب:

- `/drama-studio/[projectId]`
- `/drama-studio/[projectId]/episodes/[episodeId]/production`

**الموجود:** فقط `/drama-studio` (Route ثابت). الصفحات 2 و 3 من المرجع **غير موجودة**.

### 3.6 Project Board غير موجود كما يعتقد

هناك [app/(dash)/(routes)/cinema-board/page.tsx](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/cinema-board/page.tsx) (792 سطر)، لكن الفحص كشف أنه **Prototype آخر بـ** **`useState`** ("Action Restroom Fight" مضمّن) — ليس Board حقيقي مرتبط بأصول المستخدم. المرجع §19 يقول "يعاد استخدام الـBoard الموجود" — **لا يوجد Board حقيقي لإعادة استخدامه بعد.**

### 3.7 البنية التحتية الحقيقية موجودة (يمكن الاعتماد عليها)

| النظام الحالة المسار   |             |                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Model Registry مركزي   | موجود قوي   | [lib/video-models.ts](https://claude.ai/epitaxy/lib/video-models.ts), [lib/video-model-registry.ts](https://claude.ai/epitaxy/lib/video-model-registry.ts), [lib/model-registry-hardening.ts](https://claude.ai/epitaxy/lib/model-registry-hardening.ts), [lib/model-definition-registry.ts](https://claude.ai/epitaxy/lib/model-definition-registry.ts) |
| Pricing Constitution   | موجود       | [prisma/schema.prisma:613](https://claude.ai/epitaxy/prisma/schema.prisma#L613) `PricingConstitution` + [lib/pricing-constitution-hardening.ts](https://claude.ai/epitaxy/lib/pricing-constitution-hardening.ts)                                                                                                                                         |
| Credit Ledger          | موجود       | [lib/credit-ledger.ts](https://claude.ai/epitaxy/lib/credit-ledger.ts)                                                                                                                                                                                                                                                                                   |
| Idempotency            | موجود       | [lib/idempotency.ts](https://claude.ai/epitaxy/lib/idempotency.ts)                                                                                                                                                                                                                                                                                       |
| Generation lifecycle   | موجود       | [prisma/schema.prisma:77,118,146](https://claude.ai/epitaxy/prisma/schema.prisma#L77) `Generation + ProviderUsageRecord + GenerationRequestSnapshot`                                                                                                                                                                                                     |
| Storage Multi-provider | موجود       | [lib/storage/](https://claude.ai/epitaxy/lib/storage/) (R2, Backblaze, Supabase)                                                                                                                                                                                                                                                                         |
| Inngest للـJobs        | موجود       | [lib/inngest/](https://claude.ai/epitaxy/lib/inngest/)                                                                                                                                                                                                                                                                                                   |
| User Libraries         | موجود       | UserCharacter, UserElement, UserLocation, UserEffect, UserCamera, UserPalette                                                                                                                                                                                                                                                                            |
| Admin History          | موجود قوي   | [lib/admin/history-read-model.ts](https://claude.ai/epitaxy/lib/admin/history-read-model.ts), [app/admin/history/page.tsx](https://claude.ai/epitaxy/app/admin/history/page.tsx)                                                                                                                                                                         |
| Admin Jobs             | موجود       | [app/admin/jobs/page.tsx](https://claude.ai/epitaxy/app/admin/jobs/page.tsx) + [lib/admin/jobs-read-model.ts](https://claude.ai/epitaxy/lib/admin/jobs-read-model.ts)                                                                                                                                                                                    |
| Cinema domain          | موجود مماثل | [app/api/cinema/](https://claude.ai/epitaxy/app/api/cinema/) + CinemaProject/Shot/Character/Location/Asset/Job                                                                                                                                                                                                                                           |

---

## 4. مصفوفة تتبّع المتطلبات (Requirements Traceability Matrix)

**اختصارات:**

- **تصنيف:** ق=قرار / T=مرجع Topview / هـ=هندسة لازمة / غ=غير محسوم
- **حالة:** ✅ موجود / ⚠️ جزئي / ❌ غير موجود / ⛔ مخالف
- **خطورة:** 🔴 حاسم / 🟠 مرتفع / 🟡 متوسط / 🟢 منخفض
- **مرحلة:** P1 تصميم / P2 أساس / P3 Workbench / P4 تخطيط / P5 إنتاج / P6 تجميع

### 4.1 البنية العامة (المرجع §1)

| # المتطلب تصنيف حالة دليل خطورة إجراء مرحلة معيار قبول  |                                                                                           |     |        |                                                                                                                                                                                   |    |                                                                                 |       |                                                 |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------- | --- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -- | ------------------------------------------------------------------------------- | ----- | ----------------------------------------------- |
| 1.1a                                                    | 3 صفحات جديدة                                                                             | ق   | ⚠️ 1/3 | [drama-studio/page.tsx](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/drama-studio/page.tsx) موجود، `[projectId]` و`[projectId]/episodes/[episodeId]/production` غير موجودَين | 🔴 | إنشاء Route Handlers جديدة تحت `app/(dash)/(routes)/drama-studio/[projectId]/…` | P1→P3 | استعراض المسارين برد 200 مع بيانات مشروع حقيقية |
| 1.1b                                                    | مساحة رابعة = Project Board موجود يُعاد استخدامه                                          | ق+غ | ❌      | [cinema-board/page.tsx](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/cinema-board/page.tsx) هو Prototype آخر؛ لا Board حقيقي                                                 | 🔴 | سؤال صاحب المشروع: ما المسار المعتمد للـBoard؟ (المرجع §29-1)                   | P1    | Board يظهر أصول المستخدم من قاعدة البيانات      |
| 1.2                                                     | 5 تبويبات فقط بالترتيب المحدد                                                             | ق   | ⚠️     | [page.tsx:704-723](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/drama-studio/page.tsx#L704) — 5 تبويبات موجودة لكن أسماء ("environments"، "props") لا تطابق حرفياً           | 🟡 | إعادة تسمية للمطابقة، أو توثيق الانحراف                                         | P3    | اسم كل تبويب يطابق §1.2                         |
| 1.3                                                     | 9 أدوات إبداعية (Style/Character/Element/Location/Color/Effects/Camera/Sketch/Storyboard) | ق   | ❌      | لا يوجد Rail أدوات في الصفحة الحالية                                                                                                                                              | 🔴 | تصميم Rail بـ 9 أدوات مع Scope وPin                                             | P3    | كل أداة تحفظ Spec مربوطاً بنطاقها               |

### 4.2 الوكيل والذاكرة (المرجع §7-§8)

| # المتطلب تصنيف حالة دليل خطورة إجراء مرحلة معيار قبول  |                                                                                    |      |    |                                                                                                                                                                                                                                                           |    |                                                                                      |       |                                                        |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---- | -- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -- | ------------------------------------------------------------------------------------ | ----- | ------------------------------------------------------ |
| 7.1                                                     | Agent يسار Workbench يمين ثابت في اللغتين                                          | ق    | ✅  | [page.tsx:760](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/drama-studio/page.tsx#L760) `grid-cols-[minmax(560px,42%)_minmax(0,58%)]` + [lib/use-language.ts:12,20,42](https://claude.ai/epitaxy/lib/use-language.ts#L12) LTR-forced                 | 🟢 | الحفاظ                                                                               | —     | لا انعكاس عند تحويل اللغة                              |
| 7.2                                                     | Composer واسع ثابت في الأسفل + Enter/Shift+Enter                                   | ق    | ⚠️ | [page.tsx:848-878](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/drama-studio/page.tsx#L848) Composer موجود، لكن `Shift+Enter` غير معالج (input عادي)                                                                                                 | 🟡 | استبدال input بـ textarea مع معالجة Shift+Enter                                      | P3    | Enter يرسل، Shift+Enter سطر جديد                       |
| 7.3                                                     | محادثة حقيقية Persistent                                                           | هـ   | ⛔  | [page.tsx:104-116](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/drama-studio/page.tsx#L104) `useState<ChatMessage[]>` فقط؛ الرد `setTimeout(900ms)` [page.tsx:143-157](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/drama-studio/page.tsx#L143) | 🔴 | نموذج `ProjectConversation + Message` + API `/api/drama-studio/messages` + LLM حقيقي | P2→P3 | Refresh لا يفقد الرسائل؛ الرد من LLM يستند لسياق مخزّن |
| 7.4                                                     | Structured `Proposal` مع `Apply/Approve` قبل التغيير                               | ق+هـ | ❌  | لا يوجد                                                                                                                                                                                                                                                   | 🔴 | نموذج `Proposal + ApprovedDecision` + عرض Diff                                       | P2→P3 | تغيير حسّاس يمر عبر Proposal ولا يُطبّق تلقائياً       |
| 7.5                                                     | منع Spam الدردشة عند تغيير Settings                                                | ق    | ⛔  | [page.tsx:365-381](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/drama-studio/page.tsx#L365) `updateBrief` يبعث رسالة دردشة لكل تغيير نمط                                                                                                             | 🟠 | حذف الرسائل الصامتة؛ التحديث يذهب لسياق المشروع بدون رسالة                           | P3    | تغيير Setting لا يضيف رسالة إلا عند طلب صريح           |
| 8.1                                                     | Project Bible + Character/Narrative/Scene/Continuity/Decisions/Version memory دائم | هـ   | ❌  | لا يوجد نموذج                                                                                                                                                                                                                                             | 🔴 | 7 نماذج جديدة في Prisma                                                              | P2    | كل نوع ذاكرة يُقرأ ويُحدَّث عبر API                    |
| 8.2                                                     | `Generation Context Packet` قبل كل توليد                                           | هـ   | ❌  | لا يوجد                                                                                                                                                                                                                                                   | 🔴 | خدمة `ContextPacketBuilder` تجمع الحزمة من المخازن                                   | P4    | كل GenerationJob يحمل Snapshot Packet مسجّلاً          |

### 4.3 السرد والإعدادات (المرجع §9-§10)

| # المتطلب تصنيف حالة دليل خطورة إجراء مرحلة معيار قبول  |                                                                               |   |    |                                                                                                                                                               |    |                                                                                             |       |                                                   |
| ------------------------------------------------------- | ----------------------------------------------------------------------------- | - | -- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -- | ------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------- |
| 9.1                                                     | لا Hook Chain ولا Cliffhanger إلزامي                                          | ق | ✅  | لا يوجد Hook Chain في الصفحة الحالية                                                                                                                          | 🟢 | التمسك بعدم الإضافة                                                                         | —     | مراجعة الكود قبل كل Merge                         |
| 9.2                                                     | أوضاع Faithful / Balanced / Creative                                          | ق | ⚠️ | [page.tsx:42,284](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/drama-studio/page.tsx#L42) لدينا `PromptFormat = natural/storyboard/faithful` — **مختلف** | 🟠 | استبدال بـ `AdaptationMode = faithful/balanced/creative` كخيار مشروع منفصل عن صيغة البرومبت | P1    | Setting `adaptationMode` مثبَّت في `ProjectBible` |
| 10.1                                                    | Art Style: Live/Animation/Custom + من Registry معتمد                          | ق | ⚠️ | [page.tsx:384-401](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/drama-studio/page.tsx#L384) 16 بطاقة **مضمّنة داخل الكود** بأسماء ثابتة                  | 🟠 | نقلها إلى مصدر مركزي (StudioImg / Style Registry)                                           | P3    | القائمة تُحمَّل من API لا من ثابت TSX             |
| 10.2                                                    | Duration Auto/Manual + Video language مستقل + Suggestiveness + AdaptationMode | ق | ⚠️ | [page.tsx:44-60](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/drama-studio/page.tsx#L44) الحقول موجودة في `ProjectBrief` لكنها Local state فقط           | 🟠 | حفظ ضمن `DramaProject.settings` مع Versioning                                               | P2→P3 | إعدادات المشروع تبقى بعد Refresh                  |
| 10.3                                                    | Confirm & Start Planning يعتمد ويبدأ Job تخطيط                                | ق | ⛔  | [page.tsx:359-363](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/drama-studio/page.tsx#L359) `handleConfirmProjectSetup` يغيّر state محلياً فقط           | 🔴 | Route `/api/drama-studio/[projectId]/plan` يبدأ Job Inngest حقيقي                           | P2→P4 | Job يظهر في `/admin/jobs`                         |

### 4.4 المخطط والأصول (المرجع §11-§12)

| # المتطلب تصنيف حالة دليل خطورة إجراء مرحلة معيار قبول  |                                                                       |   |    |                                                                                                                                            |    |                                                                                       |    |                                            |
| ------------------------------------------------------- | --------------------------------------------------------------------- | - | -- | ------------------------------------------------------------------------------------------------------------------------------------------ | -- | ------------------------------------------------------------------------------------- | -- | ------------------------------------------ |
| 11.1                                                    | Empty State قبل التخطيط                                               | ق | ⚠️ | [page.tsx:293-335](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/drama-studio/page.tsx#L293) `scenes` مبدئية بـ 5 مشاهد ثابتة          | 🟠 | البدء بمصفوفة فارغة، Empty State مرئي                                                 | P3 | مشروع جديد لا يعرض مشاهد وهمية             |
| 11.2                                                    | AI Optimize مع Diff وموافقة                                           | ق | ❌  | لا يوجد                                                                                                                                    | 🟠 | مكوّن Diff Viewer + Approval flow                                                     | P4 | تعديل مقترح يعرض قبل/بعد ويحتاج زر Approve |
| 11.3                                                    | Export Script & Assets                                                | ق | ❌  | لا يوجد                                                                                                                                    | 🟡 | Endpoint تصدير                                                                        | P6 | ملف zip يحوي السيناريو والأصول المعتمدة    |
| 12.1                                                    | Characters بطاقة تشغيلية (Appearance, Looks, Wardrobe, Voice, Status) | ق | ⚠️ | نموذج [UserCharacter](https://claude.ai/epitaxy/prisma/schema.prisma#L661) موجود بحقول محدودة (name, description, referenceUrls, coverUrl) | 🟠 | توسيع أو نموذج `DramaCharacter + CharacterLook + CharacterState` مربوط بـ `projectId` | P2 | كل بطاقة تدعم Looks متعددة وحالة عبر الزمن |
| 12.2                                                    | Locations مع Time/Weather/Lighting/Layout                             | ق | ⚠️ | [UserLocation](https://claude.ai/epitaxy/prisma/schema.prisma#L697) موجود بحقول عامة                                                       | 🟠 | توسيع بـ `LocationProfile + Scene binding`                                            | P2 | Location يحمل حالات الوقت والإضاءة         |
| 12.3                                                    | Elements مع Owner/State/Location عبر الزمن                            | ق | ⚠️ | [UserElement](https://claude.ai/epitaxy/prisma/schema.prisma#L679) موجود عام                                                               | 🟠 | إضافة `ElementState + Ownership`                                                      | P2 | Element يتتبّع المالك عبر المشاهد          |

### 4.5 الأدوات التسع (المرجع §13)

| # الأداة حالة الـUI حالة النموذج الخلفي خطورة إجراء مرحلة  |                    |           |                                                                             |    |                                          |    |
| ---------------------------------------------------------- | ------------------ | --------- | --------------------------------------------------------------------------- | -- | ---------------------------------------- | -- |
| 13.1                                                       | Style              | ❌ لا Rail | ⚠️ [StudioImg](https://claude.ai/epitaxy/prisma/schema.prisma#L783) قريب    | 🟠 | Style Profile + Scope + Pin              | P3 |
| 13.2                                                       | Character          | ❌ لا Rail | ⚠️ [UserCharacter](https://claude.ai/epitaxy/prisma/schema.prisma#L661) عام | 🟠 | ربط بالنطاق (Project/Episode/Scene/Shot) | P3 |
| 13.3                                                       | Element            | ❌ لا Rail | ⚠️ [UserElement](https://claude.ai/epitaxy/prisma/schema.prisma#L679) عام   | 🟠 | ربط بالنطاق                              | P3 |
| 13.4                                                       | Location           | ❌ لا Rail | ⚠️ [UserLocation](https://claude.ai/epitaxy/prisma/schema.prisma#L697) عام  | 🟠 | ربط بالنطاق                              | P3 |
| 13.5                                                       | Color              | ❌ لا Rail | ✅ [UserPalette](https://claude.ai/epitaxy/prisma/schema.prisma#L751) موجود  | 🟡 | ربط بالنطاق                              | P3 |
| 13.6                                                       | Effects            | ❌ لا Rail | ✅ [UserEffect](https://claude.ai/epitaxy/prisma/schema.prisma#L715) موجود   | 🟡 | إضافة Timing/Trigger                     | P3 |
| 13.7                                                       | Camera             | ❌ لا Rail | ✅ [UserCamera](https://claude.ai/epitaxy/prisma/schema.prisma#L733) موجود   | 🟡 | إضافة Camera Spec للـShot                | P3 |
| 13.8                                                       | Sketch             | ❌ لا Rail | ❌ لا نموذج                                                                  | 🟠 | نموذج `SketchAsset` جديد                 | P3 |
| 13.9                                                       | Storyboard اختياري | ❌ لا Rail | ❌ لا نموذج                                                                  | 🟠 | نموذج `StoryboardFrame` جديد             | P3 |

### 4.6 الفيديو الطويل والاستمرارية (المرجع §15-§17)

| # المتطلب تصنيف حالة دليل خطورة إجراء مرحلة معيار قبول  |                                                         |    |   |                                                                                                                                         |    |                                                                                                             |       |                                                       |
| ------------------------------------------------------- | ------------------------------------------------------- | -- | - | --------------------------------------------------------------------------------------------------------------------------------------- | -- | ----------------------------------------------------------------------------------------------------------- | ----- | ----------------------------------------------------- |
| 15.1                                                    | هرمية Episode→Scene→Beat→Shot→GenerationBlock→Take      | هـ | ❌ | لا يوجد أي نموذج من هذه                                                                                                                 | 🔴 | 6 نماذج جديدة في Prisma                                                                                     | P2    | مشروع 5 دقائق يُحلَّل إلى الوحدات بشكل قابل للاستعلام |
| 15.2                                                    | Scheduler يحسب N من `⌈T/Dmax⌉` بعد قراءة قدرات الموديل  | هـ | ❌ | لا يوجد                                                                                                                                 | 🔴 | خدمة `DurationScheduler` تستخدم Capability Adapter                                                          | P4    | خطة 5 دقائق تعرض قبل الخصم                            |
| 15.3                                                    | استراتيجيات Cut/LastFrame/Extension/Hybrid              | هـ | ❌ | لا يوجد                                                                                                                                 | 🟠 | حقل `transitionStrategy` على كل انتقال                                                                      | P4    | كل انتقال يحمل استراتيجية موثقة                       |
| 15.4                                                    | قدرات النماذج من Registry مركزي (لا حرفياً في UI)       | ق  | ⛔ | [page.tsx:476,490-497](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/drama-studio/page.tsx#L476) «Seedance 2.5 (30s)» مكتوبة حرفياً | 🔴 | ربط dropdown بـ [lib/video-models.ts](https://claude.ai/epitaxy/lib/video-models.ts) عبر `useVideoModels()` | P3    | تغيير Registry ينعكس فوراً في UI                      |
| 16.1                                                    | تتبّع Continuity: شخصية/مكان/عناصر/فعل/كاميرا/صوت/تقنية | هـ | ❌ | لا يوجد                                                                                                                                 | 🔴 | نموذج `ContinuitySnapshot` لكل Shot/Block                                                                   | P4    | فحص آلي يُنبّه على تعارض                              |
| 16.2                                                    | `continuityIn` و`continuityOut` لكل وحدة                | هـ | ❌ | لا يوجد                                                                                                                                 | 🔴 | حقلان JSON على `GenerationBlock`                                                                            | P4    | مقارنة `out(N)` مع `in(N+1)` تفشل تنبيهاً             |
| 16.3                                                    | إعادة توليد الوحدة الفاشلة فقط                          | هـ | ❌ | لا يوجد                                                                                                                                 | 🟠 | `regenerate` per-block API                                                                                  | P5    | فشل Shot 3 لا يُعيد Shot 1-2                          |
| 17                                                      | مسارات صوت متعددة + Voice ID للشخصية                    | هـ | ❌ | لا نموذج مسار صوت                                                                                                                       | 🟠 | نموذج `AudioTrack + VoiceProfile`                                                                           | P5→P6 | Timeline متعدد المسارات في Production                 |

### 4.7 الإنتاج والتجميع (المرجع §18)

| # المتطلب تصنيف حالة دليل خطورة إجراء مرحلة معيار قبول  |                                                                  |      |    |                                                                                                                                                                   |    |                                                                                                         |       |                                     |
| ------------------------------------------------------- | ---------------------------------------------------------------- | ---- | -- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -- | ------------------------------------------------------------------------------------------------------- | ----- | ----------------------------------- |
| 18.1                                                    | صفحة `/drama-studio/[projectId]/episodes/[episodeId]/production` | ق    | ❌  | تبويب `production` داخلي فقط بـ prototype [page.tsx:221-230](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/drama-studio/page.tsx#L221)                        | 🔴 | Route Segment كامل                                                                                      | P1→P5 | استعراض الرابط يعمل بمشروع حقيقي    |
| 18.2                                                    | 3 صيغ برومبت + خيارات تطبيق (Later/Current/Range/All)            | ق    | ⚠️ | [page.tsx:42,285-286,354-357](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/drama-studio/page.tsx#L42) `PromptFormat` موجود لكن التبديل يبدّل حرفياً دون Diff | 🟠 | Modal تأكيد مع عرض الأثر والتكلفة                                                                       | P5    | تبديل الصيغة يطلب موافقة نطاق       |
| 18.3                                                    | Quote (min/expected/max) قبل التوليد + Credit Cap                | ق+هـ | ❌  | لا يوجد Quote في الصفحة                                                                                                                                           | 🔴 | استخدام [lib/credit-pricing.ts](https://claude.ai/epitaxy/lib/credit-pricing.ts) + Cap flag على المشروع | P5    | لا يبدأ Job قبل عرض Quote والموافقة |
| 18.4                                                    | Approve/Reject/Regenerate/Trim/Replace وحفظ كل النسخ             | هـ   | ❌  | لا يوجد                                                                                                                                                           | 🔴 | نموذج `Take` + Active version                                                                           | P5    | Take مرفوض يبقى في السجل            |
| 18.5                                                    | Final Render + Preview render                                    | هـ   | ❌  | لا يوجد                                                                                                                                                           | 🟠 | تكامل مع FFmpeg / Reap post-prod                                                                        | P6    | ملف نهائي بدقّة موحّدة              |

### 4.8 Board والسجلات (المرجع §19-§22)

| # المتطلب تصنيف حالة دليل خطورة إجراء مرحلة معيار قبول  |                                                                         |      |    |                                                                                                                                                            |    |                                                                              |       |                                              |
| ------------------------------------------------------- | ----------------------------------------------------------------------- | ---- | -- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -- | ---------------------------------------------------------------------------- | ----- | -------------------------------------------- |
| 19                                                      | Project Board موجود يُعاد استخدامه                                      | ق+غ  | ❌  | [cinema-board](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/cinema-board/page.tsx) prototype آخر بـ useState                                          | 🔴 | **قرار من صاحب المشروع مطلوب:** بناء Board حقيقي أم إعادة استخدام صفحة أخرى؟ | P1    | Board يعرض أصولاً حقيقية للمستخدم            |
| 20                                                      | Model Capability Adapter (min/max duration, resolutions, refs, pricing) | هـ   | ⚠️ | [lib/video-models.ts](https://claude.ai/epitaxy/lib/video-models.ts) قوي لكن ليس Adapter موحّد يخدم Drama Studio                                           | 🟠 | wrapper `DramaModelAdapter` يقرأ من Registry الموجود                         | P1→P4 | UI/Scheduler/Pricing يقرؤون من نفس المصدر    |
| 21.1                                                    | حالات Job كاملة + Idempotency + Retry دون خصم مزدوج                     | هـ   | ⚠️ | [lib/idempotency.ts](https://claude.ai/epitaxy/lib/idempotency.ts) موجود، Generation model يدعم status                                                     | 🟠 | نموذج `GenerationJob` مخصّص لـ Drama مع الحقول المطلوبة (§21.2)              | P5    | إعادة نفس الطلب لا تخصم مرتين                |
| 22                                                      | Quote 3-قيم + Credit Cap + سجلات مركزية                                 | ق+هـ | ⚠️ | [lib/credit-ledger.ts](https://claude.ai/epitaxy/lib/credit-ledger.ts) و[PricingConstitution](https://claude.ai/epitaxy/prisma/schema.prisma#L613) موجودان | 🟠 | ربط Drama Studio بهم عبر خدمة Quote مخصّصة                                   | P5    | كل Job وTransaction يظهر في `/admin/history` |

### 4.9 اللغة والـHero (المرجع §5, §25)

| # المتطلب تصنيف حالة دليل خطورة إجراء مرحلة معيار قبول  |                                                   |      |    |                                                                                                                                   |    |                                                       |    |                                                                 |
| ------------------------------------------------------- | ------------------------------------------------- | ---- | -- | --------------------------------------------------------------------------------------------------------------------------------- | -- | ----------------------------------------------------- | -- | --------------------------------------------------------------- |
| 5                                                       | Hero: فكرة/ملف + Composer + معرض أعمال سعد ستوديو | ق    | ✅  | [page.tsx:407-594](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/drama-studio/page.tsx#L407) — Hero موجود بكل مكوّناته        | 🟢 | **الحفاظ عليه كما هو — المرجع يعتمده صراحة**          | —  | لا تغييرات بدون إذن صريح                                        |
| 5.2                                                     | إرسال يُنشئ `projectId` حقيقي + حفظ الملف         | ق+هـ | ⛔  | [page.tsx:248](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/drama-studio/page.tsx#L248) `handleStartPlanning` يغيّر view فقط | 🔴 | Route `POST /api/drama-studio/projects`               | P2 | Response يعيد projectId والتنقل إلى `/drama-studio/[projectId]` |
| 5.3                                                     | لا خصم فيديو في هذه الخطوة                        | ق    | ✅  | لا يوجد خصم                                                                                                                       | 🟢 | الحفاظ                                                | —  | Ledger لا يُقيَّد بأي شيء عند الإرسال                           |
| 25                                                      | ربط بنظام اللغة المركزي بدون قاموس عشوائي         | ق    | ⚠️ | النصوص العربية مضمّنة في الملف مباشرة بـ ternary `isAr ?`                                                                         | 🟡 | تجميع النصوص في ملف i18n مركزي إن كان النظام يدعم ذلك | P3 | لا نصوص مضمّنة داخل TSX                                         |
| 25                                                      | لكل رسالة/حقل `dir` حسب المحتوى                   | ق    | ✅  | استخدام `dir={isAr ? "rtl" : "ltr"}` متسق في المحتوى، LTR للتخطيط                                                                 | 🟢 | الحفاظ                                                | —  | فحص عيني بالعربية والإنجليزية                                   |

### 4.10 المحظورات (المرجع §0, §2.2)

| # المتطلب تصنيف حالة دليل خطورة إجراء  |                                                       |   |    |                                                                                                                       |    |                                                                                  |
| -------------------------------------- | ----------------------------------------------------- | - | -- | --------------------------------------------------------------------------------------------------------------------- | -- | -------------------------------------------------------------------------------- |
| 0.1                                    | لا نسخ حرفي من Topview (شيفرة/شعارات/قصة/شخصيات/نصوص) | ق | ⚠️ | «Threads of Silence» و«د. سارة» و«المحقق طارق» أسماء **من إبداع Prototype لا من Topview** لكن يجب حذف كل بيانات وهمية | 🟠 | إفراغ كل الـmock data قبل التنفيذ                                                |
| 0.5                                    | لا Hook أو Cliffhanger إلزامي لكل عمل                 | ق | ✅  | لا يوجد في الصفحة                                                                                                     | 🟢 | —                                                                                |
| 2.2                                    | عدم إظهار «1 error» عام                               | ق | ✅  | لم أرَ هذا في الصفحة الحالية                                                                                          | 🟢 | —                                                                                |
| 2.2                                    | عدم ادعاء 100% مع غياب DB/Jobs                        | ق | ⛔  | الصفحة **تعرض** كأنها تعمل بينما لا يوجد Backend                                                                      | 🔴 | حذف بطاقة «Phase 1A Demo» بعد التنفيذ الحقيقي، وإضافة Empty States صادقة قبل ذلك |

---

## 5. تصنيف واضح للتنفيذ الحالي

### 5.1 قابل لإعادة الاستخدام كما هو

- **Hero** [page.tsx:407-594](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/drama-studio/page.tsx#L407) — يبقى بلا تعديل
- **Language system** [lib/use-language.ts](https://claude.ai/epitaxy/lib/use-language.ts) — يفرض LTR بشكل صحيح
- **Model Registry** [lib/video-models.ts](https://claude.ai/epitaxy/lib/video-models.ts) + [lib/video-model-registry.ts](https://claude.ai/epitaxy/lib/video-model-registry.ts) — بنية قوية
- **Credit Ledger** [lib/credit-ledger.ts](https://claude.ai/epitaxy/lib/credit-ledger.ts) + [PricingConstitution](https://claude.ai/epitaxy/prisma/schema.prisma#L613)
- **Idempotency** [lib/idempotency.ts](https://claude.ai/epitaxy/lib/idempotency.ts)
- **Storage** [lib/storage/](https://claude.ai/epitaxy/lib/storage/) — Multi-provider جاهز
- **Admin History/Jobs** [lib/admin/history-read-model.ts](https://claude.ai/epitaxy/lib/admin/history-read-model.ts) + [app/admin/history](https://claude.ai/epitaxy/app/admin/history/page.tsx)
- **Inngest** [lib/inngest/](https://claude.ai/epitaxy/lib/inngest/) للـJobs غير المتزامنة
- **Navigation entry** [lib/navigation.ts:48](https://claude.ai/epitaxy/lib/navigation.ts#L48) — الرابط موجود

### 5.2 يحتاج توسعة

- **UserCharacter / UserElement / UserLocation / UserEffect / UserCamera / UserPalette** — تحتاج ربطاً بـ `projectId` وحالات زمنية
- **CinemaProject-style domain** — يمكن استلهامه لكن Drama يحتاج هرمية أعمق (Episode→Scene→Beat→Shot→GenerationBlock→Take)
- **PromptFormat** الحالي — يوسَّع أو يُفصَل عن `AdaptationMode`
- **Generation lifecycle** — يدعم التوليد لكن يحتاج `GenerationBlock + Take + activeVersion`

### 5.3 يجب بناؤه جديداً

- 7 نماذج ذاكرة (Project Bible, Character Memory, Narrative Timeline, Scene Memory, Continuity Snapshots, Approved Decisions, Version Memory)
- 6 نماذج هرمية (DramaProject, Season, Episode, Scene, Beat, Shot, GenerationBlock, Take)
- `ProjectConversation + Message + Proposal`
- `ContextPacketBuilder` service
- `DurationScheduler` service
- `ContinuityEngine` service
- `StoryboardFrame + SketchAsset`
- Routes: `/drama-studio/[projectId]`, `/drama-studio/[projectId]/episodes/[episodeId]/production`
- APIs: 15 مسار وظيفي (المرجع §24)

### 5.4 يجب حذفه من Prototype (بعد إذن صريح، ليس الآن)

- كل `setTimeout` الوهمية [page.tsx:143,169,253-268](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/drama-studio/page.tsx#L143)
- بيانات "Threads of Silence" الثابتة [page.tsx:82-99,105-116,294-335](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/drama-studio/page.tsx#L82)
- Model dropdown المكتوب حرفياً [page.tsx:476,490-497](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/drama-studio/page.tsx#L476)
- 16 STYLE\_CARDS المضمّنة [page.tsx:384-401](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/drama-studio/page.tsx#L384)
- بطاقة "Phase 1A Demo" [page.tsx:429](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/drama-studio/page.tsx#L429) بعد بناء الحقيقي
- Spam messages عند تغيير Setting [page.tsx:368-380](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/drama-studio/page.tsx#L368)

### 5.5 غير محسوم — يحتاج قرار المستخدم

1. **مسار Project Board الحقيقي** — هل يُبنى جديداً أم يُستبدل [cinema-board](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/cinema-board/page.tsx) الحالي؟
2. **قائمة النماذج المفعلة لـ Drama Studio** — أيّها متاح من Registry؟
3. **حد الباقة للمدة النهائية** (5 دقائق / 10 دقائق / بلا حد)؟
4. **صيغ التصدير والدقة والـCodec** المطلوبة
5. **تصميم Mobile التفصيلي** — لا يوجد بعد
6. **صلاحية الوكيل** — هل يطبّق تعديلات منخفضة المخاطر تلقائياً؟
7. **سياسة الاحتفاظ بالنسخ** والمهلة قبل الحذف

---

## 6. المخاطر مرتبة حسب الأولوية

| # خطر خطورة سبب تخفيف  |                                                                                                                                        |          |                                                |                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------- | -------------------------------------------------------------------------------- |
| R1                     | **الصفحة الحالية تُوهم بالإكمال** — Prototype يوحي أن Drama Studio يعمل بينما لا يوجد Backend                                          | 🔴 حاسم  | 1524 سطر UI بلا API واحد                       | إضافة بانر Prototype واضح، أو منع الوصول العام حتى Phase 2                       |
| R2                     | **قوائم الموديل مكتوبة حرفياً في UI** [page.tsx:476,490](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/drama-studio/page.tsx#L476) | 🔴 حاسم  | كسر مباشر لقاعدة Registry المركزي (§20)        | ربط فوري بـ [lib/video-models.ts](https://claude.ai/epitaxy/lib/video-models.ts) |
| R3                     | **لا ذاكرة مشروع دائمة** — كل شيء `useState`                                                                                           | 🔴 حاسم  | يجعل الفيديو الطويل مستحيلاً                   | Phase 2 إلزامي قبل أي UI جديد                                                    |
| R4                     | **لا Hierarchy لـ Episode/Scene/Shot/Block/Take**                                                                                      | 🔴 حاسم  | يمنع بناء 5 دقائق من قطع                       | Phase 2 نماذج جديدة                                                              |
| R5                     | **Project Board غير موجود** رغم اعتماد المرجع عليه                                                                                     | 🔴 حاسم  | متطلب صريح غير قابل للحل بدون قرار             | AskUserQuestion فوري                                                             |
| R6                     | **Voice Agent يتشارك Prisma diff** مع Drama                                                                                            | 🟠 مرتفع | خلط تعديلات؛ Rollback أحد المشاريع يعقّد الآخر | نصح بفصل branches قبل commit                                                     |
| R7                     | **الدردشة setTimeout مزيفة** — تُخدع المستخدم                                                                                          | 🟠 مرتفع | UX سيّئ + عدم مصداقية                          | Phase 3 استبدال بـ LLM حقيقي                                                     |
| R8                     | **AdaptationMode ≠ PromptFormat**                                                                                                      | 🟠 مرتفع | خلط مفهومي — سيؤدي لبرومبتات خاطئة             | Phase 1 فصل المفهومين في التصميم                                                 |
| R9                     | **`cinema-board`** **prototype آخر** قد يُخلط مع Board الحقيقي                                                                         | 🟡 متوسط | حسم مسار Board قبل البدء                       | القرار #1                                                                        |
| R10                    | **نصوص عربية مضمّنة في TSX** — صعوبة الترجمة والصيانة                                                                                  | 🟡 متوسط | زيادة تكلفة التغيير                            | Phase 3 نقل إلى i18n مركزي                                                       |

---

## 7. القرارات المطلوبة قبل التنفيذ

قبل الدخول إلى Phase 1، أحتاج قرارات صريحة على:

**Q1.** **Project Board:** هل يُبنى مكوّن جديد باسم "Drama Board" مرتبط بـ `projectId`؟ أم يعاد استخدام [cinema-board](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/cinema-board/page.tsx) بعد إعادة بنائها؟ أم مسار ثالث؟

**Q2.** **النماذج المفعّلة لـ Drama Studio:** ما القائمة من [lib/video-models.ts](https://claude.ai/epitaxy/lib/video-models.ts) المسموح ظهورها في Drama تحديداً؟ (Veo 3.1، Gemini Omni، Kling 3.0، Seedance، Wan…) وأيها Default؟

**Q3.** **حد المدة الأقصى** للحلقة/الفيلم بحسب الباقة (Starter/Plus/Pro/Max)؟

**Q4.** **صيغ التصدير النهائية:** MP4/MOV؟ 720p/1080p/4K؟ H.264/H.265؟

**Q5.** **Mobile:** هل نأجّل تصميم Mobile حتى Wireframe منفصل، أم يكفي حماية عدم القص وإظهار زر بديل؟

**Q6.** **صلاحية الوكيل:** هل نسمح بتطبيق تعديلات منخفضة المخاطر تلقائياً (تعديل وصف مشهد)، أم كل تعديل يحتاج Approve؟

**Q7.** **الاحتفاظ:** كم مدة الاحتفاظ بـ Rejected Takes قبل الحذف التلقائي (7 يوم / 30 يوم / بلا حذف)؟

**Q8.** **Prisma Diff الحالي:** التعديلات الحالية غير المثبتة كلها Voice Agent + Drama Studio كملف واحد. هل نُثبِّت Voice Agent أولاً قبل Drama، أم يمر كل شيء عبر Feature branches منفصلة؟

**Q9.** **حالة Prototype الحالي:** هل نخفي `/drama-studio` عن المستخدمين حتى ينضج (feature flag)، أم نُبقيها ظاهرة مع بانر "Preview"؟

**Q10.** **صلاحية الفصل السردي:** المرجع يذكر Beat كوحدة بين Scene وShot. هل نبني Beat كنموذج مستقل، أم نُدمجه كحقل داخل Scene؟

---

## 8. خريطة المراحل المقترحة (شروط الدخول/الخروج)

### Phase 1 — تصميم وعقود فقط

- **الدخول:** موافقة صريحة على هذا التقرير + إجابات Q1–Q10
- **العمل:** Wireframes للصفحات الثلاث، JSON Schemas لمخرجات الوكيل، Capability Adapter contract، مخطط بيانات منطقي مطابق للـSchema الموجود
- **الخروج:** مراجعة Wireframes + مصادقة على المخطط قبل بدء أي كتابة كود

### Phase 2 — الأساس الدائم (قاعدة بيانات + Persistence)

- **الدخول:** Phase 1 معتمدة
- **العمل:** Prisma migrations (نماذج المشروع، الحلقة، المشهد، Beat، اللقطة، البلوك، Take، الذاكرات السبع، Proposal، Conversation)
- **الخروج:** Migration تشغّل على DB مطابقة، قراءة/كتابة يعمل، لا صفحة UI جديدة بعد

### Phase 3 — Workbench + الأدوات + Storyboard الاختياري

- **الدخول:** Phase 2 معتمدة + Empty States صادقة
- **العمل:** 5 تبويبات + 9 أدوات + Storyboard 3 أوضاع + Project Board integration + ذاكرة حقيقية + Chat مربوطة بـ LLM
- **الخروج:** Refresh لا يفقد شيئاً، Chat فعلي، جميع الإعدادات محفوظة

### Phase 4 — التخطيط والاستمرارية

- **الدخول:** Phase 3 معتمدة
- **العمل:** DurationScheduler، ShotPlanner، ContextPacketBuilder، ContinuityEngine، Quote 3-قيم
- **الخروج:** خطة 5 دقائق تُعرض قبل الخصم، continuity check ينبّه على تعارض

### Phase 5 — الإنتاج

- **الدخول:** Phase 4 معتمدة
- **العمل:** Inngest jobs، Takes، Version selection، Production editor، Timeline صوت، QC، Regenerate per-block
- **الخروج:** Take واحد يُنتَج وينحفظ، Refresh يستعيد الحالة، فشل شوت لا يُعيد الحلقة

### Phase 6 — التجميع والأدمن

- **الدخول:** Phase 5 معتمدة
- **العمل:** Preview render + Final render + Export + Admin monitoring
- **الخروج:** نسخة نهائية تُصدَّر، كل Job وTransaction يظهر في Admin

---

## 9. قائمة الملفات المتوقعة (لا تُنشأ الآن)

**Prisma:**

- `prisma/migrations/[timestamp]_drama_studio/migration.sql`
- إضافات على [prisma/schema.prisma](https://claude.ai/epitaxy/prisma/schema.prisma) بعد `MobileTelemetryEvent`

**Routes (App Router):**

- `app/(dash)/(routes)/drama-studio/[projectId]/page.tsx`
- `app/(dash)/(routes)/drama-studio/[projectId]/episodes/[episodeId]/production/page.tsx`
- (اختياري) `app/(dash)/(routes)/drama-studio/[projectId]/board/page.tsx` — بحسب Q1

**APIs (15 مسار):**

- `app/api/drama-studio/projects/route.ts` (create/list)
- `app/api/drama-studio/projects/[projectId]/route.ts` (get/update)
- `app/api/drama-studio/projects/[projectId]/messages/route.ts`
- `app/api/drama-studio/projects/[projectId]/proposals/route.ts`
- `app/api/drama-studio/projects/[projectId]/plan/route.ts`
- `app/api/drama-studio/projects/[projectId]/characters/route.ts`
- `app/api/drama-studio/projects/[projectId]/locations/route.ts`
- `app/api/drama-studio/projects/[projectId]/elements/route.ts`
- `app/api/drama-studio/projects/[projectId]/storyboard/route.ts`
- `app/api/drama-studio/projects/[projectId]/episodes/[episodeId]/quote/route.ts`
- `app/api/drama-studio/projects/[projectId]/episodes/[episodeId]/generate/route.ts`
- `app/api/drama-studio/projects/[projectId]/episodes/[episodeId]/blocks/[blockId]/regenerate/route.ts`
- `app/api/drama-studio/projects/[projectId]/episodes/[episodeId]/render/route.ts`
- `app/api/drama-studio/projects/[projectId]/export/route.ts`
- `app/api/drama-studio/upload/route.ts`

**Services (lib):**

- `lib/drama-studio/context-packet-builder.ts`
- `lib/drama-studio/duration-scheduler.ts`
- `lib/drama-studio/continuity-engine.ts`
- `lib/drama-studio/adaptation-modes.ts`
- `lib/drama-studio/model-adapter.ts` (wrapper على video-models.ts)
- `lib/drama-studio/proposal-engine.ts`
- `lib/inngest/functions/drama-generation.ts`

**Components:**

- `components/drama-studio/agent-chat.tsx`
- `components/drama-studio/workbench-tabs.tsx`
- `components/drama-studio/creative-tools-rail.tsx` (9 أدوات)
- `components/drama-studio/storyboard-panel.tsx`
- `components/drama-studio/production-timeline.tsx`
- `components/drama-studio/take-picker.tsx`
- `components/drama-studio/quote-widget.tsx`

**Refactor:**

- تقسيم [app/(dash)/(routes)/drama-studio/page.tsx](https://claude.ai/epitaxy/app/\(dash\)/\(routes\)/drama-studio/page.tsx) إلى ملف Hero فقط \~300 سطر

---

## 10. قائمة الاختبارات المطلوبة

### 10.1 اختبارات وحدة (Unit)

- `duration-scheduler.test.ts` — حساب N من (T, Dmax) بحالات حافّة
- `context-packet-builder.test.ts` — تجميع الحزمة من ذاكرات مختلفة
- `continuity-engine.test.ts` — كشف تعارض `in/out`
- `adaptation-modes.test.ts` — 3 أوضاع بمخرجات مختلفة
- `model-adapter.test.ts` — قراءة قدرات من Registry
- `proposal-engine.test.ts` — Diff generation

### 10.2 اختبارات تكامل (Integration)

- إنشاء Project → حفظ Draft → Refresh → استرجاع كامل
- Chat: إرسال رسالة → LLM يرد → حفظ في DB
- Proposal: اقتراح تعديل → Approve → تغيير Project Bible + سجل قرار
- Quote: طلب Quote 5-دقائق → عرض min/expected/max قبل الخصم
- Generation: Job → Take → Approve → Active version
- Regenerate: فشل Block-3 → إعادة توليده فقط دون Block-1/2
- Idempotency: نفس Request مرتين → خصم واحد

### 10.3 اختبارات E2E (Playwright)

- Hero → إدخال فكرة → إنشاء Project → توجيه للـWorkbench بمسار `[projectId]`
- Workbench: تنقل بين 5 تبويبات + استخدام الـ9 أدوات
- Storyboard 3 أوضاع (No/Keyframes/Full)
- بناء حلقة 5 دقائق حتى Final Render (بموديل mock سريع)
- Refresh على أي شاشة → لا فقدان حالة
- تبديل اللغة (AR/EN) → التخطيط يبقى Agent يسار / Workbench يمين
- فشل Block → إعادة توليد جزئية

### 10.4 اختبارات الحوكمة

- محاولة توليد بموديل غير مفعّل في Registry → رفض واضح
- محاولة تجاوز Credit Cap → إيقاف قبل الخصم
- كل GenerationJob يظهر في `/admin/history` مع Ledger entry مطابق
- Prisma seed + migration reversible

---

## 11. خلاصة تنفيذية

**الحكم المعماري:**

- ✅ **البنية التحتية المؤسسية موجودة وقوية** — Model Registry، Pricing Constitution، Credit Ledger، Idempotency، Storage، Admin History، Inngest، User Libraries. Drama Studio يمكن أن يقف على هذه الأعمدة.
- ⛔ **الصفحة الحالية Prototype كامل** يخالف المرجع في 4 مواطن حرجة: قوائم موديل حرفية، دردشة setTimeout، بيانات Threads of Silence ثابتة، صفر Persistence.
- ❌ **الطبقة الخلفية لـ Drama Studio صفر** — لا نموذج Prisma واحد، لا API واحد، لا خدمة واحدة.
- 🟢 **Hero معتمد ويعمل** — لا يُمَسّ.
- 🔴 **10 قرارات مطلوبة** من صاحب المشروع قبل الدخول لـ Phase 1.

**التوصية:**

1. الإجابة على Q1–Q10 قبل أي عمل تنفيذي
2. تجميد أي تعديل على Drama Studio حتى موافقة على Phase 1
3. اعتبار الصفحة الحالية Prototype للعرض فقط، وإخفاؤها من التنقل العام أو وضع بانر "Preview" واضح
4. عدم خلط Voice Agent (الجاهز) مع Drama Studio (المُقتَرَح) في نفس PR

**توقفت هنا. لن أبدأ أي تنفيذ حتى موافقة صريحة على Phase 1 والقرارات المطلوبة.**