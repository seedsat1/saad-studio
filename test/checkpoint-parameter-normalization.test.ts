import { describe, it, expect } from "vitest";
import {
  buildCanonicalRequest,
  type CanonicalGenerationRequest,
} from "@/lib/routing/checkpoints/canonical-request";
import {
  getCheckpointCapability,
  CHECKPOINT_CAPABILITIES,
} from "@/lib/routing/checkpoints/checkpoint-capabilities";
import {
  validateCanonicalRequestAgainstCheckpoint,
  assertCanonicalRequestCompatibility,
  CheckpointCapabilityMismatchError,
} from "@/lib/routing/checkpoints/checkpoint-validator";
import { normalizeAndAdaptCheckpointRequest } from "@/lib/routing/checkpoints/checkpoint-adapter";
import { getGenerationCostSync } from "@/lib/pricing";

describe("Universal Checkpoint Routing — Provider Parameter Normalization Layer Suite", () => {
  // ─── 1. GOOGLE PRODUCTS NORMALIZATION ─────────────────────────────────────
  describe("Google Products (Veo & Imagen)", () => {
    const canonicalVeoReq = buildCanonicalRequest({
      logicalProductId: "google/veo-3.1-fast-generate-preview",
      officialProvider: "Google",
      modality: "video",
      prompt: "A majestic cybernetic falcon soaring over neon sand dunes",
      negativePrompt: "low quality, blurry, cartoonish",
      durationSec: 8,
      resolution: "720p",
      aspectRatio: "16:9",
      inputImage: "https://r2.saadstudio.com/ref-image.png",
      generateAudio: true,
    });

    it("1.1. transforms canonical Veo request into Google official payload", () => {
      const pkg = normalizeAndAdaptCheckpointRequest(canonicalVeoReq, {
        provider: "google",
        route: "google/veo-3.1-fast-generate-preview",
      });

      expect(pkg.logicalProductId).toBe("google/veo-3.1-fast-generate-preview");
      expect(pkg.officialProvider).toBe("Google");
      expect(pkg.selectedExecutionProvider).toBe("google");
      expect(pkg.endpoint).toBe("vertex_veo");
      expect(pkg.providerPayload.durationSeconds).toBe(8);
      expect(pkg.providerPayload.aspectRatio).toBe("16:9");
      expect(pkg.providerPayload.generate_audio).toBe(true);
      expect(Array.isArray(pkg.providerPayload.input)).toBe(true);
    });

    it("1.2. transforms canonical Veo request into WaveSpeed checkpoint payload (without audio)", () => {
      // WaveSpeed does not support generateAudio for Veo
      const waveVeoReq = buildCanonicalRequest({
        ...canonicalVeoReq,
        generateAudio: false,
      });

      const pkg = normalizeAndAdaptCheckpointRequest(waveVeoReq, {
        provider: "wavespeed",
        route: "google/veo3.1-fast-text-to-video",
      });

      expect(pkg.logicalProductId).toBe("google/veo-3.1-fast-generate-preview");
      expect(pkg.officialProvider).toBe("Google");
      expect(pkg.selectedExecutionProvider).toBe("wavespeed");
      expect(pkg.providerPayload.model).toBe("google/veo3.1-fast-text-to-video");
      expect(pkg.providerPayload.duration).toBe(8);
      expect(pkg.providerPayload.aspect_ratio).toBe("16:9");
      expect(pkg.providerPayload.image).toBe("https://r2.saadstudio.com/ref-image.png");
    });

    it("1.3. transforms canonical Veo request into KIE.ai checkpoint payload", () => {
      const kieVeoReq = buildCanonicalRequest({
        ...canonicalVeoReq,
        generateAudio: false,
      });

      const pkg = normalizeAndAdaptCheckpointRequest(kieVeoReq, {
        provider: "kie",
        route: "veo3-fast",
      });

      expect(pkg.logicalProductId).toBe("google/veo-3.1-fast-generate-preview");
      expect(pkg.officialProvider).toBe("Google");
      expect(pkg.selectedExecutionProvider).toBe("kie");
      expect(pkg.providerPayload.model).toBe("veo3-fast");
      const input = pkg.providerPayload.input as Record<string, unknown>;
      expect(input.duration).toBe(8);
      expect(input.image_url).toBe("https://r2.saadstudio.com/ref-image.png");
    });

    it("1.4. strictly rejects audio generation when WaveSpeed checkpoint is selected", () => {
      // canonicalVeoReq has generateAudio = true, which WaveSpeed does NOT support
      expect(() => {
        normalizeAndAdaptCheckpointRequest(canonicalVeoReq, {
          provider: "wavespeed",
          route: "google/veo3.1-fast-text-to-video",
        });
      }).toThrowError(CheckpointCapabilityMismatchError);
    });
  });

  // ─── 2. OPENAI PRODUCTS NORMALIZATION ─────────────────────────────────────
  describe("OpenAI Products (DALL-E 3 & Sora 2)", () => {
    const canonicalDalleReq = buildCanonicalRequest({
      logicalProductId: "openai/dall-e-3",
      officialProvider: "OpenAI",
      modality: "image",
      prompt: "Ultra-realistic crystal palace in an enchanted forest",
      aspectRatio: "16:9",
      quality: "hd",
      numOutputs: 1,
    });

    it("2.1. transforms canonical DALL-E 3 request into OpenAI official payload", () => {
      const pkg = normalizeAndAdaptCheckpointRequest(canonicalDalleReq, {
        provider: "openai",
        route: "openai/dall-e-3",
      });

      expect(pkg.logicalProductId).toBe("openai/dall-e-3");
      expect(pkg.officialProvider).toBe("OpenAI");
      expect(pkg.selectedExecutionProvider).toBe("openai");
      expect(pkg.endpoint).toBe("images.generate");
      expect(pkg.providerPayload.size).toBe("1792x1024");
      expect(pkg.providerPayload.quality).toBe("hd");
      expect(pkg.providerPayload.response_format).toBe("url");
    });

    it("2.2. transforms canonical DALL-E 3 request into WaveSpeed checkpoint payload", () => {
      const pkg = normalizeAndAdaptCheckpointRequest(canonicalDalleReq, {
        provider: "wavespeed",
        route: "openai/dall-e-3",
      });

      expect(pkg.selectedExecutionProvider).toBe("wavespeed");
      expect(pkg.providerPayload.model).toBe("openai/dall-e-3");
      expect(pkg.providerPayload.aspect_ratio).toBe("16:9");
    });

    it("2.3. strictly rejects negative prompts on OpenAI official DALL-E checkpoint", () => {
      const invalidDalleReq = buildCanonicalRequest({
        ...canonicalDalleReq,
        negativePrompt: "ugly, blurry",
      });

      expect(() => {
        normalizeAndAdaptCheckpointRequest(invalidDalleReq, {
          provider: "openai",
          route: "openai/dall-e-3",
        });
      }).toThrowError(CheckpointCapabilityMismatchError);
    });
  });

  // ─── 3. BYTEPLUS PRODUCTS NORMALIZATION ───────────────────────────────────
  describe("BytePlus Products (Seedance 2.5)", () => {
    const canonicalSeedanceReq = buildCanonicalRequest({
      logicalProductId: "bytedance/seedance-2.5",
      officialProvider: "BytePlus",
      modality: "video",
      prompt: "Cinematic shot of ancient oasis temple at sunset",
      negativePrompt: "overexposed, low-res",
      durationSec: 10,
      resolution: "720p",
      aspectRatio: "16:9",
      firstFrame: "https://r2.saadstudio.com/frame1.jpg",
      lastFrame: "https://r2.saadstudio.com/frame2.jpg",
      seed: 424242,
    });

    it("3.1. transforms canonical Seedance request into BytePlus official payload", () => {
      const pkg = normalizeAndAdaptCheckpointRequest(canonicalSeedanceReq, {
        provider: "byteplus",
        route: "bytedance-seedance-2.5-t2v",
      });

      expect(pkg.logicalProductId).toBe("bytedance/seedance-2.5");
      expect(pkg.officialProvider).toBe("BytePlus");
      expect(pkg.selectedExecutionProvider).toBe("byteplus");
      expect(pkg.endpoint).toBe("contents/generations/tasks");
      expect(pkg.providerPayload.duration).toBe("10s");
      expect(pkg.providerPayload.resolution).toBe("720p");
      expect(pkg.providerPayload.seed).toBe(424242);
      expect(Array.isArray(pkg.providerPayload.content)).toBe(true);
    });

    it("3.2. transforms canonical Seedance request into WaveSpeed checkpoint payload", () => {
      const pkg = normalizeAndAdaptCheckpointRequest(canonicalSeedanceReq, {
        provider: "wavespeed",
        route: "bytedance/seedance-2.5/text-to-video-turbo",
      });

      expect(pkg.logicalProductId).toBe("bytedance/seedance-2.5");
      expect(pkg.officialProvider).toBe("BytePlus");
      expect(pkg.selectedExecutionProvider).toBe("wavespeed");
      expect(pkg.providerPayload.model).toBe("bytedance/seedance-2.5/text-to-video-turbo");
      expect(pkg.providerPayload.first_frame_url).toBe("https://r2.saadstudio.com/frame1.jpg");
      expect(pkg.providerPayload.last_frame_url).toBe("https://r2.saadstudio.com/frame2.jpg");
      expect(pkg.providerPayload.seed).toBe(424242);
    });

    it("3.3. transforms canonical Seedance request into KIE.ai checkpoint payload", () => {
      const pkg = normalizeAndAdaptCheckpointRequest(canonicalSeedanceReq, {
        provider: "kie",
        route: "seedance-2.5",
      });

      expect(pkg.logicalProductId).toBe("bytedance/seedance-2.5");
      expect(pkg.officialProvider).toBe("BytePlus");
      expect(pkg.selectedExecutionProvider).toBe("kie");
      const input = pkg.providerPayload.input as Record<string, unknown>;
      expect(input.first_frame).toBe("https://r2.saadstudio.com/frame1.jpg");
      expect(input.last_frame).toBe("https://r2.saadstudio.com/frame2.jpg");
      expect(input.seed).toBe(424242);
    });
  });

  // ─── 4. STRICT CAPABILITY ASSERTION & ZERO SILENT DROPPING ───────────────
  describe("Strict Capability Enforcement", () => {
    it("4.1. surfaces exact missing capabilities in CheckpointCapabilityMismatchError", () => {
      const reqWithMultipleIncompatible = buildCanonicalRequest({
        logicalProductId: "google/veo-3.1-fast-generate-preview",
        officialProvider: "Google",
        modality: "video",
        prompt: "Action sequence",
        firstFrame: "https://r2.saadstudio.com/f1.jpg", // Google official video does not support explicit first/last frame property
        generateAudio: true,
      });

      const capability = getCheckpointCapability("google", "video");
      const validation = validateCanonicalRequestAgainstCheckpoint(reqWithMultipleIncompatible, capability);

      expect(validation.valid).toBe(false);
      expect(validation.unsupportedParameters).toContain("firstLastFrames");
    });

    it("4.2. throws CheckpointCapabilityMismatchError when assertCompatibility fails", () => {
      const req = buildCanonicalRequest({
        logicalProductId: "test/model",
        officialProvider: "Google",
        modality: "video",
        prompt: "Drone shot",
        cameraControls: { pan: "left", tilt: 15 }, // Google native video does not support cameraControls object
      });

      const capability = getCheckpointCapability("google", "video");

      try {
        assertCanonicalRequestCompatibility(req, capability);
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(CheckpointCapabilityMismatchError);
        const mismatchErr = err as CheckpointCapabilityMismatchError;
        expect(mismatchErr.unsupportedParameters).toContain("cameraControls");
      }
    });
  });

  // ─── 5. CRITICAL REGRESSION TEST: MULTI-CHECKPOINT PARITY & DECOUPLING ───
  describe("Multi-Checkpoint Parity & Decoupling", () => {
    it("5.1. same logical request routed to different checkpoints produces distinct provider payloads while preserving ownership and user pricing", () => {
      const baseReq = buildCanonicalRequest({
        logicalProductId: "google/veo-3.1-fast-generate-preview",
        officialProvider: "Google",
        modality: "video",
        prompt: "Cinematic mountain sunrise in 4k",
        durationSec: 8,
        resolution: "720p",
        aspectRatio: "16:9",
      });

      // Execute via Google Official
      const googlePkg = normalizeAndAdaptCheckpointRequest(baseReq, {
        provider: "google",
        route: "google/veo-3.1-fast-generate-preview",
      });

      // Execute via WaveSpeed Checkpoint
      const wavePkg = normalizeAndAdaptCheckpointRequest(baseReq, {
        provider: "wavespeed",
        route: "google/veo3.1-fast-text-to-video",
      });

      // Payloads are distinct and tailored to each provider
      expect(googlePkg.endpoint).toBe("vertex_veo");
      expect(wavePkg.endpoint).toBe("models/google/veo3.1-fast-text-to-video/run");
      expect(googlePkg.providerPayload).not.toEqual(wavePkg.providerPayload);

      // BUT logical product identity and owner remain identical
      expect(googlePkg.logicalProductId).toBe(wavePkg.logicalProductId);
      expect(googlePkg.officialProvider).toBe(wavePkg.officialProvider);
      expect(googlePkg.officialProvider).toBe("Google");

      // Customer pricing is 100% decoupled and unaffected by execution checkpoint
      const googleUserCost = getGenerationCostSync(baseReq.logicalProductId, 8, 1, "720p");
      const waveUserCost = getGenerationCostSync("google/veo3.1-fast-text-to-video", 8, 1, "720p");
      expect(googleUserCost).toBe(22.4);
      expect(waveUserCost).toBe(22.4);
    });
  });
});
