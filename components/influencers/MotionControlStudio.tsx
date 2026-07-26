"use client";

import { useState } from "react";
import { Video, Sparkles, Upload, Wand2, Loader2, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface MotionControlStudioProps {
  influencerHandles?: string[];
  onGenerateMotion?: (videoFile: File, characterImageFile: File, model: string) => Promise<string>;
}

export function MotionControlStudio({
  influencerHandles = ["@gavi", "@sophie", "@katrina", "@kat"],
  onGenerateMotion,
}: MotionControlStudioProps) {
  const [motionVideo, setMotionVideo] = useState<File | null>(null);
  const [characterImage, setCharacterImage] = useState<File | null>(null);
  const [motionVideoUrl, setMotionVideoUrl] = useState<string | null>(null);
  const [characterImageUrl, setCharacterImageUrl] = useState<string | null>(null);
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState("Kling 3.0 Motion Control");
  const [generating, setGenerating] = useState(false);

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMotionVideo(file);
      setMotionVideoUrl(URL.createObjectURL(file));
      setResultVideoUrl(null);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCharacterImage(file);
      setCharacterImageUrl(URL.createObjectURL(file));
      setResultVideoUrl(null);
    }
  };

  const handleGenerate = async () => {
    if (!motionVideo || !characterImage) return;
    setGenerating(true);
    try {
      if (onGenerateMotion) {
        const url = await onGenerateMotion(motionVideo, characterImage, selectedModel);
        setResultVideoUrl(url);
      } else {
        await new Promise((r) => setTimeout(r, 2000));
        setResultVideoUrl("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4");
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 space-y-8 text-right dir-rtl">
      {/* Title Header matching video frame 03:01 */}
      <div className="space-y-2 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold mb-2">
          <Sparkles size={14} />
          نسخ حركات رقصات وفيديوهات المشاهير (Viral Reels & Motion Control)
        </div>
        <h2 className="text-3xl font-black text-white">Motion Control Engine</h2>
        <p className="text-sm text-zinc-400 max-w-xl mx-auto">
          ارفع أي فيديو رائج من TikTok أو Instagram Reels، وارفع صورة المؤثر الافتراضي ليقوم الذكاء الاصطناعي بنسخ نفس الحركة بالكامل!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#0c0d16] p-6 rounded-3xl border border-white/10 shadow-2xl">
        {/* Upload 1: Motion Reference Video */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-zinc-300">1. فيديو الحركة المرجعي (Motion Clip)</label>
          <label className="relative h-60 rounded-2xl border-2 border-dashed border-white/15 hover:border-purple-500/50 bg-white/[0.02] flex flex-col items-center justify-center gap-2 cursor-pointer overflow-hidden transition">
            {motionVideoUrl ? (
              <video src={motionVideoUrl} className="w-full h-full object-cover" controls />
            ) : (
              <>
                <Video size={32} className="text-zinc-500" />
                <span className="text-xs font-bold text-zinc-400 text-center px-4">انقر لرفع فيديو الحركة الأصلي (TikTok/Reel)</span>
              </>
            )}
            <input type="file" accept="video/*" className="hidden" onChange={handleVideoSelect} />
          </label>
        </div>

        {/* Upload 2: Influencer Character Image */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-zinc-300">2. صورة المؤثر الافتراضي (Your Character)</label>
          <label className="relative h-60 rounded-2xl border-2 border-dashed border-white/15 hover:border-purple-500/50 bg-white/[0.02] flex flex-col items-center justify-center gap-2 cursor-pointer overflow-hidden transition">
            {characterImageUrl ? (
              <img src={characterImageUrl} alt="Character" className="w-full h-full object-cover" />
            ) : (
              <>
                <Upload size={32} className="text-zinc-500" />
                <span className="text-xs font-bold text-zinc-400 text-center px-4">انقر لرفع صورة المؤثر الخاصة بك</span>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
          </label>
        </div>

        {/* Action Panel & Engine Selector */}
        <div className="space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <label className="block text-xs font-bold text-zinc-300">3. اختيار محرك التوليد (Model Engine)</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-3.5 text-xs text-purple-300 font-bold outline-none focus:border-purple-500 transition"
            >
              <option value="Kling 3.0 Motion Control" className="bg-[#0c0d16]">Kling 3.0 Motion Control (720p/1080p)</option>
              <option value="Kling 2.6 Motion Control" className="bg-[#0c0d16]">Kling 2.6 Motion Control</option>
              <option value="Seedance 2.0 Motion" className="bg-[#0c0d16]">Seedance 2.0 Motion</option>
            </select>

            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 leading-relaxed">
              سيتم نسخ تعبيرات الوجه والوقوف ونفس رقصات وحركات الفيديو المرجعي بـ 100% واقعية.
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!motionVideo || !characterImage || generating}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold text-xs shadow-lg shadow-purple-500/20 hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            توليد فيديو الحركة (Generate Motion)
          </button>
        </div>
      </div>

      {/* Result Video Frame */}
      {resultVideoUrl && (
        <div className="p-6 rounded-3xl border border-white/10 bg-[#0c0d16] space-y-4">
          <h3 className="text-lg font-bold text-white">نتيجة توليد فيديو الحركة الناتج</h3>
          <div className="max-w-md mx-auto rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            <video src={resultVideoUrl} controls autoPlay className="w-full h-auto" />
          </div>
        </div>
      )}
    </div>
  );
}
