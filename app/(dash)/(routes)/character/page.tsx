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
  ChevronDown,
  BookOpen,
  Download,
  Link2,
  Grid,
  Sparkle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeMediaUrl } from "@/lib/storage";

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

type CharacterModelId = "gemini-3.1-flash-image" | "gemini-3-pro-image-preview" | "gemini-3.1-flash-lite-image";

const CHARACTER_MODELS: Array<{
  id: CharacterModelId;
  name: string;
  provider: string;
  badge: string;
  description: string;
}> = [
  {
    id: "gemini-3.1-flash-image",
    name: "Nano Banana 2",
    provider: "Google",
    badge: "RECOMMENDED",
    description: "Balanced speed and high-quality consistent character generation.",
  },
  {
    id: "gemini-3-pro-image-preview",
    name: "Nano Banana Pro",
    provider: "Google",
    badge: "PREMIUM",
    description: "Highest level of detail, complex instructions, and brand consistency.",
  },
  {
    id: "gemini-3.1-flash-lite-image",
    name: "Nano Banana 2 Lite",
    provider: "Google",
    badge: "FAST",
    description: "Ultra-fast and cost-effective generations.",
  },
];

const CHARACTER_ASPECT_RATIOS = ["1:1", "4:3", "3:4", "16:9", "9:16"];
const CHARACTER_QUALITIES = ["1K", "2K", "4K"];
const CHARACTER_STYLES = ["Auto", "Realistic", "Cinematic", "Editorial", "Anime"];
const CHARACTER_SPEEDS = ["Quality", "Balanced", "Fast"];

const DEFAULT_STATES: Record<CharacterStateKey, string> = {
  neutral: "Clean identity reference, relaxed face, readable front angle, no dramatic styling changes.",
  hero: "Premium hero look, confident posture, strong face readability, beauty lighting.",
  motion: "Stable body proportions, natural walk cycle, controlled hair/fabric movement, face consistency preserved.",
  editorial: "Fashion campaign posture, polished styling, premium composition, expressive but identity-safe.",
  emotional: "Close-up acting state, eyes and facial features preserved, subtle expression changes only.",
};

const CHARACTER_TEMPLATES = [
  {
    id: "eccentric",
    name: "The Eccentric",
    nameAr: "الشخصية الغريبة",
    desc: "Unforgettable quirky humans. Magnetic scene-stealers with offbeat charm.",
    descAr: "شخصية فريدة وغريبة الأطوار تلفت الأنظار بكاريزما غير تقليدية.",
    avatar: "🤪",
    gradient: "from-pink-500/20 to-rose-500/20 text-rose-300 border-rose-500/20 hover:border-rose-500/40",
    prompt: "A character portrait of a highly eccentric person, quirky round glasses, colorful clothing, detailed facial expression, creative studio lighting."
  },
  {
    id: "professional",
    name: "The Professional",
    nameAr: "الشخصية المهنية",
    desc: "Clean cut, well spoken, competent.",
    descAr: "مظهر أنيق ومهندم، ملامح واثقة وجادة تدل على الكفاءة.",
    avatar: "💼",
    gradient: "from-blue-500/20 to-indigo-500/20 text-blue-300 border-blue-500/20 hover:border-blue-500/40",
    prompt: "A professional corporate headshot of a businessperson, clean-cut styling, confident neutral expression, soft office background, natural key light."
  },
  {
    id: "wildcard",
    name: "The Wildcard",
    nameAr: "الشخصية الحرة",
    desc: "Beyond human, anything can be a character, right?",
    descAr: "مظهر غير مألوف أو كائن من عالم آخر يتجاوز الحدود التقليدية.",
    avatar: "🤖",
    gradient: "from-purple-500/20 to-violet-500/20 text-violet-300 border-violet-500/20 hover:border-violet-500/40",
    prompt: "A highly stylized creative character, futuristic neon face markings, cyberpunk fashion, cinematic purple and teal highlights."
  },
  {
    id: "familiar",
    name: "The Familiar",
    nameAr: "الشخصية المألوفة",
    desc: "Grounded and authentic, a relatable anchor for your story.",
    descAr: "ملامح دافئة وقريبة من القلب، تعبر عن البساطة والواقعية.",
    avatar: "👤",
    gradient: "from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/20 hover:border-emerald-500/40",
    prompt: "A warm and friendly portrait of an everyday person, gentle smile, natural daylight, photorealistic detailed features."
  },
  {
    id: "wicked",
    name: "The Wicked",
    nameAr: "الشخصية الحادة",
    desc: "Powerful antagonistic figures that command the screen.",
    descAr: "ملامح حادة وكاريزما قوية تفرض حضورها بقوة على الشاشة.",
    avatar: "😈",
    gradient: "from-red-500/20 to-orange-500/20 text-orange-300 border-orange-500/20 hover:border-orange-500/40",
    prompt: "A dramatic portrait of a powerful antagonistic character, sharp eyes, low-key dark lighting, volumetric shadows, intense expression."
  },
  {
    id: "fantastical",
    name: "The Fantastical",
    nameAr: "الشخصية الخيالية",
    desc: "Ethereal, dreamlike beings fusing the human and the mythical.",
    descAr: "كائن خيالي أسطوري يدمج بين الملامح البشرية والجمال السحري.",
    avatar: "🧝‍♀️",
    gradient: "from-cyan-500/20 to-sky-500/20 text-cyan-300 border-cyan-500/20 hover:border-cyan-500/40",
    prompt: "An ethereal portrait of a fantastical elf-like being, glowing silver hair, subtle magical particles, soft dreamlike fantasy lighting."
  }
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
      contentType: file.type || "image/jpeg",
      assetType: "image",
    }),
  });
  const data = await urlRes.json().catch(() => null);
  if (!urlRes.ok || !data?.signedUrl || !data?.publicUrl) {
    throw new Error(data?.error || "Could not prepare the upload.");
  }

  const putRes = await fetch(String(data.signedUrl), {
    method: "PUT",
    headers: { "Content-Type": file.type || "image/jpeg" },
    body: file,
  });
  if (!putRes.ok) throw new Error("Asset upload failed.");

  return String(data.publicUrl);
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

function displayMediaUrl(url: string | null | undefined): string {
  return normalizeMediaUrl(url) || "";
}

export default function CharacterPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<"create" | "vault">("create");
  const [isDragging, setIsDragging] = useState(false);
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
  const [selectedModelId, setSelectedModelId] = useState<CharacterModelId>("gemini-3.1-flash-image");
  const [characterAspectRatio, setCharacterAspectRatio] = useState("1:1");
  const [characterQuality, setCharacterQuality] = useState("1K");
  const [characterStyle, setCharacterStyle] = useState("Auto");
  const [characterRenderingSpeed, setCharacterRenderingSpeed] = useState("Quality");
  const [generatingCharacterId, setGeneratingCharacterId] = useState<string | null>(null);
  const [generatedUrls, setGeneratedUrls] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

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

  const onPickImages = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((file) => file.type.startsWith("image/")).slice(0, 24 - refs.length);
    if (!files.length) return;
    const mapped = await Promise.all(files.map(async (file) => ({ id: uid("ref"), file, dataUrl: await fileToDataUrl(file) })));
    setRefs((prev) => [...prev, ...mapped].slice(0, 24));
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
      setSelectedTemplateId(null);
      
      // Switch tab to vault to show their compiled character!
      setActiveTab("vault");
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

  const handleTemplateSelect = (tpl: typeof CHARACTER_TEMPLATES[0]) => {
    setSelectedTemplateId(tpl.id);
    setName(tpl.name);
    setDescription(tpl.desc);
    setVariationPrompt(tpl.prompt);
  };

  const selectedModelName = useMemo(() => {
    return CHARACTER_MODELS.find(m => m.id === selectedModelId)?.name || "Nano Banana 2";
  }, [selectedModelId]);

  return (
    <div className="h-[calc(100vh-4rem)] w-full overflow-hidden flex flex-col bg-[#05070f] text-white">
      {/* Top Navigation Bar with Tabs */}
      <div className="h-16 border-b border-white/5 bg-[#090b14]/80 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-violet-400" />
            <span className="text-sm font-semibold tracking-wide text-zinc-200">Character Studio</span>
          </div>

          <div className="flex items-center bg-white/[0.02] border border-white/5 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("create")}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5",
                activeTab === "create" 
                  ? "bg-violet-600/25 text-violet-300 border border-violet-500/10" 
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              <Sparkles size={13} />
              Create Character
            </button>
            <button
              onClick={() => setActiveTab("vault")}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5",
                activeTab === "vault" 
                  ? "bg-violet-600/25 text-violet-300 border border-violet-500/10" 
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              <Grid size={13} />
              Character Library ({characters.length})
            </button>
          </div>
        </div>

        <button 
          onClick={() => void loadCharacters()} 
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3.5 text-xs font-semibold text-zinc-300 hover:bg-white/[0.05] transition"
        >
          <RefreshCw className="h-3 w-3" />
          Reload
        </button>
      </div>

      {/* Main Workspace content */}
      <div className="flex-1 overflow-y-auto p-8 scrollbar-none relative">
        {activeTab === "create" ? (
          <div className="max-w-5xl mx-auto space-y-8">
            {/* Header Description */}
            <div className="text-center space-y-2.5 max-w-xl mx-auto">
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                Build and reuse characters for consistent videos
              </h1>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Use a sample prompt below, or create from scratch. Upload reference photos to lock down identity consistency.
              </p>
            </div>

            {/* Template Selector Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {CHARACTER_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => handleTemplateSelect(tpl)}
                  className={cn(
                    "p-4 rounded-2xl border text-left bg-white/[0.01] transition-all hover:bg-white/[0.02] hover:-translate-y-0.5 duration-200 group flex items-start gap-4",
                    selectedTemplateId === tpl.id 
                      ? "border-violet-500 bg-violet-600/[0.04] shadow-md shadow-violet-500/5" 
                      : "border-white/5"
                  )}
                >
                  <div className={cn(
                    "w-11 h-11 rounded-xl flex items-center justify-center text-lg bg-gradient-to-br border shrink-0", 
                    tpl.gradient
                  )}>
                    {tpl.avatar}
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-zinc-200 flex items-center gap-1">
                      {tpl.name}
                      <span className="text-[10px] text-zinc-500 font-medium">({tpl.nameAr})</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 leading-relaxed">
                      {tpl.desc}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Input Workspace Console */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/5 bg-[#090b14] shadow-xl p-4 space-y-4 relative">
                {/* Textarea description */}
                <textarea
                  value={variationPrompt}
                  onChange={(e) => setVariationPrompt(e.target.value)}
                  placeholder="Describe your character..."
                  rows={4}
                  className="w-full bg-transparent border-0 outline-none resize-none text-sm text-zinc-200 placeholder-zinc-600 focus:ring-0 leading-relaxed pr-12"
                />

                {/* Uploaded references list (inline inside the box) */}
                {refs.length > 0 && (
                  <div className="border-t border-white/5 pt-3 space-y-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Reference Images ({refs.length})</span>
                    <div className="flex flex-wrap gap-2">
                      {refs.map((ref) => (
                        <div key={ref.id} className="relative w-12 h-12 rounded-lg overflow-hidden border border-white/10 group bg-black shrink-0">
                          <img src={ref.dataUrl} alt="" className="w-full h-full object-cover" />
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              setRefs(prev => prev.filter(item => item.id !== ref.id));
                            }}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-red-400"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inner Action Bar */}
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setVariationPrompt(p => p + ", highly detailed, cinematic style, 8k resolution, portrait")}
                      className="px-3 py-1.5 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-[10px] font-bold text-zinc-400 transition"
                    >
                      Format
                    </button>

                    {/* Model dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                        className="px-3 py-1.5 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-[10px] font-bold text-zinc-300 flex items-center gap-1 transition"
                      >
                        <Sparkles size={11} className="text-violet-400" />
                        {selectedModelName}
                        <ChevronDown size={10} />
                      </button>

                      {modelDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-25" onClick={() => setModelDropdownOpen(false)} />
                          <div className="absolute left-0 bottom-full mb-1.5 w-60 rounded-xl border border-white/10 bg-[#090b14] shadow-2xl p-1.5 z-30 flex flex-col gap-0.5">
                            {CHARACTER_MODELS.map((model) => (
                              <button
                                key={model.id}
                                onClick={() => {
                                  setSelectedModelId(model.id);
                                  setModelDropdownOpen(false);
                                }}
                                className={cn(
                                  "w-full text-left p-2 rounded-lg text-xs transition flex flex-col gap-0.5",
                                  selectedModelId === model.id ? "bg-violet-600/10 text-violet-300" : "text-zinc-400 hover:bg-white/5 hover:text-white"
                                )}
                              >
                                <span className="font-bold flex items-center justify-between">
                                  {model.name}
                                  <span className="text-[8px] bg-white/5 px-1.5 py-0.5 rounded-md text-zinc-500 font-normal">{model.badge}</span>
                                </span>
                                <span className="text-[9px] text-zinc-500 leading-normal">{model.description}</span>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Quick Config Toggle */}
                    <button
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="px-3 py-1.5 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-[10px] font-bold text-zinc-400 transition"
                    >
                      {showAdvanced ? "Hide Controls" : "Tuning Controls"}
                    </button>
                  </div>

                  {/* Generate Button */}
                  <button
                    onClick={createCharacter}
                    disabled={!canCreate || saving}
                    className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                      canCreate && !saving
                        ? "bg-violet-600 text-white hover:bg-violet-500 hover:scale-105 active:scale-95 shadow-md shadow-violet-600/10"
                        : "bg-white/5 text-zinc-600 cursor-not-allowed border border-white/5"
                    )}
                  >
                    {saving ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Wand2 size={14} />
                    )}
                  </button>
                </div>
              </div>

              {/* Advanced Parameters Block */}
              {showAdvanced && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 rounded-2xl border border-white/5 bg-white/[0.01]">
                  <div className="space-y-3">
                    <label className="block">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Aesthetic Style</span>
                      <select value={characterStyle} onChange={(e) => setCharacterStyle(e.target.value)} className="h-9 w-full rounded-xl border border-white/5 bg-[#08090f] px-3 text-xs text-zinc-300 outline-none focus:border-violet-500/50">
                        {CHARACTER_STYLES.map((style) => <option key={style} value={style}>{style}</option>)}
                      </select>
                    </label>

                    <div>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Output Aspect Ratio</span>
                      <div className="flex flex-wrap gap-1.5">
                        {CHARACTER_ASPECT_RATIOS.map((ratio) => (
                          <button
                            key={ratio}
                            onClick={() => setCharacterAspectRatio(ratio)}
                            className={cn(
                              "h-8 rounded-lg border px-3 text-xs font-bold transition", 
                              characterAspectRatio === ratio 
                                ? "border-violet-500 bg-violet-600/10 text-violet-300" 
                                : "border-white/5 bg-black/30 text-zinc-400 hover:bg-white/5"
                            )}
                          >
                            {ratio}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="block">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Tuning Speed</span>
                      <select value={characterRenderingSpeed} onChange={(e) => setCharacterRenderingSpeed(e.target.value)} className="h-9 w-full rounded-xl border border-white/5 bg-[#08090f] px-3 text-xs text-zinc-300 outline-none focus:border-violet-500/50">
                        {CHARACTER_SPEEDS.map((speed) => <option key={speed} value={speed}>{speed}</option>)}
                      </select>
                    </label>

                    <div>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Resolution</span>
                      <div className="flex flex-wrap gap-1.5">
                        {CHARACTER_QUALITIES.map((quality) => (
                          <button
                            key={quality}
                            onClick={() => setCharacterQuality(quality)}
                            className={cn(
                              "h-8 rounded-lg border px-3 text-xs font-bold transition", 
                              characterQuality === quality 
                                ? "border-violet-500 bg-violet-600/10 text-violet-300" 
                                : "border-white/5 bg-black/30 text-zinc-400 hover:bg-white/5"
                            )}
                          >
                            {quality}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Creation action buttons below uploader box */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 h-12 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] text-xs font-bold transition flex items-center justify-center gap-2 text-zinc-300"
                >
                  <Upload size={13} />
                  Upload Face Reference Photos (10-24 recommended)
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onPickImages} />
              </div>
            </div>

            {/* Guide Step slider & Quality Checklist */}
            <div className="grid gap-6 md:grid-cols-2 pt-6 border-t border-white/5">
              <div className="rounded-2xl border border-white/5 bg-[#090b14] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-violet-400">Model Capabilities</span>
                </div>
                <div className="text-xs text-zinc-400 leading-relaxed space-y-2">
                  <p>• <strong>Nano Banana 2</strong> excels at multiple reference image processing and keeping characters consistent across outputs.</p>
                  <p>• <strong>Nano Banana Pro</strong> is optimal for complex visual textures and custom brand identities.</p>
                  <p>• Supports uploading up to 14 reference photos to build a stable identity record.</p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-[#090b14] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Quality Checklist</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[11px] text-zinc-400">
                  <div className="p-3.5 rounded-xl bg-emerald-500/[0.02] border border-emerald-500/10 space-y-1">
                    <span className="font-bold text-emerald-400 block">Recommended</span>
                    <p>• Close-up front facing portraits.</p>
                    <p>• Single subject only.</p>
                    <p>• Multiple lighting angles.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-red-500/[0.02] border border-red-500/10 space-y-1">
                    <span className="font-bold text-red-400 block">Avoid</span>
                    <p>• Duplicates & group shots.</p>
                    <p>• Heavy filters & makeup.</p>
                    <p>• Sunglasses & face coverings.</p>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/10 bg-red-500/[0.02] p-4 text-xs text-red-400">
                {error}
              </div>
            )}
          </div>
        ) : (
          /* Tab 2: Saved Character Library Vault */
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Identity Vault</h2>
                <p className="text-xs text-zinc-500 mt-1">Manage and test your compiled characters inside Saad Studio.</p>
              </div>
            </div>

            {loading ? (
              <div className="flex h-60 items-center justify-center text-zinc-500 border border-white/5 bg-[#090b14] rounded-2xl">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-violet-500" /> 
                <span className="text-sm font-medium">Querying identity records...</span>
              </div>
            ) : characters.length === 0 ? (
              <div className="flex h-60 flex-col items-center justify-center rounded-2xl border border-dashed border-white/5 text-center bg-white/[0.01]">
                <Camera className="mb-2 h-7 w-7 text-zinc-700 animate-pulse" />
                <p className="text-xs font-semibold text-zinc-400">Your library is empty</p>
                <p className="mt-1 text-[10px] text-zinc-600 max-w-xs">Return to the creator panel to generate and save your first persistent character identity.</p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {characters.map((character) => {
                  const pkg = character.metadata?.characterPackage;
                  return (
                    <article key={character.id} className="overflow-hidden rounded-2xl border border-white/5 bg-[#090b14] hover:border-white/10 transition flex flex-col justify-between">
                      <div className="relative aspect-[16/11] bg-zinc-950">
                        {character.coverUrl ? (
                          <img src={displayMediaUrl(character.coverUrl)} alt={character.name} className="h-full w-full object-cover animate-fade-in" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-zinc-700 bg-black/40"><UserRound className="h-9 w-9" /></div>
                        )}
                        <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-full bg-violet-600/30 border border-violet-500/20 px-2.5 py-1 text-xs font-bold text-violet-300 backdrop-blur-md">
                          <CheckCircle2 className="h-3.5 w-3.5" /> {character.status}
                        </div>
                      </div>
                      
                      <div className="p-4 space-y-4 flex-1 flex flex-col justify-between">
                        <div className="space-y-1">
                          <h3 className="line-clamp-1 text-sm font-bold text-white">{character.name}</h3>
                          <p className="line-clamp-2 min-h-[36px] text-[11px] text-zinc-400 leading-relaxed">
                            {pkg?.mainIdentity || character.description || "Persistent character identity."}
                          </p>
                        </div>
                        
                        <div className="flex flex-wrap gap-1.5">
                          {(pkg?.cinematicMetadata?.length ? pkg.cinematicMetadata : ["Identity"]).slice(0, 3).map((tag) => (
                            <span key={tag} className="rounded-full border border-white/5 bg-black/35 px-2 py-0.5 text-[9px] font-semibold text-zinc-400">{tag}</span>
                          ))}
                        </div>

                        {pkg && (
                          <div className="rounded-lg border border-white/5 bg-black/40 p-2.5 text-[10px] text-zinc-500 leading-relaxed line-clamp-2 font-mono">
                            {pkg.faceMemory}
                          </div>
                        )}
                        
                        {/* Control Buttons */}
                        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/5 text-xs">
                          <button 
                            onClick={() => void copyReference(character)} 
                            className="flex items-center justify-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] py-2 font-bold text-zinc-200 transition"
                          >
                            {copiedId === character.id ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                            {copiedId === character.id ? "Copied" : "Copy Prompt"}
                          </button>
                          
                          <a 
                            href={`/cinema-flow?characterId=${encodeURIComponent(character.id)}`} 
                            className="flex items-center justify-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-500 py-2 font-bold text-white transition shadow-md shadow-violet-600/5"
                          >
                            <Wand2 className="h-3.5 w-3.5" /> 
                            Use Identity
                          </a>
                          
                          <button 
                            onClick={() => void generateVariation(character)} 
                            disabled={generatingCharacterId === character.id} 
                            className="flex items-center justify-center gap-2 rounded-lg border border-violet-500/10 bg-violet-500/[0.05] hover:bg-violet-500/10 py-2 font-semibold text-violet-300 disabled:opacity-60 transition"
                          >
                            {generatingCharacterId === character.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                            Test State
                          </button>
                          
                          <button 
                            onClick={() => void deleteCharacter(character.id)} 
                            className="rounded-lg border border-red-500/10 bg-red-500/[0.02] hover:bg-red-500/[0.06] py-2 text-red-400 hover:text-red-300 transition flex items-center justify-center animate-fade-in"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {generatedUrls[character.id]?.length ? (
                          <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-white/5">
                            {generatedUrls[character.id].slice(0, 4).map((url) => (
                              <button 
                                key={url} 
                                onClick={() => window.open(displayMediaUrl(url) || url, "_blank", "noopener,noreferrer")} 
                                className="aspect-square overflow-hidden rounded-lg border border-white/5 bg-black hover:scale-[1.03] transition-transform duration-200"
                              >
                                <img src={displayMediaUrl(url)} alt="" className="h-full w-full object-cover" />
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

            {/* Footer Warning */}
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/10 bg-amber-500/[0.02] p-3 text-[11px] leading-relaxed text-amber-200/80">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <span>
                <strong>Note:</strong> Character Identity nodes exist as global state resources outside standard local graph trees. Production rendering canvases and generative paths read and compile these definitions automatically on task execution.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
