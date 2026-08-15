import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const videoRoute = readFileSync("app/api/video/route.ts", "utf8");
const audioRoute = readFileSync("app/api/generate/audio/route.ts", "utf8");
const imageRoute = readFileSync("app/api/generate/image/route.ts", "utf8");

describe("final generation runtime safety wiring", () => {
  it("guards standby video providers before execution paths", () => {
    expect(videoRoute).toContain('isFinalProviderExecutionAllowed("byteplus")');
    expect(videoRoute).toContain('isFinalProviderExecutionAllowed("kie")');
    expect(videoRoute).toContain('providerNotActiveResponse("byteplus"');
    expect(videoRoute).toContain('providerNotActiveResponse("kie"');
  });

  it("guards KIE audio execution and preserves only existing active WaveSpeed fallbacks", () => {
    expect(audioRoute).toContain('hasActiveKie(kieKey)');
    expect(audioRoute).toContain('hasActiveWaveSpeedFallback(wavespeedKey)');
    expect(audioRoute).toContain('actionType === "speech-to-text" || actionType === "audio-isolation" || actionType === "lip-sync"');
    expect(audioRoute).toContain('providerNotActiveResponse("kie")');
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
