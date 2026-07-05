import * as path from "path";
import * as fsp from "fs/promises";
import { ExecutionTraceEmitter } from "./execution-trace-emitter.js";
import { TrustedWorkspaceRuntime } from "./trusted-workspace-runtime.js";

export interface InternalWorkspaceExecutorRequest {
  taskId: string;
  conversationId: string;
  workspacePath: string;
  prompt: string;
  attachmentCount?: number;
  attachmentNames?: string[];
  readableAttachmentContext?: string;
}

export interface InternalWorkspaceExecutorResult {
  handled: boolean;
  success: boolean;
  response: string;
  files: string[];
  error?: string;
}

const WINDOWS_PATH_PATTERN = /[a-z]:[\\/][^\r\n]+/i;
const PACKAGED_RUNTIME_MARKERS = [
  "/release-production-v4/win-unpacked",
  "/win-unpacked/resources",
  "/resources/app-asar-work"
];

function normalizePathForPolicy(value: string): string {
  return path.resolve(value || ".").replace(/\\/g, "/").toLowerCase();
}

function isPackagedRuntimeWorkspace(value: string): boolean {
  const normalized = normalizePathForPolicy(value);
  const baseName = path.basename(normalized);
  return baseName === "win-unpacked" || PACKAGED_RUNTIME_MARKERS.some((marker) => normalized.includes(marker));
}

function buildBlockedResponse(reason: string, details: string[] = []): InternalWorkspaceExecutorResult {
  return {
    handled: true,
    success: false,
    files: [],
    error: reason,
    response: [
      "\u0648\u0642\u0641\u062a \u0627\u0644\u062a\u0646\u0641\u064a\u0630 \u0642\u0628\u0644 \u0623\u064a \u0643\u062a\u0627\u0628\u0629 \u0645\u0644\u0641\u0627\u062a.",
      "",
      "\u0627\u0644\u0633\u0628\u0628:",
      reason,
      ...(details.length ? ["", "\u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644:", ...details.map((detail) => `- ${detail}`)] : []),
      "",
      "\u0647\u0630\u0627 \u0627\u0644\u0645\u0646\u0639 \u0645\u062a\u0639\u0645\u062f \u062d\u062a\u0649 \u0645\u0627 \u0623\u062f\u0639\u064a \u0623\u0646\u064a \u0642\u0631\u0623\u062a \u0645\u0631\u0641\u0642 \u0623\u0648 \u0623\u0643\u062a\u0628 \u062f\u0627\u062e\u0644 \u0641\u0648\u0644\u062f\u0631 \u062a\u0634\u063a\u064a\u0644 \u0627\u0644\u062a\u0637\u0628\u064a\u0642."
    ].join("\n")
  };
}

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
  const hasReadableApiSpec = /(?:openapi|paths:|operationId:|summary:|\/[A-Za-z0-9_{}./:-]+:\s*(?:\r?\n|\s{2,}(?:get|post|put|patch|delete):))/i.test(prompt);
  const createVerb = /\b(create|build|make|design|write|generate|implement|setup|set up)\b/i.test(lower)
    || /(?:^|\s)(?:\u0627\u0631\u064a\u062f|\u0627\u0628\u064a|\u0627\u062d\u062a\u0627\u062c|\u0633\u0648\u064a|\u0633\u0648\u0647|\u0627\u0639\u0645\u0644|\u0627\u0635\u0646\u0639|\u0635\u0645\u0645|\u0627\u0628\u0646\u064a|\u0627\u0643\u062a\u0628|\u0627\u0646\u0634\u0626|\u0627\u0646\u0634\u0621|\u0627\u0646\u0634\u0627|\u0627\u0646\u0634\u0627\u0621|\u062c\u0647\u0632|\u0627\u0634\u062a\u063a\u0644)(?:\s|$)/.test(normalized);
  const pageTarget = /\b(page|website|landing|html|frontend|interface|ui|gallery)\b/i.test(lower)
    || /(?:\u0635\u0641\u062d\u0647|\u0635\u0641\u062d\u0629|\u0635\u0641\u062d\u0627\u062a|\u0645\u0648\u0642\u0639|\u0648\u0627\u062c\u0647\u0647|\u0648\u0627\u062c\u0647\u0629|\u0648\u064a\u0628|\u0641\u0631\u0648\u0646\u062a|\u062a\u0635\u0645\u064a\u0645|\u062a\u0648\u0644\u064a\u062f|\u0627\u0644\u062a\u0648\u0644\u064a\u062f|\u0641\u0631\u064a\u0645|\u0645\u0639\u0631\u0636)/.test(normalized);

  return createVerb && (pageTarget || hasLocalPath || hasReadableApiSpec);
}

function inferSpecTitle(prompt: string): string {
  const markdownTitle = extractFirstMatch(prompt, /^#\s+(.+)$/m, "");
  if (markdownTitle) {
    return markdownTitle.replace(/\s+openapi\s+specification\s*$/i, "").trim();
  }

  const yamlTitle = extractFirstMatch(prompt, /^\s*title:\s*["']?([^"'\r\n]+)["']?\s*$/mi, "");
  if (yamlTitle) {
    return yamlTitle.trim();
  }

  const operationId = extractFirstMatch(prompt, /^\s*operationId:\s*["']?([^"'\r\n]+)["']?\s*$/mi, "");
  if (operationId) {
    return operationId
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
      .trim();
  }

  return "";
}

function inferPageTitle(prompt: string): string {
  const specTitle = inferSpecTitle(prompt);
  if (specTitle && /(?:openapi|paths:|operationId:|summary:|\/[a-z0-9_{}./:-]+:)/i.test(prompt)) {
    return `${specTitle} Generation Console`;
  }

  const normalized = normalizeArabic(prompt);
  if (/(phone|phones|mobile|mobiles)/i.test(prompt) || /(?:\u0645\u0648\u0628\u064a\u0644\u0627\u062a|\u0645\u0648\u0628\u0627\u064a\u0644\u0627\u062a|\u0647\u0648\u0627\u062a\u0641)/.test(normalized)) {
    return "AI Mobile Showcase";
  }
  if (/portfolio/i.test(prompt) || /(?:\u0628\u0648\u0631\u062a\u0641\u0648\u0644\u064a\u0648|\u0627\u0639\u0645\u0627\u0644\u064a|\u0627\u0639\u0645\u0627\u0644)/.test(normalized)) {
    return "Portfolio Page";
  }
  if (/(pricing|prices|credits)/i.test(prompt) || /(?:\u0627\u0633\u0639\u0627\u0631|\u062a\u0633\u0639\u064a\u0631|\u0643\u0631\u062f\u062a|\u0643\u0631\u064a\u062f\u062a)/.test(normalized)) {
    return "Pricing Page";
  }
  if (/gallery/i.test(prompt) || /(?:\u0645\u0639\u0631\u0636|\u0635\u0648\u0631|\u0627\u0644\u0635\u0648\u0631)/.test(normalized)) {
    return "Gallery Page";
  }
  return "Interactive Landing Page";
}

function extractFirstMatch(value: string, pattern: RegExp, fallback = ""): string {
  const match = value.match(pattern);
  return match?.[1]?.trim() || fallback;
}

function extractEndpointSpec(prompt: string): { title: string; endpoint: string; method: string; summary: string } {
  const title = inferSpecTitle(prompt) || inferPageTitle(prompt);
  const endpoint = extractFirstMatch(
    prompt,
    /^\s{0,8}(\/[A-Za-z0-9_{}./:-]+):\s*$/m,
    "/api/v1/generate"
  );
  const endpointIndex = prompt.indexOf(`${endpoint}:`);
  const endpointBlock = endpointIndex >= 0 ? prompt.slice(endpointIndex, endpointIndex + 1600) : prompt;
  const method = extractFirstMatch(endpointBlock, /^\s{2,10}(get|post|put|patch|delete):\s*$/mi, "post").toUpperCase();
  const summary = extractFirstMatch(
    endpointBlock,
    /^\s*summary:\s*["']?([^"'\r\n]+)["']?\s*$/mi,
    extractFirstMatch(prompt, /^\s*description:\s*["']?([^"'\r\n]+)["']?\s*$/mi, title)
  );
  return { title, endpoint, method, summary };
}
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildStaticPage(title: string, prompt: string): Record<string, string> {
  const spec = extractEndpointSpec(prompt);
  const safeTitle = escapeHtml(title);
  const safePrompt = escapeHtml(prompt);
  const safeEndpoint = escapeHtml(spec.endpoint);
  const safeMethod = escapeHtml(spec.method);
  const safeSummary = escapeHtml(spec.summary);
  const html = `<!doctype html>
<html lang="en">
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
        <p class="lead">A responsive generation interface built from the supplied requirements. It treats attached API/OpenAPI text as page requirements, not as a request to execute generation immediately.</p>
        <div class="hero-actions">
          <a href="#generator" class="primary-action">Open Generator</a>
          <button id="themeToggle" type="button">Toggle Theme</button>
        </div>
      </section>

      <section id="generator" class="generator-panel" aria-label="Generation console">
        <div class="panel-heading">
          <p class="eyebrow">${safeMethod} ${safeEndpoint}</p>
          <h2>${safeSummary}</h2>
          <p>Configure a request payload locally, then copy it into your real backend integration when provider credentials are available.</p>
        </div>
        <form id="generationForm" class="generation-form">
          <label>
            Prompt
            <textarea id="promptInput" rows="5" placeholder="Describe the video you want to generate..."></textarea>
          </label>
          <label>
            Negative Prompt
            <textarea id="negativePromptInput" rows="3" placeholder="Optional exclusions..."></textarea>
          </label>
          <div class="form-grid">
            <label>
              Aspect Ratio
              <select id="aspectRatioInput">
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
                <option value="1:1">1:1</option>
              </select>
            </label>
            <label>
              Mode
              <select id="modeInput">
                <option value="std">Standard</option>
                <option value="pro">Pro</option>
              </select>
            </label>
            <label>
              Duration
              <select id="durationInput">
                <option value="5">5 seconds</option>
                <option value="10">10 seconds</option>
              </select>
            </label>
          </div>
          <button type="submit">Build Request Payload</button>
        </form>
        <pre id="payloadPreview" class="payload-preview" aria-live="polite">Submit the form to preview the request payload.</pre>
      </section>

      <section id="content" class="feature-grid" aria-label="Page sections">
        <article>
          <span>01</span>
          <h2>Loading</h2>
          <p>Use while the provider is preparing a generation job or waiting for backend response.</p>
        </article>
        <article>
          <span>02</span>
          <h2>Error</h2>
          <p>Show API, validation, or provider failures clearly without hiding technical detail.</p>
        </article>
        <article>
          <span>03</span>
          <h2>Empty</h2>
          <p>Show before the first generation payload is created or when no results exist yet.</p>
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

.generator-panel {
  border: 1px solid var(--line);
  background: var(--panel);
  border-radius: 24px;
  display: grid;
  gap: 22px;
  margin-top: 18px;
  padding: 24px;
}

.panel-heading h2 {
  margin: 0 0 10px;
  font-size: clamp(1.6rem, 3vw, 2.6rem);
}

.panel-heading p {
  color: var(--muted);
  line-height: 1.8;
}

.generation-form {
  display: grid;
  gap: 16px;
}

label {
  color: var(--muted);
  display: grid;
  font-weight: 800;
  gap: 8px;
}

textarea,
select {
  background: rgba(3, 10, 22, 0.68);
  border: 1px solid var(--line);
  border-radius: 14px;
  color: var(--text);
  font: inherit;
  min-width: 0;
  padding: 12px 14px;
}

textarea {
  resize: vertical;
}

.form-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.payload-preview {
  background: rgba(3, 10, 22, 0.72);
  border: 1px solid var(--line);
  border-radius: 18px;
  color: #d9f6ff;
  margin: 0;
  max-height: 320px;
  overflow: auto;
  padding: 18px;
  white-space: pre-wrap;
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

const form = document.getElementById("generationForm");
const preview = document.getElementById("payloadPreview");
form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const payload = {
    endpoint: "${spec.endpoint}",
    method: "${spec.method}",
    body: {
      prompt: document.getElementById("promptInput")?.value || "",
      negative_prompt: document.getElementById("negativePromptInput")?.value || "",
      aspect_ratio: document.getElementById("aspectRatioInput")?.value || "16:9",
      mode: document.getElementById("modeInput")?.value || "std",
      duration: Number(document.getElementById("durationInput")?.value || 5)
    }
  };
  if (preview) {
    preview.textContent = JSON.stringify(payload, null, 2);
  }
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
    const promptForRouting = request.readableAttachmentContext?.trim()
      ? [request.prompt, request.readableAttachmentContext].join("\n\n")
      : request.prompt;

    if (!isStaticPageRequest(promptForRouting)) {
      return { handled: false, success: false, response: "", files: [] };
    }

    if ((request.attachmentCount || 0) > 0 && !request.readableAttachmentContext?.trim()) {
      return buildBlockedResponse(
        "\u0627\u0644\u0637\u0644\u0628 \u064a\u0639\u062a\u0645\u062f \u0639\u0644\u0649 \u0645\u0631\u0641\u0642\u0627\u062a\u060c \u0648\u0627\u0644\u0645\u0646\u0641\u0630 \u0627\u0644\u062f\u0627\u062e\u0644\u064a \u0627\u0644\u0633\u0631\u064a\u0639 \u0644\u0627 \u064a\u0642\u0631\u0623 \u0645\u062d\u062a\u0648\u0649 \u0627\u0644\u0645\u0631\u0641\u0642\u0627\u062a.",
        [
          "\u0645\u0645\u0646\u0648\u0639 \u0625\u0646\u0634\u0627\u0621 \u0635\u0641\u062d\u0629 \u0639\u0627\u0645\u0629 \u0625\u0630\u0627 \u0643\u0627\u0646 \u0627\u0644\u0637\u0644\u0628 \u064a\u062d\u062a\u0627\u062c \u0645\u062d\u062a\u0648\u0649 \u0627\u0644\u0645\u0631\u0641\u0642.",
          "\u0644\u0627\u0632\u0645 \u064a\u0646\u0641\u0630\u0647 \u0645\u0633\u0627\u0631 \u0647\u0646\u062f\u0633\u064a \u064a\u0642\u0631\u0623 \u0627\u0644\u0645\u0631\u0641\u0642 \u0623\u0648 \u064a\u0631\u0641\u0636 \u0628\u0648\u0636\u0648\u062d."
        ]
      );
    }

    if (isPackagedRuntimeWorkspace(request.workspacePath)) {
      return buildBlockedResponse(
        "\u0627\u0644\u0645\u0633\u0627\u0631 \u0627\u0644\u0646\u0634\u0637 \u0647\u0648 \u0641\u0648\u0644\u062f\u0631 \u062a\u0634\u063a\u064a\u0644 \u0627\u0644\u062a\u0637\u0628\u064a\u0642 packaged runtime\u060c \u0645\u0648 \u0641\u0648\u0644\u062f\u0631 \u0645\u0634\u0631\u0648\u0639.",
        [
          `Workspace: ${request.workspacePath}`,
          "\u0627\u062e\u062a\u0631 \u0641\u0648\u0644\u062f\u0631 \u0645\u0634\u0631\u0648\u0639 \u062d\u0642\u064a\u0642\u064a \u0623\u0648 \u0645\u0633\u0627\u0631 \u0645\u062e\u0635\u0635 \u0644\u0644\u0635\u0641\u062d\u0629 \u062e\u0627\u0631\u062c win-unpacked."
        ]
      );
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

      const executionPrompt = request.readableAttachmentContext?.trim()
        ? [request.prompt, request.readableAttachmentContext].join("\n\n")
        : request.prompt;
      const title = inferPageTitle(executionPrompt);
      const files = buildStaticPage(title, executionPrompt);
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
          "\u062a\u0645\u0627\u0645 \u0633\u0639\u062f\u060c \u0623\u0646\u0634\u0623\u062a \u0627\u0644\u0635\u0641\u062d\u0629 \u0641\u0639\u0644\u064a\u0627\u064b \u062f\u0627\u062e\u0644 \u0627\u0644\u0641\u0648\u0644\u062f\u0631 \u0627\u0644\u0645\u0637\u0644\u0648\u0628.",
          "",
          "\u0627\u0644\u0645\u0644\u0641\u0627\u062a \u0627\u0644\u0645\u0643\u062a\u0648\u0628\u0629:",
          ...writtenFiles.map((file) => `- ${file}`)
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
          "\u0645\u0627 \u0642\u062f\u0631\u062a \u0623\u0646\u0634\u0626 \u0627\u0644\u0635\u0641\u062d\u0629 \u062f\u0627\u062e\u0644\u064a\u0627\u064b.",
          "",
          "\u0627\u0644\u0633\u0628\u0628:",
          error
        ].join("\n")
      };
    }
  }
}

