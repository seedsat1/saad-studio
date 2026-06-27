export interface ModelProviderConfig {
  baseUrl: string;
  apiKey?: string;
  modelName: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ModelProvider {
  name: string;
  model: string;
  chat(systemPrompt: string, userMessage: string): Promise<string>;
  stream?(systemPrompt: string, userMessage: string, onChunk: (chunk: string) => void): Promise<string>;
  healthCheck(): Promise<boolean>;
  config: ModelProviderConfig;
}
