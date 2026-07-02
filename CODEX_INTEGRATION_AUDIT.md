# Saad Agent Codex Runtime Integration Audit

Date: 2026-07-02

## Scope

This document is an engineering audit only. It does not implement a Codex bridge, does not replace Saad Agent runtime code, and does not claim that Codex is already integrated.

User goal:

- Make Saad Agent execute real day-to-day engineering work with Codex-level capability.
- Keep Saad Agent's UI, memory, knowledge, Iraqi Arabic behavior, provider settings, and trusted workspace rules.
- Use the external Codex repository as a possible execution heart, not as random copied code.

External reference inspected:

`E:\تدريبات الايجنت\تنفيذ المهام\New folder\codex-main\codex-main`

Read access to additional external Codex source files stopped after Codex usage-limit rejection. This audit therefore distinguishes confirmed evidence from items requiring a later source pass.

## Confirmed Saad Agent Runtime Evidence

### Chat entrypoint

File: `saad-agent/src/desktop/main.ts`

Confirmed IPC:

- `chat-complete`
- `context-retrieve`
- `attachments-store`
- `vision-analyze`
- `settings-*`
- `mcp-*`
- `run-command`
- `execution-trace-event`

File: `saad-agent/src/desktop/preload.ts`

Confirmed renderer bridge:

- `chatComplete`
- `retrieveContext`
- `storeAttachment`
- `analyzeVision`
- `loadSettings`
- `saveSettings`
- `onExecutionTraceEvent`
- MCP and settings bridges

### Current orchestration

File: `saad-agent/src/platform/services/chat-orchestrator.ts`

Confirmed services called:

- `ExecutionPolicyService`
- `ApprovalPolicyService`
- `PreAnswerReviewService`
- `KnowledgeIngestionService`
- `KnowledgeManagerService`
- `BraveAnswersService`
- `ReasoningEngine`
- `TaskStateStore`
- `ExecutionTraceEmitter`

Engineering finding:

Saad Agent already has multiple orchestration pieces, but the direct chat path still mixes conversation, policy, knowledge review, trace emission, and model invocation in one very large service. This makes behavior fragile and explains why small wording changes can create unexpected execution traces or routing results.

### Trusted workspace runtime

File: `saad-agent/src/platform/services/trusted-workspace-runtime.ts`

Confirmed capabilities:

- trusted workspace store
- path trust checks
- sensitive path blocking
- local path open/reveal/copy
- read file
- write file with backup
- delete with approval and backup
- workspace search
- allowlisted commands:
  - `npm run build`
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`
  - `git status`
  - `git diff`
  - `git add`
  - `git commit`
  - `git push`
- project reference loading:
  - `AGENTS.md`
  - `PROJECT_CONTEXT.md`
  - `saad-agent/SAAD_AGENT_CONTEXT.md`
  - `docs/saad-studio-premiere-reference-ar.md`

Engineering finding:

The trusted workspace boundary exists. The missing part is a full execution bridge that routes model/tool decisions through this runtime consistently.

### Approval policy

File: `saad-agent/src/platform/services/approval-policy.ts`

Confirmed capabilities:

- per-conversation approval mode
- approval evaluation
- danger classification
- central methods:
  - `canReadFile`
  - `canWriteFile`
  - `canDeleteFile`
  - `canRunCommand`
  - `canUseInternet`
  - `canUseGit`
- secret-looking path blocking in every mode
- JSONL audit log

Engineering finding:

Saad has a real approval service. Any Codex bridge must call this service before letting Codex read/write/run commands, otherwise the bridge would bypass Saad Agent security.

### Knowledge and memory

Files:

- `saad-agent/src/platform/services/pre-answer-review.ts`
- `saad-agent/src/platform/services/knowledge-ingestion.ts`
- `saad-agent/src/platform/services/knowledge-manager.ts`

Confirmed capabilities:

- pre-answer review
- project rules loading
- ADR/memory loading
- training knowledge search
- skill matching
- `.saad-agent/training/*`
- `.saad-agent/knowledge/registry.json`
- vector-index fallback based on hashed vectors
- global knowledge manager with registry, dictionaries, packs, chunks, search index, embeddings folder

Engineering finding:

Saad has a knowledge pipeline. Codex must not skip it. The correct architecture is:

Saad Brain and Knowledge build the task context first, then Codex executes with that context and returns events/results.

## Confirmed External Codex Evidence

### Repository identity

Files:

- `package.json`
- `codex-cli/package.json`
- `sdk/typescript/package.json`
- `sdk/typescript/README.md`

Confirmed:

- root package: `codex-monorepo`
- CLI package: `@openai/codex`
- SDK package: `@openai/codex-sdk`
- TypeScript SDK wraps the `codex` CLI.
- SDK spawns the CLI and exchanges JSONL events over stdin/stdout.
- SDK supports:
  - `new Codex()`
  - `startThread()`
  - `resumeThread()`
  - `thread.run(...)`
  - `thread.runStreamed(...)`
  - structured output schema
  - local image attachments
  - working directory selection
  - controlled environment variables
  - config overrides

### Codex Rust runtime markers

Confirmed top-level crates/directories include:

- `codex-rs/app-server`
- `codex-rs/app-server-protocol`
- `codex-rs/core`
- `codex-rs/exec`
- `codex-rs/exec-server`
- `codex-rs/execpolicy`
- `codex-rs/protocol`
- `codex-rs/sandboxing`
- `codex-rs/windows-sandbox-rs`
- `codex-rs/file-search`
- `codex-rs/file-system`
- `codex-rs/file-watcher`
- `codex-rs/shell-command`
- `codex-rs/shell-escalation`
- `codex-rs/mcp-server`
- `codex-rs/codex-mcp`
- `codex-rs/model-provider`
- `codex-rs/models-manager`
- `codex-rs/memories`
- `codex-rs/state`

Confirmed app-server files include:

- `message_processor.rs`
- `command_exec.rs`
- `dynamic_tools.rs`
- `fs_watch.rs`
- `fuzzy_file_search.rs`
- `request_processors/*`
- `request_processors/search.rs`
- `request_processors/git_processor*`
- `request_processors/mcp_processor*`
- `request_processors/token_usage*`
- `request_processors/windows_sandbox*`

Engineering finding:

Codex is not a small helper module. It is a complete execution runtime with CLI, SDK, protocol, app server, execution policy, sandboxing, command execution, file search, MCP, and thread state. Saad Agent should integrate through a defined bridge, not by copying random services.

## Integration Options

### Option A: TypeScript SDK bridge

Confirmed source:

- `@openai/codex-sdk`
- `sdk/typescript/README.md`

How it would work:

1. Saad receives user request.
2. Saad Conversation Intelligence, Intent Engine, Execution Policy, Approval, Memory, Knowledge, and Context Assembly run first.
3. Saad creates or resumes a Codex SDK thread for the active conversation.
4. Saad sends a bounded engineering task prompt plus workspace path.
5. Saad consumes streamed Codex events.
6. Saad maps Codex events to:
   - Live Execution Trace
   - Tool Calls
   - Modified Files
   - Command Output
   - Verification Result
7. Saad still enforces trusted workspace and secret rules.

Pros:

- Fastest practical integration path.
- Uses stable documented SDK behavior.
- Provides streamed events.
- Fits Electron/Node backend.

Cons:

- Depends on installed `codex` CLI/runtime.
- Approval and sandbox policy must be bridged carefully.
- Needs controlled env so Saad does not leak secrets to the child process.

Verdict:

Best first implementation candidate.

### Option B: Codex app-server protocol bridge

Confirmed source:

- `codex-rs/app-server`
- `codex-rs/app-server-protocol`
- `codex-rs/protocol`

How it would work:

Saad talks directly to Codex app-server JSON-RPC/protocol and consumes rich typed events.

Pros:

- Most powerful and native.
- Better long-term control over events, tools, threads, token usage, MCP, filesystem, and command execution.

Cons:

- Requires a deeper protocol pass.
- More risk if implemented before fully understanding app-server lifecycle and auth/session requirements.

Verdict:

Good long-term target, not the first bridge unless the SDK is insufficient.

### Option C: CLI subprocess only

How it would work:

Saad spawns `codex` directly and parses text/JSONL.

Pros:

- Simple conceptually.

Cons:

- More brittle than SDK.
- More custom process handling.
- Harder to maintain event mapping.

Verdict:

Use only if SDK cannot be installed or loaded.

### Option D: Copy Codex source into Saad Agent

Verdict:

Rejected.

Reason:

Codex is a large Rust/TypeScript monorepo. Copying files into Saad would create a maintenance and build problem and would not automatically make Saad Agent reliable.

## Required Saad-to-Codex Bridge Contract

Proposed service:

`saad-agent/src/platform/services/codex-runtime-bridge.ts`

The bridge must be the only place where Saad calls Codex.

### Request contract

```ts
type SaadCodexExecutionRequest = {
  conversationId: string;
  taskId: string;
  workspacePath: string;
  userRequest: string;
  approvalMode: "ask" | "approve_for_me" | "full_access";
  executionCategory: "response_only" | "read_only" | "safe_engineering" | "project_modification" | "destructive";
  preAnswerContext: string;
  matchedKnowledge: Array<{ path: string; summary: string }>;
  matchedMemory: Array<{ title: string; summary: string }>;
  allowedTools: string[];
  forbiddenPaths: string[];
  attachments: Array<{ path: string; mimeType: string; kind: string }>;
};
```

### Event contract

```ts
type CodexBridgeEvent =
  | { type: "trace"; taskId: string; phase: string; status: string; detail?: string }
  | { type: "tool_call"; taskId: string; tool: string; inputSummary: string; risk: string }
  | { type: "approval_required"; taskId: string; action: string; reason: string; files?: string[]; command?: string }
  | { type: "file_change"; taskId: string; path: string; changeType: "created" | "modified" | "deleted" }
  | { type: "command_output"; taskId: string; command: string; exitCode?: number; stdout?: string; stderr?: string }
  | { type: "token_usage"; taskId: string; inputTokens?: number; outputTokens?: number; totalTokens?: number }
  | { type: "final_response"; taskId: string; text: string };
```

## Mandatory Safety Rules

Codex bridge must not run before:

1. trusted workspace verification
2. user request extraction
3. conversation intelligence
4. intent analysis
5. execution policy decision
6. approval policy decision
7. pre-answer review
8. context assembly

Always blocked:

- `.env`
- tokens
- cookies
- credentials
- private keys
- secret stores
- paths outside trusted workspaces

Always explicit approval:

- delete files
- git push
- git reset
- package installs
- external executable launch
- database migration
- destructive workspace rewrite

## Required Developer Console Signals

Codex bridge must emit:

- live execution trace
- tool calls
- command output
- file changes
- approval requests
- memory/RAG context used by Saad before Codex
- prompt envelope sent to Codex, redacted
- token usage if provided by Codex events
- errors with stack redaction

## Acceptance Tests

No bridge should be considered real until these pass:

1. Ask: `افتح هذا الفولدر وشوف الملفات`
   - If folder is not trusted, Saad asks to trust it.
   - If trusted, Saad lists real files.

2. Ask: `اريد انشئ صفحة خاصة بي`
   - Saad classifies project modification.
   - In ask mode, Saad requests approval before modification.
   - In approve-for-me/full-access mode, safe planning can proceed.

3. Ask: `صلح هذا الخطأ`
   - Saad reads context first.
   - Codex bridge runs only inside trusted workspace.
   - Modified files are reported.
   - Build/typecheck result is reported.

4. Ask: `احذف هذا الملف`
   - Always requires explicit approval.

5. Ask: `منو انت؟`
   - No Codex bridge call.
   - Deterministic Saad identity response.

6. Ask: `شكرا`
   - No Codex bridge call.
   - No execution trace.

## Engineering Verdict

Saad Agent already has enough foundation to host a real Codex-style execution runtime:

- trusted workspace runtime exists
- approval policy exists
- memory/knowledge pre-answer review exists
- execution trace transport exists
- provider/model settings exist

But Saad Agent does not yet have a verified Codex runtime bridge. The correct next implementation is not more UI and not copying Codex. The correct next implementation is a controlled `CodexRuntimeBridge` that uses the TypeScript SDK first, maps streamed events into Saad's runtime, and enforces Saad security before every action.
