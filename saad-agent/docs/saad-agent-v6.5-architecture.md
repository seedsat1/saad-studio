# Saad Studio Agent v6.5 Architecture Reference

This reference records the implemented v6.5 desktop-agent architecture. It is documentation for real services in `src/`; it is not a promise of model fine-tuning. Current knowledge learning means persistent retrieval/indexing, engineering memory, and vision-summary storage.

## Cognitive And Multi-Layer RAG Engine

```mermaid
flowchart TD
  A["User Prompt / التوجيه"] --> B["Prompt Shield / حامي النوايا التقنية"]
  B --> C["Cognitive Orchestrator / المنسق الذهني"]

  C --> D["Intent Engine / محرك النوايا الدلالي"]
  C --> E["Goal Manager / مدير الأهداف والتطور"]
  C --> F["Conversation State / محرك حالة الحوار"]
  C --> G["Topic Detector / كاشف تحول الموضوع"]

  D --> H["Rule Engine / محرك القواعد التأسيسية"]
  E --> I["User Memory / مدير الذاكرة الشخصية"]
  F --> J["Decision Memory ADRs / ذاكرة القرارات المعمارية"]

  H --> K["Knowledge RAG Pipeline / طبقة المعرفة المستقلة"]
  I --> L["Project Code Index / فهرس الكود المصنف"]
  J --> M["Dependency Graph / شجرة التبعيات والروابط"]

  K --> N["Task Memory Planner / منظم المهام المتسلسلة"]
  L --> O["Engineering Orchestrator / المنسق الهندسي"]
  M --> P["Parallel Execution / التنفيذ الموازي"]

  N --> Q["Validation Pipeline / طبقة التحقق والمراجعة"]
  O --> R["Self Review Engine / محرك النقد الذاتي"]
  Q --> S["Desktop UI Output / واجهة المستخدم"]
  R --> S
  P --> S
```

## 11-Step Automated Workflow

```mermaid
flowchart TD
  A["Task / طلب المستخدم"] --> B["1 Detect Task Type / كشف نوع المهمة"]
  B --> C["11-Step Pipeline / خط التنفيذ التشغيلي الآلي"]
  C --> D["2 Load Related Skills Only / تحميل المهارات الخاصة بالمهمة"]
  D --> E["3 Load Project Rules / تحميل قواعد المشروع"]
  E --> F["4 Load Related ADRs / تحميل القرارات المعمارية"]
  F --> G["5 Load Previous Bugs / تحميل الأخطاء السابقة"]
  G --> H["6 Load Relevant Code Files / تحميل الملفات ذات الصلة"]
  H --> I["7 Build Execution Plan / بناء خطة التنفيذ"]
  I --> J["8 Approval Before Major Edits / طلب الموافقة للتعديلات"]
  J --> K["9 Apply Code Changes / تطبيق التعديلات برمجيا"]
  K --> L["10 Run Validation Pipeline / تشغيل طبقة فحص الكود"]
  L --> M["11 Save Progress To Task Memory / حفظ النتائج بالذاكرة"]
  M --> N["Execution Output / إنجاز المهمة"]
```

## Continuous Self-Healing Pipeline

```mermaid
flowchart TD
  A["Task / طلب المستخدم"] --> B["1 Impact Analysis / تقدير التأثير والمخاطر"]
  B --> C["v6.5 Pipeline / خط التنفيذ التشغيلي والتعافي الآلي"]
  C --> D["2 Expected Outcome Card / بناء الخطة وتحديد النتيجة"]
  D --> E["3 Tool Orchestrator Selection / تحديد الأدوات الديناميكية"]
  E --> F["4 Execution Engine Strategy / استراتيجية التنفيذ"]
  F --> G{"5 Review & Approval / المراجعة والموافقة الشفافة"}
  G -->|Approved / موافقة| H["6 Apply Changes / تطبيق التعديلات برمجيا"]
  H --> I["7 Runtime Verification TS, Lint, Build / فحص التشغيل الحقيقي"]
  I -->|Success / نجاح| J["8 Execution History DB / توثيق السجل في قواعد البيانات"]
  I -->|Failure / فشل| K["9 Recovery Engine Rollback & Retry / محرك التعافي الذاتي"]
  J --> L["Task Complete / إنجاز المهمة بنجاح"]
  K --> M["Ask User Guidance / طلب إرشادات المستخدم"]
```

## Implemented Service Inventory

- `intent-engine.ts`: multilingual routing for memory, workspace, web, code, debug, image, and generation intents.
- `cognitive-orchestrator.ts`: top-level cognitive routing, diagnostic reports, tool selection, and state integration.
- `tool-orchestrator.ts`: tool selection across filesystem, git, terminal, browser, Brave, MCP, and Docker categories.
- `operational-skill-pipeline.ts`: 11-step task execution workflow.
- `execution-engine.ts`: execution strategies and parallel execution coordination.
- `validation-pipeline.ts`: real TypeScript/build/lint validation commands.
- `recovery-engine.ts`: checkpoint/stash-based recovery fallback.
- `execution-history.ts`: persistent execution log at `.saad-agent/history/execution-db.json`.
- `brave-answers.ts`: live Brave Answers integration when configured with a secret-managed API key.
- `workspace-watcher.ts`: chokidar workspace watcher with 500ms debounce.
- `settings-manager.ts`: persistent providers, models, MCP, skills, and runtime configuration.
- `secrets-manager.ts`: encrypted secret references; secrets are not stored in Settings JSON.
- `knowledge-ingestion.ts`: local chunking plus deterministic vector index stored in `.saad-agent/knowledge/vector-index.json`.

## Current Production Boundaries

- The system does not fine-tune models.
- Local semantic retrieval is implemented through deterministic embeddings and JSON persistence, not an external vector database.
- PDF and connector ingestion remain future sources unless a concrete parser/connector is wired.
- Secret-like files and values are excluded from retrieval and index storage.
