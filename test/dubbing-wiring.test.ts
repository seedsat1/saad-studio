import { describe, it, expect } from "vitest";
import {
  DUBBING_SOURCE_LANGUAGES,
  DUBBING_TARGET_LANGUAGES,
  clampDubbingSpeakers,
  toDubbingSourceCode,
  toDubbingTargetCode,
} from "@/lib/dubbing-languages";

/**
 * ElevenLabs Dubbing (WaveSpeed `elevenlabs/dubbing`) takes ISO-639 codes and
 * bills $0.01 per second of source media, capped at 15 minutes. The route used
 * to forward language *names* and the constitution row billed a flat 12 credits
 * for any length, so a 15-minute job earned $0.35 against $9.00 of cost.
 *
 * The billing half of this contract needs a PricingConstitution row, so it
 * lives in test/integration/dubbing-pricing.test.ts.
 */
describe("dubbing language codes", () => {
  it("turns a language name into the code the provider expects", () => {
    expect(toDubbingTargetCode("Arabic")).toBe("ar");
    expect(toDubbingTargetCode("Spanish")).toBe("es");
    expect(toDubbingTargetCode("العربية")).toBe("ar");
    expect(toDubbingSourceCode("English")).toBe("en");
  });

  it("passes a code through untouched", () => {
    expect(toDubbingTargetCode("ar")).toBe("ar");
    expect(toDubbingSourceCode("ja")).toBe("ja");
  });

  it("normalises every spelling of auto-detect, lowercase as the API wants", () => {
    expect(toDubbingSourceCode("Auto")).toBe("auto");
    expect(toDubbingSourceCode("Auto-detect")).toBe("auto");
    expect(toDubbingSourceCode(undefined)).toBe("auto");
    expect(toDubbingSourceCode("Klingon")).toBe("auto");
  });

  it("refuses a target the model cannot dub into, even when it is a valid source", () => {
    // Hebrew, Persian and Thai are source-only per the provider's own lists.
    for (const sourceOnly of ["he", "fa", "th"]) {
      expect(toDubbingSourceCode(sourceOnly), sourceOnly).toBe(sourceOnly);
      expect(toDubbingTargetCode(sourceOnly), sourceOnly).toBeNull();
    }
    // Filipino is the reverse: a target but not a source.
    expect(toDubbingTargetCode("fil")).toBe("fil");
    expect(toDubbingSourceCode("fil")).toBe("auto");
  });

  it("carries the counts the provider documents", () => {
    expect(DUBBING_TARGET_LANGUAGES).toHaveLength(33);
    expect(DUBBING_SOURCE_LANGUAGES).toHaveLength(58); // 57 plus auto
  });

  it("clamps speakers to the accepted range", () => {
    expect(clampDubbingSpeakers(undefined)).toBe(0);
    expect(clampDubbingSpeakers(0)).toBe(0);
    expect(clampDubbingSpeakers(-4)).toBe(0);
    expect(clampDubbingSpeakers(3)).toBe(3);
    expect(clampDubbingSpeakers(999)).toBe(32);
  });
});
