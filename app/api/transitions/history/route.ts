import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { normalizeMediaUrl } from "@/lib/r2-storage";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const take = Math.min(Number(searchParams.get("take") ?? "50"), 100);
  const cursor = searchParams.get("cursor");

  const outputs = await prismadb.transitionOutput.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: {
      job: { select: { status: true, error: true, creditsCost: true } },
    },
  });

  const normalizedOutputs = outputs.map(output => ({
    ...output,
    url: normalizeMediaUrl(output.url) || output.url,
    inputAUrl: normalizeMediaUrl(output.inputAUrl) || output.inputAUrl,
    inputBUrl: normalizeMediaUrl(output.inputBUrl) || output.inputBUrl,
  }));

  const nextCursor = normalizedOutputs.length === take ? normalizedOutputs[normalizedOutputs.length - 1]?.id : null;
  return NextResponse.json({ outputs: normalizedOutputs, nextCursor });
}
