import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { pollKieTaskOnce } from "@/lib/variations-adapter";

const KIE_API_KEY = process.env.KIE_API_KEY ?? "";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const job = await prismadb.variationJob.findUnique({
    where: { id },
    include: { outputs: { orderBy: { createdAt: "asc" } } },
  });

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (job.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Poll pending outputs
  const processingOutputs = job.outputs.filter(
    (o) => o.generationStatus === "processing" && o.kieTaskId,
  );

  const pollResults = await Promise.allSettled(
    processingOutputs.map(async (output) => {
      if (!output.kieTaskId) return null;
      const result = await pollKieTaskOnce(KIE_API_KEY, output.kieTaskId);

      if (result.state === "success" && result.urls?.[0]) {
        await prismadb.variationOutput.update({
          where: { id: output.id },
          data: {
            assetUrl: result.urls[0],
            thumbnailUrl: result.urls[0],
            generationStatus: "completed",
          },
        });
        return { id: output.id, status: "completed", url: result.urls[0] };
      }

      if (result.state === "fail") {
        await prismadb.variationOutput.update({
          where: { id: output.id },
          data: { generationStatus: "failed" },
        });
        return { id: output.id, status: "failed", error: result.error };
      }

      return { id: output.id, status: "processing" };
    }),
  );

  void pollResults;

  // Reload fresh outputs
  const freshOutputs = await prismadb.variationOutput.findMany({
    where: { jobId: id },
    orderBy: { createdAt: "asc" },
  });

  const completedCount = freshOutputs.filter((o) => o.generationStatus === "completed").length;
  const failedCount = freshOutputs.filter((o) => o.generationStatus === "failed").length;
  const processingCount = freshOutputs.filter((o) => o.generationStatus === "processing").length;
  const totalCount = freshOutputs.length;

  let jobStatus = job.status;
  if (processingCount === 0) {
    jobStatus = failedCount === totalCount ? "failed"
      : completedCount === totalCount ? "completed"
      : "partially_completed";

    if (job.status !== jobStatus) {
      await prismadb.variationJob.update({
        where: { id },
        data: { status: jobStatus },
      });
    }
  }

  return NextResponse.json({
    job: { ...job, status: jobStatus },
    outputs: freshOutputs,
    completedCount,
    failedCount,
    processingCount,
    totalCount,
  });
}
