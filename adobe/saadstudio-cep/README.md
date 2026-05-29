# Saad Studio — CEP Panel for Premiere Pro & After Effects

An Adobe CEP extension that exposes the Saad Studio AI tools (image gen,
video gen, edit, reframe, remove background, upscale, draw-to-video)
directly inside the host app, talking to the existing
`/api/panel/*` endpoints on `saadstudio.app`.

> This panel is a **second**, optional UI surface — your existing UXP
> plugin under `adobe/EditPilotUXP/` is untouched. They can coexist.

## Layout

```
adobe/saadstudio-cep/
├── CSXS/manifest.xml          ← Extension declaration (PPRO + AEFT)
├── .debug                     ← CEF debugger ports for dev
├── jsx/index.jsx              ← ExtendScript bridge ($.saadstudio.*)
├── icons/                     ← Drop logo.png here
├── client/                    ← Vite + TS panel UI (built to client/dist/)
│   ├── index.html             ← Main panel
│   ├── draw.html              ← Draw-to-Edit panel
│   ├── src/
│   │   ├── main.ts            ← Main entry (router + auth gate)
│   │   ├── draw.ts            ← Draw-to-Edit entry
│   │   ├── lib/               ← cep / api / auth / store / router / ...
│   │   ├── components/        ← Header, prompt dock, model picker, ...
│   │   ├── pages/             ← Home + 7 feature pages
│   │   └── styles/            ← theme.css + components.css
│   └── package.json
├── scripts/
│   ├── enable-debug.bat       ← Turn on CEP PlayerDebugMode (Windows)
│   └── install-dev.ps1        ← Symlink the plugin into Adobe's CEP folder
└── README.md
```

## How it talks to the backend

Every API call goes to `${VITE_SAAD_API}/api/panel/...` and carries a
`Bearer ssp_…` token in the `Authorization` header. Endpoints used:

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| GET    | `/api/panel/me` | ✅ exists | user + credits + subscription |
| GET    | `/api/panel/credits` | ✅ exists | header refresh |
| GET    | `/api/panel/generations?limit=N` | ⚠️ todo | recent strip — add a route or rename to whatever you already have |
| GET    | `/api/panel/jobs/{id}` | ⚠️ todo | job polling |
| POST   | `/api/panel/generate/image` | ✅ exists | image generation |
| POST   | `/api/panel/generate/video` | ✅ exists | takes `mode` field (`edit`, `reframe`, `remove-bg`, `upscale`, `draw`, or omitted for text-to-video) |
| POST   | `/api/panel/generate/captions` | ✅ exists | future use |
| POST   | `/api/panel/generate/tts` | ✅ exists | future use |

Search the codebase for `/api/panel/generate/video` — the existing
handler probably needs an extra `mode` branch for `reframe`, `remove-bg`,
`upscale`, `edit` and `draw`. Each branch calls the appropriate
`MODEL_ROUTING` entry from `HOLLYWOOD-STUDIO/model-routing.ts`.

If you'd rather have separate endpoints per tool (`/api/panel/reframe`,
`/api/panel/remove-bg`, …), edit `client/src/pages/*.ts` and swap the
`api.generate.video({ mode: ..., ... })` call for your own. The shape
the panel expects back is always:

```ts
type JobStatus = {
  id: string;
  status: "queued" | "running" | "succeeded" | "failed";
  progress?: number;
  result?: {
    id: string;
    kind: "image" | "video";
    url: string;
    thumbnailUrl?: string;
    prompt?: string;
    model?: string;
  } | null;
  error?: string;
};
```

## ExtendScript surface

`jsx/index.jsx` exposes these on `$.saadstudio` (and the panel calls
them through `evalES("name", ...)` from `client/src/lib/cep.ts`):

- `getSelectedClip()` — first selected video clip on the active
  timeline (Premiere) or first selected footage layer (After Effects).
- `getActiveSequenceInfo()` — name/fps/width/height of the
  active sequence or comp.
- `importMediaFromPath(path)` — import a local file into the project
  bin; in Premiere it also drops it on V1 at the playhead.
- `importRemoveBackgroundMaskFromPath(path)` — same as above but
  reserved for matte/key use.
- `getActiveTimelineFrameSnapshot()` — render the current playhead
  frame to a temp PNG; used by the Draw-to-Video flow.
- `ping()` — health check.

All return values are JSON-serialized; errors come back as
`{ __error: true, message }` and surface as rejected promises in the
panel.

## Dev install (Windows)

1. **Build the client once** (so `client/dist/` exists):

   ```powershell
   cd adobe\saadstudio-cep\client
   npm install
   npm run build
   ```

2. **Enable CEP debug mode** (only needed once per machine):

   ```powershell
   cd adobe\saadstudio-cep
   .\scripts\enable-debug.bat
   ```

3. **Symlink the plugin into Adobe's CEP extensions folder.** Run this
   from an Administrator PowerShell (or with Windows Developer Mode
   enabled):

   ```powershell
   cd adobe\saadstudio-cep
   .\scripts\install-dev.ps1
   ```

4. **Drop a logo** into `icons/logo.png` (see `icons/README.md`).

5. **Restart Premiere Pro / After Effects.** The panel shows up under
   `Window → Extensions → Saad Studio`.

For HMR development you can run `npm run dev` inside `client/` and
point the manifest's `MainPath` at the dev URL — easier to just rebuild
with `npm run build` after edits and refresh the panel via its flyout
menu.

## Production / signed ZXP

To distribute the panel you need to sign it as a `.zxp` with the Adobe
ZXPSignCmd tool. Recommended flow:

```powershell
cd adobe\saadstudio-cep
npm run build:cep
npm run package:zxp
# or do both:
npm run release:zxp
```

For real distribution use a code-signing cert from a trusted CA
(DigiCert, Sectigo, etc.) and host an Adobe-style update manifest at
`https://saadstudio.app/adobe/manifest.json` — the panel can later
auto-update against it.

The release scripts stage a clean package under `release/`, generate a
manual-install zip, create a self-signed `.p12` if needed, and output
`release/SaadStudio.zxp`.

## What's intentionally lightweight

- **No React.** The panel uses a small DOM helper (`lib/dom.ts`). Bundle
  stays small and start-up is instant. If you want React later, swap
  `pages/*.ts` for `pages/*.tsx` and add the dependency.
- **No global state library.** A 60-line subscribable store in
  `lib/store.ts` covers the cross-cutting state (user, credits,
  recent generations).
- **Hash router.** Works on `file://` without any server.
- **Browser-preview mode.** Run `npm run dev` and load the panel in a
  regular browser — `lib/cep.ts` detects the absence of
  `window.__adobe_cep__` and returns mock data so the UI is still
  developable outside Adobe.

## Adding a new tool

1. Add an entry to `client/src/lib/apps.ts` (id, name, description,
   route, icon).
2. Create `client/src/pages/<id>.ts` — wrap `FeaturePage(...)` for
   prompt-only tools or `VideoUtilityPage(...)` for tools that operate
   on an existing clip.
3. Register the route in `client/src/main.ts`.
4. Add the matching backend handler under `app/api/panel/...` (or extend
   `/api/panel/generate/video` with a new `mode` value).
