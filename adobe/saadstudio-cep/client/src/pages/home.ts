/** Home page — header + account-linked gallery. */

import { el } from "../lib/dom";
import { Header } from "../components/header";
import { RecentStrip } from "../components/recent-strip";
import { AppsGrid } from "../components/apps-grid";

export function HomePage(): HTMLElement {
  return el("div.col", { style: { height: "100%" } },
    Header(),
    el("div.app-main.app-main--library",
      null,
      section("Library", "Your account-linked results", RecentStrip()),
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
