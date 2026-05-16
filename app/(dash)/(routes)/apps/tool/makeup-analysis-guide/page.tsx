"use client";

import { ConsistentSheetTool } from "@/components/tools/ConsistentSheetTool";

const LOCKED_DIRECTION = `Production direction locked for premium makeup analysis outputs.
Preserve exact identity, skin tone, face geometry, and styling consistency.
Ensure realistic texture, clean beauty lighting, and true-to-skin color fidelity.
No text overlays, no logos, no collage, no artifacts.`;

const STYLE_PROMPT = `Generate campaign-ready beauty angles for makeup and skin analysis.
Outputs must be editorial, ultra-clean, and consistent in quality and lighting.`;

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
