import { z } from "zod";

import { messageInputSchema, phoneCallInputSchema } from "./schemas";
import type { ToolRiskLevel, VoiceAgentToolId } from "./types";

export type VoiceAgentToolDefinition<Input, Output> = {
  id: VoiceAgentToolId;
  label: string;
  riskLevel: ToolRiskLevel;
  schema: z.ZodType<Input>;
  execute: (input: Input) => Promise<Output>;
};

const searchInput = z.object({ query: z.string().trim().min(1).max(300) });
const calendarInput = z.object({
  title: z.string().trim().min(1).max(200),
  startsAt: z.string().trim().optional(),
});

export const VOICE_AGENT_TOOLS: Record<VoiceAgentToolId, VoiceAgentToolDefinition<any, any>> = {
  "contacts.search": {
    id: "contacts.search",
    label: "Search contacts",
    riskLevel: "low",
    schema: searchInput,
    execute: async (input) => ({ matches: [], query: input.query }),
  },
  "web.search": {
    id: "web.search",
    label: "Web search",
    riskLevel: "low",
    schema: searchInput,
    execute: async (input) => ({ results: [], query: input.query, provider: "mock" }),
  },
  "phone.call": {
    id: "phone.call",
    label: "Outbound phone call",
    riskLevel: "medium",
    schema: phoneCallInputSchema,
    execute: async (input) => ({
      provider: "mock",
      callId: `mock_call_${Date.now()}`,
      status: "completed",
      to: input.to,
      recordingEnabled: input.recordCall,
    }),
  },
  "phone.send_sms": {
    id: "phone.send_sms",
    label: "Send SMS",
    riskLevel: "high",
    schema: messageInputSchema,
    execute: async (input) => ({ provider: "mock", status: "queued", to: input.to }),
  },
  "whatsapp.send_message": {
    id: "whatsapp.send_message",
    label: "Send WhatsApp message",
    riskLevel: "high",
    schema: messageInputSchema,
    execute: async (input) => ({ provider: "mock", status: "queued", to: input.to }),
  },
  "email.send": {
    id: "email.send",
    label: "Send email",
    riskLevel: "high",
    schema: messageInputSchema,
    execute: async (input) => ({ provider: "mock", status: "queued", to: input.to }),
  },
  "calendar.create_event": {
    id: "calendar.create_event",
    label: "Create calendar event",
    riskLevel: "high",
    schema: calendarInput,
    execute: async (input) => ({ provider: "mock", status: "created", title: input.title }),
  },
  "calendar.find_availability": {
    id: "calendar.find_availability",
    label: "Find availability",
    riskLevel: "low",
    schema: searchInput,
    execute: async () => ({ slots: [] }),
  },
  "reservation.create": {
    id: "reservation.create",
    label: "Create reservation",
    riskLevel: "high",
    schema: calendarInput,
    execute: async (input) => ({ provider: "mock", status: "needs_real_provider", title: input.title }),
  },
  "crm.search_customer": {
    id: "crm.search_customer",
    label: "Search CRM customer",
    riskLevel: "low",
    schema: searchInput,
    execute: async (input) => ({ matches: [], query: input.query }),
  },
  "crm.create_lead": {
    id: "crm.create_lead",
    label: "Create CRM lead",
    riskLevel: "high",
    schema: searchInput,
    execute: async (input) => ({ provider: "mock", status: "created", query: input.query }),
  },
  "task.create_followup": {
    id: "task.create_followup",
    label: "Create follow-up task",
    riskLevel: "medium",
    schema: calendarInput,
    execute: async (input) => ({ provider: "mock", status: "created", title: input.title }),
  },
};
