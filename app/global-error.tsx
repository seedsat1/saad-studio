"use client";

import { useEffect } from "react";
import { SiteErrorScene } from "@/components/site-error-scene";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Saad Studio global error:", error);
  }, [error]);

  return (
    <html lang="en" dir="ltr">
      <body>
        <SiteErrorScene
          code="500"
          eyebrow="System recovery"
          title="The studio hit an unexpected fault"
          message="The app shell failed to render correctly. Try again, return home, or reload from a clean route."
          actionLabel="Back to homepage"
          actionHref="/"
          onRetry={reset}
        />
      </body>
    </html>
  );
}
