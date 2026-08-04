---
name: saadstudio-ugc-video
description: Use when the user asks for a UGC-style short-form ad, a product video for social, or a "TikTok/Reels/Shorts style" ad. Runs the full concept → hero shot → animated clip pipeline with Saad Studio.
---

# UGC-style product video (Saad Studio pipeline)

The user wants a scroll-stopping vertical product ad. Don't jump straight to `generate video` — run the full pipeline so they get to approve the visual before spending video credits.

## Preconditions

- `saadstudio --version` and `saadstudio whoami` both succeed.
- If either fails, stop and tell the user to install/login first.

## The pipeline

### Step 1 — Understand the ask

Get from the user (or infer from what they said):
- **Product** — what is it, what does it look like? Do they have a reference image?
- **Vibe** — luxury, playful, minimalist, gritty, natural-light UGC, studio, etc.
- **Hook** — the one thing the viewer must feel in the first 2 seconds.

If any of these are missing and you can't infer them from context, ask a single tight follow-up. Don't interrogate.

### Step 2 — Generate 3 hero-shot concepts

Run three parallel image generations at 1K, `9:16`, `seedream/5-pro` (best product fidelity):

```bash
saadstudio generate image "PROMPT_A" --model seedream/5-pro --aspect 9:16 --out hero-a.png
saadstudio generate image "PROMPT_B" --model seedream/5-pro --aspect 9:16 --out hero-b.png
saadstudio generate image "PROMPT_C" --model seedream/5-pro --aspect 9:16 --out hero-c.png
```

Vary the prompts along **one axis** the user cares about (angle, lighting, background). Do NOT vary everything — the user needs to be able to compare cleanly.

If the user has a reference product image, pass it via `--ref` to every prompt so the object stays consistent.

### Step 3 — Let the user pick ONE

Present the three files. Ask "pick 1, 2, or 3". Do not proceed until they pick. If they hate all three, iterate on prompts — don't animate a shot they're lukewarm on.

### Step 4 — Animate the chosen shot

Get the hosted URL of the chosen image:

```bash
saadstudio generations --kind image --limit 3 --json
```

Match by filename or timestamp, extract `items[N].url`. Then:

```bash
saadstudio generate video "MOTION_DESCRIPTION — 9:16, UGC handheld feel, shallow depth of field, natural motion" \
  --image <URL_OF_CHOSEN_HERO> \
  --model kling-3.0/video \
  --aspect 9:16 \
  --duration 5 \
  --resolution 1080p \
  --out ad.mp4
```

Motion prompts to prefer: subtle camera push-in, product-in-hand reveal, slow orbit, hand pouring/opening/using. Avoid dramatic scene changes — they break UGC realism.

### Step 5 — Deliver

Give the user:
- `ad.mp4` (local file)
- Hosted URL from `saadstudio generations --kind video --limit 1`
- The three hero-shot files so they can pick differently and re-animate cheaply

Offer: "Want a 10-second version, or a variant with different motion?"

## Rules

- **One video render per pipeline run.** Video credits are ~20× image credits — never animate all three heroes.
- **Never skip Step 3.** Even if the user seems in a hurry, the picker saves them money and gives them a better ad.
- **Vertical only.** UGC = `9:16`. If they push back, confirm before doing 1:1 or 16:9.
- **Do not `saadstudio login` yourself.** Only the user can do that.
