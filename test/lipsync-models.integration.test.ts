import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");

const audioPagePath = path.join(root, "app", "(dash)", "(routes)", "audio", "page.tsx");
const audioRoutePath = path.join(root, "app", "api", "generate", "audio", "route.ts");
const pricingPath = path.join(root, "lib", "pricing.ts");

const REQUIRED_LIPSYNC_MODELS = [
  "sync/lipsync-3",
  "infinitalk/from-audio",
  "kling/ai-avatar-pro",
  "bytedance/seedance-2",
  "bytedance/seedance-2-fast",
] as const;

function read(filePath: string): string {
  return fs.readFileSync(filePath, "utf-8");
}

function extractLipSyncModelsBlock(pageCode: string): string {
  const match = pageCode.match(/const LIP_SYNC_MODELS:[\s\S]*?=\s*\[([\s\S]*?)\];/);
  return match?.[1] ?? "";
}

describe("LipSync Models Integration Contract", () => {
  it("defines lip-sync models in audio UI without duplicates", () => {
    const pageCode = read(audioPagePath);
    const block = extractLipSyncModelsBlock(pageCode);
    expect(block.length).toBeGreaterThan(0);

    const ids = Array.from(block.matchAll(/id:\s*"([^"]+)"/g)).map((m) => m[1]);
    const uniqueIds = Array.from(new Set(ids));

    expect(ids).toHaveLength(REQUIRED_LIPSYNC_MODELS.length);
    expect(uniqueIds).toHaveLength(REQUIRED_LIPSYNC_MODELS.length);

    for (const modelId of REQUIRED_LIPSYNC_MODELS) {
      expect(uniqueIds).toContain(modelId);
    }
  });

  it("routes lip-sync model resolution in audio API for all required models", () => {
    const routeCode = read(audioRoutePath);

    expect(routeCode).toContain('const KIE_FROM_AUDIO_MODEL = "infinitalk/from-audio";');
    expect(routeCode).toContain('const KIE_AI_AVATAR_PRO_MODEL = "kling/ai-avatar-pro";');
    expect(routeCode).toContain('const KIE_SEEDANCE_2_MODEL = "bytedance/seedance-2";');

    expect(routeCode).toContain("function resolveLipSyncModel(model?: string): string");
    expect(routeCode).toContain("if (normalized === KIE_FROM_AUDIO_MODEL) return KIE_FROM_AUDIO_MODEL;");
    expect(routeCode).toContain("if (normalized === KIE_AI_AVATAR_PRO_MODEL) return KIE_AI_AVATAR_PRO_MODEL;");
    expect(routeCode).toContain("if (normalized === KIE_SEEDANCE_2_MODEL) return KIE_SEEDANCE_2_MODEL;");
    expect(routeCode).toContain("if (actionType === \"lip-sync\") return resolveLipSyncModel(body.model);");
  });

  it("maps new lip-sync model aliases to lipsync pricing bucket", () => {
    const pricingCode = read(pricingPath);

    expect(pricingCode).toContain('"sync/lipsync-3":                          "lipsync"');
    expect(pricingCode).toContain('"infinitalk/from-audio":                   "lipsync"');
    expect(pricingCode).toContain('"kling/ai-avatar-pro":                     "lipsync"');
    expect(pricingCode).toContain('"bytedance/seedance-2":                    "lipsync"');
    expect(pricingCode).toContain('"bytedance/seedance-2-fast":               "lipsync"');
  });

  it("keeps model-specific lip-sync validations in API", () => {
    const routeCode = read(audioRoutePath);

    expect(routeCode).toContain("Fields 'videoUrl' and 'audioUrl' are required for model='sync/lipsync-3'.");
    expect(routeCode).toContain("Fields 'imageUrl' and 'audioUrl' are required for selected lip-sync model.");
    expect(routeCode).toContain("Field 'prompt' is required for selected lip-sync model.");
    expect(routeCode).toContain("Provide prompt or media references for seedance lip-sync model.");
  });
});
