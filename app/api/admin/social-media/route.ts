import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import {
  getSocialPosts,
  saveSocialPost,
  deleteSocialPost,
  getSocialAccountsConfig,
  saveSocialAccountsConfig,
  SocialMediaPostRecord,
  PlatformContentItem,
} from "@/lib/social-media";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const posts = await getSocialPosts();
    const config = await getSocialAccountsConfig();
    return NextResponse.json({ posts, config });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch social posts" },
      { status: 500 }
    );
  }
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
      const targetLang = body.language === "ar" ? "ar" : body.language === "en" ? "en" : (/[\u0600-\u06FF]/.test(userPrompt) ? "ar" : "en");
      const imageModel = String(body.imageModel || "nano-banana-pro").toLowerCase();

      if (!userPrompt) {
        return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
      }

      const openAIApiKey = process.env.OPENAI_API_KEY;
      let platformsResult: SocialMediaPostRecord["platforms"] = {};
      let imageGenPrompt = "";

      if (openAIApiKey && openAIApiKey !== "sk-placeholder") {
        const systemPrompt = `You are the Lead Social Media Growth Strategist for "Saad Studio" (سعد ستوديو - the premier generative AI creative suite).
Target Language: ${targetLang === "ar" ? "ARABIC (العربية الفصحى العصرية الجذابة)" : "ENGLISH"}.

Generate platform-optimized social media posts tailored to each network's best practices:
1. twitter: Maximum 280 characters, strong hook, high-converting copy, 2-3 targeted hashtags (e.g. #SaadStudio #AI #GenAI), clear link to ${siteUrl}.
2. instagram: Engaging aesthetic caption with emojis, storytelling, "Link in bio", and 15-20 viral hashtags.
3. linkedin: Professional tone, bullet-point breakdown of value/productivity gains for creators & enterprises, discussion question, and 3-5 hashtags.
4. facebook: Engaging community post with friendly tone and direct CTA link.
5. telegram: Richly formatted broadcast with markdown style, emojis, bullet points, and instant join link.
6. tiktok: 30-second viral video script with Hook (0-3s), Visual Scene notes, and Voiceover Narration script.

Also generate "imagePrompt": A highly detailed English visual prompt (for Nano Banana Pro / GPT-Image-2) depicting a cinematic high-tech scene representing the topic.

Return ONLY a valid JSON object matching:
{
  "twitter": { "content": "...", "hashtags": ["#SaadStudio", "..."] },
  "instagram": { "content": "...", "hashtags": ["#AI", "..."] },
  "linkedin": { "content": "...", "hashtags": ["#CreativeAI", "..."] },
  "facebook": { "content": "...", "hashtags": ["#AI", "..."] },
  "telegram": { "content": "...", "hashtags": ["#SaadStudio", "..."] },
  "tiktok": { "content": "HOOK: ...\\nSCENE: ...\\nVOICEOVER: ...", "hashtags": ["#AI", "..."] },
  "imagePrompt": "A futuristic cinematic..."
}`;

        const apiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openAIApiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Topic to create social media content for:\n${userPrompt}` },
            ],
            temperature: 0.7,
          }),
        });

        if (!apiRes.ok) {
          throw new Error(`OpenAI API error: ${apiRes.statusText}`);
        }

        const completion = await apiRes.json();
        const parsed = JSON.parse(completion.choices?.[0]?.message?.content || "{}");
        imageGenPrompt = parsed.imagePrompt || userPrompt;

        const formatItem = (platform: any, item: any): PlatformContentItem => ({
          platform,
          content: String(item?.content || "").trim(),
          hashtags: Array.isArray(item?.hashtags) ? item.hashtags : [],
          charCount: String(item?.content || "").trim().length,
        });

        platformsResult = {
          twitter: formatItem("twitter", parsed.twitter),
          instagram: formatItem("instagram", parsed.instagram),
          linkedin: formatItem("linkedin", parsed.linkedin),
          facebook: formatItem("facebook", parsed.facebook),
          telegram: formatItem("telegram", parsed.telegram),
          tiktok: formatItem("tiktok", parsed.tiktok),
        };
      } else {
        // Fallback generator
        imageGenPrompt = `A stunning photorealistic 8k cinematic shot of a futuristic AI creative studio with glowing holograms: ${userPrompt.slice(0, 80)}`;
        if (targetLang === "ar") {
          platformsResult = {
            twitter: {
              platform: "twitter",
              content: `🔥 إطلاق ضخم في منصة سعد ستوديو! 🚀\n\n${userPrompt.slice(0, 130)}\n\nجرب الميزة الآن عبر: ${siteUrl}`,
              hashtags: ["#سعد_ستوديو", "#ذكاء_اصطناعي", "#SaadStudio", "#AI"],
              charCount: 160,
            },
            instagram: {
              platform: "instagram",
              content: `✨ تجربة إبداعية جديدة بالكامل على سعد ستوديو!\n\n${userPrompt}\n\n💡 صمم، ولد، وحرر أعمالك الفنية والسينمائية بدقة 4K في ثوانٍ معدودة.\n\n🔗 الرابط متاح الآن في البايو.`,
              hashtags: ["#سعد_ستوديو", "#تصميم_بالذكاء_الاصطناعي", "#إبداع", "#SaadStudio", "#GenAI"],
              charCount: 220,
            },
            linkedin: {
              platform: "linkedin",
              content: `يسعدنا الإعلان عن إطلاق تحديثات جديدة في منصة Saad Studio لتمكين صناع المحتوى والشركات الإبداعية.\n\n📌 أبرز الميزات:\n• ${userPrompt}\n• تسريع وتيرة الإنتاج وتقليل وقت المعالجة.\n• جودة سينمائية فائقة بدقة 4K.\n\nاكتشف الإمكانيات الكاملة عبر منصتنا اليوم: ${siteUrl}`,
              hashtags: ["#SaadStudio", "#ArtificialIntelligence", "#GenerativeAI", "#CreativeTech"],
              charCount: 280,
            },
            facebook: {
              platform: "facebook",
              content: `أحدث التطورات في الذكاء الاصطناعي أصبحت بين يديك الآن مع سعد ستوديو! 🚀\n\n${userPrompt}\n\nجرب الآن: ${siteUrl}`,
              hashtags: ["#SaadStudio", "#AI"],
              charCount: 150,
            },
            telegram: {
              platform: "telegram",
              content: `🚀 *إعلان رسمي من سعد ستوديو*\n\n${userPrompt}\n\n🔗 *جرب التحديث الجديد الآن:*\n[دخول المنصة](${siteUrl})`,
              hashtags: ["#سعد_ستوديو", "#تحديث"],
              charCount: 140,
            },
            tiktok: {
              platform: "tiktok",
              content: `🎬 كواليس وتجربة الميزة الجديدة:\n\n[المشهد 1 (0-3s)]: لقطة سريعة لنتيجة التصميم بجودة 4K.\n[المشهد 2 (3-15s)]: كتابة البرومبت وتوليد الصورة في ثوانٍ.\n[المشهد 3 (15-30s)]: النتيجة النهائية والدعوة للتجربة عبر سعد ستوديو.`,
              hashtags: ["#fyp", "#viral", "#saadstudio", "#ai_tools"],
              charCount: 200,
            },
          };
        } else {
          platformsResult = {
            twitter: {
              platform: "twitter",
              content: `🔥 Huge update on Saad Studio! 🚀\n\n${userPrompt.slice(0, 140)}\n\nTry it now at ${siteUrl}`,
              hashtags: ["#SaadStudio", "#AI", "#GenAI", "#CreativeAI"],
              charCount: 160,
            },
            instagram: {
              platform: "instagram",
              content: `✨ Next-level creativity unlocked on Saad Studio.\n\n${userPrompt}\n\nElevate your visual storytelling with photorealistic 4K AI models in seconds.\n\n🔗 Link in bio to explore!`,
              hashtags: ["#SaadStudio", "#AIArt", "#GenAI", "#DigitalCreativity"],
              charCount: 210,
            },
            linkedin: {
              platform: "linkedin",
              content: `We are excited to introduce the latest creative AI capabilities on Saad Studio.\n\nKey Highlights:\n• ${userPrompt}\n• Seamless cloud orchestration and real-time generation.\n• Designed for creators, filmmakers, and digital agencies.\n\nLearn more: ${siteUrl}`,
              hashtags: ["#SaadStudio", "#ArtificialIntelligence", "#TechInnovation"],
              charCount: 270,
            },
            facebook: {
              platform: "facebook",
              content: `Experience the new power of generative AI on Saad Studio! 🚀\n\n${userPrompt}\n\nStart creating today: ${siteUrl}`,
              hashtags: ["#SaadStudio", "#AI"],
              charCount: 140,
            },
            telegram: {
              platform: "telegram",
              content: `🚀 *Saad Studio Official Update*\n\n${userPrompt}\n\n🔗 *Explore now:*\n[Launch Studio](${siteUrl})`,
              hashtags: ["#SaadStudio", "#AI"],
              charCount: 130,
            },
            tiktok: {
              platform: "tiktok",
              content: `🎬 Video Hook & Script:\n\n[Scene 1 (0-3s)]: Shocking 4K cinematic visual reveal.\n[Scene 2 (3-15s)]: Entering prompt in Saad Studio and hitting generate.\n[Scene 3 (15-30s)]: Showing the insane resolution details. CTA: Try it on Saad Studio!`,
              hashtags: ["#fyp", "#viral", "#ai", "#tech"],
              charCount: 200,
            },
          };
        }
      }

      // Generate Image
      let generatedImageUrl: string | undefined = undefined;
      if (imageModel.includes("gpt") || imageModel.includes("openai")) {
        if (openAIApiKey && openAIApiKey !== "sk-placeholder") {
          try {
            const res = await fetch("https://api.openai.com/v1/images/generations", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${openAIApiKey}`,
              },
              body: JSON.stringify({
                model: "dall-e-3",
                prompt: imageGenPrompt,
                size: "1792x1024",
                quality: "standard",
                n: 1,
              }),
            });
            if (res.ok) {
              const data = await res.json();
              generatedImageUrl = data.data?.[0]?.url;
            }
          } catch (e) {
            console.error("OpenAI image generation error in social agent:", e);
          }
        }
      } else {
        const waveSpeedKey = process.env.WAVESPEED_API_KEY;
        if (waveSpeedKey) {
          try {
            const imgRes = await fetch("https://api.wavespeed.ai/api/v3/flux-schnell/text-to-image", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${waveSpeedKey}`,
              },
              body: JSON.stringify({
                prompt: imageGenPrompt,
                aspect_ratio: "16:9",
                num_images: 1,
              }),
            });
            if (imgRes.ok) {
              const data = await imgRes.json();
              const taskId = data?.data?.id || data?.id;
              if (taskId) {
                for (let i = 0; i < 10; i++) {
                  await new Promise((r) => setTimeout(r, 2000));
                  const pollRes = await fetch(`https://api.wavespeed.ai/api/v3/predictions/${taskId}/result`, {
                    headers: { Authorization: `Bearer ${waveSpeedKey}` },
                  });
                  if (pollRes.ok) {
                    const pollData = await pollRes.json();
                    const status = (pollData?.data?.status || pollData?.status || "").toLowerCase();
                    if (status === "completed" || status === "succeeded" || status === "success") {
                      const outputs = pollData?.data?.outputs || pollData?.outputs || [];
                      if (outputs[0]) {
                        generatedImageUrl = outputs[0];
                        break;
                      }
                    }
                  }
                }
              }
            }
          } catch (e) {
            console.error("WaveSpeed image error in social agent:", e);
          }
        }
      }

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

    // 2. GENERATE IMAGE ONLY
    if (action === "generate_image") {
      const prompt = String(body.prompt || "").trim();
      const model = String(body.model || "nano-banana-pro").toLowerCase();
      if (!prompt) return NextResponse.json({ error: "Prompt is required" }, { status: 400 });

      let imageUrl = "";
      if (model.includes("gpt") || model.includes("openai")) {
        const openAIApiKey = process.env.OPENAI_API_KEY;
        if (!openAIApiKey) return NextResponse.json({ error: "OPENAI_API_KEY is missing" }, { status: 500 });
        const res = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${openAIApiKey}` },
          body: JSON.stringify({ model: "dall-e-3", prompt, size: "1792x1024", quality: "standard", n: 1 }),
        });
        if (res.ok) {
          const data = await res.json();
          imageUrl = data.data?.[0]?.url || "";
        }
      } else {
        const waveSpeedKey = process.env.WAVESPEED_API_KEY;
        if (!waveSpeedKey) return NextResponse.json({ error: "WAVESPEED_API_KEY is missing" }, { status: 500 });
        const imgRes = await fetch("https://api.wavespeed.ai/api/v3/flux-schnell/text-to-image", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${waveSpeedKey}` },
          body: JSON.stringify({ prompt, aspect_ratio: "16:9", num_images: 1 }),
        });
        if (imgRes.ok) {
          const data = await imgRes.json();
          const taskId = data?.data?.id || data?.id;
          if (taskId) {
            for (let i = 0; i < 15; i++) {
              await new Promise((r) => setTimeout(r, 2000));
              const pollRes = await fetch(`https://api.wavespeed.ai/api/v3/predictions/${taskId}/result`, {
                headers: { Authorization: `Bearer ${waveSpeedKey}` },
              });
              if (pollRes.ok) {
                const pollData = await pollRes.json();
                const status = (pollData?.data?.status || pollData?.status || "").toLowerCase();
                if (status === "completed" || status === "succeeded" || status === "success") {
                  const outputs = pollData?.data?.outputs || pollData?.outputs || [];
                  if (outputs[0]) {
                    imageUrl = outputs[0];
                    break;
                  }
                }
              }
            }
          }
        }
      }

      return NextResponse.json({ success: true, imageUrl, model });
    }

    // 3. PUBLISH TO SOCIAL PLATFORMS (Telegram, Discord, Webhooks)
    if (action === "publish") {
      const post: SocialMediaPostRecord = body.post;
      const targetPlatform = body.platform as string; // "telegram" | "discord" | "all"
      if (!post) return NextResponse.json({ error: "Post is required" }, { status: 400 });

      const config = await getSocialAccountsConfig();
      const results: Record<string, boolean> = {};

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
    if (!id) return NextResponse.json({ error: "Post ID is required" }, { status: 400 });

    const success = await deleteSocialPost(id);
    return NextResponse.json({ success });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete post" },
      { status: 500 }
    );
  }
}
