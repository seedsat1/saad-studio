# Audio Models Matrix (Audio Studio)

Last updated: 2026-04-23

This document maps each audio tool/action to:
- Supported models
- Required request fields
- Optional fields
- Main response fields
- Provider path and pricing alias target

References:
- API route: app/api/generate/audio/route.ts
- UI page: app/(dash)/(routes)/audio/page.tsx
- Pricing aliases: lib/pricing.ts

## 1) Voice Generator

- UI Tool: `voice-generator`
- `actionType`: `tts`
- Supported models:
  - `elevenlabs/multilingual-v2` (WaveSpeed)
  - `elevenlabs/eleven-v3` (WaveSpeed)
  - `elevenlabs/text-to-speech-multilingual-v2` (KIE)
  - `elevenlabs/text-to-dialogue-v3` (KIE)

Required fields:
- `text`

Optional fields:
- `voice`
- `model`
- `stability`
- `clarity`
- `use_speaker_boost`
- `outputFormat` or `output_format`

Response fields:
- `audioUrl`
- `provider`
- `chargedCredits`

Pricing alias target:
- `el_v2`, `el_v3`, or `voice_gen` (resolved from model)

## 2) Voice Cloning

- UI Tool: `voice-cloning`
- `actionType`: `voice-cloning`
- Model used: `minimax/voice-clone`

Required fields:
- `sampleAudioUrls` (array, at least one item)

Optional fields:
- `cloneName`
- `remove_background_noise`
- `description`
- `labels`
- `text` (preview generation text)

Response fields:
- `audioUrl` (when preview audio is generated)
- `voiceId`
- `voiceName`
- `chargedCredits`

Pricing alias target:
- `voice_clone`

## 3) Voice Changer

- UI Tool: `voice-changer`
- `actionType`: `voice-changer`
- Model used: `elevenlabs/voice-changer`

Required fields:
- `audioUrl`

Optional fields:
- `voice`
- `remove_background_noise`
- `outputFormat`
- `stability`
- `similarity`
- `model`

Response fields:
- `audioUrl`
- `provider`
- `chargedCredits`

Pricing alias target:
- `voice_chg`

## 4) Dubbing

- UI Tool: `dubbing`
- `actionType`: `dubbing`
- Model used: `elevenlabs/dubbing`

Required fields:
- One of:
  - `videoUrl`
  - `audioUrl`
- `targetLang`

Optional fields:
- `sourceLang`

Response fields:
- `videoUrl` or `audioUrl`
- `provider`
- `chargedCredits`

Pricing alias target:
- `dubbing`

## 5) Sound Effect Generator

- UI Tool: `sfx-generator`
- `actionType`: `music` (SFX is routed through music action)
- Supported SFX model:
  - `elevenlabs/sound-effect-v2` (KIE)

Required fields:
- `prompt`

Optional fields:
- `stylePrompt`
- `musicDuration`
- `loop` (UI convenience flag)

Response fields:
- `audioUrl`
- `provider`
- `chargedCredits`

Pricing alias target:
- `sfx`

## 6) Music Generator

- UI Tool: `music-generator`
- `actionType`: `music`
- Supported models:
  - `elevenlabs/music`
  - `google/lyria-3` (resolved to `google/lyria-3-clip/music` or `google/lyria-3-pro/music`)

Required fields:
- `prompt` (effective prompt after merging prompt/style/lyrics must be non-empty)

Optional fields:
- `model`
- `lyrics`
- `stylePrompt`
- `musicDuration`
- `music_length_ms`
- `force_instrumental`
- `output_format`
- `image` (must be data URL or safe public HTTP URL)

Response fields:
- `audioUrl`
- `provider`
- `chargedCredits`

Pricing alias target:
- `music_gen`

## 7) Lip Sync

- UI Tool: `lip-sync`
- `actionType`: `lip-sync`
- Supported models:
  - `sync/lipsync-3` (WaveSpeed)
  - `infinitalk/from-audio` (KIE)
  - `kling/ai-avatar-pro` (KIE)
  - `bytedance/seedance-2` (KIE)
  - `bytedance/seedance-2-fast` (KIE)

### 7.1 Model: sync/lipsync-3
Required fields:
- `videoUrl`
- `audioUrl`

Optional fields:
- `sync_mode`

### 7.2 Model: infinitalk/from-audio and kling/ai-avatar-pro
Required fields:
- `imageUrl`
- `audioUrl`
- `prompt`

Optional fields:
- `resolution`
- `seed`
- `web_search`

### 7.3 Model: bytedance/seedance-2 and bytedance/seedance-2-fast
Required rule:
- At least one of the following must be present:
  - `prompt`
  - `videoUrl`
  - `audioUrl`
  - `imageUrl`

Optional fields:
- `videoUrl`
- `audioUrl`
- `imageUrl`
- `prompt`
- `resolution`
- `duration`
- `aspect_ratio`

Response fields:
- `videoUrl`
- `provider`
- `chargedCredits`

Pricing alias target:
- `lipsync`

## 8) Add Audio

- UI Tool: `add-audio`
- `actionType`: one of:
  - `speech-to-text`
  - `audio-isolation`

### 8.1 Speech-to-Text
Model used:
- `elevenlabs/speech-to-text`

Required fields:
- `audioUrl`

Response fields:
- `transcript`
- `provider`
- `chargedCredits`

Pricing alias target:
- `voice_gen`

### 8.2 Audio Isolation
Model used:
- `elevenlabs/audio-isolation`

Required fields:
- `audioUrl`

Response fields:
- `audioUrl`
- `provider`
- `chargedCredits`

Pricing alias target:
- `voice_chg`

## 9) Input Validation Summary

URL/data checks in API:
- Data URL (`data:`) is accepted for upload-like flows.
- Public safe HTTP URLs are accepted where applicable.
- Private/unsafe URLs are rejected.

Strict required checks:
- `tts`: `text`
- `video2audio`: `videoUrl`
- `voice-changer`: `audioUrl`
- `dubbing`: (`videoUrl` or `audioUrl`) + `targetLang`
- `voice-cloning`: `sampleAudioUrls`
- `speech-to-text`: `audioUrl`
- `audio-isolation`: `audioUrl`
- `lip-sync`: model-specific requirements listed above

## 10) Pricing/Quote Notes

- Quote endpoint resolves cost by `actionType` + model ref.
- Dynamic quote is returned from pricing constitution when available.
- Fallback legacy pricing is used only as safety net if quote data is incomplete.
- Charged credits are persisted and rollback is attempted if generation fails.
