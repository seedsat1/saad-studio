/** Reframe — change a clip's aspect ratio while keeping the subject centered.
 *  Backend route: POST /api/panel/generate/video with mode="reframe". */

import { VideoUtilityPage } from "./video-utility-page";
import { api } from "../lib/api";

export function ReframePage(): HTMLElement {
  return VideoUtilityPage({
    title: "Reframe",
    hint: "Convert the source clip to a new aspect ratio, keeping the action centered.",
    options: [
      { key: "aspect", label: "Aspect", value: "9:16", options: [
        { value: "9:16", label: "9:16" },
        { value: "1:1", label: "1:1" },
        { value: "4:3", label: "4:3" },
        { value: "16:9", label: "16:9" },
      ]},
      { key: "quality", label: "Quality", value: "1080p", options: [
        { value: "720p", label: "720p" },
        { value: "1080p", label: "1080p" },
      ]},
    ],
    submit: ({ clip, options }) => api.generate.video({
      mode: "reframe",
      sourcePath: clip.path,
      aspect: options.aspect,
      quality: options.quality,
    }),
  });
}
