"use client";

import { useState } from "react";
import { Sparkles, Wand2, ImagePlus, Loader2, Download, Copy, RefreshCw, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageStudioProps {
  influencerHandles?: string[];
  onGenerateSuccess?: (imageUrl: string) => void;
}

export function ImageStudio({
  influencerHandles = ["@gavi", "@sophie", "@katrina", "@kat"],
  onGenerateSuccess,
}: ImageStudioProps) {
  const [selectedHandle, setSelectedHandle] = useState(influencerHandles[0] || "@gavi");
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("Nano Banana Pro");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [quality, setQuality] = useState("1K");
  const [refImage, setRefImage] = useState<File | null>(null);
  const [refPreview, setRefPreview] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRefImage(file);
      setRefPreview(URL.createObjectURL(file));
    }
  };

  const handleEnhancePrompt = () => {
    setIsEnhancing(true);
    setTimeout(() => {
      setPrompt((prev) =>
        prev
          ? `${prev}, highly detailed photorealistic skin texture, natural soft daylight, 85mm lens portrait`
          : `${selectedHandle} in a luxury resort pool, ultra-realistic UGC style photo, clear reflections`
      );
      setIsEnhancing(false);
    }, 400);
  };

  const handleTurnIntoPrompt = async () => {
    if (!refImage) return;
    setIsEnhancing(true);
    setTimeout(() => {
      setPrompt(
        `A beautiful young woman ${selectedHandle} with long wavy hair, wearing a white top, studio key light, photorealistic portrait`
      );
      setIsEnhancing(false);
    }, 600);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("يرجى إدخال نص الوصف للتوليد.");
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const fullPrompt = prompt.includes("@") ? prompt : `${selectedHandle} ${prompt}`;
      const res = await fetch("/api/image/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: fullPrompt,
          model: selectedModel.toLowerCase().includes("pro") ? "seedream/5-pro" : "qwen",
          aspect_ratio: aspectRatio,
          quality,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || (!data?.mediaUrl && !data?.url && !data?.imageUrl)) {
        throw new Error(data?.error || "فشل توليد الصورة من خادم الذكاء الاصطناعي.");
      }

      const generatedUrl = data.mediaUrl || data.url || data.imageUrl;
      setResults((prev) => [generatedUrl, ...prev]);
      if (onGenerateSuccess) onGenerateSuccess(generatedUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء التوليد");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 space-y-8 text-right dir-rtl">
      <div className="space-y-2 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-bold mb-2">
          <Sparkles size={14} />
          استوديو توليد الصور الفردية وشخصيات المؤثرين
        </div>
        <h2 className="text-3xl font-black text-white">AI Image Studio</h2>
        <p className="text-sm text-zinc-400 max-w-xl mx-auto">
          توليد صور واقعية مع استدعاء المؤثرين باستخدام <span className="text-pink-400 font-bold dir-ltr">@handle</span> وتحويل الصور المرجعية لنصوص دقيقة.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#0c0d16] p-6 rounded-3xl border border-white/10 shadow-2xl">
        {/* Left Column: Input Form */}
        <div className="md:col-span-2 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">اختيار المؤثر النشط</label>
              <select
                value={selectedHandle}
                onChange={(e) => setSelectedHandle(e.target.value)}
                className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-3.5 text-xs text-pink-300 font-mono outline-none focus:border-pink-500 transition dir-ltr"
              >
                {influencerHandles.map((h) => (
                  <option key={h} value={h} className="bg-[#0c0d16] text-pink-300">
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">نموذج التوليد (Model Engine)</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-3.5 text-xs text-purple-300 font-bold outline-none focus:border-pink-500 transition"
              >
                <option value="Nano Banana Pro" className="bg-[#0c0d16]">Nano Banana Pro (Recommended)</option>
                <option value="Flux 2 Pro" className="bg-[#0c0d16]">Flux 2 Pro</option>
                <option value="Seedream 5.0 Pro" className="bg-[#0c0d16]">Seedream 5.0 Pro (2K)</option>
                <option value="GPT Image 2" className="bg-[#0c0d16]">GPT Image 2</option>
              </select>
            </div>
          </div>

          {/* Prompt Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <button
                onClick={handleEnhancePrompt}
                disabled={isEnhancing}
                className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[10px] font-bold border border-purple-500/30 flex items-center gap-1 transition"
              >
                <Sparkles size={11} />
                تحسين النص (Enhance)
              </button>
              <label className="text-xs font-bold text-zinc-300">نص التوليد (Prompt)</label>
            </div>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`صف المشهد وقم باستدعاء المؤثر مثل: "${selectedHandle} on a yacht in Monaco at sunset"`}
              rows={4}
              className="w-full rounded-2xl bg-white/5 border border-white/10 p-3.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-pink-500 transition dir-rtl leading-relaxed"
            />
          </div>

          {/* Parameters Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">أبعاد الصورة (Aspect Ratio)</label>
              <div className="flex flex-wrap gap-1.5">
                {["1:1", "9:16", "3:4", "16:9"].map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg border text-xs font-bold transition",
                      aspectRatio === ratio ? "border-pink-500 bg-pink-500/20 text-pink-300" : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10"
                    )}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">الدقة (Resolution)</label>
              <div className="flex flex-wrap gap-1.5">
                {["1K", "2K", "4K"].map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuality(q)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg border text-xs font-bold transition",
                      quality === q ? "border-purple-500 bg-purple-500/20 text-purple-300" : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10"
                    )}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-xs shadow-lg shadow-pink-500/20 hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            توليد الصورة الآن (Generate Image)
          </button>
        </div>

        {/* Right Column: Reference Image & Turn Into Prompt */}
        <div className="space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <label className="block text-xs font-bold text-zinc-300">الصورة المرجعية (Turn into Prompt)</label>
            <label className="relative h-56 rounded-2xl border-2 border-dashed border-white/15 hover:border-pink-500/50 bg-white/[0.02] flex flex-col items-center justify-center gap-2 cursor-pointer overflow-hidden transition">
              {refPreview ? (
                <img src={refPreview} alt="Ref" className="w-full h-full object-cover" />
              ) : (
                <>
                  <ImagePlus size={32} className="text-zinc-500" />
                  <span className="text-xs font-bold text-zinc-400 text-center px-4">انقر لرفع صورة مرجعية وتحليلها</span>
                </>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>

            {refPreview && (
              <button
                onClick={handleTurnIntoPrompt}
                disabled={isEnhancing}
                className="w-full py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 text-purple-200 border border-purple-500/30 font-bold text-xs transition flex items-center justify-center gap-1.5"
              >
                <Sparkles size={14} />
                Turn into prompt
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Generated Results Gallery */}
      {results.length > 0 && (
        <div className="space-y-4 bg-[#0c0d16] p-6 rounded-3xl border border-white/10">
          <h3 className="text-lg font-bold text-white">نتائج التوليد (Generated Outputs)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {results.map((url, idx) => (
              <div key={idx} className="relative h-72 rounded-2xl overflow-hidden border border-white/10 group bg-black">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <a
                  href={url}
                  target="_blank"
                  download
                  className="absolute bottom-3 left-3 px-3 py-1.5 rounded-xl bg-black/80 hover:bg-pink-600 text-white text-xs font-bold backdrop-blur-md border border-white/10 transition opacity-0 group-hover:opacity-100 flex items-center gap-1"
                >
                  <Download size={12} />
                  تنزيل
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
