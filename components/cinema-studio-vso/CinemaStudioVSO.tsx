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
  Palette,
  Mic,
  ChevronDown,
  ChevronUp,
  Aperture,
  X,
  MessageSquare,
  Download,
  Trash2,
  AudioLines,
  Drama,
  Check,
} from "lucide-react";
import { VIDEO_MODEL_REGISTRY, type WaveSpeedVideoModel } from "@/lib/video-model-registry";
import { getVideoCreditsByRoute } from "@/lib/credit-pricing";
// NOTE: getVideoCreditsByRoute is kept only as an offline fallback when
// the /api/pricing/quote round-trip hasn't completed yet. The displayed
// "Est. X credits" value is sourced from the server so it matches what
// /api/video will actually charge.

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
    voiceModel: "elevenlabs/multilingual-v2",
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
    voiceModel: "elevenlabs/multilingual-v2",
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
    voiceModel: "elevenlabs/multilingual-v2",
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
    voiceModel: "elevenlabs/multilingual-v2",
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
    voiceModel: "elevenlabs/multilingual-v2",
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
    voiceModel: "elevenlabs/multilingual-v2",
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
    voiceModel: "elevenlabs/multilingual-v2",
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
    voiceModel: "elevenlabs/multilingual-v2",
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
    voiceModel: "elevenlabs/multilingual-v2",
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
    url: "/Lens/85mm Anamorphic Lens.png",
    lensCategory: "Cinema Pro Prime"
  },
  {
    id: "50mm Leica Noctilux Vintage",
    name: "50mm Leica Noctilux Vintage",
    arabicName: "Leica Noctilux 50mm Lens (T0.95 Vintage)",
    tStop: "T0.95 Prime-Lux",
    description: "Warm, dreamy vintage bokeh with luxurious elliptical spotlighting that perfectly mimics 1980s cinematic and emotional close-ups.",
    url: "/Lens/Leica Noctilux 50mm Lens.png",
    lensCategory: "Nocturnal Vintage"
  },
  {
    id: "35mm Street Documentary",
    name: "35mm Street Documentary",
    arabicName: "35mm Street Documentary Lens (Urban Beauty)",
    tStop: "T2.0 Snap-Prime",
    description: "Medium-wide field of view that subtly blends characters with raw streets, historical architecture, and rainy vintage ambiance.",
    url: "/Lens/Leica Summilux 50mm.png",
    lensCategory: "Street Narrative"
  },
  {
    id: "50mm Prime Portrait",
    name: "50mm Prime Portrait",
    arabicName: "50mm Prime Portrait Lens (Human Eye Mockup)",
    tStop: "T1.2 Super-Fast",
    description: "The standard lens that perfectly replicates the field of view of the human eye, offering stunning intimacy and warp-free realism.",
    url: "/Lens/50mm Prime Portrait Lens.png",
    lensCategory: "Standard Human Eye"
  },
  {
    id: "100mm Macro Cine-Tessar",
    name: "100mm Macro Cine-Tessar",
    arabicName: "100mm Macro Cine-Tessar (Detail Close-up)",
    tStop: "T2.0 Super-Macro",
    description: "Extreme close-up capability, revealing fine skin textures and teardrops under rain, highlighting deep emotional micro-expressions.",
    url: "/Lens/Zeiss  Commercial Prime Look.png",
    lensCategory: "Super Macro Detail"
  },
  {
    id: "24mm Ultra Wide Angle Shot",
    name: "24mm Ultra Wide Angle Shot",
    arabicName: "24mm Epic Ultra Wide Lens (Wide Angle Scale)",
    tStop: "T2.8 Architectural",
    description: "Expansive angle capturing the rich background environment and majestic landmarks, positioning the subject within a grand visual frame.",
    url: "/Lens/24mm Epic Ultra Wide Lens.png",
    lensCategory: "Epic Sceneries"
  },
  {
    id: "18mm Super Wide Arri Signature",
    name: "18mm Super Wide Arri Signature",
    arabicName: "Arri Signature 18mm Lens (Colossal Angle)",
    tStop: "T1.8 Pro-Prime",
    description: "Stunning geological and ambient depth for ultra-wide outdoor shots, delivering an endless perspective of historical nature.",
    url: "/Lens/Arri Signature 18mm Lens.png",
    lensCategory: "Titan Wide-Angle"
  },
  {
    id: "45mm Dreamy Hawk Anamorphic",
    name: "45mm Dreamy Hawk Anamorphic",
    arabicName: "Hawk Anamorphic 45mm Lens (Dreamy Cinema)",
    tStop: "T1.5 Dream Anamorphic",
    description: "Delightful specular warmth, oval flare aberrations, and soft corners that evoke nostalgic sequences of memory or subconscious dreams.",
    url: "/Lens/Hawk Anamorphic 45mm Lens.png",
    lensCategory: "Ethereal Anamorphic"
  },
  {
    id: "70-200mm Professional Zoom",
    name: "70-200mm Professional Zoom",
    arabicName: "70-200mm Pro Zoom Lens (Isolation & Distance)",
    tStop: "T2.8 Telephoto Zoom",
    description: "Heavy compression that completely reduces the apparent distance between the subject and background, building dramatic tension.",
    url: "/Lens/70-200mm Pro Zoom Lens.png",
    lensCategory: "Telephoto Isolation"
  },
  {
    id: "135mm Extreme Isolation Prime",
    name: "135mm Extreme Isolation Prime",
    arabicName: "Isolator 135mm Lens (Cold Separation)",
    tStop: "T2.0 Tele-Focus",
    description: "Razor-sharp focal isolation that detaches objects with surveillance-like coldness, perfect for tracking characters at a distance.",
    url: "/Lens/Isolator 135mm Lens.png",
    lensCategory: "Surveillance Isolator"
  },
  {
    id: "12mm Extreme Fisheye",
    name: "12mm Extreme Fisheye",
    arabicName: "Fisheye 12mm Lens (Surrealism & Sci-Fi)",
    tStop: "T3.5 Creative Wide",
    description: "Highly curved wide-angle perspective capturing internal psychological states, anxiety, or paranoia with futuristic avant-garde flair.",
    url: "/Lens/Fisheye 12mm Lens.png",
    lensCategory: "Surrealist Eye"
  },
  {
    id: "58mm Helios-44 Vintage Cine",
    name: "58mm Helios-44 Vintage Cine",
    arabicName: "Helios 58mm Lens (Soviet Swirly Bokeh)",
    tStop: "T2.0 Soviet Prime",
    description: "Legendary circular swirly bokeh background, adding an inimitable organic and epic aesthetic to early cinema-inspired shorts.",
    url: "/Lens/Helios 58mm Lens.png",
    lensCategory: "Soviet Swirly Vintage"
  }
];

// Camera rig matrix — bodies / focal lengths / apertures / lens categories
const CAMERA_BODIES = [
  { id: "clean_digital",   name: "Clean Digital",      tag: "Modern reference look" },
  { id: "arri_alexa_35",   name: "ARRI Alexa 35",      tag: "Premium digital cinema" },
  { id: "arri_alexa_mini", name: "ARRI Alexa Mini LF", tag: "Large-format cinematic" },
  { id: "red_komodo",      name: "RED Komodo",         tag: "Compact 6K raw" },
  { id: "red_v_raptor",    name: "RED V-Raptor",       tag: "High-resolution 8K" },
  { id: "sony_venice_2",   name: "Sony Venice 2",      tag: "Filmic colour science" },
  { id: "sony_fx9",        name: "Sony FX9",           tag: "Documentary workhorse" },
  { id: "canon_c500",      name: "Canon C500 Mk II",   tag: "Broadcast cinema" },
  { id: "blackmagic_12k",  name: "Blackmagic URSA 12K", tag: "Indie cinema raw" },
  { id: "phantom_flex",    name: "Phantom Flex 4K",    tag: "Ultra slow-motion" },
  { id: "kodak_35mm",      name: "Kodak Vision3 35mm", tag: "Photochemical film" },
  { id: "kodak_super16",   name: "Kodak Super 16mm",   tag: "Vintage film grain" },
  { id: "iphone_pro",      name: "iPhone Pro",         tag: "Mobile cinema" },
];

const FOCAL_LENGTHS = [8, 12, 14, 16, 18, 24, 28, 35, 50, 65, 85, 100, 135, 200, 300];

const APERTURES = ["Auto", "f/0.95", "f/1.2", "f/1.4", "f/1.8", "f/2.0", "f/2.8", "f/4.0", "f/5.6", "f/8.0", "f/11", "f/16", "f/22"];

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

const SCENE_TYPES = [
  {
    id: "cinematic-dialogue",
    label: "Cinematic Dialogue",
    shortLabel: "Dialogue",
    description: "Character-driven scene with blocking, reactions, and spoken lines.",
    promptPlaceholder: "Describe the location, characters, conflict, and emotional beat...",
    dialoguePlaceholder: "Write the spoken dialogue or exchange between characters...",
    productionDirection: "Treat this as a character dialogue scene. Prioritize actor blocking, reaction shots, conversational pacing, and clear spoken performance.",
  },
  {
    id: "program-host",
    label: "TV / Program Host",
    shortLabel: "Host",
    description: "Presenter, studio host, explainer, interview, or direct-to-camera segment.",
    promptPlaceholder: "Describe the studio, presenter position, topic, screen graphics, and camera setup...",
    dialoguePlaceholder: "Write the host script or presenter narration...",
    productionDirection: "Treat this as a host-led program segment. Prioritize direct-to-camera framing, presenter clarity, studio polish, and readable pacing.",
  },
  {
    id: "documentary",
    label: "Documentary Narration",
    shortLabel: "Documentary",
    description: "Narrated cinematic sequence, historical memory, reportage, or archival mood.",
    promptPlaceholder: "Describe the documentary subject, environment, archival details, and visual evidence...",
    dialoguePlaceholder: "Write the narrator voice-over...",
    productionDirection: "Treat this as documentary storytelling. Prioritize factual visual rhythm, narrator-led pacing, atmospheric inserts, and credible observational detail.",
  },
  {
    id: "action-fight",
    label: "Action / Fight Scene",
    shortLabel: "Action",
    description: "Fight choreography, chase, impact, pursuit, or kinetic physical action.",
    promptPlaceholder: "Describe the fighters, choreography, terrain, impacts, stakes, and movement path...",
    dialoguePlaceholder: "Optional shouted line, command, or impact dialogue...",
    productionDirection: "Treat this as an action sequence. Prioritize choreography clarity, kinetic camera tracking, readable impacts, and spatial continuity.",
  },
  {
    id: "drama-closeup",
    label: "Drama Close-up",
    shortLabel: "Drama",
    description: "Emotional close-up, silence, inner conflict, tears, or intimate performance.",
    promptPlaceholder: "Describe the character's emotion, face, silence, light, and dramatic turning point...",
    dialoguePlaceholder: "Write a quiet line, confession, or leave empty for silent drama...",
    productionDirection: "Treat this as intimate drama. Prioritize close-up performance, silence, micro-expressions, shallow depth of field, and emotional restraint.",
  },
  {
    id: "horror-suspense",
    label: "Horror / Suspense",
    shortLabel: "Suspense",
    description: "Threat, dread, reveal, shadows, tension, or psychological fear.",
    promptPlaceholder: "Describe the threat, darkness, sound cues, hidden movement, and suspense reveal...",
    dialoguePlaceholder: "Optional whisper, warning, or fearful line...",
    productionDirection: "Treat this as suspense cinema. Prioritize controlled darkness, negative space, dread pacing, sound tension, and a clear reveal or withheld threat.",
  },
  {
    id: "commercial-promo",
    label: "Commercial / Promo",
    shortLabel: "Promo",
    description: "Product, brand, venue, offer, trailer, or energetic promotional scene.",
    promptPlaceholder: "Describe the product or subject, hero shot, setting, audience, and desired premium feel...",
    dialoguePlaceholder: "Write the tagline, voice-over, or callout line...",
    productionDirection: "Treat this as a premium promotional spot. Prioritize clean hero framing, brand clarity, polished lighting, and memorable visual beats.",
  },
  {
    id: "historical-epic",
    label: "Historical / Epic",
    shortLabel: "Epic",
    description: "Ancient world, heritage, mythic scale, armies, ruins, or grand storytelling.",
    promptPlaceholder: "Describe the era, costume, architecture, scale, weather, and heroic stakes...",
    dialoguePlaceholder: "Write an epic line, oath, narration, or ceremonial speech...",
    productionDirection: "Treat this as historical epic cinema. Prioritize scale, costume authenticity, monumental composition, atmospheric depth, and ceremonial pacing.",
  },
] as const;

const COLOR_PALETTE_PRESETS = [
  {
    value: "Auto",
    label: "Auto-LUT",
    description: "Balanced cinematic color chosen from the scene mood.",
    swatch: "linear-gradient(135deg, #64748b, #06b6d4)",
    accent: "#06b6d4",
  },
  {
    value: "Hollywood Teal-Orange",
    label: "Hollywood Teal-Orange",
    description: "Warm skin tones against cool teal shadows.",
    swatch: "linear-gradient(135deg, #0f766e, #f97316)",
    accent: "#f97316",
  },
  {
    value: "Neo-Noir Shadow",
    label: "Neo-Noir Shadow",
    description: "Dense blacks, violet edges, and night-city mystery.",
    swatch: "linear-gradient(135deg, #111827, #7c3aed)",
    accent: "#8b5cf6",
  },
  {
    value: "Warm Sun Vintage",
    label: "Warm Sun Vintage",
    description: "Amber highlights with soft nostalgic contrast.",
    swatch: "linear-gradient(135deg, #92400e, #facc15)",
    accent: "#facc15",
  },
  {
    value: "Cyberpunk Neon",
    label: "Cyberpunk Neon",
    description: "Electric cyan, magenta bloom, and synthetic glow.",
    swatch: "linear-gradient(135deg, #06b6d4, #ec4899)",
    accent: "#22d3ee",
  },
  {
    value: "Desaturated Iron",
    label: "Desaturated Iron",
    description: "Muted steel tones for harsh realism and grit.",
    swatch: "linear-gradient(135deg, #334155, #94a3b8)",
    accent: "#94a3b8",
  },
];

const LIGHTING_PRESETS = [
  {
    value: "Auto",
    label: "Auto-Light",
    description: "Scene-aware lighting that follows the selected mood.",
    swatch: "linear-gradient(135deg, #64748b, #e2e8f0)",
    accent: "#e2e8f0",
  },
  {
    value: "Volumetric Foggy",
    label: "Volumetric Foggy",
    description: "Visible beams, haze layers, and atmospheric depth.",
    swatch: "linear-gradient(135deg, #475569, #c4b5fd)",
    accent: "#c4b5fd",
  },
  {
    value: "High-Contrast Chiaroscuro",
    label: "High-Contrast Chiaroscuro",
    description: "Hard pools of light with sculpted dramatic shadows.",
    swatch: "linear-gradient(135deg, #020617, #f8fafc)",
    accent: "#f8fafc",
  },
  {
    value: "Golden Sunset",
    label: "Golden Sunset",
    description: "Low warm light, rim glow, and cinematic dusk.",
    swatch: "linear-gradient(135deg, #b45309, #fde68a)",
    accent: "#fbbf24",
  },
  {
    value: "Low-key Midnight",
    label: "Low-key Midnight",
    description: "Restrained highlights and deep night exposure.",
    swatch: "linear-gradient(135deg, #020617, #1e3a8a)",
    accent: "#60a5fa",
  },
];

const CAMERA_MOVESET_PRESETS = [
  {
    value: "Auto",
    label: "Auto-Moveset",
    description: "Motion grammar selected from the scene type.",
    swatch: "linear-gradient(135deg, #64748b, #a78bfa)",
    accent: "#a78bfa",
  },
  {
    value: "Steady Grounded",
    label: "Steady Grounded",
    description: "Calm controlled moves for serious cinematic staging.",
    swatch: "linear-gradient(135deg, #0f172a, #22c55e)",
    accent: "#22c55e",
  },
  {
    value: "Documentary Jitter",
    label: "Documentary Jitter",
    description: "Subtle handheld realism with human camera energy.",
    swatch: "linear-gradient(135deg, #1f2937, #f59e0b)",
    accent: "#f59e0b",
  },
  {
    value: "Dreamy Flying",
    label: "Dreamy Flying",
    description: "Floating movement, soft drift, and lyrical travel.",
    swatch: "linear-gradient(135deg, #0891b2, #c084fc)",
    accent: "#67e8f9",
  },
  {
    value: "Suspense Snapping",
    label: "Suspense Snapping",
    description: "Tense punch-ins, sudden stops, and thriller timing.",
    swatch: "linear-gradient(135deg, #7f1d1d, #f43f5e)",
    accent: "#fb7185",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CINEMA STUDIO — CURATED FLAGSHIP LINEUP (7 models)
// Each entry verified directly against its official source:
//   • Gemini Omni Flash      → Google official API (announced I/O 2026-05-19)
//   • Google Veo 3.1 (Pro)   → Google official API
//   • Google Veo 3.1 Fast    → Google official API
//   • Kling 3.0 Pro          → WaveSpeed (kwaivgi/kling-v3.0-pro/text-to-video)
//   • Kling 3.0 4K           → WaveSpeed (kwaivgi/kling-v3.0-4k/text-to-video)
//   • OpenAI Sora 2          → WaveSpeed (openai/sora-2/text-to-video)
//   • ByteDance Seedance 2.0 → BytePlus official API
//
// Lower-tier / non-cinematic models (Veo Lite, Seedance Fast, Kling 2.5 Turbo,
// Sora 2 Pro [non-existent], Grok Imagine) are intentionally excluded from
// this page even though they remain in VIDEO_MODEL_REGISTRY for other
// studios. This keeps the cinema dropdown short, premium and on-brand.
// ─────────────────────────────────────────────────────────────────────────────
const CINEMA_APPROVED_IDS: ReadonlySet<string> = new Set([
  "google-gemini-omni-video",  // Gemini Omni Flash (Google I/O 2026)
  "google-veo3.1-t2v",
  "google-veo3.1-fast-t2v",
  "kling-v3.0-pro-t2v",
  "openai-sora-2-t2v",
  "bytedance-seedance-v2-t2v",
]);

// Preserve the curated *order* (newest flagship → premium → 4K → narrative
// → cinematic engines → quick variant) so the dropdown reads top-down by
// editorial priority, not by registry insertion order.
const CINEMA_ORDER: ReadonlyArray<string> = [
  "google-gemini-omni-video", // Gemini Omni Flash — newest Google flagship 🆕
  "google-veo3.1-t2v",        // Hollywood-grade flagship
  "kling-v3.0-pro-t2v",       // Kuaishou cinematic flagship
  "openai-sora-2-t2v",        // Narrative flagship
  "bytedance-seedance-v2-t2v",// BytePlus Hollywood-grade
  "google-veo3.1-fast-t2v",   // Quick cinema variant
];

const CINEMA_MODELS = CINEMA_ORDER
  .map((id) => VIDEO_MODEL_REGISTRY.find((m) => m.id === id))
  .filter((m): m is WaveSpeedVideoModel => {
    if (!m) return false;
    // Defensive: the curated set is text-to-video only — never let an
    // image/video-required model slip in.
    const caps = m.capabilities;
    return !caps.requires_image && !caps.requires_video && CINEMA_APPROVED_IDS.has(m.id);
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

const ELEVENLABS_TTS_MODEL = "elevenlabs/multilingual-v2";
const GOOGLE_TTS_MODEL = "gemini-3.1-flash-tts-preview";
const GOOGLE_TTS_VOICES = [
  ["Zephyr", "Bright"],
  ["Puck", "Upbeat"],
  ["Charon", "Informative"],
  ["Kore", "Firm"],
  ["Fenrir", "Excitable"],
  ["Leda", "Youthful"],
  ["Orus", "Firm"],
  ["Aoede", "Breezy"],
  ["Callirrhoe", "Easy-going"],
  ["Autonoe", "Bright"],
  ["Enceladus", "Breathy"],
  ["Iapetus", "Clear"],
  ["Umbriel", "Easy-going"],
  ["Algieba", "Smooth"],
  ["Despina", "Smooth"],
  ["Erinome", "Clear"],
  ["Algenib", "Gravelly"],
  ["Rasalgethi", "Informative"],
  ["Laomedeia", "Upbeat"],
  ["Achernar", "Soft"],
  ["Alnilam", "Firm"],
  ["Schedar", "Even"],
  ["Gacrux", "Mature"],
  ["Pulcherrima", "Forward"],
  ["Achird", "Friendly"],
  ["Zubenelgenubi", "Casual"],
  ["Vindemiatrix", "Gentle"],
  ["Sadachbia", "Lively"],
  ["Sadaltager", "Knowledgeable"],
  ["Sulafat", "Warm"],
] as const;

type VoicePersona = "male" | "female" | "senior" | "child" | "neutral";

const VOICE_PERSONA_META: Record<VoicePersona, {
  label: string;
  ageLabel: string;
  imageUrl: string;
  badgeClass: string;
}> = {
  male: {
    label: "Male",
    ageLabel: "Adult",
    imageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=160&auto=format&fit=crop",
    badgeClass: "border-sky-400/40 bg-sky-400/10 text-sky-200",
  },
  female: {
    label: "Female",
    ageLabel: "Adult",
    imageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=160&auto=format&fit=crop",
    badgeClass: "border-pink-400/40 bg-pink-400/10 text-pink-200",
  },
  senior: {
    label: "Senior",
    ageLabel: "Mature",
    imageUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=160&auto=format&fit=crop",
    badgeClass: "border-amber-300/40 bg-amber-300/10 text-amber-100",
  },
  child: {
    label: "Child",
    ageLabel: "Youthful",
    imageUrl: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?q=80&w=160&auto=format&fit=crop",
    badgeClass: "border-emerald-300/40 bg-emerald-300/10 text-emerald-100",
  },
  neutral: {
    label: "Neutral",
    ageLabel: "General",
    imageUrl: "https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=160&auto=format&fit=crop",
    badgeClass: "border-violet-300/40 bg-violet-300/10 text-violet-100",
  },
};

const getVoicePersonaMeta = (persona?: VoicePersona) => VOICE_PERSONA_META[persona ?? "neutral"] ?? VOICE_PERSONA_META.neutral;

const inferGoogleVoicePersona = (voiceId: string, tone: string): VoicePersona => {
  const hint = `${voiceId} ${tone}`.toLowerCase();
  if (/mature|knowledgeable|rasalgethi|gacrux|sadaltager/.test(hint)) return "senior";
  if (/youthful|bright|upbeat|lively|leda|autonoe|laomedeia|sadachbia/.test(hint)) return "child";
  if (/soft|gentle|breezy|smooth|easy-going|aoede|achernar|vindemiatrix|sulafat|despina|callirrhoe/.test(hint)) return "female";
  if (/firm|gravelly|breathy|orus|algenib|alnilam|enceladus|iapetus/.test(hint)) return "male";
  return "neutral";
};

const VOICE_PRESETS = [
  { label: "Gulf Male Narrator", voiceId: "pNInz6obpgDQGcFmaJgB", desc: "Arabic Gulf male tone for confident narration", lang: "AR", provider: "ElevenLabs", model: ELEVENLABS_TTS_MODEL, persona: "male" as const },
  { label: "Egyptian Male Storyteller", voiceId: "nPczCjzI2devNBz1zQrb", desc: "Warm Arabic/Egyptian-style storyteller", lang: "AR", provider: "ElevenLabs", model: ELEVENLABS_TTS_MODEL, persona: "male" as const },
  { label: "Levantine Male Dialogue", voiceId: "onwK4e9ZLuTAKqWW03F9", desc: "Grounded Arabic dialogue voice", lang: "AR", provider: "ElevenLabs", model: ELEVENLABS_TTS_MODEL, persona: "male" as const },
  { label: "Arabic Classical Female", voiceId: "Z3R5wn05IrDiVCyEkUrK", desc: "Clear modern standard Arabic female delivery", lang: "AR", provider: "ElevenLabs", model: ELEVENLABS_TTS_MODEL, persona: "female" as const },
  ...GOOGLE_TTS_VOICES.map(([voiceId, tone]) => ({
    label: `Google ${voiceId}`,
    voiceId,
    desc: `Official Google Gemini TTS voice - ${tone}. Supports Arabic text through Gemini TTS language detection.`,
    lang: "AR/MULTI",
    provider: "Google",
    model: GOOGLE_TTS_MODEL,
    persona: inferGoogleVoicePersona(voiceId, tone),
  })),
  { label: "Child Voice", voiceId: "pPdl9cQBQq4p6mRkZy2Z", desc: "Bright youthful child-like tone", lang: "MULTI", provider: "ElevenLabs", model: ELEVENLABS_TTS_MODEL, persona: "child" as const },
  { label: "Documentary Narrator", voiceId: "DGTOOUoGpoP6UZ9uSWfA", desc: "Deep documentary narration voice", lang: "MULTI", provider: "ElevenLabs", model: ELEVENLABS_TTS_MODEL, persona: "senior" as const },
  { label: "Classic Confident Female", voiceId: "21m00Tcm4TlvDq8ikWAM", desc: "Crisp confident female narration", lang: "EN", provider: "ElevenLabs", model: ELEVENLABS_TTS_MODEL, persona: "female" as const },
  { label: "Deep Trailer Male", voiceId: "N2lVS1w4EtoT3dr4eOWO", desc: "Trailer-style low cinematic presence", lang: "EN", provider: "ElevenLabs", model: ELEVENLABS_TTS_MODEL, persona: "male" as const }
];

const SPEED_OPTIONS = [
  { value: "1/4", label: "1/4 Ultra-slow (Full rendering quality & superb details)" },
  { value: "2/4", label: "2/4 Medium (Balanced processing)" },
  { value: "3/4", label: "3/4 Fast (Good rendering speed)" },
  { value: "4/4", label: "4/4 Warp-speed (Draft draft)" }
];

type CinemaOutputItem = {
  id: string;
  videoUrl: string;
  posterUrl?: string;
  prompt: string;
  dialogueText: string;
  modelName: string;
  genre: string;
  lensType: string;
  cameraMovement: string;
  createdAt: string;
};

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
  const [activeDropdown, setActiveDropdown] = useState<"sceneType" | "model" | "duration" | "resolution" | "ratio" | "speed" | null>(null);
  const [selectedCharId, setSelectedCharId] = useState("char_1");
  const [selectedSceneType, setSelectedSceneType] = useState<(typeof SCENE_TYPES)[number]["id"]>("cinematic-dialogue");
  const [selectedGenre, setSelectedGenre] = useState("Noir");
  
  // Custom camera parameters states
  const [lensType, setLensType] = useState("85mm Anamorphic Cinema");
  const [cameraBody, setCameraBody] = useState("Clean Digital");
  const [focalLength, setFocalLength] = useState<number>(85);
  const [aperture, setAperture] = useState<string>("Auto");
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
  const [outputHistory, setOutputHistory] = useState<CinemaOutputItem[]>([]);
  const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);
  const [isCloningVoice, setIsCloningVoice] = useState(false);
  const [clonedVoiceAudioUrl, setClonedVoiceAudioUrl] = useState<string | null>(null);
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
  const activeSceneType = SCENE_TYPES.find((type) => type.id === selectedSceneType) ?? SCENE_TYPES[0];
  const activeModelObj = CINEMA_MODELS.find((m) => m.id === selectedModelId) || FALLBACK_CINEMA_MODEL;
  const activeGenreObj = AVAILABLE_GENRES.find((g) => g.id === selectedGenre) || AVAILABLE_GENRES[0];
  const activePaletteObj = COLOR_PALETTE_PRESETS.find((item) => item.value === colorPalette) ?? COLOR_PALETTE_PRESETS[0];
  const activeLightingObj = LIGHTING_PRESETS.find((item) => item.value === lightingStyle) ?? LIGHTING_PRESETS[0];
  const activeMovesetObj = CAMERA_MOVESET_PRESETS.find((item) => item.value === cameraMovesetStyle) ?? CAMERA_MOVESET_PRESETS[0];
  const activeScene = activeScenario?.scenes?.[0] ?? null;
  const durationOptions = useMemo(() => buildDurationOptions(activeModelObj), [activeModelObj]);
  const resolutionOptions = useMemo(() => buildResolutionOptions(activeModelObj), [activeModelObj]);
  const aspectRatioOptions = useMemo(() => buildAspectRatioOptions(activeModelObj), [activeModelObj]);
  const playbackDuration = Number.parseInt(duration, 10) || 8;
  const selectedVoicePreset = VOICE_PRESETS.find((v) => v.label === currentActor?.voice || v.voiceId === currentActor?.voice);
  const selectedVoiceId = currentActor?.voiceId || selectedVoicePreset?.voiceId || VOICE_PRESETS[0].voiceId;
  const selectedVoiceModel = currentActor?.voiceModel || selectedVoicePreset?.model || VOICE_PRESETS[0].model;
  const selectedVoiceDirection = currentActor?.voice || selectedVoicePreset?.label || "Natural cinematic voice";
  const selectedVoicePersona = getVoicePersonaMeta(selectedVoicePreset?.persona);
  // Fallback estimate used until the first /api/pricing/quote response
  // returns. Same numbers as the legacy client-side estimator.
  const fallbackEstimate = useMemo(
    () =>
      getVideoCreditsByRoute(activeModelObj.api_route, {
        duration: playbackDuration,
        ...(activeModelObj.family === "kling" ? { mode: resolution } : { resolution }),
        sound: soundEnabled,
        generate_audio: soundEnabled,
      }),
    [activeModelObj.api_route, activeModelObj.family, playbackDuration, resolution, soundEnabled],
  );

  // Authoritative estimate from the server (mirrors what /api/video will
  // actually deduct). Refreshed (debounced) whenever a pricing input
  // changes.
  const [serverEstimate, setServerEstimate] = useState<number | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const estimateRequestRef = useRef(0);

  useEffect(() => {
    const myRequestId = ++estimateRequestRef.current;
    setEstimateLoading(true);
    const debounceTimer = setTimeout(async () => {
      try {
        const res = await fetch("/api/pricing/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            modelRoute: activeModelObj.api_route,
            duration: playbackDuration,
            ...(activeModelObj.family === "kling"
              ? { mode: resolution }
              : { resolution }),
            sound: soundEnabled,
            generate_audio: soundEnabled,
          }),
        });
        if (!res.ok) throw new Error("quote_failed");
        const payload = await res.json();
        if (estimateRequestRef.current !== myRequestId) return;
        const value = Number(payload?.credits);
        setServerEstimate(Number.isFinite(value) && value > 0 ? value : null);
      } catch {
        if (estimateRequestRef.current === myRequestId) setServerEstimate(null);
      } finally {
        if (estimateRequestRef.current === myRequestId) setEstimateLoading(false);
      }
    }, 250);
    return () => clearTimeout(debounceTimer);
  }, [activeModelObj.api_route, activeModelObj.family, playbackDuration, resolution, soundEnabled]);

  const estimatedCredits = serverEstimate ?? fallbackEstimate;

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
    const stored = window.localStorage.getItem("cinema-studio-vso-output-history");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) setOutputHistory(parsed.slice(0, 18));
    } catch {
      window.localStorage.removeItem("cinema-studio-vso-output-history");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("cinema-studio-vso-output-history", JSON.stringify(outputHistory.slice(0, 18)));
  }, [outputHistory]);

  useEffect(() => {
    if (status !== "SUCCESS" || !generatedVideoUrl) return;
    setOutputHistory((prev) => {
      if (prev.some((item) => item.videoUrl === generatedVideoUrl)) return prev;
      const item: CinemaOutputItem = {
        id: `out_${Date.now().toString(36)}`,
        videoUrl: generatedVideoUrl,
        posterUrl: currentActor?.url,
        prompt,
        dialogueText,
        modelName: activeModelObj.name,
        genre: selectedGenre,
        lensType,
        cameraMovement,
        createdAt: new Date().toISOString(),
      };
      return [item, ...prev].slice(0, 18);
    });
  }, [activeModelObj.name, cameraMovement, currentActor?.url, dialogueText, generatedVideoUrl, lensType, prompt, selectedGenre, status]);

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

  const loadOutput = (item: CinemaOutputItem) => {
    setPrompt(item.prompt);
    setDialogueText(item.dialogueText);
    setSelectedGenre(item.genre);
    setLensType(item.lensType);
    setCameraMovement(item.cameraMovement);
    setGeneratedVideoUrl(item.videoUrl);
    generateClientScene(item.prompt, item.dialogueText, item.cameraMovement, item.lensType, item.genre);
    setStatus("SUCCESS");
    setRenderNotice(null);
    setIsPlaying(true);
  };

  const clearStudioHistory = () => {
    setOutputHistory([]);
    setRecentProjects([]);
    window.localStorage.removeItem("cinema-studio-vso-output-history");
    window.localStorage.removeItem("cinema-studio-vso-recent-projects");
  };

  const compressReferenceImage = async (file: File): Promise<File> => {
    if (!file.type.startsWith("image/") || file.size <= 2_500_000) return file;

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Image read failed"));
      reader.onload = () => resolve(String(reader.result || ""));
      reader.readAsDataURL(file);
    });

    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Image decode failed"));
      img.src = dataUrl;
    });

    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(image.width || maxSide, image.height || maxSide));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round((image.width || maxSide) * scale));
    canvas.height = Math.max(1, Math.round((image.height || maxSide) * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.82);
    });
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") || "reference";
    return new File([blob], `${name}.jpg`, { type: "image/jpeg" });
  };

  // Upload a single file by streaming it THROUGH the Next.js API route.
  // The browser → /api/media/upload → R2 path avoids any direct
  // browser → R2 PUT (which fails in production until the R2 bucket has
  // a CORS policy that allows the saadstudio.app origin).
  // The API returns a public https URL on success.
  const uploadImageFile = async (file: File) => {
    const uploadFile = await compressReferenceImage(file);
    const form = new FormData();
    form.append("file", uploadFile, uploadFile.name);

    // NOTE: do NOT set Content-Type manually — the browser will set
    // multipart/form-data with the correct boundary automatically.
    const response = await fetch("/api/media/upload", {
      method: "POST",
      body: form,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.publicUrl) {
      const message = response.status === 413
        ? "Image is still too large after compression"
        : payload?.error || "Storage upload failed";
      throw new Error(message);
    }
    return String(payload.publicUrl);
  };

  // Upload a batch of image files to R2 and return the list of public URLs.
  //
  // Failures used to silently fall back to a base64 data URL, which then
  // got POSTed to /api/cinema/render and tripped the 413 Content Too Large
  // limit on the route. We now FAIL the failed files (skip them from the
  // returned list), surface the error to the user via state, and keep only
  // the files that produced a real https:// URL so the render request
  // stays small.
  const readImageFiles = async (files: FileList | null, limit: number) => {
    const selected = Array.from(files ?? []).slice(0, Math.max(0, limit));
    const results = await Promise.all(
      selected.map(async (file) => {
        try {
          const url = await uploadImageFile(file);
          return { ok: true as const, url, name: file.name };
        } catch (err) {
          console.warn("Reference image upload failed:", file.name, err);
          return { ok: false as const, name: file.name, error: err };
        }
      }),
    );
    const successful = results.filter((r) => r.ok).map((r) => r.url);
    const failed = results.filter((r) => !r.ok).map((r) => r.name);
    if (failed.length > 0) {
      setUploadError(
        `Could not upload ${failed.length} image${failed.length === 1 ? "" : "s"} ` +
        `(${failed.join(", ")}). Please use a smaller image or try JPG/WebP.`
      );
    } else if (uploadError) {
      setUploadError(null);
    }
    return successful;
  };

  // Upload status so the buttons can show "Uploading…" instead of looking
  // frozen while /api/media/upload is in flight.
  const [refUploadBusy, setRefUploadBusy] = useState(false);
  const [endFrameUploadBusy, setEndFrameUploadBusy] = useState(false);
  // Drag-over visual feedback for each drop zone.
  const [refDragOver, setRefDragOver] = useState(false);
  const [endFrameDragOver, setEndFrameDragOver] = useState(false);
  // Surface upload failures to the user instead of silently falling back to
  // a megabyte-sized base64 data URL (which then trips the 413 limit on
  // /api/cinema/render).
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Convert a DataTransfer dropped on a zone into a FileList of images only.
  // Returns null when no usable image is present so the caller can no-op.
  const extractImagesFromDataTransfer = (dt: DataTransfer | null): FileList | null => {
    if (!dt) return null;
    const list = dt.files;
    if (!list || list.length === 0) return null;
    // Filter non-image files: rebuild a fresh FileList-like array via
    // DataTransfer (some browsers don't construct FileList directly).
    const imageFiles = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) return null;
    const dataT = new DataTransfer();
    imageFiles.forEach((f) => dataT.items.add(f));
    return dataT.files;
  };

  // Shared drag-event preventer so the browser doesn't navigate away when
  // a file is dropped outside the dedicated zones.
  const preventDefaultDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleReferenceUpload = async (files: FileList | null) => {
    const limit = activeModelObj.capabilities.max_reference_images;
    if (!limit) return;
    // Append to existing images (up to the model's limit) instead of
    // replacing them — previously a second upload wiped the first.
    const remaining = Math.max(0, limit - referenceImages.length);
    if (remaining === 0) return;
    setRefUploadBusy(true);
    try {
      const urls = await readImageFiles(files, remaining);
      if (urls.length > 0) {
        setReferenceImages((prev) => [...prev, ...urls].slice(0, limit));
      }
    } finally {
      setRefUploadBusy(false);
    }
  };

  const removeReferenceImage = (index: number) => {
    setReferenceImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEndFrameUpload = async (files: FileList | null) => {
    setEndFrameUploadBusy(true);
    try {
      const [url] = await readImageFiles(files, 1);
      if (url) setEndFrameUrl(url);
    } finally {
      setEndFrameUploadBusy(false);
    }
  };

  const clearEndFrame = () => setEndFrameUrl("");

  const assignPresetVoiceToActor = (actorId: string, presetLabel: string) => {
    const preset = VOICE_PRESETS.find((voice) => voice.label === presetLabel || voice.voiceId === presetLabel);
    if (!preset) return;
    setCastingActors((prev) =>
      prev.map((actor) =>
        actor.id === actorId ? { ...actor, voice: preset.label, voiceId: preset.voiceId, voiceModel: preset.model } : actor,
      ),
    );
  };

  const assignCustomVoiceToActor = (actorId: string, voiceDescription: string) => {
    const trimmed = voiceDescription.trim();
    if (!trimmed) return;
    setCastingActors((prev) =>
      prev.map((actor) =>
        actor.id === actorId ? { ...actor, voice: trimmed, voiceId: "", voiceModel: "" } : actor,
      ),
    );
  };

  const previewVoice = async (voiceId = selectedVoiceId, model = selectedVoiceModel) => {
    if (!dialogueText.trim()) return;
    voicePreviewRef.current?.pause();
    setIsPreviewingVoice(true);
    try {
      const response = await fetch("/api/generate/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "tts",
          model,
          text: dialogueText.slice(0, 1200),
          voice: voiceId,
          language_code: "ar",
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

  const cloneVoiceFromFile = async (file: File) => {
    if (!file || !currentActor) return;
    setIsCloningVoice(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(reader.error || new Error("Could not read audio file"));
        reader.readAsDataURL(file);
      });

      const response = await fetch("/api/generate/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "voice-cloning",
          text: dialogueText.slice(0, 1200) || "مرحبا، هذا اختبار صوت عربي من استوديو سعد.",
          cloneName: currentActor.name,
          sampleAudioUrls: [dataUrl],
          remove_background_noise: true,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.voiceId) throw new Error(payload?.error || "Voice cloning failed");

      const label = `Cloned Voice - ${payload.voiceName || currentActor.name}`;
      const audioUrl = typeof payload.audioUrl === "string" ? payload.audioUrl : null;
      setCastingActors((prev) =>
        prev.map((actor) =>
          actor.id === currentActor.id
            ? { ...actor, voice: label, voiceId: String(payload.voiceId), voiceModel: "voice-cloning", voiceSampleUrl: audioUrl }
            : actor,
        ),
      );
      setClonedVoiceAudioUrl(audioUrl);
      if (audioUrl) {
        setGeneratedAudioUrl(audioUrl);
        const audio = new Audio(audioUrl);
        voicePreviewRef.current = audio;
        await audio.play().catch(() => null);
      }
    } catch (err) {
      console.error("Voice cloning failed:", err);
      setRenderNotice(err instanceof Error ? err.message : "Voice cloning failed");
    } finally {
      setIsCloningVoice(false);
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

    // Defense in depth: only forward https:// URLs to the render API.
    // A legacy code path used to fall back to base64 data URLs when R2
    // upload failed, and those data URLs would balloon the JSON body past
    // the route's body-size limit (413 Content Too Large). The upload path
    // no longer produces data URLs, but we double-check here so that any
    // stale data:-URI in state can never hit the network.
    const safeReferenceImages = referenceImages.filter((u) => typeof u === "string" && /^https?:\/\//i.test(u));
    const safeEndFrameUrl = /^https?:\/\//i.test(endFrameUrl) ? endFrameUrl : "";
    const droppedRefs = referenceImages.length - safeReferenceImages.length;
    const droppedEnd = endFrameUrl && !safeEndFrameUrl ? 1 : 0;
    if (droppedRefs > 0 || droppedEnd > 0) {
      const total = droppedRefs + droppedEnd;
      setRenderNotice(
        `${total} image${total === 1 ? "" : "s"} were skipped because the upload to storage failed. ` +
        `Render is running without ${droppedRefs > 0 ? "reference images" : ""}${droppedRefs > 0 && droppedEnd > 0 ? " and " : ""}${droppedEnd > 0 ? "the end frame" : ""}.`
      );
    }

    try {
      const response = await fetch("/api/cinema/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt,
          dialogueText: dialogueText,
          sceneType: activeSceneType.label,
          sceneTypeDirection: activeSceneType.productionDirection,
          genre: selectedGenre,
          cameraMovement: cameraMovement,
          lensType: lensType,
          voiceId: selectedVoiceId,
          voiceModel: selectedVoiceModel,
          voiceDirection: selectedVoiceDirection,
          clonedVoiceAudioUrl: (currentActor as any)?.voiceSampleUrl || clonedVoiceAudioUrl || generatedAudioUrl,
          modelId: selectedModelId,
          modelRoute: activeModelObj.api_route,
          duration: playbackDuration,
          resolution,
          aspectRatio,
          referenceImages: safeReferenceImages,
          endFrameUrl: safeEndFrameUrl,
          negativePrompt,
          ...(activeModelObj.capabilities.has_cfg_scale ? { cfgScale } : {}),
          seed,
          sound: soundEnabled,
          ...(activeModelObj.family === "grok" ? { grokMode } : {}),
          colorPalette,
          lightingStyle,
          cameraMovesetStyle,
          batchSize,
          cameraBody,
          focalLength,
          aperture
        }),
      });

      const payload = await response.json().catch(() => null);

      // Path 1: provider call failed but server returned the AI scene plan
      // as a "preview" mockup. We treat this as a REAL failure now (status
      // FAILED) so the page stops pretending the render succeeded — and we
      // surface the actual provider error to the user.
      if (response.ok && payload?.status === "FAILED" && payload?.previewOnly) {
        if (payload.data) setActiveScenario(payload.data);
        const modelLabel = payload?.model?.name ? `${payload.model.name}: ` : "";
        const providerNote = payload?.providerError
          ? `${modelLabel}${payload.providerError}`
          : "Video provider rejected the request. Try another model or check your provider credentials.";
        setRenderNotice(providerNote);
        setProgress(0);
        setStatus("FAILED");
        setIsPlaying(false);
        return;
      }

      // Path 2: full completion with a real video URL (synchronous path).
      if (response.ok && payload?.status === "COMPLETED" && payload?.data) {
        const completedVideoUrl = payload.videoUrl ?? payload.data?.videoUrl ?? null;
        if (!completedVideoUrl) {
          throw new Error("Provider marked the job as completed but returned no video URL.");
        }
        setActiveScenario(payload.data);
        setGeneratedVideoUrl(completedVideoUrl);
        setRenderNotice(payload.previewOnly ? (payload.providerError || "Preview mode: video provider did not start.") : null);
        setProgress(100);
        setStatus("SUCCESS");
        setIsPlaying(true);
        return;
      }

      // Path 3: provider accepted the job, polling will pick it up.
      if ((response.status === 202 || response.ok) && payload?.success && (payload?.taskId || payload?.generationId)) {
        if (payload.data) setActiveScenario(payload.data);
        setRenderNotice(null);
        setProgress(payload.progress ?? 10);
        startPollingJob(payload.taskId ?? payload.generationId);
        return;
      }

      // Path 4: anything else is an unexpected error.
      throw new Error(payload?.error || payload?.providerError || "Cinema Studio render failed");
    } catch (err) {
      console.error("Cinema Studio render failed:", err);
      setRenderNotice(err instanceof Error ? err.message : "Cinema Studio render failed");
      setStatus("FAILED");
      setProgress(0);
    }
  };

  // Multi-route polling
  const startPollingJob = (jobId: string) => {
    let countAttempts = 0;
    let consecutivePollErrors = 0;
    const pollObj = setInterval(async () => {
      countAttempts++;
      if (countAttempts > 180) {
        clearInterval(pollObj);
        setRenderNotice("Render timed out before a real video URL was returned.");
        setStatus("FAILED");
        setProgress(0);
        setIsPlaying(false);
        return;
      }

      try {
        const response = await fetch(`/api/cinema/render?taskId=${encodeURIComponent(jobId)}`);
        const body = await response.json().catch(() => null);

        if (!response.ok) {
          const message = body?.error || body?.message || `Polling failed with status ${response.status}.`;
          const isTerminalMissingJob =
            response.status === 404 ||
            response.status === 410 ||
            /job not found|task not found|not found in cache storage|expired/i.test(String(message));

          if (isTerminalMissingJob) {
            clearInterval(pollObj);
            setRenderNotice("Render job expired or was not found. Please start a new render.");
            setStatus("FAILED");
            setProgress(0);
            setIsPlaying(false);
            return;
          }

          throw new Error(String(message));
        }

        consecutivePollErrors = 0;
        
        if (body.status === "COMPLETED") {
          clearInterval(pollObj);
          const completedVideoUrl = body.videoUrl ?? body.outputs?.[0] ?? null;
          if (!completedVideoUrl) {
            setRenderNotice("Provider marked the job as completed but returned no video URL.");
            setStatus("FAILED");
            setProgress(0);
            setIsPlaying(false);
            return;
          }
          if (body.data) setActiveScenario(body.data);
          setGeneratedVideoUrl(completedVideoUrl);
          setRenderNotice(null);
          setProgress(100);
          setStatus("SUCCESS");
          setIsPlaying(true);
        } else if (body.status === "FAILED") {
          clearInterval(pollObj);
          setRenderNotice(body.error || body.providerError || "Video provider failed the render job.");
          setStatus("FAILED");
          setProgress(0);
          setIsPlaying(false);
        } else {
          setProgress(body.progress || Math.min(countAttempts * 10, 95));
        }
      } catch (err) {
        consecutivePollErrors++;
        console.warn("Retrying state polling...", err);
        if (consecutivePollErrors >= 5) {
          clearInterval(pollObj);
          setRenderNotice(err instanceof Error ? err.message : "Unable to poll render status. Please try again.");
          setStatus("FAILED");
          setProgress(0);
          setIsPlaying(false);
        }
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
            backgroundColor: "bg-[#020617]",
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
          voiceModel: customVoicePreset?.model || selectedVoiceModel,
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
                className="absolute bg-[#8b5cf6]/40"
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
                className="absolute bg-[#8b5cf6]/20 rounded-full"
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
    <div
      id="full_studio_page"
      className="h-[calc(100dvh-56px)] bg-[#060c18] text-[#f8fafc] flex flex-col font-sans overflow-hidden select-none selection:bg-[#8b5cf6]/30 relative"
      // Swallow drag/drop that misses a dedicated drop-zone so the browser
      // doesn't navigate away and replace the page with the image.
      onDragOver={(e) => { e.preventDefault(); }}
      onDrop={(e) => { e.preventDefault(); }}
    >

      {/* CINEMATIC BACKGROUND LAYERS — Anamorphic Noir */}
      <div className="cine-bg-radial absolute inset-0 pointer-events-none z-0" aria-hidden />
      <div className="cine-flare f1" aria-hidden />
      <div className="cine-flare f2" aria-hidden />
      <div className="cine-bg-scan absolute inset-0 pointer-events-none z-[4]" aria-hidden />
      <div className="cine-bg-vignette absolute inset-0 pointer-events-none z-[5]" aria-hidden />
      <div className="cine-bg-grain absolute inset-0 pointer-events-none z-[6]" aria-hidden />
      <div className="absolute inset-0 pointer-events-none z-[3] overflow-hidden" aria-hidden>
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
      <header id="top_cinema_header" className="h-14 shrink-0 bg-[#0f172a] border-b border-[#1e293b] px-6 flex items-center justify-between relative z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#8b5cf6] to-[#06b6d4] flex items-center justify-center shadow-lg shadow-black/60">
            <Film size={16} className="text-white animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-[#8b5cf6] to-[#8b5cf6]">
              SAAD CINEMA STUDIO v5.0
            </span>
            <span className="text-xs font-mono bg-[#1e293b] text-[#8b5cf6] font-bold px-2 py-0.5 rounded border border-[#7c3aed]/40">
              ULTRA-ENGINE
            </span>
          </div>
        </div>

        {/* STATUS COUNTERS & LIVE TIMECODE IN HEADER */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="hidden md:flex items-center gap-1.5 bg-[#1e293b]/80 border border-[#1e293b]/80 px-3 py-1 rounded-full text-[#e2e8f0] text-[13px]">
            <span className="w-1.5 h-1.5 bg-[#c4b5fd] rounded-full inline-block animate-ping" />
            <span>PIPELINE: ACTIVE</span>
          </div>

          <div className="bg-[#1e293b] border border-[#1e293b] px-3.5 py-1 rounded-lg text-[#f8fafc] font-mono text-[13px] flex items-center gap-2">
            <span className="text-[#94a3b8]">ENG TIMECODE:</span>
            <span className="text-[#8b5cf6] tracking-wider font-bold">{timecode}</span>
          </div>
        </div>
      </header>

      {/* 2. THREE-PANEL EDITORIAL WORKSPACE */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative z-30">
        
        {/* SIDEBAR: LEFT NAV & PRESETS HISTORIES */}
        <aside id="suite_sidebar" className="w-[280px] bg-[#0f172a] border-r border-[#1e293b] flex flex-col justify-between hidden md:flex flex-shrink-0">
          
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
                className="w-full bg-[#1e293b] hover:bg-[#334155] border border-[#1e293b] text-sm font-bold py-2.5 px-3 rounded-lg flex items-center gap-2 text-[#f8fafc] transition-all duration-200 shadow-sm"
              >
                <Plus size={14} className="text-[#8b5cf6]" />
                <span>+ New cinematic project</span>
              </button>

              <button 
                onClick={() => setActiveModal(activeModal === "ai_director" ? null : "ai_director")}
                className={`w-full text-sm font-bold py-2.5 px-3 rounded-lg flex items-center justify-between transition-all duration-200 border ${
                  activeModal === "ai_director"
                    ? "bg-[#3730a3] text-[#a78bfa] border-[#8b5cf6]/70 shadow"
                    : "bg-transparent text-[#e2e8f0] hover:text-[#f8fafc] border-transparent"
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare size={14} className="text-[#8b5cf6]" />
                  <span>AI Director Assistant</span>
                </div>
                <span className="bg-[#1e293b] text-[#8b5cf6] text-[13px] font-mono px-1.5 py-0.2 rounded">LIVE</span>
              </button>
            </div>

            {/* Expander list Header */}
            <div>
              <span className="text-xs font-mono font-bold tracking-wider text-[#94a3b8] block mb-2 uppercase">
                Live control deck
              </span>
              <div className="flex flex-col gap-1 text-xs">
                <button 
                  onClick={() => setActiveModal("genre")}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#0f172a]/70 hover:bg-[#1e293b] text-[#e2e8f0] hover:text-[#f8fafc] transition-all border border-transparent hover:border-[#1e293b]/60"
                >
                  <span className="flex items-center gap-2">Scene genre</span>
                  <span className="text-[13px] text-[#94a3b8] font-mono italic">{selectedGenre}</span>
                </button>
                <button 
                  onClick={() => setActiveModal("style")}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#0f172a]/70 hover:bg-[#1e293b] text-[#e2e8f0] hover:text-[#f8fafc] transition-all border border-transparent hover:border-[#1e293b]/60"
                >
                  <span>Lighting and color system</span>
                  <span className="text-[13px] text-[#8b5cf6] font-mono">Custom</span>
                </button>
                <button 
                  onClick={() => setActiveModal("camera")}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#0f172a]/70 hover:bg-[#1e293b] text-[#e2e8f0] hover:text-[#f8fafc] transition-all border border-transparent hover:border-[#1e293b]/60"
                >
                  <span>Lens and camera setup</span>
                  <span className="text-[13px] text-[#94a3b8] font-mono truncate max-w-28 text-left">{lensType}</span>
                </button>
                <button 
                  onClick={() => setActiveModal("casting")}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#0f172a]/70 hover:bg-[#1e293b] text-[#e2e8f0] hover:text-[#f8fafc] transition-all border border-transparent hover:border-[#1e293b]/60"
                >
                  <span>Casting and actor room</span>
                  <span className="text-[13px] text-[#94a3b8] font-mono text-left">{currentActor.name}</span>
                </button>
              </div>
            </div>

            {/* Presets and History */}
            <div className="flex-1 flex flex-col min-h-[220px]">
              <span className="text-xs font-mono font-bold tracking-wider text-[#94a3b8] block mb-2.5 uppercase">
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
                          ? "bg-[#3730a3] border-[#8b5cf6]/70"
                          : "bg-[#1e293b] border-[#1e293b]/80 hover:bg-[#1e293b]/70 hover:border-[#7c3aed]"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[#f8fafc] font-bold truncate block flex-1 pl-2">
                          {proj.title}
                        </span>
                        <span className="text-[13px] bg-[#1e293b] text-[#8b5cf6] px-1.5 py-0.2 rounded font-mono uppercase">
                          {proj.genre}
                        </span>
                      </div>
                      <p className="text-xs text-[#94a3b8] line-clamp-1 truncate w-full">
                        {proj.prompt}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold tracking-wider text-[#94a3b8] uppercase">
                  Render outputs ({outputHistory.length})
                </span>
                <button
                  type="button"
                  onClick={clearStudioHistory}
                  className="text-[11px] text-red-300 hover:text-red-100 flex items-center gap-1"
                >
                  <Trash2 size={11} />
                  Clear history
                </button>
              </div>
              <div className="space-y-2 max-h-[210px] overflow-y-auto pr-1">
                {outputHistory.length === 0 ? (
                  <div className="rounded-lg border border-[#1e293b] bg-[#060c18] p-3 text-xs text-[#64748b]">
                    No rendered outputs yet.
                  </div>
                ) : outputHistory.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => loadOutput(item)}
                    className="w-full rounded-lg border border-[#1e293b] bg-[#060c18] hover:border-[#06b6d4]/60 text-left overflow-hidden"
                  >
                    <video src={item.videoUrl} className="w-full aspect-video object-cover bg-black" muted playsInline />
                    <div className="p-2">
                      <div className="text-xs font-bold text-[#f8fafc] truncate">{item.modelName}</div>
                      <div className="text-[11px] text-[#94a3b8] truncate">{item.prompt}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Core watermark credit line according to guidelines */}
          <div className="p-4 border-t border-[#1e293b] bg-[#060c18] text-center">
            <p className="text-xs text-[#64748b]">SAAD DIGITAL STUDIOS INC</p>
            <p className="text-[13px] text-[#94a3b8] font-mono mt-0.5">EST. 2026 • MULTI-PROVIDER VIDEO ENGINE</p>
          </div>
        </aside>

        {/* WORKSPACE AREA: DYNAMIC CANVAS STAGE & POPUPS */}
        <section id="center_viewport" className="flex-1 min-h-0 flex flex-col justify-between p-6 relative overflow-hidden bg-gradient-to-b from-[#020617] to-[#060c18]">
          
          {/* AESTHETIC CORNER MARKINGS FOR EMPTY STATE / PREVIEW */}
          <div className="absolute top-10 left-10 w-4 h-4 border-t border-l border-[#1e293b] pointer-events-none" />
          <div className="absolute top-10 right-10 w-4 h-4 border-t border-r border-[#1e293b] pointer-events-none" />
          <div className="absolute bottom-10 left-10 w-4 h-4 border-b border-l border-[#1e293b] pointer-events-none" />
          <div className="absolute bottom-10 right-10 w-4 h-4 border-b border-r border-[#1e293b] pointer-events-none" />

          {/* DYNAMIC CANVAS LOGIC OUTLINE */}
          <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
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
                  <span className="text-[13px] text-[#94a3b8] font-mono tracking-[0.3em] uppercase">
                    {activeModelObj.name} ULTRA ENGINE
                  </span>
                  
                  <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-[#8b5cf6] to-[#8b5cf6] font-sans max-w-xl leading-relaxed">
                    What would you shoot with infinite budget?
                  </h1>

                  <p className="text-xs text-[#94a3b8] font-sans max-w-md leading-relaxed">
                    Describe the cinematic scene below, then generate a production-style visual plan with lens, camera, lighting, subtitles, and sound direction.
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4 max-w-xl">
                    <button 
                      onClick={() => handleLoadProject(recentProjects[0])}
                      className="px-4 py-2 bg-[#0f172a]/50 hover:bg-[#1e293b]/50 border border-[#1e293b] hover:border-[#7c3aed] text-sm text-[#e2e8f0] hover:text-white rounded-lg transition-all"
                    >
                      Rainy city alley
                    </button>
                    <button 
                      onClick={() => handleLoadProject(recentProjects[1])}
                      className="px-4 py-2 bg-[#0f172a]/50 hover:bg-[#1e293b]/50 border border-[#1e293b] hover:border-[#7c3aed] text-sm text-[#e2e8f0] hover:text-white rounded-lg transition-all"
                    >
                      Mythic castle portrait
                    </button>
                    <button 
                      onClick={() => handleLoadProject(recentProjects[2])}
                      className="px-4 py-2 bg-[#0f172a]/50 hover:bg-[#1e293b]/50 border border-[#1e293b] hover:border-[#7c3aed] text-sm text-[#e2e8f0] hover:text-white rounded-lg transition-all"
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
                      className="absolute inset-0 border-2 border-t-[#8b5cf6] border-[#1e293b] rounded-full"
                    />
                    <div className="absolute inset-2 bg-[#060c18] rounded-full flex items-center justify-center">
                      <Camera size={20} className="text-[#8b5cf6]" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-[#e2e8f0] font-mono">
                      <span>Rendering frame and character detail {progress}%</span>
                      <span>GEN_PIPELINE_ACTIVE</span>
                    </div>
                    {/* Progress Bar Container Grid */}
                    <div className="h-1 w-full bg-[#1e293b] rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-[#8b5cf6] to-[#06b6d4] rounded-full"
                        style={{ width: `${progress}%` }}
                        layoutId="rendering_progress_bar"
                      />
                    </div>
                  </div>

                  <p className="text-[13px] text-[#94a3b8] leading-relaxed font-mono tracking-wide animate-pulse">
                    {progress < 30 ? "» Analyzing script intent and visual tone..."
                     : progress < 60 ? "» Mapping lighting paths, camera movement, and lens behavior..."
                     : progress < 85 ? "» Simulating depth, motion, glow, and atmosphere..."
                     : "» Rendering and composing the final cinematic frame plan..."}
                  </p>
                </motion.div>
              )}

              {/* FAILED VIEWPORT — provider rejected the request */}
              {status === "FAILED" && (
                <motion.div
                  key="failed_viewport"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full max-w-[600px] mx-auto px-6 py-8 rounded-xl border border-red-500/40 bg-red-500/5 text-center flex flex-col items-center gap-3"
                >
                  <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/40 flex items-center justify-center">
                    <X size={22} className="text-red-400" />
                  </div>
                  <h2 className="text-lg font-bold text-red-300 tracking-tight">
                    Render Failed
                  </h2>
                  <p className="text-sm text-[#e2e8f0] leading-relaxed max-w-md">
                    {renderNotice || "The video provider rejected the request."}
                  </p>
                  <p className="text-xs text-[#94a3b8] leading-relaxed max-w-md">
                    Tip: try a different model from the dropdown below, simplify the prompt,
                    or remove reference images and try again.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setStatus("IDLE");
                      setRenderNotice(null);
                      setProgress(0);
                    }}
                    className="mt-1 px-4 py-1.5 rounded-lg bg-[#8b5cf6] hover:bg-[#a78bfa] text-white text-xs font-bold transition-colors"
                  >
                    Dismiss
                  </button>
                </motion.div>
              )}

              {/* CINEMATIC WIDESCREEN ACTIVE PLAYER SIMULATOR VIEWPORT */}
              {status === "SUCCESS" && activeScenario && activeScene && (
                <motion.div
                  key="success_player"
                  initial={{ opacity: 0, scale: 0.99 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full max-w-[980px] aspect-video rounded-xl overflow-hidden bg-black border border-[#1e293b] relative shadow-2xl shadow-black/80 flex flex-col justify-between"
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
                      className="absolute inset-0 w-full h-full object-contain select-none z-0 bg-black"
                      muted
                      loop
                      playsInline
                      controls
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
                      <span className="text-xs font-mono bg-[#3730a3]/90 border border-[#8b5cf6]/60 text-[#a78bfa] px-2.5 py-0.5 rounded uppercase font-bold tracking-wider">
                        PREVIEW ACTIVE
                      </span>
                      <span className="text-xs font-mono text-[#e2e8f0] bg-black/40 px-2 py-0.5 rounded truncate max-w-[240px] block">
                        {lensType} • {cameraMovement}
                      </span>
                    </div>

                    <div className="bg-black/40 px-2 py-0.5 rounded text-xs font-mono text-[#e2e8f0]">
                      24.00 FPS • PRORES RAW
                    </div>
                  </div>

                  {generatedVideoUrl && (
                    <div className="absolute top-14 right-4 z-50 flex items-center gap-2">
                      <a
                        href={generatedVideoUrl}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#06b6d4]/60 bg-black/70 px-3 py-1.5 text-xs font-bold text-[#67e8f9] hover:bg-[#083344]"
                      >
                        <Download size={13} />
                        Download
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(generatedVideoUrl).catch(() => null);
                          setRenderNotice("Output video URL copied.");
                        }}
                        className="rounded-lg border border-[#1e293b] bg-black/70 px-3 py-1.5 text-xs font-bold text-[#e2e8f0] hover:bg-[#1e293b]"
                      >
                        Copy URL
                      </button>
                    </div>
                  )}

                  {renderNotice && (
                    <div className="absolute top-12 left-4 right-4 z-45 rounded-lg border border-[#06b6d4]/40 bg-black/70 px-3 py-2 text-xs font-bold text-[#06b6d4] backdrop-blur-sm">
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
                  {!generatedVideoUrl && <div className="p-4 relative z-45 bg-gradient-to-t from-black/95 to-transparent flex flex-col gap-3">
                    
                    {/* Media Seekable Timeline Bar */}
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] font-mono text-[#94a3b8] w-10">00:00</span>
                      <div className="flex-1 h-1 bg-[#1e293b] rounded-full relative overflow-hidden group hover:h-1.5 transition-all cursor-pointer">
                        <div 
                          className="h-full bg-[#8b5cf6] rounded-full transition-all"
                          style={{ width: `${Math.min(100, (currentTime / playbackDuration) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[13px] font-mono text-[#94a3b8] w-10 text-right">
                        00:{String(playbackDuration).padStart(2, "0")}
                      </span>
                    </div>

                    {/* Left/Right actions inside player */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setIsPlaying(!isPlaying)}
                          className="w-7 h-7 bg-[#1e293b] border border-[#7c3aed] hover:bg-[#334155] text-[#f8fafc] hover:text-white rounded-lg flex items-center justify-center transition-colors outline-none"
                        >
                          {isPlaying ? <Pause size={11} /> : <Play size={11} className="relative left-[1px]" />}
                        </button>
                        <button 
                          onClick={() => setCurrentTime(0)}
                          className="w-7 h-7 bg-[#1e293b] border border-[#7c3aed] hover:bg-[#334155] text-[#f8fafc] hover:text-white rounded-lg flex items-center justify-center transition-colors outline-none"
                        >
                          <RotateCcw size={11} />
                        </button>

                        <div className="h-3 w-[1px] bg-[#1e293b] mx-1" />

                        {/* Volume settings */}
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setIsMuted(!isMuted)}
                            className="text-[#e2e8f0] hover:text-white transition-colors outline-none"
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
                            className="w-12 h-1 bg-[#0f172a] rounded-lg appearance-none cursor-pointer accent-[#8b5cf6]"
                          />
                        </div>
                      </div>

                      <div className="text-xs font-mono text-[#94a3b8] flex items-center gap-2">
                        <span>AUDIO: {generatedAudioUrl ? "ELEVENLABS PREVIEW READY" : `PREVIEW MIX (${activeScene.soundEffects})`}</span>
                        <span>•</span>
                        <span className="text-[#8b5cf6] font-bold uppercase">SEC: {currentTime.toFixed(1)}s</span>
                      </div>
                    </div>

                  </div>}

                </motion.div>
              )}

              {status === "SUCCESS" && outputHistory.length > 0 && (
                <motion.div
                  key="output_history_strip"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full max-w-[980px] mx-auto mt-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#94a3b8]">Render history</span>
                    <button
                      type="button"
                      onClick={clearStudioHistory}
                      className="text-xs text-red-300 hover:text-red-100 flex items-center gap-1"
                    >
                      <Trash2 size={12} />
                      Clear history
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {outputHistory.slice(0, 3).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => loadOutput(item)}
                        className="rounded-xl border border-[#1e293b] bg-[#0f172a] overflow-hidden text-left hover:border-[#06b6d4]/70 transition-colors"
                      >
                        <video src={item.videoUrl} className="w-full aspect-video object-cover bg-black" muted playsInline />
                        <div className="p-3">
                          <div className="text-xs font-bold text-white truncate">{item.modelName}</div>
                          <div className="text-[11px] text-[#94a3b8] truncate mt-1">{item.genre} - {item.lensType}</div>
                          <a
                            href={item.videoUrl}
                            download
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#67e8f9]"
                          >
                            <Download size={12} />
                            Download clip
                          </a>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* DYNAMIC SELECTION STATUS LABELS/PILLS ROW */}
          <div className="max-w-[850px] mx-auto w-full mb-3 flex flex-wrap items-center justify-center gap-2 pointer-events-auto">
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === "sceneType" ? null : "sceneType")}
                className={`px-3 py-1.5 rounded-full border text-[12px] font-bold flex items-center gap-1.5 transition-all duration-200 outline-none backdrop-blur-md ${
                  activeDropdown === "sceneType"
                    ? "bg-[#1e293b] text-[#67e8f9] border-[#06b6d4]/60 shadow-lg shadow-[#06b6d4]/10"
                    : "bg-[#1e293b]/70 border-[#1e293b] hover:bg-[#1e293b] hover:border-[#06b6d4] text-[#e2e8f0] hover:text-white hover:-translate-y-px"
                }`}
              >
                <Film size={11} className="text-[#06b6d4]" />
                <span>Scene: {activeSceneType.shortLabel}</span>
                <ChevronDown size={10} className={`text-[#94a3b8] transition-transform ${activeDropdown === "sceneType" ? "rotate-180" : ""}`} />
              </button>

              {activeDropdown === "sceneType" && (
                <div className="absolute bottom-9 left-1/2 -translate-x-1/2 w-80 max-h-[360px] overflow-y-auto bg-[#1e293b] border border-[#06b6d4]/60 rounded-xl p-2 shadow-2xl shadow-black/45 z-50 text-left font-sans">
                  <div className="px-2 pb-2 mb-2 border-b border-[#334155]">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-[#06b6d4] font-mono font-bold">Scene Type</div>
                    <div className="text-xs text-[#94a3b8] mt-1">Choose the production format before rendering.</div>
                  </div>
                  <div className="space-y-1">
                    {SCENE_TYPES.map((type) => {
                      const isSelected = selectedSceneType === type.id;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => {
                            setSelectedSceneType(type.id);
                            setActiveDropdown(null);
                          }}
                          className={`w-full text-left p-2 rounded-lg border transition-colors ${
                            isSelected
                              ? "bg-[#06b6d4]/10 border-[#06b6d4]/60 text-white"
                              : "bg-[#0f172a]/70 border-[#334155] text-[#e2e8f0] hover:bg-[#0f172a] hover:border-[#7c3aed]/60"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[13px] font-bold">{type.label}</span>
                            {isSelected && <span className="text-[10px] font-mono text-[#67e8f9]">ACTIVE</span>}
                          </div>
                          <p className="mt-1 text-xs text-[#94a3b8] leading-snug">{type.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setActiveModal("genre")}
              className={`px-3 py-1.5 rounded-full border text-[12px] font-bold flex items-center gap-1.5 transition-all duration-200 outline-none backdrop-blur-md ${
                activeModal === "genre"
                  ? "bg-[#3730a3] text-[#a78bfa] border-[#8b5cf6]/70 shadow-lg shadow-[#8b5cf6]/10"
                  : "bg-[#1e293b]/70 border-[#1e293b] hover:bg-[#1e293b] hover:border-[#7c3aed] text-[#e2e8f0] hover:text-white hover:-translate-y-px"
              }`}
            >
              <Drama size={12} className="text-[#a78bfa]" />
              <span>Mood</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveModal("style")}
              className={`px-3 py-1.5 rounded-full border text-[12px] font-bold flex items-center gap-1.5 transition-all duration-200 outline-none backdrop-blur-md ${
                activeModal === "style"
                  ? "bg-[#06b6d4]/12 text-[#06b6d4] border-[#06b6d4]/50 shadow-lg shadow-[#06b6d4]/10"
                  : "bg-[#1e293b]/70 border-[#1e293b] hover:bg-[#1e293b] hover:border-[#7c3aed] text-[#e2e8f0] hover:text-white hover:-translate-y-px"
              }`}
            >
              <Palette size={11} className="text-[#06b6d4]" />
              <span>Grade</span>
            </button>

            <button
              onClick={() => setActiveModal("camera")}
              className={`px-3 py-1.5 rounded-full border text-[12px] font-bold flex items-center gap-1.5 transition-all duration-200 outline-none backdrop-blur-md ${
                activeModal === "camera"
                  ? "bg-[#3730a3] text-[#8b5cf6] border-[#8b5cf6]/50 shadow-lg shadow-[#8b5cf6]/10"
                  : "bg-[#1e293b]/70 border-[#1e293b] hover:bg-[#1e293b] hover:border-[#7c3aed] text-[#e2e8f0] hover:text-white hover:-translate-y-px"
              }`}
            >
              <Camera size={11} className="text-[#8b5cf6]" />
              <span>
                Rig:{" "}
                <span className="font-mono text-[#8b5cf6]">
                  {cameraBody.split(" ").slice(0, 2).join(" ")} · {focalLength}mm · {aperture}
                </span>
              </span>
            </button>

            <button
              onClick={() => setActiveModal("casting")}
              className={`px-3 py-1.5 rounded-full border text-[12px] font-bold flex items-center gap-1.5 transition-all duration-200 outline-none backdrop-blur-md ${
                activeModal === "casting"
                  ? "bg-[#3730a3] text-[#c4b5fd] border-[#c4b5fd]/50 shadow-lg shadow-[#c4b5fd]/10"
                  : "bg-[#1e293b]/70 border-[#1e293b] hover:bg-[#1e293b] hover:border-[#7c3aed] text-[#e2e8f0] hover:text-white hover:-translate-y-px"
              }`}
            >
              <UserCheck size={11} className="text-[#c4b5fd]" />
              <span>Cast</span>
            </button>

            <button
              onClick={() => setActiveModal("voice")}
              className={`px-3 py-1.5 rounded-full border text-[12px] font-bold flex items-center gap-1.5 transition-all duration-200 outline-none backdrop-blur-md ${
                activeModal === "voice"
                  ? "bg-[#831843] text-[#f9a8d4] border-[#ec4899]/50 shadow-lg shadow-[#ec4899]/10"
                  : "bg-[#1e293b]/70 border-[#1e293b] hover:bg-[#1e293b] hover:border-[#7c3aed] text-[#e2e8f0] hover:text-white hover:-translate-y-px"
              }`}
            >
              <AudioLines size={12} className="text-[#ec4899]" />
              <span>Speak</span>
            </button>
          </div>

          {/* 3. SLICK RUNWAY-STYLE GENERATE INPUT BAR */}
          {/* Upload error banner — shown when R2 storage rejects the upload */}
          {uploadError && (
            <div className="max-w-[850px] mx-auto w-full mb-2 px-3 py-2 rounded-lg border border-red-500/50 bg-red-500/10 text-red-200 text-xs flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <span className="font-bold mr-1">Upload failed:</span>
                <span>{uploadError}</span>
              </div>
              <button
                type="button"
                onClick={() => setUploadError(null)}
                className="shrink-0 p-1 rounded hover:bg-red-500/20 transition-colors"
                aria-label="Dismiss"
              >
                <X size={12} />
              </button>
            </div>
          )}

          <div id="footer_generate_ribbon" className="max-w-[850px] mx-auto w-full shrink-0 bg-[#0f172a] border border-[#1e293b] rounded-xl p-3 shadow-2xl relative z-40">

            {/* Input Row */}
            {/* Input Row */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setActiveModal("casting")}
                title="Add or synthesize an actor"
                className="w-10 h-10 bg-[#1e293b] hover:bg-[#334155] border border-[#1e293b]/70 rounded-lg flex items-center justify-center text-[#e2e8f0] hover:text-white transition-colors"
              >
                <Plus size={16} />
              </button>

              <div className="flex-1 min-w-0 pr-1">
                <input 
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={activeSceneType.promptPlaceholder}
                  className="w-full bg-transparent text-sm text-white focus:outline-none placeholder:text-[#64748b] text-left font-sans"
                />
              </div>

              <button
                onClick={triggerRender}
                disabled={status === "RENDERING"}
                className={`relative overflow-hidden h-10 px-5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all duration-300 outline-none ${
                  status === "RENDERING"
                    ? "bg-[#1e293b] text-[#94a3b8] cursor-not-allowed cine-shuttering"
                    : "bg-gradient-to-br from-[#8b5cf6] to-[#06b6d4] hover:from-[#a78bfa] hover:to-[#22d3ee] text-black shadow-lg shadow-[#8b5cf6]/30 hover:shadow-[#8b5cf6]/50 hover:-translate-y-px font-extrabold cursor-pointer"
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
                <Mic size={11} className="text-[#94a3b8]" />
                <input 
                  type="text"
                  value={dialogueText}
                  onChange={(e) => setDialogueText(e.target.value)}
                  placeholder={activeSceneType.dialoguePlaceholder}
                  className="bg-transparent text-sm text-[#e2e8f0] focus:outline-none placeholder:text-[#64748b] text-left w-[200px] md:w-[320px] font-sans"
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
                        ? "bg-[#3730a3] border border-[#8b5cf6] text-[#a78bfa] shadow-md shadow-black/30" 
                        : "bg-[#0f172a] hover:bg-[#0f172a]/85 border border-[#1e293b] text-[#f8fafc] hover:text-white"
                    }`}
                  >
                    <span>🎬 {activeModelObj.name}</span>
                    <ChevronDown size={10} className={`text-[#94a3b8] transition-transform ${activeDropdown === "model" ? "rotate-180 text-[#8b5cf6]" : ""}`} />
                  </button>

                  {activeDropdown === "model" && (
                    <div className="cine-dd-panel cine-open absolute bottom-9 left-1/2 md:-left-12 -translate-x-[40%] md:translate-x-0 w-80 max-h-[380px] overflow-y-auto bg-[#1e293b] border border-[#7c3aed] rounded-xl p-2.5 shadow-2xl shadow-black/45 z-50 text-left font-sans animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <div className="text-[13px] text-[#f8fafc] font-extrabold pb-2 border-b border-[#475569] mb-2 font-mono flex items-center justify-between px-1">
                        <span className="text-[11px] uppercase tracking-[0.2em] text-[#8b5cf6] font-mono">CINEMATIC MODEL DIRECTORY</span>
                        <span className="text-[11px] text-[#64748b] uppercase tracking-wider">Select Engine</span>
                      </div>
                      <div className="space-y-3">
                        {(Array.from(new Set(CINEMA_MODELS.map(getModelCategory))) as string[]).map((cat, catIdx) => {
                          const catModels = CINEMA_MODELS.filter(m => getModelCategory(m) === cat);
                          return (
                            <div key={cat} className="space-y-1">
                              <div className="text-[10px] font-mono font-bold text-[#94a3b8] tracking-[0.18em] text-left uppercase px-2 py-0.5 border-l-2 border-[#7c3aed]">
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
                                          ? "bg-[#5b21b6] text-[#ffffff] border border-[#7c3aed] font-bold shadow-inner shadow-[#7c3aed]/20"
                                          : "text-[#f8fafc] hover:text-[#060c18] hover:bg-[#334155] border border-transparent hover:border-[#7c3aed]/40"
                                      }`}
                                    >
                                      {/* Left badges column */}
                                      <div className="flex items-center gap-1 font-mono text-[10px]" dir="ltr">
                                        {model.capabilities.max_reference_images > 0 && (
                                          <span className="px-1.5 py-[2px] rounded bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 text-[#8b5cf6] font-bold tracking-wider">REF×{model.capabilities.max_reference_images}</span>
                                        )}
                                        {model.badge && (
                                          <span className={`px-1.5 py-[2px] rounded font-bold tracking-wider ${
                                            model.badge === "TOP" ? "bg-[#1e1b4b] border border-[#7c3aed] text-[#8b5cf6]" :
                                            model.badge === "PRO" ? "bg-[#1e3a8a] border border-[#3b82f6] text-[#60a5fa]" :
                                            model.badge === "FAST" ? "bg-[#064e3b] border border-[#10b981] text-[#34d399]" :
                                            "bg-[#312e81] border border-[#7c3aed] text-[#94a3b8]"
                                          }`}>
                                            {model.badge}
                                          </span>
                                        )}
                                      </div>

                                      {/* Right name column */}
                                      <div className="flex items-center gap-2">
                                        <span className="text-[13px] font-medium">{model.name}</span>
                                        <span className={`w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor] ${
                                          model.family === "kling" ? "bg-[#7c3aed] text-[#7c3aed]" :
                                          model.family === "hailuo" ? "bg-[#3b82f6] text-[#3b82f6]" :
                                          model.family === "sora" ? "bg-[#8b5cf6] text-[#8b5cf6]" :
                                          model.family === "veo" ? "bg-[#4f46e5] text-[#4f46e5]" :
                                          model.family === "seedance" ? "bg-[#10b981] text-[#10b981]" :
                                          "bg-[#ec4899] text-[#ec4899]"
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
                    className={`px-2 py-1 bg-[#0f172a] border border-[#1e293b] rounded text-xs font-mono text-[#e2e8f0] hover:text-white transition-colors flex items-center gap-1 cursor-pointer`}
                  >
                    <span>⏱️ {duration}</span>
                    <ChevronDown size={8} className="text-[#64748b]" />
                  </button>

                  {activeDropdown === "duration" && (
                    <div className="absolute bottom-9 right-0 md:-right-8 w-52 bg-[#1e293b] border border-[#7c3aed] rounded-lg p-1.5 shadow-2xl shadow-black/40 z-50 text-right font-sans">
                      <div className="text-xs text-[#64748b] pb-1 mb-1 border-b border-[#475569] px-1.5 font-bold">Select render duration</div>
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
                                  ? "bg-[#5b21b6] text-[#ffffff] font-bold" 
                                  : "text-[#f8fafc] hover:text-[#060c18] hover:bg-[#334155]"
                              }`}
                            >
                              <span className="text-[13px] font-bold font-mono px-1 rounded bg-[#1e1b4b] text-[#8b5cf6]">
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
                    className={`px-2 py-1 bg-[#0f172a] border border-[#1e293b] rounded text-xs font-mono text-[#e2e8f0] hover:text-white transition-colors flex items-center gap-1 cursor-pointer`}
                  >
                    <span>📐 {resolution}</span>
                    <ChevronDown size={8} className="text-[#64748b]" />
                  </button>

                  {activeDropdown === "resolution" && (
                    <div className="absolute bottom-9 right-0 md:-right-8 w-44 bg-[#1e293b] border border-[#7c3aed] rounded-lg p-1.5 shadow-2xl shadow-black/40 z-50 text-right font-sans">
                      <div className="text-xs text-[#64748b] pb-1 mb-1 border-b border-[#475569] px-1.5 font-bold">AI output resolution</div>
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
                                isSelected ? "bg-[#5b21b6] text-[#ffffff] font-bold" : "text-[#f8fafc] hover:text-[#060c18] hover:bg-[#334155]"
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
                    className={`px-2 py-1 bg-[#0f172a] border border-[#1e293b] rounded text-xs font-mono text-[#e2e8f0] hover:text-white transition-colors flex items-center gap-1 cursor-pointer`}
                  >
                    <span>🎞️ {aspectRatio}</span>
                    <ChevronDown size={8} className="text-[#64748b]" />
                  </button>

                  {activeDropdown === "ratio" && (
                    <div className="absolute bottom-9 right-0 md:-right-8 w-48 bg-[#1e293b] border border-[#7c3aed] rounded-lg p-1.5 shadow-2xl shadow-black/40 z-50 text-right font-sans">
                      <div className="text-xs text-[#64748b] pb-1 mb-1 border-b border-[#475569] px-1.5 font-bold">Frame and scene aspect</div>
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
                                isSelected ? "bg-[#5b21b6] text-[#ffffff] font-bold" : "text-[#f8fafc] hover:text-[#060c18] hover:bg-[#334155]"
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
                    className={`px-2 py-1 bg-[#0f172a] border border-[#1e293b] rounded text-xs font-mono text-[#e2e8f0] hover:text-white transition-colors flex items-center gap-1 cursor-pointer`}
                  >
                    <span>⚡ Speed: {batchSize}</span>
                    <ChevronDown size={8} className="text-[#64748b]" />
                  </button>

                  {activeDropdown === "speed" && (
                    <div className="absolute bottom-9 right-0 w-52 bg-[#1e293b] border border-[#7c3aed] rounded-lg p-1.5 shadow-2xl shadow-black/40 z-50 text-right font-sans text-right">
                      <div className="text-xs text-[#64748b] pb-1 mb-1 border-b border-[#475569] px-1.5 font-bold">Batch and speed mode</div>
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
                                isSelected ? "bg-[#5b21b6] text-[#ffffff] font-bold" : "text-[#f8fafc] hover:text-[#060c18] hover:bg-[#334155]"
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

              <div className="w-full flex flex-wrap items-center gap-2 text-sm text-[#e2e8f0]">
                {activeModelObj.capabilities.max_reference_images > 0 && (
                  <div
                    className={`flex items-center gap-2 flex-wrap p-1.5 rounded-lg border transition-all duration-150 ${
                      refDragOver
                        ? "border-[#8b5cf6] bg-[#8b5cf6]/10 ring-2 ring-[#8b5cf6]/40"
                        : "border-transparent"
                    }`}
                    onDragEnter={(e) => {
                      preventDefaultDrag(e);
                      if (referenceImages.length < activeModelObj.capabilities.max_reference_images) {
                        setRefDragOver(true);
                      }
                    }}
                    onDragOver={(e) => {
                      preventDefaultDrag(e);
                      // Required so the drop event will fire.
                      e.dataTransfer.dropEffect =
                        referenceImages.length >= activeModelObj.capabilities.max_reference_images
                          ? "none"
                          : "copy";
                    }}
                    onDragLeave={(e) => {
                      // Only clear the highlight when the cursor leaves the
                      // wrapper itself, not when it moves over a child element.
                      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                      setRefDragOver(false);
                    }}
                    onDrop={(e) => {
                      preventDefaultDrag(e);
                      setRefDragOver(false);
                      const files = extractImagesFromDataTransfer(e.dataTransfer);
                      if (files) handleReferenceUpload(files);
                    }}
                  >
                    {/* Upload button — disabled when limit reached */}
                    <label
                      className={`px-2 py-1 rounded border border-[#1e293b] bg-[#0f172a] transition-colors ${
                        refUploadBusy
                          ? "opacity-60 cursor-wait"
                          : referenceImages.length >= activeModelObj.capabilities.max_reference_images
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:border-[#8b5cf6]/70 cursor-pointer"
                      }`}
                      title="Click to browse or drag-and-drop images here"
                    >
                      {refUploadBusy
                        ? "Uploading…"
                        : `Ref images ${referenceImages.length}/${activeModelObj.capabilities.max_reference_images}`}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        disabled={refUploadBusy || referenceImages.length >= activeModelObj.capabilities.max_reference_images}
                        onChange={(e) => {
                          handleReferenceUpload(e.target.files);
                          // Reset the input so the same file can be re-selected
                          // after being removed.
                          e.target.value = "";
                        }}
                      />
                    </label>

                    {/* Thumbnails for already-uploaded images */}
                    {referenceImages.map((url, idx) => (
                      <div
                        key={`ref-${idx}-${url.slice(-12)}`}
                        className="relative group w-12 h-12 rounded-md overflow-hidden border border-[#1e293b] bg-[#020617]"
                      >
                        <img
                          src={url}
                          alt={`Reference ${idx + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => removeReferenceImage(idx)}
                          aria-label={`Remove reference image ${idx + 1}`}
                          title="Remove"
                          className="absolute top-0 right-0 w-4 h-4 flex items-center justify-center bg-black/80 hover:bg-red-500 text-white text-[10px] rounded-bl-md opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={10} />
                        </button>
                        <span className="absolute bottom-0 left-0 text-[9px] font-mono px-1 bg-black/60 text-[#a78bfa]">
                          {idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {activeModelObj.capabilities.has_end_frame && (
                  <div
                    className={`flex items-center gap-2 p-1.5 rounded-lg border transition-all duration-150 ${
                      endFrameDragOver
                        ? "border-[#22d3ee] bg-[#22d3ee]/10 ring-2 ring-[#22d3ee]/40"
                        : "border-transparent"
                    }`}
                    onDragEnter={(e) => {
                      preventDefaultDrag(e);
                      setEndFrameDragOver(true);
                    }}
                    onDragOver={(e) => {
                      preventDefaultDrag(e);
                      e.dataTransfer.dropEffect = "copy";
                    }}
                    onDragLeave={(e) => {
                      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                      setEndFrameDragOver(false);
                    }}
                    onDrop={(e) => {
                      preventDefaultDrag(e);
                      setEndFrameDragOver(false);
                      const files = extractImagesFromDataTransfer(e.dataTransfer);
                      if (files) handleEndFrameUpload(files);
                    }}
                  >
                    <label
                      className={`px-2 py-1 rounded border border-[#1e293b] bg-[#0f172a] transition-colors ${
                        endFrameUploadBusy ? "opacity-60 cursor-wait" : "hover:border-[#8b5cf6]/70 cursor-pointer"
                      }`}
                      title="Click to browse or drag-and-drop an image here"
                    >
                      {endFrameUploadBusy
                        ? "Uploading…"
                        : endFrameUrl
                          ? "Replace end frame"
                          : "End frame"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={endFrameUploadBusy}
                        onChange={(e) => {
                          handleEndFrameUpload(e.target.files);
                          e.target.value = "";
                        }}
                      />
                    </label>

                    {/* End frame thumbnail (visible only after upload) */}
                    {endFrameUrl && (
                      <div className="relative group w-12 h-12 rounded-md overflow-hidden border border-[#1e293b] bg-[#020617]">
                        <img
                          src={endFrameUrl}
                          alt="End frame"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                          }}
                        />
                        <button
                          type="button"
                          onClick={clearEndFrame}
                          aria-label="Remove end frame"
                          title="Remove"
                          className="absolute top-0 right-0 w-4 h-4 flex items-center justify-center bg-black/80 hover:bg-red-500 text-white text-[10px] rounded-bl-md opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={10} />
                        </button>
                        <span className="absolute bottom-0 left-0 text-[9px] font-mono px-1 bg-black/60 text-[#22d3ee]">
                          END
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {activeModelObj.capabilities.has_negative_prompt && (
                  <input
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="Negative prompt"
                    className="min-w-[150px] flex-1 bg-[#0f172a] border border-[#1e293b] rounded px-2 py-1 text-sm text-[#f8fafc] outline-none focus:border-[#7c3aed]"
                  />
                )}

                {activeModelObj.capabilities.has_cfg_scale && (
                  <label className="flex items-center gap-2 px-2 py-1 rounded border border-[#1e293b] bg-[#0f172a]">
                    CFG {cfgScale.toFixed(1)}
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={cfgScale}
                      onChange={(e) => setCfgScale(Number(e.target.value))}
                      className="w-20 accent-[#8b5cf6]"
                    />
                  </label>
                )}

                {activeModelObj.capabilities.has_seed && (
                  <input
                    value={seed}
                    onChange={(e) => setSeed(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="Seed"
                    className="w-24 bg-[#0f172a] border border-[#1e293b] rounded px-2 py-1 text-sm text-[#f8fafc] outline-none focus:border-[#7c3aed]"
                  />
                )}

                {activeModelObj.capabilities.has_sound && (
                  <button
                    type="button"
                    onClick={() => setSoundEnabled((v) => !v)}
                    className={`px-2 py-1 rounded border font-bold ${soundEnabled ? "border-[#8b5cf6]/50 bg-[#8b5cf6]/15 text-[#8b5cf6]" : "border-[#1e293b] bg-[#0f172a] text-[#94a3b8]"}`}
                  >
                    Sound {soundEnabled ? "ON" : "OFF"}
                  </button>
                )}

                {activeModelObj.family === "grok" && (
                  <select
                    value={grokMode}
                    onChange={(e) => setGrokMode(e.target.value as "fun" | "normal" | "spicy")}
                    className="bg-[#0f172a] border border-[#1e293b] rounded px-2 py-1 text-sm text-[#f8fafc] outline-none"
                  >
                    <option value="normal">Grok normal</option>
                    <option value="fun">Grok fun</option>
                    <option value="spicy">Grok spicy</option>
                  </select>
                )}

                <span
                  className={`ml-auto px-2 py-1 rounded border font-mono transition-colors ${
                    estimateLoading
                      ? "border-[#06b6d4]/20 bg-[#06b6d4]/5 text-[#06b6d4]/70 animate-pulse"
                      : "border-[#06b6d4]/40 bg-[#06b6d4]/10 text-[#06b6d4]"
                  }`}
                  title={
                    serverEstimate != null
                      ? "Live server quote — matches the actual deduction"
                      : "Offline estimate (server quote pending)"
                  }
                >
                  Est. {estimatedCredits || 1} credits
                  {serverEstimate == null && !estimateLoading && (
                    <span className="ml-1 text-[10px] opacity-70">~</span>
                  )}
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
              className="w-full max-w-5xl bg-[#0f172a]/95 border border-[#1e293b] rounded-2xl overflow-hidden shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              
              {/* Header inside popup */}
              <div className="h-12 bg-[#0f172a]/85 border-b border-[#1e293b] px-4 flex items-center justify-between">
                <span className="text-xs font-bold text-[#f8fafc] flex items-center gap-1.5 uppercase font-mono">
                  {activeModal === "genre" && (
                    <>
                      <Drama size={14} className="text-[#a78bfa]" />
                      Mood Direction Studio
                    </>
                  )}
                  {activeModal === "style" && (
                    <>
                      <Palette size={14} className="text-[#06b6d4]" />
                      Grade & Lighting Studio
                    </>
                  )}
                  {activeModal === "camera" && "🎥 Professional Lens and Movement Matrix"}
                  {activeModal === "casting" && (
                    <>
                      <UserCheck size={14} className="text-[#a78bfa]" />
                      Studio Casting Room
                    </>
                  )}
                  {activeModal === "ai_director" && "💬 Smart AI Cinematic Director assistant"}
                  {activeModal === "voice" && (
                    <>
                      <AudioLines size={14} className="text-[#ec4899]" />
                      Voice Studio & Dubbing Matrix
                    </>
                  )}
                </span>
                <button 
                  onClick={() => setActiveModal(null)}
                  className="w-7 h-7 bg-[#1e293b] hover:bg-[#334155] rounded-md flex items-center justify-center text-[#e2e8f0] hover:text-white transition-colors outline-none"
                >
                  <X size={12} />
                </button>
              </div>

              {/* Modal Contents based on type */}
              <div className="p-6 max-h-[78vh] overflow-y-auto">
                
                {/* A. GENRE SELECT MODAL */}
                {activeModal === "genre" && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
                    <div className="md:col-span-5 bg-[#0f172a]/75 rounded-xl border border-[#1e293b]/70 overflow-hidden">
                      <div className="relative min-h-[250px] p-5 flex flex-col justify-between">
                        <div className="absolute inset-0 opacity-80" style={{ background: activeGenreObj.color }} />
                        <div className="absolute inset-0 bg-[#020617]/75" />
                        <motion.div
                          key={selectedGenre}
                          initial={{ scale: 0.82, opacity: 0.55 }}
                          animate={{ scale: [0.96, 1.08, 0.96], opacity: 0.9 }}
                          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                          className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
                          style={{ background: activeGenreObj.color }}
                        />
                        <div className="relative z-10 flex items-center justify-between">
                          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white shadow-lg shadow-black/30">
                            <Drama size={20} className="text-[#f8fafc]" />
                          </div>
                          <span className="rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#cbd5e1]">
                            Live Mood
                          </span>
                        </div>
                        <div className="relative z-10 mt-12">
                          <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#94a3b8]">Mood Direction</span>
                          <h3 className="mt-2 text-2xl font-black text-white">{activeGenreObj.arabicName}</h3>
                          <p className="mt-2 text-sm leading-relaxed text-[#cbd5e1]">{activeGenreObj.desc}</p>
                        </div>
                        <div className="relative z-10 mt-5 grid grid-cols-3 gap-2 text-center">
                          <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-2">
                            <span className="block text-[10px] uppercase text-[#94a3b8]">Tone</span>
                            <span className="text-xs font-bold text-white">{selectedGenre}</span>
                          </div>
                          <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-2">
                            <span className="block text-[10px] uppercase text-[#94a3b8]">Scene</span>
                            <span className="text-xs font-bold text-white">{activeSceneType.shortLabel}</span>
                          </div>
                          <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-2">
                            <span className="block text-[10px] uppercase text-[#94a3b8]">Grade</span>
                            <span className="text-xs font-bold text-white">{colorPalette}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[330px] overflow-y-auto pr-1">
                      {AVAILABLE_GENRES.map((g) => {
                        const isChosen = selectedGenre === g.id;
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => {
                              setSelectedGenre(g.id);
                              generateClientScene(prompt, dialogueText, cameraMovement, lensType, g.id);
                            }}
                            className={`group relative overflow-hidden min-h-[104px] text-left p-3 rounded-lg border transition-all outline-none ${
                              isChosen 
                                ? "bg-[#3730a3]/90 border-[#8b5cf6]/80 shadow-lg shadow-[#7c3aed]/15" 
                                : "bg-[#0f172a]/70 border-[#1e293b]/80 hover:bg-[#1e293b]/70 hover:border-[#7c3aed]/70 hover:-translate-y-0.5"
                            }`}
                          >
                            <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: g.color }} />
                            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-25 blur-2xl transition-opacity group-hover:opacity-50" style={{ background: g.color }} />
                            <div className="relative z-10 flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="h-7 w-7 rounded-lg border border-white/10 bg-white/5" style={{ background: g.color }} />
                                  <span className="text-sm font-black text-white block leading-tight">
                                    {g.arabicName}
                                  </span>
                                </div>
                                <span className="text-[13px] text-[#94a3b8] block leading-snug mt-2">
                                  {g.desc}
                                </span>
                              </div>
                              <span className={`mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                                isChosen ? "border-[#a78bfa] bg-[#a78bfa]/20 text-white" : "border-[#334155] bg-[#020617]/50 text-transparent group-hover:text-[#94a3b8]"
                              }`}>
                                <Check size={13} />
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* B. STYLE SETTINGS MODAL */}
                {activeModal === "style" && (
                  <>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                      <div className="lg:col-span-4 rounded-lg border border-[#1e293b]/80 bg-[#020617]/55 overflow-hidden min-h-[360px]">
                        <div
                          className="relative h-44 border-b border-[#1e293b]/80"
                          style={{
                            background: `${activePaletteObj.swatch}, ${activeLightingObj.swatch}`,
                          }}
                        >
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.26),transparent_28%),linear-gradient(135deg,rgba(2,6,23,0.1),rgba(2,6,23,0.75))]" />
                          <div className="absolute left-5 top-5 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/10 backdrop-blur-md shadow-lg shadow-black/30">
                            <Palette size={22} className="text-white" />
                          </div>
                          <div className="absolute bottom-5 left-5 right-5">
                            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/65">
                              Final Look Stack
                            </span>
                            <h3 className="mt-1 text-lg font-black text-white leading-tight">
                              {activePaletteObj.label}
                            </h3>
                          </div>
                        </div>

                        <div className="p-4 space-y-3">
                          {[
                            { label: "Palette", value: activePaletteObj.label, color: activePaletteObj.accent },
                            { label: "Lighting", value: activeLightingObj.label, color: activeLightingObj.accent },
                            { label: "Motion", value: activeMovesetObj.label, color: activeMovesetObj.accent },
                          ].map((item) => (
                            <div key={item.label} className="rounded-lg border border-[#1e293b]/70 bg-[#0f172a]/70 px-3 py-2">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#94a3b8]">
                                  {item.label}
                                </span>
                                <span
                                  className="h-2.5 w-2.5 rounded-full shadow-[0_0_14px_currentColor]"
                                  style={{ color: item.color, backgroundColor: item.color }}
                                />
                              </div>
                              <span className="mt-1 block text-xs font-bold text-[#f8fafc]">
                                {item.value}
                              </span>
                            </div>
                          ))}
                          <p className="text-xs leading-relaxed text-[#94a3b8]">
                            These presets are sent with the final prompt as one connected visual direction: color grade, lighting behavior, and camera movement character.
                          </p>
                        </div>
                      </div>

                      <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-3">
                        {[
                          {
                            title: "Palette LUTs",
                            items: COLOR_PALETTE_PRESETS,
                            activeValue: colorPalette,
                            onSelect: setColorPalette,
                          },
                          {
                            title: "Ambient Lights",
                            items: LIGHTING_PRESETS,
                            activeValue: lightingStyle,
                            onSelect: setLightingStyle,
                          },
                          {
                            title: "Camera Moveset",
                            items: CAMERA_MOVESET_PRESETS,
                            activeValue: cameraMovesetStyle,
                            onSelect: setCameraMovesetStyle,
                          },
                        ].map((section) => (
                          <div key={section.title} className="space-y-3">
                            <span className="text-[11px] font-bold text-[#e2e8f0] uppercase font-mono tracking-[0.12em] block border-b border-[#1e293b] pb-2">
                              {section.title}
                            </span>
                            <div className="flex flex-col gap-2">
                              {section.items.map((item) => {
                                const isSelected = section.activeValue === item.value;
                                return (
                                  <button
                                    key={item.value}
                                    type="button"
                                    onClick={() => {
                                      section.onSelect(item.value);
                                      generateClientScene(prompt, dialogueText, cameraMovement, lensType, selectedGenre);
                                    }}
                                    className={`group relative min-h-[86px] overflow-hidden rounded-lg border p-3 text-left outline-none transition-all ${
                                      isSelected
                                        ? "bg-[#0f172a] border-[#06b6d4]/80 shadow-lg shadow-[#06b6d4]/10"
                                        : "bg-[#0f172a]/60 border-[#1e293b]/80 hover:bg-[#1e293b]/70 hover:border-[#06b6d4]/50 hover:-translate-y-0.5"
                                    }`}
                                  >
                                    <div className="absolute inset-y-0 left-0 w-1" style={{ background: item.swatch }} />
                                    <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-45" style={{ background: item.accent }} />
                                    <div className="relative z-10 flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="h-7 w-7 shrink-0 rounded-lg border border-white/10" style={{ background: item.swatch }} />
                                          <span className="text-xs font-black text-white leading-tight">
                                            {item.label}
                                          </span>
                                        </div>
                                        <span className="mt-2 block text-[11px] leading-snug text-[#94a3b8]">
                                          {item.description}
                                        </span>
                                      </div>
                                      <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                                        isSelected ? "border-[#67e8f9] bg-[#06b6d4]/20 text-[#f8fafc]" : "border-[#334155] bg-[#020617]/50 text-transparent group-hover:text-[#94a3b8]"
                                      }`}>
                                        <Check size={12} />
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  <div className="hidden grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Column 1: COLOR PALETTE */}
                    <div className="space-y-3">
                      <span className="text-[13px] font-bold text-[#e2e8f0] uppercase font-mono block border-b border-[#1e293b] pb-1.5">Palette LUTs</span>
                      <div className="flex flex-col gap-2">
                        {["Auto", "Hollywood Teal-Orange", "Neo-Noir Shadow", "Warm Sun Vintage", "Cyberpunk Neon", "Desaturated Iron"].map((p) => (
                          <button
                            key={p}
                            onClick={() => {
                              setColorPalette(p);
                              generateClientScene(prompt, dialogueText, cameraMovement, lensType, selectedGenre);
                            }}
                            className={`w-full text-left p-2 rounded-lg text-xs font-bold transition-all outline-none ${
                              colorPalette === p
                                ? "bg-[#3730a3] text-[#a78bfa] border border-[#8b5cf6]/70"
                                : "bg-[#0f172a]/60 text-[#e2e8f0] border border-[#1e293b]/80 hover:bg-[#1e293b]/70"
                            }`}
                          >
                            {p === "Auto" ? "⚙️ Default (Auto-LUT)" : p}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Column 2: LIGHTING SYSTEM */}
                    <div className="space-y-3">
                      <span className="text-[13px] font-bold text-[#e2e8f0] uppercase font-mono block border-b border-[#1e293b] pb-1.5">Ambient Lights</span>
                      <div className="flex flex-col gap-2">
                        {["Auto", "Volumetric Foggy", "High-Contrast Chiaroscuro", "Golden Sunset", "Low-key Midnight"].map((l) => (
                          <button
                            key={l}
                            onClick={() => {
                              setLightingStyle(l);
                              generateClientScene(prompt, dialogueText, cameraMovement, lensType, selectedGenre);
                            }}
                            className={`w-full text-left p-2 rounded-lg text-xs font-bold transition-all outline-none ${
                              lightingStyle === l
                                ? "bg-[#3730a3] text-[#a78bfa] border border-[#8b5cf6]/70"
                                : "bg-[#0f172a]/60 text-[#e2e8f0] border border-[#1e293b]/80 hover:bg-[#1e293b]/70"
                            }`}
                          >
                            {l === "Auto" ? "⚙️ Default (Auto-Light)" : l}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Column 3: CAMERA MOVESET */}
                    <div className="space-y-3">
                      <span className="text-[13px] font-bold text-[#e2e8f0] uppercase font-mono block border-b border-[#1e293b] pb-1.5">Cam Moveset Speed</span>
                      <div className="flex flex-col gap-2">
                        {["Auto", "Steady Grounded", "Documentary Jitter", "Dreamy Flying", "Suspense Snapping"].map((c) => (
                          <button
                            key={c}
                            onClick={() => {
                              setCameraMovesetStyle(c);
                              generateClientScene(prompt, dialogueText, cameraMovement, lensType, selectedGenre);
                            }}
                            className={`w-full text-left p-2 rounded-lg text-xs font-bold transition-all outline-none ${
                              cameraMovesetStyle === c
                                ? "bg-[#3730a3] text-[#a78bfa] border border-[#8b5cf6]/70"
                                : "bg-[#0f172a]/60 text-[#e2e8f0] border border-[#1e293b]/80 hover:bg-[#1e293b]/70"
                            }`}
                          >
                            {c === "Auto" ? "⚙️ Default (Auto-Moveset)" : c}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                  </>
                )}

                {/* C. PROFESSIONAL LENS & MOVEMENT DIRECTIVE (EXHAUSTIVE & WITH PHOTO CARDS) */}
                {activeModal === "camera" && (
                  <div className="space-y-6">

                    {/* C0. CAMERA RIG MATRIX — 3-column vertical pickers */}
                    <div className="grid grid-cols-3 gap-3 bg-gradient-to-b from-[#0f172a]/70 to-[#020617]/70 rounded-2xl p-4 border border-[#1e293b]/60 shadow-inner shadow-black/40">
                      {/* CAMERA column */}
                      <div className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-[#020617]/40 border border-[#1e293b]/30">
                        <span className="text-[10px] font-mono text-[#94a3b8] uppercase tracking-[0.18em] font-bold">CAMERA</span>
                        <button
                          type="button"
                          onClick={() => {
                            const idx = CAMERA_BODIES.findIndex(c => c.name === cameraBody);
                            const next = (idx - 1 + CAMERA_BODIES.length) % CAMERA_BODIES.length;
                            const nextBody = CAMERA_BODIES[next].name;
                            setCameraBody(nextBody);
                            generateClientScene(prompt, dialogueText, cameraMovement, lensType, selectedGenre);
                          }}
                          className="w-7 h-7 rounded-full bg-[#1e293b]/40 hover:bg-[#8b5cf6]/30 border border-[#1e293b] hover:border-[#8b5cf6] text-[#94a3b8] hover:text-[#8b5cf6] flex items-center justify-center transition-all"
                          aria-label="Previous camera"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <div className="my-1 w-full h-[70px] rounded-xl bg-gradient-to-b from-[#0f172a]/70 to-[#020617]/90 border border-[#1e293b]/40 flex items-center justify-center">
                          <Camera size={32} className="text-[#8b5cf6] drop-shadow-[0_0_8px_rgba(255,179,71,0.45)]" />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const idx = CAMERA_BODIES.findIndex(c => c.name === cameraBody);
                            const next = (idx + 1) % CAMERA_BODIES.length;
                            const nextBody = CAMERA_BODIES[next].name;
                            setCameraBody(nextBody);
                            generateClientScene(prompt, dialogueText, cameraMovement, lensType, selectedGenre);
                          }}
                          className="w-7 h-7 rounded-full bg-[#1e293b]/40 hover:bg-[#8b5cf6]/30 border border-[#1e293b] hover:border-[#8b5cf6] text-[#94a3b8] hover:text-[#8b5cf6] flex items-center justify-center transition-all"
                          aria-label="Next camera"
                        >
                          <ChevronDown size={14} />
                        </button>
                        <span className="text-[12px] font-bold text-[#f8fafc] text-center truncate w-full" title={cameraBody}>
                          {cameraBody}
                        </span>
                      </div>

                      {/* FOCAL LENGTH column */}
                      <div className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-[#020617]/40 border border-[#1e293b]/30">
                        <span className="text-[10px] font-mono text-[#94a3b8] uppercase tracking-[0.18em] font-bold">FOCAL LENGTH</span>
                        <button
                          type="button"
                          onClick={() => {
                            const idx = FOCAL_LENGTHS.indexOf(focalLength);
                            const next = (idx - 1 + FOCAL_LENGTHS.length) % FOCAL_LENGTHS.length;
                            setFocalLength(FOCAL_LENGTHS[next]);
                            generateClientScene(prompt, dialogueText, cameraMovement, lensType, selectedGenre);
                          }}
                          className="w-7 h-7 rounded-full bg-[#1e293b]/40 hover:bg-[#8b5cf6]/30 border border-[#1e293b] hover:border-[#8b5cf6] text-[#94a3b8] hover:text-[#8b5cf6] flex items-center justify-center transition-all"
                          aria-label="Smaller focal length"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <div className="my-1 w-full h-[70px] rounded-xl bg-gradient-to-b from-[#0f172a]/70 to-[#020617]/90 border border-[#1e293b]/40 flex items-center justify-center">
                          <span className="text-[32px] font-extrabold text-[#8b5cf6] drop-shadow-[0_0_8px_rgba(255,179,71,0.5)] font-mono tabular-nums">
                            {focalLength}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const idx = FOCAL_LENGTHS.indexOf(focalLength);
                            const next = (idx + 1) % FOCAL_LENGTHS.length;
                            setFocalLength(FOCAL_LENGTHS[next]);
                            generateClientScene(prompt, dialogueText, cameraMovement, lensType, selectedGenre);
                          }}
                          className="w-7 h-7 rounded-full bg-[#1e293b]/40 hover:bg-[#8b5cf6]/30 border border-[#1e293b] hover:border-[#8b5cf6] text-[#94a3b8] hover:text-[#8b5cf6] flex items-center justify-center transition-all"
                          aria-label="Larger focal length"
                        >
                          <ChevronDown size={14} />
                        </button>
                        <span className="text-[12px] font-bold text-[#f8fafc]">mm</span>
                      </div>

                      {/* APERTURE column */}
                      <div className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-[#020617]/40 border border-[#1e293b]/30">
                        <span className="text-[10px] font-mono text-[#94a3b8] uppercase tracking-[0.18em] font-bold">APERTURE</span>
                        <button
                          type="button"
                          onClick={() => {
                            const idx = APERTURES.indexOf(aperture);
                            const next = (idx - 1 + APERTURES.length) % APERTURES.length;
                            setAperture(APERTURES[next]);
                            generateClientScene(prompt, dialogueText, cameraMovement, lensType, selectedGenre);
                          }}
                          className="w-7 h-7 rounded-full bg-[#1e293b]/40 hover:bg-[#8b5cf6]/30 border border-[#1e293b] hover:border-[#8b5cf6] text-[#94a3b8] hover:text-[#8b5cf6] flex items-center justify-center transition-all"
                          aria-label="Wider aperture"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <div className="my-1 w-full h-[70px] rounded-xl bg-gradient-to-b from-[#0f172a]/70 to-[#020617]/90 border border-[#1e293b]/40 flex items-center justify-center">
                          <Aperture size={36} className="text-[#8b5cf6] drop-shadow-[0_0_8px_rgba(255,179,71,0.5)] cine-aperture-spin" />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const idx = APERTURES.indexOf(aperture);
                            const next = (idx + 1) % APERTURES.length;
                            setAperture(APERTURES[next]);
                            generateClientScene(prompt, dialogueText, cameraMovement, lensType, selectedGenre);
                          }}
                          className="w-7 h-7 rounded-full bg-[#1e293b]/40 hover:bg-[#8b5cf6]/30 border border-[#1e293b] hover:border-[#8b5cf6] text-[#94a3b8] hover:text-[#8b5cf6] flex items-center justify-center transition-all"
                          aria-label="Narrower aperture"
                        >
                          <ChevronDown size={14} />
                        </button>
                        <span className="text-[12px] font-bold text-[#f8fafc]">{aperture}</span>
                      </div>
                    </div>

                    {/* C1. ALL LENSES SECTION — horizontal scroll, no background */}
                    <div>
                      <div className="flex items-center justify-between border-b border-[#1e293b] pb-2 mb-3">
                        <span className="text-[13px] font-bold text-[#8b5cf6] uppercase font-mono tracking-wider">
                          🔍 Available Cinematic Lenses
                        </span>
                        <span className="text-[10px] text-[#94a3b8] font-mono">{AVAILABLE_LENSES.length} lenses · scroll →</span>
                      </div>

                      <div className="flex gap-4 overflow-x-auto overflow-y-hidden pb-3 -mx-1 px-1 snap-x snap-mandatory scroll-smooth cine-scroll-row">
                        {AVAILABLE_LENSES.map((l) => {
                          const isActive = lensType === l.id;
                          return (
                            <button
                              key={l.id}
                              onClick={() => {
                                setLensType(l.id);
                                generateClientScene(prompt, dialogueText, cameraMovement, l.id, selectedGenre);
                              }}
                              className={`group relative flex-shrink-0 w-[130px] snap-start text-center transition-all duration-300 outline-none ${
                                isActive
                                  ? "scale-105"
                                  : "opacity-70 hover:opacity-100 hover:scale-105"
                              }`}
                            >
                              <div className={`relative w-full h-[110px] flex items-center justify-center transition-all duration-300 ${
                                isActive
                                  ? "drop-shadow-[0_0_18px_rgba(255,179,71,0.55)]"
                                  : "group-hover:drop-shadow-[0_0_14px_rgba(255,179,71,0.35)]"
                              }`}>
                                <img
                                  src={l.url}
                                  alt={l.name}
                                  className="max-w-full max-h-full object-contain select-none pointer-events-none"
                                />
                                <span className={`absolute top-0 left-0 text-[9px] font-mono px-1.5 py-0.5 rounded font-bold tracking-wide ${
                                  isActive
                                    ? "bg-[#8b5cf6] text-black"
                                    : "bg-black/70 text-[#8b5cf6] border border-[#8b5cf6]/30"
                                }`}>
                                  {l.tStop.split(" ")[0]}
                                </span>
                              </div>
                              <div className="mt-2 w-full px-1">
                                <span className={`text-[11px] font-bold block truncate leading-tight ${
                                  isActive ? "text-[#8b5cf6]" : "text-[#f8fafc]"
                                }`}>
                                  {l.arabicName.split("(")[0].trim()}
                                </span>
                                <span className="text-[9px] text-[#94a3b8] block truncate leading-tight mt-0.5 font-mono uppercase tracking-wider">
                                  {l.lensCategory}
                                </span>
                              </div>
                              {isActive && (
                                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-[#8b5cf6] rounded-full shadow-[0_0_10px_#8b5cf6]" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* C2. CAMERA MOVEMENTS — horizontal scroll, no background */}
                    <div>
                      <div className="flex items-center justify-between border-b border-[#1e293b] pb-2 mb-3">
                        <span className="text-[13px] font-bold text-[#06b6d4] uppercase font-mono tracking-wider">
                          🎥 Available Camera Movements
                        </span>
                        <span className="text-[10px] text-[#94a3b8] font-mono">{AVAILABLE_MOVEMENTS.length} moves · scroll →</span>
                      </div>

                      <div className="flex gap-4 overflow-x-auto overflow-y-hidden pb-3 -mx-1 px-1 snap-x snap-mandatory scroll-smooth cine-scroll-row">
                        {AVAILABLE_MOVEMENTS.map((mv) => {
                          const isActive = cameraMovement === mv.id;
                          return (
                            <button
                              key={mv.id}
                              onClick={() => {
                                setCameraMovement(mv.id);
                                generateClientScene(prompt, dialogueText, mv.id, lensType, selectedGenre);
                              }}
                              className={`group relative flex-shrink-0 w-[150px] snap-start text-center transition-all duration-300 outline-none ${
                                isActive
                                  ? "scale-105"
                                  : "opacity-70 hover:opacity-100 hover:scale-105"
                              }`}
                            >
                              <div className={`relative w-full h-[90px] rounded-xl overflow-hidden transition-all duration-300 ${
                                isActive
                                  ? "ring-2 ring-[#06b6d4] shadow-[0_0_18px_rgba(255,140,66,0.55)]"
                                  : "ring-1 ring-[#1e293b]/40 group-hover:ring-[#06b6d4]/60"
                              }`}>
                                <img
                                  src={mv.url}
                                  alt={mv.name}
                                  className={`w-full h-full object-cover select-none pointer-events-none transition-all duration-300 ${
                                    isActive ? "grayscale-0 brightness-100" : "grayscale brightness-90 group-hover:grayscale-0"
                                  }`}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                                {isActive && (
                                  <span className="absolute top-1.5 right-1.5 text-[8px] font-mono px-1.5 py-0.5 rounded bg-[#06b6d4] text-black font-bold tracking-wider">
                                    LIVE
                                  </span>
                                )}
                              </div>
                              <div className="mt-2 w-full px-1">
                                <span className={`text-[11px] font-bold block truncate leading-tight ${
                                  isActive ? "text-[#06b6d4]" : "text-[#f8fafc]"
                                }`}>
                                  {mv.arabicName}
                                </span>
                                <span className="text-[9px] text-[#94a3b8] block truncate leading-tight mt-0.5 font-mono uppercase tracking-wider">
                                  {mv.intensity.replace(/^Ideal for /i, "")}
                                </span>
                              </div>
                              {isActive && (
                                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-[#06b6d4] rounded-full shadow-[0_0_10px_#06b6d4]" />
                              )}
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
                        <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
                          <span className="text-[13px] font-bold text-[#e2e8f0] uppercase font-mono inline-flex items-center gap-2">
                            <UserCheck size={14} className="text-[#a78bfa]" />
                            Active Studio Cast Roster
                          </span>
                          <span className="rounded-full border border-[#334155] bg-[#020617]/60 px-2.5 py-1 text-[10px] font-mono font-bold text-[#94a3b8]">
                            {castingActors.length} Actors
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 max-h-[265px] overflow-y-auto pr-1">
                          {castingActors.map((actor) => {
                            const isSelected = selectedCharId === actor.id;
                            const isC = actor.id.includes("custom");
                            const actorVoicePreset = VOICE_PRESETS.find((voice) => voice.label === actor.voice || voice.voiceId === actor.voiceId);
                            const actorPersona = getVoicePersonaMeta(actorVoicePreset?.persona);
                            return (
                              <button
                                key={actor.id}
                                type="button"
                                onClick={() => {
                                  setSelectedCharId(actor.id);
                                  generateClientScene(prompt, dialogueText, cameraMovement, lensType, selectedGenre);
                                }}
                                className={`group relative overflow-hidden p-3 rounded-xl border flex flex-col items-center text-center justify-between transition-all duration-200 min-h-[138px] outline-none ${
                                  isSelected
                                    ? "border-[#8b5cf6] bg-[#8b5cf6]/10 shadow-lg shadow-[#8b5cf6]/10"
                                    : "border-[#1e293b] bg-[#0f172a]/80 hover:bg-[#1e293b]/70 hover:border-[#7c3aed] hover:-translate-y-0.5"
                                }`}
                              >
                                <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-[#8b5cf6]/20 blur-2xl opacity-0 transition-opacity group-hover:opacity-100" />
                                {isSelected && (
                                  <span className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#a78bfa]/60 bg-[#8b5cf6]/20 text-white">
                                    <Check size={13} />
                                  </span>
                                )}
                                <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border border-[#334155] shadow-lg shadow-black/30">
                                  <img src={actor.url} alt={actor.name} className="w-full h-full object-cover grayscale transition-all group-hover:grayscale-0" />
                                </div>
                                <div className="relative z-10 text-center w-full min-w-0 mt-2">
                                  <span className="text-[13px] font-black text-white block truncate leading-tight">{actor.name}</span>
                                  <span className="mt-2 inline-flex max-w-full items-center gap-1 rounded-full border border-[#ec4899]/30 bg-[#ec4899]/10 px-2 py-1 text-[11px] text-[#f9a8d4] font-bold" title={actor.voice}>
                                    <AudioLines size={11} className="shrink-0" />
                                    <span className="truncate">{actor.voice}</span>
                                  </span>
                                  <span className={`mt-1.5 mx-auto inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${actorPersona.badgeClass}`}>
                                    {actorPersona.label}
                                  </span>
                                  {isC && <span className="text-[10px] text-[#8b5cf6] block mt-1 uppercase font-mono tracking-[0.14em]">Creator Lab</span>}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Current Actor Sound Control Sheet */}
                        <div className="mt-4 p-3.5 bg-[#0f172a]/80 rounded-xl border border-[#1e293b]/80 space-y-3 text-left shadow-inner shadow-black/20">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#1e293b] pb-2">
                            <span className="text-[11px] text-[#8b5cf6] font-mono font-bold tracking-[0.18em] uppercase">Audio Mix & Voice Dub</span>
                            <span className="text-sm font-black text-[#f8fafc] inline-flex items-center gap-1.5 min-w-0">
                              <AudioLines size={14} className="text-[#ec4899]" />
                              <span className="truncate">Voice for {currentActor.name}</span>
                            </span>
                          </div>
                          
                          <div className="text-[13px] leading-relaxed text-[#e2e8f0] space-y-1 font-sans">
                            <div>
                              <span className="text-[#94a3b8] font-semibold">Current Selected Voice:</span>{" "}
                              <span className="text-[#8b5cf6] font-bold">{currentActor.voice}</span>
                            </div>
                            <p className="text-xs text-[#94a3b8] leading-tight">
                              Choose a real voice preset, or enter a custom delivery direction that is sent into the final render prompt:
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-[#1e293b]/60">
                            <div className="space-y-1 text-left">
                              <label className="text-xs text-[#94a3b8] block">Select Voice Preset</label>
                              <select 
                                value={currentActor.voice}
                                onChange={(e) => {
                                  assignPresetVoiceToActor(currentActor.id, e.target.value);
                                }}
                                className="bg-[#020617] border border-[#7c3aed] text-[13px] rounded-lg px-2.5 py-2 outline-none text-[#f8fafc] w-full font-sans text-left focus:border-[#a78bfa]"
                              >
                                {VOICE_PRESETS.map((voice) => (
                                  <option key={voice.voiceId} value={voice.label}>
                                    {voice.provider} - {voice.label} ({voice.lang})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-1 text-left">
                              <label className="text-xs text-[#94a3b8] block">Or Write Custom Voice Pattern</label>
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
                                  className="bg-[#0f172a] border border-[#7c3aed] px-2 py-1 rounded text-[13px] text-white focus:border-[#8b5cf6] outline-none w-full font-sans text-left"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const input = activeActorVoiceInputRef.current;
                                    if (!input) return;
                                    const val = input.value;
                                    if (val.trim()) {
                                      assignCustomVoiceToActor(currentActor.id, val);
                                      input.value = "";
                                    }
                                  }}
                                  className="px-3 bg-[#8b5cf6] hover:bg-[#a78bfa] text-white text-xs rounded-lg font-black cursor-pointer transition-colors"
                                >
                                  Apply
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Modern Actor procedural builder */}
                      <form onSubmit={buildCustomCharacterObj} className="md:col-span-12 lg:col-span-5 bg-[#0f172a]/80 p-3.5 rounded-xl border border-[#1e293b] space-y-3 text-left">
                        <span className="text-[13px] font-bold text-[#8b5cf6] uppercase font-mono block border-b border-[#1e293b] pb-1 flex items-center gap-1">
                          🧪 Creator Lab (Synthetic Character Builder)
                        </span>

                        <div className="space-y-1">
                          <label className="text-xs text-[#94a3b8] uppercase block">Actor Name or Code</label>
                          <input 
                            type="text"
                            required
                            value={custName}
                            onChange={(e) => setCustName(e.target.value)}
                            placeholder="e.g., Sean Kenani"
                            className="w-full bg-[#0f172a] border border-[#7c3aed] px-2 py-1.5 rounded text-xs text-white focus:border-[#8b5cf6] outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-xs text-[#94a3b8] block">Gender Roster</label>
                            <select 
                              value={custGender}
                              onChange={(e) => setCustGender(e.target.value)}
                              className="w-full bg-[#0f172a] border border-[#1e293b] text-[13px] rounded p-1 outline-none text-[#f8fafc]"
                            >
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                            </select>
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-xs text-[#94a3b8] block">Portrait Concept</label>
                            <select 
                              value={custPicUrl}
                              onChange={(e) => setCustPicUrl(e.target.value)}
                              className="w-full bg-[#0f172a] border border-[#1e293b] text-[13px] rounded p-1 outline-none text-[#f8fafc]"
                            >
                              <option value="classic">Dramatic & Anticipating</option>
                              <option value="wise_old">Wise with Silver Beard</option>
                              <option value="cyber_glow">Futuristic Cyber Glow</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-[#94a3b8] block">Appearance & Attire Details</label>
                          <input 
                            type="text"
                            value={custStyle}
                            onChange={(e) => setCustStyle(e.target.value)}
                            placeholder="e.g., wet black trench coat, intense steel gaze..."
                            className="w-full bg-[#0f172a] border border-[#7c3aed] px-2 py-1.5 rounded text-xs text-white focus:border-[#8b5cf6] outline-none"
                          />
                        </div>

                        {/* Voice Selection & Custom Addition */}
                        <div className="space-y-1.5 pt-2 border-t border-[#1e293b]/60 text-left">
                          <label className="text-xs text-[#8b5cf6] uppercase flex items-center gap-1 font-bold">
                            <AudioLines size={13} className="text-[#8b5cf6]" />
                            Sourced Voice Pattern (Voice Synthesis)
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
                            className="w-full bg-[#0f172a] border border-[#7c3aed] text-sm rounded p-2 outline-none text-[#f8fafc] font-sans"
                          >
                            {VOICE_PRESETS.map((voice) => (
                              <option key={voice.voiceId} value={voice.label}>
                                {voice.provider} - {voice.label} ({voice.lang})
                              </option>
                            ))}
                            <option value="custom">✍️ Describe Custom Voice / Add Custom Description...</option>
                          </select>

                          {custVoicePreset === "custom" && (
                            <div className="space-y-1 mt-1">
                              <label className="text-xs text-[#94a3b8] block">Write the exact customized voice detail:</label>
                              <input 
                                type="text"
                                required
                                value={custVoice}
                                onChange={(e) => setCustVoice(e.target.value)}
                                placeholder="e.g., deep raspy whispered voice with a subtle Irish accent..."
                                className="w-full bg-[#0f172a] border border-[#7c3aed] px-2 py-1.5 rounded text-xs text-white focus:border-[#8b5cf6] outline-none font-sans"
                              />
                            </div>
                          )}
                        </div>

                        {isGeneratingChar ? (
                          <div className="space-y-1.5 pt-1.5">
                            <div className="flex items-center justify-between text-[13px] font-mono text-[#8b5cf6]">
                              <span>AI synthesizing character profile... {charProgress}%</span>
                            </div>
                            <div className="h-0.5 bg-[#1e293b] rounded overflow-hidden">
                              <div className="h-full bg-[#8b5cf6]" style={{ width: `${charProgress}%` }} />
                            </div>
                          </div>
                        ) : (
                          <button
                            type="submit"
                            className="w-full py-2 bg-[#8b5cf6] hover:bg-[#a78bfa] text-black font-bold text-xs rounded transition-colors"
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
                    <p className="text-xs text-[#e2e8f0] leading-relaxed font-sans text-left">
                      <span className="inline-flex items-center gap-2">
                        <AudioLines size={14} className="text-[#ec4899]" />
                        Voice Engineering & Dubbing Studio - Customize the vocal signature for <span className="text-[#ec4899] font-bold">{currentActor.name}</span>:
                      </span>
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                      {/* Left: Current Actor Status & Profile */}
                      <div className="md:col-span-4 bg-[#0f172a] border border-[#1e293b] rounded-xl p-4 flex flex-col items-center justify-center text-center">
                        <div className="relative w-16 h-16 rounded-full overflow-hidden border border-[#7c3aed] mb-3">
                          <img src={currentActor.url} alt={currentActor.name} className="w-full h-full object-cover grayscale" />
                        </div>
                        <h4 className="text-xs font-bold text-[#f8fafc]">{currentActor.name}</h4>
                        <p className="text-[13px] text-[#94a3b8] mt-1">{currentActor.tagline}</p>
                        
                        <div className="mt-4 w-full bg-[#0f172a] border border-[#1e293b] rounded-lg p-3 text-left">
                          <span className="text-xs text-[#94a3b8] uppercase block font-sans">Active Voice Setting</span>
                          <div className="mt-2 flex items-center gap-3">
                            <img
                              src={selectedVoicePersona.imageUrl}
                              alt={selectedVoicePersona.label}
                              className="h-10 w-10 rounded-full object-cover border border-[#334155]"
                            />
                            <div className="min-w-0">
                              <span className="text-sm font-bold text-[#ec4899] block leading-tight truncate font-sans">
                                {currentActor.voice}
                              </span>
                              <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${selectedVoicePersona.badgeClass}`}>
                                {selectedVoicePersona.label} - {selectedVoicePersona.ageLabel}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Sound presets selection grid and additions builder */}
                      <div className="md:col-span-8 space-y-4 text-left">
                        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-3 space-y-2">
                          <span className="text-xs text-[#f8fafc] font-bold block">Voice prompt / spoken dialogue</span>
                          <textarea
                            value={dialogueText}
                            onChange={(e) => setDialogueText(e.target.value)}
                            rows={3}
                            placeholder="Write the dialogue you want this voice to speak..."
                            className="w-full resize-none bg-[#060c18] border border-[#1e293b] focus:border-[#ec4899] rounded-lg px-3 py-2 text-sm text-white outline-none placeholder:text-[#64748b]"
                          />
                        </div>
                        <div className="space-y-2">
                          <span className="text-[13px] text-[#f8fafc] font-bold block font-sans">Select a real voice preset: Google Arabic or ElevenLabs</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                            {VOICE_PRESETS.map((v) => {
                              const isSelected = currentActor.voice === v.label || currentActor.voiceId === v.voiceId;
                              const persona = getVoicePersonaMeta(v.persona);
                              return (
                                <button
                                  type="button"
                                  key={v.voiceId}
                                  onClick={() => {
                                    assignPresetVoiceToActor(currentActor.id, v.label);
                                  }}
                                  className={`p-2.5 rounded-lg border text-left transition-all duration-150 flex flex-col justify-between cursor-pointer ${
                                    isSelected
                                      ? "border-[#ec4899] bg-[#ec4899]/8"
                                      : "border-[#1e293b] bg-[#0f172a]/80 hover:bg-[#1e293b]/70 hover:border-[#7c3aed]"
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
                                    <img
                                      src={persona.imageUrl}
                                      alt={`${persona.label} ${v.label}`}
                                      className="h-12 w-12 shrink-0 rounded-full object-cover border border-[#334155]"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-start justify-between gap-2">
                                        <span className="text-[13px] font-bold text-white block truncate">{v.label}</span>
                                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${persona.badgeClass}`}>
                                          {persona.label}
                                        </span>
                                      </div>
                                      <span className="text-[11px] text-[#cbd5e1] block mt-1">{persona.ageLabel} - {v.provider} - {v.lang}</span>
                                      <span className="text-xs text-[#94a3b8] block leading-tight mt-1">{v.desc}</span>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                          <button
                            type="button"
                            onClick={() => previewVoice(selectedVoiceId, selectedVoiceModel)}
                            disabled={isPreviewingVoice || !dialogueText.trim()}
                            className="mt-2 px-3 py-2 rounded-lg bg-[#ec4899] hover:bg-[#f9a8d4] disabled:bg-[#1e293b] disabled:text-[#94a3b8] text-white text-sm font-bold transition-colors"
                          >
                            {isPreviewingVoice ? "Previewing..." : "Preview Voice"}
                          </button>
                        </div>

                        {/* Custom voice descriptor input logic */}
                        <div className="bg-[#1e293b] border border-[#1e293b] rounded-xl p-3 space-y-2">
                          <span className="text-xs text-[#8b5cf6] uppercase flex items-center gap-1 font-bold">
                            ➕ Custom Voice Integration
                          </span>
                          <p className="text-xs text-[#94a3b8] leading-relaxed font-sans">
                            Describe the delivery, accent, age, or dialect. This direction is sent into the final video prompt.
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
                              className="bg-[#0f172a] border border-[#7c3aed] px-3 py-2 rounded-lg text-xs text-white focus:border-[#ec4899] outline-none w-full font-sans text-left placeholder:text-[#64748b]"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const input = modalCustomVoiceInputRef.current;
                                if (!input) return;
                                const val = input.value;
                                if (val.trim()) {
                                  assignCustomVoiceToActor(currentActor.id, val);
                                  input.value = "";
                                }
                              }}
                              className="px-4 bg-[#ec4899] hover:bg-[#f9a8d4] text-white text-[13px] font-bold rounded-lg cursor-pointer transition-colors whitespace-nowrap"
                            >
                              Apply Direction
                            </button>
                          </div>
                        </div>

                        <div className="bg-[#1e293b] border border-[#1e293b] rounded-xl p-3 space-y-2">
                          <span className="text-xs text-[#06b6d4] uppercase flex items-center gap-1 font-bold">
                            Voice Cloning
                          </span>
                          <p className="text-xs text-[#94a3b8] leading-relaxed font-sans">
                            Upload an audio sample. The cloned voice preview is saved and sent as reference audio with the final render when the selected video model supports reference audio.
                          </p>
                          <label className={`inline-flex items-center justify-center px-4 py-2 rounded-lg text-[13px] font-bold transition-colors ${
                            isCloningVoice
                              ? "bg-[#1e293b] text-[#94a3b8]"
                              : "bg-[#06b6d4] hover:bg-[#67e8f9] text-black cursor-pointer"
                          }`}>
                            {isCloningVoice ? "Cloning..." : "Upload Voice Sample"}
                            <input
                              type="file"
                              accept="audio/*"
                              className="hidden"
                              disabled={isCloningVoice}
                              onChange={(e) => {
                                const file = e.currentTarget.files?.[0];
                                e.currentTarget.value = "";
                                if (file) void cloneVoiceFromFile(file);
                              }}
                            />
                          </label>
                          {(((currentActor as any)?.voiceSampleUrl || clonedVoiceAudioUrl)) && (
                            <audio controls src={(currentActor as any)?.voiceSampleUrl || clonedVoiceAudioUrl || undefined} className="w-full h-9" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                )}

                {/* E. AI CINEMATIC DIRECTOR ASSISTANT CHAT SIMULATOR */}
                {activeModal === "ai_director" && (
                  <div className="space-y-4 text-left">
                    <p className="text-xs text-[#e2e8f0] leading-relaxed font-sans">
                      💬 Your smart directorial advisor provides continuous constructive evaluations to optimize rendering quality and camera kinetics based on elite cinematography standards:
                    </p>

                    <div className="bg-[#0f172a]/80 border border-[#1e293b] rounded-xl p-4 text-xs space-y-3 font-sans">
                      <div className="flex items-start gap-2 text-[#f8fafc]">
                        <span className="bg-[#8b5cf6] text-black text-xs font-black px-1.5 py-0.2 rounded font-mono">ADVISOR</span>
                        <div>
                          <p className="font-extrabold text-white text-sm mb-1">Macro Lens & Drama Focus Recommendation</p>
                          <p className="text-[#e2e8f0] leading-relaxed text-sm">
                            You have chosen <span className="text-[#8b5cf6] font-bold">{lensType}</span>. We recommend adjusting the dialog text to include silent beats or pregnant pauses to enhance character isolation by 20%.
                          </p>
                        </div>
                      </div>

                      <div className="h-[1px] bg-[#1e293b]/80" />

                      <div className="flex items-start gap-2 text-[#e2e8f0]">
                        <span className="bg-[#06b6d4] text-black text-xs font-black px-1.5 py-0.2 rounded font-mono">DOP_NOTE</span>
                        <div>
                          <p className="font-extrabold text-white text-sm mb-1">Calculated Hydraulic Dolly Zoom Application</p>
                          <p className="text-[#e2e8f0] leading-relaxed text-sm">
                            When simulating the Vertigo effect, increase volumetric scattering and darken color grading to highlight the psychological shock of the actor <span className="text-[#06b6d4] font-bold">{currentActor.name}</span>.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input 
                        type="text"
                        placeholder="Ask another directorial or technical question..."
                        className="flex-1 bg-[#0f172a] border border-[#1e293b] px-3 py-2 rounded text-xs text-white focus:border-[#8b5cf6] outline-none font-sans text-left"
                      />
                      <button 
                        onClick={() => setActiveModal(null)}
                        className="bg-[#1e293b] hover:bg-[#334155] text-[#f8fafc] font-bold text-xs px-4 py-2 rounded transition-colors"
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
