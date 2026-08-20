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
  const issuedIso = new Date().toISOString().slice(0, 10);

  const notableToolsHtml = data.notableTools
    .map(
      (item) => `
      <div style="margin-bottom: 12px; font-size: 14px; line-height: 1.6; color: #334155;">
        ${item.icon ? `<span style="margin-right: 6px;">${item.icon}</span>` : ""}
        <strong style="color: #0f172a;">${escapeHtml(item.name)}</strong>: ${escapeHtml(item.description)}
        ${item.url ? ` <a href="${escapeHtml(item.url)}" style="color: #0284c7; text-decoration: none; font-weight: 600;">(Learn more)</a>` : ""}
      </div>`
    )
    .join("");

  const sourceUpdatesHtml = data.sourceUpdates
    .map(
      (item) => `
      <div style="margin-bottom: 12px; font-size: 14px; line-height: 1.6; color: #334155;">
        ${item.icon ? `<span style="margin-right: 6px;">${item.icon}</span>` : ""}
        <strong style="color: #0f172a;">${escapeHtml(item.name)}</strong>: ${escapeHtml(item.description)}
        ${item.url ? ` <a href="${escapeHtml(item.url)}" style="color: #0284c7; text-decoration: none; font-weight: 600;">(Explore)</a>` : ""}
      </div>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(data.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:580px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.06);">
          
          <!-- Top Header -->
          <tr>
            <td style="padding:28px 32px 20px;background-color:#0f172a;border-bottom:2px solid #0284c7;text-align:center;">
              <img src="${logoSrc}" alt="Saad Studio" width="64" height="64" style="display:block;margin:0 auto 12px;border-radius:14px;" />
              <div style="font-size:18px;font-weight:900;letter-spacing:2px;color:#ffffff;text-transform:uppercase;">SAAD STUDIO</div>
              <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;color:#38bdf8;text-transform:uppercase;margin-top:4px;">OFFICIAL AI DISPATCH • ${escapeHtml(issuedIso)}</div>
            </td>
          </tr>

          <!-- 1. Hero / Main Spotlight Block -->
          <tr>
            <td style="padding:28px 32px 20px;">
              <div style="font-size:12px;font-weight:800;letter-spacing:1px;color:#ea580c;text-transform:uppercase;margin-bottom:12px;">
                ${escapeHtml(data.heroTag || "Interesting AI")}
              </div>

              ${
                data.heroImage
                  ? `
              <div style="margin-bottom:20px;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
                <img src="${escapeHtml(data.heroImage)}" alt="${escapeHtml(data.heroTitle)}" style="display:block;width:100%;height:auto;max-height:340px;object-fit:cover;" />
              </div>`
                  : ""
              }

              <h2 style="margin:0 0 14px;font-size:22px;font-weight:800;line-height:1.3;color:#0f172a;letter-spacing:-0.4px;">
                ${escapeHtml(data.heroTitle)}
              </h2>

              <div style="font-size:15px;line-height:1.75;color:#334155;margin-bottom:20px;">
                ${data.heroBody
                  .split(/\r?\n/)
                  .map((p) => (p.trim() ? `<p style="margin:0 0 12px 0;">${escapeHtml(p)}</p>` : `<div style="height:6px;"></div>`))
                  .join("")}
              </div>

              <div style="margin-bottom:12px;">
                <a href="${escapeHtml(data.heroCtaUrl || siteUrl)}" target="_blank" style="display:inline-block;padding:12px 24px;background-color:#0f172a;color:#ffffff;font-size:13px;font-weight:800;border-radius:10px;text-decoration:none;letter-spacing:0.3px;">
                  ${escapeHtml(data.heroCtaText || "Check it out here ➜")}
                </a>
              </div>
            </td>
          </tr>

          <!-- Separator -->
          <tr><td style="padding:0 32px;"><div style="height:1px;background-color:#e2e8f0;"></div></td></tr>

          <!-- 2. Notable AI Tools Section -->
          ${
            data.notableTools && data.notableTools.length > 0
              ? `
          <tr>
            <td style="padding:28px 32px 20px;">
              <div style="font-size:12px;font-weight:800;letter-spacing:1px;color:#ea580c;text-transform:uppercase;margin-bottom:8px;">
                Notable AIs
              </div>
              <h3 style="margin:0 0 16px;font-size:19px;font-weight:800;color:#0f172a;">
                ${escapeHtml(data.notableToolsTitle || "Notable AI Tools")}
              </h3>
              ${notableToolsHtml}
            </td>
          </tr>
          <tr><td style="padding:0 32px;"><div style="height:1px;background-color:#e2e8f0;"></div></td></tr>`
              : ""
          }

          <!-- 3. Sponsor Note (Optional) -->
          ${
            data.sponsorNote
              ? `
          <tr>
            <td style="padding:20px 32px;background-color:#f8fafc;border-top:1px solid #f1f5f9;border-bottom:1px solid #f1f5f9;text-align:center;font-size:13px;color:#64748b;">
              ${escapeHtml(data.sponsorNote)}
            </td>
          </tr>`
              : ""
          }

          <!-- 4. From the Source / Open Source Section -->
          ${
            data.sourceUpdates && data.sourceUpdates.length > 0
              ? `
          <tr>
            <td style="padding:28px 32px 20px;">
              <div style="font-size:12px;font-weight:800;letter-spacing:1px;color:#ea580c;text-transform:uppercase;margin-bottom:8px;">
                Open Source &amp; Drops
              </div>
              <h3 style="margin:0 0 16px;font-size:19px;font-weight:800;color:#0f172a;">
                ${escapeHtml(data.sourceUpdatesTitle || "From the Source")}
              </h3>
              ${sourceUpdatesHtml}
            </td>
          </tr>
          <tr><td style="padding:0 32px;"><div style="height:1px;background-color:#e2e8f0;"></div></td></tr>`
              : ""
          }

          <!-- 5. Prompt of the Day Section -->
          ${
            data.promptOfDayText
              ? `
          <tr>
            <td style="padding:28px 32px 24px;">
              <div style="font-size:12px;font-weight:800;letter-spacing:1px;color:#ea580c;text-transform:uppercase;margin-bottom:8px;">
                ${escapeHtml(data.promptOfDayTitle || "Prompt of the Day")}
              </div>
              <h3 style="margin:0 0 14px;font-size:19px;font-weight:800;color:#0f172a;">
                ${escapeHtml(data.promptOfDayName || "Prompt of the Day")}
              </h3>
              
              <div style="background-color:#fff7ed;border:1.5px solid #fed7aa;border-radius:14px;padding:18px 20px;margin-bottom:14px;">
                <div style="font-size:13px;font-weight:700;color:#9a3412;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">
                  Copy &amp; Paste Prompt:
                </div>
                <div style="font-family:monospace,sans-serif;font-size:13px;color:#7c2d12;line-height:1.6;word-break:break-word;">
                  ${escapeHtml(data.promptOfDayText)}
                </div>
              </div>
            </td>
          </tr>`
              : ""
          }

          <!-- Footer -->
          <tr>
            <td style="padding:28px 32px;background-color:#0f172a;text-align:center;">
              <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#ffffff;">
                Saad Studio — World-Class Generative AI Suite
              </p>
              <p style="margin:0 0 12px;font-size:12px;color:#94a3b8;">
                <a href="${siteUrl}" target="_blank" style="color:#38bdf8;text-decoration:none;font-weight:600;margin:0 6px;">Studio</a>
                •
                <a href="${siteUrl}/explore" target="_blank" style="color:#38bdf8;text-decoration:none;font-weight:600;margin:0 6px;">Explore</a>
                •
                <a href="mailto:support@saadstudio.app" style="color:#38bdf8;text-decoration:none;font-weight:600;margin:0 6px;">Support</a>
              </p>
              <p style="margin:0;font-size:11px;color:#64748b;">
                You received this newsletter as a subscriber of Saad Studio.<br/>
                © ${new Date().getFullYear()} Saad Studio. All rights reserved.
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

    if (action === "generate") {
      const userPrompt = String(body.prompt || "").trim();
      if (!userPrompt) {
        return NextResponse.json({ error: "Please enter instructions for the AI Newsletter Agent." }, { status: 400 });
      }

      const openAIApiKey = process.env.OPENAI_API_KEY;
      let generatedData: NewsletterPayload;
      let imageGenPrompt = "";

      if (openAIApiKey && openAIApiKey !== "sk-placeholder") {
        const systemInstruction = `You are the Lead Editorial AI for Saad Studio's official weekly newsletter (inspired by The Rundown AI and Ben's Bites).
You format rich, engaging, hype-free tech newsletters with these exact sections:
1. subject: catchy subject line
2. heroTag: short category tag like "Interesting AI", "Saad Studio Drops", or "Breakthrough"
3. heroTitle: punchy title for the main story
4. heroBody: 2-3 engaging paragraphs explaining the main topic/model/feature
5. heroCtaText: e.g. "Check it out here ➜" or "Try Grok Imagine 2.0 ➜"
6. heroCtaUrl: link URL (default "https://www.saadstudio.app")
7. notableToolsTitle: e.g. "Notable AI Tools & Models"
8. notableTools: array of 2-4 items, each with { icon (emoji), name, description, url }
9. sourceUpdatesTitle: e.g. "From the Source & Community"
10. sourceUpdates: array of 2-3 items, each with { icon (emoji), name, description, url }
11. promptOfDayTitle: "Prompt of the Day"
12. promptOfDayName: catchy prompt name (e.g. "Cinematic Ultra-Realistic Portrait")
13. promptOfDayText: the actual creative prompt users can copy/paste
14. imagePrompt: high-detail english prompt for an image generator (SDXL/Flux) representing the main story.

Return ONLY a valid JSON object with these keys.`;

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
              { role: "user", content: `Generate an engaging newsletter based on this topic/request:\n${userPrompt}` },
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
        generatedData = rawJson;
      } else {
        // Fallback generator when API key is not present
        imageGenPrompt = `A futuristic high-tech creative AI studio workspace with glowing holographic displays, cinematic 8k lighting, photorealistic: ${userPrompt.slice(0, 100)}`;
        generatedData = {
          subject: `✨ What's New in Creative AI: ${userPrompt.slice(0, 40)}...`,
          heroTag: "Saad Studio Spotlight",
          heroTitle: `New Advancements in Creative AI: ${userPrompt.slice(0, 45)}`,
          heroBody: `We are thrilled to bring you the latest breakthroughs in generative AI and creative tools on Saad Studio.\n\n${userPrompt}\n\nOur platform has been updated with faster inference, higher fidelity 4K rendering, and multi-model routing to make your creative workflow seamless.`,
          heroCtaText: "Explore New Models ➜",
          heroCtaUrl: `${siteUrl}/explore`,
          notableToolsTitle: "Notable AI Tools & Capabilities",
          notableTools: [
            { icon: "🎨", name: "Grok Imagine 2.0", description: "Ultra-fast photorealistic generations with full style control.", url: `${siteUrl}/image-studio` },
            { icon: "🎬", name: "Multi-Cam Auto Switcher", description: "Automatic speaker detection and timeline cut assembly.", url: `${siteUrl}/video-studio` },
            { icon: "⚡", name: "4K Master Upscaler", description: "Enhance details and textures up to 8x resolution.", url: `${siteUrl}/image-presets` },
          ],
          sourceUpdatesTitle: "From the Source & Community",
          sourceUpdates: [
            { icon: "🔍", name: "Style Presets Hub", description: "One-click cinematic prompt hydration library.", url: `${siteUrl}/image-presets` },
            { icon: "🚀", name: "Knowledge Hub", description: "Comprehensive documentation on all generative AI models.", url: `${siteUrl}/admin/knowledge-hub` },
          ],
          promptOfDayTitle: "Prompt of the Day",
          promptOfDayName: "Cinematic Volumetric Lighting Masterpiece",
          promptOfDayText: "A breathtaking hyper-realistic cinematic shot of a futuristic neon city in rain, volumetric reflections, anamorphic lens flare, 8k resolution, photorealistic masterpiece --ar 16:9",
          sponsorNote: "Reach top creative AI professionals and creators worldwide on Saad Studio.",
        };
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
              // Quick poll up to 10 times (20 seconds)
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

      // Deduplicate
      recipients = Array.from(new Set(recipients)).filter((e) => e && e.includes("@"));

      if (!recipients.length) {
        return NextResponse.json({ success: true, sentCount: 0, message: "No active recipients found for selected audience." });
      }

      const html = compileNewsletterHtml(data, logoSrc, siteUrl);
      const text = `${data.subject}\n\n${data.heroTitle}\n\n${data.heroBody}\n\nVisit Saad Studio: ${siteUrl}`;

      let sentCount = 0;
      let failedCount = 0;

      // Send in batches
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
