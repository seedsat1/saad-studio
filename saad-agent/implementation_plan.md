# Phase 17 Implementation Plan - Context Engine & Intelligent Retrieval

## Scope

- Continue the existing Saad Agent architecture without redesigning service boundaries.
- Implement retrieval through `ContextEngine` and connect it to `Planner`, `ReasoningEngine`, Electron IPC, and the React plan UI.
- Keep retrieval read-only and enforce secret filtering before file content enters context.

## Retrieval Pipeline

1. Workspace analysis from `.saad-agent/knowledge/project-summary.json`.
2. Knowledge and architecture lookup from `.saad-agent/knowledge/architecture.json`.
3. Engineering memory search through decisions, failures, successes, and knowledge base records.
4. Dependency lookup from `.saad-agent/knowledge/dependency-graph.json`.
5. Attachment metadata lookup from `.saad-agent/attachments`.
6. Ranking by filename, symbols, dependency relationships, semantic overlap, task history, recent modifications, and workspace scope.
7. Token budget optimization before sending assembled context to the Reasoning Engine.

## Security Rules

- Never retrieve `.env`, credentials, API keys, tokens, cookies, private keys, encrypted secret storage, or files whose names/paths indicate secrets.
- Scrub memory text before it is stored or assembled.
- Do not expose internal prompts in UI; show only metadata and summaries.

## Verification

- Backend build: `npm.cmd run build`.
- Frontend build: `npm.cmd run build` inside `saad-agent/ui`.
- Context Engine regression: `node dist/test-context-engine.js`.
- Cross-phase regressions: engineering memory, execution loop, project intelligence, orchestrator, connectors, multi-agent, vision, and incremental scanner tests.
