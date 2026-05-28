export function el(selector, props = null, ...children) {
    const { tag, id, classes } = parseSelector(selector);
    const node = document.createElement(tag);
    if (id)
        node.id = id;
    if (classes.length)
        node.className = classes.join(" ");
    if (props) {
        for (const [key, value] of Object.entries(props)) {
            if (value == null || value === false)
                continue;
            if (key === "style" && typeof value === "object") {
                Object.assign(node.style, value);
            }
            else if (key === "class" || key === "className") {
                node.className = `${node.className} ${value}`.trim();
            }
            else if (key === "dataset" && typeof value === "object") {
                Object.assign(node.dataset, value);
            }
            else if (key.startsWith("on") && typeof value === "function") {
                const event = key.slice(2).toLowerCase();
                node.addEventListener(event, value);
            }
            else if (key === "html") {
                node.innerHTML = String(value);
            }
            else {
                node.setAttribute(key, String(value));
            }
        }
    }
    appendChildren(node, children);
    return node;
}
function appendChildren(parent, children) {
    for (const child of children) {
        if (child == null || child === false)
            continue;
        if (Array.isArray(child)) {
            appendChildren(parent, child);
        }
        else if (child instanceof Node) {
            parent.appendChild(child);
        }
        else {
            parent.appendChild(document.createTextNode(String(child)));
        }
    }
}
function parseSelector(selector) {
    const parts = selector.split(/(?=[.#])/);
    const tag = parts[0].replace(/[.#].*/, "") || "div";
    let id = "";
    const classes = [];
    for (const part of parts.slice(1)) {
        if (part.startsWith("#"))
            id = part.slice(1);
        else if (part.startsWith("."))
            classes.push(part.slice(1));
    }
    return { tag, id, classes };
}
/** Replace the contents of a host with the given child(ren). */
export function mount(host, ...children) {
    host.replaceChildren();
    appendChildren(host, children);
}
