export const VOICE_AGENT_TASK_STATUSES = [
  "draft",
  "collecting_details",
  "planning",
  "awaiting_approval",
  "queued",
  "running",
  "calling",
  "in_conversation",
  "waiting_for_callback",
  "completed",
  "failed",
  "cancelled",
] as const;

export type VoiceAgentTaskStatus = (typeof VOICE_AGENT_TASK_STATUSES)[number];

export const APPROVAL_POLICIES = [
  "always_ask",
  "allow_calls_only",
  "allow_send_and_call",
  "allow_low_risk",
] as const;

export type ApprovalPolicy = (typeof APPROVAL_POLICIES)[number];

export const APPROVAL_STATUSES = ["pending", "approved", "rejected", "expired"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const TOOL_RISK_LEVELS = ["low", "medium", "high"] as const;
export type ToolRiskLevel = (typeof TOOL_RISK_LEVELS)[number];

export const VOICE_AGENT_TOOL_IDS = [
  "contacts.search",
  "web.search",
  "phone.call",
  "phone.send_sms",
  "whatsapp.send_message",
  "email.send",
  "calendar.create_event",
  "calendar.find_availability",
  "reservation.create",
  "crm.search_customer",
  "crm.create_lead",
  "task.create_followup",
] as const;

export type VoiceAgentToolId = (typeof VOICE_AGENT_TOOL_IDS)[number];

export type VoiceAgentTaskTimelineEvent = {
  id: string;
  at: string;
  status: VoiceAgentTaskStatus;
  title: string;
  detail: string;
  evidence?: Record<string, unknown>;
};

export type VoiceAgentTaskPlanStep = {
  id: string;
  title: string;
  toolId?: VoiceAgentToolId;
  needsApproval: boolean;
  riskLevel: ToolRiskLevel;
};

export type VoiceAgentTaskPlan = {
  summary: string;
  missingInformation: string[];
  steps: VoiceAgentTaskPlanStep[];
};

export type VoiceAgentTaskSnapshot = {
  id: string;
  userId: string;
  agentId: string | null;
  goal: string;
  language: string;
  dialect: string;
  status: VoiceAgentTaskStatus;
  approvalPolicy: ApprovalPolicy;
  resultChannel: string;
  estimatedCredits: number;
  actualCredits: number | null;
  plan: VoiceAgentTaskPlan;
  timeline: VoiceAgentTaskTimelineEvent[];
  transcript: Array<{ at: string; speaker: "agent" | "callee" | "system"; text: string }>;
  finalSummary: string | null;
  createdAt: string;
  updatedAt: string;
};
