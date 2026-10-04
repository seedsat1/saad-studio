import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const videoRoute = readFileSync("app/api/video/route.ts", "utf8");
const audioRoute = readFileSync("app/api/generate/audio/route.ts", "utf8");
const imageRoute = readFileSync("app/api/generate/image/route.ts", "utf8");

describe("final generation runtime safety wiring", () => {
  it("guards standby video providers before execution paths without exposing provider labels", () => {
    expect(videoRoute).toContain('isFinalProviderExecutionAllowed("byteplus")');
    expect(videoRoute).toContain('isFinalProviderExecutionAllowed("kie")');
    expect(videoRoute).toContain('providerNotActiveResponse("byteplus"');
    expect(videoRoute).toContain('providerNotActiveResponse("kie"');
    expect(videoRoute).toContain("GENERATION_SERVICE_UNAVAILABLE_MESSAGE");
    expect(videoRoute).not.toContain("BytePlus provider is not active for generation execution.");
    expect(videoRoute).not.toContain("KIE provider is not active for generation execution.");
    expect(videoRoute).not.toContain("KIE provider is not configured.");
  });

  it("guards KIE audio execution and preserves only existing active WaveSpeed fallbacks without exposing provider labels", () => {
    expect(audioRoute).toContain('hasActiveKie(kieKey)');
    expect(audioRoute).toContain('hasActiveWaveSpeedFallback(wavespeedKey)');
    expect(audioRoute).toContain('const lipSyncUsesWaveSpeed = lipSyncModelForProviderGate === WS_LIPSYNC_MODEL;');
    expect(audioRoute).toContain('actionType === "lip-sync" && !lipSyncUsesWaveSpeed');
    expect(audioRoute).toContain('actionType === "lip-sync" && lipSyncUsesWaveSpeed');
    expect(audioRoute).toContain('providerNotActiveResponse("kie")');
    expect(audioRoute).toContain("GENERATION_SERVICE_UNAVAILABLE_MESSAGE");
    expect(audioRoute).not.toContain("KIE provider is not active for generation execution.");
    expect(audioRoute).not.toContain("WaveSpeed provider is not active for generation execution.");
    expect(audioRoute).not.toContain("Google provider is not active for generation execution.");
  });

  it("marks transcript-only success completed without inventing a media URL", () => {
    expect(audioRoute).toContain("setGenerationCompletedWithoutMedia(generationId)");
    expect(audioRoute).toContain('return await finalize({ transcript, provider: "kie", chargedCredits: creditsToCharge }, 200)');
  });

  it("corrects ProviderUsageRecord to the actual successful provider", () => {
    expect(imageRoute).toContain('providerName: "WaveSpeed"');
    expect(imageRoute).toContain("setActualProviderUsage(generationId");
    expect(audioRoute).toContain("setActualProviderUsage(generationId");
  });
});
