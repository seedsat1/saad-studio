import * as fs from "fs";
import * as path from "path";

// Simple manual env parser to avoid npm dependencies
function loadEnv() {
  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    const filePath = path.join(__dirname, "..", file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
          const firstEq = trimmed.indexOf("=");
          const key = trimmed.slice(0, firstEq).trim();
          let val = trimmed.slice(firstEq + 1).trim();
          // strip quotes if any
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadEnv();

const BYTEPLUS_ARK_BASE = (process.env.BYTEPLUS_ARK_BASE_URL || "https://ark.ap-southeast.bytepluses.com/api/v3").replace(/\/+$/, "");
const BYTEPLUS_CONTENT_TASKS_URL = `${BYTEPLUS_ARK_BASE}/contents/generations/tasks`;

const key = process.env.ARK_API_KEY || process.env.BYTEPLUS_ARK_API_KEY || process.env.BYTEPLUS_API_KEY;
const model = process.env.BYTEPLUS_MODEL_MINI || "dreamina-seedance-2-0-mini-260615";

async function test() {
  console.log("🔑 API Key configured:", key ? `${key.slice(0, 10)}...` : "NONE");
  console.log("🤖 Model being tested:", model);
  console.log("🔗 URL:", BYTEPLUS_CONTENT_TASKS_URL);

  if (!key) {
    console.error("❌ No API key found in env!");
    return;
  }

  // We will test with a sample public B2 image url
  // Note: we can use a small public placeholder image or one of the user's B2 urls if they have one.
  const imageUrl = "https://f003.backblazeb2.com/file/saadstudio-storage/images/test-image.jpg"; // Or placeholder if needed

  console.log("\n1️⃣ Testing Text-Only payload...");
  const textPayload = {
    model: model,
    content: [
      {
        type: "text",
        text: "A beautiful cinematic fruit tea commercial cup, highly detailed"
      }
    ],
    ratio: "16:9",
    duration: 5,
    watermark: false
  };

  try {
    const res = await fetch(BYTEPLUS_CONTENT_TASKS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify(textPayload)
    });
    console.log("Text-Only Status:", res.status, res.statusText);
    const json = await res.json().catch(() => null);
    console.log("Text-Only Response:", JSON.stringify(json, null, 2));
  } catch (e) {
    console.error("Text-Only Error:", e);
  }

  console.log("\n2️⃣ Testing Text + Image payload...");
  const imagePayload = {
    model: model,
    content: [
      {
        type: "text",
        text: "A beautiful cinematic fruit tea commercial cup, highly detailed"
      },
      {
        type: "image_url",
        image_url: {
          url: imageUrl
        },
        role: "reference_image"
      }
    ],
    ratio: "16:9",
    duration: 5,
    watermark: false
  };

  try {
    const res = await fetch(BYTEPLUS_CONTENT_TASKS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify(imagePayload)
    });
    console.log("Text + Image Status:", res.status, res.statusText);
    const json = await res.json().catch(() => null);
    console.log("Text + Image Response:", JSON.stringify(json, null, 2));
  } catch (e) {
    console.error("Text + Image Error:", e);
  }
}

test();
