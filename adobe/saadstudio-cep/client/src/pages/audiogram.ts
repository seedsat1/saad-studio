import { ComingSoonPage } from "./coming-soon-page";

export function AudiogramPage(): HTMLElement {
  return ComingSoonPage({
    title: "Audiogram",
    icon: "waveform",
    description:
      "Turn a podcast clip into a shareable waveform video with synced captions and a still or animated background.",
  });
}
