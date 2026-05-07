import { NextRequest, NextResponse } from "next/server";
import { extractPanelToken, verifyPanelToken } from "@/lib/panel-auth";
import {
  InsufficientCreditsError,
  ensureUserRow,
  spendCredits,
} from "@/lib/credit-ledger";
import { runAiTask, resolveModelId, AiEngineError, type UserContext } from "@/lib/ai-engine";
import prismadb from "@/lib/prismadb";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

/**
 * Subtitle translation endpoint.
 *
 * Request body:
 *   {
 *     cues: Array<{ i: number, t: string }>,
 *     sourceLang: "ar" | "en" | "auto",
 *     targetLang: "ar" | "en"
 *   }
 *
 * Response:
 *   {
 *     cues: Array<{ i: number, t: string }>,    // same indices, translated text
 *     creditsUsed: number,
 *     generationId: string | null
 *   }
 *
 * The route splits very long cue lists into batches so a single failed call
 * does not lose all work. Each batch is charged independently.
 */

const TRANSLATE_CREDIT_COST = 4;       // per batch
const MAX_CUES_PER_BATCH    = 50;      // conservative — fits well within token limits
const MAX_TOTAL_CUES        = 1500;    // hard ceiling to prevent runaway cost
const MAX_TEXT_PER_CUE      = 500;     // per-cue char limit

type Cue = { i: number; t: string };
type Lang = "ar" | "en" | "auto";

// ─── Validation ───────────────────────────────────────────────

function isLang(v: unknown): v is Lang {
  return v === "ar" || v === "en" || v === "auto";
}

function isTargetLang(v: unknown): v is "ar" | "en" {
  return v === "ar" || v === "en";
}

function sanitizeCues(raw: unknown): Cue[] | null {
  if (!Array.isArray(raw)) return null;
  const out: Cue[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const i = (item as Record<string, unknown>).i;
    const t = (item as Record<string, unknown>).t;
    if (typeof i !== "number" || !Number.isFinite(i)) continue;
    if (typeof t !== "string") continue;
    out.push({ i, t: t.slice(0, MAX_TEXT_PER_CUE) });
  }
  return out;
}

// ─── Response parsing ─────────────────────────────────────────

function parseTranslationResponse(raw: string): Cue[] {
  const clean = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  let parsed: { cues?: unknown[] };
  try {
    parsed = JSON.parse(clean);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed?.cues)) return [];

  const out: Cue[] = [];
  for (const c of parsed.cues) {
    if (!c || typeof c !== "object") continue;
    const i = (c as Record<string, unknown>).i;
    const t = (c as Record<string, unknown>).t;
    if (typeof i !== "number" || !Number.isFinite(i)) continue;
    if (typeof t !== "string") continue;
    out.push({ i, t: t.slice(0, MAX_TEXT_PER_CUE) });
  }
  return out;
}

// ─── Batch helper ─────────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function buildBatchInput(
  batch: Cue[],
  sourceLang: Lang,
  targetLang: "ar" | "en",
): string {
  const langLabel = (l: Lang) =>
    l === "ar" ? "Arabic" : l === "en" ? "English" : "auto-detect (Arabic or English)";

  // Header tells the model the source/target — kept outside the JSON so the
  // model never confuses it with cue data.
  const header = [
    `Source language: ${langLabel(sourceLang)}`,
    `Target language: ${langLabel(targetLang)}`,
    `Number of cues: ${batch.length}`,
    "Translate each cue's `t` field. Keep `i` exactly as given.",
    "",
    "Cues:",
  ].join("\n");

  // We pass the cue array as JSON so structure is unambiguous.
  return `${header}\n${JSON.stringify({ cues: batch })}`;
}

// ─── Route handler ────────────────────────────────────────────

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

  // 2. Parse body
  let body: { cues?: unknown; sourceLang?: unknown; targetLang?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const cues = sanitizeCues(body?.cues);
  if (!cues || cues.length === 0) {
    return NextResponse.json({ error: "cues array is required." }, { status: 400 });
  }
  if (cues.length > MAX_TOTAL_CUES) {
    return NextResponse.json(
      { error: `Too many cues. Maximum is ${MAX_TOTAL_CUES} per request.` },
      { status: 413 },
    );
  }

  const sourceLang: Lang = isLang(body?.sourceLang) ? (body.sourceLang as Lang) : "auto";
  if (!isTargetLang(body?.targetLang)) {
    return NextResponse.json(
      { error: 'targetLang is required and must be "ar" or "en".' },
      { status: 400 },
    );
  }
  const targetLang = body.targetLang as "ar" | "en";

  if (sourceLang === targetLang) {
    return NextResponse.json(
      { error: "Source and target languages are the same." },
      { status: 400 },
    );
  }

  // 3. User context for plan tier
  await ensureUserRow(userId);
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

  const modelId = resolveModelId("subtitle_translate", userContext);
  const batches = chunk(cues, MAX_CUES_PER_BATCH);
  const totalCost = batches.length * TRANSLATE_CREDIT_COST;

  let creditsSpent  = 0;
  let firstGenerationId: string | null = null;
  const translated:  Cue[] = [];
  const failedBatches: number[] = [];

  try {
    for (let b = 0; b < batches.length; b++) {
      const batch = batches[b];

      // Charge per batch — if a later batch fails, earlier batches are still paid for
      // but the user has the partial result.
      const spent = await spendCredits({
        userId,
        credits:   TRANSLATE_CREDIT_COST,
        prompt:    `[translate ${sourceLang}→${targetLang}] batch ${b + 1}/${batches.length}, ${batch.length} cues`,
        assetType: "SUBTITLE_TRANSLATE",
        modelUsed: modelId,
      });
      if (!firstGenerationId) firstGenerationId = spent.generationId ?? null;
      creditsSpent += TRANSLATE_CREDIT_COST;

      try {
        const result = await runAiTask({
          task:        "subtitle_translate",
          input:       buildBatchInput(batch, sourceLang, targetLang),
          userContext,
        });
        const parsed = parseTranslationResponse(result.content);

        // Re-key parsed cues by index so we don't depend on the LLM
        // returning them in order. Missing indices fall back to source.
        const byIndex = new Map<number, string>();
        for (const c of parsed) byIndex.set(c.i, c.t);

        for (const original of batch) {
          const t = byIndex.get(original.i);
          translated.push({
            i: original.i,
            t: t && t.trim() ? t : original.t, // fallback: keep source if LLM dropped it
          });
        }
      } catch (batchErr) {
        // Don't blow up the whole request — record the failure and continue
        failedBatches.push(b + 1);
        // Use source text as fallback for this batch's cues so indices stay aligned
        for (const original of batch) {
          translated.push({ i: original.i, t: original.t });
        }
        console.error(`[panel/generate/translate] batch ${b + 1} failed:`, batchErr);
      }
    }

    return NextResponse.json({
      cues: translated,
      sourceLang,
      targetLang,
      creditsUsed:  creditsSpent,
      totalCharged: totalCost,
      generationId: firstGenerationId,
      failedBatches: failedBatches.length > 0 ? failedBatches : undefined,
    });

  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
          requiredCredits: error.requiredCredits,
          currentBalance:  error.currentBalance,
          partial:         translated.length > 0
            ? { cues: translated, creditsUsed: creditsSpent }
            : undefined,
        },
        { status: 402 },
      );
    }

    if (error instanceof AiEngineError) {
      const status = error.code === "PROVIDER_NOT_CONFIGURED" ? 503 : 502;
      return NextResponse.json({ error: error.message }, { status });
    }

    console.error("[panel/generate/translate]", error);
    return NextResponse.json({ error: "Translation failed. Please try again." }, { status: 500 });
  }
}
