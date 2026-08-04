import { API_BASE } from "./config.js";
import { requireToken } from "./auth.js";

async function panelRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await requireToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token.accessToken}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }
  if (!res.ok) {
    const msg = (data && typeof data === "object" && "error" in data && typeof (data as { error?: unknown }).error === "string")
      ? (data as { error: string }).error
      : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export interface CreditBalance {
  credits?: number;
  plan?: string;
  [key: string]: unknown;
}

export function getBalance(): Promise<CreditBalance> {
  return panelRequest<CreditBalance>("/api/panel/credits", { method: "GET" });
}

export interface GenerationItem {
  id: string;
  kind: "image" | "video" | "audio";
  url: string;
  thumbnailUrl?: string;
  prompt?: string | null;
  model?: string | null;
  createdAt: string;
}

export interface GenerationsPage {
  items: GenerationItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export function listGenerations(params: { limit?: number; kind?: "image" | "video" | "audio" } = {}): Promise<GenerationsPage> {
  const query = new URLSearchParams();
  if (params.limit) query.set("limit", String(params.limit));
  if (params.kind) query.set("kind", params.kind);
  const qs = query.toString();
  return panelRequest<GenerationsPage>(`/api/panel/generations${qs ? `?${qs}` : ""}`, { method: "GET" });
}

export interface GenerateImageInput {
  prompt: string;
  modelId?: string;
  aspectRatio?: string;
  resolution?: string;
  numImages?: number;
  negativePrompt?: string;
  imageUrl?: string;
}

export interface GenerateImageResult {
  imageUrls?: string[];
  imageUrl?: string;
  generationId?: string;
  [key: string]: unknown;
}

export function generateImage(input: GenerateImageInput): Promise<GenerateImageResult> {
  return panelRequest<GenerateImageResult>("/api/panel/generate/image", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export interface GenerateVideoInput {
  prompt: string;
  modelId?: string;
  imageUrl?: string;
  duration?: number;
  aspectRatio?: string;
  resolution?: string;
}

export interface GenerateVideoResult {
  videoUrl?: string;
  videoUrls?: string[];
  generationId?: string;
  status?: string;
  [key: string]: unknown;
}

export function generateVideo(input: GenerateVideoInput): Promise<GenerateVideoResult> {
  return panelRequest<GenerateVideoResult>("/api/panel/generate/video", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
