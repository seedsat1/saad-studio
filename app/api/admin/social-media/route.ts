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

  // 1. xAI Grok Imagine 2.0
  if (model.includes("grok")) {
    const xaiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
    if (xaiKey) {
      try {
        const res = await fetch("https://api.x.ai/v1/images/generations", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${xaiKey}` },
          body: JSON.stringify({ model: "grok-2-image", prompt, aspect_ratio: aspectRatio }),
        });
        if (res.ok) {
          const data = await res.json();
          const url = data?.data?.[0]?.url;
          if (url) return url;
        }
      } catch (e) {
        console.warn("xAI Grok generation failed, falling back to Google Nano Banana:", e);
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
          body: JSON.stringify({ model: "dall-e-2", prompt, size: "1024x1024", n: 1 }),
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
      prompt,
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

    // 1. GENERATE SOCIAL POSTS WITH AI
    if (action === "generate") {
      const userPrompt = String(body.prompt || "").trim();
      const targetLang = (body.language || "ar") === "en" ? "en" : "ar";
      const imageModel = String(body.imageModel || "nano-banana-pro");

      if (!userPrompt) {
        return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
      }

      const openAIApiKey = process.env.OPENAI_API_KEY;
      let platformsResult: SocialMediaPostRecord["platforms"] = {} as any;
      let imageGenPrompt = "";

      if (openAIApiKey && openAIApiKey !== "sk-placeholder") {
        const systemPrompt = `You are the Lead Social Media Growth Strategist for "Saad Studio".
Target Language: ${targetLang === "ar" ? "ARABIC" : "ENGLISH"}.

Generate platform-optimized social media posts.
Return ONLY a valid JSON object matching:
{
  "twitter": { "content": "...", "hashtags": [...] },
  "instagram": { "content": "...", "hashtags": [...] },
  "linkedin": { "content": "...", "hashtags": [...] },
  "facebook": { "content": "...", "hashtags": [...] },
  "telegram": { "content": "...", "hashtags": [...] },
  "tiktok": { "content": "...", "hashtags": [...] },
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
        imageGenPrompt = `A stunning photorealistic 8k cinematic visual depicting ${userPrompt}, glowing ambient studio lighting, volumetric atmosphere, masterpiece octane render.`;

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

      // Generate Image using Google Nano Banana / Imagen / Grok
      const generatedImageUrl = await generateImageDirectly(imageGenPrompt || userPrompt, imageModel, "16:9");

      // Save to database as draft post
      const saved = await saveSocialPost({
        topicPrompt: userPrompt,
        language: targetLang as "ar" | "en",
        imageUrl: generatedImageUrl,
        imageModel: imageModel as any,
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

      const openAIApiKey = process.env.OPENAI_API_KEY;
      let generatedBlueprint: any = null;

      if (openAIApiKey && openAIApiKey !== "sk-placeholder") {
        const systemPrompt = `You are the Master Creative Director & Viral Storyboard Architect for "Saad Studio".
Language: ${targetLang === "ar" ? "Arabic" : "English"}.
Theme: ${selectedTheme}.

Convert the concept into a high-converting viral 9:16 Storyboard Breakdown with:
1. title: Catchy title (e.g. "Kling 3.0 + Nano Banana Day-to-Night Workflow").
2. videoModel: "kling-video" or "google-omni-veo"
3. videoModelBadge: "Kling 3.0 Pro" or "Google Omni Veo 2"
4. videoPrompt: Highly descriptive English video motion prompt.
5. frame1Label: Label for first reference plate (e.g. "Frame 1: Morning Daylight").
6. frame1Prompt: Detailed English image prompt for Frame 1.
7. frame2Label: Label for second reference plate (e.g. "Frame 2: Cyber Night Glow").
8. frame2Prompt: Detailed English image prompt for Frame 2.
9. camera: Camera setup (e.g. "Locked Static Camera, 35mm Anamorphic, f/1.8").
10. lighting: Lighting setup (e.g. "Warm morning daylight transitioning to neon ambient glow").
11. composition: Composition description.
12. fullBlueprintPrompt: Comprehensive copyable prompt text with all parameters.
13. characterLabel: "Character Asset"
14. characterPrompt: English prompt for isolated character/subject.
15. environmentLabel: "Room / Environment Plate"
16. environmentPrompt: English prompt for isolated environment.
17. captionText: Engaging viral caption for Instagram Reels / TikTok / YouTube Shorts in ${targetLang === "ar" ? "Arabic" : "English"}.
18. hashtags: Array of 8 viral hashtags.

Return ONLY a valid JSON object matching these keys.`;

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
              generatedBlueprint = JSON.parse(rawContent);
            }
          }
        } catch (e) {
          console.warn("Storyboard OpenAI generation failed:", e);
        }
      }

      // Default fallback blueprint if AI was unavailable
      if (!generatedBlueprint) {
        generatedBlueprint = {
          title: targetLang === "ar" ? "سير عمل Kling 3.0 و Nano Banana السينمائي" : "Kling 3.0 & Nano Banana Cinematic Workflow",
          videoModel: "kling-3.0/video",
          videoModelBadge: "Kling 3.0 Pro",
          videoPrompt: `Cinematic 3D animation, locked static camera, same bedroom workstation. Stylized character typing on glowing laptop. Fast smooth day to night transition with ambient lighting shifting from golden sunlight to neon cyberpunk glow, 8k render masterpiece.`,
          frame1Label: targetLang === "ar" ? "الإطار 1: ضوء الصباح" : "Frame 1: Morning Daylight",
          frame1Prompt: `3D stylized character sitting at bedroom desk typing on computer, warm morning sunlight streaming through window, soft cozy lighting, Pixar aesthetic, 8k octane render.`,
          frame2Label: targetLang === "ar" ? "الإطار 2: توهج ليلي سيبراني" : "Frame 2: Cyber Night Glow",
          frame2Prompt: `Same 3D stylized character sitting at bedroom desk typing on computer at night, glowing neon cyan and warm amber screen reflections, atmospheric bedroom, 8k octane render.`,
          camera: "Locked Static Camera, 35mm Anamorphic, f/1.8",
          lighting: "Volumetric morning sunlight shifting to cyber neon ambient glows",
          composition: "Rule of thirds, centered workstation desk with background depth",
          fullBlueprintPrompt: `locked static camera, same workstation scene. Stylized creator sits at desk working continuously on laptop. Frame 1: morning daylight through window. Frame 2: nighttime lighting with warm neon glow. Minimal motion, seamless loop, 8k render.`,
          characterLabel: targetLang === "ar" ? "عنصر الشخصية" : "Character Model",
          characterPrompt: `Stylized 3D cartoon tech creator character with red beanie and yellow shirt, full body character sheet, clean solid background.`,
          environmentLabel: targetLang === "ar" ? "عنصر البيئة والغرفة" : "Room Environment",
          environmentPrompt: `Cozy modern creator bedroom workstation with dual monitors, bookshelf, warm ambient night lamps, empty scene background plate.`,
          captionText: targetLang === "ar" 
            ? "كيف تصنع فيديو تحول سينمائي كامل من النهار إلى الليل بالذكاء الاصطناعي؟ 🚀 استخدمنا محرك Kling 3.0 مع Nano Banana في سعد ستوديو للوصول لهذه النتيجة الخرافية! جرب البرومبت المرفق الآن 🎬"
            : "How to create a seamless day-to-night AI cinematic loop! 🚀 Built with Kling 3.0 & Nano Banana inside Saad Studio. Try the blueprint prompt below! 🎬",
          hashtags: ["#SaadStudio", "#KlingAI", "#NanoBanana", "#AIAnimation", "#AIVideo", "#CGI", "#ViralReels", "#Filmmaking"],
        };
      }

      // Generate keyframe 1 & 2 via Google Nano Banana Pro
      let frame1Url = "";
      let frame2Url = "";
      try {
        const [f1, f2] = await Promise.all([
          generateImageDirectly(generatedBlueprint.frame1Prompt, "nano-banana-pro", "16:9"),
          generateImageDirectly(generatedBlueprint.frame2Prompt, "nano-banana-pro", "16:9"),
        ]);
        frame1Url = f1;
        frame2Url = f2;
      } catch (e) {
        console.warn("Storyboard frames generation error:", e);
      }

      const newStoryboardRecord: Omit<StoryboardShowcaseRecord, "id" | "createdAt" | "updatedAt"> = {
        title: generatedBlueprint.title,
        theme: selectedTheme,
        conceptPrompt: userPrompt,
        language: targetLang,
        video: {
          url: "",
          model: generatedBlueprint.videoModel || "kling-video",
          modelBadge: generatedBlueprint.videoModelBadge || "Kling 3.0 Pro",
          prompt: generatedBlueprint.videoPrompt,
        },
        referenceFrames: {
          frame1: {
            url: frame1Url || "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&auto=format&fit=crop&q=80",
            label: generatedBlueprint.frame1Label,
            modelBadge: "Google Nano Banana Pro",
            prompt: generatedBlueprint.frame1Prompt,
          },
          frame2: {
            url: frame2Url || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&auto=format&fit=crop&q=80",
            label: generatedBlueprint.frame2Label,
            modelBadge: "Google Nano Banana Pro",
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
            url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80",
            label: generatedBlueprint.characterLabel,
            prompt: generatedBlueprint.characterPrompt,
          },
          environment: {
            url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80",
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
