"use client";

import { useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Film,
  Loader2,
  Play,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { useGenerationGate } from "@/hooks/use-generation-gate";

type AspectRatio = "16:9" | "9:16";
type ExtendPasses = 1 | 2 | 3;
const SECONDS_PER_PASS = 8;
const CREDITS_PER_SECOND = 1.71;

async function uploadVideoToStorage(file: File): Promise<string> {
  const urlRes = await fetch("/api/studio/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type || "video/mp4",
      assetType: "video",
    }),
  });
  const data = await urlRes.json().catch(() => null);
  if (!urlRes.ok || !data?.signedUrl || !data?.publicUrl) {
    throw new Error(data?.error || "Could not prepare the upload.");
  }

  const putRes = await fetch(String(data.signedUrl), {
    method: "PUT",
    headers: { "Content-Type": file.type || "video/mp4" },
    body: file,
  });
  if (!putRes.ok) throw new Error("Video upload failed.");

  return String(data.publicUrl);
}

function formatDuration(seconds: number | null) {
  if (!Number.isFinite(seconds) || seconds === null || seconds <= 0) return "";
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return minutes > 0 ? `${minutes}:${String(rest).padStart(2, "0")}` : `${rest}s`;
}

function inferVideoMetadata(file: File): Promise<{ aspect: AspectRatio; duration: number | null }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const aspect: AspectRatio = video.videoHeight > video.videoWidth ? "9:16" : "16:9";
      const duration = Number.isFinite(video.duration) ? video.duration : null;
      URL.revokeObjectURL(url);
      resolve({ aspect, duration });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ aspect: "16:9", duration: null });
    };
    video.src = url;
  });
}

export default function VideoExtendPage() {
  const { guardGeneration, getSafeErrorMessage } = useGenerationGate();
  const [sourceUrl, setSourceUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [sourceDuration, setSourceDuration] = useState<number | null>(null);
  const [resultDuration, setResultDuration] = useState<number | null>(null);
  const [extendPasses, setExtendPasses] = useState<ExtendPasses>(1);
  const [resultUrl, setResultUrl] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const [extending, setExtending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const busy = uploading || extending;
  const canExtend = useMemo(() => !!sourceUrl && !busy, [busy, sourceUrl]);
  const extendSeconds = extendPasses * SECONDS_PER_PASS;
  const expectedDuration = sourceDuration ? sourceDuration + extendSeconds : null;
  const requiredCredits = Math.ceil(CREDITS_PER_SECOND * SECONDS_PER_PASS * extendPasses);

  const resetVideo = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSourceUrl("");
    setPreviewUrl("");
    setFileName("");
    setResultUrl("");
    setError("");
    setStatus("");
    setAspectRatio("16:9");
    setSourceDuration(null);
    setResultDuration(null);
    setExtendPasses(1);
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      setError("Please upload a video file.");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setError("");
    setResultUrl("");
    setStatus("Uploading video...");
    setUploading(true);
    setFileName(file.name);
    setPreviewUrl(URL.createObjectURL(file));

    try {
      const [publicUrl, metadata] = await Promise.all([
        uploadVideoToStorage(file),
        inferVideoMetadata(file),
      ]);
      setSourceUrl(publicUrl);
      setAspectRatio(metadata.aspect);
      setSourceDuration(metadata.duration);
      setStatus("Video uploaded. Ready to extend.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setStatus("");
    } finally {
      setUploading(false);
    }
  };

  const extendVideo = async () => {
    if (!canExtend) return;
    setError("");
    setResultUrl("");

    const gate = await guardGeneration({
      requiredCredits,
      action: "video-extend",
    });
    if (!gate.ok) {
      if (gate.message) setError(gate.message);
      return;
    }

    setExtending(true);
    setStatus("Extending video...");

    try {
      let currentUrl = sourceUrl;

      for (let pass = 1; pass <= extendPasses; pass++) {
        setStatus(`Extending video... pass ${pass} of ${extendPasses}`);
        const startRes = await fetch("/api/cinematic-video/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tier: "fast",
            prompt: "Continue this video naturally. Preserve the same subject, motion, camera direction, lighting, and visual style.",
            aspectRatio,
            resolution: "720p",
            durationSeconds: SECONDS_PER_PASS,
            generateAudio: false,
            extendVideoUrl: currentUrl,
          }),
        });
        const startData = await startRes.json().catch(() => null);
        if (!startRes.ok || !startData?.operationName || !startData?.generationId) {
          throw new Error(startData?.error || "Video extension failed to start.");
        }

        let passCompleted = false;
        for (let attempt = 1; attempt <= 60; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 10_000));
          setStatus(`Extending video... pass ${pass} of ${extendPasses}, ${attempt * 10}s`);
          const statusRes = await fetch("/api/cinematic-video/status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              operationName: startData.operationName,
              model: startData.model,
              generationId: startData.generationId,
            }),
          });
          const statusData = await statusRes.json().catch(() => null);
          if (!statusRes.ok) throw new Error(statusData?.error || "Status check failed.");
          if (statusData?.done) {
            if (statusData.status === "completed" && statusData.mediaUrl) {
              currentUrl = String(statusData.mediaUrl);
              passCompleted = true;
              break;
            }
            throw new Error(statusData?.error || "Extension finished without output.");
          }
        }

        if (!passCompleted) {
          throw new Error("Video extension timed out.");
        }
      }

      setResultUrl(currentUrl);
      setResultDuration(null);
      setStatus("Video extended.");
    } catch (err) {
      setError(getSafeErrorMessage(err));
      setStatus("");
    } finally {
      setExtending(false);
    }
  };

  return (
    <main className="fixed inset-x-0 bottom-0 top-16 overflow-hidden bg-[#05070b] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_16%,rgba(236,72,153,.18),transparent_28%),radial-gradient(circle_at_78%_28%,rgba(56,189,248,.14),transparent_30%),linear-gradient(145deg,#05070b,#111017_48%,#090b12)]" />

      <section className="relative mx-auto grid h-full max-w-7xl grid-cols-[360px_minmax(0,1fr)] gap-4 p-5">
        <aside className="border border-white/10 bg-black/35 p-5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-pink-500 to-violet-500">
              <Film size={21} />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-[0.14em]">Video Extend</h1>
              <p className="text-xs text-slate-500">Upload one video and extend it here.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="mt-6 flex aspect-video w-full flex-col items-center justify-center border border-dashed border-white/15 bg-white/[0.04] text-center transition hover:border-pink-300/50 hover:bg-white/[0.06] disabled:cursor-wait disabled:opacity-60"
          >
            <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleUpload} />
            {uploading ? <Loader2 size={34} className="animate-spin text-pink-200" /> : <Upload size={34} className="text-slate-400" />}
            <span className="mt-3 text-sm font-black">{uploading ? "Uploading" : "Upload Video"}</span>
            <span className="mt-1 max-w-[240px] text-xs leading-5 text-slate-500">MP4, MOV, or WEBM. Aspect ratio is detected automatically.</span>
          </button>

          {fileName && (
            <div className="mt-3 flex items-center justify-between gap-3 border border-white/10 bg-white/[0.04] px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{fileName}</p>
                <p className="text-[11px] text-slate-500">
                  {[
                    `Auto aspect: ${aspectRatio}`,
                    sourceDuration ? `Original: ${formatDuration(sourceDuration)}` : "",
                    `Add: ${extendSeconds}s`,
                    expectedDuration ? `Expected: ${formatDuration(expectedDuration)}` : "",
                  ].filter(Boolean).join(" / ")}
                </p>
              </div>
              <button type="button" onClick={resetVideo} disabled={busy} className="grid h-8 w-8 place-items-center text-slate-400 hover:text-white disabled:opacity-40" aria-label="Remove video">
                <X size={16} />
              </button>
            </div>
          )}

          <div className="mt-3 border border-white/10 bg-white/[0.04] p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Extension Time</div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {([1, 2, 3] as const).map((passes) => (
                <button
                  key={passes}
                  type="button"
                  onClick={() => setExtendPasses(passes)}
                  disabled={busy}
                  className={[
                    "h-11 border text-sm font-black transition disabled:cursor-wait disabled:opacity-60",
                    extendPasses === passes
                      ? "border-pink-300 bg-pink-400/15 text-pink-100"
                      : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.07]",
                  ].join(" ")}
                >
                  +{passes * SECONDS_PER_PASS}s
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-5 text-slate-500">
              Longer times run multiple real extension passes.
            </p>
          </div>

          <div className="mt-3 border border-white/10 bg-white/[0.04] p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Credit Cost</div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div className="text-2xl font-black text-white">{requiredCredits} cr</div>
              <div className="text-right text-[11px] leading-5 text-slate-500">
                Checked before generation.
                <br />
                Charged by the generation API.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={extendVideo}
            disabled={!canExtend}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:from-pink-400 hover:to-violet-400 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {extending ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
            {extending ? "Extending" : "Extend Video"}
          </button>

          {status && (
            <div className="mt-4 flex items-center gap-2 border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-slate-300">
              {resultUrl ? <CheckCircle2 size={16} className="text-emerald-300" /> : busy ? <Loader2 size={16} className="animate-spin text-pink-200" /> : <Play size={16} />}
              {status}
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-start gap-2 border border-red-400/25 bg-red-500/10 px-3 py-3 text-sm font-semibold leading-6 text-red-100">
              <AlertCircle size={17} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}
        </aside>

        <section className="grid min-h-0 grid-rows-[1fr_auto] border border-white/10 bg-black/30 backdrop-blur-xl">
          <div className="relative grid min-h-0 place-items-center p-6">
            {resultUrl ? (
              <video
                src={resultUrl}
                controls
                autoPlay
                loop
                onLoadedMetadata={(event) => {
                  const duration = event.currentTarget.duration;
                  setResultDuration(Number.isFinite(duration) ? duration : null);
                }}
                className="max-h-full max-w-full rounded-lg bg-black shadow-2xl shadow-black/60"
              />
            ) : previewUrl ? (
              <video src={previewUrl} controls className="max-h-full max-w-full rounded-lg bg-black opacity-90" />
            ) : (
              <div className="text-center text-slate-500">
                <Play className="mx-auto h-14 w-14 text-slate-600" />
                <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-slate-400">Upload a video</p>
                <p className="mt-2 text-sm">The preview and extended result will appear here.</p>
              </div>
            )}

            {extending && (
              <div className="absolute inset-0 grid place-items-center bg-black/70 backdrop-blur-sm">
                <div className="text-center">
                  <Loader2 className="mx-auto h-11 w-11 animate-spin text-pink-300" />
                  <p className="mt-3 text-sm font-black uppercase tracking-[0.16em]">{status || "Extending video..."}</p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 p-4">
            {resultUrl ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
                  <CheckCircle2 size={17} />
                  {resultDuration ? `Done. Actual: ${formatDuration(resultDuration)}` : "Done."}
                </div>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(resultUrl)}
                  className="flex h-9 items-center gap-2 rounded-lg bg-white/10 px-3 text-xs font-black text-white hover:bg-white/15"
                >
                  <Copy size={14} />
                  Copy URL
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-400">
                No extra settings. Upload a video, then extend.
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
