import { describe, expect, it } from "vitest";

import { requiresVoiceAgentApproval } from "@/lib/voice-agent/approval";
import { estimateVoiceAgentCredits } from "@/lib/voice-agent/pricing";
import { VOICE_AGENT_TOOLS } from "@/lib/voice-agent/tools";

describe("voice agent approval policy", () => {
  it("requires explicit approval for calls when the user asks for pre-call approval", () => {
    expect(
      requiresVoiceAgentApproval({
        toolId: "phone.call",
        riskLevel: "medium",
        policy: "allow_calls_only",
        requireApprovalBeforeCall: true,
      }),
    ).toBe(true);
  });

  it("does not allow sensitive sends under calls-only policy", () => {
    expect(
      requiresVoiceAgentApproval({
        toolId: "whatsapp.send_message",
        riskLevel: "high",
        policy: "allow_calls_only",
      }),
    ).toBe(true);
  });
});

describe("voice agent usage estimate", () => {
  it("returns a positive credit estimate with component breakdown", () => {
    const estimate = estimateVoiceAgentCredits({ expectedCallMinutes: 2, expectedTranscriptChars: 800, expectedLlmSteps: 3 });
    expect(estimate.totalCredits).toBeGreaterThanOrEqual(5);
    expect(estimate.breakdown.telephonyCredits).toBe(4);
  });
});

describe("voice agent tool contracts", () => {
  it("validates phone calls with a typed schema", () => {
    const parsed = VOICE_AGENT_TOOLS["phone.call"].schema.parse({
      to: "+9647700000000",
      openingScript: "مرحباً، معك مساعد صوتي بالذكاء الاصطناعي أتصل نيابةً عن Saad Studio.",
      recordCall: false,
    });
    expect(parsed.to).toBe("+9647700000000");
  });
});
