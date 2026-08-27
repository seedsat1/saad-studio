import { Prisma } from "@prisma/client";

import { ensureUserRow } from "@/lib/credit-ledger";
import { assertSufficientCredits } from "@/lib/generation-guard";
import prismadb from "@/lib/prismadb";

import { requiresVoiceAgentApproval } from "./approval";
import { estimateVoiceAgentCredits } from "./pricing";
import { createVoiceAgentTaskSchema, updateVoiceAgentTaskSchema } from "./schemas";
import { createTelephonyProvider } from "./telephony";
import type {
  ApprovalPolicy,
  VoiceAgentTaskPlan,
  VoiceAgentTaskSnapshot,
  VoiceAgentTaskStatus,
  VoiceAgentTaskTimelineEvent,
  VoiceAgentToolId,
} from "./types";

function nowIso() {
  return new Date().toISOString();
}

function createEvent(status: VoiceAgentTaskStatus, title: string, detail: string): VoiceAgentTaskTimelineEvent {
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    at: nowIso(),
    status,
    title,
    detail,
  };
}

function inferPlan(goal: string, policy: ApprovalPolicy, requireApprovalBeforeCall: boolean): VoiceAgentTaskPlan {
  const lower = goal.toLowerCase();
  const needsContact = !/(\+?\d{6,}|@|واتساب|whatsapp|email|بريد)/i.test(goal);
  const isReservation = /حجز|reserve|reservation|مطعم|موعد/.test(lower);
  const isShipment = /شحنة|shipment|tracking|تتبع/.test(lower);
  const isMessage = /بلغه|اخبره|ارسل|send|message|واتساب|whatsapp|email/.test(lower);

  const steps: VoiceAgentTaskPlan["steps"] = [
    {
      id: "understand_goal",
      title: "فهم هدف المهمة وتحديد البيانات المطلوبة",
      toolId: undefined,
      needsApproval: false,
      riskLevel: "low",
    },
  ];

  if (needsContact) {
    steps.push({
      id: "search_contacts",
      title: "البحث في جهات الاتصال عن الشخص أو الجهة المقصودة",
      toolId: "contacts.search",
      needsApproval: false,
      riskLevel: "low",
    });
  }

  steps.push({
    id: "call_target",
    title: "إجراء مكالمة صوتية مع تعريف واضح بأن المتصل مساعد ذكاء اصطناعي",
    toolId: "phone.call",
    needsApproval: requiresVoiceAgentApproval({
      toolId: "phone.call",
      riskLevel: "medium",
      policy,
      requireApprovalBeforeCall,
    }),
    riskLevel: "medium",
  });

  if (isMessage) {
    steps.push({
      id: "send_result",
      title: "إرسال ملخص أو رسالة متابعة بعد موافقة المستخدم",
      toolId: "whatsapp.send_message",
      needsApproval: true,
      riskLevel: "high",
    });
  }

  if (isReservation) {
    steps.push({
      id: "reservation",
      title: "إنشاء حجز فقط بعد وصول تأكيد صريح من الجهة وموافقة المستخدم",
      toolId: "reservation.create",
      needsApproval: true,
      riskLevel: "high",
    });
  }

  if (isShipment) {
    steps.push({
      id: "followup",
      title: "إنشاء مهمة متابعة للشحنة عند الحاجة",
      toolId: "task.create_followup",
      needsApproval: requiresVoiceAgentApproval({
        toolId: "task.create_followup",
        riskLevel: "medium",
        policy,
      }),
      riskLevel: "medium",
    });
  }

  return {
    summary: "خطة أولية قابلة للمراجعة قبل أي اتصال أو إجراء حساس.",
    missingInformation: needsContact ? ["رقم الهاتف أو جهة اتصال واضحة"] : [],
    steps,
  };
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function normalizeTask(row: any): VoiceAgentTaskSnapshot {
  return {
    id: row.id,
    userId: row.userId,
    agentId: row.agentId ?? null,
    goal: row.goal,
    language: row.language,
    dialect: row.dialect,
    status: row.status,
    approvalPolicy: row.approvalPolicy,
    resultChannel: row.resultChannel,
    estimatedCredits: row.estimatedCredits,
    actualCredits: row.actualCredits ?? null,
    plan: row.planJson,
    timeline: Array.isArray(row.timelineJson) ? row.timelineJson : [],
    transcript: Array.isArray(row.transcriptJson) ? row.transcriptJson : [],
    finalSummary: row.finalSummary ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getOrCreateDefaultVoiceAgent(userId: string, identity?: unknown) {
  await ensureUserRow(userId);
  const existing = await prismadb.voiceAgent.findFirst({
    where: { userId, isDefault: true },
    orderBy: { updatedAt: "desc" },
  });
  if (existing) return existing;

  const parsed = createVoiceAgentTaskSchema.parse({
    goal: "تهيئة وكيل صوتي افتراضي",
    identity: identity ?? {},
  }).identity;

  return prismadb.voiceAgent.create({
    data: {
      userId,
      name: parsed.name,
      companyName: parsed.companyName,
      tone: parsed.tone,
      introScript: parsed.introScript,
      isDefault: true,
      metadata: {},
    },
  });
}

export async function listVoiceAgentTasks(userId: string) {
  const rows = await prismadb.voiceAgentTask.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });
  return rows.map(normalizeTask);
}

export async function getVoiceAgentTask(userId: string, taskId: string) {
  const row = await prismadb.voiceAgentTask.findFirst({
    where: { id: taskId, userId },
  });
  return row ? normalizeTask(row) : null;
}

export async function createVoiceAgentTask(userId: string, body: unknown) {
  const input = createVoiceAgentTaskSchema.parse(body);
  const estimate = estimateVoiceAgentCredits({
    expectedCallMinutes: input.goal.length > 180 ? 5 : 3,
    expectedTranscriptChars: Math.max(800, input.goal.length * 4),
  });

  await assertSufficientCredits(userId, estimate.totalCredits);
  const agent = await getOrCreateDefaultVoiceAgent(userId, input.identity);
  const plan = inferPlan(input.goal, input.approvalPolicy, input.requireApprovalBeforeCall);
  const initialStatus: VoiceAgentTaskStatus = plan.missingInformation.length > 0 ? "collecting_details" : "awaiting_approval";
  const timeline = [
    createEvent("draft", "تم إنشاء المهمة", "تم حفظ هدف المهمة داخل الداشبورد."),
    createEvent("planning", "تم إنشاء خطة أولية", "الخطة جاهزة للمراجعة قبل أي اتصال أو إجراء حساس."),
  ];

  if (initialStatus === "awaiting_approval") {
    timeline.push(createEvent("awaiting_approval", "بانتظار الموافقة", "الاتصال لن يبدأ قبل موافقة المستخدم."));
  }

  const task = await prismadb.voiceAgentTask.create({
    data: {
      userId,
      agentId: agent.id,
      goal: input.goal,
      language: input.language,
      dialect: input.dialect,
      status: initialStatus,
      resultChannel: input.resultChannel,
      approvalPolicy: input.approvalPolicy,
      estimatedCredits: estimate.totalCredits,
      costBreakdown: asJson(estimate.breakdown),
      planJson: asJson(plan),
      timelineJson: asJson(timeline),
      steps: {
        create: plan.steps.map((step, index) => ({
          orderIndex: index + 1,
          title: step.title,
          toolId: step.toolId ?? null,
          status: step.needsApproval ? "awaiting_approval" : "ready",
          riskLevel: step.riskLevel,
        })),
      },
      approvals: {
        create: plan.steps
          .filter((step) => step.needsApproval)
          .map((step) => ({
            userId,
            actionType: step.toolId ?? "task.review",
            reason: step.riskLevel === "high" ? "إجراء حساس يحتاج موافقة صريحة." : "سياسة الحساب تتطلب الموافقة قبل الاتصال.",
            summary: step.title,
            affectedData: asJson({ goal: input.goal, toolId: step.toolId }),
            status: "pending",
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 6),
          })),
      },
      auditLogs: {
        create: {
          userId,
          eventType: "voice_agent_task_created",
          metadata: asJson({ estimatedCredits: estimate.totalCredits, status: initialStatus }),
        },
      },
    },
  });

  return getVoiceAgentTask(userId, task.id);
}

export async function updateVoiceAgentTask(userId: string, taskId: string, body: unknown) {
  const input = updateVoiceAgentTaskSchema.parse(body);
  const existing = await prismadb.voiceAgentTask.findFirst({ where: { id: taskId, userId } });
  if (!existing) return null;

  const timeline = Array.isArray(existing.timelineJson) ? [...(existing.timelineJson as any[])] : [];
  if (input.status) {
    timeline.push(createEvent(input.status, "تحديث حالة المهمة", `تم تغيير الحالة إلى ${input.status}.`));
  }

  await prismadb.voiceAgentTask.update({
    where: { id: taskId },
    data: {
      status: input.status ?? existing.status,
      humanIntervention: input.humanIntervention ?? existing.humanIntervention,
      rating: input.rating ?? existing.rating,
      timelineJson: asJson(timeline),
    },
  });

  return getVoiceAgentTask(userId, taskId);
}

export async function decideVoiceAgentApproval(userId: string, taskId: string, approvalId: string, action: "approve" | "reject") {
  const approval = await prismadb.approvalRequest.findFirst({
    where: { id: approvalId, taskId, userId, status: "pending" },
  });
  if (!approval) return null;

  await prismadb.approvalRequest.update({
    where: { id: approval.id },
    data: { status: action === "approve" ? "approved" : "rejected", decidedAt: new Date() },
  });

  if (action === "reject") {
    await prismadb.voiceAgentTask.update({
      where: { id: taskId },
      data: {
        status: "cancelled",
        timelineJson: asJson([
          ...((await getVoiceAgentTask(userId, taskId))?.timeline ?? []),
          createEvent("cancelled", "تم رفض الموافقة", "ألغيت المهمة بدون تنفيذ اتصال أو رسالة."),
        ]),
      },
    });
    return getVoiceAgentTask(userId, taskId);
  }

  const remainingPending = await prismadb.approvalRequest.count({
    where: { taskId, userId, status: "pending" },
  });

  if (remainingPending === 0) {
    await runMockVoiceAgentTask(userId, taskId);
  }

  return getVoiceAgentTask(userId, taskId);
}

export async function runMockVoiceAgentTask(userId: string, taskId: string) {
  const task = await prismadb.voiceAgentTask.findFirst({
    where: { id: taskId, userId },
    include: { agent: true },
  });
  if (!task || task.status === "completed" || task.status === "cancelled") return task ? normalizeTask(task) : null;

  const timeline = Array.isArray(task.timelineJson) ? [...(task.timelineJson as any[])] : [];
  timeline.push(createEvent("queued", "دخلت المهمة قائمة التنفيذ", "يستخدم التطوير الحالي MockTelephonyProvider فقط."));
  timeline.push(createEvent("calling", "بدأ الاتصال الوهمي", "لم يتم إجراء أي اتصال حقيقي أو استخدام مفاتيح مزود."));

  const provider = createTelephonyProvider();
  const callResult = await provider.startOutboundCall({
    taskId,
    userId,
    to: "mock-contact",
    introScript:
      task.agent?.introScript ||
      "مرحباً، معك مساعد صوتي بالذكاء الاصطناعي أتصل نيابةً عن Saad Studio.",
    recordCall: Boolean(task.agent?.recordingAllowed),
  });

  const transcript = callResult.transcript.map((line) => ({
    at: new Date(Date.now() + line.offsetSec * 1000).toISOString(),
    speaker: line.speaker,
    text: line.text,
  }));

  timeline.push(createEvent("in_conversation", "تمت المحادثة", "حفظ النظام تفريغاً زمنياً من مزود الاتصال الوهمي."));
  timeline.push(createEvent("completed", "اكتملت المهمة", "تم إنشاء ملخص نهائي مع دليل mock واضح."));

  await prismadb.$transaction(async (tx) => {
    const call = await tx.voiceAgentCall.create({
      data: {
        taskId,
        userId,
        provider: callResult.provider,
        providerCallId: callResult.providerCallId,
        status: callResult.status,
        durationSec: callResult.durationSec,
        toNumber: "mock-contact",
        recordingAllowed: Boolean(task.agent?.recordingAllowed),
      },
    });

    await tx.callTranscript.createMany({
      data: callResult.transcript.map((line) => ({
        callId: call.id,
        userId,
        speaker: line.speaker,
        text: line.text,
        offsetMs: line.offsetSec * 1000,
      })),
    });

    await tx.voiceAgentUsage.create({
      data: {
        taskId,
        userId,
        estimatedCredits: task.estimatedCredits,
        actualCredits: Math.max(5, Math.ceil(callResult.durationSec / 30) + 4),
        telephonyMinutes: Math.ceil(callResult.durationSec / 60),
        sttCredits: 1,
        ttsCredits: 2,
        llmCredits: 4,
        providerCostSource: "mock",
      },
    });

    await tx.voiceAgentTask.update({
      where: { id: taskId },
      data: {
        status: "completed",
        actualCredits: Math.max(5, Math.ceil(callResult.durationSec / 30) + 4),
        transcriptJson: asJson(transcript),
        timelineJson: asJson(timeline),
        finalSummary: "اكتملت المهمة في وضع التطوير الوهمي. لا يوجد اتصال حقيقي، لكن تم اختبار مسار الموافقة والتفريغ والسجل.",
      },
    });

    await tx.voiceAgentAuditLog.create({
      data: {
        userId,
        taskId,
        eventType: "voice_agent_mock_call_completed",
        metadata: asJson({ providerCallId: callResult.providerCallId, durationSec: callResult.durationSec }),
      },
    });
  });

  return getVoiceAgentTask(userId, taskId);
}

export async function listVoiceAgentApprovals(userId: string, taskId: string) {
  return prismadb.approvalRequest.findMany({
    where: { userId, taskId },
    orderBy: { createdAt: "desc" },
  });
}

export async function listVoiceAgentDashboardData(userId: string) {
  const [tasks, agents, contacts, integrations, usage] = await Promise.all([
    listVoiceAgentTasks(userId),
    prismadb.voiceAgent.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, take: 10 }),
    prismadb.voiceAgentContact.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, take: 20 }),
    prismadb.voiceAgentIntegrationConnection.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } }),
    prismadb.voiceAgentUsage.aggregate({
      where: { userId },
      _sum: { estimatedCredits: true, actualCredits: true, telephonyMinutes: true },
    }),
  ]);

  return {
    tasks,
    agents,
    contacts,
    integrations,
    usage: {
      estimatedCredits: usage._sum.estimatedCredits ?? 0,
      actualCredits: usage._sum.actualCredits ?? 0,
      telephonyMinutes: usage._sum.telephonyMinutes ?? 0,
    },
  };
}

export function getToolId(input: string): VoiceAgentToolId | null {
  return input.includes(".") ? (input as VoiceAgentToolId) : null;
}
