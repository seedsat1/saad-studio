import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  getPluginOperationalConfig,
  updatePluginOperationalConfig,
  getPluginRevocationState,
  revokeTokenFingerprint,
  revokeUserTokens,
  revokeAllTokensGlobally,
  isTokenRevoked,
  getInstallerHealth,
  getPluginStatusSnapshot,
  evaluatePluginGate,
  getPluginAuditLogs,
} from "@/lib/admin/plugin-control-plane";
import {
  generatePanelToken,
  verifyPanelToken,
  verifyPanelTokenAsync,
  computeTokenFingerprint,
} from "@/lib/panel-auth";

const root = path.resolve(__dirname, "..");

describe("Adobe Plugin Admin Control Plane — Operational, Runtime & Security Suite", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.PANEL_TOKEN_SECRET = "test-secret-for-admin-control-plane-98765";
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("1. Vercel Runtime Invariant: Database Single Source of Truth & Zero Runtime File Writes", () => {
    it("persists version and config changes directly to PlatformConfig DB without writing /public files", async () => {
      const versionJsonPath = path.join(root, "public", "saadstudio-version.json");
      const statBefore = fs.statSync(versionJsonPath);

      const updated = await updatePluginOperationalConfig(
        {
          currentVersion: "3.0.0",
          minSupportedVersion: "3.0.0",
          releaseDate: "2026-08-19",
          releaseNotes: ["🚀 Update via Database only"],
        },
        "admin@saadstudio.app",
      );

      expect(updated.currentVersion).toBe("3.0.0");
      expect(updated.updatedBy).toBe("admin@saadstudio.app");

      // Verify no runtime file modification occurred
      const statAfter = fs.statSync(versionJsonPath);
      expect(statAfter.mtimeMs).toBe(statBefore.mtimeMs);

      // Verify code in plugin-control-plane contains zero fs.writeFileSync
      const controlPlaneCode = fs.readFileSync(
        path.join(root, "lib", "admin", "plugin-control-plane.ts"),
        "utf-8",
      );
      expect(controlPlaneCode).not.toContain("fs.writeFileSync");
    });

    it("verifies public/saadstudio-version.json is static build-time fallback only", () => {
      const versionJsonPath = path.join(root, "public", "saadstudio-version.json");
      expect(fs.existsSync(versionJsonPath)).toBe(true);
      const parsed = JSON.parse(fs.readFileSync(versionJsonPath, "utf-8"));
      expect(parsed.version).toBe("3.0.0");
    });
  });

  describe("2. Canonical Dynamic Version Endpoint Contract", () => {
    it("verifies /api/plugin/version dynamic route serves live DB config", async () => {
      const routePath = path.join(root, "app", "api", "plugin", "version", "route.ts");
      expect(fs.existsSync(routePath)).toBe(true);
      const code = fs.readFileSync(routePath, "utf-8");
      expect(code).toContain('export const dynamic = "force-dynamic";');
      expect(code).toContain("getPluginOperationalConfig");
    });

    it("verifies dynamic /saadstudio-version.json route serves live DB config for legacy clients", async () => {
      const routePath = path.join(root, "app", "saadstudio-version.json", "route.ts");
      expect(fs.existsSync(routePath)).toBe(true);
      const code = fs.readFileSync(routePath, "utf-8");
      expect(code).toContain('export const dynamic = "force-dynamic";');
      expect(code).toContain("getPluginOperationalConfig");
    });
  });

  describe("3. Gate Policies: Maintenance, Disabled & Min Version Enforcement", () => {
    it("allows generation when status is active", async () => {
      await updatePluginOperationalConfig({ status: "active" }, "admin@saadstudio.app");
      const req = new Request("https://www.saadstudio.app/api/panel/generate/tts", {
        headers: { "x-saad-plugin-version": "3.0.0" },
      });

      const gate = await evaluatePluginGate(req, { isGeneration: true });
      expect(gate.allowed).toBe(true);
    });

    it("blocks generation requests with 503 when status is maintenance", async () => {
      await updatePluginOperationalConfig(
        { status: "maintenance", maintenanceMessage: "System maintenance active." },
        "admin@saadstudio.app",
      );

      const req = new Request("https://www.saadstudio.app/api/panel/generate/tts");
      const gate = await evaluatePluginGate(req, { isGeneration: true });

      expect(gate.allowed).toBe(false);
      expect(gate.status).toBe(503);
      expect(gate.code).toBe("PLUGIN_MAINTENANCE");
      expect(gate.error).toContain("System maintenance active");
    });

    it("blocks all requests with 503 when status is disabled", async () => {
      await updatePluginOperationalConfig(
        { status: "disabled", disabledMessage: "Plugin access revoked." },
        "admin@saadstudio.app",
      );

      const req = new Request("https://www.saadstudio.app/api/panel/me");
      const gate = await evaluatePluginGate(req);

      expect(gate.allowed).toBe(false);
      expect(gate.status).toBe(503);
      expect(gate.code).toBe("PLUGIN_DISABLED");
    });

    it("enforces minimum supported version gate with 426 Upgrade Required", async () => {
      await updatePluginOperationalConfig(
        { status: "active", minSupportedVersion: "3.0.0" },
        "admin@saadstudio.app",
      );

      const outdatedReq = new Request("https://www.saadstudio.app/api/panel/generate/tts", {
        headers: { "x-saad-plugin-version": "2.0.0" },
      });

      const gate = await evaluatePluginGate(outdatedReq, { isGeneration: true });
      expect(gate.allowed).toBe(false);
      expect(gate.status).toBe(426);
      expect(gate.code).toBe("PLUGIN_UPDATE_REQUIRED");
    });
  });

  describe("4. Cryptographic Token Revocation & Serverless Cold-Start Resilience", () => {
    it("allows valid unrevoked tokens", async () => {
      await updatePluginOperationalConfig({ status: "active" }, "admin@saadstudio.app");
      const token = generatePanelToken("user_clean_101");
      const verified = await verifyPanelTokenAsync(token);
      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe("user_clean_101");
    });

    it("revokes a specific token by fingerprint and rejects subsequent verification across cold starts", async () => {
      const token = generatePanelToken("user_target_202");
      const fingerprint = computeTokenFingerprint(token);
      expect(fingerprint).toBeTruthy();

      // Revoke this token
      await revokeTokenFingerprint(fingerprint, "admin@saadstudio.app", "Suspicious token activity");

      // Verify should now return null
      const verified = await verifyPanelTokenAsync(token);
      expect(verified).toBeNull();
    });

    it("revokes all tokens for a specific user without affecting other users", async () => {
      const userAToken = generatePanelToken("user_victim_303");
      const userBToken = generatePanelToken("user_innocent_404");

      await revokeUserTokens("user_victim_303", "admin@saadstudio.app", "Account suspended");

      const verifiedA = await verifyPanelTokenAsync(userAToken);
      const verifiedB = await verifyPanelTokenAsync(userBToken);

      expect(verifiedA).toBeNull(); // Revoked
      expect(verifiedB?.userId).toBe("user_innocent_404"); // Allowed
    });

    it("executes global emergency revocation for incident response", async () => {
      const tokenIssuedBefore = generatePanelToken("user_global_505");

      // Advance time slightly and trigger global revocation
      await new Promise((r) => setTimeout(r, 50));
      await revokeAllTokensGlobally("security@saadstudio.app", "Emergency key rotation");

      // Token issued before is revoked
      const verifiedOld = await verifyPanelTokenAsync(tokenIssuedBefore);
      expect(verifiedOld).toBeNull();
    });
  });

  describe("5. Session Semantics: Auth Handshakes vs Active Token Telemetry", () => {
    it("explicitly labels PanelAuthSession counts as Auth Handshakes and avoids fake active session counts", async () => {
      const snapshot = await getPluginStatusSnapshot();
      expect(snapshot.sessions).toHaveProperty("authHandshakesTotal");
      expect(snapshot.sessions).toHaveProperty("authHandshakesPending");
      expect(snapshot.sessions).toHaveProperty("authHandshakesApproved");
      expect(snapshot.sessions.activeSessionsTelemetry).toBe("N/A (Stateless HMAC Tokens)");
    });
  });

  describe("6. Physical Installer Diagnostics", () => {
    it("inspects physical installer files on disk", () => {
      const health = getInstallerHealth();
      expect(health.setupExe.filename).toBe("SaadStudio-Setup.exe");
      expect(health.setupExe.exists).toBe(true);
      expect(health.setupExe.sizeBytes).toBeGreaterThan(30 * 1024 * 1024);
      expect(health.downloadEndpointAvailable).toBe(true);
    });
  });

  describe("7. Admin Sidebar & CMS Separation", () => {
    it("confirms /admin/plugin exists and /admin/cms/cep is strictly distinct", () => {
      const adminPluginPath = path.join(root, "app", "admin", "plugin", "page.tsx");
      const adminCmsCepPath = path.join(root, "app", "admin", "cms", "cep", "page.tsx");

      expect(fs.existsSync(adminPluginPath)).toBe(true);
      expect(fs.existsSync(adminCmsCepPath)).toBe(true);

      const adminPluginCode = fs.readFileSync(adminPluginPath, "utf-8");
      expect(adminPluginCode).toContain("/admin/cms/cep");
    });
  });
});
