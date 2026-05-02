export type NodeStatus = 'idle' | 'running' | 'done' | 'error';

export type CanvasNodeType =
  | 'upload-image'
  | 'text-prompt'
  | 'image-edit'
  | 'text-to-image'
  | 'image-to-video'
  | 'video-to-video'
  | 'upscale'
  | 'export';

export interface CanvasNodeSettings {
  prompt?: string;
  negativePrompt?: string;
  modelId?: string;
  aspectRatio?: string;
  duration?: number;
  quality?: string;
  imageUrl?: string;
  videoUrl?: string;
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
};
