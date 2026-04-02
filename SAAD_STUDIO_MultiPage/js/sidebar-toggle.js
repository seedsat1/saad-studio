
/* ── Sidebar toggle helpers ── */
function toggleSidebar(id) {
  // No id = main navigation sidebar drawer
  if (!id) {
    const sb  = document.querySelector('.sidebar');
    const ov  = document.getElementById('sidebar-overlay');
    if (!sb) return;
    const isOpen = sb.classList.contains('drawer-open');
    if (isOpen) { sb.classList.remove('drawer-open'); if(ov) ov.classList.remove('open'); }
    else         { sb.classList.add('drawer-open');    if(ov) ov.classList.add('open');    }
    return;
  }
  // With id = settings/tool sidebar panel
  const sb = document.getElementById(id);
  if (!sb) return;
  const overlay = document.getElementById('qw2-overlay');
  if (window.innerWidth <= 900) {
    const isOpen = sb.classList.contains('qw2-sb-open');
    document.querySelectorAll('.qw2-sidebar.qw2-sb-open').forEach(s => s.classList.remove('qw2-sb-open'));
    if (!isOpen) {
      sb.classList.add('qw2-sb-open');
      if(overlay) overlay.classList.add('active');
    } else {
      if(overlay) overlay.classList.remove('active');
    }
  } else {
    sb.classList.toggle('qw2-sb-hidden');
  }
}
function closeSidebar(id) {
  // No id = main navigation sidebar drawer
  if (!id) {
    document.querySelector('.sidebar')?.classList.remove('drawer-open');
    document.getElementById('sidebar-overlay')?.classList.remove('open');
    return;
  }
  const sb = document.getElementById(id);
  if (!sb) return;
  if (window.innerWidth <= 900) {
    sb.classList.remove('qw2-sb-open');
  } else {
    sb.classList.add('qw2-sb-hidden');
  }
  document.getElementById('qw2-overlay')?.classList.remove('active');
}
function closeAllSidebars() {
  document.querySelectorAll('.qw2-sidebar').forEach(sb => sb.classList.remove('qw2-sb-open'));
  document.getElementById('qw2-overlay')?.classList.remove('active');
}

/* ══════════════════════════════════════════════════════════
   SWIPE GESTURES — للإغلاق بالسحب باليد
   • السحب لليسار  → يغلق السايدبار (السايدبار على اليسار)
   • السحب لليمين → يفتح السايدبار (سحب من حافة الشاشة)
   ══════════════════════════════════════════════════════════ */
(function() {
  let touchStartX = 0, touchStartY = 0;
  const EDGE_ZONE = 24;   // pixels from left edge to trigger open-swipe
  const MIN_SWIPE = 50;   // minimum horizontal distance for a swipe
  const MAX_VERT  = 80;   // maximum vertical drift (to avoid scroll conflicts)

  document.addEventListener('touchstart', function(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', function(e) {
    if (!e.changedTouches.length) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);

    // Ignore if mostly vertical (scrolling)
    if (dy > MAX_VERT || Math.abs(dx) < MIN_SWIPE) return;
    if (window.innerWidth > 900) return;

    const openSb = document.querySelector('.qw2-sidebar.qw2-sb-open');

    if (dx < 0) {
      // Swipe LEFT → close any open sidebar
      if (openSb) closeAllSidebars();
    } else {
      // Swipe RIGHT from left edge → open the active page's sidebar if none open
      if (!openSb && touchStartX <= EDGE_ZONE) {
        // Find visible sidebar in current active page section
        const activePage = document.querySelector('.page.active, .page-content.active');
        const sb = activePage ? activePage.querySelector('.qw2-sidebar') : null;
        if (sb) {
          closeAllSidebars(); // safety
          sb.classList.add('qw2-sb-open');
          document.getElementById('qw2-overlay').classList.add('active');
        }
      }
    }
  }, { passive: true });

  /* Live drag-to-dismiss: sidebar follows finger while dragging left */
  let draggingSb = null;
  document.addEventListener('touchmove', function(e) {
    if (window.innerWidth > 900) return;
    const dx = e.touches[0].clientX - touchStartX;
    const dy = Math.abs(e.touches[0].clientY - touchStartY);
    if (dy > 40 || dx >= 0) { draggingSb = null; return; }

    const openSb = document.querySelector('.qw2-sidebar.qw2-sb-open');
    if (!openSb) { draggingSb = null; return; }

    draggingSb = openSb;
    const offset = Math.min(0, dx); // only negative (leftward)
    draggingSb.style.transition = 'none';
    draggingSb.style.left = offset + 'px';
    // Fade overlay proportionally
    const ratio = 1 + offset / 280;
    document.getElementById('qw2-overlay').style.opacity = Math.max(0, ratio);
  }, { passive: true });

  document.addEventListener('touchend', function() {
    if (!draggingSb) return;
    draggingSb.style.transition = '';
    draggingSb.style.left = '';
    document.getElementById('qw2-overlay').style.opacity = '';
    draggingSb = null;
  }, { passive: true });
})();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    const host = String(location.hostname || '').toLowerCase();
    const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '::1';

    // Avoid offline-cache interference during local development.
    if (isLocalHost) {
      navigator.serviceWorker.getRegistrations()
        .then(function(regs) { return Promise.all(regs.map(function(r) { return r.unregister(); })); })
        .then(function() { console.log('[PWA] Service Worker disabled on localhost.'); })
        .catch(function(err) { console.warn('[PWA] Failed to disable local Service Worker:', err); });
      return;
    }

    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(function(reg) {
        console.log('[PWA] Service Worker registered, scope:', reg.scope);
        reg.addEventListener('updatefound', function() {
          const newWorker = reg.installing;
          newWorker.addEventListener('statechange', function() {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] New version available – reload to update.');
            }
          });
        });
      })
      .catch(function(err) { console.warn('[PWA] Service Worker registration failed:', err); });
  });
}
