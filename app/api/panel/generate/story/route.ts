import { NextRequest, NextResponse } from "next/server";
import { extractPanelToken, verifyPanelToken } from "@/lib/panel-auth";
import {
  InsufficientCreditsError,
  ensureUserRow,
  spendCredits,
} from "@/lib/credit-ledger";
import { runAiTask, resolveModelId, AiEngineError, type UserContext } from "@/lib/ai-engine";
import prismadb from "@/lib/prismadb";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const STORY_CREDIT_COST = 5;

// ─── Input sanitization ───────────────────────────────────────────────────────

function sanitizeTranscript(raw: string): string {
  return raw.trim().slice(0, 20_000);
}

// ─── Response parsing ─────────────────────────────────────────────────────────

type StorySection = { title: string; start: string; end: string; reason: string };

function parseAiResponse(raw: string): StorySection[] {
  // Strip accidental markdown fences
  const clean = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  let parsed: { sections?: unknown[] };
  try {
    parsed = JSON.parse(clean);
  } catch {
    // Return a single catch-all section rather than crashing
    return [
      {
        title: "Full Transcript",
        start: "00:00:00",
        end: "00:00:00",
        reason: "AI returned an unstructured response. Review transcript manually.",
      },
    ];
  }

  if (!Array.isArray(parsed?.sections) || parsed.sections.length === 0) {
    return [];
  }

  return parsed.sections.map((s: unknown) => {
    const sec = s as Record<string, unknown>;
    return {
      title:  String(sec?.title  ?? "Section").slice(0, 80),
      start:  String(sec?.start  ?? "00:00:00").slice(0, 12),
      end:    String(sec?.end    ?? "00:00:00").slice(0, 12),
      reason: String(sec?.reason ?? "").slice(0, 300),
    };
  });
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Auth
  const token = extractPanelToken(req);
  if (!token) {
    return NextResponse.json({ error: "Missing Authorization header." }, { status: 401 });
  }

  const verified = verifyPanelToken(token);
  if (!verified) {
    return NextResponse.json({ error: "Invalid or expired panel token." }, { status: 401 });
  }

  const { userId } = verified;

  // 2. Parse + validate body
  let body: { transcript?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const rawTranscript = body?.transcript ?? "";
  if (!rawTranscript.trim()) {
    return NextResponse.json({ error: "Transcript is required." }, { status: 400 });
  }

  const transcript = sanitizeTranscript(rawTranscript);

  // 3. Ensure user row exists
  await ensureUserRow(userId);

  // 4. Resolve user plan for model tier selection
  const subscription = await prismadb.userSubscription.findUnique({
    where: { userId },
    select: { planId: true, stripeCurrentPeriodEnd: true },
  });
  const isActive =
    subscription?.stripeCurrentPeriodEnd != null &&
    subscription.stripeCurrentPeriodEnd.getTime() > Date.now();
  const userContext: UserContext = {
    planId: isActive ? (subscription?.planId ?? null) : null,
  };

  let generationId: string | null = null;

  try {
    // 5. Spend credits — deduct BEFORE calling AI (same pattern as image/video routes).
    //    modelId is resolved now so it is recorded accurately in the ledger.
    const modelId = resolveModelId("story_engine", userContext);

    const spent = await spendCredits({
      userId,
      credits: STORY_CREDIT_COST,
      prompt: transcript.slice(0, 200),
      assetType: "STORY_ANALYSIS",
      modelUsed: modelId,
    });
    generationId = spent.generationId ?? null;

    // 6. Execute through centralized AI engine.
    //    The route does NOT know which model or provider is used.
    const aiResult = await runAiTask({
      task:        "story_engine",
      input:       `Here is the transcript:\n\n${transcript}`,
      userContext,
    });

    // 6. Parse structured output
    const sections = parseAiResponse(aiResult.content);

    if (sections.length === 0) {
      return NextResponse.json(
        { error: "AI returned an empty sections list." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      sections,
      creditsUsed: STORY_CREDIT_COST,
      generationId,
    });

  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
          requiredCredits: error.requiredCredits,
          currentBalance: error.currentBalance,
        },
        { status: 402 },
      );
    }

    if (error instanceof AiEngineError) {
      const status = error.code === "PROVIDER_NOT_CONFIGURED" ? 503 : 502;
      return NextResponse.json({ error: error.message }, { status });
    }

    console.error("[panel/generate/story]", error);
    return NextResponse.json({ error: "Story analysis failed. Please try again." }, { status: 500 });
  }
}


    // Sanitize each section field
    const sections = parsed.sections.map((s) => ({
      title:  String(s?.title  ?? "Section").slice(0, 80),
      start:  String(s?.start  ?? "00:00:00").slice(0, 12),
      end:    String(s?.end    ?? "00:00:00").slice(0, 12),
      reason: String(s?.reason ?? "").slice(0, 300),
    }));

    return NextResponse.json({
      sections,
      creditsUsed: STORY_CREDIT_COST,
      generationId,
    });

  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
          requiredCredits: error.requiredCredits,
          currentBalance: error.currentBalance,
        },
        { status: 402 },
      );
    }

    console.error("[panel/generate/story]", error);
    return NextResponse.json({ error: "Story analysis failed. Please try again." }, { status: 500 });
  }
}
