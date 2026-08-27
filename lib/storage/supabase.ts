import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { StorageProvider } from "./types";

export class SupabaseStorageProvider implements StorageProvider {
  private client: SupabaseClient | null = null;
  private url: string;

  constructor() {
    this.url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (this.url && key) {
      try {
        this.client = createClient(this.url, key, {
          auth: { persistSession: false },
        });
      } catch (err) {
        console.warn("[SupabaseStorageProvider] Failed to initialize client:", err);
      }
    }
  }

  private resolveBucketAndPath(bucket: string, rawPath: string): { bucket: string; path: string } {
    const cleanPath = rawPath.replace(/^\/+/, "").replace(/\\/g, "/");
    if (bucket) return { bucket, path: cleanPath };
    const parts = cleanPath.split("/");
    if (parts.length > 1 && ["images", "videos", "audio", "thumbnails", "media"].includes(parts[0].toLowerCase())) {
      return { bucket: parts[0], path: parts.slice(1).join("/") };
    }
    return { bucket: "images", path: cleanPath };
  }

  async upload(params: {
    bucket: string;
    path: string;
    body: Buffer | Uint8Array | string | Blob;
    contentType: string;
    cacheControl?: string;
  }): Promise<string> {
    if (!this.client) throw new Error("Supabase client is not configured");
    const { bucket, path } = this.resolveBucketAndPath(params.bucket, params.path);
    const { error } = await this.client.storage.from(bucket).upload(path, params.body, {
      contentType: params.contentType,
      cacheControl: params.cacheControl || "3600",
      upsert: true,
    });
    if (error) throw error;
    return this.getPublicUrl(bucket, path);
  }

  async download(params: { bucket: string; path: string; range?: string }) {
    if (!this.client) throw new Error("Supabase client is not configured");
    const { bucket, path } = this.resolveBucketAndPath(params.bucket, params.path);
    const { data, error } = await this.client.storage.from(bucket).download(path);
    if (error || !data) {
      throw new Error(`File not found in Supabase storage: ${bucket}/${path} (${error?.message || "unknown"})`);
    }

    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const totalSize = buffer.length;

    return {
      body: buffer,
      contentLength: totalSize,
      totalSize,
      contentType: data.type || "application/octet-stream",
      cacheControl: "public, max-age=31536000, immutable",
    };
  }

  async delete(params: { bucket: string; path: string }): Promise<void> {
    if (!this.client) return;
    const { bucket, path } = this.resolveBucketAndPath(params.bucket, params.path);
    await this.client.storage.from(bucket).remove([path]);
  }

  async exists(params: { bucket: string; path: string }): Promise<boolean> {
    if (!this.client) return false;
    const { bucket, path } = this.resolveBucketAndPath(params.bucket, params.path);
    try {
      const publicUrl = this.getPublicUrl(bucket, path);
      const res = await fetch(publicUrl, { method: "HEAD", signal: AbortSignal.timeout(3000) });
      if (res.ok) return true;
      const { data } = await this.client.storage.from(bucket).download(path);
      return Boolean(data);
    } catch {
      return false;
    }
  }

  getPublicUrl(bucket: string, path: string): string {
    const resolved = this.resolveBucketAndPath(bucket, path);
    if (this.client) {
      const { data } = this.client.storage.from(resolved.bucket).getPublicUrl(resolved.path);
      if (data?.publicUrl) return data.publicUrl;
    }
    const base = this.url.replace(/\/+$/, "");
    return `${base}/storage/v1/object/public/${resolved.bucket}/${resolved.path}`;
  }

  isStoredAssetUrl(url: string): boolean {
    return Boolean(url && (url.includes("supabase.co") || url.includes("/storage/v1/object/public/")));
  }

  async createSignedUploadUrl(params: {
    bucket: string;
    path: string;
    contentType: string;
    expiresIn?: number;
  }): Promise<{ signedUrl: string; publicUrl: string; key: string }> {
    if (!this.client) throw new Error("Supabase client is not configured");
    const { bucket, path } = this.resolveBucketAndPath(params.bucket, params.path);
    const { data, error } = await this.client.storage
      .from(bucket)
      .createSignedUploadUrl(path, { upsert: true });
    if (error || !data) throw new Error(error?.message || "Failed to create signed URL");
    return {
      signedUrl: data.signedUrl,
      publicUrl: this.getPublicUrl(bucket, path),
      key: `${bucket}/${path}`,
    };
  }
}
