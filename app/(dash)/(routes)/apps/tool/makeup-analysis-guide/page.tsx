"use client";

import { ConsistentSheetTool } from "@/components/tools/ConsistentSheetTool";

const LOCKED_DIRECTION = `Production direction captured locally. My Canvas Build a full AI fashion photoshoot system that lets a brand upload fashion items, lock brand identity, create consistent characters, dress characters with items, and generate campaign-ready visuals with multiple poses, angles, and compositions.
Lock the brand identity for a premium AI fashion photoshoot system. Define brand mood, target audience, luxury level, color palette, lighting language, wardrobe rules, material behavior, model casting direction, location tone, and negative constraints. This context must be reused by every downstream node.
Create a reusable prompt system for a full fashion photoshoot. It must convert uploaded character, fashion item, and brand references into production prompts for full-body shots, close-ups, outfit details, jewelry/product macros, editorial poses, camera angles, and campaign-ready compositions.`;

const STYLE_PROMPT = `Assemble the generated fashion photoshoot outputs into a final campaign board: brand identity, consistent characters, dressed outfits, full-body hero, editorial pose, angle sheet, beauty close-up, macro product detail, and variation outputs.
Clean luxury presentation, no text, no logos.

Generate campaign-ready beauty outputs with strict identity consistency and style consistency.`;

export default function MakeupAnalysisGuidePage() {
  return (
    <ConsistentSheetTool
      config={{
        toolId: "makeup-analysis-guide",
        title: "Makeup Analysis Guide",
        subtitle: "Consistent beauty frames for skin, eyes, lips, and full-face makeup review.",
        badge: "NEW",
        defaultCount: 4,
        countOptions: [4, 6],
        panelDefsByCount: {
          4: [
            { angle: "closeup", label: "Beauty Portrait" },
            { angle: "3-4-view", label: "Three-Quarter Beauty" },
            { angle: "extreme-closeup", label: "Skin Texture Detail" },
            { angle: "eye-level", label: "Balanced Front" },
          ],
          6: [
            { angle: "closeup", label: "Beauty Portrait" },
            { angle: "3-4-view", label: "Three-Quarter Beauty" },
            { angle: "extreme-closeup", label: "Skin Texture Detail" },
            { angle: "med-closeup", label: "Mid Beauty" },
            { angle: "profile", label: "Side Beauty" },
            { angle: "high-angle", label: "Overhead Beauty" },
          ],
        },
        lockedDirection: LOCKED_DIRECTION,
        stylePrompt: STYLE_PROMPT,
        placeholderPrompt: "Optional notes: makeup style, skin finish, color mood, lens...",
        aspectRatio: "3:4",
      }}
    />
  );
}
