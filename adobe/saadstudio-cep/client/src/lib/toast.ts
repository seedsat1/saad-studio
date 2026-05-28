/** Minimal toast helper. Renders into #toast-root and auto-dismisses. */

type Kind = "info" | "success" | "error";

export function toast(message: string, kind: Kind = "info", ttlMs = 4000) {
  const root = document.getElementById("toast-root");
  if (!root) return;
  const node = document.createElement("div");
  node.className = `toast toast--${kind}`;
  node.textContent = message;
  root.appendChild(node);
  setTimeout(() => {
    node.style.transition = "opacity 200ms ease";
    node.style.opacity = "0";
    setTimeout(() => node.remove(), 220);
  }, ttlMs);
}
