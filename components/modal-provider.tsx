"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

import { ProModal } from "@/components/pro-modal";
import AuthModal from "@/components/AuthModal";
import OutOfCreditsModal from "@/components/OutOfCreditsModal";
import { useAuthModal } from "@/hooks/use-auth-modal";
import { useCreditModal } from "@/hooks/use-credit-modal";

function pickNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return undefined;
}

const CreditModalFetchInterceptor = () => {
  const onOpen = useCreditModal((s) => s.onOpen);

  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (...args: Parameters<typeof window.fetch>): Promise<Response> => {
      const response = await originalFetch(...args);

      try {
        const contentType = response.headers.get("content-type") || "";
        const isJson = contentType.includes("application/json");

        let payload: Record<string, unknown> | null = null;
        if (isJson) {
          payload = (await response.clone().json().catch(() => null)) as Record<string, unknown> | null;
        }

        const errorText = String(payload?.error ?? payload?.message ?? "").toLowerCase();
        const requiredCredits = pickNumber(payload?.requiredCredits, payload?.required);
        const currentBalance = pickNumber(payload?.currentBalance, payload?.current, payload?.balance);
        const isInsufficientCreditError =
          errorText.includes("insufficient credits") ||
          errorText.includes("insufficient credit") ||
          errorText.includes("no credit balance");

        if (response.status === 402 || isInsufficientCreditError) {
          onOpen({ requiredCredits, currentBalance });
        }
      } catch {
        // Ignore parsing/interceptor failures and keep the original response flow.
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [onOpen]);

  return null;
};

const AuthQueryHandler = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isSignedIn } = useAuth();
  const { onOpen } = useAuthModal();

  useEffect(() => {
    const authParam = searchParams.get("auth");
    if (!authParam || isSignedIn) return;

    const view = authParam === "signup" ? "signup" : "login";
    onOpen(view);

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("auth");
    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [searchParams, pathname, router, isSignedIn, onOpen]);

  return null;
};

export const ModalProvider = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <>
      <AuthQueryHandler />
      <CreditModalFetchInterceptor />
      <ProModal />
      <AuthModal />
      {/* Renders the Out-of-Credits modal; triggered via useCreditModal hook */}
      <OutOfCreditsModal />
    </>
  );
};
