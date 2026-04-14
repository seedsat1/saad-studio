import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";

export async function GET() {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
  const generations = await prismadb.generation.findMany({
    orderBy: { createdAt: "desc" },
    take: 60,
    include: { user: { select: { email: true } } },
  });

  return NextResponse.json(
    generations.map((g) => ({
      id: g.id,
      userEmail: g.user.email,
      prompt: g.prompt,
      mediaUrl: g.mediaUrl,
      assetType: g.assetType,
      modelUsed: g.modelUsed,
      cost: g.cost,
      createdAt: g.createdAt.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      flagged: g.isFlagged,
    }))
  );
  } catch {
    return NextResponse.json([]);
  }
}
