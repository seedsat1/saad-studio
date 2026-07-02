import { MediaProvider } from "./types";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export class BackblazePublicProvider implements MediaProvider {
  name = "backblaze";
  private publicBaseUrl: string;
  private bucketName: string;
  private s3Client: S3Client;

  constructor() {
    this.bucketName = process.env.B2_BUCKET || process.env.B2_BUCKET_NAME || "saadstudio-storage";
    
    let publicUrl = process.env.B2_PUBLIC_URL ||
                     process.env.B2_PUBLIC_BASE_URL ||
                     process.env.NEXT_PUBLIC_B2_PUBLIC_BASE_URL ||
                     process.env.NEXT_PUBLIC_B2_PUBLIC_URL ||
                     "https://saadstudio-storage.s3.eu-central-003.backblazeb2.com";
    this.publicBaseUrl = publicUrl.replace(/\/+$/, "");

    this.s3Client = new S3Client({
      region: process.env.B2_REGION || "eu-central-003",
      endpoint: process.env.B2_ENDPOINT || "https://s3.eu-central-003.backblazeb2.com",
      credentials: {
        accessKeyId: process.env.B2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.B2_SECRET_ACCESS_KEY || "",
      },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }

  getPublicUrl(objectKey: string): string {
    const cleanKey = objectKey.replace(/^\/+/, "").replace(/\\/g, "/");
    const encodedKey = cleanKey
      .split("/")
      .filter(Boolean)
      .map(segment => encodeURIComponent(segment))
      .join("/");
    return `${this.publicBaseUrl}/${encodedKey}`;
  }

  async fetchPublic(objectKey: string, options?: { range?: string }): Promise<Response> {
    const url = this.getPublicUrl(objectKey);
    const headers: Record<string, string> = {};
    if (options?.range) {
      headers["Range"] = options.range;
    }
    return fetch(url, { headers, signal: AbortSignal.timeout(120000) });
  }

  async upload(objectKey: string, body: Buffer | Uint8Array | string | Blob, contentType?: string): Promise<string> {
    const cleanKey = objectKey.replace(/^\/+/, "").replace(/\\/g, "/");
    let uploadBody: any = body;
    if (body instanceof Blob) {
      uploadBody = Buffer.from(await body.arrayBuffer());
    }
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: cleanKey,
        Body: uploadBody,
        ContentType: contentType || "application/octet-stream",
        CacheControl: "public, max-age=2592000, immutable",
      })
    );
    return cleanKey;
  }

  async exists(objectKey: string): Promise<boolean> {
    const url = this.getPublicUrl(objectKey);
    try {
      const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000) });
      return res.ok;
    } catch {
      return false;
    }
  }
}
