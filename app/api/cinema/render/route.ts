import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getGenAI } from "@/lib/gemini-veo";
import { getModelById, VIDEO_MODEL_REGISTRY } from "@/lib/video-model-registry";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp, isAllowedOrigin, isSafePublicHttpUrl, sanitizePrompt } from "@/lib/security";
import {
  generateProceduralCinemaScene,
  normalizeCinemaRender,
  type CinemaRenderInput,
} from "@/lib/cinema-studio-vso";

export const runtime = "nodejs";
export const maxDuration = 300;

const SYSTEM = `You are Saad Studio's cinema director engine.
Create a practical cinematic scene plan for a visual preview tool.
Return JSON only. No markdown. No explanation.
The plan must include title, directorNotes, moodColor, accentColor, particlesType, and one or more scenes.
Each scene must include visualDescription, dialogue, subtitles with start/end seconds, lensType, cameraMovement, soundEffects, and visualLayout.
Use the supplied Camera body to bias colour science and grain (ARRI = warm filmic, RED = sharp digital, Sony Venice = balanced wide-gamut, Kodak film = grain + halation, iPhone = clean modern, etc.).
Use the Focal length to drive composition (wide = environmental scale, normal = intimate, tele = compression and bokeh).
Use the Aperture to drive depth-of-field language (f/0.95–f/2 = shallow + creamy bokeh, f/2.8–f/5.6 = balanced, f/8+ = deep focus). "Auto" = let the scene decide.
Mention these explicitly in directorNotes so the user knows they were honoured.
Keep subtitle timings inside the validated requested duration.`;

function resolveCinemaModel(raw: Partial<CinemaRenderInput> & Record<string, unknown>) {
  const requestedId = typeof raw?.modelId === "string" ? raw.modelId : "";
  const requestedRoute = typeof raw?.modelRoute === "string" ? raw.modelRoute : "";
  const byId = requestedId ? getModelById(requestedId) : undefined;
  const byRoute = requestedRoute ? VIDEO_MODEL_REGISTRY.find((m) => m.api_route === requestedRoute) : undefined;
  const model = byId ?? byRoute ?? VIDEO_MODEL_REGISTRY[0];
  if (model.capabilities.requires_image || model.capabilities.requires_video) {
    throw new Error(`${model.name} is not available on this text-to-video page because it requires image/video input.`);
  }
  return model;
}

function extractText(response: any): string {
  return String(
    response?.text ??
    response?.candidates?.[0]?.content?.parts?.[0]?.text ??
    "",
  ).trim();
}

function parseJsonObject(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  }
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.length > 0) : [];
}

function firstString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const record = payload as Record<string, unknown>;
  return String(
    record.error ??
    record.publicError ??
    record.message ??
    record.msg ??
    "",
  ).trim();
}

function isMissingTaskResponse(status: number, payload: unknown): boolean {
  const message = getErrorMessage(payload);
  return (
    status === 404 ||
    status === 410 ||
    /job not found|task not found|not found in cache storage|expired/i.test(message)
  );
}

function buildFinalCinemaPrompt(params: {
  basePrompt: string;
  dialogueText: string;
  genre: string;
  cameraMovement: string;
  lensType: string;
  cameraBody: string;
  focalLength: number;
  aperture: string;
  colorPalette: string;
  lightingStyle: string;
  cameraMovesetStyle: string;
  voiceDirection: string;
  clonedVoiceAudioUrl?: string | null;
  sound: boolean;
  negativePrompt?: string | null;
}) {
  const {
    basePrompt,
    dialogueText,
    genre,
    cameraMovement,
    lensType,
    cameraBody,
    focalLength,
    aperture,
    colorPalette,
    lightingStyle,
    cameraMovesetStyle,
    voiceDirection,
    clonedVoiceAudioUrl,
    sound,
    negativePrompt,
  } = params;

  const lines = [
    basePrompt,
    "",
    "Mandatory cinema controls:",
    `- Genre / mood: ${genre}. Apply this mood visibly to atmosphere, pacing, acting tone, and production design.`,
    `- Color palette / LUT: ${colorPalette}. This is a required grade direction, not optional UI metadata.`,
    `- Lighting: ${lightingStyle}. Shape the scene lighting according to this preset.`,
    `- Camera body: ${cameraBody}. Reflect its color science and texture in the image.`,
    `- Lens: ${lensType}. Use this optical character in composition, bokeh, distortion, compression, and focus falloff.`,
    `- Focal length: ${focalLength}mm. Frame the subject according to this focal length.`,
    `- Aperture: ${aperture}. Use matching depth of field.`,
    `- Camera movement: ${cameraMovement}. The shot motion must follow this movement.`,
    `- Movement style/speed: ${cameraMovesetStyle}. Apply this motion behavior to the camera.`,
  ];

  if (dialogueText) {
    lines.push(
      `- Spoken dialogue: "${dialogueText}"`,
      `- Voice direction: ${voiceDirection || "Natural cinematic voice"}. Match the delivery, accent, emotion, and pacing to this direction.`,
    );
    if (clonedVoiceAudioUrl) {
      lines.push("- Voice clone: use the provided reference audio URL as the target voice identity when the selected video model supports reference audio.");
    }
  } else if (sound) {
    lines.push(`- Audio direction: generate native cinematic ambience and sound effects. Voice direction: ${voiceDirection || "Natural cinematic voice"}.`);
  }

  if (negativePrompt) {
    lines.push(`- Avoid: ${negativePrompt}`);
  }

  lines.push("Do not ignore any cinema control above. They are part of the render request.");
  return lines.filter(Boolean).join("\n");
}

function buildProviderPayload(
  raw: Partial<CinemaRenderInput> & Record<string, unknown>,
  input: CinemaRenderInput,
  model: ReturnType<typeof resolveCinemaModel>,
  safeDuration: number,
  resolution: string,
  aspectRatio: string,
) {
  const caps = model.capabilities;
  const referenceImages = asStringArray(raw.referenceImages).slice(0, caps.max_reference_images);
  const endFrameUrl = firstString(raw.endFrameUrl);
  const negativePrompt = firstString(raw.negativePrompt);
  const seedRaw = raw.seed;
  const seed = typeof seedRaw === "number"
    ? seedRaw
    : typeof seedRaw === "string" && seedRaw.trim()
      ? Number.parseInt(seedRaw, 10)
      : undefined;
  const cfgScale = typeof raw.cfgScale === "number" ? raw.cfgScale : undefined;
  const sound = raw.sound === true;
  const grokMode = firstString(raw.grokMode) ?? "normal";
  const genre = firstString(raw.genre) ?? input.genre ?? "General Cinema";
  const voiceDirection = firstString(raw.voiceDirection) ?? input.voiceDirection ?? input.voiceId ?? "Natural cinematic voice";
  const clonedVoiceAudioUrl = firstString(raw.clonedVoiceAudioUrl);
  const colorPalette = firstString(raw.colorPalette) ?? "Auto";
  const lightingStyle = firstString(raw.lightingStyle) ?? "Auto";
  const cameraMovesetStyle = firstString(raw.cameraMovesetStyle) ?? "Auto";
  const cameraBody = firstString(raw.cameraBody) ?? "Clean Digital";
  const focalLengthRaw = Number(raw.focalLength);
  const focalLength = Number.isFinite(focalLengthRaw) && focalLengthRaw > 0 ? Math.min(2000, Math.max(1, Math.round(focalLengthRaw))) : 85;
  const aperture = firstString(raw.aperture) ?? "Auto";
  const finalPrompt = buildFinalCinemaPrompt({
    basePrompt: input.prompt,
    dialogueText: input.dialogueText ?? "",
    genre,
    cameraMovement: input.cameraMovement ?? "Dolly Zoom",
    lensType: input.lensType ?? "85mm Anamorphic Cinema",
    cameraBody,
    focalLength,
    aperture,
    colorPalette,
    lightingStyle,
    cameraMovesetStyle,
    voiceDirection,
    clonedVoiceAudioUrl,
    sound,
    negativePrompt,
  });

  const payload: Record<string, unknown> = {
    prompt: finalPrompt,
    duration: safeDuration,
    resolution: resolution || caps.resolutions[0] || "720p",
    quality: resolution || caps.resolutions[0] || "720p",
    mode: resolution || caps.resolutions[0] || "std",
    aspect_ratio: aspectRatio || caps.aspect_ratios[0] || "16:9",
    aspectRatio: aspectRatio || caps.aspect_ratios[0] || "16:9",
    sound,
    generate_audio: sound,
    genre,
    camera_movement: input.cameraMovement,
    lens_type: input.lensType,
    camera_body: cameraBody,
    focal_length: focalLength,
    aperture,
    color_palette: colorPalette,
    lighting_style: lightingStyle,
    camera_moveset_style: cameraMovesetStyle,
    voice_direction: voiceDirection,
  };

  if (input.dialogueText) {
    payload.dialogue = input.dialogueText;
    payload.audio_prompt = input.dialogueText;
  }
  if (clonedVoiceAudioUrl) {
    payload.audio_url = clonedVoiceAudioUrl;
    payload.reference_audio_urls = [clonedVoiceAudioUrl];
  }
  if (referenceImages.length > 0) {
    payload.reference_image_urls = referenceImages;
    payload.image_urls = referenceImages;
    payload.image = referenceImages[0];
    payload.image_url = referenceImages[0];
    payload.first_frame_url = referenceImages[0];
  }
  if (endFrameUrl) {
    payload.end_image = endFrameUrl;
    payload.last_image = endFrameUrl;
    payload.last_frame_url = endFrameUrl;
    if (referenceImages.length > 0) payload.image_urls = [referenceImages[0], endFrameUrl];
  }
  if (negativePrompt && caps.has_negative_prompt) payload.negative_prompt = negativePrompt;
  if (typeof cfgScale === "number" && caps.has_cfg_scale) payload.cfg_scale = cfgScale;
  if (Number.isFinite(seed)) payload.seed = seed;
  if (model.family === "grok") payload.mode = grokMode;

  return payload;
}

async function proxyVideoRequest(req: Request, body: Record<string, unknown>) {
  const url = new URL(req.url);
  const response = await fetch(`${url.origin}/api/video`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: req.headers.get("cookie") ?? "",
      "x-forwarded-for": getClientIp(req),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

export async function POST(req: Request) {
  try {
    if (!isAllowedOrigin(req.headers.get("origin"))) {
      return new NextResponse("Origin not allowed", { status: 403 });
    }

    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const ip = getClientIp(req);
    const rate = checkRateLimit(`cinema-studio-vso:${userId}:${ip}`, 20, 60_000);
    if (!rate.allowed) {
      return new NextResponse("Too many requests", {
        status: 429,
        headers: rateLimitHeaders(rate),
      });
    }

    const raw = (await req.json().catch(() => null)) as (Partial<CinemaRenderInput> & Record<string, unknown>) | null;
    const prompt = sanitizePrompt(typeof raw?.prompt === "string" ? raw.prompt : "");
    if (!prompt || prompt.length < 4) {
      return NextResponse.json({ error: "Description prompt is required." }, { status: 400 });
    }

    const model = resolveCinemaModel(raw ?? {});
    const duration = Number(raw?.duration);
    const allowedDurations = model.capabilities.durations;
    const safeDuration = allowedDurations.includes(duration) ? duration : allowedDurations[0] ?? 8;
    const resolution = sanitizePrompt(typeof raw?.resolution === "string" ? raw.resolution : "").slice(0, 20);
    const aspectRatio = sanitizePrompt(typeof raw?.aspectRatio === "string" ? raw.aspectRatio : "").slice(0, 20);
    const voiceId = sanitizePrompt(typeof raw?.voiceId === "string" ? raw.voiceId : "").slice(0, 120);
    const genre = sanitizePrompt(typeof raw?.genre === "string" ? raw.genre : "General Cinema").slice(0, 80);
    const voiceDirection = sanitizePrompt(typeof raw?.voiceDirection === "string" ? raw.voiceDirection : "").slice(0, 240);
    const clonedVoiceAudioUrl = isSafePublicHttpUrl(typeof raw?.clonedVoiceAudioUrl === "string" ? raw.clonedVoiceAudioUrl : "")
      ? String(raw?.clonedVoiceAudioUrl)
      : "";
    const colorPalette = sanitizePrompt(typeof raw?.colorPalette === "string" ? raw.colorPalette : "Auto").slice(0, 80);
    const lightingStyle = sanitizePrompt(typeof raw?.lightingStyle === "string" ? raw.lightingStyle : "Auto").slice(0, 80);
    const cameraMovesetStyle = sanitizePrompt(typeof raw?.cameraMovesetStyle === "string" ? raw.cameraMovesetStyle : "Auto").slice(0, 80);
    const batchSize = sanitizePrompt(typeof raw?.batchSize === "string" ? raw.batchSize : "1/4").slice(0, 20);
    const negativePrompt = sanitizePrompt(typeof raw?.negativePrompt === "string" ? raw.negativePrompt : "").slice(0, 1200);
    const cameraBody = sanitizePrompt(typeof raw?.cameraBody === "string" ? raw.cameraBody : "Clean Digital").slice(0, 80);
    const focalLengthRaw = Number(raw?.focalLength);
    const focalLength = Number.isFinite(focalLengthRaw) && focalLengthRaw > 0 ? Math.min(2000, Math.max(1, Math.round(focalLengthRaw))) : 85;
    const aperture = sanitizePrompt(typeof raw?.aperture === "string" ? raw.aperture : "Auto").slice(0, 16);

    const input: CinemaRenderInput = {
      prompt,
      dialogueText: sanitizePrompt(typeof raw?.dialogueText === "string" ? raw.dialogueText : "").slice(0, 1200),
      cameraMovement: sanitizePrompt(typeof raw?.cameraMovement === "string" ? raw.cameraMovement : "Dolly Zoom").slice(0, 160),
      lensType: sanitizePrompt(typeof raw?.lensType === "string" ? raw.lensType : "85mm Anamorphic Cinema").slice(0, 160),
      voiceId,
      genre,
      voiceDirection,
    };

    let data = generateProceduralCinemaScene(input);

    try {
      const ai = getGenAI();
      const response: any = await (ai.models as any).generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${SYSTEM}

Prompt:
${input.prompt}

Dialogue:
${input.dialogueText || "(none)"}

Genre / mood:
${input.genre || "General Cinema"}

Camera movement:
${input.cameraMovement}

Lens:
${input.lensType}

Camera body:
${cameraBody}

Focal length:
${focalLength}mm

Aperture:
${aperture}

Voice reference:
${input.voiceId || "(default)"}

Voice direction:
${input.voiceDirection || "(natural cinematic delivery)"}

Cloned voice audio:
${clonedVoiceAudioUrl || "(none)"}

Selected video model:
${model.name} (${model.api_route})

Validated output settings:
duration=${safeDuration}s, aspect_ratio=${aspectRatio || "(model default)"}, resolution=${resolution || "(model default)"}

Look and production settings:
palette=${colorPalette}, lighting=${lightingStyle}, camera_moveset=${cameraMovesetStyle}, batch=${batchSize}

Negative prompt:
${negativePrompt || "(none)"}`,
              },
            ],
          },
        ],
        config: {
          temperature: 0.75,
          maxOutputTokens: 1800,
          responseMimeType: "application/json",
        },
      });

      const text = extractText(response);
      const parsed = parseJsonObject(text);
      data = normalizeCinemaRender(parsed, input);
    } catch (err) {
      console.error("[cinema-studio-vso] Gemini render fallback:", err);
    }

    const providerPayload = buildProviderPayload(raw ?? {}, input, model, safeDuration, resolution, aspectRatio);
    const videoSubmit = await proxyVideoRequest(req, {
      modelRoute: model.api_route,
      payload: providerPayload,
    });

    if (!videoSubmit.response.ok || !videoSubmit.payload?.taskId) {
      // Surface the REAL error from the provider call instead of the masked
      // "video provider is busy" message that hides the actual failure
      // reason. The page already understands previewOnly mode and shows the
      // scene plan as a fallback — but the user now sees what went wrong
      // (e.g. missing API key, quota exceeded, validation rejection).
      const rawError =
        (typeof videoSubmit.payload?.error === "string" && videoSubmit.payload.error.trim()) ||
        (typeof videoSubmit.payload?.publicError === "string" && videoSubmit.payload.publicError.trim()) ||
        "Video provider did not accept the request.";

      console.error(
        "[cinema-studio-vso] Provider call failed",
        JSON.stringify({
          modelRoute: model.api_route,
          modelName: model.name,
          providerStatus: videoSubmit.response.status,
          providerError: videoSubmit.payload?.error,
          publicError: videoSubmit.payload?.publicError,
          code: videoSubmit.payload?.code,
          providerModel: videoSubmit.payload?.providerModel,
        }),
      );

      return NextResponse.json(
        {
          success: false,
          generationId: `cin_${Date.now().toString(36)}`,
          status: "FAILED",
          progress: 0,
          previewOnly: true,
          providerError: rawError,
          providerStatus: videoSubmit.response.status,
          providerCode: videoSubmit.payload?.code,
          providerModelLabel: videoSubmit.payload?.providerModel,
          model: {
            id: model.id,
            name: model.name,
            route: model.api_route,
          },
          settings: {
            duration: safeDuration,
            resolution,
            aspectRatio,
            genre,
            voiceId,
            voiceDirection,
            clonedVoiceAudioUrl,
            colorPalette,
            lightingStyle,
            cameraMovesetStyle,
            batchSize,
            cameraBody,
            focalLength,
            aperture,
          },
          // Still return the AI scene plan so the user can see the
          // visual mockup even though the real video did not render.
          data,
        },
        { status: 200 },
      );
    }

    return NextResponse.json({
      success: true,
      generationId: videoSubmit.payload.generationId ?? `cin_${Date.now().toString(36)}`,
      taskId: videoSubmit.payload.taskId,
      status: "PROCESSING",
      progress: 10,
      model: {
        id: model.id,
        name: model.name,
        route: model.api_route,
      },
      settings: {
        duration: safeDuration,
        resolution,
        aspectRatio,
        genre,
        voiceId,
        voiceDirection,
        clonedVoiceAudioUrl,
        colorPalette,
        lightingStyle,
        cameraMovesetStyle,
        batchSize,
      },
      data,
    }, { status: 202 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal Server Error rendering cinema scene";
    console.error("[cinema-studio-vso] render error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams, origin } = new URL(req.url);
    const taskId = searchParams.get("taskId");
    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    const response = await fetch(`${origin}/api/video?taskId=${encodeURIComponent(taskId)}`, {
      method: "GET",
      headers: {
        Cookie: req.headers.get("cookie") ?? "",
        "x-forwarded-for": getClientIp(req),
      },
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      if (isMissingTaskResponse(response.status, payload)) {
        return NextResponse.json({
          taskId,
          status: "FAILED",
          progress: 0,
          outputs: [],
          videoUrl: null,
          error: "Render job expired or was not found. Please start a new render.",
          terminal: true,
        });
      }

      return NextResponse.json(payload ?? { error: "Failed to query video task" }, { status: response.status });
    }

    const status = String(payload?.status || "").toLowerCase();
    const outputs = asStringArray(payload?.outputs);
    return NextResponse.json({
      taskId,
      status: status === "completed" ? "COMPLETED" : status === "failed" ? "FAILED" : "PROCESSING",
      progress: status === "completed" ? 100 : status === "failed" ? 0 : 35,
      outputs,
      videoUrl: outputs[0] ?? null,
      error: payload?.error ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal Server Error polling cinema render";
    console.error("[cinema-studio-vso] poll error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
