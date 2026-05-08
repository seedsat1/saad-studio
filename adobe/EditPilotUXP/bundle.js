"use strict";
var EditPilot = (() => {
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });

  // modules/storage.js
  var KEYS = {
    SITE_URL: "ep.siteUrl",
    TOKEN: "ep.token",
    EMAIL: "ep.email",
    NAME: "ep.name",
    PLAN: "ep.plan",
    CREDITS: "ep.credits",
    SUB_ACTIVE: "ep.subActive"
  };
  // Production URL is the safe default — localhost is only useful when
  // the developer is running `npm run dev` locally.
  var DEFAULT_SITE_URL = "https://www.saadstudio.app";
  function saveSiteUrl(url) {
    const clean = (url || "").trim().replace(/\/+$/, "") || DEFAULT_SITE_URL;
    localStorage.setItem(KEYS.SITE_URL, clean);
  }
  function getSiteUrl() {
    try {
      const saved = (localStorage.getItem(KEYS.SITE_URL) || "").trim().replace(/\/+$/, "");
      if (saved) return saved;
    } catch (e) { /* localStorage may be unavailable on first run */ }
    return DEFAULT_SITE_URL;
  }
  function saveSession(data) {
    if (data.token !== void 0) localStorage.setItem(KEYS.TOKEN, String(data.token));
    if (data.email !== void 0) localStorage.setItem(KEYS.EMAIL, String(data.email));
    if (data.name !== void 0) localStorage.setItem(KEYS.NAME, String(data.name));
    if (data.plan !== void 0) localStorage.setItem(KEYS.PLAN, String(data.plan));
    if (data.credits !== void 0) localStorage.setItem(KEYS.CREDITS, String(Number(data.credits) || 0));
    if (data.subscriptionActive !== void 0) localStorage.setItem(KEYS.SUB_ACTIVE, data.subscriptionActive ? "1" : "0");
  }
  function updateCreditsCache(balance) {
    localStorage.setItem(KEYS.CREDITS, String(Number(balance) || 0));
  }
  function clearSession() {
    [KEYS.TOKEN, KEYS.EMAIL, KEYS.NAME, KEYS.PLAN, KEYS.CREDITS, KEYS.SUB_ACTIVE].forEach((k) => localStorage.removeItem(k));
  }
  function getToken() {
    return (localStorage.getItem(KEYS.TOKEN) || "").trim();
  }

  // modules/apiClient.js
  var ApiError = class extends Error {
    constructor(message, statusCode) {
      super(message);
      this.name = "ApiError";
      this.statusCode = statusCode || 0;
      this.isCreditsError = false;
    }
  };
  async function request(path, opts = {}, token = null) {
    const headers = { "Content-Type": "application/json", ...opts.headers || {} };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const url = getSiteUrl() + path;
    let response;
    try {
      response = await fetch(url, { ...opts, headers });
    } catch (_) {
      throw new ApiError("Network error \u2014 check your connection or site URL.", 0);
    }
    let data = null;
    try {
      data = await response.json();
    } catch (_) {
      data = {};
    }
    if (response.status === 401) {
      throw new ApiError(data?.error || "Invalid or expired panel token. Reconnect from saadstudio.app/panel.", 401);
    }
    if (response.status === 402) {
      const err = new ApiError(data?.error || "Insufficient credits.", 402);
      err.isCreditsError = true;
      err.requiredCredits = data?.requiredCredits;
      err.currentBalance = data?.currentBalance;
      throw err;
    }
    if (response.status === 403) {
      throw new ApiError(data?.error || "Access denied \u2014 account may be suspended.", 403);
    }
    if (!response.ok) {
      throw new ApiError(data?.error || `Server error (${response.status})`, response.status);
    }
    return data;
  }
  async function verifyToken(token) {
    return request("/api/panel/me", { method: "GET" }, token);
  }
  async function getCredits(token) {
    return request("/api/panel/credits", { method: "GET" }, token);
  }
  async function sendChat(token, messages, reasoning_effort = "high") {
    return request("/api/panel/chat", {
      method: "POST",
      body: JSON.stringify({ messages, reasoning_effort })
    }, token);
  }
  async function generateImage(token, params) {
    return request("/api/panel/generate/image", {
      method: "POST",
      body: JSON.stringify(params)
    }, token);
  }
  async function generateVideo(token, params) {
    return request("/api/panel/generate/video", {
      method: "POST",
      body: JSON.stringify(params)
    }, token);
  }
  async function generateTTS(token, params) {
    return request("/api/panel/generate/tts", {
      method: "POST",
      body: JSON.stringify(params)
    }, token);
  }

  // modules/auth.js
  async function connectWithToken(siteUrl, panelToken) {
    const cleanUrl = (siteUrl || "").trim().replace(/\/+$/, "");
    const cleanToken = (panelToken || "").trim();
    if (!cleanUrl) throw new Error("Please enter your Saad Studio site URL.");
    if (!cleanToken) throw new Error("Please enter your Panel Token (ssp_...).");
    if (!cleanToken.startsWith("ssp_")) {
      throw new Error("Invalid token format. Make sure you copied the full ssp_... token.");
    }
    saveSiteUrl(cleanUrl);
    const data = await verifyToken(cleanToken);
    const session = {
      token: cleanToken,
      email: data.email || "",
      name: data.name || "",
      plan: data.subscription?.planId ?? "Free",
      credits: data.creditBalance ?? 0,
      subscriptionActive: data.subscription?.active === true
    };
    saveSession(session);
    return session;
  }
  function disconnect() {
    clearSession();
  }

  // modules/credits.js
  async function refreshCreditsFromServer() {
    const token = getToken();
    if (!token) throw new Error("Not connected.");
    const data = await getCredits(token);
    const balance = Number(data?.creditBalance ?? 0);
    updateCreditsCache(balance);
    return balance;
  }
  function formatCredits(n) {
    return Number(n || 0).toLocaleString("en-US");
  }
  function creditsPercent(balance, max = 1200) {
    return Math.max(5, Math.min(100, balance / max * 100));
  }

  // modules/ui.js
  function el(id) {
    return document.getElementById(id);
  }
  function esc(s) {
    return String(s || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  }
  function showConnect() {
    el("connectScreen")?.classList.add("vis");
    el("dashboard")?.classList.remove("vis");
    setConnectError("");
  }
  function showDashboard() {
    el("connectScreen")?.classList.remove("vis");
    el("dashboard")?.classList.add("vis");
  }
  function setConnectError(msg) {
    const e = el("connectError");
    if (e) e.textContent = msg || "";
  }
  function setConnectLoading(loading) {
    const btn = el("btnConnect");
    if (!btn) return;
    btn.disabled = loading;
    btn.textContent = loading ? "Connecting\u2026" : "Connect";
  }
  function setSubWarning(show) {
    el("subWarn")?.classList.toggle("vis", show);
  }
  function updateHeader(session) {
    const initials = (session.name || session.email || "SS").split(" ").map((p) => p[0] || "").join("").slice(0, 2).toUpperCase() || "EP";
    const av = el("hdrAvatar");
    if (av) {
      av.textContent = initials;
      av.title = session.email;
    }
    const planBadge = el("hdrPlan");
    if (planBadge) planBadge.textContent = session.plan || "Free";
    updateCreditsDisplay(session.credits);
  }
  function updateCreditsDisplay(balance) {
    const num = el("crNum");
    if (num) num.textContent = formatCredits(balance);
    const fill = el("crFill");
    if (fill) fill.style.width = creditsPercent(balance) + "%";
    const bigNum = el("dashCreditsVal");
    if (bigNum) bigNum.innerHTML = `${esc(formatCredits(balance))}<span>cr</span>`;
    const bigBar = el("dashCreditsBar");
    if (bigBar) bigBar.style.width = creditsPercent(balance) + "%";
  }
  function updateUserStrip(session) {
    const initials = (session.name || session.email || "SS").split(" ").map((p) => p[0] || "").join("").slice(0, 2).toUpperCase() || "EP";
    const av = el("stripAvatar");
    if (av) av.textContent = initials;
    const name = el("stripName");
    if (name) name.textContent = session.name || session.email || "User";
    const email = el("stripEmail");
    if (email) email.textContent = session.email || "";
    const planEl = el("stripPlan");
    if (planEl) planEl.textContent = session.plan || "Free";
    const dashPlan = el("dashPlanBadge");
    if (dashPlan) dashPlan.textContent = session.plan || "Free";
  }

  // modules/storyEngine.js
  var STORY_ENDPOINT = "/api/panel/generate/story";
  async function analyzeTranscript(token, transcript, modelId) {
    const base = getSiteUrl().replace(/\/+$/, "");
    console.log('[storyEngine] ✓ analyzeTranscript called with modelId:', modelId);
    const body = { transcript, type: "story_cut" };
    if (modelId) body.modelId = modelId;
    const res = await fetch(`${base}${STORY_ENDPOINT}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data?.error || `Server error ${res.status}`);
      err.statusCode = res.status;
      err.isCreditsError = res.status === 402;
      err.requiredCredits = data?.requiredCredits;
      err.currentBalance = data?.currentBalance;
      throw err;
    }
    if (!data.language) {
      data.language = detectLanguageClient(transcript);
    }
    return data;
  }
  function detectLanguageClient(text) {
    const ar = (text.match(/[؀-ۿݐ-ݿ]/g) ?? []).length;
    const en = (text.match(/[A-Za-z]/g) ?? []).length;
    if (ar === 0 && en === 0) return "en";
    return ar / (ar + en) > 0.25 ? "ar" : "en";
  }
  function renderStorySections(sections, container, onSelect, onApply, options = {}) {
    container.innerHTML = "";
    const language = options.language || detectSectionsLanguage(sections) || "en";
    const isArabic = language === "ar";
    container.setAttribute("dir", isArabic ? "rtl" : "ltr");
    container.setAttribute("lang", language);
    container.classList.toggle("story-rtl", isArabic);
    if (!sections?.length) {
      const emptyMsg = isArabic ? "\u0644\u0645 \u064A\u064F\u0631\u062C\u0639 \u0627\u0644\u0645\u062D\u0631\u0651\u0643 \u0623\u064A \u0645\u0642\u0627\u0637\u0639." : "No sections returned.";
      container.innerHTML = `<div class="story-empty">${emptyMsg}</div>`;
      return;
    }
    const applyTooltip = isArabic ? "\u0625\u0636\u0627\u0641\u0629 \u0639\u0644\u0627\u0645\u0629 \u0641\u064A \u062A\u0627\u064A\u0645\u0644\u0627\u064A\u0646 Premiere" : "Apply marker to Premiere timeline";
    sections.forEach((section, idx) => {
      const card = document.createElement("div");
      card.className = "story-card";
      if (isArabic) card.classList.add("story-card-rtl");
      card.setAttribute("data-idx", idx);
      card.setAttribute("dir", isArabic ? "rtl" : "ltr");
      const hasTime = section.start !== "00:00:00" || section.end !== "00:00:00";
      const timeBadge = hasTime ? `<div class="sc-time" dir="ltr">${esc2(section.start)} <span>\u2192</span> ${esc2(section.end)}</div>` : "";
      card.innerHTML = `
      <div class="sc-header">
        <span class="sc-num" dir="ltr">${idx + 1}</span>
        <span class="sc-title">${esc2(section.title)}</span>
        ${timeBadge}
        <button class="sc-apply-btn" type="button" title="${esc2(applyTooltip)}" aria-label="${esc2(applyTooltip)}">&#9654;</button>
      </div>
      <div class="sc-reason">${esc2(section.reason)}</div>
    `;
      card.addEventListener("click", (e) => {
        if (e.target.closest(".sc-apply-btn")) return;
        container.querySelectorAll(".story-card").forEach((c) => c.classList.remove("selected"));
        card.classList.add("selected");
        onSelect?.(section);
      });
      const applyBtn = card.querySelector(".sc-apply-btn");
      applyBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        onApply?.(section, applyBtn);
      });
      container.appendChild(card);
    });
  }
  function detectSectionsLanguage(sections) {
    if (!Array.isArray(sections) || sections.length === 0) return null;
    const sample = sections.map((s) => `${s?.title ?? ""} ${s?.reason ?? ""}`).join(" ");
    const ar = (sample.match(/[؀-ۿݐ-ݿ]/g) ?? []).length;
    const en = (sample.match(/[A-Za-z]/g) ?? []).length;
    if (ar === 0 && en === 0) return null;
    return ar / (ar + en) > 0.25 ? "ar" : "en";
  }
  function esc2(s) {
    return String(s || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  }

  // modules/timeline.js
  var TICKS_PER_SECOND = 254016e6;
  function timeToSeconds(timeStr) {
    if (!timeStr || typeof timeStr !== "string") return 0;
    const parts = timeStr.trim().split(":").map(Number);
    if (parts.some(isNaN)) return 0;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 1) return parts[0];
    return 0;
  }
  function secondsToTicks(seconds) {
    return Math.round(seconds * TICKS_PER_SECOND);
  }
  function getPpro() {
    try {
      return __require("premierepro");
    } catch {
      throw new Error(
        "Premiere Pro API is not available. Make sure the plugin is running inside Adobe Premiere Pro."
      );
    }
  }
  async function resolveActiveProject() {
    const ppro = getPpro();
    if (ppro.Project && typeof ppro.Project.getActiveProject === "function") {
      try {
        const p = await ppro.Project.getActiveProject();
        if (p) return p;
      } catch (err) {
        console.warn("[timeline] ppro.Project.getActiveProject failed:", err?.message);
      }
    }
    if (ppro.app && typeof ppro.app.getActiveProjectAsync === "function") {
      try {
        const p = await ppro.app.getActiveProjectAsync();
        if (p) return p;
      } catch (err) {
        console.warn("[timeline] ppro.app.getActiveProjectAsync failed:", err?.message);
      }
    }
    if (ppro.app && typeof ppro.app.getActiveProject === "function") {
      try {
        const p = ppro.app.getActiveProject();
        if (p) return p;
      } catch (err) {
        console.warn("[timeline] ppro.app.getActiveProject failed:", err?.message);
      }
    }
    throw new Error(
      "No Premiere Pro project is open. Please open a project first."
    );
  }
  async function resolveActiveSequence() {
    const project = await resolveActiveProject();
    let sequence;
    try {
      if (typeof project.getActiveSequence === "function") {
        const result = project.getActiveSequence();
        sequence = result && typeof result.then === "function" ? await result : result;
      }
    } catch (err) {
      console.warn("[timeline] project.getActiveSequence failed:", err?.message);
    }
    if (!sequence && typeof project.getActiveSequenceAsync === "function") {
      try {
        sequence = await project.getActiveSequenceAsync();
      } catch (err) {
        console.warn("[timeline] project.getActiveSequenceAsync failed:", err?.message);
      }
    }
    if (!sequence) {
      throw new Error(
        "No active sequence. Please double-click a sequence in the Project panel to open it."
      );
    }
    return sequence;
  }
  async function getActiveSequence() {
    return resolveActiveSequence();
  }
  function executeProjectAction(project, action, label) {
    const run = () => project.executeTransaction((compoundAction) => {
      const added = compoundAction.addAction(action);
      console.log("[timeline] compoundAction.addAction:", added, label);
    });
    if (typeof project.lockedAccess === "function") {
      return project.lockedAccess(run);
    }
    return run();
  }
  async function applySectionToTimeline(section) {
    const startSec = timeToSeconds(section.start);
    const endSec = timeToSeconds(section.end);
    const startTicks = secondsToTicks(startSec);
    const endTicks = endSec > startSec ? secondsToTicks(endSec) : secondsToTicks(startSec + 1);
    const sequence = await getActiveSequence();
    const name = (section.title || "").slice(0, 100);
    const comments = (section.reason || "").slice(0, 500);
    const ppro = getPpro();
    console.log(
      "[applySectionToTimeline] sequence keys:",
      Object.getOwnPropertyNames(sequence),
      "proto:",
      Object.getOwnPropertyNames(Object.getPrototypeOf(sequence) || {})
    );
    console.log("[applySectionToTimeline] ppro keys:", Object.keys(ppro));
    console.log("[applySectionToTimeline] ppro.Markers:", ppro.Markers);
    console.log("[applySectionToTimeline] ppro.Marker:", ppro.Marker);
    console.log(
      "[applySectionToTimeline] Markers static:",
      Object.getOwnPropertyNames(ppro.Markers || {})
    );
    console.log(
      "[applySectionToTimeline] SequenceUtils static:",
      Object.getOwnPropertyNames(ppro.SequenceUtils || {})
    );
    console.log(
      "[applySectionToTimeline] Marker static:",
      Object.getOwnPropertyNames(ppro.Marker || {})
    );
    if (typeof sequence.getMarkers === "function") {
      const markers = await sequence.getMarkers();
      const project = await resolveActiveProject();
      if (markers && typeof markers.createMarker === "function") {
        const marker = await markers.createMarker(startTicks);
        if (marker) {
          try {
            marker.name = name;
          } catch {
          }
          try {
            marker.comments = comments;
          } catch {
          }
          try {
            marker.end = endTicks;
          } catch {
          }
        }
        return;
      }
    }
    if (ppro.Markers && typeof ppro.Markers.getMarkers === "function") {
      const markers = await ppro.Markers.getMarkers(sequence);
      console.log("[applySectionToTimeline] markers obj:", markers);
      const project = await resolveActiveProject();
      if (markers && typeof markers.createAddMarkerAction === "function") {
        const makeTickTime = (seconds) => {
          if (ppro.TickTime && typeof ppro.TickTime.createWithSeconds === "function") {
            return ppro.TickTime.createWithSeconds(seconds);
          }
          if (ppro.TickTime && typeof ppro.TickTime === "function") {
            try {
              return new ppro.TickTime(String(secondsToTicks(seconds)));
            } catch {
            }
          }
          return null;
        };
        let startTT = makeTickTime(startSec);
        let durTT = makeTickTime(Math.max(endSec - startSec, 1));
        if (!startTT) {
          try {
            const endTime = await sequence.getEndTime();
            console.log(
              "[markers] endTime sample:",
              endTime,
              "proto:",
              Object.getOwnPropertyNames(Object.getPrototypeOf(endTime) || {})
            );
            const TTCtor = endTime?.constructor;
            if (TTCtor) {
              startTT = new TTCtor(String(secondsToTicks(startSec)));
              durTT = new TTCtor(String(secondsToTicks(Math.max(endSec - startSec, 1))));
            }
          } catch (e) {
            console.warn("[markers] could not derive TickTime:", e?.message);
          }
        }
        console.log("[markers] startTT:", startTT, "durTT:", durTT);
        const markerType = ppro.Marker?.MARKER_TYPE_COMMENT || "Comment";
        let marker = null;
        try {
          marker = new ppro.Marker();
        } catch (e) {
          console.warn("[markers] new ppro.Marker() failed:", e?.message);
        }
        if (marker) {
          try {
            marker.name = name;
          } catch {
          }
          try {
            marker.comments = comments;
          } catch {
          }
          try {
            marker.type = markerType;
          } catch {
          }
          try {
            marker.start = startTT;
          } catch {
          }
          try {
            marker.duration = durTT;
          } catch {
          }
          try {
            marker.end = startTT && durTT ? null : null;
          } catch {
          }
          console.log("[markers] built marker:", marker);
        }
        let action;
        const attempts = [
          () => markers.createAddMarkerAction(name, markerType, startTT, durTT, comments)
        ];
        for (const fn of attempts) {
          try {
            action = fn();
            if (action) break;
          } catch (e) {
            console.warn("[markers] sig failed:", e?.message);
          }
        }
        if (!action) throw new Error("createAddMarkerAction: no working signature");
        await executeProjectAction(project, action, `EditPilot: ${name}`);
        return;
      }
      if (markers && typeof markers.createMarker === "function") {
        const marker = await markers.createMarker(startTicks);
        if (marker) {
          try {
            marker.name = name;
          } catch {
          }
          try {
            marker.comments = comments;
          } catch {
          }
          try {
            marker.end = endTicks;
          } catch {
          }
        }
        return;
      }
    }
    if (sequence.markers && typeof sequence.markers.createMarker === "function") {
      const marker = sequence.markers.createMarker(startTicks);
      marker.name = name;
      marker.comments = comments;
      marker.end = endTicks;
      return;
    }
    throw new Error("No supported markers API on this Premiere Pro version.");
  }
  function validateStorySections(sections) {
    if (!Array.isArray(sections)) return [];
    return sections.map((section) => {
      const startRaw = (section.start ?? "").trim();
      const endRaw = (section.end ?? "").trim();
      if (startRaw === "00:00:00" && endRaw === "00:00:00") {
        return {
          section,
          valid: true,
          error: null,
          startSec: 0,
          endSec: 1,
          durationSec: 1,
          hasTimestamps: false
        };
      }
      const sParts = startRaw.split(":").map(Number);
      if (sParts.length < 2 || sParts.some(isNaN)) {
        return {
          section,
          valid: false,
          error: "Invalid start timestamp",
          startSec: 0,
          endSec: 0,
          durationSec: 0,
          hasTimestamps: true
        };
      }
      const startSec = timeToSeconds(startRaw);
      const eParts = endRaw.split(":").map(Number);
      if (eParts.length < 2 || eParts.some(isNaN)) {
        return {
          section,
          valid: false,
          error: "Invalid end timestamp",
          startSec,
          endSec: 0,
          durationSec: 0,
          hasTimestamps: true
        };
      }
      const endSec = timeToSeconds(endRaw);
      if (endSec <= startSec) {
        return {
          section,
          valid: false,
          error: "End time must be after start time",
          startSec,
          endSec,
          durationSec: 0,
          hasTimestamps: true
        };
      }
      return {
        section,
        valid: true,
        error: null,
        startSec,
        endSec,
        durationSec: endSec - startSec,
        hasTimestamps: true
      };
    });
  }
  async function checkActiveSequence() {
    try {
      await getActiveSequence();
      return { ok: true, error: null };
    } catch (err) {
      return { ok: false, error: err?.message ?? "No active sequence" };
    }
  }
  async function applyAllSectionsToTimeline(sections, onProgress) {
    if (!Array.isArray(sections) || sections.length === 0) {
      return { applied: 0, errors: [] };
    }
    const errors = [];
    let applied = 0;
    for (const section of sections) {
      try {
        await applySectionToTimeline(section);
        applied++;
        onProgress?.(applied, sections.length);
      } catch (err) {
        const msg = err?.message ?? "Unknown error";
        errors.push(`"${section.title ?? "Section"}": ${msg}`);
      }
    }
    return { applied, errors };
  }

  // modules/timeline-confirm.js
  function fmtDuration(sec) {
    if (!Number.isFinite(sec) || sec <= 0) return "\u2014";
    const h = Math.floor(sec / 3600);
    const m = Math.floor(sec % 3600 / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) return `${h}h${String(m).padStart(2, "0")}m${String(s).padStart(2, "0")}s`;
    if (m > 0) return `${m}m${String(s).padStart(2, "0")}s`;
    return `${s}s`;
  }
  function esc3(v) {
    return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function openConfirmModal(sections, options = {}) {
    const modalTitle = options.title ?? "Confirm Timeline Markers";
    const applyLabel = options.applyLabel ?? "\u25B6 Apply to Timeline";
    const description = options.description ?? "Uncheck sections to skip. Markers only \u2014 no clips will move.";
    return new Promise((resolve) => {
      const validated = validateStorySections(sections);
      const validCount = validated.filter((v) => v.valid).length;
      const overlay = document.createElement("div");
      overlay.className = "tl-modal-overlay";
      overlay.innerHTML = `
      <div class="tl-modal">

        <div class="tl-modal-hdr">
          <span class="tl-modal-title">${modalTitle}</span>
          <button class="tl-modal-close" id="tlClose" title="Cancel (Esc)">\u2715</button>
        </div>

        <div class="tl-modal-sub">
          <span>${description}</span>
          <span class="tl-modal-badge${validCount === 0 ? " err" : ""}">
            ${validCount} valid / ${validated.length}
          </span>
        </div>

        <div class="tl-seq-warn" id="tlSeqWarn"></div>

        <div class="tl-modal-body" id="tlBody"></div>

        <div class="tl-modal-status" id="tlStatus"></div>

        <div class="tl-modal-footer">
          <button class="tl-modal-btn tl-btn-cancel" id="tlCancel">Cancel</button>
          <button class="tl-modal-btn tl-btn-apply" id="tlApply"
                  ${validCount === 0 ? "disabled" : ""}>
            ${applyLabel}
          </button>
        </div>

      </div>
    `;
      document.body.appendChild(overlay);
      const bodyEl = overlay.querySelector("#tlBody");
      const checkboxes = [];
      validated.forEach((item, i) => {
        const { section, valid, error, durationSec, hasTimestamps } = item;
        const row = document.createElement("div");
        row.className = `tl-row${valid ? "" : " tl-row--invalid"}`;
        const checkId = `tlCk_${i}`;
        const durLabel = valid ? fmtDuration(durationSec) : "\u2014";
        const timeLabel = hasTimestamps ? `${esc3(section.start)} \u2192 ${esc3(section.end)}` : valid ? "No timestamps \u2014 marker at 0:00" : "\u2014";
        row.innerHTML = `
        <label class="tl-row-check-wrap" for="${checkId}">
          <input type="checkbox" class="tl-row-check" id="${checkId}"
                 data-idx="${i}" ${valid ? "checked" : "disabled"}>
        </label>
        <div class="tl-row-num">${i + 1}</div>
        <div class="tl-row-info">
          <div class="tl-row-title" title="${esc3(section.title ?? "")}">
            ${esc3(section.title ?? "(no title)")}
          </div>
          <div class="tl-row-time">${timeLabel}</div>
          ${section.reason ? `<div class="tl-row-reason">${esc3(section.reason)}</div>` : ""}
        </div>
        <div class="tl-row-dur" title="${esc3(error ?? "")}">
          ${valid ? durLabel : `<span class="tl-invalid-lbl" title="${esc3(error ?? "")}">\u2715 ${esc3(error ?? "invalid")}</span>`}
        </div>
      `;
        bodyEl.appendChild(row);
        const cb = row.querySelector(".tl-row-check");
        if (cb && valid) checkboxes.push(cb);
      });
      const statusEl = overlay.querySelector("#tlStatus");
      const applyBtn = overlay.querySelector("#tlApply");
      function updateStatus() {
        const n = checkboxes.filter((cb) => cb.checked).length;
        if (!statusEl) return;
        if (n === 0) {
          statusEl.textContent = "No sections selected";
          statusEl.className = "tl-modal-status warn";
          if (applyBtn) applyBtn.disabled = true;
        } else {
          statusEl.textContent = `Ready to apply ${n} marker${n !== 1 ? "s" : ""}`;
          statusEl.className = "tl-modal-status ok";
          if (applyBtn) applyBtn.disabled = false;
        }
      }
      checkboxes.forEach((cb) => cb.addEventListener("change", updateStatus));
      updateStatus();
      checkActiveSequence().then(({ ok, error }) => {
        if (!ok) {
          const warnEl = overlay.querySelector("#tlSeqWarn");
          if (warnEl) {
            warnEl.textContent = `\u26A0 ${error}`;
            warnEl.style.display = "block";
          }
          if (applyBtn) applyBtn.disabled = true;
          if (statusEl) {
            statusEl.textContent = "Cannot apply \u2014 no active sequence";
            statusEl.className = "tl-modal-status warn";
          }
        }
      }).catch(() => {
      });
      function cleanup() {
        overlay.remove();
        document.removeEventListener("keydown", onKey);
      }
      function cancel() {
        cleanup();
        resolve({ confirmed: false, selected: [] });
      }
      function confirm() {
        const selected = checkboxes.filter((cb) => cb.checked).map((cb) => validated[Number(cb.dataset.idx)].section);
        cleanup();
        resolve({ confirmed: true, selected });
      }
      function onKey(e) {
        if (e.key === "Escape") cancel();
        if (e.key === "Enter" && applyBtn && !applyBtn.disabled) confirm();
      }
      document.addEventListener("keydown", onKey);
      overlay.querySelector("#tlClose")?.addEventListener("click", cancel);
      overlay.querySelector("#tlCancel")?.addEventListener("click", cancel);
      overlay.querySelector("#tlApply")?.addEventListener("click", confirm);
    });
  }

  // modules/selects.js
  var TICKS_PER_SECOND2 = 254016e6;
  var SEQUENCE_PREFIX = "EditPilot Selects";
  var ROUGH_CUT_PREFIX = "EditPilot Rough Cut";
  var MIN_DURATION_SEC = 0.5;
  var MAX_DURATION_SEC = 600;
  function secondsToTicks2(seconds) {
    return Math.round(seconds * TICKS_PER_SECOND2);
  }
  function buildTimestamp() {
    const d = /* @__PURE__ */ new Date();
    const ymd = d.toLocaleDateString("en-CA");
    const hms = [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, "0")).join("-");
    return `${ymd} ${hms}`;
  }
  function buildSequenceName() {
    return `${SEQUENCE_PREFIX}  ${buildTimestamp()}`;
  }
  function buildRoughCutName() {
    return `${ROUGH_CUT_PREFIX} ${buildTimestamp()}`;
  }
  function logTimelineAction(level, action, payload) {
    const ts = (/* @__PURE__ */ new Date()).toISOString().slice(11, 23);
    const msg = `[EditPilot ${ts}] [${action}]`;
    const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    fn(msg, payload);
  }
  function getPpro2() {
    try {
      return __require("premierepro");
    } catch {
      throw new Error(
        "Premiere Pro API is not available. Make sure the plugin is running inside Adobe Premiere Pro."
      );
    }
  }
  function ticksToTickTime(ppro, ticks) {
    return ppro.TickTime.createWithTicks(String(Math.round(ticks)));
  }
  async function getProjectAndSourceSequence() {
    const project = await resolveActiveProject();
    const sequence = await resolveActiveSequence();
    return { project, sequence };
  }
  async function getOverlappingVideoItems(ppro, seq, inTick, outTick) {
    const results = [];
    const CLIP_TYPE = ppro.Constants?.TrackItemType?.CLIP ?? 1;
    let trackCount = 0;
    try {
      trackCount = await seq.getVideoTrackCount();
    } catch {
      return results;
    }
    for (let t = 0; t < trackCount; t++) {
      let track;
      try {
        track = await seq.getVideoTrack(t);
      } catch {
        continue;
      }
      let items = [];
      try {
        items = track.getTrackItems(CLIP_TYPE, false) ?? [];
      } catch {
        continue;
      }
      for (const item of items) {
        let startTick = 0;
        let endTick = 0;
        try {
          const st = await item.getStartTime();
          const et = await item.getEndTime();
          startTick = Number(st?.ticks ?? 0);
          endTick = Number(et?.ticks ?? 0);
        } catch {
          continue;
        }
        if (endTick > inTick && startTick < outTick) {
          results.push({ trackItem: item, trackIndex: t, startTick, endTick });
        }
      }
    }
    return results;
  }
  async function insertSectionRange(ppro, project, targetSeq, sourceSeq, validItem, insertOffset, opts = {}) {
    const { addMarkers = true, includeMarkerComments = true } = opts;
    const { section, startSec, endSec, durationSec, hasTimestamps } = validItem;
    const title = section.title || "(untitled)";
    if (hasTimestamps) {
      if (durationSec < MIN_DURATION_SEC) {
        const warning = `Duration ${durationSec.toFixed(2)}s < minimum ${MIN_DURATION_SEC}s`;
        logTimelineAction("warn", "SKIP", { title, reason: warning });
        return {
          result: { title, start: section.start, end: section.end, status: "skipped", warning },
          durationTicks: 0
        };
      }
      if (durationSec > MAX_DURATION_SEC) {
        const warning = `Duration ${durationSec.toFixed(0)}s > maximum ${MAX_DURATION_SEC}s`;
        logTimelineAction("warn", "SKIP", { title, reason: warning });
        return {
          result: { title, start: section.start, end: section.end, status: "skipped", warning },
          durationTicks: 0
        };
      }
    }
    const sectionInTick = secondsToTicks2(startSec);
    const sectionOutTick = secondsToTicks2(endSec);
    const durationTicks = secondsToTicks2(Math.max(hasTimestamps ? durationSec : 1, 1));
    const warnings = [];
    let overlapping = [];
    if (hasTimestamps) {
      try {
        overlapping = await getOverlappingVideoItems(ppro, sourceSeq, sectionInTick, sectionOutTick);
        logTimelineAction("info", "SCAN", {
          title,
          range: `${startSec.toFixed(2)}s\u2013${endSec.toFixed(2)}s`,
          clipsFound: overlapping.length
        });
      } catch (err) {
        const w = `Track scan failed: ${err?.message}`;
        warnings.push(w);
        logTimelineAction("warn", "SCAN_FAIL", { title, error: err?.message });
      }
    }
    const resolvedItems = [];
    for (const entry of overlapping) {
      try {
        const [projectItem, seqStartTime, mediaInTime, mediaOutTime] = await Promise.all([
          entry.trackItem.getProjectItem(),
          entry.trackItem.getStartTime(),
          entry.trackItem.getInPoint(),
          entry.trackItem.getOutPoint()
        ]);
        if (!projectItem) {
          const w = "getProjectItem() returned null";
          warnings.push(w);
          logTimelineAction("warn", "RESOLVE", { title, trackIndex: entry.trackIndex, issue: w });
          continue;
        }
        const clipSeqStartTick = Number(seqStartTime?.ticks ?? entry.startTick);
        const clipMediaInTick = Number(mediaInTime?.ticks ?? 0);
        const overlapStart = Math.max(sectionInTick, clipSeqStartTick);
        const overlapEnd = Math.min(sectionOutTick, entry.endTick);
        if (overlapEnd <= overlapStart) {
          const w = "Degenerate overlap (zero length) \u2014 skipping clip";
          warnings.push(w);
          logTimelineAction("warn", "RESOLVE", { title, trackIndex: entry.trackIndex, issue: w });
          continue;
        }
        const newMediaInTick = clipMediaInTick + (overlapStart - clipSeqStartTick);
        const newMediaOutTick = clipMediaInTick + (overlapEnd - clipSeqStartTick);
        const targetInsertTick = insertOffset + (overlapStart - sectionInTick);
        resolvedItems.push({
          projectItem,
          trackIndex: entry.trackIndex,
          newMediaIn: ticksToTickTime(ppro, newMediaInTick),
          newMediaOut: ticksToTickTime(ppro, newMediaOutTick),
          targetInsert: ticksToTickTime(ppro, targetInsertTick)
        });
      } catch (err) {
        const w = `Clip resolve error: ${err?.message}`;
        warnings.push(w);
        logTimelineAction("warn", "RESOLVE", { title, error: err?.message });
      }
    }
    let clipsInserted = 0;
    if (resolvedItems.length > 0) {
      const editor = ppro.SequenceEditor.getEditor(targetSeq);
      for (const { projectItem, trackIndex, newMediaIn, newMediaOut, targetInsert } of resolvedItems) {
        try {
          project.executeTransaction((ca) => {
            const setRangeAction = projectItem.createSetInOutPointsAction?.(newMediaIn, newMediaOut);
            if (setRangeAction) {
              ca.addAction(setRangeAction);
            } else {
              warnings.push("createSetInOutPointsAction unavailable \u2014 full clip inserted");
              logTimelineAction("warn", "INSERT", {
                title,
                trackIndex,
                issue: "createSetInOutPointsAction not available on projectItem"
              });
            }
            const insertAction = editor.createOverwriteItemAction(
              projectItem,
              targetInsert,
              trackIndex,
              trackIndex
            );
            if (insertAction) ca.addAction(insertAction);
            const clearAction = projectItem.createClearInOutPointsAction?.();
            if (clearAction) ca.addAction(clearAction);
          }, `EditPilot: Insert "${title}"`);
          clipsInserted++;
          logTimelineAction("info", "INSERT", { title, trackIndex, clipsInserted });
        } catch (txErr) {
          const w = `Transaction failed: ${txErr?.message}`;
          warnings.push(w);
          logTimelineAction("error", "TX_FAIL", { title, trackIndex, error: txErr?.message });
        }
      }
    } else if (hasTimestamps && overlapping.length > 0) {
      const w = `${overlapping.length} source clip(s) found but none resolved`;
      warnings.push(w);
      logTimelineAction("warn", "MARKER_ONLY", { title, reason: w });
    }
    if (addMarkers) {
      try {
        const marker = targetSeq.markers.createMarker(insertOffset);
        marker.name = title.slice(0, 100);
        if (includeMarkerComments) {
          marker.comments = (`[${section.start ?? "00:00:00"} \u2192 ${section.end ?? "00:00:00"}]
` + (section.reason || "")).slice(0, 500);
        }
        marker.end = insertOffset + durationTicks;
      } catch (markerErr) {
        const w = `Marker placement failed: ${markerErr?.message}`;
        warnings.push(w);
        logTimelineAction("warn", "MARKER", { title, error: markerErr?.message });
      }
    }
    const status = !hasTimestamps || overlapping.length === 0 || clipsInserted === 0 ? "marker_only" : "inserted";
    const result = {
      title,
      start: section.start ?? null,
      end: section.end ?? null,
      status,
      warning: warnings.length > 0 ? warnings.join("; ") : null,
      durationSec: hasTimestamps ? durationSec : null,
      clipsInserted
    };
    logTimelineAction("info", "RESULT", result);
    return { result, durationTicks };
  }
  async function createSelectsTimeline(sections, onProgress) {
    const ppro = getPpro2();
    const progress = (msg, done, total) => onProgress?.(msg, done, total);
    if (!Array.isArray(sections) || sections.length === 0) {
      throw new Error("No sections provided.");
    }
    const validated = validateStorySections(sections);
    const validItems = validated.filter((v) => v.valid);
    const skippedLabels = validated.filter((v) => !v.valid).map((v) => `"${v.section?.title ?? "Section"}": ${v.error}`);
    if (validItems.length === 0) {
      throw new Error(
        "No valid sections to insert. All sections have invalid or missing timestamps."
      );
    }
    logTimelineAction("info", "START", {
      totalSections: sections.length,
      validSections: validItems.length,
      preValidationSkipped: skippedLabels.length
    });
    progress("Getting active sequence\u2026");
    const { project, sequence: sourceSeq } = await getProjectAndSourceSequence();
    const sequenceName = buildSequenceName();
    progress("Creating selects timeline\u2026");
    let targetSeq;
    try {
      targetSeq = await project.createSequence(sequenceName);
    } catch (err) {
      throw new Error(
        `Could not create sequence "${sequenceName}": ${err?.message ?? err}. Check that a project is open and has a valid default sequence preset.`
      );
    }
    if (!targetSeq) {
      throw new Error(
        "createSequence returned null \u2014 check Premiere Pro project settings."
      );
    }
    logTimelineAction("info", "SEQ_CREATED", { sequenceName });
    let cursor = 0;
    const sectionResults = [];
    for (let i = 0; i < validItems.length; i++) {
      const item = validItems[i];
      progress(`Inserting ${i + 1}/${validItems.length}\u2026`, i + 1, validItems.length);
      try {
        const { result, durationTicks } = await insertSectionRange(
          ppro,
          project,
          targetSeq,
          sourceSeq,
          item,
          cursor
        );
        sectionResults.push(result);
        if (result.status !== "skipped") {
          cursor += durationTicks;
        }
      } catch (insertErr) {
        const title = item.section?.title ?? "Section";
        logTimelineAction("error", "SECTION_FAIL", { title, error: insertErr?.message });
        sectionResults.push({
          title,
          start: item.section?.start ?? null,
          end: item.section?.end ?? null,
          status: "skipped",
          warning: insertErr?.message ?? "Unexpected error",
          durationSec: null,
          clipsInserted: 0
        });
      }
    }
    const totalOutputSec = cursor / TICKS_PER_SECOND2;
    const insertedCount = sectionResults.filter((r) => r.status === "inserted").length;
    const markerOnlyCount = sectionResults.filter((r) => r.status === "marker_only").length;
    const skippedCount = sectionResults.filter((r) => r.status === "skipped").length;
    const summary = {
      sequenceName,
      totalSections: validItems.length,
      inserted: insertedCount,
      markerOnly: markerOnlyCount,
      skipped: skippedCount,
      totalOutputSec,
      sectionResults,
      skippedLabels
    };
    logTimelineAction("info", "COMPLETE", {
      sequenceName,
      inserted: insertedCount,
      markerOnly: markerOnlyCount,
      skipped: skippedCount,
      totalOutputSec: totalOutputSec.toFixed(2) + "s"
    });
    progress("Selects timeline created \u2713", validItems.length, validItems.length);
    return summary;
  }
  async function createRoughCutTimeline(sections, options = {}, onProgress) {
    const {
      gapSec = 0,
      addMarkers = true,
      includeMarkerComments = true
    } = options;
    const gapTicks = secondsToTicks2(Math.max(0, Number.isFinite(gapSec) ? gapSec : 0));
    const ppro = getPpro2();
    const progress = (msg, done, total) => onProgress?.(msg, done, total);
    if (!Array.isArray(sections) || sections.length === 0) {
      throw new Error("No sections provided.");
    }
    const validated = validateStorySections(sections);
    const validItems = validated.filter((v) => v.valid);
    const skippedLabels = validated.filter((v) => !v.valid).map((v) => `"${v.section?.title ?? "Section"}": ${v.error}`);
    if (validItems.length === 0) {
      throw new Error(
        "No valid sections to insert. All sections have invalid or missing timestamps."
      );
    }
    logTimelineAction("info", "RC_START", {
      totalSections: sections.length,
      validSections: validItems.length,
      gapSec,
      addMarkers,
      includeMarkerComments,
      preValidationSkipped: skippedLabels.length
    });
    progress("Getting active sequence\u2026");
    const { project, sequence: sourceSeq } = await getProjectAndSourceSequence();
    const sequenceName = buildRoughCutName();
    progress("Creating rough cut timeline\u2026");
    let targetSeq;
    try {
      targetSeq = await project.createSequence(sequenceName);
    } catch (err) {
      throw new Error(
        `Could not create sequence "${sequenceName}": ${err?.message ?? err}. Check that a project is open and has a valid default sequence preset.`
      );
    }
    if (!targetSeq) {
      throw new Error("createSequence returned null \u2014 check Premiere Pro project settings.");
    }
    logTimelineAction("info", "RC_SEQ_CREATED", { sequenceName });
    let cursor = 0;
    const sectionResults = [];
    const sectionOpts = { addMarkers, includeMarkerComments };
    for (let i = 0; i < validItems.length; i++) {
      const item = validItems[i];
      progress(`Inserting ${i + 1}/${validItems.length}\u2026`, i + 1, validItems.length);
      try {
        const { result, durationTicks } = await insertSectionRange(
          ppro,
          project,
          targetSeq,
          sourceSeq,
          item,
          cursor,
          sectionOpts
        );
        sectionResults.push(result);
        if (result.status !== "skipped") {
          cursor += durationTicks;
          if (gapTicks > 0 && i < validItems.length - 1) {
            cursor += gapTicks;
          }
        }
      } catch (insertErr) {
        const title = item.section?.title ?? "Section";
        logTimelineAction("error", "RC_SECTION_FAIL", { title, error: insertErr?.message });
        sectionResults.push({
          title,
          start: item.section?.start ?? null,
          end: item.section?.end ?? null,
          status: "skipped",
          warning: insertErr?.message ?? "Unexpected error",
          durationSec: null,
          clipsInserted: 0
        });
      }
    }
    const totalOutputSec = cursor / TICKS_PER_SECOND2;
    const insertedCount = sectionResults.filter((r) => r.status === "inserted").length;
    const markerOnlyCount = sectionResults.filter((r) => r.status === "marker_only").length;
    const skippedCount = sectionResults.filter((r) => r.status === "skipped").length;
    const summary = {
      sequenceName,
      totalSections: validItems.length,
      inserted: insertedCount,
      markerOnly: markerOnlyCount,
      skipped: skippedCount,
      totalOutputSec,
      sectionResults,
      skippedLabels
    };
    logTimelineAction("info", "RC_COMPLETE", {
      sequenceName,
      inserted: insertedCount,
      markerOnly: markerOnlyCount,
      skipped: skippedCount,
      totalOutputSec: totalOutputSec.toFixed(2) + "s",
      gapSec
    });
    progress("Rough cut created \u2713", validItems.length, validItems.length);
    return summary;
  }

  // modules/assistant.js
  var INTENTS = Object.freeze({
    ANALYZE: "analyze",
    SELECTS: "selects",
    ROUGH_CUT: "rough_cut",
    HELP: "help",
    CLEAR: "clear",
    // Navigation shortcuts
    NAV_VIDEO: "nav_video",
    NAV_IMAGE: "nav_image",
    NAV_TTS: "nav_tts",
    NAV_BROLL: "nav_broll",
    NAV_STORY: "nav_story",
    NAV_COLOR: "nav_color",
    NAV_AUDIO: "nav_audio",
    NAV_CAPS: "nav_captions",
    // AI actions
    SOCIAL: "social",
    TOP5: "top5",
    UNKNOWN: "unknown"
  });
  var COMMAND_PATTERNS = [
    // clear chat
    { pattern: /^clear\b/i, intent: INTENTS.CLEAR },
    // help
    { pattern: /^help\b/i, intent: INTENTS.HELP },
    // rough cut — check before "create selects" to avoid false match
    { pattern: /rough\s*cut/i, intent: INTENTS.ROUGH_CUT },
    // selects
    { pattern: /\bselects?\b/i, intent: INTENTS.SELECTS },
    { pattern: /create\s+selects?/i, intent: INTENTS.SELECTS },
    // analyze / transcript
    { pattern: /\banalyz/i, intent: INTENTS.ANALYZE },
    { pattern: /\btranscript\b/i, intent: INTENTS.ANALYZE },
    // slash commands — navigation
    { pattern: /^\/video\b/i, intent: INTENTS.NAV_VIDEO },
    { pattern: /^\/image\b/i, intent: INTENTS.NAV_IMAGE },
    { pattern: /^\/tts\b/i, intent: INTENTS.NAV_TTS },
    { pattern: /^\/voice\b/i, intent: INTENTS.NAV_TTS },
    { pattern: /^\/broll\b/i, intent: INTENTS.NAV_BROLL },
    { pattern: /^\/story\b/i, intent: INTENTS.NAV_STORY },
    { pattern: /^\/color\b/i, intent: INTENTS.NAV_COLOR },
    { pattern: /^\/audio\b/i, intent: INTENTS.NAV_AUDIO },
    { pattern: /^\/captions?\b/i, intent: INTENTS.NAV_CAPS },
    // AI actions
    { pattern: /^\/social\b/i, intent: INTENTS.SOCIAL },
    { pattern: /^\/top\s*5?\b/i, intent: INTENTS.TOP5 },
    { pattern: /\bsocial\s+clip/i, intent: INTENTS.SOCIAL },
    { pattern: /\btop\s+5\b/i, intent: INTENTS.TOP5 }
  ];
  function parseCommand(input) {
    const trimmed = (input ?? "").trim();
    if (!trimmed) return null;
    for (const { pattern, intent } of COMMAND_PATTERNS) {
      if (pattern.test(trimmed)) {
        const args = trimmed.replace(pattern, "").trim();
        return { intent, raw: trimmed, args };
      }
    }
    return { intent: INTENTS.UNKNOWN, raw: trimmed, args: "" };
  }
  function getHelpText() {
    return [
      "Available commands:",
      "",
      "  analyze           \u2014 Run Story Engine on the current transcript",
      "  create selects    \u2014 Build a Selects Timeline from analyzed sections",
      "  build rough cut   \u2014 Build a Rough Cut sequence from analyzed sections",
      "  help              \u2014 Show this message",
      "  clear             \u2014 Clear the chat history",
      "",
      "Slash shortcuts:",
      "  /video [prompt]   \u2014 Go to Video Gen, fill prompt",
      "  /image [prompt]   \u2014 Go to Image Gen, fill prompt",
      "  /tts [text]       \u2014 Go to TTS, fill text",
      "  /broll [prompt]   \u2014 Go to B-Roll Gen, fill prompt",
      "  /story            \u2014 Go to Story Engine",
      "  /color            \u2014 Go to Color Grading",
      "  /audio            \u2014 Go to Audio Mix",
      "  /captions         \u2014 Go to Auto Captions",
      "  /social           \u2014 Extract social clip from analyzed sections",
      "  /top5             \u2014 Find top 5 moments from analyzed sections"
    ].join("\n");
  }

  // main.js
  function showFatal(prefix, err) {
    try {
      const msg = err && (err.stack || err.message) || String(err);
      console.error("[EditPilot]", prefix, msg);
      const body = document.body;
      if (!body) return;
      const dbg = document.createElement("div");
      dbg.style.cssText = "position:absolute;top:0;left:0;right:0;background:#7a0000;color:#fff;font-size:10px;padding:6px;z-index:9999;white-space:pre-wrap;word-break:break-all;max-height:120px;overflow:auto";
      dbg.textContent = prefix + ": " + msg;
      body.appendChild(dbg);
    } catch (_) {
    }
  }
  window.addEventListener("error", (e) => showFatal("JS error", e.error || e.message));
  window.addEventListener("unhandledrejection", (e) => showFatal("Promise rejection", e.reason));
  var PRODUCTION_URL = "https://www.saadstudio.app";
  function el2(id) {
    return document.getElementById(id);
  }
  var lastSections = [];
  var selectedSection = null;
  var _loginSession = null;
  var _pollTimer = null;
  var _countdownTimer = null;
  var _countdownSecs = 0;
  function openExternal(url) {
    try {
      const uxp = __require("uxp");
      uxp.shell.openExternal(url);
    } catch (_) {
    }
  }
  function renderDashboard(session) {
    showDashboard();
    updateHeader(session);
    updateUserStrip(session);
    updateCreditsDisplay(session.credits);
    setSubWarning(session.subscriptionActive === false);
  }
  function createImageGenSelect(id, options) {
    const wrapper = document.createElement("div");
    wrapper.className = "field vg2-field";
    const select = document.createElement("select");
    select.className = "sel-input vg2-select";
    select.id = id;
    options.forEach((optionConfig) => {
      const option = document.createElement("option");
      option.value = optionConfig.value;
      option.textContent = optionConfig.label;
      select.appendChild(option);
    });
    wrapper.appendChild(select);
    return wrapper;
  }
  function wireImageGen(host) {
    if (!host || host.dataset.wired === "1") return;
    if (typeof window.__editpilotSetupImageGen !== "function") return;
    window.__editpilotSetupImageGen();
    host.dataset.wired = "1";
  }
  function renderImageGen() {
    const host = document.getElementById("imagegenRenderHost");
    if (!host) return;
    if (host.dataset.rendered === "1") {
      wireImageGen(host);
      return;
    }
    host.textContent = "";
    const root = document.createElement("div");
    root.className = "pn-scroll vg2-shell";
    host.appendChild(root);
    const introCard = document.createElement("div");
    introCard.className = "vg2-card";
    root.appendChild(introCard);
    const title = document.createElement("div");
    title.className = "sec-t";
    title.textContent = "Image Gen";
    introCard.appendChild(title);
    const blurb = document.createElement("div");
    blurb.className = "asst-intro";
    blurb.textContent = "Generate still images in Saad Studio style using model, mode, ratio, quality, and optional reference image.";
    introCard.appendChild(blurb);
    const history = document.createElement("div");
    history.className = "gen-hist vg2-history";
    history.id = "igHistory";
    root.appendChild(history);
    const empty = document.createElement("div");
    empty.className = "gen-empty";
    empty.id = "igEmpty";
    empty.textContent = "Describe an image and click Generate Image";
    history.appendChild(empty);
    const composer = document.createElement("div");
    composer.className = "vg2-card vg2-composer";
    root.appendChild(composer);
    const previewWrap = document.createElement("div");
    previewWrap.className = "vg2-preview";
    previewWrap.id = "igImgsWrap";
    previewWrap.style.display = "none";
    composer.appendChild(previewWrap);
    const previewImage = document.createElement("img");
    previewImage.className = "vg2-preview-img";
    previewImage.id = "igImgPreview";
    previewImage.alt = "Reference";
    previewWrap.appendChild(previewImage);
    const removeBtn = document.createElement("button");
    removeBtn.className = "btn vg2-remove";
    removeBtn.id = "igImgRemove";
    removeBtn.type = "button";
    removeBtn.textContent = "Remove";
    previewWrap.appendChild(removeBtn);
    const controls = document.createElement("div");
    controls.className = "vg2-grid";
    controls.appendChild(createImageGenSelect("igModel", [
      { value: "gpt-image-2", label: "GPT Image 2" },
      { value: "flux-2-pro", label: "Flux 2 Pro" },
      { value: "imagen-4", label: "Imagen 4" },
      { value: "nano-banana-pro", label: "Nano Banana" }
    ]));
    controls.appendChild(createImageGenSelect("igMode", [
      { value: "standard", label: "Standard" },
      { value: "thumbnail", label: "Thumbnail" },
      { value: "blueprint", label: "Blueprint" }
    ]));
    controls.appendChild(createImageGenSelect("igRatio", [
      { value: "1:1", label: "1:1 Square" },
      { value: "16:9", label: "16:9 Landscape" },
      { value: "9:16", label: "9:16 Vertical" },
      { value: "4:3", label: "4:3" }
    ]));
    controls.appendChild(createImageGenSelect("igQuality", [
      { value: "1024", label: "1K" },
      { value: "2048", label: "2K" }
    ]));
    controls.appendChild(createImageGenSelect("igCount", [
      { value: "1", label: "1 Image" },
      { value: "2", label: "2 Images" },
      { value: "4", label: "4 Images" }
    ]));
    composer.appendChild(controls);
    const promptWrap = document.createElement("div");
    promptWrap.className = "prompt vg2-prompt";
    composer.appendChild(promptWrap);
    const prompt = document.createElement("textarea");
    prompt.id = "igPrompt";
    prompt.placeholder = "Describe the image you want to create...";
    promptWrap.appendChild(prompt);
    const actions = document.createElement("div");
    actions.className = "vg2-actions";
    composer.appendChild(actions);
    const attachBtn = document.createElement("button");
    attachBtn.className = "btn";
    attachBtn.id = "igAttach";
    attachBtn.type = "button";
    attachBtn.textContent = "Attach Reference";
    actions.appendChild(attachBtn);
    const note = document.createElement("div");
    note.className = "vg2-note";
    note.textContent = "2 cr";
    actions.appendChild(note);
    const sendBtn = document.createElement("button");
    sendBtn.className = "btn-gen";
    sendBtn.id = "igSend";
    sendBtn.type = "button";
    sendBtn.textContent = "Generate Image";
    actions.appendChild(sendBtn);
    host.dataset.rendered = "1";
    wireImageGen(host);
  }
  window._tabRenderers = window._tabRenderers || {};
  window._tabRenderers.imagegen = renderImageGen;
  function createTtsSelect(id, options) {
    const wrapper = document.createElement("div");
    wrapper.className = "field vg2-field";
    const select = document.createElement("select");
    select.className = "sel-input vg2-select";
    select.id = id;
    options.forEach((optionConfig) => {
      const option = document.createElement("option");
      option.value = optionConfig.value;
      option.textContent = optionConfig.label;
      select.appendChild(option);
    });
    wrapper.appendChild(select);
    return wrapper;
  }
  function wireTTS(host) {
    if (!host || host.dataset.wired === "1") return;
    if (typeof window.__editpilotSetupTTS !== "function") return;
    window.__editpilotSetupTTS();
    host.dataset.wired = "1";
  }
  function renderTTS() {
    const host = document.getElementById("ttsRenderHost");
    if (!host) return;
    if (host.dataset.rendered === "1") {
      wireTTS(host);
      return;
    }
    host.textContent = "";
    const root = document.createElement("div");
    root.className = "pn-scroll vg2-shell";
    host.appendChild(root);
    const introCard = document.createElement("div");
    introCard.className = "vg2-card";
    root.appendChild(introCard);
    const title = document.createElement("div");
    title.className = "sec-t";
    title.textContent = "TTS";
    introCard.appendChild(title);
    const blurb = document.createElement("div");
    blurb.className = "asst-intro";
    blurb.textContent = "Generate voiceover in Saad Studio style with selectable voice and playback speed.";
    introCard.appendChild(blurb);
    const history = document.createElement("div");
    history.className = "gen-hist vg2-history";
    history.id = "ttsHistory";
    root.appendChild(history);
    const empty = document.createElement("div");
    empty.className = "gen-empty";
    empty.id = "ttsEmpty";
    empty.textContent = "Select a voice and type text to generate";
    history.appendChild(empty);
    const composer = document.createElement("div");
    composer.className = "vg2-card vg2-composer";
    root.appendChild(composer);
    const controls = document.createElement("div");
    controls.className = "vg2-grid";
    controls.appendChild(createTtsSelect("ttsVoice", [
      { value: "alloy", label: "Alloy" },
      { value: "rachel", label: "Rachel" },
      { value: "echo", label: "Echo" },
      { value: "aria", label: "Aria" }
    ]));
    controls.appendChild(createTtsSelect("ttsSpeed", [
      { value: "1", label: "1x" },
      { value: "1.25", label: "1.25x" },
      { value: "1.5", label: "1.5x" }
    ]));
    controls.appendChild(createTtsSelect("ttsLang", [
      { value: "en", label: "English" },
      { value: "ar", label: "Arabic" },
      { value: "fr", label: "French" },
      { value: "es", label: "Spanish" },
      { value: "de", label: "German" },
      { value: "auto", label: "Auto Detect" }
    ]));
    composer.appendChild(controls);
    const promptWrap = document.createElement("div");
    promptWrap.className = "prompt vg2-prompt";
    composer.appendChild(promptWrap);
    const prompt = document.createElement("textarea");
    prompt.id = "ttsPrompt";
    prompt.placeholder = "Type text to convert to voice...";
    promptWrap.appendChild(prompt);
    const actions = document.createElement("div");
    actions.className = "vg2-actions";
    composer.appendChild(actions);
    const charCount = document.createElement("div");
    charCount.className = "vg2-note";
    charCount.id = "ttsCharCount";
    charCount.textContent = "0 chars";
    actions.appendChild(charCount);
    const cost = document.createElement("div");
    cost.className = "vg2-note";
    cost.textContent = "3 cr";
    actions.appendChild(cost);
    const sendBtn = document.createElement("button");
    sendBtn.className = "btn-gen";
    sendBtn.id = "ttsSend";
    sendBtn.type = "button";
    sendBtn.textContent = "Generate Voice";
    actions.appendChild(sendBtn);
    host.dataset.rendered = "1";
    wireTTS(host);
  }
  window._tabRenderers.tts = renderTTS;
  function createTimelineSelect(id, options) {
    const wrapper = document.createElement("div");
    wrapper.className = "field vg2-field";
    const select = document.createElement("select");
    select.className = "sel-input vg2-select";
    select.id = id;
    options.forEach((optionConfig) => {
      const option = document.createElement("option");
      option.value = optionConfig.value;
      option.textContent = optionConfig.label;
      select.appendChild(option);
    });
    wrapper.appendChild(select);
    return wrapper;
  }
  function wireTimeline(host) {
    if (!host || host.dataset.wired === "1") return;
    if (typeof window.__editpilotSetupTimeline !== "function") return;
    window.__editpilotSetupTimeline();
    host.dataset.wired = "1";
  }
  function renderTimeline() {
    const host = document.getElementById("timelineRenderHost");
    if (!host) return;
    if (host.dataset.rendered === "1") {
      wireTimeline(host);
      return;
    }
    host.textContent = "";
    const root = document.createElement("div");
    root.className = "pn-scroll vg2-shell";
    host.appendChild(root);
    const introCard = document.createElement("div");
    introCard.className = "vg2-card";
    root.appendChild(introCard);
    const title = document.createElement("div");
    title.className = "sec-t";
    title.textContent = "Timeline AI";
    introCard.appendChild(title);
    const blurb = document.createElement("div");
    blurb.className = "asst-intro";
    blurb.textContent = "Analyze speech zones, scenes, pacing, or social moments and prepare guidance for the timeline.";
    introCard.appendChild(blurb);
    const history = document.createElement("div");
    history.className = "gen-hist vg2-history";
    history.id = "tlHistory";
    root.appendChild(history);
    const empty = document.createElement("div");
    empty.className = "gen-empty";
    empty.id = "tlEmpty";
    empty.textContent = "Describe your edit goal and click Analyze";
    history.appendChild(empty);
    const composer = document.createElement("div");
    composer.className = "vg2-card vg2-composer";
    root.appendChild(composer);
    const controls = document.createElement("div");
    controls.className = "vg2-grid";
    controls.appendChild(createTimelineSelect("tlMode", [
      { value: "speech", label: "Speech Zones" },
      { value: "scenes", label: "Scene Analysis" },
      { value: "pacing", label: "Pacing and Cuts" },
      { value: "social", label: "Social Clips" }
    ]));
    composer.appendChild(controls);
    const promptWrap = document.createElement("div");
    promptWrap.className = "prompt vg2-prompt";
    composer.appendChild(promptWrap);
    const prompt = document.createElement("textarea");
    prompt.id = "tlPrompt";
    prompt.placeholder = "Describe your edit goal or paste a transcript...";
    promptWrap.appendChild(prompt);
    const actions = document.createElement("div");
    actions.className = "vg2-actions";
    composer.appendChild(actions);
    const applyBtn = document.createElement("button");
    applyBtn.className = "btn";
    applyBtn.id = "tlApplyAll";
    applyBtn.type = "button";
    applyBtn.textContent = "Apply Suggestions";
    actions.appendChild(applyBtn);
    const note = document.createElement("div");
    note.className = "vg2-note";
    note.textContent = "2 cr";
    actions.appendChild(note);
    const sendBtn = document.createElement("button");
    sendBtn.className = "btn-gen";
    sendBtn.id = "tlSend";
    sendBtn.type = "button";
    sendBtn.textContent = "Analyze Timeline";
    actions.appendChild(sendBtn);
    host.dataset.rendered = "1";
    wireTimeline(host);
  }
  window._tabRenderers.timeline = renderTimeline;
  async function init() {
    try {
      localStorage.setItem("ep.token", "ssp_dev_token_12345");
      const devSession = { email: "dev@saadstudio.app", name: "Dev", plan: "pro", credits: 999, subscriptionActive: true };
      renderDashboard(devSession);
      setActiveTab("chat");
    } catch (err) {
      console.error("[EditPilot] init() failed:", err);
      const body = document.body;
      if (body) {
        const dbg = document.createElement("div");
        dbg.style.cssText = "position:absolute;top:0;left:0;right:0;background:#ff000033;color:#ff6b6b;font-size:10px;padding:6px;z-index:999;white-space:pre-wrap;word-break:break-all";
        dbg.textContent = "INIT ERROR: " + (err?.message || String(err));
        body.appendChild(dbg);
      }
    }
  }
  function generateSessionId() {
    try {
      return crypto.randomUUID().replace(/-/g, "");
    } catch (_) {
      let s = "";
      for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
      return s;
    }
  }
  function showWaitingState() {
    const main = el2("loginMain");
    const wait = el2("loginWaiting");
    if (main) main.style.display = "none";
    if (wait) wait.style.display = "block";
    _countdownSecs = 300;
    const timerEl = el2("lwTimer");
    function tick() {
      if (timerEl) {
        const m = Math.floor(_countdownSecs / 60);
        const s = String(_countdownSecs % 60).padStart(2, "0");
        timerEl.textContent = "Expires in " + m + ":" + s;
      }
      _countdownSecs--;
      if (_countdownSecs >= 0) _countdownTimer = setTimeout(tick, 1e3);
    }
    tick();
  }
  function hideWaitingState() {
    const main = el2("loginMain");
    const wait = el2("loginWaiting");
    if (main) main.style.display = "";
    if (wait) wait.style.display = "none";
    if (_countdownTimer) {
      clearTimeout(_countdownTimer);
      _countdownTimer = null;
    }
  }
  function stopPolling() {
    _loginSession = null;
    if (_pollTimer) {
      clearTimeout(_pollTimer);
      _pollTimer = null;
    }
    if (_countdownTimer) {
      clearTimeout(_countdownTimer);
      _countdownTimer = null;
    }
  }
  function startPolling(sessionId) {
    _loginSession = sessionId;
    async function poll() {
      if (_loginSession !== sessionId) return;
      try {
        const res = await fetch(PRODUCTION_URL + "/api/panel/auth-session/" + sessionId);
        if (!res.ok) {
          scheduleNext();
          return;
        }
        const data = await res.json();
        if (data.status === "approved" && data.token) {
          stopPolling();
          hideWaitingState();
          setConnectLoading(true);
          try {
            const session = await connectWithToken(PRODUCTION_URL, data.token);
            renderDashboard(session);
          } catch (err) {
            setConnectError(err.message || "Auto-connect failed. Please paste token manually.");
          } finally {
            setConnectLoading(false);
          }
          return;
        }
        if (data.status === "expired") {
          stopPolling();
          hideWaitingState();
          setConnectError("Login session expired. Please try again.");
          return;
        }
        scheduleNext();
      } catch (_) {
        scheduleNext();
      }
    }
    function scheduleNext() {
      if (_loginSession !== sessionId) return;
      _pollTimer = setTimeout(poll, 2500);
    }
    _pollTimer = setTimeout(poll, 1e3);
  }
  el2("btnOpenSite")?.addEventListener("click", () => {
    const sessionId = generateSessionId();
    openExternal(PRODUCTION_URL + "/panel/connect?session=" + sessionId);
    showWaitingState();
    startPolling(sessionId);
  });
  el2("btnCancelLogin")?.addEventListener("click", () => {
    stopPolling();
    hideWaitingState();
  });
  el2("connectForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const panelToken = (el2("inputToken")?.value || "").trim();
    setConnectError("");
    setConnectLoading(true);
    try {
      const session = await connectWithToken(PRODUCTION_URL, panelToken);
      renderDashboard(session);
    } catch (err) {
      setConnectError(err.message || "Connection failed. Please try again.");
    } finally {
      setConnectLoading(false);
    }
  });
  el2("btnRefreshCredits")?.addEventListener("click", async () => {
    const btn = el2("btnRefreshCredits");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Refreshing\u2026";
    }
    try {
      const balance = await refreshCreditsFromServer();
      updateCreditsDisplay(balance);
    } catch (_) {
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "\u21BA Refresh Credits";
      }
    }
  });
  el2("btnDisconnect")?.addEventListener("click", () => {
    disconnect();
    showConnect();
  });
  el2("btnManageSub")?.addEventListener("click", () => openExternal(PRODUCTION_URL + "/pricing"));
  el2("subWarnBtn")?.addEventListener("click", () => openExternal(PRODUCTION_URL + "/pricing"));
  el2("hdrCredits")?.addEventListener("click", () => openExternal(PRODUCTION_URL + "/pricing"));
  function setActiveTab(tab) {
    console.log("[TAB_CLICK main.js]", tab);
    try {
      document.querySelectorAll("#epTabs .nt").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".pn").forEach((v) => v.classList.remove("vis"));
      const tabBtn = document.querySelector(`#epTabs .nt[data-tab="${tab}"]`);
      tabBtn?.classList.add("active");
      const panel = document.querySelector(`.pn[data-panel="${tab}"]`);
      panel?.classList.add("vis");
    } catch (e) {
      console.error("[TAB_SWITCH_ERROR main.js]", tab, e?.stack || e?.message || e);
    }
  }
  function setStoryError(msg) {
    const err = el2("storyError");
    if (err) err.textContent = msg || "";
  }
  function setStorySelected(section) {
    selectedSection = section || null;
    const detail = el2("storyDetail");
    if (!detail) return;
    if (!selectedSection) {
      detail.style.display = "none";
      return;
    }
    detail.style.display = "block";
    if (el2("sdTitle")) el2("sdTitle").textContent = selectedSection.title || "";
    if (el2("sdTime")) el2("sdTime").textContent = (selectedSection.start || "00:00:00") + " \u2192 " + (selectedSection.end || "00:00:00");
    if (el2("sdReason")) el2("sdReason").textContent = selectedSection.reason || "";
    if (el2("applyOneFeedback")) el2("applyOneFeedback").textContent = "";
  }
  function setAnalyzeLoading(isLoading) {
    const spinner = el2("analyzeSpinner");
    const text = el2("btnAnalyzeText");
    const btn = el2("btnAnalyze");
    if (spinner) spinner.style.display = isLoading ? "inline-block" : "none";
    if (text) text.style.opacity = isLoading ? "0.6" : "1";
    if (btn) btn.disabled = !!isLoading;
  }
  function updateCharCount() {
    const t = el2("storyTranscript");
    const c = el2("storyCharCount");
    if (!t || !c) return;
    c.textContent = String((t.value || "").length);
  }
  el2("storyTranscript")?.addEventListener("input", updateCharCount);
  updateCharCount();
  el2("btnAnalyze")?.addEventListener("click", async () => {
    console.log("[Analyze] STEP 1 \u2014 click received");
    try {
      console.log("[Analyze] STEP 2 \u2014 entered try");
      const token = getToken();
      console.log("[Analyze] STEP 3 \u2014 got token:", token ? "present" : "MISSING");
      const transcript = (el2("storyTranscript")?.value || "").trim();
      console.log("[Analyze] STEP 4 \u2014 transcript length:", transcript.length);
      setStoryError("");
      if (!token) {
        console.log("[Analyze] EXIT \u2014 no token");
        setStoryError("Not connected.");
        return;
      }
      if (!transcript && token !== "ssp_dev_token_12345") {
        console.log("[Analyze] EXIT \u2014 empty transcript (prod mode)");
        setStoryError("Please paste a transcript first.");
        return;
      }
      console.log("[Analyze] STEP 5 \u2014 setAnalyzeLoading(true)");
      setAnalyzeLoading(true);
      const selectedModel = el('storyModel')?.value || 'claude-haiku-4-5';
      console.log('[Analyze] STEP 5a \u2014 selected model:', selectedModel);
      console.log("[Analyze] STEP 6 \u2014 BEFORE API call");
      let data;
      try {
        data = await analyzeTranscript(token, transcript, selectedModel);
        console.log("[Analyze] STEP 7 \u2014 AFTER API call");
      } catch (e) {
        console.error("[Analyze] API CALL ERROR:", e?.stack || e?.message || e);
        throw e;
      }
      console.log("[Analyze] STEP 8 \u2014 before processing data");
      try {
        console.log("[Analyze]   DATA TYPE:", typeof data);
        console.log("[Analyze]   DATA KEYS:", Object.keys(data || {}));
        console.log("[Analyze]   sections is array?", Array.isArray(data?.sections));
      } catch (e) {
        console.error("[Analyze] PROCESS ERROR:", e?.stack || e?.message || e);
      }
      lastSections = Array.isArray(data?.sections) ? data.sections : [];
      selectedSection = null;
      console.log("[Analyze] STEP 9 \u2014 sections count:", lastSections.length);
      console.log("[Analyze] STEP 10 \u2014 before DOM updates");
      try {
        el2("storyResultsWrap").style.display = "block";
        el2("storyCreditsBadge").textContent = data?.creditsUsed ? `-${data.creditsUsed} cr` : "";
        console.log("[Analyze] STEP 10a \u2014 results wrap visible");
      } catch (e) {
        console.error("[Analyze] DOM UPDATE ERROR:", e?.stack || e?.message || e);
      }
      console.log("[Analyze] STEP 11 \u2014 before render");
      try {
        renderStorySections(
          lastSections,
          el2("storyCards"),
          (section) => setStorySelected(section),
          async (section, btn) => {
            if (!section) return;
            if (btn) btn.disabled = true;
            try {
              await applySectionToTimeline(section);
            } catch (err) {
              setStoryError(err?.message || "Failed to apply marker.");
            } finally {
              if (btn) btn.disabled = false;
            }
          },
          // Pass language so cards render RTL for Arabic transcripts
          { language: data?.language }
        );
        console.log("[Analyze] STEP 11a \u2014 sections rendered, language:", data?.language);
      } catch (e) {
        console.error("[Analyze] RENDER ERROR:", e?.stack || e?.message || e);
      }
      console.log("[Analyze] STEP 12 \u2014 before setStorySelected");
      try {
        setStorySelected(lastSections[0] || null);
        console.log("[Analyze] STEP 12a \u2014 first section selected");
      } catch (e) {
        console.error("[Analyze] SELECT ERROR:", e?.stack || e?.message || e);
      }
      console.log("[Analyze] STEP 13 \u2014 before refreshing credits");
      try {
        const balance = await refreshCreditsFromServer();
        updateCreditsDisplay(balance);
        console.log("[Analyze] STEP 13a \u2014 credits refreshed:", balance);
      } catch (e) {
        console.log("[Analyze] STEP 13 \u2014 credits refresh skipped:", e?.message);
      }
      console.log("[Analyze] STEP 14 \u2014 DONE");
    } catch (err) {
      console.error("[Analyze] ERROR:", err?.stack || err?.message || err);
      setStoryError(err?.message || "Analyze failed.");
    } finally {
      console.log("[Analyze] FINALLY \u2014 setAnalyzeLoading(false)");
      setAnalyzeLoading(false);
    }
  });
  el2("btnStoryClear")?.addEventListener("click", () => {
    lastSections = [];
    selectedSection = null;
    if (el2("storyTranscript")) el2("storyTranscript").value = "";
    updateCharCount();
    setStoryError("");
    if (el2("storyResultsWrap")) el2("storyResultsWrap").style.display = "none";
    if (el2("storyCards")) el2("storyCards").innerHTML = "";
    if (el2("storyDetail")) el2("storyDetail").style.display = "none";
    if (el2("applyAllFeedback")) el2("applyAllFeedback").textContent = "";
    if (el2("selectsFeedback")) el2("selectsFeedback").textContent = "";
    if (el2("roughCutFeedback")) el2("roughCutFeedback").textContent = "";
    if (el2("selectsReport")) el2("selectsReport").style.display = "none";
    if (el2("roughCutReport")) el2("roughCutReport").style.display = "none";
  });
  el2("btnApplyOne")?.addEventListener("click", async () => {
    if (!selectedSection) return;
    const feedback = el2("applyOneFeedback");
    if (feedback) feedback.textContent = "";
    try {
      await applySectionToTimeline(selectedSection);
      if (feedback) feedback.textContent = "Applied \u2713";
    } catch (err) {
      if (feedback) feedback.textContent = err?.message || "Failed";
    }
  });
  el2("btnApplyAll")?.addEventListener("click", async () => {
    const feedback = el2("applyAllFeedback");
    if (feedback) feedback.textContent = "";
    if (!lastSections?.length) {
      if (feedback) feedback.textContent = "No sections to apply.";
      return;
    }
    const { confirmed, selected } = await openConfirmModal(lastSections);
    if (!confirmed) return;
    const btn = el2("btnApplyAll");
    if (btn) btn.disabled = true;
    try {
      const res = await applyAllSectionsToTimeline(selected, (done, total) => {
        if (feedback) feedback.textContent = `Applying\u2026 ${done}/${total}`;
      });
      if (feedback) {
        const errCount = res.errors?.length || 0;
        feedback.textContent = errCount ? `Applied ${res.applied}. ${errCount} failed.` : `Applied ${res.applied} \u2713`;
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  });
  function renderReport(summary, titleId, summaryId, rowsId) {
    if (!summary) return;
    const titleEl = el2(titleId);
    const sumEl = el2(summaryId);
    const rowsEl = el2(rowsId);
    if (!sumEl || !rowsEl) return;
    if (titleEl) titleEl.textContent = summary.sequenceName || "Report";
    const ok = summary.inserted || 0;
    const warn = summary.markerOnly || 0;
    const err = summary.skipped || 0;
    const total = summary.totalSections || 0;
    sumEl.innerHTML = `
    <div class="sr-stat"><div class="sr-stat-val ok">${ok}</div><div class="sr-stat-lbl">Inserted</div></div>
    <div class="sr-stat"><div class="sr-stat-val warn">${warn}</div><div class="sr-stat-lbl">Marker Only</div></div>
    <div class="sr-stat"><div class="sr-stat-val err">${err}</div><div class="sr-stat-lbl">Skipped</div></div>
    <div class="sr-stat"><div class="sr-stat-val">${total}</div><div class="sr-stat-lbl">Total</div></div>
  `;
    rowsEl.innerHTML = "";
    const rows = Array.isArray(summary.sectionResults) ? summary.sectionResults : [];
    rows.forEach((r) => {
      const row = document.createElement("div");
      row.className = "sr-row";
      const status = r.status || "skipped";
      const icon = status === "inserted" ? "\u2713" : status === "marker_only" ? "\u2022" : "\u2715";
      const time = r.start && r.end ? `${r.start} \u2192 ${r.end}` : "";
      const warnTxt = r.warning ? String(r.warning) : "";
      const dur = Number.isFinite(r.durationSec) ? `${Math.round(r.durationSec)}s` : "";
      row.innerHTML = `
      <div class="sr-icon">${icon}</div>
      <div class="sr-row-body">
        <div class="sr-row-title">${String(r.title || "")}</div>
        <div class="sr-row-time">${time}</div>
        ${warnTxt ? `<div class="sr-row-warn">${warnTxt}</div>` : ""}
      </div>
      <div class="sr-row-dur">${dur}</div>
    `;
      rowsEl.appendChild(row);
    });
  }
  el2("srClose")?.addEventListener("click", () => {
    if (el2("selectsReport")) el2("selectsReport").style.display = "none";
  });
  el2("rcClose")?.addEventListener("click", () => {
    if (el2("roughCutReport")) el2("roughCutReport").style.display = "none";
  });
  el2("btnCreateSelects")?.addEventListener("click", async () => {
    const feedback = el2("selectsFeedback");
    if (feedback) feedback.textContent = "";
    if (!lastSections?.length) {
      if (feedback) feedback.textContent = "Run Analyze first.";
      return;
    }
    const btn = el2("btnCreateSelects");
    if (btn) btn.disabled = true;
    try {
      const summary = await createSelectsTimeline(lastSections, (msg) => {
        if (feedback) feedback.textContent = msg || "";
      });
      if (feedback) feedback.textContent = "Done \u2713";
      if (el2("selectsReport")) el2("selectsReport").style.display = "block";
      renderReport(summary, "srTitle", "srSummary", "srRows");
    } catch (err) {
      if (feedback) feedback.textContent = err?.message || "Failed";
    } finally {
      if (btn) btn.disabled = false;
    }
  });
  el2("btnCreateRoughCut")?.addEventListener("click", async () => {
    const feedback = el2("roughCutFeedback");
    if (feedback) feedback.textContent = "";
    if (!lastSections?.length) {
      if (feedback) feedback.textContent = "Run Analyze first.";
      return;
    }
    const btn = el2("btnCreateRoughCut");
    if (btn) btn.disabled = true;
    const gapSec = Number(el2("rcGap")?.value || 0);
    const addMarkers = !!el2("rcAddMarkers")?.checked;
    const includeMarkerComments = !!el2("rcMarkerComments")?.checked;
    try {
      const summary = await createRoughCutTimeline(
        lastSections,
        { gapSec, addMarkers, includeMarkerComments },
        (msg) => {
          if (feedback) feedback.textContent = msg || "";
        }
      );
      if (feedback) feedback.textContent = "Done \u2713";
      if (el2("roughCutReport")) el2("roughCutReport").style.display = "block";
      renderReport(summary, "rcTitle", "rcSummary", "rcRows");
    } catch (err) {
      if (feedback) feedback.textContent = err?.message || "Failed";
    } finally {
      if (btn) btn.disabled = false;
    }
  });
  function appendAssistantMessage(role, text, variant = "") {
    const history = el2("asstHistory");
    if (!history) return;
    const row = document.createElement("div");
    row.className = `asst-msg asst-msg--${role}` + (variant ? ` asst-msg--${variant}` : "");
    const avatar = document.createElement("div");
    avatar.className = "asst-avatar";
    avatar.textContent = role === "user" ? "Y" : "EP";
    const bubble = document.createElement("div");
    bubble.className = "asst-bubble";
    bubble.textContent = String(text ?? "");
    row.appendChild(avatar);
    row.appendChild(bubble);
    history.appendChild(row);
    history.scrollTop = history.scrollHeight;
  }
  function clearAssistantHistory() {
    const history = el2("asstHistory");
    if (history) history.innerHTML = "";
  }
  async function handleAssistantCommand(raw) {
    const parsed = parseCommand(raw);
    if (!parsed) return;
    if (parsed.intent === INTENTS.CLEAR) {
      clearAssistantHistory();
      return;
    }
    if (parsed.intent === INTENTS.HELP) {
      appendAssistantMessage("system", getHelpText());
      return;
    }
    if (parsed.intent === INTENTS.ANALYZE) {
      setActiveTab("story");
      appendAssistantMessage("system", "Open Story Engine tab and click \u201CAnalyze Transcript\u201D.");
      return;
    }
    {
      const _navMap = {
        [INTENTS.NAV_VIDEO]: { tab: "videogen", promptId: "vgPrompt" },
        [INTENTS.NAV_IMAGE]: { tab: "imagegen", promptId: "igPrompt" },
        [INTENTS.NAV_TTS]: { tab: "tts", promptId: "ttsPrompt" },
        [INTENTS.NAV_BROLL]: { tab: "broll", promptId: "brPrompt" },
        [INTENTS.NAV_STORY]: { tab: "story", promptId: null },
        [INTENTS.NAV_COLOR]: { tab: "color", promptId: "clrPrompt" },
        [INTENTS.NAV_AUDIO]: { tab: "audio", promptId: null },
        [INTENTS.NAV_CAPS]: { tab: "captions", promptId: "capUrl" }
      };
      const _nav = _navMap[parsed.intent];
      if (_nav) {
        setActiveTab(_nav.tab);
        if (_nav.promptId && parsed.args) {
          const _pEl = el2(_nav.promptId);
          if (_pEl) {
            _pEl.value = parsed.args;
            _pEl.focus();
          }
        }
        appendAssistantMessage("system", "Switched to " + _nav.tab + (parsed.args ? " -- prompt filled" : ""), "ok");
        return;
      }
    }
    if (parsed.intent === INTENTS.SOCIAL) {
      if (!lastSections?.length) {
        appendAssistantMessage("system", 'No sections yet. Run "analyze" first.', "error");
        return;
      }
      const _best = lastSections.reduce((b, s) => (s.reason?.length || 0) > (b.reason?.length || 0) ? s : b, lastSections[0]);
      appendAssistantMessage(
        "system",
        'Best social clip: "' + _best.title + '"\n' + _best.start + " -> " + _best.end + "\n" + (_best.reason || ""),
        "ok"
      );
      const _bEl = el2("brPrompt");
      if (_bEl) _bEl.value = "B-roll for: " + _best.title;
      return;
    }
    if (parsed.intent === INTENTS.TOP5) {
      if (!lastSections?.length) {
        appendAssistantMessage("system", 'No sections yet. Run "analyze" first.', "error");
        return;
      }
      const _top = lastSections.slice(0, 5);
      const _msg = "Top moments:\n" + _top.map((s, i) => i + 1 + ". " + s.title + " (" + s.start + " -> " + s.end + ")").join("\n");
      appendAssistantMessage("system", _msg, "ok");
      return;
    }
    if (parsed.intent === INTENTS.SELECTS) {
      if (!lastSections?.length) {
        appendAssistantMessage("system", "No sections yet. Run \u201Canalyze\u201D first.", "error");
        return;
      }
      appendAssistantMessage("system", "Creating Selects timeline\u2026", "progress");
      try {
        const summary = await createSelectsTimeline(lastSections);
        appendAssistantMessage("system", `Selects created: ${summary.sequenceName}`, "ok");
        if (el2("selectsReport")) el2("selectsReport").style.display = "block";
        renderReport(summary, "srTitle", "srSummary", "srRows");
        setActiveTab("story");
      } catch (err) {
        appendAssistantMessage("system", err?.message || "Failed to create selects.", "error");
      }
      return;
    }
    if (parsed.intent === INTENTS.ROUGH_CUT) {
      if (!lastSections?.length) {
        appendAssistantMessage("system", "No sections yet. Run \u201Canalyze\u201D first.", "error");
        return;
      }
      appendAssistantMessage("system", "Creating Rough Cut\u2026", "progress");
      const gapSec = Number(el2("rcGap")?.value || 0);
      const addMarkers = !!el2("rcAddMarkers")?.checked;
      const includeMarkerComments = !!el2("rcMarkerComments")?.checked;
      try {
        const summary = await createRoughCutTimeline(lastSections, { gapSec, addMarkers, includeMarkerComments });
        appendAssistantMessage("system", `Rough Cut created: ${summary.sequenceName}`, "ok");
        if (el2("roughCutReport")) el2("roughCutReport").style.display = "block";
        renderReport(summary, "rcTitle", "rcSummary", "rcRows");
        setActiveTab("story");
      } catch (err) {
        appendAssistantMessage("system", err?.message || "Failed to create rough cut.", "error");
      }
      return;
    }
    appendAssistantMessage("system", "Unknown command. Type \u201Chelp\u201D.", "error");
  }
  function sendAssistant() {
    const input = el2("asstInput");
    const raw = (input?.value || "").trim();
    if (!raw) return;
    if (input) input.value = "";
    appendAssistantMessage("user", raw);
    handleAssistantCommand(raw);
  }
  el2("asstSend")?.addEventListener("click", sendAssistant);
  el2("asstInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendAssistant();
  });
  async function pickImageForComposer() {
    try {
      const uxp = __require("uxp");
      const file = await uxp.storage.localFileSystem.getFileForOpening({
        allowMultiple: false,
        types: ["jpg", "jpeg", "png", "webp"]
      });
      if (!file) return null;
      const buf = await file.read({ format: uxp.storage.formats.binary });
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const b64 = btoa(binary);
      const ext = (file.name || "").split(".").pop().toLowerCase();
      const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
      return { dataUrl: `data:${mime};base64,${b64}`, name: file.name || "image" };
    } catch (_) {
      return null;
    }
  }
  function appendGenItem(historyEl, emptyEl, meta, prompt, errMsg) {
    if (!historyEl) return null;
    if (emptyEl) emptyEl.style.display = "none";
    const item = document.createElement("div");
    item.className = "gen-item";
    if (meta) {
      const metaEl = document.createElement("div");
      metaEl.className = "gen-item-meta";
      metaEl.textContent = Object.values(meta).filter(Boolean).join(" \u2022 ");
      item.appendChild(metaEl);
    }
    const promptEl = document.createElement("div");
    promptEl.className = "gen-item-prompt";
    promptEl.textContent = prompt;
    item.appendChild(promptEl);
    if (errMsg) {
      const errEl = document.createElement("div");
      errEl.className = "gen-item-err";
      errEl.textContent = errMsg;
      item.appendChild(errEl);
    } else {
      const pending = document.createElement("div");
      pending.className = "gen-item-pending";
      pending.innerHTML = '<span class="spinner" style="display:inline-block"></span> Generating\u2026';
      item.appendChild(pending);
    }
    historyEl.appendChild(item);
    historyEl.scrollTop = historyEl.scrollHeight;
    return item;
  }
  function updateGenItem(item, videoUrl, imageUrls, errMsg) {
    if (!item) return;
    const pending = item.querySelector(".gen-item-pending");
    if (pending) pending.remove();
    if (errMsg) {
      const errEl = document.createElement("div");
      errEl.className = "gen-item-err";
      errEl.textContent = errMsg;
      item.appendChild(errEl);
      return;
    }
    const urls = Array.isArray(imageUrls) ? imageUrls : imageUrls ? [imageUrls] : [];
    urls.forEach((url) => {
      if (!url) return;
      const img = document.createElement("img");
      img.className = "gen-item-img";
      img.src = url;
      img.alt = "Generated";
      item.appendChild(img);
    });
    if (videoUrl) {
      const actions = document.createElement("div");
      actions.className = "gen-item-actions";
      const openBtn = document.createElement("button");
      openBtn.className = "btn";
      openBtn.style.fontSize = ".6rem";
      openBtn.textContent = "Open Video";
      openBtn.addEventListener("click", () => openExternal(videoUrl));
      actions.appendChild(openBtn);
      item.appendChild(actions);
      const note = document.createElement("div");
      note.className = "gen-item-meta";
      note.textContent = "Video ready \u2014 click to view";
      item.appendChild(note);
    }
  }
  var _vgImageData = null;
  function setupVideoGen() {
    const attachBtn = el2("vgAttach");
    const imgsWrap = el2("vgImgsWrap");
    const imgPreview = el2("vgImgPreview");
    const imgRemove = el2("vgImgRemove");
    const sendBtn = el2("vgSend");
    const promptEl = el2("vgPrompt");
    const history = el2("vgHistory");
    const empty = el2("vgEmpty");
    if (!sendBtn || !promptEl) return;
    attachBtn?.addEventListener("click", async () => {
      const result = await pickImageForComposer();
      if (!result) return;
      _vgImageData = result.dataUrl;
      if (imgPreview) imgPreview.src = result.dataUrl;
      if (imgsWrap) imgsWrap.style.display = "flex";
    });
    imgRemove?.addEventListener("click", () => {
      _vgImageData = null;
      if (imgsWrap) imgsWrap.style.display = "none";
      if (imgPreview) imgPreview.removeAttribute("src");
    });
    sendBtn.addEventListener("click", async () => {
      const prompt = (promptEl.value || "").trim();
      if (!prompt) {
        promptEl.focus();
        return;
      }
      const token = getToken();
      if (!token) {
        appendGenItem(history, empty, null, prompt, "Not connected. Reconnect from saadstudio.app/panel");
        return;
      }
      const model = el2("vgModel")?.value || "kling-3.0-pro";
      const duration = el2("vgDuration")?.value || "5";
      const ratio = el2("vgRatio")?.value || "16:9";
      const quality = el2("vgQuality")?.value || "1080p";
      const item = appendGenItem(history, empty, { model, duration: duration + "s", ratio }, prompt, null);
      sendBtn.disabled = true;
      promptEl.value = "";
      try {
        const result = await generateVideo(token, {
          prompt,
          modelId: model,
          duration: parseInt(duration, 10),
          aspectRatio: ratio,
          resolution: quality,
          imageUrl: _vgImageData || void 0
        });
        const videoUrl = result?.videoUrl || result?.url || null;
        _vgImageData = null;
        if (imgsWrap) imgsWrap.style.display = "none";
        if (imgPreview) imgPreview.removeAttribute("src");
        updateGenItem(item, videoUrl, null, null);
        try {
          const bal = await refreshCreditsFromServer();
          updateCreditsDisplay(bal);
        } catch (_) {
        }
      } catch (err) {
        updateGenItem(item, null, null, err?.message || "Generation failed");
      } finally {
        sendBtn.disabled = false;
      }
    });
  }
  window.__editpilotSetupVideoGen = setupVideoGen;
  var _igImageData = null;
  function setupImageGen() {
    const attachBtn = el2("igAttach");
    const imgsWrap = el2("igImgsWrap");
    const imgPreview = el2("igImgPreview");
    const imgRemove = el2("igImgRemove");
    const sendBtn = el2("igSend");
    const promptEl = el2("igPrompt");
    const history = el2("igHistory");
    const empty = el2("igEmpty");
    if (!sendBtn || !promptEl) return;
    attachBtn?.addEventListener("click", async () => {
      const result = await pickImageForComposer();
      if (!result) return;
      _igImageData = result.dataUrl;
      if (imgPreview) imgPreview.src = result.dataUrl;
      if (imgsWrap) imgsWrap.style.display = "flex";
    });
    imgRemove?.addEventListener("click", () => {
      _igImageData = null;
      if (imgsWrap) imgsWrap.style.display = "none";
      if (imgPreview) imgPreview.removeAttribute("src");
    });
    sendBtn.addEventListener("click", async () => {
      const prompt = (promptEl.value || "").trim();
      if (!prompt) {
        promptEl.focus();
        return;
      }
      const token = getToken();
      if (!token) {
        appendGenItem(history, empty, null, prompt, "Not connected. Reconnect from saadstudio.app/panel");
        return;
      }
      const model = el2("igModel")?.value || "gpt-image-2";
      const mode = el2("igMode")?.value || "standard";
      const ratio = el2("igRatio")?.value || "1:1";
      const quality = el2("igQuality")?.value || "1024";
      const count = parseInt(el2("igCount")?.value || "1", 10);
      const item = appendGenItem(history, empty, { model, mode, ratio }, prompt, null);
      sendBtn.disabled = true;
      promptEl.value = "";
      try {
        const result = await generateImage(token, {
          prompt,
          modelId: model,
          mode,
          aspectRatio: ratio,
          resolution: parseInt(quality, 10),
          numImages: count,
          referenceImageUrl: _igImageData || void 0
        });
        _igImageData = null;
        if (imgsWrap) imgsWrap.style.display = "none";
        if (imgPreview) imgPreview.removeAttribute("src");
        const images = result?.images || (result?.imageUrl ? [result.imageUrl] : []);
        updateGenItem(item, null, images, null);
        try {
          const bal = await refreshCreditsFromServer();
          updateCreditsDisplay(bal);
        } catch (_) {
        }
      } catch (err) {
        updateGenItem(item, null, null, err?.message || "Generation failed");
      } finally {
        sendBtn.disabled = false;
      }
    });
  }
  window.__editpilotSetupImageGen = setupImageGen;
  function setupTTS() {
    const promptEl = el2("ttsPrompt");
    const sendBtn = el2("ttsSend");
    const charCount = el2("ttsCharCount");
    const history = el2("ttsHistory");
    const empty = el2("ttsEmpty");
    if (!sendBtn || !promptEl) return;
    promptEl.addEventListener("input", () => {
      if (charCount) charCount.textContent = (promptEl.value || "").length + " chars";
    });
    sendBtn.addEventListener("click", async () => {
      const text = (promptEl.value || "").trim();
      if (!text) {
        promptEl.focus();
        return;
      }
      const token = getToken();
      if (!token) {
        appendGenItem(history, empty, null, text, "Not connected. Reconnect from saadstudio.app/panel");
        return;
      }
      const voiceId = el2("ttsVoice")?.value || "rachel";
      const speed = parseFloat(el2("ttsSpeed")?.value || "1");
      const item = appendGenItem(history, empty, { voice: voiceId, speed: speed + "x" }, text, null);
      sendBtn.disabled = true;
      promptEl.value = "";
      if (charCount) charCount.textContent = "0 chars";
      try {
        const result = await generateTTS(token, { text, voiceId, speed });
        const audioUrl = result?.audioUrl;
        if (!audioUrl) throw new Error("No audio URL returned");
        const pending = item.querySelector(".gen-item-pending");
        if (pending) pending.remove();
        const actions = document.createElement("div");
        actions.className = "gen-item-actions";
        const openBtn = document.createElement("button");
        openBtn.className = "btn";
        openBtn.style.fontSize = ".6rem";
        openBtn.textContent = "Play / Download";
        openBtn.addEventListener("click", () => openExternal(audioUrl));
        actions.appendChild(openBtn);
        const copyBtn = document.createElement("button");
        copyBtn.className = "btn";
        copyBtn.style.fontSize = ".6rem";
        copyBtn.textContent = "Copy URL";
        copyBtn.addEventListener("click", () => {
          try {
            navigator.clipboard.writeText(audioUrl);
          } catch (_) {
          }
        });
        actions.appendChild(copyBtn);
        item.appendChild(actions);
        try {
          const bal = await refreshCreditsFromServer();
          updateCreditsDisplay(bal);
        } catch (_) {
        }
      } catch (err) {
        updateGenItem(item, null, null, err?.message || "TTS failed");
      } finally {
        sendBtn.disabled = false;
      }
    });
  }
  window.__editpilotSetupTTS = setupTTS;
  var _tlLastResult = null;
  function setupTimeline() {
    const promptEl = el2("tlPrompt");
    const sendBtn = el2("tlSend");
    const applyBtn = el2("tlApplyAll");
    const history = el2("tlHistory");
    const empty = el2("tlEmpty");
    if (!sendBtn || !promptEl) return;
    sendBtn.addEventListener("click", async () => {
      const userText = (promptEl.value || "").trim();
      if (!userText) {
        promptEl.focus();
        return;
      }
      const token = getToken();
      if (!token) {
        appendGenItem(history, empty, null, userText, "Not connected. Reconnect from saadstudio.app/panel");
        return;
      }
      const mode = el2("tlMode")?.value || "speech";
      const systemPrompt = `You are an expert video editor assistant for Premiere Pro.
The user will describe their timeline or paste a transcript.
Analyze it and return a JSON response with this structure:
{ "summary": "brief analysis", "zones": [ { "start": "00:00:05", "end": "00:00:23", "label": "Zone name", "type": "speech|gap|key|broll", "note": "what to do" } ] }
Mode requested: ${mode}. Be concise. Return valid JSON only.`;
      const item = appendGenItem(history, empty, { mode }, userText, null);
      sendBtn.disabled = true;
      promptEl.value = "";
      try {
        const result = await sendChat(token, [
          { role: "system", content: systemPrompt },
          { role: "user", content: userText }
        ], "medium");
        const raw = result?.content || result?.message?.content || "";
        let parsed = null;
        try {
          const clean = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
          parsed = JSON.parse(clean);
        } catch (_) {
        }
        const pending = item.querySelector(".gen-item-pending");
        if (pending) pending.remove();
        if (parsed?.zones?.length) {
          _tlLastResult = parsed.zones;
          const summary = document.createElement("div");
          summary.className = "gen-item-prompt";
          summary.textContent = parsed.summary || "";
          item.appendChild(summary);
          parsed.zones.forEach((z) => {
            const zRow = document.createElement("div");
            zRow.style.cssText = "display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--b0)";
            const typeColors = { speech: "var(--ac)", gap: "#ffd700", key: "#ff6b6b", broll: "var(--ac2)" };
            const col = typeColors[z.type] || "var(--txm)";
            zRow.innerHTML = `<span style="font-size:.54rem;color:${col};min-width:80px;flex-shrink:0">${z.start} \u2192 ${z.end}</span>
<span style="flex:1;font-size:.6rem;color:var(--txm);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${z.label}</span>
<span style="font-size:.48rem;font-weight:700;padding:1px 5px;border-radius:3px;background:${col}22;color:${col};flex-shrink:0">${z.type}</span>`;
            item.appendChild(zRow);
          });
        } else {
          const note = document.createElement("div");
          note.style.cssText = "font-size:.62rem;color:var(--txm);line-height:1.5;margin-top:4px;white-space:pre-wrap";
          note.textContent = raw.slice(0, 800);
          item.appendChild(note);
        }
        try {
          const bal = await refreshCreditsFromServer();
          updateCreditsDisplay(bal);
        } catch (_) {
        }
      } catch (err) {
        updateGenItem(item, null, null, err?.message || "Timeline AI failed");
      } finally {
        sendBtn.disabled = false;
      }
    });
    applyBtn?.addEventListener("click", () => {
      if (!_tlLastResult?.length) return;
      setActiveTab("story");
      const sections = _tlLastResult.map((z) => ({
        title: z.label,
        start: z.start,
        end: z.end,
        reason: z.note || z.type
      }));
      if (typeof renderStorySections === "function") {
      }
      appendAssistantMessage("system", `${_tlLastResult.length} zones ready \u2014 go to Story Engine to apply them to the timeline.`, "ok");
      setActiveTab("chat");
    });
  }
  window.__editpilotSetupTimeline = setupTimeline;
  init();
})();
