/** Home page — header + tools. */

import { el } from "../lib/dom";
import { Header } from "../components/header";
import { AppsGrid } from "../components/apps-grid";

export function HomePage(): HTMLElement {
  return el("div.col", { style: { height: "100%" } },
    Header(),
    el("div.app-main.app-main--library",
      null,
      section("Tools", "Generation and utility tools in the plugin", AppsGrid()),
    ),
  );
}

function section(title: string, hint: string, body: HTMLElement): HTMLElement {
  return el("section.section", null,
    el("div.section__head", null,
      el("h2.section__title", null, title),
      el("span.section__hint", null, hint),
    ),
    body,
  );
}
