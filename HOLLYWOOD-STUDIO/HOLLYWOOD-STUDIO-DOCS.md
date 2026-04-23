# Hollywood AI Studio — Project Documentation

## 1. UX Flow Summary

Single-page studio: idea → script → storyboard → characters → voice → camera → lighting → motion → transitions → render. User never navigates away.

```
┌─ Open Project ─────────────────────────────────────────────────────────────┐
│                                                                            │
│  Select Preset → Write Script → Build Storyboard → Assign Characters →    │
│  Configure Voice → Set Camera & Lighting → Define Motion → Add            │
│  Transitions → Preview → Render → Export                                   │
│                                                                            │
│  At any point: switch scenes, adjust inspector tabs, view job console      │
└────────────────────────────────────────────────────────────────────────────┘
```

**Key UX Decisions:**
- **Scene-first architecture**: Left rail is entry point. Selecting a scene populates all inspector tabs.
- **10-tab inspector**: Dense professional tool set (Script, Storyboard, Characters, Voice, Camera, Lighting, Motion, Transitions, Presets, Render).
- **Job Console**: Bottom dock shows real-time job logs with model names, timestamps, status.
- **Non-blocking generation**: Scenes generate in background while user edits others.
- **Model visibility**: Every AI-powered action shows which model is being used.
- **Autosave**: Debounced save after any edit, visible in top bar.
- **Mobile-responsive**: Three-panel layout collapses to full-screen panels with bottom nav on mobile.

---

## 2. Component Tree

```
HollywoodStudio (root)
├── StudioContext.Provider
├── TopBar
│   ├── MobileMenuButton
│   ├── ProjectBadge (logo + name)
│   ├── ProjectTitleEdit
│   ├── SaveIndicator
│   ├── PresetPill (active preset display)
│   ├── CreditsBadge
│   ├── PlanBadge
│   ├── ConsoleToggle
│   └── RenderButton
├── StudioBody (3-column)
│   ├── SceneTimeline (left rail)
│   │   ├── PanelHeader (count + total duration)
│   │   ├── SceneList
│   │   │   └── SceneCard[] (thumb, title, status, tags, lock, hover actions)
│   │   └── AddSceneButton
│   ├── PreviewCanvas (center stage)
│   │   ├── Viewport
│   │   │   ├── EmptyState
│   │   │   ├── GeneratingState (with model name)
│   │   │   └── CanvasFrame
│   │   │       ├── SafeZoneGuides (action + title safe)
│   │   │       ├── Crosshairs
│   │   │       ├── SceneInfo
│   │   │       ├── FrameMetaChips (shot type, lens, lighting)
│   │   │       └── PresetBadge
│   │   ├── StoryboardStrip
│   │   └── PlayControls
│   └── Inspector (right rail)
│       ├── InspectorTabs (10 tabs with icons)
│       └── InspectorBody
│           ├── ScriptTab (title, script, duration, tags, AI breakdown)
│           ├── StoryboardTab (frame cards with shot/lens/lighting/transition selectors)
│           ├── CharactersTab (CRUD with avatar gen, mood, voice assignment)
│           ├── VoiceTab (TTS selector, speed/pitch, voice cloning with consent)
│           ├── CameraTab (shot types catalog, lens presets catalog)
│           ├── LightingTab (lighting setups catalog with mood tags)
│           ├── MotionTab (camera motion types catalog)
│           ├── TransitionsTab (transition types catalog with timing)
│           ├── PresetsTab (8 presets with profile details)
│           └── RenderTab (resolution/format/model config, render queue)
├── JobConsole (bottom dock)
│   ├── ConsoleHeader
│   └── ConsoleBody (log entries with time, status, model, message)
├── MobileNav (bottom tab bar, hidden on desktop)
└── ToastOverlay
```

---

## 3. Folder Structure (Next.js 14 App Router)

```
app/
├── studio/
│   ├── page.tsx                      ← Main studio page
│   └── layout.tsx                    ← Studio layout wrapper
├── layout.tsx                        ← Root layout
└── globals.css                       ← Design tokens

components/
├── studio/
│   ├── TopBar.tsx
│   ├── SceneTimeline.tsx
│   ├── SceneCard.tsx
│   ├── PreviewCanvas.tsx
│   ├── PlayControls.tsx
│   ├── StoryboardStrip.tsx
│   ├── Inspector.tsx
│   ├── JobConsole.tsx
│   ├── MobileNav.tsx
│   ├── ToastOverlay.tsx
│   └── tabs/
│       ├── ScriptTab.tsx
│       ├── StoryboardTab.tsx
│       ├── CharactersTab.tsx
│       ├── VoiceTab.tsx
│       ├── CameraTab.tsx
│       ├── LightingTab.tsx
│       ├── MotionTab.tsx
│       ├── TransitionsTab.tsx
│       ├── PresetsTab.tsx
│       └── RenderTab.tsx
├── common/
│   ├── Icon.tsx
│   ├── Button.tsx
│   ├── FormField.tsx
│   └── EmptyState.tsx

lib/
├── studio/
│   ├── types.ts                      ← All TypeScript interfaces
│   ├── store.ts                      ← Zustand store (or context)
│   ├── model-routing.ts              ← Model registry + failover
│   ├── presets.ts                    ← 8 production presets
│   ├── camera-catalog.ts            ← Shot types + lens presets
│   ├── lighting-catalog.ts          ← 10 lighting setups
│   ├── transitions-catalog.ts       ← 12 transition types
│   ├── mock-engine.ts               ← Mock async job engine
│   └── services/
│       ├── index.ts                  ← Service barrel exports
│       ├── project.service.ts
│       ├── scene.service.ts
│       ├── storyboard.service.ts
│       ├── character.service.ts
│       ├── voice.service.ts
│       ├── video.service.ts
│       ├── render.service.ts
│       └── audio.service.ts
```

---

## 4. Integration Map — Which Button Calls Which Model/Service

| UI Action                  | Inspector Tab   | Model Used                    | Service           | Endpoint                           |
|---------------------------|-----------------|-------------------------------|--------------------|------------------------------------|
| AI Script Breakdown       | Script          | gpt-5.4                      | scriptService      | POST /api/script/breakdown         |
| Generate Storyboard Frame | Storyboard      | Imagen 4 Ultra → FLUX        | storyboardService  | POST /api/storyboard/generate      |
| Regenerate Scene          | Timeline        | Imagen 4 Ultra → FLUX        | sceneService       | POST /api/scenes/:id/regenerate    |
| Generate Character Avatar | Characters      | Imagen 4 Ultra                | characterService   | POST /api/characters/avatar        |
| Preview TTS               | Voice           | eleven_v3 → eleven_turbo_v2_5 | voiceService       | POST /api/voice/preview            |
| Clone Voice               | Voice           | ElevenLabs PVC               | voiceService       | POST /api/voice/clone              |
| Generate Video            | Render          | Kling 3 → Seedance 2 → Sora | videoService       | POST /api/video/generate           |
| Start Render              | Render/TopBar   | Kling 3 (primary)            | renderService      | POST /api/render                   |
| Continuity Check          | Storyboard      | gpt-5.4-mini                 | continuityService  | POST /api/qa/continuity            |
| Prompt Refinement         | Storyboard      | gpt-5.4-mini                 | promptService      | POST /api/prompt/refine            |
| Transcription             | Voice           | gpt-4o-transcribe            | transcriptionSvc   | POST /api/transcribe               |

---

## 5. Preset System

Each of the 8 presets defines complete production profiles:

| Preset               | Visual           | Camera      | Lighting    | Motion      | Transitions | Audio            | Voice         | Pacing  |
|----------------------|------------------|-------------|-------------|-------------|-------------|------------------|---------------|---------|
| Cinematic Blockbuster| 21:9 teal-orange | wide/35mm   | rembrandt   | drift+para  | dissolve    | orchestral       | narrator 0.95 | 24 bpm  |
| TV News Report       | 16:9 neutral     | medium/50mm | high key    | static      | hard cut    | subtle bed       | anchor 1.1    | 30 bpm  |
| Emotional Drama      | 2.35:1 warm      | close-up/85 | low key     | drift       | dissolve    | piano-strings    | emotional 0.9 | 20 bpm  |
| True Crime           | 16:9 cold desat  | medium/35mm | split       | static      | hard cut    | tension drone    | investigator  | 26 bpm  |
| Fantasy Epic         | 21:9 vibrant     | aerial/24mm | golden      | drift+para  | morph       | epic choir       | epic 0.9      | 22 bpm  |
| Tech Promo           | 16:9 clean       | medium/50mm | high key    | parallax    | zoom        | electronic       | confident 1.05| 32 bpm  |
| Anime Stylized       | 16:9 saturated   | medium/35mm | rim         | parallax    | flash       | j-pop orchestral | anime 1.0     | 28 bpm  |
| Trailer Mode         | 21:9 hi-contrast | wide/24mm   | neon        | drift+para  | whip        | trailer braams   | trailer 1.15  | 36 bpm  |

---

## 6. Design Tokens (Matching Saad Studio)

| Token              | Value                     | Purpose                  |
|--------------------|---------------------------|--------------------------|
| `--c-bg`           | `#0B0D18`                 | Deep navy background     |
| `--c-surface-0`    | `#0F1123`                 | Panel backgrounds        |
| `--c-surface-1`    | `#161830`                 | Cards, inputs            |
| `--c-surface-2`    | `#1C1F3A`                 | Active/hover states      |
| `--c-surface-3`    | `#252847`                 | Elevated elements        |
| `--c-border`       | `#2A2D4A`                 | Borders                  |
| `--c-text`         | `#E8EAF6`                 | Primary text             |
| `--c-text-sec`     | `#8B8FA8`                 | Secondary text           |
| `--c-text-mut`     | `#555878`                 | Muted/disabled           |
| `--c-accent`       | `#7C3AED`                 | Primary purple accent    |
| `--c-green`        | `#34D399`                 | Success                  |
| `--c-red`          | `#F43F5E`                 | Error/danger             |
| `--c-blue`         | `#3B82F6`                 | Info/locked              |
| `--c-amber`        | `#F59E0B`                 | Warning/generating       |
| Font Main          | DM Sans                    | UI text                  |
| Font Mono          | IBM Plex Mono              | Technical/timecodes      |

---

## 7. Mock Job Examples

```typescript
// Scene regeneration mock
addLog({
  type: "image",
  status: "pending",
  model: "Imagen 4 Ultra",
  message: "Regenerating scene s3 — 3 frames"
});
// ... after 3 seconds:
addLog({
  type: "image",
  status: "success",
  model: "Imagen 4 Ultra",
  message: "Scene s3 — 3 frames generated (2.8s)"
});

// Render job mock
addLog({
  type: "render",
  status: "pending",
  model: "Kling 3",
  message: "Render job rj-001 queued — 1080p MP4"
});
// Progress updates every 2s, then:
addLog({
  type: "render",
  status: "success",
  model: "Kling 3",
  message: "Render complete — output ready for download"
});

// Failover example
addLog({
  type: "video",
  status: "error",
  model: "Kling 3",
  message: "Kling 3 timeout — falling back to Seedance 2"
});
addLog({
  type: "video",
  status: "pending",
  model: "Seedance 2",
  message: "Retrying with fallback provider..."
});
```

---

## 8. Accessibility

- All interactive elements have `aria-label` attributes
- Inspector uses `role="tab"` / `aria-selected` semantics
- Scene cards are keyboard-navigable (`tabIndex`, `onKeyDown`)
- Focus states use accent color with visible ring
- Status never relies on color alone — text labels always present
- Mobile bottom nav provides equivalent navigation to desktop panels
- Form fields have proper label associations
