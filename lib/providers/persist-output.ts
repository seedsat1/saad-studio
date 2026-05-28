/** Convert a provider result URL (data: or remote http(s):) into a
 *  permanent R2-hosted URL.
 *
 *  - data: URLs are decoded to Buffer and uploaded via uploadBufferToStorage
 *  - remote URLs are streamed through uploadUrlToStorage
 *  - when R2 isn't configured, the original URL is returned as-is so the
 *    panel still shows the result (best-effort persistence) */

import { uploadBufferToStorage, uploadUrlToStorage, isStorageConfigured } from "../r2-storage";

export async function persistProviderUrl(params: {
  url: string;
  userId: string;
  generationId: string;
  assetType: "IMAGE" | "VIDEO";
}): Promise<string> {
  const { url, userId, generationId, assetType } = params;
  if (!isStorageConfigured()) return url;

  // data: URL → decode and upload as buffer
  if (url.startsWith("data:")) {
    const m = url.match(/^data:([^;]+);base64,(.+)$/);
    if (!m) return url;
    const buffer = Buffer.from(m[2], "base64");
    const persisted = await uploadBufferToStorage({
      buffer,
      contentType: m[1],
      userId,
      assetType,
      generationId,
    });
    return persisted ?? url;
  }

  // Remote http(s) URL → stream + upload
  if (url.startsWith("http://") || url.startsWith("https://")) {
    const persisted = await uploadUrlToStorage({
      remoteUrl: url,
      userId,
      assetType,
      generationId,
    });
    return persisted ?? url;
  }

  return url;
}
