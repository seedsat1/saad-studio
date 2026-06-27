import { getProvider } from "./providers/factory.js";
import { CONFIG } from "./config.js";
async function testProviders() {
    console.log("=== Saad Agent Model Provider Abstraction Layer Test ===");
    console.log("\nConfig settings:");
    console.log("Active Provider:", CONFIG.PROVIDER);
    console.log("Model Name:", CONFIG.MODEL_NAME);
    console.log("LM Studio Base URL:", CONFIG.LM_STUDIO_BASE_URL);
    console.log("Ollama Base URL:", CONFIG.OLLAMA_BASE_URL);
    // Test 1: Instantiate LM Studio provider
    console.log("\n--- Test 1: Instantiating LM Studio Provider ---");
    const lmConfig = {
        baseUrl: CONFIG.LM_STUDIO_BASE_URL,
        apiKey: CONFIG.LM_STUDIO_API_KEY,
        modelName: CONFIG.MODEL_NAME,
        temperature: CONFIG.TEMPERATURE,
    };
    const lmProvider = getProvider("lm-studio", lmConfig);
    console.log("Provider Name (should be 'LM Studio'):", lmProvider.name);
    console.log("Model Name:", lmProvider.model);
    // Test 2: Instantiate Ollama provider
    console.log("\n--- Test 2: Instantiating Ollama Provider ---");
    const ollamaConfig = {
        baseUrl: CONFIG.OLLAMA_BASE_URL,
        apiKey: CONFIG.OLLAMA_API_KEY,
        modelName: CONFIG.MODEL_NAME,
        temperature: CONFIG.TEMPERATURE,
    };
    const ollamaProvider = getProvider("ollama", ollamaConfig);
    console.log("Provider Name (should be 'Ollama'):", ollamaProvider.name);
    console.log("Model Name:", ollamaProvider.model);
    // Test 3: Load active provider from factory
    console.log("\n--- Test 3: Loading Active Provider ---");
    const activeConfig = {
        baseUrl: CONFIG.PROVIDER === "lm-studio" ? CONFIG.LM_STUDIO_BASE_URL : CONFIG.OLLAMA_BASE_URL,
        apiKey: CONFIG.PROVIDER === "lm-studio" ? CONFIG.LM_STUDIO_API_KEY : CONFIG.OLLAMA_API_KEY,
        modelName: CONFIG.MODEL_NAME,
        temperature: CONFIG.TEMPERATURE,
    };
    const activeProvider = getProvider(CONFIG.PROVIDER, activeConfig);
    console.log("Active Provider Name:", activeProvider.name);
    console.log("Active Provider Model:", activeProvider.model);
    console.log("\n=== Test Completed successfully ===");
}
testProviders().catch(console.error);
//# sourceMappingURL=test-providers.js.map