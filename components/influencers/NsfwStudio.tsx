"use client";

import { useState } from "react";
import { Sparkles, Wand2, Loader2, ImagePlus, X, Trash2 } from "lucide-react";
import { useLanguage } from "@/lib/use-language";

const NSFW_MODELS = [
  {
    id: "seedream/5-pro",
    label: "Seedream 5.0 Pro VIP",
    provider: "WaveSpeed",
  },
] as const;

interface NsfwStudioProps {
  influencerHandles?: string[];
  onGenerateSpicyImage?: (prompt: string, handle: string, model: string) => Promise<string>;
}

const copy = {
  en: {
    badge: "Subscriber media and private content mode",
    title: "VIP / NSFW Studio",
    subtitle: "Generate subscriber-only media with real image models and optional character reference guidance.",
    handle: "Choose talent (@handle)",
    model: "Private generation model",
    reference: "Optional reference image",
    uploadReference: "Click to upload a character or scene reference",
    replaceReference: "Replace image",
    removeReference: "Remove reference image",
    prompt: "Prompt",
    placeholder: "Example:",
    generate: "Generate VIP image",
    result: "Generated result",
    deleteResult: "Delete result",
    failed: "Image generation failed.",
  },
  ar: {
    badge: "قسم وسائط المشتركين والمحتوى الخاص",
    title: "استوديو VIP / NSFW",
    subtitle: "توليد وسائط خاصة للمشتركين باستخدام موديلات صور حقيقية مع صورة مرجعية اختيارية للشخصية.",
    handle: "اختر الموهبة (@handle)",
    model: "موديل التوليد الخاص",
    reference: "صورة مرجعية اختيارية",
    uploadReference: "انقر لرفع صورة مرجعية للشخصية أو اللقطة",
    replaceReference: "استبدال الصورة",
    removeReference: "مسح الصورة المرجعية",
    prompt: "الوصف النصي (Prompt)",
    placeholder: "مثال:",
    generate: "توليد صورة VIP",
    result: "الصورة المولدة الناتجة",
    deleteResult: "حذف النتيجة",
    failed: "فشل توليد الصورة.",
  },
} as const;

async function uploadMediaFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/media/upload", {
    method: "POST",
    body: formData,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.publicUrl) {
    throw new Error(data?.error || "Media upload failed.");
  }
  return data.publicUrl;
}

function resolveImageModelForReference(model: (typeof NSFW_MODELS)[number]["id"]) {
  if (model === "seedream/5-pro") return "seedream/5-pro-image-to-image";
  return "seedream/5-pro-image-to-image";
}

export function NsfwStudio({
  influencerHandles = ["@gavi", "@sophie", "@katrina", "@kat"],
  onGenerateSpicyImage,
}: NsfwStudioProps) {
  const { lang } = useLanguage();
  const t = lang === "en" ? copy.en : copy.ar;
  const [selectedHandle, setSelectedHandle] = useState(influencerHandles[0] || "@gavi");
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState<(typeof NSFW_MODELS)[number]["id"]>("seedream/5-pro");
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePreviewUrl, setReferencePreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReferenceSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReferenceFile(file);
    setReferencePreviewUrl(URL.createObjectURL(file));
    setResultUrl(null);
  };

  const clearReference = () => {
    setReferenceFile(null);
    setReferencePreviewUrl(null);
  };

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
        const referenceUrl = referenceFile ? await uploadMediaFile(referenceFile) : null;
        const res = await fetch("/api/image/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: fullPrompt,
            model: referenceUrl ? resolveImageModelForReference(selectedModel) : selectedModel,
            imageUrl: referenceUrl || undefined,
            aspectRatio: "9:16",
            quality: "1K",
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || (!data?.imageUrl && !data?.mediaUrl && !data?.url)) {
          throw new Error(data?.error || t.failed);
        }
        setResultUrl(data.imageUrl || data.mediaUrl || data.url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.failed);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-8 text-right dir-rtl">
      <div className="space-y-2 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-bold mb-2">
          <Sparkles size={14} />
          {t.badge}
        </div>
        <h2 className="text-3xl font-black text-white">{t.title}</h2>
        <p className="text-sm text-zinc-400 max-w-xl mx-auto">{t.subtitle}</p>
      </div>

      <div className="bg-[#0c0d16] p-6 rounded-3xl border border-white/10 shadow-2xl space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">{t.handle}</label>
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
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">{t.model}</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as (typeof NSFW_MODELS)[number]["id"])}
              className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-3.5 text-xs text-pink-300 font-bold outline-none focus:border-pink-500 transition"
            >
              {NSFW_MODELS.map((model) => (
                <option key={model.id} value={model.id} className="bg-[#0c0d16]">
                  {model.label} - {model.provider}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-bold text-zinc-300 mb-1.5">{t.reference}</label>
          <label className="relative h-64 rounded-2xl border-2 border-dashed border-white/15 hover:border-pink-500/50 bg-white/[0.02] flex flex-col items-center justify-center gap-2 cursor-pointer overflow-hidden transition">
            {referencePreviewUrl ? (
              <>
                <img src={referencePreviewUrl} alt="Reference" className="w-full h-full object-cover" />
                <span className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-black/70 text-white text-[11px] font-bold border border-white/10">
                  {t.replaceReference}
                </span>
              </>
            ) : (
              <>
                <ImagePlus size={32} className="text-zinc-500" />
                <span className="text-xs font-bold text-zinc-400 text-center px-4">{t.uploadReference}</span>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleReferenceSelect} />
          </label>
          {referencePreviewUrl && (
            <button
              type="button"
              onClick={clearReference}
              className="w-full py-2 rounded-xl bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-zinc-300 hover:text-red-300 text-xs font-bold transition flex items-center justify-center gap-2"
            >
              <X size={14} />
              {t.removeReference}
            </button>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-zinc-300 mb-1.5">{t.prompt}</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`${t.placeholder} ${selectedHandle} cinematic vertical portrait, soft lighting`}
            rows={3}
            className="w-full rounded-2xl bg-white/5 border border-white/10 p-3.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-pink-500 transition dir-rtl"
          />
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={!prompt.trim() || generating}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-xs shadow-lg shadow-pink-500/20 hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {generating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
          {t.generate}
        </button>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
            {error}
          </div>
        )}

        {resultUrl && (
          <div className="pt-4 border-t border-white/10 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setResultUrl(null)}
                className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/15 border border-red-500/25 text-red-300 text-xs font-bold transition flex items-center gap-1.5"
              >
                <Trash2 size={13} />
                {t.deleteResult}
              </button>
              <h4 className="text-xs font-bold text-zinc-300">{t.result}</h4>
            </div>
            <div className="max-w-md mx-auto h-96 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
              <img src={resultUrl} alt="Result" className="w-full h-full object-cover" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
