import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";
import { getNewsletterSubscribers } from "@/lib/newsletter";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

export type NewsletterSectionItem = {
  icon?: string;
  name: string;
  description: string;
  url?: string;
};

export type NewsletterPayload = {
  language?: "ar" | "en";
  subject: string;
  heroTag: string;
  heroTitle: string;
  heroImage?: string;
  heroBody: string;
  heroCtaText: string;
  heroCtaUrl: string;
  notableToolsTitle: string;
  notableTools: NewsletterSectionItem[];
  sourceUpdatesTitle: string;
  sourceUpdates: NewsletterSectionItem[];
  promptOfDayTitle: string;
  promptOfDayName: string;
  promptOfDayText: string;
  sponsorNote?: string;
};

function escapeHtml(value: string): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function compileNewsletterHtml(data: NewsletterPayload, logoSrc: string, siteUrl: string): string {
  const isAr = data.language === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const textAlign = isAr ? "right" : "left";
  const fontStack = isAr
    ? "'Tajawal', 'Cairo', 'Segoe UI', Tahoma, -apple-system, sans-serif"
    : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  const issuedIso = new Date().toISOString().slice(0, 10);

  const notableToolsHtml = (data.notableTools || [])
    .map(
      (item) => `
      <div style="margin-bottom: 12px; font-size: 14px; line-height: 1.7; color: #cbd5e1;">
        <span style="${isAr ? 'margin-left: 6px;' : 'margin-right: 6px;'} font-size: 15px;">${item.icon || "✨"}</span>
        <strong style="color: #ffffff;">${escapeHtml(item.name)}</strong>: ${escapeHtml(item.description)}
        ${item.url ? ` <a href="${escapeHtml(item.url)}" target="_blank" style="color: #38bdf8; text-decoration: none; font-weight: 700;">${isAr ? '(جرب الآن)' : '(Try it)'}</a>` : ""}
      </div>`
    )
    .join("");

  const sourceUpdatesHtml = (data.sourceUpdates || [])
    .map(
      (item) => `
      <div style="margin-bottom: 12px; font-size: 14px; line-height: 1.7; color: #cbd5e1;">
        <span style="${isAr ? 'margin-left: 6px;' : 'margin-right: 6px;'} font-size: 15px;">${item.icon || "⚡"}</span>
        <strong style="color: #ffffff;">${escapeHtml(item.name)}</strong>: ${escapeHtml(item.description)}
        ${item.url ? ` <a href="${escapeHtml(item.url)}" target="_blank" style="color: #38bdf8; text-decoration: none; font-weight: 700;">${isAr ? '(عرض)' : '(View)'}</a>` : ""}
      </div>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="${isAr ? "ar" : "en"}" dir="${dir}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(data.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#060913;font-family:${fontStack};direction:${dir};text-align:${textAlign};-webkit-font-smoothing:antialiased;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#060913;padding:32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Luxury Card Container -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#0d1322;border:1px solid #1e293b;border-radius:24px;overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,0.85);direction:${dir};text-align:${textAlign};">
          
          <!-- Top Header -->
          <tr>
            <td align="center" style="padding:36px 32px 24px;background:linear-gradient(180deg,#131d33 0%,#0d1322 100%);border-bottom:1px solid #1e293b;text-align:center;">
              <img src="${logoSrc}" alt="Saad Studio" width="76" height="76" style="display:block;margin:0 auto 16px;border-radius:18px;border:1px solid rgba(255,255,255,0.15);box-shadow:0 8px 30px rgba(6,182,212,0.3);" />
              <div style="font-size:20px;font-weight:900;letter-spacing:2px;color:#ffffff;text-transform:uppercase;margin:0;">SAAD STUDIO</div>
              <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;color:#38bdf8;text-transform:uppercase;margin-top:6px;">
                ${isAr ? "النشرة الإخبارية الرسمية للذكاء الاصطناعي الإبداعي" : "OFFICIAL AI CREATIVE DISPATCH"} • ${escapeHtml(issuedIso)}
              </div>
            </td>
          </tr>

          <!-- 1. Hero / Main Spotlight Block -->
          <tr>
            <td style="padding:32px 36px 20px;">
              <div style="display:inline-block;padding:5px 14px;background-color:rgba(56,189,248,0.1);border:1px solid rgba(56,189,248,0.25);border-radius:30px;font-size:11px;font-weight:700;color:#38bdf8;margin-bottom:16px;letter-spacing:0.5px;">
                ${escapeHtml(data.heroTag || (isAr ? "إضاءة الأسبوع" : "Spotlight"))}
              </div>

              ${
                data.heroImage
                  ? `
              <div style="margin-bottom:22px;border-radius:16px;overflow:hidden;border:1px solid #1e293b;box-shadow:0 10px 25px rgba(0,0,0,0.5);">
                <img src="${escapeHtml(data.heroImage)}" alt="${escapeHtml(data.heroTitle)}" style="display:block;width:100%;height:auto;max-height:360px;object-fit:cover;" />
              </div>`
                  : ""
              }

              <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;line-height:1.4;color:#f8fafc;letter-spacing:-0.3px;">
                ${escapeHtml(data.heroTitle)}
              </h1>

              <div style="background-color:#11192e;border:1px solid #1e293b;border-radius:16px;padding:20px 24px;margin-bottom:20px;font-size:15px;line-height:1.8;color:#cbd5e1;">
                ${data.heroBody
                  .split(/\r?\n/)
                  .map((p) => (p.trim() ? `<p style="margin:0 0 12px 0;">${escapeHtml(p)}</p>` : `<div style="height:6px;"></div>`))
                  .join("")}
              </div>

              <div align="${isAr ? "right" : "left"}" style="margin-bottom:12px;">
                <table border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:12px;background:linear-gradient(135deg,#06b6d4 0%,#6366f1 100%);box-shadow:0 4px 18px rgba(6,182,212,0.35);">
                      <a href="${escapeHtml(data.heroCtaUrl || siteUrl)}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:13px;font-weight:800;letter-spacing:0.5px;color:#ffffff;text-decoration:none;text-transform:uppercase;border-radius:12px;font-family:${fontStack};">
                        ${escapeHtml(data.heroCtaText || (isAr ? "جرب الميزة الآن في سعد ستوديو ➜" : "Explore in Saad Studio ➜"))}
                      </a>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Separator -->
          <tr><td style="padding:0 36px;"><div style="height:1px;background-color:#1e293b;"></div></td></tr>

          <!-- 2. Notable AI Tools Section -->
          ${
            data.notableTools && data.notableTools.length > 0
              ? `
          <tr>
            <td style="padding:28px 36px 20px;">
              <div style="font-size:11px;font-weight:800;letter-spacing:1px;color:#38bdf8;text-transform:uppercase;margin-bottom:8px;">
                ${isAr ? "نماذج وأدوات المنصة" : "NOTABLE AI SUITE"}
              </div>
              <h3 style="margin:0 0 16px;font-size:18px;font-weight:800;color:#f8fafc;">
                ${escapeHtml(data.notableToolsTitle || (isAr ? "أبرز أدوات وميزات سعد ستوديو" : "Notable AI Tools"))}
              </h3>
              <div style="background-color:#11192e;border:1px solid #1e293b;border-radius:16px;padding:20px 24px;">
                ${notableToolsHtml}
              </div>
            </td>
          </tr>
          <tr><td style="padding:0 36px;"><div style="height:1px;background-color:#1e293b;"></div></td></tr>`
              : ""
          }

          <!-- 3. From the Source / Open Source Section -->
          ${
            data.sourceUpdates && data.sourceUpdates.length > 0
              ? `
          <tr>
            <td style="padding:28px 36px 20px;">
              <div style="font-size:11px;font-weight:800;letter-spacing:1px;color:#38bdf8;text-transform:uppercase;margin-bottom:8px;">
                ${isAr ? "تحديثات وتطويرات" : "FROM THE SOURCE"}
              </div>
              <h3 style="margin:0 0 16px;font-size:18px;font-weight:800;color:#f8fafc;">
                ${escapeHtml(data.sourceUpdatesTitle || (isAr ? "أحدث التحديثات في المنصة" : "Platform Updates & Releases"))}
              </h3>
              <div style="background-color:#11192e;border:1px solid #1e293b;border-radius:16px;padding:20px 24px;">
                ${sourceUpdatesHtml}
              </div>
            </td>
          </tr>
          <tr><td style="padding:0 36px;"><div style="height:1px;background-color:#1e293b;"></div></td></tr>`
              : ""
          }

          <!-- 4. Prompt of the Day Section -->
          ${
            data.promptOfDayText
              ? `
          <tr>
            <td style="padding:28px 36px 28px;">
              <div style="font-size:11px;font-weight:800;letter-spacing:1px;color:#f59e0b;text-transform:uppercase;margin-bottom:8px;">
                ${escapeHtml(data.promptOfDayTitle || (isAr ? "برومبت اليوم الإبداعي" : "Prompt of the Day"))}
              </div>
              <h3 style="margin:0 0 14px;font-size:18px;font-weight:800;color:#f8fafc;">
                ${escapeHtml(data.promptOfDayName || (isAr ? "برومبت سينمائي جاهز للتجربة" : "Featured Creative Prompt"))}
              </h3>
              
              <div style="background-color:#182238;border:1.5px solid #f59e0b40;border-radius:16px;padding:20px 24px;margin-bottom:14px;">
                <div style="font-size:12px;font-weight:700;color:#fbbf24;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">
                  ${isAr ? "انسخ البرومبت وجربه في Image Studio:" : "Copy & Paste into Image Studio:"}
                </div>
                <div style="font-family:monospace,sans-serif;font-size:13px;color:#fef08a;line-height:1.7;word-break:break-word;background-color:#0b1120;padding:12px 16px;border-radius:10px;border:1px solid rgba(255,255,255,0.06);">
                  ${escapeHtml(data.promptOfDayText)}
                </div>
              </div>
            </td>
          </tr>`
              : ""
          }

          <!-- Footer -->
          <tr>
            <td style="padding:28px 36px;background-color:#080c16;border-top:1px solid #1e293b;text-align:center;">
              <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#cbd5e1;">
                سعد ستوديو — المنصة الرائدة في أدوات الذكاء الاصطناعي الإبداعية
              </p>
              <p style="margin:0 0 14px;font-size:12px;color:#64748b;">
                <a href="${siteUrl}" target="_blank" style="color:#38bdf8;text-decoration:none;font-weight:600;margin:0 8px;">Studio</a>
                •
                <a href="${siteUrl}/explore" target="_blank" style="color:#38bdf8;text-decoration:none;font-weight:600;margin:0 8px;">Explore</a>
                •
                <a href="mailto:support@saadstudio.app" style="color:#38bdf8;text-decoration:none;font-weight:600;margin:0 8px;">Support</a>
              </p>
              <p style="margin:0;font-size:11px;color:#475569;line-height:1.5;">
                وصلتك هذه النشرة بصفتك مشتركاً أو مستخدماً مسجلاً في منصة سعد ستوديو.<br/>
                © ${new Date().getFullYear()} Saad Studio. جميع الحقوق محفوظة.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "generate";

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://saadstudio.app";
    const logoSrc = `${siteUrl.replace(/\/$/, "")}/logo-saad.png?v=5`;

    if (action === "render_preview") {
      const data: NewsletterPayload = body.data;
      if (!data) return NextResponse.json({ error: "Missing data" }, { status: 400 });
      const html = compileNewsletterHtml(data, logoSrc, siteUrl);
      return NextResponse.json({ html });
    }

    if (action === "generate_image") {
      const prompt = String(body.prompt || "").trim();
      if (!prompt) return NextResponse.json({ error: "Image prompt is required" }, { status: 400 });

      const waveSpeedKey = process.env.WAVESPEED_API_KEY;
      if (!waveSpeedKey) {
        return NextResponse.json({ error: "WAVESPEED_API_KEY is not configured" }, { status: 500 });
      }

      const imgRes = await fetch("https://api.wavespeed.ai/api/v3/flux-schnell/text-to-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${waveSpeedKey}`,
        },
        body: JSON.stringify({
          prompt,
          aspect_ratio: "16:9",
          num_images: 1,
        }),
      });

      if (!imgRes.ok) {
        throw new Error(`WaveSpeed generation error: ${imgRes.statusText}`);
      }

      const data = await imgRes.json();
      const taskId = data?.data?.id || data?.id;
      let imageUrl = "";

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
              if (outputs.length && outputs[0]) {
                imageUrl = outputs[0];
                break;
              }
            }
          }
        }
      }

      return NextResponse.json({ success: true, imageUrl });
    }

    if (action === "generate") {
      const userPrompt = String(body.prompt || "").trim();
      const targetLang = (body.language === "ar" || body.language === "en") ? body.language : (/[\u0600-\u06FF]/.test(userPrompt) ? "ar" : "en");

      if (!userPrompt) {
        return NextResponse.json({ error: "Please enter instructions for the AI Newsletter Agent." }, { status: 400 });
      }

      const openAIApiKey = process.env.OPENAI_API_KEY;
      let generatedData: NewsletterPayload;
      let imageGenPrompt = "";

      if (openAIApiKey && openAIApiKey !== "sk-placeholder") {
        const systemInstruction = `You are the Lead Editorial AI for Saad Studio (سعد ستوديو - المنصة الإبداعية للذكاء الاصطناعي).
You write captivating, highly professional newsletters.
TARGET LANGUAGE: ${targetLang === "ar" ? "ARABIC (العربية الفصحى الاحترافية)" : "ENGLISH"}.

Generate a JSON object with these exact keys:
1. language: "${targetLang}"
2. subject: catchy subject line in ${targetLang === "ar" ? "Arabic" : "English"}
3. heroTag: short badge title (e.g. "${targetLang === "ar" ? "إضاءة الأسبوع" : "Spotlight"}")
4. heroTitle: headline for the main story/model launch
5. heroBody: 2-3 engaging paragraphs explaining the announcement in ${targetLang === "ar" ? "Arabic" : "English"}
6. heroCtaText: e.g. "${targetLang === "ar" ? "جرب الميزة الآن في سعد ستوديو ➜" : "Try Grok Imagine 2.0 in Saad Studio ➜"}"
7. heroCtaUrl: link URL (e.g. "${siteUrl}/image-studio")
8. notableToolsTitle: e.g. "${targetLang === "ar" ? "أبرز أدوات ونماذج سعد ستوديو" : "Notable AI Tools & Models"}"
9. notableTools: array of 3 items, each { icon: string (emoji), name: string, description: string in ${targetLang === "ar" ? "Arabic" : "English"}, url: string }
10. sourceUpdatesTitle: e.g. "${targetLang === "ar" ? "تحديثات وتطويرات المنصة" : "From the Source & Releases"}"
11. sourceUpdates: array of 2 items, each { icon: string (emoji), name: string, description: string in ${targetLang === "ar" ? "Arabic" : "English"}, url: string }
12. promptOfDayTitle: "${targetLang === "ar" ? "برومبت اليوم الإبداعي" : "Prompt of the Day"}"
13. promptOfDayName: catchy prompt name
14. promptOfDayText: the actual copyable image generation prompt (in English for AI models e.g. Midjourney/Flux)
15. imagePrompt: high-detail english prompt describing a cinematic visual concept representing the main topic for image generation.

Return ONLY the valid JSON object.`;

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
              { role: "system", content: systemInstruction },
              { role: "user", content: `Topic/Instructions:\n${userPrompt}` },
            ],
            temperature: 0.7,
          }),
        });

        if (!apiRes.ok) {
          throw new Error(`OpenAI API error: ${apiRes.statusText}`);
        }

        const completion = await apiRes.json();
        const rawJson = JSON.parse(completion.choices?.[0]?.message?.content || "{}");
        imageGenPrompt = rawJson.imagePrompt || userPrompt;
        delete rawJson.imagePrompt;
        generatedData = { ...rawJson, language: targetLang };
      } else {
        // Fallback generator
        if (targetLang === "ar") {
          imageGenPrompt = `A futuristic high-tech creative AI studio workspace with glowing holographic displays, cinematic 8k lighting, photorealistic: ${userPrompt.slice(0, 100)}`;
          generatedData = {
            language: "ar",
            subject: `✨ جديد سعد ستوديو: ${userPrompt.slice(0, 35)}...`,
            heroTag: "إضاءة الأسبوع",
            heroTitle: `تطورات ثورية في الذكاء الاصطناعي: ${userPrompt.slice(0, 40)}`,
            heroBody: `يسعدنا أن نقدم لكم أحدث الإطلاقات والنماذج الإبداعية عبر منصة سعد ستوديو.\n\n${userPrompt}\n\nتم تحديث محركات التوليد لتمنحك دقة 4K فائقة وسرعة معالجة استثنائية لكافة مشاريعك الفنية والسينمائية.`,
            heroCtaText: "جرب الميزة الآن في سعد ستوديو ➜",
            heroCtaUrl: `${siteUrl}/image-studio`,
            notableToolsTitle: "أبرز أدوات ونماذج سعد ستوديو",
            notableTools: [
              { icon: "🎨", name: "Grok Imagine 2.0", description: "توليد صور واقعية سينمائية بأعلى دقة وتحكم كامل في الإضاءة.", url: `${siteUrl}/image-studio` },
              { icon: "🎬", name: "Multi-Cam Auto Switcher", description: "اكتشاف تلقائي للمتحدث وتركيب مشاهد الفيديو باحترافية.", url: `${siteUrl}/video-studio` },
              { icon: "⚡", name: "مكتبة الستايلات والبرومبت", description: "حقن فوري لأقوى البرومبتات الفنية الجاهزة بنقرة واحدة.", url: `${siteUrl}/image-presets` },
            ],
            sourceUpdatesTitle: "تحديثات وتطويرات المنصة",
            sourceUpdates: [
              { icon: "🔍", name: "التخزين السحابي فائق السرعة", description: "بث وسائط خالي من الأخطاء ودعم كامل لـ B2 و S3.", url: `${siteUrl}` },
              { icon: "🚀", name: "إضافة Premiere Pro 26.2.0", description: "تكامل مباشر وسلس داخل برنامج أدوبي بريمير.", url: `${siteUrl}` },
            ],
            promptOfDayTitle: "برومبت اليوم الإبداعي",
            promptOfDayName: "لوحة سينمائية بإضاءة ثلاثية الأبعاد",
            promptOfDayText: "A breathtaking hyper-realistic cinematic portrait, dramatic volumetric studio lighting, anamorphic reflections, 8k resolution, photorealistic masterpiece --ar 16:9",
          };
        } else {
          imageGenPrompt = `A futuristic high-tech creative AI studio workspace with glowing holographic displays, cinematic 8k lighting, photorealistic: ${userPrompt.slice(0, 100)}`;
          generatedData = {
            language: "en",
            subject: `✨ What's New in Saad Studio: ${userPrompt.slice(0, 35)}...`,
            heroTag: "Saad Studio Spotlight",
            heroTitle: `New Breakthroughs in Creative AI: ${userPrompt.slice(0, 40)}`,
            heroBody: `We are thrilled to bring you the latest breakthroughs in generative AI and creative tools on Saad Studio.\n\n${userPrompt}\n\nOur platform has been upgraded with faster inference, higher fidelity 4K rendering, and multi-model routing.`,
            heroCtaText: "Launch in Saad Studio ➜",
            heroCtaUrl: `${siteUrl}/image-studio`,
            notableToolsTitle: "Notable AI Tools & Capabilities",
            notableTools: [
              { icon: "🎨", name: "Grok Imagine 2.0", description: "Ultra-fast photorealistic generations with full style control.", url: `${siteUrl}/image-studio` },
              { icon: "🎬", name: "Multi-Cam Auto Switcher", description: "Automatic speaker detection and timeline cut assembly.", url: `${siteUrl}/video-studio` },
              { icon: "⚡", name: "Style Presets Library", description: "One-click cinematic prompt hydration catalogue.", url: `${siteUrl}/image-presets` },
            ],
            sourceUpdatesTitle: "From the Source & Releases",
            sourceUpdates: [
              { icon: "🔍", name: "Universal Media Storage", description: "Zero-loss B2 & S3 asset streaming.", url: `${siteUrl}` },
              { icon: "🚀", name: "CEP Premiere 26.2.0 Extension", description: "Direct Premiere Pro plugin integration.", url: `${siteUrl}` },
            ],
            promptOfDayTitle: "Prompt of the Day",
            promptOfDayName: "Cinematic Volumetric Studio Masterpiece",
            promptOfDayText: "A breathtaking hyper-realistic cinematic portrait, dramatic volumetric studio lighting, anamorphic reflections, 8k resolution, photorealistic masterpiece --ar 16:9",
          };
        }
      }

      // Try generating an AI Hero Image via WaveSpeed if available
      let heroImageUrl: string | undefined = undefined;
      const waveSpeedKey = process.env.WAVESPEED_API_KEY;

      if (waveSpeedKey && imageGenPrompt) {
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
                    if (outputs.length && outputs[0]) {
                      heroImageUrl = outputs[0];
                      break;
                    }
                  }
                }
              }
            }
          }
        } catch (e) {
          console.error("Hero image generation error:", e);
        }
      }

      if (heroImageUrl) {
        generatedData.heroImage = heroImageUrl;
      }

      const html = compileNewsletterHtml(generatedData, logoSrc, siteUrl);

      return NextResponse.json({
        success: true,
        data: generatedData,
        imagePrompt: imageGenPrompt,
        html,
      });
    }

    if (action === "send_broadcast") {
      const data: NewsletterPayload = body.data;
      const targetAudience: "newsletter_subscribers" | "active_subscribers" = body.targetAudience || "newsletter_subscribers";
      if (!data) return NextResponse.json({ error: "Missing newsletter data" }, { status: 400 });

      const resendKey = process.env.RESEND_API_KEY;
      const fromEmail = process.env.RESEND_FROM || "Saad Studio <updates@saadstudio.app>";
      if (!resendKey) {
        return NextResponse.json({ error: "RESEND_API_KEY is not configured." }, { status: 500 });
      }

      let recipients: string[] = [];
      if (targetAudience === "newsletter_subscribers") {
        const subs = await getNewsletterSubscribers();
        recipients = subs.filter((s) => s.status === "active").map((s) => s.email.trim().toLowerCase());
      } else {
        const threshold = new Date(Date.now() - 86_400_000);
        const activeUsers = await prismadb.userSubscription.findMany({
          where: { stripePriceId: { not: null }, stripeCurrentPeriodEnd: { gt: threshold } },
          select: { userId: true },
        });
        const userIds = activeUsers.map((u) => u.userId);
        const users = await prismadb.user.findMany({
          where: { id: { in: userIds }, isBanned: false },
          select: { email: true },
        });
        recipients = users.map((u) => u.email.trim().toLowerCase());
      }

      recipients = Array.from(new Set(recipients)).filter((e) => e && e.includes("@"));

      if (!recipients.length) {
        return NextResponse.json({ success: true, sentCount: 0, message: "No active recipients found for selected audience." });
      }

      const html = compileNewsletterHtml(data, logoSrc, siteUrl);
      const text = `${data.subject}\n\n${data.heroTitle}\n\n${data.heroBody}\n\nVisit Saad Studio: ${siteUrl}`;

      let sentCount = 0;
      let failedCount = 0;

      for (const email of recipients) {
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: fromEmail,
              to: [email],
              subject: data.subject,
              text,
              html,
            }),
          });
          if (res.ok) sentCount++;
          else failedCount++;
        } catch {
          failedCount++;
        }
      }

      return NextResponse.json({
        success: true,
        totalRecipients: recipients.length,
        sentCount,
        failedCount,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error in newsletter agent" },
      { status: 500 }
    );
  }
}
