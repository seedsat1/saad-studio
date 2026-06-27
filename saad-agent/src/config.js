export const CONFIG = {
    PROVIDER: process.env["SAAD_AGENT_PROVIDER"] || "lm-studio", // 'lm-studio' or 'ollama'
    MODEL_NAME: process.env["SAAD_AGENT_MODEL"] || "lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF",
    PROJECT_ROOT: process.env["SAAD_AGENT_PROJECT_ROOT"] || process.cwd(),
    MAX_CONTEXT_TOKENS: parseInt(process.env["SAAD_AGENT_MAX_CONTEXT_TOKENS"] || "8192", 10),
    TEMPERATURE: parseFloat(process.env["SAAD_AGENT_TEMPERATURE"] || "0.1"),
    LM_STUDIO_BASE_URL: process.env["LM_STUDIO_BASE_URL"] || "http://localhost:1234/v1",
    LM_STUDIO_API_KEY: process.env["LM_STUDIO_API_KEY"] || "lm-studio",
    OLLAMA_BASE_URL: process.env["OLLAMA_BASE_URL"] || "http://localhost:11434/v1",
    OLLAMA_API_KEY: process.env["OLLAMA_API_KEY"] || "ollama",
};
//# sourceMappingURL=config.js.map