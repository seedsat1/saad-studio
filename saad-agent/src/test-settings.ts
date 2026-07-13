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

function startModelsServer(): Promise<{
  url: string;
  getLastChatModel: () => string | undefined;
  getLastGeminiUrl: () => string | undefined;
  getLastGeminiBody: () => any;
  close: () => Promise<void>;
}> {
  let lastChatModel: string | undefined;
  let lastGeminiUrl: string | undefined;
  let lastGeminiBody: any;
  const server = http.createServer((req, res) => {
    if (req.url === "/v1/models") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ data: [{ id: "test-coder", owned_by: "lm-studio", context_window: 65536 }] }));
      return;
    }
    if (req.url?.startsWith("/v1beta/models?")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        models: [
          {
            name: "models/gemini-test-flash",
            displayName: "Gemini Test Flash",
            inputTokenLimit: 1000000,
            supportedGenerationMethods: ["generateContent"]
          }
        ]
      }));
      return;
    }
    if (req.url?.startsWith("/v1beta/models/gemini-test-flash:generateContent?") && req.method === "POST") {
      lastGeminiUrl = req.url;
      let body = "";
      req.on("data", chunk => { body += chunk; });
      req.on("end", () => {
        try {
          lastGeminiBody = JSON.parse(body);
        } catch {
          lastGeminiBody = null;
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: "Gemini test response" }] } }] }));
      });
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
        getLastGeminiUrl: () => lastGeminiUrl,
        getLastGeminiBody: () => lastGeminiBody,
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

    const legacySettings = SettingsManager.getDefaultSettings() as any;
    legacySettings.providers = legacySettings.providers.map((provider: any) =>
      provider.id === "lm-studio"
        ? {
            ...provider,
            discoveredModels: [{ id: "qwen/qwen3-coder-30b", name: "qwen/qwen3-coder-30b", contextWindow: 32768 }],
            modelCount: 1,
          }
        : provider
    );
    legacySettings.models.Coding = {
      ...legacySettings.models.Coding,
      providerId: "lm-studio",
      modelName: "qwen/qwen3-coder-30b",
    };
    delete legacySettings.models.Chat;
    await fs.mkdir(path.join(tempWorkspace, ".saad-agent"), { recursive: true });
    await fs.writeFile(path.join(tempWorkspace, ".saad-agent", "settings.json"), JSON.stringify(legacySettings, null, 2), "utf8");
    SettingsManager.clearCache();
    const migratedLegacySettings = await SettingsManager.getSettings();
    assert(migratedLegacySettings.models.Chat.modelName === "qwen/qwen3-coder-30b", "Missing legacy Chat role should inherit an existing Coding model.");

    legacySettings.models.Chat = {
      role: "Chat",
      providerId: "lm-studio",
      modelName: "lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF",
      temperature: 0.3,
      maxTokens: 8192,
      detectedContextWindow: 32768,
      streaming: true,
      timeoutMs: 120000,
      retryCount: 1,
    };
    await fs.writeFile(path.join(tempWorkspace, ".saad-agent", "settings.json"), JSON.stringify(legacySettings, null, 2), "utf8");
    SettingsManager.clearCache();
    const repairedInvalidChatSettings = await SettingsManager.getSettings();
    assert(repairedInvalidChatSettings.models.Chat.modelName === "qwen/qwen3-coder-30b", "Invalid legacy Chat model should be repaired to a discovered provider model.");

    const defaults = await SettingsManager.getSettings();
    defaults.providers.push({
      id: "test-provider",
      name: "Test Provider",
      type: "cloud",
      endpointUrl: server.url,
      enabled: false,
      isDefault: true,
      priority: 0,
      fallbackProvider: "gemini",
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
    defaults.models.Chat = {
      role: "Chat",
      providerId: "test-provider",
      modelName: "test-coder",
      temperature: 0.33,
      maxTokens: 777,
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

    await SettingsManager.saveProviderSecret("gemini", "gemini-secret-test-key");
    SettingsManager.clearCache();
    const afterGeminiSecret = await SettingsManager.getSettings();
    const savedGeminiProvider = afterGeminiSecret.providers.find(p => p.id === "gemini");
    assert(savedGeminiProvider?.enabled === true, "Saving a Gemini API key should enable the Gemini provider.");
    assert(savedGeminiProvider?.apiKeySecretRef === "provider:gemini:api-key", "Gemini API key secret reference was not stored.");

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

    const localBlockedSettings = await SettingsManager.getSettings();
    localBlockedSettings.providers = localBlockedSettings.providers.map(provider =>
      provider.id === "test-provider" || provider.id === "gemini"
        ? { ...provider, enabled: false }
        : provider.id === "lm-studio"
          ? { ...provider, enabled: true }
          : provider
    );
    localBlockedSettings.models.Coding = {
      ...localBlockedSettings.models.Coding,
      providerId: "lm-studio",
      modelName: "qwen/qwen3-coder-30b",
    };
    await SettingsManager.replaceSettings(localBlockedSettings);
    SettingsManager.clearCache();
    const localCodingRuntime = await SettingsManager.getModelRuntime("Coding");
    assert(localCodingRuntime.provider.id === "lm-studio", "Local-first runtime policy should allow LM Studio for Coding.");
    assert(localCodingRuntime.model.modelName === "qwen/qwen3-coder-30b", "Local-first runtime policy should keep the selected LM Studio model.");

    const disabledGeminiSettings = await SettingsManager.getSettings();
    disabledGeminiSettings.providers = disabledGeminiSettings.providers.map(provider =>
      provider.id === "gemini"
        ? { ...provider, enabled: false, isDefault: true }
        : provider.id === "test-provider"
          ? { ...provider, enabled: false, isDefault: false }
          : provider.id === "lm-studio"
            ? { ...provider, enabled: true, isDefault: false }
            : { ...provider, isDefault: false }
    );
    disabledGeminiSettings.models.Chat = {
      ...disabledGeminiSettings.models.Chat,
      providerId: "gemini",
      modelName: "gemini-test-flash",
    };
    await SettingsManager.replaceSettings(disabledGeminiSettings);
    SettingsManager.clearCache();
    const sanitizedDisabledGeminiSettings = await SettingsManager.getSettings();
    assert(!sanitizedDisabledGeminiSettings.providers.find(provider => provider.id === "gemini")?.isDefault, "Disabled Gemini must not remain the default provider.");
    const disabledGeminiFallbackRuntime = await SettingsManager.getModelRuntime("Chat");
    assert(disabledGeminiFallbackRuntime.provider.id === "lm-studio", "Disabled Gemini model mapping should fall back to the configured local-first runtime.");
    assert(disabledGeminiFallbackRuntime.model.modelName === "qwen/qwen3-coder-30b", "Disabled Gemini fallback should use a discovered local model instead of contacting Gemini.");

    const restoredCloudSettings = await SettingsManager.getSettings();
    restoredCloudSettings.providers = restoredCloudSettings.providers.map(provider =>
      provider.id === "test-provider"
        ? { ...provider, enabled: true, isDefault: true }
        : provider.id === "lm-studio"
          ? { ...provider, enabled: false, isDefault: false }
          : { ...provider, isDefault: false }
    );
    restoredCloudSettings.models.Coding = {
      ...restoredCloudSettings.models.Coding,
      providerId: "test-provider",
      modelName: "test-coder",
    };
    restoredCloudSettings.models.Chat = {
      ...restoredCloudSettings.models.Chat,
      providerId: "test-provider",
      modelName: "test-coder",
    };
    await SettingsManager.replaceSettings(restoredCloudSettings);

    const geminiRuntime = {
      provider: {
        id: "gemini",
        name: "Gemini",
        type: "cloud" as const,
        endpointUrl: server.url.replace(/\/v1$/, "/v1beta"),
        enabled: true,
        isDefault: false,
        priority: 1,
        healthStatus: "unknown" as const,
      },
      model: {
        role: "Coding" as const,
        providerId: "gemini",
        modelName: "gemini-test-flash",
        temperature: 0.2,
        maxTokens: 321,
        streaming: false,
        timeoutMs: 5000,
        retryCount: 0,
      },
      apiKey: "gemini-secret-test-key",
    };
    const geminiResponse = await ModelClient.chatCompletion("Gemini system.", "Gemini user.", "gemini-test-flash", geminiRuntime);
    assert(geminiResponse === "Gemini test response", "Gemini response text was not parsed.");
    assert(server.getLastGeminiUrl()?.includes("key=gemini-secret-test-key"), "Gemini request did not pass API key as query parameter.");
    assert(server.getLastGeminiBody()?.systemInstruction?.parts?.[0]?.text === "Gemini system.", "Gemini systemInstruction was not sent.");
    assert(server.getLastGeminiBody()?.contents?.[0]?.parts?.[0]?.text === "Gemini user.", "Gemini user prompt was not sent.");
    assert(server.getLastGeminiBody()?.generationConfig?.maxOutputTokens === 321, "Gemini maxOutputTokens was not mapped.");

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

    captured = null;
    const chatReasoning = await ReasoningEngine.requestCompletion({
      role: "Chat",
      systemPrompt: "Return JSON.",
      userPrompt: "Test chat role runtime settings.",
    });
    assert(chatReasoning.isValidJson === true, "Chat role reasoning response was not parsed as JSON.");
    assert(captured?.modelName === "test-coder", "Chat role did not use persisted model name.");
    assert(captured?.runtime?.provider?.id === "test-provider", "Chat role did not use persisted provider.");
    assert(captured?.runtime?.model?.temperature === 0.33, "Chat role temperature was not applied.");

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
