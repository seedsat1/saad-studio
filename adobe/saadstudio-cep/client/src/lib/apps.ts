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
    id: "transitions",
    name: "Transitions",
    description: "Generate cinematic A/B transitions from the studio presets.",
    route: "/transitions",
    icon: "video",
    badge: "NEW",
  },
  {
    id: "draw-to-video",
    name: "Draw to video",
    description: "Sketch on a frame, get a clip back.",
    route: "/draw-to-video",
    icon: "draw-pen",
    badge: "NEW",
  },
  {
    id: "edit-video",
    name: "Edit video",
    description: "Clean, reframe and upscale in one pass.",
    route: "/edit-video",
    icon: "magic-wand",
  },
  {
    id: "avatar-pro",
    name: "Kling Avatar Pro",
    description: "Animate one avatar image with uploaded speech.",
    route: "/avatar-pro",
    icon: "video",
    badge: "NEW",
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
];

export function findApp(id: string): AppDef | undefined {
  return APPS.find((a) => a.id === id);
}
