# Saad Agent Context

This file is the dedicated reference memory for Saad Agent only.

It must not contain website, SaaS app, Premiere CEP, Reap API, or unrelated project notes.

## Purpose

Saad Agent is a packaged Electron desktop AI engineering agent.

Its core responsibility is to help the user work on local software projects through:

- Direct chat.
- Workspace analysis.
- Provider and model runtime management.
- Persistent memory.
- Training knowledge retrieval.
- Attachment-based references.
- Context Engine retrieval.
- Controlled tool and MCP orchestration.

## Product Boundaries

- The main interface must stay focused on work: chat, workspace, attachments, conversations, current runtime state, and real notifications.
- Settings is the permanent configuration center for providers, models, skills, MCP, memory, security, diagnostics, and advanced runtime settings.
- The app must not show fake providers, fake MCP tools, fake skills, fake tasks, fake model status, or placeholder management cards.
- The agent must not claim an action happened unless backend code actually performed it.

## Direct Chat Rule

Direct chat must never jump straight to the model for every request.

Every message must pass through the orchestration gate first:

1. Detect intent.
2. Load memory and project rules.
3. Search training knowledge.
4. Search project context.
5. Load matching enabled skills.
6. Build final context.
7. Execute deterministic non-model actions when applicable.
8. Call the active model only when reasoning or generation is actually required.

Examples:

- "احفظ هذا" saves to memory/training and must not call the model.
- "تذكر اسمي سعد" writes memory and must not call the model.
- "من أنا؟" reads memory and must not guess.
- "ابحث في الإنترنت" uses the real internet/search provider or reports failure.
- "اكتب كود" may call the model after memory/training/context review.

## Permanent Memory

The agent has two memory layers:

- Engineering memory: decisions, failures, successes, task history, and user facts.
- Training knowledge: files placed or saved under `.saad-agent/training/`.

Memory must not store secrets, API keys, tokens, cookies, passwords, credentials, or sensitive environment values.

## Training Knowledge

The enforced training folder structure is:

```text
.saad-agent/training/
  books/
  maps/
  diagrams/
  screenshots/
  api-docs/
  project-docs/
  ui-references/
  code-examples/
  lessons/
```

The knowledge registry is:

```text
.saad-agent/knowledge/registry.json
```

Each registry item should store:

- file name
- type
- category
- summary
- tags
- added date
- indexed status
- chunk count
- embedding status
- last used date

Text, Markdown, JSON, TypeScript, JavaScript, and readable code files are indexed from content.

PDF, Word, image, screenshot, map, and diagram files are saved as permanent references. They remain metadata-only until a real PDF/DOCX/OCR/Vision extractor creates trusted text. The agent must not pretend extraction happened.

## Attachment Save Behavior

When the user uploads a file and says:

- احفظ
- تذكر
- خزّن
- درّب
- استخدمه كمرجع
- save
- remember
- train
- reference

The app must:

1. Store the attachment through the attachment manager.
2. Copy it into the correct `.saad-agent/training/` category.
3. Rebuild the training registry and index.
4. Confirm the save without calling the model.

Attachment category routing:

- Images -> `screenshots/`
- PDF, Word, RTF, generic documents -> `project-docs/`
- JSON/YAML -> `api-docs/`
- Source code -> `code-examples/`
- Markdown/TXT -> `lessons/`

## Provider Runtime

Providers are real runtime records managed by Settings.

Supported visible providers include:

- LM Studio
- Ollama
- OpenAI
- Anthropic
- Gemini
- OpenRouter
- Saad Studio

Provider settings must persist globally under the Electron application data root, not inside a random active workspace.

API keys must be stored only through encrypted secret references. Settings JSON must store metadata and secret references only.

LM Studio is a provider, not an MCP server.

For LM Studio 0.4.18:

- Model discovery should prefer `GET /api/v1/models`.
- Chat should prefer `POST /api/v1/chat`.
- OpenAI-compatible endpoints are fallback only.
- Empty HTTP 200 responses must be treated as failures, not silent success.

## Model Roles

Model roles are:

- Coding
- Vision
- Reviewer
- Fast

Each role stores:

- provider
- model name
- temperature
- max output tokens
- detected context window
- streaming
- timeout
- retry count

Context window is detected metadata and must not be manually edited by the user.

## Composer Behavior

The composer is an intelligent command composer, not a configuration form.

Default runtime routing is Auto:

- Intent: Auto
- Agent: Auto
- Skill: Auto
- Tools: Auto

Runtime chips may show workspace, provider, model, agent, skill, and tools. Manual override is allowed through chips, slash commands, mentions, or advanced selectors.

The composer starts as a single-line input and grows upward only from typed text. Attachments must appear as compact chips or thumbnails and must not enlarge the composer.

The microphone control must not appear unless real voice input is implemented.

## Conversations

The desktop chat supports multiple local conversation pages.

Each conversation can be:

- created
- renamed
- deleted
- restored locally

Conversation data is local UI organization and must not store secrets.

## Settings Behavior

Settings must contain only real, wired product modules.

Do not expose static placeholder pages or internal engine debug fields as normal user settings.

Settings pages must be backed by storage, backend behavior, or honest empty/unavailable states.

## Skills

Skills are configurable knowledge modules.

Built-in skills:

- can be viewed
- can be enabled or disabled
- cannot be deleted

Custom skills:

- can be created
- can be imported
- can be edited
- can be removed

Disabled skills must not be injected into Context Engine results.

Unsafe custom skill manifests must be rejected.

## MCP

MCP Settings is only for real MCP servers.

LM Studio, Ollama, OpenAI, and similar AI model providers must not appear as MCP servers.

MCP server management must support:

- add server
- configure
- enable/disable
- test connection
- discovery
- tools/resources/prompts listing
- permissions
- logs
- restart
- remove

## Security

The agent must never retrieve, index, log, display, or store:

- `.env`
- API keys
- tokens
- cookies
- passwords
- credentials
- private keys
- encrypted secret stores

Secret filtering is mandatory across memory, diagnostics, knowledge, settings, logs, and context retrieval.

## Packaging

The current packaged operation center is:

```text
saad-agent/release-production-v4/win-unpacked/
```

Packaged Electron builds load renderer files from:

```text
resources/app.asar/ui/dist/index.html
```

When rebuilding a packaged copy manually, ensure updated backend `dist/**`, preload files, and `ui/dist/**` are included inside `app.asar`.

## Current Known Limitation

PDF, Word, image, screenshot, map, and diagram files are saved as permanent training references, but deep content extraction requires real PDF/DOCX/OCR/Vision extraction. Until that exists, the agent must describe them as stored references, not fully read documents.

