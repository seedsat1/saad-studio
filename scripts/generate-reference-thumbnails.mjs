// Generate Reference Studio thumbnails with Google Gemini image models and
// upload them to Backblaze B2 at reference-thumbnails/<key>.webp
//
// Run:  node scripts/generate-reference-thumbnails.mjs --set=shots [--force] [--only=id1,id2]
//
// Sets:  styles  → the 18 added HOOK_STYLES tiles
//        shots   → the 24 HOOK_SHOT_TYPES tiles (keys prefixed "shot-")
//        films   → the 18 HOOK_FILM_STOCKS tiles (keys prefixed "film-")

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
