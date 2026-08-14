import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messages, selectedVideoModel, selectedImageModel } = await req.json().catch(() => ({}));
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    const apiKey =
      process.env.GOOGLE_AI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Google API Key is not configured on the server." },
        { status: 500 }
      );
    }

    // Format chat history for Google Gemini API
    const contents = [];
    for (const m of messages) {
      const parts: any[] = [{ text: m.text }];

      // Download and attach reference images if present
      const urlsToFetch: string[] = [];
      if (m.sender === "user") {
        if (m.assetUrl) urlsToFetch.push(m.assetUrl);
        if (m.assetUrls && Array.isArray(m.assetUrls)) {
          for (const url of m.assetUrls) {
            if (url && !urlsToFetch.includes(url)) {
              urlsToFetch.push(url);
            }
          }
        }
      }

      for (const url of urlsToFetch) {
        try {
          let targetUrl = url;
          if (targetUrl.startsWith("/")) {
            const origin = req.nextUrl.origin;
            targetUrl = `${origin}${targetUrl}`;
          }

          const imgRes = await fetch(targetUrl);
          if (imgRes.ok) {
            const buffer = await imgRes.arrayBuffer();
            const base64 = Buffer.from(buffer).toString("base64");
            const contentType = imgRes.headers.get("content-type") || "image/jpeg";

            parts.push({
              inlineData: {
                mimeType: contentType,
                data: base64
              }
            });
          }
        } catch (e) {
          console.error("Failed to download chat reference image:", e);
        }
      }

      contents.push({
        role: m.sender === "user" ? "user" : "model",
        parts,
      });
    }

    const systemInstruction = {
      parts: [
        {
          text: `You are Cinema Flow, the creative agent of Saad Studio.

===============================================================
FUNDAMENTAL RULE — WHAT YOU SAY IS WHAT WILL HAPPEN
===============================================================
Every turn you either (a) chat, or (b) trigger ONE tool call.
You produce exactly ONE image OR ONE video per triggered turn — never more.
Never announce plans your tool call cannot fulfill. Never say
"I will make 5 shots" or "I will generate several variants" —
the tool produces one asset per turn.
If the user needs several shots, ask them to send you the next
prompt after each result, or state explicitly: "سأنفّذ هذه اللقطة الآن، ثم اطلب التالية".

===============================================================
REFERENCE IMAGES
===============================================================
If the user attached image references in this turn or the previous one,
they are ALREADY being passed to the generation model automatically.
Do NOT paste URLs, [Reference N: ...] tokens, or "using image at ..."
inside your prompt text. Just describe what to do WITH the reference
(e.g. "same character, new angle", "same lighting, sunset").

===============================================================
TOOL TRIGGERS
===============================================================
Only when the user clearly asks to generate/create/draw/animate/execute,
output one of these on the FIRST line, then stop:

  IMAGE_GEN: <the full user-intent prompt, verbatim in their language,
             enriched only if the user was too brief>

  VIDEO_GEN: <same rules; silent video>

  VIDEO_WITH_VOICEOVER_GEN: <visual prompt> | <voiceover script in
                            user's language/dialect>

Trigger words include (any language): generate, create, draw, imagine,
animate, execute, start, go, نفذ, ابدأ, أبدأ, ولّد, اعمل, صمّم.

If the user is chatting, brainstorming, refining, or asking questions,
DO NOT emit a trigger. Reply conversationally in their language
(default Arabic). Keep replies short and concrete — one useful paragraph.`,
        },
      ],
    };

    // Query Gemini
    const model = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction,
        generationConfig: {
          maxOutputTokens: 800,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[cinema-flow chat] API error:", errText);
      throw new Error(`Google API returned status ${res.status}`);
    }

    const data = await res.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return NextResponse.json({ text: candidateText.trim() });
  } catch (err: any) {
    console.error("[cinema-flow chat] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
