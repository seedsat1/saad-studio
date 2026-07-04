"use client";

import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Music,
  Sliders,
  Wand2,
  Loader2,
  Play,
  Pause,
  Download,
  Volume2,
  Image as ImageIcon,
  X,
  FileAudio,
  Sparkles,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProModal } from "@/hooks/use-pro-modal";
import { useToast } from "@/components/ui/use-toast";
import Heading from "@/components/heading";
import { useGenerationGate } from "@/hooks/use-generation-gate";

interface UploadedImage {
  data: string; // base64
  file: File;
  preview: string;
}

const MUSIC_MODELS = [
  {
    id: "elevenlabs/music",
    label: "AI Song Generator",
    sublabel: "High-fidelity stereo music with custom lyrics",
    badge: "FAST",
    avatar: "⚡",
    maxDuration: 120,
    hasLyrics: true,
  },
  {
    id: "minimax/minimax-music-2.5",
    label: "Minimax Music",
    sublabel: "Full songs with verses, choruses, & bridges",
    badge: "PRO",
    avatar: "🏆",
    maxDuration: 180,
    hasLyrics: true,
  }
];

export default function AudioPage() {
  const proModal = useProModal();
  const { toast } = useToast();
  const { guardGeneration, getSafeErrorMessage } = useGenerationGate();

  // Tab State: "sound-studio" | "create-song"
  const [activeTab, setActiveTab] = useState<"sound-studio" | "create-song">("sound-studio");

  // Lyria State
  const [selectedModel, setSelectedModel] = useState(MUSIC_MODELS[0]);
  const [prompt, setPrompt] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [style, setStyle] = useState("");
  const [forceInstrumental, setForceInstrumental] = useState(false);
  const [outputFormat, setOutputFormat] = useState<"mp3" | "wav">("mp3");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Player State
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [generatedLyrics, setGeneratedLyrics] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Clean up previews on unmount
  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.preview));
    };
  }, [images]);

  // Audio Playback Sync
  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    if (images.length + files.length > 10) {
      toast({ title: "Maximum 10 images allowed", variant: "destructive" });
      return;
    }

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages((prev) => [
          ...prev,
          {
            data: reader.result as string,
            file,
            preview: URL.createObjectURL(file),
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = `saadstudio_music_${Date.now()}.${outputFormat}`;
    a.click();
  };

  const onGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: "Please enter a prompt", variant: "destructive" });
      return;
    }

    const gate = await guardGeneration({
      requiredCredits: 20,
      action: "music:generate",
    });
    if (!gate.ok) {
      if (gate.reason === "error") {
        toast({
          variant: "destructive",
          title: "Something went wrong",
          description: gate.message ?? getSafeErrorMessage(gate.message),
        });
      }
      return;
    }

    try {
      setIsGenerating(true);
      setAudioUrl(null);
      setGeneratedLyrics(null);
      setIsPlaying(false);

      const payload = {
        prompt,
        model: selectedModel.id,
        lyrics: lyrics.trim() || undefined,
        style: style.trim() || undefined,
        force_instrumental: forceInstrumental,
        output_format: outputFormat,
        images: images.map(img => ({
          data: img.data,
          mimeType: img.file.type
        }))
      };

      const res = await axios.post("/api/music", payload);
      setAudioUrl(res.data.audioUrl);
      if (res.data.lyrics) {
        setGeneratedLyrics(res.data.lyrics);
      }
    } catch (error: any) {
      if (error?.response?.status === 403) {
        proModal.onOpen();
      } else {
        toast({
          variant: "destructive",
          title: "Something went wrong",
          description: getSafeErrorMessage(error),
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const loadLyricsTemplate = () => {
    setLyrics(`[Verse 1]
Walking through the neon glow,
city lights reflect below,
every shadow tells a story.

[Chorus]
We are the echoes in the night,
burning brighter than the light,
hold on tight, don't let me go.`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-black">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between border-b border-white/10 bg-zinc-950 px-4 py-2">
        <div className="flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-violet-500" />
          <span className="text-sm font-bold text-white uppercase tracking-wider hidden sm:block">Audio Suite</span>
        </div>
        <div className="flex bg-white/5 rounded-xl p-1 gap-1 border border-white/10">
          <button
            onClick={() => setActiveTab("sound-studio")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all",
              activeTab === "sound-studio"
                ? "bg-violet-600 text-white shadow-lg"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <Sliders className="h-3.5 w-3.5" />
            Sound Studio
          </button>
          <button
            onClick={() => setActiveTab("create-song")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all",
              activeTab === "create-song"
                ? "bg-violet-600 text-white shadow-lg"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Create Your Song
          </button>
        </div>
        <div className="w-10 sm:w-20" /> {/* Spacer */}
      </div>

      {/* Main Tab Panels */}
      <div className="flex-1">
        {activeTab === "sound-studio" ? (
          <iframe
            src="/stude/sound.html?embed=1"
            className="w-full border-0"
            style={{ height: "calc(100vh - 58px)", display: "block" }}
            title="Audio Studio"
            allow="microphone *; autoplay *"
          />
        ) : (
          <div className="max-w-7xl mx-auto px-4 py-6 md:px-8 space-y-6">
            <Heading
              title="Create Your Song"
              description="Compose high-fidelity stereo music using text prompts, custom lyrics, and visual inspiration."
              icon={Music}
              iconColor="text-violet-500"
              bgColor="bg-violet-500/10"
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Input Panel (Col span 7) */}
              <div className="lg:col-span-7 space-y-6 bg-white/[0.02] border border-white/[0.08] rounded-2xl p-5 md:p-6 backdrop-blur-xl">
                {/* Model Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Model Selection</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {MUSIC_MODELS.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => setSelectedModel(model)}
                        className={cn(
                          "flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all hover:bg-white/[0.04]",
                          selectedModel.id === model.id
                            ? "border-violet-500 bg-violet-500/10 text-white"
                            : "border-white/[0.08] bg-black/20 text-zinc-400"
                        )}
                      >
                        <span className="text-2xl shrink-0">{model.avatar}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm truncate">{model.label}</span>
                            <span className={cn(
                              "text-[9px] font-bold px-1.5 py-0.5 rounded",
                              model.badge === "PRO" ? "bg-violet-500/20 text-violet-400" : "bg-emerald-500/20 text-emerald-400"
                            )}>
                              {model.badge}
                            </span>
                          </div>
                          <span className="block text-[10px] text-zinc-500 truncate">{model.sublabel}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prompt Box */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Music Description</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the track... (e.g. A slow lo-fi hip hop beat with Rhodes piano chords, upright bass, and vinyl crackle. Instrumental only.)"
                    rows={3}
                    className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-4 py-3 text-sm text-white placeholder:text-zinc-600 resize-none focus:outline-none focus:border-violet-500/50 transition-colors"
                  />
                </div>

                {/* Multimodal Images */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Visual Inspiration</label>
                    <span className="text-[10px] text-zinc-500">{images.length}/10 Images</span>
                  </div>
                  
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                    {images.map((img, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group bg-black/40">
                        <img src={img.preview} alt="Visual inspiration preview" className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeImage(i)}
                          className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4 text-red-500" />
                        </button>
                      </div>
                    ))}
                    {images.length < 10 && (
                      <label className="aspect-square rounded-lg border border-dashed border-white/20 hover:border-violet-500/50 bg-black/20 hover:bg-white/[0.02] flex flex-col items-center justify-center cursor-pointer transition-colors">
                        <ImageIcon className="h-4 w-4 text-zinc-500" />
                        <span className="text-[9px] text-zinc-500 mt-1">Upload</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Optional Custom Lyrics */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Custom Lyrics</label>
                    <button
                      onClick={loadLyricsTemplate}
                      className="text-[10px] text-violet-400 hover:text-violet-300 font-medium transition-colors"
                    >
                      Use Template
                    </button>
                  </div>
                  <textarea
                    value={lyrics}
                    onChange={(e) => setLyrics(e.target.value)}
                    placeholder="Enter custom lyrics with structural section tags e.g. [Verse], [Chorus]..."
                    rows={4}
                    className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-4 py-3 text-sm text-white placeholder:text-zinc-600 resize-none focus:outline-none focus:border-violet-500/50 transition-colors"
                  />
                </div>

                {/* Additional Settings Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Style Genre tags */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Mood / Style Tags</label>
                    <input
                      value={style}
                      onChange={(e) => setStyle(e.target.value)}
                      placeholder="e.g. ambient, dreamy, guitar pop"
                      className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 transition-colors"
                    />
                  </div>

                  {/* Settings Toggle / Format Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Instrumental / Format</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setForceInstrumental(!forceInstrumental)}
                        className={cn(
                          "flex-1 py-2 px-3 text-xs font-semibold rounded-xl border transition-colors",
                          forceInstrumental
                            ? "border-violet-500/50 bg-violet-500/10 text-violet-300"
                            : "border-white/[0.08] bg-black/20 text-zinc-400"
                        )}
                      >
                        Instrumental
                      </button>
                      
                      {selectedModel.id.includes("pro") ? (
                        <select
                          value={outputFormat}
                          onChange={(e: any) => setOutputFormat(e.target.value)}
                          className="py-2 px-3 text-xs font-semibold rounded-xl border border-white/[0.08] bg-black/20 text-zinc-400 focus:outline-none focus:border-violet-500/50 cursor-pointer"
                        >
                          <option value="mp3">MP3</option>
                          <option value="wav">WAV</option>
                        </select>
                      ) : (
                        <div className="py-2 px-3 text-xs font-semibold rounded-xl border border-white/[0.04] bg-black/10 text-zinc-600 select-none">
                          MP3 (Locked)
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Generate Trigger */}
                <button
                  onClick={onGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 rounded-xl py-3 font-bold text-sm transition-all mt-4",
                    isGenerating || !prompt.trim()
                      ? "bg-violet-600/20 text-violet-500/50 cursor-not-allowed border border-violet-500/10"
                      : "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20"
                  )}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Synthesizing audio arrangement…
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      Compose Song · 20 cr
                    </>
                  )}
                </button>
              </div>

              {/* Output Panel (Col span 5) */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-5 backdrop-blur-xl space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Audio Workspace</h3>
                  
                  {isGenerating && (
                    <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                      <Loader2 className="h-10 w-10 text-violet-500 animate-spin" />
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-white">AI Song Generator is composing...</p>
                        <p className="text-xs text-zinc-500 max-w-[280px]">Structuring song parts, synthesizing vocals, and arranging stereo channels.</p>
                      </div>
                    </div>
                  )}

                  {!isGenerating && !audioUrl && (
                    <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/10 rounded-xl bg-black/10">
                      <FileAudio className="h-12 w-12 text-zinc-600 mb-3" />
                      <p className="text-sm font-medium text-zinc-500">Your generated music will appear here</p>
                    </div>
                  )}

                  {audioUrl && !isGenerating && (
                    <div className="space-y-4">
                      {/* Audio Tag */}
                      <audio
                        ref={audioRef}
                        src={audioUrl}
                        onEnded={() => setIsPlaying(false)}
                        className="hidden"
                      />

                      {/* Custom Audio Control Container */}
                      <div className="flex items-center gap-4 bg-black/40 border border-white/10 rounded-xl p-4">
                        <button
                          onClick={togglePlay}
                          className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-600 text-white hover:bg-violet-500 transition-colors shadow-md shrink-0"
                        >
                          {isPlaying ? (
                            <Pause className="h-5 w-5 fill-white text-white" />
                          ) : (
                            <Play className="h-5 w-5 fill-white text-white ml-0.5" />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate">AI Song Arrangement</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">Ready to stream/download</p>
                        </div>
                        <button
                          onClick={handleDownload}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                          title="Download Audio"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Generated Lyrics / Song Structure */}
                      {generatedLyrics && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                            <Info className="h-3 w-3" /> Song Lyrics & Structure
                          </label>
                          <div className="rounded-xl border border-white/10 bg-black/40 p-4 max-h-[300px] overflow-y-auto">
                            <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed">
                              {generatedLyrics}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* SynthID watermark disclaimer */}
                <div className="flex gap-3 bg-zinc-950/40 border border-white/[0.04] rounded-xl p-3.5 text-[10px] text-zinc-500">
                  <Info className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Music generations include an imperceptible audio watermark for safety and identification. Music edits are single-turn process.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
