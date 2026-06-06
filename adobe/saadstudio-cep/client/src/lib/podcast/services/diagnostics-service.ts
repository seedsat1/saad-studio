import { getHostEnvironmentInfo, getHostName } from "../../cep";
import { premierePodcastAdapter } from "../adapters/premiere-podcast-adapter";
import { reapPodcastProvider } from "../providers/reap-provider";
import type { PodcastDiagnostics } from "../types";

export async function getPodcastDiagnostics(): Promise<PodcastDiagnostics> {
  const messages: string[] = [];
  const [sequence, providerStatus] = await Promise.all([
    premierePodcastAdapter.getActiveSequence().catch((err: Error) => {
      messages.push(`Premiere adapter error: ${err.message}`);
      return null;
    }),
    reapPodcastProvider.getStatus().catch((err: Error) => {
      messages.push(`Reap provider error: ${err.message}`);
      return { supported: false, diagnostic: err.message };
    }),
  ]);

  const hostEnv = getHostEnvironmentInfo();
  const activeSequence = Boolean(sequence?.active);
  if (!activeSequence) {
    messages.push(`No active Premiere sequence detected. Host: ${getHostName()}.`);
  }
  if (providerStatus.diagnostic) {
    messages.push(providerStatus.diagnostic);
  }

  return {
    activeSequence,
    sequenceId: sequence?.sequenceId ?? null,
    sequenceName: sequence?.sequenceName ?? null,
    premiereVersion: sequence?.premiereVersion ?? hostEnv?.appVersion ?? null,
    videoTrackCount: sequence?.videoTrackCount ?? 0,
    audioTrackCount: sequence?.audioTrackCount ?? 0,
    adapterStatus: sequence ? "ready" : "unsupported",
    reapProviderStatus: providerStatus.supported ? "available" : "unsupported",
    messages,
  };
}
