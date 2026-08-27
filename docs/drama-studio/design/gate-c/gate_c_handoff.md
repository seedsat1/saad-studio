# Gate C — Developer & Codex Handoff Specification

**Document Version:** 1.0  
**Role:** Lead Product Designer & UX Architect  
**Platform:** Saad Studio (AI Microdrama & Long-form Film Production Platform)  
**Status:** Gate C Complete | Codex Handoff Ready | Phase 2 Implementation Blocked  

---

## 1. قواعد ومحددات التسليم البرمجي (Codex Execution Rules)

1. **الالتزام الكامل بالـ Normalization Adapter في Phase 2:**
   - يمنع الاعتماد على أسماء الموديلات أو استنتاج القدرات من الاسم.
   - يجب بناء محول قدرات (`Capability Adapter`) يقرأ الحقول الفعلية من `lib/video-model-registry.ts` ويحولها إلى واجهة استوديو الدراما الموحدة.
2. **عزل المسارات والـ Routes:**
   - الحفاظ على 3 مسارات فقط لـ Drama Studio:
     - `/drama-studio` (Hero + Project Launcher)
     - `/drama-studio/[projectId]` (Drama Workbench)
     - `/drama-studio/[projectId]/episodes/[episodeId]/production` (Video Production Studio)
   - مساحة `All Projects` تنفذ كـ Overlay Modal داخل Drama Studio وليس مساراً مستقلاً.
   - مساحة `Project Board` تستخدم مسار المنصة المشترك الحالي (`/cinema-board?projectId=...`).
3. **الفصل بين العمليات المالية وإدارة المشاريع:**
   - `Save a Copy As` تنشئ `projectId` جديد وسجل كريدت منفصل تماماً.
   - `Rename` يغير الاسم فقط دون مساس بـ `projectId` أو السجل المالي.
4. **حفظ وتتبع العمليات للأوديت (Audit Trail):**
   - كافة الحقول التقنية (`Quote ID`, `Reservation ID`, `Ledger Transaction ID`, `Idempotency Key`, `Provider Route`, `Context Packet Version`) يجب أن تتوفر في نماذج البيانات واستجابات الـ APIs لدعم التدقيق في لوحة الإدارة المركزية.
