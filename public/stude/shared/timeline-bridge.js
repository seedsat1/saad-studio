(function () {
  function isTypingTarget(el) {
    if (!el) return false;
    var tag = String(el.tagName || '').toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (el.isContentEditable) return true;
    return false;
  }

  function bindGlobalTimelineHotkeys(isEmbedMode) {
    function postHotkey(evt) {
      try {
        if (isEmbedMode) {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({
              type: 'ff:timeline-hotkey',
              event: {
                key: evt.key,
                code: evt.code,
                keyCode: evt.keyCode || evt.which || 0,
                which: evt.which || evt.keyCode || 0,
                ctrlKey: !!evt.ctrlKey,
                metaKey: !!evt.metaKey,
                altKey: !!evt.altKey,
                shiftKey: !!evt.shiftKey,
              },
            }, '*');
          }
          return;
        }
        var tf = document.querySelector('#external-timeline-host iframe');
        if (tf && tf.contentWindow) {
          tf.contentWindow.postMessage({
            type: 'ff:timeline-hotkey',
            event: {
              key: evt.key,
              code: evt.code,
              keyCode: evt.keyCode || evt.which || 0,
              which: evt.which || evt.keyCode || 0,
              ctrlKey: !!evt.ctrlKey,
              metaKey: !!evt.metaKey,
              altKey: !!evt.altKey,
              shiftKey: !!evt.shiftKey,
            },
          }, '*');
        }
      } catch (_e) {}
    }

    function isTimelineShortcutEvent(e) {
      var code = String(e.code || '');
      var key = String(e.key || '');
      if (code === 'Space' || key === ' ' || key === 'Spacebar' || e.keyCode === 32 || e.which === 32) return true;
      if (code === 'Delete' || code === 'Backspace') return true;
      if (code === 'ArrowLeft' || code === 'ArrowRight' || code === 'Home' || code === 'End') return true;
      var mod = !!(e.ctrlKey || e.metaKey);
      if (mod && !e.altKey && (code === 'KeyZ' || code === 'KeyY' || code === 'KeyU')) return true;
      if (code === 'KeyV' || code === 'KeyT' || code === 'KeyB' || code === 'KeyS' || code === 'KeyH' || code === 'KeyA' || code === 'KeyP' || code === 'KeyN' || code === 'KeyL' || code === 'KeyU') return true;
      return false;
    }

    function onKey(e) {
      if (!isTimelineShortcutEvent(e)) return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      postHotkey(e);
    }

    window.addEventListener('keydown', onKey, true);
    document.addEventListener('keydown', onKey, true);
  }

  function mountExternalTimeline() {
    var isEmbedMode = new URLSearchParams(location.search).get('embed') === '1';
    bindGlobalTimelineHotkeys(isEmbedMode);
    if (isEmbedMode) return;

    var MIN_TIMELINE_H = 180;
    var MIN_TOP_VISIBLE_H = 240;
    var SPLITTER_H = 8;
    var STORAGE_KEY = 'ff_timeline_height';

    var workspace = document.querySelector('.workspace');
    if (!workspace) return;

    var old = workspace.querySelector('.bottom-row');
    if (old) old.style.display = 'none';

    if (document.getElementById('external-timeline-host')) return;

    var styleId = 'external-timeline-splitter-style';
    if (!document.getElementById(styleId)) {
      var st = document.createElement('style');
      st.id = styleId;
      st.textContent = [
        '.workspace{overflow:hidden !important;display:flex;flex-direction:column;}',
        '.workspace > .top-row{flex:1 1 auto !important;min-height:240px !important;overflow:auto !important;}',
        '#external-timeline-splitter{height:8px;cursor:row-resize;flex-shrink:0;background:#191c22;border-top:1px solid #2a2f38;border-bottom:1px solid #2a2f38;position:relative}',
        '#external-timeline-splitter:hover,#external-timeline-splitter.dragging{background:#1f2530}',
        '#external-timeline-splitter::before{content:"";position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:30px;height:2px;background:#7e8da6;box-shadow:0 -4px 0 #7e8da6,0 4px 0 #7e8da6;border-radius:2px}',
        '#external-timeline-host{min-height:180px;overflow:hidden;flex:0 0 auto;}',
        '#external-timeline-host iframe{display:block;width:100%;height:100%;border:0;}',
      ].join('');
      document.head.appendChild(st);
    }

    var topRow = workspace.querySelector('.top-row');
    var splitter = document.createElement('div');
    splitter.id = 'external-timeline-splitter';

    var host = document.createElement('div');
    host.id = 'external-timeline-host';
    host.style.height = '260px';
    host.style.borderTop = '1px solid var(--border, #2d2d2d)';
    host.style.background = '#151515';

    var iframe = document.createElement('iframe');
    iframe.src = 'timeline/index.html?v=jsx-9&page=' + encodeURIComponent(document.title || 'Page');
    iframe.setAttribute('title', 'External Timeline');
    host.appendChild(iframe);

    function getWorkspaceHeight() {
      return workspace.clientHeight || window.innerHeight;
    }

    function getMaxTimelineHeight() {
      var maxH = getWorkspaceHeight() - MIN_TOP_VISIBLE_H - SPLITTER_H;
      return Math.max(MIN_TIMELINE_H, maxH);
    }

    var desiredHeight = Number(localStorage.getItem(STORAGE_KEY) || 260);
    if (!Number.isFinite(desiredHeight) || desiredHeight <= 0) desiredHeight = 260;

    function applyHeight(raw, persist) {
      var clamped = Math.max(MIN_TIMELINE_H, Math.min(getMaxTimelineHeight(), raw));
      desiredHeight = clamped;
      host.style.height = clamped + 'px';
      if (persist) localStorage.setItem(STORAGE_KEY, String(Math.round(clamped)));
    }

    if (topRow && topRow.nextSibling) {
      workspace.insertBefore(splitter, topRow.nextSibling);
      workspace.insertBefore(host, splitter.nextSibling);
    } else {
      workspace.appendChild(splitter);
      workspace.appendChild(host);
    }

    applyHeight(desiredHeight, false);

    splitter.addEventListener('mousedown', function (e) {
      e.preventDefault();
      splitter.classList.add('dragging');

      var startY = e.clientY;
      var startH = host.getBoundingClientRect().height;

      var dragShield = document.createElement('div');
      dragShield.style.position = 'fixed';
      dragShield.style.inset = '0';
      dragShield.style.zIndex = '999999';
      dragShield.style.cursor = 'row-resize';
      dragShield.style.background = 'transparent';
      document.body.appendChild(dragShield);

      function onMove(ev) {
        var dy = startY - ev.clientY;
        applyHeight(startH + dy, false);
      }

      function onUp() {
        splitter.classList.remove('dragging');
        applyHeight(desiredHeight, true);
        if (dragShield.parentNode) dragShield.parentNode.removeChild(dragShield);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      }

      dragShield.addEventListener('mousemove', onMove);
      dragShield.addEventListener('mouseup', onUp);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });

    window.addEventListener('resize', function () {
      applyHeight(desiredHeight, false);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountExternalTimeline);
  } else {
    mountExternalTimeline();
  }
})();
