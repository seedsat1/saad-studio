"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Video, Sparkles, Wand2, Upload, Loader2, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoStudioProps {
  influencerHandles?: string[];
  onGenerateSuccess?: (videoUrl: string) => void;
}

export function VideoStudio({
  influencerHandles = ["@gavi", "@sophie", "@katrina", "@kat"],
  onGenerateSuccess,
}: VideoStudioProps) {
  const searchParams = useSearchParams();
  const initialHandle = useMemo(() => {
    const value = searchParams?.get("talent");
    if (!value) return influencerHandles[0] || "@gavi";
    const decoded = decodeURIComponent(value).trim();
    return decoded.startsWith("@") ? decoded : `@${decoded}`;
  }, [searchParams, influencerHandles]);
  const [selectedHandle, setSelectedHandle] = useState(initialHandle);
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("Kling 3.0 Pro");
  const [duration, setDuration] = useState("5s");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [refImage, setRefImage] = useState<File | null>(null);
  const [refPreview, setRefPreview] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedHandle(initialHandle);
  }, [initialHandle]);

  const getModelRoute = () => {
    if (selectedModel.includes("Seedance")) return "bytedance/seedance-2.0/text-to-video";
    if (selectedModel.includes("Google")) return "google/veo3.1-text-to-video";
    if (selectedModel.includes("2.6")) return "kwaivgi/kling-v2.6-std/text-to-video";
    return "kwaivgi/kling-v3.0-pro/text-to-video";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRefImage(file);
      setRefPreview(URL.createObjectURL(file));
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("يرجى إدخال نص وصف حركة الفيديو.");
      return;
    }

    setGenerating(true);
    setError(null);
    setStatusMessage("جاري بدء مهمة توليد الفيديو على خادم الكريتيف...");

    try {
      const fullPrompt = prompt.includes("@") ? prompt : `${selectedHandle} ${prompt}`;
      let image_url = "";
      if (refImage) {
        image_url = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = reject;
          reader.readAsDataURL(refImage);
        });
      }

      const res = await fetch("/api/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelRoute: getModelRoute(),
          payload: {
            prompt: fullPrompt,
            duration: parseInt(duration),
            aspect_ratio: aspectRatio,
            image_url,
            resolution: selectedModel.includes("Google") ? "1080p" : "720p",
          },
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || (!data?.taskId && !data?.videoUrl)) {
        throw new Error(data?.error || "فشل بدء مهمة توليد الفيديو.");
      }

      if (data.videoUrl) {
        setResultVideoUrl(data.videoUrl);
        if (onGenerateSuccess) onGenerateSuccess(data.videoUrl);
      } else if (data.taskId) {
        setStatusMessage("جاري المعالجة وتصيير الفريمات (Polling)...");
        let attempts = 0;
        const poll = setInterval(async () => {
          attempts++;
          const statusRes = await fetch(`/api/video?taskId=${data.taskId}`).catch(() => null);
          const statusData = await statusRes?.json().catch(() => null);
          if (statusData?.status === "completed" && statusData?.videoUrl) {
            clearInterval(poll);
            setResultVideoUrl(statusData.videoUrl);
            setGenerating(false);
            setStatusMessage(null);
            if (onGenerateSuccess) onGenerateSuccess(statusData.videoUrl);
          } else if (statusData?.status === "failed" || attempts > 30) {
            clearInterval(poll);
            setGenerating(false);
            setStatusMessage(null);
            setError(statusData?.error || "انتهت مهلة التوليد.");
          }
        }, 4000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء التوليد");
      setGenerating(false);
      setStatusMessage(null);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 space-y-8 text-right dir-rtl">
      <div className="space-y-2 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold mb-2">
          <Sparkles size={14} />
          استوديو توليد فيديوهات المؤثرين السينمائية
        </div>
        <h2 className="text-3xl font-black text-white">AI Video Studio</h2>
        <p className="text-sm text-zinc-400 max-w-xl mx-auto">
          تحريك وإنتاج مقاطع فيديو عالية الجودة للشخصيات مع اختيار المدة والنماذج السينمائية.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#0c0d16] p-6 rounded-3xl border border-white/10 shadow-2xl">
        <div className="md:col-span-2 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">اختيار المؤثر</label>
              <select
                value={selectedHandle}
                onChange={(e) => setSelectedHandle(e.target.value)}
                className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-3.5 text-xs text-pink-300 font-mono outline-none focus:border-purple-500 transition dir-ltr"
              >
                {Array.from(new Set([selectedHandle, ...influencerHandles])).map((h) => (
                  <option key={h} value={h} className="bg-[#0c0d16] text-pink-300">
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">نموذج الفيديو (Video Engine)</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-3.5 text-xs text-purple-300 font-bold outline-none focus:border-purple-500 transition"
              >
                <option value="Kling 3.0 Pro" className="bg-[#0c0d16]">Kling 3.0 Pro (High Cinematic)</option>
                <option value="Seedance 2.0" className="bg-[#0c0d16]">Seedance 2.0 Turbo</option>
                <option value="Google Veo 3.1 Pro" className="bg-[#0c0d16]">Google Veo 3.1 Pro</option>
                <option value="Kling 2.6" className="bg-[#0c0d16]">Kling 2.6 Standard</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">وصف الحركة واللقطة (Prompt)</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`صف حركة الفيديو مثل: "${selectedHandle} smiling at camera, gentle wind blowing her hair softly, beach sunset background"`}
              rows={4}
              className="w-full rounded-2xl bg-white/5 border border-white/10 p-3.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-purple-500 transition dir-rtl leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">مدة الفيديو (Duration)</label>
              <div className="flex flex-wrap gap-1.5">
                {["3s", "5s", "10s"].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-lg border text-xs font-bold transition",
                      duration === d ? "border-purple-500 bg-purple-500/20 text-purple-300" : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10"
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">أبعاد الفيديو (Aspect Ratio)</label>
              <div className="flex flex-wrap gap-1.5">
                {["9:16", "16:9"].map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-lg border text-xs font-bold transition",
                      aspectRatio === ratio ? "border-pink-500 bg-pink-500/20 text-pink-300" : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10"
                    )}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {statusMessage && (
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-bold flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-purple-400 shrink-0" />
              {statusMessage}
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold text-xs shadow-lg shadow-purple-500/20 hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Video size={16} />}
            توليد الفيديو الآن (Generate Video)
          </button>
        </div>

        <div className="space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <label className="block text-xs font-bold text-zinc-300">الصورة الابتدائية المرجعية (First Frame)</label>
            <label className="relative h-60 rounded-2xl border-2 border-dashed border-white/15 hover:border-purple-500/50 bg-white/[0.02] flex flex-col items-center justify-center gap-2 cursor-pointer overflow-hidden transition">
              {refPreview ? (
                <img src={refPreview} alt="Ref" className="w-full h-full object-cover" />
              ) : (
                <>
                  <Upload size={32} className="text-zinc-500" />
                  <span className="text-xs font-bold text-zinc-400 text-center px-4">انقر لرفع الفريم المرجعي الأول</span>
                </>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
          </div>
        </div>
      </div>

      {resultVideoUrl && (
        <div className="space-y-4 bg-[#0c0d16] p-6 rounded-3xl border border-white/10">
          <h3 className="text-lg font-bold text-white">نتيجة الفيديو الناتج</h3>
          <div className="max-w-md mx-auto rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            <video src={resultVideoUrl} controls autoPlay className="w-full h-auto" />
          </div>
        </div>
      )}
    </div>
  );
}
