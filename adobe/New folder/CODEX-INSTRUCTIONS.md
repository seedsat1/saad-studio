# Saad Studio — Premiere Pro UXP Plugin
## Complete Implementation Brief for Claude Code

---

## PROJECT SUMMARY

Build an **Adobe Premiere Pro UXP Plugin** branded as **Saad Studio**. This is a full AI Command Center inside Premiere Pro — NOT just a chat window. It has 16 production tools covering timeline analysis, AI video/image generation, TTS, color grading, auto-captions, and more.

**Key Files Attached:**
- `saadstudio-plugin-v2.html` — **THE EXACT UI TO IMPLEMENT.** This is the source of truth for all design decisions. Match every color, spacing, component, animation, and interaction pattern.
- This document — technical specs, API integration details, file structure, and implementation order.

---

## BRANDING & DESIGN SYSTEM

The plugin MUST match the design language of https://www.saadstudio.app/

### Colors (from the HTML file):
```css
--bg: #080b12;        /* Deep dark blue-black */
--s1: #111621;        /* Panel backgrounds */
--s2: #161c29;        /* Card backgrounds */
--s3: #1c2333;        /* Hover states */
--b1: #1e2738;        /* Borders */
--tx: #b8c4d8;        /* Body text */
--txh: #e8edf5;       /* Bright headings */
--txm: #6e7f9a;       /* Muted text */
--ac: #14b8a6;        /* PRIMARY ACCENT — Teal (Saad Studio brand color) */
--ac2: #0ea5e9;       /* Secondary accent — Blue */
```

### Typography:
- **Display/Headings:** `Outfit` (brand name, section titles, card names)
- **Body/UI:** `Manrope` (all interface text, buttons, labels)
- **Monospace:** `IBM Plex Mono` (timecodes, API data, technical values)

### Component Patterns (ALL defined in the HTML file):
- **Model Cards** — selectable cards with name + badge (TOP/NEW/HOT)
- **Pill Groups** — for Aspect Ratio, Resolution, Duration, Mode selection
- **Prompt Box** — textarea with footer containing Generate button + secondary actions
- **Generate Button** — gradient teal-to-blue with credit cost badge and shimmer hover effect
- **Sliders** — with label + live value display
- **Timeline Markers** — compact rows with timecode, description, color-coded badge
- **Dashboard Cards** — metric cards with top gradient bar
- **Style Engine Cards** — large selectable cards with icon, name, description
- **Voice Grid** — 3-column grid of selectable voice cards

**CRITICAL: Do NOT invent your own components. Use the exact HTML/CSS from the attached file.**

---

## TECH STACK

| Layer | Technology |
|-------|-----------|
| Plugin Platform | Adobe UXP for Premiere Pro v25.6+ |
| UI | HTML + CSS + Vanilla JS (UXP compatible) |
| AI Chat | Anthropic Claude API + OpenAI GPT API |
| Video/Image Gen | KIE.ai API (unified gateway) |
| Text-to-Speech | ElevenLabs API |
| Speech-to-Text | Whisper v3 / Deepgram (via KIE.ai) |
| Auth | Saad Studio OAuth2 (saadstudio.app) |
| Premiere Integration | UXP Premiere Pro DOM API |

### Key Documentation:
- UXP Plugins: https://developer.adobe.com/premiere-pro/uxp/plugins/
- UXP Manifest: https://developer.adobe.com/premiere-pro/uxp/plugins/concepts/manifest/
- Premiere API: https://developer.adobe.com/premiere-pro/uxp/ppro_reference/
- KIE.ai API: https://docs.kie.ai/1973359m0

### UXP Constraints (IMPORTANT):
- **No npm packages at runtime.** UXP does NOT support Node.js modules. Everything must be vanilla JS.
- Use `fetch()` for all HTTP requests.
- Use `require('uxp').storage.localFileSystem` for file operations.
- Use `require('premierepro')` for Premiere Pro DOM API access.
- UXP supports ES2020+ syntax but NOT npm/node modules.

---

## FILE STRUCTURE

```
saadstudio-premiere/
├── manifest.json
├── index.html
├── icons/
│   ├── icon_24.png
│   ├── icon_24@2x.png
│   ├── icon_48.png
│   └── icon_48@2x.png
├── styles/
│   └── main.css
├── src/
│   ├── app.js                       # App initialization, tab routing, event binding
│   ├── services/
│   │   ├── auth.js                  # Saad Studio OAuth2 authentication
│   │   ├── storage.js               # Persistent config (API keys, prefs)
│   │   ├── ai-client.js             # Claude + GPT API communication
│   │   ├── kie-client.js            # KIE.ai API (video/image/upscale)
│   │   ├── tts-client.js            # ElevenLabs TTS API
│   │   └── premiere-bridge.js       # Premiere Pro DOM API helpers
│   ├── panels/
│   │   ├── chat.js                  # 💬 Chat Assistant
│   │   ├── timeline-intel.js        # 🧠 Timeline Intelligence
│   │   ├── narrative.js             # 🎬 Narrative Assistant
│   │   ├── multicam.js              # 📹 MultiCam AI Sync & Cut
│   │   ├── color.js                 # 🎨 Scene-Based Color Matching
│   │   ├── audio.js                 # 🔊 Dialogue vs Music Balancer
│   │   ├── refactor.js              # ⚡ Smart Timeline Refactoring
│   │   ├── analyzer.js              # 📊 Project Analyzer Dashboard
│   │   ├── style-engine.js          # 🎯 Style Engine (one-click transforms)
│   │   ├── broll.js                 # 💥 AI B-Roll Generator
│   │   ├── videogen.js              # 🎬 Video Generation (KIE.ai)
│   │   ├── imagegen.js              # 🖼️ Image Generation (KIE.ai)
│   │   ├── tts.js                   # 🔊 Text-to-Speech (ElevenLabs)
│   │   ├── translate.js             # 🌍 Translation & Dubbing
│   │   └── captions.js              # 💬 Auto Captions
│   └── utils/
│       └── helpers.js               # Shared utilities
└── README.md
```

---

## MANIFEST.JSON

```json
{
  "manifestVersion": 5,
  "id": "com.saadstudio.premiere",
  "name": "Saad Studio",
  "version": "1.0.0",
  "main": "index.html",
  "host": {
    "app": "PremierePro",
    "minVersion": "25.6"
  },
  "entrypoints": [
    {
      "type": "panel",
      "id": "saadstudio-main",
      "label": { "default": "Saad Studio" },
      "minimumSize": { "width": 360, "height": 400 },
      "preferredDockedSize": { "width": 420, "height": 600 },
      "preferredFloatingSize": { "width": 450, "height": 700 }
    }
  ],
  "icons": [
    { "width": 24, "height": 24, "path": "icons/icon_24.png", "scale": [1, 2] },
    { "width": 48, "height": 48, "path": "icons/icon_48.png", "scale": [1, 2] }
  ],
  "requiredPermissions": {
    "network": {
      "domains": [
        "https://api.anthropic.com",
        "https://api.openai.com",
        "https://api.elevenlabs.io",
        "https://api.kie.ai",
        "https://www.saadstudio.app"
      ]
    },
    "localFileSystem": "fullAccess",
    "clipboard": "readAndWrite"
  }
}
```

---

## AUTHENTICATION SYSTEM

Users MUST authenticate with their Saad Studio account before using any feature. Show auth screen on first launch.

### Flow:
1. Plugin shows "Sign In with Saad Studio" screen
2. Click opens `https://www.saadstudio.app/auth/plugin-login?source=premiere` in browser
3. User logs in on saadstudio.app
4. saadstudio.app returns JWT token
5. Plugin stores token in UXP local storage
6. All API calls include `Authorization: Bearer <token>` header
7. Plugin reads user plan (Free/Pro/Max) and credit balance
8. Features are gated by plan — Free users see upgrade prompts

### Backend Endpoints Needed (Saad Studio web team):
```
POST /api/auth/plugin-token     → validate login, return JWT
GET  /api/user/me               → user info, plan, credits
POST /api/credits/deduct        → deduct credits after generation
GET  /api/user/api-keys         → user's stored KIE.ai + ElevenLabs keys
```

---

## THE 16 TOOLS — IMPLEMENTATION SPECS

### Tool 1: 💬 Chat Assistant
**What it does:** General AI assistant connected to the active Premiere Pro timeline.
**AI Backend:** Claude Sonnet 4.6 or GPT-4.1 (user selects in settings)
**System Prompt:** Auto-built from Premiere timeline context:
```javascript
const ppro = require('premierepro');
const project = ppro.Project.getActiveProject();
const seq = project.activeSequence;

// Build context:
// - Project name, sequence name
// - Track count (video + audio)
// - Duration
// - Transcript (if available via seq.transcript)
// - Clip names and timecodes
```
**UI:** Chat messages + action chips (Add Markers, Subclip, Move to V2, etc.) + quick action bar at bottom.
**Action chips execute Premiere API calls** when clicked (e.g., "Add Markers" calls `seq.markers.addMarker()`).

### Tool 2: 🧠 Timeline Intelligence
**What it does:** Deep AI analysis of the entire project.
**Detects:** Speech zones, key scenes, duplicate shots, silence gaps.
**Suggests:** Smart cuts, better sequence order, which clips to remove.
**Implementation:**
1. Read transcript via `seq.transcript.getText()` and `seq.transcript.getSegments()`
2. Get all clips metadata (names, durations, positions) from `seq.videoTracks[i].clips`
3. Send to AI with structured prompt asking for JSON response
4. Parse response and display as timeline markers
5. "Apply Smart Cuts" button uses `CompoundAction` to batch-edit the timeline

### Tool 3: 🎬 Narrative Assistant
**What it does:** Director-level story structure analysis.
**Input:** User pastes script OR AI reads transcript.
**Output:** Scene map with start/end points, B-roll insertion points, pacing suggestions.
**Implementation:** Send transcript + story brief to AI → returns scene boundaries as timecodes → display as markers → "Map to Timeline" adds markers via Premiere API.

### Tool 4: 📹 Multi-Camera AI Sync & Cut
**What it does:** Auto-switch between camera angles.
**Switching logic options:** Speech-based, motion-based, face detection, beat-sync.
**Implementation:** Analyze audio to find active speaker → AI determines best angle → create edit points on multicam sequence.

### Tool 5: 🎨 Scene-Based Color Matching
**What it does:** Detects scenes and applies per-scene color grading.
**Implementation:**
1. AI detects scene boundaries from transcript + visual analysis
2. User describes look OR provides reference image
3. AI generates Lumetri preset values per scene
4. Apply via `VideoComponentChain` and `Component` API

### Tool 6: 🔊 Dialogue vs Music Balancer
**What it does:** Professional audio mixing with smart ducking.
**UI Controls:** Voice/Music/SFX level sliders, Ducking sensitivity slider.
**Buttons:** Auto Balance, Smart Ducking, Denoise, LUFS Check.
**Implementation:** Use `AudioComponentChain` and `AudioFilterFactory` APIs.

### Tool 7: ⚡ Smart Timeline Refactoring
**What it does:** Clean up messy projects.
**Options (card selection):** Clean Tracks, Consolidate gaps, Auto Label clips, Organize Bins.
**Implementation:** Use `VideoTrack`, `AudioTrack`, `FolderItem`, `ProjectItem` APIs.

### Tool 8: 📊 Project Analyzer
**What it does:** Dashboard with project health metrics.
**Metrics:** Total scenes, avg cut length, issues found, engagement score.
**Issues detected:** Audio peaks, missing audio, jump cuts, pacing problems.
**UI:** 4 dashboard metric cards + issues list as markers.

### Tool 9: 🎯 Style Engine
**What it does:** One-click style transformation for entire project.
**Presets:** Cinematic Ad, YouTube Doc, Podcast Clean, Social Reels, News Report, Custom.
**What it changes:** Cuts + Color + Motion + Sound + Captions — ALL simultaneously.
**UI:** 6 style cards (grid), transform pills showing what's included, single "Apply Style" button with credit cost.
**Implementation:** Complex — combines multiple Premiere API calls in a CompoundAction.

### Tool 10: 💥 AI B-Roll Generator
**What it does:** Generate B-roll video clips from speech context.
**Flow:**
1. AI reads transcript → suggests B-roll for each speech segment
2. User selects which segments to generate for
3. Calls KIE.ai video generation API
4. Downloads generated video
5. Auto-imports to Premiere project
6. Inserts on V2 at the correct timecode
**UI:** Prompt + model/duration/aspect dropdowns + speech-to-B-roll marker suggestions.

### Tool 11: 🎬 Video Generation
**Via KIE.ai API.** Modes: Text→Video, Image→Video.
**UI (CRITICAL — match saadstudio.app/video):**
- Model selector: Cards with badges (Kling 3.0 TOP, Sora NEW, VEO 3 HOT, Seedance 2.0, Wan 2.1, Hailuo)
- Mode: Pill group (Text→Video / Image→Video)
- Duration: Pill group (3s / 5s / 10s / 15s)
- Aspect Ratio: Pill group (16:9 / 9:16 / 1:1 / 4:3)
- Resolution: Pill group (720p / 1080p / 4K)
- Quality: Slider (CFG Scale)
- Toggles: Multi-shot, Generate Sound
- Generate button with credit cost: `🎬 Generate Video · 6 cr`
- Insert to Timeline button

### Tool 12: 🖼️ Image Generation
**Via KIE.ai API.**
**UI (CRITICAL — match saadstudio.app/image):**
- Model cards: GPT Image 2, Flux 2 Pro, Imagen 4, Seedream 5, Ideogram V3
- Aspect Ratio pills: 1:1 / 16:9 / 9:16 / 4:3 / 3:4
- Number of Images pills: 1 / 2 / 3 / 4
- Resolution pills: 1K / 2K / 4K
- Generate button: `🖼️ Generate Image · 2 cr`
- Import to project button

### Tool 13: 🔊 Text-to-Speech
**Via ElevenLabs API.**
**UI:** Text input, Voice grid (3 columns), Stability/Clarity/Speed sliders, Generate button with cost, Waveform preview with Play + Insert to Timeline.

### Tool 14: 🌍 Translation & Dubbing
**UI:** Source/target language dropdowns, Checkboxes (subtitles, voice dubbing, lip sync), Translate button with cost.

### Tool 15: 💬 Auto Captions
**UI:** Engine dropdown (Whisper v3, Gemini Flash, Deepgram), Language dropdown, Style cards (Standard, Hormozi, Minimal, Karaoke), Font size slider, Max words/line slider, Generate button.

---

## KIE.AI API INTEGRATION

**Base URL:** `https://api.kie.ai`
**Auth Header:** `Authorization: Bearer <kie_api_key>`
**Full Docs:** https://docs.kie.ai/1973359m0

### API Call Pattern (all generation follows this):
```javascript
// Step 1: Submit generation job
const response = await fetch('https://api.kie.ai/v1/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${kieApiKey}`
  },
  body: JSON.stringify({
    model: 'kling-3.0',        // or 'sora', 'veo-3', etc.
    type: 'text-to-video',
    input: {
      prompt: 'Cinematic drone shot...',
      duration: 5,
      aspect_ratio: '16:9',
      resolution: '1080p'
    }
  })
});
const { task_id, status } = await response.json();

// Step 2: Poll for completion
const poll = async () => {
  const res = await fetch(`https://api.kie.ai/v1/tasks/${task_id}`, {
    headers: { 'Authorization': `Bearer ${kieApiKey}` }
  });
  const data = await res.json();
  if (data.status === 'completed') return data;
  if (data.status === 'failed') throw new Error(data.error);
  // Update progress UI...
  await new Promise(r => setTimeout(r, 3000));
  return poll();
};
const result = await poll();

// Step 3: Download and import to Premiere
const mediaUrl = result.output.url;
const mediaResponse = await fetch(mediaUrl);
const buffer = await mediaResponse.arrayBuffer();

const fs = require('uxp').storage.localFileSystem;
const tempFolder = await fs.getTemporaryFolder();
const file = await tempFolder.createEntry(`saadstudio_${Date.now()}.mp4`, { overwrite: true });
await file.write(buffer, { format: require('uxp').storage.formats.binary });

// Step 4: Import to Premiere Pro
const ppro = require('premierepro');
const project = ppro.Project.getActiveProject();
await project.importFiles([file.nativePath]);
```

### Available Models via KIE.ai:

**Video Models:**
| Model | Endpoint Path | Notes |
|-------|--------------|-------|
| Kling 3.0 | `/market/kling/3-text-to-video` | TOP - best quality |
| Sora | `/market/sora/text-to-video` | NEW - OpenAI |
| VEO 3 | `/market/veo3/text-to-video` | Google |
| Seedance 2.0 | `/market/seedance/2-text-to-video` | Fast |
| Wan 2.1 | `/market/wan/2-1-text-to-video` | Alibaba |
| Hailuo | `/market/hailuo/text-to-video` | MiniMax |

**Image Models:**
| Model | Endpoint Path | Notes |
|-------|--------------|-------|
| GPT Image 2 | `/market/gpt/gpt-image-2-text-to-image` | NEW |
| Flux 2 Pro | `/market/flux2/pro-text-to-image` | TOP |
| Imagen 4 | `/market/google/imagen4` | Google |
| Seedream 5 | `/market/seedream/5-lite-text-to-image` | Fast |
| Ideogram V3 | `/market/ideogram/v3-text-to-image` | Text-heavy |

**Upscale:**
| Model | Endpoint Path |
|-------|--------------|
| Topaz | `/market/topaz/image-upscale` |

---

## PREMIERE PRO API REFERENCE

```javascript
const ppro = require('premierepro');

// ── Project & Sequence ──
const project = ppro.Project.getActiveProject();
const seq = project.activeSequence;
seq.name;                              // Sequence name
seq.end.seconds;                       // Duration in seconds
seq.videoTracks;                       // Array of video tracks
seq.audioTracks;                       // Array of audio tracks
seq.videoTracks.length;                // Track count

// ── Transcript ──
seq.transcript.getText();              // Full transcript text
seq.transcript.getSegments();          // Timestamped segments

// ── Clips ──
const track = seq.videoTracks[0];
track.clips.length;                    // Number of clips
track.clips[0].name;                   // Clip name
track.clips[0].start.seconds;         // Start time
track.clips[0].end.seconds;           // End time
track.clips[0].duration.seconds;      // Duration

// ── Markers ──
const time = ppro.TickTime.createWithSeconds(83.5);
seq.markers.addMarker(time);           // Add marker
// Access last marker:
const marker = seq.markers[seq.markers.length - 1];
marker.name = 'Hook - Score 94';
marker.comment = 'Best engagement point';
marker.colorIndex = 0;                 // 0-7

// ── Playhead ──
seq.getPlayerPosition();               // Current playhead TickTime
seq.setPlayerPosition(time);           // Set playhead

// ── Import Files ──
await project.importFiles(['/path/to/video.mp4']);

// ── Insert to Timeline ──
const newItem = project.rootItem.children[project.rootItem.children.length - 1];
const v2 = seq.videoTracks[1];         // V2 track
const playhead = seq.getPlayerPosition();
await v2.insertClip(newItem, playhead);

// ── Audio/Video Effects ──
const clip = seq.videoTracks[0].clips[0];
clip.components;                       // VideoComponentChain
// Access Lumetri, audio filters, etc.
```

---

## IMPLEMENTATION PHASES

### Phase 1 — MVP (Build First):
1. **Auth** — Saad Studio login screen, JWT storage, plan/credit display
2. **Chat Assistant** — Full chat with Premiere context, action chips
3. **Video Generation** — Complete UI with model cards, pills, dropdowns, KIE.ai integration
4. **Image Generation** — Same quality as Video Gen
5. **TTS** — ElevenLabs integration with voice grid, sliders, waveform preview

### Phase 2 — Core Intelligence:
6. **Timeline Intelligence** — Deep analysis with markers
7. **B-Roll Generator** — Speech-to-B-roll pipeline
8. **Style Engine** — One-click style presets
9. **Auto Captions** — Whisper + style options
10. **Translation** — Subtitle + dubbing

### Phase 3 — Pro Tools:
11. **Narrative Assistant** — Script-to-timeline mapping
12. **Project Analyzer** — Dashboard metrics
13. **Audio Balancer** — Level mixing + ducking
14. **Timeline Refactoring** — Cleanup tools
15. **Multi-Camera Sync** — Auto-switching
16. **Real-time Assistant** — Live editing suggestions

---

## CRITICAL RULES

1. **The HTML design file is THE source of truth.** Copy the exact CSS, colors, components, animations. Do not invent new styles.

2. **Every generation tool MUST show credit cost** on the Generate button (e.g., `🎬 Generate Video · 6 cr`).

3. **Every generation tool MUST have proper controls:** Model selector, Aspect Ratio pills, Resolution pills, Duration pills, Quality sliders — exactly as shown in the HTML file.

4. **All API calls need try/catch.** Show friendly errors. If API key missing → redirect to Settings.

5. **All media generation calls go through KIE.ai** — NOT directly to Sora/VEO/etc.

6. **After generating any media, offer "Insert to Timeline"** button that imports the file and places it at the playhead on V2.

7. **No npm packages.** Pure vanilla JS. UXP does not support Node.js modules.

8. **Test with UXP Developer Tool (UDT) v2.2+.** Enable Premiere Developer Mode first: Settings → Plugins → Enable developer mode.

9. **Credits are checked BEFORE generation.** If insufficient credits → show upgrade prompt with link to saadstudio.app/pricing.

10. **Animations matter.** Every panel switch, every new marker, every message — should animate in smoothly as defined in the CSS (fadeUp, slideIn, etc.).

---

## TESTING CHECKLIST

- [ ] Plugin loads in Premiere Pro via UDT
- [ ] Auth screen shows for unauthenticated users
- [ ] Login flow works with saadstudio.app
- [ ] Credit balance displays and updates
- [ ] Chat connects to active sequence context
- [ ] Video Gen: model selection, all pills work, generates via KIE.ai
- [ ] Image Gen: same quality controls as Video Gen
- [ ] TTS: voice selection, sliders, generates via ElevenLabs
- [ ] Generated media imports to Premiere project
- [ ] "Insert to Timeline" places clip correctly
- [ ] All 16 tabs switch with smooth animations
- [ ] Settings modal saves API keys
- [ ] Error handling shows friendly messages
- [ ] Responsive within Premiere panel resize
