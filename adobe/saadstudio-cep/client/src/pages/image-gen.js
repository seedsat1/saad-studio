/** Image generation page.
 *
 * Backed by POST /api/panel/generate/image. The model list mirrors what the
 * Next.js MODEL_ROUTING already declares so add/remove a model in one place
 * (lib/apps-data or MODEL_ROUTING) and update both as needed. */
import { FeaturePage } from "./feature-page";
import { api } from "../lib/api";
const MODELS = [
    { value: "imagen-4-ultra", label: "Imagen 4 Ultra" },
    { value: "flux", label: "FLUX" },
    { value: "nano-banana-pro", label: "Nano Banana Pro" },
];
const ASPECTS = [
    { value: "1:1", label: "1:1" },
    { value: "16:9", label: "16:9" },
    { value: "9:16", label: "9:16" },
    { value: "4:3", label: "4:3" },
    { value: "3:4", label: "3:4" },
];
const RESOLUTIONS = [
    { value: "1k", label: "1k" },
    { value: "2k", label: "2k" },
    { value: "4k", label: "4k" },
];
export function ImageGenPage() {
    return FeaturePage({
        title: "Image generation",
        dock: {
            placeholder: "Describe the image you want to generate…",
            showAttach: true,
            options: [
                { key: "model", label: "Model", value: "nano-banana-pro", options: MODELS },
                { key: "aspect", label: "Aspect", value: "1:1", options: ASPECTS },
                { key: "resolution", label: "Resolution", value: "2k", options: RESOLUTIONS },
            ],
        },
        submit: ({ prompt, options }) => api.generate.image({
            prompt,
            model: options.model,
            aspect: options.aspect,
            resolution: options.resolution,
        }),
    });
}
