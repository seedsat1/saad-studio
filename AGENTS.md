# Codex Instructions

## Memory Rules

قبل بدء **أي مهمة**، وبالترتيب، اقرأ الملفات التالية كاملة:

1. `AGENTS.md`
2. `PROJECT_CONTEXT.md`
3. `docs/saad-studio-premiere-reference-ar.md`

ممنوع بدء التنفيذ قبل قراءة ملفات ذاكرة المشروع الثلاثة.

بعد إكمال كل مهمة:

1. حدّث `PROJECT_CONTEXT.md` بالحالة الحالية، الملفات المتأثرة، نتائج التحقق، والخطوة المتبقية.
2. حدّث `docs/saad-studio-premiere-reference-ar.md` إذا تغيرت المعمارية أو آلية السلوك.
3. سجّل الأخطاء المكتشفة، حتى لو لم تُحل بعد.
4. سجّل القرارات المتخذة وسببها بإيجاز.

أبقِ الذاكرة مختصرة ودقيقة. لا تنسخ المحادثات، ولا تسجل الأسرار أو بيانات البيئة الحساسة.

إذا اختُصر سياق المحادثة أو امتلأ، نفّذ الآتي قبل المتابعة:

> Read `PROJECT_CONTEXT.md` and continue work.

## Known Truths

- إصدار المضيف المستهدف: Premiere Pro 26.2.0.
- الإضافة من نوع CEP Extension.
- FFmpeg مطلوب للتحليل الصوتي.
- اكتشاف نشاط المتحدث يعتمد RMS.
- Multi-Cam Auto Switch فعّال.
- Silence Removal فعّال.
- Reap API منفصل عن مسار المونتاج داخل Premiere.
