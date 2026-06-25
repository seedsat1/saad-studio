import { StorageProvider } from "./types";

export class R2Provider implements StorageProvider {
  private rawR2Url: string;

  constructor() {
    this.rawR2Url = "https://pub-3e0355a14eda4ec78c6e81b217a9a399.r2.dev";
  }

  getObjectKey(bucket: string, path: string): string {
    const cleanPath = path.replace(/^\/+/, "").replace(/\\/g, "/");
    return bucket ? `${bucket}/${cleanPath}` : cleanPath;
  }

  async upload(): Promise<string> {
    throw new Error("Cloudflare R2 is read-only (Legacy Provider)");
  }

  async download(params: {
    bucket: string;
    path: string;
    range?: string;
  }) {
    const key = this.getObjectKey(params.bucket, params.path);
    const url = `${this.rawR2Url}/${key}`;

    const headers: Record<string, string> = {};
    if (params.range) {
      headers["Range"] = params.range;
    }

    const response = await fetch(url, { headers });

    if (!response.ok && response.status !== 206) {
      throw new Error(`File not found in legacy R2 storage: ${key}`);
    }

    // To find totalSize: if it's 206, the Content-Range header is in format "bytes start-end/total"
    let totalSize = Number(response.headers.get("Content-Length") || 0);
    const contentRange = response.headers.get("Content-Range");
    if (contentRange) {
      const match = contentRange.match(/\/(\d+)/);
      if (match?.[1]) {
        totalSize = Number(match[1]);
      }
    }

    return {
      body: response.body,
      contentLength: Number(response.headers.get("Content-Length") || 0),
      totalSize,
      contentType: response.headers.get("Content-Type") || "application/octet-stream",
      cacheControl: response.headers.get("Cache-Control") || "public, max-age=31536000, immutable",
      etag: response.headers.get("ETag") || undefined,
      lastModified: response.headers.get("Last-Modified") || undefined,
      contentRange: contentRange || undefined,
    };
  }

  async delete(): Promise<void> {
    throw new Error("Cloudflare R2 is read-only (Legacy Provider)");
  }

  async exists(params: { bucket: string; path: string }): Promise<boolean> {
    const key = this.getObjectKey(params.bucket, params.path);
    const url = `${this.rawR2Url}/${key}`;
    try {
      const response = await fetch(url, { method: "HEAD" });
      return response.ok;
    } catch {
      return false;
    }
  }

  getPublicUrl(bucket: string, path: string): string {
    const key = this.getObjectKey(bucket, path);
    const urlKey = key
      .split("/")
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    return `${this.rawR2Url}/${urlKey}`;
  }

  isStoredAssetUrl(url: string): boolean {
    return (
      (url.includes("pub-") && url.includes(".r2.dev")) ||
      url.includes("media.saadstudio.app")
    );
  }

  async createSignedUploadUrl(): Promise<{ signedUrl: string; publicUrl: string; key: string }> {
    throw new Error("Cloudflare R2 is read-only (Legacy Provider)");
  }
}
