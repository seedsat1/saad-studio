import prismadb from "../lib/prismadb";
import { processVideoPosterBatch } from "../lib/video-posters";

function numberArg(name: string, fallback: number): number {
  const prefix = `--${name}=`;
  const raw = process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function stringArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const batchSize = numberArg("batch", 5);
  const maxBatches = numberArg("max-batches", 1);
  const userId = stringArg("userId");
  const retryFailed = !process.argv.includes("--no-retry-failed");

  let totals = { scanned: 0, ready: 0, failed: 0, skipped: 0 };

  for (let batch = 1; batch <= maxBatches; batch += 1) {
    const result = await processVideoPosterBatch({ limit: batchSize, userId, retryFailed });
    totals = {
      scanned: totals.scanned + result.scanned,
      ready: totals.ready + result.ready,
      failed: totals.failed + result.failed,
      skipped: totals.skipped + result.skipped,
    };

    console.log(JSON.stringify({ batch, ...result }, null, 2));
    if (result.scanned === 0) break;
  }

  console.log(JSON.stringify({ done: true, totals }, null, 2));
}

main()
  .catch((error) => {
    console.error("[backfill-video-posters] failed", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prismadb.$disconnect().catch(() => {});
  });