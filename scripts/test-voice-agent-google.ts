/**
 * Standalone smoke test for the Voice Agent Google providers.
 * Verifies STT, TTS, and Gemini brain are wired correctly with your credentials.
 *
 * Run with:
 *   npx tsx scripts/test-voice-agent-google.ts
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
import { transcribeAudioBuffer } from "@/lib/voice-agent/providers/google-stt";
import { runBrainTurn, buildDefaultSystemPrompt } from "@/lib/voice-agent/providers/gemini-brain";

const SCRATCH_DIR = path.join(process.cwd(), "scratchpad");

function ensureScratch() {
  if (!fs.existsSync(SCRATCH_DIR)) fs.mkdirSync(SCRATCH_DIR, { recursive: true });
}

function log(section: string, message: string) {
  const stamp = new Date().toISOString().slice(11, 19);
  console.log(`[${stamp}] [${section}] ${message}`);
}

async function testTts(): Promise<Buffer> {
  log("TTS", "Generating Sara intro in Iraqi Arabic (Chirp3-HD-Aoede)…");
  const introText = "هلا بيك، آني سارة، مساعدة ذكاء اصطناعي من ستوديو سعد. شلونك اليوم؟";
  const result = await synthesizeSpeech({
    text: introText,
    audioEncoding: "MP3",
  });
  ensureScratch();
  const outPath = path.join(SCRATCH_DIR, "sara-intro-iraqi.mp3");
  fs.writeFileSync(outPath, result.audioBuffer);
  log("TTS", `Voice: ${result.voiceName}`);
  log("TTS", `Text : "${introText}"`);
  log("TTS", `Saved ${result.audioBuffer.length} bytes to ${outPath}`);
  return result.audioBuffer;
}

async function testVoicesList() {
  log("VOICES", "Listing available Arabic voices…");
  const voices = await listArabicVoices();
  voices.slice(0, 6).forEach((voice) => {
    log("VOICES", `- ${voice.name}  (${voice.ssmlGender ?? "unknown"})`);
  });
  log("VOICES", `Total: ${voices.length}`);
}

async function testStt() {
  log("STT", "Round-tripping TTS→STT with LINEAR16 sample…");
  const tts = await synthesizeSpeech({
    text: "اختبار التعرف على الكلام العربي",
    voiceName: "ar-XA-Wavenet-C",
    audioEncoding: "LINEAR16",
    sampleRateHertz: 16000,
  });
  const result = await transcribeAudioBuffer({
    audioBase64: tts.audioBase64,
    encoding: "LINEAR16",
    sampleRateHertz: 16000,
    languageCode: "ar-SA",
  });
  log("STT", `Transcript: "${result.transcript}" (conf=${result.confidence.toFixed(2)})`);
}

async function testBrain() {
  log("BRAIN", "Asking Sara to answer in Iraqi dialect…");
  const systemPrompt = buildDefaultSystemPrompt({
    agentName: "سارة",
    companyName: "Saad Studio",
    goal: "حجز طاولة لشخصين في مطعم سمك ببغداد الساعة 9 بالليل.",
    dialect: "iraqi",
    tone: "ودودة ودافئة ومختصرة",
  });

  const turns = [
    { role: "user" as const, text: "هلو، مطعم دجلة، تفضل." },
    { role: "user" as const, text: "زين، شكد شخص راح تجون؟" },
    { role: "user" as const, text: "خلاص محجوز، بس ما نسمح بالتدخين جوه المطعم." },
  ];

  const history: { role: "user" | "model"; text: string }[] = [];
  for (const turn of turns) {
    const reply = await runBrainTurn({
      systemPrompt,
      history,
      latestUserText: turn.text,
    });
    log("BRAIN", `👤 المطعم: ${turn.text}`);
    log("BRAIN", `🤖 سارة  : ${reply.text}`);
    if (reply.toolCalls.length) {
      log("BRAIN", `   ↳ tools: ${reply.toolCalls.map((t) => t.name).join(", ")}`);
    }
    history.push({ role: "user", text: turn.text });
    history.push({ role: "model", text: reply.text });
    if (reply.shouldEndCall) break;
  }
}

async function main() {
  const missing: string[] = [];
  if (!process.env.GOOGLE_API_KEY) missing.push("GOOGLE_API_KEY");
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) missing.push("GOOGLE_APPLICATION_CREDENTIALS");
  if (!process.env.GOOGLE_CLOUD_PROJECT) missing.push("GOOGLE_CLOUD_PROJECT");
  if (missing.length) {
    console.error(`Missing env vars: ${missing.join(", ")}`);
    process.exit(1);
  }

  log("INIT", `Project: ${process.env.GOOGLE_CLOUD_PROJECT}`);
  log("INIT", `Credentials: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);

  try {
    await testVoicesList();
  } catch (err) {
    console.error("[VOICES] FAILED:", err);
  }

  try {
    await testTts();
  } catch (err) {
    console.error("[TTS] FAILED:", err);
  }

  try {
    await testStt();
  } catch (err) {
    console.error("[STT] FAILED:", err);
  }

  try {
    await testBrain();
  } catch (err) {
    console.error("[BRAIN] FAILED:", err);
  }

  log("DONE", "Smoke test finished.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
