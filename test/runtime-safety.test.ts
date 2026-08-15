import { describe, expect, it } from "vitest";

import { ProviderExecutionBlockedError, assertFinalProviderExecutionAllowed, isFinalProviderExecutionAllowed } from "@/lib/generation/runtime-safety";

describe("runtime provider safety gate", () => {
  it("blocks standby providers from final generation execution", () => {
    expect(isFinalProviderExecutionAllowed("kie")).toBe(false);
    expect(isFinalProviderExecutionAllowed("byteplus")).toBe(false);
    expect(() => assertFinalProviderExecutionAllowed("kie")).toThrow(ProviderExecutionBlockedError);
    expect(() => assertFinalProviderExecutionAllowed("byteplus")).toThrow(ProviderExecutionBlockedError);
  });

  it("allows active providers used by the runtime routes", () => {
    expect(isFinalProviderExecutionAllowed("google")).toBe(true);
    expect(isFinalProviderExecutionAllowed("wavespeed")).toBe(true);
    expect(() => assertFinalProviderExecutionAllowed("google")).not.toThrow();
    expect(() => assertFinalProviderExecutionAllowed("wavespeed")).not.toThrow();
  });
});
