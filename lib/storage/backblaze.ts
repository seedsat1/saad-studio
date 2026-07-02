import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { StorageProvider } from "./types";

export class BackblazeProvider implements StorageProvider {
  private client: S3Client;
  private bucketName: string;
  private publicBaseUrl: string;

  constructor() {
    this.bucketName = process.env.B2_BUCKET || process.env.B2_BUCKET_NAME || process.env.R2_BUCKET || process.env.R2_BUCKET_NAME || "saadstudio-storage";
    
    let publicUrl = process.env.B2_PUBLIC_URL ||
                     process.env.B2_PUBLIC_BASE_URL ||
                     process.env.NEXT_PUBLIC_B2_PUBLIC_BASE_URL ||
                     process.env.NEXT_PUBLIC_B2_PUBLIC_URL ||
                     process.env.R2_PUBLIC_URL ||
                     process.env.R2_PUBLIC_BASE_URL ||
                     process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL ||
                     process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
                     "";

    if (!publicUrl || publicUrl.includes(".r2.dev") || publicUrl.includes("media.saadstudio.app")) {
      publicUrl = "https://saadstudio-storage.s3.eu-central-003.backblazeb2.com";
    }

    this.publicBaseUrl = publicUrl.replace(/\/+$/, "");

    this.client = new S3Client({
      region: process.env.B2_REGION || process.env.R2_REGION || "eu-central-003",
      endpoint: process.env.B2_ENDPOINT || process.env.R2_ENDPOINT || "https://s3.eu-central-003.backblazeb2.com",
      credentials: {
        accessKeyId: process.env.B2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.B2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || "",
      },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }

  private getObjectKey(bucket: string, path: string): string {
    const cleanPath = path.replace(/^\/+/, "").replace(/\\/g, "/");
    return bucket ? `${bucket}/${cleanPath}` : cleanPath;
  }

  async upload(params: {
    bucket: string;
    path: string;
    body: Buffer | Uint8Array | string | Blob;
    contentType: string;
    cacheControl?: string;
  }): Promise<string> {
    const key = this.getObjectKey(params.bucket, params.path);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: params.body,
        ContentType: params.contentType,
        CacheControl: params.cacheControl,
      })
    );
    return this.getPublicUrl(params.bucket, params.path);
  }

  async download(params: {
    bucket: string;
    path: string;
    range?: string;
  }) {
    const key = this.getObjectKey(params.bucket, params.path);
    
    // First run a HEAD request to get full headers/metadata
    const headResponse = await this.client.send(
      new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })
    );

    const getResponse = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Range: params.range,
      })
    );

    return {
      body: getResponse.Body,
      contentLength: getResponse.ContentLength ?? headResponse.ContentLength ?? 0,
      totalSize: headResponse.ContentLength ?? 0,
      contentType: getResponse.ContentType || headResponse.ContentType || "application/octet-stream",
      cacheControl: getResponse.CacheControl || headResponse.CacheControl || "public, max-age=31536000, immutable",
      etag: getResponse.ETag || headResponse.ETag || undefined,
      lastModified: getResponse.LastModified?.toUTCString() || headResponse.LastModified?.toUTCString() || undefined,
      contentRange: getResponse.ContentRange || undefined,
    };
  }

  async delete(params: { bucket: string; path: string }): Promise<void> {
    const key = this.getObjectKey(params.bucket, params.path);
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })
    );
  }

  async exists(params: { bucket: string; path: string }): Promise<boolean> {
    const key = this.getObjectKey(params.bucket, params.path);
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        })
      );
      return true;
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
    return `${this.publicBaseUrl}/${urlKey}`;
  }

  isStoredAssetUrl(url: string): boolean {
    return (
      url.includes("backblazeb2.com") ||
      url.includes("saadstudio-storage") ||
      url.startsWith(this.publicBaseUrl)
    );
  }

  async createSignedUploadUrl(params: {
    bucket: string;
    path: string;
    contentType: string;
    expiresIn?: number;
  }): Promise<{ signedUrl: string; publicUrl: string; key: string }> {
    const key = this.getObjectKey(params.bucket, params.path);
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: params.contentType,
    });

    const signedUrl = await getSignedUrl(this.client, command, {
      expiresIn: params.expiresIn ?? 300,
    });

    return {
      signedUrl,
      publicUrl: this.getPublicUrl(params.bucket, params.path),
      key,
    };
  }
}
