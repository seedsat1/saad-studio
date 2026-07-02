export interface Attachment {
  id: string;
  type: "image" | "pdf" | "file" | "folder";
  name: string;
  mimeType: string;
  size: number;
  previewUrl: string;
  source: string; // base64 representation or URL
  detectedFileType?: string;
  originalFilename?: string;
  lineCount?: number;
  sourceKind?: "upload" | "clipboard" | "drag_drop" | "typed_long_input";
  smartLongInput?: boolean;
}
