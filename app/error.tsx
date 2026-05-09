"use client";

import { useEffect } from "react";
import { SiteErrorScene } from "@/components/site-error-scene";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Saad Studio route error:", error);
  }, [error]);

  return (
    <SiteErrorScene
      code="500"
      eyebrow="Render interrupted"
      title="A scene failed to load"
      message="Something went wrong while opening this part of Saad Studio. Your credits and project data are safe."
      actionLabel="Back to homepage"
      actionHref="/"
      onRetry={reset}
    />
  );
}
