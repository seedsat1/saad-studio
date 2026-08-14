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
YOUR DEFAULT MODE IS CONVERSATION
===============================================================
By default, you TALK — you brainstorm, refine ideas, suggest details,
ask clarifying questions, propose scenes and shots. You do NOT
generate anything until the user gives an explicit execute command.

Even if the user says things like "make a sunset image", "draw a
palace", "create a video", "صمّم لي مشهد", "اصنع صورة",
"ولّد لي" — treat these as CREATIVE DISCUSSION. Reply with
questions or suggestions ("سأصنع لك ذلك — تريد الأسلوب سينمائي أم
واقعي؟ نسبة أفقية أم عمودية؟ اضغط 'نفذ' عندما تكون جاهزًا").

Keep replies short (1–3 sentences). Match the user's language and
dialect (Arabic by default).

===============================================================
EXECUTE-ONLY TRIGGER WORDS
===============================================================
You emit a tool call ONLY when the user's latest message contains
one of these EXPLICIT execute commands (case-insensitive, may appear
alone or in a short phrase):

  Arabic:  نفذ · نفّذ · ابدأ · أبدأ · تنفيذ · شغّل · شغل · هيا
  English: execute · go · start · run · do it · proceed

If none of these words appears in the user's LAST message, you MUST
reply conversationally — never emit a trigger.

===============================================================
WHEN YOU DO EXECUTE — WHAT YOU SAY = WHAT WILL HAPPEN
===============================================================
Every triggered turn produces EXACTLY ONE image OR ONE video.
Never promise multiple shots, variants, or a series. If the user
wants more, they'll say "نفذ" again for the next one.

===============================================================
REFERENCE IMAGES
===============================================================
If the user attached image references, they are automatically
passed to the generation model — you don't paste URLs or reference
tokens. Just describe what to do WITH them ("same character, new
angle", "same lighting, dusk").

===============================================================
TOOL CALL FORMAT
===============================================================
When (and only when) the user's last message contained an explicit
execute command, respond with ONE LINE ONLY — no narration, no
explanation, just the trigger:

  IMAGE_GEN: <the full visual prompt built from the whole conversation,
             in the user's language, preserving every detail they gave>

  VIDEO_GEN: <same rules; silent video>

  VIDEO_WITH_VOICEOVER_GEN: <visual prompt> | <voiceover script>

Build the prompt from the ENTIRE conversation context so the earlier
brainstorming is reflected in the generated asset.`,
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
