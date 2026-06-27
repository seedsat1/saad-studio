export interface Attachment {
  id: string;
  type: "image" | "pdf";
  name: string;
  mimeType: string;
  size: number;
  previewUrl: string;
  source: string; // base64 representation or URL
}
