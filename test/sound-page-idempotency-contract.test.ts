import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const soundFiles = ["public/stude/sound.html", "stude/sound.html"];

describe("sound page audio generation idempotency", () => {
  it.each(soundFiles)("%s sends Idempotency-Key with paid audio POST requests", (filePath) => {
    const source = readFileSync(filePath, "utf8");
    const directPostCalls = source.match(/fetch\('\/api\/generate\/audio',\{method:'POST'/g) ?? [];

    expect(source).toContain("function postAudioGeneration(body)");
    expect(source).toContain("'Idempotency-Key':makeAudioIdempotencyKey(body&&body.actionType)");
    expect(directPostCalls).toHaveLength(1);
  });
});
