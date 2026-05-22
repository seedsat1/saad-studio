"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Film, 
  Sparkles, 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  UserCheck, 
  Camera, 
  Plus, 
  Sliders,
  Mic,
  ChevronDown,
  X,
  MessageSquare
} from "lucide-react";
import { VIDEO_MODEL_REGISTRY, type WaveSpeedVideoModel } from "@/lib/video-model-registry";
import { getVideoCreditsByRoute } from "@/lib/credit-pricing";

// Extensive casting characters database
const INITIAL_CASTING_CHARACTERS = [
  { 
    id: "char_1", 
    name: "Marwan the Narrator", 
    tagline: "Sharp anxiety & mysterious dramatic features", 
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=250&auto=format&fit=crop",
    style: "A young man with a dark leather coat and features overflowing with elegant, sharp anxiety",
    voice: "Gulf Male Narrator",
    voiceId: "pNInz6obpgDQGcFmaJgB",
    gender: "male"
  },
  { 
    id: "char_2", 
    name: "Kamal the Wise", 
    tagline: "Prestige, dignity & depth of long years", 
    url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=250&auto=format&fit=crop",
    style: "A seventy-year-old man with a silver beard and authentic cloak telling ancient tales of human heritage",
    voice: "Documentary Narrator",
    voiceId: "DGTOOUoGpoP6UZ9uSWfA",
    gender: "senior"
  },
  { 
    id: "char_3", 
    name: "Layla the Legendary", 
    tagline: "Smart, piercing tone & dreamy eyes", 
    url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=250&auto=format&fit=crop",
    style: "A young woman with long black hair and classic oriental features wearing vintage gilded jewelry from the golden era of storytelling",
    voice: "Arabic Classical Female",
    voiceId: "Z3R5wn05IrDiVCyEkUrK",
    gender: "female"
  },
  { 
    id: "char_4", 
    name: "Youssef the Farmer", 
    tagline: "Simplicity of the good earth & sweat of struggle", 
    url: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=250&auto=format&fit=crop",
    style: "Warm brown skin weathered by the sun with a simple rustic attire and a patient smile",
    voice: "Egyptian Male Storyteller",
    voiceId: "nPczCjzI2devNBz1zQrb",
    gender: "male"
  },
  { 
    id: "char_5", 
    name: "Amira Soliman (Journalist)", 
    tagline: "Iron will & relentless pursuit of truth", 
    url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=250&auto=format&fit=crop",
    style: "A young woman wearing a sandy protective vest, carrying a notebook and a pen of sharp words with steadfast gaze",
    voice: "Classic Confident Female",
    voiceId: "21m00Tcm4TlvDq8ikWAM",
    gender: "female"
  },
  { 
    id: "char_6", 
    name: "Sakhr the Bedouin", 
    tagline: "Red keffiyeh & silent hawk-like eyes", 
    url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=250&auto=format&fit=crop",
    style: "A Bedouin man with a dark red keffiyeh, a sharp hawk-like gaze, and a scarf wrapped with wild prestige",
    voice: "Deep Trailer Male",
    voiceId: "N2lVS1w4EtoT3dr4eOWO",
    gender: "male"
  },
  { 
    id: "char_7", 
    name: "Hoda the Teacher", 
    tagline: "Comforting, gentle features & soothing kindness", 
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=250&auto=format&fit=crop",
    style: "A teacher wearing delicate prescription glasses and relaxed soft features radiating immense warmth",
    voice: "Arabic Classical Female",
    voiceId: "Z3R5wn05IrDiVCyEkUrK",
    gender: "female"
  },
  { 
    id: "char_8", 
    name: "Ramy the Cyber Engineer", 
    tagline: "Futuristic reflections & digital neon lights", 
    url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=250&auto=format&fit=crop",
    style: "A visionary tech innovator surrounded by immersive screens, blue neon lights, and a state-of-the-art cyber jacket",
    voice: "Levantine Male Dialogue",
    voiceId: "onwK4e9ZLuTAKqWW03F9",
    gender: "cyber"
  },
  { 
    id: "char_9", 
    name: "Sohaib the Guard", 
    tagline: "Silent power & guardian of the gate", 
    url: "https://images.unsplash.com/photo-1506803682981-6e718a9dd3ee?q=80&w=250&auto=format&fit=crop",
    style: "A strong, majestic figure with features veiled in a dark cloak, sharp silent piercing eyes, and unwavering resolve",
    voice: "Documentary Narrator",
    voiceId: "DGTOOUoGpoP6UZ9uSWfA",
    gender: "senior"
  }
];

// High-fidelity lens types with images and camera technicalities
const AVAILABLE_LENSES = [
  {
    id: "85mm Anamorphic Cinema",
    name: "85mm Anamorphic Cinema",
    arabicName: "85mm Anamorphic Lens (Drama & Depth)",
    tStop: "T1.5 Cine-Prime",
    description: "Dreamy focus and striking lateral distortion with classic horizontal blue flares that masterfully isolate the protagonist.",
    url: "https://images.unsplash.com/photo-1617005080133-c15b1a7c5b62?q=80&w=250&auto=format&fit=crop",
    lensCategory: "Cinema Pro Prime"
  },
  {
    id: "50mm Leica Noctilux Vintage",
    name: "50mm Leica Noctilux Vintage",
    arabicName: "Leica Noctilux 50mm Lens (T0.95 Vintage)",
    tStop: "T0.95 Prime-Lux",
    description: "Warm, dreamy vintage bokeh with luxurious elliptical spotlighting that perfectly mimics 1980s cinematic and emotional close-ups.",
    url: "https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?q=80&w=250&auto=format&fit=crop",
    lensCategory: "Nocturnal Vintage"
  },
  {
    id: "35mm Street Documentary",
    name: "35mm Street Documentary",
    arabicName: "35mm Street Documentary Lens (Urban Beauty)",
    tStop: "T2.0 Snap-Prime",
    description: "Medium-wide field of view that subtly blends characters with raw streets, historical architecture, and rainy vintage ambiance.",
    url: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=250&auto=format&fit=crop",
    lensCategory: "Street Narrative"
  },
  {
    id: "50mm Prime Portrait",
    name: "50mm Prime Portrait",
    arabicName: "50mm Prime Portrait Lens (Human Eye Mockup)",
    tStop: "T1.2 Super-Fast",
    description: "The standard lens that perfectly replicates the field of view of the human eye, offering stunning intimacy and warp-free realism.",
    url: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=250&auto=format&fit=crop",
    lensCategory: "Standard Human Eye"
  },
  {
    id: "100mm Macro Cine-Tessar",
    name: "100mm Macro Cine-Tessar",
    arabicName: "100mm Macro Cine-Tessar (Detail Close-up)",
    tStop: "T2.0 Super-Macro",
    description: "Extreme close-up capability, revealing fine skin textures and teardrops under rain, highlighting deep emotional micro-expressions.",
    url: "https://images.unsplash.com/photo-1511556532299-8f662fc26c06?q=80&w=250&auto=format&fit=crop",
    lensCategory: "Super Macro Detail"
  },
  {
    id: "24mm Ultra Wide Angle Shot",
    name: "24mm Ultra Wide Angle Shot",
    arabicName: "24mm Epic Ultra Wide Lens (Wide Angle Scale)",
    tStop: "T2.8 Architectural",
    description: "Expansive angle capturing the rich background environment and majestic landmarks, positioning the subject within a grand visual frame.",
    url: "https://images.unsplash.com/photo-1502224562085-639556652f33?q=80&w=250&auto=format&fit=crop",
    lensCategory: "Epic Sceneries"
  },
  {
    id: "18mm Super Wide Arri Signature",
    name: "18mm Super Wide Arri Signature",
    arabicName: "Arri Signature 18mm Lens (Colossal Angle)",
    tStop: "T1.8 Pro-Prime",
    description: "Stunning geological and ambient depth for ultra-wide outdoor shots, delivering an endless perspective of historical nature.",
    url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=250&auto=format&fit=crop",
    lensCategory: "Titan Wide-Angle"
  },
  {
    id: "45mm Dreamy Hawk Anamorphic",
    name: "45mm Dreamy Hawk Anamorphic",
    arabicName: "Hawk Anamorphic 45mm Lens (Dreamy Cinema)",
    tStop: "T1.5 Dream Anamorphic",
    description: "Delightful specular warmth, oval flare aberrations, and soft corners that evoke nostalgic sequences of memory or subconscious dreams.",
    url: "https://images.unsplash.com/photo-1528164344705-47542687000d?q=80&w=250&auto=format&fit=crop",
    lensCategory: "Ethereal Anamorphic"
  },
  {
    id: "70-200mm Professional Zoom",
    name: "70-200mm Professional Zoom",
    arabicName: "70-200mm Pro Zoom Lens (Isolation & Distance)",
    tStop: "T2.8 Telephoto Zoom",
    description: "Heavy compression that completely reduces the apparent distance between the subject and background, building dramatic tension.",
    url: "https://images.unsplash.com/photo-1452780212940-6f5c0d14d84a?q=80&w=250&auto=format&fit=crop",
    lensCategory: "Telephoto Isolation"
  },
  {
    id: "135mm Extreme Isolation Prime",
    name: "135mm Extreme Isolation Prime",
    arabicName: "Isolator 135mm Lens (Cold Separation)",
    tStop: "T2.0 Tele-Focus",
    description: "Razor-sharp focal isolation that detaches objects with surveillance-like coldness, perfect for tracking characters at a distance.",
    url: "https://images.unsplash.com/photo-1473163928189-364b2c4e1135?q=80&w=250&auto=format&fit=crop",
    lensCategory: "Surveillance Isolator"
  },
  {
    id: "12mm Extreme Fisheye",
    name: "12mm Extreme Fisheye",
    arabicName: "Fisheye 12mm Lens (Surrealism & Sci-Fi)",
    tStop: "T3.5 Creative Wide",
    description: "Highly curved wide-angle perspective capturing internal psychological states, anxiety, or paranoia with futuristic avant-garde flair.",
    url: "https://images.unsplash.com/photo-1495707902641-75cac588d2e9?q=80&w=250&auto=format&fit=crop",
    lensCategory: "Surrealist Eye"
  },
  {
    id: "58mm Helios-44 Vintage Cine",
    name: "58mm Helios-44 Vintage Cine",
    arabicName: "Helios 58mm Lens (Soviet Swirly Bokeh)",
    tStop: "T2.0 Soviet Prime",
    description: "Legendary circular swirly bokeh background, adding an inimitable organic and epic aesthetic to early cinema-inspired shorts.",
    url: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=250&auto=format&fit=crop",
    lensCategory: "Soviet Swirly Vintage"
  }
];

// Camera movement profiles with high-quality descriptions and visuals
const AVAILABLE_MOVEMENTS = [
  {
    id: "Dolly Zoom (Vertigo Effect)",
    name: "Dolly Zoom (Vertigo Effect)",
    arabicName: "Dolly Zoom (Vertigo Effect)",
    shutterCue: "Double Physics Active",
    description: "Camera tracks backward on rails while instantly zooming the lens in to warp background perspective and embody psychological shock.",
    url: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=250&auto=format&fit=crop",
    intensity: "Ideal for suspense & high tension"
  },
  {
    id: "360-degree dramatic orbit ring",
    name: "360-degree dramatic orbit ring",
    arabicName: "360-Degree Orbit Ring",
    shutterCue: "Spherical Tracking 360°",
    description: "Smooth, low-angle 360-degree rotation around the actor, revealing complete background geography and reflecting glowing neon highlights.",
    url: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=250&auto=format&fit=crop",
    intensity: "Ideal for epic & contemplative scenes"
  },
  {
    id: "Dutch angle slider tracking",
    name: "Dutch angle slider tracking",
    arabicName: "Dutch Angle Slider Tracking",
    shutterCue: "Dynamic Angle Bias 15°",
    description: "Horizontal tracking with a sharp 15-degree Dutch angle tilt, intensifying feelings of paranoia, psychological disturbance, and dramatic climax.",
    url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=250&auto=format&fit=crop",
    intensity: "Ideal for peaks of confusion & panic"
  },
  {
    id: "Slow Cinematic Pan Left",
    name: "Slow Cinematic Pan Left",
    arabicName: "Slow Cinematic Pan Left",
    shutterCue: "Fluid Pan 1.5 deg/s",
    description: "Ultra-smooth hydraulic left panning that slowly reveals the setting, tracking rainy streets or mysterious footprints with quiet dignity.",
    url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=250&auto=format&fit=crop",
    intensity: "Ideal for calm storytelling chapters"
  },
  {
    id: "Jib crane atmospheric boom",
    name: "Jib crane atmospheric boom",
    arabicName: "Jib Crane Atmospheric Boom",
    shutterCue: "Vertical Jib Crane Arm +15m",
    description: "Majestic vertical boom crane lift from extreme ground level to a towering height with high-fidelity dampening for a sweeping city overview.",
    url: "https://images.unsplash.com/photo-1527977966376-1c8408f9f108?q=80&w=250&auto=format&fit=crop",
    intensity: "Ideal for grand openings or narrative finales"
  },
  {
    id: "Crane Shot Moving Down",
    name: "Crane Shot Moving Down",
    arabicName: "Crane Shot Moving Down",
    shutterCue: "Vertical Crane Arm Lift",
    description: "Sweeping crane descend from height, framing the vulnerability or smallness of the subject relative to massive historic structures.",
    url: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=250&auto=format&fit=crop",
    intensity: "Ideal for epic transitions"
  },
  {
    id: "Fast dynamic whip pan",
    name: "Fast dynamic whip pan",
    arabicName: "Fast Dynamic Whip Pan",
    shutterCue: "Ultra-Fast Rotation 90°/s",
    description: "A sudden, lightning-fast kinetic swipe connecting the narrator with some unexpected background threat for a breathless shock.",
    url: "https://images.unsplash.com/photo-1542204172-e7052809a8a7?q=80&w=250&auto=format&fit=crop",
    intensity: "Ideal for shocking action or sudden shifts"
  },
  {
    id: "Steadycam Following Object",
    name: "Steadycam Following Object",
    arabicName: "Fluid Steadycam Track",
    shutterCue: "Manual Stabilizer Track",
    description: "Highly stabilized, body-mounted tracking following the protagonist closely, pulling the observer directly into the unfolding mystery.",
    url: "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=250&auto=format&fit=crop",
    intensity: "Ideal for continuous realistic follow-through"
  },
  {
    id: "Hyperlapse hyper-speed travel",
    name: "Hyperlapse hyper-speed travel",
    arabicName: "Hyperlapse Time Travel",
    shutterCue: "Temporal Warp 10x",
    description: "Warp-speed frame sequences showing clouds, traffic, and days flying by instantly while the protagonist remains perfectly static.",
    url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=250&auto=format&fit=crop",
    intensity: "Ideal for time skips or nostalgic reflection"
  },
  {
    id: "Drone High Angle Shot",
    name: "Drone High Angle Shot",
    arabicName: "Vertical Drone Orbit",
    shutterCue: "Aerodynamic Orbit Rig",
    description: "Bird's-eye view from high above, capturing complex geometric road networks, historical valleys, or reflecting streetlights.",
    url: "https://images.unsplash.com/photo-1527977966376-1c8408f9f108?q=80&w=250&auto=format&fit=crop",
    intensity: "Ideal for massive contextual scale"
  },
  {
    id: "Underground macro crawl",
    name: "Underground macro crawl",
    arabicName: "Underground Macro Crawl",
    shutterCue: "Ground Level Macro Rig",
    description: "Low-slung ground crawling shot sliding inches above rustic cobblestones, tracking flying autumn leaves, mud, or wet boots.",
    url: "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=250&auto=format&fit=crop",
    intensity: "Ideal for escape sequences & secrecy"
  },
  {
    id: "Handheld Shaky-Cam",
    name: "Handheld Shaky-Cam",
    arabicName: "Handheld Shaky-Cam (Documentary)",
    shutterCue: "Micro-vibration Physics",
    description: "Organic hand-operated camera jitters that create instant documentary realism and evoke intense immediacy.",
    url: "https://images.unsplash.com/photo-1542204172-e7052809a8a7?q=80&w=250&auto=format&fit=crop",
    intensity: "Ideal for realistic action and suspense"
  },
  {
    id: "First person realistic POV run",
    name: "First person realistic POV run",
    arabicName: "First Person POV Run",
    shutterCue: "Gimbals POV Run physics",
    description: "First-person subjective run mockup, pairing heavy breathing effects with realistic perspective bobbing to simulation action.",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=250&auto=format&fit=crop",
    intensity: "Ideal for racing pulses & chases"
  }
];

// Genres with dynamic artistic orb color styling representations
const AVAILABLE_GENRES = [
  { id: "Noir", arabicName: "Noir", desc: "Mysterious blend of heavy shadows, rainy nights, and deep melancholic tones.", color: "radial-gradient(circle at center, #7c3aed 10%, #000000 80%)" },
  { id: "Drama", arabicName: "Drama", desc: "Deep character emotions, spotlight highlights on faces, and a calm narrative focus.", color: "radial-gradient(circle at center, #ea580c 10%, #000000 85%)" },
  { id: "Epic", arabicName: "Epic", desc: "Colossal scales of ancient ruins, desert winds, and majestic trials.", color: "radial-gradient(circle at center, #ca8a04 10%, #000000 80%)" },
  { id: "General", arabicName: "General Cinema", desc: "Classic cinematic tones with rich details and beautifully balanced scenery.", color: "radial-gradient(circle at center, #06b6d4 15%, #000000 75%)" },
  { id: "Action", arabicName: "Action", desc: "High-contrast dynamic grades, swift kinetic cuts, and spectacular dust tracking.", color: "radial-gradient(circle at center, #dc2626 20%, #000000 80%)" },
  { id: "Horror", arabicName: "Psychological Horror", desc: "Deep darkness, chilling subsurface lights, and shadows that mask facial profiles.", color: "radial-gradient(circle at center, #991b1b 10%, #080202 90%)" },
  { id: "Comedy", arabicName: "Comedy", desc: "Bright saturated colors, warm daylit sets, and funny whimsical expressions.", color: "radial-gradient(circle at center, #eab308 15%, #020617 80%)" }
];

const CINEMA_MODELS = VIDEO_MODEL_REGISTRY.filter((model) => {
  const caps = model.capabilities;
  return !caps.requires_image && !caps.requires_video;
});
const FALLBACK_CINEMA_MODEL = CINEMA_MODELS[0] ?? VIDEO_MODEL_REGISTRY[0];

const getModelCategory = (model: WaveSpeedVideoModel) => model.family_label.toUpperCase();
const buildDurationOptions = (model: WaveSpeedVideoModel) =>
  model.capabilities.durations.map((sec) => ({ value: `${sec}s`, label: `${sec}s` }));
const buildResolutionOptions = (model: WaveSpeedVideoModel) => {
  const values = model.capabilities.resolutions.length ? model.capabilities.resolutions : ["default"];
  return values.map((value) => ({ value, label: value === "default" ? "Model default" : value.toUpperCase() }));
};
const buildAspectRatioOptions = (model: WaveSpeedVideoModel) => {
  const values = model.capabilities.aspect_ratios.length ? model.capabilities.aspect_ratios : ["default"];
  return values.map((value) => ({
    value,
    label: value === "default"
      ? "Model default"
      : value === "landscape"
        ? "16:9 Landscape"
        : value === "portrait"
          ? "9:16 Portrait"
          : value,
  }));
};

const VOICE_PRESETS = [
  { label: "Gulf Male Narrator", voiceId: "pNInz6obpgDQGcFmaJgB", desc: "Arabic Gulf male tone for confident narration", lang: "AR" },
  { label: "Egyptian Male Storyteller", voiceId: "nPczCjzI2devNBz1zQrb", desc: "Warm Arabic/Egyptian-style storyteller", lang: "AR" },
  { label: "Levantine Male Dialogue", voiceId: "onwK4e9ZLuTAKqWW03F9", desc: "Grounded Arabic dialogue voice", lang: "AR" },
  { label: "Arabic Classical Female", voiceId: "Z3R5wn05IrDiVCyEkUrK", desc: "Clear modern standard Arabic female delivery", lang: "AR" },
  { label: "Child Voice", voiceId: "pPdl9cQBQq4p6mRkZy2Z", desc: "Bright youthful child-like tone", lang: "MULTI" },
  { label: "Documentary Narrator", voiceId: "DGTOOUoGpoP6UZ9uSWfA", desc: "Deep documentary narration voice", lang: "MULTI" },
  { label: "Classic Confident Female", voiceId: "21m00Tcm4TlvDq8ikWAM", desc: "Crisp confident female narration", lang: "EN" },
  { label: "Deep Trailer Male", voiceId: "N2lVS1w4EtoT3dr4eOWO", desc: "Trailer-style low cinematic presence", lang: "EN" }
];

const SPEED_OPTIONS = [
  { value: "1/4", label: "1/4 Ultra-slow (Full rendering quality & superb details)" },
  { value: "2/4", label: "2/4 Medium (Balanced processing)" },
  { value: "3/4", label: "3/4 Fast (Good rendering speed)" },
  { value: "4/4", label: "4/4 Warp-speed (Draft draft)" }
];

const getShortModel = (name: string): string => {
  if (!name) return "";
  const n = name.toLowerCase();
  if (n.includes("kling 3.0")) return "Kling 3.0";
  if (n.includes("kling 2.5")) return "Kling 2.5";
  if (n.includes("hailuo")) return "Hailuo 2.3";
  if (n.includes("sora 2")) return "Sora 2";
  if (n.includes("veo 3.1")) return "Veo 3.1";
  if (n.includes("seedance 2.0")) return "Seedance 2.0";
  if (n.includes("grok")) return "Grok Image";
  return name;
};

const getShortLens = (lens: string): string => {
  if (!lens) return "";
  const l = lens.toLowerCase();
  if (l.includes("anamorphic") && l.includes("85mm")) return "85mm Anamorphic";
  if (l.includes("noctilux")) return "50mm Noctilux";
  if (l.includes("street") || l.includes("documentary")) return "35mm Street";
  if (l.includes("portrait") || l.includes("50mm prime")) return "50mm Prime";
  if (l.includes("macro") || l.includes("tessar")) return "100mm Macro";
  if (l.includes("24mm")) return "24mm Wide";
  if (l.includes("arri") || l.includes("18mm")) return "18mm Arri Wide";
  if (l.includes("hawk") || l.includes("45mm")) return "45mm Hawk";
  if (l.includes("zoom") || l.includes("70-200")) return "70-200mm Zoom";
  if (l.includes("isolator") || l.includes("135mm")) return "135mm Isolator";
  if (l.includes("fisheye") || l.includes("12mm")) return "12mm Fisheye";
  if (l.includes("helios")) return "58mm Helios";
  return lens.replace(/\s*(Lens|Cine|Cinema|Vintage|Professional|Extreme|Prime|Portrait|Shot)\s*/gi, " ").replace(/\s+/g, " ").trim();
};

const getShortMovement = (mv: string): string => {
  if (!mv) return "";
  const m = mv.toLowerCase();
  if (m.includes("dolly")) return "Dolly Zoom";
  if (m.includes("orbit")) return "360° Orbit";
  if (m.includes("dutch") || m.includes("tilt")) return "Dutch Angle";
  if (m.includes("pan left")) return "Pan Left";
  if (m.includes("pan right")) return "Pan Right";
  if (m.includes("jib") || m.includes("crane atmospheric") || m.includes("boom")) return "Jib Crane";
  if (m.includes("crane shot") || m.includes("moving down")) return "Crane Down";
  if (m.includes("whip pan")) return "Whip Pan";
  if (m.includes("steadycam") || m.includes("track")) return "Steadycam";
  if (m.includes("hyperlapse")) return "Hyperlapse";
  if (m.includes("drone")) return "Drone Orbit";
  if (m.includes("macro crawl")) return "Macro Crawl";
  if (m.includes("shaky") || m.includes("handheld")) return "Handheld";
  if (m.includes("pov")) return "POV Run";
  return mv;
};

const getShortCast = (name: string): string => {
  if (!name) return "";
  if (name.toLowerCase().includes(" the ")) {
    return name.split(/\s+[tT]he\s+/i)[0];
  }
  return name;
};

const getShortVoice = (voice: string): string => {
  if (!voice) return "";
  const v = voice.toLowerCase();
  if (v.includes("male") && v.includes("warm")) return "Warm Male";
  if (v.includes("female") && v.includes("classic")) return "Classic Female";
  if (v.includes("wisdom") || v.includes("wise") || v.includes("sage")) return "Resonant Wise";
  if (v.includes("female") && (v.includes("soothing") || v.includes("soft"))) return "Soothing Female";
  if (v.includes("synth") || v.includes("digital") || v.includes("cyber")) return "Synth Digital";
  if (v.includes("analog") || v.includes("resonance")) return "Low Analog";
  if (v.includes("desert") || v.includes("gruff")) return "Deep Male";
  if (v.includes("rural") || v.includes("dialect")) return "Rural Dialect";
  if (voice.length > 20) return voice.slice(0, 18) + "...";
  return voice;
};

export default function App() {
  const [castingActors, setCastingActors] = useState(INITIAL_CASTING_CHARACTERS);
  const [selectedModelId, setSelectedModelId] = useState(FALLBACK_CINEMA_MODEL?.id ?? "kling-v3.0-pro-t2v");
  const [activeDropdown, setActiveDropdown] = useState<"model" | "duration" | "resolution" | "ratio" | "speed" | null>(null);
  const [selectedCharId, setSelectedCharId] = useState("char_1");
  const [selectedGenre, setSelectedGenre] = useState("Noir");
  
  // Custom camera parameters states
  const [lensType, setLensType] = useState("85mm Anamorphic Cinema");
  const [cameraMovement, setCameraMovement] = useState("Dolly Zoom (Vertigo Effect)");
  
  // Cinematic Style Settings Modals state
  const [colorPalette, setColorPalette] = useState("Auto");
  const [lightingStyle, setLightingStyle] = useState("Auto");
  const [cameraMovesetStyle, setCameraMovesetStyle] = useState("Auto");

  // User input states
  const [prompt, setPrompt] = useState("A man crossing a city bridge at night under driving rain, with warm neon lights, long shadows, and vintage gaslamps reflecting on the wet pavement");
  const [dialogueText, setDialogueText] = useState("A thousand years of storytelling unfold in these heavy footsteps, weighed down by the pouring rain and dreamy memories...");
  
  // Custom Studio status manager
  const [status, setStatus] = useState<"IDLE" | "RENDERING" | "SUCCESS" | "FAILED">("IDLE");
  const [progress, setProgress] = useState(0);
  const [activeScenario, setActiveScenario] = useState<any>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [renderNotice, setRenderNotice] = useState<string | null>(null);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);
  const voicePreviewRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const actorGenIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeActorVoiceInputRef = useRef<HTMLInputElement | null>(null);
  const modalCustomVoiceInputRef = useRef<HTMLInputElement | null>(null);
 
  // Playback simulator states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeSubtitle, setActiveSubtitle] = useState("");
  const [soundVolume, setSoundVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [timecode, setTimecode] = useState("00:00:00:00");
 
  // Bottom parameters controls state
  const [duration, setDuration] = useState("8s");
  const [resolution, setResolution] = useState("1080p");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [batchSize, setBatchSize] = useState("1/4");
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [endFrameUrl, setEndFrameUrl] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [cfgScale, setCfgScale] = useState(0.5);
  const [seed, setSeed] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [grokMode, setGrokMode] = useState<"fun" | "normal" | "spicy">("normal");
 
  // Dialog overlays controllers
  const [activeModal, setActiveModal] = useState<"genre" | "style" | "camera" | "casting" | "ai_director" | "voice" | null>(null);
 
  // Character creator lab inputs state
  const [custName, setCustName] = useState("");
  const [custTagline, setCustTagline] = useState("");
  const [custGender, setCustGender] = useState("male");
  const [custStyle, setCustStyle] = useState("");
  const [custVoice, setCustVoice] = useState("Documentary Narrator");
  const [custVoicePreset, setCustVoicePreset] = useState("Documentary Narrator");
  const [custPicUrl, setCustPicUrl] = useState("classic");
  const [isGeneratingChar, setIsGeneratingChar] = useState(false);
  const [charProgress, setCharProgress] = useState(0);
 
  // Side Navigation & presets history simulated
  const [recentProjects, setRecentProjects] = useState<any[]>([
    {
      id: "preset_1",
      title: "Dreamy City Alleys 🌧️",
      prompt: "A man crossing a city bridge at night under driving rain, with warm neon lights, long shadows, and vintage gaslamps reflecting on the wet pavement",
      dialogueText: "A thousand years of storytelling unfold in these heavy footsteps, weighed down by the pouring rain and dreamy memories...",
      cameraMovement: "Dolly Zoom (Vertigo Effect)",
      lensType: "85mm Anamorphic Cinema",
      genre: "Noir",
      actorsId: "char_1"
    },
    {
      id: "preset_2",
      title: "Epic of Ancient Civilization 🏛️",
      prompt: "A young woman in long black hair and exquisite vintage gilded jewelry standing in front of a colossal historic fortress under dense morning fog",
      dialogueText: "From the dust of this sacred earth we were born, and to the majesty of these ancient walls our grandest tales shall always return...",
      cameraMovement: "Crane Shot Moving Down",
      lensType: "24mm Ultra Wide Angle Shot",
      genre: "Epic",
      actorsId: "char_3"
    },
    {
      id: "preset_3",
      title: "The Council of Elders 📜",
      prompt: "A wise elder with dignified, sharp, piercing features speaking earnestly in the courtyard of a classical heritage estate under a breathtaking golden sunset",
      dialogueText: "My child, the years do not grant wisdom for free; they carve it patiently from your life, day by day, leaf by leaf...",
      cameraMovement: "Slow Cinematic Pan Left",
      lensType: "50mm Prime Portrait",
      genre: "Drama",
      actorsId: "char_2"
    }
  ]);

  const currentActor = castingActors.find((c) => c.id === selectedCharId) || castingActors[0];
  const activeModelObj = CINEMA_MODELS.find((m) => m.id === selectedModelId) || FALLBACK_CINEMA_MODEL;
  const activeGenreObj = AVAILABLE_GENRES.find((g) => g.id === selectedGenre) || AVAILABLE_GENRES[0];
  const activeScene = activeScenario?.scenes?.[0] ?? null;
  const durationOptions = useMemo(() => buildDurationOptions(activeModelObj), [activeModelObj]);
  const resolutionOptions = useMemo(() => buildResolutionOptions(activeModelObj), [activeModelObj]);
  const aspectRatioOptions = useMemo(() => buildAspectRatioOptions(activeModelObj), [activeModelObj]);
  const playbackDuration = Number.parseInt(duration, 10) || 8;
  const selectedVoiceId = currentActor?.voiceId || VOICE_PRESETS.find((v) => v.label === currentActor?.voice || v.voiceId === currentActor?.voice)?.voiceId || VOICE_PRESETS[0].voiceId;
  const estimatedCredits = getVideoCreditsByRoute(activeModelObj.api_route, {
    duration: playbackDuration,
    ...(activeModelObj.family === "kling" ? { mode: resolution } : { resolution }),
    sound: soundEnabled,
    generate_audio: soundEnabled,
  });

  // Close custom settings dropdowns when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".cine-dropdown-container")) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!durationOptions.some((opt) => opt.value === duration)) {
      setDuration(durationOptions[0]?.value ?? "8s");
    }
    if (!resolutionOptions.some((opt) => opt.value === resolution)) {
      setResolution(resolutionOptions[0]?.value ?? "default");
    }
    if (!aspectRatioOptions.some((opt) => opt.value === aspectRatio)) {
      setAspectRatio(aspectRatioOptions[0]?.value ?? "default");
    }
    setReferenceImages((prev) => prev.slice(0, activeModelObj.capabilities.max_reference_images));
    if (!activeModelObj.capabilities.has_end_frame) setEndFrameUrl("");
    if (!activeModelObj.capabilities.has_negative_prompt) setNegativePrompt("");
  }, [
    activeModelObj.capabilities.has_end_frame,
    activeModelObj.capabilities.has_negative_prompt,
    activeModelObj.capabilities.max_reference_images,
    activeModelObj.id,
    aspectRatio,
    aspectRatioOptions,
    duration,
    durationOptions,
    resolution,
    resolutionOptions,
  ]);

  useEffect(() => {
    const stored = window.localStorage.getItem("cinema-studio-vso-recent-projects");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setRecentProjects(parsed.slice(0, 12));
      }
    } catch {
      window.localStorage.removeItem("cinema-studio-vso-recent-projects");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("cinema-studio-vso-recent-projects", JSON.stringify(recentProjects.slice(0, 12)));
  }, [recentProjects]);

  useEffect(() => {
    return () => {
      if (actorGenIntervalRef.current) {
        clearInterval(actorGenIntervalRef.current);
        actorGenIntervalRef.current = null;
      }
      voicePreviewRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (activeModal === "casting" || !actorGenIntervalRef.current) return;
    clearInterval(actorGenIntervalRef.current);
    actorGenIntervalRef.current = null;
    setIsGeneratingChar(false);
    setCharProgress(0);
  }, [activeModal]);

  // Handle live clock state for cinema-engine look
  useEffect(() => {
    const clockTimer = setInterval(() => {
      const now = new Date();
      const hrs = String(now.getHours()).padStart(2, "0");
      const mins = String(now.getMinutes()).padStart(2, "0");
      const secs = String(now.getSeconds()).padStart(2, "0");
      const frames = String(Math.floor(now.getMilliseconds() / 41)).padStart(2, "0");
      setTimecode(`${hrs}:${mins}:${secs}:${frames}`);
    }, 41);
    return () => clearInterval(clockTimer);
  }, []);

  // Update playback time
  useEffect(() => {
    let loopTimer: any;
    if (isPlaying && activeScenario) {
      loopTimer = setInterval(() => {
        setCurrentTime((prev) => {
          const nextVal = prev + 0.1;
          if (nextVal >= playbackDuration) {
            return 0; // seamless movie loop
          }
          return nextVal;
        });
      }, 100);
    } else {
      clearInterval(loopTimer);
    }
    return () => clearInterval(loopTimer);
  }, [isPlaying, activeScenario, playbackDuration]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isPlaying, generatedVideoUrl]);

  // Sync subtitle timeline
  useEffect(() => {
    if (!activeScene) {
      setActiveSubtitle("");
      return;
    }
    const match = activeScene.subtitles.find(
      (sub: any) => currentTime >= sub.start && currentTime <= sub.end
    );
    if (match) {
      setActiveSubtitle(match.text);
    } else {
      setActiveSubtitle("");
    }
  }, [currentTime, activeScene]);

  // Load a preset project instantly from sidebar
  const handleLoadProject = (project: any) => {
    setPrompt(project.prompt);
    setDialogueText(project.dialogueText);
    setCameraMovement(project.cameraMovement);
    setLensType(project.lensType);
    setSelectedGenre(project.genre);
    setSelectedCharId(project.actorsId);

    // Create high-detail custom visual specifications
    generateClientScene(project.prompt, project.dialogueText, project.cameraMovement, project.lensType, project.genre);
  };

  const uploadImageFile = async (file: File) => {
    const response = await fetch("/api/media/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: file.name, fileType: file.type || "image/jpeg" }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.signedUrl || !payload?.publicUrl) {
      throw new Error(payload?.error || "Storage upload URL failed");
    }
    const upload = await fetch(payload.signedUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "image/jpeg" },
      body: file,
    });
    if (!upload.ok) throw new Error("Storage upload failed");
    return String(payload.publicUrl);
  };

  const readImageFiles = async (files: FileList | null, limit: number) => {
    const selected = Array.from(files ?? []).slice(0, Math.max(0, limit));
    const urls = await Promise.all(
      selected.map(async (file) => {
        try {
          return await uploadImageFile(file);
        } catch (err) {
          console.warn("Reference image storage upload failed, using local preview data URL:", err);
          return await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          });
        }
      }),
    );
    return urls;
  };

  const handleReferenceUpload = async (files: FileList | null) => {
    const limit = activeModelObj.capabilities.max_reference_images;
    if (!limit) return;
    const urls = await readImageFiles(files, limit);
    setReferenceImages(urls.slice(0, limit));
  };

  const handleEndFrameUpload = async (files: FileList | null) => {
    const [url] = await readImageFiles(files, 1);
    if (url) setEndFrameUrl(url);
  };

  const assignPresetVoiceToActor = (actorId: string, presetLabel: string) => {
    const preset = VOICE_PRESETS.find((voice) => voice.label === presetLabel || voice.voiceId === presetLabel);
    if (!preset) return;
    setCastingActors((prev) =>
      prev.map((actor) =>
        actor.id === actorId ? { ...actor, voice: preset.label, voiceId: preset.voiceId } : actor,
      ),
    );
  };

  const assignCustomVoiceToActor = (actorId: string, voiceDescription: string) => {
    const trimmed = voiceDescription.trim();
    if (!trimmed) return;
    setCastingActors((prev) =>
      prev.map((actor) =>
        actor.id === actorId ? { ...actor, voice: trimmed } : actor,
      ),
    );
  };

  const previewVoice = async (voiceId = selectedVoiceId) => {
    if (!dialogueText.trim()) return;
    voicePreviewRef.current?.pause();
    setIsPreviewingVoice(true);
    try {
      const response = await fetch("/api/generate/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "tts",
          model: "elevenlabs/text-to-speech-multilingual-v2",
          text: dialogueText.slice(0, 1200),
          voice: voiceId,
          stability: 0.5,
          clarity: 75,
          use_speaker_boost: true,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.audioUrl) throw new Error(payload?.error || "Voice preview failed");
      setGeneratedAudioUrl(payload.audioUrl);
      const audio = new Audio(payload.audioUrl);
      voicePreviewRef.current = audio;
      audio.onended = () => setIsPreviewingVoice(false);
      await audio.play();
    } catch (err) {
      console.error("Voice preview failed:", err);
      setIsPreviewingVoice(false);
    }
  };

  // Run render pipeline
  const triggerRender = async () => {
    if (!prompt.trim()) return;
    setStatus("RENDERING");
    setProgress(5);
    setIsPlaying(false);
    setCurrentTime(0);
    setGeneratedVideoUrl(null);
    setRenderNotice(null);

    try {
      const response = await fetch("/api/cinema/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt,
          dialogueText: dialogueText,
          cameraMovement: cameraMovement,
          lensType: lensType,
          voiceId: selectedVoiceId,
          modelId: selectedModelId,
          modelRoute: activeModelObj.api_route,
          duration: playbackDuration,
          resolution,
          aspectRatio,
          referenceImages,
          endFrameUrl,
          negativePrompt,
          ...(activeModelObj.capabilities.has_cfg_scale ? { cfgScale } : {}),
          seed,
          sound: soundEnabled,
          ...(activeModelObj.family === "grok" ? { grokMode } : {}),
          colorPalette,
          lightingStyle,
          cameraMovesetStyle,
          batchSize
        }),
      });

      const payload = await response.json().catch(() => null);

      if (response.ok && payload?.status === "COMPLETED" && payload?.data) {
        setActiveScenario(payload.data);
        setGeneratedVideoUrl(payload.videoUrl ?? payload.data?.videoUrl ?? null);
        setRenderNotice(payload.previewOnly ? (payload.providerError || "Preview mode: video provider did not start.") : null);
        setProgress(100);
        setStatus("SUCCESS");
        setIsPlaying(true);
      } else if ((response.status === 202 || response.ok) && payload?.success && (payload?.taskId || payload?.generationId)) {
        if (payload.data) setActiveScenario(payload.data);
        setRenderNotice(null);
        setProgress(payload.progress ?? 10);
        startPollingJob(payload.taskId ?? payload.generationId);
      } else {
        throw new Error(payload?.error || "Cinema Studio render failed");
      }
    } catch (err) {
      console.error("Cinema Studio render failed:", err);
      setStatus("FAILED");
      setProgress(0);
    }
  };

  // Multi-route polling
  const startPollingJob = (jobId: string) => {
    let countAttempts = 0;
    const pollObj = setInterval(async () => {
      countAttempts++;
      if (countAttempts > 180) {
        clearInterval(pollObj);
        generateClientScene(prompt, dialogueText, cameraMovement, lensType, selectedGenre);
        return;
      }

      try {
        const response = await fetch(`/api/cinema/render?taskId=${encodeURIComponent(jobId)}`);
        if (!response.ok) throw new Error("Job not found in cache storage");
        const body = await response.json();
        
        if (body.status === "COMPLETED") {
          clearInterval(pollObj);
          if (body.data) setActiveScenario(body.data);
          setGeneratedVideoUrl(body.videoUrl ?? body.outputs?.[0] ?? null);
          setRenderNotice(null);
          setProgress(100);
          setStatus("SUCCESS");
          setIsPlaying(true);
        } else if (body.status === "FAILED") {
          clearInterval(pollObj);
          setStatus("FAILED");
        } else {
          setProgress(body.progress || Math.min(countAttempts * 10, 95));
        }
      } catch (err) {
        console.warn("Retrying state polling...", err);
      }
    }, 2000);
  };

  // Beautiful visual construction logic for scenes
  const generateClientScene = (
    ptext: string, 
    dtext: string, 
    camMove: string, 
    lens: string,
    genre: string
  ) => {
    // Determine customized color gradient depending on chosen Genre and Style
    let particles: "rain" | "snow" | "dust" | "fog" | "none" = "none";
    if (ptext.includes("rain")) particles = "rain";
    else if (ptext.includes("snow")) particles = "snow";
    else if (ptext.includes("dust") || ptext.includes("sand")) particles = "dust";
    else if (ptext.includes("fog") || ptext.includes("mist")) particles = "fog";

    let moodGrad = "radial-gradient(circle at 50% 40%, rgba(99, 102, 241, 0.15) 0%, rgba(0, 0, 0, 0) 80%)";
    if (genre === "Noir") {
      moodGrad = "radial-gradient(circle at 50% 40%, rgba(59, 130, 246, 0.16) 0%, rgba(0, 0, 0, 0) 85%)";
    } else if (genre === "Action" || ptext.includes("red")) {
      moodGrad = "radial-gradient(circle at 50% 40%, rgba(239, 68, 68, 0.18) 0%, rgba(0, 0, 0, 0) 80%)";
    } else if (genre === "Epic" || ptext.includes("gold")) {
      moodGrad = "radial-gradient(circle at 50% 40%, rgba(234, 179, 8, 0.15) 0%, rgba(0, 0, 0, 0) 80%)";
    } else if (genre === "Horror") {
      moodGrad = "radial-gradient(circle at center, rgba(153, 27, 27, 0.22) 0%, rgba(0, 0, 0, 0) 90%)";
    }

    const subtitleDuration = Math.max(1, playbackDuration);
    const subtitleMidpoint = Number((subtitleDuration / 2).toFixed(1));
    const subtitleEnd = Number(Math.max(subtitleMidpoint + 0.1, subtitleDuration - 0.2).toFixed(1));

    const compiled = {
      title: `Cinematography: ${ptext.slice(0, 30)}...`,
      directorNotes: `Director analysis: ${lens} and ${camMove} are aligned to create depth, contrast, and a polished cinematic frame.`,
      particlesType: particles,
      accentColor: genre === "Action" ? "#ef4444" : genre === "Epic" ? "#eab308" : "#3b82f6",
      scenes: [
        {
          visualDescription: `Scene preview: backlit subject with interactive lens parameters active and a controlled production-grade lighting setup.`,
          dialogue: dtext || "Default cinematic dialogue performance",
          subtitles: [
            { text: dtext.slice(0, Math.floor(dtext.length / 2)), start: 0, end: subtitleMidpoint },
            { text: dtext.slice(Math.floor(dtext.length / 2)), start: subtitleMidpoint, end: subtitleEnd }
          ],
          lensType: lens,
          cameraMovement: camMove,
          soundEffects: particles === "rain" ? "wet_ambient_rain" : "cinematic_drone_subbass",
          visualLayout: {
            backgroundColor: "bg-[#060609]",
            foregroundElements: ["Silhouette model", "Neo-noir street lamp glow"],
            lightingGradient: moodGrad
          }
        }
      ]
    };

    setActiveScenario(compiled);
    setStatus("SUCCESS");
    setIsPlaying(true);
    setProgress(100);
  };

  // High-fidelity procedural actor maker.
  const buildCustomCharacterObj = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim()) return;

    setIsGeneratingChar(true);
    setCharProgress(10);
    
    let simulatedVal = 10;
    if (actorGenIntervalRef.current) clearInterval(actorGenIntervalRef.current);
    actorGenIntervalRef.current = setInterval(() => {
      simulatedVal += 20;
      if (simulatedVal >= 100) {
        if (actorGenIntervalRef.current) {
          clearInterval(actorGenIntervalRef.current);
          actorGenIntervalRef.current = null;
        }

        // Map portrait using category chosen
        let mockPicUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=250&auto=format&fit=crop";
        if (custGender === "female") {
          mockPicUrl = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=250&auto=format&fit=crop";
        } else if (custPicUrl === "wise_old") {
          mockPicUrl = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=250&auto=format&fit=crop";
        } else if (custGender === "male") {
          mockPicUrl = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=250&auto=format&fit=crop";
        } else if (custPicUrl === "cyber_glow") {
          mockPicUrl = "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=250&auto=format&fit=crop";
        }

        const customVoicePreset = VOICE_PRESETS.find((voice) => voice.label === custVoicePreset);
        const newbornChar = {
          id: `custom_char_${crypto.randomUUID().slice(0, 8)}`,
          name: custName,
          tagline: custTagline || "A production-ready cinematic character profile",
          url: mockPicUrl,
          style: custStyle || "Classic cinematic wardrobe shaped for the scene narrative",
          voice: custVoice || customVoicePreset?.label || "Documentary Narrator",
          voiceId: customVoicePreset?.voiceId || selectedVoiceId,
          gender: custGender
        };

        setCastingActors((prev) => [newbornChar, ...prev]);
        setSelectedCharId(newbornChar.id);
        
        // Add custom built character note or alert to user
        setIsGeneratingChar(false);
        setCharProgress(0);

        // Add to history preset automatically!
        const newProj = {
          id: `recent_${crypto.randomUUID().slice(0, 8)}`,
          title: `Scene: ${custName}`,
          prompt: `A detailed cinematic shot focused on ${custName} in a ${selectedGenre} style with ${custStyle || "an elegant wardrobe"}`,
          dialogueText: `This is the new dramatic profile for the generated character, ready for a cinematic scene...`,
          cameraMovement: cameraMovement,
          lensType: lensType,
          genre: selectedGenre,
          actorsId: newbornChar.id
        };
        setRecentProjects(prev => [newProj, ...prev]);

        // Close character creator modal
        setActiveModal(null);
        // Clear fields
        setCustName("");
        setCustTagline("");
        setCustStyle("");
        setCustVoice("Documentary Narrator");
        setCustVoicePreset("Documentary Narrator");
      } else {
        setCharProgress(simulatedVal);
      }
    }, 300);
  };

  // Particle render overlay on active widescreen previewer
  const renderInteractiveParticles = () => {
    if (!activeScenario || activeScenario.particlesType === "none") return null;
    const type = activeScenario.particlesType;
    const itemsCount = type === "fog" ? 10 : 35;
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
        {[...Array(itemsCount)].map((_, idx) => {
          const randLeft = Math.random() * 100;
          const delaySec = Math.random() * 4;
          const durationVal = 3 + Math.random() * 6;
          const sizePx = type === "fog" ? 120 + Math.random() * 100 : 2 + Math.random() * 3;

          if (type === "rain") {
            return (
              <motion.div
                key={idx}
                className="absolute bg-[#FFB347]/40"
                style={{
                  left: `${randLeft}%`,
                  top: `-20px`,
                  width: `1px`,
                  height: `${25 + Math.random() * 30}px`,
                  transform: "rotate(12deg)",
                  opacity: 0.3 + Math.random() * 0.4
                }}
                animate={{
                  y: ["0%", "450px"],
                  x: ["0px", "-40px"]
                }}
                transition={{
                  duration: durationVal * 0.35,
                  repeat: Infinity,
                  delay: delaySec,
                  ease: "linear"
                }}
              />
            );
          } else if (type === "snow") {
            return (
              <motion.div
                key={idx}
                className="absolute bg-white/70 rounded-full"
                style={{
                  left: `${randLeft}%`,
                  top: `-10px`,
                  width: `${sizePx}px`,
                  height: `${sizePx}px`,
                }}
                animate={{
                  y: ["0%", "450px"],
                  x: ["0px", `${Math.sin(idx) * 30}px`]
                }}
                transition={{
                  duration: durationVal * 1.2,
                  repeat: Infinity,
                  delay: delaySec,
                  ease: "easeInOut"
                }}
              />
            );
          } else if (type === "dust") {
            return (
              <motion.div
                key={idx}
                className="absolute bg-[#FFB347]/20 rounded-full"
                style={{
                  left: `${randLeft}%`,
                  top: `${Math.random() * 100}%`,
                  width: `${sizePx}px`,
                  height: `${sizePx}px`,
                }}
                animate={{
                  y: ["0px", `-${40 + Math.random() * 60}px`],
                  x: ["0px", `${25 + Math.random() * 25}px`],
                  opacity: [0, 0.4, 0]
                }}
                transition={{
                  duration: durationVal * 1.1,
                  repeat: Infinity,
                  delay: delaySec,
                  ease: "easeInOut"
                }}
              />
            );
          } else if (type === "fog") {
            return (
              <motion.div
                key={idx}
                className="absolute bg-[#1a1e29]/20 rounded-full filter blur-xl"
                style={{
                  left: `${randLeft - 10}%`,
                  top: `${20 + Math.random() * 60}%`,
                  width: `${sizePx}px`,
                  height: `${sizePx}px`,
                }}
                animate={{
                  x: ["0px", `${40 + Math.sin(idx) * 40}px`],
                  opacity: [0.05, 0.25, 0.05]
                }}
                transition={{
                  duration: durationVal * 2.8,
                  repeat: Infinity,
                  delay: delaySec,
                  ease: "easeInOut"
                }}
              />
            );
          }
          return null;
        })}
      </div>
    );
  };

  return (
    <div id="full_studio_page" className="min-h-screen bg-[#17120E] text-[#FFF8EA] flex flex-col font-sans overflow-hidden select-none selection:bg-[#FFB347]/30 relative">

      {/* CINEMATIC BACKGROUND LAYERS — Anamorphic Noir */}
      <div className="cine-bg-radial fixed inset-0 pointer-events-none z-0" aria-hidden />
      <div className="cine-flare f1" aria-hidden />
      <div className="cine-flare f2" aria-hidden />
      <div className="cine-bg-scan fixed inset-0 pointer-events-none z-[4]" aria-hidden />
      <div className="cine-bg-vignette fixed inset-0 pointer-events-none z-[5]" aria-hidden />
      <div className="cine-bg-grain fixed inset-0 pointer-events-none z-[6]" aria-hidden />
      <div className="fixed inset-0 pointer-events-none z-[3] overflow-hidden" aria-hidden>
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            className="cine-dust"
            style={{
              left: `${(i * 7.3) % 100}%`,
              width: `${1.5 + (i % 3) * 0.6}px`,
              height: `${1.5 + (i % 3) * 0.6}px`,
              animationDuration: `${35 + (i * 3) % 25}s`,
              animationDelay: `-${(i * 2.4) % 30}s`,
            }}
          />
        ))}
      </div>

      {/* 1. STATE-OF-THE-ART SLICK HEADER */}
      <header id="top_cinema_header" className="h-14 bg-[#24201B] border-b border-[#544737] px-6 flex items-center justify-between relative z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#FFB347] to-[#FF8C42] flex items-center justify-center shadow-lg shadow-black/60">
            <Film size={16} className="text-white animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-[#FFB347] to-[#FFB347]">
              SAAD CINEMA STUDIO v5.0
            </span>
            <span className="text-xs font-mono bg-[#544737] text-[#FFB347] font-bold px-2 py-0.5 rounded border border-[#D6A84F]/40">
              ULTRA-ENGINE
            </span>
          </div>
        </div>

        {/* STATUS COUNTERS & LIVE TIMECODE IN HEADER */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="hidden md:flex items-center gap-1.5 bg-[#302920]/80 border border-[#544737]/80 px-3 py-1 rounded-full text-[#F0E1C8] text-[13px]">
            <span className="w-1.5 h-1.5 bg-[#F6D58B] rounded-full inline-block animate-ping" />
            <span>PIPELINE: ACTIVE</span>
          </div>

          <div className="bg-[#302920] border border-[#544737] px-3.5 py-1 rounded-lg text-[#FFF8EA] font-mono text-[13px] flex items-center gap-2">
            <span className="text-[#C8B89F]">ENG TIMECODE:</span>
            <span className="text-[#FFB347] tracking-wider font-bold">{timecode}</span>
          </div>
        </div>
      </header>

      {/* 2. THREE-PANEL EDITORIAL WORKSPACE */}
      <div className="flex-1 flex overflow-hidden relative z-30">
        
        {/* SIDEBAR: LEFT NAV & PRESETS HISTORIES */}
        <aside id="suite_sidebar" className="w-[280px] bg-[#24201B] border-r border-[#544737] flex flex-col justify-between hidden md:flex flex-shrink-0">
          
          <div className="p-4 flex flex-col gap-5 overflow-y-auto flex-1">
            
            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => {
                  setPrompt("A man crosses a city bridge at night under rain, warm neon lights, stretched shadows, and vintage street lamps");
                  setDialogueText("A thousand years of stories fold into these rain-heavy steps and the memory of distant lights...");
                  setActiveScenario(null);
                  setStatus("IDLE");
                  setIsPlaying(false);
                }}
                className="w-full bg-[#302920] hover:bg-[#3B3328] border border-[#544737] text-sm font-bold py-2.5 px-3 rounded-lg flex items-center gap-2 text-[#FFF8EA] transition-all duration-200 shadow-sm"
              >
                <Plus size={14} className="text-[#FFB347]" />
                <span>+ New cinematic project</span>
              </button>

              <button 
                onClick={() => setActiveModal(activeModal === "ai_director" ? null : "ai_director")}
                className={`w-full text-sm font-bold py-2.5 px-3 rounded-lg flex items-center justify-between transition-all duration-200 border ${
                  activeModal === "ai_director"
                    ? "bg-[#3B2C19] text-[#FFCB7A] border-[#FFB347]/70 shadow"
                    : "bg-transparent text-[#F0E1C8] hover:text-[#FFF8EA] border-transparent"
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare size={14} className="text-[#FFB347]" />
                  <span>AI Director Assistant</span>
                </div>
                <span className="bg-[#544737] text-[#FFB347] text-[13px] font-mono px-1.5 py-0.2 rounded">LIVE</span>
              </button>
            </div>

            {/* Expander list Header */}
            <div>
              <span className="text-xs font-mono font-bold tracking-wider text-[#C8B89F] block mb-2 uppercase">
                Live control deck
              </span>
              <div className="flex flex-col gap-1 text-xs">
                <button 
                  onClick={() => setActiveModal("genre")}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#24201B]/70 hover:bg-[#302920] text-[#F0E1C8] hover:text-[#FFF8EA] transition-all border border-transparent hover:border-[#544737]/60"
                >
                  <span className="flex items-center gap-2">Scene genre</span>
                  <span className="text-[13px] text-[#C8B89F] font-mono italic">{selectedGenre}</span>
                </button>
                <button 
                  onClick={() => setActiveModal("style")}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#24201B]/70 hover:bg-[#302920] text-[#F0E1C8] hover:text-[#FFF8EA] transition-all border border-transparent hover:border-[#544737]/60"
                >
                  <span>Lighting and color system</span>
                  <span className="text-[13px] text-[#FFB347] font-mono">Custom</span>
                </button>
                <button 
                  onClick={() => setActiveModal("camera")}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#24201B]/70 hover:bg-[#302920] text-[#F0E1C8] hover:text-[#FFF8EA] transition-all border border-transparent hover:border-[#544737]/60"
                >
                  <span>Lens and camera setup</span>
                  <span className="text-[13px] text-[#C8B89F] font-mono truncate max-w-28 text-left">{lensType}</span>
                </button>
                <button 
                  onClick={() => setActiveModal("casting")}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#24201B]/70 hover:bg-[#302920] text-[#F0E1C8] hover:text-[#FFF8EA] transition-all border border-transparent hover:border-[#544737]/60"
                >
                  <span>Casting and actor room</span>
                  <span className="text-[13px] text-[#C8B89F] font-mono text-left">{currentActor.name}</span>
                </button>
              </div>
            </div>

            {/* Presets and History */}
            <div className="flex-1 flex flex-col min-h-[220px]">
              <span className="text-xs font-mono font-bold tracking-wider text-[#C8B89F] block mb-2.5 uppercase">
                Scene draft presets ({recentProjects.length})
              </span>
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {recentProjects.map((proj) => {
                  const isCur = prompt === proj.prompt;
                  return (
                    <button
                      key={proj.id}
                      onClick={() => handleLoadProject(proj)}
                      className={`w-full text-right p-2.5 rounded-lg border flex flex-col gap-1 transition-all text-xs outline-none ${
                        isCur
                          ? "bg-[#3B2C19] border-[#FFB347]/70"
                          : "bg-[#302920] border-[#544737]/80 hover:bg-[#302920]/70 hover:border-[#D6A84F]"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[#FFF8EA] font-bold truncate block flex-1 pl-2">
                          {proj.title}
                        </span>
                        <span className="text-[13px] bg-[#302920] text-[#FFB347] px-1.5 py-0.2 rounded font-mono uppercase">
                          {proj.genre}
                        </span>
                      </div>
                      <p className="text-xs text-[#C8B89F] line-clamp-1 truncate w-full">
                        {proj.prompt}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Core watermark credit line according to guidelines */}
          <div className="p-4 border-t border-[#544737] bg-[#17120E] text-center">
            <p className="text-xs text-[#8A7964]">SAAD DIGITAL STUDIOS INC</p>
            <p className="text-[13px] text-[#C8B89F] font-mono mt-0.5">EST. 2026 • MULTI-PROVIDER VIDEO ENGINE</p>
          </div>
        </aside>

        {/* WORKSPACE AREA: DYNAMIC CANVAS STAGE & POPUPS */}
        <section id="center_viewport" className="flex-1 flex flex-col justify-between p-6 relative overflow-y-auto bg-gradient-to-b from-[#0A0F1A] to-[#17120E]">
          
          {/* AESTHETIC CORNER MARKINGS FOR EMPTY STATE / PREVIEW */}
          <div className="absolute top-10 left-10 w-4 h-4 border-t border-l border-[#544737] pointer-events-none" />
          <div className="absolute top-10 right-10 w-4 h-4 border-t border-r border-[#544737] pointer-events-none" />
          <div className="absolute bottom-10 left-10 w-4 h-4 border-b border-l border-[#544737] pointer-events-none" />
          <div className="absolute bottom-10 right-10 w-4 h-4 border-b border-r border-[#544737] pointer-events-none" />

          {/* DYNAMIC CANVAS LOGIC OUTLINE */}
          <div className="flex-1 flex items-center justify-center my-auto min-h-[350px]">
            <AnimatePresence mode="wait">
              
              {/* IDLE VIEWPORT - EXQUISITE MINIMALISM MATCHING THE SCREENSHOTS */}
              {status === "IDLE" && (
                <motion.div
                  key="idle_viewport"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center flex flex-col items-center gap-4 py-8 pointer-events-auto"
                >
                  <span className="text-[13px] text-[#C8B89F] font-mono tracking-[0.3em] uppercase">
                    {activeModelObj.name} ULTRA ENGINE
                  </span>
                  
                  <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-[#FFB347] to-[#FFB347] font-sans max-w-xl leading-relaxed">
                    What would you shoot with infinite budget?
                  </h1>

                  <p className="text-xs text-[#C8B89F] font-sans max-w-md leading-relaxed">
                    Describe the cinematic scene below, then generate a production-style visual plan with lens, camera, lighting, subtitles, and sound direction.
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4 max-w-xl">
                    <button 
                      onClick={() => handleLoadProject(recentProjects[0])}
                      className="px-4 py-2 bg-[#24201B]/50 hover:bg-[#302920]/50 border border-[#544737] hover:border-[#D6A84F] text-sm text-[#F0E1C8] hover:text-white rounded-lg transition-all"
                    >
                      Rainy city alley
                    </button>
                    <button 
                      onClick={() => handleLoadProject(recentProjects[1])}
                      className="px-4 py-2 bg-[#24201B]/50 hover:bg-[#302920]/50 border border-[#544737] hover:border-[#D6A84F] text-sm text-[#F0E1C8] hover:text-white rounded-lg transition-all"
                    >
                      Mythic castle portrait
                    </button>
                    <button 
                      onClick={() => handleLoadProject(recentProjects[2])}
                      className="px-4 py-2 bg-[#24201B]/50 hover:bg-[#302920]/50 border border-[#544737] hover:border-[#D6A84F] text-sm text-[#F0E1C8] hover:text-white rounded-lg transition-all"
                    >
                      Heritage courtyard
                    </button>
                  </div>
                </motion.div>
              )}

              {/* PIPELINE RENDERING LOADER VIEWPORT */}
              {status === "RENDERING" && (
                <motion.div
                  key="rendering_viewport"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center space-y-4 max-w-md w-full px-6"
                >
                  <div className="relative w-16 h-16 mx-auto mb-2">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 border-2 border-t-[#FFB347] border-[#544737] rounded-full"
                    />
                    <div className="absolute inset-2 bg-[#17120E] rounded-full flex items-center justify-center">
                      <Camera size={20} className="text-[#FFB347]" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-[#F0E1C8] font-mono">
                      <span>Rendering frame and character detail {progress}%</span>
                      <span>GEN_PIPELINE_ACTIVE</span>
                    </div>
                    {/* Progress Bar Container Grid */}
                    <div className="h-1 w-full bg-[#302920] rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-[#FFB347] to-[#FF8C42] rounded-full"
                        style={{ width: `${progress}%` }}
                        layoutId="rendering_progress_bar"
                      />
                    </div>
                  </div>

                  <p className="text-[13px] text-[#C8B89F] leading-relaxed font-mono tracking-wide animate-pulse">
                    {progress < 30 ? "» Analyzing script intent and visual tone..."
                     : progress < 60 ? "» Mapping lighting paths, camera movement, and lens behavior..."
                     : progress < 85 ? "» Simulating depth, motion, glow, and atmosphere..."
                     : "» Rendering and composing the final cinematic frame plan..."}
                  </p>
                </motion.div>
              )}

              {/* CINEMATIC WIDESCREEN ACTIVE PLAYER SIMULATOR VIEWPORT */}
              {status === "SUCCESS" && activeScenario && activeScene && (
                <motion.div
                  key="success_player"
                  initial={{ opacity: 0, scale: 0.99 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full max-w-[850px] aspect-[2.35/1] rounded-xl overflow-hidden bg-black border border-[#544737] relative shadow-2xl shadow-black/80 flex flex-col justify-between"
                  style={{
                    boxShadow: `0 25px 50px -12px ${activeScenario.accentColor}08`
                  }}
                >
                  {/* Atmospheric particle layer overlay */}
                  {renderInteractiveParticles()}

                  {/* Shifting radial color backlights */}
                  <div 
                    className="absolute inset-0 pointer-events-none transition-all duration-1000 z-10"
                    style={{ background: activeScene.visualLayout.lightingGradient }}
                  />

                  {generatedVideoUrl ? (
                    <video
                      ref={videoRef}
                      src={generatedVideoUrl}
                      className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none z-0 brightness-[0.55]"
                      muted
                      loop
                      playsInline
                    />
                  ) : (
                    <img 
                      src={currentActor.url} 
                      alt="active actor snapshot mockup" 
                      className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none z-0 filter saturate-[0.7] brightness-[0.45] transition-all duration-[1200ms] grayscale"
                    />
                  )}

                  {/* TOP BANNER CORNER STATS OVERLAY IN MONITOR */}
                  <div className="p-4 flex items-center justify-between relative z-35 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono bg-[#3B2C19]/90 border border-[#FFB347]/60 text-[#FFCB7A] px-2.5 py-0.5 rounded uppercase font-bold tracking-wider">
                        PREVIEW ACTIVE
                      </span>
                      <span className="text-xs font-mono text-[#F0E1C8] bg-black/40 px-2 py-0.5 rounded truncate max-w-[240px] block">
                        {lensType} • {cameraMovement}
                      </span>
                    </div>

                    <div className="bg-black/40 px-2 py-0.5 rounded text-xs font-mono text-[#F0E1C8]">
                      24.00 FPS • PRORES RAW
                    </div>
                  </div>

                  {renderNotice && (
                    <div className="absolute top-12 left-4 right-4 z-45 rounded-lg border border-[#FF8C42]/40 bg-black/70 px-3 py-2 text-xs font-bold text-[#FF8C42] backdrop-blur-sm">
                      {renderNotice}
                    </div>
                  )}

                  {/* ACTIVE SYNCHRONIZED MIDDLE SUBTITLE OR SENTENCE */}
                  <div className="px-6 py-2 text-center relative z-40 max-w-xl mx-auto pointer-events-none bg-black/20 backdrop-blur-[1px] rounded-xl">
                    <p className="text-white text-xs md:text-sm font-black tracking-wide leading-relaxed filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                      {activeSubtitle || " "}
                    </p>
                  </div>

                  {/* BOTTOM TIMELINE AND SOUND CONTEXT CONTROLLER */}
                  <div className="p-4 relative z-45 bg-gradient-to-t from-black/95 to-transparent flex flex-col gap-3">
                    
                    {/* Media Seekable Timeline Bar */}
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] font-mono text-[#C8B89F] w-10">00:00</span>
                      <div className="flex-1 h-1 bg-[#302920] rounded-full relative overflow-hidden group hover:h-1.5 transition-all cursor-pointer">
                        <div 
                          className="h-full bg-[#FFB347] rounded-full transition-all"
                          style={{ width: `${Math.min(100, (currentTime / playbackDuration) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[13px] font-mono text-[#C8B89F] w-10 text-right">
                        00:{String(playbackDuration).padStart(2, "0")}
                      </span>
                    </div>

                    {/* Left/Right actions inside player */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setIsPlaying(!isPlaying)}
                          className="w-7 h-7 bg-[#302920] border border-[#D6A84F] hover:bg-[#3B3328] text-[#FFF8EA] hover:text-white rounded-lg flex items-center justify-center transition-colors outline-none"
                        >
                          {isPlaying ? <Pause size={11} /> : <Play size={11} className="relative left-[1px]" />}
                        </button>
                        <button 
                          onClick={() => setCurrentTime(0)}
                          className="w-7 h-7 bg-[#302920] border border-[#D6A84F] hover:bg-[#3B3328] text-[#FFF8EA] hover:text-white rounded-lg flex items-center justify-center transition-colors outline-none"
                        >
                          <RotateCcw size={11} />
                        </button>

                        <div className="h-3 w-[1px] bg-[#302920] mx-1" />

                        {/* Volume settings */}
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setIsMuted(!isMuted)}
                            className="text-[#F0E1C8] hover:text-white transition-colors outline-none"
                          >
                            {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                          </button>
                          <input 
                            type="range"
                            min="0"
                            max="100"
                            value={isMuted ? 0 : soundVolume}
                            onChange={(e) => {
                              setSoundVolume(Number(e.target.value));
                              setIsMuted(false);
                            }}
                            className="w-12 h-1 bg-[#24201B] rounded-lg appearance-none cursor-pointer accent-[#FFB347]"
                          />
                        </div>
                      </div>

                      <div className="text-xs font-mono text-[#C8B89F] flex items-center gap-2">
                        <span>AUDIO: {generatedAudioUrl ? "ELEVENLABS PREVIEW READY" : `PREVIEW MIX (${activeScene.soundEffects})`}</span>
                        <span>•</span>
                        <span className="text-[#FFB347] font-bold uppercase">SEC: {currentTime.toFixed(1)}s</span>
                      </div>
                    </div>

                  </div>

                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* DYNAMIC SELECTION STATUS LABELS/PILLS ROW */}
          <div className="max-w-[850px] mx-auto w-full mb-3 flex flex-wrap items-center justify-center gap-2 pointer-events-auto">
            <button
              onClick={() => setActiveModal("genre")}
              className={`px-3 py-1.5 rounded-full border text-[12px] font-bold flex items-center gap-1.5 transition-all duration-200 outline-none backdrop-blur-md ${
                activeModal === "genre"
                  ? "bg-[#3B2C19] text-[#FFCB7A] border-[#FFB347]/70 shadow-lg shadow-[#FFB347]/10"
                  : "bg-[#302920]/70 border-[#544737] hover:bg-[#302920] hover:border-[#D6A84F] text-[#F0E1C8] hover:text-white hover:-translate-y-px"
              }`}
            >
              <div
                className="w-2 h-2 rounded-full inline-block filter blur-[1px] animate-pulse"
                style={{ background: activeGenreObj.color }}
              />
              <span>Mood: <span className="font-mono text-[#FFB347]">{activeGenreObj.id}</span></span>
            </button>

            <button
              onClick={() => setActiveModal("style")}
              className={`px-3 py-1.5 rounded-full border text-[12px] font-bold flex items-center gap-1.5 transition-all duration-200 outline-none backdrop-blur-md ${
                activeModal === "style"
                  ? "bg-[#FF8C42]/12 text-[#FF8C42] border-[#FF8C42]/50 shadow-lg shadow-[#FF8C42]/10"
                  : "bg-[#302920]/70 border-[#544737] hover:bg-[#302920] hover:border-[#D6A84F] text-[#F0E1C8] hover:text-white hover:-translate-y-px"
              }`}
            >
              <Sliders size={11} className="text-[#FF8C42]" />
              <span>Grade: <span className="font-mono text-[#FFB347]">{colorPalette === "Auto" ? "Auto" : colorPalette.split(" ")[0]}</span></span>
            </button>

            <button
              onClick={() => setActiveModal("camera")}
              className={`px-3 py-1.5 rounded-full border text-[12px] font-bold flex items-center gap-1.5 transition-all duration-200 outline-none backdrop-blur-md ${
                activeModal === "camera"
                  ? "bg-[#3B2C19] text-[#FFB347] border-[#FFB347]/50 shadow-lg shadow-[#FFB347]/10"
                  : "bg-[#302920]/70 border-[#544737] hover:bg-[#302920] hover:border-[#D6A84F] text-[#F0E1C8] hover:text-white hover:-translate-y-px"
              }`}
            >
              <Camera size={11} className="text-[#FFB347]" />
              <span>Shoot: <span className="font-mono text-[#FFB347]">{getShortLens(lensType)} · {getShortMovement(cameraMovement)}</span></span>
            </button>

            <button
              onClick={() => setActiveModal("casting")}
              className={`px-3 py-1.5 rounded-full border text-[12px] font-bold flex items-center gap-1.5 transition-all duration-200 outline-none backdrop-blur-md ${
                activeModal === "casting"
                  ? "bg-[#3B2C19] text-[#F6D58B] border-[#F6D58B]/50 shadow-lg shadow-[#F6D58B]/10"
                  : "bg-[#302920]/70 border-[#544737] hover:bg-[#302920] hover:border-[#D6A84F] text-[#F0E1C8] hover:text-white hover:-translate-y-px"
              }`}
            >
              <UserCheck size={11} className="text-[#F6D58B]" />
              <span>Cast: <span className="font-mono text-[#FFB347]">{getShortCast(currentActor.name)}</span></span>
            </button>

            <button
              onClick={() => setActiveModal("voice")}
              className={`px-3 py-1.5 rounded-full border text-[12px] font-bold flex items-center gap-1.5 transition-all duration-200 outline-none backdrop-blur-md ${
                activeModal === "voice"
                  ? "bg-[#4A251D] text-[#F2A38F] border-[#D9754F]/50 shadow-lg shadow-[#D9754F]/10"
                  : "bg-[#302920]/70 border-[#544737] hover:bg-[#302920] hover:border-[#D6A84F] text-[#F0E1C8] hover:text-white hover:-translate-y-px"
              }`}
            >
              <span className="text-[#D9754F] text-[12px]">🎙️</span>
              <span>Voice: <span className="font-mono text-[#FFB347]">{getShortVoice(currentActor.voice)}</span></span>
            </button>
          </div>

          {/* 3. SLICK RUNWAY-STYLE GENERATE INPUT BAR */}
          <div id="footer_generate_ribbon" className="max-w-[850px] mx-auto w-full bg-[#24201B] border border-[#544737] rounded-xl p-3 shadow-2xl relative z-40">
            
            {/* Input Row */}
            {/* Input Row */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setActiveModal("casting")}
                title="Add or synthesize an actor"
                className="w-10 h-10 bg-[#302920] hover:bg-[#3B3328] border border-[#544737]/70 rounded-lg flex items-center justify-center text-[#F0E1C8] hover:text-white transition-colors"
              >
                <Plus size={16} />
              </button>

              <div className="flex-1 min-w-0 pr-1">
                <input 
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the cinematic scene in detail... e.g., A vintage car cruising down the neon-drenched streets under heavy rain"
                  className="w-full bg-transparent text-sm text-white focus:outline-none placeholder:text-[#8A7964] text-left font-sans"
                />
              </div>

              <button
                onClick={triggerRender}
                disabled={status === "RENDERING"}
                className={`relative overflow-hidden h-10 px-5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all duration-300 outline-none ${
                  status === "RENDERING"
                    ? "bg-[#544737] text-[#C8B89F] cursor-not-allowed cine-shuttering"
                    : "bg-gradient-to-br from-[#FFB347] to-[#FF8C42] hover:from-[#FFCB7A] hover:to-[#FFA460] text-black shadow-lg shadow-[#FFB347]/30 hover:shadow-[#FFB347]/50 hover:-translate-y-px font-extrabold cursor-pointer"
                }`}
              >
                <span className="cine-shutter-top" aria-hidden />
                <span className="cine-shutter-bottom" aria-hidden />
                <span className="relative z-10 flex items-center gap-1.5">
                  Render Scene ✦
                  <Sparkles size={12} className="relative top-[-0.5px]" />
                </span>
              </button>
            </div>

            {/* Subtitles Input Option Panel and pills row info below */}
            <div className="mt-2.5 pt-2 border-t border-[#121322] flex flex-wrap items-center justify-between gap-2.5">
              
              <div className="flex items-center gap-1.5">
                <Mic size={11} className="text-[#C8B89F]" />
                <input 
                  type="text"
                  value={dialogueText}
                  onChange={(e) => setDialogueText(e.target.value)}
                  placeholder="Voice-dub dialogue or attached subtitles..."
                  className="bg-transparent text-sm text-[#F0E1C8] focus:outline-none placeholder:text-[#8A7964] text-left w-[200px] md:w-[320px] font-sans"
                />
              </div>

              {/* Setting Quick pills */}
              <div className="flex items-center flex-wrap gap-1.5 justify-end">
                
                {/* 1. Cinematic Engine Model Selector */}
                <div className="relative cine-dropdown-container">
                  <button 
                    onClick={() => setActiveDropdown(activeDropdown === "model" ? null : "model")}
                    className={`px-2.5 py-1.5 rounded text-[13px] font-sans font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                      activeDropdown === "model" 
                        ? "bg-[#3B2C19] border border-[#FFB347] text-[#FFCB7A] shadow-md shadow-black/30" 
                        : "bg-[#24201B] hover:bg-[#24201B]/85 border border-[#544737] text-[#FFF8EA] hover:text-white"
                    }`}
                  >
                    <span>🎬 {activeModelObj.name}</span>
                    <ChevronDown size={10} className={`text-[#C8B89F] transition-transform ${activeDropdown === "model" ? "rotate-180 text-[#FFB347]" : ""}`} />
                  </button>

                  {activeDropdown === "model" && (
                    <div className="cine-dd-panel cine-open absolute bottom-9 left-1/2 md:-left-12 -translate-x-[40%] md:translate-x-0 w-80 max-h-[380px] overflow-y-auto bg-[#F8F1E4] border border-[#D6A84F] rounded-xl p-2.5 shadow-2xl shadow-black/45 z-50 text-left font-sans animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <div className="text-[13px] text-[#3A2B1D] font-extrabold pb-2 border-b border-[#D9C6A7] mb-2 font-mono flex items-center justify-between px-1">
                        <span className="text-[11px] uppercase tracking-[0.2em] text-[#FFB347] font-mono">CINEMATIC MODEL DIRECTORY</span>
                        <span className="text-[11px] text-[#6B4D2E] uppercase tracking-wider">Select Engine</span>
                      </div>
                      <div className="space-y-3">
                        {(Array.from(new Set(CINEMA_MODELS.map(getModelCategory))) as string[]).map((cat, catIdx) => {
                          const catModels = CINEMA_MODELS.filter(m => getModelCategory(m) === cat);
                          return (
                            <div key={cat} className="space-y-1">
                              <div className="text-[10px] font-mono font-bold text-[#7C6040] tracking-[0.18em] text-left uppercase px-2 py-0.5 border-l-2 border-[#D6A84F]">
                                • {cat}
                              </div>
                              <div className="space-y-0.5">
                                {catModels.map((model, mIdx) => {
                                  const isSelected = selectedModelId === model.id;
                                  const itemIndex = catIdx * 4 + mIdx;
                                  return (
                                    <button
                                      key={model.id}
                                      onClick={() => {
                                        setSelectedModelId(model.id);
                                        setActiveDropdown(null);
                                      }}
                                      style={{ animationDelay: `${itemIndex * 35}ms` }}
                                      className={`cine-dd-item w-full text-right px-2.5 py-1.5 rounded-md text-[13px] transition-all flex items-center justify-between cursor-pointer ${
                                        isSelected
                                          ? "bg-[#F1DFAE] text-[#2B2118] border border-[#D6A84F] font-bold shadow-inner shadow-[#D6A84F]/20"
                                          : "text-[#3A2B1D] hover:text-[#17120E] hover:bg-[#EFE2CC] border border-transparent hover:border-[#D6A84F]/40"
                                      }`}
                                    >
                                      {/* Left badges column */}
                                      <div className="flex items-center gap-1 font-mono text-[10px]" dir="ltr">
                                        {model.capabilities.max_reference_images > 0 && (
                                          <span className="px-1.5 py-[2px] rounded bg-[#FFB347]/10 border border-[#FFB347]/30 text-[#FFB347] font-bold tracking-wider">REF×{model.capabilities.max_reference_images}</span>
                                        )}
                                        {model.badge && (
                                          <span className={`px-1.5 py-[2px] rounded font-bold tracking-wider ${
                                            model.badge === "TOP" ? "bg-[#FFF7DD] border border-[#D6A84F] text-[#9A5B12]" :
                                            model.badge === "PRO" ? "bg-[#F4D8B4] border border-[#C9823B] text-[#8A3F14]" :
                                            model.badge === "FAST" ? "bg-[#EAF1D5] border border-[#A9B86A] text-[#5B681F]" :
                                            "bg-[#F6E7C8] border border-[#D6A84F] text-[#7C6040]"
                                          }`}>
                                            {model.badge}
                                          </span>
                                        )}
                                      </div>

                                      {/* Right name column */}
                                      <div className="flex items-center gap-2">
                                        <span className="text-[13px] font-medium">{model.name}</span>
                                        <span className={`w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor] ${
                                          model.family === "kling" ? "bg-[#D6A84F] text-[#D6A84F]" :
                                          model.family === "hailuo" ? "bg-[#C9823B] text-[#C9823B]" :
                                          model.family === "sora" ? "bg-[#9A5B12] text-[#9A5B12]" :
                                          model.family === "veo" ? "bg-[#B67C32] text-[#B67C32]" :
                                          model.family === "seedance" ? "bg-[#A9B86A] text-[#A9B86A]" :
                                          "bg-[#D9754F] text-[#D9754F]"
                                        }`} />
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Duration Selector */}
                <div className="relative cine-dropdown-container">
                  <button 
                    onClick={() => setActiveDropdown(activeDropdown === "duration" ? null : "duration")}
                    className={`px-2 py-1 bg-[#24201B] border border-[#544737] rounded text-xs font-mono text-[#F0E1C8] hover:text-white transition-colors flex items-center gap-1 cursor-pointer`}
                  >
                    <span>⏱️ {duration}</span>
                    <ChevronDown size={8} className="text-[#8A7964]" />
                  </button>

                  {activeDropdown === "duration" && (
                    <div className="absolute bottom-9 right-0 md:-right-8 w-52 bg-[#F8F1E4] border border-[#D6A84F] rounded-lg p-1.5 shadow-2xl shadow-black/40 z-50 text-right font-sans">
                      <div className="text-xs text-[#6B4D2E] pb-1 mb-1 border-b border-[#D9C6A7] px-1.5 font-bold">Select render duration</div>
                      <div className="space-y-0.5">
                        {durationOptions.map((opt) => {
                          const isSelected = duration === opt.value;
                          
                          return (
                            <button
                              key={opt.value}
                              onClick={() => {
                                setDuration(opt.value);
                                setActiveDropdown(null);
                              }}
                              className={`w-full text-right px-2 py-1 rounded text-[13px] transition-all flex items-center justify-between cursor-pointer ${
                                isSelected 
                                  ? "bg-[#F1DFAE] text-[#2B2118] font-bold" 
                                  : "text-[#3A2B1D] hover:text-[#17120E] hover:bg-[#EFE2CC]"
                              }`}
                            >
                              <span className="text-[13px] font-bold font-mono px-1 rounded bg-[#FFF7DD] text-[#9A5B12]">
                                OK
                              </span>
                              <span>{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Resolution Selector */}
                <div className="relative cine-dropdown-container">
                  <button 
                    onClick={() => setActiveDropdown(activeDropdown === "resolution" ? null : "resolution")}
                    className={`px-2 py-1 bg-[#24201B] border border-[#544737] rounded text-xs font-mono text-[#F0E1C8] hover:text-white transition-colors flex items-center gap-1 cursor-pointer`}
                  >
                    <span>📐 {resolution}</span>
                    <ChevronDown size={8} className="text-[#8A7964]" />
                  </button>

                  {activeDropdown === "resolution" && (
                    <div className="absolute bottom-9 right-0 md:-right-8 w-44 bg-[#F8F1E4] border border-[#D6A84F] rounded-lg p-1.5 shadow-2xl shadow-black/40 z-50 text-right font-sans">
                      <div className="text-xs text-[#6B4D2E] pb-1 mb-1 border-b border-[#D9C6A7] px-1.5 font-bold">AI output resolution</div>
                      <div className="space-y-0.5">
                        {resolutionOptions.map((opt) => {
                          const isSelected = resolution === opt.value;
                          return (
                            <button
                              key={opt.value}
                              onClick={() => {
                                setResolution(opt.value);
                                setActiveDropdown(null);
                              }}
                              className={`w-full text-right px-2 py-1 rounded text-[13px] transition-all cursor-pointer ${
                                isSelected ? "bg-[#F1DFAE] text-[#2B2118] font-bold" : "text-[#3A2B1D] hover:text-[#17120E] hover:bg-[#EFE2CC]"
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Aspect Ratio Selector */}
                <div className="relative cine-dropdown-container">
                  <button 
                    onClick={() => setActiveDropdown(activeDropdown === "ratio" ? null : "ratio")}
                    className={`px-2 py-1 bg-[#24201B] border border-[#544737] rounded text-xs font-mono text-[#F0E1C8] hover:text-white transition-colors flex items-center gap-1 cursor-pointer`}
                  >
                    <span>🎞️ {aspectRatio}</span>
                    <ChevronDown size={8} className="text-[#8A7964]" />
                  </button>

                  {activeDropdown === "ratio" && (
                    <div className="absolute bottom-9 right-0 md:-right-8 w-48 bg-[#F8F1E4] border border-[#D6A84F] rounded-lg p-1.5 shadow-2xl shadow-black/40 z-50 text-right font-sans">
                      <div className="text-xs text-[#6B4D2E] pb-1 mb-1 border-b border-[#D9C6A7] px-1.5 font-bold">Frame and scene aspect</div>
                      <div className="space-y-0.5">
                        {aspectRatioOptions.map((opt) => {
                          const isSelected = aspectRatio === opt.value;
                          return (
                            <button
                              key={opt.value}
                              onClick={() => {
                                setAspectRatio(opt.value);
                                setActiveDropdown(null);
                              }}
                              className={`w-full text-right px-2 py-1 rounded text-[13px] transition-all cursor-pointer ${
                                isSelected ? "bg-[#F1DFAE] text-[#2B2118] font-bold" : "text-[#3A2B1D] hover:text-[#17120E] hover:bg-[#EFE2CC]"
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. Speed Selector */}
                <div className="relative cine-dropdown-container">
                  <button 
                    onClick={() => setActiveDropdown(activeDropdown === "speed" ? null : "speed")}
                    className={`px-2 py-1 bg-[#24201B] border border-[#544737] rounded text-xs font-mono text-[#F0E1C8] hover:text-white transition-colors flex items-center gap-1 cursor-pointer`}
                  >
                    <span>⚡ Speed: {batchSize}</span>
                    <ChevronDown size={8} className="text-[#8A7964]" />
                  </button>

                  {activeDropdown === "speed" && (
                    <div className="absolute bottom-9 right-0 w-52 bg-[#F8F1E4] border border-[#D6A84F] rounded-lg p-1.5 shadow-2xl shadow-black/40 z-50 text-right font-sans text-right">
                      <div className="text-xs text-[#6B4D2E] pb-1 mb-1 border-b border-[#D9C6A7] px-1.5 font-bold">Batch and speed mode</div>
                      <div className="space-y-0.5">
                        {SPEED_OPTIONS.map((opt) => {
                          const isSelected = batchSize === opt.value;
                          return (
                            <button
                              key={opt.value}
                              onClick={() => {
                                setBatchSize(opt.value);
                                setActiveDropdown(null);
                              }}
                              className={`w-full text-right px-2 py-1 rounded text-[13px] transition-all cursor-pointer ${
                                isSelected ? "bg-[#F1DFAE] text-[#2B2118] font-bold" : "text-[#3A2B1D] hover:text-[#17120E] hover:bg-[#EFE2CC]"
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

              </div>

              <div className="w-full flex flex-wrap items-center gap-2 text-sm text-[#F0E1C8]">
                {activeModelObj.capabilities.max_reference_images > 0 && (
                  <label className="px-2 py-1 rounded border border-[#544737] bg-[#24201B] hover:border-[#FFB347]/70 cursor-pointer">
                    Ref images {referenceImages.length}/{activeModelObj.capabilities.max_reference_images}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleReferenceUpload(e.target.files)}
                    />
                  </label>
                )}

                {activeModelObj.capabilities.has_end_frame && (
                  <label className="px-2 py-1 rounded border border-[#544737] bg-[#24201B] hover:border-[#FFB347]/70 cursor-pointer">
                    {endFrameUrl ? "End frame ready" : "End frame"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleEndFrameUpload(e.target.files)} />
                  </label>
                )}

                {activeModelObj.capabilities.has_negative_prompt && (
                  <input
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="Negative prompt"
                    className="min-w-[150px] flex-1 bg-[#24201B] border border-[#544737] rounded px-2 py-1 text-sm text-[#FFF8EA] outline-none focus:border-[#D6A84F]"
                  />
                )}

                {activeModelObj.capabilities.has_cfg_scale && (
                  <label className="flex items-center gap-2 px-2 py-1 rounded border border-[#544737] bg-[#24201B]">
                    CFG {cfgScale.toFixed(1)}
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={cfgScale}
                      onChange={(e) => setCfgScale(Number(e.target.value))}
                      className="w-20 accent-[#FFB347]"
                    />
                  </label>
                )}

                {activeModelObj.capabilities.has_seed && (
                  <input
                    value={seed}
                    onChange={(e) => setSeed(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="Seed"
                    className="w-24 bg-[#24201B] border border-[#544737] rounded px-2 py-1 text-sm text-[#FFF8EA] outline-none focus:border-[#D6A84F]"
                  />
                )}

                {activeModelObj.capabilities.has_sound && (
                  <button
                    type="button"
                    onClick={() => setSoundEnabled((v) => !v)}
                    className={`px-2 py-1 rounded border font-bold ${soundEnabled ? "border-[#FFB347]/50 bg-[#FFB347]/15 text-[#FFB347]" : "border-[#544737] bg-[#24201B] text-[#C8B89F]"}`}
                  >
                    Sound {soundEnabled ? "ON" : "OFF"}
                  </button>
                )}

                {activeModelObj.family === "grok" && (
                  <select
                    value={grokMode}
                    onChange={(e) => setGrokMode(e.target.value as "fun" | "normal" | "spicy")}
                    className="bg-[#24201B] border border-[#544737] rounded px-2 py-1 text-sm text-[#FFF8EA] outline-none"
                  >
                    <option value="normal">Grok normal</option>
                    <option value="fun">Grok fun</option>
                    <option value="spicy">Grok spicy</option>
                  </select>
                )}

                <span className="ml-auto px-2 py-1 rounded border border-[#FF8C42]/40 bg-[#FF8C42]/10 text-[#FF8C42] font-mono">
                  Est. {estimatedCredits || 1} credits
                </span>
              </div>

            </div>

          </div>

        </section>

      </div>

      {/* 4. MODALS OVERLAYS DRAWER SYSTEM (GLASSMORPHIC CARDS) */}
      <AnimatePresence>
        {activeModal !== null && (
          <div 
            id="modal_backdrop_layer" 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4"
            onClick={() => setActiveModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.45 }}
              className="w-full max-w-2xl bg-[#24201B]/95 border border-[#544737] rounded-2xl overflow-hidden shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              
              {/* Header inside popup */}
              <div className="h-12 bg-[#24201B]/85 border-b border-[#544737] px-4 flex items-center justify-between">
                <span className="text-xs font-bold text-[#FFF8EA] flex items-center gap-1.5 uppercase font-mono">
                  {activeModal === "genre" && "🎭 Genre Studio Settings"}
                  {activeModal === "style" && "💡 Color & Lighting presets"}
                  {activeModal === "camera" && "🎥 Professional Lens and Movement Matrix"}
                  {activeModal === "casting" && "👥 Studio Casting Room"}
                  {activeModal === "ai_director" && "💬 Smart AI Cinematic Director assistant"}
                  {activeModal === "voice" && "🎙️ Voice Studio & Dubbing Matrix"}
                </span>
                <button 
                  onClick={() => setActiveModal(null)}
                  className="w-7 h-7 bg-[#302920] hover:bg-[#3B3328] rounded-md flex items-center justify-center text-[#F0E1C8] hover:text-white transition-colors outline-none"
                >
                  <X size={12} />
                </button>
              </div>

              {/* Modal Contents based on type */}
              <div className="p-6">
                
                {/* A. GENRE SELECT MODAL */}
                {activeModal === "genre" && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    
                    {/* Left artistic sphere representation */}
                    <div className="md:col-span-5 flex flex-col items-center justify-center py-4 bg-[#24201B]/70 rounded-xl border border-[#544737]/60">
                      <motion.div 
                        animate={{ 
                          scale: [1, 1.05, 1],
                          rotate: [0, 180, 360]
                        }}
                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                        className="w-32 h-32 rounded-full filter blur-[24px] opacity-80"
                        style={{ background: activeGenreObj.color }}
                      />
                      <span className="text-[13px] font-mono text-[#C8B89F] mt-4 uppercase">Dynamic Mood Aura</span>
                      <span className="text-xs font-bold text-center mt-1 text-[#FFF8EA]">{activeGenreObj.arabicName}</span>
                    </div>

                    {/* Right scrolling items selection */}
                    <div className="md:col-span-7 space-y-2 max-h-[290px] overflow-y-auto">
                      {AVAILABLE_GENRES.map((g) => {
                        const isChosen = selectedGenre === g.id;
                        return (
                          <button
                            key={g.id}
                            onClick={() => {
                              setSelectedGenre(g.id);
                              // Trigger procedural scenes refresh immediately for nice user feel
                              generateClientScene(prompt, dialogueText, cameraMovement, lensType, g.id);
                            }}
                            className={`w-full text-left p-3 rounded-lg border flex items-center justify-between gap-3 transition-colors outline-none ${
                              isChosen 
                                ? "bg-[#3B2C19] border-[#FFB347]/70" 
                                : "bg-[#24201B]/60 border-[#544737]/80 hover:bg-[#302920]/70 hover:border-[#D6A84F]"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-black text-white block leading-tight">
                                {g.arabicName}
                              </span>
                              <span className="text-[13px] text-[#C8B89F] block leading-tight mt-1">
                                {g.desc}
                              </span>
                            </div>
                            {isChosen && <div className="w-2 h-2 rounded-full bg-[#FFB347]" />}
                          </button>
                        );
                      })}
                    </div>

                  </div>
                )}

                {/* B. STYLE SETTINGS MODAL */}
                {activeModal === "style" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Column 1: COLOR PALETTE */}
                    <div className="space-y-3">
                      <span className="text-[13px] font-bold text-[#F0E1C8] uppercase font-mono block border-b border-[#544737] pb-1.5">Palette LUTs</span>
                      <div className="flex flex-col gap-2">
                        {["Auto", "Hollywood Teal-Orange", "Neo-Noir Shadow", "Warm Sun Vintage", "Cyberpunk Neon", "Desaturated Iron"].map((p) => (
                          <button
                            key={p}
                            onClick={() => setColorPalette(p)}
                            className={`w-full text-left p-2 rounded-lg text-xs font-bold transition-all outline-none ${
                              colorPalette === p
                                ? "bg-[#3B2C19] text-[#FFCB7A] border border-[#FFB347]/70"
                                : "bg-[#24201B]/60 text-[#F0E1C8] border border-[#544737]/80 hover:bg-[#302920]/70"
                            }`}
                          >
                            {p === "Auto" ? "⚙️ Default (Auto-LUT)" : p}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Column 2: LIGHTING SYSTEM */}
                    <div className="space-y-3">
                      <span className="text-[13px] font-bold text-[#F0E1C8] uppercase font-mono block border-b border-[#544737] pb-1.5">Ambient Lights</span>
                      <div className="flex flex-col gap-2">
                        {["Auto", "Volumetric Foggy", "High-Contrast Chiaroscuro", "Golden Sunset", "Low-key Midnight"].map((l) => (
                          <button
                            key={l}
                            onClick={() => setLightingStyle(l)}
                            className={`w-full text-left p-2 rounded-lg text-xs font-bold transition-all outline-none ${
                              lightingStyle === l
                                ? "bg-[#3B2C19] text-[#FFCB7A] border border-[#FFB347]/70"
                                : "bg-[#24201B]/60 text-[#F0E1C8] border border-[#544737]/80 hover:bg-[#302920]/70"
                            }`}
                          >
                            {l === "Auto" ? "⚙️ Default (Auto-Light)" : l}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Column 3: CAMERA MOVESET */}
                    <div className="space-y-3">
                      <span className="text-[13px] font-bold text-[#F0E1C8] uppercase font-mono block border-b border-[#544737] pb-1.5">Cam Moveset Speed</span>
                      <div className="flex flex-col gap-2">
                        {["Auto", "Steady Grounded", "Documentary Jitter", "Dreamy Flying", "Suspense Snapping"].map((c) => (
                          <button
                            key={c}
                            onClick={() => setCameraMovesetStyle(c)}
                            className={`w-full text-left p-2 rounded-lg text-xs font-bold transition-all outline-none ${
                              cameraMovesetStyle === c
                                ? "bg-[#3B2C19] text-[#FFCB7A] border border-[#FFB347]/70"
                                : "bg-[#24201B]/60 text-[#F0E1C8] border border-[#544737]/80 hover:bg-[#302920]/70"
                            }`}
                          >
                            {c === "Auto" ? "⚙️ Default (Auto-Moveset)" : c}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                )}

                {/* C. PROFESSIONAL LENS & MOVEMENT DIRECTIVE (EXHAUSTIVE & WITH PHOTO CARDS) */}
                {activeModal === "camera" && (
                  <div className="space-y-6">
                    
                    {/* C1. ALL LENSES SECTION WITH SPECIFIC DESCRIPTIVE IMAGE */}
                    <div>
                      <span className="text-[13px] font-bold text-[#FFB347] uppercase font-mono tracking-wider block border-b border-[#544737] pb-2 mb-3">
                        🔍 Available Cinematic Lenses
                      </span>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[220px] overflow-y-auto pr-1">
                        {AVAILABLE_LENSES.map((l) => {
                          const isActive = lensType === l.id;
                          return (
                            <button
                              key={l.id}
                              onClick={() => {
                                setLensType(l.id);
                                generateClientScene(prompt, dialogueText, cameraMovement, l.id, selectedGenre);
                              }}
                              className={`p-2.5 rounded-xl border text-left transition-all duration-200 outline-none flex flex-col justify-between h-[155px] ${
                                isActive
                                  ? "border-[#FFB347] bg-[#FFB347]/10"
                                  : "border-[#544737] bg-[#24201B]/80 hover:bg-[#302920]/70 hover:border-[#D6A84F]"
                              }`}
                            >
                              <div className="relative w-full h-16 rounded overflow-hidden mb-1.5 flex-shrink-0">
                                <img src={l.url} alt={l.name} className="w-full h-full object-cover select-none pointer-events-none grayscale" />
                                <div className="absolute top-1 left-1 bg-black/60 px-1 py-0.2 rounded text-[13px] text-[#FFF8EA] font-mono tracking-wide">{l.tStop}</div>
                              </div>
                              <div className="min-w-0 w-full mt-auto">
                                <span className="text-[13px] font-black text-[#FFF8EA] block truncate leading-tight">
                                  {l.arabicName}
                                </span>
                                <span className="text-[13px] text-[#C8B89F] block truncate leading-tight mt-0.5">
                                  {l.lensCategory}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* C2. ALL CAMERA MOVEMENTS SECTION WITH DESCRIPTION IMAGE */}
                    <div>
                      <span className="text-[13px] font-bold text-[#FF8C42] uppercase font-mono tracking-wider block border-b border-[#544737] pb-2 mb-3">
                        🎥 Available Camera Movements
                      </span>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[220px] overflow-y-auto pr-1">
                        {AVAILABLE_MOVEMENTS.map((mv) => {
                          const isActive = cameraMovement === mv.id;
                          return (
                            <button
                              key={mv.id}
                              onClick={() => {
                                setCameraMovement(mv.id);
                                generateClientScene(prompt, dialogueText, mv.id, lensType, selectedGenre);
                              }}
                              className={`p-2.5 rounded-xl border text-left transition-all duration-200 outline-none flex flex-col justify-between h-[155px] ${
                                isActive
                                  ? "border-[#FF8C42] bg-[#FF8C42]/10"
                                  : "border-[#544737] bg-[#24201B]/80 hover:bg-[#302920]/70 hover:border-[#D6A84F]"
                              }`}
                            >
                              <div className="relative w-full h-16 rounded overflow-hidden mb-1.5 flex-shrink-0">
                                <img src={mv.url} alt={mv.name} className="w-full h-full object-cover select-none pointer-events-none grayscale" />
                              </div>
                              <div className="min-w-0 w-full mt-auto">
                                <span className="text-[13px] font-black text-[#FFF8EA] block truncate leading-tight">
                                  {mv.arabicName}
                                </span>
                                <span className="text-[13px] text-[#C8B89F] block truncate leading-tight mt-0.5">
                                  {mv.intensity}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                )}

                {/* D. CASTING MATRIX & AI CHARACTER GENERATION LAB */}
                {activeModal === "casting" && (
                  <div className="space-y-4">
                    
                    {/* Visual Tab Layout selection internally */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                      
                      {/* Left: Pre-configured Active Actors roster */}
                      <div className="md:col-span-7 space-y-3">
                        <span className="text-[13px] font-bold text-[#F0E1C8] uppercase font-mono block border-b border-[#544737] pb-1.5">
                          Active Studio Cast Roster ({castingActors.length})
                        </span>

                        <div className="grid grid-cols-3 gap-2 max-h-[250px] overflow-y-auto pr-1">
                          {castingActors.map((actor) => {
                            const isSelected = selectedCharId === actor.id;
                            const isC = actor.id.includes("custom");
                            return (
                              <button
                                key={actor.id}
                                onClick={() => {
                                  setSelectedCharId(actor.id);
                                  generateClientScene(prompt, dialogueText, cameraMovement, lensType, selectedGenre);
                                }}
                                className={`p-1.5 rounded-xl border flex flex-col items-center text-center justify-between transition-all duration-200 h-[115px] outline-none ${
                                  isSelected
                                    ? "border-[#FFB347] bg-[#FFB347]/8"
                                    : "border-[#544737] bg-[#24201B]/80 hover:bg-[#302920]/70 hover:border-[#D6A84F]"
                                }`}
                              >
                                <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                                  <img src={actor.url} alt={actor.name} className="w-full h-full object-cover grayscale" />
                                </div>
                                <div className="text-center w-full min-w-0 mt-1">
                                  <span className="text-xs font-bold text-white block truncate leading-none">{actor.name}</span>
                                  <span className="text-[13px] text-[#D9754F]/90 font-medium block truncate mt-1" title={actor.voice}>
                                    🎙️ {actor.voice}
                                  </span>
                                  {isC && <span className="text-[13px] text-[#FFB347] block mt-0.5 uppercase">AI LAB</span>}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Current Actor Sound Control Sheet */}
                        <div className="mt-4 p-3 bg-[#24201B] rounded-xl border border-[#544737]/80 space-y-2 text-left">
                          <div className="flex items-center justify-between border-b border-[#544737] pb-1.5">
                            <span className="text-[13px] text-[#FFB347] font-mono font-bold tracking-wider">AUDIO MIX & VOICE DUB</span>
                            <span className="text-sm font-black text-[#FFF8EA]">🎙️ Manage & Select Actor Voices: {currentActor.name}</span>
                          </div>
                          
                          <div className="text-[13px] leading-relaxed text-[#F0E1C8] space-y-1 font-sans">
                            <div>
                              <span className="text-[#C8B89F] font-semibold">Current Selected Voice:</span>{" "}
                              <span className="text-[#FFB347] font-bold">{currentActor.voice}</span>
                            </div>
                            <p className="text-xs text-[#C8B89F] leading-tight">
                              Choose a default cinematic voice preset or enter a custom voice description to synthesize and assign it immediately:
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-[#544737]/60">
                            <div className="space-y-1 text-left">
                              <label className="text-xs text-[#C8B89F] block">Select Voice Preset</label>
                              <select 
                                value={currentActor.voice}
                                onChange={(e) => {
                                  assignPresetVoiceToActor(currentActor.id, e.target.value);
                                }}
                                className="bg-[#24201B] border border-[#D6A84F] text-[13px] rounded p-1.5 outline-none text-[#FFF8EA] w-full font-sans text-left"
                              >
                                {VOICE_PRESETS.map((voice) => (
                                  <option key={voice.voiceId} value={voice.label}>
                                    {voice.label} ({voice.lang})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-1 text-left">
                              <label className="text-xs text-[#C8B89F] block">Or Write Custom Voice Pattern</label>
                              <div className="flex gap-1.5">
                                <input 
                                  type="text"
                                  ref={activeActorVoiceInputRef}
                                  placeholder="e.g., voice with whispering echo..."
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const val = (e.currentTarget as HTMLInputElement).value;
                                      if (val.trim()) {
                                        assignCustomVoiceToActor(currentActor.id, val);
                                        (e.currentTarget as HTMLInputElement).value = "";
                                      }
                                    }
                                  }}
                                  className="bg-[#24201B] border border-[#D6A84F] px-2 py-1 rounded text-[13px] text-white focus:border-[#FFB347] outline-none w-full font-sans text-left"
                                />
                                <button 
                                  onClick={() => {
                                    const input = activeActorVoiceInputRef.current;
                                    const val = input ? input.value : "";
                                    if (val.trim()) {
                                      assignCustomVoiceToActor(currentActor.id, val);
                                      input.value = "";
                                    }
                                  }}
                                  className="px-3 bg-[#FFB347] hover:bg-[#FFCB7A] text-black text-xs rounded font-black cursor-pointer transition-colors"
                                >
                                  Apply
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Modern Actor procedural builder */}
                      <form onSubmit={buildCustomCharacterObj} className="md:col-span-12 lg:col-span-5 bg-[#24201B]/80 p-3.5 rounded-xl border border-[#544737] space-y-3 text-left">
                        <span className="text-[13px] font-bold text-[#FFB347] uppercase font-mono block border-b border-[#544737] pb-1 flex items-center gap-1">
                          🧪 Creator Lab (Synthetic Character Builder)
                        </span>

                        <div className="space-y-1">
                          <label className="text-xs text-[#C8B89F] uppercase block">Actor Name or Code</label>
                          <input 
                            type="text"
                            required
                            value={custName}
                            onChange={(e) => setCustName(e.target.value)}
                            placeholder="e.g., Sean Kenani"
                            className="w-full bg-[#24201B] border border-[#D6A84F] px-2 py-1.5 rounded text-xs text-white focus:border-[#FFB347] outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-xs text-[#C8B89F] block">Gender Roster</label>
                            <select 
                              value={custGender}
                              onChange={(e) => setCustGender(e.target.value)}
                              className="w-full bg-[#24201B] border border-[#544737] text-[13px] rounded p-1 outline-none text-[#FFF8EA]"
                            >
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                            </select>
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-xs text-[#C8B89F] block">Portrait Concept</label>
                            <select 
                              value={custPicUrl}
                              onChange={(e) => setCustPicUrl(e.target.value)}
                              className="w-full bg-[#24201B] border border-[#544737] text-[13px] rounded p-1 outline-none text-[#FFF8EA]"
                            >
                              <option value="classic">Dramatic & Anticipating</option>
                              <option value="wise_old">Wise with Silver Beard</option>
                              <option value="cyber_glow">Futuristic Cyber Glow</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-[#C8B89F] block">Appearance & Attire Details</label>
                          <input 
                            type="text"
                            value={custStyle}
                            onChange={(e) => setCustStyle(e.target.value)}
                            placeholder="e.g., wet black trench coat, intense steel gaze..."
                            className="w-full bg-[#24201B] border border-[#D6A84F] px-2 py-1.5 rounded text-xs text-white focus:border-[#FFB347] outline-none"
                          />
                        </div>

                        {/* Voice Selection & Custom Addition */}
                        <div className="space-y-1.5 pt-2 border-t border-[#544737]/60 text-left">
                          <label className="text-xs text-[#FFB347] uppercase flex items-center gap-1 font-bold">
                            🎙️ Sourced Voice Pattern (Voice Synthesis)
                          </label>
                          <select 
                            value={custVoicePreset}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustVoicePreset(val);
                              if (val !== "custom") {
                                const preset = VOICE_PRESETS.find((voice) => voice.label === val);
                                setCustVoice(preset?.label ?? val);
                              } else {
                                setCustVoice("");
                              }
                            }}
                            className="w-full bg-[#24201B] border border-[#D6A84F] text-sm rounded p-2 outline-none text-[#FFF8EA] font-sans"
                          >
                            {VOICE_PRESETS.map((voice) => (
                              <option key={voice.voiceId} value={voice.label}>
                                {voice.label} ({voice.lang})
                              </option>
                            ))}
                            <option value="custom">✍️ Describe Custom Voice / Add Custom Description...</option>
                          </select>

                          {custVoicePreset === "custom" && (
                            <div className="space-y-1 mt-1">
                              <label className="text-xs text-[#C8B89F] block">Write the exact customized voice detail:</label>
                              <input 
                                type="text"
                                required
                                value={custVoice}
                                onChange={(e) => setCustVoice(e.target.value)}
                                placeholder="e.g., deep raspy whispered voice with a subtle Irish accent..."
                                className="w-full bg-[#24201B] border border-[#D6A84F] px-2 py-1.5 rounded text-xs text-white focus:border-[#FFB347] outline-none font-sans"
                              />
                            </div>
                          )}
                        </div>

                        {isGeneratingChar ? (
                          <div className="space-y-1.5 pt-1.5">
                            <div className="flex items-center justify-between text-[13px] font-mono text-[#FFB347]">
                              <span>AI synthesizing character profile... {charProgress}%</span>
                            </div>
                            <div className="h-0.5 bg-[#302920] rounded overflow-hidden">
                              <div className="h-full bg-[#FFB347]" style={{ width: `${charProgress}%` }} />
                            </div>
                          </div>
                        ) : (
                          <button
                            type="submit"
                            className="w-full py-2 bg-[#FFB347] hover:bg-[#FFCB7A] text-black font-bold text-xs rounded transition-colors"
                          >
                            Synthesize and Add Character to Roster 🧪
                          </button>
                        )}
                      </form>

                    </div>

                  </div>
                )}

                {/* VOICES SELECTION AND DUBBING STUDIO */}
                {activeModal === "voice" && (
                  <div className="space-y-4">
                    <p className="text-xs text-[#F0E1C8] leading-relaxed font-sans text-left">
                      🎙️ Voice Engineering & Dubbing Studio - Customize the vocal signature for <span className="text-[#D9754F] font-bold">{currentActor.name}</span>:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                      {/* Left: Current Actor Status & Profile */}
                      <div className="md:col-span-4 bg-[#24201B] border border-[#544737] rounded-xl p-4 flex flex-col items-center justify-center text-center">
                        <div className="relative w-16 h-16 rounded-full overflow-hidden border border-[#D6A84F] mb-3">
                          <img src={currentActor.url} alt={currentActor.name} className="w-full h-full object-cover grayscale" />
                        </div>
                        <h4 className="text-xs font-bold text-[#FFF8EA]">{currentActor.name}</h4>
                        <p className="text-[13px] text-[#C8B89F] mt-1">{currentActor.tagline}</p>
                        
                        <div className="mt-4 w-full bg-[#24201B] border border-[#544737] rounded-lg p-3 text-left">
                          <span className="text-xs text-[#C8B89F] uppercase block font-sans">Active Voice Setting</span>
                          <span className="text-sm font-bold text-[#D9754F] block mt-1 leading-tight break-all font-sans">
                            {currentActor.voice}
                          </span>
                        </div>
                      </div>

                      {/* Right: Sound presets selection grid and additions builder */}
                      <div className="md:col-span-8 space-y-4 text-left">
                        <div className="space-y-2">
                          <span className="text-[13px] text-[#FFF8EA] font-bold block font-sans">Select a real ElevenLabs voice preset:</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                            {VOICE_PRESETS.map((v) => {
                              const isSelected = currentActor.voice === v.label;
                              return (
                                <button
                                  key={v.voiceId}
                                  onClick={() => {
                                    assignPresetVoiceToActor(currentActor.id, v.label);
                                  }}
                                  className={`p-2.5 rounded-lg border text-left transition-all duration-150 flex flex-col justify-between cursor-pointer ${
                                    isSelected
                                      ? "border-[#D9754F] bg-[#D9754F]/8"
                                      : "border-[#544737] bg-[#24201B]/80 hover:bg-[#302920]/70 hover:border-[#D6A84F]"
                                  }`}
                                >
                                  <span className="text-[13px] font-bold text-white block truncate">{v.label}</span>
                                  <span className="text-xs text-[#C8B89F] block leading-tight mt-1">{v.lang} - {v.desc}</span>
                                </button>
                              );
                            })}
                          </div>
                          <button
                            type="button"
                            onClick={() => previewVoice(selectedVoiceId)}
                            disabled={isPreviewingVoice || !dialogueText.trim()}
                            className="mt-2 px-3 py-2 rounded-lg bg-[#D9754F] hover:bg-[#F2A38F] disabled:bg-[#544737] disabled:text-[#C8B89F] text-white text-sm font-bold transition-colors"
                          >
                            {isPreviewingVoice ? "Previewing..." : "Preview Voice"}
                          </button>
                        </div>

                        {/* Custom voice descriptor input logic */}
                        <div className="bg-[#302920] border border-[#544737] rounded-xl p-3 space-y-2">
                          <span className="text-xs text-[#FFB347] uppercase flex items-center gap-1 font-bold">
                            ➕ Custom Voice Integration
                          </span>
                          <p className="text-xs text-[#C8B89F] leading-relaxed font-sans">
                            Describe the voice qualities, ages, or dialects, and the dubbing system will synthesize them instantly:
                          </p>
                          <div className="flex gap-2">
                            <input 
                              type="text"
                              ref={modalCustomVoiceInputRef}
                              placeholder="e.g., A child-like soft whisper recounting old memories with quiet grace..."
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const val = (e.currentTarget as HTMLInputElement).value;
                                  if (val.trim()) {
                                    assignCustomVoiceToActor(currentActor.id, val);
                                    (e.currentTarget as HTMLInputElement).value = "";
                                  }
                                }
                              }}
                              className="bg-[#24201B] border border-[#D6A84F] px-3 py-2 rounded-lg text-xs text-white focus:border-[#D9754F] outline-none w-full font-sans text-left placeholder:text-[#8A7964]"
                            />
                            <button 
                              onClick={() => {
                                const input = modalCustomVoiceInputRef.current;
                                const val = input ? input.value : "";
                                if (val.trim()) {
                                  assignCustomVoiceToActor(currentActor.id, val);
                                  input.value = "";
                                }
                              }}
                              className="px-4 bg-[#D9754F] hover:bg-[#F2A38F] text-white text-[13px] font-bold rounded-lg cursor-pointer transition-colors whitespace-nowrap"
                            >
                              Synthesize & Apply
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* E. AI CINEMATIC DIRECTOR ASSISTANT CHAT SIMULATOR */}
                {activeModal === "ai_director" && (
                  <div className="space-y-4 text-left">
                    <p className="text-xs text-[#F0E1C8] leading-relaxed font-sans">
                      💬 Your smart directorial advisor provides continuous constructive evaluations to optimize rendering quality and camera kinetics based on elite cinematography standards:
                    </p>

                    <div className="bg-[#24201B]/80 border border-[#544737] rounded-xl p-4 text-xs space-y-3 font-sans">
                      <div className="flex items-start gap-2 text-[#FFF8EA]">
                        <span className="bg-[#FFB347] text-black text-xs font-black px-1.5 py-0.2 rounded font-mono">ADVISOR</span>
                        <div>
                          <p className="font-extrabold text-white text-sm mb-1">Macro Lens & Drama Focus Recommendation</p>
                          <p className="text-[#F0E1C8] leading-relaxed text-sm">
                            You have chosen <span className="text-[#FFB347] font-bold">{lensType}</span>. We recommend adjusting the dialog text to include silent beats or pregnant pauses to enhance character isolation by 20%.
                          </p>
                        </div>
                      </div>

                      <div className="h-[1px] bg-[#302920]/80" />

                      <div className="flex items-start gap-2 text-[#F0E1C8]">
                        <span className="bg-[#FF8C42] text-black text-xs font-black px-1.5 py-0.2 rounded font-mono">DOP_NOTE</span>
                        <div>
                          <p className="font-extrabold text-white text-sm mb-1">Calculated Hydraulic Dolly Zoom Application</p>
                          <p className="text-[#F0E1C8] leading-relaxed text-sm">
                            When simulating the Vertigo effect, increase volumetric scattering and darken color grading to highlight the psychological shock of the actor <span className="text-[#FF8C42] font-bold">{currentActor.name}</span>.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input 
                        type="text"
                        placeholder="Ask another directorial or technical question..."
                        className="flex-1 bg-[#24201B] border border-[#544737] px-3 py-2 rounded text-xs text-white focus:border-[#FFB347] outline-none font-sans text-left"
                      />
                      <button 
                        onClick={() => setActiveModal(null)}
                        className="bg-[#302920] hover:bg-[#3B3328] text-[#FFF8EA] font-bold text-xs px-4 py-2 rounded transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
