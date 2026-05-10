"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  Fingerprint,
  ImagePlus,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  Wand2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type CharacterStateKey = "neutral" | "hero" | "motion" | "editorial" | "emotional";

type CharacterPackage = {
  mainIdentity: string;
  faceMemory: string;
  bodyProfile: string;
  outfitMemory: string;
  styleDna: string;
  poseReferences: string;
  motionReferences: string;
  consistencyProfile: string;
  cinematicMetadata: string[];
  states: Record<CharacterStateKey, string>;
};

type CharacterRecord = {
  id: string;
  name: string;
  description: string;
  referenceUrls: string[];
  coverUrl: string | null;
  status: string;
  provider: string;
  metadata?: {
    characterPackage?: CharacterPackage;
    imageCount?: number;
  };
  createdAt: string;
  updatedAt: string;
};

type LocalRefImage = {
  id: string;
  file: File;
  dataUrl: string;
};

const DEFAULT_STATES: Record<CharacterStateKey, string> = {
  neutral: "Clean identity reference, relaxed face, readable front angle, no dramatic styling changes.",
  hero: "Premium hero look, confident posture, strong face readability, beauty lighting.",
  motion: "Stable body proportions, natural walk cycle, controlled hair/fabric movement, face consistency preserved.",
  editorial: "Fashion campaign posture, polished styling, premium composition, expressive but identity-safe.",
  emotional: "Close-up acting state, eyes and facial features preserved, subtle expression changes only.",
};

const GOOD_RULES = [
  "Same person only",
  "Clear face and eyes",
  "Multiple angles",
  "Close-up and full body",
];

const AVOID_RULES = [
  "Group photos",
  "Heavy filters",
  "Face coverings",
  "Duplicates",
];

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function splitTags(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 12);
}

function buildCharacterPackage(input: {
  name: string;
  description: string;
  refsCount: number;
  faceNotes: string;
  bodyNotes: string;
  outfitNotes: string;
  styleNotes: string;
  motionNotes: string;
  cinematicTags: string;
}): CharacterPackage {
  const name = input.name.trim() || "Untitled Character";
  const tags = splitTags(input.cinematicTags || "Editorial, 85mm, Soft cinematic light, Premium identity");
  return {
    mainIdentity: `${name}${input.description.trim() ? ` - ${input.description.trim()}` : ""}`,
    faceMemory: input.faceNotes.trim() || "Preserve face shape, eye spacing, eye color impression, nose, lips, hairline, skin tone, and recognizable identity.",
    bodyProfile: input.bodyNotes.trim() || "Preserve body proportions, posture, silhouette, height impression, and natural anatomy.",
    outfitMemory: input.outfitNotes.trim() || "Preserve primary wardrobe colors, fabric behavior, accessories, and signature styling details unless a state changes them.",
    styleDna: input.styleNotes.trim() || tags.join(", "),
    poseReferences: "Use uploaded references as close-up, three-quarter, side, profile, expression, and full-body pose anchors.",
    motionReferences: input.motionNotes.trim() || "Stable face, stable proportions, natural movement, no face drift, no outfit melting, no anatomy collapse.",
    consistencyProfile: `Persistent production identity built from ${input.refsCount} reference image${input.refsCount === 1 ? "" : "s"}. The graph consumes this entity; the user should not wire it manually.`,
    cinematicMetadata: tags,
    states: DEFAULT_STATES,
  };
}

function packageToPrompt(character: CharacterRecord) {
  const pkg = character.metadata?.characterPackage;
  if (!pkg) {
    return [
      `Character: ${character.name}`,
      character.description ? `Description: ${character.description}` : "",
      `Reference images: ${character.referenceUrls.join(", ")}`,
    ].filter(Boolean).join("\n");
  }
  return [
    `Character Package: ${character.name}`,
    `Main Identity: ${pkg.mainIdentity}`,
    `Face Memory: ${pkg.faceMemory}`,
    `Body Profile: ${pkg.bodyProfile}`,
    `Outfit Memory: ${pkg.outfitMemory}`,
    `Style DNA: ${pkg.styleDna}`,
    `Motion References: ${pkg.motionReferences}`,
    `Consistency Profile: ${pkg.consistencyProfile}`,
    `States: ${Object.entries(pkg.states).map(([key, value]) => `${key}: ${value}`).join(" | ")}`,
    `Reference images: ${character.referenceUrls.join(", ")}`,
  ].join("\n");
}

function RuleGroup({ type, items }: { type: "good" | "avoid"; items: string[] }) {
  const good = type === "good";
  return (
    <div className="rounded-2xl border border-white/10 bg-[#15171b] p-4">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-full", good ? "bg-emerald-500 text-black" : "bg-red-500 text-black")}>
          {good ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
        </div>
        <div>
          <div className="text-sm font-bold text-white">{good ? "Recommended references" : "Avoid these"}</div>
          <div className="text-xs text-zinc-500">{good ? "Higher consistency quality" : "These weaken identity memory"}</div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {items.map((item, index) => (
          <div key={item} className={cn("rounded-xl border p-3 text-xs font-semibold", good ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-100" : "border-red-400/20 bg-red-400/5 text-red-100")}>
            <div className={cn("mb-2 aspect-[4/3] rounded-lg border", good ? "border-emerald-300/20 bg-gradient-to-br from-zinc-700 to-zinc-900" : "border-red-300/25 bg-gradient-to-br from-zinc-800 to-black")} />
            {index + 1}. {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function MemoryBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">{label}</div>
      <p className="mt-2 line-clamp-3 text-xs leading-5 text-zinc-300">{value}</p>
    </div>
  );
}

export default function CharacterPage() {
  const [characters, setCharacters] = useState<CharacterRecord[]>([]);
  const [refs, setRefs] = useState<LocalRefImage[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [faceNotes, setFaceNotes] = useState("");
  const [bodyNotes, setBodyNotes] = useState("");
  const [outfitNotes, setOutfitNotes] = useState("");
  const [styleNotes, setStyleNotes] = useState("");
  const [motionNotes, setMotionNotes] = useState("");
  const [cinematicTags, setCinematicTags] = useState("Editorial, 85mm, Soft cinematic light, Premium identity");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [variationPrompt, setVariationPrompt] = useState("Create a campaign-ready portrait using the saved Hero state and strict identity consistency.");
  const [generatingCharacterId, setGeneratingCharacterId] = useState<string | null>(null);
  const [generatedUrls, setGeneratedUrls] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const canCreate = useMemo(() => name.trim().length > 0 && refs.length > 0 && !saving, [name, refs.length, saving]);
  const packagePreview = useMemo(() => buildCharacterPackage({
    name,
    description,
    refsCount: refs.length,
    faceNotes,
    bodyNotes,
    outfitNotes,
    styleNotes,
    motionNotes,
    cinematicTags,
  }), [bodyNotes, cinematicTags, description, faceNotes, motionNotes, name, outfitNotes, refs.length, styleNotes]);

  const loadCharacters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/characters", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(data?.characters)) throw new Error(data?.error || "Failed to load characters");
      setCharacters(data.characters);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load characters");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCharacters();
  }, [loadCharacters]);

  const onPickImages = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/")).slice(0, 24 - refs.length);
    event.target.value = "";
    if (!files.length) return;
    const mapped = await Promise.all(files.map(async (file) => ({ id: uid("ref"), file, dataUrl: await fileToDataUrl(file) })));
    setRefs((prev) => [...prev, ...mapped].slice(0, 24));
  }, [refs.length]);

  const createCharacter = useCallback(async () => {
    if (!canCreate) return;
    setSaving(true);
    setError(null);
    try {
      const characterPackage = buildCharacterPackage({
        name,
        description,
        refsCount: refs.length,
        faceNotes,
        bodyNotes,
        outfitNotes,
        styleNotes,
        motionNotes,
        cinematicTags,
      });
      const res = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          images: refs.map((ref) => ({ name: ref.file.name, dataUrl: ref.dataUrl })),
          metadata: {
            characterPackage,
            productionEntity: "global-character-identity",
            smartAssetKind: "character",
          },
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.character) throw new Error(data?.error || "Failed to create character");
      setCharacters((prev) => [data.character, ...prev]);
      setName("");
      setDescription("");
      setFaceNotes("");
      setBodyNotes("");
      setOutfitNotes("");
      setStyleNotes("");
      setMotionNotes("");
      setCinematicTags("Editorial, 85mm, Soft cinematic light, Premium identity");
      setRefs([]);
      setShowAdvanced(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create character");
    } finally {
      setSaving(false);
    }
  }, [bodyNotes, canCreate, cinematicTags, description, faceNotes, motionNotes, name, outfitNotes, refs, styleNotes]);

  const deleteCharacter = useCallback(async (id: string) => {
    setCharacters((prev) => prev.filter((character) => character.id !== id));
    await fetch(`/api/characters/${id}`, { method: "DELETE" }).catch(() => null);
  }, []);

  const generateVariation = useCallback(async (character: CharacterRecord) => {
    setGeneratingCharacterId(character.id);
    setError(null);
    try {
      const pkg = character.metadata?.characterPackage;
      const res = await fetch(`/api/characters/${character.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: [
            pkg ? `Use Character Package. Face Memory: ${pkg.faceMemory}. Outfit Memory: ${pkg.outfitMemory}. Style DNA: ${pkg.styleDna}. State: ${pkg.states.hero}` : "",
            variationPrompt,
          ].filter(Boolean).join("\n\n"),
          size: "1024*1024",
        }),
      });
      const data = await res.json().catch(() => null);
      const urls = Array.isArray(data?.imageUrls)
        ? data.imageUrls.filter((url: unknown): url is string => typeof url === "string" && url.length > 0)
        : data?.imageUrl
          ? [String(data.imageUrl)]
          : [];
      if (!res.ok || !urls.length) throw new Error(data?.error || "Instant character did not return an image.");
      setGeneratedUrls((prev) => ({ ...prev, [character.id]: [...urls, ...(prev[character.id] ?? [])] }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Instant character generation failed");
    } finally {
      setGeneratingCharacterId(null);
    }
  }, [variationPrompt]);

  const copyReference = useCallback(async (character: CharacterRecord) => {
    await navigator.clipboard.writeText(packageToPrompt(character)).catch(() => null);
    setCopiedId(character.id);
    setTimeout(() => setCopiedId(null), 1400);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-7 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-zinc-500">Characters / <span className="text-zinc-200">New</span></div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Create Character Identity</h1>
          </div>
          <button onClick={() => void loadCharacters()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-900">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        <section className="rounded-[22px] border border-white/10 bg-[#111214] p-2 shadow-2xl shadow-black">
          <label className="group flex min-h-[290px] cursor-pointer flex-col items-center justify-center rounded-[18px] border border-dashed border-white/10 bg-gradient-to-b from-[#232426] to-[#17181a] text-center transition hover:border-lime-300/60">
            {refs.length === 0 ? (
              <>
                <span className="inline-flex items-center gap-2 rounded-xl bg-lime-300 px-5 py-3 text-sm font-black text-black transition group-hover:bg-lime-200">
                  Upload <Upload className="h-4 w-4" />
                </span>
                <span className="mt-5 text-sm font-semibold text-zinc-400">Upload 10-24 photos for best results</span>
                <span className="mt-2 max-w-md text-xs leading-5 text-zinc-600">One person, clear face, multiple angles. The system builds a persistent Character Package from these images.</span>
              </>
            ) : (
              <div className="w-full p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-left">
                    <div className="text-sm font-bold">{refs.length} reference image{refs.length === 1 ? "" : "s"} selected</div>
                    <div className="text-xs text-zinc-500">Add more angles or continue below.</div>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-xl bg-lime-300 px-4 py-2 text-xs font-black text-black">
                    Add more <ImagePlus className="h-4 w-4" />
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 md:grid-cols-8">
                  {refs.slice(0, 24).map((ref) => (
                    <div key={ref.id} className="group/thumb relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-black">
                      <img src={ref.dataUrl} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          setRefs((prev) => prev.filter((item) => item.id !== ref.id));
                        }}
                        className="absolute right-1 top-1 hidden rounded-full bg-black/75 p-1 text-white group-hover/thumb:block"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <input type="file" accept="image/*" multiple className="hidden" onChange={onPickImages} />
          </label>

          <div className="grid gap-4 p-4 lg:grid-cols-2">
            <RuleGroup type="good" items={GOOD_RULES} />
            <RuleGroup type="avoid" items={AVOID_RULES} />
          </div>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[420px_minmax(0,1fr)]">
          <div className="rounded-[22px] border border-white/10 bg-[#111214] p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-300 text-black">
                <Fingerprint className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold">Identity setup</div>
                <div className="text-xs text-zinc-500">Only name is required. Advanced memory is optional.</div>
              </div>
            </div>

            <div className="space-y-3">
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Character name" className="h-11 w-full rounded-xl border border-white/10 bg-black px-3 text-sm outline-none focus:border-lime-300/60" />
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Short identity note, role, personality..." rows={3} className="w-full resize-none rounded-xl border border-white/10 bg-black px-3 py-2 text-sm outline-none focus:border-lime-300/60" />

              <button onClick={() => setShowAdvanced((value) => !value)} className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-zinc-950 px-3 py-3 text-left text-xs font-semibold text-zinc-300 hover:bg-zinc-900">
                Advanced Character Package
                <span className="text-zinc-500">{showAdvanced ? "Hide" : "Open"}</span>
              </button>

              {showAdvanced ? (
                <div className="space-y-2">
                  <textarea value={faceNotes} onChange={(event) => setFaceNotes(event.target.value)} placeholder="Face Memory: face shape, eyes, nose, lips, hair, skin tone..." rows={2} className="w-full resize-none rounded-xl border border-white/10 bg-black px-3 py-2 text-sm outline-none focus:border-lime-300/60" />
                  <textarea value={bodyNotes} onChange={(event) => setBodyNotes(event.target.value)} placeholder="Body Profile: proportions, posture, height impression..." rows={2} className="w-full resize-none rounded-xl border border-white/10 bg-black px-3 py-2 text-sm outline-none focus:border-lime-300/60" />
                  <textarea value={outfitNotes} onChange={(event) => setOutfitNotes(event.target.value)} placeholder="Outfit Memory: wardrobe, colors, fabric, accessories..." rows={2} className="w-full resize-none rounded-xl border border-white/10 bg-black px-3 py-2 text-sm outline-none focus:border-lime-300/60" />
                  <textarea value={styleNotes} onChange={(event) => setStyleNotes(event.target.value)} placeholder="Style DNA: mood, commercial identity, lighting language..." rows={2} className="w-full resize-none rounded-xl border border-white/10 bg-black px-3 py-2 text-sm outline-none focus:border-lime-300/60" />
                  <textarea value={motionNotes} onChange={(event) => setMotionNotes(event.target.value)} placeholder="Motion rules: walk style, face stability, animation limits..." rows={2} className="w-full resize-none rounded-xl border border-white/10 bg-black px-3 py-2 text-sm outline-none focus:border-lime-300/60" />
                  <input value={cinematicTags} onChange={(event) => setCinematicTags(event.target.value)} placeholder="Cinematic tags, comma separated" className="h-11 w-full rounded-xl border border-white/10 bg-black px-3 text-sm outline-none focus:border-lime-300/60" />
                </div>
              ) : null}

              <div className="rounded-2xl border border-white/10 bg-black p-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                  <BadgeCheck className="h-3.5 w-3.5 text-lime-300" />
                  Package Preview
                </div>
                <div className="grid gap-2">
                  <MemoryBlock label="Face Memory" value={packagePreview.faceMemory} />
                  <MemoryBlock label="Outfit Memory" value={packagePreview.outfitMemory} />
                  <MemoryBlock label="Motion Rules" value={packagePreview.motionReferences} />
                </div>
              </div>

              {error ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                  {error}
                </div>
              ) : null}

              <button
                onClick={createCharacter}
                disabled={!canCreate}
                className={cn(
                  "flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-black transition",
                  canCreate ? "bg-lime-300 text-black hover:bg-lime-200" : "cursor-not-allowed bg-white/10 text-zinc-600",
                )}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create Character Entity
              </button>
            </div>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-[#111214] p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Character library</h2>
                <p className="text-xs text-zinc-500">Reusable identities for Image, Video, and AI Canvas.</p>
              </div>
            </div>

            <div className="mb-4 rounded-2xl border border-white/10 bg-black p-3">
              <label className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-500">Test generation prompt</label>
              <textarea value={variationPrompt} onChange={(event) => setVariationPrompt(event.target.value)} rows={3} className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-[#08090b] px-3 py-2 text-sm outline-none focus:border-lime-300/60" />
            </div>

            {loading ? (
              <div className="flex h-72 items-center justify-center text-zinc-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading characters
              </div>
            ) : characters.length === 0 ? (
              <div className="flex h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 text-center">
                <Camera className="mb-3 h-8 w-8 text-zinc-700" />
                <p className="text-sm font-semibold text-zinc-300">No characters yet</p>
                <p className="mt-1 max-w-sm text-xs text-zinc-500">Upload references, create a package, then reuse it across production tools.</p>
              </div>
            ) : (
              <div className="grid gap-3 xl:grid-cols-2">
                {characters.map((character) => {
                  const pkg = character.metadata?.characterPackage;
                  return (
                    <article key={character.id} className="overflow-hidden rounded-2xl border border-white/10 bg-black">
                      <div className="relative aspect-[4/3] bg-zinc-950">
                        {character.coverUrl ? (
                          <img src={character.coverUrl} alt={character.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-zinc-700"><UserRound className="h-10 w-10" /></div>
                        )}
                        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-lime-300 px-2 py-1 text-[10px] font-black text-black">
                          <CheckCircle2 className="h-3 w-3" /> {character.status}
                        </div>
                      </div>
                      <div className="space-y-3 p-3">
                        <div>
                          <h3 className="line-clamp-1 text-sm font-semibold">{character.name}</h3>
                          <p className="mt-1 line-clamp-2 min-h-8 text-xs text-zinc-500">{pkg?.mainIdentity || character.description || "Persistent character identity."}</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(pkg?.cinematicMetadata?.length ? pkg.cinematicMetadata : ["Identity", "Reference"]).slice(0, 5).map((tag) => (
                            <span key={tag} className="rounded-full border border-white/10 bg-zinc-900 px-2 py-1 text-[10px] font-semibold text-zinc-300">{tag}</span>
                          ))}
                        </div>
                        {pkg ? <MemoryBlock label="Face Memory" value={pkg.faceMemory} /> : null}
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => void copyReference(character)} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/10 px-2 py-2 text-xs text-zinc-200 hover:bg-white/5">
                            {copiedId === character.id ? <CheckCircle2 className="h-3.5 w-3.5 text-lime-300" /> : <Copy className="h-3.5 w-3.5" />}
                            {copiedId === character.id ? "Copied" : "Copy"}
                          </button>
                          <a href={`/image?characterId=${encodeURIComponent(character.id)}`} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-lime-300 px-2 py-2 text-xs font-black text-black hover:bg-lime-200">
                            <Wand2 className="h-3.5 w-3.5" /> Use
                          </a>
                          <button onClick={() => void generateVariation(character)} disabled={generatingCharacterId === character.id} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-2 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/15 disabled:opacity-60">
                            {generatingCharacterId === character.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                            Test
                          </button>
                          <button onClick={() => void deleteCharacter(character.id)} className="rounded-lg border border-red-500/20 px-2 py-2 text-red-300 hover:bg-red-500/10">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {generatedUrls[character.id]?.length ? (
                          <div className="grid grid-cols-4 gap-2">
                            {generatedUrls[character.id].slice(0, 4).map((url) => (
                              <button key={url} onClick={() => window.open(url, "_blank", "noopener,noreferrer")} className="aspect-square overflow-hidden rounded-lg border border-white/10 bg-black">
                                <img src={url} alt="Generated character variation" className="h-full w-full object-cover" />
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-5 text-amber-100/80">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              The character entity lives outside the node graph. Image, Video, and AI Canvas read this package automatically.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
