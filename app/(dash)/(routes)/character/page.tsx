"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type CharacterModelId = "gemini-3-pro-image-preview";

const CHARACTER_MODELS: Array<{
  id: CharacterModelId;
  name: string;
  provider: string;
  badge: string;
  description: string;
}> = [
  {
    id: "gemini-3-pro-image-preview",
    name: "Gemini 3 Pro Image",
    provider: "Google",
    badge: "TOP",
    description: "Official Google image model for multi-reference character identity generation.",
  },
];

const CHARACTER_ASPECT_RATIOS = ["1:1", "4:3", "3:4", "16:9", "9:16"];
const CHARACTER_QUALITIES = ["1K", "2K", "4K"];
const CHARACTER_STYLES = ["Auto", "Realistic", "Cinematic", "Editorial", "Anime"];
const CHARACTER_SPEEDS = ["Quality", "Balanced", "Fast"];

const CHARACTER_GUIDE_STEPS = [
  {
    title: "Step 1: Upload Reference Photos",
    subtitle: "Upload 10-24 clear photos for one person only.",
    image: "/img/character-guide/upload_photos_illustration_1779831219486.png",
  },
  {
    title: "Step 2: Configure Identity Compiler",
    subtitle: "Fill optional identity memory fields for stable results.",
    image: "/img/character-guide/identity_compiler_illustration_1779831239877.png",
  },
  {
    title: "Step 3: Test Generation & Model Tuning",
    subtitle: "Test output variations and tune ratio, quality, and style.",
    image: "/img/character-guide/variation_testing_illustration_1779831260604.png",
  },
] as const;

const DEFAULT_STATES: Record<CharacterStateKey, string> = {
  neutral: "Clean identity reference, relaxed face, readable front angle, no dramatic styling changes.",
  hero: "Premium hero look, confident posture, strong face readability, beauty lighting.",
  motion: "Stable body proportions, natural walk cycle, controlled hair/fabric movement, face consistency preserved.",
  editorial: "Fashion campaign posture, polished styling, premium composition, expressive but identity-safe.",
  emotional: "Close-up acting state, eyes and facial features preserved, subtle expression changes only.",
};

const GOOD_RULES = [
  {
    title: "Same person only",
    titleAr: "شخص واحد فقط",
    desc: "All photos must be of the same subject.",
    descAr: "يجب أن تكون جميع الصور لنفس الشخص فقط.",
    image: "/img/rules/same_person_rule_1779834409055.png",
  },
  {
    title: "Clear face and eyes",
    titleAr: "وجه وعيون واضحة",
    desc: "Facial features and eyes must be clearly visible.",
    descAr: "يجب أن تكون ملامح الوجه والعينين واضحة تمامًا.",
    image: "/img/rules/clear_face_rule_1779834428922.png",
  },
  {
    title: "Multiple angles",
    titleAr: "زوايا متعددة",
    desc: "Include front, three-quarter, and profile views.",
    descAr: "تضمين زوايا مختلفة (أمامية، جانبية، وثلاثة أرباع).",
    image: "/img/rules/multiple_angles_rule_1779834446838.png",
  },
  {
    title: "Close-up and body",
    titleAr: "لقطات مقربة وكاملة",
    desc: "Mix close-up portraits with full-body shots.",
    descAr: "امزج بين الصور الشخصية المقربة ولقطات الجسم الكامل.",
    image: "/img/rules/body_shots_rule_1779834465500.png",
  },
];

const AVOID_RULES = [
  {
    title: "Group photos",
    titleAr: "الصور الجماعية",
    desc: "Avoid photos with multiple people in the frame.",
    descAr: "تجنب الصور التي تحتوي على أشخاص آخرين في الإطار.",
    image: "/img/rules/group_photos_avoid_1779834485633.png",
  },
  {
    title: "Heavy filters",
    titleAr: "الفلاتر القوية",
    desc: "Do not use heavy filters, makeup, or strong editing.",
    descAr: "تجنب الفلاتر القوية أو التعديلات الرقمية المبالغ فيها.",
    image: "/img/rules/heavy_filters_avoid_1779834506071.png",
  },
  {
    title: "Face coverings",
    titleAr: "تغطية الوجه",
    desc: "Avoid sunglasses, masks, hats, or hands covering the face.",
    descAr: "تجنب النظارات الشمسية، الأقنعة، القبعات، أو تغطية الوجه باليد.",
    image: "/img/rules/face_coverings_avoid_1779834523812.png",
  },
  {
    title: "Duplicates",
    titleAr: "الصور المتكررة",
    desc: "Do not upload identical or near-identical images.",
    descAr: "تجنب رفع صور متطابقة أو متشابهة للغاية.",
    image: "/img/rules/duplicates_avoid_1779834542531.png",
  },
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

async function uploadCharacterAsset(file: File): Promise<string> {
  const urlRes = await fetch("/api/studio/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type || "image/png",
      assetType: "image",
    }),
  });
  const urlData = await urlRes.json().catch(() => null);
  if (!urlRes.ok || !urlData?.signedUrl || !urlData?.publicUrl) {
    throw new Error(urlData?.error || "Failed to create upload URL.");
  }

  const uploadRes = await fetch(urlData.signedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "image/png" },
    body: file,
  });
  if (!uploadRes.ok) throw new Error(`Failed to upload ${file.name}`);
  return String(urlData.publicUrl);
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

function RuleGroup({ type, items }: { type: "good" | "avoid"; items: typeof GOOD_RULES }) {
  const good = type === "good";
  return (
    <div className="rounded-2xl border border-white/10 bg-[#15171b] p-5">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-full", good ? "bg-emerald-400 text-black" : "bg-red-500 text-black")}>
          {good ? <Check className="h-6 w-6" /> : <X className="h-6 w-6" />}
        </div>
        <div>
          <div className="text-base font-bold text-white">{good ? "Use photos like this" : "Do not upload these"}</div>
          <div className="text-sm text-zinc-500">{good ? "The system learns identity faster" : "These damage consistency"}</div>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map((item) => (
          <div key={item.title} className={cn("group overflow-hidden rounded-xl border bg-black/40 transition hover:border-zinc-500/30", good ? "border-emerald-500/10" : "border-red-500/10")}>
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-zinc-950">
              <img
                src={item.image}
                alt={item.title}
                className="h-full w-full object-cover transition duration-350 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white border border-white/5 backdrop-blur-sm">
                <span className={cn("flex h-3.5 w-3.5 items-center justify-center rounded-full text-black font-black", good ? "bg-emerald-400" : "bg-red-500")}>
                  {good ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
                </span>
                {item.title}
              </div>
            </div>
            <div className="p-3">
              <div className="text-xs font-black text-white">{item.titleAr}</div>
              <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">{item.descAr}</p>
            </div>
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
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  const [characters, setCharacters] = useState<CharacterRecord[]>([]);
  const [refs, setRefs] = useState<LocalRefImage[]>([]);

  const handleZoneClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("img") || target.closest("article") || target.closest("a")) {
      return;
    }
    fileInputRef.current?.click();
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files || []).filter((file) => file.type.startsWith("image/")).slice(0, 24 - refs.length);
    if (!files.length) return;
    const mapped = await Promise.all(files.map(async (file) => ({ id: uid("ref"), file, dataUrl: await fileToDataUrl(file) })));
    setRefs((prev) => [...prev, ...mapped].slice(0, 24));
  }, [refs.length]);
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
  const [selectedModelId, setSelectedModelId] = useState<CharacterModelId>("gemini-3-pro-image-preview");
  const [characterAspectRatio, setCharacterAspectRatio] = useState("1:1");
  const [characterQuality, setCharacterQuality] = useState("1K");
  const [characterStyle, setCharacterStyle] = useState("Auto");
  const [characterRenderingSpeed, setCharacterRenderingSpeed] = useState("Quality");
  const [generatingCharacterId, setGeneratingCharacterId] = useState<string | null>(null);
  const [generatedUrls, setGeneratedUrls] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const canCreate = useMemo(() => refs.length > 0 && !saving, [refs.length, saving]);
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
    window.setTimeout(() => {
      document.getElementById("identity-setup")?.scrollIntoView({ behavior: "smooth", block: "start" });
      nameInputRef.current?.focus();
    }, 120);
  }, [refs.length]);

  const createCharacter = useCallback(async () => {
    if (!canCreate) return;
    setSaving(true);
    setError(null);
    try {
      const finalName = name.trim() || `Character ${new Date().toLocaleDateString("en-CA")}`;
      
      // 1. Upload reference images directly to Cloudflare R2 from browser
      const referenceUrls = await Promise.all(
        refs.map((ref) => uploadCharacterAsset(ref.file))
      );

      const characterPackage = buildCharacterPackage({
        name: finalName,
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
          name: finalName,
          description: description.trim(),
          referenceUrls,
          images: [],
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
          modelId: selectedModelId,
          aspect_ratio: characterAspectRatio,
          quality: characterQuality,
          style: characterStyle,
          rendering_speed: characterRenderingSpeed,
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
  }, [characterAspectRatio, characterQuality, characterRenderingSpeed, characterStyle, selectedModelId, variationPrompt]);

  const copyReference = useCallback(async (character: CharacterRecord) => {
    await navigator.clipboard.writeText(packageToPrompt(character)).catch(() => null);
    setCopiedId(character.id);
    setTimeout(() => setCopiedId(null), 1400);
  }, []);

  return (
    <div className="h-[calc(100vh-4rem)] w-full overflow-hidden flex flex-col md:flex-row bg-[#060c18] text-white">
      {/* Left Column: Creator & Identity Settings (35% on XL) */}
      <div className="w-full md:w-[42%] lg:w-[36%] xl:w-[32%] h-full flex flex-col border-r border-white/10 bg-[#0a0f1d] shrink-0">
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          {/* Header Area */}
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">Characters / <span className="text-zinc-200">New Identity</span></div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white flex items-center gap-2">
              <Fingerprint className="h-7 w-7 text-lime-300" />
              Create Character Identity
            </h1>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              Upload reference photos of one subject to build a persistent, reusable identity.
            </p>
          </div>

          {/* Step 1: Upload Reference Photos */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-zinc-200">Step 1: Reference Photos</h3>
              {refs.length > 0 && (
                <span className="text-xs font-semibold text-lime-300 bg-lime-300/10 px-2.5 py-0.5 rounded-full border border-lime-300/20">
                  {refs.length} selected
                </span>
              )}
            </div>
            
            <div
              onClick={handleZoneClick}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={cn(
                "group flex min-h-[170px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed text-center transition p-5",
                isDragging 
                  ? "border-lime-300 bg-lime-300/10" 
                  : "border-white/10 bg-black/40 hover:border-lime-300/50 hover:bg-black/60"
              )}
            >
              {refs.length === 0 ? (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-lime-300/10 text-lime-300 mb-3 group-hover:scale-105 transition">
                    <Upload className="h-6 w-6" />
                  </div>
                  <span className="text-base font-bold text-white">Click or drag photos here</span>
                  <span className="mt-1.5 text-xs text-zinc-500">10-24 photos recommended</span>
                </>
              ) : (
                <div className="w-full">
                  <div className="mb-3 flex items-center justify-between text-left">
                    <span className="text-sm font-bold text-zinc-300">Previews</span>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-lime-300 px-3 py-1.5 text-xs font-bold text-black hover:bg-lime-200"
                    >
                      <ImagePlus className="h-3.5 w-3.5" /> Add More
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2 max-h-[180px] overflow-y-auto pr-1">
                    {refs.map((ref) => (
                      <div key={ref.id} className="group/thumb relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-black">
                        <img src={ref.dataUrl} alt="" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setRefs((prev) => prev.filter((item) => item.id !== ref.id));
                          }}
                          className="absolute right-1 top-1 rounded-full bg-black/80 p-1 text-white hover:bg-red-600/80"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onPickImages} />
            </div>
          </div>

          {/* Step 2: Identity Setup */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-zinc-200">Step 2: Identity Compiler</h3>
            
            <div className="space-y-3.5">
              <input 
                ref={nameInputRef} 
                value={name} 
                onChange={(event) => setName(event.target.value)} 
                placeholder="Character name (optional)" 
                className="h-13 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-base text-white placeholder-zinc-500 outline-none focus:border-lime-300/50 focus:bg-black/80 transition" 
              />
              
              <textarea 
                value={description} 
                onChange={(event) => setDescription(event.target.value)} 
                placeholder="Short description, role, aesthetic rules..." 
                rows={3} 
                className="w-full resize-none rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white placeholder-zinc-500 outline-none focus:border-lime-300/50 focus:bg-black/80 transition" 
              />

              <button 
                type="button"
                onClick={() => setShowAdvanced((value) => !value)} 
                className="flex h-12 w-full items-center justify-between rounded-xl border border-white/10 bg-black/20 hover:bg-black/40 px-4 text-sm font-semibold text-zinc-300 transition"
              >
                <span>Advanced Identity Memory</span>
                <span className="text-xs text-zinc-400 bg-white/5 px-2.5 py-0.5 rounded-md">{showAdvanced ? "Hide" : "Expand"}</span>
              </button>

              {showAdvanced && (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">Face Memory Override</span>
                    <textarea value={faceNotes} onChange={(event) => setFaceNotes(event.target.value)} placeholder="Face shape, eye color, structure..." rows={2} className="w-full resize-none rounded-xl border border-white/10 bg-black/50 px-3.5 py-2.5 text-sm outline-none focus:border-lime-300/50" />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">Body Profile Override</span>
                    <textarea value={bodyNotes} onChange={(event) => setBodyNotes(event.target.value)} placeholder="Height, silhouette, proportions..." rows={2} className="w-full resize-none rounded-xl border border-white/10 bg-black/50 px-3.5 py-2.5 text-sm outline-none focus:border-lime-300/50" />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">Outfit Memory Override</span>
                    <textarea value={outfitNotes} onChange={(event) => setOutfitNotes(event.target.value)} placeholder="WARDROBE consistency, signature items..." rows={2} className="w-full resize-none rounded-xl border border-white/10 bg-black/50 px-3.5 py-2.5 text-sm outline-none focus:border-lime-300/50" />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">Style DNA Override</span>
                    <textarea value={styleNotes} onChange={(event) => setStyleNotes(event.target.value)} placeholder="Lighting language, grading presets..." rows={2} className="w-full resize-none rounded-xl border border-white/10 bg-black/50 px-3.5 py-2.5 text-sm outline-none focus:border-lime-300/50" />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">Motion References Override</span>
                    <textarea value={motionNotes} onChange={(event) => setMotionNotes(event.target.value)} placeholder="Animation safety boundaries, cycle limits..." rows={2} className="w-full resize-none rounded-xl border border-white/10 bg-black/50 px-3.5 py-2.5 text-sm outline-none focus:border-lime-300/50" />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">Cinematic Meta Tags</span>
                    <input value={cinematicTags} onChange={(event) => setCinematicTags(event.target.value)} placeholder="Editorial, 85mm, Cinematic Light..." className="h-12 w-full rounded-xl border border-white/10 bg-black/50 px-3.5 text-sm outline-none focus:border-lime-300/50" />
                  </div>

                  {/* Identity Compiler Preview */}
                  <div className="rounded-xl border border-white/5 bg-black/35 p-3.5 space-y-2.5 mt-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">
                      <BadgeCheck className="h-4 w-4 text-lime-300" />
                      Live Compiled Metadata
                    </div>
                    <div className="grid gap-2">
                      <MemoryBlock label="Face Model" value={packagePreview.faceMemory} />
                      <MemoryBlock label="Outfit Model" value={packagePreview.outfitMemory} />
                      <MemoryBlock label="Stability constraints" value={packagePreview.motionReferences} />
                    </div>
                  </div>
                </div>
              )}



              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                  {error}
                </div>
              )}

              <button
                onClick={createCharacter}
                disabled={!canCreate}
                className={cn(
                  "flex h-14 w-full items-center justify-center gap-2 rounded-xl text-base font-black transition",
                  canCreate 
                    ? "bg-lime-300 text-black hover:bg-lime-200 shadow-lg shadow-lime-300/10" 
                    : "cursor-not-allowed bg-white/5 text-zinc-600 border border-white/5",
                )}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Compiling Character Package...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Compile Identity Entity
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Library, Test Generator, Guides & Rules (Scrollable) */}
      <div className="flex-1 h-full flex flex-col bg-[#060c18] overflow-hidden">
        {/* Sub-Header Navbar */}
        <div className="h-16 border-b border-white/10 px-6 flex items-center justify-between shrink-0 bg-[#070d1a]">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              Character Library & Validation Tools
            </h2>
          </div>
          <button 
            onClick={() => void loadCharacters()} 
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-zinc-950 px-4 text-xs font-semibold text-zinc-300 hover:bg-zinc-900 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reload Library
          </button>
        </div>

        {/* Scrollable Contents */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          
          {/* Guides and Guidelines Widgets */}
          <div className="grid gap-4 lg:grid-cols-2">
            
            {/* Guide Step Slider */}
            <div className="rounded-2xl border border-white/5 bg-[#0a0f1d] p-5 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-lime-300">Interactive Guide</span>
                <span className="text-xs text-zinc-500 font-semibold">Step {guideStep + 1} of {CHARACTER_GUIDE_STEPS.length}</span>
              </div>
              
              <div className="relative aspect-[16/8] overflow-hidden rounded-xl bg-zinc-950 border border-white/5">
                <img src={CHARACTER_GUIDE_STEPS[guideStep].image} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-black/75 p-3 border border-white/5 backdrop-blur-sm">
                  <div className="text-sm font-bold text-white">{CHARACTER_GUIDE_STEPS[guideStep].title}</div>
                  <div className="text-xs text-zinc-400 mt-1 leading-relaxed">{CHARACTER_GUIDE_STEPS[guideStep].subtitle}</div>
                </div>
              </div>
              
              <div className="flex gap-2">
                {CHARACTER_GUIDE_STEPS.map((step, idx) => (
                  <button
                    key={step.title}
                    type="button"
                    onClick={() => setGuideStep(idx)}
                    className={cn(
                      "flex-1 py-2 rounded-xl border text-center text-xs font-bold transition",
                      idx === guideStep 
                        ? "border-lime-300 bg-lime-300/10 text-lime-200" 
                        : "border-white/5 bg-black/40 text-zinc-400 hover:bg-white/5"
                    )}
                  >
                    Step {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Rules Quick Checklist */}
            <div className="rounded-2xl border border-white/5 bg-[#0a0f1d] p-5 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">Rules & Quality Assurance</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 flex-1 min-h-[160px] text-xs">
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 space-y-2">
                  <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <Check className="h-4 w-4" /> Recommended
                  </div>
                  <ul className="list-disc list-inside text-zinc-300 space-y-1.5 pl-0.5">
                    {GOOD_RULES.map(r => <li key={r.title} className="truncate" title={r.descAr}>{r.titleAr}</li>)}
                  </ul>
                </div>
                
                <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 space-y-2">
                  <div className="font-bold text-red-400 flex items-center gap-1.5">
                    <X className="h-4 w-4" /> Avoid
                  </div>
                  <ul className="list-disc list-inside text-zinc-300 space-y-1.5 pl-0.5">
                    {AVOID_RULES.map(r => <li key={r.title} className="truncate" title={r.descAr}>{r.titleAr}</li>)}
                  </ul>
                </div>
              </div>
            </div>

          </div>

          {/* Test Generation Config Section */}
          <div className="rounded-2xl border border-white/10 bg-[#0a0f1d] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-lime-300" />
              <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-zinc-200">Identity Test Generator</h3>
            </div>
            
            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-[0.1em] text-zinc-400">Validation Prompt</span>
                <textarea 
                  value={variationPrompt} 
                  onChange={(event) => setVariationPrompt(event.target.value)} 
                  rows={2} 
                  className="w-full resize-none rounded-xl border border-white/10 bg-[#08090b] px-4 py-3 text-sm text-white outline-none focus:border-lime-300/50 transition" 
                />
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 text-sm">
                
                {/* Selector Group 1 */}
                <div className="rounded-xl border border-white/5 bg-black/30 p-4 space-y-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-[0.1em] text-zinc-400">Refining AI Model</span>
                    <select value={selectedModelId} onChange={(event) => setSelectedModelId(event.target.value as CharacterModelId)} className="h-10 w-full rounded-lg border border-white/10 bg-[#08090b] px-3 text-sm text-zinc-300 outline-none mt-1.5 focus:border-lime-300/50">
                      {CHARACTER_MODELS.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-[0.1em] text-zinc-400">Output Aspect Ratio</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {CHARACTER_ASPECT_RATIOS.map((ratio) => (
                        <button
                          key={ratio}
                          type="button"
                          onClick={() => setCharacterAspectRatio(ratio)}
                          className={cn(
                            "rounded-lg border px-3 py-1.5 text-xs font-bold transition", 
                            characterAspectRatio === ratio 
                              ? "border-lime-300 bg-lime-300 text-black font-black" 
                              : "border-white/5 bg-[#08090b] text-zinc-400 hover:bg-white/5"
                          )}
                        >
                          {ratio}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Selector Group 2 */}
                <div className="rounded-xl border border-white/5 bg-black/30 p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-[0.1em] text-zinc-400">Aesthetic style</span>
                      <select value={characterStyle} onChange={(event) => setCharacterStyle(event.target.value)} className="h-10 w-full rounded-lg border border-white/10 bg-[#08090b] px-3 text-sm text-zinc-300 outline-none mt-1.5 focus:border-lime-300/50">
                        {CHARACTER_STYLES.map((style) => <option key={style} value={style}>{style}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-[0.1em] text-zinc-400">Tuning Speed</span>
                      <select value={characterRenderingSpeed} onChange={(event) => setCharacterRenderingSpeed(event.target.value)} className="h-10 w-full rounded-lg border border-white/10 bg-[#08090b] px-3 text-sm text-zinc-300 outline-none mt-1.5 focus:border-lime-300/50">
                        {CHARACTER_SPEEDS.map((speed) => <option key={speed} value={speed}>{speed}</option>)}
                      </select>
                    </label>
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-[0.1em] text-zinc-400">Target Quality</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {CHARACTER_QUALITIES.map((quality) => (
                        <button
                          key={quality}
                          type="button"
                          onClick={() => setCharacterQuality(quality)}
                          className={cn(
                            "rounded-lg border px-3 py-1.5 text-xs font-bold transition", 
                            characterQuality === quality 
                              ? "border-lime-300 bg-lime-300 text-black font-black" 
                              : "border-white/5 bg-[#08090b] text-zinc-400 hover:bg-white/5"
                          )}
                        >
                          {quality}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Saved Characters List */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-zinc-200">Identity Vault ({characters.length})</h3>
            
            {loading ? (
              <div className="flex h-40 items-center justify-center text-zinc-500 border border-white/5 bg-[#0a0f1d] rounded-2xl">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-lime-300" /> 
                <span className="text-sm font-medium">Querying identity records...</span>
              </div>
            ) : characters.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 text-center bg-black/10">
                <Camera className="mb-2 h-7 w-7 text-zinc-700 animate-pulse" />
                <p className="text-xs font-semibold text-zinc-400">Library is empty</p>
                <p className="mt-1 text-[10px] text-zinc-600 max-w-xs">Upload your photos in the creator panel to generate your first entity.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {characters.map((character) => {
                  const pkg = character.metadata?.characterPackage;
                  return (
                    <article key={character.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0f1d] hover:border-white/20 transition flex flex-col justify-between">
                      <div className="relative aspect-[16/11] bg-zinc-950">
                        {character.coverUrl ? (
                          <img src={character.coverUrl} alt={character.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-zinc-700 bg-black/40"><UserRound className="h-9 w-9" /></div>
                        )}
                        <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-full bg-lime-300 px-2.5 py-1 text-xs font-black text-black">
                          <CheckCircle2 className="h-3.5 w-3.5" /> {character.status}
                        </div>
                      </div>
                      
                      <div className="p-4 space-y-4 flex-1 flex flex-col justify-between">
                        <div className="space-y-1">
                          <h3 className="line-clamp-1 text-sm font-bold text-white">{character.name}</h3>
                          <p className="line-clamp-2 min-h-[36px] text-xs text-zinc-400 leading-relaxed">
                            {pkg?.mainIdentity || character.description || "Persistent character identity."}
                          </p>
                        </div>
                        
                        <div className="flex flex-wrap gap-1.5">
                          {(pkg?.cinematicMetadata?.length ? pkg.cinematicMetadata : ["Identity"]).slice(0, 3).map((tag) => (
                            <span key={tag} className="rounded-full border border-white/5 bg-black/35 px-2 py-0.5 text-xs font-semibold text-zinc-400">{tag}</span>
                          ))}
                        </div>

                        {pkg && (
                          <div className="rounded-lg border border-white/5 bg-black/40 p-2.5 text-xs text-zinc-400 leading-relaxed line-clamp-2 font-mono">
                            {pkg.faceMemory}
                          </div>
                        )}
                        
                        {/* Control Buttons */}
                        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/5 text-xs">
                          <button 
                            onClick={() => void copyReference(character)} 
                            className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-black/20 hover:bg-black/50 py-2.5 font-bold text-zinc-200 transition"
                          >
                            {copiedId === character.id ? <CheckCircle2 className="h-4 w-4 text-lime-300" /> : <Copy className="h-4 w-4" />}
                            {copiedId === character.id ? "Copied" : "Copy Prompt"}
                          </button>
                          
                          <a 
                            href={`/image?characterId=${encodeURIComponent(character.id)}`} 
                            className="flex items-center justify-center gap-2 rounded-lg bg-lime-300 hover:bg-lime-200 py-2.5 font-black text-black transition"
                          >
                            <Wand2 className="h-4 w-4" /> 
                            Use Identity
                          </a>
                          
                          <button 
                            onClick={() => void generateVariation(character)} 
                            disabled={generatingCharacterId === character.id} 
                            className="flex items-center justify-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-500/10 hover:bg-emerald-500/20 py-2.5 font-semibold text-emerald-300 disabled:opacity-60 transition"
                          >
                            {generatingCharacterId === character.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                            Test State
                          </button>
                          
                          <button 
                            onClick={() => void deleteCharacter(character.id)} 
                            className="rounded-lg border border-red-500/25 bg-red-500/5 hover:bg-red-500/15 py-2.5 text-red-400 hover:text-red-300 transition flex items-center justify-center"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {generatedUrls[character.id]?.length ? (
                          <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-white/5">
                            {generatedUrls[character.id].slice(0, 4).map((url) => (
                              <button 
                                key={url} 
                                onClick={() => window.open(url, "_blank", "noopener,noreferrer")} 
                                className="aspect-square overflow-hidden rounded-lg border border-white/10 bg-black hover:scale-[1.03] transition-transform duration-200"
                              >
                                <img src={url} alt="" className="h-full w-full object-cover" />
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
          </div>

          {/* Footer Warnings */}
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-relaxed text-amber-200/80">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <span>
              <strong>Note:</strong> Character Identity nodes exist as global state resources outside standard local graph trees. Production rendering canvases and generative paths read and compile these definitions automatically on task execution.
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}
