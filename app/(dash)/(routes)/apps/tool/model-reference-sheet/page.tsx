"use client";

import { ConsistentSheetTool } from "@/components/tools/ConsistentSheetTool";

const LOCKED_DIRECTION = `Production direction locked for strict model identity consistency.
This tool must preserve exact same face, hairstyle, skin tone, body proportions, outfit, and accessories.
No identity drift. No extra people. No collage. No text or logos.`;

const STYLE_PROMPT = `Create a highly consistent professional model turnaround set from the uploaded reference image.
Each frame must look like part of one coherent studio production.`;

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
