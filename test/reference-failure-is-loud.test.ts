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
  it("refuses the request when every attached reference fails to resolve", () => {
    expect(SRC).toContain("refUrls.length > 0 && resolvedRefs.length === 0");
    expect(SRC).toContain("references_unreachable");
  });

  it("refuses before any credit is spent", () => {
    const guard = lineOf("references_unreachable");
    const spend = lineOf("await spendCredits(");
    const free = lineOf("recordFreeGeneration(chargeInput)");
    expect(guard).toBeLessThan(spend);
    expect(guard).toBeLessThan(free);
  });

  it("still tolerates a partial failure, so one bad reference cannot block the rest", () => {
    // the guard fires only when NOTHING resolved
    expect(SRC).not.toContain("unreachableRefs.length > 0 &&\n      resolvedRefs.length");
    expect(SRC).toContain("resolvedRefs.length === 0");
  });
});
