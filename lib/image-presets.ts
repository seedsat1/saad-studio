// ============================================================
// FILE: lib/image-presets.ts
// DESCRIPTION: Curated style presets for the Image Studio.
//   Each preset carries a polished prompt + recommended model,
//   aspect ratio, and a thumbnail accent gradient.
// ============================================================

export interface ImagePreset {
  id: string;
  title: string;
  category: string;
  /** Lucide icon name */
  iconName: string;
  /** Tailwind gradient string used as fallback when no real thumbnail is generated */
  accent: string;
  /** Suggested image model id (matches IMAGE_MODELS in lib/image-models.ts) */
  model?: string;
  /** Suggested aspect ratio (must be one the chosen model supports) */
  aspect?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "21:9";
  /** Optional quality preset (1K / 2K / 4K) — Nano Banana Pro & Imagen 4 support 4K */
  quality?: "1K" | "2K" | "4K";
  /** Final prompt sent to the model */
  prompt: string;
  /** Filename inside public/preset/ — used as the card thumbnail. */
  imageFile?: string;
}

export const IMAGE_PRESETS: ImagePreset[] = [
  {
    id: "cinematic-portrait",
    title: "Cinematic Portrait",
    category: "Photography",
    iconName: "Camera",
    accent: "from-amber-700 via-orange-600 to-red-800",
    model: "nano-banana-pro",
    aspect: "3:4",
    quality: "4K",
    imageFile: "Cinematic portrait.webp",
    prompt:
      "Cinematic portrait of a person, 35mm anamorphic lens, shallow depth of field, hard side-lighting with deep shadows, neutral expression, film grain, color graded teal-and-orange.",
  },
  {
    id: "studio-product",
    title: "Studio Product Shot",
    category: "Commercial",
    iconName: "Package",
    accent: "from-slate-200 via-slate-300 to-slate-400",
    model: "google/imagen4-ultra",
    aspect: "1:1",
    quality: "4K",
    imageFile: "2 Studio Product Shot.webp",
    prompt:
      "Hero product photograph on a seamless white cyclorama background. Soft top-light with a gentle key on the left, soft fill on the right. Crisp focus, no reflections, no shadows under the product. Magazine-ad quality.",
  },
  {
    id: "anime-ghibli",
    title: "Anime · Ghibli",
    category: "Animation",
    iconName: "Trees",
    accent: "from-emerald-500 via-green-600 to-teal-700",
    model: "nano-banana-pro",
    aspect: "16:9",
    quality: "2K",
    imageFile: "3 Anime · Ghibli.webp",
    prompt:
      "Hand-painted watercolor anime in the style of Studio Ghibli. Soft pastel palette, fluffy clouds, cel-shaded characters, painterly backgrounds. Warm afternoon light.",
  },
  {
    id: "3d-render",
    title: "Octane 3D Render",
    category: "3D",
    iconName: "Box",
    accent: "from-cyan-400 via-blue-500 to-violet-600",
    model: "google/imagen4-ultra",
    aspect: "16:9",
    quality: "4K",
    imageFile: "4 Octane 3D Render.webp",
    prompt:
      "Ultra-detailed Octane 3D render, raytraced reflections, subsurface scattering, soft global illumination, glossy materials, sharp edges, studio HDRI lighting. Cinema 4D quality.",
  },
  {
    id: "pixel-art",
    title: "16-bit Pixel Art",
    category: "Illustration",
    iconName: "Gamepad2",
    accent: "from-emerald-400 via-cyan-500 to-blue-600",
    model: "nano-banana-2",
    aspect: "1:1",
    quality: "1K",
    imageFile: "5bit Pixel Art.webp",
    prompt:
      "Authentic 16-bit pixel art in SNES JRPG style. Limited 24-color palette, no anti-aliasing, sharp pixels, isometric perspective. Vibrant retro game aesthetic.",
  },
  {
    id: "watercolor",
    title: "Watercolor Painting",
    category: "Illustration",
    iconName: "Paintbrush",
    accent: "from-pink-300 via-rose-400 to-fuchsia-500",
    model: "google/imagen4",
    aspect: "4:3",
    imageFile: "6 Watercolor Painting.webp",
    prompt:
      "Loose watercolor painting on cold-press cotton paper. Visible brush strokes, paint bleeds, soft pastel washes, white paper showing through. Dreamy and painterly.",
  },
  {
    id: "pencil-sketch",
    title: "Pencil Sketch",
    category: "Illustration",
    iconName: "Pencil",
    accent: "from-slate-400 via-zinc-500 to-stone-600",
    model: "google/imagen4-fast",
    aspect: "3:4",
    imageFile: "7 Pencil Sketch.webp",
    prompt:
      "Detailed graphite pencil sketch on textured white paper. Cross-hatching, soft shading, sharp outlines. Realistic proportions and natural pencil strokes.",
  },
  {
    id: "comic-book",
    title: "Comic Book",
    category: "Illustration",
    iconName: "BookOpen",
    accent: "from-red-500 via-orange-500 to-yellow-400",
    model: "nano-banana-pro",
    aspect: "3:4",
    quality: "2K",
    imageFile: "8 Comic Book.webp",
    prompt:
      "Bold American comic book illustration, ink-line outlines, halftone dot shading, dynamic action pose, dramatic angles, primary-color palette with deep shadows. Marvel-style.",
  },
  {
    id: "neon-cyberpunk",
    title: "Neon Cyberpunk",
    category: "Style",
    iconName: "Building2",
    accent: "from-fuchsia-600 via-pink-500 to-cyan-500",
    model: "nano-banana-pro",
    aspect: "16:9",
    quality: "4K",
    imageFile: "9 Neon Cyberpunk.webp",
    prompt:
      "Neon-soaked cyberpunk cityscape at 3 AM. Holographic billboards, kanji signage reflecting on wet asphalt, atmospheric haze, deep cyan and magenta lighting, sharp cinematic composition.",
  },
  {
    id: "vintage-polaroid",
    title: "Vintage Polaroid",
    category: "Photography",
    iconName: "Image",
    accent: "from-amber-400 via-orange-300 to-yellow-200",
    model: "google/imagen4",
    aspect: "1:1",
    imageFile: "10 Vintage Polaroid.webp",
    prompt:
      "Authentic 1970s Polaroid SX-70 photograph. Slight chemical fade, soft focus, milky highlights, faded color cast, white instant-film border. Nostalgic and grainy.",
  },
  {
    id: "architecture",
    title: "Architectural Render",
    category: "Architecture",
    iconName: "Building",
    accent: "from-blue-300 via-sky-400 to-cyan-500",
    model: "google/imagen4-ultra",
    aspect: "16:9",
    quality: "4K",
    imageFile: "11 Architectural Render.webp",
    prompt:
      "Photorealistic architectural visualization. Modern minimalist building, glass and concrete, dusk golden-hour sky, manicured landscape, perfect symmetry. Vray render quality.",
  },
  {
    id: "food-photography",
    title: "Food Photography",
    category: "Commercial",
    iconName: "Utensils",
    accent: "from-amber-500 via-orange-500 to-red-500",
    model: "nano-banana-pro",
    aspect: "1:1",
    quality: "4K",
    imageFile: "12 Food Photography.webp",
    prompt:
      "Top-down macro food photograph on a rustic wooden table. Soft window light from the left, steam rising, fresh ingredients scattered. Magazine-quality, mouth-watering, shallow depth of field.",
  },
  {
    id: "fashion-editorial",
    title: "Fashion Editorial",
    category: "Photography",
    iconName: "Sparkles",
    accent: "from-rose-400 via-pink-500 to-purple-600",
    model: "google/imagen4-ultra",
    aspect: "3:4",
    quality: "4K",
    imageFile: "13 Fashion Editorial.webp",
    prompt:
      "Vogue-style fashion editorial photograph. Confident model in avant-garde couture, dramatic studio lighting with hard rim-light, bold color backdrop. Magazine cover composition.",
  },
  {
    id: "fantasy-illustration",
    title: "Fantasy Illustration",
    category: "Illustration",
    iconName: "Castle",
    accent: "from-violet-600 via-purple-700 to-indigo-900",
    model: "nano-banana-pro",
    aspect: "3:4",
    quality: "2K",
    imageFile: "14 Fantasy Illustration.webp",
    prompt:
      "Epic fantasy book-cover illustration. Heroic figure on a mountain ridge, dramatic sky with godrays, ancient ruins below, intricate armor detail, painterly brushwork. D&D / Lord of the Rings aesthetic.",
  },
  {
    id: "origami",
    title: "Origami World",
    category: "Style",
    iconName: "PencilRuler",
    accent: "from-pink-200 via-rose-300 to-violet-300",
    model: "google/imagen4",
    aspect: "1:1",
    imageFile: "15 Origami World.webp",
    prompt:
      "Every object made of folded paper origami. Visible fold creases, slight paper texture, soft pastel paper colors, soft studio lighting on a clean paper backdrop. Whimsical and crafted.",
  },
  {
    id: "macro-nature",
    title: "Macro Nature",
    category: "Photography",
    iconName: "Trees",
    accent: "from-emerald-400 via-green-500 to-teal-600",
    model: "google/imagen4-ultra",
    aspect: "1:1",
    quality: "4K",
    imageFile: "16 Macro Nature.webp",
    prompt:
      "Extreme macro photograph in nature. Sharp focus on a dewdrop on a leaf, soft natural backlight, bokeh background, fine texture detail. National Geographic quality.",
  },
  {
    id: "noir",
    title: "Film Noir B&W",
    category: "Style",
    iconName: "Drama",
    accent: "from-slate-700 via-zinc-800 to-black",
    model: "nano-banana-pro",
    aspect: "16:9",
    quality: "2K",
    imageFile: "17 Film Noir B&W.webp",
    prompt:
      "Classic 1940s film noir black-and-white photograph. High contrast, hard side-lighting, venetian-blind shadows, smoky atmosphere, dramatic composition. 35mm grain.",
  },
  {
    id: "isometric-diorama",
    title: "Isometric Diorama",
    category: "3D",
    iconName: "Box",
    accent: "from-orange-300 via-amber-400 to-yellow-500",
    model: "google/imagen4",
    aspect: "1:1",
    imageFile: "18 Isometric Diorama.webp",
    prompt:
      "Tiny isometric 3D diorama on a circular floating island. Cute stylized buildings, soft pastel colors, miniature trees, low-poly aesthetic, soft studio lighting. Mobile-game cover art quality.",
  },
  {
    id: "iraq-3d-reference",
    title: "3D Reference View Creator",
    category: "3D",
    iconName: "Box",
    accent: "from-blue-600 via-indigo-600 to-violet-700",
    model: "flux-2/pro-text-to-image",
    aspect: "1:1",
    quality: "4K",
    imageFile: "/explore/iraq/cultural_center.png",
    prompt: "3d reference view of a modern iraqi monument, white curves, studio background"
  },
  {
    id: "iraq-motion-showcase",
    title: "Motion Product Showcase",
    category: "Photography",
    iconName: "Camera",
    accent: "from-zinc-700 via-zinc-800 to-black",
    model: "flux-2/pro-text-to-image",
    aspect: "16:9",
    quality: "4K",
    imageFile: "/explore/iraq/metro.png",
    prompt: "motion product showcase of a futuristic iraqi high-tech metro train, sleek cinematic movement"
  },
  {
    id: "iraq-cinematic-film",
    title: "Cinematic Scenario Product Film",
    category: "Photography",
    iconName: "Camera",
    accent: "from-amber-600 via-red-700 to-stone-900",
    model: "flux-2/pro-text-to-image",
    aspect: "16:9",
    quality: "4K",
    imageFile: "/explore/iraq/skyline.png",
    prompt: "cinematic scenario product film of baghdad modern skyscrapers, golden hour reflections, sweeping camera"
  },
  {
    id: "iraq-cyberpunk-style",
    title: "Mesopotamian Cyberpunk Style",
    category: "Style",
    iconName: "Building2",
    accent: "from-fuchsia-700 via-pink-600 to-purple-800",
    model: "flux-2/pro-text-to-image",
    aspect: "16:9",
    quality: "4K",
    imageFile: "/explore/iraq/babylon.png",
    prompt: "cyberpunk reborn babylon, neon gates and ziggurats, rainy night"
  },
  {
    id: "iraq-tilt-shift",
    title: "Tilt-Shift Miniature Effect",
    category: "Photography",
    iconName: "Camera",
    accent: "from-emerald-600 via-teal-700 to-cyan-800",
    model: "flux-2/pro-text-to-image",
    aspect: "4:3",
    quality: "2K",
    imageFile: "/explore/iraq/riverwalk.png",
    prompt: "tilt-shift miniature effect of the tigris riverwalk park in baghdad, tiny people and cars, toy-like depth of field"
  },
  {
    id: "iraq-eco-city",
    title: "Eco-City Architecture Render",
    category: "Architecture",
    iconName: "Building",
    accent: "from-green-600 via-emerald-700 to-teal-800",
    model: "flux-2/pro-text-to-image",
    aspect: "16:9",
    quality: "4K",
    imageFile: "/explore/iraq/eco_city.png",
    prompt: "architectural render of a floating eco-city in the iraqi marshes, solar powered design"
  },
  {
    id: "iraq-skyline",
    title: "Futuristic Baghdad Skyline",
    category: "Architecture",
    iconName: "Building",
    accent: "from-blue-900 via-indigo-950 to-[#02050e]",
    model: "flux-2/pro-text-to-image",
    aspect: "16:9",
    quality: "4K",
    imageFile: "/explore/iraq/skyline.png",
    prompt: "A hyper-realistic futuristic Baghdad skyline at night along the Tigris River, showcasing modern organic architecture inspired by Zaha Hadid, glowing skyscrapers with neon blue and amber lights, futuristic suspension bridges."
  },
  {
    id: "iraq-museum",
    title: "Mesopotamian Future Museum",
    category: "Architecture",
    iconName: "Building2",
    accent: "from-amber-900 via-yellow-950 to-[#02050e]",
    model: "flux-2/pro-text-to-image",
    aspect: "16:9",
    quality: "4K",
    imageFile: "/explore/iraq/museum.png",
    prompt: "A hyper-modern futuristic museum in Baghdad blending ancient Mesopotamian Babylonian brickwork and ziggurat patterns with towering glass facades, holographic projections, hanging gardens."
  },
  {
    id: "iraq-metro",
    title: "Baghdad Metro Station",
    category: "Photography",
    iconName: "Camera",
    accent: "from-slate-600 via-stone-700 to-[#02050e]",
    model: "flux-2/pro-text-to-image",
    aspect: "16:9",
    quality: "4K",
    imageFile: "/explore/iraq/metro.png",
    prompt: "Interior of a sleek, futuristic metro station in Baghdad, modern design with arches inspired by traditional Islamic architecture, gold and white colors, glass ceilings showing skyscrapers."
  },
  {
    id: "iraq-babylon",
    title: "Futuristic Babylon City",
    category: "Style",
    iconName: "Sparkles",
    accent: "from-purple-900 via-pink-900 to-[#02050e]",
    model: "flux-2/pro-text-to-image",
    aspect: "16:9",
    quality: "4K",
    imageFile: "/explore/iraq/babylon.png",
    prompt: "A futuristic metropolis built around the ruins of Babylon, giant holographic Ishtar Gate shining blue and purple at night, neon ziggurats, elevated transit hyperloops, cyberpunk style."
  },
  {
    id: "iraq-cultural-center",
    title: "Zaha Hadid Baghdad Cultural Center",
    category: "Architecture",
    iconName: "Building",
    accent: "from-cyan-900 via-sky-950 to-[#02050e]",
    model: "flux-2/pro-text-to-image",
    aspect: "16:9",
    quality: "4K",
    imageFile: "/explore/iraq/cultural_center.png",
    prompt: "A spectacular modern cultural center in Baghdad, designed in the style of Zaha Hadid, featuring sweeping white concrete curves, large glass panels, reflecting pools, landscaped gardens."
  },
  {
    id: "iraq-riverwalk",
    title: "Modern Tigris Riverwalk",
    category: "Photography",
    iconName: "Camera",
    accent: "from-orange-900 via-red-950 to-[#02050e]",
    model: "flux-2/pro-text-to-image",
    aspect: "16:9",
    quality: "4K",
    imageFile: "/explore/iraq/riverwalk.png",
    prompt: "A modern riverwalk park along the Tigris River in Baghdad, high-rise skyscrapers in the background, sleek streetlights, palm trees reflecting the sunset, beautiful reflection on the water."
  },
  {
    id: "iraq-marshes",
    title: "Mesopotamian Eco-City Marshes",
    category: "Nature",
    iconName: "Trees",
    accent: "from-green-900 via-emerald-950 to-[#02050e]",
    model: "flux-2/pro-text-to-image",
    aspect: "16:9",
    quality: "4K",
    imageFile: "/explore/iraq/eco_city.png",
    prompt: "A futuristic Mesopotamian eco-city built in the marshes of southern Iraq, with solar-powered floating houses of high-tech design, green vegetation, clean canals with electric boats."
  },
  {
    id: "iraq-space-center",
    title: "Iraq Space Center & Observatory",
    category: "Sci-Fi",
    iconName: "Box",
    accent: "from-violet-900 via-purple-950 to-[#02050e]",
    model: "flux-2/pro-text-to-image",
    aspect: "16:9",
    quality: "4K",
    imageFile: "/explore/iraq/space_center.png",
    prompt: "A futuristic space center and observatory in the desert of Iraq, modern high-tech white domes and parabolic telescope dishes, space launch pad in the background under a night sky full of stars."
  }
];

/** Returns the public URL for a preset's thumbnail, properly URL-encoded. */
export function presetImageUrl(p: ImagePreset): string | null {
  if (!p.imageFile) return null;
  if (p.imageFile.startsWith("/")) return p.imageFile;
  return `/preset/${encodeURIComponent(p.imageFile)}`;
}

/** Build a search-engine-friendly URL for /image that auto-applies a preset. */
export function buildImagePresetUrl(p: ImagePreset): string {
  const params = new URLSearchParams();
  params.set("prompt", p.prompt);
  if (p.model) params.set("model", p.model);
  if (p.aspect) params.set("aspect", p.aspect);
  if (p.quality) params.set("quality", p.quality);
  params.set("preset", p.id);
  return `/image?${params.toString()}`;
}
