import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { extractPanelToken, verifyPanelToken } from "@/lib/panel-auth";
import {
  InsufficientCreditsError,
  ensureUserRow,
  spendCredits,
} from "@/lib/credit-ledger";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const STORY_CREDIT_COST = 5; // 5 credits per transcript analysis

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? "",
});

const SYSTEM_PROMPT = `You are an expert video editor and story analyst working inside Adobe Premiere Pro.
The user will paste a raw transcript of a video, possibly including speaker labels and timestamps.
Your job is to identify the best structural sections for a professional edit.

Respond ONLY with a valid JSON object — no markdown fences, no extra text.
Use this exact schema:

{
  "sections": [
    {
      "title": "<short section name, 2-5 words>",
      "start": "<HH:MM:SS or MM:SS — best guess from transcript context, or '00:00:00' if none>",
      "end": "<HH:MM:SS or MM:SS — best guess, or '00:00:00' if none>",
      "reason": "<one sentence explaining why this section matters>"
    }
  ]
}

Guidelines:
- Identify 4–8 distinct structural sections (hook, setup, conflict, resolution, CTA, etc.)
- If the transcript has timestamps, use them. If not, set start/end to "00:00:00".
- Keep titles concise and editorial. Keep reasons actionable for an editor.
- Do NOT include any text outside the JSON object.`;

// ─── Input validation ─────────────────────────────────────────────────────────

function sanitizeTranscript(raw: string): string {
  return raw.trim().slice(0, 20_000); // max 20k chars (~5k tokens)
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

  // 2. Parse body
  let body: { transcript?: string; type?: string };
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

  // 3. Ensure user exists in DB
  await ensureUserRow(userId);

  // 4. Check OpenAI key
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "AI service not configured on server." }, { status: 503 });
  }

  let generationId: string | null = null;

  try {
    // 5. Spend credits BEFORE calling AI (same pattern as image/video routes)
    const spent = await spendCredits({
      userId,
      credits: STORY_CREDIT_COST,
      prompt: transcript.slice(0, 200),    // store first 200 chars as prompt reference
      assetType: "STORY_ANALYSIS",
      modelUsed: "gpt-4o-mini",
    });
    generationId = spent.generationId ?? null;

    // 6. Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 1500,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: `Here is the transcript:\n\n${transcript}` },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";

    // 7. Parse response — strict JSON only
    let parsed: { sections: Array<{ title: string; start: string; end: string; reason: string }> };
    try {
      // Strip any accidental markdown fences
      const clean = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      // Return raw text as a single section if JSON parsing fails
      parsed = {
        sections: [
          {
            title: "Full Transcript",
            start: "00:00:00",
            end: "00:00:00",
            reason: "AI returned a non-structured response. Showing raw output for reference.",
          },
        ],
      };
    }

    // 8. Validate sections array
    if (!Array.isArray(parsed?.sections) || parsed.sections.length === 0) {
      return NextResponse.json(
        { error: "AI returned an empty sections list." },
        { status: 502 },
      );
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
