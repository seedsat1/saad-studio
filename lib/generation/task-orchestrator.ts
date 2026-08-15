import {
  rollbackGenerationCharge,
  setGenerationMediaUrl,
  setGenerationTaskMarker,
  spendCredits,
} from "@/lib/credit-ledger";

type TaskChargeInput = {
  userId: string;
  credits: number;
  prompt: string;
  assetType: string;
  modelUsed: string;
  mediaUrl?: string | null;
  resolution?: string | null;
  duration?: number | null;
  aspectRatio?: string | null;
  quality?: string | null;
  providerName?: string | null;
  providerModel?: string | null;
  providerRequestId?: string | null;
  providerCostUsd?: number | null;
  providerTokens?: number | null;
  providerCredits?: number | null;
  providerCostSource?: string | null;
  generationType?: string | null;
  mode?: string | null;
  inputType?: string | null;
  requestPayload?: unknown;
  estimatedProviderCostUsd?: number | null;
};

export type TaskProviderResult = {
  taskId: string;
};

export type TaskGenerationStartResult<TProviderResult extends TaskProviderResult> = {
  generationId: string;
  remainingCredits: number;
  chargedCredits: number;
  providerResult: TProviderResult;
};

export async function runTaskGenerationStart<TProviderResult extends TaskProviderResult>(input: {
  charge: TaskChargeInput;
  submit: (context: { generationId: string }) => Promise<TProviderResult>;
  taskMarkerFailure?: "throw" | "log";
  logPrefix?: string;
}): Promise<TaskGenerationStartResult<TProviderResult>> {
  const spent = await spendCredits(input.charge);
  const generationId = spent.generationId;

  try {
    const providerResult = await input.submit({ generationId });
    try {
      await setGenerationTaskMarker(generationId, providerResult.taskId);
    } catch (error) {
      if (input.taskMarkerFailure === "log") {
        console.error(`[${input.logPrefix ?? "task-generation"}] Failed to save task marker`, error);
      } else {
        throw error;
      }
    }

    return {
      generationId,
      remainingCredits: spent.remainingCredits,
      chargedCredits: input.charge.credits,
      providerResult,
    };
  } catch (error) {
    await rollbackGenerationCharge(
      generationId,
      input.charge.userId,
      input.charge.credits,
    ).catch(() => {});
    throw error;
  }
}

export async function completeTaskGeneration(input: {
  generationId: string;
  mediaUrl: string;
}): Promise<void> {
  await setGenerationMediaUrl(input.generationId, input.mediaUrl);
}

export async function failTaskGenerationWithRefund(input: {
  generationId: string;
  userId: string;
  credits: number;
}): Promise<void> {
  await rollbackGenerationCharge(input.generationId, input.userId, input.credits);
}
