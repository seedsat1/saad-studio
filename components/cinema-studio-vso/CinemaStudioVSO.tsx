"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Film, 
  Sparkles, 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Layers, 
  Cpu, 
  Compass, 
  Info, 
  UserCheck, 
  Camera, 
  Plus, 
  SlidersHorizontal, 
  FolderOpen, 
  User, 
  CheckCircle2, 
  ExternalLink,
  Sliders,
  Maximize2,
  Mic,
  Smile,
  Zap,
  ChevronDown,
  X,
  PlusCircle,
  Video,
  Eye,
  Settings,
  Image as ImageIcon,
  MessageSquare
} from "lucide-react";

// Extensive casting characters database
const INITIAL_CASTING_CHARACTERS = [
  { 
    id: "char_1", 
    name: "Marwan the Narrator", 
    tagline: "Sharp anxiety & mysterious dramatic features", 
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=250&auto=format&fit=crop",
    style: "A young man with a dark leather coat and features overflowing with elegant, sharp anxiety",
    voice: "Warm, balanced male narrator voice",
    gender: "male"
  },
  { 
    id: "char_2", 
    name: "Kamal the Wise", 
    tagline: "Prestige, dignity & depth of long years", 
    url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=250&auto=format&fit=crop",
    style: "A seventy-year-old man with a silver beard and authentic cloak telling ancient tales of human heritage",
    voice: "Resonant, slow, dignified tone brimming with wisdom",
    gender: "senior"
  },
  { 
    id: "char_3", 
    name: "Layla the Legendary", 
    tagline: "Smart, piercing tone & dreamy eyes", 
    url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=250&auto=format&fit=crop",
    style: "A young woman with long black hair and classic oriental features wearing vintage gilded jewelry from the golden era of storytelling",
    voice: "Classic, firm, confident female voice",
    gender: "female"
  },
  { 
    id: "char_4", 
    name: "Youssef the Farmer", 
    tagline: "Simplicity of the good earth & sweat of struggle", 
    url: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=250&auto=format&fit=crop",
    style: "Warm brown skin weathered by the sun with a simple rustic attire and a patient smile",
    voice: "Warm rural dialect with a calm pitch",
    gender: "male"
  },
  { 
    id: "char_5", 
    name: "Amira Soliman (Journalist)", 
    tagline: "Iron will & relentless pursuit of truth", 
    url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=250&auto=format&fit=crop",
    style: "A young woman wearing a sandy protective vest, carrying a notebook and a pen of sharp words with steadfast gaze",
    voice: "Fast, confident, bold radio broadcasting voice",
    gender: "female"
  },
  { 
    id: "char_6", 
    name: "Sakhr the Bedouin", 
    tagline: "Red keffiyeh & silent hawk-like eyes", 
    url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=250&auto=format&fit=crop",
    style: "A Bedouin man with a dark red keffiyeh, a sharp hawk-like gaze, and a scarf wrapped with wild prestige",
    voice: "Gruff, deep, concise desert male voice",
    gender: "male"
  },
  { 
    id: "char_7", 
    name: "Hoda the Teacher", 
    tagline: "Comforting, gentle features & soothing kindness", 
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=250&auto=format&fit=crop",
    style: "A teacher wearing delicate prescription glasses and relaxed soft features radiating immense warmth",
    voice: "Warm, balanced, soothing female voice",
    gender: "female"
  },
  { 
    id: "char_8", 
    name: "Ramy the Cyber Engineer", 
    tagline: "Futuristic reflections & digital neon lights", 
    url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=250&auto=format&fit=crop",
    style: "A visionary tech innovator surrounded by immersive screens, blue neon lights, and a state-of-the-art cyber jacket",
    voice: "Slightly synthesized digital voice with neon frequency variations",
    gender: "cyber"
  },
  { 
    id: "char_9", 
    name: "Sohaib the Guard", 
    tagline: "Silent power & guardian of the gate", 
    url: "https://images.unsplash.com/photo-1506803682981-6e718a9dd3ee?q=80&w=250&auto=format&fit=crop",
    style: "A strong, majestic figure with features veiled in a dark cloak, sharp silent piercing eyes, and unwavering resolve",
    voice: "Thick, low, analog voice with cinematic resonance",
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
    url: "http://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=250&auto=format&fit=crop",
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

interface CineModel {
  id: string;
  name: string;
  arabicName: string;
  category: string;
  badge?: "TOP" | "PRO" | "FAST" | "NEW" | "";
  supportsLongDuration?: boolean;
}

const CINEMA_MODELS: CineModel[] = [
  // KLING
  { id: "kling_3_0", name: "Kling 3.0", arabicName: "Kling 3.0", category: "KLING", badge: "TOP", supportsLongDuration: true },
  { id: "kling_3_0_mc", name: "Kling 3.0 Motion Control", arabicName: "Kling 3.0 Motion Control", category: "KLING", badge: "PRO", supportsLongDuration: true },
  { id: "kling_2_5_turbo", name: "Kling 2.5 Turbo", arabicName: "Kling 2.5 Turbo", category: "KLING", badge: "FAST", supportsLongDuration: false },
  { id: "kling_2_5_i2v", name: "Kling 2.5 Turbo I2V", arabicName: "Kling 2.5 Turbo I2V", category: "KLING", badge: "FAST", supportsLongDuration: false },
  // MINIMAX
  { id: "hailuo_2_3_fast", name: "Minimax Hailuo 2.3 Fast", arabicName: "Minimax Hailuo 2.3 Fast", category: "MINIMAX HAILUO", badge: "FAST", supportsLongDuration: false },
  { id: "hailuo_2_3", name: "Minimax Hailuo 2.3", arabicName: "Minimax Hailuo 2.3", category: "MINIMAX HAILUO", badge: "PRO", supportsLongDuration: true },
  // SORA
  { id: "sora_2", name: "Sora 2", arabicName: "Sora 2", category: "OPENAI SORA 2", supportsLongDuration: true },
  { id: "sora_2_i2v", name: "Sora 2 I2V", arabicName: "Sora 2 I2V", category: "OPENAI SORA 2", supportsLongDuration: true },
  { id: "sora_2_pro", name: "Sora 2 Pro", arabicName: "Sora 2 Pro", category: "OPENAI SORA 2", badge: "PRO", supportsLongDuration: true },
  // GOOGLE VEO
  { id: "veo_3_1_lite", name: "Google Veo 3.1 Lite", arabicName: "Google Veo 3.1 Lite", category: "GOOGLE VEO", supportsLongDuration: false },
  { id: "veo_3_1_fast", name: "Google Veo 3.1 Fast", arabicName: "Google Veo 3.1 Fast", category: "GOOGLE VEO", badge: "FAST", supportsLongDuration: true },
  { id: "veo_3_1", name: "Google Veo 3.1", arabicName: "Google Veo 3.1", category: "GOOGLE VEO", badge: "NEW", supportsLongDuration: true },
  // SEEDANCE
  { id: "seedance_2_0_fast", name: "Seedance 2.0 Fast", arabicName: "Seedance 2.0 Fast", category: "SEEDANCE", badge: "FAST", supportsLongDuration: false },
  { id: "seedance_2_0", name: "Seedance 2.0", arabicName: "Seedance 2.0", category: "SEEDANCE", badge: "NEW", supportsLongDuration: true },
  // GROK
  { id: "grok_imagine", name: "Grok Imagine", arabicName: "Grok Imagine", category: "XAI GROK", badge: "NEW", supportsLongDuration: true },
  { id: "grok_imagine_edit", name: "Grok Imagine Edit", arabicName: "Grok Imagine Edit", category: "XAI GROK", supportsLongDuration: false }
];

const DURATION_OPTIONS = [
  { value: "4s", label: "4s (Fast short clip)" },
  { value: "8s", label: "8s (Standard narrative duration)" },
  { value: "16s", label: "16s (Long - Kling & Veo)", supportsLong: true },
  { value: "24s", label: "24s (Premium extended duration)", supportsLong: true },
  { value: "32s", label: "32s (Extra long epic narrative)", supportsLong: true },
  { value: "60s", label: "60s (Full cinematic sequence)", supportsLong: true }
];

const RESOLUTION_OPTIONS = [
  { value: "720p", label: "720p (Super fast preview rendering)" },
  { value: "1080p", label: "1080p (Cinema Full HD quality)" },
  { value: "1440p", label: "2K QuadHD (High Fidelity)" },
  { value: "4K", label: "4K Ultra-HD (Superb pixel clarity)" }
];

const ASPECT_RATIO_OPTIONS = [
  { value: "16:9", label: "16:9 Modern Widescreen" },
  { value: "2.35:1", label: "2.35:1 Anamorphic Cinema Scope" },
  { value: "9:16", label: "9:16 Portrait Reels / Mobile" },
  { value: "1:1", label: "1:1 Standard Square" }
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
  const [selectedModelId, setSelectedModelId] = useState("kling_3_0");
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
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeScenario, setActiveScenario] = useState<any>(null);
 
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
  const [aspectRatio, setAspectRatio] = useState("2.35:1");
  const [batchSize, setBatchSize] = useState("1/4");
 
  // Dialog overlays controllers
  const [activeModal, setActiveModal] = useState<"genre" | "style" | "camera" | "casting" | "ai_director" | "voice" | null>(null);
 
  // Character creator lab inputs state
  const [custName, setCustName] = useState("");
  const [custTagline, setCustTagline] = useState("");
  const [custGender, setCustGender] = useState("male");
  const [custStyle, setCustStyle] = useState("");
  const [custVoice, setCustVoice] = useState("Deep, calm, resonant male voice");
  const [custVoicePreset, setCustVoicePreset] = useState("Deep, calm, resonant male voice");
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
          const sizeLimit = duration === "16s" ? 16 : duration === "8s" ? 8 : 4;
          const nextVal = prev + 0.1;
          if (nextVal >= sizeLimit) {
            return 0; // seamless movie loop
          }
          return nextVal;
        });
      }, 100);
    } else {
      clearInterval(loopTimer);
    }
    return () => clearInterval(loopTimer);
  }, [isPlaying, activeScenario, duration]);

  // Sync subtitle timeline
  useEffect(() => {
    if (!activeScenario || activeScenario.scenes.length === 0) {
      setActiveSubtitle("");
      return;
    }
    const scene = activeScenario.scenes[0];
    const match = scene.subtitles.find(
      (sub: any) => currentTime >= sub.start && currentTime <= sub.end
    );
    if (match) {
      setActiveSubtitle(match.text);
    } else {
      setActiveSubtitle("");
    }
  }, [currentTime, activeScenario]);

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

  // Run render pipeline
  const triggerRender = async () => {
    if (!prompt.trim()) return;
    setStatus("RENDERING");
    setProgress(5);
    setIsPlaying(false);
    setCurrentTime(0);

    try {
      const response = await fetch("/api/cinema/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt,
          dialogueText: dialogueText,
          cameraMovement: cameraMovement,
          lensType: lensType,
          voiceId: selectedCharId
        }),
      });

      const payload = await response.json().catch(() => null);

      if (response.ok && payload?.status === "COMPLETED" && payload?.data) {
        setActiveJobId(payload.generationId ?? null);
        setActiveScenario(payload.data);
        setProgress(100);
        setStatus("SUCCESS");
        setIsPlaying(true);
      } else if (response.status === 202 && payload?.success && payload?.generationId) {
        setActiveJobId(payload.generationId);
        startPollingJob(payload.generationId);
      } else {
        throw new Error(payload?.error || "Cinema Studio render failed");
      }
    } catch (err) {
      console.error("Cinema Studio render failed:", err);
      setStatus("FAILED");
      setProgress(0);
    }
  };

  // Safe client-side simulations using rich styles parameters
  const simulateClientRenderingFallbacks = () => {
    let virtualVal = 5;
    const progressTimer = setInterval(() => {
      virtualVal += Math.floor(Math.random() * 12) + 6;
      if (virtualVal >= 100) {
        clearInterval(progressTimer);
        generateClientScene(prompt, dialogueText, cameraMovement, lensType, selectedGenre);
      } else {
        setProgress(virtualVal);
      }
    }, 220);
  };

  // Multi-route polling
  const startPollingJob = (jobId: string) => {
    let countAttempts = 0;
    const pollObj = setInterval(async () => {
      countAttempts++;
      if (countAttempts > 25) {
        clearInterval(pollObj);
        generateClientScene(prompt, dialogueText, cameraMovement, lensType, selectedGenre);
        return;
      }

      try {
        const response = await fetch(`/api/generation/${jobId}`);
        if (!response.ok) throw new Error("Job not found in cache storage");
        const body = await response.json();
        
        if (body.status === "COMPLETED" && body.data) {
          clearInterval(pollObj);
          setActiveScenario(body.data);
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
    }, 1200);
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
            { text: dtext.slice(0, Math.floor(dtext.length / 2)), start: 0, end: 3.8 },
            { text: dtext.slice(Math.floor(dtext.length / 2)), start: 3.8, end: 7.8 }
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
    const actorGenInterval = setInterval(() => {
      simulatedVal += 20;
      if (simulatedVal >= 100) {
        clearInterval(actorGenInterval);

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

        const newbornChar = {
          id: `custom_char_${Math.random().toString(36).substr(2, 9)}`,
          name: custName,
          tagline: custTagline || "A production-ready cinematic character profile",
          url: mockPicUrl,
          style: custStyle || "Classic cinematic wardrobe shaped for the scene narrative",
          voice: custVoice || "Warm balanced narrative voice",
          gender: custGender
        };

        setCastingActors((prev) => [newbornChar, ...prev]);
        setSelectedCharId(newbornChar.id);
        
        // Add custom built character note or alert to user
        setIsGeneratingChar(false);
        setCharProgress(0);

        // Add to history preset automatically!
        const newProj = {
          id: `recent_${Math.random().toString(36).substr(2, 9)}`,
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
        setCustVoice("Warm balanced narrative voice");
        setCustVoicePreset("Warm balanced narrative voice");
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
                className="absolute bg-sky-200/30"
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
                className="absolute bg-amber-400/20 rounded-full"
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

  const currentActor = castingActors.find((c) => c.id === selectedCharId) || castingActors[0];
  const activeModelObj = CINEMA_MODELS.find((m) => m.id === selectedModelId) || CINEMA_MODELS[0];
  const activeGenreObj = AVAILABLE_GENRES.find((g) => g.id === selectedGenre) || AVAILABLE_GENRES[0];

  return (
    <div id="full_studio_page" className="min-h-screen bg-[#040407] text-[#eeeff5] flex flex-col font-sans overflow-hidden select-none selection:bg-cyan-500/30">
      
      {/* 1. STATE-OF-THE-ART SLICK HEADER */}
      <header id="top_cinema_header" className="h-14 bg-[#0a0a0f] border-b border-[#141520] px-6 flex items-center justify-between relative z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-950/40">
            <Film size={16} className="text-white animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-zinc-400">
              SAAD CINEMA STUDIO v5.0
            </span>
            <span className="text-[9px] font-mono bg-[#141522] text-cyan-400 font-bold px-2 py-0.5 rounded border border-cyan-900/40">
              ULTRA-ENGINE
            </span>
          </div>
        </div>

        {/* STATUS COUNTERS & LIVE TIMECODE IN HEADER */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="hidden md:flex items-center gap-1.5 bg-zinc-900/60 border border-zinc-800/80 px-3 py-1 rounded-full text-zinc-400 text-[10px]">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-ping" />
            <span>PIPELINE: ACTIVE</span>
          </div>

          <div className="bg-[#0e0e16] border border-[#1d1f30] px-3.5 py-1 rounded-lg text-zinc-300 font-mono text-[10px] flex items-center gap-2">
            <span className="text-zinc-500">ENG TIMECODE:</span>
            <span className="text-cyan-400 tracking-wider font-bold">{timecode}</span>
          </div>
        </div>
      </header>

      {/* 2. THREE-PANEL EDITORIAL WORKSPACE */}
      <div className="flex-1 flex overflow-hidden relative z-30">
        
        {/* SIDEBAR: LEFT NAV & PRESETS HISTORIES */}
        <aside id="suite_sidebar" className="w-[280px] bg-[#08080c] border-r border-[#141520] flex flex-col justify-between hidden md:flex flex-shrink-0">
          
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
                className="w-full bg-[#12131e] hover:bg-[#1a1b2d] border border-[#1f2135] text-[11px] font-bold py-2.5 px-3 rounded-lg flex items-center gap-2 text-zinc-200 transition-all duration-200 shadow-sm"
              >
                <Plus size={14} className="text-cyan-400" />
                <span>+ New cinematic project</span>
              </button>

              <button 
                onClick={() => setActiveModal(activeModal === "ai_director" ? null : "ai_director")}
                className={`w-full text-[11px] font-bold py-2.5 px-3 rounded-lg flex items-center justify-between transition-all duration-200 border ${
                  activeModal === "ai_director"
                    ? "bg-cyan-950/30 text-cyan-400 border-cyan-800/60 shadow"
                    : "bg-transparent text-zinc-400 hover:text-zinc-200 border-transparent"
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare size={14} className="text-cyan-500" />
                  <span>AI Director Assistant</span>
                </div>
                <span className="bg-[#141525] text-cyan-400 text-[8px] font-mono px-1.5 py-0.2 rounded">LIVE</span>
              </button>
            </div>

            {/* Expander list Header */}
            <div>
              <span className="text-[9px] font-mono font-bold tracking-wider text-zinc-500 block mb-2 uppercase">
                Live control deck
              </span>
              <div className="flex flex-col gap-1 text-xs">
                <button 
                  onClick={() => setActiveModal("genre")}
                  className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/30 hover:bg-[#12131f] text-zinc-400 hover:text-zinc-200 transition-all border border-transparent hover:border-zinc-900/60"
                >
                  <span className="flex items-center gap-2">Scene genre</span>
                  <span className="text-[10px] text-zinc-500 font-mono italic">{selectedGenre}</span>
                </button>
                <button 
                  onClick={() => setActiveModal("style")}
                  className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/30 hover:bg-[#12131f] text-zinc-400 hover:text-zinc-200 transition-all border border-transparent hover:border-zinc-900/60"
                >
                  <span>Lighting and color system</span>
                  <span className="text-[10px] text-cyan-500 font-mono">Custom</span>
                </button>
                <button 
                  onClick={() => setActiveModal("camera")}
                  className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/30 hover:bg-[#12131f] text-zinc-400 hover:text-zinc-200 transition-all border border-transparent hover:border-zinc-900/60"
                >
                  <span>Lens and camera setup</span>
                  <span className="text-[10px] text-zinc-500 font-mono truncate max-w-28 text-left">{lensType}</span>
                </button>
                <button 
                  onClick={() => setActiveModal("casting")}
                  className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/30 hover:bg-[#12131f] text-zinc-400 hover:text-zinc-200 transition-all border border-transparent hover:border-zinc-900/60"
                >
                  <span>Casting and actor room</span>
                  <span className="text-[10px] text-zinc-500 font-mono text-left">{currentActor.name}</span>
                </button>
              </div>
            </div>

            {/* Presets and History */}
            <div className="flex-1 flex flex-col min-h-[220px]">
              <span className="text-[9px] font-mono font-bold tracking-wider text-zinc-500 block mb-2.5 uppercase">
                Scene drafts and history ({recentProjects.length})
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
                          ? "bg-zinc-905/60 border-cyan-800/40"
                          : "bg-[#0b0c11] border-zinc-900/80 hover:bg-zinc-900/40 hover:border-zinc-800"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-zinc-300 font-bold truncate block flex-1 pl-2">
                          {proj.title}
                        </span>
                        <span className="text-[8px] bg-zinc-900 text-cyan-400 px-1.5 py-0.2 rounded font-mono uppercase">
                          {proj.genre}
                        </span>
                      </div>
                      <p className="text-[9px] text-zinc-500 line-clamp-1 truncate w-full">
                        {proj.prompt}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Core watermark credit line according to guidelines */}
          <div className="p-4 border-t border-[#141520] bg-[#050508] text-center">
            <p className="text-[9px] text-zinc-650">SAAD DIGITAL STUDIOS INC</p>
            <p className="text-[8px] text-zinc-500 font-mono mt-0.5">EST. 2026 • AI MODEL FLASH 3.5</p>
          </div>
        </aside>

        {/* WORKSPACE AREA: DYNAMIC CANVAS STAGE & POPUPS */}
        <section id="center_viewport" className="flex-1 flex flex-col justify-between p-6 relative overflow-y-auto bg-gradient-to-b from-[#06070a] to-[#040406]">
          
          {/* AESTHETIC CORNER MARKINGS FOR EMPTY STATE / PREVIEW */}
          <div className="absolute top-10 left-10 w-4 h-4 border-t border-l border-zinc-900 pointer-events-none" />
          <div className="absolute top-10 right-10 w-4 h-4 border-t border-r border-zinc-900 pointer-events-none" />
          <div className="absolute bottom-10 left-10 w-4 h-4 border-b border-l border-zinc-900 pointer-events-none" />
          <div className="absolute bottom-10 right-10 w-4 h-4 border-b border-r border-zinc-900 pointer-events-none" />

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
                  <span className="text-[10px] text-zinc-500 font-mono tracking-[0.3em] uppercase">
                    {activeModelObj.name} ULTRA ENGINE
                  </span>
                  
                  <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-cyan-100 to-cyan-500 font-sans max-w-xl leading-relaxed">
                    What would you shoot with infinite budget?
                  </h1>

                  <p className="text-xs text-zinc-500 font-sans max-w-md leading-relaxed">
                    Describe the cinematic scene below, then generate a production-style visual plan with lens, camera, lighting, subtitles, and sound direction.
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4 max-w-xl">
                    <button 
                      onClick={() => handleLoadProject(recentProjects[0])}
                      className="px-4 py-2 bg-[#090a10]/50 hover:bg-[#12131e]/50 border border-zinc-900 hover:border-zinc-800 text-[11px] text-zinc-400 hover:text-white rounded-lg transition-all"
                    >
                      Rainy city alley
                    </button>
                    <button 
                      onClick={() => handleLoadProject(recentProjects[1])}
                      className="px-4 py-2 bg-[#090a10]/50 hover:bg-[#12131e]/50 border border-zinc-900 hover:border-zinc-800 text-[11px] text-zinc-400 hover:text-white rounded-lg transition-all"
                    >
                      Mythic castle portrait
                    </button>
                    <button 
                      onClick={() => handleLoadProject(recentProjects[2])}
                      className="px-4 py-2 bg-[#090a10]/50 hover:bg-[#12131e]/50 border border-zinc-900 hover:border-zinc-800 text-[11px] text-zinc-400 hover:text-white rounded-lg transition-all"
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
                      className="absolute inset-0 border-2 border-t-cyan-500 border-zinc-900 rounded-full"
                    />
                    <div className="absolute inset-2 bg-[#040407] rounded-full flex items-center justify-center">
                      <Camera size={20} className="text-cyan-400" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                      <span>Rendering frame and character detail {progress}%</span>
                      <span>GEN_PIPELINE_ACTIVE</span>
                    </div>
                    {/* Progress Bar Container Grid */}
                    <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full"
                        style={{ width: `${progress}%` }}
                        layoutId="rendering_progress_bar"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-zinc-500 leading-relaxed font-mono tracking-wide animate-pulse">
                    {progress < 30 ? "» Analyzing script intent and visual tone..."
                     : progress < 60 ? "» Mapping lighting paths, camera movement, and lens behavior..."
                     : progress < 85 ? "» Simulating depth, motion, glow, and atmosphere..."
                     : "» Rendering and composing the final cinematic frame plan..."}
                  </p>
                </motion.div>
              )}

              {/* CINEMATIC WIDESCREEN ACTIVE PLAYER SIMULATOR VIEWPORT */}
              {status === "SUCCESS" && activeScenario && (
                <motion.div
                  key="success_player"
                  initial={{ opacity: 0, scale: 0.99 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full max-w-[850px] aspect-[2.35/1] rounded-xl overflow-hidden bg-black border border-[#1d1f30] relative shadow-2xl shadow-black/80 flex flex-col justify-between"
                  style={{
                    boxShadow: `0 25px 50px -12px ${activeScenario.accentColor}08`
                  }}
                >
                  {/* Atmospheric particle layer overlay */}
                  {renderInteractiveParticles()}

                  {/* Shifting radial color backlights */}
                  <div 
                    className="absolute inset-0 pointer-events-none transition-all duration-1000 z-10"
                    style={{ background: activeScenario.scenes[0].visualLayout.lightingGradient }}
                  />

                  {/* Absolute Backdrop Scene Actor Illustrative Image mockup */}
                  <img 
                    src={currentActor.url} 
                    alt="active actor snapshot mockup" 
                    className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none z-0 filter saturate-[0.7] brightness-[0.45] transition-all duration-[1200ms] pointer-events-none grayscale"
                  />

                  {/* TOP BANNER CORNER STATS OVERLAY IN MONITOR */}
                  <div className="p-4 flex items-center justify-between relative z-35 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono bg-cyan-950/80 border border-cyan-800/40 text-cyan-400 px-2.5 py-0.5 rounded uppercase font-bold tracking-wider">
                        PREVIEW ACTIVE
                      </span>
                      <span className="text-[9px] font-mono text-zinc-400 bg-black/40 px-2 py-0.5 rounded truncate max-w-[240px] block">
                        {lensType} • {cameraMovement}
                      </span>
                    </div>

                    <div className="bg-black/40 px-2 py-0.5 rounded text-[9px] font-mono text-zinc-400">
                      24.00 FPS • PRORES RAW
                    </div>
                  </div>

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
                      <span className="text-[8px] font-mono text-zinc-500 w-6">00:00</span>
                      <div className="flex-1 h-1 bg-zinc-900 rounded-full relative overflow-hidden group hover:h-1.5 transition-all cursor-pointer">
                        <div 
                          className="h-full bg-cyan-500 rounded-full transition-all"
                          style={{ width: `${(currentTime / (duration === "16s" ? 16 : duration === "8s" ? 8 : 4)) * 100}%` }}
                        />
                      </div>
                      <span className="text-[8px] font-mono text-zinc-500 w-6 text-right">
                        00:0{duration === "16s" ? "16" : duration === "8s" ? "8" : "4"}
                      </span>
                    </div>

                    {/* Left/Right actions inside player */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setIsPlaying(!isPlaying)}
                          className="w-7 h-7 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-350 hover:text-white rounded-lg flex items-center justify-center transition-colors outline-none"
                        >
                          {isPlaying ? <Pause size={11} /> : <Play size={11} className="relative left-[1px]" />}
                        </button>
                        <button 
                          onClick={() => setCurrentTime(0)}
                          className="w-7 h-7 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-350 hover:text-white rounded-lg flex items-center justify-center transition-colors outline-none"
                        >
                          <RotateCcw size={11} />
                        </button>

                        <div className="h-3 w-[1px] bg-zinc-900 mx-1" />

                        {/* Volume settings */}
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setIsMuted(!isMuted)}
                            className="text-zinc-400 hover:text-white transition-colors outline-none"
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
                            className="w-12 h-1 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                          />
                        </div>
                      </div>

                      <div className="text-[9px] font-mono text-zinc-500 flex items-center gap-2">
                        <span>AUDIO: SIMULATED ({activeScenario.scenes[0].soundEffects})</span>
                        <span>•</span>
                        <span className="text-cyan-400 font-bold uppercase">SEC: {currentTime.toFixed(1)}s</span>
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
              className={`px-3 py-1.5 rounded-full border text-[11px] font-bold flex items-center gap-1.5 transition-all duration-200 outline-none ${
                activeModal === "genre"
                  ? "bg-purple-950/20 text-purple-400 border-purple-800/50 shadow"
                  : "bg-[#0b0c11]/90 border-[#141525]/80 hover:bg-zinc-900/60 text-zinc-400"
              }`}
            >
              <div 
                className="w-2 h-2 rounded-full inline-block filter blur-[1px] animate-pulse" 
                style={{ background: activeGenreObj.color }}
              />
              <span>Genre: {activeGenreObj.id}</span>
            </button>

            <button
              onClick={() => setActiveModal("style")}
              className={`px-3 py-1.5 rounded-full border text-[11px] font-bold flex items-center gap-1.5 transition-all duration-200 outline-none ${
                activeModal === "style"
                  ? "bg-amber-950/20 text-amber-400 border-amber-800/50 shadow"
                  : "bg-[#0b0c11]/90 border-[#141525]/80 hover:bg-zinc-900/60 text-zinc-400"
              }`}
            >
              <Sliders size={11} className="text-amber-500" />
              <span>Style: LUT {colorPalette === "Auto" ? "Auto" : colorPalette} • {lightingStyle === "Auto" ? "Auto" : lightingStyle}</span>
            </button>

            <button
              onClick={() => setActiveModal("camera")}
              className={`px-3 py-1.5 rounded-full border text-[11px] font-bold flex items-center gap-1.5 transition-all duration-200 outline-none ${
                activeModal === "camera"
                  ? "bg-blue-950/20 text-cyan-400 border-cyan-800/50 shadow"
                  : "bg-[#0b0c11]/90 border-[#141525]/80 hover:bg-zinc-900/60 text-zinc-400"
              }`}
            >
              <Camera size={11} className="text-cyan-500" />
              <span>Cam: {getShortModel(activeModelObj.name)} • {getShortLens(lensType)} • {getShortMovement(cameraMovement)}</span>
            </button>

            <button
              onClick={() => setActiveModal("casting")}
              className={`px-3 py-1.5 rounded-full border text-[11px] font-bold flex items-center gap-1.5 transition-all duration-200 outline-none ${
                activeModal === "casting"
                  ? "bg-teal-950/20 text-teal-400 border-teal-800/50 shadow"
                  : "bg-[#0b0c11]/90 border-[#141525]/80 hover:bg-zinc-900/60 text-zinc-400"
              }`}
            >
              <UserCheck size={11} className="text-teal-555" />
              <span>Cast: {getShortCast(currentActor.name)}</span>
            </button>

            <button
              onClick={() => setActiveModal("voice")}
              className={`px-3 py-1.5 rounded-full border text-[11px] font-bold flex items-center gap-1.5 transition-all duration-200 outline-none ${
                activeModal === "voice"
                  ? "bg-rose-950/20 text-rose-450 border-rose-800/50 shadow"
                  : "bg-[#0b0c11]/90 border-[#141525]/80 hover:bg-zinc-900/60 text-zinc-400"
              }`}
            >
              <span className="text-rose-500 text-[12px]">🎙️</span>
              <span>Voice: {getShortVoice(currentActor.voice)}</span>
            </button>
          </div>

          {/* 3. SLICK RUNWAY-STYLE GENERATE INPUT BAR */}
          <div id="footer_generate_ribbon" className="max-w-[850px] mx-auto w-full bg-[#0a0b10] border border-[#141522] rounded-xl p-3 shadow-2xl relative z-40">
            
            {/* Input Row */}
            {/* Input Row */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setActiveModal("casting")}
                title="Add or synthesize an actor"
                className="w-10 h-10 bg-[#121320] hover:bg-[#1a1b2d] border border-zinc-800/60 rounded-lg flex items-center justify-center text-zinc-450 hover:text-white transition-colors"
              >
                <Plus size={16} />
              </button>

              <div className="flex-1 min-w-0 pr-1">
                <input 
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the cinematic scene in detail... e.g., A vintage car cruising down the neon-drenched streets under heavy rain"
                  className="w-full bg-transparent text-sm text-white focus:outline-none placeholder-zinc-550 text-left font-sans"
                />
              </div>

              <button
                onClick={triggerRender}
                disabled={status === "RENDERING"}
                className={`h-10 px-5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all duration-300 outline-none ${
                  status === "RENDERING"
                    ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                    : "bg-[#1fe6ff] hover:bg-cyan-400 text-black shadow-lg shadow-cyan-950/30 font-extrabold cursor-pointer"
                }`}
              >
                <span>Render Scene ✦</span>
                <Sparkles size={12} className="relative top-[-0.5px]" />
              </button>
            </div>

            {/* Subtitles Input Option Panel and pills row info below */}
            <div className="mt-2.5 pt-2 border-t border-[#121322] flex flex-wrap items-center justify-between gap-2.5">
              
              <div className="flex items-center gap-1.5">
                <Mic size={11} className="text-zinc-500" />
                <input 
                  type="text"
                  value={dialogueText}
                  onChange={(e) => setDialogueText(e.target.value)}
                  placeholder="Voice-dub dialogue or attached subtitles..."
                  className="bg-transparent text-[11px] text-zinc-450 focus:outline-none placeholder-zinc-700 text-left w-[200px] md:w-[320px] font-sans"
                />
              </div>

              {/* Setting Quick pills */}
              <div className="flex items-center flex-wrap gap-1.5 justify-end">
                
                {/* 1. Cinematic Engine Model Selector */}
                <div className="relative cine-dropdown-container">
                  <button 
                    onClick={() => setActiveDropdown(activeDropdown === "model" ? null : "model")}
                    className={`px-2.5 py-1.5 rounded text-[10px] font-sans font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                      activeDropdown === "model" 
                        ? "bg-cyan-950/80 border border-cyan-400 text-cyan-400 shadow-md shadow-cyan-950/50" 
                        : "bg-zinc-950 hover:bg-zinc-950/60 border border-zinc-900 text-zinc-300 hover:text-white"
                    }`}
                  >
                    <span>🎬 {activeModelObj.name}</span>
                    <ChevronDown size={10} className={`text-zinc-500 transition-transform ${activeDropdown === "model" ? "rotate-180 text-cyan-400" : ""}`} />
                  </button>

                  {activeDropdown === "model" && (
                    <div className="absolute bottom-9 left-1/2 md:-left-12 -translate-x-[40%] md:translate-x-0 w-80 max-h-[380px] overflow-y-auto bg-[#040409]/98 border border-cyan-500/20 rounded-xl p-2.5 shadow-2xl z-50 text-left font-sans backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150">
                      <div className="text-[10px] text-zinc-400 font-extrabold pb-2 border-b border-white/5 mb-2 font-mono flex items-center justify-between px-1">
                        <span className="text-[8px] uppercase tracking-widest text-[#1fe6ff] font-mono">CINEMATIC MODEL DIRECTORY</span>
                        <span>Select Render Engine</span>
                      </div>
                      <div className="space-y-3">
                        {Array.from(new Set(CINEMA_MODELS.map(m => m.category))).map((cat) => {
                          const catModels = CINEMA_MODELS.filter(m => m.category === cat);
                          return (
                            <div key={cat} className="space-y-1">
                              <div className="text-[8px] font-mono font-bold text-zinc-650 tracking-wider text-left uppercase px-2 py-0.5 border-l-2 border-cyan-500/30">
                                • {cat}
                              </div>
                              <div className="space-y-0.5 animate-none">
                                {catModels.map((model) => {
                                  const isSelected = selectedModelId === model.id;
                                  return (
                                    <button
                                      key={model.id}
                                      onClick={() => {
                                        setSelectedModelId(model.id);
                                        setActiveDropdown(null);
                                      }}
                                      className={`w-full text-right px-2.5 py-1.5 rounded-md text-[10.5px] transition-all flex items-center justify-between cursor-pointer ${
                                        isSelected 
                                          ? "bg-cyan-950/40 text-cyan-300 border border-cyan-500/20 font-bold" 
                                          : "text-zinc-400 hover:text-zinc-150 hover:bg-zinc-900/40 border border-transparent"
                                      }`}
                                    >
                                      {/* Left badges column */}
                                      <div className="flex items-center gap-1 font-mono text-[7px]" dir="ltr">
                                        {model.supportsLongDuration && (
                                          <span className="px-1 py-0.2 rounded bg-cyan-950/60 border border-cyan-400/20 text-[#1fe6ff] font-bold">60s LONG</span>
                                        )}
                                        {model.badge && (
                                          <span className={`px-1 py-0.2 rounded font-bold ${
                                            model.badge === "TOP" ? "bg-amber-950/80 border border-amber-800/30 text-amber-400" :
                                            model.badge === "PRO" ? "bg-violet-950/80 border border-violet-850/30 text-purple-400" :
                                            model.badge === "FAST" ? "bg-blue-950/80 border border-blue-800/20 text-blue-400" :
                                            "bg-emerald-950/80 border border-emerald-800/20 text-emerald-400"
                                          }`}>
                                            {model.badge}
                                          </span>
                                        )}
                                      </div>
                                      
                                      {/* Right name column */}
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-medium">{model.name}</span>
                                        <span className={`w-1.5 h-1.5 rounded-full ${
                                          cat === "KLING" ? "bg-[#1fe6ff]" :
                                          cat === "MINIMAX HAILUO" ? "bg-amber-500" :
                                          cat === "OPENAI SORA 2" ? "bg-purple-500" :
                                          cat === "GOOGLE VEO" ? "bg-blue-500" :
                                          cat === "SEEDANCE" ? "bg-emerald-500" :
                                          "bg-rose-500"
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
                    className={`px-2 py-1 bg-zinc-950 border border-zinc-900 rounded text-[9px] font-mono text-zinc-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer`}
                  >
                    <span>⏱️ {duration}</span>
                    <ChevronDown size={8} className="text-zinc-650" />
                  </button>

                  {activeDropdown === "duration" && (
                    <div className="absolute bottom-9 right-0 md:-right-8 w-52 bg-[#04040a]/98 border border-white/5 md:border-cyan-500/10 rounded-lg p-1.5 shadow-2xl z-50 text-right font-sans backdrop-blur-md">
                      <div className="text-[8.5px] text-zinc-500 pb-1 mb-1 border-b border-zinc-900 px-1.5 font-bold">Select render duration</div>
                      <div className="space-y-0.5">
                        {DURATION_OPTIONS.map((opt) => {
                          const isSelected = duration === opt.value;
                          const modelSupports = activeModelObj.supportsLongDuration;
                          const isLong = opt.supportsLong;
                          const isDisabled = isLong && !modelSupports;
                          
                          return (
                            <button
                              key={opt.value}
                              disabled={isDisabled}
                              onClick={() => {
                                setDuration(opt.value);
                                setActiveDropdown(null);
                              }}
                              className={`w-full text-right px-2 py-1 rounded text-[10px] transition-all flex items-center justify-between cursor-pointer ${
                                isSelected 
                                  ? "bg-cyan-950/40 text-cyan-400 font-bold" 
                                  : isDisabled 
                                    ? "opacity-30 cursor-not-allowed text-zinc-600" 
                                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                              }`}
                            >
                              {isLong && (
                                <span className={`text-[7px] font-bold font-mono px-1 rounded ${
                                  modelSupports ? "bg-cyan-950/40 text-cyan-400" : "bg-red-950/30 text-red-400"
                                }`}>
                                  {modelSupports ? "LONG" : "UNSUPPORTED"}
                                </span>
                              )}
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
                    className={`px-2 py-1 bg-zinc-950 border border-zinc-900 rounded text-[9px] font-mono text-zinc-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer`}
                  >
                    <span>📐 {resolution}</span>
                    <ChevronDown size={8} className="text-zinc-650" />
                  </button>

                  {activeDropdown === "resolution" && (
                    <div className="absolute bottom-9 right-0 md:-right-8 w-44 bg-[#04040a]/98 border border-white/5 md:border-cyan-500/10 rounded-lg p-1.5 shadow-2xl z-50 text-right font-sans backdrop-blur-md">
                      <div className="text-[8.5px] text-zinc-500 pb-1 mb-1 border-b border-zinc-900 px-1.5 font-bold">AI output resolution</div>
                      <div className="space-y-0.5">
                        {RESOLUTION_OPTIONS.map((opt) => {
                          const isSelected = resolution === opt.value;
                          return (
                            <button
                              key={opt.value}
                              onClick={() => {
                                setResolution(opt.value);
                                setActiveDropdown(null);
                              }}
                              className={`w-full text-right px-2 py-1 rounded text-[10px] transition-all cursor-pointer ${
                                isSelected ? "bg-cyan-950/40 text-cyan-400 font-bold" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
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
                    className={`px-2 py-1 bg-zinc-950 border border-zinc-900 rounded text-[9px] font-mono text-zinc-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer`}
                  >
                    <span>🎞️ {aspectRatio}</span>
                    <ChevronDown size={8} className="text-zinc-650" />
                  </button>

                  {activeDropdown === "ratio" && (
                    <div className="absolute bottom-9 right-0 md:-right-8 w-48 bg-[#04040a]/98 border border-white/5 md:border-cyan-500/10 rounded-lg p-1.5 shadow-2xl z-50 text-right font-sans backdrop-blur-md">
                      <div className="text-[8.5px] text-zinc-500 pb-1 mb-1 border-b border-zinc-900 px-1.5 font-bold">Frame and scene aspect</div>
                      <div className="space-y-0.5">
                        {ASPECT_RATIO_OPTIONS.map((opt) => {
                          const isSelected = aspectRatio === opt.value;
                          return (
                            <button
                              key={opt.value}
                              onClick={() => {
                                setAspectRatio(opt.value);
                                setActiveDropdown(null);
                              }}
                              className={`w-full text-right px-2 py-1 rounded text-[10px] transition-all cursor-pointer ${
                                isSelected ? "bg-cyan-950/40 text-cyan-400 font-bold" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
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
                    className={`px-2 py-1 bg-zinc-950 border border-zinc-900 rounded text-[9px] font-mono text-zinc-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer`}
                  >
                    <span>⚡ Speed: {batchSize}</span>
                    <ChevronDown size={8} className="text-zinc-650" />
                  </button>

                  {activeDropdown === "speed" && (
                    <div className="absolute bottom-9 right-0 w-52 bg-[#04040a]/98 border border-white/5 md:border-cyan-500/10 rounded-lg p-1.5 shadow-2xl z-50 text-right font-sans backdrop-blur-md text-right">
                      <div className="text-[8.5px] text-zinc-500 pb-1 mb-1 border-b border-zinc-900 px-1.5 font-bold">Batch and speed mode</div>
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
                              className={`w-full text-right px-2 py-1 rounded text-[10px] transition-all cursor-pointer ${
                                isSelected ? "bg-cyan-950/40 text-cyan-400 font-bold" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
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
              className="w-full max-w-2xl bg-[#0a0a0f]/95 border border-[#1b1c30] rounded-2xl overflow-hidden shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              
              {/* Header inside popup */}
              <div className="h-12 bg-zinc-950/60 border-b border-[#141525] px-4 flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 uppercase font-mono">
                  {activeModal === "genre" && "🎭 Genre Studio Settings"}
                  {activeModal === "style" && "💡 Color & Lighting presets"}
                  {activeModal === "camera" && "🎥 Professional Lens and Movement Matrix"}
                  {activeModal === "casting" && "👥 Studio Casting Room"}
                  {activeModal === "ai_director" && "💬 Smart AI Cinematic Director assistant"}
                  {activeModal === "voice" && "🎙️ Voice Studio & Dubbing Matrix"}
                </span>
                <button 
                  onClick={() => setActiveModal(null)}
                  className="w-7 h-7 bg-zinc-900 hover:bg-zinc-800 rounded-md flex items-center justify-center text-zinc-450 hover:text-white transition-colors outline-none"
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
                    <div className="md:col-span-5 flex flex-col items-center justify-center py-4 bg-zinc-950/30 rounded-xl border border-zinc-900/60">
                      <motion.div 
                        animate={{ 
                          scale: [1, 1.05, 1],
                          rotate: [0, 180, 360]
                        }}
                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                        className="w-32 h-32 rounded-full filter blur-[24px] opacity-80"
                        style={{ background: activeGenreObj.color }}
                      />
                      <span className="text-[10px] font-mono text-zinc-500 mt-4 uppercase">Dynamic Mood Aura</span>
                      <span className="text-xs font-bold text-center mt-1 text-zinc-350">{activeGenreObj.arabicName}</span>
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
                                ? "bg-zinc-900/80 border-cyan-800/40" 
                                : "bg-zinc-950/20 border-zinc-900/80 hover:bg-zinc-900/40 hover:border-zinc-800"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-black text-white block leading-tight">
                                {g.arabicName}
                              </span>
                              <span className="text-[10px] text-zinc-500 block leading-tight mt-1">
                                {g.desc}
                              </span>
                            </div>
                            {isChosen && <div className="w-2 h-2 rounded-full bg-cyan-400" />}
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
                      <span className="text-[10px] font-bold text-zinc-400 uppercase font-mono block border-b border-zinc-900 pb-1.5 matches">Palette LUTs</span>
                      <div className="flex flex-col gap-2">
                        {["Auto", "Hollywood Teal-Orange", "Neo-Noir Shadow", "Warm Sun Vintage", "Cyberpunk Neon", "Desaturated Iron"].map((p) => (
                          <button
                            key={p}
                            onClick={() => setColorPalette(p)}
                            className={`w-full text-left p-2 rounded-lg text-xs font-bold transition-all outline-none ${
                              colorPalette === p
                                ? "bg-cyan-950/20 text-cyan-400 border border-cyan-800/40"
                                : "bg-zinc-950/20 text-zinc-400 border border-zinc-900/80 hover:bg-zinc-900/40"
                            }`}
                          >
                            {p === "Auto" ? "⚙️ Default (Auto-LUT)" : p}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Column 2: LIGHTING SYSTEM */}
                    <div className="space-y-3">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase font-mono block border-b border-zinc-900 pb-1.5 matches">Ambient Lights</span>
                      <div className="flex flex-col gap-2">
                        {["Auto", "Volumetric Foggy", "High-Contrast Chiaroscuro", "Golden Sunset", "Low-key Midnight"].map((l) => (
                          <button
                            key={l}
                            onClick={() => setLightingStyle(l)}
                            className={`w-full text-left p-2 rounded-lg text-xs font-bold transition-all outline-none ${
                              lightingStyle === l
                                ? "bg-cyan-950/20 text-cyan-400 border border-cyan-800/40"
                                : "bg-zinc-950/20 text-zinc-400 border border-zinc-900/80 hover:bg-zinc-900/40"
                            }`}
                          >
                            {l === "Auto" ? "⚙️ Default (Auto-Light)" : l}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Column 3: CAMERA MOVESET */}
                    <div className="space-y-3">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase font-mono block border-b border-zinc-900 pb-1.5 matches">Cam Moveset Speed</span>
                      <div className="flex flex-col gap-2">
                        {["Auto", "Steady Grounded", "Documentary Jitter", "Dreamy Flying", "Suspense Snapping"].map((c) => (
                          <button
                            key={c}
                            onClick={() => setCameraMovesetStyle(c)}
                            className={`w-full text-left p-2 rounded-lg text-xs font-bold transition-all outline-none ${
                              cameraMovesetStyle === c
                                ? "bg-cyan-950/20 text-cyan-400 border border-cyan-800/40"
                                : "bg-zinc-950/20 text-zinc-400 border border-zinc-900/80 hover:bg-zinc-900/40"
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
                      <span className="text-[10px] font-bold text-cyan-400 uppercase font-mono tracking-wider block border-b border-zinc-900 pb-2 mb-3">
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
                                  ? "border-cyan-500 bg-cyan-950/15"
                                  : "border-zinc-900 bg-zinc-950/40 hover:bg-zinc-900/40 hover:border-zinc-800"
                              }`}
                            >
                              <div className="relative w-full h-16 rounded overflow-hidden mb-1.5 flex-shrink-0">
                                <img src={l.url} alt={l.name} className="w-full h-full object-cover select-none pointer-events-none grayscale" />
                                <div className="absolute top-1 left-1 bg-black/60 px-1 py-0.2 rounded text-[7px] text-zinc-300 font-mono tracking-wide">{l.tStop}</div>
                              </div>
                              <div className="min-w-0 w-full mt-auto">
                                <span className="text-[10.5px] font-black text-slate-100 block truncate leading-tight">
                                  {l.arabicName}
                                </span>
                                <span className="text-[8px] text-zinc-500 block truncate leading-tight mt-0.5">
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
                      <span className="text-[10px] font-bold text-amber-500 uppercase font-mono tracking-wider block border-b border-zinc-900 pb-2 mb-3">
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
                                  ? "border-amber-500 bg-amber-950/15"
                                  : "border-zinc-900 bg-zinc-950/40 hover:bg-zinc-900/40 hover:border-zinc-800"
                              }`}
                            >
                              <div className="relative w-full h-16 rounded overflow-hidden mb-1.5 flex-shrink-0">
                                <img src={mv.url} alt={mv.name} className="w-full h-full object-cover select-none pointer-events-none grayscale" />
                              </div>
                              <div className="min-w-0 w-full mt-auto">
                                <span className="text-[10.5px] font-black text-slate-100 block truncate leading-tight">
                                  {mv.arabicName}
                                </span>
                                <span className="text-[8px] text-zinc-500 block truncate leading-tight mt-0.5">
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
                        <span className="text-[10px] font-bold text-zinc-400 uppercase font-mono block border-b border-zinc-900 pb-1.5">
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
                                    ? "border-cyan-500 bg-cyan-950/10"
                                    : "border-zinc-900 bg-zinc-950/40 hover:bg-zinc-900/40 hover:border-zinc-800"
                                }`}
                              >
                                <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                                  <img src={actor.url} alt={actor.name} className="w-full h-full object-cover grayscale" />
                                </div>
                                <div className="text-center w-full min-w-0 mt-1">
                                  <span className="text-[9.5px] font-bold text-white block truncate leading-none">{actor.name}</span>
                                  <span className="text-[8px] text-rose-400/90 font-medium block truncate mt-1" title={actor.voice}>
                                    🎙️ {actor.voice}
                                  </span>
                                  {isC && <span className="text-[7px] text-cyan-400 block mt-0.5 uppercase">AI LAB</span>}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Current Actor Sound Control Sheet */}
                        <div className="mt-4 p-3 bg-[#0a0b12] rounded-xl border border-zinc-900/80 space-y-2 text-left">
                          <div className="flex items-center justify-between border-b border-zinc-900 pb-1.5">
                            <span className="text-[10px] text-[#1fe6ff] font-mono font-bold tracking-wider">AUDIO MIX & VOICE DUB</span>
                            <span className="text-[11px] font-black text-slate-100">🎙️ Manage & Select Actor Voices: {currentActor.name}</span>
                          </div>
                          
                          <div className="text-[10.5px] leading-relaxed text-zinc-400 space-y-1 font-sans">
                            <div>
                              <span className="text-zinc-500 font-semibold">Current Selected Voice:</span>{" "}
                              <span className="text-cyan-400 font-bold">{currentActor.voice}</span>
                            </div>
                            <p className="text-[9px] text-zinc-500 leading-tight">
                              Choose a default cinematic voice preset or enter a custom voice description to synthesize and assign it immediately:
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-zinc-900/60">
                            <div className="space-y-1 text-left">
                              <label className="text-[8.5px] text-zinc-500 block">Select Voice Preset</label>
                              <select 
                                value={currentActor.voice}
                                onChange={(e) => {
                                  const newVoice = e.target.value;
                                  if (newVoice) {
                                    setCastingActors(prev => prev.map(act => act.id === currentActor.id ? { ...act, voice: newVoice } : act));
                                  }
                                }}
                                className="bg-zinc-950 border border-zinc-850 text-[10.5px] rounded p-1.5 outline-none text-zinc-300 w-full font-sans text-left"
                              >
                                <option value="Warm, balanced male narrator voice">Warm, balanced male narrator</option>
                                <option value="Classic, firm, confident female voice">Classic, confident female</option>
                                <option value="Resonant, slow, dignified tone brimming with wisdom">Resonant, wise old sage</option>
                                <option value="Warm, balanced, soothing female voice">Warm, soft, soothing female</option>
                                <option value="Slightly synthesized digital voice with neon frequency variations">Slight synthesized digital cyber</option>
                                <option value="Thick, low, analog voice with cinematic resonance">Thick, low analog cinematic</option>
                                <option value="Gruff, deep, concise desert male voice">Gruff, deep desert male</option>
                                <option value="Warm rural dialect with a calm pitch">Warm rural dialect</option>
                              </select>
                            </div>

                            <div className="space-y-1 text-left">
                              <label className="text-[8.5px] text-zinc-500 block">Or Write Custom Voice Pattern</label>
                              <div className="flex gap-1.5">
                                <input 
                                  type="text"
                                  id="customActiveActorVoiceInput"
                                  placeholder="e.g., voice with whispering echo..."
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const val = (e.currentTarget as HTMLInputElement).value;
                                      if (val.trim()) {
                                        setCastingActors(prev => prev.map(act => act.id === currentActor.id ? { ...act, voice: val.trim() } : act));
                                        (e.currentTarget as HTMLInputElement).value = "";
                                      }
                                    }
                                  }}
                                  className="bg-zinc-950 border border-zinc-850 px-2 py-1 rounded text-[10.5px] text-white focus:border-cyan-500 outline-none w-full font-sans text-left"
                                />
                                <button 
                                  onClick={() => {
                                    const input = document.getElementById("customActiveActorVoiceInput") as HTMLInputElement;
                                    const val = input ? input.value : "";
                                    if (val.trim()) {
                                      setCastingActors(prev => prev.map(act => act.id === currentActor.id ? { ...act, voice: val.trim() } : act));
                                      input.value = "";
                                    }
                                  }}
                                  className="px-3 bg-cyan-500 hover:bg-cyan-400 text-black text-[9.5px] rounded font-black cursor-pointer transition-colors"
                                >
                                  Apply
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Modern Actor procedural builder */}
                      <form onSubmit={buildCustomCharacterObj} className="md:col-span-12 lg:col-span-5 bg-zinc-950/40 p-3.5 rounded-xl border border-zinc-900 space-y-3 text-left">
                        <span className="text-[10px] font-bold text-cyan-400 uppercase font-mono block border-b border-zinc-900 pb-1 flex items-center gap-1">
                          🧪 Creator Lab (Synthetic Character Builder)
                        </span>

                        <div className="space-y-1">
                          <label className="text-[9px] text-zinc-500 uppercase block">Actor Name or Code</label>
                          <input 
                            type="text"
                            required
                            value={custName}
                            onChange={(e) => setCustName(e.target.value)}
                            placeholder="e.g., Sean Kenani"
                            className="w-full bg-zinc-950 border border-zinc-850 px-2 py-1.5 rounded text-xs text-white focus:border-cyan-500 outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] text-zinc-500 block">Gender Roster</label>
                            <select 
                              value={custGender}
                              onChange={(e) => setCustGender(e.target.value)}
                              className="w-full bg-zinc-950 border border-[#1b1c31] text-[10.5px] rounded p-1 outline-none text-zinc-300"
                            >
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                            </select>
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-[9px] text-zinc-500 block">Portrait Concept</label>
                            <select 
                              value={custPicUrl}
                              onChange={(e) => setCustPicUrl(e.target.value)}
                              className="w-full bg-zinc-950 border border-[#1b1c31] text-[10.5px] rounded p-1 outline-none text-zinc-300"
                            >
                              <option value="classic">Dramatic & Anticipating</option>
                              <option value="wise_old">Wise with Silver Beard</option>
                              <option value="cyber_glow">Futuristic Cyber Glow</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] text-zinc-500 block">Appearance & Attire Details</label>
                          <input 
                            type="text"
                            value={custStyle}
                            onChange={(e) => setCustStyle(e.target.value)}
                            placeholder="e.g., wet black trench coat, intense steel gaze..."
                            className="w-full bg-zinc-950 border border-zinc-850 px-2 py-1.5 rounded text-xs text-white focus:border-cyan-500 outline-none"
                          />
                        </div>

                        {/* Voice Selection & Custom Addition */}
                        <div className="space-y-1.5 pt-2 border-t border-zinc-900/60 text-left">
                          <label className="text-[9.5px] text-[#1fe6ff] uppercase flex items-center gap-1 font-bold">
                            🎙️ Sourced Voice Pattern (Voice Synthesis)
                          </label>
                          <select 
                            value={custVoicePreset}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustVoicePreset(val);
                              if (val !== "custom") {
                                setCustVoice(val);
                              } else {
                                setCustVoice("");
                              }
                            }}
                            className="w-full bg-zinc-950 border border-zinc-850 text-[11px] rounded p-2 outline-none text-zinc-300 font-sans"
                          >
                            <option value="Warm, balanced male narrator voice">Warm, balanced male narrator</option>
                            <option value="Classic, firm, confident female voice">Classic, confident female</option>
                            <option value="Resonant, slow, dignified tone brimming with wisdom">Resonant, wise old sage</option>
                            <option value="Warm, balanced, soothing female voice">Warm, soft, soothing female</option>
                            <option value="Slightly synthesized digital voice with neon frequency variations">Slight synthesized digital cyber</option>
                            <option value="Thick, low, analog voice with cinematic resonance">Thick, low analog cinematic</option>
                            <option value="custom">✍️ Describe Custom Voice / Add Custom Description...</option>
                          </select>

                          {custVoicePreset === "custom" && (
                            <div className="space-y-1 mt-1">
                              <label className="text-[9px] text-zinc-500 block">Write the exact customized voice detail:</label>
                              <input 
                                type="text"
                                required
                                value={custVoice}
                                onChange={(e) => setCustVoice(e.target.value)}
                                placeholder="e.g., deep raspy whispered voice with a subtle Irish accent..."
                                className="w-full bg-zinc-950 border border-zinc-850 px-2 py-1.5 rounded text-xs text-white focus:border-cyan-500 outline-none font-sans"
                              />
                            </div>
                          )}
                        </div>

                        {isGeneratingChar ? (
                          <div className="space-y-1.5 pt-1.5">
                            <div className="flex items-center justify-between text-[8px] font-mono text-cyan-400">
                              <span>AI synthesizing character profile... {charProgress}%</span>
                            </div>
                            <div className="h-0.5 bg-zinc-900 rounded overflow-hidden">
                              <div className="h-full bg-cyan-400" style={{ width: `${charProgress}%` }} />
                            </div>
                          </div>
                        ) : (
                          <button
                            type="submit"
                            className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded transition-colors"
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
                    <p className="text-xs text-zinc-400 leading-relaxed font-sans text-left">
                      🎙️ Voice Engineering & Dubbing Studio - Customize the vocal signature for <span className="text-rose-400 font-bold">{currentActor.name}</span>:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                      {/* Left: Current Actor Status & Profile */}
                      <div className="md:col-span-4 bg-[#0a0a0f] border border-zinc-900 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                        <div className="relative w-16 h-16 rounded-full overflow-hidden border border-zinc-850 mb-3">
                          <img src={currentActor.url} alt={currentActor.name} className="w-full h-full object-cover grayscale" />
                        </div>
                        <h4 className="text-xs font-bold text-slate-100">{currentActor.name}</h4>
                        <p className="text-[10px] text-zinc-500 mt-1">{currentActor.tagline}</p>
                        
                        <div className="mt-4 w-full bg-zinc-950 border border-zinc-900 rounded-lg p-3 text-left">
                          <span className="text-[9px] text-zinc-500 uppercase block font-sans">Active Voice Setting</span>
                          <span className="text-[11px] font-bold text-rose-400 block mt-1 leading-tight break-all font-sans">
                            {currentActor.voice}
                          </span>
                        </div>
                      </div>

                      {/* Right: Sound presets selection grid and additions builder */}
                      <div className="md:col-span-8 space-y-4 text-left">
                        <div className="space-y-2">
                          <span className="text-[10px] text-zinc-300 font-bold block font-sans">Select a default cinematic voice preset:</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                            {[
                              { label: "Warm, balanced male narrator voice", desc: "Calm, steady tone perfect for deep narrative storytelling" },
                              { label: "Classic, firm, confident female voice", desc: "Strong, commanding delivery with retro mid-century aesthetic" },
                              { label: "Resonant, slow, dignified tone brimming with wisdom", desc: "Ideal for deep dramatic pacing and ancient wisdom scripts" },
                              { label: "Warm, balanced, soothing female voice", desc: "Intimate and delicate voicing filled with rich emotional warmth" },
                              { label: "Slightly synthesized digital voice with neon frequency variations", desc: "Scientific droids or highly atmospheric artificial intelligence" },
                              { label: "Thick, low, analog voice with cinematic resonance", desc: "Low-frequency vintage timbre matching mid-century dramatic films" },
                              { label: "Warm rural dialect with a calm pitch", desc: "Authentic, rustic, and cozy dialogue style" },
                              { label: "Gruff, deep, concise desert male voice", desc: "Thick throat presence, broad resonance, and commanding posture" }
                            ].map((v, idx) => {
                              const isSelected = currentActor.voice === v.label;
                              return (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    setCastingActors(prev => prev.map(act => act.id === currentActor.id ? { ...act, voice: v.label } : act));
                                  }}
                                  className={`p-2.5 rounded-lg border text-left transition-all duration-150 flex flex-col justify-between cursor-pointer ${
                                    isSelected
                                      ? "border-rose-500 bg-rose-950/10"
                                      : "border-zinc-900 bg-zinc-950/40 hover:bg-zinc-900/40 hover:border-zinc-800"
                                  }`}
                                >
                                  <span className="text-[10.5px] font-bold text-white block truncate">{v.label}</span>
                                  <span className="text-[8.5px] text-zinc-500 block leading-tight mt-1">{v.desc}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Custom voice descriptor input logic */}
                        <div className="bg-[#0b0c13] border border-zinc-900 rounded-xl p-3 space-y-2">
                          <span className="text-[9.5px] text-[#1fe6ff] uppercase flex items-center gap-1 font-bold">
                            ➕ Custom Voice Integration
                          </span>
                          <p className="text-[9px] text-zinc-500 leading-relaxed font-sans">
                            Describe the voice qualities, ages, or dialects, and the dubbing system will synthesize them instantly:
                          </p>
                          <div className="flex gap-2">
                            <input 
                              type="text"
                              id="modalCustomVoiceInputText"
                              placeholder="e.g., A child-like soft whisper recounting old memories with quiet grace..."
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const val = (e.currentTarget as HTMLInputElement).value;
                                  if (val.trim()) {
                                    setCastingActors(prev => prev.map(act => act.id === currentActor.id ? { ...act, voice: val.trim() } : act));
                                    (e.currentTarget as HTMLInputElement).value = "";
                                  }
                                }
                              }}
                              className="bg-zinc-950 border border-zinc-850 px-3 py-2 rounded-lg text-xs text-white focus:border-rose-500 outline-none w-full font-sans text-left placeholder:text-zinc-600"
                            />
                            <button 
                              onClick={() => {
                                const input = document.getElementById("modalCustomVoiceInputText") as HTMLInputElement;
                                const val = input ? input.value : "";
                                if (val.trim()) {
                                  setCastingActors(prev => prev.map(act => act.id === currentActor.id ? { ...act, voice: val.trim() } : act));
                                  input.value = "";
                                }
                              }}
                              className="px-4 bg-rose-600 hover:bg-rose-500 text-white text-[10.5px] font-bold rounded-lg cursor-pointer transition-colors whitespace-nowrap"
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
                    <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                      💬 Your smart directorial advisor provides continuous constructive evaluations to optimize rendering quality and camera kinetics based on elite cinematography standards:
                    </p>

                    <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-4 text-xs space-y-3 font-sans">
                      <div className="flex items-start gap-2 text-zinc-300">
                        <span className="bg-cyan-500 text-black text-[9px] font-black px-1.5 py-0.2 rounded font-mono">ADVISOR</span>
                        <div>
                          <p className="font-extrabold text-white text-[11px] mb-1">Macro Lens & Drama Focus Recommendation</p>
                          <p className="text-zinc-400 leading-relaxed text-[11px]">
                            You have chosen <span className="text-cyan-400 font-bold">{lensType}</span>. We recommend adjusting the dialog text to include silent beats or pregnant pauses to enhance character isolation by 20%.
                          </p>
                        </div>
                      </div>

                      <div className="h-[1px] bg-zinc-900/60" />

                      <div className="flex items-start gap-2 text-zinc-440">
                        <span className="bg-amber-500 text-black text-[9px] font-black px-1.5 py-0.2 rounded font-mono">DOP_NOTE</span>
                        <div>
                          <p className="font-extrabold text-white text-[11px] mb-1">Calculated Hydraulic Dolly Zoom Application</p>
                          <p className="text-zinc-400 leading-relaxed text-[11px]">
                            When simulating the Vertigo effect, increase volumetric scattering and darken color grading to highlight the psychological shock of the actor <span className="text-amber-400 font-bold">{currentActor.name}</span>.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input 
                        type="text"
                        placeholder="Ask another directorial or technical question..."
                        className="flex-1 bg-zinc-950 border border-zinc-900 px-3 py-2 rounded text-xs text-white focus:border-cyan-500 outline-none font-sans text-left"
                      />
                      <button 
                        onClick={() => setActiveModal(null)}
                        className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs px-4 py-2 rounded transition-colors"
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
