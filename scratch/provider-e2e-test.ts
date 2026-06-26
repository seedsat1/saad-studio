// Mock global fetch for storage/accessibility checks in e2e tests
const originalFetch = global.fetch;
global.fetch = async (url: any, options: any) => {
  const urlStr = String(url);
  if (
    urlStr.includes("saadstudio-storage") ||
    urlStr.includes("backblazeb2.com") ||
    urlStr.includes("wikimedia.org") ||
    urlStr.includes("r2.dev") ||
    urlStr.includes("saadstudio.app")
  ) {
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers({
        "content-type": "image/png",
        "content-length": "1024",
      }),
    } as any;
  }
  return originalFetch(url, options);
};

import {
  buildOfficialSeedancePayload,
  mapToKieInput,
  mapToWavespeedInput,
  resolveMediaInInput,
} from "../app/api/video/route";
import { resolveProviderMediaUrl, verifyPublicMediaUrl } from "../lib/media/public-url-resolver";

const mockUserId = "test-user-e2e-123456";

// Test paths of different formats
const testImageB2 = "https://saadstudio-storage.s3.eu-central-003.backblazeb2.com/images/default-thumbnail.jpg";
const testImageR2 = "https://pub-3e0355a14eda4ec78c6e81b217a9a399.r2.dev/images/default-thumbnail.jpg";
const testImageProxy = "/api/media/images/default-thumbnail.jpg";
const testImageBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

async function runTestCase(label: string, testFn: () => Promise<void>) {
  console.log(`\n======================================================`);
  console.log(`🧪 TEST CASE: ${label}`);
  console.log(`======================================================`);
  try {
    await testFn();
    console.log(`✅ Passed`);
  } catch (err) {
    console.error(`❌ Failed:`, err);
  }
}

async function main() {
  console.log("Starting provider-by-provider E2E payload tests...");

  // 1. Seedance 2 text only
  await runTestCase("Seedance 2.0 Stable - Text Only", async () => {
    const modelRoute = "bytedance/seedance-v2/text-to-video";
    const payload = {
      prompt: "A beautiful sunny day in a green park",
      duration: 5,
      ratio: "16:9",
      resolution: "720p",
      generate_audio: true,
    };
    
    // In our codebase, Seedance 2.0 requires text-only generate_audio false to bypass inputs check:
    const finalPayload = await buildOfficialSeedancePayload(modelRoute, { ...payload, generate_audio: false }, mockUserId);
    console.log("Constructed official Seedance payload:", JSON.stringify(finalPayload, null, 2));
  });

  // 2. Seedance 2 + image
  await runTestCase("Seedance 2.0 Stable - Text + Image", async () => {
    const modelRoute = "bytedance/seedance-v2/text-to-video";
    const payload = {
      prompt: "A beautiful sunny day in a green park",
      duration: 5,
      ratio: "16:9",
      resolution: "720p",
      first_frame_url: testImageB2,
    };
    
    const finalPayload = await buildOfficialSeedancePayload(modelRoute, payload, mockUserId);
    console.log("Constructed official Seedance payload:", JSON.stringify(finalPayload, null, 2));
  });

  // 3. Seedance 2 + first frame (B2 migration check)
  await runTestCase("Seedance 2.0 Stable - Text + First Frame (R2 Legacy Domain)", async () => {
    const modelRoute = "bytedance/seedance-v2/text-to-video";
    const payload = {
      prompt: "A beautiful sunny day in a green park",
      duration: 5,
      ratio: "16:9",
      resolution: "720p",
      first_frame_url: testImageR2,
    };
    
    const finalPayload = await buildOfficialSeedancePayload(modelRoute, payload, mockUserId);
    console.log("Constructed official Seedance payload:", JSON.stringify(finalPayload, null, 2));
  });

  // 4. Seedance 2 + last frame
  await runTestCase("Seedance 2.0 Stable - Text + Last Frame (Proxy URL)", async () => {
    const modelRoute = "bytedance/seedance-v2/text-to-video";
    const payload = {
      prompt: "A beautiful sunny day in a green park",
      duration: 5,
      ratio: "16:9",
      resolution: "720p",
      last_frame_url: testImageProxy,
    };
    
    const finalPayload = await buildOfficialSeedancePayload(modelRoute, payload, mockUserId);
    console.log("Constructed official Seedance payload:", JSON.stringify(finalPayload, null, 2));
  });

  // 5. Seedance Mini text only
  await runTestCase("Seedance Mini - Text Only", async () => {
    const modelRoute = "bytedance/seedance-v2/text-to-video-mini";
    const payload = {
      prompt: "A cute cat sleeping on a sofa",
      duration: 5,
      ratio: "16:9",
      resolution: "720p",
      generate_audio: false,
    };
    
    const finalPayload = await buildOfficialSeedancePayload(modelRoute, payload, mockUserId);
    console.log("Constructed official Seedance payload:", JSON.stringify(finalPayload, null, 2));
  });

  // 6. Seedance Mini + image (Base64)
  await runTestCase("Seedance Mini - Text + Image (Base64)", async () => {
    const modelRoute = "bytedance/seedance-v2/text-to-video-mini";
    const payload = {
      prompt: "A cute cat sleeping on a sofa",
      duration: 5,
      ratio: "16:9",
      resolution: "720p",
      first_frame_url: testImageBase64,
    };
    
    const finalPayload = await buildOfficialSeedancePayload(modelRoute, payload, mockUserId);
    console.log("Constructed official Seedance payload:", JSON.stringify(finalPayload, null, 2));
  });

  // 7. Google Veo + image
  await runTestCase("Google Veo - Text + Image", async () => {
    const resolvedStartImage = await resolveProviderMediaUrl(testImageB2, { userId: mockUserId, assetType: "image" });
    await verifyPublicMediaUrl(resolvedStartImage, "image");
    
    console.log("Google Veo Resolved Start Image:", resolvedStartImage);
  });

  // 8. Kling + image
  await runTestCase("Kling - Text + Image", async () => {
    const model = "kling-3.0/video";
    const rawPayload = {
      prompt: "A realistic robot dancing, high dynamic range",
      duration: 5,
      resolution: "1080p",
      image_url: testImageProxy,
    };
    
    const resolved = await resolveMediaInInput(rawPayload, mockUserId);
    const finalInput = mapToKieInput(model, resolved);
    console.log("Kling input payload for KIE createTask:", JSON.stringify(finalInput, null, 2));
  });

  // 9. Minimax + image/video
  await runTestCase("Minimax - Text + Image/Video Reference", async () => {
    const model = "hailuo/minimax-video";
    const rawPayload = {
      prompt: "Stormy ocean waves crash against the rocks",
      duration: 5,
      resolution: "720p",
      image_url: testImageB2,
      video: testImageProxy,
    };
    
    const resolved = await resolveMediaInInput(rawPayload, mockUserId);
    const finalInput = mapToKieInput(model, resolved);
    console.log("Minimax input payload for KIE createTask:", JSON.stringify(finalInput, null, 2));
  });

  console.log("\n======================================================");
  console.log("🎉 All provider-by-provider dry-run tests finished.");
  console.log("======================================================");
}

main().catch((err) => {
  console.error("Test suite failed:", err);
  process.exit(1);
});
