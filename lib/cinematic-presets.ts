export type LocalEffectId =
  | "layer-mixed-media"
  | "sketch"
  | "canvas"
  | "flash-comic"
  | "overexposed"
  | "paper"
  | "noir"
  | "particles"
  | "hand-paint";

export type PresetId =
  | LocalEffectId
  | "cinematic-trailer"
  | "k-drama-soft"
  | "vhs-memories"
  | "cyberpunk-neon"
  | "paparazzi-flash"
  | "anime-pulse"
  | "polaroid-snap"
  | "y2k-camcorder"
  | "golden-hour"
  | "synthwave-drive"
  | "watercolor-dream"
  | "studio-portrait"
  | "manga-lines"
  | "hip-hop-visual"
  | "pixel-arcade"
  | "comic-action"
  | "storm-light"
  | "cafe-window"
  | "toxic-glow"
  | "motion-tracker"
  | "black-light"
  | "liquid-chrome"
  | "duotone-bold"
  | "shattered-frame"
  | "paper-fold"
  | "glow-drift"
  | "old-hollywood"
  | "soap-bubbles"
  | "glossy-page"
  | "frost-bite"
  | "mirror-shards"
  | "magma-heat"
  | "marble-bust"
  | "deep-tide"
  | "editorial-modern"
  | "graffiti-spray";

export type Preset = {
  id: PresetId;
  effect: LocalEffectId;
  name: string;
  family: string;
  description: string;
  accent: string;
  prompt: string;
};

export const PRESETS: Preset[] = [
  {
    id: "layer-mixed-media",
    effect: "layer-mixed-media",
    name: "Urban Cutout",
    family: "Scene Layers",
    description: "Three-tone subject separation with gritty grain, hard edges, and poster contrast.",
    accent: "#06b6d4",
    prompt: "Use the uploaded image as exact identity reference. Preserve original face, hairstyle, skin tone, body proportions, and clothing silhouette. Transform into a stylized mixed-media cinematic scene with the subject walking through an urban alley filled with layered graffiti, poster textures, ripped paper edges, halftone dot patterns, and graphic collage elements. Three-tone color separation using cyan, red, and white over a dark gritty environment. Subject remains focal with sharp paper-cutout edges and clean foreground/background separation. Slow smooth tracking camera with floating paper particles. Inspired by experimental street-fashion campaigns and graphic novel motion posters. 16:9, cinematic mixed-media, ultra detailed.",
  },
  {
    id: "sketch",
    effect: "sketch",
    name: "Pencil Pulse",
    family: "Draft Look",
    description: "Edge extraction with clean paper brightness and subtle pencil-shadow motion.",
    accent: "#ef4444",
    prompt: "Preserve subject identity from uploaded image exactly — original face, hair, body, clothing. Transform into an animated pencil-sketch aesthetic where the subject is rendered as clean graphite line art on bright white paper. Visible sketch contours, subtle shadow hatching, charcoal smudge accents, faint construction lines. Background stays pure paper white. Camera holds steady as if a drawing comes to life. Inspired by editorial fashion illustration and Pixar concept art reels. 16:9, hand-drawn animation feel, ultra detailed pencil texture.",
  },
  {
    id: "canvas",
    effect: "canvas",
    name: "Studio Brush",
    family: "Paint Pass",
    description: "Soft color blocks with animated marker strokes over the source frame.",
    accent: "#38bdf8",
    prompt: "Preserve subject identity from uploaded image — face, body, clothing. Transform into a painterly motion piece rendered with thick visible brushstrokes, soft color blocks, palette knife edges, and oil paint texture. Background dissolves into broad gestural color washes. Refined cinematic palette of muted earth tones with one bold accent. Slow camera drift as if walking through a Vermeer painting in motion. Inspired by Loving Vincent and animated oil-painted films. 16:9, studio brush motion, ultra detailed brush texture.",
  },
  {
    id: "flash-comic",
    effect: "flash-comic",
    name: "Impact Ink",
    family: "Pop Action",
    description: "Posterized saturation, inked shadows, and high-energy color punches.",
    accent: "#f97316",
    prompt: "Preserve subject identity. Transform into a high-impact pop-action comic panel — subject in dynamic pose with bold inked shadows, posterized saturated colors, KAPOW-style halftone dots, action lines radiating outward, and exaggerated motion blur. Background uses flat poster color fields in cyan/red/yellow primary palette. Camera punches in with shake on action beats. Inspired by Roy Lichtenstein, Spider-Verse, and vintage Marvel covers. 16:9, comic panel motion, ultra detailed ink texture.",
  },
  {
    id: "overexposed",
    effect: "overexposed",
    name: "Hot Light",
    family: "Exposure FX",
    description: "Lifted whites with compressed shadows and a clean washed broadcast feel.",
    accent: "#f8fafc",
    prompt: "Preserve subject identity from uploaded image. Transform into a bright cinematic broadcast aesthetic with lifted whites, blown highlights, compressed shadows, and clean fashion-photography lighting. Background becomes a soft minimal beige or pure white space. Subject glows with hot key light, gentle lens flare, and clean reflection rim. Slow elegant camera drift. Inspired by Apple commercials and premium broadcast TV intros. 16:9, hot light cinematic, ultra clean.",
  },
  {
    id: "paper",
    effect: "paper",
    name: "Archive Grain",
    family: "Tactile Film",
    description: "Warm toning, softened contrast, and fine ink texture over the moving image.",
    accent: "#facc15",
    prompt: "Preserve subject identity. Transform into a warm vintage 16mm film aesthetic — softened contrast, warm sepia tone, fine grain overlay, gentle gate weave, and tactile paper texture across the whole frame. Subject moves naturally as if filmed in a 1960s documentary. Atmospheric dust motes drift past warm sunlight. Inspired by Wes Anderson archival reels and PBS documentary intros. 16:9, archive grain, ultra detailed film texture.",
  },
  {
    id: "noir",
    effect: "noir",
    name: "Shadow Reel",
    family: "Mono Drama",
    description: "High-contrast monochrome with crushed blacks and heavy film grain.",
    accent: "#94a3b8",
    prompt: "Preserve subject identity from uploaded image. Transform into a dramatic monochrome noir scene — pure black and white only, crushed deep blacks, blinding whites, heavy 35mm film grain, venetian blind shadows raking across the subject, cigarette smoke haze. Subject walks through a 1940s detective alley. Slow low-angle tracking. Inspired by Sin City, The Third Man, and German Expressionist cinema. 16:9, noir motion, ultra detailed grain.",
  },
  {
    id: "particles",
    effect: "particles",
    name: "Signal Trails",
    family: "Motion Marks",
    description: "Darkened source plate with light traces and tracked energy marks.",
    accent: "#22d3ee",
    prompt: "Preserve subject identity. Transform into a futuristic dark editorial scene where elegant light traces and energy streaks follow the subject's motion, leaving glowing signal trails behind their movement. Dark cinematic plate, subtle motion-tracked light marks, holographic data fragments floating around the subject. Cyan and electric blue accents. Slow tracking camera. Inspired by Tron Legacy and Apple Vision Pro promo reels. 16:9, signal trails, ultra detailed motion graphics.",
  },
  {
    id: "hand-paint",
    effect: "hand-paint",
    name: "Pastel Motion",
    family: "Soft Frames",
    description: "Reduced color bands, gentle edges, and pastel brush texture.",
    accent: "#fb7185",
    prompt: "Preserve subject identity. Transform into a soft pastel illustration in motion — reduced color bands, gentle hand-painted edges, marker bleeds, watercolor washes, and dreamy chalk highlights. Subject appears as if drawn in a children's storybook with calm flowing animation. Warm pastel rose-peach-lavender palette. Slow drift camera. Inspired by Studio Ghibli backgrounds and Le Petit Prince animation. 16:9, pastel motion, ultra detailed brush texture.",
  },
  {
    id: "cinematic-trailer",
    effect: "layer-mixed-media",
    name: "Cinematic Trailer",
    family: "Cinema",
    description: "Hollywood blockbuster grade with teal-orange contrast and anamorphic lens feel.",
    accent: "#fb923c",
    prompt: "Preserve subject identity from uploaded image. Transform into an epic Hollywood blockbuster trailer aesthetic — subject walks toward camera in slow motion through an atmospheric scene with anamorphic lens flares, dramatic teal-orange color grading, volumetric god rays, smoke haze, and high-key rim lighting. Subject becomes the hero. Slow dolly-in with subtle ground shake on key beats. Inspired by Christopher Nolan films and Marvel teaser cuts. 16:9, cinematic trailer, ultra detailed atmosphere.",
  },
  {
    id: "k-drama-soft",
    effect: "hand-paint",
    name: "K-Drama",
    family: "Cinema",
    description: "Korean drama softness with dreamy bokeh, pastel rose tints, and gentle motion.",
    accent: "#f9a8d4",
    prompt: "Preserve subject identity from uploaded image — face, hair, skin tones. Transform into a Korean drama romantic scene with soft warm sunlight filtering through cherry blossom petals, dreamy bokeh, pastel rose color grading, gentle slow motion, emotional close-up energy. Background blurs into creamy pastel haze. Subject's hair gently lifts in breeze. Slow front tracking. Inspired by Crash Landing on You and Goblin K-drama cinematography. 16:9, k-drama softness, ultra detailed bokeh.",
  },
  {
    id: "vhs-memories",
    effect: "paper",
    name: "VHS Memories",
    family: "Retro",
    description: "1980s VHS tape feel with chromatic edges and warm tape wear.",
    accent: "#a78bfa",
    prompt: "Preserve subject identity. Transform into 1980s VHS analog tape aesthetic — chromatic aberration on edges, tracking line glitches, warm faded color shift, soft compression artifacts, scan lines, and slight tape wear. Subject appears as if filmed on a home camcorder in 1986 wearing 80s clothing. Slight handheld feel. Inspired by Stranger Things title sequence and Madonna 80s MTV videos. 16:9, vintage VHS texture, ultra detailed analog feel.",
  },
  {
    id: "cyberpunk-neon",
    effect: "particles",
    name: "Cyberpunk Neon",
    family: "Future",
    description: "Blade Runner palette with magenta-cyan neon reflections and rain-soaked highlights.",
    accent: "#d946ef",
    prompt: "Preserve subject identity. Transform into a Blade Runner cyberpunk scene — subject stands in a rain-soaked neon-lit Tokyo street at night, magenta and cyan neon signs reflecting on wet pavement, atmospheric steam rising, holographic billboards floating in background, moody high contrast lighting. Black coat, futuristic styling cues. Slow low-angle tracking camera. Inspired by Blade Runner 2049 and Cyberpunk Edgerunners. 16:9, cyberpunk neon, ultra detailed atmosphere.",
  },
  {
    id: "paparazzi-flash",
    effect: "overexposed",
    name: "Paparazzi Flash",
    family: "Celebrity",
    description: "Sudden strobe pops with high-key whites and tabloid candid feel.",
    accent: "#fef3c7",
    prompt: "Preserve subject identity. Transform into a celebrity paparazzi-flash scene — subject walks out of a club or red carpet with sudden harsh strobe flashes lighting the face, blown highlights, candid tabloid moment, glamorous chaos around them. Black background with sparkle bokeh from camera flashes. Slight handheld feel with quick pulse flashes. Inspired by 2000s Britney era and red-carpet event coverage. 16:9, paparazzi flash, ultra detailed strobe atmosphere.",
  },
  {
    id: "anime-pulse",
    effect: "flash-comic",
    name: "Anime Pulse",
    family: "Anime",
    description: "Japanese anime cel shading with bold outlines and emotional motion lines.",
    accent: "#ec4899",
    prompt: "Preserve subject identity from uploaded image — keep the original face recognizable but render in anime cel-shaded style. Bold ink outlines, dramatic large eyes, emotional speed lines radiating outward, vibrant saturated palette, cell-painted shadows. Subject in dynamic action moment with flowing hair. Background simplified to anime-style soft gradient. Inspired by Demon Slayer, Jujutsu Kaisen, and Studio Ghibli. 16:9, anime motion, ultra detailed cel shading.",
  },
  {
    id: "polaroid-snap",
    effect: "paper",
    name: "Polaroid Snap",
    family: "Retro",
    description: "Faded Polaroid warmth with soft borders and instant-film nostalgia.",
    accent: "#fde68a",
    prompt: "Preserve subject identity. Transform into a 1970s Polaroid instant-photograph aesthetic — faded warm yellows and oranges, slight color shift toward magenta, sun-faded charm, soft white border feeling, vintage nostalgia texture. Subject in a sunny outdoor scene. Slow gentle motion as if a memory. Inspired by vintage family albums and 70s film stock. 16:9, polaroid snap, ultra detailed film texture.",
  },
  {
    id: "y2k-camcorder",
    effect: "paper",
    name: "Y2K Camcorder",
    family: "Retro",
    description: "Year 2000 mini-DV feel with soft compression and low-fi pixel charm.",
    accent: "#67e8f9",
    prompt: "Preserve subject identity. Transform into Year 2000 mini-DV camcorder aesthetic — soft compression artifacts, mini-DV color cast, low-fi nostalgic Y2K vibe, slight pixelation, faint frame line, timestamp overlay in corner. Subject in early-2000s clothing. Handheld home-movie feel. Inspired by early 2000s pop music videos and Disney Channel intros. 16:9, Y2K camcorder, ultra detailed analog feel.",
  },
  {
    id: "golden-hour",
    effect: "overexposed",
    name: "Golden Hour",
    family: "Mood",
    description: "Warm sun-kissed amber tones with long shadows and magic-hour glow.",
    accent: "#fbbf24",
    prompt: "Preserve subject identity. Transform into a warm golden-hour cinematic scene — sun-kissed amber tones, long soft shadows stretching across the ground, magic-hour glow, lens flare halos, dreamy summer afternoon atmosphere, dust particles glittering in golden light. Subject walks toward warm sun. Slow tracking camera from behind. Inspired by Terrence Malick films and luxury fashion campaigns. 16:9, golden hour, ultra detailed warm light.",
  },
  {
    id: "synthwave-drive",
    effect: "particles",
    name: "Synthwave Drive",
    family: "Future",
    description: "80s retro-future palette with palm silhouettes and pink neon sunset grid.",
    accent: "#f472b6",
    prompt: "Preserve subject identity. Transform into an 80s retro synthwave aesthetic — palm tree silhouettes, magenta-pink sunset gradient sky, 80s neon grid horizon, chrome reflections, vintage sports car, outrun retro-futurism, VHS scan lines. Subject in 80s leather jacket and sunglasses. Slow side tracking. Inspired by Kung Fury and Stranger Things title cards. 16:9, synthwave drive, ultra detailed neon glow.",
  },
  {
    id: "watercolor-dream",
    effect: "hand-paint",
    name: "Watercolor Dream",
    family: "Art",
    description: "Soft watercolor bleed with paper texture and gentle pigment flow.",
    accent: "#7dd3fc",
    prompt: "Preserve subject identity. Transform into a soft watercolor painting in motion — gentle pigment bleeds, cold-press paper texture visible behind subject, dreamy washes of pastel color, artisan illustration quality, flowing brushwork. Subject moves slowly through a watercolor landscape. Inspired by Disney Tarzan painted backgrounds and Studio Ghibli watercolor reels. 16:9, watercolor dream, ultra detailed paint texture.",
  },
  {
    id: "studio-portrait",
    effect: "overexposed",
    name: "Studio Portrait",
    family: "Fashion",
    description: "Professional studio lighting with diffused softboxes and magazine clarity.",
    accent: "#e2e8f0",
    prompt: "Preserve subject identity. Transform into a professional photo studio portrait — diffused softbox lighting, clean seamless gray backdrop, magazine cover quality, refined skin tones, editorial polish. Subject turns slowly toward camera with confident gaze. Slight depth of field, perfect retouching. Inspired by Annie Leibovitz and Mario Testino fashion editorials. 16:9, studio portrait, ultra detailed skin texture.",
  },
  {
    id: "manga-lines",
    effect: "sketch",
    name: "Manga Lines",
    family: "Anime",
    description: "Black-and-white manga panel with screen tone halftone and dramatic ink.",
    accent: "#cbd5e1",
    prompt: "Preserve subject identity but render in Japanese manga panel style — pure black and white ink linework, screen tone halftone shading, dramatic perspective lines, action panel framing, hatched shadows, mangaka pen strokes. Subject in dynamic action pose. Inspired by Tokyo Ghoul, Death Note, and Berserk manga panels. 16:9, manga lines, ultra detailed ink texture.",
  },
  {
    id: "hip-hop-visual",
    effect: "flash-comic",
    name: "Hip-Hop Visual",
    family: "Music",
    description: "Music-video swagger with bold saturation, gold tones, and slow-mo grit.",
    accent: "#fbbf24",
    prompt: "Preserve subject identity. Transform into a hip-hop music video aesthetic — bold saturated colors, gold tones, urban grit, slow motion swagger, street style cinematic moment, neon signage in distance, sweat shine on face, gold chains catching light. Subject in city alley. Slow dolly-in close-up. Inspired by Hype Williams videos and Drake music videos. 16:9, hip-hop visual, ultra detailed gold accent.",
  },
  {
    id: "pixel-arcade",
    effect: "canvas",
    name: "Pixel Arcade",
    family: "Game",
    description: "16-bit pixel art look with limited palette and retro arcade vibes.",
    accent: "#a3e635",
    prompt: "Preserve subject identity but render in 16-bit pixel art animation — retro arcade game aesthetic, limited 8-color palette, blocky pixelation, sprite-style movement, nostalgic gaming feel. Background like a side-scrolling level. Pixel-precise edges. Inspired by Street Fighter II, Streets of Rage, and Sega Genesis era games. 16:9, pixel arcade, ultra detailed pixel texture.",
  },
  {
    id: "comic-action",
    effect: "flash-comic",
    name: "Comic Action",
    family: "Pop Action",
    description: "Comic-book panel motion with halftone dots and dynamic bold outlines.",
    accent: "#f43f5e",
    prompt: "Preserve subject identity. Transform into a Western comic book panel aesthetic — halftone Ben Day dots, bold ink outlines, dynamic superhero action pose, vibrant primary palette, KAPOW visual energy, motion lines, exaggerated foreshortening. Subject in cape-flowing hero stance. Inspired by Spider-Verse, classic Marvel covers, and Sin City framing. 16:9, comic action, ultra detailed halftone texture.",
  },
  {
    id: "storm-light",
    effect: "noir",
    name: "Storm Light",
    family: "Mood",
    description: "Dramatic stormy weather with overcast tension and silver-blue tones.",
    accent: "#64748b",
    prompt: "Preserve subject identity. Transform into a dramatic stormy weather cinematic scene — overcast moody atmosphere, silver-blue cold tones, lightning hints flashing in distance, brooding tension, atmospheric depth, wind moving subject's clothing and hair. Subject stands on cliff or open plain. Slow wide low angle. Inspired by Wuthering Heights film and Zack Snyder cinematography. 16:9, storm light, ultra detailed atmosphere.",
  },
  {
    id: "cafe-window",
    effect: "hand-paint",
    name: "Café Window",
    family: "Lifestyle",
    description: "Cozy café interior with warm tungsten glow and soft rain-on-glass mood.",
    accent: "#fb923c",
    prompt: "Preserve subject identity. Transform into a cozy café-window scene — warm tungsten interior light, soft rain droplets sliding on glass, steam rising from coffee cup, calm lifestyle moment, intimate atmosphere, blurred raindrops creating bokeh on window. Subject seated by window. Static medium shot with subtle natural motion. Inspired by Norwegian hygge aesthetic and indie film cafés. 16:9, café window, ultra detailed warm light.",
  },
  {
    id: "toxic-glow",
    effect: "flash-comic",
    name: "Toxic Glow",
    family: "Future",
    description: "Acidic neon greens with UV-reactive surfaces and eerie post-apocalyptic glow.",
    accent: "#a3e635",
    prompt: "Preserve subject identity. Transform into a toxic radioactive glow aesthetic — neon green and acid yellow palette, fluorescent UV-reactive surfaces, eerie post-apocalyptic atmosphere, hazardous beauty, glowing particles drifting, biohazard signage in background. Subject in industrial wasteland setting. Inspired by Annihilation film and post-apocalyptic indie games. 16:9, toxic glow, ultra detailed neon light.",
  },
  {
    id: "motion-tracker",
    effect: "particles",
    name: "Motion Tracker",
    family: "Future",
    description: "Surveillance HUD with target reticles, timestamps, and military thermal feel.",
    accent: "#22d3ee",
    prompt: "Preserve subject identity. Transform into a surveillance HUD aesthetic — target reticle overlays tracking the subject's movement, frame timestamps and coordinates in corner, military thermal vision feel, intelligence operative atmosphere, dotted scan grids, data labels following the subject as they move. Inspired by Mission Impossible and Predator vision scenes. 16:9, motion tracker, ultra detailed HUD overlay.",
  },
  {
    id: "black-light",
    effect: "particles",
    name: "Black Light",
    family: "Future",
    description: "UV blacklight party glow with fluorescent neon paint and dark room atmosphere.",
    accent: "#c084fc",
    prompt: "Preserve subject identity. Transform into a UV blacklight nightclub aesthetic — fluorescent neon purple and magenta paint glowing on the subject's clothes and skin highlights, dark room party atmosphere, ultraviolet reactive surfaces, glowing fabric details, neon paint splatter. Subject in club setting. Inspired by Tron arcade and rave scene cinema. 16:9, black light, ultra detailed UV glow.",
  },
  {
    id: "liquid-chrome",
    effect: "hand-paint",
    name: "Liquid Chrome",
    family: "Art",
    description: "Psychedelic chrome distortion with fluid metallic surfaces and surreal motion.",
    accent: "#94a3b8",
    prompt: "Preserve subject identity. Transform into a psychedelic liquid chrome distortion — fluid mirror metallic surfaces surrounding the subject, surreal abstract motion, melting reflective material, mercury-like surfaces, chrome droplets, holographic shimmer. Subject partially morphs with chrome environment. Inspired by Terminator 2 T-1000 effects and surrealist art films. 16:9, liquid chrome, ultra detailed metallic reflection.",
  },
  {
    id: "duotone-bold",
    effect: "noir",
    name: "Duotone Bold",
    family: "Art",
    description: "Bold two-color graphic style with magazine-cover contrast and poster impact.",
    accent: "#fb7185",
    prompt: "Preserve subject identity. Transform into a bold duotone graphic style — only TWO contrasting colors (deep navy blue and hot orange), no midtones at all, high contrast poster look, magazine cover style, screen print energy. Subject rendered as iconic silhouette with sharp edges. Inspired by Spotify campaign posters and Olympics screen prints. 16:9, duotone bold, ultra detailed contrast.",
  },
  {
    id: "shattered-frame",
    effect: "layer-mixed-media",
    name: "Shattered Frame",
    family: "Art",
    description: "Fragmented broken-glass composition with collage panels and cubist motion.",
    accent: "#f97316",
    prompt: "Preserve subject identity. Transform into a shattered fragmented composition — broken glass panels framing different angles of the subject, dimensional rifts between fragments, collage cubist motion, identity dissolution effect, subject's face appearing across multiple cracked panes. Inspired by Black Mirror title sequence and Picasso cubism. 16:9, shattered frame, ultra detailed fracture.",
  },
  {
    id: "paper-fold",
    effect: "canvas",
    name: "Paper Fold",
    family: "Art",
    description: "Origami-style geometric creases with sharp paper-craft texture and sculpted shadows.",
    accent: "#fde68a",
    prompt: "Preserve subject identity. Transform into an origami paper-folding aesthetic — sharp geometric paper creases, paper craft texture, sculpted dimensional shadows, minimal craft beauty, origami shapes forming and unfolding around the subject, pastel paper colors. Inspired by Japanese paper art and award-winning paper sculpture commercials. 16:9, paper fold, ultra detailed paper texture.",
  },
  {
    id: "glow-drift",
    effect: "particles",
    name: "Glow Drift",
    family: "Mood",
    description: "Dreamy glowing orbs drifting through frame with bokeh and magical light dust.",
    accent: "#fde047",
    prompt: "Preserve subject identity. Transform into a dreamy glowing-orb scene — soft floating bokeh lights drifting around the subject, magical particle dust, atmospheric light leaks, fairytale shimmer, ethereal warm yellow glow. Subject walks through enchanted forest at twilight. Slow drifting camera motion. Inspired by Coraline and Pan's Labyrinth atmospheres. 16:9, glow drift, ultra detailed bokeh light.",
  },
  {
    id: "old-hollywood",
    effect: "paper",
    name: "Old Hollywood",
    family: "Vintage",
    description: "Golden age cinema glamour with classic black-and-white grain and starry lighting.",
    accent: "#fef3c7",
    prompt: "Preserve subject identity. Transform into 1940s Old Hollywood golden-age aesthetic — classic black and white film grain, soft glamour starlight key, vintage diva portrait quality, timeless elegance, cigarette smoke haze, art deco background details. Subject in elegant evening wear. Inspired by Casablanca and Marlene Dietrich photography. 16:9, old Hollywood, ultra detailed film grain.",
  },
  {
    id: "soap-bubbles",
    effect: "particles",
    name: "Soap Bubbles",
    family: "Whimsy",
    description: "Floating soap bubbles with rainbow reflections and slow dreamy drifting motion.",
    accent: "#a5f3fc",
    prompt: "Preserve subject identity. Transform into a whimsical floating soap-bubble scene — rainbow iridescent reflections on bubble surfaces drifting around the subject, dreamy childhood whimsy, slow drifting bubbles, magical shimmer, sunny garden setting. Bubbles softly pop with light flashes. Inspired by indie commercial spots and childhood memory ads. 16:9, soap bubbles, ultra detailed iridescence.",
  },
  {
    id: "glossy-page",
    effect: "canvas",
    name: "Glossy Page",
    family: "Fashion",
    description: "Editorial fashion magazine page with print-quality polish and commercial sheen.",
    accent: "#f5d0fe",
    prompt: "Preserve subject identity. Transform into a glossy fashion magazine aesthetic — editorial print quality, clean typography negative space around subject, high-end commercial polish, designer brand sheen, polished marble surfaces, perfect lighting. Subject in luxury setting with subtle motion. Inspired by Vogue and Harper's Bazaar editorial spreads. 16:9, glossy page, ultra detailed surface polish.",
  },
  {
    id: "frost-bite",
    effect: "noir",
    name: "Frost Bite",
    family: "Mood",
    description: "Frostbitten cold vision with icy blue tones, frozen breath, and arctic chill.",
    accent: "#bae6fd",
    prompt: "Preserve subject identity. Transform into a frostbitten cold-vision scene — icy blue and frozen white palette, breath fog visible in cold air, arctic chill mood, deep winter cinematic, snowflakes drifting around subject, ice crystals forming on edges of frame. Subject in heavy coat in snowy outdoor scene. Inspired by The Revenant and Frozen Planet documentaries. 16:9, frost bite, ultra detailed ice texture.",
  },
  {
    id: "mirror-shards",
    effect: "layer-mixed-media",
    name: "Mirror Shards",
    family: "Art",
    description: "Reflective broken-mirror facets with sharp geometric fragments and dimensional fracture.",
    accent: "#e2e8f0",
    prompt: "Preserve subject identity. Transform into a broken-mirror-shards reflective scene — fragmented mirror reflections of the subject from multiple angles, sharp geometric facets, dimensional fracture, kaleidoscopic identity, prismatic light scatter. Each shard shows a slightly different angle of the subject. Inspired by Black Swan and surrealist photography. 16:9, mirror shards, ultra detailed reflective fracture.",
  },
  {
    id: "magma-heat",
    effect: "flash-comic",
    name: "Magma Heat",
    family: "Mood",
    description: "Molten volcanic energy with glowing embers, intense heat, and primal fire tones.",
    accent: "#f97316",
    prompt: "Preserve subject identity. Transform into a molten volcanic scene — glowing red-orange embers floating around subject, intense heat distortion shimmer, primal fire energy, lava flow texture in background, ash particles, dramatic underlit faces by fire glow. Subject walks through volcanic landscape. Inspired by Mad Max Fury Road and Lord of the Rings Mount Doom scenes. 16:9, magma heat, ultra detailed fire glow.",
  },
  {
    id: "marble-bust",
    effect: "paper",
    name: "Marble Bust",
    family: "Vintage",
    description: "Classical marble sculpture with smooth stone texture and museum-quality lighting.",
    accent: "#f1f5f9",
    prompt: "Preserve subject identity but render the subject as a slowly rotating classical marble sculpture — smooth carved stone texture across body and face, museum gallery lighting, ancient Greek bust dignity, timeless white marble, soft museum spotlights. Subject becomes a marble bust on a pedestal. Inspired by Apollo Belvedere and the Met museum exhibits. 16:9, marble bust, ultra detailed stone texture.",
  },
  {
    id: "deep-tide",
    effect: "particles",
    name: "Deep Tide",
    family: "Mood",
    description: "Underwater submerged feel with blue-green caustics and fluid drifting motion.",
    accent: "#67e8f9",
    prompt: "Preserve subject identity. Transform into an underwater deep-ocean scene — blue-green caustic light patterns dancing across the subject, fluid motion through water, submerged dreamy atmosphere, drifting marine quality, slow motion, hair and clothing floating in current, light rays piercing from surface. Inspired by Avatar Way of Water and Free Solo diving documentaries. 16:9, deep tide, ultra detailed underwater caustics.",
  },
  {
    id: "editorial-modern",
    effect: "overexposed",
    name: "Editorial Modern",
    family: "Fashion",
    description: "Contemporary editorial cinema with minimal composition and bright commercial polish.",
    accent: "#fafafa",
    prompt: "Preserve subject identity. Transform into a modern editorial cinematic aesthetic — clean minimal composition, contemporary commercial polish, bright spacious mood, premium magazine quality, monochrome accent wall, designer furniture in background. Subject in confident editorial pose with minimal styling. Inspired by Kinfolk magazine and Apple TV+ commercials. 16:9, editorial modern, ultra detailed minimal aesthetic.",
  },
  {
    id: "graffiti-spray",
    effect: "flash-comic",
    name: "Graffiti Spray",
    family: "Urban",
    description: "Street graffiti energy with spray-paint texture, bold tags, and urban grit.",
    accent: "#a78bfa",
    prompt: "Preserve subject identity. Transform into a street graffiti spray paint aesthetic — bold spray paint texture, urban wall tags emerging around the subject, hip hop alley grit, raw street art energy, drip marks, neon spray accents in pink and lime green, exposed brick wall. Subject in front of graffiti wall. Inspired by Banksy works and 90s hip hop album covers. 16:9, graffiti spray, ultra detailed paint texture.",
  },
];
