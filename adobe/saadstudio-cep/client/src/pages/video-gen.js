/** Video generation page — POST /api/panel/generate/video. */
import { FeaturePage } from "./feature-page";
import { api } from "../lib/api";
const MODELS = [
    { value: "kling-3", label: "Kling 3" },
    { value: "seedance-2", label: "Seedance 2" },
    { value: "sora-2", label: "Sora 2" },
    { value: "veo-3", label: "Google Veo 3" },
];
const ASPECTS = [
    { value: "16:9", label: "16:9" },
    { value: "9:16", label: "9:16" },
    { value: "1:1", label: "1:1" },
];
const DURATIONS = [
    { value: "5", label: "5s" },
    { value: "10", label: "10s" },
    { value: "15", label: "15s" },
];
const QUALITIES = [
    { value: "720p", label: "720p" },
    { value: "1080p", label: "1080p" },
];
const MODES = [
    { value: "std", label: "Std" },
    { value: "pro", label: "Pro" },
];
export function VideoGenPage() {
    return FeaturePage({
        title: "Video generation",
        dock: {
            placeholder: "Describe the video you want to generate…",
            showAttach: true,
            options: [
                { key: "model", label: "Model", value: "kling-3", options: MODELS },
                { key: "aspect", label: "Aspect", value: "16:9", options: ASPECTS },
                { key: "duration", label: "Duration", value: "5", options: DURATIONS },
                { key: "quality", label: "Quality", value: "720p", options: QUALITIES },
                { key: "mode", label: "Mode", value: "std", options: MODES },
            ],
        },
        submit: ({ prompt, options }) => api.generate.video({
            prompt,
            model: options.model,
            aspect: options.aspect,
            durationSec: Number(options.duration),
            quality: options.quality,
            mode: options.mode,
        }),
    });
}
