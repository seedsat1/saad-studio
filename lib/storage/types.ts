export interface StorageProvider {
  upload(params: {
    bucket: string;
    path: string;
    body: Buffer | Uint8Array | string | Blob;
    contentType: string;
    cacheControl?: string;
  }): Promise<string>;

  download(params: {
    bucket: string;
    path: string;
    range?: string;
  }): Promise<{
    body: any;
    contentLength: number;
    totalSize: number;
    contentType: string;
    cacheControl: string;
    etag?: string;
    lastModified?: string;
    contentRange?: string;
  }>;

  delete(params: {
    bucket: string;
    path: string;
  }): Promise<void>;

  exists(params: {
    bucket: string;
    path: string;
  }): Promise<boolean>;

  getPublicUrl(bucket: string, path: string): string;

  isStoredAssetUrl(url: string): boolean;

  createSignedUploadUrl(params: {
    bucket: string;
    path: string;
    contentType: string;
    expiresIn?: number;
  }): Promise<{ signedUrl: string; publicUrl: string; key: string }>;
}
