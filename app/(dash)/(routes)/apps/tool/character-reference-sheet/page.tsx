"use client";

import { ConsistentSheetTool } from "@/components/tools/ConsistentSheetTool";

const LOCKED_DIRECTION = `Production direction captured locally. My Canvas Build a full AI fashion photoshoot system that lets a brand upload fashion items, lock brand identity, create consistent characters, dress characters with items, and generate campaign-ready visuals with multiple poses, angles, and compositions.
Lock the brand identity for a premium AI fashion photoshoot system. Define brand mood, target audience, luxury level, color palette, lighting language, wardrobe rules, material behavior, model casting direction, location tone, and negative constraints. This context must be reused by every downstream node.
Generate an army of consistent campaign characters from the uploaded character reference. Create a clean production reference sheet with multiple consistent characters or consistent identity states: full body, close-up, side angle, back angle, walking pose, editorial pose, neutral expression, confident expression, and fashion posture.
Preserve face identity, body proportions, hair, skin tone, and premium styling.
No text, no logos.`;

const STYLE_PROMPT = `Generate multiple angle variations of the same styled character and outfit: front, 3/4, side, back, seated, walking, and close-up crop.
Preserve identity, outfit, jewelry/product shape, lighting, and brand mood.
Create endless controlled variations from the approved fashion photoshoot outputs. Change pose, angle, composition, lens, location framing, and editorial mood while preserving the same character identity, outfit, fashion items, and brand identity.`;

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
