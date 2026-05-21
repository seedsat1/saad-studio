"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Film,
  Sparkles,
  ImagePlus,
  Layers,
  Repeat2,
  Wand2,
  Play,
  Pause,
  Download,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
  X,
  Camera,
  Mic2,
  Quote,
  Maximize2,
  Clock,
  Volume2,
  VolumeX,
  Crown,
  Zap,
  ChevronRight,
  Settings2,
  Plus,
  Trash2,
  Gauge,
  RectangleHorizontal,
  RectangleVertical,
  Diamond,
  Eye,
  Sparkle,
  Building2,
  Trees,
  Skull,
  Rocket,
  Cat,
  Heart,
  Drama,
  Gamepad2,
  Sun,
  CloudMoon,
  Utensils,
  Music2,
  Paintbrush,
  PencilRuler,
  Wind,
  Castle,
  Flame,
  Snowflake,
} from "lucide-react";
import { useGenerationGate } from "@/hooks/use-generation-gate";
import { VEO_PRESETS, type VeoPreset } from "@/lib/veo-presets";

/* ─────────────────────────────────────────────────────────────────────── */
/* Types & constants                                                        */
/* ─────────────────────────────────────────────────────────────────────── */

type Mode = "t2v" | "i2v" | "frames" | "reference" | "extend";
type Tier = "lite" | "fast" | "pro";
type Aspect = "16:9" | "9:16";
type Resolution = "720p" | "1080p" | "4k";
type QualityPreset = "draft" | "standard" | "ultra" | "max";

interface ModeDef {
  id: Mode;
  label: string;
  shortLabel: string;
  description: string;
  icon: typeof Film;
}

interface TierDef {
  id: Tier;
  name: string;
  tagline: string;
  badge?: string;
  /** credits per second (display only — server is source of truth) */
  rate: number;
  icon: typeof Film;
  accent: string;
}

const MODES: ModeDef[] = [
  {
    id: "t2v",
    label: "Text-to-Video",
    shortLabel: "Text",
    description: "Describe a scene and let Veo direct it from scratch.",
    icon: Wand2,
  },
  {
    id: "i2v",
    label: "Image-to-Video",
    shortLabel: "Image",
    description: "Bring a still photograph to life with motion and sound.",
    icon: ImagePlus,
  },
  {
    id: "frames",
    label: "First & Last Frame",
    shortLabel: "Frames",
    description: "Define the opening and closing shots — Veo fills the in-between.",
    icon: Layers,
  },
  {
    id: "reference",
    label: "Character & Subject",
    shortLabel: "Character",
    description:
      "Up to 3 reference images of a single person, character, or product — Veo keeps them consistent through the shot.",
    icon: Camera,
  },
  {
    id: "extend",
    label: "Extend Clip",
    shortLabel: "Extend",
    description: "Continue an existing video — Veo picks up where the upload ends.",
    icon: Repeat2,
  },
];

const TIERS: TierDef[] = [
  {
    id: "lite",
    name: "Veo 3.1 Lite",
    tagline: "Fast drafts · low cost",
    rate: 1.71,
    icon: Zap,
    accent: "from-sky-400 to-cyan-500",
  },
  {
    id: "fast",
    name: "Veo 3.1 Fast",
    tagline: "Balanced quality · 8s",
    rate: 1.71,
    badge: "POPULAR",
    icon: Film,
    accent: "from-violet-400 to-fuchsia-500",
  },
  {
    id: "pro",
    name: "Veo 3.1 Pro",
    tagline: "Hero shots · native audio",
    rate: 5.32,
    badge: "TOP",
    icon: Crown,
    accent: "from-amber-300 to-orange-500",
  },
];

function veoResolutionMultiplier(tier: Tier, resolution: Resolution): number {
  if (resolution === "1080p") return 1.3;
  if (resolution === "4k") {
    if (tier === "lite") return 3.285714;
    if (tier === "fast") return 3.0;
    return 1.8;
  }
  return 1.0;
}

/* ─── Cinematic Presets ──────────────────────────────────────────────── */

interface Preset {
  id: string;
  title: string;
  category: string;
  icon: typeof Film;
  accent: string;
  /** Optional override of recommended quality */
  quality?: QualityPreset;
  prompt: string;
}

const ICON_BY_NAME: Record<VeoPreset["iconName"], typeof Film> = {
  Building2,
  Castle,
  Cat,
  CloudMoon,
  Drama,
  Flame,
  Gamepad2,
  Heart,
  Music2,
  PencilRuler,
  Rocket,
  Snowflake,
  Sun,
  Trees,
  Utensils,
};

const PRESETS: Preset[] = VEO_PRESETS.map((preset) => ({
  id: preset.id,
  title: preset.title,
  category: preset.category,
  icon: ICON_BY_NAME[preset.iconName] ?? Film,
  accent: preset.accent,
  quality: preset.quality,
  prompt: preset.prompt,
}));

const LEGACY_PRESETS: Preset[] = [
  {
    id: "neo-noir",
    title: "Neo-Noir Detective",
    category: "Style",
    icon: Drama,
    accent: "from-slate-700 via-zinc-900 to-black",
    quality: "ultra",
    prompt:
      'A trench-coated detective leans against a rain-slick brick wall in a narrow alley. Neon signage in Chinese stutters across a puddle. He lights a cigarette, exhales, and murmurs to himself, "She lied about everything." Slow dolly-in on his face, hard side-light, deep shadows, 35mm anamorphic, rain ambience and distant saxophone.',
  },
  {
    id: "studio-ghibli",
    title: "Studio Ghibli Garden",
    category: "Animation",
    icon: Trees,
    accent: "from-emerald-500 via-green-600 to-teal-700",
    quality: "standard",
    prompt:
      "Hand-painted watercolor anime in the style of Studio Ghibli. A young girl in a sundress runs barefoot through a wildflower meadow under a vast cumulus sky. Wind ripples the grass, butterflies scatter, a soft piano melody plays. Camera tracks alongside her at low angle.",
  },
  {
    id: "cyberpunk-tokyo",
    title: "Cyberpunk Tokyo",
    category: "Style",
    icon: Building2,
    accent: "from-fuchsia-600 via-pink-500 to-cyan-500",
    quality: "ultra",
    prompt:
      "A wide shot of a 3 AM Tokyo intersection in heavy rain. Neon kanji signage and holographic ads reflect on wet asphalt. A masked figure on a glowing motorcycle weaves between robotaxis. Slow push-in. Synthwave bassline pulses under distant traffic.",
  },
  {
    id: "wes-anderson",
    title: "Wes Anderson Symmetry",
    category: "Style",
    icon: Castle,
    accent: "from-rose-300 via-amber-200 to-pink-300",
    quality: "standard",
    prompt:
      'Wes Anderson aesthetic. A pastel-pink hotel hallway, perfectly symmetrical, framed by ornate sconces. A bellboy in burgundy uniform marches toward camera carrying a stack of suitcases. Whip-pan reveal as he turns a corner. He deadpans to camera, "Room 217. As requested." Centered composition, 1.85:1.',
  },
  {
    id: "vhs-80s",
    title: "80s VHS Music Video",
    category: "Era",
    icon: Music2,
    accent: "from-violet-600 via-pink-600 to-orange-500",
    quality: "draft",
    prompt:
      "Authentic 1986 VHS music video aesthetic. A synthwave singer in a red leather jacket performs against a chrome-grid backdrop. Heavy magnetic tape distortion, scanlines, chromatic aberration, neon lens flares. Quick MTV-era cuts, smoke machine haze, retro drum machine punching.",
  },
  {
    id: "k-drama",
    title: "Korean Drama Snowfall",
    category: "Emotion",
    icon: Snowflake,
    accent: "from-sky-300 via-slate-200 to-rose-200",
    quality: "ultra",
    prompt:
      'A young woman stands under falling snow outside a Seoul café, breath visible. A man approaches with an umbrella, opens it over her, and says softly, "You\'re going to catch a cold." She looks up, eyes shimmering. Soft natural light, shallow depth of field, gentle piano under muted city ambience.',
  },
  {
    id: "action-chase",
    title: "Rooftop Action Chase",
    category: "Action",
    icon: Flame,
    accent: "from-orange-500 via-red-600 to-zinc-900",
    quality: "ultra",
    prompt:
      "A masked agent sprints across Hong Kong tenement rooftops at dusk. Handheld camera follows from behind, then whip-pans as she vaults a gap between buildings. Laundry lines whip past, helicopter blades thunder overhead, gunshots crack in the distance. Golden hour backlight, fast cuts, sharp focus.",
  },
  {
    id: "stop-motion",
    title: "Stop-Motion Claymation",
    category: "Animation",
    icon: Cat,
    accent: "from-orange-300 via-amber-400 to-yellow-500",
    quality: "standard",
    prompt:
      "Stop-motion claymation in the style of Aardman Studios. A chubby clay rabbit waddles through a tiny clay kitchen, opens a cupboard, and a tiny avalanche of clay carrots falls on his head. He sighs with comedic timing. Visible thumbprints, soft tungsten lighting, 24fps stutter.",
  },
  {
    id: "pixel-adventure",
    title: "16-bit Pixel Adventure",
    category: "Animation",
    icon: Gamepad2,
    accent: "from-emerald-400 via-cyan-500 to-blue-600",
    quality: "draft",
    prompt:
      "Authentic 16-bit pixel art adventure in SNES style. A pixel hero in a green tunic walks across a tile-based forest, swings a sword at a slime enemy, and a coin sparkle pops up. Chiptune soundtrack with cheerful melody, 320×240 effective resolution scaled up, no anti-aliasing.",
  },
  {
    id: "origami",
    title: "Origami World",
    category: "Animation",
    icon: PencilRuler,
    accent: "from-pink-200 via-rose-300 to-violet-300",
    quality: "standard",
    prompt:
      "Every object in the world is made of folded paper origami. A paper crane flies over a paper village; paper villagers wave, a paper river ripples. Visible fold creases, slight paper texture, soft studio lighting on a paper sky backdrop. Wonder and whimsy.",
  },
  {
    id: "anime-school",
    title: "Anime School Romance",
    category: "Animation",
    icon: Heart,
    accent: "from-rose-400 via-pink-400 to-fuchsia-500",
    quality: "ultra",
    prompt:
      'Anime cel-shaded style. A high-school girl with twin braids stands on a rooftop fence at sunset, hair blowing in the wind. A boy approaches behind her and says, "I waited for you." She turns slowly, cherry blossom petals drifting past. Soft j-pop melody, golden backlight, lens flare.',
  },
  {
    id: "documentary",
    title: "Documentary B-Roll",
    category: "Realism",
    icon: Sun,
    accent: "from-amber-500 via-orange-500 to-yellow-600",
    prompt:
      "Observational documentary style. An elderly fisherman repairs his nets on a wooden Mediterranean dock at dawn. Handheld but stable, natural light only, no music. The boat creaks against the dock; seagulls call. Wrinkled hands work with practiced rhythm. 16mm film grain.",
  },
  {
    id: "stage-music",
    title: "Stage Performance",
    category: "Performance",
    icon: Music2,
    accent: "from-violet-500 via-purple-600 to-indigo-700",
    quality: "ultra",
    prompt:
      "A live concert from the front row. A vocalist grips the mic stand under a single spotlight, sweat catching the light, crowd silhouettes pulsing below. Slow push-in as the chorus drops — strobe lights, lasers cut through fog, audience hands rise. Sub-bass thumps. 24fps cinema look.",
  },
  {
    id: "cooking-macro",
    title: "Cooking Show Macro",
    category: "Lifestyle",
    icon: Utensils,
    accent: "from-amber-400 via-orange-500 to-red-500",
    quality: "ultra",
    prompt:
      "Extreme macro shot of a chef searing a steak in a black cast-iron pan. Audible sizzle, butter spits, garlic browns. Camera pulls back slightly in slow-motion to reveal a basting spoon arcing hot butter over the meat. Soft window light from the side. Food porn aesthetic.",
  },
  {
    id: "spacewalk",
    title: "Sci-Fi Spacewalk",
    category: "Sci-Fi",
    icon: Rocket,
    accent: "from-indigo-700 via-blue-900 to-black",
    quality: "max",
    prompt:
      "An astronaut tethered to a damaged space station drifts in zero-g above Earth's curve. The visor reflects the Milky Way and the blue rim of the planet. Slow, quiet breathing through the helmet mic, distant beeping. Camera orbits slowly, no music, just silence and breath.",
  },
  {
    id: "surreal-dream",
    title: "Surreal Dream",
    category: "Art",
    icon: CloudMoon,
    accent: "from-purple-500 via-fuchsia-500 to-cyan-400",
    quality: "standard",
    prompt:
      "Surrealist dream sequence. A figure in a long red coat walks across a checkered floor that stretches into pink clouds. Doors of different sizes float through the air. The figure opens one and a flock of golden butterflies bursts out. Dreamlike pacing, ambient drone.",
  },
];

const PROMPT_EXAMPLES = [
  {
    label: "Dialogue scene",
    icon: Quote,
    prompt:
      'Close on two figures in a dimly lit corridor, torchlight flickering on stone walls. A man murmurs, "This must be it. That\'s the secret code." The woman looks up at him and whispers excitedly, "What did you find?"',
  },
  {
    label: "Cinematic establishing",
    icon: Camera,
    prompt:
      "A wide aerial shot of a neon-lit Tokyo intersection at 3 AM. Rain reflects the signage on the wet asphalt. Slow push-in. Distant traffic hum and faint synthwave under the silence.",
  },
  {
    label: "Action beat",
    icon: Sparkles,
    prompt:
      "A motorcycle weaves between cars on a desert highway at golden hour. Heat haze ripples over the road. The rider glances back — engines roar. Wind and gravel underfoot.",
  },
];

/* ─── Animations ──────────────────────────────────────────────────────── */

const fade: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
};

/* ─── Helpers ─────────────────────────────────────────────────────────── */

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        const idx = result.indexOf(",");
        resolve(idx >= 0 ? result.slice(idx + 1) : result);
      } else {
        reject(new Error("Read error"));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function uploadFile(file: File): Promise<string> {
  const base64 = await fileToBase64(file);
  const res = await fetch("/api/upload/frame", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      mimeType: file.type || "image/png",
      base64,
    }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "Upload failed");
    throw new Error(msg);
  }
  const json = (await res.json()) as { url?: string; error?: string };
  if (!json.url) throw new Error(json.error || "Upload failed");
  return json.url;
}

/* ─────────────────────────────────────────────────────────────────────── */
/* Page                                                                    */
/* ─────────────────────────────────────────────────────────────────────── */

export default function CinematicVideoPage() {
  const gate = useGenerationGate();

  const [mode, setMode] = useState<Mode>("t2v");
  const [tier, setTier] = useState<Tier>("fast");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [aspect, setAspect] = useState<Aspect>("16:9");
  const [resolution, setResolution] = useState<Resolution>("720p");
  const [duration, setDuration] = useState(8);
  const [audio, setAudio] = useState(true);
  const [quality, setQuality] = useState<QualityPreset>("standard");
  const [clarity, setClarity] = useState(2); // 0=off, 1=natural, 2=detailed, 3=hyper
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [enhancing, setEnhancing] = useState(false);

  // uploads
  const [startUrl, setStartUrl] = useState<string | null>(null);
  const [endUrl, setEndUrl] = useState<string | null>(null);
  const [refUrls, setRefUrls] = useState<string[]>([]);
  const [extendUrl, setExtendUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [muted, setMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [isSubmittingGeneration, setIsSubmittingGeneration] = useState(false);
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const generationSubmitLockRef = useRef(false);
  const activeGenerationCountRef = useRef(0);

  const beginVideoGeneration = useCallback(() => {
    activeGenerationCountRef.current += 1;
    setIsGenerating(true);
  }, []);

  const finishVideoGeneration = useCallback(() => {
    activeGenerationCountRef.current = Math.max(0, activeGenerationCountRef.current - 1);
    setIsGenerating(activeGenerationCountRef.current > 0);
  }, []);

  const cost = useMemo(() => {
    const tierDef = TIERS.find((t) => t.id === tier)!;
    return Math.ceil(tierDef.rate * duration * veoResolutionMultiplier(tier, resolution));
  }, [tier, duration, resolution]);

  // ── Mode validation ─────────────────────────────────────────────────
  const isReadyForMode = useMemo(() => {
    if (!prompt.trim() || prompt.trim().length < 4) return false;
    if (mode === "i2v") return !!startUrl;
    if (mode === "frames") return !!startUrl && !!endUrl;
    if (mode === "reference") return refUrls.length > 0;
    if (mode === "extend") return !!extendUrl;
    return true;
  }, [mode, prompt, startUrl, endUrl, refUrls, extendUrl]);

  // ── Quality preset → tier + resolution (matches Google spec) ─────────
  const applyQuality = useCallback((q: QualityPreset) => {
    setQuality(q);
    if (q === "draft") {
      setTier("lite");
      setResolution("720p");
    } else if (q === "standard") {
      setTier("fast");
      setResolution("720p");
    } else if (q === "ultra") {
      setTier("pro");
      setResolution("1080p");
    } else {
      // max → 4K only via Pro (Lite + Fast don't support 4K per Google docs)
      setTier("pro");
      setResolution("4k");
    }
  }, []);

  // ── Compute Google-enforced constraints ──────────────────────────────
  const lockDurationTo8 = useMemo(() => {
    if (mode === "reference") return true;
    if (mode === "extend") return true;
    if (resolution === "1080p" || resolution === "4k") return true;
    return false;
  }, [mode, resolution]);

  const lockTo720pBecauseExtend = mode === "extend";

  // Auto-correct duration when constraints flip on
  useEffect(() => {
    if (lockDurationTo8 && duration !== 8) setDuration(8);
  }, [lockDurationTo8, duration]);

  // Auto-correct resolution when in extend mode
  useEffect(() => {
    if (lockTo720pBecauseExtend && resolution !== "720p") {
      setResolution("720p");
      setQuality("standard");
    }
  }, [lockTo720pBecauseExtend, resolution]);

  // Google constraint: Lite doesn't support video extension → switch to Fast.
  useEffect(() => {
    if (mode === "extend" && tier === "lite") {
      setTier("fast");
      setQuality("standard");
    }
  }, [mode, tier]);

  // ── Magic Wand: enhance prompt via Gemini Flash ─────────────────────
  const handleEnhance = useCallback(async () => {
    if (!prompt.trim() || enhancing) return;
    setEnhancing(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/cinematic-video/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.enhanced) {
        throw new Error(data?.error || "Could not enhance the prompt.");
      }
      setPrompt(data.enhanced as string);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Prompt enhancement failed.",
      );
    } finally {
      setEnhancing(false);
    }
  }, [prompt, enhancing]);

  // ── Elapsed timer ───────────────────────────────────────────────────
  useEffect(() => {
    if (isGenerating) {
      setElapsed(0);
      elapsedTimerRef.current = setInterval(() => {
        setElapsed((e) => e + 1);
      }, 1000);
    } else if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
    return () => {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, [isGenerating]);

  // ── Upload handlers ─────────────────────────────────────────────────
  const handleSingleUpload = useCallback(
    async (file: File, slot: "start" | "end" | "extend") => {
      try {
        setUploading(true);
        setErrorMessage("");
        const url = await uploadFile(file);
        if (slot === "start") setStartUrl(url);
        else if (slot === "end") setEndUrl(url);
        else setExtendUrl(url);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [],
  );

  const handleRefUpload = useCallback(async (files: FileList | null) => {
    if (!files || !files.length) return;
    try {
      setUploading(true);
      setErrorMessage("");
      const list = Array.from(files).slice(0, 3 - refUrls.length);
      const urls = await Promise.all(list.map((f) => uploadFile(f)));
      setRefUrls((prev) => [...prev, ...urls].slice(0, 3));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [refUrls.length]);

  // ── Apply a Cinematic Preset ────────────────────────────────────────
  const applyPreset = useCallback(
    (p: Preset) => {
      setPrompt(p.prompt);
      setMode("t2v");
      if (p.quality) {
        setQuality(p.quality);
        if (p.quality === "draft") {
          setTier("lite");
          setResolution("720p");
        } else if (p.quality === "standard") {
          setTier("fast");
          setResolution("720p");
        } else if (p.quality === "ultra") {
          setTier("pro");
          setResolution("1080p");
        } else {
          setTier("pro");
          setResolution("4k");
        }
      }
      setErrorMessage("");
    },
    [],
  );

  // ── Clarity preset → prompt suffix ──────────────────────────────────
  const clarityLabel = useMemo(
    () => ["Off", "Natural", "Detailed", "Hyper-detailed"][clarity] ?? "Detailed",
    [clarity],
  );

  const claritySuffix = useMemo(() => {
    if (clarity === 0) return "";
    if (clarity === 1) return " Soft natural lighting, clean focus.";
    if (clarity === 2)
      return " Sharp focus, fine texture detail, crisp edges, high dynamic range.";
    return " Hyper-detailed, ultra-sharp focus, micro-texture clarity, 8K-grade image fidelity, crystal-clear edges.";
  }, [clarity]);

  // ── Generate ────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (generationSubmitLockRef.current) return;
    if (!isReadyForMode) return;
    generationSubmitLockRef.current = true;
    setIsSubmittingGeneration(true);

    const guard = await gate.guardGeneration({
      requiredCredits: cost,
      action: "cinematic-video",
    });
    if (!guard.ok) {
      if (guard.message) setErrorMessage(guard.message);
      generationSubmitLockRef.current = false;
      setIsSubmittingGeneration(false);
      return;
    }

    setErrorMessage("");
    setResultUrl(null);
    setStatusMessage("Submitting to Veo…");
    beginVideoGeneration();

    try {
      const body: Record<string, unknown> = {
        tier,
        prompt: prompt.trim() + claritySuffix,
        aspectRatio: aspect,
        resolution,
        durationSeconds: duration,
        generateAudio: audio,
      };
      if (negativePrompt.trim()) body.negativePrompt = negativePrompt.trim();

      if (mode === "i2v" || mode === "frames") {
        body.startImageUrl = startUrl;
        if (mode === "frames") body.endImageUrl = endUrl;
      }
      if (mode === "reference") body.referenceImageUrls = refUrls;
      if (mode === "extend") body.extendVideoUrl = extendUrl;

      const res = await fetch("/api/cinematic-video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.operationName || !data?.generationId) {
        const msg =
          (data && (data.error as string)) ||
          (res.status === 402
            ? "Insufficient credits."
            : "Generation failed.");
        throw new Error(msg);
      }

      generationSubmitLockRef.current = false;
      setIsSubmittingGeneration(false);
      setStatusMessage("Rendering… this usually takes 1–6 minutes.");

      const operationName = data.operationName as string;
      const model = data.model as string;
      const generationId = data.generationId as string;

      // ── Polling loop ──────────────────────────────────────────────
      let attempts = 0;
      const MAX_ATTEMPTS = 60; // ~10 minutes at 10s intervals
      while (attempts < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 10_000));
        attempts++;
        const sres = await fetch("/api/cinematic-video/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operationName, model, generationId }),
        });
        const sdata = await sres.json().catch(() => null);
        if (!sres.ok) {
          throw new Error(sdata?.error || "Polling failed.");
        }
        if (sdata?.done) {
          if (sdata.status === "completed" && sdata.mediaUrl) {
            setResultUrl(sdata.mediaUrl as string);
            setStatusMessage("");
            return;
          }
          throw new Error(sdata?.error || "Generation finished without output.");
        }
        setStatusMessage(
          `Rendering… (${attempts * 10}s elapsed of Veo runtime)`,
        );
      }
      throw new Error("Generation timed out.");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      generationSubmitLockRef.current = false;
      setIsSubmittingGeneration(false);
      finishVideoGeneration();
      if (activeGenerationCountRef.current === 0) setStatusMessage("");
    }
  }, [
    gate,
    cost,
    isReadyForMode,
    beginVideoGeneration,
    finishVideoGeneration,
    tier,
    prompt,
    claritySuffix,
    negativePrompt,
    aspect,
    resolution,
    duration,
    audio,
    mode,
    startUrl,
    endUrl,
    refUrls,
    extendUrl,
  ]);

  // ── Reset mode uploads when mode changes ────────────────────────────
  useEffect(() => {
    setErrorMessage("");
  }, [mode]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* ─── Cinematic backdrop ─── */}
      <CinematicBackdrop />

      <div className="relative mx-auto max-w-[1500px] px-4 pb-24 pt-8 md:px-6">
        <Header />

        <div className="mt-8 grid gap-6 xl:grid-cols-[260px_1fr_1.05fr]">
          {/* ──────────────── PRESETS SIDEBAR ──────────────── */}
          <PresetsSidebar onPick={applyPreset} />
          {/* ──────────────── LEFT — Controls ──────────────── */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* Mode selector */}
            <motion.div variants={fade}>
              <SectionLabel num="01" label="Capture mode" />
              <div className="mt-3 grid grid-cols-5 gap-1.5 rounded-2xl border border-white/10 bg-black/40 p-1.5 backdrop-blur">
                {MODES.map((m) => {
                  const active = m.id === mode;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setMode(m.id)}
                      className={`relative flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-xs font-semibold transition-colors ${
                        active
                          ? "text-amber-200"
                          : "text-slate-500 hover:text-slate-200"
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="mode-active"
                          className="absolute inset-0 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/10 ring-1 ring-amber-400/40"
                          transition={{
                            type: "spring",
                            stiffness: 380,
                            damping: 30,
                          }}
                        />
                      )}
                      <m.icon className="relative z-10 h-4 w-4" />
                      <span className="relative z-10 leading-none">
                        {m.shortLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {MODES.find((m) => m.id === mode)?.description}
              </p>
            </motion.div>


            {/* Mode-specific uploads */}
            <AnimatePresence mode="wait">
              {mode !== "t2v" && (
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <SectionLabel num="02" label="Reference media" />
                  <div className="mt-3 space-y-3">
                    {(mode === "i2v" || mode === "frames") && (
                      <ImageSlot
                        label={mode === "i2v" ? "Starting image" : "First frame"}
                        url={startUrl}
                        onPick={(f) => handleSingleUpload(f, "start")}
                        onClear={() => setStartUrl(null)}
                      />
                    )}
                    {mode === "frames" && (
                      <ImageSlot
                        label="Last frame"
                        url={endUrl}
                        onPick={(f) => handleSingleUpload(f, "end")}
                        onClear={() => setEndUrl(null)}
                      />
                    )}
                    {mode === "reference" && (
                      <>
                        <p className="rounded-lg border border-amber-400/20 bg-amber-400/[0.04] px-3 py-2 text-[11px] leading-5 text-amber-200/80">
                          Upload 1–3 images of <b>the same character</b>{" "}
                          (different angles work best) — Veo locks the
                          appearance across the whole shot. Also works for a
                          product or pet.
                        </p>
                        <RefImagesSlot
                          urls={refUrls}
                          onPick={handleRefUpload}
                          onRemove={(i) =>
                            setRefUrls((prev) => prev.filter((_, idx) => idx !== i))
                          }
                        />
                      </>
                    )}
                    {mode === "extend" && (
                      <VideoSlot
                        url={extendUrl}
                        onPick={(f) => handleSingleUpload(f, "extend")}
                        onClear={() => setExtendUrl(null)}
                      />
                    )}
                    {uploading && (
                      <div className="flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-xs text-amber-200">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Uploading reference…
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Format & Quality (always visible) */}
            <motion.div variants={fade}>
              <SectionLabel
                num={mode === "t2v" ? "03" : "04"}
                label="Format & quality"
              />

              <div className="mt-3 grid gap-3 rounded-2xl border border-white/10 bg-black/40 p-4">
                {/* Aspect ratio */}
                <Field label="Aspect ratio">
                  <div className="grid grid-cols-2 gap-2">
                    <AspectButton
                      icon={RectangleHorizontal}
                      label="16:9 Widescreen"
                      sub="Cinema / desktop"
                      active={aspect === "16:9"}
                      onClick={() => setAspect("16:9")}
                    />
                    <AspectButton
                      icon={RectangleVertical}
                      label="9:16 Vertical"
                      sub="Reels / TikTok"
                      active={aspect === "9:16"}
                      onClick={() => setAspect("9:16")}
                    />
                  </div>
                </Field>

                {/* Quality preset — 4 tiers matching Google's 720p / 1080p / 4K */}
                <Field
                  label="Quality"
                  right={
                    <span className="text-[10px] font-mono text-slate-500">
                      {resolution.toUpperCase()}
                    </span>
                  }
                >
                  <div className="grid grid-cols-4 gap-1.5">
                    {(
                      [
                        {
                          id: "draft",
                          label: "Draft",
                          sub: "720p · Lite",
                          icon: Zap,
                          // Lite doesn't support extension — disable Draft in extend mode
                          disabled: mode === "extend",
                        },
                        {
                          id: "standard",
                          label: "Standard",
                          sub: "720p · Fast",
                          icon: Gauge,
                          disabled: false,
                        },
                        {
                          id: "ultra",
                          label: "Ultra",
                          sub: "1080p · Pro",
                          icon: Diamond,
                          disabled: lockTo720pBecauseExtend,
                        },
                        {
                          id: "max",
                          label: "Max",
                          sub: "4K · Pro",
                          icon: Crown,
                          disabled: lockTo720pBecauseExtend,
                        },
                      ] as const
                    ).map((q) => {
                      const active = q.id === quality;
                      const disabled = q.disabled;
                      return (
                        <button
                          key={q.id}
                          onClick={() => !disabled && applyQuality(q.id)}
                          disabled={disabled}
                          className={`relative rounded-lg border px-2 py-2 text-left transition-all ${
                            active
                              ? "border-amber-400/50 bg-amber-400/10"
                              : disabled
                              ? "border-white/5 bg-black/20 opacity-40"
                              : "border-white/10 bg-black/30 hover:border-white/20"
                          }`}
                        >
                          <q.icon
                            className={`h-3.5 w-3.5 ${
                              active ? "text-amber-300" : "text-slate-400"
                            }`}
                          />
                          <div
                            className={`mt-1 text-xs font-bold ${
                              active ? "text-amber-100" : "text-slate-200"
                            }`}
                          >
                            {q.label}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {q.sub}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {lockTo720pBecauseExtend && (
                    <p className="mt-1.5 text-[10px] text-amber-200/70">
                      Extend mode is 720p only (Google requirement).
                    </p>
                  )}
                </Field>

                {/* Duration — Google supports only 4, 6, 8 seconds */}
                <Field
                  label="Duration"
                  right={
                    <span className="font-mono text-xs font-bold text-amber-300">
                      {duration}s
                    </span>
                  }
                >
                  <div className="grid grid-cols-3 gap-1.5">
                    {[4, 6, 8].map((s) => {
                      const active = s === duration;
                      const disabled = lockDurationTo8 && s !== 8;
                      return (
                        <button
                          key={s}
                          onClick={() => !disabled && setDuration(s)}
                          disabled={disabled}
                          className={`relative rounded-lg border px-2 py-2 text-center transition-all ${
                            active
                              ? "border-amber-400/50 bg-amber-400/10"
                              : disabled
                              ? "border-white/5 bg-black/20 opacity-40"
                              : "border-white/10 bg-black/30 hover:border-white/20"
                          }`}
                        >
                          <Clock
                            className={`mx-auto h-3.5 w-3.5 ${
                              active ? "text-amber-300" : "text-slate-400"
                            }`}
                          />
                          <div
                            className={`mt-1 text-xs font-bold ${
                              active ? "text-amber-100" : "text-slate-200"
                            }`}
                          >
                            {s}s
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {lockDurationTo8 && (
                    <p className="mt-1.5 text-[10px] text-amber-200/70">
                      {mode === "reference"
                        ? "Reference images require 8s (Google requirement)."
                        : mode === "extend"
                        ? "Extension adds +7s clips (Google requirement)."
                        : "1080p and 4K require 8s (Google requirement)."}
                    </p>
                  )}
                </Field>

                {/* Output Clarity — 4 explicit options (injects detail cues into prompt) */}
                <Field
                  label="Output clarity"
                  right={
                    <span className="font-mono text-xs font-bold text-amber-300">
                      {clarityLabel}
                    </span>
                  }
                >
                  <div className="grid grid-cols-4 gap-1.5">
                    {(
                      [
                        { id: 0, label: "Off", sub: "Raw" },
                        { id: 1, label: "Natural", sub: "Soft" },
                        { id: 2, label: "Detailed", sub: "Sharp" },
                        { id: 3, label: "Hyper", sub: "8K cues" },
                      ] as const
                    ).map((c) => {
                      const active = c.id === clarity;
                      return (
                        <button
                          key={c.id}
                          onClick={() => setClarity(c.id)}
                          className={`relative rounded-lg border px-2 py-2 text-center transition-all ${
                            active
                              ? "border-amber-400/50 bg-amber-400/10"
                              : "border-white/10 bg-black/30 hover:border-white/20"
                          }`}
                        >
                          <Eye
                            className={`mx-auto h-3.5 w-3.5 ${
                              active ? "text-amber-300" : "text-slate-400"
                            }`}
                          />
                          <div
                            className={`mt-1 text-[11px] font-bold ${
                              active ? "text-amber-100" : "text-slate-200"
                            }`}
                          >
                            {c.label}
                          </div>
                          <div className="text-[9px] text-slate-500">
                            {c.sub}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 text-[10px] text-slate-500">
                    Adds detail cues to the prompt (Veo API has no native
                    clarity parameter).
                  </p>
                </Field>

                {/* Audio */}
                <Field label="Native audio">
                  <button
                    onClick={() => setAudio((v) => !v)}
                    className={`inline-flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                      audio
                        ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
                        : "border-white/10 bg-black/40 text-slate-400"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {audio ? (
                        <Volume2 className="h-3.5 w-3.5" />
                      ) : (
                        <VolumeX className="h-3.5 w-3.5" />
                      )}
                      {audio
                        ? "Dialogue + SFX + music"
                        : "Silent (no audio)"}
                    </span>
                    <span className="rounded-md bg-black/30 px-1.5 py-0.5 text-[9px] font-bold">
                      {audio ? "ON" : "OFF"}
                    </span>
                  </button>
                </Field>
              </div>
            </motion.div>

            {/* Prompt */}
            <motion.div variants={fade}>
              <div className="flex items-center justify-between">
                <SectionLabel
                  num={mode === "t2v" ? "04" : "05"}
                  label="Direction"
                />
              </div>

              {/* Example chips */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {PROMPT_EXAMPLES.map((ex) => (
                  <button
                    key={ex.label}
                    onClick={() => setPrompt(ex.prompt)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:border-amber-400/40 hover:text-amber-200"
                  >
                    <ex.icon className="h-3 w-3" />
                    {ex.label}
                  </button>
                ))}
              </div>

              <div className="relative mt-3">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={5}
                  placeholder='Describe the shot. For dialogue, wrap lines in quotes — e.g. A man whispers, "We need to leave now."'
                  className="w-full resize-none rounded-2xl border border-white/10 bg-black/50 px-4 py-3 pr-12 font-mono text-sm text-slate-100 placeholder-slate-600 outline-none ring-amber-400/0 transition-all focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/20"
                />

                {/* Magic Wand button */}
                <button
                  onClick={handleEnhance}
                  disabled={enhancing || prompt.trim().length < 3}
                  title="Enhance with Gemini — adds camera, lighting, mood"
                  className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-lg bg-gradient-to-br from-amber-300 to-orange-500 px-2 py-1.5 text-[10px] font-black uppercase tracking-wider text-black shadow-md shadow-amber-500/30 transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {enhancing ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  {enhancing ? "Enhancing" : "Enhance"}
                </button>

                <div className="absolute bottom-2 right-3 text-[10px] font-mono text-slate-600">
                  {prompt.length} chars
                </div>
              </div>

              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
                <Quote className="h-3 w-3" />
                Veo 3.1 generates native audio. Use quotes for dialogue.
              </p>
            </motion.div>

            {/* Advanced — negative prompt only (everything else is exposed above) */}
            <motion.div variants={fade}>
              <button
                onClick={() => setShowAdvanced((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition-colors hover:text-slate-200"
              >
                <Settings2 className="h-3.5 w-3.5" />
                {showAdvanced ? "Hide" : "Show"} negative prompt
                <ChevronRight
                  className={`h-3 w-3 transition-transform ${
                    showAdvanced ? "rotate-90" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 rounded-2xl border border-white/10 bg-black/40 p-4">
                      <Field label="Negative prompt (what to avoid)">
                        <input
                          type="text"
                          value={negativePrompt}
                          onChange={(e) => setNegativePrompt(e.target.value)}
                          placeholder="blurry, low-quality, distorted faces…"
                          className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs text-slate-200 outline-none focus:border-amber-400/40"
                        />
                      </Field>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Generate button */}
            <motion.div variants={fade}>
              <div className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/[0.06] to-black/40 p-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200/70">
                      Estimated cost
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-3xl font-black text-white">
                        {cost}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">
                        credits
                      </span>
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-500">
                      {TIERS.find((t) => t.id === tier)!.rate} c/sec × {duration}s
                    </div>
                  </div>
                  <button
                    onClick={handleGenerate}
                    disabled={!isReadyForMode || isSubmittingGeneration || uploading}
                    className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 px-6 py-3 text-sm font-black text-black shadow-lg shadow-amber-500/30 transition-all hover:shadow-amber-500/50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmittingGeneration ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : isGenerating ? (
                      <>
                        <Film className="h-4 w-4" />
                        Queue another
                      </>
                    ) : (
                      <>
                        <Film className="h-4 w-4" />
                        Action
                      </>
                    )}
                    <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  </button>
                </div>

                {!isReadyForMode && !isGenerating && (
                  <p className="mt-2 text-[11px] text-slate-500">
                    {prompt.trim().length < 4
                      ? "Write a direction (min 4 chars)."
                      : mode === "i2v"
                      ? "Upload a starting image."
                      : mode === "frames"
                      ? "Upload first and last frames."
                      : mode === "reference"
                      ? "Add at least one character reference image."
                      : mode === "extend"
                      ? "Upload a clip to extend."
                      : ""}
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>

          {/* ──────────────── RIGHT — Viewer ──────────────── */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:sticky lg:top-24 lg:self-start"
          >
            <Viewer
              aspect={aspect}
              isGenerating={isGenerating}
              statusMessage={statusMessage}
              errorMessage={errorMessage}
              resultUrl={resultUrl}
              muted={muted}
              setMuted={setMuted}
              elapsed={elapsed}
              copied={copied}
              setCopied={setCopied}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
/* Sub-components                                                          */
/* ─────────────────────────────────────────────────────────────────────── */

function CinematicBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Deep cinema black gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-[#0a0612] to-black" />
      {/* Warm key light */}
      <div className="absolute -left-32 top-0 h-[600px] w-[600px] rounded-full bg-amber-600/[0.07] blur-[120px]" />
      {/* Cool back light */}
      <div className="absolute -right-40 top-40 h-[700px] w-[700px] rounded-full bg-violet-700/[0.06] blur-[120px]" />
      {/* Floor lamp */}
      <div className="absolute bottom-0 left-1/2 h-[300px] w-[800px] -translate-x-1/2 rounded-full bg-orange-500/[0.04] blur-[100px]" />
      {/* Film grain (faint) */}
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}

function Header() {
  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/[0.05] px-3 py-1">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inset-0 animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-200">
          Cinema · Powered by Google Veo 3.1
        </span>
      </div>
      <h1 className="font-serif text-4xl font-black leading-[0.95] tracking-tight text-white md:text-6xl">
        Cinematic{" "}
        <span className="bg-gradient-to-br from-amber-200 via-amber-400 to-orange-500 bg-clip-text italic text-transparent">
          Video Studio
        </span>
      </h1>
      <p className="max-w-2xl text-sm leading-7 text-slate-400 md:text-base">
        Direct the next shot with the full power of Veo 3.1 — native dialogue,
        synchronized audio, first/last frame control, character references, and
        clip extension. One model. Five capture modes.
      </p>
    </div>
  );
}

/* ─── Presets Sidebar ─────────────────────────────────────────────────── */

function PresetsSidebar({ onPick }: { onPick: (p: Preset) => void }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    if (!query.trim()) return PRESETS;
    const q = query.toLowerCase();
    return PRESETS.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.prompt.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <aside className="xl:sticky xl:top-24 xl:self-start">
      <div className="rounded-3xl border border-white/10 bg-black/40 p-3 backdrop-blur">
        <div className="mb-3 flex items-center justify-between px-1">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200/70">
              Presets
            </div>
            <h3 className="font-serif text-base italic text-white">
              Cinematic library
            </h3>
          </div>
          <span className="rounded-md bg-white/5 px-2 py-1 text-[10px] font-mono text-slate-400">
            {filtered.length}
          </span>
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="mb-3 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-amber-400/40"
        />

        <div className="grid max-h-[640px] grid-cols-2 gap-2 overflow-y-auto pr-1 xl:grid-cols-1">
          {filtered.map((p) => (
            <PresetCard key={p.id} preset={p} onPick={onPick} />
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full px-2 py-6 text-center text-xs text-slate-500">
              No presets match.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}

function PresetCard({
  preset,
  onPick,
}: {
  preset: Preset;
  onPick: (p: Preset) => void;
}) {
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const posterUrl = supaUrl
    ? `${supaUrl}/storage/v1/object/public/thumbnails/system-presets/${preset.id}.png`
    : "";
  const videoUrl = supaUrl
    ? `${supaUrl}/storage/v1/object/public/videos/system-presets/${preset.id}.mp4`
    : "";

  const [posterOk, setPosterOk] = useState<boolean>(!!posterUrl);
  const [videoOk, setVideoOk] = useState<boolean>(!!videoUrl);
  const videoRef = useRef<HTMLVideoElement>(null);

  const onEnter = () => {
    if (videoRef.current && videoOk) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };
  const onLeave = () => {
    if (videoRef.current) videoRef.current.pause();
  };

  return (
    <button
      onClick={() => onPick(preset)}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/30 text-left transition-all hover:border-amber-400/40 hover:shadow-lg hover:shadow-amber-500/10"
    >
      {/* Thumbnail container */}
      <div className="relative h-20 w-full overflow-hidden xl:h-24">
        {/* Fallback gradient (shown when poster fails) */}
        {!posterOk && (
          <div
            className={`absolute inset-0 bg-gradient-to-br ${preset.accent}`}
          >
            <div
              className="absolute inset-0 opacity-30 mix-blend-overlay"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
              }}
            />
          </div>
        )}

        {/* Real poster from Imagen 4 */}
        {posterOk && posterUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterUrl}
            alt={preset.title}
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setPosterOk(false)}
            loading="lazy"
          />
        )}

        {/* Real Veo video on hover */}
        {videoOk && videoUrl && (
          <video
            ref={videoRef}
            src={videoUrl}
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            muted
            loop
            playsInline
            preload="none"
            onError={() => setVideoOk(false)}
          />
        )}

        {/* Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Icon */}
        <div className="absolute right-2 top-2">
          <preset.icon className="h-4 w-4 text-white/90 drop-shadow" />
        </div>

        {/* Quality badge */}
        {preset.quality && (
          <div className="absolute left-2 top-2">
            <span className="rounded bg-black/50 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white/90 ring-1 ring-white/10 backdrop-blur">
              {preset.quality}
            </span>
          </div>
        )}
      </div>

      {/* Title */}
      <div className="p-2">
        <div className="text-[11px] font-bold leading-tight text-white group-hover:text-amber-100">
          {preset.title}
        </div>
        <div className="mt-0.5 text-[9px] uppercase tracking-wider text-slate-500">
          {preset.category}
        </div>
      </div>

      {/* Apply overlay */}
      <div className="pointer-events-none absolute inset-x-0 bottom-9 flex justify-center">
        <span className="rounded-full bg-amber-400 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-black opacity-0 transition-opacity group-hover:opacity-100">
          Apply
        </span>
      </div>
    </button>
  );
}

function SectionLabel({ num, label }: { num: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] font-bold tracking-wider text-amber-400/60">
        {num}
      </span>
      <div className="h-px flex-1 bg-gradient-to-r from-amber-400/30 via-white/5 to-transparent" />
      <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
        {label}
      </span>
    </div>
  );
}

function Field({
  label,
  right,
  children,
}: {
  label: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </span>
        {right}
      </div>
      {children}
    </div>
  );
}

function AspectButton({
  icon: Icon,
  label,
  sub,
  active,
  onClick,
}: {
  icon: typeof RectangleHorizontal;
  label: string;
  sub: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all ${
        active
          ? "border-amber-400/50 bg-amber-400/10"
          : "border-white/10 bg-black/30 hover:border-white/20"
      }`}
    >
      <Icon
        className={`h-5 w-5 flex-shrink-0 ${
          active ? "text-amber-300" : "text-slate-400"
        }`}
      />
      <div>
        <div
          className={`text-xs font-bold ${
            active ? "text-amber-100" : "text-slate-200"
          }`}
        >
          {label}
        </div>
        <div className="text-[10px] text-slate-500">{sub}</div>
      </div>
    </button>
  );
}

function ToggleGroup({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
              active
                ? "border-amber-400/50 bg-amber-400/10 text-amber-200"
                : "border-white/10 bg-black/40 text-slate-400 hover:text-slate-200"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function ImageSlot({
  label,
  url,
  onPick,
  onClear,
}: {
  label: string;
  url: string | null;
  onPick: (f: File) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div className="flex items-center gap-3">
        {url ? (
          <div className="relative h-20 w-32 overflow-hidden rounded-lg border border-amber-400/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={label} className="h-full w-full object-cover" />
            <button
              onClick={onClear}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => ref.current?.click()}
            className="flex h-20 w-32 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/15 bg-black/30 text-[10px] font-semibold text-slate-500 transition-colors hover:border-amber-400/40 hover:text-amber-200"
          >
            <Plus className="h-4 w-4" />
            Upload
          </button>
        )}
        <input
          ref={ref}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPick(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

function VideoSlot({
  url,
  onPick,
  onClear,
}: {
  url: string | null;
  onPick: (f: File) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Clip to extend (mp4)
      </div>
      {url ? (
        <div className="relative overflow-hidden rounded-lg border border-amber-400/30">
          <video src={url} className="h-32 w-full object-cover" muted />
          <button
            onClick={onClear}
            className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => ref.current?.click()}
          className="flex h-32 w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/15 bg-black/30 text-[11px] font-semibold text-slate-500 transition-colors hover:border-amber-400/40 hover:text-amber-200"
        >
          <Plus className="h-5 w-5" />
          Upload mp4
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept="video/mp4,video/quicktime"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function RefImagesSlot({
  urls,
  onPick,
  onRemove,
}: {
  urls: string[];
  onPick: (files: FileList | null) => void;
  onRemove: (i: number) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Character refs ({urls.length}/3)
        </span>
        <span className="text-[10px] text-slate-500">
          Person · character · product
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => {
          const u = urls[i];
          if (u) {
            return (
              <div
                key={i}
                className="relative h-24 overflow-hidden rounded-lg border border-amber-400/30"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt={`ref-${i}`} className="h-full w-full object-cover" />
                <button
                  onClick={() => onRemove(i)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          }
          return (
            <button
              key={i}
              onClick={() => ref.current?.click()}
              className="flex h-24 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-white/15 bg-black/30 text-[10px] font-semibold text-slate-500 transition-colors hover:border-amber-400/40 hover:text-amber-200"
            >
              <Plus className="h-4 w-4" />
              Slot {i + 1}
            </button>
          );
        })}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          onPick(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function Viewer({
  aspect,
  isGenerating,
  statusMessage,
  errorMessage,
  resultUrl,
  muted,
  setMuted,
  elapsed,
  copied,
  setCopied,
}: {
  aspect: Aspect;
  isGenerating: boolean;
  statusMessage: string;
  errorMessage: string;
  resultUrl: string | null;
  muted: boolean;
  setMuted: (v: boolean | ((v: boolean) => boolean)) => void;
  elapsed: number;
  copied: boolean;
  setCopied: (v: boolean) => void;
}) {
  const aspectStyle: React.CSSProperties =
    aspect === "16:9" ? { aspectRatio: "16 / 9" } : { aspectRatio: "9 / 16" };

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-black via-[#0a0612] to-black p-1.5 shadow-2xl shadow-black/60">
      <div className="relative">
        {/* Letterbox frame */}
        <div className="rounded-2xl bg-black p-2">
          <div className="relative mx-auto w-full" style={aspectStyle}>
            <div className="absolute inset-0 overflow-hidden rounded-xl">
              {/* States */}
              {!resultUrl && !isGenerating && !errorMessage && (
                <EmptyViewer />
              )}
              {isGenerating && (
                <RenderingViewer
                  status={statusMessage}
                  elapsed={elapsed}
                />
              )}
              {errorMessage && !isGenerating && (
                <ErrorViewer message={errorMessage} />
              )}
              {resultUrl && !isGenerating && (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video
                  key={resultUrl}
                  src={resultUrl}
                  className="h-full w-full object-cover"
                  autoPlay
                  loop
                  playsInline
                  controls
                  muted={muted}
                />
              )}
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-3">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-500">
            <Film className="h-3 w-3" />
            {aspect} · Veo 3.1
          </div>
          <div className="flex items-center gap-1.5">
            {resultUrl && (
              <>
                <button
                  onClick={() => setMuted((v) => !v)}
                  className="rounded-lg border border-white/10 bg-black/40 p-2 text-slate-300 hover:text-white"
                  title={muted ? "Unmute" : "Mute"}
                >
                  {muted ? (
                    <VolumeX className="h-3.5 w-3.5" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  onClick={() => {
                    if (!resultUrl) return;
                    navigator.clipboard.writeText(resultUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="rounded-lg border border-white/10 bg-black/40 p-2 text-slate-300 hover:text-white"
                  title="Copy URL"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
                <a
                  href={resultUrl}
                  download
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-2 text-[11px] font-bold text-black hover:bg-amber-300"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyViewer() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-black via-[#0c0816] to-black">
      <div className="relative">
        <div className="absolute inset-0 animate-pulse rounded-full bg-amber-400/20 blur-2xl" />
        <Film className="relative h-12 w-12 text-amber-300/40" />
      </div>
      <p className="mt-4 font-serif text-lg italic text-slate-400">
        Awaiting direction
      </p>
      <p className="mt-1 text-xs text-slate-600">
        Your shot will render here.
      </p>
    </div>
  );
}

function RenderingViewer({
  status,
  elapsed,
}: {
  status: string;
  elapsed: number;
}) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-black">
      {/* Scanning bars */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          animate={{ y: ["0%", "100%"] }}
          transition={{
            duration: 2.4,
            ease: "linear",
            repeat: Infinity,
          }}
          className="absolute inset-x-0 h-32 bg-gradient-to-b from-transparent via-amber-400/15 to-transparent"
        />
      </div>

      {/* Film perforations */}
      <div className="absolute left-2 top-0 bottom-0 flex flex-col justify-around">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-3 w-3 rounded-sm border border-white/10 bg-white/[0.03]"
          />
        ))}
      </div>
      <div className="absolute right-2 top-0 bottom-0 flex flex-col justify-around">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-3 w-3 rounded-sm border border-white/10 bg-white/[0.03]"
          />
        ))}
      </div>

      <div className="relative text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-amber-300" />
        <p className="mt-4 font-serif text-2xl italic text-amber-200">
          Rolling…
        </p>
        <p className="mt-2 text-xs text-slate-400">
          {status || "Rendering frame by frame"}
        </p>
        <div className="mt-4 font-mono text-[10px] text-slate-500">
          {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}{" "}
          elapsed
        </div>
      </div>
    </div>
  );
}

function ErrorViewer({ message }: { message: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-red-950/40 via-black to-black p-6 text-center">
      <AlertTriangle className="h-10 w-10 text-red-400" />
      <p className="mt-4 font-serif text-lg italic text-red-200">Cut!</p>
      <p className="mt-2 max-w-md text-xs text-red-300/80">{message}</p>
    </div>
  );
}
