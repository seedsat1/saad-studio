import sharp from "sharp";
import path from "path";
import { promises as fs } from "fs";
import { uploadBuffer } from "@/lib/storage";

/**
 * Central image watermarking utility for Saad Studio.
 *
 * Composites the Saad Studio logo onto every generated image at
 * bottom-right, 12 % of the shorter dimension, 85 % opacity.
 *
 * All endpoint code calls one function — future design changes live
 * in this file only. Guarded by `SAAD_WATERMARK_ENABLED` env var.
 */

const LOGO_PATH = path.join(process.cwd(), "public", "logo-saad-transparent.png");
const LOGO_MARGIN_RATIO = 0.04;
const LOGO_SIZE_RATIO = 0.12;
const LOGO_OPACITY = 0.85;
const WATERMARK_ASSET_TYPE = "image";

let cachedLogoBuffer: Buffer | null = null;
let cachedLogoLoadPromise: Promise<Buffer | null> | null = null;

function isEnabled(): boolean {
  const flag = String(process.env.SAAD_WATERMARK_ENABLED ?? "true").trim().toLowerCase();
  return flag !== "false" && flag !== "0" && flag !== "off";
}

async function loadLogoBuffer(): Promise<Buffer | null> {
  if (cachedLogoBuffer) return cachedLogoBuffer;
  if (cachedLogoLoadPromise) return cachedLogoLoadPromise;
  cachedLogoLoadPromise = (async () => {
    try {
      const raw = await fs.readFile(LOGO_PATH);
      cachedLogoBuffer = raw;
      return raw;
    } catch (err) {
      console.error("[watermark] failed to load logo file:", err);
      return null;
    } finally {
      cachedLogoLoadPromise = null;
    }
  })();
  return cachedLogoLoadPromise;
}

/**
 * Download an image, composite the Saad Studio logo, upload the result
 * to R2 storage, and return the new public URL. On any failure the
 * original URL is returned — never break a successful generation.
 */
export async function applyImageWatermark(
  originalUrl: string,
  opts: { userId?: string; generationId?: string; skip?: boolean } = {}
): Promise<string> {
  if (!originalUrl || opts.skip || !isEnabled()) return originalUrl;
  if (!/^https?:\/\//i.test(originalUrl)) return originalUrl;

  try {
    const logo = await loadLogoBuffer();
    if (!logo) return originalUrl;

    const res = await fetch(originalUrl);
    if (!res.ok) {
      console.warn(`[watermark] fetch ${res.status} for ${originalUrl}`);
      return originalUrl;
    }
    const originalBuf = Buffer.from(await res.arrayBuffer());

    const meta = await sharp(originalBuf).metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    if (width < 128 || height < 128) return originalUrl;

    const shorter = Math.min(width, height);
    const logoTargetWidth = Math.max(48, Math.round(shorter * LOGO_SIZE_RATIO));
    const margin = Math.max(8, Math.round(shorter * LOGO_MARGIN_RATIO));

    const resizedLogo = await sharp(logo)
      .resize({ width: logoTargetWidth, withoutEnlargement: false })
      .ensureAlpha()
      .composite([{
        input: Buffer.from([255, 255, 255, Math.round(255 * LOGO_OPACITY)]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: "dest-in",
      }])
      .png()
      .toBuffer();

    const logoMeta = await sharp(resizedLogo).metadata();
    const logoHeight = logoMeta.height ?? logoTargetWidth;

    const top = Math.max(0, height - logoHeight - margin);
    const left = Math.max(0, width - logoTargetWidth - margin);
    const outputBuffer = await sharp(originalBuf)
      .composite([{ input: resizedLogo, top, left }])
      .toBuffer();

    const contentType = `image/${meta.format ?? "png"}`;
    const userId = opts.userId || "saad-watermark";
    const generationId = opts.generationId || `wm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    const uploadedUrl = await uploadBuffer({
      buffer: outputBuffer,
      contentType,
      userId,
      assetType: WATERMARK_ASSET_TYPE,
      generationId,
    });

    return uploadedUrl || originalUrl;
  } catch (err) {
    console.error("[watermark] apply failed, returning original URL:", err);
    return originalUrl;
  }
}

/** Watermark many URLs in parallel; each falls back to original on failure. */
export async function applyImageWatermarkMany(
  urls: (string | null | undefined)[],
  opts: { userId?: string; generationIdPrefix?: string } = {}
): Promise<string[]> {
  const clean = urls.filter((u): u is string => Boolean(u));
  return Promise.all(
    clean.map((url, i) =>
      applyImageWatermark(url, {
        userId: opts.userId,
        generationId: opts.generationIdPrefix ? `${opts.generationIdPrefix}-${i}` : undefined,
      })
    )
  );
}
