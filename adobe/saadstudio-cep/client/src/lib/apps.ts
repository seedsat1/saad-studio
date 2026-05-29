/** Catalog of the AI tools the panel exposes.
 *
 * Each entry maps to a route handled in main.ts and (where applicable) to
 * an /api/panel/generate/* endpoint already implemented in the Next.js
 * backend. Add a new tool here and it shows up on the home grid; wire its
 * route to render the matching page module. */

import type { IconName } from "./icons";

export interface AppDef {
  id: string;
  name: string;
  description: string;
  route: string;
  icon: IconName;
  badge?: "NEW" | "BETA";
}

export const APPS: AppDef[] = [
  {
    id: "image-gen",
    name: "Image generation",
    description: "Generate images from a prompt.",
    route: "/image-gen",
    icon: "image",
  },
  {
    id: "video-gen",
    name: "Video generation",
    description: "Generate video from a prompt.",
    route: "/video-gen",
    icon: "video",
  },
  {
    id: "transitions",
    name: "Transitions",
    description: "Generate cinematic A/B transitions from the studio presets.",
    route: "/transitions",
    icon: "video",
    badge: "NEW",
  },
  {
    id: "avatar-pro",
    name: "LiP sync",
    description: "Animate an image or video frame with speech audio.",
    route: "/lip-sync",
    icon: "video",
    badge: "NEW",
  },
  {
    id: "expand",
    name: "Expand",
    description: "Expand any image or video beyond its frame.",
    route: "/expand",
    icon: "draw-pen",
    badge: "NEW",
  },
  {
    id: "edit-video",
    name: "Edit video",
    description: "Reimagine a selected shot with real prompt, preset and Grok Edit controls.",
    route: "/edit-video",
    icon: "magic-wand",
  },
  {
    id: "remove-bg",
    name: "Remove BG",
    description: "Strip the background from a clip.",
    route: "/remove-bg",
    icon: "scissors",
  },
  {
    id: "upscale",
    name: "Upscale",
    description: "Push resolution and detail.",
    route: "/upscale",
    icon: "spark",
  },
];

export function findApp(id: string): AppDef | undefined {
  return APPS.find((a) => a.id === id);
}
