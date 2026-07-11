# Saad Agent Conversation Intelligence & Knowledge Backlog

Date: 2026-06-29

This backlog defines a future development phase for Saad Agent after the current runtime fixes are complete. It does not replace the current implementation plan and must be implemented incrementally without breaking existing systems.

## Scope

Evolve Saad Agent from a single chat interface into a long-term AI engineering assistant with independent request execution, persistent conversations, searchable saved sessions, and intelligent recall.

These items are future architectural enhancements. They should not be treated as completed features until each item has runtime validation, regression tests, and manual desktop testing.

## Non-Negotiable Compatibility

Do not break:

- Intent Engine
- Conversation State Engine
- Goal Manager and reference resolution
- User Memory Manager
- Context Engine
- Vision Pipeline
- Engineering Orchestrator
- Existing providers and model role runtime
- Existing Electron IPC contracts unless versioned migration is provided

## Backlog

### 1. Engineering Workflow Investigation

Investigate why some engineering requests can remain at "Contacting the selected model..." while normal chat works.

Required instrumentation:

- Intent detection timing
- Workspace analysis timing
- Context builder timing
- Engineering planner timing
- Provider request timing
- Streaming or full-response status

The UI should display real execution stages instead of a single static loading message.

### 2. Independent Request Lifecycle

Every user message should become an independent request with:

- `requestId`
- `messageId`
- `turnId`
- execution state
- cancellation support

Concurrent messages must not merge or overwrite each other's runtime state.

### 3. Persistent Conversation History

Persist local conversation history across app restarts:

- user messages
- assistant responses
- attachments
- timestamps
- provider and model metadata
- workflow metadata

Startup should restore conversations and the last opened conversation.

### 4. Multiple Independent Conversations

Support multiple isolated conversations similar to modern AI apps.

Each conversation should own:

- `conversationId`
- title
- messages
- attachments
- workflow state
- visual context
- active goal
- workspace context

Global Memory remains shared, but conversation state and pronoun resolution remain isolated to the active conversation.

### 5. Separate Memory, History, and Runtime Context

Keep these systems independent:

- Global Memory: long-term user knowledge and preferences.
- Conversation History: full chat transcript and attachments.
- Runtime Context: temporary request execution state.

Do not store temporary discussion as permanent memory unless it is explicitly promoted.

### 6. Continuous Knowledge Learning

Build a knowledge layer that learns long-term useful patterns from usage:

- preferred workflows
- engineering practices
- UI/design preferences
- prompting style
- recurring projects
- development philosophy

Only durable knowledge should be promoted. Temporary messages should remain conversation history.

### 7. Explicit Conversation Saving

Support explicit save/archive commands such as:

- `احفظ هذه المحادثة`
- `احتفظ بهذه الجلسة`
- `أرشف هذه المحادثة`
- `احفظ هذا النقاش`

Saving a conversation should:

- summarize the discussion
- extract decisions
- extract open tasks
- extract conclusions
- extract project knowledge
- assign a title
- save a reusable Knowledge Session

Automatic history is different from explicit saved sessions.

### 8. Search Across Saved Conversations

Search should cover:

- saved conversations
- Knowledge Sessions
- project decisions
- Global Memory

Example user requests:

- `افتح المحادثة التي حفظناها عن Ollama`
- `وين وصلنا بموضوع Intent Routing؟`
- `وين ناقشنا Vision؟`
- `ابحث داخل محادثاتي`
- `افتح نقاش Premiere CEP`

### 9. Intelligent Recall

After a conversation is explicitly saved, the assistant should retrieve it and answer accurately.

Example recall questions:

- `ماذا اتفقنا بخصوص Ollama؟`
- `ماذا قررنا في مشروع Saad Studio؟`
- `ما آخر رسالة كتبناها للوكيل؟`
- `ما المشاكل التي اكتشفناها في Vision؟`
- `ما الحل الذي اعتمدناه لـ Intent Routing؟`

### 10. Automatic Conversation Titles

Generate meaningful conversation titles automatically, with manual rename support.

Examples:

- Intent Routing Investigation
- Ollama Integration
- Vision Workflow
- Premiere CEP
- Saad Studio Memory System

## Suggested Incremental Order

1. Instrument engineering workflow stages and expose request progress.
2. Introduce request lifecycle ids and cancellation.
3. Persist single-conversation history.
4. Add conversation list and isolation.
5. Add explicit save/archive as Knowledge Sessions.
6. Add search across saved sessions and memory.
7. Add intelligent recall over saved sessions.

## Validation Requirements

Each item requires:

- backend build
- frontend build
- existing regression tests
- new targeted tests
- packaged desktop manual validation
- no secret leakage in saved history, memory, logs, or diagnostics

## Current Status

Backlog recorded only. Not implemented yet.
