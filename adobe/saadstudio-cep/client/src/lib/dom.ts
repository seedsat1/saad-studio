/** Tiny DOM helper used throughout the panel.
 *
 *   el("div.card", { onClick: ... }, "Hello", child)
 *
 * - First arg is "tag.class1.class2" (id via "tag#id").
 * - Second arg is props (attributes + on* listeners + style object).
 * - Remaining args are children (strings, numbers, nodes, or arrays).
 *
 * Returns the created HTMLElement so callers can hold a reference. */
export type Child = string | number | Node | null | undefined | false | Child[];

interface Props {
  [key: string]: unknown;
}

export function el<K extends keyof HTMLElementTagNameMap>(
  selector: K | string,
  props: Props | null = null,
  ...children: Child[]
): HTMLElement {
  const { tag, id, classes } = parseSelector(selector);
  const node = document.createElement(tag);
  if (id) node.id = id;
  if (classes.length) node.className = classes.join(" ");

  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value == null || value === false) continue;
      if (key === "style" && typeof value === "object") {
        Object.assign(node.style, value as CSSStyleDeclaration);
      } else if (key === "class" || key === "className") {
        node.className = `${node.className} ${value}`.trim();
      } else if (key === "dataset" && typeof value === "object") {
        Object.assign(node.dataset, value as DOMStringMap);
      } else if (key.startsWith("on") && typeof value === "function") {
        const event = key.slice(2).toLowerCase();
        node.addEventListener(event, value as EventListener);
      } else if (key === "html") {
        node.innerHTML = String(value);
      } else {
        node.setAttribute(key, String(value));
      }
    }
  }

  appendChildren(node, children);
  return node;
}

function appendChildren(parent: HTMLElement, children: Child[]) {
  for (const child of children) {
    if (child == null || child === false) continue;
    if (Array.isArray(child)) {
      appendChildren(parent, child);
    } else if (child instanceof Node) {
      parent.appendChild(child);
    } else {
      parent.appendChild(document.createTextNode(String(child)));
    }
  }
}

function parseSelector(selector: string) {
  const parts = selector.split(/(?=[.#])/);
  const tag = parts[0].replace(/[.#].*/, "") || "div";
  let id = "";
  const classes: string[] = [];
  for (const part of parts.slice(1)) {
    if (part.startsWith("#")) id = part.slice(1);
    else if (part.startsWith(".")) classes.push(part.slice(1));
  }
  return { tag, id, classes };
}

/** Replace the contents of a host with the given child(ren). */
export function mount(host: HTMLElement, ...children: Child[]) {
  host.replaceChildren();
  appendChildren(host, children);
}
