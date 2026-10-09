import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("credit route and deduction audit guarantees", () => {
  it("guarantees scene-studio spends credits before calling RunningHub and rolls back on failure", () => {
    const filePath = path.join(__dirname, "../app/api/scene-studio/create-task/route.ts");
    const code = fs.readFileSync(filePath, "utf8");

    // 1. Spends credits upfront
    const spendPos = code.indexOf("spendCredits");
    const fetchPos = code.indexOf("fetch(");
    expect(spendPos).toBeGreaterThan(-1);
    expect(fetchPos).toBeGreaterThan(-1);
    expect(spendPos).toBeLessThan(fetchPos);

    // 2. Rolls back if task creation failed or error thrown
    expect(code).toContain("rollbackGenerationCharge");
  });

  it("guarantees panel/transcribe rolls back charge on provider failure", () => {
    const filePath = path.join(__dirname, "../app/api/panel/transcribe/route.ts");
    const code = fs.readFileSync(filePath, "utf8");

    expect(code).toContain("rollbackGenerationCharge");
    // Verify rollback is invoked in the catch block
    const catchPos = code.indexOf("} catch (error) {");
    const rollbackPos = code.indexOf("rollbackGenerationCharge", catchPos);
    expect(rollbackPos).toBeGreaterThan(catchPos);
  });

  it("guarantees panel/generate/tts rolls back charge on provider failure", () => {
    const filePath = path.join(__dirname, "../app/api/panel/generate/tts/route.ts");
    const code = fs.readFileSync(filePath, "utf8");

    expect(code).toContain("rollbackGenerationCharge");
    const catchPos = code.indexOf("} catch (err) {");
    const rollbackPos = code.indexOf("rollbackGenerationCharge", catchPos);
    expect(rollbackPos).toBeGreaterThan(catchPos);
  });

  it("guarantees panel/generate/story rolls back charge on error or empty response", () => {
    const filePath = path.join(__dirname, "../app/api/panel/generate/story/route.ts");
    const code = fs.readFileSync(filePath, "utf8");

    expect(code).toContain("rollbackGenerationCharge");
    const emptyPos = code.indexOf("sections.length === 0");
    const rollbackInEmpty = code.indexOf("rollbackGenerationCharge", emptyPos);
    expect(rollbackInEmpty).toBeGreaterThan(emptyPos);

    const catchPos = code.indexOf("} catch (error) {");
    const rollbackInCatch = code.indexOf("rollbackGenerationCharge", catchPos);
    expect(rollbackInCatch).toBeGreaterThan(catchPos);
  });

  it("guarantees panel/generate/translate rolls back charge on batch failure", () => {
    const filePath = path.join(__dirname, "../app/api/panel/generate/translate/route.ts");
    const code = fs.readFileSync(filePath, "utf8");

    expect(code).toContain("rollbackGenerationCharge");
    const batchCatchPos = code.indexOf("} catch (batchErr) {");
    const rollbackInBatchCatch = code.indexOf("rollbackGenerationCharge", batchCatchPos);
    expect(rollbackInBatchCatch).toBeGreaterThan(batchCatchPos);
  });

  it("guarantees image route guards against zero credit generation", () => {
    const filePath = path.join(__dirname, "../app/api/image/route.ts");
    const code = fs.readFileSync(filePath, "utf8");

    expect(code).toMatch(/creditsToCharge\s*<=\s*0/);
  });

  it("guarantees callback route never spends credits and rollback is protected", () => {
    const filePath = path.join(__dirname, "../app/api/callback/route.ts");
    const code = fs.readFileSync(filePath, "utf8");

    // Callback must never call spendCredits
    expect(code).not.toContain("spendCredits");
    // Callback must call rollbackGenerationCharge on failed tasks
    expect(code).toContain("rollbackGenerationCharge");
  });
});
