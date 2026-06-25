import { MediaProvider } from "./types";

export class R2Provider implements MediaProvider {
  name = "r2";
  private rawR2Url: string;

  constructor() {
    this.rawR2Url = "https://pub-3e0355a14eda4ec78c6e81b217a9a399.r2.dev";
  }

  getPublicUrl(objectKey: string): string {
    const cleanKey = objectKey.replace(/^\/+/, "").replace(/\\/g, "/");
    const encodedKey = cleanKey
      .split("/")
      .filter(Boolean)
      .map(segment => encodeURIComponent(segment))
      .join("/");
    return `${this.rawR2Url}/${encodedKey}`;
  }

  async fetchPublic(objectKey: string, options?: { range?: string }): Promise<Response> {
    const url = this.getPublicUrl(objectKey);
    const headers: Record<string, string> = {};
    if (options?.range) {
      headers["Range"] = options.range;
    }
    return fetch(url, { headers, signal: AbortSignal.timeout(120000) });
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
