/** Token connect screen.
 *
 * One-click flow:
 *   1. User taps "Connect with Saad Studio"
 *   2. Plugin opens the browser at `${API}/panel/connect?session={id}`
 *      and starts polling `/api/panel/auth-session/{id}`
 *   3. When the user signs in on the web, the server approves the
 *      session and the next poll returns the token — plugin saves it
 *      and navigates home automatically. No copy/paste needed.
 *
 * A "paste a token manually" link is kept as a fallback in case the
 * browser handoff fails (offline, popup blocked, etc.). */

import { el } from "../lib/dom";
import { icon } from "../lib/icons";
import { getApiBase, setApiBase } from "../lib/api";
import { setToken, looksLikePanelToken } from "../lib/auth";
import { store } from "../lib/store";
import { navigate } from "../lib/router";
import { toast } from "../lib/toast";
import { startAuthFlow, type AuthFlowHandle } from "../lib/oauth";

export function ConnectPage(): HTMLElement {
  const card = el("div", {
    style: {
      margin: "0 auto",
      width: "100%",
      maxWidth: "420px",
      background: "var(--bg-card)",
      border: "1px solid var(--line-soft)",
      borderRadius: "20px",
      padding: "24px",
    },
  });

  renderIdle(card);

  return el("div.col",
    { style: { height: "100%", justifyContent: "center", padding: "32px 24px" } },
    card,
  );
}

// ─── Idle (initial) state ─────────────────────────────────────────────

function renderIdle(card: HTMLElement) {
  const urlInput = el("input", {
    type: "text",
    value: getApiBase(),
    placeholder: "https://www.saadstudio.app",
    style: {
      width: "100%",
      padding: "8px 10px",
      borderRadius: "8px",
      background: "var(--bg-input)",
      border: "1px solid var(--line-medium)",
      color: "var(--text-primary)",
      fontFamily: "var(--font-mono)",
      fontSize: "11px",
    },
    onChange: (e: Event) => setApiBase((e.target as HTMLInputElement).value),
    onBlur: (e: Event) => setApiBase((e.target as HTMLInputElement).value),
  }) as HTMLInputElement;

  card.replaceChildren(
    headerRow(),
    el("p.dim",
      { style: { fontSize: "12px", margin: "0 0 16px" } },
      "Sign in once on the web and we'll connect this panel automatically.",
    ),
    el("div.col.gap-2", { style: { marginBottom: "16px" } },
      el("div", { style: { fontSize: "11px", color: "var(--text-muted)" } }, "SERVER"),
      urlInput,
    ),
    el("button.btn-primary",
      {
        style: { width: "100%" },
        onClick: () => beginFlow(card),
      },
      icon("arrow-up-right", 14), "Connect with Saad Studio",
    ),
    el("div", { style: { textAlign: "center", marginTop: "14px" } },
      el("button.muted",
        {
          style: {
            fontSize: "11px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted)",
            textDecoration: "underline",
          },
          onClick: () => renderManual(card),
        },
        "Paste a token manually",
      ),
    ),
  );
}

// ─── Waiting (browser opened, polling) state ──────────────────────────

function renderWaiting(card: HTMLElement, handle: AuthFlowHandle, statusEl: HTMLElement) {
  card.replaceChildren(
    headerRow(),
    el("div", {
      style: {
        margin: "20px auto",
        width: "44px",
        height: "44px",
        borderRadius: "50%",
        border: "3px solid var(--line-medium)",
        borderTopColor: "var(--brand-accent)",
        animation: "saadstudio-spin 0.9s linear infinite",
      },
    }),
    el("div", {
      style: { textAlign: "center", fontSize: "14px", fontWeight: "600", marginBottom: "4px" },
    }, "Waiting for sign-in…"),
    statusEl,
    el("p.dim",
      { style: { fontSize: "11px", textAlign: "center", margin: "16px 0 0" } },
      "A browser window opened on https://www.saadstudio.app. Sign in there to connect this panel.",
    ),
    el("div", { style: { textAlign: "center", marginTop: "14px" } },
      el("button.btn-secondary",
        { onClick: () => { handle.cancel(); renderIdle(card); } },
        "Cancel",
      ),
    ),
  );

  // Inject keyframe once
  if (!document.getElementById("saadstudio-spin-style")) {
    const style = document.createElement("style");
    style.id = "saadstudio-spin-style";
    style.textContent = "@keyframes saadstudio-spin{to{transform:rotate(360deg)}}";
    document.head.appendChild(style);
  }
}

// ─── Manual paste fallback ────────────────────────────────────────────

function renderManual(card: HTMLElement) {
  const input = el("textarea", {
    rows: "4",
    placeholder: "Paste your panel token (ssp_…)",
    style: {
      width: "100%",
      padding: "10px 12px",
      borderRadius: "10px",
      background: "var(--bg-input)",
      border: "1px solid var(--line-medium)",
      color: "var(--text-primary)",
      resize: "vertical",
      fontFamily: "var(--font-mono)",
      fontSize: "11px",
    },
  }) as HTMLTextAreaElement;

  card.replaceChildren(
    headerRow(),
    el("p.dim",
      { style: { fontSize: "12px", margin: "0 0 12px" } },
      "Generate a panel token at https://www.saadstudio.app/panel and paste it below.",
    ),
    input,
    el("div.row.gap-2", { style: { marginTop: "12px" } },
      el("button.btn-primary",
        { style: { flex: "1" }, onClick: () => submitManual(card, input.value) },
        icon("check", 14), "Connect",
      ),
      el("button.btn-secondary",
        { onClick: () => renderIdle(card) },
        "Back",
      ),
    ),
  );
}

async function submitManual(card: HTMLElement, raw: string) {
  if (!looksLikePanelToken(raw)) {
    toast("That doesn't look like a panel token.", "error");
    return;
  }
  setToken(raw);
  try {
    await store.refreshUser();
    if (!store.get().user) throw new Error(store.get().userError ?? "Token rejected");
    toast("Connected to Saad Studio", "success");
    navigate("/");
  } catch (err) {
    toast(`Could not verify token: ${(err as Error).message}`, "error");
    renderIdle(card);
  }
}

// ─── Flow orchestration ───────────────────────────────────────────────

async function beginFlow(card: HTMLElement) {
  const statusEl = el("div.dim",
    { style: { textAlign: "center", fontSize: "12px", minHeight: "16px" } },
    "Opening your browser…",
  );

  const { handle, done } = startAuthFlow({
    onStatus: (msg) => { statusEl.textContent = msg; },
  });

  renderWaiting(card, handle, statusEl);

  const result = await done;

  if (result.status === "approved" && result.token) {
    setToken(result.token);
    try {
      await store.refreshUser();
      if (!store.get().user) throw new Error(store.get().userError ?? "Token rejected");
      toast("Connected to Saad Studio", "success");
      navigate("/");
    } catch (err) {
      toast(`Sign-in succeeded but token verification failed: ${(err as Error).message}`, "error");
      renderIdle(card);
    }
    return;
  }
  if (result.status === "expired") {
    toast("Sign-in timed out. Try again.", "error");
    renderIdle(card);
    return;
  }
  if (result.status === "error") {
    toast(result.error ?? "Sign-in failed.", "error");
    renderIdle(card);
    return;
  }
  // cancelled — UI already rendered idle.
}

// ─── Shared header ────────────────────────────────────────────────────

function headerRow(): HTMLElement {
  const logo = el("img", {
    src: "https://www.saadstudio.app/logo-saad-transparent.png",
    alt: "Saad Studio",
  });
  return el("div.row.gap-3", { style: { marginBottom: "16px" } },
    el("div.app-header__logo", null, logo),
    el("div.col",
      null,
      el("div", { style: { fontSize: "16px", fontWeight: "700" } }, "Saad Studio"),
      el("div.dim", { style: { fontSize: "12px" } }, "Sign in once at https://www.saadstudio.app to connect your panel and start generating."),
    ),
  );
}
