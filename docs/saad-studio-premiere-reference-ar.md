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
- Synchronize يقرن TrackItems الصوتية والمرئية بحسب مسار المصدر نفسه، لا بحسب تساوي رقم V مع رقم A، ثم يحلل waveform خارج Premiere.
- تحليل Synchronize يمتد حتى 15 دقيقة ويستخدم بحث ارتباط خشن بدقة 1 ثانية ثم دقيق بدقة 0.1 ثانية. اتجاه lag المعتمد هو `targetStart = referenceStart - lag`.
- توثيق Premiere يعرّف `TrackItem.move(Time)` كإزاحة نسبية، لكن Runtime في 26.2.0 أعطى `Invalid parameter` للإزاحة أو عاد دون تغيير الزمن عند تمرير موضع مطلق؛ لذلك لا يعتمد Synchronize عليه.
- إذا نتج start سالب لمصدر صحيح، تُزاح المجموعة المتزامنة كلها للأمام. التطبيق يكتب `TrackItem.start/end` الموثقتين read/write بالقيم المطلقة مع حفظ المدة والتحقق من القيم بعد الكتابة.
- يمنع Synchronize التطبيق إذا كانت ثقة الارتباط أقل من `0.08` أو كان موضع البداية المقترح سالبًا/غير صالح، ويتحقق من `clip.start` بعد النقل بهامش 0.05 ثانية.
- عداد `Applied` في الواجهة يحسب التسجيلات/الأزواج المتزامنة، بما فيها المرجع، ولا يعرض عدد TrackItems الصوتية والمرئية التي تحركت داخليًا. تبقى `clipsMoved` في نتيجة Runtime عدادًا تقنيًا للتشخيص.
- تم إثبات هذا السلوك داخل Premiere Runtime بتاريخ 2026-06-18: حالة أربعة تسجيلات متزامنة عرضت `Applied: 4 clips` بنجاح.
- تدقيق 2026-06-18 أثبت أن حد `0.08` وآلية البحث الحالية غير كافيين: نافذة تداخل دنيا 10 ثوانٍ ضمن بحث 15 دقيقة قد تنتج قمة زائفة عالية حتى لصوتين غير مرتبطين. لذلك حالة `Offsets ready` الحالية ليست Runtime Proof ولا يجوز تطبيقها قبل اختبارات known-lag وfalse-positive وعينات الصوت الفعلية.
- التنفيذ الحالي يستخدم `createSubClip` و`overwriteClip` لإعادة بناء أجزاء مطلوبة بدل Razor غير الموجود.
- السلوك الحالي في worktree ينظّم العناصر المولّدة في Project Panel تحت bin رئيسي باسم `Saad Studio - <Premiere Project Name>` ثم bin فرعي لكل أداة، ومنها `Multi-Cam Auto Switch` و`Silence Removal`.
- عند تشغيل الأداة، تُنقل العناصر القديمة المعروفة من جذر المشروع إلى bin الأداة المناسب.
- Auto Zoom لا يفترض أن إنشاء Adjustment Layer موجود حصرًا على QE؛ يفحص Runtime لكل من `app.project.newAdjustmentLayer` و`qe.project.newAdjustmentLayer` ويستخدم المسار المتاح فقط بعد التحقق من ProjectItem الناتج.
- Auto Zoom الحالي يستخرج أحداثه من cuts الموجودة في مسار الفيديو المختار. غياب cuts يبقى تحذيرًا ولا يؤدي إلى توليد zooms دورية عشوائية.
- أثبت Runtime في Premiere 26.2 غياب دالتي إنشاء Adjustment Layer على `app.project` و`qe.project`. لذلك Auto Zoom يستخدم `direct-transform` كـfallback: يضيف تأثير Transform ومفاتيح Scale قابلة للتعديل مباشرة إلى clips التي تغطي cuts المختارة. يبقى مسار Adjustment Layer اختياريًا إذا ظهر في Runtime آخر.
- غياب cuts يمنع Apply؛ لا تُولد zooms دورية أو عشوائية على sequence خام.
- Multi-Cam يمنع إعادة Apply على sequence يحمل marker ` - Saad Auto Switch Draft`. لا يُضاف هذا marker إلى الحارس العام لأن Silence Removal يجب أن يبقى قادرًا على معالجة Draft الـMulti-Cam.
- إخراج Multi-Cam على duplicate يفضّل video track فارغًا؛ عند عدم وجوده يستخدم أعلى track قابل للكتابة داخل النسخة فقط، مع warning، بدل إنشاء clone ثم الفشل وترك Draft فارغ.
- منع التكرار دفاعي في طبقتين: Host JSX يرفض Draft، والواجهة ترفض الاسم نفسه وتقفل Apply بعد أول نتيجة حتى Analyze جديد. قبل Apply تعيد الواجهة تحميل ملف JSX لضمان استخدام النسخة المثبتة.
- Runtime Proof بتاريخ 2026-06-18 أثبت أن fallback `direct-transform` يظهر `Runtime: Ready` في Premiere 26.2؛ لم يُختبر تطبيق التأثير بعد لأن sequence الخام لم يحتوِ cuts.
- عناصر Runtime Proof تُفصل في bin مستقل ولا تُخلط بمخرجات الأدوات الإنتاجية.

### مرجع مقتطف Synchronization المرفق

- المرفق `pasted-text.txt` المقروء بتاريخ 2026-06-18 حجمه `5,209` بايت وSHA-256 هو `37C89A2A048DA07202DD348F67432DD61418443BF24A728BBA04B7C9553993C2`.
- يؤكد اتجاه التنفيذ الحالي: جمع مقاطع الفيديو المتاحة ثم مطابقتها بالصوت عبر `findPairedVideoClip` ومسار المصدر، حساب `suggestedTimelineStartSec = referenceStart - estimatedLagSec`، تحويل الثقة الأقل من `0.08` إلى blocker، استدعاء `normalizeSynchronizationStarts`، ورفع حد نافذة التحليل من 45 إلى 900 ثانية.
- المرفق ناتج diff مدمج: يجمع بدائل قديمة وجديدة مكررة وتوجد فيه أقواس/تواقيع ناقصة؛ لذلك هو مرجع دلالي وليس نسخة مصدر قابلة للبناء. عند التعارض تُقدّم حالة الكود الحالي ثم Runtime Proof.

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
## حارس تحليل Multi-Cam Draft (2026-06-19)

- أي active sequence يحتوي اسمه `Saad Auto Switch Draft` لا يجوز إرساله إلى FFmpeg/RMS ولا إعادة Preview أو Apply عليه.
- `Analyze Timeline` مسموح له بقراءة layout الخفيف فقط لاكتشاف الاسم، ثم يعيد blocker `ACTIVE_SEQUENCE_IS_AUTO_SWITCH_DRAFT_SELECT_SOURCE_SEQUENCE`.
- واجهة الإنتاج تعطل Analyze/Preview/Apply بعد اكتشاف الـDraft وتطلب اختيار source sequence مثل `Synced Sequence`. هذا يمنع التحليل الطويل والنسخ المتسلسلة، من دون حذف أي sequence قديم تلقائيًا.
## مزامنة Active Sequence مع واجهة Podcast (2026-06-19)

- تبقي صفحة Podcast مراقبًا خفيفًا كل 1000ms لهوية الـActive Sequence عبر diagnostics، من دون تحليل وسائط أو FFmpeg.
- عند تغير `sequenceId` أو الاسم تُلغى كل النتائج المخزنة الخاصة بالـSequence السابق قبل السماح بـAnalyze/Preview/Apply على الجديد؛ ويشمل ذلك Sync وMulti-Cam وSilence Removal وAuto Zoom وإثباتات الصوت.
- يتوقف المراقب تلقائيًا عند إزالة الصفحة من DOM، ولا يستعلم أثناء تنفيذ أداة إنتاجية لتجنب تداخل طلبات Host.
## توزيع أربع كاميرات وAuto Zoom QE (2026-06-19)

- عند وجود V1 عامة وV2 مقدم وV3 ضيف وV4 ضيف ثانٍ: لا يُعامل صوت الكاميرا العامة كمتحدث؛ يُترك Ignore، وتُربط ميكروفونات الأشخاص بـV2/V3/V4، وتُربط `Wide` بـV1. الكاميرا العامة تُستخدم عند تداخل الكلام وفق الخطة الحالية؛ إذا بقيت Unmapped فلن تظهر.
- لا يجوز افتراض تطابق فهرس DOM `track.clips` مع فهرس QE `getItemAt`. Auto Zoom يطابق QE item بزمن بداية TrackItem، ثم يعيد قراءة DOM TrackItem بعد `addVideoEffect` قبل البحث عن Transform/Scale.
- نتيجة build وحدها ليست Runtime Proof؛ يلزم إثبات `effectsApplied > 0` على duplicate sequence.
## إعادة تهيئة Camera Mapping (2026-06-19)

- Camera Mapping حالة مرتبطة بالـSequence ولا يجوز نقلها تلقائيًا إلى Sequence آخر. عند تغير الهوية تُمسح الخرائط وحالة التدخل اليدوي.
- بعد Analyze فقط، وإذا لم يلمس المستخدم الخرائط، يُعيّن المسار المسمى Wide كـ`wide` ولا يُعامل مسار الصوت ذي الفهرس نفسه كمتحدث. بقية الأصوات تُربط بمسار فيديو مناظر فقط إن كان فعليًا ويحمل clips؛ المسارات الزائدة تبقى Ignore.
## تصحيح دورة حياة Camera Mapping (2026-06-19)

- لا تُمسح اختيارات Camera Mapping عند انتقال Premiere تلقائيًا من source sequence إلى الـDraft الناتج؛ مسحها يجعل كل الحقول Ignore فورًا ويمنع مراجعة الإعدادات.
- تُبطل فقط نتائج التحليل والتنفيذ المرتبطة بهوية الـSequence. خرائط المستخدم تبقى محفوظة داخل جلسة الصفحة، ولا تُنشأ خرائط افتراضية بافتراض تطابق أرقام الصوت والفيديو.

## مرجع AutoSplice المفتوح المصدر (2026-06-19)

- المصدر المحلي: `E:\Multi-Cam Auto Switch\autosplice-main\autosplice-main`، ترخيص MIT، ومعمارية CEP + FFmpeg/RMS + QE DOM. التوافق المعلن Premiere 22–25، لذلك لا يُفترض توافقه مع 26.2.0 بلا Runtime Proof.
- منطق المتحدث المفيد: حساب RMS لكل إطار، اختيار الأعلى فقط عندما يتجاوز فرق الطاقة حساسية crosstalk، إبقاء قرار المتحدث خلال الغموض القصير (hysteresis)، ثم دمج القرارات الأقصر من Minimum Shot Length.
- الكاميرا العامة في المرجع قرار مستقل عن speaker mapping: تُدرج دوريًا وفق frequency محدد، لا بوصف صوتها متحدثًا. يمكن تكييف هذا المنطق مع Wide=V1 في Saad Studio.
- تطبيق المونتاج المرجعي يستخدم QE razor لكل الحدود ثم lift للفيديو غير النشط مع إبقاء الصوت؛ لا يُعتمد مباشرة لأنه يعدل الـactive sequence. قاعدة Saad Studio تبقى: duplicate آمن، ثم تحقق قبل/بعد.
- Auto Zoom غير منفذ في المصدر الحالي. وثيقة التصميم فقط تقترح استخدام المكوّن المدمج Motion وخاصية Scale بدل إضافة Transform؛ هذا اتجاه اختبار محتمل وليس حقيقة Runtime.

## ضمان Minimum Shot Length (2026-06-19)

- قيمة Minimum Shot Length جزء من هوية خطة Preview؛ تغييرها يبطل الخطة السابقة ويفرض إعادة Preview قبل Apply.
- بعد تكوين الفترات وملء الفجوات، تُزال القرارات الأقصر من الحد تكراريًا: بين كاميرتين متطابقتين تُدمج الثلاثة، وإلا تُضم الفترة القصيرة إلى الجار الأنسب. بعدها يجب ألا يبقى قرار قصير إلا إذا كانت الخطة كلها قرارًا وحيدًا أقصر من الحد.
- توجد بوابتان: مولد الخطة يعيد `MINIMUM_SHOT_LENGTH_NOT_ENFORCED` عند خرق invariant، وHost يرفض Apply بـ`MINIMUM_SHOT_LENGTH_NOT_ENFORCED_AT_RUNTIME` إذا أدى تقاطع مصدر الفيديو إلى مقطع إخراج أقصر من القيمة المطلوبة.
## ثبات مسار تحليل Auto Zoom

- قيمة Analyze Track حالة صريحة في الواجهة، ويجب إسنادها إلى خاصية DOM `HTMLSelectElement.value` بعد إنشاء الخيارات؛ صفة HTML `value` وحدها لا تختار option عند إعادة الرسم.
- التحليل يستقبل `analyzedVideoTrackIndexes` ويحصر اكتشاف cuts في المسار المختار. تحفظ النتيجة الفهارس التي حُللت، ويستخدم Apply الفهارس نفسها لضمان عدم اختلاف مسار التحليل عن مسار التنفيذ.
- تغيير Analyze Track يلغي تحليل Auto Zoom السابق ويستلزم Analyze جديدًا قبل Apply؛ لا يجوز تطبيق نتيجة تحليل لمسار على مسار آخر.

## تنفيذ Auto Zoom عبر Motion Scale

- في Premiere 26.2 المسار الأساسي هو خاصية `Scale` داخل المكوّن المدمج `Motion` على TrackItem؛ لا يحتاج هذا المسار إلى إضافة تأثير جديد عبر QE.
- البحث يعتمد `matchName` (`ADBE Motion` و`ADBE Scale`) و`displayName` مع fallback موضعي `components[1].properties[1]` للمضيف المتوافق. يستخدم Transform عبر QE كاحتياط فقط.
- أزمنة مفاتيح Scale هي أزمنة timeline، وتُقيد بحدي بداية ونهاية clip. لا يجوز وضع مفتاح بعد نهاية TrackItem.
- معيار Runtime Proof هو `effectsApplied > 0` مع ظهور تغير Scale/المفاتيح داخل Effect Controls؛ اكتشاف cuts وحده لا يثبت نجاح Auto Zoom.
- في Direct Motion يبقى `adjustmentLayersInserted=0` لأن التعديل يقع على TrackItem نفسه؛ الواجهة يجب أن تعرض `effectsApplied` بوصفه نتيجة النجاح ولا تصف الصفر كفشل.
- Rhythm يحدد عدد أحداث الزوم بالتقريب: `round(cutCount × rhythm)` بحد أدنى حدث واحد عند وجود cuts، وتوزع الأحداث المختارة على امتداد القائمة. مثال: 3 cuts عند 60% تعطي تأثيرين.
## سياسة اعتماد مراجع Podcast Automation

- `Auto-Editor` مرجع خوارزمي لـSilence Removal: تحليل loudness، تكوين ranges، margin/padding، ودمج المقاطع القصيرة. لا يُنسخ منه إخراج timeline؛ يبقى تنفيذ Premiere عبر duplicate وإعادة بناء المقاطع والتحقق العددي.
- `Adobe CEP Samples` مرجع لبنية CEP والاتصال بين الواجهة وExtendScript وإدارة lifecycle، وليس مرجعًا لخوارزمية مزامنة أو قص.
- وثائق `Create a multi-camera source sequence` تصف workflow والخيارات المتوقعة للمزامنة؛ لا تُعامل كإثبات لواجهة scripting غير مذكورة في مرجع Premiere API.
- مراجع active-speaker/multitrack مفيدة لقواعد RMS، crosstalk margin، hysteresis، minimum shot، وإدراج wide camera. يجب التحقق من الترخيص والتوافق مع Premiere 26.2 قبل تكييف التنفيذ.
- مشاريع MCP قد تعمل عبر واجهة خارجية أو UXP أو QE غير موثق؛ لا تُستخدم في CEP إلا بعد تحديد طبقة المضيف ومطابقة عمليات Motion Scale/Position مع Runtime Proof.
- `One Click Podcast Edit` طبقة orchestration: Sync (إن كان مثبتًا) → Multi-Cam → Silence Removal → Auto Zoom → تحقق → تصدير اختياري. كل مرحلة تُرجع نتيجة قابلة للتوقف والاستئناف، وتعمل على duplicate آمن؛ فشل مرحلة لا يبرر متابعة المراحل التالية تلقائيًا.

### ترتيب One Click وفق سير العمل التحريري العام

- يُفصل بين **Multicam setup** (تجميع المصادر المتزامنة) وبين **camera switching** (قرارات الزوايا). الترتيب المحافظ للأتمتة هو: `Synchronize/setup → Silence/content cleanup → Multi-Cam switching → Auto Zoom/effects`.
- إزالة الصمت تعديل بنيوي يغيّر الزمن؛ لذلك تسبق القرارات الجمالية المعتمدة على timestamps. الزوم والمؤثرات تأتي بعد تثبيت بنية المحتوى. يمكن أن يتداخل content edit وcamera switching يدويًا، لكن الـOrchestrator الآلي يحتاج ترتيبًا حتميًا.
- السطر القديم الذي وضع Multi-Cam قبل Silence يمثل البنية التجريبية السابقة، وليس معيارًا عالميًا. قبل تغيير التنفيذ يلزم Regression يثبت أن ناتج Silence Removal يحافظ على كل مسارات الميكروفونات والكاميرات المطلوبة لتحليل المتحدث النشط.
## Auto Zoom للبودكاست: Cut-Based مقابل Emphasis-Based

## تنويع اللقطة العامة في Multi-Cam

- اللقطة العامة ليست محصورة في تداخل كلام متحدثين. بعد تثبيت قرارات المتحدث ودمج اللقطات القصيرة، يُقسّم أي تشغيل متصل لكاميرا متحدث يتجاوز 45 ثانية بإدخال Wide cutaway مدته 4 ثوانٍ، أو `Minimum Shot Length` إن كانت أكبر.
- لا يُدرج cutaway إن كان سيترك ذيلًا أقصر من `Minimum Shot Length`. القرار حتمي وقابل للمعاينة، ويُطبق فقط عند تعيين Wide Camera فعليًا.
- `wideCameraTimeSec` يُحسب من قرارات `speakerId=wide` وليس من رقم Track ثابت.

- التنفيذ الحالي cut-based: يستخرج حدود TrackItems من مسار الفيديو المختار، ينتقي نسبة منها عبر Rhythm، ويكتب Motion Scale. هذا مناسب للزوم عند تغيّر اللقطة، لكنه لا يكتشف التشديد الصوتي داخل لقطة طويلة.
- التصميم المقترح v2 emphasis-based: استخراج envelope/RMS للصوت، اكتشاف peaks البارزة نسبةً إلى baseline محلي، دمج peaks المتقاربة، تطبيق cooldown، ثم تحويل زمن الصوت إلى timeline قبل إنشاء مفاتيح Motion Scale.
- نطاقات اختبار أولية وليست حقائق مثبتة: Scale 108–115%، دخول 8–15 frame، hold 1–3s، خروج تدريجي، وفاصل 4–6s قبل zoom جديد. يجب تثبيت default عبر fixtures ومشاهدة فعلية على 25fps ومعدلات أخرى.
- لا يُستخدم face tracking أو Position في Scale-only v1. إعادة التأطير بالوجه ميزة مستقلة تتطلب إحداثيات موثقة، smoothing، crop safety، واختبار كتابة Position في Premiere 26.2.
- لا يُقبل نجاح setter وحده كدليل بصري؛ التحقق يشمل عدد keyframes، قيمها وأزمنتها، واختبار playback عند event times.
## ما ثبت من مرجع AutoCut AutoZoom المرئي

- واجهة AutoCut تفصل بين تواتر/كثافة الزومات، مقدار الزوم، ونمط الحركة، وتعرض ثلاثة أنماط مرئية: `Cut` و`Smooth` و`Snap-In`.
- المنتج يعرض Preview/Processing قبل النتيجة، ويترك المادة الأصلية مع مخرجات مرئية على مسار أعلى في اللقطات المعروضة. يُعتمد من ذلك مبدآن فقط: فصل الإعدادات، ومسار تطبيق غير هدّام قدر الإمكان.
- الفيديو التسويقي لا يكشف خوارزمية اختيار أزمنة الزوم ولا يثبت استخدام RMS أو peaks أو Adjustment Layer بعينه. لا تُحوّل هذه الأمور إلى حقائق معمارية بلا توثيق أو Runtime Proof.
- في Premiere 26.2 يبقى Motion > Scale هو المسار المثبت حاليًا في Saad Studio. الانتقال إلى مسار علوي مولّد يحتاج إثبات أن إنشاء العنصر وكتابة تأثيراته متاحان وموثوقان في CEP/QE على الإصدار المستهدف.
## قواعد تخطيط وتنفيذ Auto Zoom

- تجربة الاستخدام الإنتاجية زر واحد: `Run Auto Zoom` ينفذ Auto-detect ثم Inspect ثم Apply. الإعدادات الأساسية ليست خطوة مطلوبة من المستخدم؛ يُعاد فرض preset محافظ عند كل تشغيل: Rhythm 60%، zoom multiplier 1.12، مدة 1.5 ثانية، وSmooth. تعرض الواجهة هذه القيم كحقول قراءة فقط.
- عند تشغيل Auto Zoom فوق مسار `Saad Auto Switch` المولد، تُستبعد تلقائيًا حدود المقاطع التي يكون مصدرها Wide Camera. تُقرأ هوية المصدر من اسم `Saad Auto Switch Vn` وتُقارن بتعيين Wide الحالي؛ الزوم يُخصص للقطات المتحدثين ولا يوضع على اللقطة العامة.
- لضمان بقاء الهوية بعد إعادة فتح Premiere أو تبديل الـSequence، تُوسم اللقطة العامة عند توليدها باسم `Saad Auto Switch WIDE Vn ...`. الاستبعاد الأساسي يعتمد هذا الوسم الدائم، بينما مقارنة Vn بتعيين Wide في الواجهة fallback إضافي فقط. المسودات القديمة السابقة لهذا الوسم لا تصلح لاختبار الاستبعاد.

- أحداث النسخة cut-based تبدأ عند بدايات TrackItems الداخلية فقط؛ لا تُعامل نهاية مقطع مع فجوة كحدث مستقل. قبل تطبيق Rhythm تُستبعد الأحداث التي تتداخل نوافذها وفق `Zoom Duration`.
- يُختار Style واحد لكل عملية Apply. تدوير عدة أنماط داخل العملية الواحدة ممنوع لأنه يجعل المعاينة والنتيجة غير قابلتين للتنبؤ.
- `Maximum Zoom` نسبة مضاعفة لقيمة Scale الحالية، وليست قيمة مطلقة تفترض 100%. مثال: Scale أصلي 50% مع Zoom 1.3 ينتج 65% ثم يعود إلى 50%.
- كل Style يجب أن يبقى محصورًا داخل نافذة الحدث ويعيد Scale الأصلي عند النهاية: Jump انتقال شبه فوري، Smooth دخول وخروج تدريجيان، وSnap-in انتقال أسرع. يمنع استخدام قيمة Static على المقطع كله لتنفيذ حدث زوم مؤقت.
- يجب أن يسبق Runtime Proof اختبار fixture لمنع التداخل واستعادة القيمة، ثم تُفحص المفاتيح فعليًا في Effect Controls على duplicate نظيف.
## مرجع PremiereGPTBeta الديناميكي

- مجلد التثبيت ليس مصدر التنفيذ الكامل؛ الـloader يحقن حزمة بعيدة من `api.premierecopilot.com/api/snake3`، ودوال JSX الإنتاجية تُجلب حسب الاسم من endpoint `/jsx`.
- AutoZoom فيه يفصل مرحلة القرار عن Premiere mutation: تصدير صوت + قراءة بنية Sequence → تحليل خادمي → نتيجة قرارات → جلب `AUTOZOOM_main` وتنفيذها في Premiere.
- حقول القرار المرئية تشمل cuts وemotion وspeech وrandom وcontext، إضافة إلى rhythm وfastness وzoom amount وmotion camera وX/Y والأنماط الثلاثة. هذا يثبت شكل pipeline والـinputs، ولا يثبت خوارزمية الخادم أو طريقة keyframes الداخلية.
- عند الاستفادة منه في Saad Studio، يُكيّف المبدأ محليًا: توليد `ZoomDecision[]` موثقة من timeline/audio، Preview قبل Apply، ثم Motion Scale/Position مثبت في Premiere 26.2. لا يُعتمد remote code injection كمعمارية للمسار الحساس.
- فتح Effect Controls أو تحديد TrackItem يدويًا مسموح كاختبار تطوير فقط؛ لا يدخل ضمن UX النهائي. Auto Zoom الإنتاجي مسؤول عن اكتشاف الهدف وكتابة المفاتيح والتحقق منها تلقائيًا.
## الاكتشاف التلقائي لمسار Auto Zoom

- لا تعتمد الأداة على track index محفوظ في الواجهة لأن هوية/بنية الـSequence قد تتغير. Host يفحص كل مسارات الفيديو ويحسب أحداث القص من بدايات TrackItems الداخلية، ثم يختار المسار صاحب أكبر عدد من الأحداث؛ التعادل يُحسم للمسار الأعلى.
- دورة الإنتاج زر واحد: Auto-detect → Inspect → Apply. اختيار track أو clip وفتح Effect Controls ليست خطوات للمستخدم.
- إن لم يوجد cut داخلي على أي مسار، تتوقف الأداة برسالة `AUTO_ZOOM_TRACK_WITH_CUTS_NOT_FOUND` بدل اختيار V1 افتراضيًا أو الادعاء بالنجاح.
## قواعد مستفادة من JumpCut وSoundBuddy

- لا يُنقل كود JumpCut (GPL-3.0) أو SoundBuddy Studio (AGPL-3.0) إلى Saad Studio. المسموح هو إعادة تنفيذ مبدأ عام بصورة مستقلة مع fixture وRuntime Proof.
- زمن الانتقال القصير لا يُثبت على 30fps؛ تُقرأ مدة الفريم من `Sequence.timebase`، ثم من `Sequence.getSettings().videoFrameRate`، مع fallback 25fps للمضيف المستهدف.
- استدعاء `addKey` و`setValueAtKey` ليس إثبات نجاح. إذا كان `ComponentParam.getKeys()` متاحاً، يجب أن تحتوي القراءة اللاحقة كل الأزمنة المطلوبة ضمن سماحية 0.002 ثانية؛ وإلا يُعد الحدث فاشلاً ولا يزاد `effectsApplied`.
- Beat tracking الموسيقي (مثل `librosa.beat.beat_track` في SoundBuddy) ليس بديلاً مثبتاً لـSpeech Emphasis. لا يُستخدم لتوقيت Zoom للبودكاست من دون نموذج/fixture صوت كلام ومعيار قبول منفصل.
## إثبات قيمة Auto Zoom والمعاينة

- `ComponentParam.getKeys()` يثبت الأزمنة فقط. عند توفر `getValueAtKey` أو `getValueAtTime` يجب مقارنة قيمة كل مفتاح بالقيمة المطلوبة؛ وجود مفاتيح كلها على Scale الأصلي ليس Zoom ناجحاً.
- بعد تطبيق ناجح يُنقل Player Position تلقائياً إلى ذروة أول حدث Zoom. هذه معاينة آلية لا تدخل يدوي، وتمنع اختبار النتيجة عند موضع بعيد عن نافذة الزوم القصيرة.
- رسالة النجاح تعرض أزمنة الأحداث التي طُبقت فعلياً. لا يُعرض `effectsApplied > 0` إذا فشل readback للزمن أو القيمة.
## تحويل زمن معاينة Auto Zoom

- أزمنة قرارات Auto Zoom ومفاتيح Motion Scale هي أزمنة Timeline. أما `Sequence.setPlayerPosition()` فيتأثر بـ`Sequence.zeroPoint`؛ لذلك لا يجوز تمرير ticks المحسوبة من زمن Timeline مباشرة عندما تكون نقطة الصفر غير صفرية.
- موضع المعاينة يُحسب هكذا: `playerTicks = max(0, timelineTicks - zeroPointTicks)`. يطبق هذا التحويل على تحريك رأس التشغيل للمعاينة فقط، ولا يُطرح zero point من أزمنة مفاتيح Scale.
- ظهور Scale=100 في Effect Controls خارج نافذة الزوم لا يثبت فشل الكتابة. الإثبات الصحيح يكون عند ذروة حدث مطبق وبعد نجاح readback للأزمنة والقيم.
- نقل Player Position لا يغير المقطع المحدد في Premiere. لكي تكون المعاينة الآلية صادقة، يجب أن تحدد الأداة TrackItem صاحب الحدث بعد النقل؛ وإلا قد يعرض Effect Controls المقطع السابق عند حد القطع رغم وجود المفاتيح على المقطع التالي.

## قرار Auto Captions للبودكاست (2026-06-20)

- يُمنع ربط بطاقة Podcast `Auto Captions` بأداة Captions/Reap الموجودة دون طلب صريح من المستخدم؛ المساران منفصلان معماريًا.
- التفعيل السابق للربط أُلغي بالكامل قبل النشر. البطاقة تبقى `Coming soon` إلى أن يُبنى مسار مستقل داخل Premiere بمواصفات عربية صريحة واختبارات قبول.
- المتطلب المؤكد الوحيد حاليًا: دعم العربية. لا يُفترض مزود التفريغ، شكل الواجهة، أو آلية إدراج captions قبل مراجعة الأدلة والاتفاق على السلوك.

## سلوك Podcast Auto Captions المثبت من مرجع AutoCut

- المصدر الرسمي: https://knowledge.autocut.com/en/category/autocaptions-uzkb1n/ والمقالات المرتبطة به (مراجعة 2026-06-20).
- الدورة المرجعية: تحديد لغة الصوت أو استيراد SRT، إنشاء transcript، مراجعة الكلمات، تقسيم/دمج caption chunks، اختيار النمط والموقع، ثم إضافة captions إلى Premiere.
- العربية مدعومة صراحة، ومنها Arabic (Iraq). يجب اختبار RTL والخط العربي والتشكيل وعلامات الترقيم داخل Premiere؛ ذكر اللغة وحده لا يثبت جودة الرندر.
- البودكاست متعدد المتحدثين: مسارات صوت منفصلة، اختيار مسار كل متحدث وتوليد ومراجعة وتنسيق captions له، ثم التكرار للمتحدث التالي. لا تُفترض diarization تلقائية.
- الحد الأدنى المستقل: اختيار مسارات الصوت من Sequence، تفريغ عربي بمزود مستقل عن Reap، محرر transcript/chunks، أنماط قابلة للحفظ، position/size، ثم إدراج Caption Track أو مخرج رسومي قابل للتحرير.
- خيارات النمط المثبتة تشمل الخط والألوان وإبراز الكلمة المنطوقة والخلفية والانتقالات والتنسيق والحدود وعدد الأسطر والعرض الأقصى والموضع وsafe areas وحفظ preset.
- القيود الحالية: add-captions.ts وtranscription.ts مبنيان على Reap، ولا يوجد مزود تفريغ مستقل في Podcast؛ لا تُفعّل البطاقة قبل اختيار مزود عربي وتنفيذ fixture وRuntime Proof على Premiere 26.2.
## حفظ الـ Mappings والـ Fallback في Auto Zoom (2026-06-20)

- الـ sequence watcher لا يقوم بمسح state.mappings عند الانتقال من الـ source sequence إلى الـ Draft sequence الناتج منها (e.g. Synced Sequence - Saad Auto Switch Draft).
- في حال كان اختيار الكاميرا العامة (Wide) غير محدد (
ull) في الـ mappings، يقوم الـ Auto Zoom تلقائيًا باستبعاد المسار 0 (V1) كـ fallback افتراضي لحماية اللقطات العامة من الزومات العشوائية.


## دعم اللغات وإزالة الكي فريمز العشوائية للـ Playhead في Auto Zoom (2026-06-20)

- دالة `findAutoZoomTransformComponent` تجمع الآن `matchName` و`displayName` معاً لضمان اكتشاف تأثير Transform تحت أي لغة واجهة (مثل العربية "تحويل").
- دالة `findAutoZoomMotionScaleProperty` تطابق خاصية المقياس بالاسم الثابت `"ADBE Motion Scale"` بجانب الأسماء الافتراضية.
- لتفادي الكي فريمز العشوائية التي يضعها Premiere تلقائياً عند موضع الـ playhead الحالي عند تشغيل الساعة `setTimeVarying(true)`، يتم استدعاء `removeKeyRange` على نطاق المقطع كاملاً لتنظيف الخصائص قبل كتابة مفاتيح الزوم الفعالة.
