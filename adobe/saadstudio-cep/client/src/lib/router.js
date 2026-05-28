/** Minimal hash router.
 *
 * Hash-based so the panel works on file:// without needing a server. Each
 * route is a function that receives optional URL params and returns the
 * page element to mount. */
let table = {};
let host = null;
let fallback = () => textNode("Route not found.");
export function configureRouter(opts) {
    host = opts.host;
    table = opts.routes;
    if (opts.fallback)
        fallback = opts.fallback;
    window.addEventListener("hashchange", render);
    render();
}
export function navigate(path) {
    if (!path.startsWith("#"))
        path = "#" + path;
    if (location.hash === path) {
        render();
        return;
    }
    location.hash = path;
}
export function back() {
    if (history.length > 1)
        history.back();
    else
        navigate("/");
}
async function render() {
    if (!host)
        return;
    const { route, params } = parseHash(location.hash || "#/");
    const fn = table[route] ?? fallback;
    try {
        const node = await fn(params);
        host.replaceChildren(node);
        host.scrollTop = 0;
    }
    catch (err) {
        host.replaceChildren(textNode(`Error: ${err.message}`));
    }
}
function parseHash(hash) {
    const raw = hash.replace(/^#/, "");
    const [path, query] = raw.split("?");
    const route = "/" + path.replace(/^\/+/, "").replace(/\/+$/, "");
    return { route: route === "/" ? "/" : route, params: new URLSearchParams(query || "") };
}
function textNode(text) {
    const div = document.createElement("div");
    div.style.padding = "24px";
    div.style.color = "var(--text-muted)";
    div.textContent = text;
    return div;
}
