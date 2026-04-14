import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { get3DCredits } from "@/lib/credit-pricing";
import { InsufficientCreditsError, rollbackGenerationCharge, setGenerationMediaUrl, setGenerationTaskMarker, spendCredits } from "@/lib/credit-ledger";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp, isAllowedOrigin, sanitizePrompt } from "@/lib/security";
import prismadb from "@/lib/prismadb";

const WAVESPEED_BASE = "https://api.wavespeed.ai/api/v3";
const KIE_BASE = "https://api.kie.ai/api/v1";

// Keep this list strict: only add models that are verified to work on KIE 3D endpoints.
const KIE_3D_MODELS = new Set<string>([]);

async function uploadImageToWaveSpeed(base64DataUri: string, apiKey: string): Promise<string> {
  const matches = base64DataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) throw new Error("Invalid base64 data URI");

  const mimeType = matches[1];
  const buffer = Buffer.from(matches[2], "base64");
  const ext = mimeType.split("/")[1] ?? "png";

  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(buffer)], { type: mimeType }), `image.${ext}`);

  const res = await fetch(`${WAVESPEED_BASE}/media/upload/binary`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`WaveSpeed upload failed (${res.status}): ${msg}`);
  }

  const json = await res.json();
  const url: string = json?.data?.download_url;
  if (!url) throw new Error("WaveSpeed upload returned no download_url");
  return url;
}

const ENDPOINTS: Record<string, string> = {
  "tripo3d-2.5.image": "tripo3d/v2.5/image-to-3d",
  "tripo3d-2.5.multiview": "tripo3d/v2.5/multiview-to-3d",
  "hunyuan3d-3.1.text": "wavespeed-ai/hunyuan-3d-v3.1/text-to-3d-rapid",
  "hunyuan3d-3.1.image": "wavespeed-ai/hunyuan-3d-v3.1/image-to-3d-rapid",
  "hunyuan3d-3.text": "wavespeed-ai/hunyuan3d-v3/text-to-3d",
  "hunyuan3d-3.image": "wavespeed-ai/hunyuan3d-v3/image-to-3d",
  "hunyuan3d-3.sketch": "wavespeed-ai/hunyuan3d-v3/sketch-to-3d",
  "meshy-6.text": "wavespeed-ai/meshy6/text-to-3d",
  "meshy-6.image": "wavespeed-ai/meshy6/image-to-3d",
  "hyper3d-rodin-2.text": "hyper3d/rodin-v2/text-to-3d",
  "hyper3d-rodin-2.image": "hyper3d/rodin-v2/image-to-3d",
};

interface RequestBody {
  modelId: string;
  mode: string;
  prompt?: string;
  imageBase64?: string;
  multiviewBase64s?: { front?: string; back?: string; left?: string; right?: string };
  optionalViewBase64s?: { back?: string; left?: string; right?: string };
  generateType?: string;
  faceCount?: number;
  enablePbr?: boolean;
  artStyle?: string;
  topology?: string;
  symmetryMode?: string;
  targetPolycount?: number;
  shouldRemesh?: boolean;
  meshyEnablePbr?: boolean;
  taPose?: boolean;
  promptExpansion?: boolean;
  shouldTexture?: boolean;
  material?: string;
  outputFormat?: string;
  qualityAndMesh?: string;
  seed?: number;
}

export async function POST(req: Request) {
  let chargedCredits = 0;
  let chargedUserId: string | null = null;
  let generationId: string | null = null;

  try {
    if (!isAllowedOrigin(req.headers.get("origin"))) {
      return new NextResponse("Origin not allowed", { status: 403 });
    }

    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const ip = getClientIp(req);
    const rate = checkRateLimit(`3d:${userId}:${ip}`, 20, 60_000);
    if (!rate.allowed) {
      return new NextResponse("Too many requests", { status: 429, headers: rateLimitHeaders(rate) });
    }

    const body = await req.json() as RequestBody;
    const {
      modelId, mode, prompt,
      imageBase64, multiviewBase64s, optionalViewBase64s,
      generateType, faceCount, enablePbr,
      artStyle, topology, symmetryMode, targetPolycount, shouldRemesh, meshyEnablePbr,
      taPose, promptExpansion, shouldTexture,
      material, outputFormat, qualityAndMesh, seed,
    } = body;

    if (!modelId) return new NextResponse("modelId is required", { status: 400 });
    if (!mode) return new NextResponse("mode is required", { status: 400 });

    const endpointKey = `${modelId}.${mode}`;
    const endpoint = ENDPOINTS[endpointKey];
    if (!endpoint) return new NextResponse(`Unknown model/mode: ${endpointKey}`, { status: 400 });

    if (mode === "text" && !prompt?.trim()) {
      return new NextResponse("prompt is required for text mode", { status: 400 });
    }
    if (mode === "sketch" && (!prompt?.trim() || !imageBase64)) {
      return new NextResponse("prompt and image are required for sketch mode", { status: 400 });
    }
    if (mode === "image" && !imageBase64) {
      return new NextResponse("image is required for image mode", { status: 400 });
    }
    if (mode === "multiview") {
      const mv = multiviewBase64s;
      if (!mv?.front || !mv?.back || !mv?.left || !mv?.right) {
        return new NextResponse("All 4 multiview images are required", { status: 400 });
      }
    }

    const creditsToCharge = get3DCredits(modelId, mode);
    if (creditsToCharge <= 0) {
      return new NextResponse(`No credit configuration for ${endpointKey}`, { status: 400 });
    }

    const charge = await spendCredits({
      userId,
      credits: creditsToCharge,
      prompt: prompt ? sanitizePrompt(prompt, 2000) : `${modelId} ${mode}`,
      assetType: "3D",
      modelUsed: endpointKey,
    });
    generationId = charge.generationId;
    chargedCredits = creditsToCharge;
    chargedUserId = userId;

    const waveKey = process.env.WAVESPEED_API_KEY;
    const kieKey = process.env.KIE_API_KEY || process.env.KIEAI_API_KEY;

    const provider: "kie" | "wavespeed" =
      KIE_3D_MODELS.has(modelId) && !!kieKey ? "kie" : "wavespeed";

    if (provider === "wavespeed" && !waveKey) {
      throw new Error("WAVESPEED_API_KEY not configured");
    }
    if (provider === "kie" && !kieKey) {
      throw new Error("KIE_API_KEY not configured");
    }

    let requestBody: Record<string, unknown> = {};

    if (modelId === "tripo3d-2.5" && mode === "image" && imageBase64) {
      const imageUrl = await uploadImageToWaveSpeed(imageBase64, waveKey!);
      requestBody = { image: imageUrl };
    } else if (modelId === "tripo3d-2.5" && mode === "multiview" && multiviewBase64s) {
      const [frontUrl, backUrl, leftUrl, rightUrl] = await Promise.all([
        uploadImageToWaveSpeed(multiviewBase64s.front!, waveKey!),
        uploadImageToWaveSpeed(multiviewBase64s.back!, waveKey!),
        uploadImageToWaveSpeed(multiviewBase64s.left!, waveKey!),
        uploadImageToWaveSpeed(multiviewBase64s.right!, waveKey!),
      ]);
      requestBody = {
        front_image_url: frontUrl,
        back_image_url: backUrl,
        left_image_url: leftUrl,
        right_image_url: rightUrl,
      };
    } else if (modelId === "hunyuan3d-3.1" && mode === "text") {
      requestBody = { prompt };
    } else if (modelId === "hunyuan3d-3.1" && mode === "image" && imageBase64) {
      const imageUrl = await uploadImageToWaveSpeed(imageBase64, waveKey!);
      requestBody = { image: imageUrl };
    } else if (modelId === "hunyuan3d-3" && mode === "text") {
      requestBody = {
        prompt,
        generate_type: generateType ?? "Normal",
        face_count: faceCount ?? 500000,
        enable_pbr: enablePbr ?? false,
      };
    } else if (modelId === "hunyuan3d-3" && mode === "image" && imageBase64) {
      const imageUrl = await uploadImageToWaveSpeed(imageBase64, waveKey!);
      const imageModeBody: Record<string, unknown> = {
        image: imageUrl,
        generate_type: generateType ?? "Normal",
        face_count: faceCount ?? 500000,
        enable_pbr: enablePbr ?? false,
      };
      if (optionalViewBase64s?.back) imageModeBody.back_image = await uploadImageToWaveSpeed(optionalViewBase64s.back, waveKey!);
      if (optionalViewBase64s?.left) imageModeBody.left_image = await uploadImageToWaveSpeed(optionalViewBase64s.left, waveKey!);
      if (optionalViewBase64s?.right) imageModeBody.right_image = await uploadImageToWaveSpeed(optionalViewBase64s.right, waveKey!);
      requestBody = imageModeBody;
    } else if (modelId === "hunyuan3d-3" && mode === "sketch" && imageBase64) {
      const imageUrl = await uploadImageToWaveSpeed(imageBase64, waveKey!);
      requestBody = {
        image: imageUrl,
        prompt,
        face_count: faceCount ?? 500000,
        enable_pbr: enablePbr ?? false,
      };
    } else if (modelId === "meshy-6" && mode === "text") {
      requestBody = {
        prompt,
        art_style: artStyle ?? "realistic",
        topology: topology ?? "triangle",
        target_polycount: targetPolycount ?? 30000,
        symmetry_mode: symmetryMode ?? "auto",
        should_remesh: shouldRemesh ?? true,
        enable_pbr: meshyEnablePbr ?? false,
        ta_pose: taPose ?? false,
        enable_prompt_expansion: promptExpansion ?? false,
      };
    } else if (modelId === "meshy-6" && mode === "image" && imageBase64) {
      const imageUrl = await uploadImageToWaveSpeed(imageBase64, waveKey!);
      requestBody = {
        image: imageUrl,
        topology: topology ?? "triangle",
        target_polycount: targetPolycount ?? 30000,
        symmetry_mode: symmetryMode ?? "auto",
        should_remesh: shouldRemesh ?? true,
        should_texture: shouldTexture ?? true,
        enable_pbr: meshyEnablePbr ?? false,
        ta_pose: taPose ?? false,
      };
    } else if (modelId === "hyper3d-rodin-2" && mode === "text") {
      requestBody = {
        prompt,
        material: material ?? "PBR",
        quality_and_mesh: qualityAndMesh ?? "4k_Quad",
        geometry_file_format: outputFormat ?? "glb",
        seed: seed ?? 0,
      };
    } else if (modelId === "hyper3d-rodin-2" && mode === "image" && imageBase64) {
      const imageUrl = await uploadImageToWaveSpeed(imageBase64, waveKey!);
      const textOrImageBody: Record<string, unknown> = {
        images: [imageUrl],
        material: material ?? "PBR",
        quality_and_mesh: qualityAndMesh ?? "4k_Quad",
        geometry_file_format: outputFormat ?? "glb",
        seed: seed ?? 0,
      };
      if (prompt?.trim()) textOrImageBody.prompt = prompt;
      requestBody = textOrImageBody;
    }

    const response = provider === "kie"
      ? await fetch(`${KIE_BASE}/jobs/createTask`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${kieKey!}`,
          },
          body: JSON.stringify({
            model: endpoint,
            callBackUrl: "",
            input: requestBody,
            config: {
              serviceMode: "",
              webhookConfig: {
                endpoint: "",
                secret: "",
              },
            },
          }),
        })
      : await fetch(`${WAVESPEED_BASE}/${endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${waveKey!}`,
          },
          body: JSON.stringify(requestBody),
        });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[3D API] WaveSpeed error:", errText);
      return new NextResponse(`WaveSpeed API error: ${errText}`, { status: response.status });
    }

    const data = await response.json();
    const taskId: string = data?.data?.id ?? data?.data?.taskId;
    if (!taskId) return new NextResponse("No task ID returned from WaveSpeed", { status: 502 });
    if (generationId) {
      await setGenerationTaskMarker(generationId, taskId);
    }

    return NextResponse.json({ taskId, provider });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
          requiredCredits: error.requiredCredits,
          currentBalance: error.currentBalance,
        },
        { status: 402 },
      );
    }

    if (chargedCredits > 0 && chargedUserId && generationId) {
      await rollbackGenerationCharge(generationId, chargedUserId, chargedCredits);
    }

    console.error("[3D API POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    if (!isAllowedOrigin(req.headers.get("origin"))) {
      return new NextResponse("Origin not allowed", { status: 403 });
    }

    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const ip = getClientIp(req);
    const rate = checkRateLimit(`3d-status:${userId}:${ip}`, 60, 60_000);
    if (!rate.allowed) {
      return new NextResponse("Too many requests", { status: 429, headers: rateLimitHeaders(rate) });
    }

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return new NextResponse("taskId is required", { status: 400 });
    }

    const waveKey = process.env.WAVESPEED_API_KEY;
    if (!waveKey) {
      throw new Error("WAVESPEED_API_KEY not configured");
    }

    const response = await fetch(
      `${WAVESPEED_BASE}/predictions/${taskId}/result`,
      {
        headers: { Authorization: `Bearer ${waveKey}` },
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      return new NextResponse(`WaveSpeed API error: ${errText}`, { status: response.status });
    }

    const json = await response.json();
    const taskData = json?.data;

    // Normalize status across WaveSpeed status variants
    const rawStatus = String(taskData?.status ?? "unknown").toLowerCase();
    const status =
      ["success", "succeeded", "completed", "done"].includes(rawStatus)
        ? "completed"
        : ["fail", "failed", "error", "canceled", "cancelled"].includes(rawStatus)
          ? "failed"
          : rawStatus === "unknown"
            ? "processing"
            : rawStatus; // queued / running / processing pass through

    // Extract output URLs robustly (WaveSpeed may nest differently per model)
    const rawOutputs: unknown = taskData?.outputs ?? taskData?.result ?? taskData?.urls;
    const outputs: string[] = (() => {
      if (Array.isArray(rawOutputs))
        return rawOutputs.filter((v): v is string => typeof v === "string" && /^https?:\/\//.test(v));
      if (typeof rawOutputs === "string" && /^https?:\/\//.test(rawOutputs))
        return [rawOutputs];
      return [];
    })();

    const linkedGeneration = await prismadb.generation.findFirst({
      where: { userId, mediaUrl: `task:${taskId}` },
      select: { id: true, cost: true },
      orderBy: { createdAt: "desc" },
    });

    if (status === "completed" && outputs[0] && linkedGeneration) {
      await setGenerationMediaUrl(linkedGeneration.id, String(outputs[0]));
    }

    if (status === "failed" && linkedGeneration && linkedGeneration.cost > 0) {
      await rollbackGenerationCharge(linkedGeneration.id, userId, linkedGeneration.cost);
    }

    return NextResponse.json({
      status,
      outputs,
      error: taskData?.error ?? null,
    });
  } catch (error) {
    console.error("[3D API GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

