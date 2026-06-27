import * as fs from "fs";
import * as path from "path";

async function measure(url: string, name: string): Promise<number> {
  const start = performance.now();
  try {
    const res = await fetch(url, { headers: { Range: "bytes=0-1023" } }); // fetch first 1KB for TTFB
    const arrayBuffer = await res.arrayBuffer();
    const duration = performance.now() - start;
    console.log(`⏱️  [${name}] Status: ${res.status} | Received: ${arrayBuffer.byteLength} bytes | Time: ${duration.toFixed(1)} ms`);
    return duration;
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error(`❌ [${name}] Failed: ${errMsg}`);
    return -1;
  }
}

async function main() {
  console.log("📊 Media Delivery Latency Benchmark (Live File)");
  console.log("=================================================");

  const b2Url = "https://saadstudio-storage.s3.eu-central-003.backblazeb2.com/videos/user_3CMgl0E1u3OcgATvBIZR3rByAXo/cmqvl0bjc000iyvp6pjy5gujj.mp4";
  const proxyUrl = "https://www.saadstudio.app/api/media/videos/user_3CMgl0E1u3OcgATvBIZR3rByAXo/cmqvl0bjc000iyvp6pjy5gujj.mp4";

  console.log("\nMeasuring Backblaze B2 Direct Latency (EU Region)...");
  const b2Times = [];
  for (let i = 0; i < 3; i++) {
    const t = await measure(b2Url, `B2 Direct Run ${i + 1}`);
    if (t > 0) b2Times.push(t);
  }
  const b2Avg = b2Times.length > 0 ? b2Times.reduce((a, b) => a + b, 0) / b2Times.length : -1;
  if (b2Avg > 0) {
    console.log(`➡️  Average B2 Latency: ${b2Avg.toFixed(1)} ms`);
  }

  console.log("\nMeasuring Proxy Latency (VPS Nginx -> Node Proxy -> B2)...");
  const proxyTimes = [];
  for (let i = 0; i < 3; i++) {
    const t = await measure(proxyUrl, `Proxy Run ${i + 1}`);
    if (t > 0) proxyTimes.push(t);
  }
  const proxyAvg = proxyTimes.length > 0 ? proxyTimes.reduce((a, b) => a + b, 0) / proxyTimes.length : -1;
  if (proxyAvg > 0) {
    console.log(`➡️  Average Proxy Latency: ${proxyAvg.toFixed(1)} ms`);
  }

  if (b2Avg > 0 && proxyAvg > 0) {
    console.log(`\n➡️  Proxy Overhead: ${(proxyAvg - b2Avg).toFixed(1)} ms (${((proxyAvg / b2Avg) * 100 - 100).toFixed(0)}% slower)`);
  }
}

main();
