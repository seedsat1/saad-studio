export interface MoodboardPreset {
  id: string;
  name: string;
  gradient: string;
  description: string;
  tags: string[];
  creditCost: number;
}

export const presets: MoodboardPreset[] = [
  {
    id: "warm-ambient",
    name: "Warm Ambient",
    gradient: "from-amber-800/60 to-orange-950/80",
    description: "Soft golden tones with warm, inviting light that evokes intimacy and nostalgia.",
    tags: ["fashion", "warm", "editorial"],
    creditCost: 5,
  },
  {
    id: "y2k-studio",
    name: "Y2K Studio",
    gradient: "from-pink-600/60 to-blue-800/80",
    description: "Early 2000s energy with chrome textures, glossy surfaces, and bold digital aesthetics.",
    tags: ["retro", "digital", "y2k"],
    creditCost: 5,
  },
  {
    id: "swag-era",
    name: "Swag Era",
    gradient: "from-rose-700/60 to-amber-900/80",
    description: "Late 2000s hip-hop influenced aesthetics with bold colors and urban swagger.",
    tags: ["urban", "hip-hop", "editorial"],
    creditCost: 5,
  },
  {
    id: "theatrical-light",
    name: "Theatrical Light",
    gradient: "from-slate-800/60 to-zinc-950/80",
    description: "Dramatic chiaroscuro lighting inspired by stage and cinema, deep shadows with crisp highlights.",
    tags: ["cinematic", "dark", "editorial"],
    creditCost: 5,
  },
  {
    id: "y2k-street",
    name: "Y2K Street",
    gradient: "from-cyan-700/60 to-blue-950/80",
    description: "Futuristic streetwear aesthetic combining Y2K tech vibes with urban culture.",
    tags: ["street", "y2k", "urban"],
    creditCost: 5,
  },
  {
    id: "flash-editorial",
    name: "Flash Editorial",
    gradient: "from-pink-500/60 to-fuchsia-900/80",
    description: "High-contrast direct flash photography with bold shadows and raw editorial energy.",
    tags: ["editorial", "fashion", "flash"],
    creditCost: 5,
  },
  {
    id: "old-smartphone",
    name: "Old Smartphone",
    gradient: "from-yellow-800/60 to-amber-950/80",
    description: "Nostalgic lo-fi quality of early smartphone cameras with grain, vignette, and warm tones.",
    tags: ["nostalgia", "lo-fi", "warm"],
    creditCost: 5,
  },
  {
    id: "street-photo",
    name: "Street Photography",
    gradient: "from-slate-700/60 to-gray-950/80",
    description: "Documentary-style street photography with natural light, candid moments, and urban texture.",
    tags: ["street", "documentary", "urban"],
    creditCost: 5,
  },
  {
    id: "mystique-city",
    name: "Mystique City",
    gradient: "from-indigo-700/60 to-purple-950/80",
    description: "Mysterious nocturnal cityscape with deep purples, atmospheric haze, and ethereal glow.",
    tags: ["night", "cinematic", "mystery"],
    creditCost: 5,
  },
  {
    id: "editorial-street",
    name: "Editorial Street",
    gradient: "from-emerald-700/60 to-teal-950/80",
    description: "Fashion editorial meets street culture with rich jewel tones and sophisticated composition.",
    tags: ["fashion", "street", "editorial"],
    creditCost: 5,
  },
  {
    id: "subtle-flash",
    name: "Subtle Flash",
    gradient: "from-zinc-600/60 to-slate-900/80",
    description: "Refined use of fill flash that adds dimension without losing natural ambiance.",
    tags: ["editorial", "fashion", "subtle"],
    creditCost: 5,
  },
  {
    id: "frutiger-aero",
    name: "Frutiger Aero",
    gradient: "from-sky-500/60 to-cyan-900/80",
    description: "Early 2010s design aesthetic with glassy UI, nature motifs, and optimistic blue tones.",
    tags: ["retro", "digital", "aesthetic"],
    creditCost: 5,
  },
  {
    id: "nature-light",
    name: "Nature Light",
    gradient: "from-green-700/60 to-emerald-950/80",
    description: "Lush, verdant natural lighting with soft dappled sun and organic green-gold tones.",
    tags: ["nature", "warm", "organic"],
    creditCost: 5,
  },
  {
    id: "siren",
    name: "Siren",
    gradient: "from-red-700/60 to-rose-950/80",
    description: "Alluring and dramatic deep reds with a seductive, high-fashion cinematic quality.",
    tags: ["fashion", "dark", "cinematic"],
    creditCost: 5,
  },
  {
    id: "digital-camera",
    name: "Digital Camera",
    gradient: "from-blue-600/60 to-indigo-950/80",
    description: "2000s-era consumer digital camera aesthetic with oversharpened details and cool tones.",
    tags: ["retro", "digital", "lo-fi"],
    creditCost: 5,
  },
  {
    id: "coquette",
    name: "Coquette",
    gradient: "from-pink-400/60 to-rose-800/80",
    description: "Feminine and delicate with soft pinks, ribbons, and dreamy pastel romanticism.",
    tags: ["aesthetic", "fashion", "romantic"],
    creditCost: 5,
  },
  {
    id: "noir-film",
    name: "Noir Film",
    gradient: "from-gray-800/60 to-zinc-950/80",
    description: "Classic Hollywood noir with stark black-and-white contrasts and moody expressionist shadows.",
    tags: ["cinematic", "dark", "vintage"],
    creditCost: 5,
  },
  {
    id: "golden-hour",
    name: "Golden Hour",
    gradient: "from-amber-600/60 to-orange-900/80",
    description: "Magic hour warmth with elongated shadows, radiant backlight, and rich amber hues.",
    tags: ["warm", "outdoor", "golden"],
    creditCost: 5,
  },
  {
    id: "neon-tokyo",
    name: "Neon Tokyo",
    gradient: "from-violet-600/60 to-fuchsia-950/80",
    description: "Cyberpunk-influenced neon lights reflecting on wet streets with vibrant nocturnal color.",
    tags: ["night", "neon", "urban"],
    creditCost: 5,
  },
  {
    id: "vintage-analog",
    name: "Vintage Analog",
    gradient: "from-yellow-700/60 to-amber-950/80",
    description: "Film photography nostalgia with faded highlights, warm shadows, and authentic grain.",
    tags: ["vintage", "film", "analog"],
    creditCost: 5,
  },
];

export function getPresetById(id: string): MoodboardPreset | undefined {
  return presets.find((p) => p.id === id);
}

export function getPresetsByTag(tag: string): MoodboardPreset[] {
  return presets.filter((p) => p.tags.includes(tag));
}
