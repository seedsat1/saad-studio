# Gate C — Micro-Interactions & Motion Specification

**Document Version:** 1.0  
**Role:** Lead Product Designer & UX Architect  
**Platform:** Saad Studio (AI Microdrama & Long-form Film Production Platform)  
**Status:** Approved for Gate C Design Review | Implementation Strictly Blocked  

---

## 1. مبادئ التفاعل والحركة السينمائية (Interaction Principles)

1. **الاستجابة الفورية (Instant Feedback):** كل نقرة، سحب، أو تعديل يحصل على تأكيد بصري فوري دون تأخير.
2. **الاحترام الكامل لتفضيل الحركة المنخفضة (prefers-reduced-motion):** عند تفعيل هذا الخيار في النظام، يتم إلغاء كافة التحركات الانتقالية والانتقال الفوري (Instant Swap/Fade).
3. **عدم اختراع أزمنة مجهولة:** الاعتماد على فئات الحركة المتناسقة (Fast 150ms للتحويم، Base 250ms للقوائم والأدراج، Smooth 350ms للمودالز وتغيير التبويبات).

---

## 2. جدول التفاعلات المصغرة (Micro-Interactions Directory)

| التفاعل (Interaction Target) | المشغل (Trigger) | الاستجابة البصرية (Visual Response) | سلوك الكيبورد (Keyboard) | إشعار قارئ الشاشة (ARIA) |
| :--- | :--- | :--- | :--- | :--- |
| **بطاقة المشروع (Project Card)** | Hover | إضاءة الحدود بلون `--ss-cyan` وتكبير خفيف للظل. | Focus Ring `--ss-cyan` | "Project card: [Name], Status: [Status]" |
| **تبديل التبويبات (Tab Switch)** | Click / KeyNav | إزاحة سلسة للمؤشر النشط بلون `--ss-cyan` وعرض المحتوى. | Arrow Left/Right + Enter | "Tab 2: Outline & Script, selected" |
| **اقتراح المخرج (Proposal Diff)** | Agent Action | انبثاق بطاقة `MDL-01` مع تلوين الفروق (`--ss-amber`). | Tab للتركيز على زر الاعتماد | "Director proposed changes to Scene 2" |
| **درج الذاكرة (Memory Drawer)** | Click Icon / Cmd+M | انزلاق الدرج من اليمين بنعومة وثبات مؤشر الإغلاق. | Escape للإغلاق السريع | "Memory drawer expanded, 9 layers active" |
| **تحديث السعر (Quote Refresh)** | Parameter Change | تحول الشارة إلى `--ss-amber` مع نص `Recalculating...`. | تحديث القيمة تلقائياً | "Quote updated to 18 Credits" |
| **التايم لاين (Timeline Seek)** | Drag Playhead | تحرك سلس لمؤشر الوقت وتحديث كادر المعاينة. | Arrow Left/Right (1s steps) | "Playhead at 00:14.2" |
| **مقارنة اللقطات (Take Compare)** | Click Compare | فتح شاشة `MDL-05` المقسمة رأسياً مع مزامنة التشغيل. | Space للتشغيل المشترك | "Comparing Take 1 and Take 2" |
| **حفظ النسخة (Save Copy As)** | Click Action | فتح نافذة `MDL-08` وتوليد `projectId` ورصيد نظيف. | Escape / Enter | "Save a copy as modal opened" |
| **تعارض الحفظ (Conflict Modal)** | Concurrent Event | فتح فوري لـ `MDL-09` وعرض خيارات المقارنة الثلاثة. | Focus Trap داخل المودال | "Save conflict detected between devices" |
