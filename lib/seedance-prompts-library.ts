// Saad Studio — Cinematic Video Prompts Library.
// Curated, ready-to-use prompts for AI video generation, categorised for
// the /explore section's filter tabs. Each entry pairs a themed thumbnail
// (generated with the site's saad-studio-model character) with a copy-paste
// prompt tuned for Seedance / Kling / Higgsfield / Veo.
//
// To add a new prompt: append to SEEDANCE_PROMPTS.

export type SeedancePromptCategory =
  | "action"
  | "cinematic"
  | "commercial"
  | "character"
  | "documentary"
  | "fpv"
  | "animation";

export type SeedancePromptCategoryDef = {
  id: SeedancePromptCategory;
  nameAr: string;
  nameEn: string;
};

export const SEEDANCE_PROMPT_CATEGORIES: SeedancePromptCategoryDef[] = [
  { id: "cinematic",    nameAr: "سينمائي",         nameEn: "Cinematic" },
  { id: "action",       nameAr: "أكشن",            nameEn: "Action" },
  { id: "commercial",   nameAr: "إعلانات",         nameEn: "Commercial" },
  { id: "character",    nameAr: "شخصيات وأنظمة",   nameEn: "Character / System" },
  { id: "documentary",  nameAr: "وثائقي / حياتي",  nameEn: "Documentary" },
  { id: "fpv",          nameAr: "FPV / جوّي",      nameEn: "FPV / Aerial" },
  { id: "animation",    nameAr: "أنيمشن",          nameEn: "Animation" },
];

export interface SeedancePrompt {
  id: string;
  title: string;
  category: SeedancePromptCategory;
  author: string;
  authorUrl: string;
  sourceUrl: string;
  views: string;
  thumbnailUrl: string;
  prompt: string;
}

const B2 = "https://saadstudio-storage.s3.eu-central-003.backblazeb2.com/reference-thumbnails/seedance";
const CF = "https://customer-qs6wnyfuv0gcybzj.cloudflarestream.com";

export const SEEDANCE_PROMPTS: SeedancePrompt[] = [
  {
    id: "techhalla-flying-carpet",
    title: "Flying Carpet Beirut Chase",
    category: "action",
    author: "@techhalla",
    authorUrl: "https://x.com/techhalla",
    sourceUrl: "https://x.com/techhalla/status/2038922299152212250",
    views: "262K",
    thumbnailUrl: `https://saadstudio-storage.s3.eu-central-003.backblazeb2.com/reference-thumbnails/seedance/flying-carpet.webp`,
    prompt: `Style: Gritty Cine Verité, real footage, 35mm handheld lens with subtle natural shake.
Camera: Single continuous 3rd-person POV tracking shot (no cuts).
Lighting: Harsh, high-contrast Mediterranean noon sunlight; dramatic volumetric haze over the city.
Audio: Immersive spatial sound; heavy wind howling, fabric of the carpet flapping violently at high speeds, distant missile whizzes and muffled explosions.

[IMAGE REFERENCES / LEGEND]:
The main character and setting. Maintain the exact man in blue swim trunks, his physical build, and the ornate flying carpet as seen in the starting frame.

[TIMELINE SECOND BY SECOND]

0-3s: [Wide Shot] man takes a heavy leap from the limestone cliff onto the floating carpet. He makes a commanding forward gesture with his right arm. Physics: The carpet dips slightly under his weight before stabilizing.

3-8s: [Dynamic Tracking] The camera follows immediately behind his back at high velocity. High-speed travel toward the Beirut skyline. The carpet ripples intensely in the wind. The ocean surface below blurs with motion.

8-12s: [Action Sequence] Two missiles enter the frame from the city side. The man leans left and right, banking the carpet to dodge them in a single fluid motion. Missiles leave thick white smoke trails that the camera flies through.

12-15s: [Closing Action] Approaching the tallest skyscraper in the Beirut skyline. The man stands up and leaps from the carpet mid-air, landing firmly on the concrete rooftop. The camera maintains the 3rd-person tracking until he hits the ground.

[STYLE & QUALITY BOOSTERS]
Photorealistic 8K, movie-level stable facial features and body shape, ultra-detailed fabric textures on the carpet, cinematic lighting, perfect motion blur, high dynamic range, no artifacts, coherent physics.`,
  },
  {
    id: "aimikoda-vr-match-cut",
    title: "VR Match Cut — Polar Bear to Home",
    category: "cinematic",
    author: "@aimikoda (Kōda)",
    authorUrl: "https://x.com/aimikoda",
    sourceUrl: "https://x.com/aimikoda/status/2039380650109649085",
    views: "175K",
    thumbnailUrl: `https://saadstudio-storage.s3.eu-central-003.backblazeb2.com/reference-thumbnails/seedance/vr-match-cut.webp`,
    prompt: `FORMAT: 15s / free rhythm / 1 MATCH CUT / CONTINUOUS MOVE UNTIL MATCH CUT + IMMEDIATE ACTION FROM FIRST FRAME

SUBJECTS: A lone sword-bearing woman in weathered fur and leather fights a massive polar bear with desperate, two-handed survival movement. The same woman is later revealed at home in loose indoor clothes, where a VR headset appears only after the match cut and is pulled off in one clear motion.

ENVIRONMENT: Frozen wilderness under hard daylight, wind dragging snow across blue-white ice, then a modest lived-in home reached through a precise visual match. Winter glare and visible breath give way to soft clutter, indoor daylight, and a faint game-lit glow.

MOOD: Visceral survival tension snaps into grounded reality without breaking physical continuity.

COLOR LOGIC: Naturalistic Film Print Emulation

TIMELINE:
0:00-0:07: One unbroken handheld move, WS collapsing into MCU as the woman backpedals across the ice and the bear launches through blowing snow. The camera runs beside the leap at eye level, 28mm shifting to 35mm, slightly unstable and close enough to keep both bodies heavy and readable. The bear closes fast while she plants, recoils, and keeps the blade between them. SFX: (howling wind, boots grinding ice, low animal roar, cloth strain, blade cutting air, snow scrape). Hard winter sun side-lights the ice and throws sharp blue shadows.

0:07-0:11: Same unbroken move, no cut, tightening into a dead-on CU as the bear surges into the last inches. Right in the middle of the attack, a man's voice calls, Karla... then sharper, KARLA. She answers with a tired off, and on that reaction the world drops into slow motion. Snow drifts almost still, the bear hangs in its strike, and only she keeps moving at normal speed as the camera orbits into her face. Bored, not afraid, she drops the sword and brings both empty hands toward her temples in one smooth interrupt gesture. No headset, visor, or device is visible in the frozen world. Stay continuous until the match cut.

0:11-0:15: MATCH CUT. CU to MS. Seamless mid-motion transition as her rising hands cross the same screen position and the frozen close-up becomes the home interior with the same framing and clockwise drift. The motion continues uninterrupted, and now a VR headset is visibly strapped over her eyes for the first time. She grips both sides, pulls it fully off her face, and the camera opens into a medium shot as she drops it above her forehead and steps into a small living room in loose home clothes. 35mm natural lens, spherical. She turns toward the voice, rolls her eyes upward, and says, What is it.`,
  },
  {
    id: "0xbisc-stone-hand",
    title: "Stone Hand Warrior — 8-Shot Continuous Action",
    category: "action",
    author: "@0xbisc (Latte)",
    authorUrl: "https://x.com/0xbisc",
    sourceUrl: "https://x.com/0xbisc/status/2041152430780637670",
    views: "105K",
    thumbnailUrl: `https://saadstudio-storage.s3.eu-central-003.backblazeb2.com/reference-thumbnails/seedance/stone-hand.webp`,
    prompt: `SUBJECTS:
A female warrior with shoulder-length hair, the ends naturally flipping outward, pressed backward and slightly disheveled by air resistance during high-speed movement. She wears a dark, form-fitting tactical suit combining real fabric and worn metal elements, with visible water stains, dust, and signs of use.
A dual mechanical grappling hook system mounted on her back, capable of firing steel cables that retract to generate pulling force.
A massive stone hand connected to a giant's body (not severed, the arm extending upward into the clouds), descending vertically into frame from the cloud layer.

ENVIRONMENT:
A high-altitude fractured bridge structure with wet, slippery concrete surfaces, showing water traces, cracks, and scattered debris.
Below the bridge is an empty abyss, swallowed by fog, with no visible ground.
Lighting is overcast natural diffuse light, with a low-saturation cool color tone.

MOOD: Oppression, imbalance, critical threshold, continuous motion
STYLE: Realistic photographic texture, 35mm lens, handheld shooting with slight shake, natural depth of field, no sharpened edges, no clean CG look

TIMELINE:
SHOT 1 — MS, 35mm, lateral handheld tracking. The female warrior slides at high speed across the wet bridge surface, body leaning forward. Above, the giant's hand accelerates downward, its shadow rapidly deepening.

SHOT 2 — WS, 28mm, falling follow. The bridge collapses completely in front of her. Her front foot steps into empty space. She raises her arm to fire the grappling hook. The cable strikes a hanging steel cable on the right and instantly tightens.

SHOT 3 — MS, follow. The cable tension redirects her from vertical fall into a high-speed swing to the right.

SHOT 4 — MS, push-in. At the end of the swing, she releases the cable, landing on a falling concrete fragment.

SHOT 5 — WS, low angle. The giant's hand slams down vertically. She narrowly passes beneath the hand. Powerful shockwave, structural rupture, debris and water mist blast outward.

SHOT 6 — CU, slow motion. She is carried by the shockwave toward the edge of the hand. She uses the grappling hook on a crack on the hand's surface, creating a deceleration point.

SHOT 7 — MS → WS. Using the rough surface of the hand, she takes two accelerating steps and leaps.

SHOT 8 — MS, continuous tracking. The giant's hand recoils and slams down again, releasing another impact that blasts her back toward the remaining bridge structure, forming a seamless loop.`,
  },
  {
    id: "ai-girl-design-system-prompt",
    title: "Seedance 2 System Prompt (Image → JSON)",
    category: "character",
    author: "@AI_GIRL_DESIGN",
    authorUrl: "https://x.com/AI_GIRL_DESIGN",
    sourceUrl: "https://x.com/AI_GIRL_DESIGN/status/2046196963587371339",
    views: "620K",
    thumbnailUrl: `https://saadstudio-storage.s3.eu-central-003.backblazeb2.com/reference-thumbnails/seedance/ai-girl-design.webp`,
    prompt: `You are a top-tier film director and prompt designer for Seedance 2 video prompts.
The user gives you one image. You carefully observe its composition, pose, wardrobe, lighting, background, atmosphere, character relationships, emotion, and setting significance. Then you generate a ~15-second JSON prompt.

Goal: Use the user's image as the core scene, keeping the same person, wardrobe, and time period, while naturally extending to related locations so the viewer sees the behavior and atmosphere before and after the scene.

[BASIC PRINCIPLES]
1. First carefully observe the image (age, hair, clothing, pose, lighting, background)
2. Preserve the image's original appeal — do not over-transform
3. Must have movement/change (subtle pose shifts, gaze, hand motions)
4. Location expansion must feel natural (same building, same activity flow)
5. Structure it in a way Seedance 2 can generate easily

[OUTPUT FORMAT]
Must output JSON with this structure:
{
  "format": { "duration": "15s", "total_shots": 8, "sync_type": "..." },
  "subject": { "reference": "image_0.png", "description": "..." },
  "environment": { "setting": "...", "lighting": "..." },
  "mood": "...",
  "storyboard": [ { "shot": 1, "camera": "...", "action": "...", "sfx": "..." } ]
}

Phase 1: Output the initial JSON draft + ask the user "Is the location expansion sufficient? Reply 'yes' or I'll extend further."`,
  },
  {
    id: "cyberpunk-character-showcase",
    title: "Cyberpunk Character 360° Showcase",
    category: "character",
    author: "@FuSheng_0306",
    authorUrl: "https://x.com/FuSheng_0306",
    sourceUrl: "https://x.com/FuSheng_0306/status/2050805445032337720",
    views: "—",
    thumbnailUrl: `https://saadstudio-storage.s3.eu-central-003.backblazeb2.com/reference-thumbnails/seedance/cyberpunk-showcase.webp`,
    prompt: `Provide me with more precise prompts based on my ideas. Requirements: While maintaining character appearance and clothing consistency, this person stands on a platform and completes a full rotation, similar to a character showcase in a game. After finishing the rotation and facing the audience again, they raise their right hand and wave. At the same time, the text in the scene should flash with a cyber-tech feel, as if electric currents are flowing through it. Create an overall feeling of an interactive game interface.`,
  },
  {
    id: "sci-fi-mecha-storyboard",
    title: "Sci-Fi Mecha Commercial Storyboard",
    category: "commercial",
    author: "@tokyo_Valentine",
    authorUrl: "https://x.com/tokyo_Valentine",
    sourceUrl: "https://x.com/tokyo_Valentine/status/2050784601191432351",
    views: "—",
    thumbnailUrl: `https://saadstudio-storage.s3.eu-central-003.backblazeb2.com/reference-thumbnails/seedance/sci-fi-mecha.webp`,
    prompt: `Language: Japanese
Subtitles: None

Synopsis:
15-second commercial video
Please compose the cuts/scenes in @Image3`,
  },
  {
    id: "aew-wrestling-match",
    title: "AEW Women's Championship Wrestling Match",
    category: "action",
    author: "@AI__TSUBAKI",
    authorUrl: "https://x.com/AI__TSUBAKI",
    sourceUrl: "https://x.com/AI__TSUBAKI/status/2050689475626573993",
    views: "—",
    thumbnailUrl: `${B2}/aew-wrestling.webp`,
    prompt: `Hyper-realistic cinematic 15-second continuous video of a women's championship finale in a sold-out arena. Featuring Riho (Japanese, idol-like cuteness, black hair, very petite, light blue and white gear) vs Mercedes Moné (American, powerful and charismatic physique, gold-themed gear). Follow the storyboard sequence precisely: exhausted mid-match staredown → hard clothesline → submission struggle → DDT reversal → near fall → German suplex → top-rope moonsault finisher → three-count pin → championship victory moment. Maintain consistent facial identity and body proportions throughout. Realistic sweat, impact physics, and intense crowd reactions. Use slow motion for key moments. End with confetti and corner pyrotechnics as a cinematic crane shot rises on the winner. Photorealistic, AEW broadcast quality, 60fps, high-contrast lighting.`,
  },
  {
    id: "lipstick-brand-storyboard-ad",
    title: "Lipstick Brand Paris Restaurant Ad",
    category: "commercial",
    author: "@OlivioSarikas",
    authorUrl: "https://x.com/OlivioSarikas",
    sourceUrl: "https://x.com/OlivioSarikas/status/2050664853082456156",
    views: "—",
    thumbnailUrl: `https://saadstudio-storage.s3.eu-central-003.backblazeb2.com/reference-thumbnails/seedance/lipstick-paris.webp`,
    prompt: `Follow this storyboard @image_1 to create this AD

story = a woman in an elegant red dress uses her lipstick then sits down in a restaurant to have a date with an elegant man

1) establishing shot of the outside of the restaurant in paris

2) wide angle of the woman walking towards the entrance of the restaurant

3) closeup of smiling woman holding the lipstick @image_2 sideways so that the label "HotLips" is clearly visible on the Lipstick

4) closeup of the lips of the woman as she applies the red lipstick

5) over the shoulder of the woman walking towards the table with the man

6) closeup of the man smiling and saying "Amore with a Smile" - no speech-bubble!

7) medium-wide shot of both sitting across each other talking and laughing while holding hands across the table

8) closeup of the woman winking at the camera with a smile and the elegant text "HotLips Lipstick - Amore with a smile"`,
  },
  {
    id: "human-evolution-hyperlapse",
    title: "Human Evolution Hyperlapse",
    category: "cinematic",
    author: "@sebatheepan",
    authorUrl: "https://x.com/sebatheepan",
    sourceUrl: "https://x.com/sebatheepan/status/2050660247899980083",
    views: "—",
    thumbnailUrl: `https://saadstudio-storage.s3.eu-central-003.backblazeb2.com/reference-thumbnails/seedance/human-evolution.webp`,
    prompt: `human evolution over time a chronological hyper lapse video seamless transitions`,
  },
  {
    id: "romantic-film-strip-ocean",
    title: "Romantic Film Strip — Ocean Memories",
    category: "cinematic",
    author: "@churvikv (Viki)",
    authorUrl: "https://x.com/churvikv",
    sourceUrl: "https://x.com/churvikv/status/2050655860846690351",
    views: "—",
    thumbnailUrl: `https://saadstudio-storage.s3.eu-central-003.backblazeb2.com/reference-thumbnails/seedance/romantic-film-strip.webp`,
    prompt: `cinematic romantic sequence featuring a glowing film strip telling a love story at night over the ocean.

[0-3s] FIRST FRAME — Camera focuses on the first frame of a luminous film strip: a couple met on the beach at sunset. They are holding hands, silhouettes against orange and pink sky. Soft golden glow surrounds the frame. Gentle ocean waves in the background. Camera slowly pushes in.

[3-7s] LOVE MONTAGE — Camera smoothly moves between different film frames showing various romantic moments: first date under floating hot air balloons with colorful patterns, a passionate kiss on a sailboat at dusk with golden reflections on water, walking hand in hand under a starry sky with Milky Way visible, dancing together on the beach with sparklers. Each frame glows with warm golden light. Transitions between frames are fluid and dreamlike with soft light flares.

[7-10s] EMOTIONAL PEAK — Camera lingers on the most intimate frame: the proposal moment on the same beach, ring box opening, tears of joy, tight embrace. Golden particles float around them. The frame pulses brighter than others.

[10-13s] REAL WORLD — Camera exits from the film strip, revealing a real couple standing on the rocky shore looking up at this same glowing film strip in the night sky. They stand close together, arms around each other, watching their memories displayed above.

[13-15s] UNITY & ETERNITY — The couple and the glowing film strip merge in one unified frame. Golden light flows from the film to envelop the real couple. Stars twinkle brilliantly in the deep blue sky. Final shot: love captured in eternity, film strip and couple becoming one luminous entity. Romantic, timeless atmosphere.`,
  },
  {
    id: "cowboy-showdown",
    title: "Cowboy Showdown Western Short",
    category: "cinematic",
    author: "@ai_gezgini",
    authorUrl: "https://x.com/ai_gezgini",
    sourceUrl: "https://x.com/ai_gezgini/status/2050645169452863863",
    views: "—",
    thumbnailUrl: `https://saadstudio-storage.s3.eu-central-003.backblazeb2.com/reference-thumbnails/seedance/cowboy-showdown.webp`,
    prompt: `Create a seamless 15-second cinematic cowboy showdown video using the uploaded 3x3 storyboard image as the main reference.

Use the storyboard only for character identity, shot order, poses, wardrobe, composition, emotional tone, and scene progression. Do NOT recreate the storyboard grid, borders, or panel layout. Transform it into one continuous cinematic video.

Style: ultra-realistic cinematic western film, tense dusty frontier town, dramatic golden-hour cowboy atmosphere

Video Flow:
The female cowboy's distant walk toward camera is shown only briefly, then the shot quickly moves into a close-up of her face, revealing sadness, disappointment, and quiet determination. She reaches the male cowboy and faces him in the dusty western street as tension builds through close-ups of eyes, hands, holster, boots, wind, and drifting dust. The man stands with his back toward the camera and never reaches for his gun. Suddenly, the woman draws her revolver with sharp speed and shoots him. He is hit and falls into the dust. She lowers the gun, still sorrowful rather than victorious, then turns away and walks into the sunset after completing her mission.`,
  },
  {
    id: "grwm-natural-aesthetic",
    title: "Natural Aesthetic GRWM (Get Ready With Me)",
    category: "documentary",
    author: "@Just_sharon7",
    authorUrl: "https://x.com/Just_sharon7",
    sourceUrl: "https://x.com/Just_sharon7/status/2050643288752099742",
    views: "—",
    thumbnailUrl: `https://saadstudio-storage.s3.eu-central-003.backblazeb2.com/reference-thumbnails/seedance/grwm.webp`,
    prompt: `Setting & Aesthetic
Filmed in a cozy, natural bedroom with soft neutral tones (beige, white, warm grey). Natural side lighting creates a warm, authentic feel. Background features a neatly made bed and bedside lamp — lived-in but clean. No ring light — keeps it feeling organic and real.

Creator Vibe
Young woman, 20s, effortlessly put-together — long straight highlighted hair (showcasing the product's results), minimal glam makeup, soft pink cardigan over a white top, dainty pearl necklace. She looks like your stylish friend, not a polished influencer.

Delivery Style
Warm, conversational, slightly excited
Looking down at the product then up at camera — natural discovery feel
Smiling softly — approachable and trustworthy
Speaking mid-sentence as if mid-thought (hook style)`,
  },
  {
    id: "cybernetic-gunslinger",
    title: "Cybernetic Gunslinger Neon Action",
    category: "action",
    author: "@LudovicCreator",
    authorUrl: "https://x.com/LudovicCreator",
    sourceUrl: "https://x.com/LudovicCreator/status/2050640233553657935",
    views: "—",
    thumbnailUrl: `https://saadstudio-storage.s3.eu-central-003.backblazeb2.com/reference-thumbnails/seedance/cybernetic-gunslinger.webp`,
    prompt: `General Technical Specifications: ultra-cinematic blockbuster, photorealistic 8K, f/0.4 aperture, high contrast, deep blue neon night, volumetric rain and fog

Lighting: strong neon contrast (blue, magenta), reflections on wet asphalt, flickering signage, backlight silhouettes

Shot List and Sequence:

Shot 1: Wide Shot (2s) — A lone cybernetic gunslinger stands in a neon-lit street at night. Rain falling. Coat moving slightly. Shadowy figures emerge from alleys, forming a loose circle.

Shot 2: Close-Up (1.5s) — Face tight. One eye glowing. Subtle mechanical flicker. Calm, focused.

Shot 3: Insert Shot (1s) — Hand near holster. Fingers twitch with precise servo motion.

Shot 4: Medium + Whip Pan (2s) — An attacker rushes forward. Camera whip pans as the gunslinger turns sharply.

Shot 5: Action Shot (2s) — Instant draw. A sharp energy discharge fires forward, creating a brief air distortion ripple.

Shot 6: Impact Shot (1.5s) — Attacker is pushed backward, sliding across wet ground, sparks scattering.

Shot 7: Side Tracking (2s) — Two more figures approach. The gunslinger pivots and fires in controlled succession, minimal movement, maximum precision.

Shot 8: Close Combat (1.5s) — One attacker reaches close range. Fast mechanical arm movement creates strong kinetic displacement.

Shot 9: Micro Slow Motion (1s) — Rain freezes briefly as another shot cuts through the air, glowing trail visible.

Shot 10: Final Hero Shot (1.5s) — Silence. The gunslinger stands alone. Weapon lowered slightly. Neon reflections ripple across the wet street.

Camera: a lot of camera angles and shot switches, ultra dynamic, whip pans, fast cuts, controlled micro slow-motion
Style: 80s/90s action movie style, ultra dynamic, dramatic cloth movement, volumetric rain and fog, grounded physics, normal proportions without stretch`,
  },
  {
    id: "fpv-snowboard",
    title: "Cinematic FPV Snowboard Sequence",
    category: "fpv",
    author: "@Gwsubsa (yopiwhs)",
    authorUrl: "https://x.com/Gwsubsa",
    sourceUrl: "https://x.com/Gwsubsa/status/2050609668112949486",
    views: "—",
    thumbnailUrl: `https://saadstudio-storage.s3.eu-central-003.backblazeb2.com/reference-thumbnails/seedance/fpv-snowboard.webp`,
    prompt: `Ultra-realistic cinematic FPV snowboard sequence, 4K HDR, high contrast, cold blue color grading, natural lighting, strong motion blur, realistic snow physics, 16:9.

LOCATION:
High mountain snowy landscape, wide open slopes, powder snow, golden hour sunlight, dramatic sky.

MAIN SUBJECT:
A professional snowboarder wearing a modern snow jacket, helmet, and goggles. Smooth, aggressive riding style.

CAMERA STYLE:
FPV drone-style follow cam, ultra dynamic, close tracking, fast acceleration, precise movement.

[0-5s] The camera starts behind the snowboarder at the top of a snowy peak. Strong wind blows snow particles. The rider drops in aggressively downhill. Powder snow sprays toward the camera, slight lens snow effects, intense speed feeling.

[5-10s] High-speed carving sequence. The camera follows very closely, shifting slightly side-to-side. Snow sprays dynamically with each turn. Strong motion blur and wind streak effects. Terrain uneven and fast.

[10-15s] The rider launches off a small cliff. The camera follows upward smoothly. Mid-air slow motion: floating snow particles, dramatic lighting. The rider performs a stylish trick. Hard landing with explosive snow impact, subtle camera shake, then stabilizes.`,
  },
  {
    id: "stylized-3d-animation",
    title: "Stylized 3D Animation Adventure",
    category: "animation",
    author: "@aimikoda (Kōda)",
    authorUrl: "https://x.com/aimikoda",
    sourceUrl: "https://x.com/aimikoda/status/2050608494361956510",
    views: "—",
    thumbnailUrl: `https://saadstudio-storage.s3.eu-central-003.backblazeb2.com/reference-thumbnails/seedance/3d-animation.webp`,
    prompt: `INTENT: Create a playful, high-energy friendship adventure that briefly turns tense when one rider is pulled into storm clouds, then resolves with a triumphant rescue and joyful return.
STYLE: stylized family-feature 3D animation feel, rounded expressive characters.`,
  },
  {
    id: "indian-kingdom-fpv",
    title: "Ancient Indian Kekaya Kingdom FPV",
    category: "fpv",
    author: "@shushant_l",
    authorUrl: "https://x.com/shushant_l",
    sourceUrl: "https://x.com/shushant_l/status/2050591261820878904",
    views: "—",
    thumbnailUrl: `https://saadstudio-storage.s3.eu-central-003.backblazeb2.com/reference-thumbnails/seedance/indian-kingdom.webp`,
    prompt: `Extremely fast-paced cinematic FPV flying through the ancient Indian Kekaya kingdom at its peak, hyper-realistic, ultra-detailed, HDR. Camera starts high above vast fertile plains and rivers, rapidly diving into a grand fortified city with sandstone palaces, intricate carvings, and towering gates. Speeding through bustling markets filled with traders, horses, chariots, silk fabrics, and pottery. Dynamic motion through royal courtyards where warriors train with swords and archers practice. Then smoothly go into opulent interiors with golden decor, oil lamps, and royal assemblies. Intense FPV sweeps over battle formations outside the city with elephants, cavalry, and infantry in traditional armor. Sunset lighting with warm tones, volumetric dust, dramatic shadows, cinematic depth of field. Highly immersive, realistic physics, historically inspired architecture and clothing, epic scale.`,
  },
];

export function getSeedancePromptCount(category: SeedancePromptCategory | "all"): number {
  if (category === "all") return SEEDANCE_PROMPTS.length;
  return SEEDANCE_PROMPTS.filter((p) => p.category === category).length;
}
