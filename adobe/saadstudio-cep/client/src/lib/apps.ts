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

  // ── MORE TOOLS — powered by Reap.video (captions / dub / clips) plus
  //    placeholder cards for the tools still on the roadmap.
  {
    id: "add-captions",
    name: "Add Captions",
    description: "Burn styled captions onto a clip.",
    route: "/add-captions",
    icon: "captions",
    badge: "NEW",
  },
  {
    id: "edit-clips",
    name: "Edit Videos",
    description: "Cut short-form clips out of a long source.",
    route: "/edit-clips",
    icon: "cut",
    badge: "NEW",
  },
  {
    id: "ai-dubbing",
    name: "AI Dubbing",
    description: "Dub the clip into another language, lip-aware.",
    route: "/ai-dubbing",
    icon: "mic",
    badge: "NEW",
  },
  {
    id: "audiogram",
    name: "Audiogram",
    description: "Turn audio into a shareable waveform video.",
    route: "/audiogram",
    icon: "waveform",
  },
  {
    id: "auto-reframe",
    name: "Auto Reframe",
    description: "Reframe automatically with subject tracking.",
    route: "/auto-reframe",
    icon: "crop",
    badge: "NEW",
  },
  {
    id: "transcription",
    name: "Transcription",
    description: "Word-level timestamped transcript.",
    route: "/transcription",
    icon: "transcript",
    badge: "NEW",
  },
  {
    id: "noise-removal",
    name: "Noise removal",
    description: "Clean background hiss and hum out of dialogue.",
    route: "/noise-removal",
    icon: "noise",
  },
  {
    id: "eye-correction",
    name: "Eye correction",
    description: "Re-aim the subject's gaze toward the camera.",
    route: "/eye-correction",
    icon: "eye",
  },
];

export function findApp(id: string): AppDef | undefined {
  return APPS.find((a) => a.id === id);
}
