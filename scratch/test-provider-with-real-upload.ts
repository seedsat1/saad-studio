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

import { defaultProvider } from "../lib/storage";

const BYTEPLUS_ARK_BASE = (process.env.BYTEPLUS_ARK_BASE_URL || "https://ark.ap-southeast.bytepluses.com/api/v3").replace(/\/+$/, "");
const BYTEPLUS_CONTENT_TASKS_URL = `${BYTEPLUS_ARK_BASE}/contents/generations/tasks`;

const key = process.env.ARK_API_KEY || process.env.BYTEPLUS_ARK_API_KEY || process.env.BYTEPLUS_API_KEY;
const model = process.env.BYTEPLUS_MODEL_MINI || "dreamina-seedance-2-0-mini-260615";

async function diag() {
  console.log("🔑 API Key configured:", key ? `${key.slice(0, 10)}...` : "NONE");
  console.log("🤖 Model being tested:", model);

  if (!key) {
    console.error("❌ No API key found in env!");
    return;
  }

  // 1. Create a tiny 1x1 black PNG buffer
  const tinyPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );

  const testPath = `images/test-diag-${Date.now()}.png`;

  console.log("\n1️⃣ Uploading test image to B2...");
  let publicUrl = "";
  try {
    publicUrl = await defaultProvider.upload({
      bucket: "",
      path: testPath,
      body: tinyPng,
      contentType: "image/png"
    });
    console.log("✅ Uploaded successfully! Public URL:", publicUrl);
  } catch (e) {
    console.error("❌ B2 Upload failed:", e);
    return;
  }

  // 2. Verify we can download it locally
  console.log("\n2️⃣ Checking accessibility of URL from our side...");
  try {
    const checkRes = await fetch(publicUrl);
    console.log("Accessibility check status:", checkRes.status, checkRes.statusText);
    if (!checkRes.ok) {
      console.error("❌ Public URL is not publicly accessible! Status:", checkRes.status);
      return;
    }
  } catch (e) {
    console.error("❌ Accessibility check failed:", e);
    return;
  }

  // 3. Send payload to BytePlus ModelArk
  console.log("\n3️⃣ Submitting text + reference image to BytePlus...");
  const payload = {
    model: model,
    content: [
      {
        type: "text",
        text: "A cup of fruit tea commercial, cinematic style, simple background"
      },
      {
        type: "image_url",
        image_url: {
          url: publicUrl
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
      body: JSON.stringify(payload)
    });
    console.log("BytePlus API Response Status:", res.status, res.statusText);
    const json = await res.json().catch(() => null);
    console.log("BytePlus API Response:", JSON.stringify(json, null, 2));
  } catch (e) {
    console.error("❌ BytePlus submission failed:", e);
  }
}

diag();
