import * as fs from "fs";
import installerFfmpeg from "@ffmpeg-installer/ffmpeg";

function makeExecutable(ffmpegPath: string) {
  try {
    fs.chmodSync(ffmpegPath, 0o755);
  } catch {}
}

export async function getFfmpegPath(): Promise<string> {
  try {
    const staticMod = await import("ffmpeg-static");
    const staticPath = (staticMod.default || staticMod) as unknown as string;
    if (staticPath) {
      makeExecutable(staticPath);
      return staticPath;
    }
  } catch {}

  const installerPath = installerFfmpeg.path;
  if (!installerPath) {
    throw new Error("FFmpeg binary is not available in this deployment.");
  }
  makeExecutable(installerPath);
  return installerPath;
}
