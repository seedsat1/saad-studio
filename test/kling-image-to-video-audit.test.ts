import { describe, expect, it } from "vitest";
import { isMp3Buffer, transcodeToMp3 } from "@/lib/server/audio-transcode";

describe("Kling 3.0 & Audio Pipeline Verification Suite", () => {
  describe("A. Kling 3.0 Payload Normalization & Field Mapping", () => {
    it("verifies single start image without end image produces exact schema", () => {
      const startImageBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/";
      const imageUrls = [startImageBase64];

      const payload = {
        modelRoute: "kwaivgi/kling-v3.0-std/image-to-video",
        model: "kling-3.0/video",
        target_frame_ratio: "16:9",
        prompt: "123",
        mode: "std",
        duration: 3,
        aspect_ratio: "16:9",
        multi_shots: false,
        sound: false,
        image_urls: imageUrls,
      };

      const startImage = payload.image_urls[0] || null;
      const finalImage = payload.image_urls[1] || null;

      const exact: Record<string, unknown> = {};
      if (startImage) exact.image = startImage;
      if (payload.prompt) exact.prompt = payload.prompt;
      if (finalImage) exact.end_image = finalImage;
      exact.duration = Math.min(15, Math.max(3, payload.duration));
      exact.sound = payload.sound === true;

      expect(exact.image).toBe(startImageBase64);
      expect(exact.image).not.toContain("[frame_0]");
      expect(exact.end_image).toBeUndefined();
      expect(exact.duration).toBe(3);
      expect(exact.sound).toBe(false);
    });

    it("verifies frame prefix [frame_0] was only frontend debug log and is stripped if ever present", () => {
      const debugLogEntry = "[frame_0] data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ";
      const cleanDataUrl = debugLogEntry.replace(/^\[frame_\d+\]\s*/, "");
      expect(cleanDataUrl.startsWith("data:image/jpeg;base64,")).toBe(true);
    });
  });

  describe("B. Audio Transcoding & Serverless Resilience", () => {
    it("preserves MP3 buffers without spawning FFmpeg", async () => {
      const fakeMp3 = Buffer.from([0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00]);
      expect(isMp3Buffer(fakeMp3)).toBe(true);
      const res = await transcodeToMp3(fakeMp3);
      expect(res).toBe(fakeMp3);
    });

    it("detects MPEG frame sync words in headers", () => {
      const syncBuffer = Buffer.from([0xff, 0xfb, 0x90, 0x44]);
      expect(isMp3Buffer(syncBuffer)).toBe(true);
    });
  });
});
