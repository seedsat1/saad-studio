"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Upload, Sparkles, Wand2, ImagePlus, RefreshCw, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface FaceSwapStudioProps {
  influencerHandles?: string[];
  influencerImageUrls?: Record<string, string>;
  onSwapFace?: (targetFile: File, handle: string) => Promise<string>;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function FaceSwapStudio({
  influencerHandles = ["@gavi", "@sophie", "@katrina", "@kat"],
  influencerImageUrls = {},
  onSwapFace,
}: FaceSwapStudioProps) {
  const searchParams = useSearchParams();
  const initialHandle = useMemo(() => {
    const value = searchParams?.get("talent");
    if (!value) return influencerHandles[0] || "@gavi";
    const decoded = decodeURIComponent(value).trim();
    return decoded.startsWith("@") ? decoded : `@${decoded}`;
  }, [searchParams, influencerHandles]);
  const [selectedHandle, setSelectedHandle] = useState(initialHandle);
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedHandle(initialHandle);
  }, [initialHandle]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTargetFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResultUrl(null);
    }
  };

  const handleGenerate = async () => {
    if (!targetFile) return;
    setGenerating(true);
    setError(null);
    try {
      if (onSwapFace) {
        const url = await onSwapFace(targetFile, selectedHandle);
        setResultUrl(url);
      } else {
        const sourceImageUrl = influencerImageUrls[selectedHandle];
        if (!sourceImageUrl) {
          throw new Error("No reference image is available for the selected influencer.");
        }

        const targetImageUrl = await readFileAsDataUrl(targetFile);
        const res = await fetch("/api/generate/face-swap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceImageUrl,
            targetImageUrl,
          }),
        });

        const data = await res.json().catch(() => null);
        if (!res.ok || (!data?.imageUrl && !data?.mediaUrl)) {
          throw new Error(data?.error || "Face swap failed.");
        }
        setResultUrl(data.imageUrl || data.mediaUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Face swap failed.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-8 text-right dir-rtl">
      {/* Title Header matching video frame 02:20 */}
      <div className="space-y-2 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-bold mb-2">
          <Sparkles size={14} />
          أداة تبديل الوجوه الفورية (Zero-Prompt Face Swap)
        </div>
        <h2 className="text-3xl font-black text-white">Face Swap Engine</h2>
        <p className="text-sm text-zinc-400 max-w-xl mx-auto">
          ارفع أي صورة جسم أو ملابس من Pinterest أو Instagram، واختر المؤثر الافتراضي للتوليد بنقرة واحدة بدون الحاجة لكتابة نص!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#0c0d16] p-6 rounded-3xl border border-white/10 shadow-2xl">
        {/* Left Side: Upload Target Photo & Handle Picker */}
        <div className="space-y-4">
          <label className="block text-xs font-bold text-zinc-300">1. رفع صورة الجسم / الوضعية المستهدفة</label>
          <label className="relative h-64 rounded-2xl border-2 border-dashed border-white/15 hover:border-pink-500/50 bg-white/[0.02] flex flex-col items-center justify-center gap-2 cursor-pointer overflow-hidden transition">
            {previewUrl ? (
              <img src={previewUrl} alt="Target" className="w-full h-full object-cover" />
            ) : (
              <>
                <ImagePlus size={32} className="text-zinc-500" />
                <span className="text-xs font-bold text-zinc-400">انقر لرفع صورة الجسم المستهدفة</span>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
          </label>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">2. اختر المؤثر الاستبدالي (@handle)</label>
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

          <button
            onClick={handleGenerate}
            disabled={!targetFile || generating}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-xs shadow-lg shadow-pink-500/20 hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            توليد الصورة بنقرة واحدة (Generate Face Swap)
          </button>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
              {error}
            </div>
          )}
        </div>

        {/* Right Side: Result Preview Frame */}
        <div className="space-y-4 flex flex-col">
          <label className="block text-xs font-bold text-zinc-300">النتيجة النهائية (Result)</label>
          <div className="flex-1 min-h-[260px] rounded-2xl border border-white/10 bg-black flex items-center justify-center overflow-hidden relative">
            {resultUrl ? (
              <img src={resultUrl} alt="Result" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-6 text-zinc-500 space-y-2">
                <Sparkles size={32} className="mx-auto" />
                <span className="text-xs font-bold block">ستظهر الصورة المستبدلة هنا</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
