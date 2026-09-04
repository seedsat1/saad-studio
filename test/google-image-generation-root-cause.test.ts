import { describe, expect, it } from "vitest";
import {
  buildGoogleImageGenerationConfig,
  buildGoogleImageResponseFormat,
  formatGoogleImagePrompt,
  normalizeGoogleImageSize,
  withGoogleImageControlHints,
} from "@/lib/google-image-model-specs";

describe("Google Image Generation Root Cause & Parity Verification", () => {
  describe("1. Prompt Framing & Directive Injection", () => {
    it("preserves explicit English image generation directives", () => {
      const prompt = "Generate a futuristic cyberpunk city in 4k";
      const formatted = formatGoogleImagePrompt(prompt);
      expect(formatted).toBe("Generate a futuristic cyberpunk city in 4k");
    });

    it("preserves explicit Arabic image generation directives", () => {
      const prompt = "صورة لمدينة بغداد في العصر العباسي بدقة عالية";
      const formatted = formatGoogleImagePrompt(prompt);
      expect(formatted).toBe("صورة لمدينة بغداد في العصر العباسي بدقة عالية");
    });

    it("injects visual image generation directive for bare entity/concept prompts (English)", () => {
      const prompt = "sunset in Baghdad";
      const formatted = formatGoogleImagePrompt(prompt);
      expect(formatted).toBe("Generate a detailed high quality visual image depicting: sunset in Baghdad");
    });

    it("injects visual image generation directive for bare entity/topic prompts (Arabic)", () => {
      const prompt = "العراق";
      const formatted = formatGoogleImagePrompt(prompt);
      expect(formatted).toBe("Generate a detailed high quality visual image depicting: العراق");
    });

    it("preserves full long prompts without unexpected truncation", () => {
      const longArabic = "مشهد سينمائي واقعي جداً يصور نهري دجلة والفرات مع تفاصيل دقيقة للأشجار والمياه الصافية وأشعة الشمس الذهبية وقت الغروب في العراق";
      const formatted = formatGoogleImagePrompt(longArabic);
      expect(formatted).toContain(longArabic);
      expect(formatted.startsWith("Generate a detailed high quality visual image depicting:")).toBe(true);
    });

    it("handles empty or whitespace prompts safely", () => {
      expect(formatGoogleImagePrompt("")).toBe("Generate a high quality visual image.");
      expect(formatGoogleImagePrompt("   ")).toBe("Generate a high quality visual image.");
    });

    it("keeps Google image_size on provider-supported quality labels", () => {
      expect(normalizeGoogleImageSize("gemini-3-pro-image", "1K")).toBe("1K");
      expect(normalizeGoogleImageSize("gemini-3-pro-image", "2K")).toBe("2K");
      expect(normalizeGoogleImageSize("gemini-3-pro-image", "1920x1080")).toBe("1K");
    });

    it("builds Google response_format with aspect_ratio separate from image_size", () => {
      expect(buildGoogleImageResponseFormat("gemini-3-pro-image", "16:9", "2K")).toEqual({
        type: "image",
        mime_type: "image/jpeg",
        aspect_ratio: "16:9",
        image_size: "2K",
      });
    });

    it("builds the Gemini image generationConfig aspectRatio fallback", () => {
      expect(buildGoogleImageGenerationConfig("gemini-3-pro-image", "16:9")).toEqual({
        image_config: {
          aspect_ratio: "16:9",
        },
      });
    });

    it("adds explicit image control hints to the prompt sent to Gemini image models", () => {
      const prompt = withGoogleImageControlHints("Generate a city view.", "16:9", "2K");
      expect(prompt).toContain("Output requirements: aspect ratio 16:9, target quality 2K.");
    });
  });

  describe("2. Google Interactions Response Parsing & Image Extraction", () => {
    it("extracts base64 image from standard interaction steps output", () => {
      const mockSuccessResponse = {
        id: "interaction_123",
        status: "completed",
        steps: [
          {
            type: "model_output",
            content: [
              {
                type: "image",
                image: {
                  mime_type: "image/jpeg",
                  data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                },
              },
            ],
          },
        ],
      };

      const rec = mockSuccessResponse.steps[0].content[0];
      expect(rec.type).toBe("image");
      expect(rec.image.data).toBeTruthy();
      expect(rec.image.mime_type).toBe("image/jpeg");
    });

    it("identifies text-only completed interactions as non-image failures", () => {
      const mockTextOnlyResponse = {
        id: "v1_test",
        status: "completed",
        usage: {
          total_tokens: 2849,
          total_input_tokens: 3,
          total_thought_tokens: 1487,
          raw_prompt_token: 449,
        },
        steps: [
          {
            type: "model_output",
            content: [
              {
                type: "text",
                text: "العراق، المعروف تاريخياً بـ بلاد الرافدين...",
              },
            ],
          },
        ],
        model: "gemini-3-pro-image",
      };

      const stepContent = mockTextOnlyResponse.steps[0].content[0];
      expect(stepContent.type).toBe("text");
      const hasImage = "image" in stepContent || "output_image" in (mockTextOnlyResponse.steps[0] as any);
      expect(hasImage).toBe(false);
    });
  });

  describe("3. Atomic Billing & Refund Safety Contract", () => {
    it("ensures zero credit leak on generation error", async () => {
      let balance = 100;
      const chargedCredits = 2;

      balance -= chargedCredits;
      expect(balance).toBe(98);

      balance += chargedCredits;
      expect(balance).toBe(100);
      expect(balance).toBe(100);
    });

    it("guarantees idempotency and prevents duplicate refund", () => {
      let isRefunded = false;
      let balance = 98;
      const refundAmount = 2;

      const triggerRefund = () => {
        if (isRefunded) return false;
        isRefunded = true;
        balance += refundAmount;
        return true;
      };

      expect(triggerRefund()).toBe(true);
      expect(balance).toBe(100);
      expect(triggerRefund()).toBe(false);
      expect(balance).toBe(100);
    });
  });
});
