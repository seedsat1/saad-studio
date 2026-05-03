export type NodeStatus = 'idle' | 'running' | 'done' | 'error';

export type CanvasNodeType =
  | 'upload-image'
  | 'text-prompt'
  | 'image-edit'
  | 'text-to-image'
  | 'image-to-video'
  | 'video-to-video'
  | 'upscale'
  | 'export'
  | 'text-to-video'
  | 'assistant'
  | 'voiceover'
  | 'sound-effects'
  | 'music-generator'
  | 'video-upscale'
  | 'variations'
  | 'designer'
  | 'image-to-svg'
  | 'svg-generator'
  | 'speak'
  | 'video-combiner'
  | 'media-extractor'
  | 'list'
  | 'sticky-note'
  | 'stickers'
  | 'add-reference'
  | 'assets'
  | 'stock';

export interface CanvasNodeSettings {
  prompt?: string;
  negativePrompt?: string;
  modelId?: string;
  aspectRatio?: string;
  duration?: number;
  quality?: string;
  imageUrl?: string;
  videoUrl?: string;
  ttsVoice?: string;
  noteText?: string;
}

export interface CanvasNodeData extends Record<string, unknown> {
  nodeType: CanvasNodeType;
  label: string;
  description: string;
  status: NodeStatus;
  errorMessage?: string;
  settings: CanvasNodeSettings;
  outputImageUrl?: string;
  outputVideoUrl?: string;
  outputAudioUrl?: string;
  outputText?: string;
  creditCost: number;
}

export interface ActivityEntry {
  id: string;
  timestamp: Date;
  nodeId: string;
  nodeLabel: string;
  level: 'info' | 'success' | 'error' | 'warn';
  message: string;
  outputUrl?: string;
}

export interface NodeTypeConfig {
  label: string;
  description: string;
  emoji: string;
  accentColor: string;
  creditCost: number;
  hasImageInput: boolean;
  hasVideoInput: boolean;
  hasPromptInput: boolean;
  hasImageOutput: boolean;
  hasVideoOutput: boolean;
  hasTextOutput: boolean;
  defaultSettings: CanvasNodeSettings;
  defaultModelRoute?: string;
}

export function hexToRgb(hex: string): string {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r
    ? `${parseInt(r[1], 16)},${parseInt(r[2], 16)},${parseInt(r[3], 16)}`
    : '100,100,255';
}

export const NODE_CONFIGS: Record<CanvasNodeType, NodeTypeConfig> = {
  'upload-image': {
    label: 'Upload Image',
    description: 'Load an image into the pipeline',
    emoji: '📁',
    accentColor: '#3b82f6',
    creditCost: 0,
    hasImageInput: false,
    hasVideoInput: false,
    hasPromptInput: false,
    hasImageOutput: true,
    hasVideoOutput: false,
    hasTextOutput: false,
    defaultSettings: { imageUrl: '' },
  },
  'text-prompt': {
    label: 'Text Prompt',
    description: 'Write a prompt for downstream nodes',
    emoji: '💬',
    accentColor: '#8b5cf6',
    creditCost: 0,
    hasImageInput: false,
    hasVideoInput: false,
    hasPromptInput: false,
    hasImageOutput: false,
    hasVideoOutput: false,
    hasTextOutput: true,
    defaultSettings: { prompt: '' },
  },
  'image-edit': {
    label: 'Image Edit',
    description: 'AI-powered image inpainting',
    emoji: '✏️',
    accentColor: '#ec4899',
    creditCost: 2,
    hasImageInput: true,
    hasVideoInput: false,
    hasPromptInput: true,
    hasImageOutput: true,
    hasVideoOutput: false,
    hasTextOutput: false,
    defaultSettings: { prompt: '', modelId: 'nano-banana-pro', aspectRatio: '1:1' },
  },
  'text-to-image': {
    label: 'Text to Image',
    description: 'Generate images from text',
    emoji: '🖼',
    accentColor: '#f59e0b',
    creditCost: 2,
    hasImageInput: false,
    hasVideoInput: false,
    hasPromptInput: true,
    hasImageOutput: true,
    hasVideoOutput: false,
    hasTextOutput: false,
    defaultSettings: { prompt: '', modelId: 'nano-banana-pro', aspectRatio: '1:1' },
  },
  'image-to-video': {
    label: 'Image to Video',
    description: 'Animate images into video clips',
    emoji: '🎬',
    accentColor: '#10b981',
    creditCost: 10,
    hasImageInput: true,
    hasVideoInput: false,
    hasPromptInput: true,
    hasImageOutput: false,
    hasVideoOutput: true,
    hasTextOutput: false,
    defaultSettings: {
      prompt: '',
      modelId: 'kwaivgi/kling-v3.0-pro/text-to-video',
      aspectRatio: '16:9',
      duration: 5,
    },
    defaultModelRoute: 'kwaivgi/kling-v3.0-pro/text-to-video',
  },
  'video-to-video': {
    label: 'Video to Video',
    description: 'Transform or extend video clips',
    emoji: '🎥',
    accentColor: '#6366f1',
    creditCost: 15,
    hasImageInput: false,
    hasVideoInput: true,
    hasPromptInput: true,
    hasImageOutput: false,
    hasVideoOutput: true,
    hasTextOutput: false,
    defaultSettings: {
      prompt: '',
      modelId: 'kwaivgi/kling-v3.0-pro/text-to-video',
      duration: 5,
    },
    defaultModelRoute: 'kwaivgi/kling-v3.0-pro/text-to-video',
  },
  upscale: {
    label: 'Upscale',
    description: 'Enhance image resolution to 4K',
    emoji: '🔍',
    accentColor: '#14b8a6',
    creditCost: 3,
    hasImageInput: true,
    hasVideoInput: false,
    hasPromptInput: false,
    hasImageOutput: true,
    hasVideoOutput: false,
    hasTextOutput: false,
    defaultSettings: { modelId: 'image-upscale' },
  },
  export: {
    label: 'Export',
    description: 'Download or share the final output',
    emoji: '📤',
    accentColor: '#84cc16',
    creditCost: 0,
    hasImageInput: true,
    hasVideoInput: true,
    hasPromptInput: false,
    hasImageOutput: false,
    hasVideoOutput: false,
    hasTextOutput: false,
    defaultSettings: {},
  },
  'text-to-video': {
    label: 'Text to Video',
    description: 'Generate a video from a text prompt',
    emoji: '🎬',
    accentColor: '#10b981',
    creditCost: 10,
    hasImageInput: false,
    hasVideoInput: false,
    hasPromptInput: true,
    hasImageOutput: false,
    hasVideoOutput: true,
    hasTextOutput: false,
    defaultSettings: { prompt: '', modelId: 'kwaivgi/kling-v3.0-pro/text-to-video', aspectRatio: '16:9', duration: 5 },
    defaultModelRoute: 'kwaivgi/kling-v3.0-pro/text-to-video',
  },
  assistant: {
    label: 'Assistant',
    description: 'AI text assistant powered by Gemini',
    emoji: '✨',
    accentColor: '#6366f1',
    creditCost: 2,
    hasImageInput: false,
    hasVideoInput: false,
    hasPromptInput: true,
    hasImageOutput: false,
    hasVideoOutput: false,
    hasTextOutput: true,
    defaultSettings: { prompt: '' },
  },
  voiceover: {
    label: 'Voiceover',
    description: 'Text-to-speech narration',
    emoji: '🎙️',
    accentColor: '#f59e0b',
    creditCost: 3,
    hasImageInput: false,
    hasVideoInput: false,
    hasPromptInput: true,
    hasImageOutput: false,
    hasVideoOutput: false,
    hasTextOutput: false,
    defaultSettings: { prompt: '', ttsVoice: 'Aria' },
  },
  'sound-effects': {
    label: 'Sound Effects',
    description: 'AI sound effect generator',
    emoji: '🔊',
    accentColor: '#ef4444',
    creditCost: 3,
    hasImageInput: false,
    hasVideoInput: false,
    hasPromptInput: true,
    hasImageOutput: false,
    hasVideoOutput: false,
    hasTextOutput: false,
    defaultSettings: { prompt: '' },
  },
  'music-generator': {
    label: 'Music Generator',
    description: 'Generate music from a description',
    emoji: '🎵',
    accentColor: '#8b5cf6',
    creditCost: 5,
    hasImageInput: false,
    hasVideoInput: false,
    hasPromptInput: true,
    hasImageOutput: false,
    hasVideoOutput: false,
    hasTextOutput: false,
    defaultSettings: { prompt: '', duration: 30 },
  },
  'video-upscale': {
    label: 'Video Upscaler',
    description: 'Upscale video resolution',
    emoji: '⬆️',
    accentColor: '#14b8a6',
    creditCost: 5,
    hasImageInput: false,
    hasVideoInput: true,
    hasPromptInput: false,
    hasImageOutput: false,
    hasVideoOutput: true,
    hasTextOutput: false,
    defaultSettings: {},
  },
  variations: {
    label: 'Variations',
    description: 'Create image variations',
    emoji: '🔀',
    accentColor: '#ec4899',
    creditCost: 3,
    hasImageInput: true,
    hasVideoInput: false,
    hasPromptInput: true,
    hasImageOutput: true,
    hasVideoOutput: false,
    hasTextOutput: false,
    defaultSettings: { prompt: '', modelId: 'nano-banana-pro', aspectRatio: '1:1' },
  },
  designer: {
    label: 'Designer',
    description: 'AI-powered image design',
    emoji: '🎨',
    accentColor: '#f97316',
    creditCost: 4,
    hasImageInput: false,
    hasVideoInput: false,
    hasPromptInput: true,
    hasImageOutput: true,
    hasVideoOutput: false,
    hasTextOutput: false,
    defaultSettings: { prompt: '', modelId: 'gpt-image/1.5-text-to-image', aspectRatio: '1:1' },
  },
  'image-to-svg': {
    label: 'Image to SVG',
    description: 'Convert image to vector SVG',
    emoji: '🖼️',
    accentColor: '#a855f7',
    creditCost: 3,
    hasImageInput: true,
    hasVideoInput: false,
    hasPromptInput: false,
    hasImageOutput: true,
    hasVideoOutput: false,
    hasTextOutput: false,
    defaultSettings: { modelId: 'recraft/svg-text-to-image' },
  },
  'svg-generator': {
    label: 'SVG Generator',
    description: 'Generate vector SVG from text',
    emoji: '⬡',
    accentColor: '#06b6d4',
    creditCost: 3,
    hasImageInput: false,
    hasVideoInput: false,
    hasPromptInput: true,
    hasImageOutput: true,
    hasVideoOutput: false,
    hasTextOutput: false,
    defaultSettings: { prompt: '', modelId: 'recraft/svg-text-to-image' },
  },
  speak: {
    label: 'Speak',
    description: 'Add speech to a video or image',
    emoji: '🗣️',
    accentColor: '#22c55e',
    creditCost: 3,
    hasImageInput: false,
    hasVideoInput: false,
    hasPromptInput: true,
    hasImageOutput: false,
    hasVideoOutput: false,
    hasTextOutput: false,
    defaultSettings: { prompt: '', ttsVoice: 'Aria' },
  },
  'video-combiner': {
    label: 'Video Combiner',
    description: 'Combine or extend video clips',
    emoji: '🎞️',
    accentColor: '#3b82f6',
    creditCost: 5,
    hasImageInput: false,
    hasVideoInput: true,
    hasPromptInput: true,
    hasImageOutput: false,
    hasVideoOutput: true,
    hasTextOutput: false,
    defaultSettings: { prompt: '', modelId: 'kwaivgi/kling-v3.0-pro/text-to-video', duration: 5 },
    defaultModelRoute: 'kwaivgi/kling-v3.0-pro/text-to-video',
  },
  'media-extractor': {
    label: 'Media Extractor',
    description: 'Extract audio from video',
    emoji: '📽️',
    accentColor: '#f59e0b',
    creditCost: 2,
    hasImageInput: false,
    hasVideoInput: true,
    hasPromptInput: false,
    hasImageOutput: false,
    hasVideoOutput: false,
    hasTextOutput: false,
    defaultSettings: {},
  },
  list: {
    label: 'List',
    description: 'Utility list node',
    emoji: '📋',
    accentColor: '#64748b',
    creditCost: 0,
    hasImageInput: false,
    hasVideoInput: false,
    hasPromptInput: false,
    hasImageOutput: false,
    hasVideoOutput: false,
    hasTextOutput: true,
    defaultSettings: { noteText: '' },
  },
  'sticky-note': {
    label: 'Sticky Note',
    description: 'Canvas annotation note',
    emoji: '📝',
    accentColor: '#fbbf24',
    creditCost: 0,
    hasImageInput: false,
    hasVideoInput: false,
    hasPromptInput: false,
    hasImageOutput: false,
    hasVideoOutput: false,
    hasTextOutput: false,
    defaultSettings: { noteText: '' },
  },
  stickers: {
    label: 'Stickers',
    description: 'Generate sticker-style images',
    emoji: '😊',
    accentColor: '#f43f5e',
    creditCost: 2,
    hasImageInput: false,
    hasVideoInput: false,
    hasPromptInput: true,
    hasImageOutput: true,
    hasVideoOutput: false,
    hasTextOutput: false,
    defaultSettings: { prompt: '', modelId: 'nano-banana-pro', aspectRatio: '1:1' },
  },
  'add-reference': {
    label: 'Add Reference',
    description: 'Add a reference image',
    emoji: '🔗',
    accentColor: '#3b82f6',
    creditCost: 0,
    hasImageInput: false,
    hasVideoInput: false,
    hasPromptInput: false,
    hasImageOutput: true,
    hasVideoOutput: false,
    hasTextOutput: false,
    defaultSettings: { imageUrl: '' },
  },
  assets: {
    label: 'Assets',
    description: 'Browse your asset library',
    emoji: '📂',
    accentColor: '#84cc16',
    creditCost: 0,
    hasImageInput: false,
    hasVideoInput: false,
    hasPromptInput: false,
    hasImageOutput: true,
    hasVideoOutput: false,
    hasTextOutput: false,
    defaultSettings: { imageUrl: '' },
  },
  stock: {
    label: 'Stock',
    description: 'Search stock media',
    emoji: '🔍',
    accentColor: '#06b6d4',
    creditCost: 0,
    hasImageInput: false,
    hasVideoInput: false,
    hasPromptInput: false,
    hasImageOutput: true,
    hasVideoOutput: false,
    hasTextOutput: false,
    defaultSettings: { imageUrl: '' },
  },
};
