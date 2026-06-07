"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import {
  ArrowLeft,
  Badge,
  CalendarDays,
  Check,
  Crown,
  Download,
  AlertCircle,
  Flag,
  ImageIcon,
  LayoutGrid,
  Megaphone,
  MessageCircle,
  Play,
  RefreshCcw,
  Share2,
  Shirt,
  Sparkles,
  Trophy,
  Upload,
  Video,
  Wand2,
} from "lucide-react";

type TemplateMode = "image" | "video";

type Template = {
  id: string;
  title: string;
  category: string;
  mode: TemplateMode;
  size: "wide" | "tall" | "square";
  icon: typeof Trophy;
  accent: string;
  bg: string;
  recipe: string;
  image: string;
};

const CATEGORIES = [
  "All",
  "World Cup Glory",
  "Player Cards",
  "Match Day",
  "Fan Posters",
  "Lineups",
  "Jerseys",
  "News",
  "Viral Clips",
  "FUT Candid",
  "Stands Candid Shot",
];

const TEMPLATES: Template[] = [
  // Original Templates
  {
    id: "world-cup-glory",
    title: "World Cup Glory",
    category: "World Cup Glory",
    mode: "image",
    size: "wide",
    icon: Trophy,
    accent: "#f8c95c",
    bg: "linear-gradient(120deg, rgba(248,201,92,.92), rgba(88,32,18,.78))",
    recipe: "premium World Cup hero poster, trophy lights, stadium crowd, national pride, cinematic gold atmosphere, clean readable typography",
    image: "/img/world-cup/world-cup-glory.png",
  },
  {
    id: "top-of-world-original",
    title: "Top of the World",
    category: "World Cup Glory",
    mode: "video",
    size: "square",
    icon: Crown,
    accent: "#facc15",
    bg: "linear-gradient(145deg, rgba(18,27,38,.95), rgba(8,10,14,.92))",
    recipe: "8 second cinematic trophy lift, stadium floodlights, slow motion confetti, emotional celebration, broadcast camera movement",
    image: "/img/world-cup/top-of-world.png",
  },
  {
    id: "superstar-card-original",
    title: "Superstar Card",
    category: "Player Cards",
    mode: "image",
    size: "tall",
    icon: Badge,
    accent: "#a78bfa",
    bg: "linear-gradient(165deg, rgba(124,58,237,.92), rgba(16,23,42,.95))",
    recipe: "football game player card UI, player full body, rating, stats, team colors, glossy panels, mobile game style",
    image: "/img/world-cup/superstar-card.png",
  },
  {
    id: "match-day-original",
    title: "Match Day",
    category: "Match Day",
    mode: "image",
    size: "wide",
    icon: CalendarDays,
    accent: "#38bdf8",
    bg: "linear-gradient(115deg, rgba(14,165,233,.88), rgba(3,7,18,.96))",
    recipe: "broadcast match day graphic, two teams facing each other, VS center mark, date venue, stadium background, sharp sports layout",
    image: "/img/world-cup/match-day.png",
  },
  {
    id: "fan-cam-original",
    title: "Fan Cam Capture",
    category: "Fan Posters",
    mode: "video",
    size: "square",
    icon: Flag,
    accent: "#22c55e",
    bg: "linear-gradient(155deg, rgba(34,197,94,.75), rgba(8,11,18,.92))",
    recipe: "live fan cam sports clip, supporter in stands, waving flags, stadium energy, candid broadcast look, social-ready framing",
    image: "/img/world-cup/fan-cam.png",
  },
  {
    id: "lineup-board-original",
    title: "Starting XI",
    category: "Lineups",
    mode: "image",
    size: "tall",
    icon: LayoutGrid,
    accent: "#14b8a6",
    bg: "linear-gradient(180deg, rgba(20,184,166,.8), rgba(5,46,22,.95))",
    recipe: "team lineup board, green pitch, formation markers, player name capsules, coach area, clean readable broadcast design",
    image: "/img/world-cup/lineup-board.png",
  },
  {
    id: "jersey-drop-original",
    title: "Jersey Drop",
    category: "Jerseys",
    mode: "image",
    size: "square",
    icon: Shirt,
    accent: "#60a5fa",
    bg: "linear-gradient(145deg, rgba(96,165,250,.82), rgba(6,10,18,.96))",
    recipe: "premium national team jersey mockup, fabric texture, front view, elegant pattern, clean studio light, no unauthorized logos unless provided",
    image: "/img/world-cup/jersey-drop.png",
  },
  {
    id: "breaking-news-original",
    title: "Breaking Football",
    category: "News",
    mode: "image",
    size: "wide",
    icon: Megaphone,
    accent: "#f97316",
    bg: "linear-gradient(110deg, rgba(249,115,22,.9), rgba(17,24,39,.95))",
    recipe: "sports breaking news graphic, exact headline, player photo zone, lower ticker, premium newsroom composition, no invented facts",
    image: "/img/world-cup/breaking-news.png",
  },
  {
    id: "goal-burst-original",
    title: "Goal Burst",
    category: "Viral Clips",
    mode: "video",
    size: "square",
    icon: Play,
    accent: "#fb7185",
    bg: "linear-gradient(145deg, rgba(251,113,133,.8), rgba(8,13,23,.96))",
    recipe: "viral goal celebration video, fast camera push, slow motion jump, crowd roar, confetti, energetic sports edit",
    image: "/img/world-cup/goal-burst.png",
  },
  {
    id: "prompt-extract",
    title: "Recreate Design",
    category: "World Cup Glory",
    mode: "image",
    size: "square",
    icon: Sparkles,
    accent: "#06b6d4",
    bg: "linear-gradient(145deg, rgba(6,182,212,.75), rgba(8,10,18,.96))",
    recipe: "recreate the uploaded football design faithfully, preserve Arabic and English text, describe layout, panels, player cutout, typography, colors and lighting",
    image: "/img/world-cup/recreate-design.png",
  },

  // Screenshot Presets
  {
    id: "superstar-lobby",
    title: "Superstar Lobby",
    category: "FUT Candid",
    mode: "image",
    size: "tall",
    icon: Badge,
    accent: "#a78bfa",
    bg: "linear-gradient(165deg, rgba(124,58,237,.92), rgba(16,23,42,.95))",
    recipe: "premium football superstar mobile game lobby UI, player full body, ratings, stats, menu buttons",
    image: "/img/world-cup/superstar-lobby.png",
  },
  {
    id: "top-of-world-preset",
    title: "Top of the World Preset",
    category: "World Cup Glory",
    mode: "video",
    size: "tall",
    icon: Crown,
    accent: "#facc15",
    bg: "linear-gradient(145deg, rgba(18,27,38,.95), rgba(8,10,14,.92))",
    recipe: "stunning cinematic victory celebration lifting golden World Cup trophy, stadium crowd, slow motion gold confetti",
    image: "/img/world-cup/top-of-world-female.png",
  },
  {
    id: "post-match-comments",
    title: "Sharp/Post-MatchComments",
    category: "FUT Candid",
    mode: "image",
    size: "wide",
    icon: Megaphone,
    accent: "#f97316",
    bg: "linear-gradient(110deg, rgba(249,115,22,.9), rgba(17,24,39,.95))",
    recipe: "post-match football conference interview, cute fluffy cat sitting behind microphones, camera flash, stadium background",
    image: "/img/world-cup/cat-press-conference.png",
  },
  {
    id: "cat-stands",
    title: "Stands Cam Capture",
    category: "Stands Candid Shot",
    mode: "image",
    size: "square",
    icon: Flag,
    accent: "#22c55e",
    bg: "linear-gradient(155deg, rgba(34,197,94,.75), rgba(8,11,18,.92))",
    recipe: "cute orange cat wearing blue-and-white fan scarf, sitting in stadium stands among fans, funny candid capture",
    image: "/img/world-cup/cat-stands.png",
  },
  {
    id: "focus-10",
    title: "Focus 10",
    category: "World Cup Glory",
    mode: "image",
    size: "tall",
    icon: Trophy,
    accent: "#f8c95c",
    bg: "linear-gradient(120deg, rgba(248,201,92,.92), rgba(88,32,18,.78))",
    recipe: "premium sports poster, young male player in blue uniform, dramatic lighting, bold header text FOCUS 10, clean composition",
    image: "/img/world-cup/focus-10.png",
  },
  {
    id: "pizza-candid",
    title: "Caught Eating Live",
    category: "Stands Candid Shot",
    mode: "video",
    size: "tall",
    icon: Play,
    accent: "#fb7185",
    bg: "linear-gradient(145deg, rgba(251,113,133,.8), rgba(8,13,23,.96))",
    recipe: "sports broadcast candid shot, young male fan eating giant slice of pizza in stadium stands, camera looking at him",
    image: "/img/world-cup/fan-eating-pizza.png",
  },
];

const WORLD_CUP_IMAGE_MODEL = "google/nano-banana";
const WORLD_CUP_VIDEO_MODEL = "wavespeed-ai/cinematic-video-generator";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function WorldCupStudioPage() {
  const [category, setCategory] = useState("All");
  const [selectedId, setSelectedId] = useState(TEMPLATES[0].id);
  const [detailOpen, setDetailOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [referenceName, setReferenceName] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [generationError, setGenerationError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const visibleTemplates = useMemo(
    () => TEMPLATES.filter((template) => category === "All" || template.category === category),
    [category]
  );

  const selectedTemplate = useMemo(
    () => TEMPLATES.find((template) => template.id === selectedId) ?? TEMPLATES[0],
    [selectedId]
  );
  const SelectedIcon = selectedTemplate.icon;

  const productionPrompt = useMemo(() => {
    const idea = description.trim() || "Create a World Cup themed football visual using the selected template.";
    return [
      `${selectedTemplate.recipe}.`,
      `User description: ${idea}`,
      referenceUrl ? `Use the uploaded reference image as the main visual reference. File name: ${referenceName}.` : "No reference image uploaded.",
      "Keep names, Arabic text, teams, scores, dates, and stats exactly as provided. Do not invent real-world facts.",
    ].join("\n");
  }, [description, referenceName, referenceUrl, selectedTemplate]);

  const upscaleHref = selectedTemplate.mode === "video" ? "/apps/tool/video-upscale" : "/apps/tool/image-upscale";
  const extendHref = selectedTemplate.mode === "video" ? "/video-extend" : "/apps/tool/expand-image";
  const speechHref = `/audio?prompt=${encodeURIComponent(description.trim() || selectedTemplate.title)}`;
  const modifyHref = `/edit?prompt=${encodeURIComponent(productionPrompt)}`;

  const handleReference = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setReferenceName(file.name);
    setReferenceUrl(await fileToDataUrl(file));
  };

  const runGeneration = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setGenerationError("");
    setGeneratedUrl("");

    try {
      const isVideo = selectedTemplate.mode === "video";
      const res = await fetch(isVideo ? "/api/generate/video" : "/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isVideo
            ? {
                prompt: productionPrompt,
                modelId: WORLD_CUP_VIDEO_MODEL,
                imageUrl: referenceUrl || undefined,
                duration: 8,
                resolution: "720p",
                aspectRatio: selectedTemplate.size === "tall" ? "9:16" : selectedTemplate.size === "wide" ? "16:9" : "1:1",
                sound: false,
              }
            : {
                prompt: productionPrompt,
                modelId: WORLD_CUP_IMAGE_MODEL,
                imageUrl: referenceUrl || undefined,
                aspectRatio: selectedTemplate.size === "tall" ? "9:16" : selectedTemplate.size === "wide" ? "16:9" : "1:1",
                quality: "1K",
                numImages: 1,
              }
        ),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(String(json?.error || "Generation failed."));
      }

      const output = isVideo
        ? String(json?.videoUrl || json?.mediaUrl || "")
        : String(json?.imageUrl || json?.mediaUrl || json?.imageUrls?.[0] || json?.resultUrls?.[0] || "");
      if (!output) throw new Error("Generation completed but no media URL returned.");
      setGeneratedUrl(output);
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="fixed inset-x-0 bottom-0 top-16 overflow-hidden bg-gradient-to-b from-[#02180d] via-[#051c10] to-[#010a06] text-white">
      {/* Background Stadium Glows */}
      <div className="absolute -left-[10%] top-[10%] h-[450px] w-[450px] rounded-full bg-emerald-500/10 blur-[130px] pointer-events-none" />
      <div className="absolute -right-[10%] bottom-[10%] h-[450px] w-[450px] rounded-full bg-amber-500/10 blur-[130px] pointer-events-none" />

      <section className="flex h-full flex-col px-5 pt-4">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 text-black shadow-lg shadow-yellow-500/20">
              <Trophy size={20} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-black uppercase tracking-[0.16em] bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 bg-clip-text text-transparent">
                Saad World Cup Studio
              </h1>
              <p className="text-xs font-semibold text-emerald-400/80">Choose a template, describe the scene, and generate in this page.</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 md:flex">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Image: Google Nano Banana</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Video: Cinematic Generator</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 overflow-x-auto py-4 scrollbar-none">
          {CATEGORIES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={[
                "h-9 shrink-0 rounded-full px-4 text-xs font-black uppercase tracking-[0.08em] transition-all duration-300 border",
                category === item 
                  ? "bg-gradient-to-r from-yellow-400 to-amber-500 text-black border-yellow-300 shadow-md shadow-yellow-500/10 scale-[1.02]" 
                  : "bg-white/5 text-slate-300 border-white/5 hover:bg-white/10 hover:text-white hover:border-white/10",
              ].join(" ")}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pb-32">
          <div className="grid auto-rows-[180px] grid-cols-4 gap-2 2xl:grid-cols-5">
            {visibleTemplates.map((template, index) => {
              const selected = template.id === selectedTemplate.id;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(template.id);
                    setGeneratedUrl("");
                    setGenerationError("");
                    setDetailOpen(true);
                  }}
                  className={[
                    "group relative overflow-hidden rounded-xl border text-left transition-all duration-500",
                    template.size === "wide" ? "col-span-2" : "",
                    template.size === "tall" ? "row-span-2" : "",
                    selected 
                      ? "border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.25)] scale-[0.99]" 
                      : "border-white/5 bg-neutral-900/40 hover:border-white/20 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:scale-[1.01]",
                  ].join(" ")}
                >
                  <TemplateArtwork template={template} />
                  
                  {/* Top Header Badge */}
                  <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3.5 z-10">
                    <span className="flex items-center gap-1 rounded-md bg-black/65 border border-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-200 backdrop-blur-md">
                      <span className="text-purple-400">✦</span>
                      <span>{template.title}</span>
                    </span>
                    
                    {selected && (
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black shadow-lg shadow-yellow-500/30">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-[#010905] via-[#010905]/90 to-transparent px-5 pb-6 pt-20 z-10">
          <div className="pointer-events-auto grid w-full max-w-4xl grid-cols-[72px_minmax(0,1fr)_220px] gap-3 rounded-2xl border border-emerald-500/20 bg-[#06180e]/90 p-3 shadow-[0_20px_50px_rgba(0,0,0,0.8)] shadow-black/80 backdrop-blur-xl ring-1 ring-white/5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative grid h-16 place-items-center overflow-hidden rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:border-yellow-400/40"
              title="Upload reference"
            >
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleReference} />
              {referenceUrl ? (
                <Image src={referenceUrl} alt="" fill unoptimized className="object-cover animate-fade-in" />
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Upload size={20} />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Ref</span>
                </div>
              )}
            </button>

            <div className="min-w-0 flex flex-col justify-between py-1 px-1">
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={`Describe what you want to create with "${selectedTemplate.title}"...`}
                className="h-10 w-full resize-none bg-transparent text-sm leading-relaxed text-white outline-none placeholder:text-slate-500 scrollbar-none font-medium"
              />
              <div className="truncate text-[10px] font-black uppercase tracking-wider text-emerald-400/70 flex items-center gap-1.5 mt-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Selected: {selectedTemplate.title}{referenceName ? ` / Ref: ${referenceName}` : ""}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setDetailOpen(true);
                void runGeneration();
              }}
              disabled={isGenerating}
              className="flex h-16 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 text-sm font-black text-black shadow-lg shadow-yellow-500/25 transition-all duration-300 hover:from-yellow-300 hover:to-amber-400 hover:scale-[1.02] disabled:cursor-wait disabled:opacity-50"
            >
              <Sparkles size={16} className={isGenerating ? "animate-spin" : "animate-pulse"} />
              {isGenerating ? "CREATING..." : `GENERATE ${selectedTemplate.mode === "video" ? "VIDEO" : "IMAGE"}`}
            </button>
          </div>
        </div>

        {detailOpen && (
          <div className="absolute inset-0 z-20 grid grid-cols-[minmax(0,1fr)_430px_84px] bg-gradient-to-br from-[#02180d]/98 via-[#03120a]/98 to-black/99 backdrop-blur-2xl">
            <button
              type="button"
              onClick={() => setDetailOpen(false)}
              className="absolute left-6 top-6 z-30 flex h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-black/60 px-4 text-xs font-black uppercase tracking-wider text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300 backdrop-blur"
              aria-label="Back to templates"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>

            <section className="flex min-w-0 flex-col items-center justify-center px-12 py-10">
              <div className="relative grid w-full max-w-5xl place-items-center">
                <div
                  className={[
                    "relative overflow-hidden rounded-md shadow-2xl shadow-black/60",
                    selectedTemplate.size === "tall" ? "h-[72vh] w-[42vh] max-w-[520px]" : "h-[68vh] w-full max-w-5xl",
                  ].join(" ")}
                >
                  {generatedUrl ? (
                    selectedTemplate.mode === "video" ? (
                      <video src={generatedUrl} controls autoPlay loop className="h-full w-full bg-black object-contain animate-fade-in" />
                    ) : (
                      <Image src={generatedUrl} alt={selectedTemplate.title} fill unoptimized className="object-contain animate-fade-in" />
                    )
                  ) : (
                    <>
                      <TemplateArtwork template={selectedTemplate} large />
                      <div className="absolute inset-x-0 bottom-0 p-8 z-10 bg-gradient-to-t from-black via-black/80 to-transparent">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-black/50 border border-white/10 backdrop-blur" style={{ color: selectedTemplate.accent }}>
                          <SelectedIcon size={24} />
                        </div>
                        <h2 className="max-w-2xl text-4xl font-black leading-none text-white tracking-wide uppercase">{selectedTemplate.title}</h2>
                        <p className="mt-4 max-w-3xl text-sm font-bold text-slate-200/90 leading-relaxed bg-black/40 border border-white/5 p-4 rounded-xl backdrop-blur-sm">{description.trim() || selectedTemplate.recipe}</p>
                      </div>
                    </>
                  )}
                  {isGenerating && (
                    <div className="absolute inset-0 grid place-items-center bg-black/70 backdrop-blur-sm">
                      <div className="text-center">
                        <Sparkles className="mx-auto h-10 w-10 animate-spin text-yellow-300" />
                        <p className="mt-3 text-sm font-black uppercase tracking-[0.18em] text-white">Generating Media</p>
                      </div>
                    </div>
                  )}
                </div>

                {generationError && (
                  <div className="mt-4 flex max-w-2xl items-center gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100 animate-bounce">
                    <AlertCircle size={17} />
                    {generationError}
                  </div>
                )}

                <div className="mt-5 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => downloadText(`world-cup-${selectedTemplate.id}.txt`, productionPrompt)}
                    className="flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-xs font-black uppercase tracking-wider text-white hover:bg-white/10 hover:border-white/20 transition duration-300"
                  >
                    <Download size={14} />
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/world-cup-studio?template=${selectedTemplate.id}`)}
                    className="flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-xs font-black uppercase tracking-wider text-white hover:bg-white/10 hover:border-white/20 transition duration-300"
                  >
                    <Share2 size={14} />
                    Share
                  </button>
                </div>
              </div>
            </section>

            <aside className="flex flex-col border-l border-white/10 bg-[#05170d]/70 px-7 py-8 backdrop-blur-xl overflow-y-auto">
              <div className="flex items-center gap-3 pb-5 border-b border-white/5">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 text-black shadow-md shadow-yellow-500/10">
                  <SelectedIcon size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-wide uppercase text-white">{selectedTemplate.title}</h3>
                  <p className="text-[11px] font-black uppercase tracking-wider text-emerald-400/80">{selectedTemplate.category}</p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/5 bg-black/40 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Recipe Prompt</h4>
                  <button type="button" className="text-slate-400 hover:text-white transition-colors" onClick={() => navigator.clipboard.writeText(productionPrompt)} aria-label="Copy prompt">
                    <CopyMini />
                  </button>
                </div>
                <p className="text-xs leading-relaxed text-slate-300 font-semibold">{description.trim() || selectedTemplate.recipe}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="relative h-16 overflow-hidden rounded-lg border border-white/10 group">
                    <TemplateArtwork template={selectedTemplate} />
                  </div>
                  {referenceUrl ? (
                    <div className="relative h-16 overflow-hidden rounded-lg border border-white/10">
                      <Image src={referenceUrl} alt="" fill unoptimized className="object-cover" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="grid h-16 place-items-center rounded-lg border border-dashed border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                    >
                      <Upload size={16} />
                      <span className="text-[9px] font-bold uppercase tracking-wider mt-1">Ref Image</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/5 bg-black/40 p-5">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Specifications</h4>
                <dl className="mt-4 space-y-2.5 text-[11px]">
                  <DetailRow label="Studio Mode" value="Sports Template" />
                  <DetailRow label="Format" value={selectedTemplate.mode === "video" ? "MP4 Video" : "PNG Image"} />
                  <DetailRow label="Aspect Ratio" value={selectedTemplate.size === "tall" ? "9:16 (Tall)" : selectedTemplate.size === "wide" ? "16:9 (Wide)" : "1:1 (Square)"} />
                  <DetailRow label="Max Duration" value={selectedTemplate.mode === "video" ? "8.0s" : "N/A"} />
                  <DetailRow label="Template Preset" value={selectedTemplate.title} />
                  <DetailRow label="Reference Image" value={referenceName || "None"} />
                </dl>
              </div>

              <div className="mt-5">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Post Processing</h4>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <EditButton href={upscaleHref} icon={<ImageIcon size={14} />} label="Upscale" />
                  <EditButton href={extendHref} icon={<Video size={14} />} label="Extend" />
                  <EditButton href={speechHref} icon={<MessageCircle size={14} />} label="Speech" />
                  <EditButton href={modifyHref} icon={<Wand2 size={14} />} label="Modify" />
                </div>
              </div>

              <div className="mt-auto pt-8 border-t border-white/5">
                <div className="grid grid-cols-[1fr_1.1fr] gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDescription("");
                      setReferenceName("");
                      setReferenceUrl("");
                      setGeneratedUrl("");
                      setGenerationError("");
                    }}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-xs font-black uppercase tracking-wider text-slate-200 hover:bg-white/10 hover:text-white transition"
                  >
                    <RefreshCcw size={14} />
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={runGeneration}
                    disabled={isGenerating}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 text-xs font-black uppercase tracking-wider text-black hover:from-yellow-300 hover:to-amber-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Sparkles size={14} />
                    {isGenerating ? "Creating" : generatedUrl ? "Re-Generate" : "Generate Now"}
                  </button>
                </div>
              </div>
            </aside>

            <aside className="flex flex-col gap-2 overflow-y-auto border-l border-white/10 bg-black/60 px-3.5 py-6">
              {TEMPLATES.map((template) => {
                const selected = template.id === selectedTemplate.id;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedId(template.id)}
                    className={[
                      "relative h-16 w-full shrink-0 overflow-hidden rounded-lg border transition duration-300 group",
                      selected ? "border-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.2)]" : "border-white/10 hover:border-white/20",
                    ].join(" ")}
                  >
                    <TemplateArtwork template={template} />
                  </button>
                );
              })}
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}

function TemplateArtwork({ template, large = false }: { template: Template; large?: boolean }) {
  return (
    <div className="absolute inset-0 bg-neutral-950">
      {template.image ? (
        <Image
          src={template.image}
          alt={template.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0" style={{ background: template.bg }} />
      )}
      {/* Visual Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      
      {/* Decorative World Cup Grid/Pattern Overlay */}
      <div className="absolute inset-0 opacity-10 mix-blend-overlay [background-image:radial-gradient(rgba(255,255,255,0.15)_1px,transparent_1px)] [background-size:16px_16px]" />
      
      {/* Glowing border outline for selected/hover items */}
      <div className="absolute inset-0 border border-white/10 group-hover:border-yellow-400/40 transition-colors duration-300" />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-slate-400">
      <dt>{label}</dt>
      <dd className="truncate text-right text-slate-200 font-bold">{value}</dd>
    </div>
  );
}

function EditButton({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <Link href={href} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/5 text-[11px] font-black uppercase tracking-wider text-slate-300 hover:bg-white/10 hover:border-white/10 hover:text-white transition-all duration-300">
      {icon}
      {label}
    </Link>
  );
}

function CopyMini() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 8.5A2.5 2.5 0 0 1 10.5 6H18a2 2 0 0 1 2 2v7.5A2.5 2.5 0 0 1 17.5 18H10a2 2 0 0 1-2-2V8.5Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M6 14H5a2 2 0 0 1-2-2V5.5A2.5 2.5 0 0 1 5.5 3H12a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
