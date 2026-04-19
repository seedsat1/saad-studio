import type { CameraMove } from "./scene-studio-types";

export const CAMERA_MOVES: CameraMove[] = [
  { id: "static", label: "Static", icon: "◻", desc: "No movement" },
  { id: "pan_left", label: "Pan left", icon: "←", desc: "Horizontal sweep left" },
  { id: "pan_right", label: "Pan right", icon: "→", desc: "Horizontal sweep right" },
  { id: "tilt_up", label: "Tilt up", icon: "↑", desc: "Vertical sweep up" },
  { id: "tilt_down", label: "Tilt down", icon: "↓", desc: "Vertical sweep down" },
  { id: "zoom_in", label: "Zoom in", icon: "⊕", desc: "Push into subject" },
  { id: "zoom_out", label: "Zoom out", icon: "⊖", desc: "Pull away from subject" },
  { id: "dolly_in", label: "Dolly in", icon: "⇥", desc: "Camera moves forward" },
  { id: "orbit", label: "Orbit", icon: "↻", desc: "Circular around subject" },
  { id: "crane_up", label: "Crane up", icon: "⤴", desc: "Rising crane shot" },
  { id: "tracking", label: "Tracking", icon: "⇔", desc: "Follow subject motion" },
  { id: "handheld", label: "Handheld", icon: "〰", desc: "Organic shake feel" },
];

export const STATUS_CONFIG = {
  idle: {
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-500",
    label: "Ready",
  },
  uploading: {
    bg: "bg-amber-50 dark:bg-amber-900/40",
    text: "text-amber-700 dark:text-amber-400",
    label: "Uploading...",
  },
  queued: {
    bg: "bg-blue-50 dark:bg-blue-900/40",
    text: "text-blue-700 dark:text-blue-400",
    label: "Queued",
  },
  running: {
    bg: "bg-amber-50 dark:bg-amber-900/40",
    text: "text-amber-700 dark:text-amber-400",
    label: "Generating...",
  },
  success: {
    bg: "bg-green-50 dark:bg-green-900/40",
    text: "text-green-700 dark:text-green-400",
    label: "Done",
  },
  failed: {
    bg: "bg-red-50 dark:bg-red-900/40",
    text: "text-red-700 dark:text-red-400",
    label: "Failed",
  },
} as const;
