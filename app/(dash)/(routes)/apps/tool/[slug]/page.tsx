"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Loader2, Upload } from "lucide-react";
import { APP_TOOL_BY_ID, getAppToolAction } from "@/lib/apps-data";
import { useGenerationGate } from "@/hooks/use-generation-gate";

type ToolAction = ReturnType<typeof getAppToolAction>;

type GenerateResult = {
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  mediaUrl?: string;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function parseError(res: Response): Promise<string> {
  const raw = await res.text();
  if (!raw) return `Request failed (${res.status})`;
  try {
    const json = JSON.parse(raw) as { error?: string; message?: string };
    return json.error || json.message || raw;
  } catch {
    return raw;
  }
}

function endpointFor(action: ToolAction): string {
  if (action === "video") return "/api/video";
  if (action === "audio") return "/api/generate/audio";
  if (action === "remove-bg") return "/api/generate/remove-bg";
  if (action === "upscale") return "/api/generate/upscale";
  if (action === "face-swap") return "/api/generate/face-swap";
  return "/api/generate/image";
}

async function pollVideoTask(taskId: string): Promise<string> {
  for (let attempt = 0; attempt < 90; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 2500));

    const pollRes = await fetch(`/api/video?taskId=${encodeURIComponent(taskId)}`, {
      cache: "no-store",
    });

    if (!pollRes.ok) {
      throw new Error(await parseError(pollRes));
    }

    const pollJson = (await pollRes.json()) as {
      status?: string;
      outputs?: string[];
      error?: string;
    };

    if (pollJson.status === "completed") {
      const url = pollJson.outputs?.[0];
      if (!url) {
        throw new Error("Video task completed without output URL.");
      }
      return url;
    }

    if (pollJson.status === "failed") {
      throw new Error(pollJson.error || "Video generation failed.");
    }
  }

  throw new Error("Video generation timed out.");
}

function estimatedCost(action: ToolAction): number {
  if (action === "video") return 6;
  if (action === "audio") return 1;
  if (action === "remove-bg") return 1;
  if (action === "upscale") return 2;
  if (action === "face-swap") return 4;
  return 2;
}

export default function AppToolRuntimePage({
  params,
}: {
  params: { slug: string };
}) {
  const slug = params.slug;
  const tool = APP_TOOL_BY_ID[slug];
  const action = useMemo(() => getAppToolAction(slug), [slug]);
  const {
    guardGeneration,
    getSafeErrorMessage,
  } = useGenerationGate();

  const [prompt, setPrompt] = useState("");
  const [fileA, setFileA] = useState<string | null>(null);
  const [fileB, setFileB] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GenerateResult | null>(null);

  const canGenerate = useMemo(() => {
    if (action === "face-swap") return !!fileA && !!fileB;
    if (action === "remove-bg" || action === "upscale") return !!fileA;
    if (action === "audio") return prompt.trim().length > 0;
    if (action === "video") return prompt.trim().length > 0;
    return prompt.trim().length > 0;
  }, [action, fileA, fileB, prompt]);

  async function onFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    slot: "A" | "B",
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await readFileAsDataUrl(file);
    if (slot === "A") setFileA(base64);
    if (slot === "B") setFileB(base64);
    setError("");
  }

  async function generate() {
    if (!canGenerate || loading) return;
    const gate = await guardGeneration({
      requiredCredits: estimatedCost(action),
      action: `apps:${slug}:${action}`,
    });
    if (!gate.ok) {
      if (gate.reason === "error") {
        setError(gate.message ?? getSafeErrorMessage(gate.message));
      }
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const endpoint = endpointFor(action);
      let payload: Record<string, unknown> = {};

      if (action === "image") {
        payload = {
          prompt,
          modelId: "nano-banana-pro",
          aspectRatio: "1:1",
          numImages: 1,
          imageUrl: fileA || undefined,
        };
      } else if (action === "video") {
        payload = {
          modelRoute: "kwaivgi/kling-v3.0-pro/text-to-video",
          payload: {
            prompt,
            duration: 5,
            aspect_ratio: "16:9",
            image_url: fileA || undefined,
          },
        };
      } else if (action === "audio") {
        payload = {
          actionType: "tts",
          text: prompt,
          model: "elevenlabs/multilingual-v2",
          voice: "Aria",
          output_format: "mp3_44100_128",
        };
      } else if (action === "remove-bg") {
        payload = { imageUrl: fileA };
      } else if (action === "upscale") {
        payload = { imageUrl: fileA, scale: 4 };
      } else if (action === "face-swap") {
        payload = { sourceImageUrl: fileA, targetImageUrl: fileB };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(await parseError(res));
      }

      const json = (await res.json()) as GenerateResult & { taskId?: string };

      if (action === "video") {
        const taskId = json.taskId;
        if (!taskId) {
          throw new Error("Video task ID missing from response.");
        }
        let videoUrl = await pollVideoTask(taskId);
        // إذا كان الرابط ليس من Supabase، استدعي persist
        if (videoUrl && !videoUrl.includes("supabase.co/storage/v1/object/public")) {
          try {
            const persistRes = await fetch("/api/assets/persist", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mediaUrl: videoUrl }),
            });
            if (persistRes.ok) {
              const persistJson = await persistRes.json();
              if (persistJson?.url) videoUrl = persistJson.url;
            }
          } catch {}
        }
        setResult({ videoUrl, mediaUrl: videoUrl });
      } else {
        let url = json.mediaUrl || json.imageUrl || json.audioUrl;
        // إذا كان الرابط ليس من Supabase، استدعي persist
        if (url && !url.includes("supabase.co/storage/v1/object/public")) {
          try {
            const persistRes = await fetch("/api/assets/persist", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mediaUrl: url }),
            });
            if (persistRes.ok) {
              const persistJson = await persistRes.json();
              if (persistJson?.url) url = persistJson.url;
            }
          } catch {}
        }
        setResult({ ...json, mediaUrl: url });
      }
    } catch (err) {
      setError(getSafeErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const outputUrl =
    result?.imageUrl || result?.videoUrl || result?.audioUrl || result?.mediaUrl || null;

  return (
    <div className="min-h-screen bg-[#060c18] text-slate-100 px-4 md:px-8 py-6">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <Link
            href="/apps"
            className="inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Apps
          </Link>
          <div className="text-xs text-slate-400">
            Estimated cost:{" "}
            <span className="text-[#fbb11f] font-semibold">
              {estimatedCost(action)} credits
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0b1225] p-5">
          <h1 className="text-2xl font-bold">
            {tool?.title || "App Tool"}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {tool?.description || "Functional runtime tool endpoint."}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1 rounded-2xl border border-white/10 bg-[#0b1225] p-4 space-y-4">
            {(action === "image" || action === "video" || action === "audio") && (
              <div>
                <label className="block text-xs text-slate-400 mb-2">Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full h-36 rounded-xl bg-[#101b36] border border-white/10 px-3 py-2 text-sm outline-none focus:border-cyan-500"
                  placeholder="Describe what you want..."
                />
              </div>
            )}

            {(action === "image" || action === "video" || action === "remove-bg" || action === "upscale" || action === "face-swap") && (
              <div>
                <label className="block text-xs text-slate-400 mb-2">
                  {action === "face-swap" ? "Source Image" : "Upload Image"}
                </label>
                <label className="w-full rounded-xl border border-dashed border-cyan-700/60 bg-[#101b36] p-4 flex items-center justify-center gap-2 text-cyan-300 cursor-pointer">
                  <Upload className="h-4 w-4" />
                  Choose file
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => onFileChange(e, "A")} />
                </label>
              </div>
            )}

            {action === "face-swap" && (
              <div>
                <label className="block text-xs text-slate-400 mb-2">Target Image</label>
                <label className="w-full rounded-xl border border-dashed border-cyan-700/60 bg-[#101b36] p-4 flex items-center justify-center gap-2 text-cyan-300 cursor-pointer">
                  <Upload className="h-4 w-4" />
                  Choose file
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => onFileChange(e, "B")} />
                </label>
              </div>
            )}

            <button
              onClick={generate}
              disabled={!canGenerate || loading}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#ec4899] disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </span>
              ) : (
                `Generate • ${estimatedCost(action)} cr`
              )}
            </button>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-sm text-red-300">
                {error}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-[#0b1225] p-4 min-h-[420px]">
            {!outputUrl && (
              <div className="h-full min-h-[380px] rounded-xl border border-dashed border-white/10 bg-[#0a1430] flex items-center justify-center text-slate-500 text-sm">
                {loading ? "Processing your request..." : "Result preview will appear here"}
              </div>
            )}

            {outputUrl && action !== "audio" && (
              <div className="space-y-3">
                {(action === "video" || outputUrl.endsWith(".mp4") || outputUrl.includes("video")) ? (
                  <video src={outputUrl} controls className="w-full rounded-xl bg-black" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={outputUrl} alt="result" className="w-full rounded-xl border border-white/10" />
                )}
                <a
                  href={outputUrl}
                  target="_blank"
                  className="inline-flex items-center px-3 h-9 rounded-lg bg-cyan-600/20 border border-cyan-500/50 text-cyan-300 text-sm"
                  rel="noreferrer"
                >
                  Open / Download
                </a>
              </div>
            )}

            {outputUrl && action === "audio" && (
              <div className="space-y-3">
                <audio src={outputUrl} controls className="w-full" />
                <a
                  href={outputUrl}
                  target="_blank"
                  className="inline-flex items-center px-3 h-9 rounded-lg bg-cyan-600/20 border border-cyan-500/50 text-cyan-300 text-sm"
                  rel="noreferrer"
                >
                  Open / Download
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
