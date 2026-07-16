import { el } from "../lib/dom";

export function ProcessingLoader(label: string): HTMLElement {
  const traces = [
    ["M18 24H170Q205 24 205 54H280", "yellow"],
    ["M18 54H145Q180 54 180 76H280", "blue"],
    ["M18 106H145Q180 106 180 84H280", "green"],
    ["M18 136H170Q205 136 205 106H280", "purple"],
    ["M782 24H630Q595 24 595 54H520", "red"],
    ["M782 54H655Q620 54 620 76H520", "purple"],
    ["M782 106H655Q620 106 620 84H520", "blue"],
    ["M782 136H630Q595 136 595 106H520", "green"],
  ];
  const traceMarkup = traces.map(([path, color], index) =>
    `<path class="podcast-process-trace-bg" d="${path}"/><path class="podcast-process-trace-flow podcast-process-${color}" style="animation-delay:-${index * 0.18}s" d="${path}"/>`,
  ).join("");
  const pins = Array.from({ length: 6 }, (_, index) => {
    const y = 49 + index * 13;
    return `<rect class="podcast-process-chip-pin" x="270" y="${y}" width="10" height="5" rx="1"/><rect class="podcast-process-chip-pin" x="520" y="${y}" width="10" height="5" rx="1"/>`;
  }).join("");

  return el("div.podcast-process-loader", { role: "status", "aria-live": "polite" },
    el("div.podcast-process-loader__label", null,
      el("span.podcast-process-loader__pulse", { "aria-hidden": "true" }),
      label,
    ),
    el("div.podcast-process-loader__graphic", {
      "aria-hidden": "true",
      html: `<svg viewBox="0 0 800 160" preserveAspectRatio="xMidYMid meet" focusable="false">${traceMarkup}${pins}<rect class="podcast-process-chip-body" x="280" y="34" width="240" height="92" rx="20"/><rect class="podcast-process-chip-core" x="300" y="52" width="200" height="56" rx="12"/><text class="podcast-process-chip-text" x="400" y="76" text-anchor="middle">SAAD STUDIO</text><text class="podcast-process-chip-subtext" x="400" y="96" text-anchor="middle">PROCESSING</text></svg>`,
    }),
  );
}
