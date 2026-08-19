import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { generatePanelToken, verifyPanelToken } from "@/lib/panel-auth";
import { calculateTtsCredits, countAudioScriptCharacters } from "@/lib/pricing";

const root = path.resolve(__dirname, "..");

describe("Adobe CEP Security, Pricing & Version Consistency Suite", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.PANEL_TOKEN_SECRET = "test-panel-secret-key-1234567890-secure";
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("A. Panel Token Minting & Cryptographic Verification", () => {
    it("generates a valid stateless HMAC panel token for a given user", () => {
      const token = generatePanelToken("user_subscriber_123");
      expect(token).toMatch(/^ssp_[A-Za-z0-9_-]+_[A-Za-z0-9_-]+$/);

      const verified = verifyPanelToken(token);
      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe("user_subscriber_123");
    });

    it("rejects token when signature is tampered", () => {
      const token = generatePanelToken("user_subscriber_123");
      const parts = token.split("_");
      // Alter signature
      const tamperedSignature = parts[parts.length - 1].slice(0, -2) + "xx";
      const tamperedToken = `${parts.slice(0, -1).join("_")}_${tamperedSignature}`;

      const verified = verifyPanelToken(tamperedToken);
      expect(verified).toBeNull();
    });

    it("rejects token when payload is tampered to impersonate another user", () => {
      const token = generatePanelToken("user_normal_123");
      const parts = token.split("_");
      const rawPayload = Buffer.from(parts[1], "base64url").toString("utf8");
      const parsed = JSON.parse(rawPayload);
      parsed.userId = "user_admin_999";
      const tamperedPayloadB64 = Buffer.from(JSON.stringify(parsed)).toString("base64url");
      const tamperedToken = `ssp_${tamperedPayloadB64}_${parts[2]}`;

      const verified = verifyPanelToken(tamperedToken);
      expect(verified).toBeNull();
    });

    it("rejects expired panel tokens", () => {
      // Mock Date.now() to issue token in the past
      const pastTime = Date.now() - 31 * 24 * 60 * 60 * 1000; // 31 days ago
      vi.spyOn(Date, "now").mockReturnValue(pastTime);
      const oldToken = generatePanelToken("user_expired_123");

      // Restore time
      vi.restoreAllMocks();
      const verified = verifyPanelToken(oldToken);
      expect(verified).toBeNull();
    });

    it("enforces strict user isolation across multiple minted tokens", () => {
      const tokenA = generatePanelToken("user_alpha");
      const tokenB = generatePanelToken("user_beta");

      expect(verifyPanelToken(tokenA)?.userId).toBe("user_alpha");
      expect(verifyPanelToken(tokenB)?.userId).toBe("user_beta");
      expect(verifyPanelToken(tokenA)?.userId).not.toBe(verifyPanelToken(tokenB)?.userId);
    });

    it("rejects hardcoded dev token in production environment", () => {
      process.env.NODE_ENV = "production";
      const devToken = "ssp_dev_token_12345";
      const verified = verifyPanelToken(devToken);
      expect(verified).toBeNull();
    });
  });

  describe("B. Adobe CEP TTS Canonical Dynamic Pricing Invariants", () => {
    it("computes exact canonical TTS credit prices matching website Audio Suite", () => {
      expect(calculateTtsCredits(1)).toBe(1);
      expect(calculateTtsCredits(100)).toBe(1);
      expect(calculateTtsCredits(250)).toBe(1);
      expect(calculateTtsCredits(500)).toBe(2);
      expect(calculateTtsCredits(627)).toBe(3);
      expect(calculateTtsCredits(1000)).toBe(4);
      expect(calculateTtsCredits(2000)).toBe(7);
      expect(calculateTtsCredits(5000)).toBe(17);
    });

    it("normalizes Arabic and English text identical to canonical pricing core", () => {
      const arabicText = "   مرحباً بكم في سعد ستوديو لإنتاج الفيديو والذكاء الاصطناعي   \r\n";
      const count = countAudioScriptCharacters(arabicText);
      expect(count).toBe("مرحباً بكم في سعد ستوديو لإنتاج الفيديو والذكاء الاصطناعي".length);
      expect(calculateTtsCredits(arabicText)).toBe(calculateTtsCredits(count));
    });

    it("verifies panel TTS route code uses canonical calculateTtsCredits and countAudioScriptCharacters", () => {
      const ttsRoutePath = path.join(root, "app", "api", "panel", "generate", "tts", "route.ts");
      const code = fs.readFileSync(ttsRoutePath, "utf-8");

      expect(code).toContain('import { calculateTtsCredits, countAudioScriptCharacters } from "@/lib/pricing";');
      expect(code).not.toContain("const TTS_CREDIT_COST = 3;");
      expect(code).toContain("const characterCount = countAudioScriptCharacters(text);");
      expect(code).toContain("const creditsToCharge = calculateTtsCredits(characterCount);");
      expect(code).toContain("credits: creditsToCharge,");
      expect(code).toContain("creditsUsed: creditsToCharge,");
    });
  });

  describe("C. Download Path Traversal & Security", () => {
    it("verifies download endpoint prevents directory traversal attacks", () => {
      const downloadRoutePath = path.join(root, "app", "api", "download", "[filename]", "route.ts");
      const code = fs.readFileSync(downloadRoutePath, "utf-8");

      expect(code).toContain("filename.includes('..')");
      expect(code).toContain("filename.includes('/')");
      expect(code).toContain("filename.includes('\\\\')");
    });
  });

  describe("D. Plugin Version Consolidation & Metadata Alignment", () => {
    it("ensures version 3.0.0 is synchronized across manifest, version.json, and download UI", () => {
      const manifestPath = path.join(root, "adobe", "saadstudio-cep", "CSXS", "manifest.xml");
      const versionJsonPath = path.join(root, "public", "saadstudio-version.json");
      const downloadPagePath = path.join(root, "app", "download", "page.tsx");
      const pluginPagePath = path.join(root, "app", "(landing)", "(routes)", "plugin", "page.tsx");

      const manifest = fs.readFileSync(manifestPath, "utf-8");
      const versionJson = JSON.parse(fs.readFileSync(versionJsonPath, "utf-8"));
      const downloadPage = fs.readFileSync(downloadPagePath, "utf-8");
      const pluginPage = fs.readFileSync(pluginPagePath, "utf-8");

      expect(manifest).toContain('ExtensionBundleVersion="3.0.0"');
      expect(manifest).toContain("<Menu>Saad Studio 3.0.0</Menu>");
      expect(versionJson.version).toBe("3.0.0");
      expect(downloadPage).toContain("version: '3.0.0'");
      expect(pluginPage).toContain("Official Adobe Extension Suite");
      expect(pluginPage).toContain("liveVersion");
    });

    it("verifies the primary installer file exists on disk", () => {
      const installerPath = path.join(root, "public", "downloads", "SaadStudio-Setup.exe");
      expect(fs.existsSync(installerPath)).toBe(true);
      const stat = fs.statSync(installerPath);
      expect(stat.size).toBeGreaterThan(30 * 1024 * 1024); // ~33 MB
    });
  });
});
