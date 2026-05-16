"use client";

import { ConsistentSheetTool } from "@/components/tools/ConsistentSheetTool";

const LOCKED_DIRECTION = `Create a highly consistent professional character turnaround reference from the uploaded character image.
Generate each angle as a completely separate standalone image while preserving exact identity consistency.
Required outputs:
1. Front-facing full body shot
2. Left side profile full body shot
3. Back-facing full body shot
4. Cinematic close-up portrait

Maintain:
- exact same face
- same hairstyle
- same skin tone
- same body proportions
- same clothing
- same accessories
- same fashion style
- same realistic anatomy

Style requirements: ultra realistic, studio photography, clean neutral background, professional lighting, realistic shadows, fashion editorial quality, highly detailed skin texture, cinematic realism, centered composition.`;

const STYLE_PROMPT = `IMPORTANT:
- each angle must be generated independently
- no collage
- no split screen
- no multi-panel sheet
- no duplicated random characters
- no merged bodies
- no distorted anatomy
- preserve exact character identity across all outputs

Generate multiple angle variations of the same styled character and outfit: front, 3/4, side, back, seated, walking, and close-up crop.
Preserve identity, outfit, jewelry/product shape, lighting, and brand mood.`;

export default function ModelReferenceSheetPage() {
  return (
    <ConsistentSheetTool
      config={{
        toolId: "model-reference-sheet",
        title: "Model Reference Sheet",
        subtitle: "Three-view model consistency tool: upper-body front, full-body front, full-body back.",
        badge: "NEW",
        defaultCount: 3,
        countOptions: [3, 4],
        panelDefsByCount: {
          3: [
            { angle: "med-closeup", label: "Upper-Body Front" },
            { angle: "eye-level", label: "Front Full Body" },
            { angle: "back-view", label: "Back Full Body" },
          ],
          4: [
            { angle: "med-closeup", label: "Upper-Body Front" },
            { angle: "eye-level", label: "Front Full Body" },
            { angle: "back-view", label: "Back Full Body" },
            { angle: "closeup", label: "Cinematic Close-Up" },
          ],
        },
        lockedDirection: LOCKED_DIRECTION,
        stylePrompt: STYLE_PROMPT,
        placeholderPrompt: "Optional notes: lens, expression, posture, styling constraints...",
        aspectRatio: "3:4",
      }}
    />
  );
}
