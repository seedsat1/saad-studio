
(function applyCMSSidebar(){
  // Map each .nav-item to its pageId extracted from onclick attribute
  function getPageId(el){
    const oc = el.getAttribute('onclick') || '';
    const m = oc.match(/showPage\('([^']+)'/);
    return m ? m[1] : (el.id === 'nav-dashboard' ? 'nav-dashboard' : null);
  }

  // Build badge HTML
  function badgeHtml(badge){
    if(!badge || !badge.text) return '';
    return `<span style="font-size:9px;font-weight:800;padding:1px 7px;border-radius:20px;background:${badge.color||'#5fe2ff'};color:#000;margin-right:auto;flex-shrink:0;">${badge.text}</span>`;
  }

  fetch('/api/cms/sidebar').then(r=>r.json()).then(d=>{
    const items = d.sidebar || [];
    if(!items.length) return;

    // Map: pageId → CMS config
    const cmsMap = {};
    items.forEach(item => { cmsMap[item.pageId] = item; });

    // Apply to existing nav-items
    document.querySelectorAll('.nav-item').forEach(el => {
      const pageId = getPageId(el) || el.id;
      if(!pageId) return;
      const cfg = cmsMap[pageId];
      if(!cfg) return;

      // Visibility/enabled
      if(cfg.visible === false || cfg.enabled === false){
        if(!el.id || !el.id.startsWith('nav-')) { // don't hide role-managed ones that have dynamic show
          el.style.setProperty('display', 'none', 'important');
        }
        return;
      }
      // Only restore display if CMS says visible (don't override role-based hidden like nav-dashboard)
      if(pageId !== 'nav-dashboard' && pageId !== 'control'){
        el.style.removeProperty('display');
      }

      // Title
      const nameEl = el.querySelector('.nav-name');
      if(nameEl && cfg.title) nameEl.textContent = cfg.title;

      // Remove old CMS badge if any
      const existingBadge = el.querySelector('.cms-dynamic-badge');
      if(existingBadge) existingBadge.remove();

      // Badge
      if(cfg.badge && cfg.badge.text){
        const span = document.createElement('span');
        span.className = 'cms-dynamic-badge';
        span.style.cssText = `font-size:9px;font-weight:800;padding:1px 7px;border-radius:20px;background:${cfg.badge.color||'#5fe2ff'};color:#000;margin-right:auto;flex-shrink:0;`;
        span.textContent = cfg.badge.text;
        el.appendChild(span);
      }

      // isNew badge
      if(cfg.isNew && !cfg.badge){
        const span = document.createElement('span');
        span.className = 'cms-dynamic-badge';
        span.style.cssText = 'font-size:9px;font-weight:800;padding:1px 7px;border-radius:20px;background:#3cdc78;color:#000;margin-right:auto;flex-shrink:0;';
        span.textContent = 'NEW';
        el.appendChild(span);
      }

      // isPro badge
      if(cfg.isPro && !cfg.badge && !cfg.isNew){
        const span = document.createElement('span');
        span.className = 'cms-dynamic-badge';
        span.style.cssText = 'font-size:9px;font-weight:800;padding:1px 7px;border-radius:20px;background:#f2b544;color:#000;margin-right:auto;flex-shrink:0;';
        span.textContent = 'PRO';
        el.appendChild(span);
      }
    });

    // Hide empty nav-label groups
    document.querySelectorAll('.nav-label').forEach(label => {
      let sib = label.nextElementSibling;
      let hasVisible = false;
      while(sib && !sib.classList.contains('nav-label')){
        if(sib.classList.contains('nav-item') && sib.style.display !== 'none' && sib.style.display !== ''){
          hasVisible = true; break;
        }
        // also check computed
        if(sib.classList.contains('nav-item') && getComputedStyle(sib).display !== 'none'){
          hasVisible = true; break;
        }
        sib = sib.nextElementSibling;
      }
    });

    // Store for external access (admin/dashboard can use this)
    window._cmsSidebar = items;
  }).catch(()=>{/* CMS offline - keep existing sidebar as-is */});
})();

// ── Sidebar Drawer for Mobile ──
function toggleSidebar(){
  const sb=document.querySelector('.sidebar');
  const ov=document.getElementById('sidebar-overlay');
  const isOpen=sb.classList.contains('drawer-open');
  if(isOpen){ sb.classList.remove('drawer-open'); ov.classList.remove('open'); }
  else{ sb.classList.add('drawer-open'); ov.classList.add('open'); }
}
function closeSidebar(){
  document.querySelector('.sidebar').classList.remove('drawer-open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}
// close drawer on any nav item click (mobile)
document.querySelectorAll('.nav-item').forEach(el=>el.addEventListener('click',()=>{
  if(window.innerWidth<=980) closeSidebar();
}));
// Close drawer on Escape key
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeSidebar(); });

// ── In-Navbar Promo Bar ──
(function(){
  const slot = document.getElementById('promo-in-navbar');
  if(!slot) return;
  function esc(s){ const d=document.createElement('div'); d.textContent=String(s||''); return d.innerHTML; }
  function escA(s){ return esc(s).replace(/"/g,'&quot;'); }
  fetch('/api/cms/promobars').then(r=>r.json()).then(d=>{
    const isMobile = window.innerWidth < 768;
    const bar = (d.bars||[]).find(b=>
      b.placement==='in-navbar' && b.enabled &&
      (isMobile ? b.showMobile!==false : b.showDesktop!==false)
    );
    if(!bar){ slot.style.display='none'; return; }
    const gs=bar.gradientStart, ge=bar.gradientEnd;
    const bg=(gs&&ge)?`linear-gradient(135deg,${gs},${ge})`:(bar.bgColor||'#1a3a6c');
    let boxShadow='';
    if(bar.glowEnabled) boxShadow=`0 0 16px ${bar.gradientStart||bar.bgColor||'rgba(95,226,255,.4)'}`;
    else if(bar.shadowEnabled) boxShadow='0 2px 12px rgba(0,0,0,.4)';
    const el=document.createElement('div');
    el.className='promo-bar navbar-promo';
    el.style.cssText=`background:${bg};color:${bar.textColor||'#fff'};`+
      `border-radius:${bar.borderRadius||'8px'};`+
      (bar.borderWidth&&bar.borderColor?`border:${bar.borderWidth} solid ${bar.borderColor};`:'')+
      (boxShadow?`box-shadow:${boxShadow};`:'')+
      (bar.glassEffect?'backdrop-filter:blur(10px);background:rgba(255,255,255,.08);':'');
    const btnHTML=bar.buttonText&&bar.buttonLink
      ?`<a href="${escA(bar.buttonLink)}" style="font-size:11px;padding:3px 10px;background:${bar.btnBgColor||'rgba(255,255,255,.15)'};border:1px solid ${bar.btnBorderColor||'rgba(255,255,255,.3)'};border-radius:6px;color:${bar.btnTextColor||'inherit'};text-decoration:none;white-space:nowrap;flex-shrink:0;font-weight:${bar.btnFontWeight||'700'}">${esc(bar.buttonText)}</a>`:'';
    const subHTML=bar.subtext?`<span style="font-size:${bar.subtextFontSize||'11px'};opacity:.8;margin-right:6px;">${esc(bar.subtext)}</span>`:'';
    el.innerHTML=`<span style="font-size:${bar.mainFontSize||'13px'};font-weight:${bar.mainFontWeight||'700'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(bar.text)}</span>${subHTML}${btnHTML}<button onclick="this.closest('#promo-in-navbar').style.display='none'" style="background:none;border:none;color:inherit;opacity:.5;cursor:pointer;font-size:14px;padding:0 2px 0 8px;flex-shrink:0;" aria-label="Close">✕</button>`;
    slot.appendChild(el);
  }).catch(()=>{ slot.style.display='none'; });
})();
