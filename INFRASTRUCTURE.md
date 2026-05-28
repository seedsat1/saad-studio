# Saad Studio — Infrastructure

Single-page reference for where everything runs and which env vars
configure it. Keep this in sync with `.env.example`.

## Stack

| Layer        | Service              | Purpose                                              |
|--------------|----------------------|------------------------------------------------------|
| Hosting      | **Vercel**           | Next.js app + API routes + cron + Inngest webhooks  |
| Database     | **Neon (Postgres)**  | Users, credits, subscriptions, jobs, sessions, logs |
| Auth         | **Clerk**            | Sign-in, sessions, OAuth                            |
| Object store | **Cloudflare R2**    | Uploaded inputs + generated outputs (images / video)|
| Background   | **Inngest**          | Long-running jobs, retries, polling AI providers    |
| Email        | (optional)           | — wire when needed                                  |

## AI providers (model routing)

Defined in [HOLLYWOOD-STUDIO/model-routing.ts](./HOLLYWOOD-STUDIO/model-routing.ts).
Strategy:

| Family                              | Provider routed to       |
|-------------------------------------|--------------------------|
| Google Veo, Imagen, Nano Banana     | **Google official** (Vertex AI / Google AI Studio) |
| Seedance 2 (Pro / Lite)             | **BytePlus official**    |
| GPT, gpt-image-1, DALL·E, Whisper   | **OpenAI official**      |
| Everything else (Kling, Wan, Hailuo, Pika, Runway, Luma, FLUX, SDXL, Ideogram, …) | **kie.ai** aggregator |
| ElevenLabs voices / cloning         | **ElevenLabs**           |

## Database schema (what lives in Neon)

- **`User`** — Clerk userId, email, name, credit balance, role, banned flag
- **`UserSubscription`** — Stripe plan, billing interval, period end
- **`CreditLedger`** — every debit / refill with reason + reference
- **`PanelAuthSession`** — short-lived sessions for the plugin's OAuth handoff (TTL 5 min)
- **`Job`** — generation jobs (queued → running → succeeded/failed)
- **`Generation`** — finalized assets (kind, url, prompt, model, metadata)
- **`Project`** / **`Asset`** — user collections (optional grouping)

Connection string lives in `DATABASE_URL` (Neon pooled connection
recommended for serverless).

## Object storage (what lives in R2)

Bucket layout suggestion:

```
r2://saadstudio/
├── inputs/
│   └── {userId}/{yyyy}/{mm}/{uuid}.{ext}     ← user-uploaded reference clips/images
├── outputs/
│   └── {userId}/{yyyy}/{mm}/{jobId}.{ext}    ← AI-generated assets
└── thumbs/
    └── {userId}/{generationId}.jpg            ← thumbnails for the gallery strip
```

Served via a CDN URL like `https://cdn.saadstudio.app/...` so the panel
can stream video previews without authentication. Lifecycle rule:
inputs older than 30 days move to deep-archive class.

## Environment variables

```bash
# ── Core ────────────────────────────────────────────────────────────
DATABASE_URL=                          # Neon pooled
DIRECT_URL=                            # Neon direct (for migrations)
NEXT_PUBLIC_APP_URL=https://www.saadstudio.app

# ── Auth (Clerk) ────────────────────────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# ── Panel auth (HMAC for ssp_ tokens) ───────────────────────────────
PANEL_TOKEN_SECRET=                    # long random string

# ── Storage (Cloudflare R2) ─────────────────────────────────────────
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=saadstudio
R2_PUBLIC_BASE=https://cdn.saadstudio.app

# ── Billing ─────────────────────────────────────────────────────────
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# ── Background jobs ─────────────────────────────────────────────────
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# ── AI providers ────────────────────────────────────────────────────
# Google (Veo, Imagen, Nano Banana)
GOOGLE_VERTEX_KEY=                     # JSON service account or API key
GOOGLE_VERTEX_PROJECT=
GOOGLE_VERTEX_REGION=us-central1
GOOGLE_AI_API_KEY=                     # Gemini API for Nano Banana

# BytePlus (Seedance 2)
BYTEPLUS_API_KEY=
BYTEPLUS_REGION=ap-southeast

# OpenAI (GPT, gpt-image, DALL·E, Whisper)
OPENAI_API_KEY=

# kie.ai (everything else)
KIE_API_KEY=

# ElevenLabs
ELEVENLABS_API_KEY=
```

## How a generation flows end-to-end

```
┌───────────────────────┐
│ CEP panel in Premiere │  POST /api/panel/generate/video
│  (Saad Studio)        │      { model, prompt, ... }
└──────────┬────────────┘
           ▼
┌───────────────────────┐
│ Vercel — Next.js API  │  1. Verify ssp_ token (HMAC)
│  /api/panel/...       │  2. Check credits (Neon)
└──────────┬────────────┘  3. Deduct credits
           ▼                4. Enqueue Inngest job
┌───────────────────────┐
│ Inngest worker        │  5. Resolve provider via MODEL_CATALOG
│                       │  6. Call provider (Google / BytePlus /
│                       │     OpenAI / kie.ai)
│                       │  7. Poll provider until ready
└──────────┬────────────┘  8. Download result
           ▼
┌───────────────────────┐
│ Cloudflare R2         │  9. Upload to outputs/{userId}/...
│  outputs/             │
└──────────┬────────────┘
           ▼
┌───────────────────────┐  10. Insert Generation row in Neon
│ Neon (Postgres)       │  11. Update Job status = succeeded
└──────────┬────────────┘
           ▼
┌───────────────────────┐  12. Panel polls /api/panel/jobs/{id}
│ CEP panel             │  13. Renders preview from R2 CDN URL
│                       │  14. User clicks "Import to project"
│                       │      → ExtendScript imports into timeline
└───────────────────────┘
```

## Operational notes

- **Cold starts on Vercel**: heavy endpoints (FFmpeg, image processing)
  should run in Edge or Inngest, not in Vercel functions that get
  cold-started on every panel open.
- **Neon pooled vs direct**: use `DATABASE_URL` (pooled) in API routes,
  `DIRECT_URL` only in migrations.
- **R2 CORS**: allow `https://www.saadstudio.app` + the CEP panel's
  `chrome-extension://` origin (the panel reads the URL directly).
- **Clerk + the panel**: the plugin doesn't use Clerk sessions — it uses
  the short-lived `ssp_` HMAC token issued by `/api/panel/token` after
  the Clerk-protected session approves the auth handoff.
