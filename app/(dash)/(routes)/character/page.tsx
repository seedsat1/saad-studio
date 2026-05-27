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
    <div className="min-h-screen bg-black text-white">
      <main className="mx-auto max-w-5xl px-5 py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-zinc-500">Characters / <span className="text-zinc-200">New</span></div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">Create Character Identity</h1>
            <p className="mt-2 max-w-2xl text-base text-zinc-500">Upload one person, build a persistent identity, then reuse it automatically across image, video, and canvas workflows.</p>
          </div>
          <button onClick={() => void loadCharacters()} className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-zinc-950 px-4 text-sm font-semibold text-zinc-300 hover:bg-zinc-900">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <section className="mb-6 rounded-[28px] border border-white/10 bg-[#0f1012] p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.16em] text-lime-300">Interactive Creation Guide</div>
              <h2 className="mt-1 text-xl font-semibold">Quick Guide</h2>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-1 text-xs font-semibold text-zinc-300">
              <Sparkles className="h-3.5 w-3.5 text-lime-300" />
              Step {guideStep + 1} of {CHARACTER_GUIDE_STEPS.length}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
            <div className="relative aspect-[16/8] w-full bg-zinc-950">
              <img
                src={CHARACTER_GUIDE_STEPS[guideStep].image}
                alt={CHARACTER_GUIDE_STEPS[guideStep].title}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-white/10 bg-black/65 p-3 backdrop-blur-sm sm:p-4">
                <div className="text-sm font-black text-white sm:text-base">{CHARACTER_GUIDE_STEPS[guideStep].title}</div>
                <div className="mt-1 text-xs text-zinc-300 sm:text-sm">{CHARACTER_GUIDE_STEPS[guideStep].subtitle}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-3">
              {CHARACTER_GUIDE_STEPS.map((step, index) => {
                const active = index === guideStep;
                return (
                  <button
                    key={step.title}
                    type="button"
                    onClick={() => setGuideStep(index)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-left transition",
                      active ? "border-lime-300 bg-lime-300/10" : "border-white/10 bg-black/40 hover:bg-white/5"
                    )}
                  >
                    <div className={cn("text-[10px] font-black uppercase tracking-[0.14em]", active ? "text-lime-300" : "text-zinc-500")}>
                      Step {index + 1}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-zinc-200">{step.title.replace(/^Step \d+:\s*/, "")}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-[#101113] p-3 shadow-2xl shadow-black">
          <div
            onClick={handleZoneClick}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={cn(
              "group flex min-h-[390px] cursor-pointer flex-col items-center justify-center rounded-[23px] border border-dashed text-center transition",
              isDragging ? "border-lime-300 bg-lime-300/10" : "border-white/10 bg-gradient-to-b from-[#242527] to-[#17181a] hover:border-lime-300/60"
            )}
          >
            {refs.length === 0 ? (
              <>
                <span className="inline-flex items-center gap-2 rounded-2xl bg-lime-300 px-7 py-4 text-base font-black text-black transition group-hover:bg-lime-200">
                  Upload character photos <Upload className="h-5 w-5" />
                </span>
                <span className="mt-6 text-lg font-semibold text-zinc-300">10-24 photos recommended</span>
                <span className="mt-2 max-w-lg text-sm leading-6 text-zinc-500">One person, clear face, multiple angles. The system builds a persistent Character Package from these images.</span>
              </>
            ) : (
              <div className="w-full p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div className="text-left">
                    <div className="text-lg font-bold">{refs.length} reference image{refs.length === 1 ? "" : "s"} selected</div>
                    <div className="mt-1 text-sm text-zinc-500">Add more angles or continue to identity setup.</div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        document.getElementById("identity-setup")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white px-5 py-3 text-sm font-black text-black hover:bg-zinc-200"
                    >
                      Continue setup
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-lime-300 px-5 py-3 text-sm font-black text-black hover:bg-lime-200"
                    >
                      Add more <ImagePlus className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                  {refs.slice(0, 24).map((ref) => (
                    <div key={ref.id} className="group/thumb relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-black">
                      <img src={ref.dataUrl} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setRefs((prev) => prev.filter((item) => item.id !== ref.id));
                        }}
                        className="absolute right-1 top-1 hidden rounded-full bg-black/75 p-1 text-white group-hover/thumb:block hover:bg-red-600/80"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onPickImages} />
          </div>

          <div className="grid gap-4 p-5 lg:grid-cols-2">
            <RuleGroup type="good" items={GOOD_RULES} />
            <RuleGroup type="avoid" items={AVOID_RULES} />
          </div>

          {refs.length > 0 ? (
            <div className="mx-5 mb-5 rounded-2xl border border-lime-300/25 bg-lime-300/10 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-black text-lime-200">Next step</div>
                  <div className="mt-1 text-sm text-zinc-300">Create the Character Entity now, or add a name and optional notes first.</div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={createCharacter}
                    disabled={!canCreate}
                    className={cn(
                      "inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-black transition",
                      canCreate ? "bg-lime-300 text-black hover:bg-lime-200" : "cursor-not-allowed bg-white/10 text-zinc-600",
                    )}
                  >
                    {saving ? "Creating..." : "Create now"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      document.getElementById("identity-setup")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      window.setTimeout(() => nameInputRef.current?.focus(), 180);
                    }}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-black/40 px-5 text-sm font-bold text-white hover:bg-white/10"
                  >
                    Add details
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div id="identity-setup" className="scroll-mt-8 rounded-[28px] border border-white/10 bg-[#111214] p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-300 text-black">
                <Fingerprint className="h-6 w-6" />
              </div>
              <div>
                <div className="text-lg font-bold">Step 2: Identity setup</div>
                <div className="text-sm text-zinc-500">Optional details. The uploaded images are enough to create the identity.</div>
              </div>
            </div>

            <div className="space-y-4">
              <input ref={nameInputRef} value={name} onChange={(event) => setName(event.target.value)} placeholder="Character name (optional)" className="h-14 w-full rounded-2xl border border-white/10 bg-black px-4 text-base outline-none focus:border-lime-300/60" />
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Short identity note, role, personality..." rows={4} className="w-full resize-none rounded-2xl border border-white/10 bg-black px-4 py-3 text-base outline-none focus:border-lime-300/60" />

              <button onClick={() => setShowAdvanced((value) => !value)} className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-zinc-950 px-4 py-4 text-left text-sm font-semibold text-zinc-300 hover:bg-zinc-900">
                Advanced Character Package
                <span className="text-zinc-500">{showAdvanced ? "Hide" : "Open"}</span>
              </button>

              {showAdvanced ? (
                <div className="space-y-2">
                  <textarea value={faceNotes} onChange={(event) => setFaceNotes(event.target.value)} placeholder="Face Memory: face shape, eyes, nose, lips, hair, skin tone..." rows={3} className="w-full resize-none rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-lime-300/60" />
                  <textarea value={bodyNotes} onChange={(event) => setBodyNotes(event.target.value)} placeholder="Body Profile: proportions, posture, height impression..." rows={3} className="w-full resize-none rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-lime-300/60" />
                  <textarea value={outfitNotes} onChange={(event) => setOutfitNotes(event.target.value)} placeholder="Outfit Memory: wardrobe, colors, fabric, accessories..." rows={3} className="w-full resize-none rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-lime-300/60" />
                  <textarea value={styleNotes} onChange={(event) => setStyleNotes(event.target.value)} placeholder="Style DNA: mood, commercial identity, lighting language..." rows={3} className="w-full resize-none rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-lime-300/60" />
                  <textarea value={motionNotes} onChange={(event) => setMotionNotes(event.target.value)} placeholder="Motion rules: walk style, face stability, animation limits..." rows={3} className="w-full resize-none rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-lime-300/60" />
                  <input value={cinematicTags} onChange={(event) => setCinematicTags(event.target.value)} placeholder="Cinematic tags, comma separated" className="h-12 w-full rounded-2xl border border-white/10 bg-black px-4 text-sm outline-none focus:border-lime-300/60" />
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
                  "flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-black transition",
                  canCreate ? "bg-lime-300 text-black hover:bg-lime-200" : "cursor-not-allowed bg-white/10 text-zinc-600",
                )}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create Character Entity
              </button>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#111214] p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Character library</h2>
                <p className="text-sm text-zinc-500">Reusable identities for Image, Video, and AI Canvas.</p>
              </div>
            </div>

            <div className="mb-4 rounded-2xl border border-white/10 bg-black p-3">
              <label className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-500">Test generation prompt</label>
              <textarea value={variationPrompt} onChange={(event) => setVariationPrompt(event.target.value)} rows={4} className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-[#08090b] px-4 py-3 text-sm outline-none focus:border-lime-300/60" />
              <div className="mt-3 grid gap-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  {CHARACTER_MODELS.map((model) => {
                    const active = selectedModelId === model.id;
                    return (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => setSelectedModelId(model.id)}
                        className={cn(
                          "rounded-xl border p-3 text-left transition",
                          active ? "border-lime-300 bg-lime-300/10" : "border-white/10 bg-[#08090b] hover:bg-white/5",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-black text-white">{model.name}</span>
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-black", active ? "bg-lime-300 text-black" : "bg-white/10 text-zinc-300")}>{model.badge}</span>
                        </div>
                        <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">{model.provider}</div>
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-400">{model.description}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Ratio</div>
                    <div className="flex flex-wrap gap-1.5">
                      {CHARACTER_ASPECT_RATIOS.map((ratio) => (
                        <button
                          key={ratio}
                          type="button"
                          onClick={() => setCharacterAspectRatio(ratio)}
                          className={cn("rounded-lg border px-2.5 py-1.5 text-xs font-bold", characterAspectRatio === ratio ? "border-lime-300 bg-lime-300 text-black" : "border-white/10 bg-[#08090b] text-zinc-300 hover:bg-white/5")}
                        >
                          {ratio}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Quality</div>
                    <div className="flex flex-wrap gap-1.5">
                      {CHARACTER_QUALITIES.map((quality) => (
                        <button
                          key={quality}
                          type="button"
                          onClick={() => setCharacterQuality(quality)}
                          className={cn("rounded-lg border px-2.5 py-1.5 text-xs font-bold", characterQuality === quality ? "border-lime-300 bg-lime-300 text-black" : "border-white/10 bg-[#08090b] text-zinc-300 hover:bg-white/5")}
                        >
                          {quality}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Style</span>
                    <select value={characterStyle} onChange={(event) => setCharacterStyle(event.target.value)} className="h-10 w-full rounded-xl border border-white/10 bg-[#08090b] px-3 text-xs font-semibold text-zinc-200 outline-none focus:border-lime-300/60">
                      {CHARACTER_STYLES.map((style) => <option key={style} value={style}>{style}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Speed</span>
                    <select value={characterRenderingSpeed} onChange={(event) => setCharacterRenderingSpeed(event.target.value)} className="h-10 w-full rounded-xl border border-white/10 bg-[#08090b] px-3 text-xs font-semibold text-zinc-200 outline-none focus:border-lime-300/60">
                      {CHARACTER_SPEEDS.map((speed) => <option key={speed} value={speed}>{speed}</option>)}
                    </select>
                  </label>
                </div>
              </div>
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
