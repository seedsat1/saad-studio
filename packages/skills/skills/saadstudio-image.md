---
name: saadstudio-image
description: Use when the user asks Claude Code to generate an image via Saad Studio (any phrasing like "make an image", "generate a picture", "create a shot", "render this scene"). Handles model choice, aspect ratio, and saving to disk.
---

# Generate an image with Saad Studio

You have the `saadstudio` CLI installed. Use it to fulfill any image-generation request the user makes in a Claude Code session.

## Preconditions

1. Confirm the CLI is available: `saadstudio --version` (if not, tell the user to run `npm i -g @saadstudio/cli`).
2. Confirm the user is signed in: `saadstudio whoami`. If not signed in, tell them to run `saadstudio login` in a separate terminal (opens their browser).

Do NOT run `saadstudio login` yourself from a Claude Code Bash call — it opens a browser and blocks on user interaction.

## The workflow

1. **Pick a model.** Default is `nano-banana-pro` (fast, photoreal, strong prompt adherence). Override only when the user asks for a specific look:
   - Text-heavy composition or typography → `gpt-image-2`
   - Product / commercial fidelity → `seedream/5-pro`
   - Painterly / stylized → `flux-2/pro`
   - See full list: `saadstudio models --kind image`

2. **Pick an aspect ratio** from what the user described:
   - Social feed → `1:1`
   - Landscape / cinematic → `16:9`
   - Vertical / story / TikTok → `9:16`
   - Portrait → `3:4`

3. **Pick a resolution**: `1K` for iteration, `2K` for the hero. Never jump to `4K` on the first try — it burns credits.

4. **Generate.** Prefer piping to a file the user can open immediately:

   ```bash
   saadstudio generate image "PROMPT" --aspect 16:9 --resolution 1K --out output.png
   ```

5. **Report back** with the local path AND the hosted URL (both are in the CLI output). Ask if they want a variant or a resolution bump before spending more credits.

## Reference images

If the user attaches an image or references a previous one, pass its URL via `--ref`:

```bash
saadstudio generate image "same subject, different lighting" --ref https://... --out v2.png
```

For URLs of the user's own past generations, fetch them with `saadstudio generations --kind image --limit 5 --json` and pick from the `items[].url` field.

## What NOT to do

- Do not silently generate more than one image at a time (`-n 2` and up) unless the user explicitly asked for variants — every image debits credits.
- Do not retry a failed generation more than once without asking. If the model returned an error, show it to the user and let them decide.
- Do not skip `--out` unless the user asked for the URL only. Downloading the file makes it viewable inside the Claude Code side pane.
