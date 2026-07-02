# Saad Agent Developer Console Audit

Date: 2026-07-02

## Purpose

The Developer Console must show real runtime evidence, not static cards. It should expose enough information to debug why Saad Agent answered, searched, asked for approval, called a tool, edited a file, or failed.

Requested modules:

```text
Developer Console
├── Live Execution Trace
├── Tool Calls
├── Memory Inspector
├── RAG Inspector
├── Prompt Viewer
├── Token Usage
├── Performance Timeline
├── Error Analyzer
├── Knowledge Inspector
└── Auto Diagnostic
```

## Current Evidence

### 1. Live Execution Trace

Current status: partial real implementation.

Evidence:

- `saad-agent/src/platform/services/execution-trace-emitter.ts`
- `saad-agent/src/platform/services/state-store.ts`
- `saad-agent/src/desktop/main.ts` sends `execution-trace-event`
- `saad-agent/src/desktop/preload.ts` exposes `onExecutionTraceEvent`
- `saad-agent/ui/src/App.tsx` renders `execution-trace` cards

Gap:

The trace is visible in chat, but there is no dedicated Developer Console view that can filter traces by conversation, task id, phase, service, duration, or failure.

Required console data:

- task id
- conversation id
- phase
- status
- source service
- timestamp
- duration between stages
- failure reason

### 2. Tool Calls

Current status: partial backend capability, missing unified console stream.

Evidence:

- `TrustedWorkspaceRuntime` can read/write/search/run safe commands.
- `ApprovalPolicyService` audits actions.
- MCP handlers exist in `main.ts`.

Gap:

Tool calls are not centralized into a single `ToolCallLog` stream. The UI cannot reliably show every file read, file write, command, git action, MCP call, provider call, or internet call.

Required:

- `ToolCallAuditService`
- common event shape for every tool call
- redacted inputs and outputs
- link to approval decision
- result status and duration

### 3. Memory Inspector

Current status: partial services, missing console UI.

Evidence:

- `engineering-memory.ts`
- `user-memory.ts`
- `task-memory.ts`
- `decision-memory.ts`
- `pre-answer-review.ts`

Gap:

No single UI panel shows what memory entries were loaded for a specific answer.

Required:

- loaded memory source
- match score if available
- summary
- why it matched
- last used date
- whether it was injected into final context

### 4. RAG Inspector

Current status: partial.

Evidence:

- `knowledge-ingestion.ts`
- `knowledge-manager.ts`
- `knowledge-rag.ts`
- `context-engine.ts`
- `pre-answer-review.ts`

Confirmed current retrieval:

- training knowledge search runs through `KnowledgeIngestionService.searchTrainingKnowledge`
- hashed vector search exists
- registry fallback scoring exists
- global `KnowledgeManagerService` stores registry, chunks, dictionaries, packs, search index, embeddings folder

Gap:

No live inspector shows:

- query text
- normalized query
- matched chunks
- scores
- source file
- category
- selected/rejected chunks
- final context placement

Required:

- per-request RAG trace
- selected chunks
- rejected chunks
- rank explanation
- knowledge source separation:
  - workspace training
  - global vault
  - engineering memory
  - project files

### 5. Prompt Viewer

Current status: missing as a safe console panel.

Evidence:

- `chat-orchestrator.ts` builds prompts for `ReasoningEngine`.
- `ReasoningEngine` sends system/user messages to `ModelClient`.

Gap:

There is no redacted prompt viewer that shows the final prompt envelope.

Required:

- system prompt summary
- user request
- context blocks included
- matched knowledge list
- selected model/provider
- redaction before display
- never show API keys, tokens, cookies, credentials, `.env`

### 6. Token Usage

Current status: partial or provider-dependent.

Evidence:

- `TokenManager`
- `ModelClient`
- `ReasoningEngine`
- `ContextEngine`

Gap:

The UI does not provide a per-request token accounting panel backed by model/provider usage and context estimates.

Required:

- estimated input tokens before call
- provider-reported usage after call if available
- output tokens
- context budget
- trimmed context summary
- model context window

### 7. Performance Timeline

Current status: partial timestamps, no complete timeline.

Evidence:

- `ExecutionTraceEmitter` events have timestamps.
- `TrustedWorkspaceRuntime.runSafeCommand` measures command duration.
- provider health checks record latency.

Gap:

No unified request timeline.

Required:

- request received
- policy duration
- memory load duration
- knowledge search duration
- workspace search duration
- provider call duration
- tool durations
- verification durations

### 8. Error Analyzer

Current status: missing as a console subsystem.

Evidence:

- errors appear in chat responses or logs
- `ApprovalPolicyService` audit log exists
- production diagnostics handlers exist in `main.ts`

Gap:

No structured error analyzer groups failures by root cause.

Required:

- error source
- stack redacted
- probable cause
- affected subsystem
- recovery suggestion
- related trace id
- related tool call id

### 9. Knowledge Inspector

Current status: partial.

Evidence:

- `KnowledgeManagerService` can report stats and manage registry/packs.
- settings/knowledge UI pieces exist historically.

Gap:

No verified dedicated console panel that shows the exact knowledge used by a chat request.

Required:

- registry browser
- training folder status
- chunk viewer
- dictionary viewer
- pack viewer
- per-answer knowledge matches
- stale/failed indexing list

### 10. Auto Diagnostic

Current status: partial components, missing orchestrated diagnostic runner.

Evidence:

- `prod-diagnostics`
- `prod-performance`
- provider health
- workspace runtime
- build/test command allowlist

Gap:

No one-click diagnostic pipeline that checks all important subsystems and reports PASS/FAIL.

Required checks:

- settings load/save
- provider connection
- model discovery
- reasoning request
- memory load
- knowledge registry read
- training search
- trusted workspace status
- approval policy
- MCP server list
- attachment storage
- build/typecheck command availability

## Recommended Developer Console Architecture

### Backend services

Add only after approval:

- `RuntimeEventBus`
- `ToolCallAuditService`
- `PromptAuditService`
- `RagTraceService`
- `TokenUsageService`
- `PerformanceTimelineService`
- `ErrorAnalysisService`
- `AutoDiagnosticService`

### IPC channels

Add only after approval:

- `developer-console:get-snapshot`
- `developer-console:subscribe`
- `developer-console:get-task`
- `developer-console:get-rag-trace`
- `developer-console:get-tool-calls`
- `developer-console:get-prompt-envelope`
- `developer-console:run-diagnostics`

### UI panels

Add only after approval:

- `DeveloperConsole.tsx`
- `LiveExecutionTracePanel.tsx`
- `ToolCallsPanel.tsx`
- `MemoryInspectorPanel.tsx`
- `RagInspectorPanel.tsx`
- `PromptViewerPanel.tsx`
- `TokenUsagePanel.tsx`
- `PerformanceTimelinePanel.tsx`
- `ErrorAnalyzerPanel.tsx`
- `KnowledgeInspectorPanel.tsx`
- `AutoDiagnosticPanel.tsx`

## Security Rules

Developer Console must never display:

- `.env`
- API keys
- tokens
- cookies
- credentials
- private keys
- secret storage values
- full unredacted provider headers

Prompt Viewer must be redacted by default.

Verbose mode can show file names, source services, and summaries, but not secret content.

## Engineering Verdict

The current codebase has several real foundations for a Developer Console, especially execution trace, approval audit, trusted workspace runtime, knowledge services, and provider health.

It does not yet have a production Developer Console. The missing piece is a unified runtime telemetry layer that collects events from every subsystem and exposes them through safe IPC to a dedicated UI.

The next implementation should start with backend telemetry contracts before adding UI panels.
