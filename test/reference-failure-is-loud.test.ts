import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * A character whose stored image has gone missing used to generate anyway: the
 * route logged a warning, dropped the reference, spent the credits and returned
 * a stranger's face. These assertions pin the two properties that make that
 * impossible — the request is refused, and it is refused before charging.
 */
const SRC = fs.readFileSync(
  path.join(process.cwd(), "app/api/generate/image/route.ts"),
  "utf8",
);
const lineOf = (needle: string) => {
  const i = SRC.indexOf(needle);
  expect(i, `not found: ${needle}`).toBeGreaterThan(-1);
  return SRC.slice(0, i).split("\n").length;
};

describe("unreachable reference images fail loudly", () => {
  it("refuses the request when any attached reference fails to resolve", () => {
    expect(SRC).toContain("Reference image failed verification/resolution before dispatch");
    expect(SRC).toContain("references_unreachable");
  });

  it("verifies reference inputs are real decodable images before charging", () => {
    expect(SRC).toContain('verifyPublicMediaUrl(resolved, "reference_image", { expectedMediaKind: "image" })');
  });

  it("refuses before any credit is spent", () => {
    const guard = lineOf("references_unreachable");
    const spend = lineOf("await spendCredits(");
    const free = lineOf("recordFreeGeneration(chargeInput)");
    expect(guard).toBeLessThan(spend);
    expect(guard).toBeLessThan(free);
  });

  it("fails closed on partial reference failure instead of silently dropping bad media", () => {
    expect(SRC).not.toContain("skipping unreachable reference");
    expect(SRC).not.toContain("None of the");
  });
});
