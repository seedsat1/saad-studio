import { getFallbackUrls } from "../lib/utils";

console.log("Running fallback resolver tests...");

const videoUrl = "https://pub-3e0355a14eda4ec78c6e81b217a9a399.r2.dev/videos/user_abc/video123.mp4";
const imageUrl = "https://pub-3e0355a14eda4ec78c6e81b217a9a399.r2.dev/images/user_abc/image123.png";

console.log("\n--- TEST 1: Video URL (Preview context, isDownload = false) ---");
const videoPreview = getFallbackUrls(videoUrl, false);
console.log("Input:", videoUrl);
console.log("Result (expected: 2 R2 domains only, no Vercel proxy):");
console.log(JSON.stringify(videoPreview, null, 2));

if (videoPreview.length === 2 && !videoPreview.some(u => u.includes("/api/media"))) {
  console.log("✓ TEST 1 SUCCESS");
} else {
  console.error("✗ TEST 1 FAILED");
}

console.log("\n--- TEST 2: Video URL (Download context, isDownload = true) ---");
const videoDownload = getFallbackUrls(videoUrl, true);
console.log("Input:", videoUrl);
console.log("Result (expected: 3 domains including Vercel proxy):");
console.log(JSON.stringify(videoDownload, null, 2));

if (videoDownload.length === 3 && videoDownload.some(u => u.includes("/api/media"))) {
  console.log("✓ TEST 2 SUCCESS");
} else {
  console.error("✗ TEST 2 FAILED");
}

console.log("\n--- TEST 3: Image URL (Preview context, isDownload = false) ---");
const imagePreview = getFallbackUrls(imageUrl, false);
console.log("Input:", imageUrl);
console.log("Result (expected: 3 domains including Vercel proxy):");
console.log(JSON.stringify(imagePreview, null, 2));

if (imagePreview.length === 3 && imagePreview.some(u => u.includes("/api/media"))) {
  console.log("✓ TEST 3 SUCCESS");
} else {
  console.error("✗ TEST 3 FAILED");
}
