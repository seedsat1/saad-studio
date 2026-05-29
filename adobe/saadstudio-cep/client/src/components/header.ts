/** Top header bar — brand on the left, credits + profile on the right. */

import { el } from "../lib/dom";
import { icon } from "../lib/icons";
import { store } from "../lib/store";
import { clearToken } from "../lib/auth";
import { navigate } from "../lib/router";

export function Header(): HTMLElement {
  const logo = el("img", {
    src: "https://www.saadstudio.app/logo-saad-transparent.png",
    alt: "Saad Studio",
  });
  const credits = el("div.credits-chip", null,
    icon("coin", 14),
    el("span.credits-chip__amount", { id: "hdr-credits" }, "—"),
  );

  const avatarBtn = el("button.avatar-button", { "aria-label": "Profile" },
    el("span", { style: { fontSize: "13px", fontWeight: "600" } }, "S")
  );
  let menuOpen = false;
  let menuEl: HTMLElement | null = null;

  function closeMenu() {
    menuEl?.remove();
    menuEl = null;
    menuOpen = false;
    document.removeEventListener("click", onOutsideClick, true);
  }
  function onOutsideClick(ev: Event) {
    if (!menuEl) return;
    const target = ev.target as Node;
    if (!menuEl.contains(target) && !avatarBtn.contains(target)) closeMenu();
  }
  function openMenu() {
    const state = store.get();
    const balance = state.user?.creditBalance ?? 0;
    menuEl = el("div.profile-menu",
      { onClick: (ev: Event) => ev.stopPropagation() },
      el("div.profile-menu__item.profile-menu__item--credits", null,
        el("span", null, "Credits"),
        el("span.profile-menu__credit-value", null, balance.toLocaleString()),
      ),
      el("div.profile-menu__divider"),
      el("button.profile-menu__item",
        { onClick: () => { closeMenu(); clearToken(); store.clearUser(); navigate("/connect"); } },
        el("span", { class: "row gap-2" }, icon("logout", 14), "Logout"),
      ),
    );
    document.body.appendChild(menuEl);
    menuOpen = true;
    setTimeout(() => document.addEventListener("click", onOutsideClick, true), 0);
  }

  avatarBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    if (menuOpen) closeMenu(); else openMenu();
  });

  const header = el("header.app-header",
    null,
    el("div.app-header__brand",
      { onClick: () => navigate("/"), style: { cursor: "pointer" } },
      el("div.app-header__logo", null, logo),
      el("div.col",
        null,
        el("span.app-header__title", null, "Saad Studio"),
      ),
      el("span.app-header__version", null, "v1.0"),
    ),
    el("div.app-header__right", null, credits, avatarBtn),
  );

  // Sync credits from store
  const updateCredits = () => {
    const span = header.querySelector("#hdr-credits");
    if (span) span.textContent = (store.get().user?.creditBalance ?? 0).toLocaleString();
  };
  store.subscribe(updateCredits);
  updateCredits();

  return header;
}
