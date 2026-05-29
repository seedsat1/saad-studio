import { el } from "../lib/dom";
import { Header } from "../components/header";
import { PageHeader } from "../components/page-header";
import { icon } from "../lib/icons";

export function DrawToVideoPage(): HTMLElement {
  return el("div.col", { style: { height: "100%" } },
    Header(),
    PageHeader("Draw to video"),
    el("div.app-main",
      null,
      el("div.state-card", null,
        el("div.state-card__icon", null, icon("draw-pen", 22)),
        el("div.state-card__title", null, "Temporarily disabled"),
        el("div.state-card__subtitle", null,
          "Draw to video is disabled for now until it is connected to a real generation model."),
      ),
    ),
  );
}
