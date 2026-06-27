import * as fs from "fs";
import * as path from "path";

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

async function measure(url: string, name: string): Promise<number> {
  const start = performance.now();
  try {
    const res = await fetch(url, { headers: { Range: "bytes=0-1023" } }); // fetch first 1KB to test time-to-first-byte (TTFB)
    await res.arrayBuffer();
    const duration = performance.now() - start;
    console.log(`⏱️  [${name}] Status: ${res.status} | Size: ${res.headers.get("content-length")} bytes | Time: ${duration.toFixed(1)} ms`);
    return duration;
  } catch (e) {
    console.error(`❌ [${name}] Failed:`, e);
    return -1;
  }
}

async function main() {
  console.log("📊 Media Delivery Latency Benchmark");
  console.log("===================================");

  const testFile = "images/test-diag-1782520231908.png"; // Let's use a known key or upload a temp file if needed.
  
  // Create a temp file to ensure it exists on B2
  const tinyPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );
  
  console.log("Uploading test file to B2 for benchmark...");
  let b2Url = "";
  try {
    b2Url = await defaultProvider.upload({
      bucket: "",
      path: testFile,
      body: tinyPng,
      contentType: "image/png"
    });
    console.log("B2 Direct URL:", b2Url);
  } catch (e) {
    console.error("B2 Upload failed! Cannot run benchmark.", e);
    return;
  }

  // Measure Direct B2 Latency (multiple times for average)
  console.log("\nMeasuring Backblaze B2 Direct Latency (EU Region)...");
  const b2Times = [];
  for (let i = 0; i < 3; i++) {
    const t = await measure(b2Url, `B2 Direct Run ${i + 1}`);
    if (t > 0) b2Times.push(t);
  }
  const b2Avg = b2Times.reduce((a, b) => a + b, 0) / b2Times.length;
  console.log(`➡️  Average B2 Latency: ${b2Avg.toFixed(1)} ms`);

  // To measure `/api/media` latency, we can boot a mini server or fetch from the production URL
  // Let's test the production site URL if B2 file is synced, or test local dev server.
  const prodSiteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://saadstudio.app";
  const proxyUrl = `${prodSiteUrl}/api/media/${testFile}`;
  console.log(`\nMeasuring Proxy Latency (${proxyUrl})...`);
  const proxyTimes = [];
  for (let i = 0; i < 3; i++) {
    const t = await measure(proxyUrl, `Proxy Run ${i + 1}`);
    if (t > 0) proxyTimes.push(t);
  }
  if (proxyTimes.length > 0) {
    const proxyAvg = proxyTimes.reduce((a, b) => a + b, 0) / proxyTimes.length;
    console.log(`➡️  Average Proxy Latency: ${proxyAvg.toFixed(1)} ms`);
    console.log(`➡️  Proxy Overhead: ${(proxyAvg - b2Avg).toFixed(1)} ms (${((proxyAvg / b2Avg) * 100 - 100).toFixed(0)}% slower)`);
  } else {
    console.log("❌ Production proxy could not be benchmarked (is it deployed with the B2 keys yet?)");
  }
}

main();
