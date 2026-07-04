import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

function getGoogleApiKey(): string | null {
  return (
    process.env.GOOGLE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    null
  );
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prompt, history } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Missing or invalid prompt parameter." }, { status: 400 });
    }

    const apiKey = getGoogleApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: "Google API Key is not configured." }, { status: 503 });
    }

    // Compile chat contents with history for full conversational context
    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const msg of history.slice(-10)) {
        contents.push({
          role: msg.sender === "user" ? "user" : "model",
          parts: [{ text: msg.text }],
        });
      }
    }
    contents.push({
      role: "user",
      parts: [{ text: prompt }],
    });

    const systemInstruction = `You are Saad Studio's Smart Conversational and Routing Agent.
Your job is to interact with users, answer their questions in a friendly manner, and guide or redirect them to the appropriate pages/tools when they ask to create, edit, swap, or perform specific actions.

Here is how you decide:
- If the user is just greeting you, asking how you are, asking about Saad Studio in general, or having a casual chat, set "action": "chat" and "path": "". Answer them warmly in Arabic.
- If the user wants to use a specific tool or generate media, set "action": "redirect" and set "path" to the appropriate route from the list below. Keep the "response" text as a short, polite Arabic confirmation of where you are taking them.

Available target routes:
1. **Face Swap (تبديل الوجوه)**:
   - Path: "/apps/tool/face-swap"
   - Trigger: user wants to swap faces, replace face, combine faces (e.g. "تبديل وجه", "تغيير الوجه", "face swap", "swap face").

2. **Consistent Character (إنشاء شخصية متسقة / كركتر)**:
   - Path: "/character"
   - Trigger: user wants to create a consistent character, character sheet, lock face/identity (e.g. "كركتر", "شخصية", "شخصية متسقة", "character studio", "consistent character").

3. **AI Workspace (سينما فلو / مساحة العمل)**:
   - Path: "/cinema-flow"
   - Trigger: user wants to open the main workspace, cinema flow, multi-tool studio, or conversational assistant (e.g. "مساحة العمل", "سينما فلو", "دردشة", "conversational agent", "workspace").

4. **Image Generation (توليد الصور)**:
   - Path: "/image"
   - Trigger: user wants to generate, draw, or create a static image (e.g. "صورة", "توليد صورة", "رسمة", "generate image", "create picture", "draw").

5. **Video Generation (توليد الفيديو)**:
   - Path: "/video"
   - Trigger: user wants to generate, animate, or create a video/clip (e.g. "فيديو", "توليد فيديو", "مقطع متحرك", "generate video", "create video", "animate").

6. **Lip Sync / Video Dubbing (دبلجة ومزامنة الشفاه)**:
   - Path: "/lipsync"
   - Trigger: user wants lip sync, video translation, voice dubbing, match lips (e.g. "دبلجة", "مزامنة الشفاه", "lip sync").

7. **AI Captions (كتابة نصوص وفيديو)**:
   - Path: "/captions"
   - Trigger: user wants subtitles, captions, video text (e.g. "ترجمة فيديو", "كتابة نصوص", "captions").

8. **AI Music (توليد الموسيقى)**:
   - Path: "/music"
   - Trigger: user wants music, background track, generate audio/song (e.g. "موسيقى", "توليد موسيقى", "music", "song").

9. **AI Relight (تعديل الإضاءة)**:
   - Path: "/apps/tool/relight"
   - Trigger: user wants to edit lighting, relight image, change shadows (e.g. "تغيير الإضاءة", "relight").

10. **Storyboard Studio (ستوري بورد)**:
    - Path: "/apps/tool/storyboard-studio"
    - Trigger: user wants storyboards, frame sheets (e.g. "ستوري بورد", "storyboard").

11. **AI Makeup (مكياج)**:
    - Path: "/apps/tool/makeup"
    - Trigger: user wants virtual makeup, beauty styling (e.g. "مكياج", "makeup").

12. **Inpaint (تعديل جزء من صورة)**:
    - Path: "/apps/tool/nano-banana-pro-inpaint"
    - Trigger: user wants to fill, erase, edit part of image (e.g. "تعديل جزء", "inpaint").

13. **Product Ad Generator (إعلان منتج)**:
    - Path: "/apps/tool/product-ad-generator"
    - Trigger: user wants product ads, marketing image (e.g. "إعلان منتج", "product ad").

14. **Style Snap (نسخ نمط)**:
    - Path: "/apps/tool/style-snap"
    - Trigger: user wants to copy style (e.g. "نسخ نمط", "style snap").

15. **Transitions (انتقالات فيديو)**:
    - Path: "/apps/tool/transitions"
    - Trigger: user wants video transitions (e.g. "انتقالات", "transitions").

16. **Bullet Time (تصوير رصاصة)**:
    - Path: "/apps/tool/bullet-time"
    - Trigger: user wants bullet time (e.g. "Bullet Time", "تأثير رصاصة").

17. **Draw to Video (رسم إلى فيديو)**:
    - Path: "/apps/tool/draw-to-video"
    - Trigger: user wants to sketch/draw and turn it to video (e.g. "رسم إلى فيديو", "draw to video").

OUTPUT FORMAT:
Respond with a JSON object ONLY. Do not include any markdown formatting, backticks, or extra text.
The JSON object must have exactly these keys:
{
  "action": "chat" or "redirect",
  "path": "the target path from above, or empty string",
  "query": {
    "prompt": "refined prompt in English describing the request if appropriate, otherwise keep empty string",
    "aspect": "aspect ratio if appropriate, e.g. 1:1, 16:9, otherwise keep empty string",
    "preset": "preset style if appropriate, otherwise keep empty string"
  },
  "response": "Arabic response message explaining the action or answering their question"
}`;

    const modelName = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 500,
        },
      }),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      return NextResponse.json(
        { error: json?.error?.message || "Failed to query Gemini router." },
        { status: res.status }
      );
    }

    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Empty response from Gemini router.");
    }

    const parsedResult = JSON.parse(text.trim());
    return NextResponse.json(parsedResult);
  } catch (error) {
    console.error("[explore/route] Error routing intent:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal routing error" },
      { status: 500 }
    );
  }
}
