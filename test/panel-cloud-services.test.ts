import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { generatePanelToken } from "@/lib/panel-auth";

const {
  ensureUserRow,
  userFindUnique,
  subscriptionFindUnique,
  platformFindUnique,
  getDynamicImageModels,
  getDynamicVideoModels,
} = vi.hoisted(() => ({
  ensureUserRow: vi.fn(),
  userFindUnique: vi.fn(),
  subscriptionFindUnique: vi.fn(),
  platformFindUnique: vi.fn(),
  getDynamicImageModels: vi.fn(),
  getDynamicVideoModels: vi.fn(),
}));

vi.mock("@/lib/credit-ledger", () => ({ ensureUserRow }));
vi.mock("@/lib/dynamic-model-loader", () => ({
  getDynamicImageModels,
  getDynamicVideoModels,
}));
vi.mock("@/lib/prismadb", () => ({
  default: {
    user: { findUnique: userFindUnique },
    userSubscription: { findUnique: subscriptionFindUnique },
    platformConfig: { findUnique: platformFindUnique },
  },
}));

import { GET } from "@/app/api/panel/cloud-services/route";

function request(token?: string | null) {
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return new NextRequest("https://saad.test/api/panel/cloud-services", { method: "GET", headers });
}

describe("GET /api/panel/cloud-services", () => {
  beforeEach(() => {
    process.env.PANEL_TOKEN_SECRET = "test-panel-secret-key-1234567890-secure";
    process.env.NODE_ENV = "test";
    process.env.WAVESPEED_API_KEY = "secret_wavespeed_key";
    process.env.GOOGLE_API_KEY = "secret_google_key";
    vi.clearAllMocks();
    ensureUserRow.mockResolvedValue({});
    userFindUnique.mockResolvedValue({ isBanned: false });
    subscriptionFindUnique.mockResolvedValue({
      planId: "podcast",
      stripeCurrentPeriodEnd: new Date(Date.now() - 86_400_000),
    });
    platformFindUnique.mockResolvedValue(null);
    getDynamicImageModels.mockResolvedValue([
      {
        id: "nano-banana-2",
        label: "Nano Banana 2",
        sublabel: "Google image model",
        badge: "DEFAULT",
        group: "Nano Banana",
        upstreamModelId: "gemini-3.1-flash-image",
        isActive: true,
        inputType: "text-to-image",
        aspectRatios: ["1:1", "16:9"],
        maxImages: 4,
        maxRefImages: 14,
        imageInputField: "image_input",
        qualityParam: ["1K"],
        creditCost: 2,
      },
      {
        id: "disabled-image",
        label: "Disabled Image",
        sublabel: "disabled",
        badge: "",
        group: "WaveSpeed",
        isActive: false,
        inputType: "text-to-image",
        aspectRatios: ["1:1"],
        maxImages: 1,
        maxRefImages: 0,
        creditCost: 2,
      },
    ]);
    getDynamicVideoModels.mockResolvedValue([
      {
        id: "google/veo3-fast-text-to-video",
        name: "Google Veo Fast",
        family: "veo",
        family_label: "Google Veo",
        family_color: "#4285f4",
        badge: "FAST",
        description: "Google video model",
        api_route: "google/veo3-fast-text-to-video",
        route_confirmed: true,
        isActive: true,
        capabilities: {
          requires_image: false,
          optional_image: false,
          requires_video: false,
          optional_video: false,
          has_end_frame: false,
          aspect_ratios: ["16:9"],
          sizes: [],
          durations: [8],
          resolutions: ["720p"],
          quality_param: "resolution",
          max_reference_images: 0,
          max_reference_videos: 0,
          max_reference_video_total_seconds: 0,
          max_reference_audios: 0,
          max_reference_audio_total_seconds: 0,
          has_negative_prompt: false,
          has_loop: false,
          has_seed: false,
          has_cfg_scale: false,
          has_sound: false,
          sound_param: "generate_audio",
          has_shot_type: false,
          has_multi_prompt: false,
          has_element_list: false,
          has_scene_control: false,
          has_orientation: false,
          has_omni_tabs: false,
        },
      },
      {
        id: "disabled-video",
        name: "Disabled Video",
        family: "disabled",
        family_label: "Disabled",
        family_color: "#000",
        badge: null,
        description: "disabled",
        api_route: "wavespeed-ai/disabled",
        route_confirmed: true,
        isActive: false,
        capabilities: {
          requires_image: false,
          optional_image: false,
          requires_video: false,
          optional_video: false,
          has_end_frame: false,
          aspect_ratios: [],
          sizes: [],
          durations: [],
          resolutions: [],
          quality_param: "resolution",
          max_reference_images: 0,
          max_reference_videos: 0,
          max_reference_video_total_seconds: 0,
          max_reference_audios: 0,
          max_reference_audio_total_seconds: 0,
          has_negative_prompt: false,
          has_loop: false,
          has_seed: false,
          has_cfg_scale: false,
          has_sound: false,
          sound_param: "generate_audio",
          has_shot_type: false,
          has_multi_prompt: false,
          has_element_list: false,
          has_scene_control: false,
          has_orientation: false,
          has_omni_tabs: false,
        },
      },
    ]);
  });

  it("requires panel authentication", async () => {
    const response = await GET(request(null));
    expect(response.status).toBe(401);
  });

  it("returns a dynamic authenticated cloud catalog without upstream secrets", async () => {
    const token = generatePanelToken("user_cloud_catalog");
    const response = await GET(request(token));
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(json.authenticated).toBe(true);
    expect(json.dynamic).toBe(true);

    const serialized = JSON.stringify(json);
    expect(serialized).not.toContain("secret_wavespeed_key");
    expect(serialized).not.toContain("secret_google_key");
    expect(serialized).not.toContain("API_KEY");

    expect(json.services.AGENT.find((item: any) => item.id === "gemini-2.5-flash")?.executionProvider).toBe("Google");
    expect(json.services.AGENT.find((item: any) => item.id === "anthropic/claude-3-haiku")?.logicalProvider).toBe("Anthropic");
    expect(json.services.AGENT.find((item: any) => item.id === "openai/gpt-oss-120b")?.logicalProvider).toBe("OpenAI");
    expect(json.services.AGENT.find((item: any) => item.id === "moonshotai/kimi-k2")?.logicalProvider).toBe("Kimi");
    expect(json.services.AGENT.find((item: any) => item.id === "qwen/qwen3.7-flash")?.logicalProvider).toBe("Qwen");
    expect(json.services.AGENT.find((item: any) => item.id === "z-ai/glm-5.2")?.logicalProvider).toBe("GLM");
    expect(json.services.AGENT.find((item: any) => item.id === "deepseek/deepseek-v4-flash")?.logicalProvider).toBe("DeepSeek");
    expect(json.services.AGENT.find((item: any) => item.id === "minimax/minimax-m3")?.logicalProvider).toBe("MiniMax");
    expect(json.services.AGENT.find((item: any) => item.id === "mistralai/mistral-nemo")?.logicalProvider).toBe("Mistral");

    const image = json.services.IMAGE.find((item: any) => item.id === "nano-banana-2");
    expect(image.ready).toBe(true);
    expect(image.executionRoute).toBe("/api/panel/generate/image");
    expect(image.executionProvider).toBe("Google");

    const video = json.services.VIDEO.find((item: any) => item.id === "google/veo3-fast-text-to-video");
    expect(video.ready).toBe(true);
    expect(video.executionRoute).toBe("/api/panel/generate/video");
    expect(video.executionProvider).toBe("Google");

    expect(json.services.SPEECH_TTS.find((item: any) => item.id === "elevenlabs/text-to-speech-multilingual-v2")?.ready).toBe(true);
    expect(json.services.SPEECH_TTS.find((item: any) => item.id === "gemini-3.1-flash-tts-preview")?.ready).toBe(false);
    expect(json.services.MUSIC_AUDIO.find((item: any) => item.id === "google/lyria-3-clip/music")?.ready).toBe(true);
  });

  it("does not falsely advertise disabled services as usable", async () => {
    const token = generatePanelToken("user_cloud_catalog_disabled");
    const response = await GET(request(token));
    const json = await response.json();
    expect(json.services.IMAGE.find((item: any) => item.id === "disabled-image")?.selectable).toBe(false);
    expect(json.services.VIDEO.find((item: any) => item.id === "disabled-video")?.ready).toBe(false);
  });
});
