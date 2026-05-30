/** Inline SVG icon set.
 *
 * Returns an HTMLElement so callers can drop the icon into any layout. All
 * icons share a 24x24 viewBox and inherit `currentColor` so they pick up the
 * surrounding text color. Original stroke-based pictograms — no third-party
 * icon library bundled. */

export type IconName =
  | "image" | "video" | "magic-wand" | "crop" | "scissors"
  | "arrow-up-right" | "draw-pen" | "logout" | "coin"
  | "back" | "close" | "plus" | "import" | "send" | "chevron-down"
  | "settings" | "spark" | "check" | "trash"
  // Reap tool icons
  | "captions" | "mic" | "transcript" | "waveform" | "noise" | "eye" | "cut";

export function icon(name: IconName, size = 18): HTMLElement {
  const wrap = document.createElement("span");
  wrap.style.display = "inline-flex";
  wrap.style.alignItems = "center";
  wrap.style.justifyContent = "center";
  wrap.style.width = `${size}px`;
  wrap.style.height = `${size}px`;
  wrap.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
    width="${size}" height="${size}" fill="none" stroke="currentColor"
    stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${SHAPES[name]}</svg>`;
  return wrap;
}

const SHAPES: Record<IconName, string> = {
  image: `<rect x="3" y="4" width="18" height="16" rx="2"/>
          <circle cx="9" cy="10" r="2"/><path d="M21 17l-5-5-9 9"/>`,
  video: `<rect x="3" y="6" width="14" height="12" rx="2"/>
          <path d="M17 10l4-2v8l-4-2"/>`,
  "magic-wand": `<path d="M5 19l8-8"/><path d="M14 4l2 2-3 3-2-2z"/>
          <path d="M19 9l1 1"/><path d="M17 14l1 1"/><path d="M9 4l1 1"/>`,
  crop: `<path d="M6 2v15a1 1 0 0 0 1 1h15"/><path d="M2 6h15a1 1 0 0 1 1 1v15"/>`,
  scissors: `<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/>
          <path d="M8 8l13 11"/><path d="M8 16l13-11"/>`,
  "arrow-up-right": `<path d="M7 17L17 7"/><path d="M8 7h9v9"/>`,
  "draw-pen": `<path d="M3 21l4-1 12-12-3-3L4 17z"/><path d="M14 5l3 3"/>`,
  logout: `<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>`,
  coin: `<circle cx="12" cy="12" r="8"/><path d="M9 12h6"/><path d="M12 9v6"/>`,
  back: `<path d="M15 18l-6-6 6-6"/>`,
  close: `<path d="M6 6l12 12"/><path d="M18 6L6 18"/>`,
  plus: `<path d="M12 5v14"/><path d="M5 12h14"/>`,
  import: `<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/>`,
  send: `<path d="M5 12l14-7-5 16-3-7z"/>`,
  "chevron-down": `<path d="M6 9l6 6 6-6"/>`,
  settings: `<circle cx="12" cy="12" r="3"/>
          <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.5-2.4.9a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.5a7 7 0 0 0-2 1.2l-2.4-.9-2 3.5 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.5 2.4-.9a7 7 0 0 0 2 1.2L10 21h4l.5-2.5a7 7 0 0 0 2-1.2l2.4.9 2-3.5-2-1.5c.1-.4.1-.8.1-1.2z"/>`,
  spark: `<path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5z"/>`,
  check: `<path d="M5 12l5 5 9-9"/>`,
  trash: `<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>`,
  captions: `<rect x="3" y="5" width="18" height="14" rx="2"/>
    <path d="M10 10a2 2 0 0 0-2-2H7.5a1.5 1.5 0 0 0-1.5 1.5v5A1.5 1.5 0 0 0 7.5 16H8a2 2 0 0 0 2-2"/>
    <path d="M18 10a2 2 0 0 0-2-2h-.5a1.5 1.5 0 0 0-1.5 1.5v5A1.5 1.5 0 0 0 15.5 16h.5a2 2 0 0 0 2-2"/>`,
  mic: `<rect x="9" y="3" width="6" height="12" rx="3"/>
    <path d="M5 11a7 7 0 0 0 14 0"/>
    <path d="M12 18v3"/><path d="M8 21h8"/>`,
  transcript: `<path d="M4 4h12a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2z"/>
    <path d="M8 9h6"/><path d="M8 13h6"/><path d="M8 17h4"/>`,
  waveform: `<path d="M3 12v0"/><path d="M6 8v8"/><path d="M9 5v14"/>
    <path d="M12 9v6"/><path d="M15 6v12"/><path d="M18 10v4"/><path d="M21 12v0"/>`,
  noise: `<path d="M3 12h2l2-5 4 14 4-10 2 5h4"/>`,
  eye: `<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/>
    <circle cx="12" cy="12" r="3"/>`,
  cut: `<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/>
    <path d="M20 4L8.5 16.5"/><path d="M20 20L13 13"/>`,
};
