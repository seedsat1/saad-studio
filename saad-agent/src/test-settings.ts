import * as fs from "fs/promises";
import * as http from "http";
import * as path from "path";
import { CONFIG, setProjectRoot } from "./config.js";
import { SettingsManager } from "./production/settings-manager.js";
import { ModelClient } from "./platform/services/model-client.js";
import { ReasoningEngine } from "./platform/services/reasoning-engine.js";
import { SkillRegistry } from "./skills/skill-registry.js";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function startModelsServer(): Promise<{ url: string; getLastChatModel: () => string | undefined; close: () => Promise<void> }> {
  let lastChatModel: string | undefined;
  const server = http.createServer((req, res) => {
    if (req.url === "/v1/models") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ data: [{ id: "test-coder", owned_by: "lm-studio", context_window: 65536 }] }));
      return;
    }
    if (req.url === "/v1/chat/completions" && req.method === "POST") {
      let body = "";
      req.on("data", chunk => { body += chunk; });
      req.on("end", () => {
        try {
          lastChatModel = JSON.parse(body).model;
        } catch {}
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ choices: [{ message: { content: "{\"ok\":true}" } }] }));
      });
      return;
    }
    res.writeHead(404);
    res.end();
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Unable to bind test server.");
      resolve({
        url: `http://127.0.0.1:${address.port}/v1`,
        getLastChatModel: () => lastChatModel,
        close: () => new Promise<void>((done) => server.close(() => done())),
      });
    });
  });
}

async function runTests() {
  console.log("=== Saad Agent Settings Persistence & Runtime Wiring Tests ===");
  const originalRoot = CONFIG.PROJECT_ROOT;
  const tempWorkspace = path.join(process.cwd(), "temp-test-settings-workspace");
  const server = await startModelsServer();
  const originalChatCompletion = ModelClient.chatCompletion;

  try {
    await fs.rm(tempWorkspace, { recursive: true, force: true });
    await fs.mkdir(tempWorkspace, { recursive: true });
    setProjectRoot(tempWorkspace);
    SettingsManager.clearCache();

    const defaults = await SettingsManager.getSettings();
    defaults.providers.push({
      id: "test-provider",
      name: "Test Provider",
      type: "local",
      endpointUrl: server.url,
      enabled: true,
      isDefault: true,
      priority: 0,
      fallbackProvider: "lm-studio",
      healthStatus: "unknown",
    });
    defaults.models.Coding = {
      role: "Coding",
      providerId: "test-provider",
      modelName: "test-coder",
      temperature: 0.42,
      maxTokens: 1234,
      detectedContextWindow: 32000,
      streaming: false,
      timeoutMs: 5000,
      retryCount: 1,
    };
    await SettingsManager.replaceSettings(defaults);
    await SettingsManager.saveProviderSecret("test-provider", "super-secret-test-key");

    SettingsManager.clearCache();
    const reloaded = await SettingsManager.getSettings();
    assert(reloaded.models.Coding.modelName === "test-coder", "Model role settings did not persist.");
    assert(Boolean(reloaded.providers.find(p => p.id === "test-provider")?.apiKeySecretRef), "Provider secret reference was not stored.");
    const settingsJson = await fs.readFile(path.join(tempWorkspace, ".saad-agent", "settings.json"), "utf8");
    assert(!settingsJson.includes("super-secret-test-key"), "Plain API key leaked into settings.json.");

    const testedProvider = await SettingsManager.testProviderConnection("test-provider");
    assert(testedProvider.healthStatus === "online", "Provider test connection did not return online.");
    assert(typeof testedProvider.latencyMs === "number", "Provider latency was not recorded.");
    assert(Boolean(testedProvider.lastTestedAt), "Provider last tested timestamp was not recorded.");
    assert(Boolean(testedProvider.lastSuccessfulConnectionAt), "Provider last successful connection timestamp was not recorded.");

    const discoveredProvider = await SettingsManager.discoverProviderModels("test-provider");
    assert(discoveredProvider.modelCount === 1, "Provider model count was not recorded.");
    assert(discoveredProvider.discoveredModels?.[0]?.id === "test-coder", "Provider model discovery did not parse /v1/models.");
    assert(discoveredProvider.discoveredModels?.[0]?.contextWindow === 65536, "Provider model context window was not detected.");

    const discoveredSettings = await SettingsManager.getSettings();
    discoveredSettings.models.Coding = {
      ...discoveredSettings.models.Coding,
      providerId: "test-provider",
      modelName: "test-coder",
    };
    const detectedContext = discoveredProvider.discoveredModels?.[0]?.contextWindow;
    if (detectedContext) discoveredSettings.models.Coding.detectedContextWindow = detectedContext;
    await SettingsManager.replaceSettings(discoveredSettings);

    const runtime = await SettingsManager.getModelRuntime("Coding");
    const directResponse = await ModelClient.chatCompletion("Return JSON.", "Use selected model.", runtime.model.modelName, runtime);
    assert(directResponse.includes("ok"), "Direct inference request did not return the provider response.");
    assert(server.getLastChatModel() === "test-coder", "Direct inference did not use the selected discovered model.");

    let captured: any = null;
    ModelClient.chatCompletion = async (systemPrompt, userPrompt, modelName, runtime) => {
      captured = { systemPrompt, userPrompt, modelName, runtime };
      return JSON.stringify({ ok: true });
    };
    const reasoning = await ReasoningEngine.requestCompletion({
      role: "Coding",
      systemPrompt: "Return JSON.",
      userPrompt: "Test runtime settings.",
    });
    assert(reasoning.isValidJson === true, "Reasoning response was not parsed as JSON.");
    assert(captured?.modelName === "test-coder", "ReasoningEngine did not use persisted model name.");
    assert(captured?.runtime?.provider?.id === "test-provider", "ReasoningEngine did not use persisted provider.");
    assert(captured?.runtime?.model?.temperature === 0.42, "Model role temperature was not applied.");
    assert(captured?.runtime?.apiKey === "super-secret-test-key", "Encrypted provider secret was not supplied to runtime.");

    await SettingsManager.setSkillEnabled("skill-react", false);
    const matches = SkillRegistry.matchSkillsForTask("Refactor React hooks in App.tsx", ["App.tsx"]);
    assert(!matches.some(match => match.skill.id === "skill-react"), "Disabled skill was still matched.");

    const customSkill = await SettingsManager.upsertCustomSkill({
      id: "custom-safe-skill",
      name: "Custom Safe Skill",
      version: "1.0.0",
      domain: "Custom",
      description: "Safe custom skill for tests.",
      triggers: { keywords: ["safe-custom"], filePatterns: ["*.safe"] },
      capabilities: ["safe-guidance"],
      promptTemplates: { systemRules: ["Use safe guidance only."] },
      validationRules: [],
      recommendedTools: ["fs-tool"],
      supportedAgents: ["Reviewer Agent"],
    });
    assert(customSkill.id === "custom-safe-skill", "Custom skill was not persisted.");

    let rejectedUnsafe = false;
    try {
      await SettingsManager.upsertCustomSkill({
        id: "unsafe-skill",
        name: "Unsafe Skill",
        version: "1.0.0",
        domain: "Unsafe",
        description: "contains command",
        triggers: { keywords: ["unsafe"], filePatterns: [] },
        capabilities: ["exec"],
        promptTemplates: { systemRules: ["run child_process exec"] },
        recommendedTools: ["shell"],
        supportedAgents: ["Agent"],
      });
    } catch {
      rejectedUnsafe = true;
    }
    assert(rejectedUnsafe, "Unsafe custom skill manifest was not rejected.");

    console.log("Settings persistence, provider secrets, model role runtime, provider tests, and skill management passed.");
  } finally {
    ModelClient.chatCompletion = originalChatCompletion;
    await server.close();
    setProjectRoot(originalRoot);
    SettingsManager.clearCache();
    await fs.rm(tempWorkspace, { recursive: true, force: true });
  }
}

runTests().catch((err) => {
  console.error("Settings tests failed:", err);
  process.exit(1);
});
