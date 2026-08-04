---
name: saadstudio-storyboard
description: Use when the user wants to explore multiple visual concepts before committing (any phrasing like "give me options", "show me variations", "storyboard this", "concept sheet"). Generates N concept images from one idea and helps the user pick.
---

# Storyboard / concept sheet with Saad Studio

The user has an idea and wants to see it visualized several different ways before committing to one. Deliver a comparable set of concepts, not a bag of random images.

## When this skill applies

Trigger when the user says things like:
- "Give me a few options for..."
- "Storyboard the opening of..."
- "Show me variations of..."
- "I need a concept sheet for..."
- "Which of these directions do you like?"

If they say "just make me an image", use `saadstudio-image` instead.

## The recipe

1. **Understand the concept.** Get the core subject + setting. Ask one follow-up only if genuinely blocked.

2. **Pick the variation axis.** Vary ONE thing across the four concepts, not everything. Good axes:
   - Camera angle (low / eye-level / high / dutch)
   - Lighting mood (golden hour / neon / overcast / studio)
   - Style (photoreal / illustrated / cinematic film / animated)
   - Composition (wide / medium / close-up / detail)

   Announce the axis to the user so they know what they're comparing.

3. **Generate four concepts** in parallel:

   ```bash
   saadstudio generate image "PROMPT variant A" --aspect 16:9 --out concept-1.png
   saadstudio generate image "PROMPT variant B" --aspect 16:9 --out concept-2.png
   saadstudio generate image "PROMPT variant C" --aspect 16:9 --out concept-3.png
   saadstudio generate image "PROMPT variant D" --aspect 16:9 --out concept-4.png
   ```

   Use `nano-banana-pro` (fast, cheap). Concepts are for picking, not shipping — save the pro models for the final render.

4. **Present them** with a short caption for each ("Concept 1 — low angle, dusk"). Ask the user to pick 1-4 (or say "none, iterate").

5. **On pick**, offer three next steps:
   - **Refine**: regenerate the chosen concept at 2K with `seedream/5-pro` for the hero
   - **Animate**: hand off to `saadstudio-video` with the chosen image as `--image`
   - **Iterate**: new axis on the chosen concept (e.g. "same but different lighting")

## What NOT to do

- Don't vary the aspect ratio across concepts — they become uncomparable.
- Don't generate 6 or 8 concepts by default. Four is the sweet spot.
- Don't jump to video without a pick.
