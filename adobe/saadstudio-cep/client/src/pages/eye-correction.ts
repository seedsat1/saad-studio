import { ComingSoonPage } from "./coming-soon-page";

export function EyeCorrectionPage(): HTMLElement {
  return ComingSoonPage({
    title: "Eye correction",
    icon: "eye",
    description:
      "Re-aim your subject's gaze toward the camera so off-prompter glances and side-eye reads look natural.",
  });
}
