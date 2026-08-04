---
name: saadstudio-video
description: Use when the user asks Claude Code to generate a video via Saad Studio (any phrasing like "make a video", "animate this", "render a clip", "turn this image into video"). Handles model choice, image-to-video, duration, and saving to disk.
---

# Generate a video with Saad Studio

You have the `saadstudio` CLI installed. Use it to fulfill any video-generation request in a Claude Code session.

## Preconditions

1. `saadstudio --version` succeeds. If not: `npm i -g @saadstudio/cli`.
2. `saadstudio whoami` succeeds. If not, tell the user to run `saadstudio login` in a separate terminal.

Never run `saadstudio login` yourself — it opens a browser and needs the user.

## Deciding text-to-video vs image-to-video

- **If the user provided (or just generated) an image**, do image-to-video. Grab the image URL and pass it as `--image`. This is almost always what they want when they say "animate this" or "make it move".
- **If the user only gave a prompt**, do text-to-video.

To grab the URL of the user's most recent image:

```bash
saadstudio generations --kind image --limit 1 --json
```

Read `items[0].url` from the JSON. Do NOT ask the user to copy-paste it.

## Pick a model

Default is `kling-3.0/video`. Change only when the user asks:

- Best fidelity, native audio → `google/veo3`
- ByteDance quality, accepts reference audio → `seedance/2.0`
- Cost-efficient → `wan/2.2`
- OpenAI-style motion → `sora-2/video`

Full list: `saadstudio models --kind video`

## Pick duration and aspect

- Default duration: `5` seconds. Bump to `8-10` only when the user asked for a longer clip.
- Aspect:
  - Vertical / TikTok / Reels / UGC → `9:16`
  - Landscape / YouTube / cinematic → `16:9`
  - Square feed → `1:1`

## Generate

```bash
saadstudio generate video "PROMPT" \
  --image https://... \
  --duration 5 \
  --aspect 9:16 \
  --resolution 1080p \
  --out clip.mp4
```

Video generation takes 30–120 seconds — the CLI blocks until the job returns a URL, then downloads. Warn the user upfront so they don't think it hung.

## Report back

Give the user:
1. Local path (`clip.mp4`)
2. Hosted URL (from CLI stdout)
3. Duration and model used

Then ask whether they want:
- A variant of the same prompt
- A longer version
- A different aspect ratio

Never re-generate silently after the first render.

## Cost awareness

Video is significantly more expensive than image (typically 10-30× per credit). Before generating a 10-second Veo 3 clip, mention the approximate cost and get confirmation if the user hasn't already made that trade-off explicit.
