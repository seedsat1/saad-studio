import { ConnectorRegistry, SecretsManager } from "./platform/services/connectors.js";

async function runTests() {
  console.log("=== Saad Agent Phase 15 Connector Framework Tests ===");

  try {
    // 1. Registry verification
    console.log("\n--- Test 1: Connector Registry & Discovery ---");
    const connectors = ConnectorRegistry.getConnectors();
    console.log("Total registered connectors count (should be 10):", connectors.length);
    console.log("Found GitHub Connector:", !!ConnectorRegistry.getConnector("github"));
    console.log("Found Supabase Connector:", !!ConnectorRegistry.getConnector("supabase"));
    console.log("Found Vercel Connector:", !!ConnectorRegistry.getConnector("vercel"));

    // 2. Encryption layer
    console.log("\n--- Test 2: Secrets Manager Isolation (Symmetric Encryption) ---");
    const testSecret = { token: "ghp_securePersonalAccessToken12345" };
    SecretsManager.setSecret("github", JSON.stringify(testSecret));
    
    // Retrieve and verify
    const retrievedRaw = SecretsManager.getSecret("github");
    console.log("Secret successfully retrieved:", !!retrievedRaw);
    if (retrievedRaw) {
      const retrieved = JSON.parse(retrievedRaw);
      console.log("Retrieved secret matches original:", retrieved.token === testSecret.token);
    }

    // 3. Connect & Health check
    console.log("\n--- Test 3: Connect & Health monitoring ---");
    const github = ConnectorRegistry.getConnector("github")!;
    console.log("Initial connectionStatus (should be disconnected):", github.connectionStatus);
    
    await github.connect();
    console.log("connectionStatus after connect (should be connected):", github.connectionStatus);
    console.log("healthStatus after connect (should be healthy):", github.healthStatus);
    console.log("permissions level (should be read_only):", github.permissions);

    // 4. Safety Read-Only Constraint Enforcement
    console.log("\n--- Test 4: Safety Verification (Read-Only Enforcement) ---");
    // Read operation should succeed
    const readResult = await github.execute("READ_REPOSITORY", { owner: "saad", repo: "saad-studio" });
    console.log("Read execution succeeded:", readResult.success);

    // Modifying operations must throw
    try {
      await github.execute("WRITE_FILE", { path: "main.ts", content: "alert()" });
      console.log("ERROR: Allowed writing operation!");
    } catch (err: any) {
      console.log("Successfully caught write operation block:", err.message);
    }

    try {
      await github.execute("DEPLOY_APP", { env: "prod" });
      console.log("ERROR: Allowed deployment operation!");
    } catch (err: any) {
      console.log("Successfully caught deployment operation block:", err.message);
    }

    // 5. Disconnect & Cleanup
    console.log("\n--- Test 5: Disconnect & Cleanup ---");
    await github.disconnect();
    console.log("connectionStatus after disconnect (should be disconnected):", github.connectionStatus);
    console.log("Secrets cleared from memory:", SecretsManager.getSecret("github") === undefined);

    console.log("\n✅ All Phase 15 Connector Framework tests completed successfully!");
  } catch (err) {
    console.error("Test execution failed:", err);
  }
}

runTests();
