"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import MobileTopBar from "@/components/mobile/MobileTopBar";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";
import MobileDesktopGuard from "@/components/mobile/MobileDesktopGuard";
import { downloadMediaFile } from "@/lib/client-download";
import SimpleToast from "@/components/SimpleToast";
import { VOICE_CATALOG, VoiceDefinition } from "@/lib/voice-catalog";

const SFX_PRESETS = [
  "🚪 إغلاق باب بقوة",
  "⚡ صوت رعد ومطر",
  "👥 ضجيج جمهور وتصفيق",
  "🌧 قطرات مطر هادئة",
  "💥 انفجار سينمائي ضخم",
  "👣 خطوات أقدام سريعة",
  "⚔ اشتباك سيوف ملحمي",
  "✨ تأثير سحري ولمعان",
];

const CATEGORY_TABS = [
  { id: "all", label: "الكل" },
  { id: "arabic", label: "الأصوات العربية 🇸🇦" },
  { id: "narration", label: "السرد والرواية 📖" },
  { id: "conversational", label: "حوار ومحادثة 💬" },
  { id: "epic", label: "سينمائي وملحمي 🎬" },
  { id: "characters", label: "شخصيات كرتونية 🎭" },
  { id: "gemini", label: "Google Gemini ⚡" },
];

interface AudioLibraryItem {
  id: string;
  type: string;
  url: string;
  prompt: string;
  createdAt: string;
}

export default function MobileAudioPage() {
  const [suiteTab, setSuiteTab] = useState<"studio" | "song" | "lib">("studio");
  const [studioMode, setStudioMode] = useState<"voice" | "music" | "sfx">("voice");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Voice list initialized with the full official platform catalog
  const [voices, setVoices] = useState<VoiceDefinition[]>(VOICE_CATALOG);
  const [selectedVoice, setSelectedVoice] = useState<VoiceDefinition>(
    VOICE_CATALOG.find((v) => v.category === "arabic") || VOICE_CATALOG[0]
  );

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

  // Audio Preview state for voice samples
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);

  // Library items
  const [libraryItems, setLibraryItems] = useState<AudioLibraryItem[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const sampleAudioRef = useRef<HTMLAudioElement | null>(null);

  const cost =
    suiteTab === "song"
      ? 17
      : studioMode === "voice"
      ? Math.max(1, Math.ceil((prompt.length || 1) / 100))
      : studioMode === "music"
      ? 6
      : 4;

  // Initialize and load any server-side cached registry voices
  useEffect(() => {
    let active = true;
    fetch("/api/voices", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (active && Array.isArray(data.voices) && data.voices.length > 0) {
          setVoices(data.voices);
        }
      })
      .catch(() => {
        // Fallback to imported static catalog
      });
    return () => {
      active = false;
    };
  }, []);

  const fetchLibrary = async () => {
    setLoadingLibrary(true);
    try {
      const res = await fetch("/api/assets?type=audio", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.items)) {
          const mapped: AudioLibraryItem[] = data.items
            .map((it: any) => ({
              id: it.id || String(Math.random()),
              type: it.type || "audio",
              url: it.url || it.originalUrl || it.mediaUrl || "",
              prompt: it.prompt || "مقطع صوتي",
              createdAt: it.createdAt || new Date().toISOString(),
            }))
            .filter((it: AudioLibraryItem) => Boolean(it.url));
          setLibraryItems(mapped);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingLibrary(false);
    }
  };

  // Fetch audio library when switching to library tab
  useEffect(() => {
    if (suiteTab !== "lib") return;
    fetchLibrary();
  }, [suiteTab]);

  // Filter voices according to active category and search
  const filteredVoices = useMemo(() => {
    return voices.filter((v) => {
      const matchesCategory =
        activeCategory === "all"
          ? true
          : activeCategory === "arabic"
          ? v.category === "arabic" || v.language.toLowerCase() === "arabic"
          : activeCategory === "gemini"
          ? v.provider === "gemini"
          : v.category === activeCategory;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        v.name.toLowerCase().includes(q) ||
        v.accent.toLowerCase().includes(q) ||
        v.language.toLowerCase().includes(q) ||
        (v.geminiVoiceId && v.geminiVoiceId.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [voices, activeCategory, searchQuery]);

  // Speech Synthesis fallback helper
  const speakSampleFallback = (v: VoiceDefinition) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const isArabic = v.language.toLowerCase() === "arabic" || v.category === "arabic";
      const text = isArabic
        ? `مرحباً بكم في استوديو سعد للصوتيات، أنا ${v.name}، صوت ${v.gender === "female" ? "أنثوي" : "رجالي"} فصيح.`
        : `Hello, I am ${v.name}, a voice model from Saad Studio.`;
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = isArabic ? "ar-SA" : "en-US";
      utterance.pitch = v.gender === "female" ? 1.15 : 0.85;
      utterance.rate = 0.95;

      utterance.onstart = () => {
        setLoadingPreviewId(null);
        setPreviewingVoiceId(v.id);
      };
      utterance.onend = () => {
        setPreviewingVoiceId(null);
        setLoadingPreviewId(null);
      };
      utterance.onerror = () => {
        setPreviewingVoiceId(null);
        setLoadingPreviewId(null);
      };

      window.speechSynthesis.speak(utterance);
    } else {
      setLoadingPreviewId(null);
      setPreviewingVoiceId(null);
      setToastMessage(`معاينة: "${v.name}" (${v.accent})`);
    }
  };

  // Direct MP3 sample preview handler with bulletproof fallback
  const handlePreviewVoice = (v: VoiceDefinition, e: React.MouseEvent) => {
    e.stopPropagation();

    // If already playing this voice sample, pause and stop
    if (previewingVoiceId === v.id) {
      if (sampleAudioRef.current) {
        sampleAudioRef.current.pause();
        sampleAudioRef.current.src = "";
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setPreviewingVoiceId(null);
      setLoadingPreviewId(null);
      return;
    }

    // Stop currently running playback
    if (sampleAudioRef.current) {
      sampleAudioRef.current.pause();
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    const sampleUrl =
      v.sampleUrl ||
      (v.geminiVoiceId
        ? `/api/voice-sample?voice=${encodeURIComponent(v.geminiVoiceId)}&lang=${
            v.language.toLowerCase() === "arabic" || v.category === "arabic" ? "ar" : "en"
          }`
        : null);

    setLoadingPreviewId(v.id);
    setPreviewingVoiceId(v.id);

    if (!sampleUrl) {
      speakSampleFallback(v);
      return;
    }

    if (!sampleAudioRef.current) {
      sampleAudioRef.current = new Audio();
    }

    const audio = sampleAudioRef.current;
    audio.src = sampleUrl;
    audio.oncanplay = () => {
      setLoadingPreviewId(null);
    };
    audio.onended = () => {
      setPreviewingVoiceId(null);
      setLoadingPreviewId(null);
    };
    audio.onerror = () => {
      // Fallback seamlessly to speech synthesis
      speakSampleFallback(v);
    };

    audio.play().catch(() => {
      // If browser autoplay blocks audio stream, fallback to speech synthesis
      speakSampleFallback(v);
    });
  };

  const handleGenerate = async () => {
    if (loading) return;
    if (!prompt.trim()) {
      setToastMessage("يرجى كتابة النص أو وصف المقطع الصوتي");
      return;
    }

    // Stop preview if running
    if (sampleAudioRef.current) {
      sampleAudioRef.current.pause();
      setPreviewingVoiceId(null);
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
            voice: selectedVoice.geminiVoiceId || selectedVoice.name,
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
      const audioUrl =
        data.audioUrl || data.url || data.trackUrl || (Array.isArray(data.outputs) && data.outputs[0]);
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

  const playTrack = (url: string) => {
    setCurrentAudioUrl(url);
    if (audioElementRef.current) {
      audioElementRef.current.src = url;
      audioElementRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleDownload = async (url?: string) => {
    const targetUrl = url || currentAudioUrl;
    if (!targetUrl) return;
    await downloadMediaFile(targetUrl, `saadstudio_audio_${Date.now()}.mp3`, {
      title: "صوت استوديو سعد",
      fallbackExt: "mp3",
    });
    setToastMessage("تم بدء تنزيل الملف الصوتي 📲");
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

      <div className="w-full max-w-[430px] min-h-screen relative overflow-hidden bg-[#08090C] pb-[280px]">
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
            المكتبة ({libraryItems.length})
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

            {/* Voice Catalog with MP3 Previews */}
            {studioMode === "voice" && (
              <section className="px-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold text-slate-400">
                    مكتبة الأصوات والمعلقين ({voices.length})
                  </h2>
                  <span className="text-[11px] font-semibold text-[#E0B252]">
                    المحدد: {selectedVoice.name}
                  </span>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث عن معلق، نبرة، أو لهجة..."
                    className="w-full py-2 px-3.5 pr-8 rounded-xl border border-white/10 bg-[#101216] text-xs text-slate-200 placeholder:text-slate-500 outline-none focus:border-[#E0B252]/40"
                  />
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="absolute right-2.5 top-2.5 text-slate-500"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>

                {/* Categories Scroll */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {CATEGORY_TABS.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`flex-none py-1.5 px-3 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${
                        activeCategory === cat.id
                          ? "border-[#E0B252] bg-[#E0B252]/15 text-[#E0B252]"
                          : "border-white/10 bg-[#15181E] text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Voice List */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
                  {filteredVoices.map((v) => {
                    const isSelected = selectedVoice.id === v.id;
                    const isPreviewing = previewingVoiceId === v.id;
                    const isLoadingThis = loadingPreviewId === v.id;
                    const isArabic = v.language.toLowerCase() === "arabic" || v.category === "arabic";

                    return (
                      <div
                        key={v.id}
                        onClick={() => setSelectedVoice(v)}
                        className={`flex items-center gap-3 p-2.5 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? "border-[#E0B252] bg-[#E0B252]/10 shadow-md shadow-amber-950/25"
                            : "border-white/5 bg-[#15181E] hover:border-white/15"
                        }`}
                      >
                        {/* Avatar */}
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isSelected ? "bg-[#E0B252] text-[#1A1206]" : "bg-slate-700 text-slate-200"
                          }`}
                        >
                          {v.name[0]}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <strong className="block text-xs font-bold text-slate-100 truncate">{v.name}</strong>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-slate-400 border border-white/10 shrink-0">
                              {v.gender === "female" ? "أنثى" : "ذكر"}
                            </span>
                            {isArabic && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 shrink-0">
                                🇸🇦 فصحى
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 truncate block mt-0.5">{v.accent}</span>
                        </div>

                        {/* Real MP3 Sample Preview Button */}
                        <button
                          onClick={(e) => handlePreviewVoice(v, e)}
                          title="استمع للمعاينة الصوتية"
                          className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all shrink-0 active:scale-95 ${
                            isPreviewing
                              ? "bg-[#E0B252] text-[#1A1206] border-[#E0B252] shadow-sm shadow-amber-500/30"
                              : "bg-white/5 border-white/10 text-slate-300 hover:border-[#E0B252]/40 hover:text-[#E0B252]"
                          }`}
                        >
                          {isLoadingThis ? (
                            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : isPreviewing ? (
                            <>
                              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                              إيقاف
                            </>
                          ) : (
                            <>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                              معاينة
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* SFX Quick Presets */}
            {studioMode === "sfx" && (
              <section className="px-4">
                <h2 className="text-xs font-bold text-slate-400 mb-2">نماذج مؤثرات صوتية جاهزة</h2>
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
          <div className="px-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-400">مكتبة المقاطع الصوتية المولدة</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchLibrary}
                  disabled={loadingLibrary}
                  className="py-1 px-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-slate-300 hover:text-white flex items-center gap-1 active:scale-95 disabled:opacity-50 transition-all"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className={loadingLibrary ? "animate-spin" : ""}>
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                  تحديث
                </button>
                <span className="text-[10px] font-mono text-[#E0B252]">{libraryItems.length} ملفات</span>
              </div>
            </div>

            {loadingLibrary && (
              <div className="py-16 text-center text-xs text-slate-400">
                <div className="w-7 h-7 mx-auto border-2 border-[#E0B252] border-t-transparent rounded-full animate-spin mb-3" />
                جارٍ تحميل مكتبة الأصوات...
              </div>
            )}

            {!loadingLibrary && libraryItems.length === 0 && (
              <div className="py-16 text-center px-4 rounded-2xl border border-white/5 bg-[#101216]">
                <div className="w-12 h-12 mx-auto rounded-full bg-[#E0B252]/10 text-[#E0B252] flex items-center justify-center mb-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                </div>
                <p className="text-xs font-bold text-slate-200">لا توجد تسجيلات صوتية بعد</p>
                <span className="text-[11px] text-slate-400 block mt-1">
                  قم بتوليد أي تعليق صوتي أو أغنية أو مؤثر صوتي لتظهر هنا فوراً.
                </span>
              </div>
            )}

            {!loadingLibrary && libraryItems.length > 0 && (
              <div className="space-y-2">
                {libraryItems.map((item) => {
                  const isCurrent = currentAudioUrl === item.url;
                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-2xl border transition-all flex items-center gap-3 ${
                        isCurrent
                          ? "border-[#E0B252] bg-[#E0B252]/10"
                          : "border-white/5 bg-[#101216] hover:border-white/15"
                      }`}
                    >
                      {/* Play Button */}
                      <button
                        onClick={() => (isCurrent ? togglePlay() : playTrack(item.url))}
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 ${
                          isCurrent && isPlaying
                            ? "bg-[#E0B252] text-[#1A1206]"
                            : "bg-white/10 text-white hover:bg-[#E0B252] hover:text-[#1A1206]"
                        }`}
                      >
                        {isCurrent && isPlaying ? (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="4" width="4" height="16" />
                            <rect x="14" y="4" width="4" height="16" />
                          </svg>
                        ) : (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5l11 7-11 7z" />
                          </svg>
                        )}
                      </button>

                      {/* Track Details */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-200 truncate">{item.prompt}</p>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                          {new Date(item.createdAt).toLocaleDateString("ar-SA")}
                        </span>
                      </div>

                      {/* Direct Download Button */}
                      <button
                        onClick={() => handleDownload(item.url)}
                        title="تنزيل الملف"
                        className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-slate-300 flex items-center justify-center shrink-0 active:scale-95"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                          <path d="M12 4v12M8 12l4 4 4-4M4 20h16" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
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
                onClick={() => handleDownload()}
                className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-bold text-slate-300 active:scale-95 flex-none"
              >
                تنزيل
              </button>
            </div>
          )}

          {/* Action Button */}
          {suiteTab !== "lib" && (
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
          )}

          {suiteTab === "lib" && (
            <div className="p-3">
              <MobileBottomNav />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
