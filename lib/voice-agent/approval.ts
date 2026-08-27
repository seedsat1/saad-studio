import type { ApprovalPolicy, ToolRiskLevel, VoiceAgentToolId } from "./types";

const SENSITIVE_TOOLS = new Set<VoiceAgentToolId>([
  "phone.send_sms",
  "whatsapp.send_message",
  "email.send",
  "calendar.create_event",
  "reservation.create",
  "crm.create_lead",
]);

export function isSensitiveVoiceAgentAction(toolId: VoiceAgentToolId) {
  return SENSITIVE_TOOLS.has(toolId);
}

export function requiresVoiceAgentApproval(input: {
  toolId: VoiceAgentToolId;
  riskLevel: ToolRiskLevel;
  policy: ApprovalPolicy;
  requireApprovalBeforeCall?: boolean;
}) {
  if (input.toolId === "phone.call") return Boolean(input.requireApprovalBeforeCall);
  if (input.riskLevel === "high") return true;
  if (input.policy === "always_ask") return true;
  if (input.policy === "allow_calls_only") return true;
  if (input.policy === "allow_send_and_call") return input.riskLevel !== "low";
  if (input.policy === "allow_low_risk") return input.riskLevel !== "low";
  return isSensitiveVoiceAgentAction(input.toolId);
}
