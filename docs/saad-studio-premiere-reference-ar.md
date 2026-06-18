# مرجع Saad Studio لتكامل Premiere وReap

آخر مراجعة: 2026-06-18

هذا الملف هو المرجع التشغيلي المختصر للمحادثات اللاحقة. عند التعارض، تكون الأولوية للوثائق الرسمية، ثم لاختبارات Runtime المثبتة داخل Premiere، ثم للمرجع المعماري v3.1.

المرجع المحلي الكامل v3.1 هو `C:\Users\PC\Downloads\المرجع.md`. هوية النسخة المقروءة كاملة بتاريخ 2026-06-18: `25,858` بايت، `531` سطرًا، آخر تعديل `2026-06-06 01:59:15`، وSHA-256: `9D0F1DE093A0C4D19FB6F0B85F3C038F1AFA7BDF738A8C0D5E6A03789498168D`.

تنبيه حالة: قسم `PHASE N — NEXT TASK ONLY` داخل v3.1 يوثق مرحلة تاريخية سبقت التنفيذ الحالي، ولا يُعامل كأمر بإلغاء أو منع Multi-Cam وSilence Removal الموجودتين الآن. تبقى قواعده المعمارية وقواعد السلامة نافذة، بينما تُقرأ حالة الإنجاز من الكود الحالي و`PROJECT_CONTEXT.md` ونتائج Runtime.

## بيئة التشغيل والحقائق المعروفة

- إصدار المضيف المستهدف: **Premiere Pro 26.2.0**.
- التكامل الحالي: **CEP Extension** باستخدام ExtendScript، وليس UXP.
- **FFmpeg مطلوب** للتحليل الصوتي خارج Premiere.
- اكتشاف نشاط المتحدث في Multi-Cam يعتمد قياسات **RMS**.
- أداتا **Multi-Cam Auto Switch** و**Silence Removal** فعّالتان.
- **Reap API** مسار منفصل عن تنفيذ المونتاج داخل Premiere.

## فصل نطاقي العمل

- **Reap API**: خدمة خارجية لإنتاج المقاطع القصيرة، captions، reframing، dubbing، transcription والنشر الاجتماعي. ليست محرّك تبديل كاميرات الـ timeline، ولا نعتمد عليها لتحليل نشاط متحدثي Multi-Cam في الإصدار الأول.
- **Premiere CEP (Saad Studio)**: يقرأ ويعدّل مشروع Premiere عبر ExtendScript. تحليل الصوت الحقيقي يتم خارج Premiere بواسطة FFmpeg، ثم تُحوّل نتائجه إلى قرارات timeline.

## آلية Multi-Cam Auto Switch

1. قراءة الـ active sequence وتخطيط مسارات الفيديو والصوت.
2. تعيين متحدث لكل مسار صوت وكاميرا لكل مسار فيديو، دون تثبيت Host/Guest.
3. استخراج `ProjectItem.getMediaPath()` لكل مصدر صوت. لا تخمين عند غياب المسار أو وجود nested/mixed source غير مدعوم.
4. تحليل المصادر بواسطة FFmpeg (`astats`/RMS)، لأن Premiere scripting لا يوفّر RMS أو waveform أو speaker activity حقيقية.
5. تحويل زمن المصدر إلى زمن الـ timeline:
   `timelineTimeSec = clip.start.seconds + (ffmpegTimeSec - clip.inPoint.seconds)`.
6. إنشاء speaker-activity segments، ثم camera decisions مع threshold، dominance margin، hysteresis، minimum shot length، overlap/wide-shot rules.
7. محاذاة القرارات إلى frames/ticks قبل التنفيذ.
8. تطبيق التحرير فقط بعد Runtime Proof واضح. لا يوجد Razor/Split API موثّق نعتمد عليه.

## حقائق Premiere المؤكدة

- `Sequence.clone()` ينشئ نسخة ويعيد Boolean وفق مرجع Sequence الرسمي؛ يجب العثور على النسخة الناتجة عبر فرق `sequenceID`/عدد sequences، لا التعامل مع قيمة الإرجاع ككائن Sequence.
- `Sequence.insertClip(projectItem, time, vTrackIndex, aTrackIndex)` و`Sequence.overwriteClip(...)` موثقتان، لكن يلزم اختبار Runtime قبل الاعتماد الإنتاجي.
- `TrackItem.disabled` يعطل المقطع كاملًا، وليس جزءًا زمنيًا داخله؛ لذلك لا يحل وحده مشكلة مقطع كاميرا طويل غير مقسّم.
- `clip.start/end` زمن timeline، و`clip.inPoint/outPoint` زمن المصدر.
- `sequence.timebase` هو ticks per frame، وثابت Premiere هو `254016000000` ticks/second.
- لا نفترض دعم تبديل multicam angles برمجيًا، ولا نخلط كود UXP مع CEP.
- JSX يجب أن يقتصر على قراءة/كتابة Premiere وإرجاع JSON؛ FFmpeg ومنطق القرارات يبقيان في طبقة TypeScript مستقلة.

## السلوك الحالي الذي وصل إليه التطوير

- توجد ملاحة وأدوات Multi-Cam Auto Switch وSilence Removal داخل إضافة CEP.
- التنفيذ الحالي يستخدم `createSubClip` و`overwriteClip` لإعادة بناء أجزاء مطلوبة بدل Razor غير الموجود.
- السلوك الحالي في worktree ينظّم العناصر المولّدة في Project Panel تحت bin رئيسي باسم `Saad Studio - <Premiere Project Name>` ثم bin فرعي لكل أداة، ومنها `Multi-Cam Auto Switch` و`Silence Removal`.
- عند تشغيل الأداة، تُنقل العناصر القديمة المعروفة من جذر المشروع إلى bin الأداة المناسب.
- عناصر Runtime Proof تُفصل في bin مستقل ولا تُخلط بمخرجات الأدوات الإنتاجية.

## Reap: المعلومات المحفوظة

- Base URL: `https://public.reap.video/api/v1/automation/`
- متغيرا البيئة: `REAP_API_KEY` و`REAP_API_BASE=https://public.reap.video/api/v1/automation`؛ لا تُحفظ قيمة المفتاح في المستودع أو الذاكرة.
- المصادقة: `Authorization: Bearer YOUR_API_KEY`
- الحد المعلن: 10 requests/minute/key.
- دورة الرفع: طلب presigned URL من `/get-upload-url`، رفع الملف، إنشاء project، ثم webhook أو status polling.
- يدعم clipping، captions، reframing، dubbing (80+ لغة)، transcription، والنشر/الجدولة.
- صيغ الإدخال المعلنة: MP4 أو MOV، من دقيقتين إلى 3 ساعات، وحتى 5GB.
- حالات المشروع: `queued`, `processing`, `completed`, `failed`, `invalid`, `expired`.
- webhooks مفضلة على polling في الإنتاج؛ endpoint عبر HTTPS ويرد 200 خلال 5 ثوانٍ، وخمس محاولات فاشلة تعطل webhook.
- Reap مفيد لمسار ClipCraft/short-form، لكنه لا يغيّر قواعد تنفيذ Multi-Cam داخل Premiere.

### حدود Reap وتوجيه مزودي الموديلات

- Google models تتصل بالمصدر الرسمي Google مباشرةً.
- Seedance v2 يتصل بالمصدر الرسمي BytePlus مباشرةً.
- OpenAI models تتصل بالمصدر الرسمي OpenAI مباشرةً.
- بقية موديلات الفيديو تستخدم `kie.ai` كمصدر افتراضي تلقائي.
- Reap ليس مزود توليد ولا بديلًا عن هذه المصادر؛ يقتصر على AI Clipping وAuto Reframe وCaptions وTranslation وDubbing وBrand Templates وWebhooks وSocial-ready outputs.
- يُمنع استخدام Reap لتوليد فيديو من نص أو صورة.

### بنية التخزين ودورة Reap

- Vercel للاستضافة والنشر، Clerk للمصادقة وإدارة المستخدمين، Neon قاعدة PostgreSQL الرئيسية لجميع البيانات الديناميكية، وCloudflare R2 لتخزين الميديا فقط.
- Neon يحفظ المستخدمين والكريديتات والاشتراكات والسجلات وبيانات التوليد وCMS وبيانات مهام Reap وحالات webhooks وmetadata الملفات، لكنه لا يحفظ ملفات الميديا نفسها.
- الصور والفيديوهات والمخرجات والملفات المولدة ونتائج Reap النهائية تحفظ في R2.
- الملفات الكبيرة تُرفع من العميل مباشرة إلى R2 عبر Signed URLs؛ يُمنع تمريرها عبر Next.js API routes.
- المسار المعتمد: رفع الفيديو إلى R2 ← حفظ metadata في Neon ← إرسال رابط الفيديو إلى Reap ← استقبال webhook وتحديث الحالة ← جلب النتيجة أو حفظ رابطها ← تخزين الناتج النهائي في R2 ← تحديث Neon بالملفات والحالة النهائية.

## مرجع معماري من AutoCut V4.60.2

تمت مراجعة الحزمة المحلية `C:\Users\PC\AppData\Local\AutoCut\current\resources\app.asar` قراءةً فقط. النتائج المثبتة من الحزمة نفسها:

- هوية النسخة المتحقق منها بتاريخ 2026-06-18: الحجم `97,862,233` بايت، آخر تعديل `2026-06-02 21:38:23`، وSHA-256: `EAC5FE19B7FCFD769B6983AE0F1DA3ADFEA5A9A7124247A47302E4FFAADD94B0`. إذا تغيّرت البصمة، تُعاد المراجعة قبل اعتماد الاستنتاجات على النسخة الجديدة.

- التطبيق غلاف Electron 35، والحزمة تحتوي 8,571 ملفًا، أغلبها dependencies. كود التطبيق المحلي الفعلي متمركز في `packages/main/dist/index.js` و`packages/preload/dist/index.mjs`.
- التطبيق لا يضم خوارزميات المونتاج كاملة داخل `app.asar`. عند التشغيل يجلب إعدادات وروابط إصدارات، ثم ينزّل `main.cjs` لخادم host وينزّل compute scripts حسب المهمة. لذلك لا يمكن استنتاج خوارزمية Silence/Multi-Cam كاملة من هذه الحزمة وحدها.
- المعمارية مفصولة إلى أربع طبقات:
  1. واجهة ويب/remote frontend داخل Electron.
  2. Electron main process للتحديثات والتنزيلات والنوافذ.
  3. `com.autocut.hostServer` للتخاطب مع تطبيق المضيف/الإضافة.
  4. `com.autocut.compute` للمهام الثقيلة مع API مثل `startTask`, `killTasks`, `getProgress`.
- الاتصال بين الطبقات يتم عبر Node IPC داخل مجلد مؤقت `com.autocut/com.autocut.aea`.
- AutoCut ينزّل نسخًا خاصة به من `ffmpeg` و`ffprobe` حسب نظام التشغيل والمعمارية، يتحقق من وجودهما/حداثتهما، ويخزنهما تحت userData. هذا يؤكد نمط: **Premiere host adapter منفصل عن compute/FFmpeg**.
- إعدادات التشغيل تتضمن روابط مستقلة للواجهة، onboarding، compute، host server، تنزيل Premiere (`PPRO_DOWNLOAD_URL`) وتنزيل DaVinci؛ أي أن تطبيق سطح المكتب موزّع orchestrator لعدة مضيفين.
- preload يعرّض bridge باسمَي `__autocut_preload__` و`__electron_preload__`، ويتضمن filesystem، child processes، downloads، FFmpeg setup، IPC وcookies. هذا تصميم قوي لكنه واسع الصلاحيات؛ في Saad Studio يجب إبقاء الجسر أصغر وتقييد العمليات والمدخلات قدر الإمكان.
- الخلاصة القابلة لإعادة الاستخدام: نعتمد الفصل نفسه مفاهيميًا في Saad Studio — UI، Premiere adapter، task/compute service، FFmpeg — لكن لا ننسخ كود AutoCut أو endpoints الخاصة به.

## قواعد لا تُكسر

- لا نخمن Premiere APIs أو media paths أو audio streams.
- لا نقرأ audio gain ونعتبره RMS.
- لا نخفي blockers ولا نزيّف Runtime Proof.
- لا نستخدم Reap أو AI diarization لتحليل Multi-Cam v1.
- لا ننفذ قرارات غير محاذاة للإطار.
- لا نغيّر الأصل عندما يكون سير العمل المتفق عليه safe duplicate؛ أي استثناء لاحق يجب أن يكون قرارًا صريحًا ومختبرًا.
- لا نغيّر ربط Google أو BytePlus أو OpenAI أو `kie.ai` عند إضافة Reap.
- لا نمرر الفيديوهات الكبيرة عبر Next.js API routes، ولا نخزن ملفات الميديا داخل Neon.

## المصادر

- Reap Getting Started: https://docs.reap.video/help-center/getting-started
- Reap API Introduction: https://docs.reap.video/api-reference/1_introduction
- Reap documentation index: https://docs.reap.video/llms.txt
- Premiere Sequence reference: https://raw.githubusercontent.com/docsforadobe/premiere-scripting-guide/master/docs/sequence/sequence.md
- المرجع المحلي الكامل v3.1: `C:\Users\PC\Downloads\المرجع.md`
