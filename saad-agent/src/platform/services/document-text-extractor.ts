import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as zlib from "zlib";
import { execFileSync } from "child_process";

export interface DocumentTextExtractionResult {
  text: string;
  metadataOnly: boolean;
  extractor: "text" | "pdf-basic" | "docx-xml" | "rtf-basic" | "unsupported";
  warning?: string;
}

export class DocumentTextExtractor {
  static extractFromPath(filePath: string, mimeType?: string): DocumentTextExtractionResult {
    const extension = path.extname(filePath || "").toLowerCase();
    const mime = String(mimeType || "").toLowerCase();

    if (this.isPlainText(extension, mime)) {
      return {
        text: fs.readFileSync(filePath, "utf8"),
        metadataOnly: false,
        extractor: "text"
      };
    }

    if (extension === ".docx" || mime.includes("wordprocessingml.document")) {
      const text = this.extractDocxText(filePath);
      return text
        ? { text, metadataOnly: false, extractor: "docx-xml" }
        : { text: "", metadataOnly: true, extractor: "docx-xml", warning: "DOCX text extraction produced no readable text." };
    }

    if (extension === ".rtf" || mime.includes("rtf")) {
      const text = this.extractRtfText(filePath);
      return text
        ? { text, metadataOnly: false, extractor: "rtf-basic" }
        : { text: "", metadataOnly: true, extractor: "rtf-basic", warning: "RTF text extraction produced no readable text." };
    }

    if (extension === ".pdf" || mime.includes("pdf")) {
      const text = this.extractPdfText(filePath);
      return text
        ? { text, metadataOnly: false, extractor: "pdf-basic" }
        : { text: "", metadataOnly: true, extractor: "pdf-basic", warning: "PDF text extraction produced no readable text." };
    }

    return { text: "", metadataOnly: true, extractor: "unsupported", warning: "Unsupported document type." };
  }

  static canAttempt(filePath: string, mimeType?: string): boolean {
    const extension = path.extname(filePath || "").toLowerCase();
    const mime = String(mimeType || "").toLowerCase();
    return this.isPlainText(extension, mime)
      || extension === ".pdf"
      || extension === ".docx"
      || extension === ".rtf"
      || mime.includes("pdf")
      || mime.includes("wordprocessingml.document")
      || mime.includes("rtf");
  }

  private static isPlainText(extension: string, mime: string): boolean {
    if (mime.startsWith("text/")) return true;
    if (mime.includes("json") || mime.includes("yaml") || mime.includes("xml") || mime.includes("markdown")) return true;
    return /\.(md|markdown|txt|json|yaml|yml|toml|xml|html|css|js|jsx|ts|tsx|py|sh|ps1|csv)$/i.test(extension);
  }

  private static extractDocxText(filePath: string): string {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "saad-docx-"));
    try {
      const script = [
        "$ErrorActionPreference = 'Stop'",
        `Expand-Archive -LiteralPath ${this.psString(filePath)} -DestinationPath ${this.psString(tempDir)} -Force`
      ].join("; ");
      execFileSync("powershell.exe", ["-NoProfile", "-Command", script], { stdio: "ignore", timeout: 15000 });
      const documentXml = path.join(tempDir, "word", "document.xml");
      if (!fs.existsSync(documentXml)) return "";
      const xml = fs.readFileSync(documentXml, "utf8");
      const pieces = [...xml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)]
        .map((match) => this.decodeXml(match[1] || "").trim())
        .filter(Boolean);
      return pieces.join(" ").replace(/\s+/g, " ").trim();
    } catch {
      return "";
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  private static extractRtfText(filePath: string): string {
    try {
      return fs.readFileSync(filePath, "utf8")
        .replace(/\\'[0-9a-fA-F]{2}/g, " ")
        .replace(/\\[a-zA-Z]+-?\d* ?/g, " ")
        .replace(/[{}]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    } catch {
      return "";
    }
  }

  private static extractPdfText(filePath: string): string {
    try {
      const buffer = fs.readFileSync(filePath);
      const binary = buffer.toString("binary");
      const parts: string[] = [];
      const streamPattern = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
      let match: RegExpExecArray | null;

      while ((match = streamPattern.exec(binary)) !== null) {
        const stream = Buffer.from(match[1] || "", "binary");
        const candidates = [stream];
        try {
          candidates.push(zlib.inflateSync(stream));
        } catch {}

        for (const candidate of candidates) {
          const decoded = candidate.toString("latin1");
          this.collectPdfLiteralStrings(decoded, parts);
          this.collectPdfHexStrings(decoded, parts);
        }
      }

      if (!parts.length) {
        this.collectPdfLiteralStrings(binary, parts);
        this.collectPdfHexStrings(binary, parts);
      }

      return parts.join(" ").replace(/\s+/g, " ").trim();
    } catch {
      return "";
    }
  }

  private static collectPdfLiteralStrings(input: string, parts: string[]): void {
    const matches = input.match(/\((?:\\.|[^\\)]){2,}\)/g) || [];
    for (const item of matches) {
      const text = item.slice(1, -1)
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t")
        .replace(/\\([\\()])/g, "$1")
        .trim();
      if (this.looksReadable(text)) parts.push(text);
    }
  }

  private static collectPdfHexStrings(input: string, parts: string[]): void {
    const matches = input.match(/<([0-9A-Fa-f\s]{8,})>/g) || [];
    for (const item of matches) {
      const hex = item.replace(/[<>\s]/g, "");
      if (hex.length % 2 !== 0) continue;
      const buffer = Buffer.from(hex, "hex");
      const text = this.decodeUtf16Be(buffer).replace(/\u0000/g, "").trim()
        || buffer.toString("latin1").trim();
      if (this.looksReadable(text)) parts.push(text);
    }
  }

  private static looksReadable(text: string): boolean {
    const cleaned = text.replace(/\s+/g, " ").trim();
    if (cleaned.length < 2) return false;
    const readableChars = cleaned.replace(/[^\p{L}\p{N}\s.,;:!?'"()[\]{}_\-\/@#%&+*=]/gu, "");
    return readableChars.length / Math.max(cleaned.length, 1) > 0.65;
  }

  private static decodeXml(value: string): string {
    return value
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, "\"")
      .replace(/&apos;/g, "'");
  }

  private static decodeUtf16Be(buffer: Buffer): string {
    if (buffer.length < 2) return "";
    const chars: string[] = [];
    const start = buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff ? 2 : 0;
    for (let index = start; index + 1 < buffer.length; index += 2) {
      const code = ((buffer[index] ?? 0) << 8) | (buffer[index + 1] ?? 0);
      if (code > 0) chars.push(String.fromCharCode(code));
    }
    return chars.join("");
  }

  private static psString(value: string): string {
    return `'${value.replace(/'/g, "''")}'`;
  }
}
