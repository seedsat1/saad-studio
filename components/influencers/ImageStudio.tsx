"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Sparkles, Wand2, ImagePlus, Loader2, Download, X, Images } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/use-language";

interface ImageStudioProps {
  influencerHandles?: string[];
  onGenerateSuccess?: (imageUrl: string) => void;
}

const TALENT_SHOT_VARIANTS = [
  "clean studio headshot, soft key light, neutral background",
  "casual street style portrait, natural daylight, urban background",
  "luxury hotel lobby editorial photo, polished outfit, warm lighting",
  "fitness lifestyle portrait, sporty outfit, bright morning light",
  "coffee shop candid photo, relaxed expression, shallow depth of field",
  "beach resort portrait, golden hour, cinematic UGC style",
  "professional brand campaign photo, confident pose, clean composition",
  "night city portrait, neon reflections, high-end social media look",
  "travel lifestyle photo, airport lounge setting, natural pose",
  "minimal fashion lookbook photo, full body framing, crisp details",
];

function normalizeHandle(value: string | null, fallback: string) {
  if (!value) return fallback;
  const decoded = decodeURIComponent(value).trim();
  if (!decoded) return fallback;
  return decoded.startsWith("@") ? decoded : `@${decoded}`;
}

export function ImageStudio({
  influencerHandles = ["@gavi", "@sophie", "@katrina", "@kat"],
  onGenerateSuccess,
}: ImageStudioProps) {
  const { lang } = useLanguage();
  const isArabic = lang !== "en";
  const searchParams = useSearchParams();
  const initialHandle = useMemo(
    () => normalizeHandle(searchParams?.get("talent"), influencerHandles[0] || "@gavi"),
    [searchParams, influencerHandles]
  );

  const [selectedHandle, setSelectedHandle] = useState(initialHandle);
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("Nano Banana Pro");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [quality, setQuality] = useState("1K");
  const [generationMode, setGenerationMode] = useState<"single" | "set10">("set10");
  const [refImage, setRefImage] = useState<File | null>(null);
  const [refPreview, setRefPreview] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const copy = isArabic
    ? {
        badge: "استوديو صور المواهب",
        title: "AI Image Studio",
        subtitle: "ولّد صورة واحدة أو مجموعة 10 صور متنوعة لنفس الموهبة باستعمال @handle.",
        activeTalent: "الموهبة النشطة",
        model: "نموذج التوليد",
        prompt: "وصف المشهد",
        promptPlaceholder: `اكتب المشهد، مثال: "${selectedHandle} in a luxury fashion campaign"`,
        enhance: "تحسين النص",
        single: "صورة واحدة",
        set10: "مجموعة 10 صور",
        aspect: "أبعاد الصورة",
        resolution: "الدقة",
        reference: "صورة مرجعية اختيارية",
        upload: "انقر لرفع صورة مرجعية",
        remove: "مسح الصورة",
        generateSingle: "توليد الصورة الآن",
        generateSet: "توليد 10 صور متنوعة",
        missingPrompt: "يرجى إدخال وصف للتوليد.",
        failed: "فشل توليد الصورة من الخادم.",
        results: "نتائج التوليد",
        download: "تنزيل",
      }
    : {
        badge: "Talent Image Studio",
        title: "AI Image Studio",
        subtitle: "Generate one image or a 10-shot consistent photo set for the selected @handle.",
        activeTalent: "Active talent",
        model: "Generation model",
        prompt: "Scene prompt",
        promptPlaceholder: `Describe the scene, e.g. "${selectedHandle} in a luxury fashion campaign"`,
        enhance: "Enhance prompt",
        single: "Single image",
        set10: "10-shot set",
        aspect: "Aspect ratio",
        resolution: "Resolution",
        reference: "Optional reference image",
        upload: "Click to upload a reference image",
        remove: "Remove image",
        generateSingle: "Generate Image",
        generateSet: "Generate 10 Images",
        missingPrompt: "Enter a generation prompt.",
        failed: "Image generation failed.",
        results: "Generated outputs",
        download: "Download",
      };

  useEffect(() => {
    setSelectedHandle(initialHandle);
  }, [initialHandle]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem("talent-studio-active-handle", selectedHandle);
  }, [selectedHandle]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRefImage(file);
    setRefPreview(URL.createObjectURL(file));
  };

  const handleEnhancePrompt = () => {
    setIsEnhancing(true);
    setTimeout(() => {
      setPrompt((prev) =>
        prev
          ? `${prev}, photorealistic identity consistency, natural skin texture, professional lighting, social media campaign quality`
          : `${selectedHandle} luxury lifestyle portrait, consistent facial identity, realistic UGC photo, natural light, premium fashion styling`
      );
      setIsEnhancing(false);
    }, 350);
  };

  const getModelId = () => {
    if (selectedModel.includes("Seedream")) return "seedream/5-pro";
    if (selectedModel.includes("Flux")) return "flux-2/pro-text-to-image";
    if (selectedModel.includes("GPT")) return "gpt-image-2";
    return "qwen";
  };

  const generateOne = async (generationPrompt: string) => {
    const res = await fetch("/api/image/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: generationPrompt,
        model: getModelId(),
        aspectRatio,
        quality,
      }),
    });

    const data = await res.json().catch(() => null);
    const generatedUrl = data?.mediaUrl || data?.url || data?.imageUrl;
    if (!res.ok || !generatedUrl) {
      throw new Error(data?.error || copy.failed);
    }
    return generatedUrl as string;
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError(copy.missingPrompt);
      return;
    }

    setGenerating(true);
    setError(null);
    setProgress("");

    try {
      const basePrompt = prompt.includes("@") ? prompt.trim() : `${selectedHandle} ${prompt.trim()}`;
      const prompts =
        generationMode === "set10"
          ? TALENT_SHOT_VARIANTS.map((variant) => `${basePrompt}, ${variant}`)
          : [basePrompt];

      const generatedUrls: string[] = [];
      for (let index = 0; index < prompts.length; index++) {
        setProgress(isArabic ? `جاري توليد ${index + 1} من ${prompts.length}` : `Generating ${index + 1} of ${prompts.length}`);
        const url = await generateOne(prompts[index]);
        generatedUrls.push(url);
        setResults((prev) => [url, ...prev]);
        onGenerateSuccess?.(url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.failed);
    } finally {
      setGenerating(false);
      setProgress("");
    }
  };

  return (
    <div className={cn("w-full max-w-6xl mx-auto px-4 py-8 space-y-8", isArabic ? "text-right dir-rtl" : "text-left dir-ltr")}>
      <div className="space-y-2 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-300 text-xs font-bold mb-2">
          <Sparkles size={14} />
          {copy.badge}
        </div>
        <h2 className="text-3xl font-black text-white">{copy.title}</h2>
        <p className="text-sm text-zinc-400 max-w-xl mx-auto">
          {copy.subtitle} <span className="text-pink-400 font-bold dir-ltr">{selectedHandle}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#0c0d16] p-6 rounded-2xl border border-white/10 shadow-2xl">
        <div className="md:col-span-2 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">{copy.activeTalent}</label>
              <select
                value={selectedHandle}
                onChange={(e) => setSelectedHandle(e.target.value)}
                className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-3.5 text-xs text-pink-300 font-mono outline-none focus:border-pink-500 transition dir-ltr"
              >
                {Array.from(new Set([selectedHandle, ...influencerHandles])).map((h) => (
                  <option key={h} value={h} className="bg-[#0c0d16] text-pink-300">
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">{copy.model}</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-3.5 text-xs text-purple-300 font-bold outline-none focus:border-pink-500 transition"
              >
                <option value="Nano Banana Pro" className="bg-[#0c0d16]">Nano Banana Pro</option>
                <option value="Flux 2 Pro" className="bg-[#0c0d16]">Flux 2 Pro</option>
                <option value="Seedream 5.0 Pro" className="bg-[#0c0d16]">Seedream 5.0 Pro</option>
                <option value="GPT Image 2" className="bg-[#0c0d16]">GPT Image 2</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5 gap-3">
              <button
                type="button"
                onClick={handleEnhancePrompt}
                disabled={isEnhancing}
                className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[10px] font-bold border border-purple-500/30 flex items-center gap-1 transition"
              >
                <Sparkles size={11} />
                {copy.enhance}
              </button>
              <label className="text-xs font-bold text-zinc-300">{copy.prompt}</label>
            </div>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={copy.promptPlaceholder}
              rows={4}
              className={cn(
                "w-full rounded-2xl bg-white/5 border border-white/10 p-3.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-pink-500 transition leading-relaxed",
                isArabic ? "dir-rtl" : "dir-ltr"
              )}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">{copy.set10}</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: "single", label: copy.single, Icon: Wand2 },
                  { key: "set10", label: copy.set10, Icon: Images },
                ].map(({ key, label, Icon }) => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setGenerationMode(key as "single" | "set10")}
                    className={cn(
                      "px-3 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1.5",
                      generationMode === key ? "border-pink-500 bg-pink-500/20 text-pink-300" : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10"
                    )}
                  >
                    <Icon size={13} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">{copy.aspect}</label>
              <div className="flex flex-wrap gap-1.5">
                {["1:1", "9:16", "3:4", "16:9"].map((ratio) => (
                  <button
                    type="button"
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
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">{copy.resolution}</label>
              <div className="flex flex-wrap gap-1.5">
                {["1K", "2K", "4K"].map((q) => (
                  <button
                    type="button"
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

          {(progress || error) && (
            <div
              className={cn(
                "p-3 rounded-xl border text-xs font-semibold",
                error ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-pink-500/10 border-pink-500/20 text-pink-200"
              )}
            >
              {error || progress}
            </div>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-xs shadow-lg shadow-pink-500/20 hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : generationMode === "set10" ? <Images size={16} /> : <Wand2 size={16} />}
            {generationMode === "set10" ? copy.generateSet : copy.generateSingle}
          </button>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-bold text-zinc-300">{copy.reference}</label>
          <label className="relative h-64 rounded-2xl border-2 border-dashed border-white/15 hover:border-pink-500/50 bg-white/[0.02] flex flex-col items-center justify-center gap-2 cursor-pointer overflow-hidden transition">
            {refPreview ? (
              <img src={refPreview} alt="Reference" className="w-full h-full object-cover" />
            ) : (
              <>
                <ImagePlus size={32} className="text-zinc-500" />
                <span className="text-xs font-bold text-zinc-400 text-center px-4">{copy.upload}</span>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>
          {refPreview && (
            <button
              type="button"
              onClick={() => {
                setRefImage(null);
                setRefPreview(null);
              }}
              className="w-full py-2 rounded-xl bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-zinc-300 hover:text-red-300 text-xs font-bold transition flex items-center justify-center gap-2"
            >
              <X size={14} />
              {copy.remove}
            </button>
          )}
          {refImage && <div className="text-[11px] text-zinc-500">{refImage.name}</div>}
        </div>
      </div>

      {results.length > 0 && (
        <div className="space-y-4 bg-[#0c0d16] p-6 rounded-2xl border border-white/10">
          <h3 className="text-lg font-bold text-white">{copy.results}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            {results.map((url, idx) => (
              <div key={`${url}-${idx}`} className="relative aspect-[9/14] rounded-2xl overflow-hidden border border-white/10 group bg-black">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <a
                  href={url}
                  target="_blank"
                  download
                  className="absolute bottom-3 left-3 px-3 py-1.5 rounded-xl bg-black/80 hover:bg-pink-600 text-white text-xs font-bold backdrop-blur-md border border-white/10 transition opacity-0 group-hover:opacity-100 flex items-center gap-1"
                >
                  <Download size={12} />
                  {copy.download}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
