# Gate C — High-Fidelity Component States Specification

**Document Version:** 1.0  
**Role:** Lead Product Designer & UX Architect  
**Platform:** Saad Studio (AI Microdrama & Long-form Film Production Platform)  
**Status:** Approved for Gate C Design Review | Implementation Strictly Blocked  

---

## 1. مصفوفة الحالات التشغيلية والمالية الشاملة (Component States Matrix)

| فئة الحالة (State Category) | اسم الحالة (State Identifier) | السلوك البصري والواجهة (Visual Representation) | الإجراءات المتاحة للمستخدم (Available Actions) |
| :--- | :--- | :--- | :--- |
| **Project Card** | `Draft Project` | بطاقة بحافة عادية، بوستر Placeholder، رصيد مصاريف 0 Cr. | [ تحرير الملخص ] [ فتح مساحة العمل ] |
| **Project Card** | `Planning Active` | بطاقة بحافة صفراء خفيفة، مؤشر إكمال المخطط 60%. | [ استكمال تقسيم المشاهد ] [ مراجعة الكادر ] |
| **Project Card** | `In Production` | بطاقة مميزة بحافة خضراء ومؤشر تقدم توليد اللقطات. | [ متابعة الإنتاج ] [ مراجعة التايم لاين ] |
| **Project Card** | `Autosaving / Sync` | وميض دائري بنفسجي بجانب الاسم مع نص `Autosaving...`. | [ إلغاء المزامنة ] (معطل مؤقتاً) |
| **Project Card** | `Save Conflict` | بطاقة بحدود `--ss-amber` ونص تحذيري بوجود تعديل من جلسة أخرى. | [ حل التعارض الفوري (MDL-09) ] |
| **Project Card** | `Completed Master` | بطاقة ذهبية/خضراء مع شارة `Master Approved`. | [ تصدير الماستر ] [ معاينة الحلقة ] |
| **Project Card** | `Archived State` | بطاقة باهتة مع علامة `Read-Only`. | [ استعادة المشروع ] [ استعراض الأصول ] |
| **Project Card** | `Soft-Deleted` | بطاقة في سلة المهملات مع مؤشر سياسة الاحتفاظ. | [ استعادة فورية ] [ حذف نهائي للأدمن ] |
| **Financial / Credit** | `Quote Available` | بطاقة تفصيل التكلفة مع إبراز قيمة الرصيد المطلوب حجزه. | [ تأكيد وحجز الرصيد (Confirm & Reserve) ] |
| **Financial / Credit** | `Requote In Progress` | وميض تحميل مع نص `Calculating live quote...`. | (الأزرار معطلة حتى اكتمال التسعير) |
| **Financial / Credit** | `Stale Quote Warning` | شارة `--ss-amber` مع نص `Input changed. Quote updated.`. | [ اعتماد التسعير الجديد ] |
| **Financial / Credit** | `Insufficient Balance` | شارة حمراء مع نص `Balance (15 Cr) below Quote (18 Cr)`. | [ 💳 شحن الرصيد ] [ تقليص نطاق التوليد ] |
| **Financial / Credit** | `Job Failed & Refund` | إشعار نجاح استرداد الرصيد (+18 Cr Returned) مع كود المعاملة. | [ 🔁 إعادة محاولة هذا المقطع فقط ] |
| **Financial / Credit** | `Completion Receipt` | نافذة `MDL-11` بالتكلفة الفعلية ورقم العملية في الـ Ledger. | [ اعتماد واستمرار ] [ طباعة السجل ] |
| **Continuity QC** | `Continuity Pass` | علامة خضراء `100% Consistent` عبر الأبعاد السبعة. | [ اعتماد الـ Take ونقلها للماستر ] |
| **Continuity QC** | `Continuity Warning` | علامة `--ss-amber` في درج الفحص تفيد باختلاف ملابس الشخصية. | [ تجاوز التحذير ] [ إعادة ضبط المرجع ] |

---

## 2. حالات الفراغ المعتمدة (Empty State Specs)

1. **الـ Hero دون مشاريع سابقة:** عرض دعوة واضحة لإنشاء أول مسلسل بالذكاء الاصطناعي مع بطاقة إطلاق سريعة.
2. **المخطط الدرامي فارغ (Empty Outline):** عرض زر يتيح لمخرج الذكاء الاصطناعي بناء الهيكل المشهدي تلقائياً بناءً على فكرة المستخدم.
3. **الكادر فارغ (No Cast):** بطاقات جاهزة لاقتراح الشخصيات بناءً على السيناريو مع زر رفع صور المراجع.
4. **شريط الـ Takes فارغ (No Takes Generated):** واجهة توجيهية تعرض متطلبات اللقطة، الموديل المقترح، وزر `Calculate Quote & Generate`.
