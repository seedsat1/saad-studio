"use client";

export type ClientTelemetryPayload = {
  route: string;
  feature: string;
  operation: "upload" | "playback" | "download" | "record" | "generate_trigger" | "auth";
  status: "SUCCESS" | "FAILURE" | "DEGRADED";
  errorCode?: string;
  httpStatus?: number;
  durationMs?: number;
  generationId?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Non-blocking client-side telemetry reporter.
 * Safe fail-fast execution: Never throws and never blocks UI or generation flows.
 */
export function reportMobileTelemetry(payload: ClientTelemetryPayload): void {
  try {
    if (typeof window === "undefined") return;

    // Use sendBeacon if available for non-blocking unload reliability, else fetch with keepalive
    const body = JSON.stringify(payload);
    const url = "/api/telemetry/mobile";

    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(url, blob);
    } else {
      void fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {
        // Silently swallow network errors
      });
    }
  } catch (err) {
    // Non-blocking fail-safe
    console.debug("[client-telemetry] Telemetry send swallowed:", err);
  }
}
