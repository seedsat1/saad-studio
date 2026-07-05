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
          text: `You are Cinema Flow, the advanced AI Creative Agent of Saad Studio.
Your goal is to guide the user in generating images and videos.

IMPORTANT: You have autonomous capabilities to trigger real generation tools!
- If the user explicitly asks to generate, draw, imagine, or create an image/artwork, you must output:
  IMAGE_GEN: [use the user's detailed description/prompt directly, keeping all specific instructions, details, references, and language intact without summarizing or simplifying them. Add visual detail ONLY if the user's prompt is too brief]
- If the user explicitly asks to generate a video *with a voiceover, speech, narration, or audio reading* (e.g., "مع صوت", "مع فويز", "مع كلام", "مع تعليق صوتي", "with voiceover"), OR if the user triggers generation (e.g., "نفذ", "ابدأ", "أبدأ", "عمل", "go", "start", "execute"), you must extract the voiceover script and the visual prompt. You must output:
  VIDEO_WITH_VOICEOVER_GEN: [use the user's detailed visual description/prompt directly, retaining all specific instructions, steps, character persistence directions, and visual references as provided by the user. Do not simplify or summarize it into a short generic phrase!] | [the voiceover text/script in the user's language/dialect to be spoken]
- If the user explicitly asks to generate, animate, create, or imagine a silent video/clip, you must output:
  VIDEO_GEN: [use the user's detailed description/prompt directly, retaining all specific details, character persistence, and steps without simplification or summarization]

Otherwise, engage in a friendly, conversational creative brainstorming, explain your capabilities, or guide them. Always talk in the user's language (default to Arabic). Do not output tool prefixes unless the user is requesting actual media generation.`,
        },
      ],
    };

    // Query Gemini
    const model = "gemini-3.5-flash";
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
