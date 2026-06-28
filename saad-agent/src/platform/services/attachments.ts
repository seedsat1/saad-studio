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
    const localPath = path.join(this.getAttachmentsDir(), `${id}-${filename}`);
    
    await fs.writeFile(localPath, dataBuffer);

    const attachment: Attachment = {
      id,
      filename,
      mimeType,
      size: dataBuffer.length,
      localPath,
      previewPath: localPath,
      source,
      timestamp: Date.now(),
      workspaceId
    };

    EventBus.publish("AttachmentReceived", { attachment });
    EventBus.publish("AttachmentStored", { attachment });

    return attachment;
  }
}
