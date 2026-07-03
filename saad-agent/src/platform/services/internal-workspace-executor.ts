import * as path from "path";
import * as fsp from "fs/promises";
import { ExecutionTraceEmitter } from "./execution-trace-emitter.js";
import { TrustedWorkspaceRuntime } from "./trusted-workspace-runtime.js";

export interface InternalWorkspaceExecutorRequest {
  taskId: string;
  conversationId: string;
  workspacePath: string;
  prompt: string;
}

export interface InternalWorkspaceExecutorResult {
  handled: boolean;
  success: boolean;
  response: string;
  files: string[];
  error?: string;
}

function normalizeText(value: string): string {
  return (value || "")
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

function isStaticPageRequest(prompt: string): boolean {
  const normalized = normalizeText(prompt);
  const hasCreateVerb = /(انش|انشاء|انشئ|انشء|نشئ|نشي|تنشئ|تنشي|سوي|سوّي|اعمل|اصنع|صمم|جهز|ابني|create|build|make|design)/i.test(normalized);
  const hasPageTarget = /(صفحه|موقع|واجهه|واجهة|landing|page|website|html|ويب|فرونت|front)/i.test(normalized);
  return hasCreateVerb && hasPageTarget;
}

function inferPageTitle(prompt: string): string {
  const normalized = normalizeText(prompt);
  if (/موديلات|الوان|الوان اي|colors|palette|model/.test(normalized)) {
    return "AI Color Models";
  }
  if (/بورتفوليو|portfolio/.test(normalized)) return "Portfolio Page";
  if (/لاندنك|landing/.test(normalized)) return "Landing Page";
  return "Interactive Page";
}

function buildInteractivePage(title: string, prompt: string): Record<string, string> {
  const isColorPage = title === "AI Color Models";
  const heading = isColorPage ? "موديلات ألوان AI" : "صفحة تفاعلية";
  const subtitle = isColorPage
    ? "واجهة عملية لتجربة موديلات ألوان، توليد لوحات، ومقارنة أساليب التصميم."
    : "واجهة ثابتة تفاعلية أنشأها Saad Agent داخل الفولدر المطلوب.";

  const html = `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${heading}</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <main class="app-shell">
      <section class="hero">
        <p class="eyebrow">Saad Studio Agent</p>
        <h1>${heading}</h1>
        <p class="lead">${subtitle}</p>
        <div class="hero-actions">
          <button id="generatePalette" type="button">ولّد لوحة جديدة</button>
          <button id="toggleTheme" type="button" class="secondary">بدّل النمط</button>
        </div>
      </section>

      <section class="workspace-grid" aria-label="AI color models">
        <article class="control-panel">
          <h2>تحكم سريع</h2>
          <label>
            نوع التصميم
            <select id="styleSelect">
              <option value="brand">هوية بصرية</option>
              <option value="product">منتج رقمي</option>
              <option value="cinematic">سينمائي</option>
              <option value="minimal">Minimal</option>
            </select>
          </label>
          <label>
            شدة التباين
            <input id="contrastRange" type="range" min="10" max="90" value="55" />
          </label>
          <p id="paletteNote" class="note">اختار النمط واضغط توليد حتى تشوف نتيجة مختلفة.</p>
        </article>

        <article class="preview-card">
          <div class="preview-header">
            <span id="activeStyle">Brand</span>
            <strong>Live Preview</strong>
          </div>
          <div id="palette" class="palette"></div>
          <div class="sample-card">
            <span>AI Model</span>
            <h3 id="sampleTitle">Color Intelligence</h3>
            <p>ألوان متناسقة للاستخدام بالواجهات، الهويات، والبوسترات.</p>
          </div>
        </article>
      </section>

      <section class="models">
        <article>
          <h3>Brand Harmony</h3>
          <p>يناسب الهويات البصرية النظيفة والتطبيقات التجارية.</p>
        </article>
        <article>
          <h3>Neon Focus</h3>
          <p>ألوان قوية للواجهات الحديثة ومشاريع الذكاء الاصطناعي.</p>
        </article>
        <article>
          <h3>Soft Editorial</h3>
          <p>مناسب للعروض، المقالات، وصفحات المنتجات الهادئة.</p>
        </article>
      </section>
    </main>
    <script src="./script.js"></script>
  </body>
</html>
`;

  const css = `:root {
  color-scheme: dark;
  --bg: #07111f;
  --panel: rgba(15, 27, 45, 0.84);
  --text: #f7fbff;
  --muted: #9fb4cc;
  --line: rgba(122, 168, 255, 0.22);
  --accent: #37c7ff;
  --accent-2: #9d6cff;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  font-family: Inter, "Segoe UI", Tahoma, Arial, sans-serif;
  background:
    radial-gradient(circle at top left, rgba(55, 199, 255, 0.18), transparent 36rem),
    radial-gradient(circle at bottom right, rgba(157, 108, 255, 0.2), transparent 34rem),
    var(--bg);
  color: var(--text);
}

.app-shell {
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto;
  padding: 48px 0;
}

.hero {
  padding: 40px;
  border: 1px solid var(--line);
  border-radius: 28px;
  background: linear-gradient(135deg, rgba(14, 26, 44, 0.92), rgba(11, 16, 30, 0.76));
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.32);
}

.eyebrow {
  margin: 0 0 12px;
  color: var(--accent);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: clamp(2.4rem, 6vw, 5.8rem);
  line-height: 1;
}

.lead {
  max-width: 720px;
  margin: 20px 0 0;
  color: var(--muted);
  font-size: 1.1rem;
  line-height: 1.9;
}

.hero-actions,
.preview-header {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

button,
select,
input {
  font: inherit;
}

button,
select {
  border: 1px solid var(--line);
  color: var(--text);
  background: #0d1b2d;
  border-radius: 14px;
}

button {
  cursor: pointer;
  padding: 12px 18px;
}

button:first-child {
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  border-color: transparent;
  color: #03111f;
  font-weight: 800;
}

.hero-actions {
  margin-top: 28px;
}

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(240px, 0.8fr) minmax(320px, 1.2fr);
  gap: 18px;
  margin-top: 18px;
}

.control-panel,
.preview-card,
.models article {
  border: 1px solid var(--line);
  background: var(--panel);
  border-radius: 22px;
  padding: 24px;
}

label {
  display: grid;
  gap: 10px;
  margin-top: 18px;
  color: var(--muted);
}

select {
  width: 100%;
  padding: 12px 14px;
}

input[type="range"] {
  width: 100%;
}

.note {
  color: var(--muted);
  line-height: 1.7;
}

.preview-header {
  justify-content: space-between;
  color: var(--muted);
}

.palette {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  margin: 24px 0;
}

.swatch {
  min-height: 110px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  display: flex;
  align-items: end;
  padding: 10px;
  color: white;
  font-weight: 800;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.55);
}

.sample-card {
  padding: 24px;
  border-radius: 22px;
  background: linear-gradient(135deg, rgba(55, 199, 255, 0.16), rgba(157, 108, 255, 0.2));
}

.sample-card span {
  color: var(--accent);
}

.sample-card p {
  color: var(--muted);
  line-height: 1.8;
}

.models {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  margin-top: 18px;
}

.models p {
  color: var(--muted);
  line-height: 1.7;
}

body.light {
  --bg: #eef6ff;
  --panel: rgba(255, 255, 255, 0.86);
  --text: #0a1324;
  --muted: #506176;
  --line: rgba(40, 90, 160, 0.2);
}

@media (max-width: 780px) {
  .hero {
    padding: 28px;
  }

  .workspace-grid,
  .models {
    grid-template-columns: 1fr;
  }

  .palette {
    grid-template-columns: repeat(2, 1fr);
  }
}
`;

  const js = `const paletteElement = document.getElementById("palette");
const styleSelect = document.getElementById("styleSelect");
const contrastRange = document.getElementById("contrastRange");
const activeStyle = document.getElementById("activeStyle");
const sampleTitle = document.getElementById("sampleTitle");
const paletteNote = document.getElementById("paletteNote");

const palettes = {
  brand: ["#37C7FF", "#0B1020", "#F7FBFF", "#9D6CFF", "#00E0A4"],
  product: ["#245BFF", "#111827", "#F59E0B", "#E5F0FF", "#10B981"],
  cinematic: ["#0A0A0A", "#EAB308", "#7F1D1D", "#F5F5DC", "#1D4ED8"],
  minimal: ["#111827", "#F8FAFC", "#CBD5E1", "#64748B", "#38BDF8"]
};

function renderPalette() {
  const selected = styleSelect.value;
  const colors = palettes[selected];
  const contrast = Number(contrastRange.value);
  activeStyle.textContent = selected.toUpperCase();
  sampleTitle.textContent = selected === "brand" ? "Brand Harmony" : selected === "cinematic" ? "Cinematic Mood" : selected === "minimal" ? "Minimal System" : "Product UI";
  paletteNote.textContent = "التباين الحالي: " + contrast + "%. اللوحة جاهزة للتجربة.";
  paletteElement.innerHTML = "";
  colors.forEach((color) => {
    const swatch = document.createElement("div");
    swatch.className = "swatch";
    swatch.style.background = color;
    swatch.textContent = color;
    paletteElement.appendChild(swatch);
  });
}

document.getElementById("generatePalette").addEventListener("click", () => {
  const keys = Object.keys(palettes);
  styleSelect.value = keys[Math.floor(Math.random() * keys.length)];
  contrastRange.value = String(20 + Math.floor(Math.random() * 70));
  renderPalette();
});

document.getElementById("toggleTheme").addEventListener("click", () => {
  document.body.classList.toggle("light");
});

styleSelect.addEventListener("change", renderPalette);
contrastRange.addEventListener("input", renderPalette);
renderPalette();
`;

  const readme = `# ${heading}

Generated by Saad Agent internal workspace executor.

Original request:

${prompt}

Files:

- index.html
- styles.css
- script.js
`;

  return {
    "index.html": html,
    "styles.css": css,
    "script.js": js,
    "README.md": readme
  };
}

export class InternalWorkspaceExecutor {
  static async tryExecute(request: InternalWorkspaceExecutorRequest): Promise<InternalWorkspaceExecutorResult> {
    if (!isStaticPageRequest(request.prompt)) {
      return { handled: false, success: false, response: "", files: [] };
    }

    const startedAt = Date.now();
    try {
      await TrustedWorkspaceRuntime.ensureDefaultWorkspace(request.workspacePath);
      const workspacePath = await TrustedWorkspaceRuntime.assertTrustedPath(request.workspacePath);
      await fsp.mkdir(workspacePath, { recursive: true });

      ExecutionTraceEmitter.emit({
        taskId: request.taskId,
        conversationId: request.conversationId,
        phase: "internal_executor",
        status: "active",
        label: "Internal static page executor started",
        safeDetails: { workspacePath },
        sourceService: "InternalWorkspaceExecutor"
      });

      const title = inferPageTitle(request.prompt);
      const files = buildInteractivePage(title, request.prompt);
      const writtenFiles: string[] = [];

      for (const [fileName, content] of Object.entries(files)) {
        const targetPath = path.join(workspacePath, fileName);
        const result = await TrustedWorkspaceRuntime.writeFile(targetPath, content, true);
        writtenFiles.push(result.path.replace(/\\/g, "/"));
      }

      ExecutionTraceEmitter.emit({
        taskId: request.taskId,
        conversationId: request.conversationId,
        phase: "internal_executor",
        status: "done",
        label: "Static page files written",
        safeDetails: {
          fileCount: writtenFiles.length,
          durationMs: Date.now() - startedAt
        },
        sourceService: "InternalWorkspaceExecutor"
      });

      return {
        handled: true,
        success: true,
        files: writtenFiles,
        response: [
          "تم إنشاء الصفحة فعلياً داخل الفولدر المطلوب.",
          "",
          "الملفات التي انكتبت:",
          ...writtenFiles.map((file) => `- ${file}`),
          "",
          "هذا تنفيذ داخلي محدود للصفحات الثابتة لأن Codex CLI الحالي غير قابل للتشغيل من Electron على جهازك."
        ].join("\n")
      };
    } catch (err: any) {
      const error = err?.message || String(err);
      ExecutionTraceEmitter.emit({
        taskId: request.taskId,
        conversationId: request.conversationId,
        phase: "internal_executor",
        status: "failed",
        label: "Internal static page executor failed",
        error,
        sourceService: "InternalWorkspaceExecutor"
      });
      return {
        handled: true,
        success: false,
        files: [],
        error,
        response: [
          "فشل التنفيذ الداخلي لإنشاء الصفحة.",
          "",
          "السبب:",
          error
        ].join("\n")
      };
    }
  }
}
