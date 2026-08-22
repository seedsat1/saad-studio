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
  Plus,
  ScanFace,
  Sparkles,
  Trash2,
  Video,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type PaletteKey = "steel" | "amber" | "noir" | "neon";
type CharacterRole = "Hero" | "Villain" | "Support" | "Extra";

type CastCharacter = {
  id: string;
  name: string;
  role: CharacterRole;
  description: string;
  wardrobe: string;
  emotion: string;
  image: string;
};

type LinkedShot = {
  localId: number;
  id: string;
  title: string;
  status: string;
};

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

const defaultCharacters: CastCharacter[] = [
  {
    id: "hero",
    name: "Mira",
    role: "Hero",
    description: "Masked tactical fighter, controlled movement, sharp eyes, silent threat.",
    wardrobe: "black tactical suit, textured mask, wet fabric highlights",
    emotion: "focused, restrained anger",
    image: "/seedance%202/1%20(1).webp",
  },
  {
    id: "villain",
    name: "Karim",
    role: "Villain",
    description: "Wounded ex-operative, cornered but dangerous, bruised face.",
    wardrobe: "dark blazer, open collar, blood detail, damp sleeves",
    emotion: "panic turning into rage",
    image: "/GPT%20Image%202/SHOT%206.webp",
  },
  {
    id: "support",
    name: "Nadia",
    role: "Support",
    description: "Lookout near the exit, keeps the escape route open.",
    wardrobe: "long coat, practical boots, concealed earpiece",
    emotion: "tense and alert",
    image: "/seedance%202/1%20(7).webp",
  },
];

const environmentRefs = [
  { title: "Wide set", image: "/NEXT%20SCENE%20ENGINE.webp" },
  { title: "Lighting ref", image: "/GPT%20Image%202/SHOT%203.webp" },
  { title: "Texture", image: "/transitions/1%20(3).webp" },
  { title: "Props", image: "/transitions/1%20(6).webp" },
];

function buildShots(scene: string, count: number, characters: CastCharacter[]) {
  const hero = characters.find((item) => item.role === "Hero") ?? characters[0];
  const villain = characters.find((item) => item.role === "Villain") ?? characters[1] ?? hero;
  const support = characters.find((item) => item.role === "Support") ?? characters[2] ?? hero;
  const heroName = hero?.name || "Hero";
  const villainName = villain?.name || "Villain";
  const supportName = support?.name || "Support";
  const beats = [
    ["Wide establishing", "Slow dolly push", `${heroName} enters the location while ${villainName} is visible in a broken reflection.`],
    ["Over-shoulder", "Handheld push-in", `${villainName} tracks ${heroName}'s movement and shifts into attack position.`],
    ["Tight impact", "Snap zoom", `${heroName} blocks the first strike, forcing ${villainName} into the hard practical light.`],
    ["Low angle", "Tilt reveal", `${supportName} appears near the exit, changing the geography of the scene.`],
    ["POV insert", "Micro shake", `${heroName} notices a prop or hazard that can turn the fight.`],
    ["Wide impact", "Whip pan", `${heroName} and ${villainName} cross frame fast, breaking the set rhythm.`],
    ["Tracking exit", "Low follow", `${supportName} clears the path while ${heroName} drives the action forward.`],
    ["Static aftermath", "Locked frame", `${villainName} collapses into the background as the room settles.`],
    ["ECU end beat", "Smash cut", `${heroName}'s eyes hold the final emotional beat before the cut.`],
    ["High angle", "Crane drift", `The blocking map clarifies ${heroName}, ${villainName}, and ${supportName}'s positions.`],
    ["Insert detail", "Rack focus", `A detail from ${villainName}'s wardrobe or injury becomes the next story clue.`],
    ["Hero frame", "Slow push", `${heroName} lands in the final composition, carrying the cost of the scene.`],
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

function CharacterCard({
  character,
  onUpdate,
  onRemove,
}: {
  character: CastCharacter;
  onUpdate: (character: CastCharacter) => void;
  onRemove: () => void;
}) {
  const uploadCharacterImage = (file?: File) => {
    if (!file) return;
    onUpdate({ ...character, image: URL.createObjectURL(file) });
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-white/10 bg-black/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={character.image} alt={character.name} className="h-full w-full object-cover" />
          </div>
          <div>
            <p className="text-sm font-black text-white">{character.name || "Unnamed"}</p>
            <p className="text-[10px] uppercase tracking-[0.14em] text-cyan-200">{character.role}</p>
          </div>
        </div>
        <button onClick={onRemove} className="rounded-lg border border-red-400/20 bg-red-500/10 p-2 text-red-200 hover:bg-red-500/20">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid gap-2">
        <input
          value={character.name}
          onChange={(event) => onUpdate({ ...character, name: event.target.value })}
          placeholder="Character name"
          className="rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-xs font-semibold text-white outline-none focus:border-cyan-300/60"
        />
        <select
          value={character.role}
          onChange={(event) => onUpdate({ ...character, role: event.target.value as CharacterRole })}
          className="rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-xs font-semibold text-white outline-none focus:border-cyan-300/60"
        >
          {["Hero", "Villain", "Support", "Extra"].map((role) => <option key={role} value={role}>{role}</option>)}
        </select>
        <textarea
          value={character.description}
          onChange={(event) => onUpdate({ ...character, description: event.target.value })}
          rows={2}
          placeholder="Face, body, identity, screen presence"
          className="resize-none rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-xs leading-5 text-white outline-none focus:border-cyan-300/60"
        />
        <input
          value={character.wardrobe}
          onChange={(event) => onUpdate({ ...character, wardrobe: event.target.value })}
          placeholder="Wardrobe / texture"
          className="rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none focus:border-cyan-300/60"
        />
        <input
          value={character.emotion}
          onChange={(event) => onUpdate({ ...character, emotion: event.target.value })}
          placeholder="Emotion / performance"
          className="rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-white outline-none focus:border-cyan-300/60"
        />
        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 bg-white/[0.03] px-3 py-2 text-xs font-bold text-slate-300 hover:border-white/35">
          <ImagePlus className="h-3.5 w-3.5" />
          Character reference
          <input type="file" accept="image/*" className="hidden" onChange={(event) => uploadCharacterImage(event.target.files?.[0])} />
        </label>
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
  const [characters, setCharacters] = useState<CastCharacter[]>(defaultCharacters);
  const [linkedProjectId, setLinkedProjectId] = useState<string | null>(null);
  const [linkedShots, setLinkedShots] = useState<LinkedShot[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [generatingShotId, setGeneratingShotId] = useState<string | null>(null);

  const activePalette = palettes[paletteKey];
  const shots = useMemo(() => buildShots(scenePrompt, shotCount, characters), [scenePrompt, shotCount, characters]);
  const numericDuration = useMemo(() => {
    const match = duration.match(/\d+/);
    return match ? Math.max(3, Math.min(20, Number.parseInt(match[0], 10))) : 5;
  }, [duration]);

  const uploadReference = (file?: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setReferencePreview(url);
  };

  const addCharacter = () => {
    const index = characters.length + 1;
    setCharacters((items) => [
      ...items,
      {
        id: `character-${Date.now()}`,
        name: `Character ${index}`,
        role: "Extra",
        description: "Describe the face, body language, and story function.",
        wardrobe: "wardrobe, texture, silhouette",
        emotion: "primary emotional state",
        image: "/GPT%20Image%202/SHOT%205.webp",
      },
    ]);
  };

  const createLinkedProject = async () => {
    setSyncing(true);
    setSyncMessage(null);
    setLinkedProjectId(null);
    setLinkedShots([]);
    try {
      const projectRes = await fetch("/api/cinema/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sceneTitle || "Cinema Board Project",
          conceptPrompt: scenePrompt,
          toneGenre: style,
          aspectRatio,
          defaultDuration: numericDuration,
        }),
      });
      const projectJson = await projectRes.json().catch(() => null);
      if (!projectRes.ok || !projectJson?.project?.id) {
        throw new Error(projectJson?.error || "Failed to create cinema project");
      }

      const projectId = projectJson.project.id as string;
      const createdCharacters = await Promise.all(characters.map(async (character) => {
        const res = await fetch("/api/cinema/character", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            name: character.name,
            description: character.description,
            referenceUrl: character.image.startsWith("blob:") ? null : character.image,
            attributes: {
              role: character.role,
              wardrobe: character.wardrobe,
              emotion: character.emotion,
              consistencyPrompt: `${character.name}, ${character.role}, ${character.description}, wardrobe: ${character.wardrobe}, emotion: ${character.emotion}`,
            },
          }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.character?.id) throw new Error(json?.error || `Failed to create ${character.name}`);
        return { localId: character.id, id: json.character.id as string };
      }));

      const characterIds = createdCharacters.map((item) => item.id);
      const createdShots: LinkedShot[] = [];
      for (const shot of shots) {
        const res = await fetch("/api/cinema/shot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            title: `${String(shot.id).padStart(2, "0")} - ${shot.type}`,
            prompt: [
              scenePrompt,
              shot.description,
              `Cast: ${characters.map((character) => `${character.name} (${character.role}) - ${character.description}; wardrobe: ${character.wardrobe}; emotion: ${character.emotion}`).join(" | ")}`,
              `Camera: ${camera}. Lens: ${lens}. Lighting: ${lighting}. Style: ${style}. Palette: ${activePalette.label}. Movement: ${shot.movement}.`,
              "Maintain exact character identity, wardrobe, role continuity, geography continuity, and cinematic production-board consistency.",
            ].join("\n"),
            duration: numericDuration,
            ratio: aspectRatio,
            cameraPreset: shot.movement,
            characterIds,
            lighting,
            lens,
            colorGrade: activePalette.label,
            consistencyLock: true,
          }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.shot?.id) throw new Error(json?.error || `Failed to create shot ${shot.id}`);
        createdShots.push({ localId: shot.id, id: json.shot.id as string, title: json.shot.title as string, status: "ready" });
      }

      setLinkedProjectId(projectId);
      setLinkedShots(createdShots);
      setSyncMessage(`Linked project created with ${characters.length} characters and ${createdShots.length} shots.`);
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "Failed to link cinema board");
    } finally {
      setSyncing(false);
    }
  };

  const generateLinkedShot = async (shotId: string) => {
    if (!linkedProjectId) return;
    setGeneratingShotId(shotId);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/cinema/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: linkedProjectId, shotId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to start generation");
      setLinkedShots((items) => items.map((item) => item.id === shotId ? { ...item, status: "processing" } : item));
      setSyncMessage(`Shot generation started. Task: ${json?.taskId || "queued"}`);
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "Failed to generate shot");
    } finally {
      setGeneratingShotId(null);
    }
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
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ScanFace className="h-4 w-4 text-cyan-200" />
                  <h2 className="text-sm font-black uppercase tracking-[0.16em] text-white">Cast Builder</h2>
                </div>
                <button
                  onClick={addCharacter}
                  className="inline-flex items-center gap-1 rounded-lg bg-cyan-200 px-2.5 py-1.5 text-[11px] font-black text-slate-950 hover:bg-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>
              <div className="space-y-3">
                {characters.map((character) => (
                  <CharacterCard
                    key={character.id}
                    character={character}
                    onUpdate={(updated) => setCharacters((items) => items.map((item) => item.id === updated.id ? updated : item))}
                    onRemove={() => setCharacters((items) => items.length > 1 ? items.filter((item) => item.id !== character.id) : items)}
                  />
                ))}
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

            <section className="rounded-2xl border border-cyan-200/20 bg-cyan-950/20 p-4 shadow-2xl shadow-cyan-950/20 backdrop-blur">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-100" />
                <h2 className="text-sm font-black uppercase tracking-[0.16em] text-white">Real Cinema Link</h2>
              </div>
              <p className="text-xs leading-6 text-cyan-50/75">
                Creates a real Cinema Project, saves cast profiles, links every shot to the same characters, then enables generation per shot.
              </p>
              <button
                onClick={createLinkedProject}
                disabled={syncing}
                className="mt-4 w-full rounded-xl bg-cyan-200 px-4 py-3 text-sm font-black text-slate-950 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {syncing ? "Linking board..." : linkedProjectId ? "Rebuild linked project" : "Create linked project"}
              </button>
              {linkedProjectId && (
                <a
                  href="/shots"
                  className="mt-2 block rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-xs font-black text-white hover:bg-white/10"
                >
                  Open Shots Studio
                </a>
              )}
              {syncMessage && (
                <p className={cn("mt-3 rounded-lg border px-3 py-2 text-xs leading-5", syncMessage.toLowerCase().includes("failed") || syncMessage.toLowerCase().includes("unauthorized") ? "border-red-400/25 bg-red-500/10 text-red-100" : "border-cyan-200/20 bg-cyan-200/10 text-cyan-50")}>
                  {syncMessage}
                </p>
              )}
              {linkedShots.length > 0 && (
                <div className="mt-3 space-y-2">
                  {linkedShots.map((shot) => (
                    <div key={shot.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/25 px-3 py-2">
                      <div>
                        <p className="text-xs font-bold text-white">{shot.title}</p>
                        <p className="text-[10px] uppercase tracking-[0.12em] text-cyan-100/60">{shot.status}</p>
                      </div>
                      <button
                        onClick={() => generateLinkedShot(shot.id)}
                        disabled={generatingShotId === shot.id || shot.status === "processing"}
                        className="rounded-lg bg-white px-3 py-2 text-[11px] font-black text-slate-950 disabled:opacity-50"
                      >
                        {generatingShotId === shot.id ? "Starting..." : shot.status === "processing" ? "Processing" : "Generate"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
                  <span>Cast: {characters.map((item) => `${item.name} / ${item.role}`).join(" | ")}</span>
                </div>
              </div>

              <div className="mt-3 grid gap-3 xl:grid-cols-[1.05fr_0.95fr]">
                <section className="rounded-lg border border-white/15 bg-slate-950/70 p-3">
                  <div className="mb-2 flex items-center gap-2 border-b border-white/10 pb-2">
                    <ScanFace className="h-4 w-4 text-cyan-200" />
                    <h3 className="text-xs font-black uppercase tracking-[0.16em] text-white">A) Cast / Character Reference</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
                    {characters.map((character) => (
                      <div key={character.id} className="overflow-hidden rounded-lg border border-white/10 bg-black/35">
                        <div className="relative aspect-[4/3]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={character.image} alt={character.name} className="h-full w-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                          <div className="absolute left-2 top-2 rounded bg-black/70 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100">
                            {character.role}
                          </div>
                          <div className="absolute bottom-2 left-2 right-2">
                            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-white">{character.name}</p>
                            <p className="mt-0.5 line-clamp-2 text-[9px] leading-4 text-slate-300">{character.description}</p>
                          </div>
                        </div>
                        <div className="space-y-1 p-2 text-[9px] leading-4 text-slate-400">
                          <p><span className="font-black uppercase text-slate-300">Wardrobe:</span> {character.wardrobe}</p>
                          <p><span className="font-black uppercase text-slate-300">Emotion:</span> {character.emotion}</p>
                        </div>
                      </div>
                    ))}
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
