/** Minimal hash router.
 *
 * Hash-based so the panel works on file:// without needing a server. Each
 * route is a function that receives optional URL params and returns the
 * page element to mount. */

import type { Child } from "./dom";

export type RouteFn = (params: URLSearchParams) => HTMLElement | Promise<HTMLElement>;
export type RouteTable = Record<string, RouteFn>;

let table: RouteTable = {};
let host: HTMLElement | null = null;
let fallback: RouteFn = () => textNode("Route not found.");

export function configureRouter(opts: {
  host: HTMLElement;
  routes: RouteTable;
  fallback?: RouteFn;
}) {
  host = opts.host;
  table = opts.routes;
  if (opts.fallback) fallback = opts.fallback;
  window.addEventListener("hashchange", render);
  render();
}

export function navigate(path: string) {
  if (!path.startsWith("#")) path = "#" + path;
  if (location.hash === path) { render(); return; }
  location.hash = path;
}

export function back() {
  if (history.length > 1) history.back();
  else navigate("/");
}

async function render() {
  if (!host) return;
  const { route, params } = parseHash(location.hash || "#/");
  const fn = table[route] ?? fallback;
  try {
    const node = await fn(params);
    host.replaceChildren(node);
    host.scrollTop = 0;
  } catch (err) {
    host.replaceChildren(textNode(`Error: ${(err as Error).message}`));
  }
}

function parseHash(hash: string) {
  const raw = hash.replace(/^#/, "");
  const [path, query] = raw.split("?");
  const route = "/" + path.replace(/^\/+/, "").replace(/\/+$/, "");
  return { route: route === "/" ? "/" : route, params: new URLSearchParams(query || "") };
}

function textNode(text: string): HTMLElement {
  const div = document.createElement("div");
  div.style.padding = "24px";
  div.style.color = "var(--text-muted)";
  div.textContent = text;
  return div;
}

// Re-export for convenience when constructing routes
export type { Child };
