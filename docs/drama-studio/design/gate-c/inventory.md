# Gate C.2 — Canonical Deliverables Inventory (34 High-Fidelity Items)

**Document Version:** 2.0 (Complete 34/34 Canonical Inventory)  
**Role:** Lead Product Designer & UX Architect  
**Platform:** Saad Studio (AI Microdrama & Long-form Film Production Platform)  
**Status:** Canonical Gate C Inventory 100% Complete & Verified  

---

## 1. حصر وثائق المواصفات الهندسية (Specification Documents — 7 Docs)
1. `gate_c_high_fidelity_spec.md`: المواصفة المعمارية والبصرية الشاملة وثنائية اللغة.
2. `gate_c_component_states.md`: مصفوفة حالات المكونات والبيانات التشغيلية والمالية.
3. `gate_c_interactions.md`: دليل التفاعلات المصغرة ومحددات الحركة.
4. `gate_c_accessibility.md`: معايير إمكانية الوصول والتوافق مع WCAG 2.1 AA.
5. `gate_c_handoff.md`: وثيقة التسليم الفني الموجهة لـ Codex ومهندسي الواجهة.
6. `inventory.md`: الحصر الكنسي الشامل للمخرجات بمعرفات دلالية فريدة.
7. `coverage_matrix.md`: مصفوفة التغطية والتتبع بنسبة 100% بين Gate B و Gate C.

---

## 2. حصر ملفات الـ SVG عالية الدقة المعتمدة (34 Canonical High-Fidelity SVGs):

### أ) الشاشات الرئيسية (`screens/` — 9 ملفات):
1. `SCR-01_hero_launcher.svg`: صفحة البداية المقفولة مع مشغل المشاريع.
2. `SCR-02_workbench_shell.svg`: هيكل مساحة العمل (42% يسار / 58% يمين).
3. `SCR-02A_workbench_settings.svg`: تبويب الإعدادات والتموضع وشبكة الستايلات الـ 16.
4. `SCR-02B_workbench_outline.svg`: تبويب المخطط المشهدي وبطاقة الحلقة بحقولها الـ 8 والمدد الخمس.
5. `SCR-02C_workbench_characters.svg`: تبويب الشخصيات وبصمات الصوت وقفل الـ Seed.
6. `SCR-02D_workbench_locations.svg`: تبويب المواقع والبيئات ونمط الإضاءة.
7. `SCR-02E_workbench_elements.svg`: تبويب الأدوات والمركبات وتتبع الملكية.
8. `SCR-03_production_studio.svg`: غرفة الإنتاج السينمائي والمشغل والتايم لاين.
9. `SCR-04_shared_project_board.svg`: اللوحة المشتركة بالمنصة مرتبطة بـ `projectId`.

### ب) الحالات الانتقالية والمراحل الداخلية (`states/` — ملفان):
10. `STA-01_preparing_state.svg`: الحالة الانتقالية المؤقتة لمعالجة الفكرة وتحميل المسودة.
11. `SUB-01_assembly_export_stage.svg`: مرحلة التجميع الداخلي السبع والرندر النهائي.

### ج) اللوحات والأدراج والمفتشات (`panels/` — 10 ملفات):
12. `PNL-01_agent_panel_conversation.svg`: لوحة محادثة مخرج الذكاء الاصطناعي مع حقل الإدخال المثبت.
13. `PNL-02_memory_drawer_9layers.svg`: درج ذاكرة المشروع المكون من 9 طبقات سيادية.
14. `PNL-03_creative_tools_rail.svg`: سكة الأدوات الإبداعية التسع (Scope, Pin, Inherit, Override).
15. `PNL-04_continuity_inspector.svg`: مفتش الاستمرارية للأبعاد السبعة مع التثبيت.
16. `PNL-05A_storyboard_keyframes_strip.svg`: شريط الستوريبورد المدمج (Keyframes Only).
17. `PNL-05B_storyboard_full_workspace.svg`: مساحة الستوريبورد الموسعة (Full Storyboard).
18. `PNL-06A_timeline_hierarchy.svg`: التايم لاين الهرمي LTR (Scene ──► Beat ──► Shot ──► Take).
19. `PNL-06B_timeline_audio_tracks.svg`: المسارات الصوتية السبعة المخصصة LTR.
20. `PNL-07_project_switcher_header.svg`: مبدل المشاريع في الهيدر مع مؤشرات المهام الجارية.
21. `PNL-08_credit_cost_inspector.svg`: مفتش الكريدت والتكلفة ومراقبة سقف المشروع.

### د) النوافذ المنبثقة والمودالز (`modals/` — 11 ملفاً):
22. `MDL-01_proposal_diff_card.svg`: بطاقة اقتراح التعديل المشهدي (Before / After Diff).
23. `MDL-02_prompt_format_switch.svg`: نافذة تغيير صيغة البرومبت (Natural, Storyboard, Script).
24. `MDL-03_credit_quote_confirm.svg`: نافذة تأكيد الـ Quote وحجز الرصيد الديناميكي.
25. `MDL-04_invalid_selector_resolver.svg`: نافذة حل تعارض النماذج والأبعاد والمدد.
26. `MDL-05_take_version_comparison.svg`: نافذة مقارنة المحاولات والنسخ جنباً إلى جنب.
27. `MDL-06_new_project_modal.svg`: نافذة إنشاء مشروع جديد وتعيين `projectId`.
28. `MDL-07_all_projects_overlay.svg`: أوفرلاي تصفح وبحث وفلترة كافة المشاريع وسلة المحذوفات.
29. `MDL-08_save_copy_as_modal.svg`: نافذة حفظ نسخة مستقلة بـ `projectId` جديد وسجل تكلفة نظيف.
30. `MDL-09_conflict_resolver_modal.svg`: نافذة حل تعارض الحفظ المتزامن بين الجلسات والأجهزة.
31. `MDL-10_archive_delete_modal.svg`: نافذة تأكيد الأرشفة والحذف المرن والاستعادة.
32. `MDL-11_completion_receipt_modal.svg`: إيصال اكتمال العملية والتسوية المالية والاسترداد التلقائي.

### هـ) المكونات الرئيسية (`components/` — ملف واحد):
33. `CMP-01_project_card_states.svg`: الحالات الـ 8 لبطاقة المشروع (Draft, Planning, Prod, BG Job, Conflict, Complete, Archive, Trash).

### و) المواصفات النظامية والتجاوب (`system/` — ملف واحد):
34. `SYS-01_responsive_comparison.svg`: مقارنة استجابة الشاشات على مقاسات Desktop: `1280px` و `1440px` و `1920px`.
