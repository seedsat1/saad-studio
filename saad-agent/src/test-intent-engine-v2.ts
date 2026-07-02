import assert from "assert";
import { IntentEngine, type SupportedIntent } from "./platform/services/intent-engine.js";

type Case = {
  prompt: string;
  expected: SupportedIntent;
  session?: string;
  min?: number;
};

const engine = new IntentEngine();

const cases: Case[] = [
  { prompt: "احفظ هذا", expected: "memory_save", min: 0.9 },
  { prompt: "حفظ هذه القاعدة", expected: "memory_save", min: 0.9 },
  { prompt: "تذكر اسمي سعد", expected: "memory_save", min: 0.9 },
  { prompt: "خزن هذه المعلومة", expected: "memory_save", min: 0.9 },
  { prompt: "سجل هذا القرار", expected: "memory_save", min: 0.9 },
  { prompt: "remember this fact", expected: "memory_save", min: 0.9 },
  { prompt: "save this note", expected: "memory_save", min: 0.9 },
  { prompt: "store this rule", expected: "memory_save", min: 0.9 },
  { prompt: "درب نفسك على هذا الملف", expected: "training_ingest", min: 0.9 },
  { prompt: "درب نفسك على الصورة", expected: "training_ingest", min: 0.9 },
  { prompt: "تدريب على هذا المرفق", expected: "training_ingest", min: 0.9 },
  { prompt: "احفظه كمرجع", expected: "training_ingest", min: 0.9 },
  { prompt: "استخدم هذا الملف كمرجع", expected: "training_ingest", min: 0.9 },
  { prompt: "train on this file", expected: "training_ingest", min: 0.9 },
  { prompt: "learn from this reference", expected: "training_ingest", min: 0.9 },
  { prompt: "ingest this document", expected: "training_ingest", min: 0.9 },
  { prompt: "ما الذي دربتك عليه؟", expected: "memory_recall", min: 0.9 },
  { prompt: "شنو تتذكر عني", expected: "memory_recall", min: 0.9 },
  { prompt: "من أنا؟", expected: "memory_recall", min: 0.9 },
  { prompt: "منو اني", expected: "memory_recall", min: 0.9 },
  { prompt: "ما اسمي", expected: "memory_recall", min: 0.9 },
  { prompt: "what did I train you on?", expected: "memory_recall", min: 0.9 },
  { prompt: "what do you remember about me", expected: "memory_recall", min: 0.9 },
  { prompt: "اشرح البروتوكول الذي حفظته", expected: "knowledge_lookup", min: 0.9 },
  { prompt: "وضح القاعدة التي حفظتها", expected: "knowledge_lookup", min: 0.85 },
  { prompt: "اشرح اللي دربتك عليه قبل", expected: "knowledge_lookup", min: 0.85 },
  { prompt: "explain the saved protocol", expected: "knowledge_lookup", min: 0.85 },
  { prompt: "lookup trained knowledge about providers", expected: "knowledge_lookup", min: 0.85 },
  { prompt: "اعرض جميع البروتوكولات التدريبية", expected: "knowledge_list", min: 0.9 },
  { prompt: "اظهر كل المراجع", expected: "knowledge_list", min: 0.85 },
  { prompt: "اذكر جميع التدريبات", expected: "knowledge_list", min: 0.85 },
  { prompt: "list trained knowledge", expected: "knowledge_list", min: 0.85 },
  { prompt: "show training references", expected: "knowledge_list", min: 0.85 },
  { prompt: "كم صفحة داخل المشروع؟", expected: "workspace_scan", min: 0.9 },
  { prompt: "شكد ملفات بالمشروع؟", expected: "workspace_scan", min: 0.85 },
  { prompt: "عدد routes داخل project", expected: "workspace_scan", min: 0.85 },
  { prompt: "how many pages are in the project", expected: "workspace_scan", min: 0.85 },
  { prompt: "scan workspace files", expected: "workspace_scan", min: 0.85 },
  { prompt: "أين يوجد Gallery؟", expected: "workspace_query", min: 0.85 },
  { prompt: "وين القى صفحة Gallery", expected: "workspace_query", min: 0.85 },
  { prompt: "اين يوجد ملف provider", expected: "workspace_query", min: 0.85 },
  { prompt: "where is Gallery", expected: "workspace_query", min: 0.85 },
  { prompt: "find in project pricing", expected: "workspace_query", min: 0.85 },
  { prompt: "افتح صفحة Gallery", expected: "project_navigation", min: 0.85 },
  { prompt: "اذهب الى ملف settings", expected: "project_navigation", min: 0.85 },
  { prompt: "open provider file", expected: "project_navigation", min: 0.85 },
  { prompt: "navigate to dashboard page", expected: "project_navigation", min: 0.85 },
  { prompt: "انشئ صفحة Login", expected: "code_generation", min: 0.85 },
  { prompt: "اصنع component جديد", expected: "code_generation", min: 0.85 },
  { prompt: "سوي API route", expected: "code_generation", min: 0.85 },
  { prompt: "اكتب function لحساب credits", expected: "code_generation", min: 0.85 },
  { prompt: "create Gallery page", expected: "code_generation", min: 0.85 },
  { prompt: "build a React component", expected: "code_generation", min: 0.85 },
  { prompt: "عدل هذا الكود", expected: "code_modification", min: 0.85 },
  { prompt: "غير الاسم فقط", expected: "code_modification", min: 0.85 },
  { prompt: "بدل الموديل", expected: "code_modification", min: 0.85 },
  { prompt: "حدث provider settings", expected: "code_modification", min: 0.85 },
  { prompt: "modify this file", expected: "code_modification", min: 0.85 },
  { prompt: "refactor the model client", expected: "code_modification", min: 0.85 },
  { prompt: "أصلح هذا الخطأ", expected: "bug_fix", min: 0.9 },
  { prompt: "صلح مشكلة الرد", expected: "bug_fix", min: 0.85 },
  { prompt: "حل خطأ LM Studio", expected: "bug_fix", min: 0.85 },
  { prompt: "fix this error", expected: "bug_fix", min: 0.85 },
  { prompt: "debug provider failure", expected: "bug_fix", min: 0.85 },
  { prompt: "راجع هذا الكود", expected: "code_review", min: 0.9 },
  { prompt: "افحص الملف", expected: "code_review", min: 0.85 },
  { prompt: "دقق الكود", expected: "code_review", min: 0.85 },
  { prompt: "review this code", expected: "code_review", min: 0.85 },
  { prompt: "audit this diff", expected: "code_review", min: 0.85 },
  { prompt: "اشرح معمارية المشروع", expected: "architecture_question", min: 0.85 },
  { prompt: "وضح بنية النظام", expected: "architecture_question", min: 0.85 },
  { prompt: "ما هو architecture pipeline", expected: "architecture_question", min: 0.85 },
  { prompt: "explain system design", expected: "architecture_question", min: 0.85 },
  { prompt: "ابحث عن آخر إصدار Next.js", expected: "external_research", min: 0.85 },
  { prompt: "ابحث في الانترنت عن Ollama", expected: "external_research", min: 0.9 },
  { prompt: "احدث إصدار React", expected: "external_research", min: 0.85 },
  { prompt: "search web for latest Electron", expected: "external_research", min: 0.85 },
  { prompt: "latest OpenAI model", expected: "external_research", min: 0.85 },
  { prompt: "حلل هذه الصورة", expected: "vision_analysis", min: 0.9 },
  { prompt: "افحص السكرين شوت", expected: "vision_analysis", min: 0.85 },
  { prompt: "شوف الصورة", expected: "vision_analysis", min: 0.85 },
  { prompt: "analyze image", expected: "vision_analysis", min: 0.85 },
  { prompt: "inspect screenshot", expected: "vision_analysis", min: 0.85 },
  { prompt: "ترجم هذا النص", expected: "translation", min: 0.9 },
  { prompt: "ترجمه للعربي", expected: "translation", min: 0.85 },
  { prompt: "translate this to English", expected: "translation", min: 0.85 },
  { prompt: "اهلا", expected: "conversation", min: 0.75 },
  { prompt: "هلا شلونك", expected: "conversation", min: 0.75 },
  { prompt: "hello", expected: "conversation", min: 0.75 },
  { prompt: "thanks", expected: "conversation", min: 0.75 },
  { prompt: "مو هذا", expected: "code_modification", session: "follow-1", min: 0.7 },
  { prompt: "كمل", expected: "code_generation", session: "follow-2", min: 0.7 },
  { prompt: "الثاني", expected: "code_generation", session: "follow-3", min: 0.7 },
  { prompt: "هذا", expected: "code_generation", session: "follow-4", min: 0.7 },
  { prompt: "رجع مثل قبل", expected: "code_modification", session: "follow-5", min: 0.7 },
  { prompt: "لا تعدل الباقي", expected: "code_modification", session: "follow-6", min: 0.7 },
  { prompt: "بس هذا", expected: "code_modification", session: "follow-7", min: 0.7 },
  { prompt: "تمام كمل", expected: "code_generation", session: "follow-8", min: 0.7 },
  { prompt: "مو هيج", expected: "code_modification", session: "follow-9", min: 0.7 },
  { prompt: "موضوع ثاني", expected: "conversation", session: "topic-switch", min: 0.7 },
  { prompt: "Create Gallery page", expected: "code_generation", session: "inherit-gallery", min: 0.85 },
  { prompt: "غير الاسم فقط", expected: "code_modification", session: "inherit-gallery", min: 0.85 },
  { prompt: "Create Login page", expected: "code_generation", session: "login-flow", min: 0.85 },
  { prompt: "Add Forgot Password", expected: "code_generation", session: "login-flow", min: 0.75 },
  { prompt: "Move button", expected: "code_modification", session: "login-flow", min: 0.7 },
  { prompt: "Use Glass UI", expected: "code_modification", session: "login-flow", min: 0.7 },
  { prompt: "Now make it responsive", expected: "code_modification", session: "login-flow", min: 0.7 },
];

for (const session of ["follow-1", "follow-2", "follow-3", "follow-4", "follow-5", "follow-6", "follow-7", "follow-8", "follow-9"]) {
  engine.classifyIntent("Create Gallery page", session);
}

for (const item of cases) {
  const result = engine.classifyIntent(item.prompt, item.session || `case-${cases.indexOf(item)}`);
  assert.equal(
    result.intent,
    item.expected,
    `Prompt "${item.prompt}" expected ${item.expected} but got ${result.intent} (${result.reason})`
  );
  assert.ok(
    result.confidence >= (item.min || 0.7),
    `Prompt "${item.prompt}" confidence ${result.confidence} below ${item.min || 0.7}`
  );
  assert.ok(result.matchedPattern, `Prompt "${item.prompt}" did not report matchedPattern`);
  assert.ok(result.reason, `Prompt "${item.prompt}" did not report reason`);
  assert.ok(result.selectedPipeline, `Prompt "${item.prompt}" did not report selectedPipeline`);
  assert.ok(Array.isArray(result.selectedTools), `Prompt "${item.prompt}" did not report selectedTools`);
}

const diagnostics = engine.getDiagnostics(engine.classifyIntent("أصلح هذا الخطأ", "diag"));
for (const required of [
  "Detected Intent",
  "Confidence",
  "Matched Pattern",
  "Conversation Context Used",
  "Reason",
  "Selected Pipeline",
  "Selected Tools",
]) {
  assert.ok(diagnostics.includes(required), `Diagnostics missing ${required}`);
}

console.log(`Intent Engine v2 routing tests passed (${cases.length} cases).`);
