"use client";

import {
  Upload, Type, Pencil, ImagePlus, Film, Video,
  ZoomIn, Download, Clapperboard, Bot, Mic, Zap, Music,
  TrendingUp, Shuffle, Palette, PenTool, Hexagon,
  MessageCircle, Layers, Scissors, List, FileText,
  Smile, Link, FolderOpen, Search, Image as ImageIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CanvasNodeType } from "./canvas-types";

export const NODE_ICON_MAP: Record<CanvasNodeType, LucideIcon> = {
  "upload-image":    Upload,
  "text-prompt":     Type,
  "image-edit":      Pencil,
  "text-to-image":   ImagePlus,
  "image-to-video":  Film,
  "video-to-video":  Video,
  "upscale":         ZoomIn,
  "export":          Download,
  "text-to-video":   Clapperboard,
  "assistant":       Bot,
  "voiceover":       Mic,
  "sound-effects":   Zap,
  "music-generator": Music,
  "video-upscale":   TrendingUp,
  "variations":      Shuffle,
  "designer":        Palette,
  "image-to-svg":    PenTool,
  "svg-generator":   Hexagon,
  "speak":           MessageCircle,
  "video-combiner":  Layers,
  "media-extractor": Scissors,
  "list":            List,
  "sticky-note":     FileText,
  "stickers":        Smile,
  "add-reference":   Link,
  "assets":          FolderOpen,
  "stock":           Search,
};

export function NodeTypeIcon({
  type,
  size = 14,
  color,
  strokeWidth = 1.75,
}: {
  type: CanvasNodeType;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const Icon = NODE_ICON_MAP[type] ?? ImageIcon;
  return <Icon size={size} color={color} strokeWidth={strokeWidth} />;
}
