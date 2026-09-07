// Generate Reference Studio thumbnails with Google Gemini image models and
// upload them to Backblaze B2 at reference-thumbnails/<key>.webp
//
// Run:  node scripts/generate-reference-thumbnails.mjs --set=shots [--force] [--only=id1,id2]
//
// Sets:  styles  → the 18 added HOOK_STYLES tiles
//        shots   → the 24 HOOK_SHOT_TYPES tiles (keys prefixed "shot-")
//        films   → the 18 HOOK_FILM_STOCKS tiles (keys prefixed "film-")
//        looks   → the 30 HOOK_MOVIE_LOOKS tiles (keys prefixed "look-")
//        lights  → the 18 HOOK_LIGHTING tiles (keys prefixed "light-", one shared still-life)
//        blurs   → the 9 HOOK_MOTION_BLURS tiles (keys prefixed "blur-", one shared dancer)

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function loadDotenv(filename) {
  const p = resolve(ROOT, filename);
  if (!existsSync(p)) return;
  for (const raw of readFileSync(p, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadDotenv(".env.local");
loadDotenv(".env");

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const onlyArg = args.find((a) => a.startsWith("--only="));
const ONLY = onlyArg ? new Set(onlyArg.slice(7).split(",").map((s) => s.trim())) : null;
const setArg = args.find((a) => a.startsWith("--set="));
const SET = setArg ? setArg.slice(6).trim() : "styles";
const OUT_DIR = resolve(ROOT, `scratchpad/${SET}-thumbnails`);

const KEY =
  process.env.GOOGLE_API_KEY ||
  process.env.GOOGLE_AI_API_KEY ||
  process.env.GEMINI_API_KEY ||
  "";
if (!KEY) throw new Error("GOOGLE_API_KEY not set");

const MODEL = process.env.STYLE_THUMB_MODEL || "gemini-3.1-flash-image";

const BUCKET = process.env.B2_BUCKET || "saadstudio-storage";
const REGION = process.env.B2_REGION || "eu-central-003";
const ENDPOINT = process.env.B2_ENDPOINT || "https://s3.eu-central-003.backblazeb2.com";
const FOLDER = "reference-thumbnails";

const s3 = new S3Client({
  region: REGION,
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: process.env.B2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.B2_SECRET_ACCESS_KEY || "",
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

const NO_TEXT = "No watermark, no logo, no caption bar, no border frame.";

// Shared look so every Shot Type tile reads as one coherent set, and a standing
// content rule for this project: Iraqi subjects and settings, secular landmarks only.
const SHOT_LOOK = "Cinematic film still, natural available light, subtle 35mm film grain, muted filmic color grade, believable documentary realism.";
const SHOT_RULES = "Iraqi subject and setting. No mosques, no minarets, no shrines or religious buildings. No watermark, no logo, no text overlay, no border frame.";
const shot = (framing, scene) => `${SHOT_LOOK} ${framing} ${scene} ${SHOT_RULES}`;

const SETS = {};

SETS.styles = [
  ["minimalism", `Minimalist graphic design composition. A single small matte ceramic vessel centered on a vast off-white plaster background, one thin charcoal accent line, muted beige and soft black palette, enormous negative space, calm diffused studio light, ultra clean and restrained. ${NO_TEXT}`],
  ["maximalism", `Maximalist interior design vignette. Densely layered clashing patterns, rich jewel tones of emerald fuchsia and gold, ornate embroidered textiles over leopard print, velvet brass and tropical florals, every surface decorated, opulent warm lighting. ${NO_TEXT}`],
  ["surrealdesign", `Surreal design artwork. A floating stone arch and a giant levitating orange above a pale desert plain, impossible perspective, dreamlike Magritte-inspired composition, soft peach and lavender gradient sky, long clean shadows. ${NO_TEXT}`],
  ["swissdesign", `Swiss International Style graphic design poster. Strict modular grid, flat geometric shapes, large clean sans-serif type blocks, pure red black and white palette, rational asymmetric layout, crisp offset print reproduction.`],
  ["y2kdesign", `Y2K aesthetic design. Liquid chrome metal blobs, holographic iridescent gradients, bubbly early-2000s digital graphics, lens flares and star sparkles, cyan magenta and silver palette, glossy plastic surfaces. ${NO_TEXT}`],
  ["glassmorphism", `Glassmorphism interface design. Floating frosted translucent glass panels with heavy background blur, thin luminous white borders, soft violet and teal gradient glow behind, layered depth and soft shadows, modern dark UI aesthetic, no readable text. ${NO_TEXT}`],
  ["collageart", `Mixed media collage art. Torn magazine paper cutouts, halftone newspaper scraps, masking tape and staples, hand-cut layered photographic fragments, textured kraft paper background, analog scrapbook feel. ${NO_TEXT}`],
  ["vectorart", `Flat vector illustration. Clean bezier shapes, bold solid color fills, simple geometric figures in a modern editorial scene, no gradients and no texture, crisp SVG-like flat design, limited harmonious palette. ${NO_TEXT}`],
  ["futuristic", `Futuristic design concept. Sleek white and chrome curved forms, glowing blue light strips, seamless advanced technology surfaces, ultra clean sci-fi product aesthetic, soft rim lighting on a dark gradient. ${NO_TEXT}`],
  ["aurora", `Aurora gradient aesthetic. Flowing northern-lights ribbons of green teal violet and pink light, soft blurred luminous mesh gradients over a deep dark night sky, silky smooth color transitions. ${NO_TEXT}`],
  ["retro", `Retro 1970s graphic design. Warm sunburst stripes in mustard orange rust and cream, rounded groovy shapes, vintage offset print grain, faded sun-bleached palette, nostalgic seventies album-cover aesthetic. ${NO_TEXT}`],
  ["pixelart", `16-bit pixel art scene. Crisp square pixels, limited retro console palette, isometric pixel-art room with a tiny character and a warm lamp glow, hard dithering, nostalgic SNES-era video game look. ${NO_TEXT}`],
  ["cyberpunk", `Cyberpunk night street. Rain-slick asphalt reflecting dense neon signage in Arabic and Latin lettering, magenta and cyan glow, holographic floating advertisements, steam and atmospheric haze, moody high-contrast mood. ${NO_TEXT}`],
  ["popart", `Pop art comic illustration. A stylish Iraqi woman with dark wavy hair in profile, bold black outlines, Ben-Day halftone dots, primary red yellow and blue flat fills, high contrast retro comic printing. ${NO_TEXT}`],
  ["handwritten", `Handwritten lettering style. Ink calligraphy strokes and loose script on textured cream paper, hand-drawn doodles arrows and underlines, fountain pen and a coffee ring, casual personal notebook aesthetic. ${NO_TEXT}`],
  ["bohemian", `Bohemian aesthetic still life. Warm terracotta and sand palette, macrame wall hanging, dried pampas grass in a clay vase, rattan and woven textures, layered rugs, earthy natural styling in soft afternoon light. ${NO_TEXT}`],
  ["graffiti", `Graffiti street art. Spray paint wildstyle lettering on a weathered concrete wall, vivid overlapping abstract tags, paint drips and stencil layers, urban grit and daylight shadows. Lettering must be abstract invented shapes only: no personal names, no religious words or symbols, no readable slogans. ${NO_TEXT}`],
  ["victorian", `Victorian era decorative design. Ornate gold filigree frame, engraved botanical etchings, deep burgundy and antique cream, damask pattern background, 19th century decorative print plate. ${NO_TEXT}`],
];

// Shot Type tiles. B2 keys are prefixed "shot-" so they never collide with the
// camera-movement thumbnails that share some names.
SETS.shots = [
  ["shot-ecu-front", shot(
    "Extreme close-up: the face fills the entire frame from brow to chin, eyes on the upper third, subject looking straight into the lens. 85mm, very shallow depth of field.",
    "An elderly Iraqi man with deeply weathered skin and a white moustache, warm window light from the side, dim interior behind.")],
  ["shot-ecu-45", shot(
    "EXTREME close-up, macro tight: the face is cropped by the frame edges, forehead and chin cut off, only the eyes nose and mouth region fills the whole frame. The head is turned exactly halfway between front and profile: both eyes visible, the far cheek receding. 85mm, very shallow depth of field.",
    "An Iraqi woman in her late twenties, soft overcast daylight, blurred autumn street behind her.")],
  ["shot-ecu-profile", shot(
    "EXTREME close-up, macro tight: the face is cropped by the frame edges and fills the whole frame, in an exact 90 degree side profile. The subject looks perpendicular to the camera, only ONE eye visible, the nose and lips read as a clean silhouette against the background. 85mm, very shallow depth of field.",
    "A young Iraqi woman with braided dark hair, rim light along the jawline, dark soft background.")],
  ["shot-cu-front", shot(
    "Close-up: head and the top of the shoulders, cut just below the collarbone, subject facing the lens straight on. 85mm.",
    "An Iraqi woman in her thirties inside a Baghdad tea house, warm lamps and glassware bokeh behind her.")],
  ["shot-cu-45", shot(
    "Close-up: head and the top of the shoulders, body angled 45 degrees to the lens with the face turned toward camera. 85mm.",
    "A young Iraqi man in a denim jacket on a city sidewalk, blurred pedestrians and brick facades behind.")],
  ["shot-cu-profile", shot(
    "Close-up: head and the top of the shoulders in an exact 90 degree side profile. The subject looks perpendicular to the camera and does NOT face the lens, only ONE eye is visible, the nose and chin form a clean silhouette. 85mm.",
    "An older Iraqi man with grey hair and a lined face, date palms and warm afternoon haze behind him.")],
  ["shot-medium-front", shot(
    "Medium shot: framed from the waist up, subject facing the lens straight on, environment readable behind. 50mm.",
    "An Iraqi woman browsing a book stall on Mutanabbi Street in Baghdad, stacked books and awnings behind her.")],
  ["shot-medium-45", shot(
    "Medium shot: framed from the waist up, the body turned exactly halfway between front and profile, shoulders clearly angled away from the lens while the face turns back toward camera. 50mm.",
    "An Iraqi man on the Basra corniche at dusk, river and boat lights softly out of focus behind him.")],
  ["shot-medium-profile", shot(
    "Medium shot: framed from the waist up, seen from the side at a clean 90 degrees. 50mm.",
    "An Iraqi woman standing in the courtyard of an old Baghdadi house with carved shanasheel woodwork behind her.")],
  ["shot-three-quarter-front", shot(
    "Three-quarter shot: framed from mid-thigh up, subject facing the lens, full posture and gesture visible. 40mm.",
    "An Iraqi man in a wool coat standing by tall windows in a warm book-lined room.")],
  ["shot-three-quarter-45", shot(
    "Three-quarter shot: framed from mid-thigh up, the body turned exactly halfway between front and profile, one shoulder noticeably closer to the lens than the other, face turned back toward camera. 40mm.",
    "A young Iraqi woman standing beside a parked vintage car on a quiet city street, low sun.")],
  ["shot-three-quarter-profile", shot(
    "Three-quarter shot: framed from mid-thigh up, seen from the side at a clean 90 degrees. 40mm.",
    "An Iraqi man standing at a street tea stall, steam rising, blurred market crowd behind him.")],
  ["shot-long-front", shot(
    "Long shot: the full body head to feet, facing the lens, clear headroom, location established around the subject. 35mm.",
    "An Iraqi man standing in front of a sunlit mudbrick wall in a dusty southern village.")],
  ["shot-long-profile", shot(
    "Long shot: the full body head to feet seen from the side, clear headroom, location established around the subject. 35mm.",
    "An Iraqi woman standing side-on at the edge of the Ahwar marshes, tall reeds and still water behind her.")],
  ["shot-wide-front", shot(
    "Wide shot: the figure is small within a vast environment that dominates the frame, facing the lens. 24mm, deep focus.",
    "A lone traveller standing in an immense Iraqi desert valley under a huge sky at golden hour.")],
  ["shot-wide-45", shot(
    "Wide shot: the figure is small within a vast environment that dominates the frame, angled 45 degrees to the lens. 24mm, deep focus.",
    "A person poling a narrow mashoof boat through the wide Ahwar marshes, reed beds stretching to the horizon.")],
  ["shot-over-shoulder", shot(
    "Over-the-shoulder shot: the back of a foreground person's head and shoulder fills one lower corner and stays soft and out of focus, the facing subject is sharp in the opposite third. 50mm.",
    "Two Iraqi friends talking across a small tea table, warm café interior.")],
  ["shot-back", shot(
    "Back shot: the subject seen from directly behind, face fully hidden, looking away into the scene so the viewer shares their vantage point. 35mm.",
    "A man standing at a railing above the Shatt al-Arab river at sunset, water and distant palms ahead.")],
  ["shot-pov", shot(
    "Point-of-view shot: the scene exactly as the character's own eyes see it, their own hands entering the bottom of the frame, natural eye-level height. 28mm.",
    "First-person view of hands holding a small istikan glass of dark tea over a metal tray, a busy Baghdad market beyond.")],
  ["shot-high-angle", shot(
    "High-angle shot: the camera is clearly above the subject and tilted down, compressing them against the ground so they read smaller and more vulnerable.",
    "A woman standing alone in a narrow Baghdad alley, patterned paving and long shadows around her.")],
  ["shot-low-angle", shot(
    "Low-angle shot: the camera is below eye level and tilted up, the subject towering against the sky, reading as powerful and imposing.",
    "An Iraqi man in a long coat standing above the lens against a bright open sky.")],
  ["shot-dutch-angle", shot(
    "EXTREME dutch angle / canted frame: the entire image is rotated roughly 35 degrees off level, as if the photograph itself were turned. Every vertical in the scene — building corners, doorways, lamp posts, the standing person — leans hard to one side and runs as a strong diagonal from one corner of the frame toward the opposite corner. The ground line and horizon cut across the frame as an obvious steep diagonal, never horizontal. Disorienting and unmistakably tilted.",
    "A man walking through a busy Baghdad street, signage and traffic tilted with the frame.")],
  ["shot-birds-eye", shot(
    "Bird's eye view: the camera is directly overhead looking straight down, the scene flattened into a graphic top-down map-like composition.",
    "An overhead view of a Basra market square, stalls, awnings and people forming a pattern of rectangles.")],
  ["shot-worms-eye", shot(
    "Worm's eye view: the camera sits on the ground looking almost straight up, extreme vertical perspective with everything converging high above.",
    "Looking up past date palms and a plain concrete building edge to the sky, a person standing over the lens.")],
];

// Film Stock tiles. B2 keys are prefixed "film-". Each tile must make the
// emulsion's own character (grain, contrast curve, colour bias) legible at
// thumbnail size, so the scene is chosen to show that character off.
const film = (emulsion, scene) =>
  `Authentic analog photograph, ${emulsion} ${scene} Real photochemical film character, no digital sharpening, no HDR. Iraqi subject and setting. No mosques, no minarets, no shrines or religious buildings. No watermark, no logo, no text overlay, no border frame.`;

SETS.films = [
  ["film-tungsten-balanced", film(
    "shot on tungsten-balanced film: cool blue-leaning shadows with warm amber practicals left uncorrected, slightly crushed blacks, moderate grain.",
    "A busy Baghdad night market street, strings of bulbs and shop signs glowing amber against deep blue evening shadow, people walking.")],
  ["film-warm-fine-grain", film(
    "shot on warm fine-grain colour negative: golden highlight roll-off, gentle amber cast through the midtones, very fine tight grain, creamy tonal transitions.",
    "A young Iraqi woman beside a sunlit window, warm late light across her face and the wall behind her.")],
  ["film-soft-warm", film(
    "soft warm film look: lifted milky blacks, low contrast, honey-toned highlights, visible halation blooming around the light sources, soft diffused rendering.",
    "A quiet tea house interior, backlit steam and glassware, a figure silhouetted against a bright doorway.")],
  ["film-warm-film", film(
    "warm film stock: strong amber and orange bias across the whole frame, rich saturated warm tones, deep contrast, visible organic grain.",
    "A rooftop in Baghdad at golden hour, warm light raking across satellite dishes and a seated figure.")],
  ["film-vibrant-fine-grain", film(
    "shot on vibrant fine-grain slide film: punchy saturated colour, high micro-contrast, crisp detail, extremely fine grain, vivid reds and greens with clean neutral whites.",
    "A spice stall in a Basra market, mounded cones of red, yellow and green spices in bright daylight.")],
  ["film-cinema-tungsten", film(
    "shot on cinema tungsten motion picture stock: warm practicals rendered rich and golden, teal-shifted shadows, wide latitude, filmic highlight roll-off, subtle 35mm grain.",
    "A warm restaurant interior at night, pendant lamps over a long table, diners in conversation.")],
  ["film-cinema-daylight", film(
    "shot on cinema daylight motion picture stock: neutral clean daylight balance, natural skin tones, wide dynamic range holding both the bright window and the shadow detail, fine 35mm grain.",
    "A living room interior with tall bright windows, a person standing mid-room, sunlight falling across the floor.")],
  ["film-soft-pastel", film(
    "soft pastel film emulsion: desaturated chalky colour, pale washed highlights, lifted low-contrast blacks, dreamy muted palette of soft pinks greens and blues.",
    "Pale morning mist over the Ahwar marshes, reeds and still water under a soft washed sky.")],
  ["film-green-cast", film(
    "expired film with a heavy green cast: olive-green tint pushed through the midtones and shadows, muted desaturated reds, murky contrast, unstable vintage colour shift.",
    "A narrow city street between concrete buildings, parked cars and a passer-by under flat daylight.")],
  ["film-saturated-film", film(
    "heavily saturated colour film: dense rich colour, deep blacks, bold contrast curve, glowing saturated primaries, classic punchy print look.",
    "A rug and textile bazaar, walls of deeply coloured carpets in red, indigo and gold.")],
  ["film-natural-color", film(
    "shot on natural colour negative: accurate neutral colour reproduction, true-to-life skin tones, balanced moderate contrast, unobtrusive fine grain, no colour cast at all.",
    "An Iraqi man standing on an ordinary daytime street, plain overcast daylight, honest everyday colour.")],
  ["film-saturated-heavy-grain", film(
    "push-processed high-ISO colour film: heavy coarse visible grain across the entire frame, saturated dense colour, hard contrast, gritty textured photographic surface.",
    "A crowded night street with taxis and neon shopfronts, motion in the crowd.")],
  ["film-cold-film", film(
    "cold film stock: strong blue and cyan bias throughout, cool steel shadows, desaturated warm tones, crisp contrast, chilly overcast colour response.",
    "A grey winter morning on the Tigris riverbank, bare trees and a lone figure by the water.")],
  ["film-fine-grain", film(
    "shot on low-ISO fine-grain film: exceptionally smooth almost invisible grain, very high resolving detail, restrained natural saturation, clean neutral tonality.",
    "The carved wooden shanasheel balcony of an old Baghdadi house in even daylight, every detail crisply resolved.")],
  ["film-instant-film", film(
    "instant integral film: soft low-resolution rendering, lifted milky blacks, warm yellow-green colour shift, strong vignetted corners, uneven chemical development, snapshot immediacy.",
    "Three friends grinning close to the camera at a street corner, casual snapshot.")],
  ["film-high-contrast-bw", film(
    "high-contrast black and white film: pure crushed blacks against clean blown whites, very few midtones, graphic hard-edged tonal separation, punchy dramatic monochrome. Completely monochrome, no colour whatsoever.",
    "Hard midday sun on a concrete stairway, two figures reduced to sharp black shapes against the white wall.")],
  ["film-black-and-white", film(
    "classic black and white film: a full continuous tonal scale from deep black to bright white, rich silver midtones, moderate contrast, fine even grain. Completely monochrome, no colour whatsoever.",
    "A street portrait of an older Iraqi man in a doorway, soft daylight modelling his face.")],
  ["film-high-speed-bw", film(
    "push-processed high-speed black and white film: coarse gritty grain, hard contrast with blocked-up shadows, raw reportage monochrome texture. Completely monochrome, no colour whatsoever.",
    "A dense night crowd on a city street lit by a single harsh light, movement and grain.")],
];

// Movie Look tiles. B2 keys are prefixed "look-". Each tile has to sell its
// colour grade at thumbnail size, so the scene is picked to carry the palette.
const look = (grade, scene) =>
  `Cinematic film still from a feature film, ${grade} ${scene} Anamorphic framing, professional colour grade, subtle film grain, photoreal. Iraqi cast and setting. No mosques, no minarets, no shrines or religious buildings. No watermark, no logo, no subtitles, no text overlay, no border frame.`;

SETS.looks = [
  // warm
  ["look-desert-gold", look(
    "sun-bleached amber and ochre grade, hazy atmospheric depth, warm sand highlights falling into soft violet shadows.",
    "A hooded figure seated on a ridge above an immense dune field at low sun, epic scale.")],
  ["look-near-future-warmth", look(
    "soft coral and blush grade, clean bright interior, gentle low contrast, optimistic tactile futurism.",
    "A man alone at a curved desk beside a huge window overlooking a hazy future skyline.")],
  ["look-warm-whimsy", look(
    "buttery gold and soft green grade, storybook charm, gentle contrast, nostalgic sunlit warmth.",
    "A woman smiling faintly at a kitchen table, sunlight through a leafy window, bicycles outside.")],
  ["look-sun-drenched-summer", look(
    "sun-drenched grade, bright hazy sunlight blooming into gentle flare, warm honey highlights, lush greens.",
    "A young man by an open window over a sunlit orchard courtyard, languid summer afternoon.")],
  ["look-golden-ancient-rome", look(
    "burnished bronze and wheat grade, dust motes in shafts of hard sun, heavy warm contrast, monumental historical scale.",
    "Robed figures in a vast ancient stone hall, hard sunbeams cutting through the dusty air.")],
  ["look-soft-warmth", look(
    "gentle amber wash, lifted shadows, low contrast, intimate domestic light.",
    "Two women talking closely in a warm cluttered living room, framed family photographs behind them.")],
  ["look-candlelit-period", look(
    "candlelit grade: deep amber pools of flame light falling off into near-black, painterly chiaroscuro, natural-source-only illumination.",
    "A period dining room lit only by a candelabra, figures in nineteenth-century dress around the table.")],
  ["look-warm-wonder", look(
    "warm wonder grade: golden backlight and glowing rim light, soft haze, a face lit by a source just out of frame.",
    "A boy holding a glowing lantern up in a dark workshop, awe on his face, warm light spilling around him.")],

  // cool
  ["look-neon-cyberpunk", look(
    "neon cyberpunk grade: saturated magenta and cyan neon against deep blue-black shadows, wet reflective ground, volumetric haze.",
    "Figures in long coats on a rain-soaked night street beneath dense glowing signage.")],
  ["look-cold-space", look(
    "cold space grade: desaturated steel blue and grey, hard unforgiving light, vast empty negative space, clinical isolation.",
    "A lone figure in a heavy suit standing before an abandoned house on a barren frozen plain under a pale sky.")],
  ["look-green-tinted-digital", look(
    "green-tinted digital grade: pervasive emerald cast through every midtone and shadow, crushed blacks, cold artificial screen glow.",
    "A figure in a long coat in a dim corridor of glowing green server racks and cascading code.")],
  ["look-cold-minimalism", look(
    "cold minimalist grade: muted blue-grey palette, restrained low saturation, precise controlled light, emotional distance.",
    "Two men at opposite ends of a bare grey office at night, one leaning over a desk, wide empty space between them.")],
  ["look-futuristic-neon-blue", look(
    "futuristic neon blue grade: glowing electric cyan light lines against pure black, hard specular reflections, geometric synthetic environment.",
    "A figure walking a black mirrored floor lined with glowing blue circuitry and light strips.")],
  ["look-contemplative-scifi", look(
    "contemplative sci-fi grade: overcast slate blue and fog-grey, soft diffused light, low saturation, quiet monumental stillness.",
    "Small figures dwarfed by an enormous smooth dark object hovering above a misty field.")],
  ["look-digital-nightscape", look(
    "digital nightscape grade: cold blue night against warm bokeh city lights, clean modern capture, deep retained shadow detail, rain on glass.",
    "Two people in the front seats of a parked car at night, the windscreen streaked with rain and out-of-focus city lights.")],
  ["look-cold-wilderness", look(
    "cold wilderness grade: icy blue-white natural light, desaturated earth tones, visible breath, raw available-light naturalism.",
    "A bearded man in furs crouched in deep snow among bare black trees, harsh survival atmosphere.")],

  // muted
  ["look-pastel-symmetrical", look(
    "pastel symmetrical grade: flat frontal composition, perfectly centred symmetry, candy palette of pink mint and butter yellow, even shadowless light, deadpan precision.",
    "A woman seated dead-centre on a patterned sofa in a symmetrical pastel room, potted plants mirrored on both sides.")],
  ["look-dreamlike-memories", look(
    "dreamlike memory grade, heavy: strong optical diffusion filter softening the entire image, badly faded washed-out desaturated colour, milky grey lifted blacks with no true black anywhere, a pronounced halation glow blooming from every highlight, and the outer edges of the frame melting into soft blur. It must look like a fading half-erased memory, not a clean photograph.",
    "A woman standing in a sunlit doorway, her outline dissolving into the overexposed light around her.")],
  ["look-controlled-tension", look(
    "controlled tension grade: dusty desaturated earth palette, hard directional daylight, deep contained shadows, coiled procedural stillness.",
    "Figures in tactical gear beside a vehicle on an empty desert road, waiting, dust in the air.")],
  ["look-desaturated-dread", look(
    "desaturated dread grade: near-monochrome grey-green palette, heavy crushed shadows, cold flat light, oppressive bleak atmosphere.",
    "A lone figure at the end of a bare concrete corridor lit by one weak overhead lamp.")],
  ["look-desaturated-trenches", look(
    "desaturated wartime grade: mud brown and gunmetal grey, overcast diffused light, ash and smoke in the air, grim documentary weight.",
    "Two soldiers in helmets sitting against an earth embankment at dusk, a burning horizon behind them.")],
  ["look-high-contrast-bw", look(
    "high-contrast monochrome grade: deep pooling blacks against stark whites, hard sculpted light, graphic shadow shapes. Entirely black and white, no colour whatsoever.",
    "A figure standing alone under a street lamp on an empty night street, long hard shadow across the ground.")],
  ["look-controlled-modern", look(
    "controlled modern grade: cool neutral palette, immaculate clean interior, precise soft window light, restrained saturation, composed austerity.",
    "A woman standing at a floor-to-ceiling window in a bare minimalist apartment, city beyond.")],
  ["look-soft-countryside", look(
    "soft countryside grade: gentle sage green and dove grey, overcast diffused daylight, low contrast, quiet pastoral naturalism.",
    "A woman in a long dress walking a grass path toward a distant stone farmhouse under a soft grey sky.")],
  ["look-muted-elegance", look(
    "muted elegance grade: refined desaturated taupe charcoal and slate, soft directional light, understated tailored sophistication.",
    "A well-dressed man reading a document by a tall window in a panelled room.")],
  ["look-documentary-natural", look(
    "documentary natural grade: honest unstyled available light, neutral true colour, moderate contrast, no stylisation, observational realism.",
    "People talking around a table in an ordinary busy café, caught mid-conversation.")],
  ["look-symmetrical-precision", look(
    "symmetrical precision grade: rigorous one-point perspective, perfectly centred subject, cool controlled palette, wide-angle geometric corridor, unsettling clinical order.",
    "A woman standing dead-centre at the far end of a long symmetrical corridor of pale institutional doors.")],

  // vivid
  ["look-saturated-apocalyptic", look(
    "saturated apocalyptic grade: blazing orange sand against electric teal sky, extreme colour separation, harsh crushed contrast, hyper-real intensity.",
    "A goggled driver gripping the wheel of a battered armoured truck tearing across a burning desert.")],
  ["look-overexposed-folk", look(
    "overexposed folk grade: blinding blown-out daylight, bleached whites, vivid saturated florals and grass, unnervingly bright and shadowless.",
    "A young woman in an embroidered white dress standing in a sunlit meadow of tall flowers, staring at the camera.")],
  ["look-saturated-pop-culture", look(
    "saturated pop grade: punchy retro colour, warm golden-hour sun, rich reds and turquoise, glossy period-nostalgic vibrance.",
    "Two people in the front seat of a vintage convertible on a sunlit boulevard, wind in their hair.")],
];

// Lighting tiles. B2 keys are prefixed "light-".
//
// Unlike the other sets, every Lighting tile uses the SAME still-life setup.
// The lighting pattern is the only variable, so the user reads the difference
// between Rembrandt and Loop instantly instead of being distracted by a new
// scene each time. SUBJECT must stay byte-identical across all 18.
//
// The lighting instruction is stated FIRST and in terms of the shadows that must
// be visible in the result — stating it after the scene made the model default to
// generic soft product lighting and ignore the pattern entirely.
const SUBJECT =
  "The subject is always the same: one tall matte cream ceramic vase holding a few dried stems, " +
  "a short round dark clay bowl beside it, and a small pale stone block behind them, arranged on a " +
  "pale plaster ledge against a plain warm-grey plaster wall. Same objects, same positions, same " +
  "camera angle, same 50mm framing.";

const light = (setup) =>
  `Photorealistic still-life photograph whose entire purpose is to demonstrate ONE lighting pattern. ${setup} ${SUBJECT} Neutral colour, fine grain, nothing added or removed. No people, no text, no watermark, no logo, no border frame.`;

SETS.lights = [
  // portrait patterns
  ["light-rembrandt", light(
    "REMBRANDT LIGHTING. One hard key light, high and 45 degrees to the LEFT. The result must clearly show: the left face of the vase brightly lit, the right face in deep shadow, and a single small bright TRIANGLE of light isolated on that shadowed right side, with a long hard shadow thrown right across the ledge and up the wall.")],
  ["light-butterfly", light(
    "BUTTERFLY LIGHTING. One key light directly IN FRONT and high ABOVE, on the camera axis. The result must clearly show: both sides of every object lit equally with no side shadow at all, and a small symmetrical shadow directly UNDERNEATH each object, tucked tight beneath its base.")],
  ["light-loop", light(
    "LOOP LIGHTING. One key light just off the camera axis to the left and slightly above. The result must clearly show: the objects mostly lit, with one small distinct comma-shaped loop of shadow cast down and to the lower right of the vase, and that shadow must NOT connect to the shadow side of the object.")],
  ["light-split", light(
    "SPLIT LIGHTING, extreme. One hard key light at a full 90 degrees to the LEFT, level with the objects, and absolutely no fill on the right. The result must clearly show: the entire LEFT half of every object brightly lit and the entire RIGHT half swallowed in complete blackness, divided by a hard vertical line running straight down the centre of the vase. Half lit, half black.")],
  ["light-broad", light(
    "BROAD LIGHTING. The objects are turned slightly to the RIGHT and the key light comes from the RIGHT, on the same side the objects face. The result must clearly show: the wide plane facing the camera fully lit and open, with the shadow pushed away behind the objects and barely visible to the lens.")],
  ["light-short", light(
    "SHORT LIGHTING, extreme. The key light is far to the LEFT and slightly BEHIND the objects, with no fill on the camera side at all. The result must clearly show: the whole broad front of the vase that faces the camera sitting in clear shadow, and only a narrow sliver along its far LEFT edge catching the light. The camera sees mostly the shadow side. Strong sculpting falloff, noticeably darker overall than a front-lit shot.")],
  ["light-high-key", light(
    "HIGH KEY LIGHTING. Several large soft sources flooding the scene. The result must clearly show: an almost pure white luminous wall, no visible shadows anywhere on the ledge or wall, very low contrast, bright airy and clean.")],
  ["light-low-key", light(
    "LOW KEY LIGHTING. One small hard source in an otherwise pitch dark room. The result must clearly show: the frame overwhelmingly BLACK, the wall invisible in darkness, and only a narrow lit edge and one small lit plane of the vase picked out of the dark. Extremely high contrast.")],
  ["light-stage", light(
    "STAGE SPOTLIGHT. One tight hard theatrical spotlight aimed down at the objects. The result must clearly show: a bright circular pool of light on the ledge with a clearly defined hard edge where it stops, and everything outside that circle falling to black.")],

  // natural light
  ["light-golden-hour", light(
    "GOLDEN HOUR SUNLIGHT. Low warm sun raking in almost horizontally from the LEFT through an unseen window. The result must clearly show: long amber shadows stretching far across the ledge to the right, glowing warm highlights on the vase rim, and a warm golden cast over the whole wall.")],
  ["light-blue-hour", light(
    "BLUE HOUR TWILIGHT. Deep even blue ambient light after sunset, no direct sun anywhere. The result must clearly show: the whole scene rendered in cool blue shadowless light with no warm key at all, and one small warm lamp glow just beginning to register at the edge of frame.")],
  ["light-hard-sunlight", light(
    "HARD MIDDAY SUNLIGHT. Direct sun from a clear sky through a window. The result must clearly show: crisp razor-edged black shadows with sharp outlines projected onto the wall and ledge, blown-out specular highlights on the ceramic, and very high contrast.")],
  ["light-candlelight", light(
    "CANDLELIGHT. A single small lit candle standing on the ledge is the ONLY light source in the frame. The result must clearly show: a deep amber pool of light around the flame falling off very rapidly into darkness, warm glowing object edges, and the wall almost black beyond the reach of the flame.")],
  ["light-moonlight", light(
    "MOONLIGHT. Cool blue-silver light from a single high distant source through a window. The result must clearly show: a low overall exposure with everything rendered in blue-silver, a pale window shape of light on the wall, and shadow detail still faintly readable. No warm light anywhere.")],

  // dramatic / shaped
  ["light-rim", light(
    "RIM LIGHTING, extreme. A dark unlit room with one hard bright source hidden directly BEHIND the objects and to one side, and absolutely no front fill. The result must clearly show: a thin brilliant glowing line of light tracing the outer edge of the vase, the bowl and the stone — a bright contour separating each object from near-black surroundings — while their front surfaces remain dark and almost featureless. The wall behind must stay dark; only the edges glow.")],
  ["light-backlight", light(
    "BACKLIGHTING. The main source is directly BEHIND the objects, aimed toward the lens. The result must clearly show: glowing halation blooming around every object edge, visible lens flare and haze washing across the frame, and the fronts of the objects softly underexposed.")],
  ["light-volumetric", light(
    "VOLUMETRIC LIGHTING. Hard light through a window into hazy dusty air. The result must clearly show: distinct visible SHAFTS of light — god rays — cutting diagonally through the air above and around the objects, the beams themselves clearly solid and tangible in the atmosphere.")],
  ["light-silhouette", light(
    "SILHOUETTE. A brightly lit wall directly behind and absolutely ZERO light on the front of the objects. The result must clearly show: the vase, bowl and stone rendered as completely SOLID BLACK shapes with no surface detail, no colour and no texture at all, read purely as outlines against the bright glowing background.")],
];

// Motion Blur tiles. B2 keys are prefixed "blur-".
//
// Like the Lighting set, every tile uses the SAME subject so the blur treatment
// is the only variable and the user can compare Subtle against Heavy directly.
// A dancer mid-turn is used because motion blur only reads on something moving.
//
// The blur instruction is stated FIRST and in terms of what must be visible —
// stating it after the scene made the model default to a clean sharp frame.
const DANCER =
  "The subject is always the same and must not vary between images: a Middle Eastern woman with dark " +
  "hair pulled into a low bun, wearing a black leotard and a deep navy-blue skirt, captured mid-turn in " +
  "a sunlit wooden-floored rehearsal studio with tall arched windows and a barre along the mirrored " +
  "wall, her skirt flaring outward with the spin. Same dancer, same hair, same costume, same studio, " +
  "same camera position and same framing every time.";

const blur = (treatment) =>
  `Photorealistic photograph whose entire purpose is to demonstrate ONE motion-blur treatment. ${treatment} ${DANCER} Natural light, fine grain, photoreal. No text, no watermark, no logo, no border frame.`;

SETS.blurs = [
  // amount
  ["blur-none", blur(
    "NO MOTION BLUR AT ALL. A very fast shutter freezing the instant completely. The result must clearly show: every edge razor sharp — the dancer's hands, feet, hair and the flying hem of the skirt all frozen crisp with individual folds and strands resolved. Absolutely no smearing or trailing anywhere.")],
  ["blur-subtle-cinematic", blur(
    "SUBTLE CINEMATIC MOTION BLUR. A natural 180-degree shutter. The result must clearly show: the dancer's body and face still sharp and fully readable, with only the very fastest extremities — fingertips and the outer edge of the skirt — softening into a slight blur. Restrained and filmic.")],
  ["blur-moderate-cinematic", blur(
    "MODERATE CINEMATIC MOTION BLUR. A noticeably slower shutter. The result must clearly show: the arms, legs and skirt smeared into clear directional streaks that follow the arc of the turn, while the head and torso stay identifiable. Obvious motion, but the figure still legible.")],
  ["blur-heavy-cinematic", blur(
    "HEAVY MOTION BLUR, extreme. A long shutter during fast movement. The result must clearly show: the dancer dissolved into sweeping abstract smears of colour and light, the body barely holding its shape, motion completely dominating the frame. Almost a painting of movement rather than a figure.")],

  // technique
  ["blur-subject", blur(
    "SUBJECT MOTION BLUR ONLY. The camera is locked off on a tripod, perfectly still. The result must clearly show: the studio floor, windows, barre and mirrored wall all rendered razor sharp with crisp detail, while the DANCER ALONE smears into motion across the frame. Sharp background, blurred subject — the contrast between them must be unmistakable.")],
  ["blur-camera", blur(
    "CAMERA MOTION BLUR ONLY — a panning shot. The camera swings to follow the dancer at exactly her speed. The result must clearly show: the DANCER SHARP and clearly readable, while the entire background — windows, barre, mirrored wall — streaks into strong horizontal motion lines. Sharp subject, blurred background — the opposite of a locked-off shot.")],
  ["blur-rack-focus", blur(
    "RACK FOCUS PULL, caught mid-transition. Very shallow depth of field. The result must clearly show: a large out-of-focus foreground element melting into soft creamy bokeh across the near part of the frame, while the dancer emerges sharp in the plane behind it. A clear split between a heavily defocused near plane and a sharp far plane.")],
  ["blur-zoom", blur(
    "ZOOM BLUR / radial burst, extreme. The zoom lens is racked hard from wide to telephoto DURING a long exposure. The result must clearly show a RADIAL STARBURST pattern: every window, barre, floorboard and mirror stretched into long straight streaks that all point directly away from the exact centre of the frame, like speed lines exploding outward toward all four corners. Only the very centre of the image, on the dancer, stays sharp; everything gets progressively more stretched the further it sits from that centre point. This must look like a radial zoom burst, NOT like ordinary sideways motion blur.")],
  ["blur-light-trails", blur(
    "LONG EXPOSURE LIGHT TRAILS. A multi-second exposure in a darkened studio, the dancer holding small glowing lights while she moves. The result must clearly show: continuous glowing ribbons of coloured light painted through the dark air tracing the whole path of the movement, with the static parts of the room still sharp. Dark frame, luminous flowing light ribbons.")],
];





async function objectExists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

function extractImages(node, out = []) {
  if (!node || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    node.forEach((n) => extractImages(n, out));
    return out;
  }
  const image = node.output_image ?? node.outputImage ?? node.image;
  const data = image?.data ?? image?.b64_json ?? node.data;
  if (typeof data === "string" && data.length > 1000) out.push(data);
  for (const k of ["output", "content", "parts", "steps", "response", "result", "data", "candidates"]) {
    extractImages(node[k], out);
  }
  return out;
}

async function generate(prompt) {
  const body = {
    model: MODEL,
    input: [{ type: "text", text: `Generate a detailed high quality visual image depicting: ${prompt}\n\nOutput requirements: aspect ratio 4:3, target quality 2K.` }],
    response_format: { type: "image", mime_type: "image/jpeg", aspect_ratio: "4:3", image_size: "2K" },
    generation_config: { image_config: { aspect_ratio: "4:3" } },
  };
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: {
      "x-goog-api-key": KEY,
      "Content-Type": "application/json",
      "Api-Revision": "2026-05-20",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180_000),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.error?.message || `Google image generation failed (${res.status})`);
  }
  const images = extractImages(json);
  if (!images.length) throw new Error("Gemini returned no image data");
  return Buffer.from(images[0], "base64");
}

async function run() {
  mkdirSync(OUT_DIR, { recursive: true });
  const set = SETS[SET];
  if (!set) throw new Error(`Unknown --set=${SET}. Available: ${Object.keys(SETS).join(", ")}`);
  const targets = set.filter(([id]) => !ONLY || ONLY.has(id));
  console.log(`Generating ${targets.length} "${SET}" thumbnails with ${MODEL} → b2://${BUCKET}/${FOLDER}/`);

  const results = {};
  let ok = 0, fail = 0;
  const queue = [...targets];
  const CONCURRENCY = 4;

  async function worker() {
    while (queue.length) {
      const [id, prompt] = queue.shift();
      const key = `${FOLDER}/${id}.webp`;
      try {
        if (!FORCE && (await objectExists(key))) {
          console.log(`· ${id} — already on B2, skipped (use --force to regenerate)`);
          results[id] = "skipped";
          continue;
        }
        let jpeg = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            jpeg = await generate(prompt);
            break;
          } catch (e) {
            if (attempt === 3) throw e;
            console.log(`  ${id} attempt ${attempt} failed (${e.message}), retrying…`);
            await new Promise((r) => setTimeout(r, 2500 * attempt));
          }
        }
        const webp = await sharp(jpeg)
          .resize(1024, 768, { fit: "cover", position: "centre" })
          .webp({ quality: 82 })
          .toBuffer();
        writeFileSync(resolve(OUT_DIR, `${id}.webp`), webp);
        await s3.send(new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: webp,
          ContentType: "image/webp",
          CacheControl: "public, max-age=31536000, immutable",
        }));
        ok++;
        results[id] = "uploaded";
        console.log(`✓ ${id} (${(webp.length / 1024).toFixed(0)}KB) → ${key}`);
      } catch (e) {
        fail++;
        results[id] = `failed: ${e.message}`;
        console.error(`✗ ${id}: ${e.message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  writeFileSync(resolve(OUT_DIR, "_report.json"), JSON.stringify(results, null, 2));
  console.log(`\nDone. uploaded=${ok} failed=${fail}\nLocal copies: ${OUT_DIR}`);
  if (fail) process.exitCode = 1;
}

run().catch((e) => { console.error(e); process.exit(1); });
