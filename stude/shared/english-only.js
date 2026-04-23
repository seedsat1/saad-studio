(function () {
  const FILE_LABELS = {
    "prompt.html": "Prompt",
    "lighting.html": "Lighting",
    "transitions.html": "Transitions",
    "presets.html": "Presets",
    "video.html": "Video Generation",
    "sound.html": "Audio & Music",
  };

  const path = (location.pathname.split("/").pop() || "").toLowerCase();
  const pageName = FILE_LABELS[path] || "Editor";

  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
  document.title = pageName;

  function looksBroken(text) {
    if (!text) return false;
    return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]|[ØÙÚÛÃÂâ�]/.test(text);
  }

  function mapBroken(text) {
    const t = (text || "").trim();
    if (!t) return t;

    const rules = [
      [/frameforge/i, "FRAMEFORGE"],
      [/file|ملف/i, "File"],
      [/edit|تحرير|تعديل/i, "Edit"],
      [/view|عرض/i, "View"],
      [/prompt|برومبت/i, "Prompt"],
      [/lighting|اضاءة|إضاءة/i, "Lighting"],
      [/transition/i, "Transitions"],
      [/preset/i, "Presets"],
      [/video/i, "Video Generation"],
      [/audio|music|sound/i, "Audio & Music"],
      [/timeline|تايم/i, "Timeline"],
      [/saved|محفوظ/i, "Saved"],
      [/template|قالب/i, "Templates"],
      [/run|execute|تنفيذ/i, "Run"],
      [/save|حفظ/i, "Save"],
      [/clear|مسح/i, "Clear"],
      [/project/i, "Project"],
    ];

    for (const [re, val] of rules) {
      if (re.test(t)) return val;
    }
    return "Item";
  }

  function sanitizeAllText(root) {
    const walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const v = node.nodeValue || "";
      if (looksBroken(v)) node.nodeValue = mapBroken(v);
    });
  }

  function sanitizeAttrs(root) {
    const scope = root || document;
    scope.querySelectorAll?.("input, textarea, button, [title], [aria-label]").forEach((el) => {
      ["placeholder", "title", "aria-label", "value"].forEach((a) => {
        const v = el.getAttribute && el.getAttribute(a);
        if (v && looksBroken(v)) el.setAttribute(a, mapBroken(v));
      });
      if (el.tagName === "BUTTON") {
        const txt = (el.textContent || "").trim();
        if (looksBroken(txt)) el.textContent = mapBroken(txt);
      }
    });
  }

  function applyStaticLabels() {
    document.querySelectorAll(".page-tab").forEach((a) => {
      const href = ((a.getAttribute("href") || "").split("/").pop() || "").toLowerCase();
      if (FILE_LABELS[href]) a.textContent = FILE_LABELS[href];
    });

    const menubar = document.querySelectorAll(".menubar span:not(.spacer)");
    const fixed = ["FRAMEFORGE", "File", "Edit", "View"];
    menubar.forEach((s, i) => {
      if (i < fixed.length) s.textContent = fixed[i];
    });

    const primary = document.querySelector(".ph .l.a");
    if (primary) primary.textContent = pageName + " Panel";
  }

  function enforceNormalScale() {
    if (document.getElementById("ui-scale-fix")) return;
    const st = document.createElement("style");
    st.id = "ui-scale-fix";
    st.textContent = "html, body { zoom: 1 !important; transform: none !important; }";
    document.head.appendChild(st);
  }

  function enforceScrollbarTheme() {
    if (document.getElementById("ui-scrollbar-fix")) return;
    const st = document.createElement("style");
    st.id = "ui-scrollbar-fix";
    st.textContent = `
      :root { color-scheme: dark !important; }
      html, body {
        scrollbar-width: thin !important;
        scrollbar-color: #3d4a62 #171b22 !important;
      }
      * {
        scrollbar-width: thin !important;
        scrollbar-color: #3d4a62 #171b22 !important;
      }
      *::-webkit-scrollbar { width: 10px; height: 10px; }
      *::-webkit-scrollbar-track {
        background: #171b22 !important;
        border-left: 1px solid #252d3a !important;
      }
      *::-webkit-scrollbar-thumb {
        background: linear-gradient(180deg, #42526d, #344157) !important;
        border: 2px solid #171b22 !important;
        border-radius: 999px !important;
      }
      *::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(180deg, #4e6283, #3d4f69) !important;
      }
      *::-webkit-scrollbar-corner { background: #171b22 !important; }
      *::-webkit-scrollbar-button {
        background-color: #1b2230 !important;
      }
    `;
    document.head.appendChild(st);
  }

  function runSanitizer(root) {
    enforceNormalScale();
    enforceScrollbarTheme();
    applyStaticLabels();
    sanitizeAllText(root || document.body);
    sanitizeAttrs(root || document);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => runSanitizer(document.body));
  } else {
    runSanitizer(document.body);
  }

  // Safe observer: only sanitize newly added nodes, no characterData loop.
  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === 1) {
          runSanitizer(node);
        }
      }
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();
