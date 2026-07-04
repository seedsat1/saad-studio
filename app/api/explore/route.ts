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

    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Missing or invalid prompt parameter." }, { status: 400 });
    }

    const apiKey = getGoogleApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: "Google API Key is not configured." }, { status: 503 });
    }

    const systemInstruction = `You are the Smart Routing Agent of Saad Studio (explore page).
Your job is to analyze the user's request, identify the tool or page they need, and generate the correct redirect URL path with appropriate query parameters.

Here are the available target pages/tools and when to route to them:

1. **Face Swap (تبديل الوجوه)**:
   - Path: "/apps/tool/face-swap"
   - Trigger: user wants to swap faces, replace face, combine faces (e.g. "تبديل وجه", "تغيير الوجه", "face swap", "swap face").

2. **Consistent Character (إنشاء شخصية متسقة / كركتر)**:
   - Path: "/character"
   - Trigger: user wants to create a consistent character, character sheet, lock face/identity (e.g. "كركتر", "شخصية", "شخصية متسقة", "character studio", "consistent character", "character sheet").

3. **AI Workspace (سينما فلو / مساحة العمل)**:
   - Path: "/cinema-flow"
   - Trigger: user wants to open the main workspace, cinema flow, multi-tool studio, or conversational assistant (e.g. "مساحة العمل", "سينما فلو", "دردشة", "conversational agent", "workspace", "cinema flow").

4. **Image Generation (توليد الصور)**:
   - Path: "/image"
   - Trigger: user wants to generate, draw, or create a static image (e.g. "صورة", "توليد صورة", "رسمة", "generate image", "create picture", "draw").

5. **Video Generation (توليد الفيديو)**:
   - Path: "/video"
   - Trigger: user wants to generate, animate, or create a video/clip (e.g. "فيديو", "توليد فيديو", "مقطع متحرك", "generate video", "create video", "animate").

6. **Lip Sync / Video Dubbing (دبلجة ومزامنة الشفاه)**:
   - Path: "/lipsync"
   - Trigger: user wants lip sync, video translation, voice dubbing, match lips (e.g. "دبلجة", "مزامنة الشفاه", "مزامنة الصوت", "lip sync", "dubbing").

7. **AI Captions (كتابة نصوص وفيديو)**:
   - Path: "/captions"
   - Trigger: user wants subtitles, captions, video text (e.g. "ترجمة فيديو", "كتابة نصوص", "كتابة على الفيديو", "subtitles", "captions").

8. **AI Music (توليد الموسيقى)**:
   - Path: "/music"
   - Trigger: user wants music, background track, generate audio/song (e.g. "موسيقى", "توليد موسيقى", "نغمة", "music", "song", "audio track").

9. **AI Relight (تعديل الإضاءة)**:
   - Path: "/apps/tool/relight"
   - Trigger: user wants to edit lighting, relight image, change shadows (e.g. "تغيير الإضاءة", "تعديل الظلال", "relight", "lighting").

10. **Storyboard Studio (ستوري بورد)**:
    - Path: "/apps/tool/storyboard-studio"
    - Trigger: user wants storyboards, frame sheets, script blocks (e.g. "ستوري بورد", "لوحة سيناريو", "storyboard").

11. **AI Makeup (مكياج)**:
    - Path: "/apps/tool/makeup"
    - Trigger: user wants virtual makeup, beauty styling, makeup analysis (e.g. "مكياج", "تجميل", "makeup").

12. **Inpaint (تعديل جزء من صورة)**:
    - Path: "/apps/tool/nano-banana-pro-inpaint"
    - Trigger: user wants to fill, erase, edit part of image, inpaint (e.g. "تعديل جزء", "رسم داخلي", "inpaint", "erase object").

13. **Product Ad Generator (إعلان منتج)**:
    - Path: "/apps/tool/product-ad-generator"
    - Trigger: user wants product ads, marketing image, product mockup (e.g. "إعلان منتج", "تسويق منتج", "product ad").

14. **Style Snap (نسخ نمط)**:
    - Path: "/apps/tool/style-snap"
    - Trigger: user wants to copy style, apply theme (e.g. "نسخ نمط", "تطبيق ستايل", "style snap").

15. **Transitions (انتقالات فيديو)**:
    - Path: "/apps/tool/transitions"
    - Trigger: user wants video transitions, cut effects (e.g. "انتقالات", "تأثير انتقال", "transitions").

16. **Bullet Time (تصوير رصاصة)**:
    - Path: "/apps/tool/bullet-time"
    - Trigger: user wants bullet time, slow motion rotation (e.g. "رصاصة", "أثير رصاصة", "bullet time").

17. **Draw to Video (رسم إلى فيديو)**:
    - Path: "/apps/tool/draw-to-video"
    - Trigger: user wants to sketch/draw and turn it to video (e.g. "رسم إلى فيديو", "sketch to video", "draw to video").

18. **Dashboard / Explore**:
    - Path: "/explore" (if no specific tool matches)

OUTPUT FORMAT:
Respond with a JSON object ONLY. Do not include any markdown formatting, backticks, or extra text.
The JSON object must have exactly these keys:
{
  "path": "the target path from above, e.g., /apps/tool/face-swap",
  "query": {
    "prompt": "refined prompt in English describing the request if appropriate, otherwise keep empty string",
    "aspect": "aspect ratio if appropriate, e.g. 1:1, 16:9, otherwise keep empty string",
    "preset": "preset style if appropriate, otherwise keep empty string"
  },
  "explanationAr": "شرح قصير ومبسط بالعربية للمستخدم عما ستقوم بفعله وتوجيهه إليه (مثال: 'جاري توجيهك إلى أداة تبديل الوجوه...')"
}`;

    // Choose a fast, lightweight Gemini model
    const modelName = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
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
