import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";

export const CINEMA_CAMERA_PRESETS = [
  "static",
  "push in",
  "pull out",
  "dolly",
  "orbit",
  "crane",
  "tracking",
  "close-up",
  "wide shot",
] as const;

export async function requireCinemaUser() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

export async function ensureProjectOwnership(projectId: string, userId: string) {
  const project = await prismadb.cinemaProject.findUnique({
    where: { id: projectId },
    select: { id: true, userId: true },
  });
  if (!project || project.userId !== userId) {
    throw new Error("Project not found");
  }
  return project;
}

export function normalizeDuration(raw: unknown, fallback = 5) {
  const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number.parseInt(raw, 10) : fallback;
  if (!Number.isFinite(n)) return fallback;
  return Math.max(3, Math.min(20, n));
}

export function cinemaShotCredits(duration: number, consistencyLock = true) {
  const base = Math.max(1, Math.ceil(duration / 2));
  return consistencyLock ? base + 1 : base;
}

export function buildCinemaVideoPayload(input: {
  prompt: string;
  negativePrompt?: string;
  duration: number;
  ratio: string;
  cameraPreset: string;
  cameraSpeed: number;
  motionIntensity: number;
  smoothness: number;
  lighting: string;
  lens: string;
  colorGrade: string;
  audioPrompt?: string;
  seed?: number | null;
  consistencyLock: boolean;
  characterRefs?: string[];
  locationRef?: string | null;
}) {
  const styleLine = [
    `camera preset: ${input.cameraPreset}`,
    `camera speed: ${input.cameraSpeed}`,
    `motion intensity: ${input.motionIntensity}`,
    `smoothness: ${input.smoothness}`,
    `lighting: ${input.lighting}`,
    `lens: ${input.lens}`,
    `color grade: ${input.colorGrade}`,
  ].join(", ");

  const consistencyLine = input.consistencyLock ? "identity and scene consistency locked across all frames" : "allow flexible variation";

  const refs = [
    ...(input.characterRefs ?? []),
    ...(input.locationRef ? [input.locationRef] : []),
  ].filter(Boolean);

  const prompt = [
    input.prompt,
    styleLine,
    consistencyLine,
    input.audioPrompt ? `audio intent: ${input.audioPrompt}` : "",
  ]
    .filter(Boolean)
    .join(". ");

  const payload: Record<string, unknown> = {
    prompt,
    duration: input.duration,
    aspect_ratio: input.ratio,
    mode: "pro",
    multi_shots: false,
    sound: Boolean(input.audioPrompt?.trim()),
    negative_prompt: input.negativePrompt || undefined,
    seed: input.seed ?? undefined,
  };

  if (refs.length > 0) {
    payload.image_urls = refs.slice(0, 2);
  }

  return payload;
}

