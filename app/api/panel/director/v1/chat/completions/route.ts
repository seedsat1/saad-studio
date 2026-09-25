import { NextRequest, NextResponse } from "next/server";
import { extractPanelToken, verifyPanelToken } from "@/lib/panel-auth";
import { ensureUserRow, handleCreditExpiry, InsufficientCreditsError, spendCredits } from "@/lib/credit-ledger";
import prismadb from "@/lib/prismadb";
import {
  completeIdempotency,
  failIdempotency,
  hashRequestBody,
  beginIdempotency,
  idempotencyErrorResponse,
  markIdempotencyProviderDispatched,
} from "@/lib/idempotency";
import {
  calculateAgentCredits,
  calculateMaxOutputTokensForCreditCap,
} from "@/lib/agent-pricing";
import {
  countAgentInputTokens,
  runAgentGoogleCompletion,
  type AgentChatMessage,
  type AgentGoogleTool,
} from "@/lib/agent-google-provider";
import { getDefaultAgentModel } from "@/lib/agent-model-registry";
import { getRuntimeAgentModel, resolveAgentEntitlement } from "@/lib/agent-model-runtime";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const IDEMPOTENCY_ROUTE = "panel:director:v1:chat-completions";
const OPERATION_TYPE = "agent_chat";

type DirectorChatBody = {
  model?: string;
  messages?: AgentChatMessage[];
  tools?: AgentGoogleTool[];
  tool_choice?: unknown;
  toolChoice?: unknown;
  response_format?: unknown;
  responseFormat?: unknown;
  idempotencyKey?: string;
  requestId?: string;
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function getIdempotencyKey(req: NextRequest, body: DirectorChatBody): string | null {
  return (
    req.headers.get("Idempotency-Key") ||
    req.headers.get("X-Idempotency-Key") ||
    (typeof body.idempotencyKey === "string" ? body.idempotencyKey : null) ||
    (typeof body.requestId === "string" ? body.requestId : null)
  );
}

function validateMessages(messages: unknown): AgentChatMessage[] | null {
  if (!Array.isArray(messages) || messages.length === 0) return null;
  const cleaned: AgentChatMessage[] = [];
  for (const message of messages) {
    if (!message || typeof message !== "object") return null;
    const row = message as Record<string, unknown>;
    if (
      row.role !== "system" &&
      row.role !== "user" &&
      row.role !== "assistant" &&
      row.role !== "model" &&
      row.role !== "tool"
    ) return null;
    if (typeof row.content !== "string" && row.content !== null && !Array.isArray(row.content)) return null;
    cleaned.push({ role: row.role, content: row.content as AgentChatMessage["content"] });
  }
  return cleaned;
}

function lastPrompt(messages: AgentChatMessage[]): string {
  const last = [...messages].reverse().find((message) => message.role === "user");
  if (!last) return "Cloud Agent request";
  const content = last.content;
  if (typeof content === "string") return content.slice(0, 500);
  if (Array.isArray(content)) return content.map((part) => part.text ?? "").join("\n").slice(0, 500);
  return "Cloud Agent request";
}

export async function POST(req: NextRequest) {
  const token = extractPanelToken(req);
  if (!token) return json({ error: "Missing Authorization header." }, 401);
  const verified = verifyPanelToken(token);
  if (!verified) return json({ error: "Invalid or expired panel token." }, 401);
  const userId = verified.userId;

  let body: DirectorChatBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const messages = validateMessages(body.messages);
  if (!messages) return json({ error: "messages array is required." }, 400);

  const idempotencyKey = getIdempotencyKey(req, body);
  const requestHash = hashRequestBody({
    model: body.model ?? null,
    messages,
    tools: body.tools ?? null,
    toolChoice: body.toolChoice ?? body.tool_choice ?? null,
    responseFormat: body.responseFormat ?? body.response_format ?? null,
  });

  let idempotencyClaimed = false;
  let providerDispatched = false;
  let generationId: string | null = null;

  try {
    await ensureUserRow(userId);
    await handleCreditExpiry(userId);

    const user = await prismadb.user.findUnique({
      where: { id: userId },
      select: { creditBalance: true, isBanned: true },
    });
    if (!user) return json({ error: "User not found." }, 404);
    if (user.isBanned) return json({ error: "Account suspended." }, 403);

    const requestedModelId = typeof body.model === "string" && body.model.trim()
      ? body.model.trim()
      : getDefaultAgentModel().id;
    const model = await getRuntimeAgentModel(requestedModelId);
    if (!model) return json({ error: "Invalid Agent model." }, 400);
    if (!model.pricing.verified) return json({ error: "Agent model pricing is not verified." }, 503);
    if (!model.enabled || model.runtimeStatus !== "ready") {
      return json({ error: "Agent model is not available.", reason: model.runtimeStatus }, 403);
    }

    const subscription = await prismadb.userSubscription.findUnique({
      where: { userId },
      select: { planId: true, stripeCurrentPeriodEnd: true },
    });
    const entitlement = resolveAgentEntitlement({ model, subscription });
    if (!entitlement.allowed) {
      return json({ error: "Agent model is not entitled for this account.", reason: entitlement.reason }, 403);
    }

    const userCreditBalance = Math.max(0, Math.floor(user.creditBalance));
    const configuredModelCap = model.maxCreditsPerRequest !== undefined
      ? Math.max(0, Math.floor(model.maxCreditsPerRequest))
      : null;
    const requestCreditCap = configuredModelCap !== null
      ? Math.min(userCreditBalance, configuredModelCap)
      : userCreditBalance;
    if (requestCreditCap < 1) {
      return json({ error: "Insufficient credits", requiredCredits: 1, currentBalance: user.creditBalance }, 402);
    }

    const idem = await beginIdempotency({
      userId,
      route: IDEMPOTENCY_ROUTE,
      key: idempotencyKey,
      requestHash,
      operationType: OPERATION_TYPE,
    });
    if (idem.kind === "replay") {
      return json(idem.responseJson, idem.responseStatus);
    }
    if (idem.kind === "in_progress") {
      return json({ status: idem.status, generationId: idem.generationId }, 202);
    }
    idempotencyClaimed = true;

    const inputTokens = await countAgentInputTokens({
      model: model.id,
      messages,
      tools: body.tools,
      responseFormat: body.responseFormat ?? body.response_format,
    });
    const maxOutputTokens = calculateMaxOutputTokensForCreditCap({
      model,
      inputTokens,
      creditCap: requestCreditCap,
    });
    if (!maxOutputTokens) {
      const responseJson = {
        error: "The request input exceeds the authorized Agent credit budget.",
        requestCreditCap,
      };
      await completeIdempotency({
        userId,
        route: IDEMPOTENCY_ROUTE,
        key: idempotencyKey,
        generationId: null,
        responseStatus: 402,
        responseJson,
        operationType: OPERATION_TYPE,
      });
      return json(responseJson, 402);
    }

    await markIdempotencyProviderDispatched({
      userId,
      route: IDEMPOTENCY_ROUTE,
      key: idempotencyKey,
      generationId: null,
      operationType: OPERATION_TYPE,
    });
    providerDispatched = true;

    const provider = await runAgentGoogleCompletion({
      model: model.id,
      messages,
      tools: body.tools,
      toolChoice: body.toolChoice ?? body.tool_choice,
      responseFormat: body.responseFormat ?? body.response_format,
      maxOutputTokens,
    });

    const quote = calculateAgentCredits({ model, usage: provider.usage });
    if (!quote) {
      throw new Error("Agent pricing unavailable after provider usage.");
    }
    if (quote.credits > requestCreditCap) {
      throw new Error(`Agent billing invariant failure: actual credits ${quote.credits} exceeded cap ${requestCreditCap}.`);
    }

    const spent = await spendCredits({
      userId,
      credits: quote.credits,
      prompt: lastPrompt(messages),
      assetType: "AGENT_LLM",
      modelUsed: model.id,
      providerName: "Google",
      providerModel: model.id,
      providerRequestId: provider.id,
      providerCostUsd: quote.providerCostUsd,
      providerTokens: provider.usage.totalTokens,
      providerCostSource: "actual",
      requestPayload: {
        model: model.id,
        usage: provider.usage,
        pricing: {
          providerInputUsdPerMillion: quote.tier.inputUsd,
          providerOutputUsdPerMillion: quote.tier.outputUsd,
          markupMultiplier: quote.markupMultiplier,
          subscriberPriceUsd: quote.subscriberPriceUsd,
          credits: quote.credits,
          requestCreditCap,
          maxOutputTokens,
        },
      },
      idempotency: {
        route: IDEMPOTENCY_ROUTE,
        key: idempotencyKey,
        operationType: OPERATION_TYPE,
      },
    });
    generationId = spent.generationId ?? null;
    if (generationId) {
      await prismadb.generation.update({
        where: { id: generationId },
        data: { status: "completed" },
      }).catch(() => {});
      await prismadb.providerUsageRecord.updateMany({
        where: { generationId },
        data: { status: "completed" },
      }).catch(() => {});
    }

    const responseJson = {
      id: generationId,
      object: "chat.completion",
      model: model.id,
      choices: [{
        index: 0,
        message: {
          role: "assistant",
          content: provider.text,
          tool_calls: provider.toolCalls.length ? provider.toolCalls : undefined,
        },
        finish_reason: provider.rawFinishReason,
      }],
      usage: {
        prompt_tokens: provider.usage.inputTokens,
        completion_tokens: provider.usage.outputTokens,
        total_tokens: provider.usage.totalTokens,
      },
      billing: {
        credits: quote.credits,
        remainingCredits: spent.remainingCredits,
      },
    };

    await completeIdempotency({
      userId,
      route: IDEMPOTENCY_ROUTE,
      key: idempotencyKey,
      generationId,
      responseStatus: 200,
      responseJson,
      operationType: OPERATION_TYPE,
    });

    return json(responseJson);
  } catch (error) {
    const idemResponse = idempotencyErrorResponse(error);
    if (idemResponse) return idemResponse;

    if (error instanceof InsufficientCreditsError) {
      const responseJson = {
        error: "Insufficient credits",
        requiredCredits: error.requiredCredits,
        currentBalance: error.currentBalance,
      };
      if (idempotencyClaimed) {
        await completeIdempotency({
          userId,
          route: IDEMPOTENCY_ROUTE,
          key: idempotencyKey,
          generationId,
          responseStatus: 402,
          responseJson,
          operationType: OPERATION_TYPE,
        });
      }
      return json(responseJson, 402);
    }

    const message = error instanceof Error ? error.message : "Cloud Agent request failed.";
    console.error("[panel/director/v1/chat/completions]", error);
    if (idempotencyClaimed) {
      const status = await failIdempotency({
        userId,
        route: IDEMPOTENCY_ROUTE,
        key: idempotencyKey,
        generationId,
        errorMessage: message,
        providerDispatched,
        operationType: OPERATION_TYPE,
      });
      if (status === "review_required") {
        return json({ generationId, status, error: message }, 409);
      }
    }
    return json({ error: message }, 500);
  }
}


