# مرجع Saad Studio لتكامل Premiere وReap

## Saad Agent Settings Management Center behavior (2026-06-28)

- Settings is the central management center for the packaged Saad Agent desktop app. It is not a cosmetic preferences dialog.
- Permanent main interface scope is limited to productivity: Chat, Workspace, Attachments, Running Tasks, Current Models, and Notifications.
- Provider, SDK, MCP, diagnostics, memory, security, backup, execution, connector, and advanced configuration must live inside Settings instead of remaining permanently visible in the main chat workspace.
- Settings navigation uses grouped desktop-app information architecture inspired by Cursor, VS Code, JetBrains IDEs, Claude Desktop, and Figma: Application, AI Runtime, Engineering, Creative, Operations, and System.
- Required Settings sections are: General, Workspace, Models, Providers, Agents, Skills, Tools, Connectors, MCP, Creative AI, Vision, Knowledge & Memory, Execution, Security, Backups, Diagnostics, and Advanced.
- Providers management must support add, remove, edit, enable/disable, test connection, health status, API key, endpoint URL, organization, default provider, priority order, and fallback provider. Supported visible providers include Ollama, LM Studio, OpenAI, Anthropic, Gemini, OpenRouter, and Saad Studio.
- Models are configured independently by role: Coding Model, Vision Model, Reviewer Model, and Fast Model. Each role stores provider, model name, temperature, max tokens, context window, streaming, timeout, and retry count.
- Current implementation is UI-state based for the redesign pass; persistence should later route through `SettingsManager` and encrypted secret storage.

## Saad Agent Agent SDK, Plugin SDK & MCP Integration behavior (2026-06-28)

- Phase 22 transforms Saad Agent into an extensible platform without modifying core code.
- Public `BaseAgentSDK` (`saad-agent/src/sdk/agent-sdk.ts`) exposes standard metadata and lifecycle hooks (`initialize`, `activate`, `deactivate`, `execute`, `dispose`).
- `PluginSDK` (`saad-agent/src/sdk/plugin-sdk.ts`) enforces sandboxed permission validation (`filesystem.read/write`, `network.read/write`, `provider.use`, `connector.use`, `workspace.modify`).
- `MCPClient` (`saad-agent/src/sdk/mcp-client.ts`) implements Model Context Protocol integration for discovering local/remote MCP servers, tools, and resources without executing remote code without explicit user approval.
- `ExtensionRegistry` (`saad-agent/src/sdk/extension-registry.ts`) manages dynamic extension points for custom agents, skills, connectors, creative providers, and tools with state toggling.
- UI renders an interactive `ExtensionsPanel` in the right engineering sidebar featuring Installed Extensions and Discovered MCP Servers.

## Saad Agent Windows Packaging & Release Hardening behavior (2026-06-28)

- Phase 21 prepares Saad Agent for Windows desktop distribution (`Saad Agent.exe`) using `electron-builder` with NSIS installer and portable targets.
- Production boot flow (`StartupManager`) sequentially loads settings, restores crash/workspace snapshots, and initializes skills/connectors with safe recovery fallbacks.
- Diagnostics bundle exporter (`DiagnosticsExporter`) exports structured JSON archives (`.saad-agent/exports/`) with automatic secret/token redaction (`[REDACTED_SECRET]`).
- Auto-updater architecture (`AutoUpdaterPlaceholder`) provides offline mock interfaces for update checking and downloads.
- Release hardening maintains strict IPC isolation (`contextIsolation: true`, `nodeIntegration: false`) and zero credential leaks.

## Saad Agent Production Platform & Engineering Standards behavior (2026-06-28)

- Phase 20 establishes permanent Engineering Standards (`saad-agent/src/standards/`) governing coding conventions, UI guidelines, architecture boundaries, code review checklists, user preferences, and non-negotiable decision policies (never modify `.env`, mandatory checkpoints).
- Production Platform infrastructure (`saad-agent/src/production/`) includes `CrashRecoveryManager` (automatic state snapshot restoration), local `DiagnosticsService` (OS, Node/Python runtimes, memory, connector health), structured `Logger` (exportable JSON logs), `BackupManager` (`.saad-agent/backups/`), `SettingsManager`, and real-time `PerformanceMonitor` (CPU, memory, context tokens).
- Security & Approval enforcement: Production mode strictly preserves explicit user approval workflows, checkpoint rollbacks, and secret isolation in encrypted connector storage.
- UI renders an interactive `ProductionPanel` in the right engineering sidebar featuring Diagnostics, Metrics, Standards, and Backup management tabs.

## Saad Agent Skills System & Domain Expertise Layer behavior (2026-06-28)

- Phase 19 introduces a modular Skills System (`saad-agent/src/skills/`) loading domain expertise guidelines dynamically without prompt bloat.
- `SkillRegistry` manages 12 initial built-in engineering skills (TypeScript, React, Next.js, Electron, Python, FFmpeg, Supabase, Backblaze B2, Vercel, Creative Design, Prompt Engineering, Adobe Premiere CEP).
- Matching is performed dynamically via task keywords and affected file patterns (`matchSkillsForTask`). Matched skill guidelines are automatically injected into the `ContextEngine` RAG context candidates as high-priority candidates.
- Security and control constraints: Skills contain purely static engineering guidelines and domain rules; they never store credentials or execute code directly. Tool execution remains strictly governed by the Orchestrator.
- UI renders a compact `SkillsPanel` in the right engineering sidebar displaying available skills, active task matches, confidence percentages, and activation reasons.

## Saad Agent Creative AI & Product Integration behavior (2026-06-28)

- Phase 18 introduces a modular Creative AI Engine (`saad-agent/src/creative/`) and Saad Studio product integration supporting text-to-image and placeholders for image-to-image, editing, and storyboarding.
- Provider interface (`CreativeProvider`) supports `local`, `saad_studio`, and future cloud types. `SaadStudioCreativeProvider` connects via first-party internal API shapes with safe mock fallback when unconfigured.
- Strict explicit user approval is mandatory before any generation job starts. Uncontrolled paid API calls, auto-spending credits, auto-publishing, and code deployment are strictly blocked.
- Generated assets are stored locally under `.saad-agent/attachments/generated/` with complete JSON metadata tracking (asset ID, prompt, model, seed, resolution, local path, timestamp, and cost).
- EventBus dispatches: `CreativePlanCreated`, `GenerationApprovalRequired`, `GenerationStarted`, `GenerationProgressUpdated`, `GenerationCompleted`, `GenerationFailed`, and `GeneratedAssetStored`.
- UI renders interactive chat cards for Creative Plan, Generation Approval, Progress, and Generated Assets.

## Saad Agent Context Engine & RAG behavior (2026-06-28)

- Phase 17 adds a read-only Context Engine used before planner/reasoning execution. The pipeline is: user request -> workspace analysis -> knowledge search -> engineering memory search -> dependency search -> architecture search -> attachment search -> context ranking -> token budget -> Reasoning Engine.
- Retrieval sources are `.saad-agent/knowledge/architecture.json`, `.saad-agent/knowledge/dependency-graph.json`, `.saad-agent/knowledge/project-summary.json`, Engineering Memory decisions/failures/successes/knowledge records, selected source files, attachment metadata, workspace statistics, and recent modification events.
- The implementation is split under `saad-agent/src/context/`: `context-engine.ts`, `retrieval-engine.ts`, `semantic-search.ts`, `ranking-engine.ts`, `token-optimizer.ts`, and `context-types.ts`. `platform/services/context-engine.ts` remains the compatibility service used by Electron IPC and Planner.
- Ranking includes filename/title similarity, symbol matches, dependency relationships, semantic token overlap, previous engineering decisions, task history, recent modifications, and workspace scope.
- Token optimization must not exceed the selected model/context limit. It preserves architecture, decision/failure/success memory, and dependency context first, trimming preserved high-priority content only when needed.
- Security filtering excludes `.env`, credentials, API keys, tokens, cookies, private keys, encrypted secret storage, and paths/files whose names indicate secrets. Memory content is scrubbed before storage and context assembly.
- The UI shows Context cards for retrieved files, engineering memory matches, previous decisions, previous failures, previous successes, architecture references, dependency references, token usage, compression summary, and ranking examples. It must not expose internal prompts.
- Project memory writes use sequential atomic JSON saves with short retries to avoid transient Windows file-lock failures while updating `.saad-agent/knowledge`.

## Admin provider balance monitor behavior (2026-06-27)

- `/admin` reads supplier balance/cost cards from `/api/admin/provider-balances`.
- The API returns a structured `providers[]` list for KIE, Google AI Studio, BytePlus Ark, WaveSpeed, and Backblaze B2, while preserving legacy `kie` and `wavespeed` fields for `/admin/pricing`.
- KIE and WaveSpeed use server-side provider balance APIs when their API keys are configured.
- Google AI Studio and BytePlus Ark are not scraped from browser console pages. They show numeric values only from explicit server environment values such as `GOOGLE_BILLING_USAGE_USD`, `GOOGLE_AI_STUDIO_COST_USD`, `BYTEPLUS_ARK_BALANCE_USD`, or `BYTEPLUS_ARK_USAGE_USD`; otherwise the UI shows `UNAVAILABLE` and links to the provider billing page.
- Dashboard values must never be guessed. Manual env-driven amounts are marked `MANUAL` in the UI.
- Backblaze B2 caps are read only from explicit env values: `BACKBLAZE_B2_CAP_REMAINING_USD`, or computed from `BACKBLAZE_B2_CAP_USD - BACKBLAZE_B2_USAGE_USD`; otherwise Backblaze shows `UNAVAILABLE` and links to `https://secure.backblaze.com/b2_caps_alerts.htm`.

## Website Transitions tool behavior (2026-06-27)

- `/apps/tool/transitions` uses a visible model picker for AI transition generation. Supported visible models are Kling 3.0 (`kling-3.0/video`) and Seedance Mini (`bytedance/seedance-2-mini`).
- Aspect ratio is user-selectable in the UI and is passed to generation/stitch requests.
- When both start and end inputs are videos, the tool preserves the uploaded clips and connects them with the FFmpeg stitch path instead of replacing them with AI-generated footage. Uploaded videos are validated at 5-15 seconds, and the user-selected transition duration is constrained to 1-3 seconds.
- Transition credit calculation uses central video pricing per selected AI model plus the preset multiplier. Video stitch uses a lower local transition charge because it is not an external AI video generation.

## Synchronize media source resolution diagnostics (2026-06-26)

- Timeline snapshot clip media path resolution order is fixed: first `projectItem.getMediaPath()`, then linked timeline items via `clip.getLinkedItems()`/`clip.linkedItems`, then unresolved.
- Snapshot clips expose `sourcePathResolutionMethod` as `projectItem.getMediaPath`, `linkedItem.projectItem.getMediaPath`, or `unresolved`.
- Unresolved clips expose `mediaUnavailableReason` as `nested_sequence`, `generated_clip`, `missing_project_item`, `empty_media_path`, or `unknown`.
- `buildSynchronizationPlan()` must report media-resolution diagnostics before blocking: total video/audio clips, clips with media paths, direct/linked counts, and first unresolved clips with track/index/name/reason.
- Waveform analysis must not start unless at least one real audio media path exists. Nested/generated clips are not directly analyzable unless a real underlying linked media path is resolved.

آخر مراجعة: 2026-06-22

هذا الملف هو المرجع التشغيلي المختصر للمحادثات اللاحقة. عند التعارض، تكون الأولوية للوثائق الرسمية، ثم لاختبارات Runtime المثبتة داخل Premiere، ثم للمرجع المعماري v3.1.

المرجع المحلي الكامل v3.1 هو `C:\Users\PC\Downloads\المرجع.md`. هوية النسخة المقروءة كاملة بتاريخ 2026-06-18: `25,858` بايت، `531` سطرًا، آخر تعديل `2026-06-06 01:59:15`، وSHA-256: `9D0F1DE093A0C4D19FB6F0B85F3C038F1AFA7BDF738A8C0D5E6A03789498168D`.

تنبيه حالة: قسم `PHASE N — NEXT TASK ONLY` داخل v3.1 يوثق مرحلة تاريخية سبقت التنفيذ الحالي. تبقى قواعده المعمارية وقواعد السلامة نافذة، بينما تُقرأ حالة الإنجاز من الكود الحالي و`PROJECT_CONTEXT.md` ونتائج Runtime. تم حذف Silence Removal من المنتج الحالي بتاريخ 2026-06-26 بناءً على طلب المستخدم.

## بيئة التشغيل والحقائق المعروفة

- إصدار المضيف المستهدف: **Premiere Pro 26.2.0**.
- التكامل الحالي: **CEP Extension** باستخدام ExtendScript، وليس UXP.
- **FFmpeg مطلوب** للتحليل الصوتي خارج Premiere.
- اكتشاف نشاط المتحدث في Multi-Cam يعتمد قياسات **RMS**.
- أداة **Multi-Cam Auto Switch** فعّالة. أداة **Silence Removal** محذوفة من واجهة ومسار تشغيل الإضافة حالياً.
- **Reap API** مسار منفصل عن تنفيذ المونتاج داخل Premiere.

## حالة ميزة Auto Zoom الحالية
- **Auto Zoom Status**:
  * Disabled (معطلة بالكامل)
  * Hidden from UI (مخفية من واجهة المستخدم)
  * Removed from One Click Pipeline (تمت إزالتها كلياً من خط التحرير الموحد)
  * Archived for future repair (مؤرشفة للإصلاح والتطوير المستقبلي)
  * Not part of current production workflow (ليست جزءاً من سير العمل الإنتاجي الحالي)

## فصل نطاقي العمل

- **Reap API**: خدمة خارجية لإنتاج المقاطع القصيرة، captions، reframing، dubbing، transcription والنشر الاجتماعي. ليست محرّك تبديل كاميرات الـ timeline، ولا نعتمد عليها لتحليل نشاط متحدثي Multi-Cam في الإصدار الأول.
- **Premiere CEP (Saad Studio)**: يقرأ ويعدّل مشروع Premiere عبر ExtendScript. تحليل الصوت الحقيقي يتم خارج Premiere بواسطة FFmpeg، ثم تُحوّل نتائجه إلى قرارات timeline.

## آلية Multi-Cam Auto Switch

1. قراءة الـ active sequence وتخطيط مسارات الفيديو والصوت.
2. تعيين متحدث لكل مسار صوت وكاميرا لكل مسار فيديو، دون تثبيت Host/Guest.
3. استخراج `ProjectItem.getMediaPath()` لكل مصدر صوت. لا تخمين عند غياب المسار أو وجود nested/mixed source غير مدعوم.
4. تحليل المصادر بواسطة FFmpeg (`astats`/RMS)، لأن Premiere scripting لا يوفّر RMS أو waveform أو speaker activity حقيقية.
5. تحويل زمن المصدر إلى زمن الـ timeline:
   `timelineTimeSec = clip.start.seconds + (ffmpegTimeSec - clip.inPoint.seconds)`.
6. إنشاء speaker-activity segments، ثم camera decisions مع threshold، dominance margin، hysteresis، minimum shot length، overlap/wide-shot rules.
7. محاذاة القرارات إلى frames/ticks قبل التنفيذ.
8. تطبيق التحرير فقط بعد Runtime Proof واضح. لا يوجد Razor/Split API موثّق نعتمد عليه.

## حقائق Premiere المؤكدة

- `Sequence.clone()` ينشئ نسخة ويعيد Boolean وفق مرجع Sequence الرسمي؛ يجب العثور على النسخة الناتجة عبر فرق `sequenceID`/عدد sequences، لا التعامل مع قيمة الإرجاع ككائن Sequence.
- `Sequence.insertClip(projectItem, time, vTrackIndex, aTrackIndex)` و`Sequence.overwriteClip(...)` موثقتان، لكن يلزم اختبار Runtime قبل الاعتماد الإنتاجي.
- `TrackItem.disabled` يعطل المقطع كاملًا، وليس جزءًا زمنيًا داخله؛ لذلك لا يحل وحده مشكلة مقطع كاميرا طويل غير مقسّم.
- `clip.start/end` زمن timeline، و`clip.inPoint/outPoint` زمن المصدر.
- `sequence.timebase` هو ticks per frame، وثابت Premiere هو `254016000000` ticks/second.
- لا نفترض دعم تبديل multicam angles برمجيًا، ولا نخلط كود UXP مع CEP.
- JSX يجب أن يقتصر على قراءة/كتابة Premiere وإرجاع JSON؛ FFmpeg ومنطق القرارات يبقيان في طبقة TypeScript مستقلة.

## السلوك الحالي الذي وصل إليه التطوير

- توجد ملاحة وأداة Multi-Cam Auto Switch داخل إضافة CEP. Silence Removal محذوفة من الواجهة الحالية.
- Synchronize يقرن TrackItems الصوتية والمرئية بحسب مسار المصدر نفسه، لا بحسب تساوي رقم V مع رقم A، ثم يحلل waveform خارج Premiere.
- تحليل Synchronize يمتد حتى 15 دقيقة ويستخدم بحث ارتباط خشن بدقة 1 ثانية ثم دقيق بدقة 0.1 ثانية. اتجاه lag المعتمد هو `targetStart = referenceStart - lag`.
- توثيق Premiere يعرّف `TrackItem.move(Time)` كإزاحة نسبية، لكن Runtime في 26.2.0 أعطى `Invalid parameter` للإزاحة أو عاد دون تغيير الزمن عند تمرير موضع مطلق؛ لذلك لا يعتمد Synchronize عليه.
- إذا نتج start سالب لمصدر صحيح، تُزاح المجموعة المتزامنة كلها للأمام. التطبيق يكتب `TrackItem.start/end` الموثقتين read/write بالقيم المطلقة مع حفظ المدة والتحقق من القيم بعد الكتابة.
- يمنع Synchronize التطبيق إذا كانت ثقة الارتباط أقل من `0.35` أو كانت الإزاحة المطلوبة أكبر من حد الأمان `30` ثانية (SYNC_OFFSET_OUT_OF_RANGE) أو كان موضع البداية المقترح سالبًا/غير صالح، ويتحقق من `clip.start` بعد النقل بهامش 0.05 ثانية.
- عداد `Applied` في الواجهة يحسب التسجيلات/الأزواج المتزامنة، بما فيها المرجع، ولا يعرض عدد TrackItems الصوتية والمرئية التي تحركت داخليًا. تبقى `clipsMoved` في نتيجة Runtime عدادًا تقنيًا للتشخيص.
- تم إثبات هذا السلوك داخل Premiere Runtime بتاريخ 2026-06-18: حالة أربعة تسجيلات متزامنة عرضت `Applied: 4 clips` بنجاح.
- تدقيق 2026-06-23 ثبّت رفع حد الثقة إلى `0.35` كمعيار قبول، وإضافة جدول معاينة ما قبل التطبيق بالواجهة لعرض الإزاحات وقيم الثقة والأسباب لضمان المعاينة الآمنة قبل تحريك التايملاين. كما تم إخراج خطوة المزامنة مؤقتاً من خط التحرير الموحد One Click (ليعمل بمسار: Duplicate -> Multi-Cam Auto Switch -> Auto Captions) حتى تمام استقرارها. وتمت ترقية دقة المزامنة عبر خوارزمية القمم المتعددة (Multi-Candidate Peaks) بدلاً من اختيار أعلى قمة مطلقة؛ حيث يتم فحص أعلى 5 قمم ترشيحية دقيقة، وتطبيق قاعدة Near/Far (أولوية للـ +/- 15 ثانية) لمنع التقاط إزاحات عشوائية بعيدة في المناخات الصامتة إلا بفارق ثقة ضخم يزيد عن 0.15.
- التنفيذ الحالي يستخدم `createSubClip` و`overwriteClip` لإعادة بناء أجزاء مطلوبة بدل Razor غير الموجود.
- السلوك الحالي في worktree ينظّم العناصر المولّدة في Project Panel تحت bin رئيسي باسم `Saad Studio - <Premiere Project Name>` ثم bin فرعي للأدوات النشطة مثل `Multi-Cam Auto Switch`.
- عند تشغيل الأداة، تُنقل العناصر القديمة المعروفة من جذر المشروع إلى bin الأداة المناسب.
- Multi-Cam يمنع إعادة Apply على sequence يحمل marker ` - Saad Auto Switch Draft`. لم يعد هناك مسار Silence Removal يعتمد على معالجة Draft الـMulti-Cam.
- إخراج Multi-Cam على duplicate يفضّل video track فارغًا؛ عند عدم وجوده يستخدم أعلى track قابل للكتابة داخل النسخة فقط، مع warning، بدل إنشاء clone ثم الفشل وترك Draft فارغ.
- منع التكرار دفاعي في طبقتين: Host JSX يرفض Draft، والواجهة ترفض الاسم نفسه وتقفل Apply بعد أول نتيجة حتى Analyze جديد. قبل Apply تعيد الواجهة تحميل ملف JSX لضمان استخدام النسخة المثبتة.
- عناصر Runtime Proof تُفصل في bin مستقل ولا تُخلط بمخرجات الأدوات الإنتاجية.

### مرجع مقتطف Synchronization المرفق

- المرفق `pasted-text.txt` المقروء بتاريخ 2026-06-18 حجمه `5,209` بايت وSHA-256 هو `37C89A2A048DA07202DD348F67432DD61418443BF24A728BBA04B7C9553993C2`.
- يؤكد اتجاه التنفيذ الحالي: جمع مقاطع الفيديو المتاحة ثم مطابقتها بالصوت عبر `findPairedVideoClip` ومسار المصدر، حساب `suggestedTimelineStartSec = referenceStart - estimatedLagSec`، تحويل الثقة الأقل من `0.08` إلى blocker، استدعاء `normalizeSynchronizationStarts`، ورفع حد نافذة التحليل من 45 إلى 900 ثانية.
- المرفق ناتج diff مدمج: يجمع بدائل قديمة وجديدة مكررة وتوجد فيه أقواس/تواقيع ناقصة؛ لذلك هو مرجع دلالي وليس نسخة مصدر قابلة للبناء. عند التعارض تُقدّم حالة الكود الحالي ثم Runtime Proof.

## Reap: المعلومات المحفوظة

- Base URL: `https://public.reap.video/api/v1/automation/`
- متغيرا البيئة: `REAP_API_KEY` و`REAP_API_BASE=https://public.reap.video/api/v1/automation`؛ لا تُحفظ قيمة المفتاح في المستودع أو الذاكرة.
- المصادقة: `Authorization: Bearer YOUR_API_KEY`
- الحد المعلن: 10 requests/minute/key.
- دورة الرفع: طلب presigned URL من `/get-upload-url`، رفع الملف، إنشاء project، ثم webhook أو status polling.
- يدعم clipping، captions، reframing، dubbing (80+ لغة)، transcription، والنشر/الجدولة.
- صيغ الإدخال المعلنة: MP4 أو MOV، من دقيقتين إلى 3 ساعات، وحتى 5GB.
- حالات المشروع: `queued`, `processing`, `completed`, `failed`, `invalid`, `expired`.
- webhooks مفضلة على polling في الإنتاج؛ endpoint عبر HTTPS ويرد 200 خلال 5 ثوانٍ، وخمس محاولات فاشلة تعطل webhook.
- Reap مفيد لمسار ClipCraft/short-form، لكنه لا يغيّر قواعد تنفيذ Multi-Cam داخل Premiere.

### حدود Reap وتوجيه مزودي الموديلات

- Google models تتصل بالمصدر الرسمي Google مباشرةً.
- Seedance v2 يتصل بالمصدر الرسمي BytePlus مباشرةً.
- OpenAI models تتصل بالمصدر الرسمي OpenAI مباشرةً.
- بقية موديلات الفيديو تستخدم `kie.ai` كمصدر افتراضي تلقائي.
- Reap ليس مزود توليد ولا بديلًا عن هذه المصادر؛ يقتصر على AI Clipping وAuto Reframe وCaptions وTranslation وDubbing وBrand Templates وWebhooks وSocial-ready outputs.
- يُمنع استخدام Reap لتوليد فيديو من نص أو صورة.

### بنية التخزين ودورة Reap

- Vercel للاستضافة والنشر، Clerk للمصادقة وإدارة المستخدمين، Neon قاعدة PostgreSQL الرئيسية لجميع البيانات الديناميكية، وBackblaze B2 (وقبلها Cloudflare R2 كـ legacy) لتخزين الميديا فقط.
- Neon يحفظ المستخدمين والكريديتات والاشتراكات والسجلات وبيانات التوليد وCMS وبيانات مهام Reap وحالات webhooks وmetadata الملفات، لكنه لا يحفظ ملفات الميديا نفسها.
- الصور والفيديوهات والمخرجات والملفات المولدة ونتائج Reap النهائية تحفظ في Backblaze B2 (وتظل الملفات القديمة مقروءة من Cloudflare R2).
- الملفات الكبيرة تُرفع من العميل مباشرة إلى Backblaze B2 عبر Signed URLs؛ يُمنع تمريرها عبر Next.js API routes.
- المسار المعتمد: رفع الفيديو إلى Backblaze B2 ← حفظ metadata في Neon ← إرسال رابط الفيديو إلى Reap ← استقبال webhook وتحديث الحالة ← جلب النتيجة أو حفظ رابطها ← تخزين الناتج النهائي في Backblaze B2 ← تحديث Neon بالملفات والحالة النهائية.

### آلية تسليم الميديا الاحتياطية المضمونة (Media Delivery & Resilient Fallbacks)

1. **الهدف**: تجنب تمرير كافة أحمال الميديا (الصور، الفيديوهات الكبيرة، المقاطع الصوتية) عبر Vercel لتفادي حدود الحمولة وسرعة التنزيل والمهلات، والاعتماد على تسليم مباشر من Backblaze B2 أو Cloudflare R2.
2. **سلسلة التراجع (Fallback Chain) وأوضاع تسليم ميديا المتصفح**:
   - يتم التحكم في مسار تسليم ميديا الواجهة الأمامية للمتصفح عبر متغير البيئة `BROWSER_MEDIA_URL_MODE` الذي يدعم ثلاثة أوضاع:
     - `b2` (الوضع الافتراضي الحالي للسرعة والأمان): البث المباشر والآمن من روابط Backblaze B2 العامة مباشرةً (`https://saadstudio-storage.s3.eu-central-003.backblazeb2.com`).
     - `cdn`: البث عبر CDN خارجي (مثل BunnyCDN) لزيادة سرعة التوجيه الإقليمية للشرق الأوسط والعراق ويقرأ المفتاح `BROWSER_CDN_BASE_URL`.
     - `proxy`: البث الكلاسيكي عبر خوادم البروكسي المحلية لـ Next.js `/api/media/...` (يتم تفعيله فقط كحالة طارئة أو احتياطية).
   - تظل روابط مزودي الخدمة الذكاء الاصطناعي (`resolveProviderMediaUrl()`) مستقلة تماماً وتعتمد روابط B2 المباشرة فقط.
   - **الخيار الاحتياطي للملفات القديمة**: النطاق الخام المباشر للـ R2 وهو `https://pub-3e0355a14eda4ec78c6e81b217a9a399.r2.dev` (مع استبعاد `media.saadstudio.app` حالياً بسبب مشاكل الـ DNS).
3. **تطبيق الآلية في الواجهة الأمامية للموقع**:
   - كافة العناصر (`<img>`, `<video>`, `<audio>`) والمكونات الرئيسية (مثل `VideoCanvas` و `AudioCanvas` في `AssetInspector.tsx` ومكونات `MediaGrid.tsx` وصفحة الموسيقى `music/page.tsx`) مزودة بمعالجة `onError` لتبديل الرابط تلقائياً إلى التالي في القائمة إذا تعذر تحميل الحالي.
   - يتوفر مراقب أخطاء عام (Global Capture Error Listener) in `app/layout.tsx` لاعتراض فشل تحميل أي عنصر وسائط وتبديله حياً لمنع تجميد واجهات المستخدم.
4. **تطبيق الآلية في إضافة Premiere CEP**:
   - دالة `downloadAsset` في `src/lib/api.ts` تقوم بمحاولة التحميل بشكل متكرر (Retry Loop) عبر سلسلة التراجع مع تمرير `isDownload = true` لتمكين البروكسي كخيار أخير عند الحاجة.
   - يتم إلحاق مراقب أخطاء عام على مستوى النافذة (Global Event Listener) في `main.ts` لتبديل مصادر العناصر المولدة بصرياً في الإضافة عند الفشل.
5. **ضوابط حماية API البروكسي**:
   - يرفض مسار `/api/proxy-image` تماماً بروكسي ملفات الفيديو (400 Bad Request) ويفحص ذلك بامتداد الرابط ونوع الميديا، ويقصر عمله حصرياً على الصور لتأمين موارد السيرفر.
6. **ضوابط تزويد الميديا لمزودي التوليد الخارجيين**:
   - يلتزم مسار API الفيديو (`/api/video`) بتحويل كافة المدخلات والوسائط المرجعية لروابط مطلقة ومباشرة وعامة للـ Bucket في Backblaze B2 بشكل كامل.
   - يرفض السيرفر تمرير البروكسي الداخلي (`/api/media`) أو روابط localhost أو base64 أو blob لمزودي الخدمة الخارجيين (BytePlus, Google, KIE, WaveSpeed).
   - يتم التحقق من إمكانية تحميل الملف بالـ Server-side HEAD/GET request قبل خصم الكريديت أو استدعاء المزود الخارجي لتفادي الفشل وخصم الكريديت بدون فائدة.

## مرجع معماري من AutoCut V4.60.2

- تمت مراجعة الحزمة المحلية `C:\Users\PC\AppData\Local\AutoCut\current\resources\app.asar` قراءةً فقط. النتائج المثبتة من الحزمة نفسها:
- هوية النسخة المتحقق منها بتاريخ 2026-06-18: الحجم `97,862,233` بايت، آخر تعديل `2026-06-02 21:38:23`، وSHA-256: `EAC5FE19B7FCFD769B6983AE0F1DA3ADFEA5A9A7124247A47302E4FFAADD94B0`. إذا تغيّرت البصمة، تُعاد المراجعة قبل اعتماد الاستنتاجات على النسخة الجديدة.
- التطبيق غلاف Electron 35، والحزمة تحتوي 8,571 ملفًا، أغلبها dependencies. كود التطبيق المحلي الفعلي متمركز في `packages/main/dist/index.js` و`packages/preload/dist/index.mjs`.
- التطبيق لا يضم خوارزميات المونتاج كاملة داخل `app.asar`. عند التشغيل يجلب إعدادات وروابط إصدارات، ثم ينزّل `main.cjs` لخادم host وينزّل compute scripts حسب المهمة. لذلك لا يمكن استنتاج خوارزمية Silence/Multi-Cam كاملة من هذه الحزمة وحدها.
- المعمارية مفصولة إلى أربع طبقات:
  1. واجهة ويب/remote frontend داخل Electron.
  2. Electron main process للتحديثات والتنزيلات والنوافذ.
  3. `com.autocut.hostServer` للتخاطب مع تطبيق المضيف/الإضافة.
  4. `com.autocut.compute` للمهام الثقيلة مع API مثل `startTask`, `killTasks`, `getProgress`.
- الاتصال بين الطبقات يتم عبر Node IPC داخل مجلد مؤقت `com.autocut/com.autocut.aea`.
- AutoCut ينزّل نسخًا خاصة به من `ffmpeg` و`ffprobe` حسب نظام التشغيل والمعمارية، يتحقق من وجودهما/حداثتهما، ويخزنهما تحت userData. هذا يؤكد نمط: **Premiere host adapter منفصل عن compute/FFmpeg**.
- إعدادات التشغيل تتضمن روابط مستقلة للواجهة، onboarding، compute، host server، تنزيل Premiere (`PPRO_DOWNLOAD_URL`) وتنزيل DaVinci؛ أي أن تطبيق سطح المكتب موزّع orchestrator لعدة مضيفين.
- preload يعرّض bridge باسمَي `__autocut_preload__` و`__electron_preload__`، ويتضمن filesystem، child processes، downloads، FFmpeg setup، IPC وcookies. هذا تصميم قوي لكنه واسع الصلاحيات؛ في Saad Studio يجب إبقاء الجسر أصغر وتقييد العمليات والمدخلات قدر الإمكان.
- الخلاصة القابلة لإعادة الاستخدام: نعتمد الفصل نفسه مفاهيميًا في Saad Studio — UI، Premiere adapter، task/compute service، FFmpeg — لكن لا ننسخ كود AutoCut أو endpoints الخاصة به.

## قواعد لا تُكسر

- لا نخمن Premiere APIs أو media paths أو audio streams.
- لا نقرأ audio gain ونعتبره RMS.
- لا نخفي blockers ولا نزيّف Runtime Proof.
- لا نستخدم Reap أو AI diarization لتحليل Multi-Cam v1.
- لا ننفذ قرارات غير محاذاة للإطار.
- لا نغيّر الأصل عندما يكون سير العمل المتفق عليه safe duplicate؛ أي استثناء لاحق يجب أن يكون قرارًا صريحًا ومختبرًا.
- لا نغيّر ربط Google أو BytePlus أو OpenAI أو `kie.ai` عند إضافة Reap.
- لا نمرر الفيديوهات الكبيرة عبر Next.js API routes، ولا نخزن ملفات الميديا داخل Neon.

## المصادر

- Reap Getting Started: https://docs.reap.video/help-center/getting-started
- Reap API Introduction: https://docs.reap.video/api-reference/1_introduction
- Reap documentation index: https://docs.reap.video/llms.txt
- Premiere Sequence reference: https://raw.githubusercontent.com/docsforadobe/premiere-scripting-guide/master/docs/sequence/sequence.md
- Premiere Pro Scripting Guide: https://ppro-scripting.docsforadobe.dev/ (المسار المحلي: [premiere-pro-scripting-guide.md](file:///e:/موقع ثاني/next14 ai saas/next14-ai-saas-main/next14-ai-saas-main/docs/premiere-pro-scripting-guide.md))
- المرجع المحلي الكامل v3.1: `C:\Users\PC\Downloads\المرجع.md`

## حارس تحليل Multi-Cam Draft (2026-06-19)

- أي active sequence يحتوي اسمه `Saad Auto Switch Draft` لا يجوز إرساله إلى FFmpeg/RMS ولا إعادة Preview أو Apply عليه.
- `Analyze Timeline` مسموح له بقراءة layout الخفيف فقط لاكتشاف الاسم، ثم يعيد blocker `ACTIVE_SEQUENCE_IS_AUTO_SWITCH_DRAFT_SELECT_SOURCE_SEQUENCE`.
- واجهة الإنتاج تعطل Analyze/Preview/Apply بعد اكتشاف الـDraft وتطلب اختيار source sequence مثل `Synced Sequence`. هذا يمنع التحليل الطويل والنسخ المتسلسلة، من دون حذف أي sequence قديم تلقائيًا.

## مزامنة Active Sequence مع واجهة Podcast (2026-06-19)

- تبقي صفحة Podcast مراقبًا خفيفًا كل 1000ms لهوية الـActive Sequence عبر diagnostics، من دون تحليل وسائط أو FFmpeg.
- عند تغير `sequenceId` أو الاسم تُلغى كل النتائج المخزنة الخاصة بالـSequence السابق قبل السماح بـAnalyze/Preview/Apply على الجديد؛ ويشمل ذلك Sync وMulti-Cam وإثباتات الصوت.
- يتوقف المراقب تلقائيًا عند إزالة الصفحة من DOM، ولا يستعلم أثناء تنفيذ أداة إنتاجية لتجنب تداخل طلبات Host.

## توزيع أربع كاميرات في Multi-Cam (2026-06-19)

- عند وجود V1 عامة وV2 مقدم وV3 ضيف وV4 ضيف ثانٍ: لا يُعامل صوت الكاميرا العامة كمتحدث؛ يُترك Ignore، وتُربط ميكروفونات الأشخاص بـV2/V3/V4، وتُربط `Wide` بـV1. الكاميرا العامة تُستخدم عند تداخل الكلام وفق الخطة الحالية؛ إذا بقيت Unmapped فلن تظهر.

## إعادة تهيئة Camera Mapping (2026-06-19)

- Camera Mapping حالة مرتبطة بالـSequence ولا يجوز نقلها تلقائيًا إلى Sequence آخر. عند تغير الهوية تُمسح الخرائط وحالة التدخل اليدوي.
- بعد Analyze فقط، وإذا لم يلمس المستخدم الخرائط، يُعيّن المسار المسمى Wide كـ`wide` ولا يُعامل مسار الصوت ذي الفهرس نفسه كمتحدث. بقية الأصوات تُربط بمسار فيديو مناظر فقط إن كان فعليًا ويحمل clips؛ المسارات الزائدة تبقى Ignore.

## تصحيح دورة حياة Camera Mapping (2026-06-19)

- لا تُمسح اختيارات Camera Mapping عند انتقال Premiere تلقائيًا من source sequence إلى الـDraft الناتج؛ مسحها يجعل كل الحقول Ignore فورًا ويمنع مراجعة الإعدادات.
- تُبطل فقط نتائج التحليل والتنفيذ المرتبطة بهوية الـSequence. خرائط المستخدم تبقى محفوظة داخل جلسة الصفحة، ولا تُنشأ خرائط افتراضية بافتراض تطابق أرقام الصوت والفيديو.

## مرجع AutoSplice المفتوح المصدر (2026-06-19)

- المصدر المحلي: `E:\Multi-Cam Auto Switch\autosplice-main\autosplice-main`، ترخيص MIT، ومعمارية CEP + FFmpeg/RMS + QE DOM. التوافق المعلن Premiere 22–25، لذلك لا يُفترض توافقه مع 26.2.0 بلا Runtime Proof.
- منطق المتحدث المفيد: حساب RMS لكل إطار، اختيار الأعلى فقط عندما يتجاوز فرق الطاقة حساسية crosstalk، إبقاء قرار المتحدث خلال الغموض القصير (hysteresis)، ثم دمج القرارات الأقصر من Minimum Shot Length.
- الكاميرا العامة في المرجع قرار مستقل عن speaker mapping: تُدرج دوريًا وفق frequency محدد، لا بوصف صوتها متحدثًا. يمكن تكييف هذا المنطق مع Wide=V1 في Saad Studio.
- تطبيق المونتاج المرجعي يستخدم QE razor لكل الحدود ثم lift للفيديو غير النشط مع إبقاء الصوت؛ لا يُعتمد مباشرة لأنه يعدل الـactive sequence. قاعدة Saad Studio تبقى: duplicate آمن، ثم تحقق قبل/بعد.

## ضمان Minimum Shot Length (2026-06-19)

- قيمة Minimum Shot Length جزء من هوية خطة Preview؛ تغييرها يبطل الخطة السابقة ويفرض إعادة Preview قبل Apply.
- بعد تكوين الفترات وملء الفجوات، تُزال القرارات الأقصر من الحد تكراريًا: بين كاميرتين متطابقتين تُدمج الثلاثة، وإلا تُضم الفترة القصيرة إلى الجار الأنسب. بعدها يجب ألا يبقى قرار قصير إلا إذا كانت الخطة كلها قرارًا وحيدًا أقصر من الحد.
- توجد بوابتان: مولد الخطة يعيد `MINIMUM_SHOT_LENGTH_NOT_ENFORCED` عند خرق invariant، وHost يرفض Apply بـ`MINIMUM_SHOT_LENGTH_NOT_ENFORCED_AT_RUNTIME` إذا أدى تقاطع مصدر الفيديو إلى مقطع إخراج أقصر من القيمة المطلوبة.

## سياسة اعتماد مراجع Podcast Automation

- `Auto-Editor` مرجع خوارزمي لـSilence Removal: تحليل loudness، تكوين ranges، margin/padding، ودمج المقاطع القصيرة. لا يُنسخ منه إخراج timeline؛ يبقى تنفيذ Premiere عبر duplicate وإعادة بناء المقاطع والتحقق العددي.
- `Adobe CEP Samples` مرجع لبنية CEP والاتصال بين الواجهة وExtendScript وإدارة lifecycle، وليس مرجعًا لخوارزمية مزامنة أو قص.
- وثائق `Create a multi-camera source sequence` تصف workflow والخيارات المتوقعة للمزامنة؛ لا تُعامل كإثبات لواجهة scripting غير مذكورة في مرجع Premiere API.
- مراجع active-speaker/multitrack مفيدة لقواعد RMS، crosstalk margin، hysteresis، minimum shot، وإدراج wide camera. يجب التحقق من الترخيص والتوافق مع Premiere 26.2 قبل تكييف التنفيذ.
- مشاريع MCP قد تعمل عبر واجهة خارجية أو UXP أو QE غير موثق؛ لا تُستخدم في CEP إلا بعد تحديد طبقة المضيف ومطابقة عمليات Motion Scale/Position مع Runtime Proof.
- `One Click Podcast Edit` طبقة orchestration: تبدأ بإنشاء نسخة مكررة (Duplicate) فوراً والعمل عليها حصراً لحفظ الأصل. التتابع الحالي بعد حذف Silence Removal: Duplicate sequence → Set active → Run Synchronize on duplicate إن كان مفعلاً → Multi-Cam Auto Switch → Auto Captions ← التحقق النهائي وإعادة التسمية.

### ترتيب One Click وفق سير العمل التحريري العام

- يُفصل بين **Multicam setup** (تجميع المصادر المتزامنة) وبين **camera switching** (قرارات الزوايا). الترتيب الحالي للأتمتة بعد حذف Silence Removal هو: `Synchronize/setup → Multi-Cam switching → Auto Captions`.
- إزالة الصمت لم تعد جزءاً من المنتج الحالي. الكابشنز تأتي بعد تثبيت بنية المحتوى الناتجة من Multi-Cam.
- أي إعادة مستقبلية لـ Silence Removal تحتاج ADR جديد وRegression يثبت أنها لا تكسر مسارات الميكروفونات والكاميرات المطلوبة لتحليل المتحدث النشط.

## تنويع اللقطة العامة في Multi-Cam

- اللقطة العامة ليست محصورة في تداخل كلام متحدثين. بعد تثبيت قرارات المتحدث ودمج اللقطات القصيرة، يُقسّم أي تشغيل متصل لكاميرا متحدث يتجاوز 45 ثانية بإدخال Wide cutaway مدته 4 ثوانٍ، أو `Minimum Shot Length` إن كانت أكبر.
- لا يُدرج cutaway إن كان سيترك ذيلًا أقصر من `Minimum Shot Length`. القرار حتمي وقابل للمعاينة، ويُطبق فقط عند تعيين Wide Camera فعليًا.
- `wideCameraTimeSec` يُحسب من قرارات `speakerId=wide` وليس من رقم Track ثابت.

## قرار وتصميم Auto Captions للبودكاست (2026-06-22)

- يتم توليد التسميات التوضيحية (Auto Captions) محلياً بالكامل باستخدام محرك Faster Whisper ونموذج Whisper (مثل medium أو large-v3) دون استخدام أي خدمات سحابية خارجية (مثل Reap).
- يتم دعم العربية بشكل كامل RTL مع التنسيق والاستيراد التلقائي إلى تراك كابشنز مخصص (`Caption Track`) داخل Premiere Pro 26.2.0.
- يتم إعداد وتضمين مكتبات CUDA 12 المطلوبة (مثل `cublas64_12.dll`, `cublasLt64_12.dll`, `cudart64_12.dll`) ومكتبات cuDNN 9 مباشرةً داخل مجلد runtime لـ Saad Studio (في مجلد `site-packages/ctranslate2`) لضمان التوافقية الكاملة دون الاعتماد على إصدار CUDA الخاص بالجهاز (مثل CUDA 13.1).
- في حال تعذر تحميل أو توفر مكتبات CUDA 12 المطلوبة، يتم رفع حاجز (blocker) صريح باسم `CUDA_12_RUNTIME_MISSING` لمنع حدوث تراجع صامت إلى CPU (CPU Fallback) وضمان التشغيل الكامل على مسرّع CUDA بالبطاقة RTX 5090.

## Archived / Previous Auto Zoom Work (أعمال مؤرشفة / عمل Auto Zoom السابق)

> [!NOTE]
> هذا القسم يحتوي على الموثقات والأعمال السابقة الخاصة بميزة الزوم التلقائي (Auto Zoom) والتي تم تعطيلها وحجبها من واجهة المستخدم والـ Pipeline الحالي الإنتاجي، وأرشفتها للإصلاحات المستقبلية.

### Auto Zoom Production Ready & Overlay Architecture (الحالة المؤرشفة السابقة)
- كانت المعمارية القديمة تصف تطبيق Auto Zoom كـ Production Ready و Overlay Architecture مستقرة (Selected = Inserted = Effects)، لكن نظراً للمشاكل الحالية تم أرشفتها بالكامل ولا تُعامل كجزء من الإنتاج الفعلي.

### Auto Zoom وقدرات الـ Adjustment Layer
- Auto Zoom لا يفترض أن إنشاء Adjustment Layer موجود حصرًا على QE؛ يفحص Runtime لكل من `app.project.newAdjustmentLayer` و`qe.project.newAdjustmentLayer` ويستخدم المسار المتاح فقط بعد التحقق من ProjectItem الناتج.
- Auto Zoom الحالي يستخرج أحداثه من cuts الموجودة في مسار الفيديو المختار. غياب cuts يبقى تحذيرًا ولا يؤدي إلى توليد zooms دورية عشوائية.
- أثبت Runtime في Premiere 26.2 غياب دالتي إنشاء Adjustment Layer على `app.project` و`qe.project`. لذلك Auto Zoom يستخدم `direct-transform` كـfallback: يضيف تأثير Transform ومفاتيح Scale قابلة للتعديل مباشرة إلى clips التي تغطي cuts المختارة. يبقى مسار Adjustment Layer اختياريًا إذا ظهر في Runtime آخر.
- غياب cuts يمنع Apply؛ لا تُولد zooms دورية أو عشوائية على sequence خام.
- Runtime Proof بتاريخ 2026-06-18 أثبت أن fallback `direct-transform` يظهر `Runtime: Ready` في Premiere 26.2؛ لم يُختبر تطبيق التأثير بعد لأن sequence الخام لم يحتوِ cuts.

### مطابقة فهرس DOM track.clips في Auto Zoom QE
- لا يجوز افتراض تطابق فهرس DOM `track.clips` مع فهرس QE `getItemAt`. Auto Zoom يطابق QE item بزمن بداية TrackItem، ثم يعيد قراءة DOM TrackItem بعد `addVideoEffect` قبل البحث عن Transform/Scale.
- نتيجة build وحدها ليست Runtime Proof؛ يلزم إثبات `effectsApplied > 0` على duplicate sequence.

### Auto Zoom في مرجع AutoSplice
- Auto Zoom غير منفذ في المصدر الحالي. وثيقة التصميم فقط تقترح استخدام المكوّن المدمج Motion وخاصية Scale بدل إضافة Transform؛ هذا اتجاه اختبار محتمل وليس حقيقة Runtime.

### ثبات مسار تحليل Auto Zoom
- قيمة Analyze Track حالة صريحة في الواجهة، ويجب إسنادها إلى خاصية DOM `HTMLSelectElement.value` بعد إنشاء الخيارات؛ صفة HTML `value` وحدها لا تختار option عند إعادة الرسم.
- التحليل يستقبل `analyzedVideoTrackIndexes` ويحصر اكتشاف cuts في المسار المختار. تحفظ النتيجة الفهارس التي حُللت، ويستخدم Apply الفهارس نفسها لضمان عدم اختلاف مسار التحليل عن مسار التنفيذ.
- تغيير Analyze Track يلغي تحليل Auto Zoom السابق ويستلزم Analyze جديدًا قبل Apply؛ لا يجوز تطبيق نتيجة تحليل لمسار على مسار آخر.

### تنفيذ Auto Zoom عبر Motion Scale
- في Premiere 26.2 المسار الأساسي هو خاصية `Scale` داخل المكوّن المدمج `Motion` على TrackItem؛ لا يحتاج هذا المسار إلى إضافة تأثير جديد عبر QE.
- البحث يعتمد `matchName` (`ADBE Motion` و`ADBE Scale`) و`displayName` مع fallback موضعي `components[1].properties[1]` للمضيف المتوافق. يستخدم Transform عبر QE كاحتياط فقط.
- أزمنة مفاتيح Scale هي أزمنة timeline، وتُقيد بحدي بداية ونهاية clip. لا يجوز وضع مفتاح بعد نهاية TrackItem.
- معيار Runtime Proof هو `effectsApplied > 0` مع ظهور تغير Scale/المفاتيح داخل Effect Controls؛ اكتشاف cuts وحده لا يثبت نجاح Auto Zoom.
- في Direct Motion يبقى `adjustmentLayersInserted=0` لأن التعديل يقع على TrackItem نفسه؛ الواجهة يجب أن تعرض `effectsApplied` بوصفه نتيجة النجاح ولا تصف الصفر كفشل.
- Rhythm يحدد عدد أحداث الزوم بالتقريب: `round(cutCount × rhythm)` بحد أدنى حدث واحد عند وجود cuts، وتوزع الأحداث المختارة على امتداد القائمة. مثال: 3 cuts عند 60% تعطي تأثيرين.

### Auto Zoom للبودكاست: Cut-Based مقابل Emphasis-Based
- التنفيذ الحالي cut-based: يستخرج حدود TrackItems من مسار الفيديو المختار، ينتقي نسبة منها عبر Rhythm، ويكتب Motion Scale. هذا مناسب للزوم عند تغيّر اللقطة، لكنه لا يكتشف التشديد الصوتي داخل لقطة طويلة.
- التصميم المقترح v2 emphasis-based: استخراج envelope/RMS للصوت، اكتشاف peaks البارزة نسبةً إلى baseline محلي، دمج peaks المتقاربة، تطبيق cooldown، ثم تحويل زمن الصوت إلى timeline قبل إنشاء مفاتيح Motion Scale.
- نطاقات اختبار أولية وليست حقائق مثبتة: Scale 108–115%، دخول 8–15 frame، hold 1–3s، خروج تدريجي، وفاصل 4–6s قبل zoom جديد. يجب تثبيت default عبر fixtures ومشاهدة فعلية على 25fps ومعدلات أخرى.
- لا يُستخدم face tracking أو Position في Scale-only v1. إعادة التأطير بالوجه ميزة مستقلة تتطلب إحداثيات موثقة، smoothing، crop safety، واختبار كتابة Position في Premiere 26.2.
- لا يُقبل نجاح setter وحده كدليل بصري؛ التحقق يشمل عدد keyframes، قيمها وأزمنتها، واختبار playback عند event times.

### ما ثبت من مرجع AutoCut AutoZoom المرئي
- واجهة AutoCut تفصل بين تواتر/كثافة الزومات، مقدار الزوم، ونمط الحركة، وتعرض ثلاثة أنماط مرئية: `Cut` و`Smooth` و`Snap-In`.
- المنتج يعرض Preview/Processing قبل النتيجة، ويترك المادة الأصلية مع مخرجات مرئية على مسار أعلى في اللقطات المعروضة. يُعتمد من ذلك مبدآن فقط: فصل الإعدادات، ومسار تطبيق غير هدّام قدر الإمكان.
- الفيديو التسويقي لا يكشف خوارزمية اختيار أزمنة الزوم ولا يثبت استخدام RMS أو peaks أو Adjustment Layer بعينه. لا تُعوّل هذه الأمور إلى حقائق معمارية بلا توثيق أو Runtime Proof.
- في Premiere 26.2 يبقى Motion > Scale هو المسار المثبت حاليًا في Saad Studio. الانتقال إلى مسار علوي مولّد يحتاج إثبات أن إنشاء العنصر وكتابة تأثيراته متاحان وموثوقان في CEP/QE على الإصدار المستهدف.

### قواعد تخطيط وتنفيذ Auto Zoom
- تجربة الاستخدام الإنتاجية زر واحد: `Run Auto Zoom` ينفذ Auto-detect ثم Inspect ثم Apply. الإعدادات الأساسية ليست خطوة مطلوبة من المستخدم؛ يُعاد فرض preset محافظ عند كل تشغيل: Rhythm 60%، zoom multiplier 1.12، مدة 1.5 ثانية، وSmooth. تعرض الواجهة هذه القيم كحقول قراءة فقط.
- عند تشغيل Auto Zoom فوق مسار `Saad Auto Switch` المولد، تُستبعد تلقائيًا حدود المقاطع التي يكون مصدرها Wide Camera. تُقرأ هوية المصدر من اسم `Saad Auto Switch Vn` وتُقارن بتعيين Wide الحالي؛ الزوم يُخصص للقطات المتحدثين ولا يوضع على اللقطة العامة.
- لضمان بقاء الهوية بعد إعادة فتح Premiere أو تبديل الـSequence، تُوسم اللقطة العامة عند توليدها باسم `Saad Auto Switch WIDE Vn ...`. الاستبعاد الأساسي يعتمد هذا الوسم الدائم، بينما مقارنة Vn بتعيين Wide في الواجهة fallback إضافي فقط. المسودات القديمة السابقة لهذا الوسم لا تصلح لاختبار الاستبعاد.
- أحداث النسخة cut-based تبدأ عند بدايات TrackItems الداخلية فقط؛ لا تُعامل نهاية مقطع مع فجوة كحدث مستقل. قبل تطبيق Rhythm تُستبعد الأحداث التي تتداخل نوافذها وفق `Zoom Duration`.
- يُختار Style واحد لكل عملية Apply. تدوير عدة أنماط داخل العملية الواحدة ممنوع لأنه يجعل المعاينة والنتيجة غير قابلتين للتنبؤ.
- `Maximum Zoom` نسبة مضاعفة لقيمة Scale الحالية، وليست قيمة مطلقة تفترض 100%. مثال: Scale أصلي 50% مع Zoom 1.3 ينتج 65% ثم يعود إلى 50%.
- كل Style يجب أن يبقى محصورًا داخل نافذة الحدث ويعيد Scale الأصلي عند النهاية: Jump انتقال شبه فوري، Smooth دخول وخروج تدريجيان، وSnap-in انتقال أسرع. يمنع استخدام قيمة Static على المقطع كله لتنفيذ حدث زوم مؤقت.
- يجب أن يسبق Runtime Proof اختبار fixture لمنع التداخل واستعادة القيمة، ثم تُفحص المفاتيح فعليًا في Effect Controls على duplicate نظيف.

### مرجع PremiereGPTBeta الديناميكي
- مجلد التثبيت ليس مصدر التنفيذ الكامل؛ الـloader يحقن حزمة بعيدة من `api.premierecopilot.com/api/snake3`، ودوال JSX الإنتاجية تُجلب حسب الاسم من endpoint `/jsx`.
- AutoZoom فيه يفصل مرحلة القرار عن Premiere mutation: تصدير صوت + قراءة بنية Sequence → تحليل خادمي → نتيجة قرارات → جلب `AUTOZOOM_main` وتنفيذها في Premiere.
- حقول القرار المرئية تشمل cuts وemotion وspeech وrandom وcontext، إضافة إلى rhythm وfastness وzoom amount وmotion camera وX/Y والأنماط الثلاثة. هذا يثبت شكل pipeline والـinputs، ولا يثبت خوارزمية الخادم أو طريقة keyframes الداخلية.
- عند الاستفادة منه في Saad Studio، يُكيّف المبدأ محليًا: توليد `ZoomDecision[]` موثقة من timeline/audio، Preview قبل Apply، ثم Motion Scale/Position مثبت في Premiere 26.2. لا يُعتمد remote code injection كمعمارية للمسار الحساس.
- فتح Effect Controls أو تحديد TrackItem يدويًا مسموح كاختبار تطوير فقط؛ لا يدخل ضمن UX النهائي. Auto Zoom الإنتاجي مسؤول عن اكتشاف الهدف وكتابة المفاتيح والتحقق منها تلقائيًا.

### الاكتشاف التلقائي لمسار Auto Zoom
- لا تعتمد الأداة على track index محفوظ في الواجهة لأن هوية/بنية الـSequence قد تتغير. Host يفحص كل مسارات الفيديو ويحسب أحداث القص من بدايات TrackItems الداخلية، ثم يختار المسار صاحب أكبر عدد من الأحداث؛ التعادل يُحسم للمسار الأعلى.
- دورة الإنتاج زر واحد: Auto-detect → Inspect → Apply. اختيار track أو clip وفتح Effect Controls ليست خطوات للمستخدم.
- إن لم يوجد cut داخلي على أي مسار، تتوقف الأداة برسالة `AUTO_ZOOM_TRACK_WITH_CUTS_NOT_FOUND` بدل اختيار V1 افتراضيًا أو الادعاء بالنجاح.

### قواعد مستفادة من JumpCut وSoundBuddy في Auto Zoom
- لا يُنقل كود JumpCut (GPL-3.0) أو SoundBuddy Studio (AGPL-3.0) إلى Saad Studio. المسموح هو إعادة تنفيذ مبدأ عام بصورة مستقلة مع fixture وRuntime Proof.
- زمن انتقال القصير لا يُثبت على 30fps؛ تُقرأ مدة الفريم من `Sequence.timebase`، ثم من `Sequence.getSettings().videoFrameRate`، مع fallback 25fps للمضيف المستهدف.
- استدعاء `addKey` و`setValueAtKey` ليس إثبات نجاح. إذا كان `ComponentParam.getKeys()` متاحاً، يجب أن تحتوي القراءة اللاحقة كل الأزمنة المطلوبة ضمن سماحية 0.002 ثانية؛ وإلا يُعد الحدث فاشلاً ولا يزاد `effectsApplied`.
- Beat tracking الموسيقي (مثل `librosa.beat.beat_track` in SoundBuddy) ليس بديلاً مثبتاً لـSpeech Emphasis. لا يُستخدم لتوقيت Zoom للبودكاست من دون نموذج/fixture صوت كلام ومعيار قبول منفصل.

### إثبات قيمة Auto Zoom والمعاينة
- `ComponentParam.getKeys()` يثبت الأزمنة فقط. عند توفر `getValueAtKey` أو `getValueAtTime` يجب مقارنة قيمة كل مفتاح بالقيمة المطلوبة؛ وجود مفاتيح كلها على Scale الأصلي ليس Zoom ناجحاً.
- بعد تطبيق ناجح يُنقل Player Position تلقائياً إلى ذروة أول حدث Zoom. هذه معاينة آلية لا تدخل يدوي، وتمنع اختبار النتيجة عند موضع بعيد عن نافذة الزوم القصيرة.
- رسالة النجاح تعرض أزمنة الأحداث التي طُبقت فعلياً. لا يُعرض `effectsApplied > 0` إذا فشل readback للزمن أو القيمة.

### تحويل زمن معاينة Auto Zoom
- أزمنة قرارات Auto Zoom ومفاتيح Motion Scale هي أزمنة Timeline. أما `Sequence.setPlayerPosition()` فيتأثر بـ`Sequence.zeroPoint`؛ لذلك لا يجوز تمرير ticks المحسوبة من زمن Timeline مباشرة عندما تكون نقطة الصفر غير صفرية.
- موضع المعاينة يُحسب هكذا: `playerTicks = max(0, timelineTicks - zeroPointTicks)`. يطبق هذا التحويل على تحريك رأس التشغيل للمعاينة فقط، ولا يُطرح zero point من أزمنة مفاتيح Scale.
- ظهور Scale=100 في Effect Controls خارج نافذة الزوم لا يثبت فشل الكتابة. الإثبات الصحيح يكون عند ذروة حدث مطبق وبعد نجاح readback للأزمنة والقيم.
- نقل Player Position لا يغير المقطع المحدد في Premiere. لكي تكون المعاينة الآلية صادقة، يجب أن تحدد الأداة TrackItem صاحب الحدث بعد النقل؛ وإلا قد يعرض Effect Controls المقطع السابق عند حد القطع رغم وجود المفاتيح على المقطع التالي.

### حفظ الـ Mappings والـ Fallback في Auto Zoom (2026-06-20)
- الـ sequence watcher لا يقوم بمسح state.mappings عند الانتقال من الـ source sequence إلى الـ Draft sequence الناتج منها (e.g. Synced Sequence - Saad Auto Switch Draft).
- في حال كان اختيار الكاميرا العامة (Wide) غير محدد (null) في الـ mappings، يقوم الـ Auto Zoom تلقائيًا باستبعاد المسار 0 (V1) كـ fallback افتراضي لحماية اللقطات العامة من الزومات العشوائية.

### دعم اللغات وإزالة الكي فريمز العشوائية للـ Playhead في Auto Zoom (2026-06-20)
- دالة `findAutoZoomTransformComponent` تجمع الآن `matchName` و`displayName` معاً لضمان اكتشاف تأثير Transform تحت أي لغة واجهة (مثل العربية "تحويل").
- دالة `findAutoZoomMotionScaleProperty` تطابق خاصية المقياس بالاسم الثابت `"ADBE Motion Scale"` بجانب الأسماء الافتراضية.
- لتفادي الكي فريمز العشوائية التي يضعها Premiere تلقائياً عند موضع الـ playhead الحالي عند تشغيل الساعة `setTimeVarying(true)`، يتم استدعاء `removeKeyRange` على نطاق المقطع كاملاً لتنظيف الخصائص قبل كتابة مفاتيح الزوم الفعالة.

### قاعدة Synchronize Duplicate-only (2026-06-26)
- مسار Apply Sync لا يطبق الإزاحات على الـ Original Sequence نهائياً. يجب تنشيط السورس، إنشاء نسخة `Saad Sync Draft`، ثم تنشيط النسخة وتطبيق الإزاحات عليها فقط.
- يجب الحفاظ على Timeline Scanner وAudio Analysis وPairwise Correlation وSync Graph وFine Alignment وValidation كطبقات مستقلة؛ تغيير سير التطبيق لا يعني إعادة كتابة محرك التحليل.
- عند تحريك مقطع داخل النسخة، يجب الحفاظ على العلاقات المرتبطة بين الفيديو والصوت عبر منطق linked items في JSX وعدم تحريك العنصر نفسه أكثر من مرة.
- بعد التطبيق، يجب إعادة فحص النسخة الناتجة وإنتاج تقرير يحتوي: اسم/معرف الأصل، اسم/معرف النسخة، عدد الإزاحات، عدد المقاطع المحركة، أكبر انحراف قبل/بعد، التحذيرات، والـ blockers.
- إذا كانت المقاطع متزامنة مسبقاً ضمن السماحية، تنشأ نسخة أيضاً وتعود الحالة `already-synced` بدون تعديل الأصل.
- لا تعتبر العملية ناجحة إنتاجياً إذا فشل إنشاء النسخة، أو فشل تنشيطها، أو لم يثبت التحقق النهائي أن أكبر انحراف بعد التطبيق ضمن السماحية.

## Saad Agent Settings Runtime Wiring (2026-06-28)

- Settings is now a functional management center, not a static preferences mock. The approved sections remain unchanged, but each visible section must either save real data, manage runtime behavior, or stay developer-gated until implementation.
- `SettingsManager` owns the persisted application schema under `.saad-agent/settings.json`. Provider records store metadata only: id, name, type, endpoint URL, organization, enabled flag, default flag, priority, fallback provider, health status, latency, last tested timestamp, and `apiKeySecretRef`.
- Provider API keys are never written to Settings JSON. Secrets are stored through encrypted secret storage under the runtime `.saad-agent/secrets/` area and Settings keeps only the reference id.
- Model role configuration for Coding, Vision, Reviewer, and Fast is applied at runtime by `ReasoningEngine` and `ModelClient`. The applied values include provider, model name, temperature, max output tokens, streaming, timeout, and retry count.
- Context window is not a user-editable Settings value. It is displayed as detected/read-only model metadata and should be refreshed by provider/model discovery logic in future work.
- Provider Test Connection must call the backend and perform a real request to the provider models endpoint. The UI displays online/offline, latency, error, and last-tested timestamp from that backend result.
- Domain Skills is now a Skill Manager. Built-in skills may be viewed and enabled/disabled but cannot be deleted. Custom skills may be created, imported from JSON/folder manifests, edited, saved, removed, and reloaded.
- Custom skill manifests are data-only. Reject manifests containing credential-like fields, executable code markers, unsafe commands, direct filesystem write behavior, or secrets.
- Disabled skills must not be matched by `SkillRegistry.matchSkillsForTask`; therefore the Context Engine cannot inject disabled skill guidance into retrieved context.

## Saad Agent Chat Layout Overflow Rule (2026-06-28)

- The desktop chat viewport must not create horizontal movement. Chat, input, message, card, and attachment containers should use `min-width: 0`, `max-width: 100%`, and horizontal overflow guards where needed.
- Vision reports and other tables must wrap inside the card using fixed table layout or equivalent responsive behavior instead of widening the conversation column.
- Uploaded screenshots and sent attachment previews must scale down to the available message width.
- On narrow windows, side panels may be hidden and chat/input padding reduced to preserve a stable single-column conversation area.
## Saad Agent Settings product honesty update (2026-06-28)

- The packaged desktop app must expose Settings runtime APIs through the CJS preload file copied by the build script. `preload.ts` and `preload.cjs` must stay functionally aligned for Settings IPC.
- Settings pages must not display fake management data. If a backend bridge, registry, or discovery source is unavailable, the page must show an explicit unavailable/empty state.
- Model role controls use labeled responsive fields. Provider dropdowns are populated only from persisted provider configuration, and context window remains read-only detected metadata.
- Built-in skills are viewable and can be enabled or disabled, but their manifest fields are read-only in Settings. Custom skills remain editable/importable/removable after validation.
- MCP Settings must show registered/discovered MCP servers and tools only. Demo seeded servers/tools are not allowed in the product UI; an empty registry is shown as an honest empty state.
## Saad Agent Settings unwired-section rule (2026-06-28)

- Production Settings navigation must not expose sections whose controls only persist JSON without changing runtime behavior.
- Unwired sections must stay hidden from the normal Settings sidebar until each section has backend/runtime integration and verification tests.
- Creative AI must not be presented as production-ready while providers generate placeholder assets.
- Vision, Knowledge, Execution, Security, Tools, Connectors, Backups, Diagnostics, and Advanced settings require verified runtime consumers before returning to the production Settings UI.
## Saad Agent Models management production workflow (2026-06-28)

- Models Settings must be provider-driven. Users should not manually type model ids for configured providers.
- Provider defaults must always be available and merged with persisted user settings: LM Studio, Ollama, OpenAI, Anthropic, Gemini, OpenRouter, and Saad Studio.
- LM Studio and OpenAI-compatible providers use `GET /v1/models` for discovery. The discovered list is stored on the provider record with model count, last discovery timestamp, latency, last successful connection, and optional context-window metadata.
- Model role selection for Coding, Vision, Reviewer, and Fast must use discovered model choices. Context window remains detected/read-only.
- The Models page must expose Test Connection and Discover / Fetch Models and show live provider health, latency, last successful connection, and discovered model count.
- `ReasoningEngine` must consume the selected persisted role/provider/model from `SettingsManager`, and `ModelClient` must tolerate local OpenAI-compatible providers that reject `response_format` by retrying without it.
- Verified runtime on the local test machine: LM Studio at `http://127.0.0.1:1234/v1` returned 6 models; Coding was persisted as `lm-studio` / `qwen/qwen3-coder-30b`; a real inference request returned valid JSON.
## Saad Agent main interface product honesty rule (2026-06-28)

- The desktop main interface must not render mock conversations, fake model names, static maintenance chats, static orchestration status, or static provider-management notifications as production data.
- The main interface is limited to productivity surfaces: Chat, active Workspace, Attachments, real Running Tasks, real Current Models, and real Notifications.
- Current Models must be read from persisted `SettingsManager` model role/provider configuration via the Electron settings bridge. If no real model configuration is available, the card is hidden.
- Running Tasks and Multi-Agent content must be hidden unless real runtime session/agent data exists.
- Project intelligence, diagnostics, provider management, MCP, memory, backup, advanced controls, and other engineering internals belong in Settings or diagnostics views, not permanently in the main workspace.
## Saad Agent chat viewport hard horizontal lock (2026-06-28)

- The desktop chat viewport must never move horizontally or expose a horizontal scrollbar.
- Message rows must account for fixed avatar width plus gap; the content column should not use `max-width: 100%` in a way that makes avatar + gap + content exceed the viewport.
- Engineering cards, analysis grids, plan steps, code/diff previews, images, tables, attachment previews, and input controls must remain inside the available chat width.
- Wide text and code should wrap inside cards. Production chat should prefer wrapping/clipping over horizontal scrolling.
## Saad Agent Settings visible-controls honesty rule (2026-06-28)

- Production Settings must not expose user-facing fields that only persist JSON without complete runtime behavior.
- The General preferences page is hidden until theme switching, localization, and startup behavior are implemented and verified end to end.
- Opening Settings with a General target should route to the first real production settings module, currently Workspace.
- Persisted schema compatibility may remain internal, but hidden fields must not appear in the product UI.
## Saad Agent Settings modal scrolling behavior (2026-06-28)

- Settings is a fixed desktop modal, but long management pages must remain fully usable on smaller windows.
- The modal must be constrained to the viewport and must not clip Models, Skills, Providers, or other long pages.
- The content pane owns vertical scrolling; grid and flex parents must use `minHeight: 0`/`minmax(0, 1fr)` so Electron does not expand content beyond the visible window.
- Settings pages should not require horizontal movement or hidden off-screen controls to reach Save, Reload, model role fields, or skill details.
## Saad Agent MCP Manager behavior (2026-06-28)

- MCP Settings is a production MCP Manager, not a placeholder registry view.
- MCP servers are persisted in `SettingsManager` with transport, command/endpoint, args, cwd, non-secret env vars, enabled state, auto-start, auto-reconnect, permissions, health metadata, discovered tools/resources/prompts, and communication logs.
- Discovery must run the MCP JSON-RPC sequence for enabled servers: `initialize`, `tools/list`, `resources/list`, `prompts/list`.
- STDIO MCP servers are launched as hidden child processes and communicate over JSON-RPC lines. HTTP/SSE entries are treated as JSON-RPC HTTP endpoints for this implementation.
- The UI must support Add MCP Server, Test Connection before save, Configure, Enable/Disable, Restart, Remove, tool permission modes (`Always Allow`, `Ask Every Time`, `Never Allow`), resource inspection, prompt listing, health status, and logs.
- LM Studio is not an MCP server and must never be managed from MCP Settings. It belongs in Settings -> Providers with endpoint, API key if needed, Test Connection, Fetch Models, and model role assignment.
- MCP environment variables in Settings must not contain API keys, tokens, passwords, cookies, credentials, or secrets. Secret-like values are rejected.
## Saad Agent Composer behavior (2026-06-28)

- The chat composer is the runtime command center for active work, while Settings remains the permanent configuration center.
- Composer runtime selections may include active provider/model, workspace, agent, skill, MCP tool, and quick action. These are temporary and must not overwrite Settings.
- The text box starts as a single-line input and grows upward only because of typed text. It keeps fixed width, caps around 250-300px, then uses internal scrolling.
- Attachments must not increase composer height. Images, PDFs, videos, documents, and folders appear as compact chips or thumbnails above the composer.
- Image attachments use small thumbnails only; large previews belong in message history or a separate preview, not inside the input height.
- Queued image attachments in the composer must not show persistent filename/size details inside the prompt box. They render as thumbnail-only items with a remove control; metadata may remain available through hover/title or sent-message history.
- The composer must remain anchored at the bottom and must not create horizontal movement.
- Queued attachments may render inside the prompt box as compact fixed-size previews when the user explicitly wants inline prompt context. They must remain bounded and must not create horizontal movement.
- The composer must not expose a microphone/voice control unless real voice input is implemented. Upload controls should render with stable text/icon assets that do not depend on fragile emoji glyphs.
## Saad Agent conversation pages behavior (2026-06-29)

- The desktop chat supports multiple local conversation pages so the user can separate topics instead of mixing all work in one stream.
- Conversation pages are persisted in renderer `localStorage` with active page restoration, title, timestamps, optional workspace metadata, and messages.
- A new conversation starts empty and becomes titled automatically from the first user message unless the user manually renames it.
- Each conversation can be renamed from the sidebar and deleted after explicit confirmation. Deleting the final conversation creates a replacement empty page.
- Message rendering must always be scoped to the active conversation page.
- This is local desktop UI organization only; provider secrets, API keys, credentials, and runtime secrets must never be stored in conversation page data.

## Saad Agent chat message rendering behavior (2026-06-29)

- Chat message UI may use professional AI component patterns for structure, but must not import demo content, fake tools, fake packages, fake agents, or placeholder cards into production chat.
- Message actions must operate on real message data. Copy copies the visible message text plus real attachment/card metadata labels.
- Sent attachments render as compact, bounded cards or thumbnails and must not create horizontal scrolling or resize the composer.
- Attachment labels must describe real metadata only; do not show placeholder wording for files that were actually attached.
- Agent/tool/artifact style cards should appear only when backed by existing runtime `cardType`/`cardData` or real backend events.

## Saad Agent v6.5 cognitive architecture and knowledge ingestion (2026-06-29)

- The complete v6.5 architecture diagrams are recorded in `saad-agent/docs/saad-agent-v6.5-architecture.md` as Mermaid diagrams for:
  - Cognitive & Multi-Layer RAG Engine.
  - 11-Step Automated Workflow.
  - Continuous Self-Healing Pipeline.
- The implemented service inventory includes `intent-engine.ts`, `cognitive-orchestrator.ts`, `tool-orchestrator.ts`, `operational-skill-pipeline.ts`, `execution-engine.ts`, `validation-pipeline.ts`, `recovery-engine.ts`, `execution-history.ts`, `brave-answers.ts`, `workspace-watcher.ts`, `settings-manager.ts`, `secrets-manager.ts`, and `knowledge-ingestion.ts`.
- `IntentEngine` now prioritizes local engineering/code/debugging requests before web/latest-documentation routing, so framework names such as Next.js do not automatically force internet search when the user is clearly asking to create or modify code.
- Image-link/search requests route to `image_search`; explicit web search remains `web_search`; latest/current external knowledge remains `internet_answers`.
- `KnowledgeIngestionService` performs local chunking plus deterministic vector-style indexing into `.saad-agent/knowledge/vector-index.json`. This gives durable semantic retrieval without external services.
- `ContextEngine` retrieves `knowledge:*` candidates from the local knowledge index in addition to architecture, dependency graph, project summary, skills, engineering memory, source files, and attachment metadata.
- `VisionAnalyzer` stores scrubbed image-analysis summaries into the durable knowledge index so later related prompts can retrieve prior visual findings.
- Security boundary: this is knowledge retrieval, not model fine-tuning. The agent does not train model weights. Sensitive files, `.env`, credentials, API keys, tokens, cookies, passwords, secret storage, and secret-like values must remain excluded from indexing, memory, diagnostics, and context retrieval.

## Saad Agent direct chat runtime behavior (2026-06-29)

- Normal composer messages use the `chat-complete` IPC path and must return either a direct model reply or a visible error message in the chat.
- The UI must show an interim `Thinking with the active model...` message while waiting for the backend so provider/runtime failures do not appear as silence.
- Direct chat uses `ReasoningEngine.requestCompletion` with the Coding role and short retrieved Context Engine snippets. It must not claim file edits unless an execution tool actually changed files.
- OpenAI-compatible local providers are called with `stream: false` until the renderer implements real SSE streaming parsing. Persisted `streaming: true` settings must not break JSON response parsing.
- LM Studio endpoints are normalized for runtime use: `localhost` becomes `127.0.0.1`, and the standard local server `127.0.0.1:1234` is treated as `http://127.0.0.1:1234/v1`.
- LM Studio 0.4.18 Developer API is supported as a first-class local runtime: model discovery tries `GET /api/v1/models`, and chat tries `POST /api/v1/chat` with the required `input` payload before falling back to OpenAI-compatible `/v1/chat/completions`.
- LM Studio Developer API requests must not include unsupported OpenAI-only fields such as `response_format` or `max_tokens` on `/api/v1/chat`. If a provider returns HTTP 200 without extractable message content, the runtime treats it as a provider failure instead of showing silent success.
- If LM Studio is closed, the local server is not started, or the selected model id is not loaded, the chat must show the actual provider error instead of silently doing nothing.

## Saad Agent packaged UI loading rule (2026-06-29)

- Packaged Electron builds load the Vite renderer from `ui/dist/index.html` inside `app.asar`.
- Manual ASAR refresh scripts must copy `ui/dist` to `ui/dist` inside the archive. Copying the contents directly to `ui/` can produce a blank renderer window.
- `desktop/main.ts` should tolerate both `ui/dist/index.html` and `ui/index.html`, but the production package structure remains `ui/dist/**`.

## Saad Agent Providers persistence behavior (2026-06-29)

- Providers and Models settings are global application runtime configuration. They must persist under the Electron application data root, not under the active workspace.
- `main.ts` sets `SAAD_AGENT_SETTINGS_ROOT` to `app.getPath("userData")` before the Settings backend is used.
- `SettingsManager` migrates legacy workspace `.saad-agent/settings.json` into the global settings root when the global file does not exist.
- Provider form edits use an explicit `Save Provider` action. Test Connection, Set Default, Add, Remove, Discover Models, and API key save remain backend operations.
- API keys still use encrypted secret references only; Provider JSON stores metadata and `apiKeySecretRef`, never raw secrets.

## Saad Agent Training Knowledge and Pre-Answer Review (2026-06-29)

- The agent supports a dedicated training knowledge folder at `.saad-agent/training/` with these enforced subfolders:
  - `books/`
  - `maps/`
  - `diagrams/`
  - `screenshots/`
  - `api-docs/`
  - `project-docs/`
  - `ui-references/`
  - `code-examples/`
  - `lessons/`
- Training knowledge is stored as retrieval memory, not model fine-tuning. The agent does not modify model weights.
- `KnowledgeIngestionService` scans the training folders, extracts readable text for text/code/Markdown/JSON files, chunks and indexes the content into `.saad-agent/knowledge/vector-index.json`, and maintains `.saad-agent/knowledge/registry.json`.
- `ProjectIntelligenceService` watches `.saad-agent/training/` as a special allowed `.saad-agent` path and re-runs training ingestion when training files are added, modified, or deleted.
- Registry entries include file name, type, category, summary, tags, added date, indexed status, chunk count, embedding status, and last used date.
- Image, screenshot, diagram, map, and PDF files are registered safely as metadata-only until a real OCR, vision summary, or PDF extractor provides readable text. The system must not pretend OCR happened when it did not.
- `PreAnswerReviewService` is the mandatory direct-chat gate before model invocation:
  - Detect intent.
  - Load conversation/request context available to the backend.
  - Load project rules from `AGENTS.md` and `PROJECT_CONTEXT.md`.
  - Load ADR/decision context from Engineering Memory.
  - Search training knowledge.
  - Search the existing project Context Engine separately in the direct chat path.
  - Load matching enabled skills.
  - Build the final context.
  - Then call the configured model.
- Direct chat replies must show compact diagnostics before the answer:
  - `Memory: loaded`
  - `Training Knowledge: searched`
  - `Knowledge matches: X`
  - `Skills: loaded`
  - `Project context: loaded/skipped`
  - `Final context built: yes`
- If no training file matches, chat must explicitly say: `No matching trained knowledge found. Answering from model knowledge only.`
- Asking what trained knowledge was used should return the matched files and summaries from the registry/retrieval result.
- Sensitive files and secret-looking values remain excluded or scrubbed. `.env`, credentials, API keys, tokens, cookies, passwords, encrypted secret storage, and secret-like values must not be stored in registry, logs, diagnostics, or retrieved context.

## Saad Agent Direct Chat Orchestration Gate (2026-06-30)

- Direct composer messages must pass through `ChatOrchestratorService` before any model call.
- The orchestration order is:
  1. Detect intent.
  2. Run mandatory pre-answer review.
  3. Execute deterministic non-model paths when applicable.
  4. Retrieve project context.
  5. Call the model only if the request actually requires model reasoning/generation.
- `memory_save` is an execution path. Requests such as `احفظ ...`, `تذكر ...`, `خزن ...`, `remember ...`, or `save ...` must write to Engineering Memory and return a confirmation without calling the model.
- `memory_recall` is an execution path. Identity and recall questions read stored user memory directly and do not ask the model to guess.
- Explicit internet/link/latest/search requests route to `BraveAnswersService`. If Brave/provider/network/API key is unavailable, the agent must say the real search failed and must not fabricate links or current information from model knowledge.
- Only generation, review, debugging, workspace reasoning, and general reasoning requests may call `ReasoningEngine`, and only after the memory/training/context review has built the final context.
