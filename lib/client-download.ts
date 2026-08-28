/**
 * Universal Mobile & Desktop Media Downloader
 * 
 * Prevents the annoying iOS Safari black document preview screen ("فتح في المعاينة / asset.jpg")
 * by using the native Web Share API (navigator.share) with File objects on mobile devices,
 * allowing users to directly tap "Save Image" or "Save Video" to their Camera Roll / Photos library.
 * 
 * On desktop (Mac / Windows / Linux), triggers clean, silent blob anchor downloads.
 */

export interface DownloadOptions {
  title?: string;
  fallbackExt?: string;
  mimeType?: string;
}

/**
 * Checks if the current client is a mobile device (iOS / iPadOS / Android)
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * Normalizes file extension and MIME type
 */
function resolveMimeAndExt(filename: string, blobType?: string, fallbackExt = ".png"): { mimeType: string; ext: string } {
  const lower = filename.toLowerCase();
  
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || blobType?.includes("jpeg") || blobType?.includes("jpg")) {
    return { mimeType: "image/jpeg", ext: ".jpg" };
  }
  if (lower.endsWith(".png") || blobType?.includes("png")) {
    return { mimeType: "image/png", ext: ".png" };
  }
  if (lower.endsWith(".webp") || blobType?.includes("webp")) {
    return { mimeType: "image/webp", ext: ".webp" };
  }
  if (lower.endsWith(".mp4") || blobType?.includes("mp4")) {
    return { mimeType: "video/mp4", ext: ".mp4" };
  }
  if (lower.endsWith(".mp3") || blobType?.includes("mpeg") || blobType?.includes("mp3")) {
    return { mimeType: "audio/mpeg", ext: ".mp3" };
  }
  if (lower.endsWith(".wav") || blobType?.includes("wav")) {
    return { mimeType: "audio/wav", ext: ".wav" };
  }
  if (lower.endsWith(".glb") || blobType?.includes("gltf") || blobType?.includes("octet-stream")) {
    return { mimeType: "model/gltf-binary", ext: ".glb" };
  }

  const cleanFallback = fallbackExt.startsWith(".") ? fallbackExt : `.${fallbackExt}`;
  return {
    mimeType: blobType || "application/octet-stream",
    ext: cleanFallback,
  };
}

/**
 * Universal download helper function
 */
export async function downloadMediaFile(
  url: string,
  rawFilename: string,
  options?: DownloadOptions
): Promise<boolean> {
  if (!url || typeof window === "undefined") return false;

  try {
    const fallbackExt = options?.fallbackExt || (url.includes(".mp4") ? ".mp4" : url.includes(".mp3") ? ".mp3" : ".png");
    let blob: Blob | null = null;

    // 1. Fetch media as Blob
    if (url.startsWith("data:") || url.startsWith("blob:")) {
      try {
        const res = await fetch(url);
        if (res.ok) blob = await res.blob();
      } catch (err) {
        console.warn("[downloadMediaFile] Local fetch failed:", err);
      }
    }

    if (!blob) {
      const isBackblaze = url.includes("backblazeb2.com") || url.includes("saadstudio-storage");
      if (!isBackblaze) {
        try {
          const directRes = await fetch(url, { mode: "cors" });
          if (directRes.ok) blob = await directRes.blob();
        } catch {
          // Fallback to internal proxy/download route if CORS blocks direct CDN fetch
        }
      }
    }

    if (!blob) {
      try {
        const proxyUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(rawFilename)}`;
        const proxyRes = await fetch(proxyUrl);
        if (proxyRes.ok) blob = await proxyRes.blob();
      } catch (err) {
        console.warn("[downloadMediaFile] Proxy fetch failed:", err);
      }
    }

    if (!blob) {
      // Last-resort fallback
      window.open(url, "_blank");
      return true;
    }

    const { mimeType, ext } = resolveMimeAndExt(rawFilename, blob.type, fallbackExt);
    let finalFilename = rawFilename.replace(/[\\/:*?"<>|]/g, "_").trim() || "media_asset";
    if (!finalFilename.toLowerCase().endsWith(ext)) {
      finalFilename = `${finalFilename}${ext}`;
    }

    const file = new File([blob], finalFilename, { type: mimeType });

    // 2. On Mobile (iOS Safari, Android Chrome), use Web Share API to directly save to Photos/Files
    if (isMobileDevice() && typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: options?.title || finalFilename,
          });
          return true;
        }
      } catch (shareErr: any) {
        // User cancelled or aborted the native share sheet
        if (shareErr?.name === "AbortError") {
          return true;
        }
        console.warn("[downloadMediaFile] Native share error, proceeding with anchor download:", shareErr);
      }
    }

    // 3. Desktop / Standard Anchor Download
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = finalFilename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
    return true;
  } catch (err) {
    console.error("[downloadMediaFile] Execution error:", err);
    return false;
  }
}
