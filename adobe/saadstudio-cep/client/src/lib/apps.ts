/** Catalog of the AI tools the panel exposes.
 *
 * Each entry maps to a route handled in main.ts and (where applicable) to
 * an /api/panel/generate/* endpoint already implemented in the Next.js
 * backend. Add a new tool here and it shows up on the home grid; wire its
 * route to render the matching page module.
 *
 * `color` is the accent the icon picks up inside the dark circular
 * container — pick something readable on a #1a1f33-ish background. */

import type { IconName } from "./icons";

export interface AppDef {
  id: string;
  name: string;
  description: string;
  route: string;
  icon: IconName;
  /** Brand accent the icon picks up. Falls back to the panel's primary
   *  brand colour when omitted. */
  color?: string;
  /** Small chip top-right of the icon. */
  badge?: "NEW" | "BETA";
  /** Renders the floating "Coming soon" pill above the icon. The route
   *  still works (placeholder card) but the visual flags it as roadmap. */
  comingSoon?: boolean;
}

export const APPS: AppDef[] = [
  {
    id: "image-gen",
    name: "Image generation",
    description: "Generate images from a prompt.",
    route: "/image-gen",
    icon: "image",
    color: "#a78bfa", // lavender
  },
  {
    id: "video-gen",
    name: "Video generation",
    description: "Generate video from a prompt.",
    route: "/video-gen",
    icon: "video",
    color: "#7c5cff", // panel primary
  },
  {
    id: "transitions",
    name: "Transitions",
    description: "Generate cinematic A/B transitions from the studio presets.",
    route: "/transitions",
    icon: "video",
    color: "#f472b6", // pink
    badge: "NEW",
  },
  {
    id: "avatar-pro",
    name: "LiP sync",
    description: "Animate an image or video frame with speech audio.",
    route: "/lip-sync",
    icon: "video",
    color: "#fb7185", // rose
    badge: "NEW",
  },
  {
    id: "expand",
    name: "Expand",
    description: "Expand any image or video beyond its frame.",
    route: "/expand",
    icon: "draw-pen",
    color: "#60a5fa", // sky blue
    badge: "NEW",
  },
  {
    id: "edit-video",
    name: "Edit video",
    description: "Reimagine a selected shot with real prompt, preset and Grok Edit controls.",
    route: "/edit-video",
    icon: "magic-wand",
    color: "#c084fc", // purple
  },
  {
    id: "remove-bg",
    name: "Remove BG",
    description: "Strip the background from a clip.",
    route: "/remove-bg",
    icon: "scissors",
    color: "#94a3b8", // slate
  },
  {
    id: "upscale",
    name: "Upscale",
    description: "Push resolution and detail.",
    route: "/upscale",
    icon: "spark",
    color: "#fbbf24", // amber
  },

  // ── MORE TOOLS — powered by Reap.video (captions / dub / clips) plus
  //    placeholder cards for the tools still on the roadmap.
  {
    id: "add-captions",
    name: "Add Captions",
    description: "Burn styled captions onto a clip.",
    route: "/add-captions",
    icon: "captions",
    color: "#5b8def", // blue
  },
  {
    id: "edit-clips",
    name: "AI Clip Maker",
    description: "Cut viral short clips from a long video using AI.",
    route: "/edit-clips",
    icon: "cut",
    color: "#f0abfc", // pink-violet
  },
  {
    id: "ai-dubbing",
    name: "AI Dubbing",
    description: "Dub the clip into another language, lip-aware.",
    route: "/ai-dubbing",
    icon: "mic",
    color: "#ff7849", // orange
  },
  {
    id: "audiogram",
    name: "Audiogram",
    description: "Turn audio into a shareable waveform video.",
    route: "/audiogram",
    icon: "waveform",
    color: "#38bdf8", // sky cyan
  },
  {
    id: "auto-reframe",
    name: "Auto Reframe",
    description: "Reframe automatically with subject tracking.",
    route: "/auto-reframe",
    icon: "crop",
    color: "#facc15", // gold
  },
  {
    id: "transcription",
    name: "Transcription",
    description: "Word-level timestamped transcript.",
    route: "/transcription",
    icon: "transcript",
    color: "#22d3ee", // teal
  },
  {
    id: "synchronize",
    name: "Synchronize",
    description: "Check podcast timeline sync before automatic camera switching.",
    route: "/multi-cam-auto-switch",
    icon: "video",
    color: "#22c55e", // green
    badge: "NEW",
  },
  {
    id: "multi-cam-auto-switch",
    name: "Multi-Cam Auto Switch",
    description: "Read-only diagnostics for podcast camera switching automation.",
    route: "/multi-cam-auto-switch",
    icon: "video",
    color: "#34d399", // emerald
    badge: "NEW",
  },
  {
    id: "noise-removal",
    name: "Noise removal",
    description: "Clean background hiss and hum out of dialogue.",
    route: "/noise-removal",
    icon: "noise",
    color: "#2dd4bf", // teal-green
    comingSoon: true,
  },
  {
    id: "eye-correction",
    name: "Eye correction",
    description: "Re-aim the subject's gaze toward the camera.",
    route: "/eye-correction",
    icon: "eye",
    color: "#4ade80", // green
    comingSoon: true,
  },
];

export function findApp(id: string): AppDef | undefined {
  return APPS.find((a) => a.id === id);
}
