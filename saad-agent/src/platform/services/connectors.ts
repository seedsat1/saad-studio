import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { CONFIG } from "../../config.js";

export type AuthType = 'api_key' | 'oauth2' | 'pat' | 'local_credentials';
export type ConnectionStatus = 'connected' | 'disconnected' | 'failed';
export type HealthStatus = 'healthy' | 'unhealthy' | 'unknown';
export type PermissionLevel = 'disconnected' | 'read_only' | 'read_download' | 'read_write' | 'administrator';

export interface Connector {
  id: string;
  name: string;
  version: string;
  provider: string;
  capabilities: string[];
  authenticationType: AuthType;
  permissions: PermissionLevel;
  connectionStatus: ConnectionStatus;
  healthStatus: HealthStatus;
  lastSync?: number;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  authenticate(credentials: any): Promise<void>;
  refresh(): Promise<void>;
  execute(action: string, params: any): Promise<any>;
  validatePermissions(): Promise<boolean>;
  getCapabilities(): string[];
}

// TODO: Before production packaging, secrets should migrate to Electron safeStorage / OS Keychain or authenticated encryption (e.g. AES-GCM). No production release should rely only on unauthenticated AES-CBC.
export class SecretsManager {
  private static store: Map<string, string> = new Map();
  private static ENCRYPTION_KEY = crypto.scryptSync("saad-secret-pass", "salt", 32);
  private static IV_LENGTH = 16;
  private static loaded = false;
  private static secretsFile = () => path.join(CONFIG.PROJECT_ROOT, ".saad-agent", "secrets", "encrypted-secrets.json");

  private static loadStore(): void {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const raw = fs.readFileSync(this.secretsFile(), "utf8");
      const parsed = JSON.parse(raw);
      this.store = new Map(Object.entries(parsed).map(([key, value]) => [key, String(value)]));
    } catch {
      this.store = new Map();
    }
  }

  private static persistStore(): void {
    const filePath = this.secretsFile();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(Object.fromEntries(this.store), null, 2), "utf8");
  }

  static setSecret(key: string, value: string): void {
    this.loadStore();
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv("aes-256-cbc", this.ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(value, "utf8", "hex");
    encrypted += cipher.final("hex");
    this.store.set(key, iv.toString("hex") + ":" + encrypted);
    this.persistStore();
  }

  static getSecret(key: string): string | undefined {
    this.loadStore();
    const raw = this.store.get(key);
    if (!raw) return undefined;
    const parts = raw.split(":");
    const ivHex = parts[0];
    const encryptedText = parts[1];
    if (!ivHex || !encryptedText) return undefined;
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", this.ENCRYPTION_KEY, iv);
    let decrypted: string = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  static clearSecret(key: string): void {
    this.loadStore();
    this.store.delete(key);
    this.persistStore();
  }
}

export class ConnectorRegistry {
  private static connectors: Map<string, Connector> = new Map();

  static register(connector: Connector) {
    this.connectors.set(connector.id, connector);
  }

  static unregister(id: string) {
    this.connectors.delete(id);
  }

  static getConnector(id: string): Connector | undefined {
    return this.connectors.get(id);
  }

  static getConnectors(): Connector[] {
    return Array.from(this.connectors.values());
  }

  static discover(capability: string): Connector[] {
    return this.getConnectors().filter(c => c.capabilities.includes(capability));
  }
}

export class BaseConnector implements Connector {
  id: string;
  name: string;
  version: string = "1.0.0";
  provider: string;
  capabilities: string[];
  authenticationType: AuthType;
  permissions: PermissionLevel = "read_only";
  connectionStatus: ConnectionStatus = "disconnected";
  healthStatus: HealthStatus = "unknown";
  lastSync?: number;

  constructor(id: string, name: string, provider: string, capabilities: string[], authType: AuthType) {
    this.id = id;
    this.name = name;
    this.provider = provider;
    this.capabilities = capabilities;
    this.authenticationType = authType;
  }

  async connect(): Promise<void> {
    this.connectionStatus = "connected";
    this.healthStatus = "healthy";
    this.lastSync = Date.now();
  }

  async disconnect(): Promise<void> {
    this.connectionStatus = "disconnected";
    this.healthStatus = "unknown";
    SecretsManager.clearSecret(this.id);
  }

  async authenticate(credentials: any): Promise<void> {
    if (!credentials) throw new Error("Credentials required for authentication");
    SecretsManager.setSecret(this.id, JSON.stringify(credentials));
    this.connectionStatus = "connected";
    this.healthStatus = "healthy";
    this.lastSync = Date.now();
  }

  async refresh(): Promise<void> {
    if (this.connectionStatus === "connected") {
      this.healthStatus = "healthy";
      this.lastSync = Date.now();
    }
  }

  async execute(action: string, params: any): Promise<any> {
    if (this.connectionStatus !== "connected") {
      throw new Error(`Connector ${this.name} is not connected`);
    }
    const lowerAction = action.toLowerCase();
    if (lowerAction.includes("write") || lowerAction.includes("delete") || lowerAction.includes("update") || lowerAction.includes("upload") || lowerAction.includes("deploy")) {
      throw new Error("Write and deployment operations are disabled in this phase.");
    }
    return { success: true, data: `Mock read execution for action "${action}"` };
  }

  async validatePermissions(): Promise<boolean> {
    return this.permissions !== "disconnected";
  }

  getCapabilities(): string[] {
    return this.capabilities;
  }
}

export class GitHubConnector extends BaseConnector {
  constructor() {
    super("github", "GitHub Connector", "GitHub", ["repo-read", "pull-request-read"], "pat");
  }
}

export class GitLabConnector extends BaseConnector {
  constructor() {
    super("gitlab", "GitLab Connector", "GitLab", ["repo-read", "ci-read"], "pat");
  }
}

export class GmailConnector extends BaseConnector {
  constructor() {
    super("gmail", "Gmail Connector", "Google", ["mail-read", "search-emails"], "oauth2");
  }
}

export class GoogleDriveConnector extends BaseConnector {
  constructor() {
    super("google-drive", "Google Drive Connector", "Google", ["file-read", "list-files"], "oauth2");
  }
}

export class HuggingFaceConnector extends BaseConnector {
  constructor() {
    super("huggingface", "Hugging Face Connector", "Hugging Face", ["model-read", "dataset-read"], "api_key");
  }
}

export class VercelConnector extends BaseConnector {
  constructor() {
    super("vercel", "Vercel Connector", "Vercel", ["project-read", "deployment-read"], "api_key");
  }
}

export class BackblazeB2Connector extends BaseConnector {
  constructor() {
    super("backblaze-b2", "Backblaze B2 Connector", "Backblaze", ["bucket-read", "file-download"], "api_key");
  }
}

export class SupabaseConnector extends BaseConnector {
  constructor() {
    super("supabase", "Supabase Connector", "Supabase", ["db-read", "schema-read"], "api_key");
  }
}

export class RenderConnector extends BaseConnector {
  constructor() {
    super("render", "Render Connector", "Render", ["service-read", "log-read"], "api_key");
  }
}

export class NamecheapConnector extends BaseConnector {
  constructor() {
    super("namecheap", "Namecheap Connector", "Namecheap", ["domain-read", "dns-read"], "api_key");
  }
}

// Automatically register all connectors
ConnectorRegistry.register(new GitHubConnector());
ConnectorRegistry.register(new GitLabConnector());
ConnectorRegistry.register(new GmailConnector());
ConnectorRegistry.register(new GoogleDriveConnector());
ConnectorRegistry.register(new HuggingFaceConnector());
ConnectorRegistry.register(new VercelConnector());
ConnectorRegistry.register(new BackblazeB2Connector());
ConnectorRegistry.register(new SupabaseConnector());
ConnectorRegistry.register(new RenderConnector());
ConnectorRegistry.register(new NamecheapConnector());
