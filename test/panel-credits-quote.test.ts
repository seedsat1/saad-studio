import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { generatePanelToken } from "@/lib/panel-auth";
import { normalizeGoogleVideoOptions } from "@/lib/video-model-registry";

vi.mock("@/lib/credit-ledger", () => ({
  ensureUserRow: vi.fn(),
  spendCredits: vi.fn(),
}));

vi.mock("@/lib/credit-pricing", () => ({
  getVideoCreditsByModelIdAsync: vi.fn(),
}));

vi.mock("@/lib/pricing", () => ({
  getGenerationCost: vi.fn(),
}));

vi.mock("@/lib/dynamic-model-loader", () => ({
  getDynamicVideoModels: vi.fn(async () => []),
}));

vi.mock("@/lib/prismadb", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { ensureUserRow, spendCredits } from "@/lib/credit-ledger";
import { getVideoCreditsByModelIdAsync } from "@/lib/credit-pricing";
import { getGenerationCost } from "@/lib/pricing";
import { getDynamicVideoModels } from "@/lib/dynamic-model-loader";
import prismadb from "@/lib/prismadb";
import { POST } from "@/app/api/panel/credits/quote/route";

const ensureUserRowMock = vi.mocked(ensureUserRow);
const spendCreditsMock = vi.mocked(spendCredits);
const getVideoCreditsByModelIdAsyncMock = vi.mocked(getVideoCreditsByModelIdAsync);
const getGenerationCostMock = vi.mocked(getGenerationCost);
const getDynamicVideoModelsMock = vi.mocked(getDynamicVideoModels);

function quoteRequest(body: unknown, token?: string | null): NextRequest {
  const headers = new Headers({ "content-type": "application/json" });
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return new NextRequest("https://saadstudio.test/api/panel/credits/quote", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/panel/credits/quote", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.PANEL_TOKEN_SECRET = "test-panel-secret-key-1234567890-secure";
    process.env.NODE_ENV = "test";
    vi.clearAllMocks();
    ensureUserRowMock.mockResolvedValue(undefined);
    getDynamicVideoModelsMock.mockResolvedValue([]);
    getVideoCreditsByModelIdAsyncMock.mockResolvedValue(42);
    getGenerationCostMock.mockResolvedValue(8);
    vi.mocked(prismadb.user.findUnique).mockResolvedValue({
      creditBalance: 100,
      isBanned: false,
    } as never);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("rejects missing panel bearer tokens", async () => {
    const response = await POST(quoteRequest({ modelId: "kling-3.0/video" }));
    expect(response.status).toBe(401);
    expect(spendCreditsMock).not.toHaveBeenCalled();
  });

  it("rejects invalid panel tokens", async () => {
    const response = await POST(quoteRequest({ modelId: "kling-3.0/video" }, "ssp_not_a_real_token"));
    expect(response.status).toBe(401);
  });

  it("rejects banned accounts", async () => {
    vi.mocked(prismadb.user.findUnique).mockResolvedValue({
      creditBalance: 100,
      isBanned: true,
    } as never);
    const token = generatePanelToken("user_banned");
    const response = await POST(quoteRequest({ modelId: "kling-3.0/video" }, token));
    expect(response.status).toBe(403);
    expect(getVideoCreditsByModelIdAsyncMock).not.toHaveBeenCalled();
    expect(spendCreditsMock).not.toHaveBeenCalled();
  });

  it("returns a read-only video quote using getVideoCreditsByModelIdAsync", async () => {
    const token = generatePanelToken("user_quote_video");
    const response = await POST(quoteRequest({
      model: "kling-3.0/video",
      durationSec: 10,
      quality: "720p",
      sound: true,
    }, token));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(ensureUserRowMock).toHaveBeenCalledWith("user_quote_video");
    expect(getVideoCreditsByModelIdAsyncMock).toHaveBeenCalledWith("kling-3.0/video", {
      duration: 10,
      resolution: "720p",
      generate_audio: true,
      reference_video_urls: [],
    });
    expect(json).toEqual({
      credits: 42,
      creditBalance: 100,
      balanceAfter: 58,
      modelRoute: "kling-3.0/video",
      duration: 10,
      quality: "720p",
      resolution: "720p",
      deducted: false,
    });
    expect(json.providerEstimatedCost).toBeUndefined();
    expect(spendCreditsMock).not.toHaveBeenCalled();
  });

  it("prefers modelId over model and leaves balanceAfter unclamped when negative", async () => {
    getVideoCreditsByModelIdAsyncMock.mockResolvedValue(25);
    vi.mocked(prismadb.user.findUnique).mockResolvedValue({
      creditBalance: 10,
      isBanned: false,
    } as never);
    const token = generatePanelToken("user_quote_short");
    const response = await POST(quoteRequest({
      modelId: "kling-3.0/video",
      model: "should-not-win",
      duration: 5,
      resolution: "1080p",
    }, token));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(getVideoCreditsByModelIdAsyncMock).toHaveBeenCalledWith(
      "kling-3.0/video",
      expect.objectContaining({ duration: 5, resolution: "1080p" }),
    );
    expect(json.credits).toBe(25);
    expect(json.creditBalance).toBe(10);
    expect(json.balanceAfter).toBe(-15);
    expect(json.deducted).toBe(false);
  });

  it("normalizes Google video duration and resolution the same way generate/video charges", async () => {
    const modelId = "google/veo3.1-fast-text-to-video";
    const expected = normalizeGoogleVideoOptions(modelId, {
      duration: 5,
      resolution: "1080p",
      aspectRatio: "16:9",
      referenceImageCount: 1,
      hasVideoInput: false,
      hasStartImage: true,
      hasEndImage: false,
    });
    const token = generatePanelToken("user_quote_google");
    const response = await POST(quoteRequest({
      modelId,
      duration: 5,
      resolution: "1080p",
      aspectRatio: "16:9",
      firstFrameUrl: "https://cdn.example/start.png",
      referenceImageUrls: ["https://cdn.example/ref.png"],
    }, token));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(getVideoCreditsByModelIdAsyncMock).toHaveBeenCalledWith(modelId, {
      duration: expected.duration,
      resolution: expected.resolution,
      generate_audio: false,
      reference_video_urls: [],
    });
    expect(json.duration).toBe(expected.duration);
    expect(json.quality).toBe(expected.resolution);
    expect(json.resolution).toBe(expected.resolution);
    expect(json.deducted).toBe(false);
  });

  it("quotes images with getGenerationCost when kind is image", async () => {
    const token = generatePanelToken("user_quote_image");
    const response = await POST(quoteRequest({
      kind: "image",
      modelId: "google/imagen4",
      resolution: "2K",
      numImages: 2,
    }, token));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(getGenerationCostMock).toHaveBeenCalledWith("google/imagen4", 5, 2, "2K");
    expect(getVideoCreditsByModelIdAsyncMock).not.toHaveBeenCalled();
    expect(json.credits).toBe(8);
    expect(json.modelRoute).toBe("google/imagen4");
    expect(json.deducted).toBe(false);
    expect(spendCreditsMock).not.toHaveBeenCalled();
  });

  it("never deducts and never exposes provider cost fields", async () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app", "api", "panel", "credits", "quote", "route.ts"),
      "utf-8",
    );
    expect(source).toContain("getVideoCreditsByModelIdAsync");
    expect(source).toContain("extractPanelToken");
    expect(source).toContain("verifyPanelToken");
    expect(source).toContain("deducted: false");
    expect(source).not.toContain("spendCredits");
    expect(source).not.toContain("providerEstimatedCost");
    expect(source).not.toContain("estimateProviderCostSync");
  });
});
