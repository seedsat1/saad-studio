export interface MediaProvider {
  name: string;
  getPublicUrl(objectKey: string): string;
  fetchPublic(objectKey: string, options?: { range?: string }): Promise<Response>;
  upload?(objectKey: string, body: Buffer | Uint8Array | string | Blob, contentType?: string): Promise<string>;
  exists?(objectKey: string): Promise<boolean>;
}
