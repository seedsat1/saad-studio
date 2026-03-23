
// ═══════════════════════════
// STATE
// ═══════════════════════════
const API = ''; // same origin — السيرفر
const S = {
  connected: false,
  gallery: [], // initialised from user-scoped key after AUTH is ready
  files: {},
  gbarFiles: [],
  fluxFiles: [],
  lastT2PImage: '',
  lastT2PPrompt: ''
};
const TRANSITIONS = [
  'Raven Transition',
  'Morph',
  'Air Bending',
  'Shadow Smoke',
  'Water Bending',
  'Firelava',
  'Flying Cam Transition',
  'Melt Transition',
  'Splash Transition',
  'Flame Transition',
  'Smoke Transition',
  'Logo Transform',
  'Hand Transition',
  'Column Wipe',
  'Hole Transition',
  'Display Transition',
  'Jump Transition',
  'Seamless Transition',
  'Trucksition',
  'Gorilla Transfer',
  'Intermission',
  'Stranger Transition'
];
const UI_STATE_KEY = 'saad_ui_state_v1';
const FORM_STATE_KEY = 'saad_form_state_v1';
const FILE_STATE_KEY = 'saad_file_state_v1';
const KLING_PENDING_KEY = 'saad_kling_pending_v1';
const KLING_RESULT_KEY = 'saad_kling_result_v1';
const MAX_PERSIST_IMAGE_BYTES = 2 * 1024 * 1024;
  const IMAGE_PERSIST_DZ = new Set([
    'dz-kling-image-start',
    'dz-kling-image-end',
    'dz-kling-motion-image',
    'dz-kling-avatar-image',
    'dz-kie-removebg',
    'dz-kie-upscale',
    'dz-g-nano',
    'dz-g-nano2',
    'dz-g-nanopro',
    'dz-hailuo-image',
    'dz-sora-image',
    'dz-grok-image',
    'dz-qwen2-image',
    'dz-seedream-image',
    'dz-seedance-image1',
    'dz-seedance-image2',
    'dz-wan-image',
    'dz-wan-speech-image',
    'dz-fk-image',
    'dz-ideogram-reframe-image'
  ]);

// ═══════════════════════════
// INJECT SHARED MODALS (auth, no-credit, upgrade)
// ═══════════════════════════
function injectSharedModals() {
  if (document.getElementById('auth-overlay')) return;
  // Ensure toast container exists
  if (!document.getElementById('toasts')) {
    const tc = document.createElement('div');
    tc.className = 'toast-container';
    tc.id = 'toasts';
    document.body.appendChild(tc);
  }
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
<div class="auth-overlay" id="auth-overlay" onclick="authOverlayClick(event)">
  <div class="auth-modal">
    <button class="auth-close" onclick="closeAuthModal()">✕</button>
    <div class="auth-heading">SAAD STUDIO</div>
    <p class="auth-sub">AI Creative Platform</p>
    <div class="auth-tabs">
      <button class="auth-tab-btn active" id="atab-login" onclick="switchAuthTab('login')">تسجيل الدخول</button>
      <button class="auth-tab-btn" id="atab-register" onclick="switchAuthTab('register')">إنشاء حساب</button>
    </div>
    <div id="apanel-login">
      <div class="auth-field"><label class="auth-lbl" data-ar="البريد الإلكتروني" data-en="Email">البريد الإلكتروني</label><input type="email" id="a-login-email" placeholder="you@example.com" onkeydown="if(event.key==='Enter')submitAuth()"></div>
      <div class="auth-field" style="position:relative">
        <label class="auth-lbl" data-ar="كلمة المرور" data-en="Password">كلمة المرور</label>
        <div style="position:relative">
          <input type="password" id="a-login-pw" placeholder="••••••••" onkeydown="if(event.key==='Enter')submitAuth()" style="width:100%;padding-left:36px">
          <button type="button" onclick="togglePwVis('a-login-pw',this)" style="position:absolute;left:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:rgba(255,255,255,.4);font-size:15px;padding:0;line-height:1">👁</button>
        </div>
      </div>
    </div>
    <div id="apanel-register" style="display:none">
      <div class="auth-field"><label>البريد الإلكتروني</label><input type="email" id="a-reg-email" placeholder="you@example.com"></div>
      <div class="auth-field">
        <label class="auth-lbl" data-ar="كلمة المرور" data-en="Password">كلمة المرور <span style="color:rgba(255,255,255,.3)">(8+ أحرف)</span></label>
        <div style="position:relative">
          <input type="password" id="a-reg-pw" placeholder="••••••••" minlength="8" style="width:100%;padding-left:36px">
          <button type="button" onclick="togglePwVis('a-reg-pw',this)" style="position:absolute;left:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:rgba(255,255,255,.4);font-size:15px;padding:0;line-height:1">👁</button>
        </div>
      </div>
      <div class="auth-field">
        <label class="auth-lbl" data-ar="تأكيد كلمة المرور" data-en="Confirm Password">تأكيد كلمة المرور</label>
        <div style="position:relative">
          <input type="password" id="a-reg-pw2" placeholder="••••••••" minlength="8" style="width:100%;padding-left:36px" onkeydown="if(event.key==='Enter')submitAuth()">
          <button type="button" onclick="togglePwVis('a-reg-pw2',this)" style="position:absolute;left:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:rgba(255,255,255,.4);font-size:15px;padding:0;line-height:1">👁</button>
        </div>
      </div>
      <div class="auth-choose-plan" data-ar="اختر خطتك" data-en="Choose your plan" style="font-size:11px;color:rgba(255,255,255,.4);margin-bottom:10px;text-align:center">اختر خطتك</div>
      <div class="auth-plan-grid">
        <div class="auth-plan-card selected" data-plan="starter" onclick="selectPlan('starter')">
          <div class="auth-plan-name">Starter</div><div class="auth-plan-price">$10</div><div class="auth-plan-credits">1,000 credits/mo</div>
        </div>
        <div class="auth-plan-card" data-plan="pro" onclick="selectPlan('pro')">
          <div class="auth-plan-name">Pro</div><div class="auth-plan-price">$25</div><div class="auth-plan-credits">2,800 credits/mo</div>
          <span class="auth-plan-badge">✦ Nano Pro</span>
        </div>
        <div class="auth-plan-card" data-plan="creator" onclick="selectPlan('creator')">
          <div class="auth-plan-name">Creator</div><div class="auth-plan-price">$50</div><div class="auth-plan-credits">6,000 credits/mo</div>
          <span class="auth-plan-badge">✦ Nano Pro</span>
        </div>
      </div>
    </div>
    <div class="auth-err" id="auth-err"></div>
    <button class="auth-submit-btn" id="auth-submit-btn" onclick="submitAuth()">تسجيل الدخول</button>
    <div class="auth-divider" data-ar="أو" data-en="or">أو</div>
    <div id="g-signin-container" style="display:flex;justify-content:center;width:100%;margin-top:4px;min-height:44px;"></div>
  </div>
</div>
<div id="no-credit-modal" style="display:none;position:fixed;inset:0;z-index:10000;align-items:center;justify-content:center;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);">
  <div style="background:#0d1929;border:1px solid rgba(95,226,255,.2);border-radius:22px;padding:32px 28px;max-width:480px;width:93%;box-shadow:0 24px 72px rgba(0,0,0,.7);position:relative;">
    <button onclick="closeNoCreditModal()" style="position:absolute;top:14px;left:16px;background:none;border:none;color:rgba(255,255,255,.4);font-size:20px;cursor:pointer;">✕</button>
    <div style="text-align:center;margin-bottom:20px;">
      <div style="font-size:46px;line-height:1;margin-bottom:10px;">💳</div>
      <div style="font-size:19px;font-weight:800;color:#fff;margin-bottom:6px;">نفذ رصيدك!</div>
      <div id="no-credit-msg" style="font-size:13px;color:rgba(255,255,255,.5);">رصيدك الحالي غير كافٍ لإتمام هذه العملية.</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
      <button class="topup-card" onclick="closeNoCreditModal();requestTopup(5,600)" style="text-align:right;"><div class="topup-price">$5</div><div class="topup-credits">600 كريدت</div></button>
      <button class="topup-card" onclick="closeNoCreditModal();requestTopup(10,450)" style="text-align:right;"><div class="topup-price">$10</div><div class="topup-credits">450 كريدت</div></button>
      <button class="topup-card" onclick="closeNoCreditModal();requestTopup(25,1500)" style="text-align:right;"><div class="topup-price">$25</div><div class="topup-credits">1,500 كريدت</div></button>
      <button class="topup-card" onclick="closeNoCreditModal();requestTopup(50,6000)" style="text-align:right;"><div class="topup-price">$50</div><div class="topup-credits">6,000 كريدت</div></button>
    </div>
    <button onclick="closeNoCreditModal();showPage('pricing')" style="width:100%;padding:11px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;">⚡ عرض الخطط والأسعار</button>
  </div>
</div>
<div id="upgrade-modal" style="display:none;position:fixed;inset:0;z-index:9999;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);">
  <div style="background:var(--bg2,#1a1a2e);border:1px solid var(--border,#333);border-radius:20px;padding:36px 32px;max-width:400px;width:90%;text-align:center;box-shadow:0 24px 64px rgba(0,0,0,0.6);">
    <div style="font-size:52px;margin-bottom:14px;line-height:1;">🔒</div>
    <div style="font-size:20px;font-weight:700;color:var(--tx,#fff);margin-bottom:10px;">ترقية مطلوبة</div>
    <div id="upgrade-modal-sub" style="font-size:14px;color:var(--tx2,#aaa);margin-bottom:24px;line-height:1.6;"></div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      <button onclick="closeUpgradeModal();showPage('pricing',document.querySelector('.nav-item'))" style="background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border:none;border-radius:10px;padding:12px 24px;font-size:15px;font-weight:600;cursor:pointer;">⚡ ترقية الخطة الآن</button>
      <button onclick="closeUpgradeModal()" style="background:transparent;color:var(--tx2,#aaa);border:1px solid var(--border,#333);border-radius:10px;padding:10px 24px;font-size:14px;cursor:pointer;">إلغاء</button>
    </div>
  </div>
</div>`;
  while (wrapper.firstChild) document.body.appendChild(wrapper.firstChild);

  // Inject lightbox if not already present
  if (!document.getElementById('lightbox')) {
    const lb = document.createElement('div');
    lb.innerHTML = `
<div id="lightbox" class="lb-overlay" onclick="if(event.target===this)closeLightbox()">
  <div class="lb-shell">
    <div class="lb-media">
      <button class="lb-close" onclick="closeLightbox()">×</button>
      <img id="lb-img" src="">
      <video id="lb-video" controls style="display:none;"></video>
    </div>
    <div class="lb-side">
      <div class="lb-card">
        <div class="lb-title">Prompt</div>
        <div id="lb-prompt" class="lb-prompt"></div>
        <div class="lb-note" id="lb-note">This AI generated media may be used for personal and commercial use.</div>
      </div>
      <div class="lb-actions">
        <button class="lb-action" id="lb-extend">Extend +</button>
        <button class="lb-action" id="lb-modify">Modify ✨</button>
        <button class="lb-action wide" id="lb-change">Change subject 👤</button>
        <button class="lb-action wide" id="lb-reframe">Reframe ⤴</button>
      </div>
      <div class="lb-actions">
        <button class="lb-action secondary" id="lb-prompt-btn">Prompt 📋</button>
        <button class="lb-action secondary" id="lb-history">History 🕒</button>
      </div>
      <div class="lb-bottom">
        <a id="lb-dl" download class="lb-action lb-download">Download ⬇</a>
        <button class="lb-trash" id="lb-delete">🗑</button>
      </div>
    </div>
  </div>
</div>`;
    while (lb.firstChild) document.body.appendChild(lb.firstChild);
  }

  // Inject transition-modal if not already present
  if (!document.getElementById('transition-modal')) {
    const tm = document.createElement('div');
    tm.innerHTML = `
<div id="transition-modal" class="tr-modal" onclick="if(event.target===this)closeTransitionModal()">
  <div class="tr-modal-panel">
    <div class="tr-modal-head">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(95,226,255,0.8)" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12l2.5 2.5L16 9"/></svg>
      <div class="tr-modal-title">TRANSITIONS</div>
      <input class="tr-search" id="tr-search" placeholder="...Search transitions" oninput="renderTransitionList(this.value)">
      <button onclick="closeTransitionModal()" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);color:#fff;border-radius:50px;padding:6px 14px;font-size:10px;cursor:pointer;font-family:var(--fm);letter-spacing:0.1em;white-space:nowrap;">Close</button>
    </div>
    <div class="tr-modal-grid" id="tr-modal-grid"></div>
  </div>
</div>`;
    while (tm.firstChild) document.body.appendChild(tm.firstChild);
  }
}

function readJson(key, fallback){
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

function loadUiState(){
  return readJson(UI_STATE_KEY, {});
}

function saveUiState(partial){
  const current = loadUiState();
  writeJson(UI_STATE_KEY, Object.assign({}, current, partial));
}

function getFormState(){
  return readJson(FORM_STATE_KEY, {});
}

function saveFormState(state){
  writeJson(FORM_STATE_KEY, state);
}

function persistFormField(el){
  if(!el || !el.id) return;
  if(el.type === 'file') return;
  const state = getFormState();
  if(el.type === 'checkbox'){
    state[el.id] = { t:'c', v: !!el.checked };
  } else {
    state[el.id] = { t:'v', v: el.value };
  }
  saveFormState(state);
}

function bindFormPersistence(){
  document.querySelectorAll('input[id], textarea[id], select[id]').forEach(el => {
    if(el.type === 'file') return;
    el.addEventListener('input', () => persistFormField(el));
    el.addEventListener('change', () => persistFormField(el));
  });
}

function restoreFormState(){
  const state = getFormState();
  Object.keys(state).forEach(id => {
    const el = document.getElementById(id);
    if(!el || el.type === 'file') return;
    const entry = state[id];
    if(entry?.t === 'c'){
      el.checked = !!entry.v;
    } else if(entry && Object.prototype.hasOwnProperty.call(entry, 'v')){
      el.value = entry.v;
    }
    if(el.tagName === 'SELECT'){
      el.dispatchEvent(new Event('change'));
    }
  });
}

function getFileState(){
  return readJson(FILE_STATE_KEY, {});
}

function saveFileState(state){
  writeJson(FILE_STATE_KEY, state);
}

async function persistImageDropzone(dzId, file){
  if(!IMAGE_PERSIST_DZ.has(dzId)) return;
  const state = getFileState();
  if(!file || !file.type.startsWith('image/')){
    delete state[dzId];
    saveFileState(state);
    return;
  }
  if(file.size > MAX_PERSIST_IMAGE_BYTES){
    delete state[dzId];
    saveFileState(state);
    return;
  }
  try{
    const dataUrl = await fileToDataUrl(file);
    state[dzId] = { name: file.name, type: file.type, dataUrl };
    saveFileState(state);
  } catch {}
}

async function restoreFileState(){
  const state = getFileState();
  const ids = Object.keys(state || {});
  for(const dzId of ids){
    const entry = state[dzId];
    if(!entry?.dataUrl) continue;
    try{
      const file = await dataUrlToFile(entry.dataUrl, entry.name || 'image.png');
      S.files[dzId] = file;
      renderDropzonePreview(dzId, file, entry.dataUrl);
    } catch {}
  }
}

function saveKlingPending(task){
  writeJson(KLING_PENDING_KEY, task);
}

function clearKlingPending(){
  localStorage.removeItem(KLING_PENDING_KEY);
}

function loadKlingPending(){
  return readJson(KLING_PENDING_KEY, null);
}

function saveKlingResult(result){
  writeJson(KLING_RESULT_KEY, result);
}

function loadKlingResult(){
  return readJson(KLING_RESULT_KEY, null);
}

function clearKlingResult(){
  localStorage.removeItem(KLING_RESULT_KEY);
}

function updateKlingShowButtons(){
  const hasResult = !!loadKlingResult();
  document.querySelectorAll('.kling-show-btn').forEach(btn => {
    btn.style.display = hasResult ? 'inline-flex' : 'none';
  });
}

function showPendingKlingResults(){
  const data = loadKlingResult();
  if(!data || !Array.isArray(data.urls) || data.urls.length === 0){
    toast('لا توجد نتيجة Kling جاهزة للعرض','info');
    return;
  }
  const activePanel = document.querySelector('#page-kling .gs-content.active');
  let targetId = 'kling-results';
  if(activePanel?.id === 'ks-content-image') targetId = 'kling-results-image';
  if(activePanel?.id === 'ks-content-motion') targetId = 'kling-results-motion';
  if(activePanel?.id === 'ks-content-avatar') targetId = 'kling-results-avatar';
  data.urls.forEach(url => addResultItem(targetId, url, true, data.prompt || ''));
  clearKlingResult();
  updateKlingShowButtons();
}

function applyBrandLabels(){
  const tabT2P = document.getElementById('tab-t2p');
  if(tabT2P) tabT2P.textContent = '✨ Text → Image';
  const t2pHead = document.querySelector('#tc-t2p .card-head');
  if(t2pHead) t2pHead.textContent = '✨ Prompt — Image Description';
  const t2pRef = document.getElementById('dz-t2p-ref');
  if(t2pRef) t2pRef.style.display = 'none';
  const t2pRefInput = document.getElementById('up-t2p-ref');
  if(t2pRefInput) t2pRefInput.style.display = 'none';
  const gveoBtn = document.getElementById('gveo-btn');
  if(gveoBtn) gveoBtn.style.display = 'none';
  const t2vBtn = document.getElementById('t2v-send-btn');
  if(t2vBtn) t2vBtn.style.display = 'none';
}

// ═══════════════════════════
// TOAST NOTIFICATIONS
// ═══════════════════════════
function toast(msg, type='info'){
  const c=document.getElementById('toasts'); if(!c) return;
  const t=document.createElement('div');
  const colors={success:'#2d6a2d',error:'#7a1f1f',info:'#1a3a5c'};
  t.style.cssText=`background:${colors[type]||colors.info};color:#fff;padding:10px 16px;border-radius:8px;font-size:12px;margin-bottom:6px;box-shadow:0 4px 12px rgba(0,0,0,0.4);animation:slideIn 0.2s ease;max-width:300px;word-break:break-word;`;
  t.textContent=msg;
  c.appendChild(t);
  setTimeout(()=>t.remove(),3500);
}

// ═══════════════════════════
// STORY SCENES
// ═══════════════════════════
function addScene(){
  const container=document.getElementById('scenes-container'); if(!container) return;
  const idx=container.children.length+1;
  const div=document.createElement('div');
  div.style.cssText='display:flex;gap:6px;align-items:center;';
  div.innerHTML=`<span style="color:var(--tx3);font-size:11px;min-width:20px;">${idx}.</span><input class="story-scene inp" placeholder="مشهد ${idx}..." style="flex:1;"><button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--tx3);cursor:pointer;font-size:14px;">✕</button>`;
  container.appendChild(div);
}

// ═══════════════════════════
// NAVIGATION
// ═══════════════════════════
const pageTitlesEn = {dash:'DISCOVER',pricing:'PRICING',video:'VIDEO GENERATION',image:'IMAGE EDITING','image-tools':'IMAGE TOOLS',transitions:'TRANSITIONS LAB',nano:'NANO BANANA',google:'GOOGLE STUDIO',kling:'KLING STUDIO',eleven:'ELEVENLABS STUDIO',prompt:'PROMPT STUDIO',gallery:'GALLERY',library:'LIBRARY',control:'CONTROL PANEL',model:'MODEL',suno:'SUNO',sora2:'SORA 2',hailuo:'HAILUO 2.3',gpt54:'GPT-5.2',grok:'GROK',infinitalk:'INFINITALK',qwen2:'QWEN 2','ideogram-reframe':'IDEOGRAM V3 REFRAME',seedream45:'SEEDREAM 4.5',seedance15:'SEEDANCE 1.5',wan26:'WAN 2.6',flux2:'FLUX 2',fluxkontext:'FLUX KONTEXT',zimage:'Z-IMAGE'};
const pageTitlesAr = {dash:'اكتشف مالجديد',pricing:'التسعير',video:'توليد الفيديو',image:'تعديل الصور','image-tools':'أدوات الصور',transitions:'مختبر الانتقالات',nano:'Nano Banana',google:'Google Studio',kling:'Kling Studio',eleven:'ElevenLabs Studio',prompt:'توليد البرومبت',gallery:'المعرض',library:'مكتبة الأعمال',control:'لوحة التحكم',model:'الموديل',suno:'Suno',sora2:'Sora 2',hailuo:'Hailuo 2.3',gpt54:'GPT-5.2',grok:'Grok',infinitalk:'Infinitalk',qwen2:'Qwen2','ideogram-reframe':'Ideogram V3 Reframe',seedream45:'Seedream 4.5',seedance15:'Seedance 1.5',wan26:'Wan 2.6',flux2:'FLUX 2',fluxkontext:'Flux Kontext',zimage:'Z-Image'};
const LANG_KEY='saad_lang';
let currentLang = localStorage.getItem(LANG_KEY) || 'ar';
let currentPage = 'dash';
function getPageTitle(name){
  return (currentLang === 'en' ? pageTitlesEn : pageTitlesAr)[name] || name;
}
function setLegalTab(tab, btn){
  document.querySelectorAll('#page-legal .legal-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('#page-legal .legal-section').forEach(s=>s.classList.remove('active'));
  if(btn) btn.classList.add('active');
  const el = document.getElementById('legal-'+tab);
  if(el) el.classList.add('active');
}

// Multi-page URL mapping for cross-page navigation
const PAGE_URL_MAP = {
  'dash': '/', 'pricing': '/?page=pricing', 'model': '/?page=model',
  'user-dashboard': '/account?page=user-dashboard', 'billing': '/account?page=billing',
  'control': '/account?page=control',
  'nano': '/nano', 'google': '/google', 'kling': '/kling', 'eleven': '/eleven',
  'cinema': '/cinema', 'prompt': '/prompt', 'prompt-legacy': '/prompt?page=prompt-legacy',
  'gallery': '/gallery', 'library': '/library', 'legal': '/legal',
  'transitions': '/transitions', 'image-tools': '/image-tools',
  'sora2': '/sora2', 'gpt54': '/gpt54', 'hailuo': '/hailuo', 'grok': '/grok',
  'seedream45': '/seedream', 'flux2': '/flux2', 'zimage': '/zimage', 'wan26': '/wan26',
  'seedance15': '/seedance', 'fluxkontext': '/fluxkontext',
  'ideogram-reframe': '/ideogram-reframe', 'infinitalk': '/infinitalk',
  'qwen2': '/qwen2', 'suno': '/suno',
};

function showPage(name, el) {
  // Multi-page: if target page div doesn't exist in current document, navigate
  const targetEl = document.getElementById('page-'+name);
  if (!targetEl) {
    const url = PAGE_URL_MAP[name] || ('/' + name);
    window.location.href = url;
    return;
  }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  targetEl.classList.add('active');
  // Highlight nav item matching this page
  const navFromPage = Array.from(document.querySelectorAll('.nav-item')).find(item => {
    const oc = item.getAttribute('onclick') || '';
    return oc.includes("showPage('" + name + "'") || oc.includes("'" + name + ".html'");
  });
  (el || navFromPage)?.classList.add('active');
  if(name === 'model' && !navFromPage && !el){
    document.querySelectorAll('.nav-item')[0]?.classList.add('active');
  }
  currentPage = name;
  const titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.textContent = getPageTitle(name);
  // Only show gs-billing panels that are NOT the admin credits bar
  document.querySelectorAll('.gs-billing:not(#user-credits-bar)').forEach(billing => {
    billing.style.display = (name === 'dash' || name === 'pricing') ? 'none' : 'grid';
  });
  if(name==='gallery') { try{ renderGallery(); }catch(e){} }
  if(name==='library') { try{ renderLibrary(); }catch(e){} }
  if(name==='kling') { try{ loadKieCredits(); }catch(e){} }
  if(name==='eleven') { try{ loadElevenCredits(); }catch(e){} }
  if(name==='nano') { try{ setNanoTab(loadUiState().nanoTab || 'nanopro'); }catch(e){} }
  if(name==='google') { try{ const _gt=loadUiState().googleTab; setGoogleTab((!_gt||['nano','nano2','nanopro'].includes(_gt))?'veo3':_gt); }catch(e){} }
  if(name==='dash'){
    const dashCount = document.getElementById('dashGenCount');
    if(dashCount) dashCount.textContent = S.gallery.length;
  }
  if(name==='user-dashboard') { try{ loadUserDashboard(); }catch(e){ console.error(e); } }
  if(name==='billing')        { try{ loadBillingPage();   }catch(e){ console.error(e); } }
  applyLanguage(currentLang, true);
  saveUiState({ page: name });
}

// Multi-page: highlight the correct sidebar nav item based on current URL
function syncSidebarActiveNav() {
  const loc = window.location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
  document.querySelectorAll('.nav-item').forEach(item => {
    const oc = item.getAttribute('onclick') || '';
    const match = oc.match(/href='([^']+)'/);
    if (match) {
      const href = match[1].replace(/\.html$/, '').replace(/\/$/, '') || '/';
      item.classList.toggle('active', href === loc);
    }
  });
}
const tabMap={'tab-clothes':'tc-clothes','tab-edit':'tc-edit','tab-scene':'tc-scene','tab-story':'tc-story','tab-t2p':'tc-t2p'};
function setTab(id){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.getElementById(tabMap[id]).classList.add('active');
}

function setNanoTab(name){
  document.querySelectorAll('#page-nano .ns-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('#page-nano .gs-content').forEach(p=>p.classList.remove('active'));
  const tab = document.getElementById(`ns-tab-${name}`);
  const panel = document.getElementById(`gs-content-${name}`);
  const titles = {nano:'Nano Banana',nano2:'Nano Banana 2',nanopro:'Nano Banana Pro'};
  const subtitles = {nano:'وضع سريع للتوليد أو التعديل البسيط.',nano2:'التوليد/التعديل الأقوى للصور.',nanopro:'أعلى جودة للصورة والإخراج.'};
  tab?.classList.add('active');
  panel?.classList.add('active');
  const titleEl = document.getElementById('nano-current-title');
  const subEl = document.getElementById('nano-current-sub');
  if(titleEl) titleEl.textContent = titles[name] || 'Nano Banana';
  if(subEl) subEl.textContent = subtitles[name] || '';
  syncGbarModel(name);
  saveUiState({ nanoTab: name });
  refreshNanoCost();
}

function setGoogleTab(name){
  if(name === 'nano' || name === 'nano2' || name === 'nanopro'){ setNanoTab(name); return; }
  document.querySelectorAll('#page-google .gs-tab, #page-google .sora-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('#page-google .gs-content').forEach(p=>p.classList.remove('active'));
  const tab = document.getElementById(`gs-tab-${name}`);
  const panel = document.getElementById(`gs-content-${name}`);
  const titles = {
    veo3:'Veo 3',
    tts:'Google TTS',
    audio:'Audio Lab',
    prompt:'Gemini Prompt Lab'
  };
  const subtitles = {
    veo3:'توليد الفيديو من Google.',
    tts:'تحويل النص إلى صوت.',
    audio:'تحليل الملفات الصوتية وتفريغها.',
    prompt:'كتابة برومبتات Gemini الجاهزة.'
  };
  tab?.classList.add('active');
  panel?.classList.add('active');
  const titleEl = document.getElementById('g-current-title');
  const subEl = document.getElementById('g-current-sub');
  if(titleEl) titleEl.textContent = titles[name] || 'Google Studio';
  if(subEl) subEl.textContent = subtitles[name] || '';
  saveUiState({ googleTab: name });
}

function setKlingTab(name){
  // deactivate all tabs (support both gs-tab and sora-tab classes in Kling)
  document.querySelectorAll('#page-kling .gs-tab, #page-kling .sora-tab').forEach(t=>t.classList.remove('active'));
  // hide all Kling gs-content panels
  document.querySelectorAll('#page-kling .gs-content').forEach(p=>{
    p.classList.remove('active');
    p.style.display = 'none';
  });
  const tab = document.getElementById(`ks-tab-${name}`);
  const panel = document.getElementById(`ks-content-${name}`);
  const titles = {
    text:'Kling Text to Video',
    image:'Kling Image to Video',
    motion:'Kling Motion Control',
    avatar:'Kling AI Avatar'
  };
  const subtitles = {
    text:'Generate a video directly from text using Kling.',
    image:'Upload a still image, then animate it with Kling.',
    motion:'Drive a character image using a reference motion video.',
    avatar:'Create a talking avatar from one image and one audio clip.'
  };
  tab?.classList.add('active');
  if(panel){
    panel.classList.add('active');
    panel.style.display = 'flex';
  }
  const titleEl = document.getElementById('kling-current-title');
  const subEl = document.getElementById('kling-current-sub');
  if(titleEl) titleEl.textContent = titles[name] || 'Kling Studio';
  if(subEl) subEl.textContent = subtitles[name] || '';
  saveUiState({ klingTab: name });
}

function setKieSuite(name){
  const hasImagePanel = !!document.getElementById('kie-suite-image');
  const safeName = (name === 'image' && !hasImagePanel) ? 'video' : name;
  document.querySelectorAll('[id^="kie-suite-tab-"]').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.kie-suite-panel').forEach(p=>p.classList.remove('active'));
  document.getElementById(`kie-suite-tab-${safeName}`)?.classList.add('active');
  document.getElementById(`kie-suite-${safeName}`)?.classList.add('active');
  if(safeName === 'video'){
    setKlingTab(document.getElementById('ks-tab-image')?.classList.contains('active') ? 'image' : (document.getElementById('ks-tab-motion')?.classList.contains('active') ? 'motion' : 'text'));
  } else if(hasImagePanel){
    setKieImageTab(document.getElementById('ki-tab-upscale')?.classList.contains('active') ? 'upscale' : 'removebg');
  }
  saveUiState({ kieSuite: safeName });
}

function setKieImageTab(name){
  document.querySelectorAll('[id^="ki-tab-"]').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('[id^="ki-content-"]').forEach(p=>p.classList.remove('active'));
  document.getElementById(`ki-tab-${name}`)?.classList.add('active');
  document.getElementById(`ki-content-${name}`)?.classList.add('active');
  const isKlingActive = document.getElementById('page-kling')?.classList.contains('active');
  const titleEl = isKlingActive ? document.getElementById('kling-current-title') : null;
  const subEl = isKlingActive ? document.getElementById('kling-current-sub') : null;
  if(name === 'upscale'){
    if(titleEl) titleEl.textContent = 'Topaz Image Upscale';
    if(subEl) subEl.textContent = 'Upscale still images through the official topaz/image-upscale model.';
    syncKieToolLabel(document.getElementById('kie-upscale-model')?.value || 'topaz/image-upscale');
  } else {
    if(titleEl) titleEl.textContent = 'Recraft Remove Background';
    if(subEl) subEl.textContent = 'Remove image backgrounds using the official recraft/remove-background model.';
    syncKieToolLabel(document.getElementById('kie-removebg-model')?.value || 'recraft/remove-background');
  }
  saveUiState({ kieImageTab: name });
}

const MODEL_LIBRARY = {
  'suno': {
    title: 'Suno',
    tag: 'Text to Music',
    desc: 'توليد موسيقى احترافية من النصوص مع أداء غني ومؤثرات ديناميكية.',
    status: 'الحالة: قيد الربط',
    image: '/assets/market-w/hero-suno.jpg'
  },
  'grok': {
    title: 'Grok Imagine',
    tag: 'Image Gen',
    desc: 'توليد صور خيالية بأسلوب مختلف وتناسق أعلى.',
    status: 'الحالة: قيد الربط',
    image: '/assets/market-w/hero-grok.jpg'
  },
  'sora-2': {
    title: 'Sora 2',
    tag: 'Text to Video',
    desc: 'سرد بصري عالي الجودة وتحكم أفضل بالمشهد.',
    status: 'الحالة: قيد الربط',
    image: '/assets/market-w/hero-sora2.jpg'
  },
  'hailuo': {
    title: 'Hailuo 2.3',
    tag: 'Video Gen',
    desc: 'تحويل النص أو الصورة إلى فيديو سريع بجودة واضحة.',
    status: 'الحالة: قيد الربط',
    image: '/assets/market-w/hero-hailuo.jpg'
  },
  'gpt-54': {
    title: 'GPT-5.2',
    tag: 'Chat / Multimodal',
    desc: 'محادثة وذكاء متعدد الوسائط للأفكار والتحليل والكتابة.',
    status: 'الحالة: قيد الربط',
    image: '/assets/market-w/hero-gpt52.jpg'
  },
  'seedream-45': {
    title: 'Seedream 4.5',
    tag: 'Image Gen',
    desc: 'مولد صور واقعي من ByteDance بجودة عالية وإخراج سينمائي.',
    status: 'الحالة: قيد الربط',
    image: '/assets/market-w/hero-seedream45.jpg'
  },
  'flux-2': {
    title: 'FLUX.2',
    tag: 'Text / Image to Image',
    desc: 'نموذج FLUX 2 لتوليد صور دقيقة من النصوص أو الصور.',
    status: 'الحالة: قيد الربط',
    image: '/assets/market-w/hero-flux2.jpg'
  },
  'z-image': {
    title: 'Z-Image',
    tag: 'Image Gen',
    desc: 'توليد صور فوتوريالية بسرعة عالية مع أسلوب متوازن.',
    status: 'الحالة: قيد الربط',
    image: '/assets/market-w/hero-zimage.jpg'
  },
  'wan-26': {
    title: 'Wan 2.6',
    tag: 'Video Gen',
    desc: 'فيديوهات من النص أو الصورة بجودة واضحة وحركة سلسة.',
    status: 'الحالة: قيد الربط',
    image: '/assets/market-w/hero-wan26.jpg'
  },
  'seedance-15-pro': {
    title: 'Seedance 1.5 Pro',
    tag: 'Text / Image to Video',
    desc: 'فيديوهات سينمائية مع حركات واقعية وتماسك بصري.',
    status: 'الحالة: قيد الربط',
    image: '/assets/market-w/hero-seedance15.png'
  },
  'flux-kontext': {
    title: 'Flux Kontext',
    tag: 'Image Gen',
    desc: 'توليد صور بسياق محسن وفهم أفضل للتفاصيل.',
    status: 'الحالة: قيد الربط',
    image: '/assets/market-w/hero-flux-kontext.png'
  },
  'ideogram-v3-reframe': {
    title: 'Ideogram V3 Reframe',
    tag: 'Image to Image',
    desc: 'إعادة تأطير الصورة وتوليد نسخة جديدة مع الحفاظ على الهوية.',
    status: 'الحالة: قيد الربط',
    image: '/assets/market-w/hero-ideogram-reframe.png'
  },
  'infinitalk-lipsync': {
    title: 'Infinitalk Lip Sync',
    tag: 'Speech / Lip Sync',
    desc: 'مزامنة الشفاه وتحويل الصوت إلى حركة وجه احترافية.',
    status: 'الحالة: قيد الربط',
    image: '/assets/market-w/hero-infinitalk.jpg'
  },
  'qwen2-image-edit': {
    title: 'Qwen2 Image Edit',
    tag: 'Image Edit',
    desc: 'تحرير الصور بالنصوص مع إخراج واقعي وخيارات نسب متعددة.',
    status: 'الحالة: قيد الربط',
    image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80'
  },
  'qwen2-text-to-image': {
    title: 'Qwen2 Text To Image',
    tag: 'Text to Image',
    desc: 'توليد صور واقعية من النص مع دعم نسب متعددة وإخراج بجودة عالية.',
    status: 'الحالة: قيد الربط',
    image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80'
  },
  'ideogram-character': {
    title: 'Ideogram Character',
    tag: 'Character',
    desc: 'تثبيت شخصية وإعادة توظيفها بصرياً عبر المشاهد.',
    status: 'الحالة: قيد الربط',
    image: '/assets/market-w/hero-ideogram-character.jpg'
  }
};

let marketHeroIndex = 0;
let marketHeroTimer = null;
function setMarketHero(index){
  const slides = Array.from(document.querySelectorAll('.market-hero-slide'));
  const dots = Array.from(document.querySelectorAll('.market-dot'));
  if(slides.length === 0) return;
  marketHeroIndex = (index + slides.length) % slides.length;
  slides.forEach((slide, i)=> slide.classList.toggle('active', i === marketHeroIndex));
  dots.forEach((dot, i)=> dot.classList.toggle('active', i === marketHeroIndex));
}

function marketNext(){ setMarketHero(marketHeroIndex + 1); }
function marketPrev(){ setMarketHero(marketHeroIndex - 1); }
function initMarketHero(){
  setMarketHero(0);
  if(marketHeroTimer) clearInterval(marketHeroTimer);
  marketHeroTimer = setInterval(marketNext, 10000);
}

async function loadHomepageData(){
  try {
    const res = await fetch('/api/homepage-data');
    if(!res.ok) return;
    const data = await res.json();

    // Header
    const titleEl = document.getElementById('dash-ph-title');
    const subEl   = document.getElementById('dash-ph-sub');
    if(titleEl && data.header?.title) titleEl.textContent = data.header.title;
    if(subEl   && data.header?.subtitle) subEl.textContent = data.header.subtitle;

    // Slides
    const heroC = document.getElementById('market-hero-container');
    if(heroC && data.slides?.length){
      let html = '';
      data.slides.forEach((s, i) => {
        html += `<div class="market-hero-slide${i===0?' active':''}" style="background-image:url('${s.image}')" onclick="window.location.href='${s.link}'">
          <div class="market-hero-content">
            <span class="market-hero-tag">${s.tag}</span>
            <h2 class="market-hero-title">${s.title}</h2>
            <p class="market-hero-desc">${s.desc}</p>
            <button class="market-hero-btn" onclick="event.stopPropagation();window.location.href='${s.link}'">جرب الآن</button>
          </div>
        </div>`;
      });
      html += `<button class="market-nav market-prev" onclick="event.stopPropagation();marketPrev()">&#10094;</button>`;
      html += `<button class="market-nav market-next" onclick="event.stopPropagation();marketNext()">&#10095;</button>`;
      html += `<div class="market-dots">`;
      data.slides.forEach((_, i) => {
        html += `<span class="market-dot${i===0?' active':''}" onclick="event.stopPropagation();setMarketHero(${i})"></span>`;
      });
      html += `</div>`;
      heroC.innerHTML = html;
    }

    // Model cards
    const gridC = document.getElementById('market-grid-container');
    if(gridC && data.models?.length){
      let html = '';
      data.models.forEach(m => {
        html += `<div class="market-card" style="--card-bg:url('${m.image}')" onclick="window.location.href='${m.link}'">
          <div class="market-card-content">
            <div class="market-pill">${m.pill}</div>
            <div class="market-card-title">${m.title}</div>
            <div class="market-card-sub">${m.sub}</div>
          </div>
        </div>`;
      });
      gridC.innerHTML = html;
    }

    initMarketHero();
  } catch(e){ console.warn('loadHomepageData error', e); }
}

function setModelPage(key){
  const info = MODEL_LIBRARY[key] || { title: key, tag: 'Model', desc: 'تفاصيل هذا الموديل غير متوفرة حالياً.', status: 'الحالة: غير معروفة', image: '' };
  const titleEl = document.getElementById('model-page-title');
  const subEl = document.getElementById('model-page-sub');
  const tagEl = document.getElementById('model-page-tag');
  const nameEl = document.getElementById('model-page-name');
  const descEl = document.getElementById('model-page-desc');
  const statusEl = document.getElementById('model-page-status');
  const heroEl = document.getElementById('model-page-hero');
  const actionEl = document.getElementById('model-page-action');
  if(titleEl) titleEl.textContent = info.title || 'MODEL';
  if(subEl) subEl.textContent = 'صفحة حالة وربط الموديل';
  if(tagEl) tagEl.textContent = info.tag || 'Model';
  if(nameEl) nameEl.textContent = info.title || 'Model';
  if(descEl) descEl.textContent = info.desc || '';
  if(statusEl) statusEl.textContent = info.status || '';
  if(heroEl && info.image) heroEl.style.backgroundImage = `url('${info.image}')`;
  if(actionEl){
    actionEl.style.display = 'none';
    actionEl.removeAttribute('data-key');
  }
  saveUiState({ modelKey: key });
  const pageTitleEl = document.getElementById('pageTitle');
  if(pageTitleEl && info.title) pageTitleEl.textContent = info.title;
}

function openModel(key){
  if(key === 'nano-pro'){
    showPage('nano');
    setNanoTab('nanopro');
    return;
  }
  if(key === 'veo-31'){
    showPage('google');
    setGoogleTab('veo3');
    return;
  }
  if(key === 'kling'){
    showPage('kling');
    setKieSuite('video');
    setKlingTab('text');
    return;
  }
  if(key === 'topaz-upscale'){
    showPage('image-tools');
    setKieImageTab('upscale');
    return;
  }
  if(key === 'suno'){
    showPage('eleven');
    setElevenTab('music');
    return;
  }
  if(key === 'sora-2'){
    showPage('sora2');
    return;
  }
  if(key === 'gpt-54'){
    showPage('gpt54');
    return;
  }
  if(key === 'hailuo'){
    showPage('hailuo');
    return;
  }
  if(key === 'grok'){
    showPage('grok');
    return;
  }
  if(key === 'ideogram-v3-reframe'){
    showPage('ideogram-reframe');
    return;
  }
  if(key === 'infinitalk-lipsync'){
    showPage('infinitalk');
    return;
  }
  if(key === 'seedream-45'){
    showPage('seedream45');
    return;
  }
  if(key === 'seedance-15-pro'){
    showPage('seedance15');
    return;
  }
  if(key === 'flux-2'){
    showPage('flux2');
    return;
  }
  if(key === 'flux-kontext'){
    showPage('fluxkontext');
    return;
  }
  if(key === 'z-image'){
    showPage('zimage');
    return;
  }
  if(key === 'wan-26'){
    showPage('wan26');
    return;
  }
  if(key === 'wan-22-speech'){
    showPage('wan26');
    selectWanModel('wan/2-2-a14b-speech-to-video-turbo');
    return;
  }
  if(key === 'qwen2' || key === 'qwen2-image-edit'){
    showPage('qwen2');
    selectQwen2Model('qwen2/image-edit');
    return;
  }
  if(key === 'qwen2-text-to-image'){
    showPage('qwen2');
    selectQwen2Model('qwen2/text-to-image');
    return;
  }
  showPage('model');
  setModelPage(key);
}

function openModelAction(){
  const btn = document.getElementById('model-page-action');
  const key = btn?.getAttribute('data-key');
  if(key) openModel(key);
}

const SORA_MODEL_INFO = {
  'sora-2-image-to-video': { label:'Sora 2 Image To Video', requiresImage:true, enabled:true },
  'sora-2-text-to-video': { label:'Sora 2 Text To Video', requiresImage:false, enabled:true },
  'sora-2-pro-image-to-video': { label:'Sora 2 Image To Video Stable', requiresImage:true, enabled:true },
  'sora-2-pro-text-to-video': { label:'Sora 2 Text To Video Stable', requiresImage:false, enabled:true },
  'sora-2-pro-storyboard': { label:'Sora 2 Pro Storyboard', requiresImage:false, enabled:true, storyboard:true },
  'sora-2-characters-pro': { label:'Sora 2 Characters Pro', requiresImage:false, enabled:true, characters:true },
  'sora-watermark-remover': { label:'Sora Watermark Remover', requiresImage:false, enabled:true, watermark:true }
};

const SEEDREAM_MODEL_INFO = {
  'seedream/4.5-text-to-image': {
    label:'Seedream 4.5 Text To Image',
    tag:'Text to Image',
    sub:'اكتب وصف الصورة وحدد النسبة والجودة.',
    requiresImage:false
  },
  'seedream/4.5-edit': {
    label:'Seedream 4.5 Edit',
    tag:'Image Edit',
    sub:'ارفع صورة مرجعية ثم اكتب التعديل المطلوب.',
    requiresImage:true
  }
};

function selectSeedreamModel(key){
  const info = SEEDREAM_MODEL_INFO[key] || SEEDREAM_MODEL_INFO['seedream/4.5-text-to-image'];
  document.querySelectorAll('.seedream-tab').forEach(tab => tab.classList.remove('active'));
  const tab = document.getElementById(`seedream-tab-${key.replaceAll('/','-')}`);
  if(tab) tab.classList.add('active');
  const label = document.getElementById('seedream-model-chip');
  if(label) label.textContent = info.label;
  const select = document.getElementById('seedream-model');
  if(select) select.value = key;
  saveUiState({ seedreamModel: key });
  updateSeedreamFields();
}

function updateSeedreamFields(){
  const model = document.getElementById('seedream-model')?.value || 'seedream/4.5-text-to-image';
  const info = SEEDREAM_MODEL_INFO[model] || SEEDREAM_MODEL_INFO['seedream/4.5-text-to-image'];
  const tagEl = document.getElementById('seedream-hero-tag');
  const subEl = document.getElementById('seedream-hero-sub');
  if(tagEl) tagEl.textContent = info.tag;
  if(subEl) subEl.textContent = info.sub;
  const imageField = document.getElementById('seedream-image-field');
  if(imageField) imageField.style.display = info.requiresImage ? 'block' : 'none';
}

const WAN_MODEL_INFO = {
  'wan/2-6-text-to-video': {
    label: 'Wan 2.6 Text To Video',
    tag: 'Text to Video',
    sub: 'اكتب وصف الفيديو وحدد المدة والدقة، وسيظهر الإخراج في نفس الصفحة.'
  },
  'wan/2-6-image-to-video': {
    label: 'Wan 2.6 Image To Video',
    tag: 'Image to Video',
    sub: 'ارفع صورة مرجعية ثم اكتب وصف الحركة وحدد المدة والدقة.'
  },
  'wan/2-6-video-to-video': {
    label: 'Wan 2.6 Video To Video',
    tag: 'Video to Video',
    sub: 'ارفع فيديو مرجعي وحدد التحويل المطلوب.'
  },
  'wan/2-2-a14b-speech-to-video-turbo': {
    label: 'Wan 2.2 Speech To Video Turbo',
    tag: 'Speech to Video',
    sub: 'ارفع صورة وصوت وحدد الإعدادات التفصيلية لإخراج فيديو متزامن مع الصوت.'
  }
};

const FLUX2_MODEL_INFO = {
  'flux-2/pro-image-to-image': {
    label: 'Flux 2 Pro Image To Image',
    tag: 'Image to Image',
    sub: 'ارفع 1-8 صور مرجعية ثم اكتب التعديل المطلوب.',
    requiresImages: true
  },
  'flux-2/flex-image-to-image': {
    label: 'Flux 2 Flex Image To Image',
    tag: 'Image to Image',
    sub: 'ارفع صور مرجعية متعددة مع نص التعديل.',
    requiresImages: true
  },
  'flux-2/flex-text-to-image': {
    label: 'Flux 2 Flex Text To Image',
    tag: 'Text to Image',
    sub: 'اكتب الوصف وحدد النسبة والدقة.',
    requiresImages: false
  },
  'flux-2/pro-text-to-image': {
    label: 'Flux 2 Pro Text To Image',
    tag: 'Text to Image',
    sub: 'توليد صور عالية الدقة بدون صور مرجعية.',
    requiresImages: false
  }
};

function selectWanModel(key){
  const info = WAN_MODEL_INFO[key] || WAN_MODEL_INFO['wan/2-6-text-to-video'];
  document.querySelectorAll('#page-wan26 .sora-tab').forEach(tab => tab.classList.remove('active'));
  const tab = document.getElementById(`wan-tab-${key.replaceAll('/','-')}`);
  if(tab) tab.classList.add('active');
  const select = document.getElementById('wan-model');
  if(select) select.value = key;
  const chip = document.getElementById('wan-model-chip');
  if(chip) chip.textContent = key;
  const tag = document.getElementById('wan-hero-tag');
  const sub = document.getElementById('wan-hero-sub');
  const title = document.getElementById('wan-hero-title');
  if(tag) tag.textContent = info.tag;
  if(sub) sub.textContent = info.sub;
  if(title) title.textContent = info.label || 'Wan';
  const imageField = document.getElementById('wan-image-field');
  if(imageField) imageField.style.display = key === 'wan/2-6-image-to-video' ? 'block' : 'none';
  const videoField = document.getElementById('wan-video-field');
  if(videoField) videoField.style.display = key === 'wan/2-6-video-to-video' ? 'block' : 'none';
  const speechField = document.getElementById('wan-speech-field');
  const speechParams = document.getElementById('wan-speech-params');
  const control26 = document.getElementById('wan-control-26');
  const isSpeech = key === 'wan/2-2-a14b-speech-to-video-turbo';
  if(speechField) speechField.style.display = isSpeech ? 'block' : 'none';
  if(speechParams) speechParams.style.display = isSpeech ? 'block' : 'none';
  if(control26) control26.style.display = isSpeech ? 'none' : 'block';
  if(isSpeech){
    if(imageField) imageField.style.display = 'none';
    if(videoField) videoField.style.display = 'none';
  } else {
    const durationSelect = document.getElementById('wan-duration');
    if(durationSelect){
      const allowed = key === 'wan/2-6-video-to-video' ? ['5','10'] : ['5','10','15'];
      const current = durationSelect.value || allowed[0];
      durationSelect.innerHTML = allowed.map(v => `<option value="${v}">${v}s</option>`).join('');
      durationSelect.value = allowed.includes(current) ? current : allowed[0];
    }
  }
  saveUiState({ wanModel: key });
}

function selectFlux2Model(key){
  const info = FLUX2_MODEL_INFO[key] || FLUX2_MODEL_INFO['flux-2/pro-image-to-image'];
  document.querySelectorAll('#page-flux2 .sora-tab').forEach(tab => tab.classList.remove('active'));
  const tab = document.getElementById(`flux2-tab-${key.replaceAll('/','-')}`);
  if(tab) tab.classList.add('active');
  const select = document.getElementById('flux2-model');
  if(select) select.value = key;
  const chip = document.getElementById('flux2-model-chip');
  if(chip) chip.textContent = key;
  const tag = document.getElementById('flux2-hero-tag');
  const sub = document.getElementById('flux2-hero-sub');
  if(tag) tag.textContent = info.tag;
  if(sub) sub.textContent = info.sub;
  const imageField = document.getElementById('flux2-image-field');
  if(imageField) imageField.style.display = info.requiresImages ? 'block' : 'none';
  saveUiState({ flux2Model: key });
  refreshFlux2Cost();
}

function refreshFlux2Cost(){
  const model = document.getElementById('flux2-model')?.value || 'flux-2/pro-image-to-image';
  updateCostPreview('flux2-cost-val', applyProfitMargin(calcCreditCost(model)));
}

function selectFluxKontextMode(mode){
  const isEdit = mode === 'edit';
  document.getElementById('fk-tab-text')?.classList.toggle('active', !isEdit);
  document.getElementById('fk-tab-edit')?.classList.toggle('active', isEdit);
  const tag = document.getElementById('fk-hero-tag');
  const sub = document.getElementById('fk-hero-sub');
  if(tag) tag.textContent = isEdit ? 'Image Edit' : 'Text to Image';
  if(sub) sub.textContent = isEdit
    ? 'ارفع صورة مرجعية ثم اكتب التعديل المطلوب.'
    : 'اكتب الوصف باللغة الإنجليزية أو فعّل الترجمة التلقائية.';
  const imageField = document.getElementById('fk-image-field');
  if(imageField) imageField.style.display = isEdit ? 'block' : 'none';
  const safetySelect = document.getElementById('fk-safety');
  if(safetySelect){
    const allowed = isEdit ? ['0','1','2'] : ['0','1','2','3','4','5','6'];
    const current = safetySelect.value || allowed[0];
    safetySelect.innerHTML = allowed.map(v => `<option value="${v}">${v}</option>`).join('');
    safetySelect.value = allowed.includes(current) ? current : allowed[0];
  }
  const ratioSelect = document.getElementById('fk-ratio');
  if(ratioSelect){
    const baseOptions = [
      { value: '21:9', label: '21:9' },
      { value: '16:9', label: '16:9' },
      { value: '4:3', label: '4:3' },
      { value: '1:1', label: '1:1' },
      { value: '3:4', label: '3:4' },
      { value: '9:16', label: '9:16' }
    ];
    const options = isEdit
      ? [{ value: '', label: 'Auto (Keep Original)' }, ...baseOptions]
      : baseOptions;
    const current = ratioSelect.value || '';
    ratioSelect.innerHTML = options.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('');
    const next = !isEdit && !current ? '16:9' : current;
    ratioSelect.value = options.some(opt => opt.value === next) ? next : options[0].value;
  }
  saveUiState({ fluxKontextMode: mode });
}

const QWEN2_MODEL_INFO = {
  'qwen2/text-to-image': {
    tag:'Text to Image',
    sub:'اكتب الوصف وحدد النسبة وسيتم توليد الصورة فوراً.',
    requiresImage:false
  },
  'qwen2/image-edit': {
    tag:'Image Edit',
    sub:'ارفع صورة مرجعية ثم اكتب التعديل المطلوب، وستظهر النتيجة بنفس الصفحة.',
    requiresImage:true
  }
};

function selectQwen2Model(key){
  const info = QWEN2_MODEL_INFO[key] || QWEN2_MODEL_INFO['qwen2/text-to-image'];
  document.querySelectorAll('#page-qwen2 .seedream-tab').forEach(tab => tab.classList.remove('active'));
  const tab = document.getElementById(`qwen2-tab-${key.replaceAll('/','-')}`);
  if(tab) tab.classList.add('active');
  const input = document.getElementById('qwen2-model');
  const chip = document.getElementById('qwen2-model-chip');
  if(input) input.value = key;
  if(chip) chip.textContent = key;
  const tag = document.getElementById('qwen2-hero-tag');
  const sub = document.getElementById('qwen2-hero-sub');
  if(tag) tag.textContent = info.tag;
  if(sub) sub.textContent = info.sub;
  const imageField = document.getElementById('qwen2-image-field');
  if(imageField) imageField.style.display = info.requiresImage ? 'block' : 'none';
  saveUiState({ qwen2Model: key });
}

// ── Qwen2 Settings Sidebar: button groups + range sliders ──
document.addEventListener('click', function(e){
  const opt = e.target.closest('.qw2-opt');
  if(!opt) return;
  const group = opt.parentElement;
  if(!group || !group.classList.contains('qw2-btn-group')) return;
  group.querySelectorAll('.qw2-opt').forEach(b => b.classList.remove('active'));
  opt.classList.add('active');
  // Sync aspect ratio buttons with the Size select
  if(opt.closest('.field') && opt.closest('.field').querySelector('.flabel')){
    const label = opt.closest('.field').querySelector('.flabel').textContent.trim();
    if(label === 'Aspect Ratio'){
      const sel = document.getElementById('qwen2-size');
      if(sel){ sel.value = opt.textContent.trim(); }
    }
  }
});
// Range slider visual fill
document.querySelectorAll('.qw2-range').forEach(function(r){
  function upd(){ var pct = ((r.value - r.min) / (r.max - r.min)) * 100; r.style.setProperty('--pct', pct + '%'); }
  r.addEventListener('input', upd);
  upd();
});

function selectSoraModel(key){
  const info = SORA_MODEL_INFO[key] || SORA_MODEL_INFO['sora-2-text-to-video'];
  document.querySelectorAll('#page-sora2 .sora-tab').forEach(tab => tab.classList.remove('active'));
  const tab = document.getElementById(`sora-tab-${key}`);
  if(tab) tab.classList.add('active');
  const label = document.getElementById('sora-model-label');
  if(label) label.textContent = info.label;
  const select = document.getElementById('sora-model');
  if(select) select.value = key;
  saveUiState({ soraModel: key });
  updateSoraFields();
}

const GROK_MODEL_INFO = {
  'grok-imagine/text-to-video': {
    label:'Text To Video',
    type:'t2v',
    tag:'Text to Video',
    sub:'اكتب وصف الحركة واختر النسبة والمدة والدقة ونمط الإخراج.',
    promptLabel:'Prompt',
    promptPlaceholder:'Describe the desired motion...'
  },
  'grok-imagine/image-to-video': {
    label:'Image To Video',
    type:'i2v',
    tag:'Image to Video',
    sub:'ارفع صورة مرجعية أو استخدم Task ID من نتائج Grok ثم أضف وصف الحركة.',
    promptLabel:'Prompt (اختياري)',
    promptPlaceholder:'Optional motion description...'
  },
  'grok-imagine/text-to-image': {
    label:'Text To Image',
    type:'t2i',
    tag:'Text to Image',
    sub:'توليد صور متعددة من النص مع اختيار نسبة العرض.',
    promptLabel:'Prompt',
    promptPlaceholder:'Describe the image you want...'
  },
  'grok-imagine/image-to-image': {
    label:'Image To Image',
    type:'i2i',
    tag:'Image to Image',
    sub:'ارفع صورة وامنحها وصفاً جديداً (البرومبت اختياري).',
    promptLabel:'Prompt (اختياري)',
    promptPlaceholder:'Optional style or edit description...'
  },
  'grok-imagine/upscale': {
    label:'Upscale',
    type:'upscale',
    tag:'Upscale',
    sub:'رفع دقة فيديو Grok السابق عبر Task ID فقط.',
    promptLabel:'Prompt',
    promptPlaceholder:''
  }
};

function selectGrokModel(key){
  const info = GROK_MODEL_INFO[key] || GROK_MODEL_INFO['grok-imagine/text-to-video'];
  document.querySelectorAll('.grok-tab').forEach(tab => tab.classList.remove('active'));
  const tabId = `grok-tab-${key.replace(/\//g,'-')}`;
  const tab = document.getElementById(tabId);
  if(tab) tab.classList.add('active');
  const input = document.getElementById('grok-model');
  if(input) input.value = key;
  const chip = document.getElementById('grok-model-chip');
  if(chip) chip.textContent = key;
  const tag = document.getElementById('grok-hero-tag');
  if(tag) tag.textContent = info.tag || 'Grok Imagine';
  const sub = document.getElementById('grok-hero-sub');
  if(sub) sub.textContent = info.sub || '';
  const label = document.getElementById('grok-prompt-label');
  if(label) label.textContent = info.promptLabel || 'Prompt';
  const prompt = document.getElementById('grok-prompt');
  if(prompt) prompt.placeholder = info.promptPlaceholder || '';
  saveUiState({ grokModel: key });
  updateGrokFields();
}

function updateGrokFields(){
  const model = document.getElementById('grok-model')?.value || 'grok-imagine/text-to-video';
  const info = GROK_MODEL_INFO[model] || GROK_MODEL_INFO['grok-imagine/text-to-video'];
  const type = info.type || 't2v';
  const show = (id, on) => { const el = document.getElementById(id); if(el) el.style.display = on ? '' : 'none'; };
  show('grok-field-prompt', type !== 'upscale');
  show('grok-field-image', type === 'i2v' || type === 'i2i');
  show('grok-field-task', type === 'i2v');
  show('grok-field-index', type === 'i2v');
  show('grok-field-upscale-task', type === 'upscale');
  show('grok-field-aspect', type === 't2v' || type === 't2i');
  show('grok-field-mode', type === 't2v' || type === 'i2v');
  show('grok-field-duration', type === 't2v' || type === 'i2v');
  show('grok-field-resolution', type === 't2v' || type === 'i2v');
  setGrokStatus('جاهز للتوليد.');
}

function setHailuoStatus(message, kind='info'){
  const el = document.getElementById('hailuo-status');
  if(!el) return;
  el.textContent = message;
  el.style.color = kind === 'error' ? 'var(--red)' : kind === 'success' ? 'var(--green)' : 'var(--tx2)';
}

function setSoraStatus(message, kind='info'){
  const el = document.getElementById('sora-status');
  if(!el) return;
  el.textContent = message;
  el.style.color = kind === 'error' ? 'var(--red)' : kind === 'success' ? 'var(--green)' : 'var(--tx2)';
}

function addSoraTextResult(resultObject){
  const container = document.getElementById('sora-results');
  if(!container) return;
  const emp = container.querySelector('.result-empty');
  if(emp) emp.remove();
  const item = document.createElement('div');
  item.className = 'result-item';
  item.style.cssText = 'position:relative;border-radius:10px;overflow:hidden;background:#0f1a26;border:1px solid var(--b2);padding:12px;min-height:120px;';
  item.innerHTML = `
    <div style="font-size:11px;color:var(--tx2);margin-bottom:6px;">Character Created</div>
    <div style="font-family:var(--fm);font-size:12px;color:var(--tx);word-break:break-word;">${JSON.stringify(resultObject, null, 2)}</div>
  `;
  container.prepend(item);
}

function updateSoraFields(){
  const model = document.getElementById('sora-model')?.value || 'sora-2-text-to-video';
  const info = SORA_MODEL_INFO[model] || SORA_MODEL_INFO['sora-2-text-to-video'];
  const imageCard = document.getElementById('sora-image-card');
  const promptWrap = document.getElementById('sora-prompt-wrap');
  const storyboardCard = document.getElementById('sora-storyboard-card');
  const characterCard = document.getElementById('sora-character-card');
  const controlsCard = document.getElementById('sora-controls-card');
  const ratioWrap = document.getElementById('sora-ratio-wrap');
  const framesWrap = document.getElementById('sora-frames-wrap');
    const resolutionWrap = document.getElementById('sora-resolution-wrap');
    const watermarkWrap = document.getElementById('sora-watermark-wrap');
    const uploadWrap = document.getElementById('sora-upload-wrap');
    const videoUrlWrap = document.getElementById('sora-video-url-wrap');
  const requiresImage = !!info.requiresImage;
  if(!info.enabled){
    setSoraStatus('هذا الموديل غير مفعّل بعد.','error');
  } else {
    setSoraStatus('جاهز للتوليد.');
  }
  const isWatermark = !!info.watermark;
  if(imageCard) imageCard.style.display = (!isWatermark && (requiresImage || info.storyboard)) ? 'block' : 'none';
  if(promptWrap) promptWrap.style.display = (info.storyboard || info.characters || isWatermark) ? 'none' : '';
  if(storyboardCard) storyboardCard.style.display = info.storyboard ? '' : 'none';
  if(characterCard) characterCard.style.display = info.characters ? '' : 'none';
  if(controlsCard) controlsCard.style.display = info.characters ? 'none' : '';
    if(ratioWrap) ratioWrap.style.display = (info.characters || isWatermark) ? 'none' : '';
    if(framesWrap) framesWrap.style.display = (info.characters || isWatermark) ? 'none' : '';
    if(resolutionWrap) resolutionWrap.style.display = (info.characters || isWatermark) ? 'none' : '';
    if(uploadWrap) uploadWrap.style.display = 'none';
    if(watermarkWrap) watermarkWrap.style.display = 'none';
  if(videoUrlWrap) videoUrlWrap.style.display = isWatermark ? '' : 'none';
  if(info.storyboard) {
    if(!document.querySelector('.sora-shot')) addSoraShot();
  }
}

function addSoraShot(){
  const container = document.getElementById('sora-shots');
  if(!container) return;
  const idx = container.children.length + 1;
  const row = document.createElement('div');
  row.className = 'sora-shot';
  row.style.cssText = 'display:grid;grid-template-columns:80px 1fr 24px;gap:8px;align-items:start;margin-bottom:8px;';
  row.innerHTML = `
    <input class="finput sora-shot-duration" type="number" step="0.5" min="0.5" placeholder="7.5" value="7.5">
    <textarea class="ftextarea sora-shot-scene" rows="2" placeholder="Scene ${idx} description..."></textarea>
    <button class="btn btn-ghost" style="padding:4px 6px;" onclick="this.parentElement.remove()">×</button>
  `;
  container.appendChild(row);
}

function updateHailuoFields(){
  const model = document.getElementById('hailuo-model')?.value || 'hailuo/2-3-image-to-video-pro';
  const isImage = model.includes('image-to-video');
  const imageCard = document.getElementById('hailuo-image-card');
  const settingsCard = document.getElementById('hailuo-settings-card');
  const optimizerWrap = document.getElementById('hailuo-optimizer-wrap');
  if(imageCard) imageCard.style.display = isImage ? 'block' : 'none';
  if(settingsCard) settingsCard.style.display = isImage ? '' : 'none';
  if(optimizerWrap) optimizerWrap.style.display = isImage ? 'none' : '';
}

function isVideoUrl(url){
  return typeof url === 'string' && /\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(url);
}

async function pollHailuoTask(taskId){
  for(let i=0; i<90; i++){
    await wait(5000);
    const r = await fetch(`/api/kie/hailuo/status?taskId=${encodeURIComponent(taskId)}`);
    const d = await r.json();
    if(!r.ok || d.error) throw new Error(extractApiErrorMessage(d, 'تعذر متابعة مهمة Hailuo.'));
    if(d.failed) throw new Error(d.failMsg || `Hailuo task failed: ${d.status || 'failed'}`);
    if(d.done) return d;
    setHailuoStatus(`جاري التوليد... (${d.status || 'processing'})`);
  }
  throw new Error('انتهت المهلة قبل اكتمال Hailuo');
}

async function runHailuo(){
  const _hModel  = document.getElementById('hailuo-model')?.value || 'hailuo/2-3-image-to-video-pro';
  const _hDurSec = Number(document.getElementById('hailuo-duration')?.value || '6');
  const _hResUi  = document.getElementById('hailuo-resolution')?.value || '2K';
  const _hRes    = (_hResUi === '4K') ? '1080P' : '768P';
  const _hCost   = applyProfitMargin(calcCreditCost(_hModel, { duration: _hDurSec, resolution: _hRes }));
  if(!checkPlanAccess(_hModel)) return;
  if(!AUTH.checkCredits(_hCost)) return;
  const btn = document.getElementById('hailuo-btn');
  const original = btn ? btn.textContent : '';
  try{
    const model = document.getElementById('hailuo-model')?.value || 'hailuo/2-3-image-to-video-pro';
    const prompt = (document.getElementById('hailuo-prompt')?.value || '').trim();
    const optimizer = document.getElementById('hailuo-optimizer')?.value || 'true';
    const duration = document.getElementById('hailuo-duration')?.value || '6';
    const resolutionUi = document.getElementById('hailuo-resolution')?.value || '2K';
    const resolution = mapUiResolution(resolutionUi, { '1K':'768P', '2K':'768P', '4K':'768P' }, '768P');
    const file = S.files['dz-hailuo-image'];
    const isImage = model.includes('image-to-video');

    if(!prompt) throw new Error('اكتب وصف الفيديو أولاً');
    if(isImage && !file) throw new Error('ارفع صورة البداية أولاً');

    if(btn){ btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> إرسال إلى Hailuo...'; }
    clearResults('hailuo-results');

    let imageUrl = '';
    if(isImage && file){
      setHailuoStatus('رفع الصورة...');
      imageUrl = await uploadKieBinaryFile(file);
    }

    setHailuoStatus('إنشاء المهمة...');
    const input = isImage
      ? { prompt, image_url: imageUrl, duration, resolution }
      : { prompt, prompt_optimizer: optimizer === 'true' };

    const startResp = await fetch('/api/kie/hailuo/create', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ model, input })
    });
    const startData = await startResp.json();
    if(!startResp.ok || startData.error) throw new Error(extractApiErrorMessage(startData, 'فشل إنشاء مهمة Hailuo.'));
    if(!startData.taskId) throw new Error('لم يتم استلام Task ID من Hailuo');

    setHailuoStatus(`تم إنشاء المهمة: ${startData.taskId}`);
    const finalData = await pollHailuoTask(startData.taskId);
    const urls = Array.isArray(finalData.resultUrls) ? finalData.resultUrls : [];
    if(urls.length === 0) throw new Error('انتهت المهمة بدون روابط نتائج');
    urls.forEach(url => addResultItem('hailuo-results', url, isVideoUrl(url), prompt));
    setHailuoStatus('تم توليد النتائج.','success');
    AUTH.consumeCredits(_hCost);
  } catch(e){
    setHailuoStatus(String(e.message || e).substring(0,160), 'error');
    toast('خطأ: '+String(e.message || e).substring(0,140), 'error');
  } finally {
    if(btn){ btn.disabled = false; btn.textContent = original || 'Generate'; }
  }
}

function clearGpt54Output(){
  const chat = document.getElementById('gpt54-chat');
  if(!chat) return;
  chat.innerHTML = '<div class="gpt-empty">ماذا يخطر ببالك اليوم؟</div>';
}

function setGpt54Status(message, kind='info'){
  const el = document.getElementById('gpt54-status');
  if(!el) return;
  el.textContent = message;
  el.style.color = kind === 'error' ? 'var(--red)' : kind === 'success' ? 'var(--green)' : 'var(--tx3)';
}

function appendGpt54Message(role, text){
  const chat = document.getElementById('gpt54-chat');
  if(!chat) return null;
  const empty = chat.querySelector('.gpt-empty');
  if(empty) empty.remove();
  const msg = document.createElement('div');
  msg.className = `gpt-msg ${role === 'user' ? 'user' : 'assistant'}`;
  msg.innerHTML = `<div class="gpt-msg-role">${role === 'user' ? 'أنت' : 'GPT-5.2'}</div><div class="gpt-msg-text"></div>`;
  const textEl = msg.querySelector('.gpt-msg-text');
  textEl.textContent = text;
  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
  return textEl;
}

function toggleGpt54Menu(){
  const wrap = document.getElementById('gpt54-plus');
  if(!wrap) return;
  wrap.classList.toggle('open');
}

function closeGpt54Menu(){
  const wrap = document.getElementById('gpt54-plus');
  if(wrap) wrap.classList.remove('open');
}

function toggleGpt54ModelMenu(){
  const wrap = document.getElementById('gpt54-model');
  if(!wrap) return;
  wrap.classList.toggle('open');
}

function closeGpt54ModelMenu(){
  const wrap = document.getElementById('gpt54-model');
  if(wrap) wrap.classList.remove('open');
}

function selectGpt54Model(model, label){
  const labelEl = document.getElementById('gpt54-model-label');
  if(labelEl) labelEl.textContent = label || model;
  const titleEl = document.getElementById('gpt54-title');
  if(titleEl) titleEl.textContent = label || model;
  S.gpt54Model = model;
  try{ localStorage.setItem('gpt54-model', model); } catch {}
  const wrap = document.getElementById('gpt54-model');
  if(wrap){
    wrap.querySelectorAll('.gpt-model-item').forEach(btn=>{
      btn.classList.toggle('active', btn.dataset.model === model);
    });
  }
  closeGpt54ModelMenu();
}

function toggleGpt54Settings(){
  const panel = document.getElementById('gpt54-settings');
  if(panel) panel.classList.toggle('active');
}

function handleGpt54File(input){
  const file = input.files?.[0];
  if(!file) return;
  S.files['gpt54-file'] = file;
  const url = URL.createObjectURL(file);
  const wrap = document.getElementById('gpt54-attachments');
  if(!wrap) return;
  wrap.style.display = 'flex';
  wrap.innerHTML = `<div class="gpt-attach-chip"><img class="gpt-attach-thumb" src="${url}" alt=""><span>${file.name}</span><button class="gpt-attach-remove" type="button" onclick="clearGpt54Attachment()">✕</button></div>`;
}

function clearGpt54Attachment(){
  delete S.files['gpt54-file'];
  const input = document.getElementById('up-gpt54-image');
  if(input) input.value = '';
  const wrap = document.getElementById('gpt54-attachments');
  if(wrap){
    wrap.innerHTML = '';
    wrap.style.display = 'none';
  }
}

function autoGrowTextarea(el){
  if(!el) return;
  el.style.height = 'auto';
  const next = Math.min(el.scrollHeight, 160);
  el.style.height = `${next}px`;
}

function initGpt54UI(){
  const inputEl = document.getElementById('gpt54-input');
  if(inputEl && !inputEl.dataset.bound){
    inputEl.dataset.bound = '1';
    inputEl.addEventListener('input', ()=>autoGrowTextarea(inputEl));
    inputEl.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter' && !e.shiftKey){
        e.preventDefault();
        runGpt54();
      }
    });
  }
  if(!document.body.dataset.gpt54MenuBound){
    document.body.dataset.gpt54MenuBound = '1';
    document.addEventListener('click', (e)=>{
      const wrap = document.getElementById('gpt54-plus');
      if(wrap && !wrap.contains(e.target)) closeGpt54Menu();
      const modelWrap = document.getElementById('gpt54-model');
      if(modelWrap && !modelWrap.contains(e.target)) closeGpt54ModelMenu();
    });
  }
  const savedModel = (()=>{
    try{ return localStorage.getItem('gpt54-model') || ''; } catch { return ''; }
  })();
  if(savedModel){
    const item = document.querySelector(`.gpt-model-item[data-model="${savedModel}"]`);
    if(item){
      selectGpt54Model(savedModel, item.dataset.label || item.textContent.trim());
    }
  }
}

async function runGpt54(){
  if(!AUTH.checkCredits(5)) return;
  const btn = document.getElementById('gpt54-btn');
  const original = btn ? btn.innerHTML : '';
  const inputEl = document.getElementById('gpt54-input');
  const prompt = (inputEl?.value || '').trim();
  const effort = document.getElementById('gpt54-effort')?.value || 'medium';
  const tool = document.getElementById('gpt54-tools')?.value || 'none';
  const file = S.files['gpt54-file'];
  const model = S.gpt54Model || 'gpt-5-2';
  let assistantTextEl = null;

  try{
    if(!prompt) throw new Error('اكتب الرسالة أولاً');

    appendGpt54Message('user', prompt);
    assistantTextEl = appendGpt54Message('assistant', 'جارٍ الكتابة...');

    if(inputEl){
      inputEl.value = '';
      autoGrowTextarea(inputEl);
    }

    if(btn){ btn.disabled = true; btn.innerHTML = '<div class="spinner"></div>'; }
    setGpt54Status('تحضير الطلب...');

    let imageUrl = '';
    if(file){
      setGpt54Status('رفع الصورة...');
      imageUrl = await uploadKieBinaryFile(file);
    }

    const tools = tool === 'web_search' ? [{ type:'web_search' }] : [];
    const reasoning = effort ? { effort } : undefined;
    const startResp = await fetch('/api/kie/gpt54/create', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ prompt, imageUrl, tools, reasoning, model })
    });
    const startData = await startResp.json();
    if(!startResp.ok || startData.error) throw new Error(extractApiErrorMessage(startData, 'فشل إنشاء الطلب.'));

    const output = startData.outputText || '';
    if(assistantTextEl) assistantTextEl.textContent = output || 'لم يتم استلام نص من الموديل.';
    const usedModel = startData.modelUsed;
    if(usedModel && usedModel !== 'gpt-5-2'){
      setGpt54Status(`تم التحويل تلقائيًا إلى ${usedModel}.`,'success');
    } else {
      setGpt54Status('تم توليد الرد بنجاح.','success');
    }
    clearGpt54Attachment();
    AUTH.consumeCredits(5);
  } catch(e){
    if(assistantTextEl) assistantTextEl.textContent = 'حدث خطأ أثناء التوليد. حاول مرة أخرى.';
    setGpt54Status(String(e.message || e).substring(0,160), 'error');
    toast('خطأ: '+String(e.message || e).substring(0,140), 'error');
  } finally {
    if(btn){
      btn.disabled = false;
      btn.innerHTML = original || '<span class="material-symbols-outlined">send</span>';
    }
  }
}

async function pollSoraTask(taskId){
  for(let i=0; i<90; i++){
    await wait(5000);
    const r = await fetch(`/api/kie/sora/status?taskId=${encodeURIComponent(taskId)}`);
    const d = await r.json();
    if(!r.ok || d.error) throw new Error(extractApiErrorMessage(d, 'تعذر متابعة مهمة Sora.'));
    if(d.failed) throw new Error(d.failMsg || `Sora task failed: ${d.status || 'failed'}`);
    if(d.done) return d;
    setSoraStatus(`جاري التوليد... (${d.status || 'processing'})`);
  }
  throw new Error('انتهت المهلة قبل اكتمال Sora');
}

async function runSora(){
  const _sModel  = document.getElementById('sora-model')?.value || 'sora-2-text-to-video';
  const _sMInfo  = SORA_MODEL_INFO[_sModel] || SORA_MODEL_INFO['sora-2-text-to-video'];
  const _snFr    = document.getElementById('sora-frames')?.value || '10';
  const _sCost   = _sMInfo?.watermark ? applyProfitMargin(5) : _sMInfo?.characters ? applyProfitMargin(30) : (Number(_snFr) >= 14 ? applyProfitMargin(35) : applyProfitMargin(30));
  if(!AUTH.checkCredits(_sCost)) return;
  const btn = document.getElementById('sora-btn');
  const original = btn ? btn.textContent : '';
  try{
    const model = document.getElementById('sora-model')?.value || 'sora-2-text-to-video';
    const modelInfo = SORA_MODEL_INFO[model] || SORA_MODEL_INFO['sora-2-text-to-video'];
    if(!modelInfo.enabled) throw new Error('هذا الموديل غير مفعّل بعد');
    const prompt = (document.getElementById('sora-prompt')?.value || '').trim();
    const aspectRatio = document.getElementById('sora-ratio')?.value || '16:9';
    const resolutionUi = document.getElementById('sora-resolution')?.value || '2K';
    const resolution = mapUiResolution(resolutionUi, { '1K':'480p', '2K':'720p', '4K':'720p' }, '720p');
    const nFrames = document.getElementById('sora-frames')?.value || '10';
    const removeWatermark = (document.getElementById('sora-watermark')?.value || 'true') === 'true';
    const uploadMethod = document.getElementById('sora-upload')?.value || 's3';
    const videoUrl = (document.getElementById('sora-video-url')?.value || '').trim();
    const requiresImage = modelInfo.requiresImage;
    const file = S.files['dz-sora-image'];
    const originTaskId = (document.getElementById('sora-origin-task')?.value || '').trim();
    const characterName = (document.getElementById('sora-character-name')?.value || '').trim();
    const characterPrompt = (document.getElementById('sora-character-prompt')?.value || '').trim();
    const safetyInstruction = (document.getElementById('sora-safety')?.value || '').trim();
    const timestamps = (document.getElementById('sora-timestamps')?.value || '').trim();

    if(modelInfo.watermark){
      if(!videoUrl) throw new Error('أدخل رابط فيديو Sora أولاً');
      if(!/^https:\/\/sora\.chatgpt\.com\//i.test(videoUrl)){
        toast('الرابط يجب أن يكون من sora.chatgpt.com','info');
      }
    } else if(modelInfo.characters){
      if(!originTaskId) throw new Error('أدخل Origin Task ID أولاً');
      if(!characterPrompt) throw new Error('اكتب وصف الشخصية أولاً');
      if(!timestamps) throw new Error('أدخل timestamps بصيغة 3.55,5.55');
    } else if(modelInfo.storyboard){
      const scenes = Array.from(document.querySelectorAll('.sora-shot')).map(row => {
        const duration = parseFloat(row.querySelector('.sora-shot-duration')?.value || '0');
        const scene = (row.querySelector('.sora-shot-scene')?.value || '').trim();
        return { duration, Scene: scene };
      }).filter(s => s.Scene && s.duration > 0);
      if(scenes.length === 0) throw new Error('أضف مشهداً واحداً على الأقل في الـ Storyboard');
      if(file && file.size && file.size > 0) {
        // optional image
      }
    } else {
      if(!prompt) throw new Error('اكتب وصف الحركة أولاً');
      if(requiresImage && !file) throw new Error('ارفع صورة البداية لهذا النوع');
    }

    if(btn){ btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> إرسال إلى Sora...'; }
    clearResults('sora-results');
    if(modelInfo.watermark){
      setSoraStatus('تحضير رابط الفيديو...');
    } else {
    setSoraStatus('رفع الصورة...');
    }

    const imageUrls = [];
    if(file && !modelInfo.watermark){
      const imageUrl = await uploadKieBinaryFile(file);
      imageUrls.push(imageUrl);
    }

    setSoraStatus('إنشاء المهمة...');
    const input = {};
    if(modelInfo.watermark){
      input.video_url = videoUrl;
      input.upload_method = uploadMethod;
    } else if(modelInfo.characters){
      input.origin_task_id = originTaskId;
      if(characterName) input.character_user_name = characterName;
      input.character_prompt = characterPrompt;
      if(safetyInstruction) input.safety_instruction = safetyInstruction;
      input.timestamps = timestamps;
    } else if(modelInfo.storyboard){
      const scenes = Array.from(document.querySelectorAll('.sora-shot')).map(row => {
        const duration = parseFloat(row.querySelector('.sora-shot-duration')?.value || '0');
        const scene = (row.querySelector('.sora-shot-scene')?.value || '').trim();
        return { duration, Scene: scene };
      }).filter(s => s.Scene && s.duration > 0);
      input.n_frames = String(nFrames);
      if(imageUrls.length) input.image_urls = imageUrls;
      input.aspect_ratio = aspectRatio;
      input.resolution = resolution;
      input.upload_method = uploadMethod;
      input.shots = scenes;
    } else {
      input.prompt = prompt;
      if(imageUrls.length) input.image_urls = imageUrls;
      input.aspect_ratio = aspectRatio;
      input.n_frames = String(nFrames);
      input.resolution = resolution;
      input.remove_watermark = removeWatermark;
      input.upload_method = uploadMethod;
    }

    const startResp = await fetch('/api/kie/sora/create', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        model,
        input
      })
    });
    const startData = await startResp.json();
    if(!startResp.ok || startData.error) throw new Error(extractApiErrorMessage(startData, 'فشل إنشاء مهمة Sora.'));
    if(!startData.taskId) throw new Error('لم يتم استلام Task ID من Sora');

    setSoraStatus(`تم إنشاء المهمة: ${startData.taskId}`);
    const finalData = await pollSoraTask(startData.taskId);
    const urls = Array.isArray(finalData.resultUrls) ? finalData.resultUrls : [];
    if(urls.length === 0){
      if(finalData.resultObject){
        addSoraTextResult(finalData.resultObject);
        setSoraStatus('تم إنشاء الشخصية بنجاح.','success');
      } else {
        throw new Error('انتهت المهمة بدون روابط نتائج');
      }
    } else {
      urls.forEach(url => addResultItem('sora-results', url, true, prompt));
      setSoraStatus('تم توليد الفيديو.','success');
    }
    AUTH.consumeCredits(_sCost);
  } catch(e){
    setSoraStatus(String(e.message || e).substring(0,160), 'error');
    toast('خطأ: '+String(e.message || e).substring(0,140), 'error');
  } finally {
    if(btn){ btn.disabled = false; btn.textContent = original || 'Generate'; }
  }
}

function setGrokStatus(message, kind='info'){
  const el = document.getElementById('grok-status');
  if(!el) return;
  el.textContent = message;
  el.style.color = kind === 'error' ? 'var(--red)' : kind === 'success' ? 'var(--green)' : 'var(--tx2)';
}

function setSunoStatus(message, kind='info'){
  const el = document.getElementById('suno-status');
  if(!el) return;
  el.textContent = message;
  el.style.color = kind === 'error' ? 'var(--red)' : kind === 'success' ? 'var(--green)' : 'var(--tx2)';
}

async function pollSunoTask(taskId){
  for(let i=0; i<90; i++){
    await wait(5000);
    const r = await fetch(`/api/kie/suno/status?taskId=${encodeURIComponent(taskId)}`);
    const d = await r.json();
    if(!r.ok || d.error) throw new Error(extractApiErrorMessage(d, 'تعذر متابعة مهمة الموسيقى.'));
    if(d.failed) throw new Error(d.failMsg || 'Suno task failed');
    if(d.done && Array.isArray(d.audioUrls) && d.audioUrls.length) return d;
    setSunoStatus(`جاري التوليد... (${d.status || 'processing'})`);
  }
  throw new Error('انتهت المهلة قبل اكتمال توليد الموسيقى');
}

async function runSuno(){
  const btn = document.getElementById('suno-btn');
  const original = btn ? btn.textContent : '';
  try{
    const prompt = (document.getElementById('suno-prompt')?.value || '').trim();
    const title = (document.getElementById('suno-title')?.value || '').trim();
    const style = (document.getElementById('suno-style')?.value || '').trim();
    const negativeTags = (document.getElementById('suno-negative')?.value || '').trim();
    const customMode = (document.getElementById('suno-custom')?.value || 'false') === 'true';
    const instrumental = (document.getElementById('suno-instrumental')?.value || 'false') === 'true';
    const model = (document.getElementById('suno-model')?.value || 'V5').trim();
    const vocalGender = (document.getElementById('suno-vocal')?.value || '').trim();

    if(customMode){
      if(instrumental){
        if(!style || !title) throw new Error('عند تفعيل Custom Mode + Instrumental يجب إدخال Style و Title');
      } else {
        if(!prompt || !style || !title) throw new Error('عند تفعيل Custom Mode يجب إدخال Prompt و Style و Title');
      }
    } else if(!prompt) {
      throw new Error('اكتب فكرة الموسيقى أولاً');
    }
    const _sunoCost = applyProfitMargin((model === 'V3_5' || model === 'V3') ? 8 : 10);
    if(!AUTH.checkCredits(_sunoCost)) return;

    if(btn){ btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> إرسال إلى Suno...'; }
    setSunoStatus('جاري إرسال الطلب...', 'info');

    const payload = { prompt, customMode, instrumental, model };
    if(title) payload.title = title;
    if(style) payload.style = style;
    if(negativeTags) payload.negativeTags = negativeTags;
    if(vocalGender) payload.vocalGender = vocalGender;

    const create = await fetch('/api/kie/suno/create', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    const created = await create.json();
    if(!create.ok || created.error) throw new Error(extractApiErrorMessage(created, 'فشل إرسال مهمة Suno'));
    const taskId = created.taskId;
    if(!taskId) throw new Error('Suno لم يعِد taskId');

    setSunoStatus('تم الإرسال، جاري التوليد...', 'info');
    const result = await pollSunoTask(taskId);
    const urls = Array.isArray(result.audioUrls) ? result.audioUrls : [];
    if(!urls.length) throw new Error('لم يتم العثور على ملفات صوتية');
    urls.forEach((url, index) => addAudioResultItem('eleven-results', url, `Suno Music ${index + 1}`));
    setSunoStatus('تم توليد الموسيقى بنجاح.','success');
    loadElevenCredits();
    AUTH.consumeCredits(_sunoCost);
    toast('تم توليد الموسيقى','success');
  } catch(e){
    setSunoStatus(String(e.message || e).substring(0,160), 'error');
    toast('خطأ: '+String(e.message || e).substring(0,140), 'error');
  } finally {
    if(btn){ btn.disabled = false; btn.textContent = original || 'Generate'; }
  }
}

async function pollGrokTask(taskId){
  for(let i=0; i<90; i++){
    await wait(5000);
    const r = await fetch(`/api/kie/grok/status?taskId=${encodeURIComponent(taskId)}`);
    const d = await r.json();
    if(!r.ok || d.error) throw new Error(extractApiErrorMessage(d, 'تعذر متابعة مهمة Grok.'));
    if(d.failed) throw new Error(d.failMsg || `Grok task failed: ${d.status || 'failed'}`);
    if(d.done) return d;
    setGrokStatus(`جاري التوليد... (${d.status || 'processing'})`);
  }
  throw new Error('انتهت المهلة قبل اكتمال Grok');
}

async function runGrok(){
  if(!AUTH.checkCredits(10)) return;
  const btn = document.getElementById('grok-btn');
  const original = btn ? btn.textContent : '';
  try{
    const model = document.getElementById('grok-model')?.value || 'grok-imagine/text-to-video';
    const info = GROK_MODEL_INFO[model] || GROK_MODEL_INFO['grok-imagine/text-to-video'];
    const type = info.type || 't2v';
    const prompt = (document.getElementById('grok-prompt')?.value || '').trim();
    const aspectRatio = document.getElementById('grok-ratio')?.value || '1:1';
    const mode = document.getElementById('grok-mode')?.value || 'normal';
    const duration = document.getElementById('grok-duration')?.value || '6';
    const resolutionUi = document.getElementById('grok-resolution')?.value || '2K';
    const resolution = mapUiResolution(resolutionUi, { '1K':'480p', '2K':'720p', '4K':'720p' }, '720p');
    const taskId = (document.getElementById('grok-task-id')?.value || '').trim();
    const indexVal = parseInt(document.getElementById('grok-task-index')?.value || '0', 10);
    const upscaleTaskId = (document.getElementById('grok-upscale-task')?.value || '').trim();
    const file = S.files['dz-grok-image'];

    if((type === 't2v' || type === 't2i') && !prompt) throw new Error('اكتب الوصف أولاً');
    if(type === 'i2v' && !taskId && !file) throw new Error('ارفع صورة أو أدخل Task ID');
    if(type === 'i2i' && !file) throw new Error('ارفع الصورة أولاً');
    if(type === 'upscale' && !upscaleTaskId) throw new Error('أدخل Task ID للفيديو أولاً');

    if(btn){ btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> إرسال إلى Grok...'; }
    clearResults('grok-results');

    const input = {};
    let usingExternalImage = false;

    if(type === 't2v'){
      Object.assign(input, { prompt, aspect_ratio: aspectRatio, mode, duration, resolution });
    } else if(type === 't2i'){
      Object.assign(input, { prompt, aspect_ratio: aspectRatio });
    } else if(type === 'i2i'){
    setGrokStatus('رفع الصورة...');
      const imageUrl = await uploadKieBinaryFile(file);
      input.image_urls = [imageUrl];
      if(prompt) input.prompt = prompt;
    } else if(type === 'i2v'){
      if(taskId){
        input.task_id = taskId;
        input.index = Number.isFinite(indexVal) ? indexVal : 0;
      } else {
      setGrokStatus('رفع الصورة...');
        const imageUrl = await uploadKieBinaryFile(file);
        input.image_urls = [imageUrl];
        usingExternalImage = true;
      }
      if(prompt) input.prompt = prompt;
      let finalMode = mode;
      if(usingExternalImage && mode === 'spicy'){
        finalMode = 'normal';
        toast('تم تحويل Spicy إلى Normal لأن الصورة خارجية','info');
      }
      input.mode = finalMode;
      input.duration = duration;
      input.resolution = resolution;
    } else if(type === 'upscale'){
      input.task_id = upscaleTaskId;
    }

    setGrokStatus('إنشاء المهمة...');

    const startResp = await fetch('/api/kie/grok/create', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ model, input })
    });
    const startData = await startResp.json();
    if(!startResp.ok || startData.error) throw new Error(extractApiErrorMessage(startData, 'فشل إنشاء مهمة Grok.'));
    if(!startData.taskId) throw new Error('لم يتم استلام Task ID من Grok');

    setGrokStatus(`تم إنشاء المهمة: ${startData.taskId}`);
    const finalData = await pollGrokTask(startData.taskId);
    const urls = Array.isArray(finalData.resultUrls) ? finalData.resultUrls : [];
    if(urls.length === 0) throw new Error('انتهت المهمة بدون روابط نتائج');
    const guessVideo = type === 't2v' || type === 'i2v' || type === 'upscale';
    urls.forEach(url => addResultItem('grok-results', url, isVideoUrl(url) || guessVideo, prompt || model));
    setGrokStatus('تم توليد النتائج.','success');
    AUTH.consumeCredits(10);
  } catch(e){
    setGrokStatus(String(e.message || e).substring(0,160), 'error');
    toast('خطأ: '+String(e.message || e).substring(0,140), 'error');
  } finally {
    if(btn){ btn.disabled = false; btn.textContent = original || 'Generate'; }
  }
}

function setInfinitalkStatus(message, kind='info'){
  const el = document.getElementById('infinitalk-status');
  if(!el) return;
  el.textContent = message;
  el.style.color = kind === 'error' ? 'var(--red)' : kind === 'success' ? 'var(--green)' : 'var(--tx2)';
}

async function pollInfinitalkTask(taskId){
  for(let i=0; i<90; i++){
    await wait(5000);
    const r = await fetch(`/api/kie/infinitalk/status?taskId=${encodeURIComponent(taskId)}`);
    const d = await r.json();
    if(!r.ok || d.error) throw new Error(extractApiErrorMessage(d, 'تعذر متابعة مهمة Infinitalk.'));
    if(d.failed) throw new Error(d.failMsg || `Infinitalk task failed: ${d.status || 'failed'}`);
    if(d.done) return d;
    setInfinitalkStatus(`جاري التوليد... (${d.status || 'processing'})`);
  }
  throw new Error('انتهت المهلة قبل اكتمال Infinitalk');
}

async function runInfinitalk(){
  if(!checkPlanAccess('infinitalk')) return;
  if(!AUTH.checkCredits(applyProfitMargin(15))) return;
  const btn = document.getElementById('infinitalk-btn');
  const original = btn ? btn.textContent : '';
  try{
    const model = document.getElementById('infinitalk-model')?.value || 'infinitalk/from-audio';
    const prompt = ensurePrompt(document.getElementById('infinitalk-prompt')?.value, 3, 'وصف الفيديو');
    const resolutionUi = document.getElementById('infinitalk-resolution')?.value || '2K';
    const resolution = mapUiResolution(resolutionUi, { '1K':'480p', '2K':'720p', '4K':'720p' }, '720p');
    const seedRaw = (document.getElementById('infinitalk-seed')?.value || '').trim();
    const seedVal = seedRaw ? parseInt(seedRaw, 10) : null;
    const imageFile = S.files['dz-infinitalk-image'];
    const audioFile = S.files['dz-infinitalk-audio'];

    if(!imageFile) throw new Error('ارفع صورة الوجه أولاً');
    if(!audioFile) throw new Error('ارفع ملف الصوت أولاً');

    if(btn){ btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> إرسال إلى Infinitalk...'; }
    clearResults('infinitalk-results');

    setInfinitalkStatus('رفع الصورة...');
    const imageUrl = await uploadKieBinaryFile(imageFile);
    setInfinitalkStatus('رفع الصوت...');
    const audioUrl = await uploadKieBinaryFile(audioFile);

    setInfinitalkStatus('إنشاء المهمة...');
    const input = {
      image_url: imageUrl,
      audio_url: audioUrl,
      prompt,
      resolution
    };
    if(Number.isFinite(seedVal)) input.seed = seedVal;

    const startResp = await fetch('/api/kie/infinitalk/create', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ model, input })
    });
    const startData = await startResp.json();
    if(!startResp.ok || startData.error) throw new Error(extractApiErrorMessage(startData, 'فشل إنشاء مهمة Infinitalk.'));
    if(!startData.taskId) throw new Error('لم يتم استلام Task ID من Infinitalk');

    setInfinitalkStatus(`تم إنشاء المهمة: ${startData.taskId}`);
    const finalData = await pollInfinitalkTask(startData.taskId);
    const urls = Array.isArray(finalData.resultUrls) ? finalData.resultUrls : [];
    if(urls.length === 0) throw new Error('انتهت المهمة بدون روابط نتائج');
    urls.forEach(url => addResultItem('infinitalk-results', url, isVideoUrl(url) || true, prompt));
    setInfinitalkStatus('تم توليد النتائج.','success');
    AUTH.consumeCredits(applyProfitMargin(15));
  } catch(e){
    setInfinitalkStatus(String(e.message || e).substring(0,160), 'error');
    toast('خطأ: '+String(e.message || e).substring(0,140), 'error');
  } finally {
    if(btn){ btn.disabled = false; btn.textContent = original || 'Generate'; }
  }
}

function setQwen2Status(message, kind='info'){
  const el = document.getElementById('qwen2-status');
  if(!el) return;
  el.textContent = message;
  el.style.color = kind === 'error' ? 'var(--red)' : kind === 'success' ? 'var(--green)' : 'var(--tx2)';
}

async function pollQwen2Task(taskId){
  for(let i=0; i<90; i++){
    await wait(5000);
    const r = await fetch(`/api/kie/qwen2/status?taskId=${encodeURIComponent(taskId)}`);
    const d = await r.json();
    if(!r.ok || d.error) throw new Error(extractApiErrorMessage(d, 'تعذر متابعة مهمة Qwen2.'));
    if(d.failed) throw new Error(d.failMsg || `Qwen2 task failed: ${d.status || 'failed'}`);
    if(d.done) return d;
    setQwen2Status(`جاري التوليد... (${d.status || 'processing'})`);
  }
  throw new Error('انتهت المهلة قبل اكتمال Qwen2');
}

async function runQwen2(){
  if(!AUTH.checkCredits(applyProfitMargin(6))) return;
  const btn = document.getElementById('qwen2-btn');
  const original = btn ? btn.textContent : '';
  try{
    const model = document.getElementById('qwen2-model')?.value || 'qwen2/image-edit';
    const prompt = ensurePrompt(document.getElementById('qwen2-prompt')?.value, 3, 'الوصف');
    const imageSize = document.getElementById('qwen2-size')?.value || '1:1';
    const outputFormat = document.getElementById('qwen2-format')?.value || 'png';
    const seedRaw = (document.getElementById('qwen2-seed')?.value || '').trim();
    const seedVal = seedRaw ? parseInt(seedRaw, 10) : null;
    const imageFile = S.files['dz-qwen2-image'];
    const isEdit = model === 'qwen2/image-edit';

    if(isEdit && !imageFile) throw new Error('ارفع الصورة أولاً');

    if(btn){ btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> إرسال إلى Qwen2...'; }
    clearResults('qwen2-results');
    let imageUrl = '';
    if(isEdit){
      setQwen2Status('رفع الصورة...');
      imageUrl = await uploadKieBinaryFile(imageFile);
    }

    setQwen2Status('إنشاء المهمة...');
    const input = {
      prompt,
      image_url: [imageUrl],
      image_size: imageSize,
      output_format: outputFormat
    };
    if(!isEdit) delete input.image_url;
    if(Number.isFinite(seedVal)) input.seed = seedVal;

    const startResp = await fetch('/api/kie/qwen2/create', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ model, input })
    });
    const startData = await startResp.json();
    if(!startResp.ok || startData.error) throw new Error(extractApiErrorMessage(startData, 'فشل إنشاء مهمة Qwen2.'));
    if(!startData.taskId) throw new Error('لم يتم استلام Task ID من Qwen2');

    setQwen2Status(`تم إنشاء المهمة: ${startData.taskId}`);
    const finalData = await pollQwen2Task(startData.taskId);
    const urls = Array.isArray(finalData.resultUrls) ? finalData.resultUrls : [];
    if(urls.length === 0) throw new Error('انتهت المهمة بدون روابط نتائج');
    urls.forEach(url => addResultItem('qwen2-results', url, false, prompt));
    setQwen2Status('تم توليد النتائج.','success');
    AUTH.consumeCredits(applyProfitMargin(6));
  } catch(e){
    setQwen2Status(String(e.message || e).substring(0,160), 'error');
    toast('خطأ: '+String(e.message || e).substring(0,140), 'error');
  } finally {
    if(btn){ btn.disabled = false; btn.textContent = original || 'Generate'; }
  }
}

function setIdeogramReframeStatus(message, kind='info'){
  const el = document.getElementById('ideogram-reframe-status');
  if(!el) return;
  el.textContent = message;
  el.style.color = kind === 'error' ? 'var(--red)' : kind === 'success' ? 'var(--green)' : 'var(--tx2)';
}

async function pollIdeogramReframeTask(taskId){
  for(let i=0; i<90; i++){
    await wait(5000);
    const r = await fetch(`/api/kie/ideogram/status?taskId=${encodeURIComponent(taskId)}`);
    const d = await r.json();
    if(!r.ok || d.error) throw new Error(extractApiErrorMessage(d, 'تعذر متابعة مهمة Ideogram Reframe.'));
    if(d.failed) throw new Error(d.failMsg || `Ideogram task failed: ${d.status || 'failed'}`);
    if(d.done) return d;
    setIdeogramReframeStatus(`جاري التوليد... (${d.status || 'processing'})`);
  }
  throw new Error('انتهت المهلة قبل اكتمال Ideogram Reframe');
}

async function runIdeogramReframe(){
  if(!AUTH.checkCredits(applyProfitMargin(7))) return;
  const btn = document.getElementById('ideogram-reframe-btn');
  const original = btn ? btn.textContent : '';
  try{
    const model = document.getElementById('ideogram-reframe-model')?.value || 'ideogram/v3-reframe';
    const prompt = ensurePrompt(document.getElementById('ideogram-reframe-prompt')?.value, 3, 'الوصف');
    const ratioRaw = document.getElementById('ideogram-reframe-size')?.value || '16:9';
    const ratioMap = {
      '1:1': 'square_hd',
      '3:4': 'portrait_4_3',
      '9:16': 'portrait_16_9',
      '4:3': 'landscape_4_3',
      '16:9': 'landscape_16_9'
    };
    const imageSize = ratioMap[ratioRaw] || 'landscape_16_9';
    const speed = document.getElementById('ideogram-reframe-speed')?.value || 'BALANCED';
    const style = document.getElementById('ideogram-reframe-style')?.value || 'AUTO';
    const numImages = document.getElementById('ideogram-reframe-count')?.value || '1';
    const seedRaw = (document.getElementById('ideogram-reframe-seed')?.value || '').trim();
    const seedVal = seedRaw ? parseInt(seedRaw, 10) : null;
    const imageFile = S.files['dz-ideogram-reframe-image'];

    if(!imageFile) throw new Error('ارفع الصورة أولاً');

    if(btn){ btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> إرسال إلى Ideogram...'; }
    clearResults('ideogram-reframe-results');
    setIdeogramReframeStatus('رفع الصورة...');
    const imageUrl = await uploadKieBinaryFile(imageFile);

    setIdeogramReframeStatus('إنشاء المهمة...');
    const input = {
      prompt,
      image_url: imageUrl,
      image_size: imageSize,
      rendering_speed: speed,
      style,
      num_images: String(numImages || '1')
    };
    if(Number.isFinite(seedVal)) input.seed = seedVal;

    const startResp = await fetch('/api/kie/ideogram/create', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ model, input })
    });
    const startData = await startResp.json();
    if(!startResp.ok || startData.error) throw new Error(extractApiErrorMessage(startData, 'فشل إنشاء مهمة Ideogram Reframe.'));
    if(!startData.taskId) throw new Error('لم يتم استلام Task ID من Ideogram');

    setIdeogramReframeStatus(`تم إنشاء المهمة: ${startData.taskId}`);
    const finalData = await pollIdeogramReframeTask(startData.taskId);
    const urls = Array.isArray(finalData.resultUrls) ? finalData.resultUrls : [];
    if(urls.length === 0) throw new Error('انتهت المهمة بدون روابط نتائج');
    urls.forEach(url => addResultItem('ideogram-reframe-results', url, false, prompt));
    setIdeogramReframeStatus('تم توليد النتائج.','success');
    AUTH.consumeCredits(applyProfitMargin(7));
  } catch(e){
    setIdeogramReframeStatus(String(e.message || e).substring(0,160), 'error');
    toast('خطأ: '+String(e.message || e).substring(0,140), 'error');
  } finally {
    if(btn){ btn.disabled = false; btn.textContent = original || 'Generate'; }
  }
}

function setZImageStatus(message, kind='info'){
  const el = document.getElementById('zimage-status');
  if(!el) return;
  el.textContent = message;
  el.style.color = kind === 'error' ? 'var(--red)' : kind === 'success' ? 'var(--green)' : 'var(--tx2)';
}

async function pollZImageTask(taskId){
  for(let i=0; i<90; i++){
    await wait(5000);
    const r = await fetch(`/api/kie/zimage/status?taskId=${encodeURIComponent(taskId)}`);
    const d = await r.json();
    if(!r.ok || d.error) throw new Error(extractApiErrorMessage(d, 'تعذر متابعة مهمة Z-Image.'));
    if(d.failed) throw new Error(d.failMsg || `Z-Image task failed: ${d.status || 'failed'}`);
    if(d.done) return d;
    setZImageStatus(`جاري التوليد... (${d.status || 'processing'})`);
  }
  throw new Error('انتهت المهلة قبل اكتمال Z-Image');
}

async function runZImage(){
  if(!AUTH.checkCredits(applyProfitMargin(1))) return;
  const btn = document.getElementById('zimage-btn');
  const original = btn ? btn.textContent : '';
  try{
    const model = document.getElementById('zimage-model')?.value || 'z-image';
    const prompt = ensurePrompt(document.getElementById('zimage-prompt')?.value, 3, 'الوصف');
    const aspectRatio = document.getElementById('zimage-ratio')?.value || '16:9';


    if(btn){ btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> إرسال إلى Z-Image...'; }
    clearResults('zimage-results');

    setZImageStatus('إنشاء المهمة...');
    const input = { prompt, aspect_ratio: aspectRatio };
    const startResp = await fetch('/api/kie/zimage/create', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ model, input })
    });
    const startData = await startResp.json();
    if(!startResp.ok || startData.error) throw new Error(extractApiErrorMessage(startData, 'فشل إنشاء مهمة Z-Image.'));
    if(!startData.taskId) throw new Error('لم يتم استلام Task ID من Z-Image');

    setZImageStatus(`تم إنشاء المهمة: ${startData.taskId}`);
    const finalData = await pollZImageTask(startData.taskId);
    const urls = Array.isArray(finalData.resultUrls) ? finalData.resultUrls : [];
    if(urls.length === 0) throw new Error('انتهت المهمة بدون روابط نتائج');
    urls.forEach(url => addResultItem('zimage-results', url, false, prompt));
    setZImageStatus('تم توليد النتائج.','success');
    AUTH.consumeCredits(applyProfitMargin(1));
  } catch(e){
    setZImageStatus(String(e.message || e).substring(0,160), 'error');
    toast('خطأ: '+String(e.message || e).substring(0,140), 'error');
  } finally {
    if(btn){ btn.disabled = false; btn.textContent = original || 'Generate'; }
  }
}

function setSeedreamStatus(message, kind='info'){
  const el = document.getElementById('seedream-status');
  if(!el) return;
  el.textContent = message;
  el.style.color = kind === 'error' ? 'var(--red)' : kind === 'success' ? 'var(--green)' : 'var(--tx2)';
}

async function pollSeedreamTask(taskId){
  for(let i=0; i<90; i++){
    await wait(5000);
    const r = await fetch(`/api/kie/seedream/status?taskId=${encodeURIComponent(taskId)}`);
    const d = await r.json();
    if(!r.ok || d.error) throw new Error(extractApiErrorMessage(d, 'تعذر متابعة مهمة Seedream.'));
    if(d.failed) throw new Error(d.failMsg || `Seedream task failed: ${d.status || 'failed'}`);
    if(d.done) return d;
    setSeedreamStatus(`جاري التوليد... (${d.status || 'processing'})`);
  }
  throw new Error('انتهت المهلة قبل اكتمال Seedream');
}

async function runSeedream(){
  if(!AUTH.checkCredits(applyProfitMargin(7))) return;
  const btn = document.getElementById('seedream-btn');
  const original = btn ? btn.textContent : '';
  try{
    const model = document.getElementById('seedream-model')?.value || 'seedream/4.5-text-to-image';
    const prompt = ensurePrompt(document.getElementById('seedream-prompt')?.value, 3, 'الوصف');
    const aspectRatio = document.getElementById('seedream-ratio')?.value || '1:1';
    const resolutionUi = document.getElementById('seedream-quality')?.value || '2K';
    const quality = resolutionUi === '4K' ? 'high' : 'basic';
    const requiresImage = (SEEDREAM_MODEL_INFO[model] || {}).requiresImage;
    const imageFile = S.files['dz-seedream-image'];

    if(requiresImage && !imageFile) throw new Error('ارفع الصورة أولاً');

    if(btn){ btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> إرسال إلى Seedream...'; }
    clearResults('seedream-results');

    let imageUrl = '';
    if(requiresImage){
      setSeedreamStatus('رفع الصورة...');
      imageUrl = await uploadKieBinaryFile(imageFile);
    }

    setSeedreamStatus('إنشاء المهمة...');
    const input = {
      prompt,
      aspect_ratio: aspectRatio,
      quality
    };
    if(requiresImage) input.image_urls = [imageUrl];

    const startResp = await fetch('/api/kie/seedream/create', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ model, input })
    });
    const startData = await startResp.json();
    if(!startResp.ok || startData.error) throw new Error(extractApiErrorMessage(startData, 'فشل إنشاء مهمة Seedream.'));
    if(!startData.taskId) throw new Error('لم يتم استلام Task ID من Seedream');

    setSeedreamStatus(`تم إنشاء المهمة: ${startData.taskId}`);
    const finalData = await pollSeedreamTask(startData.taskId);
    const urls = Array.isArray(finalData.resultUrls) ? finalData.resultUrls : [];
    if(urls.length === 0) throw new Error('انتهت المهمة بدون روابط نتائج');
    urls.forEach(url => addResultItem('seedream-results', url, false, prompt));
    setSeedreamStatus('تم توليد النتائج.','success');
    AUTH.consumeCredits(applyProfitMargin(7));
  } catch(e){
    setSeedreamStatus(String(e.message || e).substring(0,160), 'error');
    toast('خطأ: '+String(e.message || e).substring(0,140), 'error');
  } finally {
    if(btn){ btn.disabled = false; btn.textContent = original || 'Generate'; }
  }
}

function setSeedanceStatus(message, kind='info'){
  const el = document.getElementById('seedance-status');
  if(!el) return;
  el.textContent = message;
  el.style.color = kind === 'error' ? 'var(--red)' : kind === 'success' ? 'var(--green)' : 'var(--tx2)';
}

async function pollSeedanceTask(taskId){
  for(let i=0; i<90; i++){
    await wait(5000);
    const r = await fetch(`/api/kie/seedance/status?taskId=${encodeURIComponent(taskId)}`);
    const d = await r.json();
    if(!r.ok || d.error) throw new Error(extractApiErrorMessage(d, 'تعذر متابعة مهمة Seedance.'));
    if(d.failed) throw new Error(d.failMsg || `Seedance task failed: ${d.status || 'failed'}`);
    if(d.done) return d;
    setSeedanceStatus(`جاري التوليد... (${d.status || 'processing'})`);
  }
  throw new Error('انتهت المهلة قبل اكتمال Seedance');
}

async function runSeedance(){
  const _sdModel = document.getElementById('seedance-model')?.value || 'bytedance/seedance-1.5-pro';
  const _sdResUi = document.getElementById('seedance-resolution')?.value || '2K';
  const _sdRes   = mapUiResolution(_sdResUi, { '1K':'480p', '2K':'720p', '4K':'1080p' }, '720p');
  const _sdDur   = Number(document.getElementById('seedance-duration')?.value || '4');
  const _sdCost  = applyProfitMargin(calcCreditCost(_sdModel, { duration: _sdDur, resolution: _sdRes }));
  if(!checkPlanAccess(_sdModel)) return;
  if(!AUTH.checkCredits(_sdCost)) return;
  const btn = document.getElementById('seedance-btn');
  const original = btn ? btn.textContent : '';
  try{
    const model = document.getElementById('seedance-model')?.value || 'bytedance/seedance-1.5-pro';
    const prompt = ensurePrompt(document.getElementById('seedance-prompt')?.value, 3, 'وصف الفيديو');
    const aspect_ratio = document.getElementById('seedance-ratio')?.value || '1:1';
    const resolutionUi = document.getElementById('seedance-resolution')?.value || '2K';
    const resolution = mapUiResolution(resolutionUi, { '1K':'480p', '2K':'720p', '4K':'1080p' }, '720p');
    const duration = document.getElementById('seedance-duration')?.value || '4';
    const fixed_lens = (document.getElementById('seedance-fixed')?.value || 'false') === 'true';
    const generate_audio = (document.getElementById('seedance-audio')?.value || 'false') === 'true';
    const img1 = S.files['dz-seedance-image1'];
    const img2 = S.files['dz-seedance-image2'];


    if(btn){ btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> إرسال إلى Seedance...'; }
    clearResults('seedance-results');

    const input_urls = [];
    if(img1){
      setSeedanceStatus('رفع الصورة 1...');
      input_urls.push(await uploadKieBinaryFile(img1));
    }
    if(img2){
      setSeedanceStatus('رفع الصورة 2...');
      input_urls.push(await uploadKieBinaryFile(img2));
    }

    setSeedanceStatus('إنشاء المهمة...');
    const input = {
      prompt,
      aspect_ratio,
      resolution,
      duration,
      fixed_lens,
      generate_audio
    };
    if(input_urls.length) input.input_urls = input_urls;

    const startResp = await fetch('/api/kie/seedance/create', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ model, input })
    });
    const startData = await startResp.json();
    if(!startResp.ok || startData.error) throw new Error(extractApiErrorMessage(startData, 'فشل إنشاء مهمة Seedance.'));
    if(!startData.taskId) throw new Error('لم يتم استلام Task ID من Seedance');

    setSeedanceStatus(`تم إنشاء المهمة: ${startData.taskId}`);
    const finalData = await pollSeedanceTask(startData.taskId);
    const urls = Array.isArray(finalData.resultUrls) ? finalData.resultUrls : [];
    if(urls.length === 0) throw new Error('انتهت المهمة بدون روابط نتائج');
    urls.forEach(url => addResultItem('seedance-results', url, true, prompt));
    setSeedanceStatus('تم توليد النتائج.','success');
    AUTH.consumeCredits(_sdCost);
  } catch(e){
    setSeedanceStatus(String(e.message || e).substring(0,160), 'error');
    toast('خطأ: '+String(e.message || e).substring(0,140), 'error');
  } finally {
    if(btn){ btn.disabled = false; btn.textContent = original || 'Generate'; }
  }
}

function setWanStatus(message, kind='info'){
  const el = document.getElementById('wan-status');
  if(!el) return;
  el.textContent = message;
  el.style.color = kind === 'error' ? 'var(--red)' : kind === 'success' ? 'var(--green)' : 'var(--tx2)';
}

async function pollWanTask(taskId){
  for(let i=0; i<90; i++){
    await wait(5000);
    const r = await fetch(`/api/kie/wan/status?taskId=${encodeURIComponent(taskId)}`);
    const d = await r.json();
    if(!r.ok || d.error) throw new Error(extractApiErrorMessage(d, 'تعذر متابعة مهمة Wan.'));
    if(d.failed) throw new Error(d.failMsg || `Wan task failed: ${d.status || 'failed'}`);
    if(d.done) return d;
    setWanStatus(`جاري التوليد... (${d.status || 'processing'})`);
  }
  throw new Error('انتهت المهلة قبل اكتمال Wan');
}

async function runWan(){
  const _wModel  = document.getElementById('wan-model')?.value || 'wan/2-6-text-to-video';
  const _wDur    = Number(document.getElementById('wan-duration')?.value || '5');
  const _wResUi  = document.getElementById('wan-resolution')?.value || '2K';
  const _wRes    = mapUiResolution(_wResUi, { '1K':'720p', '2K':'1080p', '4K':'1080p' }, '720p');
  const _wCost   = applyProfitMargin(calcCreditCost(_wModel, { duration: _wDur, resolution: _wRes }));
  if(!checkPlanAccess(_wModel)) return;
  if(!AUTH.checkCredits(_wCost)) return;
  const btn = document.getElementById('wan-btn');
  const original = btn ? btn.textContent : '';
  try{
    const model = document.getElementById('wan-model')?.value || 'wan/2-6-text-to-video';
    const prompt = ensurePrompt(document.getElementById('wan-prompt')?.value, 3, 'وصف الفيديو');
    const isSpeech = model === 'wan/2-2-a14b-speech-to-video-turbo';
    const aspect_ratio = document.getElementById('wan-ratio')?.value || '16:9';
    const duration = document.getElementById('wan-duration')?.value || '5';
    const resolutionUi = document.getElementById('wan-resolution')?.value || '2K';
    const resolution = mapUiResolution(resolutionUi, { '1K':'720p', '2K':'1080p', '4K':'1080p' }, '720p');
    const multi_shots = (document.getElementById('wan-multishots')?.value || 'false') === 'true';
    const imageFile = S.files['dz-wan-image'];
    const videoFile = S.files['dz-wan-video'];
    const speechImage = S.files['dz-wan-speech-image'];
    const speechAudio = S.files['dz-wan-speech-audio'];
    if(isSpeech && !speechImage) throw new Error('ارفع صورة الوجه أولاً');
    if(isSpeech && !speechAudio) throw new Error('ارفع ملف الصوت أولاً');
    if(model === 'wan/2-6-image-to-video' && !imageFile) throw new Error('ارفع صورة مرجعية أولاً');
    if(model === 'wan/2-6-video-to-video' && !videoFile) throw new Error('ارفع فيديو مرجعي أولاً');

    if(btn){ btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> إرسال إلى Wan...'; }
    clearResults('wan-results');

    if(isSpeech){
      setWanStatus('رفع الصورة...');
      const speechImageUrl = await uploadKieBinaryFile(speechImage);
      setWanStatus('رفع الصوت...');
      const speechAudioUrl = await uploadKieBinaryFile(speechAudio);

      const frames = parseInt(document.getElementById('wan-speech-frames')?.value || '80', 10);
      const fps = parseInt(document.getElementById('wan-speech-fps')?.value || '16', 10);
      const speechResUi = document.getElementById('wan-speech-res')?.value || '2K';
      const speechRes = mapUiResolution(speechResUi, { '1K':'480p', '2K':'580p', '4K':'720p' }, '480p');
      const steps = parseInt(document.getElementById('wan-speech-steps')?.value || '27', 10);
      const guidance = parseFloat(document.getElementById('wan-speech-guidance')?.value || '3.5');
      const shift = parseFloat(document.getElementById('wan-speech-shift')?.value || '5');
      const seedRaw = (document.getElementById('wan-speech-seed')?.value || '').trim();
      const negative = (document.getElementById('wan-speech-negative')?.value || '').trim();
      const safety = (document.getElementById('wan-speech-safety')?.value || 'true') === 'true';

      const input = {
        prompt,
        image_url: speechImageUrl,
        audio_url: speechAudioUrl,
        num_frames: Number.isFinite(frames) ? frames : 80,
        frames_per_second: Number.isFinite(fps) ? fps : 16,
        resolution: speechRes,
        num_inference_steps: Number.isFinite(steps) ? steps : 27,
        guidance_scale: Number.isFinite(guidance) ? guidance : 3.5,
        shift: Number.isFinite(shift) ? shift : 5,
        enable_safety_checker: safety
      };
      if(negative) input.negative_prompt = negative;
      if(seedRaw){
        const seedVal = parseInt(seedRaw, 10);
        if(Number.isFinite(seedVal)) input.seed = seedVal;
      }

      setWanStatus('إنشاء المهمة...');
      const startResp = await fetch('/api/kie/wan/create', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ model, input })
      });
      const startData = await startResp.json();
      if(!startResp.ok || startData.error) throw new Error(extractApiErrorMessage(startData, 'فشل إنشاء مهمة Wan.'));
      if(!startData.taskId) throw new Error('لم يتم استلام Task ID من Wan');

      setWanStatus(`تم إنشاء المهمة: ${startData.taskId}`);
      const finalData = await pollWanTask(startData.taskId);
      const urls = Array.isArray(finalData.resultUrls) ? finalData.resultUrls : [];
      if(urls.length === 0) throw new Error('انتهت المهمة بدون روابط نتائج');
      urls.forEach(url => addResultItem('wan-results', url, true, prompt));
      setWanStatus('تم توليد النتائج.','success');
      AUTH.consumeCredits(_wCost);
      return;
    }

    let imageUrl = '';
    let videoUrl = '';
    if(model === 'wan/2-6-image-to-video'){
      setWanStatus('رفع الصورة...');
      imageUrl = await uploadKieBinaryFile(imageFile);
    }
    if(model === 'wan/2-6-video-to-video'){
      setWanStatus('رفع الفيديو...');
      videoUrl = await uploadKieBinaryFile(videoFile);
    }

    setWanStatus('إنشاء المهمة...');
    const input = { prompt, duration, resolution, multi_shots, aspect_ratio };
    if(imageUrl) input.image_urls = [imageUrl];
    if(videoUrl) input.video_urls = [videoUrl];

    const startResp = await fetch('/api/kie/wan/create', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ model, input })
    });
    const startData = await startResp.json();
    if(!startResp.ok || startData.error) throw new Error(extractApiErrorMessage(startData, 'فشل إنشاء مهمة Wan.'));
    if(!startData.taskId) throw new Error('لم يتم استلام Task ID من Wan');

    setWanStatus(`تم إنشاء المهمة: ${startData.taskId}`);
    const finalData = await pollWanTask(startData.taskId);
    const urls = Array.isArray(finalData.resultUrls) ? finalData.resultUrls : [];
    if(urls.length === 0) throw new Error('انتهت المهمة بدون روابط نتائج');
    urls.forEach(url => addResultItem('wan-results', url, true, prompt));
    setWanStatus('تم توليد النتائج.','success');
    AUTH.consumeCredits(_wCost);
  } catch(e){
    setWanStatus(String(e.message || e).substring(0,160), 'error');
    toast('خطأ: '+String(e.message || e).substring(0,140), 'error');
  } finally {
    if(btn){ btn.disabled = false; btn.textContent = original || 'Generate'; }
  }
}

function setFlux2Status(message, kind='info'){
  const el = document.getElementById('flux2-status');
  if(!el) return;
  el.textContent = message;
  el.style.color = kind === 'error' ? 'var(--red)' : kind === 'success' ? 'var(--green)' : 'var(--tx2)';
}

async function pollFlux2Task(taskId){
  for(let i=0; i<90; i++){
    await wait(5000);
    const r = await fetch(`/api/kie/flux2/status?taskId=${encodeURIComponent(taskId)}`);
    const d = await r.json();
    if(!r.ok || d.error) throw new Error(extractApiErrorMessage(d, 'تعذر متابعة مهمة Flux 2.'));
    if(d.failed) throw new Error(d.failMsg || `Flux 2 task failed: ${d.status || 'failed'}`);
    if(d.done) return d;
    setFlux2Status(`جاري التوليد... (${d.status || 'processing'})`);
  }
  throw new Error('انتهت المهلة قبل اكتمال Flux 2');
}

async function runFlux2(){
  const _f2Model = document.getElementById('flux2-model')?.value || 'flux-2/pro-image-to-image';
  const _f2Cost  = applyProfitMargin(calcCreditCost(_f2Model));
  if(!AUTH.checkCredits(_f2Cost)) return;
  const btn = document.getElementById('flux2-btn');
  const original = btn ? btn.textContent : '';
  try{
    const model = document.getElementById('flux2-model')?.value || 'flux-2/pro-image-to-image';
    const prompt = ensurePrompt(document.getElementById('flux2-prompt')?.value, 3, 'وصف الصورة');
    const aspect_ratio = document.getElementById('flux2-ratio')?.value || '1:1';
    const resolutionUi = document.getElementById('flux2-resolution')?.value || '2K';
    const resolution = mapUiResolution(resolutionUi, { '1K':'1K', '2K':'2K', '4K':'2K' }, '2K');
    const nsfw_checker = (document.getElementById('flux2-nsfw')?.value || 'true') === 'true';
    const info = FLUX2_MODEL_INFO[model] || FLUX2_MODEL_INFO['flux-2/pro-image-to-image'];

    if(info.requiresImages && !S.fluxFiles.length) throw new Error('ارفع صورة مرجعية واحدة على الأقل');
    if(!info.requiresImages && !aspect_ratio) throw new Error('اختر نسبة للصور');

    if(btn){ btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> إرسال إلى Flux 2...'; }
    clearResults('flux2-results');

    let input_urls = [];
    if(info.requiresImages){
      setFlux2Status('رفع الصور المرجعية...');
      const files = S.fluxFiles.slice(0, 8);
      input_urls = [];
      for (let i = 0; i < files.length; i++){
        const url = await uploadKieBinaryFile(files[i].file);
        input_urls.push(url);
      }
    }

    setFlux2Status('إنشاء المهمة...');
    const input = { prompt, aspect_ratio, resolution, nsfw_checker };
    if(input_urls.length) input.input_urls = input_urls;

    const startResp = await fetch('/api/kie/flux2/create', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ model, input })
    });
    const startData = await startResp.json();
    if(!startResp.ok || startData.error) throw new Error(extractApiErrorMessage(startData, 'فشل إنشاء مهمة Flux 2.'));
    if(!startData.taskId) throw new Error('لم يتم استلام Task ID من Flux 2');

    setFlux2Status(`تم إنشاء المهمة: ${startData.taskId}`);
    const finalData = await pollFlux2Task(startData.taskId);
    const urls = Array.isArray(finalData.resultUrls) ? finalData.resultUrls : [];
    if(urls.length === 0) throw new Error('انتهت المهمة بدون روابط نتائج');
    urls.forEach(url => addResultItem('flux2-results', url, false, prompt));
    setFlux2Status('تم توليد النتائج.','success');
    AUTH.consumeCredits(_f2Cost);
  } catch(e){
    setFlux2Status(String(e.message || e).substring(0,160), 'error');
    toast('خطأ: '+String(e.message || e).substring(0,140), 'error');
  } finally {
    if(btn){ btn.disabled = false; btn.textContent = original || 'Generate'; }
  }
}

function setFluxKontextStatus(message, kind='info'){
  const el = document.getElementById('fk-status');
  if(!el) return;
  el.textContent = message;
  el.style.color = kind === 'error' ? 'var(--red)' : kind === 'success' ? 'var(--green)' : 'var(--tx2)';
}

async function pollFluxKontextTask(taskId){
  for(let i=0; i<90; i++){
    await wait(5000);
    const r = await fetch(`/api/kie/flux-kontext/status?taskId=${encodeURIComponent(taskId)}`);
    const d = await r.json();
    if(!r.ok || d.error) throw new Error(extractApiErrorMessage(d, 'تعذر متابعة مهمة Flux Kontext.'));
    if(d.failed) throw new Error(d.failMsg || `Flux Kontext task failed: ${d.status || 'failed'}`);
    if(d.done) return d;
    setFluxKontextStatus(`جاري التوليد... (${d.status || 'processing'})`);
  }
  throw new Error('انتهت المهلة قبل اكتمال Flux Kontext');
}

async function runFluxKontext(){
  if(!AUTH.checkCredits(applyProfitMargin(7))) return;
  const btn = document.getElementById('fk-btn');
  const original = btn ? btn.textContent : '';
  try{
    const prompt = ensurePrompt(document.getElementById('fk-prompt')?.value, 3, 'الوصف');
    const enableTranslation = (document.getElementById('fk-translate')?.value || 'true') === 'true';
    const uploadCn = (document.getElementById('fk-upload-cn')?.value || 'false') === 'true';
    const mode = document.getElementById('fk-tab-edit')?.classList.contains('active') ? 'edit' : 'text';
    const ratioValue = document.getElementById('fk-ratio')?.value || '';
    const aspectRatio = mode === 'text' ? (ratioValue || '16:9') : ratioValue;
    const outputFormat = document.getElementById('fk-format')?.value || 'jpeg';
    const promptUpsampling = (document.getElementById('fk-upsampling')?.value || 'false') === 'true';
    const model = document.getElementById('fk-model')?.value || 'flux-kontext-pro';
    const safetyTolerance = parseInt(document.getElementById('fk-safety')?.value || '2', 10);
    const watermark = (document.getElementById('fk-watermark')?.value || '').trim();
    const imageFile = S.files['dz-fk-image'];

    if(mode === 'edit' && !imageFile) throw new Error('ارفع صورة مرجعية أولاً');

    if(btn){ btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> إرسال إلى Flux Kontext...'; }
    clearResults('fk-results');

    let inputImage = '';
    if(mode === 'edit' && imageFile){
      setFluxKontextStatus('رفع الصورة...');
      inputImage = await uploadKieBinaryFile(imageFile);
    }

    setFluxKontextStatus('إنشاء المهمة...');
    const payload = {
      prompt,
      enableTranslation,
      uploadCn,
      outputFormat,
      promptUpsampling,
      model,
      safetyTolerance
    };
    if(aspectRatio) payload.aspectRatio = aspectRatio;
    if(inputImage) payload.inputImage = inputImage;
    if(watermark) payload.watermark = watermark;

    const startResp = await fetch('/api/kie/flux-kontext/create', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    const startData = await startResp.json();
    if(!startResp.ok || startData.error) throw new Error(extractApiErrorMessage(startData, 'فشل إنشاء مهمة Flux Kontext.'));
    if(!startData.taskId) throw new Error('لم يتم استلام Task ID من Flux Kontext');

    setFluxKontextStatus(`تم إنشاء المهمة: ${startData.taskId}`);
    const finalData = await pollFluxKontextTask(startData.taskId);
    const urls = Array.isArray(finalData.resultUrls) ? finalData.resultUrls : [];
    if(urls.length === 0) throw new Error('انتهت المهمة بدون روابط نتائج');
    urls.forEach(url => addResultItem('fk-results', url, false, prompt));
    setFluxKontextStatus('تم توليد النتائج.','success');
    AUTH.consumeCredits(applyProfitMargin(7));
  } catch(e){
    setFluxKontextStatus(String(e.message || e).substring(0,160), 'error');
    toast('خطأ: '+String(e.message || e).substring(0,140), 'error');
  } finally {
    if(btn){ btn.disabled = false; btn.textContent = original || 'Generate'; }
  }
}

function applyEditPreset(kind, btn){
  const promptEl = document.getElementById('edit-prompt');
  const noteEl = document.getElementById('edit-preset-note');
  if(!promptEl) return;
  const presets = {
    remove_bg: {
      prompt: 'Remove the background completely. Keep only the main subject cleanly cut out with natural edges, preserve hair details, preserve face and body identity, transparent or plain studio background, no extra objects, no artifacts.',
      note: 'أداة إزالة الخلفية جهزت برومبت قصّ نظيف مع الحفاظ على تفاصيل الشعر والحواف.'
    },
    crop: {
      prompt: 'Reframe and crop the image around the main subject. Keep the same identity and expression. Improve composition, center the important area, remove unnecessary empty space, keep realistic proportions, clean final framing.',
      note: 'أداة القص جهزت برومبت لإعادة الكادر والتركيز على العنصر الأساسي.'
    },
    expand: {
      prompt: 'Outpaint and expand the image naturally beyond the original frame. Keep the same subject, same face, same lighting, same environment style, seamless continuation on all sides, realistic scene extension, no duplication artifacts.',
      note: 'أداة التوسيع جهزت برومبت outpaint لتمديد الصورة بشكل طبيعي.'
    },
    upscale: {
      prompt: 'Upscale the image to a cleaner high-detail version. Preserve the same subject and composition. Improve sharpness, skin detail, fabric detail, and overall clarity while avoiding overprocessing, extra fingers, or texture artifacts.',
      note: 'أداة التحسين جهزت برومبت لرفع الجودة والحدة بدون تشويه.'
    },
    camera: {
      prompt: 'Change the camera angle while keeping the same person, same identity, same clothing, and same scene style. Create a new cinematic angle with realistic perspective, natural body proportions, and consistent lighting.',
      note: 'أداة زاوية الكاميرا جهزت برومبت لتغيير اللقطة مع الحفاظ على الهوية.'
    }
  };
  const selected = presets[kind];
  if(!selected) return;
  promptEl.value = selected.prompt;
  if(noteEl) noteEl.textContent = selected.note;
  document.querySelectorAll('.edit-tool-btn').forEach(el=>el.classList.remove('active'));
  btn?.classList.add('active');
  toast('تم تجهيز الأداة داخل برومبت التعديل','success');
}

function applyProfessionalIcons(){
  const quickIcons = ['movie','checkroom','tune','view_in_ar','auto_stories','neurology','smart_display','graphic_eq','ink_pen','grid_view','hub'];
  document.querySelectorAll('.qcard .qcard-icon').forEach((el, index)=>{
    const name = quickIcons[index];
    if(name) el.innerHTML = `<span class="material-symbols-outlined">${name}</span>`;
  });
}

// ═══════════════════════════
// CONNECTION
// ═══════════════════════════
async function testConn() {
  try {
    const r = await fetch('/api/status');
    const d = await r.json();
    const dot = document.getElementById('statusDot');
    const txt = document.getElementById('statusText');
    const badge = document.getElementById('connBadge');
    if(d.connected) {
      dot.className='status-dot connected'; txt.textContent='متصل ✓';
      badge.textContent='● متصل'; badge.style.color='var(--green)';
      S.connected=true; toast('ComfyUI متصل ✓','success');
    } else throw new Error();
  } catch {
    document.getElementById('statusDot').className='status-dot error';
    document.getElementById('statusText').textContent='غير متصل';
    document.getElementById('connBadge').textContent='● غير متصل';
    document.getElementById('connBadge').style.color='var(--red)';
    S.connected=false; toast('ComfyUI غير متصل','error');
  }
}

// ═══════════════════════════
// FILE HANDLING
// ═══════════════════════════
function triggerUpload(id){ document.getElementById(id).click(); }

function renderDropzonePreview(dzId, file, url){
  const inner = document.getElementById(dzId+'-inner');
  if(!inner || !file) return;
  if(file.type.startsWith('audio/')){
    inner.innerHTML = `<div style="display:flex;flex-direction:column;gap:8px;align-items:center;"><div class="dz-icon">🎧</div><div class="dz-text">${file.name}</div><audio controls style="width:100%;max-width:260px;" src="${url}"></audio></div>`;
  } else if(file.type.startsWith('video/')){
    inner.innerHTML = `<div style="display:flex;flex-direction:column;gap:8px;align-items:center;"><div class="dz-text">${file.name}</div><video controls style="width:100%;max-width:260px;border-radius:10px;" src="${url}"></video></div>`;
  } else {
    inner.innerHTML = `<img src="${url}" class="dz-preview">`;
  }
}

function handleFile(input, dzId) {
  const file = input.files[0];
  if(!file) return;
  S.files[dzId] = file;
  const url = URL.createObjectURL(file);
  renderDropzonePreview(dzId, file, url);
  persistImageDropzone(dzId, file);
  toast(file.name,'info');
}

function matchesAccept(file, accept){
  if(!accept) return true;
  const rules = accept.split(',').map(r=>r.trim()).filter(Boolean);
  if(!rules.length) return true;
  return rules.some(rule=>{
    if(rule === '*/*') return true;
    if(rule.endsWith('/*')){
      const base = rule.slice(0, -1);
      return file.type.startsWith(base);
    }
    if(rule.startsWith('.')){
      return file.name.toLowerCase().endsWith(rule.toLowerCase());
    }
    return file.type === rule;
  });
}

function getDropzoneInputId(dz){
  const onclick = dz.getAttribute('onclick') || '';
  const match = onclick.match(/triggerUpload\('([^']+)'\)/);
  if(match) return match[1];
  const input = dz.parentElement?.querySelector('input[type="file"]');
  return input?.id || null;
}

function handleDropzoneFile(dz, file){
  if(!dz?.id || !file) return;
  S.files[dz.id] = file;
  const url = URL.createObjectURL(file);
  renderDropzonePreview(dz.id, file, url);
  if(file.type.startsWith('image/')) persistImageDropzone(dz.id, file);
  toast(file.name,'info');
}

function initGlobalDropzones(){
  document.querySelectorAll('.dropzone').forEach(dz=>{
    if(dz.dataset.multi === 'true') return;
    const stop = (e)=>{ e.preventDefault(); e.stopPropagation(); };
    ['dragenter','dragover','dragleave','drop'].forEach(evt=>{
      dz.addEventListener(evt, stop);
    });
    dz.addEventListener('dragenter', ()=>dz.classList.add('dragging'));
    dz.addEventListener('dragover', ()=>dz.classList.add('dragging'));
    dz.addEventListener('dragleave', ()=>dz.classList.remove('dragging'));
    dz.addEventListener('drop', (e)=>{
      dz.classList.remove('dragging');
      const files = Array.from(e.dataTransfer?.files || []);
      if(!files.length) return;
      const inputId = getDropzoneInputId(dz);
      const input = inputId ? document.getElementById(inputId) : null;
      const accept = input?.getAttribute('accept') || '';
      const match = files.find(f=>matchesAccept(f, accept)) || (accept ? null : files[0]);
      if(!match){
        toast('الملف غير مدعوم','error');
        return;
      }
      handleDropzoneFile(dz, match);
    });
  });
}

// Upload to ComfyUI via server proxy
async function uploadImage(dzId) {
  const file = S.files[dzId];
  if(!file) return null;
  const fd = new FormData();
  fd.append('image', file);
  const r = await fetch('/api/upload', {method:'POST', body:fd});
  const d = await r.json();
  if(d.error) throw new Error(d.error);
  return d.name;
}

function setPromptStudioStatus(message, kind='ok'){
  const el=document.getElementById('ps-status');
  if(!el) return;
  el.className=`ps-status ${kind==='error'?'err':'ok'}`;
  el.textContent=message;
}

function clearPromptStudioStatus(){
  const el=document.getElementById('ps-status');
  if(!el) return;
  el.className='ps-status';
  el.textContent='';
}

function wait(ms){ return new Promise(resolve=>setTimeout(resolve, ms)); }

function fillPromptIdea(el, text){
  document.querySelectorAll('.ps-pill').forEach(p=>p.classList.remove('active'));
  if(el) el.classList.add('active');
  const idea=document.getElementById('ps-idea');
  if(idea) idea.value=text;
}

  function promptStudioOutput(){
    return document.getElementById('ps-output');
  }

  // CONTROL PANEL (Local)
  const CONTROL_ADMIN_KEY = 'saad_control_admin_v1';
  const CONTROL_SESSION_KEY = 'saad_control_session_v1';
  let _adminCsrf = '';

  function getControlAdmin(){
    try{
      return JSON.parse(localStorage.getItem(CONTROL_ADMIN_KEY) || 'null');
    } catch {
      return null;
    }
  }

  async function hashText(text){
    const data = new TextEncoder().encode(String(text || ''));
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  function renderControlState(forceShow){
    const session = forceShow || getControlSession();
    const locked = document.getElementById('control-locked');
    const unlocked = document.getElementById('control-unlocked');
    if(locked) locked.style.display = session ? 'none' : 'flex';
    if(unlocked) unlocked.style.display = session ? 'flex' : 'none';
  }

  async function verifyAndRenderControl(){
    const navControl = document.getElementById('nav-control');
    try{
      const r = await fetch('/api/admin/session', { credentials: 'same-origin' });
      if(!r.ok){
        _adminCsrf = '';
        localStorage.removeItem(CONTROL_SESSION_KEY);
        if(navControl) navControl.style.display = 'none';
        renderControlState();
        return;
      }
      const d = await r.json();
      _adminCsrf = d.csrfToken || '';
      localStorage.setItem(CONTROL_SESSION_KEY, JSON.stringify({ ts: Date.now() }));
      if(navControl) navControl.style.display = '';
      renderControlState(true);
      adminTab('orders');
      adminLoadOrders();
      adminLoadUsers();
    } catch(_){
      _adminCsrf = '';
      if(navControl) navControl.style.display = 'none';
      renderControlState();
    }
  }

  function getControlSession(){
    try{
      return JSON.parse(localStorage.getItem(CONTROL_SESSION_KEY) || 'null');
    } catch {
      return null;
    }
  }

  async function controlSaveAdmin(){
    const email = (document.getElementById('control-email')?.value || '').trim();
    const pass = (document.getElementById('control-password')?.value || '').trim();
    if(!email || !pass){
      toast('أدخل البريد وكلمة المرور أولاً','error');
      return;
    }
    const hash = await hashText(pass);
    localStorage.setItem(CONTROL_ADMIN_KEY, JSON.stringify({ email, hash }));
    toast('تم حفظ المدير المحلي','success');
  }

  async function controlLogin(){
    const username = (document.getElementById('control-username')?.value || '').trim();
    const pass     = (document.getElementById('control-password')?.value || '').trim();
    if(!username){ toast('أدخل اسم المستخدم','error'); return; }
    if(!pass){ toast('أدخل كلمة المرور','error'); return; }

    const btn = document.querySelector('#control-locked .btn-generate');
    if(btn){ btn.disabled = true; btn.textContent = '...'; }
    try{
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email: username, password: pass })
      });
      const data = await r.json();
      if(r.ok && data.user && data.user.role === 'admin' && data.csrfToken){
        _adminCsrf = data.csrfToken;
        localStorage.setItem(CONTROL_SESSION_KEY, JSON.stringify({ ts: Date.now() }));
        document.getElementById('nav-control').style.display = '';
        renderControlState(true);
        adminTab('orders');
        adminLoadOrders();
        toast('أهلاً بك في لوحة التحكم ✓','success');
      } else {
        toast(data.error || 'اسم المستخدم أو كلمة المرور غير صحيحة','error');
        document.getElementById('control-password').value = '';
      }
    } catch(e){
      toast('خطأ في الاتصال بالخادم','error');
    } finally {
      if(btn){ btn.disabled = false; btn.textContent = 'دخول لوحة التحكم'; }
    }
  }

  async function controlLogout(){
    try{ await fetch('/api/admin/logout', { method:'POST', headers:{'x-csrf-token':_adminCsrf}, credentials:'same-origin' }); } catch(_){}
    _adminCsrf = '';
    localStorage.removeItem(CONTROL_SESSION_KEY);
    const navControl = document.getElementById('nav-control');
    if(navControl) navControl.style.display = 'none';
    renderControlState();
    showPage('home', document.querySelector('.nav-item'));
    toast('تم تسجيل الخروج من لوحة التحكم','info');
  }

  // ── User credits bar + Control Panel visibility ────
  function syncUserCreditsBar(){
    const user = AUTH.getUser();
    const bar  = document.getElementById('user-credits-bar');
    const navControl = document.getElementById('nav-control');
    // Credits bar always hidden from main page
    if(bar) bar.style.display = 'none';
    // If a regular subscriber is logged in → clear admin state and hide nav immediately
    if(user){
      _adminCsrf = '';
      localStorage.removeItem(CONTROL_SESSION_KEY);
      if(navControl) navControl.style.display = 'none';
      return;
    }
    // No regular user logged in → check for admin session
    if(navControl) navControl.style.display = 'none';
    verifyAndShowControlNav();
  }

  async function verifyAndShowControlNav(){
    // Never show admin nav if a regular user is logged in
    if(AUTH.getUser()){ return; }
    const navControl = document.getElementById('nav-control');
    if(!navControl) return;
    try{
      const r = await fetch('/api/admin/session', { credentials: 'same-origin' });
      if(r.ok){
        const d = await r.json();
        _adminCsrf = d.csrfToken || '';
        navControl.style.display = '';
      } else {
        navControl.style.display = 'none';
        _adminCsrf = '';
        localStorage.removeItem(CONTROL_SESSION_KEY);
      }
    } catch(_){ navControl.style.display = 'none'; }
  }


  // Sync nav-dashboard visibility with nav-control
  (function syncDashboardNav(){
    const navCtrl = document.getElementById('nav-control');
    const navDash = document.getElementById('nav-dashboard');
    if(!navCtrl || !navDash) return;
    const obs = new MutationObserver(() => {
      navDash.style.display = navCtrl.style.display;
    });
    obs.observe(navCtrl, { attributes: true, attributeFilter: ['style'] });
    navDash.style.display = navCtrl.style.display;
  })();

  function adminFetchOpts(extra){
    const base = { headers: { 'Content-Type':'application/json', 'x-csrf-token': _adminCsrf||'' }, credentials: 'same-origin' };
    if(!extra) return base;
    return Object.assign(base, extra, { headers: Object.assign(base.headers, extra.headers || {}) });
  }
  function adminHeaders(){ return { 'Content-Type':'application/json', 'x-csrf-token': _adminCsrf||'' }; }

  function adminTab(name){
    document.getElementById('adm-panel-orders').style.display = name==='orders' ? '' : 'none';
    document.getElementById('adm-panel-users').style.display  = name==='users'  ? '' : 'none';
    document.getElementById('adm-tab-orders').classList.toggle('adm-tab-active', name==='orders');
    document.getElementById('adm-tab-users').classList.toggle('adm-tab-active', name==='users');
  }

  async function adminLoadOrders(){
    const list = document.getElementById('adm-orders-list');
    if(!list) return;
    list.innerHTML = '<div style="color:var(--tx2);font-size:12px;padding:10px;">جاري التحميل...</div>';
    try{
      const r = await fetch('/api/admin/orders', { headers: adminHeaders(), credentials: 'same-origin' });
      if(!r.ok){ list.innerHTML = '<div style="color:#f36;font-size:12px;padding:10px;">فشل تحميل الطلبات — تحقق من تسجيل الدخول</div>'; return; }
      const { orders } = await r.json();
      const badge = document.getElementById('adm-orders-badge');
      const pending = orders.filter(o => o.status==='pending');
      if(badge) badge.textContent = pending.length || '';
      if(!orders.length){ list.innerHTML = '<div style="color:var(--tx2);font-size:12px;padding:10px;">لا توجد طلبات بعد</div>'; return; }
      list.innerHTML = orders.map(o => `
        <div class="adm-order-card ${o.status}" id="ocard-${o.id}">
          <div class="adm-order-info">
            <div class="adm-order-email">${o.email}</div>
            <div class="adm-order-meta">💰 $${o.pack} → ${o.credits.toLocaleString()} كريدت &nbsp;|&nbsp; ${new Date(o.createdAt).toLocaleString('ar-SA')}</div>
            <span class="adm-order-status ${o.status}">${o.status==='pending'?'معلّق':o.status==='approved'?'موافق عليه':'مرفوض'}</span>
          </div>
          <div class="adm-order-actions">
            ${o.status==='pending' ? `
              <button class="adm-btn-approve" onclick="adminApproveOrder('${o.id}')">✓ قبول</button>
              <button class="adm-btn-reject"  onclick="adminRejectOrder('${o.id}')">✕ رفض</button>
            ` : ''}
          </div>
        </div>`).join('');
    } catch(e){ list.innerHTML = `<div style="color:#f36;font-size:12px;padding:10px;">${e.message}</div>`; }
  }

  async function adminApproveOrder(id){
    try{
      const r = await fetch(`/api/admin/orders/${id}/approve`, { method:'POST', headers: adminHeaders(), credentials: 'same-origin' });
      const d = await r.json();
      if(!r.ok) throw new Error(d.error || 'خطأ');
      toast(`تمت الموافقة ✓  الرصيد الجديد: ${d.credits?.toLocaleString()}`, 'success');
      adminLoadOrders();
    } catch(e){ toast('خطأ: '+e.message,'error'); }
  }

  async function adminRejectOrder(id){
    if(!confirm('هل تريد رفض هذا الطلب؟')) return;
    try{
      const r = await fetch(`/api/admin/orders/${id}/reject`, { method:'POST', headers: adminHeaders(), credentials: 'same-origin' });
      const d = await r.json();
      if(!r.ok) throw new Error(d.error || 'خطأ');
      toast('تم رفض الطلب','info');
      adminLoadOrders();
    } catch(e){ toast('خطأ: '+e.message,'error'); }
  }

  async function adminLoadUsers(){
    const list = document.getElementById('adm-users-list');
    if(!list) return;
    list.innerHTML = '<div style="color:var(--tx2);font-size:12px;padding:10px;">جاري التحميل...</div>';
    try{
      const r = await fetch('/api/admin/users', { headers: adminHeaders(), credentials: 'same-origin' });
      if(!r.ok){ list.innerHTML = '<div style="color:#f36;font-size:12px;padding:10px;">فشل التحميل</div>'; return; }
      const { users } = await r.json();
      if(!users.length){ list.innerHTML = '<div style="color:var(--tx2);font-size:12px;padding:10px;">لا يوجد مستخدمون بعد</div>'; return; }
      list.innerHTML = users.map(u => {
        const cur = u.credits || 0;
        const max = u.maxCredits || 1;
        const pct = Math.min(100, Math.round(cur / max * 100));
        const barColor = pct > 60 ? 'var(--cyan)' : pct > 25 ? '#f5a623' : '#f23b6e';
        return `
        <div class="adm-user-card" id="ucard-${u.id}">
          <div class="adm-user-top">
            <span class="adm-user-email">${u.email}</span>
            <span class="topbar-plan-badge ${u.plan||'starter'}">${u.plan||'starter'}</span>
          </div>
          <!-- Credits bar -->
          <div style="margin:8px 0 4px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <span style="font-size:11px;color:var(--tx2);">💳 الكريدت</span>
              <span style="font-size:12px;font-weight:700;color:${barColor};">${cur.toLocaleString()} <span style="color:var(--tx2);font-weight:400;">/ ${max.toLocaleString()}</span></span>
            </div>
            <div class="adm-credits-bar-wrap">
              <div class="adm-credits-bar-fill" style="width:${pct}%;background:${barColor};"></div>
            </div>
            <div style="text-align:left;font-size:10px;color:var(--tx2);margin-top:2px;">${pct}%</div>
          </div>
          <!-- Credit actions -->
          <div class="adm-user-actions" style="margin-top:8px;">
            <input class="adm-credits-input" type="number" id="uci-${u.id}" placeholder="الكمية" min="1" style="width:90px;">
            <button class="adm-btn-add" onclick="adminChangeCredits('${u.id}',1)">➕ إضافة</button>
            <button class="adm-btn-sub" onclick="adminChangeCredits('${u.id}',-1)">➖ خصم</button>
          </div>
          <!-- Dates row -->
          <div style="display:flex;gap:16px;margin:6px 0 2px;flex-wrap:wrap;">
            <span style="font-size:11px;color:var(--tx2);">📅 الاشتراك: <b style="color:rgba(255,255,255,.7);">${u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-SA') : '—'}</b></span>
            ${u.renewDate && u.plan !== 'starter' ? (() => { const diff=Math.ceil((new Date(u.renewDate)-new Date())/(1000*60*60*24)); const col=diff<=5?'#f23b6e':diff<=10?'#f5a623':'var(--cyan)'; return `<span style="font-size:11px;color:var(--tx2);">⏳ ينتهي: <b style="color:${col};">${new Date(u.renewDate).toLocaleDateString('ar-SA')} (${diff} يوم)</b></span>`; })() : '<span style="font-size:11px;color:var(--tx2);">⏳ لا يوجد اشتراك نشط</span>'}
          </div>
          <!-- Plan actions -->
          <div class="adm-user-actions" style="margin-top:6px;">
            <select class="adm-plan-select" id="upl-${u.id}">
              <option value="starter" ${u.plan==='starter'?'selected':''}>Starter</option>
              <option value="pro"     ${u.plan==='pro'    ?'selected':''}>Pro</option>
              <option value="creator" ${u.plan==='creator'?'selected':''}>Creator</option>
            </select>
            <button class="adm-btn-plan" onclick="adminChangePlan('${u.id}')">✓ تغيير الخطة</button>
            <button onclick="adminKickUser('${u.id}','${u.email}')" style="margin-right:6px;padding:5px 10px;background:rgba(255,60,60,.12);border:1px solid rgba(255,60,60,.3);color:#ff6060;border-radius:7px;cursor:pointer;font-size:11px;font-weight:700;">⛔ طرد</button>
          </div>
        </div>`;
      }).join('');
    } catch(e){ list.innerHTML = `<div style="color:#f36;font-size:12px;padding:10px;">${e.message}</div>`; }
  }

  async function adminChangeCredits(userId, sign){
    const val = Number(document.getElementById(`uci-${userId}`)?.value || 0);
    if(val <= 0){ toast('أدخل قيمة أكبر من صفر','error'); return; }
    const amount = sign * val;
    const label = sign > 0 ? `إضافة ${val.toLocaleString()}` : `خصم ${val.toLocaleString()}`;
    try{
      const r = await fetch(`/api/admin/users/${userId}/credits`, {
        method:'POST', headers: adminHeaders(), credentials: 'same-origin', body: JSON.stringify({ amount })
      });
      const d = await r.json();
      if(!r.ok) throw new Error(d.error);
      toast(`✓ ${label} كريدت — الرصيد: ${(d.credits||0).toLocaleString()}`, 'success');
      adminLoadUsers();
    } catch(e){ toast('خطأ: '+e.message,'error'); }
  }

  async function adminKickUser(userId, email){
    if(!confirm(`هل تريد طرد المستخدم ${email}؟ سيتم تسجيل خروجه فوراً.`)) return;
    try{
      const r = await fetch(`/api/admin/users/${userId}/kick`, { method:'POST', headers: adminHeaders(), credentials: 'same-origin' });
      const d = await r.json();
      if(!r.ok) throw new Error(d.error);
      toast(`⛔ تم طرد ${email}`, 'success');
      adminLoadUsers();
    } catch(e){ toast('خطأ: '+e.message,'error'); }
  }

  async function adminChangePlan(userId){
    const plan = document.getElementById(`upl-${userId}`)?.value;
    if(!plan) return;
    try{
      const r = await fetch(`/api/admin/users/${userId}/plan`, {
        method:'POST', headers: adminHeaders(), credentials: 'same-origin', body: JSON.stringify({ plan })
      });
      const d = await r.json();
      if(!r.ok) throw new Error(d.error);
      toast(`تم تغيير الخطة إلى ${plan} ✓`, 'success');
      adminLoadUsers();
    } catch(e){ toast('خطأ: '+e.message,'error'); }
  }

  // ── Top-up order request (user) ────────────────────
  async function requestTopup(pack, credits){
    const user = AUTH.getUser();
    if(!user){ openAuthModal('login'); toast('سجّل دخولك أولاً لإرسال طلب الشراء','error'); return; }
    if(!confirm(`سيتم إرسال طلب شراء ${credits.toLocaleString()} كريدت مقابل $${pack} — سيتم إضافة الرصيد بعد موافقة المدير`)) return;
    try{
      const r = await fetch('/api/auth/order', {
        method:'POST',
        headers: AUTH.headers(),
        body: JSON.stringify({ pack })
      });
      const d = await r.json();
      if(!r.ok){ toast(d.error || 'خطأ في الطلب','error'); return; }
      toast(`✓ تم إرسال طلبك (${credits.toLocaleString()} كريدت) — انتظر موافقة المدير 🎉`, 'success');
    } catch(e){ toast('خطأ في الاتصال','error'); }
  }

  async function fileToDataUrl(file){
    return await new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(String(reader.result||''));
      reader.onerror=()=>reject(new Error('تعذر قراءة الملف'));
      reader.readAsDataURL(file);
    });
  }

  function parseRatioValue(ratio){
    const parts = String(ratio || '').split(':');
    if(parts.length !== 2) return null;
    const w = Number(parts[0]);
    const h = Number(parts[1]);
    if(!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
    return w / h;
  }

  function mapUiResolution(uiValue, map, fallback){
    if(!uiValue) return fallback || '';
    if(map && Object.prototype.hasOwnProperty.call(map, uiValue)) return map[uiValue];
    return fallback || uiValue;
  }

  function mapKlingModeFromResolution(uiValue){
    if(uiValue === 'std' || uiValue === 'pro') return uiValue;
    return uiValue === '1K' ? 'std' : 'pro';
  }

  function getQualityBase(quality){
    const q = String(quality || '').toUpperCase();
    if(q === '4K') return 4096;
    if(q === '2K') return 2048;
    return 1024;
  }

  function getGoogleTargetSize(ratio, quality){
    const r = parseRatioValue(ratio);
    if(!r) return null;
    const base = getQualityBase(quality);
    if(r >= 1){
      return { width: base, height: Math.max(1, Math.round(base / r)) };
    }
    return { width: Math.max(1, Math.round(base * r)), height: base };
  }

  async function loadImageFromDataUrl(dataUrl){
    return await new Promise((resolve, reject)=>{
      const img = new Image();
      img.onload = ()=>resolve(img);
      img.onerror = ()=>reject(new Error('تعذر تحميل الصورة'));
      img.src = dataUrl;
    });
  }

  async function resizeDataUrlCover(dataUrl, width, height){
    if(!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) return dataUrl;
    if(!width || !height) return dataUrl;
    const img = await loadImageFromDataUrl(dataUrl);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if(!ctx) return dataUrl;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const scale = Math.max(width / img.width, height / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const dx = (width - drawW) / 2;
    const dy = (height - drawH) / 2;
    ctx.drawImage(img, dx, dy, drawW, drawH);
    return canvas.toDataURL('image/png');
  }

async function uploadKieBinaryFile(file){
  const fd = new FormData();
  fd.append('file', file);
  const r = await fetch('/api/kie/upload-file',{
    method:'POST',
    body:fd
  });
  const d = await r.json();
  if(!r.ok || d.error) throw new Error(extractApiErrorMessage(d, 'فشل رفع الملف إلى Kie.'));
  if(!d.url) throw new Error('لم يتم استلام رابط الملف');
  return d.url;
}

async function dataUrlToFile(dataUrl, filename='image.png'){
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || 'image/png' });
}

const GOOGLE_IMAGE_TOOL_CONFIG = {
  nano: {
    title: 'Nano Banana',
    model: 'gemini-3.1-flash-image-preview',
    resultId: 'g-nano-results',
    promptId: 'g-nano-prompt',
    negId: 'g-nano-neg',
    ratioId: 'g-nano-ratio',
    qualityId: 'g-nano-quality',
    fileKey: 'dz-g-nano',
    buttonId: 'g-nano-btn',
    cost(quality){ return 0.039; },
    instruction: 'Fast clean image generation or light edit with simple composition and high clarity.'
  },
  nano2: {
    title: 'Nano Banana 2',
    model: 'gemini-3.1-flash-image-preview',
    resultId: 'g-nano2-results',
    promptId: 'g-nano2-prompt',
    negId: 'g-nano2-neg',
    ratioId: 'g-nano2-ratio',
    qualityId: 'g-nano2-quality',
    fileKey: 'dz-g-nano2',
    buttonId: 'g-nano2-btn',
    cost(quality){ return 0.039; },
    instruction: 'Advanced generation or edit with stronger detail, better consistency, and premium realism.'
  },
  nanopro: {
    title: 'Nano Banana Pro',
    model: 'gemini-3-pro-image-preview',
    resultId: 'g-nanopro-results',
    promptId: 'g-nanopro-prompt',
    negId: 'g-nanopro-neg',
    ratioId: 'g-nanopro-ratio',
    qualityId: 'g-nanopro-quality',
    fileKey: 'dz-g-nanopro',
    buttonId: 'g-nanopro-btn',
    cost(quality){ return quality === '4K' ? 0.24 : 0.134; },
    instruction: 'Professional grade generation or redesign with richer composition, cinematic polish, and stronger art direction.'
  }
};

let googleBarState = {
  model: 'nanopro',
  ratio: '16:9',
  quality: '2K',
  count: 1,
  unlimited: true,
  extra: false,
  draw: false,
  prompt: ''
};

function initGoogleBar(saved){
  if(saved && typeof saved === 'object'){
    googleBarState = Object.assign({}, googleBarState, saved);
  }
  const promptEl = document.getElementById('gbar-prompt');
  if(promptEl){
    promptEl.value = googleBarState.prompt || '';
    promptEl.addEventListener('input', ()=>{
      googleBarState.prompt = promptEl.value;
      saveUiState({ googleBar: googleBarState });
    });
  }
  syncGbarModel(googleBarState.model);
  setGbarChoice('ratio', googleBarState.ratio, true);
  setGbarChoice('quality', googleBarState.quality, true);
  updateGbarCount(true);
  syncGbarToggles(true);
  renderGbarUploads();
  initGbarDragDrop();
  document.addEventListener('click', (e)=>{
    // Close model menu
    const wrap = document.getElementById('gbar-model-wrap');
    if(wrap && !wrap.contains(e.target)) wrap.classList.remove('open');
    // Close ratio dropdown
    const ratioWrap = document.getElementById('gbar-ratio-ddwrap');
    if(ratioWrap && !ratioWrap.contains(e.target)) ratioWrap.classList.remove('open');
  });
}

function initGbarDragDrop(){
  const wrap = document.getElementById('gbar-input-wrap');
  if(!wrap) return;
  const dropHint = document.getElementById('gbar-drop-hint');
  const stop = (e)=>{ e.preventDefault(); e.stopPropagation(); };
  ['dragenter','dragover','dragleave','drop'].forEach(evt=>{
    wrap.addEventListener(evt, stop);
  });
  wrap.addEventListener('dragenter', ()=>{
    wrap.classList.add('dragging');
    if(dropHint) dropHint.textContent = 'Drop images here';
  });
  wrap.addEventListener('dragover', ()=>{
    wrap.classList.add('dragging');
  });
  wrap.addEventListener('dragleave', ()=>{
    wrap.classList.remove('dragging');
  });
  wrap.addEventListener('drop', (e)=>{
    wrap.classList.remove('dragging');
    const files = Array.from(e.dataTransfer?.files || []).filter(f=>f.type.startsWith('image/'));
    if(!files.length){
      if(dropHint) dropHint.textContent = 'Images only';
      setTimeout(()=>{ if(dropHint) dropHint.textContent = 'Drop images here'; }, 1200);
      return;
    }
    addGbarFiles(files);
  });
}

function addGbarFiles(files){
  files.forEach(file=>{
    if(!file) return;
    if(S.gbarFiles.length >= 8) return;
    const url = URL.createObjectURL(file);
    S.gbarFiles.push({ id: `${Date.now()}-${Math.random()}`, file, url });
  });
  renderGbarUploads();
}

function toggleGbarModels(){
  const wrap = document.getElementById('gbar-model-wrap');
  if(wrap) wrap.classList.toggle('open');
}

function filterGbarModels(value){
  const term = (value || '').toLowerCase().trim();
  document.querySelectorAll('#gbar-model-menu .gbar-model-item').forEach(item=>{
    const name = (item.dataset.name || '').toLowerCase();
    item.style.display = name.includes(term) ? 'flex' : 'none';
  });
}

function setGbarModel(model, silent){
  if(!GOOGLE_IMAGE_TOOL_CONFIG[model]) return;
  googleBarState.model = model;
  const cfg = GOOGLE_IMAGE_TOOL_CONFIG[model];
  // Update label span (new design) without clobbering G icon + chevron
  const labelEl = document.getElementById('gbar-model-label');
  if(labelEl) labelEl.textContent = cfg.title || model;
  // Legacy: if old design still has full-text button, update it
  const btn = document.getElementById('gbar-model-btn');
  if(btn && !labelEl) btn.textContent = cfg.title || model;
  document.querySelectorAll('#gbar-model-menu .gbar-model-item').forEach(item=>{
    const isActive = item.dataset.model === model;
    item.classList.toggle('active', isActive);
  });
  if(!silent){
    setGoogleTab(model);
  }
  saveUiState({ googleBar: googleBarState });
  const wrap = document.getElementById('gbar-model-wrap');
  if(wrap) wrap.classList.remove('open');
}

function syncGbarModel(model){
  setGbarModel(model, true);
}

function setGbarChoice(group, value, silent){
  googleBarState[group] = value;
  if(group !== 'quality' && group !== 'ratio'){
    document.querySelectorAll(`[data-gbar-group="${group}"]`).forEach(btn=>{
      btn.classList.toggle('active', btn.dataset.value === value);
    });
  }
  const qualitySelect = document.getElementById('gbar-quality');
  if(group === 'quality' && qualitySelect){ qualitySelect.value = value; }
  // Update quality label
  const qualityLabel = document.getElementById('gbar-quality-label');
  if(group === 'quality' && qualityLabel){ qualityLabel.textContent = value; }
  // Sync quality pill buttons active state
  if(group === 'quality'){
    const qParent = qualitySelect && qualitySelect.previousElementSibling;
    if(qParent && qParent.classList.contains('qw2-btn-group')){
      qParent.querySelectorAll('.qw2-opt').forEach(btn=>{
        btn.classList.toggle('active', btn.textContent.trim() === value);
      });
    }
  }
  const ratioSelect = document.getElementById('gbar-ratio');
  if(group === 'ratio' && ratioSelect){ ratioSelect.value = value; }
  // Update ratio label
  const ratioLabel = document.getElementById('gbar-ratio-label');
  if(group === 'ratio' && ratioLabel){ ratioLabel.textContent = value; }
  // Sync ratio pill buttons active state
  if(group === 'ratio'){
    document.querySelectorAll('.gbar-ratio-pill').forEach(btn=>{
      btn.classList.toggle('active', btn.dataset.ratio === value);
    });
    // Also sync qw2-opt ratio buttons by matching text
    const rParent = ratioSelect && ratioSelect.parentElement;
    if(rParent){
      rParent.querySelectorAll('.qw2-btn-group .qw2-opt').forEach(btn=>{
        btn.classList.toggle('active', btn.textContent.trim() === value);
      });
    }
  }
  if(!silent){
    saveUiState({ googleBar: googleBarState });
  }
}

function setGbarRatioPill(value){
  setGbarChoice('ratio', value);
  // Close ratio dropdown
  const ddwrap = document.getElementById('gbar-ratio-ddwrap');
  if(ddwrap) ddwrap.classList.remove('open');
}

function cycleGbarQuality(){
  const opts = ['1K','2K','4K'];
  const cur = googleBarState.quality || '2K';
  const next = opts[(opts.indexOf(cur) + 1) % opts.length];
  setGbarChoice('quality', next);
}

function toggleGbarDD(wrapperId){
  const wrap = document.getElementById(wrapperId);
  if(!wrap) return;
  const isOpen = wrap.classList.contains('open');
  // Close all dropdowns first
  document.querySelectorAll('.gbar-dd-wrap.open').forEach(w=>w.classList.remove('open'));
  if(!isOpen) wrap.classList.add('open');
}

function updateGbarCount(silent){
  const val = Math.max(1, Math.min(4, Number(googleBarState.count || 1)));
  googleBarState.count = val;
  const label = document.getElementById('gbar-count-val');
  if(label) label.textContent = `${val}/4`;
  // Sync count buttons active state
  const countWrap = label && label.parentElement;
  if(countWrap){
    countWrap.querySelectorAll('.qw2-opt').forEach(btn=>{
      btn.classList.toggle('active', btn.textContent.trim() === String(val));
    });
  }
  if(!silent){
    saveUiState({ googleBar: googleBarState });
  }
}

function adjustGbarCount(delta){
  googleBarState.count = Math.max(1, Math.min(4, (Number(googleBarState.count || 1) + delta)));
  updateGbarCount();
}
function setNanoCount(n){
  googleBarState.count = n;
  updateGbarCount();
}

function syncGbarToggles(silent){
  const unlimited = document.getElementById('gbar-unlimited');
  const extra = document.getElementById('gbar-extra');
  const draw = document.getElementById('gbar-draw');
  if(unlimited) unlimited.classList.toggle('active', !!googleBarState.unlimited);
  if(extra) extra.classList.toggle('active', !!googleBarState.extra);
  if(draw) draw.classList.toggle('active', !!googleBarState.draw);
  if(unlimited) unlimited.classList.toggle('highlight', !!googleBarState.unlimited);
  if(!silent){
    saveUiState({ googleBar: googleBarState });
  }
}

function toggleGbarToggle(key){
  if(!(key in googleBarState)) return;
  googleBarState[key] = !googleBarState[key];
  syncGbarToggles();
}

function triggerGoogleImageUpload(){
  const input = document.getElementById('gbar-upload');
  if(input) input.click();
}

function handleGbarUpload(input){
  const files = Array.from(input.files || []);
  if(!files.length) return;
  addGbarFiles(files);
  input.value = '';
}

function renderGbarUploads(){
  const list = document.getElementById('gbar-upload-list');
  if(!list) return;
  list.innerHTML = '';
  if(!S.gbarFiles.length){
    list.style.display = 'none';
    return;
  }
  list.style.display = 'flex';
  S.gbarFiles.forEach(item=>{
    const thumb = document.createElement('div');
    thumb.className = 'gbar-upload-thumb';
    thumb.style.backgroundImage = `url(${item.url})`;
    const remove = document.createElement('button');
    remove.className = 'gbar-upload-remove';
    remove.type = 'button';
    remove.textContent = '×';
    remove.onclick = ()=>removeGbarUpload(item.id);
    thumb.appendChild(remove);
    list.appendChild(thumb);
  });
}

function removeGbarUpload(id){
  const idx = S.gbarFiles.findIndex(f=>f.id === id);
  if(idx >= 0){
    const [entry] = S.gbarFiles.splice(idx, 1);
    if(entry?.url) URL.revokeObjectURL(entry.url);
  }
  renderGbarUploads();
}

function triggerFluxUpload(){
  const input = document.getElementById('flux2-upload');
  if(input) input.click();
}

function addFluxFiles(files){
  files.forEach(file=>{
    if(!file || !file.type.startsWith('image/')) return;
    if(S.fluxFiles.length >= 8) return;
    const url = URL.createObjectURL(file);
    S.fluxFiles.push({ id: `${Date.now()}-${Math.random()}`, file, url });
  });
  renderFluxUploads();
}

function handleFluxUpload(input){
  const files = Array.from(input.files || []);
  if(!files.length) return;
  addFluxFiles(files);
  input.value = '';
}

function renderFluxUploads(){
  const list = document.getElementById('flux2-upload-list');
  const hint = document.getElementById('flux2-upload-hint');
  if(!list) return;
  list.innerHTML = '';
  if(!S.fluxFiles.length){
    list.style.display = 'none';
    if(hint) hint.style.display = '';
    return;
  }
  list.style.display = 'flex';
  if(hint) hint.style.display = 'none';
  S.fluxFiles.forEach(item=>{
    const thumb = document.createElement('div');
    thumb.className = 'gbar-upload-thumb';
    thumb.style.backgroundImage = `url(${item.url})`;
    const remove = document.createElement('button');
    remove.className = 'gbar-upload-remove';
    remove.type = 'button';
    remove.textContent = '×';
    remove.onclick = ()=>removeFluxUpload(item.id);
    thumb.appendChild(remove);
    list.appendChild(thumb);
  });
}

function removeFluxUpload(id){
  const idx = S.fluxFiles.findIndex(f=>f.id === id);
  if(idx >= 0){
    const [entry] = S.fluxFiles.splice(idx, 1);
    if(entry?.url) URL.revokeObjectURL(entry.url);
  }
  renderFluxUploads();
}

function initFluxDropzone(){
  const dz = document.getElementById('flux2-dropzone');
  if(!dz) return;
  const stop = (e)=>{ e.preventDefault(); e.stopPropagation(); };
  ['dragenter','dragover','dragleave','drop'].forEach(evt=>{
    dz.addEventListener(evt, stop);
  });
  dz.addEventListener('dragenter', ()=>dz.classList.add('dragging'));
  dz.addEventListener('dragover', ()=>dz.classList.add('dragging'));
  dz.addEventListener('dragleave', ()=>dz.classList.remove('dragging'));
  dz.addEventListener('drop', (e)=>{
    dz.classList.remove('dragging');
    const files = Array.from(e.dataTransfer?.files || []).filter(f=>f.type.startsWith('image/'));
    if(!files.length){
      toast('الملف غير مدعوم','error');
      return;
    }
    addFluxFiles(files);
  });
}

function runGoogleFromBar(){
  S.gbarTrigger = true;
  const cfg = GOOGLE_IMAGE_TOOL_CONFIG[googleBarState.model];
  if(!cfg) return;
  // Find the actual visible generate button (nano page has btn-generate, google page has .gbar-gen)
  const callerBtn = document.querySelector('.btn-generate.gen-action') || document.querySelector('#gbar .gbar-gen');
  const callerOriginal = callerBtn ? callerBtn.innerHTML : '';
  if(callerBtn){ callerBtn.disabled = true; callerBtn.innerHTML = '<div class="spinner"></div> جارٍ التوليد...'; }
  const promptEl = document.getElementById('gbar-prompt');
  if(promptEl) googleBarState.prompt = promptEl.value;
  if(S.gbarFiles.length){
    const primary = S.gbarFiles[0];
    S.files[cfg.fileKey] = primary.file;
    renderDropzonePreview(cfg.fileKey, primary.file, primary.url);
    persistImageDropzone(cfg.fileKey, primary.file);
  } else {
    delete S.files[cfg.fileKey];
  }
  const promptTarget = document.getElementById(cfg.promptId);
  const ratioTarget = document.getElementById(cfg.ratioId);
  const qualityTarget = document.getElementById(cfg.qualityId);
  if(promptTarget) promptTarget.value = googleBarState.prompt || '';
  if(ratioTarget) ratioTarget.value = googleBarState.ratio || ratioTarget.value;
  if(qualityTarget) qualityTarget.value = googleBarState.quality || qualityTarget.value;
  saveUiState({ googleBar: googleBarState, nanoTab: googleBarState.model });
  setNanoTab(googleBarState.model);
  runGoogleImageTool(googleBarState.model).finally(()=>{
    if(callerBtn){ callerBtn.disabled = false; callerBtn.innerHTML = callerOriginal; }
  });
}

function toggleGoogleProducts(force){
  const page = document.getElementById('page-google');
  if(!page) return;
  const open = typeof force === 'boolean' ? force : !page.classList.contains('g-products-open');
  page.classList.toggle('g-products-open', open);
  const btn = document.getElementById('gbar-products-btn');
  if(btn) btn.classList.toggle('active', open);
  if(open){
    const ui = loadUiState();
    const target = ui.googleProductTab || 'veo3';
    setGoogleTab(target);
    page.classList.add('google-image-mode');
  } else {
    setGoogleTab(googleBarState.model || 'nanopro');
  }
  saveUiState({ googleProductsOpen: open });
}

const GOOGLE_BILLING_KEY = 'saad_google_budget_usd_v1';

function formatUsd(amount){
  const value = Number(amount || 0);
  return `$${value.toFixed(value >= 10 ? 2 : 3)}`;
}

function getGoogleBudget(){
  const raw = localStorage.getItem(GOOGLE_BILLING_KEY);
  if(!raw) return { start:null, spent:0, last:0 };
  try{
    const parsed = JSON.parse(raw);
    return {
      start: Number.isFinite(Number(parsed.start)) ? Number(parsed.start) : null,
      spent: Number.isFinite(Number(parsed.spent)) ? Number(parsed.spent) : 0,
      last: Number.isFinite(Number(parsed.last)) ? Number(parsed.last) : 0
    };
  } catch {
    return { start:null, spent:0, last:0 };
  }
}

function renderGoogleBudget(){
  const budget = getGoogleBudget();
  const input = document.getElementById('g-budget-input');
  const remaining = document.getElementById('g-budget-remaining');
  const last = document.getElementById('g-last-cost');
  if(input && budget.start !== null) input.value = budget.start;
  if(remaining){
    remaining.textContent = budget.start === null ? 'غير مضبوط' : formatUsd(Math.max(0, budget.start - budget.spent));
  }
  if(last){
    last.textContent = budget.last ? formatUsd(budget.last) : '--';
  }
}

function saveGoogleBudget(){
  const input = document.getElementById('g-budget-input');
  const nextStart = Number(input?.value || 0);
  const current = getGoogleBudget();
  localStorage.setItem(GOOGLE_BILLING_KEY, JSON.stringify({
    start: Number.isFinite(nextStart) && nextStart > 0 ? nextStart : null,
    spent: current.spent || 0,
    last: current.last || 0
  }));
  renderGoogleBudget();
  toast('تم حفظ الرصيد التقديري المحلي','success');
}

function consumeGoogleBudget(cost){
  const amount = Number(cost || 0);
  const current = getGoogleBudget();
  localStorage.setItem(GOOGLE_BILLING_KEY, JSON.stringify({
    start: current.start,
    spent: (current.spent || 0) + amount,
    last: amount
  }));
  renderGoogleBudget();
}

async function promptGenerate(parts){
  const r=await fetch('/api/generate',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({model:'gemini-2.5-flash',parts})
  });
  const d=await r.json();
  if(!r.ok) throw new Error(d.error||'Prompt request failed');
  return d.text||'';
}

async function generatePromptList(idea, move, seconds){
  const system=`You are a professional cinematic prompt writer for AI video generation tools.

IMPORTANT RULES:
- Always write the output in English only.
- Do NOT use Arabic in the prompts.
- Use professional filmmaking language.
- Describe camera movement using real cinema terms (Dolly, Orbit, Push, Locked shot).
- Keep environments realistic, not fantasy.
- Avoid poetic or emotional narration.
- Write prompts ready to paste into Runway, Pika, Kling, or similar tools.

Output strictly in this format:

[VIDEO_PROMPT]
...

[IMAGE_PROMPT]
...

[MUSIC_PROMPT]
...`;

  const user=`Create a cinematic concept based on this idea:
"${idea}"

Camera movement style: ${move}
Shot duration: ${seconds} seconds

Requirements:
- Keep environments realistic and physically plausible.
- No fantasy unless explicitly requested in the idea.
- Use clear filmmaking language suitable for AI video tools.
- Return exactly: [VIDEO_PROMPT], [IMAGE_PROMPT], [MUSIC_PROMPT].`;

  return await promptGenerate([{text:`${system}\n\n${user}`}]);
}

async function generatePromptProject(idea, move, seconds){
  const system=`You are a cinematic director AI that generates professional video prompts.

Rules:
- The project can be about ANY topic.
- Use realistic filmmaking language only.
- Each shot must connect to the next using a natural cinematic transition.
- Add a transition description after every shot.
- Avoid fantasy unless requested.
- Movements must be physically possible camera moves.

Allowed transitions:
Raven Transition / Morph / Air Bending / Shadow Smoke / Water Bending / Firelava /
Flying Cam Transition / Melt Transition / Splash Transition / Flame Transition / Smoke Transition /
Logo Transform / Hand Transition / Column Wipe / Hole Transition / Display Transition /
Jump Transition / Seamless Transition / Trucksition / Gorilla Transfer / Intermission / Stranger Transition

Output strictly like this:

[SHOTLIST]

Shot 1:
Visual:
Camera:
Duration:
Transition to next:

Shot 2:
Visual:
Camera:
Duration:
Transition to next:

[VIDEO_PROMPTS]

[MUSIC_PROMPT]`;

  const user=`Idea: ${idea}

Camera movement style to respect:
${move}

Preferred shot duration:
${seconds} seconds

Generate a cinematic sequence with smooth transitions between shots.`;

  return await promptGenerate([{text:`${system}\n\n${user}`}]);
}

async function generatePromptTransition(imgA, imgB, seconds, transitionType, transitionIntensity){
  const [metaA, dataA]=String(imgA).split(',');
  const [metaB, dataB]=String(imgB).split(',');
  const mimeA=(metaA.match(/data:(.*);base64/)||[])[1]||'image/png';
  const mimeB=(metaB.match(/data:(.*);base64/)||[])[1]||'image/png';

  const system=`You are a professional film editor and cinematic prompt writer.
Task: create a transition prompt from Image A to Image B.
RULES:
- Output in English only.
- Camera motion must be physically plausible.
- Do NOT morph the main subject identity. No shape-shifting. No random deformations.
- Use the requested transition preset name exactly if provided.
- If transitionType is Auto, choose the most natural cinematic transition based on both images.
- Keep environment realistic. Avoid fantasy unless specifically implied by the images.
- Respect the requested transition type exactly.
- Do not invent another transition unless Auto is selected.
- In [NEGATIVE], include stronger artifact prevention when intensity is High.
Return exactly:
[TRANSITION_PROMPT]
[CAMERA_MOVE]
[NEGATIVE]`;

  const user=`Create a cinematic transition between Image A (shot end) and Image B (shot start).
Duration: ${seconds} seconds.

transitionType: ${transitionType}
transitionIntensity: ${transitionIntensity}

IMPORTANT:
- If a specific transition name is selected, follow it as a style preset by name.
- Do not replace it with a different transition.
- Describe the transition in a way that matches how these presets behave in AI video tools.

INTENSITY RULES:
- Low: subtle, clean, almost invisible cut. Minimal VFX. No distortion.
- Medium: noticeable but refined. Light VFX only if needed.
- High: strong stylized transition, but still preserve identity and avoid ugly artifacts.

INSTRUCTIONS:
- If transitionType is Auto, pick the best transition.
- Always prioritize continuity and minimal artifacts.`;

  return await promptGenerate([
    {text:`${system}\n\n${user}`},
    {inlineData:{mimeType:mimeA,data:dataA}},
    {inlineData:{mimeType:mimeB,data:dataB}}
  ]);
}

async function runPromptStudio(mode){
  const buttons=['ps-btn-generate','ps-btn-project','ps-btn-transition'].map(id=>document.getElementById(id)).filter(Boolean);
  const labels={
    'ps-btn-generate':'توليد قائمة برومبت',
    'ps-btn-project':'توليد مشروع 25 ثانية',
    'ps-btn-transition':'توليد انتقال'
  };
  const activeBtn={list:'ps-btn-generate',project:'ps-btn-project',transition:'ps-btn-transition'}[mode];
  buttons.forEach(btn=>{ btn.disabled=true; if(btn.id===activeBtn) btn.innerHTML='<div class="spinner"></div> جارٍ التوليد...'; });
  clearPromptStudioStatus();
  try{
    const idea=document.getElementById('ps-idea').value.trim();
    const move=document.getElementById('ps-move').value;
    const seconds=Math.max(3,Math.min(12,Number(document.getElementById('ps-seconds').value||5)));
    const out=promptStudioOutput();
    if(mode!=='transition' && !idea) throw new Error('اكتب الفكرة أولاً');
    if(mode==='list'){
      out.value=await generatePromptList(idea,move,seconds);
      setPromptStudioStatus('تم توليد قائمة البرومبتات');
    } else if(mode==='project'){
      out.value=await generatePromptProject(idea,move,seconds);
      setPromptStudioStatus('تم توليد مشروع 25 ثانية');
    } else {
      const fileA=S.files['dz-ps-a'];
      const fileB=S.files['dz-ps-b'];
      if(!fileA || !fileB) throw new Error('ارفع Image A و Image B أولاً');
      const imgA=await fileToDataUrl(fileA);
      const imgB=await fileToDataUrl(fileB);
      out.value=await generatePromptTransition(
        imgA,
        imgB,
        seconds,
        document.getElementById('ps-transition-type').value,
        document.getElementById('ps-transition-intensity').value
      );
      setPromptStudioStatus('تم توليد انتقال سينمائي');
    }
  } catch(e){
    setPromptStudioStatus(e.message||'حدث خطأ','error');
  } finally {
    buttons.forEach(btn=>{ btn.disabled=false; btn.textContent=labels[btn.id]||btn.textContent; });
  }
}

async function copyPromptStudioOutput(){
  const text=promptStudioOutput()?.value||'';
  if(!text.trim()){ setPromptStudioStatus('لا يوجد نص لنسخه','error'); return; }
  try{
    await navigator.clipboard.writeText(text);
    setPromptStudioStatus('تم نسخ الناتج');
  } catch {
    setPromptStudioStatus('فشل النسخ','error');
  }
}

// ═══════════════════════════════════════════════════════════
// DYNAMIC CREDIT COST CALCULATOR
// Based on KIE.ai official prices — profit margin 40% applied on top (mirrors server)
// ═══════════════════════════════════════════════════════════
const FRONTEND_PROFIT_MARGIN = 0.40;
function applyProfitMargin(cost){ return Math.ceil(cost * (1 + FRONTEND_PROFIT_MARGIN)); }

function calcCreditCost(model, params){
  const dur  = Number(params.duration || 5);
  const res  = String(params.resolution || '720p').toLowerCase();
  const gmode= String(params.mode || 'std').toLowerCase();   // 'std' | 'pro'
  const audio= params.audio === true || params.audio === 'true';

  // ── KLING 3.0  (per-second pricing) ──────────────────────
  // Real data confirmed: kling-3.0/video Pro no-audio = 18/s, Pro audio = 27/s
  if(model === 'kling-3.0/video'){
    const isPro = gmode === 'pro';
    const rps   = isPro ? (audio ? 27 : 18) : (audio ? 20 : 14);
    return Math.ceil(dur * rps);
  }
  // kling-2.6 — real data: no-audio 10s=110→11/s, with-audio 5s=110→22/s
  // std/pro don't affect price — only audio matters
  if(model === 'kling-2.6/image-to-video'){
    return Math.ceil(dur * (audio ? 22 : 11));
  }
  // kling v2.5 turbo (same tier as 3.0)
  if(model === 'kling/v2-5-turbo-image-to-video-pro'){
    const isPro = gmode === 'pro';
    const rps   = isPro ? (audio ? 27 : 18) : (audio ? 20 : 14);
    return Math.ceil(dur * rps);
  }
  // Motion control — real data: 720p 30s = 520 credits → ~17.3/s → use 18/s
  if(model === 'kling-3.0/motion-control'){
    const rps = res.includes('1080') ? 27 : 18;
    return Math.ceil(dur * rps);
  }

  // ── HAILUO 2.3  (flat per generation) ────────────────────
  // hailuo/02 is a different product line — real data: pro 6s default = 57 credits
  if(model.includes('hailuo/02') || model.includes('hailuo/0.2')){
    const isPro = model.includes('pro');
    const is10s = dur >= 9;
    if(isPro) return is10s ? 114 : 57;   // 57 confirmed, 114 estimated for 10s
    else      return is10s ?  76 : 38;   // estimated standard tier
  }
  // hailuo/2-3 and hailuo/2-2 original pricing
  if(model.includes('hailuo')){
    const isPro  = model.includes('pro');
    const is1080 = res.includes('1080');
    const is10s  = dur >= 9;
    if(isPro){
      if(is10s)  return 90;   // Pro  10s 768P
      if(is1080) return 80;   // Pro   6s 1080P
      return 45;              // Pro   6s 768P
    } else {
      if(is10s || is1080) return 50;  // Std 10s 768P or Std 6s 1080P
      return 30;                       // Std  6s 768P
    }
  }

  // ── SORA 2  (flat per generation) ────────────────────────
  if(model.includes('sora') && !model.includes('watermark')) return dur >= 14 ? 35 : 30;
  if(model.includes('sora-watermark')) return 5;

  // ── WAN 2.6  (flat per duration+resolution combo) ────────
  if(model.startsWith('wan/2-6') || model.startsWith('wan/2-2')){
    if(model.includes('wan/2-2')) return 48;  // speech-to-video turbo — real data: 48 KIE credits
    const is1080 = res.includes('1080');
    if(dur >= 14) return is1080 ? 315 : 210;
    if(dur >=  9) return is1080 ? 210 : 140;
    return is1080 ? 105 : 70;
  }

  // ── SEEDANCE 1.x  (per-second pricing) ───────────────────
  if(model.includes('seedance') || model.includes('bytedance')){
    const isPro  = model.includes('pro') || model.includes('1.5');
    const is1080 = res.includes('1080');
    const is480  = res.includes('480');
    const rps    = isPro ? (is1080 ? 14 : is480 ? 2.8 : 6)
                         : (is1080 ? 10 : is480 ? 2   : 4.5);
    return Math.ceil(dur * rps);
  }

  // ── IMAGE generators  (flat per image) ───────────────────
  if(model.includes('qwen2') || model.includes('qwen/image'))   return 6;
  if(model.includes('seedream'))                                 return 7;   // real: 6.5
  if(model.includes('ideogram'))                                 return 7;
  if(model.includes('flux-kontext') || model.includes('fluxkontext')) return 7;
  if(model.includes('flex'))                                         return 24;  // flux-2/flex real: 24 KIE credits
  if(model.includes('flux-2') || model.includes('flux2'))        return 7;
  if(model.includes('zimage') || model.includes('z-image') ||
     model === 'z-image')                                        return 1;   // real: 0.8 → min 1
  if(model.includes('recraft'))                                  return 1;   // real: 1 KIE credit
  if(model.includes('topaz'))                                    return 10;  // real: 10 KIE credits

  // ── AUDIO / CHAT ──────────────────────────────────────────
  if(model.includes('infinitalk'))                               return 15;
  if(model.includes('gpt-5') || model.includes('gpt5') ||
     model.includes('gpt-4') || model.includes('gpt4') ||
     model.includes('claude') || model.includes('gemini'))       return 1; // chat models ~0.02 KIE/call
  if(model.includes('grok-imagine') || model.includes('grok/imagine')) return 4; // real: 4 KIE credits
  if(model.includes('grok'))                                     return 4;

  return 20; // safe default
}

// ═══════════════════════════════════════════════════════════
// LIVE COST PREVIEW — updates as user changes settings
// ═══════════════════════════════════════════════════════════
function updateCostPreview(valElId, cost){
  const el = document.getElementById(valElId);
  if(el) el.textContent = cost;
}

function refreshHailuoCost(){
  const model  = document.getElementById('hailuo-model')?.value || 'hailuo/2-3-image-to-video-pro';
  const dur    = Number(document.getElementById('hailuo-duration')?.value || 6);
  const resUi  = document.getElementById('hailuo-resolution')?.value || '2K';
  const res    = resUi === '4K' ? '1080P' : '768P';
  updateCostPreview('hailuo-cost-val', applyProfitMargin(calcCreditCost(model, {duration:dur, resolution:res})));
}

function refreshSoraCost(){
  const model  = document.getElementById('sora-model')?.value || 'sora-2-text-to-video';
  const mInfo  = SORA_MODEL_INFO[model] || SORA_MODEL_INFO['sora-2-text-to-video'];
  const nFr    = document.getElementById('sora-frames')?.value || '10';
  const base   = mInfo?.watermark ? 5 : mInfo?.characters ? 30 : (Number(nFr)>=14 ? 35 : 30);
  updateCostPreview('sora-cost-val', applyProfitMargin(base));
}

function refreshSeedanceCost(){
  const model  = document.getElementById('seedance-model')?.value || 'bytedance/seedance-1.5-pro';
  const resUi  = document.getElementById('seedance-resolution')?.value || '2K';
  const res    = mapUiResolution(resUi, {'1K':'480p','2K':'720p','4K':'1080p'}, '720p');
  const dur    = Number(document.getElementById('seedance-duration')?.value || 4);
  updateCostPreview('seedance-cost-val', applyProfitMargin(calcCreditCost(model, {duration:dur, resolution:res})));
}

function refreshWanCost(){
  const model  = document.getElementById('wan-model')?.value || 'wan/2-6-text-to-video';
  const dur    = Number(document.getElementById('wan-duration')?.value || 5);
  const resUi  = document.getElementById('wan-resolution')?.value || '2K';
  const res    = mapUiResolution(resUi, {'1K':'720p','2K':'1080p','4K':'1080p'}, '720p');
  updateCostPreview('wan-cost-val', applyProfitMargin(calcCreditCost(model, {duration:dur, resolution:res})));
}

function refreshKlingCost(tab){
  const isMotion = tab === 'motion';
  const isImage  = tab === 'image';
  const prefix   = isMotion ? 'kling-motion' : (isImage ? 'kling-image' : 'kling-text');
  const model    = document.getElementById(`${prefix}-model`)?.value || (isMotion ? 'kling-3.0/motion-control' : 'kling-3.0/video');
  const dur      = Number(isMotion ? 10 : (document.getElementById(`${prefix}-duration`)?.value || 10));
  const modeUi   = isMotion ? (document.getElementById('kling-motion-res')?.value||'2K') : (document.getElementById(`${prefix}-mode`)?.value||'2K');
  const gmode    = mapKlingModeFromResolution(modeUi);
  const sound    = isMotion ? false : (document.getElementById(`${prefix}-sound`)?.value||'true') === 'true';
  const resRaw   = isMotion ? (document.getElementById('kling-motion-res')?.value||'2K') : '1K';
  const res      = mapUiResolution(resRaw, {'1K':'720p','2K':'1080p','4K':'1080p'}, '720p');
  const cost     = applyProfitMargin(calcCreditCost(model, {duration:dur, mode:gmode, audio:sound, resolution:res}));
  if(isMotion){
    updateCostPreview('kling-motion-cost-val', cost);
  } else {
    updateCostPreview(isImage ? 'kling-image-cost-val' : 'kling-text-cost-val', cost);
  }
}

function refreshTransitionCost(){
  const dur  = Number(document.getElementById('tr-duration')?.value || 5);
  const cost = applyProfitMargin(calcCreditCost('kling/v2-5-turbo-image-to-video-pro', { duration:dur, mode:'pro', audio:false }));
  updateCostPreview('tr-cost-val', cost);
}

// ElevenLabs TTS: estimate audio duration from text length (~4 chars/sec average)
function refreshElevenTTSCost(){
  const text = document.getElementById('eleven-tts-text')?.value || '';
  const model = document.getElementById('eleven-tts-model')?.value || 'elevenlabs/text-to-speech-turbo-2-5';
  const estSec = Math.max(1, Math.ceil(text.length / 4)); // ~4 chars per second avg
  const cost = applyProfitMargin(calcCreditCost(model, { duration: estSec }));
  const el = document.getElementById('eleven-tts-cost-val');
  if(el) el.textContent = text.length > 0 ? `~${cost}` : '—';
}

// Suno: ~10 credits per standard generation (2 songs), more for longer
function refreshSunoCost(){
  const model = document.getElementById('suno-model')?.value || 'V5';
  const base = (model === 'V3_5' || model === 'V3') ? 8 : 10;
  updateCostPreview('suno-cost-val', applyProfitMargin(base));
}

function refreshKieUpscaleCost(){
  const model = document.getElementById('kie-upscale-model')?.value || 'topaz/image-upscale';
  const cost  = applyProfitMargin(calcCreditCost(model, {}));
  updateCostPreview('kie-upscale-cost-val', cost);
}

function refreshNanoCost(){
  const tabName = document.querySelector('#page-nano .ns-tab.active')?.dataset?.tab
               || document.querySelector('#gbar-model-btn [id="gbar-model-label"]')?.closest('[data-model]')?.dataset?.model
               || 'nanopro';
  const model  = tabName === 'nano'    ? 'gemini-3.1-flash-image-preview'
               : tabName === 'nano2'   ? 'gemini-3.1-flash-image-preview'
               :                        'gemini-3-pro-image-preview'; // nanopro
  const quality = document.getElementById('gbar-quality')?.value || '2K';
  const nanoKey = tabName === 'nano' ? 'nano' : '';
  const base = calcCreditCost(model, { quality, nanoKey });
  updateCostPreview('nano-cost-val', applyProfitMargin(base));
}

function initCostPreviews(){
  // Hailuo listeners
  ['hailuo-model','hailuo-duration','hailuo-resolution'].forEach(id=>{
    document.getElementById(id)?.addEventListener('change', refreshHailuoCost);
  });
  // Sora listeners
  ['sora-model','sora-frames'].forEach(id=>{
    document.getElementById(id)?.addEventListener('change', refreshSoraCost);
  });
  // Seedance listeners
  ['seedance-model','seedance-resolution','seedance-duration'].forEach(id=>{
    document.getElementById(id)?.addEventListener('change', refreshSeedanceCost);
  });
  // Wan listeners
  ['wan-model','wan-duration','wan-resolution'].forEach(id=>{
    document.getElementById(id)?.addEventListener('change', refreshWanCost);
  });
  // Kling text listeners
  ['kling-text-model','kling-text-duration','kling-text-mode','kling-text-sound'].forEach(id=>{
    document.getElementById(id)?.addEventListener('change', ()=>refreshKlingCost('text'));
  });
  // Kling image listeners
  ['kling-image-model','kling-image-duration','kling-image-mode','kling-image-sound'].forEach(id=>{
    document.getElementById(id)?.addEventListener('change', ()=>refreshKlingCost('image'));
  });
  // Kling motion listeners
  ['kling-motion-res'].forEach(id=>{
    document.getElementById(id)?.addEventListener('change', ()=>refreshKlingCost('motion'));
  });
  // Grok & Infinitalk (fixed costs)
  // Transition listener
  document.getElementById('tr-duration')?.addEventListener('change', refreshTransitionCost);
  // ElevenLabs TTS listener (text input)
  document.getElementById('eleven-tts-text')?.addEventListener('input', refreshElevenTTSCost);
  document.getElementById('eleven-tts-model')?.addEventListener('change', refreshElevenTTSCost);
  // Suno listener
  document.getElementById('suno-model')?.addEventListener('change', refreshSunoCost);
  // KIE Upscale model listener
  document.getElementById('kie-upscale-model')?.addEventListener('change', refreshKieUpscaleCost);
  // Nano quality listener (quality pill buttons call setGbarChoice which triggers refreshNanoCost)
  // Initial values
  refreshHailuoCost(); refreshSoraCost(); refreshSeedanceCost(); refreshWanCost();
  refreshKlingCost('text'); refreshKlingCost('image'); refreshKlingCost('motion');
  refreshTransitionCost(); refreshSunoCost(); refreshKieUpscaleCost(); refreshNanoCost();
  refreshFlux2Cost();
}

// Run after DOM ready
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', initCostPreviews);
} else {
  setTimeout(initCostPreviews, 500);
}

// ═══════════════════════════
// GENERATE
// ═══════════════════════════
async function generate(type) {
  if(!AUTH.checkCredits(10)) return;
  if(!['promptstudio','t2p','florence'].includes(type) && !S.connected){ toast('اتصل بـ ComfyUI أولاً','error'); return; }
  const btnId = {video:'vid-btn',clothes:'clothes-btn',edit:'edit-btn',scene:'scene-btn',story:'story-btn',florence:'flo-btn',t2p:'t2p-btn',promptstudio:'ps-btn-generate'}[type];
  const btn = document.getElementById(btnId);
  if(btn){ btn.disabled=true; btn.innerHTML='<div class="spinner"></div> جاري الإرسال...'; }
  try {
    let payload;
    if(type==='video'){  await buildVideo(); return; }
    if(type==='clothes'){ await buildClothes(); return; } // handles own fetch+poll
    if(type==='edit'){  await buildEdit(); return; }
    if(type==='scene'){  await buildScene(); return; }
    if(type==='story'){  await buildStory(); return; }
    if(type==='florence'){ await buildFlorence(); return; }
    if(type==='t2p'){
    if(btn){ btn.disabled=true; btn.innerHTML='<div class="spinner"></div> جاري الإرسال...'; }
    try{ await buildT2P(); } finally{ if(btn){ btn.disabled=false; btn.innerHTML=getBtnLabel(type); } }
    return;
  }
    if(!payload) return;
    const r = await fetch('/api/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const d = await r.json();
    if(d.error){ toast('خطأ: '+JSON.stringify(d.error).substring(0,120),'error'); return; }
    if(d.prompt_id){ toast('تم الإرسال ⏳','success'); showProg(type); pollResults(d.prompt_id, type); }
  } catch(e){ toast('خطأ: '+e.message.substring(0,80),'error'); }
  finally{ if(btn){ btn.disabled=false; btn.innerHTML=getBtnLabel(type); } }
}

const btnLabels={video:'Generate',clothes:'Generate',edit:'Generate',scene:'Generate',story:'Generate',florence:'Generate',t2p:'Generate'};
function getBtnLabel(t){ return btnLabels[t]||'Generate'; }

function showProg(type){
  const id=type==='florence'?'flo-prog':type+'-prog';
  const fillId=type==='florence'?'flo-prog-fill':type+'-prog-fill';
  const el=document.getElementById(id); if(el) el.style.display='block';
  let w=0; const fill=document.getElementById(fillId); if(!fill) return;
  const iv=setInterval(()=>{ w=Math.min(w+Math.random()*3,90); fill.style.width=w+'%'; if(w>=90)clearInterval(iv); },800);
}
function hideProg(type){
  const id=type==='florence'?'flo-prog':type+'-prog';
  const el=document.getElementById(id); if(el) el.style.display='none';
}

// ═══════════════════════════
// WORKFLOW BUILDERS
// inject = node overrides sent to /api/run
// server loads the JSON file, converts litegraph→API, applies inject
// ═══════════════════════════
// ═══════════════════════════
// RESULTS & POLL
// ═══════════════════════════
const resultIds={video:'vid-results',clothes:'clothes-results',edit:'edit-results',scene:'scene-results',story:'story-results',florence:'flo-results',t2p:'t2p-results'};

function clearResults(id){
  const el=document.getElementById(id); if(!el) return;
  const icons={'vid-results':'🎬','clothes-results':'👗','edit-results':'✏️','scene-results':'🎭','story-results':'📖'};
  const txts={'vid-results':'ستظهر الفيديوهات هنا','clothes-results':'ستظهر النتائج هنا','edit-results':'ستظهر النتائج هنا','scene-results':'ستظهر النتائج هنا','story-results':'ستظهر المشاهد هنا'};
  el.innerHTML=`<div class="result-empty"><div class="result-empty-icon">${icons[id]||'🖼️'}</div><div class="result-empty-text">${txts[id]||'ستظهر النتائج هنا'}</div></div>`;
  // Remove from localStorage
  try {
    const saved = JSON.parse(localStorage.getItem(getResKey())||'[]');
    const filtered = saved.filter(r => r.containerId !== id);
    localStorage.setItem(getResKey(), JSON.stringify(filtered));
  } catch(e){}
}

function deleteResult(btn){
  const item = btn.closest('.result-item');
  if(!item) return;
  const el = item.querySelector('img,video');
  const fullSrc = el?.src || '';
  removeGalleryEntry(fullSrc);
}

function removeGalleryEntry(url){
  if(!url) return;
  // Remove from saved results
  try {
    const saved = JSON.parse(localStorage.getItem(getResKey())||'[]');
    const filtered = saved.filter(r => r.url !== url && !url.endsWith(r.url));
    localStorage.setItem(getResKey(), JSON.stringify(filtered));
  } catch(e){}
  // Remove from lightweight gallery store
  try{
    if(!Array.isArray(S.gallery)) S.gallery = [];
    S.gallery = S.gallery.filter(g => g.url !== url && !url.endsWith(g.url));
    localStorage.setItem(getGalKey(), JSON.stringify(S.gallery));
  }catch(e){}
  // Remove from any visible grids
  document.querySelectorAll('.result-item img,.result-item video').forEach(el=>{
    const src = el.src || el.getAttribute('src') || '';
    if(src === url || src.endsWith(url)){
      el.closest('.result-item')?.remove();
    }
  });
  const dashCount = document.getElementById('dashGenCount');
  if(dashCount) dashCount.textContent = Array.isArray(S.gallery) ? S.gallery.length : 0;
}

// ═══════════════════════════
// PERSISTENT RESULTS
// ═══════════════════════════
const STORAGE_KEY = 'saad_results_v1';
const GOOGLE_GALLERY_KEY = 'saad_google_gallery_v1';
// User-scoped storage key helpers — isolate gallery data per account
function getResKey(){ try{ const u=(typeof AUTH!=='undefined')&&AUTH.getUser(); return STORAGE_KEY+(u&&u.id?'_'+u.id:''); }catch(_){ return STORAGE_KEY; } }
function getGalKey(){ try{ const u=(typeof AUTH!=='undefined')&&AUTH.getUser(); return 'saad_gal3'+(u&&u.id?'_'+u.id:''); }catch(_){ return 'saad_gal3'; } }
function reloadUserGallery(){
  try{
    S.gallery = JSON.parse(localStorage.getItem(getGalKey()) || '[]');
    const dc = document.getElementById('dashGenCount');
    if(dc) dc.textContent = S.gallery.length;
  }catch(_){}
}

function saveGoogleGalleryItem(item){
  try{
    const saved = JSON.parse(localStorage.getItem(GOOGLE_GALLERY_KEY) || '[]');
    saved.unshift(item);
    if(saved.length > 200) saved.splice(200);
    localStorage.setItem(GOOGLE_GALLERY_KEY, JSON.stringify(saved));
  } catch(e){}
}

function addGoogleGalleryItem(url, prompt='', model='', save=true){
  const grid = document.getElementById('g-gallery');
  if(!grid || !url) return;
  const empty = grid.querySelector('.gs-gallery-empty');
  if(empty) empty.remove();
  const item = document.createElement('div');
  item.className = 'gs-gallery-item';
  const img = document.createElement('img');
  img.src = url;
  img.alt = model || 'Google Image';
  img.onclick = () => openLightbox(url, prompt || '');
  item.appendChild(img);
  if(model){
    const badge = document.createElement('div');
    badge.className = 'gs-gallery-badge';
    badge.textContent = model;
    item.appendChild(badge);
  }
  grid.prepend(item);
  if(save){
    saveGoogleGalleryItem({ url, prompt, model, time: Date.now() });
  }
}

function loadGoogleGallery(){
  const grid = document.getElementById('g-gallery');
  if(!grid) return;
  grid.innerHTML = '<div class="gs-gallery-empty">سيتم حفظ الصور المولدة هنا</div>';
  try{
    const saved = JSON.parse(localStorage.getItem(GOOGLE_GALLERY_KEY) || '[]');
    if(saved.length){
      grid.innerHTML = '';
      saved.forEach(item => addGoogleGalleryItem(item.url, item.prompt || '', item.model || '', false));
    }
  } catch(e){}
  if(grid.querySelector('.gs-gallery-empty')){
    try{
      const legacy = JSON.parse(localStorage.getItem(getResKey()) || '[]');
      const googleItems = legacy.filter(r => String(r.containerId || '').startsWith('g-'));
      if(googleItems.length){
        grid.innerHTML = '';
        googleItems.forEach(item => addGoogleGalleryItem(item.url, item.prompt || '', 'Google', false));
      }
    } catch(e){}
  }
}

function clearGoogleGallery(){
  if(!confirm('مسح معرض صور Google؟')) return;
  localStorage.removeItem(GOOGLE_GALLERY_KEY);
  const grid = document.getElementById('g-gallery');
  if(grid) grid.innerHTML = '<div class="gs-gallery-empty">سيتم حفظ الصور المولدة هنا</div>';
}

function saveResult(containerId, url, isVideo, prompt){
  try {
    const saved = JSON.parse(localStorage.getItem(getResKey())||'[]');
    saved.unshift({containerId, url, isVideo, prompt, time: Date.now()});
    // Keep max 100 results
    if(saved.length > 100) saved.splice(100);
    localStorage.setItem(getResKey(), JSON.stringify(saved));
  } catch(e){}
}

function loadSavedResults(){
  try {
    const saved = JSON.parse(localStorage.getItem(getResKey())||'[]');
    saved.forEach(r => addResultItem(r.containerId, r.url, r.isVideo, r.prompt, false));
  } catch(e){}
}

function clearAllSaved(){
  localStorage.removeItem(getResKey());
}

async function storeLocalImageUrl(url, prefix='img'){
  try{
    if(!url || typeof url !== 'string' || !url.startsWith('data:image/')) return url;
    const r = await fetch('/api/store-image', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ dataUrl: url, prefix })
    });
    const d = await r.json();
    if(r.ok && d?.url) return d.url;
  } catch(e){}
  return url;
}

function addResultItem(containerId, url, isVideo=false, prompt='', save=true){
  const c=document.getElementById(containerId); if(!c) return;
  const emp=c.querySelector('.result-empty'); if(emp) emp.remove();
  const item=document.createElement('div');
  item.className='result-item';
  item.style.cssText='position:relative;border-radius:8px;overflow:hidden;background:#111;';
  const del=document.createElement('button');
  del.innerHTML='✕';
  del.onclick=(e)=>{ e.stopPropagation(); deleteResult(del); };
  del.style.cssText='position:absolute;top:5px;right:5px;z-index:10;background:rgba(0,0,0,0.8);color:#fff;border:none;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;';
  if(isVideo){
    const v=document.createElement('video');
    v.src=url; v.controls=false; v.loop=true; v.muted=true; v.playsInline=true; v.preload='metadata';
    v.setAttribute('controlsList','nodownload noplaybackrate noremoteplayback');
    v.setAttribute('disablePictureInPicture','');
    v.style.cssText='width:100%;display:block;border-radius:8px;cursor:pointer;';
    v.onclick=(e)=>{ e.preventDefault(); e.stopPropagation(); openLightbox(url, prompt, true); };
    v.onplay=(e)=>{ v.pause(); openLightbox(url, prompt, true); };
    item.appendChild(v);
    const play = document.createElement('div');
    play.textContent = '▶';
    play.style.cssText = 'position:absolute;inset:auto 10px 10px auto;width:28px;height:28px;border-radius:50%;background:rgba(0,0,0,0.55);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;pointer-events:none;';
    item.appendChild(play);
  } else {
    const img=document.createElement('img');
    img.src=url;
    img.style.cssText='width:100%;display:block;border-radius:8px;cursor:zoom-in;transition:transform 0.15s;';
    img.onmouseover=()=>img.style.transform='scale(1.02)';
    img.onmouseout=()=>img.style.transform='scale(1)';
    img.onclick=()=>openLightbox(url, prompt);
    item.appendChild(img);
  }
  item.appendChild(del);
  c.prepend(item);
  if(save){
    saveResult(containerId, url, isVideo, prompt);
    syncGalleryFromResult(url, isVideo, prompt);
    // Log to server for admin gallery
    const _m = window._lastGenModel || containerId.replace(/-results?$/,'').replace(/-gallery$/,'');
    fetch('/api/log-generation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, isVideo, model: _m, prompt })
    }).catch(() => {});
  }
}

function addAudioResultItem(containerId, url, prompt=''){
  const c=document.getElementById(containerId); if(!c) return;
  const emp=c.querySelector('.result-empty'); if(emp) emp.remove();
  const item=document.createElement('div');
  item.className='audio-result-item';
  item.innerHTML = `<div class="audio-result-meta">${prompt ? prompt.substring(0,120) : 'Google TTS output'}</div><audio controls src="${url}"></audio>`;
  c.prepend(item);
}

async function pollResults(promptId, type, tries=0){
  if(tries>180){ hideProg(type); toast('انتهت المهلة','error'); return; }
  setTimeout(async()=>{
    try{
      const r=await fetch(`/api/history/${promptId}`);
      const data=await r.json();
      const hist=data[promptId];
      if(!hist||!hist.outputs){ pollResults(promptId,type,tries+1); return; }
      
      // Check if still running
      const status = hist.status;
      if(status && status.status_str && status.status_str !== 'success'){
        pollResults(promptId,type,tries+1); return;
      }
      
      hideProg(type);
      const cid=resultIds[type]||'edit-results';
      let found=false;
      
      console.log('pollResults outputs:', JSON.stringify(hist.outputs).substring(0,500));
      
      for(const nid of Object.keys(hist.outputs)){
        const out=hist.outputs[nid];
        // Images
        if(out.images) for(const img of out.images){
          if(img.filename){
            const url=`/api/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder||'')}&type=${img.type||'output'}`;
            addResultItem(cid, url, false, getPromptForType(type));
            found=true;
          }
        }
        // Videos (VHS outputs as 'gifs' or 'videos')
        const vidList = out.videos || out.gifs || [];
        for(const vid of vidList){
          if(vid.filename){
            const url=`/api/view?filename=${encodeURIComponent(vid.filename)}&subfolder=${encodeURIComponent(vid.subfolder||'')}&type=${vid.type||'output'}`;
            addResultItem(cid, url, true, getPromptForType(type));
            found=true;
          }
        }
        // Florence text
        if(out.text&&type==='florence'){
          const el=document.getElementById('flo-result');
          if(el) el.textContent=Array.isArray(out.text)?out.text.join('\n'):out.text;
          found=true;
        }
      }
      if(found) toast('✅ اكتمل!','success');
      else pollResults(promptId,type,tries+1);
    }catch(e){ 
      console.error('pollResults error:', e);
      pollResults(promptId,type,tries+1); 
    }
  },3000);
}

function copyFlo(){ navigator.clipboard.writeText(document.getElementById('flo-result')?.textContent||''); toast('تم النسخ','success'); }
function sendFloToEdit(){ const t=document.getElementById('flo-result')?.textContent||''; if(t){document.getElementById('edit-prompt').value=t;showPage('image',null);toast('تم النقل','success');} }
function filterGallery(type,el){
  document.querySelectorAll('.gtag').forEach(g=>g.classList.remove('active'));
  el.classList.add('active');
  const grid=document.getElementById('gallery-grid');
  if(!grid) return;
  Array.from(grid.children).forEach(item=>{
    const isVideo=item.querySelector('video')!==null;
    if(type==='all') item.style.display='';
    else if(type==='video') item.style.display=isVideo?'':'none';
    else item.style.display=!isVideo?'':'none';
  });
}

function createGalleryItem(r){
  const item=document.createElement('div');
  item.className='result-item';
  item.style.cssText='position:relative;border-radius:8px;overflow:hidden;background:#111;break-inside:avoid;margin-bottom:9px;';
  const del=document.createElement('button');
  del.innerHTML='✕';
  del.style.cssText='position:absolute;top:5px;right:5px;z-index:10;background:rgba(0,0,0,0.8);color:#fff;border:none;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;';
  del.onclick=(e)=>{ e.stopPropagation(); removeGalleryEntry(r.url); };
  if(r.isVideo){
    const v=document.createElement('video');
    v.src=r.url; v.controls=false; v.loop=true; v.muted=true; v.playsInline=true; v.preload='metadata';
    v.setAttribute('controlsList','nodownload noplaybackrate noremoteplayback');
    v.setAttribute('disablePictureInPicture','');
    v.style.cssText='width:100%;display:block;border-radius:8px;cursor:pointer;';
    v.onclick=(e)=>{ e.preventDefault(); e.stopPropagation(); openLightbox(r.url, r.prompt||'', true); };
    v.onplay=(e)=>{ v.pause(); openLightbox(r.url, r.prompt||'', true); };
    item.appendChild(v);
    const play = document.createElement('div');
    play.textContent = '▶';
    play.style.cssText = 'position:absolute;inset:auto 10px 10px auto;width:28px;height:28px;border-radius:50%;background:rgba(0,0,0,0.55);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;pointer-events:none;';
    item.appendChild(play);
  } else {
    const img=document.createElement('img');
    img.src=r.url;
    img.style.cssText='width:100%;display:block;border-radius:8px;cursor:zoom-in;';
    img.onclick=()=>openLightbox(r.url, r.prompt||'');
    item.appendChild(img);
  }
  item.appendChild(del);
  return item;
}

function syncGalleryFromResult(url, isVideo=false, prompt=''){
  if(!url) return;
  try{
    if(!Array.isArray(S.gallery)) S.gallery = [];
    const exists = S.gallery.some(g => g.url === url || url.endsWith(g.url));
    if(!exists){
      S.gallery.unshift({ url, isVideo, prompt, time: Date.now() });
      if(S.gallery.length > 500) S.gallery.splice(500);
      localStorage.setItem(getGalKey(), JSON.stringify(S.gallery));
      const dashCount = document.getElementById('dashGenCount');
      if(dashCount) dashCount.textContent = S.gallery.length;
    }
  }catch(e){}
  const galleryPage = document.getElementById('page-gallery');
  if(galleryPage && galleryPage.classList.contains('active')){
    const grid = document.getElementById('gallery-grid');
    if(grid){
      if(!grid.querySelector('.result-item')) grid.innerHTML='';
      grid.prepend(createGalleryItem({ url, isVideo, prompt }));
    }
  }
}

function renderGallery(){
  const grid=document.getElementById('gallery-grid'); if(!grid) return;
  try {
    if(!S.gallery || S.gallery.length===0){
      grid.innerHTML='<div style="color:var(--tx3);font-size:11px;text-align:center;padding:60px;font-family:var(--fm);">لا توجد أعمال بعد</div>';
      return;
    }
    grid.innerHTML='';
    S.gallery.forEach(r=>{ grid.appendChild(createGalleryItem(r)); });
  } catch(e){ grid.innerHTML='<div style="color:var(--tx3);padding:40px;text-align:center;">خطأ في تحميل المعرض</div>'; }
}

function getSeed(id){ const v=parseInt(document.getElementById(id).value); return (v===-1||isNaN(v))?Math.floor(Math.random()*9999999999999):v; }
function rndSeed(id){ document.getElementById(id).value=Math.floor(Math.random()*999999999999); }

async function buildVideo(){
  const img=await uploadImage('dz-vid'); if(!img){toast('ارفع الصورة أولاً','error');return null;}
  const seed=getSeed('vid-seed');
  const steps=+document.getElementById('vid-steps').value;
  const loraL=+document.getElementById('vid-lora-low').value;
  const loraH=+document.getElementById('vid-lora-high').value;
  const pos=document.getElementById('vid-pos').value;
  const neg=document.getElementById('vid-neg').value;
  const graph = {
    "29":{class_type:"UNETLoader",inputs:{unet_name:"smoothMixWan2214BI2V_i2vLow.safetensors",weight_dtype:"fp8_e4m3fn"}},
    "165":{class_type:"UNETLoader",inputs:{unet_name:"smoothMixWan2214BI2V_i2vLow.safetensors",weight_dtype:"fp8_e4m3fn"}},
    "27":{class_type:"wanBlockSwap",inputs:{model:["29",0]}},
    "25":{class_type:"wanBlockSwap",inputs:{model:["165",0]}},
    "2":{class_type:"PathchSageAttentionKJ",inputs:{sage_attention:"auto",allow_compile:false,model:["27",0]}},
    "1":{class_type:"PathchSageAttentionKJ",inputs:{sage_attention:"auto",allow_compile:false,model:["25",0]}},
    "8":{class_type:"ModelPatchTorchSettings",inputs:{enable_fp16_accumulation:true,model:["2",0]}},
    "9":{class_type:"ModelPatchTorchSettings",inputs:{enable_fp16_accumulation:true,model:["1",0]}},
    "35":{class_type:"ModelSamplingSD3",inputs:{shift:5,model:["8",0]}},
    "46":{class_type:"ModelSamplingSD3",inputs:{shift:5,model:["9",0]}},
    "253":{class_type:"LoraLoaderModelOnly",inputs:{lora_name:"bounce_test_LowNoise-000005.safetensors",strength_model:loraL,model:["35",0]}},
    "254":{class_type:"LoraLoaderModelOnly",inputs:{lora_name:"bounce_test_HighNoise-000005.safetensors",strength_model:loraH,model:["46",0]}},
    "18":{class_type:"VAELoader",inputs:{vae_name:"wan_2.1_vae.safetensors"}},
    "20":{class_type:"CLIPLoader",inputs:{clip_name:"umt5_xxl_fp16.safetensors",type:"wan",device:"default"}},
    "255":{class_type:"CLIPVisionLoader",inputs:{clip_name:"clip_vision_g.safetensors"}},
    "251":{class_type:"LoadImage",inputs:{image:img}},
    "62":{class_type:"LayerUtility: ImageScaleByAspectRatio V2",inputs:{aspect_ratio:"original",proportional_width:1,proportional_height:1,fit:"crop",method:"lanczos",round_to_multiple:"32",scale_to_side:"longest",scale_to_length:840,background_color:"#000000",image:["251",0]}},
    "77":{class_type:"ImageResizeKJv2",inputs:{upscale_method:"lanczos",keep_proportion:"crop",pad_color:"0, 0, 0",crop_position:"center",divisible_by:32,device:"cpu",width:["62",3],height:["62",4],image:["62",0]}},
    "256":{class_type:"CLIPVisionEncode",inputs:{crop:"center",clip_vision:["255",0],image:["251",0]}},
    "161":{class_type:"CLIPTextEncode",inputs:{text:pos,clip:["20",0]}},
    "162":{class_type:"CLIPTextEncode",inputs:{text:neg,clip:["20",0]}},
    "40":{class_type:"WanImageToVideo",inputs:{width:["77",1],height:["77",2],length:+document.getElementById('vid-frames').value,batch_size:1,positive:["161",0],negative:["162",0],vae:["18",0],clip_vision_output:["256",0],start_image:["77",0]}},
    "54":{class_type:"KSamplerAdvanced",inputs:{add_noise:"enable",noise_seed:seed,steps:steps,cfg:1,sampler_name:"euler",scheduler:"normal",start_at_step:0,end_at_step:Math.floor(steps*0.67),return_with_leftover_noise:"enable",model:["253",0],positive:["40",0],negative:["40",1],latent_image:["40",2]}},
    "55":{class_type:"KSamplerAdvanced",inputs:{add_noise:"disable",noise_seed:seed+1,steps:steps,cfg:1,sampler_name:"euler",scheduler:"normal",start_at_step:Math.floor(steps*0.67),end_at_step:10000,return_with_leftover_noise:"disable",model:["254",0],positive:["40",0],negative:["40",1],latent_image:["54",0]}},
    "52":{class_type:"VAEDecode",inputs:{samples:["55",0],vae:["18",0]}},
    "247":{class_type:"VHS_VideoCombine",inputs:{frame_rate:+document.getElementById('vid-fps').value,loop_count:0,filename_prefix:"SAAD_VIDEO",format:"video/h264-mp4",pix_fmt:"yuv420p",crf:12,save_metadata:true,trim_to_audio:false,pingpong:false,save_output:true,images:["52",0]}}
  };
  const r=await fetch('/api/prompt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:graph})});
  const d=await r.json();
  if(d.error){toast('خطأ: '+JSON.stringify(d.error).substring(0,120),'error');return null;}
  if(d.prompt_id){AUTH.consumeCredits(10);toast('تم الإرسال ⏳','success');showProg('video');pollResults(d.prompt_id,'video');}
  return null;
}

async function buildClothes(){
  const img1=await uploadImage('dz-c1'); if(!img1){toast('ارفع صورة الشخص','error');return null;}
  const img2=await uploadImage('dz-c2'); if(!img2){toast('ارفع صورة الملابس','error');return null;}
  const promptText=document.getElementById('clothes-prompt').value;
  const cw=+document.getElementById('clothes-w').value, ch=+document.getElementById('clothes-h').value;
  const seed=getSeed('clothes-seed');
  const graph = {
    "1":{class_type:"CheckpointLoaderSimple",inputs:{ckpt_name:"Qwen-Rapid-AIO-SFW-v5.safetensors"}},
    "27":{class_type:"LoraLoader",inputs:{lora_name:"Qwen\\remove-clothes.safetensors",strength_model:0.6,strength_clip:0.6,model:["1",0],clip:["1",1]}},
    "29":{class_type:"LoraLoader",inputs:{lora_name:"URP_10.safetensors",strength_model:0.65,strength_clip:0.65,model:["27",0],clip:["27",1]}},
    "28":{class_type:"LoraLoader",inputs:{lora_name:"breast_slider_qwen_v1.safetensors",strength_model:0.55,strength_clip:0.55,model:["29",0],clip:["29",1]}},
    "7":{class_type:"LoadImage",inputs:{image:img1}},
    "8":{class_type:"LoadImage",inputs:{image:img2}},
    "22":{class_type:"Text Multiline",inputs:{text:promptText}},
    "10":{class_type:"FluxResolutionNode",inputs:{megapixel:"1.5",aspect_ratio:"9:16 (Slim Vertical)",divisible_by:"32",custom_ratio:false,custom_aspect_ratio:"1:1"}},
    "11":{class_type:"EmptyLatentImage",inputs:{width:cw,height:ch,batch_size:1}},
    "3":{class_type:"TextEncodeQwenImageEditPlus",inputs:{prompt:["22",0],clip:["28",1],vae:["1",2],image1:["7",0],image2:["8",0]}},
    "4":{class_type:"TextEncodeQwenImageEditPlus",inputs:{prompt:"different face, different person, distorted face, changed facial structure, deformed face",clip:["1",1],vae:["1",2]}},
    "2":{class_type:"KSampler",inputs:{seed:seed,steps:4,cfg:1,sampler_name:"sa_solver",scheduler:"beta",denoise:1,model:["28",0],positive:["3",0],negative:["4",0],latent_image:["11",0]}},
    "5":{class_type:"VAEDecode",inputs:{samples:["2",0],vae:["1",2]}},
    "14":{class_type:"ImageConcanate",inputs:{direction:"down",match_image_size:true,image1:["8",0],image2:["7",0]}},
    "15":{class_type:"ImageConcanate",inputs:{direction:"right",match_image_size:true,image1:["14",0],image2:["5",0]}},
    "16":{class_type:"SaveImage",inputs:{filename_prefix:"SAAD_CLOTHES_COMPARE",images:["15",0]}},
    "26":{class_type:"SaveImage",inputs:{filename_prefix:"SAAD_CLOTHES",images:["5",0]}}
  };
  const r=await fetch('/api/prompt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:graph})});
  const d=await r.json();
  if(d.error){toast('خطأ: '+JSON.stringify(d.error).substring(0,120),'error');return null;}
  if(d.prompt_id){AUTH.consumeCredits(10);toast('تم الإرسال ⏳','success');showProg('clothes');pollResults(d.prompt_id,'clothes');}
  return null;
}

async function buildEdit(){
  const img=await uploadImage('dz-edit'); if(!img){toast('ارفع الصورة أولاً','error');return null;}
  const promptText=document.getElementById('edit-prompt').value;
  const w=+document.getElementById('edit-w').value, h=+document.getElementById('edit-h').value;
  const seed=getSeed('edit-seed');
  const f2p=+document.getElementById('edit-f2p').value;
  const mcnl=+document.getElementById('edit-mcnl').value;
  const rm=+document.getElementById('edit-rm').value;
  const graph = {
    "84":{class_type:"CheckpointLoaderSimple",inputs:{ckpt_name:"NSFW\\Qwen-Rapid-AIO-NSFW-v18.safetensors"}},
    "57":{class_type:"UNETLoader",inputs:{unet_name:"agqi2512NSFW_agqi2512V2.safetensors",weight_dtype:"default"}},
    "65":{class_type:"LoraLoaderModelOnly",inputs:{lora_name:"Qwen-Image-2512-Lightning-4steps-V1.0-bf16.safetensors",strength_model:1,model:["57",0]}},
    "73":{class_type:"LoraLoaderModelOnly",inputs:{lora_name:"Qwen-Image-Edit-F2P.safetensors",strength_model:f2p,model:["65",0]}},
    "78":{class_type:"LoraLoaderModelOnly",inputs:{lora_name:"qwen_MCNL_v1.0.safetensors",strength_model:mcnl,model:["84",0]}},
    "85":{class_type:"LoraLoaderModelOnly",inputs:{lora_name:"qwen_image_edit_remove-clothing_v1.0.safetensors",strength_model:rm,model:["78",0]}},
    "55":{class_type:"ModelSamplingAuraFlow",inputs:{shift:3,model:["85",0]}},
    "52":{class_type:"CFGNorm",inputs:{strength:1,model:["55",0]}},
    "75":{class_type:"LoadImage",inputs:{image:img}},
    "95":{class_type:"PrimitiveStringMultiline",inputs:{value:promptText}},
    "76":{class_type:"TextEncodeQwenImageEditPlusAdvance_lrzjason",inputs:{prompt:["95",0],target_size:1024,target_vl_size:384,upscale_method:"lanczos",crop_method:"center",instruction:"Describe the key features of the input image (color, shape, size, texture, objects, background), then explain how the user's text instruction should alter or modify the image. Generate a new image that meets the user's requirements while maintaining consistency with the original input where appropriate.",clip:["84",1],vae:["84",2],vl_resize_image1:["75",0]}},
    "77":{class_type:"ConditioningZeroOut",inputs:{conditioning:["76",0]}},
    "59":{class_type:"EmptySD3LatentImage",inputs:{width:w,height:h,batch_size:1}},
    "56":{class_type:"KSampler",inputs:{seed:seed,steps:4,cfg:1,sampler_name:"er_sde",scheduler:"beta",denoise:1,model:["52",0],positive:["76",0],negative:["77",0],latent_image:["59",0]}},
    "69":{class_type:"VAEDecode",inputs:{samples:["56",0],vae:["84",2]}},
    "146":{class_type:"SaveImage",inputs:{filename_prefix:"SAAD_EDIT",images:["69",0]}}
  };
  const r=await fetch('/api/prompt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:graph})});
  const d=await r.json();
  if(d.error){toast('خطأ: '+JSON.stringify(d.error).substring(0,120),'error');return null;}
  if(d.prompt_id){AUTH.consumeCredits(10);toast('تم الإرسال ⏳','success');showProg('edit');pollResults(d.prompt_id,'edit');}
  return null;
}

async function buildScene(){
  const img=await uploadImage('dz-scene'); if(!img){toast('ارفع الصورة أولاً','error');return null;}
  const promptText=document.getElementById('scene-prompt').value;
  const w=+document.getElementById('scene-w').value, h=+document.getElementById('scene-h').value;
  const seed=getSeed('scene-seed');
  const f2p=+document.getElementById('scene-f2p').value;
  const mcnl=+document.getElementById('scene-mcnl').value;
  const graph = {
    "84":{class_type:"CheckpointLoaderSimple",inputs:{ckpt_name:"NSFW\\Qwen-Rapid-AIO-NSFW-v18.safetensors"}},
    "57":{class_type:"UNETLoader",inputs:{unet_name:"agqi2512NSFW_agqi2512V2.safetensors",weight_dtype:"default"}},
    "54":{class_type:"CLIPLoader",inputs:{clip_name:"qwen_2.5_vl_7b_fp8_scaled.safetensors",type:"qwen_image",device:"default"}},
    "53":{class_type:"VAELoader",inputs:{vae_name:"qwen_image_vae.safetensors"}},
    "89":{class_type:"GGUFLoaderKJ",inputs:{model_name:"Qwen-Image-Edit-2509-Q8_0.gguf",extra_model_name:"none",dequant_dtype:"default",patch_dtype:"default",patch_on_device:false,enable_fp16_accumulation:false,attention_override:"none"}},
    "65":{class_type:"LoraLoaderModelOnly",inputs:{lora_name:"Qwen-Image-2512-Lightning-4steps-V1.0-bf16.safetensors",strength_model:1,model:["57",0]}},
    "73":{class_type:"LoraLoaderModelOnly",inputs:{lora_name:"Qwen-Image-Edit-F2P.safetensors",strength_model:f2p,model:["65",0]}},
    "78":{class_type:"LoraLoaderModelOnly",inputs:{lora_name:"qwen_MCNL_v1.0.safetensors",strength_model:mcnl,model:["84",0]}},
    "85":{class_type:"LoraLoaderModelOnly",inputs:{lora_name:"qwen_image_edit_remove-clothing_v1.0.safetensors",strength_model:0,model:["78",0]}},
    "55":{class_type:"ModelSamplingAuraFlow",inputs:{shift:3,model:["85",0]}},
    "52":{class_type:"CFGNorm",inputs:{strength:1,model:["55",0]}},
    "75":{class_type:"LoadImage",inputs:{image:img}},
    "95":{class_type:"PrimitiveStringMultiline",inputs:{value:promptText}},
    "76":{class_type:"TextEncodeQwenImageEditPlusAdvance_lrzjason",inputs:{prompt:["95",0],target_size:1024,target_vl_size:384,upscale_method:"lanczos",crop_method:"center",instruction:"Describe the key features of the input image (color, shape, size, texture, objects, background), then explain how the user's text instruction should alter or modify the image. Generate a new image that meets the user's requirements while maintaining consistency with the original input where appropriate.",clip:["84",1],vae:["84",2],vl_resize_image1:["75",0]}},
    "77":{class_type:"ConditioningZeroOut",inputs:{conditioning:["76",0]}},
    "59":{class_type:"EmptySD3LatentImage",inputs:{width:w,height:h,batch_size:1}},
    "56":{class_type:"KSampler",inputs:{seed:seed,steps:4,cfg:1,sampler_name:"er_sde",scheduler:"beta",denoise:1,model:["52",0],positive:["76",0],negative:["77",0],latent_image:["59",0]}},
    "69":{class_type:"VAEDecode",inputs:{samples:["56",0],vae:["84",2]}},
    "146":{class_type:"SaveImage",inputs:{filename_prefix:"SAAD_SCENE",images:["69",0]}}
  };
  const r=await fetch('/api/prompt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:graph})});
  const d=await r.json();
  if(d.error){toast('خطأ: '+JSON.stringify(d.error).substring(0,120),'error');return null;}
  if(d.prompt_id){AUTH.consumeCredits(10);toast('تم الإرسال ⏳','success');showProg('scene');pollResults(d.prompt_id,'scene');}
  return null;
}

async function buildStory(){
  const img=await uploadImage('dz-story'); if(!img){toast('ارفع صورة الشخصية','error');return null;}
  const scenes=Array.from(document.querySelectorAll('.story-scene')).map(i=>i.value.trim()).filter(Boolean);
  if(!scenes.length){toast('أضف مشهداً واحداً','error');return null;}
  const loraStr=+document.getElementById('story-lora').value;
  const seed=getSeed('story-seed');
  const graph = {
    "5":{class_type:"CheckpointLoaderSimple",inputs:{ckpt_name:"Qwen-Rapid-AIO-SFW-v5.safetensors"}},
    "27":{class_type:"LoraLoaderModelOnly",inputs:{lora_name:"next-scene_lora_v1-3000.safetensors",strength_model:loraStr,model:["5",0]}},
    "103":{class_type:"LoraLoaderModelOnly",inputs:{lora_name:"Kook_Qwen_V3极致真实.safetensors",strength_model:0.4,model:["27",0]}},
    "104":{class_type:"LoraLoaderModelOnly",inputs:{lora_name:"consistence_edit_v2.safetensors",strength_model:0.3,model:["103",0]}},
    "105":{class_type:"LoraLoaderModelOnly",inputs:{lora_name:"creampie_1.7.1.safetensors",strength_model:0.35,model:["104",0]}},
    "106":{class_type:"LoraLoaderModelOnly",inputs:{lora_name:"Storyboard.safetensors",strength_model:0.35,model:["105",0]}},
    "3":{class_type:"ModelSamplingAuraFlow",inputs:{shift:3.1,model:["106",0]}},
    "2":{class_type:"CFGNorm",inputs:{strength:1,model:["3",0]}},
    "9":{class_type:"LoadImage",inputs:{image:img}},
    "28":{class_type:"ConstrainImage|pysssss",inputs:{max_width:1024,max_height:1024,min_width:0,min_height:0,crop_if_required:"no",images:["9",0]}},
    "61":{class_type:"CR Text",inputs:{text:"Next Scene:"}},
    "23":{class_type:"CR Text",inputs:{text:scenes[0]}},
    "51":{class_type:"JDCN_StringToList",inputs:{string:["23",0]}},
    "56":{class_type:"easy int",inputs:{value:0}},
    "45":{class_type:"easy int",inputs:{value:1}},
    "54":{class_type:"easy forLoopStart",inputs:{total:["45",0],initial_value1:["56",0]}},
    "60":{class_type:"MathExpression|pysssss",inputs:{expression:"a+1",a:["54",2]}},
    "53":{class_type:"JDCN_AnyFileSelector",inputs:{Index:["60",0],Change:"fixed",PathList:["51",0]}},
    "62":{class_type:"CR Text Concatenate",inputs:{separator:"",text1:["61",0],text2:["53",0]}},
    "15":{class_type:"TextEncodeQwenImageEditPlusAdvance_lrzjason",inputs:{prompt:["62",0],target_size:1024,target_vl_size:384,upscale_method:"lanczos",crop_method:"center",instruction:"Describe the key features of the input image (color, shape, size, texture, objects, background), then explain how the user's text instruction should alter or modify the image. Generate a new image that meets the user's requirements while maintaining consistency with the original input where appropriate.",clip:["5",1],vae:["5",2],vl_resize_image1:["28",0]}},
    "6":{class_type:"ConditioningZeroOut",inputs:{conditioning:["15",0]}},
    "1":{class_type:"KSampler",inputs:{seed:seed,steps:8,cfg:3,sampler_name:"er_sde",scheduler:"beta",denoise:1,model:["2",0],positive:["15",0],negative:["6",0],latent_image:["15",1]}},
    "24":{class_type:"VAEDecode",inputs:{samples:["1",0],vae:["5",2]}},
    "57":{class_type:"easy batchAnything",inputs:{any_1:["54",3],any_2:["24",0]}},
    "55":{class_type:"easy forLoopEnd",inputs:{flow:["54",0],initial_value1:["60",0],initial_value2:["57",0]}},
    "65":{class_type:"easy boolean",inputs:{value:true}},
    "64":{class_type:"LazySwitch1way",inputs:{boolean:["65",0],ON_TRUE:["106",0],ON_FALSE:["5",0]}},
    "100":{class_type:"SeedVR2BlockSwap",inputs:{blocks_to_swap:0,use_non_blocking:true,offload_io_components:true}},
    "101":{class_type:"SeedVR2ExtraArgs",inputs:{tiled_vae:true,vae_tile_size:512,vae_tile_overlap:64,preserve_vram:false,cache_model:false,enable_debug:false}},
    "12":{class_type:"SeedVR2",inputs:{model:"seedvr2_ema_3b-Q8_0.gguf",seed:Math.floor(Math.random()*999999999999),new_resolution:1536,batch_size:1,images:["55",1],block_swap_config:["100",0],extra_args:["101",0]}},
    "102":{class_type:"SaveImage",inputs:{filename_prefix:"SAAD_STORY",images:["24",0]}},
    "10":{class_type:"SaveImage",inputs:{filename_prefix:"SAAD_STORY_UP",images:["12",0]}}
  };
  const r=await fetch('/api/prompt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:graph})});
  const d=await r.json();
  if(d.error){toast('خطأ: '+JSON.stringify(d.error).substring(0,120),'error');return null;}
  if(d.prompt_id){AUTH.consumeCredits(10);toast('تم الإرسال ⏳','success');showProg('story');pollResults(d.prompt_id,'story');}
  return null;
}


async function buildT2P(){
  const prompt = document.getElementById('t2p-prompt').value;
  const neg    = document.getElementById('t2p-neg').value;
  const w      = +document.getElementById('t2p-w').value;
  const h      = +document.getElementById('t2p-h').value;
  const steps  = +document.getElementById('t2p-steps').value;
  const rm     = +document.getElementById('t2p-rm').value;
  const seed   = getSeed('t2p-seed');
  const graph = {
    "1": {class_type:"CheckpointLoaderSimple", inputs:{ckpt_name:"Qwen-Rapid-AIO-SFW-v5.safetensors"}},
    "27":{class_type:"LoraLoader", inputs:{lora_name:"Qwen\\remove-clothes.safetensors", strength_model:rm, strength_clip:rm, model:["1",0], clip:["1",1]}},
    "29":{class_type:"LoraLoader", inputs:{lora_name:"URP_10.safetensors", strength_model:0.65, strength_clip:0.65, model:["27",0], clip:["27",1]}},
    "28":{class_type:"LoraLoader", inputs:{lora_name:"breast_slider_qwen_v1.safetensors", strength_model:0.55, strength_clip:0.55, model:["29",0], clip:["29",1]}},
    "3": {class_type:"CLIPTextEncode", inputs:{text:prompt, clip:["28",1]}},
    "4": {class_type:"CLIPTextEncode", inputs:{text:neg, clip:["1",1]}},
    "31":{class_type:"EmptyLatentImage", inputs:{width:w, height:h, batch_size:1}},
    "2": {class_type:"KSampler", inputs:{seed:seed, steps:steps, cfg:1, sampler_name:"sa_solver", scheduler:"beta", denoise:1, model:["28",0], positive:["3",0], negative:["4",0], latent_image:["31",0]}},
    "5": {class_type:"VAEDecode", inputs:{samples:["2",0], vae:["1",2]}},
    "16":{class_type:"SaveImage", inputs:{filename_prefix:"SAAD_T2P", images:["5",0]}}
  };
  const r=await fetch('/api/prompt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:graph})});
  const d=await r.json();
  if(d.error){toast('خطأ: '+JSON.stringify(d.error).substring(0,120),'error');return null;}
  if(d.prompt_id){AUTH.consumeCredits(10);toast('تم الإرسال ⏳','success');showProg('t2p');pollResults(d.prompt_id,'t2p');}
  return null;
}

async function runGoogleImageTool(mode){
  if(!AUTH.checkCredits(10)) return;
  // Nano Banana Pro: مفتوح لكل الخطط — الكريدت هو الحد الوحيد
  const cfg = GOOGLE_IMAGE_TOOL_CONFIG[mode];
  if(!cfg) return;
  const btn = document.getElementById(cfg.buttonId);
  const original = btn ? btn.textContent : '';
  const gbarTriggered = !!S.gbarTrigger;
  const gbarBtn = document.querySelector('#gbar .gbar-gen');
  const gbarOriginal = gbarBtn ? gbarBtn.innerHTML : '';
  const gbarStatus = document.getElementById('gbar-status');
  try{
    const promptEl = document.getElementById(cfg.promptId);
    const prompt = (promptEl?.value || googleBarState.prompt || '').trim();
    const neg = (document.getElementById(cfg.negId)?.value || '').trim();
    const ratio = document.getElementById(cfg.ratioId)?.value || googleBarState.ratio || '1:1';
    const quality = document.getElementById(cfg.qualityId)?.value || googleBarState.quality || '1K';
    const file = S.files[cfg.fileKey] || null;
    const estimatedCost = Number(cfg.cost?.(quality) || 0);
    const count = Math.max(1, Math.min(4, Number(googleBarState.count || 1)));
    if(!prompt) throw new Error('اكتب الوصف أولاً');

    if(btn){ btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> جاري التوليد...'; }
    if(gbarTriggered && gbarBtn){
      gbarBtn.disabled = true;
      gbarBtn.classList.add('gbar-gen-loading');
    }
    if(gbarTriggered && gbarStatus){
      gbarStatus.textContent = count > 1 ? `توليد ${count} صور...` : 'توليد...';
    }
    clearResults(cfg.resultId);

      const qualityMap = {
        '1K':'around 1024px class output quality',
        '2K':'around 2048px class output quality',
        '4K':'around 4096px class output quality'
      };
      const targetSize = getGoogleTargetSize(ratio, quality);
      const targetLabel = targetSize ? `${targetSize.width}x${targetSize.height}` : '';

    const parts = [{
      text: [
        cfg.instruction,
        prompt,
        `Target aspect ratio: ${ratio}.`,
          `Target quality: ${qualityMap[quality] || quality}.`,
          targetLabel ? `Target size: ${targetLabel}.` : '',
          neg ? `Avoid: ${neg}.` : ''
        ].filter(Boolean).join(' ')
      }];

    if(file){
      const dataUrl = await fileToDataUrl(file);
      const [meta, data] = String(dataUrl).split(',');
      const mime = (meta.match(/data:(.*);base64/)||[])[1] || 'image/png';
      parts.push({ inlineData: { mimeType: mime, data } });
    }

    const genBody = {
      model: cfg.model,
      generationConfig:{ responseModalities:['TEXT','IMAGE'] },
      parts
    };

    // Fire parallel requests for requested count
    const requests = [];
    for(let i = 0; i < count; i++){
      requests.push(
        fetch('/api/generate',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify(genBody)
        }).then(r => r.json()).catch(e => ({ error: e.message }))
      );
    }
    const results = await Promise.all(requests);

    let totalImages = 0;
    for(const d of results){
      if(d.error || !Array.isArray(d.images)) continue;
      for(const img of d.images){
        let finalImg = img;
        try{
          if(targetSize && typeof img === 'string' && img.startsWith('data:image/')){
            finalImg = await resizeDataUrlCover(img, targetSize.width, targetSize.height);
          }
        } catch(e){}
        const stored = await storeLocalImageUrl(finalImg, 'google');
        addResultItem(cfg.resultId, stored, false, prompt);
        addGoogleGalleryItem(stored, prompt, cfg.title);
        S.lastT2PImage = finalImg;
        S.lastT2PPrompt = prompt;
        totalImages++;
      }
    }
    if(totalImages === 0) throw new Error('لم يتم إرجاع صور');
    consumeGoogleBudget(estimatedCost * count);
    AUTH.consumeCredits(10 * count);
    toast(`تم التوليد عبر ${cfg.title} (${totalImages} صور) - التكلفة التقديرية ${formatUsd(estimatedCost * count)}`,'success');
  } catch(e){
    toast('خطأ: '+String(e.message||e).substring(0,140),'error');
    if(gbarTriggered && gbarStatus){
      gbarStatus.textContent = 'حدث خطأ';
    }
  } finally {
    if(btn){ btn.disabled = false; btn.textContent = original || cfg.title; }
    if(gbarTriggered && gbarBtn){
      gbarBtn.disabled = false;
      gbarBtn.classList.remove('gbar-gen-loading');
    }
    if(gbarTriggered && gbarStatus){
      setTimeout(()=>{ gbarStatus.textContent = ''; }, 1200);
    }
    if(gbarTriggered) S.gbarTrigger = false;
  }
}

async function sendT2PToVideo(){
  try{
    let source = S.lastT2PImage;
    if(!source && S.files['dz-t2p-ref']){
      source = await fileToDataUrl(S.files['dz-t2p-ref']);
    }
    if(!source){
      toast('ولّد صورة أولاً أو ارفع صورة مرجعية ثم أعد المحاولة','error');
      return;
    }
    const file = await dataUrlToFile(source, `nano-banana-${Date.now()}.png`);
    S.files['dz-vid'] = file;
    const inner = document.getElementById('dz-vid-inner');
    if(inner) inner.innerHTML = `<img src="${source}" class="dz-preview">`;
    const pos = document.getElementById('vid-pos');
    if(pos && S.lastT2PPrompt){
      pos.value = `${S.lastT2PPrompt}. Cinematic motion, smooth natural movement, high detail, consistent subject.`;
    }
    showPage('video', document.querySelectorAll('.nav-item')[1]);
    toast('تم إرسال الصورة إلى قسم الفيديو','success');
  } catch(e){
    toast('خطأ: '+String(e.message||e).substring(0,120),'error');
  }
}

async function generateGoogleVideo(){
  if(!checkPlanAccess('google-video')) return;
  if(!AUTH.checkCredits(50)) return;
  const btn = document.getElementById('gveo-btn');
  const original = btn ? btn.textContent : '';
  try{
    let source = S.lastT2PImage;
    if(!source && S.files['dz-t2p-ref']){
      source = await fileToDataUrl(S.files['dz-t2p-ref']);
    }
    if(!source){
      toast('ولّد أو عدّل صورة أولاً لاستخدامها كمرجع للفيديو','error');
      return;
    }

    const prompt = (document.getElementById('t2p-prompt')?.value || '').trim();
    const ratio = document.getElementById('t2p-ratio-val')?.value || '16:9';
    const quality = document.getElementById('t2p-qual-val')?.value || '1K';
    const resolutionMap = { '1K':'720p', '2K':'1080p', '4K':'1080p' };
    const videoPrompt = `${prompt}. Create a short cinematic video with smooth realistic motion, stable subject consistency, and premium commercial quality.`;

    if(btn){ btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> جاري طلب الفيديو من Google...'; }
    toast('تم إرسال طلب الفيديو إلى Google Veo','info');

    const startResp = await fetch('/api/google-video', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        prompt: videoPrompt,
        aspectRatio: ratio,
        resolution: resolutionMap[quality] || '720p',
        imageBase64: source
      })
    });
    const startData = await startResp.json();
    if(!startResp.ok || startData.error) throw new Error(startData.error || 'فشل بدء توليد الفيديو');
    if(!startData.operationName) throw new Error('Google لم يرجع رقم العملية');

    let finalVideoUrl = '';
    for(let i=0; i<80; i++){
      await wait(5000);
      const statusResp = await fetch(`/api/google-video/status?operation=${encodeURIComponent(startData.operationName)}`);
      const statusData = await statusResp.json();
      if(!statusResp.ok || statusData.error) throw new Error(statusData.error || 'فشل متابعة توليد الفيديو');
      if(statusData.done && statusData.videoUrl){
        finalVideoUrl = statusData.videoUrl;
        break;
      }
    }

    if(!finalVideoUrl) throw new Error('انتهت المهلة قبل اكتمال الفيديو');
    addResultItem('vid-results', finalVideoUrl, true, videoPrompt);
    showPage('video', document.querySelectorAll('.nav-item')[1]);
    AUTH.consumeCredits(50);
    toast('تم توليد الفيديو من Google بنجاح','success');
  } catch(e){
    toast('خطأ: '+String(e.message || e).substring(0,140), 'error');
  } finally {
    if(btn){ btn.disabled = false; btn.textContent = original || '🎞️ توليد فيديو من Google'; }
  }
}

async function generateGoogleVideoFromVideoPage(){
  if(!checkPlanAccess('google-video')) return;
  if(!AUTH.checkCredits(50)) return;
  const btn = document.getElementById('vid-google-btn');
  const original = btn ? btn.textContent : '';
  try{
    let source = '';
    if(S.files['dz-vid']){
      source = await fileToDataUrl(S.files['dz-vid']);
    } else if(S.lastT2PImage){
      source = S.lastT2PImage;
    }
    if(!source){
      toast('ارفع صورة في قسم الفيديو أو ولّد صورة أولاً','error');
      return;
    }

    const prompt = (document.getElementById('vid-pos')?.value || '').trim() || 'Create a cinematic video with smooth realistic motion.';
    const quality = document.querySelector('.vid-qual-btn.active')?.textContent?.trim() || '720p';
    const resolution = ['1080p','720p','480p'].includes(quality) ? quality : '720p';

    if(btn){ btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> جاري طلب Veo 3...'; }
    toast('تم إرسال طلب الفيديو إلى Google Veo 3','info');

    const startResp = await fetch('/api/google-video',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        prompt,
        aspectRatio:'16:9',
        resolution,
        imageBase64: source
      })
    });
    const startData = await startResp.json();
    if(!startResp.ok || startData.error) throw new Error(startData.error || 'فشل بدء فيديو Google');

    let finalVideoUrl = '';
    for(let i=0; i<80; i++){
      await wait(5000);
      const statusResp = await fetch(`/api/google-video/status?operation=${encodeURIComponent(startData.operationName)}`);
      const statusData = await statusResp.json();
      if(!statusResp.ok || statusData.error) throw new Error(statusData.error || 'فشل متابعة فيديو Google');
      if(statusData.done && statusData.videoUrl){
        finalVideoUrl = statusData.videoUrl;
        break;
      }
    }

    if(!finalVideoUrl) throw new Error('انتهت المهلة قبل اكتمال فيديو Veo 3');
    addResultItem('vid-results', finalVideoUrl, true, prompt);
    AUTH.consumeCredits(50);
    toast('تم توليد الفيديو عبر Google Veo 3','success');
  } catch(e){
    toast('خطأ: '+String(e.message || e).substring(0,140),'error');
  } finally {
    if(btn){ btn.disabled = false; btn.textContent = original || '🎞️ توليد فيديو عبر Google Veo 3'; }
  }
}

function updateVeo3UI(){
  const gentype = document.getElementById('g-veo3-gentype')?.value || 'auto';
  const model = document.getElementById('g-veo3-model')?.value || 'veo3_fast';
  const img1 = document.getElementById('veo3-img1-wrap');
  const img2 = document.getElementById('veo3-img2-wrap');
  const costEl = document.getElementById('veo3-cost-val');
  // Show image dropzones based on type
  const needsImage = (gentype !== 'TEXT_2_VIDEO');
  if(img1) img1.style.display = needsImage ? '' : 'none';
  if(img2) img2.style.display = (gentype === 'FIRST_AND_LAST_FRAMES_2_VIDEO') ? '' : 'none';
  // Mark second image as required visually
  const dz2 = document.getElementById('dz-g-veo3-2');
  if(dz2) dz2.style.outline = (gentype === 'FIRST_AND_LAST_FRAMES_2_VIDEO') ? '2px dashed var(--orange,#f90)' : '';
  // Cost estimate
  if(costEl) costEl.textContent = applyProfitMargin(model === 'veo3' ? 100 : 50);
}

async function runKieVeo3(){
  if(!checkPlanAccess('google-video')) return;
  const model = document.getElementById('g-veo3-model')?.value || 'veo3_fast';
  const cost = applyProfitMargin(model === 'veo3' ? 100 : 50);
  if(!AUTH.checkCredits(cost)) return;
  const btn = document.getElementById('g-veo3-btn');
  try{
    const prompt = (document.getElementById('g-veo3-prompt')?.value || '').trim();
    const gentype = document.getElementById('g-veo3-gentype')?.value || 'auto';
    const ratio = document.getElementById('g-veo3-ratio')?.value || '16:9';
    const file1 = S.files['dz-g-veo3'] || null;
    const file2 = S.files['dz-g-veo3-2'] || null;
    if(!prompt) throw new Error('اكتب وصف الفيديو أولاً');
    if(gentype === 'FIRST_AND_LAST_FRAMES_2_VIDEO' && (!file1 || !file2)) throw new Error('First & Last Frames يحتاج صورتين — الأولى والأخيرة');
    if(gentype === 'REFERENCE_2_VIDEO' && !file1) throw new Error('Reference يحتاج صورة مرجعية واحدة على الأقل');
    clearResults('g-veo3-results');

    // Upload images if present
    const imageUrls = [];
    for(const file of [file1, file2]){
      if(!file) continue;
      const b64 = await fileToDataUrl(file);
      const upResp = await fetch('/api/kie/upload-base64',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({imageBase64:b64}) });
      const upData = await upResp.json();
      if(!upResp.ok || !upData.url) throw new Error(upData.error || 'فشل رفع الصورة');
      imageUrls.push(upData.url);
    }

    if(btn){ btn.innerHTML = '<div class="spinner"></div> جاري توليد Veo 3.1...'; }

    const body = { prompt, model, aspect_ratio: ratio };
    if(gentype !== 'auto') body.generationType = gentype;
    if(imageUrls.length) body.imageUrls = imageUrls;

    const startResp = await fetch('/api/kie-veo/generate',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    const startData = await startResp.json();
    if(!startResp.ok || startData.error) throw new Error(startData.error || 'فشل بدء Veo 3.1');
    const taskId = startData.taskId;
    if(!taskId) throw new Error('لم يُرجع taskId');

    // Poll status
    let finalUrls = [];
    for(let i=0; i<120; i++){
      await wait(5000);
      if(btn) btn.innerHTML = `<div class="spinner"></div> انتظار... (${Math.round((i+1)*5/60)} دق)`;
      const stResp = await fetch(`/api/kie-veo/status?taskId=${encodeURIComponent(taskId)}`);
      const stData = await stResp.json();
      if(stData.error) throw new Error(stData.error);
      if(stData.done && stData.resultUrls && stData.resultUrls.length){
        finalUrls = stData.resultUrls;
        break;
      }
      if(String(stData.status||'').includes('fail')) throw new Error('فشل توليد Veo 3.1');
    }
    if(!finalUrls.length) throw new Error('انتهت المهلة قبل اكتمال Veo 3.1');

    for(const url of finalUrls){
      addVeo3ResultItem('g-veo3-results', url, prompt, taskId);
    }
    AUTH.consumeCredits(cost);
    toast('تم توليد الفيديو عبر Veo 3.1 ✓','success');
  } catch(e){
    toast('خطأ: '+String(e.message||e).substring(0,140),'error');
  } finally {
    if(btn){ btn.disabled = false; btn.textContent = 'Generate'; }
  }
}

async function runGoogleVeo3(){ return runKieVeo3(); }

function addVeo3ResultItem(containerId, url, prompt, taskId){
  const c = document.getElementById(containerId); if(!c) return;
  const emp = c.querySelector('.result-empty'); if(emp) emp.remove();
  const item = document.createElement('div');
  item.className = 'result-item';
  item.style.cssText = 'position:relative;border-radius:8px;overflow:hidden;background:#111;';
  const del = document.createElement('button');
  del.innerHTML = '✕';
  del.onclick = (e) => { e.stopPropagation(); deleteResult(del); };
  del.style.cssText = 'position:absolute;top:5px;right:5px;z-index:10;background:rgba(0,0,0,0.8);color:#fff;border:none;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;';
  const v = document.createElement('video');
  v.src = url; v.controls = false; v.loop = true; v.muted = true; v.playsInline = true; v.preload = 'metadata';
  v.style.cssText = 'width:100%;display:block;border-radius:8px;cursor:pointer;';
  v.onclick = (e) => { e.preventDefault(); e.stopPropagation(); openLightbox(url, prompt, true); };
  v.onplay = () => { v.pause(); openLightbox(url, prompt, true); };
  const play = document.createElement('div');
  play.textContent = '▶';
  play.style.cssText = 'position:absolute;inset:auto 10px 10px auto;width:28px;height:28px;border-radius:50%;background:rgba(0,0,0,0.55);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;pointer-events:none;';
  // Action bar: Extend, 1080P, 4K
  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;gap:4px;padding:6px 6px 4px;background:rgba(0,0,0,0.6);flex-wrap:wrap;';
  const mkBtn = (label, fn) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'flex:1;min-width:60px;font-size:10px;padding:3px 6px;border-radius:5px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.07);color:#eee;cursor:pointer;';
    b.onclick = fn;
    return b;
  };
  if(taskId){
    actions.appendChild(mkBtn('↗ Extend', () => openVeo3ExtendDialog(taskId, prompt)));
    actions.appendChild(mkBtn('HD 1080P', () => getVeo31080P(taskId, item)));
    actions.appendChild(mkBtn('4K', () => getVeo34K(taskId, item)));
  }
  item.appendChild(v); item.appendChild(play); item.appendChild(del); item.appendChild(actions);
  c.prepend(item);
  saveResult(containerId, url, true, prompt);
  syncGalleryFromResult(url, true, prompt);
}

function openVeo3ExtendDialog(taskId, originalPrompt){
  const p = prompt('امتداد الفيديو — اكتب وصف الإضافة:', '');
  if(!p || !p.trim()) return;
  extendKieVeo3(taskId, p.trim());
}

async function extendKieVeo3(taskId, extendPrompt){
  const model = document.getElementById('g-veo3-model')?.value || 'veo3_fast';
  const extModel = (model === 'veo3') ? 'quality' : 'fast';
  const cost = 50;
  if(!AUTH.checkCredits(cost)) return;
  toast('جاري طلب Extend Veo 3.1...', 'info');
  try{
    const resp = await fetch('/api/kie-veo/extend',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ taskId, prompt: extendPrompt, model: extModel }) });
    const data = await resp.json();
    if(!resp.ok || data.error) throw new Error(data.error || 'فشل طلب الامتداد');
    const newTaskId = data.taskId;
    toast('جاري انتظار الامتداد... قد يستغرق عدة دقائق', 'info');
    // Poll
    for(let i=0; i<120; i++){
      await wait(5000);
      const st = await fetch(`/api/kie-veo/status?taskId=${encodeURIComponent(newTaskId)}`);
      const stData = await st.json();
      if(stData.done && stData.resultUrls?.length){
        for(const url of stData.resultUrls) addVeo3ResultItem('g-veo3-results', url, extendPrompt, newTaskId);
        AUTH.consumeCredits(cost);
        toast('تم توليد الامتداد بنجاح ✓','success');
        return;
      }
      if(String(stData.status||'').includes('fail')) throw new Error('فشل Extend');
    }
    throw new Error('انتهت المهلة');
  } catch(e){
    toast('خطأ Extend: '+String(e.message||e).substring(0,120),'error');
  }
}

async function getVeo31080P(taskId, item){
  try{
    toast('جاري طلب 1080P...','info');
    const resp = await fetch(`/api/kie-veo/get-1080p?taskId=${encodeURIComponent(taskId)}`);
    const data = await resp.json();
    const url = data?.resultUrl || '';
    if(!url) throw new Error(data?.error || '1080P غير جاهز بعد، حاول بعد دقيقة');
    // Replace video src
    const v = item?.querySelector('video');
    if(v) v.src = url;
    toast('تم تحديث الفيديو إلى 1080P ✓','success');
  } catch(e){
    toast('1080P: '+String(e.message||e).substring(0,120),'error');
  }
}

async function getVeo34K(taskId, item){
  try{
    toast('جاري طلب 4K (قد يستغرق 5-10 دقائق)...','info');
    const resp = await fetch('/api/kie-veo/get-4k',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ taskId }) });
    const data = await resp.json();
    const urls = data?.resultUrls || [];
    if(!urls.length) throw new Error(data?.error || '4K غير جاهز بعد، حاول لاحقاً');
    const v = item?.querySelector('video');
    if(v) v.src = urls[0];
    toast('تم تحديث الفيديو إلى 4K ✓','success');
  } catch(e){
    toast('4K: '+String(e.message||e).substring(0,120),'error');
  }
}

function syncKlingModelLabel(value){
  const label = document.getElementById('kling-model-label');
  if(label) label.textContent = value || '--';
}

function setKlingStatus(message, kind='info'){
  const el = document.getElementById('kling-status');
  if(!el) return;
  const text = String(message || '').trim();
  if(!text){
    el.textContent = '';
    el.style.display = 'none';
    return;
  }
  el.style.display = 'block';
  el.textContent = text;
  el.style.color = kind === 'error' ? 'var(--red)' : kind === 'success' ? 'var(--green)' : 'var(--tx2)';
}

function extractApiErrorMessage(payload, fallback){
  // Handle plan restriction errors from server — show upgrade modal + return human message
  if (payload?.error === 'plan_required') {
    const tierMap = { starter: 0, pro: 1, creator: 2 };
    const needed = tierMap[payload.required] ?? 1;
    showUpgradeModal(needed);
    return payload.message || `هذا الموديل يتطلب خطة ${payload.required || 'Pro'} أو أعلى`;
  }
  const candidates = [
    payload?.error,
    payload?.message,
    payload?.msg,
    payload?.raw?.message,
    payload?.raw?.msg,
    payload?.raw?.error?.message,
    payload?.raw?.error,
    payload?.raw?.data?.message,
    payload?.raw?.data?.msg
  ];
  const text = candidates.find(value => typeof value === 'string' && value.trim());
  if (text) return text;
  return fallback;
}

function ensurePrompt(rawValue, minLength = 3, fieldName = 'البرومبت'){
  const value = String(rawValue || '').trim();
  if (value.length < minLength) {
    throw new Error(`الرجاء كتابة ${fieldName} واضح (على الأقل ${minLength} أحرف).`);
  }
  return value;
}

const STANDARD_RATIO_OPTIONS = ['1:1','4:3','3:4','16:9','9:16','2:3','3:2','21:9'];

function normalizeRatioSelect(select, fallback='16:9'){
  if(!select) return;
  const current = select.value || fallback;
  select.innerHTML = '';
  STANDARD_RATIO_OPTIONS.forEach(r => {
    const option = document.createElement('option');
    option.value = r;
    option.textContent = r;
    select.appendChild(option);
  });
  select.value = STANDARD_RATIO_OPTIONS.includes(current) ? current : fallback;
}

function normalizeAllRatioSelects(){
  const ratioIds = [
    'sora-ratio','hailuo-ratio','grok-ratio','seedream-ratio','zimage-ratio','seedance-ratio',
    'wan-ratio','infinitalk-ratio','flux2-ratio','fk-ratio','kling-text-ratio','kling-image-ratio','kling-motion-ratio',
    'gbar-ratio','g-nano-ratio','g-nano2-ratio','g-nanopro-ratio','g-veo3-ratio','qwen2-size'
  ];
  ratioIds.forEach(id => normalizeRatioSelect(document.getElementById(id)));
}

document.addEventListener('DOMContentLoaded', normalizeAllRatioSelects);

// ═══════════════════════════
// GLOBAL CONTROLS
// ═══════════════════════════

function buildGlobalControlCard(){
  const card = document.createElement('div');
  card.className = 'card global-ctrl-card';
  card.innerHTML = `
    <div class="card-head">الإعدادات الثابتة</div>
    <div class="card-body">
      <div class="field">
        <div class="flabel">ASPECT RATIO</div>
        <select class="fselect global-aspect">
          ${GLOBAL_RATIO_OPTIONS.map(r=>`<option value="${r}">${r}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <div class="flabel">RESOLUTION</div>
        <select class="fselect global-resolution">
          ${GLOBAL_RES_OPTIONS.map(r=>`<option value="${r}">${r}</option>`).join('')}
        </select>
      </div>
      <div class="field global-duration-wrap">
        <div class="flabel">DURATION (VIDEO)</div>
        <select class="fselect global-duration">
          ${GLOBAL_DURATION_OPTIONS.map(r=>`<option value="${r}">${r}</option>`).join('')}
        </select>
      </div>
    </div>
  `;
  return card;
}

function initGlobalControls(){
  const panels = document.querySelectorAll('.ctrl-panel, .gs-side');
  panels.forEach(panel => {
    if(panel.querySelector('.global-ctrl-card')) return;
    const card = buildGlobalControlCard();
    const page = panel.closest('.page')?.id?.replace('page-','') || '';
    card.setAttribute('data-page', page);
    const genBtn = panel.querySelector('.btn-generate');
    if(genBtn){
      panel.insertBefore(card, genBtn);
    } else {
      panel.appendChild(card);
    }
  });
  syncGlobalControlsUI();
  applyGlobalControlsToFields();
  updateGlobalDurationVisibility();
}

function syncGlobalControlsUI(){
  document.querySelectorAll('.global-aspect').forEach(el => el.value = GLOBAL_CONTROLS.aspectRatio || '16:9');
  document.querySelectorAll('.global-resolution').forEach(el => el.value = GLOBAL_CONTROLS.resolution || '2K');
  document.querySelectorAll('.global-duration').forEach(el => el.value = GLOBAL_CONTROLS.duration || '10');
}

function updateGlobalDurationVisibility(activePage){
  document.querySelectorAll('.global-ctrl-card').forEach(card => {
    const page = card.getAttribute('data-page') || '';
    const wrap = card.querySelector('.global-duration-wrap');
    if(!wrap) return;
    const shouldShow = VIDEO_PAGES.has(activePage || page);
    wrap.style.display = shouldShow ? '' : 'none';
  });
}

function setSelectIfAvailable(select, value){
  if(!select || value == null) return;
  const options = Array.from(select.options).map(o => o.value || o.text);
  const idx = options.indexOf(value);
  if(idx !== -1){
    select.value = select.options[idx].value;
    select.dispatchEvent(new Event('change'));
  }
}

function mapResolutionForSelect(select, globalValue){
  if(!select) return null;
  const options = Array.from(select.options).map(o => o.value || o.text);
  if(options.includes(globalValue)) return globalValue;
  if(options.includes('480p') || options.includes('720p') || options.includes('1080p')){
    if(globalValue === '4K' && options.includes('1080p')) return '1080p';
    if(globalValue === '2K' && options.includes('720p')) return '720p';
    if(options.includes('480p')) return '480p';
  }
  if(options.includes('basic') || options.includes('high')){
    return globalValue === '4K' ? 'high' : 'basic';
  }
  if(options.includes('2K') || options.includes('4K')){
    if(globalValue === '4K' && options.includes('4K')) return '4K';
    return options.includes('2K') ? '2K' : null;
  }
  if(options.includes('720p') && options.includes('1080p')){
    return globalValue === '4K' ? '1080p' : '720p';
  }
  return null;
}

function applyGlobalControlsToFields(){
  const ratio = GLOBAL_CONTROLS.aspectRatio || '16:9';
  const resolution = GLOBAL_CONTROLS.resolution || '2K';
  const duration = GLOBAL_CONTROLS.duration || '10';

  const ratioIds = [
    'sora-ratio','hailuo-ratio','grok-ratio','seedream-ratio','zimage-ratio','seedance-ratio',
    'wan-ratio','infinitalk-ratio','flux2-ratio','fk-ratio','kling-text-ratio','kling-image-ratio','kling-motion-ratio',
    'gbar-ratio','g-nano-ratio','g-nano2-ratio','g-nanopro-ratio','g-veo3-ratio','g-nano-ratio',
    'g-nano2-ratio','g-nanopro-ratio'
  ];

  ratioIds.forEach(id => {
    const el = document.getElementById(id);
    setSelectIfAvailable(el, ratio);
  });

  const resolutionIds = [
    'hailuo-resolution','grok-resolution','infinitalk-resolution','seedance-resolution','wan-resolution',
    'flux2-resolution','seedream-quality','g-veo3-resolution'
  ];
  resolutionIds.forEach(id => {
    const el = document.getElementById(id);
    const mapped = mapResolutionForSelect(el, resolution);
    if(mapped) setSelectIfAvailable(el, mapped);
  });

  const durationIds = ['hailuo-duration','grok-duration','seedance-duration','wan-duration','kling-text-duration','kling-image-duration','g-veo3-duration'];
  durationIds.forEach(id => {
    const el = document.getElementById(id);
    setSelectIfAvailable(el, duration);
  });
}

document.addEventListener('change', (e)=>{
  if(e.target.classList.contains('global-aspect')){
    GLOBAL_CONTROLS.aspectRatio = e.target.value;
    applyGlobalControlsToFields();
    return;
  }
  if(e.target.classList.contains('global-resolution')){
    GLOBAL_CONTROLS.resolution = e.target.value;
    applyGlobalControlsToFields();
    return;
  }
  if(e.target.classList.contains('global-duration')){
    GLOBAL_CONTROLS.duration = e.target.value;
    applyGlobalControlsToFields();
    return;
  }
});


function formatKieBalance(value){
  if(value == null || value === '') return 'N/A';
  const num = Number(value);
  if(Number.isFinite(num)) return `${num} credits`;
  return String(value);
}

function toggleKlingMultishot(mode, enabled){
  const panel = document.getElementById(`kling-${mode}-multishot-panel`);
  if(panel) panel.style.display = enabled ? 'block' : 'none';
  const soundEl = document.getElementById(`kling-${mode}-sound`);
  if(soundEl){
    if(enabled){
      soundEl.value = 'true';
      soundEl.disabled = true;
    } else {
      soundEl.disabled = false;
    }
  }
}

function applyKlingModelPreset(mode, model){
  syncKlingModelLabel(model);
  const durationEl = document.getElementById(`kling-${mode}-duration`);
  const multiShotEl = document.getElementById(`kling-${mode}-multishot`);
  const ratioEl = document.getElementById(`kling-${mode}-ratio`);
  if(!durationEl) return;

  const presets = {
    'kling-3.0/video': { min: 3, max: 15, multi: true },
    'kling-2.6/image-to-video': { min: 5, max: 10, multi: false },
    'kling/v2-5-turbo-image-to-video-pro': { min: 5, max: 10, multi: false },
    'kling-3.0/motion-control': { min: 3, max: 30, multi: false }
  };
  const preset = presets[model] || presets['kling-3.0/video'];
  durationEl.innerHTML = '';
  for(let i = preset.min; i <= preset.max; i++){
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = String(i);
    if(i === preset.min) option.selected = true;
    durationEl.appendChild(option);
  }
  if(ratioEl && model === 'kling-3.0/motion-control') ratioEl.value = '16:9';
  if(multiShotEl){
    multiShotEl.value = preset.multi ? multiShotEl.value : 'false';
    multiShotEl.disabled = !preset.multi;
    if(!preset.multi) toggleKlingMultishot(mode, false);
  }
  const cfgWrap = document.getElementById('kling-image-cfg')?.closest('.field');
  const negativeWrap = document.getElementById('kling-image-negative')?.closest('.field');
  const soundWrap = document.getElementById('kling-image-sound')?.closest('.field');
  const qualityWrap = document.getElementById('kling-image-mode')?.closest('.field');
  const ratioWrap = document.getElementById('kling-image-ratio')?.closest('.field');
  if(mode === 'image'){
    const isTurbo = model === 'kling/v2-5-turbo-image-to-video-pro';
    if(cfgWrap) cfgWrap.style.display = isTurbo ? '' : 'none';
    if(negativeWrap) negativeWrap.style.display = isTurbo ? '' : 'none';
    if(soundWrap) soundWrap.style.display = isTurbo ? 'none' : '';
    if(qualityWrap) qualityWrap.style.display = isTurbo ? 'none' : '';
    if(ratioWrap) ratioWrap.style.display = isTurbo ? 'none' : '';
  }
}

async function loadKieCredits(){
  // kie-credits-value is inside user-credits-bar — only update it for admin
  const adminOnly = !!_adminCsrf;
  const valueEls = [
    document.getElementById('kling-credits-value'),
    adminOnly ? document.getElementById('kie-credits-value') : null
  ].filter(Boolean);
  try{
    valueEls.forEach(el => { el.textContent = '...'; });
    const r = await fetch('/api/kie/credits', { headers: AUTH.headers() });
    const d = await r.json();
    if(!r.ok || d.error) throw new Error(extractApiErrorMessage(d, 'تعذر تحميل الرصيد. أعد تشغيل السيرفر وتحقق من المفتاح.'));
    const value = d.credits ?? d.totalCredits;
    valueEls.forEach(el => { el.textContent = formatKieBalance(value); });
    setKlingStatus('', 'success');
  } catch(e){
    valueEls.forEach(el => { el.textContent = '--'; });
    // Silently fail — credits balance is informational only, don't alarm the user
  }
}

async function pollKlingTask(taskId){
  for(let i=0; i<90; i++){
    await wait(5000);
    const r = await fetch(`/api/kie/kling/status?taskId=${encodeURIComponent(taskId)}`);
    const d = await r.json();
    if(!r.ok || d.error) throw new Error(extractApiErrorMessage(d, 'تعذر متابعة مهمة Kling.'));
    if(d.failed) throw new Error(d.failMsg || `Kling task failed: ${d.status || 'failed'}`);
    if(d.done) return d;
    setKlingStatus(`Kling task running... (${d.status || 'processing'})`);
  }
  throw new Error('Timed out while waiting for Kling result');
}

async function runKling(mode){
  const isImage  = mode === 'image';
  const isMotion = mode === 'motion';
  const prefix   = isMotion ? 'kling-motion' : (isImage ? 'kling-image' : 'kling-text');
  const _klModel  = document.getElementById(`${prefix}-model`)?.value || (isMotion ? 'kling-3.0/motion-control' : 'kling-3.0/video');
  const _klDur    = Number(isMotion ? 10 : (document.getElementById(`${prefix}-duration`)?.value || '10'));
  const _klModeUi = isMotion ? (document.getElementById('kling-motion-res')?.value || '2K') : (document.getElementById(`${prefix}-mode`)?.value || '2K');
  const _klGMode  = mapKlingModeFromResolution(_klModeUi);
  const _klSound  = isMotion ? false : (document.getElementById(`${prefix}-sound`)?.value || 'true') === 'true';
  const _klResRaw = isMotion ? (document.getElementById('kling-motion-res')?.value || '2K') : '1K';
  const _klRes    = mapUiResolution(_klResRaw, { '1K':'720p', '2K':'1080p', '4K':'1080p' }, '720p');
  const _klCost   = applyProfitMargin(calcCreditCost(_klModel, { duration: _klDur, mode: _klGMode, audio: _klSound, resolution: _klRes }));
  if(!checkPlanAccess(_klModel, _klGMode)) return;
  if(!AUTH.checkCredits(_klCost)) return;
  const btn = document.getElementById(`${prefix}-btn`);
  const original = btn ? btn.textContent : '';
  const defaultNegative = 'low quality, worst quality, blurry, out of focus, artifacts, noise, compression, watermark, text, logo, deformed, distorted, extra limbs, mutated, bad anatomy, bad hands, missing fingers, extra fingers, cropped, out of frame, oversaturated, underexposed, overexposed';
  try{
    const modelName = document.getElementById(`${prefix}-model`)?.value || (isMotion ? 'kling-3.0/motion-control' : 'kling-3.0/video');
    const prompt = (document.getElementById(`${prefix}-prompt`)?.value || '').trim();
    const negativePromptInput = (document.getElementById(`${prefix}-negative`)?.value || '').trim();
    const negativePrompt = isMotion ? '' : (negativePromptInput || defaultNegative);
    const aspectRatio = document.getElementById(`${prefix}-ratio`)?.value || '16:9';
    const duration = isMotion ? '10' : (document.getElementById(`${prefix}-duration`)?.value || '10');
    const motionResUi = document.getElementById('kling-motion-res')?.value || '2K';
    const uiModeValue = document.getElementById(`${prefix}-mode`)?.value || '2K';
    const generationMode = isMotion
      ? mapKlingModeFromResolution(motionResUi)
      : mapKlingModeFromResolution(uiModeValue);
    const sound = isMotion ? false : (document.getElementById(`${prefix}-sound`)?.value || 'true') === 'true';
    const multiShots = isMotion ? false : (document.getElementById(`${prefix}-multishot`)?.value || 'false') === 'true';
    const cfgScale = isImage ? (document.getElementById('kling-image-cfg')?.value || '') : '';
    const multiPrompt = [1,2,3]
      .map(index => ({ prompt: (document.getElementById(`${prefix}-shot-${index}`)?.value || '').trim(), duration: 3 }))
      .filter(item => item.prompt);
    if(!isMotion && !multiShots && !prompt) throw new Error('Write the prompt first');
    if(multiShots && multiPrompt.length === 0) throw new Error('Write at least one multi-shot prompt');

    syncKlingModelLabel(modelName);
    if(btn){ btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> جارٍ الإرسال إلى Kling...'; }
    clearResults(isMotion ? 'kling-results-motion' : (isImage ? 'kling-results-image' : 'kling-results'));
    clearKlingResult();
    updateKlingShowButtons();
    setKlingStatus('Preparing request...');

    const imageUrls = [];
    let videoUrls = [];
    let characterOrientation = 'video';
    if(isMotion){
      const motionImage = S.files['dz-kling-motion-image'];
      const motionVideo = S.files['dz-kling-motion-video'];
      if(!motionImage) throw new Error('Upload the motion control image first');
      if(!motionVideo) throw new Error('Upload the motion reference video first');
      setKlingStatus('Uploading image...');
      imageUrls.push(await uploadKieBinaryFile(motionImage));
      const motionVideoUrl = await uploadKieBinaryFile(motionVideo);
      videoUrls = [motionVideoUrl];
      characterOrientation = document.getElementById('kling-motion-orientation')?.value || 'video';
    } else if(isImage){
      const startFile = S.files['dz-kling-image-start'];
      const endFile = S.files['dz-kling-image-end'];
      if(imageUrls.length === 0){
        if(!startFile && !endFile) throw new Error('Upload at least one frame');
        for(const file of [startFile, endFile]){
          if(!file) continue;
          setKlingStatus('Uploading image...');
          imageUrls.push(await uploadKieBinaryFile(file));
        }
      }
    }

    setKlingStatus('Creating Kling task...');
    const startResp = await fetch('/api/kie/kling/create',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        mode: isImage ? 'image2video' : 'text2video',
        modelName,
        prompt,
        negativePrompt,
        aspectRatio,
        duration,
        imageUrls,
        videoUrls,
        characterOrientation,
        generationMode,
        sound,
        multiShots,
        multiPrompt,
        tailImageUrl: isImage && modelName === 'kling/v2-5-turbo-image-to-video-pro' ? (imageUrls[1] || '') : '',
        cfgScale
      })
    });
    const startData = await startResp.json();
    if(!startResp.ok || startData.error) throw new Error(extractApiErrorMessage(startData, 'فشل إنشاء مهمة Kling.'));
    if(!startData.taskId) throw new Error(extractApiErrorMessage(startData, 'لم يتم استلام Task ID (تحقق من أبعاد الصورة ≥ 300px وأخطاء الموديل).'));

    setKlingStatus(`Task created: ${startData.taskId}`);
    saveKlingPending({ taskId: startData.taskId, mode, prompt, createdAt: Date.now() });
    const finalData = await pollKlingTask(startData.taskId);
    const urls = Array.isArray(finalData.videoUrls) ? finalData.videoUrls : [];
    if(urls.length === 0) throw new Error('Kling finished without video URLs');
    const targetId = isMotion ? 'kling-results-motion' : (isImage ? 'kling-results-image' : 'kling-results');
    // Navigate to Kling page and correct tab before showing results
    if(typeof showPage === 'function') showPage('kling');
    if(typeof setKlingTab === 'function') setKlingTab(isMotion ? 'motion' : (isImage ? 'image' : 'text'));
    urls.forEach(url => addResultItem(targetId, url, true, prompt));
    clearKlingPending();
    clearKlingResult();
    updateKlingShowButtons();
    setKlingStatus('تم توليد الفيديو وإظهاره تلقائياً.','success');
    AUTH.consumeCredits(_klCost);
    toast('Kling generation completed','success');
    // Scroll results into view
    setTimeout(() => {
      const el = document.getElementById(targetId);
      if(el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
  } catch(e){
    setKlingStatus(String(e.message || e).substring(0,160), 'error');
    toast('خطأ: '+String(e.message || e).substring(0,140),'error');
  } finally {
    if(btn){ btn.disabled = false; btn.textContent = original || 'Generate'; }
  }
}

async function runKlingAvatar(){
  const btn = document.getElementById('kling-avatar-btn');
  const original = btn ? btn.textContent : '';
  const _avatarModel = document.getElementById('kling-avatar-model')?.value || 'kling/ai-avatar-standard';
  if(!checkPlanAccess(_avatarModel)) return;
  const _avatarCost = _avatarModel.includes('pro') ? 100 : 50;
  if(!AUTH.checkCredits(_avatarCost)) return;
  try{
    const modelName = document.getElementById('kling-avatar-model')?.value || 'kling/ai-avatar-standard';
    const prompt = (document.getElementById('kling-avatar-prompt')?.value || '').trim();
    const imageFile = S.files['dz-kling-avatar-image'];
    const audioFile = S.files['dz-kling-avatar-audio'];

    if(!prompt) throw new Error('اكتب وصف الصوت أو الأسلوب أولاً');
    if(!imageFile) throw new Error('ارفع صورة الوجه أولاً');
    if(!audioFile) throw new Error('ارفع ملف الصوت أولاً');

    syncKlingModelLabel(modelName);
    if(btn){ btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> جارٍ الإرسال إلى Kling...'; }
    clearResults('kling-results-avatar');
    clearKlingResult();
    updateKlingShowButtons();
    setKlingStatus('Uploading image...');
    const imageUrl = await uploadKieBinaryFile(imageFile);
    setKlingStatus('Uploading audio...');
    const audioUrl = await uploadKieBinaryFile(audioFile);

    setKlingStatus('Creating Kling avatar task...');
    const startResp = await fetch('/api/kie/kling/create',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        mode:'avatar',
        modelName,
        prompt,
        imageUrl,
        audioUrl
      })
    });
    const startData = await startResp.json();
    if(!startResp.ok || startData.error) throw new Error(extractApiErrorMessage(startData, 'فشل إنشاء مهمة Kling Avatar.'));
    if(!startData.taskId) throw new Error(extractApiErrorMessage(startData, 'لم يتم استلام Task ID من Kling Avatar.'));

    setKlingStatus(`Task created: ${startData.taskId}`);
    saveKlingPending({ taskId: startData.taskId, mode: 'avatar', prompt, createdAt: Date.now() });
    const finalData = await pollKlingTask(startData.taskId);
    const urls = Array.isArray(finalData.videoUrls) ? finalData.videoUrls : [];
    if(urls.length === 0) throw new Error('Kling Avatar finished without video URLs');
    urls.forEach(url => addResultItem('kling-results-avatar', url, true, prompt));
    clearKlingPending();
    clearKlingResult();
    updateKlingShowButtons();
    setKlingStatus('تم توليد فيديو الأفاتار وإظهاره تلقائياً.','success');
    AUTH.consumeCredits(_avatarCost);
    toast('Kling avatar completed','success');
  } catch(e){
    setKlingStatus(String(e.message || e).substring(0,160), 'error');
    toast('خطأ: '+String(e.message || e).substring(0,140),'error');
  } finally {
    if(btn){ btn.disabled = false; btn.textContent = original || 'Generate'; }
  }
}

async function resumePendingKling(){
  const pending = loadKlingPending();
  if(!pending?.taskId) return;
  try{
    setKlingStatus('جاري متابعة مهمة Kling...');
    const finalData = await pollKlingTask(pending.taskId);
    const urls = Array.isArray(finalData.videoUrls) ? finalData.videoUrls : [];
    if(urls.length === 0) throw new Error('Kling finished without video URLs');
    const targetId = pending.mode === 'motion'
      ? 'kling-results-motion'
      : (pending.mode === 'image'
        ? 'kling-results-image'
        : (pending.mode === 'avatar' ? 'kling-results-avatar' : 'kling-results'));
    // Navigate to Kling page and correct tab before showing results
    if(typeof showPage === 'function') showPage('kling');
    const resumeTab = pending.mode === 'motion' ? 'motion' : (pending.mode === 'image' ? 'image' : (pending.mode === 'avatar' ? 'avatar' : 'text'));
    if(typeof setKlingTab === 'function') setKlingTab(resumeTab);
    urls.forEach(url => addResultItem(targetId, url, true, pending.prompt || ''));
    clearKlingPending();
    clearKlingResult();
    updateKlingShowButtons();
    setKlingStatus('تم استرجاع الفيديو وإظهاره تلقائياً.','success');
    AUTH.consumeCredits(50);
    toast('Kling video ready!','success');
    // Scroll results into view
    setTimeout(() => {
      const el = document.getElementById(targetId);
      if(el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  } catch(e){
    setKlingStatus(String(e.message || e).substring(0,160), 'error');
  }
}

function syncKieToolLabel(value){
  const label = document.getElementById('kling-model-label');
  if(label) label.textContent = value || '--';
}

function updateKieUpscaleFields(){
  const model = document.getElementById('kie-upscale-model')?.value || 'recraft/crisp-upscale';
  const factorField = document.getElementById('kie-upscale-factor-field');
  if(factorField) factorField.style.display = model === 'topaz/image-upscale' ? 'block' : 'none';
  try{ refreshKieUpscaleCost(); } catch(e){}
}

function setImageToolStatus(id, msg, kind='info'){
  const el = document.getElementById(id);
  if(!el) return;
  el.textContent = msg || '';
  el.style.color = kind === 'error' ? 'var(--red)' : kind === 'success' ? 'var(--green)' : 'var(--tx2)';
}

async function pollKieImageTask(taskId, statusId){
  if(!taskId) throw new Error('لم يتم استلام taskId من السيرفر.');
  const updateStatus = (msg, kind) => {
    if(statusId) setImageToolStatus(statusId, msg, kind);
    else setKlingStatus(msg, kind);
  };
  for(let i=0; i<90; i++){
    await wait(3500);
    const r = await fetch(`/api/kie/image/status?taskId=${encodeURIComponent(taskId)}`);
    const d = await r.json();
    if(!r.ok || d.error) throw new Error(extractApiErrorMessage(d, 'تعذر متابعة مهمة أدوات الصور.'));
    if(d.failed) throw new Error(d.failMsg || `Image tool failed: ${d.status || 'failed'}`);
    if(d.done) return d;
    updateStatus(`⏳ جاري المعالجة... (${d.status || 'processing'}) [${i+1}/90]`);
  }
  throw new Error('انتهت مدة الانتظار لنتيجة الصورة');
}

function getTaskId(resp){
  if(!resp) return '';
  return resp.taskId || resp.task_id || resp.data?.taskId || resp.data?.task_id || '';
}

async function runKieRemoveBg(){
  const btn = document.getElementById('kie-removebg-btn');
  const statusId = 'kie-removebg-status';
  const original = btn ? btn.textContent : '';
  try{
    const file = S.files['dz-kie-removebg'];
    if(!file) throw new Error('ارفع الصورة أولاً');
    const model = document.getElementById('kie-removebg-model')?.value || 'recraft/remove-background';
    const cost = calcCreditCost(model, {});
    if(!AUTH.checkCredits(cost)) return;
    if(btn){ btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> جارٍ المعالجة...'; }
    clearResults('kie-image-results');
    setImageToolStatus(statusId, 'جاري رفع الصورة...');
    const imageUrl = await uploadKieBinaryFile(file);
    setImageToolStatus(statusId, 'جاري إنشاء المهمة...');
    const startResp = await fetch('/api/kie/image/create',{
      method:'POST',
      body: JSON.stringify({ model, input:{ image: imageUrl } })
    });
    const startData = await startResp.json();
    if(!startResp.ok || startData.error) throw new Error(extractApiErrorMessage(startData, 'فشل إنشاء مهمة إزالة الخلفية.'));
    const taskId = getTaskId(startData);
    if(!taskId) throw new Error('لم يتم استلام taskId من السيرفر.');
    setImageToolStatus(statusId, `Task: ${taskId} — جاري المعالجة...`);
    const finalData = await pollKieImageTask(taskId, statusId);
    const urls = Array.isArray(finalData.imageUrls) ? finalData.imageUrls : [];
    if(urls.length === 0) throw new Error('انتهت المهمة بدون روابط صور');
    urls.forEach(url => addResultItem('kie-image-results', url, false, 'Remove Background'));
    setImageToolStatus(statusId, '✅ تم إزالة الخلفية.', 'success');
    AUTH.consumeCredits(cost);
  } catch(e){
    setImageToolStatus(statusId, '❌ ' + String(e.message || e).substring(0,160), 'error');
    toast('خطأ: '+String(e.message || e).substring(0,140),'error');
  } finally {
    if(btn){ btn.disabled = false; btn.textContent = original || 'Generate'; }
  }
}

async function runKieUpscale(){
  const btn = document.getElementById('kie-upscale-btn');
  const statusId = 'kie-upscale-status';
  const original = btn ? btn.textContent : '';
  try{
    const file = S.files['dz-kie-upscale'];
    if(!file) throw new Error('ارفع الصورة أولاً');
    const model = document.getElementById('kie-upscale-model')?.value || 'recraft/crisp-upscale';
    const cost = calcCreditCost(model, {});
    if(!AUTH.checkCredits(cost)) return;
    const factor = document.getElementById('kie-upscale-factor')?.value || '2';
    if(btn){ btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> جارٍ التكبير...'; }
    clearResults('kie-upscale-results');
    setImageToolStatus(statusId, 'جاري رفع الصورة...');
    const imageUrl = await uploadKieBinaryFile(file);
    setImageToolStatus(statusId, 'جاري إنشاء مهمة التكبير...');
    const input = model === 'recraft/crisp-upscale'
      ? { image: imageUrl }
      : { image_url: imageUrl, upscale_factor: String(factor) };
    const startResp = await fetch('/api/kie/image/create',{
      method:'POST',
      body: JSON.stringify({ model, input })
    });
    const startData = await startResp.json();
    if(!startResp.ok || startData.error) throw new Error(extractApiErrorMessage(startData, 'فشل إنشاء مهمة التكبير.'));
    const taskId = getTaskId(startData);
    if(!taskId) throw new Error('لم يتم استلام taskId من السيرفر.');
    setImageToolStatus(statusId, `Task: ${taskId} — جاري المعالجة...`);
    const finalData = await pollKieImageTask(taskId, statusId);
    const urls = Array.isArray(finalData.imageUrls) ? finalData.imageUrls : [];
    if(urls.length === 0) throw new Error('انتهت المهمة بدون روابط صور');
    const label = model === 'recraft/crisp-upscale' ? 'Recraft Crisp Upscale' : `Upscale ${factor}x`;
    urls.forEach(url => addResultItem('kie-upscale-results', url, false, label));
    setImageToolStatus(statusId, `✅ تم التكبير ${factor}x.`, 'success');
    AUTH.consumeCredits(cost);
  } catch(e){
    setImageToolStatus(statusId, '❌ ' + String(e.message || e).substring(0,160), 'error');
    toast('خطأ: '+String(e.message || e).substring(0,140),'error');
  } finally {
    if(btn){ btn.disabled = false; btn.textContent = original || 'Generate'; }
  }
}

function syncElevenModelLabel(value){
  const label = document.getElementById('eleven-model-label');
  if(label) label.textContent = value || '--';
}

const ELEVEN_VOICE_OPTIONS = [
  ['Rachel','Rachel'],['Aria','Aria'],['Roger','Roger'],['Sarah','Sarah'],['Laura','Laura'],['Charlie','Charlie'],['George','George'],['Callum','Callum'],['River','River'],['Liam','Liam'],['Charlotte','Charlotte'],['Alice','Alice'],['Matilda','Matilda'],['Will','Will'],['Jessica','Jessica'],['Eric','Eric'],['Chris','Chris'],['Brian','Brian'],['Daniel','Daniel'],['Lily','Lily'],['Bill','Bill'],
  ['BIvP0GN1cAtSRTxNHnWS','Ellen - Serious, Direct and Confident'],
  ['aMSt68OGf4xUZAnLpTU8','Juniper - Grounded and Professional'],
  ['RILOU7YmBhvwJGDGjNmP','Jane - Professional Audiobook Reader'],
  ['EkK5I93UQWFDigLMpZcX','James - Husky, Engaging and Bold'],
  ['Z3R5wn05IrDiVCyEkUrK','Arabella - Mysterious and Emotive'],
  ['tnSpp4vdxKPjI9w0GnoV','Hope - upbeat and clear'],
  ['NNl6r8mD7vthiJatiJt1','Bradford - Expressive and Articulate'],
  ['YOq2y2Up4RgXP2HyXjE5','Xavier - Dominating, Metalic Announcer'],
  ['Bj9UqZbhQsanLzgalpEG','Austin - Deep, Raspy and Authentic'],
  ['c6SfcYrb2t09NHXiT80T','Jarnathan - Confident and Versatile'],
  ['B8gJV1IhpuegLxdpXFOE','Kuon - Cheerful, Clear and Steady'],
  ['exsUS4vynmxd379XN4yO','Blondie - Conversational'],
  ['BpjGufoPiobT79j2vtj4','Priyanka - Calm, Neutral and Relaxed'],
  ['2zRM7PkgwBPiau2jvVXc','Monika Sogam - Deep and Natural'],
  ['1SM7GgM6IMuvQlz2BwM3','Mark - Casual, Relaxed and Light'],
  ['ouL9IsyrSnUkCmfnD02u','Grimblewood Thornwhisker - Snarky Gnome & Magical Maintainer'],
  ['5l5f8iK3YPeGga21rQIX','Adeline - Feminine and Conversational'],
  ['scOwDtmlUjD3prqpp97I','Sam - Support Agent'],
  ['NOpBlnGInO9m6vDvFkFC','Spuds Oxley - Wise and Approachable'],
  ['BZgkqPqms7Kj9ulSkVzn','Eve - Authentic, Energetic and Happy'],
  ['wo6udizrrtpIxWGp2qJk','Northern Terry'],
  ['yjJ45q8TVCrtMhEKurxY','Dr. Von - Quirky, Mad Scientist'],
  ['gU0LNdkMOQCOrPrwtbee','British Football Announcer'],
  ['DGzg6RaUqxGRTHSBjfgF','Brock - Commanding and Loud Sergeant'],
  ['DGTOOUoGpoP6UZ9uSWfA','Celian - Documentary Narrator'],
  ['x70vRnQBMBu4FAYhjJbO','Nathan - Virtual Radio Host'],
  ['P1bg08DkjqiVEzOn76yG','Viraj - Rich and Soft'],
  ['qDuRKMlYmrm8trt5QyBn','Taksh - Calm, Serious and Smooth'],
  ['kUUTqKQ05NMGulF08DDf','Guadeloupe Merryweather - Emotional'],
  ['qXpMhyvQqiRxWQs4qSSB','Horatius - Energetic Character Voice'],
  ['TX3LPaxmHKxFdv7VOQHJ','Liam - Energetic, Social Media Creator'],
  ['iP95p4xoKVk53GoZ742B','Chris - Charming, Down-to-Earth'],
  ['SOYHLrjzK2X1ezoPC6cr','Harry - Fierce Warrior'],
  ['N2lVS1w4EtoT3dr4eOWO','Callum - Husky Trickster'],
  ['FGY2WhTYpPnrIDTdsKH5','Laura - Enthusiast, Quirky Attitude'],
  ['XB0fDUnXU5powFXDhCwa','Charlotte'],
  ['cgSgspJ2msm6clMCkdW9','Jessica - Playful, Bright, Warm'],
  ['MnUw1cSnpiLoLhpd3Hqp','Heather Rey - Rushed and Friendly'],
  ['kPzsL2i3teMYv0FxEYQ6','Brittney - Social Media Voice - Fun, Youthful and Informative'],
  ['UgBBYS2sOqTuMpoF3BR0','Mark - Natural Conversations'],
  ['IjnA9kwZJHJ20Fp7Vmy6','Matthew - Casual, Friendly and Smooth'],
  ['KoQQbl9zjAdLgKZjm8Ol','Pro Narrator - Convincing story teller'],
  ['hpp4J3VqNfWAUOO0d1Us','Bella - Professional, Bright, Warm'],
  ['pNInz6obpgDQGcFmaJgB','Adam - Dominant, Firm'],
  ['nPczCjzI2devNBz1zQrb','Brian - Deep, Resonant and Comforting'],
  ['L0Dsvb3SLTyegXwtm47J','Archer'],
  ['uYXf8XasLslADfZ2MB4u','Hope - Bubbly, Gossipy and Girly'],
  ['gs0tAILXbY5DNrJrsM6F','Jeff - Classy, Resonating and Strong'],
  ['DTKMou8ccj1ZaWGBiotd','Jamahal - Young, Vibrant, and Natural'],
  ['vBKc2FfBKJfcZNyEt1n6','Finn - Youthful, Eager and Energetic'],
  ['TmNe0cCqkZBMwPWOd3RD','Smith - Mellow, Spontaneous, and Bassy'],
  ['DYkrAHD8iwork3YSUBbs','Tom - Conversations and Books'],
  ['56AoDkrOh6qfVPDXZ7Pt','Cassidy - Crisp, Direct and Clear'],
  ['eR40ATw9ArzDf9h3v7t7','Addison 2.0 - Australian Audiobook and Podcast'],
  ['g6xIsTj2HwM6VR4iXFCw','Jessica Anne Bogart - Chatty and Friendly'],
  ['lcMyyd2HUfFzxdCaC4Ta','Lucy - Fresh and Casual'],
  ['6aDn1KB0hjpdcocrUkmq','Tiffany - Natural and Welcoming'],
  ['Sq93GQT4X1lKDXsQcixO','Felix - Warm, positive and contemporary RP'],
  ['vfaqCOvlrKi4Zp7C2IAm','Malyx - Echoey, Menacing and Deep Demon'],
  ['piI8Kku0DcvcL6TTSeQt','Flicker - Cheerful Fairy and Sparkly Sweetness'],
  ['KTPVrSVAEUSJRClDzBw7','Bob - Rugged and Warm Cowboy'],
  ['flHkNRp1BlvT73UL6gyz','Jessica Anne Bogart - Eloquent Villain'],
  ['9yzdeviXkFddZ4Oz8Mok','Lutz - Chuckling, Giggly and Cheerful'],
  ['pPdl9cQBQq4p6mRkZy2Z','Emma - Adorable and Upbeat'],
  ['0SpgpJ4D3MpHCiWdyTg3','Matthew Schmitz - Elitist, Arrogant, Conniving Tyrant'],
  ['UFO0Yv86wqRxAt1DmXUu','Sarcastic and Sultry Villain'],
  ['oR4uRy4fHDUGGISL0Rev','Myrrdin - Wise and Magical Narrator'],
  ['zYcjlYFOd3taleS0gkk3','Edward - Loud, Confident and Cocky'],
  ['nzeAacJi50IvxcyDnMXa','Marshal - Friendly, Funny Professor'],
  ['ruirxsoakN0GWmGNIo04','John Morgan - Gritty, Rugged Cowboy'],
  ['1KFdM0QCwQn4rmn5nn9C','Parasyte - Whispers from the Deep Dark'],
  ['TC0Zp7WVFzhA8zpTlRqV','Aria - Sultry Villain'],
  ['ljo9gAlSqKOvF6D8sOsX','Viking Bjorn - Epic Medieval Raider'],
  ['PPzYpIqttlTYA83688JI','Pirate Marshal'],
  ['ZF6FPAbjXT4488VcRRnw','Amelia - Enthusiastic and Expressive'],
  ['8JVbfL6oEdmuxKn5DK2C','Johnny Kid - Serious and Calm Narrator'],
  ['iCrDUkL56s3C8sCRl7wb','Hope - Poetic, Romantic and Captivating'],
  ['1hlpeD1ydbI2ow0Tt3EW','Olivia - Smooth, Warm and Engaging'],
  ['wJqPPQ618aTW29mptyoc','Ana Rita - Smooth, Expressive and Bright'],
  ['EiNlNiXeDU1pqqOPrYMO','John Doe - Deep'],
  ['FUfBrNit0NNZAwb58KWH','Angela - Conversational and Friendly'],
  ['4YYIPFl9wE5c4L2eu2Gb','Burt Reynolds - Deep, Smooth and Clear'],
  ['OYWwCdDHouzDwiZJWOOu','David - Gruff Cowboy'],
  ['6F5Zhi321D3Oq7v1oNT4','Hank - Deep and Engaging Narrator'],
  ['qNkzaJoHLLdpvgh5tISm','Carter - Rich, Smooth and Rugged'],
  ['YXpFCvM1S3JbWEJhoskW','Wyatt - Wise Rustic Cowboy'],
  ['9PVP7ENhDskL0KYHAKtD','Jerry B. - Southern Cowboy'],
  ['LG95yZDEHg6fCZdQjLqj','Phil - Explosive, Passionate Announcer'],
  ['CeNX9CMwmxDxUF5Q2Inm','Johnny Dynamite - Vintage Radio DJ'],
  ['st7NwhTPEzqo2riw7qWC','Blondie - Radio Host'],
  ['aD6riP1btT197c6dACmy','Rachel M - Pro British Radio Presenter'],
  ['FF7KdobWPaiR0vkcALHF','David - Movie Trailer Narrator'],
  ['mtrellq69YZsNwzUSyXh','Rex Thunder - Deep N Tough'],
  ['dHd5gvgSOzSfduK4CvEg','Ed - Late Night Announcer'],
  ['cTNP6ZM2mLTKj2BFhxEh','Paul French - Podcaster'],
  ['eVItLK1UvXctxuaRV2Oq','Jean - Alluring and Playful Femme Fatale'],
  ['U1Vk2oyatMdYs096Ety7','Michael - Deep, Dark and Urban'],
  ['esy0r39YPLQjOczyOib8','Britney - Calm and Calculative Villain'],
  ['bwCXcoVxWNYMlC6Esa8u','Matthew Schmitz - Gravel, Deep Anti-Hero'],
  ['D2jw4N9m4xePLTQ3IHjU','Ian - Strange and Distorted Alien'],
  ['Tsns2HvNFKfGiNjllgqo','Sven - Emotional and Nice'],
  ['Atp5cNFg1Wj5gyKD7HWV','Natasha - Gentle Meditation'],
  ['1cxc5c3E9K6F1wlqOJGV','Emily - Gentile, Soft and Meditative'],
  ['1U02n4nD6AdIZ9CjF053','Viraj - Smooth and Gentle'],
  ['HgyIHe81F3nXywNwkraY','Nate - Sultry, Whispery and Seductive'],
  ['AeRdCCKzvd23BpJoofzx','Nathaniel - Engaging, British and Calm'],
  ['LruHrtVF6PSyGItzMNHS','Benjamin - Deep, Warm, Calming'],
  ['Qggl4b0xRMiqOwhPtVWT','Clara - Relaxing, Calm and Soothing'],
  ['zA6D7RyKdc2EClouEMkP','AImee - Tranquil ASMR and Meditation'],
  ['1wGbFxmAM3Fgw63G1zZJ','Allison - Calm, Soothing and Meditative'],
  ['hqfrgApggtO1785R4Fsn','Theodore HQ - Serene and Grounded'],
  ['sH0WdfE5fsKuM2otdQZr','Koraly - Soft-spoken and Gentle'],
  ['MJ0RnG71ty4LH3dvNfSd','Leon - Soothing and Grounded']
];

function populateElevenVoiceSelect(id, selectedValue){
  const select = document.getElementById(id);
  if(!select) return;
  select.innerHTML = ELEVEN_VOICE_OPTIONS.map(([value, label]) =>
    `<option value="${value}"${value === selectedValue ? ' selected' : ''}>${label}</option>`
  ).join('');
}

function setElevenTab(name){
  document.querySelectorAll('#page-eleven .gs-tab, #page-eleven .sora-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('#page-eleven .gs-content').forEach(p=>p.classList.remove('active'));
  const tab = document.getElementById(`es-tab-${name}`);
  const panel = document.getElementById(`es-content-${name}`);
  const titles = {
    dialogue:'Eleven v3 Dialogue',
    tts:'Text to Speech',
    music:'Suno Music'
  };
  const subtitles = {
    dialogue:'Multi-speaker dialogue generation with ElevenLabs V3.',
    tts:'Single-speaker text to speech with Eleven Turbo 2.5.',
    music:'Generate full music tracks from text prompts.'
  };
  tab?.classList.add('active');
  panel?.classList.add('active');
  const titleEl = document.getElementById('eleven-current-title');
  const subEl = document.getElementById('eleven-current-sub');
  if(titleEl) titleEl.textContent = titles[name] || 'ElevenLabs Studio';
  if(subEl) subEl.textContent = subtitles[name] || '';
  saveUiState({ elevenTab: name });
}

function setElevenStatus(message, kind='info'){
  const el = document.getElementById('eleven-status');
  if(!el) return;
  el.textContent = message;
  el.style.color = kind === 'error' ? 'var(--red)' : kind === 'success' ? 'var(--green)' : 'var(--tx2)';
}

async function loadElevenCredits(){
  const valueEl = document.getElementById('eleven-credits-value');
  try{
    if(valueEl) valueEl.textContent = '...';
    const r = await fetch('/api/kie/credits', { headers: AUTH.headers() });
    const d = await r.json();
    if(!r.ok || d.error) throw new Error(extractApiErrorMessage(d, 'تعذر تحميل الرصيد.'));
    const value = d.credits ?? d.totalCredits;
    if(valueEl) valueEl.textContent = formatKieBalance(value);
    setElevenStatus('Credits synced.','success');
  } catch(e){
    if(valueEl) valueEl.textContent = '--';
    // Silently fail — credits balance is informational only
  }
}

async function pollElevenTask(taskId){
  for(let i=0; i<90; i++){
    await wait(4000);
    const r = await fetch(`/api/kie/elevenlabs/status?taskId=${encodeURIComponent(taskId)}`);
    const d = await r.json();
    if(!r.ok || d.error) throw new Error(extractApiErrorMessage(d, 'تعذر متابعة مهمة ElevenLabs.'));
    if(d.failed) throw new Error(`ElevenLabs task failed: ${d.status || 'failed'}`);
    if(d.done) return d;
    setElevenStatus(`ElevenLabs task running... (${d.status || 'processing'})`);
  }
  throw new Error('Timed out while waiting for ElevenLabs result');
}

async function runElevenDialogue(){
  const btn = document.getElementById('eleven-generate-btn');
  const original = btn ? btn.textContent : '';
  try{
    const model = document.getElementById('eleven-model')?.value || 'elevenlabs/text-to-dialogue-v3';
    const voice1 = (document.getElementById('eleven-voice-1')?.value || '').trim() || 'Bella';
    const text1 = (document.getElementById('eleven-text-1')?.value || '').trim();
    const voice2 = (document.getElementById('eleven-voice-2')?.value || '').trim();
    const text2 = (document.getElementById('eleven-text-2')?.value || '').trim();
    const stability = Number(document.getElementById('eleven-stability')?.value || 0.5);
    const languageCode = document.getElementById('eleven-language')?.value || 'auto';
    if(!text1) throw new Error('Write at least the first dialogue line');
    const _allText = [text1, text2].filter(Boolean).join(' ');
    const _dCost = Math.max(5, Math.ceil(_allText.length / 4));
    if(!AUTH.checkCredits(_dCost)) return;

    const dialogue = [{ voice: voice1, text: text1 }];
    if(text2) dialogue.push({ voice: voice2 || 'Adam', text: text2 });

    if(btn){ btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> جارٍ الإرسال إلى ElevenLabs...'; }
    const container = document.getElementById('eleven-results');
    if(container){
      container.innerHTML = '<div class="result-empty"><div class="result-empty-icon">11</div><div class="result-empty-text">جارٍ توليد الصوت...</div></div>';
    }

    syncElevenModelLabel(model);
    setElevenStatus('Creating ElevenLabs dialogue task...');

    const input = {
      dialogue,
      stability,
      language_code: languageCode
    };

    const startResp = await fetch('/api/kie/elevenlabs/create',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ model, input })
    });
    const startData = await startResp.json();
    if(!startResp.ok || startData.error) throw new Error(extractApiErrorMessage(startData, 'فشل إنشاء مهمة ElevenLabs.'));
    if(!startData.taskId) throw new Error('لم يتم استلام Task ID');

    setElevenStatus(`Task created: ${startData.taskId}`);
    const finalData = await pollElevenTask(startData.taskId);
    const urls = Array.isArray(finalData.audioUrls) ? finalData.audioUrls : [];
    if(urls.length === 0) throw new Error('ElevenLabs finished without audio URLs');

    if(container) container.innerHTML = '';
    urls.forEach((url, index) => addAudioResultItem('eleven-results', url, `Eleven v3 output ${index + 1}`));
    setElevenStatus('ElevenLabs audio ready.','success');
    loadElevenCredits();
    AUTH.consumeCredits(_dCost);
    toast('ElevenLabs generation completed','success');
  } catch(e){
    setElevenStatus(String(e.message || e).substring(0,160), 'error');
    toast('خطأ: '+String(e.message || e).substring(0,140),'error');
  } finally {
    if(btn){ btn.disabled = false; btn.textContent = original || 'Generate'; }
  }
}

async function runElevenTTS(){
  const btn = document.getElementById('eleven-tts-btn');
  const original = btn ? btn.textContent : '';
  try{
    const model = document.getElementById('eleven-tts-model')?.value || 'elevenlabs/text-to-speech-turbo-2-5';
    const text = (document.getElementById('eleven-tts-text')?.value || '').trim();
    const voice = document.getElementById('eleven-tts-voice')?.value || 'Rachel';
    const stability = Number(document.getElementById('eleven-tts-stability')?.value || 0.5);
    const similarityBoost = Number(document.getElementById('eleven-tts-similarity')?.value || 0.75);
    const style = Number(document.getElementById('eleven-tts-style')?.value || 0);
    const speed = Number(document.getElementById('eleven-tts-speed')?.value || 1);
    const timestamps = (document.getElementById('eleven-tts-timestamps')?.value || 'false') === 'true';
    const previousText = (document.getElementById('eleven-tts-prev')?.value || '').trim();
    const nextText = (document.getElementById('eleven-tts-next')?.value || '').trim();
    const languageCode = (document.getElementById('eleven-tts-lang')?.value || '').trim();
    if(!text) throw new Error('Write the TTS text first');
    const _estSec = Math.max(1, Math.ceil(text.length / 4));
    const _elCost = calcCreditCost(model, { duration: _estSec });
    if(!AUTH.checkCredits(_elCost)) return;

    if(btn){ btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> جارٍ إرسال TTS...'; }
    const container = document.getElementById('eleven-results');
    if(container){
      container.innerHTML = '<div class="result-empty"><div class="result-empty-icon">11</div><div class="result-empty-text">جارٍ توليد الصوت...</div></div>';
    }

    syncElevenModelLabel(model);
    setElevenStatus('Creating ElevenLabs TTS task...');

    const input = {
      text,
      voice,
      stability,
      similarity_boost: similarityBoost,
      style,
      speed,
      timestamps
    };
    if(previousText) input.previous_text = previousText;
    if(nextText) input.next_text = nextText;
    if(languageCode) input.language_code = languageCode;

    const startResp = await fetch('/api/kie/elevenlabs/create',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ model, input })
    });
    const startData = await startResp.json();
    if(!startResp.ok || startData.error) throw new Error(extractApiErrorMessage(startData, 'Failed to create ElevenLabs TTS task.'));
    if(!startData.taskId) throw new Error('لم يتم استلام Task ID');

    setElevenStatus(`Task created: ${startData.taskId}`);
    const finalData = await pollElevenTask(startData.taskId);
    const urls = Array.isArray(finalData.audioUrls) ? finalData.audioUrls : [];
    if(urls.length === 0) throw new Error('ElevenLabs finished without audio URLs');
    if(container) container.innerHTML = '';
    urls.forEach((url, index) => addAudioResultItem('eleven-results', url, `Turbo 2.5 TTS ${index + 1}`));
    setElevenStatus('ElevenLabs TTS ready.','success');
    loadElevenCredits();
    AUTH.consumeCredits(_elCost);
    toast('ElevenLabs TTS completed','success');
  } catch(e){
    setElevenStatus(String(e.message || e).substring(0,160), 'error');
    toast('خطأ: '+String(e.message || e).substring(0,140),'error');
  } finally {
    if(btn){ btn.disabled = false; btn.textContent = original || 'Generate'; }
  }
}

async function runGoogleTTS(){
  const btn = document.getElementById('g-tts-btn');
  const original = btn ? btn.textContent : '';
  try{
    const prompt = (document.getElementById('g-tts-prompt')?.value || '').trim();
    const model = document.getElementById('g-tts-model')?.value || 'gemini-2.5-flash-preview-tts';
    const voice = document.getElementById('g-tts-voice')?.value || 'Aoede';
    const style = (document.getElementById('g-tts-style')?.value || '').trim();
    if(!prompt) throw new Error('اكتب النص أولاً');
    const _ttsCost = Math.max(2, Math.ceil(prompt.length / 20));
    if(!AUTH.checkCredits(_ttsCost)) return;

    if(btn){ btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> جاري توليد الصوت...'; }
    clearResults('g-tts-results');

    const instruction = style
      ? `Read the following text in this style: ${style}.`
      : 'Read the following text naturally and clearly.';

    const r = await fetch('/api/generate',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        model,
        generationConfig:{
          responseModalities:['AUDIO'],
          speechConfig:{ voiceConfig:{ prebuiltVoiceConfig:{ voiceName: voice } } }
        },
        parts:[{ text:`${instruction}\n\n${prompt}` }]
      })
    });
    const d = await r.json();
    if(!r.ok || d.error) throw new Error(d.error || 'فشل توليد الصوت');
    if(!Array.isArray(d.audios) || d.audios.length === 0) throw new Error('لم يتم إرجاع ملف صوتي');
    d.audios.forEach(audio=>addAudioResultItem('g-tts-results', audio, prompt));
    AUTH.consumeCredits(_ttsCost);
    toast('تم توليد الصوت عبر Google TTS','success');
  } catch(e){
    toast('خطأ: '+String(e.message||e).substring(0,140),'error');
  } finally {
    if(btn){ btn.disabled = false; btn.textContent = original || '🗣️ توليد الصوت'; }
  }
}

async function runGoogleAudioTask(){
  const btn = document.getElementById('g-audio-btn');
  const original = btn ? btn.textContent : '';
  try{
    const task = document.getElementById('g-audio-task')?.value || 'transcribe';
    const extra = (document.getElementById('g-audio-prompt')?.value || '').trim();
    const file = S.files['dz-g-audio'] || null;
    const out = document.getElementById('g-audio-output');
    if(!file) throw new Error('ارفع ملف الصوت أولاً');
    const _audioCost = 2;
    if(!AUTH.checkCredits(_audioCost)) return;

    if(btn){ btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> جاري تحليل الصوت...'; }
    if(out) out.value = '';

    const dataUrl = await fileToDataUrl(file);
    const [meta, data] = String(dataUrl).split(',');
    const mime = (meta.match(/data:(.*);base64/)||[])[1] || file.type || 'audio/mpeg';
    const taskPrompts = {
      transcribe: 'Transcribe this audio accurately. Preserve speaker wording as much as possible.',
      summarize: 'Summarize this audio clearly in Arabic with key points and short sections.',
      translate_en: 'Transcribe and translate this audio into clean English.',
      extract_prompts: 'Listen to this audio and extract production ideas, prompt concepts, keywords, and content directions in Arabic.'
    };

    const r = await fetch('/api/generate',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'gemini-2.5-flash',
        parts:[
          { text:[taskPrompts[task] || taskPrompts.transcribe, extra].filter(Boolean).join('\n\n') },
          { inlineData:{ mimeType:mime, data } }
        ]
      })
    });
    const d = await r.json();
    if(!r.ok || d.error) throw new Error(d.error || 'فشل تحليل الصوت');
    if(out) out.value = d.text || '';
    AUTH.consumeCredits(_audioCost);
    toast('تم تحليل الصوت عبر Google','success');
  } catch(e){
    toast('خطأ: '+String(e.message||e).substring(0,140),'error');
  } finally {
    if(btn){ btn.disabled = false; btn.textContent = original || '🎧 تحليل الصوت'; }
  }
}

async function runGeminiPromptLab(){
  const btn = document.getElementById('g-prompt-btn');
  const original = btn ? btn.textContent : '';
  const out = document.getElementById('g-prompt-output');
  try{
    const kind = document.getElementById('g-prompt-kind')?.value || 'image';
    const idea = (document.getElementById('g-prompt-idea')?.value || '').trim();
    const notes = (document.getElementById('g-prompt-notes')?.value || '').trim();
    const lang = document.getElementById('g-prompt-lang')?.value || 'english';
    if(!idea) throw new Error('اكتب الفكرة أولاً');
    const _promptCost = 2;
    if(!AUTH.checkCredits(_promptCost)) return;

    if(btn){ btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> جاري كتابة البرومبت...'; }
    if(out) out.value = '';

    const targetMap = {
      image: 'Google Gemini image models such as Nano Banana 2 and Nano Banana Pro',
      video: 'Google Veo 3 video generation',
      audio: 'Google Gemini TTS and audio prompting',
      system: 'Google Gemini system prompt design'
    };
    const formatMap = {
      image: 'Return: TITLE, MASTER_PROMPT, NEGATIVE_PROMPT, QUICK_VARIANTS.',
      video: 'Return: TITLE, VIDEO_PROMPT, SHOT_NOTES, NEGATIVE_PROMPT.',
      audio: 'Return: TITLE, SPEECH_PROMPT, VOICE_STYLE, DELIVERY_NOTES.',
      system: 'Return: TITLE, SYSTEM_PROMPT, SAFETY_RULES, OUTPUT_RULES.'
    };
    const languageRule = {
      english: 'Write the final output in English only.',
      arabic: 'Write the final output in Arabic only.',
      bilingual: 'Write the final output in Arabic first, then English.'
    };

    const prompt = [
      `You are a specialist prompt writer for ${targetMap[kind]}.`,
      languageRule[lang] || languageRule.english,
      'Make the result production-ready, concise, strong, and easy to paste directly into Google tools.',
      'Preserve identity consistency when the task suggests editing an existing asset.',
      formatMap[kind] || formatMap.image,
      `Core idea: ${idea}`,
      notes ? `Additional notes: ${notes}` : ''
    ].filter(Boolean).join('\n\n');

    const text = await promptGenerate([{ text: prompt }]);
    if(out) out.value = text || '';
    AUTH.consumeCredits(_promptCost);
    toast('تم توليد برومبت Gemini','success');
  } catch(e){
    toast('خطأ: '+String(e.message||e).substring(0,140),'error');
  } finally {
    if(btn){ btn.disabled = false; btn.textContent = original || '✍️ توليد برومبت Gemini'; }
  }
}

async function buildFlorence(){
  const file = S.files['dz-flo'];
  if(!file){toast('ارفع الصورة أولاً','error');return null;}
  const task=document.getElementById('flo-task').value;
  const taskMap = {
    'more_detailed_caption': 'Describe this image in extensive detail. Include every visible element, colors, textures, lighting, composition, mood, and spatial relationships.',
    'detailed_caption': 'Describe this image in detail, including the main subject, background, colors, and composition.',
    'caption': 'Describe this image briefly in one or two sentences.'
  };
  const prompt = taskMap[task] || taskMap['more_detailed_caption'];
  const btn = document.getElementById('flo-btn');
  if(btn){ btn.disabled=true; btn.innerHTML='<div class="spinner"></div> جاري التحليل...'; }
  try {
    const base64 = await new Promise((resolve,reject)=>{
      const reader = new FileReader();
      reader.onload = ()=> resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const [meta, data] = base64.split(',');
    const mime = (meta.match(/data:(.*);base64/)||[])[1]||'image/png';
    const r = await fetch('/api/generate',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'gemini-2.5-flash',
        parts:[
          {text: prompt},
          {inlineData:{mimeType:mime, data:data}}
        ]
      })
    });
    const d = await r.json();
    if(!r.ok){ toast('خطأ: '+(d.error||'request failed').substring(0,120),'error'); return null; }
    const el = document.getElementById('flo-result');
    if(el) el.textContent = d.text || 'لم يتم استخراج نص';
    toast('✅ اكتمل!','success');
  } catch(e){
    toast('خطأ: '+e.message.substring(0,80),'error');
  } finally {
    if(btn){ btn.disabled=false; btn.innerHTML='Generate'; }
  }
  return null;
}


// ═══════════════════════════
// LIGHTBOX
// ═══════════════════════════



// ═══════════════════════════
// IMAGE RESOLUTION HELPERS
// ═══════════════════════════
const IMG_SIZES = {
  '9:16': { '1K':[576,1024],  '2K':[1152,2048], '4K':[2304,4096] },
  '1:1':  { '1K':[1024,1024], '2K':[2048,2048], '4K':[4096,4096] },
  '16:9': { '1K':[1024,576],  '2K':[2048,1152], '4K':[4096,2304] },
  '3:4':  { '1K':[768,1024],  '2K':[1536,2048], '4K':[3072,4096] },
  '4:3':  { '1K':[1024,768],  '2K':[2048,1536], '4K':[4096,3072] },
  '2:3':  { '1K':[682,1024],  '2K':[1365,2048], '4K':[2730,4096] },
};

function updateImgDims(prefix){
  const ratio = document.getElementById(prefix+'-ratio-val').value;
  const qual  = document.getElementById(prefix+'-qual-val').value;
  const dims  = (IMG_SIZES[ratio]||IMG_SIZES['9:16'])[qual]||[576,1024];
  document.getElementById(prefix+'-w').value = dims[0];
  document.getElementById(prefix+'-h').value = dims[1];
}

function setImgRatio(prefix, ratio, btn){
  document.getElementById(prefix+'-ratio-val').value = ratio;
  document.querySelectorAll('.'+prefix+'-ratio-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  updateImgDims(prefix);
}

function setImgQual(prefix, qual, btn){
  document.getElementById(prefix+'-qual-val').value = qual;
  document.querySelectorAll('.'+prefix+'-qual-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  updateImgDims(prefix);
}
function setVidDur(secs, btn){
  const fps = 18;
  const frames = secs * fps;
  document.getElementById('vid-frames').value = frames;
  document.querySelectorAll('.vid-dur-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}
function setVidQual(w, h, btn){
  document.getElementById('vid-w').value = w;
  document.getElementById('vid-h').value = h;
  document.querySelectorAll('.vid-qual-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}
let currentTransition = TRANSITIONS[0];

function initTransitionLibrary(){
  setTransition(currentTransition);
  renderTransitionList('');
}

function openTransitionModal(){
  const modal = document.getElementById('transition-modal');
  if(!modal) return;
  modal.classList.add('open');
  const input = document.getElementById('tr-search');
  if(input){ input.value=''; input.focus(); }
  renderTransitionList('');
}

function closeTransitionModal(){
  const modal = document.getElementById('transition-modal');
  if(modal) modal.classList.remove('open');
}

function setTransition(name){
  currentTransition = name;
  const label = document.getElementById('tr-selected');
  const hidden = document.getElementById('tr-transition');
  if(label) label.textContent = name;
  if(hidden) hidden.value = name;
}

// Gradient themes for each transition card preview
const TRANSITION_THEMES = {
  'Raven Transition':     { grad: ['#0a0a0f','#1a0a2e','#2d0a4e'], icon: '🦅', color: '#8b5cf6', vid: '/assets/transitions/raven.mp4' },
  'Morph':                { grad: ['#0a1628','#0d3b6e','#1565c0'], icon: '🌀', color: '#60a5fa', vid: '/assets/transitions/morph.mp4' },
  'Air Bending':          { grad: ['#0a1f2e','#0a3d4f','#0e6670'], icon: '💨', color: '#67e8f9', vid: '/assets/transitions/air-bending.mp4' },
  'Shadow Smoke':         { grad: ['#0a0a0a','#1a1a1a','#2a2a2a'], icon: '🌫️', color: '#9ca3af', vid: '/assets/transitions/shadow-smoke.mp4' },
  'Water Bending':        { grad: ['#061628','#0a2744','#0c4a8a'], icon: '🌊', color: '#38bdf8', vid: '/assets/transitions/water-bending.mp4' },
  'Firelava':             { grad: ['#1a0500','#3d0c00','#7c1a00'], icon: '🌋', color: '#f97316', vid: '/assets/transitions/firelava.mp4' },
  'Flying Cam Transition':{ grad: ['#050a14','#0a1428','#101e3c'], icon: '📷', color: '#818cf8', vid: '/assets/transitions/flying-cam.mp4' },
  'Melt Transition':      { grad: ['#0f0a00','#2a1800','#4d2e00'], icon: '🫠', color: '#fbbf24', vid: '/assets/transitions/melt.mp4' },
  'Splash Transition':    { grad: ['#020d1a','#041e3d','#063061'], icon: '💦', color: '#7dd3fc', vid: '/assets/transitions/splash.mp4' },
  'Flame Transition':     { grad: ['#1a0400','#3a0800','#6b1200'], icon: '🔥', color: '#fb923c', vid: '/assets/transitions/flame.mp4' },
  'Smoke Transition':     { grad: ['#0a0f14','#141e28','#1e2d3c'], icon: '💨', color: '#94a3b8', vid: '/assets/transitions/smoke.mp4' },
  'Logo Transform':       { grad: ['#050514','#0a0a2a','#101040'], icon: '⚡', color: '#facc15', vid: '/assets/transitions/logo-transform.mp4' },
  'Hand Transition':      { grad: ['#0a0a14','#1a1428','#241e3c'], icon: '✋', color: '#c084fc', vid: '/assets/transitions/hand.mp4' },
  'Column Wipe':          { grad: ['#050a14','#0a1428','#0f1e3c'], icon: '▦', color: '#5fe2ff', vid: '/assets/transitions/column-wipe.mp4' },
  'Hole Transition':      { grad: ['#050505','#0f0f0f','#1a1a1a'], icon: '⭕', color: '#a78bfa', vid: '/assets/transitions/hole.mp4' },
  'Display Transition':   { grad: ['#030d1a','#061a33','#0a2a4d'], icon: '📺', color: '#22d3ee', vid: '/assets/transitions/display.mp4' },
  'Jump Transition':      { grad: ['#0a0505','#281010','#3d1a1a'], icon: '⚡', color: '#f87171', vid: '/assets/transitions/jump.mp4' },
  'Seamless Transition':  { grad: ['#060e14','#0d1c28','#142a3c'], icon: '∞', color: '#34d399', vid: '/assets/transitions/seamless.mp4' },
  'Trucksition':          { grad: ['#050a0a','#0a1414','#0f1e1e'], icon: '🎬', color: '#5eead4', vid: '/assets/transitions/trucksition.mp4' },
  'Gorilla Transfer':     { grad: ['#0a0505','#1a0a0a','#2a1010'], icon: '🦍', color: '#f59e0b', vid: '/assets/transitions/gorilla.mp4' },
  'Intermission':         { grad: ['#0a0800','#1e1900','#332a00'], icon: '🎞️', color: '#d97706', vid: '/assets/transitions/intermission.mp4' },
  'Stranger Transition':  { grad: ['#050a05','#0a1a0a','#0f2a0f'], icon: '⚡', color: '#4ade80', vid: '/assets/transitions/stranger.mp4' },
};

function renderTransitionList(filter){
  const grid = document.getElementById('tr-modal-grid');
  if(!grid) return;
  const q = String(filter || '').trim().toLowerCase();
  const items = TRANSITIONS.filter(t => !q || t.toLowerCase().includes(q));
  if(items.length === 0){
    grid.innerHTML = '<div style="color:rgba(255,255,255,0.3);font-size:11px;text-align:center;padding:60px;font-family:var(--fm);">No transitions found</div>';
    return;
  }
  grid.innerHTML = '';
  items.forEach(name => {
    const card = document.createElement('div');
    const isSelected = name === currentTransition;
    card.className = 'tr-item' + (isSelected ? ' selected' : '');
    const theme = TRANSITION_THEMES[name] || { grad: ['#0a1628','#0d2040','#0f2850'], icon: '🎬', color: '#5fe2ff', vid: '' };
    const g = theme.grad;
    // Inner content: video if exists (loaded lazily on hover), else gradient+icon
    card.innerHTML = `
      <div class="tr-preview-bg" style="position:absolute;inset:0;border-radius:15px;background:linear-gradient(135deg,${g[0]},${g[1]},${g[2]});overflow:hidden;">
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
          <span style="font-size:36px;filter:drop-shadow(0 0 16px ${theme.color});">${theme.icon}</span>
        </div>
        <div style="position:absolute;bottom:0;left:0;right:0;height:3px;overflow:hidden;"><div style="height:100%;width:40%;background:linear-gradient(90deg,transparent,${theme.color},transparent);animation:tr-shimmer 1.8s ease-in-out infinite;"></div></div>
      </div>
      ${theme.vid ? `<video class="tr-preview-vid" src="${theme.vid}" muted loop playsinline preload="none" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:15px;opacity:0;transition:opacity 0.3s;"></video>` : ''}
      <div class="tr-item-overlay"></div>
      <div class="tr-check">✓</div>
      <div class="tr-item-badge">AI</div>
      <div class="tr-item-label">
        <div class="tr-item-title">${name}</div>
        <div class="tr-item-sub" style="color:${theme.color};">Kling AI</div>
      </div>`;
    // Hover: play video preview
    if(theme.vid){
      card.addEventListener('mouseenter', () => {
        const vid = card.querySelector('.tr-preview-vid');
        if(vid){ vid.play().catch(()=>{}); vid.style.opacity='1'; }
      });
      card.addEventListener('mouseleave', () => {
        const vid = card.querySelector('.tr-preview-vid');
        if(vid){ vid.pause(); vid.style.opacity='0'; }
      });
    }
    card.onclick = () => { setTransition(name); closeTransitionModal(); };
    grid.appendChild(card);
  });
}

  async function loadImageFromFile(file){
    const dataUrl = await fileToDataUrl(file);
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('فشل تحميل الصورة'));
      img.src = dataUrl;
    });
  }

  async function loadVisualSource(file) {
    if (!file) throw new Error('ملف مفقود');
    const name = String(file.name || '').toLowerCase();
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(name);
    const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|mkv|webm)$/i.test(name);
    const url = URL.createObjectURL(file);
    if (isImage) {
      const img = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('فشل تحميل الصورة'));
        el.src = url;
      });
      return { type: 'image', element: img, duration: 0, url };
    }
    if (isVideo) {
      const video = document.createElement('video');
      video.src = url;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('فشل تحميل الفيديو'));
      });
      return { type: 'video', element: video, duration: video.duration, url };
    }
    throw new Error('نوع الملف غير مدعوم');
  }

  function drawCover(ctx, el, w, h) {
    const srcW = el.videoWidth || el.naturalWidth || el.width || w;
    const srcH = el.videoHeight || el.naturalHeight || el.height || h;
    const scale = Math.max(w / srcW, h / srcH);
    const sw = srcW * scale, sh = srcH * scale;
    const dx = (w - sw) / 2, dy = (h - sh) / 2;
    ctx.drawImage(el, dx, dy, sw, sh);
  }

  function pickRecorderMime() {
    const types = ['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'];
    for (const t of types) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) return t;
    }
    return '';
  }

  // Apply selected transition effect between two elements (img or video) at progress t (0→1)
  function applyTransitionEffect(ctx, elA, elB, t, w, h, transitionName) {
    if (t <= 0) { drawCover(ctx, elA, w, h); return; }
    if (t >= 1) { drawCover(ctx, elB, w, h); return; }
    const name = String(transitionName || '').toLowerCase();

    if (name.includes('wipe') || name.includes('column')) {
      drawCover(ctx, elA, w, h);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w * t, h); ctx.clip();
      drawCover(ctx, elB, w, h); ctx.restore();
    } else if (name.includes('truck') || name.includes('slide')) {
      const offset = w * t;
      ctx.save(); ctx.translate(-offset, 0); drawCover(ctx, elA, w, h); ctx.restore();
      ctx.save(); ctx.translate(w - offset, 0); drawCover(ctx, elB, w, h); ctx.restore();
    } else if (name.includes('hole') || name.includes('iris')) {
      drawCover(ctx, elA, w, h);
      ctx.save(); ctx.beginPath(); ctx.arc(w/2, h/2, Math.max(w, h) * t, 0, Math.PI*2); ctx.clip();
      drawCover(ctx, elB, w, h); ctx.restore();
    } else if (name.includes('zoom') || name.includes('push') || name.includes('flying')) {
      drawCover(ctx, elA, w, h);
      ctx.globalAlpha = t;
      ctx.save(); ctx.translate(w/2, h/2); ctx.scale(0.3 + t*0.7, 0.3 + t*0.7); ctx.translate(-w/2, -h/2);
      drawCover(ctx, elB, w, h); ctx.restore(); ctx.globalAlpha = 1;
    } else if (name.includes('fire') || name.includes('flame') || name.includes('lava')) {
      if (t < 0.5) {
        drawCover(ctx, elA, w, h);
        ctx.fillStyle = `rgba(255,120,0,${t * 2 * 0.8})`; ctx.fillRect(0, 0, w, h);
      } else {
        ctx.fillStyle = '#ff7800'; ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = (t - 0.5) * 2; drawCover(ctx, elB, w, h); ctx.globalAlpha = 1;
      }
    } else if (name.includes('smoke') || name.includes('shadow') || name.includes('melt')) {
      if (t < 0.5) {
        drawCover(ctx, elA, w, h);
        ctx.fillStyle = `rgba(0,0,0,${t * 2})`; ctx.fillRect(0, 0, w, h);
      } else {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = (t - 0.5) * 2; drawCover(ctx, elB, w, h); ctx.globalAlpha = 1;
      }
    } else if (name.includes('water') || name.includes('splash') || name.includes('air') || name.includes('bending')) {
      drawCover(ctx, elA, w, h);
      ctx.globalAlpha = t; drawCover(ctx, elB, w, h); ctx.globalAlpha = 1;
      if (t > 0.1 && t < 0.9) {
        ctx.fillStyle = `rgba(100,190,255,${Math.sin(t * Math.PI) * 0.22})`; ctx.fillRect(0, 0, w, h);
      }
    } else if (name.includes('raven') || name.includes('display') || name.includes('stranger') || name.includes('glitch')) {
      if (t < 0.45) {
        drawCover(ctx, elA, w, h);
      } else if (t < 0.55) {
        const ft = (t - 0.45) / 0.1;
        if (ft < 0.5) { drawCover(ctx, elA, w, h); ctx.fillStyle = `rgba(255,255,255,${ft*2})`; ctx.fillRect(0,0,w,h); }
        else { drawCover(ctx, elB, w, h); ctx.fillStyle = `rgba(255,255,255,${(1-ft)*2})`; ctx.fillRect(0,0,w,h); }
      } else { drawCover(ctx, elB, w, h); }
    } else if (name.includes('jump') || name.includes('gorilla') || name.includes('hand') || name.includes('logo') || name.includes('stranger')) {
      drawCover(ctx, elA, w, h);
      ctx.globalAlpha = t;
      ctx.save(); ctx.translate(w/2, h/2); ctx.scale(1 + t*0.5, 1 + t*0.5); ctx.rotate(t * 0.15); ctx.translate(-w/2, -h/2);
      drawCover(ctx, elB, w, h); ctx.restore(); ctx.globalAlpha = 1;
    } else {
      // Default cross-fade (morph, seamless, intermission, etc.)
      drawCover(ctx, elA, w, h);
      ctx.globalAlpha = t; drawCover(ctx, elB, w, h); ctx.globalAlpha = 1;
    }
  }

  async function createTransitionVideo(startFile, endFile, seconds) {
    const srcA = await loadVisualSource(startFile);
    const srcB = await loadVisualSource(endFile);

    const width = 1280, height = 720;
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    const stream = canvas.captureStream(30);
    const mimeType = pickRecorderMime();
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };

    const totalMs = Math.max(3000, Number(seconds) * 1000);
    // Structure: 40% play A → 20% transition → 40% play B
    const trStart = totalMs * 0.40;
    const trEnd   = totalMs * 0.60;
    const trDur   = trEnd - trStart;
    const transition = document.getElementById('tr-transition')?.value || 'Smoke Transition';

    // Start video A playing immediately
    if (srcA.type === 'video') { srcA.element.currentTime = 0; srcA.element.play().catch(()=>{}); }

    let startAt = null, videoBStarted = false;

    const renderFrame = (ts) => {
      if (startAt === null) startAt = ts;
      const elapsed = ts - startAt;

      // Start video B at transition start
      if (!videoBStarted && elapsed >= trStart && srcB.type === 'video') {
        srcB.element.currentTime = 0;
        srcB.element.play().catch(()=>{});
        videoBStarted = true;
      }

      const t = elapsed < trStart ? 0 : elapsed > trEnd ? 1 : (elapsed - trStart) / trDur;
      ctx.clearRect(0, 0, width, height);
      applyTransitionEffect(ctx, srcA.element, srcB.element, t, width, height, transition);

      if (elapsed < totalMs) {
        requestAnimationFrame(renderFrame);
      } else {
        if (srcA.type === 'video') srcA.element.pause();
        if (srcB.type === 'video') srcB.element.pause();
        setTimeout(() => recorder.stop(), 100);
      }
    };

    return await new Promise((resolve, reject) => {
      recorder.onstop = () => {
        if (srcA.url) URL.revokeObjectURL(srcA.url);
        if (srcB.url) URL.revokeObjectURL(srcB.url);
        resolve(new Blob(chunks, { type: recorder.mimeType || 'video/webm' }));
      };
      recorder.onerror = () => reject(new Error('فشل تسجيل الفيديو'));
      recorder.start();
      requestAnimationFrame(renderFrame);
    });
  }

  // Extract a single frame from a video file as a PNG File object
  // seekToEnd=true → last frame, seekToEnd=false → first frame
  async function extractVideoFrameAsFile(videoFile, seekToEnd = false) {
    const url = URL.createObjectURL(videoFile);
    const video = document.createElement('video');
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    await new Promise((res, rej) => {
      video.onloadedmetadata = () => res();
      video.onerror = () => rej(new Error('فشل تحميل الفيديو'));
    });
    const seekTime = seekToEnd
      ? Math.max(0, (video.duration || 1) - 0.1)
      : 0.05;
    await new Promise((res, rej) => {
      video.onseeked = () => res();
      video.onerror = () => rej(new Error('فشل الـ seek'));
      video.currentTime = seekTime;
    });
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    return await new Promise((res, rej) => {
      canvas.toBlob(blob => {
        if (!blob) { rej(new Error('فشل إنشاء الإطار')); return; }
        res(new File([blob], 'frame.png', { type: 'image/png' }));
      }, 'image/png');
    });
  }

  // Map transition name to a cinematic AI prompt for Kling
  function getTransitionPrompt(name) {
    const n = String(name || '').toLowerCase();
    if (n.includes('raven'))     return 'A dramatic cinematic raven morphing transition, dark feathers swirling to reveal the next scene, smooth and powerful.';
    if (n.includes('morph'))     return 'A seamless AI morphing transition where the scene fluidly transforms into the next, organic and smooth.';
    if (n.includes('air') || n.includes('bending')) return 'An air bending elemental transition, swirling wind currents sweep across the frame revealing the next scene cinematically.';
    if (n.includes('shadow'))    return 'A shadow smoke transition, dark moody shadows sweep across the frame dissolving into the next scene.';
    if (n.includes('water'))     return 'A water bending fluid transition, rippling water waves flow across the screen revealing the next scene.';
    if (n.includes('firelava') || n.includes('lava')) return 'A dramatic fire and lava transition, intense flames and glowing lava flow to reveal the next scene.';
    if (n.includes('flying') || n.includes('cam'))   return 'A flying camera cinematic transition, the camera rapidly moves forward through the scene to reveal the next one.';
    if (n.includes('melt'))      return 'A melt transition where the current scene slowly melts downward, revealing the next scene beneath.';
    if (n.includes('splash'))    return 'A water splash transition, a burst of water explodes across the screen and the next scene emerges from within.';
    if (n.includes('flame') || n.includes('fire'))   return 'A flame transition, fire blazes across the screen revealing the next scene with a cinematic burn effect.';
    if (n.includes('smoke'))     return 'A smooth smoke transition, thick cinematic smoke billows across the frame to reveal the next scene.';
    if (n.includes('logo'))      return 'A logo transform transition, a bright flash of light pulses across the center revealing the next scene.';
    if (n.includes('hand'))      return 'A hand transition where a hand sweeps across the frame wiping to reveal the next scene.';
    if (n.includes('column') || n.includes('wipe')) return 'A column wipe transition, elegant vertical columns slide to reveal the next scene.';
    if (n.includes('hole') || n.includes('iris'))   return 'An iris hole transition, a circular aperture opens from the center revealing the next scene.';
    if (n.includes('display'))   return 'A display transition, a clean luminous flash reveals the next scene like a screen switching.';
    if (n.includes('jump'))      return 'A dynamic jump cut transition with kinetic energy pushing to the next scene.';
    if (n.includes('seamless'))  return 'A seamless blend transition, the two scenes merge imperceptibly with a perfect invisible cut.';
    if (n.includes('truck') || n.includes('trucksition')) return 'A truck shot transition, the camera trucks sideways rapidly to reveal the next scene.';
    if (n.includes('gorilla'))   return 'A gorilla energy transition, a powerful burst of kinetic energy slams the viewer into the next scene.';
    if (n.includes('intermission')) return 'A classic film intermission transition with a cinematic title card fade and elegant reveal.';
    if (n.includes('stranger'))  return 'A stranger things style glitch transition, digital distortion and static flashes reveal the next scene.';
    return 'A smooth cinematic transition blending seamlessly from the first scene to the second, professional film quality.';
  }

  async function runTransition(){
    const a = S.files['dz-tr-start'];
    const b = S.files['dz-tr-end'];
    const btn = document.getElementById('tr-generate-btn');
    const original = btn ? btn.textContent : '';
    if(!a || !b){
      toast('ارفع البداية والنهاية أولاً','error');
      return;
    }
    const transition = document.getElementById('tr-transition')?.value || 'Smoke Transition';
    const duration = document.getElementById('tr-duration')?.value || '5';
    const _trCost = calcCreditCost('kling/v2-5-turbo-image-to-video-pro', { duration: Number(duration), mode: 'pro', audio: false });
    if(!AUTH.checkCredits(_trCost)){ return; }
    if(btn){ btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> جارٍ توليد الانتقال...'; }
    try{
      // Step 1: Extract key frames
      const isVideoA = a.type.startsWith('video/') || /\.(mp4|mov|mkv|webm)$/i.test(a.name);
      const isVideoB = b.type.startsWith('video/') || /\.(mp4|mov|mkv|webm)$/i.test(b.name);
      const statusEl = document.getElementById('tr-status');
      const setStatus = (msg) => { if(statusEl) statusEl.textContent = msg; };

      setStatus('Extracting frames...');
      const startFrameFile = isVideoA ? await extractVideoFrameAsFile(a, true) : a;
      const endFrameFile   = isVideoB ? await extractVideoFrameAsFile(b, false) : b;

      // Step 2: Upload both frames to KIE CDN
      setStatus('Uploading frames to AI...');
      const startFrameUrl = await uploadKieBinaryFile(startFrameFile);
      const endFrameUrl   = await uploadKieBinaryFile(endFrameFile);

      // Step 3: Build transition prompt
      const prompt = getTransitionPrompt(transition);

      // Step 4: Create Kling AI task
      setStatus('Creating AI transition task...');
      const resp = await fetch('/api/kie/kling/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'image2video',
          modelName: 'kling/v2-5-turbo-image-to-video-pro',
          prompt,
          negativePrompt: '',
          duration: String(duration),
          imageUrls: [startFrameUrl],
          tailImageUrl: endFrameUrl,
          generationMode: 'pro',
          aspectRatio: '16:9'
        })
      });
      const startData = await resp.json();
      if(!resp.ok || startData.error) throw new Error(extractApiErrorMessage(startData, 'فشل إنشاء مهمة الانتقال.'));
      if(!startData.taskId) throw new Error('لم يتم استلام Task ID');

      // Step 5: Poll for result
      setStatus(`AI generating... task: ${startData.taskId}`);
      const finalData = await pollKlingTask(startData.taskId);
      const urls = Array.isArray(finalData.videoUrls) ? finalData.videoUrls : [];
      if(urls.length === 0) throw new Error('لم يتم استلام رابط الفيديو');

      // Step 6: Show result
      urls.forEach(url => addResultItem('transition-results', url, true, `${transition} | ${duration}s`));
      setStatus('تم توليد الانتقال بنجاح ✓');
      toast('AI Transition generated!','success');
      AUTH.consumeCredits(_trCost);
    } catch(e){
      toast('خطأ: '+String(e.message||e).substring(0,140),'error');
    } finally {
      if(btn){ btn.disabled=false; btn.textContent=original || 'Generate'; }
    }
  }

function getPromptForType(type){
  const map={
    clothes: ()=>document.getElementById('clothes-prompt')?.value||'',
    edit:    ()=>document.getElementById('edit-prompt')?.value||'',
    scene:   ()=>document.getElementById('scene-prompt')?.value||'',
    story:   ()=>Array.from(document.querySelectorAll('.story-scene')).map(i=>i.value).filter(Boolean).join(' | '),
    video:   ()=>document.getElementById('vid-pos')?.value||'',
    florence:()=>document.getElementById('flo-result')?.textContent||''
  };
  return (map[type]||(() =>''))();
}
function openLightbox(mediaUrl, prompt, isVideo=false){
  const img = document.getElementById('lb-img');
  const vid = document.getElementById('lb-video');
  if(isVideo){
    img.style.display = 'none';
    vid.style.display = 'block';
    vid.src = mediaUrl;
  } else {
    vid.pause();
    vid.src = '';
    vid.style.display = 'none';
    img.style.display = 'block';
    img.src = mediaUrl;
  }
  document.getElementById('lb-dl').href = mediaUrl;
  document.getElementById('lb-prompt').textContent = prompt || '(لا يوجد برومبت)';
  const note = document.getElementById('lb-note');
  if(note){
    note.textContent = isVideo
      ? 'This AI generated video may be used for personal and commercial use.'
      : 'This AI generated image may be used for personal and commercial use.';
  }
  const extendBtn = document.getElementById('lb-extend');
  const modifyBtn = document.getElementById('lb-modify');
  const changeBtn = document.getElementById('lb-change');
  const reframeBtn = document.getElementById('lb-reframe');
  const promptBtn = document.getElementById('lb-prompt-btn');
  const historyBtn = document.getElementById('lb-history');
  const deleteBtn = document.getElementById('lb-delete');

  // helper: fetch image URL → File → persist to localStorage → navigate
  async function sendToTool(pageId, dzId, promptId, promptText) {
    closeLightbox();
    toast('جاري تحميل الصورة...', 'info');
    try {
      const blob = await fetch(mediaUrl).then(r => r.blob());
      const ext = (blob.type || 'image/png').split('/')[1] || 'png';
      const file = new File([blob], `lb-image.${ext}`, { type: blob.type || 'image/png' });
      const objUrl = URL.createObjectURL(file);
      S.files[dzId] = file;
      renderDropzonePreview(dzId, file, objUrl);
      await persistImageDropzone(dzId, file);
      if (promptId && promptText) {
        const el = document.getElementById(promptId);
        if (el && !el.value) el.value = promptText;
        // Persist prompt to localStorage so it survives cross-page navigation
        const formState = getFormState();
        if (!formState[promptId] || !formState[promptId].v) {
          formState[promptId] = { t: 'v', v: promptText };
          saveFormState(formState);
        }
      }
      showPage(pageId);
    } catch(e) {
      toast('تعذر تحميل الصورة: ' + String(e.message || e).substring(0, 80), 'error');
    }
  }

  if(modifyBtn){
    modifyBtn.onclick = async () => {
      if (isVideo) { toast('التعديل متاح للصور فقط', 'error'); return; }
      await sendToTool('nano', 'dz-g-nano', 'g-nano-prompt', prompt || '');
    };
  }
  if(extendBtn){
    extendBtn.onclick = async () => {
      if (!isVideo) {
        // For images: send to Nano for editing
        await sendToTool('nano', 'dz-g-nanopro', 'g-nanopro-prompt', prompt || '');
        return;
      }
      closeLightbox();
      toast('جاري استخراج آخر فريم...', 'info');
      const tempVid = document.createElement('video');
      tempVid.crossOrigin = 'anonymous';
      tempVid.src = mediaUrl;
      tempVid.preload = 'metadata';
      tempVid.onloadedmetadata = () => {
        tempVid.currentTime = Math.max(0, tempVid.duration - 0.1);
      };
      tempVid.onseeked = async () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = tempVid.videoWidth || 1280;
          canvas.height = tempVid.videoHeight || 720;
          canvas.getContext('2d').drawImage(tempVid, 0, 0);
          const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
          if (!blob) { toast('تعذّر استخراج الفريم', 'error'); return; }
          const file = new File([blob], 'last-frame.png', { type: 'image/png' });
          const objUrl = URL.createObjectURL(file);
          S.files['dz-kling-image-start'] = file;
          renderDropzonePreview('dz-kling-image-start', file, objUrl);
          await persistImageDropzone('dz-kling-image-start', file);
          toast('تم تحميل آخر فريم ✓', 'success');
          showPage('kling');
        } catch(e) {
          toast('تعذّر استخراج الفريم: ' + String(e.message || e).substring(0,60), 'error');
        }
      };
      tempVid.onerror = () => toast('تعذّر تحميل الفيديو', 'error');
    };
  }
  if(changeBtn){
    changeBtn.onclick = async () => {
      if (isVideo) { toast('تغيير الموضوع متاح للصور فقط', 'error'); return; }
      await sendToTool('qwen2', 'dz-qwen2-image', 'qwen2-prompt', prompt || '');
    };
  }
  if(reframeBtn){
    reframeBtn.onclick = async () => {
      if (isVideo) { toast('إعادة الكادر متاحة للصور فقط', 'error'); return; }
      await sendToTool('ideogram-reframe', 'dz-ideogram-reframe-image', 'ideogram-reframe-prompt', '');
    };
  }
  if(promptBtn){ promptBtn.onclick = () => copyLbPrompt(); }
  if(historyBtn){ historyBtn.onclick = () => toast('قريباً: السجل','info'); }
  if(deleteBtn){ deleteBtn.onclick = () => toast('قريباً: حذف العنصر','info'); }
  const lb = document.getElementById('lightbox');
  lb.style.display = 'flex';
  lb.style.opacity = '0';
  requestAnimationFrame(()=>{ requestAnimationFrame(()=>{ lb.classList.add('open'); lb.style.opacity=''; }); });
  document.body.style.overflow = 'hidden';
}
function closeLightbox(){
  const vid = document.getElementById('lb-video');
  if(vid){ vid.pause(); vid.src = ''; }
  const lb = document.getElementById('lightbox');
  lb.style.opacity = '0';
  setTimeout(() => { lb.classList.remove('open'); lb.style.opacity = ''; lb.style.display = 'none'; }, 280);
  document.body.style.overflow = '';
}
function copyLbPrompt(){
  const t = document.getElementById('lb-prompt').textContent;
  navigator.clipboard.writeText(t);
  toast(currentLang === 'ar' ? 'تم نسخ البرومبت' : 'Prompt copied','success');
}
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeLightbox(); });
applyBrandLabels();
applyLanguage(currentLang);

function forceEnglishUI(){
  const arabic=/[\u0600-\u06FF]/;
  const mojibake=/[ØÙâ]/;
  const needsFix = (t='') => arabic.test(t) || mojibake.test(t);
  const map=new Map([
    ['اكتشف مالجديد','Discover'],
    ['الصفحة الرئيسية','Home'],
    ['أدوات الصور','Image Tools'],
    ['الانتقالات','Transitions'],
    ['توليد البرومبت','Prompt Studio'],
    ['المعرض','Gallery'],
    ['مكتبة الأعمال','Work Library'],
    ['المكتبة','Library'],
    ['لوحة التحكم','Control Panel'],
    ['تحديث الرصيد','Refresh Credits'],
    ['جاهز للتوليد.','Ready to generate.'],
    ['ستظهر النتائج هنا','Results will appear here'],
    ['رفع صورة','Upload image'],
    ['رفع فيديو','Upload video'],
    ['رفع ملف الصوت','Upload audio'],
    ['صورة البداية','Start image'],
    ['صورة مرجعية','Reference image'],
    ['الإعدادات الأساسية','Basic Settings'],
    ['التحكم','Controls'],
    ['الإعدادات الثابتة','Global Settings'],
    ['النتائج','Results'],
    ['تسجيل الدخول','Sign In'],
    ['البريد الإلكتروني','Email'],
    ['كلمة المرور','Password'],
    ['تسجيل عبر Google','Sign in with Google'],
    ['المدة','Duration'],
    ['الدقة','Resolution'],
    ['نسبة الأبعاد','Aspect Ratio'],
    ['تم نسخ البرومبت','Prompt copied'],
    ['لا توجد أعمال','No items yet'],
    ['تم الحذف','Deleted'],
    ['تم المسح','Cleared'],
    ['كل الأعمال المنتجة','All generated works'],
    ['صورك مع البرومبت الخاص بها','Your images with their prompts'],
    ['إدارة محلية لإعدادات الموقع — تسجيل دخول محلي فقط','Local management for site settings — local sign-in only'],
    ['إدارة صفحة إعدادات الموقع — تسجيل دخول محلي فقط','Admin page for site settings — local sign-in only'],
    ['إدارة الصفحات','Manage pages'],
    ['إعدادات الشكل','Appearance settings'],
    ['تسجيل الخروج','Sign out'],
    ['الكل','All'],
    ['صور','Images'],
    ['فيديو','Videos'],
    ['منصة حالة وربط الموديل','Model status and linkage page.'],
    ['وصف','Description'],
    ['عنوان العمل','Work title'],
    ['البرومبت','Prompt'],
    ['التصنيف','Category'],
    ['أخرى','Other'],
    ['تعديل','Edit'],
    ['نص → صورة','Text → Image']
  ]);
  // Arabic source strings
  map.set('اكتشف مالجديد','Discover');
  map.set('متصل','Connected');
  map.set('التسعير','Pricing');
  map.set('تسجيل الدخول','Login');
  map.set('إنشاء حساب','Sign up');
  map.set('التسعير','Pricing');
  map.set('خطط الاشتراك وباقات شراء الكريدت الإضافية','Subscription plans and extra credit packs.');
  map.set('عروض حصرية لنانو بنانا برو ونانو بنانا 2','Exclusive Nano Banana Pro & Nano Banana 2 offers');
  map.set('مجانا لمشتركي $25 و $50 فقط','Free for $25 and $50 subscribers only');
  map.set('ارتقِ بإنتاجك مع مزايا متقدمة وخيارات مرنة تناسب مشاريعك','Upgrade your production with advanced perks and flexible options for your projects.');
  map.set('ابدأ الآن','Start now');
  map.set('الشراء قريباً','Purchase coming soon');
  map.set('اختر الخطة','Choose Plan');
  map.set('الأكثر طلباً','Most Popular');
  map.set('شراء كريدت إضافي','Buy extra credits');
  map.set('مقارنة الخطط','Compare Plans');
  map.set('/ شهر','/ month');
  map.set('credits لكل شهر','credits per month');
  map.set('مناسب للبداية','Great for getting started');
  map.set('واجهة كاملة للموديلات','Full access to models');
  map.set('معرض الأعمال وحفظ النتائج','Gallery and saved results');
  map.set('توليد أكثر سرعة','Faster generations');
  map.set('مناسب للمشاريع الكبيرة','Built for larger projects');
  map.set('نانو بنانا مجاني للمشتركين','Nano Banana free for subscribers');
  map.set('دعم مدة الفيديوات','Video duration controls');
  map.set('أعلى مستوى استخدام','Highest usage tier');
  map.set('مناسب للاستوديوهات','Best for studios');
  map.set('مزايا موسعة للفيديو والصور','Expanded video and image features');
  map.set('موسيقى مولدة من النص','Text-to-music generation');
  map.set('جودة عالية للصور','High-quality images');
  map.set('توليد صور بأسلوب خيالي','Fantasy-style image generation');
  map.set('فيديو احترافي من النص','Professional text-to-video');
  map.set('سرد بصري واقعي','Realistic visual storytelling');
  map.set('تحويل نص أو صورة إلى فيديو','Text or image to video');
  map.set('نص/صورة إلى فيديو','Text/Image to video');
  map.set('محادثة وتحليل','Chat & analysis');
  map.set('صور واقعية فائقة','Ultra-realistic images');
  map.set('دقة عالية وتفاصيل غنية','High resolution, rich detail');
  map.set('إخراج فوتوريالي سريع','Fast photoreal output');
  map.set('فيديوهات بجودة واضحة','Clean, high-quality video');
  map.set('صوت + صورة لتحريك الوجه','Audio + image lip sync');
  map.set('حركة سينمائية ناعمة','Smooth cinematic motion');
  map.set('سياق بصري أعمق','Deeper visual context');
  map.set('إعادة تأطير ذكية','Smart reframing');
  map.set('مزامنة شفاه احترافية','Professional lip sync');
  map.set('تحرير صور احترافي بنص واضح','Pro image edit with clear text');
  map.set('ثبات الشخصية عبر المشاهد','Character consistency across shots');
  map.set('الصفحة الرئيسية','Home');
  map.set('أدوات الصور','Image Tools');
  map.set('الانتقالات','Transitions');
  map.set('توليد البرومبت','Prompt Studio');
  map.set('المعرض','Gallery');
  map.set('مكتبة الأعمال','Work Library');
  map.set('لوحة التحكم','Control Panel');
  map.set('تحديث الرصيد','Refresh Credits');
  map.set('جاهز للتوليد.','Ready to generate.');
  map.set('ستظهر النتائج هنا','Results will appear here');
  map.set('رفع صورة','Upload image');
  map.set('رفع فيديو','Upload video');
  map.set('رفع ملف الصوت','Upload audio');
  map.set('صورة البداية','Start image');
  map.set('صورة مرجعية','Reference image');
  map.set('الإعدادات الأساسية','Basic Settings');
  map.set('التحكم','Controls');
  map.set('الإعدادات الثابتة','Global Settings');
  map.set('النتائج','Results');
  map.set('تسجيل الدخول','Sign In');
  map.set('البريد الإلكتروني','Email');
  map.set('كلمة المرور','Password');
  map.set('تسجيل عبر Google','Sign in with Google');
  map.set('المدة','Duration');
  map.set('الدقة','Resolution');
  map.set('نسبة الأبعاد','Aspect Ratio');
  map.set('تم نسخ البرومبت','Prompt copied');
  map.set('لا توجد أعمال','No items yet');
  map.set('تم الحذف','Deleted');
  map.set('تم المسح','Cleared');
  // Profile card
  map.set('💳 رصيدك','💳 Credits');
  map.set('📅 تاريخ الاشتراك','📅 Subscription Date');
  map.set('⏳ ينتهي في','⏳ Expires on');
  map.set('⭐ باقي','⭐ Remaining');
  map.set('📊 لوحتي','📊 My Dashboard');
  map.set('💳 الاشتراك والفوترة','💳 Subscription & Billing');
  map.set('\u2192 تسجيل الخروج','\u2192 Sign Out');
  map.set('رصيد حسابك','Your Balance');
  // User Dashboard
  map.set('لوحتي الشخصية','My Dashboard');
  map.set('إحصاءاتك واستخدامك — لا يراها أحد غيرك','Your stats & usage — visible only to you');
  map.set('الرصيد المتبقي','Remaining Balance');
  map.set('صور مولّدة (الشهر)','Images Generated (Month)');
  map.set('فيديوهات (الشهر)','Videos (Month)');
  map.set('كريدت مستهلك (الشهر)','Credits Used (Month)');
  map.set('استخدام اليوم','Today\'s Usage');
  map.set('صور','Images');
  map.set('فيديوهات','Videos');
  map.set('كريدت مستهلك اليوم','Credits Used Today');
  map.set('الاشتراك','Subscription');
  map.set('الخطة','Plan');
  map.set('الحالة','Status');
  map.set('تاريخ الانتهاء','Expiry Date');
  map.set('تفاصيل الاشتراك والفوترة →','Subscription & Billing Details →');
  map.set('إجمالي الاستخدام الكلي','All-Time Usage');
  map.set('إجمالي الصور','Total Images');
  map.set('إجمالي الفيديوهات','Total Videos');
  map.set('إجمالي الكريدت المستهلك','Total Credits Used');
  map.set('✅ نشط','✅ Active');
  map.set('⚠️ منتهي','⚠️ Expired');
  // Billing
  map.set('الاشتراك والفوترة','Subscription & Billing');
  map.set('بيانات حسابك — لا يراها أحد غيرك','Your account info — visible only to you');
  map.set('كريدت متبقي','Credits Remaining');
  map.set('تاريخ بدء الاشتراك','Subscription Start Date');
  map.set('تاريخ انتهاء الاشتراك','Subscription End Date');
  map.set('تاريخ التجديد','Renewal Date');
  map.set('الرصيد الأقصى للخطة','Plan Max Credits');
  map.set('استهلاك الرصيد','Credit Usage');
  map.set('مستهلك','Used');
  map.set('⚡ ترقية الخطة','⚡ Upgrade Plan');
  map.set('+ شراء كريدت إضافي','+ Buy Extra Credits');
  map.set('سجل الطلبات','Order History');
  map.set('الباقة','Package');
  map.set('الكريدت','Credits');
  map.set('التاريخ','Date');
  map.set('لا توجد طلبات حتى الآن.','No orders yet.');
  map.set('✅ اشتراك نشط','✅ Active Subscription');
  map.set('⚠️ الاشتراك منتهي','⚠️ Subscription Expired');
  // Misc
  map.set('جاهز.','Ready.');
  map.set('تحديث الرصيد','Refresh Credits');
  map.set('الموديل','Model');
  map.set('نوع التوليد','Generation Type');
  map.set('القياس','Aspect Ratio');
  map.set('التكلفة المتوقعة:','Estimated Cost:');
  map.set('نتائج الانتقالات','Transition Results');
  map.set('التكلفة لكل طلب:','Cost Per Request:');
  map.set('كريدت','credits');
  map.set('تسجيل الخروج','Sign Out');

  const storeArabic = (el, t) => {
    if(el && t && !el.dataset.arText){
      el.dataset.arText = t;
    }
  };

  const englishFallback = (t, fallback) => {
    if(fallback) return fallback;
    const len = (t||'').length;
    if(len > 60) return 'Detailed description.';
    if(len > 30) return 'Description';
    if(len > 14) return 'Label';
    return 'Text';
  };

  const applyText = (el, fallback) => {
    const t = (el.textContent || '').trim();
    if(!t) return;
    if(needsFix(t)) storeArabic(el, t);
    if(map.has(t)){ el.textContent = map.get(t); return; }
    if(needsFix(t)) el.textContent = englishFallback(t, fallback);
  };

  document.querySelectorAll('[placeholder]').forEach(el=>{
    const p = (el.placeholder || '').trim();
    if(!p) return;
    if(needsFix(p) || arabic.test(p)){
      if(!el.dataset.arPlaceholder) el.dataset.arPlaceholder = p;
      el.placeholder='Enter text...';
    }
  });

  document.querySelectorAll('.nav-name').forEach(el=>applyText(el,'Menu'));
  document.querySelectorAll('.nav-label').forEach(el=>applyText(el,'Section'));
  document.querySelectorAll('.ph-title').forEach(el=>applyText(el,'Section'));
  document.querySelectorAll('.ph-sub').forEach(el=>applyText(el,'Description'));
  document.querySelectorAll('.card-head').forEach(el=>applyText(el,'Section'));
  document.querySelectorAll('.flabel').forEach(el=>applyText(el,'Field'));
  document.querySelectorAll('.gs-inline-note,.gs-note,.model-status,.status-text,.brand-status,.gbar-status,.gs-gallery-title,.gs-gallery-empty').forEach(el=>applyText(el,'Note'));
  document.querySelectorAll('.result-empty-text').forEach(el=>applyText(el,'Results will appear here'));
  document.querySelectorAll('.dz-text').forEach(el=>applyText(el,'Drop files here'));
  document.querySelectorAll('.dz-sub').forEach(el=>applyText(el,'PNG / JPG / WEBP up to 10MB'));
  document.querySelectorAll('.market-hero-sub,.market-card-sub,.headline,.subhead,.desc,.stitle').forEach(el=>applyText(el,'Description'));
  document.querySelectorAll('.badge').forEach(el=>applyText(el,''));
  document.querySelectorAll('.plan-title').forEach(el=>applyText(el,'Plan'));
  document.querySelectorAll('.plan-tag').forEach(el=>applyText(el,'Popular'));
  document.querySelectorAll('.plan-period').forEach(el=>applyText(el,'/ month'));
  document.querySelectorAll('.plan-credits').forEach(el=>applyText(el,'Credits per month'));
  document.querySelectorAll('.plan-action').forEach(el=>applyText(el,'Choose Plan'));
  document.querySelectorAll('.topup-title').forEach(el=>applyText(el,'Buy extra credits'));
  document.querySelectorAll('.compare-title').forEach(el=>applyText(el,'Compare Plans'));
  document.querySelectorAll('.compare-section').forEach(el=>applyText(el,'Section'));
  document.querySelectorAll('.gpt-empty').forEach(el=>applyText(el,'What would you like to do?'));
  document.querySelectorAll('.gtag').forEach(el=>applyText(el,'All'));
  document.querySelectorAll('option').forEach(el=>applyText(el,'Option'));
  document.querySelectorAll('button').forEach(el=>applyText(el,'Action'));
  document.querySelectorAll('.profile-card-label').forEach(el=>applyText(el,'Label'));
  document.querySelectorAll('.gs-kpi-label').forEach(el=>applyText(el,'Label'));
  document.querySelectorAll('.udash-title').forEach(el=>applyText(el,'Dashboard'));
  document.querySelectorAll('.udash-sub').forEach(el=>applyText(el,'Your stats'));
  document.querySelectorAll('.udash-kpi-label').forEach(el=>applyText(el,'Label'));
  document.querySelectorAll('.udash-section-title').forEach(el=>applyText(el,'Section'));
  document.querySelectorAll('.sub-detail-label').forEach(el=>applyText(el,'Field'));
  document.querySelectorAll('.usage-bar-label span:first-child').forEach(el=>applyText(el,'Metric'));
  document.querySelectorAll('.gs-status').forEach(el=>applyText(el,'Status'));
  document.querySelectorAll('.billing-table th').forEach(el=>applyText(el,'Column'));
  document.querySelectorAll('#billing-no-orders').forEach(el=>applyText(el,'No orders yet.'));
  document.querySelectorAll('[data-en]').forEach(el=>{
    const v=el.getAttribute('data-en'); if(!v) return;
    if(el.tagName==='LABEL') el.childNodes[0].textContent=v;
    else el.textContent=v;
  });
  const sb=document.getElementById('auth-submit-btn');
  if(sb){ if(sb.textContent.includes('دخول'))sb.textContent='Sign In'; else if(sb.textContent.includes('حساب'))sb.textContent='Create Account'; }
  const al=document.getElementById('atab-login'); if(al) al.textContent='Sign In';
  const ar2=document.getElementById('atab-register'); if(ar2) ar2.textContent='Sign Up';
}

function forceArabicUI(){
  const mojibake=/[ØÙâ]/;
  const needsFix = (t='') => mojibake.test(t);
  const map=new Map([
    ['Connected','متصل'],
    ['Pricing','التسعير'],
    ['Login','تسجيل الدخول'],
    ['Sign up','إنشاء حساب'],
    ['SPECIAL','عرض خاص'],
    ['PREMIUM','بريميوم'],
    ['Starter','المبتدئ'],
    ['Pro','محترف'],
    ['Creator','المبدع'],
    ['Subscription plans and extra credit packs.','خطط الاشتراك وباقات شراء الكريدت الإضافية'],
    ['Exclusive Nano Banana Pro & Nano Banana 2 offers','عروض حصرية لنانو بنانا برو ونانو بنانا 2'],
    ['Free for $25 and $50 subscribers only','مجانا لمشتركي $25 و $50 فقط'],
    ['Upgrade your production with advanced perks and flexible options for your projects.','ارتقِ بإنتاجك مع مزايا متقدمة وخيارات مرنة تناسب مشاريعك'],
    ['Start now','ابدأ الآن'],
    ['Purchase coming soon','الشراء قريباً'],
    ['Choose Plan','اختر الخطة'],
    ['Most Popular','الأكثر طلباً'],
    ['Buy extra credits','شراء كريدت إضافي'],
    ['Compare Plans','مقارنة الخطط'],
    ['/ month','/ شهر'],
    ['credits per month','credits لكل شهر'],
    ['Great for getting started','مناسب للبداية'],
    ['Full access to models','واجهة كاملة للموديلات'],
    ['Gallery and saved results','معرض الأعمال وحفظ النتائج'],
    ['Faster generations','توليد أكثر سرعة'],
    ['Built for larger projects','مناسب للمشاريع الكبيرة'],
    ['Nano Banana free for subscribers','نانو بنانا مجاني للمشتركين'],
    ['Video duration controls','دعم مدة الفيديوات'],
    ['Highest usage tier','أعلى مستوى استخدام'],
    ['Best for studios','مناسب للاستوديوهات'],
    ['Expanded video and image features','مزايا موسعة للفيديو والصور'],
    ['Most Popular','الأكثر طلباً'],
    ['Great for getting started','مناسب للبداية'],
    ['Full access to models','واجهة كاملة للموديلات'],
    ['Gallery and saved results','معرض الأعمال وحفظ النتائج'],
    ['Faster generations','توليد أكثر سرعة'],
    ['Built for larger projects','مناسب للمشاريع الكبيرة'],
    ['Nano Banana free for subscribers','نانو بنانا مجاني للمشتركين'],
    ['Video duration controls','دعم مدة الفيديوات'],
    ['Highest usage tier','أعلى مستوى استخدام'],
    ['Best for studios','مناسب للاستوديوهات'],
    ['Video','الفيديو'],
    ['Concurrent Jobs','عدد المهام المتزامنة'],
    ['Nano Banana (free)','Nano Banana (مجاني)'],
    ['Available','متاح'],
    ['Text-to-music generation','موسيقى مولدة من النص'],
    ['High-quality images','جودة عالية للصور'],
    ['Fantasy-style image generation','توليد صور بأسلوب خيالي'],
    ['Professional text-to-video','فيديو احترافي من النص'],
    ['Realistic visual storytelling','سرد بصري واقعي'],
    ['Text or image to video','تحويل نص أو صورة إلى فيديو'],
    ['Text/Image to video','نص/صورة إلى فيديو'],
    ['Chat & analysis','محادثة وتحليل'],
    ['Ultra-realistic images','صور واقعية فائقة'],
    ['High resolution, rich detail','دقة عالية وتفاصيل غنية'],
    ['Fast photoreal output','إخراج فوتوريالي سريع'],
    ['Clean, high-quality video','فيديوهات بجودة واضحة'],
    ['Audio + image lip sync','صوت + صورة لتحريك الوجه'],
    ['Smooth cinematic motion','حركة سينمائية ناعمة'],
    ['Deeper visual context','سياق بصري أعمق'],
    ['Smart reframing','إعادة تأطير ذكية'],
    ['Professional lip sync','مزامنة شفاه احترافية'],
    ['Pro image edit with clear text','تحرير صور احترافي بنص واضح'],
    ['Character consistency across shots','ثبات الشخصية عبر المشاهد'],
    ['Discover','اكتشف مالجديد'],
    ['Production','الإنتاج'],
    ['Image Tools','أدوات الصور'],
    ['Transitions','الانتقالات'],
    ['Prompt Studio','توليد البرومبت'],
    ['Models','النماذج'],
    ['Library','المكتبة'],
    ['Gallery','المعرض'],
    ['Control Panel','لوحة التحكم'],
    ['Refresh Credits','تحديث الرصيد'],
    ['Pick a model and jump straight to its workspace.','اختر الموديل المطلوب واضغط للانتقال المباشر'],
    ['Open Model','فتح الموديل'],
    ['Professional music generation from text with rich performance and dynamic effects.','توليد موسيقى احترافية من النصوص مع أداء غني ومؤثرات ديناميكية.'],
    ['High-quality image generation and editing with cinematic, realistic detail.','توليد وتعديل الصور بجودة عالية مع تفاصيل سينمائية وواقعية أقوى.'],
    ['Cinematic text-to-video with duration, resolution, and direction control.','فيديوهات سينمائية من النص مع تحكم بالمدة والدقة والإخراج.'],
    ['Text or image to video with motion and shot control.','توليد فيديو من النص أو الصورة مع تحكم بالحركة والمشاهد.'],
    ['Multimodal chat for ideas, writing, and analysis.','محادثة وذكاء متعدد الوسائط للأفكار والكتابة والتحليل.'],
    ['Pricing','التسعير'],
    ['Subscription plans and extra credit packs.','خطط الاشتراك وباقات شراء الكريدت الإضافية'],
    ['Exclusive Nano Banana Pro & Nano Banana 2 offers','عروض حصرية لنانو بنانا برو ونانو بنانا 2'],
    ['Free for $25 and $50 subscribers only','مجانا لمشتركي $25 و $50 فقط'],
    ['Upgrade your production with advanced perks and flexible options for your projects.','ارتقِ بإنتاجك مع مزايا متقدمة وخيارات مرنة تناسب مشاريعك'],
    ['Start now','ابدأ الآن'],
    ['Most Popular','الأكثر طلباً'],
    ['Choose Plan','اختر الخطة'],
    ['Purchase coming soon','الشراء قريباً'],
    ['Buy extra credits','شراء كريدت إضافي'],
    ['Compare Plans','مقارنة الخطط'],
    ['/ month','/ شهر'],
    ['credits per month','credits لكل شهر'],
    ['Great for getting started','مناسب للبداية'],
    ['Full access to models','واجهة كاملة للموديلات'],
    ['Gallery and saved results','معرض الأعمال وحفظ النتائج'],
    ['Faster generations','توليد أكثر سرعة'],
    ['Built for larger projects','مناسب للمشاريع الكبيرة'],
    ['Nano Banana free for subscribers','نانو بنانا مجاني للمشتركين'],
    ['Video duration controls','دعم مدة الفيديوات'],
    ['Highest usage tier','أعلى مستوى استخدام'],
    ['Best for studios','مناسب للاستوديوهات'],
    ['Expanded video and image features','مزايا موسعة للفيديو والصور'],
    ['Ready to generate.','جاهز للتوليد.'],
    ['Results will appear here','ستظهر النتائج هنا'],
    ['Sign In','تسجيل الدخول'],
    ['Email','البريد الإلكتروني'],
    ['Password','كلمة المرور'],
    ['Sign in with Google','تسجيل عبر Google'],
    ['Duration','المدة'],
    ['Resolution','الدقة'],
    ['Aspect Ratio','نسبة الأبعاد'],
    ['Prompt copied','تم نسخ البرومبت'],
    ['No items yet','لا توجد أعمال'],
    ['Deleted','تم الحذف'],
    ['Cleared','تم المسح'],
    ['Section','قسم'],
    ['Description','وصف'],
    ['Field','حقل'],
    ['Action','إجراء'],
    ['Note','ملاحظة'],
    ['Text','نص'],
    ['Value','قيمة'],
    ['Title','عنوان'],
    ['Drop files here','اسحب الملفات هنا'],
    ['PNG / JPG / WEBP up to 10MB','PNG / JPG / WEBP حتى 10MB'],
    ['What would you like to do?','ماذا يخطر ببالك اليوم؟'],
    // Profile card
    ['💳 Credits','💳 رصيدك'],
    ['📅 Subscription Date','📅 تاريخ الاشتراك'],
    ['⏳ Expires on','⏳ ينتهي في'],
    ['⭐ Remaining','⭐ باقي'],
    ['📊 My Dashboard','📊 لوحتي'],
    ['💳 Subscription & Billing','💳 الاشتراك والفوترة'],
    ['\u2192 Sign Out','\u2192 تسجيل الخروج'],
    ['Your Balance','رصيد حسابك'],
    // User Dashboard
    ['My Dashboard','لوحتي الشخصية'],
    ['Your stats & usage — visible only to you','إحصاءاتك واستخدامك — لا يراها أحد غيرك'],
    ['Remaining Balance','الرصيد المتبقي'],
    ['Images Generated (Month)','صور مولّدة (الشهر)'],
    ['Videos (Month)','فيديوهات (الشهر)'],
    ['Credits Used (Month)','كريدت مستهلك (الشهر)'],
    ['Today\'s Usage','استخدام اليوم'],
    ['Images','صور'],
    ['Videos','فيديوهات'],
    ['Credits Used Today','كريدت مستهلك اليوم'],
    ['Subscription','الاشتراك'],
    ['Plan','الخطة'],
    ['Status','الحالة'],
    ['Expiry Date','تاريخ الانتهاء'],
    ['Subscription & Billing Details →','تفاصيل الاشتراك والفوترة →'],
    ['All-Time Usage','إجمالي الاستخدام الكلي'],
    ['Total Images','إجمالي الصور'],
    ['Total Videos','إجمالي الفيديوهات'],
    ['Total Credits Used','إجمالي الكريدت المستهلك'],
    ['✅ Active','✅ نشط'],
    ['⚠️ Expired','⚠️ منتهي'],
    // Billing
    ['Subscription & Billing','الاشتراك والفوترة'],
    ['Your account info — visible only to you','بيانات حسابك — لا يراها أحد غيرك'],
    ['Credits Remaining','كريدت متبقي'],
    ['Subscription Start Date','تاريخ بدء الاشتراك'],
    ['Subscription End Date','تاريخ انتهاء الاشتراك'],
    ['Renewal Date','تاريخ التجديد'],
    ['Plan Max Credits','الرصيد الأقصى للخطة'],
    ['Credit Usage','استهلاك الرصيد'],
    ['Used','مستهلك'],
    ['⚡ Upgrade Plan','⚡ ترقية الخطة'],
    ['+ Buy Extra Credits','+ شراء كريدت إضافي'],
    ['Order History','سجل الطلبات'],
    ['Package','الباقة'],
    ['Credits','الكريدت'],
    ['Date','التاريخ'],
    ['No orders yet.','لا توجد طلبات حتى الآن.'],
    ['✅ Active Subscription','✅ اشتراك نشط'],
    ['⚠️ Subscription Expired','⚠️ الاشتراك منتهي'],
    // Misc
    ['Ready.','جاهز.'],
    ['Refresh Credits','تحديث الرصيد'],
    ['Model','الموديل'],
    ['Generation Type','نوع التوليد'],
    ['Aspect Ratio','القياس'],
    ['Estimated Cost:','التكلفة المتوقعة:'],
    ['Transition Results','نتائج الانتقالات'],
    ['Cost Per Request:','التكلفة لكل طلب:'],
    ['credits','كريدت'],
    ['Sign Out','تسجيل الخروج']
  ]);

  const restoreArabic = (el) => {
    if(el && el.dataset && el.dataset.arText){
      el.textContent = el.dataset.arText;
      return true;
    }
    return false;
  };

  const applyText = (el, fallback) => {
    const t = (el.textContent || '').trim();
    if(!t) return;
    if(restoreArabic(el)) return;
    if(map.has(t)){ el.textContent = map.get(t); return; }
    if(needsFix(t)) el.textContent = fallback;
  };

  document.querySelectorAll('[placeholder]').forEach(el=>{
    if(el.dataset.arPlaceholder){
      el.placeholder = el.dataset.arPlaceholder;
      return;
    }
    if(needsFix(el.placeholder)) el.placeholder='أدخل النص...';
  });

  document.querySelectorAll('.nav-name').forEach(el=>applyText(el,'القائمة'));
  document.querySelectorAll('.nav-label').forEach(el=>applyText(el,'قسم'));
  document.querySelectorAll('.ph-title').forEach(el=>applyText(el,'قسم'));
  document.querySelectorAll('.ph-sub').forEach(el=>applyText(el,'وصف'));
  document.querySelectorAll('.card-head').forEach(el=>applyText(el,'قسم'));
  document.querySelectorAll('.flabel').forEach(el=>applyText(el,'حقل'));
  document.querySelectorAll('.gs-inline-note,.gs-note,.model-status,.status-text,.brand-status,.gbar-status,.gs-gallery-title,.gs-gallery-empty').forEach(el=>applyText(el,'ملاحظة'));
  document.querySelectorAll('.result-empty-text').forEach(el=>applyText(el,'ستظهر النتائج هنا'));
  document.querySelectorAll('.dz-text').forEach(el=>applyText(el,'ارفع ملفاً'));
  document.querySelectorAll('.dz-sub').forEach(el=>applyText(el,'PNG / JPG / WEBP حتى 10MB'));
  document.querySelectorAll('.market-hero-sub,.market-card-sub,.headline,.subhead,.desc,.stitle').forEach(el=>applyText(el,''));
  document.querySelectorAll('.plan-period').forEach(el=>applyText(el,'/ شهر'));
  document.querySelectorAll('.plan-credits').forEach(el=>{
    const t=(el.textContent||'').trim();
    if(restoreArabic(el)) return;
    if(map.has(t)){ el.textContent=map.get(t); return; }
    if(t.includes('credits per month')){
      el.textContent = t.replace('credits per month','credits لكل شهر');
      return;
    }
    if(needsFix(t)) el.textContent='credits لكل شهر';
  });
  document.querySelectorAll('.plan-action').forEach(el=>applyText(el,'اختر الخطة'));
  document.querySelectorAll('.plan-features div').forEach(el=>{
    const raw=(el.textContent||'').trim();
    if(!raw) return;
    const cleaned = raw.replace(/^•\s*/,'').trim();
    if(map.has(cleaned)){
      el.textContent = '• ' + map.get(cleaned);
      return;
    }
    if(needsFix(raw)) el.textContent = '• ' + 'ميزة';
  });
  document.querySelectorAll('.topup-title').forEach(el=>applyText(el,'شراء كريدت إضافي'));
  document.querySelectorAll('.compare-title').forEach(el=>applyText(el,'مقارنة الخطط'));
  document.querySelectorAll('.compare-section').forEach(el=>applyText(el,'فئة'));
  document.querySelectorAll('.gpt-empty').forEach(el=>applyText(el,'ماذا يخطر ببالك اليوم؟'));
  document.querySelectorAll('.gtag').forEach(el=>applyText(el,'الكل'));
  document.querySelectorAll('option').forEach(el=>applyText(el,'خيار'));
  document.querySelectorAll('button').forEach(el=>applyText(el,''));
  document.querySelectorAll('.profile-card-label').forEach(el=>applyText(el,''));
  document.querySelectorAll('.gs-kpi-label').forEach(el=>applyText(el,''));
  document.querySelectorAll('.udash-title').forEach(el=>applyText(el,''));
  document.querySelectorAll('.udash-sub').forEach(el=>applyText(el,''));
  document.querySelectorAll('.udash-kpi-label').forEach(el=>applyText(el,''));
  document.querySelectorAll('.udash-section-title').forEach(el=>applyText(el,''));
  document.querySelectorAll('.sub-detail-label').forEach(el=>applyText(el,''));
  document.querySelectorAll('.usage-bar-label span:first-child').forEach(el=>applyText(el,''));
  document.querySelectorAll('.gs-status').forEach(el=>applyText(el,''));
  document.querySelectorAll('.billing-table th').forEach(el=>applyText(el,''));
  document.querySelectorAll('#billing-no-orders').forEach(el=>applyText(el,''));
  document.querySelectorAll('[data-ar]').forEach(el=>{
    const v=el.getAttribute('data-ar'); if(!v) return;
    if(el.tagName==='LABEL') el.childNodes[0].textContent=v;
    else el.textContent=v;
  });
  const sb=document.getElementById('auth-submit-btn');
  if(sb){ if(sb.textContent==='Sign In')sb.textContent='تسجيل الدخول'; else if(sb.textContent==='Create Account')sb.textContent='إنشاء حساب'; }
  const al=document.getElementById('atab-login'); if(al) al.textContent='تسجيل الدخول';
  const ar2=document.getElementById('atab-register'); if(ar2) ar2.textContent='إنشاء حساب';
}

function applyLanguage(lang, keepTitle){
  currentLang = lang === 'en' ? 'en' : 'ar';
  localStorage.setItem(LANG_KEY, currentLang);
  document.documentElement.lang = currentLang;
  const toggle = document.getElementById('langToggle');
  if(toggle) toggle.textContent = currentLang === 'ar' ? 'EN' : 'AR';
  if(currentLang === 'en'){ forceEnglishUI(); }
  else { forceArabicUI(); }
  if(!keepTitle){
    const titleEl = document.getElementById('pageTitle');
    if(titleEl) titleEl.textContent = getPageTitle(currentPage);
  }
}

function toggleLanguage(){
  applyLanguage(currentLang === 'ar' ? 'en' : 'ar');
}



// ═══════════════════════════
// LIBRARY
// ═══════════════════════════
const LIB_KEY = 'saad_library_v1';

async function saveLibraryItem(){
  const title    = document.getElementById('lib-title').value.trim();
  const prompt   = document.getElementById('lib-prompt').value.trim();
  const category = document.getElementById('lib-category').value;
  const file     = S.files['dz-lib'];

  if(!file){ toast('ارفع صورة أو فيديو أولاً','error'); return; }

  toast('⏳ جاري الحفظ...','info');
  try {
    const form = new FormData();
    form.append('file', file);
    const r = await fetch('/api/vault/upload', {method:'POST', body:form});
    const d = await r.json();
    if(d.error){ toast('خطأ: '+d.error,'error'); return; }

    const item = {
      id: Date.now(),
      title: title || file.name,
      prompt: prompt,
      category: category,
      url: d.url,
      serverFile: d.name,
      isVideo: file.type.startsWith('video'),
      time: Date.now()
    };

    const saved = JSON.parse(localStorage.getItem(LIB_KEY)||'[]');
    saved.unshift(item);
    localStorage.setItem(LIB_KEY, JSON.stringify(saved));

    // Reset form
    document.getElementById('lib-title').value = '';
    document.getElementById('lib-prompt').value = '';
    document.getElementById('dz-lib-inner').innerHTML = '<div class="dz-icon">🖼️</div><div class="dz-text">ارفع صورة</div>';
    delete S.files['dz-lib'];

    toast('✅ تم الحفظ','success');
    renderLibrary();
  } catch(e){ toast('خطأ: '+e.message,'error'); }
}

function renderLibrary(filter='all'){
  const grid = document.getElementById('library-grid'); if(!grid) return;
  const saved = JSON.parse(localStorage.getItem(LIB_KEY)||'[]');
  const filtered = filter==='all' ? saved : saved.filter(r=>r.category===filter);

  if(filtered.length===0){
    grid.innerHTML='<div style="color:var(--tx3);font-size:11px;text-align:center;padding:60px;font-family:var(--fm);grid-column:1/-1;">لا توجد أعمال</div>';
    return;
  }

  grid.innerHTML='';
  filtered.forEach(r=>{
    const card = document.createElement('div');
    card.style.cssText='background:#111;border:1px solid #222;border-radius:10px;overflow:hidden;display:flex;flex-direction:column;position:relative;';
    const safePrompt = (r.prompt || '').replace(/'/g, "\\'");
    const safeUrl = (r.url || '').replace(/'/g, "\\'");

    // صورة/فيديو
    const media = document.createElement(r.isVideo?'video':'img');
    media.src = r.url;
    media.style.cssText='width:100%;height:180px;object-fit:cover;display:block;cursor:zoom-in;';
    if(r.isVideo){
      media.controls=false; media.loop=true; media.muted=true; media.playsInline=true; media.preload='metadata';
      media.setAttribute('controlsList','nodownload noplaybackrate noremoteplayback');
      media.setAttribute('disablePictureInPicture','');
      media.style.cursor='pointer';
      media.onclick=(e)=>{ e.preventDefault(); e.stopPropagation(); openLightbox(r.url, r.prompt, true); };
      media.onplay=(e)=>{ media.pause(); openLightbox(r.url, r.prompt, true); };
      const play = document.createElement('div');
      play.textContent = '▶';
      play.style.cssText = 'position:absolute;inset:auto 14px 14px auto;width:28px;height:28px;border-radius:50%;background:rgba(0,0,0,0.55);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;pointer-events:none;';
      card.appendChild(play);
    } else {
      media.onclick=()=>openLightbox(r.url, r.prompt);
    }
    card.appendChild(media);

    // معلومات
    const info = document.createElement('div');
    info.style.cssText='padding:10px 12px;flex:1;display:flex;flex-direction:column;gap:6px;';
    info.innerHTML=`
      <div style="color:var(--amber2);font-size:12px;font-weight:700;">${r.title||'بدون عنوان'}</div>
      ${r.prompt?`<div style="color:var(--tx2);font-size:10px;line-height:1.5;max-height:60px;overflow:hidden;">${r.prompt}</div>`:''}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:auto;padding-top:6px;border-top:1px solid #222;">
        <span style="background:var(--amber-g);color:var(--amber);font-size:9px;padding:2px 7px;border-radius:4px;">${r.category||'أخرى'}</span>
        <div style="display:flex;gap:6px;">
          <button onclick="openLightbox('${safeUrl}','${safePrompt}', ${r.isVideo ? 'true' : 'false'})" style="background:none;border:1px solid #333;color:var(--tx2);padding:3px 8px;border-radius:5px;cursor:pointer;font-size:10px;">🔍</button>
          <button onclick="deleteLibraryItem(${r.id},this)" style="background:none;border:1px solid #333;color:#e55;padding:3px 8px;border-radius:5px;cursor:pointer;font-size:10px;">✕</button>
        </div>
      </div>`;
    card.appendChild(info);
    grid.appendChild(card);
  });
}

function deleteLibraryItem(id, btn){
  if(!confirm('حذف هذا العمل؟')) return;
  const saved = JSON.parse(localStorage.getItem(LIB_KEY)||'[]');
  const item = saved.find(r=>r.id===id);
  if(item?.serverFile){
    fetch('/api/vault/file/'+item.serverFile,{method:'DELETE'}).catch(()=>{});
  }
  localStorage.setItem(LIB_KEY, JSON.stringify(saved.filter(r=>r.id!==id)));
  btn.closest('div[style*="background:#111"]')?.remove();
  toast('تم الحذف','info');
}

function filterLibrary(cat, el){
  document.querySelectorAll('#page-library .gtag').forEach(g=>g.classList.remove('active'));
  el.classList.add('active');
  renderLibrary(cat);
}

function clearLibrary(){
  if(!confirm('مسح كل الأعمال؟')) return;
  const saved = JSON.parse(localStorage.getItem(LIB_KEY)||'[]');
  saved.forEach(r=>{ if(r.serverFile) fetch('/api/vault/file/'+r.serverFile,{method:'DELETE'}).catch(()=>{}); });
  localStorage.removeItem(LIB_KEY);
  renderLibrary();
  toast('تم المسح','info');
}

// ═══════════════════════════
// INIT
// ═══════════════════════════
  document.addEventListener('DOMContentLoaded', ()=>{
    injectSharedModals();
    applyProfessionalIcons();
    renderGoogleBudget();
    const ui = loadUiState();
  initGoogleBar(ui.googleBar || {});
  setNanoTab(ui.nanoTab || 'nanopro');
  const _igt = ui.googleTab; setGoogleTab((!_igt||['nano','nano2','nanopro'].includes(_igt))?'veo3':_igt);
  setKieSuite(ui.kieSuite || 'video');
  if((ui.kieSuite || 'video') === 'video'){
    setKlingTab(ui.klingTab || 'text');
  } else {
    setKieImageTab(ui.kieImageTab || 'removebg');
  }
  syncKlingModelLabel(document.getElementById('kling-text-model')?.value || 'kling-3.0/video');
  // Load KIE API balance only for admin
  if(_adminCsrf) loadKieCredits();
  loadGoogleGallery();
  syncElevenModelLabel(document.getElementById('eleven-model')?.value || 'elevenlabs/text-to-dialogue-v3');
  populateElevenVoiceSelect('eleven-voice-1', 'TX3LPaxmHKxFdv7VOQHJ');
  populateElevenVoiceSelect('eleven-voice-2', 'cgSgspJ2msm6clMCkdW9');
  populateElevenVoiceSelect('eleven-tts-voice', 'Rachel');
  setElevenTab(ui.elevenTab || 'dialogue');
  restoreFormState();
  applyKlingModelPreset('text', document.getElementById('kling-text-model')?.value || 'kling-3.0/video');
  applyKlingModelPreset('image', document.getElementById('kling-image-model')?.value || 'kling-3.0/video');
  toggleKlingMultishot('text', (document.getElementById('kling-text-multishot')?.value || 'false') === 'true');
  toggleKlingMultishot('image', (document.getElementById('kling-image-multishot')?.value || 'false') === 'true');
  bindFormPersistence();
  restoreFileState();
  updateKlingShowButtons();
  resumePendingKling();
  loadHomepageData();
    // Multi-page: honour ?page= query param, else detect from DOM
    const _qPage = new URLSearchParams(window.location.search).get('page');
    const _activePageEl = _qPage ? document.getElementById('page-' + _qPage) : document.querySelector('.page.active');
    const _currentPageId = _activePageEl ? _activePageEl.id.replace('page-', '') : (_qPage || 'dash');
    showPage(_currentPageId);
  if(_currentPageId === 'model' && ui.modelKey){
    setModelPage(ui.modelKey);
  }
  updateHailuoFields();
  updateSoraFields();
  selectGrokModel(ui.grokModel || 'grok-imagine/text-to-video');
  selectSoraModel(ui.soraModel || 'sora-2-text-to-video');
  selectQwen2Model(ui.qwen2Model || 'qwen2/text-to-image');
  selectSeedreamModel(ui.seedreamModel || 'seedream/4.5-text-to-image');
  selectWanModel(ui.wanModel || 'wan/2-6-text-to-video');
  selectFlux2Model(ui.flux2Model || 'flux-2/pro-image-to-image');
  selectFluxKontextMode(ui.fluxKontextMode || 'text');
  updateKieUpscaleFields();
    updateSeedreamFields();
    initGpt54UI();
    loadElevenCredits();
    loadSavedResults();
    renderControlState();
    syncUserCreditsBar();
    initGlobalDropzones();
    initFluxDropzone();
    renderFluxUploads();
    initTransitionLibrary();
    initCinemaStudio();
    syncSidebarActiveNav();

    // Secret admin access: URL hash #control or Ctrl+Shift+A
    if(window.location.hash === '#control'){
      // Navigate to control page — verifyAndRenderControl will show nav only if admin token is valid
      showPage('control', document.getElementById('nav-control'));
      verifyAndRenderControl();
    }
    document.addEventListener('keydown', (e) => {
      if(e.ctrlKey && e.shiftKey && e.key === 'A'){
        showPage('control', document.getElementById('nav-control'));
        verifyAndRenderControl();
      }
    });
  });

  /* ==================== CINEMA STUDIO JS ==================== */
  const cinemaState = { tab:'image', model:'scenes', ratio:'16:9', quality:'2K', imageCount:1, videoCount:1, shot:'single', vratio:'16:9', movement:'Auto', genre:'General', voiceType:'Voiceover', castGenre:'Action' };

  function setCinemaTab(tab, btn) {
    cinemaState.tab = tab;
    document.querySelectorAll('.cs-tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    document.querySelectorAll('.cs-content').forEach(c => c.classList.remove('active'));
    const content = document.getElementById('cs-' + tab + '-content');
    if (content) content.classList.add('active');
    if (tab === 'video') setTimeout(drawSpeedCurve, 80);
  }

  function toggleCinemaModelPanel() {
    document.getElementById('cs-model-panel')?.classList.toggle('open');
  }

  function setCinemaModel(model, el) {
    cinemaState.model = model;
    document.querySelectorAll('#cs-model-panel .cs-model-item').forEach(item => item.classList.toggle('active', item.dataset.model === model));
    const labelEl = document.getElementById('cs-model-label');
    if (labelEl && el) labelEl.textContent = el.querySelector('span:first-child').textContent;
    document.getElementById('cs-model-panel')?.classList.remove('open');
  }

  function toggleCLPanel() {
    document.getElementById('cs-cl-panel')?.classList.toggle('open');
  }

  function setCLTab(tab, el) {
    document.querySelectorAll('.cs-cl-tab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
    const body = document.getElementById('cs-cl-body');
    if (!body) return;
    const tabs = {
      recent: '<div class="cs-cl-empty"><div class="cs-cl-upload-card"><div class="cs-cl-upload-icon">+</div><span>Upload Images</span></div></div>',
      gens: '<div style="padding:20px;color:rgba(255,255,255,0.28);font-size:13px;text-align:center">No generated images yet</div>',
      liked: '<div class="cs-cl-empty"><div class="cs-cl-upload-card"><div class="cs-cl-upload-icon">+</div><span>Upload Images</span></div></div>',
      chars: '<div class="cs-cl-chars-locs"><div class="cs-cl-chars-section"><div class="cs-cl-section-title">Characters</div><div class="cs-cl-section-sub">Reuse characters across<br>scenes</div><button class="cs-cl-create-btn">Create Character</button></div><div class="cs-cl-center-area"><div style="width:110px;height:110px;border-radius:50%;background:#222;display:flex;align-items:center;justify-content:center;font-size:44px;">👤</div></div><div class="cs-cl-divider"></div><div class="cs-cl-locs-section" style="text-align:right"><div class="cs-cl-section-title">Locations</div><div class="cs-cl-section-sub">Keep every scene<br>in the same world</div><button class="cs-cl-create-btn">Create Location</button></div></div>'
    };
    body.innerHTML = tabs[tab] || '';
  }

  function toggleCsDD(id) {
    ['cs-ratio-dd','cs-quality-dd','cs-shot-dd','cs-vratio-dd','cs-genre-overlay'].forEach(ddId => {
      if (ddId !== id) document.getElementById(ddId)?.classList.remove('open');
    });
    document.getElementById(id)?.classList.toggle('open');
  }

  function setCsRatio(r) {
    cinemaState.ratio = r;
    const label = document.getElementById('cs-ratio-label'); if (label) label.textContent = r;
    document.getElementById('cs-ratio-dd')?.classList.remove('open');
  }

  function setCsQuality(q) {
    cinemaState.quality = q;
    const label = document.getElementById('cs-quality-label'); if (label) label.textContent = q;
    document.querySelectorAll('#cs-quality-dd .cs-quality-item').forEach(item => {
      item.classList.toggle('active', item.querySelector('.cs-quality-name').textContent.trim().startsWith(q));
    });
    document.getElementById('cs-quality-dd')?.classList.remove('open');
  }

  function csCntChange(delta, mode) {
    if (mode === 'image') {
      cinemaState.imageCount = Math.max(1, Math.min(4, cinemaState.imageCount + delta));
      const el = document.getElementById('cs-image-count'); if (el) el.textContent = cinemaState.imageCount + '/4';
    } else {
      cinemaState.videoCount = Math.max(1, Math.min(4, cinemaState.videoCount + delta));
      const el = document.getElementById('cs-video-count'); if (el) el.textContent = cinemaState.videoCount + '/4';
    }
  }

  function setCsShot(shot, el) {
    cinemaState.shot = shot;
    const labels = { single:'Single shot', 'multi-auto':'Multi-shot Auto', 'multi-manual':'Multi-shot Manual' };
    const label = document.getElementById('cs-shot-label'); if (label) label.textContent = labels[shot] || shot;
    document.querySelectorAll('#cs-shot-dd .cs-shot-item').forEach(i => { i.classList.remove('active'); i.querySelector('.cs-shot-check') && (i.querySelector('.cs-shot-check').style.display='none'); });
    if (el) { el.classList.add('active'); const chk = el.querySelector('.cs-shot-check'); if (chk) chk.style.display=''; }
    document.getElementById('cs-shot-dd')?.classList.remove('open');
  }

  function setCsVRatio(r) {
    cinemaState.vratio = r;
    const label = document.getElementById('cs-vratio-label'); if (label) label.textContent = r;
    document.getElementById('cs-vratio-dd')?.classList.remove('open');
  }

  function toggleDirectorPanel() {
    document.getElementById('cs-director')?.classList.toggle('collapsed');
    setTimeout(drawSpeedCurve, 80);
  }

  function openMovementOverlay() {
    document.getElementById('cs-move-overlay')?.classList.add('open');
    document.getElementById('cs-backdrop')?.classList.add('open');
  }

  function closeMovementOverlay() {
    document.getElementById('cs-move-overlay')?.classList.remove('open');
    document.getElementById('cs-backdrop')?.classList.remove('open');
  }

  function setCsMovement(name, el) {
    cinemaState.movement = name;
    const label = document.getElementById('cs-movement-label'); if (label) label.textContent = name;
    document.querySelectorAll('#cs-move-grid .cs-move-card').forEach(c => c.classList.remove('active'));
    if (el) el.classList.add('active');
    closeMovementOverlay();
  }

  function setCinemaGenre(name, el) {
    cinemaState.genre = name;
    const label = document.getElementById('cs-genre-label'); if (label) label.textContent = name;
    document.querySelectorAll('#cs-genre-overlay .cs-genre-card').forEach(c => c.classList.remove('active'));
    if (el) el.closest('.cs-genre-card').classList.add('active');
    document.getElementById('cs-genre-overlay')?.classList.remove('open');
  }

  function toggleVoiceTypeMenu() {
    document.getElementById('cs-voice-type-menu')?.classList.toggle('open');
  }

  function setVoiceType(type) {
    cinemaState.voiceType = type;
    document.getElementById('cs-voice-type-menu')?.classList.remove('open');
  }

  function setCastStep(step, el) {
    document.querySelectorAll('.cs-cast-step').forEach(s => s.classList.remove('active'));
    if (el) el.classList.add('active');
    document.querySelectorAll('.cs-cast-step-content').forEach(c => c.classList.remove('active'));
    document.getElementById('cs-step-' + step)?.classList.add('active');
  }

  function setCastOption(el) {
    const parent = el.closest('.cs-cast-options');
    if (parent) parent.querySelectorAll('.cs-cast-option').forEach(o => o.classList.remove('active'));
    el.classList.add('active');
  }

  function setCastGenre(name, el) {
    cinemaState.castGenre = name;
    document.querySelectorAll('#cs-genre-carousel .cs-cast-genre-card').forEach(c => c.classList.remove('active'));
    if (el) el.classList.add('active');
  }

  function initCsMoveGrid() {
    const moves = [
      {name:'Static',icon:'🔒'},{name:'Handheld',icon:'📱'},{name:'Zoom Out',icon:'🔍'},
      {name:'Zoom in',icon:'🔎'},{name:'Camera follows',icon:'🎯'},{name:'Pan left',icon:'◀'},
      {name:'Pan right',icon:'▶'},{name:'Tilt up',icon:'⬆'},{name:'Tilt down',icon:'⬇'},
      {name:'Orbit around',icon:'🔄'},{name:'Dolly in',icon:'📐'},{name:'Dolly out',icon:'📏'},
      {name:'Jib up',icon:'⬆'},{name:'Jib down',icon:'⬇'},{name:'Drone shot',icon:'🚁'},
      {name:'Dolly left',icon:'⬅'},{name:'Dolly right',icon:'➡'},{name:'360 roll',icon:'🎡'}
    ];
    const grid = document.getElementById('cs-move-grid'); if (!grid) return;
    grid.innerHTML = moves.map(m => `<div class="cs-move-card" onclick="setCsMovement('${m.name}',this)"><div class="cs-move-thumb">${m.icon}</div><div class="cs-move-name">${m.name}</div></div>`).join('');
  }

  function initCsGenreOverlay() {
    const genres = [{name:'General',icon:'🔥'},{name:'Action',icon:'💥'},{name:'Horror',icon:'👻'},{name:'Comedy',icon:'😄'},{name:'Western',icon:'🤠'},{name:'Suspense',icon:'🔮'},{name:'Intimate',icon:'💕'},{name:'Spectacle',icon:'✨'}];
    const overlay = document.getElementById('cs-genre-overlay'); if (!overlay) return;
    overlay.innerHTML = genres.map((g,i) => `<div class="cs-genre-card ${i===0?'active':''}" onclick="setCinemaGenre('${g.name}',this)"><div class="cs-genre-check">✓</div><div class="cs-genre-img">${g.icon}</div><div class="cs-genre-name">${g.name}</div></div>`).join('');
  }

  function initCsCastCarousel() {
    const genres = [{name:'Action',icon:'💥'},{name:'Adventure',icon:'🏔'},{name:'Comedy',icon:'😄'},{name:'Drama',icon:'🎭'},{name:'Thriller',icon:'🔪'},{name:'Horror',icon:'👻'},{name:'Detective',icon:'🔍'},{name:'Romance',icon:'❤️'},{name:'Sci-Fi',icon:'🚀'},{name:'Fantasy',icon:'🐉'},{name:'War',icon:'⚔️'},{name:'Western',icon:'🤠'},{name:'Historical',icon:'🏛'},{name:'Sitcom',icon:'📺'}];
    const carousel = document.getElementById('cs-genre-carousel'); if (!carousel) return;
    carousel.innerHTML = genres.map((g,i) => `<div class="cs-cast-genre-card ${i===0?'active':''}" onclick="setCastGenre('${g.name}',this)"><div class="cs-cast-genre-img">${g.icon}</div><div class="cs-cast-genre-name">${g.name}</div></div>`).join('');
  }

  function initCsCastOrbs() {
    const orbs = document.getElementById('cs-cast-orbs'); if (!orbs) return;
    const icons = ['👨','👩','🧔','👱','👸','🤴','👮'];
    const pos = [{top:'5%',left:'38%',w:80},{top:'0%',left:'62%',w:58},{top:'32%',left:'18%',w:54},{top:'38%',left:'74%',w:52},{top:'58%',left:'28%',w:58},{top:'62%',left:'62%',w:50},{top:'74%',left:'46%',w:48}];
    orbs.innerHTML = pos.map((p,i) => `<div class="cs-cast-orb" style="top:${p.top};left:${p.left};width:${p.w}px;height:${p.w}px;font-size:${Math.round(p.w*0.45)}px">${icons[i]||'👤'}</div>`).join('');
  }

  function initCsAudioEQ() {
    const eq = document.getElementById('cs-audio-eq'); if (!eq) return;
    eq.innerHTML = Array.from({length:42},(_,i) => { const h=18+Math.floor(Math.random()*75); const d=(0.35+Math.random()*0.65).toFixed(2); return `<div class="cs-eq-bar" style="--h:${h}px;--d:${d}s;height:${Math.round(h*0.25)}px"></div>`; }).join('');
  }

  function drawSpeedCurve() {
    const canvas = document.getElementById('cs-speed-curve'); if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);
    const pts = [{x:0,y:h*0.55},{x:w*0.2,y:h*0.28},{x:w*0.38,y:h*0.5},{x:w*0.56,y:h*0.38},{x:w*0.76,y:h*0.6},{x:w,y:h*0.48}];
    ctx.strokeStyle='#4fc3f7'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y);
    for(let i=1;i<pts.length;i++){const p=pts[i-1],c=pts[i],cpx=(p.x+c.x)/2; ctx.bezierCurveTo(cpx,p.y,cpx,c.y,c.x,c.y);}
    ctx.stroke();
    ctx.fillStyle='#4fc3f7'; pts.forEach(p=>{ ctx.beginPath(); ctx.arc(p.x,p.y,3.5,0,Math.PI*2); ctx.fill(); });
  }

  async function runCinemaImage() {
    if (!AUTH.checkCredits(10)) return;
    const prompt = (document.getElementById('cs-image-prompt')?.value || '').trim();
    if (!prompt) { toast('اكتب وصف المشهد أولاً', 'error'); return; }
    const btn = document.querySelector('#cs-image-content .cs-gen-btn');
    const original = btn ? btn.innerHTML : '';
    try {
      if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> جارٍ التوليد...'; }
      const gallery = document.getElementById('cs-image-gallery');
      if (gallery) { const emp = gallery.querySelector('.cs-gallery-empty'); if (emp) emp.remove(); }
      const ratio = cinemaState.ratio;
      const quality = cinemaState.quality;
      const count = cinemaState.imageCount || 1;
      const modelInstructions = {
        scenes: 'Cinematic scene photography. High production value, dramatic lighting, cinematic composition.',
        characters: 'Cinematic character portrait. Professional film still, dramatic lighting, expressive.',
        locations: 'Cinematic environment photography. Wide establishing shot, dramatic atmosphere.',
        soul: 'Artistic soul cinema. Dreamlike, emotional depth, painterly cinematography.',
        cinema20: 'Classic cinema photography. Film noir aesthetic, timeless cinematic quality.'
      };
      const instruction = modelInstructions[cinemaState.model] || modelInstructions.scenes;
      const qualityHint = { '1K': '1024px output', '2K': '2048px output', '4K': '4096px output' };
      for (let i = 0; i < count; i++) {
        const parts = [{ text: [instruction, prompt, `Aspect ratio: ${ratio}.`, `Quality: ${qualityHint[quality] || quality}.`].join(' ') }];
        const r = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'gemini-3.1-flash-image-preview', generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }, parts })
        });
        const d = await r.json();
        if (!r.ok || d.error) throw new Error(d.error || 'Image generation failed');
        if (!Array.isArray(d.images) || d.images.length === 0) throw new Error('No images returned');
        for (const img of d.images) {
          const stored = await storeLocalImageUrl(img, 'cinema');
          addResultItem('cs-image-gallery', stored, false, prompt);
        }
      }
      toast('Cinema image generated!', 'success');
      AUTH.consumeCredits(10);
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = original || 'Generate<span class="cs-gen-sub">5 Free Gens</span>'; }
    }
  }

  async function runCinemaVideo() {
    const _cvRawDur = (document.getElementById('cs-duration')?.value || '5s').replace(/[^0-9]/g, '') || '5';
    const _cvCost   = calcCreditCost('kling-3.0/video', { duration: Number(_cvRawDur), mode: 'pro', audio: true });
    if (!AUTH.checkCredits(_cvCost)) return;
    const prompt = (document.getElementById('cs-video-prompt')?.value || '').trim();
    if (!prompt) { toast('اكتب وصف المشهد أولاً', 'error'); return; }
    const btn = document.querySelector('#cs-video-content .cs-bar .cs-gen-btn');
    const original = btn ? btn.innerHTML : '';
    try {
      if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> جارٍ الإرسال إلى Kling...'; }
      const gallery = document.getElementById('cs-video-gallery');
      if (gallery) { const emp = gallery.querySelector('.cs-gallery-empty'); if (emp) emp.remove(); }
      const mov = cinemaState.movement !== 'Auto' ? ` Camera movement: ${cinemaState.movement}.` : '';
      const gen = cinemaState.genre !== 'General' ? ` Genre: ${cinemaState.genre}.` : '';
      const fullPrompt = prompt + mov + gen;
      const rawDur = _cvRawDur;
      const startResp = await fetch('/api/kie/kling/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'text2video', modelName: 'kling-3.0/video',
          prompt: fullPrompt, negativePrompt: 'low quality, blurry, distorted, watermark',
          aspectRatio: cinemaState.vratio || '16:9', duration: rawDur,
          generationMode: 'pro', sound: true, imageUrls: [], videoUrls: []
        })
      });
      const startData = await startResp.json();
      if (!startResp.ok || startData.error) throw new Error(extractApiErrorMessage(startData, 'Failed to create Kling task'));
      if (!startData.taskId) throw new Error('No task ID received');
      toast('Kling task created, generating video...', 'success');
      const finalData = await pollKlingTask(startData.taskId);
      const urls = Array.isArray(finalData.videoUrls) ? finalData.videoUrls : [];
      if (urls.length === 0) throw new Error('No video URLs returned');
      urls.forEach(url => addResultItem('cs-video-gallery', url, true, fullPrompt));
      AUTH.consumeCredits(_cvCost);
      toast('Cinema video generated!', 'success');
    } catch (e) {
      toast('Error: ' + String(e.message || e).substring(0, 140), 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = original || 'GENERATE ➜'; }
    }
  }

  async function runCinemaAudio() {
    if (!AUTH.checkCredits(5)) return;
    const text = (document.getElementById('cs-audio-prompt')?.value || '').trim();
    if (!text) { toast('اكتب النص أولاً', 'error'); return; }
    const btn = document.querySelector('#cs-audio-content .cs-gen-btn');
    const original = btn ? btn.innerHTML : '';
    try {
      if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> جارٍ التوليد...'; }
      const voiceMap = { TALLULAH: 'Rachel', ADAM: 'Adam', BELLA: 'Bella', JOSH: 'Josh', SAM: 'Sam', ARIA: 'Aria', FREYA: 'Freya' };
      const presetName = (document.getElementById('cs-vp-name')?.textContent || 'TALLULAH').trim().toUpperCase();
      const voice = voiceMap[presetName] || 'Rachel';
      const isArabic = /[\u0600-\u06FF]/.test(text);
      const inputPayload = { text, voice, stability: 0.5, similarity_boost: 0.75, style: 0, speed: 1 };
      if (isArabic) inputPayload.language_code = 'ar';
      const startResp = await fetch('/api/kie/elevenlabs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'elevenlabs/text-to-speech-turbo-2-5', input: inputPayload })
      });
      const startData = await startResp.json();
      if (!startResp.ok || startData.error) throw new Error(extractApiErrorMessage(startData, 'Failed to create ElevenLabs task'));
      if (!startData.taskId) throw new Error('No task ID received');
      const finalData = await pollElevenTask(startData.taskId);
      const urls = Array.isArray(finalData.audioUrls) ? finalData.audioUrls : [];
      if (urls.length === 0) throw new Error('No audio URLs returned');
      urls.forEach(url => addAudioResultItem('cs-audio-results', url, `${voice} voiceover`));
      AUTH.consumeCredits(5);
      toast('Cinema audio generated!', 'success');
    } catch (e) {
      toast('Error: ' + String(e.message || e).substring(0, 140), 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = original || 'GENERATE ➜'; }
    }
  }

  async function runCinemaCast() {
    if (!AUTH.checkCredits(10)) return;
    const btn = document.querySelector('#cs-cast-content .cs-cast-bar .cs-gen-btn');
    const original = btn ? btn.innerHTML : '';
    try {
      if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> جارٍ التوليد...'; }
      const gallery = document.getElementById('cs-cast-results');
      if (gallery) { const emp = gallery.querySelector('.cs-gallery-empty'); if (emp) emp.remove(); }
      const getActive = (id) => [...(document.querySelectorAll(`#${id} .cs-cast-option.active`) || [])].map(el => el.textContent.trim());
      const era = getActive('cs-step-era')[0] || 'Modern';
      const archetype = getActive('cs-step-archetype')[0] || 'Hero';
      const identity = getActive('cs-step-identity').join(', ') || 'Young Adult';
      const appearance = getActive('cs-step-appearance').join(', ');
      const outfit = getActive('cs-step-outfit')[0] || 'Casual';
      const details = document.querySelector('.cs-cast-details-ta')?.value?.trim() || '';
      const charPrompt = [
        `Cinematic movie character portrait for a ${cinemaState.castGenre} film.`,
        `${era} era, ${archetype} archetype, ${identity}.`,
        appearance ? `Physical appearance: ${appearance}.` : '',
        `Wearing ${outfit} outfit.`,
        details || '',
        'Professional film still photography, dramatic cinematic lighting, high detail, photorealistic.'
      ].filter(Boolean).join(' ');
      const parts = [{ text: charPrompt }];
      const r = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gemini-3.1-flash-image-preview', generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }, parts })
      });
      const d = await r.json();
      if (!r.ok || d.error) throw new Error(d.error || 'Cast generation failed');
      if (!Array.isArray(d.images) || d.images.length === 0) throw new Error('No character images returned');
      for (const img of d.images) {
        const stored = await storeLocalImageUrl(img, 'cinema');
        addResultItem('cs-cast-results', stored, false, charPrompt);
      }
      AUTH.consumeCredits(10);
      toast('Cast character generated!', 'success');
    } catch (e) {
      toast('Error: ' + String(e.message || e).substring(0, 140), 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = original || 'Generate ✦'; }
    }
  }

  function initCinemaStudio() {
    initCsMoveGrid();
    initCsGenreOverlay();
    initCsCastCarousel();
    initCsCastOrbs();
    initCsAudioEQ();
    setCLTab('recent', null);
    setTimeout(drawSpeedCurve, 150);
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#cs-model-wrap') && !e.target.closest('#cs-model-panel')) document.getElementById('cs-model-panel')?.classList.remove('open');
      if (!e.target.closest('#cs-ratio-wrap')) document.getElementById('cs-ratio-dd')?.classList.remove('open');
      if (!e.target.closest('#cs-quality-wrap')) document.getElementById('cs-quality-dd')?.classList.remove('open');
      if (!e.target.closest('#cs-shot-wrap')) document.getElementById('cs-shot-dd')?.classList.remove('open');
      if (!e.target.closest('#cs-vratio-wrap')) document.getElementById('cs-vratio-dd')?.classList.remove('open');
      if (!e.target.closest('#cs-vgenre-wrap')) document.getElementById('cs-genre-overlay')?.classList.remove('open');
      if (!e.target.closest('.cs-voice-disc-wrap')) document.getElementById('cs-voice-type-menu')?.classList.remove('open');
      if (!e.target.closest('#cs-cl-panel') && !e.target.closest('.cs-char-btn') && !e.target.closest('[onclick*="toggleCLPanel"]')) document.getElementById('cs-cl-panel')?.classList.remove('open');
    });
  }

  // ═══════════════════════════════════════════════
  // PLAN ACCESS CONTROL
  // ═══════════════════════════════════════════════
  const PLAN_TIER_NUM = { starter: 0, pro: 1, creator: 2 };

  function getModelRequiredTier(modelName, generationMode) {
    return 0; // الكل مفتوح — الكريدت هو الحد الوحيد
  }

  // الوصول مفتوح لكل الخطط — الكريدت هو المتحكم الوحيد
  function checkPlanAccess(modelName, generationMode) {
    return true;
  }

  function showUpgradeModal(neededTier) {
    const planNames = { 0: 'Starter', 1: 'Pro', 2: 'Creator' };
    const planArabic = { 0: 'ستارتر', 1: 'برو', 2: 'كريتور' };
    const el = document.getElementById('upgrade-modal-sub');
    if (el) el.textContent = `هذا الموديل يتطلب خطة ${planArabic[neededTier] || 'Pro'} أو أعلى.`;
    const m = document.getElementById('upgrade-modal');
    if (m) m.style.display = 'flex';
  }

  function closeUpgradeModal() {
    const m = document.getElementById('upgrade-modal');
    if (m) m.style.display = 'none';
  }

  function openNoCreditModal(current, needed){
    const m = document.getElementById('no-credit-modal');
    if(!m) return;
    const msg = document.getElementById('no-credit-msg');
    if(msg) msg.textContent = `رصيدك الحالي ${current.toLocaleString()} كريدت — هذه العملية تحتاج ${needed.toLocaleString()} كريدت. أضف رصيداً للمتابعة.`;
    m.style.display = 'flex';
  }

  function closeNoCreditModal(){
    const m = document.getElementById('no-credit-modal');
    if(m) m.style.display = 'none';
  }

  // ═══════════════════════════════════════════════
  // AUTH SYSTEM
  // ═══════════════════════════════════════════════
  const AUTH = {
    TOKEN_KEY: 'ss_token',
    USER_KEY:  'ss_user',
    _tab: 'login',
    _plan: 'starter',

    getToken(){ return localStorage.getItem(this.TOKEN_KEY) || ''; },
    getUser(){
      try{ return JSON.parse(localStorage.getItem(this.USER_KEY) || 'null'); } catch{ return null; }
    },
    saveSession(token, user){
      localStorage.setItem(this.TOKEN_KEY, token);
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    },
    clearSession(){
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    },

    headers(extra={}){
      const t = this.getToken();
      return { 'Content-Type':'application/json', ...(t ? {'x-user-token':t} : {}), ...extra };
    },

    updateTopbar(){
      const user = this.getUser();
      const guest = document.getElementById('topbar-guest');
      const loggedIn = document.getElementById('topbar-loggedin');
      if(!guest || !loggedIn) return;
      if(user){
        guest.style.display = 'none';
        loggedIn.style.display = '';
        // Avatar initials
        const initials = (user.email || '?')[0].toUpperCase();
        const avatarEl = document.getElementById('user-avatar-el');
        const pcardAvatar = document.getElementById('pcard-avatar');
        if(avatarEl) avatarEl.textContent = initials;
        if(pcardAvatar) pcardAvatar.textContent = initials;
        // Plan badge (card only)
        const planLabel = (user.plan || 'starter').charAt(0).toUpperCase() + (user.plan || 'starter').slice(1);
        const pcardBadge = document.getElementById('pcard-plan-badge');
        if(pcardBadge){ pcardBadge.className = 'topbar-plan-badge ' + (user.plan || 'starter'); pcardBadge.textContent = planLabel; }
        // Profile card fields
        const pcardEmail = document.getElementById('pcard-email');
        if(pcardEmail) pcardEmail.textContent = user.email || '—';
        const pcardCredits = document.getElementById('pcard-credits');
        if(pcardCredits) pcardCredits.textContent = (user.credits ?? 0).toLocaleString() + ' / ' + (user.maxCredits ?? 0).toLocaleString();
        const pcardCreated = document.getElementById('pcard-created');
        if(pcardCreated && user.createdAt) pcardCreated.textContent = new Date(user.createdAt).toLocaleDateString('ar-SA');
        // Renew date and days remaining
        const pcardRenew = document.getElementById('pcard-renew');
        const pcardDays = document.getElementById('pcard-days');
        const pcardRenewRow = document.getElementById('pcard-renew-row');
        const pcardDaysRow = document.getElementById('pcard-days-row');
        if(user.renewDate && user.plan !== 'starter'){
          const diff = Math.ceil((new Date(user.renewDate) - new Date()) / (1000*60*60*24));
          const diffColor = diff <= 5 ? '#f23b6e' : diff <= 10 ? '#f5a623' : 'var(--cyan)';
          if(pcardRenew) pcardRenew.textContent = new Date(user.renewDate).toLocaleDateString('ar-SA');
          if(pcardDays){ pcardDays.textContent = diff > 0 ? diff+' يوم' : 'انتهى'; pcardDays.style.color = diffColor; }
          if(pcardRenewRow) pcardRenewRow.style.display='';
          if(pcardDaysRow) pcardDaysRow.style.display='';
        } else {
          if(pcardRenewRow) pcardRenewRow.style.display='none';
          if(pcardDaysRow) pcardDaysRow.style.display='none';
        }
      } else {
        guest.style.display = '';
        loggedIn.style.display = 'none';
      }
      syncUserCreditsBar();
    },

    async refreshMe(){
      const token = this.getToken();
      if(!token) return;
      try {
        const r = await fetch('/api/auth/me', { headers: this.headers() });
        if(!r.ok){ this.clearSession(); this.updateTopbar(); return; }
        const { user } = await r.json();
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        this.updateTopbar();
      } catch(_){}
    },

    /**
     * Check if current user has enough credits; if not, show modal or toast.
     * Returns true if allowed, false if blocked.
     */
    checkCredits(needed = 10){
      const user = this.getUser();
      if(!user){
        openAuthModal('login');
        toast('سجّل دخولك أولاً لاستخدام هذه الميزة', 'error');
        return false;
      }
      if((user.credits ?? 0) < needed){
        openNoCreditModal(user.credits ?? 0, needed);
        return false;
      }
      return true;
    },

    /**
     * Credits are now deducted server-side inside each generation endpoint.
     * This function just refreshes the displayed balance from the server.
     */
    async consumeCredits(amount = 0){
      const token = this.getToken();
      if(!token) return;
      // Optimistic local visual update if amount provided (for immediate feedback)
      if(amount > 0){
        const user = this.getUser();
        if(user){
          user.credits = Math.max(0, (user.credits ?? 0) - amount);
          localStorage.setItem(this.USER_KEY, JSON.stringify(user));
          this.updateTopbar();
        }
      }
      // Always sync true balance from server
      try {
        const r = await fetch('/api/auth/me', { headers: this.headers() });
        if(r.ok){
          const { user } = await r.json();
          if(user){
            localStorage.setItem(this.USER_KEY, JSON.stringify(user));
            this.updateTopbar();
          }
        }
      } catch(_){}
    },

    /**
     * Wrap any async generate function: check credits before, consume after success.
     * Usage: AUTH.guarded(cost, async () => { ... your generate code ... })
     */
    async guarded(cost, fn){
      if(!this.checkCredits(cost)) return;
      let result;
      try { result = await fn(); } catch(e){ throw e; }
      // Only consume on success (fn didn't throw)
      await this.consumeCredits(cost);
      return result;
    },

    /** Check if user has Nano Banana Pro access */
    hasNanoPro(){
      const user = this.getUser();
      return user && user.nanoBananaFree === true;
    }
  };

  // ── Modal open/close ──────────────────────────────
  function openAuthModal(tab = 'login'){
    AUTH._tab = tab;
    AUTH._plan = 'starter';
    document.getElementById('auth-err').textContent = '';
    switchAuthTab(tab);
    selectPlan('starter');
    document.getElementById('auth-overlay').classList.add('open');
    // clear fields
    ['a-login-email','a-login-pw','a-reg-email','a-reg-pw','a-reg-pw2'].forEach(id => {
      const el = document.getElementById(id);
      if(el) el.value = '';
    });
    // focus first field + re-render Google button
    const f = tab === 'login' ? document.getElementById('a-login-email') : document.getElementById('a-reg-email');
    f?.focus();
    renderGoogleBtn();
  }

  function closeAuthModal(){
    document.getElementById('auth-overlay').classList.remove('open');
  }

  function authOverlayClick(e){
    if(e.target === document.getElementById('auth-overlay')) closeAuthModal();
  }

  function switchAuthTab(tab){
    AUTH._tab = tab;
    document.getElementById('apanel-login').style.display    = tab === 'login'    ? '' : 'none';
    document.getElementById('apanel-register').style.display = tab === 'register' ? '' : 'none';
    document.getElementById('atab-login').classList.toggle('active', tab === 'login');
    document.getElementById('atab-register').classList.toggle('active', tab === 'register');
    document.getElementById('auth-submit-btn').textContent = tab === 'login' ? (currentLang==='en'?'Sign In':'تسجيل الدخول') : (currentLang==='en'?'Create Account':'إنشاء حساب');
    document.getElementById('auth-err').textContent = '';
  }

  function togglePwVis(id, btn){
    const el = document.getElementById(id);
    if(!el) return;
    const show = el.type === 'password';
    el.type = show ? 'text' : 'password';
    if(btn) btn.style.opacity = show ? '0.85' : '0.4';
  }

  function selectPlan(plan){
    AUTH._plan = plan;
    document.querySelectorAll('.auth-plan-card').forEach(c => {
      c.classList.toggle('selected', c.dataset.plan === plan);
    });
  }

  async function submitAuth(){
    const btn = document.getElementById('auth-submit-btn');
    const errEl = document.getElementById('auth-err');
    errEl.textContent = '';
    btn.disabled = true;
    btn.textContent = '...';

    try {
      if(AUTH._tab === 'login'){
        const email = document.getElementById('a-login-email').value.trim();
        const pw    = document.getElementById('a-login-pw').value;
        if(!email || !pw){ errEl.textContent = 'يرجى ملء جميع الحقول'; return; }
        const r = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ email, password: pw })
        });
        const data = await r.json();
        if(!r.ok){ errEl.textContent = data.error || 'خطأ في تسجيل الدخول'; return; }
        // If admin role, store CSRF and redirect to dashboard
        if(data.user && data.user.role === 'admin'){
          if(data.csrfToken){ _adminCsrf = data.csrfToken; localStorage.setItem(CONTROL_SESSION_KEY, JSON.stringify({ ts: Date.now() })); }
          window.location.href = '/dashboard.html';
          return;
        }
        // Clear any admin session on regular user login
        _adminCsrf = '';
        localStorage.removeItem(CONTROL_SESSION_KEY);
        AUTH.saveSession(data.token, data.user);
        AUTH.updateTopbar();
        reloadUserGallery();
        closeAuthModal();
        if(document.querySelector('.page.active')?.id === 'page-pricing') showPage('dash');
        toast('أهلاً بك ' + (data.user.email || '') + ' 👋', 'success');

      } else {
        const email = document.getElementById('a-reg-email').value.trim();
        const pw    = document.getElementById('a-reg-pw').value;
        const pw2   = document.getElementById('a-reg-pw2').value;
        if(!email || !pw){ errEl.textContent = 'يرجى ملء جميع الحقول'; return; }
        if(pw.length < 8){ errEl.textContent = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'; return; }
        if(pw !== pw2){ errEl.textContent = 'كلمتا المرور غير متطابقتين'; return; }
        const r = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: pw, plan: AUTH._plan })
        });
        const data = await r.json();
        if(!r.ok){ errEl.textContent = data.error || 'خطأ في إنشاء الحساب'; return; }
        // Clear any admin session on regular user register
        _adminCsrf = '';
        localStorage.removeItem(CONTROL_SESSION_KEY);
        AUTH.saveSession(data.token, data.user);
        AUTH.updateTopbar();
        reloadUserGallery();
        closeAuthModal();
        if(document.querySelector('.page.active')?.id === 'page-pricing') showPage('dash');
        toast('تم إنشاء حسابك بنجاح! 🎉', 'success');
      }
    } catch(e){
      errEl.textContent = 'خطأ في الاتصال بالخادم';
    } finally {
      btn.disabled = false;
      btn.textContent = AUTH._tab === 'login' ? (currentLang==='en'?'Sign In':'تسجيل الدخول') : (currentLang==='en'?'Create Account':'إنشاء حساب');
    }
  }

  function toggleProfileCard(){
    const card = document.getElementById('profile-card');
    if(!card) return;
    const isHidden = card.style.display === 'none' || card.style.display === '';
    if(isHidden){
      card.style.display = 'block';
      card.style.opacity = '0';
      card.style.transform = 'translateY(-8px) scale(0.95)';
      requestAnimationFrame(()=>{ requestAnimationFrame(()=>{
        card.style.transition = 'opacity 0.22s cubic-bezier(.16,.86,.22,1),transform 0.22s cubic-bezier(.16,.86,.22,1)';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0) scale(1)';
      }); });
    } else {
      card.style.transition = 'opacity 0.16s,transform 0.16s';
      card.style.opacity = '0';
      card.style.transform = 'translateY(-4px) scale(0.96)';
      setTimeout(()=>{ card.style.display = 'none'; card.style.transition = ''; }, 170);
    }
  }

  // Close profile card when clicking outside
  document.addEventListener('click', (e) => {
    const wrap = document.getElementById('user-avatar-wrap');
    const card = document.getElementById('profile-card');
    if(card && wrap && !wrap.contains(e.target)){
      card.style.display = 'none';
    }
  });

  async function doLogout(){
    try{
      await fetch('/api/auth/logout', { method:'POST', headers: AUTH.headers() });
    } catch(_){}
    AUTH.clearSession();
    AUTH.updateTopbar();
    reloadUserGallery();
    toast('تم تسجيل الخروج', 'info');
  }

  // Init on load
  AUTH.updateTopbar();
  AUTH.refreshMe();
  reloadUserGallery(); // load user-scoped gallery after AUTH is available
  // Keyboard shortcut: Escape closes modal
  document.addEventListener('keydown', e => { if(e.key === 'Escape') closeAuthModal(); });

  // ── Google Sign-In ────────────────────────────────
  let _googleClientId = '';
  let _googleReady = false;

  async function initGoogleAuth(){
    try{
      if(!_googleClientId){
        const cfg = await fetch('/api/config').then(r => r.json());
        _googleClientId = cfg.googleClientId || '';
      }
      if(!_googleClientId) return;
      if(!window.google?.accounts?.id){ setTimeout(initGoogleAuth, 800); return; }
      if(_googleReady) return;
      google.accounts.id.initialize({
        client_id: _googleClientId,
        callback: handleGoogleCredential,
        auto_select: false,
        cancel_on_tap_outside: true
      });
      _googleReady = true;
      renderGoogleBtn();
    } catch(_){}
  }

  function renderGoogleBtn(attempt){
    attempt = attempt || 0;
    try{
      if(!_googleClientId || !window.google?.accounts?.id || !_googleReady){
        if(attempt < 8) setTimeout(() => renderGoogleBtn(attempt + 1), 400);
        return;
      }
      const container = document.getElementById('g-signin-container');
      if(!container) return;
      container.innerHTML = '';
      google.accounts.id.renderButton(container, {
        theme: 'outline', size: 'large', text: 'continue_with', locale: 'ar', width: 340
      });
    } catch(_){}
  }

  async function handleGoogleCredential(response){
    const btn = document.getElementById('auth-google-btn');
    if(btn){ btn.disabled = true; btn.textContent = '...'; }
    const errEl = document.getElementById('auth-err');
    try{
      const r = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential, plan: AUTH._plan })
      });
      const data = await r.json();
      if(!r.ok){ if(errEl) errEl.textContent = data.error || 'خطأ في تسجيل الدخول عبر Google'; return; }
      // Clear any admin session on Google login
      _adminCsrf = '';
      localStorage.removeItem(CONTROL_SESSION_KEY);
      AUTH.saveSession(data.token, data.user);
      AUTH.updateTopbar();
      reloadUserGallery();
      closeAuthModal();
      if(document.querySelector('.page.active')?.id === 'page-pricing') showPage('dash');
      toast('أهلاً بك ' + (data.user.email || '') + ' 👋', 'success');
    } catch(e){
      if(errEl) errEl.textContent = 'خطأ في الاتصال بالخادم';
    } finally {
      if(btn){ btn.disabled = false; btn.innerHTML = `<svg viewBox="0 0 48 48" width="18" height="18"><path fill="#EA4335" d="M24 9.5c3.14 0 5.96 1.08 8.18 2.86l6.1-6.1C34.6 3.1 29.6 1 24 1 14.82 1 7.07 6.48 3.68 14.28l7.13 5.54C12.64 13.5 17.87 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.64-.15-3.22-.42-4.74H24v9h12.65c-.55 2.97-2.2 5.48-4.67 7.17l7.13 5.54C43.36 37.86 46.5 31.67 46.5 24.5z"/><path fill="#FBBC05" d="M10.81 28.18A14.56 14.56 0 0 1 9.5 24c0-1.45.25-2.86.69-4.18L3.06 14.28A22.93 22.93 0 0 0 1 24c0 3.69.88 7.17 2.44 10.25l7.37-6.07z"/><path fill="#34A853" d="M24 47c5.9 0 10.85-1.94 14.47-5.27l-7.13-5.54C29.36 37.72 26.79 38.5 24 38.5c-6.14 0-11.36-4.01-13.19-9.52l-7.37 6.07C7.07 42.52 14.82 47 24 47z"/></svg> المتابعة عبر Google`; }
    }
  }

  function triggerGoogleLogin(){
    // kept for backwards compatibility — no longer used
  }

  // Choose plan from pricing page
    async function choosePlan(plan){
    const user = AUTH.getUser();
    if(user){
      if((user.plan||'starter') === plan){
        toast('أنت بالفعل على خطة ' + plan, 'info'); return;
      }
      const planNames = { starter:'Starter', pro:'Pro', creator:'Creator' };
      var fromPlan = planNames[user.plan||'starter'] || (user.plan||'starter');
      var toPlan = planNames[plan] || plan;
      if(!confirm('هل تريد تغيير خطتك من ' + fromPlan + ' إلى ' + toPlan + '؟ سيتم إرسال طلبك للمدير للمراجعة.')) return;
      try {
        const r = await fetch('/api/auth/order', {
          method: 'POST',
          headers: AUTH.headers(),
          body: JSON.stringify({ type: 'plan', newPlan: plan })
        });
        const d = await r.json();
        if(!r.ok){ toast(d.error || 'خطأ في إرسال الطلب', 'error'); return; }
        toast('✅ تم إرسال طلب تغيير الخطة إلى ' + toPlan + ' — انتظر موافقة المدير', 'success');
      } catch(e){ toast('خطأ في الاتصال', 'error'); }
      return;
    }
    openAuthModal('register');
    setTimeout(() => selectPlan(plan), 50);
  }

  // Init Google on DOMContentLoaded + render immediately
  document.addEventListener('DOMContentLoaded', () => {
    initGoogleAuth().then(() => renderGoogleBtn());
    // Fallback: if Google SDK failed to load, retry after 1s
    setTimeout(() => {
      if (!window.google?.accounts?.id) {
        const s = document.createElement('script');
        s.src = 'https://accounts.google.com/gsi/client';
        s.onload = () => initGoogleAuth().then(() => renderGoogleBtn());
        document.head.appendChild(s);
      } else if (!_googleReady) {
        initGoogleAuth().then(() => renderGoogleBtn());
      }
    }, 1000);
  });

  // ── Global fetch interceptor: auto-inject auth token + handle 401 ──────────
  (function(){
    const _fetch = window.fetch;
    window.fetch = function(url, opts){
      const isApi = typeof url === 'string' && url.startsWith('/api/');
      if(isApi){
        const token = (typeof AUTH !== 'undefined') ? AUTH.getToken() : '';
        if(token){
          opts = opts ? { ...opts } : {};
          if(opts.body instanceof FormData){
            opts.headers = Object.assign({ 'x-user-token': token }, opts.headers || {});
          } else {
            opts.headers = Object.assign({ 'Content-Type':'application/json', 'x-user-token': token }, opts.headers || {});
          }
        }
      }
      const p = _fetch.call(this, url, opts);
      // Auto-handle 401: clear stale session and prompt re-login
      if(isApi && !url.includes('/api/auth/')){
        p.then(function(resp){
          if(resp.status === 401 && typeof AUTH !== 'undefined'){
            const hadToken = AUTH.getToken();
            if(hadToken){
              AUTH.clearSession();
              if(typeof AUTH.updateTopbar === 'function') AUTH.updateTopbar();
              if(typeof openAuthModal === 'function') openAuthModal('login');
              if(typeof toast === 'function') toast('انتهت صلاحية الجلسة — يرجى تسجيل الدخول مجدداً.', 'error');
            }
          }
        }).catch(function(){});
      }
      return p;
    };
  })();

  // ══════════════════════════════════════════════════════════
  // CINEMA STUDIO PANEL TOGGLE
  // ══════════════════════════════════════════════════════════

  function toggleCinePanel(panelId, overlayId) {
    const panel = document.getElementById(panelId);
    const overlay = overlayId ? document.getElementById(overlayId) : null;
    if (!panel) return;
    const opening = !panel.classList.contains('open');
    panel.classList.toggle('open', opening);
    if (overlay) overlay.classList.toggle('open', opening);
    // prevent body scroll while panel is open
    document.body.style.overflow = opening ? 'hidden' : '';
  }

  // ══════════════════════════════════════════════════════════
  // PREMIUM CINEMATIC INTERACTION SYSTEM — JS
  // ══════════════════════════════════════════════════════════

  // ── Scroll Reveal (IntersectionObserver) ──────────────────
  function initScrollReveal(){
    const els = document.querySelectorAll('.sr,.sr-up,.sr-scale');
    if(!('IntersectionObserver' in window)){
      els.forEach(el=>el.classList.add('visible')); return;
    }
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('visible'); io.unobserve(e.target); } });
    },{ threshold:0.08, rootMargin:'0px 0px -28px 0px' });
    els.forEach(el=>io.observe(el));
  }

  // ── Ripple Effect ─────────────────────────────────────────
  function spawnRipple(e){
    const btn = e.currentTarget;
    const r = document.createElement('span');
    r.className = 'ripple';
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    r.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px;`;
    btn.appendChild(r);
    setTimeout(()=>r.remove(), 560);
  }
  function initRipples(){
    document.querySelectorAll('.btn-generate,.topbar-btn,.btn-ghost,.lb-action,.plan-action,.profile-card-nav-btn,.profile-card-logout').forEach(btn=>{
      btn.addEventListener('click', spawnRipple);
    });
  }

  // ── Profile card open/close with animation ─────────────────
  function openProfileCard(){
    const pc = document.getElementById('profile-card');
    if(!pc) return;
    pc.style.display = 'block';
    pc.style.opacity = '0';
    pc.style.transform = 'translateY(-6px) scale(0.96)';
    requestAnimationFrame(()=>{ requestAnimationFrame(()=>{
      pc.style.transition='opacity 0.2s cubic-bezier(.16,.86,.22,1),transform 0.2s cubic-bezier(.16,.86,.22,1)';
      pc.style.opacity='1';
      pc.style.transform='translateY(0) scale(1)';
    }); });
  }

  // Re-apply scroll reveal whenever a new page becomes active
  const _origShowPage = typeof showPage === 'function' ? showPage : null;
  document.addEventListener('click', ()=>{ setTimeout(initScrollReveal, 40); });

  // ── Auto-apply .sr classes to key recurring elements ───────
  function addRevealClasses(){
    // Section headers (stitle lines)
    document.querySelectorAll('.stitle:not(.sr)').forEach((el,i)=>{ el.classList.add('sr','sr-d'+(Math.min(i%4+1,6))); });
    // Page headers
    document.querySelectorAll('.ph:not(.sr)').forEach(el=>el.classList.add('sr'));
    // KPI / billing cards
    document.querySelectorAll('.udash-kpi:not(.sr)').forEach((el,i)=>{ el.classList.add('sr','sr-d'+(i%5+1)); });
    // Market cards
    document.querySelectorAll('.market-card:not(.sr)').forEach((el,i)=>{ el.classList.add('sr','sr-d'+(i%4+1)); });
    // Pricing cards
    document.querySelectorAll('.pricing-card:not(.sr)').forEach((el,i)=>{ el.classList.add('sr','sr-d'+(i%4+1)); });
    // Control panel cards
    document.querySelectorAll('.ctrl-panel .card:not(.sr)').forEach((el,i)=>{ el.classList.add('sr','sr-d'+(i%3+1)); });
    // Result area
    document.querySelectorAll('.result-area:not(.sr)').forEach(el=>el.classList.add('sr','sr-scale'));
    // udash sections
    document.querySelectorAll('.udash-section:not(.sr),.sub-status-card:not(.sr)').forEach((el,i)=>{ el.classList.add('sr-up','sr-d'+(i%3+1)); });
    // Hero areas
    document.querySelectorAll('.market-hero:not(.sr-scale),.sora-hero:not(.sr-scale),.grok-hero:not(.sr-scale)').forEach(el=>el.classList.add('sr-scale'));
  }

  // ── Init everything on load ────────────────────────────────
  window.addEventListener('DOMContentLoaded', ()=>{
    addRevealClasses();
    initScrollReveal();
    initRipples();
  });
  // Also run after any DOM mutation (new results appended)
  if('MutationObserver' in window){
    new MutationObserver(()=>{ addRevealClasses(); initScrollReveal(); initRipples(); })
      .observe(document.body,{childList:true,subtree:true});
  }

  // ── User Dashboard & Billing ──────────────────────────
  function closeProfileCard(){
    const pc = document.getElementById('profile-card');
    if(pc) pc.style.display = 'none';
  }
  function setText(id, val){ const el=document.getElementById(id); if(el) el.textContent = val ?? '—'; }
  function setBarWidth(id, pct){ const el=document.getElementById(id); if(el) el.style.width = Math.min(100,Math.max(0, pct||0))+'%'; }

  async function loadUserDashboard(){
    try{
      const res = await fetch('/api/user/dashboard', { headers: AUTH.headers() });
      if(!res.ok) return;
      const d = await res.json();
      const u = d.user || {};
      const usage = d.usage || {};
      const today = usage.today || {};
      const month = usage.month || {};
      const allTime = usage.allTime || {};
      const sub = d.subscription || {};

      setText('udash-credits', u.credits ?? '—');
      setText('udash-maxcredits', u.maxCredits ? '/ '+u.maxCredits : '');
      setText('udash-mon-images', month.images ?? 0);
      setText('udash-mon-videos', month.videos ?? 0);
      setText('udash-mon-credits', month.credits ?? 0);

      setText('udash-day-images', today.images ?? 0);
      setBarWidth('udash-day-images-bar', u.dailyImageLimit ? (today.images/u.dailyImageLimit)*100 : 0);
      setText('udash-day-videos', today.videos ?? 0);
      setBarWidth('udash-day-videos-bar', u.dailyVideoLimit ? (today.videos/u.dailyVideoLimit)*100 : 0);
      setText('udash-day-credits', today.credits ?? 0);
      setBarWidth('udash-day-credits-bar', u.dailyCreditLimit ? (today.credits/u.dailyCreditLimit)*100 : 0);

      setText('udash-plan', sub.plan || u.plan || '—');
      const dateLoc = currentLang === 'en' ? 'en-US' : 'ar-SA';
      setText('udash-sub-status', sub.status === 'active' ? (currentLang==='en'?'✅ Active':'✅ نشط') : (currentLang==='en'?'⚠️ Expired':'⚠️ منتهي'));
      setText('udash-sub-end', sub.renewDate ? new Date(sub.renewDate).toLocaleDateString(dateLoc) : '—');

      setText('udash-all-images', allTime.images ?? 0);
      setText('udash-all-videos', allTime.videos ?? 0);
      setText('udash-all-credits', allTime.credits ?? 0);
      applyLanguage(currentLang, true);
    } catch(e){ console.error('loadUserDashboard:', e); }
  }

  async function loadBillingPage(){
    try{
      const res = await fetch('/api/user/billing', { headers: AUTH.headers() });
      if(!res.ok) return;
      const d = await res.json();
      // d.plan is a plain string ('starter'/'pro'/'creator'); all other fields are top-level
      const orders = d.orders || [];
      const isActive = d.status === 'active';

      setText('billing-plan-name', d.plan ? d.plan.charAt(0).toUpperCase()+d.plan.slice(1) : '—');
      const dateLoc = currentLang === 'en' ? 'en-US' : 'ar-SA';
      const statusEl = document.getElementById('billing-sub-status-el');
      if(statusEl){
        statusEl.textContent = isActive ? (currentLang==='en'?'✅ Active Subscription':'✅ اشتراك نشط') : (currentLang==='en'?'⚠️ Subscription Expired':'⚠️ الاشتراك منتهي');
        statusEl.style.color = isActive ? '#34d399' : '#fbbf24';
      }
      setText('billing-credits', d.credits ?? '—');
      setText('billing-start', d.subscriptionStartDate ? new Date(d.subscriptionStartDate).toLocaleDateString(dateLoc) : '—');
      setText('billing-end', d.subscriptionEndDate ? new Date(d.subscriptionEndDate).toLocaleDateString(dateLoc) : '—');
      setText('billing-renew', d.renewDate ? new Date(d.renewDate).toLocaleDateString(dateLoc) : '—');
      setText('billing-maxcredits', d.maxCredits ?? '—');

      const maxC = d.maxCredits || 0;
      const curC = d.credits || 0;
      const used = maxC > 0 ? maxC - curC : 0;
      const pct = maxC > 0 ? (used/maxC)*100 : 0;
      setText('billing-used-pct', Math.round(pct)+'%');
      setBarWidth('billing-credits-bar', pct);

      const tbody = document.getElementById('billing-orders-body');
      const tbl = document.getElementById('billing-orders-table');
      const noOrd = document.getElementById('billing-no-orders');
      if(tbody && tbl && noOrd){
        if(orders.length === 0){
          tbl.style.display = 'none'; noOrd.style.display = '';
        } else {
          noOrd.style.display = 'none'; tbl.style.display = '';
          tbody.innerHTML = orders.map(o => {
            const st = (o.status||'').toLowerCase();
            return `<tr>
              <td>${o.pack ? o.pack+'$' : '—'}</td>
              <td>${o.credits||'—'}</td>
              <td><span class="order-status-badge ${st}">${o.status||'—'}</span></td>
              <td>${o.createdAt ? new Date(o.createdAt).toLocaleDateString(dateLoc) : '—'}</td>
            </tr>`;
          }).join('');
        }
      }
      applyLanguage(currentLang, true);
    } catch(e){ console.error('loadBillingPage:', e); }
  }
