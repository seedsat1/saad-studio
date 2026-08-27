import { z } from "zod";

import {
  APPROVAL_POLICIES,
  VOICE_AGENT_TASK_STATUSES,
  VOICE_AGENT_TOOL_IDS,
} from "./types";

export const voiceAgentIdentitySchema = z.object({
  name: z.string().trim().min(1).max(80).default("سارة"),
  companyName: z.string().trim().max(120).default("Saad Studio"),
  tone: z.enum(["calm", "formal", "friendly", "sales"]).default("friendly"),
  introScript: z.string().trim().min(20).max(500).default(
    "هلا بيك، آني سارة، أتصل من ستوديو سعد.",
  ),
});

export const createVoiceAgentTaskSchema = z.object({
  goal: z.string().trim().min(5).max(3000),
  language: z.enum(["ar-IQ", "ar", "en"]).default("ar-IQ"),
  dialect: z.enum(["iraqi", "msa", "english"]).default("iraqi"),
  approvalPolicy: z.enum(APPROVAL_POLICIES).default("always_ask"),
  requireApprovalBeforeCall: z.boolean().default(true),
  resultChannel: z.enum(["platform", "whatsapp", "email"]).default("platform"),
  identity: voiceAgentIdentitySchema.default({}),
});

export const updateVoiceAgentTaskSchema = z.object({
  status: z.enum(VOICE_AGENT_TASK_STATUSES).optional(),
  humanIntervention: z.boolean().optional(),
  rating: z.number().int().min(1).max(5).optional(),
});

export const approvalDecisionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  approvalId: z.string().min(1),
});

export const contactInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(40).optional().nullable(),
  email: z.string().trim().email().optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  preferences: z.record(z.unknown()).optional().default({}),
});

export const toolExecutionSchema = z.object({
  toolId: z.enum(VOICE_AGENT_TOOL_IDS),
  input: z.record(z.unknown()).default({}),
  approvalId: z.string().optional(),
});

export const phoneCallInputSchema = z.object({
  to: z.string().trim().min(3).max(40),
  openingScript: z.string().trim().min(20).max(1000),
  recordCall: z.boolean().default(false),
});

export const messageInputSchema = z.object({
  to: z.string().trim().min(3).max(200),
  message: z.string().trim().min(1).max(2000),
});
