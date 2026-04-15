import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
import { getVideoCreditsByRoute } from "@/lib/credit-pricing";
import { InsufficientCreditsError, rollbackGenerationCharge, setGenerationMediaUrl, setGenerationTaskMarker, spendCredits } from "@/lib/credit-ledger";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp, isAllowedOrigin, sanitizePrompt } from "@/lib/security";
import prismadb from "@/lib/prismadb";
import { getResolvedKieRoutingMaps } from "@/lib/kie-model-routing";
import { syncKieModelCatalog } from "@/lib/kie-model-sync";

const KIE_BASE = "https://api.kie.ai/api/v1";
const { videoRouteToKieModelMap } = getResolvedKieRoutingMaps();

function getKieKey(): string {
  const key = process.env.KIE_API_KEY || process.env.KIEAI_API_KEY;
  if (!key) throw new Error("KIE API key is not configured");
  return key;
}

function kieHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getKieKey()}`,
  };
}

function extractBase64(raw: string) {
  const match = raw.match(/^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/);
  if (!match) return null;
  const mime = match[1];
  const fileData = match[2];
  const ext = mime.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
  return { mime, fileData, ext };
}

async function uploadDataUrlToKie(value: string): Promise<string> {
  if (!value.startsWith("data:")) return value;
  const parsed = extractBase64(value);
  if (!parsed) return value;

  const uploadRes = await fetch("https://kieai.redpandaai.co/api/file-base64-upload", {
    method: "POST",
    headers: kieHeaders(),
    body: JSON.stringify({
      base64Data: parsed.fileData,
      uploadPath: "video-refs",
      fileName: `upload.${parsed.ext}`,
    }),
  });

  const uploadJson = await uploadRes.json().catch(() => null);
  const maybeUrl =
    uploadJson?.data?.downloadUrl ||
    uploadJson?.data?.download_url ||
    uploadJson?.data?.fileUrl ||
    uploadJson?.data?.file_url ||
    uploadJson?.data?.url ||
    (typeof uploadJson?.data === "string" ? uploadJson.data : undefined) ||
    uploadJson?.fileUrl ||
    uploadJson?.url;

  if (!uploadRes.ok || !maybeUrl) {
    throw new Error(uploadJson?.msg || "KIE file upload failed");
  }

  return String(maybeUrl);
}

async function resolveMediaInInput(input: Record<string, unknown>) {
  const resolved: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string" && ["image", "image_url", "first_frame_url", "last_frame_url", "last_image", "end_image", "video"].includes(key)) {
      resolved[key] = await uploadDataUrlToKie(value);
      continue;
    }

    if (Array.isArray(value) && ["reference_image_urls", "image_urls"].includes(key)) {
      resolved[key] = await Promise.all(
        value.map(async (item) => (typeof item === "string" ? await uploadDataUrlToKie(item) : item)),
      );
      continue;
    }

    resolved[key] = value;
  }

  if (Array.isArray(resolved.kling_elements)) {
    resolved.kling_elements = await Promise.all(
      (resolved.kling_elements as Array<Record<string, unknown>>).map(async (el) => {
        const next = { ...el };
        if (Array.isArray(next.element_input_urls)) {
          next.element_input_urls = await Promise.all(
            (next.element_input_urls as unknown[]).map(async (v) =>
              typeof v === "string" ? await uploadDataUrlToKie(v) : v,
            ),
          );
        }
        return next;
      }),
    );
  }

  return resolved;
}

function normalizeInputForKie(payload: Record<string, unknown>) {
  return { ...payload };
}

function mapToKieInput(model: string, payload: Record<string, unknown>) {
  const input: Record<string, unknown> = { ...payload };

  const startImage =
    (typeof input.first_frame_url === "string" ? input.first_frame_url : null) ||
    (typeof input.image_url === "string" ? input.image_url : null) ||
    (typeof input.image === "string" ? input.image : null);
  const endImage =
    (typeof input.last_frame_url === "string" ? input.last_frame_url : null) ||
    (typeof input.end_image === "string" ? input.end_image : null) ||
    (typeof input.last_image === "string" ? input.last_image : null);
  const referenceImages = Array.isArray(input.reference_image_urls)
    ? input.reference_image_urls.filter((v): v is string => typeof v === "string")
    : [];
  const motionVideo = typeof input.video === "string" ? input.video : null;

  if (model === "kling-3.0/video") {
    const out: Record<string, unknown> = {};
    const mode = typeof input.mode === "string" ? input.mode : "std";
    const sound = input.sound === true;
    const multiShots = input.multi_shots === true;
    const durationRaw = input.duration;
    const durationValue =
      typeof durationRaw === "number"
        ? durationRaw
        : typeof durationRaw === "string"
          ? Number.parseInt(durationRaw, 10)
          : 5;
    const duration = Number.isFinite(durationValue) ? Math.max(3, Math.min(15, durationValue)) : 5;
    const aspectRatio = typeof input.aspect_ratio === "string" ? input.aspect_ratio : undefined;
    const multiPrompt = Array.isArray(input.multi_prompt)
      ? input.multi_prompt
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const rec = item as Record<string, unknown>;
            const prompt = typeof rec.prompt === "string" ? rec.prompt.trim() : "";
            const shotDurationRaw = rec.duration;
            const shotDuration =
              typeof shotDurationRaw === "number"
                ? shotDurationRaw
                : typeof shotDurationRaw === "string"
                  ? Number.parseInt(shotDurationRaw, 10)
                  : NaN;
            if (!prompt) return null;
            if (!Number.isFinite(shotDuration) || shotDuration < 1 || shotDuration > 12) return null;
            return { prompt, duration: shotDuration };
          })
          .filter((x): x is { prompt: string; duration: number } => x !== null)
      : [];

    out.mode = mode;
    out.sound = sound;
    out.duration = String(duration);
    if (aspectRatio) out.aspect_ratio = aspectRatio;
    out.multi_shots = multiShots;

    if (multiShots) {
      out.multi_prompt = multiPrompt;
      if (referenceImages.length > 0) {
        out.image_urls = [referenceImages[0]];
      } else if (startImage) {
        out.image_urls = [startImage];
      }
      if (typeof input.prompt === "string") out.prompt = "";
    } else {
      out.prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
      out.multi_prompt = [];
      if (referenceImages.length > 0) {
        out.image_urls = referenceImages.slice(0, 2);
      } else if (startImage && endImage) {
        out.image_urls = [startImage, endImage];
      } else if (startImage) {
        out.image_urls = [startImage];
      }
    }

    if (Array.isArray(input.kling_elements)) {
      out.kling_elements = (input.kling_elements as Array<Record<string, unknown>>)
        .map((el) => {
          const name = typeof el.name === "string" ? el.name.trim() : "";
          const description = typeof el.description === "string" ? el.description.trim() : "";
          const urls = Array.isArray(el.element_input_urls)
            ? (el.element_input_urls as unknown[]).filter((v): v is string => typeof v === "string" && v.trim().length > 0)
            : [];
          if (!name || !description || urls.length < 2 || urls.length > 4) return null;
          return { name, description, element_input_urls: urls };
        })
        .filter((x) => x !== null);
    }

    return out;
  }

  if (model === "kling-3.0/motion-control") {
    if (startImage) input.input_urls = [startImage];
    if (motionVideo) input.video_urls = [motionVideo];
  } else {
    if (referenceImages.length) {
      input.image_urls = referenceImages;
    } else if (startImage && endImage) {
      input.image_urls = [startImage, endImage];
    } else if (startImage) {
      input.image_urls = [startImage];
    }
  }

  delete input.image;
  delete input.image_url;
  delete input.first_frame_url;
  delete input.last_frame_url;
  delete input.end_image;
  delete input.last_image;
  delete input.reference_image_urls;
  delete input.video;

  if (typeof input.duration === "number") {
    input.duration = String(input.duration);
  }

  return input;
}

function normalizeTaskState(status: string) {
  const s = (status || "").toLowerCase();
  if (["success", "succeed", "completed", "done", "finish", "finished"].includes(s)) return "completed";
  if (["fail", "failed", "error", "canceled", "cancelled"].includes(s)) return "failed";
  return "processing";
}

function extractOutputs(resultPayload: unknown): string[] {
  if (!resultPayload) return [];

  if (typeof resultPayload === "string") {
    try {
      const parsed = JSON.parse(resultPayload);
      return extractOutputs(parsed);
    } catch {
      return [];
    }
  }

  if (Array.isArray(resultPayload)) {
    const direct = resultPayload.filter((v): v is string => typeof v === "string" && /^https?:\/\//.test(v));
    if (direct.length) return direct;
    // Handle array of objects with url/videoUrl/imageUrl fields
    const fromObjects: string[] = [];
    for (const item of resultPayload) {
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        const url = obj.url ?? obj.videoUrl ?? obj.imageUrl ?? obj.downloadUrl;
        if (typeof url === "string" && /^https?:\/\//.test(url)) fromObjects.push(url);
      }
    }
    return fromObjects;
  }

  if (typeof resultPayload === "object") {
    const data = resultPayload as Record<string, unknown>;
    const candidates = [
      data.resultUrls,
      data.outputs,
      data.urls,
      data.videos,
      data.images,
      data.result,
      data.videoUrl,
      data.imageUrl,
      data.url,
    ];
    for (const candidate of candidates) {
      const extracted = extractOutputs(candidate);
      if (extracted.length) return extracted;
    }
  }

  return [];
}

function validateKling30Payload(payload: Record<string, unknown>): string | null {
  const mode = typeof payload.mode === "string" ? payload.mode : "std";
  if (!["std", "pro"].includes(mode)) return "Kling 3.0 mode must be std or pro.";

  const durationRaw = payload.duration;
  const duration =
    typeof durationRaw === "number"
      ? durationRaw
      : typeof durationRaw === "string"
        ? Number.parseInt(durationRaw, 10)
        : NaN;
  if (!Number.isFinite(duration) || duration < 3 || duration > 15) {
    return "Kling 3.0 duration must be between 3 and 15 seconds.";
  }

  const multiShots = payload.multi_shots === true;
  const prompt = typeof payload.prompt === "string" ? payload.prompt.trim() : "";
  const imageUrls = Array.isArray(payload.image_urls)
    ? payload.image_urls.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    : [];

  if (!multiShots) {
    if (!prompt) return "Kling 3.0 single-shot requires prompt.";
    if (imageUrls.length > 2) return "Kling 3.0 supports at most 2 image_urls in single-shot.";
  }

  const shots = Array.isArray(payload.multi_prompt) ? payload.multi_prompt : [];
  if (multiShots) {
    if (shots.length < 1 || shots.length > 5) return "Kling 3.0 multi-shot supports 1 to 5 shots.";
    if (imageUrls.length > 1) return "Kling 3.0 multi-shot supports only first frame image.";
    let sum = 0;
    for (const item of shots) {
      if (!item || typeof item !== "object") return "Invalid multi_prompt entry.";
      const record = item as Record<string, unknown>;
      const shotPrompt = typeof record.prompt === "string" ? record.prompt.trim() : "";
      const shotDuration =
        typeof record.duration === "number"
          ? record.duration
          : typeof record.duration === "string"
            ? Number.parseInt(record.duration, 10)
            : NaN;
      if (!shotPrompt || shotPrompt.length > 500) return "Each multi-shot prompt must be 1..500 chars.";
      if (!Number.isFinite(shotDuration) || shotDuration < 1 || shotDuration > 12) {
        return "Each multi-shot duration must be 1..12 seconds.";
      }
      sum += shotDuration;
    }
    if (sum !== duration) return "Sum of multi-shot durations must equal total duration.";
  }

  const klingElements = Array.isArray(payload.kling_elements) ? payload.kling_elements : [];
  if (klingElements.length > 3) return "Kling 3.0 supports maximum 3 elements.";
  if (klingElements.length > 0) {
    const allPrompts = [
      prompt,
      ...shots
        .map((s) => (s && typeof s === "object" && typeof (s as Record<string, unknown>).prompt === "string"
          ? String((s as Record<string, unknown>).prompt)
          : ""))
        .filter(Boolean),
    ].join(" ");

    for (const el of klingElements) {
      if (!el || typeof el !== "object") return "Invalid kling_elements entry.";
      const record = el as Record<string, unknown>;
      const name = typeof record.name === "string" ? record.name.trim() : "";
      const desc = typeof record.description === "string" ? record.description.trim() : "";
      const urls = Array.isArray(record.element_input_urls)
        ? record.element_input_urls.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
        : [];
      if (!name || !desc) return "Each element must include name and description.";
      if (urls.length < 2 || urls.length > 4) return `Element ${name} must include 2 to 4 URLs.`;
      if (!allPrompts.includes(`@${name}`)) return `Element @${name} is not referenced in prompts.`;
    }
  }

  return null;
}

export async function POST(req: Request) {
  let chargedCredits = 0;
  let chargedUserId: string | null = null;
  let generationId: string | null = null;

  try {
    await syncKieModelCatalog(false).catch(() => null);

    if (!isAllowedOrigin(req.headers.get("origin"))) {
      return new NextResponse("Origin not allowed", { status: 403 });
    }

    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const ip = getClientIp(req);
    const rate = checkRateLimit(`video:${userId}:${ip}`, 20, 60_000);
    if (!rate.allowed) {
      return new NextResponse("Too many requests", { status: 429, headers: rateLimitHeaders(rate) });
    }

    const body = await req.json();
    const { modelRoute, payload } = body as {
      modelRoute?: string;
      payload?: Record<string, unknown>;
    };

    if (!modelRoute || typeof modelRoute !== "string") {
      return new NextResponse("modelRoute is required", { status: 400 });
    }

    if (!payload || typeof payload !== "object") {
      return new NextResponse("payload is required", { status: 400 });
    }

    const kieModel = videoRouteToKieModelMap[modelRoute];
    if (!kieModel) {
      return NextResponse.json(
        { error: `No KIE model mapping for route: ${modelRoute}` },
        { status: 400 },
      );
    }

    const creditsToCharge = getVideoCreditsByRoute(modelRoute, payload);
    if (creditsToCharge <= 0) {
      return new NextResponse("No credit configuration for this model", { status: 400 });
    }

    const normalizedInput = normalizeInputForKie(payload);
    const resolvedInput = await resolveMediaInInput(normalizedInput);
    const kieInput = mapToKieInput(kieModel, resolvedInput);

    if (kieModel === "kling-3.0/video") {
      const klingError = validateKling30Payload(kieInput);
      if (klingError) {
        return NextResponse.json({ error: klingError }, { status: 400 });
      }
    }

    const charge = await spendCredits({
      userId,
      credits: creditsToCharge,
      prompt: typeof payload.prompt === "string" ? sanitizePrompt(payload.prompt, 5000) : "Video generation",
      assetType: "VIDEO",
      modelUsed: modelRoute,
    });
    generationId = charge.generationId;
    chargedCredits = creditsToCharge;
    chargedUserId = userId;

    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://example.com"}/api/callback`;

    const createRes = await fetch(`${KIE_BASE}/jobs/createTask`, {
      method: "POST",
      headers: kieHeaders(),
      body: JSON.stringify({
        model: kieModel,
        callBackUrl: callbackUrl,
        input: kieInput,
      }),
    });

    const createJson = await createRes.json().catch(() => null);
    const taskId = createJson?.data?.taskId || createJson?.taskId;

    if (!createRes.ok || !taskId) {
      if (chargedCredits > 0 && chargedUserId && generationId) {
        await rollbackGenerationCharge(generationId, chargedUserId, chargedCredits);
      }
      return NextResponse.json(
        { error: createJson?.msg || createJson?.message || "KIE createTask failed" },
        { status: createRes.ok ? 500 : createRes.status },
      );
    }

    if (generationId) {
      await setGenerationTaskMarker(generationId, String(taskId));
    }

    return NextResponse.json({
      taskId: String(taskId),
      status: "processing",
    });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
          requiredCredits: err.requiredCredits,
          currentBalance: err.currentBalance,
        },
        { status: 402 },
      );
    }

    if (chargedCredits > 0 && chargedUserId && generationId) {
      await rollbackGenerationCharge(generationId, chargedUserId, chargedCredits);
    }

    const msg = err instanceof Error ? err.message : "Internal Error";
    console.error("[api/video POST]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");

    if (!taskId || typeof taskId !== "string") {
      return new NextResponse("taskId is required", { status: 400 });
    }

    const pollRes = await fetch(`${KIE_BASE}/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, {
      method: "GET",
      headers: kieHeaders(),
      cache: "no-store",
    });

    const pollJson = await pollRes.json().catch(() => null);

    // KIE uses code: 200 for success, but fallback: if HTTP is OK and data exists, treat as success
    const kieCodeOk = pollJson?.code == null || pollJson.code === 200 || pollJson.code === 0;
    if (!pollRes.ok || !kieCodeOk) {
      return NextResponse.json(
        { error: pollJson?.msg || pollJson?.message || "Failed to retrieve task result" },
        { status: pollRes.ok ? 500 : pollRes.status },
      );
    }

    const data = pollJson?.data ?? {};
    const status = normalizeTaskState(String(data.taskStatus || data.status || ""));
    const outputs = extractOutputs(data.response || data.resultJson || data.outputs || data.result);
    const error = typeof data.errorMessage === "string" ? data.errorMessage : null;

    // DB sync is best-effort; status polling should still work even if DB is temporarily unavailable.
    try {
      const linkedGeneration = await prismadb.generation.findFirst({
        where: { userId, mediaUrl: `task:${taskId}` },
        select: { id: true, cost: true },
        orderBy: { createdAt: "desc" },
      });

      if (status === "completed" && outputs.length > 0 && linkedGeneration) {
        await setGenerationMediaUrl(linkedGeneration.id, outputs[0]);
      }

      if (status === "failed" && linkedGeneration && linkedGeneration.cost > 0) {
        await rollbackGenerationCharge(linkedGeneration.id, userId, linkedGeneration.cost);
      }
    } catch (dbErr) {
      console.error("[api/video GET] non-fatal DB sync error", dbErr);
    }

    return NextResponse.json({
      taskId: String(data.taskId || taskId),
      status,
      outputs,
      error,
    });
  } catch (err) {
    console.error("[api/video GET]", err);
    return NextResponse.json({ error: "Internal error while checking generation status" }, { status: 500 });
  }
}

