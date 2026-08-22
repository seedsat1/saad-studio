"use client";

import React, { useState, useRef, useEffect } from "react";
import MobileTopBar from "@/components/mobile/MobileTopBar";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";
import MobileDesktopGuard from "@/components/mobile/MobileDesktopGuard";
import { downloadMediaFile } from "@/lib/client-download";
import SimpleToast from "@/components/SimpleToast";

interface VoiceOption {
  name: string;
  desc: string;
  lang: string;
  isArabic: boolean;
}

const VOICES: VoiceOption[] = [
  { name: "شروق", desc: "عربي فصيح · معبر ودافئ", lang: "AR", isArabic: true },
  { name: "سعد", desc: "عربي فصيح · رسمي وواثق", lang: "AR", isArabic: true },
  { name: "Liam", desc: "Warm & Friendly", lang: "EN", isArabic: false },
  { name: "Anya", desc: "Professional & Calm", lang: "EN", isArabic: false },
  { name: "Marcus", desc: "Deep & Authoritative", lang: "EN", isArabic: false },
  { name: "Chloe", desc: "Energetic & Bright", lang: "EN", isArabic: false },
];

const SFX_PRESETS = [
  "🚪 إغلاق باب بقوة",
  "⚡ صوت رعد ومطر",
  "👥 ضجيج جمهور",
  "🌧 قطرات مطر هادئة",
  "💥 انفجار سينمائي",
  "👣 خطوات أقدام",
  "⚔ اشتباك سيوف",
  "✨ تأثير سحري ولمعان",
];

export default function MobileAudioPage() {
  const [suiteTab, setSuiteTab] = useState<"studio" | "song" | "lib">("studio");
  const [studioMode, setStudioMode] = useState<"voice" | "music" | "sfx">("voice");
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>(VOICES[0]);
  const [prompt, setPrompt] = useState("");
  const [pitch, setPitch] = useState(0);
  const [speed, setSpeed] = useState(1.0);
  const [emotion, setEmotion] = useState(50);
  const [musicGenre, setMusicGenre] = useState("Cinematic");
  const [musicMood, setMusicMood] = useState("Epic");
  const [bpm, setBpm] = useState(120);
  const [songDuration, setSongDuration] = useState(120);
  const [instrumentalOnly, setInstrumentalOnly] = useState(false);

  const [loading, setLoading] = useState(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const cost =
    suiteTab === "song"
      ? 17
      : studioMode === "voice"
      ? Math.max(1, Math.ceil((prompt.length || 1) / 100))
      : studioMode === "music"
      ? 6
      : 4;

  const handleGenerate = async () => {
    if (loading) return;
    if (!prompt.trim()) {
      setToastMessage("يرجى كتابة النص أو وصف المقطع الصوتي");
      return;
    }

    setLoading(true);
    try {
      const isMusic = suiteTab === "song" || studioMode === "music";
      const targetEndpoint = isMusic ? "/api/music" : "/api/generate/audio";

      const payload = isMusic
        ? {
            prompt,
            genre: musicGenre,
            mood: musicMood,
            bpm,
            duration: songDuration,
            instrumental: instrumentalOnly,
          }
        : {
            prompt,
            action: studioMode === "sfx" ? "sfx" : "tts",
            type: studioMode,
            voice: selectedVoice.name,
            pitch,
            speed,
            emotion,
          };

      const res = await fetch(targetEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || "فشل توليد الصوت");
      }

      const data = await res.json();
      const audioUrl = data.audioUrl || data.url || data.trackUrl || (Array.isArray(data.outputs) && data.outputs[0]);
      if (!audioUrl) throw new Error("لم يتم استلام رابط الملف الصوتي");

      setCurrentAudioUrl(audioUrl);
      setToastMessage("تم توليد الصوت بنجاح! 🎵");

      if (audioElementRef.current) {
        audioElementRef.current.src = audioUrl;
        audioElementRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    } catch (err: any) {
      setToastMessage(err.message || "حدث خطأ أثناء التوليد");
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = () => {
    if (!audioElementRef.current || !currentAudioUrl) return;
    if (isPlaying) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    } else {
      audioElementRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleDownload = async () => {
    if (!currentAudioUrl) return;
    await downloadMediaFile(currentAudioUrl, `saadstudio_audio_${Date.now()}.mp3`, {
      title: "صوت استوديو سعد",
      fallbackExt: "mp3",
    });
  };

  return (
    <div className="min-h-screen bg-[#08090C] text-[#EDEFF3] flex justify-center selection:bg-[#E0B252] selection:text-black">
      <MobileDesktopGuard desktopFallbackHref="/audio" toolName="استوديو الصوت" />
      <SimpleToast show={Boolean(toastMessage)} message={toastMessage || ""} onHide={() => setToastMessage(null)} />
      <audio
        ref={audioElementRef}
        onTimeUpdate={() => setCurrentTime(audioElementRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setAudioDuration(audioElementRef.current?.duration || 0)}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="w-full max-w-[430px] min-h-screen relative overflow-hidden bg-[#08090C] pb-[210px]">
        {/* Top Bar */}
        <MobileTopBar title="Audio Suite" subtitle="استوديو الصوتيات — Saad Studio" />

        {/* Suite Switcher */}
        <div className="flex gap-1.5 px-4 pt-2.5 pb-2">
          <button
            onClick={() => setSuiteTab("studio")}
            className={`flex-1 py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-0.5 ${
              suiteTab === "studio"
                ? "bg-[#15181E] text-[#E0B252] border border-[#E0B252]/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            استوديو الصوت
            <small className="text-[9px] font-mono text-slate-500 font-normal">SOUND STUDIO</small>
          </button>
          <button
            onClick={() => setSuiteTab("song")}
            className={`flex-1 py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-0.5 ${
              suiteTab === "song"
                ? "bg-[#15181E] text-[#22B8CF] border border-[#22B8CF]/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            اصنع أغنيتك
            <small className="text-[9px] font-mono text-slate-500 font-normal">CREATE SONG</small>
          </button>
          <button
            onClick={() => setSuiteTab("lib")}
            className={`flex-1 py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-0.5 ${
              suiteTab === "lib"
                ? "bg-[#15181E] text-slate-100 border border-white/20 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            المكتبة
            <small className="text-[9px] font-mono text-slate-500 font-normal">LIBRARY</small>
          </button>
        </div>

        {/* ─── SOUND STUDIO TAB ─── */}
        {suiteTab === "studio" && (
          <div className="space-y-3">
            {/* Mode selector */}
            <div className="mx-4 flex gap-1 bg-[#101216] p-1 rounded-full border border-white/10">
              <button
                onClick={() => setStudioMode("voice")}
                className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all ${
                  studioMode === "voice" ? "bg-[#E0B252] text-[#1A1206]" : "text-slate-400"
                }`}
              >
                صوت ونطق
              </button>
              <button
                onClick={() => setStudioMode("music")}
                className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all ${
                  studioMode === "music" ? "bg-[#E0B252] text-[#1A1206]" : "text-slate-400"
                }`}
              >
                موسيقى
              </button>
              <button
                onClick={() => setStudioMode("sfx")}
                className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all ${
                  studioMode === "sfx" ? "bg-[#E0B252] text-[#1A1206]" : "text-slate-400"
                }`}
              >
                مؤثرات
              </button>
            </div>

            {/* Voice List */}
            {studioMode === "voice" && (
              <section className="px-4">
                <h2 className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2">اختر المعلق الصوتي</h2>
                <div className="space-y-1.5">
                  {VOICES.map((v) => {
                    const isSelected = selectedVoice.name === v.name;
                    return (
                      <div
                        key={v.name}
                        onClick={() => setSelectedVoice(v)}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? "border-[#E0B252]/60 bg-[#E0B252]/10"
                            : "border-white/5 bg-[#15181E] hover:border-white/15"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                            isSelected ? "bg-[#E0B252] text-[#1A1206]" : "bg-slate-700 text-slate-200"
                          }`}
                        >
                          {v.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <strong className="block text-xs font-bold text-slate-100">{v.name}</strong>
                          <span className="text-[10px] text-slate-400 truncate block">{v.desc}</span>
                        </div>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                            v.isArabic ? "bg-cyan-500/20 text-cyan-300" : "bg-slate-700 text-slate-300"
                          }`}
                        >
                          {v.lang}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* SFX Quick Presets */}
            {studioMode === "sfx" && (
              <section className="px-4">
                <h2 className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2">نماذج مؤثرات جاهزة</h2>
                <div className="flex flex-wrap gap-1.5">
                  {SFX_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setPrompt(preset)}
                      className="py-2 px-3 rounded-xl border border-white/10 bg-[#15181E] text-xs text-slate-300 hover:border-[#E0B252]/40 active:scale-95 transition-all"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Prompt input */}
            <section className="px-4">
              <div className="border border-white/10 rounded-2xl bg-[#101216] overflow-hidden focus-within:border-[#E0B252]/50 transition-colors">
                <div className="flex justify-between items-center px-3.5 py-2 border-b border-white/5 text-[11px] font-mono text-slate-400">
                  <span>PROMPT</span>
                  <span className="text-[#E0B252]">{cost} CR</span>
                </div>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    studioMode === "voice"
                      ? "اكتب النص المراد نطقه بصوت طبيعي وإيقاع سليم..."
                      : studioMode === "music"
                      ? "صف الموسيقى التي تريد توليدها..."
                      : "صف المؤثر الصوتي..."
                  }
                  className="w-full min-h-[96px] p-3.5 bg-transparent border-0 resize-none text-slate-100 text-sm leading-relaxed outline-none placeholder:text-slate-500"
                />
              </div>
            </section>
          </div>
        )}

        {/* ─── CREATE YOUR SONG TAB ─── */}
        {suiteTab === "song" && (
          <div className="space-y-3 px-4">
            <div className="border border-white/10 rounded-2xl bg-[#101216] overflow-hidden focus-within:border-[#22B8CF]/50 transition-colors">
              <div className="px-3.5 py-2 border-b border-white/5 text-[11px] font-mono text-[#22B8CF]">
                SONG PROMPT
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                maxLength={500}
                placeholder="صف موسيقاك... مثال: قطعة أوركسترالية ملحمية متصاعدة مع كمانات سريعة وإيقاع طبول حماسي"
                className="w-full min-h-[96px] p-3.5 bg-transparent border-0 resize-none text-slate-100 text-sm leading-relaxed outline-none placeholder:text-slate-500"
              />
            </div>

            {/* Settings Card */}
            <div className="p-3.5 rounded-2xl border border-white/10 bg-[#101216] space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-semibold">بدون غناء (Instrumental Only)</span>
                <button
                  onClick={() => setInstrumentalOnly(!instrumentalOnly)}
                  className={`w-11 h-6 rounded-full relative transition-colors ${
                    instrumentalOnly ? "bg-[#22B8CF]" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                      instrumentalOnly ? "right-0.5" : "left-0.5"
                    }`}
                  />
                </button>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>الإيقاع (BPM)</span>
                  <span className="font-mono text-[#22B8CF]">{bpm}</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="180"
                  value={bpm}
                  onChange={(e) => setBpm(+e.target.value)}
                  className="w-full accent-[#22B8CF] bg-transparent"
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── LIBRARY TAB ─── */}
        {suiteTab === "lib" && (
          <div className="px-4 space-y-2">
            <div className="p-3 rounded-2xl border border-white/10 bg-[#101216] flex items-center justify-between">
              <div>
                <strong className="block text-xs font-bold text-slate-100">المقاطع الصوتية الأخيرة</strong>
                <span className="text-[10px] text-slate-400">يتم حفظ الملفات تلقائياً في حسابك</span>
              </div>
            </div>
          </div>
        )}

        {/* Fixed Player & Generate Dock */}
        <div className="fixed bottom-0 inset-x-0 max-w-[430px] mx-auto z-50 bg-[#08090C]/95 backdrop-blur-2xl border-t border-white/10">
          {/* Mini Player */}
          {currentAudioUrl && (
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/10 bg-[#101216]/60">
              <button
                onClick={togglePlay}
                className="w-9 h-9 rounded-full bg-[#E0B252] text-[#1A1206] flex items-center justify-center active:scale-95 transition-transform flex-none"
              >
                {isPlaying ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5l11 7-11 7z" />
                  </svg>
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#E0B252] transition-all"
                    style={{ width: `${audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] font-mono text-slate-400 mt-1">
                  <span>{Math.floor(currentTime)}s</span>
                  <span>{Math.floor(audioDuration)}s</span>
                </div>
              </div>

              <button
                onClick={handleDownload}
                className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-bold text-slate-300 active:scale-95 flex-none"
              >
                تنزيل
              </button>
            </div>
          )}

          {/* Action Button */}
          <div className="p-3">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-[0.985] disabled:opacity-50 transition-all ${
                suiteTab === "song"
                  ? "bg-gradient-to-r from-[#22B8CF] to-[#7B3FBF] text-white shadow-lg shadow-cyan-500/20"
                  : "bg-[#E0B252] text-[#1A1206] shadow-lg shadow-amber-500/20"
              }`}
            >
              {loading ? "جارٍ معالجة الصوت..." : suiteTab === "song" ? "توليد الموسيقى والأغنية" : "توليد المقطع الصوتي"}
              <span className="font-mono text-xs opacity-75">· {cost} CR</span>
            </button>
            <MobileBottomNav />
          </div>
        </div>
      </div>
    </div>
  );
}
