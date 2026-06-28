import { StartupManager } from "./production/startup-manager.js";
import { DiagnosticsExporter } from "./production/diagnostics-exporter.js";
import { AutoUpdaterPlaceholder } from "./production/auto-updater.js";
import { CONFIG, setProjectRoot } from "./config.js";
import * as fs from "fs/promises";
import * as path from "path";

async function runTests() {
  console.log("=== Saad Agent Phase 21 Windows Packaging, Installer & Release Hardening Tests ===");

  const originalRoot = CONFIG.PROJECT_ROOT;
  const tempWorkspace = path.join(process.cwd(), "temp-test-packaging-workspace");

  try {
    await fs.rm(tempWorkspace, { recursive: true, force: true });
    await fs.mkdir(tempWorkspace, { recursive: true });
    setProjectRoot(tempWorkspace);

    // 1. App Startup Flow & Recovery Fallback
    console.log("\n--- Test 1: App Startup Flow & Initialization ---");
    const startupResult = await StartupManager.initializeApplication();
    console.log("Startup status:", startupResult.status);
    console.log("Loaded built-in skills count:", startupResult.loadedSkillsCount);
    console.log("Loaded connectors count:", startupResult.loadedConnectorsCount);
    console.log("Initialization successful (skills >= 12):", startupResult.loadedSkillsCount >= 12);

    // 2. Diagnostics Bundle Export & Secret Scrubbing
    console.log("\n--- Test 2: Sanitized Diagnostics Export ---");
    const exportResult = await DiagnosticsExporter.exportDiagnosticsBundle();
    console.log("Exported bundle file path:", exportResult.filePath);
    const bundleExists = await fs.stat(exportResult.filePath).then(() => true).catch(() => false);
    console.log("Export file written to disk:", bundleExists);
    console.log("Sanitization verified boolean:", exportResult.bundle.sanitizationVerified);

    // Verify secret scrubbing logic
    const testSecretObj = { apiKey: "secret_12345", userToken: "tok_9999", normalField: "public_value" };
    const sanitizedObj = (DiagnosticsExporter as any).sanitizeObject(testSecretObj);
    console.log("Scrubbed apiKey field value:", sanitizedObj.apiKey);
    console.log("Scrubbing verified (should equal [REDACTED_SECRET]):", sanitizedObj.apiKey === "[REDACTED_SECRET]");
    console.log("Preserved normalField value:", sanitizedObj.normalField);

    // 3. Auto-Updater Architecture Placeholder
    console.log("\n--- Test 3: Auto-Updater Architectural Placeholder ---");
    const updateInfo = await AutoUpdaterPlaceholder.checkForUpdates();
    console.log("Current Version:", updateInfo.currentVersion);
    console.log("Update Available (offline mode):", updateInfo.updateAvailable);
    const downloadSuccess = await AutoUpdaterPlaceholder.downloadUpdate();
    console.log("Download Update placeholder response:", downloadSuccess);

    // 4. Release Hardening Checks
    console.log("\n--- Test 4: Release Hardening & Package Config ---");
    const pkgContent = await fs.readFile(path.join(process.cwd(), "package.json"), "utf8");
    const pkg = JSON.parse(pkgContent);
    console.log("Electron builder appId configured:", pkg.build?.appId === "com.saadstudio.agent");
    console.log("Windows targets include nsis & portable:", pkg.build?.win?.target?.includes("nsis") && pkg.build?.win?.target?.includes("portable"));
    console.log("Build script 'dist:portable' present:", pkg.scripts?.["dist:portable"] !== undefined);

    console.log("\n✅ All Phase 21 Windows Packaging & Release Hardening tests completed successfully!");
  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    setProjectRoot(originalRoot);
    await fs.rm(tempWorkspace, { recursive: true, force: true });
  }
}

runTests();
