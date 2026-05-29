/** Home page — header + account-linked gallery. */

import { el } from "../lib/dom";
import { Header } from "../components/header";
import { RecentStrip } from "../components/recent-strip";

export function HomePage(): HTMLElement {
  return el("div.col", { style: { height: "100%" } },
    Header(),
    el("div.app-main.app-main--library",
      null,
      RecentStrip(),
    ),
  );
}
