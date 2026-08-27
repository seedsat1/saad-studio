-- Saad Voice Agent dashboard feature.
-- Non-destructive: creates new isolated tables only; does not alter credits ledger.

CREATE TABLE IF NOT EXISTS "VoiceAgent" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL DEFAULT 'Saad Voice Agent',
  "companyName" TEXT NOT NULL DEFAULT 'Saad Studio',
  "tone" TEXT NOT NULL DEFAULT 'calm',
  "language" TEXT NOT NULL DEFAULT 'ar-IQ',
  "dialect" TEXT NOT NULL DEFAULT 'iraqi',
  "introScript" TEXT NOT NULL,
  "approvalPolicy" TEXT NOT NULL DEFAULT 'always_ask',
  "phoneNumber" TEXT,
  "recordingAllowed" BOOLEAN NOT NULL DEFAULT false,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "VoiceAgentTask" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "agentId" TEXT REFERENCES "VoiceAgent"("id") ON DELETE SET NULL,
  "goal" TEXT NOT NULL,
  "language" TEXT NOT NULL DEFAULT 'ar-IQ',
  "dialect" TEXT NOT NULL DEFAULT 'iraqi',
  "status" TEXT NOT NULL DEFAULT 'draft',
  "resultChannel" TEXT NOT NULL DEFAULT 'platform',
  "approvalPolicy" TEXT NOT NULL DEFAULT 'always_ask',
  "estimatedCredits" INTEGER NOT NULL DEFAULT 0,
  "actualCredits" INTEGER,
  "costBreakdown" JSONB NOT NULL DEFAULT '{}',
  "planJson" JSONB NOT NULL DEFAULT '{}',
  "timelineJson" JSONB NOT NULL DEFAULT '[]',
  "transcriptJson" JSONB NOT NULL DEFAULT '[]',
  "finalSummary" TEXT,
  "lastError" TEXT,
  "humanIntervention" BOOLEAN NOT NULL DEFAULT false,
  "rating" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TaskStep" (
  "id" TEXT PRIMARY KEY,
  "taskId" TEXT NOT NULL REFERENCES "VoiceAgentTask"("id") ON DELETE CASCADE,
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "title" TEXT NOT NULL,
  "toolId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "riskLevel" TEXT NOT NULL DEFAULT 'low',
  "inputJson" JSONB NOT NULL DEFAULT '{}',
  "outputJson" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "VoiceAgentCall" (
  "id" TEXT PRIMARY KEY,
  "taskId" TEXT NOT NULL REFERENCES "VoiceAgentTask"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL,
  "direction" TEXT NOT NULL DEFAULT 'outbound',
  "provider" TEXT NOT NULL DEFAULT 'mock',
  "providerCallId" TEXT,
  "fromNumber" TEXT,
  "toNumber" TEXT,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "durationSec" INTEGER,
  "recordingUrl" TEXT,
  "recordingAllowed" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CallTranscript" (
  "id" TEXT PRIMARY KEY,
  "callId" TEXT NOT NULL REFERENCES "VoiceAgentCall"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL,
  "speaker" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "offsetMs" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AgentToolExecution" (
  "id" TEXT PRIMARY KEY,
  "taskId" TEXT NOT NULL REFERENCES "VoiceAgentTask"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL,
  "toolId" TEXT NOT NULL,
  "riskLevel" TEXT NOT NULL DEFAULT 'low',
  "status" TEXT NOT NULL DEFAULT 'queued',
  "inputJson" JSONB NOT NULL DEFAULT '{}',
  "outputJson" JSONB NOT NULL DEFAULT '{}',
  "approvalId" TEXT,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ApprovalRequest" (
  "id" TEXT PRIMARY KEY,
  "taskId" TEXT NOT NULL REFERENCES "VoiceAgentTask"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL,
  "actionType" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "affectedData" JSONB NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "expiresAt" TIMESTAMP(3),
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "VoiceAgentContact" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "notes" TEXT,
  "preferences" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "VoiceAgentIntegrationConnection" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "provider" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'mock',
  "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "settings" JSONB NOT NULL DEFAULT '{}',
  "encryptedSecretRef" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "VoiceAgentUsage" (
  "id" TEXT PRIMARY KEY,
  "taskId" TEXT NOT NULL REFERENCES "VoiceAgentTask"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "estimatedCredits" INTEGER NOT NULL DEFAULT 0,
  "actualCredits" INTEGER NOT NULL DEFAULT 0,
  "telephonyMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "sttCredits" INTEGER NOT NULL DEFAULT 0,
  "ttsCredits" INTEGER NOT NULL DEFAULT 0,
  "llmCredits" INTEGER NOT NULL DEFAULT 0,
  "providerCostUsd" DOUBLE PRECISION,
  "providerCostSource" TEXT NOT NULL DEFAULT 'mock',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "VoiceAgentAuditLog" (
  "id" TEXT PRIMARY KEY,
  "taskId" TEXT REFERENCES "VoiceAgentTask"("id") ON DELETE SET NULL,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "eventType" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "VoiceAgent_userId_updatedAt_idx" ON "VoiceAgent"("userId", "updatedAt");
CREATE INDEX IF NOT EXISTS "VoiceAgentTask_userId_updatedAt_idx" ON "VoiceAgentTask"("userId", "updatedAt");
CREATE INDEX IF NOT EXISTS "VoiceAgentTask_status_updatedAt_idx" ON "VoiceAgentTask"("status", "updatedAt");
CREATE INDEX IF NOT EXISTS "TaskStep_taskId_orderIndex_idx" ON "TaskStep"("taskId", "orderIndex");
CREATE INDEX IF NOT EXISTS "VoiceAgentCall_userId_createdAt_idx" ON "VoiceAgentCall"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "VoiceAgentCall_taskId_createdAt_idx" ON "VoiceAgentCall"("taskId", "createdAt");
CREATE INDEX IF NOT EXISTS "CallTranscript_callId_offsetMs_idx" ON "CallTranscript"("callId", "offsetMs");
CREATE INDEX IF NOT EXISTS "AgentToolExecution_taskId_createdAt_idx" ON "AgentToolExecution"("taskId", "createdAt");
CREATE INDEX IF NOT EXISTS "ApprovalRequest_taskId_status_idx" ON "ApprovalRequest"("taskId", "status");
CREATE INDEX IF NOT EXISTS "VoiceAgentContact_userId_updatedAt_idx" ON "VoiceAgentContact"("userId", "updatedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "VoiceAgentIntegrationConnection_userId_provider_key" ON "VoiceAgentIntegrationConnection"("userId", "provider");
CREATE INDEX IF NOT EXISTS "VoiceAgentUsage_userId_createdAt_idx" ON "VoiceAgentUsage"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "VoiceAgentAuditLog_userId_createdAt_idx" ON "VoiceAgentAuditLog"("userId", "createdAt");
