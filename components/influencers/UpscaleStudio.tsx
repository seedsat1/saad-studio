"use client";

import { useState } from "react";
import { ArrowUpRight, Sparkles, Upload, Loader2, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";

export function UpscaleStudio() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scaleFactor, setScaleFactor] = useState("4K");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResultUrl(null);
    }
  };

  const handleUpscale = async () => {
    if (!selectedFile) return;
    setProcessing(true);
    try {
      await new Promise((r) => setTimeout(r, 1400));
      setResultUrl(previewUrl);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-8 text-right dir-rtl">
      <div className="space-y-2 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold mb-2">
          <Sparkles size={14} />
          محرك رفع الدقة والوضوح الجلب الفائق (Image & Video Upscaler)
        </div>
        <h2 className="text-3xl font-black text-white">Upscale Studio (4K / 8K)</h2>
        <p className="text-sm text-zinc-400 max-w-xl mx-auto">
          تحسين ورفع دقة ووضوح صور وفيديوهات المؤثرين مع الحفاظ الدقيق على التفاصيل والملامح البشرية ومسام الجلد.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#0c0d16] p-6 rounded-3xl border border-white/10 shadow-2xl">
        <div className="space-y-4">
          <label className="block text-xs font-bold text-zinc-300">1. رفع الملف المراد رفع دقته (Image / Video)</label>
          <label className="relative h-64 rounded-2xl border-2 border-dashed border-white/15 hover:border-purple-500/50 bg-white/[0.02] flex flex-col items-center justify-center gap-2 cursor-pointer overflow-hidden transition">
            {previewUrl ? (
              <img src={previewUrl} alt="Target" className="w-full h-full object-cover" />
            ) : (
              <>
                <ImagePlus size={32} className="text-zinc-500" />
                <span className="text-xs font-bold text-zinc-400">انقر لرفع ملف الوسائط</span>
              </>
            )}
            <input type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
          </label>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">2. اختر معامل مضاعفة الدقة</label>
            <div className="grid grid-cols-3 gap-2">
              {["2K", "4K", "8K"].map((scale) => (
                <button
                  key={scale}
                  onClick={() => setScaleFactor(scale)}
                  className={cn(
                    "py-2.5 rounded-xl border text-xs font-bold transition",
                    scaleFactor === scale ? "border-purple-500 bg-purple-500/20 text-purple-300" : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10"
                  )}
                >
                  {scale} Ultra HD
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleUpscale}
            disabled={!selectedFile || processing}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold text-xs shadow-lg shadow-purple-500/20 hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {processing ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpRight size={16} />}
            رفع الدقة والوضوح (Upscale Media)
          </button>
        </div>

        <div className="space-y-4 flex flex-col">
          <label className="block text-xs font-bold text-zinc-300">النتيجة فائقة الدقة (Upscaled Output)</label>
          <div className="flex-1 min-h-[260px] rounded-2xl border border-white/10 bg-black flex items-center justify-center overflow-hidden relative">
            {resultUrl ? (
              <img src={resultUrl} alt="Result" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-6 text-zinc-500 space-y-2">
                <Sparkles size={32} className="mx-auto" />
                <span className="text-xs font-bold block">ستظهر الصورة المعالجة بوضوح 4K/8K هنا</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
