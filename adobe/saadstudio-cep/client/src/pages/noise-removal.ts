import { ComingSoonPage } from "./coming-soon-page";

export function NoiseRemovalPage(): HTMLElement {
  return ComingSoonPage({
    title: "Noise removal",
    icon: "noise",
    description:
      "Strip background hiss, hum and room noise from your audio so the dialogue lands clean — no plugins required.",
  });
}
