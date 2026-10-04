import { isProviderRoutingAllowed, type ProviderRegistryId } from "@/lib/provider-registry";

export class ProviderExecutionBlockedError extends Error {
  provider: ProviderRegistryId;
  status: number;
  code: string;

  constructor(provider: ProviderRegistryId) {
    super("Generation service is not active for execution.");
    this.name = "ProviderExecutionBlockedError";
    this.provider = provider;
    this.status = 503;
    this.code = "provider_not_active";
  }
}

export function assertFinalProviderExecutionAllowed(provider: ProviderRegistryId) {
  if (!isProviderRoutingAllowed(provider)) {
    throw new ProviderExecutionBlockedError(provider);
  }
}

export function isFinalProviderExecutionAllowed(provider: ProviderRegistryId): boolean {
  return isProviderRoutingAllowed(provider);
}
