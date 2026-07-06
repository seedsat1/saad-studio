import * as fs from "fs/promises";
import * as path from "path";
import { CONFIG } from "../../config.js";
import { EventBus } from "./event-bus.js";

export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  localPath: string;
  previewPath: string;
  source: "upload" | "clipboard" | "drag_drop";
  timestamp: number;
  workspaceId: string;
}

export class AttachmentManager {
  static getAttachmentsDir(): string {
    return path.join(CONFIG.PROJECT_ROOT, ".saad-agent", "attachments");
  }

  static async initialize(): Promise<void> {
    await fs.mkdir(this.getAttachmentsDir(), { recursive: true });
  }

  static async storeAttachment(
    filename: string,
    mimeType: string,
    dataBuffer: Buffer,
    source: "upload" | "clipboard" | "drag_drop",
    workspaceId: string
  ): Promise<Attachment> {
    await this.initialize();
    const id = `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const safeFilename = this.safeAttachmentFileName(filename, mimeType);
    const safeMimeType = String(mimeType || this.inferMimeType(safeFilename) || "application/octet-stream");
    const localPath = path.join(this.getAttachmentsDir(), `${id}-${safeFilename}`);
    
    await fs.writeFile(localPath, dataBuffer);

    const attachment: Attachment = {
      id,
      filename: safeFilename,
      mimeType: safeMimeType,
      size: dataBuffer.length,
      localPath,
      previewPath: localPath,
      source: source || "upload",
      timestamp: Date.now(),
      workspaceId: workspaceId || "default-workspace"
    };

    EventBus.publish("AttachmentReceived", { attachment });
    EventBus.publish("AttachmentStored", { attachment });

    return attachment;
  }

  private static safeAttachmentFileName(filename: string, mimeType: string): string {
    const raw = String(filename || "").trim();
    const fallbackExt = this.extensionFromMimeType(mimeType);
    const candidate = raw || `attachment-${Date.now()}${fallbackExt}`;
    const base = path.basename(candidate).replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_").trim();
    return base || `attachment-${Date.now()}${fallbackExt}`;
  }

  private static extensionFromMimeType(mimeType: string): string {
    const value = String(mimeType || "").toLowerCase();
    if (value.includes("markdown")) return ".md";
    if (value.startsWith("text/")) return ".txt";
    if (value.includes("json")) return ".json";
    if (value.includes("yaml")) return ".yaml";
    if (value.includes("pdf")) return ".pdf";
    return ".bin";
  }

  private static inferMimeType(filename: string): string {
    const ext = path.extname(filename || "").toLowerCase();
    if (ext === ".md" || ext === ".markdown") return "text/markdown";
    if (ext === ".txt") return "text/plain";
    if (ext === ".json") return "application/json";
    if (ext === ".yaml" || ext === ".yml") return "application/yaml";
    if (ext === ".html") return "text/html";
    if (ext === ".css") return "text/css";
    if (ext === ".js") return "text/javascript";
    if (ext === ".ts" || ext === ".tsx") return "text/typescript";
    if (ext === ".pdf") return "application/pdf";
    return "application/octet-stream";
  }
}
