"use client";

import { useState } from "react";
import { Sparkles, Wand2, Loader2, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface NsfwStudioProps {
  influencerHandles?: string[];
  onGenerateSpicyImage?: (prompt: string, handle: string, model: string) => Promise<string>;
}

export function NsfwStudio({
  influencerHandles = ["@gavi", "@sophie", "@katrina", "@kat"],
  onGenerateSpicyImage,
}: NsfwStudioProps) {
  const [selectedHandle, setSelectedHandle] = useState(influencerHandles[0] || "@gavi");
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("Z-Image Spicy");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      if (onGenerateSpicyImage) {
        const url = await onGenerateSpicyImage(prompt, selectedHandle, selectedModel);
        setResultUrl(url);
      } else {
        const fullPrompt = prompt.includes("@") ? prompt : `${selectedHandle} ${prompt}`;
        const res = await fetch("/api/image/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: fullPrompt,
            model: selectedModel.includes("Nano") ? "seedream/5-pro" : "z-image",
            aspectRatio: "9:16",
            quality: "1K",
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || (!data?.imageUrl && !data?.mediaUrl && !data?.url)) {
          throw new Error(data?.error || "Image generation failed.");
        }
        setResultUrl(data.imageUrl || data.mediaUrl || data.url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image generation failed.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-8 text-right dir-rtl">
      <div className="space-y-2 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-bold mb-2">
          <Sparkles size={14} />
          قسم وسائط المشتركين والمحتوى الخاص (Subscriber Content Mode)
        </div>
        <h2 className="text-3xl font-black text-white">NSFW / Spicy Studio</h2>
        <p className="text-sm text-zinc-400 max-w-xl mx-auto">
          إنشاء محتوى حصري للمشتركين باستخدام نماذج توليد خاصة فائقة الواقعية والاتساق مع شخصية المؤثر.
        </p>
      </div>

      <div className="bg-[#0c0d16] p-6 rounded-3xl border border-white/10 shadow-2xl space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">اختر المؤثر (@handle)</label>
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

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">نموذج التوليد الخاص</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-3.5 text-xs text-pink-300 font-bold outline-none focus:border-pink-500 transition"
            >
              <option value="Z-Image Spicy" className="bg-[#0c0d16]">Z-Image Spicy (Extreme Realism)</option>
              <option value="Flux Spicy Pro" className="bg-[#0c0d16]">Flux Spicy Pro</option>
              <option value="Nano Banana Spicy" className="bg-[#0c0d16]">Nano Banana Spicy</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-zinc-300 mb-1.5">الوصف النصي (Prompt)</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`مثال: ${selectedHandle} in a bathtub, soft aesthetic cinematic lighting`}
            rows={3}
            className="w-full rounded-2xl bg-white/5 border border-white/10 p-3.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-pink-500 transition dir-rtl"
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={!prompt.trim() || generating}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-xs shadow-lg shadow-pink-500/20 hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {generating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
          توليد المحتوى الحصري (Generate Spicy Image)
        </button>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
            {error}
          </div>
        )}

        {resultUrl && (
          <div className="pt-4 border-t border-white/10 space-y-3">
            <h4 className="text-xs font-bold text-zinc-300">الصورة المولّدة الناتج</h4>
            <div className="max-w-md mx-auto h-96 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
              <img src={resultUrl} alt="Result" className="w-full h-full object-cover" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
