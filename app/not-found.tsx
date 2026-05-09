import { SiteErrorScene } from "@/components/site-error-scene";

export default function NotFound() {
  return (
    <SiteErrorScene
      code="404"
      eyebrow="Route not found"
      title="This page left the timeline"
      message="The page you are looking for does not exist, moved, or is not available in this build."
      actionLabel="Back to homepage"
      actionHref="/"
    />
  );
}
