export type VoiceAgentUsageEstimateInput = {
  expectedCallMinutes?: number;
  expectedTranscriptChars?: number;
  expectedLlmSteps?: number;
};

export function estimateVoiceAgentCredits(input: VoiceAgentUsageEstimateInput = {}) {
  const callMinutes = Math.max(1, Math.ceil(input.expectedCallMinutes ?? 3));
  const transcriptChars = Math.max(300, input.expectedTranscriptChars ?? 1200);
  const llmSteps = Math.max(2, input.expectedLlmSteps ?? 4);

  const telephonyCredits = callMinutes * 2;
  const sttCredits = Math.ceil(transcriptChars * 0.0015);
  const ttsCredits = Math.ceil(transcriptChars * 0.0018);
  const orchestrationCredits = llmSteps;

  return {
    totalCredits: Math.max(5, telephonyCredits + sttCredits + ttsCredits + orchestrationCredits),
    breakdown: {
      telephonyCredits,
      sttCredits,
      ttsCredits,
      orchestrationCredits,
      callMinutes,
    },
  };
}
