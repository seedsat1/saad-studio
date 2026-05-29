/** Upscale — boost resolution and detail of an existing clip.
 *  Backend route: POST /api/panel/generate/video with mode="upscale". */

import { VideoUtilityPage } from "./video-utility-page";
import { api } from "../lib/api";

export function UpscalePage(): HTMLElement {
  return VideoUtilityPage({
    title: "Upscale",
    hint: "Boost the source clip with upscale factor controls similar to the website tool.",
    options: [
      { key: "factor", label: "Factor", value: "2x", options: [
        { value: "1x", label: "1x" },
        { value: "2x", label: "2x" },
        { value: "4x", label: "4x" },
      ]},
      { key: "denoise", label: "Quality", value: "med", options: [
        { value: "low", label: "Low" },
        { value: "med", label: "Medium" },
        { value: "high", label: "High" },
      ]},
    ],
    submit: ({ clip, options }) => api.generate.video({
      mode: "upscale",
      sourcePath: clip.path,
      factor: options.factor,
      denoise: options.denoise,
    }),
  });
}
