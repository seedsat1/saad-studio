"use client";

import { useMemo, useState } from "react";
import {
  Aperture,
  Camera,
  ChevronRight,
  Clapperboard,
  Download,
  Film,
  ImagePlus,
  Lightbulb,
  Palette,
  Play,
  ScanFace,
  Sparkles,
  Video,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type PaletteKey = "steel" | "amber" | "noir" | "neon";

const cameraOptions = ["ARRI Alexa Mini LF", "Sony Venice 2", "RED V-Raptor", "Blackmagic URSA 12K"];
const lensOptions = ["Anamorphic 40mm", "Spherical 28mm", "Macro 100mm", "Handheld 24-70mm"];
const lightingOptions = ["Cold fluorescent", "Sodium practicals", "Neon noir", "Moonlit contrast"];
const styleOptions = ["Gritty Action Thriller", "Neo-noir Drama", "Sci-fi Tactical", "Luxury Commercial"];
const shotCounts = [6, 9, 12];

const palettes: Record<PaletteKey, { label: string; colors: string[]; accent: string; glow: string }> = {
  steel: {
    label: "Cold Steel",
    colors: ["#f2f4f2", "#71808a", "#171b20", "#24323b", "#9b7567", "#9e1118"],
    accent: "text-cyan-200",
    glow: "shadow-cyan-500/20",
  },
  amber: {
    label: "Amber Smoke",
    colors: ["#fff1d0", "#c9944c", "#5a3622", "#171310", "#665f53", "#b43122"],
    accent: "text-amber-200",
    glow: "shadow-amber-500/20",
  },
  noir: {
    label: "Noir Blue",
    colors: ["#d9e3ea", "#6b7c8f", "#0b1017", "#101b2d", "#283e59", "#f4f1e8"],
    accent: "text-sky-200",
    glow: "shadow-sky-500/20",
  },
  neon: {
    label: "Neon Impact",
    colors: ["#f8f7ff", "#00d7ff", "#6426ff", "#0b0714", "#ff3fb4", "#d7ff4a"],
    accent: "text-fuchsia-200",
    glow: "shadow-fuchsia-500/20",
  },
};

const characterRefs = [
  { title: "Lead profile", note: "front / side / emotion", image: "/seedance%202/1%20(1).webp" },
  { title: "Action pose", note: "impact / motion / danger", image: "/seedance%202/1%20(4).webp" },
  { title: "Wardrobe", note: "texture / silhouette", image: "/seedance%202/1%20(7).webp" },
  { title: "Opponent", note: "neutral / injured / rage", image: "/GPT%20Image%202/SHOT%206.webp" },
];

const environmentRefs = [
  { title: "Wide set", image: "/NEXT%20SCENE%20ENGINE.webp" },
  { title: "Lighting ref", image: "/GPT%20Image%202/SHOT%203.webp" },
  { title: "Texture", image: "/transitions/1%20(3).webp" },
  { title: "Props", image: "/transitions/1%20(6).webp" },
];

function buildShots(scene: string, count: number) {
  const beats = [
    ["Wide establishing", "Slow dolly push", "The location breathes before the first threat appears."],
    ["Over-shoulder", "Handheld push-in", "The lead enters frame and catches the opponent in the reflection."],
    ["Tight impact", "Snap zoom", "First collision lands hard, cutting the rhythm into close combat."],
    ["Low angle", "Tilt reveal", "A prop or environmental hazard becomes part of the choreography."],
    ["POV insert", "Micro shake", "A breath, glance, or hand movement reveals the next move."],
    ["Wide impact", "Whip pan", "Bodies cross the frame, breaking glass and changing screen direction."],
    ["Tracking exit", "Low follow", "The lead moves through the set as the opponent collapses behind."],
    ["Static aftermath", "Locked frame", "The room settles, smoke and reflections carrying the damage."],
    ["ECU end beat", "Smash cut", "A final eye-line or object detail sets up the next scene."],
    ["High angle", "Crane drift", "The geometry of the room clarifies the blocking and escape path."],
    ["Insert detail", "Rack focus", "Blood, water, dust, fabric, or metal gives the scene tactile memory."],
    ["Hero frame", "Slow push", "The final composition sells the emotional cost of the scene."],
  ];

  return beats.slice(0, count).map(([type, movement, description], index) => ({
    id: index + 1,
    time: `${Math.round((15 / count) * index)}-${Math.round((15 / count) * (index + 1))}s`,
    type,
    movement,
    description: scene.trim() ? `${description} Scene focus: ${scene.trim()}.` : description,
  }));
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm font-semibold text-white outline-none transition focus:border-cyan-300/60"
      >
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function MediaTile({ title, note, image }: { title: string; note?: string; image: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-black/35">
      <div className="relative aspect-[4/3]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={title} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-2 left-2 right-2">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white">{title}</p>
          {note && <p className="mt-0.5 text-[9px] text-slate-300">{note}</p>}
        </div>
      </div>
    </div>
  );
}

export default function CinemaBoardPage() {
  const [sceneTitle, setSceneTitle] = useState("Action Restroom Fight");
  const [scenePrompt, setScenePrompt] = useState("A masked woman ambushes a wounded man inside a wet public restroom.");
  const [duration, setDuration] = useState("15 seconds");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [camera, setCamera] = useState(cameraOptions[0]);
  const [lens, setLens] = useState(lensOptions[0]);
  const [lighting, setLighting] = useState(lightingOptions[0]);
  const [style, setStyle] = useState(styleOptions[0]);
  const [shotCount, setShotCount] = useState(9);
  const [paletteKey, setPaletteKey] = useState<PaletteKey>("steel");
  const [referencePreview, setReferencePreview] = useState<string | null>(null);

  const activePalette = palettes[paletteKey];
  const shots = useMemo(() => buildShots(scenePrompt, shotCount), [scenePrompt, shotCount]);

  const uploadReference = (file?: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setReferencePreview(url);
  };

  return (
    <div className="min-h-screen bg-[#04070d] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_8%,rgba(34,211,238,0.18),transparent_32%),radial-gradient(circle_at_80%_12%,rgba(168,85,247,0.16),transparent_28%),linear-gradient(180deg,#04070d,#07101d_44%,#03050a)]" />
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.08) 1px,transparent 1px)", backgroundSize: "42px 42px" }}
        />
      </div>

      <div className="relative mx-auto max-w-[1800px] px-4 py-6 lg:px-6">
        <header className="mb-5 flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100">
              <Clapperboard className="h-3.5 w-3.5" />
              Cinema Board
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Cinematic Previs Production Sheet
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
              Build production-ready boards with character references, environment design, shot timing, camera language, lighting, and color palettes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/15"
            >
              <Download className="h-4 w-4" />
              Export / Print
            </button>
            <button className={cn("inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-950 shadow-2xl", activePalette.glow)}>
              <Sparkles className="h-4 w-4" />
              Generate Board
            </button>
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <section className="rounded-2xl border border-white/10 bg-slate-950/75 p-4 shadow-2xl shadow-black/30 backdrop-blur">
              <div className="mb-4 flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-cyan-200" />
                <h2 className="text-sm font-black uppercase tracking-[0.16em] text-white">Scene Brief</h2>
              </div>
              <div className="space-y-4">
                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Scene title</span>
                  <input
                    value={sceneTitle}
                    onChange={(event) => setSceneTitle(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm font-semibold text-white outline-none focus:border-cyan-300/60"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Scene idea</span>
                  <textarea
                    value={scenePrompt}
                    onChange={(event) => setScenePrompt(event.target.value)}
                    rows={4}
                    className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm leading-6 text-white outline-none focus:border-cyan-300/60"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Duration</span>
                    <input value={duration} onChange={(event) => setDuration(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm font-semibold text-white outline-none focus:border-cyan-300/60" />
                  </label>
                  <SelectField label="Aspect" value={aspectRatio} options={["16:9", "2.39:1", "1:1", "9:16"]} onChange={setAspectRatio} />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-slate-950/75 p-4 shadow-2xl shadow-black/30 backdrop-blur">
              <div className="mb-4 flex items-center gap-2">
                <Camera className="h-4 w-4 text-amber-200" />
                <h2 className="text-sm font-black uppercase tracking-[0.16em] text-white">Camera Language</h2>
              </div>
              <div className="space-y-4">
                <SelectField label="Camera" value={camera} options={cameraOptions} onChange={setCamera} />
                <SelectField label="Lens package" value={lens} options={lensOptions} onChange={setLens} />
                <SelectField label="Lighting" value={lighting} options={lightingOptions} onChange={setLighting} />
                <SelectField label="Style" value={style} options={styleOptions} onChange={setStyle} />
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-slate-950/75 p-4 shadow-2xl shadow-black/30 backdrop-blur">
              <div className="mb-4 flex items-center gap-2">
                <Palette className="h-4 w-4 text-fuchsia-200" />
                <h2 className="text-sm font-black uppercase tracking-[0.16em] text-white">Color + Shots</h2>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(palettes) as PaletteKey[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => setPaletteKey(key)}
                      className={cn("rounded-xl border p-3 text-left transition", paletteKey === key ? "border-white/60 bg-white/10" : "border-white/10 bg-white/[0.03] hover:border-white/30")}
                    >
                      <span className="text-xs font-black text-white">{palettes[key].label}</span>
                      <span className="mt-2 flex gap-1">
                        {palettes[key].colors.slice(0, 4).map((color) => (
                          <span key={color} className="h-4 flex-1 rounded" style={{ backgroundColor: color }} />
                        ))}
                      </span>
                    </button>
                  ))}
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Storyboard shots</span>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {shotCounts.map((count) => (
                      <button
                        key={count}
                        onClick={() => setShotCount(count)}
                        className={cn("rounded-xl border px-3 py-3 text-sm font-black transition", shotCount === count ? "border-cyan-200 bg-cyan-200 text-slate-950" : "border-white/10 bg-white/[0.03] text-white hover:border-white/30")}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-3 py-3 text-sm text-slate-300 hover:border-white/35">
                  <span className="inline-flex items-center gap-2">
                    <ImagePlus className="h-4 w-4" />
                    Upload reference
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => uploadReference(event.target.files?.[0])} />
                  <ChevronRight className="h-4 w-4" />
                </label>
                {referencePreview && (
                  <div className="overflow-hidden rounded-xl border border-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={referencePreview} alt="Uploaded reference" className="h-36 w-full object-cover" />
                  </div>
                )}
              </div>
            </section>
          </aside>

          <main className="rounded-2xl border border-white/10 bg-[#070b10] p-3 shadow-2xl shadow-black/40 lg:p-4">
            <div className="rounded-xl border border-white/10 bg-black p-3">
              <div className="border-b border-white/15 pb-3 text-center">
                <h2 className="text-xl font-black uppercase tracking-[0.12em] text-white lg:text-3xl">
                  {sceneTitle || "Untitled Scene"} - Cinematic Previs / Production Sheet
                </h2>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] uppercase tracking-[0.12em] text-slate-400">
                  <span>Duration: {duration}</span>
                  <span>Aspect Ratio: {aspectRatio}</span>
                  <span>Style: {style}</span>
                  <span>Camera: {camera}</span>
                  <span>Lens: {lens}</span>
                </div>
              </div>

              <div className="mt-3 grid gap-3 xl:grid-cols-[1.05fr_0.95fr]">
                <section className="rounded-lg border border-white/15 bg-slate-950/70 p-3">
                  <div className="mb-2 flex items-center gap-2 border-b border-white/10 pb-2">
                    <ScanFace className="h-4 w-4 text-cyan-200" />
                    <h3 className="text-xs font-black uppercase tracking-[0.16em] text-white">A) Character Reference</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    {characterRefs.map((item) => <MediaTile key={item.title} {...item} />)}
                  </div>
                </section>

                <section className="rounded-lg border border-white/15 bg-slate-950/70 p-3">
                  <div className="mb-2 flex items-center gap-2 border-b border-white/10 pb-2">
                    <Lightbulb className="h-4 w-4 text-amber-200" />
                    <h3 className="text-xs font-black uppercase tracking-[0.16em] text-white">B) Environment / Set Design</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {environmentRefs.map((item) => <MediaTile key={item.title} {...item} />)}
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-[1fr_1.1fr]">
                    <div className="rounded-lg border border-white/10 bg-black/35 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Architectural notes</p>
                      <ul className="mt-2 space-y-1 text-[11px] leading-5 text-slate-300">
                        <li>Narrow layout, one entry/exit, reflective surfaces.</li>
                        <li>Wet floor, hard surfaces, limited cover.</li>
                        <li>Lighting: {lighting}, practical fixtures, motivated shadows.</li>
                      </ul>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/35 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Blocking map</p>
                      <div className="mt-3 h-24 rounded border border-cyan-200/20 bg-[linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px)] bg-[length:28px_28px] p-3">
                        <div className="relative h-full rounded border border-white/20">
                          {[1, 2, 3, 4, 5].map((n, i) => (
                            <span key={n} className="absolute flex h-6 w-6 items-center justify-center rounded-full border border-red-300 bg-red-500/20 text-[10px] font-black text-red-100" style={{ left: `${8 + i * 19}%`, top: `${i % 2 ? 48 : 18}%` }}>{n}</span>
                          ))}
                          <div className="absolute left-[12%] top-[55%] h-px w-[72%] border-t border-dashed border-red-300/70" />
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <section className="mt-3 rounded-lg border border-white/15 bg-slate-950/70 p-3">
                <div className="mb-2 flex items-center gap-2 border-b border-white/10 pb-2">
                  <Film className="h-4 w-4 text-fuchsia-200" />
                  <h3 className="text-xs font-black uppercase tracking-[0.16em] text-white">C) Storyboard Sequence ({shotCount} shots / 0-{duration})</h3>
                </div>
                <div className="grid gap-2 md:grid-cols-3 2xl:grid-cols-6">
                  {shots.map((shot) => (
                    <article key={shot.id} className="overflow-hidden rounded-lg border border-white/10 bg-black/45">
                      <div className="relative aspect-video bg-slate-900">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={environmentRefs[shot.id % environmentRefs.length].image} alt={shot.type} className="h-full w-full object-cover opacity-75" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                        <div className="absolute left-2 top-2 rounded bg-black/70 px-2 py-1 text-[10px] font-black text-white">
                          {String(shot.id).padStart(2, "0")} ({shot.time})
                        </div>
                        <Play className="absolute bottom-2 right-2 h-4 w-4 text-white/80" />
                      </div>
                      <div className="space-y-2 p-3">
                        <p className={cn("text-[11px] font-black uppercase tracking-[0.12em]", activePalette.accent)}>{shot.type}</p>
                        <p className="text-[10px] uppercase tracking-[0.08em] text-slate-500">Movement: {shot.movement}</p>
                        <p className="text-[11px] leading-5 text-slate-300">{shot.description}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <div className="mt-3 grid gap-3 xl:grid-cols-[0.9fr_1.1fr_0.65fr]">
                <section className="rounded-lg border border-white/15 bg-slate-950/70 p-3">
                  <div className="mb-2 flex items-center gap-2 border-b border-white/10 pb-2">
                    <Aperture className="h-4 w-4 text-cyan-200" />
                    <h3 className="text-xs font-black uppercase tracking-[0.16em] text-white">D) Cinematography Notes</h3>
                  </div>
                  <ul className="space-y-2 text-[11px] leading-5 text-slate-300">
                    <li>Camera body: {camera}</li>
                    <li>Lens language: {lens}, close-combat coverage.</li>
                    <li>Lighting: {lighting}; contrast designed around silhouettes and reflections.</li>
                    <li>Movement keywords: claustrophobic, surface tension, impact, breath, aftermath.</li>
                  </ul>
                </section>

                <section className="rounded-lg border border-white/15 bg-slate-950/70 p-3">
                  <div className="mb-2 flex items-center gap-2 border-b border-white/10 pb-2">
                    <Video className="h-4 w-4 text-rose-200" />
                    <h3 className="text-xs font-black uppercase tracking-[0.16em] text-white">E) Material / Prop References</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {["Mirror glass", "Wet floor", "Chrome fixture", "Wardrobe", "Blood detail", "Atmosphere"].map((item, index) => (
                      <div key={item} className="rounded-lg border border-white/10 bg-black/35 p-2">
                        <div className="h-16 rounded bg-gradient-to-br from-slate-500/30 to-slate-950" style={{ backgroundColor: activePalette.colors[index % activePalette.colors.length] }} />
                        <p className="mt-2 text-[10px] font-black uppercase tracking-[0.1em] text-slate-300">{item}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-lg border border-white/15 bg-slate-950/70 p-3">
                  <div className="mb-2 flex items-center gap-2 border-b border-white/10 pb-2">
                    <Palette className="h-4 w-4 text-fuchsia-200" />
                    <h3 className="text-xs font-black uppercase tracking-[0.16em] text-white">F) Color Palette</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {activePalette.colors.map((color) => (
                      <div key={color}>
                        <div className="h-16 rounded border border-white/10" style={{ backgroundColor: color }} />
                        <p className="mt-1 text-center text-[9px] font-black uppercase text-slate-400">{color}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="mt-3 border-t border-white/10 pt-3 text-center text-[10px] uppercase tracking-[0.28em] text-slate-600">
                Saad Studio Cinema Board - Production Use
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
