# Saad Agent Claude Code Reference Index

This file maps the local `E:\Agent-Reach-main\claude-code` folder as a read-only comparative architecture reference for Saad Agent.

## Source Status

- Reference root: `E:\Agent-Reach-main\claude-code`
- Primary inspected candidates:
  - `claude-code-main`
  - `Claude-code2-main/Claude-code-main`
  - `claude-code-source-code-leak-main`
- The folder is not Saad Agent source code.
- The folder must not be copied, run, vendored, bundled, imported, or reverse-engineered into Saad Agent.

## Allowed Use

Use it only for high-level architecture comparison:

- Agent loop shape: decide -> tool -> observe -> repeat -> finish.
- Tool registry and tool execution lifecycle.
- Task state and execution trace concepts.
- Approval and permission boundaries.
- File read/edit/search command workflows.
- Terminal/task abort behavior.
- Skill/plugin/hook organization concepts.
- Memory/context budget concepts.

## Forbidden Use

- Do not copy source files.
- Do not import modules from the reference folder.
- Do not execute scripts from the reference folder.
- Do not bundle the reference folder into the packaged app.
- Do not claim a Claude Code feature is integrated unless Saad Agent has an original implementation and a real import/call path.
- Do not ship leaked/proprietary/unofficial mirrors in public, sold, subscription, or customer-facing releases.

## Evidence Requirement

For tasks about Saad Agent architecture, agent loops, tools, planners, verifiers, IPC, permissions, hooks, sub-agents, memory, context compression, or Claude Code-style behavior, the runtime must inspect this index plus `CLAUDE_CODE_REFERENCE_MANIFEST.json` and at least one relevant reference path before making implementation claims.

The final runtime report must include:

`Claude-code files inspected: <actual reference paths>`

or:

`Claude-code files inspected: blocked - <reason>`

## Current Saad Agent Original Runtime Pieces

Saad Agent already has original implementations that should be preferred over copying external code:

- `src/platform/services/agent-loop.ts`
- `src/platform/services/tool-manager.ts`
- `src/platform/services/core-tool-registry.ts`
- `src/platform/services/approval-policy.ts`
- `src/platform/services/execution-trace-emitter.ts`
- `src/platform/services/codex-runtime-bridge.ts`
- `src/platform/tools/*`

Future work should connect or improve these original services rather than replace them with reference code.
