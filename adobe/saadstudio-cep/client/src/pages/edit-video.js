/** Edit video — clean, reframe and upscale in one pass.
 *  Backend route: POST /api/panel/generate/video with mode="edit". */
import { VideoUtilityPage } from "./video-utility-page";
import { api } from "../lib/api";
export function EditVideoPage() {
    return VideoUtilityPage({
        title: "Edit video",
        hint: "Run a clean-up pass on the source clip: denoise, stabilize, regrade.",
        showPrompt: true,
        options: [
            { key: "preset", label: "Preset", value: "auto", options: [
                    { value: "auto", label: "Auto" },
                    { value: "interview", label: "Interview" },
                    { value: "broll", label: "B-roll" },
                    { value: "music", label: "Music video" },
                ] },
            { key: "quality", label: "Quality", value: "1080p", options: [
                    { value: "720p", label: "720p" },
                    { value: "1080p", label: "1080p" },
                ] },
        ],
        submit: ({ clip, prompt, options }) => api.generate.video({
            mode: "edit",
            sourcePath: clip.path,
            prompt,
            preset: options.preset,
            quality: options.quality,
        }),
    });
}
