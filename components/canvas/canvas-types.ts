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
  | 'connector'
  | 'sticky-note'
  | 'stickers'
  | 'add-reference'
  | 'assets'
  | 'stock'
  // ── RHTV-parity additions ────────────────────────────────────
  // Control (ControlNet family + IP-Adapter)
  | 'controlnet-canny'
  | 'controlnet-depth'
  | 'controlnet-openpose'
  | 'controlnet-lineart'
  | 'controlnet-scribble'
  | 'ip-adapter'
  // Masks & Segmentation
  | 'mask-sam'
  | 'mask-grow'
  | 'mask-invert'
  | 'mask-from-color'
  // Loaders
  | 'lora-loader'
  | 'checkpoint-loader'
  // Face / Identity / Style
  | 'face-swap'
  | 'lipsync'
  | 'head-animation'
  | 'style-transfer'
  // Video specialized
  | 'video-as-prompt'
  | 'frame-interpolation'
  | 'video-audio-joint'
  // Audio specialized
  | 'tts'
  | 'singer'
  | 'speech-synth'
  | 'beat-detection'
  // Layout / Post
  | 'comic-layout'
  | 'subtitle-generator'
  // Translation
  | 'translate';

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
  splitChar?: string;
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
    defaultSettings: { prompt: '', modelId: 'nano-banana-pro', aspectRatio: '1:1', quality: '1K' },
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
    defaultSettings: { prompt: '', modelId: 'nano-banana-pro', aspectRatio: '1:1', quality: '1K' },
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
    defaultSettings: { prompt: '', modelId: 'nano-banana-pro', aspectRatio: '1:1', quality: '1K' },
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
    defaultSettings: { prompt: '', modelId: 'gpt-image/1.5-text-to-image', aspectRatio: '1:1', quality: '1K' },
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
    defaultSettings: { prompt: '', modelId: 'recraft/svg-text-to-image', quality: '1K' },
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
    hasPromptInput: true,
    hasImageOutput: false,
    hasVideoOutput: false,
    hasTextOutput: true,
    defaultSettings: { noteText: '', splitChar: '\n' },
  },
  connector: {
    label: 'Connector',
    description: 'Route image output through a clean relay node',
    emoji: '↔',
    accentColor: '#14b8a6',
    creditCost: 0,
    hasImageInput: true,
    hasVideoInput: false,
    hasPromptInput: false,
    hasImageOutput: true,
    hasVideoOutput: false,
    hasTextOutput: false,
    defaultSettings: {},
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
    defaultSettings: { prompt: '', modelId: 'nano-banana-pro', aspectRatio: '1:1', quality: '1K' },
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

  // ─── RHTV-parity node types ───────────────────────────────────────────────
  // Control (ControlNet family + IP-Adapter)
  'controlnet-canny': {
    label: 'ControlNet · Canny',
    description: 'Edge-guided generation using Canny edges',
    emoji: '🧭',
    accentColor: '#f43f5e',
    creditCost: 1,
    hasImageInput: true,
    hasVideoInput: false,
    hasPromptInput: true,
    hasImageOutput: true,
    hasVideoOutput: false,
    hasTextOutput: false,
    defaultSettings: { prompt: '' },
  },
  'controlnet-depth': {
    label: 'ControlNet · Depth',
    description: 'Depth-map-guided generation',
    emoji: '🏔️',
    accentColor: '#f43f5e',
    creditCost: 1,
    hasImageInput: true,
    hasVideoInput: false,
    hasPromptInput: true,
    hasImageOutput: true,
    hasVideoOutput: false,
    hasTextOutput: false,
    defaultSettings: { prompt: '' },
  },
  'controlnet-openpose': {
    label: 'ControlNet · OpenPose',
    description: 'Pose skeleton-driven generation',
    emoji: '🕺',
    accentColor: '#f43f5e',
    creditCost: 1,
    hasImageInput: true,
    hasVideoInput: false,
    hasPromptInput: true,
    hasImageOutput: true,
    hasVideoOutput: false,
    hasTextOutput: false,
    defaultSettings: { prompt: '' },
  },
  'controlnet-lineart': {
    label: 'ControlNet · Lineart',
    description: 'Lineart-conditioned generation',
    emoji: '✒️',
    accentColor: '#f43f5e',
    creditCost: 1,
    hasImageInput: true,
    hasVideoInput: false,
    hasPromptInput: true,
    hasImageOutput: true,
    hasVideoOutput: false,
    hasTextOutput: false,
    defaultSettings: { prompt: '' },
  },
  'controlnet-scribble': {
    label: 'ControlNet · Scribble',
    description: 'Scribble-guided generation',
    emoji: '🖍️',
    accentColor: '#f43f5e',
    creditCost: 1,
    hasImageInput: true,
    hasVideoInput: false,
    hasPromptInput: true,
    hasImageOutput: true,
    hasVideoOutput: false,
    hasTextOutput: false,
    defaultSettings: { prompt: '' },
  },
  'ip-adapter': {
    label: 'IP-Adapter',
    description: 'Inject style/face identity from a reference image',
    emoji: '🎯',
    accentColor: '#fb7185',
    creditCost: 1,
    hasImageInput: true,
    hasVideoInput: false,
    hasPromptInput: true,
    hasImageOutput: true,
    hasVideoOutput: false,
    hasTextOutput: false,
    defaultSettings: { prompt: '' },
  },

  // Masks & Segmentation
  'mask-sam': {
    label: 'Segment Anything',
    description: 'Auto-generate masks from any subject in an image',
    emoji: '✂️',
    accentColor: '#eab308',
    creditCost: 1,
    hasImageInput: true,
    hasVideoInput: false,
    hasPromptInput: true,
    hasImageOutput: true,
    hasVideoOutput: false,
    hasTextOutput: false,
    defaultSettings: { prompt: '' },
  },
  'mask-grow': {
    label: 'Grow Mask',
    description: 'Expand a mask by N pixels',
    emoji: '🔍',
    accentColor: '#eab308',
    creditCost: 0,
    hasImageInput: true,
    hasVideoInput: false,
    hasPromptInput: false,
    hasImageOutput: true,
    hasVideoOutput: false,
    hasTextOutput: false,
    defaultSettings: {},
  },
  'mask-invert': {
    label: 'Invert Mask',
    description: 'Flip mask (foreground ↔ background)',
    emoji: '🔄',
    accentColor: '#eab308',
    creditCost: 0,
    hasImageInput: true,
    hasVideoInput: false,
    hasPromptInput: false,
    hasImageOutput: true,
    hasVideoOutput: false,
    hasTextOutput: false,
    defaultSettings: {},
  },
  'mask-from-color': {
    label: 'Mask From Color',
    description: 'Build a mask by picking a color range',
    emoji: '🎨',
    accentColor: '#eab308',
    creditCost: 0,
    hasImageInput: true,
    hasVideoInput: false,
    hasPromptInput: false,
    hasImageOutput: true,
    hasVideoOutput: false,
    hasTextOutput: false,
    defaultSettings: {},
  },

  // Loaders
  'lora-loader': {
    label: 'LoRA Loader',
    description: 'Load a LoRA style/character adapter',
    emoji: '📦',
    accentColor: '#a855f7',
    creditCost: 0,
    hasImageInput: false,
    hasVideoInput: false,
    hasPromptInput: false,
    hasImageOutput: false,
    hasVideoOutput: false,
    hasTextOutput: true,
    defaultSettings: {},
  },
  'checkpoint-loader': {
    label: 'Checkpoint Loader',
    description: 'Load a base model checkpoint (SD/SDXL/Flux/…)',
    emoji: '📂',
    accentColor: '#a855f7',
    creditCost: 0,
    hasImageInput: false,
    hasVideoInput: false,
    hasPromptInput: false,
    hasImageOutput: false,
    hasVideoOutput: false,
    hasTextOutput: true,
    defaultSettings: {},
  },

  // Face / Identity / Style
  'face-swap': {
    label: 'Face Swap',
    description: 'Swap face onto target using identity reference (DreamID)',
    emoji: '🎭',
    accentColor: '#22c55e',
    creditCost: 3,
    hasImageInput: true,
    hasVideoInput: false,
    hasPromptInput: false,
    hasImageOutput: true,
    hasVideoOutput: false,
    hasTextOutput: false,
    defaultSettings: {},
  },
  'lipsync': {
    label: 'Lipsync',
    description: 'Sync mouth to audio track (FlashTalk)',
    emoji: '👄',
    accentColor: '#22c55e',
    creditCost: 4,
    hasImageInput: false,
    hasVideoInput: true,
    hasPromptInput: false,
    hasImageOutput: false,
    hasVideoOutput: true,
    hasTextOutput: false,
    defaultSettings: {},
  },
  'head-animation': {
    label: 'Head Animation',
    description: 'Animate head/face from single image (FlashHead)',
    emoji: '💫',
    accentColor: '#22c55e',
    creditCost: 5,
    hasImageInput: true,
    hasVideoInput: false,
    hasPromptInput: true,
    hasImageOutput: false,
    hasVideoOutput: true,
    hasTextOutput: false,
    defaultSettings: { prompt: '' },
  },
  'style-transfer': {
    label: 'Style Transfer (USO)',
    description: 'Apply artistic style of one image to another',
    emoji: '🎨',
    accentColor: '#22c55e',
    creditCost: 2,
    hasImageInput: true,
    hasVideoInput: false,
    hasPromptInput: true,
    hasImageOutput: true,
    hasVideoOutput: false,
    hasTextOutput: false,
    defaultSettings: { prompt: '' },
  },

  // Video specialized
  'video-as-prompt': {
    label: 'Video as Prompt',
    description: 'Use a reference video as the visual prompt for generation',
    emoji: '📼',
    accentColor: '#0ea5e9',
    creditCost: 8,
    hasImageInput: false,
    hasVideoInput: true,
    hasPromptInput: true,
    hasImageOutput: false,
    hasVideoOutput: true,
    hasTextOutput: false,
    defaultSettings: { prompt: '' },
  },
  'frame-interpolation': {
    label: 'Frame Interpolation',
    description: 'Insert generated frames between keyframes (FramePack)',
    emoji: '🎞️',
    accentColor: '#0ea5e9',
    creditCost: 4,
    hasImageInput: false,
    hasVideoInput: true,
    hasPromptInput: false,
    hasImageOutput: false,
    hasVideoOutput: true,
    hasTextOutput: false,
    defaultSettings: {},
  },
  'video-audio-joint': {
    label: 'Video + Audio Joint',
    description: 'Generate synced video and audio together (Ovi)',
    emoji: '🎬',
    accentColor: '#0ea5e9',
    creditCost: 12,
    hasImageInput: false,
    hasVideoInput: false,
    hasPromptInput: true,
    hasImageOutput: false,
    hasVideoOutput: true,
    hasTextOutput: false,
    defaultSettings: { prompt: '' },
  },

  // Audio specialized
  'tts': {
    label: 'TTS (VoxCPM)',
    description: 'Multi-language text-to-speech',
    emoji: '🗣️',
    accentColor: '#ef4444',
    creditCost: 1,
    hasImageInput: false,
    hasVideoInput: false,
    hasPromptInput: true,
    hasImageOutput: false,
    hasVideoOutput: false,
    hasTextOutput: false,
    defaultSettings: { prompt: '' },
  },
  'singer': {
    label: 'AI Singer',
    description: 'Generate sung vocals from lyrics (SoulX-Singer)',
    emoji: '🎤',
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
  'speech-synth': {
    label: 'Speech Synthesis',
    description: 'High-fidelity narrator voices (DMOSpeech2)',
    emoji: '🎙️',
    accentColor: '#ef4444',
    creditCost: 2,
    hasImageInput: false,
    hasVideoInput: false,
    hasPromptInput: true,
    hasImageOutput: false,
    hasVideoOutput: false,
    hasTextOutput: false,
    defaultSettings: { prompt: '' },
  },
  'beat-detection': {
    label: 'Beat Detection',
    description: 'Detect BPM and beat markers from an audio track',
    emoji: '🥁',
    accentColor: '#ef4444',
    creditCost: 1,
    hasImageInput: false,
    hasVideoInput: false,
    hasPromptInput: false,
    hasImageOutput: false,
    hasVideoOutput: false,
    hasTextOutput: true,
    defaultSettings: {},
  },

  // Layout / Post
  'comic-layout': {
    label: 'Comic Layout',
    description: 'Multi-panel comic/webtoon composition from images',
    emoji: '📖',
    accentColor: '#f59e0b',
    creditCost: 2,
    hasImageInput: true,
    hasVideoInput: false,
    hasPromptInput: true,
    hasImageOutput: true,
    hasVideoOutput: false,
    hasTextOutput: false,
    defaultSettings: { prompt: '' },
  },
  'subtitle-generator': {
    label: 'Subtitles',
    description: 'Auto-generate SRT subtitles from a video/audio track',
    emoji: '💬',
    accentColor: '#f59e0b',
    creditCost: 2,
    hasImageInput: false,
    hasVideoInput: true,
    hasPromptInput: false,
    hasImageOutput: false,
    hasVideoOutput: true,
    hasTextOutput: true,
    defaultSettings: {},
  },

  // Translation
  'translate': {
    label: 'Translate',
    description: 'Translate a prompt between languages (Seed-X-Pro)',
    emoji: '🌐',
    accentColor: '#14b8a6',
    creditCost: 0,
    hasImageInput: false,
    hasVideoInput: false,
    hasPromptInput: true,
    hasImageOutput: false,
    hasVideoOutput: false,
    hasTextOutput: true,
    defaultSettings: { prompt: '' },
  },
};
