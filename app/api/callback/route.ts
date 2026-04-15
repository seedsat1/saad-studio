import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { rollbackGenerationCharge, setGenerationMediaUrl } from "@/lib/credit-ledger";

export const dynamic = "force-dynamic";

function normalizeTaskState(status: string) {
  const s = (status || "").toLowerCase();
  if (["success", "succeed", "completed", "done", "finish", "finished"].includes(s))
    return "completed";
  if (["fail", "failed", "error", "canceled", "cancelled"].includes(s)) return "failed";
  return "processing";
}

function extractOutputs(payload: unknown): string[] {
  if (!payload) return [];
  if (typeof payload === "string") {
    try { return extractOutputs(JSON.parse(payload)); } catch { return []; }
  }
  if (Array.isArray(payload)) {
    const direct = payload.filter((v): v is string => typeof v === "string" && /^https?:\/\//.test(v));
    if (direct.length) return direct;
    const fromObjects: string[] = [];
    for (const item of payload) {
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        const url = obj.url ?? obj.videoUrl ?? obj.imageUrl ?? obj.downloadUrl;
        if (typeof url === "string" && /^https?:\/\//.test(url)) fromObjects.push(url);
      }
    }
    return fromObjects;
  }
  if (typeof payload === "object") {
    const data = payload as Record<string, unknown>;
    for (const key of ["resultUrls", "outputs", "urls", "videos", "images", "result", "videoUrl", "imageUrl", "url"]) {
      const extracted = extractOutputs(data[key]);
      if (extracted.length) return extracted;
    }
  }
  return [];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return new NextResponse("Invalid JSON", { status: 400 });

    const data = (body?.data ?? body) as Record<string, unknown>;
    const taskId = String(data?.taskId ?? data?.task_id ?? "");
    if (!taskId) return new NextResponse("Missing taskId", { status: 400 });

    const statusRaw = String(data?.taskStatus ?? data?.status ?? data?.state ?? "");
    const status = normalizeTaskState(statusRaw);

    const outputs = (() => {
      for (const field of [data?.response, data?.resultJson, data?.outputs, data?.result, data?.output, data?.works]) {
        const found = extractOutputs(field);
        if (found.length) return found;
      }
      return [] as string[];
    })();
    const errorMsg = typeof data?.errorMessage === "string" ? data.errorMessage : null;

    // Find the generation row tied to this task
    const generation = await prismadb.generation.findFirst({
      where: { mediaUrl: `task:${taskId}` },
      select: { id: true, userId: true, cost: true },
      orderBy: { createdAt: "desc" },
    });

    if (!generation) {
      // Unknown task — still return 200 so KIE doesn't keep retrying
      console.warn(`[api/callback] Unknown taskId: ${taskId}`);
      return new NextResponse("OK", { status: 200 });
    }

    if (status === "completed" && outputs.length > 0) {
      await setGenerationMediaUrl(generation.id, outputs[0]);
      console.log(`[api/callback] Task ${taskId} completed → ${outputs[0]}`);
    } else if (status === "failed") {
      if (generation.cost > 0) {
        await rollbackGenerationCharge(generation.id, generation.userId, generation.cost);
      }
      // Mark as failed in DB so polling returns failed
      await prismadb.generation.update({
        where: { id: generation.id },
        data: { mediaUrl: `failed:${taskId}${errorMsg ? `:${errorMsg}` : ""}` },
      });
      console.warn(`[api/callback] Task ${taskId} failed: ${errorMsg}`);
    }

    return new NextResponse("OK", { status: 200 });
  } catch (err) {
    console.error("[api/callback] Error", err);
    return new NextResponse("Internal error", { status: 500 });
  }
}
