import { createHmac, createHash, timingSafeEqual } from "crypto";

export class UnsafeReferenceImageError extends Error {
  constructor(message = "Restricted content detected. This reference image cannot be used.") {
    super(message);
    this.name = "UnsafeReferenceImageError";
  }
}

const SAFETY_TOKEN_TTL_MS = 30 * 60 * 1000;

function getSafetyTokenSecret(): string {
  return String(
    process.env.STORYBOARD_SAFETY_TOKEN_SECRET
      ?? process.env.NEXTAUTH_SECRET
      ?? process.env.CLERK_SECRET_KEY
      ?? process.env.OPENAI_API_KEY
      ?? "",
  ).trim();
}

export function getStoryboardReferenceImageHash(imageDataUrl: string): string {
  return createHash("sha256").update(imageDataUrl).digest("hex");
}

export function createStoryboardReferenceSafetyToken(params: {
  userId: string;
  imageHash: string;
  now?: number;
}): string {
  const secret = getSafetyTokenSecret();
  if (!secret) throw new UnsafeReferenceImageError("Safety check service is unavailable. Upload is blocked.");

  const issuedAt = params.now ?? Date.now();
  const payload = `v1.${params.userId}.${params.imageHash}.${issuedAt}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function verifyStoryboardReferenceSafetyToken(params: {
  userId: string;
  imageHash: string;
  token?: string;
  now?: number;
}): boolean {
  const secret = getSafetyTokenSecret();
  if (!secret || !params.token) return false;

  const parts = params.token.split(".");
  if (parts.length !== 5) return false;

  const [version, tokenUserId, tokenImageHash, issuedAtRaw, signature] = parts;
  if (version !== "v1" || tokenUserId !== params.userId || tokenImageHash !== params.imageHash) return false;

  const issuedAt = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAt) || (params.now ?? Date.now()) - issuedAt > SAFETY_TOKEN_TTL_MS) return false;

  const payload = `${version}.${tokenUserId}.${tokenImageHash}.${issuedAtRaw}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(signature, "hex");
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

export async function checkStoryboardReferenceImageSafety(imageUrl: string): Promise<void> {
  const apiKey = String(
    process.env.OPENAI_API_KEY
      ?? process.env.NSFW_SCAN_OPENAI_API_KEY
      ?? "",
  ).trim();
  if (!apiKey) {
    throw new UnsafeReferenceImageError("Safety check service is unavailable. Upload is blocked.");
  }

  const model = String(process.env.STORYBOARD_NSFW_MODEL ?? "omni-moderation-latest").trim() || "omni-moderation-latest";
  const thresholdRaw = Number(process.env.STORYBOARD_NSFW_SEXUAL_THRESHOLD ?? "0.5");
  const sexualThreshold = Number.isFinite(thresholdRaw)
    ? Math.max(0, Math.min(1, thresholdRaw))
    : 0.5;

  try {
    const res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [
          {
            type: "image_url",
            image_url: { url: imageUrl },
          },
        ],
      }),
      signal: AbortSignal.timeout(10_000),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`Moderation request failed (${res.status})`);
    }

    const result = json?.results?.[0] ?? {};
    const categories = result?.categories ?? {};
    const scores = result?.category_scores ?? {};

    const sexual = Boolean(categories?.sexual);
    const sexualMinors = Boolean(categories?.["sexual/minors"] ?? categories?.sexual_minors);
    const sexualScore = Number(scores?.sexual);
    const sexualMinorsScore = Number(scores?.["sexual/minors"] ?? scores?.sexual_minors);

    const blockForSexual = sexual && (!Number.isFinite(sexualScore) || sexualScore >= sexualThreshold);
    const blockForSexualMinors = sexualMinors || (Number.isFinite(sexualMinorsScore) && sexualMinorsScore > 0);

    if (blockForSexual || blockForSexualMinors) {
      throw new UnsafeReferenceImageError();
    }

    await checkReferenceImageWithVisionSafety(imageUrl, apiKey);
  } catch (error) {
    if (error instanceof UnsafeReferenceImageError) {
      throw error;
    }
    throw new UnsafeReferenceImageError("Unable to verify image safety. Please use another image.");
  }
}

async function checkReferenceImageWithVisionSafety(imageUrl: string, apiKey: string): Promise<void> {
  const enabled = String(process.env.STORYBOARD_VISION_NSFW_CHECK ?? "1").trim() !== "0";
  if (!enabled) return;

  const model = String(process.env.STORYBOARD_VISION_NSFW_MODEL ?? "gpt-4o-mini").trim() || "gpt-4o-mini";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                "Classify whether this reference image must be blocked before image generation.",
                "Return only JSON with blocked:boolean and reason:string.",
                "Set blocked=true for pornographic or explicit sexual content, visible genitals, sex acts, exposed anus, explicit fetish content, or sexualized nudity.",
                "Set blocked=false for ordinary portraits, non-sexual fashion, swimwear, or cinematic scenes without explicit sexual content.",
              ].join(" "),
            },
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(15_000),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Vision safety request failed (${res.status})`);
  }

  const content = String(json?.choices?.[0]?.message?.content ?? "{}");
  const parsed = JSON.parse(content) as { blocked?: unknown; reason?: unknown };
  if (parsed.blocked === true) {
    throw new UnsafeReferenceImageError(
      typeof parsed.reason === "string" && parsed.reason.trim()
        ? `Restricted content detected. ${parsed.reason.trim()}`
        : undefined,
    );
  }
}
