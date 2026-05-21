// ============================================================
// FILE: lib/veo-presets.ts
// DESCRIPTION: The canonical list of cinematic Veo presets used by
//   /cinematic-video. Both the page and the admin "seed previews"
//   endpoint import from here.
// ============================================================

export type PresetQuality = "draft" | "standard" | "ultra" | "max";

export interface VeoPreset {
  id: string;
  title: string;
  category: string;
  /** Suggested quality preset (controls tier + resolution) */
  quality?: PresetQuality;
  /** Tailwind gradient string used as a fallback when no poster is generated */
  accent: string;
  /** Lucide icon name (resolved client-side) */
  iconName: string;
  /** Cinematic Veo prompt */
  prompt: string;
}

export const VEO_PRESETS: VeoPreset[] = [
  {
    id: "neo-noir",
    title: "Neo-Noir Detective",
    category: "Style",
    iconName: "Drama",
    accent: "from-slate-700 via-zinc-900 to-black",
    quality: "ultra",
    prompt:
      'A trench-coated detective leans against a rain-slick brick wall in a narrow alley. Neon signage in Chinese stutters across a puddle. He lights a cigarette, exhales, and murmurs to himself, "She lied about everything." Slow dolly-in on his face, hard side-light, deep shadows, 35mm anamorphic, rain ambience and distant saxophone.',
  },
  {
    id: "studio-ghibli",
    title: "Studio Ghibli Garden",
    category: "Animation",
    iconName: "Trees",
    accent: "from-emerald-500 via-green-600 to-teal-700",
    quality: "standard",
    prompt:
      "Hand-painted watercolor anime in the style of Studio Ghibli. A young girl in a sundress runs barefoot through a wildflower meadow under a vast cumulus sky. Wind ripples the grass, butterflies scatter, a soft piano melody plays. Camera tracks alongside her at low angle.",
  },
  {
    id: "cyberpunk-tokyo",
    title: "Cyberpunk Tokyo",
    category: "Style",
    iconName: "Building2",
    accent: "from-fuchsia-600 via-pink-500 to-cyan-500",
    quality: "ultra",
    prompt:
      "A wide shot of a 3 AM Tokyo intersection in heavy rain. Neon kanji signage and holographic ads reflect on wet asphalt. A masked figure on a glowing motorcycle weaves between robotaxis. Slow push-in. Synthwave bassline pulses under distant traffic.",
  },
  {
    id: "wes-anderson",
    title: "Wes Anderson Symmetry",
    category: "Style",
    iconName: "Castle",
    accent: "from-rose-300 via-amber-200 to-pink-300",
    quality: "standard",
    prompt:
      'Wes Anderson aesthetic. A pastel-pink hotel hallway, perfectly symmetrical, framed by ornate sconces. A bellboy in burgundy uniform marches toward camera carrying a stack of suitcases. Whip-pan reveal as he turns a corner. He deadpans to camera, "Room 217. As requested." Centered composition, 1.85:1.',
  },
  {
    id: "vhs-80s",
    title: "80s VHS Music Video",
    category: "Era",
    iconName: "Music2",
    accent: "from-violet-600 via-pink-600 to-orange-500",
    quality: "draft",
    prompt:
      "Authentic 1986 VHS music video aesthetic. A synthwave singer in a red leather jacket performs against a chrome-grid backdrop. Heavy magnetic tape distortion, scanlines, chromatic aberration, neon lens flares. Quick MTV-era cuts, smoke machine haze, retro drum machine punching.",
  },
  {
    id: "k-drama",
    title: "Korean Drama Snowfall",
    category: "Emotion",
    iconName: "Snowflake",
    accent: "from-sky-300 via-slate-200 to-rose-200",
    quality: "ultra",
    prompt:
      'A young woman stands under falling snow outside a Seoul café, breath visible. A man approaches with an umbrella, opens it over her, and says softly, "You\'re going to catch a cold." She looks up, eyes shimmering. Soft natural light, shallow depth of field, gentle piano under muted city ambience.',
  },
  {
    id: "action-chase",
    title: "Rooftop Action Chase",
    category: "Action",
    iconName: "Flame",
    accent: "from-orange-500 via-red-600 to-zinc-900",
    quality: "ultra",
    prompt:
      "A masked agent sprints across Hong Kong tenement rooftops at dusk. Handheld camera follows from behind, then whip-pans as she vaults a gap between buildings. Laundry lines whip past, helicopter blades thunder overhead, gunshots crack in the distance. Golden hour backlight, fast cuts, sharp focus.",
  },
  {
    id: "stop-motion",
    title: "Stop-Motion Claymation",
    category: "Animation",
    iconName: "Cat",
    accent: "from-orange-300 via-amber-400 to-yellow-500",
    quality: "standard",
    prompt:
      "Stop-motion claymation in the style of Aardman Studios. A chubby clay rabbit waddles through a tiny clay kitchen, opens a cupboard, and a tiny avalanche of clay carrots falls on his head. He sighs with comedic timing. Visible thumbprints, soft tungsten lighting, 24fps stutter.",
  },
  {
    id: "pixel-adventure",
    title: "16-bit Pixel Adventure",
    category: "Animation",
    iconName: "Gamepad2",
    accent: "from-emerald-400 via-cyan-500 to-blue-600",
    quality: "draft",
    prompt:
      "Authentic 16-bit pixel art adventure in SNES style. A pixel hero in a green tunic walks across a tile-based forest, swings a sword at a slime enemy, and a coin sparkle pops up. Chiptune soundtrack with cheerful melody, retro pixel aesthetic, no anti-aliasing.",
  },
  {
    id: "origami",
    title: "Origami World",
    category: "Animation",
    iconName: "PencilRuler",
    accent: "from-pink-200 via-rose-300 to-violet-300",
    quality: "standard",
    prompt:
      "Every object in the world is made of folded paper origami. A paper crane flies over a paper village; paper villagers wave, a paper river ripples. Visible fold creases, slight paper texture, soft studio lighting on a paper sky backdrop. Wonder and whimsy.",
  },
  {
    id: "anime-school",
    title: "Anime School Romance",
    category: "Animation",
    iconName: "Heart",
    accent: "from-rose-400 via-pink-400 to-fuchsia-500",
    quality: "ultra",
    prompt:
      'Anime cel-shaded style. A high-school girl with twin braids stands on a rooftop fence at sunset, hair blowing in the wind. A boy approaches behind her and says, "I waited for you." She turns slowly, cherry blossom petals drifting past. Soft j-pop melody, golden backlight, lens flare.',
  },
  {
    id: "documentary",
    title: "Documentary B-Roll",
    category: "Realism",
    iconName: "Sun",
    accent: "from-amber-500 via-orange-500 to-yellow-600",
    prompt:
      "Observational documentary style. An elderly fisherman repairs his nets on a wooden Mediterranean dock at dawn. Handheld but stable, natural light only, no music. The boat creaks against the dock; seagulls call. Wrinkled hands work with practiced rhythm. 16mm film grain.",
  },
  {
    id: "stage-music",
    title: "Stage Performance",
    category: "Performance",
    iconName: "Music2",
    accent: "from-violet-500 via-purple-600 to-indigo-700",
    quality: "ultra",
    prompt:
      "A live concert from the front row. A vocalist grips the mic stand under a single spotlight, sweat catching the light, crowd silhouettes pulsing below. Slow push-in as the chorus drops — strobe lights, lasers cut through fog, audience hands rise. Sub-bass thumps. 24fps cinema look.",
  },
  {
    id: "cooking-macro",
    title: "Cooking Show Macro",
    category: "Lifestyle",
    iconName: "Utensils",
    accent: "from-amber-400 via-orange-500 to-red-500",
    quality: "ultra",
    prompt:
      "Extreme macro shot of a chef searing a steak in a black cast-iron pan. Audible sizzle, butter spits, garlic browns. Camera pulls back slightly in slow-motion to reveal a basting spoon arcing hot butter over the meat. Soft window light from the side. Food porn aesthetic.",
  },
  {
    id: "spacewalk",
    title: "Sci-Fi Spacewalk",
    category: "Sci-Fi",
    iconName: "Rocket",
    accent: "from-indigo-700 via-blue-900 to-black",
    quality: "max",
    prompt:
      "An astronaut tethered to a damaged space station drifts in zero-g above Earth's curve. The visor reflects the Milky Way and the blue rim of the planet. Slow, quiet breathing through the helmet mic, distant beeping. Camera orbits slowly, no music, just silence and breath.",
  },
  {
    id: "surreal-dream",
    title: "Surreal Dream",
    category: "Art",
    iconName: "CloudMoon",
    accent: "from-purple-500 via-fuchsia-500 to-cyan-400",
    quality: "standard",
    prompt:
      "Surrealist dream sequence. A figure in a long red coat walks across a checkered floor that stretches into pink clouds. Doors of different sizes float through the air. The figure opens one and a flock of golden butterflies bursts out. Dreamlike pacing, ambient drone.",
  },
];

/** Imagen 4 prompt — shorter, single-frame version optimized for posters */
export function buildPosterPrompt(p: VeoPreset): string {
  const shortenedPrompt = p.prompt.split(".").slice(0, 2).join(".");
  return `Cinematic film still in 16:9. ${shortenedPrompt}. Movie poster framing, dramatic lighting, photographic quality. No text or watermarks.`;
}
