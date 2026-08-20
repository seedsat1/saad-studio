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

async function generateImageDirectly(prompt: string, modelName: string, aspectRatio: string = "16:9"): Promise<string> {
  const model = (modelName || "nano-banana-pro").toLowerCase();
  
  // Cinematic Hollywood prompt enhancement to eliminate cheesy 3D renders and gibberish text
  const cleanPrompt = prompt.trim().replace(/^Prompt:\s*/i, "");
  const cinematicMasterPrompt = `Award-winning Hollywood cinematic still, hyper-realistic photography, 8k resolution, shot on ARRI Alexa LF 70mm, Cooke anamorphic lens, natural film grain, photorealistic skin and material textures, moody volumetric atmospheric lighting, luxury cinematic aesthetic, sharp focus: ${cleanPrompt}. (Masterpiece, photorealism, raw photo, highly detailed, perfect composition).`;

  // 1. WaveSpeed Grok Imagine 2.0 (x-ai/grok-imagine-image-v2.0/text-to-image)
  if (model.includes("grok")) {
    const wavespeedKey = process.env.WAVESPEED_API_KEY;
    if (wavespeedKey) {
      try {
        const submitRes = await fetch("https://api.wavespeed.ai/api/v3/x-ai/grok-imagine-image-v2.0/text-to-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${wavespeedKey}`,
          },
          body: JSON.stringify({
            prompt: cinematicMasterPrompt,
            aspect_ratio: aspectRatio || "16:9",
          }),
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

  // 3. Google Nano Banana Pro (Primary Default)
  try {
    const result = await googleGenerateImage({
      modelId: "nano-banana-pro",
      prompt: cinematicMasterPrompt,
      aspectRatio: aspectRatio as any,
      resolution: "2K",
      numImages: 1,
      imageUrls: [],
    });
    if (result?.urls?.[0]) return result.urls[0];
  } catch (e) {
    console.warn("Google Nano Banana generation error:", e);
  }

  return "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80";
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

      if (!userPrompt) {
        return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
      }

      const openAIApiKey = process.env.OPENAI_API_KEY;
      let platformsResult: SocialMediaPostRecord["platforms"] = {} as any;
      let imageGenPrompt = "";

      if (openAIApiKey && openAIApiKey !== "sk-placeholder") {
        const systemPrompt = `You are the Lead Social Media Growth Strategist and Award-Winning Creative Director for "Saad Studio" (سعد ستوديو - the premier AI creative studio).
Target Language: ${targetLang === "ar" ? "ARABIC (العربية الفصحى العصرية الجذابة والاحترافية)" : "ENGLISH"}.

Generate platform-optimized social media posts tailored to each network:
1. twitter: Maximum 280 characters, compelling hook, strong value proposition, 2-3 hashtags, CTA link to ${siteUrl}.
2. instagram: Luxurious engaging aesthetic caption, storytelling tone, emojis, "Link in bio", and 12-15 viral targeted hashtags.
3. linkedin: Authoritative, executive industry tone detailing workflow productivity gains for creators/studios, discussion question, 3-5 hashtags.
4. facebook: Engaging community post with friendly tone and direct CTA link.
5. telegram: Richly formatted broadcast with markdown style, emojis, bullet points, and instant join link.
6. tiktok: 30-second viral video script with Hook (0-3s), Visual Scene notes, and Voiceover Narration script.

IMPORTANT FOR "imagePrompt":
Create an English description for a Hollywood-grade, photorealistic cinematic masterpiece photograph.
- Visual style: Real photography, shot on ARRI Alexa LF 70mm with anamorphic prime lens, luxury studio lighting, dramatic rim light, shallow depth of field, authentic textures.
- Theme: A breathtaking cinematic scene representing: "${userPrompt}".
- Strict rules: NO cartoon, NO anime, NO childish 3D CGI toy render, NO fake gibberish text inside the picture.

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
              { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
          }),
        });

        if (apiRes.ok) {
          const apiData = await apiRes.json();
          const rawContent = apiData.choices?.[0]?.message?.content;
          if (rawContent) {
            try {
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
            } catch (e) {
              console.error("JSON parse error in social agent:", e);
            }
          }
        }
      }

      // If OpenAI failed or not available, use rich high-converting templates
      if (!platformsResult.twitter || !platformsResult.twitter.content) {
        imageGenPrompt = `A hyper-realistic Hollywood cinematic still photograph depicting ${userPrompt}, luxury dark aesthetic, dramatic volumetric lighting, shot on 70mm anamorphic lens, 8k resolution.`;

        if (targetLang === "ar") {
          platformsResult = {
            twitter: {
              platform: "twitter",
              content: `🔥 نقلة نوعية في الذكاء الاصطناعي الإبداعي مع سعد ستوديو! 🚀\n\n${userPrompt.slice(0, 140)}\n\nجرّب الآن واستمتع بالسرعة والدقة الفائقة: ${siteUrl}`,
              hashtags: ["#سعد_ستوديو", "#ذكاء_اصطناعي", "#SaadStudio"],
              charCount: 180,
            },
            instagram: {
              platform: "instagram",
              content: `✨ صمم أعمالك السينمائية والفنية بالذكاء الاصطناعي كما لم ترها من قبل!\n\n${userPrompt}\n\n💡 اكتشف الإمكانيات الإبداعية الكاملة الآن.\n🔗 الرابط في البايو للتجربة المباشرة!`,
              hashtags: ["#سعد_ستوديو", "#تصميم_بالذكاء_الاصطناعي", "#إبداع", "#SaadStudio", "#AIArt"],
              charCount: 210,
            },
            linkedin: {
              platform: "linkedin",
              content: `يسعدنا الإعلان عن ميزات الذكاء الاصطناعي المتقدمة في منصة Saad Studio لتمكين صناع المحتوى والشركات.\n\n📌 أبرز النقاط:\n• ${userPrompt}\n• دقة سينمائية فائقة ومعالجة لحظية.\n• تكامل مباشر مع كافة المنصات.\n\nاكتشف المزيد عبر: ${siteUrl}`,
              hashtags: ["#SaadStudio", "#ArtificialIntelligence", "#Innovation"],
              charCount: 260,
            },
            facebook: {
              platform: "facebook",
              content: `تجربة جديدة كلياً في عالم الذكاء الاصطناعي الإبداعي! 🚀\n\n${userPrompt}\n\nجرّب منصة سعد ستوديو اليوم وشاركنا رأيك في التعليقات: ${siteUrl}`,
              hashtags: ["#سعد_ستوديو", "#ذكاء_اصطناعي", "#SaadStudio"],
              charCount: 170,
            },
            telegram: {
              platform: "telegram",
              content: `🚀 *تحديث جديد من سعد ستوديو*\n\n${userPrompt}\n\n🔗 *جرب الآن عبر الرابط:* \n[دخول المنصة](${siteUrl})`,
              hashtags: ["#سعد_ستوديو", "#تحديث"],
              charCount: 140,
            },
            tiktok: {
              platform: "tiktok",
              content: `🎬 سيناريو فيديو قصير (15-30s):\n\n[المشهد 1 (0-3s)]: لقطة خاطفة ومبهرة للنتيجة السينمائية.\n[المشهد 2 (3-12s)]: تصوير شاشة سريع لاختيار النموذج وكتابة البرومبت.\n[المشهد 3 (12-25s)]: استعراض تفاصيل الدقة والإضاءة.\n[الصوت]: جرب سعد ستوديو مجاناً الآن عبر الرابط في البايو!`,
              hashtags: ["#fyp", "#viral", "#saadstudio", "#ai"],
              charCount: 240,
            },
          };
        } else {
          platformsResult = {
            twitter: {
              platform: "twitter",
              content: `🔥 Next-level creative AI with Saad Studio! 🚀\n\n${userPrompt.slice(0, 140)}\n\nTry it now: ${siteUrl}`,
              hashtags: ["#SaadStudio", "#AI", "#GenAI"],
              charCount: 160,
            },
            instagram: {
              platform: "instagram",
              content: `✨ Design cinematic visuals with AI like never before.\n\n${userPrompt}\n\n💡 Discover the full creative potential.\n🔗 Link in bio to try it now!`,
              hashtags: ["#SaadStudio", "#AIArt", "#Creativity"],
              charCount: 200,
            },
            linkedin: {
              platform: "linkedin",
              content: `We are excited to unveil advanced AI capabilities on Saad Studio, empowering creators and enterprises.\n\nHighlights:\n• ${userPrompt}\n• Cinematic precision & real-time generation.\n• Seamless platform integration.\n\nExplore more at ${siteUrl}`,
              hashtags: ["#SaadStudio", "#ArtificialIntelligence", "#Innovation"],
              charCount: 260,
            },
            facebook: {
              platform: "facebook",
              content: `A brand new experience in creative AI! 🚀\n\n${userPrompt}\n\nTry Saad Studio today and share your thoughts below: ${siteUrl}`,
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

      // Automatically generate visual in 1 step (Image or Video)
      let generatedImageUrl = "";
      let generatedVideoUrl = "";

      if (mediaType === "image") {
        generatedImageUrl = await generateImageDirectly(imageGenPrompt || userPrompt, imageModel, aspectRatio);
      }

      // Save to database as draft post
      const saved = await saveSocialPost({
        topicPrompt: userPrompt,
        language: targetLang as "ar" | "en",
        mediaType,
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
      if (targetPlatform === "facebook" || targetPlatform === "buffer" || targetPlatform === "all") {
        if (config.bufferAccessToken) {
          try {
            const apiKey = config.bufferAccessToken.trim();
            const textToPublish = `${post.platforms.facebook?.content || post.platforms.twitter?.content || ""}\n\n${(post.platforms.facebook?.hashtags || []).join(" ")}`;

            // 1. Try modern Buffer GraphQL API (https://api.buffer.com)
            let graphqlSuccess = false;
            try {
              // Fetch user organizations and channels
              const gqlChannelsQuery = {
                query: `
                  query GetChannels {
                    account {
                      id
                      organizations {
                        id
                        channels {
                          id
                          name
                          service
                        }
                      }
                    }
                  }
                `,
              };

              const gqlRes = await fetch("https://api.buffer.com", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify(gqlChannelsQuery),
              });

              if (gqlRes.ok) {
                const gqlData = await gqlRes.json();
                const orgs = gqlData?.data?.account?.organizations || [];
                let channelIds: string[] = [];

                for (const org of orgs) {
                  const channels = org?.channels || [];
                  for (const ch of channels) {
                    if (targetPlatform === "facebook") {
                      if (ch.service === "facebook" || ch.service === "facebookPage") {
                        channelIds.push(ch.id);
                      }
                    } else {
                      channelIds.push(ch.id);
                    }
                  }
                }

                // If no specific channel matched, use all channels
                if (channelIds.length === 0 && orgs[0]?.channels?.length) {
                  channelIds = orgs[0].channels.map((c: any) => c.id);
                }

                if (channelIds.length > 0) {
                  for (const chId of channelIds) {
                    const postInput: any = {
                      channelId: chId,
                      text: textToPublish,
                      schedulingType: "NOW",
                    };

                    if (post.videoUrl && post.mediaType === "video") {
                      postInput.media = {
                        videos: [{ url: post.videoUrl }],
                      };
                    } else if (post.imageUrl) {
                      postInput.media = {
                        images: [{ url: post.imageUrl }],
                      };
                    }

                    const createPostMutation = {
                      query: `
                        mutation CreatePost($input: CreatePostInput!) {
                          createPost(input: $input) {
                            post {
                              id
                              status
                            }
                          }
                        }
                      `,
                      variables: { input: postInput },
                    };

                    const publishRes = await fetch("https://api.buffer.com", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${apiKey}`,
                      },
                      body: JSON.stringify(createPostMutation),
                    });

                    if (publishRes.ok) {
                      graphqlSuccess = true;
                    }
                  }
                }
              }
            } catch (gqlErr) {
              console.warn("Buffer GraphQL failed, trying REST fallback:", gqlErr);
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

                if (post.imageUrl) {
                  params.append("media[photo]", post.imageUrl);
                }

                const bufferRes = await fetch("https://api.bufferapp.com/1/updates/create.json", {
                  method: "POST",
                  headers: { "Content-Type": "application/x-www-form-urlencoded" },
                  body: params.toString(),
                });

                results.buffer = bufferRes.ok;
                results.facebook = bufferRes.ok;
              }
            }
          } catch (e) {
            console.error("Buffer publish error:", e);
            results.buffer = false;
            results.facebook = false;
          }
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

      // Update post status to published
      await saveSocialPost({
        ...post,
        status: "published",
        publishedAt: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, results });
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
