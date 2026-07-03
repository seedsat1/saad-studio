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

const WINDOWS_PATH_PATTERN = /[a-z]:[\\/][^\r\n]+/i;

function normalizeArabic(value: string): string {
  return (value || "")
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627")
    .replace(/\u0649/g, "\u064a")
    .replace(/\u0629/g, "\u0647")
    .replace(/[^\p{L}\p{N}:\\/.\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isStaticPageRequest(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  const normalized = normalizeArabic(prompt);
  const hasLocalPath = WINDOWS_PATH_PATTERN.test(prompt);
  const createVerb = /\b(create|build|make|design|write|generate|implement|setup|set up)\b/i.test(lower)
    || /(?:^|\s)(?:اريد|ابي|احتاج|سوي|سوه|اعمل|اصنع|صمم|ابني|اكتب|انشئ|انشاء|جهز|اشتغل)(?:\s|$)/.test(normalized);
  const pageTarget = /\b(page|website|landing|html|frontend|interface|ui)\b/i.test(lower)
    || /(?:صفحه|صفحات|موقع|واجهه|واجهة|ويب|فرونت|تصميم|فريم)/.test(normalized);

  return createVerb && (pageTarget || hasLocalPath);
}

function inferPageTitle(prompt: string): string {
  const normalized = normalizeArabic(prompt);
  if (/(موبيلات|موبايلات|هواتف|phone|phones|mobile|mobiles)/i.test(prompt) || /موبيلات|موبايلات|هواتف/.test(normalized)) {
    return "AI Mobile Showcase";
  }
  if (/(portfolio|بورتفوليو|اعمالي|اعمال)/i.test(prompt) || /بورتفوليو|اعمالي|اعمال/.test(normalized)) {
    return "Portfolio Page";
  }
  if (/(pricing|prices|اسعار|تسعير|credits|كردت|كريدت)/i.test(prompt) || /اسعار|تسعير|كردت|كريدت/.test(normalized)) {
    return "Pricing Page";
  }
  if (/(gallery|صور|معرض)/i.test(prompt) || /معرض|صور/.test(normalized)) {
    return "Gallery Page";
  }
  return "Interactive Landing Page";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildStaticPage(title: string, prompt: string): Record<string, string> {
  const safeTitle = escapeHtml(title);
  const safePrompt = escapeHtml(prompt);
  const html = `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeTitle}</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <main class="page-shell">
      <section class="hero">
        <p class="eyebrow">Saad Studio</p>
        <h1>${safeTitle}</h1>
        <p class="lead">صفحة عملية ومتجاوبة تم إنشاؤها داخل الفولدر المطلوب. تحتوي حالات عرض واضحة ومكونات قابلة للتطوير.</p>
        <div class="hero-actions">
          <a href="#content" class="primary-action">ابدأ التصفح</a>
          <button id="themeToggle" type="button">بدّل النمط</button>
        </div>
      </section>

      <section id="content" class="feature-grid" aria-label="Page sections">
        <article>
          <span>01</span>
          <h2>Loading State</h2>
          <p>مساحة جاهزة لحالة التحميل حتى تبقى تجربة المستخدم واضحة أثناء جلب البيانات.</p>
        </article>
        <article>
          <span>02</span>
          <h2>Error State</h2>
          <p>تصميم يعرض الخطأ بشكل مفهوم بدل ترك الصفحة فارغة أو مكسورة.</p>
        </article>
        <article>
          <span>03</span>
          <h2>Empty State</h2>
          <p>حالة فارغة مرتبة تشرح للمستخدم شنو الخطوة التالية.</p>
        </article>
      </section>

      <section class="preview-panel">
        <div>
          <p class="eyebrow">Original Request</p>
          <p>${safePrompt}</p>
        </div>
        <div class="metric-card">
          <strong>100%</strong>
          <span>Responsive Layout</span>
        </div>
      </section>
    </main>
    <script src="./script.js"></script>
  </body>
</html>
`;

  const css = `:root {
  color-scheme: dark;
  --bg: #07111f;
  --panel: rgba(15, 23, 42, 0.82);
  --panel-strong: rgba(15, 23, 42, 0.96);
  --text: #f8fbff;
  --muted: #9fb4cc;
  --line: rgba(148, 163, 184, 0.2);
  --cyan: #38d6ff;
  --blue: #4f8cff;
}

* { box-sizing: border-box; }

html { font-size: 16px; }

body {
  margin: 0;
  min-height: 100vh;
  font-family: Inter, "Segoe UI", Tahoma, Arial, sans-serif;
  background:
    radial-gradient(circle at 10% 10%, rgba(56, 214, 255, 0.18), transparent 30rem),
    radial-gradient(circle at 90% 0%, rgba(79, 140, 255, 0.16), transparent 28rem),
    var(--bg);
  color: var(--text);
}

body.light {
  --bg: #eef6ff;
  --panel: rgba(255, 255, 255, 0.78);
  --panel-strong: #ffffff;
  --text: #07111f;
  --muted: #516176;
  --line: rgba(15, 23, 42, 0.14);
}

.page-shell {
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto;
  padding: clamp(24px, 5vw, 64px) 0;
}

.hero,
.preview-panel,
.feature-grid article {
  border: 1px solid var(--line);
  background: var(--panel);
  backdrop-filter: blur(18px);
  box-shadow: 0 22px 80px rgba(0, 0, 0, 0.24);
}

.hero {
  border-radius: 28px;
  padding: clamp(28px, 6vw, 64px);
}

.eyebrow {
  color: var(--cyan);
  font-weight: 800;
  letter-spacing: 0.08em;
  margin: 0 0 12px;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: clamp(2.4rem, 7vw, 6rem);
  line-height: 1;
}

.lead {
  color: var(--muted);
  font-size: clamp(1rem, 2vw, 1.2rem);
  line-height: 1.9;
  max-width: 740px;
}

.hero-actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
}

.primary-action,
button {
  border-radius: 14px;
  border: 1px solid var(--line);
  color: var(--text);
  font: inherit;
  font-weight: 800;
  padding: 12px 18px;
  text-decoration: none;
}

.primary-action {
  background: linear-gradient(135deg, var(--cyan), var(--blue));
  color: #03111f;
}

button {
  background: var(--panel-strong);
  cursor: pointer;
}

.feature-grid {
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 18px;
}

.feature-grid article {
  border-radius: 22px;
  padding: 24px;
}

.feature-grid span {
  color: var(--cyan);
  font-weight: 900;
}

.feature-grid h2 {
  margin: 14px 0 10px;
}

.feature-grid p,
.preview-panel p {
  color: var(--muted);
  line-height: 1.8;
}

.preview-panel {
  align-items: center;
  border-radius: 24px;
  display: grid;
  gap: 20px;
  grid-template-columns: 1fr auto;
  margin-top: 18px;
  padding: 24px;
}

.metric-card {
  background: linear-gradient(135deg, rgba(56, 214, 255, 0.14), rgba(79, 140, 255, 0.16));
  border: 1px solid var(--line);
  border-radius: 20px;
  min-width: 180px;
  padding: 22px;
  text-align: center;
}

.metric-card strong {
  display: block;
  font-size: 2.4rem;
}

.metric-card span {
  color: var(--muted);
}

@media (max-width: 760px) {
  .feature-grid,
  .preview-panel {
    grid-template-columns: 1fr;
  }
}
`;

  const js = `const toggle = document.getElementById("themeToggle");
toggle?.addEventListener("click", () => {
  document.body.classList.toggle("light");
});
`;

  const readme = `# ${title}

Generated by Saad Agent internal workspace executor.

Original request:

${prompt}

Generated files:

- index.html
- styles.css
- script.js
- README.md
`;

  return {
    "index.html": html,
    "styles.css": css,
    "script.js": js,
    "README.md": readme
  };
}

export class InternalWorkspaceExecutor {
  static canHandle(prompt: string): boolean {
    return isStaticPageRequest(prompt);
  }

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
      const files = buildStaticPage(title, request.prompt);
      const writtenFiles: string[] = [];

      for (const [fileName, content] of Object.entries(files)) {
        const targetPath = path.join(workspacePath, fileName);
        const result = await TrustedWorkspaceRuntime.writeFile(targetPath, content, true);
        writtenFiles.push(result.path);
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
          "تمام سعد، أنشأت الصفحة فعلياً داخل الفولدر المطلوب.",
          "",
          "الملفات المكتوبة:",
          ...writtenFiles.map((file) => `- ${file}`),
          "",
          "هذا تنفيذ داخلي مباشر للصفحات الثابتة حتى ما يتوقف الشغل إذا Codex CLI غير مربوط من Electron."
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
          "ما قدرت أنشئ الصفحة داخلياً.",
          "",
          "السبب:",
          error
        ].join("\n")
      };
    }
  }
}
