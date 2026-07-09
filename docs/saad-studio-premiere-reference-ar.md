# مرجع Saad Studio لتكامل Premiere وReap

## التوجيه التلقائي الذكي والتوحيد لموديل Seedream 5.0 Pro (2026-07-09)
- **آلية العمل**: تم دمج وتوحيد خيار موديل **Seedream 5.0 Pro** في واجهة توليد الصور (`app/(dash)/(routes)/image/page.tsx`) كخيار واحد موحد (`seedream/5-pro`).
- **التوجيه التلقائي**: يقوم الخادم (`app/api/generate/image/route.ts` و `app/api/image/generate/route.ts`) بفحص المدخلات تلقائياً:
  - في حال إرسال نص فقط، يتم توجيه الطلب تلقائياً للموديل النصي `seedream/5-pro-text-to-image`.
  - في حال رفع صورة مرجعية أو أفتار، يتم توجيه الطلب تلقائياً لموديل الصور `seedream/5-pro-image-to-image`.
- **التسعير والحدود**: تم دمج الموديلين تحت فئات التسعير المناسبة ومزامنتهما في قاعدة البيانات، مع دعم أهلية الاستخدام اللامحدود لباقات الاشتراك الاحترافية.

## التوجيه التلقائي الذكي لموديلات Seedance 2.0 و Mini لتفادي قيود الأمان (2026-07-09)
- **آلية العمل**: تم دمج سلوك توجيه تلقائي ذكي في خادم المشروع (`app/api/video/route.ts` و `app/api/panel/generate/video/route.ts`) للتعامل مع قيود رفع الصور والأفتار في موديلات Seedance من المصدر (BytePlus).
- **التوجيه لـ KIE**: عند قيام المستخدم أو المشترك برفع أي صورة مرجعية، أفتار، صورة فريم أول أو أخير، يتم توجيه الطلب تلقائياً إلى منصة `kie.ai` لإنتاج الفيديو لتجنب سياسات الرفض والتصفية الصارمة للمصدر.
- **التوجيه للمصدر (BytePlus)**: في حال كان الطلب نصياً فقط (Text-to-Video) بدون أي صور أو وسائط مدخلة، يتم تمرير الطلب تلقائياً للمصدر الرسمي (BytePlus ModelArk) لتوفير التكلفة وضمان سرعة الاستجابة.
- **تكامل موديل Mini**: تم إدراج خرائط التوجيه وتوافق البيانات الخاصة بموديل `bytedance/seedance-2-mini` لضمان عمل الفحص والتوليد بشكل متكامل بدون أخطاء.

## إضافة ميزة تعديل الفيديو الحقيقي (Video-to-Video Editing) عبر Gemini Omni Flash (2026-07-08)
- **رفع الفيديو الأساسي (Base Video Upload)**: تم تزويد واجهة صفحة الرسم للتوليد (`app/(dash)/(routes)/apps/tool/draw-to-video/page.tsx`) بالقدرة على رفع مقاطع فيديو كخلفية (بصيغ mp4, webm, mov) جنباً إلى جنب مع الصور.
- **مشغل الفيديو التفاعلي والربط بالفرشاة**: عند رفع فيديو، يظهر مشغل فيديو HTML5 تفاعلي خلف لوحة الرسم، مع التزام بأبعاد الكود ونسب العرض لتطابق نظام إحداثيات الفرشاة تماماً. كما يتوقف الفيديو تلقائياً فور بدء المستخدم بالرسم لتحديد المنطقة المراد تعديلها (Masking).
- **التحكم بالتشغيل والمعاينة**: تم إضافة أزرار تشغيل وإيقاف مؤقت (Play/Pause) في شريط الأدوات العائم لتسهيل اختيار الفريم الدقيق للتعديل.
- **دمج الفريمات والتعديل الذكي**: يقوم النظام بالتقاط الفريم النشط الحالي من الفيديو ودمجه مع طبقة الرسم الملونة لإرسالها كإدخال أولي (`image_url`) مع تمرير ملف الفيديو الأصلي بالكامل كـ `video_url` لطلب التعديل من خلال موديل **Gemini Omni Flash** (بمهمة `edit_video` بالـ Backend) لإنتاج فيديو جديد معدل كلياً ومدمج بصرياً.

## إضافة معرض أعمال الاستوديو ودعم رفع الصور والفيديوهات بالنسب الأصلية (2026-07-08)
- **معرض أعمال الاستوديو (Studio Creations Feed)**: تم تصميم وإدراج قسم تفاعلي جديد في صفحة اكتشف (`app/(dash)/(routes)/explore/page.tsx`) أسفل صف الأدوات الدائرية مباشرة. يقوم هذا القسم بجلب بطاقات التوليد الفنية (Showcase items) المنشورة في قاعدة البيانات وعرضها في شبكة بطاقات متناسقة تدعم التشغيل التلقائي للفيديو عند مرور الفأرة ونسخ الـ Prompts.
- **الالتزام بنسب الأبعاد (Aspect Ratio Control)**: تدعم البطاقات الالتزام بالنسب الأصلية التي تم توليدها بها (مثل 16:9 و 9:16 و 1:1 و 4:3 و 3:4) عن طريق فئات Tailwind الديناميكية (`aspect-[16/9]`، `aspect-[9/16]`، إلخ) مما يمنع تشويه المشهد أو تمدده.
- **تكامل لوحة التحكم (Admin Panel Integration)**: تم ترقية لوحة إدارة المحتوى لصفحة اكتشف (`app/admin/cms/explore/page.tsx`) لتمكين المدير من:
  - اختيار نوع الوسيط يدوياً (فيديو أو صورة).
  - تحديد نسبة الأبعاد للإنتاج (Aspect Ratio).
  - رفع الصور مباشرة كـ Showcase Item دون اشتراط وجود ملف فيديو مرافق (يقوم النظام بربط رابط الصورة تلقائياً كـ `thumbnail_url` و `video_url` لضمان تكامل البيانات).

## تطوير عميل صفحة اكتشف وإضافة الأنماط الإبداعية المبتكرة (2026-07-07)
- **دعم كتابة المحتوى (Content Writing)**: تم تطوير السلوك البرمجي لعميل صفحة اكتشف في المسار الخلفي `app/api/explore/route.ts` ليتعرف على طلبات كتابة السيناريوهات، القصص، المقالات، والأفكار الدرامية أو السينمائية، حيث يقوم العميل الذكي بكتابة المحتوى بالكامل باللغة العربية وإعادته في حقل الـ `response` مباشرة دون الحاجة لطلب إعادة توجيه (set `"action": "chat"`).
- **دمج الأنماط الإبداعية والأدوات (Creative AI Presets)**: تم توسيع مصفوفة التوجيهات الذكية وتكوين مسارات برمجية وPrompt presets مخصصة للأنماط والطلبات الإبداعية التالية:
  - **DV Diary**: تحويل فوري إلى صفحة توليد الفيديو مع Prompt يحاكي تسجيلات Handycam المنزلية والتسعينيات.
  - **Two faces. One flag.**: دمج الوجوه مع العلم بنمط التعريض الفني المزدوج (Double Exposure).
  - **The top of the Empire State**: لقطات سينمائية ملحمية من أعلى ناطحة السحاب إمباير ستيت.
  - **Turn product into video ad**: إحالة فورية لأداة توليد إعلانات المنتجات الاحترافية.
  - **Create your photobooth strip**: شريط عمودي كلاسيكي مكون من 4 صور بورتريه متباينة.
  - **Angles & Shots (Direct the camera)**: إحالة فورية لاستوديو Canvas لنظام Angles Production System للتحكم بالكاميرا والنودات.
  - **SPINFORGE**: إحالة فورية لاستوديو ثلاثي الأبعاد 3D Studio.
- **إضافة قسم الأنماط الإبداعية في الواجهة (Creative Presets Grid)**: تم تصميم وإضافة قسم تفاعلي متناسق بصرياً مع ثيم الموقع الداكن والزجاجي في صفحة اكتشف (`app/(dash)/(routes)/explore/page.tsx`) يعرض كروت تفاعلية لهذه الميزات، مع توفير خياري:
  - **Open (فتح)**: للانتقال الفوري للأداة أو الصفحة المطلوبة.
  - **Use (استخدام)**: لوضع الـ Prompt المخصص في صندوق الموجه، وتحديد نوع الوسيط (Image/Video) تلقائياً، والنزول السلس للمستخدم لمراجعة الطلب أو النقر على توليد لتفعيله عبر العميل الذكي.


## تفعيل إرسال الكلمات المخصصة وتطبيق الوضع الصامت/الموسيقي الصرف بشكل صارم (2026-07-06)
- تم إصلاح مشكلة عدم إرسال الكلمات المخصصة (Verse, Chorus, Bridge) في حال كتابتها والرجوع لتبويب التوجيه (Prompt) قبل النقر على التوليد. أصبحت الكلمات تُرسل تلقائياً طالما كانت الحقول مملوءة بغض النظر عن التبويب النشط.
- تم تحسين الموجه الافتراضي (Default Prompt Builder) في حال ترك حقل التوجيه فارغاً لكي يُنشئ صيغة طبيعية متوافقة مع حالة الوضع الصامت (Instrumental) أو الغنائي التعبيري.
- تم تشديد تفعيل خيار "Instrumental Only" (بدون أصوات بشرية) في السيرفر لمنع أي خروج عن التعليمات بواسطة موديل Google Lyria:
  - تم إضافة وسم التخصيص `[Vocal Type: Instrumental only, absolutely NO vocals, NO singing, NO voice]` في رأس إعدادات الموجه.
  - تم إرفاق توجيه حرج وصارم في نهاية الموجه يمنع توليد الكلمات أو الأصوات البشرية نهائياً لضمان إنتاج موسيقى آلاتية صرفة.

## دمج صفحات AI Canvas و3D Studio وAssist وSmart CLI في قائمة الفيديو المنسدلة (2026-07-06)
- بناءً على طلب المستخدم، تم دمج وتوحيد الصفحات الرئيسية الإضافية لتكون قابلة للوصول مباشرة من قائمة الفيديو المنسدلة (Video Dropdown):
  - **الصفحات المضافة**:
    - **AI Canvas** (`/original-series`): لبناء بيئة العمل وتصميم المشاهد والتحكم المتناسق بالنودات.
    - **3D Studio** (`/3d`): لتوليد وتصميم النماذج ثلاثية الأبعاد الاحترافية بالذكاء الاصطناعي.
    - **Assist** (`/assist`): المساعد والرفيق الذكي ومحرك الدردشة للتعليمات البرمجية.
    - **Smart CLI** (`/smart-cli`): موجه الأوامر ومربط أدوات MCP وClaude المدمجة.
  - **آلية الدمج وإزالة التكرار**:
    - تم تحديث مصفوفة `VIDEO_FEATURES` داخل المكون الرئيسي للنافبار ([components/TopNavbar.tsx](file:///E:/موقع%20ثاني/next14%20ai%20saas/next14-ai-saas-main/next14-ai-saas-main/components/TopNavbar.tsx)) بإدراج هذه الصفحات وتحديد الأيقونات (`Monitor`, `Box`, `Bot`, `Plug`) والوصف التعريفي المتميز لكل منها.
    - تم إزالة هذه الصفحات من قائمة الروابط المباشرة لسطح المكتب (`STUDIO_LINKS`) ومن روابط الهاتف المحمول السريعة للحد من الازدحام والتكرار، لتصبح متاحة حصرياً داخل منسدلة الفيديو وأكورديون الهواتف المحمولة.
    - يدعم هذا التعديل ظهور الصفحات تلقائياً في قائمة الميزات (Features) داخل منسدلة الفيديو لسطح المكتب، وكذلك في شجرة الأكورديون المستجيبة للهواتف المحمولة (Mobile Drawer).

## إصلاح أسماء وخامات وصور أصوات Google TTS (Gemini) وتهيئة صفحة المزامنة (2026-07-06)
- تم حل مشاكل الأسماء والمعاينات المسموعة والصور الرمزية لأصوات Google TTS بشكل جذري ودقيق:
  - **توليد خامات الصوت تلقائياً وتخزينها (On-the-fly Generation & Caching)**: تم تحديث المسار الخلفي المعني بجلب عينات خامات الصوت `/api/voice-sample` ليقوم تلقائياً عند أول طلب لمعاينة الصوت بفحصه في السجل، وفي حال عدم توليده مسبقاً من الإدارة، يقوم بإنشائه فوراً عبر واجهة برمجة تطبيقات Google Gemini الرسمية بنطق جملة ترحيبية معرفة للصوت باللغة العربية باسم الموقع (مثال: `مرحباً، أنا زيفير، صوت أنثوي من سعد ستوديو.`) وتحويل الترميز من PCM إلى WAV ورفعه لـ Supabase وتسجيل الرابط في السجل ليعمل فوراً وبسرعة فائقة في المرات التالية بدلاً من تكرار الصوت الافتراضي `Sulafat` لجميع الأصوات.
  - **صور رمزية احترافية (Premium Portraits)**: تم تغيير آلية عرض الصور لقراء الفويزات لأصوات Gemini في واجهة الاستوديو ([sound.html](file:///E:/موقع%20ثاني/next14%20ai%20saas/next14-ai-saas-main/next14-ai-saas-main/public/stude/sound.html)) لتستخدم نفس محرك جلب الصور الرمزية الملونة والممتازة (getVoiceAvatar) بدلاً من الدوائر الملونة البسيطة التي توحي بوجود خطأ في تحميل الصور، مع الحفاظ على تراجع نصي آمن في حال فشل التحميل.
  - **تمييز وتحديد نوع الجنس للأصوات العربية**: تم تمييز وتصنيف كافة الأصوات بإلحاق نوع الجنس بشكل صريح لاسم الصوت باللغة العربية (مثال: `Gemini Zephyr (أنثى)`) وترجمة طابع ونبرة الصوت بالكامل لتسهيل الاختيار والفرز.
  - **توسيع وضبط خيارات مزامنة الشفاه (Lipsync)**: تم تصحيح الأخطاء المتعلقة بتحديد نوع جنس أصوات Gemini (تعديل تصنيف Zephyr لـ أنثى بدلاً من ذكر) وتوسيع القائمة المنسدلة في صفحة المزامنة ([lipsync/page.tsx](file:///E:/موقع%20ثاني/next14%20ai%20saas/next14-ai-saas-main/next14-ai-saas-main/app/(dash)/(routes)/lipsync/page.tsx)) لتشمل جميع الأصوات الـ 30 الرسمية بدقة متكاملة.

## ربط وتفعيل إعدادات توليد الموسيقى (النوع، الحالة، سرعة الإيقاع BPM، والكلمات المخصصة) بموديل Lyria (2026-07-06)
- تم حل مشكلة تجاهل السيرفر لإعدادات توليد الموسيقى وجعلها حقيقية وتفاعلية بالكامل وليست وهمية أو عشوائية:
  - تم تحديث كود الواجهة ([audio/page.tsx](file:///E:/موقع%20ثاني/next14%20ai%20saas/next14-ai-saas-main/next14-ai-saas-main/app/(dash)/(routes)/audio/page.tsx)) ليرسل قيم الـ `genre` (النوع)، الـ `mood` (الحالة)، والـ `bpm` (سرعة الإيقاع) بشكل صريح ضمن الحمولة الموجهة للطلب POST إلى `/api/music`.
  - تم تحديث المسار الخلفي في خادم معالجة التوليد ([route.ts](file:///E:/موقع%20ثاني/next14%20ai%20saas/next14-ai-saas-main/next14-ai-saas-main/app/api/music/route.ts)) لاستخراج هذه المتغيرات وبناء كتلة إعدادات موسيقية مهيكلة `[Musical Specifications]` في أعلى الـ Prompt الموجه لموديل Google Lyria لضمان التزامه وتطبيقه للنوع والحالة وسرعة الإيقاع المطلوبة، مع إدراج الكلمات المخصصة تحت وسم `Lyrics:` الرسمي لضمان إنتاجها بصوت غنائي متناسق بدلاً من توليدها بشكل عشوائي.

## إصلاح مشغل الصوت التفاعلي والتحويل التلقائي للصيغ عند التنزيل (2026-07-06)
- تم جعل مشغل الصوت تفاعلياً بالكامل (Interactive Waveform Player):
  - تم ربط زمن الأغنية وتشغيلها بالاعتماد على مدة الملف الحقيقية المسترجعة `audioDuration` عند تحميل البيانات الوصفية للصوت (onLoadedMetadata)، بدلاً من الاعتماد على مدة شريط التمرير المفترض، مما أصلح مؤشر التشغيل والتمرير بالكامل.
  - تم تحويل ألوان شريط الأمواج المفعّل أثناء التشغيل من اللون البنفسجي إلى اللون السماوي المتناسق مع بقية ثيم الموقع.
- تم إصلاح مشكلة تنزيل الملفات الصوتية بالصيغة الخاطئة (مثل تنزيل WAV عند الضغط على MP3):
  - تم تعديل أزرار التنزيل والتصدير لتمرير اسم الملف بالصيغة المطلوبة في البارامترات إلى خادم التنزيل `/api/download`.
  - تم تكوين مسار التنزيل الخلفي ليقوم بعملية تحويل ترميز تلقائية (On-the-fly Transcoding) بين الصيغتين **MP3 و WAV** باستخدام **FFmpeg** إذا اختلفت الصيغة المطلوبة عن صيغة الملف الأصلي المخزن، وتدفق الملف بالترميز ورأس الاستجابة المحدّثين، مما يضمن حصول المستخدم على الصيغة التي اختارها بدقة.

## ضمان مدة توليد الموسيقى المطلوبة باستخدام FFmpeg وتوجيهات Lyria (2026-07-06)
- تم حل مشكلة زيادة مدة الملف الصوتي المولد بشكل كبير عن المدة المطلوبة من قبل المستخدم في الواجهة (مثال: طلب 59 ثانية وتوليد 2:33 دقيقة).
- تم تحديث المسار `/api/music/route.ts` ليقوم بإرسال شروط المدة الزمنية المطلوبة للموديل google/lyria مباشرة في الـ Prompt.
- تم دمج معالجة خلفية باستخدام أداة **FFmpeg** لتقليم المقطع الموسيقي (Trim) فور توليده بحيث يطابق مدة التمرير المحددة تماماً، مع تطبيق تلاشٍ تدريجي ناعم للصوت (Fade-out) مدته 3 ثوانٍ في نهاية المقطع للحفاظ على احترافية الانتقال الصوتي قبل رفعه لـ Supabase.

## إضافة مكتبة الإنتاج وتناسق ألوان جناح الصوت مع واجهة الفيديو (2026-07-06)
- تم إضافة تبويب ثالث "Production Library" (مكتبة الإنتاج) في صفحة جناح الصوت (`app/(dash)/(routes)/audio/page.tsx`).
- تم دمج دالة `loadLibrary` لجلب كافة الملفات الصوتية المولّدة الخاصة بالمستخدم من المسار `/api/assets?type=audio` عند تحميل الصفحة، وعرضها في شبكة بطاقات مع إمكانية التشغيل، التنزيل، والحذف.
- تم تعديل ألوان الواجهة بالكامل من اللون البنفسجي (Violet) إلى اللون السماوي والداكن (Slate/Blue/Cyan) لتتطابق تماماً مع واجهات توليد الفيديو وصناعة الأفلام بالموقع.

## حل مشكلة فشل تنزيل الملفات الصوتية (2026-07-06)
- تم إصلاح مشكلة فشل تنزيل المقاطع الصوتية وظهور خطأ "Failed - Unknown server error" في المتصفح.
- تم تحديث مسار التنزيل `/api/download/route.ts` ليدعم المسارات النسبية (مثل `audio/user_...`) عن طريق جلب الروابط البديلة المستقرة getFallbackUrls وتجربتها بالتوالي والرفع بالـ Stream لتجاوز أي مشاكل توافر.

## استخراج تفاصيل خطأ الـ 400 وتوضيح قيود الأمان (2026-07-05)
- تم إصلاح مشكلة عدم وضوح أسباب خطأ 400 (Bad Request) للمستخدم في واجهة توليد الموسيقى.
- تم تحديث دالة `getSafeErrorMessage` في `hooks/use-generation-gate.ts` لتقوم باستخراج نص الرسالة التفصيلية من استجابة Axios (سواء كانت نصاً خاماً أو كائناً يحتوي على `error`) بدلاً من عرض رسالة Axios الافتراضية العامة.
- تم إدراج الكلمات المفتاحية المتعلقة بسياسات الأمان والحظر الخاصة بـ Google Lyria (مثل `Lyria`, `blocked`, `policy`, `sensitive`) ضمن القائمة البيضاء للرسائل المسموح بعرضها في `lib/generation-errors.ts` ليتسنى للمستخدم معرفة متى تم رفض طلبه بسبب احتواء النص على كلمات حساسة أو أسماء تجارية ممنوعة.

## دمج نظام إنتاج زوايا التصوير (Angles Production System) وتجزئة الـ JSON والـ Router (2026-07-05)
- تم بناء وتكامل نظام إنتاج زوايا التصوير بالكامل في صفحة الـ Canvas الخاصة بالـ React Flow (`/original-series`).
- تم تحديث المكون `components/canvas/CanvasNode.tsx` لدعم وضع الـ `isRouter` المخصص لنودات الـ `connector` (ممر الصور)، حيث تظهر كبطاقة رأسية طولية بـ 10 منافذ إخراج (Handles) مسمّاة من `route 1` إلى `route 10` مع نقاط خضراء مميزة.
- تم تطوير نودات الـ `list` (القائمة) في `components/canvas/CanvasNode.tsx` لتقهم وتجزء النصوص المدخلة وعرض العناصر كصفوف منفصلة، مع تزويد كل صف بنقطة إخراج بنفسجية مخصصة (`prompt-0` إلى `prompt-9`) ومحاذاتها تماماً مع مركز الصف عمودياً، مع زر تبديل "تعديل/حفظ" لتعديل النص الخام مباشرة.
- تم تيسير استدعاءات دالة `makeEdge` في `app/(dash)/(routes)/original-series/page.tsx` لتقبل معرّفات الـ Handles النصية المخصصة عوضاً عن حصرها بالأنواع القياسية.
- تم تحديث منطق تشغيل النودات `executeNode` ليدعم:
  1. تشغيل نود المساعد `assistant` بربطه بـ API المحادثة الحقيقي `/api/conversation` لتوليد زوايا التصوير بالذكاء الاصطناعي بدلاً من النصوص الافتراضية.
  2. تشغيل نود القائمة `list` ليقوم تلقائياً باستقبال النصوص الواردة وتجزئتها عبر الفواصل المنقوطة أو السطور وتحديث قيمته تلقائياً.
  3. قراءة النودات اللاحقة المتصلة بالـ `list` للعنصر المحدد الذي تم ربطه به برمجياً من خلال معرّف الـ handle (`prompt-i`) بدلاً من قراءة النص كاملاً.
- تم إضافة نموذج جاهز للمخطط `createAnglesProductionWorkflow` وإتاحته للتحميل الفوري بزر مخصص في واجهة تشغيل النماذج (Angles Production Template).


## إصلاح خطأ CORS في رفع الملفات إلى Backblaze B2 (2026-07-05)
- تم حل مشكلة CORS عند محاولة المتصفح رفع الصور أو الوسائط المولّدة مباشرة إلى bucket الـ Backblaze B2 (`saadstudio-storage`) في مسار PutObject.
- تم تحديث سكربت الإعدادات `scripts/set-r2-cors.mjs` ليدعم تحميل ملفات البيئة المتعددة (بما في ذلك `.env.migration`) وقراءة متغيرات Backblaze B2 (`B2_*`) وتطبيق قواعد CORS المناسبة تلقائياً على الـ bucket النشط.
- تم إزالة خيار `"OPTIONS"` من حقل الطرق المسموحة (`AllowedMethods`) لتفادي رفض الخدمة من قبل واجهة S3 الخاصة بـ Backblaze B2 التي لا تدعم إدراجه يدوياً وتتعامل مع طلبات preflight تلقائياً.
- تم تحديث المسار البرمجي الإداري `app/api/admin/r2-cors/route.ts` ليتماشى مع نفس السلوك البرمجي لـ B2.

## إصلاح أخطاء بناء وبناء المشروع على Vercel (2026-07-05)
- تم حل كافة مشاكل الـ TypeScript التي كانت تمنع بناء المشروع وتمنع Vercel من نشر وتثبيت الإصلاحات البرمجية.
- تم نقل دوال الـ Registry الخاصة بالعينات الصوتية إلى ملف مستقل `lib/voice-registry.ts` لتفادي أخطاء Next.js الخاصة بالتصدير من ملف الروابط.
- تم تصحيح استدعاءات `guardGeneration` في كل من `video-edit` و `cinema-flow` لتتوافق تماماً مع بنية الدالة.
- تم حل مشكلة توافق `BlobPart` لرفع ملفات الفيديو في `lib/gemini-veo.ts` عن طريق تغليف الـ Buffer بـ `Uint8Array`.
- تم إصلاح كافة الأخطاء الخاصة بالواجهة في `components/TopNavbar.tsx` بتعريف دالة `onOpen` المفقودة.

## إصلاح مسار تشغيل الصوت في صفحة جناح الصوت (2026-07-05)
- تم حل مشكلة خطأ HTTP 404 (Not Found) عند تشغيل الملفات الموسيقية الموّلدة في واجهة Audio Suite.
- تم إدخال ميزة الروابط الاحتياطية المستقرة getFallbackUrls لتقوم بتحليل الرابط النسبي وتجربة الروابط المباشرة لـ Backblaze B2 و Cloudflare R2 وبوابة الـ Proxy.

## إصلاح خطأ رفع الصوت لتوليد Google Lyria (2026-07-05)
- ØªÙ… Ø­Ù„ Ù…Ø´ÙƒÙ„Ø© Ø®Ø·Ø£ HTTP 500 (Internal Server Error) Ø¹Ù†Ø¯ ØªÙˆÙ„ÙŠØ¯ Ø§Ù„Ù…ÙˆØ³ÙŠÙ‚Ù‰ Ø¨Ø§Ø³ØªØ®Ø¯Ø§Ù… Ù…ÙˆØ¯ÙŠÙ„Ø§Øª Google Lyria.
- ØªØ¨ÙŠÙ† Ø£Ù† Ø¯Ø§Ù„Ø© `uploadBufferToStorage` ÙƒØ§Ù†Øª ØªÙ Ø³ØªØ¯Ø¹Ù‰ Ø¨Ù…ØªØºÙŠØ±Ø§Øª Ø®Ø§Ø·Ø¦Ø© (`bucket` Ùˆ `path`) Ù…Ù…Ø§ ØªØ³Ø¨Ø¨ Ù ÙŠ Ù Ù´Ù„ Ø§Ù„ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ø¨Ø±Ù…Ø¬ÙŠ Ù„Ù„ÙˆØ³Ø§Ø¦Ø· Ù†ØªÙŠØ¬Ø© ØªÙ…Ø±ÙŠØ± `assetType` Ø¨Ù‚ÙŠÙ…Ø© `undefined` ÙˆØ§Ù„Ø°ÙŠ Ø£Ø¯Ù‰ Ù„Ø®Ø·Ø£ `TypeError`.
- ØªÙ… ØªØµØ­ÙŠØ­ Ù…Ø¹Ø§Ù…Ù„Ø§Øª Ø§Ù„Ø§Ø³ØªØ¯Ø¹Ø§Ø¡ Ù„ØªÙ…Ø±ÙŠØ± `userId` Ùˆ `assetType: "AUDIO"` Ùˆ `generationId` Ùˆ `fileName` Ø¨Ø´ÙƒÙ„ Ø³Ù„ÙŠÙ…ØŒ ÙˆØªØ£ÙƒÙŠØ¯ Ø§Ù„ØªÙˆØ§Ù Ù‚ Ø§Ù„Ø¨Ø±Ù…Ø¬ÙŠ Ø§Ù„ÙƒØ§Ù…Ù„ Ù…Ø¹ ØªÙˆÙ‚ÙŠØ¹ Ø§Ù„Ø¯Ø§Ù„Ø©.

## Saad Agent Image Page Creation vs Local Image Classification Routing (2026-07-04)
- Requests that create or design a page about images, gallery, or photos are engineering page-creation tasks.
- Example: `انشئ صفحة كلري خاصة بالصور وضع الصفحة في هذا الفولدر C:\Users\PC\Desktop\New folder (3)` must route to `engineering_workflow`, not `local_image_classification`.
- Only requests that inspect, classify, sort, or move existing image files inside a local folder should route to `local_image_classification`.
- Local read-only search workflows must obey task lifecycle ordering and cannot jump directly from `VALIDATING` to `VERIFYING`.
- This correction prevents fake missing-image-classifier failures for normal page creation requests.

## Saad Agent Internal Executor Encoding Fix (2026-07-05)
- `InternalWorkspaceExecutor` must not return mojibake chat output after creating static page files.
- Generated static page templates now use ASCII-safe English copy to avoid corrupted text in `index.html`.
- Arabic user-facing executor responses must be stored as Unicode escape literals in source so packaged Electron output remains readable.
- Verification requires a source scan for mojibake markers and a packaged `app.asar` rebuild.


## Ø¥ØµÙ„Ø§Ø­ ØªØ¯Ø§Ø®Ù„ ÙˆØ§Ø¬Ù‡Ø© Ø§Ù„ØµÙˆØª ÙˆØ§Ù„Ø£Ù„ÙˆØ§Ù† Ø§Ù„Ø¯Ø§ÙƒÙ†Ø© (2026-07-04)
- ØªÙ… Ø­Ù„ Ù…Ø´ÙƒÙ„Ø© ØªØ¯Ø§Ø®Ù„ Ø±Ø£Ø³ ØµÙØ­Ø© Ø§Ù„ØµÙˆØª `/audio` Ù…Ø¹ Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø£Ø¯ÙˆØ§Øª Ø§Ù„Ù…Ù†Ø³Ø¯Ù„Ø© (Dropdown) ÙÙŠ Ø§Ù„Ù‡ÙŠØ¯Ø± Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠ Ù„Ù„Ù…ÙˆÙ‚Ø¹ Ù…Ù† Ø®Ù„Ø§Ù„ ØªØºÙŠÙŠØ± Ø§Ù„Ù…ÙˆØ¶Ø¹ Ù…Ù† `sticky top-0 z-50` Ø¥Ù„Ù‰ `relative z-10` Ù„ÙƒÙŠ ØªØ°Ù‡Ø¨ ØªØ­Øª Ø§Ù„Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…Ù†Ø³Ø¯Ù„Ø© ÙˆÙ„Ø§ ØªØºØ·ÙŠÙ‡Ø§.
- ØªÙ… Ø­Ø°Ù Ø§Ù„Ø´Ø±ÙŠØ· Ø§Ù„Ø³ÙÙ„ÙŠ (Footer) Ø¨Ø§Ù„ÙƒØ§Ù…Ù„ Ø¨Ù†Ø§Ø¡Ù‹ Ø¹Ù„Ù‰ Ø·Ù„Ø¨ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù….
- ØªÙ… Ø§Ø³ØªØ¨Ø¯Ø§Ù„ Ø¬Ù…ÙŠØ¹ Ù…ØªØºÙŠØ±Ø§Øª Ø«ÙŠÙ… Tailwind Ø§Ù„ÙƒÙ„Ø§Ø³ÙŠÙƒÙŠØ© Ø¨Ø£Ù„ÙˆØ§Ù† Ø¯Ø§ÙƒÙ†Ø© ØµØ±ÙŠØ­Ø© ÙˆØ¹Ø§Ù„ÙŠØ© Ø§Ù„Ø¯Ù‚Ø© Ù…Ø·Ø§Ø¨Ù‚Ø© ØªÙ…Ø§Ù…Ø§Ù‹ Ù„Ù…ÙˆÙ‚Ø¹ Ø³Ø¹Ø¯ Ø³ØªÙˆØ¯ÙŠÙˆ (`bg-[#0a0a0c]` Ù„Ù„Ø®Ù„ÙÙŠØ©ØŒ Ùˆ`bg-[#111115]` Ù„Ù„Ø¨Ø·Ø§Ù‚Ø§ØªØŒ Ùˆ`border-zinc-800/80` Ù„Ù„Ø­Ø¯ÙˆØ¯ØŒ Ùˆ`text-zinc-100` Ù„Ù„Ù†ØµÙˆØµ) Ù„Ø¶Ù…Ø§Ù† Ø¨Ù‚Ø§Ø¡ Ø§Ù„ØµÙØ­Ø© Ø¯Ø§ÙƒÙ†Ø© ÙˆØ«Ø§Ø¨ØªØ© Ø¨ØºØ¶ Ø§Ù„Ù†Ø¸Ø± Ø¹Ù† Ø­Ø§Ù„Ø© Ø«ÙŠÙ… Ù„ÙˆØ­Ø© Ø§Ù„ØªØ­ÙƒÙ….
- ØªÙ… Ø­Ù„ Ù…Ø´ÙƒÙ„Ø© Ø­Ø¸Ø± Ø³ÙŠØ§Ø³Ø© Ø­Ù…Ø§ÙŠØ© Ø§Ù„Ù…Ø­ØªÙˆÙ‰ (CSP) Ø¹Ù†Ø¯ Ù‚Ø±Ø§Ø¡Ø© Ù…Ù„ÙØ§Øª Ø§Ù„ØµÙˆØ± Ø§Ù„Ù…Ø±ÙÙˆØ¹Ø©ØŒ Ø­ÙŠØ« Ø£ØµØ¨Ø­ Ø§Ù„ÙƒÙˆØ¯ ÙŠÙ‚Ø±Ø£ Ù…Ù„ÙØ§Øª Ø§Ù„ØµÙˆØ± Ø§Ù„Ù…Ø­Ù„ÙŠØ© Ù…Ø¨Ø§Ø´Ø±Ø© Ø¨Ø§Ø³ØªØ®Ø¯Ø§Ù… ÙƒØ§Ø¦Ù† `img.file` Ø¹Ø¨Ø± `FileReader` Ø¨Ø§Ù„ÙƒØ§Ù…Ù„ Ø£ÙˆÙÙ„Ø§ÙŠÙ†ØŒ Ø¨Ø¯Ù„Ø§Ù‹ Ù…Ù† Ø¹Ù…Ù„ `fetch` Ù„Ø±ÙˆØ§Ø¨Ø· Ø§Ù„Ù€ `blob:` Ø§Ù„ØªÙŠ ÙƒØ§Ù†Øª ØªÙØ­Ø¸Ø± Ù…Ù† Ù‚Ø¨Ù„ Ø§Ù„Ù…ØªØµÙØ­ Ø¨Ù…ÙˆØ¬Ø¨ ØªÙˆØ¬ÙŠÙ‡ `connect-src`.
- تم حل مشكلة خطأ HTTP 413 Payload Too Large عند رفع صور مرجعية عالية الدقة في واجهة الصوت، حيث تم دمج خاصية ضغط الصور محلياً في المتصفح تلقائياً لتصغير الصور إلى أقصى حجم (800 بكسل عرض/ارتفاع) وتصديرها كـ JPEG مضغوط (مما يقلل حجم البيانات المرسسة من عدة ميغابايتات إلى أقل من 80 كيلوبايت فقط)، وبما يتوافق مع حدود حجم الطلبات في خوادم Vercel.
- تم حل مشكلة خطأ HTTP 400 Bad Request (Model not found) عند التوليد باستخدام الموديل Pro. تبين أن اسم الموديل الصحيح في خوادم WaveSpeed هو `minimax/music-2.5` وليس `minimax/minimax-music-2.5`، وعليه تم تصحيح مسميات الموديل في واجهة المستخدم وجداول التسعير والتحليل البرمجي بأكمله، مع تحديث التحقق من الحقول ليسمح بالتوليد بمجرد وجود كلمات الأغنية بدون الحاجة لكتابة Prompt مكرر (حيث يتم إنشاء وصف تلقائي مستند إلى تصنيف ونوع الموسيقى).
- تم حل مشكلة خطأ HTTP 502 Bad Gateway عند توليد الموسيقى باستخدام موديل Minimax Pro. نظراً لأن الموديل يعمل بشكل غير متزامن (Asynchronous) ويُرجع معرّف معالجة (Prediction ID) في البداية بدلاً من رابط الصوت النهائي، تم تحديث كود الخلفية لإضافة حلقة فحص متكرر (Polling Loop) تنتظر اكتمال الأغنية لمدة تصل إلى 3 دقائق، مع زيادة وقت تشغيل الدالة (Function Duration) على خوادم Vercel إلى 180 ثانية لتجنب انتهاء المهلة (Timeout).
- تم حل مشكلة خطأ HTTP 400 Bad Request عند توليد الموسيقى بدون كتابة كلمات (Lyrics) مخصصة لموديل Minimax Pro. تبين أن مخطط بيانات API الخاص بـ WaveSpeed يفرض إرسال حقل `lyrics` بشكل إجباري (Required) ولا يمكن حذفه للموديل Minimax 2.5، وعليه تم تعديل خادم المشروع ليقوم تلقائياً بتمرير كلمة نائبة `[Instrumental]` كقيمة افتراضية للحقل عند تركه فارغاً من قبل المستخدم لتلبية متطلبات التحقق وتجنب الخطأ.
- تم تحديث صفحات توليد الموسيقى (في مسار `/audio` ومسار `/music`) لإلغاء جميع مزودي الخدمة الخارجيين وحصر الخيارات حصرياً باستخدام موديلات Google Lyria لتوليد الموسيقى (`google/lyria-3-pro/music` و `google/lyria-3-clip/music`) تلبيةً لرغبة مالك الاستوديو في حصر التوليد بمزود Google.
- - تم دعم توليد التعليق الصوتي (Voiceover) تلقائياً ودمجه مع الفيديو المنتج في صفحة Cinema Flow؛ حيث يقوم مساعد الذكاء الاصطناعي بإنشاء النص الصوتي واستدعاء خادم دمج الصوت بالفيديو عبر FFmpeg للحصول على فيديو ناطق متكامل.
- تم تحديث محرك توليد الموسيقى لموديلات Google Lyria في الخلفية للاعتماد بالكامل على حزمة `@google/genai` الرسمية واستدعاء `interactions.create` كما هو محدد في مرجع غوغل الجديد لتوليد الألحان والمسارات الصوتية.

## Saad Agent Local Trusted Workspace File Search Routing (2026-07-04)
- Local file search prompts such as `Ø§Ø¨Ø­Ø« ÙÙŠ Ø§Ù„ÙƒÙ…Ø¨ÙŠÙˆØªØ± Ø¹Ù† Ø§ÙŠ Ù…Ù„Ù Ø§Ùˆ ÙˆØ±Ø¯ Ø¨Ø¹Ù†ÙˆØ§Ù† ÙˆØµÙ Ø§Ù„ÙÙŠØ¯ÙŠÙˆ` are read-only workspace search tasks, not casual conversation and not direct LLM answers.
- `ExecutionPolicyService` classifies these requests as `SEARCH` with workflow `local_filesystem_search`.
- `ChatOrchestratorService` routes the workflow to `LocalFileSearchExecutor`, which searches configured Trusted Workspaces through `TrustedWorkspaceRuntime.search(...)`.
- The agent must return real matched file paths/content hits or an honest not-found message.
- The agent must not scan the whole computer by default. Folders outside Trusted Workspaces must be added/trusted before search.
- External web research remains separate: product/model/news requests such as `Seedance 2.0 Mini` must still route to `external_research`.

## Saad Agent Local Image Folder Classification Routing (2026-07-03)
- Local folder image classification requests must not be routed through the generic direct-answer model path.
- Requests such as `Ø§Ù†Ø¸Ø± Ø¯Ø§Ø®Ù„ C:\Users\PC\Pictures\Screenshots ÙˆØµÙ†Ù Ø§Ù„ØµÙˆØ±` are classified as `vision_analysis` and routed by Execution Policy to `local_image_classification`.
- The Chat Orchestrator intercepts this workflow before project context expansion and before `ReasoningEngine`, so Qwen/LM Studio is not called and context-length failures are avoided.
- If no local image classification model/runtime is installed, the agent must report the missing local classifier honestly and stop before creating folders or moving images.
- Enforced process maxBuffer allocation (64MB) inside child process options to prevent buffer overflow exceptions (stdout maxBuffer length exceeded) when running classification over large directories.
- A future implementation should install/connect a real local image classifier, produce a dry-run classification preview, then move files only when approval/access policy allows.

## Saad Agent Brave Answers Secret Path Alignment (2026-07-03)
- Brave Answers external search uses provider id `brave-answers` and encrypted secret reference `provider:brave-answers:api-key`.
- In the packaged Electron runtime, provider Settings and encrypted provider secrets must resolve from the same `SAAD_AGENT_SETTINGS_ROOT` / Electron app data root.
- Legacy workspace secrets can be migrated into the active app-data secret store, but API keys must not be written into Settings JSON, logs, diagnostics, memory, or project documentation.
- The Brave request header remains `X-Subscription-Token`; stored encrypted secrets take priority over environment-variable fallback.

## Saad Agent Internal Static Page Executor Fallback (2026-07-03)
- If `CodexRuntimeBridge` reaches execution but the installed Codex CLI is not spawnable from Node/Electron (`Access is denied` / `spawn EPERM`), Saad Agent may use a deterministic internal fallback only for simple static page creation requests.
- The fallback is intentionally limited: it writes real `index.html`, `styles.css`, `script.js`, and `README.md` files inside the resolved trusted workspace and reports the exact files written.
- The fallback must refuse packaged Electron runtime paths such as `release-production-v4/win-unpacked`; those folders are application distribution output, not user project workspaces.
- The fallback must refuse attachment-dependent requests because it does not read attached file content. It must not generate a generic page while claiming that an attached map, Markdown file, or specification was used.
- This fallback must not be described as full Codex replacement. Complex codebase edits, refactors, tests, and broad project execution still require a spawnable Codex CLI/SDK runtime or another real execution backend.
- Requests such as `Ø§Ø±ÙŠØ¯ ØªÙ†Ø´Ø¦Ù„ÙŠ ØµÙØ­Ø© Ø®Ø§ØµØ©... Ø¯Ø§Ø®Ù„ C:\Users\PC\Desktop\test` should create files when the path is trusted/resolved and approval policy allows safe edits.

## Saad Agent Local Path Engineering Request Routing (2026-07-03)
- Direct chat requests that include an explicit local path and an execution verb are engineering tasks, not casual conversation.
- Example: `ÙˆØ³ÙˆÙŠ Ø³Ø¹Ø¯ Ø§Ø´ØªØºÙ„ ÙÙŠØ±ÙŠÙ… Ø¯Ø§Ø®Ù„ Ù‡Ø°Ø§ Ø§Ù„ÙÙˆÙ„Ø¯ C:\Users\PC\Desktop\test` must classify as `PLAN` / `engineering_workflow`, not `ANSWER` / `conversation`.
- When the mentioned local path exists, `ChatOrchestratorService` uses it as the active workspace for the request. If it does not exist, the runtime falls back to the current workspace and should report the real path/workspace issue instead of giving generic manual instructions.
- External research routing remains separate; requests like `Ø§Ø¨Ø­Ø«Ù„ÙŠ Seedance 2.0 Mini` must continue to classify as `SEARCH` / `external_research`.

## Ø¥ØµÙ„Ø§Ø­ ØªØ³Ù„Ø³Ù„ Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø© ÙˆÙÙ‡Ù… Ø§Ù„Ø³ÙŠØ§Ù‚ ÙÙŠ Saad Agent (2026-07-03)
- ØªÙ… Ø¥Ø¯Ù…Ø§Ø¬ Ø°Ø§ÙƒØ±Ø© ØªØ§Ø±ÙŠØ® Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø© ÙÙŠ Ø·Ø¨Ù‚Ø© Ø§Ù„ØªÙ†Ø³ÙŠÙ‚ Ø§Ù„Ù…Ø¨Ø§Ø´Ø± (Direct Chat).
- ÙŠÙ‚ÙˆÙ… Ø§Ù„Ù†Ø¸Ø§Ù… Ø§Ù„Ø¢Ù† Ø¨Ø­ÙØ¸ Ø¢Ø®Ø± 10 Ø±Ø³Ø§Ø¦Ù„ (5 Ø£Ø¯ÙˆØ§Ø± Ø­ÙˆØ§Ø±ÙŠØ©) ÙÙŠ Ø§Ù„Ø°Ø§ÙƒØ±Ø© Ø§Ù„Ù…Ø¤Ù‚ØªØ© Ù„Ù„Ù€ Session.
- Ø¹Ù†Ø¯Ù…Ø§ ÙŠÙƒÙˆÙ† ØªØµÙ†ÙŠÙ Ø§Ù„Ù†ÙŠØ© (Intent) Ù‡Ùˆ `conversation` Ø£Ùˆ ØªØ±Ø­ÙŠØ¨Ø§Ù‹ Ø¹Ø§Ù…Ø§Ù‹:
  1. ÙŠØªØ¬Ø§ÙˆØ² Ø§Ù„Ù†Ø¸Ø§Ù… Ø¨Ø§Ù„ÙƒØ§Ù…Ù„ Ø¬Ù„Ø¨ Ù‚ÙˆØ§Ø¹Ø¯ Ù…Ù„ÙØ§Øª Ø§Ù„Ù…Ø´Ø±ÙˆØ¹ ÙˆØ³ÙŠØ§Ù‚Ø§Øª Ø§Ù„Ù€ workspace ÙˆØ§Ù„Ù€ ADRs ÙˆØ§Ù„Ù…Ø¹Ø±ÙØ© Ø§Ù„ØªØ¯Ø±ÙŠØ¨ÙŠØ© Ø§Ù„Ø·ÙˆÙŠÙ„Ø© Ù„ØªÙØ§Ø¯ÙŠ Ø¥ØºØ±Ø§Ù‚ Ø§Ù„Ù€ prompt Ø¨Ø§Ù„ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø¨Ø±Ù…Ø¬ÙŠØ© Ø§Ù„ØªÙŠ ØªØ´ØªØª Ø§Ù„Ù†Ù…ÙˆØ°Ø¬.
  2. ÙŠÙ‚ÙˆÙ… Ø§Ù„ØªÙ†Ø³ÙŠÙ‚ Ø¨Ø­Ù‚Ù† ØªØ§Ø±ÙŠØ® Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø© ÙÙŠ Ø§Ù„Ù€ prompt Ø§Ù„Ù…Ø±Ø³Ù„ Ø¥Ù„Ù‰ Ø§Ù„Ù†Ù…ÙˆØ°Ø¬ Ù…Ù…Ø§ ÙŠØªÙŠØ­ Ù„Ù‡ ÙÙ‡Ù… Ø³ÙŠØ§Ù‚ Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø§Øª Ø§Ù„ØªÙØ§Ø¹Ù„ÙŠØ© Ù…Ø«Ù„ ÙƒÙ„Ù…Ø© "Ù…Ø§Ø¯ÙŠ" Ø±Ø¯Ø§Ù‹ Ø¹Ù„Ù‰ Ø§Ù„ØªØ±Ø­ÙŠØ¨.

## Ø¥ØµÙ„Ø§Ø­ ØªØ¬Ù…ÙŠØ¯ Ø§Ù„Ø£Ø³Ø¦Ù„Ø© Ø§Ù„Ø¹Ø§Ù…Ø© ÙÙŠ Saad Agent (2026-07-03)
- ØªÙ… ØªØµØ­ÙŠØ­ Ù…Ø³Ø§Ø± Ø§Ù„Ø£Ø³Ø¦Ù„Ø© Ø§Ù„Ø¹Ø§Ù…Ø© Ø§Ù„Ù‚ØµÙŠØ±Ø© Ù…Ø«Ù„ `Ø¹Ù†Ø¯ÙŠ Ø³Ø¤Ø§Ù„ Ù…Ù†Ùˆ Ù‡Ùˆ Ø§Ù„Ù†Ø¨ÙŠ Ù…Ø­Ù…Ø¯` Ø­ØªÙ‰ Ù„Ø§ ØªØ¯Ø®Ù„ Ø®Ø· ÙØ­Øµ Ø§Ù„Ù…Ø´Ø±ÙˆØ¹ ÙˆØ§Ù„Ù…Ø¹Ø±ÙØ© ÙˆØ§Ù„Ù…Ù‡Ø§Ø±Ø§Øª.
- Ø§Ù„Ø³Ø¨Ø¨ ÙƒØ§Ù† Ø£Ù† Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ÙƒÙˆÙ…Ø¨ÙˆØ²Ø± Ù…Ø«Ù„ `Provider` Ùˆ`Model` Ùˆ`Workspace` ÙˆØµÙ„Øª Ø¥Ù„Ù‰ Ø§Ù„ØªØµÙ†ÙŠÙ ÙˆØ§Ù„Ø¨Ø­Ø«ØŒ ÙØªÙ… Ø§Ø®ØªÙŠØ§Ø± workflow ØºÙŠØ± ØµØ­ÙŠØ­ Ù…Ø«Ù„ `provider-integration`.
- ÙŠØ¹ØªÙ…Ø¯ Direct Chat Ø§Ù„Ø¢Ù† Ø¹Ù„Ù‰ Ù†Øµ `User request:` Ø§Ù„Ø­Ù‚ÙŠÙ‚ÙŠ ÙÙŠ Ø§Ù„ØªØµÙ†ÙŠÙ ÙˆØ§Ù„Ø¨Ø­Ø« ÙˆØ¨Ù†Ø§Ø¡ promptØŒ ÙˆÙ„ÙŠØ³ Ø¹Ù„Ù‰ metadata Ø§Ù„Ø¯Ø§Ø®Ù„ÙŠØ©.
- ØªÙ…Øª Ø¥Ø¶Ø§ÙØ© Ù…Ø³Ø§Ø± Ø®ÙÙŠÙ Ù„Ù„Ø£Ø³Ø¦Ù„Ø© Ø§Ù„Ø¹Ø§Ù…Ø© Ù‚Ø¨Ù„ Ø¥Ù†Ø´Ø§Ø¡ Execution TraceØŒ Ù…Ø¹ timeout Ù‚ØµÙŠØ± ÙˆØ¨Ø¯ÙˆÙ† retries Ø­ØªÙ‰ Ù„Ø§ ÙŠØ¸Ù‡Ø± Electron ÙƒØ£Ù†Ù‡ Ù…ØªÙˆÙ‚Ù.
- ÙŠØ¬Ø¨ Ø¨Ù‚Ø§Ø¡ Ø·Ù„Ø¨Ø§Øª Ø§Ù„Ù‡Ù†Ø¯Ø³Ø© ÙˆØ§Ù„ØªØ¹Ø¯ÙŠÙ„ Ø®Ø§Ø±Ø¬ Ù‡Ø°Ø§ Ø§Ù„Ù…Ø³Ø§Ø±ØŒ ÙˆØªØ¸Ù„ ØªÙ…Ø± Ø¹Ø¨Ø± Execution Policy ÙˆØ§Ù„Ù…ÙˆØ§ÙÙ‚Ø©.

## Ø¥Ø¶Ø§ÙØ© Ù…ÙˆØ¯ÙŠÙ„ Google Gemini Omni Flash Ù„Ù„ÙÙŠØ¯ÙŠÙˆ (2026-07-02)
- ØªÙ… Ø¯Ù…Ø¬ Ø§Ù„Ù…ÙˆØ¯ÙŠÙ„ Ø§Ù„Ø¬Ø¯ÙŠØ¯ `Google Gemini Omni Flash` (Ø§Ù„Ù…Ø·Ø§Ø¨Ù‚ Ù„Ù€ `gemini-omni-flash-preview` Ù…Ù† Ù‚ÙˆÙ‚Ù„) Ø¨ØµÙØ­Ø© Ø§Ù„ÙÙŠØ¯ÙŠÙˆ ÙˆØ£Ø¯Ø§Ø© Ø§Ù„Ø±Ø³Ù… Ù„Ù„Ù€ Draw-to-Video.
- Ø§Ù„Ù…ÙˆØ¯ÙŠÙ„ ÙŠØ¯Ø¹Ù… Ù†Ø³Ø¨ Ø£Ø¨Ø¹Ø§Ø¯ Ù…ØªÙ†ÙˆØ¹Ø© (16:9ØŒ 9:16)ØŒ Ø¯Ù‚Ø© 720pØŒ ÙˆÙŠØ³Ù…Ø­ Ø¨Ù…Ø¯Ø¯ Ù…Ø±Ù†Ø© ØªØªØ±Ø§ÙˆØ­ Ø¨ÙŠÙ† **3 Ø¥Ù„Ù‰ 10 Ø«ÙˆØ§Ù†Ù** Ù…Ø¹ Ø§Ø³ØªÙ‡Ù„Ø§Ùƒ Ø±ØµÙŠØ¯ Ù‚Ø¯Ø±Ù‡ **3.00 Ù†Ù‚Ø·Ø© Ø¨Ø§Ù„Ø«Ø§Ù†ÙŠØ©** (30 Ù†Ù‚Ø·Ø© Ù„ÙƒÙ„ 10 Ø«ÙˆØ§Ù†Ù ).

## ØªØ«Ø¨ÙŠØª Ù…Ø³Ø§Ø± Ø§Ù„Ø£Ø³Ø¦Ù„Ø© Ø§Ù„Ø¨Ø³ÙŠØ·Ø© ÙÙŠ Saad Agent (2026-07-02)
- ØªÙ… ØªØµØ­ÙŠØ­ Ù…Ø³Ø§Ø± Ø§Ø³ØªØ¯Ø¹Ø§Ø¡ LM Studio Ø¯Ø§Ø®Ù„ Saad Agent Ø­ØªÙ‰ Ù„Ø§ ØªØ¨Ù‚Ù‰ Ø§Ù„Ø£Ø³Ø¦Ù„Ø© Ø§Ù„Ø¨Ø³ÙŠØ·Ø© Ø¹Ø§Ù„Ù‚Ø© Ø¹Ù„Ù‰ `Processing request`.
- Ø¹Ù†Ø¯ Ø§Ø³ØªØ®Ø¯Ø§Ù… LM StudioØŒ ÙŠØ¨Ø¯Ø£ runtime Ø§Ù„Ø¢Ù† Ø¨Ù…Ø³Ø§Ø± `/api/v1/chat/completions` Ø«Ù… ÙŠØ³ØªØ®Ø¯Ù… `/api/v1/chat` ÙƒÙ…Ø³Ø§Ø± Ø¨Ø¯ÙŠÙ„ØŒ ÙˆÙ„Ø§ ÙŠØ³ØªØ®Ø¯Ù… `/chat/completions` ØºÙŠØ± Ø§Ù„ØµØ­ÙŠØ­ Ù„Ù…Ø²ÙˆØ¯ LM Studio.
- ØªÙ… Ø¶Ø¨Ø· Ø­Ø¯ Ø²Ù…Ù†ÙŠ Ù„Ø§Ø³ØªØ¯Ø¹Ø§Ø¡Ø§Øª Ø§Ù„Ù…ÙˆØ¯ÙŠÙ„ Ø§Ù„ØªÙØ§Ø¹Ù„ÙŠØ©ØŒ ÙˆØ¥Ø°Ø§ ÙØ´Ù„ Ø§Ù„Ù…Ø²ÙˆØ¯ ÙŠØ±Ø¬Ø¹ Ø§Ù„ÙˆÙƒÙŠÙ„ Ø±Ø³Ø§Ù„Ø© Ø®Ø·Ø£ ÙˆØ§Ø¶Ø­Ø© Ø¨Ø¯Ù„ Ø¥Ø¨Ù‚Ø§Ø¡ Ø§Ù„ÙˆØ§Ø¬Ù‡Ø© Ø¨Ø­Ø§Ù„Ø© ØªØ´ØºÙŠÙ„.
- ØªÙ… Ø¥Ø¹Ø§Ø¯Ø© Ø­Ø²Ù… `release-production-v4/win-unpacked/resources/app.asar` Ø¨Ø¹Ø¯ Ù†Ø¬Ø§Ø­ Ø§Ù„Ø¨Ù†Ø§Ø¡ ÙˆØ§Ø®ØªØ¨Ø§Ø± Ø³Ø¤Ø§Ù„ Ø¨Ø³ÙŠØ· Ù…Ù† Ø§Ù„Ù†Ø³Ø®Ø© Ø§Ù„Ø¥Ù†ØªØ§Ø¬ÙŠØ©.

## Ø¥Ø¶Ø§ÙØ© Ù…ÙˆØ¯ÙŠÙ„ Google Nano Banana 2 Lite Ù„Ù„ØµÙˆØ± (2026-07-02)
- ØªÙ… Ø¯Ù…Ø¬ Ø§Ù„Ù…ÙˆØ¯ÙŠÙ„ Ø§Ù„Ø¬Ø¯ÙŠØ¯ `Google Nano Banana 2 Lite` (Ø§Ù„Ù…Ø·Ø§Ø¨Ù‚ Ù„Ù€ `gemini-3.1-flash-lite-image-preview` Ù…Ù† Ù‚ÙˆÙ‚Ù„) Ø¨ØµÙØ­Ø© Ø§Ù„ØµÙˆØ± ÙˆØ§Ù„Ø£Ø¯ÙˆØ§Øª ÙˆØ¹Ù…Ù„Ø§Ø¡ Ø§Ù„Ù€ CEP.
- Ø§Ù„Ù…ÙˆØ¯ÙŠÙ„ ÙŠØ¯Ø¹Ù… Ù†Ø³Ø¨ Ø£Ø¨Ø¹Ø§Ø¯ Ù…ØªÙ†ÙˆØ¹Ø©ØŒ ÙˆØ¨Ø­Ø¯ Ø£Ù‚ØµÙ‰ 14 ØµÙˆØ±Ø© Ù…Ø±Ø¬Ø¹ÙŠØ© Ù„Ù„Ù€ Image-to-Image ÙˆØ¨Ø£Ù‚Ù„ ØªÙƒÙ„ÙØ© Ø§Ø³ØªÙ‡Ù„Ø§Ùƒ Ø±ØµÙŠØ¯ (0.40 Ù†Ù‚Ø·Ø©).

## Saad Agent deterministic routing correction (2026-07-02)

- Ø·Ù„Ø¨Ø§Øª Ù…Ø®Ø·Ø· Ø§Ù„ØµÙØ­Ø© Ù…Ø«Ù„ `Ø§Ø¹Ø·ÙŠÙ†ÙŠ Ù…Ø®Ø·Ø· Ø§Ù„ØµÙØ­Ø©` Ù„Ø§ ÙŠØ¬ÙˆØ² Ø£Ù† ØªÙ†ØªØ¬ ØµÙØ­Ø§Øª Ø£Ùˆ Ù…Ù„ÙØ§Øª Ø£Ùˆ APIs ÙˆÙ‡Ù…ÙŠØ©. Ø¥Ø°Ø§ Ù„Ù… ÙŠØ°ÙƒØ± Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø§Ø³Ù… Ø§Ù„ØµÙØ­Ø© Ø£Ùˆ ÙˆØ¸ÙŠÙØªÙ‡Ø§ØŒ ÙŠØ¬Ø¨ Ø·Ù„Ø¨ Ø§Ù„ØªÙˆØ¶ÙŠØ­ ÙÙ‚Ø·. Ø¥Ø°Ø§ Ø°ÙÙƒØ± Ø§Ù„Ù…ÙˆØ¶ÙˆØ¹ØŒ ÙŠØ¹Ø±Ø¶ Ø§Ù„ÙˆÙƒÙŠÙ„ Ù…Ø®Ø·Ø·Ø§Ù‹ Ø¹Ø§Ù…Ø§Ù‹ Ù…Ø¶Ø¨ÙˆØ·Ø§Ù‹ ÙˆÙ„Ø§ ÙŠÙ†ÙØ° Ø£ÙŠ ØªØ¹Ø¯ÙŠÙ„ Ø¨Ø¯ÙˆÙ† Ù…ÙˆØ§ÙÙ‚Ø©.
- Ø·Ù„Ø¨Ø§Øª Ø§Ù„Ø¨Ø­Ø« Ø§Ù„Ø®Ø§Ø±Ø¬ÙŠ Ù…Ø«Ù„ `Ø§Ø¨Ø­Ø« Ø¨Ø§Ù„Ø§Ù†ØªØ±Ù†Øª ...` ÙŠØ¬Ø¨ Ø£Ù† ØªÙ…Ø± Ø¹Ø¨Ø± Ù…ÙˆØ§ÙÙ‚Ø© Ø§Ù„Ø¥Ù†ØªØ±Ù†Øª ÙÙŠ ÙˆØ¶Ø¹ `Ask for approval`ØŒ Ø«Ù… ØªØ³ØªØ®Ø¯Ù… Ù…Ø³Ø§Ø± Ø¨Ø­Ø« Ø­Ù‚ÙŠÙ‚ÙŠ. Ù…Ù…Ù†ÙˆØ¹ ØªÙˆÙ„ÙŠØ¯ Ø±ÙˆØ§Ø¨Ø· Ø£Ùˆ Ù†ØªØ§Ø¦Ø¬ Ø­Ø¯ÙŠØ«Ø© Ù…Ù† Ù…Ø¹Ø±ÙØ© Ø§Ù„Ù†Ù…ÙˆØ°Ø¬ ÙÙ‚Ø·.
- Ø§Ù„Ø±Ø¯ÙˆØ¯ Ø§Ù„Ù‚ØµÙŠØ±Ø© Ù…Ø«Ù„ `Ù†Ø¹Ù…` Ø¨Ø¹Ø¯ Ø³Ø¤Ø§Ù„ ØªÙˆØ¶ÙŠØ­ÙŠ ÙŠØ¬Ø¨ Ø£Ù† ØªØ¨Ù‚Ù‰ Ø¶Ù…Ù† Ù†ÙØ³ Ø§Ù„Ø³ÙŠØ§Ù‚. Ø¥Ø°Ø§ ÙƒØ§Ù† Ø§Ù„ØªÙˆØ¶ÙŠØ­ Ù†Ø§Ù‚ØµØ§Ù‹ØŒ ÙŠØ·Ù„Ø¨ Ø§Ù„ÙˆÙƒÙŠÙ„ Ø§Ù„ØªÙØµÙŠÙ„ Ø§Ù„Ù…Ø·Ù„ÙˆØ¨ Ø¨Ø¯Ù„ Ø§Ù„Ø§Ù†ØªÙ‚Ø§Ù„ Ù„Ù…ÙˆØ¶ÙˆØ¹ Ø¬Ø¯ÙŠØ¯ Ø£Ùˆ Ø§Ø³ØªØ¯Ø¹Ø§Ø¡ Ø§Ù„Ù…ÙˆØ¯ÙŠÙ„.

## ØªØ­Ø¯ÙŠØ« Ø³ÙŠØ§Ø³Ø© Ø§Ù„Ø³Ù„ÙØ© (Credit Advance Policy Update) â€” (2026-07-01)
- **Ù…Ù†Ø¹ Ø·Ù„Ø¨ Ø§Ù„Ø³Ù„ÙØ© ÙÙŠ Ø¢Ø®Ø± Ø´Ù‡Ø±ÙŠÙ†**: ØªÙ… ØªØ¹Ø¯ÙŠÙ„ Ø¢Ù„ÙŠØ© Ø·Ù„Ø¨ Ø§Ù„Ø³Ù„ÙØ© (`creditAdvance`) Ù„Ù„Ù…Ø´ØªØ±ÙƒÙŠÙ† Ø§Ù„Ø³Ù†ÙˆÙŠÙŠÙ† Ø¨Ø­ÙŠØ« ØªÙØ¹Ø·Ù„ ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ ÙˆØªØ¸Ù‡Ø± ØºÙŠØ± Ù…ØªØ§Ø­Ø© (`available: false`) Ø®Ù„Ø§Ù„ Ø¢Ø®Ø± Ø´Ù‡Ø±ÙŠÙ† (60 ÙŠÙˆÙ…Ø§Ù‹) Ù…Ù† ÙØªØ±Ø© Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ Ø§Ù„ÙØ¹Ù„ÙŠ Ø§Ù„Ù…ØªØ¨Ù‚ÙŠØ© (`stripeCurrentPeriodEnd`). ÙŠÙ…Ù†Ø¹ Ø§Ù„Ù†Ø¸Ø§Ù… Ø§Ù„Ø®Ù„ÙÙŠ Ø·Ù„Ø¨Ù‡Ø§ ÙÙŠ Ù‡Ø°Ù‡ Ø§Ù„ÙØªØ±Ø© ÙˆÙŠØ¹ÙŠØ¯ Ø±Ø³Ø§Ù„Ø© Ø®Ø·Ø£ ÙˆØ§Ø¶Ø­Ø© Ø¨Ø§Ù„Ù„ØºØ© Ø§Ù„Ø¹Ø±Ø¨ÙŠØ© ÙˆØ§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ©.

## Saad Agent Engineering Knowledge Manager & Permanent Learning Library â€” Phase 2 & Action Updates (2026-06-30)

- **Knowledge Pack Card Validation**: Normalizes missing metadata attributes (pages, chunks, dictionaryTerms, storageSize = 0, relations = "Not available", lastUpdated = null) to prevent NaN and Invalid Date in the interface.
- **Knowledge Pack Reindexing**: Implemented a complete Reindex action that re-loads documents, re-calculates chunk sizes and dictionary terms, updates the database/indexes, and updates UI feedback immediately.
- **Graceful Error Handling**: Displays clear error message "Cannot reindex. Source files are missing." if pack source files are missing.
- **Dynamic Pack Naming**: Derives Knowledge Pack name from source URL/folder name if no name is specified, and allows user overrides.
- **Strict Data Summary**: topicsLearned only shows real headings/tags/terms; apiReferences only counts actual HTTP verb patterns; relationsBuilt is set to "Not available" since a backend graph database is not implemented yet.


## RAG Vault Path Alignment & Crawler Stability â€” Action Updates (2026-07-01)

- **Path Redirection to Vault**: Aligned all RAG queries (`list`, `get-document`, `get-dictionaries`, `get-term`) and chat orchestrator lookups to resolve dynamically using `KnowledgeManagerService.getDirs().registry` and `.dictionaries` rather than hardcoding local project-level paths under `.saad-agent/knowledge/`.
- **Compartmentalized Vault Registry**: Added a dedicated `registry` folder (`Registry/`) configuration property inside `DIRS` of `KnowledgeManagerService` to manage the RAG registry file dynamically under `E:\SaadAgentData\Registry\registry.json` with fallback migration capability.
- **Crawler Loop Safeguard**: Added undefined check guard `if (!existingPack.documents) { existingPack.documents = []; }` prior to scanning doc references inside pack JSON structures.
- **Diagnostics & Warning States**: Integrated active storage vault path display inside the settings panel and crawling reports, and updated `KnowledgeManager.tsx` to handle warning types with custom orange/amber alerts when crawls finish with warnings.


## Saad Agent Settings Management Center behavior (2026-06-28)

- Settings is the central management center for the packaged Saad Agent desktop app. It is not a cosmetic preferences dialog.
- Permanent main interface scope is limited to productivity: Chat, Workspace, Attachments, Running Tasks, Current Models, and Notifications.
- Provider, SDK, MCP, diagnostics, memory, security, backup, execution, connector, and advanced configuration must live inside Settings instead of remaining permanently visible in the main chat workspace.
- Settings navigation uses grouped desktop-app information architecture inspired by Cursor, VS Code, JetBrains IDEs, Claude Desktop, and Figma: Application, AI Runtime, Engineering, Creative, Operations, and System.
- Required Settings sections are: General, Workspace, Models, Providers, Agents, Skills, Tools, Connectors, MCP, Creative AI, Vision, Knowledge & Memory, Execution, Security, Backups, Diagnostics, and Advanced.
- Providers management must support add, remove, edit, enable/disable, test connection, health status, API key, endpoint URL, organization, default provider, priority order, and fallback provider. Supported visible providers include Ollama, LM Studio, OpenAI, Anthropic, Gemini, OpenRouter, and Saad Studio.
- Models are configured independently by role: Coding Model, Vision Model, Reviewer Model, and Fast Model. Each role stores provider, model name, temperature, max tokens, context window, streaming, timeout, and retry count.
- Current implementation is UI-state based for the redesign pass; persistence should later route through `SettingsManager` and encrypted secret storage.

## Saad Agent Agent SDK, Plugin SDK & MCP Integration behavior (2026-06-28)

- Phase 22 transforms Saad Agent into an extensible platform without modifying core code.
- Public `BaseAgentSDK` (`saad-agent/src/sdk/agent-sdk.ts`) exposes standard metadata and lifecycle hooks (`initialize`, `activate`, `deactivate`, `execute`, `dispose`).
- `PluginSDK` (`saad-agent/src/sdk/plugin-sdk.ts`) enforces sandboxed permission validation (`filesystem.read/write`, `network.read/write`, `provider.use`, `connector.use`, `workspace.modify`).
- `MCPClient` (`saad-agent/src/sdk/mcp-client.ts`) implements Model Context Protocol integration for discovering local/remote MCP servers, tools, and resources without executing remote code without explicit user approval.
- `ExtensionRegistry` (`saad-agent/src/sdk/extension-registry.ts`) manages dynamic extension points for custom agents, skills, connectors, creative providers, and tools with state toggling.
- UI renders an interactive `ExtensionsPanel` in the right engineering sidebar featuring Installed Extensions and Discovered MCP Servers.

## Saad Agent Windows Packaging & Release Hardening behavior (2026-06-28)

- Phase 21 prepares Saad Agent for Windows desktop distribution (`Saad Agent.exe`) using `electron-builder` with NSIS installer and portable targets.
- Production boot flow (`StartupManager`) sequentially loads settings, restores crash/workspace snapshots, and initializes skills/connectors with safe recovery fallbacks.
- Diagnostics bundle exporter (`DiagnosticsExporter`) exports structured JSON archives (`.saad-agent/exports/`) with automatic secret/token redaction (`[REDACTED_SECRET]`).
- Auto-updater architecture (`AutoUpdaterPlaceholder`) provides offline mock interfaces for update checking and downloads.
- Release hardening maintains strict IPC isolation (`contextIsolation: true`, `nodeIntegration: false`) and zero credential leaks.

## Saad Agent Production Platform & Engineering Standards behavior (2026-06-28)

- Phase 20 establishes permanent Engineering Standards (`saad-agent/src/standards/`) governing coding conventions, UI guidelines, architecture boundaries, code review checklists, user preferences, and non-negotiable decision policies (never modify `.env`, mandatory checkpoints).
- Production Platform infrastructure (`saad-agent/src/production/`) includes `CrashRecoveryManager` (automatic state snapshot restoration), local `DiagnosticsService` (OS, Node/Python runtimes, memory, connector health), structured `Logger` (exportable JSON logs), `BackupManager` (`.saad-agent/backups/`), `SettingsManager`, and real-time `PerformanceMonitor` (CPU, memory, context tokens).
- Security & Approval enforcement: Production mode strictly preserves explicit user approval workflows, checkpoint rollbacks, and secret isolation in encrypted connector storage.
- UI renders an interactive `ProductionPanel` in the right engineering sidebar featuring Diagnostics, Metrics, Standards, and Backup management tabs.

## Saad Agent Skills System & Domain Expertise Layer behavior (2026-06-28)

- Phase 19 introduces a modular Skills System (`saad-agent/src/skills/`) loading domain expertise guidelines dynamically without prompt bloat.
- `SkillRegistry` manages 12 initial built-in engineering skills (TypeScript, React, Next.js, Electron, Python, FFmpeg, Supabase, Backblaze B2, Vercel, Creative Design, Prompt Engineering, Adobe Premiere CEP).
- Matching is performed dynamically via task keywords and affected file patterns (`matchSkillsForTask`). Matched skill guidelines are automatically injected into the `ContextEngine` RAG context candidates as high-priority candidates.
- Security and control constraints: Skills contain purely static engineering guidelines and domain rules; they never store credentials or execute code directly. Tool execution remains strictly governed by the Orchestrator.
- UI renders a compact `SkillsPanel` in the right engineering sidebar displaying available skills, active task matches, confidence percentages, and activation reasons.

## Saad Agent Creative AI & Product Integration behavior (2026-06-28)

- Phase 18 introduces a modular Creative AI Engine (`saad-agent/src/creative/`) and Saad Studio product integration supporting text-to-image and placeholders for image-to-image, editing, and storyboarding.
- Provider interface (`CreativeProvider`) supports `local`, `saad_studio`, and future cloud types. `SaadStudioCreativeProvider` connects via first-party internal API shapes with safe mock fallback when unconfigured.
- Strict explicit user approval is mandatory before any generation job starts. Uncontrolled paid API calls, auto-spending credits, auto-publishing, and code deployment are strictly blocked.
- Generated assets are stored locally under `.saad-agent/attachments/generated/` with complete JSON metadata tracking (asset ID, prompt, model, seed, resolution, local path, timestamp, and cost).
- EventBus dispatches: `CreativePlanCreated`, `GenerationApprovalRequired`, `GenerationStarted`, `GenerationProgressUpdated`, `GenerationCompleted`, `GenerationFailed`, and `GeneratedAssetStored`.
- UI renders interactive chat cards for Creative Plan, Generation Approval, Progress, and Generated Assets.

## Saad Agent Context Engine & RAG behavior (2026-06-28)

- Phase 17 adds a read-only Context Engine used before planner/reasoning execution. The pipeline is: user request -> workspace analysis -> knowledge search -> engineering memory search -> dependency search -> architecture search -> attachment search -> context ranking -> token budget -> Reasoning Engine.
- Retrieval sources are `.saad-agent/knowledge/architecture.json`, `.saad-agent/knowledge/dependency-graph.json`, `.saad-agent/knowledge/project-summary.json`, Engineering Memory decisions/failures/successes/knowledge records, selected source files, attachment metadata, workspace statistics, and recent modification events.
- The implementation is split under `saad-agent/src/context/`: `context-engine.ts`, `retrieval-engine.ts`, `semantic-search.ts`, `ranking-engine.ts`, `token-optimizer.ts`, and `context-types.ts`. `platform/services/context-engine.ts` remains the compatibility service used by Electron IPC and Planner.
- Ranking includes filename/title similarity, symbol matches, dependency relationships, semantic token overlap, previous engineering decisions, task history, recent modifications, and workspace scope.
- Token optimization must not exceed the selected model/context limit. It preserves architecture, decision/failure/success memory, and dependency context first, trimming preserved high-priority content only when needed.
- Security filtering excludes `.env`, credentials, API keys, tokens, cookies, private keys, encrypted secret storage, and paths/files whose names indicate secrets. Memory content is scrubbed before storage and context assembly.
- The UI shows Context cards for retrieved files, engineering memory matches, previous decisions, previous failures, previous successes, architecture references, dependency references, token usage, compression summary, and ranking examples. It must not expose internal prompts.
- Project memory writes use sequential atomic JSON saves with short retries to avoid transient Windows file-lock failures while updating `.saad-agent/knowledge`.

## Admin provider balance monitor behavior (2026-06-27)

- `/admin` reads supplier balance/cost cards from `/api/admin/provider-balances`.
- The API returns a structured `providers[]` list for KIE, Google AI Studio, BytePlus Ark, WaveSpeed, and Backblaze B2, while preserving legacy `kie` and `wavespeed` fields for `/admin/pricing`.
- KIE and WaveSpeed use server-side provider balance APIs when their API keys are configured.
- Google AI Studio and BytePlus Ark are not scraped from browser console pages. They show numeric values only from explicit server environment values such as `GOOGLE_BILLING_USAGE_USD`, `GOOGLE_AI_STUDIO_COST_USD`, `BYTEPLUS_ARK_BALANCE_USD`, or `BYTEPLUS_ARK_USAGE_USD`; otherwise the UI shows `UNAVAILABLE` and links to the provider billing page.
- Dashboard values must never be guessed. Manual env-driven amounts are marked `MANUAL` in the UI.
- Backblaze B2 caps are read only from explicit env values: `BACKBLAZE_B2_CAP_REMAINING_USD`, or computed from `BACKBLAZE_B2_CAP_USD - BACKBLAZE_B2_USAGE_USD`; otherwise Backblaze shows `UNAVAILABLE` and links to `https://secure.backblaze.com/b2_caps_alerts.htm`.

## Website Transitions tool behavior (2026-06-27)

- `/apps/tool/transitions` uses a visible model picker for AI transition generation. Supported visible models are Kling 3.0 (`kling-3.0/video`) and Seedance Mini (`bytedance/seedance-2-mini`).
- Aspect ratio is user-selectable in the UI and is passed to generation/stitch requests.
- When both start and end inputs are videos, the tool preserves the uploaded clips and connects them with the FFmpeg stitch path instead of replacing them with AI-generated footage. Uploaded videos are validated at 5-15 seconds, and the user-selected transition duration is constrained to 1-3 seconds.
- Transition credit calculation uses central video pricing per selected AI model plus the preset multiplier. Video stitch uses a lower local transition charge because it is not an external AI video generation.

## Synchronize media source resolution diagnostics (2026-06-26)

- Timeline snapshot clip media path resolution order is fixed: first `projectItem.getMediaPath()`, then linked timeline items via `clip.getLinkedItems()`/`clip.linkedItems`, then unresolved.
- Snapshot clips expose `sourcePathResolutionMethod` as `projectItem.getMediaPath`, `linkedItem.projectItem.getMediaPath`, or `unresolved`.
- Unresolved clips expose `mediaUnavailableReason` as `nested_sequence`, `generated_clip`, `missing_project_item`, `empty_media_path`, or `unknown`.
- `buildSynchronizationPlan()` must report media-resolution diagnostics before blocking: total video/audio clips, clips with media paths, direct/linked counts, and first unresolved clips with track/index/name/reason.
- Waveform analysis must not start unless at least one real audio media path exists. Nested/generated clips are not directly analyzable unless a real underlying linked media path is resolved.

Ø¢Ø®Ø± Ù…Ø±Ø§Ø¬Ø¹Ø©: 2026-06-22

Ù‡Ø°Ø§ Ø§Ù„Ù…Ù„Ù Ù‡Ùˆ Ø§Ù„Ù…Ø±Ø¬Ø¹ Ø§Ù„ØªØ´ØºÙŠÙ„ÙŠ Ø§Ù„Ù…Ø®ØªØµØ± Ù„Ù„Ù…Ø­Ø§Ø¯Ø«Ø§Øª Ø§Ù„Ù„Ø§Ø­Ù‚Ø©. Ø¹Ù†Ø¯ Ø§Ù„ØªØ¹Ø§Ø±Ø¶ØŒ ØªÙƒÙˆÙ† Ø§Ù„Ø£ÙˆÙ„ÙˆÙŠØ© Ù„Ù„ÙˆØ«Ø§Ø¦Ù‚ Ø§Ù„Ø±Ø³Ù…ÙŠØ©ØŒ Ø«Ù… Ù„Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª Runtime Ø§Ù„Ù…Ø«Ø¨ØªØ© Ø¯Ø§Ø®Ù„ PremiereØŒ Ø«Ù… Ù„Ù„Ù…Ø±Ø¬Ø¹ Ø§Ù„Ù…Ø¹Ù…Ø§Ø±ÙŠ v3.1.

Ø§Ù„Ù…Ø±Ø¬Ø¹ Ø§Ù„Ù…Ø­Ù„ÙŠ Ø§Ù„ÙƒØ§Ù…Ù„ v3.1 Ù‡Ùˆ `C:\Users\PC\Downloads\Ø§Ù„Ù…Ø±Ø¬Ø¹.md`. Ù‡ÙˆÙŠØ© Ø§Ù„Ù†Ø³Ø®Ø© Ø§Ù„Ù…Ù‚Ø±ÙˆØ¡Ø© ÙƒØ§Ù…Ù„Ø© Ø¨ØªØ§Ø±ÙŠØ® 2026-06-18: `25,858` Ø¨Ø§ÙŠØªØŒ `531` Ø³Ø·Ø±Ù‹Ø§ØŒ Ø¢Ø®Ø± ØªØ¹Ø¯ÙŠÙ„ `2026-06-06 01:59:15`ØŒ ÙˆSHA-256: `9D0F1DE093A0C4D19FB6F0B85F3C038F1AFA7BDF738A8C0D5E6A03789498168D`.

ØªÙ†Ø¨ÙŠÙ‡ Ø­Ø§Ù„Ø©: Ù‚Ø³Ù… `PHASE N â€” NEXT TASK ONLY` Ø¯Ø§Ø®Ù„ v3.1 ÙŠÙˆØ«Ù‚ Ù…Ø±Ø­Ù„Ø© ØªØ§Ø±ÙŠØ®ÙŠØ© Ø³Ø¨Ù‚Øª Ø§Ù„ØªÙ†ÙÙŠØ° Ø§Ù„Ø­Ø§Ù„ÙŠ. ØªØ¨Ù‚Ù‰ Ù‚ÙˆØ§Ø¹Ø¯Ù‡ Ø§Ù„Ù…Ø¹Ù…Ø§Ø±ÙŠØ© ÙˆÙ‚ÙˆØ§Ø¹Ø¯ Ø§Ù„Ø³Ù„Ø§Ù…Ø© Ù†Ø§ÙØ°Ø©ØŒ Ø¨ÙŠÙ†Ù…Ø§ ØªÙÙ‚Ø±Ø£ Ø­Ø§Ù„Ø© Ø§Ù„Ø¥Ù†Ø¬Ø§Ø² Ù…Ù† Ø§Ù„ÙƒÙˆØ¯ Ø§Ù„Ø­Ø§Ù„ÙŠ Ùˆ`PROJECT_CONTEXT.md` ÙˆÙ†ØªØ§Ø¦Ø¬ Runtime. ØªÙ… Ø­Ø°Ù Silence Removal Ù…Ù† Ø§Ù„Ù…Ù†ØªØ¬ Ø§Ù„Ø­Ø§Ù„ÙŠ Ø¨ØªØ§Ø±ÙŠØ® 2026-06-26 Ø¨Ù†Ø§Ø¡Ù‹ Ø¹Ù„Ù‰ Ø·Ù„Ø¨ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù….

## Ø¨ÙŠØ¦Ø© Ø§Ù„ØªØ´ØºÙŠÙ„ ÙˆØ§Ù„Ø­Ù‚Ø§Ø¦Ù‚ Ø§Ù„Ù…Ø¹Ø±ÙˆÙØ©

- Ø¥ØµØ¯Ø§Ø± Ø§Ù„Ù…Ø¶ÙŠÙ Ø§Ù„Ù…Ø³ØªÙ‡Ø¯Ù: **Premiere Pro 26.2.0**.
- Ø§Ù„ØªÙƒØ§Ù…Ù„ Ø§Ù„Ø­Ø§Ù„ÙŠ: **CEP Extension** Ø¨Ø§Ø³ØªØ®Ø¯Ø§Ù… ExtendScriptØŒ ÙˆÙ„ÙŠØ³ UXP.
- **FFmpeg Ù…Ø·Ù„ÙˆØ¨** Ù„Ù„ØªØ­Ù„ÙŠÙ„ Ø§Ù„ØµÙˆØªÙŠ Ø®Ø§Ø±Ø¬ Premiere.
- Ø§ÙƒØªØ´Ø§Ù Ù†Ø´Ø§Ø· Ø§Ù„Ù…ØªØ­Ø¯Ø« ÙÙŠ Multi-Cam ÙŠØ¹ØªÙ…Ø¯ Ù‚ÙŠØ§Ø³Ø§Øª **RMS**.
- Ø£Ø¯Ø§Ø© **Multi-Cam Auto Switch** ÙØ¹Ù‘Ø§Ù„Ø©. Ø£Ø¯Ø§Ø© **Silence Removal** Ù…Ø­Ø°ÙˆÙØ© Ù…Ù† ÙˆØ§Ø¬Ù‡Ø© ÙˆÙ…Ø³Ø§Ø± ØªØ´ØºÙŠÙ„ Ø§Ù„Ø¥Ø¶Ø§ÙØ© Ø­Ø§Ù„ÙŠØ§Ù‹.
- **Reap API** Ù…Ø³Ø§Ø± Ù…Ù†ÙØµÙ„ Ø¹Ù† ØªÙ†ÙÙŠØ° Ø§Ù„Ù…ÙˆÙ†ØªØ§Ø¬ Ø¯Ø§Ø®Ù„ Premiere.

## Ø­Ø§Ù„Ø© Ù…ÙŠØ²Ø© Auto Zoom Ø§Ù„Ø­Ø§Ù„ÙŠØ©
- **Auto Zoom Status**:
  * Disabled (Ù…Ø¹Ø·Ù„Ø© Ø¨Ø§Ù„ÙƒØ§Ù…Ù„)
  * Hidden from UI (Ù…Ø®ÙÙŠØ© Ù…Ù† ÙˆØ§Ø¬Ù‡Ø© Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…)
  * Removed from One Click Pipeline (ØªÙ…Øª Ø¥Ø²Ø§Ù„ØªÙ‡Ø§ ÙƒÙ„ÙŠØ§Ù‹ Ù…Ù† Ø®Ø· Ø§Ù„ØªØ­Ø±ÙŠØ± Ø§Ù„Ù…ÙˆØ­Ø¯)
  * Archived for future repair (Ù…Ø¤Ø±Ø´ÙØ© Ù„Ù„Ø¥ØµÙ„Ø§Ø­ ÙˆØ§Ù„ØªØ·ÙˆÙŠØ± Ø§Ù„Ù…Ø³ØªÙ‚Ø¨Ù„ÙŠ)
  * Not part of current production workflow (Ù„ÙŠØ³Øª Ø¬Ø²Ø¡Ø§Ù‹ Ù…Ù† Ø³ÙŠØ± Ø§Ù„Ø¹Ù…Ù„ Ø§Ù„Ø¥Ù†ØªØ§Ø¬ÙŠ Ø§Ù„Ø­Ø§Ù„ÙŠ)

## ÙØµÙ„ Ù†Ø·Ø§Ù‚ÙŠ Ø§Ù„Ø¹Ù…Ù„

- **Reap API**: Ø®Ø¯Ù…Ø© Ø®Ø§Ø±Ø¬ÙŠØ© Ù„Ø¥Ù†ØªØ§Ø¬ Ø§Ù„Ù…Ù‚Ø§Ø·Ø¹ Ø§Ù„Ù‚ØµÙŠØ±Ø©ØŒ captionsØŒ reframingØŒ dubbingØŒ transcription ÙˆØ§Ù„Ù†Ø´Ø± Ø§Ù„Ø§Ø¬ØªÙ…Ø§Ø¹ÙŠ. Ù„ÙŠØ³Øª Ù…Ø­Ø±Ù‘Ùƒ ØªØ¨Ø¯ÙŠÙ„ ÙƒØ§Ù…ÙŠØ±Ø§Øª Ø§Ù„Ù€ timelineØŒ ÙˆÙ„Ø§ Ù†Ø¹ØªÙ…Ø¯ Ø¹Ù„ÙŠÙ‡Ø§ Ù„ØªØ­Ù„ÙŠÙ„ Ù†Ø´Ø§Ø· Ù…ØªØ­Ø¯Ø«ÙŠ Multi-Cam ÙÙŠ Ø§Ù„Ø¥ØµØ¯Ø§Ø± Ø§Ù„Ø£ÙˆÙ„.
- **Premiere CEP (Saad Studio)**: ÙŠÙ‚Ø±Ø£ ÙˆÙŠØ¹Ø¯Ù‘Ù„ Ù…Ø´Ø±ÙˆØ¹ Premiere Ø¹Ø¨Ø± ExtendScript. ØªØ­Ù„ÙŠÙ„ Ø§Ù„ØµÙˆØª Ø§Ù„Ø­Ù‚ÙŠÙ‚ÙŠ ÙŠØªÙ… Ø®Ø§Ø±Ø¬ Premiere Ø¨ÙˆØ§Ø³Ø·Ø© FFmpegØŒ Ø«Ù… ØªÙØ­ÙˆÙ‘Ù„ Ù†ØªØ§Ø¦Ø¬Ù‡ Ø¥Ù„Ù‰ Ù‚Ø±Ø§Ø±Ø§Øª timeline.

## Ø¢Ù„ÙŠØ© Multi-Cam Auto Switch

1. Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ù€ active sequence ÙˆØªØ®Ø·ÙŠØ· Ù…Ø³Ø§Ø±Ø§Øª Ø§Ù„ÙÙŠØ¯ÙŠÙˆ ÙˆØ§Ù„ØµÙˆØª.
2. ØªØ¹ÙŠÙŠÙ† Ù…ØªØ­Ø¯Ø« Ù„ÙƒÙ„ Ù…Ø³Ø§Ø± ØµÙˆØª ÙˆÙƒØ§Ù…ÙŠØ±Ø§ Ù„ÙƒÙ„ Ù…Ø³Ø§Ø± ÙÙŠØ¯ÙŠÙˆØŒ Ø¯ÙˆÙ† ØªØ«Ø¨ÙŠØª Host/Guest.
3. Ø§Ø³ØªØ®Ø±Ø§Ø¬ `ProjectItem.getMediaPath()` Ù„ÙƒÙ„ Ù…ØµØ¯Ø± ØµÙˆØª. Ù„Ø§ ØªØ®Ù…ÙŠÙ† Ø¹Ù†Ø¯ ØºÙŠØ§Ø¨ Ø§Ù„Ù…Ø³Ø§Ø± Ø£Ùˆ ÙˆØ¬ÙˆØ¯ nested/mixed source ØºÙŠØ± Ù…Ø¯Ø¹ÙˆÙ….
4. ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ù…ØµØ§Ø¯Ø± Ø¨ÙˆØ§Ø³Ø·Ø© FFmpeg (`astats`/RMS)ØŒ Ù„Ø£Ù† Premiere scripting Ù„Ø§ ÙŠÙˆÙÙ‘Ø± RMS Ø£Ùˆ waveform Ø£Ùˆ speaker activity Ø­Ù‚ÙŠÙ‚ÙŠØ©.
5. ØªØ­ÙˆÙŠÙ„ Ø²Ù…Ù† Ø§Ù„Ù…ØµØ¯Ø± Ø¥Ù„Ù‰ Ø²Ù…Ù† Ø§Ù„Ù€ timeline:
   `timelineTimeSec = clip.start.seconds + (ffmpegTimeSec - clip.inPoint.seconds)`.
6. Ø¥Ù†Ø´Ø§Ø¡ speaker-activity segmentsØŒ Ø«Ù… camera decisions Ù…Ø¹ thresholdØŒ dominance marginØŒ hysteresisØŒ minimum shot lengthØŒ overlap/wide-shot rules.
7. Ù…Ø­Ø§Ø°Ø§Ø© Ø§Ù„Ù‚Ø±Ø§Ø±Ø§Øª Ø¥Ù„Ù‰ frames/ticks Ù‚Ø¨Ù„ Ø§Ù„ØªÙ†ÙÙŠØ°.
8. ØªØ·Ø¨ÙŠÙ‚ Ø§Ù„ØªØ­Ø±ÙŠØ± ÙÙ‚Ø· Ø¨Ø¹Ø¯ Runtime Proof ÙˆØ§Ø¶Ø­. Ù„Ø§ ÙŠÙˆØ¬Ø¯ Razor/Split API Ù…ÙˆØ«Ù‘Ù‚ Ù†Ø¹ØªÙ…Ø¯ Ø¹Ù„ÙŠÙ‡.

## Ø­Ù‚Ø§Ø¦Ù‚ Premiere Ø§Ù„Ù…Ø¤ÙƒØ¯Ø©

- `Sequence.clone()` ÙŠÙ†Ø´Ø¦ Ù†Ø³Ø®Ø© ÙˆÙŠØ¹ÙŠØ¯ Boolean ÙˆÙÙ‚ Ù…Ø±Ø¬Ø¹ Sequence Ø§Ù„Ø±Ø³Ù…ÙŠØ› ÙŠØ¬Ø¨ Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ø§Ù„Ù†Ø³Ø®Ø© Ø§Ù„Ù†Ø§ØªØ¬Ø© Ø¹Ø¨Ø± ÙØ±Ù‚ `sequenceID`/Ø¹Ø¯Ø¯ sequencesØŒ Ù„Ø§ Ø§Ù„ØªØ¹Ø§Ù…Ù„ Ù…Ø¹ Ù‚ÙŠÙ…Ø© Ø§Ù„Ø¥Ø±Ø¬Ø§Ø¹ ÙƒÙƒØ§Ø¦Ù† Sequence.
- `Sequence.insertClip(projectItem, time, vTrackIndex, aTrackIndex)` Ùˆ`Sequence.overwriteClip(...)` Ù…ÙˆØ«Ù‚ØªØ§Ù†ØŒ Ù„ÙƒÙ† ÙŠÙ„Ø²Ù… Ø§Ø®ØªØ¨Ø§Ø± Runtime Ù‚Ø¨Ù„ Ø§Ù„Ø§Ø¹ØªÙ…Ø§Ø¯ Ø§Ù„Ø¥Ù†ØªØ§Ø¬ÙŠ.
- `TrackItem.disabled` ÙŠØ¹Ø·Ù„ Ø§Ù„Ù…Ù‚Ø·Ø¹ ÙƒØ§Ù…Ù„Ù‹Ø§ØŒ ÙˆÙ„ÙŠØ³ Ø¬Ø²Ø¡Ù‹Ø§ Ø²Ù…Ù†ÙŠÙ‹Ø§ Ø¯Ø§Ø®Ù„Ù‡Ø› Ù„Ø°Ù„Ùƒ Ù„Ø§ ÙŠØ­Ù„ ÙˆØ­Ø¯Ù‡ Ù…Ø´ÙƒÙ„Ø© Ù…Ù‚Ø·Ø¹ ÙƒØ§Ù…ÙŠØ±Ø§ Ø·ÙˆÙŠÙ„ ØºÙŠØ± Ù…Ù‚Ø³Ù‘Ù….
- `clip.start/end` Ø²Ù…Ù† timelineØŒ Ùˆ`clip.inPoint/outPoint` Ø²Ù…Ù† Ø§Ù„Ù…ØµØ¯Ø±.
- `sequence.timebase` Ù‡Ùˆ ticks per frameØŒ ÙˆØ«Ø§Ø¨Øª Premiere Ù‡Ùˆ `254016000000` ticks/second.
- Ù„Ø§ Ù†ÙØªØ±Ø¶ Ø¯Ø¹Ù… ØªØ¨Ø¯ÙŠÙ„ multicam angles Ø¨Ø±Ù…Ø¬ÙŠÙ‹Ø§ØŒ ÙˆÙ„Ø§ Ù†Ø®Ù„Ø· ÙƒÙˆØ¯ UXP Ù…Ø¹ CEP.
- JSX ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙ‚ØªØµØ± Ø¹Ù„Ù‰ Ù‚Ø±Ø§Ø¡Ø©/ÙƒØªØ§Ø¨Ø© Premiere ÙˆØ¥Ø±Ø¬Ø§Ø¹ JSONØ› FFmpeg ÙˆÙ…Ù†Ø·Ù‚ Ø§Ù„Ù‚Ø±Ø§Ø±Ø§Øª ÙŠØ¨Ù‚ÙŠØ§Ù† ÙÙŠ Ø·Ø¨Ù‚Ø© TypeScript Ù…Ø³ØªÙ‚Ù„Ø©.

## Ø§Ù„Ø³Ù„ÙˆÙƒ Ø§Ù„Ø­Ø§Ù„ÙŠ Ø§Ù„Ø°ÙŠ ÙˆØµÙ„ Ø¥Ù„ÙŠÙ‡ Ø§Ù„ØªØ·ÙˆÙŠØ±

- ØªÙˆØ¬Ø¯ Ù…Ù„Ø§Ø­Ø© ÙˆØ£Ø¯Ø§Ø© Multi-Cam Auto Switch Ø¯Ø§Ø®Ù„ Ø¥Ø¶Ø§ÙØ© CEP. Silence Removal Ù…Ø­Ø°ÙˆÙØ© Ù…Ù† Ø§Ù„ÙˆØ§Ø¬Ù‡Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ©.
- Synchronize ÙŠÙ‚Ø±Ù† TrackItems Ø§Ù„ØµÙˆØªÙŠØ© ÙˆØ§Ù„Ù…Ø±Ø¦ÙŠØ© Ø¨Ø­Ø³Ø¨ Ù…Ø³Ø§Ø± Ø§Ù„Ù…ØµØ¯Ø± Ù†ÙØ³Ù‡ØŒ Ù„Ø§ Ø¨Ø­Ø³Ø¨ ØªØ³Ø§ÙˆÙŠ Ø±Ù‚Ù… V Ù…Ø¹ Ø±Ù‚Ù… AØŒ Ø«Ù… ÙŠØ­Ù„Ù„ waveform Ø®Ø§Ø±Ø¬ Premiere.
- ØªØ­Ù„ÙŠÙ„ Synchronize ÙŠÙ…ØªØ¯ Ø­ØªÙ‰ 15 Ø¯Ù‚ÙŠÙ‚Ø© ÙˆÙŠØ³ØªØ®Ø¯Ù… Ø¨Ø­Ø« Ø§Ø±ØªØ¨Ø§Ø· Ø®Ø´Ù† Ø¨Ø¯Ù‚Ø© 1 Ø«Ø§Ù†ÙŠØ© Ø«Ù… Ø¯Ù‚ÙŠÙ‚ Ø¨Ø¯Ù‚Ø© 0.1 Ø«Ø§Ù†ÙŠØ©. Ø§ØªØ¬Ø§Ù‡ lag Ø§Ù„Ù…Ø¹ØªÙ…Ø¯ Ù‡Ùˆ `targetStart = referenceStart - lag`.
- ØªÙˆØ«ÙŠÙ‚ Premiere ÙŠØ¹Ø±Ù‘Ù `TrackItem.move(Time)` ÙƒØ¥Ø²Ø§Ø­Ø© Ù†Ø³Ø¨ÙŠØ©ØŒ Ù„ÙƒÙ† Runtime ÙÙŠ 26.2.0 Ø£Ø¹Ø·Ù‰ `Invalid parameter` Ù„Ù„Ø¥Ø²Ø§Ø­Ø© Ø£Ùˆ Ø¹Ø§Ø¯ Ø¯ÙˆÙ† ØªØºÙŠÙŠØ± Ø§Ù„Ø²Ù…Ù† Ø¹Ù†Ø¯ ØªÙ…Ø±ÙŠØ± Ù…ÙˆØ¶Ø¹ Ù…Ø·Ù„Ù‚Ø› Ù„Ø°Ù„Ùƒ Ù„Ø§ ÙŠØ¹ØªÙ…Ø¯ Synchronize Ø¹Ù„ÙŠÙ‡.
- Ø¥Ø°Ø§ Ù†ØªØ¬ start Ø³Ø§Ù„Ø¨ Ù„Ù…ØµØ¯Ø± ØµØ­ÙŠØ­ØŒ ØªÙØ²Ø§Ø­ Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹Ø© Ø§Ù„Ù…ØªØ²Ø§Ù…Ù†Ø© ÙƒÙ„Ù‡Ø§ Ù„Ù„Ø£Ù…Ø§Ù…. Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ ÙŠÙƒØªØ¨ `TrackItem.start/end` Ø§Ù„Ù…ÙˆØ«Ù‚ØªÙŠÙ† read/write Ø¨Ø§Ù„Ù‚ÙŠÙ… Ø§Ù„Ù…Ø·Ù„Ù‚Ø© Ù…Ø¹ Ø­ÙØ¸ Ø§Ù„Ù…Ø¯Ø© ÙˆØ§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„Ù‚ÙŠÙ… Ø¨Ø¹Ø¯ Ø§Ù„ÙƒØªØ§Ø¨Ø©.
- ÙŠÙ…Ù†Ø¹ Synchronize Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ Ø¥Ø°Ø§ ÙƒØ§Ù†Øª Ø«Ù‚Ø© Ø§Ù„Ø§Ø±ØªØ¨Ø§Ø· Ø£Ù‚Ù„ Ù…Ù† `0.35` Ø£Ùˆ ÙƒØ§Ù†Øª Ø§Ù„Ø¥Ø²Ø§Ø­Ø© Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø© Ø£ÙƒØ¨Ø± Ù…Ù† Ø­Ø¯ Ø§Ù„Ø£Ù…Ø§Ù† `30` Ø«Ø§Ù†ÙŠØ© (SYNC_OFFSET_OUT_OF_RANGE) Ø£Ùˆ ÙƒØ§Ù† Ù…ÙˆØ¶Ø¹ Ø§Ù„Ø¨Ø¯Ø§ÙŠØ© Ø§Ù„Ù…Ù‚ØªØ±Ø­ Ø³Ø§Ù„Ø¨Ù‹Ø§/ØºÙŠØ± ØµØ§Ù„Ø­ØŒ ÙˆÙŠØªØ­Ù‚Ù‚ Ù…Ù† `clip.start` Ø¨Ø¹Ø¯ Ø§Ù„Ù†Ù‚Ù„ Ø¨Ù‡Ø§Ù…Ø´ 0.05 Ø«Ø§Ù†ÙŠØ©.
- Ø¹Ø¯Ø§Ø¯ `Applied` ÙÙŠ Ø§Ù„ÙˆØ§Ø¬Ù‡Ø© ÙŠØ­Ø³Ø¨ Ø§Ù„ØªØ³Ø¬ÙŠÙ„Ø§Øª/Ø§Ù„Ø£Ø²ÙˆØ§Ø¬ Ø§Ù„Ù…ØªØ²Ø§Ù…Ù†Ø©ØŒ Ø¨Ù…Ø§ ÙÙŠÙ‡Ø§ Ø§Ù„Ù…Ø±Ø¬Ø¹ØŒ ÙˆÙ„Ø§ ÙŠØ¹Ø±Ø¶ Ø¹Ø¯Ø¯ TrackItems Ø§Ù„ØµÙˆØªÙŠØ© ÙˆØ§Ù„Ù…Ø±Ø¦ÙŠØ© Ø§Ù„ØªÙŠ ØªØ­Ø±ÙƒØª Ø¯Ø§Ø®Ù„ÙŠÙ‹Ø§. ØªØ¨Ù‚Ù‰ `clipsMoved` ÙÙŠ Ù†ØªÙŠØ¬Ø© Runtime Ø¹Ø¯Ø§Ø¯Ù‹Ø§ ØªÙ‚Ù†ÙŠÙ‹Ø§ Ù„Ù„ØªØ´Ø®ÙŠØµ.
- ØªÙ… Ø¥Ø«Ø¨Ø§Øª Ù‡Ø°Ø§ Ø§Ù„Ø³Ù„ÙˆÙƒ Ø¯Ø§Ø®Ù„ Premiere Runtime Ø¨ØªØ§Ø±ÙŠØ® 2026-06-18: Ø­Ø§Ù„Ø© Ø£Ø±Ø¨Ø¹Ø© ØªØ³Ø¬ÙŠÙ„Ø§Øª Ù…ØªØ²Ø§Ù…Ù†Ø© Ø¹Ø±Ø¶Øª `Applied: 4 clips` Ø¨Ù†Ø¬Ø§Ø­.
- ØªØ¯Ù‚ÙŠÙ‚ 2026-06-23 Ø«Ø¨Ù‘Øª Ø±ÙØ¹ Ø­Ø¯ Ø§Ù„Ø«Ù‚Ø© Ø¥Ù„Ù‰ `0.35` ÙƒÙ…Ø¹ÙŠØ§Ø± Ù‚Ø¨ÙˆÙ„ØŒ ÙˆØ¥Ø¶Ø§ÙØ© Ø¬Ø¯ÙˆÙ„ Ù…Ø¹Ø§ÙŠÙ†Ø© Ù…Ø§ Ù‚Ø¨Ù„ Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ Ø¨Ø§Ù„ÙˆØ§Ø¬Ù‡Ø© Ù„Ø¹Ø±Ø¶ Ø§Ù„Ø¥Ø²Ø§Ø­Ø§Øª ÙˆÙ‚ÙŠÙ… Ø§Ù„Ø«Ù‚Ø© ÙˆØ§Ù„Ø£Ø³Ø¨Ø§Ø¨ Ù„Ø¶Ù…Ø§Ù† Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø© Ø§Ù„Ø¢Ù…Ù†Ø© Ù‚Ø¨Ù„ ØªØ­Ø±ÙŠÙƒ Ø§Ù„ØªØ§ÙŠÙ…Ù„Ø§ÙŠÙ†. ÙƒÙ…Ø§ ØªÙ… Ø¥Ø®Ø±Ø§Ø¬ Ø®Ø·ÙˆØ© Ø§Ù„Ù…Ø²Ø§Ù…Ù†Ø© Ù…Ø¤Ù‚ØªØ§Ù‹ Ù…Ù† Ø®Ø· Ø§Ù„ØªØ­Ø±ÙŠØ± Ø§Ù„Ù…ÙˆØ­Ø¯ One Click (Ù„ÙŠØ¹Ù…Ù„ Ø¨Ù…Ø³Ø§Ø±: Duplicate -> Multi-Cam Auto Switch -> Auto Captions) Ø­ØªÙ‰ ØªÙ…Ø§Ù… Ø§Ø³ØªÙ‚Ø±Ø§Ø±Ù‡Ø§. ÙˆØªÙ…Øª ØªØ±Ù‚ÙŠØ© Ø¯Ù‚Ø© Ø§Ù„Ù…Ø²Ø§Ù…Ù†Ø© Ø¹Ø¨Ø± Ø®ÙˆØ§Ø±Ø²Ù…ÙŠØ© Ø§Ù„Ù‚Ù…Ù… Ø§Ù„Ù…ØªØ¹Ø¯Ø¯Ø© (Multi-Candidate Peaks) Ø¨Ø¯Ù„Ø§Ù‹ Ù…Ù† Ø§Ø®ØªÙŠØ§Ø± Ø£Ø¹Ù„Ù‰ Ù‚Ù…Ø© Ù…Ø·Ù„Ù‚Ø©Ø› Ø­ÙŠØ« ÙŠØªÙ… ÙØ­Øµ Ø£Ø¹Ù„Ù‰ 5 Ù‚Ù…Ù… ØªØ±Ø´ÙŠØ­ÙŠØ© Ø¯Ù‚ÙŠÙ‚Ø©ØŒ ÙˆØªØ·Ø¨ÙŠÙ‚ Ù‚Ø§Ø¹Ø¯Ø© Near/Far (Ø£ÙˆÙ„ÙˆÙŠØ© Ù„Ù„Ù€ +/- 15 Ø«Ø§Ù†ÙŠØ©) Ù„Ù…Ù†Ø¹ Ø§Ù„ØªÙ‚Ø§Ø· Ø¥Ø²Ø§Ø­Ø§Øª Ø¹Ø´ÙˆØ§Ø¦ÙŠØ© Ø¨Ø¹ÙŠØ¯Ø© ÙÙŠ Ø§Ù„Ù…Ù†Ø§Ø®Ø§Øª Ø§Ù„ØµØ§Ù…ØªØ© Ø¥Ù„Ø§ Ø¨ÙØ§Ø±Ù‚ Ø«Ù‚Ø© Ø¶Ø®Ù… ÙŠØ²ÙŠØ¯ Ø¹Ù† 0.15.
- Ø§Ù„ØªÙ†ÙÙŠØ° Ø§Ù„Ø­Ø§Ù„ÙŠ ÙŠØ³ØªØ®Ø¯Ù… `createSubClip` Ùˆ`overwriteClip` Ù„Ø¥Ø¹Ø§Ø¯Ø© Ø¨Ù†Ø§Ø¡ Ø£Ø¬Ø²Ø§Ø¡ Ù…Ø·Ù„ÙˆØ¨Ø© Ø¨Ø¯Ù„ Razor ØºÙŠØ± Ø§Ù„Ù…ÙˆØ¬ÙˆØ¯.
- Ø§Ù„Ø³Ù„ÙˆÙƒ Ø§Ù„Ø­Ø§Ù„ÙŠ ÙÙŠ worktree ÙŠÙ†Ø¸Ù‘Ù… Ø§Ù„Ø¹Ù†Ø§ØµØ± Ø§Ù„Ù…ÙˆÙ„Ù‘Ø¯Ø© ÙÙŠ Project Panel ØªØ­Øª bin Ø±Ø¦ÙŠØ³ÙŠ Ø¨Ø§Ø³Ù… `Saad Studio - <Premiere Project Name>` Ø«Ù… bin ÙØ±Ø¹ÙŠ Ù„Ù„Ø£Ø¯ÙˆØ§Øª Ø§Ù„Ù†Ø´Ø·Ø© Ù…Ø«Ù„ `Multi-Cam Auto Switch`.
- Ø¹Ù†Ø¯ ØªØ´ØºÙŠÙ„ Ø§Ù„Ø£Ø¯Ø§Ø©ØŒ ØªÙÙ†Ù‚Ù„ Ø§Ù„Ø¹Ù†Ø§ØµØ± Ø§Ù„Ù‚Ø¯ÙŠÙ…Ø© Ø§Ù„Ù…Ø¹Ø±ÙˆÙØ© Ù…Ù† Ø¬Ø°Ø± Ø§Ù„Ù…Ø´Ø±ÙˆØ¹ Ø¥Ù„Ù‰ bin Ø§Ù„Ø£Ø¯Ø§Ø© Ø§Ù„Ù…Ù†Ø§Ø³Ø¨.
- Multi-Cam ÙŠÙ…Ù†Ø¹ Ø¥Ø¹Ø§Ø¯Ø© Apply Ø¹Ù„Ù‰ sequence ÙŠØ­Ù…Ù„ marker ` - Saad Auto Switch Draft`. Ù„Ù… ÙŠØ¹Ø¯ Ù‡Ù†Ø§Ùƒ Ù…Ø³Ø§Ø± Silence Removal ÙŠØ¹ØªÙ…Ø¯ Ø¹Ù„Ù‰ Ù…Ø¹Ø§Ù„Ø¬Ø© Draft Ø§Ù„Ù€Multi-Cam.
- Ø¥Ø®Ø±Ø§Ø¬ Multi-Cam Ø¹Ù„Ù‰ duplicate ÙŠÙØ¶Ù‘Ù„ video track ÙØ§Ø±ØºÙ‹Ø§Ø› Ø¹Ù†Ø¯ Ø¹Ø¯Ù… ÙˆØ¬ÙˆØ¯Ù‡ ÙŠØ³ØªØ®Ø¯Ù… Ø£Ø¹Ù„Ù‰ track Ù‚Ø§Ø¨Ù„ Ù„Ù„ÙƒØªØ§Ø¨Ø© Ø¯Ø§Ø®Ù„ Ø§Ù„Ù†Ø³Ø®Ø© ÙÙ‚Ø·ØŒ Ù…Ø¹ warningØŒ Ø¨Ø¯Ù„ Ø¥Ù†Ø´Ø§Ø¡ clone Ø«Ù… Ø§Ù„ÙØ´Ù„ ÙˆØªØ±Ùƒ Draft ÙØ§Ø±Øº.
- Ù…Ù†Ø¹ Ø§Ù„ØªÙƒØ±Ø§Ø± Ø¯ÙØ§Ø¹ÙŠ ÙÙŠ Ø·Ø¨Ù‚ØªÙŠÙ†: Host JSX ÙŠØ±ÙØ¶ DraftØŒ ÙˆØ§Ù„ÙˆØ§Ø¬Ù‡Ø© ØªØ±ÙØ¶ Ø§Ù„Ø§Ø³Ù… Ù†ÙØ³Ù‡ ÙˆØªÙ‚ÙÙ„ Apply Ø¨Ø¹Ø¯ Ø£ÙˆÙ„ Ù†ØªÙŠØ¬Ø© Ø­ØªÙ‰ Analyze Ø¬Ø¯ÙŠØ¯. Ù‚Ø¨Ù„ Apply ØªØ¹ÙŠØ¯ Ø§Ù„ÙˆØ§Ø¬Ù‡Ø© ØªØ­Ù…ÙŠÙ„ Ù…Ù„Ù JSX Ù„Ø¶Ù…Ø§Ù† Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„Ù†Ø³Ø®Ø© Ø§Ù„Ù…Ø«Ø¨ØªØ©.
- Ø¹Ù†Ø§ØµØ± Runtime Proof ØªÙÙØµÙ„ ÙÙŠ bin Ù…Ø³ØªÙ‚Ù„ ÙˆÙ„Ø§ ØªÙØ®Ù„Ø· Ø¨Ù…Ø®Ø±Ø¬Ø§Øª Ø§Ù„Ø£Ø¯ÙˆØ§Øª Ø§Ù„Ø¥Ù†ØªØ§Ø¬ÙŠØ©.

### Ù…Ø±Ø¬Ø¹ Ù…Ù‚ØªØ·Ù Synchronization Ø§Ù„Ù…Ø±ÙÙ‚

- Ø§Ù„Ù…Ø±ÙÙ‚ `pasted-text.txt` Ø§Ù„Ù…Ù‚Ø±ÙˆØ¡ Ø¨ØªØ§Ø±ÙŠØ® 2026-06-18 Ø­Ø¬Ù…Ù‡ `5,209` Ø¨Ø§ÙŠØª ÙˆSHA-256 Ù‡Ùˆ `37C89A2A048DA07202DD348F67432DD61418443BF24A728BBA04B7C9553993C2`.
- ÙŠØ¤ÙƒØ¯ Ø§ØªØ¬Ø§Ù‡ Ø§Ù„ØªÙ†ÙÙŠØ° Ø§Ù„Ø­Ø§Ù„ÙŠ: Ø¬Ù…Ø¹ Ù…Ù‚Ø§Ø·Ø¹ Ø§Ù„ÙÙŠØ¯ÙŠÙˆ Ø§Ù„Ù…ØªØ§Ø­Ø© Ø«Ù… Ù…Ø·Ø§Ø¨Ù‚ØªÙ‡Ø§ Ø¨Ø§Ù„ØµÙˆØª Ø¹Ø¨Ø± `findPairedVideoClip` ÙˆÙ…Ø³Ø§Ø± Ø§Ù„Ù…ØµØ¯Ø±ØŒ Ø­Ø³Ø§Ø¨ `suggestedTimelineStartSec = referenceStart - estimatedLagSec`ØŒ ØªØ­ÙˆÙŠÙ„ Ø§Ù„Ø«Ù‚Ø© Ø§Ù„Ø£Ù‚Ù„ Ù…Ù† `0.08` Ø¥Ù„Ù‰ blockerØŒ Ø§Ø³ØªØ¯Ø¹Ø§Ø¡ `normalizeSynchronizationStarts`ØŒ ÙˆØ±ÙØ¹ Ø­Ø¯ Ù†Ø§ÙØ°Ø© Ø§Ù„ØªØ­Ù„ÙŠÙ„ Ù…Ù† 45 Ø¥Ù„Ù‰ 900 Ø«Ø§Ù†ÙŠØ©.
- Ø§Ù„Ù…Ø±ÙÙ‚ Ù†Ø§ØªØ¬ diff Ù…Ø¯Ù…Ø¬: ÙŠØ¬Ù…Ø¹ Ø¨Ø¯Ø§Ø¦Ù„ Ù‚Ø¯ÙŠÙ…Ø© ÙˆØ¬Ø¯ÙŠØ¯Ø© Ù…ÙƒØ±Ø±Ø© ÙˆØªÙˆØ¬Ø¯ ÙÙŠÙ‡ Ø£Ù‚ÙˆØ§Ø³/ØªÙˆØ§Ù‚ÙŠØ¹ Ù†Ø§Ù‚ØµØ©Ø› Ù„Ø°Ù„Ùƒ Ù‡Ùˆ Ù…Ø±Ø¬Ø¹ Ø¯Ù„Ø§Ù„ÙŠ ÙˆÙ„ÙŠØ³ Ù†Ø³Ø®Ø© Ù…ØµØ¯Ø± Ù‚Ø§Ø¨Ù„Ø© Ù„Ù„Ø¨Ù†Ø§Ø¡. Ø¹Ù†Ø¯ Ø§Ù„ØªØ¹Ø§Ø±Ø¶ ØªÙÙ‚Ø¯Ù‘Ù… Ø­Ø§Ù„Ø© Ø§Ù„ÙƒÙˆØ¯ Ø§Ù„Ø­Ø§Ù„ÙŠ Ø«Ù… Runtime Proof.

## Reap: Ø§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„Ù…Ø­ÙÙˆØ¸Ø©

- Base URL: `https://public.reap.video/api/v1/automation/`
- Ù…ØªØºÙŠØ±Ø§ Ø§Ù„Ø¨ÙŠØ¦Ø©: `REAP_API_KEY` Ùˆ`REAP_API_BASE=https://public.reap.video/api/v1/automation`Ø› Ù„Ø§ ØªÙØ­ÙØ¸ Ù‚ÙŠÙ…Ø© Ø§Ù„Ù…ÙØªØ§Ø­ ÙÙŠ Ø§Ù„Ù…Ø³ØªÙˆØ¯Ø¹ Ø£Ùˆ Ø§Ù„Ø°Ø§ÙƒØ±Ø©.
- Ø§Ù„Ù…ØµØ§Ø¯Ù‚Ø©: `Authorization: Bearer YOUR_API_KEY`
- Ø§Ù„Ø­Ø¯ Ø§Ù„Ù…Ø¹Ù„Ù†: 10 requests/minute/key.
- Ø¯ÙˆØ±Ø© Ø§Ù„Ø±ÙØ¹: Ø·Ù„Ø¨ presigned URL Ù…Ù† `/get-upload-url`ØŒ Ø±ÙØ¹ Ø§Ù„Ù…Ù„ÙØŒ Ø¥Ù†Ø´Ø§Ø¡ projectØŒ Ø«Ù… webhook Ø£Ùˆ status polling.
- ÙŠØ¯Ø¹Ù… clippingØŒ captionsØŒ reframingØŒ dubbing (80+ Ù„ØºØ©)ØŒ transcriptionØŒ ÙˆØ§Ù„Ù†Ø´Ø±/Ø§Ù„Ø¬Ø¯ÙˆÙ„Ø©.
- ØµÙŠØº Ø§Ù„Ø¥Ø¯Ø®Ø§Ù„ Ø§Ù„Ù…Ø¹Ù„Ù†Ø©: MP4 Ø£Ùˆ MOVØŒ Ù…Ù† Ø¯Ù‚ÙŠÙ‚ØªÙŠÙ† Ø¥Ù„Ù‰ 3 Ø³Ø§Ø¹Ø§ØªØŒ ÙˆØ­ØªÙ‰ 5GB.
- Ø­Ø§Ù„Ø§Øª Ø§Ù„Ù…Ø´Ø±ÙˆØ¹: `queued`, `processing`, `completed`, `failed`, `invalid`, `expired`.
- webhooks Ù…ÙØ¶Ù„Ø© Ø¹Ù„Ù‰ polling ÙÙŠ Ø§Ù„Ø¥Ù†ØªØ§Ø¬Ø› endpoint Ø¹Ø¨Ø± HTTPS ÙˆÙŠØ±Ø¯ 200 Ø®Ù„Ø§Ù„ 5 Ø«ÙˆØ§Ù†ÙØŒ ÙˆØ®Ù…Ø³ Ù…Ø­Ø§ÙˆÙ„Ø§Øª ÙØ§Ø´Ù„Ø© ØªØ¹Ø·Ù„ webhook.
- Reap Ù…ÙÙŠØ¯ Ù„Ù…Ø³Ø§Ø± ClipCraft/short-formØŒ Ù„ÙƒÙ†Ù‡ Ù„Ø§ ÙŠØºÙŠÙ‘Ø± Ù‚ÙˆØ§Ø¹Ø¯ ØªÙ†ÙÙŠØ° Multi-Cam Ø¯Ø§Ø®Ù„ Premiere.

### Ø­Ø¯ÙˆØ¯ Reap ÙˆØªÙˆØ¬ÙŠÙ‡ Ù…Ø²ÙˆØ¯ÙŠ Ø§Ù„Ù…ÙˆØ¯ÙŠÙ„Ø§Øª

- Google models ØªØªØµÙ„ Ø¨Ø§Ù„Ù…ØµØ¯Ø± Ø§Ù„Ø±Ø³Ù…ÙŠ Google Ù…Ø¨Ø§Ø´Ø±Ø©Ù‹.
- Seedance v2 ÙŠØªØµÙ„ Ø¨Ø§Ù„Ù…ØµØ¯Ø± Ø§Ù„Ø±Ø³Ù…ÙŠ BytePlus Ù…Ø¨Ø§Ø´Ø±Ø©Ù‹.
- OpenAI models ØªØªØµÙ„ Ø¨Ø§Ù„Ù…ØµØ¯Ø± Ø§Ù„Ø±Ø³Ù…ÙŠ OpenAI Ù…Ø¨Ø§Ø´Ø±Ø©Ù‹.
- Ø¨Ù‚ÙŠØ© Ù…ÙˆØ¯ÙŠÙ„Ø§Øª Ø§Ù„ÙÙŠØ¯ÙŠÙˆ ØªØ³ØªØ®Ø¯Ù… `kie.ai` ÙƒÙ…ØµØ¯Ø± Ø§ÙØªØ±Ø§Ø¶ÙŠ ØªÙ„Ù‚Ø§Ø¦ÙŠ.
- Reap Ù„ÙŠØ³ Ù…Ø²ÙˆØ¯ ØªÙˆÙ„ÙŠØ¯ ÙˆÙ„Ø§ Ø¨Ø¯ÙŠÙ„Ù‹Ø§ Ø¹Ù† Ù‡Ø°Ù‡ Ø§Ù„Ù…ØµØ§Ø¯Ø±Ø› ÙŠÙ‚ØªØµØ± Ø¹Ù„Ù‰ AI Clipping ÙˆAuto Reframe ÙˆCaptions ÙˆTranslation ÙˆDubbing ÙˆBrand Templates ÙˆWebhooks ÙˆSocial-ready outputs.
- ÙŠÙÙ…Ù†Ø¹ Ø§Ø³ØªØ®Ø¯Ø§Ù… Reap Ù„ØªÙˆÙ„ÙŠØ¯ ÙÙŠØ¯ÙŠÙˆ Ù…Ù† Ù†Øµ Ø£Ùˆ ØµÙˆØ±Ø©.

### Ø¨Ù†ÙŠØ© Ø§Ù„ØªØ®Ø²ÙŠÙ† ÙˆØ¯ÙˆØ±Ø© Reap

- Vercel Ù„Ù„Ø§Ø³ØªØ¶Ø§ÙØ© ÙˆØ§Ù„Ù†Ø´Ø±ØŒ Clerk Ù„Ù„Ù…ØµØ§Ø¯Ù‚Ø© ÙˆØ¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ†ØŒ Neon Ù‚Ø§Ø¹Ø¯Ø© PostgreSQL Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ© Ù„Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø¯ÙŠÙ†Ø§Ù…ÙŠÙƒÙŠØ©ØŒ ÙˆBackblaze B2 (ÙˆÙ‚Ø¨Ù„Ù‡Ø§ Cloudflare R2 ÙƒÙ€ legacy) Ù„ØªØ®Ø²ÙŠÙ† Ø§Ù„Ù…ÙŠØ¯ÙŠØ§ ÙÙ‚Ø·.
- Neon ÙŠØ­ÙØ¸ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ† ÙˆØ§Ù„ÙƒØ±ÙŠØ¯ÙŠØªØ§Øª ÙˆØ§Ù„Ø§Ø´ØªØ±Ø§ÙƒØ§Øª ÙˆØ§Ù„Ø³Ø¬Ù„Ø§Øª ÙˆØ¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ØªÙˆÙ„ÙŠØ¯ ÙˆCMS ÙˆØ¨ÙŠØ§Ù†Ø§Øª Ù…Ù‡Ø§Ù… Reap ÙˆØ­Ø§Ù„Ø§Øª webhooks Ùˆmetadata Ø§Ù„Ù…Ù„ÙØ§ØªØŒ Ù„ÙƒÙ†Ù‡ Ù„Ø§ ÙŠØ­ÙØ¸ Ù…Ù„ÙØ§Øª Ø§Ù„Ù…ÙŠØ¯ÙŠØ§ Ù†ÙØ³Ù‡Ø§.
- Ø§Ù„ØµÙˆØ± ÙˆØ§Ù„ÙÙŠØ¯ÙŠÙˆÙ‡Ø§Øª ÙˆØ§Ù„Ù…Ø®Ø±Ø¬Ø§Øª ÙˆØ§Ù„Ù…Ù„ÙØ§Øª Ø§Ù„Ù…ÙˆÙ„Ø¯Ø© ÙˆÙ†ØªØ§Ø¦Ø¬ Reap Ø§Ù„Ù†Ù‡Ø§Ø¦ÙŠØ© ØªØ­ÙØ¸ ÙÙŠ Backblaze B2 (ÙˆØªØ¸Ù„ Ø§Ù„Ù…Ù„ÙØ§Øª Ø§Ù„Ù‚Ø¯ÙŠÙ…Ø© Ù…Ù‚Ø±ÙˆØ¡Ø© Ù…Ù† Cloudflare R2).
- Ø§Ù„Ù…Ù„ÙØ§Øª Ø§Ù„ÙƒØ¨ÙŠØ±Ø© ØªÙØ±ÙØ¹ Ù…Ù† Ø§Ù„Ø¹Ù…ÙŠÙ„ Ù…Ø¨Ø§Ø´Ø±Ø© Ø¥Ù„Ù‰ Backblaze B2 Ø¹Ø¨Ø± Signed URLsØ› ÙŠÙÙ…Ù†Ø¹ ØªÙ…Ø±ÙŠØ±Ù‡Ø§ Ø¹Ø¨Ø± Next.js API routes.
- Ø§Ù„Ù…Ø³Ø§Ø± Ø§Ù„Ù…Ø¹ØªÙ…Ø¯: Ø±ÙØ¹ Ø§Ù„ÙÙŠØ¯ÙŠÙˆ Ø¥Ù„Ù‰ Backblaze B2 â† Ø­ÙØ¸ metadata ÙÙŠ Neon â† Ø¥Ø±Ø³Ø§Ù„ Ø±Ø§Ø¨Ø· Ø§Ù„ÙÙŠØ¯ÙŠÙˆ Ø¥Ù„Ù‰ Reap â† Ø§Ø³ØªÙ‚Ø¨Ø§Ù„ webhook ÙˆØªØ­Ø¯ÙŠØ« Ø§Ù„Ø­Ø§Ù„Ø© â† Ø¬Ù„Ø¨ Ø§Ù„Ù†ØªÙŠØ¬Ø© Ø£Ùˆ Ø­ÙØ¸ Ø±Ø§Ø¨Ø·Ù‡Ø§ â† ØªØ®Ø²ÙŠÙ† Ø§Ù„Ù†Ø§ØªØ¬ Ø§Ù„Ù†Ù‡Ø§Ø¦ÙŠ ÙÙŠ Backblaze B2 â† ØªØ­Ø¯ÙŠØ« Neon Ø¨Ø§Ù„Ù…Ù„ÙØ§Øª ÙˆØ§Ù„Ø­Ø§Ù„Ø© Ø§Ù„Ù†Ù‡Ø§Ø¦ÙŠØ©.

### Ø¢Ù„ÙŠØ© ØªØ³Ù„ÙŠÙ… Ø§Ù„Ù…ÙŠØ¯ÙŠØ§ Ø§Ù„Ø§Ø­ØªÙŠØ§Ø·ÙŠØ© Ø§Ù„Ù…Ø¶Ù…ÙˆÙ†Ø© (Media Delivery & Resilient Fallbacks)

1. **Ø§Ù„Ù‡Ø¯Ù**: ØªØ¬Ù†Ø¨ ØªÙ…Ø±ÙŠØ± ÙƒØ§ÙØ© Ø£Ø­Ù…Ø§Ù„ Ø§Ù„Ù…ÙŠØ¯ÙŠØ§ (Ø§Ù„ØµÙˆØ±ØŒ Ø§Ù„ÙÙŠØ¯ÙŠÙˆÙ‡Ø§Øª Ø§Ù„ÙƒØ¨ÙŠØ±Ø©ØŒ Ø§Ù„Ù…Ù‚Ø§Ø·Ø¹ Ø§Ù„ØµÙˆØªÙŠØ©) Ø¹Ø¨Ø± Vercel Ù„ØªÙØ§Ø¯ÙŠ Ø­Ø¯ÙˆØ¯ Ø§Ù„Ø­Ù…ÙˆÙ„Ø© ÙˆØ³Ø±Ø¹Ø© Ø§Ù„ØªÙ†Ø²ÙŠÙ„ ÙˆØ§Ù„Ù…Ù‡Ù„Ø§ØªØŒ ÙˆØ§Ù„Ø§Ø¹ØªÙ…Ø§Ø¯ Ø¹Ù„Ù‰ ØªØ³Ù„ÙŠÙ… Ù…Ø¨Ø§Ø´Ø± Ù…Ù† Backblaze B2 Ø£Ùˆ Cloudflare R2.
2. **Ø³Ù„Ø³Ù„Ø© Ø§Ù„ØªØ±Ø§Ø¬Ø¹ (Fallback Chain) ÙˆØ£ÙˆØ¶Ø§Ø¹ ØªØ³Ù„ÙŠÙ… Ù…ÙŠØ¯ÙŠØ§ Ø§Ù„Ù…ØªØµÙØ­**:
   - ÙŠØªÙ… Ø§Ù„ØªØ­ÙƒÙ… ÙÙŠ Ù…Ø³Ø§Ø± ØªØ³Ù„ÙŠÙ… Ù…ÙŠØ¯ÙŠØ§ Ø§Ù„ÙˆØ§Ø¬Ù‡Ø© Ø§Ù„Ø£Ù…Ø§Ù…ÙŠØ© Ù„Ù„Ù…ØªØµÙØ­ Ø¹Ø¨Ø± Ù…ØªØºÙŠØ± Ø§Ù„Ø¨ÙŠØ¦Ø© `BROWSER_MEDIA_URL_MODE` Ø§Ù„Ø°ÙŠ ÙŠØ¯Ø¹Ù… Ø«Ù„Ø§Ø«Ø© Ø£ÙˆØ¶Ø§Ø¹:
     - `b2` (Ø§Ù„ÙˆØ¶Ø¹ Ø§Ù„Ø§ÙØªØ±Ø§Ø¶ÙŠ Ø§Ù„Ø­Ø§Ù„ÙŠ Ù„Ù„Ø³Ø±Ø¹Ø© ÙˆØ§Ù„Ø£Ù…Ø§Ù†): Ø§Ù„Ø¨Ø« Ø§Ù„Ù…Ø¨Ø§Ø´Ø± ÙˆØ§Ù„Ø¢Ù…Ù† Ù…Ù† Ø±ÙˆØ§Ø¨Ø· Backblaze B2 Ø§Ù„Ø¹Ø§Ù…Ø© Ù…Ø¨Ø§Ø´Ø±Ø©Ù‹ (`https://saadstudio-storage.s3.eu-central-003.backblazeb2.com`).
     - `cdn`: Ø§Ù„Ø¨Ø« Ø¹Ø¨Ø± CDN Ø®Ø§Ø±Ø¬ÙŠ (Ù…Ø«Ù„ BunnyCDN) Ù„Ø²ÙŠØ§Ø¯Ø© Ø³Ø±Ø¹Ø© Ø§Ù„ØªÙˆØ¬ÙŠÙ‡ Ø§Ù„Ø¥Ù‚Ù„ÙŠÙ…ÙŠØ© Ù„Ù„Ø´Ø±Ù‚ Ø§Ù„Ø£ÙˆØ³Ø· ÙˆØ§Ù„Ø¹Ø±Ø§Ù‚ ÙˆÙŠÙ‚Ø±Ø£ Ø§Ù„Ù…ÙØªØ§Ø­ `BROWSER_CDN_BASE_URL`.
     - `proxy`: Ø§Ù„Ø¨Ø« Ø§Ù„ÙƒÙ„Ø§Ø³ÙŠÙƒÙŠ Ø¹Ø¨Ø± Ø®ÙˆØ§Ø¯Ù… Ø§Ù„Ø¨Ø±ÙˆÙƒØ³ÙŠ Ø§Ù„Ù…Ø­Ù„ÙŠØ© Ù„Ù€ Next.js `/api/media/...` (ÙŠØªÙ… ØªÙØ¹ÙŠÙ„Ù‡ ÙÙ‚Ø· ÙƒØ­Ø§Ù„Ø© Ø·Ø§Ø±Ø¦Ø© Ø£Ùˆ Ø§Ø­ØªÙŠØ§Ø·ÙŠØ©).
   - ØªØ¸Ù„ Ø±ÙˆØ§Ø¨Ø· Ù…Ø²ÙˆØ¯ÙŠ Ø§Ù„Ø®Ø¯Ù…Ø© Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ (`resolveProviderMediaUrl()`) Ù…Ø³ØªÙ‚Ù„Ø© ØªÙ…Ø§Ù…Ø§Ù‹ ÙˆØªØ¹ØªÙ…Ø¯ Ø±ÙˆØ§Ø¨Ø· B2 Ø§Ù„Ù…Ø¨Ø§Ø´Ø±Ø© ÙÙ‚Ø·.
   - **Ø§Ù„Ø®ÙŠØ§Ø± Ø§Ù„Ø§Ø­ØªÙŠØ§Ø·ÙŠ Ù„Ù„Ù…Ù„ÙØ§Øª Ø§Ù„Ù‚Ø¯ÙŠÙ…Ø©**: Ø§Ù„Ù†Ø·Ø§Ù‚ Ø§Ù„Ø®Ø§Ù… Ø§Ù„Ù…Ø¨Ø§Ø´Ø± Ù„Ù„Ù€ R2 ÙˆÙ‡Ùˆ `https://pub-3e0355a14eda4ec78c6e81b217a9a399.r2.dev` (Ù…Ø¹ Ø§Ø³ØªØ¨Ø¹Ø§Ø¯ `media.saadstudio.app` Ø­Ø§Ù„ÙŠØ§Ù‹ Ø¨Ø³Ø¨Ø¨ Ù…Ø´Ø§ÙƒÙ„ Ø§Ù„Ù€ DNS).
3. **ØªØ·Ø¨ÙŠÙ‚ Ø§Ù„Ø¢Ù„ÙŠØ© ÙÙŠ Ø§Ù„ÙˆØ§Ø¬Ù‡Ø© Ø§Ù„Ø£Ù…Ø§Ù…ÙŠØ© Ù„Ù„Ù…ÙˆÙ‚Ø¹**:
   - ÙƒØ§ÙØ© Ø§Ù„Ø¹Ù†Ø§ØµØ± (`<img>`, `<video>`, `<audio>`) ÙˆØ§Ù„Ù…ÙƒÙˆÙ†Ø§Øª Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ© (Ù…Ø«Ù„ `VideoCanvas` Ùˆ `AudioCanvas` ÙÙŠ `AssetInspector.tsx` ÙˆÙ…ÙƒÙˆÙ†Ø§Øª `MediaGrid.tsx` ÙˆØµÙØ­Ø© Ø§Ù„Ù…ÙˆØ³ÙŠÙ‚Ù‰ `music/page.tsx`) Ù…Ø²ÙˆØ¯Ø© Ø¨Ù…Ø¹Ø§Ù„Ø¬Ø© `onError` Ù„ØªØ¨Ø¯ÙŠÙ„ Ø§Ù„Ø±Ø§Ø¨Ø· ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ Ø¥Ù„Ù‰ Ø§Ù„ØªØ§Ù„ÙŠ ÙÙŠ Ø§Ù„Ù‚Ø§Ø¦Ù…Ø© Ø¥Ø°Ø§ ØªØ¹Ø°Ø± ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø­Ø§Ù„ÙŠ.
   - ÙŠØªÙˆÙØ± Ù…Ø±Ø§Ù‚Ø¨ Ø£Ø®Ø·Ø§Ø¡ Ø¹Ø§Ù… (Global Capture Error Listener) in `app/layout.tsx` Ù„Ø§Ø¹ØªØ±Ø§Ø¶ ÙØ´Ù„ ØªØ­Ù…ÙŠÙ„ Ø£ÙŠ Ø¹Ù†ØµØ± ÙˆØ³Ø§Ø¦Ø· ÙˆØªØ¨Ø¯ÙŠÙ„Ù‡ Ø­ÙŠØ§Ù‹ Ù„Ù…Ù†Ø¹ ØªØ¬Ù…ÙŠØ¯ ÙˆØ§Ø¬Ù‡Ø§Øª Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù….
4. **ØªØ·Ø¨ÙŠÙ‚ Ø§Ù„Ø¢Ù„ÙŠØ© ÙÙŠ Ø¥Ø¶Ø§ÙØ© Premiere CEP**:
   - Ø¯Ø§Ù„Ø© `downloadAsset` ÙÙŠ `src/lib/api.ts` ØªÙ‚ÙˆÙ… Ø¨Ù…Ø­Ø§ÙˆÙ„Ø© Ø§Ù„ØªØ­Ù…ÙŠÙ„ Ø¨Ø´ÙƒÙ„ Ù…ØªÙƒØ±Ø± (Retry Loop) Ø¹Ø¨Ø± Ø³Ù„Ø³Ù„Ø© Ø§Ù„ØªØ±Ø§Ø¬Ø¹ Ù…Ø¹ ØªÙ…Ø±ÙŠØ± `isDownload = true` Ù„ØªÙ…ÙƒÙŠÙ† Ø§Ù„Ø¨Ø±ÙˆÙƒØ³ÙŠ ÙƒØ®ÙŠØ§Ø± Ø£Ø®ÙŠØ± Ø¹Ù†Ø¯ Ø§Ù„Ø­Ø§Ø¬Ø©.
   - ÙŠØªÙ… Ø¥Ù„Ø­Ø§Ù‚ Ù…Ø±Ø§Ù‚Ø¨ Ø£Ø®Ø·Ø§Ø¡ Ø¹Ø§Ù… Ø¹Ù„Ù‰ Ù…Ø³ØªÙˆÙ‰ Ø§Ù„Ù†Ø§ÙØ°Ø© (Global Event Listener) ÙÙŠ `main.ts` Ù„ØªØ¨Ø¯ÙŠÙ„ Ù…ØµØ§Ø¯Ø± Ø§Ù„Ø¹Ù†Ø§ØµØ± Ø§Ù„Ù…ÙˆÙ„Ø¯Ø© Ø¨ØµØ±ÙŠØ§Ù‹ ÙÙŠ Ø§Ù„Ø¥Ø¶Ø§ÙØ© Ø¹Ù†Ø¯ Ø§Ù„ÙØ´Ù„.
5. **Ø¶ÙˆØ§Ø¨Ø· Ø­Ù…Ø§ÙŠØ© API Ø§Ù„Ø¨Ø±ÙˆÙƒØ³ÙŠ**:
   - ÙŠØ±ÙØ¶ Ù…Ø³Ø§Ø± `/api/proxy-image` ØªÙ…Ø§Ù…Ø§Ù‹ Ø¨Ø±ÙˆÙƒØ³ÙŠ Ù…Ù„ÙØ§Øª Ø§Ù„ÙÙŠØ¯ÙŠÙˆ (400 Bad Request) ÙˆÙŠÙØ­Øµ Ø°Ù„Ùƒ Ø¨Ø§Ù…ØªØ¯Ø§Ø¯ Ø§Ù„Ø±Ø§Ø¨Ø· ÙˆÙ†ÙˆØ¹ Ø§Ù„Ù…ÙŠØ¯ÙŠØ§ØŒ ÙˆÙŠÙ‚ØµØ± Ø¹Ù…Ù„Ù‡ Ø­ØµØ±ÙŠØ§Ù‹ Ø¹Ù„Ù‰ Ø§Ù„ØµÙˆØ± Ù„ØªØ£Ù…ÙŠÙ† Ù…ÙˆØ§Ø±Ø¯ Ø§Ù„Ø³ÙŠØ±ÙØ±.
6. **Ø¶ÙˆØ§Ø¨Ø· ØªØ²ÙˆÙŠØ¯ Ø§Ù„Ù…ÙŠØ¯ÙŠØ§ Ù„Ù…Ø²ÙˆØ¯ÙŠ Ø§Ù„ØªÙˆÙ„ÙŠØ¯ Ø§Ù„Ø®Ø§Ø±Ø¬ÙŠÙŠÙ†**:
   - ÙŠÙ„ØªØ²Ù… Ù…Ø³Ø§Ø± API Ø§Ù„ÙÙŠØ¯ÙŠÙˆ (`/api/video`) Ø¨ØªØ­ÙˆÙŠÙ„ ÙƒØ§ÙØ© Ø§Ù„Ù…Ø¯Ø®Ù„Ø§Øª ÙˆØ§Ù„ÙˆØ³Ø§Ø¦Ø· Ø§Ù„Ù…Ø±Ø¬Ø¹ÙŠØ© Ù„Ø±ÙˆØ§Ø¨Ø· Ù…Ø·Ù„Ù‚Ø© ÙˆÙ…Ø¨Ø§Ø´Ø±Ø© ÙˆØ¹Ø§Ù…Ø© Ù„Ù„Ù€ Bucket ÙÙŠ Backblaze B2 Ø¨Ø´ÙƒÙ„ ÙƒØ§Ù…Ù„.
   - ÙŠØ±ÙØ¶ Ø§Ù„Ø³ÙŠØ±ÙØ± ØªÙ…Ø±ÙŠØ± Ø§Ù„Ø¨Ø±ÙˆÙƒØ³ÙŠ Ø§Ù„Ø¯Ø§Ø®Ù„ÙŠ (`/api/media`) Ø£Ùˆ Ø±ÙˆØ§Ø¨Ø· localhost Ø£Ùˆ base64 Ø£Ùˆ blob Ù„Ù…Ø²ÙˆØ¯ÙŠ Ø§Ù„Ø®Ø¯Ù…Ø© Ø§Ù„Ø®Ø§Ø±Ø¬ÙŠÙŠÙ† (BytePlus, Google, KIE, WaveSpeed).
   - ÙŠØªÙ… Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø¥Ù…ÙƒØ§Ù†ÙŠØ© ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…Ù„Ù Ø¨Ø§Ù„Ù€ Server-side HEAD/GET request Ù‚Ø¨Ù„ Ø®ØµÙ… Ø§Ù„ÙƒØ±ÙŠØ¯ÙŠØª Ø£Ùˆ Ø§Ø³ØªØ¯Ø¹Ø§Ø¡ Ø§Ù„Ù…Ø²ÙˆØ¯ Ø§Ù„Ø®Ø§Ø±Ø¬ÙŠ Ù„ØªÙØ§Ø¯ÙŠ Ø§Ù„ÙØ´Ù„ ÙˆØ®ØµÙ… Ø§Ù„ÙƒØ±ÙŠØ¯ÙŠØª Ø¨Ø¯ÙˆÙ† ÙØ§Ø¦Ø¯Ø©.

## Ù…Ø±Ø¬Ø¹ Ù…Ø¹Ù…Ø§Ø±ÙŠ Ù…Ù† AutoCut V4.60.2

- ØªÙ…Øª Ù…Ø±Ø§Ø¬Ø¹Ø© Ø§Ù„Ø­Ø²Ù…Ø© Ø§Ù„Ù…Ø­Ù„ÙŠØ© `C:\Users\PC\AppData\Local\AutoCut\current\resources\app.asar` Ù‚Ø±Ø§Ø¡Ø©Ù‹ ÙÙ‚Ø·. Ø§Ù„Ù†ØªØ§Ø¦Ø¬ Ø§Ù„Ù…Ø«Ø¨ØªØ© Ù…Ù† Ø§Ù„Ø­Ø²Ù…Ø© Ù†ÙØ³Ù‡Ø§:
- Ù‡ÙˆÙŠØ© Ø§Ù„Ù†Ø³Ø®Ø© Ø§Ù„Ù…ØªØ­Ù‚Ù‚ Ù…Ù†Ù‡Ø§ Ø¨ØªØ§Ø±ÙŠØ® 2026-06-18: Ø§Ù„Ø­Ø¬Ù… `97,862,233` Ø¨Ø§ÙŠØªØŒ Ø¢Ø®Ø± ØªØ¹Ø¯ÙŠÙ„ `2026-06-02 21:38:23`ØŒ ÙˆSHA-256: `EAC5FE19B7FCFD769B6983AE0F1DA3ADFEA5A9A7124247A47302E4FFAADD94B0`. Ø¥Ø°Ø§ ØªØºÙŠÙ‘Ø±Øª Ø§Ù„Ø¨ØµÙ…Ø©ØŒ ØªÙØ¹Ø§Ø¯ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø© Ù‚Ø¨Ù„ Ø§Ø¹ØªÙ…Ø§Ø¯ Ø§Ù„Ø§Ø³ØªÙ†ØªØ§Ø¬Ø§Øª Ø¹Ù„Ù‰ Ø§Ù„Ù†Ø³Ø®Ø© Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø©.
- Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ ØºÙ„Ø§Ù Electron 35ØŒ ÙˆØ§Ù„Ø­Ø²Ù…Ø© ØªØ­ØªÙˆÙŠ 8,571 Ù…Ù„ÙÙ‹Ø§ØŒ Ø£ØºÙ„Ø¨Ù‡Ø§ dependencies. ÙƒÙˆØ¯ Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ Ø§Ù„Ù…Ø­Ù„ÙŠ Ø§Ù„ÙØ¹Ù„ÙŠ Ù…ØªÙ…Ø±ÙƒØ² ÙÙŠ `packages/main/dist/index.js` Ùˆ`packages/preload/dist/index.mjs`.
- Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ Ù„Ø§ ÙŠØ¶Ù… Ø®ÙˆØ§Ø±Ø²Ù…ÙŠØ§Øª Ø§Ù„Ù…ÙˆÙ†ØªØ§Ø¬ ÙƒØ§Ù…Ù„Ø© Ø¯Ø§Ø®Ù„ `app.asar`. Ø¹Ù†Ø¯ Ø§Ù„ØªØ´ØºÙŠÙ„ ÙŠØ¬Ù„Ø¨ Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª ÙˆØ±ÙˆØ§Ø¨Ø· Ø¥ØµØ¯Ø§Ø±Ø§ØªØŒ Ø«Ù… ÙŠÙ†Ø²Ù‘Ù„ `main.cjs` Ù„Ø®Ø§Ø¯Ù… host ÙˆÙŠÙ†Ø²Ù‘Ù„ compute scripts Ø­Ø³Ø¨ Ø§Ù„Ù…Ù‡Ù…Ø©. Ù„Ø°Ù„Ùƒ Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø§Ø³ØªÙ†ØªØ§Ø¬ Ø®ÙˆØ§Ø±Ø²Ù…ÙŠØ© Silence/Multi-Cam ÙƒØ§Ù…Ù„Ø© Ù…Ù† Ù‡Ø°Ù‡ Ø§Ù„Ø­Ø²Ù…Ø© ÙˆØ­Ø¯Ù‡Ø§.
- Ø§Ù„Ù…Ø¹Ù…Ø§Ø±ÙŠØ© Ù…ÙØµÙˆÙ„Ø© Ø¥Ù„Ù‰ Ø£Ø±Ø¨Ø¹ Ø·Ø¨Ù‚Ø§Øª:
  1. ÙˆØ§Ø¬Ù‡Ø© ÙˆÙŠØ¨/remote frontend Ø¯Ø§Ø®Ù„ Electron.
  2. Electron main process Ù„Ù„ØªØ­Ø¯ÙŠØ«Ø§Øª ÙˆØ§Ù„ØªÙ†Ø²ÙŠÙ„Ø§Øª ÙˆØ§Ù„Ù†ÙˆØ§ÙØ°.
  3. `com.autocut.hostServer` Ù„Ù„ØªØ®Ø§Ø·Ø¨ Ù…Ø¹ ØªØ·Ø¨ÙŠÙ‚ Ø§Ù„Ù…Ø¶ÙŠÙ/Ø§Ù„Ø¥Ø¶Ø§ÙØ©.
  4. `com.autocut.compute` Ù„Ù„Ù…Ù‡Ø§Ù… Ø§Ù„Ø«Ù‚ÙŠÙ„Ø© Ù…Ø¹ API Ù…Ø«Ù„ `startTask`, `killTasks`, `getProgress`.
- Ø§Ù„Ø§ØªØµØ§Ù„ Ø¨ÙŠÙ† Ø§Ù„Ø·Ø¨Ù‚Ø§Øª ÙŠØªÙ… Ø¹Ø¨Ø± Node IPC Ø¯Ø§Ø®Ù„ Ù…Ø¬Ù„Ø¯ Ù…Ø¤Ù‚Øª `com.autocut/com.autocut.aea`.
- AutoCut ÙŠÙ†Ø²Ù‘Ù„ Ù†Ø³Ø®Ù‹Ø§ Ø®Ø§ØµØ© Ø¨Ù‡ Ù…Ù† `ffmpeg` Ùˆ`ffprobe` Ø­Ø³Ø¨ Ù†Ø¸Ø§Ù… Ø§Ù„ØªØ´ØºÙŠÙ„ ÙˆØ§Ù„Ù…Ø¹Ù…Ø§Ø±ÙŠØ©ØŒ ÙŠØªØ­Ù‚Ù‚ Ù…Ù† ÙˆØ¬ÙˆØ¯Ù‡Ù…Ø§/Ø­Ø¯Ø§Ø«ØªÙ‡Ù…Ø§ØŒ ÙˆÙŠØ®Ø²Ù†Ù‡Ù…Ø§ ØªØ­Øª userData. Ù‡Ø°Ø§ ÙŠØ¤ÙƒØ¯ Ù†Ù…Ø·: **Premiere host adapter Ù…Ù†ÙØµÙ„ Ø¹Ù† compute/FFmpeg**.
- Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„ØªØ´ØºÙŠÙ„ ØªØªØ¶Ù…Ù† Ø±ÙˆØ§Ø¨Ø· Ù…Ø³ØªÙ‚Ù„Ø© Ù„Ù„ÙˆØ§Ø¬Ù‡Ø©ØŒ onboardingØŒ computeØŒ host serverØŒ ØªÙ†Ø²ÙŠÙ„ Premiere (`PPRO_DOWNLOAD_URL`) ÙˆØªÙ†Ø²ÙŠÙ„ DaVinciØ› Ø£ÙŠ Ø£Ù† ØªØ·Ø¨ÙŠÙ‚ Ø³Ø·Ø­ Ø§Ù„Ù…ÙƒØªØ¨ Ù…ÙˆØ²Ù‘Ø¹ orchestrator Ù„Ø¹Ø¯Ø© Ù…Ø¶ÙŠÙÙŠÙ†.
- preload ÙŠØ¹Ø±Ù‘Ø¶ bridge Ø¨Ø§Ø³Ù…ÙŽÙŠ `__autocut_preload__` Ùˆ`__electron_preload__`ØŒ ÙˆÙŠØªØ¶Ù…Ù† filesystemØŒ child processesØŒ downloadsØŒ FFmpeg setupØŒ IPC Ùˆcookies. Ù‡Ø°Ø§ ØªØµÙ…ÙŠÙ… Ù‚ÙˆÙŠ Ù„ÙƒÙ†Ù‡ ÙˆØ§Ø³Ø¹ Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ§ØªØ› ÙÙŠ Saad Studio ÙŠØ¬Ø¨ Ø¥Ø¨Ù‚Ø§Ø¡ Ø§Ù„Ø¬Ø³Ø± Ø£ØµØºØ± ÙˆØªÙ‚ÙŠÙŠØ¯ Ø§Ù„Ø¹Ù…Ù„ÙŠØ§Øª ÙˆØ§Ù„Ù…Ø¯Ø®Ù„Ø§Øª Ù‚Ø¯Ø± Ø§Ù„Ø¥Ù…ÙƒØ§Ù†.
- Ø§Ù„Ø®Ù„Ø§ØµØ© Ø§Ù„Ù‚Ø§Ø¨Ù„Ø© Ù„Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù…: Ù†Ø¹ØªÙ…Ø¯ Ø§Ù„ÙØµÙ„ Ù†ÙØ³Ù‡ Ù…ÙØ§Ù‡ÙŠÙ…ÙŠÙ‹Ø§ ÙÙŠ Saad Studio â€” UIØŒ Premiere adapterØŒ task/compute serviceØŒ FFmpeg â€” Ù„ÙƒÙ† Ù„Ø§ Ù†Ù†Ø³Ø® ÙƒÙˆØ¯ AutoCut Ø£Ùˆ endpoints Ø§Ù„Ø®Ø§ØµØ© Ø¨Ù‡.

## Ù‚ÙˆØ§Ø¹Ø¯ Ù„Ø§ ØªÙÙƒØ³Ø±

- Ù„Ø§ Ù†Ø®Ù…Ù† Premiere APIs Ø£Ùˆ media paths Ø£Ùˆ audio streams.
- Ù„Ø§ Ù†Ù‚Ø±Ø£ audio gain ÙˆÙ†Ø¹ØªØ¨Ø±Ù‡ RMS.
- Ù„Ø§ Ù†Ø®ÙÙŠ blockers ÙˆÙ„Ø§ Ù†Ø²ÙŠÙ‘Ù Runtime Proof.
- Ù„Ø§ Ù†Ø³ØªØ®Ø¯Ù… Reap Ø£Ùˆ AI diarization Ù„ØªØ­Ù„ÙŠÙ„ Multi-Cam v1.
- Ù„Ø§ Ù†Ù†ÙØ° Ù‚Ø±Ø§Ø±Ø§Øª ØºÙŠØ± Ù…Ø­Ø§Ø°Ø§Ø© Ù„Ù„Ø¥Ø·Ø§Ø±.
- Ù„Ø§ Ù†ØºÙŠÙ‘Ø± Ø§Ù„Ø£ØµÙ„ Ø¹Ù†Ø¯Ù…Ø§ ÙŠÙƒÙˆÙ† Ø³ÙŠØ± Ø§Ù„Ø¹Ù…Ù„ Ø§Ù„Ù…ØªÙÙ‚ Ø¹Ù„ÙŠÙ‡ safe duplicateØ› Ø£ÙŠ Ø§Ø³ØªØ«Ù†Ø§Ø¡ Ù„Ø§Ø­Ù‚ ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ù‚Ø±Ø§Ø±Ù‹Ø§ ØµØ±ÙŠØ­Ù‹Ø§ ÙˆÙ…Ø®ØªØ¨Ø±Ù‹Ø§.
- Ù„Ø§ Ù†ØºÙŠÙ‘Ø± Ø±Ø¨Ø· Google Ø£Ùˆ BytePlus Ø£Ùˆ OpenAI Ø£Ùˆ `kie.ai` Ø¹Ù†Ø¯ Ø¥Ø¶Ø§ÙØ© Reap.
- Ù„Ø§ Ù†Ù…Ø±Ø± Ø§Ù„ÙÙŠØ¯ÙŠÙˆÙ‡Ø§Øª Ø§Ù„ÙƒØ¨ÙŠØ±Ø© Ø¹Ø¨Ø± Next.js API routesØŒ ÙˆÙ„Ø§ Ù†Ø®Ø²Ù† Ù…Ù„ÙØ§Øª Ø§Ù„Ù…ÙŠØ¯ÙŠØ§ Ø¯Ø§Ø®Ù„ Neon.

## Ø§Ù„Ù…ØµØ§Ø¯Ø±

- Reap Getting Started: https://docs.reap.video/help-center/getting-started
- Reap API Introduction: https://docs.reap.video/api-reference/1_introduction
- Reap documentation index: https://docs.reap.video/llms.txt
- Premiere Sequence reference: https://raw.githubusercontent.com/docsforadobe/premiere-scripting-guide/master/docs/sequence/sequence.md
- Premiere Pro Scripting Guide: https://ppro-scripting.docsforadobe.dev/ (Ø§Ù„Ù…Ø³Ø§Ø± Ø§Ù„Ù…Ø­Ù„ÙŠ: [premiere-pro-scripting-guide.md](file:///e:/Ù…ÙˆÙ‚Ø¹ Ø«Ø§Ù†ÙŠ/next14 ai saas/next14-ai-saas-main/next14-ai-saas-main/docs/premiere-pro-scripting-guide.md))
- Ø§Ù„Ù…Ø±Ø¬Ø¹ Ø§Ù„Ù…Ø­Ù„ÙŠ Ø§Ù„ÙƒØ§Ù…Ù„ v3.1: `C:\Users\PC\Downloads\Ø§Ù„Ù…Ø±Ø¬Ø¹.md`

## Ø­Ø§Ø±Ø³ ØªØ­Ù„ÙŠÙ„ Multi-Cam Draft (2026-06-19)

- Ø£ÙŠ active sequence ÙŠØ­ØªÙˆÙŠ Ø§Ø³Ù…Ù‡ `Saad Auto Switch Draft` Ù„Ø§ ÙŠØ¬ÙˆØ² Ø¥Ø±Ø³Ø§Ù„Ù‡ Ø¥Ù„Ù‰ FFmpeg/RMS ÙˆÙ„Ø§ Ø¥Ø¹Ø§Ø¯Ø© Preview Ø£Ùˆ Apply Ø¹Ù„ÙŠÙ‡.
- `Analyze Timeline` Ù…Ø³Ù…ÙˆØ­ Ù„Ù‡ Ø¨Ù‚Ø±Ø§Ø¡Ø© layout Ø§Ù„Ø®ÙÙŠÙ ÙÙ‚Ø· Ù„Ø§ÙƒØªØ´Ø§Ù Ø§Ù„Ø§Ø³Ù…ØŒ Ø«Ù… ÙŠØ¹ÙŠØ¯ blocker `ACTIVE_SEQUENCE_IS_AUTO_SWITCH_DRAFT_SELECT_SOURCE_SEQUENCE`.
- ÙˆØ§Ø¬Ù‡Ø© Ø§Ù„Ø¥Ù†ØªØ§Ø¬ ØªØ¹Ø·Ù„ Analyze/Preview/Apply Ø¨Ø¹Ø¯ Ø§ÙƒØªØ´Ø§Ù Ø§Ù„Ù€Draft ÙˆØªØ·Ù„Ø¨ Ø§Ø®ØªÙŠØ§Ø± source sequence Ù…Ø«Ù„ `Synced Sequence`. Ù‡Ø°Ø§ ÙŠÙ…Ù†Ø¹ Ø§Ù„ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ø·ÙˆÙŠÙ„ ÙˆØ§Ù„Ù†Ø³Ø® Ø§Ù„Ù…ØªØ³Ù„Ø³Ù„Ø©ØŒ Ù…Ù† Ø¯ÙˆÙ† Ø­Ø°Ù Ø£ÙŠ sequence Ù‚Ø¯ÙŠÙ… ØªÙ„Ù‚Ø§Ø¦ÙŠÙ‹Ø§.

## Ù…Ø²Ø§Ù…Ù†Ø© Active Sequence Ù…Ø¹ ÙˆØ§Ø¬Ù‡Ø© Podcast (2026-06-19)

- ØªØ¨Ù‚ÙŠ ØµÙØ­Ø© Podcast Ù…Ø±Ø§Ù‚Ø¨Ù‹Ø§ Ø®ÙÙŠÙÙ‹Ø§ ÙƒÙ„ 1000ms Ù„Ù‡ÙˆÙŠØ© Ø§Ù„Ù€Active Sequence Ø¹Ø¨Ø± diagnosticsØŒ Ù…Ù† Ø¯ÙˆÙ† ØªØ­Ù„ÙŠÙ„ ÙˆØ³Ø§Ø¦Ø· Ø£Ùˆ FFmpeg.
- Ø¹Ù†Ø¯ ØªØºÙŠØ± `sequenceId` Ø£Ùˆ Ø§Ù„Ø§Ø³Ù… ØªÙÙ„ØºÙ‰ ÙƒÙ„ Ø§Ù„Ù†ØªØ§Ø¦Ø¬ Ø§Ù„Ù…Ø®Ø²Ù†Ø© Ø§Ù„Ø®Ø§ØµØ© Ø¨Ø§Ù„Ù€Sequence Ø§Ù„Ø³Ø§Ø¨Ù‚ Ù‚Ø¨Ù„ Ø§Ù„Ø³Ù…Ø§Ø­ Ø¨Ù€Analyze/Preview/Apply Ø¹Ù„Ù‰ Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø› ÙˆÙŠØ´Ù…Ù„ Ø°Ù„Ùƒ Sync ÙˆMulti-Cam ÙˆØ¥Ø«Ø¨Ø§ØªØ§Øª Ø§Ù„ØµÙˆØª.
- ÙŠØªÙˆÙ‚Ù Ø§Ù„Ù…Ø±Ø§Ù‚Ø¨ ØªÙ„Ù‚Ø§Ø¦ÙŠÙ‹Ø§ Ø¹Ù†Ø¯ Ø¥Ø²Ø§Ù„Ø© Ø§Ù„ØµÙØ­Ø© Ù…Ù† DOMØŒ ÙˆÙ„Ø§ ÙŠØ³ØªØ¹Ù„Ù… Ø£Ø«Ù†Ø§Ø¡ ØªÙ†ÙÙŠØ° Ø£Ø¯Ø§Ø© Ø¥Ù†ØªØ§Ø¬ÙŠØ© Ù„ØªØ¬Ù†Ø¨ ØªØ¯Ø§Ø®Ù„ Ø·Ù„Ø¨Ø§Øª Host.

## ØªÙˆØ²ÙŠØ¹ Ø£Ø±Ø¨Ø¹ ÙƒØ§Ù…ÙŠØ±Ø§Øª ÙÙŠ Multi-Cam (2026-06-19)

- Ø¹Ù†Ø¯ ÙˆØ¬ÙˆØ¯ V1 Ø¹Ø§Ù…Ø© ÙˆV2 Ù…Ù‚Ø¯Ù… ÙˆV3 Ø¶ÙŠÙ ÙˆV4 Ø¶ÙŠÙ Ø«Ø§Ù†Ù: Ù„Ø§ ÙŠÙØ¹Ø§Ù…Ù„ ØµÙˆØª Ø§Ù„ÙƒØ§Ù…ÙŠØ±Ø§ Ø§Ù„Ø¹Ø§Ù…Ø© ÙƒÙ…ØªØ­Ø¯Ø«Ø› ÙŠÙØªØ±Ùƒ IgnoreØŒ ÙˆØªÙØ±Ø¨Ø· Ù…ÙŠÙƒØ±ÙˆÙÙˆÙ†Ø§Øª Ø§Ù„Ø£Ø´Ø®Ø§Øµ Ø¨Ù€V2/V3/V4ØŒ ÙˆØªÙØ±Ø¨Ø· `Wide` Ø¨Ù€V1. Ø§Ù„ÙƒØ§Ù…ÙŠØ±Ø§ Ø§Ù„Ø¹Ø§Ù…Ø© ØªÙØ³ØªØ®Ø¯Ù… Ø¹Ù†Ø¯ ØªØ¯Ø§Ø®Ù„ Ø§Ù„ÙƒÙ„Ø§Ù… ÙˆÙÙ‚ Ø§Ù„Ø®Ø·Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ©Ø› Ø¥Ø°Ø§ Ø¨Ù‚ÙŠØª Unmapped ÙÙ„Ù† ØªØ¸Ù‡Ø±.

## Ø¥Ø¹Ø§Ø¯Ø© ØªÙ‡ÙŠØ¦Ø© Camera Mapping (2026-06-19)

- Camera Mapping Ø­Ø§Ù„Ø© Ù…Ø±ØªØ¨Ø·Ø© Ø¨Ø§Ù„Ù€Sequence ÙˆÙ„Ø§ ÙŠØ¬ÙˆØ² Ù†Ù‚Ù„Ù‡Ø§ ØªÙ„Ù‚Ø§Ø¦ÙŠÙ‹Ø§ Ø¥Ù„Ù‰ Sequence Ø¢Ø®Ø±. Ø¹Ù†Ø¯ ØªØºÙŠØ± Ø§Ù„Ù‡ÙˆÙŠØ© ØªÙÙ…Ø³Ø­ Ø§Ù„Ø®Ø±Ø§Ø¦Ø· ÙˆØ­Ø§Ù„Ø© Ø§Ù„ØªØ¯Ø®Ù„ Ø§Ù„ÙŠØ¯ÙˆÙŠ.
- Ø¨Ø¹Ø¯ Analyze ÙÙ‚Ø·ØŒ ÙˆØ¥Ø°Ø§ Ù„Ù… ÙŠÙ„Ù…Ø³ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø§Ù„Ø®Ø±Ø§Ø¦Ø·ØŒ ÙŠÙØ¹ÙŠÙ‘Ù† Ø§Ù„Ù…Ø³Ø§Ø± Ø§Ù„Ù…Ø³Ù…Ù‰ Wide ÙƒÙ€`wide` ÙˆÙ„Ø§ ÙŠÙØ¹Ø§Ù…Ù„ Ù…Ø³Ø§Ø± Ø§Ù„ØµÙˆØª Ø°ÙŠ Ø§Ù„ÙÙ‡Ø±Ø³ Ù†ÙØ³Ù‡ ÙƒÙ…ØªØ­Ø¯Ø«. Ø¨Ù‚ÙŠØ© Ø§Ù„Ø£ØµÙˆØ§Øª ØªÙØ±Ø¨Ø· Ø¨Ù…Ø³Ø§Ø± ÙÙŠØ¯ÙŠÙˆ Ù…Ù†Ø§Ø¸Ø± ÙÙ‚Ø· Ø¥Ù† ÙƒØ§Ù† ÙØ¹Ù„ÙŠÙ‹Ø§ ÙˆÙŠØ­Ù…Ù„ clipsØ› Ø§Ù„Ù…Ø³Ø§Ø±Ø§Øª Ø§Ù„Ø²Ø§Ø¦Ø¯Ø© ØªØ¨Ù‚Ù‰ Ignore.

## ØªØµØ­ÙŠØ­ Ø¯ÙˆØ±Ø© Ø­ÙŠØ§Ø© Camera Mapping (2026-06-19)

- Ù„Ø§ ØªÙÙ…Ø³Ø­ Ø§Ø®ØªÙŠØ§Ø±Ø§Øª Camera Mapping Ø¹Ù†Ø¯ Ø§Ù†ØªÙ‚Ø§Ù„ Premiere ØªÙ„Ù‚Ø§Ø¦ÙŠÙ‹Ø§ Ù…Ù† source sequence Ø¥Ù„Ù‰ Ø§Ù„Ù€Draft Ø§Ù„Ù†Ø§ØªØ¬Ø› Ù…Ø³Ø­Ù‡Ø§ ÙŠØ¬Ø¹Ù„ ÙƒÙ„ Ø§Ù„Ø­Ù‚ÙˆÙ„ Ignore ÙÙˆØ±Ù‹Ø§ ÙˆÙŠÙ…Ù†Ø¹ Ù…Ø±Ø§Ø¬Ø¹Ø© Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª.
- ØªÙØ¨Ø·Ù„ ÙÙ‚Ø· Ù†ØªØ§Ø¦Ø¬ Ø§Ù„ØªØ­Ù„ÙŠÙ„ ÙˆØ§Ù„ØªÙ†ÙÙŠØ° Ø§Ù„Ù…Ø±ØªØ¨Ø·Ø© Ø¨Ù‡ÙˆÙŠØ© Ø§Ù„Ù€Sequence. Ø®Ø±Ø§Ø¦Ø· Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… ØªØ¨Ù‚Ù‰ Ù…Ø­ÙÙˆØ¸Ø© Ø¯Ø§Ø®Ù„ Ø¬Ù„Ø³Ø© Ø§Ù„ØµÙØ­Ø©ØŒ ÙˆÙ„Ø§ ØªÙÙ†Ø´Ø£ Ø®Ø±Ø§Ø¦Ø· Ø§ÙØªØ±Ø§Ø¶ÙŠØ© Ø¨Ø§ÙØªØ±Ø§Ø¶ ØªØ·Ø§Ø¨Ù‚ Ø£Ø±Ù‚Ø§Ù… Ø§Ù„ØµÙˆØª ÙˆØ§Ù„ÙÙŠØ¯ÙŠÙˆ.

## Ù…Ø±Ø¬Ø¹ AutoSplice Ø§Ù„Ù…ÙØªÙˆØ­ Ø§Ù„Ù…ØµØ¯Ø± (2026-06-19)

- Ø§Ù„Ù…ØµØ¯Ø± Ø§Ù„Ù…Ø­Ù„ÙŠ: `E:\Multi-Cam Auto Switch\autosplice-main\autosplice-main`ØŒ ØªØ±Ø®ÙŠØµ MITØŒ ÙˆÙ…Ø¹Ù…Ø§Ø±ÙŠØ© CEP + FFmpeg/RMS + QE DOM. Ø§Ù„ØªÙˆØ§ÙÙ‚ Ø§Ù„Ù…Ø¹Ù„Ù† Premiere 22â€“25ØŒ Ù„Ø°Ù„Ùƒ Ù„Ø§ ÙŠÙÙØªØ±Ø¶ ØªÙˆØ§ÙÙ‚Ù‡ Ù…Ø¹ 26.2.0 Ø¨Ù„Ø§ Runtime Proof.
- Ù…Ù†Ø·Ù‚ Ø§Ù„Ù…ØªØ­Ø¯Ø« Ø§Ù„Ù…ÙÙŠØ¯: Ø­Ø³Ø§Ø¨ RMS Ù„ÙƒÙ„ Ø¥Ø·Ø§Ø±ØŒ Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„Ø£Ø¹Ù„Ù‰ ÙÙ‚Ø· Ø¹Ù†Ø¯Ù…Ø§ ÙŠØªØ¬Ø§ÙˆØ² ÙØ±Ù‚ Ø§Ù„Ø·Ø§Ù‚Ø© Ø­Ø³Ø§Ø³ÙŠØ© crosstalkØŒ Ø¥Ø¨Ù‚Ø§Ø¡ Ù‚Ø±Ø§Ø± Ø§Ù„Ù…ØªØ­Ø¯Ø« Ø®Ù„Ø§Ù„ Ø§Ù„ØºÙ…ÙˆØ¶ Ø§Ù„Ù‚ØµÙŠØ± (hysteresis)ØŒ Ø«Ù… Ø¯Ù…Ø¬ Ø§Ù„Ù‚Ø±Ø§Ø±Ø§Øª Ø§Ù„Ø£Ù‚ØµØ± Ù…Ù† Minimum Shot Length.
- Ø§Ù„ÙƒØ§Ù…ÙŠØ±Ø§ Ø§Ù„Ø¹Ø§Ù…Ø© ÙÙŠ Ø§Ù„Ù…Ø±Ø¬Ø¹ Ù‚Ø±Ø§Ø± Ù…Ø³ØªÙ‚Ù„ Ø¹Ù† speaker mapping: ØªÙØ¯Ø±Ø¬ Ø¯ÙˆØ±ÙŠÙ‹Ø§ ÙˆÙÙ‚ frequency Ù…Ø­Ø¯Ø¯ØŒ Ù„Ø§ Ø¨ÙˆØµÙ ØµÙˆØªÙ‡Ø§ Ù…ØªØ­Ø¯Ø«Ù‹Ø§. ÙŠÙ…ÙƒÙ† ØªÙƒÙŠÙŠÙ Ù‡Ø°Ø§ Ø§Ù„Ù…Ù†Ø·Ù‚ Ù…Ø¹ Wide=V1 ÙÙŠ Saad Studio.
- ØªØ·Ø¨ÙŠÙ‚ Ø§Ù„Ù…ÙˆÙ†ØªØ§Ø¬ Ø§Ù„Ù…Ø±Ø¬Ø¹ÙŠ ÙŠØ³ØªØ®Ø¯Ù… QE razor Ù„ÙƒÙ„ Ø§Ù„Ø­Ø¯ÙˆØ¯ Ø«Ù… lift Ù„Ù„ÙÙŠØ¯ÙŠÙˆ ØºÙŠØ± Ø§Ù„Ù†Ø´Ø· Ù…Ø¹ Ø¥Ø¨Ù‚Ø§Ø¡ Ø§Ù„ØµÙˆØªØ› Ù„Ø§ ÙŠÙØ¹ØªÙ…Ø¯ Ù…Ø¨Ø§Ø´Ø±Ø© Ù„Ø£Ù†Ù‡ ÙŠØ¹Ø¯Ù„ Ø§Ù„Ù€active sequence. Ù‚Ø§Ø¹Ø¯Ø© Saad Studio ØªØ¨Ù‚Ù‰: duplicate Ø¢Ù…Ù†ØŒ Ø«Ù… ØªØ­Ù‚Ù‚ Ù‚Ø¨Ù„/Ø¨Ø¹Ø¯.

## Ø¶Ù…Ø§Ù† Minimum Shot Length (2026-06-19)

- Ù‚ÙŠÙ…Ø© Minimum Shot Length Ø¬Ø²Ø¡ Ù…Ù† Ù‡ÙˆÙŠØ© Ø®Ø·Ø© PreviewØ› ØªØºÙŠÙŠØ±Ù‡Ø§ ÙŠØ¨Ø·Ù„ Ø§Ù„Ø®Ø·Ø© Ø§Ù„Ø³Ø§Ø¨Ù‚Ø© ÙˆÙŠÙØ±Ø¶ Ø¥Ø¹Ø§Ø¯Ø© Preview Ù‚Ø¨Ù„ Apply.
- Ø¨Ø¹Ø¯ ØªÙƒÙˆÙŠÙ† Ø§Ù„ÙØªØ±Ø§Øª ÙˆÙ…Ù„Ø¡ Ø§Ù„ÙØ¬ÙˆØ§ØªØŒ ØªÙØ²Ø§Ù„ Ø§Ù„Ù‚Ø±Ø§Ø±Ø§Øª Ø§Ù„Ø£Ù‚ØµØ± Ù…Ù† Ø§Ù„Ø­Ø¯ ØªÙƒØ±Ø§Ø±ÙŠÙ‹Ø§: Ø¨ÙŠÙ† ÙƒØ§Ù…ÙŠØ±ØªÙŠÙ† Ù…ØªØ·Ø§Ø¨Ù‚ØªÙŠÙ† ØªÙØ¯Ù…Ø¬ Ø§Ù„Ø«Ù„Ø§Ø«Ø©ØŒ ÙˆØ¥Ù„Ø§ ØªÙØ¶Ù… Ø§Ù„ÙØªØ±Ø© Ø§Ù„Ù‚ØµÙŠØ±Ø© Ø¥Ù„Ù‰ Ø§Ù„Ø¬Ø§Ø± Ø§Ù„Ø£Ù†Ø³Ø¨. Ø¨Ø¹Ø¯Ù‡Ø§ ÙŠØ¬Ø¨ Ø£Ù„Ø§ ÙŠØ¨Ù‚Ù‰ Ù‚Ø±Ø§Ø± Ù‚ØµÙŠØ± Ø¥Ù„Ø§ Ø¥Ø°Ø§ ÙƒØ§Ù†Øª Ø§Ù„Ø®Ø·Ø© ÙƒÙ„Ù‡Ø§ Ù‚Ø±Ø§Ø±Ù‹Ø§ ÙˆØ­ÙŠØ¯Ù‹Ø§ Ø£Ù‚ØµØ± Ù…Ù† Ø§Ù„Ø­Ø¯.
- ØªÙˆØ¬Ø¯ Ø¨ÙˆØ§Ø¨ØªØ§Ù†: Ù…ÙˆÙ„Ø¯ Ø§Ù„Ø®Ø·Ø© ÙŠØ¹ÙŠØ¯ `MINIMUM_SHOT_LENGTH_NOT_ENFORCED` Ø¹Ù†Ø¯ Ø®Ø±Ù‚ invariantØŒ ÙˆHost ÙŠØ±ÙØ¶ Apply Ø¨Ù€`MINIMUM_SHOT_LENGTH_NOT_ENFORCED_AT_RUNTIME` Ø¥Ø°Ø§ Ø£Ø¯Ù‰ ØªÙ‚Ø§Ø·Ø¹ Ù…ØµØ¯Ø± Ø§Ù„ÙÙŠØ¯ÙŠÙˆ Ø¥Ù„Ù‰ Ù…Ù‚Ø·Ø¹ Ø¥Ø®Ø±Ø§Ø¬ Ø£Ù‚ØµØ± Ù…Ù† Ø§Ù„Ù‚ÙŠÙ…Ø© Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø©.

## Ø³ÙŠØ§Ø³Ø© Ø§Ø¹ØªÙ…Ø§Ø¯ Ù…Ø±Ø§Ø¬Ø¹ Podcast Automation

- `Auto-Editor` Ù…Ø±Ø¬Ø¹ Ø®ÙˆØ§Ø±Ø²Ù…ÙŠ Ù„Ù€Silence Removal: ØªØ­Ù„ÙŠÙ„ loudnessØŒ ØªÙƒÙˆÙŠÙ† rangesØŒ margin/paddingØŒ ÙˆØ¯Ù…Ø¬ Ø§Ù„Ù…Ù‚Ø§Ø·Ø¹ Ø§Ù„Ù‚ØµÙŠØ±Ø©. Ù„Ø§ ÙŠÙÙ†Ø³Ø® Ù…Ù†Ù‡ Ø¥Ø®Ø±Ø§Ø¬ timelineØ› ÙŠØ¨Ù‚Ù‰ ØªÙ†ÙÙŠØ° Premiere Ø¹Ø¨Ø± duplicate ÙˆØ¥Ø¹Ø§Ø¯Ø© Ø¨Ù†Ø§Ø¡ Ø§Ù„Ù…Ù‚Ø§Ø·Ø¹ ÙˆØ§Ù„ØªØ­Ù‚Ù‚ Ø§Ù„Ø¹Ø¯Ø¯ÙŠ.
- `Adobe CEP Samples` Ù…Ø±Ø¬Ø¹ Ù„Ø¨Ù†ÙŠØ© CEP ÙˆØ§Ù„Ø§ØªØµØ§Ù„ Ø¨ÙŠÙ† Ø§Ù„ÙˆØ§Ø¬Ù‡Ø© ÙˆExtendScript ÙˆØ¥Ø¯Ø§Ø±Ø© lifecycleØŒ ÙˆÙ„ÙŠØ³ Ù…Ø±Ø¬Ø¹Ù‹Ø§ Ù„Ø®ÙˆØ§Ø±Ø²Ù…ÙŠØ© Ù…Ø²Ø§Ù…Ù†Ø© Ø£Ùˆ Ù‚Øµ.
- ÙˆØ«Ø§Ø¦Ù‚ `Create a multi-camera source sequence` ØªØµÙ workflow ÙˆØ§Ù„Ø®ÙŠØ§Ø±Ø§Øª Ø§Ù„Ù…ØªÙˆÙ‚Ø¹Ø© Ù„Ù„Ù…Ø²Ø§Ù…Ù†Ø©Ø› Ù„Ø§ ØªÙØ¹Ø§Ù…Ù„ ÙƒØ¥Ø«Ø¨Ø§Øª Ù„ÙˆØ§Ø¬Ù‡Ø© scripting ØºÙŠØ± Ù…Ø°ÙƒÙˆØ±Ø© ÙÙŠ Ù…Ø±Ø¬Ø¹ Premiere API.
- Ù…Ø±Ø§Ø¬Ø¹ active-speaker/multitrack Ù…ÙÙŠØ¯Ø© Ù„Ù‚ÙˆØ§Ø¹Ø¯ RMSØŒ crosstalk marginØŒ hysteresisØŒ minimum shotØŒ ÙˆØ¥Ø¯Ø±Ø§Ø¬ wide camera. ÙŠØ¬Ø¨ Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„ØªØ±Ø®ÙŠØµ ÙˆØ§Ù„ØªÙˆØ§ÙÙ‚ Ù…Ø¹ Premiere 26.2 Ù‚Ø¨Ù„ ØªÙƒÙŠÙŠÙ Ø§Ù„ØªÙ†ÙÙŠØ°.
- Ù…Ø´Ø§Ø±ÙŠØ¹ MCP Ù‚Ø¯ ØªØ¹Ù…Ù„ Ø¹Ø¨Ø± ÙˆØ§Ø¬Ù‡Ø© Ø®Ø§Ø±Ø¬ÙŠØ© Ø£Ùˆ UXP Ø£Ùˆ QE ØºÙŠØ± Ù…ÙˆØ«Ù‚Ø› Ù„Ø§ ØªÙØ³ØªØ®Ø¯Ù… ÙÙŠ CEP Ø¥Ù„Ø§ Ø¨Ø¹Ø¯ ØªØ­Ø¯ÙŠØ¯ Ø·Ø¨Ù‚Ø© Ø§Ù„Ù…Ø¶ÙŠÙ ÙˆÙ…Ø·Ø§Ø¨Ù‚Ø© Ø¹Ù…Ù„ÙŠØ§Øª Motion Scale/Position Ù…Ø¹ Runtime Proof.
- `One Click Podcast Edit` Ø·Ø¨Ù‚Ø© orchestration: ØªØ¨Ø¯Ø£ Ø¨Ø¥Ù†Ø´Ø§Ø¡ Ù†Ø³Ø®Ø© Ù…ÙƒØ±Ø±Ø© (Duplicate) ÙÙˆØ±Ø§Ù‹ ÙˆØ§Ù„Ø¹Ù…Ù„ Ø¹Ù„ÙŠÙ‡Ø§ Ø­ØµØ±Ø§Ù‹ Ù„Ø­ÙØ¸ Ø§Ù„Ø£ØµÙ„. Ø§Ù„ØªØªØ§Ø¨Ø¹ Ø§Ù„Ø­Ø§Ù„ÙŠ Ø¨Ø¹Ø¯ Ø­Ø°Ù Silence Removal: Duplicate sequence â†’ Set active â†’ Run Synchronize on duplicate Ø¥Ù† ÙƒØ§Ù† Ù…ÙØ¹Ù„Ø§Ù‹ â†’ Multi-Cam Auto Switch â†’ Auto Captions â† Ø§Ù„ØªØ­Ù‚Ù‚ Ø§Ù„Ù†Ù‡Ø§Ø¦ÙŠ ÙˆØ¥Ø¹Ø§Ø¯Ø© Ø§Ù„ØªØ³Ù…ÙŠØ©.

### ØªØ±ØªÙŠØ¨ One Click ÙˆÙÙ‚ Ø³ÙŠØ± Ø§Ù„Ø¹Ù…Ù„ Ø§Ù„ØªØ­Ø±ÙŠØ±ÙŠ Ø§Ù„Ø¹Ø§Ù…

- ÙŠÙÙØµÙ„ Ø¨ÙŠÙ† **Multicam setup** (ØªØ¬Ù…ÙŠØ¹ Ø§Ù„Ù…ØµØ§Ø¯Ø± Ø§Ù„Ù…ØªØ²Ø§Ù…Ù†Ø©) ÙˆØ¨ÙŠÙ† **camera switching** (Ù‚Ø±Ø§Ø±Ø§Øª Ø§Ù„Ø²ÙˆØ§ÙŠØ§). Ø§Ù„ØªØ±ØªÙŠØ¨ Ø§Ù„Ø­Ø§Ù„ÙŠ Ù„Ù„Ø£ØªÙ…ØªØ© Ø¨Ø¹Ø¯ Ø­Ø°Ù Silence Removal Ù‡Ùˆ: `Synchronize/setup â†’ Multi-Cam switching â†’ Auto Captions`.
- Ø¥Ø²Ø§Ù„Ø© Ø§Ù„ØµÙ…Øª Ù„Ù… ØªØ¹Ø¯ Ø¬Ø²Ø¡Ø§Ù‹ Ù…Ù† Ø§Ù„Ù…Ù†ØªØ¬ Ø§Ù„Ø­Ø§Ù„ÙŠ. Ø§Ù„ÙƒØ§Ø¨Ø´Ù†Ø² ØªØ£ØªÙŠ Ø¨Ø¹Ø¯ ØªØ«Ø¨ÙŠØª Ø¨Ù†ÙŠØ© Ø§Ù„Ù…Ø­ØªÙˆÙ‰ Ø§Ù„Ù†Ø§ØªØ¬Ø© Ù…Ù† Multi-Cam.
- Ø£ÙŠ Ø¥Ø¹Ø§Ø¯Ø© Ù…Ø³ØªÙ‚Ø¨Ù„ÙŠØ© Ù„Ù€ Silence Removal ØªØ­ØªØ§Ø¬ ADR Ø¬Ø¯ÙŠØ¯ ÙˆRegression ÙŠØ«Ø¨Øª Ø£Ù†Ù‡Ø§ Ù„Ø§ ØªÙƒØ³Ø± Ù…Ø³Ø§Ø±Ø§Øª Ø§Ù„Ù…ÙŠÙƒØ±ÙˆÙÙˆÙ†Ø§Øª ÙˆØ§Ù„ÙƒØ§Ù…ÙŠØ±Ø§Øª Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø© Ù„ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ù…ØªØ­Ø¯Ø« Ø§Ù„Ù†Ø´Ø·.

## ØªÙ†ÙˆÙŠØ¹ Ø§Ù„Ù„Ù‚Ø·Ø© Ø§Ù„Ø¹Ø§Ù…Ø© ÙÙŠ Multi-Cam

- Ø§Ù„Ù„Ù‚Ø·Ø© Ø§Ù„Ø¹Ø§Ù…Ø© Ù„ÙŠØ³Øª Ù…Ø­ØµÙˆØ±Ø© ÙÙŠ ØªØ¯Ø§Ø®Ù„ ÙƒÙ„Ø§Ù… Ù…ØªØ­Ø¯Ø«ÙŠÙ†. Ø¨Ø¹Ø¯ ØªØ«Ø¨ÙŠØª Ù‚Ø±Ø§Ø±Ø§Øª Ø§Ù„Ù…ØªØ­Ø¯Ø« ÙˆØ¯Ù…Ø¬ Ø§Ù„Ù„Ù‚Ø·Ø§Øª Ø§Ù„Ù‚ØµÙŠØ±Ø©ØŒ ÙŠÙÙ‚Ø³Ù‘Ù… Ø£ÙŠ ØªØ´ØºÙŠÙ„ Ù…ØªØµÙ„ Ù„ÙƒØ§Ù…ÙŠØ±Ø§ Ù…ØªØ­Ø¯Ø« ÙŠØªØ¬Ø§ÙˆØ² 45 Ø«Ø§Ù†ÙŠØ© Ø¨Ø¥Ø¯Ø®Ø§Ù„ Wide cutaway Ù…Ø¯ØªÙ‡ 4 Ø«ÙˆØ§Ù†ÙØŒ Ø£Ùˆ `Minimum Shot Length` Ø¥Ù† ÙƒØ§Ù†Øª Ø£ÙƒØ¨Ø±.
- Ù„Ø§ ÙŠÙØ¯Ø±Ø¬ cutaway Ø¥Ù† ÙƒØ§Ù† Ø³ÙŠØªØ±Ùƒ Ø°ÙŠÙ„Ù‹Ø§ Ø£Ù‚ØµØ± Ù…Ù† `Minimum Shot Length`. Ø§Ù„Ù‚Ø±Ø§Ø± Ø­ØªÙ…ÙŠ ÙˆÙ‚Ø§Ø¨Ù„ Ù„Ù„Ù…Ø¹Ø§ÙŠÙ†Ø©ØŒ ÙˆÙŠÙØ·Ø¨Ù‚ ÙÙ‚Ø· Ø¹Ù†Ø¯ ØªØ¹ÙŠÙŠÙ† Wide Camera ÙØ¹Ù„ÙŠÙ‹Ø§.
- `wideCameraTimeSec` ÙŠÙØ­Ø³Ø¨ Ù…Ù† Ù‚Ø±Ø§Ø±Ø§Øª `speakerId=wide` ÙˆÙ„ÙŠØ³ Ù…Ù† Ø±Ù‚Ù… Track Ø«Ø§Ø¨Øª.

## Ù‚Ø±Ø§Ø± ÙˆØªØµÙ…ÙŠÙ… Auto Captions Ù„Ù„Ø¨ÙˆØ¯ÙƒØ§Ø³Øª (2026-06-22)

- ÙŠØªÙ… ØªÙˆÙ„ÙŠØ¯ Ø§Ù„ØªØ³Ù…ÙŠØ§Øª Ø§Ù„ØªÙˆØ¶ÙŠØ­ÙŠØ© (Auto Captions) Ù…Ø­Ù„ÙŠØ§Ù‹ Ø¨Ø§Ù„ÙƒØ§Ù…Ù„ Ø¨Ø§Ø³ØªØ®Ø¯Ø§Ù… Ù…Ø­Ø±Ùƒ Faster Whisper ÙˆÙ†Ù…ÙˆØ°Ø¬ Whisper (Ù…Ø«Ù„ medium Ø£Ùˆ large-v3) Ø¯ÙˆÙ† Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø£ÙŠ Ø®Ø¯Ù…Ø§Øª Ø³Ø­Ø§Ø¨ÙŠØ© Ø®Ø§Ø±Ø¬ÙŠØ© (Ù…Ø«Ù„ Reap).
- ÙŠØªÙ… Ø¯Ø¹Ù… Ø§Ù„Ø¹Ø±Ø¨ÙŠØ© Ø¨Ø´ÙƒÙ„ ÙƒØ§Ù…Ù„ RTL Ù…Ø¹ Ø§Ù„ØªÙ†Ø³ÙŠÙ‚ ÙˆØ§Ù„Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ø§Ù„ØªÙ„Ù‚Ø§Ø¦ÙŠ Ø¥Ù„Ù‰ ØªØ±Ø§Ùƒ ÙƒØ§Ø¨Ø´Ù†Ø² Ù…Ø®ØµØµ (`Caption Track`) Ø¯Ø§Ø®Ù„ Premiere Pro 26.2.0.
- ÙŠØªÙ… Ø¥Ø¹Ø¯Ø§Ø¯ ÙˆØªØ¶Ù…ÙŠÙ† Ù…ÙƒØªØ¨Ø§Øª CUDA 12 Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø© (Ù…Ø«Ù„ `cublas64_12.dll`, `cublasLt64_12.dll`, `cudart64_12.dll`) ÙˆÙ…ÙƒØªØ¨Ø§Øª cuDNN 9 Ù…Ø¨Ø§Ø´Ø±Ø©Ù‹ Ø¯Ø§Ø®Ù„ Ù…Ø¬Ù„Ø¯ runtime Ù„Ù€ Saad Studio (ÙÙŠ Ù…Ø¬Ù„Ø¯ `site-packages/ctranslate2`) Ù„Ø¶Ù…Ø§Ù† Ø§Ù„ØªÙˆØ§ÙÙ‚ÙŠØ© Ø§Ù„ÙƒØ§Ù…Ù„Ø© Ø¯ÙˆÙ† Ø§Ù„Ø§Ø¹ØªÙ…Ø§Ø¯ Ø¹Ù„Ù‰ Ø¥ØµØ¯Ø§Ø± CUDA Ø§Ù„Ø®Ø§Øµ Ø¨Ø§Ù„Ø¬Ù‡Ø§Ø² (Ù…Ø«Ù„ CUDA 13.1).
- ÙÙŠ Ø­Ø§Ù„ ØªØ¹Ø°Ø± ØªØ­Ù…ÙŠÙ„ Ø£Ùˆ ØªÙˆÙØ± Ù…ÙƒØªØ¨Ø§Øª CUDA 12 Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø©ØŒ ÙŠØªÙ… Ø±ÙØ¹ Ø­Ø§Ø¬Ø² (blocker) ØµØ±ÙŠØ­ Ø¨Ø§Ø³Ù… `CUDA_12_RUNTIME_MISSING` Ù„Ù…Ù†Ø¹ Ø­Ø¯ÙˆØ« ØªØ±Ø§Ø¬Ø¹ ØµØ§Ù…Øª Ø¥Ù„Ù‰ CPU (CPU Fallback) ÙˆØ¶Ù…Ø§Ù† Ø§Ù„ØªØ´ØºÙŠÙ„ Ø§Ù„ÙƒØ§Ù…Ù„ Ø¹Ù„Ù‰ Ù…Ø³Ø±Ù‘Ø¹ CUDA Ø¨Ø§Ù„Ø¨Ø·Ø§Ù‚Ø© RTX 5090.

## Archived / Previous Auto Zoom Work (Ø£Ø¹Ù…Ø§Ù„ Ù…Ø¤Ø±Ø´ÙØ© / Ø¹Ù…Ù„ Auto Zoom Ø§Ù„Ø³Ø§Ø¨Ù‚)

> [!NOTE]
> Ù‡Ø°Ø§ Ø§Ù„Ù‚Ø³Ù… ÙŠØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ Ø§Ù„Ù…ÙˆØ«Ù‚Ø§Øª ÙˆØ§Ù„Ø£Ø¹Ù…Ø§Ù„ Ø§Ù„Ø³Ø§Ø¨Ù‚Ø© Ø§Ù„Ø®Ø§ØµØ© Ø¨Ù…ÙŠØ²Ø© Ø§Ù„Ø²ÙˆÙ… Ø§Ù„ØªÙ„Ù‚Ø§Ø¦ÙŠ (Auto Zoom) ÙˆØ§Ù„ØªÙŠ ØªÙ… ØªØ¹Ø·ÙŠÙ„Ù‡Ø§ ÙˆØ­Ø¬Ø¨Ù‡Ø§ Ù…Ù† ÙˆØ§Ø¬Ù‡Ø© Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… ÙˆØ§Ù„Ù€ Pipeline Ø§Ù„Ø­Ø§Ù„ÙŠ Ø§Ù„Ø¥Ù†ØªØ§Ø¬ÙŠØŒ ÙˆØ£Ø±Ø´ÙØªÙ‡Ø§ Ù„Ù„Ø¥ØµÙ„Ø§Ø­Ø§Øª Ø§Ù„Ù…Ø³ØªÙ‚Ø¨Ù„ÙŠØ©.

### Auto Zoom Production Ready & Overlay Architecture (Ø§Ù„Ø­Ø§Ù„Ø© Ø§Ù„Ù…Ø¤Ø±Ø´ÙØ© Ø§Ù„Ø³Ø§Ø¨Ù‚Ø©)
- ÙƒØ§Ù†Øª Ø§Ù„Ù…Ø¹Ù…Ø§Ø±ÙŠØ© Ø§Ù„Ù‚Ø¯ÙŠÙ…Ø© ØªØµÙ ØªØ·Ø¨ÙŠÙ‚ Auto Zoom ÙƒÙ€ Production Ready Ùˆ Overlay Architecture Ù…Ø³ØªÙ‚Ø±Ø© (Selected = Inserted = Effects)ØŒ Ù„ÙƒÙ† Ù†Ø¸Ø±Ø§Ù‹ Ù„Ù„Ù…Ø´Ø§ÙƒÙ„ Ø§Ù„Ø­Ø§Ù„ÙŠØ© ØªÙ… Ø£Ø±Ø´ÙØªÙ‡Ø§ Ø¨Ø§Ù„ÙƒØ§Ù…Ù„ ÙˆÙ„Ø§ ØªÙØ¹Ø§Ù…Ù„ ÙƒØ¬Ø²Ø¡ Ù…Ù† Ø§Ù„Ø¥Ù†ØªØ§Ø¬ Ø§Ù„ÙØ¹Ù„ÙŠ.

### Auto Zoom ÙˆÙ‚Ø¯Ø±Ø§Øª Ø§Ù„Ù€ Adjustment Layer
- Auto Zoom Ù„Ø§ ÙŠÙØªØ±Ø¶ Ø£Ù† Ø¥Ù†Ø´Ø§Ø¡ Adjustment Layer Ù…ÙˆØ¬ÙˆØ¯ Ø­ØµØ±Ù‹Ø§ Ø¹Ù„Ù‰ QEØ› ÙŠÙØ­Øµ Runtime Ù„ÙƒÙ„ Ù…Ù† `app.project.newAdjustmentLayer` Ùˆ`qe.project.newAdjustmentLayer` ÙˆÙŠØ³ØªØ®Ø¯Ù… Ø§Ù„Ù…Ø³Ø§Ø± Ø§Ù„Ù…ØªØ§Ø­ ÙÙ‚Ø· Ø¨Ø¹Ø¯ Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† ProjectItem Ø§Ù„Ù†Ø§ØªØ¬.
- Auto Zoom Ø§Ù„Ø­Ø§Ù„ÙŠ ÙŠØ³ØªØ®Ø±Ø¬ Ø£Ø­Ø¯Ø§Ø«Ù‡ Ù…Ù† cuts Ø§Ù„Ù…ÙˆØ¬ÙˆØ¯Ø© ÙÙŠ Ù…Ø³Ø§Ø± Ø§Ù„ÙÙŠØ¯ÙŠÙˆ Ø§Ù„Ù…Ø®ØªØ§Ø±. ØºÙŠØ§Ø¨ cuts ÙŠØ¨Ù‚Ù‰ ØªØ­Ø°ÙŠØ±Ù‹Ø§ ÙˆÙ„Ø§ ÙŠØ¤Ø¯ÙŠ Ø¥Ù„Ù‰ ØªÙˆÙ„ÙŠØ¯ zooms Ø¯ÙˆØ±ÙŠØ© Ø¹Ø´ÙˆØ§Ø¦ÙŠØ©.
- Ø£Ø«Ø¨Øª Runtime ÙÙŠ Premiere 26.2 ØºÙŠØ§Ø¨ Ø¯Ø§Ù„ØªÙŠ Ø¥Ù†Ø´Ø§Ø¡ Adjustment Layer Ø¹Ù„Ù‰ `app.project` Ùˆ`qe.project`. Ù„Ø°Ù„Ùƒ Auto Zoom ÙŠØ³ØªØ®Ø¯Ù… `direct-transform` ÙƒÙ€fallback: ÙŠØ¶ÙŠÙ ØªØ£Ø«ÙŠØ± Transform ÙˆÙ…ÙØ§ØªÙŠØ­ Scale Ù‚Ø§Ø¨Ù„Ø© Ù„Ù„ØªØ¹Ø¯ÙŠÙ„ Ù…Ø¨Ø§Ø´Ø±Ø© Ø¥Ù„Ù‰ clips Ø§Ù„ØªÙŠ ØªØºØ·ÙŠ cuts Ø§Ù„Ù…Ø®ØªØ§Ø±Ø©. ÙŠØ¨Ù‚Ù‰ Ù…Ø³Ø§Ø± Adjustment Layer Ø§Ø®ØªÙŠØ§Ø±ÙŠÙ‹Ø§ Ø¥Ø°Ø§ Ø¸Ù‡Ø± ÙÙŠ Runtime Ø¢Ø®Ø±.
- ØºÙŠØ§Ø¨ cuts ÙŠÙ…Ù†Ø¹ ApplyØ› Ù„Ø§ ØªÙÙˆÙ„Ø¯ zooms Ø¯ÙˆØ±ÙŠØ© Ø£Ùˆ Ø¹Ø´ÙˆØ§Ø¦ÙŠØ© Ø¹Ù„Ù‰ sequence Ø®Ø§Ù….
- Runtime Proof Ø¨ØªØ§Ø±ÙŠØ® 2026-06-18 Ø£Ø«Ø¨Øª Ø£Ù† fallback `direct-transform` ÙŠØ¸Ù‡Ø± `Runtime: Ready` ÙÙŠ Premiere 26.2Ø› Ù„Ù… ÙŠÙØ®ØªØ¨Ø± ØªØ·Ø¨ÙŠÙ‚ Ø§Ù„ØªØ£Ø«ÙŠØ± Ø¨Ø¹Ø¯ Ù„Ø£Ù† sequence Ø§Ù„Ø®Ø§Ù… Ù„Ù… ÙŠØ­ØªÙˆÙ cuts.

### Ù…Ø·Ø§Ø¨Ù‚Ø© ÙÙ‡Ø±Ø³ DOM track.clips ÙÙŠ Auto Zoom QE
- Ù„Ø§ ÙŠØ¬ÙˆØ² Ø§ÙØªØ±Ø§Ø¶ ØªØ·Ø§Ø¨Ù‚ ÙÙ‡Ø±Ø³ DOM `track.clips` Ù…Ø¹ ÙÙ‡Ø±Ø³ QE `getItemAt`. Auto Zoom ÙŠØ·Ø§Ø¨Ù‚ QE item Ø¨Ø²Ù…Ù† Ø¨Ø¯Ø§ÙŠØ© TrackItemØŒ Ø«Ù… ÙŠØ¹ÙŠØ¯ Ù‚Ø±Ø§Ø¡Ø© DOM TrackItem Ø¨Ø¹Ø¯ `addVideoEffect` Ù‚Ø¨Ù„ Ø§Ù„Ø¨Ø­Ø« Ø¹Ù† Transform/Scale.
- Ù†ØªÙŠØ¬Ø© build ÙˆØ­Ø¯Ù‡Ø§ Ù„ÙŠØ³Øª Runtime ProofØ› ÙŠÙ„Ø²Ù… Ø¥Ø«Ø¨Ø§Øª `effectsApplied > 0` Ø¹Ù„Ù‰ duplicate sequence.

### Auto Zoom ÙÙŠ Ù…Ø±Ø¬Ø¹ AutoSplice
- Auto Zoom ØºÙŠØ± Ù…Ù†ÙØ° ÙÙŠ Ø§Ù„Ù…ØµØ¯Ø± Ø§Ù„Ø­Ø§Ù„ÙŠ. ÙˆØ«ÙŠÙ‚Ø© Ø§Ù„ØªØµÙ…ÙŠÙ… ÙÙ‚Ø· ØªÙ‚ØªØ±Ø­ Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„Ù…ÙƒÙˆÙ‘Ù† Ø§Ù„Ù…Ø¯Ù…Ø¬ Motion ÙˆØ®Ø§ØµÙŠØ© Scale Ø¨Ø¯Ù„ Ø¥Ø¶Ø§ÙØ© TransformØ› Ù‡Ø°Ø§ Ø§ØªØ¬Ø§Ù‡ Ø§Ø®ØªØ¨Ø§Ø± Ù…Ø­ØªÙ…Ù„ ÙˆÙ„ÙŠØ³ Ø­Ù‚ÙŠÙ‚Ø© Runtime.

### Ø«Ø¨Ø§Øª Ù…Ø³Ø§Ø± ØªØ­Ù„ÙŠÙ„ Auto Zoom
- Ù‚ÙŠÙ…Ø© Analyze Track Ø­Ø§Ù„Ø© ØµØ±ÙŠØ­Ø© ÙÙŠ Ø§Ù„ÙˆØ§Ø¬Ù‡Ø©ØŒ ÙˆÙŠØ¬Ø¨ Ø¥Ø³Ù†Ø§Ø¯Ù‡Ø§ Ø¥Ù„Ù‰ Ø®Ø§ØµÙŠØ© DOM `HTMLSelectElement.value` Ø¨Ø¹Ø¯ Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø®ÙŠØ§Ø±Ø§ØªØ› ØµÙØ© HTML `value` ÙˆØ­Ø¯Ù‡Ø§ Ù„Ø§ ØªØ®ØªØ§Ø± option Ø¹Ù†Ø¯ Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ø±Ø³Ù….
- Ø§Ù„ØªØ­Ù„ÙŠÙ„ ÙŠØ³ØªÙ‚Ø¨Ù„ `analyzedVideoTrackIndexes` ÙˆÙŠØ­ØµØ± Ø§ÙƒØªØ´Ø§Ù cuts ÙÙŠ Ø§Ù„Ù…Ø³Ø§Ø± Ø§Ù„Ù…Ø®ØªØ§Ø±. ØªØ­ÙØ¸ Ø§Ù„Ù†ØªÙŠØ¬Ø© Ø§Ù„ÙÙ‡Ø§Ø±Ø³ Ø§Ù„ØªÙŠ Ø­ÙÙ„Ù„ØªØŒ ÙˆÙŠØ³ØªØ®Ø¯Ù… Apply Ø§Ù„ÙÙ‡Ø§Ø±Ø³ Ù†ÙØ³Ù‡Ø§ Ù„Ø¶Ù…Ø§Ù† Ø¹Ø¯Ù… Ø§Ø®ØªÙ„Ø§Ù Ù…Ø³Ø§Ø± Ø§Ù„ØªØ­Ù„ÙŠÙ„ Ø¹Ù† Ù…Ø³Ø§Ø± Ø§Ù„ØªÙ†ÙÙŠØ°.
- ØªØºÙŠÙŠØ± Analyze Track ÙŠÙ„ØºÙŠ ØªØ­Ù„ÙŠÙ„ Auto Zoom Ø§Ù„Ø³Ø§Ø¨Ù‚ ÙˆÙŠØ³ØªÙ„Ø²Ù… Analyze Ø¬Ø¯ÙŠØ¯Ù‹Ø§ Ù‚Ø¨Ù„ ApplyØ› Ù„Ø§ ÙŠØ¬ÙˆØ² ØªØ·Ø¨ÙŠÙ‚ Ù†ØªÙŠØ¬Ø© ØªØ­Ù„ÙŠÙ„ Ù„Ù…Ø³Ø§Ø± Ø¹Ù„Ù‰ Ù…Ø³Ø§Ø± Ø¢Ø®Ø±.

### ØªÙ†ÙÙŠØ° Auto Zoom Ø¹Ø¨Ø± Motion Scale
- ÙÙŠ Premiere 26.2 Ø§Ù„Ù…Ø³Ø§Ø± Ø§Ù„Ø£Ø³Ø§Ø³ÙŠ Ù‡Ùˆ Ø®Ø§ØµÙŠØ© `Scale` Ø¯Ø§Ø®Ù„ Ø§Ù„Ù…ÙƒÙˆÙ‘Ù† Ø§Ù„Ù…Ø¯Ù…Ø¬ `Motion` Ø¹Ù„Ù‰ TrackItemØ› Ù„Ø§ ÙŠØ­ØªØ§Ø¬ Ù‡Ø°Ø§ Ø§Ù„Ù…Ø³Ø§Ø± Ø¥Ù„Ù‰ Ø¥Ø¶Ø§ÙØ© ØªØ£Ø«ÙŠØ± Ø¬Ø¯ÙŠØ¯ Ø¹Ø¨Ø± QE.
- Ø§Ù„Ø¨Ø­Ø« ÙŠØ¹ØªÙ…Ø¯ `matchName` (`ADBE Motion` Ùˆ`ADBE Scale`) Ùˆ`displayName` Ù…Ø¹ fallback Ù…ÙˆØ¶Ø¹ÙŠ `components[1].properties[1]` Ù„Ù„Ù…Ø¶ÙŠÙ Ø§Ù„Ù…ØªÙˆØ§ÙÙ‚. ÙŠØ³ØªØ®Ø¯Ù… Transform Ø¹Ø¨Ø± QE ÙƒØ§Ø­ØªÙŠØ§Ø· ÙÙ‚Ø·.
- Ø£Ø²Ù…Ù†Ø© Ù…ÙØ§ØªÙŠØ­ Scale Ù‡ÙŠ Ø£Ø²Ù…Ù†Ø© timelineØŒ ÙˆØªÙÙ‚ÙŠØ¯ Ø¨Ø­Ø¯ÙŠ Ø¨Ø¯Ø§ÙŠØ© ÙˆÙ†Ù‡Ø§ÙŠØ© clip. Ù„Ø§ ÙŠØ¬ÙˆØ² ÙˆØ¶Ø¹ Ù…ÙØªØ§Ø­ Ø¨Ø¹Ø¯ Ù†Ù‡Ø§ÙŠØ© TrackItem.
- Ù…Ø¹ÙŠØ§Ø± Runtime Proof Ù‡Ùˆ `effectsApplied > 0` Ù…Ø¹ Ø¸Ù‡ÙˆØ± ØªØºÙŠØ± Scale/Ø§Ù„Ù…ÙØ§ØªÙŠØ­ Ø¯Ø§Ø®Ù„ Effect ControlsØ› Ø§ÙƒØªØ´Ø§Ù cuts ÙˆØ­Ø¯Ù‡ Ù„Ø§ ÙŠØ«Ø¨Øª Ù†Ø¬Ø§Ø­ Auto Zoom.
- ÙÙŠ Direct Motion ÙŠØ¨Ù‚Ù‰ `adjustmentLayersInserted=0` Ù„Ø£Ù† Ø§Ù„ØªØ¹Ø¯ÙŠÙ„ ÙŠÙ‚Ø¹ Ø¹Ù„Ù‰ TrackItem Ù†ÙØ³Ù‡Ø› Ø§Ù„ÙˆØ§Ø¬Ù‡Ø© ÙŠØ¬Ø¨ Ø£Ù† ØªØ¹Ø±Ø¶ `effectsApplied` Ø¨ÙˆØµÙÙ‡ Ù†ØªÙŠØ¬Ø© Ø§Ù„Ù†Ø¬Ø§Ø­ ÙˆÙ„Ø§ ØªØµÙ Ø§Ù„ØµÙØ± ÙƒÙØ´Ù„.
- Rhythm ÙŠØ­Ø¯Ø¯ Ø¹Ø¯Ø¯ Ø£Ø­Ø¯Ø§Ø« Ø§Ù„Ø²ÙˆÙ… Ø¨Ø§Ù„ØªÙ‚Ø±ÙŠØ¨: `round(cutCount Ã— rhythm)` Ø¨Ø­Ø¯ Ø£Ø¯Ù†Ù‰ Ø­Ø¯Ø« ÙˆØ§Ø­Ø¯ Ø¹Ù†Ø¯ ÙˆØ¬ÙˆØ¯ cutsØŒ ÙˆØªÙˆØ²Ø¹ Ø§Ù„Ø£Ø­Ø¯Ø§Ø« Ø§Ù„Ù…Ø®ØªØ§Ø±Ø© Ø¹Ù„Ù‰ Ø§Ù…ØªØ¯Ø§Ø¯ Ø§Ù„Ù‚Ø§Ø¦Ù…Ø©. Ù…Ø«Ø§Ù„: 3 cuts Ø¹Ù†Ø¯ 60% ØªØ¹Ø·ÙŠ ØªØ£Ø«ÙŠØ±ÙŠÙ†.

### Auto Zoom Ù„Ù„Ø¨ÙˆØ¯ÙƒØ§Ø³Øª: Cut-Based Ù…Ù‚Ø§Ø¨Ù„ Emphasis-Based
- Ø§Ù„ØªÙ†ÙÙŠØ° Ø§Ù„Ø­Ø§Ù„ÙŠ cut-based: ÙŠØ³ØªØ®Ø±Ø¬ Ø­Ø¯ÙˆØ¯ TrackItems Ù…Ù† Ù…Ø³Ø§Ø± Ø§Ù„ÙÙŠØ¯ÙŠÙˆ Ø§Ù„Ù…Ø®ØªØ§Ø±ØŒ ÙŠÙ†ØªÙ‚ÙŠ Ù†Ø³Ø¨Ø© Ù…Ù†Ù‡Ø§ Ø¹Ø¨Ø± RhythmØŒ ÙˆÙŠÙƒØªØ¨ Motion Scale. Ù‡Ø°Ø§ Ù…Ù†Ø§Ø³Ø¨ Ù„Ù„Ø²ÙˆÙ… Ø¹Ù†Ø¯ ØªØºÙŠÙ‘Ø± Ø§Ù„Ù„Ù‚Ø·Ø©ØŒ Ù„ÙƒÙ†Ù‡ Ù„Ø§ ÙŠÙƒØªØ´Ù Ø§Ù„ØªØ´Ø¯ÙŠØ¯ Ø§Ù„ØµÙˆØªÙŠ Ø¯Ø§Ø®Ù„ Ù„Ù‚Ø·Ø© Ø·ÙˆÙŠÙ„Ø©.
- Ø§Ù„ØªØµÙ…ÙŠÙ… Ø§Ù„Ù…Ù‚ØªØ±Ø­ v2 emphasis-based: Ø§Ø³ØªØ®Ø±Ø§Ø¬ envelope/RMS Ù„Ù„ØµÙˆØªØŒ Ø§ÙƒØªØ´Ø§Ù peaks Ø§Ù„Ø¨Ø§Ø±Ø²Ø© Ù†Ø³Ø¨Ø©Ù‹ Ø¥Ù„Ù‰ baseline Ù…Ø­Ù„ÙŠØŒ Ø¯Ù…Ø¬ peaks Ø§Ù„Ù…ØªÙ‚Ø§Ø±Ø¨Ø©ØŒ ØªØ·Ø¨ÙŠÙ‚ cooldownØŒ Ø«Ù… ØªØ­ÙˆÙŠÙ„ Ø²Ù…Ù† Ø§Ù„ØµÙˆØª Ø¥Ù„Ù‰ timeline Ù‚Ø¨Ù„ Ø¥Ù†Ø´Ø§Ø¡ Ù…ÙØ§ØªÙŠØ­ Motion Scale.
- Ù†Ø·Ø§Ù‚Ø§Øª Ø§Ø®ØªØ¨Ø§Ø± Ø£ÙˆÙ„ÙŠØ© ÙˆÙ„ÙŠØ³Øª Ø­Ù‚Ø§Ø¦Ù‚ Ù…Ø«Ø¨ØªØ©: Scale 108â€“115%ØŒ Ø¯Ø®ÙˆÙ„ 8â€“15 frameØŒ hold 1â€“3sØŒ Ø®Ø±ÙˆØ¬ ØªØ¯Ø±ÙŠØ¬ÙŠØŒ ÙˆÙØ§ØµÙ„ 4â€“6s Ù‚Ø¨Ù„ zoom Ø¬Ø¯ÙŠØ¯. ÙŠØ¬Ø¨ ØªØ«Ø¨ÙŠØª default Ø¹Ø¨Ø± fixtures ÙˆÙ…Ø´Ø§Ù‡Ø¯Ø© ÙØ¹Ù„ÙŠØ© Ø¹Ù„Ù‰ 25fps ÙˆÙ…Ø¹Ø¯Ù„Ø§Øª Ø£Ø®Ø±Ù‰.
- Ù„Ø§ ÙŠÙØ³ØªØ®Ø¯Ù… face tracking Ø£Ùˆ Position ÙÙŠ Scale-only v1. Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„ØªØ£Ø·ÙŠØ± Ø¨Ø§Ù„ÙˆØ¬Ù‡ Ù…ÙŠØ²Ø© Ù…Ø³ØªÙ‚Ù„Ø© ØªØªØ·Ù„Ø¨ Ø¥Ø­Ø¯Ø§Ø«ÙŠØ§Øª Ù…ÙˆØ«Ù‚Ø©ØŒ smoothingØŒ crop safetyØŒ ÙˆØ§Ø®ØªØ¨Ø§Ø± ÙƒØªØ§Ø¨Ø© Position ÙÙŠ Premiere 26.2.
- Ù„Ø§ ÙŠÙÙ‚Ø¨Ù„ Ù†Ø¬Ø§Ø­ setter ÙˆØ­Ø¯Ù‡ ÙƒØ¯Ù„ÙŠÙ„ Ø¨ØµØ±ÙŠØ› Ø§Ù„ØªØ­Ù‚Ù‚ ÙŠØ´Ù…Ù„ Ø¹Ø¯Ø¯ keyframesØŒ Ù‚ÙŠÙ…Ù‡Ø§ ÙˆØ£Ø²Ù…Ù†ØªÙ‡Ø§ØŒ ÙˆØ§Ø®ØªØ¨Ø§Ø± playback Ø¹Ù†Ø¯ event times.

### Ù…Ø§ Ø«Ø¨Øª Ù…Ù† Ù…Ø±Ø¬Ø¹ AutoCut AutoZoom Ø§Ù„Ù…Ø±Ø¦ÙŠ
- ÙˆØ§Ø¬Ù‡Ø© AutoCut ØªÙØµÙ„ Ø¨ÙŠÙ† ØªÙˆØ§ØªØ±/ÙƒØ«Ø§ÙØ© Ø§Ù„Ø²ÙˆÙ…Ø§ØªØŒ Ù…Ù‚Ø¯Ø§Ø± Ø§Ù„Ø²ÙˆÙ…ØŒ ÙˆÙ†Ù…Ø· Ø§Ù„Ø­Ø±ÙƒØ©ØŒ ÙˆØªØ¹Ø±Ø¶ Ø«Ù„Ø§Ø«Ø© Ø£Ù†Ù…Ø§Ø· Ù…Ø±Ø¦ÙŠØ©: `Cut` Ùˆ`Smooth` Ùˆ`Snap-In`.
- Ø§Ù„Ù…Ù†ØªØ¬ ÙŠØ¹Ø±Ø¶ Preview/Processing Ù‚Ø¨Ù„ Ø§Ù„Ù†ØªÙŠØ¬Ø©ØŒ ÙˆÙŠØªØ±Ùƒ Ø§Ù„Ù…Ø§Ø¯Ø© Ø§Ù„Ø£ØµÙ„ÙŠØ© Ù…Ø¹ Ù…Ø®Ø±Ø¬Ø§Øª Ù…Ø±Ø¦ÙŠØ© Ø¹Ù„Ù‰ Ù…Ø³Ø§Ø± Ø£Ø¹Ù„Ù‰ ÙÙŠ Ø§Ù„Ù„Ù‚Ø·Ø§Øª Ø§Ù„Ù…Ø¹Ø±ÙˆØ¶Ø©. ÙŠÙØ¹ØªÙ…Ø¯ Ù…Ù† Ø°Ù„Ùƒ Ù…Ø¨Ø¯Ø¢Ù† ÙÙ‚Ø·: ÙØµÙ„ Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§ØªØŒ ÙˆÙ…Ø³Ø§Ø± ØªØ·Ø¨ÙŠÙ‚ ØºÙŠØ± Ù‡Ø¯Ù‘Ø§Ù… Ù‚Ø¯Ø± Ø§Ù„Ø¥Ù…ÙƒØ§Ù†.
- Ø§Ù„ÙÙŠØ¯ÙŠÙˆ Ø§Ù„ØªØ³ÙˆÙŠÙ‚ÙŠ Ù„Ø§ ÙŠÙƒØ´Ù Ø®ÙˆØ§Ø±Ø²Ù…ÙŠØ© Ø§Ø®ØªÙŠØ§Ø± Ø£Ø²Ù…Ù†Ø© Ø§Ù„Ø²ÙˆÙ… ÙˆÙ„Ø§ ÙŠØ«Ø¨Øª Ø§Ø³ØªØ®Ø¯Ø§Ù… RMS Ø£Ùˆ peaks Ø£Ùˆ Adjustment Layer Ø¨Ø¹ÙŠÙ†Ù‡. Ù„Ø§ ØªÙØ¹ÙˆÙ‘Ù„ Ù‡Ø°Ù‡ Ø§Ù„Ø£Ù…ÙˆØ± Ø¥Ù„Ù‰ Ø­Ù‚Ø§Ø¦Ù‚ Ù…Ø¹Ù…Ø§Ø±ÙŠØ© Ø¨Ù„Ø§ ØªÙˆØ«ÙŠÙ‚ Ø£Ùˆ Runtime Proof.
- ÙÙŠ Premiere 26.2 ÙŠØ¨Ù‚Ù‰ Motion > Scale Ù‡Ùˆ Ø§Ù„Ù…Ø³Ø§Ø± Ø§Ù„Ù…Ø«Ø¨Øª Ø­Ø§Ù„ÙŠÙ‹Ø§ ÙÙŠ Saad Studio. Ø§Ù„Ø§Ù†ØªÙ‚Ø§Ù„ Ø¥Ù„Ù‰ Ù…Ø³Ø§Ø± Ø¹Ù„ÙˆÙŠ Ù…ÙˆÙ„Ù‘Ø¯ ÙŠØ­ØªØ§Ø¬ Ø¥Ø«Ø¨Ø§Øª Ø£Ù† Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø¹Ù†ØµØ± ÙˆÙƒØªØ§Ø¨Ø© ØªØ£Ø«ÙŠØ±Ø§ØªÙ‡ Ù…ØªØ§Ø­Ø§Ù† ÙˆÙ…ÙˆØ«ÙˆÙ‚Ø§Ù† ÙÙŠ CEP/QE Ø¹Ù„Ù‰ Ø§Ù„Ø¥ØµØ¯Ø§Ø± Ø§Ù„Ù…Ø³ØªÙ‡Ø¯Ù.

### Ù‚ÙˆØ§Ø¹Ø¯ ØªØ®Ø·ÙŠØ· ÙˆØªÙ†ÙÙŠØ° Auto Zoom
- ØªØ¬Ø±Ø¨Ø© Ø§Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„Ø¥Ù†ØªØ§Ø¬ÙŠØ© Ø²Ø± ÙˆØ§Ø­Ø¯: `Run Auto Zoom` ÙŠÙ†ÙØ° Auto-detect Ø«Ù… Inspect Ø«Ù… Apply. Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ© Ù„ÙŠØ³Øª Ø®Ø·ÙˆØ© Ù…Ø·Ù„ÙˆØ¨Ø© Ù…Ù† Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…Ø› ÙŠÙØ¹Ø§Ø¯ ÙØ±Ø¶ preset Ù…Ø­Ø§ÙØ¸ Ø¹Ù†Ø¯ ÙƒÙ„ ØªØ´ØºÙŠÙ„: Rhythm 60%ØŒ zoom multiplier 1.12ØŒ Ù…Ø¯Ø© 1.5 Ø«Ø§Ù†ÙŠØ©ØŒ ÙˆSmooth. ØªØ¹Ø±Ø¶ Ø§Ù„ÙˆØ§Ø¬Ù‡Ø© Ù‡Ø°Ù‡ Ø§Ù„Ù‚ÙŠÙ… ÙƒØ­Ù‚ÙˆÙ„ Ù‚Ø±Ø§Ø¡Ø© ÙÙ‚Ø·.
- Ø¹Ù†Ø¯ ØªØ´ØºÙŠÙ„ Auto Zoom ÙÙˆÙ‚ Ù…Ø³Ø§Ø± `Saad Auto Switch` Ø§Ù„Ù…ÙˆÙ„Ø¯ØŒ ØªÙØ³ØªØ¨Ø¹Ø¯ ØªÙ„Ù‚Ø§Ø¦ÙŠÙ‹Ø§ Ø­Ø¯ÙˆØ¯ Ø§Ù„Ù…Ù‚Ø§Ø·Ø¹ Ø§Ù„ØªÙŠ ÙŠÙƒÙˆÙ† Ù…ØµØ¯Ø±Ù‡Ø§ Wide Camera. ØªÙÙ‚Ø±Ø£ Ù‡ÙˆÙŠØ© Ø§Ù„Ù…ØµØ¯Ø± Ù…Ù† Ø§Ø³Ù… `Saad Auto Switch Vn` ÙˆØªÙÙ‚Ø§Ø±Ù† Ø¨ØªØ¹ÙŠÙŠÙ† Wide Ø§Ù„Ø­Ø§Ù„ÙŠØ› Ø§Ù„Ø²ÙˆÙ… ÙŠÙØ®ØµØµ Ù„Ù„Ù‚Ø·Ø§Øª Ø§Ù„Ù…ØªØ­Ø¯Ø«ÙŠÙ† ÙˆÙ„Ø§ ÙŠÙˆØ¶Ø¹ Ø¹Ù„Ù‰ Ø§Ù„Ù„Ù‚Ø·Ø© Ø§Ù„Ø¹Ø§Ù…Ø©.
- Ù„Ø¶Ù…Ø§Ù† Ø¨Ù‚Ø§Ø¡ Ø§Ù„Ù‡ÙˆÙŠØ© Ø¨Ø¹Ø¯ Ø¥Ø¹Ø§Ø¯Ø© ÙØªØ­ Premiere Ø£Ùˆ ØªØ¨Ø¯ÙŠÙ„ Ø§Ù„Ù€SequenceØŒ ØªÙÙˆØ³Ù… Ø§Ù„Ù„Ù‚Ø·Ø© Ø§Ù„Ø¹Ø§Ù…Ø© Ø¹Ù†Ø¯ ØªÙˆÙ„ÙŠØ¯Ù‡Ø§ Ø¨Ø§Ø³Ù… `Saad Auto Switch WIDE Vn ...`. Ø§Ù„Ø§Ø³ØªØ¨Ø¹Ø§Ø¯ Ø§Ù„Ø£Ø³Ø§Ø³ÙŠ ÙŠØ¹ØªÙ…Ø¯ Ù‡Ø°Ø§ Ø§Ù„ÙˆØ³Ù… Ø§Ù„Ø¯Ø§Ø¦Ù…ØŒ Ø¨ÙŠÙ†Ù…Ø§ Ù…Ù‚Ø§Ø±Ù†Ø© Vn Ø¨ØªØ¹ÙŠÙŠÙ† Wide ÙÙŠ Ø§Ù„ÙˆØ§Ø¬Ù‡Ø© fallback Ø¥Ø¶Ø§ÙÙŠ ÙÙ‚Ø·. Ø§Ù„Ù…Ø³ÙˆØ¯Ø§Øª Ø§Ù„Ù‚Ø¯ÙŠÙ…Ø© Ø§Ù„Ø³Ø§Ø¨Ù‚Ø© Ù„Ù‡Ø°Ø§ Ø§Ù„ÙˆØ³Ù… Ù„Ø§ ØªØµÙ„Ø­ Ù„Ø§Ø®ØªØ¨Ø§Ø± Ø§Ù„Ø§Ø³ØªØ¨Ø¹Ø§Ø¯.
- Ø£Ø­Ø¯Ø§Ø« Ø§Ù„Ù†Ø³Ø®Ø© cut-based ØªØ¨Ø¯Ø£ Ø¹Ù†Ø¯ Ø¨Ø¯Ø§ÙŠØ§Øª TrackItems Ø§Ù„Ø¯Ø§Ø®Ù„ÙŠØ© ÙÙ‚Ø·Ø› Ù„Ø§ ØªÙØ¹Ø§Ù…Ù„ Ù†Ù‡Ø§ÙŠØ© Ù…Ù‚Ø·Ø¹ Ù…Ø¹ ÙØ¬ÙˆØ© ÙƒØ­Ø¯Ø« Ù…Ø³ØªÙ‚Ù„. Ù‚Ø¨Ù„ ØªØ·Ø¨ÙŠÙ‚ Rhythm ØªÙØ³ØªØ¨Ø¹Ø¯ Ø§Ù„Ø£Ø­Ø¯Ø§Ø« Ø§Ù„ØªÙŠ ØªØªØ¯Ø§Ø®Ù„ Ù†ÙˆØ§ÙØ°Ù‡Ø§ ÙˆÙÙ‚ `Zoom Duration`.
- ÙŠÙØ®ØªØ§Ø± Style ÙˆØ§Ø­Ø¯ Ù„ÙƒÙ„ Ø¹Ù…Ù„ÙŠØ© Apply. ØªØ¯ÙˆÙŠØ± Ø¹Ø¯Ø© Ø£Ù†Ù…Ø§Ø· Ø¯Ø§Ø®Ù„ Ø§Ù„Ø¹Ù…Ù„ÙŠØ© Ø§Ù„ÙˆØ§Ø­Ø¯Ø© Ù…Ù…Ù†ÙˆØ¹ Ù„Ø£Ù†Ù‡ ÙŠØ¬Ø¹Ù„ Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø© ÙˆØ§Ù„Ù†ØªÙŠØ¬Ø© ØºÙŠØ± Ù‚Ø§Ø¨Ù„ØªÙŠÙ† Ù„Ù„ØªÙ†Ø¨Ø¤.
- `Maximum Zoom` Ù†Ø³Ø¨Ø© Ù…Ø¶Ø§Ø¹ÙØ© Ù„Ù‚ÙŠÙ…Ø© Scale Ø§Ù„Ø­Ø§Ù„ÙŠØ©ØŒ ÙˆÙ„ÙŠØ³Øª Ù‚ÙŠÙ…Ø© Ù…Ø·Ù„Ù‚Ø© ØªÙØªØ±Ø¶ 100%. Ù…Ø«Ø§Ù„: Scale Ø£ØµÙ„ÙŠ 50% Ù…Ø¹ Zoom 1.3 ÙŠÙ†ØªØ¬ 65% Ø«Ù… ÙŠØ¹ÙˆØ¯ Ø¥Ù„Ù‰ 50%.
- ÙƒÙ„ Style ÙŠØ¬Ø¨ Ø£Ù† ÙŠØ¨Ù‚Ù‰ Ù…Ø­ØµÙˆØ±Ù‹Ø§ Ø¯Ø§Ø®Ù„ Ù†Ø§ÙØ°Ø© Ø§Ù„Ø­Ø¯Ø« ÙˆÙŠØ¹ÙŠØ¯ Scale Ø§Ù„Ø£ØµÙ„ÙŠ Ø¹Ù†Ø¯ Ø§Ù„Ù†Ù‡Ø§ÙŠØ©: Jump Ø§Ù†ØªÙ‚Ø§Ù„ Ø´Ø¨Ù‡ ÙÙˆØ±ÙŠØŒ Smooth Ø¯Ø®ÙˆÙ„ ÙˆØ®Ø±ÙˆØ¬ ØªØ¯Ø±ÙŠØ¬ÙŠØ§Ù†ØŒ ÙˆSnap-in Ø§Ù†ØªÙ‚Ø§Ù„ Ø£Ø³Ø±Ø¹. ÙŠÙ…Ù†Ø¹ Ø§Ø³ØªØ®Ø¯Ø§Ù… Ù‚ÙŠÙ…Ø© Static Ø¹Ù„Ù‰ Ø§Ù„Ù…Ù‚Ø·Ø¹ ÙƒÙ„Ù‡ Ù„ØªÙ†ÙÙŠØ° Ø­Ø¯Ø« Ø²ÙˆÙ… Ù…Ø¤Ù‚Øª.
- ÙŠØ¬Ø¨ Ø£Ù† ÙŠØ³Ø¨Ù‚ Runtime Proof Ø§Ø®ØªØ¨Ø§Ø± fixture Ù„Ù…Ù†Ø¹ Ø§Ù„ØªØ¯Ø§Ø®Ù„ ÙˆØ§Ø³ØªØ¹Ø§Ø¯Ø© Ø§Ù„Ù‚ÙŠÙ…Ø©ØŒ Ø«Ù… ØªÙÙØ­Øµ Ø§Ù„Ù…ÙØ§ØªÙŠØ­ ÙØ¹Ù„ÙŠÙ‹Ø§ ÙÙŠ Effect Controls Ø¹Ù„Ù‰ duplicate Ù†Ø¸ÙŠÙ.

### Ù…Ø±Ø¬Ø¹ PremiereGPTBeta Ø§Ù„Ø¯ÙŠÙ†Ø§Ù…ÙŠÙƒÙŠ
- Ù…Ø¬Ù„Ø¯ Ø§Ù„ØªØ«Ø¨ÙŠØª Ù„ÙŠØ³ Ù…ØµØ¯Ø± Ø§Ù„ØªÙ†ÙÙŠØ° Ø§Ù„ÙƒØ§Ù…Ù„Ø› Ø§Ù„Ù€loader ÙŠØ­Ù‚Ù† Ø­Ø²Ù…Ø© Ø¨Ø¹ÙŠØ¯Ø© Ù…Ù† `api.premierecopilot.com/api/snake3`ØŒ ÙˆØ¯ÙˆØ§Ù„ JSX Ø§Ù„Ø¥Ù†ØªØ§Ø¬ÙŠØ© ØªÙØ¬Ù„Ø¨ Ø­Ø³Ø¨ Ø§Ù„Ø§Ø³Ù… Ù…Ù† endpoint `/jsx`.
- AutoZoom ÙÙŠÙ‡ ÙŠÙØµÙ„ Ù…Ø±Ø­Ù„Ø© Ø§Ù„Ù‚Ø±Ø§Ø± Ø¹Ù† Premiere mutation: ØªØµØ¯ÙŠØ± ØµÙˆØª + Ù‚Ø±Ø§Ø¡Ø© Ø¨Ù†ÙŠØ© Sequence â†’ ØªØ­Ù„ÙŠÙ„ Ø®Ø§Ø¯Ù…ÙŠ â†’ Ù†ØªÙŠØ¬Ø© Ù‚Ø±Ø§Ø±Ø§Øª â†’ Ø¬Ù„Ø¨ `AUTOZOOM_main` ÙˆØªÙ†ÙÙŠØ°Ù‡Ø§ ÙÙŠ Premiere.
- Ø­Ù‚ÙˆÙ„ Ø§Ù„Ù‚Ø±Ø§Ø± Ø§Ù„Ù…Ø±Ø¦ÙŠØ© ØªØ´Ù…Ù„ cuts Ùˆemotion Ùˆspeech Ùˆrandom ÙˆcontextØŒ Ø¥Ø¶Ø§ÙØ© Ø¥Ù„Ù‰ rhythm Ùˆfastness Ùˆzoom amount Ùˆmotion camera ÙˆX/Y ÙˆØ§Ù„Ø£Ù†Ù…Ø§Ø· Ø§Ù„Ø«Ù„Ø§Ø«Ø©. Ù‡Ø°Ø§ ÙŠØ«Ø¨Øª Ø´ÙƒÙ„ pipeline ÙˆØ§Ù„Ù€inputsØŒ ÙˆÙ„Ø§ ÙŠØ«Ø¨Øª Ø®ÙˆØ§Ø±Ø²Ù…ÙŠØ© Ø§Ù„Ø®Ø§Ø¯Ù… Ø£Ùˆ Ø·Ø±ÙŠÙ‚Ø© keyframes Ø§Ù„Ø¯Ø§Ø®Ù„ÙŠØ©.
- Ø¹Ù†Ø¯ Ø§Ù„Ø§Ø³ØªÙØ§Ø¯Ø© Ù…Ù†Ù‡ ÙÙŠ Saad StudioØŒ ÙŠÙÙƒÙŠÙ‘Ù Ø§Ù„Ù…Ø¨Ø¯Ø£ Ù…Ø­Ù„ÙŠÙ‹Ø§: ØªÙˆÙ„ÙŠØ¯ `ZoomDecision[]` Ù…ÙˆØ«Ù‚Ø© Ù…Ù† timeline/audioØŒ Preview Ù‚Ø¨Ù„ ApplyØŒ Ø«Ù… Motion Scale/Position Ù…Ø«Ø¨Øª ÙÙŠ Premiere 26.2. Ù„Ø§ ÙŠÙØ¹ØªÙ…Ø¯ remote code injection ÙƒÙ…Ø¹Ù…Ø§Ø±ÙŠØ© Ù„Ù„Ù…Ø³Ø§Ø± Ø§Ù„Ø­Ø³Ø§Ø³.
- ÙØªØ­ Effect Controls Ø£Ùˆ ØªØ­Ø¯ÙŠØ¯ TrackItem ÙŠØ¯ÙˆÙŠÙ‹Ø§ Ù…Ø³Ù…ÙˆØ­ ÙƒØ§Ø®ØªØ¨Ø§Ø± ØªØ·ÙˆÙŠØ± ÙÙ‚Ø·Ø› Ù„Ø§ ÙŠØ¯Ø®Ù„ Ø¶Ù…Ù† UX Ø§Ù„Ù†Ù‡Ø§Ø¦ÙŠ. Auto Zoom Ø§Ù„Ø¥Ù†ØªØ§Ø¬ÙŠ Ù…Ø³Ø¤ÙˆÙ„ Ø¹Ù† Ø§ÙƒØªØ´Ø§Ù Ø§Ù„Ù‡Ø¯Ù ÙˆÙƒØªØ§Ø¨Ø© Ø§Ù„Ù…ÙØ§ØªÙŠØ­ ÙˆØ§Ù„ØªØ­Ù‚Ù‚ Ù…Ù†Ù‡Ø§ ØªÙ„Ù‚Ø§Ø¦ÙŠÙ‹Ø§.

### Ø§Ù„Ø§ÙƒØªØ´Ø§Ù Ø§Ù„ØªÙ„Ù‚Ø§Ø¦ÙŠ Ù„Ù…Ø³Ø§Ø± Auto Zoom
- Ù„Ø§ ØªØ¹ØªÙ…Ø¯ Ø§Ù„Ø£Ø¯Ø§Ø© Ø¹Ù„Ù‰ track index Ù…Ø­ÙÙˆØ¸ ÙÙŠ Ø§Ù„ÙˆØ§Ø¬Ù‡Ø© Ù„Ø£Ù† Ù‡ÙˆÙŠØ©/Ø¨Ù†ÙŠØ© Ø§Ù„Ù€Sequence Ù‚Ø¯ ØªØªØºÙŠØ±. Host ÙŠÙØ­Øµ ÙƒÙ„ Ù…Ø³Ø§Ø±Ø§Øª Ø§Ù„ÙÙŠØ¯ÙŠÙˆ ÙˆÙŠØ­Ø³Ø¨ Ø£Ø­Ø¯Ø§Ø« Ø§Ù„Ù‚Øµ Ù…Ù† Ø¨Ø¯Ø§ÙŠØ§Øª TrackItems Ø§Ù„Ø¯Ø§Ø®Ù„ÙŠØ©ØŒ Ø«Ù… ÙŠØ®ØªØ§Ø± Ø§Ù„Ù…Ø³Ø§Ø± ØµØ§Ø­Ø¨ Ø£ÙƒØ¨Ø± Ø¹Ø¯Ø¯ Ù…Ù† Ø§Ù„Ø£Ø­Ø¯Ø§Ø«Ø› Ø§Ù„ØªØ¹Ø§Ø¯Ù„ ÙŠÙØ­Ø³Ù… Ù„Ù„Ù…Ø³Ø§Ø± Ø§Ù„Ø£Ø¹Ù„Ù‰.
- Ø¯ÙˆØ±Ø© Ø§Ù„Ø¥Ù†ØªØ§Ø¬ Ø²Ø± ÙˆØ§Ø­Ø¯: Auto-detect â†’ Inspect â†’ Apply. Ø§Ø®ØªÙŠØ§Ø± track Ø£Ùˆ clip ÙˆÙØªØ­ Effect Controls Ù„ÙŠØ³Øª Ø®Ø·ÙˆØ§Øª Ù„Ù„Ù…Ø³ØªØ®Ø¯Ù….
- Ø¥Ù† Ù„Ù… ÙŠÙˆØ¬Ø¯ cut Ø¯Ø§Ø®Ù„ÙŠ Ø¹Ù„Ù‰ Ø£ÙŠ Ù…Ø³Ø§Ø±ØŒ ØªØªÙˆÙ‚Ù Ø§Ù„Ø£Ø¯Ø§Ø© Ø¨Ø±Ø³Ø§Ù„Ø© `AUTO_ZOOM_TRACK_WITH_CUTS_NOT_FOUND` Ø¨Ø¯Ù„ Ø§Ø®ØªÙŠØ§Ø± V1 Ø§ÙØªØ±Ø§Ø¶ÙŠÙ‹Ø§ Ø£Ùˆ Ø§Ù„Ø§Ø¯Ø¹Ø§Ø¡ Ø¨Ø§Ù„Ù†Ø¬Ø§Ø­.

### Ù‚ÙˆØ§Ø¹Ø¯ Ù…Ø³ØªÙØ§Ø¯Ø© Ù…Ù† JumpCut ÙˆSoundBuddy ÙÙŠ Auto Zoom
- Ù„Ø§ ÙŠÙÙ†Ù‚Ù„ ÙƒÙˆØ¯ JumpCut (GPL-3.0) Ø£Ùˆ SoundBuddy Studio (AGPL-3.0) Ø¥Ù„Ù‰ Saad Studio. Ø§Ù„Ù…Ø³Ù…ÙˆØ­ Ù‡Ùˆ Ø¥Ø¹Ø§Ø¯Ø© ØªÙ†ÙÙŠØ° Ù…Ø¨Ø¯Ø£ Ø¹Ø§Ù… Ø¨ØµÙˆØ±Ø© Ù…Ø³ØªÙ‚Ù„Ø© Ù…Ø¹ fixture ÙˆRuntime Proof.
- Ø²Ù…Ù† Ø§Ù†ØªÙ‚Ø§Ù„ Ø§Ù„Ù‚ØµÙŠØ± Ù„Ø§ ÙŠÙØ«Ø¨Øª Ø¹Ù„Ù‰ 30fpsØ› ØªÙÙ‚Ø±Ø£ Ù…Ø¯Ø© Ø§Ù„ÙØ±ÙŠÙ… Ù…Ù† `Sequence.timebase`ØŒ Ø«Ù… Ù…Ù† `Sequence.getSettings().videoFrameRate`ØŒ Ù…Ø¹ fallback 25fps Ù„Ù„Ù…Ø¶ÙŠÙ Ø§Ù„Ù…Ø³ØªÙ‡Ø¯Ù.
- Ø§Ø³ØªØ¯Ø¹Ø§Ø¡ `addKey` Ùˆ`setValueAtKey` Ù„ÙŠØ³ Ø¥Ø«Ø¨Ø§Øª Ù†Ø¬Ø§Ø­. Ø¥Ø°Ø§ ÙƒØ§Ù† `ComponentParam.getKeys()` Ù…ØªØ§Ø­Ø§Ù‹ØŒ ÙŠØ¬Ø¨ Ø£Ù† ØªØ­ØªÙˆÙŠ Ø§Ù„Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ù„Ø§Ø­Ù‚Ø© ÙƒÙ„ Ø§Ù„Ø£Ø²Ù…Ù†Ø© Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø© Ø¶Ù…Ù† Ø³Ù…Ø§Ø­ÙŠØ© 0.002 Ø«Ø§Ù†ÙŠØ©Ø› ÙˆØ¥Ù„Ø§ ÙŠÙØ¹Ø¯ Ø§Ù„Ø­Ø¯Ø« ÙØ§Ø´Ù„Ø§Ù‹ ÙˆÙ„Ø§ ÙŠØ²Ø§Ø¯ `effectsApplied`.
- Beat tracking Ø§Ù„Ù…ÙˆØ³ÙŠÙ‚ÙŠ (Ù…Ø«Ù„ `librosa.beat.beat_track` in SoundBuddy) Ù„ÙŠØ³ Ø¨Ø¯ÙŠÙ„Ø§Ù‹ Ù…Ø«Ø¨ØªØ§Ù‹ Ù„Ù€Speech Emphasis. Ù„Ø§ ÙŠÙØ³ØªØ®Ø¯Ù… Ù„ØªÙˆÙ‚ÙŠØª Zoom Ù„Ù„Ø¨ÙˆØ¯ÙƒØ§Ø³Øª Ù…Ù† Ø¯ÙˆÙ† Ù†Ù…ÙˆØ°Ø¬/fixture ØµÙˆØª ÙƒÙ„Ø§Ù… ÙˆÙ…Ø¹ÙŠØ§Ø± Ù‚Ø¨ÙˆÙ„ Ù…Ù†ÙØµÙ„.

### Ø¥Ø«Ø¨Ø§Øª Ù‚ÙŠÙ…Ø© Auto Zoom ÙˆØ§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø©
- `ComponentParam.getKeys()` ÙŠØ«Ø¨Øª Ø§Ù„Ø£Ø²Ù…Ù†Ø© ÙÙ‚Ø·. Ø¹Ù†Ø¯ ØªÙˆÙØ± `getValueAtKey` Ø£Ùˆ `getValueAtTime` ÙŠØ¬Ø¨ Ù…Ù‚Ø§Ø±Ù†Ø© Ù‚ÙŠÙ…Ø© ÙƒÙ„ Ù…ÙØªØ§Ø­ Ø¨Ø§Ù„Ù‚ÙŠÙ…Ø© Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø©Ø› ÙˆØ¬ÙˆØ¯ Ù…ÙØ§ØªÙŠØ­ ÙƒÙ„Ù‡Ø§ Ø¹Ù„Ù‰ Scale Ø§Ù„Ø£ØµÙ„ÙŠ Ù„ÙŠØ³ Zoom Ù†Ø§Ø¬Ø­Ø§Ù‹.
- Ø¨Ø¹Ø¯ ØªØ·Ø¨ÙŠÙ‚ Ù†Ø§Ø¬Ø­ ÙŠÙÙ†Ù‚Ù„ Player Position ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ Ø¥Ù„Ù‰ Ø°Ø±ÙˆØ© Ø£ÙˆÙ„ Ø­Ø¯Ø« Zoom. Ù‡Ø°Ù‡ Ù…Ø¹Ø§ÙŠÙ†Ø© Ø¢Ù„ÙŠØ© Ù„Ø§ ØªØ¯Ø®Ù„ ÙŠØ¯ÙˆÙŠØŒ ÙˆØªÙ…Ù†Ø¹ Ø§Ø®ØªØ¨Ø§Ø± Ø§Ù„Ù†ØªÙŠØ¬Ø© Ø¹Ù†Ø¯ Ù…ÙˆØ¶Ø¹ Ø¨Ø¹ÙŠØ¯ Ø¹Ù† Ù†Ø§ÙØ°Ø© Ø§Ù„Ø²ÙˆÙ… Ø§Ù„Ù‚ØµÙŠØ±Ø©.
- Ø±Ø³Ø§Ù„Ø© Ø§Ù„Ù†Ø¬Ø§Ø­ ØªØ¹Ø±Ø¶ Ø£Ø²Ù…Ù†Ø© Ø§Ù„Ø£Ø­Ø¯Ø§Ø« Ø§Ù„ØªÙŠ Ø·ÙØ¨Ù‚Øª ÙØ¹Ù„ÙŠØ§Ù‹. Ù„Ø§ ÙŠÙØ¹Ø±Ø¶ `effectsApplied > 0` Ø¥Ø°Ø§ ÙØ´Ù„ readback Ù„Ù„Ø²Ù…Ù† Ø£Ùˆ Ø§Ù„Ù‚ÙŠÙ…Ø©.

### ØªØ­ÙˆÙŠÙ„ Ø²Ù…Ù† Ù…Ø¹Ø§ÙŠÙ†Ø© Auto Zoom
- Ø£Ø²Ù…Ù†Ø© Ù‚Ø±Ø§Ø±Ø§Øª Auto Zoom ÙˆÙ…ÙØ§ØªÙŠØ­ Motion Scale Ù‡ÙŠ Ø£Ø²Ù…Ù†Ø© Timeline. Ø£Ù…Ø§ `Sequence.setPlayerPosition()` ÙÙŠØªØ£Ø«Ø± Ø¨Ù€`Sequence.zeroPoint`Ø› Ù„Ø°Ù„Ùƒ Ù„Ø§ ÙŠØ¬ÙˆØ² ØªÙ…Ø±ÙŠØ± ticks Ø§Ù„Ù…Ø­Ø³ÙˆØ¨Ø© Ù…Ù† Ø²Ù…Ù† Timeline Ù…Ø¨Ø§Ø´Ø±Ø© Ø¹Ù†Ø¯Ù…Ø§ ØªÙƒÙˆÙ† Ù†Ù‚Ø·Ø© Ø§Ù„ØµÙØ± ØºÙŠØ± ØµÙØ±ÙŠØ©.
- Ù…ÙˆØ¶Ø¹ Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø© ÙŠÙØ­Ø³Ø¨ Ù‡ÙƒØ°Ø§: `playerTicks = max(0, timelineTicks - zeroPointTicks)`. ÙŠØ·Ø¨Ù‚ Ù‡Ø°Ø§ Ø§Ù„ØªØ­ÙˆÙŠÙ„ Ø¹Ù„Ù‰ ØªØ­Ø±ÙŠÙƒ Ø±Ø£Ø³ Ø§Ù„ØªØ´ØºÙŠÙ„ Ù„Ù„Ù…Ø¹Ø§ÙŠÙ†Ø© ÙÙ‚Ø·ØŒ ÙˆÙ„Ø§ ÙŠÙØ·Ø±Ø­ zero point Ù…Ù† Ø£Ø²Ù…Ù†Ø© Ù…ÙØ§ØªÙŠØ­ Scale.
- Ø¸Ù‡ÙˆØ± Scale=100 ÙÙŠ Effect Controls Ø®Ø§Ø±Ø¬ Ù†Ø§ÙØ°Ø© Ø§Ù„Ø²ÙˆÙ… Ù„Ø§ ÙŠØ«Ø¨Øª ÙØ´Ù„ Ø§Ù„ÙƒØªØ§Ø¨Ø©. Ø§Ù„Ø¥Ø«Ø¨Ø§Øª Ø§Ù„ØµØ­ÙŠØ­ ÙŠÙƒÙˆÙ† Ø¹Ù†Ø¯ Ø°Ø±ÙˆØ© Ø­Ø¯Ø« Ù…Ø·Ø¨Ù‚ ÙˆØ¨Ø¹Ø¯ Ù†Ø¬Ø§Ø­ readback Ù„Ù„Ø£Ø²Ù…Ù†Ø© ÙˆØ§Ù„Ù‚ÙŠÙ….
- Ù†Ù‚Ù„ Player Position Ù„Ø§ ÙŠØºÙŠØ± Ø§Ù„Ù…Ù‚Ø·Ø¹ Ø§Ù„Ù…Ø­Ø¯Ø¯ ÙÙŠ Premiere. Ù„ÙƒÙŠ ØªÙƒÙˆÙ† Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø© Ø§Ù„Ø¢Ù„ÙŠØ© ØµØ§Ø¯Ù‚Ø©ØŒ ÙŠØ¬Ø¨ Ø£Ù† ØªØ­Ø¯Ø¯ Ø§Ù„Ø£Ø¯Ø§Ø© TrackItem ØµØ§Ø­Ø¨ Ø§Ù„Ø­Ø¯Ø« Ø¨Ø¹Ø¯ Ø§Ù„Ù†Ù‚Ù„Ø› ÙˆØ¥Ù„Ø§ Ù‚Ø¯ ÙŠØ¹Ø±Ø¶ Effect Controls Ø§Ù„Ù…Ù‚Ø·Ø¹ Ø§Ù„Ø³Ø§Ø¨Ù‚ Ø¹Ù†Ø¯ Ø­Ø¯ Ø§Ù„Ù‚Ø·Ø¹ Ø±ØºÙ… ÙˆØ¬ÙˆØ¯ Ø§Ù„Ù…ÙØ§ØªÙŠØ­ Ø¹Ù„Ù‰ Ø§Ù„Ù…Ù‚Ø·Ø¹ Ø§Ù„ØªØ§Ù„ÙŠ.

### Ø­ÙØ¸ Ø§Ù„Ù€ Mappings ÙˆØ§Ù„Ù€ Fallback ÙÙŠ Auto Zoom (2026-06-20)
- Ø§Ù„Ù€ sequence watcher Ù„Ø§ ÙŠÙ‚ÙˆÙ… Ø¨Ù…Ø³Ø­ state.mappings Ø¹Ù†Ø¯ Ø§Ù„Ø§Ù†ØªÙ‚Ø§Ù„ Ù…Ù† Ø§Ù„Ù€ source sequence Ø¥Ù„Ù‰ Ø§Ù„Ù€ Draft sequence Ø§Ù„Ù†Ø§ØªØ¬ Ù…Ù†Ù‡Ø§ (e.g. Synced Sequence - Saad Auto Switch Draft).
- ÙÙŠ Ø­Ø§Ù„ ÙƒØ§Ù† Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„ÙƒØ§Ù…ÙŠØ±Ø§ Ø§Ù„Ø¹Ø§Ù…Ø© (Wide) ØºÙŠØ± Ù…Ø­Ø¯Ø¯ (null) ÙÙŠ Ø§Ù„Ù€ mappingsØŒ ÙŠÙ‚ÙˆÙ… Ø§Ù„Ù€ Auto Zoom ØªÙ„Ù‚Ø§Ø¦ÙŠÙ‹Ø§ Ø¨Ø§Ø³ØªØ¨Ø¹Ø§Ø¯ Ø§Ù„Ù…Ø³Ø§Ø± 0 (V1) ÙƒÙ€ fallback Ø§ÙØªØ±Ø§Ø¶ÙŠ Ù„Ø­Ù…Ø§ÙŠØ© Ø§Ù„Ù„Ù‚Ø·Ø§Øª Ø§Ù„Ø¹Ø§Ù…Ø© Ù…Ù† Ø§Ù„Ø²ÙˆÙ…Ø§Øª Ø§Ù„Ø¹Ø´ÙˆØ§Ø¦ÙŠØ©.

### Ø¯Ø¹Ù… Ø§Ù„Ù„ØºØ§Øª ÙˆØ¥Ø²Ø§Ù„Ø© Ø§Ù„ÙƒÙŠ ÙØ±ÙŠÙ…Ø² Ø§Ù„Ø¹Ø´ÙˆØ§Ø¦ÙŠØ© Ù„Ù„Ù€ Playhead ÙÙŠ Auto Zoom (2026-06-20)
- Ø¯Ø§Ù„Ø© `findAutoZoomTransformComponent` ØªØ¬Ù…Ø¹ Ø§Ù„Ø¢Ù† `matchName` Ùˆ`displayName` Ù…Ø¹Ø§Ù‹ Ù„Ø¶Ù…Ø§Ù† Ø§ÙƒØªØ´Ø§Ù ØªØ£Ø«ÙŠØ± Transform ØªØ­Øª Ø£ÙŠ Ù„ØºØ© ÙˆØ§Ø¬Ù‡Ø© (Ù…Ø«Ù„ Ø§Ù„Ø¹Ø±Ø¨ÙŠØ© "ØªØ­ÙˆÙŠÙ„").
- Ø¯Ø§Ù„Ø© `findAutoZoomMotionScaleProperty` ØªØ·Ø§Ø¨Ù‚ Ø®Ø§ØµÙŠØ© Ø§Ù„Ù…Ù‚ÙŠØ§Ø³ Ø¨Ø§Ù„Ø§Ø³Ù… Ø§Ù„Ø«Ø§Ø¨Øª `"ADBE Motion Scale"` Ø¨Ø¬Ø§Ù†Ø¨ Ø§Ù„Ø£Ø³Ù…Ø§Ø¡ Ø§Ù„Ø§ÙØªØ±Ø§Ø¶ÙŠØ©.
- Ù„ØªÙØ§Ø¯ÙŠ Ø§Ù„ÙƒÙŠ ÙØ±ÙŠÙ…Ø² Ø§Ù„Ø¹Ø´ÙˆØ§Ø¦ÙŠØ© Ø§Ù„ØªÙŠ ÙŠØ¶Ø¹Ù‡Ø§ Premiere ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ Ø¹Ù†Ø¯ Ù…ÙˆØ¶Ø¹ Ø§Ù„Ù€ playhead Ø§Ù„Ø­Ø§Ù„ÙŠ Ø¹Ù†Ø¯ ØªØ´ØºÙŠÙ„ Ø§Ù„Ø³Ø§Ø¹Ø© `setTimeVarying(true)`ØŒ ÙŠØªÙ… Ø§Ø³ØªØ¯Ø¹Ø§Ø¡ `removeKeyRange` Ø¹Ù„Ù‰ Ù†Ø·Ø§Ù‚ Ø§Ù„Ù…Ù‚Ø·Ø¹ ÙƒØ§Ù…Ù„Ø§Ù‹ Ù„ØªÙ†Ø¸ÙŠÙ Ø§Ù„Ø®ØµØ§Ø¦Øµ Ù‚Ø¨Ù„ ÙƒØªØ§Ø¨Ø© Ù…ÙØ§ØªÙŠØ­ Ø§Ù„Ø²ÙˆÙ… Ø§Ù„ÙØ¹Ø§Ù„Ø©.

### Ù‚Ø§Ø¹Ø¯Ø© Synchronize Duplicate-only (2026-06-26)
- Ù…Ø³Ø§Ø± Apply Sync Ù„Ø§ ÙŠØ·Ø¨Ù‚ Ø§Ù„Ø¥Ø²Ø§Ø­Ø§Øª Ø¹Ù„Ù‰ Ø§Ù„Ù€ Original Sequence Ù†Ù‡Ø§Ø¦ÙŠØ§Ù‹. ÙŠØ¬Ø¨ ØªÙ†Ø´ÙŠØ· Ø§Ù„Ø³ÙˆØ±Ø³ØŒ Ø¥Ù†Ø´Ø§Ø¡ Ù†Ø³Ø®Ø© `Saad Sync Draft`ØŒ Ø«Ù… ØªÙ†Ø´ÙŠØ· Ø§Ù„Ù†Ø³Ø®Ø© ÙˆØªØ·Ø¨ÙŠÙ‚ Ø§Ù„Ø¥Ø²Ø§Ø­Ø§Øª Ø¹Ù„ÙŠÙ‡Ø§ ÙÙ‚Ø·.
- ÙŠØ¬Ø¨ Ø§Ù„Ø­ÙØ§Ø¸ Ø¹Ù„Ù‰ Timeline Scanner ÙˆAudio Analysis ÙˆPairwise Correlation ÙˆSync Graph ÙˆFine Alignment ÙˆValidation ÙƒØ·Ø¨Ù‚Ø§Øª Ù…Ø³ØªÙ‚Ù„Ø©Ø› ØªØºÙŠÙŠØ± Ø³ÙŠØ± Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ Ù„Ø§ ÙŠØ¹Ù†ÙŠ Ø¥Ø¹Ø§Ø¯Ø© ÙƒØªØ§Ø¨Ø© Ù…Ø­Ø±Ùƒ Ø§Ù„ØªØ­Ù„ÙŠÙ„.
- Ø¹Ù†Ø¯ ØªØ­Ø±ÙŠÙƒ Ù…Ù‚Ø·Ø¹ Ø¯Ø§Ø®Ù„ Ø§Ù„Ù†Ø³Ø®Ø©ØŒ ÙŠØ¬Ø¨ Ø§Ù„Ø­ÙØ§Ø¸ Ø¹Ù„Ù‰ Ø§Ù„Ø¹Ù„Ø§Ù‚Ø§Øª Ø§Ù„Ù…Ø±ØªØ¨Ø·Ø© Ø¨ÙŠÙ† Ø§Ù„ÙÙŠØ¯ÙŠÙˆ ÙˆØ§Ù„ØµÙˆØª Ø¹Ø¨Ø± Ù…Ù†Ø·Ù‚ linked items ÙÙŠ JSX ÙˆØ¹Ø¯Ù… ØªØ­Ø±ÙŠÙƒ Ø§Ù„Ø¹Ù†ØµØ± Ù†ÙØ³Ù‡ Ø£ÙƒØ«Ø± Ù…Ù† Ù…Ø±Ø©.
- Ø¨Ø¹Ø¯ Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ØŒ ÙŠØ¬Ø¨ Ø¥Ø¹Ø§Ø¯Ø© ÙØ­Øµ Ø§Ù„Ù†Ø³Ø®Ø© Ø§Ù„Ù†Ø§ØªØ¬Ø© ÙˆØ¥Ù†ØªØ§Ø¬ ØªÙ‚Ø±ÙŠØ± ÙŠØ­ØªÙˆÙŠ: Ø§Ø³Ù…/Ù…Ø¹Ø±Ù Ø§Ù„Ø£ØµÙ„ØŒ Ø§Ø³Ù…/Ù…Ø¹Ø±Ù Ø§Ù„Ù†Ø³Ø®Ø©ØŒ Ø¹Ø¯Ø¯ Ø§Ù„Ø¥Ø²Ø§Ø­Ø§ØªØŒ Ø¹Ø¯Ø¯ Ø§Ù„Ù…Ù‚Ø§Ø·Ø¹ Ø§Ù„Ù…Ø­Ø±ÙƒØ©ØŒ Ø£ÙƒØ¨Ø± Ø§Ù†Ø­Ø±Ø§Ù Ù‚Ø¨Ù„/Ø¨Ø¹Ø¯ØŒ Ø§Ù„ØªØ­Ø°ÙŠØ±Ø§ØªØŒ ÙˆØ§Ù„Ù€ blockers.
- Ø¥Ø°Ø§ ÙƒØ§Ù†Øª Ø§Ù„Ù…Ù‚Ø§Ø·Ø¹ Ù…ØªØ²Ø§Ù…Ù†Ø© Ù…Ø³Ø¨Ù‚Ø§Ù‹ Ø¶Ù…Ù† Ø§Ù„Ø³Ù…Ø§Ø­ÙŠØ©ØŒ ØªÙ†Ø´Ø£ Ù†Ø³Ø®Ø© Ø£ÙŠØ¶Ø§Ù‹ ÙˆØªØ¹ÙˆØ¯ Ø§Ù„Ø­Ø§Ù„Ø© `already-synced` Ø¨Ø¯ÙˆÙ† ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ø£ØµÙ„.
- Ù„Ø§ ØªØ¹ØªØ¨Ø± Ø§Ù„Ø¹Ù…Ù„ÙŠØ© Ù†Ø§Ø¬Ø­Ø© Ø¥Ù†ØªØ§Ø¬ÙŠØ§Ù‹ Ø¥Ø°Ø§ ÙØ´Ù„ Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ù†Ø³Ø®Ø©ØŒ Ø£Ùˆ ÙØ´Ù„ ØªÙ†Ø´ÙŠØ·Ù‡Ø§ØŒ Ø£Ùˆ Ù„Ù… ÙŠØ«Ø¨Øª Ø§Ù„ØªØ­Ù‚Ù‚ Ø§Ù„Ù†Ù‡Ø§Ø¦ÙŠ Ø£Ù† Ø£ÙƒØ¨Ø± Ø§Ù†Ø­Ø±Ø§Ù Ø¨Ø¹Ø¯ Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ Ø¶Ù…Ù† Ø§Ù„Ø³Ù…Ø§Ø­ÙŠØ©.

## Saad Agent Settings Runtime Wiring (2026-06-28)

- Settings is now a functional management center, not a static preferences mock. The approved sections remain unchanged, but each visible section must either save real data, manage runtime behavior, or stay developer-gated until implementation.
- `SettingsManager` owns the persisted application schema under `.saad-agent/settings.json`. Provider records store metadata only: id, name, type, endpoint URL, organization, enabled flag, default flag, priority, fallback provider, health status, latency, last tested timestamp, and `apiKeySecretRef`.
- Provider API keys are never written to Settings JSON. Secrets are stored through encrypted secret storage under the runtime `.saad-agent/secrets/` area and Settings keeps only the reference id.
- Model role configuration for Coding, Vision, Reviewer, and Fast is applied at runtime by `ReasoningEngine` and `ModelClient`. The applied values include provider, model name, temperature, max output tokens, streaming, timeout, and retry count.
- Context window is not a user-editable Settings value. It is displayed as detected/read-only model metadata and should be refreshed by provider/model discovery logic in future work.
- Provider Test Connection must call the backend and perform a real request to the provider models endpoint. The UI displays online/offline, latency, error, and last-tested timestamp from that backend result.
- Domain Skills is now a Skill Manager. Built-in skills may be viewed and enabled/disabled but cannot be deleted. Custom skills may be created, imported from JSON/folder manifests, edited, saved, removed, and reloaded.
- Custom skill manifests are data-only. Reject manifests containing credential-like fields, executable code markers, unsafe commands, direct filesystem write behavior, or secrets.
- Disabled skills must not be matched by `SkillRegistry.matchSkillsForTask`; therefore the Context Engine cannot inject disabled skill guidance into retrieved context.

## Saad Agent Chat Layout Overflow Rule (2026-06-28)

- The desktop chat viewport must not create horizontal movement. Chat, input, message, card, and attachment containers should use `min-width: 0`, `max-width: 100%`, and horizontal overflow guards where needed.
- Vision reports and other tables must wrap inside the card using fixed table layout or equivalent responsive behavior instead of widening the conversation column.
- Uploaded screenshots and sent attachment previews must scale down to the available message width.
- On narrow windows, side panels may be hidden and chat/input padding reduced to preserve a stable single-column conversation area.
## Saad Agent Settings product honesty update (2026-06-28)

- The packaged desktop app must expose Settings runtime APIs through the CJS preload file copied by the build script. `preload.ts` and `preload.cjs` must stay functionally aligned for Settings IPC.
- Settings pages must not display fake management data. If a backend bridge, registry, or discovery source is unavailable, the page must show an explicit unavailable/empty state.
- Model role controls use labeled responsive fields. Provider dropdowns are populated only from persisted provider configuration, and context window remains read-only detected metadata.
- Built-in skills are viewable and can be enabled or disabled, but their manifest fields are read-only in Settings. Custom skills remain editable/importable/removable after validation.
- MCP Settings must show registered/discovered MCP servers and tools only. Demo seeded servers/tools are not allowed in the product UI; an empty registry is shown as an honest empty state.
## Saad Agent Settings unwired-section rule (2026-06-28)

- Production Settings navigation must not expose sections whose controls only persist JSON without changing runtime behavior.
- Unwired sections must stay hidden from the normal Settings sidebar until each section has backend/runtime integration and verification tests.
- Creative AI must not be presented as production-ready while providers generate placeholder assets.
- Vision, Knowledge, Execution, Security, Tools, Connectors, Backups, Diagnostics, and Advanced settings require verified runtime consumers before returning to the production Settings UI.
## Saad Agent Models management production workflow (2026-06-28)

- Models Settings must be provider-driven. Users should not manually type model ids for configured providers.
- Provider defaults must always be available and merged with persisted user settings: LM Studio, Ollama, OpenAI, Anthropic, Gemini, OpenRouter, and Saad Studio.
- LM Studio and OpenAI-compatible providers use `GET /v1/models` for discovery. The discovered list is stored on the provider record with model count, last discovery timestamp, latency, last successful connection, and optional context-window metadata.
- Model role selection for Coding, Vision, Reviewer, and Fast must use discovered model choices. Context window remains detected/read-only.
- The Models page must expose Test Connection and Discover / Fetch Models and show live provider health, latency, last successful connection, and discovered model count.
- `ReasoningEngine` must consume the selected persisted role/provider/model from `SettingsManager`, and `ModelClient` must tolerate local OpenAI-compatible providers that reject `response_format` by retrying without it.
- Verified runtime on the local test machine: LM Studio at `http://127.0.0.1:1234/v1` returned 6 models; Coding was persisted as `lm-studio` / `qwen/qwen3-coder-30b`; a real inference request returned valid JSON.
## Saad Agent main interface product honesty rule (2026-06-28)

- The desktop main interface must not render mock conversations, fake model names, static maintenance chats, static orchestration status, or static provider-management notifications as production data.
- The main interface is limited to productivity surfaces: Chat, active Workspace, Attachments, real Running Tasks, real Current Models, and real Notifications.
- Current Models must be read from persisted `SettingsManager` model role/provider configuration via the Electron settings bridge. If no real model configuration is available, the card is hidden.
- Running Tasks and Multi-Agent content must be hidden unless real runtime session/agent data exists.
- Project intelligence, diagnostics, provider management, MCP, memory, backup, advanced controls, and other engineering internals belong in Settings or diagnostics views, not permanently in the main workspace.
## Saad Agent chat viewport hard horizontal lock (2026-06-28)

- The desktop chat viewport must never move horizontally or expose a horizontal scrollbar.
- Message rows must account for fixed avatar width plus gap; the content column should not use `max-width: 100%` in a way that makes avatar + gap + content exceed the viewport.
- Engineering cards, analysis grids, plan steps, code/diff previews, images, tables, attachment previews, and input controls must remain inside the available chat width.
- Wide text and code should wrap inside cards. Production chat should prefer wrapping/clipping over horizontal scrolling.
## Saad Agent Settings visible-controls honesty rule (2026-06-28)

- Production Settings must not expose user-facing fields that only persist JSON without complete runtime behavior.
- The General preferences page is hidden until theme switching, localization, and startup behavior are implemented and verified end to end.
- Opening Settings with a General target should route to the first real production settings module, currently Workspace.
- Persisted schema compatibility may remain internal, but hidden fields must not appear in the product UI.
## Saad Agent Settings modal scrolling behavior (2026-06-28)

- Settings is a fixed desktop modal, but long management pages must remain fully usable on smaller windows.
- The modal must be constrained to the viewport and must not clip Models, Skills, Providers, or other long pages.
- The content pane owns vertical scrolling; grid and flex parents must use `minHeight: 0`/`minmax(0, 1fr)` so Electron does not expand content beyond the visible window.
- Settings pages should not require horizontal movement or hidden off-screen controls to reach Save, Reload, model role fields, or skill details.
## Saad Agent MCP Manager behavior (2026-06-28)

- MCP Settings is a production MCP Manager, not a placeholder registry view.
- MCP servers are persisted in `SettingsManager` with transport, command/endpoint, args, cwd, non-secret env vars, enabled state, auto-start, auto-reconnect, permissions, health metadata, discovered tools/resources/prompts, and communication logs.
- Discovery must run the MCP JSON-RPC sequence for enabled servers: `initialize`, `tools/list`, `resources/list`, `prompts/list`.
- STDIO MCP servers are launched as hidden child processes and communicate over JSON-RPC lines. HTTP/SSE entries are treated as JSON-RPC HTTP endpoints for this implementation.
- The UI must support Add MCP Server, Test Connection before save, Configure, Enable/Disable, Restart, Remove, tool permission modes (`Always Allow`, `Ask Every Time`, `Never Allow`), resource inspection, prompt listing, health status, and logs.
- LM Studio is not an MCP server and must never be managed from MCP Settings. It belongs in Settings -> Providers with endpoint, API key if needed, Test Connection, Fetch Models, and model role assignment.
- MCP environment variables in Settings must not contain API keys, tokens, passwords, cookies, credentials, or secrets. Secret-like values are rejected.
## Saad Agent Composer behavior (2026-06-28)

- The chat composer is the runtime command center for active work, while Settings remains the permanent configuration center.
- Composer runtime selections may include active provider/model, workspace, agent, skill, MCP tool, and quick action. These are temporary and must not overwrite Settings.
- The text box starts as a single-line input and grows upward only because of typed text. It keeps fixed width, caps around 250-300px, then uses internal scrolling.
- Attachments must not increase composer height. Images, PDFs, videos, documents, and folders appear as compact chips or thumbnails above the composer.
- Image attachments use small thumbnails only; large previews belong in message history or a separate preview, not inside the input height.
- Queued image attachments in the composer must not show persistent filename/size details inside the prompt box. They render as thumbnail-only items with a remove control; metadata may remain available through hover/title or sent-message history.
- The composer must remain anchored at the bottom and must not create horizontal movement.
- Queued attachments may render inside the prompt box as compact fixed-size previews when the user explicitly wants inline prompt context. They must remain bounded and must not create horizontal movement.
- The composer must not expose a microphone/voice control unless real voice input is implemented. Upload controls should render with stable text/icon assets that do not depend on fragile emoji glyphs.
## Saad Agent conversation pages behavior (2026-06-29)

- The desktop chat supports multiple local conversation pages so the user can separate topics instead of mixing all work in one stream.
- Conversation pages are persisted in renderer `localStorage` with active page restoration, title, timestamps, optional workspace metadata, and messages.
- A new conversation starts empty and becomes titled automatically from the first user message unless the user manually renames it.
- Each conversation can be renamed from the sidebar and deleted after explicit confirmation. Deleting the final conversation creates a replacement empty page.
- Message rendering must always be scoped to the active conversation page.
- This is local desktop UI organization only; provider secrets, API keys, credentials, and runtime secrets must never be stored in conversation page data.

## Saad Agent chat message rendering behavior (2026-06-29)

- Chat message UI may use professional AI component patterns for structure, but must not import demo content, fake tools, fake packages, fake agents, or placeholder cards into production chat.
- Message actions must operate on real message data. Copy copies the visible message text plus real attachment/card metadata labels.
- Sent attachments render as compact, bounded cards or thumbnails and must not create horizontal scrolling or resize the composer.
- Attachment labels must describe real metadata only; do not show placeholder wording for files that were actually attached.
- Agent/tool/artifact style cards should appear only when backed by existing runtime `cardType`/`cardData` or real backend events.

## Saad Agent v6.5 cognitive architecture and knowledge ingestion (2026-06-29)

- The complete v6.5 architecture diagrams are recorded in `saad-agent/docs/saad-agent-v6.5-architecture.md` as Mermaid diagrams for:
  - Cognitive & Multi-Layer RAG Engine.
  - 11-Step Automated Workflow.
  - Continuous Self-Healing Pipeline.
- The implemented service inventory includes `intent-engine.ts`, `cognitive-orchestrator.ts`, `tool-orchestrator.ts`, `operational-skill-pipeline.ts`, `execution-engine.ts`, `validation-pipeline.ts`, `recovery-engine.ts`, `execution-history.ts`, `brave-answers.ts`, `workspace-watcher.ts`, `settings-manager.ts`, `secrets-manager.ts`, and `knowledge-ingestion.ts`.
- `IntentEngine` now prioritizes local engineering/code/debugging requests before web/latest-documentation routing, so framework names such as Next.js do not automatically force internet search when the user is clearly asking to create or modify code.
- Image-link/search requests route to `image_search`; explicit web search remains `web_search`; latest/current external knowledge remains `internet_answers`.
- `KnowledgeIngestionService` performs local chunking plus deterministic vector-style indexing into `.saad-agent/knowledge/vector-index.json`. This gives durable semantic retrieval without external services.
- `ContextEngine` retrieves `knowledge:*` candidates from the local knowledge index in addition to architecture, dependency graph, project summary, skills, engineering memory, source files, and attachment metadata.
- `VisionAnalyzer` stores scrubbed image-analysis summaries into the durable knowledge index so later related prompts can retrieve prior visual findings.
- Security boundary: this is knowledge retrieval, not model fine-tuning. The agent does not train model weights. Sensitive files, `.env`, credentials, API keys, tokens, cookies, passwords, secret storage, and secret-like values must remain excluded from indexing, memory, diagnostics, and context retrieval.

## Saad Agent direct chat runtime behavior (2026-06-29)

- Normal composer messages use the `chat-complete` IPC path and must return either a direct model reply or a visible error message in the chat.
- The UI must show an interim `Thinking with the active model...` message while waiting for the backend so provider/runtime failures do not appear as silence.
- Direct chat uses `ReasoningEngine.requestCompletion` with the Coding role and short retrieved Context Engine snippets. It must not claim file edits unless an execution tool actually changed files.
- OpenAI-compatible local providers are called with `stream: false` until the renderer implements real SSE streaming parsing. Persisted `streaming: true` settings must not break JSON response parsing.
- LM Studio endpoints are normalized for runtime use: `localhost` becomes `127.0.0.1`, and the standard local server `127.0.0.1:1234` is treated as `http://127.0.0.1:1234/v1`.
- LM Studio 0.4.18 Developer API is supported as a first-class local runtime: model discovery tries `GET /api/v1/models`, and chat tries `POST /api/v1/chat` with the required `input` payload before falling back to OpenAI-compatible `/v1/chat/completions`.
- LM Studio Developer API requests must not include unsupported OpenAI-only fields such as `response_format` or `max_tokens` on `/api/v1/chat`. If a provider returns HTTP 200 without extractable message content, the runtime treats it as a provider failure instead of showing silent success.
- If LM Studio is closed, the local server is not started, or the selected model id is not loaded, the chat must show the actual provider error instead of silently doing nothing.

## Saad Agent packaged UI loading rule (2026-06-29)

- Packaged Electron builds load the Vite renderer from `ui/dist/index.html` inside `app.asar`.
- Manual ASAR refresh scripts must copy `ui/dist` to `ui/dist` inside the archive. Copying the contents directly to `ui/` can produce a blank renderer window.
- `desktop/main.ts` should tolerate both `ui/dist/index.html` and `ui/index.html`, but the production package structure remains `ui/dist/**`.

## Saad Agent Providers persistence behavior (2026-06-29)

- Providers and Models settings are global application runtime configuration. They must persist under the Electron application data root, not under the active workspace.
- `main.ts` sets `SAAD_AGENT_SETTINGS_ROOT` to `app.getPath("userData")` before the Settings backend is used.
- `SettingsManager` migrates legacy workspace `.saad-agent/settings.json` into the global settings root when the global file does not exist.
- Provider form edits use an explicit `Save Provider` action. Test Connection, Set Default, Add, Remove, Discover Models, and API key save remain backend operations.
- API keys still use encrypted secret references only; Provider JSON stores metadata and `apiKeySecretRef`, never raw secrets.

## Saad Agent Training Knowledge and Pre-Answer Review (2026-06-29)

- The agent supports a dedicated training knowledge folder at `.saad-agent/training/` with these enforced subfolders:
  - `books/`
  - `maps/`
  - `diagrams/`
  - `screenshots/`
  - `api-docs/`
  - `project-docs/`
  - `ui-references/`
  - `code-examples/`
  - `lessons/`
- Training knowledge is stored as retrieval memory, not model fine-tuning. The agent does not modify model weights.
- `KnowledgeIngestionService` scans the training folders, extracts readable text for text/code/Markdown/JSON files, chunks and indexes the content into `.saad-agent/knowledge/vector-index.json`, and maintains `.saad-agent/knowledge/registry.json`.
- `ProjectIntelligenceService` watches `.saad-agent/training/` as a special allowed `.saad-agent` path and re-runs training ingestion when training files are added, modified, or deleted.
- Registry entries include file name, type, category, summary, tags, added date, indexed status, chunk count, embedding status, and last used date.
- Image, screenshot, diagram, map, and PDF files are registered safely as metadata-only until a real OCR, vision summary, or PDF extractor provides readable text. The system must not pretend OCR happened when it did not.
- `PreAnswerReviewService` is the mandatory direct-chat gate before model invocation:
  - Detect intent.
  - Load conversation/request context available to the backend.
  - Load project rules from `AGENTS.md` and `PROJECT_CONTEXT.md`.
  - Load ADR/decision context from Engineering Memory.
  - Search training knowledge.
  - Search the existing project Context Engine separately in the direct chat path.
  - Load matching enabled skills.
  - Build the final context.
  - Then call the configured model.
- Direct chat replies must show compact diagnostics before the answer:
  - `Memory: loaded`
  - `Training Knowledge: searched`
  - `Knowledge matches: X`
  - `Skills: loaded`
  - `Project context: loaded/skipped`
  - `Final context built: yes`
- If no training file matches, chat must explicitly say: `No matching trained knowledge found. Answering from model knowledge only.`
- Asking what trained knowledge was used should return the matched files and summaries from the registry/retrieval result.
- Sensitive files and secret-looking values remain excluded or scrubbed. `.env`, credentials, API keys, tokens, cookies, passwords, encrypted secret storage, and secret-like values must not be stored in registry, logs, diagnostics, or retrieved context.

## Saad Agent Direct Chat Orchestration Gate (2026-06-30)

- Direct composer messages must pass through `ChatOrchestratorService` before any model call.
- The orchestration order is:
  1. Detect intent.
  2. Run mandatory pre-answer review.
  3. Execute deterministic non-model paths when applicable.
  4. Retrieve project context.
  5. Call the model only if the request actually requires model reasoning/generation.
- `memory_save` is an execution path. Requests such as `Ø§Ø­ÙØ¸ ...`, `ØªØ°ÙƒØ± ...`, `Ø®Ø²Ù† ...`, `remember ...`, or `save ...` must write to Engineering Memory and return a confirmation without calling the model.
- `memory_recall` is an execution path. Identity and recall questions read stored user memory directly and do not ask the model to guess.
- Explicit internet/link/latest/search requests route to `BraveAnswersService`. If Brave/provider/network/API key is unavailable, the agent must say the real search failed and must not fabricate links or current information from model knowledge.
- Only generation, review, debugging, workspace reasoning, and general reasoning requests may call `ReasoningEngine`, and only after the memory/training/context review has built the final context.

## Saad Agent Attachment Training References (2026-06-30)

- Uploaded chat files become permanent training references when the user explicitly asks to save, remember, store, train on, or use them as a reference.
- The renderer must store files through `AttachmentManager` first, then pass the stored attachment records to `chat-complete`.
- `ChatOrchestratorService` handles attachment save requests as `memory_save` execution paths and must not call the model for the save operation.
- `KnowledgeIngestionService.importAttachmentsAsTraining` copies stored attachments into `.saad-agent/training/` and immediately rebuilds the training registry and vector index.
- Category routing:
  - Images -> `.saad-agent/training/screenshots/`
  - PDF, Word, RTF, generic docs -> `.saad-agent/training/project-docs/`
  - JSON/YAML -> `.saad-agent/training/api-docs/`
  - Source code -> `.saad-agent/training/code-examples/`
  - Markdown/TXT -> `.saad-agent/training/lessons/`
- Text, Markdown, JSON, and source-code files are indexed from readable text.
- PDF, Word, screenshots, diagrams, and other binary files are stored as permanent references and metadata-only unless a real PDF/DOCX/OCR/Vision extractor generates text. The system must not claim extracted content that was not actually extracted.
- Sensitive files and secret-looking paths remain excluded from training import.
## Saad Agent Approval / Access Mode behavior (2026-07-01)

- The chat prompt composer includes an Approval / Access Mode selector per conversation: Ask for approval, Approve for me, and Full access.
- Enforcement is centralized in `ApprovalPolicyService`; React UI is only the control surface, not the security boundary.
- Backend checks cover trusted workspace search, local path open/reveal/copy, terminal runner, git runner, internet/search use, knowledge imports, delete operations, and chat-triggered training imports.
- If an action requires approval, the backend returns a structured approval request with action, risk, reason, command, and files. The chat UI renders an approval card with Approve, Reject, and Always allow this type in this conversation.
- Full access does not expose secrets. `.env`, private keys, tokens, cookies, credentials, and secret storage stay blocked in every mode.
- The correct response to a local folder request outside the active project, such as `C:\Users\PC\Pictures\Screenshots`, is not to claim generic inability. The agent must ask the user to trust/approve the folder and then inspect it through the trusted workspace runtime.

## Smart Long Input Handling (2026-07-01)

- ØµÙ†Ø¯ÙˆÙ‚ Ø¥Ø¯Ø®Ø§Ù„ Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø© ÙŠØ­ÙˆÙ„ Ø§Ù„Ù†ØµÙˆØµ Ø§Ù„Ø·ÙˆÙŠÙ„Ø© Ø§Ù„Ù…Ù„ØµÙˆÙ‚Ø© Ø£Ùˆ Ø§Ù„Ù…Ø³Ø­ÙˆØ¨Ø© Ø£Ùˆ Ø§Ù„Ù…ÙƒØªÙˆØ¨Ø© Ù…Ø¨Ø§Ø´Ø±Ø© Ø¥Ù„Ù‰ Ù…Ù„Ù Ù…Ø±ÙÙ‚ Ø¨Ø¯Ù„ Ø¥Ø±Ø³Ø§Ù„Ù‡Ø§ ÙƒÙ†Øµ Ø®Ø§Ù….
- ÙŠØ¯Ø¹Ù… Ø§Ù„ØªØµÙ†ÙŠÙ Ø§Ù„Ø£ÙˆÙ„ÙŠ Ù„Ù€ JSON ÙˆTypeScript ÙˆJavaScript ÙˆPython ÙˆMarkdown Ùˆlogs Ùˆconfig Ùˆshell scripts.
- ÙŠØ¬Ø¨ Ø§Ù„Ø­ÙØ§Ø¸ Ø¹Ù„Ù‰ Ø§Ù„Ù…Ø­ØªÙˆÙ‰ Ø§Ù„Ø£ØµÙ„ÙŠ ÙƒÙ…Ø§ Ù‡Ùˆ Ø¯ÙˆÙ† ØªÙ„Ø®ÙŠØµ Ø£Ùˆ Ø¥Ø¹Ø§Ø¯Ø© ØªÙ†Ø³ÙŠÙ‚ Ø£Ùˆ Ø­Ø°Ù Ø§Ù„Ø¹Ø±Ø¨ÙŠØ© Ø£Ùˆ ØªØºÙŠÙŠØ± Ø§Ù„Ù…Ø³Ø§ÙØ§Øª.
- Ø®ÙŠØ§Ø± `Paste as text anyway` ÙŠØ³Ù…Ø­ Ø¨Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ù†Øµ Ø§Ù„Ø®Ø§Ù… Ø¹Ù†Ø¯ Ø§Ù„Ø­Ø§Ø¬Ø©ØŒ ÙˆØ®ÙŠØ§Ø± `Attach as file` ÙŠØ³Ù…Ø­ Ø¨ØªØ­ÙˆÙŠÙ„ Ø§Ù„Ù†Øµ Ø§Ù„Ø­Ø§Ù„ÙŠ ÙŠØ¯ÙˆÙŠÙ‹Ø§ Ø¥Ù„Ù‰ Ù…Ø±ÙÙ‚.
- Ø§Ù„ØªÙ†ÙÙŠØ° ÙŠØ³ØªØ®Ø¯Ù… Ù…Ø³Ø§Ø± Ø§Ù„Ù…Ø±ÙÙ‚Ø§Øª Ø§Ù„Ø­Ø§Ù„ÙŠ ÙˆÙ„Ø§ ÙŠØºÙŠØ± Backend AttachmentManager.
- 2026-07-05: Direct chat must read safe readable attachment content before answering attachment-aware questions. Markdown, TXT, JSON, YAML, XML, HTML, CSS, JS/TS, Python, shell, and OpenAPI-like text attachments are injected as bounded primary evidence. Binary or unsupported attachments remain metadata-only until a real extractor exists.
- 2026-07-05: If a page-creation request includes a readable requirements/OpenAPI attachment, the attachment is treated as page requirements, not as a command to execute the provider API. The internal static page executor may build a provider-agnostic generation-console page from extracted title/endpoint/method/summary evidence when the target workspace is trusted. This must work for any readable API specification and must not be hardcoded to one provider or model name.

## Saad Agent V2 Architecture Freeze (2026-07-01)

- Saad Agent V2 architecture is frozen as an implementation contract. V2 must wrap and extend V1/v6.5 services rather than replacing working behavior.
- The fixed execution path is: Conversation Intelligence -> Intent Analysis -> Agent Brain -> Decision Engine -> Execution Policy -> Planning -> Safety & Governance -> Approval -> Tool Engine -> Execution Engine -> Verification Engine -> Context Assembly -> Provider -> Response -> Self Evaluation -> Continuous Learning.
- The first implementation phase should be a standalone `ExecutionPolicyService` because execution safety is currently real but distributed across orchestrators, IPC handlers, approval checks, and runtime services.
- Knowledge Engine V2 must preserve V1 registry, packs, chunks, dictionaries, and hashed vector search while adding embeddings, hybrid search, reranking, Arabic/Iraqi normalization, PDF/OCR/image extraction, and safe fallbacks.
- Future phases must run build, tests, and verification, update memory, report changed files, then stop for approval.
## Saad Agent Execution Trace UI behavior (2026-07-01)

- Saad Agent chat now renders a public `execution-trace` card for each sent prompt.
- The card shows execution stages such as Reading request, Loading project context, Loading memory, Loading knowledge, Selecting skills, Selecting workflow, Planning, Safety check, Execution, Verification, and Learning.
- Trace display modes are Simple, Developer, and Verbose. Verbose may show safe runtime details, but secrets and internal model chain-of-thought are never exposed.
- The trace is a UI/event-boundary transparency feature and does not replace backend policy, approval, memory, knowledge, or orchestration enforcement.
## Saad Agent Real Runtime Execution Trace behavior (2026-07-02)

- Execution Trace in chat is created only from backend runtime events sent through `execution-trace-event`.
- The renderer must not create synthetic pipeline cards or mark stages complete before the runtime emits them.
- Trace updates are correlated by `taskId`; policy, approval, pre-answer review, execution, verification, and learning events for one request must remain in one card.
- The packaged CommonJS preload bridge must expose `onExecutionTraceEvent` because packaged Electron uses `dist/desktop/preload.cjs`.
- The trace is public execution telemetry only. It must never expose internal model chain-of-thought or secrets.
## Saad Agent Execution Policy user-request boundary (2026-07-02)

- Arabic/Iraqi engineering creation or modification requests such as `create page`, `add page`, `fix bug`, `update UI`, `Ø§Ø±ÙŠØ¯ Ø§Ù†Ø´Ø¦ ØµÙØ­Ø©`, `Ø§Ø¶Ù ØµÙØ­Ø©`, `Ø§ØµÙ„Ø­ Ù‡Ø°Ø§ Ø§Ù„Ø®Ø·Ø£`, and `Ø¹Ø¯Ù„ Ø§Ù„ÙˆØ§Ø¬Ù‡Ø©` must be classified as project modification requests, not normal answers.
- Under `Ask for approval`, project modification requests must return an approval request before model generation or file modification.
- Execution Policy must evaluate the real user-facing request only.
- Composer metadata such as `Composer action`, runtime provider/model labels, workspace labels, and MCP/tool labels must not trigger modification approval by themselves.
- A greeting or casual conversation such as `Ø§Ù‡Ù„Ø§` must route as `ANSWER`/conversation and must not require project modification approval.
- If a composed prompt reaches policy code, the policy must extract the content after `User request:` before classification.

## Saad Agent Casual Conversation Trace behavior (2026-07-02)

- Casual greetings and short acknowledgements such as `Ø§Ù‡Ù„Ø§`, `Ø´ÙƒØ±Ø§`, and `ØªÙ…Ø§Ù…` are not executable engineering tasks.
- These requests must return a concise deterministic chat response before `TaskStateStore.initializeTask`.
- The public `Execution Trace` card remains reserved for real engineering, approval, workspace, policy, tool, verification, and learning tasks.
- Agent identity questions such as `Ù…Ù†Ùˆ Ø§Ù†Øª`, `Ù…Ù† Ø§Ù†Øª`, and `Ø´Ù†Ùˆ Ø§Ù†Øª` must return a deterministic `Saad Studio Agent` identity response before model invocation. The runtime must not identify itself as ChatGPT, OpenAI, Gemini, Claude, or the active provider model.

## Saad Agent Quiet Conversation Knowledge Review (2026-07-04)

- Normal low-risk answer/explain conversation prompts must not render a full engineering `Execution Trace` card.
- Before invoking the active model for these prompts, the orchestrator must run a quiet `PreAnswerReviewService.review(...)` pass without trace UI.
- The quiet review must load available memory, training knowledge, project rules, and matched skills context.
- If no trained knowledge matches the prompt, the model prompt must explicitly include `No matching trained knowledge found. Answering from model knowledge only.`
- The agent must not claim trained knowledge was used unless matched knowledge was actually found.
- Tool, approval, search, workspace, file, and project modification workflows still use the visible execution trace.

## Saad Agent Natural Iraqi Arabic Voice behavior (2026-07-02)

- Casual thank-you and acknowledgement messages such as `mamnoun`, `mumtan`, `salamt`, `shukran`, and `teslam` are conversation-only inputs.
- These inputs must return a short deterministic reply before task-state initialization and must not render an Execution Trace card.
- Direct model response paths that do initialize a task must follow the lifecycle order `ANALYZING -> EVIDENCE_COLLECTION -> VALIDATING -> GAP_ANALYSIS -> IMPACT_ANALYSIS -> RISK_ASSESSMENT -> SOLUTION_DESIGN -> PLANNING -> IMPLEMENTING -> VERIFYING -> COMPLETED`.
- Saad Agent must reply in natural central Iraqi Arabic (Baghdad tone) unless the user asks for another language.
- The tone must be friendly, smart, fast, respectful, direct, and concise unless the task needs detail.
- Technical replies should still use Iraqi phrasing while staying precise, e.g. `Ø§Ù„Ù…Ø´ÙƒÙ„Ø© Ù…Ùˆ Ø¨Ø§Ù„Ù€ APIØŒ Ø§Ù„Ù…Ø´ÙƒÙ„Ø© Ø¨Ø§Ù„Ù€ State Management`.
- Avoid non-Iraqi phrases such as `ÙˆØ´`, `ÙŠØ§Ø®ÙŠ`, `Ø£Ø¨Ø´Ø±`, `ÙƒÙÙˆ Ø¹Ù„ÙŠÙƒ`, `ÙŠØ®ÙˆÙŠ`, `ÙŠØ§ Ø²Ù„Ù…Ø©`, and `ÙŠØ¹Ø·ÙŠÙƒ Ø§Ù„Ø¹Ø§ÙÙŠØ©`.
- Preferred phrases include `Ø´Ù„ÙˆÙ† Ø£Ú¯Ø¯Ø± Ø£Ø³Ø§Ø¹Ø¯ÙƒØŸ`, `Ø£ÙƒÙˆ Ø´ÙŠ Ø«Ø§Ù†ÙŠ ØªØ±ÙŠØ¯ØŸ`, `Ù…Ùˆ ÙˆØ§Ø¶Ø­ Ø¹Ù„ÙŠÙ‘ØŒ ÙˆØ¶Ø­Ù„ÙŠ Ø£ÙƒØ«Ø±`, and `ØªÙ…Ø§Ù…ØŒ Ø£Ø³ÙˆÙŠÙ‡Ø§`.

## Saad Agent Codex Runtime Integration Audit (2026-07-02)

- `CODEX_INTEGRATION_AUDIT.md` records the current evidence for using Codex as a future real execution runtime behind Saad Agent.
- The audit does not implement a bridge and does not claim Codex is integrated.
- The recommended direction is a controlled `CodexRuntimeBridge` using the TypeScript SDK first, because the inspected SDK documentation confirms it wraps the `codex` CLI and streams structured JSONL events.
- Saad Agent remains the authority for identity, Iraqi Arabic voice, trusted workspaces, approval mode, knowledge/memory retrieval, provider settings, and final user-facing reporting.
- Codex, if integrated later, must operate only after Saad's Conversation Intelligence, Intent Analysis, Execution Policy, Approval Policy, Pre-Answer Review, and Context Assembly complete.

## Saad Agent Broad Memory Recall and Approval Routing (2026-07-02)

- User-memory recall must be phrase-family based, not one-keyword based.
- Arabic/Iraqi variants such as `Ø´Ù†Ùˆ ØªØ¹Ø±Ù Ø¹Ù†ÙŠ`, `Ø´Ù†Ùˆ Ø­Ø§ÙØ¸ Ø¹Ù†ÙŠ`, `ØªØªØ°ÙƒØ±Ù†ÙŠ`, `Ø§Ø³Ù…ÙŠ Ø´Ù†Ùˆ`, and `ØªØ¹Ø±ÙÙ†ÙŠ` must route to deterministic `memory_recall` without model invocation.
- Recall-like prompts must not be treated as memory-save just because they contain a `remember`/`ØªØ°ÙƒØ±` token.
- Approval-required project modification requests must preserve an engineering intent such as `code_generation`; they must not be downgraded to `conversation`.
- Approval-required web requests must preserve `external_research`.
- Approval policy persistence and execution audit logging are non-critical side effects. If a local app-data write fails, the runtime must still return the user-facing decision or approval card instead of crashing.

## Saad Agent Prompt Composer Responsive Layout (2026-07-02)

- The prompt composer must keep a stable width and readable font size across window resizing.
- The input text should use product-level sizing, not viewport scaling or accidental inherited tiny text.
- Toolbar controls must not overlap the prompt text, trace controls, send button, or each other.
- Optional/unused controls such as voice input must not remain visible when they are not implemented.
- Attachments may appear above the input in a bounded area, but must not make the composer expand unpredictably.

## Saad Agent Developer Console Audit (2026-07-02)

- `DEVELOPER_CONSOLE_AUDIT.md` defines the requested Developer Console as a real telemetry surface, not placeholder UI.
- Current confirmed foundations include backend execution trace events, approval audit logs, trusted workspace runtime, knowledge services, provider/model settings, and production diagnostics handlers.
- Missing production pieces include unified tool-call logs, RAG trace logs, prompt envelope viewer, token usage aggregation, performance timeline, error analyzer, knowledge inspector, and an auto diagnostic runner.
- The next correct implementation phase is backend telemetry contracts and IPC before adding visible console panels.

## Saad Agent Codex Runtime Bridge (2026-07-02)

- `CodexRuntimeBridge` is a real backend bridge for explicit `/codex` or `Ø§Ø³ØªØ®Ø¯Ù…/Ø´ØºÙ„/Ù†ÙØ° Codex` requests only.
- The bridge must run after Saad Agent context, memory, knowledge, trusted workspace, and approval checks.
- Normal conversation and normal provider responses must not silently route through Codex.
- The current machine's WindowsApps `codex.exe` is not spawnable from Node/Electron and returns `Access is denied` / `spawn EPERM`; the bridge reports this directly instead of claiming execution.
- A spawnable Codex CLI/SDK path must be provided before Codex can become the execution heart.

## Saad Agent Deterministic Memory and Training Routing (2026-07-02)

- Direct memory-save requests must be handled before task trace initialization and before provider/model invocation.
- Training-ingest requests without an attached file must return a deterministic upload-required message and must not call the active model.
- The prompt loading UI must use neutral wording such as `Processing request...` until the backend decides whether an LLM call is actually required.
- Identity and user-memory recall prompts such as `Ù…Ù† Ø§Ù†Ø§`, `Ù…Ù†Ùˆ Ø§Ù†Ø§`, and `Ù…Ø§Ø°Ø§ ØªØ¹Ø±Ù Ø¹Ù†ÙŠ` are deterministic read-only memory operations. They must run before execution policy, approval writes, task trace initialization, and provider/model invocation.
## Saad Agent Runtime Approval and Project Context Stabilization (2026-07-02)

- `WAIT_FOR_APPROVAL` is a real pending runtime state. It must render as `Waiting approval`, not `Running`.
- Backend `approvalRequest` responses must be shown as actionable runtime approval cards in chat.
- Approval cards must preserve the original prompt, workspace path, project name, attachments, conversation id, and approval mode so the same request can be resumed with `approved: true`.
- Rejecting an approval card must stop execution and show a concise stop message.
- Deterministic project-context questions such as `Ù…Ø§Ù‡Ùˆ Ù…Ø´Ø±ÙˆØ¹ Ø³Ø¹Ø¯ Ø³ØªÙˆØ¯ÙŠÙˆ` and `Ø´Ù†Ùˆ Ù…Ø´Ø±ÙˆØ¹ Ø³Ø¹Ø¯ Ø³ØªÙˆØ¯ÙŠÙˆ` must answer from Saad Agent context without calling the active provider model.
- Project modification requests under Ask mode must still return approval before execution or model planning.
## Saad Agent Production Package Asset Rule (2026-07-03)

- The production `win-unpacked` folder is part of the runnable desktop product and must contain the Electron Chromium assets required by the executable.
- `chrome_100_percent.pak` and `chrome_200_percent.pak` were confirmed missing from `release-production-v4/win-unpacked` and restored from `node_modules/electron/dist`.
- Repacking `resources/app.asar` alone is not enough to validate a production build. The outer Electron runtime files beside `Saad Agent.exe` must also be checked.
- Runtime backups such as `app.asar.backup-*`, `app.asar.bak-*`, `app.asar.linkfix-*`, and `app.asar.new*` should not be deleted without explicit human approval.
- If Chromium asset errors continue after the PAK files are restored, perform a full Electron rebuild and verify the final unpacked output before testing chat behavior.

## Saad Agent External Search Routing Rule (2026-07-03)

- Arabic/Iraqi search requests must be routed by sentence-family, not by one exact keyword.
- External search phrase families include `Ø§Ø¨Ø­Ø«Ù„ÙŠ`, `Ø§Ø¨Ø­Ø« Ù„ÙŠ`, `Ø§Ø¨Ø­Ø«`, `Ø¯ÙˆØ±Ù„ÙŠ`, `Ø¯ÙˆØ± Ù„ÙŠ`, `Ø¯ÙˆØ±`, `ÙØªØ´Ù„ÙŠ`, `ÙØªØ´ Ù„ÙŠ`, `ÙØªØ´`, `Ø¬ÙŠØ¨Ù„ÙŠ Ù…Ø¹Ù„ÙˆÙ…Ø§Øª`, `Ø¬ÙŠØ¨ Ù„ÙŠ Ù…Ø¹Ù„ÙˆÙ…Ø§Øª`, `Ù‡Ø§ØªÙ„ÙŠ Ù…Ø¹Ù„ÙˆÙ…Ø§Øª`, `Ù‡Ø§Øª Ù„ÙŠ Ù…Ø¹Ù„ÙˆÙ…Ø§Øª`, `Ø·Ù„Ø¹Ù„ÙŠ Ù…Ø¹Ù„ÙˆÙ…Ø§Øª`, and `Ø·Ù„Ø¹ Ù„ÙŠ Ù…Ø¹Ù„ÙˆÙ…Ø§Øª`.
- If the request contains an external topic signal such as an English product/model name, version number, company, platform, service, model, price, docs, links, or sources, the runtime should classify it as `external_research`.
- If the request explicitly says it is inside the project, files, code, workspace, or codebase, it must stay in workspace search and must not trigger internet research.
- In `ask` approval mode, external research must return an actionable `use_internet` approval request before using the web.
- The runtime must not answer external research requests from model guesses when internet access is required and not approved.

## Saad Agent IPC Contract Rule (2026-07-03)

- Every function exposed from the packaged preload bridge must have a matching `ipcMain.handle(...)` implementation in the Electron main process.
- Trusted Workspace UI calls must route to `TrustedWorkspaceRuntime` handlers, not missing or placeholder IPC channels.
- Knowledge Library UI calls must route to `KnowledgeManagerService` handlers for registry, packs, dictionaries, stats, storage config, backups, and import operations.
- If a feature is not implemented by the backend service, the handler must return an explicit structured unsupported response instead of leaving the renderer with `No handler registered`.
- Missing IPC handlers in production are treated as runtime wiring bugs.

## Saad Agent Automatic Safe Execution Rule (2026-07-03)

- The default runtime approval mode is `approve_for_me`, not `ask`.
- `approve_for_me` allows safe actions inside trusted workspaces without repeated manual approval:
  - workspace search
  - file inspection
  - safe file edits
  - build/typecheck/lint/test commands
  - approved runtime delegation through the Codex bridge
  - internet search when the user explicitly asks for live research
- Destructive or sensitive actions remain blocked or require explicit human approval:
  - deleting files
  - `git push`
  - `git reset`
  - package installation
  - unknown shell commands
  - secrets, credentials, tokens, cookies, private keys, and `.env` paths
- Project modification requests should not fall back to a text-only answer path. When execution policy classifies a trusted-workspace engineering request as `PLAN`, the orchestrator must delegate to the execution runtime and report the real result or the real runtime error.

## Saad Agent Root Runtime Stabilization Update (2026-07-03)

- The packaged Electron runtime must be validated from `resources/app.asar`, not only from source.
- The desktop preload bridge now mirrors Trusted Workspace, Knowledge, approval, and abort APIs expected by the renderer.
- Safe automatic mode is persisted as `approve_for_me` so normal safe actions do not repeatedly ask for approval after restart.
- Straightforward static page generation can be completed by a deterministic internal workspace executor before trying the external Codex runtime bridge.
- The internal executor writes real files inside the trusted workspace and reports exact paths; it remains intentionally bounded and is not a replacement for full engineering refactors.
- Chat and prompt composer layout now uses bounded responsive constraints to avoid tiny text, uncontrolled wide trace cards, and prompt-box overlap while resizing.
- 2026-07-05: Saad Agent packaged UI now defaults execution tracing to Simple mode. The full Execution Trace card is no longer created for ordinary running or successful chat tasks in Simple mode. Failure and approval-required tasks still surface the trace card. Developer and Verbose remain diagnostic opt-in modes.
## Saad Agent private story knowledge behavior (2026-07-06)
- Saad Agent now has a documented private narrative psychology knowledge rule for consensual adult fictional story interests.
- The update preserves the current training architecture by storing structured story analysis cards under `.saad-agent/training/lessons/stories/`.
- Story entries should be compact knowledge cards with title, source, category, tags, summary, characters, relationship dynamics, key themes, psychological notes, narrative style, vocabulary, lessons, and safety notes.
- The agent should use these cards for term explanation, pattern comparison, character/dynamic analysis, summarization, translation, and narrative-style understanding.
- This is a private companion knowledge behavior, not a new storage architecture or a replacement for licensed therapy/medical advice.
- Safety boundary: only adult consensual fictional/narrative material belongs in this path; content involving minors, coercion, real non-consensual harm, exploitation, or illegal activity must not be stored or trained.

## Saad Agent real URL crawler training import behavior (2026-07-06)
- The Knowledge Manager URL import is now a real request-time crawler, not a link-only placeholder.
- `knowledge:import-url` fetches a public HTTP/HTTPS URL, extracts readable HTML/text, writes a Markdown training file, and runs the existing `KnowledgeIngestionService.ingestTrainingKnowledge(...)` pipeline.
- Private narrative/story-like sources route under `.saad-agent/training/lessons/stories/` and include a story knowledge card header plus crawled page text.
- The crawler must fail honestly when DNS, HTTP status, timeout, login wall, paywall, or unreadable content prevents extraction; it must not save a fake full-content record.
- The crawler does not bypass protected content. For inaccessible pages, the user must provide reachable text or a reachable source URL.

## Saad Agent direct URL reading behavior (2026-07-09)
- A direct HTTP/HTTPS URL in chat is fetched before response generation and its readable text is passed as webpage context.
- When fetched webpage context exists, quiet/general chat shortcuts must not run because they would discard the retrieved text.
- The response model must answer from the retrieved context and must not claim that it cannot open the supplied URL.
- Fetch failures remain explicit and must not be represented as successfully read content.
- Direct chat URL context prefers the HTML `<article>` or `<main>` body, removes navigation/header/footer/sidebar/form content, and is bounded to 10,000 characters so 8K-context local models do not fail with `n_keep >= n_ctx`.
- Direct conversational URL responses use bounded recent history instead of injecting raw conversation history.
- Every chat URL is also saved automatically as a permanent training source through `UrlTrainingService`.
- Permanent URL storage and indexing are separate from the 10,000-character immediate response excerpt.
- Re-sending the same URL updates the deterministic training file instead of creating a duplicate.
- Story-like sources route to `.saad-agent/training/lessons/stories/`; other sources use the existing category inference.
- A single stored URL may preserve up to 7,000,000 readable characters, subject to the existing 8MB knowledge-file indexing ceiling.
- The global knowledge index supports up to 5,000 chunks so long stories, books, and accumulated URL sources remain retrievable.

## Saad Agent Knowledge document normalization and crawler error clarity (2026-07-06)
- `knowledge:list` and `knowledge:get-document` must normalize training registry records before returning them to the Knowledge Manager UI.
- Registry fields such as `fileName`, `filePath`, `addedDate`, and `type` map to UI fields such as `title`, `originalFileName`, `sourcePath`, `importedAt`, and `fileType`.
- This preserves the existing registry schema and avoids creating a second knowledge service.
- URL crawler errors must expose the real failure class, including DNS lookup failure, timeout, refused connection, and TLS/certificate failure, instead of returning only `fetch failed`.
- The crawler must not save fake full-content records when the URL cannot be reached or readable content cannot be extracted.

## Saad Agent attachment training and conversation continuity behavior (2026-07-06)
- Runtime attachments must be normalized at the orchestration boundary before any training import, readable attachment scan, approval check, or model prompt assembly.
- Attachments that arrive with `name`, missing `filename`, missing `mimeType`, or only a local path must receive safe filename and MIME fallbacks before storage/indexing.
- When a prompt with attachments asks to save, store, remember, train, read, classify, search, index, use memory, or use as reference, Saad Agent must save and index the attachments first through the existing `.saad-agent/training/` pipeline and must not answer as if it only received metadata.
- Text-like training attachments may be indexed up to 8MB. PDF, Word, image, screenshot, map, and diagram files remain reference-only until a real extractor/OCR/Vision pipeline is available.
- Direct model answer paths must include recent conversation history in the model prompt so follow-up messages stay in sequence instead of behaving like a new chat.
- An explicit approval mode sent with the current request takes precedence over stale stored conversation mode. Stored mode is fallback-only when no explicit mode is present.

## Saad Agent translation route behavior (2026-07-06)
- Translation prompts must route through a dedicated `translation` path before raw knowledge lookup reporting.
- Default translation target is natural Iraqi Arabic matching the user's preferred private-agent voice.
- Explicit user requests for Modern Standard Arabic or English override the Iraqi Arabic default.
- The translation path may use inline text, readable attachments, trained knowledge matches, and recent conversation history as source material.
- Final translation responses must not print raw chunk labels, diagnostics, `Matched content`, or full source reports unless the user explicitly asks for sources.
- If the active model/provider fails, the fallback should list only possible source names and the provider error, not raw matched content.

## Saad Agent chat readability sizing behavior (2026-07-06)
- Chat message body text and composer input text should use stable 16px sizing for readability.
- Narrow/mobile composer rules must not reduce the prompt text below the product-level readable size.
- Font-size readability changes are UI-only and must not alter chat orchestration, memory, training, provider, or backend behavior.

## Saad Agent compact execution status behavior (2026-07-09)
- `simple` mode is the product-facing execution display: a compact icon, localized status, progress bar, and percentage.
- Technical failure text stays collapsed by default and is exposed only through an optional details disclosure.
- `developer` and `verbose` remain the explicit diagnostic modes that may render the full execution timeline.
- The persisted trace-mode key is versioned so older detailed-mode selections do not force legacy trace walls after UI upgrades.

## Saad Agent affirmative follow-up continuity behavior (2026-07-06)
- Short affirmative replies such as `نعم`, `إي`, `تمام`, `ok`, or `yes` must inspect the immediately previous assistant message before using the generic acknowledgement shortcut.
- If the previous assistant message offered a concrete action such as writing, drafting, translating, summarizing, analyzing, or continuing something, the affirmative reply means the user approved that offered action.
- In that case, Saad Agent must continue the same topic using conversation history and perform the offered action; it must not answer only `حاضر`.
- Standalone thanks and acknowledgements remain deterministic no-model responses when there is no previous actionable assistant offer.

## Saad Agent Brave Answers configuration behavior (2026-07-06)
- External research and link requests must use the real Brave Answers provider when live sources are required.
- If Brave Answers is not enabled or has no API key, Saad Agent should show a setup-needed answer that points to Settings > Providers > Brave Answers instead of rendering a failed trace as if the search itself ran and failed.
- Missing search-provider configuration must not trigger model guessing or fake links.
- Real Brave API/network/timeouts still remain failed live-search attempts and must report the real technical reason.
- YouTube terms (`يوتيوب`, `اليوتيوب`, `youtube`, and `youtu.be`) are explicit external-research signals even when the user does not write a separate search verb.
- Requests for YouTube links must use real external research and must never fall back to local-model link generation.
- When Brave Web Search returns a successful response without `web.results`, `BraveAnswersService` falls back to the official OpenAI-compatible Brave Answers endpoint at `/res/v1/chat/completions`.
- Grounded Markdown links from Brave Answers are normalized into clickable source records.
- The Web Search to Answers fallback is paced and may retry HTTP 429 once using the bounded `Retry-After` delay.
- Stable official homepage requests, such as the YouTube homepage, are deterministic direct-link answers and do not require internet approval, a model call, or execution trace.
- Requests for specific songs, videos, channels, or ranked content remain live external searches.
- Product-facing search responses show one concise linked list and omit provider timing, raw grounding labels, and duplicate source sections.
- Chat messages render Markdown links and bare HTTP/HTTPS URLs as visually distinct interactive anchors.
- External chat links open through a preload IPC bridge and `shell.openExternal`; the main process accepts only HTTP/HTTPS protocols.
- Link styling uses a distinct accent color, hover underline, external-link icon, and keyboard focus indicator.
- Deterministic commands are resolved by `DeterministicCommandService` at the desktop `chat-complete` IPC boundary before orchestration or model invocation.
- The orchestrator calls the same service as a secondary guard; deterministic patterns must not be duplicated across routing layers.
- Visible user-facing loading messages must be Arabic and describe the active state, such as request processing or permanent knowledge indexing.
- Normal chat uses a Codex-inspired hierarchy: compact right-aligned user bubbles, open agent prose, embedded operational cards, and one unified bottom composer.
- The existing message renderer, cards, and `PromptBox` remain the single implementation; visual composition must not duplicate chat or composer components.
- The right engineering panel starts collapsed and verbose trace controls stay off the normal conversation surface.
- Runtime approval requests use one compact Arabic decision card with a command/action preview.
- The three decision rows call the existing `handleRuntimeApprovalResponse` path for approve once, conversation-scoped always allow, or reject; no duplicate approval state machine is introduced.

## 7-Day Weather Forecast and Date Auto-Binding ExtendScript behavior (2026-07-07)

- The automatic weather update script (`update_weather.js`) is fully portable and zero-hardcoded. It dynamically walks folders to locate `DATA.jsx` and auto-extracts it from `WEATHER 2023.aegraphic` zip if missing.
- Refactored `replaceAndExpandTds` to perform slice-based table cells expansion (4 days to 7 days) which discards trailing original cells and prevents row/cell duplication on multiple runs.
- Standardized After Effects ExtendScript bindings to use simple string split `split('width="150">')` instead of regular expression split to prevent backslash escaping mismatches inside different After Effects engines.
- Generates 7 independent day-specific scripts (`auto_bind_weather_day1.jsx` to `auto_bind_weather_day7.jsx`) containing dynamically calculated cell index mappings:
  - Date cells: `Index = 2 + d` (where `d` is the 0-indexed day offset `0` to `6`).
  - City `k` (0 to 17) weather cards:
    - Icon: `Index = 9 + k * 28 + d`
    - Status/Case: `Index = 16 + k * 28 + d`
    - Max Temp: `Index = 23 + k * 28 + d`
    - Min Temp: `Index = 30 + k * 28 + d`
- All ExtendScript binding files automatically reload `DATA.jsx` in After Effects memory (`item.reload()`) and reactivate any disabled expressions (`prop.expressionEnabled = true`).
