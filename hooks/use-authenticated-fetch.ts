"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";

export function useAuthenticatedFetch() {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  const fetchWithAuth = useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);

      if (isLoaded && isSignedIn && !headers.has("Authorization")) {
        const token = await getToken().catch(() => null);
        if (token) headers.set("Authorization", `Bearer ${token}`);
      }

      return fetch(input, {
        ...init,
        credentials: init.credentials ?? "include",
        headers,
      });
    },
    [getToken, isLoaded, isSignedIn],
  );

  return {
    fetchWithAuth,
    isAuthLoaded: isLoaded,
    isSignedIn: Boolean(isSignedIn),
  };
}
