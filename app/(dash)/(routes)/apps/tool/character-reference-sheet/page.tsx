"use client";

import { ConsistentSheetTool } from "@/components/tools/ConsistentSheetTool";

const LOCKED_DIRECTION = `Production direction locked for a premium fashion campaign.
Brand mood: modern luxury, clean editorial, refined confidence.
Lighting language: soft key light, controlled fill, realistic shadows.
Consistency constraints: exact same face identity, hairstyle, skin tone, body proportions, outfit, and accessories.
Negative constraints: no text, no logos, no watermark, no collage, no split-screen, no anatomy distortion, no identity drift.`;

const STYLE_PROMPT = `Generate a consistent fashion character reference sheet style output.
Create standalone production-quality frames that preserve exact identity and styling continuity.
Keep clean neutral background and centered composition.`;

export default function CharacterReferenceSheetPage() {
  return (
    <ConsistentSheetTool
      config={{
        toolId: "character-reference-sheet",
        title: "Character Reference Sheet",
        subtitle: "Generate consistent identity sheets with multiple angles and editorial poses.",
        badge: "NEW",
        defaultCount: 6,
        countOptions: [4, 6, 9],
        panelDefsByCount: {
          4: [
            { angle: "eye-level", label: "Front Full Body" },
            { angle: "3-4-view", label: "Three-Quarter" },
            { angle: "profile", label: "Side Profile" },
            { angle: "back-view", label: "Back View" },
          ],
          6: [
            { angle: "eye-level", label: "Front Full Body" },
            { angle: "3-4-view", label: "Three-Quarter" },
            { angle: "profile", label: "Side Profile" },
            { angle: "back-view", label: "Back View" },
            { angle: "closeup", label: "Beauty Close-Up" },
            { angle: "low-angle", label: "Power Pose" },
          ],
          9: [
            { angle: "eye-level", label: "Front Full Body" },
            { angle: "3-4-view", label: "Three-Quarter" },
            { angle: "profile", label: "Side Profile" },
            { angle: "back-view", label: "Back View" },
            { angle: "closeup", label: "Beauty Close-Up" },
            { angle: "low-angle", label: "Power Pose" },
            { angle: "wide", label: "Wide Editorial" },
            { angle: "dutch-angle", label: "Dynamic Angle" },
            { angle: "med-closeup", label: "Mid Portrait" },
          ],
        },
        lockedDirection: LOCKED_DIRECTION,
        stylePrompt: STYLE_PROMPT,
        placeholderPrompt: "Add optional notes: pose style, mood, expression, camera preference...",
        aspectRatio: "3:4",
      }}
    />
  );
}
