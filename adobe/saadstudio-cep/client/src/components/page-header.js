/** Sub-page header — back button + title. */
import { el } from "../lib/dom";
import { icon } from "../lib/icons";
import { back } from "../lib/router";
export function PageHeader(title) {
    return el("div.page-header", null, el("button.page-header__back", { onClick: back, "aria-label": "Back" }, icon("back", 14)), el("div.page-header__title", null, title));
}
