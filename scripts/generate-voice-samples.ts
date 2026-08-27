/**
 * Generates one MP3 per available Arabic voice so you can compare and pick the best.
 * Files are written to scratchpad/voice-samples/ with filename = voice name.
 *
 * Run with:
 *   npx tsx scripts/generate-voice-samples.ts
 */

import fs from "node:fs";
import path from "node:path";

function loadEnv(file: string) {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), file), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {}
}

loadEnv(".env.local");
loadEnv(".env");

import { synthesizeSpeech, listArabicVoices } from "@/lib/voice-agent/providers/google-tts";

const SAMPLE_TEXT =
  "هلا بيك، آني سارة، مساعدة ذكاء اصطناعي من ستوديو سعد. شلونك اليوم؟ اتصلت بيك اليوم علمود احجزلك طاولة بالمطعم.";

const OUT_DIR = path.join(process.cwd(), "scratchpad", "voice-samples");

function log(section: string, message: string) {
  const stamp = new Date().toISOString().slice(11, 19);
  console.log(`[${stamp}] [${section}] ${message}`);
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const voices = await listArabicVoices();
  log("VOICES", `Found ${voices.length} Arabic voices. Generating samples…`);

  const female = voices.filter((v) => v.ssmlGender === "FEMALE");
  const male = voices.filter((v) => v.ssmlGender === "MALE");
  log("VOICES", `  Female: ${female.length} | Male: ${male.length}`);

  const manifest: Array<{ voice: string; gender: string; file: string; group: string }> = [];

  for (const voice of voices) {
    const name = voice.name;
    if (!name) continue;
    const gender = String(voice.ssmlGender ?? "unknown").toLowerCase();
    const group = name.includes("Chirp3-HD")
      ? "chirp3-hd"
      : name.includes("Neural2")
      ? "neural2"
      : name.includes("Wavenet")
      ? "wavenet"
      : name.includes("Standard")
      ? "standard"
      : "other";

    const fileName = `${gender}_${group}_${name}.mp3`;
    const outPath = path.join(OUT_DIR, fileName);
    try {
      const result = await synthesizeSpeech({
        text: SAMPLE_TEXT,
        voiceName: name,
        audioEncoding: "MP3",
      });
      fs.writeFileSync(outPath, result.audioBuffer);
      log("OK", `${name.padEnd(30)} (${gender.padEnd(6)}, ${group.padEnd(10)}) → ${result.audioBuffer.length} bytes`);
      manifest.push({ voice: name, gender, group, file: fileName });
    } catch (err: any) {
      log("SKIP", `${name} — ${err?.message ?? err}`);
    }
  }

  const manifestPath = path.join(OUT_DIR, "index.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  log("DONE", `Wrote ${manifest.length} samples to ${OUT_DIR}`);
  log("DONE", `Manifest: ${manifestPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
