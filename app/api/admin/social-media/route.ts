import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import {
  getSocialPosts,
  saveSocialPost,
  deleteSocialPost,
  getSocialAccountsConfig,
  saveSocialAccountsConfig,
  getStoryboards,
  saveStoryboard,
  deleteStoryboard,
  SocialMediaPostRecord,
  PlatformContentItem,
  StoryboardShowcaseRecord,
  StoryboardThemeType,
  StoryboardTemplateType,
} from "@/lib/social-media";
import { googleGenerateImage } from "@/lib/providers/google-images";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://saadstudio.app";

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const posts = await getSocialPosts();
    const storyboards = await getStoryboards();
    const config = await getSocialAccountsConfig();
    return NextResponse.json({ posts, storyboards, config });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch social posts" },
      { status: 500 }
    );
  }
}

async function generateImageDirectly(
  prompt: string,
  modelName: string,
  aspectRatio: string = "16:9",
  referenceImageUrl?: string
): Promise<string> {
  const model = (modelName || "nano-banana-pro").toLowerCase();
  
  const cleanPrompt = prompt.trim().replace(/^Prompt:\s*/i, "");
  const cinematicMasterPrompt = cleanPrompt;

  // 1. WaveSpeed Grok Imagine 2.0 (x-ai/grok-imagine-image-v2.0/text-to-image)
  if (model.includes("grok")) {
    const wavespeedKey = process.env.WAVESPEED_API_KEY;
    if (wavespeedKey) {
      try {
        const payload: any = {
          prompt: cinematicMasterPrompt,
          aspect_ratio: aspectRatio || "16:9",
        };
        if (referenceImageUrl) {
          payload.image_url = referenceImageUrl;
          payload.images = [referenceImageUrl];
        }

        const submitRes = await fetch("https://api.wavespeed.ai/api/v3/x-ai/grok-imagine-image-v2.0/text-to-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${wavespeedKey}`,
          },
          body: JSON.stringify(payload),
        });

        if (submitRes.ok) {
          const submitData = await submitRes.json();
          const taskId = submitData?.id || submitData?.data?.id;
          if (taskId) {
            // Poll WaveSpeed for completion
            for (let i = 0; i < 30; i++) {
              await new Promise((r) => setTimeout(r, 2000));
              const pollRes = await fetch(`https://api.wavespeed.ai/api/v3/predictions/${taskId}`, {
                headers: { Authorization: `Bearer ${wavespeedKey}` },
              });
              if (pollRes.ok) {
                const pollData = await pollRes.json();
                const status = pollData?.status || pollData?.data?.status;
                if (status === "completed" || status === "succeeded") {
                  const directUrl =
                    pollData?.output?.[0] ||
                    pollData?.outputs?.[0] ||
                    pollData?.data?.output?.[0] ||
                    pollData?.data?.outputs?.[0] ||
                    pollData?.url ||
                    pollData?.data?.url;
                  if (directUrl && typeof directUrl === "string") return directUrl;
                }
                if (status === "failed" || status === "error") break;
              }
            }
          }
        }
      } catch (e) {
        console.warn("WaveSpeed Grok Imagine generation failed:", e);
      }
    }

    // Direct xAI API fallback
    const xaiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
    if (xaiKey) {
      try {
        const res = await fetch("https://api.x.ai/v1/images/generations", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${xaiKey}` },
          body: JSON.stringify({ model: "grok-2-image", prompt: cinematicMasterPrompt, aspect_ratio: aspectRatio }),
        });
        if (res.ok) {
          const data = await res.json();
          const url = data?.data?.[0]?.url;
          if (url) return url;
        }
      } catch (e) {
        console.warn("Direct xAI Grok generation failed:", e);
      }
    }
  }

  // 2. OpenAI GPT-Image-2
  if (model.includes("gpt")) {
    const openAIApiKey = process.env.OPENAI_API_KEY;
    if (openAIApiKey && openAIApiKey !== "sk-placeholder") {
      try {
        const res = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${openAIApiKey}` },
          body: JSON.stringify({ model: "dall-e-2", prompt: cinematicMasterPrompt.slice(0, 950), size: "1024x1024", n: 1 }),
        });
        if (res.ok) {
          const data = await res.json();
          const url = data?.data?.[0]?.url;
          if (url) return url;
        }
      } catch (e) {
        console.warn("GPT-Image-2 generation failed, trying Google Nano Banana:", e);
      }
    }
  }

  // 3. Google Nano Banana Pro (Primary Default with optional image-to-image reference)
  try {
    const result = await googleGenerateImage({
      modelId: "nano-banana-pro",
      prompt: cinematicMasterPrompt,
      aspectRatio: aspectRatio as any,
      resolution: "2K",
      numImages: 1,
      imageUrls: referenceImageUrl ? [referenceImageUrl] : [],
    });
    if (result?.urls?.[0]) return result.urls[0];
  } catch (e) {
    console.warn("Google Nano Banana generation error:", e);
  }

  return "";
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "generate";

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://saadstudio.app";

    // 0. INTERACTIVE CONSULTATION & DIALOGUE BEFORE GENERATION
    if (action === "consult") {
      const messages = Array.isArray(body.messages) ? body.messages : [];
      const topic = String(body.topic || body.prompt || "").trim();
      const targetLang = (body.language || "ar") === "en" ? "en" : "ar";

      const openAIApiKey = process.env.OPENAI_API_KEY;

      const systemPrompt = `You are the Lead Creative Director and Social Media Strategist at "Saad Studio" (سعد ستوديو - the premier AI creative studio).
Your role is to consult and converse with the creator BEFORE generating content and visuals to ensure 100% precision.

Target Language: ${targetLang === "ar" ? "العربية الفصحى الاحترافية والودودة" : "English"}.

In your response:
1. Act as a world-class creative partner. Give insightful feedback on the user's idea.
2. Ask 2-3 focused, multiple-choice or short questions (e.g. نبرة المحتوى: حماسية/تسويقية/سينمائية، الطابع البصري: سايبربانك/واقعي فوتوغرافي/مينيمالي، تفضيل نوع الوسائط: صورة فائقة الدقة أو فيديو سينمائي).
3. Propose 3 quick selectable options/pills the user can click to answer.
4. If the user is already satisfied and has finalized details, set isReadyToGenerate: true and provide the refined, finalized prompt ready for execution.

Return a JSON object matching:
{
  "message": "Your conversational response in Arabic/English...",
  "suggestedOptions": ["خيار 1", "خيار 2", "خيار 3"],
  "recommendedConfig": {
    "refinedPrompt": "...",
    "mediaType": "image" | "video",
    "imageModel": "nano-banana-pro" | "grok-imagine" | "gpt-image-2",
    "videoModel": "kling-3.0/video" | "bytedance/seedance-2" | "google/gemini-omni-flash",
    "aspectRatio": "16:9" | "9:16" | "1:1" | "4:5"
  },
  "isReadyToGenerate": false
}`;

      if (openAIApiKey && openAIApiKey !== "sk-placeholder") {
        try {
          const apiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openAIApiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: systemPrompt },
                ...(messages.length > 0
                  ? messages
                  : [{ role: "user", content: `Initial idea: ${topic || "حملة تسويقية جديدة لسعد ستوديو"}` }]),
              ],
              response_format: { type: "json_object" },
              temperature: 0.7,
            }),
          });

          if (apiRes.ok) {
            const data = await apiRes.json();
            const raw = data.choices?.[0]?.message?.content;
            if (raw) {
              const parsed = JSON.parse(raw);
              return NextResponse.json({ success: true, ...parsed });
            }
          }
        } catch (e) {
          console.warn("Consultation chat failed:", e);
        }
      }

      // Fallback consultation response
      if (targetLang === "ar") {
        return NextResponse.json({
          success: true,
          message: `أهلاً بك! فكرة ممتازة 🚀 قبل أن أبدأ في توليد المحتوى واللقطات السينمائية، دعنا نحدد التفاصيل بدقة:\n\n1. ما هي النبرة التي تفضلها في البوستات؟ (تشويقية حماسية، أم تقنية احترافية؟)\n2. ما هو الطابع البصري للصورة أو الفيديو؟ (واقعي سينمائي فوتوغرافي، أم سايبربانك مستقبلي؟)\n3. هل تفضل توليد صورة فائقة الدقة بـ (Nano Banana Pro / Grok Imagine) أم فيديو سينمائي بـ (Kling 3.0 Pro)؟`,
          suggestedOptions: [
            "نبرة حماسية + فيديو سينمائي بـ Kling 3.0 Pro",
            "نبرة تقنية فاخرة + صورة 4K بـ Nano Banana Pro",
            "طابع سايبربانك + صورة بـ Grok Imagine 2.0",
          ],
          recommendedConfig: {
            refinedPrompt: topic,
            mediaType: "image",
            imageModel: "nano-banana-pro",
            videoModel: "kling-3.0/video",
            aspectRatio: "16:9",
          },
          isReadyToGenerate: false,
        });
      } else {
        return NextResponse.json({
          success: true,
          message: `Great concept! Before I generate the full campaign, let's align on a few creative choices:\n\n1. What tone do you prefer? (Viral hype vs Professional authority)\n2. What visual atmosphere? (Hollywood cinematic realism vs Futuristic cyberpunk)\n3. Prefer a high-res photo (Nano Banana / Grok) or cinematic video (Kling 3.0 Pro)?`,
          suggestedOptions: [
            "Viral Hype + Kling 3.0 Pro Video",
            "High-End Studio + Nano Banana Pro 4K",
            "Cyberpunk Aesthetic + Grok Imagine 2.0",
          ],
          recommendedConfig: {
            refinedPrompt: topic,
            mediaType: "image",
            imageModel: "nano-banana-pro",
            videoModel: "kling-3.0/video",
            aspectRatio: "16:9",
          },
          isReadyToGenerate: false,
        });
      }
    }

    // 1. GENERATE SOCIAL POSTS WITH AI
    if (action === "generate") {
      const userPrompt = String(body.prompt || "").trim();
      const targetLang = (body.language || "ar") === "en" ? "en" : "ar";
      const mediaType = String(body.mediaType || "image") as "image" | "video";
      const imageModel = String(body.imageModel || "nano-banana-pro");
      const videoModel = String(body.videoModel || "kling-3.0/video");
      const aspectRatio = String(body.aspectRatio || "16:9");

      const rawRefUrl = typeof body.referenceImageUrl === "string" ? body.referenceImageUrl.trim() : (typeof body.imageUrl === "string" ? body.imageUrl.trim() : "");
      const referenceImageUrl = rawRefUrl
        ? (rawRefUrl.startsWith("http") ? rawRefUrl : `${siteUrl}${rawRefUrl.startsWith("/") ? "" : "/"}${rawRefUrl}`)
        : "";

      if (!userPrompt && !referenceImageUrl) {
        return NextResponse.json({ error: "Prompt or Reference Image is required" }, { status: 400 });
      }

      const openAIApiKey = process.env.OPENAI_API_KEY;
      let platformsResult: SocialMediaPostRecord["platforms"] = {} as any;
      let imageGenPrompt = "";

      if (openAIApiKey && openAIApiKey !== "sk-placeholder") {
        const isArabic = targetLang === "ar";
        const systemPrompt = `You are a world-class Creative Director, Master Visual Artist, and Lead Social Media Strategist at Saad Studio (سعد ستوديو). You possess the unbounded creativity, deep visual intuition, and nuanced intelligence of ChatGPT at its best.

MANDATORY LANGUAGE ENFORCEMENT:
The selected output language is: ${isArabic ? "ARABIC (اللغة العربية الفصحى العصرية الجذابة)" : "ENGLISH"}.
- ${isArabic ? "You MUST write ALL post content, hooks, captions, explanations, calls-to-action, and hashtags for all 6 platforms (twitter, instagram, linkedin, facebook, telegram, tiktok) in FLUENT, HIGH-ENERGY ARABIC ONLY. NEVER write the post text in English unless explicitly asked by the user! (Only the internal 'imagePrompt' field must be in English for the AI image generator)." : "Write all post contents and hashtags in English."}

YOUR CREATIVE PHILOSOPHY:
1. UNBOUNDED CREATIVE INTUITION:
   - Think creatively and dynamically for every request. Never use rigid formulas or repetitive tropes.
   - Deeply understand the user's specific theme, context, emotion, and purpose (whether it is an AI tech keynote, luxury fashion, cinematic drama, product launch, personal brand, documentary, comedy, or art).
   - Invent fresh, imaginative visual concepts and compelling storytelling angles that uniquely fit the specific request.

2. MULTIMODAL PERSONA & VISUAL INTEGRATION:
   ${referenceImageUrl ? `- You have been provided with a reference image. Deeply observe the image: identify the subject (facial features, hair, identity, expression, gaze, posture, styling, and overall vibe).
- Seamlessly adapt and integrate the subject's exact identity into the new creative concept requested by the user, elevating the environment, lighting, wardrobe, and action naturally to match the envisioned story.` : "- Conceive striking, photorealistic characters, subjects, or environments that bring the user's vision to life with maximum visual power."}

3. MASTER-LEVEL VISUAL PROMPT ("imagePrompt"):
   - Write an English master visual prompt (100-160 words) that describes the scene with the precision and flair of an award-winning cinematographer and art director.
   - Describe: the subject and their action/pose, composition, wardrobe/styling, lighting direction and mood, environmental atmosphere, color grading, camera perspective, and authentic textural detail.
   - Maintain pure photorealism: sharp focus, authentic skin/material textures, true-to-life lighting. Avoid generic cartoonish CGI or gibberish.

4. ORGANIC, HIGH-CONVERTING SOCIAL MEDIA COPY:
   Write organic, engaging, platform-customized copy tailored for all 6 networks (in ${isArabic ? "ARABIC" : "ENGLISH"}):
   - twitter: Magnetic hook, sharp value/intrigue, authentic tone, 2-3 natural hashtags (${isArabic ? "مثل #سعد_ستوديو #ذكاء_اصطناعي" : ""}), link to ${siteUrl}.
   - instagram: Captivating storytelling caption, aesthetic flow, relatable emojis, "الرابط في البايو", and 10-15 targeted hashtags.
   - linkedin: Thoughtful industry narrative, creator/productivity insights, conversational question, 3-5 hashtags.
   - facebook: Warm, engaging community post with clear call-to-action.
   - telegram: Richly formatted broadcast with markdown headlines, bullet points, and instant link.
   - tiktok: 30-second viral video concept with Hook (0-3s), Visual Scene notes, and Voiceover Script.

Return ONLY a valid JSON object matching:
{
  "twitter": { "content": "...", "hashtags": [...] },
  "instagram": { "content": "...", "hashtags": [...] },
  "linkedin": { "content": "...", "hashtags": [...] },
  "facebook": { "content": "...", "hashtags": [...] },
  "telegram": { "content": "...", "hashtags": [...] },
  "tiktok": { "content": "HOOK: ...\\nSCENE: ...\\nVOICEOVER: ...", "hashtags": [...] },
  "imagePrompt": "..."
}`;

        const fallbackUserText = isArabic
          ? (userPrompt || "حلل هذه الوسائط المرفوعة واكتب منشورات تسويقية حماسية وجذابة باللغة العربية الفصحى المعاصرة جاهزة للنشر فوراً لكافة منصات التواصل.")
          : (userPrompt || "Analyze this attached media and create a viral, high-converting social media campaign ready for publishing across all platforms.");

        const userMessageContent: any = referenceImageUrl
          ? [
              { type: "text", text: fallbackUserText },
              {
                type: "image_url",
                image_url: {
                  url: referenceImageUrl,
                  detail: "high",
                },
              },
            ]
          : (userPrompt || fallbackUserText);

        try {
          const apiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openAIApiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4o",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessageContent },
              ],
              response_format: { type: "json_object" },
              temperature: 0.7,
            }),
          });

          if (apiRes.ok) {
            const apiData = await apiRes.json();
            const rawContent = apiData.choices?.[0]?.message?.content;
            if (rawContent) {
              const parsed = JSON.parse(rawContent);
              imageGenPrompt = parsed.imagePrompt || "";
              const formatItem = (platform: any, fallbackName: string): PlatformContentItem => ({
                platform: fallbackName as any,
                content: parsed[platform]?.content || "",
                hashtags: Array.isArray(parsed[platform]?.hashtags) ? parsed[platform].hashtags : [],
                charCount: (parsed[platform]?.content || "").length,
              });

              platformsResult = {
                twitter: formatItem("twitter", "twitter"),
                instagram: formatItem("instagram", "instagram"),
                linkedin: formatItem("linkedin", "linkedin"),
                facebook: formatItem("facebook", "facebook"),
                telegram: formatItem("telegram", "telegram"),
                tiktok: formatItem("tiktok", "tiktok"),
              };
            }
          } else {
            console.warn("GPT-4o request failed, falling back to gpt-4o-mini");
            const fallbackRes = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${openAIApiKey}`,
              },
              body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: userMessageContent },
                ],
                response_format: { type: "json_object" },
                temperature: 0.7,
              }),
            });
            if (fallbackRes.ok) {
              const apiData = await fallbackRes.json();
              const rawContent = apiData.choices?.[0]?.message?.content;
              if (rawContent) {
                const parsed = JSON.parse(rawContent);
                imageGenPrompt = parsed.imagePrompt || "";
                const formatItem = (platform: any, fallbackName: string): PlatformContentItem => ({
                  platform: fallbackName as any,
                  content: parsed[platform]?.content || "",
                  hashtags: Array.isArray(parsed[platform]?.hashtags) ? parsed[platform].hashtags : [],
                  charCount: (parsed[platform]?.content || "").length,
                });

                platformsResult = {
                  twitter: formatItem("twitter", "twitter"),
                  instagram: formatItem("instagram", "instagram"),
                  linkedin: formatItem("linkedin", "linkedin"),
                  facebook: formatItem("facebook", "facebook"),
                  telegram: formatItem("telegram", "telegram"),
                  tiktok: formatItem("tiktok", "tiktok"),
                };
              }
            }
          }
        } catch (e) {
          console.error("Error executing OpenAI prompt generation:", e);
        }
      }

      // If OpenAI failed or not available, use rich high-converting templates
      if (!platformsResult.twitter || !platformsResult.twitter.content) {
        imageGenPrompt = `A hyper-realistic Hollywood cinematic still photograph depicting ${userPrompt || "creative AI visual"}, luxury dark aesthetic, dramatic volumetric lighting, shot on 70mm anamorphic lens, 8k resolution.`;

        if (targetLang === "ar") {
          platformsResult = {
            twitter: {
              platform: "twitter",
              content: `🔥 نقلة نوعية في الذكاء الاصطناعي الإبداعي مع سعد ستوديو! 🚀\n\n${(userPrompt || "إبداع بصري جديد").slice(0, 140)}\n\nجرّب الآن واستمتع بالسرعة والدقة الفائقة: ${siteUrl}`,
              hashtags: ["#سعد_ستوديو", "#ذكاء_اصطناعي", "#SaadStudio"],
              charCount: 180,
            },
            instagram: {
              platform: "instagram",
              content: `عالم جديد من الإبداع والإنتاجية مع سعد ستوديو ✨\n\n${userPrompt || "ابتكار متواصل في الذكاء الاصطناعي لتوليد الصور والفيديوهات الاحترافية."}\n\n👉 الرابط في البايو للتجربة المباشرة 🎬`,
              hashtags: ["#SaadStudio", "#AIArt", "#GenerativeAI", "#MidjourneyAlternative", "#Cinema4D", "#DigitalArt", "#ContentCreator", "#CGI"],
              charCount: 220,
            },
            linkedin: {
              platform: "linkedin",
              content: `يسعدنا مشاركة هذا الإنجاز الجديد من سعد ستوديو 🌟\n\n${userPrompt || "تطوير أدوات الذكاء الاصطناعي لمساعدة المبدعين وصناع الأفلام على الوصول لأعلى دقة بصرية."}\n\nما رأيك في مستقبل الإنتاج الإبداعي المؤتمت؟ شاركنا رأيك في التعليقات.\n\n🔗 ${siteUrl}`,
              hashtags: ["#SaadStudio", "#AI", "#Innovation", "#VideoEditing", "#Productivity"],
              charCount: 250,
            },
            facebook: {
              platform: "facebook",
              content: `نقلة جديدة في صناعة المحتوى البصري مع منصة سعد ستوديو! 🚀\n\n${userPrompt || "أحدث أدوات التوليد الإبداعي المتقدمة في متناول يدك الآن."}\n\nاكتشف المزيد وجرّب بنفسك: ${siteUrl}`,
              hashtags: ["#سعد_ستوديو", "#ذكاء_اصطناعي", "#SaadStudio"],
              charCount: 210,
            },
            telegram: {
              platform: "telegram",
              content: `🚀 **تحديث جديد ومميز من سعد ستوديو**\n\n${userPrompt || "أدوات التوليد السينمائي فائقة الدقة أصبحت متاحة الآن."}\n\n🔗 [دخول المنصة مباشرة](${siteUrl})`,
              hashtags: ["#سعد_ستوديو", "#تحديث"],
              charCount: 160,
            },
            tiktok: {
              platform: "tiktok",
              content: `🎬 **HOOK (0-3s):** كيف تسوي هذا الإبداع البصري في ثواني بس بالذكاء الاصطناعي؟\n\n🎥 **SCENE:** استعراض نتيجة التوليد الفائقة في سعد ستوديو.\n\n🗣️ **VOICEOVER:** هذا الموقع بيغير طريقة تصميمك ومونتاجك للأبد! ادخل سعد ستوديو وجرب الرابط بالبايو.`,
              hashtags: ["#SaadStudio", "#AIAnimation", "#تيك_توك", "#ذكاء_اصطناعي"],
              charCount: 260,
            },
          };
        } else {
          platformsResult = {
            twitter: {
              platform: "twitter",
              content: `Next-gen Creative AI is here with Saad Studio! 🚀\n\n${(userPrompt || "New Visual Creation").slice(0, 140)}\n\nExperience high-end cinematic generation: ${siteUrl}`,
              hashtags: ["#SaadStudio", "#AIArt", "#Creativity"],
              charCount: 160,
            },
            instagram: {
              platform: "instagram",
              content: `Pushing the boundaries of generative art with Saad Studio ✨\n\n${userPrompt || "Ultra-realistic visuals crafted in seconds."}\n\n👉 Link in bio to explore!`,
              hashtags: ["#SaadStudio", "#AIArt", "#DigitalArt", "#GenerativeAI", "#Cinematic"],
              charCount: 180,
            },
            linkedin: {
              platform: "linkedin",
              content: `Elevating creative studio workflows with next-generation AI at Saad Studio 🚀\n\n${userPrompt || "High fidelity image & video pipelines built for professional creators."}\n\nLearn more: ${siteUrl}`,
              hashtags: ["#SaadStudio", "#Innovation", "#AI", "#CreativeTech"],
              charCount: 220,
            },
            facebook: {
              platform: "facebook",
              content: `A brand new experience in creative AI! 🚀\n\n${userPrompt || "High-end visual generation"}\n\nTry Saad Studio today and share your thoughts below: ${siteUrl}`,
              hashtags: ["#SaadStudio", "#AI"],
              charCount: 160,
            },
            telegram: {
              platform: "telegram",
              content: `🚀 *New Update from Saad Studio*\n\n${userPrompt}\n\n🔗 *Try it now:* \n[Launch Studio](${siteUrl})`,
              hashtags: ["#SaadStudio", "#Update"],
              charCount: 130,
            },
            tiktok: {
              platform: "tiktok",
              content: `🎬 Short video script (15-30s):\n\n[Scene 1 (0-3s)]: A stunning, cinematic visual reveal.\n[Scene 2 (3-12s)]: Quick screen recording showing the prompt & model selection.\n[Scene 3 (12-25s)]: Showcase of high-resolution details.\n[Audio]: Try Saad Studio for free at the link in bio!`,
              hashtags: ["#fyp", "#viral", "#saadstudio", "#ai"],
              charCount: 220,
            },
          };
        }
      }

      // Media handling: Use uploaded media as final OR generate new visual
      let generatedImageUrl = "";
      let generatedVideoUrl = "";

      if (body.useUploadedMediaAsFinal) {
        generatedImageUrl = body.imageUrl || body.referenceImageUrl || "";
        generatedVideoUrl = body.videoUrl || body.referenceVideoUrl || "";
      } else if (!body.skipImageGen && mediaType === "image") {
        generatedImageUrl = await generateImageDirectly(imageGenPrompt || userPrompt, imageModel, aspectRatio, referenceImageUrl);
      }

      // Save to database as draft post
      const saved = await saveSocialPost({
        topicPrompt: userPrompt || (generatedVideoUrl ? "منشور فيديو سينمائي جاهز" : "منشور بصري جاهز"),
        language: targetLang as "ar" | "en",
        mediaType: generatedVideoUrl ? "video" : mediaType,
        aspectRatio: aspectRatio as any,
        imageUrl: generatedImageUrl || undefined,
        imageModel: imageModel as any,
        videoUrl: generatedVideoUrl || undefined,
        videoModel: videoModel as any,
        platforms: platformsResult,
        status: "draft",
      });

      return NextResponse.json({
        success: true,
        post: saved,
        imagePrompt: imageGenPrompt,
      });
    }

    // 2. GENERATE IMAGE ONLY (Google Nano Banana, Grok Imagine, Google Imagen 4)
    if (action === "generate_image") {
      const prompt = String(body.prompt || "").trim() || "Cinematic futuristic creative AI visual art masterpiece 8k";
      const model = String(body.model || "nano-banana-pro").toLowerCase();
      const aspectRatio = String(body.aspectRatio || "16:9");

      const imageUrl = await generateImageDirectly(prompt, model, aspectRatio);

      return NextResponse.json({ success: true, imageUrl, model, aspectRatio });
    }

    // 2.5 GENERATE VIDEO (Kling 3.0 Pro, Seedance 2.5 Turbo, Google Omni)
    if (action === "generate_video") {
      const prompt = String(body.prompt || "").trim();
      const model = String(body.model || "kling-video").toLowerCase();
      const aspectRatio = String(body.aspectRatio || "16:9");
      if (!prompt) return NextResponse.json({ error: "Prompt is required" }, { status: 400 });

      const waveSpeedKey = process.env.WAVESPEED_API_KEY;
      if (!waveSpeedKey) return NextResponse.json({ error: "WAVESPEED_API_KEY is missing" }, { status: 500 });

      let routeEndpoint = "kwaivgi/kling-v3.0-pro/text-to-video";
      if (model.includes("seedance")) {
        routeEndpoint = "bytedance/seedance-2.5/text-to-video-turbo";
      } else if (model.includes("omni") || model.includes("google")) {
        routeEndpoint = "google/gemini-omni-flash";
      } else if (model.includes("kling")) {
        routeEndpoint = "kwaivgi/kling-v3.0-pro/text-to-video";
      }

      const videoRes = await fetch(`https://api.wavespeed.ai/api/v3/${routeEndpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${waveSpeedKey}`,
        },
        body: JSON.stringify({
          prompt,
          aspect_ratio: aspectRatio === "4:5" ? "9:16" : aspectRatio,
          duration: 5,
        }),
      });

      let videoUrl = "";
      if (videoRes.ok) {
        const data = await videoRes.json();
        const taskId = data?.data?.id || data?.id;
        if (taskId) {
          for (let i = 0; i < 30; i++) {
            await new Promise((r) => setTimeout(r, 3000));
            const pollRes = await fetch(`https://api.wavespeed.ai/api/v3/predictions/${taskId}/result`, {
              headers: { Authorization: `Bearer ${waveSpeedKey}` },
            });
            if (pollRes.ok) {
              const pollData = await pollRes.json();
              const status = (pollData?.data?.status || pollData?.status || "").toLowerCase();
              if (status === "completed" || status === "succeeded" || status === "success") {
                const outputs = pollData?.data?.outputs || pollData?.outputs || [];
                if (outputs[0]) {
                  videoUrl = outputs[0];
                  break;
                }
              }
            }
          }
        }
      } else {
        // Fallback to cinematic video generator
        const fbRes = await fetch("https://api.wavespeed.ai/api/v3/wavespeed-ai/cinematic-video-generator", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${waveSpeedKey}` },
          body: JSON.stringify({ prompt, aspect_ratio: "16:9", duration: 5 }),
        });
        if (fbRes.ok) {
          const fbData = await fbRes.json();
          const taskId = fbData?.data?.id || fbData?.id;
          if (taskId) {
            for (let i = 0; i < 25; i++) {
              await new Promise((r) => setTimeout(r, 3000));
              const pollRes = await fetch(`https://api.wavespeed.ai/api/v3/predictions/${taskId}/result`, {
                headers: { Authorization: `Bearer ${waveSpeedKey}` },
              });
              if (pollRes.ok) {
                const pollData = await pollRes.json();
                const status = (pollData?.data?.status || pollData?.status || "").toLowerCase();
                if (status === "completed" || status === "succeeded" || status === "success") {
                  const outputs = pollData?.data?.outputs || pollData?.outputs || [];
                  if (outputs[0]) {
                    videoUrl = outputs[0];
                    break;
                  }
                }
              }
            }
          }
        }
      }

      return NextResponse.json({ success: true, videoUrl, model });
    }

    // 3. PUBLISH TO SOCIAL PLATFORMS (Telegram, Discord, Webhooks, Buffer)
    if (action === "publish") {
      const post: SocialMediaPostRecord = body.post;
      const targetPlatform = body.platform as string; // "telegram" | "discord" | "all"
      if (!post) return NextResponse.json({ error: "Post is required" }, { status: 400 });

      const config = await getSocialAccountsConfig();
      const results: Record<string, boolean> = {};

      // Buffer API Broadcast (Facebook, Instagram, X, LinkedIn) - Supports new Buffer GraphQL API & REST Fallback
      let lastBufferError = "";
      if (targetPlatform === "facebook" || targetPlatform === "buffer" || targetPlatform === "all" || targetPlatform === "twitter" || targetPlatform === "instagram" || targetPlatform === "linkedin") {
        if (config.bufferAccessToken) {
          try {
            const apiKey = config.bufferAccessToken.trim();
            const platformItem = (post.platforms as any)?.[targetPlatform] || post.platforms.facebook || post.platforms.twitter;
            const textToPublish = platformItem?.content
              ? `${platformItem.content}${platformItem.hashtags?.length ? `\n\n${platformItem.hashtags.join(" ")}` : ""}`
              : `${post.platforms.facebook?.content || post.platforms.twitter?.content || ""}`;
            const fullImageUrl = post.imageUrl
              ? (post.imageUrl.startsWith("http") ? post.imageUrl : `${SITE_URL}${post.imageUrl.startsWith("/") ? "" : "/"}${post.imageUrl}`)
              : "";

            // 1. Try modern Buffer GraphQL API (https://api.buffer.com)
            let graphqlSuccess = false;
            try {
              // Fetch user organizations and channels
              // 1. Fetch organization ID from account
              const orgsRes = await fetch("https://api.buffer.com", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                  query: `query GetOrganizations { account { organizations { id } } }`,
                }),
              });

              let channelIds: string[] = [];

              if (config.bufferProfileId && config.bufferProfileId.trim()) {
                channelIds.push(config.bufferProfileId.trim());
              } else if (orgsRes.ok) {
                const orgsData = await orgsRes.json().catch(() => ({}));
                const orgId = orgsData?.data?.account?.organizations?.[0]?.id;

                if (orgId) {
                  // 2. Fetch channels for this organization
                  const chRes = await fetch("https://api.buffer.com", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                      query: `query GetChannels($input: ChannelsInput!) {
                        channels(input: $input) {
                          id
                          name
                          displayName
                          service
                        }
                      }`,
                      variables: { input: { organizationId: orgId } },
                    }),
                  });

                  if (chRes.ok) {
                    const chData = await chRes.json().catch(() => ({}));
                    const channels = chData?.data?.channels || [];
                    for (const ch of channels) {
                      if (targetPlatform === "facebook") {
                        if (ch.service === "facebook" || ch.service === "facebookPage" || ch.service === "facebook_page") {
                          channelIds.push(ch.id);
                        }
                      } else {
                        channelIds.push(ch.id);
                      }
                    }

                    if (channelIds.length === 0 && channels.length > 0) {
                      channelIds = channels.map((c: any) => c.id);
                    }
                  }
                }
              }

              // Fallback to active Saad Studio channel if not discovered
              if (channelIds.length === 0) {
                channelIds.push("6e070a5cccaf649a67e102eb");
              }

              if (channelIds.length > 0) {
                const createPostMutation = `
                  mutation CreatePost($input: CreatePostInput!) {
                    createPost(input: $input) {
                      ... on PostActionSuccess {
                        post {
                          id
                          text
                          dueAt
                        }
                      }
                      ... on MutationError {
                        message
                      }
                    }
                  }
                `;

                for (const chId of channelIds) {
                  const postInput: any = {
                    channelId: chId,
                    text: textToPublish,
                    schedulingType: "automatic",
                    mode: "addToQueue",
                  };

                  if (fullImageUrl) {
                    postInput.assets = [{ image: { url: fullImageUrl } }];
                  }

                  const publishRes = await fetch("https://api.buffer.com", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                      query: createPostMutation,
                      variables: { input: postInput },
                    }),
                  });

                  const pubData = await publishRes.json().catch(() => ({}));
                  if (pubData?.data?.createPost?.post?.id) {
                    graphqlSuccess = true;
                  } else {
                    const errMsg = pubData?.data?.createPost?.message || pubData?.errors?.[0]?.message;
                    if (errMsg) lastBufferError = errMsg;
                    console.error("[Buffer GraphQL Publish Error]:", errMsg, pubData);
                  }
                }
              } else {
                lastBufferError = "لم يتم العثور على أي قنوات مربوطة في حساب Buffer الخاص بك";
              }
            } catch (gqlErr: any) {
              console.warn("Buffer GraphQL failed, trying REST fallback:", gqlErr);
              lastBufferError = gqlErr?.message || "GraphQL Connection Error";
            }

            // 2. If GraphQL succeeded, record result
            if (graphqlSuccess) {
              results.buffer = true;
              results.facebook = true;
            } else {
              // REST fallback (api.bufferapp.com/1/...)
              let targetProfileIds: string[] = [];
              if (config.bufferProfileId) {
                targetProfileIds = [config.bufferProfileId];
              } else {
                const profRes = await fetch(`https://api.bufferapp.com/1/profiles.json?access_token=${encodeURIComponent(apiKey)}`);
                if (profRes.ok) {
                  const profiles = await profRes.json();
                  if (Array.isArray(profiles)) {
                    if (targetPlatform === "facebook") {
                      const fbProfs = profiles.filter((p: any) => p.service === "facebook" || p.service_type === "page");
                      targetProfileIds = fbProfs.length ? fbProfs.map((p: any) => p.id) : profiles.map((p: any) => p.id);
                    } else {
                      targetProfileIds = profiles.map((p: any) => p.id);
                    }
                  }
                }
              }

              if (targetProfileIds.length > 0) {
                const params = new URLSearchParams();
                params.append("access_token", apiKey);
                params.append("text", textToPublish);
                params.append("now", "true");
                targetProfileIds.forEach((pid) => params.append("profile_ids[]", pid));

                if (fullImageUrl) {
                  params.append("media[photo]", fullImageUrl);
                }

                const bufferRes = await fetch("https://api.bufferapp.com/1/updates/create.json", {
                  method: "POST",
                  headers: { "Content-Type": "application/x-www-form-urlencoded" },
                  body: params.toString(),
                });

                const restJson = await bufferRes.json().catch(() => ({}));
                results.buffer = Boolean(bufferRes.ok && restJson?.success !== false);
                results.facebook = results.buffer;
                if (!results.buffer) {
                  lastBufferError = restJson?.message || `Buffer REST Error (${bufferRes.status})`;
                }
              } else if (!lastBufferError) {
                lastBufferError = "لم يتم العثور على بروفايل أو قناة في حساب Buffer";
              }
            }
          } catch (e: any) {
            console.error("Buffer publish error:", e);
            results.buffer = false;
            results.facebook = false;
            lastBufferError = e?.message || "Internal Buffer Handler Error";
          }
        } else {
          results.buffer = false;
          results.facebook = false;
          lastBufferError = "لم يتم ضبط Buffer Access Token في تبويب الإعدادات";
        }
      }

      // Telegram Broadcast
      if (targetPlatform === "telegram" || targetPlatform === "all") {
        if (config.telegramBotToken && config.telegramChatId) {
          try {
            const teleText = `${post.platforms.telegram?.content || post.platforms.twitter?.content || ""}\n\n${(post.platforms.telegram?.hashtags || []).join(" ")}`;
            const teleUrl = post.imageUrl
              ? `https://api.telegram.org/bot${config.telegramBotToken}/sendPhoto`
              : `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;

            const payload = post.imageUrl
              ? { chat_id: config.telegramChatId, photo: post.imageUrl, caption: teleText, parse_mode: "Markdown" }
              : { chat_id: config.telegramChatId, text: teleText, parse_mode: "Markdown" };

            const teleRes = await fetch(teleUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            results.telegram = teleRes.ok;
          } catch {
            results.telegram = false;
          }
        }
      }

      // Discord Webhook
      if (targetPlatform === "discord" || targetPlatform === "all") {
        if (config.discordWebhookUrl) {
          try {
            const discordText = `**📢 Saad Studio Announcement**\n\n${post.platforms.twitter?.content || post.platforms.linkedin?.content || ""}\n\n${(post.platforms.twitter?.hashtags || []).join(" ")}`;
            const discPayload: any = { content: discordText };
            if (post.imageUrl) {
              discPayload.embeds = [{ image: { url: post.imageUrl } }];
            }
            const discRes = await fetch(config.discordWebhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(discPayload),
            });
            results.discord = discRes.ok;
          } catch {
            results.discord = false;
          }
        }
      }

      // Custom Webhook (Make / Zapier / Ayrshare)
      if (config.customWebhookUrl) {
        try {
          const whRes = await fetch(config.customWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ post, platform: targetPlatform }),
          });
          results.webhook = whRes.ok;
        } catch {
          results.webhook = false;
        }
      }

      const hasSuccess = Object.values(results).some(Boolean);

      if (hasSuccess) {
        // Update post status to published
        await saveSocialPost({
          ...post,
          status: "published",
          publishedAt: new Date().toISOString(),
        });
        return NextResponse.json({ success: true, results });
      } else {
        const errorDetail = lastBufferError
          ? `فشل النشر عبر Buffer: ${lastBufferError}`
          : "فشل النشر: يرجى التحقق من إعدادات المفاتيح والقنوات المستهدفة";
        return NextResponse.json({ success: false, error: errorDetail, results }, { status: 400 });
      }
    }

    // 4. SAVE SOCIAL CONFIG
    if (action === "save_config") {
      const config = body.config;
      if (!config) return NextResponse.json({ error: "Missing config" }, { status: 400 });
      await saveSocialAccountsConfig(config);
      return NextResponse.json({ success: true });
    }

    // 5. SAVE POST RECORD
    if (action === "save_post") {
      const post = body.post;
      if (!post) return NextResponse.json({ error: "Missing post" }, { status: 400 });
      const saved = await saveSocialPost(post);
      return NextResponse.json({ success: true, post: saved });
    }

    // 6. GENERATE VIRAL STORYBOARD SHOWCASE
    if (action === "generate_storyboard") {
      const userPrompt = String(body.prompt || "").trim() || "Day-to-night transformation of a 3D animator working at his desk in Saad Studio";
      const targetLang = (body.language || "ar") === "en" ? "en" : "ar";
      const selectedTheme: StoryboardThemeType = body.theme || "cyberpunk";
      const selectedTemplate: StoryboardTemplateType = body.template || "day-night";
      const outputMode = body.outputMode || "images_only";
      const imageModel = String(body.imageModel || "nano-banana-pro");
      const videoModel = String(body.videoModel || "kling-3.0/video");

      const imageModelBadge = imageModel === "grok-imagine" ? "Grok Imagine 2.0" : imageModel === "gpt-image-2" ? "GPT-Image-2" : "Google Nano Banana Pro";
      const videoModelBadge = videoModel.includes("kling") ? "Kling 3.0 Pro" : videoModel.includes("seedance") ? "Seedance 2 Turbo" : "Omni Flash";

      const openAIApiKey = process.env.OPENAI_API_KEY;
      let generatedBlueprint: any = null;

      if (openAIApiKey && openAIApiKey !== "sk-placeholder") {
        const systemPrompt = `You are the Master Creative Director & Storyboard Lead for "Saad Studio".
Language: ${targetLang === "ar" ? "Arabic" : "English"}.
Theme: ${selectedTheme}.
Template Type: ${selectedTemplate}.

CRITICAL RULE: STRICT VISUAL COHERENCE & SEQUENTIAL CONTINUITY.
All generated prompts (Hero, Frame 1, Frame 2, Character, Environment) MUST share the EXACT SAME character identity (clothing, face, hair, age), artistic style, and location details. They must tell ONE coherent visual story without random unrelated elements!

Template Specific Guidelines:
- If template is "day-night":
  * Define ONE specific character and ONE specific workstation/room.
  * frame1Prompt: The EXACT character in the EXACT room during morning daylight (golden sunlight, natural morning).
  * frame2Prompt: The EXACT SAME character in the EXACT SAME room at midnight (neon glow, deep shadows, cyber mood).
  * heroPrompt: Cinematic wide angle showing the full workstation setup.
  * characterPrompt: Portrait character sheet of this exact character.
  * environmentPrompt: The empty room workstation backdrop without the character.

- If template is "car-call":
  * Define ONE specific driver/presenter inside a luxury modern vehicle.
  * frame1Prompt: Inside the car, the driver holding a smartphone having an interactive video call.
  * frame2Prompt: Close-up on the smartphone screen glowing with clean chroma green (#00FF00) interface.
  * heroPrompt: Cinematic exterior/interior shot of the car driving through night city rain.
  * characterPrompt: Portrait of this exact driver.
  * environmentPrompt: The rainy night city street bokeh seen through the car windows.

- If template is "character-3d":
  * Define ONE specific 3D character design.
  * frame1Prompt: 3D textured beauty render of the character in action pose.
  * frame2Prompt: 3D exploded view, wireframe, and clay structure breakdown of this same character model.
  * heroPrompt: Cinematic 3D turntable hero shot of the character in studio lighting.
  * characterPrompt: Character face and outfit detail sheet.
  * environmentPrompt: 3D studio lighting pedestal and backdrop stage.

- If template is "workflow-battle":
  * Define ONE specific visual concept.
  * frame1Prompt: Ultra-sharp 8K master photographic still generated by Nano Banana.
  * frame2Prompt: Dynamic motion still generated by Grok Imagine / Kling with light trails.
  * heroPrompt: Split composition comparing high-fidelity detail.
  * characterPrompt: Macro close-up on texture/eyes.
  * environmentPrompt: High-tech AI workstation control room.

Return ONLY a valid JSON object matching:
{
  "title": "Short catchy title in Arabic/English",
  "heroPrompt": "Detailed English prompt for Hero Key Visual",
  "frame1Label": "Label for Frame 1",
  "frame1Prompt": "Detailed English prompt for Frame 1",
  "frame2Label": "Label for Frame 2",
  "frame2Prompt": "Detailed English prompt for Frame 2",
  "characterLabel": "Character Asset Label",
  "characterPrompt": "Detailed English prompt for Character",
  "environmentLabel": "Environment Asset Label",
  "environmentPrompt": "Detailed English prompt for Environment",
  "camera": "e.g. Locked Static 35mm Anamorphic f/1.8",
  "lighting": "e.g. Volumetric morning sunlight shifting to cyan/magenta neon",
  "composition": "e.g. Centered rule of thirds with deep cinematic layers",
  "fullBlueprintPrompt": "Clean copyable blueprint prompt text without meta headers",
  "videoPrompt": "Cinematic motion prompt for video generation",
  "captionText": "Engaging viral caption in ${targetLang === "ar" ? "Arabic" : "English"}",
  "hashtags": ["#SaadStudio", "#AIArt", "#Trending"]
}`;

        try {
          const apiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openAIApiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Concept: ${userPrompt}` },
              ],
              response_format: { type: "json_object" },
              temperature: 0.7,
            }),
          });

          if (apiRes.ok) {
            const apiData = await apiRes.json();
            const rawContent = apiData.choices?.[0]?.message?.content;
            if (rawContent) {
              generatedBlueprint = JSON.parse(rawContent);
            }
          }
        } catch (e) {
          console.warn("Storyboard OpenAI generation failed:", e);
        }
      }

      // Default coherent fallback blueprint if AI was unavailable
      if (!generatedBlueprint) {
        generatedBlueprint = {
          title: targetLang === "ar" ? "تحول سينمائي من النهار إلى الليل" : "Cinematic Day-to-Night Transformation",
          heroPrompt: `Cinematic wide angle shot of a 3D digital creator sitting at modern wooden workstation desk in Saad Studio, dual glowing monitors, atmospheric lighting, 8k resolution.`,
          frame1Label: targetLang === "ar" ? "كادر النهار (Daylight)" : "Frame 1: Morning Daylight",
          frame1Prompt: `Young tech creator sitting at modern workstation typing on laptop, natural bright morning sunlight pouring through window, warm cozy interior, 8k photorealistic.`,
          frame2Label: targetLang === "ar" ? "كادر الليل (Midnight Cyber)" : "Frame 2: Cyber Night Glow",
          frame2Prompt: `Same young tech creator sitting at exact same workstation typing on laptop at midnight, glowing neon cyan and purple ambient light, dark moody cinematic shadows, 8k render.`,
          characterLabel: targetLang === "ar" ? "الشخصية (Creator)" : "Character Model",
          characterPrompt: `Portrait of the young tech creator in casual dark hoodie, clean neutral background, studio lighting, highly detailed face and textures.`,
          environmentLabel: targetLang === "ar" ? "الغرفة والبيئة (Workstation)" : "Room Workstation",
          environmentPrompt: `Empty modern workstation desk setup with glowing dual monitors, bookshelf, indoor plants, moody studio lighting plate.`,
          camera: "Locked Static Camera, 35mm Anamorphic, f/1.8",
          lighting: "Volumetric morning sunlight transitioning to cyber neon ambient glows",
          composition: "Rule of thirds, centered workstation desk with depth of field",
          fullBlueprintPrompt: `Locked static camera, same workstation scene. Creator working at desk continuously on laptop. Frame 1: morning daylight through window. Frame 2: nighttime lighting with warm neon glow. Seamless loop aesthetic, 8k render.`,
          videoPrompt: `Cinematic 3D animation, locked static camera, same bedroom workstation. Creator typing on glowing laptop. Fast smooth day to night transition with ambient lighting shifting from golden sunlight to neon cyberpunk glow, 8k render.`,
          captionText: targetLang === "ar" 
            ? "كيف تصنع تحولاً بصرياً كاملاً من النهار إلى الليل بنفس الشخصية والمشهد؟ 🚀 تم التوليد بنماذج سعد ستوديو السينمائية بدقة فائقة!"
            : "How to create a seamless day-to-night AI transformation with 100% subject consistency! 🚀 Created with Saad Studio AI.",
          hashtags: ["#SaadStudio", "#AIArt", "#CinematicAI", "#DayToNight", "#ReelsViral"],
        };
      }

      // Generate all 5 coherent images in parallel using the USER'S CHOSEN IMAGE MODEL!
      let heroUrl = "";
      let frame1Url = "";
      let frame2Url = "";
      let charUrl = "";
      let envUrl = "";

      try {
        const [hero, f1, f2, ch, env] = await Promise.all([
          generateImageDirectly(generatedBlueprint.heroPrompt || generatedBlueprint.fullBlueprintPrompt, imageModel, "16:9"),
          generateImageDirectly(generatedBlueprint.frame1Prompt, imageModel, "16:9"),
          generateImageDirectly(generatedBlueprint.frame2Prompt, imageModel, "16:9"),
          generateImageDirectly(generatedBlueprint.characterPrompt, imageModel, "16:9"),
          generateImageDirectly(generatedBlueprint.environmentPrompt, imageModel, "16:9"),
        ]);
        heroUrl = hero;
        frame1Url = f1;
        frame2Url = f2;
        charUrl = ch;
        envUrl = env;
      } catch (e) {
        console.warn("Storyboard images generation error:", e);
      }

      const newStoryboardRecord: Omit<StoryboardShowcaseRecord, "id" | "createdAt" | "updatedAt"> = {
        title: generatedBlueprint.title,
        theme: selectedTheme,
        templateType: selectedTemplate,
        outputMode,
        conceptPrompt: userPrompt,
        language: targetLang,
        heroImage: {
          url: heroUrl,
          label: targetLang === "ar" ? "المشهد الرئيسي (Key Visual)" : "Key Visual Plate",
          modelBadge: imageModelBadge,
          prompt: generatedBlueprint.heroPrompt || generatedBlueprint.fullBlueprintPrompt,
        },
        video: {
          url: "",
          model: videoModel,
          modelBadge: videoModelBadge,
          prompt: generatedBlueprint.videoPrompt,
        },
        referenceFrames: {
          frame1: {
            url: frame1Url,
            label: generatedBlueprint.frame1Label,
            modelBadge: imageModelBadge,
            prompt: generatedBlueprint.frame1Prompt,
          },
          frame2: {
            url: frame2Url,
            label: generatedBlueprint.frame2Label,
            modelBadge: imageModelBadge,
            prompt: generatedBlueprint.frame2Prompt,
          },
        },
        promptBlueprint: {
          camera: generatedBlueprint.camera,
          lighting: generatedBlueprint.lighting,
          composition: generatedBlueprint.composition,
          fullText: generatedBlueprint.fullBlueprintPrompt,
        },
        assets: {
          character: {
            url: charUrl,
            label: generatedBlueprint.characterLabel,
            prompt: generatedBlueprint.characterPrompt,
          },
          environment: {
            url: envUrl,
            label: generatedBlueprint.environmentLabel,
            prompt: generatedBlueprint.environmentPrompt,
          },
        },
        captionText: generatedBlueprint.captionText,
        hashtags: generatedBlueprint.hashtags || [],
      };

      const savedRecord = await saveStoryboard(newStoryboardRecord);
      return NextResponse.json({ success: true, storyboard: savedRecord });
    }

    // 7. SAVE STORYBOARD RECORD
    if (action === "save_storyboard") {
      const storyboard = body.storyboard;
      if (!storyboard) return NextResponse.json({ error: "Missing storyboard" }, { status: 400 });
      const saved = await saveStoryboard(storyboard);
      return NextResponse.json({ success: true, storyboard: saved });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error in social media agent" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const id = (url.searchParams.get("id") || "").trim();
    const type = (url.searchParams.get("type") || "post").trim();
    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    if (type === "storyboard" || id.startsWith("sb_")) {
      const success = await deleteStoryboard(id);
      return NextResponse.json({ success });
    }

    const success = await deleteSocialPost(id);
    return NextResponse.json({ success });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete item" },
      { status: 500 }
    );
  }
}
