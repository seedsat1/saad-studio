# Gate C — High-Fidelity Accessibility Specification (a11y)

**Document Version:** 1.0  
**Role:** Lead Product Designer & UX Architect  
**Platform:** Saad Studio (AI Microdrama & Long-form Film Production Platform)  
**Standard:** WCAG 2.1 Level AA Compliance  
**Status:** Approved for Gate C Design Review | Implementation Strictly Blocked  

---

## 1. مبادئ التوافق وإمكانية الوصول (Accessibility Standards)

1. **التباين اللوني الصارم (Contrast Ratio):**
   - كافة النصوص الأساسية تحقق نسبة تباين تفوق `7:1` مقابل خلفية `--ss-bg` و `--ss-card`.
   - الألوان الدلالية (`--ss-cyan`, `--ss-violet`, `--ss-amber`, `--ss-green`, `--ss-red`) تحقق نسبة تباين لا تقل عن `4.5:1` مقابل أسطح البطاقات.
2. **عدم الاعتماد على اللون وحده (Non-Color Status Indicators):**
   - كل حالة نجاح، تحذير، أو خطأ تقترن برمز أيقوني وصفي (Icons: ✓, ⚠️, 🔒, 🔁) ونص تفسيري واضح.
3. **التنقل الكامل بالكيبورد (Keyboard Operability):**
   - جميع الأزرار، التبويبات، حقول الإدخال، وعقد التايم لاين قابلة للوصول والتنقل باستخدام مفاتيح `Tab`, `Shift+Tab`, `Arrow Keys`, `Enter`, و `Space`.
   - حصر التركيز (`Focus Trap`) إلزامي داخل كافة النوافذ المنبثقة (`MDL-01` إلى `MDL-11`) مع دعم الإغلاق الفوري بمفتاح `Escape`.
4. **دعم قارئات الشاشة (Screen Reader Announcements):**
   - استخدام `aria-live="polite"` للإشعارات التشغيلية وحسابات الكريدت وتحديثات الأسعار.
   - استخدام `aria-live="assertive"` لتحذيرات تعارض الحفظ والأخطاء المانعة.
5. **توافق ثنائية اللغة (RTL/LTR Dual Support):**
   - دعم النصوص العربية بترميز وتنسيق RTL دقيق، مع الحفاظ الصارم على ترتيب التايم لاين والمخطط الزمني من اليسار إلى اليمين (LTR) لكونه يمثل تسلسلاً زمنياً فيزيائياً.
