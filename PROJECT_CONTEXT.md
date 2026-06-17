# Saad Studio — Project Context

آخر تحديث: 2026-06-17

هذا الملف هو الذاكرة التشغيلية الدائمة للمشروع. اقرأه كاملًا قبل بدء أي مهمة، خصوصًا بعد اختصار أو امتلاء سياق المحادثة. حدّثه بعد كل تغيير مهم أو قرار معماري أو نتيجة اختبار، مع إبقائه مختصرًا ودقيقًا. لا تنسخ المحادثات إليه؛ سجّل الحقائق التي يحتاجها الوكيل التالي لمواصلة العمل.

عند امتلاء السياق:

> Read `PROJECT_CONTEXT.md` and continue work.

## قواعد العمل الدائمة

- قبل أي مهمة اقرأ بالترتيب: `AGENTS.md`، ثم هذا الملف، ثم `docs/saad-studio-premiere-reference-ar.md`. لا تبدأ التنفيذ قبل إكمال القراءة.
- افحص الكود والحالة الحالية قبل التعديل، ولا تعتمد على تخمين آلية الإضافة.
- حافظ على تعديلات المستخدم والتعديلات غير المرتبطة بالمهمة، ولا تستبدلها أو تتراجع عنها.
- بعد كل مهمة حدّث هذا الملف، وحدّث مرجع Premiere/Reap إذا تغيرت المعمارية أو آلية السلوك، وسجّل الأخطاء والقرارات.
- عند التعارض تكون الأولوية: الوثائق الرسمية، ثم Runtime Proof داخل Premiere، ثم المرجع المحلي، ثم الافتراضات الموثقة.
- لا تعتبر build ناجحًا أو سلوك Premiere مثبتًا دون نتيجة اختبار فعلية.

## صورة المشروع

- المشروع تطبيق Next.js 14/SaaS ويحتوي إضافة Adobe CEP في `adobe/saadstudio-cep`.
- إصدار Premiere Pro المستهدف والمستخدم كحقيقة معروفة هو `26.2.0`.
- تكامل Premiere يستخدم ExtendScript في `adobe/saadstudio-cep/jsx/index.jsx` وواجهة TypeScript في مجلد `client`.
- FFmpeg مطلوب. تحليل نشاط المتحدث يتم خارج Premiere بالاعتماد على RMS؛ JSX مسؤول عن قراءة/كتابة Premiere وإرجاع JSON.
- Reap مسار منفصل لصناعة المقاطع القصيرة وميزات captions/reframing/dubbing، وليس محرك Multi-Cam داخل Premiere.

## قواعد Premiere المؤكدة

- لا يوجد Razor/Split API موثق نعتمد عليه؛ التنفيذ الحالي يعيد بناء الأجزاء باستخدام `createSubClip` و`overwriteClip`.
- `clip.start/end` زمن timeline، و`clip.inPoint/outPoint` زمن المصدر.
- تحويل تحليل FFmpeg إلى timeline:
  `timelineTimeSec = clip.start.seconds + (ffmpegTimeSec - clip.inPoint.seconds)`.
- لا يُعامل audio gain كأنه RMS، ولا تُخمن مسارات الوسائط أو streams.
- لا يُخلط CEP مع UXP، ولا تُفترض إمكانات QE غير المثبتة باختبار Runtime.
- الأصل الآمن للأدوات المدمرة هو العمل على نسخة sequence، إلا إذا تقرر خلاف ذلك صراحة واختُبر.

## الحالة الوظيفية الحالية

- Multi-Cam Auto Switch فعّال.
- Silence Removal فعّال.
- توجد شاشة Podcast داخل إضافة CEP وبها أيضًا Synchronize، بينما Auto Zoom قيد التطوير.
- Multi-Cam وSilence Removal ينشئان ProjectItems/Subclips، ويجب جمع المخرجات داخل bins بدل تركها في جذر Project Panel.
- الكود الحالي غير المحفوظ ينظم المخرجات تحت bin رئيسي باسم:
  `Saad Studio - <Premiere Project Name>`
- توجد bins فرعية بحسب الأداة، منها: `Multi-Cam Auto Switch`، `Silence Removal`، `Auto Zoom`، `Sequences`، `Captions`، `Generated Media`، `Remove Background`، و`Runtime Proof`.
- مخرجات Runtime Proof لها bin مستقل ولا ينبغي خلطها بمخرجات الأدوات الإنتاجية.

## تعديلات العمل غير المحفوظة عند إنشاء هذا الملف

لا تتراجع عن هذه التعديلات دون طلب صريح من المستخدم:

- `adobe/saadstudio-cep/client/src/pages/multi-cam-auto-switch.ts`
  - واجهة Auto Zoom وحالات التحليل والتطبيق.
- `adobe/saadstudio-cep/client/src/lib/podcast/services/auto-zoom-service.ts`
  - ملف جديد غير متتبع لخدمة Auto Zoom.
- `adobe/saadstudio-cep/jsx/index.jsx`
  - منطق Auto Zoom وتنظيم ProjectItems داخل bins باسم المشروع/الأداة.
- `app/(dash)/(routes)/clipcraft-studio/page.tsx`
  - الصفحة الرئيسية للمشروع واللوحات الخاصة بالأدوات.
- مجلدات المسارات الفرعية:
  - `app/(dash)/(routes)/clipcraft-studio/captions/page.tsx`
  - `app/(dash)/(routes)/clipcraft-studio/dubbing/page.tsx`
  - `app/(dash)/(routes)/clipcraft-studio/reframe/page.tsx`
  - `app/(dash)/(routes)/clipcraft-studio/transcription/page.tsx`
  - `app/(dash)/(routes)/clipcraft-studio/edit-videos/page.tsx`
  - `app/(dash)/(routes)/clipcraft-studio/audiogram/page.tsx`
  - تم إنشاؤها لتعمل كصفحات/مسارات حقيقية منفصلة في المتصفح ترتبط بالراوتر بدلاً من الاقتصار على الحالة الافتراضية SPA.
- `app/(dash)/(routes)/studio-edit/page.tsx`
  - تعديل موجود مسبقًا؛ افحص diff قبل لمسها.

## آخر إنجاز معروف

- تمت إضافة تنظيم مخرجات Premiere داخل bins لتقليل فوضى Project Panel.
- المرجع التشغيلي لـPremiere وReap ومراجعة AutoCut محفوظ في:
  `docs/saad-studio-premiere-reference-ar.md`.
- **تصميم وتكامل صفحات ClipCraft Studio الست**: تم استبدال الواجهة القديمة المعتمدة على النماذج الضيقة بواجهة كاملة العرض (`full-width`) وشاشات مخصصة تفاعلية ومحاكية تمامًا للنموذج المرئي (mockup) للـ 6 أدوات (AI Captions، AI Dubbing، Auto Reframe، Transcription، AI Video Editor، Audiograms) مع تحسين الستايلات لتكون متحركة بشكل مصغر (mini-animated/compact) ومميزة بصريًا.

## ما يحتاج تحققًا لاحقًا

- تشغيل build واختبارات TypeScript بعد اكتمال التعديلات الحالية.
- إثبات Auto Zoom داخل Premiere Runtime، خصوصًا `qe.project.newAdjustmentLayer` وتوقيعه وإضافة Transform/keyframes.
- التحقق بصريًا من أن جميع مخرجات الأدوات تذهب إلى bin الصحيح ولا تُنقل عناصر المستخدم.
- التأكد من أن تغيير اسم bin الرئيسي من `Saad Studio Generated` إلى `Saad Studio - <Project Name>` هو السلوك النهائي المرغوب.

## الأخطاء المكتشفة

- تم اكتشاف خطأ 404 (Not Found) في مسارات الـ API الخاصة بالـ Storyboard (`/api/assets` و `/api/runninghub/storyboard-production/safety-check`) نتيجة غياب تهيئة `export const dynamic = "force-dynamic"`.
- تم إصلاح أخطاء استدعاء أيقونات `lucide-react` في صفحة `clipcraft-studio` (`Film`, `Target`, `FolderOpen`, `Sliders`).

## القرارات المتخذة

- ملفات الذاكرة الثلاثة إلزامية القراءة قبل كل مهمة، وليس فقط مهام Premiere.
- `PROJECT_CONTEXT.md` هو سجل الحالة المستمر، بينما `docs/saad-studio-premiere-reference-ar.md` مرجع المعمارية والسلوك.
- فرض تهيئة `dynamic = "force-dynamic"` في جميع مسارات الـ API التي تستدعي `auth()` أو تتطلب معالجة ديناميكية لمنع حدوث مشاكل 404 في بيئة الإنتاج المعتمدة على Next.js Standalone.

## سجل مختصر

- 2026-06-17: إنشاء الذاكرة الدائمة وربطها بتعليمات Codex. تسجيل المرجع، قواعد Premiere، وحالة worktree الحالية.
- 2026-06-17: إلزام قراءة ملفات الذاكرة الثلاثة قبل كل مهمة وتحديث السجلات بعدها. تثبيت Premiere Pro 26.2.0 وCEP وFFmpeg/RMS وفعالية Multi-Cam وSilence Removal وفصل Reap كحقائق معروفة.
- 2026-06-17: إعادة بناء وتصميم واجهة ClipCraft Studio وتصميم 6 صفحات احترافية وتفاعلية كاملة العرض للأدوات الست وحل مشاكل استدعاء الأيقونات المفقودة بنجاح.
- 2026-06-17: إصلاح مشاكل الـ 404 لصفحة Storyboard Studio عن طريق إدراج `force-dynamic` في مسارات الـ API المتأثرة (`assets`, `assets/persist`, `storyboard-production`, `safety-check`) والتحقق من سلامة البناء.
- 2026-06-17: ربط صور الـ 3D Avatars للـ Voices وتوسيع قائمة اللغات بإدراج أعلام الدول (flags) وتعيين اللهجة الافتراضية إلى لهجة مصر العربية بنجاح في شاشة ClipCraft Studio.
- 2026-06-17: تحسين تجربة الرفع وإتاحة زر "Upload Your Own File" و "Upload New File" بوضوح أعلى مساحة العمل في شاشة ClipCraft Studio لتسهيل الانتقال لرفع الفيديو والصوت والصور الخاصة بالمستخدم.


