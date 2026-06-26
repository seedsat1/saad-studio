// scripts/find-byteplus-mini-model.cjs

const fs = require("fs");
const path = require("path");

function loadEnvFile(file) {
  const full = path.resolve(process.cwd(), file);
  if (!fs.existsSync(full)) return;

  const lines = fs.readFileSync(full, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;

    const key = match[1];
    let value = match[2].trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const API_KEY =
  process.env.ARK_API_KEY ||
  process.env.BYTEPLUS_ARK_API_KEY ||
  process.env.BYTEPLUS_API_KEY;

const BASE = (
  process.env.BYTEPLUS_ARK_BASE_URL ||
  process.env.BYTEPLUS_BASE_URL ||
  "https://ark.ap-southeast.bytepluses.com/api/v3"
).replace(/\/+$/, "");

const TASKS_URL = `${BASE}/contents/generations/tasks`;

const candidates = [
  "dreamina-seedance-2-0-mini-260428",
  "dreamina-seedance-2-0-mini",
  "seed-2-0-mini-260428",
  "seedance-2-0-mini-260428",
  "seedance-mini-2-0-260428",
  "seedance-mini-2-0-250528",
  "dreamina-seedance-mini-2-0-260428",
  "dreamina-seedance-mini-2-0",
];

async function main() {
  if (!API_KEY) {
    console.error("❌ Missing API key. Set ARK_API_KEY or BYTEPLUS_API_KEY in .env.local");
    process.exit(1);
  }

  console.log("BytePlus Mini model probe");
  console.log("Endpoint:", TASKS_URL);
  console.log("Candidates:", candidates.length);
  console.log("--------------------------------------------------");

  for (const model of candidates) {
    const payload = {
      model,
      content: [
        {
          type: "text",
          text: "A simple cinematic shot of a red apple on a wooden table, natural light.",
        },
      ],
      ratio: "16:9",
      resolution: "480p",
      duration: 4,
      generate_audio: false,
      watermark: true,
    };

    console.log(`\nTesting model: ${model}`);

    const res = await fetch(TASKS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();

    let json = null;
    try {
      json = JSON.parse(text);
    } catch {}

    console.log("Status:", res.status);
    console.log("Body:", text.slice(0, 1000));

    const taskId =
      json?.id ||
      json?.task_id ||
      json?.taskId ||
      json?.data?.id ||
      json?.data?.task_id ||
      json?.data?.taskId;

    if (res.ok && taskId) {
      console.log("\n✅ FOUND WORKING MINI MODEL:");
      console.log(model);
      console.log("Task ID:", taskId);
      console.log("\nNow set this in .env.local and production:");
      console.log(`BYTEPLUS_MODEL_MINI="${model}"`);
      console.log("\nStop here. Do not continue testing more models.");
      return;
    }

    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log("\n❌ No candidate worked.");
  console.log("This means the Mini model ID is different or the account/API key is not enabled for Mini invocation.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});