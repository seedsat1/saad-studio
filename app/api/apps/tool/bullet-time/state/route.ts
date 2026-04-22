import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

function inferPlan(stripePriceId?: string | null, hasSubscription?: boolean) {
  const id = (stripePriceId ?? "").toLowerCase();
  if (id.includes("max") || id.includes("ultra")) return "Max";
  if (id.includes("pro") || hasSubscription) return "Pro";
  if (id.includes("starter") || id.includes("basic")) return "Starter";
  return "Free";
}

const dayAgo = () => new Date(Date.now() - 24 * 60 * 60 * 1000);

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const since = dayAgo();

    const [user, subscription, sceneRunning, sceneCompleted, audioRunning, audioCompleted, imageRunning, imageCompleted] =
      await Promise.all([
        prismadb.user.findUnique({
          where: { id: userId },
          select: { creditBalance: true },
        }),
        prismadb.userSubscription.findUnique({
          where: { userId },
          select: { stripePriceId: true, stripeSubscriptionId: true },
        }),
        prismadb.generation.count({
          where: { userId, assetType: "VIDEO", mediaUrl: { startsWith: "task:" } },
        }),
        prismadb.generation.count({
          where: {
            userId,
            assetType: "VIDEO",
            mediaUrl: { not: null },
            NOT: { mediaUrl: { startsWith: "task:" } },
            createdAt: { gte: since },
          },
        }),
        prismadb.generation.count({
          where: { userId, assetType: "AUDIO", mediaUrl: { startsWith: "task:" } },
        }),
        prismadb.generation.count({
          where: {
            userId,
            assetType: "AUDIO",
            mediaUrl: { not: null },
            NOT: { mediaUrl: { startsWith: "task:" } },
            createdAt: { gte: since },
          },
        }),
        prismadb.generation.count({
          where: { userId, assetType: "IMAGE", mediaUrl: { startsWith: "task:" } },
        }),
        prismadb.generation.count({
          where: {
            userId,
            assetType: "IMAGE",
            mediaUrl: { not: null },
            NOT: { mediaUrl: { startsWith: "task:" } },
            createdAt: { gte: since },
          },
        }),
      ]);

    const plan = inferPlan(subscription?.stripePriceId, Boolean(subscription?.stripeSubscriptionId));

    return NextResponse.json({
      projectName: "Bullet Time Studio",
      credits: Math.max(0, Math.floor(user?.creditBalance ?? 0)),
      plan,
      renderQueue: sceneRunning,
      jobs: {
        scene: { running: sceneRunning, completedToday: sceneCompleted },
        audio: { running: audioRunning, completedToday: audioCompleted },
        image: { running: imageRunning, completedToday: imageCompleted },
      },
      modelRouting: {
        script: "GPT-5.4 / GPT-5.4-mini",
        images: "Nano Banana + Nano Banana Edit",
        video: "Kling 3 + Seedance 2",
        voice: "eleven_v3 + PVC",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load bullet-time state.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
