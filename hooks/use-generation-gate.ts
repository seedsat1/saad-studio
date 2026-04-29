"use client";

import { useCallback } from "react";
import { useAuth } from "@clerk/nextjs";

import { useAuthModal } from "@/hooks/use-auth-modal";
import { useCreditModal } from "@/hooks/use-credit-modal";
import {
  INSUFFICIENT_CREDITS_MESSAGE,
  SAFE_PUBLIC_GENERATION_ERROR,
  toSafePublicGenerationMessage,
} from "@/lib/generation-errors";

type GuardGenerationInput = {
  requiredCredits?: number | null;
  action?: string;
};

type GuardGenerationResult =
  | { ok: true; currentBalance?: number; requiredCredits?: number }
  | { ok: false; reason: "auth" | "credits" | "error"; message?: string };

function pickNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return undefined;
}

export function useGenerationGate() {
  const { isLoaded, isSignedIn } = useAuth();
  const openAuth = useAuthModal((s) => s.onOpen);
  const openCredits = useCreditModal((s) => s.onOpen);

  const guardGeneration = useCallback(
    async (input: GuardGenerationInput = {}): Promise<GuardGenerationResult> => {
      if (!isLoaded || !isSignedIn) {
        openAuth("login");
        return { ok: false, reason: "auth" };
      }

      const requiredCredits = Math.max(0, Math.ceil(Number(input.requiredCredits ?? 0)));

      try {
        const response = await fetch("/api/generation/preflight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requiredCredits,
            action: input.action,
          }),
        });

        const payload = (await response.clone().json().catch(() => null)) as Record<string, unknown> | null;

        if (response.status === 401) {
          openAuth("login");
          return { ok: false, reason: "auth" };
        }

        if (response.status === 402) {
          openCredits({
            requiredCredits: pickNumber(payload?.requiredCredits, payload?.required),
            currentBalance: pickNumber(payload?.currentBalance, payload?.current, payload?.balance),
          });
          return {
            ok: false,
            reason: "credits",
            message: INSUFFICIENT_CREDITS_MESSAGE,
          };
        }

        if (!response.ok) {
          console.error("[generation gate preflight]", payload);
          return {
            ok: false,
            reason: "error",
            message: SAFE_PUBLIC_GENERATION_ERROR,
          };
        }

        return {
          ok: true,
          currentBalance: pickNumber(payload?.currentBalance),
          requiredCredits: pickNumber(payload?.requiredCredits),
        };
      } catch (error) {
        console.error("[generation gate preflight]", error);
        return {
          ok: false,
          reason: "error",
          message: SAFE_PUBLIC_GENERATION_ERROR,
        };
      }
    },
    [isLoaded, isSignedIn, openAuth, openCredits],
  );

  const getSafeErrorMessage = useCallback((error: unknown) => {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : undefined;

    return toSafePublicGenerationMessage(message);
  }, []);

  return {
    guardGeneration,
    getSafeErrorMessage,
    safeErrorMessage: SAFE_PUBLIC_GENERATION_ERROR,
    insufficientCreditsMessage: INSUFFICIENT_CREDITS_MESSAGE,
  };
}
