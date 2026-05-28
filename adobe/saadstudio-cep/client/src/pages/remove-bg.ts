/** Remove BG — strip the background from a clip.
 *  Backend route: POST /api/panel/generate/video with mode="remove-bg". */

import { VideoUtilityPage } from "./video-utility-page";
import { api } from "../lib/api";

export function RemoveBgPage(): HTMLElement {
  return VideoUtilityPage({
    title: "Remove background",
    hint: "Generate a transparent matte for the selected clip.",
    options: [
      { key: "output", label: "Output", value: "alpha", options: [
        { value: "alpha", label: "Alpha matte" },
        { value: "green", label: "Green screen" },
      ]},
      { key: "quality", label: "Quality", value: "1080p", options: [
        { value: "720p", label: "720p" },
        { value: "1080p", label: "1080p" },
      ]},
    ],
    submit: ({ clip, options }) => api.generate.video({
      mode: "remove-bg",
      sourcePath: clip.path,
      output: options.output,
      quality: options.quality,
    }),
  });
}
