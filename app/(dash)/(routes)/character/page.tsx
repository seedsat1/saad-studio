"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  BadgeCheck,
  Brain,
  Camera,
  CheckCircle2,
  Copy,
  Eye,
  Fingerprint,
  Layers3,
  Loader2,
  Move3D,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  UploadCloud,
  UserRound,
  Wand2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageLayout } from "@/lib/use-page-layout";

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

type CharacterMetadata = {
  characterPackage?: CharacterPackage;
  imageCount?: number;
  source?: string;
};

type CharacterRecord = {
  id: string;
  name: string;
  description: string;
  referenceUrls: string[];
  coverUrl: string | null;
  status: string;
  provider: string;
  providerCharacterId?: string | null;
  metadata?: CharacterMetadata;
  createdAt: string;
  updatedAt: string;
};

type LocalRefImage = {
  id: string;
  file: File;
  dataUrl: string;
};

const STATE_LABELS: Record<CharacterStateKey, string> = {
  neutral: "Neutral",
  hero: "Hero",
  motion: "Motion",
  editorial: "Editorial",
  emotional: "Emotional",
};

const DEFAULT_STATES: Record<CharacterStateKey, string> = {
  neutral: "Clean identity reference, relaxed face, readable front angle, no dramatic styling changes.",
  hero: "Premium hero look, confident posture, strong face readability, beauty lighting.",
  motion: "Stable body proportions, natural walk cycle, controlled hair/fabric movement, face consistency preserved.",
  editorial: "Fashion campaign posture, polished styling, premium composition, expressive but identity-safe.",
  emotional: "Close-up acting state, eyes and facial features preserved, subtle expression changes only.",
};

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
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function buildCharacterPackage(input: {
  name: string;
  description: string;
  refsCount: number;
  faceNotes: string;
  bodyNotes: string;
  outfitNotes: string;
  styleNotes: string;
  poseNotes: string;
  motionNotes: string;
  cinematicTags: string;
}): CharacterPackage {
  const name = input.name.trim() || "Character";
  const description = input.description.trim();
  const tags = splitTags(input.cinematicTags || "Luxury Fashion, Elegant, 85mm, Warm Sunset, Premium Editorial");
  return {
    mainIdentity: `${name}${description ? ` - ${description}` : ""}`,
    faceMemory: input.faceNotes.trim() || "Preserve face structure, eye shape, nose, lips, skin tone, hairline, and recognizable identity across every output.",
    bodyProfile: input.bodyNotes.trim() || "Preserve body proportions, posture, silhouette, height impression, shoulder/waist balance, and natural anatomy.",
    outfitMemory: input.outfitNotes.trim() || "Preserve primary wardrobe colors, fabric behavior, accessories, jewelry, and signature styling details unless a state explicitly changes them.",
    styleDna: input.styleNotes.trim() || tags.join(", "),
    poseReferences: input.poseNotes.trim() || "Use uploaded references as front, three-quarter, side, close-up, and full-body pose anchors.",
    motionReferences: input.motionNotes.trim() || "Use stable face, stable body proportions, natural motion, no face drift, no outfit melting, no anatomy collapse.",
    consistencyProfile: `Character package built from ${input.refsCount} reference image${input.refsCount === 1 ? "" : "s"}. Treat this as a persistent production identity, not a temporary node input.`,
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
    `Pose References: ${pkg.poseReferences}`,
    `Motion References: ${pkg.motionReferences}`,
    `Consistency Profile: ${pkg.consistencyProfile}`,
    `Cinematic Metadata: ${pkg.cinematicMetadata.join(", ")}`,
    `States: ${Object.entries(pkg.states).map(([key, value]) => `${key}: ${value}`).join(" | ")}`,
    `Reference images: ${character.referenceUrls.join(", ")}`,
  ].join("\n");
}

function PackageRow({ icon: Icon, label, value }: { icon: typeof Brain; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-3">
      <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
        <Icon className="h-3.5 w-3.5 text-cyan-300" />
        {label}
      </div>
      <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-300">{value}</p>
    </div>
  );
}

export default function CharacterPage() {
  const { hero } = usePageLayout("character");
  const heroMedia = hero?.media;
  const [characters, setCharacters] = useState<CharacterRecord[]>([]);
  const [refs, setRefs] = useState<LocalRefImage[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [faceNotes, setFaceNotes] = useState("");
  const [bodyNotes, setBodyNotes] = useState("");
  const [outfitNotes, setOutfitNotes] = useState("");
  const [styleNotes, setStyleNotes] = useState("");
  const [poseNotes, setPoseNotes] = useState("");
  const [motionNotes, setMotionNotes] = useState("");
  const [cinematicTags, setCinematicTags] = useState("Luxury Fashion, Elegant, 85mm, Warm Sunset, Premium Editorial");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [variationPrompt, setVariationPrompt] = useState("Create a polished campaign-ready portrait using the saved Hero state, cinematic studio lighting, and strict identity consistency.");
  const [generatingCharacterId, setGeneratingCharacterId] = useState<string | null>(null);
  const [generatedUrls, setGeneratedUrls] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const packagePreview = useMemo(() => buildCharacterPackage({
    name,
    description,
    refsCount: refs.length,
    faceNotes,
    bodyNotes,
    outfitNotes,
    styleNotes,
    poseNotes,
    motionNotes,
    cinematicTags,
  }), [bodyNotes, cinematicTags, description, faceNotes, motionNotes, name, outfitNotes, poseNotes, refs.length, styleNotes]);

  const canCreate = useMemo(() => name.trim().length > 0 && refs.length > 0 && !saving, [name, refs.length, saving]);

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
        poseNotes,
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
      setPoseNotes("");
      setMotionNotes("");
      setCinematicTags("Luxury Fashion, Elegant, 85mm, Warm Sunset, Premium Editorial");
      setRefs([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create character");
    } finally {
      setSaving(false);
    }
  }, [bodyNotes, canCreate, cinematicTags, description, faceNotes, motionNotes, name, outfitNotes, poseNotes, refs, styleNotes]);

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

  const heroBadge = hero?.badge || "Character Identity System";
  const heroTitle = hero?.title || "Persistent AI Identity, not just a photo";
  const heroSubtitle = hero?.subtitle || "Build a reusable Character Package with face memory, body profile, outfit memory, style DNA, motion rules, and production states.";

  return (
    <div className="min-h-screen bg-[#050914] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0">
          {heroMedia?.type === "video" && heroMedia.url ? (
            <video src={heroMedia.url} poster={heroMedia.poster} autoPlay muted loop playsInline preload="none" className="absolute inset-0 h-full w-full object-cover" />
          ) : heroMedia?.type === "image" && heroMedia.url ? (
            <Image src={heroMedia.url} alt="" fill priority sizes="100vw" className="object-cover" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-b from-[#050914]/20 via-[#050914]/78 to-[#050914]" />
          <div className="absolute inset-0 opacity-70 [background:radial-gradient(950px_circle_at_20%_15%,rgba(34,211,238,.22),transparent_55%),radial-gradient(850px_circle_at_74%_18%,rgba(217,70,239,.18),transparent_55%),radial-gradient(900px_circle_at_55%_85%,rgba(34,197,94,.08),transparent_55%)]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-10 md:px-6">
          <div className="grid gap-7 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <span className="inline-flex items-center rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100">
                {heroBadge}
              </span>
              <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight md:text-5xl">
                {heroTitle}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                {heroSubtitle}
              </p>

              <div className="mt-6 grid max-w-3xl gap-2 sm:grid-cols-3">
                {[
                  ["Global Entity", "Lives outside graphs"],
                  ["Character Package", "Identity + style memory"],
                  ["Auto Context", "Consumed by Image, Video, Canvas"],
                ].map(([title, subtitle]) => (
                  <div key={title} className="rounded-2xl border border-white/10 bg-black/25 p-3">
                    <div className="text-xs font-bold text-white">{title}</div>
                    <div className="mt-1 text-[11px] text-slate-500">{subtitle}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-200">
                  <Fingerprint className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Character Package Structure</div>
                  <div className="text-xs text-slate-400">Identity, face, body, outfit, style, motion, states.</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                {["Identity", "Face Memory", "Outfit Memory", "Style DNA", "Pose Refs", "Motion Refs", "States", "Consistency"].map((item) => (
                  <div key={item} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-slate-300">{item}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:px-6 xl:grid-cols-[460px_minmax(0,1fr)]">
        <section id="create" className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-200">
              <UserRound className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Build Character Package</h2>
              <p className="text-xs text-slate-500">Upload once. The production tools consume the identity later.</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Character name" className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm outline-none transition focus:border-cyan-300" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Main identity: age range, presence, personality, role..." rows={3} className="w-full resize-none rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm outline-none transition focus:border-cyan-300" />

            <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-slate-950/50 p-4 text-center transition hover:border-cyan-300/70">
              <UploadCloud className="mb-2 h-7 w-7 text-cyan-200" />
              <span className="text-sm font-semibold">Upload Character References</span>
              <span className="mt-1 text-xs text-slate-500">Front, 3/4, side, close-up, full body. Up to 24 images.</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={onPickImages} />
            </label>

            {refs.length > 0 ? (
              <div className="grid grid-cols-5 gap-2">
                {refs.map((ref) => (
                  <div key={ref.id} className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-black">
                    <img src={ref.dataUrl} alt="" className="h-full w-full object-cover" />
                    <button onClick={() => setRefs((prev) => prev.filter((item) => item.id !== ref.id))} className="absolute right-1 top-1 hidden rounded-full bg-black/70 p-1 text-white group-hover:block">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="grid gap-3">
              <textarea value={faceNotes} onChange={(e) => setFaceNotes(e.target.value)} placeholder="Face Memory: face shape, eyes, nose, lips, hair, skin tone..." rows={2} className="w-full resize-none rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm outline-none focus:border-cyan-300" />
              <textarea value={bodyNotes} onChange={(e) => setBodyNotes(e.target.value)} placeholder="Body Profile: proportions, posture, height impression, silhouette..." rows={2} className="w-full resize-none rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm outline-none focus:border-cyan-300" />
              <textarea value={outfitNotes} onChange={(e) => setOutfitNotes(e.target.value)} placeholder="Outfit Memory: wardrobe, colors, fabric, accessories..." rows={2} className="w-full resize-none rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm outline-none focus:border-cyan-300" />
              <textarea value={styleNotes} onChange={(e) => setStyleNotes(e.target.value)} placeholder="Style DNA: cinematic identity, mood, brand feel..." rows={2} className="w-full resize-none rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm outline-none focus:border-cyan-300" />
              <textarea value={poseNotes} onChange={(e) => setPoseNotes(e.target.value)} placeholder="Pose References: best angles, hero poses, beauty poses..." rows={2} className="w-full resize-none rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm outline-none focus:border-cyan-300" />
              <textarea value={motionNotes} onChange={(e) => setMotionNotes(e.target.value)} placeholder="Motion References: movement style, animation constraints..." rows={2} className="w-full resize-none rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm outline-none focus:border-cyan-300" />
              <input value={cinematicTags} onChange={(e) => setCinematicTags(e.target.value)} placeholder="Cinematic metadata, comma separated" className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm outline-none focus:border-cyan-300" />
            </div>

            <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.04] p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-cyan-100">
                <Brain className="h-3.5 w-3.5" />
                Live Package Preview
              </div>
              <div className="grid gap-2">
                <PackageRow icon={Fingerprint} label="Face Memory" value={packagePreview.faceMemory} />
                <PackageRow icon={Layers3} label="Outfit Memory" value={packagePreview.outfitMemory} />
                <PackageRow icon={Move3D} label="Motion Rules" value={packagePreview.motionReferences} />
              </div>
            </div>

            {error ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">{error}</div> : null}

            <button onClick={createCharacter} disabled={!canCreate} className={cn("flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition", canCreate ? "bg-cyan-500 text-slate-950 hover:bg-cyan-300" : "cursor-not-allowed bg-white/10 text-slate-500")}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Save Smart Character Entity
            </button>
          </div>
        </section>

        <section id="library" className="min-h-[560px] rounded-3xl border border-white/10 bg-white/[0.025] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Global Character Entities</h2>
              <p className="text-xs text-slate-500">These live outside node graphs and can be consumed by Image, Video, and AI Canvas.</p>
            </div>
            <button onClick={() => void loadCharacters()} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/50 p-3">
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Character State Generation Prompt</label>
            <textarea value={variationPrompt} onChange={(e) => setVariationPrompt(e.target.value)} rows={3} className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-300" placeholder="Describe the state, outfit, lighting, pose, or scene..." />
            <p className="mt-2 text-xs text-slate-500">Generation uses the saved package context plus the selected character reference.</p>
          </div>

          {loading ? (
            <div className="flex h-72 items-center justify-center text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading characters</div>
          ) : characters.length === 0 ? (
            <div className="flex h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 text-center">
              <Camera className="mb-3 h-8 w-8 text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">No Character Entities yet</p>
              <p className="mt-1 max-w-sm text-xs text-slate-500">Create one from references, then reuse it as a persistent production identity.</p>
            </div>
          ) : (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {characters.map((character) => {
                const pkg = character.metadata?.characterPackage;
                return (
                  <article key={character.id} className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60">
                    <div className="grid sm:grid-cols-[180px_minmax(0,1fr)]">
                      <div className="relative min-h-56 bg-slate-900">
                        {character.coverUrl ? <img src={character.coverUrl} alt={character.name} className="h-full min-h-56 w-full object-cover" /> : <div className="flex h-full items-center justify-center text-slate-600"><UserRound className="h-10 w-10" /></div>}
                        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold text-emerald-200">
                          <CheckCircle2 className="h-3 w-3" /> {character.status}
                        </div>
                      </div>
                      <div className="space-y-3 p-3">
                        <div>
                          <h3 className="line-clamp-1 text-sm font-semibold">{character.name}</h3>
                          <p className="mt-1 line-clamp-2 min-h-8 text-xs text-slate-500">{pkg?.mainIdentity || character.description || "Persistent AI identity package."}</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(pkg?.cinematicMetadata?.length ? pkg.cinematicMetadata : ["Reference", "Identity"]).slice(0, 5).map((tag) => (
                            <span key={tag} className="rounded-full border border-cyan-300/15 bg-cyan-300/10 px-2 py-1 text-[10px] font-semibold text-cyan-100">{tag}</span>
                          ))}
                        </div>
                        <div className="grid gap-2">
                          <PackageRow icon={Eye} label="Face Memory" value={pkg?.faceMemory || "Reference image set only. Add package metadata by recreating this entity."} />
                          <PackageRow icon={BadgeCheck} label="Consistency" value={pkg?.consistencyProfile || `${character.referenceUrls.length} reference image(s).`} />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => void copyReference(character)} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/10 px-2 py-2 text-xs text-slate-200 hover:bg-white/5">
                            {copiedId === character.id ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                            {copiedId === character.id ? "Copied" : "Copy Package"}
                          </button>
                          <a href={`/image?characterId=${encodeURIComponent(character.id)}`} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-cyan-500 px-2 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-300">
                            <Wand2 className="h-3.5 w-3.5" /> Use
                          </a>
                          <button onClick={() => void generateVariation(character)} disabled={generatingCharacterId === character.id} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-2 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/15 disabled:opacity-60">
                            {generatingCharacterId === character.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                            Generate
                          </button>
                          <button onClick={() => void deleteCharacter(character.id)} className="rounded-lg border border-red-500/20 px-2 py-2 text-red-300 hover:bg-red-500/10">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                    {pkg ? (
                      <div className="grid gap-2 border-t border-white/10 p-3 md:grid-cols-3">
                        {Object.entries(pkg.states).map(([key, value]) => (
                          <div key={key} className="rounded-xl border border-white/10 bg-black/25 p-2">
                            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{STATE_LABELS[key as CharacterStateKey]}</div>
                            <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-300">{value}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {generatedUrls[character.id]?.length ? (
                      <div className="grid grid-cols-6 gap-2 border-t border-white/10 p-3">
                        {generatedUrls[character.id].slice(0, 6).map((url) => (
                          <button key={url} onClick={() => window.open(url, "_blank", "noopener,noreferrer")} className="aspect-square overflow-hidden rounded-lg border border-white/10 bg-black">
                            <img src={url} alt="Generated character variation" className="h-full w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
