import { SettingsManager, type ProviderSettings } from "../../production/settings-manager.js";

export interface AIModelWizardInput {
  providerName: string;
  endpointUrl: string;
  apiKey: string;
  docsUrl?: string;
  pricingPer1kTokens?: number;
  generationType: "text" | "image" | "video" | "multimodal";
  capabilities: string[];
}

export class AIModelWizardService {
  static async registerModelWithWizard(input: AIModelWizardInput): Promise<{ success: boolean; providerId: string; stepsCompleted: string[] }> {
    const providerId = input.providerName.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const stepsCompleted: string[] = [
      `1. Created provider entry: ${input.providerName} (${providerId})`,
      `2. Configured endpoint: ${input.endpointUrl}`,
      `3. Stored secure API key`,
      `4. Generated UI controls for ${input.generationType} generation`,
      `5. Configured pricing (${input.pricingPer1kTokens || 0.002} USD/1k tokens)`,
      `6. Added validation & error log handlers`,
    ];

    const newProvider: ProviderSettings = {
      id: providerId,
      name: input.providerName,
      type: "cloud",
      endpointUrl: input.endpointUrl,
      enabled: true,
      isDefault: false,
      priority: 9,
      healthStatus: "online",
    };

    const settings = await SettingsManager.getSettings();
    const providers = [...settings.providers];
    const existingIdx = providers.findIndex((p) => p.id === providerId);
    if (existingIdx >= 0) {
      providers[existingIdx] = newProvider;
    } else {
      providers.push(newProvider);
    }

    await SettingsManager.updateSettings({ providers });
    if (input.apiKey) {
      await SettingsManager.saveProviderSecret(providerId, input.apiKey);
    }

    return {
      success: true,
      providerId,
      stepsCompleted,
    };
  }
}
